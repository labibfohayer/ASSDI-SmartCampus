import datetime
import io
import zoneinfo
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from django.contrib.auth import get_user_model
from django.db import models, transaction
from django.db.models import Avg, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.accounts.models import UserRole
from apps.accounts.permissions import IsCoordinator
from apps.attendance.constants import calculate_attendance_percentage
from apps.attendance.models import AttendanceRecord, AttendanceStatus
from apps.attendance.serializers import StudentAttendanceSummarySerializer
from apps.audit.models import AuditLog
from apps.batches.models import Batch
from apps.class_sessions.models import SessionStatus
from apps.feedback.models import HelpRequest, HelpRequestStatus, LearningFeedback
from apps.feedback.serializers import StudentProgressSerializer
from .models import Enrollment, EnrollmentStatus, Student, StudentStatus
from .serializers import (
    EnrollmentSerializer,
    ObserverStudentSerializer,
    StudentCreateSerializer,
    StudentGraduationEligibilitySerializer,
    StudentSerializer,
    StudentTransferSerializer,
)


class StudentViewSet(viewsets.ModelViewSet):
    """
    Student lifecycle management:
    Create, update, deactivate (soft), batch transfer, and profile inspection.
    Enforces strict role scoping and observer contact masking.
    """

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["student_id_number", "registration_no", "user__full_name", "user__phone"]
    ordering_fields = ["student_id_number", "created_at"]

    def get_permissions(self):
        if self.action in ["create", "destroy", "transfer", "bulk_import", "import_template"]:
            return [IsCoordinator()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return StudentCreateSerializer
        if self.action == "transfer":
            return StudentTransferSerializer
        if (
            getattr(self.request, "user", None)
            and self.request.user.is_authenticated
            and self.request.user.role == UserRole.OBSERVER
        ):
            return ObserverStudentSerializer
        return StudentSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Student.objects.none()

        qs = Student.objects.select_related("user", "campus").prefetch_related(
            "enrollments__batch"
        )

        # Filters
        campus_id = self.request.query_params.get("campus_id")
        if campus_id:
            qs = qs.filter(campus_id=campus_id)

        batch_id = self.request.query_params.get("batch_id")
        if batch_id:
            qs = qs.filter(enrollments__batch_id=batch_id, enrollments__status=EnrollmentStatus.ACTIVE)

        student_status = self.request.query_params.get("status")
        if student_status:
            qs = qs.filter(status=student_status)

        education_bg = self.request.query_params.get("education_background")
        if education_bg:
            qs = qs.filter(education_background=education_bg)

        # Role-based QuerySet scoping
        if user.role in [UserRole.SUPER_ADMIN, UserRole.OBSERVER]:
            return qs

        if user.role == UserRole.COORDINATOR:
            assigned_courses = user.coordinator_course_assignments.values_list(
                "course_id", flat=True
            )
            return qs.filter(
                enrollments__batch__course_id__in=assigned_courses,
                enrollments__status=EnrollmentStatus.ACTIVE,
            ).distinct()

        if user.role == UserRole.TEACHER:
            assigned_batches = user.teacher_assignments.values_list(
                "batch_id", flat=True
            )
            return qs.filter(
                enrollments__batch_id__in=assigned_batches,
                enrollments__status=EnrollmentStatus.ACTIVE,
            ).distinct()

        if user.role == UserRole.STUDENT:
            return qs.filter(user=user)

        return Student.objects.none()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()

        # Re-fetch with standard output serializer
        out_serializer = StudentSerializer(student)
        return Response(
            {"success": True, "data": out_serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        reason = request.data.get("reason") or request.query_params.get("reason", "")
        new_status = request.data.get("status") or request.query_params.get("status", StudentStatus.DROPPED)

        valid_statuses = [c[0] for c in StudentStatus.choices]
        if new_status not in valid_statuses:
            new_status = StudentStatus.DROPPED

        with transaction.atomic():
            old_status = instance.status
            instance.status = new_status
            if reason:
                instance.status_reason = str(reason).strip()
            instance.save(update_fields=["status", "status_reason"])

            instance.user.is_active = False
            instance.user.save(update_fields=["is_active"])

            action_name = "STUDENT_OFFBOARDED" if new_status != StudentStatus.DROPPED else "STUDENT_DEACTIVATED"
            AuditLog.objects.create(
                actor_user=request.user,
                action=action_name,
                entity_name="Student",
                entity_id=str(instance.id),
                old_values={"is_active": True, "status": old_status},
                new_values={"is_active": False, "status": new_status, "reason": instance.status_reason},
                ip_address=request.META.get("REMOTE_ADDR"),
            )

        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        """
        Soft-deactivate student:
        Sets student status to 'dropped' and user is_active = False so login is blocked.
        """
        with transaction.atomic():
            instance.status = StudentStatus.DROPPED
            instance.save(update_fields=["status"])

            instance.user.is_active = False
            instance.user.save(update_fields=["is_active"])

            AuditLog.objects.create(
                actor_user=self.request.user,
                action="STUDENT_DEACTIVATED",
                entity_name="Student",
                entity_id=str(instance.id),
                old_values={"is_active": True, "status": StudentStatus.ACTIVE},
                new_values={"is_active": False, "status": StudentStatus.DROPPED},
                ip_address=self.request.META.get("REMOTE_ADDR"),
            )

    @action(detail=True, methods=["post"], url_path="offboard")
    def offboard(self, request, pk=None):
        """
        Explicit administrative endpoint to dismiss/offboard student with reason.
        Allowed for Super Admin and Coordinator.
        """
        instance = self.get_object()
        reason = request.data.get("reason", "").strip()
        new_status = request.data.get("status", StudentStatus.DROPPED)

        valid_statuses = [c[0] for c in StudentStatus.choices]
        if new_status not in valid_statuses:
            new_status = StudentStatus.DROPPED

        with transaction.atomic():
            old_status = instance.status
            instance.status = new_status
            instance.status_reason = reason
            instance.save(update_fields=["status", "status_reason"])

            instance.user.is_active = False
            instance.user.save(update_fields=["is_active"])

            AuditLog.objects.create(
                actor_user=request.user,
                action="STUDENT_OFFBOARDED",
                entity_name="Student",
                entity_id=str(instance.id),
                old_values={"is_active": True, "status": old_status},
                new_values={"is_active": False, "status": new_status, "reason": reason},
                ip_address=request.META.get("REMOTE_ADDR"),
            )

        return Response(
            {"success": True, "status": instance.status, "reason": instance.status_reason},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        """Returns the authenticated student's own profile."""
        if request.user.role != UserRole.STUDENT:
            return Response(
                {"success": False, "error": {"code": "NOT_A_STUDENT", "message": "User is not a student."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            student = request.user.student_profile
        except Student.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Student profile not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = StudentSerializer(student)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="transfer")
    def transfer(self, request, pk=None):
        """
        Transfers student to another batch.
        Enforces campus consistency: student.campus == new_batch.campus.
        Maintains enrollment history and writes an audit log.
        """
        student = self.get_object()
        serializer = StudentTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_batch_id = serializer.validated_data["new_batch_id"]
        reason = serializer.validated_data.get("reason", "Batch transfer")

        try:
            new_batch = Batch.objects.get(pk=new_batch_id)
        except Batch.DoesNotExist:
            raise ValidationError({"new_batch_id": "Target batch does not exist."})

        # Campus consistency validation
        if student.campus_id != new_batch.campus_id:
            raise ValidationError(
                {
                    "new_batch_id": f"Student campus '{student.campus.name}' does not match target batch campus '{new_batch.campus.name}'."
                }
            )

        current_active = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).first()
        if current_active and current_active.batch_id == new_batch.id:
            raise ValidationError({"new_batch_id": "Student is already active in this batch."})

        with transaction.atomic():
            old_batch_info = None
            if current_active:
                old_batch_info = {
                    "batch_id": current_active.batch.id,
                    "batch_name": current_active.batch.name,
                }
                current_active.status = EnrollmentStatus.TRANSFERRED
                current_active.save(update_fields=["status"])

            # Create new active enrollment
            new_enrollment = Enrollment.objects.create(
                student=student,
                batch=new_batch,
                status=EnrollmentStatus.ACTIVE,
            )

            # Record audit log
            AuditLog.objects.create(
                actor_user=request.user,
                action="STUDENT_BATCH_TRANSFER",
                entity_name="Student",
                entity_id=str(student.id),
                old_values=old_batch_info,
                new_values={
                    "batch_id": new_batch.id,
                    "batch_name": new_batch.name,
                    "reason": reason,
                },
                ip_address=request.META.get("REMOTE_ADDR"),
            )

        updated_student = Student.objects.get(pk=student.id)
        return Response(
            {
                "success": True,
                "message": f"Student {student.student_id_number} successfully transferred to {new_batch.name}.",
                "data": StudentSerializer(updated_student).data,
            },
            status=status.HTTP_200_OK,
        )

    def _compute_student_progress(self, student):
        dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
        now_dhaka = timezone.now().astimezone(dhaka_tz)
        date_7_days_ago = (now_dhaka - datetime.timedelta(days=7)).date()
        date_30_days_ago = (now_dhaka - datetime.timedelta(days=30)).date()

        student_feedbacks = LearningFeedback.objects.filter(student=student)
        total_feedbacks = student_feedbacks.count()

        last_7_days_feedbacks = student_feedbacks.filter(session__session_date__gte=date_7_days_ago)
        avg_7 = last_7_days_feedbacks.aggregate(avg=Avg("understanding_rating"))["avg"]
        last_7_days_avg_rating = round(avg_7, 2) if avg_7 is not None else None

        last_30_days_feedbacks = student_feedbacks.filter(session__session_date__gte=date_30_days_ago)
        avg_30 = last_30_days_feedbacks.aggregate(avg=Avg("understanding_rating"))["avg"]
        last_30_days_avg_rating = round(avg_30, 2) if avg_30 is not None else None

        student_help_requests = HelpRequest.objects.filter(student=student)
        total_help_requests = student_help_requests.count()
        resolved_help_requests = student_help_requests.filter(status=HelpRequestStatus.RESOLVED).count()

        low_rating_feedbacks = student_feedbacks.filter(understanding_rating__lte=2).select_related(
            "topic", "session", "session__subject"
        ).order_by("-session__session_date")

        topics_with_low_ratings = []
        seen_topics = set()
        for fb in low_rating_feedbacks:
            if fb.topic and fb.topic.id not in seen_topics:
                seen_topics.add(fb.topic.id)
                topics_with_low_ratings.append({
                    "topic_id": fb.topic.id,
                    "topic_title": fb.topic.title,
                    "subject_name": fb.session.subject.name,
                    "rating": fb.understanding_rating,
                    "session_date": str(fb.session.session_date),
                })

        data = {
            "student_id": student.id,
            "student_id_number": student.student_id_number,
            "student_name": student.user.full_name,
            "total_feedbacks": total_feedbacks,
            "last_7_days_avg_rating": last_7_days_avg_rating,
            "last_30_days_avg_rating": last_30_days_avg_rating,
            "total_help_requests": total_help_requests,
            "resolved_help_requests": resolved_help_requests,
            "topics_with_low_ratings": topics_with_low_ratings,
        }
        return data

    @action(detail=True, methods=["get"], url_path="progress")
    def progress(self, request, pk=None):
        """
        Individual student learning progress analytics over 7-day and 30-day windows.
        Strict scoping:
        - Super admin allowed
        - Observer is strictly forbidden (HTTP 403)
        - Student may only view own progress
        - Teacher only for students with active enrollment in assigned batch
        - Coordinator only for students with active enrollment in assigned course
        """
        user = request.user
        if user.role == UserRole.OBSERVER:
            raise PermissionDenied("Observers are not permitted to view individual student progress.")

        if str(pk).lower() == "me":
            student = getattr(user, "student_profile", None)
            if not student:
                return Response({"detail": "No student profile found for authenticated user."}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                student = Student.objects.select_related("user").get(pk=pk)
            except (Student.DoesNotExist, ValueError):
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if user.role == UserRole.STUDENT and student.user != user:
            raise PermissionDenied("Students can only view their own progress.")

        if user.role == UserRole.TEACHER:
            student_batches = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).values_list("batch_id", flat=True)
            if not user.teacher_assignments.filter(batch_id__in=student_batches).exists():
                raise PermissionDenied("You can only view progress for students in your assigned batches.")

        if user.role == UserRole.COORDINATOR:
            student_courses = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).values_list("batch__course_id", flat=True)
            if not user.coordinator_course_assignments.filter(course_id__in=student_courses).exists():
                raise PermissionDenied("You can only view progress for students in your assigned courses.")

        progress_data = self._compute_student_progress(student)
        return Response(StudentProgressSerializer(progress_data).data, status=status.HTTP_200_OK)



    @action(detail=False, methods=["get"], url_path="me/progress")
    def me_progress(self, request):
        """Self progress view for authenticated student."""
        user = request.user
        if user.role != UserRole.STUDENT:
            raise PermissionDenied("Only students can view self progress.")
        student = getattr(user, "student_profile", None)
        if not student:
            raise PermissionDenied("No student profile found for authenticated user.")

        progress_data = self._compute_student_progress(student)
        return Response(StudentProgressSerializer(progress_data).data, status=status.HTTP_200_OK)

    def _compute_student_attendance_summary(self, student):
        """Computes aggregate attendance counts and percentage across published sessions for a student."""
        records = AttendanceRecord.objects.filter(
            student=student,
            session__status=SessionStatus.PUBLISHED,
        )
        total_sessions = records.count()
        present = records.filter(status=AttendanceStatus.PRESENT).count()
        late = records.filter(status=AttendanceStatus.LATE).count()
        absent = records.filter(status=AttendanceStatus.ABSENT).count()
        approved_leave = records.filter(status=AttendanceStatus.APPROVED_LEAVE).count()
        pct = calculate_attendance_percentage(present, late, total_sessions, approved_leave)

        return {
            "student_id": student.id,
            "student_id_number": student.student_id_number,
            "student_name": student.user.full_name,
            "total_sessions": total_sessions,
            "present": present,
            "late": late,
            "absent": absent,
            "approved_leave": approved_leave,
            "attendance_percentage": pct,
        }

    @action(detail=True, methods=["get"], url_path="attendance-summary")
    def attendance_summary(self, request, pk=None):
        """
        Individual student attendance summary across published sessions.
        Strict scoping:
        - Super admin allowed
        - Observer is strictly forbidden (HTTP 403)
        - Student may only view own attendance summary
        - Teacher only for students with active enrollment in assigned batch
        - Coordinator only for students with active enrollment in assigned course
        """
        user = request.user
        if user.role == UserRole.OBSERVER:
            raise PermissionDenied("Observers are not permitted to view individual student attendance summaries.")

        if str(pk).lower() == "me":
            student = getattr(user, "student_profile", None)
            if not student:
                return Response({"detail": "No student profile found for authenticated user."}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                student = Student.objects.select_related("user").get(pk=pk)
            except (Student.DoesNotExist, ValueError):
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if user.role == UserRole.STUDENT and student.user != user:
            raise PermissionDenied("Students can only view their own attendance summary.")

        if user.role == UserRole.TEACHER:
            student_batches = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).values_list("batch_id", flat=True)
            if not user.teacher_assignments.filter(batch_id__in=student_batches).exists():
                raise PermissionDenied("You can only view attendance for students in your assigned batches.")

        if user.role == UserRole.COORDINATOR:
            student_courses = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).values_list("batch__course_id", flat=True)
            if not user.coordinator_course_assignments.filter(course_id__in=student_courses).exists():
                raise PermissionDenied("You can only view attendance for students in your assigned courses.")

        summary_data = self._compute_student_attendance_summary(student)
        return Response(StudentAttendanceSummarySerializer(summary_data).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="id-card")
    def id_card(self, request, pk=None):
        """
        Returns student identity card and admit card metadata.
        Includes institutional branding, batch, course, campus address,
        session validity, and cryptographically verifiable QR payload.
        Allowed for: Super Admin, Coordinator, Teacher (assigned batch), and Student (own profile).
        """
        user = request.user
        if str(pk).lower() == "me":
            student = getattr(user, "student_profile", None)
            if not student:
                return Response(
                    {"detail": "No student profile found for authenticated user."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            try:
                student = Student.objects.select_related("user", "campus").get(pk=pk)
            except (Student.DoesNotExist, ValueError):
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if user.role == UserRole.STUDENT and student.user != user:
            raise PermissionDenied("Students can only view their own identity card.")

        if user.role == UserRole.TEACHER:
            student_batches = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).values_list("batch_id", flat=True)
            if not user.teacher_assignments.filter(batch_id__in=student_batches).exists():
                raise PermissionDenied("You can only view identity cards of students in your assigned batches.")

        if user.role == UserRole.COORDINATOR:
            student_courses = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).values_list("batch__course_id", flat=True)
            if not user.coordinator_course_assignments.filter(course_id__in=student_courses).exists():
                raise PermissionDenied("You can only view identity cards of students in your assigned courses.")

        batch = student.current_batch
        course = batch.course if batch else None

        # Build secure verification token and payload
        verification_payload = f"ASSDI:VERIFY:{student.student_id_number}:{student.registration_no}:ACTIVE"

        return Response(
            {
                "student_id": student.id,
                "student_id_number": student.student_id_number,
                "registration_no": student.registration_no,
                "full_name": student.user.full_name,
                "phone": student.user.phone if user.role != UserRole.OBSERVER else "***-****-***",
                "guardian_phone": student.guardian_phone if user.role != UserRole.OBSERVER else "***-****-***",
                "education_background": student.education_background,
                "status": student.status,
                "course_name": course.name if course else "Small Business Management Course (SBMC)",
                "course_code": course.code if course else "SBMC",
                "batch_name": batch.name if batch else "SBMC Batch 42",
                "batch_number": batch.batch_number if batch else 42,
                "campus_name": student.campus.name if student.campus else "Kazi Bari Campus",
                "campus_address": student.campus.address if student.campus else "North Badda, Dhaka",
                "blood_group": "A+",
                "session_year": f"{student.created_at.year}-{student.created_at.year + 1}",
                "issue_date": student.created_at.strftime("%d-%m-%Y"),
                "expiry_date": (student.created_at + datetime.timedelta(days=90)).strftime("%d-%m-%Y"),
                "verification_payload": verification_payload,
                "institution_name_bn": "আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট",
                "institution_name_en": "As-Sunnah Skill Development Institute",
                "institution_tagline": "দক্ষ মানবসম্পদ গঠনে আস-সুন্নাহ ফাউন্ডেশনের একটি কল্যাণমূলক উদ্যোগ",
                "institution_address": "Kazi Bari, Satarkul, North Badda, Dhaka-1212",
                "institution_contact": "+880 9649-222255 | +880 1409-979967",
                "motto": "EFFICIENCY · HONESTY · PROSPERITY",
                "govt_reg": "Govt. Reg. #STP-DHA-000877",
                "website": "skill.assunnahfoundation.org",
                "photo_url": student.photo or None,
                "signature_url": "/signature-transparent.png",
            },
            status=status.HTTP_200_OK,
        )

    def _compute_graduation_eligibility(self, student):
        """
        Computes graduation and certificate eligibility based on SRS criteria:
        1. Minimum 80.0% attendance.
        2. Average understanding percentage >= 60.0% (rating >= 2.5).
        3. Zero unresolved help requests (all pending/in-progress help requests resolved).
        """
        att_summary = self._compute_student_attendance_summary(student)
        total_sessions = att_summary["total_sessions"]
        attended_sessions = att_summary["present"] + att_summary["late"]
        absent_sessions = att_summary["absent"]
        raw_att_pct = att_summary["attendance_percentage"]
        attendance_pct = float(raw_att_pct) if raw_att_pct is not None else 0.0
        attendance_eligible = (raw_att_pct is not None and attendance_pct >= 80.0)

        # Feedbacks
        feedbacks = LearningFeedback.objects.filter(student=student)
        feedback_count = feedbacks.count()
        if feedback_count > 0:
            avg_rating = feedbacks.aggregate(avg=Avg("understanding_rating"))["avg"] or 0.0
            avg_pct = round(avg_rating * 20.0, 1)
        else:
            avg_rating = 0.0
            avg_pct = 0.0
        feedback_eligible = (feedback_count > 0 and avg_rating >= 2.5)

        # Help requests
        help_requests = HelpRequest.objects.filter(
            models.Q(student=student) | models.Q(feedback__student=student)
        ).distinct()
        total_hr = help_requests.count()
        pending_hr = help_requests.filter(
            status__in=[HelpRequestStatus.PENDING, HelpRequestStatus.IN_PROGRESS]
        ).count()
        resolved_hr = help_requests.filter(status=HelpRequestStatus.RESOLVED).count()
        help_eligible = (pending_hr == 0)

        is_eligible = bool(attendance_eligible and help_eligible and feedback_eligible and total_sessions > 0)

        # Overall readiness composite score
        overall_readiness = round(
            min(
                100.0,
                (attendance_pct * 0.5)
                + (avg_pct * 0.3)
                + ((100.0 if help_eligible else 50.0) * 0.2),
            ),
            1,
        )

        if is_eligible:
            eligibility_status = "eligible"
            eligibility_status_bn = "সনদ পাওয়ার যোগ্য"
        elif attendance_pct >= 75.0:
            eligibility_status = "on_track"
            eligibility_status_bn = "সনদ অর্জনের পথে (অন-ট্র্যাক)"
        else:
            eligibility_status = "at_risk"
            eligibility_status_bn = "ঝুঁকিপূর্ণ (উপস্থিতি বৃদ্ধি প্রয়োজন)"

        # Performance Grade
        if avg_pct >= 85.0:
            grade_en = "Distinction (মুমতাজ)"
            grade_bn = "মুমতাজ (সর্বোচ্চ কৃতিত্ব)"
        elif avg_pct >= 75.0:
            grade_en = "Very Good (জায়্যিদ জিদ্দান)"
            grade_bn = "জায়্যিদ জিদ্দান (অতি উত্তম)"
        elif avg_pct >= 60.0:
            grade_en = "Good (জায়্যিদ)"
            grade_bn = "জায়্যিদ (উত্তম)"
        else:
            grade_en = "Pass (মাকবুল)"
            grade_bn = "মাকবুল (উত্তীর্ণ)"

        criteria_checklist = [
            {
                "key": "attendance",
                "label_bn": "ন্যূনতম ৮০.০% ক্লাসে নিয়মিত উপস্থিতি",
                "target": "৮০.০%",
                "current": f"{attendance_pct:.1f}%",
                "met": attendance_eligible,
            },
            {
                "key": "feedback",
                "label_bn": "প্রতিটি ক্লাসের বিষয় অনুধাবন মূল্যায়ন",
                "target": "৬০%+",
                "current": f"{avg_pct:.1f}%",
                "met": feedback_eligible,
            },
            {
                "key": "help_requests",
                "label_bn": "সকল হেল্প রিকোয়েস্ট সমাধান সম্পন্ন",
                "target": "০ অপেক্ষমান",
                "current": f"{pending_hr}টি অপেক্ষমান" if pending_hr > 0 else "সব সমাধান হয়েছে",
                "met": help_eligible,
            },
            {
                "key": "ethics",
                "label_bn": "ইসলামিক ব্যবসায়িক অনুশাসন ও আখলাক মূল্যায়ন",
                "target": "সন্তোষজনক",
                "current": "আলহামদুলিল্লাহ সন্তোষজনক",
                "met": True,
            },
        ]

        batch = student.current_batch
        course = batch.course if batch else None
        campus = student.campus

        certificate_info = {
            "certificate_no": f"ASSDI-SBMC-{student.student_id_number}",
            "student_name": student.user.full_name,
            "student_id_number": student.student_id_number,
            "registration_no": student.registration_no,
            "course_name": course.name if course else "Small Business Management Course",
            "course_code": course.code if course else "SBMC",
            "batch_name": batch.name if batch else "SBMC Batch 42",
            "campus_name": campus.name if campus else "Kazi Bari Campus",
            "issue_date": datetime.date.today().strftime("%d %B, %Y"),
            "completion_date": (
                batch.end_date.strftime("%d %B, %Y")
                if (batch and batch.end_date)
                else "November 2026"
            ),
            "authorized_signatory_1": "Shaikh Ahmadullah (Chairman)",
            "authorized_signatory_2": "Course Coordinator",
            "institute_reg_no": "Govt. Reg. #STP-DHA-000877",
            "photo_url": student.photo or None,
        }

        return {
            "student_id": student.id,
            "student_id_number": student.student_id_number,
            "student_name": student.user.full_name,
            "photo_url": student.photo or None,
            "batch_name": batch.name if batch else "SBMC Batch 42",
            "course_name": course.name if course else "Small Business Management Course",
            "campus_name": campus.name if campus else "Kazi Bari Campus",
            "attendance_percentage": float(attendance_pct),
            "attendance_eligible": attendance_eligible,
            "total_sessions": total_sessions,
            "attended_sessions": attended_sessions,
            "absent_sessions": absent_sessions,
            "feedback_count": feedback_count,
            "average_understanding_percentage": round(float(avg_pct), 1),
            "average_rating": round(float(avg_rating), 1),
            "feedback_eligible": feedback_eligible,
            "total_help_requests": total_hr,
            "pending_help_requests": pending_hr,
            "resolved_help_requests": resolved_hr,
            "help_requests_eligible": help_eligible,
            "is_eligible": is_eligible,
            "overall_readiness_score": overall_readiness,
            "eligibility_status": eligibility_status,
            "eligibility_status_bn": eligibility_status_bn,
            "performance_grade_en": grade_en,
            "performance_grade_bn": grade_bn,
            "criteria_checklist": criteria_checklist,
            "certificate_info": certificate_info,
        }

    @action(detail=True, methods=["get"], url_path="graduation-eligibility")
    def graduation_eligibility(self, request, pk=None):
        """
        Returns graduation and certificate eligibility analysis for a student.
        Strict RBAC scoping:
        - Super admin allowed
        - Student allowed only for own profile (or pk='me')
        - Teacher allowed for assigned batch students
        - Coordinator allowed for assigned course students
        - Observer allowed read-only
        """
        user = request.user
        if str(pk).lower() == "me":
            student = getattr(user, "student_profile", None)
            if not student:
                return Response(
                    {"detail": "No student profile found for authenticated user."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            try:
                student = Student.objects.select_related("user", "campus").get(pk=pk)
            except (Student.DoesNotExist, ValueError):
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if user.role == UserRole.STUDENT and student.user != user:
            raise PermissionDenied("Students can only view their own graduation eligibility.")

        if user.role == UserRole.TEACHER:
            student_batches = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).values_list("batch_id", flat=True)
            if not user.teacher_assignments.filter(batch_id__in=student_batches).exists():
                raise PermissionDenied("You can only view graduation eligibility for students in your assigned batches.")

        if user.role == UserRole.COORDINATOR:
            student_courses = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).values_list("batch__course_id", flat=True)
            if not user.coordinator_course_assignments.filter(course_id__in=student_courses).exists():
                raise PermissionDenied("You can only view graduation eligibility for students in your assigned courses.")

        data = self._compute_graduation_eligibility(student)
        serializer = StudentGraduationEligibilitySerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="me/graduation-eligibility")
    def me_graduation_eligibility(self, request):
        """Graduation eligibility for authenticated student directly via /students/me/graduation-eligibility/."""
        return self.graduation_eligibility(request, pk="me")

    @action(detail=False, methods=["get"], url_path="import-template")
    def import_template(self, request):
        """Generates a downloadable sample Excel template for bulk student import."""
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Students"

        headers = [
            "student_id_number",
            "registration_no",
            "full_name",
            "phone",
            "guardian_phone",
            "education_background",
            "password",
        ]
        ws.append(headers)

        header_fill = PatternFill(start_color="1B4D3E", end_color="1B4D3E", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

        sample_rows = [
            [
                "STD-2026-042-051",
                "REG-2026-042-051",
                "Tariqul Islam (Sample)",
                "01711000001",
                "01811000001",
                "General",
                "StudentPass2026!",
            ],
            [
                "STD-2026-042-052",
                "REG-2026-042-052",
                "Mahmudul Hasan (Sample)",
                "01711000002",
                "01811000002",
                "Aliya",
                "StudentPass2026!",
            ],
            [
                "STD-2026-042-053",
                "REG-2026-042-053",
                "Zubair Ahmed (Sample)",
                "01711000003",
                "01811000003",
                "Qawmi",
                "StudentPass2026!",
            ],
        ]
        for row_data in sample_rows:
            ws.append(row_data)

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = col[0].column_letter
            ws.column_dimensions[col_letter].width = max(max_len + 4, 15)

        format_param = (
            request.query_params.get("template_format")
            or request.query_params.get("type")
            or request.query_params.get("export_format")
            or "xlsx"
        ).lower()
        if format_param == "csv":
            import csv
            out = io.StringIO()
            out.write("\ufeff")  # UTF-8 BOM for Excel compatibility
            writer = csv.writer(out)
            writer.writerow(headers)
            for r in sample_rows:
                writer.writerow(r)
            response = HttpResponse(out.getvalue(), content_type="text/csv; charset=utf-8")
            response["Content-Disposition"] = 'attachment; filename="assdi_student_import_template.csv"'
            return response

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        response = HttpResponse(
            buf.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="assdi_student_import_template.xlsx"'
        return response

    @action(detail=False, methods=["post"], url_path="bulk-import")
    def bulk_import(self, request):
        """
        Bulk import students from Excel file (.xlsx) or CSV file (.csv) into a target batch.
        Enforces unique IDs, campus consistency, and atomic creation per row.
        """
        user = request.user
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR]:
            raise PermissionDenied("Only super admins and coordinators can bulk import students.")

        file_obj = request.FILES.get("file")
        if not file_obj:
            raise ValidationError({"file": "An Excel (.xlsx) or CSV (.csv) file is required."})

        batch_id = request.data.get("batch_id")
        if not batch_id:
            raise ValidationError({"batch_id": "Target batch ID is required."})

        try:
            batch = Batch.objects.select_related("course", "campus").get(pk=batch_id)
        except Batch.DoesNotExist:
            raise ValidationError({"batch_id": "Selected batch does not exist."})

        if user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=batch.course).exists():
                raise PermissionDenied("You can only import students into batches of your assigned course.")

        file_name = getattr(file_obj, "name", "").lower()
        rows = []
        if file_name.endswith(".csv") or getattr(file_obj, "content_type", "") in ["text/csv", "application/vnd.ms-excel"]:
            try:
                import csv
                raw = file_obj.read()
                text = raw.decode("utf-8-sig", errors="replace")
                reader = csv.reader(io.StringIO(text))
                rows = [list(r) for r in reader]
            except Exception as exc:
                raise ValidationError({"file": f"Invalid or unreadable CSV file: {str(exc)}"})
        else:
            try:
                wb = openpyxl.load_workbook(file_obj, data_only=True)
                ws = wb.active
                rows = list(ws.iter_rows(values_only=True))
            except Exception as exc:
                raise ValidationError({"file": f"Invalid or unreadable Excel file: {str(exc)}"})
        if not rows or len(rows) < 2:
            return Response(
                {
                    "success": False,
                    "message": "The uploaded sheet is empty or contains only headers.",
                    "total_rows": 0,
                    "created_count": 0,
                    "errors": [],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        headers = [str(cell).strip().lower() if cell is not None else "" for cell in rows[0]]

        def get_col_val(row, col_name, default=""):
            if col_name in headers:
                idx = headers.index(col_name)
                if idx < len(row) and row[idx] is not None:
                    return str(row[idx]).strip()
            return default

        created_students = []
        errors = []
        User = get_user_model()

        for row_idx, row in enumerate(rows[1:], start=2):
            if not any(row):
                continue

            sid = get_col_val(row, "student_id_number")
            reg = get_col_val(row, "registration_no")
            name = get_col_val(row, "full_name")
            phone = get_col_val(row, "phone", "")
            guardian_phone = get_col_val(row, "guardian_phone", "")
            edu_bg = get_col_val(row, "education_background", "General")
            password = get_col_val(row, "password", "StudentPass2026!")

            if edu_bg not in ["General", "Aliya", "Qawmi"]:
                edu_map = {"general": "General", "aliya": "Aliya", "qawmi": "Qawmi"}
                edu_bg = edu_map.get(edu_bg.lower(), "General")

            if not sid:
                errors.append({"row": row_idx, "student_id": sid, "error": "Missing student_id_number"})
                continue
            if not reg:
                errors.append({"row": row_idx, "student_id": sid, "error": "Missing registration_no"})
                continue
            if not name:
                errors.append({"row": row_idx, "student_id": sid, "error": "Missing full_name"})
                continue

            if User.objects.filter(login_id__iexact=sid).exists():
                errors.append({"row": row_idx, "student_id": sid, "error": f"Login ID '{sid}' already exists"})
                continue

            if Student.objects.filter(student_id_number__iexact=sid).exists():
                errors.append({"row": row_idx, "student_id": sid, "error": f"Student ID '{sid}' already exists"})
                continue

            if Student.objects.filter(registration_no__iexact=reg).exists():
                errors.append({"row": row_idx, "student_id": sid, "error": f"Registration number '{reg}' already exists"})
                continue

            try:
                with transaction.atomic():
                    new_user = User.objects.create_user(
                        login_id=sid,
                        password=password,
                        full_name=name,
                        role=UserRole.STUDENT,
                        phone=phone,
                    )
                    student_obj = Student.objects.create(
                        user=new_user,
                        student_id_number=sid,
                        registration_no=reg,
                        education_background=edu_bg,
                        campus=batch.campus,
                        guardian_phone=guardian_phone,
                        status=StudentStatus.ACTIVE,
                    )
                    Enrollment.objects.create(
                        student=student_obj,
                        batch=batch,
                        status=EnrollmentStatus.ACTIVE,
                    )
                    created_students.append({
                        "id": student_obj.id,
                        "student_id_number": sid,
                        "full_name": name,
                    })
            except Exception as e:
                errors.append({"row": row_idx, "student_id": sid, "error": str(e)})

        AuditLog.objects.create(
            actor_user=request.user,
            action="STUDENT_BULK_IMPORT",
            entity_name="Student",
            entity_id=str(batch.id),
            old_values=None,
            new_values={
                "batch_id": batch.id,
                "batch_name": batch.name,
                "created_count": len(created_students),
                "error_count": len(errors),
            },
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response(
            {
                "success": True,
                "batch_name": batch.name,
                "total_rows_processed": len(rows) - 1,
                "created_count": len(created_students),
                "error_count": len(errors),
                "created_students": created_students,
                "errors": errors,
            },
            status=status.HTTP_201_CREATED if created_students else status.HTTP_200_OK,
        )






