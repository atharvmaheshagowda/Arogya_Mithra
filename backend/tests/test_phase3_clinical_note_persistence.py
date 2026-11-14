"""Phase 3 Verification: Clinical Note Persistence, Medication Safety, Reviewer Details, and Note History.

Tests cover all 14 points:
1. Synthetic patient lookup (SYN-PAT-001) with documented Amoxicillin allergy.
2. Draft note generation with initial proposal including Amoxicillin.
3. Verify note status is "draft".
4. Verify initial medication safety report flags critical contraindication (ALLERGY-CONF-001, severity="critical").
5. Attempting to approve note with unresolved critical contraindication must fail (HTTP 400).
6. Attempting to review/approve without reviewer name must fail (HTTP 422).
7. Save updated draft (PATCH /api/v1/clinical-notes/{id}/draft) removing Amoxicillin and retaining safe medications.
8. Verify draft update re-evaluates medication safety: contraindication warning is cleared.
9. Verify note status remains "draft".
10. Verify fresh session GET retrieve returns the edited fields and cleared safety status.
11. Perform official physician review & sign-off (PATCH /api/v1/clinical-notes/{id}/review) with reviewer name and comments.
12. Verify note status transitions to "approved", reviewed_at timestamp is populated, and reviewer metadata is persisted.
13. Patient filtering verification: GET /api/v1/clinical-notes?patient_id=SYN-PAT-001 returns the note.
14. Patient filtering exclusion: GET /api/v1/clinical-notes?patient_id=SYN-PAT-999 does not return SYN-PAT-001's note.
"""

from datetime import datetime
import pytest
from fastapi import status
from sqlalchemy import select

from app.models.clinical_note import ClinicalSOAPNote
from app.services.synthetic_data import seed_synthetic_clinical_data
from tests.test_clinical_notes import _seed_catalogue_for_notes


@pytest.fixture
def seeded_clinical_db(db_session):
    """Seed synthetic clinical data (SYN-PAT-001 with documented Amoxicillin allergy) and drug catalogue."""
    seed_synthetic_clinical_data(db_session)
    _seed_catalogue_for_notes(db_session)
    return db_session


def test_phase3_clinical_note_lifecycle_and_safety_persistence(client, seeded_clinical_db):
    """Full end-to-end test covering TC-17, TC-18, TC-19, and TC-20 requirements."""
    # 1. Verify synthetic patient lookup
    pat_resp = client.get("/api/v1/patients/SYN-PAT-001")
    assert pat_resp.status_code == status.HTTP_200_OK
    pat_data = pat_resp.json()
    assert pat_data["patient_id"] == "SYN-PAT-001"
    assert any("amoxicillin" in a["substance"].lower() for a in pat_data.get("allergies", []))

    # 2. Draft note generation with proposal containing contraindicated Amoxicillin
    consultation_text = (
        "Doctor: Ramesh Kumar, good morning. What brings you in today?\n"
        "Patient: Severe cough and throat pain since 3 days.\n"
        "Doctor: Pharyngeal erythema observed on exam.\n"
        "Doctor: I will prescribe Amoxicillin 500mg capsules TDS for 5 days.\n"
        "Doctor: Rest and drink warm fluids. Review in 5 days."
    )

    gen_resp = client.post(
        "/api/v1/clinical-notes/generate",
        json={
            "patient_id": "SYN-PAT-001",
            "consultation_text": consultation_text,
            "language_code": "en",
        },
    )
    assert gen_resp.status_code == status.HTTP_201_CREATED
    gen_data = gen_resp.json()
    note_id = gen_data["id"]

    # 3. Verify note status is "draft"
    assert gen_data["status"] == "draft"
    assert gen_data["is_ai_generated"] is True
    assert "AI-GENERATED CLINICAL DRAFT" in gen_data["disclaimer"]

    # 4. Verify initial medication safety report flags critical contraindication
    safety = gen_data.get("medication_safety")
    assert safety is not None
    assert safety["has_warnings"] is True
    assert any(w["rule_id"] == "ALLERGY-CONF-001" for w in safety.get("warnings", []))
    assert any(w.get("severity") == "critical" for w in safety.get("warnings", []))
    assert any("amoxicillin" in w["affected_medication"].lower() for w in safety.get("warnings", []))

    # 5. Attempting to approve note with unresolved critical contraindication must fail (HTTP 400)
    approve_fail_resp = client.patch(
        f"/api/v1/clinical-notes/{note_id}/review",
        json={
            "reviewing_doctor": "Dr. Harshitha (Demonstration Reviewer)",
            "action": "approved",
            "doctor_comments": "Attempting sign-off without addressing allergy.",
        },
    )
    assert approve_fail_resp.status_code == status.HTTP_400_BAD_REQUEST
    detail = approve_fail_resp.json()["detail"].lower()
    assert "critical" in detail and "contraindication" in detail

    # 6. Attempting to review/approve without reviewer name must fail (HTTP 422)
    blank_doctor_resp = client.patch(
        f"/api/v1/clinical-notes/{note_id}/review",
        json={
            "reviewing_doctor": "   ",
            "action": "approved",
            "doctor_comments": "Missing name",
        },
    )
    assert blank_doctor_resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # 7. Save updated draft (PATCH /api/v1/clinical-notes/{id}/draft) removing Amoxicillin
    edited_soap = gen_data["soap"]
    # Remove Amoxicillin from proposed_medications without prescribing replacements
    edited_soap["plan"]["proposed_medications"] = []
    edited_soap["plan"]["patient_instructions"] = [
        "Hydration and steam inhalation twice daily",
        "Discontinued proposed amoxicillin due to documented hypersensitivity",
    ]

    draft_update_resp = client.patch(
        f"/api/v1/clinical-notes/{note_id}/draft",
        json={
            "edited_soap": edited_soap,
            "doctor_comments": "Removed contraindicated amoxicillin.",
        },
    )
    assert draft_update_resp.status_code == status.HTTP_200_OK
    draft_data = draft_update_resp.json()

    # 8. Verify draft update re-evaluates medication safety: contraindication warning is cleared
    updated_safety = draft_data.get("medication_safety")
    if updated_safety:
        assert updated_safety.get("has_warnings") is False
        assert not any(w["rule_id"] == "ALLERGY-CONF-001" for w in updated_safety.get("warnings", []))
    else:
        assert updated_safety is None  # None indicates zero proposed meds, thus no active warnings

    # 9. Verify note status remains "draft"
    assert draft_data["status"] == "draft"
    assert draft_data["doctor_comments"] == "Removed contraindicated amoxicillin."

    # 10. Verify fresh session GET retrieve returns the edited fields and cleared safety status
    get_resp = client.get(f"/api/v1/clinical-notes/{note_id}")
    assert get_resp.status_code == status.HTTP_200_OK
    persisted_data = get_resp.json()
    assert persisted_data["status"] == "draft"
    persisted_active_soap = persisted_data.get("edited_soap") or persisted_data["soap"]
    assert persisted_active_soap["plan"]["proposed_medications"] == []
    fresh_safety = persisted_data.get("medication_safety")
    if fresh_safety:
        assert fresh_safety.get("has_warnings") is False
        assert not any(w["rule_id"] == "ALLERGY-CONF-001" for w in fresh_safety.get("warnings", []))

    # 11. Perform official physician review & sign-off (PATCH /api/v1/clinical-notes/{id}/review)
    review_resp = client.patch(
        f"/api/v1/clinical-notes/{note_id}/review",
        json={
            "reviewing_doctor": "Dr. Harshitha (Demonstration Reviewer)",
            "action": "approved",
            "edited_soap": persisted_active_soap,
            "doctor_comments": "Approved after removing contraindicated amoxicillin.",
        },
    )
    assert review_resp.status_code == status.HTTP_200_OK
    reviewed_data = review_resp.json()

    # 12. Verify note status transitions to "approved", reviewed_at is populated, reviewer metadata persisted
    assert reviewed_data["status"] == "approved"
    assert reviewed_data["reviewing_doctor"] == "Dr. Harshitha (Demonstration Reviewer)"
    assert reviewed_data["reviewed_at"] is not None
    assert reviewed_data["doctor_comments"] == "Approved after removing contraindicated amoxicillin."

    # 13. Patient filtering verification: GET /api/v1/clinical-notes?patient_id=SYN-PAT-001 returns the note
    filter_resp = client.get("/api/v1/clinical-notes?patient_id=SYN-PAT-001")
    assert filter_resp.status_code == status.HTTP_200_OK
    notes_list = filter_resp.json()
    assert any(n["id"] == note_id for n in notes_list)

    # 14. Patient filtering exclusion: GET /api/v1/clinical-notes?patient_id=SYN-PAT-999 does not return the note
    other_resp = client.get("/api/v1/clinical-notes?patient_id=SYN-PAT-999")
    assert other_resp.status_code == status.HTTP_200_OK
    assert not any(n["id"] == note_id for n in other_resp.json())
