from django.contrib.auth import get_user_model
from apps.notifications.models import (
    Notification,
    NotificationType,
    Announcement,
    AnnouncementScope,
)
from apps.students.models import Enrollment, EnrollmentStatus

User = get_user_model()


def create_notification(recipient, title, body, notification_type=NotificationType.SYSTEM, data_payload=None):
    """Creates a single in-app notification for a user."""
    if not recipient or not recipient.is_active:
        return None
    return Notification.objects.create(
        recipient=recipient,
        title=title,
        body=body,
        notification_type=notification_type,
        data_payload=data_payload or {},
    )


def broadcast_announcement(announcement: Announcement):
    """
    Fans out in-app notifications to eligible users based on the announcement's scope.
    Uses bulk_create for performance.
    """
    recipient_user_ids = set()

    if announcement.scope == AnnouncementScope.GLOBAL:
        # All active students, teachers, and coordinators
        recipient_user_ids = set(
            User.objects.filter(
                is_active=True,
                role__in=["student", "teacher", "coordinator", "super_admin"],
            )
            .exclude(id=announcement.author_id)
            .values_list("id", flat=True)
        )

    elif announcement.scope == AnnouncementScope.COURSE and announcement.target_course_id:
        course_id = announcement.target_course_id

        # Active students enrolled in batches of this course
        student_user_ids = set(
            Enrollment.objects.filter(
                batch__course_id=course_id,
                status=EnrollmentStatus.ACTIVE,
            ).values_list("student__user_id", flat=True)
        )

        # Teachers assigned to batches of this course
        teacher_user_ids = set(
            User.objects.filter(
                teacher_assignments__batch__course_id=course_id,
                is_active=True,
            ).values_list("id", flat=True)
        )

        # Coordinators assigned to this course
        coordinator_user_ids = set(
            User.objects.filter(
                coordinator_course_assignments__course_id=course_id,
                is_active=True,
            ).values_list("id", flat=True)
        )

        recipient_user_ids = (student_user_ids | teacher_user_ids | coordinator_user_ids) - {announcement.author_id}

    elif announcement.scope == AnnouncementScope.BATCH and announcement.target_batch_id:
        batch_id = announcement.target_batch_id

        # Active students enrolled in this batch
        student_user_ids = set(
            Enrollment.objects.filter(
                batch_id=batch_id,
                status=EnrollmentStatus.ACTIVE,
            ).values_list("student__user_id", flat=True)
        )

        # Teachers assigned to this batch
        teacher_user_ids = set(
            User.objects.filter(
                teacher_assignments__batch_id=batch_id,
                is_active=True,
            ).values_list("id", flat=True)
        )

        recipient_user_ids = (student_user_ids | teacher_user_ids) - {announcement.author_id}

    if not recipient_user_ids:
        return 0

    notifications_to_create = [
        Notification(
            recipient_id=user_id,
            title=f"বিজ্ঞপ্তি: {announcement.title}",
            body=announcement.content[:200] + ("..." if len(announcement.content) > 200 else ""),
            notification_type=NotificationType.ANNOUNCEMENT,
            data_payload={
                "announcement_id": announcement.id,
                "scope": announcement.scope,
                "target_course_id": announcement.target_course_id,
                "target_batch_id": announcement.target_batch_id,
            },
        )
        for user_id in recipient_user_ids
    ]

    created = Notification.objects.bulk_create(notifications_to_create, batch_size=500)
    return len(created)
