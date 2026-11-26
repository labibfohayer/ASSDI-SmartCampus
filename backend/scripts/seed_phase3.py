#!/usr/bin/env python
"""
Seed realistic demo data for Phase 3 (Section 9: Learning Feedback & Questions, Section 11: Speaking Videos).
"""
import os
import sys
import datetime
from django.utils import timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

import django
django.setup()

from apps.academic.models import Subject, ClassTopic
from apps.accounts.models import User, UserRole
from apps.assignments.models import SpeakingVideoStatus, SpeakingVideoSubmission
from apps.batches.models import Batch, TeacherAssignment
from apps.class_sessions.models import ClassSession
from apps.feedback.models import (
    HelpRequest,
    HelpRequestMessage,
    HelpRequestStatus,
    SubjectUnderstandingHistory,
    SubjectUnderstandingProgress,
)
from apps.students.models import Student


def run():
    print("🌱 Seeding Phase 3 demo data...")

    # 1. Fetch Students, Teachers, Batch, Subjects
    students = list(Student.objects.select_related("user").all()[:10])
    if not students:
        print("❌ No students found!")
        return

    teachers = list(User.objects.filter(role=UserRole.TEACHER))
    if not teachers:
        print("❌ No teachers found!")
        return

    batch = Batch.objects.first()
    subjects = list(Subject.objects.all())

    print(f"Loaded {len(students)} students, {len(teachers)} teachers, Batch: {batch.name if batch else 'None'}, {len(subjects)} subjects")

    # 2. Seed SubjectUnderstandingProgress
    print("\n📊 Seeding Subject Understanding Percentages (0-100%)...")
    understanding_samples = [
        (subjects[0], 85, "আলহামদুলিল্লাহ, ক্যাম্পেইন অবজেক্টিভ ও অডিয়েন্স টার্গেটিং ক্লিয়ার।"),
        (subjects[1] if len(subjects) > 1 else subjects[0], 45, "জার্নাল এন্ট্রি ও ব্যালেন্স শিট রিকনসিলিয়েশন কিছুটা জটিল লাগছে।"),
        (subjects[2] if len(subjects) > 2 else subjects[0], 90, "ভিডিও কাট ও ট্রানজিশন সহজেই আয়ত্ত করেছি।"),
        (subjects[3] if len(subjects) > 3 else subjects[0], 65, "বিজনেস কমিউনিকেশন স্পিকিং আরও প্র্যাকটিস করতে হবে।"),
    ]

    for student in students[:5]:
        for subj, pct, note in understanding_samples:
            progress, created = SubjectUnderstandingProgress.objects.get_or_create(
                student=student,
                subject=subj,
                defaults={
                    "understanding_percentage": pct,
                    "previous_percentage": max(0, pct - 15),
                    "student_notes": note,
                }
            )
            if created or not progress.history.exists():
                SubjectUnderstandingHistory.objects.create(
                    progress=progress,
                    percentage=max(0, pct - 15),
                    notes="পূর্ববর্তী সপ্তাহের অগ্রগতি",
                    recorded_at=timezone.now() - datetime.timedelta(days=7),
                )
                SubjectUnderstandingHistory.objects.create(
                    progress=progress,
                    percentage=pct,
                    notes=note,
                    recorded_at=timezone.now(),
                )

    print("✅ Seeded Subject Understanding records.")

    # 3. Seed Learning Problems / Questions (10-step lifecycle)
    print("\n❓ Seeding 10-Step Learning Problems / Help Requests...")
    s1 = students[0]
    s2 = students[1] if len(students) > 1 else s1
    s3 = students[2] if len(students) > 2 else s1
    t1 = teachers[0]
    t2 = teachers[1] if len(teachers) > 1 else t1
    first_session = ClassSession.objects.first()

    # Question 1: Awaiting Teacher Response (Overdue > 28h for alert testing)
    q1, _ = HelpRequest.objects.get_or_create(
        student=s1,
        unclear_part="Meta Pixel Event Deduplication & CAPI",
        defaults={
            "teacher_user": t1,
            "session": first_session,
            "subject": subjects[0] if subjects else None,
            "student_message": "স্যার, ব্রাউজার পিক্সেল এবং সার্ভার সাইড ট্র্যাকিংয়ের ইভেন্ট আইডি ডুপ্লিকেশন কীভাবে প্রতিরোধ করব?",
            "reported_understanding_pct": 40,
            "status": HelpRequestStatus.AWAITING_TEACHER,
            "created_at": timezone.now() - datetime.timedelta(hours=28),
        }
    )
    if not q1.messages.exists():
        HelpRequestMessage.objects.create(
            help_request=q1,
            sender_user=s1.user,
            message_text=q1.student_message,
            is_teacher_response=False,
            created_at=timezone.now() - datetime.timedelta(hours=28),
        )

    # Question 2: Answered with teacher reply & study resource attachment
    q2, _ = HelpRequest.objects.get_or_create(
        student=s2,
        unclear_part="ব্যালেন্স শিটে ডেপ্রিসিয়েশন ক্যালকুলেশন",
        defaults={
            "teacher_user": t2,
            "session": first_session,
            "subject": subjects[1] if len(subjects) > 1 else subjects[0],
            "student_message": "স্ট্রেইট লাইন বনাম রিডিউসিং ব্যালেন্স মেথডের ফর্মুলা গুলিয়ে যাচ্ছে।",
            "reported_understanding_pct": 55,
            "status": HelpRequestStatus.ANSWERED,
            "last_teacher_response_at": timezone.now() - datetime.timedelta(hours=3),
            "teacher_note": "স্ট্রেইট লাইনে প্রতি বছর সমপরিমাণ অবচয় কাটা হয়। এটা মনে রাখা সহজ। অ্যাটাচ করা শিটটি দেখো।",
        }
    )
    if not q2.messages.exists():
        HelpRequestMessage.objects.create(
            help_request=q2,
            sender_user=s2.user,
            message_text=q2.student_message,
            is_teacher_response=False,
            created_at=timezone.now() - datetime.timedelta(hours=8),
        )
        HelpRequestMessage.objects.create(
            help_request=q2,
            sender_user=t2,
            message_text="স্ট্রেইট লাইনে প্রতি বছর সমপরিমাণ অবচয় কাটা হয়। এটা মনে রাখা সহজ। অ্যাটাচ করা শিটটি দেখো।",
            attached_resource_url="https://assdi.org/resources/accounting-depreciation-formula.pdf",
            attached_resource_name="Depreciation Summary Notes (PDF)",
            is_teacher_response=True,
            created_at=timezone.now() - datetime.timedelta(hours=3),
        )

    # Question 3: Resolved (Student confirmed understanding)
    q3, _ = HelpRequest.objects.get_or_create(
        student=s3,
        unclear_part="ভিডিও এডিটিংয়ে কালার কারেকশন বনাম কালার গ্রেডিং",
        defaults={
            "teacher_user": t1,
            "session": first_session,
            "subject": subjects[2] if len(subjects) > 2 else subjects[0],
            "student_message": "কালার কারেকশন কখন শেষ হয় এবং গ্রেডিং কখন শুরু করব?",
            "reported_understanding_pct": 75,
            "status": HelpRequestStatus.RESOLVED,
            "student_resolution_confirmed": True,
            "resolved_at": timezone.now() - datetime.timedelta(hours=5),
            "resolved_by": s3.user,
            "teacher_note": "প্রথমে ব্যালেন্স ঠিক করতে হবে (কারেকশন), তারপর মুড দিতে হবে (গ্রেডিং)।",
        }
    )
    if not q3.messages.exists():
        HelpRequestMessage.objects.create(
            help_request=q3,
            sender_user=s3.user,
            message_text=q3.student_message,
            is_teacher_response=False,
            created_at=timezone.now() - datetime.timedelta(hours=14),
        )
        HelpRequestMessage.objects.create(
            help_request=q3,
            sender_user=t1,
            message_text="প্রথমে হোয়াইট ব্যালেন্স ও এক্সপোজার ঠিক করতে হবে (কারেকশন), তারপর সিনেমাটিক মুড দিতে হবে (গ্রেডিং)।",
            is_teacher_response=True,
            created_at=timezone.now() - datetime.timedelta(hours=8),
        )
        HelpRequestMessage.objects.create(
            help_request=q3,
            sender_user=s3.user,
            message_text="ধন্যবাদ স্যার, এখন বিষয়টি পরিষ্কার বুঝতে পেরেছি! আলহামদুলিল্লাহ।",
            is_teacher_response=False,
            created_at=timezone.now() - datetime.timedelta(hours=5),
        )

    print("✅ Seeded 10-Step Learning Problems with messages.")

    # 4. Seed Speaking Video Submissions
    print("\n🎥 Seeding Speaking Video Submissions (Section 11)...")
    v1, _ = SpeakingVideoSubmission.objects.get_or_create(
        student=s1,
        title="Elevator Pitch: Modern Agro-Tech Venture in Bangladesh",
        defaults={
            "batch": batch,
            "subject": subjects[3] if len(subjects) > 3 else subjects[0],
            "level": "level_1",
            "topic": "English Communication - Elevator Pitch",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            "file_size_mb": 18.4,
            "duration_seconds": 124,
            "student_notes": "৩ মিনিটের মধ্যে অ্যাগ্রো স্টার্টআপের বিজনেস প্রপোজাল ইংরেজিতে উপস্থাপন করেছি।",
            "status": SpeakingVideoStatus.EVALUATED,
            "score_body_language": 22,
            "score_pronunciation_fluency": 23,
            "score_content_vocabulary": 24,
            "score_presentation_delivery": 22,
            "total_score": 91,
            "grade": "A+",
            "teacher_feedback": "মাশাআল্লাহ, চমৎকার আই কন্টাক্ট এবং ফ্লুয়েন্ট স্পিকিং। বিজনেস টার্মগুলোর উচ্চারণ স্পষ্ট ছিল।",
            "evaluated_by": t1,
            "evaluated_at": timezone.now() - datetime.timedelta(hours=12),
        }
    )

    v2, _ = SpeakingVideoSubmission.objects.get_or_create(
        student=s2,
        title="Business Model Canvas Presentation (Bangla & English)",
        defaults={
            "batch": batch,
            "subject": subjects[0] if subjects else None,
            "level": "level_1",
            "topic": "SBMC Business Plan",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "file_size_mb": 25.1,
            "duration_seconds": 180,
            "student_notes": "ক্যানভাস মডেলের ৯টি বিল্ডিং ব্লক ব্যাখ্যা করেছি।",
            "status": SpeakingVideoStatus.UNDER_REVIEW,
        }
    )

    v3, _ = SpeakingVideoSubmission.objects.get_or_create(
        student=s3,
        title="Investor Pitch Deck — SBMC Level 2 Final Demo",
        defaults={
            "batch": batch,
            "subject": subjects[1] if len(subjects) > 1 else subjects[0],
            "level": "level_2",
            "topic": "Financial Projections & Equity Offer",
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            "file_size_mb": 32.8,
            "duration_seconds": 210,
            "student_notes": "লেভেল ২ এর ৩ বছরের ফিন্যান্সিয়াল প্রজেকশন উপস্থাপন করেছি।",
            "status": SpeakingVideoStatus.SUBMITTED,
        }
    )

    print("✅ Seeded Speaking Video Submissions.")
    print("✨ Phase 3 demo seeding completed successfully!\n")


if __name__ == "__main__":
    run()
