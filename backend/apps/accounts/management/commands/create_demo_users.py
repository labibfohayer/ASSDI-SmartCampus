from django.core.management.base import BaseCommand
from apps.accounts.models import User, UserRole


class Command(BaseCommand):
    help = "Creates 1 dummy user per role for development and testing (Rule 6: Fake data only)."

    def handle(self, *args, **options):
        demo_users = [
            {
                "login_id": "admin01",
                "full_name": "Rahim SuperAdmin (Dummy)",
                "role": UserRole.SUPER_ADMIN,
                "email": "admin.demo@assdi.local",
                "phone": "01700000000",
                "password": "AdminPass2026!",
                "is_staff": True,
                "is_superuser": True,
            },
            {
                "login_id": "coord01",
                "full_name": "Karim Coordinator (Dummy)",
                "role": UserRole.COORDINATOR,
                "email": "coord.demo@assdi.local",
                "phone": "01700000001",
                "password": "CoordPass2026!",
                "is_staff": True,
                "is_superuser": False,
            },
            {
                "login_id": "teacher01",
                "full_name": "Masud Teacher (Dummy)",
                "role": UserRole.TEACHER,
                "email": "teacher.demo@assdi.local",
                "phone": "01700000002",
                "password": "TeacherPass2026!",
                "is_staff": False,
                "is_superuser": False,
            },
            {
                "login_id": "STD-2026-042-001",
                "full_name": "Abdullah Student (Dummy)",
                "role": UserRole.STUDENT,
                "email": None,
                "phone": "01700000003",
                "password": "StudentPass2026!",
                "is_staff": False,
                "is_superuser": False,
            },
        ]

        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Creating ASSDI Demo Users ==="))

        created_count = 0
        updated_count = 0

        for udata in demo_users:
            password = udata.pop("password")
            login_id = udata["login_id"]

            user, created = User.objects.get_or_create(
                login_id=login_id,
                defaults=udata,
            )

            # Always ensure password and active state match
            user.set_password(password)
            user.is_active = True
            user.must_change_password = False
            user.failed_login_attempts = 0
            user.locked_until = None
            for key, value in udata.items():
                setattr(user, key, value)
            user.save()

            if created:
                created_count += 1
                status_txt = self.style.SUCCESS("[CREATED]")
            else:
                updated_count += 1
                status_txt = self.style.WARNING("[UPDATED]")

            self.stdout.write(
                f"{status_txt} Role: {user.role:<12} | Login ID: {user.login_id:<16} | Password: {password}"
            )

        self.stdout.write(self.style.MIGRATE_HEADING("=================================\n"))
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully processed {len(demo_users)} demo users ({created_count} created, {updated_count} updated).\n"
            )
        )
