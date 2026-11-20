"""Convert the 27 templates into real, public Care Plans for the Library."""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nursify_core.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from careplans.models import CarePlanTemplate, CarePlan, SmartGoal, Intervention

User = get_user_model()

# 1. Create or get a "System" user to be the author of these library plans
author, _ = User.objects.get_or_create(
    email="official@nursifygh.com",
    defaults={
        "full_name": "NursifyGH Official",
        "program": "GENERAL",
        "level": 300,
        "is_active": True
    }
)
if not author.has_usable_password():
    author.set_password("AdminPassword123!")
    author.save()

# 2. Loop through all templates and convert them to public CarePlans
templates = CarePlanTemplate.objects.all()
created_count = 0

for tpl in templates:
    # Check if we already made a library plan for this template
    if CarePlan.objects.filter(title=f"{tpl.title} (Master Plan)").exists():
        continue
        
    plan = CarePlan.objects.create(
        student=author,
        title=f"{tpl.title} (Master Plan)",
        patient_scenario=tpl.description,
        primary_diagnosis=tpl.primary_diagnosis,
        source_template=tpl,
        is_public=True,
        is_submitted=True,
        submitted_at=timezone.now(),
        view_count=100 + created_count * 5  # Give it some fake views
    )
    
    # Copy Goals
    for i, g in enumerate(tpl.default_goals):
        SmartGoal.objects.create(
            care_plan=plan,
            specific=g.get('specific', ''),
            measurable=g.get('measurable', ''),
            achievable=g.get('achievable', ''),
            relevant=g.get('relevant', ''),
            time_bound=g.get('time_bound', ''),
            position=i
        )
        
    # Copy Interventions
    for i, iv in enumerate(tpl.default_interventions):
        Intervention.objects.create(
            care_plan=plan,
            action=iv.get('action', ''),
            rationale=iv.get('rationale', ''),
            position=i
        )
    
    created_count += 1

print(f"✅ Successfully added {created_count} Master Plans to the Community Library!")