import datetime
import io
import zoneinfo
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Avg
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






