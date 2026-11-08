from django.core.management.base import BaseCommand
from academics.models import Course


class Command(BaseCommand):
    help = "Seed the complete NMC nursing curriculum for all programs, levels, and semesters"

    def handle(self, *args, **options):
        # Standard NMC diploma curriculum structure
        # Format: (base_code, title, category, level, semester)
        CURRICULUM = [
            # ============ LEVEL 100 - SEMESTER 1 ============
            ("BNS-111", "Basic Nursing", "FUNDAMENTALS", 100, "S1"),
            ("HAP-111", "Human Anatomy & Physiology I", "ANATOMY", 100, "S1"),
            ("MIP-111", "Microbiology & Infection Prevention", "FUNDAMENTALS", 100, "S1"),
            ("NMI-111", "Nursing Informatics", "FUNDAMENTALS", 100, "S1"),
            ("TCM-111", "Therapeutic Communication", "FUNDAMENTALS", 100, "S1"),
            ("ADJ-111", "Professional Adjustment in Nursing", "ETHICS", 100, "S1"),
            ("FED-111", "First Aid, Emergency & Disaster Mgmt", "FUNDAMENTALS", 100, "S1"),

            # ============ LEVEL 100 - SEMESTER 2 ============
            ("AND-122", "Advanced Nursing I", "FUNDAMENTALS", 100, "S2"),
            ("BHS-122", "Behavioral Sciences", "MENTAL_HEALTH", 100, "S2"),
            ("CPA-122", "Child Protection and Abuse", "MATERNAL_CHILD", 100, "S2"),
            ("HAP-122", "Human Anatomy & Physiology II", "ANATOMY", 100, "S2"),
            ("NAD-122", "Nutrition and Dietetics", "COMMUNITY", 100, "S2"),
            ("NPN-122", "Nursing Process", "FUNDAMENTALS", 100, "S2"),

            # ============ LEVEL 200 - SEMESTER 1 ============
            ("MMN-211", "Medicine and Medical Nursing I", "MEDSURG", 200, "S1"),
            ("OBN-211", "Obstetric Nursing", "MATERNAL_CHILD", 200, "S1"),
            ("PAD-211", "Paediatric Nursing I", "MATERNAL_CHILD", 200, "S1"),
            ("PFC-211", "Patient/Family-Centred Care Study", "FUNDAMENTALS", 200, "S1"),
            ("PTP-211", "Pharmacology & Therapeutics I", "PHARMACOLOGY", 200, "S1"),
            ("ADN-211", "Advanced Nursing II", "FUNDAMENTALS", 200, "S1"),
            ("GHN-211", "Gerontology and Home Nursing", "COMMUNITY", 200, "S1"),

            # ============ LEVEL 200 - SEMESTER 2 ============
            ("MMN-222", "Medicine and Medical Nursing II", "MEDSURG", 200, "S2"),
            ("PAD-222", "Paediatric Nursing II", "MATERNAL_CHILD", 200, "S2"),
            ("PTP-222", "Pharmacology & Therapeutics II", "PHARMACOLOGY", 200, "S2"),
            ("PSN-222", "Psychiatric Nursing", "MENTAL_HEALTH", 200, "S2"),
            ("PHN-222", "Public Health Nursing", "COMMUNITY", 200, "S2"),
            ("NUR-222", "Nursing Research", "FUNDAMENTALS", 200, "S2"),

            # ============ LEVEL 300 - SEMESTER 1 ============
            ("MMN-311", "Medicine and Medical Nursing III", "MEDSURG", 300, "S1"),
            ("OBN-311", "Obstetric Nursing", "MATERNAL_CHILD", 300, "S1"),
            ("PAD-311", "Paediatric Nursing I", "MATERNAL_CHILD", 300, "S1"),
            ("PFC-311", "Patient/Family-Centred Care Study", "FUNDAMENTALS", 300, "S1"),
            ("NPN-311", "Nursing Process", "FUNDAMENTALS", 300, "S1"),
            ("AND-311", "Advanced Nursing III", "FUNDAMENTALS", 300, "S1"),

            # ============ LEVEL 300 - SEMESTER 2 ============
            ("CBR-322", "Community-Based Rehabilitation", "COMMUNITY", 300, "S2"),
            ("CTM-322", "Complementary & Traditional Medicine", "COMMUNITY", 300, "S2"),
            ("PAD-322", "Paediatric Nursing II", "MATERNAL_CHILD", 300, "S2"),
            ("PHN-322", "Public Health Nursing", "COMMUNITY", 300, "S2"),
            ("RMS-322", "Relationship Marketing & Entrepreneurship", "ETHICS", 300, "S2"),
        ]

        PROGRAMS = ["GENERAL", "MIDWIFERY", "PSYCHIATRIC", "COMMUNITY"]

        created_count = 0
        skipped_count = 0

        for program in PROGRAMS:
            for base_code, title, category, level, semester in CURRICULUM:
                # Unique code per program to prevent duplicate key errors
                # e.g. BNS-111-G for General, BNS-111-M for Midwifery
                unique_code = f"{base_code}-{program[0]}"
                obj, created = Course.objects.get_or_create(
                    code=unique_code,
                    defaults={
                        "title": title,
                        "category": category,
                        "level": level,
                        "program": program,
                        "semester": semester,
                    },
                )
                if created:
                    created_count += 1
                else:
                    skipped_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"✅ Curriculum seeded. Created: {created_count}, Skipped (already existed): {skipped_count}"
            )
        )
        self.stdout.write(
            self.style.SUCCESS(f"📊 Total courses in database: {Course.objects.count()}")
        )