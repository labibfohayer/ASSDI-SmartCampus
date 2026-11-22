from rest_framework import serializers

from .models import AttendanceMethod, AttendanceRecord, AttendanceStatus


class QRTokenResponseSerializer(serializers.Serializer):
    qr_token = serializers.CharField()
    session_id = serializers.IntegerField()
    expires_in_seconds = serializers.IntegerField()
    valid_until = serializers.CharField()


class QRScanRequestSerializer(serializers.Serializer):
    qr_token = serializers.CharField(
        required=True,
        allow_blank=False,
        help_text="Signed cryptographic rotating QR token displayed by teacher.",
    )


class AttendanceRecordSerializer(serializers.ModelSerializer):
    session_date = serializers.DateField(source="session.session_date", read_only=True)
    subject_name = serializers.CharField(source="session.subject.name", read_only=True)
    student_id_number = serializers.CharField(source="student.student_id_number", read_only=True)
    student_name = serializers.CharField(source="student.user.full_name", read_only=True)
    marked_by_name = serializers.CharField(source="marked_by.full_name", read_only=True, allow_null=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            "id",
            "session",
            "session_date",
            "subject_name",
            "student",
            "student_id_number",
            "student_name",
            "status",
            "method",
            "marked_at",
            "marked_by",
            "marked_by_name",
            "reason",
            "updated_at",
        ]
        read_only_fields = fields


class ManualAttendanceItemSerializer(serializers.Serializer):
    student_id = serializers.IntegerField(
        required=True,
        help_text="Primary key of Student profile.",
    )
    status = serializers.ChoiceField(
        choices=AttendanceStatus.choices,
        required=True,
    )
    reason = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=500,
        help_text="Mandatory justification for marking or correcting attendance manually.",
    )

    def validate_reason(self, value):
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Reason must be a non-empty string explaining the manual update.")
        return stripped


class ManualAttendanceBulkSerializer(serializers.Serializer):
    items = serializers.ListField(
        child=ManualAttendanceItemSerializer(),
        allow_empty=True,
        required=False,
        default=list,
        help_text="List of attendance records to create or correct manually.",
    )
    updates = serializers.ListField(
        child=ManualAttendanceItemSerializer(),
        allow_empty=True,
        required=False,
        default=list,
        help_text="Alias for items.",
    )

    def validate(self, attrs):
        items = attrs.get("items") or attrs.get("updates") or []
        if not items:
            raise serializers.ValidationError("At least one attendance record update is required.")
        attrs["items"] = items
        return attrs


class SessionAttendanceSummarySerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    session_date = serializers.DateField()
    subject_name = serializers.CharField()
    total_expected = serializers.IntegerField(help_text="Active enrolled students matching session audience.")
    present = serializers.IntegerField()
    late = serializers.IntegerField()
    absent = serializers.IntegerField()
    approved_leave = serializers.IntegerField()
    attendance_percentage = serializers.FloatField(allow_null=True)


class StudentAttendanceSummarySerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    student_id_number = serializers.CharField()
    student_name = serializers.CharField()
    total_sessions = serializers.IntegerField()
    present = serializers.IntegerField()
    late = serializers.IntegerField()
    absent = serializers.IntegerField()
    approved_leave = serializers.IntegerField()
    attendance_percentage = serializers.FloatField(allow_null=True)


class BatchAttendanceSummarySerializer(serializers.Serializer):
    batch_id = serializers.IntegerField()
    batch_name = serializers.CharField()
    total_published_sessions = serializers.IntegerField()
    total_expected_records = serializers.IntegerField()
    present = serializers.IntegerField()
    late = serializers.IntegerField()
    absent = serializers.IntegerField()
    approved_leave = serializers.IntegerField()
    attendance_percentage = serializers.FloatField(allow_null=True)


class RepeatedAbsenceStudentSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    student_id_number = serializers.CharField()
    student_name = serializers.CharField()
    consecutive_absences = serializers.IntegerField()
    total_absences = serializers.IntegerField()
    flagged_reasons = serializers.ListField(child=serializers.CharField())
