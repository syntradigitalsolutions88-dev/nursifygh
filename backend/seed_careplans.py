import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nursify_core.settings')
django.setup()

from careplans.models import NandaDiagnosis, CarePlanTemplate
from accounts.models import User

# We need a creator for the templates. Let's use your admin account.
admin = User.objects.filter(email='syntradigitalsolutions88@gmail.com').first()
if not admin:
    print("❌ Admin user not found. Please make sure you are connected to the right DB.")
    exit()

print("1. Creating NANDA Diagnoses...")
diag1, _ = NandaDiagnosis.objects.get_or_create(
    code='00132',
    defaults={
        'label': 'Acute Pain',
        'definition': 'Unpleasant sensory and emotional experience associated with actual or potential tissue damage.',
        'domain': '12 Comfort',
        'defining_characteristics': 'Verbal report of pain, guarding behavior, facial expression of pain.',
        'related_factors': 'Biological injury agents, psychological factors.'
    }
)

diag2, _ = NandaDiagnosis.objects.get_or_create(
    code='00030',
    defaults={
        'label': 'Impaired Gas Exchange',
        'definition': 'Excess or deficit in oxygenation and/or carbon dioxide elimination at the alveolar-capillary membrane.',
        'domain': '4 Activity/Rest',
        'defining_characteristics': 'Hypoxemia, hypercapnia, abnormal breathing pattern.',
        'related_factors': 'Ventilation-perfusion imbalance, airway alterations.'
    }
)

diag3, _ = NandaDiagnosis.objects.get_or_create(
    code='00011',
    defaults={
        'label': 'Constipation',
        'definition': 'Decrease in normal frequency of defecation accompanied by difficult or incomplete passage of stool.',
        'domain': '3 Elimination and Exchange',
        'defining_characteristics': 'Straining, hard formed stool, abdominal pain.',
        'related_factors': 'Insufficient physical activity, inadequate fluid intake.'
    }
)

print("2. Creating Care Plan Templates...")

templates = [
    {
        'title': 'Post-Operative Pain Management',
        'description': 'Standard care plan for a patient experiencing acute pain following abdominal surgery.',
        'primary_diagnosis': diag1,
        'is_published': True,
        'patient_scenario': 'Mr. A, a 45-year-old male, is 2 days post-op from an appendectomy. He reports sharp pain at the incision site rated 7/10.'
    },
    {
        'title': 'Pediatric Asthma Exacerbation',
        'description': 'Care plan for a child presenting with impaired gas exchange due to an acute asthma attack.',
        'primary_diagnosis': diag2,
        'is_published': True,
        'patient_scenario': 'Master B, a 7-year-old male, is brought to the ER with wheezing, shortness of breath, and an O2 sat of 89% on room air.'
    },
    {
        'title': 'Elderly Constipation Management',
        'description': 'Care plan for an elderly patient with chronic constipation due to immobility.',
        'primary_diagnosis': diag3,
        'is_published': True,
        'patient_scenario': 'Madam C, a 78-year-old female, is bedridden and has not had a bowel movement in 4 days. She complains of abdominal discomfort.'
    }
]

for t in templates:
    tmpl, created = CarePlanTemplate.objects.get_or_create(
        title=t['title'],
        defaults={
            'description': t['description'],
            'primary_diagnosis': t['primary_diagnosis'],
            'is_published': t['is_published'],
            'patient_scenario': t['patient_scenario'],
            'created_by': admin
        }
    )
    if created:
        print(f"✅ Created Template: {t['title']}")

print("🎉 SUCCESS: Public Library templates are live!")