from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.attendance.models import AttendanceRecord, AttendanceStatus
from apps.attendance.services import check_and_create_consecutive_absence_alert


@receiver(post_save, sender=AttendanceRecord)
def on_attendance_record_saved(sender, instance, created, **kwargs):
    """
    Automatically triggers consecutive absence checking whenever an absent record is saved.
    """
    if instance.status == AttendanceStatus.ABSENT:
        check_and_create_consecutive_absence_alert(instance.student_id, instance.session)
