from academics.models import Course

CURRICULUM = [
    ('BNS-111', 'Basic Nursing', 'FUNDAMENTALS', 100, 'S1'),
    ('HAP-111', 'Human Anatomy & Physiology I', 'ANATOMY', 100, 'S1'),
    ('MIP-111', 'Microbiology & Infection Prevention', 'FUNDAMENTALS', 100, 'S1'),
    ('NMI-111', 'Nursing Informatics', 'FUNDAMENTALS', 100, 'S1'),
    ('TCM-111', 'Therapeutic Communication', 'FUNDAMENTALS', 100, 'S1'),
    ('ADJ-111', 'Professional Adjustment in Nursing', 'ETHICS', 100, 'S1'),
    ('FED-111', 'First Aid, Emergency & Disaster Mgmt', 'FUNDAMENTALS', 100, 'S1'),
    ('AND-122', 'Advanced Nursing I', 'FUNDAMENTALS', 100, 'S2'),
    ('BHS-122', 'Behavioral Sciences', 'MENTAL_HEALTH', 100, 'S2'),
    ('CPA-122', 'Child Protection and Abuse', 'MATERNAL', 100, 'S2'),
    ('HAP-122', 'Human Anatomy & Physiology II', 'ANATOMY', 100, 'S2'),
    ('NAD-122', 'Nutrition and Dietetics', 'COMMUNITY', 100, 'S2'),
    ('NPN-122', 'Nursing Process', 'FUNDAMENTALS', 100, 'S2'),
    ('MMN-211', 'Medicine and Medical Nursing I', 'MED_SURG', 200, 'S1'),
    ('OBN-211', 'Obstetric Nursing', 'MATERNAL', 200, 'S1'),
    ('PAD-211', 'Paediatric Nursing I', 'MATERNAL', 200, 'S1'),
    ('PFC-211', 'Patient/Family-Centred Care Study', 'FUNDAMENTALS', 200, 'S1'),
    ('PTP-211', 'Pharmacology & Therapeutics I', 'PHARMACOLOGY', 200, 'S1'),
    ('ADN-211', 'Advanced Nursing II', 'FUNDAMENTALS', 200, 'S1'),
    ('GHN-211', 'Gerontology and Home Nursing', 'COMMUNITY', 200, 'S1'),
    ('MMN-222', 'Medicine and Medical Nursing II', 'MED_SURG', 200, 'S2'),
    ('PAD-222', 'Paediatric Nursing II', 'MATERNAL', 200, 'S2'),
    ('PTP-222', 'Pharmacology & Therapeutics II', 'PHARMACOLOGY', 200, 'S2'),
    ('PSN-222', 'Psychiatric Nursing', 'MENTAL_HEALTH', 200, 'S2'),
    ('PHN-222', 'Public Health Nursing', 'COMMUNITY', 200, 'S2'),
    ('NUR-222', 'Nursing Research', 'RESEARCH', 200, 'S2'),
    ('MMN-311', 'Medicine and Medical Nursing III', 'MED_SURG', 300, 'S1'),
    ('OBN-311', 'Obstetric Nursing', 'MATERNAL', 300, 'S1'),
    ('PAD-311', 'Paediatric Nursing I', 'MATERNAL', 300, 'S1'),
    ('PFC-311', 'Patient/Family-Centred Care Study', 'FUNDAMENTALS', 300, 'S1'),
    ('NPN-311', 'Nursing Process', 'FUNDAMENTALS', 300, 'S1'),
    ('AND-311', 'Advanced Nursing III', 'FUNDAMENTALS', 300, 'S1'),
    ('CBR-322', 'Community-Based Rehabilitation', 'COMMUNITY', 300, 'S2'),
    ('CTM-322', 'Complementary & Traditional Medicine', 'COMMUNITY', 300, 'S2'),
    ('PAD-322', 'Paediatric Nursing II', 'MATERNAL', 300, 'S2'),
    ('PHN-322', 'Public Health Nursing', 'COMMUNITY', 300, 'S2'),
    ('RMS-322', 'Relationship Marketing & Entrepreneurship', 'ETHICS', 300, 'S2'),
]

PROGRAMS = ['PSYCHIATRIC', 'MIDWIFERY', 'COMMUNITY', 'GENERAL']
created = 0

for prog in PROGRAMS:
    for code, title, cat, level, sem in CURRICULUM:
        suffix = '-P' if prog == 'PSYCHIATRIC' else '-M' if prog == 'MIDWIFERY' else '-C' if prog == 'COMMUNITY' else ''
        final_code = f'{code}{suffix}'
        
        Course.objects.create(
            code=final_code, title=title, category=cat, level=level,
            program=prog, semester=sem
        )
        created += 1

print(f'✅ Successfully created {created} courses across ALL departments and levels.')