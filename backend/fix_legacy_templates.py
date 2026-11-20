"""Fix the 3 legacy care plan templates that had empty goals/interventions."""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nursify_core.settings')
django.setup()

from careplans.models import CarePlanTemplate

FIXES = {
    'Elderly Constipation Management': {
        'goals': [
            {'specific': 'Patient passes a soft stool without straining.',
             'measurable': 'Bowel movement recorded within 48 hours; Bristol stool type 3-4.',
             'achievable': 'Through prescribed laxative, increased fibre and fluids.',
             'relevant': 'Because constipation causes discomfort and can lead to impaction.',
             'time_bound': 'Within 48 hours.'},
            {'specific': 'Patient increases dietary fibre and fluid intake.',
             'measurable': 'Eats at least 2 fibre-rich meals/day; drinks 1.5-2 L/day.',
             'achievable': 'Through dietary counselling using local foods (kontomire, beans, pawpaw).',
             'relevant': 'Because fibre and fluid are first-line for preventing recurrence.',
             'time_bound': 'Within 1 week.'},
            {'specific': 'Patient demonstrates understanding of bowel routine.',
             'measurable': 'Verbalises 3 constipation prevention measures.',
             'achievable': 'Through structured education.',
             'relevant': 'Because self-management prevents recurrence.',
             'time_bound': 'By discharge.'},
        ],
        'interventions': [
            {'action': 'Administer prescribed laxative and monitor bowel output.',
             'rationale': 'Relieves acute constipation.'},
            {'action': 'Encourage 1.5-2 L fluids per day unless contraindicated.',
             'rationale': 'Softens stool and promotes peristalsis.'},
            {'action': 'Provide high-fibre diet using local foods.',
             'rationale': 'Increases stool bulk and stimulates bowel movement.'},
            {'action': 'Encourage early ambulation and regular toileting routine.',
             'rationale': 'Physical activity and routine improve bowel function.'},
            {'action': 'Teach patient to avoid prolonged straining.',
             'rationale': 'Straining increases risk of haemorrhoids and cardiovascular events.'},
        ],
    },
    'Pediatric Asthma Exacerbation': {
        'goals': [
            {'specific': 'Child maintains adequate oxygenation.',
             'measurable': 'SpO2 >=94% on room air; respiratory rate within normal for age.',
             'achievable': 'Through prescribed bronchodilator and oxygen if needed.',
             'relevant': 'Because hypoxaemia is the primary risk in acute asthma.',
             'time_bound': 'Within 1 hour.'},
            {'specific': 'Child work of breathing reduces.',
             'measurable': 'No accessory muscle use; speaks in full sentences.',
             'achievable': 'Through salbutamol nebulisation and positioning.',
             'relevant': 'Because reduced work of breathing indicates improving airway obstruction.',
             'time_bound': 'Within 30 minutes.'},
            {'specific': 'Caregiver demonstrates correct inhaler technique.',
             'measurable': 'Caregiver performs 6 steps correctly with spacer.',
             'achievable': 'Through teach-back and practice.',
             'relevant': 'Because correct technique prevents future exacerbations.',
             'time_bound': 'Before discharge.'},
        ],
        'interventions': [
            {'action': 'Administer prescribed salbutamol nebulisation and reassess after 20 minutes.',
             'rationale': 'Beta-2 agonists reverse bronchoconstriction rapidly.'},
            {'action': 'Position child upright and give oxygen if SpO2 <94%.',
             'rationale': 'Improves ventilation and reduces work of breathing.'},
            {'action': 'Monitor respiratory rate, SpO2, work of breathing and PEFR.',
             'rationale': 'Detects deterioration and guides escalation.'},
            {'action': 'Teach correct inhaler and spacer technique to caregiver.',
             'rationale': 'Correct technique prevents future exacerbations.'},
            {'action': 'Educate on trigger avoidance (dust, smoke, cold air, pollen).',
             'rationale': 'Trigger avoidance reduces exacerbation frequency.'},
        ],
    },
    'Post-Operative Pain Management': {
        'goals': [
            {'specific': 'Patient pain reduces to <=3/10.',
             'measurable': 'NRS score reassessed 30 min after analgesia.',
             'achievable': 'Through multimodal analgesia per prescription.',
             'relevant': 'Because adequate pain control enables recovery activities.',
             'time_bound': 'Within 30 minutes.'},
            {'specific': 'Patient performs deep breathing and early ambulation.',
             'measurable': 'Performs 10 deep breaths hourly; walks within 24 hours.',
             'achievable': 'With adequate analgesia and nurse support.',
             'relevant': 'Because these prevent atelectasis and DVT.',
             'time_bound': 'Within 24 hours.'},
            {'specific': 'Patient reports sleep uninterrupted by pain.',
             'measurable': 'Sleeps >=4 continuous hours at night.',
             'achievable': 'Through scheduled analgesia before bedtime.',
             'relevant': 'Because sleep supports healing and reduces pain perception.',
             'time_bound': 'Within 48 hours.'},
        ],
        'interventions': [
            {'action': 'Administer prescribed multimodal analgesia (paracetamol + opioid) and reassess in 30 min.',
             'rationale': 'Multimodal analgesia improves pain control and reduces opioid needs.'},
            {'action': 'Splint incision with pillow during coughing and movement.',
             'rationale': 'Reduces pain and improves effectiveness of pulmonary hygiene.'},
            {'action': 'Assist early mobilisation within 24 hours as tolerated.',
             'rationale': 'Reduces DVT, atelectasis and ileus risk.'},
            {'action': 'Use non-pharmacological measures (positioning, distraction, relaxation).',
             'rationale': 'Adjuncts reduce pain perception and opioid requirements.'},
            {'action': 'Reassess pain every 4 hours and 30 min after each analgesic.',
             'rationale': 'Ensures adequate control and detects complications early.'},
        ],
    },
}

for title, data in FIXES.items():
    t = CarePlanTemplate.objects.filter(title=title).first()
    if not t:
        print(f'SKIP (not found): {title}')
        continue
    t.default_goals = data['goals']
    t.default_interventions = data['interventions']
    t.save()
    print(f'FIXED: {title}')

print('\n--- FINAL CHECK ---')
bad = 0
for t in CarePlanTemplate.objects.all():
    g = len(t.default_goals) if t.default_goals else 0
    i = len(t.default_interventions) if t.default_interventions else 0
    if g == 0 or i == 0:
        print(f'  BROKEN: {t.title}: {g} goals, {i} interventions')
        bad += 1
print(f'Total broken: {bad}')
print(f'Total templates: {CarePlanTemplate.objects.count()}')