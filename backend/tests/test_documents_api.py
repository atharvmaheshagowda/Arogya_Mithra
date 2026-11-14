import io
import pytest
from fastapi import status


def make_test_pdf_bytes(text_lines: list[str]) -> bytes:
    """Constructs a valid single-page PDF binary with selectable text streams."""
    stream_content = "BT\n/F1 12 Tf\n100 700 Td\n"
    for line in text_lines:
        stream_content += f"({line}) Tj\n0 -20 Td\n"
    stream_content += "ET\n"
    stream_bytes = stream_content.encode("latin1")
    length = len(stream_bytes)
    return (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
        b"4 0 obj\n<< /Length " + str(length).encode("ascii") + b" >>\nstream\n"
        + stream_bytes +
        b"\nendstream\nendobj\n"
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n500\n%%EOF"
    )


def test_upload_clinical_document_pdf_success(client):
    """Verify uploading a medical report PDF returns 201 Created with genuine structured biomarker extraction."""
    pdf_content = make_test_pdf_bytes([
        "Patient: Ramesh Kumar (SYN-PAT-001)",
        "Blood Urea Nitrogen (BUN): 18.2 mg/dL",
        "Serum Creatinine: 1.05 mg/dL",
        "Serum Sodium (Na+): 139 mEq/L",
        "Serum Potassium (K+): 4.3 mEq/L",
    ])
    file_payload = {
        "file": ("apollo_biochemistry_panel.pdf", io.BytesIO(pdf_content), "application/pdf")
    }
    data_payload = {
        "patient_id": "SYN-PAT-001",
        "document_type": "Laboratory Report",
    }

    response = client.post(
        "/api/v1/documents/upload",
        files=file_payload,
        data=data_payload,
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["document_id"].startswith("DOC-")
    assert data["original_filename"] == "apollo_biochemistry_panel.pdf"
    assert data["patient_id"] == "SYN-PAT-001"
    assert data["extraction_status"] == "TEXT_EXTRACTED"
    # Phase 4B: Vector PDF text does not claim misleading OCR confidence
    assert data["ocr_confidence"] is None
    assert len(data["extracted_biomarkers"]) >= 4

    names = [b["test_name"] for b in data["extracted_biomarkers"]]
    assert any("BUN" in n for n in names)
    assert any("Creatinine" in n for n in names)


def test_upload_clinical_document_prescription_pdf_success(client):
    """Verify uploading a prescription PDF extracts prescription items with provenance."""
    pdf_content = make_test_pdf_bytes([
        "Doctor: Dr. Ananya Sharma, MD",
        "Prescription: Azithromycin 500mg 1 Tablet OD for 3 Days",
        "Prescription: Paracetamol 650mg 1 Tablet SOS",
    ])
    file_payload = {
        "file": ("prescription_order.pdf", io.BytesIO(pdf_content), "application/pdf")
    }
    data_payload = {
        "patient_id": "SYN-PAT-002",
        "document_type": "Prescription",
    }

    response = client.post(
        "/api/v1/documents/upload",
        files=file_payload,
        data=data_payload,
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["document_type"] == "Prescription"
    assert data["extraction_status"] == "TEXT_EXTRACTED"
    assert any("Azithromycin" in b["test_name"] for b in data["extracted_biomarkers"])


def test_upload_scanned_image_when_ocr_not_configured(client):
    """Verify uploading an image scan when local OCR engine is unconfigured returns OCR_NOT_CONFIGURED with zero faked biomarkers."""
    dummy_img = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRMockImageData"
    file_payload = {
        "file": ("prescription_scan.png", io.BytesIO(dummy_img), "image/png")
    }
    data_payload = {
        "patient_id": "SYN-PAT-002",
        "document_type": "Prescription",
    }

    response = client.post(
        "/api/v1/documents/upload",
        files=file_payload,
        data=data_payload,
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["document_type"] == "Prescription"
    assert data["extraction_status"] == "OCR_NOT_CONFIGURED"
    assert data["ocr_confidence"] is None
    assert data["extracted_biomarkers"] == []


def test_upload_unsupported_file_extension_rejected(client):
    """Verify non-medical/unsupported formats are rejected with 400 Bad Request."""
    bad_file = {
        "file": ("script.exe", io.BytesIO(b"binary"), "application/octet-stream")
    }
    response = client.post(
        "/api/v1/documents/upload",
        files=bad_file,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "unsupported file format" in response.json()["detail"].lower()


def test_upload_oversized_file_rejected(client):
    """Verify files exceeding 10MB threshold return 413 Entity Too Large."""
    oversized = b"0" * (11 * 1024 * 1024)
    file_payload = {
        "file": ("huge_mri_scan.pdf", io.BytesIO(oversized), "application/pdf")
    }
    response = client.post(
        "/api/v1/documents/upload",
        files=file_payload,
    )
    assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    assert "exceeds maximum permissible size" in response.json()["detail"].lower()


def test_list_and_retrieve_clinical_documents(client):
    """Verify querying uploaded documents list and retrieving detail and file."""
    pdf_content = make_test_pdf_bytes(["Test Report for Patient PAT-LIST-01"])
    upload_resp = client.post(
        "/api/v1/documents/upload",
        files={"file": ("list_test.pdf", io.BytesIO(pdf_content), "application/pdf")},
        data={"patient_id": "PAT-LIST-01"},
    )
    assert upload_resp.status_code == status.HTTP_201_CREATED
    doc_id = upload_resp.json()["document_id"]

    # 1. List
    list_resp = client.get("/api/v1/documents?patient_id=PAT-LIST-01")
    assert list_resp.status_code == status.HTTP_200_OK
    items = list_resp.json()
    assert len(items) >= 1
    assert any(doc["document_id"] == doc_id for doc in items)

    # 2. Get Detail
    detail_resp = client.get(f"/api/v1/documents/{doc_id}")
    assert detail_resp.status_code == status.HTTP_200_OK
    detail = detail_resp.json()
    assert detail["document_id"] == doc_id
    assert "PAT-LIST-01" in detail["extracted_text"]

    # 3. Serve File for preview
    file_resp = client.get(f"/api/v1/documents/{doc_id}/file")
    assert file_resp.status_code == status.HTTP_200_OK
    assert file_resp.headers["content-type"] == "application/pdf"
    assert b"%PDF-1.4" in file_resp.content
