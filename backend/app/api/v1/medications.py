import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.database.session import get_db
from app.models.medication import Medication
from app.models.patient import Patient
from app.models.patient_medication import PatientMedication
from app.schemas.medication import MedicationCreate, MedicationResponse
from app.schemas.medication_safety import (
    DirectInteractionCheckRequest,
    DirectInteractionCheckResponse,
    SafetyCheckRequest,
    SafetyCheckResponse,
)
from app.schemas.patient_medication import (
    PatientMedicationCreate,
    PatientMedicationResponse,
)
from app.services.medication_normalizer import (
    MatchStatus,
    clean_text,
    normalize_medication,
)
from app.services.medication_safety import evaluate_medication_safety

router = APIRouter(tags=["Medications & Clinical Safety"])


# =============================================================================
# Medication Catalogue Endpoints
# =============================================================================


@router.post(
    "/medications",
    response_model=MedicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a medication catalogue item",
    description="Registers an official or brand medication item with normalized active ingredients.",
)
def create_medication_catalogue_item(
    med_in: MedicationCreate,
    db: Session = Depends(get_db),
):
    normalized_id = med_in.normalized_identifier or clean_text(med_in.generic_name).replace(" ", "_")
    medication_id = med_in.medication_id or f"MED-{normalized_id.upper()}-{uuid.uuid4().hex[:4].upper()}"

    # Check for existing medication_id
    existing = db.execute(
        select(Medication).where(Medication.medication_id == medication_id)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Medication with ID '{medication_id}' already exists.",
        )

    # Normalize active ingredients list (clean whitespace & lowercase)
    cleaned_ingredients = [clean_text(i) for i in med_in.active_ingredients if i.strip()]
    if not cleaned_ingredients:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one valid active ingredient is required.",
        )

    med = Medication(
        medication_id=medication_id,
        generic_name=med_in.generic_name.strip(),
        brand_name=med_in.brand_name.strip() if med_in.brand_name else None,
        active_ingredients=cleaned_ingredients,
        strength=med_in.strength,
        dosage_form=med_in.dosage_form,
        normalized_identifier=normalized_id,
        is_active=med_in.is_active,
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


@router.get(
    "/medications",
    response_model=list[MedicationResponse],
    summary="List medication catalogue items",
    description="Lists registered medications with pagination.",
)
def list_medications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Medication)
        .where(Medication.is_active == True)  # noqa: E712
        .order_by(Medication.generic_name.asc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


# =============================================================================
# Patient Medication Therapy Endpoints
# =============================================================================


def _get_patient_or_404(
    db: Session, patient_id: str, check_active: bool = True
) -> Patient:
    patient = db.execute(
        select(Patient)
        .where(Patient.patient_id == patient_id)
        .options(
            selectinload(Patient.allergies),
            selectinload(Patient.medications).selectinload(PatientMedication.medication),
        )
    ).scalar_one_or_none()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{patient_id}' not found.",
        )
    if check_active and not patient.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Patient '{patient_id}' is deactivated. Clinical operations cannot be performed on inactive patient records.",
        )
    return patient


@router.post(
    "/patients/{patient_id}/medications",
    response_model=PatientMedicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a medication for a patient",
    description="Records an active, historical, or discontinued medication therapy for a patient.",
)
def record_patient_medication(
    patient_id: str,
    record_in: PatientMedicationCreate,
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, patient_id)

    # 1. Resolve medication from database catalogue
    med = db.execute(
        select(Medication).where(
            or_(
                Medication.medication_id == record_in.medication_id,
                Medication.normalized_identifier == clean_text(record_in.medication_id),
                Medication.generic_name.ilike(record_in.medication_id.strip()),
                Medication.brand_name.ilike(record_in.medication_id.strip()),
            )
        )
    ).scalar_one_or_none()

    # 2. If not yet in DB catalogue, try to auto-seed from curated normalizer aliases
    if not med:
        norm = normalize_medication(record_in.medication_id, db=db)
        if norm.match_status in (MatchStatus.EXACT_MATCH, MatchStatus.ALIAS_MATCH):
            norm_id = norm.normalized_identifier or clean_text(record_in.medication_id)
            med = Medication(
                medication_id=f"MED-{norm_id.upper()}",
                generic_name=norm.normalized_name or record_in.medication_id,
                brand_name=record_in.medication_id if norm.match_status == MatchStatus.ALIAS_MATCH else None,
                active_ingredients=norm.active_ingredients,
                normalized_identifier=norm_id,
                is_active=True,
            )
            db.add(med)
            db.flush()
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Medication '{record_in.medication_id}' is unrecognized and not in the approved catalogue.",
            )

    # 3. Prevent accidental duplicate active prescriptions for the same medication
    if record_in.status.value == "active":
        existing_active = db.execute(
            select(PatientMedication).where(
                PatientMedication.patient_id == patient.id,
                PatientMedication.medication_id == med.id,
                PatientMedication.status == "active",
            )
        ).scalar_one_or_none()
        if existing_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Patient '{patient_id}' already has an active prescription for '{med.generic_name}' "
                    f"(Medication ID: '{med.medication_id}', Record ID: {existing_active.id}). "
                    "Discontinue the existing prescription or record a different formulation before prescribing."
                ),
            )

    patient_med = PatientMedication(
        patient_id=patient.id,
        medication_id=med.id,
        status=record_in.status.value,
        prescribed_date=record_in.prescribed_date or datetime.now(),
        discontinued_date=record_in.discontinued_date,
        source=record_in.source,
        is_synthetic=record_in.is_synthetic,
    )
    db.add(patient_med)
    db.commit()
    db.refresh(patient_med)
    return patient_med


@router.get(
    "/patients/{patient_id}/medications",
    response_model=list[PatientMedicationResponse],
    summary="Retrieve patient's medication list",
    description="Retrieves all recorded medications for a patient, including active, historical, and discontinued.",
)
def get_patient_medications(
    patient_id: str,
    status_filter: str | None = Query(None, description="Optional status filter: active, historical, discontinued"),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, patient_id)
    stmt = (
        select(PatientMedication)
        .where(PatientMedication.patient_id == patient.id)
        .options(selectinload(PatientMedication.medication))
        .order_by(PatientMedication.prescribed_date.desc(), PatientMedication.id.desc())
    )
    if status_filter:
        stmt = stmt.where(PatientMedication.status == status_filter.lower())
    return list(db.execute(stmt).scalars().all())


# =============================================================================
# Medication Safety Check Endpoint
# =============================================================================


@router.post(
    "/patients/{patient_id}/medication-safety-check",
    response_model=SafetyCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Run deterministic medication safety checks",
    description=(
        "Evaluates a proposed medication against documented patient allergies, "
        "active concomitant medications (DDI), and duplicate active ingredients. "
        "Operates deterministically using evidence-linked rules without LLM inference."
    ),
)
def check_patient_medication_safety(
    patient_id: str,
    check_req: SafetyCheckRequest,
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, patient_id)

    result = evaluate_medication_safety(
        patient=patient,
        proposed_medication_name=check_req.proposed_medication,
        db=db,
        explicit_identifier=check_req.explicit_identifier,
    )

    return result


@router.post(
    "/medications/interaction-check",
    response_model=DirectInteractionCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate direct drug-drug interaction between two medications",
    description="Deterministically checks two medications against the curated DDI rules catalogue.",
)
def check_direct_medication_interaction(
    req: DirectInteractionCheckRequest,
    db: Session = Depends(get_db),
):
    from app.services.medication_safety import (
        extract_proposed_medications,
        load_rules_catalogue,
    )

    cands_a = extract_proposed_medications([req.drug_a], db=db)
    cand_a = cands_a[0] if cands_a else req.drug_a
    norm_a = normalize_medication(cand_a, db=db)
    if norm_a.match_status not in (MatchStatus.EXACT_MATCH, MatchStatus.ALIAS_MATCH):
        norm_a = normalize_medication(req.drug_a, db=db)

    cands_b = extract_proposed_medications([req.drug_b], db=db)
    cand_b = cands_b[0] if cands_b else req.drug_b
    norm_b = normalize_medication(cand_b, db=db)
    if norm_b.match_status not in (MatchStatus.EXACT_MATCH, MatchStatus.ALIAS_MATCH):
        norm_b = normalize_medication(req.drug_b, db=db)

    ingredients_a = [clean_text(i) for i in norm_a.active_ingredients]
    ingredients_b = [clean_text(i) for i in norm_b.active_ingredients]

    cat_result = load_rules_catalogue()
    if cat_result.is_loaded and cat_result.ddi_rules:
        for rule in cat_result.ddi_rules:
            ing_1 = clean_text(rule["ingredient_1"])
            ing_2 = clean_text(rule["ingredient_2"])

            match_forward = any(ing_1 in a for a in ingredients_a) and any(ing_2 in b for b in ingredients_b)
            match_reverse = any(ing_2 in a for a in ingredients_a) and any(ing_1 in b for b in ingredients_b)

            if match_forward or match_reverse:
                return DirectInteractionCheckResponse(
                    matched=True,
                    title=rule["explanation"],
                    severity=rule.get("severity", "High").capitalize(),
                    evidence=rule.get("source", "Standard Clinical Pharmacopoeia"),
                    drug_a_normalized=norm_a.normalized_name or req.drug_a,
                    drug_b_normalized=norm_b.normalized_name or req.drug_b,
                    interacting_ingredients=[rule["ingredient_1"], rule["ingredient_2"]],
                )

    return DirectInteractionCheckResponse(
        matched=False,
        title="No significant drug-drug interaction detected between the queried therapies in the curated formulary.",
        severity="Safe",
        evidence="Curated Indian OPD Formulary & British National Formulary (BNF 86)",
        drug_a_normalized=norm_a.normalized_name or req.drug_a,
        drug_b_normalized=norm_b.normalized_name or req.drug_b,
        interacting_ingredients=[],
    )


@router.get(
    "/medications/rules",
    summary="List all loaded medication safety rules",
    description="Returns the curated clinical contraindication and drug-drug interaction catalogue.",
)
def list_medication_rules():
    from app.services.medication_safety import load_rules_catalogue
    cat_result = load_rules_catalogue()
    ddi_rules = cat_result.catalogue.get("ddi_rules", []) if hasattr(cat_result, "catalogue") and isinstance(cat_result.catalogue, dict) else []
    allergy_rules = cat_result.catalogue.get("drug_allergy_rules", []) if hasattr(cat_result, "catalogue") and isinstance(cat_result.catalogue, dict) else []
    return {
        "status": "loaded" if cat_result.is_loaded else "unloaded",
        "total_rules": len(ddi_rules) + len(allergy_rules),
        "ddi_rules": ddi_rules,
        "allergy_rules": allergy_rules,
    }



