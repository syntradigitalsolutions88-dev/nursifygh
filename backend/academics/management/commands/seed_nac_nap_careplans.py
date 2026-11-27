from django.core.management.base import BaseCommand
from django.db import transaction

from academics.models import Course
from careplans.models import CarePlanTemplate, NandaDiagnosis, NandaDomain


NANDA_ITEMS = [
    ("00007", "Hyperthermia", NandaDomain.SAFETY_PROTECTION, "Core body temperature elevated above normal diurnal range due to failure of thermoregulation."),
    ("00004", "Risk for Infection", NandaDomain.SAFETY_PROTECTION, "Susceptible to invasion and multiplication of pathogenic organisms, which may compromise health."),
    ("00132", "Acute Pain", NandaDomain.COMFORT, "Unpleasant sensory and emotional experience associated with actual or potential tissue damage."),
    ("00047", "Risk for Impaired Skin Integrity", NandaDomain.SAFETY_PROTECTION, "Susceptible to alteration in epidermis and/or dermis, which may compromise health."),
    ("00027", "Deficient Fluid Volume", NandaDomain.NUTRITION, "Decreased intravascular, interstitial, and/or intracellular fluid."),
    ("00002", "Imbalanced Nutrition: Less Than Body Requirements", NandaDomain.NUTRITION, "Intake of nutrients insufficient to meet metabolic needs."),
    ("00104", "Ineffective Breastfeeding", NandaDomain.ROLE_RELATIONSHIP, "Difficulty providing milk to an infant or young child directly from the breasts."),
    ("00161", "Readiness for Enhanced Knowledge", NandaDomain.PERCEPTION_COGNITION, "Presence or acquisition of cognitive information related to a specific topic is sufficient for meeting health-related goals."),
]


NAC_NAP_TEMPLATES = [
    # ── NAC (6 Templates) ─────────────────────────────────────────────────────
    {
        "program": "NAC",
        "nanda_code": "00007",
        "title": "NAC: Febrile Adult Malaria Ward Care (Hyperthermia)",
        "description": "Bedside nursing assistant care plan for an adult admitted with acute febrile malaria on a general medical ward.",
        "goals": [
            {
                "specific": "Reduce patient's axillary temperature toward normal range",
                "measurable": "Axillary temperature drops from 39.2°C to ≤37.5°C without rigors",
                "achievable": "Through tepid sponging, light clothing, and prescribed antipyretics",
                "relevant": "Prevents febrile convulsions and excess metabolic oxygen demand",
                "time_bound": "Within 2 hours of nursing intervention",
            }
        ],
        "interventions": [
            {
                "action": "Monitor and chart temperature, pulse, and respirations every 30–60 minutes during febrile spikes.",
                "rationale": "Tracks response to cooling measures and detects early haemodynamic deterioration.",
            },
            {
                "action": "Perform gentle tepid sponging using lukewarm water and remove heavy blankets while maintaining privacy.",
                "rationale": "Promotes heat loss via evaporation and conduction without inducing shivering.",
            },
            {
                "action": "Encourage frequent oral fluids (if conscious and able to swallow) and maintain strict intake/output chart.",
                "rationale": "Replaces insensible fluid losses caused by fever and diaphoresis.",
            },
        ],
    },
    {
        "program": "NAC",
        "nanda_code": "00047",
        "title": "NAC: Immobilized Stroke / Orthopaedic Patient (Pressure Injury Prevention)",
        "description": "Routine turning, skin hygiene, and pressure-relieving care for bedbound ward patients.",
        "goals": [
            {
                "specific": "Maintain intact skin over sacrum, heels, and trochanters",
                "measurable": "Zero non-blanchable erythema or skin breakdown on daily Braden/skin inspection",
                "achievable": "Through 2-hourly repositioning, dry linen, and barrier care",
                "relevant": "Prevents hospital-acquired pressure ulcers and secondary sepsis",
                "time_bound": "Throughout the entire hospital admission",
            }
        ],
        "interventions": [
            {
                "action": "Reposition the patient systematically every 2 hours using a bedside turning chart and lift rather than drag.",
                "rationale": "Relieves sustained capillary compression over bony prominences and avoids shearing forces.",
            },
            {
                "action": "Keep bedsheets clean, dry, and wrinkle-free; perform prompt perineal hygiene after incontinence.",
                "rationale": "Moisture and friction accelerate epidermal maceration and breakdown.",
            },
        ],
    },
    {
        "program": "NAC",
        "nanda_code": "00004",
        "title": "NAC: Indwelling Urinary Catheter & Ward Infection Prevention",
        "description": "Standard aseptic bedside maintenance for patients with indwelling Foley catheters.",
        "goals": [
            {
                "specific": "Prevent catheter-associated urinary tract infection (CAUTI)",
                "measurable": "Clear yellow urine without fever, suprapubic tenderness, or foul odour",
                "achievable": "By maintaining a closed drainage system and daily meatal hygiene",
                "relevant": "Reduces nosocomial morbidity and antibiotic exposure",
                "time_bound": "Throughout catheterization period",
            }
        ],
        "interventions": [
            {
                "action": "Perform hand hygiene and wear clean gloves before emptying the drainage bag; keep bag below bladder level off the floor.",
                "rationale": "Prevents retrograde flow of contaminated urine into the bladder and cross-infection.",
            },
            {
                "action": "Clean the urethral meatus daily with soap and water during bed bath and secure catheter tubing to the thigh.",
                "rationale": "Reduces periurethral bacterial colonization and mechanical urethral trauma.",
            },
        ],
    },
    {
        "program": "NAC",
        "nanda_code": "00132",
        "title": "NAC: Postoperative Comfort & Non-Pharmacological Pain Support",
        "description": "Bedside comfort positioning, splinting, and pain reporting for postoperative surgical patients.",
        "goals": [
            {
                "specific": "Alleviate postoperative incisional discomfort",
                "measurable": "Patient reports pain score ≤3/10 and performs deep-breathing exercises comfortably",
                "achievable": "Through supportive positioning, wound splinting, and timely escalation for analgesia",
                "relevant": "Enhances early mobilization and prevents basal atelectasis",
                "time_bound": "Within 1 hour of intervention and throughout postoperative recovery",
            }
        ],
        "interventions": [
            {
                "action": "Assist patient into semi-Fowler's position with pillow support and teach pillow splinting over the incision when coughing.",
                "rationale": "Reduces abdominal wall tension on sutures during movement and coughing.",
            },
            {
                "action": "Assess pain level regularly and report unrelieved pain promptly to the supervising Registered Nurse.",
                "rationale": "Ensures timely administration of prescribed analgesics before pain escalates.",
            },
        ],
    },
    {
        "program": "NAC",
        "nanda_code": "00027",
        "title": "NAC: Acute Gastroenteritis Fluid Balance & Ward Hydration",
        "description": "Strict fluid intake/output monitoring and assisted oral rehydration on the medical ward.",
        "goals": [
            {
                "specific": "Restore normal hydration status",
                "measurable": "Urine output ≥30 mL/hr, moist mucous membranes, and stable blood pressure",
                "achievable": "Via assisted small-sip ORS intake and accurate intake/output charting",
                "relevant": "Prevents prerenal acute kidney injury and hypovolaemic shock",
                "time_bound": "Within 6–8 hours of admission",
            }
        ],
        "interventions": [
            {
                "action": "Measure and record all oral/IV fluids, vomitus, and loose stools accurately on the fluid balance chart.",
                "rationale": "Provides objective data to guide ongoing fluid replacement therapy.",
            },
            {
                "action": "Offer small, frequent sips of freshly prepared ORS between episodes of nausea.",
                "rationale": "Small volumes minimize gastric distension and vomiting while maximizing intestinal absorption.",
            },
        ],
    },
    {
        "program": "NAC",
        "nanda_code": "00002",
        "title": "NAC: Assisted Ward Feeding & Nutritional Intake Support",
        "description": "Supportive feeding assistance for weak, elderly, or convalescing medical-surgical patients.",
        "goals": [
            {
                "specific": "Improve daily caloric and protein intake",
                "measurable": "Patient consumes ≥75% of served hospital meals without aspiration",
                "achievable": "Through upright positioning, oral hygiene prior to meals, and unhurried feeding assistance",
                "relevant": "Supports tissue healing and immune recovery",
                "time_bound": "Over the next 72 hours",
            }
        ],
        "interventions": [
            {
                "action": "Position patient upright at 90 degrees before meals and maintain upright posture for 30 minutes afterward.",
                "rationale": "Uses gravity to facilitate safe swallowing and prevent aspiration pneumonia.",
            },
            {
                "action": "Document food and fluid percentage consumed after each meal and report poor intake.",
                "rationale": "Alerts the care team early to nutritional deficits requiring dietitian review.",
            },
        ],
    },
    # ── NAP (6 Templates) ─────────────────────────────────────────────────────
    {
        "program": "NAP",
        "nanda_code": "00002",
        "title": "NAP: Infant Growth Faltering at Child Welfare Clinic (CWC)",
        "description": "Preventive nutrition counselling and growth monitoring follow-up for infants with flattening weight-for-age curves.",
        "goals": [
            {
                "specific": "Reverse infant growth faltering",
                "measurable": "Upward weight gain trajectory of ≥200–400 g on the GHS Maternal & Child Health Record Book chart",
                "achievable": "Through energy-dense local complementary feeding and frequent breastfeeding",
                "relevant": "Prevents stunting, wasting, and childhood infections",
                "time_bound": "At the 4-week CWC follow-up visit",
            }
        ],
        "interventions": [
            {
                "action": "Demonstrate enriching traditional porridge with groundnut paste, fish powder, mashed beans, or egg.",
                "rationale": "Increases protein, iron, and caloric density using affordable locally available Ghanaian foods.",
            },
            {
                "action": "Schedule a 2-week weight recheck at the CWC or during home visit.",
                "rationale": "Ensures early verification of caregiver adherence and sustained catch-up growth.",
            },
        ],
    },
    {
        "program": "NAP",
        "nanda_code": "00104",
        "title": "NAP: Postnatal Exclusive Breastfeeding Latch & Positioning Support",
        "description": "Preventive lactation counselling during postnatal home visits and 6-week CWC clinics.",
        "goals": [
            {
                "specific": "Establish effective exclusive breastfeeding",
                "measurable": "Infant demonstrates deep latch, audible swallowing, and ≥6 wet diapers daily without water/herbal supplements",
                "achievable": "Through hands-on positioning coaching and maternal reassurance",
                "relevant": "Protects infant against diarrhoea and pneumonia during the first 6 months",
                "time_bound": "By the end of the postnatal home visit and sustained through 6 months",
            }
        ],
        "interventions": [
            {
                "action": "Observe a full breastfeed and coach mother on bringing baby to the breast (chin touching breast, wide open mouth, lower lip flanged).",
                "rationale": "Proper attachment prevents nipple trauma and maximizes hindmilk transfer.",
            },
            {
                "action": "Educate mother and grandmother that breast milk contains >80% water and requires no extra water or herbal teas.",
                "rationale": "Engaging family decision-makers reduces cultural pressure for early mixed feeding.",
            },
        ],
    },
    {
        "program": "NAP",
        "nanda_code": "00027",
        "title": "NAP: Community IMNCI Plan A Diarrhoea & ORS Home Management",
        "description": "Preventive caregiver education on ORS preparation and Zinc supplementation for acute watery diarrhoea.",
        "goals": [
            {
                "specific": "Prevent dehydration during acute childhood diarrhoea",
                "measurable": "Caregiver accurately prepares 1 L ORS and administers Zinc daily without signs of dehydration",
                "achievable": "Via return-demonstration at the health centre or CHPS compound",
                "relevant": "Prevents diarrhoeal mortality in children under 5",
                "time_bound": "Before clinic departure and throughout the 10–14 day Zinc course",
            }
        ],
        "interventions": [
            {
                "action": "Guide the caregiver to dissolve 1 sachet of low-osmolarity ORS in 1,000 mL of clean cooled water and give cup/spoon sips after each loose stool.",
                "rationale": "Correct osmolarity maximizes sodium-glucose water absorption without causing hypernatraemia.",
            },
            {
                "action": "Teach danger signs requiring immediate clinic return (blood in stool, persistent vomiting, sunken eyes, lethargy).",
                "rationale": "Enables timely referral to Plan B or Plan C rehydration if home management is insufficient.",
            },
        ],
    },
    {
        "program": "NAP",
        "nanda_code": "00161",
        "title": "NAP: EPI Immunization Schedule & Caregiver Vaccine Adherence",
        "description": "Preventive health education and defaulter tracing for Ghana Expanded Programme on Immunization (EPI).",
        "goals": [
            {
                "specific": "Ensure timely completion of age-appropriate EPI vaccines",
                "measurable": "Caregiver states next CWC return date and brings child on schedule for Penta, PCV, Rota, and MR doses",
                "achievable": "Through clear maternal record book review and community reminder follow-up",
                "relevant": "Maintains herd immunity against vaccine-preventable childhood diseases",
                "time_bound": "At every CWC contact through 18 months of age",
            }
        ],
        "interventions": [
            {
                "action": "Explain the specific diseases each administered vaccine prevents and normal mild post-vaccination fever/swelling management.",
                "rationale": "Informed caregivers are less likely to default due to benign vaccine reactions.",
            },
            {
                "action": "Record the next appointment clearly in the MCH Record Book and log contact details for defaulter tracing.",
                "rationale": "Structured tracking minimizes missed opportunities and drop-out rates.",
            },
        ],
    },
    {
        "program": "NAP",
        "nanda_code": "00004",
        "title": "NAP: Household Malaria Prevention (LLIN Use & Environmental Sanitation)",
        "description": "Home-visit preventive care plan targeting vector control in malaria-endemic communities.",
        "goals": [
            {
                "specific": "Reduce household exposure to Anopheles mosquito bites",
                "measurable": "All household members—especially pregnant women and under-5 children—sleep under tucked LLINs nightly",
                "achievable": "Through home inspection, net hanging demonstration, and stagnant water clearance",
                "relevant": "Lowers malaria incidence and anaemia in vulnerable groups",
                "time_bound": "Within 1 week of home visit",
            }
        ],
        "interventions": [
            {
                "action": "Inspect sleeping spaces during home visits and demonstrate proper hanging and tucking of Long-Lasting Insecticidal Nets (LLINs).",
                "rationale": "Proper tucking eliminates gaps through which mosquitoes enter during peak night-biting hours.",
            },
            {
                "action": "Mobilize household members to clear choked gutters, empty uncovered water containers, and weed around the compound.",
                "rationale": "Eliminates peridomestic larval breeding sites.",
            },
        ],
    },
    {
        "program": "NAP",
        "nanda_code": "00007",
        "title": "NAP: Community First-Aid & Early Fever Referral Protocol",
        "description": "Preventive triage and caregiver guidance for febrile children prior to hospital referral.",
        "goals": [
            {
                "specific": "Ensure safe pre-referral fever control and prompt RDT testing",
                "measurable": "Child receives malaria RDT within 24 hours of fever onset and avoids harmful herbal/cold-water practices",
                "achievable": "Through community health education and CHPS triage",
                "relevant": "Prevents progression from uncomplicated malaria to severe cerebral malaria",
                "time_bound": "Within 24 hours of symptom onset",
            }
        ],
        "interventions": [
            {
                "action": "Educate caregivers to bring febrile children immediately for malaria RDT testing before starting antimalarials.",
                "rationale": "Follows Ghana's Test, Treat, and Track (3T) malaria policy.",
            },
            {
                "action": "Demonstrate safe tepid sponging and warn against applying alcohol, herbal enemas, or ice water.",
                "rationale": "Prevents toxic mucosal injury, hypothermia, and delayed definitive care.",
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seeds 12 NANDA-I CarePlanTemplates for NAC and NAP programmes (6 each)."

    @transaction.atomic
    def handle(self, *args, **options):
        nanda_map = {}
        for code, label, domain, definition in NANDA_ITEMS:
            diag, _ = NandaDiagnosis.objects.get_or_create(
                code=code,
                edition_year=2024,
                defaults={
                    "label": label,
                    "domain": domain,
                    "definition": definition,
                    "is_active": True,
                },
            )
            nanda_map[code] = diag

        created_count = 0
        for tpl in NAC_NAP_TEMPLATES:
            course = Course.objects.filter(program=tpl["program"], is_published=True).first()
            _, created = CarePlanTemplate.objects.get_or_create(
                title=tpl["title"],
                defaults={
                    "description": tpl["description"],
                    "primary_diagnosis": nanda_map[tpl["nanda_code"]],
                    "course": course,
                    "default_goals": tpl["goals"],
                    "default_interventions": tpl["interventions"],
                    "is_published": True,
                },
            )
            if created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done! Seeded {created_count} new CarePlanTemplates for NAC and NAP."
            )
        )