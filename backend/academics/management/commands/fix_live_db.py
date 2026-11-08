from django.core.management.base import BaseCommand
from django.core.management import call_command
from academics.models import Course, Question, QuizAttempt, QuizAnswer, Choice

class Command(BaseCommand):
    help = 'Wipes DB, seeds curriculum, imports CSVs, and copies to departments'

    def handle(self, *args, **options):
        self.stdout.write("1. Wiping old data...")
        QuizAnswer.objects.all().delete()
        QuizAttempt.objects.all().delete()
        Question.objects.all().delete()
        Course.objects.all().delete()

        self.stdout.write("2. Creating 148 courses...")
        CURRICULUM = [
            ('BNS-111', 'Basic Nursing', 'FUNDAMENTALS', 100, 'S1'), ('HAP-111', 'Human Anatomy & Physiology I', 'ANATOMY', 100, 'S1'),
            ('MIP-111', 'Microbiology & Infection Prevention', 'FUNDAMENTALS', 100, 'S1'), ('NMI-111', 'Nursing Informatics', 'FUNDAMENTALS', 100, 'S1'),
            ('TCM-111', 'Therapeutic Communication', 'FUNDAMENTALS', 100, 'S1'), ('ADJ-111', 'Professional Adjustment in Nursing', 'ETHICS', 100, 'S1'),
            ('FED-111', 'First Aid, Emergency & Disaster Mgmt', 'FUNDAMENTALS', 100, 'S1'), ('AND-122', 'Advanced Nursing I', 'FUNDAMENTALS', 100, 'S2'),
            ('BHS-122', 'Behavioral Sciences', 'MENTAL_HEALTH', 100, 'S2'), ('CPA-122', 'Child Protection and Abuse', 'MATERNAL', 100, 'S2'),
            ('HAP-122', 'Human Anatomy & Physiology II', 'ANATOMY', 100, 'S2'), ('NAD-122', 'Nutrition and Dietetics', 'COMMUNITY', 100, 'S2'),
            ('NPN-122', 'Nursing Process', 'FUNDAMENTALS', 100, 'S2'), ('MMN-211', 'Medicine and Medical Nursing I', 'MED_SURG', 200, 'S1'),
            ('OBN-211', 'Obstetric Nursing', 'MATERNAL', 200, 'S1'), ('PAD-211', 'Paediatric Nursing I', 'MATERNAL', 200, 'S1'),
            ('PFC-211', 'Patient/Family-Centred Care Study', 'FUNDAMENTALS', 200, 'S1'), ('PTP-211', 'Pharmacology & Therapeutics I', 'PHARMACOLOGY', 200, 'S1'),
            ('ADN-211', 'Advanced Nursing II', 'FUNDAMENTALS', 200, 'S1'), ('GHN-211', 'Gerontology and Home Nursing', 'COMMUNITY', 200, 'S1'),
            ('MMN-222', 'Medicine and Medical Nursing II', 'MED_SURG', 200, 'S2'), ('PAD-222', 'Paediatric Nursing II', 'MATERNAL', 200, 'S2'),
            ('PTP-222', 'Pharmacology & Therapeutics II', 'PHARMACOLOGY', 200, 'S2'), ('PSN-222', 'Psychiatric Nursing', 'MENTAL_HEALTH', 200, 'S2'),
            ('PHN-222', 'Public Health Nursing', 'COMMUNITY', 200, 'S2'), ('NUR-222', 'Nursing Research', 'RESEARCH', 200, 'S2'),
            ('MMN-311', 'Medicine and Medical Nursing III', 'MED_SURG', 300, 'S1'), ('OBN-311', 'Obstetric Nursing', 'MATERNAL', 300, 'S1'),
            ('PAD-311', 'Paediatric Nursing I', 'MATERNAL', 300, 'S1'), ('PFC-311', 'Patient/Family-Centred Care Study', 'FUNDAMENTALS', 300, 'S1'),
            ('NPN-311', 'Nursing Process', 'FUNDAMENTALS', 300, 'S1'), ('AND-311', 'Advanced Nursing III', 'FUNDAMENTALS', 300, 'S1'),
            ('CBR-322', 'Community-Based Rehabilitation', 'COMMUNITY', 300, 'S2'), ('CTM-322', 'Complementary & Traditional Medicine', 'COMMUNITY', 300, 'S2'),
            ('PAD-322', 'Paediatric Nursing II', 'MATERNAL', 300, 'S2'), ('PHN-322', 'Public Health Nursing', 'COMMUNITY', 300, 'S2'),
            ('RMS-322', 'Relationship Marketing & Entrepreneurship', 'ETHICS', 300, 'S2'),
        ]
        PROGRAMS = ['PSYCHIATRIC', 'MIDWIFERY', 'COMMUNITY', 'GENERAL']
        for prog in PROGRAMS:
            for code, title, cat, level, sem in CURRICULUM:
                suffix = '-P' if prog == 'PSYCHIATRIC' else '-M' if prog == 'MIDWIFERY' else '-C' if prog == 'COMMUNITY' else ''
                Course.objects.create(code=f'{code}{suffix}', title=title, category=cat, level=level, program=prog, semester=sem)

        self.stdout.write("3. Importing CSVs...")
        for csv in ['nur-101_anatomy.csv', 'nur-102_fundamentals.csv', 'nur-201_fundamentals.csv', 'nur-202_medsurg.csv']:
            try:
                call_command('import_questions', f'content_imports/{csv}')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to import {csv}: {e}"))

        self.stdout.write("4. Copying questions to departments...")
        SUFFIXES = ['-P', '-M', '-C']
        courses_with_questions = Course.objects.filter(questions__isnull=False).distinct()
        for parent_course in courses_with_questions:
            if parent_course.program == 'GENERAL':
                for suffix in SUFFIXES:
                    target_code = f'{parent_course.code}{suffix}'
                    try:
                        target_course = Course.objects.get(code=target_code, level=parent_course.level)
                    except Course.DoesNotExist:
                        continue
                    for q in parent_course.questions.all():
                        new_q = Question.objects.create(course=target_course, text=q.text, rationale=q.rationale, is_published=q.is_published)
                        for choice in q.choices.all():
                            Choice.objects.create(question=new_q, text=choice.text, is_correct=choice.is_correct, rationale=choice.rationale, position=choice.position)
        
        self.stdout.write(self.style.SUCCESS("✅ LIVE DATABASE FIXED SUCCESSFULLY!"))
