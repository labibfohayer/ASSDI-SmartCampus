from django.conf import settings
from django.db import models


class CampusGender(models.TextChoices):
    MALE = "male", "Male Campus"
    FEMALE = "female", "Female Campus"


class SubjectAudience(models.TextChoices):
    ALL = "all", "All Students"
    GENERAL = "general", "General Students Only"
    MADRASA = "madrasa", "Madrasa Students Only"


class Campus(models.Model):
    """Represents physical campus facilities."""

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True, db_index=True)
    gender_campus = models.CharField(
        max_length=10,
        choices=CampusGender.choices,
        default=CampusGender.MALE,
    )
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "campuses"
        verbose_name = "Campus"
        verbose_name_plural = "Campuses"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Course(models.Model):
    """
    Curriculum course. Designed for zero-schema-change multi-course expansion.
    """

    name = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True, db_index=True)
    description = models.TextField(blank=True)
    duration_months = models.PositiveIntegerField(default=3)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "courses"
        verbose_name = "Course"
        verbose_name_plural = "Courses"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class CoordinatorCourseAssignment(models.Model):
    """
    Maps coordinators to courses to enforce strict course-scoped access.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="coordinator_course_assignments",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="coordinator_assignments",
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "coordinator_course_assignments"
        verbose_name = "Coordinator Course Assignment"
        verbose_name_plural = "Coordinator Course Assignments"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "course"],
                name="unique_coordinator_course",
            )
        ]

    def __str__(self):
        return f"{self.user.login_id} -> {self.course.code}"


class Department(models.Model):
    """Departments within a course (e.g. Business Operations, Creative)."""

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="departments",
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "departments"
        verbose_name = "Department"
        verbose_name_plural = "Departments"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} [{self.course.code}]"


class Subject(models.Model):
    """Subjects taught within a department or common to the course."""

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="subjects",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subjects",
        help_text="Null for common subjects (e.g. English, Islamic Basics).",
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30)
    audience_type = models.CharField(
        max_length=20,
        choices=SubjectAudience.choices,
        default=SubjectAudience.ALL,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "subjects"
        verbose_name = "Subject"
        verbose_name_plural = "Subjects"
        ordering = ["name"]

    def __str__(self):
        dept_str = f" ({self.department.code})" if self.department else " (Common)"
        return f"{self.name}{dept_str} - {self.course.code}"


class ClassTopic(models.Model):
    """
    Curriculum-level topics tied to a Subject.
    Decoupled from a specific batch so topic understanding can be compared across batches.
    """

    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="topics",
    )
    created_by_teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_topics",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    learning_objectives = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "class_topics"
        verbose_name = "Class Topic"
        verbose_name_plural = "Class Topics"
        ordering = ["subject", "created_at"]

    def __str__(self):
        return f"{self.title} [{self.subject.name}]"
