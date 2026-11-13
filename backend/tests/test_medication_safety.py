from datetime import date, datetime
from sqlalchemy import select

from app.models.allergy import Allergy
from app.models.medication import Medication
from app.models.patient import Patient
from app.models.patient_medication import PatientMedication
from app.services.medication_safety import (
    SafetyStatus,
    evaluate_medication_safety,
    load_rules_catalogue,
    validate_catalogue_contract,
)


def _create_test_patient(db, patient_id="SAFETY-PAT-001", full_name="Safety Test Patient"):
    p = Patient(
        patient_id=patient_id,
        full_name=full_name,
        date_of_birth=date(1985, 5, 20),
        age=41,
        gender="Female",
        is_synthetic=False,
    )
    db.add(p)
    db.commit()
    return p


def _seed_catalogue(db):
    meds = [
        Medication(
            medication_id="MED-WARFARIN",
            generic_name="Warfarin",
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
            medication_id="MED-IBUPROFEN",
            generic_name="Ibuprofen",
            brand_name="Brufen",
            active_ingredients=["ibuprofen"],
            normalized_identifier="ibuprofen",
        ),
        Medication(
            medication_id="MED-AMOXICILLIN",
            generic_name="Amoxicillin",
            active_ingredients=["amoxicillin"],
            normalized_identifier="amoxicillin",
        ),
        Medication(
            medication_id="MED-AUGMENTIN",
            generic_name="Amoxicillin and Clavulanate Potassium",
            brand_name="Augmentin",
            active_ingredients=["amoxicillin", "clavulanic_acid"],
            normalized_identifier="amoxicillin_clavulanic_acid",
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


def test_missing_allergy_profile_produces_review_required(db_session):
    """TEST 8: Patient with zero allergy records produces REVIEW_REQUIRED."""
    p = _create_test_patient(db_session, "ALLERGY-MISS-01")
    _seed_catalogue(db_session)

    res = evaluate_medication_safety(p, "Paracetamol", db=db_session)
    assert res.overall_status == SafetyStatus.REVIEW_REQUIRED
    assert any(f.rule_id == "ALLERGY-UNRECORDED-001" for f in res.findings)


def test_documented_allergy_conflict_produces_warning(db_session):
    """TEST 5: Documented allergy conflict produces WARNING with critical severity."""
    p = _create_test_patient(db_session, "ALLERGY-DOC-01")
    _seed_catalogue(db_session)

    # Documented Amoxicillin allergy
    al = Allergy(
        patient_id=p.id,
        substance="Amoxicillin",
        reaction="Anaphylaxis, airway swelling",
        severity="severe",
        verification_status="documented",
    )
    db_session.add(al)
    db_session.commit()

    res = evaluate_medication_safety(p, "Augmentin", db=db_session)
    assert res.overall_status == SafetyStatus.WARNING
    conflict = next(f for f in res.findings if f.rule_id == "ALLERGY-CONF-001")
    assert conflict.severity == "critical"
    assert "amoxicillin" in conflict.explanation.lower()
    assert conflict.review_required is True


def test_patient_reported_allergy_produces_review_required(db_session):
    """TEST 6: Patient-reported allergy produces REVIEW_REQUIRED."""
    p = _create_test_patient(db_session, "ALLERGY-REP-01")
    _seed_catalogue(db_session)

    al = Allergy(
        patient_id=p.id,
        substance="Aspirin",
        reaction="Gastric upset",
        severity="mild",
        verification_status="patient_reported",
    )
    db_session.add(al)
    db_session.commit()

    res = evaluate_medication_safety(p, "Ecosprin", db=db_session)
    assert res.overall_status == SafetyStatus.REVIEW_REQUIRED
    finding = next(f for f in res.findings if f.rule_id == "ALLERGY-REP-001")
    assert finding.severity == "high"


def test_unverified_allergy_produces_review_required(db_session):
    """TEST 7: Unverified allergy produces REVIEW_REQUIRED."""
    p = _create_test_patient(db_session, "ALLERGY-UNVER-01")
    _seed_catalogue(db_session)

    al = Allergy(
        patient_id=p.id,
        substance="Ciprofloxacin",
        verification_status="unverified",
    )
    db_session.add(al)
    db_session.commit()

    res = evaluate_medication_safety(p, "Ciplox", db=db_session)
    assert res.overall_status == SafetyStatus.REVIEW_REQUIRED
    finding = next(f for f in res.findings if f.rule_id == "ALLERGY-UNVER-001")
    assert finding.severity == "moderate"


def test_supported_drug_drug_interaction_warning(db_session):
    """TEST 9: Supported DDI rule (Warfarin + Aspirin) triggers WARNING with traceable evidence."""
    p = _create_test_patient(db_session, "DDI-PAT-01")
    _seed_catalogue(db_session)

    # Patient has documented allergy to dust (so allergy profile is present)
    db_session.add(Allergy(patient_id=p.id, substance="Dust", verification_status="documented"))

    # Patient is actively prescribed Warfarin
    warfarin = db_session.execute(select(Medication).where(Medication.medication_id == "MED-WARFARIN")).scalar_one()
    pm = PatientMedication(
        patient_id=p.id,
        medication_id=warfarin.id,
        status="active",
        source="opd_prescription",
    )
    db_session.add(pm)
    db_session.commit()

    # Propose Aspirin (or Ecosprin)
    res = evaluate_medication_safety(p, "Ecosprin", db=db_session)
    assert res.overall_status == SafetyStatus.WARNING
    ddi = next(f for f in res.findings if f.rule_id == "DDI-001")
    assert ddi.severity == "high"
    assert "antithrombotic" in ddi.explanation.lower() or "hemorrhage" in ddi.explanation.lower()
    assert "FDA" in ddi.evidence


def test_no_unsupported_interaction_inference(db_session):
    """TEST 10: Ensures engine does NOT invent or infer uncatalogued interactions."""
    p = _create_test_patient(db_session, "NO-INFER-01")
    _seed_catalogue(db_session)

    db_session.add(Allergy(patient_id=p.id, substance="Peanuts", verification_status="documented"))

    # Active Metformin
    met = db_session.execute(select(Medication).where(Medication.medication_id == "MED-METFORMIN")).scalar_one()
    db_session.add(PatientMedication(patient_id=p.id, medication_id=met.id, status="active"))
    db_session.commit()

    # Propose Paracetamol (no interaction in catalogue)
    res = evaluate_medication_safety(p, "Paracetamol", db=db_session)
    assert res.overall_status == SafetyStatus.SAFE
    assert len(res.findings) == 0


def test_duplicate_active_ingredient_detection(db_session):
    """TEST 11: Detects duplicate active ingredient between Dolo 650 (active) and Paracetamol."""
    p = _create_test_patient(db_session, "DUP-PAT-01")
    _seed_catalogue(db_session)

    db_session.add(Allergy(patient_id=p.id, substance="Latex", verification_status="documented"))

    # Patient actively on Dolo 650
    pcm = db_session.execute(select(Medication).where(Medication.medication_id == "MED-PARACETAMOL")).scalar_one()
    db_session.add(PatientMedication(patient_id=p.id, medication_id=pcm.id, status="active"))
    db_session.commit()

    # Propose Calpol (also contains Paracetamol)
    res = evaluate_medication_safety(p, "Calpol", db=db_session)
    assert res.overall_status == SafetyStatus.WARNING
    dup = next(f for f in res.findings if f.rule_id == "DUP-ING-001")
    assert "duplicate active ingredient" in dup.explanation.lower()


def test_historical_and_discontinued_medications_excluded(db_session):
    """TEST 12 & 13: Historical and discontinued medications are excluded from active DDI checks."""
    p = _create_test_patient(db_session, "HIST-EXCLUDE-01")
    _seed_catalogue(db_session)

    db_session.add(Allergy(patient_id=p.id, substance="Dust", verification_status="documented"))

    warfarin = db_session.execute(select(Medication).where(Medication.medication_id == "MED-WARFARIN")).scalar_one()
    ibuprofen = db_session.execute(select(Medication).where(Medication.medication_id == "MED-IBUPROFEN")).scalar_one()

    # Warfarin was discontinued, Ibuprofen is historical
    db_session.add(PatientMedication(patient_id=p.id, medication_id=warfarin.id, status="discontinued"))
    db_session.add(PatientMedication(patient_id=p.id, medication_id=ibuprofen.id, status="historical"))
    db_session.commit()

    # Propose Aspirin: would conflict with Warfarin if active, but Warfarin is discontinued
    res = evaluate_medication_safety(p, "Aspirin", db=db_session)
    assert res.overall_status == SafetyStatus.SAFE
    assert not any(f.rule_id == "DDI-001" for f in res.findings)


def test_multiple_simultaneous_findings(db_session):
    """TEST 14: Confirms engine returns all findings when multiple conflicts occur simultaneously."""
    p = _create_test_patient(db_session, "MULTI-PAT-01")
    _seed_catalogue(db_session)

    # Documented allergy to Aspirin
    db_session.add(Allergy(patient_id=p.id, substance="Aspirin", verification_status="documented"))

    # Actively taking Warfarin AND Aspirin
    warfarin = db_session.execute(select(Medication).where(Medication.medication_id == "MED-WARFARIN")).scalar_one()
    aspirin = db_session.execute(select(Medication).where(Medication.medication_id == "MED-ASPIRIN")).scalar_one()
    db_session.add(PatientMedication(patient_id=p.id, medication_id=warfarin.id, status="active"))
    db_session.add(PatientMedication(patient_id=p.id, medication_id=aspirin.id, status="active"))
    db_session.commit()

    # Propose Ecosprin (Aspirin): triggers Allergy conflict + Duplicate ingredient + DDI with Warfarin!
    res = evaluate_medication_safety(p, "Ecosprin", db=db_session)
    assert res.overall_status == SafetyStatus.WARNING
    assert len(res.findings) >= 3
    rule_ids = {f.rule_id for f in res.findings}
    assert "ALLERGY-CONF-001" in rule_ids
    assert "DUP-ING-001" in rule_ids
    assert "DDI-001" in rule_ids


def test_unresolved_active_medication_handling(db_session):
    """TEST 15: An active patient medication with unknown identity triggers REVIEW_REQUIRED."""
    p = _create_test_patient(db_session, "UNRES-ACT-01")
    _seed_catalogue(db_session)

    db_session.add(Allergy(patient_id=p.id, substance="Latex", verification_status="documented"))

    # Add active medication pointing to non-existent medication_id
    db_session.add(PatientMedication(patient_id=p.id, medication_id=9999, status="active"))
    db_session.commit()

    res = evaluate_medication_safety(p, "Paracetamol", db=db_session)
    assert res.overall_status == SafetyStatus.REVIEW_REQUIRED
    assert any(f.rule_id == "ACTIVE-MED-UNRESOLVED-001" for f in res.findings)


def test_short_substring_allergy_false_positive_prevention(db_session):
    """AUDIT-P3-002: Verify short sub-strings do not trigger false positive allergy warnings.

    E.g., patient allergy to 'tin' must not match 'Augmentin',
    and allergy to 'in' must not match 'Aspirin'.
    """
    p = _create_test_patient(db_session, "ALLERGY-SUBSTR-01")
    _seed_catalogue(db_session)

    # Document allergy to short fragments 'tin' and 'in'
    db_session.add(Allergy(patient_id=p.id, substance="tin", verification_status="documented"))
    db_session.add(Allergy(patient_id=p.id, substance="in", verification_status="documented"))
    db_session.commit()

    # Propose Augmentin (active ingredients: amoxicillin, clavulanic_acid)
    res_aug = evaluate_medication_safety(p, "Augmentin", db=db_session)
    assert not any(f.rule_id == "ALLERGY-CONF-001" for f in res_aug.findings)
    assert not any("tin" in f.explanation.lower() for f in res_aug.findings)

    # Propose Aspirin (active ingredient: aspirin)
    res_asp = evaluate_medication_safety(p, "Aspirin", db=db_session)
    assert not any(f.rule_id == "ALLERGY-CONF-001" for f in res_asp.findings)


def test_multi_ingredient_allergy_matching(db_session):
    """AUDIT-P3-002: Verify multi-ingredient medications match patient allergy to any constituent ingredient."""
    p = _create_test_patient(db_session, "ALLERGY-MULTI-01")
    _seed_catalogue(db_session)

    # Document allergy specifically to Amoxicillin
    db_session.add(Allergy(patient_id=p.id, substance="Amoxicillin", verification_status="documented"))
    db_session.commit()

    # Propose multi-ingredient Augmentin (amoxicillin + clavulanic acid)
    res = evaluate_medication_safety(p, "Augmentin", db=db_session)
    assert res.overall_status == SafetyStatus.WARNING
    allergy_finding = next((f for f in res.findings if f.rule_id == "ALLERGY-CONF-001"), None)
    assert allergy_finding is not None
    assert allergy_finding.severity == "critical"
    assert "amoxicillin" in allergy_finding.explanation.lower()


def test_malformed_json_catalogue_handling(tmp_path, db_session):
    """AUDIT-P3-004: Malformed JSON rule catalogue must produce UNABLE_TO_VERIFY and never return SAFE."""
    p = _create_test_patient(db_session, "CATALOGUE-ERR-01")
    _seed_catalogue(db_session)

    # Patient has documented allergy so absence of allergies doesn't trigger UNRECORDED
    db_session.add(Allergy(patient_id=p.id, substance="Latex", verification_status="documented"))
    db_session.commit()

    # Create corrupted JSON file
    bad_rules_file = tmp_path / "corrupted_rules.json"
    bad_rules_file.write_text('{"drug_drug_interactions": [ { broken_json: ', encoding="utf-8")

    # 1. Test loader directly
    load_result = load_rules_catalogue(bad_rules_file)
    assert load_result.is_loaded is False
    assert load_result.error_message is not None
    assert "malformed" in load_result.error_message.lower()

    # 2. Test engine evaluation with corrupted catalogue
    res = evaluate_medication_safety(p, "Paracetamol", db=db_session, rule_path_override=bad_rules_file)
    assert res.overall_status == SafetyStatus.UNABLE_TO_VERIFY
    assert res.overall_status != SafetyStatus.SAFE
    finding = next((f for f in res.findings if f.rule_id == "RULE-CATALOGUE-UNAVAILABLE-001"), None)
    assert finding is not None
    assert finding.severity == "critical"
    assert "unavailable" in finding.explanation.lower()
    assert "malformed" in finding.explanation.lower()


def test_missing_json_catalogue_handling(tmp_path, db_session):
    """AUDIT-P3-004: Missing rule catalogue file must produce UNABLE_TO_VERIFY and never return SAFE."""
    p = _create_test_patient(db_session, "CATALOGUE-MISS-01")
    _seed_catalogue(db_session)

    db_session.add(Allergy(patient_id=p.id, substance="Latex", verification_status="documented"))
    db_session.commit()

    missing_path = tmp_path / "non_existent_rules_catalogue.json"

    # 1. Test loader directly
    load_result = load_rules_catalogue(missing_path)
    assert load_result.is_loaded is False
    assert "missing" in load_result.error_message.lower()

    # 2. Test engine evaluation with missing catalogue
    res = evaluate_medication_safety(p, "Paracetamol", db=db_session, rule_path_override=missing_path)
    assert res.overall_status == SafetyStatus.UNABLE_TO_VERIFY
    assert res.overall_status != SafetyStatus.SAFE
    assert any(f.rule_id == "RULE-CATALOGUE-UNAVAILABLE-001" for f in res.findings)


def test_empty_ddi_rules_catalogue_fails_validation_and_never_returns_safe(tmp_path, db_session):
    """Empty DDI rule list must fail contract validation and never produce SAFE."""
    import json

    p = _create_test_patient(db_session, "EMPTY-DDI-01")
    _seed_catalogue(db_session)
    db_session.add(Allergy(patient_id=p.id, substance="Latex", verification_status="documented"))
    db_session.commit()

    empty_ddi_data = {
        "catalogue_metadata": {"version": "1.0.0"},
        "allergy_ingredient_mappings": [
            {
                "allergen_keyword": "aspirin",
                "conflicting_ingredients": ["aspirin"],
                "evidence_source": "Standard Ref",
            }
        ],
        "drug_drug_interactions": [],  # Empty DDI section!
    }

    # 1. Direct contract validation check
    is_valid, err = validate_catalogue_contract(empty_ddi_data)
    assert is_valid is False
    assert "empty" in err.lower()

    # 2. Loader check
    catalogue_file = tmp_path / "empty_ddi_catalogue.json"
    catalogue_file.write_text(json.dumps(empty_ddi_data), encoding="utf-8")
    load_result = load_rules_catalogue(catalogue_file)
    assert load_result.is_loaded is False
    assert "empty" in load_result.error_message.lower()

    # 3. Engine evaluation: Must return UNABLE_TO_VERIFY, NEVER SAFE
    res = evaluate_medication_safety(p, "Paracetamol", db=db_session, rule_path_override=catalogue_file)
    assert res.overall_status == SafetyStatus.UNABLE_TO_VERIFY
    assert res.overall_status != SafetyStatus.SAFE
    finding = next((f for f in res.findings if f.rule_id == "RULE-CATALOGUE-UNAVAILABLE-001"), None)
    assert finding is not None
    assert finding.severity == "critical"


def test_missing_ddi_section_fails_validation_and_never_returns_safe(tmp_path, db_session):
    """Missing drug_drug_interactions section must fail validation and never return SAFE."""
    import json

    p = _create_test_patient(db_session, "MISS-DDI-01")
    _seed_catalogue(db_session)
    db_session.add(Allergy(patient_id=p.id, substance="Latex", verification_status="documented"))
    db_session.commit()

    missing_ddi_data = {
        "catalogue_metadata": {"version": "1.0.0"},
        "allergy_ingredient_mappings": [
            {
                "allergen_keyword": "aspirin",
                "conflicting_ingredients": ["aspirin"],
                "evidence_source": "Standard Ref",
            }
        ],
    }

    is_valid, err = validate_catalogue_contract(missing_ddi_data)
    assert is_valid is False
    assert "drug_drug_interactions" in err

    catalogue_file = tmp_path / "missing_ddi_catalogue.json"
    catalogue_file.write_text(json.dumps(missing_ddi_data), encoding="utf-8")
    load_result = load_rules_catalogue(catalogue_file)
    assert load_result.is_loaded is False

    res = evaluate_medication_safety(p, "Paracetamol", db=db_session, rule_path_override=catalogue_file)
    assert res.overall_status == SafetyStatus.UNABLE_TO_VERIFY
    assert res.overall_status != SafetyStatus.SAFE


def test_missing_allergy_mapping_section_fails_validation_and_never_returns_safe(tmp_path, db_session):
    """Missing allergy_ingredient_mappings section must fail validation and never return SAFE."""
    import json

    p = _create_test_patient(db_session, "MISS-ALLERGY-01")
    _seed_catalogue(db_session)
    db_session.add(Allergy(patient_id=p.id, substance="Latex", verification_status="documented"))
    db_session.commit()

    missing_allergy_data = {
        "catalogue_metadata": {"version": "1.0.0"},
        "drug_drug_interactions": [
            {
                "rule_id": "DDI-001",
                "ingredient_1": "warfarin",
                "ingredient_2": "aspirin",
                "severity": "high",
                "category": "drug_drug_interaction",
                "explanation": "Warfarin + Aspirin interaction",
                "source": "Standard Ref",
            }
        ],
    }

    is_valid, err = validate_catalogue_contract(missing_allergy_data)
    assert is_valid is False
    assert "allergy_ingredient_mappings" in err

    catalogue_file = tmp_path / "missing_allergy_catalogue.json"
    catalogue_file.write_text(json.dumps(missing_allergy_data), encoding="utf-8")
    load_result = load_rules_catalogue(catalogue_file)
    assert load_result.is_loaded is False

    res = evaluate_medication_safety(p, "Paracetamol", db=db_session, rule_path_override=catalogue_file)
    assert res.overall_status == SafetyStatus.UNABLE_TO_VERIFY
    assert res.overall_status != SafetyStatus.SAFE


def test_invalid_rule_structure_fails_validation(tmp_path, db_session):
    """A DDI rule missing required fields must fail contract validation."""
    import json

    p = _create_test_patient(db_session, "BAD-STRUCT-01")
    _seed_catalogue(db_session)
    db_session.add(Allergy(patient_id=p.id, substance="Latex", verification_status="documented"))
    db_session.commit()

    bad_rule_data = {
        "catalogue_metadata": {"version": "1.0.0"},
        "allergy_ingredient_mappings": [
            {
                "allergen_keyword": "aspirin",
                "conflicting_ingredients": ["aspirin"],
                "evidence_source": "Standard Ref",
            }
        ],
        "drug_drug_interactions": [
            {
                "rule_id": "DDI-001",
                # Missing 'ingredient_1'!
                "ingredient_2": "aspirin",
                "severity": "high",
                "category": "drug_drug_interaction",
                "explanation": "Incomplete rule",
                "source": "Standard Ref",
            }
        ],
    }

    is_valid, err = validate_catalogue_contract(bad_rule_data)
    assert is_valid is False
    assert "ingredient_1" in err

    catalogue_file = tmp_path / "bad_struct_catalogue.json"
    catalogue_file.write_text(json.dumps(bad_rule_data), encoding="utf-8")

    res = evaluate_medication_safety(p, "Paracetamol", db=db_session, rule_path_override=catalogue_file)
    assert res.overall_status == SafetyStatus.UNABLE_TO_VERIFY
    assert res.overall_status != SafetyStatus.SAFE


def test_missing_mandatory_baseline_ddi_rules_fails_validation(tmp_path, db_session):
    """Catalogue missing mandatory baseline rules (e.g. DDI-002, DDI-003) fails validation."""
    import json

    p = _create_test_patient(db_session, "MISS-BASELINE-01")
    _seed_catalogue(db_session)
    db_session.add(Allergy(patient_id=p.id, substance="Latex", verification_status="documented"))
    db_session.commit()

    # Contains DDI-001, but missing DDI-002 and DDI-003
    incomplete_baseline_data = {
        "catalogue_metadata": {"version": "1.0.0"},
        "allergy_ingredient_mappings": [
            {
                "allergen_keyword": "aspirin",
                "conflicting_ingredients": ["aspirin"],
                "evidence_source": "Standard Ref",
            }
        ],
        "drug_drug_interactions": [
            {
                "rule_id": "DDI-001",
                "ingredient_1": "warfarin",
                "ingredient_2": "aspirin",
                "severity": "high",
                "category": "drug_drug_interaction",
                "explanation": "Warfarin + Aspirin interaction",
                "source": "Standard Ref",
            }
        ],
    }

    is_valid, err = validate_catalogue_contract(incomplete_baseline_data)
    assert is_valid is False
    assert "missing mandatory baseline ddi rule" in err.lower()

    catalogue_file = tmp_path / "incomplete_baseline_catalogue.json"
    catalogue_file.write_text(json.dumps(incomplete_baseline_data), encoding="utf-8")

    res = evaluate_medication_safety(p, "Paracetamol", db=db_session, rule_path_override=catalogue_file)
    assert res.overall_status == SafetyStatus.UNABLE_TO_VERIFY
    assert res.overall_status != SafetyStatus.SAFE


def test_valid_populated_catalogue_passes_contract_validation():
    """Verify that the production drug_interactions.json catalogue passes all contract validation rules."""
    import os
    import json

    rule_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "app", "rules", "drug_interactions.json"
    )
    assert os.path.exists(rule_path)

    with open(rule_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    is_valid, err = validate_catalogue_contract(data)
    assert is_valid is True, f"Validation failed with error: {err}"
    assert err is None

    # Load via loader
    load_result = load_rules_catalogue(rule_path)
    assert load_result.is_loaded is True
    assert load_result.error_message is None
    assert len(load_result.ddi_rules) >= 3
    assert len(load_result.allergy_mappings) >= 5



