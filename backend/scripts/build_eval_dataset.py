# -*- coding: utf-8 -*-
"""Dataset builder for Arogya Mithra Phase 5C.7 Multilingual Clinical Evaluation.

Generates 30 entirely synthetic consultation cases with source-grounded expected fields:
- 6 English
- 6 Kannada script
- 6 Hindi script
- 6 Kanglish (Kannada-English code-mixed)
- 6 Hinglish (Hindi-English code-mixed)
"""

import json
from pathlib import Path

DATASET = {
    "version": "1.0.0",
    "description": "Arogya Mithra 30-case Multilingual Clinical Evaluation Dataset (Synthetic)",
    "total_cases": 30,
    "language_groups": {
        "English": 6,
        "Kannada": 6,
        "Hindi": 6,
        "Kanglish": 6,
        "Hinglish": 6,
    },
    "cases": [
        # ====================================================================
        # English (EN_01 to EN_06)
        # ====================================================================
        {
            "case_id": "EN_01",
            "language_group": "English",
            "language_code": "en",
            "consultation_text": (
                "Patient presents with cough and low-grade fever for 5 days. Cough is dry, not severe. "
                "Denies shortness of breath, denies chest pain, and no hemoptysis. "
                "Had asthma as a child 10 years ago, but reports no recent wheezing. "
                "Stopped Cetirizine last week. "
                "Doctor notes: temp 99.8 F, pulse 82 bpm, respiratory rate 16/min, chest bilateral vesicular breath sounds, no crackles or wheezes. "
                "Impression: Suspected acute viral bronchitis, rule out mild bronchospasm. "
                "Plan: Steam inhalation, warm fluids, Paracetamol 500mg SOS. "
                "Follow up in 5 days if cough persists; return immediately if high fever or difficulty breathing develops."
            ),
            "expected": {
                "reported_symptoms": ["cough", "low-grade fever", "dry cough"],
                "pertinent_negatives": ["shortness of breath", "chest pain", "hemoptysis", "recent wheezing"],
                "qualified_symptoms": ["dry, not severe"],
                "symptoms_not_improving": [],
                "durations": {"cough": "5 days", "fever": "5 days"},
                "historical_symptoms": ["asthma as a child 10 years ago"],
                "stopped_or_denied_medications": ["Cetirizine"],
                "primary_impression": "Suspected acute viral bronchitis",
                "differential_diagnoses": ["rule out mild bronchospasm"],
                "is_diagnostic_uncertainty_expected": True,
                "proposed_medications": ["Paracetamol 500mg SOS"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "temp 99.8 F, pulse 82 bpm, respiratory rate 16/min",
                "expected_physical_exam": ["bilateral vesicular breath sounds", "no crackles or wheezes"],
                "follow_up": "Follow up in 5 days if cough persists",
                "red_flag_warnings": ["return immediately if high fever or difficulty breathing develops"],
            },
        },
        {
            "case_id": "EN_02",
            "language_group": "English",
            "language_code": "en",
            "consultation_text": (
                "Patient complains of watery diarrhea and nausea for 2 days. Denies vomiting. "
                "Patient initially mentioned mild lower abdominal cramps, but later denies any persistent abdominal pain on palpation. "
                "Denies taking pain medications or antibiotics at home. "
                "Doctor finds soft abdomen, mild diffuse tenderness without guarding or rebound, temp normal, BP 110/70. "
                "Impression: Acute uncomplicated gastroenteritis. "
                "Plan: ORS packets 1L daily, Zinc 20mg once daily for 14 days. "
                "Review in 3 days; return immediately if blood in stools or unable to retain liquids."
            ),
            "expected": {
                "reported_symptoms": ["watery diarrhea", "nausea", "mild lower abdominal cramps"],
                "pertinent_negatives": ["vomiting", "persistent abdominal pain", "blood in stools"],
                "qualified_symptoms": ["mild lower abdominal cramps"],
                "symptoms_not_improving": [],
                "durations": {"watery diarrhea": "2 days", "nausea": "2 days"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": ["pain medications", "antibiotics"],
                "primary_impression": "Acute uncomplicated gastroenteritis",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["ORS packets 1L daily", "Zinc 20mg once daily for 14 days"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "temp normal, BP 110/70",
                "expected_physical_exam": ["soft abdomen", "mild diffuse tenderness without guarding or rebound"],
                "follow_up": "Review in 3 days",
                "red_flag_warnings": ["return immediately if blood in stools or unable to retain liquids"],
            },
        },
        {
            "case_id": "EN_03",
            "language_group": "English",
            "language_code": "en",
            "consultation_text": (
                "Patient presents for routine follow-up of hypertension. "
                "Reports mild occipital headache since 3 days, not improving with sleep. "
                "Discontinued Telmisartan 40mg 2 weeks ago because of dizziness. "
                "Denies chest heaviness, palpitation, or visual blurriness. "
                "No vitals or physical examination performed during this telephonic consult. "
                "Assessment: Uncontrolled essential hypertension secondary to medication non-compliance. "
                "Plan: Restart Telmisartan 40mg once daily in morning. "
                "Advised clinic visit within 48 hours for formal blood pressure measurement; report to emergency if severe headache or chest pain occurs."
            ),
            "expected": {
                "reported_symptoms": ["mild occipital headache"],
                "pertinent_negatives": ["chest heaviness", "palpitation", "visual blurriness"],
                "qualified_symptoms": ["mild occipital headache"],
                "symptoms_not_improving": ["headache not improving with sleep"],
                "durations": {"headache": "3 days"},
                "historical_symptoms": ["hypertension"],
                "stopped_or_denied_medications": [],
                "restarted_medications": ["Telmisartan 40mg"],
                "primary_impression": "Uncontrolled essential hypertension",
                "differential_diagnoses": ["medication non-compliance"],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["Restart Telmisartan 40mg once daily in morning"],
                "has_missing_objective_findings": True,
                "expected_vitals_summary": None,
                "expected_physical_exam": [],
                "follow_up": "Advised clinic visit within 48 hours for formal blood pressure measurement",
                "red_flag_warnings": ["report to emergency if severe headache or chest pain occurs"],
            },
        },
        {
            "case_id": "EN_04",
            "language_group": "English",
            "language_code": "en",
            "consultation_text": (
                "Patient reports itchy red rash over bilateral forearms for 4 days. "
                "Itching is intermittent, not severe. "
                "Denies facial swelling, denies lip edema, and no breathing difficulty. "
                "History of penicillin allergy in childhood (hives). "
                "Denies using any steroid creams at home. "
                "Physician examination: Erythematous maculopapular rash on bilateral flexor forearms, no crusting or weeping, mucous membranes uninvolved. "
                "Impression: Contact dermatitis, rule out drug eruption. "
                "Plan: Calamine lotion application BID, Levocetirizine 5mg at bedtime for 5 days. "
                "Follow up in 1 week if no improvement."
            ),
            "expected": {
                "reported_symptoms": ["itchy red rash over bilateral forearms"],
                "pertinent_negatives": ["facial swelling", "lip edema", "breathing difficulty"],
                "qualified_symptoms": ["itching intermittent, not severe"],
                "symptoms_not_improving": [],
                "durations": {"rash": "4 days"},
                "historical_symptoms": ["penicillin allergy in childhood (hives)"],
                "stopped_or_denied_medications": ["steroid creams"],
                "primary_impression": "Contact dermatitis",
                "differential_diagnoses": ["rule out drug eruption"],
                "is_diagnostic_uncertainty_expected": True,
                "proposed_medications": ["Calamine lotion application BID", "Levocetirizine 5mg at bedtime for 5 days"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": None,
                "expected_physical_exam": ["Erythematous maculopapular rash on bilateral flexor forearms", "mucous membranes uninvolved"],
                "follow_up": "Follow up in 1 week if no improvement",
                "red_flag_warnings": [],
            },
        },
        {
            "case_id": "EN_05",
            "language_group": "English",
            "language_code": "en",
            "consultation_text": (
                "Patient complains of dull band-like headache for 1 week. "
                "Reports headache is not worsening, but persistent. "
                "Ambiguous history regarding whether nausea occurred yesterday morning; patient is unsure. "
                "Denies photophobia, neck stiffness, and fever. "
                "Doctor examination: Cranial nerves intact, neck supple, fundus normal, BP 124/82. "
                "Impression: Probable tension-type headache. "
                "Plan: Naproxen 250mg PRN with food, stress relaxation counseling. "
                "Return if sudden thunderclap headache or visual loss occurs."
            ),
            "expected": {
                "reported_symptoms": ["dull band-like headache"],
                "pertinent_negatives": ["photophobia", "neck stiffness", "fever"],
                "qualified_symptoms": ["headache not worsening, but persistent"],
                "symptoms_not_improving": ["persistent headache"],
                "durations": {"headache": "1 week"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": [],
                "primary_impression": "Probable tension-type headache",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": True,
                "proposed_medications": ["Naproxen 250mg PRN with food"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "BP 124/82",
                "expected_physical_exam": ["Cranial nerves intact", "neck supple", "fundus normal"],
                "follow_up": "[Follow-up schedule not documented]",
                "red_flag_warnings": ["Return if sudden thunderclap headache or visual loss occurs"],
            },
        },
        {
            "case_id": "EN_06",
            "language_group": "English",
            "language_code": "en",
            "consultation_text": (
                "Patient reports sharp left-sided chest discomfort for 1 day, exacerbated by deep inspiration and torso twisting. "
                "Denies exertional breathlessness, diaphoresis, radiating pain to left arm or jaw, and palpitations. "
                "Denies prior heart disease. "
                "Physical exam: Localized tenderness over left 4th and 5th costochondral junctions, heart sounds regular, S1 S2 heard, lungs clear. "
                "Impression: Musculoskeletal costochondritis, cardiac etiology unlikely. "
                "Plan: Paracetamol 650mg TDS for 3 days, local warm compress. "
                "No formal follow-up scheduled; seek immediate emergency care if chest pressure or sweating develops."
            ),
            "expected": {
                "reported_symptoms": ["sharp left-sided chest discomfort"],
                "pertinent_negatives": ["exertional breathlessness", "diaphoresis", "radiating pain to arm or jaw", "palpitations"],
                "qualified_symptoms": ["sharp left-sided chest discomfort exacerbated by deep inspiration"],
                "symptoms_not_improving": [],
                "durations": {"chest discomfort": "1 day"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": [],
                "primary_impression": "Musculoskeletal costochondritis",
                "differential_diagnoses": ["cardiac etiology unlikely"],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["Paracetamol 650mg TDS for 3 days"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": None,
                "expected_physical_exam": ["Localized tenderness over left 4th and 5th costochondral junctions", "heart sounds regular S1 S2", "lungs clear"],
                "follow_up": "[Follow-up schedule not documented]",
                "red_flag_warnings": ["seek immediate emergency care if chest pressure or sweating develops"],
            },
        },

        # ====================================================================
        # Kannada Script (KN_01 to KN_06)
        # ====================================================================
        {
            "case_id": "KN_01",
            "language_group": "Kannada",
            "language_code": "kn",
            "consultation_text": (
                "ರೋಗಿಯು ೩ ದಿನಗಳಿಂದ ಜ್ವರ ಮತ್ತು ಗಂಟಲು ನೋವಿನಿಂದ ಬಳಲುತ್ತಿದ್ದಾರೆ. "
                "ತಲೆನೋವು ಇದೆ ಆದರೆ ತೀವ್ರವಾಗಿಲ್ಲ (not severe). "
                "ಕೆಮ್ಮು ಇಲ್ಲ, ವಾಂತಿ ಆಗುತ್ತಿಲ್ಲ, ಉಸಿರಾಟದ ತೊಂದರೆ ಇಲ್ಲವೇ ಇಲ್ಲ. "
                "ವೈದ್ಯರ ತಪಾಸಣೆ: ದೇಹದ ತಾಪಮಾನ ೧೦೧.೨ F, ಗಂಟಲು ಕೆಂಪಾಗಿದೆ, ಎದೆ ಪರೀಕ್ಷೆ ಸಾಮಾನ್ಯ. "
                "ರೋಗನಿರ್ಣಯ: ಶಂಕಿತ ವೈರಲ್ ಗಂಟಲು ಸೋಂಕು (Suspected viral pharyngitis). "
                "ಚಿಕಿತ್ಸೆ: ಪ್ಯಾರಸಿಟಮಾಲ್ ೬೫೦ ಮಿಗ್ರಾಂ ದಿನಕ್ಕೆ ೩ ಬಾರಿ, ಬೆಚ್ಚಗಿನ ನೀರಿನಿಂದ ಗಾರ್ಗಲ್ ಮಾಡಿ. "
                "೪ ದಿನಗಳ ನಂತರ ಮರುಪರಿಶೀಲನೆಗೆ ಬನ್ನಿ; ವಾಂತಿ ಅಥವಾ ಆಯಾಸ ಹೆಚ್ಚಾದರೆ ತಕ್ಷಣ ಆಸ್ಪತ್ರೆಗೆ ಬನ್ನಿ."
            ),
            "expected": {
                "reported_symptoms": ["ಜ್ವರ", "ಗಂಟಲು ನೋವು", "ತಲೆನೋವು"],
                "pertinent_negatives": ["ಕೆಮ್ಮು", "ವಾಂತಿ", "ಉಸಿರಾಟದ ತೊಂದರೆ"],
                "qualified_symptoms": ["ತಲೆನೋವು ಇದೆ ಆದರೆ ತೀವ್ರವಾಗಿಲ್ಲ"],
                "symptoms_not_improving": [],
                "durations": {"ಜ್ವರ": "೩ ದಿನಗಳು", "ಗಂಟಲು ನೋವು": "೩ ದಿನಗಳು"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": [],
                "primary_impression": "ಶಂಕಿತ ವೈರಲ್ ಗಂಟಲು ಸೋಂಕು (Suspected viral pharyngitis)",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": True,
                "proposed_medications": ["ಪ್ಯಾರಸಿಟಮಾಲ್ ೬೫೦ ಮಿಗ್ರಾಂ ದಿನಕ್ಕೆ ೩ ಬಾರಿ"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "ದೇಹದ ತಾಪಮಾನ ೧೦೧.೨ F",
                "expected_physical_exam": ["ಗಂಟಲು ಕೆಂಪಾಗಿದೆ", "ಎದೆ ಪರೀಕ್ಷೆ ಸಾಮಾನ್ಯ"],
                "follow_up": "೪ ದಿನಗಳ ನಂತರ ಮರುಪರಿಶೀಲನೆಗೆ ಬನ್ನಿ",
                "red_flag_warnings": ["ವಾಂತಿ ಅಥವಾ ಆಯಾಸ ಹೆಚ್ಚಾದರೆ ತಕ್ಷಣ ಆಸ್ಪತ್ರೆಗೆ ಬನ್ನಿ"],
            },
        },
        {
            "case_id": "KN_02",
            "language_group": "Kannada",
            "language_code": "kn",
            "consultation_text": (
                "ರೋಗಿಗೆ ೨ ದಿನಗಳಿಂದ ನೀರಿನಂತಹ ಭೇದಿ ಮತ್ತು ಹೊಟ್ಟೆ ಉಬ್ಬರ ಇದೆ. "
                "ಹೊಟ್ಟೆ ನೋವು ಸೌಮ್ಯವಾಗಿದೆ, ಹೆಚ್ಚಾಗುತ್ತಿಲ್ಲ. "
                "ರಕ್ತಸ್ರಾವ ಇಲ್ಲ, ವಾಂತಿ ಇಲ್ಲ. "
                "ಮನೆಯಲ್ಲಿ ಯಾವುದೇ ಆಂಟಿಬಯೋಟಿಕ್ ಮಾತ್ರೆ ತೆಗೆದುಕೊಂಡಿಲ್ಲ ಎಂದು ತಿಳಿಸಿದ್ದಾರೆ. "
                "ವೈದ್ಯರ ಪರೀಕ್ಷೆ: ನಾಡಿಮಿಡಿತ ೮೪, ರಕ್ತದೊತ್ತಡ ೧೧೮/೭೬, ಹೊಟ್ಟೆ ಮೃದುವಾಗಿದೆ. "
                "ರೋಗನಿರ್ಣಯ: ತೀವ್ರ ಜಠರಗರುಳು ಉರಿಯೂತ (Acute gastroenteritis). "
                "ಚಿಕಿತ್ಸೆ: ಒಆರ್ಎಸ್ (ORS) ದ್ರಾವಣ, ಝಿಂಕ್ ಮಾತ್ರೆ ೧೪ ದಿನಗಳು. "
                "೩ ದಿನಗಳಲ್ಲಿ ಗುಣವಾಗದಿದ್ದರೆ ಬನ್ನಿ."
            ),
            "expected": {
                "reported_symptoms": ["ನೀರಿನಂತಹ ಭೇದಿ", "ಹೊಟ್ಟೆ ಉಬ್ಬರ", "ಹೊಟ್ಟೆ ನೋವು"],
                "pertinent_negatives": ["ರಕ್ತಸ್ರಾವ", "ವಾಂತಿ"],
                "qualified_symptoms": ["ಹೊಟ್ಟೆ ನೋವು ಸೌಮ್ಯವಾಗಿದೆ, ಹೆಚ್ಚಾಗುತ್ತಿಲ್ಲ"],
                "symptoms_not_improving": [],
                "durations": {"ಭೇದಿ": "೨ ದಿನಗಳು"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": ["ಆಂಟಿಬಯೋಟಿಕ್ ಮಾತ್ರೆ"],
                "primary_impression": "ತೀವ್ರ ಜಠರಗರುಳು ಉರಿಯೂತ (Acute gastroenteritis)",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["ಒಆರ್ಎಸ್ (ORS) ದ್ರಾವಣ", "ಝಿಂಕ್ ಮಾತ್ರೆ ೧೪ ದಿನಗಳು"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "ನಾಡಿಮಿಡಿತ ೮೪, ರಕ್ತದೊತ್ತಡ ೧೧೮/೭೬",
                "expected_physical_exam": ["ಹೊಟ್ಟೆ ಮೃದುವಾಗಿದೆ"],
                "follow_up": "೩ ದಿನಗಳಲ್ಲಿ ಗುಣವಾಗದಿದ್ದರೆ ಬನ್ನಿ",
                "red_flag_warnings": [],
            },
        },
        {
            "case_id": "KN_03",
            "language_group": "Kannada",
            "language_code": "kn",
            "consultation_text": (
                "ರೋಗಿಯು ಮಧುಮೇಹದ ತಪಾಸಣೆಗೆ ಬಂದಿದ್ದಾರೆ. "
                "ಕಾಲುಗಳಲ್ಲಿ ಮರಗಟ್ಟುವಿಕೆ ಇದೆ ಎಂದು ಹೇಳುತ್ತಾರೆ, ಆದರೆ ದೃಷ್ಟಿ ಮಂದವಾಗಿಲ್ಲ, ಎದೆನೋವು ಇಲ್ಲ. "
                "೧ ತಿಂಗಳ ಹಿಂದೆ ಗ್ಲೈಮೆಪಿರೈಡ್ (Glimepiride) ಮಾತ್ರೆಯನ್ನು ತಲೆಸುತ್ತು ಬರುತ್ತಿದ್ದ ಕಾರಣ ನಿಲ್ಲಿಸಿದ್ದಾರೆ. "
                "ರೋಗಿಯ ಬಿಪಿ ಅಥವಾ ತೂಕವನ್ನು ನಮೂದಿಸಿಲ್ಲ (vitals missing). "
                "ರೋಗನಿರ್ಣಯ: ಅನಿಯಂತ್ರಿತ ಮಧುಮೇಹ, ಬಾಹ್ಯ ನರರೋಗ ಶಂಕಿತ. "
                "ಚಿಕಿತ್ಸೆ: ಮೆಟ್‌ಫಾರ್ಮಿನ್ ೫೦೦ ಮಿಗ್ರಾಂ ಊಟದ ನಂತರ. "
                "೧ ವಾರದ ನಂತರ ರಕ್ತ ಪರೀಕ್ಷೆ ಮಾಡಿಸಿ ಬನ್ನಿ."
            ),
            "expected": {
                "reported_symptoms": ["ಕಾಲುಗಳಲ್ಲಿ ಮರಗಟ್ಟುವಿಕೆ"],
                "pertinent_negatives": ["ದೃಷ್ಟಿ ಮಂದವಾಗಿಲ್ಲ", "ಎದೆನೋವು"],
                "qualified_symptoms": [],
                "symptoms_not_improving": [],
                "durations": {},
                "historical_symptoms": ["ಮಧುಮೇಹ"],
                "stopped_or_denied_medications": ["ಗ್ಲೈಮೆಪಿರೈಡ್ (Glimepiride)"],
                "primary_impression": "ಅನಿಯಂತ್ರಿತ ಮಧುಮೇಹ",
                "differential_diagnoses": ["ಬಾಹ್ಯ ನರರೋಗ ಶಂಕಿತ"],
                "is_diagnostic_uncertainty_expected": True,
                "proposed_medications": ["ಮೆಟ್‌ಫಾರ್ಮಿನ್ ೫೦೦ ಮಿಗ್ರಾಂ ಊಟದ ನಂತರ"],
                "has_missing_objective_findings": True,
                "expected_vitals_summary": None,
                "expected_physical_exam": [],
                "follow_up": "೧ ವಾರದ ನಂತರ ರಕ್ತ ಪರೀಕ್ಷೆ ಮಾಡಿಸಿ ಬನ್ನಿ",
                "red_flag_warnings": [],
            },
        },
        {
            "case_id": "KN_04",
            "language_group": "Kannada",
            "language_code": "kn",
            "consultation_text": (
                "೫ ದಿನಗಳಿಂದ ಮೊಣಕಾಲು ನೋವು ಮತ್ತು ಬಿಗಿತ ಇದೆ. "
                "ಬೆಳಗಿನ ಬಿಗಿತ ಅರ್ಧ ಗಂಟೆ ಇರುತ್ತದೆ, ಆದರೆ ಗಂಭೀರವಾಗಿಲ್ಲ. "
                "ಕೀಲುಗಳಲ್ಲಿ ಯಾವುದೇ ಊತ ಇಲ್ಲ, ಜ್ವರ ಇಲ್ಲ. "
                "೫ ವರ್ಷಗಳ ಹಿಂದೆ ಬಲಗಾಲಿಗೆ ಮುರಿತವಾಗಿತ್ತು (ಹಳೆಯ ಇತಿಹಾಸ). "
                "ವೈದ್ಯರ ಪರೀಕ್ಷೆ: ಮೊಣಕಾಲು ಚಲನೆ ಸಾಮಾನ್ಯವಾಗಿದೆ, ಸ್ಥಳೀಯ ಉಷ್ಣತೆ ಇಲ್ಲ. "
                "ರೋಗನಿರ್ಣಯ: ಆರಂಭಿಕ ಅಸ್ಥಿಸಂಧಿವಾತ (Early osteoarthritis). "
                "ಚಿಕಿತ್ಸೆ: ಪ್ಯಾರಸಿಟಮಾಲ್ ೬೫೦ ಅಗತ್ಯವಿದ್ದಾಗ, ಲಘು ವ್ಯಾಯಾಮ. "
                "ಯಾವುದೇ ತುರ್ತು ಇಲ್ಲದಿದ್ದರೆ ೧೦ ದಿನಗಳ ನಂತರ ಬನ್ನಿ."
            ),
            "expected": {
                "reported_symptoms": ["ಮೊಣಕಾಲು ನೋವು", "ಬಿಗಿತ"],
                "pertinent_negatives": ["ಊತ", "ಜ್ವರ"],
                "qualified_symptoms": ["ಬೆಳಗಿನ ಬಿಗಿತ ಅರ್ಧ ಗಂಟೆ ಇರುತ್ತದೆ, ಆದರೆ ಗಂಭೀರವಾಗಿಲ್ಲ"],
                "symptoms_not_improving": [],
                "durations": {"ಮೊಣಕಾಲು ನೋವು": "೫ ದಿನಗಳು"},
                "historical_symptoms": ["೫ ವರ್ಷಗಳ ಹಿಂದೆ ಬಲಗಾಲಿಗೆ ಮುರಿತವಾಗಿತ್ತು"],
                "stopped_or_denied_medications": [],
                "primary_impression": "ಆರಂಭಿಕ ಅಸ್ಥಿಸಂಧಿವಾತ (Early osteoarthritis)",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["ಪ್ಯಾರಸಿಟಮಾಲ್ ೬೫೦ ಅಗತ್ಯವಿದ್ದಾಗ"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": None,
                "expected_physical_exam": ["ಮೊಣಕಾಲು ಚಲನೆ ಸಾಮಾನ್ಯವಾಗಿದೆ", "ಸ್ಥಳೀಯ ಉಷ್ಣತೆ ಇಲ್ಲ"],
                "follow_up": "ಯಾವುದೇ ತುರ್ತು ಇಲ್ಲದಿದ್ದರೆ ೧೦ ದಿನಗಳ ನಂತರ ಬನ್ನಿ",
                "red_flag_warnings": [],
            },
        },
        {
            "case_id": "KN_05",
            "language_group": "Kannada",
            "language_code": "kn",
            "consultation_text": (
                "ರೋಗಿಗೆ ೧ ದಿನದಿಂದ ದೇಹದ ಮೇಲೆ ಕೆಂಪು ದದ್ದುಗಳು ಮತ್ತು ತುರಿಕೆ ಇದೆ. "
                "ನಾಲಿಗೆ ಅಥವಾ ಮುಖದಲ್ಲಿ ಊತ ಇಲ್ಲ, ಉಸಿರಾಟದ ತೊಂದರೆ ಖಂಡಿತ ಇಲ್ಲ. "
                "ಯಾವುದೇ ಹೊಸ ಆಹಾರ ತಿಂದಿಲ್ಲ ಎಂದು ಹೇಳುತ್ತಾರೆ. "
                "ವೈದ್ಯರ ತಪಾಸಣೆ: ಚರ್ಮದ ಮೇಲೆ ಕೆಂಪು ದದ್ದುಗಳು, ಎದೆ ಸ್ಪಷ್ಟವಾಗಿದೆ. "
                "ರೋಗನಿರ್ಣಯ: ತೀವ್ರ ಅಲರ್ಜಿಕ್ ಅರ್ಟಿಕೇರಿಯಾ (Acute urticaria). "
                "ಚಿಕಿತ್ಸೆ: ಸೆಟಿರಿಜಿನ್ ೧೦ ಮಿಗ್ರಾಂ ರಾತ್ರಿ ವೇಳೆ ೫ ದಿನಗಳು. "
                "ತುಟಿ ಊತ ಅಥವಾ ಉಸಿರಾಟದ ತೊಂದರೆ ಬಂದರೆ ತಕ್ಷಣ ತುರ್ತು ಚಿಕಿತ್ಸೆಗೆ ಹೋಗಿ."
            ),
            "expected": {
                "reported_symptoms": ["ಕೆಂಪು ದದ್ದುಗಳು", "ತುರಿಕೆ"],
                "pertinent_negatives": ["ನಾಲಿಗೆ ಅಥವಾ ಮುಖದಲ್ಲಿ ಊತ", "ಉಸಿರಾಟದ ತೊಂದರೆ"],
                "qualified_symptoms": [],
                "symptoms_not_improving": [],
                "durations": {"ದದ್ದುಗಳು": "೧ ದಿನ"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": [],
                "primary_impression": "ತೀವ್ರ ಅಲರ್ಜಿಕ್ ಅರ್ಟಿಕೇರಿಯಾ (Acute urticaria)",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["ಸೆಟಿರಿಜಿನ್ ೧೦ ಮಿಗ್ರಾಂ ರಾತ್ರಿ ವೇಳೆ ೫ ದಿನಗಳು"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": None,
                "expected_physical_exam": ["ಚರ್ಮದ ಮೇಲೆ ಕೆಂಪು ದದ್ದುಗಳು", "ಎದೆ ಸ್ಪಷ್ಟವಾಗಿದೆ"],
                "follow_up": "[Follow-up schedule not documented]",
                "red_flag_warnings": ["ತುಟಿ ಊತ ಅಥವಾ ಉಸಿರಾಟದ ತೊಂದರೆ ಬಂದರೆ ತಕ್ಷಣ ತುರ್ತು ಚಿಕಿತ್ಸೆಗೆ ಹೋಗಿ"],
            },
        },
        {
            "case_id": "KN_06",
            "language_group": "Kannada",
            "language_code": "kn",
            "consultation_text": (
                "೨ ವಾರಗಳಿಂದ ಒಣ ಕೆಮ್ಮು ಮತ್ತು ಸುಸ್ತು ಇದೆ. "
                "ಕಫ ಬರುತ್ತಿದೆಯೇ ಇಲ್ಲವೇ ಎಂಬುದು ಸ್ಪಷ್ಟವಾಗಿಲ್ಲ (ಅಸ್ಪಷ್ಟ ಹೇಳಿಕೆ). "
                "ತೂಕ ಇಳಿಕೆ ಇಲ್ಲ, ರಾತ್ರಿ ಬೆವರುವುದು ಇಲ್ಲ, ಎದೆನೋವು ಇಲ್ಲ. "
                "ವೈದ್ಯರ ತಪಾಸಣೆ: ಶ್ವಾಸಕೋಶದ ಶಬ್ದಗಳು ಸಾಮಾನ್ಯ. "
                "ರೋಗನಿರ್ಣಯ: ಸೋಂಕಿನ ನಂತರದ ಕೆಮ್ಮು (Post-viral cough), ಶಂಕಿತ ಅಲರ್ಜಿ. "
                "ಚಿಕಿತ್ಸೆ: ಉಗುರುಬೆಚ್ಚಗಿನ ನೀರು, ಕಾಫ್ ಸಿರಪ್ ೫ ಮಿಲಿ. "
                "ಕೆಮ್ಮು ಕಡಿಮೆಯಾಗದಿದ್ದರೆ ೭ ದಿನಗಳ ನಂತರ ಮರುಪರಿಶೀಲಿಸಿ."
            ),
            "expected": {
                "reported_symptoms": ["ಒಣ ಕೆಮ್ಮು", "ಸುಸ್ತು"],
                "pertinent_negatives": ["ತೂಕ ಇಳಿಕೆ", "ರಾತ್ರಿ ಬೆವರುವುದು", "ಎದೆನೋವು"],
                "qualified_symptoms": [],
                "symptoms_not_improving": [],
                "durations": {"ಕೆಮ್ಮು": "೨ ವಾರಗಳು"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": [],
                "primary_impression": "ಸೋಂಕಿನ ನಂತರದ ಕೆಮ್ಮು (Post-viral cough)",
                "differential_diagnoses": ["ಶಂಕಿತ ಅಲರ್ಜಿ"],
                "is_diagnostic_uncertainty_expected": True,
                "proposed_medications": ["ಕಾಫ್ ಸಿರಪ್ ೫ ಮಿಲಿ"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": None,
                "expected_physical_exam": ["ಶ್ವಾಸಕೋಶದ ಶಬ್ದಗಳು ಸಾಮಾನ್ಯ"],
                "follow_up": "ಕೆಮ್ಮು ಕಡಿಮೆಯಾಗದಿದ್ದರೆ ೭ ದಿನಗಳ ನಂತರ ಮರುಪರಿಶೀಲಿಸಿ",
                "red_flag_warnings": [],
            },
        },

        # ====================================================================
        # Hindi Script (HI_01 to HI_06)
        # ====================================================================
        {
            "case_id": "HI_01",
            "language_group": "Hindi",
            "language_code": "hi",
            "consultation_text": (
                "मरीज़ को 3 दिनों से तेज़ बुखार और बदन दर्द है। सिरदर्द हल्का है, बहुत गंभीर नहीं है। "
                "उल्टी नहीं हो रही है, सीने में दर्द नहीं है, और त्वचा पर कोई चकत्ते नहीं हैं। "
                "डॉक्टर की जांच: तापमान 101.6 F, नाड़ी 86 प्रति मिनट, गला थोड़ा लाल है, फेफड़े साफ़ हैं। "
                "संभावित निदान: तीव्र वायरल बुखार (Suspected acute viral fever)। "
                "उपचार: पैरासिटामोल 650mg दिन में तीन बार, ओआरएस घोल पिएं। "
                "3 दिन बाद दिखाएं; अगर सांस फूलने लगे या लगातार उल्टी हो तो तुरंत अस्पताल आएं।"
            ),
            "expected": {
                "reported_symptoms": ["तेज़ बुखार", "बदन दर्द", "सिरदर्द"],
                "pertinent_negatives": ["उल्टी", "सीने में दर्द", "त्वचा पर चकत्ते"],
                "qualified_symptoms": ["सिरदर्द हल्का है, बहुत गंभीर नहीं है"],
                "symptoms_not_improving": [],
                "durations": {"बुखार": "3 दिन"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": [],
                "primary_impression": "तीव्र वायरल बुखार (Suspected acute viral fever)",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": True,
                "proposed_medications": ["पैरासिटामोल 650mg दिन में तीन बार", "ओआरएस घोल"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "तापमान 101.6 F, नाड़ी 86 प्रति मिनट",
                "expected_physical_exam": ["गला थोड़ा लाल है", "फेफड़े साफ़ हैं"],
                "follow_up": "3 दिन बाद दिखाएं",
                "red_flag_warnings": ["अगर सांस फूलने लगे या लगातार उल्टी हो तो तुरंत अस्पताल आएं"],
            },
        },
        {
            "case_id": "HI_02",
            "language_group": "Hindi",
            "language_code": "hi",
            "consultation_text": (
                "मरीज़ को 4 दिनों से खांसी और नाक बहने की शिकायत है। खांसी सूखी है, कफ नहीं आ रहा है। "
                "2 दिन पहले खुद से अमोक्सीसिलीन (Amoxicillin) लेना शुरू किया था लेकिन पेट में जलन के कारण कल बंद कर दिया। "
                "सांस लेने में कोई तकलीफ़ नहीं है, कान में दर्द नहीं है। "
                "डॉक्टर जांच: गला सामान्य, फेफड़ों में कोई सीटी या घरघराहट नहीं। "
                "निदान: सामान्य वायरल जुकाम (Viral URI)। "
                "सलाह: भाप लें, गर्म पानी पिएं, सेट्रीज़ीन 10mg रात को। "
                "5 दिन तक आराम न मिले तो दोबारा आएं।"
            ),
            "expected": {
                "reported_symptoms": ["खांसी", "नाक बहना"],
                "pertinent_negatives": ["कफ", "सांस लेने में तकलीफ़", "कान में दर्द"],
                "qualified_symptoms": ["खांसी सूखी है, कफ नहीं आ रहा है"],
                "symptoms_not_improving": [],
                "durations": {"खांसी": "4 दिन"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": ["अमोक्सीसिलीन (Amoxicillin)"],
                "primary_impression": "सामान्य वायरल जुकाम (Viral URI)",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["सेट्रीज़ीन 10mg रात को"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": None,
                "expected_physical_exam": ["गला सामान्य", "फेफड़ों में कोई सीटी या घरघराहट नहीं"],
                "follow_up": "5 दिन तक आराम न मिले तो दोबारा आएं",
                "red_flag_warnings": [],
            },
        },
        {
            "case_id": "HI_03",
            "language_group": "Hindi",
            "language_code": "hi",
            "consultation_text": (
                "मरीज़ को ऊपरी पेट में जलन और खट्टी डकारें 1 हफ़्ते से हैं। "
                "दर्द खाने के बाद बढ़ता है या घटता है, इस बारे में मरीज़ स्पष्ट नहीं है (अस्पष्ट विवरण)। "
                "मरीज़ शराब या धूम्रपान का सेवन बिल्कुल नहीं करता है। "
                "उल्टी में खून नहीं है, काला मल नहीं आ रहा है। "
                "क्लिनिक में ब्लड प्रेशर या पल्स की जांच नहीं की गई। "
                "संभावित निदान: एसिड पेप्टिक विकार (GERD/Dyspepsia)। "
                "उपचार: पैंटोप्राज़ोल 40mg खाली पेट सुबह 14 दिन। "
                "अगर सीने में भारीपन या पसीना आए तो तुरंत आपातकालीन कक्ष जाएं।"
            ),
            "expected": {
                "reported_symptoms": ["ऊपरी पेट में जलन", "खट्टी डकारें"],
                "pertinent_negatives": ["उल्टी में खून", "काला मल"],
                "qualified_symptoms": [],
                "symptoms_not_improving": [],
                "durations": {"जलन": "1 हफ़्ता"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": ["शराब", "धूम्रपान"],
                "primary_impression": "संभावित एसिड पेप्टिक विकार (Suspected GERD/Dyspepsia)",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": True,
                "proposed_medications": ["पैंटोप्राज़ोल 40mg खाली पेट सुबह 14 दिन"],
                "has_missing_objective_findings": True,
                "expected_vitals_summary": None,
                "expected_physical_exam": [],
                "follow_up": "[Follow-up schedule not documented]",
                "red_flag_warnings": ["अगर सीने में भारीपन या पसीना आए तो तुरंत आपातकालीन कक्ष जाएं"],
            },
        },
        {
            "case_id": "HI_04",
            "language_group": "Hindi",
            "language_code": "hi",
            "consultation_text": (
                "मरीज़ को भारी सामान उठाने के बाद 2 दिनों से कमर दर्द है। "
                "दर्द पीठ के निचले हिस्से में है, पैरों में नहीं जा रहा है (no radiation)। "
                "पैरों में कोई सुन्नता या कमजोरी नहीं है। "
                "3 साल पहले डिस्क की समस्या हुई थी (पुरानी बीमारी)। "
                "डॉक्टर परीक्षण: कमर की मांसपेशियों में खिंचाव (paraspinal spasm), न्यूरोलॉजिकल जांच पूरी तरह सामान्य। "
                "निदान: तीव्र मस्कुलोस्केलेटल कमर दर्द (Acute lumbar strain)। "
                "उपचार: पैरासिटामोल 650mg आवश्यकतानुसार, गर्म सिकाई, 2 दिन आराम। "
                "1 हफ़्ते में सुधार न होने पर ऑर्थोपेडिक परामर्श लें।"
            ),
            "expected": {
                "reported_symptoms": ["कमर दर्द"],
                "pertinent_negatives": ["पैरों में दर्द (radiation)", "सुन्नता", "कमजोरी"],
                "qualified_symptoms": ["पैरों में नहीं जा रहा है"],
                "symptoms_not_improving": [],
                "durations": {"कमर दर्द": "2 दिन"},
                "historical_symptoms": ["3 साल पहले डिस्क की समस्या हुई थी"],
                "stopped_or_denied_medications": [],
                "primary_impression": "तीव्र मस्कुलोस्केलेटल कमर दर्द (Acute lumbar strain)",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["पैरासिटामोल 650mg आवश्यकतानुसार"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": None,
                "expected_physical_exam": ["कमर की मांसपेशियों में खिंचाव (paraspinal spasm)", "न्यूरोलॉजिकल जांच सामान्य"],
                "follow_up": "1 हफ़्ते में सुधार न होने पर ऑर्थोपेडिक परामर्श लें",
                "red_flag_warnings": [],
            },
        },
        {
            "case_id": "HI_05",
            "language_group": "Hindi",
            "language_code": "hi",
            "consultation_text": (
                "मरीज़ सिर में भारीपन और हल्का चक्कर आने की शिकायत लेकर आया है। "
                "चक्कर लगातार नहीं है, केवल अचानक खड़े होने पर होता है (not severe/postural)। "
                "सीने में दर्द नहीं है, घबराहट नहीं है, हाथ-पैर में कमजोरी नहीं है। "
                "मरीज़ का कहना है कि वह खाने में ऊपर से नमक बिल्कुल नहीं लेता। "
                "डॉक्टर जांच: बीपी 154/96 mmHg, नाड़ी 76, दिल की धड़कन सामान्य। "
                "निदान: अनियंत्रित उच्च रक्तचाप (Uncontrolled Hypertension)। "
                "उपचार: अम्लोडिपिन 5mg सुबह एक बार, नमक कम करने की सलाह। "
                "4 दिन बाद बीपी दोबारा नपवाएं।"
            ),
            "expected": {
                "reported_symptoms": ["सिर में भारीपन", "हल्का चक्कर"],
                "pertinent_negatives": ["सीने में दर्द", "घबराहट", "हाथ-पैर में कमजोरी"],
                "qualified_symptoms": ["चक्कर लगातार नहीं है, केवल अचानक खड़े होने पर होता है"],
                "symptoms_not_improving": [],
                "durations": {},
                "historical_symptoms": [],
                "stopped_or_denied_medications": [],
                "primary_impression": "अनियंत्रित उच्च रक्तचाप (Uncontrolled Hypertension)",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["अम्लोडिपिन 5mg सुबह एक बार"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "बीपी 154/96 mmHg, नाड़ी 76",
                "expected_physical_exam": ["दिल की धड़कन सामान्य"],
                "follow_up": "4 दिन बाद बीपी दोबारा नपवाएं",
                "red_flag_warnings": [],
            },
        },
        {
            "case_id": "HI_06",
            "language_group": "Hindi",
            "language_code": "hi",
            "consultation_text": (
                "मरीज़ को 2 दिनों से गले में चुभन और दाहिने कान में हल्का दर्द है। "
                "खाना निगलने में कठिनाई नहीं है (no dysphagia), सांस लेने में कोई बाधा नहीं है। "
                "पहले कभी टॉन्सिल का ऑपरेशन नहीं हुआ है। "
                "डॉक्टर की जांच: टॉन्सिल्स में कोई मवाद नहीं, कान का पर्दा सामान्य। "
                "निदान: तीव्र ग्रसनीशोथ (Acute viral pharyngitis)। "
                "उपचार: नमक के पानी से गरारे, दर्द निवारक पेरासिटामोल। "
                "कोई निश्चित फॉलो-अप तय नहीं किया गया; निगलने में तकलीफ़ होने पर तुरंत वापस आएं।"
            ),
            "expected": {
                "reported_symptoms": ["गले में चुभन", "दाहिने कान में हल्का दर्द"],
                "pertinent_negatives": ["निगलने में कठिनाई (dysphagia)", "सांस लेने में बाधा"],
                "qualified_symptoms": [],
                "symptoms_not_improving": [],
                "durations": {"गले में चुभन": "2 दिन"},
                "historical_symptoms": ["पहले कभी टॉन्सिल का ऑपरेशन नहीं हुआ"],
                "stopped_or_denied_medications": [],
                "primary_impression": "तीव्र ग्रसनीशोथ (Acute viral pharyngitis)",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["दर्द निवारक पेरासिटामोल"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": None,
                "expected_physical_exam": ["टॉन्सिल्स में कोई मवाद नहीं", "कान का पर्दा सामान्य"],
                "follow_up": "[Follow-up schedule not documented]",
                "red_flag_warnings": ["निगलने में तकलीफ़ होने पर तुरंत वापस आएं"],
            },
        },

        # ====================================================================
        # Kanglish (Kannada-English code-mixed) (KANGLISH_01 to KANGLISH_06)
        # ====================================================================
        {
            "case_id": "KANGLISH_01",
            "language_group": "Kanglish",
            "language_code": "kn",
            "consultation_text": (
                "Patient complains of jwara and body ache since 3 days. Talenovu ide but not severe. "
                "Vomiting illa, loose motion aagthilla, chest pain yenu illa. "
                "Had dengue 2 years back, currently no bleeding or skin rash. "
                "Doctor notes: temp 100.4 F, BP 120/80, throat mild congestion, lungs clear. "
                "Impression: Suspected viral syndrome. "
                "Plan: Tab Paracetamol 650mg TDS for 3 days, drink plenty of water. "
                "Review after 3 days; hospital ge banni immediately if vomiting starts or patient becomes lethargic."
            ),
            "expected": {
                "reported_symptoms": ["jwara", "body ache", "talenovu"],
                "pertinent_negatives": ["vomiting", "loose motion", "chest pain", "bleeding", "skin rash"],
                "qualified_symptoms": ["talenovu ide but not severe"],
                "symptoms_not_improving": [],
                "durations": {"jwara": "3 days"},
                "historical_symptoms": ["Had dengue 2 years back"],
                "stopped_or_denied_medications": [],
                "primary_impression": "Suspected viral syndrome",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": True,
                "proposed_medications": ["Tab Paracetamol 650mg TDS for 3 days"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "temp 100.4 F, BP 120/80",
                "expected_physical_exam": ["throat mild congestion", "lungs clear"],
                "follow_up": "Review after 3 days",
                "red_flag_warnings": ["hospital ge banni immediately if vomiting starts or patient becomes lethargic"],
            },
        },
        {
            "case_id": "KANGLISH_02",
            "language_group": "Kanglish",
            "language_code": "kn",
            "consultation_text": (
                "Patient reports hotte novu (stomach pain) and burning sensation in chest since yesterday. "
                "Patient stopped taking antacid gel last week because of bad taste. "
                "Denies vomiting, loose motions aagthilla, black stools illa. "
                "Patient says pain is not improving after food. "
                "Doctor examination: Epigastric tenderness present, no guarding, vitals stable. "
                "Assessment: Acute gastritis / hyperacidity. "
                "Plan: Cap Pantoprazole 40mg before breakfast for 10 days. "
                "Follow up after 1 week; emergency ge hogbeku if vomiting blood or severe dizzy."
            ),
            "expected": {
                "reported_symptoms": ["hotte novu", "burning sensation in chest"],
                "pertinent_negatives": ["vomiting", "loose motions", "black stools"],
                "qualified_symptoms": [],
                "symptoms_not_improving": ["pain not improving after food"],
                "durations": {"hotte novu": "since yesterday"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": ["antacid gel"],
                "primary_impression": "Acute gastritis / hyperacidity",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["Cap Pantoprazole 40mg before breakfast for 10 days"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "vitals stable",
                "expected_physical_exam": ["Epigastric tenderness present", "no guarding"],
                "follow_up": "Follow up after 1 week",
                "red_flag_warnings": ["emergency ge hogbeku if vomiting blood or severe dizzy"],
            },
        },
        {
            "case_id": "KANGLISH_03",
            "language_group": "Kanglish",
            "language_code": "kn",
            "consultation_text": (
                "Patient consultation: Continuous dry kemmu since 5 days. "
                "Patient reports breathlessness on climbing stairs, but sitting alli breathlessness illa. "
                "Wheezing illa, fever bandilla. "
                "Denies taking any cough syrups or home remedies. "
                "Telephonic consultation, so doctor couldn't check vitals or chest auscultation. "
                "Impression: Subacute tracheobronchitis, evaluate for bronchial asthma. "
                "Plan: Steam inhalation, Levocetirizine 5mg at bedtime. "
                "Visit clinic within 48 hours for physical examination; return immediately if breathlessness worsens."
            ),
            "expected": {
                "reported_symptoms": ["dry kemmu", "breathlessness on climbing stairs"],
                "pertinent_negatives": ["sitting alli breathlessness", "wheezing", "fever"],
                "qualified_symptoms": ["sitting alli breathlessness illa"],
                "symptoms_not_improving": [],
                "durations": {"kemmu": "5 days"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": ["cough syrups", "home remedies"],
                "primary_impression": "Subacute tracheobronchitis",
                "differential_diagnoses": ["evaluate for bronchial asthma"],
                "is_diagnostic_uncertainty_expected": True,
                "proposed_medications": ["Levocetirizine 5mg at bedtime"],
                "has_missing_objective_findings": True,
                "expected_vitals_summary": None,
                "expected_physical_exam": [],
                "follow_up": "Visit clinic within 48 hours for physical examination",
                "red_flag_warnings": ["return immediately if breathlessness worsens"],
            },
        },
        {
            "case_id": "KANGLISH_04",
            "language_group": "Kanglish",
            "language_code": "kn",
            "consultation_text": (
                "Patient says right kaalu novu and ankle swelling since 2 days. "
                "Trauma or fall aagilla (denies injury). "
                "Patient denies taking painkiller tablets. "
                "Walking maduvaga pain ide, but rest madidre pain kadime aaguthe. "
                "Doctor exam: Right ankle mild edema, no bony tenderness, active movements preserved. "
                "Impression: Soft tissue strain of ankle, rule out ligament sprain. "
                "Plan: Ice pack application, crepe bandage, Paracetamol 500mg SOS. "
                "Review in 5 days if swelling persists."
            ),
            "expected": {
                "reported_symptoms": ["right kaalu novu", "ankle swelling"],
                "pertinent_negatives": ["trauma", "fall (injury)"],
                "qualified_symptoms": ["rest madidre pain kadime aaguthe"],
                "symptoms_not_improving": [],
                "durations": {"kaalu novu": "2 days"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": ["painkiller tablets"],
                "primary_impression": "Soft tissue strain of ankle",
                "differential_diagnoses": ["rule out ligament sprain"],
                "is_diagnostic_uncertainty_expected": True,
                "proposed_medications": ["Paracetamol 500mg SOS"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": None,
                "expected_physical_exam": ["Right ankle mild edema", "no bony tenderness", "active movements preserved"],
                "follow_up": "Review in 5 days if swelling persists",
                "red_flag_warnings": [],
            },
        },
        {
            "case_id": "KANGLISH_05",
            "language_group": "Kanglish",
            "language_code": "kn",
            "consultation_text": (
                "Patient reports tale tiruguvike (dizziness) and weakness for 3 days. "
                "Dizziness is intermittent, not severe. "
                "Chest pain illa, palpitation illa, focal weakness yenu aagthilla. "
                "Discontinued Amlodipine 5mg 10 days back without consulting doctor. "
                "Doctor findings: BP 160/98 mmHg, pulse 78 bpm, neurological exam normal. "
                "Assessment: Hypertension with postural dizziness, medication non-adherence. "
                "Plan: Restart Amlodipine 5mg once daily, salt restriction. "
                "Follow up in 4 days with BP log."
            ),
            "expected": {
                "reported_symptoms": ["tale tiruguvike (dizziness)", "generalized weakness"],
                "pertinent_negatives": ["chest pain", "palpitation", "focal weakness"],
                "qualified_symptoms": ["dizziness intermittent, not severe"],
                "symptoms_not_improving": [],
                "durations": {"dizziness": "3 days"},
                "historical_symptoms": ["hypertension"],
                "stopped_or_denied_medications": [],
                "restarted_medications": ["Amlodipine 5mg"],
                "primary_impression": "Hypertension with postural dizziness",
                "differential_diagnoses": ["medication non-adherence"],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["Restart Amlodipine 5mg once daily"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "BP 160/98 mmHg, pulse 78 bpm",
                "expected_physical_exam": ["neurological exam normal"],
                "follow_up": "Follow up in 4 days with BP log",
                "red_flag_warnings": [],
            },
        },
        {
            "case_id": "KANGLISH_06",
            "language_group": "Kanglish",
            "language_code": "kn",
            "consultation_text": (
                "Patient reports gantalu novu (sore throat) and swallowing difficulty since yesterday. "
                "Ambiguous statement regarding fever: patient says 'body warm ansthu, but thermometer nalli check madilla'. "
                "Cough illa, ear pain illa, rash aagilla. "
                "Doctor checks: Tonsils congested without exudates, temp 99.0 F. "
                "Impression: Viral pharyngitis. "
                "Plan: Warm saline gargling, Paracetamol 650mg as needed. "
                "No scheduled follow-up; return immediately if unable to swallow liquids or breathing problem starts."
            ),
            "expected": {
                "reported_symptoms": ["gantalu novu", "swallowing difficulty"],
                "pertinent_negatives": ["cough", "ear pain", "rash"],
                "qualified_symptoms": [],
                "symptoms_not_improving": [],
                "durations": {"gantalu novu": "since yesterday"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": [],
                "primary_impression": "Viral pharyngitis",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["Paracetamol 650mg as needed"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "temp 99.0 F",
                "expected_physical_exam": ["Tonsils congested without exudates"],
                "follow_up": "[Follow-up schedule not documented]",
                "red_flag_warnings": ["return immediately if unable to swallow liquids or breathing problem starts"],
            },
        },

        # ====================================================================
        # Hinglish (Hindi-English code-mixed) (HINGLISH_01 to HINGLISH_06)
        # ====================================================================
        {
            "case_id": "HINGLISH_01",
            "language_group": "Hinglish",
            "language_code": "hi",
            "consultation_text": (
                "Patient complains of sharp bukhar and severe sirdard for 3 days. "
                "Sirdard continuous hai but vision blur nahi ho raha. "
                "Vomiting nahi hai, loose motions nahi hai, chest pain bilkul nahi hai. "
                "Patient had typhoid 1 year back, no current abdominal pain. "
                "Doctor notes: temp 101.0 F, pulse 90, BP 118/78, chest clear, throat mildly congested. "
                "Impression: Suspected acute viral pyrexia, rule out dengue. "
                "Plan: Tab Paracetamol 650mg TDS, push fluids. "
                "Review after 3 days; hospital aana immediately agar severe pet dard ya vomiting start ho."
            ),
            "expected": {
                "reported_symptoms": ["sharp bukhar", "severe sirdard"],
                "pertinent_negatives": ["vision blur", "vomiting", "loose motions", "chest pain", "abdominal pain"],
                "qualified_symptoms": ["sirdard continuous but vision blur nahi ho raha"],
                "symptoms_not_improving": [],
                "durations": {"bukhar": "3 days"},
                "historical_symptoms": ["typhoid 1 year back"],
                "stopped_or_denied_medications": [],
                "primary_impression": "Suspected acute viral pyrexia",
                "differential_diagnoses": ["rule out dengue"],
                "is_diagnostic_uncertainty_expected": True,
                "proposed_medications": ["Tab Paracetamol 650mg TDS"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "temp 101.0 F, pulse 90, BP 118/78",
                "expected_physical_exam": ["chest clear", "throat mildly congested"],
                "follow_up": "Review after 3 days",
                "red_flag_warnings": ["hospital aana immediately agar severe pet dard ya vomiting start ho"],
            },
        },
        {
            "case_id": "HINGLISH_02",
            "language_group": "Hinglish",
            "language_code": "hi",
            "consultation_text": (
                "Patient reports pet me dard and loose motions 4-5 times since yesterday. "
                "Pet dard cramping type hai, continuous nahi hai. "
                "Blood in stool nahi hai, vomiting nahi ho rahi. "
                "Patient denies taking any over-the-counter medicine or antibiotic at home. "
                "Doctor examination: Abdomen soft, mild periumbilical tenderness, no organomegaly, vitals normal. "
                "Assessment: Acute gastroenteritis. "
                "Plan: ORS packets 2 per day, Tab Zinc 20mg OD for 14 days. "
                "Follow up in 3 days; consult emergency agar dizziness ya dehydration lage."
            ),
            "expected": {
                "reported_symptoms": ["pet me dard", "loose motions"],
                "pertinent_negatives": ["blood in stool", "vomiting"],
                "qualified_symptoms": ["pet dard cramping type hai, continuous nahi hai"],
                "symptoms_not_improving": [],
                "durations": {"loose motions": "since yesterday"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": ["over-the-counter medicine", "antibiotic"],
                "primary_impression": "Acute gastroenteritis",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["ORS packets 2 per day", "Tab Zinc 20mg OD for 14 days"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "vitals normal",
                "expected_physical_exam": ["Abdomen soft", "mild periumbilical tenderness", "no organomegaly"],
                "follow_up": "Follow up in 3 days",
                "red_flag_warnings": ["consult emergency agar dizziness ya dehydration lage"],
            },
        },
        {
            "case_id": "HINGLISH_03",
            "language_group": "Hinglish",
            "language_code": "hi",
            "consultation_text": (
                "Patient consultation: Dry khansi and runny nose for 1 week. "
                "Khansi raat ko badh jati hai, but daytime me not severe. "
                "Stopped Budesonide inhaler 3 weeks back thinking asthma is cured. "
                "Chest pain nahi hai, swelling in feet bilkul nahi hai. "
                "Telephonic call, no vitals or chest auscultation recorded. "
                "Impression: Post-viral bronchial hyperresponsiveness, evaluate asthma recurrence. "
                "Plan: Resume Budesonide inhaler 200mcg BID, Levocetirizine 5mg at night. "
                "Visit OPD in 48 hours for physical examination; emergency me jaye agar breathlessness develop ho."
            ),
            "expected": {
                "reported_symptoms": ["dry khansi", "runny nose"],
                "pertinent_negatives": ["chest pain", "swelling in feet"],
                "qualified_symptoms": ["daytime me not severe"],
                "symptoms_not_improving": [],
                "durations": {"khansi": "1 week"},
                "historical_symptoms": ["asthma"],
                "stopped_or_denied_medications": [],
                "restarted_medications": ["Budesonide inhaler"],
                "primary_impression": "Post-viral bronchial hyperresponsiveness",
                "differential_diagnoses": ["evaluate asthma recurrence"],
                "is_diagnostic_uncertainty_expected": True,
                "proposed_medications": ["Resume Budesonide inhaler 200mcg BID", "Levocetirizine 5mg at night"],
                "has_missing_objective_findings": True,
                "expected_vitals_summary": None,
                "expected_physical_exam": [],
                "follow_up": "Visit OPD in 48 hours for physical examination",
                "red_flag_warnings": ["emergency me jaye agar breathlessness develop ho"],
            },
        },
        {
            "case_id": "HINGLISH_04",
            "language_group": "Hinglish",
            "language_code": "hi",
            "consultation_text": (
                "Patient complains of lower kamar dard since 4 days after bike ride. "
                "Pain is dull aching, radiating to legs nahi ho raha (no radiculopathy). "
                "Numbness ya tingling sensation bilkul nahi hai. "
                "History of muscle strain 6 months ago. "
                "Patient says pain is not improving with rest. "
                "Doctor checks: Lumbar tenderness present, straight leg raise negative bilaterally, reflexes normal. "
                "Impression: Acute lumbar strain. "
                "Plan: Paracetamol 650mg PRN, hot water bag fomentation, avoid lifting heavy objects. "
                "Follow up after 1 week if pain persists."
            ),
            "expected": {
                "reported_symptoms": ["lower kamar dard"],
                "pertinent_negatives": ["radiating to legs (radiculopathy)", "numbness", "tingling sensation"],
                "qualified_symptoms": ["radiating to legs nahi ho raha"],
                "symptoms_not_improving": ["pain not improving with rest"],
                "durations": {"kamar dard": "4 days"},
                "historical_symptoms": ["muscle strain 6 months ago"],
                "stopped_or_denied_medications": [],
                "primary_impression": "Acute lumbar strain",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["Paracetamol 650mg PRN"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": None,
                "expected_physical_exam": ["Lumbar tenderness present", "straight leg raise negative bilaterally", "reflexes normal"],
                "follow_up": "Follow up after 1 week if pain persists",
                "red_flag_warnings": [],
            },
        },
        {
            "case_id": "HINGLISH_05",
            "language_group": "Hinglish",
            "language_code": "hi",
            "consultation_text": (
                "Patient reports subah se halka chakkar and weakness. "
                "Chakkar continuous nahi hai, intermittent hai. "
                "Chest heaviness nahi hai, sweating nahi hai, speech difficulty bilkul nahi hai. "
                "Patient denies taking prescribed blood pressure tablet today morning because of fasting. "
                "Doctor examination: BP 150/92 mmHg, pulse 80, neurological examination completely normal. "
                "Assessment: Transient dizziness secondary to hypertension and missed dose. "
                "Plan: Take Amlodipine 5mg immediately, drink electrolytes, relax. "
                "Review BP in 3 days."
            ),
            "expected": {
                "reported_symptoms": ["halka chakkar", "weakness"],
                "pertinent_negatives": ["chest heaviness", "sweating", "speech difficulty"],
                "qualified_symptoms": ["chakkar continuous nahi hai, intermittent hai"],
                "symptoms_not_improving": [],
                "durations": {"chakkar": "subah se"},
                "historical_symptoms": ["hypertension"],
                "stopped_or_denied_medications": ["blood pressure tablet today morning"],
                "primary_impression": "Transient dizziness secondary to hypertension and missed dose",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["Take Amlodipine 5mg immediately"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "BP 150/92 mmHg, pulse 80",
                "expected_physical_exam": ["neurological examination completely normal"],
                "follow_up": "Review BP in 3 days",
                "red_flag_warnings": [],
            },
        },
        {
            "case_id": "HINGLISH_06",
            "language_group": "Hinglish",
            "language_code": "hi",
            "consultation_text": (
                "Patient presents with gale me dard and khansi for 2 days. "
                "Sputum ke baare me patient ambiguous hai: says 'kabhi lagta hai balgam hai, kabhi sukha khansi'. "
                "Breathing problem bilkul nahi hai, ear pain nahi hai, rash nahi hai. "
                "Doctor examination: Posterior pharyngeal wall inflamed, no follicular tonsillitis, temp 99.4 F. "
                "Impression: Viral pharyngotracheitis. "
                "Plan: Salt water gargle 3 times a day, Paracetamol 500mg SOS. "
                "No routine follow-up; return immediately agar high fever ya gale me swelling develop ho."
            ),
            "expected": {
                "reported_symptoms": ["gale me dard", "khansi"],
                "pertinent_negatives": ["breathing problem", "ear pain", "rash"],
                "qualified_symptoms": [],
                "symptoms_not_improving": [],
                "durations": {"gale me dard": "2 days"},
                "historical_symptoms": [],
                "stopped_or_denied_medications": [],
                "primary_impression": "Viral pharyngotracheitis",
                "differential_diagnoses": [],
                "is_diagnostic_uncertainty_expected": False,
                "proposed_medications": ["Paracetamol 500mg SOS"],
                "has_missing_objective_findings": False,
                "expected_vitals_summary": "temp 99.4 F",
                "expected_physical_exam": ["Posterior pharyngeal wall inflamed", "no follicular tonsillitis"],
                "follow_up": "[Follow-up schedule not documented]",
                "red_flag_warnings": ["return immediately agar high fever ya gale me swelling develop ho"],
            },
        },
    ],
}


def main():
    out_dir = Path(__file__).resolve().parent.parent / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "multilingual_eval_dataset.json"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(DATASET, f, ensure_ascii=False, indent=2)

    print(f"[OK] Generated {len(DATASET['cases'])} synthetic evaluation cases at:")
    print(f"     {out_path}")
    for group, count in DATASET["language_groups"].items():
        print(f"     - {group}: {count} cases")


if __name__ == "__main__":
    main()
