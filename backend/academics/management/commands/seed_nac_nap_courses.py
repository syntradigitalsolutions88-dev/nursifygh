from django.core.management.base import BaseCommand
from academics.models import Choice, Course, Question


NAC_NAP_COURSES = [
    # ── NAC: Level 100 ─────────────────────────────────────────────
    {
        "code": "FNP-111-NAC",
        "title": "Basic Nursing Principles & Bedside Care",
        "category": "FUNDAMENTALS",
        "level": 100,
        "program": "NAC",
        "semester": "S1",
        "description": "Bed making, personal hygiene, vital signs, patient positioning, and comfort measures in Ghanaian wards.",
        "questions": [
            {
                "text": "A Nurse Assistant Clinical (NAC) on a medical ward in Kumasi is preparing an unoccupied bed for a newly admitted patient. Which action best prevents back strain and maintains infection control?",
                "rationale": "Raising the bed to waist height protects body mechanics, while keeping soiled linen away from the uniform prevents cross-contamination across patients.",
                "choices": [
                    ("Raise the bed to waist height and hold clean linen away from your uniform", True),
                    ("Bend forward from the waist while tucking sheets tightly under the mattress", False),
                    ("Shake soiled bedsheets briskly to remove crumbs before placing in the hamper", False),
                    ("Place clean pillows on the floor briefly while stripping the mattress", False),
                ],
            },
            {
                "text": "When measuring an adult patient's radial pulse on the ward, the NAC notes an irregular rhythm. What is the correct procedure?",
                "rationale": "An irregular pulse must be counted for a full 60 seconds to obtain an accurate rate and rhythm before reporting to the Registered Nurse.",
                "choices": [
                    ("Count the pulse for a full 60 seconds and report the irregularity to the nurse in charge", True),
                    ("Count for 15 seconds and multiply by 4 to save time during morning rounds", False),
                    ("Use the thumb firmly over the radial artery to feel weak beats clearly", False),
                    ("Record the previous shift's pulse rate if the patient appears comfortable", False),
                ],
            },
        ],
    },
    {
        "code": "ANP-111-NAC",
        "title": "Applied Anatomy & Physiology for Auxiliary Nurses",
        "category": "ANATOMY",
        "level": 100,
        "program": "NAC",
        "semester": "S1",
        "description": "Body systems, anatomical landmarks for vital signs, and normal physiological parameters.",
        "questions": [
            {
                "text": "During blood pressure measurement, the NAC places the stethoscope diaphragm over which artery in the antecubital fossa?",
                "rationale": "The brachial artery runs along the medial aspect of the antecubital fossa and is standard for auscultating Korotkoff sounds.",
                "choices": [
                    ("Brachial artery", True),
                    ("Radial artery", False),
                    ("Carotid artery", False),
                    ("Femoral artery", False),
                ],
            },
        ],
    },
    {
        "code": "IPC-122-NAC",
        "title": "Infection Prevention, Control & First Aid",
        "category": "FUNDAMENTALS",
        "level": 100,
        "program": "NAC",
        "semester": "S2",
        "description": "Ghana Health Service IPC protocols, hand hygiene, waste segregation, sterilization, and emergency first aid.",
        "questions": [
            {
                "text": "According to Ghana Health Service Infection Prevention and Control (IPC) color-coding guidelines, where should used blood-soaked gauze be discarded?",
                "rationale": "Infectious clinical waste contaminated with blood or body fluids goes into a yellow biohazard bin liner, while sharps go into puncture-proof safety boxes.",
                "choices": [
                    ("Yellow biohazard waste bin", True),
                    ("Black general domestic waste bin", False),
                    ("Cardboard sharps safety box", False),
                    ("Blue recycling container", False),
                ],
            },
        ],
    },
    {
        "code": "PHM-122-NAC",
        "title": "Basic Pharmacology & Safe Medication Assistance",
        "category": "PHARMACOLOGY",
        "level": 100,
        "program": "NAC",
        "semester": "S2",
        "description": "Rights of medication administration, oral/topical assistance, dosage checks, and adverse reaction reporting.",
        "questions": [
            {
                "text": "Before assisting a patient with an oral medication prescribed on the treatment sheet, which check must the NAC perform first?",
                "rationale": "Verifying the 'Five Rights' (right patient, drug, dose, route, and time) against the prescription chart prevents medication errors.",
                "choices": [
                    ("Verify the patient's identity and check the drug, dose, route, and time against the chart", True),
                    ("Crush all tablets together in water so the patient swallows them faster", False),
                    ("Leave the tablets on the bedside locker if the patient is sleeping", False),
                    ("Give a double dose if the patient missed the previous night's tablet", False),
                ],
            },
        ],
    },
    # ── NAC: Level 200 ─────────────────────────────────────────────
    {
        "code": "MSN-211-NAC",
        "title": "Medical-Surgical Ward Nursing Care",
        "category": "MED_SURG",
        "level": 200,
        "program": "NAC",
        "semester": "S1",
        "description": "Assisting with wound care, oxygen therapy, pre/post-operative care, fluid balance charting, and mobility.",
        "questions": [
            {
                "text": "A post-operative patient on a surgical ward in Accra suddenly becomes restless with SpO2 dropping from 97% to 89%. What is the NAC's immediate priority action?",
                "rationale": "Hypoxia requires immediate airway/breathing positioning (semi-Fowler's if not contraindicated) and urgent escalation to the Registered Nurse for oxygen therapy.",
                "choices": [
                    ("Place the patient in semi-Fowler's position and alert the nurse in charge immediately", True),
                    ("Wait 30 minutes to recheck the pulse oximeter before disturbing the ward nurse", False),
                    ("Offer oral fluids to calm the patient's restlessness", False),
                    ("Lower the head of the bed flat and turn off the monitor alarm", False),
                ],
            },
        ],
    },
    {
        "code": "MCH-222-NAC",
        "title": "Maternal, Newborn & Paediatric Ward Care",
        "category": "MATERNAL",
        "level": 200,
        "program": "NAC",
        "semester": "S2",
        "description": "Postnatal observations, newborn thermal protection, breastfeeding support, and pediatric ward care.",
        "questions": [
            {
                "text": "Immediately after delivery at a district hospital, which action by the NAC best prevents neonatal hypothermia?",
                "rationale": "Drying the newborn thoroughly and placing the baby skin-to-skin on the mother's chest prevents heat loss via evaporation and conduction.",
                "choices": [
                    ("Dry the baby immediately with a warm towel and initiate skin-to-skin contact", True),
                    ("Bathe the newborn in cool water within 10 minutes of birth", False),
                    ("Place the naked newborn near an open ward window for fresh air", False),
                    ("Delay wrapping the baby until all admission paperwork is completed", False),
                ],
            },
        ],
    },

    # ── NAP: Level 100 ─────────────────────────────────────────────
    {
        "code": "CHN-111-NAP",
        "title": "Foundations of Community Health & CHPS Operations",
        "category": "COMMUNITY",
        "level": 100,
        "program": "NAP",
        "semester": "S1",
        "description": "Ghana's CHPS strategy, community entry, home visiting, and primary health care delivery.",
        "questions": [
            {
                "text": "A newly posted Nurse Assistant Preventive (NAP) arrives at a rural CHPS zone in the Bono Region. Which activity is the essential first step during community entry?",
                "rationale": "Proper community entry in Ghana begins with paying courtesy calls to traditional leaders (Chiefs/Elders) and assembly members to build trust and community ownership.",
                "choices": [
                    ("Pay courtesy calls on the Chief, elders, and opinion leaders to explain CHPS services", True),
                    ("Begin house-to-house defaulter tracing without informing community leaders", False),
                    ("Issue sanitation fines to households on the first day of arrival", False),
                    ("Restrict clinic services strictly to emergency cases for the first month", False),
                ],
            },
        ],
    },
    {
        "code": "EPI-111-NAP",
        "title": "Expanded Programme on Immunization (EPI) & Cold Chain",
        "category": "COMMUNITY",
        "level": 100,
        "program": "NAP",
        "semester": "S1",
        "description": "Ghana EPI schedule, +2°C to +8°C cold chain management, VVM interpretation, and safe injection practices.",
        "questions": [
            {
                "text": "During an outreach Child Welfare Clinic (CWC), the NAP inspects a Pentavalent vaccine vial and sees that the inner square of the Vaccine Vial Monitor (VVM) is darker than the outer circle. What must the NAP do?",
                "rationale": "When the inner square matches or is darker than the outer circle, the vaccine has reached its discard point due to heat exposure and must not be administered.",
                "choices": [
                    ("Discard the vial immediately and do not use it for immunization", True),
                    ("Use the vial first before opening newer vaccine boxes", False),
                    ("Place the vial in the freezer compartment for 30 minutes to restore potency", False),
                    ("Administer half the usual dose to reduce side effects", False),
                ],
            },
        ],
    },
    {
        "code": "NUT-122-NAP",
        "title": "Community Nutrition & Growth Monitoring",
        "category": "MATERNAL",
        "level": 100,
        "program": "NAP",
        "semester": "S2",
        "description": "Child Welfare Clinic (CWC) weighing, MUAC screening, IYCF counseling, and malnutrition referral.",
        "questions": [
            {
                "text": "At a Child Welfare Clinic, a 14-month-old child's Mid-Upper Arm Circumference (MUAC) tape reads in the red zone (<11.5 cm) with bilateral pedal edema. How should the NAP classify and manage this child?",
                "rationale": "MUAC <11.5 cm or bilateral pitting edema indicates Severe Acute Malnutrition (SAM), requiring immediate referral to a nutrition rehabilitation/stabilization facility.",
                "choices": [
                    ("Classify as Severe Acute Malnutrition (SAM) and refer urgently for specialized care", True),
                    ("Reassure the mother and schedule routine follow-up in 3 months", False),
                    ("Advise stopping breastfeeding immediately in favor of adult porridge", False),
                    ("Record as normal growth if the child is alert and smiling", False),
                ],
            },
        ],
    },
    {
        "code": "ENV-122-NAP",
        "title": "Environmental Sanitation & Disease Control",
        "category": "COMMUNITY",
        "level": 100,
        "program": "NAP",
        "semester": "S2",
        "description": "Water safety, vector control, malaria prevention, Public Health Act 2012 (Act 851), and outbreak reporting.",
        "questions": [
            {
                "text": "Following heavy rains in a peri-urban community, the NAP conducts health education on malaria prevention. Which intervention provides the most effective household protection against Anopheles mosquito bites?",
                "rationale": "Consistent nightly sleeping under Long-Lasting Insecticidal Nets (LLINs) combined with eliminating stagnant breeding water is core malaria prevention in Ghana.",
                "choices": [
                    ("Sleeping under a Long-Lasting Insecticidal Net (LLIN) every night and draining stagnant water", True),
                    ("Taking antimalarial tablets daily without testing for fever", False),
                    ("Burning plastic waste indoors every evening", False),
                    ("Keeping windows closed only during afternoon hours", False),
                ],
            },
        ],
    },
    # ── NAP: Level 200 ─────────────────────────────────────────────
    {
        "code": "RCH-211-NAP",
        "title": "Reproductive & Child Health (RCH) & Family Planning",
        "category": "MATERNAL",
        "level": 200,
        "program": "NAP",
        "semester": "S1",
        "description": "Focused ANC education, danger signs in pregnancy, postnatal home visits, and family planning counseling.",
        "questions": [
            {
                "text": "During a home visit to a pregnant woman at 32 weeks gestation, she reports severe persistent headache, blurred vision, and epigastric pain. What is the NAP's priority action?",
                "rationale": "Severe headache, visual disturbances, and epigastric pain are classic danger signs of severe pre-eclampsia/impending eclampsia requiring immediate hospital referral.",
                "choices": [
                    ("Arrange urgent referral to the nearest hospital with emergency obstetric care", True),
                    ("Advise paracetamol and bed rest at home until her next scheduled ANC visit", False),
                    ("Recommend herbal tea and recheck her blood pressure next week", False),
                    ("Ask her to fast for 24 hours to relieve the epigastric discomfort", False),
                ],
            },
        ],
    },
    {
        "code": "DIS-222-NAP",
        "title": "Communicable Disease Surveillance & School Health",
        "category": "COMMUNITY",
        "level": 200,
        "program": "NAP",
        "semester": "S2",
        "description": "IDSR priority diseases, contact tracing, school health screening, and community mobilization.",
        "questions": [
            {
                "text": "While reviewing community cases, the NAP identifies two children from the same compound presenting with acute watery diarrhea and rice-water stools. Under Ghana's Integrated Disease Surveillance and Response (IDSR), when must this suspected cholera cluster be reported?",
                "rationale": "Cholera is an epidemic-prone priority disease under IDSR requiring immediate notification (within 24 hours) to the Sub-District and District Health Directorate.",
                "choices": [
                    ("Immediately (within 24 hours) to the Sub-District and District Disease Control Officer", True),
                    ("At the end of the quarter during routine DHIMS2 summary compilation", False),
                    ("Only after ten or more residents are hospitalized", False),
                    ("At the next annual community durbar", False),
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed starter N&MC Ghana Level 100 & Level 200 courses and sample questions for NAC and NAP programs."

    def handle(self, *args, **options):
        created_courses = 0
        created_questions = 0

        for item in NAC_NAP_COURSES:
            course, was_created = Course.objects.update_or_create(
                code=item["code"],
                level=item["level"],
                defaults={
                    "title": item["title"],
                    "category": item["category"],
                    "program": item["program"],
                    "semester": item["semester"],
                    "description": item["description"],
                    "is_published": True,
                },
            )
            if was_created:
                created_courses += 1

            for q_data in item["questions"]:
                q, q_created = Question.objects.get_or_create(
                    course=course,
                    text=q_data["text"],
                    defaults={
                        "rationale": q_data["rationale"],
                        "is_published": True,
                        "review_status": "APPROVED",
                    },
                )
                if q_created:
                    created_questions += 1
                    for idx, (choice_text, is_correct) in enumerate(q_data["choices"]):
                        Choice.objects.create(
                            question=q,
                            text=choice_text,
                            is_correct=is_correct,
                            position=idx,
                        )

        self.stdout.write(
            self.style.SUCCESS(
                f"NAC/NAP seed complete: {created_courses} new courses, {created_questions} new questions."
            )
        )
