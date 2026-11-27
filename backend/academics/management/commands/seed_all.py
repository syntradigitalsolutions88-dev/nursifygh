from django.core.management import call_command

# Inside Command.handle():
call_command("seed_nmc_questions")
call_command("seed_clinical_cases")
call_command("seed_nac_nap_careplans")