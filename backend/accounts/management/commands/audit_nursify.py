"""Management command to audit payments, ambassadors, referrals, and content."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Count, Q, Sum
from django.utils import timezone

from academics.models import Course, Flashcard, FlashcardReview, Question, QuizAttempt
from accounts.models import AmbassadorCommission, ClinicalLog, ClinicalSkill
from payments.models import PaymentStatus, PaymentTransaction

User = get_user_model()


class Command(BaseCommand):
    help = "Print a full payment, ambassador commission, referral, and content audit."

    def add_arguments(self, parser):
        parser.add_argument(
            "--unpaid-only",
            action="store_true",
            help="Highlight only unpaid commissions and pending/awaiting payment reviews.",
        )

    def handle(self, *args, **options):
        unpaid_only = options["unpaid_only"]
        now = timezone.now()

        self.stdout.write(self.style.SUCCESS("=== NURSIFY GH FULL AUDIT ==="))
        self.stdout.write(f"Generated at: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}\n")

        # 1. USERS & SUBSCRIPTIONS
        total_users = User.objects.count()
        paid_users = User.objects.filter(has_paid=True).count()
        subscribed_users = User.objects.filter(is_subscribed=True).count()
        active_subs = User.objects.filter(
            is_subscribed=True, subscription_expires_at__gt=now
        ).count()
        trial_users = User.objects.filter(
            is_subscribed=True, has_paid=False, subscription_expires_at__gt=now
        ).count()

        self.stdout.write(self.style.NOTICE("1. USERS & SUBSCRIPTIONS"))
        self.stdout.write(
            f"   Total Users: {total_users} | Paid: {paid_users} | "
            f"Active Subs: {active_subs} (Trial: {trial_users}) | Flagged Subscribed: {subscribed_users}"
        )

        # 2. PAYMENTS & APPROVAL QUEUE
        self.stdout.write(self.style.NOTICE("\n2. PAYMENTS & APPROVAL QUEUE"))
        txn_breakdown = (
            PaymentTransaction.objects.values("status", "provider")
            .annotate(txn_count=Count("id"), total_ghs=Sum("amount_ghs"))
            .order_by("status", "provider")
        )
        if txn_breakdown:
            for row in txn_breakdown:
                self.stdout.write(
                    f"   - [{row['status']} / {row['provider']}]: "
                    f"{row['txn_count']} txn(s) — GHS {(row['total_ghs'] or 0):.2f}"
                )
        else:
            self.stdout.write("   No payment transactions found.")

        review_qs = PaymentTransaction.objects.select_related("student").filter(
            status__in=[PaymentStatus.AWAITING_REVIEW, PaymentStatus.PENDING]
        ).order_by("-initiated_at")

        if review_qs.exists():
            self.stdout.write(self.style.WARNING(f"   Actionable / Pending Transactions ({review_qs.count()}):"))
            for txn in review_qs:
                phone = txn.student.phone_number or "no-phone"
                ref_by = txn.student.referred_by or "none"
                manual_ref = txn.manual_reference or "—"
                self.stdout.write(
                    f"     * {txn.status} | {txn.student.email} ({phone}) | "
                    f"GHS {txn.amount_ghs:.2f} | manual_ref={manual_ref} | "
                    f"txn_ref={txn.reference} | referred_by={ref_by}"
                )
        elif not unpaid_only:
            self.stdout.write("   No transactions awaiting review or pending.")

        # 3. AMBASSADORS, REFERRALS & COMMISSIONS
        self.stdout.write(self.style.NOTICE("\n3. AMBASSADORS, REFERRALS & COMMISSIONS"))
        ambassadors = User.objects.filter(is_ambassador=True).order_by("-date_joined")
        referred_signups = User.objects.exclude(referred_by__isnull=True).exclude(referred_by="")

        comm_summary = AmbassadorCommission.objects.aggregate(
            total_rows=Count("id"),
            total_ghs=Sum("amount_ghs"),
            unpaid_rows=Count("id", filter=Q(is_paid_out=False)),
            unpaid_ghs=Sum("amount_ghs", filter=Q(is_paid_out=False)),
            paid_rows=Count("id", filter=Q(is_paid_out=True)),
            paid_ghs=Sum("amount_ghs", filter=Q(is_paid_out=True)),
        )

        self.stdout.write(
            f"   Ambassadors: {ambassadors.count()} | Referred Signups: {referred_signups.count()}"
        )
        self.stdout.write(
            f"   Commissions: {comm_summary['total_rows']} total (GHS {(comm_summary['total_ghs'] or 0):.2f}) | "
            f"Unpaid: {comm_summary['unpaid_rows']} (GHS {(comm_summary['unpaid_ghs'] or 0):.2f}) | "
            f"Paid Out: {comm_summary['paid_rows']} (GHS {(comm_summary['paid_ghs'] or 0):.2f})"
        )

        for amb in ambassadors:
            comms = AmbassadorCommission.objects.filter(ambassador=amb)
            unpaid_amt = comms.filter(is_paid_out=False).aggregate(s=Sum("amount_ghs"))["s"] or 0
            paid_amt = comms.filter(is_paid_out=True).aggregate(s=Sum("amount_ghs"))["s"] or 0
            refs_count = (
                User.objects.filter(referred_by__iexact=amb.referral_code).count()
                if amb.referral_code
                else 0
            )
            if unpaid_only and unpaid_amt == 0:
                continue
            self.stdout.write(
                f"   - {amb.full_name} <{amb.email}> | phone={amb.phone_number or '—'} | "
                f"code={amb.referral_code or 'MISSING'} | referrals={refs_count} | "
                f"unpaid=GHS {unpaid_amt:.2f} | paid=GHS {paid_amt:.2f}"
            )

        # Check for paid referred students missing a commission entry
        amb_codes = {
            (code or "").strip().upper(): amb_id
            for amb_id, code in User.objects.filter(
                is_ambassador=True, referral_code__isnull=False
            ).exclude(referral_code="").values_list("id", "referral_code")
        }
        commissioned_student_ids = set(
            AmbassadorCommission.objects.filter(referred_student__isnull=False).values_list(
                "referred_student_id", flat=True
            )
        )
        missing_commissions = []
        for student in User.objects.filter(
            has_paid=True, referred_by__isnull=False
        ).exclude(referred_by="").only("id", "email", "referred_by"):
            code_key = (student.referred_by or "").strip().upper()
            if code_key in amb_codes and student.id not in commissioned_student_ids:
                missing_commissions.append(student)

        if missing_commissions:
            self.stdout.write(
                self.style.WARNING(
                    f"   Warning: {len(missing_commissions)} paid referred student(s) have no commission record:"
                )
            )
            for s in missing_commissions:
                self.stdout.write(f"     * {s.email} (referred_by={s.referred_by})")
        elif not unpaid_only:
            self.stdout.write("   Referral attribution check: All paid referred students with valid ambassador codes have commissions.")

        # 4. CLINICALS & ACADEMICS CONTENT
        self.stdout.write(self.style.NOTICE("\n4. CLINICALS & ACADEMICS CONTENT"))
        courses_cnt = Course.objects.count()
        pub_courses_cnt = Course.objects.filter(is_published=True).count()
        q_total = Question.objects.count()
        q_approved = Question.objects.filter(review_status="APPROVED", is_published=True).count()
        q_pending = Question.objects.filter(review_status="PENDING").count()
        q_rejected = Question.objects.filter(review_status="REJECTED").count()
        attempts_cnt = QuizAttempt.objects.count()
        flashcards_cnt = Flashcard.objects.count()
        reviews_cnt = FlashcardReview.objects.count()
        skills_cnt = ClinicalSkill.objects.count()
        logs_cnt = ClinicalLog.objects.count()

        self.stdout.write(
            f"   Courses: {courses_cnt} (Published: {pub_courses_cnt}) | "
            f"Questions: {q_total} (Approved: {q_approved}, Pending: {q_pending}, Rejected: {q_rejected})"
        )
        self.stdout.write(
            f"   Quiz Attempts: {attempts_cnt} | Flashcards: {flashcards_cnt} | "
            f"Flashcard Reviews: {reviews_cnt} | Clinical Skills: {skills_cnt} | Clinical Logs: {logs_cnt}"
        )
        self.stdout.write(self.style.SUCCESS("\n=== AUDIT COMPLETE ==="))
