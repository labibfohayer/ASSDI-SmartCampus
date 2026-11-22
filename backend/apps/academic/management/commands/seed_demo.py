import datetime
import zoneinfo
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.academic.models import (
    Campus,
    CampusGender,
    ClassTopic,
    CoordinatorCourseAssignment,
    Course,
    Department,
    Subject,
    SubjectAudience,
)
from apps.accounts.models import UserRole
from apps.attendance.models import AttendanceMethod, AttendanceRecord, AttendanceStatus
from apps.batches.models import Batch, BatchStatus, TeacherAssignment
from apps.class_sessions.constants import (
    SUNDAY,
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    date_to_day_of_week,
)
from apps.class_sessions.models import ClassSchedule, ClassSession, SessionAudience, SessionStatus
from apps.feedback.models import HelpRequest, HelpRequestStatus, LearningFeedback
from apps.students.models import (
    EducationBackground,
    Enrollment,
    EnrollmentStatus,
    Student,
    StudentStatus,
)

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Seeds demo academic and student data for SBMC course strictly adhering to "
        "SRS Section 19 and AGENTS.md Rule 6 (Dummy-only data, idempotent)."
    )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Seeding ASSDI Demo Data (Sprint 2) ==="))

        with transaction.atomic():
            # 1. Campus
            campus, _ = Campus.objects.get_or_create(
                code="KBC-NB",
                defaults={
                    "name": "Kazi Bari Campus",
                    "gender_campus": CampusGender.MALE,
                    "address": "House 14, Road 3, Kazi Bari, North Badda, Dhaka-1212",
                    "is_active": True,
                },
            )
            self.stdout.write(self.style.SUCCESS(f"[CAMPUS] {campus.name} ({campus.code})"))

            # 2. Course
            course, _ = Course.objects.get_or_create(
                code="SBMC",
                defaults={
                    "name": "Small Business Management Course (SBMC)",
                    "description": (
                        "3-month full-time residential capacity building program "
                        "for prospective micro and small entrepreneurs."
                    ),
                    "duration_months": 3,
                    "is_active": True,
                },
            )
            self.stdout.write(self.style.SUCCESS(f"[COURSE] {course.name} ({course.code})"))

            # 3. Staff Users
            # Super Admin
            admin_user, _ = User.objects.get_or_create(
                login_id="admin01",
                defaults={
                    "full_name": "Rahim Admin (Dummy)",
                    "role": UserRole.SUPER_ADMIN,
                    "email": "admin.demo@assdi.local",
                    "phone": "01700000000",
                    "is_staff": True,
                    "is_superuser": True,
                },
            )
            admin_user.set_password("AdminPass2026!")
            admin_user.save()

            # Coordinator
            coord_user, _ = User.objects.get_or_create(
                login_id="coord01",
                defaults={
                    "full_name": "Karim Coordinator (Dummy)",
                    "role": UserRole.COORDINATOR,
                    "email": "coord.demo@assdi.local",
                    "phone": "01700000001",
                    "is_staff": True,
                },
            )
            coord_user.set_password("CoordPass2026!")
            coord_user.save()

            # Assign Coordinator to SBMC
            CoordinatorCourseAssignment.objects.get_or_create(
                user=coord_user,
                course=course,
            )

            # Observer
            observer_user, _ = User.objects.get_or_create(
                login_id="observer01",
                defaults={
                    "full_name": "Tariq Observer (Dummy)",
                    "role": UserRole.OBSERVER,
                    "email": "observer.demo@assdi.local",
                    "phone": "01700000004",
                },
            )
            observer_user.set_password("ObserverPass2026!")
            observer_user.save()

            # 4. Departments
            dept_biz, _ = Department.objects.get_or_create(
                course=course,
                code="BIZ-OPS",
                defaults={"name": "Business Operations", "is_active": True},
            )
            dept_creative, _ = Department.objects.get_or_create(
                course=course,
                code="CREATIVE",
                defaults={"name": "Creative", "is_active": True},
            )

            # 5. Subjects
            subjects_data = [
                # Business Operations
                {"name": "Microsoft Office", "code": "MS-OFFICE", "dept": dept_biz, "aud": SubjectAudience.ALL},
                {"name": "Theoretical and Practical Accounting", "code": "ACCT-101", "dept": dept_biz, "aud": SubjectAudience.ALL},
                {"name": "Office Administration and Leadership", "code": "ADMIN-LEAD", "dept": dept_biz, "aud": SubjectAudience.ALL},
                # Creative
                {"name": "Graphic Design", "code": "GRAPHIC-DES", "dept": dept_creative, "aud": SubjectAudience.ALL},
                {"name": "Video Editing", "code": "VIDEO-EDIT", "dept": dept_creative, "aud": SubjectAudience.ALL},
                {"name": "Meta Marketing", "code": "META-MKTG", "dept": dept_creative, "aud": SubjectAudience.ALL},
                # Common to all
                {"name": "English Language", "code": "ENG-LANG", "dept": None, "aud": SubjectAudience.ALL},
                {"name": "Islamic Basics (General)", "code": "ISLAMIC-GEN", "dept": None, "aud": SubjectAudience.GENERAL},
                {"name": "Islamic Basics (Madrasa)", "code": "ISLAMIC-MAD", "dept": None, "aud": SubjectAudience.MADRASA},
            ]

            subjects_map = {}
            for sdata in subjects_data:
                sub, _ = Subject.objects.get_or_create(
                    course=course,
                    code=sdata["code"],
                    defaults={
                        "name": sdata["name"],
                        "department": sdata["dept"],
                        "audience_type": sdata["aud"],
                        "is_active": True,
                    },
                )
                subjects_map[sdata["code"]] = sub

            # 6. Curriculum Topics (3-5 per subject)
            topics_catalog = {
                "MS-OFFICE": [
                    ("Advanced Excel Formulas & VLOOKUP", "Master lookup functions, nested IFs and index-match for inventory."),
                    ("Financial Modeling in Spreadsheets", "Create budget templates and automated cash flow projection models."),
                    ("Business Proposal Design in Word", "Styles, typography, table of contents and branding headers in MS Word."),
                    ("Data Presentation in PowerPoint", "Effective pitch deck layout, visual hierarchy and executive summaries."),
                ],
                "ACCT-101": [
                    ("Double-Entry Bookkeeping Principles", "Debit/Credit mechanics, journal entries and ledger balancing."),
                    ("Practical Ledger & Trial Balance Preparation", "Reconciling daily transactions and verifying trial balances."),
                    ("Profit & Loss and Balance Sheet Statements", "Drafting annual P&L statements and asset/liability valuations."),
                    ("Cash Flow Forecasting & Bank Reconciliation", "Managing working capital cycles and daily bank register reconciliation."),
                ],
                "ADMIN-LEAD": [
                    ("Business Communication & Meeting Etiquette", "Drafting formal minutes, professional correspondence and memos."),
                    ("Team Coordination & Task Delegation", "Setting KPIs, monitoring performance and conflict resolution strategies."),
                    ("Inventory Management & Vendor Negotiation", "Procurement workflows, supplier evaluation and lead-time controls."),
                ],
                "GRAPHIC-DES": [
                    ("Design Principles & Silhouette Composition", "Contrast, hierarchy, balance and visual focus for brand assets."),
                    ("Branding & Social Media Banner Creation", "Photoshop canvas management, export settings and aspect ratios."),
                    ("Packaging & Label Design for Retail Goods", "Vector packaging die-lines, CMYK color spaces and print specs."),
                    ("Typography & Color Theory for E-commerce", "Font pairing, palette harmonies and consumer psychology in design."),
                ],
                "VIDEO-EDIT": [
                    ("Timeline Assembly & Narrative Cut Pacing", "Importing footage, trimming, multi-track sync and b-roll placement."),
                    ("Short-Form Reels & Hook Mechanics", "First 3-second retention hooks, pattern interrupts and sound dynamics."),
                    ("Color Grading & Audio Enhancement", "Teal-and-orange curves, dialogue cleanup, noise suppression and loudness normalization."),
                ],
                "META-MKTG": [
                    ("Meta Business Manager & Asset Verification", "Configuring Business Suite, partner sharing and domain verification."),
                    ("Facebook Conversion API & Pixel Setup", "Server-side tracking, standard events and browser signal integration."),
                    ("Lookalike Audiences & Funnel Structuring", "Building custom engagement audiences and 1-3% lookalike segmentation."),
                    ("Campaign Budget Optimization & A/B Testing", "Advantage+ budget management, creative split testing and ROAS tracking."),
                ],
                "ENG-LANG": [
                    ("Conversational English for Business Networking", "Introductions, value proposition elevator pitch and small talk."),
                    ("Client Email Etiquette & Inquiry Handling", "Responding to client requests, negotiation and deadline confirmations."),
                    ("Supplier Negotiation & Price Bidding Dialogues", "Counter-offers, discount terms and delivery agreement phrasing."),
                ],
                "ISLAMIC-GEN": [
                    ("Tahara, Wudu and Salah Fundamentals", "Obligatory purification rules and congregational prayer mechanics."),
                    ("Halal Earnings & Prohibition of Riba", "Islamic commercial jurisprudence, interest-free trade and fair pricing."),
                    ("Business Ethics, Honesty and Amanah", "Truthfulness in weights and measures, customer rights and contracts."),
                ],
                "ISLAMIC-MAD": [
                    ("Fiqh al-Mu'amalat: Murabaha & Mudaraba", "Classical transactional contracts, profit-and-loss sharing structures."),
                    ("Contemporary Financial Instruments Analysis", "Islamic banking products, sukuk and venture financing comparison."),
                    ("Modern Digital Trade & Cryptocurrencies in Fiqh", "Shariah rulings on digital assets, dropshipping and forward sales."),
                ],
            }

            for code, t_list in topics_catalog.items():
                subject = subjects_map[code]
                for title, desc in t_list:
                    ClassTopic.objects.get_or_create(
                        subject=subject,
                        title=title,
                        defaults={
                            "description": desc,
                            "learning_objectives": f"Objectives for {title}: theoretical understanding and hands-on case study.",
                            "is_active": True,
                        },
                    )

            # 7. Teachers (6 teachers mapping across 9 subjects)
            teachers_data = [
                {"login_id": "teacher_msoffice", "name": "Mahmudul Hasan (Dummy)", "email": "t.msoffice@assdi.local", "phone": "01700000011", "subs": ["MS-OFFICE", "ENG-LANG"]},
                {"login_id": "teacher_acct", "name": "Abdur Rahman (Dummy)", "email": "t.acct@assdi.local", "phone": "01700000012", "subs": ["ACCT-101", "ISLAMIC-GEN"]},
                {"login_id": "teacher_admin", "name": "Sharif Ullah (Dummy)", "email": "t.admin@assdi.local", "phone": "01700000013", "subs": ["ADMIN-LEAD"]},
                {"login_id": "teacher_graphic", "name": "Zubair Ahmed (Dummy)", "email": "t.graphic@assdi.local", "phone": "01700000014", "subs": ["GRAPHIC-DES", "VIDEO-EDIT"]},
                {"login_id": "teacher_video", "name": "Kawsar Hossain (Dummy)", "email": "t.video@assdi.local", "phone": "01700000015", "subs": ["VIDEO-EDIT", "ISLAMIC-MAD"]},
                {"login_id": "teacher_marketing", "name": "Imran Nazir (Dummy)", "email": "t.mktg@assdi.local", "phone": "01700000016", "subs": ["META-MKTG"]},
            ]

            teacher_users = []
            for tdata in teachers_data:
                t_user, _ = User.objects.get_or_create(
                    login_id=tdata["login_id"],
                    defaults={
                        "full_name": tdata["name"],
                        "role": UserRole.TEACHER,
                        "email": tdata["email"],
                        "phone": tdata["phone"],
                    },
                )
                t_user.set_password("TeacherPass2026!")
                t_user.save()
                teacher_users.append((t_user, tdata["subs"]))

            # 8. Batches (Batch 42 and Batch 43)
            batch42, _ = Batch.objects.get_or_create(
                course=course,
                batch_number=42,
                defaults={
                    "campus": campus,
                    "name": "SBMC Batch 42",
                    "start_date": datetime.date(2026, 11, 1),
                    "end_date": datetime.date(2027, 1, 31),
                    "status": BatchStatus.ACTIVE,
                },
            )
            batch43, _ = Batch.objects.get_or_create(
                course=course,
                batch_number=43,
                defaults={
                    "campus": campus,
                    "name": "SBMC Batch 43",
                    "start_date": datetime.date(2026, 11, 1),
                    "end_date": datetime.date(2027, 2, 28),
                    "status": BatchStatus.ACTIVE,
                },
            )
            batch43.start_date = datetime.date(2026, 11, 1)
            batch43.save()

            # 9. Teacher Assignments for BOTH batches (Every subject has an assigned teacher)
            for batch in [batch42, batch43]:
                for t_user, sub_codes in teacher_users:
                    for scode in sub_codes:
                        sub = subjects_map[scode]
                        TeacherAssignment.objects.get_or_create(
                            batch=batch,
                            subject=sub,
                            teacher_user=t_user,
                            defaults={"is_primary": True},
                        )

            # 10. Students (40 Dummy Students: 20 in Batch 42, 20 in Batch 43)
            bengali_first_names = [
                "Abdullah", "Mohammad", "Tanvir", "Arif", "Hasan", "Mahmud", "Sabbir", "Nayeem",
                "Fahim", "Sakib", "Al-Amin", "Ashik", "Mehedi", "Zubair", "Habib", "Shohel",
                "Kamrul", "Mustafizur", "Nazmul", "Rashed", "Shakil", "Tariqul", "Enamul", "Sayed",
                "Rezaul", "Mizanur", "Jubayer", "Saiful", "Touhid", "Farhan", "Nasir", "Shahidul",
                "Munir", "Aminul", "Ibrahim", "Ismail", "Yusuf", "Bilal", "Hamza", "Salman"
            ]
            bengali_last_names = [
                "Hossain", "Ahmed", "Islam", "Rahman", "Karim", "Chowdhury", "Miah", "Sikder",
                "Khan", "Ali", "Hasan", "Akter", "Ullah", "Alam", "Molla", "Gazi", "Biswas",
                "Sarker", "Howlader", "Kazi"
            ]
            backgrounds = [
                EducationBackground.GENERAL,
                EducationBackground.ALIYA,
                EducationBackground.QAWMI,
            ]

            student_credentials = []

            for i in range(40):
                batch = batch42 if i < 20 else batch43
                seq = (i % 20) + 1
                b_num = batch.batch_number
                student_id = f"STD-2026-{b_num:03d}-{seq:03d}"
                reg_no = f"REG-2026-{b_num:03d}-{seq:03d}"
                f_name = bengali_first_names[i % len(bengali_first_names)]
                l_name = bengali_last_names[(i * 3) % len(bengali_last_names)]
                full_name = f"{f_name} {l_name} (Dummy)"
                phone = f"01711{i+10000:06d}"
                edu_bg = backgrounds[i % len(backgrounds)]
                password = "StudentPass2026!"

                # Create/Update User
                user, _ = User.objects.get_or_create(
                    login_id=student_id,
                    defaults={
                        "full_name": full_name,
                        "role": UserRole.STUDENT,
                        "phone": phone,
                    },
                )
                user.set_password(password)
                user.is_active = True
                user.save()

                # Create/Update Student Profile
                student, _ = Student.objects.get_or_create(
                    user=user,
                    defaults={
                        "student_id_number": student_id,
                        "registration_no": reg_no,
                        "education_background": edu_bg,
                        "campus": campus,
                        "guardian_phone": f"01811{i+10000:06d}",
                        "status": StudentStatus.ACTIVE,
                    },
                )

                # Create/Update Active Enrollment
                Enrollment.objects.get_or_create(
                    student=student,
                    batch=batch,
                    defaults={"status": EnrollmentStatus.ACTIVE},
                )

                student_credentials.append((student_id, full_name, batch.name, edu_bg, password))

            # 11. Weekly Class Schedules for Batch 42 & Batch 43
            teachers_by_login = {t.login_id: t for t, _ in teacher_users}

            b42_schedule_defs = [
                # Sunday: Parallel Islamic Basics (General vs Madrasa) + MS Office + Marketing
                (SUNDAY, "ISLAMIC-GEN", "teacher_acct", datetime.time(9, 0), datetime.time(11, 0), "Room 101"),
                (SUNDAY, "ISLAMIC-MAD", "teacher_video", datetime.time(9, 0), datetime.time(11, 0), "Room 102"),
                (SUNDAY, "MS-OFFICE", "teacher_msoffice", datetime.time(11, 30), datetime.time(13, 30), "Computer Lab 1"),
                (SUNDAY, "META-MKTG", "teacher_marketing", datetime.time(14, 30), datetime.time(16, 30), "Room 101"),
                # Monday: Accounting + Graphic Design + English
                (MONDAY, "ACCT-101", "teacher_acct", datetime.time(9, 0), datetime.time(11, 0), "Room 101"),
                (MONDAY, "GRAPHIC-DES", "teacher_graphic", datetime.time(11, 30), datetime.time(13, 30), "Computer Lab 2"),
                (MONDAY, "ENG-LANG", "teacher_msoffice", datetime.time(14, 30), datetime.time(16, 30), "Room 101"),
                # Tuesday: Parallel Islamic Basics + Admin & Leadership + Video Editing
                (TUESDAY, "ISLAMIC-GEN", "teacher_acct", datetime.time(9, 0), datetime.time(11, 0), "Room 101"),
                (TUESDAY, "ISLAMIC-MAD", "teacher_video", datetime.time(9, 0), datetime.time(11, 0), "Room 102"),
                (TUESDAY, "ADMIN-LEAD", "teacher_admin", datetime.time(11, 30), datetime.time(13, 30), "Room 101"),
                (TUESDAY, "VIDEO-EDIT", "teacher_video", datetime.time(14, 30), datetime.time(16, 30), "Computer Lab 2"),
                # Wednesday: Marketing + MS Office + Accounting
                (WEDNESDAY, "META-MKTG", "teacher_marketing", datetime.time(9, 0), datetime.time(11, 0), "Room 101"),
                (WEDNESDAY, "MS-OFFICE", "teacher_msoffice", datetime.time(11, 30), datetime.time(13, 30), "Computer Lab 1"),
                (WEDNESDAY, "ACCT-101", "teacher_acct", datetime.time(14, 30), datetime.time(16, 30), "Room 101"),
                # Thursday: Graphic Design + Video Editing + Admin & Leadership
                (THURSDAY, "GRAPHIC-DES", "teacher_graphic", datetime.time(9, 0), datetime.time(11, 0), "Computer Lab 2"),
                (THURSDAY, "VIDEO-EDIT", "teacher_video", datetime.time(11, 30), datetime.time(13, 30), "Computer Lab 2"),
                (THURSDAY, "ADMIN-LEAD", "teacher_admin", datetime.time(14, 30), datetime.time(16, 30), "Room 101"),
            ]

            b43_schedule_defs = [
                (SUNDAY, "ISLAMIC-GEN", "teacher_acct", datetime.time(16, 45), datetime.time(18, 45), "Room 101"),
                (SUNDAY, "ISLAMIC-MAD", "teacher_video", datetime.time(16, 45), datetime.time(18, 45), "Room 102"),
                (SUNDAY, "MS-OFFICE", "teacher_msoffice", datetime.time(19, 0), datetime.time(21, 0), "Computer Lab 1"),
                (MONDAY, "ACCT-101", "teacher_acct", datetime.time(16, 45), datetime.time(18, 45), "Room 101"),
                (MONDAY, "GRAPHIC-DES", "teacher_graphic", datetime.time(19, 0), datetime.time(21, 0), "Computer Lab 2"),
                (TUESDAY, "ADMIN-LEAD", "teacher_admin", datetime.time(16, 45), datetime.time(18, 45), "Room 101"),
                (TUESDAY, "VIDEO-EDIT", "teacher_video", datetime.time(19, 0), datetime.time(21, 0), "Computer Lab 2"),
                (WEDNESDAY, "META-MKTG", "teacher_marketing", datetime.time(16, 45), datetime.time(18, 45), "Room 101"),
                (WEDNESDAY, "MS-OFFICE", "teacher_msoffice", datetime.time(19, 0), datetime.time(21, 0), "Computer Lab 1"),
                (THURSDAY, "GRAPHIC-DES", "teacher_graphic", datetime.time(16, 45), datetime.time(18, 45), "Computer Lab 2"),
                (THURSDAY, "ADMIN-LEAD", "teacher_admin", datetime.time(19, 0), datetime.time(21, 0), "Room 101"),
            ]

            total_schedules_created = 0
            for batch, sdefs in [(batch42, b42_schedule_defs), (batch43, b43_schedule_defs)]:
                for dow, scode, t_login, s_time, e_time, room in sdefs:
                    sub = subjects_map[scode]
                    t_user = teachers_by_login[t_login]
                    sched, created = ClassSchedule.objects.get_or_create(
                        batch=batch,
                        subject=sub,
                        teacher_user=t_user,
                        day_of_week=dow,
                        start_time=s_time,
                        defaults={
                            "end_time": e_time,
                            "room": room,
                            "valid_from": batch.start_date,
                            "valid_to": batch.end_date,
                            "is_active": True,
                        },
                    )
                    if created:
                        total_schedules_created += 1

            # 12. Generate Published Class Sessions for Past 5 and Next 5 School Days
            dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
            today_dhaka = timezone.now().astimezone(dhaka_tz).date()

            past_school_days = []
            curr = today_dhaka - datetime.timedelta(days=1)
            while len(past_school_days) < 5:
                if date_to_day_of_week(curr) in [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY]:
                    past_school_days.append(curr)
                curr -= datetime.timedelta(days=1)
            past_school_days.reverse()

            next_school_days = []
            curr = today_dhaka
            while len(next_school_days) < (5 if date_to_day_of_week(today_dhaka) not in [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY] else 6):
                if date_to_day_of_week(curr) in [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY]:
                    next_school_days.append(curr)
                curr += datetime.timedelta(days=1)

            target_dates = sorted(list(set(past_school_days + next_school_days)))
            total_sessions_created = 0

            for target_date in target_dates:
                dow = date_to_day_of_week(target_date)
                for batch in [batch42, batch43]:
                    if target_date < batch.start_date or target_date > batch.end_date:
                        continue

                    schedules = ClassSchedule.objects.filter(batch=batch, day_of_week=dow, is_active=True)
                    for sched in schedules:
                        if ClassSession.objects.filter(
                            batch=batch,
                            subject=sched.subject,
                            session_date=target_date,
                            start_time=sched.start_time,
                        ).exists():
                            continue

                        topics = list(ClassTopic.objects.filter(subject=sched.subject, is_active=True).order_by("id"))
                        existing_count = ClassSession.objects.filter(
                            batch=batch,
                            subject=sched.subject,
                        ).count()
                        topic = topics[existing_count % len(topics)] if topics else None

                        now = timezone.now()
                        ClassSession.objects.create(
                            batch=batch,
                            subject=sched.subject,
                            teacher_user=sched.teacher_user,
                            topic=topic,
                            schedule=sched,
                            session_date=target_date,
                            start_time=sched.start_time,
                            end_time=sched.end_time,
                            audience=sched.subject.audience_type,
                            status=SessionStatus.PUBLISHED,
                            published_at=now,
                            created_by=admin_user,
                            description=topic.description if topic else "",
                            learning_objectives=topic.learning_objectives if topic else "",
                        )
                        total_sessions_created += 1

            # 13. Seed LearningFeedback and HelpRequests for Past Sessions (Sprint 4)
            past_sessions = ClassSession.objects.filter(
                session_date__lt=today_dhaka,
                status=SessionStatus.PUBLISHED,
            ).select_related("batch", "subject", "topic", "teacher_user")

            total_feedback_seeded = 0
            total_help_requests_seeded = 0
            hr_status_cycle = [HelpRequestStatus.PENDING, HelpRequestStatus.IN_PROGRESS, HelpRequestStatus.RESOLVED]
            hr_index = 0

            for session in past_sessions:
                eligible_students = Student.objects.filter(
                    enrollments__batch=session.batch,
                    enrollments__status=EnrollmentStatus.ACTIVE,
                    status=StudentStatus.ACTIVE,
                )
                if session.audience == SessionAudience.GENERAL:
                    eligible_students = eligible_students.filter(education_background=EducationBackground.GENERAL)
                elif session.audience == SessionAudience.MADRASA:
                    eligible_students = eligible_students.filter(
                        education_background__in=[EducationBackground.ALIYA, EducationBackground.QAWMI]
                    )

                submitted_dt = datetime.datetime.combine(session.session_date, session.end_time, tzinfo=dhaka_tz) + datetime.timedelta(minutes=15)

                for student in eligible_students:
                    # ~80% of students submit feedback
                    if (student.id + session.id) % 5 == 0:
                        continue

                    # Realistic distribution: mostly 4 and 5, some 3, occasionally 1 or 2
                    mod = (student.id * 7 + session.id * 11) % 10
                    if mod in [0, 1]:
                        rating = 5
                    elif mod in [2, 3, 4, 5]:
                        rating = 4
                    elif mod in [6, 7]:
                        rating = 3
                    elif mod == 8:
                        rating = 2
                    else:
                        rating = 1

                    needs_help = rating <= 2
                    student_comment = ""
                    if needs_help:
                        student_comment = (
                            f"Need further clarification on topic '{session.topic.title if session.topic else session.subject.name}'."
                        )
                    elif rating == 5:
                        student_comment = "Alhamdulillah, understood very well."

                    feedback, created = LearningFeedback.objects.get_or_create(
                        session=session,
                        student=student,
                        defaults={
                            "topic": session.topic,
                            "understanding_rating": rating,
                            "needs_help": needs_help,
                            "student_comment": student_comment,
                            "submitted_at": submitted_dt,
                        },
                    )
                    if created:
                        total_feedback_seeded += 1

                    if feedback.needs_help and not hasattr(feedback, "help_request"):
                        chosen_status = hr_status_cycle[hr_index % len(hr_status_cycle)]
                        hr_index += 1

                        in_prog_at = submitted_dt + datetime.timedelta(hours=1) if chosen_status != HelpRequestStatus.PENDING else None
                        res_at = submitted_dt + datetime.timedelta(hours=3) if chosen_status == HelpRequestStatus.RESOLVED else None
                        res_by = session.teacher_user if chosen_status == HelpRequestStatus.RESOLVED else None
                        note = "Reviewed problem areas together and provided practice exercise." if chosen_status == HelpRequestStatus.RESOLVED else ""

                        HelpRequest.objects.get_or_create(
                            feedback=feedback,
                            defaults={
                                "student": student,
                                "teacher_user": session.teacher_user,
                                "session": session,
                                "topic": session.topic,
                                "student_message": student_comment,
                                "teacher_note": note,
                                "status": chosen_status,
                                "created_at": submitted_dt,
                                "in_progress_at": in_prog_at,
                                "resolved_at": res_at,
                                "resolved_by": res_by,
                            },
                        )
                        total_help_requests_seeded += 1

            # 14. Seed Attendance Records for Past Sessions (Sprint 5)
            # Realistic attendance: mostly present, some late, some leave, some absent
            # Flag two specific students in Batch 42 for repeated absences:
            # - STD-2026-042-001: Trailing consecutive absences >= 3
            # - STD-2026-042-002: Total absences >= 5 (with last session present, so consecutive = 0)
            total_attendance_seeded = 0
            for session in past_sessions:
                eligible_students = Student.objects.filter(
                    enrollments__batch=session.batch,
                    enrollments__status=EnrollmentStatus.ACTIVE,
                    status=StudentStatus.ACTIVE,
                )
                if session.audience == SessionAudience.GENERAL:
                    eligible_students = eligible_students.filter(education_background=EducationBackground.GENERAL)
                elif session.audience == SessionAudience.MADRASA:
                    eligible_students = eligible_students.filter(
                        education_background__in=[EducationBackground.ALIYA, EducationBackground.QAWMI]
                    )

                session_start_dt = datetime.datetime.combine(session.session_date, session.start_time, tzinfo=dhaka_tz)

                for student in eligible_students:
                    if student.student_id_number == "STD-2026-042-001":
                        batch42_past_sessions = list(
                            past_sessions.filter(batch=session.batch).order_by("session_date", "start_time")
                        )
                        s_idx = batch42_past_sessions.index(session) if session in batch42_past_sessions else 0
                        if s_idx >= max(0, len(batch42_past_sessions) - 3):
                            att_status = AttendanceStatus.ABSENT
                            att_method = AttendanceMethod.AUTO_ABSENT
                            att_marked_by = session.teacher_user
                            att_reason = "Auto-marked absent upon session attendance finalization."
                            marked_dt = session_start_dt + datetime.timedelta(minutes=30)
                        else:
                            att_status = AttendanceStatus.PRESENT
                            att_method = AttendanceMethod.QR
                            att_marked_by = None
                            att_reason = ""
                            marked_dt = session_start_dt + datetime.timedelta(minutes=5)
                    elif student.student_id_number == "STD-2026-042-002":
                        batch42_past_sessions = list(
                            past_sessions.filter(batch=session.batch).order_by("session_date", "start_time")
                        )
                        s_idx = batch42_past_sessions.index(session) if session in batch42_past_sessions else 0
                        if s_idx in [1, 3, 5, 7, 9]:
                            att_status = AttendanceStatus.ABSENT
                            att_method = AttendanceMethod.AUTO_ABSENT
                            att_marked_by = session.teacher_user
                            att_reason = "Auto-marked absent upon session attendance finalization."
                            marked_dt = session_start_dt + datetime.timedelta(minutes=30)
                        else:
                            att_status = AttendanceStatus.PRESENT
                            att_method = AttendanceMethod.QR
                            att_marked_by = None
                            att_reason = ""
                            marked_dt = session_start_dt + datetime.timedelta(minutes=5)
                    else:
                        mod = (student.id * 13 + session.id * 17) % 20
                        if mod == 0:
                            att_status = AttendanceStatus.ABSENT
                            att_method = AttendanceMethod.AUTO_ABSENT
                            att_marked_by = session.teacher_user
                            att_reason = "Auto-marked absent upon session attendance finalization."
                            marked_dt = session_start_dt + datetime.timedelta(minutes=30)
                        elif mod == 1:
                            att_status = AttendanceStatus.APPROVED_LEAVE
                            att_method = AttendanceMethod.MANUAL
                            att_marked_by = session.teacher_user
                            att_reason = "Official leave request granted by coordinator."
                            marked_dt = session_start_dt + datetime.timedelta(hours=2)
                        elif mod in [2, 3]:
                            att_status = AttendanceStatus.LATE
                            att_method = AttendanceMethod.QR
                            att_marked_by = None
                            att_reason = ""
                            marked_dt = session_start_dt + datetime.timedelta(minutes=12)
                        else:
                            att_status = AttendanceStatus.PRESENT
                            att_method = AttendanceMethod.QR
                            att_marked_by = None
                            att_reason = ""
                            marked_dt = session_start_dt + datetime.timedelta(minutes=5)

                    _, created = AttendanceRecord.objects.get_or_create(
                        session=session,
                        student=student,
                        defaults={
                            "status": att_status,
                            "method": att_method,
                            "marked_at": marked_dt,
                            "marked_by": att_marked_by,
                            "reason": att_reason,
                        },
                    )
                    if created:
                        total_attendance_seeded += 1

        # Output Summary & Credentials
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Teacher-to-Subject Mapping in Both Batches ==="))
        for t_user, sub_codes in teacher_users:
            subs_str = ", ".join([subjects_map[code].name for code in sub_codes])
            self.stdout.write(f"• {t_user.full_name} ({t_user.login_id}) teaches: {subs_str}")

        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Staff Demo Login Credentials ==="))
        self.stdout.write(f"• Super Admin: login_id: admin01          | password: AdminPass2026!")
        self.stdout.write(f"• Coordinator: login_id: coord01          | password: CoordPass2026!")
        self.stdout.write(f"• Observer:    login_id: observer01       | password: ObserverPass2026!")
        self.stdout.write(f"• Teachers:    login_id: teacher_msoffice | password: TeacherPass2026! (and teacher_acct, teacher_admin, etc.)")

        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Sample Enrolled Student Credentials ==="))
        for student_id, full_name, b_name, edu_bg, pwd in student_credentials[:6]:
            self.stdout.write(f"• {student_id} | {full_name:<28} | {b_name} ({edu_bg:<7}) | password: {pwd}")
        self.stdout.write(f"... and 34 more students created across Batch 42 and Batch 43 (Total 40 students).")

        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Timetable & Session Seeding Summary ==="))
        self.stdout.write(f"• Total Class Schedules active: {ClassSchedule.objects.count()}")
        self.stdout.write(f"• Total Published Class Sessions generated: {ClassSession.objects.count()}")
        self.stdout.write(f"• Total LearningFeedback records seeded: {LearningFeedback.objects.count()}")
        self.stdout.write(f"• Total HelpRequest records seeded: {HelpRequest.objects.count()}")
        self.stdout.write(f"• Total Attendance records seeded: {AttendanceRecord.objects.count()}")
        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] Demo seeding complete! Safe to re-run at any time.\n"))
