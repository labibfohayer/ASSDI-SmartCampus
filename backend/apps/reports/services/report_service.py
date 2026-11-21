import datetime
import zoneinfo
from decimal import Decimal
from typing import Any, Dict, List, Optional

from rest_framework.exceptions import PermissionDenied
from django.db.models import Avg, Count, Q
from django.utils import timezone

from apps.academic.models import ClassTopic, Course, Subject
from apps.accounts.models import User, UserRole
from apps.attendance.constants import (
    calculate_attendance_percentage,
    get_repeated_absence_consecutive,
    get_repeated_absence_total,
)
from apps.attendance.models import AttendanceRecord, AttendanceStatus
from apps.batches.models import Batch, BatchStatus, TeacherAssignment
from apps.class_sessions.models import ClassSession, SessionStatus
from apps.feedback.constants import (
    ALL_BANDS,
    BAND_0_20,
    BAND_21_40,
    BAND_41_60,
    BAND_61_80,
    BAND_81_100,
    RATING_TO_BAND,
    rating_to_percentage,
)
from apps.feedback.models import HelpRequest, HelpRequestStatus, LearningFeedback
from apps.students.models import Enrollment, EnrollmentStatus, Student, StudentStatus


class ReportService:
    @staticmethod
    def _get_dhaka_today() -> datetime.date:
        dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
        return timezone.now().astimezone(dhaka_tz).date()

    @classmethod
    def _scope_batches(
        cls,
        user: User,
        filters: Dict[str, Any],
        allow_teacher: bool = True,
        allow_observer: bool = True,
    ):
        """
        Applies role-based scoping and validates requested batch/course filters.
        Raises PermissionDenied if the user role is unauthorized or accesses out-of-scope resources.
        """
        role = user.role

        if role == UserRole.STUDENT:
            raise PermissionDenied("Students do not have access to reports.")

        if role == UserRole.OBSERVER and not allow_observer:
            raise PermissionDenied("Observers do not have access to individual student reports.")

        if role == UserRole.TEACHER and not allow_teacher:
            raise PermissionDenied("Teachers do not have access to this report.")

        batches_qs = Batch.objects.all()

        if role == UserRole.COORDINATOR:
            assigned_courses = list(
                user.coordinator_course_assignments.values_list("course_id", flat=True)
            )
            batches_qs = batches_qs.filter(course_id__in=assigned_courses)

            course_filter = filters.get("course")
            if course_filter:
                try:
                    course_id = int(course_filter)
                except (ValueError, TypeError):
                    course_id = None
                if course_id not in assigned_courses:
                    raise PermissionDenied("You are not assigned to this course.")
                batches_qs = batches_qs.filter(course_id=course_id)

            batch_filter = filters.get("batch")
            if batch_filter:
                try:
                    b_id = int(batch_filter)
                except (ValueError, TypeError):
                    b_id = None
                target_batch = Batch.objects.filter(id=b_id).first()
                if not target_batch or target_batch.course_id not in assigned_courses:
                    raise PermissionDenied("You are not assigned to this batch's course.")
                batches_qs = batches_qs.filter(id=b_id)

        elif role == UserRole.TEACHER:
            assigned_batch_ids = list(
                TeacherAssignment.objects.filter(
                    teacher_user=user
                ).values_list("batch_id", flat=True)
            )
            batches_qs = batches_qs.filter(id__in=assigned_batch_ids)

            batch_filter = filters.get("batch")
            if batch_filter:
                try:
                    b_id = int(batch_filter)
                except (ValueError, TypeError):
                    b_id = None
                if b_id not in assigned_batch_ids:
                    raise PermissionDenied("You are not assigned to this batch.")
                batches_qs = batches_qs.filter(id=b_id)

            course_filter = filters.get("course")
            if course_filter:
                try:
                    course_id = int(course_filter)
                except (ValueError, TypeError):
                    course_id = None
                batches_qs = batches_qs.filter(course_id=course_id)

        else:
            # Super Admin or Observer
            course_filter = filters.get("course")
            if course_filter:
                try:
                    batches_qs = batches_qs.filter(course_id=int(course_filter))
                except (ValueError, TypeError):
                    pass

            batch_filter = filters.get("batch")
            if batch_filter:
                try:
                    batches_qs = batches_qs.filter(id=int(batch_filter))
                except (ValueError, TypeError):
                    pass

        return batches_qs

    # =========================================================================
    # 1. Daily Attendance Report
    # =========================================================================
    @classmethod
    def get_daily_attendance_report(cls, user: User, filters: Dict[str, Any]) -> Dict[str, Any]:
        batches_qs = cls._scope_batches(user, filters, allow_teacher=True, allow_observer=True)
        report_date_str = filters.get("date")
        if report_date_str:
            try:
                report_date = datetime.date.fromisoformat(str(report_date_str))
            except ValueError:
                report_date = cls._get_dhaka_today()
        else:
            report_date = cls._get_dhaka_today()

        sessions = (
            ClassSession.objects.filter(
                batch__in=batches_qs,
                session_date=report_date,
                status=SessionStatus.PUBLISHED,
            )
            .select_related("batch", "subject", "topic", "teacher_user")
            .order_by("start_time")
        )

        session_list: List[Dict[str, Any]] = []
        total_present = 0
        total_late = 0
        total_absent = 0
        total_leave = 0
        total_records = 0

        for s in sessions:
            att = AttendanceRecord.objects.filter(session=s).aggregate(
                total=Count("id"),
                present=Count("id", filter=Q(status=AttendanceStatus.PRESENT)),
                late=Count("id", filter=Q(status=AttendanceStatus.LATE)),
                absent=Count("id", filter=Q(status=AttendanceStatus.ABSENT)),
                leave=Count("id", filter=Q(status=AttendanceStatus.APPROVED_LEAVE)),
            )
            pct = calculate_attendance_percentage(
                present_count=att["present"],
                late_count=att["late"],
                total_count=att["total"],
                approved_leave_count=att["leave"],
            )

            total_present += att["present"]
            total_late += att["late"]
            total_absent += att["absent"]
            total_leave += att["leave"]
            total_records += att["total"]

            session_list.append({
                "session_id": s.id,
                "batch_id": s.batch.id,
                "batch_name": s.batch.name,
                "subject_name": s.subject.name,
                "topic_title": s.topic.title,
                "teacher_name": s.teacher_user.full_name,
                "start_time": s.start_time.strftime("%H:%M"),
                "end_time": s.end_time.strftime("%H:%M"),
                "present_count": att["present"],
                "late_count": att["late"],
                "absent_count": att["absent"],
                "approved_leave_count": att["leave"],
                "total_records": att["total"],
                "attendance_percentage": pct,
            })

        overall_pct = calculate_attendance_percentage(
            present_count=total_present,
            late_count=total_late,
            total_count=total_records,
            approved_leave_count=total_leave,
        )

        return {
            "report_date": report_date.isoformat(),
            "total_sessions": len(session_list),
            "total_records": total_records,
            "present_count": total_present,
            "late_count": total_late,
            "absent_count": total_absent,
            "approved_leave_count": total_leave,
            "attendance_percentage": overall_pct,
            "sessions": session_list,
        }

    # =========================================================================
    # 2. Daily Learning Progress Report
    # =========================================================================
    @classmethod
    def get_daily_learning_progress_report(cls, user: User, filters: Dict[str, Any]) -> Dict[str, Any]:
        batches_qs = cls._scope_batches(user, filters, allow_teacher=True, allow_observer=True)
        report_date_str = filters.get("date")
        if report_date_str:
            try:
                report_date = datetime.date.fromisoformat(str(report_date_str))
            except ValueError:
                report_date = cls._get_dhaka_today()
        else:
            report_date = cls._get_dhaka_today()

        sessions = (
            ClassSession.objects.filter(
                batch__in=batches_qs,
                session_date=report_date,
                status=SessionStatus.PUBLISHED,
            )
            .select_related("batch", "subject", "topic", "teacher_user")
            .order_by("start_time")
        )

        session_list: List[Dict[str, Any]] = []
        overall_band_dist = {band: 0 for band in ALL_BANDS}
        all_ratings: List[int] = []

        for s in sessions:
            fb_qs = LearningFeedback.objects.filter(session=s)
            fb_count = fb_qs.count()
            avg_val = fb_qs.aggregate(avg=Avg("understanding_rating"))["avg"]

            s_bands = {band: 0 for band in ALL_BANDS}
            for fb in fb_qs.only("understanding_rating"):
                all_ratings.append(fb.understanding_rating)
                band = RATING_TO_BAND.get(fb.understanding_rating)
                if band:
                    s_bands[band] += 1
                    overall_band_dist[band] += 1

            if avg_val is not None:
                s_avg_rating = round(float(avg_val), 2)
                s_avg_pct = round(s_avg_rating * 20.0, 1)
            else:
                s_avg_rating = None
                s_avg_pct = None

            needs_help_count = fb_qs.filter(needs_help=True).count()

            # Active eligible students count in batch
            eligible_students = Enrollment.objects.filter(
                batch=s.batch,
                status=EnrollmentStatus.ACTIVE,
                student__status=StudentStatus.ACTIVE,
            ).count()
            pending_count = max(0, eligible_students - fb_count)

            session_list.append({
                "session_id": s.id,
                "batch_id": s.batch.id,
                "batch_name": s.batch.name,
                "subject_name": s.subject.name,
                "topic_title": s.topic.title,
                "teacher_name": s.teacher_user.full_name,
                "feedback_count": fb_count,
                "pending_feedback_count": pending_count,
                "average_rating": s_avg_rating,
                "average_percentage": s_avg_pct,
                "needs_help_count": needs_help_count,
                "band_distribution": s_bands,
            })

        if all_ratings:
            overall_avg_rating = round(sum(all_ratings) / len(all_ratings), 2)
            overall_avg_pct = round(overall_avg_rating * 20.0, 1)
        else:
            overall_avg_rating = None
            overall_avg_pct = None

        return {
            "report_date": report_date.isoformat(),
            "total_sessions": len(session_list),
            "total_feedbacks": len(all_ratings),
            "average_rating": overall_avg_rating,
            "average_percentage": overall_avg_pct,
            "band_distribution": overall_band_dist,
            "sessions": session_list,
        }

    # =========================================================================
    # 3. Weekly Progress Report
    # =========================================================================
    @classmethod
    def get_weekly_progress_report(cls, user: User, filters: Dict[str, Any]) -> Dict[str, Any]:
        batches_qs = cls._scope_batches(user, filters, allow_teacher=True, allow_observer=True)
        today = cls._get_dhaka_today()

        week_start_str = filters.get("week_start") or filters.get("date_from")
        if week_start_str:
            try:
                start_date = datetime.date.fromisoformat(str(week_start_str))
            except ValueError:
                start_date = today - datetime.timedelta(days=6)
        else:
            start_date = today - datetime.timedelta(days=6)

        week_end_str = filters.get("week_end") or filters.get("date_to")
        if week_end_str:
            try:
                end_date = datetime.date.fromisoformat(str(week_end_str))
            except ValueError:
                end_date = start_date + datetime.timedelta(days=6)
        else:
            end_date = start_date + datetime.timedelta(days=6)

        sessions_qs = ClassSession.objects.filter(
            batch__in=batches_qs,
            session_date__gte=start_date,
            session_date__lte=end_date,
            status=SessionStatus.PUBLISHED,
        )

        daily_breakdown: List[Dict[str, Any]] = []
        cur_date = start_date
        while cur_date <= end_date:
            day_sessions = sessions_qs.filter(session_date=cur_date)
            day_s_ids = list(day_sessions.values_list("id", flat=True))

            att = AttendanceRecord.objects.filter(session_id__in=day_s_ids).aggregate(
                total=Count("id"),
                present=Count("id", filter=Q(status=AttendanceStatus.PRESENT)),
                late=Count("id", filter=Q(status=AttendanceStatus.LATE)),
                leave=Count("id", filter=Q(status=AttendanceStatus.APPROVED_LEAVE)),
            )
            pct = calculate_attendance_percentage(
                present_count=att["present"],
                late_count=att["late"],
                total_count=att["total"],
                approved_leave_count=att["leave"],
            )

            fb = LearningFeedback.objects.filter(session_id__in=day_s_ids)
            avg_v = fb.aggregate(avg=Avg("understanding_rating"))["avg"]
            if avg_v is not None:
                day_avg_rating = round(float(avg_v), 2)
                day_avg_pct = round(day_avg_rating * 20.0, 1)
            else:
                day_avg_rating = None
                day_avg_pct = None

            daily_breakdown.append({
                "date": cur_date.isoformat(),
                "day_name": cur_date.strftime("%A"),
                "classes_count": day_sessions.count(),
                "attendance_percentage": pct,
                "average_rating": day_avg_rating,
                "average_percentage": day_avg_pct,
            })
            cur_date += datetime.timedelta(days=1)

        all_s_ids = list(sessions_qs.values_list("id", flat=True))
        tot_att = AttendanceRecord.objects.filter(session_id__in=all_s_ids).aggregate(
            total=Count("id"),
            present=Count("id", filter=Q(status=AttendanceStatus.PRESENT)),
            late=Count("id", filter=Q(status=AttendanceStatus.LATE)),
            absent=Count("id", filter=Q(status=AttendanceStatus.ABSENT)),
            leave=Count("id", filter=Q(status=AttendanceStatus.APPROVED_LEAVE)),
        )
        tot_pct = calculate_attendance_percentage(
            present_count=tot_att["present"],
            late_count=tot_att["late"],
            total_count=tot_att["total"],
            approved_leave_count=tot_att["leave"],
        )

        all_fb = LearningFeedback.objects.filter(session_id__in=all_s_ids)
        all_avg_v = all_fb.aggregate(avg=Avg("understanding_rating"))["avg"]
        if all_avg_v is not None:
            ov_avg_r = round(float(all_avg_v), 2)
            ov_avg_p = round(ov_avg_r * 20.0, 1)
        else:
            ov_avg_r = None
            ov_avg_p = None

        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
            "total_classes": sessions_qs.count(),
            "attendance_summary": {
                "total_records": tot_att["total"],
                "present_count": tot_att["present"],
                "late_count": tot_att["late"],
                "absent_count": tot_att["absent"],
                "approved_leave_count": tot_att["leave"],
                "attendance_percentage": tot_pct,
            },
            "learning_summary": {
                "total_feedbacks": all_fb.count(),
                "average_rating": ov_avg_r,
                "average_percentage": ov_avg_p,
                "needs_help_count": all_fb.filter(needs_help=True).count(),
            },
            "daily_breakdown": daily_breakdown,
        }

    # =========================================================================
    # 4. Monthly Student Performance Report (Individual)
    # =========================================================================
    @classmethod
    def get_monthly_student_performance_report(
        cls, user: User, filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        # Observer is strictly FORBIDDEN from individual reports
        batches_qs = cls._scope_batches(user, filters, allow_teacher=True, allow_observer=False)
        today = cls._get_dhaka_today()

        try:
            year = int(filters.get("year", today.year))
        except (ValueError, TypeError):
            year = today.year

        try:
            month = int(filters.get("month", today.month))
        except (ValueError, TypeError):
            month = today.month

        # Determine target batch
        batch_id_filter = filters.get("batch")
        if batch_id_filter:
            try:
                target_batch = batches_qs.filter(id=int(batch_id_filter)).first()
            except (ValueError, TypeError):
                target_batch = None
        else:
            target_batch = batches_qs.first()

        if not target_batch:
            return {
                "year": year,
                "month": month,
                "batch_id": None,
                "batch_name": None,
                "total_students": 0,
                "students": [],
            }

        # Filter sessions for the batch and month
        month_sessions = ClassSession.objects.filter(
            batch=target_batch,
            session_date__year=year,
            session_date__month=month,
            status=SessionStatus.PUBLISHED,
        )
        month_s_ids = list(month_sessions.values_list("id", flat=True))

        enrolled_students = (
            Student.objects.filter(
                enrollments__batch=target_batch,
                enrollments__status=EnrollmentStatus.ACTIVE,
                status=StudentStatus.ACTIVE,
            )
            .select_related("user")
            .distinct()
            .order_by("student_id_number")
        )

        student_filter = filters.get("student")
        if student_filter:
            enrolled_students = enrolled_students.filter(
                Q(id=student_filter) | Q(student_id_number=student_filter)
            )

        student_items: List[Dict[str, Any]] = []
        for st in enrolled_students:
            st_att = AttendanceRecord.objects.filter(
                student=st, session_id__in=month_s_ids
            ).aggregate(
                total=Count("id"),
                present=Count("id", filter=Q(status=AttendanceStatus.PRESENT)),
                late=Count("id", filter=Q(status=AttendanceStatus.LATE)),
                absent=Count("id", filter=Q(status=AttendanceStatus.ABSENT)),
                leave=Count("id", filter=Q(status=AttendanceStatus.APPROVED_LEAVE)),
            )
            st_att_pct = calculate_attendance_percentage(
                present_count=st_att["present"],
                late_count=st_att["late"],
                total_count=st_att["total"],
                approved_leave_count=st_att["leave"],
            )

            st_fb = LearningFeedback.objects.filter(student=st, session_id__in=month_s_ids)
            st_fb_count = st_fb.count()
            st_avg_val = st_fb.aggregate(avg=Avg("understanding_rating"))["avg"]
            if st_avg_val is not None:
                st_avg_rating = round(float(st_avg_val), 2)
                st_avg_pct = round(st_avg_rating * 20.0, 1)
            else:
                st_avg_rating = None
                st_avg_pct = None

            st_hr_count = HelpRequest.objects.filter(student=st, session_id__in=month_s_ids).count()

            # Performance health indicator
            is_good = (
                (st_att_pct is None or st_att_pct >= 80.0)
                and (st_avg_rating is None or st_avg_rating >= 3.0)
            )
            perf_status = "Satisfactory" if is_good else "Needs Attention"

            student_items.append({
                "student_id": st.id,
                "student_id_number": st.student_id_number,
                "registration_no": st.registration_no,
                "student_name": st.user.full_name,
                "phone": st.user.phone or "",
                "education_background": st.education_background,
                "total_sessions": len(month_s_ids),
                "present_count": st_att["present"],
                "late_count": st_att["late"],
                "absent_count": st_att["absent"],
                "approved_leave_count": st_att["leave"],
                "attendance_percentage": st_att_pct,
                "feedback_count": st_fb_count,
                "average_rating": st_avg_rating,
                "average_percentage": st_avg_pct,
                "help_requests_count": st_hr_count,
                "status": perf_status,
            })

        return {
            "year": year,
            "month": month,
            "batch_id": target_batch.id,
            "batch_name": target_batch.name,
            "total_students": len(student_items),
            "students": student_items,
        }

    # =========================================================================
    # 5. Batch-Wise Performance Report
    # =========================================================================
    @classmethod
    def get_batch_wise_performance_report(
        cls, user: User, filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        batches_qs = cls._scope_batches(user, filters, allow_teacher=True, allow_observer=True)

        date_from = filters.get("date_from")
        date_to = filters.get("date_to")

        batch_items: List[Dict[str, Any]] = []
        for b in batches_qs.select_related("course", "campus").order_by("name"):
            sessions = ClassSession.objects.filter(batch=b, status=SessionStatus.PUBLISHED)
            if date_from:
                sessions = sessions.filter(session_date__gte=date_from)
            if date_to:
                sessions = sessions.filter(session_date__lte=date_to)

            s_ids = list(sessions.values_list("id", flat=True))

            att = AttendanceRecord.objects.filter(session_id__in=s_ids).aggregate(
                total=Count("id"),
                present=Count("id", filter=Q(status=AttendanceStatus.PRESENT)),
                late=Count("id", filter=Q(status=AttendanceStatus.LATE)),
                leave=Count("id", filter=Q(status=AttendanceStatus.APPROVED_LEAVE)),
            )
            pct = calculate_attendance_percentage(
                present_count=att["present"],
                late_count=att["late"],
                total_count=att["total"],
                approved_leave_count=att["leave"],
            )

            fb = LearningFeedback.objects.filter(session_id__in=s_ids)
            avg_v = fb.aggregate(avg=Avg("understanding_rating"))["avg"]
            if avg_v is not None:
                b_avg_r = round(float(avg_v), 2)
                b_avg_p = round(b_avg_r * 20.0, 1)
            else:
                b_avg_r = None
                b_avg_p = None

            hrs = HelpRequest.objects.filter(session_id__in=s_ids)
            total_hr = hrs.count()
            pending_hr = hrs.filter(status=HelpRequestStatus.PENDING).count()

            st_count = Enrollment.objects.filter(
                batch=b,
                status=EnrollmentStatus.ACTIVE,
                student__status=StudentStatus.ACTIVE,
            ).count()

            batch_items.append({
                "batch_id": b.id,
                "batch_name": b.name,
                "batch_number": b.batch_number,
                "course_name": b.course.name,
                "campus_name": b.campus.name if b.campus else "Main Campus",
                "status": b.status,
                "student_count": st_count,
                "total_classes": sessions.count(),
                "attendance_percentage": pct,
                "average_rating": b_avg_r,
                "average_percentage": b_avg_p,
                "total_help_requests": total_hr,
                "pending_help_requests": pending_hr,
            })

        return {
            "total_batches": len(batch_items),
            "batches": batch_items,
        }

    # =========================================================================
    # 6. Topic-Wise Understanding Report
    # =========================================================================
    @classmethod
    def get_topic_wise_understanding_report(
        cls, user: User, filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        batches_qs = cls._scope_batches(user, filters, allow_teacher=True, allow_observer=True)

        sessions_qs = ClassSession.objects.filter(
            batch__in=batches_qs,
            status=SessionStatus.PUBLISHED,
        )

        subject_filter = filters.get("subject")
        if subject_filter:
            try:
                sessions_qs = sessions_qs.filter(subject_id=int(subject_filter))
            except (ValueError, TypeError):
                pass

        topic_filter = filters.get("topic")
        if topic_filter:
            try:
                sessions_qs = sessions_qs.filter(topic_id=int(topic_filter))
            except (ValueError, TypeError):
                pass

        topics = (
            ClassTopic.objects.filter(
                sessions__in=sessions_qs
            )
            .select_related("subject", "subject__course")
            .distinct()
            .order_by("subject__name", "title")
        )

        topic_items: List[Dict[str, Any]] = []
        for top in topics:
            top_sessions = sessions_qs.filter(topic=top)
            top_s_ids = list(top_sessions.values_list("id", flat=True))

            fb_qs = LearningFeedback.objects.filter(session_id__in=top_s_ids)
            fb_count = fb_qs.count()
            avg_v = fb_qs.aggregate(avg=Avg("understanding_rating"))["avg"]

            bands = {b: 0 for b in ALL_BANDS}
            for fb in fb_qs.only("understanding_rating"):
                b = RATING_TO_BAND.get(fb.understanding_rating)
                if b:
                    bands[b] += 1

            if avg_v is not None:
                avg_r = round(float(avg_v), 2)
                avg_p = round(avg_r * 20.0, 1)
            else:
                avg_r = None
                avg_p = None

            needs_help_count = fb_qs.filter(needs_help=True).count()

            topic_items.append({
                "topic_id": top.id,
                "topic_title": top.title,
                "subject_name": top.subject.name,
                "course_name": top.subject.course.name,
                "total_sessions": top_sessions.count(),
                "total_feedbacks": fb_count,
                "average_rating": avg_r,
                "average_percentage": avg_p,
                "needs_help_count": needs_help_count,
                "band_distribution": bands,
            })

        return {
            "total_topics": len(topic_items),
            "topics": topic_items,
        }

    # =========================================================================
    # 7. Teacher-Wise Performance Report
    # =========================================================================
    @classmethod
    def get_teacher_wise_report(cls, user: User, filters: Dict[str, Any]) -> Dict[str, Any]:
        # Teacher is FORBIDDEN from cross-teacher evaluation report
        batches_qs = cls._scope_batches(user, filters, allow_teacher=False, allow_observer=True)
        today = cls._get_dhaka_today()

        date_from = filters.get("date_from")
        date_to = filters.get("date_to")

        teachers_qs = (
            User.objects.filter(
                role=UserRole.TEACHER,
                teacher_assignments__batch__in=batches_qs,
            )
            .distinct()
            .order_by("full_name")
        )

        teacher_filter = filters.get("teacher")
        if teacher_filter:
            teachers_qs = teachers_qs.filter(
                Q(id=teacher_filter) | Q(login_id=teacher_filter)
            )

        teacher_items: List[Dict[str, Any]] = []
        for t in teachers_qs:
            t_sessions = ClassSession.objects.filter(
                teacher_user=t,
                batch__in=batches_qs,
                status=SessionStatus.PUBLISHED,
            )
            if date_from:
                t_sessions = t_sessions.filter(session_date__gte=date_from)
            if date_to:
                t_sessions = t_sessions.filter(session_date__lte=date_to)

            s_ids = list(t_sessions.values_list("id", flat=True))
            classes_conducted = t_sessions.filter(session_date__lte=today).count()

            att = AttendanceRecord.objects.filter(session_id__in=s_ids).aggregate(
                total=Count("id"),
                present=Count("id", filter=Q(status=AttendanceStatus.PRESENT)),
                late=Count("id", filter=Q(status=AttendanceStatus.LATE)),
                leave=Count("id", filter=Q(status=AttendanceStatus.APPROVED_LEAVE)),
            )
            pct = calculate_attendance_percentage(
                present_count=att["present"],
                late_count=att["late"],
                total_count=att["total"],
                approved_leave_count=att["leave"],
            )

            fb = LearningFeedback.objects.filter(session_id__in=s_ids)
            avg_v = fb.aggregate(avg=Avg("understanding_rating"))["avg"]
            if avg_v is not None:
                t_avg_r = round(float(avg_v), 2)
                t_avg_p = round(t_avg_r * 20.0, 1)
            else:
                t_avg_r = None
                t_avg_p = None

            hrs = HelpRequest.objects.filter(session_id__in=s_ids)
            total_hr = hrs.count()
            resolved_hr = hrs.filter(status=HelpRequestStatus.RESOLVED).count()
            pending_hr = hrs.filter(status=HelpRequestStatus.PENDING).count()

            assigned_batches_count = (
                TeacherAssignment.objects.filter(
                    teacher_user=t, batch__in=batches_qs
                )
                .values("batch_id")
                .distinct()
                .count()
            )

            teacher_items.append({
                "teacher_id": str(t.id),
                "teacher_name": t.full_name,
                "login_id": t.login_id,
                "phone": t.phone or "",
                "email": t.email or "",
                "assigned_batches_count": assigned_batches_count,
                "classes_conducted": classes_conducted,
                "attendance_percentage_in_classes": pct,
                "average_feedback_rating": t_avg_r,
                "average_feedback_percentage": t_avg_p,
                "help_requests_received": total_hr,
                "help_requests_resolved": resolved_hr,
                "help_requests_pending": pending_hr,
            })

        return {
            "total_teachers": len(teacher_items),
            "teachers": teacher_items,
        }

    # =========================================================================
    # 8. Student Help Requests Report (Individual)
    # =========================================================================
    @classmethod
    def get_student_help_requests_report(
        cls, user: User, filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        # Observer is strictly FORBIDDEN from individual reports
        batches_qs = cls._scope_batches(user, filters, allow_teacher=True, allow_observer=False)

        hr_qs = HelpRequest.objects.filter(
            session__batch__in=batches_qs
        ).select_related(
            "student",
            "student__user",
            "teacher_user",
            "session",
            "session__batch",
            "topic",
            "resolved_by",
        ).order_by("-created_at")

        if user.role == UserRole.TEACHER:
            hr_qs = hr_qs.filter(teacher_user=user)

        status_filter = filters.get("status")
        if status_filter:
            hr_qs = hr_qs.filter(status=status_filter)

        teacher_filter = filters.get("teacher")
        if teacher_filter:
            hr_qs = hr_qs.filter(teacher_user_id=teacher_filter)

        topic_filter = filters.get("topic")
        if topic_filter:
            try:
                hr_qs = hr_qs.filter(topic_id=int(topic_filter))
            except (ValueError, TypeError):
                pass

        date_from = filters.get("date_from")
        if date_from:
            hr_qs = hr_qs.filter(created_at__date__gte=date_from)

        date_to = filters.get("date_to")
        if date_to:
            hr_qs = hr_qs.filter(created_at__date__lte=date_to)

        total_count = hr_qs.count()
        pending_count = hr_qs.filter(status=HelpRequestStatus.PENDING).count()
        in_progress_count = hr_qs.filter(status=HelpRequestStatus.IN_PROGRESS).count()
        resolved_count = hr_qs.filter(status=HelpRequestStatus.RESOLVED).count()

        hr_items: List[Dict[str, Any]] = []
        for hr in hr_qs:
            hr_items.append({
                "id": hr.id,
                "status": hr.status,
                "created_at": hr.created_at.strftime("%Y-%m-%d %H:%M"),
                "student_id": hr.student.id,
                "student_id_number": hr.student.student_id_number,
                "student_name": hr.student.user.full_name,
                "phone": hr.student.user.phone or "",
                "batch_name": hr.session.batch.name,
                "teacher_name": hr.teacher_user.full_name,
                "session_id": hr.session.id,
                "session_date": hr.session.session_date.isoformat(),
                "topic_title": hr.topic.title,
                "student_message": hr.student_message or "",
                "teacher_note": hr.teacher_note or "",
                "resolved_at": hr.resolved_at.strftime("%Y-%m-%d %H:%M") if hr.resolved_at else None,
                "resolved_by": hr.resolved_by.full_name if hr.resolved_by else None,
            })

        return {
            "total_help_requests": total_count,
            "pending_count": pending_count,
            "in_progress_count": in_progress_count,
            "resolved_count": resolved_count,
            "help_requests": hr_items,
        }

    # =========================================================================
    # 9. Repeated Absences Report (Individual)
    # =========================================================================
    @classmethod
    def get_repeated_absences_report(
        cls, user: User, filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        # Observer is strictly FORBIDDEN from individual reports
        batches_qs = cls._scope_batches(user, filters, allow_teacher=True, allow_observer=False)

        try:
            consecutive_threshold = int(
                filters.get("threshold_consecutive", get_repeated_absence_consecutive())
            )
        except (ValueError, TypeError):
            consecutive_threshold = get_repeated_absence_consecutive()

        try:
            total_threshold = int(
                filters.get("threshold_total", get_repeated_absence_total())
            )
        except (ValueError, TypeError):
            total_threshold = get_repeated_absence_total()

        enrolled_students = (
            Student.objects.filter(
                enrollments__batch__in=batches_qs,
                enrollments__status=EnrollmentStatus.ACTIVE,
                status=StudentStatus.ACTIVE,
            )
            .select_related("user")
            .prefetch_related("enrollments__batch")
            .distinct()
            .order_by("student_id_number")
        )

        flagged_list: List[Dict[str, Any]] = []

        for st in enrolled_students:
            st_records = (
                AttendanceRecord.objects.filter(
                    student=st,
                    session__batch__in=batches_qs,
                    session__status=SessionStatus.PUBLISHED,
                )
                .select_related("session")
                .order_by("session__session_date", "session__start_time")
            )

            total_sessions = st_records.count()
            total_absences = st_records.filter(status=AttendanceStatus.ABSENT).count()

            consecutive_absences = 0
            last_absent_date = None
            for rec in reversed(list(st_records)):
                if rec.status == AttendanceStatus.ABSENT:
                    consecutive_absences += 1
                    if last_absent_date is None:
                        last_absent_date = rec.session.session_date
                else:
                    break

            is_flagged = (
                consecutive_absences >= consecutive_threshold
                or total_absences >= total_threshold
            )

            if is_flagged:
                reasons = []
                if consecutive_absences >= consecutive_threshold:
                    reasons.append(
                        f"Consecutive absences ({consecutive_absences}) reached or exceeded threshold of {consecutive_threshold}."
                    )
                if total_absences >= total_threshold:
                    reasons.append(
                        f"Total absences ({total_absences}) reached or exceeded threshold of {total_threshold}."
                    )

                active_enrollment = st.enrollments.filter(
                    batch__in=batches_qs, status=EnrollmentStatus.ACTIVE
                ).first()
                batch_name = active_enrollment.batch.name if active_enrollment else ""

                pct = calculate_attendance_percentage(
                    present_count=st_records.filter(status=AttendanceStatus.PRESENT).count(),
                    late_count=st_records.filter(status=AttendanceStatus.LATE).count(),
                    total_count=total_sessions,
                    approved_leave_count=st_records.filter(status=AttendanceStatus.APPROVED_LEAVE).count(),
                )

                flagged_list.append({
                    "student_id": st.id,
                    "student_id_number": st.student_id_number,
                    "registration_no": st.registration_no,
                    "student_name": st.user.full_name,
                    "phone": st.user.phone or "",
                    "batch_name": batch_name,
                    "consecutive_absences": consecutive_absences,
                    "total_absences": total_absences,
                    "total_sessions": total_sessions,
                    "attendance_percentage": pct,
                    "last_absent_date": last_absent_date.isoformat() if last_absent_date else None,
                    "flagged_reasons": reasons,
                })

        return {
            "threshold_consecutive": consecutive_threshold,
            "threshold_total": total_threshold,
            "total_flagged_students": len(flagged_list),
            "flagged_students": flagged_list,
        }
