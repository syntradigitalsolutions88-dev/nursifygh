from django.core.management.base import BaseCommand
from django.db import transaction

from academics.models import Choice, Course, CourseCategory, Question, Semester


COURSE_BLUEPRINTS = [
    # GENERAL (RGN)
    ("RGN-201", "Medical-Surgical Nursing I", CourseCategory.MEDICAL_SURGICAL, 200, "GENERAL", Semester.FIRST),
    ("RGN-203", "Clinical Pharmacology & Therapeutics", CourseCategory.PHARMACOLOGY, 200, "GENERAL", Semester.FIRST),
    ("RGN-301", "Paediatric & Emergency Nursing", CourseCategory.MATERNAL_CHILD, 300, "GENERAL", Semester.FIRST),
    # MIDWIFERY (RM)
    ("OBN-211-M", "Obstetric & Emergency Midwifery", CourseCategory.MIDWIFERY, 200, "MIDWIFERY", Semester.FIRST),
    ("MID-302", "Neonatal & Postpartum Care", CourseCategory.MATERNAL_CHILD, 300, "MIDWIFERY", Semester.SECOND),
    # PSYCHIATRIC (RPN)
    ("ADJ-111-P", "Professional Adjustment & Mental Health Law", CourseCategory.ETHICS, 100, "PSYCHIATRIC", Semester.FIRST),
    ("MMN-311-P", "Acute Psychiatric & Psychopharmacology Nursing", CourseCategory.MENTAL_HEALTH, 300, "PSYCHIATRIC", Semester.FIRST),
    # COMMUNITY (CHN)
    ("PHN-322", "Public Health & Disease Surveillance", CourseCategory.COMMUNITY, 300, "COMMUNITY", Semester.SECOND),
    ("CBR-322", "Community-Based Rehabilitation & Disability Care", CourseCategory.COMMUNITY, 300, "COMMUNITY", Semester.SECOND),
    # NAC (Nurse Assistant Clinical)
    ("NAC-101", "Basic Bedside Nursing & Infection Prevention", CourseCategory.FUNDAMENTALS, 100, "NAC", Semester.FIRST),
    ("NAC-201", "Medical-Surgical Assisting & Ward Care", CourseCategory.MEDICAL_SURGICAL, 200, "NAC", Semester.FIRST),
    # NAP (Nurse Assistant Preventive)
    ("NAP-101", "Primary Health Care, EPI & Cold Chain", CourseCategory.COMMUNITY, 100, "NAP", Semester.FIRST),
    ("NAP-201", "Maternal, Child Nutrition & Growth Monitoring", CourseCategory.MATERNAL_CHILD, 200, "NAP", Semester.FIRST),
]


QUESTION_BANK = [
    # ── GENERAL (RGN) ─────────────────────────────────────────────────────────
    {
        "program": "GENERAL",
        "category": CourseCategory.PHARMACOLOGY,
        "text": "A 16 kg child is admitted to the paediatric ward with severe cerebral malaria. Per Ghana Standard Treatment Guidelines, you reconstitute a 60 mg vial of IV Artesunate to a final concentration of 10 mg/mL. What volume should you administer for the stat dose?",
        "rationale": "Ghana STG prescribes 3.0 mg/kg for children weighing less than 20 kg (16 kg × 3.0 mg/kg = 48 mg). Dividing 48 mg by the IV reconstituted concentration of 10 mg/mL yields 4.8 mL.",
        "choices": [
            ("3.8 mL", False, "Applies the adult 2.4 mg/kg dosing band instead of the <20 kg paediatric 3.0 mg/kg dose."),
            ("4.8 mL", True, "Correct: 16 kg × 3.0 mg/kg = 48 mg; 48 mg ÷ 10 mg/mL = 4.8 mL."),
            ("2.4 mL", False, "Corresponds to IM reconstitution (20 mg/mL) rather than IV (10 mg/mL)."),
            ("6.0 mL", False, "Full 60 mg vial volume; exceeds the weight-calculated dose."),
        ],
    },
    {
        "program": "GENERAL",
        "category": CourseCategory.MEDICAL_SURGICAL,
        "text": "A 54-year-old man with decompensated heart failure receives Furosemide 40 mg IV stat on the male medical ward. Two hours later, he complains of leg cramps and palpitations, and his ECG shows flattened T waves. Which electrolyte disturbance should the nurse suspect first?",
        "rationale": "Loop diuretics inhibit Na+/K+/2Cl- cotransport in the loop of Henle, causing significant urinary potassium loss (hypokalaemia), which manifests with muscle cramps, arrhythmias, and ECG T-wave flattening.",
        "choices": [
            ("Hyperkalaemia", False, "Loop diuretics waste potassium rather than retain it."),
            ("Hypokalaemia", True, "Correct: Furosemide-induced potassium depletion causes cramps, palpitations, and flattened T waves."),
            ("Hypercalcaemia", False, "Loop diuretics increase calcium excretion."),
            ("Hypernatraemia", False, "Furosemide promotes natriuresis (sodium loss)."),
        ],
    },
    {
        "program": "GENERAL",
        "category": CourseCategory.MEDICAL_SURGICAL,
        "text": "During morning ward rounds, a postoperative patient 24 hours after laparotomy develops sudden dyspnoea, pleuritic chest pain, tachypnoea (30 breaths/min), and SpO2 of 86% on room air. What is the nurse's immediate priority action?",
        "rationale": "Suspected acute pulmonary embolism compromises oxygenation first. Placing the patient in high-Fowler's position and administering supplemental oxygen addresses airway/breathing immediately before notifying the medical officer.",
        "choices": [
            ("Elevate the head of the bed and administer high-flow oxygen", True, "Correct: Airway and oxygenation take immediate priority in suspected pulmonary embolism."),
            ("Massage the patient's calves to assess for deep vein thrombosis", False, "Massaging calves can dislodge further thrombi and worsen pulmonary embolism."),
            ("Encourage vigorous ambulation in the corridor", False, "Ambulation increases oxygen demand and risk of haemodynamic collapse."),
            ("Document the vital signs and wait for the afternoon doctor's round", False, "Acute hypoxia requires immediate emergency intervention."),
        ],
    },
    {
        "program": "GENERAL",
        "category": CourseCategory.MATERNAL_CHILD,
        "text": "A 3-year-old boy is brought to the emergency unit with sunken eyes, lethargy, very slow skin pinch (>2 seconds), and inability to drink due to severe watery diarrhoea. According to IMNCI dehydration guidelines, which management plan is indicated?",
        "rationale": "Lethargy, sunken eyes, inability to drink, and skin pinch >2 seconds classify Severe Dehydration, requiring IMNCI Plan C (rapid intravenous rehydration with Ringer's Lactate or Normal Saline).",
        "choices": [
            ("Plan A: Home ORS after each loose stool", False, "Plan A is for children with no signs of dehydration."),
            ("Plan B: 75 mL/kg ORS over 4 hours in the clinic", False, "Plan B is for 'Some Dehydration' when the child can still drink."),
            ("Plan C: Immediate IV Ringer's Lactate resuscitation", True, "Correct: Severe dehydration with inability to drink requires immediate IV therapy under Plan C."),
            ("Withhold all fluids until stool culture results return", False, "Delaying rehydration in severe dehydration is life-threatening."),
        ],
    },
    # ── MIDWIFERY (RM) ────────────────────────────────────────────────────────
    {
        "program": "MIDWIFERY",
        "category": CourseCategory.MIDWIFERY,
        "text": "A G3P2 parturient at 38 weeks' gestation admitted with severe pre-eclampsia has received her loading dose of Magnesium Sulfate (MgSO4). Prior to administering the next 4-hourly IM maintenance dose, the midwife records: RR 10 breaths/min, absent patellar reflexes, and urine output 65 mL over 4 hours. What is the priority midwifery action?",
        "rationale": "Respiratory rate <12–16/min, loss of deep tendon reflexes, and oliguria (<100 mL/4 hr) indicate magnesium toxicity. The midwife must withhold MgSO4 immediately and prepare 10% Calcium Gluconate (1 g IV slowly) as the antidote.",
        "choices": [
            ("Administer half the maintenance dose and recheck in 1 hour", False, "Any additional magnesium worsens respiratory arrest risk."),
            ("Withhold MgSO4, maintain airway/oxygen, and prepare 10% Calcium Gluconate IV", True, "Correct: Classic signs of MgSO4 toxicity require stopping the drug and administering calcium gluconate."),
            ("Administer Oxytocin 10 IU IM to expedite delivery", False, "Does not reverse magnesium toxicity."),
            ("Encourage oral fluids to increase urine output", False, "Client is at high seizure/aspiration risk; IV resuscitation and antidote are required."),
        ],
    },
    {
        "program": "MIDWIFERY",
        "category": CourseCategory.MIDWIFERY,
        "text": "Immediately after delivery of the placenta at a district maternity unit, a multiparous woman develops brisk vaginal bleeding (>600 mL) and a boggy, poorly contracted uterus above the umbilicus. What is the midwife's immediate first-line intervention?",
        "rationale": "Uterine atony is the leading cause of primary postpartum haemorrhage. Immediate bimanual/fundal uterine massage stimulates myometrial contraction while calling for help and initiating uterotonic therapy.",
        "choices": [
            ("Perform immediate vigorous fundal uterine massage and call for help", True, "Correct: Rubbing up a contraction immediately addresses uterine atony while mobilizing the PPH team."),
            ("Pack the vagina tightly with sterile gauze", False, "Vaginal packing masks ongoing concealed bleeding in uterine atony."),
            ("Place the woman in Trendelenburg position and observe for 30 minutes", False, "Delaying active uterotonic and mechanical intervention leads to hypovolaemic shock."),
            ("Administer intravenous Hydralazine 5 mg stat", False, "Hydralazine is an antihypertensive and worsens haemorrhagic hypotension."),
        ],
    },
    {
        "program": "MIDWIFERY",
        "category": CourseCategory.MATERNAL_CHILD,
        "text": "During Active Management of the Third Stage of Labour (AMTSL) in Ghana, which uterotonic dose and route is recommended as first-line immediately after confirming no undiagnosed second twin?",
        "rationale": "WHO and Ghana National Safe Motherhood Protocols recommend Oxytocin 10 IU IM (or slow IV) within 1 minute of birth as the uterotonic of choice for AMTSL.",
        "choices": [
            ("Oxytocin 10 IU IM within 1 minute of birth", True, "Correct: Oxytocin 10 IU IM is the standard first-line uterotonic for AMTSL."),
            ("Misoprostol 800 mcg sublingually before delivery of the anterior shoulder", False, "Uterotonics are given after delivery of the baby, not before shoulder delivery."),
            ("Ergometrine 0.5 mg IV push in all hypertensive mothers", False, "Ergometrine is contraindicated in hypertension/pre-eclampsia."),
            ("Magnesium Sulfate 4 g IV over 20 minutes", False, "MgSO4 is an anticonvulsant, not a uterotonic."),
        ],
    },
    # ── PSYCHIATRIC (RPN) ─────────────────────────────────────────────────────
    {
        "program": "PSYCHIATRIC",
        "category": CourseCategory.ETHICS,
        "text": "Under Ghana's Mental Health Act, 2012 (Act 846), a patient brought to a psychiatric unit in acute mania refuses voluntary admission but poses an immediate risk of serious physical harm to self and others. What is the maximum initial duration of a temporary involuntary treatment order recommended by two medical practitioners/mental health specialists?",
        "rationale": "Under Section 42–48 of Ghana's Mental Health Act, 2012 (Act 846), temporary involuntary treatment for an acute psychiatric emergency is authorized for up to 1 month (with urgent emergency detention up to 72 hours prior to formal review).",
        "choices": [
            ("Up to 1 month under a temporary involuntary treatment order", True, "Correct: Act 846 provides for temporary involuntary care up to 1 month subject to Mental Health Review Tribunal oversight."),
            ("Indefinitely without family or tribunal notification", False, "Act 846 strictly protects patient rights and mandates periodic tribunal review."),
            ("6 months before any clinical reassessment is required", False, "Exceeds the statutory temporary order period."),
            ("Involuntary treatment is completely prohibited under Act 846", False, "Act 846 permits temporary involuntary care under strict legal safeguards when safety is threatened."),
        ],
    },
    {
        "program": "PSYCHIATRIC",
        "category": CourseCategory.MENTAL_HEALTH,
        "text": "A 26-year-old male started on Haloperidol 10 mg IM for acute psychosis develops sudden painful upward rolling of the eyes (oculogyric crisis) and severe neck muscle spasm (torticollis) 6 hours later. Which medication should the psychiatric nurse anticipate administering?",
        "rationale": "Acute dystonia (oculogyric crisis, torticollis) is an extrapyramidal side effect of high-potency first-generation antipsychotics treated rapidly with parenteral anticholinergics such as Benzhexol (Trihexyphenidyl) or Biperiden/Benztropine.",
        "choices": [
            ("An anticholinergic agent such as Biperiden or Benzhexol", True, "Correct: Anticholinergics restore dopamine-acetylcholine balance and rapidly relieve acute dystonia."),
            ("A second stat dose of Haloperidol 10 mg IM", False, "Additional dopamine blockade worsens acute dystonia."),
            ("Chlorpromazine 100 mg PO", False, "Another typical antipsychotic that exacerbates extrapyramidal reactions."),
            ("Lithium Carbonate 400 mg PO", False, "Mood stabilizer with no role in acute dystonia."),
        ],
    },
    {
        "program": "PSYCHIATRIC",
        "category": CourseCategory.MENTAL_HEALTH,
        "text": "A client admitted with severe major depressive disorder who has been withdrawn and tearful for two weeks suddenly appears unusually cheerful, gives away personal belongings, and states, 'You won't have to worry about me anymore.' What is the nurse's priority action?",
        "rationale": "Sudden unexplained mood elevation, giving away possessions, and farewell statements are high-risk warning signs of imminent suicide intent once energy returns; immediate one-to-one suicide precautions and direct assessment are required.",
        "choices": [
            ("Initiate continuous one-to-one observation and conduct a direct suicide risk assessment", True, "Correct: Patient safety via continuous observation and direct inquiry is the immediate priority."),
            ("Recommend discharge home since the depression has resolved", False, "Sudden calm/cheerfulness in severe depression often reflects a resolved decision to attempt suicide."),
            ("Leave the client alone to pack personal items privately", False, "Unobserved time increases opportunity for lethal self-harm."),
            ("Reassure the client that everyone feels sad occasionally", False, "Minimizes acute suicidal cues."),
        ],
    },
    # ── COMMUNITY HEALTH (CHN) ────────────────────────────────────────────────
    {
        "program": "COMMUNITY",
        "category": CourseCategory.COMMUNITY,
        "text": "During routine disease surveillance at a sub-district health centre in Ghana, a Community Health Nurse identifies a 4-year-old child presenting with sudden onset of asymmetric flaccid paralysis of the right lower limb without trauma. Under Integrated Disease Surveillance and Response (IDSR), what is the immediate priority action?",
        "rationale": "Acute Flaccid Paralysis (AFP) in a child under 15 years is an immediately notifiable priority condition under Ghana's IDSR guidelines to rule out poliomyelitis; the nurse must notify the District Disease Control Officer immediately and collect two stool specimens 24–48 hours apart.",
        "choices": [
            ("Notify the District Health Directorate immediately and collect two stool samples 24–48 hours apart", True, "Correct: AFP requires immediate IDSR notification and paired stool specimens within 14 days of paralysis onset."),
            ("Wait 4 weeks to see if muscle tone recovers spontaneously before reporting", False, "Delayed reporting compromises outbreak containment and virological testing."),
            ("Administer a booster dose of OPV and discharge without documentation", False, "Does not fulfill mandatory IDSR investigation."),
            ("Refer only to a traditional bone setter", False, "Fails to investigate a priority communicable disease."),
        ],
    },
    {
        "program": "COMMUNITY",
        "category": CourseCategory.COMMUNITY,
        "text": "Under Ghana's Public Health Act, 2012 (Act 851), which public health principle empowers health authorities to enforce quarantine, vaccination campaigns, and vector control during a declared epidemic?",
        "rationale": "Act 851 consolidates public health laws in Ghana, authorizing communicable disease control, quarantine, port health, and environmental sanitation measures to protect population health.",
        "choices": [
            ("Statutory communicable disease prevention and epidemic control powers under Act 851", True, "Correct: The Public Health Act, 2012 (Act 851) governs epidemic response, quarantine, and sanitation in Ghana."),
            ("Purely voluntary individual discretion without public health notification", False, "Notifiable epidemic diseases require statutory reporting and containment."),
            ("The Mental Health Review Tribunal mandate", False, "Applies to Act 846 rather than communicable disease control."),
            ("Exclusive private hospital self-regulation", False, "Public health emergencies are coordinated by the Ministry of Health and Ghana Health Service."),
        ],
    },
    # ── NAC (Nurse Assistant Clinical) ────────────────────────────────────────
    {
        "program": "NAC",
        "category": CourseCategory.FUNDAMENTALS,
        "text": "A Nurse Assistant Clinical (NAC) is preparing to empty a patient's indwelling urinary catheter drainage bag on the medical ward. Which practice best prevents catheter-associated urinary tract infection (CAUTI)?",
        "rationale": "Keeping the drainage bag below bladder level at all times prevents retrograde flow of contaminated urine into the bladder, while hand hygiene and clean gloves protect both patient and staff.",
        "choices": [
            ("Keep the drainage bag below bladder level without touching the floor and perform hand hygiene before and after", True, "Correct: Preventing reflux and maintaining asepsis are key CAUTI prevention measures."),
            ("Place the drainage bag on the patient's abdomen during bed-making", False, "Raising the bag above bladder level causes urine reflux into the bladder."),
            ("Disconnect the catheter from the drainage tubing to empty faster", False, "Breaks the closed sterile drainage system."),
            ("Empty multiple patients' bags into a single unwashed jug without changing gloves", False, "Causes cross-contamination between patients."),
        ],
    },
    {
        "program": "NAC",
        "category": CourseCategory.MEDICAL_SURGICAL,
        "text": "While recording routine morning vital signs on an adult surgical patient, the NAC obtains: Temp 38.9°C, Pulse 116 bpm, Respirations 24 breaths/min, BP 88/54 mmHg, SpO2 91%. What should the NAC do immediately?",
        "rationale": "Hypotension (88/54 mmHg), tachycardia, tachypnoea, and high fever suggest early sepsis or hypovolaemia and must be reported immediately to the supervising Registered Nurse/clinician.",
        "choices": [
            ("Report the abnormal vital signs immediately to the supervising Registered Nurse and stay with the patient", True, "Correct: Hypotension with fever and tachycardia requires urgent clinical escalation."),
            ("Record the figures in the folder and wait until the afternoon shift handover", False, "Delaying escalation risks septic or hypovolaemic shock."),
            ("Give the patient two extra blankets and dim the lights", False, "Does not address hypotension or sepsis."),
            ("Skip rechecking the blood pressure until the next day", False, "Unstable vital signs require frequent monitoring and immediate reporting."),
        ],
    },
    {
        "program": "NAC",
        "category": CourseCategory.FUNDAMENTALS,
        "text": "When performing tepid sponging for an adult patient with a fever of 39.2°C on the ward, which technique is clinically appropriate?",
        "rationale": "Tepid water promotes gradual heat loss via evaporation and conduction without inducing shivering (which increases metabolic heat production); cold/ice water or alcohol rubs are contraindicated.",
        "choices": [
            ("Use lukewarm (tepid) water, sponge trunk and limbs gently, and stop if shivering occurs", True, "Correct: Tepid water prevents vasoconstriction and shivering while safely reducing core temperature."),
            ("Use ice-cold water packed around the chest for 45 minutes", False, "Ice water causes peripheral vasoconstriction and shivering, raising core temperature."),
            ("Rub methylated spirit over the entire body", False, "Alcohol causes rapid cooling, shivering, and toxic fume inhalation."),
            ("Cover the patient tightly in three woollen blankets immediately after sponging", False, "Traps body heat and prevents evaporative cooling."),
        ],
    },
    # ── NAP (Nurse Assistant Preventive) ──────────────────────────────────────
    {
        "program": "NAP",
        "category": CourseCategory.COMMUNITY,
        "text": "During an outreach Child Welfare Clinic (CWC) session, a Nurse Assistant Preventive (NAP) inspects a vial of measles-rubella vaccine whose Vaccine Vial Monitor (VVM) shows the inner square is the exact same colour as the outer circle. What action must the NAP take?",
        "rationale": "When the inner square of a VVM matches or is darker than the outer reference circle, the vaccine has reached its discard point due to cumulative heat exposure and must NOT be administered.",
        "choices": [
            ("Discard the vaccine vial immediately according to cold-chain protocol and do not administer it", True, "Correct: A VVM at or beyond the discard point indicates heat-damaged, potent-compromised vaccine."),
            ("Administer the vaccine quickly before the colour darkens further", False, "Heat-damaged vaccines fail to confer immunity."),
            ("Place the vial in the freezer overnight to reset the VVM square", False, "VVM changes are irreversible and measles vaccine should not be refrozen after reconstitution."),
            ("Use the vaccine only for children over 18 months", False, "Compromised vaccines must never be given to any age group."),
        ],
    },
    {
        "program": "NAP",
        "category": CourseCategory.MATERNAL_CHILD,
        "text": "At a 6-week postnatal Child Welfare Clinic visit in Ghana, a mother reports giving her newborn water and herbal tea alongside breast milk because the weather is hot. What is the best health education response by the NAP?",
        "rationale": "Breast milk is over 80% water and provides complete hydration and nutrition for the first 6 months; adding water or herbal teas increases diarrhoea risk and reduces breast milk intake.",
        "choices": [
            ("Counsel the mother on exclusive breastfeeding for the first 6 months without water, herbal teas, or other foods", True, "Correct: Exclusive breastfeeding meets all fluid and nutritional needs for the first 6 months."),
            ("Advise giving 50 mL of boiled water after every breastfeed", False, "Supplementation before 6 months undermines exclusive breastfeeding."),
            ("Recommend starting thin maize porridge at 8 weeks", False, "Complementary foods start at 6 completed months."),
            ("Tell the mother to stop breastfeeding during hot afternoons", False, "Frequent breastfeeding on demand keeps the infant hydrated."),
        ],
    },
    {
        "program": "NAP",
        "category": CourseCategory.COMMUNITY,
        "text": "While plotting a 14-month-old child's weight on the Ghana Health Service Maternal and Child Health Record Book growth chart, the NAP notices the growth curve has flattened horizontally over two consecutive monthly visits. How should the NAP interpret this finding?",
        "rationale": "A flat growth curve indicates growth faltering (no weight gain), requiring thorough feeding assessment, illness screening, and caregiver nutrition counselling before severe malnutrition develops.",
        "choices": [
            ("Growth faltering requiring feeding assessment, illness check, and targeted caregiver counselling", True, "Correct: A flat line is an early warning sign of inadequate nutrition or underlying infection."),
            ("Normal healthy growth because the child did not lose weight", False, "Young children should gain weight steadily every month."),
            ("Indication to stop all vaccinations until age 2", False, "Mild malnutrition or growth faltering is not a contraindication to immunization."),
            ("Sign that the child is overweight and needs restricted meals", False, "Flattening indicates undernutrition/stagnation, not excess weight."),
        ],
    },
]


class Command(BaseCommand):
    help = "Seeds scenario-based N&MC CBT questions across all 6 programmes (RGN, RM, RPN, CHN, NAC, NAP)."

    @transaction.atomic
    def handle(self, *args, **options):
        courses_by_key = {}
        for code, title, category, level, program, semester in COURSE_BLUEPRINTS:
            course, _ = Course.objects.get_or_create(
                code=code,
                level=level,
                defaults={
                    "title": title,
                    "category": category,
                    "program": program,
                    "semester": semester,
                    "is_published": True,
                },
            )
            courses_by_key[(program, category)] = course
            courses_by_key.setdefault(program, course)

        created_count = 0
        for item in QUESTION_BANK:
            course = (
                courses_by_key.get((item["program"], item["category"]))
                or courses_by_key.get(item["program"])
                or Course.objects.filter(program=item["program"], is_published=True).first()
            )
            if not course:
                continue

            question, created = Question.objects.get_or_create(
                course=course,
                text=item["text"],
                defaults={
                    "rationale": item["rationale"],
                    "is_published": True,
                    "review_status": "APPROVED",
                },
            )
            if created:
                created_count += 1
                for idx, (choice_text, is_correct, choice_rationale) in enumerate(item["choices"]):
                    Choice.objects.create(
                        question=question,
                        text=choice_text,
                        is_correct=is_correct,
                        rationale=choice_rationale,
                        position=idx,
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done! Seeded {created_count} new N&MC questions across {len(COURSE_BLUEPRINTS)} courses (all 6 programmes)."
            )
        )