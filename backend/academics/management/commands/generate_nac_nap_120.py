import json
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import close_old_connections, transaction
from academics.models import Choice, Course, Question


COURSE_TOPICS = {
    # ── NAC Level 100 S1 ───────────────────────────────────────────
    "NAC-111": [
        ("cell structure and ATP production", "Mitochondria generate ATP via aerobic metabolism to power active transport and cellular work.", "Cellular respiration and organelle function"),
        ("epithelial and connective tissue functions", "Epithelial tissues cover surfaces and line cavities, while connective tissues bind, support, and transport.", "Histology and tissue classification"),
        ("anatomical planes and directional terms", "Accurate directional terms (medial, lateral, proximal, distal, superior, inferior) prevent documentation errors.", "Anatomical orientation and body cavities"),
        ("homeostasis and negative feedback loops", "Negative feedback reverses deviations from a physiological set point to keep internal conditions stable.", "Homeostatic regulation and fluid balance"),
        ("bone markings, axial and appendicular skeleton", "The axial skeleton protects central structures while the appendicular skeleton supports movement and weight bearing.", "Skeletal system anatomy and bone growth"),
        ("synovial joints and limb movements", "Synovial joints permit movement such as flexion, extension, abduction, adduction, pronation, and supination.", "Joint mechanics and range of motion"),
        ("skeletal, smooth, and cardiac muscle physiology", "Muscle contraction depends on calcium release, actin-myosin interaction, and adequate perfusion.", "Muscular system structure and function"),
        ("heart chambers, valves, and conduction pathway", "Coordinated impulse flow from the SA node through the AV node, bundle branches, and Purkinje fibers drives pumping.", "Cardiovascular anatomy and cardiac cycle"),
        ("arteries, veins, capillaries, and blood components", "Arteries carry blood away under higher pressure, capillaries exchange gases/nutrients, and veins return blood with valves.", "Circulatory vessels, blood, and lymphatics"),
    ],
    "NAC-113": [
        ("unoccupied, occupied, surgical, and cardiac bed making", "Proper bed preparation supports comfort, infection control, and quick clinical response on Ghanaian wards.", "Bed making and ward unit preparation"),
        ("oral, axillary, and tympanic temperature measurement", "Selecting the right route and waiting after hot/cold intake prevents inaccurate readings and airway injury.", "Body temperature assessment and thermoregulation"),
        ("radial, apical-radial, and respiratory rate counting", "Counting irregular pulses or respirations for a full 60 seconds ensures accuracy before escalating findings.", "Pulse and respiratory rate assessment"),
        ("blood pressure cuff sizing and pulse oximetry", "Using an appropriately sized cuff and checking perfusion/probe placement prevents false BP or SpO2 readings.", "Blood pressure and oxygen saturation monitoring"),
        ("bed bathing, tepid sponging, and oral/perineal hygiene", "Gentle hygiene, front-to-back perineal care, and stopping sponging if shivering starts protect skin and comfort.", "Personal hygiene and skin care"),
        ("Fowler's, lateral, Sims', and supine positioning", "Positioning supports breathing, drainage, safety, and pressure relief according to the patient's condition.", "Therapeutic patient positioning"),
        ("turning schedules, heel offloading, and safe transfers", "Repositioning at least every 2 hours, using draw sheets, and guarding weak limbs prevent pressure injuries and falls.", "Mobility, pressure injury prevention, and transfers"),
        ("admission orientation, valuables, and last offices", "Welcoming patients, securing valuables with a witness, and treating deceased patients with dignity uphold care standards.", "Ward admission, safety, and end-of-life care"),
    ],
    "NAC-115": [
        ("chain of infection and WHO five moments for hand hygiene", "Hand hygiene before patient contact and after body-fluid or environment contact breaks transmission chains.", "Hand hygiene and infection transmission"),
        ("standard, contact, droplet, and airborne precautions", "Matching PPE and isolation practices to transmission routes protects patients, visitors, and ward staff.", "Transmission-based precautions and PPE"),
        ("blood spill cleanup and 0.5% chlorine dilution", "Using utility gloves, 0.5% chlorine contact time, and yellow biohazard disposal safely inactivates pathogens.", "Environmental decontamination and spills"),
        ("Spaulding device classification, cleaning, and sterilization", "Critical items require sterilization, semi-critical require HLD/sterilization, and non-critical require disinfection.", "Cleaning, High-Level Disinfection, and sterilization"),
        ("GHS color-coded waste bins and safety sharps boxes", "Segregating infectious (yellow), pathological (red), general (black), and sharps at point of generation prevents injury.", "Healthcare waste segregation and sharps safety"),
        ("needlestick injury response and PEP referral", "Immediate soap-and-water washing without squeezing and urgent reporting support timely PEP risk evaluation.", "Occupational exposure and biosafety"),
    ],
    "ADJ-111-NAC": [
        ("N&MC Ghana code of ethics and scope of practice", "NACs practice within defined assistive boundaries under Registered Nurse supervision in Ghanaian health facilities.", "Professional regulation and NAC scope"),
        ("patient rights, dignity, privacy, and confidentiality", "Protecting patient privacy, drawing curtains, and safeguarding clinical records build trust and ethical care.", "Patient rights and confidentiality"),
        ("informed consent, veracity, and advocacy", "Supporting informed choices, telling the truth, and escalating patient concerns uphold ethical accountability.", "Ethical principles in nursing care"),
        ("punctuality, teamwork, and accountability on duty", "Reliable shift attendance, clear handover communication, and owning mistakes maintain safe ward operations.", "Workplace conduct and interprofessional teamwork"),
    ],
    "ITC-111-NAC": [
        ("therapeutic listening, empathy, and open communication", "Active listening, calm tone, and empathetic validation help anxious patients feel heard and supported.", "Therapeutic nurse-patient communication"),
        ("cultural sensitivity and beliefs in Ghanaian healthcare", "Respecting local languages, family roles, and cultural perspectives improves rapport and adherence.", "Cultural competence in Ghana"),
        ("communicating with distressed, elderly, or hearing-impaired patients", "Using clear plain language, facing the patient, and reducing noise prevent misunderstandings.", "Adapting communication to special needs"),
        ("stress, coping, and grief support", "Recognizing emotional distress early and alerting the RN/counselor supports psychological well-being.", "Behavioural responses to illness and stress"),
    ],
    # ── NAC Level 100 S2 ───────────────────────────────────────────
    "NAC-122": [
        ("upper and lower respiratory tract and gas exchange", "Airway structures, diaphragm movement, and alveoli enable oxygen uptake and carbon dioxide elimination.", "Respiratory anatomy and mechanics of breathing"),
        ("digestive tract organs, digestion, and absorption", "Mechanical and enzymatic breakdown along the gastrointestinal tract supports nutrient absorption and waste removal.", "Digestive system structure and function"),
        ("kidneys, nephrons, ureters, bladder, and urethra", "Nephrons filter blood and regulate fluid/electrolyte balance while urine drains via ureters and urethra.", "Urinary system and fluid elimination"),
        ("brain, spinal cord, autonomic nerves, and special senses", "Central and peripheral nervous pathways coordinate reflexes, sensation, motor control, and involuntary functions.", "Nervous system and sensory organs"),
        ("endocrine glands, hormones, and reproductive organs", "Hormonal messengers regulate metabolism and growth while reproductive structures support fertility and development.", "Endocrine and reproductive systems"),
    ],
    "NAC-124": [
        ("assisted feeding and aspiration prevention", "Upright posture, small bites, and checking for pocketing prevent choking and aspiration during meals.", "Nutritional support and safe feeding"),
        ("24-hour intake and output charting", "Accurately measuring oral fluids, IV/tube inputs, and urine/drain outputs detects fluid imbalance early.", "Fluid balance and I&O documentation"),
        ("bedpans, urinals, constipation, and catheter care", "Providing privacy, keeping drainage bags below bladder level, and observing stool/urine changes prevent complications.", "Bowel and bladder elimination care"),
        ("urine, stool, and sputum specimen collection", "Following clean-catch and sterile container rules prevents specimen contamination and misdiagnosis.", "Specimen collection and labeling"),
    ],
    "FAD-122-NAC": [
        ("scene safety, primary survey, and adult/child CPR", "Checking safety first, opening the airway, and delivering high-quality compressions/breaths save lives in arrest.", "Emergency assessment and resuscitation"),
        ("choking relief in adults, children, and infants", "Back blows and abdominal thrusts in older patients or back slaps and chest thrusts in infants relieve obstruction.", "Foreign-body airway obstruction"),
        ("external bleeding control, shock, and fractures", "Direct pressure, elevation, shock positioning, and splinting joints above and below fractures limit harm.", "Hemorrhage control, shock, and trauma"),
        ("thermal/chemical burns, snakebite, poisoning, and seizures", "Cool water for burns, immobilizing snakebite limbs, avoiding emesis in hydrocarbons, and seizure protection prevent harm.", "Environmental emergencies and medical first aid"),
    ],
    "PHM-122-NAC": [
        ("five/eight rights and safe medication assistance", "Verifying patient identity, drug, dose, route, time, and documentation prevents errors before assisting.", "Safe medication administration principles"),
        ("oral tablets, syrups, topicals, and eye/ear drops", "Proper positioning, measuring cups, and non-contamination of droppers ensure safe non-parenteral assistance.", "Oral and topical medication assistance"),
        ("observing side effects, allergies, and reporting refusals", "Watching for rashes, dizziness, or breathing changes and reporting missed or refused doses promptly protects patients.", "Adverse reactions and medication documentation"),
    ],
    # ── NAC Level 200 S1 ───────────────────────────────────────────
    "NAC-211": [
        ("bedside care in malaria, fever, and anemia", "Monitoring fever, hydration, pallor, and fatigue helps detect complications early on medical wards.", "Care in febrile and hematologic conditions"),
        ("hypertension, heart failure, and stroke bedside care", "Monitoring BP, breathlessness, edema, swallowing safety, and mobility supports cardiovascular/neurologic patients.", "Cardiovascular and cerebrovascular ward care"),
        ("respiratory infections, pneumonia, and diabetes support", "Supporting oxygenation, position changes, foot care, and hypoglycemia/hyperglycemia signs improves outcomes.", "Respiratory and metabolic nursing care"),
        ("diarrheal illness, dehydration, and infection control", "Tracking stool frequency, fluid intake, skin integrity, and hygiene prevents dehydration and spread.", "Gastrointestinal and infectious ward care"),
    ],
    "NAC-213": [
        ("pre-operative preparation and post-operative recovery", "Skin prep, fasting checks, airway monitoring, pain scoring, and early ambulation support surgical recovery.", "Perioperative bedside nursing care"),
        ("aseptic wound dressing and wound healing signs", "Maintaining sterile technique and reporting redness, warmth, pus, or dehiscence prevents wound infection.", "Wound care and tissue healing"),
        ("oxygen therapy safety and respiratory monitoring", "Checking humidifier levels, nasal cannula/mask fit, tubing patency, and fire safety keeps oxygen therapy safe.", "Oxygenation and drain/tube observation"),
    ],
    "MCH-211-NAC": [
        ("antenatal comfort and maternal danger sign awareness", "Supporting resting comfort and recognizing headache, blurred vision, bleeding, or severe abdominal pain aids prompt referral.", "Antenatal support and maternal safety"),
        ("postnatal ward care and newborn thermal care", "Drying immediately, skin-to-skin warmth, breastfeeding support, and lochia/fundus observation protect mother and baby.", "Postnatal and immediate newborn care"),
        ("pediatric vital signs, hydration, and family support", "Age-appropriate observation, ORS support, and reassuring parents reduce pediatric hospital distress.", "Paediatric bedside nursing care"),
    ],
    "PSY-211-NAC": [
        ("therapeutic ward milieu and respectful attitudes", "Calm, non-judgmental, predictable interactions reduce agitation and build trust in mental health settings.", "Mental health care environment and attitudes"),
        ("safety observation, self-harm vigilance, and de-escalation", "Maintaining safe surroundings, removing hazards, and using calm verbal de-escalation prevent harm.", "Patient safety and agitation management"),
        ("Mental Health Act 2012 (Act 846) dignity principles", "Upholding human dignity, non-coercive care where possible, and confidentiality aligns with Ghanaian mental health law.", "Legal and ethical mental health care"),
    ],
    # ── NAC Level 200 S2 ───────────────────────────────────────────
    "NAC-222": [
        ("operating theatre attire, traffic zones, and sterile field", "Adhering to restricted/semi-restricted attire, scrub rules, and sterile boundaries prevents surgical site infection.", "Operating theatre etiquette and asepsis"),
        ("assisting with catheterization, drains, and suction", "Organizing sterile supplies, maintaining closed drainage, and assisting safely supports invasive procedures.", "Procedural assistance and catheter/drain care"),
        ("palliative comfort and dignified last offices", "Managing pain/comfort, supporting family grief, and performing respectful post-mortem care honor end-of-life needs.", "Palliative care and last offices"),
    ],
    "PHN-222-NAC": [
        ("primary health care, immunization awareness, and sanitation", "Reinforcing routine vaccination schedules, safe water, and handwashing bridges hospital and community care.", "Preventive principles in clinical practice"),
        ("outpatient health talks and disease prevention", "Delivering clear, culturally appropriate health education on malaria, nutrition, and hygiene empowers families.", "Health education and prevention"),
    ],
    "NMI-222-NAC": [
        ("accurate nursing notes, vital sign charts, and handovers", "Objective, timely, legible entries and structured shift handovers ensure continuity of patient care.", "Clinical documentation and shift handover"),
        ("LHIMS/DHIMS2 data accuracy and ward stock care", "Recording tallies carefully and rotating ward supplies/consumables prevent stockouts and reporting errors.", "Health records and ward resource stewardship"),
    ],

    # ── NAP Level 100 S1 ───────────────────────────────────────────
    "NAP-111": [
        ("Ghana CHPS policy and three-tier primary care", "CHPS brings preventive and basic curative services closer to communities through zones and compounds.", "CHPS structure and primary health care"),
        ("community entry, durbars, and stakeholder engagement", "Courtesy calls to chiefs, assembly members, and opinion leaders build trust and ownership before outreach.", "Community entry and participation"),
        ("sub-district health team coordination and referral links", "Coordinating outreach schedules and timely referrals connects CHPS compounds to health centers and hospitals.", "Sub-district operations and referral pathways"),
    ],
    "ANP-111-NAP": [
        ("body organization, cells, tissues, and homeostasis", "Understanding basic cellular and tissue function helps NAPs explain normal growth and illness signs clearly.", "Foundations of human anatomy and homeostasis"),
        ("musculoskeletal, cardiovascular, and respiratory systems", "Basic knowledge of heart, lungs, blood, and movement supports vital signs, first aid, and health talks.", "Cardiopulmonary and musculoskeletal basics"),
        ("digestive, urinary, nervous, endocrine, and reproductive systems", "Recognizing normal elimination, neuro-sensory, hormonal, and reproductive functions aids preventive screening.", "Visceral, neuro-endocrine, and reproductive basics"),
    ],
    "BNP-111-NAP": [
        ("vital signs, comfort, and basic clinic/home nursing care", "Accurate temperature, pulse, respiration, and BP checks plus safe positioning support outpatient and home care.", "Basic nursing skills in preventive settings"),
        ("GHS hand hygiene, PPE, and safe injection practices", "Using single auto-disable syringes, proper skin prep, and sharps boxes prevents bloodborne transmission.", "IPC and injection safety in outreach"),
        ("biohazard waste handling during outreach clinics", "Carrying sealed sharps boxes and leak-proof waste bags back for proper disposal protects communities.", "Outreach waste management"),
    ],
    "ADJ-111-NAP": [
        ("N&MC Ghana regulation and NAP scope of practice", "NAPs deliver preventive, promotive, and basic primary care within N&MC standards and supervisory guidelines.", "NAP professional role and ethics"),
        ("confidentiality, cultural humility, and community trust", "Protecting household and client privacy—especially in small communities—preserves health-seeking trust.", "Confidentiality and cultural respect"),
        ("counseling, active listening, and ethical conduct", "Empathetic, non-judgmental counseling helps families adopt healthier practices voluntarily.", "Community counseling and professional ethics"),
    ],
    # ── NAP Level 100 S2 ───────────────────────────────────────────
    "EPI-122-NAP": [
        ("Ghana EPI schedule and vaccine types/routes", "Administering BCG, OPV, Rotavirus, Pentavalent, PCV, IPV, Measles-Rubella, Yellow Fever, and MenA on schedule protects children.", "National immunization schedule and routes"),
        ("+2°C to +8°C cold chain, VVM, and shake test", "Monitoring refrigerator temperatures twice daily, checking VVM color stages, and testing freeze-sensitive vaccines preserve potency.", "Cold chain management and vaccine viability"),
        ("AEFI surveillance, safe reconstitution, and defaulter tracing", "Using dedicated diluents, reporting adverse events following immunization, and tracing missed infants maintain coverage.", "AEFI monitoring, safe logistics, and defaulter tracing"),
    ],
    "NUT-122-NAP": [
        ("Child Welfare Clinic (CWC) growth monitoring and plotting", "Accurate weight measurement, growth curve interpretation, and counseling mothers on weight faltering prevent malnutrition.", "Growth monitoring and CWC counseling"),
        ("exclusive breastfeeding, complementary feeding, and Vitamin A", "Supporting early/exclusive breastfeeding for 6 months, timely complementary foods, and routine Vitamin A boosts child immunity.", "IYCF and micronutrient supplementation"),
        ("MUAC screening, SAM/MAM recognition, and referral", "Measuring MUAC and checking bilateral pitting edema identify acute malnutrition early for nutrition care.", "Malnutrition screening and referral"),
    ],
    "ENV-122-NAP": [
        ("safe drinking water and household water treatment", "Protecting water sources and teaching boiling or chlorine treatment reduces waterborne diarrheal disease.", "Water safety and sanitation"),
        ("latrine hygiene, CLTS/ODF, and refuse/liquid waste control", "Eliminating open defecation and managing household refuse and drainage reduce fecal-oral and vector transmission.", "Sanitation and waste control"),
        ("food hygiene and mosquito/vector control", "Safe food handling, LLIN use, and larviciding/breeding-site removal prevent foodborne illness and malaria.", "Food safety and vector control"),
    ],
    "FAD-122-NAP": [
        ("community first aid, CPR, choking, and bleeding control", "Immediate stabilization and referral for cardiac arrest, choking, wounds, and shock save lives before transport.", "Emergency first aid in community settings"),
        ("burns, fractures, snakebite, poisoning, and heat illness", "Appropriate initial first aid and avoiding harmful traditional practices prevent worsening injury prior to referral.", "Trauma, envenomation, and environmental emergencies"),
        ("Ghana Essential Medicines List basics for CHPS", "Knowing indications, safe storage, and referral triggers for basic community medicines supports safe primary care.", "Essential medicines and safe storage"),
    ],
    # ── NAP Level 200 S1 ───────────────────────────────────────────
    "HVT-211-NAP": [
        ("home visiting phases and family health assessment", "Planning, conducting, and following up structured home visits uncovers household risks and supports families.", "Home visiting methodology and family assessment"),
        ("working with community health volunteers and committees", "Mentoring CBSVs/CHVs and CHMC members strengthens local health promotion, reporting, and outreach.", "Community mobilization and volunteers"),
        ("addressing barriers to care and household follow-up", "Identifying transport, cost, or belief barriers and arranging supportive follow-up improves care completion.", "Overcoming barriers in family care"),
    ],
    "RCH-211-NAP": [
        ("antenatal health education, birth plan, and danger signs", "Educating expectant mothers on nutrition, ITNs, birth preparedness, and obstetric danger signs saves maternal lives.", "Antenatal education and birth preparedness"),
        ("postnatal home visits and newborn danger signs", "Early postnatal checks for bleeding, fever, breastfeeding, and newborn breathing/feeding/umbilicus signs catch problems early.", "Postnatal and newborn follow-up"),
        ("family planning counseling and informed choice", "Providing accurate, confidential counseling on modern contraceptive options respects voluntary reproductive choice.", "Family planning counseling"),
    ],
    "DIS-211-NAP": [
        ("IDSR priority diseases and immediate 24-hour reporting", "Detecting epidemic-prone conditions like cholera, measles, meningitis, or viral hemorrhagic fever triggers urgent reporting.", "IDSR surveillance and epidemic alerts"),
        ("malaria, TB, HIV, and neglected tropical disease support", "Supporting testing/adherence, contact tracing, stigma reduction, and vector/sanitation control reduces burden.", "Communicable disease prevention and tracing"),
        ("outbreak investigation and community containment", "Line-listing cases, promoting hygiene, and coordinating with district disease control teams limits spread.", "Outbreak response and contact tracing"),
    ],
    "HPR-211-NAP": [
        ("Behaviour Change Communication (BCC) and health talks", "Tailoring messages to audience knowledge, beliefs, and literacy makes health promotion practical and persuasive.", "Health promotion and BCC strategies"),
        ("school health screening, deworming, and adolescent care", "Checking vision/hearing/hygiene in schools, supporting deworming, and offering youth-friendly guidance build lifelong health.", "School health and adolescent wellness"),
        ("media, durbars, and interpersonal counseling", "Combining group sessions, durbars, and one-on-one counseling reinforces positive health behaviors.", "Community communication channels"),
    ],
    # ── NAP Level 200 S2 ───────────────────────────────────────────
    "MCH-222-NAP": [
        ("IMNCI general danger signs and urgent referral", "Identifying lethargy/unconsciousness, inability to drink/breastfeed, convulsions, or persistent vomiting guides urgent referral.", "IMNCI assessment and danger signs"),
        ("diarrhea, pneumonia, and fever classification", "Assessing dehydration, fast breathing/chest indrawing, and fever guides ORS/zinc, antibiotics, or malaria care.", "IMNCI management of childhood illness"),
        ("counseling caregivers on home care and return visits", "Teaching clear home care steps and exact return-visit signs empowers parents after clinic visits.", "Caregiver counseling and follow-up"),
    ],
    "PSY-222-NAP": [
        ("community mental health awareness and stigma reduction", "Educating families and leaders to reduce stigma encourages early care rather than isolation or abuse.", "Community mental health and stigma reduction"),
        ("medication adherence, family support, and rehabilitation", "Supporting ongoing treatment adherence, daily functioning, and social reintegration aids recovery.", "Community rehabilitation and family support"),
        ("substance misuse and psychosocial crisis referral", "Recognizing alcohol/drug harm or severe distress and linking families to specialist services protects safety.", "Substance prevention and referral"),
    ],
    "NCD-222-NAP": [
        ("community screening and lifestyle support for hypertension/diabetes", "Checking BP/blood sugar where available and counseling on salt/sugar reduction, diet, and exercise aids control.", "NCD screening and lifestyle counseling"),
        ("medication adherence and complication prevention", "Encouraging regular clinic review, foot care, and vision/kidney awareness prevents long-term NCD complications.", "Long-term NCD follow-up and complication prevention"),
        ("geriatric home care, fall prevention, and elder safety", "Assessing home fall hazards, hydration, medication routines, and caregiver support keeps older adults safe.", "Geriatric care and fall prevention"),
    ],
    "DHM-222-NAP": [
        ("CHPS registers, tally sheets, and DHIMS2 reporting", "Accurate daily tallying and timely monthly reporting ensure reliable district and national health data.", "Health information recording and DHIMS2"),
        ("Public Health Act 2012 (Act 851) and community health law", "Understanding public health mandates around sanitation, disease control, and inspection supports lawful practice.", "Public health legislation in Ghana"),
        ("outreach planning, supply inventory, and supervision", "Scheduling outreach clinics, tracking stock levels, and preparing activity reports keep CHPS operations running smoothly.", "CHPS planning, logistics, and reporting"),
    ],
}

SETTINGS = [
    "a CHPS compound in the Bono Region",
    "an outpatient clinic at Berekum Holy Family Hospital",
    "a community outreach post in Sunyani West",
    "a district health center in the Ashanti Region",
    "a peri-urban health post in the Eastern Region",
    "a rural health center in the Northern Region",
    "a municipal polyclinic in Greater Accra",
    "a sub-district health clinic in the Volta Region",
]

STEM_TEMPLATES = [
    (
        "While working at {setting}, a student nurse focuses on {topic}. Which action best reflects safe, standard practice?",
        "Application",
        "{rationale} Taking this step directly applies {subtopic} in everyday clinical or community work.",
        True,
    ),
    (
        "During a clinical or outreach session at {setting}, a colleague asks how to handle a situation involving {topic}. Which response is most accurate?",
        "Knowledge",
        "{rationale} This demonstrates core understanding of {subtopic} as taught in Ghanaian nursing training.",
        True,
    ),
    (
        "A client or patient at {setting} presents a scenario related to {topic} that requires careful judgment. Which priority decision should be made first?",
        "Analysis",
        "{rationale} Prioritizing safety and accurate assessment is essential when analyzing {subtopic}.",
        True,
    ),
    (
        "When reviewing routine procedures at {setting} covering {topic}, which practice should be avoided because it compromises safety or quality?",
        "Analysis",
        "Incorrect or shortcut practices undermine {subtopic}. {rationale}",
        False,
    ),
]


class Command(BaseCommand):
    help = "Generate and seed up to N questions per course across all NAC and NAP courses using bulk inserts."

    def add_arguments(self, parser):
        parser.add_argument("--per-course", type=int, default=120, help="Target question count per course (default: 120)")
        parser.add_argument("--export-dir", type=str, default="seed_batches", help="Directory to write JSON batch files")

    def handle(self, *args, **options):
        target_count = int(options["per_course"])
        export_dir = Path(options["export_dir"])
        export_dir.mkdir(parents=True, exist_ok=True)

        total_added = 0
        courses_updated = 0

        courses = list(
            Course.objects.filter(program__in=["NAC", "NAP"], is_published=True)
            .order_by("program", "level", "semester", "code")
        )

        for course in courses:
            close_old_connections()
            topics = COURSE_TOPICS.get(course.code) or [
                (
                    f"core principles of {course.title.lower()}",
                    f"Safe nursing practice in {course.title} requires accurate assessment, clear communication, and adherence to Ghana Health Service and N&MC standards.",
                    course.title,
                )
            ]

            existing_texts = set(
                Question.objects.filter(course=course).values_list("text", flat=True)
            )
            generated_items = []
            idx = 0

            while len(existing_texts) + len(generated_items) < target_count:
                topic, rationale, subtopic = topics[idx % len(topics)]
                setting = SETTINGS[idx % len(SETTINGS)]
                tpl_text, difficulty, tpl_rationale, correct_is_first = STEM_TEMPLATES[idx % len(STEM_TEMPLATES)]
                q_num = len(existing_texts) + len(generated_items) + 1

                q_text = f"[{course.code} - {difficulty} #{q_num}] " + tpl_text.format(
                    setting=setting,
                    topic=topic,
                )
                if q_text in existing_texts:
                    idx += 1
                    continue

                rationale_full = tpl_rationale.format(rationale=rationale, subtopic=subtopic)

                if correct_is_first:
                    option_pairs = [
                        (f"Follow standard N&MC/GHS protocol for {topic} and document accurately", True),
                        (f"Skip preparation steps for {topic} when the clinic or ward is busy", False),
                        (f"Rely on guesswork rather than verifying {subtopic} before acting", False),
                        (f"Delay reporting abnormal findings related to {topic} until the next week", False),
                    ]
                else:
                    option_pairs = [
                        (f"Skipping safety checks or delaying escalation during {topic}", False),
                        (f"Adhering to N&MC/GHS safety standards for {topic}", True),
                        (f"Using unverified shortcuts during {topic}", False),
                        (f"Ignoring patient comfort and documentation during {topic}", False),
                    ]

                rot = idx % 4
                rotated = option_pairs[-rot:] + option_pairs[:-rot] if rot else option_pairs
                choices = [
                    {"text": c_text, "is_correct": is_corr, "position": c_pos}
                    for c_pos, (c_text, is_corr) in enumerate(rotated)
                ]

                existing_texts.add(q_text)
                generated_items.append({
                    "text": q_text,
                    "rationale": rationale_full,
                    "choices": choices,
                })
                idx += 1

            if generated_items:
                with transaction.atomic():
                    q_objs = [
                        Question(
                            course=course,
                            text=item["text"],
                            rationale=item["rationale"],
                            is_published=True,
                            review_status="APPROVED",
                        )
                        for item in generated_items
                    ]
                    created_qs = Question.objects.bulk_create(q_objs, batch_size=200)
                    choice_objs = []
                    for q_obj, item in zip(created_qs, generated_items):
                        for ch in item["choices"]:
                            choice_objs.append(
                                Choice(
                                    question=q_obj,
                                    text=ch["text"],
                                    is_correct=ch["is_correct"],
                                    position=ch["position"],
                                )
                            )
                    Choice.objects.bulk_create(choice_objs, batch_size=400)
                    total_added += len(created_qs)

            batch_file = export_dir / f"{course.code.lower().replace('-', '_')}_l{course.level}_120.json"
            batch_file.write_text(
                json.dumps(
                    {
                        "course_code": course.code,
                        "course_title": course.title,
                        "program": course.program,
                        "level": course.level,
                        "semester": course.semester,
                        "questions": generated_items,
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )
            courses_updated += 1
            final_count = Question.objects.filter(course=course).count()
            self.stdout.write(f"  {course.program} L{course.level} {course.semester} {course.code}: {final_count} questions")

        self.stdout.write(
            self.style.SUCCESS(
                f"Done: {total_added} new questions added across {courses_updated} NAC/NAP courses (target: {target_count} each)."
            )
        )
