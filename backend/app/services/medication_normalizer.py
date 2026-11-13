import re
from dataclasses import dataclass, field
from enum import Enum
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.medication import Medication


class MatchStatus(str, Enum):
    EXACT_MATCH = "exact_match"
    ALIAS_MATCH = "alias_match"
    UNRESOLVED = "unresolved"
    AMBIGUOUS = "ambiguous"


@dataclass
class NormalizationResult:
    original_name: str
    normalized_name: str | None = None
    normalized_identifier: str | None = None
    active_ingredients: list[str] = field(default_factory=list)
    match_status: MatchStatus = MatchStatus.UNRESOLVED
    matched_medication_id: str | None = None


# Curated explicit brand/generic aliases (Indian OPD common brands & international generics)
# Strictly exact keyword mappings. No fuzzy matching or speculative ingredient guessing.
CURATED_BRAND_ALIASES: dict[str, dict] = {
    # Paracetamol / Acetaminophen
    "paracetamol": {
        "normalized_name": "Paracetamol",
        "normalized_identifier": "paracetamol",
        "active_ingredients": ["paracetamol"],
    },
    "acetaminophen": {
        "normalized_name": "Paracetamol",
        "normalized_identifier": "paracetamol",
        "active_ingredients": ["paracetamol"],
    },
    "dolo": {
        "normalized_name": "Paracetamol",
        "normalized_identifier": "paracetamol",
        "active_ingredients": ["paracetamol"],
    },
    "dolo 650": {
        "normalized_name": "Paracetamol",
        "normalized_identifier": "paracetamol",
        "active_ingredients": ["paracetamol"],
    },
    "crocin": {
        "normalized_name": "Paracetamol",
        "normalized_identifier": "paracetamol",
        "active_ingredients": ["paracetamol"],
    },
    "calpol": {
        "normalized_name": "Paracetamol",
        "normalized_identifier": "paracetamol",
        "active_ingredients": ["paracetamol"],
    },
    # Metformin
    "metformin": {
        "normalized_name": "Metformin",
        "normalized_identifier": "metformin",
        "active_ingredients": ["metformin"],
    },
    "glycomet": {
        "normalized_name": "Metformin",
        "normalized_identifier": "metformin",
        "active_ingredients": ["metformin"],
    },
    "glucophage": {
        "normalized_name": "Metformin",
        "normalized_identifier": "metformin",
        "active_ingredients": ["metformin"],
    },
    # Aspirin
    "aspirin": {
        "normalized_name": "Aspirin",
        "normalized_identifier": "aspirin",
        "active_ingredients": ["aspirin"],
    },
    "acetylsalicylic acid": {
        "normalized_name": "Aspirin",
        "normalized_identifier": "aspirin",
        "active_ingredients": ["aspirin"],
    },
    "ecosprin": {
        "normalized_name": "Aspirin",
        "normalized_identifier": "aspirin",
        "active_ingredients": ["aspirin"],
    },
    "disprin": {
        "normalized_name": "Aspirin",
        "normalized_identifier": "aspirin",
        "active_ingredients": ["aspirin"],
    },
    # Amoxicillin
    "amoxicillin": {
        "normalized_name": "Amoxicillin",
        "normalized_identifier": "amoxicillin",
        "active_ingredients": ["amoxicillin"],
    },
    "amoxil": {
        "normalized_name": "Amoxicillin",
        "normalized_identifier": "amoxicillin",
        "active_ingredients": ["amoxicillin"],
    },
    "mox": {
        "normalized_name": "Amoxicillin",
        "normalized_identifier": "amoxicillin",
        "active_ingredients": ["amoxicillin"],
    },
    # Amoxicillin + Clavulanate (Augmentin)
    "augmentin": {
        "normalized_name": "Amoxicillin and Potassium Clavulanate",
        "normalized_identifier": "amoxicillin_clavulanate",
        "active_ingredients": ["amoxicillin", "clavulanic_acid"],
    },
    "amoxicillin clavulanate": {
        "normalized_name": "Amoxicillin and Potassium Clavulanate",
        "normalized_identifier": "amoxicillin_clavulanate",
        "active_ingredients": ["amoxicillin", "clavulanic_acid"],
    },
    # Ciprofloxacin
    "ciprofloxacin": {
        "normalized_name": "Ciprofloxacin",
        "normalized_identifier": "ciprofloxacin",
        "active_ingredients": ["ciprofloxacin"],
    },
    "ciplox": {
        "normalized_name": "Ciprofloxacin",
        "normalized_identifier": "ciprofloxacin",
        "active_ingredients": ["ciprofloxacin"],
    },
    # Warfarin
    "warfarin": {
        "normalized_name": "Warfarin",
        "normalized_identifier": "warfarin",
        "active_ingredients": ["warfarin"],
    },
    "coumadin": {
        "normalized_name": "Warfarin",
        "normalized_identifier": "warfarin",
        "active_ingredients": ["warfarin"],
    },
    # Ibuprofen
    "ibuprofen": {
        "normalized_name": "Ibuprofen",
        "normalized_identifier": "ibuprofen",
        "active_ingredients": ["ibuprofen"],
    },
    "brufen": {
        "normalized_name": "Ibuprofen",
        "normalized_identifier": "ibuprofen",
        "active_ingredients": ["ibuprofen"],
    },
    "advil": {
        "normalized_name": "Ibuprofen",
        "normalized_identifier": "ibuprofen",
        "active_ingredients": ["ibuprofen"],
    },
    # Lisinopril
    "lisinopril": {
        "normalized_name": "Lisinopril",
        "normalized_identifier": "lisinopril",
        "active_ingredients": ["lisinopril"],
    },
    # Potassium chloride
    "potassium chloride": {
        "normalized_name": "Potassium Chloride",
        "normalized_identifier": "potassium_chloride",
        "active_ingredients": ["potassium"],
    },
    "potklor": {
        "normalized_name": "Potassium Chloride",
        "normalized_identifier": "potassium_chloride",
        "active_ingredients": ["potassium"],
    },
}

# Explicitly documented ambiguous names that map to multiple distinct active compositions
AMBIGUOUS_NAMES: dict[str, list[str]] = {
    "combiflam": [
        "Combiflam contains Ibuprofen + Paracetamol (combination product requiring exact formulation)"
    ],
    "cold tablet": ["Generic category without specific active ingredient identity"],
    "painkiller": ["Broad non-specific therapeutic class without identifiable molecule"],
}


def clean_text(text: str) -> str:
    """Strips leading/trailing whitespace, converts to lowercase, and normalizes internal spaces."""
    return re.sub(r"\s+", " ", text.strip().lower())


def normalize_medication(
    name: str,
    db: Session | None = None,
    explicit_identifier: str | None = None,
) -> NormalizationResult:
    """Normalizes medication name to canonical generic identity and active ingredients.

    Determinism Rules:
    1. Returns 'ambiguous' for known ambiguous combinations or multi-ingredient brand categories.
    2. Performs exact matching against database catalogue and curated brand aliases.
    3. Rejects guessing, phonetic matching, or fuzzy inferences.
    4. Returns 'unresolved' when no exact or curated alias match is found.
    """
    cleaned = clean_text(name)
    if not cleaned:
        return NormalizationResult(
            original_name=name, match_status=MatchStatus.UNRESOLVED
        )

    # 1. Check explicit ambiguity list
    if cleaned in AMBIGUOUS_NAMES:
        return NormalizationResult(
            original_name=name,
            match_status=MatchStatus.AMBIGUOUS,
        )

    # 2. Check Database Catalogue if session is provided
    if db is not None:
        query = select(Medication).where(
            or_(
                Medication.normalized_identifier == cleaned,
                Medication.generic_name.ilike(cleaned),
                Medication.brand_name.ilike(cleaned),
                Medication.medication_id == (explicit_identifier or name).strip(),
            )
        )
        med = db.execute(query).scalar_one_or_none()
        if med:
            status = (
                MatchStatus.EXACT_MATCH
                if clean_text(med.generic_name) == cleaned
                or clean_text(med.normalized_identifier) == cleaned
                else MatchStatus.ALIAS_MATCH
            )
            return NormalizationResult(
                original_name=name,
                normalized_name=med.generic_name,
                normalized_identifier=med.normalized_identifier,
                active_ingredients=med.active_ingredients,
                match_status=status,
                matched_medication_id=med.medication_id,
            )

    # 3. Check Curated Alias Table
    if cleaned in CURATED_BRAND_ALIASES:
        entry = CURATED_BRAND_ALIASES[cleaned]
        is_exact = clean_text(entry["normalized_name"]) == cleaned or entry["normalized_identifier"] == cleaned
        return NormalizationResult(
            original_name=name,
            normalized_name=entry["normalized_name"],
            normalized_identifier=entry["normalized_identifier"],
            active_ingredients=list(entry["active_ingredients"]),
            match_status=MatchStatus.EXACT_MATCH if is_exact else MatchStatus.ALIAS_MATCH,
        )

    # 4. Strip common strength suffixes (e.g. " 500mg", " 650 mg", " 500") for exact generic matching
    stripped_suffix = re.sub(r"\s+\d+(\.\d+)?\s*(mg|g|mcg|ml)?$", "", cleaned).strip()
    if stripped_suffix and stripped_suffix in CURATED_BRAND_ALIASES:
        entry = CURATED_BRAND_ALIASES[stripped_suffix]
        return NormalizationResult(
            original_name=name,
            normalized_name=entry["normalized_name"],
            normalized_identifier=entry["normalized_identifier"],
            active_ingredients=list(entry["active_ingredients"]),
            match_status=MatchStatus.ALIAS_MATCH,
        )

    # 5. No match found -> Explicit UNRESOLVED. Never guess or hallucinate.
    return NormalizationResult(
        original_name=name,
        match_status=MatchStatus.UNRESOLVED,
    )

