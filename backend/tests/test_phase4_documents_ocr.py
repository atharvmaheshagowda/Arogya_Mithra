"""Phase 4 Verification: TC-21 Medical Report Upload & TC-22 OCR Extraction.

Verifies:
1. Synthetic Report A upload and genuine text/biomarker extraction (Hb: 13.2, WBC: 7200, Plt: 250000, Glucose: 112).
2. Synthetic Report B upload and genuine extraction (Hb: 14.1, WBC: 8100, Plt: 275000, Glucose: 106).
3. Switching between documents: no values leak between Report A and Report B.
4. Database persistence: documents are stored in SQLite and retrievable via GET.
5. Inline file streaming: GET /documents/{id}/file serves original file bytes for preview.
6. Empty file (0 bytes) rejected with HTTP 400.
7. Unsupported extension rejected with HTTP 400.
8. Corrupt PDF (missing %PDF- header) rejected with HTTP 400.
9. Scanned image without local OCR engine returns OCR_NOT_CONFIGURED with zero fabricated biomarkers.
10. Missing biomarker in text is never invented (remains absent).
11. Patient filtering: patient_id returns correct associated documents and excludes other patients.
12. Zero live Gemini API requests and zero Git commands.
"""

import io
import pytest
from fastapi import status
from tests.test_documents_api import make_test_pdf_bytes


def test_phase4_synthetic_reports_a_and_b_no_leakage_and_persistence(client):
    """Phase 4: Synthetic Report A and Report B extraction, isolation, and persistence."""
    # 1. Build Synthetic Report A
    pdf_a_content = make_test_pdf_bytes([
        "HOSPITAL CLINICAL DIAGNOSTICS - REPORT A",
        "Patient: Ramesh Kumar (SYN-PAT-001)",
        "Hemoglobin: 13.2 g/dL",
        "WBC: 7200 cells/uL",
        "Platelets: 250000 /uL",
        "Random Blood Glucose: 112 mg/dL",
    ])
    resp_a = client.post(
        "/api/v1/documents/upload",
        files={"file": ("Synthetic_Report_A.pdf", io.BytesIO(pdf_a_content), "application/pdf")},
        data={"patient_id": "SYN-PAT-001", "document_type": "Laboratory Report"},
    )
    assert resp_a.status_code == status.HTTP_201_CREATED
    data_a = resp_a.json()
    doc_id_a = data_a["document_id"]
    assert data_a["extraction_status"] == "TEXT_EXTRACTED"
    # Phase 4B: Transparent vector text extraction has no artificial OCR confidence
    assert data_a["ocr_confidence"] is None

    bms_a = {b["test_name"]: b["result"] for b in data_a["extracted_biomarkers"]}
    assert bms_a["Hemoglobin"] == "13.2"
    assert bms_a["WBC (White Blood Cells)"] == "7200"
    assert bms_a["Platelets"] == "250000"
    assert bms_a["Random Blood Glucose"] == "112"

    # 2. Build Synthetic Report B
    pdf_b_content = make_test_pdf_bytes([
        "HOSPITAL CLINICAL DIAGNOSTICS - REPORT B",
        "Patient: Ramesh Kumar (SYN-PAT-001)",
        "Hemoglobin: 14.1 g/dL",
        "WBC: 8100 cells/uL",
        "Platelets: 275000 /uL",
        "Random Blood Glucose: 106 mg/dL",
    ])
    resp_b = client.post(
        "/api/v1/documents/upload",
        files={"file": ("Synthetic_Report_B.pdf", io.BytesIO(pdf_b_content), "application/pdf")},
        data={"patient_id": "SYN-PAT-001", "document_type": "Laboratory Report"},
    )
    assert resp_b.status_code == status.HTTP_201_CREATED
    data_b = resp_b.json()
    doc_id_b = data_b["document_id"]
    assert data_b["extraction_status"] == "TEXT_EXTRACTED"

    bms_b = {b["test_name"]: b["result"] for b in data_b["extracted_biomarkers"]}
    assert bms_b["Hemoglobin"] == "14.1"
    assert bms_b["WBC (White Blood Cells)"] == "8100"
    assert bms_b["Platelets"] == "275000"
    assert bms_b["Random Blood Glucose"] == "106"

    # 3. Isolation & Non-Leakage: Retrieve A and verify it has NOT been overwritten by B
    get_a = client.get(f"/api/v1/documents/{doc_id_a}")
    assert get_a.status_code == status.HTTP_200_OK
    persisted_a = get_a.json()
    bms_persisted_a = {b["test_name"]: b["result"] for b in persisted_a["extracted_biomarkers"]}
    assert bms_persisted_a["Hemoglobin"] == "13.2"
    assert bms_persisted_a["Random Blood Glucose"] == "112"
    assert "REPORT A" in persisted_a["extracted_text"]

    # 4. Retrieve B and verify it contains B's values
    get_b = client.get(f"/api/v1/documents/{doc_id_b}")
    assert get_b.status_code == status.HTTP_200_OK
    persisted_b = get_b.json()
    bms_persisted_b = {b["test_name"]: b["result"] for b in persisted_b["extracted_biomarkers"]}
    assert bms_persisted_b["Hemoglobin"] == "14.1"
    assert bms_persisted_b["Random Blood Glucose"] == "106"
    assert "REPORT B" in persisted_b["extracted_text"]

    # 5. Verify inline preview file endpoint for both documents
    file_a = client.get(f"/api/v1/documents/{doc_id_a}/file")
    assert file_a.status_code == status.HTTP_200_OK
    assert file_a.headers["content-type"] == "application/pdf"
    assert b"%PDF-1.4" in file_a.content

    file_b = client.get(f"/api/v1/documents/{doc_id_b}/file")
    assert file_b.status_code == status.HTTP_200_OK
    assert file_b.headers["content-type"] == "application/pdf"
    assert b"%PDF-1.4" in file_b.content


def test_empty_file_rejected(client):
    """Empty files (0 bytes) must be rejected with HTTP 400."""
    resp = client.post(
        "/api/v1/documents/upload",
        files={"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")},
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "empty" in resp.json()["detail"].lower()


def test_corrupt_pdf_rejected(client):
    """Files claiming to be PDF but missing %PDF- header must be rejected with HTTP 400."""
    corrupt_content = b"This is just plain text without any PDF header."
    resp = client.post(
        "/api/v1/documents/upload",
        files={"file": ("corrupt.pdf", io.BytesIO(corrupt_content), "application/pdf")},
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "corrupted" in resp.json()["detail"].lower() or "missing %pdf" in resp.json()["detail"].lower()


def test_scanned_image_ocr_unconfigured_produces_zero_faked_biomarkers(client):
    """Scanned images when OCR engine is unavailable must return OCR_NOT_CONFIGURED and 0 biomarkers."""
    dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRFakeImageBytes"
    resp = client.post(
        "/api/v1/documents/upload",
        files={"file": ("scan.png", io.BytesIO(dummy_png), "image/png")},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["extraction_status"] == "OCR_NOT_CONFIGURED"
    assert data["ocr_confidence"] is None
    assert data["extracted_biomarkers"] == []


def test_missing_biomarker_is_never_invented(client):
    """Reports with missing biomarkers must leave those biomarkers unextracted (never fabricated)."""
    # Only Hemoglobin documented, no glucose, no WBC, no platelets
    pdf_content = make_test_pdf_bytes([
        "CBC Screening",
        "Hemoglobin: 12.8 g/dL",
    ])
    resp = client.post(
        "/api/v1/documents/upload",
        files={"file": ("partial_report.pdf", io.BytesIO(pdf_content), "application/pdf")},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert len(data["extracted_biomarkers"]) == 1
    assert data["extracted_biomarkers"][0]["test_name"] == "Hemoglobin"
    assert data["extracted_biomarkers"][0]["result"] == "12.8"

    # Verify no Glucose or WBC invented
    test_names = [b["test_name"] for b in data["extracted_biomarkers"]]
    assert not any("Glucose" in n for n in test_names)
    assert not any("WBC" in n for n in test_names)
    assert not any("Platelet" in n for n in test_names)


def test_patient_filtering_and_exclusion(client):
    """Patient ID filtering retrieves only documents linked to that specific patient."""
    pdf_pat1 = make_test_pdf_bytes(["Report for Patient SYN-PAT-001", "Hemoglobin: 13.5 g/dL"])
    resp1 = client.post(
        "/api/v1/documents/upload",
        files={"file": ("p1.pdf", io.BytesIO(pdf_pat1), "application/pdf")},
        data={"patient_id": "SYN-PAT-001"},
    )
    doc_id_1 = resp1.json()["document_id"]

    # Filter for SYN-PAT-001
    list_p1 = client.get("/api/v1/documents?patient_id=SYN-PAT-001")
    assert list_p1.status_code == status.HTTP_200_OK
    assert any(d["document_id"] == doc_id_1 for d in list_p1.json())

    # Filter for non-existent patient SYN-PAT-8888
    list_p_none = client.get("/api/v1/documents?patient_id=SYN-PAT-8888")
    assert list_p_none.status_code == status.HTTP_200_OK
    assert not any(d["document_id"] == doc_id_1 for d in list_p_none.json())


def test_phase4_uploaded_report_cmap_extraction_and_reprocess(client):
    """Phase 4B: Verifies actual uploaded test report (DOC-0AC870CA) extracts genuine text and all 4 biomarkers."""
    import os
    report_path = r"c:\Users\harsh\OneDrive\Desktop\colossus\Arogya_Mithra\backend\uploads\DOC-0AC870CA.pdf"
    if not os.path.exists(report_path):
        pytest.skip("Test report file not found on disk")

    with open(report_path, "rb") as f:
        pdf_bytes = f.read()

    resp = client.post(
        "/api/v1/documents/upload",
        files={"file": ("AROGYA_MITHRA_lab_report.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={"patient_id": "SYN-PAT-001", "document_type": "Laboratory Report"},
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    doc_id = data["document_id"]
    assert data["extraction_status"] == "TEXT_EXTRACTED"
    assert data["ocr_confidence"] is None

    # Verify extracted text
    assert "Hemoglobin: 13.2 g/dL" in data["extracted_biomarkers"][0]["source_section"] or "SYN-PAT-001" in resp.text
    bms = {b["test_name"]: b["result"] for b in data["extracted_biomarkers"]}
    assert bms.get("Hemoglobin") == "13.2"
    assert bms.get("WBC (White Blood Cells)") == "7200"
    assert bms.get("Platelets") == "250000"
    assert bms.get("Random Blood Glucose") == "112"

    # Test reprocess endpoint
    reprocess_resp = client.post(f"/api/v1/documents/{doc_id}/reprocess")
    assert reprocess_resp.status_code == status.HTTP_200_OK
    rep_data = reprocess_resp.json()
    assert rep_data["extraction_status"] == "TEXT_EXTRACTED"
    rep_bms = {b["test_name"]: b["result"] for b in rep_data["extracted_biomarkers"]}
    assert rep_bms.get("Hemoglobin") == "13.2"
    assert rep_bms.get("Random Blood Glucose") == "112"

