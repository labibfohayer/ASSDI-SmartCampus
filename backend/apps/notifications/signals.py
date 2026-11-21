from django.dispatch import receiver
from apps.feedback.signals import help_request_created, help_request_status_changed
from apps.notifications.models import Notification, NotificationType
from apps.notifications.services import create_notification


@receiver(help_request_created)
def on_help_request_created(sender, help_request, created_by_user, **kwargs):
    """
    Notifies the assigned teacher immediately when a student submits feedback with needs_help=True.
    """
    teacher = help_request.teacher_user
    if not teacher or not teacher.is_active:
        return

    student = getattr(help_request.feedback, "student", None)
    if student and hasattr(student, "user") and student.user:
        student_name = student.user.full_name or student.user.login_id
        student_id = student.student_id_number
    else:
        student_name = created_by_user.full_name or created_by_user.login_id
        student_id = created_by_user.login_id
    topic_name = help_request.topic.title if help_request.topic else "আলোচ্য টপিক"

    msg_preview = help_request.student_message or "বিষয়টি বুঝতে কিছুটা সমস্যা হচ্ছে, সহায়তা প্রয়োজন।"
    if len(msg_preview) > 100:
        msg_preview = msg_preview[:100] + "..."

    create_notification(
        recipient=teacher,
        title=f"নতুন হেল্প রিকোয়েস্ট: {topic_name}",
        body=f"শিক্ষার্থী {student_name} ({student_id}) হেল্প চেয়েছেন: \"{msg_preview}\"",
        notification_type=NotificationType.HELP_REQUEST,
        data_payload={
            "help_request_id": help_request.id,
            "session_id": help_request.session_id,
            "topic_id": help_request.topic_id,
            "student_id": student_id,
        },
    )


@receiver(help_request_status_changed)
def on_help_request_status_changed(sender, help_request, old_status, new_status, by_user, **kwargs):
    """
    Notifies the student when their assigned teacher updates or resolves their help request.
    """
    feedback = getattr(help_request, "feedback", None)
    if not feedback:
        return

    student = getattr(feedback, "student", None)
    if not student or not student.user or not student.user.is_active:
        return

    topic_name = help_request.topic.title if help_request.topic else "টপিক"
    teacher_name = by_user.full_name if by_user else (help_request.teacher_user.full_name or "শিক্ষক")

    status_lower = str(new_status).lower()

    if status_lower == "resolved":
        note = help_request.teacher_note or "আপনার রিকোয়েস্টটি শিক্ষক সমাধান করেছেন।"
        if len(note) > 120:
            note = note[:120] + "..."

        create_notification(
            recipient=student.user,
            title=f"হেল্প রিকোয়েস্ট সমাধান: {topic_name}",
            body=f"{teacher_name} লিখেছেন: \"{note}\"",
            notification_type=NotificationType.HELP_REPLY,
            data_payload={
                "help_request_id": help_request.id,
                "session_id": help_request.session_id,
                "status": "resolved",
            },
        )
    elif status_lower == "in_progress":
        create_notification(
            recipient=student.user,
            title=f"হেল্প রিকোয়েস্ট পর্যালোচনাধীন: {topic_name}",
            body=f"শিক্ষক {teacher_name} আপনার সমস্যাটি পর্যবেক্ষণ করছেন। শীঘ্রই উত্তর দেওয়া হবে।",
            notification_type=NotificationType.HELP_REPLY,
            data_payload={
                "help_request_id": help_request.id,
                "session_id": help_request.session_id,
                "status": "in_progress",
            },
        )
