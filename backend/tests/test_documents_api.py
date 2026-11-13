import io
import pytest
from fastapi import status


def test_upload_clinical_document_pdf_success(client):
    """Verify uploading a medical report PDF returns 201 Created with structured biomarker extraction."""
    dummy_pdf_content = b"%PDF-1.4 Mock Clinical Diagnostic Report Content for Testing"
    file_payload = {
        "file": ("apollo_biochemistry_panel.pdf", io.BytesIO(dummy_pdf_content), "application/pdf")
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
    assert data["ocr_confidence"] >= 95.0
    assert len(data["extracted_biomarkers"]) >= 4
    # Check BUN and Creatinine biomarkers present
    names = [b["test_name"] for b in data["extracted_biomarkers"]]
    assert any("BUN" in n for n in names)
    assert any("Creatinine" in n for n in names)


def test_upload_clinical_document_prescription_image_success(client):
    """Verify uploading a prescription scan returns prescription items."""
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
    assert any("Azithromycin" in b["test_name"] for b in data["extracted_biomarkers"])


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
    # 11 MB dummy content (using a seekable generator or oversized bytes)
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


def test_list_clinical_documents(client):
    """Verify querying uploaded documents list."""
    dummy_pdf = b"%PDF-1.4 Test"
    client.post(
        "/api/v1/documents/upload",
        files={"file": ("list_test.pdf", io.BytesIO(dummy_pdf), "application/pdf")},
        data={"patient_id": "PAT-LIST-01"},
    )

    response = client.get("/api/v1/documents?patient_id=PAT-LIST-01")
    assert response.status_code == status.HTTP_200_OK
    items = response.json()
    assert len(items) >= 1
    assert any(doc["original_filename"] == "list_test.pdf" for doc in items)

