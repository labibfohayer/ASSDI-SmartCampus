from django.contrib.auth import get_user_model
from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from apps.accounts.models import UserRole
from apps.batches.models import Batch
from .models import Enrollment, EnrollmentStatus, Student, StudentStatus

User = get_user_model()


class EnrollmentSerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source="batch.name", read_only=True)
    batch_number = serializers.IntegerField(source="batch.batch_number", read_only=True)
    student_id_number = serializers.CharField(
        source="student.student_id_number", read_only=True
    )

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "student",
            "student_id_number",
            "batch",
            "batch_name",
            "batch_number",
            "enrolled_at",
            "status",
        ]


class StudentSerializer(serializers.ModelSerializer):
    """Full student serializer for Admin, Coordinator, Teacher and Student self-view."""

    full_name = serializers.CharField(source="user.full_name")
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    campus_name = serializers.CharField(source="campus.name", read_only=True)
    current_batch_id = serializers.SerializerMethodField()
    current_batch_name = serializers.SerializerMethodField()
    enrollment_history = EnrollmentSerializer(
        source="enrollments", many=True, read_only=True
    )

    class Meta:
        model = Student
        fields = [
            "id",
            "user",
            "student_id_number",
            "registration_no",
            "full_name",
            "email",
            "phone",
            "guardian_phone",
            "education_background",
            "campus",
            "campus_name",
            "status",
            "current_batch_id",
            "current_batch_name",
            "enrollment_history",
            "created_at",
        ]
        read_only_fields = ["id", "user", "student_id_number", "created_at"]

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_current_batch_id(self, obj):
        batch = obj.current_batch
        return batch.id if batch else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_current_batch_name(self, obj):
        batch = obj.current_batch
        return batch.name if batch else None

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if "full_name" in user_data:
            instance.user.full_name = user_data["full_name"]
            instance.user.save(update_fields=["full_name"])

        return super().update(instance, validated_data)


class ObserverStudentSerializer(serializers.ModelSerializer):
    """
    Privacy-restricted serializer for Observer role:
    Excludes ALL sensitive contact information (guardian_phone, phone, email, address).
    Displays only names, IDs, background, campus name and batch assignment.
    """

    full_name = serializers.CharField(source="user.full_name", read_only=True)
    campus_name = serializers.CharField(source="campus.name", read_only=True)
    current_batch_id = serializers.SerializerMethodField()
    current_batch_name = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            "id",
            "student_id_number",
            "registration_no",
            "full_name",
            "education_background",
            "campus_name",
            "status",
            "current_batch_id",
            "current_batch_name",
        ]

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_current_batch_id(self, obj):
        batch = obj.current_batch
        return batch.id if batch else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_current_batch_name(self, obj):
        batch = obj.current_batch
        return batch.name if batch else None


class StudentCreateSerializer(serializers.Serializer):
    """
    Creates User and Student profile atomically.
    Ensures User.login_id == Student.student_id_number.
    Enforces student.campus == batch.campus consistency.
    """

    student_id_number = serializers.CharField(max_length=50, required=True)
    registration_no = serializers.CharField(max_length=50, required=True)
    full_name = serializers.CharField(max_length=150, required=True)
    password = serializers.CharField(
        max_length=128, required=False, default="StudentPass2026!"
    )
    education_background = serializers.ChoiceField(
        choices=["General", "Aliya", "Qawmi"], default="General"
    )
    campus_id = serializers.IntegerField(required=True)
    guardian_phone = serializers.CharField(max_length=32, required=False, default="")
    phone = serializers.CharField(max_length=32, required=False, default="")
    email = serializers.EmailField(required=False, default=None, allow_null=True)
    batch_id = serializers.IntegerField(required=False, default=None, allow_null=True)

    def validate(self, attrs):
        student_id_number = attrs["student_id_number"].strip()
        registration_no = attrs["registration_no"].strip()

        # Check uniqueness
        if User.objects.filter(login_id__iexact=student_id_number).exists():
            raise ValidationError(
                {"student_id_number": "A user with this login/student ID already exists."}
            )

        if Student.objects.filter(student_id_number__iexact=student_id_number).exists():
            raise ValidationError(
                {"student_id_number": "A student with this student ID already exists."}
            )

        if Student.objects.filter(registration_no__iexact=registration_no).exists():
            raise ValidationError(
                {"registration_no": "A student with this registration number already exists."}
            )

        # Campus consistency validation
        batch_id = attrs.get("batch_id")
        campus_id = attrs.get("campus_id")
        if batch_id:
            try:
                batch = Batch.objects.get(id=batch_id)
            except Batch.DoesNotExist:
                raise ValidationError({"batch_id": "Specified batch does not exist."})

            if batch.campus_id != campus_id:
                raise ValidationError(
                    {
                        "campus_id": f"Student campus (ID {campus_id}) does not match the campus of batch '{batch.name}' (Campus ID {batch.campus_id})."
                    }
                )

        return attrs

    def create(self, validated_data):
        student_id_number = validated_data["student_id_number"].strip()
        full_name = validated_data["full_name"].strip()
        password = validated_data.get("password", "StudentPass2026!")
        email = validated_data.get("email")
        phone = validated_data.get("phone", "")
        campus_id = validated_data["campus_id"]
        registration_no = validated_data["registration_no"].strip()
        education_background = validated_data.get("education_background", "General")
        guardian_phone = validated_data.get("guardian_phone", "")
        batch_id = validated_data.get("batch_id")

        with transaction.atomic():
            # 1. Create User with login_id = student_id_number
            user = User.objects.create_user(
                login_id=student_id_number,
                password=password,
                full_name=full_name,
                role=UserRole.STUDENT,
                email=email,
                phone=phone,
            )

            # 2. Create Student profile
            student = Student.objects.create(
                user=user,
                student_id_number=student_id_number,
                registration_no=registration_no,
                education_background=education_background,
                campus_id=campus_id,
                guardian_phone=guardian_phone,
                status=StudentStatus.ACTIVE,
            )

            # 3. Create initial active enrollment if batch provided
            if batch_id:
                Enrollment.objects.create(
                    student=student,
                    batch_id=batch_id,
                    status=EnrollmentStatus.ACTIVE,
                )

        return student


class StudentTransferSerializer(serializers.Serializer):
    """
    Transfers student to a new batch while maintaining enrollment history.
    Validates campus consistency between student and new batch.
    """

    new_batch_id = serializers.IntegerField(required=True)
    reason = serializers.CharField(required=False, default="Administrative batch transfer")

    def validate_new_batch_id(self, value):
        try:
            batch = Batch.objects.get(pk=value)
        except Batch.DoesNotExist:
            raise ValidationError("Target batch does not exist.")
        return value
