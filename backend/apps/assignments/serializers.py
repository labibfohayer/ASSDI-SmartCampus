from rest_framework import serializers

from apps.accounts.models import UserRole
from apps.class_sessions.models import ClassSession
from .models import (
    Homework,
    HomeworkSubmission,
    MicroQuiz,
    QuizAttempt,
    QuizQuestion,
    SpeakingVideoStatus,
    SpeakingVideoSubmission,
)


class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = [
            "id",
            "question_text",
            "options",
            "correct_option",
            "explanation",
            "points",
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get("request")
        # Security Guardrail: Never leak correct_option or explanation to students before submission
        if request and request.user.is_authenticated and request.user.role == UserRole.STUDENT:
            has_attempt = QuizAttempt.objects.filter(
                quiz=instance.quiz,
                student__user=request.user,
            ).exists()
            if not has_attempt:
                ret.pop("correct_option", None)
                ret.pop("explanation", None)
        return ret


class MicroQuizSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, required=False)
    session_title = serializers.CharField(source="session.subject.name", read_only=True)
    batch_name = serializers.CharField(source="session.batch.name", read_only=True)
    topic_title = serializers.CharField(source="topic.title", read_only=True, default=None)
    has_attempted = serializers.SerializerMethodField()
    my_attempt = serializers.SerializerMethodField()

    class Meta:
        model = MicroQuiz
        fields = [
            "id",
            "session",
            "session_title",
            "batch_name",
            "topic",
            "topic_title",
            "title",
            "instructions",
            "is_active",
            "questions",
            "created_at",
            "has_attempted",
            "my_attempt",
        ]
        read_only_fields = ["created_at"]

    def get_has_attempted(self, obj) -> bool:
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.role == UserRole.STUDENT:
            return QuizAttempt.objects.filter(quiz=obj, student__user=request.user).exists()
        return False

    def get_my_attempt(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.role == UserRole.STUDENT:
            attempt = QuizAttempt.objects.filter(quiz=obj, student__user=request.user).first()
            if attempt:
                return {
                    "id": attempt.id,
                    "score": attempt.score,
                    "total_questions": attempt.total_questions,
                    "percentage": attempt.percentage,
                    "passed": attempt.passed,
                    "submitted_at": attempt.submitted_at,
                }
        return None

    def create(self, validated_data):
        questions_data = validated_data.pop("questions", [])
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user

        quiz = MicroQuiz.objects.create(**validated_data)
        for q_data in questions_data:
            QuizQuestion.objects.create(quiz=quiz, **q_data)
        return quiz

    def update(self, instance, validated_data):
        questions_data = validated_data.pop("questions", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if questions_data is not None:
            instance.questions.all().delete()
            for q_data in questions_data:
                QuizQuestion.objects.create(quiz=instance, **q_data)
        return instance


class QuizAttemptSerializer(serializers.ModelSerializer):
    percentage = serializers.ReadOnlyField()
    student_name = serializers.CharField(source="student.user.full_name", read_only=True)
    student_id_number = serializers.CharField(source="student.student_id_number", read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            "id",
            "quiz",
            "student",
            "student_name",
            "student_id_number",
            "answers",
            "score",
            "total_questions",
            "percentage",
            "passed",
            "submitted_at",
        ]
        read_only_fields = [
            "student",
            "score",
            "total_questions",
            "percentage",
            "passed",
            "submitted_at",
        ]


class HomeworkSerializer(serializers.ModelSerializer):
    session_title = serializers.CharField(source="session.subject.name", read_only=True)
    batch_name = serializers.CharField(source="session.batch.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    submissions_count = serializers.SerializerMethodField()
    my_submission = serializers.SerializerMethodField()

    class Meta:
        model = Homework
        fields = [
            "id",
            "session",
            "session_title",
            "batch_name",
            "title",
            "instructions",
            "due_date",
            "max_score",
            "created_by_name",
            "created_at",
            "submissions_count",
            "my_submission",
        ]
        read_only_fields = ["created_at"]

    def get_submissions_count(self, obj) -> int:
        return obj.submissions.count()

    def get_my_submission(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.role == UserRole.STUDENT:
            sub = obj.submissions.filter(student__user=request.user).first()
            if sub:
                return {
                    "id": sub.id,
                    "status": sub.status,
                    "submission_text": sub.submission_text,
                    "attachment_url": sub.attachment_url,
                    "score": sub.score,
                    "teacher_feedback": sub.teacher_feedback,
                    "submitted_at": sub.submitted_at,
                }
        return None

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user
        return super().create(validated_data)


class HomeworkSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.full_name", read_only=True)
    student_id_number = serializers.CharField(source="student.student_id_number", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", read_only=True)

    class Meta:
        model = HomeworkSubmission
        fields = [
            "id",
            "homework",
            "student",
            "student_name",
            "student_id_number",
            "submission_text",
            "attachment_url",
            "submitted_at",
            "status",
            "score",
            "teacher_feedback",
            "reviewed_at",
            "reviewed_by_name",
        ]
        read_only_fields = [
            "student",
            "submitted_at",
            "reviewed_at",
            "reviewed_by",
        ]


class SpeakingVideoSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.full_name", read_only=True)
    student_id_number = serializers.CharField(source="student.student_id_number", read_only=True)
    batch_name = serializers.CharField(source="batch.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    evaluated_by_name = serializers.CharField(source="evaluated_by.full_name", read_only=True)
    original_video_url = serializers.SerializerMethodField()

    class Meta:
        model = SpeakingVideoSubmission
        fields = [
            "id",
            "student",
            "student_name",
            "student_id_number",
            "batch",
            "batch_name",
            "level",
            "subject",
            "subject_name",
            "title",
            "topic",
            "video_url",
            "video_file",
            "original_video_url",
            "file_size_mb",
            "duration_seconds",
            "student_notes",
            "submitted_at",
            "status",
            "score_body_language",
            "score_pronunciation_fluency",
            "score_content_vocabulary",
            "score_presentation_delivery",
            "total_score",
            "grade",
            "teacher_feedback",
            "revision_reason",
            "evaluated_by",
            "evaluated_by_name",
            "evaluated_at",
        ]
        read_only_fields = [
            "submitted_at",
            "evaluated_at",
            "evaluated_by",
            "total_score",
            "grade",
        ]

    def get_original_video_url(self, obj) -> str:
        if obj.video_file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.video_file.url)
            return obj.video_file.url
        return obj.video_url or ""


class SpeakingVideoEvaluationSerializer(serializers.Serializer):
    score_body_language = serializers.IntegerField(min_value=0, max_value=25, required=True)
    score_pronunciation_fluency = serializers.IntegerField(min_value=0, max_value=25, required=True)
    score_content_vocabulary = serializers.IntegerField(min_value=0, max_value=25, required=True)
    score_presentation_delivery = serializers.IntegerField(min_value=0, max_value=25, required=True)
    teacher_feedback = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(
        choices=[SpeakingVideoStatus.EVALUATED, SpeakingVideoStatus.REVISION_REQUESTED],
        default=SpeakingVideoStatus.EVALUATED,
    )
    revision_reason = serializers.CharField(required=False, allow_blank=True, default="")

