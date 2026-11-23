import datetime
import zoneinfo
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.db.models import Avg, Count, Q
from django.utils import timezone

from apps.academic.models import ClassTopic, Subject
from apps.accounts.models import User, UserRole
from apps.batches.models import Batch
from apps.class_sessions.models import ClassSession, SessionStatus
from apps.feedback.constants import rating_to_percentage
from apps.feedback.models import HelpRequest, HelpRequestStatus, LearningFeedback
from apps.students.models import EnrollmentStatus

DHAKA_TZ = zoneinfo.ZoneInfo("Asia/Dhaka")


class TeacherAISummaryService:
    """
    AI Weekly Teaching Summary & Recommendation Service.
    Analyzes student feedback, understanding bottlenecks, and help requests for a teacher's
    assigned sessions over the past 7 days / weekly cycle (targeted for Thursday delivery).
    Provides actionable 2-minute pedagogical recommendations to optimize upcoming classes.
    """

    @classmethod
    def get_weekly_summary(
        cls,
        teacher_user: User,
        target_date: Optional[datetime.date] = None,
        refresh: bool = False,
    ) -> Dict[str, Any]:
        now_dhaka = timezone.now().astimezone(DHAKA_TZ)
        if target_date is None:
            target_date = now_dhaka.date()

        # In Bangladesh school cycle, Thursday (day 3 in Monday=0, or Thursday as delivery peak)
        # We look back 7 days ending at target_date
        start_date = target_date - datetime.timedelta(days=6)
        end_date = target_date

        is_thursday = target_date.weekday() == 3  # 3 = Thursday (0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun)

        # 1. Fetch Teacher's Sessions in this date window
        sessions_qs = ClassSession.objects.filter(
            teacher_user=teacher_user,
            session_date__gte=start_date,
            session_date__lte=end_date,
        ).exclude(status=SessionStatus.CANCELLED).select_related("batch", "subject", "topic")

        session_ids = list(sessions_qs.values_list("id", flat=True))

        # 2. Fetch Feedbacks for these sessions
        feedbacks_qs = LearningFeedback.objects.filter(
            session_id__in=session_ids
        ).select_related("student", "topic", "session__batch", "session__subject")

        # 3. Fetch Help Requests for these sessions
        help_requests_qs = HelpRequest.objects.filter(
            teacher_user=teacher_user,
            feedback__session_id__in=session_ids,
        ).select_related("student", "feedback__topic", "feedback__session__batch")

        # Compute Summary Metrics
        total_sessions = len(session_ids)
        total_batches = sessions_qs.values("batch_id").distinct().count()
        total_feedbacks = feedbacks_qs.count()

        avg_rating_raw = feedbacks_qs.aggregate(avg=Avg("understanding_rating"))["avg"]
        avg_rating = round(float(avg_rating_raw), 2) if avg_rating_raw else 0.0
        avg_percentage = round(avg_rating * 20.0, 1) if avg_rating > 0 else 0.0

        total_help_requests = help_requests_qs.count()
        pending_help_requests = help_requests_qs.filter(
            status__in=[HelpRequestStatus.PENDING, HelpRequestStatus.IN_PROGRESS]
        ).count()
        resolved_help_requests = help_requests_qs.filter(
            status=HelpRequestStatus.RESOLVED
        ).count()

        # Health status indicator
        if avg_rating >= 4.0:
            overall_health = "চমৎকার (Excellent)"
            health_color = "emerald"
        elif avg_rating >= 3.2:
            overall_health = "সন্তোষজনক (Satisfactory)"
            health_color = "blue"
        elif avg_rating > 0:
            overall_health = "বিশেষ মনোযোগ প্রয়োজন (Needs Attention)"
            health_color = "amber"
        else:
            overall_health = "তথ্য প্রতীক্ষিত (No Data Yet)"
            health_color = "slate"

        # 4. Analyze Topic Understanding Bottlenecks (Topics where students struggled)
        topic_stats = {}
        for fb in feedbacks_qs:
            topic_key = fb.topic_id
            if topic_key not in topic_stats:
                topic_title = fb.topic.title if fb.topic else "সাধারণ বিষয় (General Topic)"
                subject_name = fb.session.subject.name if fb.session and fb.session.subject else "বিষয়"
                batch_name = fb.session.batch.name if fb.session and fb.session.batch else "ব্যাচ"
                topic_stats[topic_key] = {
                    "topic_id": topic_key,
                    "topic_title": topic_title,
                    "subject_name": subject_name,
                    "batch_name": batch_name,
                    "total_feedbacks": 0,
                    "rating_sum": 0,
                    "low_ratings_count": 0,  # 1 or 2 stars
                    "help_requests_count": 0,
                    "comments": [],
                }

            topic_stats[topic_key]["total_feedbacks"] += 1
            topic_stats[topic_key]["rating_sum"] += fb.understanding_rating
            if fb.understanding_rating <= 2:
                topic_stats[topic_key]["low_ratings_count"] += 1
            if fb.student_comment and len(fb.student_comment.strip()) > 3:
                topic_stats[topic_key]["comments"].append(fb.student_comment.strip())

        # Map help request counts to topics
        for hr in help_requests_qs:
            if hr.feedback and hr.feedback.topic_id in topic_stats:
                topic_stats[hr.feedback.topic_id]["help_requests_count"] += 1

        # Calculate averages and struggle index
        struggling_topics: List[Dict[str, Any]] = []
        for t_data in topic_stats.values():
            cnt = t_data["total_feedbacks"]
            if cnt > 0:
                t_avg = round(t_data["rating_sum"] / cnt, 2)
                t_pct = round(t_avg * 20.0, 1)
                low_ratio = t_data["low_ratings_count"] / cnt
                # Struggle index: higher means students struggled more
                struggle_score = round(
                    ((5.0 - t_avg) * 20.0) + (low_ratio * 50.0) + (t_data["help_requests_count"] * 10.0),
                    1,
                )

                if t_pct < 55 or low_ratio >= 0.3 or t_data["help_requests_count"] >= 2:
                    difficulty_level = "উচ্চ জটিলতা (Critical)"
                    difficulty_color = "red"
                elif t_pct < 75 or low_ratio >= 0.15:
                    difficulty_level = "মাঝারি জটিলতা (Moderate)"
                    difficulty_color = "amber"
                else:
                    difficulty_level = "সহজবোধ্য (Understood)"
                    difficulty_color = "emerald"

                struggling_topics.append({
                    "topic_id": t_data["topic_id"],
                    "topic_title": t_data["topic_title"],
                    "subject_name": t_data["subject_name"],
                    "batch_name": t_data["batch_name"],
                    "feedbacks_count": cnt,
                    "avg_rating": t_avg,
                    "understanding_percentage": t_pct,
                    "low_understanding_count": t_data["low_ratings_count"],
                    "help_requests_count": t_data["help_requests_count"],
                    "struggle_score": struggle_score,
                    "difficulty_level": difficulty_level,
                    "difficulty_color": difficulty_color,
                    "sample_comments": t_data["comments"][:3],
                })

        # Sort struggling topics so the hardest ones are at the top
        struggling_topics.sort(key=lambda x: x["struggle_score"], reverse=True)

        # 5. Attention Students (Students who scored low or have unresolved help requests)
        attention_students: List[Dict[str, Any]] = []
        seen_students = set()

        for hr in help_requests_qs:
            std = hr.student
            if std.id not in seen_students:
                seen_students.add(std.id)
                session_obj = hr.feedback.session if hr.feedback else None
                topic_title = (
                    hr.feedback.topic.title
                    if hr.feedback and hr.feedback.topic
                    else (session_obj.subject.name if session_obj else "সাধারণ")
                )
                attention_students.append({
                    "student_id": std.id,
                    "student_name": std.user.full_name,
                    "student_id_number": std.student_id_number,
                    "batch_name": std.enrollments.filter(status=EnrollmentStatus.ACTIVE).first().batch.name
                    if std.enrollments.filter(status=EnrollmentStatus.ACTIVE).exists()
                    else "SBMC",
                    "reason": f"সহায়তা আবেদন: {hr.student_message[:80]}..."
                    if hr.student_message
                    else "শিক্ষকের সরাসরি সাহায্য চেয়েছে",
                    "status": hr.status,
                    "topic_title": topic_title,
                })
            if len(attention_students) >= 5:
                break

        # 6. Generate Actionable AI Teaching Recommendations (২ মিনিটের নির্দেশিকা)
        ai_recommendations: List[Dict[str, Any]] = []

        if struggling_topics:
            hardest = struggling_topics[0]
            if hardest["struggle_score"] > 30:
                ai_recommendations.append({
                    "id": "rec-1-bottleneck",
                    "category": "urgent_review",
                    "title": f"পরবর্তী ক্লাসে '{hardest['topic_title']}'-এর ওপর ৫-১০ মিনিটের লাইভ ডেমো",
                    "description": (
                        f"এই সপ্তাহে '{hardest['topic_title']}' টপিকে শিক্ষার্থীদের বোঝার গড় হার ছিল {hardest['understanding_percentage']}% "
                        f"এবং {hardest['low_understanding_count']} জন শিক্ষার্থী জটিলতার কথা জানিয়েছে। "
                        f"ক্লাসের শুরুতে বাস্তব উদাহরণ বা হ্যান্ডস-অন অনুশীলনের মাধ্যমে বিষয়টি সংক্ষেপে ঝালাই করে নিন।"
                    ),
                    "action_label": "রিভিউ প্ল্যান করুন",
                    "priority": "high",
                    "icon": "target",
                })

        if pending_help_requests > 0:
            ai_recommendations.append({
                "id": "rec-2-help-qa",
                "category": "help_resolution",
                "title": f"{pending_help_requests}টি অমীমাংসিত হেল্প রিকোয়েস্ট সমাধান",
                "description": (
                    f"শিক্ষার্থীরা ক্লাসের বিভিন্ন বিষয়ে সরাসরি আপনার নির্দেশনা চেয়েছে। "
                    f"পরবর্তী ক্লাসের প্রশ্নোত্তর পর্বে অথবা ল্যাব আওয়ারে তাদের নির্দিষ্ট প্রশ্নগুলো অ্যাড্রেস করলে শিক্ষার্থীদের আত্মবিশ্বাস বাড়বে।"
                ),
                "action_label": "রিকোয়েস্ট দেখুন",
                "priority": "high" if pending_help_requests >= 3 else "medium",
                "icon": "help-circle",
            })

        # Add pedagogical pacing and peer learning recommendation
        if total_feedbacks > 0:
            ai_recommendations.append({
                "id": "rec-3-peer-learning",
                "category": "pedagogy",
                "title": "পেয়ার লার্নিং (Pair-learning) ও গ্রুপ অনুশীলনের সুযোগ দিন",
                "description": (
                    "যেসব শিক্ষার্থী টপিকটি দ্রুত আয়ত্ত করেছে, তাদের সাথে তুলনামূলক ধীরগতির শিক্ষার্থীদের জোড়ায় বসিয়ে "
                    "ছোট প্র্যাক্টিকাল টাস্ক দিন। এতে উভয় পক্ষের বোঝার গভীরতা বৃদ্ধি পায়।"
                ),
                "action_label": "গ্রুপ গঠন",
                "priority": "medium",
                "icon": "users",
            })

        # Commendation for mastered topic if exists
        mastered_topics = [t for t in struggling_topics if t["understanding_percentage"] >= 80]
        if mastered_topics:
            best_topic = mastered_topics[-1]  # highest score
            ai_recommendations.append({
                "id": "rec-4-momentum",
                "category": "positive_momentum",
                "title": f"'{best_topic['topic_title']}'-এ দারুণ অগ্রগতি ধরে রাখুন",
                "description": (
                    f"শিক্ষার্থীরা এই টপিকটি চমৎকারভাবে (গড় {best_topic['understanding_percentage']}%) বুঝতে পেরেছে। "
                    f"তাদের আগ্রহ ধরে রাখতে একটি ছোট চ্যালেঞ্জিং হোম-প্র্যাকটিস টাস্ক বা প্রজেক্ট প্রম্পট দিতে পারেন।"
                ),
                "action_label": "অ্যাডভান্সড টাস্ক দিন",
                "priority": "low",
                "icon": "check-circle",
            })

        # If no recommendations yet (e.g. no feedbacks in week)
        if not ai_recommendations:
            ai_recommendations.append({
                "id": "rec-baseline",
                "category": "baseline",
                "title": "নতুন সপ্তাহের পাঠ পরিকল্পনা তৈরি",
                "description": "চলতি সপ্তাহে এখনো পর্যাপ্ত ফিডব্যাক জমা পড়েনি। ক্লাস শেষে শিক্ষার্থীদের ১০-১৫ সেকেন্ডের ফিডব্যাক দিতে উৎসাহিত করুন যাতে নিখুঁত এআই ইনসাইট পাওয়া যায়।",
                "action_label": "রুটিন দেখুন",
                "priority": "low",
                "icon": "sparkles",
            })

        week_label_bn = f"{start_date.strftime('%d %b')} – {end_date.strftime('%d %b, %Y')}"

        return {
            "teacher_id": teacher_user.id,
            "teacher_name": teacher_user.full_name or teacher_user.login_id,
            "week_label": week_label_bn,
            "start_date": str(start_date),
            "end_date": str(end_date),
            "is_thursday": is_thursday,
            "read_time_minutes": 2,
            "generated_at": now_dhaka.isoformat(),
            "summary_metrics": {
                "total_sessions": total_sessions,
                "total_batches": total_batches,
                "total_feedbacks": total_feedbacks,
                "average_rating": avg_rating,
                "average_percentage": avg_percentage,
                "total_help_requests": total_help_requests,
                "pending_help_requests": pending_help_requests,
                "resolved_help_requests": resolved_help_requests,
                "overall_health": overall_health,
                "health_color": health_color,
            },
            "top_struggling_topics": struggling_topics[:4],
            "attention_students": attention_students,
            "ai_recommendations": ai_recommendations,
        }
