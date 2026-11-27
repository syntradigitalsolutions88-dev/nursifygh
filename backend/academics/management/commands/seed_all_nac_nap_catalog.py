from django.core.management.base import BaseCommand
from academics.models import Course

CATALOG = [
    # ── NAC Level 100 S1 ───────────────────────────────────────────
    ("NAC-111", "Introductory Human Anatomy & Physiology I", "ANATOMY", 100, "NAC", "S1", "Cells, tissues, skeletal, muscular, and cardiovascular systems for Nurse Assistant Clinical students."),
    ("NAC-113", "Introductory Nursing I (Basic Bedside Care & Vital Signs)", "FUNDAMENTALS", 100, "NAC", "S1", "Bed making, hygiene, vital signs, patient positioning, comfort, and admission/discharge procedures."),
    ("NAC-115", "Infection Prevention & Control", "FUNDAMENTALS", 100, "NAC", "S1", "GHS IPC standards, hand hygiene, PPE, sterilization/HLD, waste segregation, and sharps safety."),
    ("ADJ-111-NAC", "Introductory Professional Adjustment & Ethics", "ETHICS", 100, "NAC", "S1", "N&MC Ghana code of ethics, scope of practice for NACs, patient rights, and Health Professions Act 857."),
    ("ITC-111-NAC", "Introductory Therapeutic Communication & Behavioural Sciences", "ETHICS", 100, "NAC", "S1", "Nurse-patient communication, cultural sensitivity in Ghana, active listening, and basic psychology."),
    # ── NAC Level 100 S2 ───────────────────────────────────────────
    ("NAC-122", "Introductory Human Anatomy & Physiology II", "ANATOMY", 100, "NAC", "S2", "Respiratory, digestive, urinary, nervous, endocrine, and reproductive systems."),
    ("NAC-124", "Introductory Nursing II (Elimination, Nutrition & Specimen Care)", "FUNDAMENTALS", 100, "NAC", "S2", "Assisted feeding, intake & output charting, bowel/bladder elimination, and laboratory specimen collection."),
    ("FAD-122-NAC", "First Aid, Emergency & Disaster Nursing", "FUNDAMENTALS", 100, "NAC", "S2", "BLS/CPR, choking, hemorrhage control, shock, burns, fractures, snakebite, poisoning, and triage."),
    ("PHM-122-NAC", "Basic Pharmacology & Medication Assistance", "PHARMACOLOGY", 100, "NAC", "S2", "Rights of medication, oral/topical administration assistance, dosage checks, and adverse drug reporting."),
    # ── NAC Level 200 S1 ───────────────────────────────────────────
    ("NAC-211", "Introductory Medical Nursing", "MED_SURG", 200, "NAC", "S1", "Bedside nursing care for malaria, hypertension, diabetes, pneumonia, anemia, and stroke patients."),
    ("NAC-213", "Introductory Surgical Nursing & Wound Care", "MED_SURG", 200, "NAC", "S1", "Pre- and post-operative care, aseptic wound dressing, oxygen therapy monitoring, and pain support."),
    ("MCH-211-NAC", "Introductory Maternal & Child Health Nursing", "MATERNAL", 200, "NAC", "S1", "Antenatal support, postnatal ward care, newborn thermal protection, and pediatric nursing basics."),
    ("PSY-211-NAC", "Introductory Psychiatric / Mental Health Nursing", "MENTAL", 200, "NAC", "S1", "Mental Health Act 2012 (Act 846), therapeutic milieu, safety observation, and de-escalation support."),
    # ── NAC Level 200 S2 ───────────────────────────────────────────
    ("NAC-222", "Advanced Bedside Care & Theatre Assistance", "MED_SURG", 200, "NAC", "S2", "Operating theatre etiquette, sterile field assistance, catheter care, and palliative/last offices care."),
    ("PHN-222-NAC", "Introductory Public Health & Preventive Nursing", "COMMUNITY", 200, "NAC", "S2", "Primary health care, disease prevention, sanitation, and outpatient health education."),
    ("NMI-222-NAC", "Ward Administration, Documentation & Health Informatics", "ETHICS", 200, "NAC", "S2", "Accurate ward charting, LHIMS/DHIMS2 basics, inventory care, and interprofessional teamwork."),

    # ── NAP Level 100 S1 ───────────────────────────────────────────
    ("NAP-111", "Foundations of Community Health & CHPS Operations", "COMMUNITY", 100, "NAP", "S1", "Ghana CHPS policy, community entry, primary health care, and sub-district health structure."),
    ("ANP-111-NAP", "Introductory Human Anatomy & Physiology", "ANATOMY", 100, "NAP", "S1", "Overview of human body structure and function relevant to preventive and community care."),
    ("BNP-111-NAP", "Basic Nursing Care & Infection Prevention", "FUNDAMENTALS", 100, "NAP", "S1", "Vital signs, basic bedside care, GHS IPC protocols, waste segregation, and safe injections."),
    ("ADJ-111-NAP", "Professional Adjustment, Ethics & Therapeutic Communication", "ETHICS", 100, "NAP", "S1", "N&MC regulation for NAPs, community counseling skills, confidentiality, and professional conduct."),
    # ── NAP Level 100 S2 ───────────────────────────────────────────
    ("EPI-122-NAP", "Expanded Programme on Immunization (EPI) & Cold Chain", "COMMUNITY", 100, "NAP", "S2", "Ghana EPI schedule, +2°C to +8°C cold chain, VVM, shake test, AEFI, and defaulter tracing."),
    ("NUT-122-NAP", "Community Nutrition & Child Growth Monitoring (CWC)", "MATERNAL", 100, "NAP", "S2", "CWC growth charting, IYCF, MUAC screening, Vitamin A supplementation, and CMAM referral."),
    ("ENV-122-NAP", "Personal & Environmental Sanitation", "COMMUNITY", 100, "NAP", "S2", "Safe water treatment, CLTS/ODF sanitation, refuse disposal, food hygiene, and vector control."),
    ("FAD-122-NAP", "First Aid, Emergency Care & Basic Pharmacology", "FUNDAMENTALS", 100, "NAP", "S2", "Community emergency first aid, CPR, snakebite, burns, and essential medicines list basics."),
    # ── NAP Level 200 S1 ───────────────────────────────────────────
    ("HVT-211-NAP", "Home Visiting, Family Health & Community Mobilization", "COMMUNITY", 200, "NAP", "S1", "Phases of home visiting, family health assessment, community durbars, and health volunteers."),
    ("RCH-211-NAP", "Reproductive & Child Health (ANC, Postnatal & Family Planning)", "MATERNAL", 200, "NAP", "S1", "Focused ANC danger signs, birth preparedness, postnatal home visits, and family planning counseling."),
    ("DIS-211-NAP", "Communicable Disease Control & IDSR Surveillance", "COMMUNITY", 200, "NAP", "S1", "IDSR priority diseases, cholera, malaria, TB/HIV contact tracing, and outbreak notification."),
    ("HPR-211-NAP", "Health Promotion, BCC & School Health Services", "COMMUNITY", 200, "NAP", "S1", "Behaviour Change Communication (BCC), school health screening, deworming, and adolescent health."),
    # ── NAP Level 200 S2 ───────────────────────────────────────────
    ("MCH-222-NAP", "Integrated Management of Neonatal & Childhood Illnesses (IMNCI)", "MATERNAL", 200, "NAP", "S2", "IMNCI danger signs, ORS/zinc diarrhea management, pneumonia recognition, and urgent referral."),
    ("PSY-222-NAP", "Community Mental Health & Rehabilitation", "MENTAL", 200, "NAP", "S2", "Mental Health Act 846, stigma reduction, community-based rehabilitation, and substance abuse prevention."),
    ("NCD-222-NAP", "Non-Communicable Diseases & Geriatric Home Care", "MED_SURG", 200, "NAP", "S2", "Community hypertension and diabetes screening, lifestyle modification, and elderly home care."),
    ("DHM-222-NAP", "CHPS Administration, DHIMS2 Reporting & Health Law", "ETHICS", 200, "NAP", "S2", "CHPS register management, DHIMS2 monthly data collation, Public Health Act 851, and outreach logistics."),
]


class Command(BaseCommand):
    help = "Seed all 32 N&MC Ghana Level 100 & Level 200 courses for NAC and NAP."

    def handle(self, *args, **options):
        created = 0
        for code, title, category, level, program, semester, desc in CATALOG:
            _, was_created = Course.objects.update_or_create(
                code=code,
                level=level,
                defaults={
                    "title": title,
                    "category": category,
                    "program": program,
                    "semester": semester,
                    "description": desc,
                    "is_published": True,
                },
            )
            if was_created:
                created += 1

        self.stdout.write(
            self.style.SUCCESS(f"Catalog ready: {created} new courses created ({len(CATALOG)} total NAC/NAP courses).")
        )
