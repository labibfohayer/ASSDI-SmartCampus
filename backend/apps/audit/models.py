from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """
    Immutable audit log recording sensitive operations:
    attendance corrections, role/permission changes, student batch transfers, deactivations.
    """

    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_actions",
    )
    action = models.CharField(max_length=100, db_index=True)
    entity_name = models.CharField(max_length=100, db_index=True)
    entity_id = models.CharField(max_length=100, db_index=True)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "audit_logs"
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        ordering = ["-created_at"]

    def __str__(self):
        actor = self.actor_user.login_id if self.actor_user else "System"
        return f"[{self.created_at:%Y-%m-%d %H:%M:%S}] {actor} -> {self.action} on {self.entity_name} ({self.entity_id})"
