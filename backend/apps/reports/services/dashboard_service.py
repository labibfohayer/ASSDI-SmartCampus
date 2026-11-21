import zoneinfo
from decimal import Decimal
from typing import Any, Dict, List, Optional

from rest_framework.exceptions import PermissionDenied
from django.db.models import Avg, Count, Q
from django.utils import timezone

from apps.academic.models import ClassTopic, Course
from apps.accounts.models import User, UserRole
from apps.attendance.constants import (
    calculate_attendance_percentage,
    get_repeated_absence_consecutive,
    get_repeated_absence_total,
)
from apps.attendance.models import AttendanceRecord, AttendanceStatus
from apps.batches.models import Batch, BatchStatus, TeacherAssignment
from apps.class_sessions.models import ClassSession, SessionStatus
from apps.feedback.constants import rating_to_percentage
from apps.feedback.models import HelpRequest, HelpRequestStatus, LearningFeedback
from apps.students.models import Enrollment, EnrollmentStatus, Student, StudentStatus


class CoordinatorDashboardService:
    @classmethod
    def get_dashboard_data(cls, user: User, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        filters = filters or {}
        role = user.role

        if role in [UserRole.STUDENT, UserRole.TEACHER]:
            raise PermissionDenied("You do not have permission to view the coordinator dashboard.")

        dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
        today_date = timezone.now().astimezone(dhaka_tz).date()

        # 1. Base batch queryset based on user role and permissions
        batches_qs = Batch.objects.filter(status=BatchStatus.ACTIVE)
        if role == UserRole.COORDINATOR:
            assigned_course_ids = list(
                user.coordinator_course_assignments.values_list("course_id", flat=True)
            )
            batches_qs = batches_qs.filter(course_id__in=assigned_course_ids)

        # 2. Apply filters to batches
        course_id = filters.get("course")
        if course_id:
            try:
                course_id = int(course_id)
            except (ValueError, TypeError):
                pass
            if role == UserRole.COORDINATOR:
                if course_id not in assigned_course_ids:
                    raise PermissionDenied("You are not assigned to this course.")
            batches_qs = batches_qs.filter(course_id=course_id)

        batch_id = filters.get("batch")
        if batch_id:
            try:
                batch_id = int(batch_id)
            except (ValueError, TypeError):
                pass
            if role == UserRole.COORDINATOR:
                target_batch = Batch.objects.filter(id=batch_id).first()
                if not target_batch or target_batch.course_id not in assigned_course_ids:
                    raise PermissionDenied("You are not assigned to this batch's course.")
            batches_qs = batches_qs.filter(id=batch_id)

        teacher_id = filters.get("teacher")
        if teacher_id:
            batches_qs = batches_qs.filter(
                teacher_assignments__teacher_user_id=teacher_id,
            )

        scoped_batch_ids = list(batches_qs.values_list("id", flat=True))

        # 3. Base sessions queryset
        sessions_qs = ClassSession.objects.filter(
            batch_id__in=scoped_batch_ids,
            status=SessionStatus.PUBLISHED,
        )

        date_from = filters.get("date_from")
        if date_from:
            sessions_qs = sessions_qs.filter(session_date__gte=date_from)

        date_to = filters.get("date_to")
        if date_to:
            sessions_qs = sessions_qs.filter(session_date__lte=date_to)

        topic_id = filters.get("topic")
        if topic_id:
            try:
                topic_id = int(topic_id)
            except (ValueError, TypeError):
                pass
            sessions_qs = sessions_qs.filter(topic_id=topic_id)

        if teacher_id:
            sessions_qs = sessions_qs.filter(teacher_user_id=teacher_id)

        scoped_session_ids = list(sessions_qs.values_list("id", flat=True))

        # 4. Total students in active batches
        active_enrollments_qs = Enrollment.objects.filter(
            batch_id__in=scoped_batch_ids,
            status=EnrollmentStatus.ACTIVE,
            student__status=StudentStatus.ACTIVE,
        )
        total_students = active_enrollments_qs.values("student_id").distinct().count()
        total_active_batches = len(scoped_batch_ids)

        # 5. Total teachers assigned in scope
        teacher_assignments_qs = TeacherAssignment.objects.filter(
            batch_id__in=scoped_batch_ids,
        )
        total_teachers = teacher_assignments_qs.values("teacher_user_id").distinct().count()

        # 6. Today's classes in Asia/Dhaka
        todays_classes = ClassSession.objects.filter(
            batch_id__in=scoped_batch_ids,
            session_date=today_date,
            status=SessionStatus.PUBLISHED,
        ).count()

        # 7. Attendance Percentage
        attendance_qs = AttendanceRecord.objects.filter(session_id__in=scoped_session_ids)
        att_status_filter = filters.get("attendance_status")
        if att_status_filter:
            attendance_qs = attendance_qs.filter(status=att_status_filter)

        att_counts = attendance_qs.aggregate(
            total=Count("id"),
            present=Count("id", filter=Q(status=AttendanceStatus.PRESENT)),
            late=Count("id", filter=Q(status=AttendanceStatus.LATE)),
            absent=Count("id", filter=Q(status=AttendanceStatus.ABSENT)),
            leave=Count("id", filter=Q(status=AttendanceStatus.APPROVED_LEAVE)),
        )
        overall_attendance_percentage = calculate_attendance_percentage(
            present_count=att_counts["present"],
            late_count=att_counts["late"],
            total_count=att_counts["total"],
            approved_leave_count=att_counts["leave"],
        )

        # 8. Overall Learning Progress
        feedbacks_qs = LearningFeedback.objects.filter(session_id__in=scoped_session_ids)
        avg_rating_val = feedbacks_qs.aggregate(avg=Avg("understanding_rating"))["avg"]
        if avg_rating_val is not None:
            overall_learning_rating = round(float(avg_rating_val), 2)
            overall_learning_percentage = round(overall_learning_rating * 20.0, 1)
        else:
            overall_learning_rating = None
            overall_learning_percentage = None

        # 9. Help Requests
        help_requests_qs = HelpRequest.objects.filter(session_id__in=scoped_session_ids)
        hr_status_filter = filters.get("help_request_status")
        if hr_status_filter:
            help_requests_qs = help_requests_qs.filter(status=hr_status_filter)

        total_help_requests = help_requests_qs.count()
        pending_help_requests = help_requests_qs.filter(status=HelpRequestStatus.PENDING).count()

        # 10. Batch-wise Performance
        batch_wise_list: List[Dict[str, Any]] = []
        for b in batches_qs.select_related("course").order_by("name"):
            b_sessions = ClassSession.objects.filter(batch=b, status=SessionStatus.PUBLISHED)
            if date_from:
                b_sessions = b_sessions.filter(session_date__gte=date_from)
            if date_to:
                b_sessions = b_sessions.filter(session_date__lte=date_to)

            b_session_ids = list(b_sessions.values_list("id", flat=True))

            b_att = AttendanceRecord.objects.filter(session_id__in=b_session_ids).aggregate(
                total=Count("id"),
                present=Count("id", filter=Q(status=AttendanceStatus.PRESENT)),
                late=Count("id", filter=Q(status=AttendanceStatus.LATE)),
                leave=Count("id", filter=Q(status=AttendanceStatus.APPROVED_LEAVE)),
            )
            b_att_pct = calculate_attendance_percentage(
                present_count=b_att["present"],
                late_count=b_att["late"],
                total_count=b_att["total"],
                approved_leave_count=b_att["leave"],
            )

            b_feedbacks = LearningFeedback.objects.filter(session_id__in=b_session_ids)
            b_avg_val = b_feedbacks.aggregate(avg=Avg("understanding_rating"))["avg"]
            if b_avg_val is not None:
                b_avg_rating = round(float(b_avg_val), 2)
                b_avg_pct = round(b_avg_rating * 20.0, 1)
            else:
                b_avg_rating = None
                b_avg_pct = None

            b_pending_hr = HelpRequest.objects.filter(
                session_id__in=b_session_ids, status=HelpRequestStatus.PENDING
            ).count()

            b_students_count = Enrollment.objects.filter(
                batch=b,
                status=EnrollmentStatus.ACTIVE,
                student__status=StudentStatus.ACTIVE,
            ).count()

            batch_wise_list.append({
                "batch_id": b.id,
                "batch_name": b.name,
                "batch_number": b.batch_number,
                "course_name": b.course.name,
                "student_count": b_students_count,
                "attendance_percentage": b_att_pct,
                "average_rating": b_avg_rating,
                "average_percentage": b_avg_pct,
                "pending_help_requests": b_pending_hr,
            })

        # 11. Teacher-wise Performance
        teacher_wise_list: List[Dict[str, Any]] = []
        assigned_teachers = (
            User.objects.filter(
                role=UserRole.TEACHER,
                teacher_assignments__batch_id__in=scoped_batch_ids,
            )
            .distinct()
            .order_by("full_name")
        )
        if teacher_id:
            assigned_teachers = assigned_teachers.filter(id=teacher_id)

        for t in assigned_teachers:
            t_sessions = ClassSession.objects.filter(
                teacher_user=t,
                batch_id__in=scoped_batch_ids,
                status=SessionStatus.PUBLISHED,
            )
            if date_from:
                t_sessions = t_sessions.filter(session_date__gte=date_from)
            if date_to:
                t_sessions = t_sessions.filter(session_date__lte=date_to)

            t_session_ids = list(t_sessions.values_list("id", flat=True))
            classes_conducted = t_sessions.filter(session_date__lte=today_date).count()

            t_feedbacks = LearningFeedback.objects.filter(session_id__in=t_session_ids)
            t_avg_val = t_feedbacks.aggregate(avg=Avg("understanding_rating"))["avg"]
            if t_avg_val is not None:
                t_avg_rating = round(float(t_avg_val), 2)
                t_avg_pct = round(t_avg_rating * 20.0, 1)
            else:
                t_avg_rating = None
                t_avg_pct = None

            t_hrs = HelpRequest.objects.filter(session_id__in=t_session_ids)
            t_total_hr = t_hrs.count()
            t_resolved_hr = t_hrs.filter(status=HelpRequestStatus.RESOLVED).count()

            teacher_wise_list.append({
                "teacher_id": str(t.id),
                "teacher_name": t.full_name,
                "login_id": t.login_id,
                "classes_conducted": classes_conducted,
                "average_rating": t_avg_rating,
                "average_percentage": t_avg_pct,
                "help_requests_count": t_total_hr,
                "resolved_help_requests_count": t_resolved_hr,
            })

        # 12. Repeated Absences & Students Requiring Attention
        consecutive_threshold = get_repeated_absence_consecutive()
        total_threshold = get_repeated_absence_total()

        enrolled_students = (
            Student.objects.filter(
                enrollments__batch_id__in=scoped_batch_ids,
                enrollments__status=EnrollmentStatus.ACTIVE,
                status=StudentStatus.ACTIVE,
            )
            .select_related("user")
            .distinct()
            .order_by("student_id_number")
        )

        repeated_absences_list: List[Dict[str, Any]] = []
        students_requiring_attention_list: List[Dict[str, Any]] = []

        is_observer = role == UserRole.OBSERVER

        for st in enrolled_students:
            st_records = AttendanceRecord.objects.filter(
                student=st,
                session__batch_id__in=scoped_batch_ids,
                session__status=SessionStatus.PUBLISHED,
            ).order_by("session__session_date", "session__start_time")

            st_total_absences = st_records.filter(status=AttendanceStatus.ABSENT).count()
            st_consecutive_absences = 0
            for rec in reversed(list(st_records)):
                if rec.status == AttendanceStatus.ABSENT:
                    st_consecutive_absences += 1
                else:
                    break

            is_repeated_absent = (
                st_consecutive_absences >= consecutive_threshold
                or st_total_absences >= total_threshold
            )

            if is_repeated_absent:
                reasons = []
                if st_consecutive_absences >= consecutive_threshold:
                    reasons.append(f"{st_consecutive_absences} consecutive absences")
                if st_total_absences >= total_threshold:
                    reasons.append(f"{st_total_absences} total absences")

                if not is_observer:
                    repeated_absences_list.append({
                        "student_id": st.id,
                        "student_id_number": st.student_id_number,
                        "registration_no": st.registration_no,
                        "student_name": st.user.full_name,
                        "phone": st.user.phone or "",
                        "consecutive_absences": st_consecutive_absences,
                        "total_absences": st_total_absences,
                        "reasons": reasons,
                    })
                else:
                    # In observer mode, count increment only
                    pass

            # Check average rating for student
            st_feedback = LearningFeedback.objects.filter(
                student=st, session_id__in=scoped_session_ids
            )
            st_avg_rating = st_feedback.aggregate(avg=Avg("understanding_rating"))["avg"]
            has_low_understanding = (st_avg_rating is not None and st_avg_rating <= 2.0)

            if is_repeated_absent or has_low_understanding:
                att_reasons = []
                if is_repeated_absent:
                    att_reasons.append(f"Repeated absences ({st_consecutive_absences} cons. / {st_total_absences} tot.)")
                if has_low_understanding:
                    att_reasons.append(f"Low understanding rating ({round(float(st_avg_rating), 1)} / 5)")

                if not is_observer:
                    students_requiring_attention_list.append({
                        "student_id": st.id,
                        "student_id_number": st.student_id_number,
                        "registration_no": st.registration_no,
                        "student_name": st.user.full_name,
                        "phone": st.user.phone or "",
                        "reasons": att_reasons,
                        "average_rating": round(float(st_avg_rating), 2) if st_avg_rating else None,
                        "consecutive_absences": st_consecutive_absences,
                        "total_absences": st_total_absences,
                    })

        repeated_absence_count = len(repeated_absences_list) if not is_observer else sum(
            1 for st in enrolled_students
            if AttendanceRecord.objects.filter(
                student=st, session__batch_id__in=scoped_batch_ids, session__status=SessionStatus.PUBLISHED, status=AttendanceStatus.ABSENT
            ).count() >= total_threshold or (
                # quick check for consecutive
                True if st in enrolled_students else False
            )
        )
        # To be completely exact for observer count without duplicating code:
        if is_observer:
            # calculate exact count
            obs_rep_count = 0
            obs_att_count = 0
            for st in enrolled_students:
                records = list(AttendanceRecord.objects.filter(
                    student=st,
                    session__batch_id__in=scoped_batch_ids,
                    session__status=SessionStatus.PUBLISHED,
                ).order_by("session__session_date", "session__start_time"))
                tot_abs = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
                cons_abs = 0
                for r in reversed(records):
                    if r.status == AttendanceStatus.ABSENT:
                        cons_abs += 1
                    else:
                        break
                is_rep = (cons_abs >= consecutive_threshold or tot_abs >= total_threshold)
                if is_rep:
                    obs_rep_count += 1
                
                st_fb = LearningFeedback.objects.filter(student=st, session_id__in=scoped_session_ids)
                avg_r = st_fb.aggregate(avg=Avg("understanding_rating"))["avg"]
                is_low = (avg_r is not None and avg_r <= 2.0)
                if is_rep or is_low:
                    obs_att_count += 1
            repeated_absence_count = obs_rep_count
            students_requiring_attention_count = obs_att_count
        else:
            repeated_absence_count = len(repeated_absences_list)
            students_requiring_attention_count = len(students_requiring_attention_list)

        return {
            "total_students": total_students,
            "total_active_batches": total_active_batches,
            "total_teachers": total_teachers,
            "todays_classes": todays_classes,
            "overall_attendance_percentage": overall_attendance_percentage,
            "overall_learning_progress": {
                "average_rating": overall_learning_rating,
                "average_percentage": overall_learning_percentage,
            },
            "total_help_requests": total_help_requests,
            "pending_help_requests": pending_help_requests,
            "batch_wise_performance": batch_wise_list,
            "teacher_wise_performance": teacher_wise_list,
            "repeated_absence_count": repeated_absence_count,
            "repeated_absences": repeated_absences_list if not is_observer else [],
            "students_requiring_attention_count": students_requiring_attention_count,
            "students_requiring_attention": students_requiring_attention_list if not is_observer else [],
        }
