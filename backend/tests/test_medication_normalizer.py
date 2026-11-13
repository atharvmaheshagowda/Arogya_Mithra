from app.models.medication import Medication
from app.services.medication_normalizer import (
    MatchStatus,
    clean_text,
    normalize_medication,
)


def test_clean_text_normalization():
    """Verifies whitespace and case stripping."""
    assert clean_text("  Paracetamol   500MG  ") == "paracetamol 500mg"
    assert clean_text("DOLO   650") == "dolo 650"


def test_exact_generic_matching():
    """TEST 1: Verifies exact generic name matching."""
    res = normalize_medication("Paracetamol")
    assert res.match_status == MatchStatus.EXACT_MATCH
    assert res.normalized_identifier == "paracetamol"
    assert "paracetamol" in res.active_ingredients

    res_met = normalize_medication("Metformin")
    assert res_met.match_status == MatchStatus.EXACT_MATCH
    assert res_met.normalized_name == "Metformin"
    assert "metformin" in res_met.active_ingredients


def test_curated_brand_alias_matching():
    """TEST 2: Verifies matching curated brand aliases and combination formulations."""
    # Dolo 650 -> Paracetamol
    res_dolo = normalize_medication("Dolo 650")
    assert res_dolo.match_status == MatchStatus.ALIAS_MATCH
    assert res_dolo.normalized_identifier == "paracetamol"
    assert "paracetamol" in res_dolo.active_ingredients

    # Crocin -> Paracetamol
    res_crocin = normalize_medication("Crocin")
    assert res_crocin.match_status == MatchStatus.ALIAS_MATCH
    assert res_crocin.normalized_identifier == "paracetamol"

    # Augmentin -> Amoxicillin + Clavulanic acid
    res_aug = normalize_medication("Augmentin")
    assert res_aug.match_status == MatchStatus.ALIAS_MATCH
    assert "amoxicillin" in res_aug.active_ingredients
    assert "clavulanic_acid" in res_aug.active_ingredients

    # Ecosprin -> Aspirin
    res_eco = normalize_medication("Ecosprin")
    assert res_eco.match_status == MatchStatus.ALIAS_MATCH
    assert "aspirin" in res_eco.active_ingredients


def test_unknown_medication_unresolved():
    """TEST 3: Verifies that unknown medication returns UNRESOLVED with zero guessed ingredients."""
    res = normalize_medication("CompletelyUnknownMoleculeXYZ")
    assert res.match_status == MatchStatus.UNRESOLVED
    assert res.normalized_name is None
    assert res.normalized_identifier is None
    assert len(res.active_ingredients) == 0


def test_ambiguous_medication_handling():
    """TEST 4: Verifies that ambiguous or non-specific formulations return AMBIGUOUS."""
    res_comb = normalize_medication("Combiflam")
    assert res_comb.match_status == MatchStatus.AMBIGUOUS

    res_pain = normalize_medication("Painkiller")
    assert res_pain.match_status == MatchStatus.AMBIGUOUS


def test_catalogue_database_matching(db_session):
    """Verifies that items registered in the database catalogue are accurately resolved."""
    med = Medication(
        medication_id="MED-TELMISARTAN-40",
        generic_name="Telmisartan",
        brand_name="Telma 40",
        active_ingredients=["telmisartan"],
        normalized_identifier="telmisartan",
        is_active=True,
    )
    db_session.add(med)
    db_session.commit()

    # Exact generic match via DB
    res_db_exact = normalize_medication("Telmisartan", db=db_session)
    assert res_db_exact.match_status == MatchStatus.EXACT_MATCH
    assert res_db_exact.normalized_identifier == "telmisartan"
    assert "telmisartan" in res_db_exact.active_ingredients

    # Brand match via DB
    res_db_brand = normalize_medication("Telma 40", db=db_session)
    assert res_db_brand.match_status == MatchStatus.ALIAS_MATCH
    assert res_db_brand.normalized_identifier == "telmisartan"

