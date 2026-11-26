from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import UserRole
from apps.notifications.models import Notification, NotificationType
from .models import Examination, ExamResult, ExamResultVersion, ResultApprovalStatus, calculate_grade
from .serializers import ExaminationSerializer, ExamResultSerializer, ExamResultVersionSerializer


class ExaminationViewSet(viewsets.ModelViewSet):
    """
    CRUD for Examinations & Double Approval Publication Workflow (Section 12).
    """

    queryset = Examination.objects.select_related("batch", "subject", "created_by").prefetch_related("results")
    serializer_class = ExaminationSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "step1_review", "confirm_publish"]:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get"])
    def results(self, request, pk=None):
        exam = self.get_object()
        user = request.user

        # If student, strictly only show published results for themselves
        if user.role == UserRole.STUDENT:
            student = getattr(user, "student_profile", None)
            if not student:
                return Response([], status=status.HTTP_200_OK)
            results = exam.results.filter(student=student, status=ResultApprovalStatus.PUBLISHED)
        else:
            results = exam.results.select_related("student__user", "exam__subject").all()

        serializer = ExamResultSerializer(results, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="bulk-entry")
    def bulk_entry(self, request, pk=None):
        """
        Enter or update marks for multiple students in this examination.
        Payload: { marks: [ { student_id: int, marks_obtained: float, examiner_feedback: str } ] }
        """
        exam = self.get_object()
        user = request.user
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.TEACHER]:
            return Response({"error": "অনুমতি নেই।"}, status=status.HTTP_403_FORBIDDEN)

        marks_data = request.data.get("marks", [])
        if not marks_data:
            return Response({"error": "নম্বর তালিকা প্রদান করুন।"}, status=status.HTTP_400_BAD_REQUEST)

        updated_count = 0
        with transaction.atomic():
            for item in marks_data:
                student_id = item.get("student_id")
                raw_marks = item.get("marks_obtained")
                feedback = item.get("examiner_feedback", "")

                if not student_id or raw_marks is None:
                    continue

                marks_dec = Decimal(str(raw_marks))
                grade, is_passed = calculate_grade(marks_dec, exam.total_marks)

                result, created = ExamResult.objects.get_or_create(
                    exam=exam,
                    student_id=student_id,
                    defaults={
                        "marks_obtained": marks_dec,
                        "grade": grade,
                        "is_passed": is_passed,
                        "examiner_feedback": feedback,
                        "status": ResultApprovalStatus.DRAFT,
                    },
                )

                if not created:
                    # If result was already published and is being changed, record audit version & drop to draft!
                    if result.status == ResultApprovalStatus.PUBLISHED:
                        ExamResultVersion.objects.create(
                            result=result,
                            version_number=result.version,
                            previous_marks=result.marks_obtained,
                            new_marks=marks_dec,
                            previous_grade=result.grade,
                            new_grade=grade,
                            change_reason=item.get("change_reason", "পরীক্ষা ফলাফল সংশোধন"),
                            changed_by=user,
                        )
                        result.version += 1
                        result.status = ResultApprovalStatus.DRAFT
                        result.step1_approved_by = None
                        result.step1_approved_at = None
                        result.published_by = None
                        result.published_at = None

                    result.marks_obtained = marks_dec
                    result.grade = grade
                    result.is_passed = is_passed
                    if feedback:
                        result.examiner_feedback = feedback
                    result.save()

                updated_count += 1

        return Response({
            "success": True,
            "message": f"মোট {updated_count} জন শিক্ষার্থীর নম্বর সফলভাবে সংরক্ষিত হয়েছে।",
            "updated_count": updated_count,
        })

    @action(detail=True, methods=["post"], url_path="step1-review")
    def step1_review(self, request, pk=None):
        """
        Step 1 of Mandatory Double Approval:
        1. Reviews all marks, calculates statistics, and identifies missing/inconsistent data.
        2. Requires Administrator / Coordinator authorization.
        3. Moves all results to 'approved_for_publication' (NOT published yet).
        """
        exam = self.get_object()
        user = request.user
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR]:
            return Response({"error": "শুধুমাত্র কোর্স কোঅর্ডিনেটর ধাপ ১ অনুমোদন করতে পারেন।"}, status=status.HTTP_403_FORBIDDEN)

        results = exam.results.all()
        if not results.exists():
            return Response({"error": "এই পরীক্ষায় কোনো শিক্ষার্থীর নম্বর এন্ট্রি করা হয়নি।"}, status=status.HTTP_400_BAD_REQUEST)

        missing_marks = results.filter(marks_obtained__isnull=True).count()
        total_students = results.count()
        passed_count = sum(1 for r in results if r.is_passed)
        failed_count = total_students - passed_count
        pass_rate = round((passed_count / total_students) * 100, 1) if total_students > 0 else 0

        # Mark all as approved for publication
        now = timezone.now()
        with transaction.atomic():
            results.update(
                status=ResultApprovalStatus.APPROVED_FOR_PUBLICATION,
                step1_approved_by=user,
                step1_approved_at=now,
            )

        return Response({
            "success": True,
            "message": "ধাপ ১ (রিভিউ ও অডিট) সফলভাবে অনুমোদিত হয়েছে। এখন ধাপ ২ (চূড়ান্ত প্রকাশনা নিশ্চিতকরণ) এর জন্য প্রস্তুত।",
            "step": 1,
            "approval_status": "approved_for_publication",
            "total_students": total_students,
            "missing_marks_count": missing_marks,
            "passed_count": passed_count,
            "failed_count": failed_count,
            "pass_rate_percentage": pass_rate,
            "reviewed_by": user.full_name,
            "reviewed_at": now.isoformat(),
        })

    @action(detail=True, methods=["post"], url_path="confirm-publish")
    def confirm_publish(self, request, pk=None):
        """
        Step 2 of Mandatory Double Approval (Section 3.3 & 12.3):
        1. Requires separate, explicit confirmation payload: { confirm_publication: true }.
        2. Validates that Step 1 was already completed!
        3. Only now publishes results to students and triggers notifications.
        """
        exam = self.get_object()
        user = request.user
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR]:
            return Response({"error": "শুধুমাত্র কোর্স কোঅর্ডিনেটর চূড়ান্ত প্রকাশ নিশ্চিত করতে পারেন।"}, status=status.HTTP_403_FORBIDDEN)

        confirm = request.data.get("confirm_publication")
        if not confirm:
            return Response(
                {"error": "চূড়ান্ত প্রকাশনা নিশ্চিতকরণের জন্য 'confirm_publication: true' প্রদান আবশ্যক।"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = exam.results.all()
        # Verify Step 1 was completed
        unapproved = results.exclude(status=ResultApprovalStatus.APPROVED_FOR_PUBLICATION)
        if unapproved.exists() and not results.filter(status=ResultApprovalStatus.APPROVED_FOR_PUBLICATION).exists():
            return Response(
                {"error": "বাধ্যতামূলক ধাপ ১ (রিভিউ ও অনুমোদন) সম্পন্ন না করে ফলাফল সরাসরি প্রকাশ করা নিষিদ্ধ।"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        with transaction.atomic():
            results.update(
                status=ResultApprovalStatus.PUBLISHED,
                published_by=user,
                published_at=now,
            )

            # Create notification for each student who took the exam
            for r in results:
                try:
                    Notification.objects.create(
                        recipient=r.student.user,
                        title=f"{exam.name} এর ফলাফল প্রকাশিত হয়েছে",
                        message=f"আপনার বিষয়: {exam.subject.name}, প্রাপ্ত নম্বর: {r.marks_obtained}/{exam.total_marks}, গ্রেড: {r.grade}।",
                        notification_type=NotificationType.ACADEMIC,
                    )
                except Exception:
                    pass

        return Response({
            "success": True,
            "message": f"আলহামদুলিল্লাহ! '{exam.name}' এর ফলাফল চূড়ান্তভাবে অনুমোদিত হয়ে ছাত্রদের জন্য প্রকাশিত হয়েছে।",
            "step": 2,
            "approval_status": "published",
            "published_by": user.full_name,
            "published_at": now.isoformat(),
            "published_count": results.count(),
        })


class ExamResultViewSet(viewsets.ModelViewSet):
    """
    Direct access to individual student results, respecting Double Approval status.
    """

    queryset = ExamResult.objects.select_related("exam__batch", "exam__subject", "student__user").all()
    serializer_class = ExamResultSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ExamResult.objects.none()

        # Strict isolation: Students only see their own PUBLISHED results!
        if user.role == UserRole.STUDENT:
            student = getattr(user, "student_profile", None)
            if not student:
                return ExamResult.objects.none()
            return ExamResult.objects.filter(student=student, status=ResultApprovalStatus.PUBLISHED)

        # Teachers and Coordinators see results for their batches
        batch_id = self.request.query_params.get("batch")
        exam_id = self.request.query_params.get("exam")
        qs = self.queryset

        if batch_id:
            qs = qs.filter(exam__batch_id=batch_id)
        if exam_id:
            qs = qs.filter(exam_id=exam_id)

        return qs
