import datetime
import zoneinfo
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import UserRole
from apps.class_sessions.models import ClassSession, SessionAudience, SessionStatus
from apps.students.models import EducationBackground, EnrollmentStatus, Student, StudentStatus

from .constants import (
    calculate_attendance_percentage,
    get_late_threshold_minutes,
    get_qr_window_minutes,
)
from .models import AttendanceMethod, AttendanceRecord, AttendanceStatus
from .serializers import AttendanceRecordSerializer, QRScanRequestSerializer
from .services import InvalidTokenError, QRCodeService, TokenExpiredError


class AttendanceViewSet(viewsets.GenericViewSet):
    """
    Handles student QR scan attendance submission and student's personal attendance history.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = AttendanceRecordSerializer

    @action(detail=False, methods=["post"], url_path="qr-scan")
    def qr_scan(self, request):
        """
        Student scans rotating signed QR token.
        Enforces token signature, window timing, active enrollment, and audience rules.
        """
        user = request.user
        if user.role != UserRole.STUDENT:
            raise PermissionDenied("Only enrolled students can scan attendance QR codes.")

        student = Student.objects.filter(user=user, status=StudentStatus.ACTIVE).first()
        if not student:
            raise PermissionDenied("Active student profile required.")

        serializer = QRScanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["qr_token"]
        is_offline_sync = serializer.validated_data.get("is_offline_sync", False)
        offline_scanned_at = serializer.validated_data.get("offline_scanned_at")

        # 1. Cryptographic Token Verification
        try:
            if is_offline_sync:
                session_id, token_dt = QRCodeService.verify_offline_sync_token(token)
            else:
                session_id = QRCodeService.verify_token(token)
                token_dt = timezone.now()
        except (TokenExpiredError, InvalidTokenError) as e:
            raise DRFValidationError({"qr_token": str(e)})

        # 2. Session Existence & Status
        try:
            session = ClassSession.objects.select_related("batch", "subject").get(pk=session_id)
        except ClassSession.DoesNotExist:
            raise DRFValidationError({"qr_token": "Session associated with QR token not found."})

        if session.status != SessionStatus.PUBLISHED:
            raise DRFValidationError({"session": "Cannot scan QR for a draft or cancelled session."})

        # 3. Active Enrollment Check
        is_enrolled = student.enrollments.filter(batch=session.batch, status=EnrollmentStatus.ACTIVE).exists()
        if not is_enrolled:
            raise PermissionDenied("You are not actively enrolled in the batch for this session.")

        # 4. Audience Rule Check
        if session.audience == SessionAudience.GENERAL:
            if student.education_background != EducationBackground.GENERAL:
                raise PermissionDenied("This session is restricted to general students.")
        elif session.audience == SessionAudience.MADRASA:
            if student.education_background not in [EducationBackground.ALIYA, EducationBackground.QAWMI]:
                raise PermissionDenied("This session is restricted to madrasa students.")

        # 5. Timing Window in Asia/Dhaka
        dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
        session_start_dt = datetime.datetime.combine(session.session_date, session.start_time, tzinfo=dhaka_tz)
        late_threshold_mins = get_late_threshold_minutes()
        qr_window_mins = get_qr_window_minutes()

        if is_offline_sync:
            effective_time = (offline_scanned_at or token_dt).astimezone(dhaka_tz)
            if effective_time.date() != session.session_date:
                raise DRFValidationError({"detail": "Offline QR token is not from today's session."})

            if effective_time < session_start_dt:
                raise DRFValidationError({"detail": "QR attendance scanning opens at class start time."})

            if effective_time <= session_start_dt + datetime.timedelta(minutes=late_threshold_mins):
                status_val = AttendanceStatus.PRESENT
            elif effective_time <= session_start_dt + datetime.timedelta(minutes=qr_window_mins):
                status_val = AttendanceStatus.LATE
            else:
                raise DRFValidationError({"detail": "QR attendance window had closed when token was generated."})

            marked_time = effective_time
            record_reason = "Offline QR sync"
        else:
            now_dhaka = timezone.now().astimezone(dhaka_tz)
            if now_dhaka < session_start_dt:
                raise DRFValidationError({"detail": "QR attendance scanning opens at class start time."})

            if now_dhaka <= session_start_dt + datetime.timedelta(minutes=late_threshold_mins):
                status_val = AttendanceStatus.PRESENT
            elif now_dhaka <= session_start_dt + datetime.timedelta(minutes=qr_window_mins):
                status_val = AttendanceStatus.LATE
            else:
                raise DRFValidationError({"detail": "QR attendance window has closed."})

            marked_time = timezone.now()
            record_reason = ""

        # 6. Duplicate Scan Protection (HTTP 409 Conflict)
        if AttendanceRecord.objects.filter(session=session, student=student).exists():
            return Response(
                {"code": "ALREADY_MARKED", "detail": "Attendance already marked for this class."},
                status=status.HTTP_409_CONFLICT,
            )

        # 7. Persist Record
        record = AttendanceRecord.objects.create(
            session=session,
            student=student,
            status=status_val,
            method=AttendanceMethod.QR,
            marked_at=marked_time,
            reason=record_reason,
        )

        return Response(AttendanceRecordSerializer(record).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request):
        """Returns the authenticated student's own attendance history and aggregate percentage."""
        user = request.user
        if user.role != UserRole.STUDENT:
            raise PermissionDenied("Only students have a personal attendance history.")

        student = getattr(user, "student_profile", None)
        if not student:
            raise PermissionDenied("No student profile found for authenticated user.")

        records = (
            AttendanceRecord.objects.filter(
                student=student,
                session__status=SessionStatus.PUBLISHED,
            )
            .select_related("session", "session__subject")
            .order_by("-session__session_date", "-session__start_time")
        )

        total_sessions = records.count()
        present = records.filter(status=AttendanceStatus.PRESENT).count()
        late = records.filter(status=AttendanceStatus.LATE).count()
        absent = records.filter(status=AttendanceStatus.ABSENT).count()
        approved_leave = records.filter(status=AttendanceStatus.APPROVED_LEAVE).count()
        pct = calculate_attendance_percentage(present, late, total_sessions, approved_leave)

        data = {
            "summary": {
                "total_sessions": total_sessions,
                "present": present,
                "late": late,
                "absent": absent,
                "approved_leave": approved_leave,
                "attendance_percentage": pct,
            },
            "records": AttendanceRecordSerializer(records, many=True).data,
        }
        return Response(data, status=status.HTTP_200_OK)
