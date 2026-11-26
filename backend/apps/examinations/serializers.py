from rest_framework import serializers
from .models import Examination, ExamResult, ExamResultVersion, ResultApprovalStatus


class ExamResultVersionSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.full_name", read_only=True)

    class Meta:
        model = ExamResultVersion
        fields = [
            "id",
            "version_number",
            "previous_marks",
            "new_marks",
            "previous_grade",
            "new_grade",
            "change_reason",
            "changed_by_name",
            "changed_at",
        ]


class ExamResultSerializer(serializers.ModelSerializer):
    student_id = serializers.CharField(source="student.student_id", read_only=True)
    student_name = serializers.CharField(source="student.user.full_name", read_only=True)
    exam_name = serializers.CharField(source="exam.name", read_only=True)
    subject_name = serializers.CharField(source="exam.subject.name", read_only=True)
    total_marks = serializers.IntegerField(source="exam.total_marks", read_only=True)
    pass_marks = serializers.IntegerField(source="exam.pass_marks", read_only=True)
    step1_approved_by_name = serializers.CharField(source="step1_approved_by.full_name", read_only=True)
    published_by_name = serializers.CharField(source="published_by.full_name", read_only=True)
    versions = ExamResultVersionSerializer(many=True, read_only=True)

    class Meta:
        model = ExamResult
        fields = [
            "id",
            "exam",
            "exam_name",
            "subject_name",
            "student",
            "student_id",
            "student_name",
            "marks_obtained",
            "total_marks",
            "pass_marks",
            "grade",
            "is_passed",
            "examiner_feedback",
            "status",
            "step1_approved_by_name",
            "step1_approved_at",
            "published_by_name",
            "published_at",
            "version",
            "versions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "grade",
            "is_passed",
            "status",
            "step1_approved_by_name",
            "step1_approved_at",
            "published_by_name",
            "published_at",
            "version",
        ]


class ExaminationSerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source="batch.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    results_count = serializers.SerializerMethodField()
    results_status_summary = serializers.SerializerMethodField()

    class Meta:
        model = Examination
        fields = [
            "id",
            "batch",
            "batch_name",
            "level",
            "subject",
            "subject_name",
            "name",
            "exam_type",
            "exam_date",
            "start_time",
            "end_time",
            "room",
            "total_marks",
            "pass_marks",
            "syllabus",
            "created_by_name",
            "created_at",
            "updated_at",
            "results_count",
            "results_status_summary",
        ]

    def get_results_count(self, obj):
        return obj.results.count()

    def get_results_status_summary(self, obj):
        results = obj.results.all()
        total = results.count()
        if total == 0:
            return {"status": "no_results", "label": "কোনো নম্বর এন্ট্রি হয়নি"}

        published = results.filter(status=ResultApprovalStatus.PUBLISHED).count()
        approved = results.filter(status=ResultApprovalStatus.APPROVED_FOR_PUBLICATION).count()
        under_review = results.filter(status=ResultApprovalStatus.UNDER_REVIEW).count()
        draft = results.filter(status=ResultApprovalStatus.DRAFT).count()

        if published == total:
            return {"status": "published", "label": "প্রকাশিত (Published)", "count": published, "total": total}
        elif approved == total or (approved + published == total):
            return {"status": "approved_for_publication", "label": "ধাপ ১ অনুমোদিত (Step 1 Approved)", "count": approved, "total": total}
        elif under_review > 0:
            return {"status": "under_review", "label": "পর্যালোচনাধীন (Under Review)", "count": under_review, "total": total}
        else:
            return {"status": "draft", "label": "খসড়া (Draft)", "count": draft, "total": total}
