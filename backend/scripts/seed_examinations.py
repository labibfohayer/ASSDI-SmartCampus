import os
import django
from decimal import Decimal
from datetime import date, time, timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
django.setup()

from django.utils import timezone
from apps.accounts.models import User
from apps.batches.models import Batch
from apps.academic.models import Subject
from apps.students.models import Student
from apps.class_sessions.models import ClassSession, RoutineApprovalStatus, RoutineVersion, SessionStatus
from apps.examinations.models import Examination, ExamResult, ResultApprovalStatus, calculate_grade

def run():
    print("--- Seeding Demo Examinations & Two-Step Approval Data ---")
    coord = User.objects.filter(role="coordinator").first()
    if not coord:
        coord = User.objects.first()

    batch_42 = Batch.objects.filter(name__icontains="42").first() or Batch.objects.first()
    batch_43 = Batch.objects.filter(name__icontains="43").first() or Batch.objects.last()

    accounting_subj = Subject.objects.filter(name__icontains="Accounting").first() or Subject.objects.first()
    marketing_subj = Subject.objects.filter(name__icontains="Marketing").first() or Subject.objects.all()[1]
    office_subj = Subject.objects.filter(name__icontains="Office").first() or Subject.objects.all()[2]

    now = timezone.now()

    # 1. Exam 1: SBMC Level 1 Midterm - PUBLISHED (Step 1 & Step 2 Completed)
    exam_pub, created = Examination.objects.get_or_create(
        name="SBMC লেভেল ১ মিডটার্ম মূল্যায়ন ২০২৬",
        batch=batch_42,
        defaults={
            "level": 1,
            "subject": accounting_subj,
            "exam_type": "midterm",
            "exam_date": date.today() - timedelta(days=7),
            "start_time": time(10, 0),
            "end_time": time(12, 0),
            "room": "কম্পিউটার ল্যাব ০১",
            "total_marks": 100,
            "pass_marks": 50,
            "syllabus": "মডিউল ০১ ও ০২: মৌলিক হিসাববিজ্ঞান, ডেবিট-ক্রেডিট নীতি ও লাভ-ক্ষতি হিসাব।",
            "created_by": coord,
        }
    )
    print(f"Exam 1 (Published): {exam_pub.name}")

    # Seed results for students in batch_42
    students_42 = Student.objects.filter(enrollments__batch=batch_42).distinct()[:15]
    if not students_42.exists():
        students_42 = Student.objects.all()[:15]
    demo_scores = [92, 85, 78, 64, 48, 88, 73, 95, 68, 55, 82, 91, 74, 45, 80]

    for idx, student in enumerate(students_42):
        score = demo_scores[idx % len(demo_scores)]
        grade, is_passed = calculate_grade(Decimal(score), exam_pub.total_marks)
        ExamResult.objects.update_or_create(
            exam=exam_pub,
            student=student,
            defaults={
                "marks_obtained": Decimal(score),
                "grade": grade,
                "is_passed": is_passed,
                "examiner_feedback": "হিসাববিজ্ঞান ও ব্যালেন্সশিট উপস্থাপনা চমৎকার হয়েছে।" if is_passed else "আরও নিয়মিত রিভিশন ও প্র্যাকটিস প্রয়োজন।",
                "status": ResultApprovalStatus.PUBLISHED,
                "step1_approved_by": coord,
                "step1_approved_at": now - timedelta(days=2),
                "published_by": coord,
                "published_at": now - timedelta(days=1),
                "version": 1,
            }
        )
    print(f"  -> Seeded {students_42.count()} published results for Exam 1")

    # 2. Exam 2: SBMC Level 1 Practical - STEP 1 APPROVED (Awaiting Step 2 Confirmation)
    exam_step1, _ = Examination.objects.get_or_create(
        name="SBMC লেভেল ১ ব্যবহারিক ডিজিটাল মার্কেটিং পরীক্ষা",
        batch=batch_42,
        defaults={
            "level": 1,
            "subject": marketing_subj,
            "exam_type": "practical",
            "exam_date": date.today() - timedelta(days=2),
            "start_time": time(14, 0),
            "end_time": time(16, 0),
            "room": "কম্পিউটার ল্যাব ০২",
            "total_marks": 100,
            "pass_marks": 50,
            "syllabus": "মেটা অ্যাড ম্যানেজার ক্যাম্পেইন সেটআপ, টার্গেটিং ও বাজেট অপটিমাইজেশন।",
            "created_by": coord,
        }
    )
    for idx, student in enumerate(students_42[:10]):
        score = [85, 76, 90, 62, 58, 94, 71, 83, 67, 89][idx]
        grade, is_passed = calculate_grade(Decimal(score), exam_step1.total_marks)
        ExamResult.objects.update_or_create(
            exam=exam_step1,
            student=student,
            defaults={
                "marks_obtained": Decimal(score),
                "grade": grade,
                "is_passed": is_passed,
                "examiner_feedback": "ক্যাম্পেইন স্ট্রাকচার সঠিক ছিল।",
                "status": ResultApprovalStatus.APPROVED_FOR_PUBLICATION,
                "step1_approved_by": coord,
                "step1_approved_at": now - timedelta(hours=3),
                "version": 1,
            }
        )
    print(f"Exam 2 (Step 1 Approved): {exam_step1.name}")

    # 3. Exam 3: SBMC Level 2 Entrepreneurship Plan - DRAFT
    exam_draft, _ = Examination.objects.get_or_create(
        name="SBMC লেভেল ২ ফাইনাল বিজনেস প্ল্যান ও ভাইভা",
        batch=batch_43,
        defaults={
            "level": 2,
            "subject": office_subj,
            "exam_type": "final",
            "exam_date": date.today() + timedelta(days=5),
            "start_time": time(9, 30),
            "end_time": time(13, 0),
            "room": "প্রধান অডিটোরিয়াম ও ল্যাব ০১",
            "total_marks": 100,
            "pass_marks": 50,
            "syllabus": "পূর্ণাঙ্গ বিজনেস পিচ ডেক, আর্থিক প্রাক্কলন ও শরিয়াহ কমপ্লায়েন্স প্ল্যান।",
            "created_by": coord,
        }
    )
    print(f"Exam 3 (Draft): {exam_draft.name}")

    # 4. Seed Routine Version history for Batch 42
    session_ids = list(ClassSession.objects.filter(batch=batch_42).values_list("id", flat=True)[:8])
    if session_ids:
        sessions_42 = ClassSession.objects.filter(id__in=session_ids)
        snapshot = [
            {
                "id": s.id,
                "subject": s.subject.name,
                "teacher": s.teacher_user.full_name,
                "date": str(s.session_date),
                "start": str(s.start_time),
                "end": str(s.end_time),
                "audience": s.audience,
            }
            for s in sessions_42
        ]
        RoutineVersion.objects.get_or_create(
            batch=batch_42,
            version_number=1,
            defaults={
                "change_summary": "SBMC ব্যাচ ৪২ এর সাপ্তাহিক ক্লাসরুম ও ল্যাব রুটিন চূড়ান্ত অনুমোদন ও প্রকাশ।",
                "schedule_snapshot": {"sessions": snapshot},
                "approved_by": coord,
                "published_by": coord,
            }
        )
        ClassSession.objects.filter(id__in=session_ids).update(
            status=SessionStatus.PUBLISHED,
            approval_status=RoutineApprovalStatus.PUBLISHED,
            published_at=now - timedelta(days=5),
            version_number=1,
            step1_approved_by=coord,
            step1_approved_at=now - timedelta(days=6),
        )
        print(f"Seeded RoutineVersion 1 for Batch 42 with {len(snapshot)} sessions.")

    print("--- Seeding Completed Successfully! ---")

if __name__ == "__main__":
    run()
