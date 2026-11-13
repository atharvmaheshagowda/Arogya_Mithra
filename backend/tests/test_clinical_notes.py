from datetime import date, datetime
import pytest
from fastapi import status
from sqlalchemy import select

from app.models.allergy import Allergy
from app.models.clinical_note import ClinicalSOAPNote
from app.models.encounter import Encounter
from app.models.medical_history import MedicalHistory
from app.models.medication import Medication
from app.models.patient import Patient
from app.models.patient_medication import PatientMedication
from app.models.vital_sign import VitalSign
from app.schemas.clinical_note import SOAPGenerateRequest
from app.services.adapters.mock_adapter import DeterministicMockSOAPAdapter
from app.services.synthetic_data import seed_synthetic_clinical_data


SYNTHETIC_CONSULTATION_TEXT = """Doctor: Ramesh Kumar, good morning. What brings you in today?
Patient: Doctor, since 4 days I have a wet cough with yellowish phlegm and evening chills. But no chest pain and no breathing difficulty.
Doctor: Any fever?
Patient: Feels warm in the evenings, but I did not check temperature at home.
Doctor: Let me examine you. Pulse is 82, chest auscultation shows bilateral rhonchi at bases. Throat has mild congestion.
Patient: Is it pneumonia doctor?
Doctor: Looks like acute productive bronchitis, but suspected secondary bacterial infection, rule out pneumonia.
Doctor: I will prescribe Azithromycin 500mg once daily for 3 days and Paracetamol 650mg if fever crosses 38C. Steam inhalation twice daily. Drink warm water.
Doctor: If you get high fever or breathlessness, seek emergency casualty care immediately. Review after 5 days."""


def test_successful_soap_draft_generation(client):
    response = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
            "language_code": "en",
        },
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    assert data["note_id"].startswith("NOTE-")
    assert data["status"] == "draft"
    assert data["is_ai_generated"] is True
    assert "AI-GENERATED CLINICAL DRAFT" in data["disclaimer"]

    # Verify 4 sections exist
    soap = data["soap"]
    assert "subjective" in soap
    assert "objective" in soap
    assert "assessment" in soap
    assert "plan" in soap

    assert len(soap["subjective"]["reported_symptoms"]) > 0
    assert len(soap["objective"]["physical_examination"]) > 0
    assert "acute productive bronchitis" in soap["assessment"]["primary_impression"].lower()


def test_mandatory_draft_status_and_disclaimer(client):
    response = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "consultation_text": "Patient: I have had a mild dry cough for two days. Doctor: Chest is clear. Take warm fluids.",
            "language_code": "en",
        },
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "draft"
    assert "physician" in data["disclaimer"].lower()
    assert data["reviewed_at"] is None
    assert data["reviewing_doctor"] is None


def test_negation_preservation(client):
    """Safety requirement: Negated symptoms must be preserved in pertinent_negatives

    and never placed into reported symptoms.
    """
    response = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    subj = data["soap"]["subjective"]

    # Negatives captured
    assert any("chest pain" in neg.lower() for neg in subj["pertinent_negatives"])
    assert any("breathing difficulty" in neg.lower() for neg in subj["pertinent_negatives"])

    # Negatives MUST NOT be in reported symptoms
    assert not any("no chest pain" in s.lower() for s in subj["reported_symptoms"])
    assert not any("chest pain" == s.strip().lower() for s in subj["reported_symptoms"])


def test_diagnostic_uncertainty_preservation(client):
    """Safety requirement: Differential/suspected diagnoses must preserve hedge markers."""
    response = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    diffs = data["soap"]["assessment"]["differential_diagnoses"]

    assert any("suspected secondary bacterial infection" in d.lower() for d in diffs)
    assert any("rule out pneumonia" in d.lower() for d in diffs)


def test_speaker_attribution(client):
    """Patient statements belong to Subjective; doctor findings belong to Objective/Assessment."""
    response = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    data = response.json()
    obj = data["soap"]["objective"]
    subj = data["soap"]["subjective"]

    # Doctor's auscultation finding is in objective
    assert any("auscultation" in finding.lower() for finding in obj["physical_examination"])
    # Patient complaints are in subjective
    assert any("cough" in s.lower() for s in subj["reported_symptoms"])


def test_missing_data_explicitly_marked_and_no_invention(client):
    """Safety requirement: Never invent CBC lab tests, vitals, or follow-ups if missing."""
    minimal_text = "Patient: I have a mild headache since morning. Doctor: Rest and drink plenty of fluids."
    response = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": minimal_text},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    plan = data["soap"]["plan"]
    obj = data["soap"]["objective"]

    # Diagnostic workup must be strictly empty (zero invented lab tests)
    assert plan["diagnostic_workup"] == []
    assert obj["investigations_reviewed"] == []

    # Missing information aggregated in unextracted_or_missing
    assert len(data["unextracted_or_missing"]) > 0
    assert any("vital signs" in item.lower() for item in data["unextracted_or_missing"])
    assert any("laboratory" in item.lower() or "tests ordered" in item.lower() for item in data["unextracted_or_missing"])


def test_encounter_vital_enrichment(client, db_session):
    seed_synthetic_clinical_data(db_session)

    response = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "patient_id": "SYN-PAT-001",
            "encounter_id": "SYN-ENC-001-B",
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
        },
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    # Vitals from SYN-ENC-001-B should be enriched into objective section
    vital_summary = data["soap"]["objective"]["vital_signs_summary"]
    assert vital_summary is not None
    assert "132/84" in vital_summary
    assert "HR: 82" in vital_summary
    assert "SYN-ENC-001-B" in vital_summary

    # Comorbidity from patient history enriched into assessment
    chronic = data["soap"]["assessment"]["chronic_conditions_status"]
    assert any("diabetes" in c.lower() for c in chronic)


def test_invalid_encounter_and_patient_ids(client, db_session):
    seed_synthetic_clinical_data(db_session)

    # Nonexistent patient
    resp_pat = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "patient_id": "NONEXISTENT-PAT-999",
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
        },
    )
    assert resp_pat.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in resp_pat.json()["detail"].lower()

    # Nonexistent encounter
    resp_enc = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "encounter_id": "NONEXISTENT-ENC-999",
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
        },
    )
    assert resp_enc.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in resp_enc.json()["detail"].lower()


def test_patient_encounter_mismatch(client, db_session):
    seed_synthetic_clinical_data(db_session)

    # SYN-ENC-001-A belongs to SYN-PAT-001, but we pass SYN-PAT-002
    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "patient_id": "SYN-PAT-002",
            "encounter_id": "SYN-ENC-001-A",
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
        },
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "mismatch" in resp.json()["detail"].lower()


def test_unsupported_consultation_language(client):
    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
            "language_code": "de",  # German unsupported
        },
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "unsupported language" in resp.json()["detail"].lower()


def test_short_or_invalid_consultation_text(client):
    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": "too short"},
    )
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_draft_retrieval(client):
    # 1. Generate note
    gen_resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    assert gen_resp.status_code == status.HTTP_201_CREATED
    note_id = gen_resp.json()["note_id"]

    # 2. Retrieve by note_id
    get_resp = client.get(f"/api/v1/clinical-notes/{note_id}")
    assert get_resp.status_code == status.HTTP_200_OK
    assert get_resp.json()["note_id"] == note_id
    assert get_resp.json()["status"] == "draft"


def test_clinician_approval_flow(client):
    gen_resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    note_id = gen_resp.json()["note_id"]

    # Clinician signs off
    review_resp = client.patch(
        f"/api/v1/clinical-notes/{note_id}/review",
        json={
            "reviewing_doctor": "Dr. Ananya Sharma, MD",
            "action": "approved",
            "doctor_comments": "Verified and approved clinical record.",
        },
    )
    assert review_resp.status_code == status.HTTP_200_OK
    data = review_resp.json()
    assert data["status"] == "approved"
    assert data["reviewing_doctor"] == "Dr. Ananya Sharma, MD"
    assert data["reviewed_at"] is not None
    assert data["doctor_comments"] == "Verified and approved clinical record."


def test_clinician_review_with_edits_flow(client):
    gen_resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    original_data = gen_resp.json()
    note_id = original_data["note_id"]

    # Create edited SOAP payload
    edited_soap = original_data["soap"]
    edited_soap["assessment"]["primary_impression"] = "Acute bronchitis with mild bronchospasm (amended)"

    review_resp = client.patch(
        f"/api/v1/clinical-notes/{note_id}/review",
        json={
            "reviewing_doctor": "Dr. Rajesh Verma",
            "action": "reviewed_with_edits",
            "edited_soap": edited_soap,
            "doctor_comments": "Refined diagnosis based on wheezing on physical exam.",
        },
    )
    assert review_resp.status_code == status.HTTP_200_OK
    data = review_resp.json()
    assert data["status"] == "reviewed_with_edits"
    assert data["edited_soap"] is not None
    assert "mild bronchospasm" in data["edited_soap"]["assessment"]["primary_impression"]
    # Original SOAP data is retained
    assert "acute productive bronchitis" in data["soap"]["assessment"]["primary_impression"].lower()


def test_invalid_approval_transitions(client):
    gen_resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    note_id = gen_resp.json()["note_id"]

    # 1. Reject note
    rej_resp = client.patch(
        f"/api/v1/clinical-notes/{note_id}/review",
        json={
            "reviewing_doctor": "Dr. Ananya Sharma",
            "action": "rejected",
            "doctor_comments": "Transcript quality poor, consultation interrupted.",
        },
    )
    assert rej_resp.status_code == status.HTTP_200_OK
    assert rej_resp.json()["status"] == "rejected"

    # 2. Cannot approve a rejected note
    app_resp = client.patch(
        f"/api/v1/clinical-notes/{note_id}/review",
        json={
            "reviewing_doctor": "Dr. Ananya Sharma",
            "action": "approved",
        },
    )
    assert app_resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "rejected" in app_resp.json()["detail"].lower()


def test_database_persistence(client, db_session):
    gen_resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    note_id = gen_resp.json()["note_id"]

    # Check persistence in database
    db_note = db_session.execute(
        select(ClinicalSOAPNote).where(ClinicalSOAPNote.note_id == note_id)
    ).scalar_one_or_none()

    assert db_note is not None
    assert db_note.note_id == note_id
    assert db_note.status == "draft"
    assert db_note.soap_data is not None


def test_existing_medication_safety_isolation(client, db_session):
    """Safety requirement: Generating a SOAP note with proposed medications

    must NEVER alter patient active medications or trigger unauthorized prescriptions.
    """
    seed_synthetic_clinical_data(db_session)

    # Initial active prescriptions count for SYN-PAT-001
    pat = db_session.execute(
        select(Patient).where(Patient.patient_id == "SYN-PAT-001")
    ).scalar_one()
    initial_meds_count = len(
        db_session.execute(
            select(PatientMedication).where(PatientMedication.patient_id == pat.id)
        ).scalars().all()
    )

    # Generate note containing Azithromycin
    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "patient_id": "SYN-PAT-001",
            "encounter_id": "SYN-ENC-001-B",
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
        },
    )
    assert resp.status_code == status.HTTP_201_CREATED

    # Verify patient medications table was NOT modified
    after_meds_count = len(
        db_session.execute(
            select(PatientMedication).where(PatientMedication.patient_id == pat.id)
        ).scalars().all()
    )
    assert initial_meds_count == after_meds_count


def test_compound_comma_separated_negation_list(client):
    """FIX 1 Test: Comma-separated negation lists preserve every negated symptom."""
    text = "Patient denies nausea, vomiting, or abdominal pain. Doctor: Rest and hydrate."
    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    subj = data["soap"]["subjective"]

    # All 3 compound items must be in pertinent_negatives
    assert any("nausea" in neg.lower() for neg in subj["pertinent_negatives"])
    assert any("vomiting" in neg.lower() for neg in subj["pertinent_negatives"])
    assert any("abdominal pain" in neg.lower() for neg in subj["pertinent_negatives"])

    # None of the 3 may appear in reported_symptoms
    assert not any("nausea" in s.lower() for s in subj["reported_symptoms"])
    assert not any("vomiting" in s.lower() for s in subj["reported_symptoms"])
    assert not any("abdominal pain" in s.lower() for s in subj["reported_symptoms"])


def test_conjunction_based_compound_negation(client):
    """FIX 1 Test: Conjunction-linked negations (and / or) preserve all items."""
    text = "Patient: No fever, chills, or cough. Denies chest pain and shortness of breath."
    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    subj = data["soap"]["subjective"]

    assert any("fever" in neg.lower() for neg in subj["pertinent_negatives"])
    assert any("chills" in neg.lower() for neg in subj["pertinent_negatives"])
    assert any("cough" in neg.lower() for neg in subj["pertinent_negatives"])
    assert any("chest pain" in neg.lower() for neg in subj["pertinent_negatives"])
    assert any("shortness of breath" in neg.lower() for neg in subj["pertinent_negatives"])

    # Zero affirmative symptoms from purely negative statements
    assert subj["reported_symptoms"] == []


def test_mixed_positive_and_negative_symptoms_in_single_clause(client):
    """FIX 1 Test: Mixed clauses correctly segment positive and negative symptoms."""
    text = "Patient: No nausea or vomiting, but reports headache since 2 days."
    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    subj = data["soap"]["subjective"]

    # Negatives captured
    assert any("nausea" in neg.lower() for neg in subj["pertinent_negatives"])
    assert any("vomiting" in neg.lower() for neg in subj["pertinent_negatives"])

    # Positive captured
    assert any("headache" in s.lower() for s in subj["reported_symptoms"])

    # Negated items must NOT bleed into reported symptoms
    assert not any("nausea" in s.lower() for s in subj["reported_symptoms"])
    assert not any("vomiting" in s.lower() for s in subj["reported_symptoms"])


def test_negation_boundaries_across_separate_clauses(client):
    """FIX 1 Test: Negation does not bleed backward or forward across clauses."""
    text = (
        "Patient: I have had a wet cough since 3 days. Denies fever, vomiting, and diarrhea. "
        "Doctor: Throat has mild congestion."
    )
    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    subj = data["soap"]["subjective"]
    obj = data["soap"]["objective"]

    # Wet cough is positive
    assert any("cough" in s.lower() for s in subj["reported_symptoms"])

    # Fever, vomiting, diarrhea are negative
    assert any("fever" in neg.lower() for neg in subj["pertinent_negatives"])
    assert any("vomiting" in neg.lower() for neg in subj["pertinent_negatives"])
    assert any("diarrhea" in neg.lower() for neg in subj["pertinent_negatives"])

    # Throat congestion is objective examination, not affected by patient negations
    assert any("congestion" in finding.lower() for finding in obj["physical_examination"])


def test_unsupported_native_script_input_rejection(client):
    """FIX 2 Test: Native Indic script triggers explicit unsupported response rather than fake note."""
    kannada_text = "ರೋಗಿ: ನನಗೆ ೩ ದಿನಗಳಿಂದ ತೀವ್ರವಾದ ಕೆಮ್ಮು ಮತ್ತು ಜ್ವರ ಇದೆ. ವೈದ್ಯರು: ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಳ್ಳಿ."
    resp_kn = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": kannada_text, "language_code": "kn"},
    )
    assert resp_kn.status_code == status.HTTP_400_BAD_REQUEST
    assert "native indic script detected" in resp_kn.json()["detail"].lower()
    assert "llm adapter" in resp_kn.json()["detail"].lower()

    hindi_text = "रोगी: मुझे तीन दिनों से खांसी और बुखार है। डॉक्टर: आराम करें।"
    resp_hi = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": hindi_text, "language_code": "hi"},
    )
    assert resp_hi.status_code == status.HTTP_400_BAD_REQUEST
    assert "native indic script detected" in resp_hi.json()["detail"].lower()


def test_preservation_of_source_evidence_in_compound_negation(client):
    """FIX 1 Test: Source evidence captures the verbatim transcript segment."""
    text = "Patient: Denies chest pain, palpitations, or lightheadedness."
    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    evidence_items = data["soap"]["subjective"]["evidence"]

    assert len(evidence_items) > 0
    for ev in evidence_items:
        if ev["is_negated"]:
            assert ev["source_evidence"] is not None
            assert "denies" in ev["source_evidence"].lower()


# =============================================================================
# Phase 5A: Clinical Context and SOAP Integration Tests (Requirements 1-10)
# =============================================================================


def test_soap_generation_with_documented_allergy(client, db_session):
    """REQ 1: SOAP generation with a patient who has a documented allergy."""
    p = Patient(
        patient_id="PAT-CTX-DOC-ALLERGY",
        full_name="Kavita DocAllergy",
        gender="Female",
        is_active=True,
    )
    db_session.add(p)
    db_session.commit()

    allergy = Allergy(
        patient_id=p.id,
        substance="Amoxicillin",
        verification_status="documented",
        severity="severe",
    )
    db_session.add(allergy)
    db_session.commit()

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "patient_id": "PAT-CTX-DOC-ALLERGY",
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
        },
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    ctx = data["soap"]["patient_context"]
    assert ctx is not None
    assert ctx["allergy_status"] == "recorded"
    assert len(ctx["documented_allergies"]) == 1
    assert "Amoxicillin" in ctx["documented_allergies"][0]
    assert ctx["patient_reported_allergies"] == []
    assert ctx["unverified_allergies"] == []


def test_soap_generation_with_patient_reported_and_unverified_allergies(client, db_session):
    """REQ 2: SOAP generation with patient-reported and unverified allergies."""
    p = Patient(
        patient_id="PAT-CTX-UNCONFIRMED-ALLERGY",
        full_name="Rajesh Unconfirmed",
        gender="Male",
        is_active=True,
    )
    db_session.add(p)
    db_session.commit()

    a1 = Allergy(
        patient_id=p.id,
        substance="Sulfa drugs",
        verification_status="patient_reported",
    )
    a2 = Allergy(
        patient_id=p.id,
        substance="Dust",
        verification_status="unverified",
    )
    db_session.add_all([a1, a2])
    db_session.commit()

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "patient_id": "PAT-CTX-UNCONFIRMED-ALLERGY",
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
        },
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    ctx = data["soap"]["patient_context"]
    assert ctx is not None
    assert ctx["allergy_status"] == "recorded"
    assert ctx["documented_allergies"] == []
    assert any("Sulfa" in a for a in ctx["patient_reported_allergies"])
    assert any("Dust" in a for a in ctx["unverified_allergies"])
    assert "UNCONFIRMED_ALLERGY_RECORDS" in ctx["clinical_alerts"]


def test_soap_generation_with_unrecorded_allergy_profile(client, db_session):
    """REQ 3: SOAP generation with an unrecorded allergy profile (never claimed as NKDA)."""
    p = Patient(
        patient_id="PAT-CTX-NO-ALLERGY-PROFILE",
        full_name="Deepa NoAllergy",
        gender="Female",
        is_active=True,
    )
    db_session.add(p)
    db_session.commit()

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "patient_id": "PAT-CTX-NO-ALLERGY-PROFILE",
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
        },
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    ctx = data["soap"]["patient_context"]
    assert ctx is not None
    assert ctx["allergy_status"] == "not_recorded"
    assert ctx["documented_allergies"] == []
    assert ctx["patient_reported_allergies"] == []
    assert "ALLERGY_PROFILE_NOT_RECORDED" in ctx["clinical_alerts"]
    assert "Allergy profile not recorded in patient records" in data["unextracted_or_missing"]


def test_soap_generation_with_active_and_discontinued_medications(client, db_session):
    """REQ 4: SOAP generation with active and discontinued medications clearly separated."""
    p = Patient(
        patient_id="PAT-CTX-MEDS",
        full_name="Sanjay Meds",
        gender="Male",
        is_active=True,
    )
    db_session.add(p)
    db_session.commit()

    m1 = Medication(
        medication_id="MED-METFORMIN-500",
        generic_name="Metformin",
        strength="500mg",
        active_ingredients=["metformin"],
        normalized_identifier="metformin",
        is_active=True,
    )
    m2 = Medication(
        medication_id="MED-ATORVASTATIN-20",
        generic_name="Atorvastatin",
        strength="20mg",
        active_ingredients=["atorvastatin"],
        normalized_identifier="atorvastatin",
        is_active=True,
    )
    db_session.add_all([m1, m2])
    db_session.commit()

    pm_active = PatientMedication(
        patient_id=p.id,
        medication_id=m1.id,
        status="active",
    )
    pm_disc = PatientMedication(
        patient_id=p.id,
        medication_id=m2.id,
        status="discontinued",
    )
    db_session.add_all([pm_active, pm_disc])
    db_session.commit()

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "patient_id": "PAT-CTX-MEDS",
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
        },
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    ctx = data["soap"]["patient_context"]
    assert ctx is not None
    # Active meds contains Metformin
    assert any("Metformin" in m for m in ctx["active_medications"])
    # Discontinued meds contains Atorvastatin and is not in active
    assert any("Atorvastatin" in m for m in ctx["historical_or_discontinued_medications"])
    assert not any("Atorvastatin" in m for m in ctx["active_medications"])


def test_soap_generation_with_incomplete_vital_measurements(client, db_session):
    """REQ 5: SOAP generation with incomplete vital measurements (never invents missing metrics)."""
    p = Patient(
        patient_id="PAT-CTX-PARTIAL-VITALS",
        full_name="Anil PartialVitals",
        gender="Male",
        is_active=True,
    )
    db_session.add(p)
    db_session.commit()

    e = Encounter(
        encounter_id="ENC-PARTIAL-001",
        patient_id=p.id,
        consultation_date=datetime(2026, 11, 10, 10, 0),
        status="in_progress",
    )
    db_session.add(e)
    db_session.commit()

    # Only BP and HR recorded
    v = VitalSign(
        encounter_id=e.id,
        systolic_bp=120.0,
        diastolic_bp=80.0,
        pulse_rate=72,
    )
    db_session.add(v)
    db_session.commit()

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "patient_id": "PAT-CTX-PARTIAL-VITALS",
            "encounter_id": "ENC-PARTIAL-001",
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
        },
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    vital_summary = data["soap"]["objective"]["vital_signs_summary"]
    assert vital_summary is not None
    assert "120/80" in vital_summary
    assert "HR: 72" in vital_summary
    # Weight, Height, and BMI were not documented and must not be invented
    assert "Weight" not in vital_summary
    assert "Height" not in vital_summary
    assert "BMI" not in vital_summary


def test_soap_generation_with_explicitly_selected_encounter(client, db_session):
    """REQ 6: SOAP generation with an explicitly selected encounter."""
    p = Patient(
        patient_id="PAT-CTX-MULTI-ENC",
        full_name="Meera MultiEnc",
        gender="Female",
        is_active=True,
    )
    db_session.add(p)
    db_session.commit()

    e1 = Encounter(
        encounter_id="ENC-HISTORICAL-1",
        patient_id=p.id,
        consultation_date=datetime(2026, 10, 1, 9, 0),
        status="completed",
    )
    e2 = Encounter(
        encounter_id="ENC-CURRENT-2",
        patient_id=p.id,
        consultation_date=datetime(2026, 11, 1, 9, 0),
        status="in_progress",
    )
    db_session.add_all([e1, e2])
    db_session.commit()

    db_session.add(VitalSign(encounter_id=e1.id, systolic_bp=110.0, diastolic_bp=70.0))
    db_session.add(VitalSign(encounter_id=e2.id, systolic_bp=145.0, diastolic_bp=92.0))
    db_session.commit()

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "patient_id": "PAT-CTX-MULTI-ENC",
            "encounter_id": "ENC-HISTORICAL-1",
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
        },
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["encounter_id"] == "ENC-HISTORICAL-1"
    summary = data["soap"]["objective"]["vital_signs_summary"]
    assert "ENC-HISTORICAL-1" in summary
    assert "110/70" in summary
    assert "145/92" not in summary


def test_soap_generation_cross_patient_encounter_rejected(client, db_session):
    """REQ 7: Rejection of cross-patient encounter association."""
    p1 = Patient(patient_id="PAT-OWNER-A", full_name="Patient A", is_active=True)
    p2 = Patient(patient_id="PAT-OWNER-B", full_name="Patient B", is_active=True)
    db_session.add_all([p1, p2])
    db_session.commit()

    e_b = Encounter(encounter_id="ENC-OF-B", patient_id=p2.id)
    db_session.add(e_b)
    db_session.commit()

    # Attempt to generate note referencing Patient A with Patient B's encounter
    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "patient_id": "PAT-OWNER-A",
            "encounter_id": "ENC-OF-B",
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
        },
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "mismatch" in resp.json()["detail"].lower()


def test_soap_generation_without_patient_id_preserves_behavior(client):
    """REQ 8: SOAP generation without patient_id preserves existing unlinked behavior."""
    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    assert data["patient_id"] is None
    assert data["encounter_id"] is None
    assert data["soap"]["patient_context"] is None
    assert "subjective" in data["soap"]
    assert "objective" in data["soap"]
    assert "assessment" in data["soap"]
    assert "plan" in data["soap"]


def test_soap_generation_synthetic_patient_provenance(client, db_session):
    """REQ 9: Synthetic patient provenance is preserved in patient context and alerts."""
    p = Patient(
        patient_id="PAT-SYN-PROVENANCE",
        full_name="Synthetic Demonstration Patient",
        gender="Other",
        is_active=True,
        is_synthetic=True,
    )
    db_session.add(p)
    db_session.commit()

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "patient_id": "PAT-SYN-PROVENANCE",
            "consultation_text": SYNTHETIC_CONSULTATION_TEXT,
        },
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    ctx = data["soap"]["patient_context"]
    assert ctx is not None
    assert ctx["is_synthetic"] is True
    assert "SYNTHETIC_DEMO_RECORD" in ctx["clinical_alerts"]


def test_existing_deterministic_adapter_direct_invocation():
    """REQ 10: Existing deterministic adapter direct contract and behavior verification."""
    adapter = DeterministicMockSOAPAdapter()
    req = SOAPGenerateRequest(
        consultation_text="Doctor: Pulse is 76, chest is clear. Primary impression acute bronchitis. Review after 3 days.",
        language_code="en",
    )

    # 1. Without context
    res_no_ctx = adapter.generate_soap_note(req, context=None)
    assert res_no_ctx.patient_context is None
    assert "acute bronchitis" in res_no_ctx.assessment.primary_impression.lower()

    # 2. With context
    ctx = {
        "patient_id": "PAT-DIRECT",
        "demographics": {"calculated_age": 45, "gender": "Male", "preferred_language": "Kannada"},
        "allergies": {
            "allergy_status": "recorded",
            "documented": [{"substance": "Ciprofloxacin", "severity": "moderate"}],
            "patient_reported": [],
            "unverified": [],
        },
        "medications": {
            "active": [{"medication": {"generic_name": "Amlodipine", "strength": "5mg"}}],
            "historical": [],
            "discontinued": [],
            "uncertain": [],
        },
        "medical_history": [{"condition": "Hypertension", "status": "active"}],
        "alerts": [{"code": "TEST_ALERT"}],
        "is_synthetic": True,
    }
    res_with_ctx = adapter.generate_soap_note(req, context=ctx)
    assert res_with_ctx.patient_context is not None
    assert res_with_ctx.patient_context.demographics_summary == "45y, Male, Lang: Kannada"
    assert "Ciprofloxacin (moderate)" in res_with_ctx.patient_context.documented_allergies
    assert "Amlodipine 5mg" in res_with_ctx.patient_context.active_medications
    assert "TEST_ALERT" in res_with_ctx.patient_context.clinical_alerts
    assert res_with_ctx.patient_context.is_synthetic is True


def test_encounter_isolation_bidirectional(client, db_session):
    """Verify encounter isolation: selecting either encounter isolates its own vitals."""
    p = Patient(patient_id="PAT-ISO-01", full_name="Isolation Test", is_active=True)
    db_session.add(p)
    db_session.commit()

    e1 = Encounter(encounter_id="ENC-A", patient_id=p.id, consultation_date=datetime(2026, 10, 1), status="completed")
    e2 = Encounter(encounter_id="ENC-B", patient_id=p.id, consultation_date=datetime(2026, 11, 1), status="completed")
    db_session.add_all([e1, e2])
    db_session.commit()

    db_session.add(VitalSign(encounter_id=e1.id, systolic_bp=110.0, diastolic_bp=70.0, pulse_rate=68))
    db_session.add(VitalSign(encounter_id=e2.id, systolic_bp=150.0, diastolic_bp=95.0, pulse_rate=88))
    db_session.commit()

    # Query Encounter A
    resp_a = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-ISO-01", "encounter_id": "ENC-A", "consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    assert resp_a.status_code == status.HTTP_201_CREATED
    data_a = resp_a.json()
    sum_a = data_a["soap"]["objective"]["vital_signs_summary"]
    assert "110/70" in sum_a
    assert "68" in sum_a
    assert "150/95" not in sum_a
    assert "88" not in sum_a

    # Query Encounter B
    resp_b = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-ISO-01", "encounter_id": "ENC-B", "consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    assert resp_b.status_code == status.HTTP_201_CREATED
    data_b = resp_b.json()
    sum_b = data_b["soap"]["objective"]["vital_signs_summary"]
    assert "150/95" in sum_b
    assert "88" in sum_b
    assert "110/70" not in sum_b
    assert "68" not in sum_b


def test_historical_measurement_separation_in_soap_patient_context(client, db_session):
    """Historical telemetry (height/weight) from past encounter appears only in SOAPPatientContext."""
    p = Patient(patient_id="PAT-HIST-VITALS", full_name="Hist Vitals Test", is_active=True)
    db_session.add(p)
    db_session.commit()

    e_old = Encounter(encounter_id="ENC-OLD", patient_id=p.id, consultation_date=datetime(2026, 1, 1), status="completed")
    e_today = Encounter(encounter_id="ENC-TODAY", patient_id=p.id, consultation_date=datetime(2026, 11, 1), status="in_progress")
    db_session.add_all([e_old, e_today])
    db_session.commit()

    # Past encounter: Height 175cm, Weight 70kg
    db_session.add(VitalSign(encounter_id=e_old.id, height_cm=175.0, weight_kg=70.0))
    # Today's encounter: Only BP 120/80
    db_session.add(VitalSign(encounter_id=e_today.id, systolic_bp=120.0, diastolic_bp=80.0))
    db_session.commit()

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-HIST-VITALS", "encounter_id": "ENC-TODAY", "consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    # Objective section has ONLY today's BP; no height, weight, or BMI
    obj_summary = data["soap"]["objective"]["vital_signs_summary"]
    assert "120/80" in obj_summary
    assert "Weight" not in obj_summary
    assert "Height" not in obj_summary
    assert "BMI" not in obj_summary

    # SOAPPatientContext retains historical vitals
    ctx = data["soap"]["patient_context"]
    assert ctx is not None
    assert ctx["historical_vitals_summary"] is not None
    assert "Weight: 70" in ctx["historical_vitals_summary"]
    assert "Height: 175" in ctx["historical_vitals_summary"]
    assert any(hv["source_encounter_id"] == "ENC-OLD" for hv in ctx["historical_vitals"])


def test_bmi_temporal_provenance_and_non_concurrency(client, db_session):
    """Non-concurrent BMI is preserved in SOAPPatientContext with provenance, never in Objective."""
    p = Patient(patient_id="PAT-BMI-PROV", full_name="BMI Prov Test", is_active=True)
    db_session.add(p)
    db_session.commit()

    e1 = Encounter(encounter_id="ENC-T1", patient_id=p.id, consultation_date=datetime(2025, 1, 1), status="completed")
    e2 = Encounter(encounter_id="ENC-T2", patient_id=p.id, consultation_date=datetime(2026, 11, 1), status="completed")
    db_session.add_all([e1, e2])
    db_session.commit()

    # Height in 2025
    db_session.add(VitalSign(encounter_id=e1.id, height_cm=180.0, recorded_at=datetime(2025, 1, 1, 10, 0)))
    # Weight in late 2026
    db_session.add(VitalSign(encounter_id=e2.id, weight_kg=80.0, recorded_at=datetime(2026, 11, 1, 10, 0)))
    db_session.commit()

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-BMI-PROV", "encounter_id": "ENC-T2", "consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    # Objective section must NOT contain BMI because height was not recorded in ENC-T2
    obj_summary = data["soap"]["objective"]["vital_signs_summary"]
    assert "BMI" not in obj_summary

    # SOAPPatientContext preserves non-concurrent BMI metadata
    ctx = data["soap"]["patient_context"]
    assert ctx is not None
    bmi_data = ctx["bmi"]
    assert bmi_data is not None
    assert bmi_data["value"] == 24.69
    assert bmi_data["is_concurrent"] is False
    assert bmi_data["measurement_gap_days"] is not None
    assert bmi_data["measurement_gap_days"] > 365
    assert bmi_data["height_recorded_at"] is not None
    assert bmi_data["weight_recorded_at"] is not None


def test_medical_history_status_segregation(client, db_session):
    """Active condition goes to Assessment chronic_conditions_status; resolved/historical goes to past_medical_history."""
    from app.models.medical_history import MedicalHistory

    p = Patient(patient_id="PAT-MED-HIST-SEG", full_name="Hist Seg Test", is_active=True)
    db_session.add(p)
    db_session.commit()

    db_session.add(MedicalHistory(patient_id=p.id, condition="Type 2 Diabetes", status="active"))
    db_session.add(MedicalHistory(patient_id=p.id, condition="Acute Appendicitis", status="resolved"))
    db_session.add(MedicalHistory(patient_id=p.id, condition="Childhood Asthma", status="historical"))
    db_session.add(MedicalHistory(patient_id=p.id, condition="Unverified Murmur", status="unknown"))
    db_session.commit()

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-MED-HIST-SEG", "consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    # Assessment chronic conditions should only contain active comorbidity
    assessment_chronic = data["soap"]["assessment"]["chronic_conditions_status"]
    assert any("Type 2 Diabetes (active comorbidity" in c for c in assessment_chronic)
    assert not any("Appendicitis" in c for c in assessment_chronic)
    assert not any("Asthma" in c for c in assessment_chronic)
    assert not any("Murmur" in c for c in assessment_chronic)

    # SOAPPatientContext should separate them
    ctx = data["soap"]["patient_context"]
    assert ctx is not None
    assert any("Type 2 Diabetes (active)" in c for c in ctx["chronic_conditions"])
    assert not any("Appendicitis" in c for c in ctx["chronic_conditions"])

    past_hist = ctx["past_medical_history"]
    assert any("Acute Appendicitis (resolved)" in c for c in past_hist)
    assert any("Childhood Asthma (historical)" in c for c in past_hist)
    assert any("Unverified Murmur (unknown)" in c for c in past_hist)


# ==============================================================================
# Phase 5B: Closed-Loop Medication Safety Integration Tests
# ==============================================================================

def _seed_catalogue_for_notes(db):
    meds = [
        Medication(
            medication_id="MED-WARFARIN",
            generic_name="Warfarin",
            brand_name="Coumadin",
            active_ingredients=["warfarin"],
            normalized_identifier="warfarin",
        ),
        Medication(
            medication_id="MED-ASPIRIN",
            generic_name="Aspirin",
            brand_name="Ecosprin",
            active_ingredients=["aspirin"],
            normalized_identifier="aspirin",
        ),
        Medication(
            medication_id="MED-PARACETAMOL",
            generic_name="Paracetamol",
            brand_name="Dolo 650",
            active_ingredients=["paracetamol"],
            normalized_identifier="paracetamol",
        ),
        Medication(
            medication_id="MED-CALPOL",
            generic_name="Paracetamol",
            brand_name="Calpol",
            active_ingredients=["paracetamol"],
            normalized_identifier="paracetamol",
        ),
        Medication(
            medication_id="MED-AMOXICILLIN",
            generic_name="Amoxicillin",
            brand_name="Novamox",
            active_ingredients=["amoxicillin"],
            normalized_identifier="amoxicillin",
        ),
        Medication(
            medication_id="MED-CIPROFLOXACIN",
            generic_name="Ciprofloxacin",
            brand_name="Cifran",
            active_ingredients=["ciprofloxacin"],
            normalized_identifier="ciprofloxacin",
        ),
        Medication(
            medication_id="MED-AUGMENTIN",
            generic_name="Amoxicillin and Clavulanate Potassium",
            brand_name="Augmentin",
            active_ingredients=["amoxicillin", "clavulanic acid"],
            normalized_identifier="amoxicillin_clavulanate",
        ),
        Medication(
            medication_id="MED-METFORMIN",
            generic_name="Metformin",
            brand_name="Glycomet",
            active_ingredients=["metformin"],
            normalized_identifier="metformin",
        ),
    ]
    for m in meds:
        existing = db.execute(select(Medication).where(Medication.medication_id == m.medication_id)).scalar_one_or_none()
        if not existing:
            db.add(m)
    db.commit()


def test_soap_medication_safety_documented_allergy_conflict(client, db_session):
    """Phase 5B.1: Proposed medication conflicting with documented allergy produces WARNING."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-ALLERGY-DOC", full_name="Documented Allergy Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    db_session.add(
        Allergy(
            patient_id=p.id,
            substance="Penicillin",
            reaction="Anaphylaxis and urticaria",
            verification_status="documented",
            severity="critical",
        )
    )
    db_session.commit()

    text = (
        "Doctor: Ramesh, good morning. What brings you in today?\n"
        "Patient: Severe sore throat and fever since 3 days.\n"
        "Doctor: Throat has severe tonsillar exudate on examination.\n"
        "Doctor: I will prescribe Amoxicillin 500mg capsules TDS for 5 days.\n"
        "Doctor: Drink warm liquids and rest. Review after 5 days."
    )

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-ALLERGY-DOC", "consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    # Safety findings attached
    assert data["medication_safety"] is not None
    safety = data["medication_safety"]
    assert safety["overall_status"] == "WARNING"
    assert safety["has_warnings"] is True
    assert any(w["rule_id"] == "ALLERGY-CONF-001" for w in safety["warnings"])

    # Nested SOAP payload also has safety
    assert data["soap"]["medication_safety"]["overall_status"] == "WARNING"

    # Confidence notes flag safety warnings
    assert "WARNING" in data["confidence_notes"]
    assert "ALLERGY-CONF-001" in data["confidence_notes"]

    # Missing/unextracted domains flag critical safety warnings
    assert any("Critical medication safety warnings flagged" in m for m in data["unextracted_or_missing"])


def test_soap_medication_safety_patient_reported_allergy_review_required(client, db_session):
    """Phase 5B.2: Patient-reported allergy conflict produces REVIEW_REQUIRED."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-ALLERGY-REP", full_name="Reported Allergy Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    db_session.add(
        Allergy(
            patient_id=p.id,
            substance="Ciprofloxacin",
            reaction="Nausea and mild rash",
            verification_status="patient_reported",
            severity="moderate",
        )
    )
    db_session.commit()

    text = (
        "Doctor: Good morning. What brings you in today?\n"
        "Patient: Burning micturition and low fever for 2 days.\n"
        "Doctor: Abdomen soft, mild suprapubic discomfort.\n"
        "Doctor: I will prescribe Ciprofloxacin 500mg twice daily for 5 days.\n"
        "Doctor: Drink plenty of water. Review after 3 days."
    )

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-ALLERGY-REP", "consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    safety = data["medication_safety"]
    assert safety is not None
    assert safety["overall_status"] == "REVIEW_REQUIRED"
    assert safety["has_warnings"] is False
    assert safety["has_review_required"] is True
    assert any(r["rule_id"] == "ALLERGY-REP-001" for r in safety["review_required"])


def test_soap_medication_safety_unverified_allergy_review_required(client, db_session):
    """Phase 5B.3: Unverified allergy conflict produces REVIEW_REQUIRED."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-ALLERGY-UNVER", full_name="Unverified Allergy Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    db_session.add(
        Allergy(
            patient_id=p.id,
            substance="Amoxicillin",
            reaction="Unknown rash",
            verification_status="unverified",
        )
    )
    db_session.commit()

    text = (
        "Doctor: Good morning. What symptoms do you have?\n"
        "Patient: Sinus headache and fever for 4 days.\n"
        "Doctor: Facial tenderness on palpation.\n"
        "Doctor: I will prescribe Amoxicillin 500mg twice daily for 7 days.\n"
        "Doctor: Take steam inhalation. Review after 7 days."
    )

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-ALLERGY-UNVER", "consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    safety = data["medication_safety"]
    assert safety is not None
    assert safety["overall_status"] == "REVIEW_REQUIRED"
    assert safety["has_warnings"] is False
    assert any(r["rule_id"] == "ALLERGY-UNVER-001" for r in safety["review_required"])


def test_soap_medication_safety_active_drug_drug_interaction(client, db_session):
    """Phase 5B.4: Proposed medication interacting with active medication produces WARNING."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-DDI-ACTIVE", full_name="Active DDI Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    # Documented non-conflicting allergy so allergy profile is recorded
    db_session.add(
        Allergy(
            patient_id=p.id,
            substance="Dust",
            reaction="Sneezing",
            verification_status="documented",
        )
    )
    # Active Warfarin
    med_warfarin = db_session.execute(select(Medication).where(Medication.medication_id == "MED-WARFARIN")).scalar_one()
    db_session.add(PatientMedication(patient_id=p.id, medication_id=med_warfarin.id, status="active"))
    db_session.commit()

    text = (
        "Doctor: Good morning. How are you feeling today?\n"
        "Patient: Mild headache and generalized body ache since yesterday.\n"
        "Doctor: General examination normal.\n"
        "Doctor: I will prescribe Aspirin 75mg once daily for 5 days.\n"
        "Doctor: Take rest and hydrate. Review after 5 days."
    )

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-DDI-ACTIVE", "consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    safety = data["medication_safety"]
    assert safety is not None
    assert safety["overall_status"] == "WARNING"
    assert safety["has_warnings"] is True
    assert any(w["rule_id"] == "DDI-001" for w in safety["warnings"])
    assert "DDI-001" in data["confidence_notes"]


def test_soap_medication_safety_discontinued_medication_excluded(client, db_session):
    """Phase 5B.5: Discontinued/historical medications are strictly excluded from active DDI checks."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-DISCONTINUED-MED", full_name="Discontinued Med Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    # Non-conflicting recorded allergy
    db_session.add(
        Allergy(
            patient_id=p.id,
            substance="Dust",
            reaction="Sneezing",
            verification_status="documented",
        )
    )
    # Discontinued Warfarin (stopped in the past)
    med_warfarin = db_session.execute(select(Medication).where(Medication.medication_id == "MED-WARFARIN")).scalar_one()
    db_session.add(
        PatientMedication(
            patient_id=p.id,
            medication_id=med_warfarin.id,
            status="discontinued",
            discontinued_date=datetime(2025, 6, 1),
        )
    )
    db_session.commit()

    text = (
        "Doctor: Good morning. How are you feeling today?\n"
        "Patient: Mild headache and generalized body ache since yesterday.\n"
        "Doctor: General examination normal.\n"
        "Doctor: I will prescribe Aspirin 75mg once daily for 5 days.\n"
        "Doctor: Take rest and hydrate. Review after 5 days."
    )

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-DISCONTINUED-MED", "consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    safety = data["medication_safety"]
    assert safety is not None
    assert safety["has_warnings"] is False
    assert safety["overall_status"] == "SAFE"
    assert "A SAFE result indicates no detected conflict within the supported rule catalogue" in safety["disclaimer"]


def test_soap_medication_safety_duplicate_active_ingredient(client, db_session):
    """Phase 5B.6: Proposed medication with duplicate active ingredient produces WARNING."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-DUP-ING", full_name="Duplicate Ingredient Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    db_session.add(
        Allergy(
            patient_id=p.id,
            substance="Dust",
            reaction="Rhinitis",
            verification_status="documented",
        )
    )
    # Active Paracetamol (Dolo 650)
    med_para = db_session.execute(select(Medication).where(Medication.medication_id == "MED-PARACETAMOL")).scalar_one()
    db_session.add(PatientMedication(patient_id=p.id, medication_id=med_para.id, status="active"))
    db_session.commit()

    text = (
        "Doctor: Good morning. What brings you in today?\n"
        "Patient: Mild fever and headache since yesterday.\n"
        "Doctor: Temperature is 37.8C.\n"
        "Doctor: I will prescribe Calpol 500mg tablet TDS for 3 days.\n"
        "Doctor: Drink plenty of water. Review after 3 days."
    )

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-DUP-ING", "consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    safety = data["medication_safety"]
    assert safety is not None
    assert safety["overall_status"] == "WARNING"
    assert safety["has_warnings"] is True
    assert any(w["rule_id"] == "DUP-ING-001" for w in safety["warnings"])


def test_soap_medication_safety_co_proposed_duplicate_ingredients(client, db_session):
    """Phase 5B.6b: Duplicate active ingredients co-proposed in the same plan trigger WARNING."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-CO-DUP", full_name="Co Duplicate Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    db_session.add(
        Allergy(
            patient_id=p.id,
            substance="Dust",
            reaction="Rhinitis",
            verification_status="documented",
        )
    )
    db_session.commit()

    text = (
        "Doctor: Good morning. What brings you in today?\n"
        "Patient: Severe fever and body ache since morning.\n"
        "Doctor: Examination normal.\n"
        "Doctor: I will prescribe Dolo 650 TDS and Calpol 500mg BD.\n"
        "Doctor: Drink plenty of water. Review after 3 days."
    )

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-CO-DUP", "consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    safety = data["medication_safety"]
    assert safety is not None
    assert safety["overall_status"] == "WARNING"
    assert safety["has_warnings"] is True
    assert any(w["rule_id"] == "DUP-ING-001" for w in safety["warnings"])


def test_soap_medication_safety_unknown_unresolved_medication(client, db_session):
    """Phase 5B.7: Unknown medication not in catalogue produces UNABLE_TO_VERIFY."""
    p = Patient(patient_id="PAT-UNKNOWN-MED", full_name="Unknown Med Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    db_session.add(
        Allergy(
            patient_id=p.id,
            substance="Dust",
            reaction="Rhinitis",
            verification_status="documented",
        )
    )
    db_session.commit()

    text = (
        "Doctor: Good morning. What is the complaint?\n"
        "Patient: Chronic joint discomfort for months.\n"
        "Doctor: Joint mobility normal, no swelling.\n"
        "Doctor: I will prescribe CompletelyUnknownMoleculeXYZ 25mg daily.\n"
        "Doctor: Exercise regularly. Review after 10 days."
    )

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-UNKNOWN-MED", "consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    safety = data["medication_safety"]
    assert safety is not None
    assert safety["overall_status"] == "UNABLE_TO_VERIFY"
    assert safety["has_unable_to_verify"] is True
    assert len(safety["unable_to_verify"]) > 0
    assert any("CompletelyUnknownMoleculeXYZ".lower() in u.lower() for u in safety["unable_to_verify"])
    assert any("verified against the trusted catalogue" in m for m in data["unextracted_or_missing"])


def test_soap_medication_safety_missing_allergy_profile(client, db_session):
    """Phase 5B.8: Missing allergy profile on file produces REVIEW_REQUIRED."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-NO-ALLERGIES", full_name="No Allergies Recorded Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    text = (
        "Doctor: Good morning. What is your chief complaint?\n"
        "Patient: Blood sugar checkup and fatigue.\n"
        "Doctor: Blood sugar is elevated.\n"
        "Doctor: I will prescribe Metformin 500mg once daily.\n"
        "Doctor: Maintain diabetic diet. Review after 2 weeks."
    )

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-NO-ALLERGIES", "consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    safety = data["medication_safety"]
    assert safety is not None
    assert safety["overall_status"] == "REVIEW_REQUIRED"
    assert safety["has_review_required"] is True
    assert safety["has_warnings"] is False
    assert any(r["rule_id"] == "ALLERGY-UNRECORDED-001" for r in safety["review_required"])
    assert "Allergy profile not recorded in patient records" in data["unextracted_or_missing"]


def test_soap_medication_safety_multiple_findings(client, db_session):
    """Phase 5B.9: Multiple proposed medications with multiple safety findings across categories."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-MULTI-SAFETY", full_name="Multi Safety Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    # Documented Penicillin allergy
    db_session.add(
        Allergy(
            patient_id=p.id,
            substance="Penicillin",
            reaction="Anaphylaxis",
            verification_status="documented",
            severity="critical",
        )
    )
    # Active Warfarin
    med_warfarin = db_session.execute(select(Medication).where(Medication.medication_id == "MED-WARFARIN")).scalar_one()
    db_session.add(PatientMedication(patient_id=p.id, medication_id=med_warfarin.id, status="active"))
    db_session.commit()

    text = (
        "Doctor: Good morning. What symptoms do you have?\n"
        "Patient: Throat pain and joint aches since 2 days.\n"
        "Doctor: Throat has exudate, joints normal.\n"
        "Doctor: I will prescribe Amoxicillin 500mg TDS and Aspirin 75mg once daily.\n"
        "Doctor: Rest and drink warm water. Review after 5 days."
    )

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-MULTI-SAFETY", "consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    safety = data["medication_safety"]
    assert safety is not None
    assert safety["overall_status"] == "WARNING"
    assert safety["has_warnings"] is True

    rule_ids = [w["rule_id"] for w in safety["warnings"]]
    assert "ALLERGY-CONF-001" in rule_ids
    assert "DDI-001" in rule_ids
    assert len(safety["evaluations"]) >= 2


def test_soap_medication_safety_without_patient_id_backward_compatible(client):
    """Phase 5B.10: SOAP generation without patient_id preserves backward-compatible None safety report."""
    text = (
        "Doctor: Good morning. What brings you in today?\n"
        "Patient: Severe cough and throat pain for 3 days.\n"
        "Doctor: Throat has congestion.\n"
        "Doctor: I will prescribe Amoxicillin 500mg capsules TDS for 5 days.\n"
        "Doctor: Steam inhalation twice daily. Review after 5 days."
    )

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()

    assert data["patient_id"] is None
    assert data["medication_safety"] is None
    assert data["soap"]["medication_safety"] is None


def test_soap_medication_safety_doctor_review_with_edits_re_evaluation(client, db_session):
    """Phase 5B.11: Physician review workflow re-evaluates medication safety upon edits."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-REVIEW-SAFETY", full_name="Review Safety Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    db_session.add(
        Allergy(
            patient_id=p.id,
            substance="Penicillin",
            reaction="Anaphylaxis",
            verification_status="documented",
            severity="critical",
        )
    )
    db_session.commit()

    # 1. Draft generated with Amoxicillin -> triggers WARNING
    text = (
        "Doctor: Good morning. What brings you in today?\n"
        "Patient: Severe sore throat and fever.\n"
        "Doctor: Throat inflamed.\n"
        "Doctor: I will prescribe Amoxicillin 500mg capsules TDS for 5 days.\n"
        "Doctor: Rest and review after 5 days."
    )
    draft_resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-REVIEW-SAFETY", "consultation_text": text},
    )
    assert draft_resp.status_code == status.HTTP_201_CREATED
    draft_data = draft_resp.json()
    assert draft_data["medication_safety"]["overall_status"] == "WARNING"

    # 2. Doctor reviews note and edits plan to Paracetamol (safe)
    edited_soap = draft_data["soap"]
    edited_soap["plan"]["proposed_medications"] = [
        "Doctor: I will prescribe Paracetamol 650mg TDS for 3 days."
    ]

    review_resp = client.patch(
        f"/api/v1/clinical-notes/{draft_data['note_id']}/review",
        json={
            "reviewing_doctor": "Dr. A. Sharma, MD",
            "action": "reviewed_with_edits",
            "doctor_comments": "Discontinued Amoxicillin due to documented Penicillin allergy; prescribed safe antipyretic.",
            "edited_soap": edited_soap,
        },
    )
    assert review_resp.status_code == status.HTTP_200_OK
    rev_data = review_resp.json()

    assert rev_data["status"] == "reviewed_with_edits"
    assert rev_data["reviewing_doctor"] == "Dr. A. Sharma, MD"

    # Edited soap medication safety is re-evaluated: WARNING is cleared!
    assert rev_data["edited_soap"]["medication_safety"] is not None
    assert rev_data["edited_soap"]["medication_safety"]["has_warnings"] is False
    assert rev_data["edited_soap"]["medication_safety"]["overall_status"] == "SAFE"

    # Top-level medication_safety reflects active edited report
    assert rev_data["medication_safety"]["overall_status"] == "SAFE"
    assert rev_data["medication_safety"]["has_warnings"] is False


def test_soap_medication_safety_survives_persistence_and_retrieval(client, db_session):
    """Phase 5B.12: Medication safety findings survive JSON serialization and GET retrieval."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-PERSIST-SAFETY", full_name="Persist Safety Patient", is_active=True)
    db_session.add(p)
    db_session.commit()

    db_session.add(
        Allergy(
            patient_id=p.id,
            substance="Dust",
            reaction="Sneezing",
            verification_status="documented",
        )
    )
    med_warfarin = db_session.execute(select(Medication).where(Medication.medication_id == "MED-WARFARIN")).scalar_one()
    db_session.add(PatientMedication(patient_id=p.id, medication_id=med_warfarin.id, status="active"))
    db_session.commit()

    text = (
        "Doctor: Good morning. How are you feeling today?\n"
        "Patient: Mild headache and generalized body ache since yesterday.\n"
        "Doctor: General examination normal.\n"
        "Doctor: I will prescribe Aspirin 75mg once daily for 5 days.\n"
        "Doctor: Take rest and hydrate. Review after 5 days."
    )

    resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-PERSIST-SAFETY", "consultation_text": text},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    note_id = resp.json()["note_id"]

    # Retrieve note
    get_resp = client.get(f"/api/v1/clinical-notes/{note_id}")
    assert get_resp.status_code == status.HTTP_200_OK
    get_data = get_resp.json()

    assert get_data["note_id"] == note_id
    assert get_data["medication_safety"] is not None
    assert get_data["medication_safety"]["overall_status"] == "WARNING"
    assert get_data["medication_safety"]["has_warnings"] is True
    assert any(w["rule_id"] == "DDI-001" for w in get_data["medication_safety"]["warnings"])
    assert get_data["soap"]["medication_safety"]["overall_status"] == "WARNING"


# ==============================================================================
# Phase 5B.1: Targeted Clinical Safety Remediation Regression Tests
# ==============================================================================

def test_negated_instruction_not_proposed_prescription(client, db_session):
    """Phase 5B.1.1: 'Do not take Aspirin' must not become a proposed prescription."""
    _seed_catalogue_for_notes(db_session)
    text = (
        "Doctor: Good morning Ramesh. How are you?\n"
        "Patient: Severe stomach burning and acid reflux.\n"
        "Doctor: Examination is normal. Do not take Aspirin 500mg. Drink warm water and rest.\n"
        "Doctor: Review after 3 days."
    )
    resp = client.post("/api/v1/clinical-notes/generate", json={"consultation_text": text})
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert not any("aspirin" in m.lower() for m in data["soap"]["plan"]["proposed_medications"])
    assert any("do not take aspirin" in inst.lower() for inst in data["soap"]["plan"]["patient_instructions"])


def test_discontinued_medication_not_proposed_prescription(client, db_session):
    """Phase 5B.1.2: 'Stop taking Brufen' must not become a proposed prescription."""
    _seed_catalogue_for_notes(db_session)
    text = (
        "Doctor: Good morning. What is the issue?\n"
        "Patient: Body ache and severe gastritis.\n"
        "Doctor: Stop taking Brufen tablets immediately. Drink plenty of water.\n"
        "Doctor: Review after 3 days."
    )
    resp = client.post("/api/v1/clinical-notes/generate", json={"consultation_text": text})
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert not any("brufen" in m.lower() for m in data["soap"]["plan"]["proposed_medications"])
    assert any("stop taking brufen" in inst.lower() for inst in data["soap"]["plan"]["patient_instructions"])


def test_continue_existing_therapy_no_duplicate_warning(client, db_session):
    """Phase 5B.1.3: 'Continue your regular Metformin 500mg daily' must not create duplicate prescription warning."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-CONT-MET", full_name="Continue Metformin Patient", is_active=True)
    db_session.add(p)
    db_session.commit()
    db_session.add(Allergy(patient_id=p.id, substance="Dust", verification_status="documented"))
    med_met = db_session.execute(select(Medication).where(Medication.medication_id == "MED-METFORMIN")).scalar_one()
    db_session.add(PatientMedication(patient_id=p.id, medication_id=med_met.id, status="active"))
    db_session.commit()

    text = (
        "Doctor: Good morning. How are your blood sugars?\n"
        "Patient: Stable, feeling energetic.\n"
        "Doctor: Continue your regular Metformin 500mg daily. Maintain diabetic diet and walk 30 minutes.\n"
        "Doctor: Review after 1 month."
    )
    resp = client.post("/api/v1/clinical-notes/generate", json={"patient_id": "PAT-CONT-MET", "consultation_text": text})
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    safety = data["medication_safety"]
    assert safety is not None
    assert not any(w["rule_id"] == "DUP-ING-001" for w in safety.get("warnings", []))
    assert safety["has_warnings"] is False


def test_historical_mention_not_proposed_prescription(client, db_session):
    """Phase 5B.1.4: 'Previously used Ciprofloxacin' must not become a proposed prescription."""
    _seed_catalogue_for_notes(db_session)
    text = (
        "Doctor: Good morning. What brings you in today?\n"
        "Patient: Burning micturition since 2 days.\n"
        "Doctor: Patient previously used Ciprofloxacin without improvement. I will examine you.\n"
        "Doctor: Urine culture ordered. Drink warm water.\n"
        "Doctor: Review after 3 days."
    )
    resp = client.post("/api/v1/clinical-notes/generate", json={"consultation_text": text})
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert not any("ciprofloxacin" in m.lower() for m in data["soap"]["plan"]["proposed_medications"])


def test_conditional_suggestion_requires_physician_review(client, db_session):
    """Phase 5B.1.5: Conditional suggestions must not silently become confirmed prescriptions."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-COND-AZI", full_name="Conditional Suggestion Patient", is_active=True)
    db_session.add(p)
    db_session.commit()
    db_session.add(Allergy(patient_id=p.id, substance="Dust", verification_status="documented"))
    db_session.commit()

    text = (
        "Doctor: Good morning. What symptoms do you have?\n"
        "Patient: Productive cough since 4 days.\n"
        "Doctor: Mild rhonchi on chest examination.\n"
        "Doctor: If symptoms persist, consider Azithromycin 500mg daily. Steam inhalation twice daily.\n"
        "Doctor: Review after 5 days."
    )
    resp = client.post("/api/v1/clinical-notes/generate", json={"patient_id": "PAT-COND-AZI", "consultation_text": text})
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    safety = data["medication_safety"]
    assert safety is not None
    assert safety["overall_status"] == "REVIEW_REQUIRED"
    assert safety["has_review_required"] is True
    assert any(r["rule_id"] == "MED-CONDITIONAL-001" for r in safety["review_required"])


def test_combination_medication_not_broken_by_and(client, db_session):
    """Phase 5B.1.6: 'Amoxicillin and Clavulanate 625mg' must resolve as one combination from trusted catalogue."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-COMBO-AUG", full_name="Combo Patient", is_active=True)
    db_session.add(p)
    db_session.commit()
    db_session.add(Allergy(patient_id=p.id, substance="Dust", verification_status="documented"))
    db_session.commit()

    text = (
        "Doctor: Good morning. What brings you in today?\n"
        "Patient: Severe toothache and facial swelling.\n"
        "Doctor: Dental abscess on examination.\n"
        "Doctor: I will prescribe Amoxicillin and Clavulanate 625mg twice daily for 5 days.\n"
        "Doctor: Warm saline mouthwash. Review after 5 days."
    )
    resp = client.post("/api/v1/clinical-notes/generate", json={"patient_id": "PAT-COMBO-AUG", "consultation_text": text})
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    safety = data["medication_safety"]
    assert safety is not None
    # Must NOT be split into two separate evaluations
    assert len(safety["evaluations"]) == 1
    eval_item = safety["evaluations"][0]
    assert "amoxicillin" in eval_item["active_ingredients"]
    assert any("clavulan" in ing for ing in eval_item["active_ingredients"])


def test_allergy_warning_and_unresolved_medication_both_visible(client, db_session):
    """Phase 5B.1.7: Allergy WARNING and unresolved medication both remain visible in report and missing domains."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-WARN-UNRES", full_name="Warn Unres Patient", is_active=True)
    db_session.add(p)
    db_session.commit()
    db_session.add(Allergy(patient_id=p.id, substance="Penicillin", verification_status="documented", severity="critical"))
    db_session.commit()

    text = (
        "Doctor: Good morning. How are you?\n"
        "Patient: Severe sore throat and cough.\n"
        "Doctor: Throat inflamed.\n"
        "Doctor: I will prescribe Amoxicillin 500mg TDS and CompletelyUnknownMoleculeXYZ 25mg daily.\n"
        "Doctor: Review after 5 days."
    )
    resp = client.post("/api/v1/clinical-notes/generate", json={"patient_id": "PAT-WARN-UNRES", "consultation_text": text})
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    safety = data["medication_safety"]
    assert safety is not None
    assert safety["overall_status"] == "WARNING"
    assert safety["has_warnings"] is True
    assert safety["has_unable_to_verify"] is True
    assert any(w["rule_id"] == "ALLERGY-CONF-001" for w in safety["warnings"])
    assert len(safety["unable_to_verify"]) > 0

    # Both must be present in unextracted_or_missing!
    missing = data["unextracted_or_missing"]
    assert any("Critical medication safety warnings flagged" in m for m in missing)
    assert any("One or more proposed medications could not be verified against the trusted catalogue" in m for m in missing)


def test_doctor_review_emptying_plan_clears_safety_report(client, db_session):
    """Phase 5B.1.8: Doctor edits that remove all proposed medications clear the stale medication safety report."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-REV-EMPTY", full_name="Review Empty Patient", is_active=True)
    db_session.add(p)
    db_session.commit()
    db_session.add(Allergy(patient_id=p.id, substance="Penicillin", verification_status="documented", severity="critical"))
    db_session.commit()

    # Draft has Penicillin allergy conflict with Amoxicillin
    text = (
        "Doctor: Good morning. What brings you in today?\n"
        "Patient: Mild cough and throat irritation.\n"
        "Doctor: Throat mildly congested.\n"
        "Doctor: I will prescribe Amoxicillin 500mg capsules TDS for 5 days.\n"
        "Doctor: Rest and review after 5 days."
    )
    draft_resp = client.post("/api/v1/clinical-notes/generate", json={"patient_id": "PAT-REV-EMPTY", "consultation_text": text})
    assert draft_resp.status_code == 201
    draft_data = draft_resp.json()
    assert draft_data["medication_safety"]["overall_status"] == "WARNING"

    # Doctor edits plan to remove all medications
    edited_soap = draft_data["soap"]
    edited_soap["plan"]["proposed_medications"] = []
    edited_soap["plan"]["patient_instructions"] = ["Steam inhalation twice daily", "Salt water gargling"]

    rev_resp = client.patch(
        f"/api/v1/clinical-notes/{draft_data['note_id']}/review",
        json={
            "reviewing_doctor": "Dr. A. Sharma, MD",
            "action": "reviewed_with_edits",
            "doctor_comments": "Discontinued antibiotic; advised non-pharmacological care.",
            "edited_soap": edited_soap,
        },
    )
    assert rev_resp.status_code == 200
    rev_data = rev_resp.json()

    assert rev_data["status"] == "reviewed_with_edits"
    assert rev_data["edited_soap"]["plan"]["proposed_medications"] == []
    assert rev_data["edited_soap"]["medication_safety"] is None
    assert rev_data["medication_safety"] is None


def test_doctor_review_retaining_unsafe_medication_triggers_fresh_evaluation(client, db_session):
    """Phase 5B.1.9: Doctor edits introducing unsafe medications trigger fresh safety evaluation."""
    _seed_catalogue_for_notes(db_session)
    p = Patient(patient_id="PAT-REV-UNSAFE", full_name="Review Unsafe Patient", is_active=True)
    db_session.add(p)
    db_session.commit()
    db_session.add(Allergy(patient_id=p.id, substance="Dust", verification_status="documented"))
    med_war = db_session.execute(select(Medication).where(Medication.medication_id == "MED-WARFARIN")).scalar_one()
    db_session.add(PatientMedication(patient_id=p.id, medication_id=med_war.id, status="active"))
    db_session.commit()

    # Draft generated with safe Paracetamol
    text = (
        "Doctor: Good morning. How are you?\n"
        "Patient: Mild headache.\n"
        "Doctor: Examination normal.\n"
        "Doctor: I will prescribe Paracetamol 650mg TDS for 2 days.\n"
        "Doctor: Review after 3 days."
    )
    draft_resp = client.post("/api/v1/clinical-notes/generate", json={"patient_id": "PAT-REV-UNSAFE", "consultation_text": text})
    assert draft_resp.status_code == 201
    draft_data = draft_resp.json()
    assert draft_data["medication_safety"]["overall_status"] == "SAFE"

    # Doctor review introduces Aspirin (interacts with active Warfarin)
    edited_soap = draft_data["soap"]
    edited_soap["plan"]["proposed_medications"] = ["Doctor: I will prescribe Aspirin 75mg once daily."]

    rev_resp = client.patch(
        f"/api/v1/clinical-notes/{draft_data['note_id']}/review",
        json={
            "reviewing_doctor": "Dr. A. Sharma, MD",
            "action": "reviewed_with_edits",
            "doctor_comments": "Added antiplatelet.",
            "edited_soap": edited_soap,
        },
    )
    assert rev_resp.status_code == 200
    rev_data = rev_resp.json()
    assert rev_data["edited_soap"]["medication_safety"] is not None
    assert rev_data["edited_soap"]["medication_safety"]["overall_status"] == "WARNING"
    assert any(w["rule_id"] == "DDI-001" for w in rev_data["edited_soap"]["medication_safety"]["warnings"])
    assert rev_data["medication_safety"]["overall_status"] == "WARNING"


def test_draft_update_persistence_and_safety_reevaluation(client, db_session):
    """Verify clinician can save draft amendments without approving, re-evaluating safety."""
    p = Patient(
        patient_id="PAT-DRAFT-TEST",
        full_name="Draft Test Patient",
        gender="male",
        date_of_birth=date(1980, 1, 1),
        preferred_language="en",
        is_synthetic=True,
    )
    db_session.add(p)
    db_session.flush()
    db_session.add(Allergy(patient_id=p.id, substance="Amoxicillin", verification_status="documented"))
    db_session.commit()

    text = (
        "Doctor: Hello. What brings you in today?\n"
        "Patient: Severe cough and sore throat.\n"
        "Doctor: Throat congested.\n"
        "Doctor: I will prescribe Paracetamol 650mg TDS.\n"
        "Doctor: Review in 4 days."
    )
    draft_resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "PAT-DRAFT-TEST", "consultation_text": text},
    )
    assert draft_resp.status_code == 201
    draft_data = draft_resp.json()
    note_id = draft_data["note_id"]
    assert draft_data["status"] == "draft"

    # Save draft amendment with Amoxicillin (triggers allergy warning)
    edited_soap = draft_data["soap"]
    edited_soap["plan"]["proposed_medications"] = ["Amoxicillin 500mg TDS for 5 days"]

    patch_resp = client.patch(
        f"/api/v1/clinical-notes/{note_id}/draft",
        json={
            "edited_soap": edited_soap,
            "doctor_comments": "Saved interim draft edits prior to final verification.",
        },
    )
    assert patch_resp.status_code == 200
    updated_data = patch_resp.json()
    assert updated_data["status"] == "draft"
    assert updated_data["doctor_comments"] == "Saved interim draft edits prior to final verification."
    assert updated_data["edited_soap"]["plan"]["proposed_medications"] == ["Amoxicillin 500mg TDS for 5 days"]
    assert updated_data["medication_safety"] is not None
    assert updated_data["medication_safety"]["overall_status"] == "WARNING"
    assert any("amoxicillin" in str(w).lower() for w in updated_data["medication_safety"]["warnings"])

    # Reload from GET to verify SQLite persistence
    get_resp = client.get(f"/api/v1/clinical-notes/{note_id}")
    assert get_resp.status_code == 200
    reloaded = get_resp.json()
    assert reloaded["status"] == "draft"
    assert reloaded["edited_soap"]["plan"]["proposed_medications"] == ["Amoxicillin 500mg TDS for 5 days"]

    # Verify list notes endpoint
    list_resp = client.get("/api/v1/clinical-notes?status_filter=draft")
    assert list_resp.status_code == 200
    notes_list = list_resp.json()
    assert any(n["note_id"] == note_id for n in notes_list)


def test_draft_update_rejected_on_approved_or_rejected_notes(client, db_session):
    """Verify cannot update draft on an already approved note."""
    seed_synthetic_clinical_data(db_session)
    gen_resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={"patient_id": "SYN-PAT-001", "consultation_text": SYNTHETIC_CONSULTATION_TEXT},
    )
    note_id = gen_resp.json()["note_id"]
    soap = gen_resp.json()["soap"]

    # Approve note
    client.patch(
        f"/api/v1/clinical-notes/{note_id}/review",
        json={"reviewing_doctor": "Dr. Rao", "action": "approved"},
    )

    # Attempt to update draft on approved note -> 400 Bad Request
    patch_resp = client.patch(
        f"/api/v1/clinical-notes/{note_id}/draft",
        json={"edited_soap": soap},
    )
    assert patch_resp.status_code == 400
    assert "already been officially approved" in patch_resp.json()["detail"].lower()





