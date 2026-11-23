import datetime
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner, b62_decode
from django.utils import timezone

from .constants import get_qr_token_validity_seconds


class TokenExpiredError(Exception):
    """Raised when rotating QR token has exceeded maximum validity."""
    pass


class InvalidTokenError(Exception):
    """Raised when rotating QR token signature is tampered or invalid."""
    pass


class QRCodeService:
    """
    Cryptographic rotating QR token generator and validator.
    Uses Django TimestampSigner to bind session_id and cryptographic timestamp.
    """

    SALT = "assdi.attendance.qr"

    @classmethod
    def get_signer(cls) -> TimestampSigner:
        return TimestampSigner(salt=cls.SALT)

    @classmethod
    def generate_token(cls, session_id: int) -> dict:
        """
        Signs session_id with current timestamp.
        Returns token, validity duration in seconds, and expiration timestamp.
        """
        signer = cls.get_signer()
        validity_seconds = get_qr_token_validity_seconds()
        now = timezone.now()
        token = signer.sign(str(session_id))
        valid_until = now + datetime.timedelta(seconds=validity_seconds)

        return {
            "qr_token": token,
            "session_id": session_id,
            "expires_in_seconds": validity_seconds,
            "valid_until": valid_until.isoformat(),
        }

    @classmethod
    def verify_token(cls, token: str) -> int:
        """
        Validates signed token against dynamic QR_TOKEN_VALIDITY_SECONDS.
        Returns verified integer session_id or raises TokenExpiredError / InvalidTokenError.
        """
        signer = cls.get_signer()
        validity_seconds = get_qr_token_validity_seconds()

        try:
            raw_value = signer.unsign(token, max_age=validity_seconds)
            return int(raw_value)
        except SignatureExpired as e:
            raise TokenExpiredError("QR token has expired. Please ask the teacher for a fresh QR code.") from e
        except (BadSignature, ValueError) as e:
            raise InvalidTokenError("Invalid or tampered QR code.") from e

    @classmethod
    def verify_offline_sync_token(cls, token: str) -> tuple[int, datetime.datetime]:
        """
        Validates cryptographically that the token was signed by the server.
        Extracts the integer session_id and the server creation timestamp.
        Allows offline queue sync while strictly rejecting any forged or tampered tokens.
        """
        signer = cls.get_signer()
        try:
            raw_value = signer.unsign(token)
            session_id = int(raw_value)
            parts = token.split(":")
            if len(parts) >= 3:
                ts_int = b62_decode(parts[1])
                token_dt = datetime.datetime.fromtimestamp(ts_int, tz=datetime.timezone.utc)
            else:
                token_dt = timezone.now()
            return session_id, token_dt
        except (BadSignature, ValueError, IndexError) as e:
            raise InvalidTokenError("Invalid or tampered QR code.") from e


def check_and_create_consecutive_absence_alert(student_id: int, session=None) -> list:
    """
    Checks if a student has accumulated consecutive unexcused absences >= REPEATED_ABSENCE_CONSECUTIVE (default: 3).
    When the threshold is reached or exceeded:
    Automatically creates in-app ATTENDANCE_ALERT notifications for:
    - All active super_admin users
    - Active coordinator users assigned to the course of the student's batch
    
    Idempotent:
    Avoids sending duplicate notifications for the same student on the same trigger session.
    """
    from apps.accounts.models import User, UserRole
    from apps.attendance.constants import get_repeated_absence_consecutive
    from apps.attendance.models import AttendanceRecord, AttendanceStatus
    from apps.audit.models import AuditLog
    from apps.class_sessions.models import SessionStatus
    from apps.notifications.models import Notification, NotificationType
    from apps.notifications.services import create_notification
    from apps.students.models import EnrollmentStatus, Student

    try:
        student = Student.objects.select_related("user", "campus").get(pk=student_id)
    except Student.DoesNotExist:
        return []

    threshold = get_repeated_absence_consecutive()

    # Query attendance records ordered by session schedule
    records = AttendanceRecord.objects.filter(
        student_id=student_id,
        session__status=SessionStatus.PUBLISHED,
    ).select_related("session", "session__batch", "session__batch__course").order_by(
        "session__session_date", "session__start_time"
    )

    consecutive_count = 0
    trigger_session = None
    batch = None

    for rec in reversed(list(records)):
        if rec.status == AttendanceStatus.ABSENT:
            consecutive_count += 1
            if trigger_session is None:
                trigger_session = rec.session
                batch = rec.session.batch
        elif rec.status == AttendanceStatus.APPROVED_LEAVE:
            # Approved leave breaks consecutive unexcused absence streak
            break
        else:
            break

    if consecutive_count < threshold:
        return []

    # If batch wasn't determined from records, find from active enrollment or session
    if not batch:
        if session and getattr(session, "batch", None):
            batch = session.batch
        else:
            enrollment = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).select_related("batch", "batch__course").first()
            if enrollment:
                batch = enrollment.batch

    trigger_session_id = trigger_session.id if trigger_session else (session.id if session else None)

    # Idempotency check: don't alert twice for the same student on the same trigger session
    if trigger_session_id:
        existing_alert = Notification.objects.filter(
            notification_type=NotificationType.ATTENDANCE_ALERT,
            data_payload__student_id=student.id,
            data_payload__session_id=trigger_session_id,
        ).exists()
        if existing_alert:
            return []

    # Determine recipient administrators
    super_admins = set(User.objects.filter(role=UserRole.SUPER_ADMIN, is_active=True))
    coordinators = set()
    if batch and getattr(batch, "course_id", None):
        coordinators = set(
            User.objects.filter(
                role=UserRole.COORDINATOR,
                coordinator_course_assignments__course_id=batch.course_id,
                is_active=True,
            )
        )
    else:
        coordinators = set(User.objects.filter(role=UserRole.COORDINATOR, is_active=True))

    recipients = super_admins | coordinators
    if not recipients:
        return []

    student_name = student.user.full_name or student.user.login_id
    batch_name = batch.name if batch else "কোর্স"
    title = f"⚠️ টানা {consecutive_count} দিন অনুপস্থিতির সতর্কবার্তা: {student_name} ({student.student_id_number})"
    body = (
        f"শিক্ষার্থী {student_name} ({student.student_id_number}) {batch_name} ব্যাচে টানা "
        f"{consecutive_count}টি ক্লাসে অনুপস্থিত রয়েছেন। অবিলম্বে শিক্ষার্থীর সাথে যোগাযোগ ও অ্যাকাডেমিক ফলো-আপ নিশ্চিত করুন।"
    )
    payload = {
        "student_id": student.id,
        "student_id_number": student.student_id_number,
        "student_name": student_name,
        "batch_id": batch.id if batch else None,
        "batch_name": batch_name,
        "session_id": trigger_session_id,
        "consecutive_absences": consecutive_count,
        "action_url": "/coordinator/at-risk",
    }

    created_notifs = []
    for user in recipients:
        notif = create_notification(
            recipient=user,
            title=title,
            body=body,
            notification_type=NotificationType.ATTENDANCE_ALERT,
            data_payload=payload,
        )
        if notif:
            created_notifs.append(notif)

    # Record AuditLog entry
    AuditLog.objects.create(
        actor_user=None,
        action="ATTENDANCE_CONSECUTIVE_ALERT",
        entity_name="Student",
        entity_id=str(student.id),
        new_values={
            "student_id_number": student.student_id_number,
            "consecutive_absences": consecutive_count,
            "notified_users_count": len(created_notifs),
            "trigger_session_id": trigger_session_id,
        },
    )

    return created_notifs

