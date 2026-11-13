import json
import logging
import os
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any
from sqlalchemy.orm import Session

from app.models.medication import Medication
from app.models.patient import Patient
from app.models.patient_medication import PatientMedication
from app.services.medication_normalizer import (
    MatchStatus,
    NormalizationResult,
    clean_text,
    normalize_medication,
)

logger = logging.getLogger("arogya_mithra.medication_safety")


class SafetyStatus(str, Enum):
    SAFE = "SAFE"
    WARNING = "WARNING"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    UNABLE_TO_VERIFY = "UNABLE_TO_VERIFY"


@dataclass
class SafetyFinding:
    rule_id: str
    category: str
    severity: str
    affected_medication: str
    explanation: str
    evidence: str
    review_required: bool = True


@dataclass
class SafetyCheckResult:
    patient_id: str
    proposed_medication: str
    normalized_identifier: str | None
    normalized_name: str | None
    active_ingredients: list[str]
    match_status: str
    overall_status: SafetyStatus
    findings: list[SafetyFinding] = field(default_factory=list)
    checks_performed: list[str] = field(default_factory=list)
    unresolved_information: list[str] = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    disclaimer: str = (
        "Deterministic safety screening is limited to configured rules and active records in Arogya Mithra. "
        "A SAFE result indicates no detected conflict within the supported rule catalogue and does NOT "
        "guarantee absolute medication safety, complete lack of adverse effects, or replace physician clinical judgment."
    )


# =============================================================================
# Catalogue Specification & Validation Contract
# =============================================================================

# Core mandatory baseline DDI rules required by Arogya Mithra application contract
MANDATORY_BASELINE_DDI_RULE_IDS: set[str] = {
    "DDI-001",  # Warfarin + Aspirin (Major Hemorrhage)
    "DDI-002",  # Warfarin + Ibuprofen (GI Bleed / Mucosal Ulceration)
    "DDI-003",  # Lisinopril + Potassium (Severe Hyperkalemia)
}

REQUIRED_DDI_RULE_FIELDS: set[str] = {
    "rule_id",
    "ingredient_1",
    "ingredient_2",
    "severity",
    "category",
    "explanation",
    "source",
}

REQUIRED_ALLERGY_MAPPING_FIELDS: set[str] = {
    "allergen_keyword",
    "conflicting_ingredients",
    "evidence_source",
}


def validate_catalogue_contract(data: Any) -> tuple[bool, str | None]:
    """Validates that loaded catalogue data adheres strictly to the application contract.

    Contract requirements:
    1. Root must be a dictionary with 'catalogue_metadata', 'allergy_ingredient_mappings',
       and 'drug_drug_interactions'.
    2. 'catalogue_metadata' must contain a 'version' string.
    3. 'allergy_ingredient_mappings' must be a non-empty list of well-structured mappings.
    4. 'drug_drug_interactions' must be a non-empty list of valid DDI rules.
    5. Baseline mandatory DDI rules (MANDATORY_BASELINE_DDI_RULE_IDS) must all be present.
    """
    if not isinstance(data, dict):
        return False, "Medication safety rule catalogue root format is invalid (expected JSON object)."

    # 1. Section presence
    for section in ("catalogue_metadata", "allergy_ingredient_mappings", "drug_drug_interactions"):
        if section not in data:
            return False, f"Mandatory catalogue section '{section}' is missing."

    # 2. Metadata check
    metadata = data["catalogue_metadata"]
    if not isinstance(metadata, dict) or not metadata.get("version"):
        return False, "Catalogue metadata must be an object containing a non-empty 'version'."

    # 3. Allergy mappings check
    allergy_mappings = data["allergy_ingredient_mappings"]
    if not isinstance(allergy_mappings, list):
        return False, "Catalogue section 'allergy_ingredient_mappings' must be a list."
    if len(allergy_mappings) == 0:
        return False, "Catalogue section 'allergy_ingredient_mappings' is empty. Safety screening requires configured allergy mappings."

    for idx, mapping in enumerate(allergy_mappings):
        if not isinstance(mapping, dict):
            return False, f"Allergy mapping at index {idx} must be an object."
        for req_field in REQUIRED_ALLERGY_MAPPING_FIELDS:
            if req_field not in mapping or not mapping[req_field]:
                return False, f"Allergy mapping at index {idx} is missing required field '{req_field}'."
        if not isinstance(mapping["conflicting_ingredients"], list) or len(mapping["conflicting_ingredients"]) == 0:
            return False, f"Allergy mapping at index {idx} must contain a non-empty list of 'conflicting_ingredients'."

    # 4. Drug-Drug Interactions check
    ddi_rules = data["drug_drug_interactions"]
    if not isinstance(ddi_rules, list):
        return False, "Catalogue section 'drug_drug_interactions' must be a list."
    if len(ddi_rules) == 0:
        return False, "Catalogue section 'drug_drug_interactions' is empty. Active safety screening requires configured DDI rules."

    found_rule_ids: set[str] = set()
    for idx, rule in enumerate(ddi_rules):
        if not isinstance(rule, dict):
            return False, f"DDI rule at index {idx} must be an object."
        for req_field in REQUIRED_DDI_RULE_FIELDS:
            val = rule.get(req_field)
            if val is None or (isinstance(val, str) and not val.strip()):
                return False, f"DDI rule at index {idx} (ID: {rule.get('rule_id', 'unknown')}) is missing required field '{req_field}'."
        found_rule_ids.add(rule["rule_id"])

    # 5. Mandatory baseline DDI rule presence
    missing_baseline = MANDATORY_BASELINE_DDI_RULE_IDS - found_rule_ids
    if missing_baseline:
        return False, (
            f"Catalogue is incomplete: missing mandatory baseline DDI rule(s): "
            f"{', '.join(sorted(missing_baseline))}."
        )

    return True, None


@dataclass
class CatalogueLoadResult:
    is_loaded: bool
    error_message: str | None = None
    ddi_rules: list[dict] = field(default_factory=list)
    allergy_mappings: list[dict] = field(default_factory=list)


def load_rules_catalogue(rule_path_override: str | None = None) -> CatalogueLoadResult:
    """Safely loads and validates the curated deterministic rule catalogue.

    Failure to load or validate the catalogue is never silently ignored and must never produce a SAFE result.
    """
    rule_path = rule_path_override or os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "rules", "drug_interactions.json"
    )
    if not os.path.exists(rule_path):
        logger.error(f"Rule catalogue file not found at path: {rule_path}")
        return CatalogueLoadResult(
            is_loaded=False,
            error_message="Medication safety rule catalogue file is missing.",
        )

    try:
        with open(rule_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse rule catalogue JSON: {e}")
        return CatalogueLoadResult(
            is_loaded=False,
            error_message="Medication safety rule catalogue is malformed and could not be parsed.",
        )
    except Exception as e:
        logger.error(f"Unexpected error loading rule catalogue: {e}")
        return CatalogueLoadResult(
            is_loaded=False,
            error_message="Medication safety rule catalogue could not be loaded due to a system error.",
        )

    # Validate against explicit catalogue contract (separated from JSON parsing)
    is_valid, validation_error = validate_catalogue_contract(data)
    if not is_valid:
        logger.error(f"Rule catalogue validation failed: {validation_error}")
        return CatalogueLoadResult(
            is_loaded=False,
            error_message=f"Rule catalogue validation failed: {validation_error}",
        )

    return CatalogueLoadResult(
        is_loaded=True,
        ddi_rules=data["drug_drug_interactions"],
        allergy_mappings=data["allergy_ingredient_mappings"],
    )


def evaluate_medication_safety(
    patient: Patient,
    proposed_medication_name: str,
    db: Session | None = None,
    explicit_identifier: str | None = None,
    rule_path_override: str | None = None,
) -> SafetyCheckResult:
    """Executes deterministic, traceable medication safety checks for an outpatient prescription.

    Independent Checks:
    0. Rule catalogue integrity verification.
    1. Medication identification and ingredient normalization.
    2. Allergy conflict check (exact ingredient & curated mappings, avoiding loose substring false-positives).
    3. Drug-Drug Interaction (DDI) check against active patient medications.
    4. Duplicate active ingredient check.
    5. Missing information and clinical context verification.
    """
    catalogue_result = load_rules_catalogue(rule_path_override=rule_path_override)
    ddi_rules = catalogue_result.ddi_rules
    allergy_mappings = catalogue_result.allergy_mappings

    # Step 1: Normalize proposed medication
    norm: NormalizationResult = normalize_medication(
        proposed_medication_name, db=db, explicit_identifier=explicit_identifier
    )

    findings: list[SafetyFinding] = []
    checks_performed: list[str] = [
        "rule_catalogue_integrity_check",
        "medication_normalization",
        "allergy_conflict_check",
        "drug_drug_interaction_check",
        "duplicate_active_ingredient_check",
        "missing_context_verification",
    ]
    unresolved_info: list[str] = []

    # Check 0: Rule Catalogue Integrity Failure Handling
    if not catalogue_result.is_loaded:
        findings.append(
            SafetyFinding(
                rule_id="RULE-CATALOGUE-UNAVAILABLE-001",
                category="system_error",
                severity="critical",
                affected_medication=proposed_medication_name,
                explanation=(
                    f"Medication safety rule catalogue is unavailable ({catalogue_result.error_message}). "
                    "Deterministic safety screening cannot be verified. Do not proceed without independent clinical verification."
                ),
                evidence="Rule Catalogue Integrity Check: Load failed.",
                review_required=True,
            )
        )
        unresolved_info.append("Rule catalogue unavailable")
        return SafetyCheckResult(
            patient_id=patient.patient_id,
            proposed_medication=proposed_medication_name,
            normalized_identifier=norm.normalized_identifier,
            normalized_name=norm.normalized_name,
            active_ingredients=norm.active_ingredients,
            match_status=norm.match_status.value,
            overall_status=SafetyStatus.UNABLE_TO_VERIFY,
            findings=findings,
            checks_performed=checks_performed,
            unresolved_information=unresolved_info,
        )

    # Check 1: Proposed Medication Identity
    if norm.match_status == MatchStatus.UNRESOLVED:
        findings.append(
            SafetyFinding(
                rule_id="MED-UNRESOLVED-001",
                category="missing_information",
                severity="high",
                affected_medication=proposed_medication_name,
                explanation=(
                    f"Proposed medication '{proposed_medication_name}' could not be matched to any verified catalogue item. "
                    "Safety checks cannot evaluate active ingredients without verified identification."
                ),
                evidence="Medication Normalizer: Zero exact or curated alias matches.",
                review_required=True,
            )
        )
        unresolved_info.append(
            f"Unrecognized medication identity: '{proposed_medication_name}'"
        )
        return SafetyCheckResult(
            patient_id=patient.patient_id,
            proposed_medication=proposed_medication_name,
            normalized_identifier=None,
            normalized_name=None,
            active_ingredients=[],
            match_status=norm.match_status.value,
            overall_status=SafetyStatus.UNABLE_TO_VERIFY,
            findings=findings,
            checks_performed=checks_performed,
            unresolved_information=unresolved_info,
        )

    if norm.match_status == MatchStatus.AMBIGUOUS:
        findings.append(
            SafetyFinding(
                rule_id="MED-AMBIGUOUS-001",
                category="ambiguity_review",
                severity="moderate",
                affected_medication=proposed_medication_name,
                explanation=(
                    f"Proposed name '{proposed_medication_name}' refers to a broad combination product or ambiguous class. "
                    "Specify exact formulation or active chemical molecule before prescribing."
                ),
                evidence="Medication Normalizer: Known ambiguous brand/therapeutic class.",
                review_required=True,
            )
        )
        unresolved_info.append(f"Ambiguous formulation: '{proposed_medication_name}'")
        return SafetyCheckResult(
            patient_id=patient.patient_id,
            proposed_medication=proposed_medication_name,
            normalized_identifier=None,
            normalized_name=None,
            active_ingredients=[],
            match_status=norm.match_status.value,
            overall_status=SafetyStatus.REVIEW_REQUIRED,
            findings=findings,
            checks_performed=checks_performed,
            unresolved_information=unresolved_info,
        )

    proposed_ingredients = [clean_text(i) for i in norm.active_ingredients]

    # Check 2: Patient Allergy Conflict (Exact & Word-Boundary Matching)
    patient_allergies = patient.allergies or []
    if len(patient_allergies) == 0:
        findings.append(
            SafetyFinding(
                rule_id="ALLERGY-UNRECORDED-001",
                category="missing_information",
                severity="info",
                affected_medication=norm.normalized_name or proposed_medication_name,
                explanation=(
                    "Patient has no recorded allergy profile. Clinician must confirm absence of drug hypersensitivities "
                    "directly with the patient."
                ),
                evidence="Clinical Data Invariant: Absence of recorded allergy does not prove absence of clinical hypersensitivity.",
                review_required=True,
            )
        )
        unresolved_info.append("No allergy history on file")
    else:
        for allergy in patient_allergies:
            allergy_substance = clean_text(allergy.substance)
            conflicting_ingredients: list[str] = []
            source_evidence = "Direct substance-to-ingredient match"

            # 1. Direct match: Exact equality or whole-word boundary
            # Avoids loose substring matches (e.g. fragment "tin" matching "augmentin" or "in" matching "aspirin")
            for ing in proposed_ingredients:
                if ing == allergy_substance or re.search(r"\b" + re.escape(ing) + r"\b", allergy_substance):
                    conflicting_ingredients.append(ing)

            # 2. Check curated explicit mapping with word-boundary matching
            for mapping in allergy_mappings:
                keyword = mapping["allergen_keyword"]
                if keyword == allergy_substance or re.search(r"\b" + re.escape(keyword) + r"\b", allergy_substance):
                    for c_ing in mapping["conflicting_ingredients"]:
                        if c_ing in proposed_ingredients and c_ing not in conflicting_ingredients:
                            conflicting_ingredients.append(c_ing)
                            source_evidence = mapping.get("evidence_source", source_evidence)

            if conflicting_ingredients:
                if allergy.verification_status == "documented":
                    findings.append(
                        SafetyFinding(
                            rule_id="ALLERGY-CONF-001",
                            category="allergy_conflict",
                            severity="critical",
                            affected_medication=norm.normalized_name or proposed_medication_name,
                            explanation=(
                                f"Documented allergy conflict! Patient has confirmed allergy to '{allergy.substance}' "
                                f"(Reaction: {allergy.reaction or 'hypersensitivity'}). Proposed medication contains "
                                f"conflicting active ingredient(s): {', '.join(conflicting_ingredients)}."
                            ),
                            evidence=source_evidence,
                            review_required=True,
                        )
                    )
                elif allergy.verification_status == "patient_reported":
                    findings.append(
                        SafetyFinding(
                            rule_id="ALLERGY-REP-001",
                            category="allergy_conflict",
                            severity="high",
                            affected_medication=norm.normalized_name or proposed_medication_name,
                            explanation=(
                                f"Patient-reported allergy flag: Patient reported hypersensitivity to '{allergy.substance}' "
                                f"(Reaction: {allergy.reaction or 'unspecified'}). Not clinically confirmed, but review is required before administration."
                            ),
                            evidence="Patient reported history (unconfirmed by laboratory or provocation test).",
                            review_required=True,
                        )
                    )
                else:  # unverified
                    findings.append(
                        SafetyFinding(
                            rule_id="ALLERGY-UNVER-001",
                            category="allergy_conflict",
                            severity="moderate",
                            affected_medication=norm.normalized_name or proposed_medication_name,
                            explanation=(
                                f"Unverified allergy note: Incomplete record for '{allergy.substance}'. Verify clinical details before prescribing."
                            ),
                            evidence="Unverified intake record with incomplete clinical details.",
                            review_required=True,
                        )
                    )

    # Step 3: Active Medications: DDI & Duplicate Ingredient Checks
    all_medications = patient.medications or []
    # Filter strictly for ACTIVE medications: historical and discontinued are excluded from interaction conflicts
    active_meds = [m for m in all_medications if m.status == "active"]

    for pm in active_meds:
        # Resolve active medication ingredients
        active_med_ingredients: list[str] = []
        active_med_name = ""

        if pm.medication:
            active_med_name = pm.medication.generic_name
            active_med_ingredients = [clean_text(i) for i in pm.medication.active_ingredients]
        else:
            # Fallback normalizer
            med_norm = normalize_medication(str(pm.medication_id), db=db)
            if med_norm.match_status in (MatchStatus.EXACT_MATCH, MatchStatus.ALIAS_MATCH):
                active_med_name = med_norm.normalized_name or str(pm.medication_id)
                active_med_ingredients = [clean_text(i) for i in med_norm.active_ingredients]
            else:
                findings.append(
                    SafetyFinding(
                        rule_id="ACTIVE-MED-UNRESOLVED-001",
                        category="missing_information",
                        severity="moderate",
                        affected_medication=str(pm.medication_id),
                        explanation=(
                            f"Active medication record #{pm.id} (ID: {pm.medication_id}) has unverified composition. "
                            "Interaction screening for this active medication could not be completed."
                        ),
                        evidence="Patient medication record lacks normalized catalogue link.",
                        review_required=True,
                    )
                )
                unresolved_info.append(
                    f"Active medication #{pm.id} identity unverified"
                )
                continue

        # Check A: Duplicate Active Ingredients
        for p_ing in proposed_ingredients:
            if p_ing in active_med_ingredients:
                findings.append(
                    SafetyFinding(
                        rule_id="DUP-ING-001",
                        category="duplicate_ingredient",
                        severity="high",
                        affected_medication=active_med_name,
                        explanation=(
                            f"Duplicate active ingredient detected! Patient is actively taking '{active_med_name}' "
                            f"which already contains '{p_ing}'. Prescribing '{norm.normalized_name}' risks accidental duplication or overdose."
                        ),
                        evidence="Deterministic normalized active ingredient comparison.",
                        review_required=True,
                    )
                )

        # Check B: Drug-Drug Interactions (DDI)
        for rule in ddi_rules:
            r_ing1 = clean_text(rule["ingredient_1"])
            r_ing2 = clean_text(rule["ingredient_2"])

            pair_match = (
                (r_ing1 in proposed_ingredients and r_ing2 in active_med_ingredients)
                or (r_ing2 in proposed_ingredients and r_ing1 in active_med_ingredients)
            )

            if pair_match:
                demo_notice = " [DEMO/TEST ONLY RULE — NOT CLINICALLY VALIDATED]" if rule.get("is_demo_rule") else ""
                findings.append(
                    SafetyFinding(
                        rule_id=rule["rule_id"],
                        category=rule.get("category", "drug_drug_interaction"),
                        severity=rule["severity"],
                        affected_medication=active_med_name,
                        explanation=f"{rule['explanation']}{demo_notice}",
                        evidence=f"Source: {rule['source']} (ID: {rule['source_id']}) [Reviewed: {rule.get('review_date')}]",
                        review_required=True,
                    )
                )

    # Step 4: Determine Overall Status (Priority based)
    has_warning_category = any(
        f.rule_id in ("ALLERGY-CONF-001", "DUP-ING-001")
        or (f.category == "drug_drug_interaction" and f.severity in ("critical", "high", "moderate"))
        for f in findings
    )

    has_unverified_proposed = (
        norm.match_status == MatchStatus.UNRESOLVED or not catalogue_result.is_loaded
    )

    has_review_required = any(f.review_required for f in findings)

    if has_warning_category:
        overall_status = SafetyStatus.WARNING
    elif has_unverified_proposed:
        overall_status = SafetyStatus.UNABLE_TO_VERIFY
    elif has_review_required:
        overall_status = SafetyStatus.REVIEW_REQUIRED
    else:
        overall_status = SafetyStatus.SAFE

    return SafetyCheckResult(
        patient_id=patient.patient_id,
        proposed_medication=proposed_medication_name,
        normalized_identifier=norm.normalized_identifier,
        normalized_name=norm.normalized_name,
        active_ingredients=norm.active_ingredients,
        match_status=norm.match_status.value,
        overall_status=overall_status,
        findings=findings,
        checks_performed=checks_performed,
        unresolved_information=unresolved_info,
    )
