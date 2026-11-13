from datetime import datetime
import pytest
from fastapi import status
from sqlalchemy import select

from app.models.clinical_note import ClinicalSOAPNote
from app.models.encounter import Encounter
from app.models.patient import Patient
from app.models.patient_medication import PatientMedication
from app.models.vital_sign import VitalSign
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
