import re
from typing import Any, Dict, List, Optional, Tuple

from app.schemas.clinical_context import BMIMeasurement, VitalMeasurement
from app.schemas.clinical_note import (
    AssessmentSection,
    ExtractedItem,
    ObjectiveSection,
    PlanSection,
    SOAPGenerateRequest,
    SOAPPayload,
    SOAPPatientContext,
    SubjectiveSection,
)
from app.services.adapters.base import ClinicalNoteAdapter


class DeterministicMockSOAPAdapter(ClinicalNoteAdapter):
    """Deterministic, rule-based clinical SOAP note extractor.
    
    Safe, 100% offline, and predictable. Designed for OPD clinical consultations.
    Adheres strictly to safety requirements:
    1. Zero hallucination: Missing details are marked unavailable or left empty.
    2. Preserves negation: 'no / denies' statements are never placed in reported symptoms.
    3. Preserves uncertainty: 'suspected / rule out' qualifiers are strictly preserved.
    4. Separates patient statements from clinician findings.
    """

    SUPPORTED_LANGUAGES = {"en", "kn", "hi"}

    # Detection of native Indic scripts (Devanagari, Bengali, Gurmukhi, Gujarati, Oriya, Tamil, Telugu, Kannada, Malayalam)
    NATIVE_INDIC_REGEX = re.compile(r"[\u0900-\u0D7F]")

    # Common negation cues
    NEGATION_CUE_REGEX = re.compile(
        r"\b(no|denies|denied|without|negative for|free of|not having|did not have|rules? out any|no history of)\b",
        re.IGNORECASE,
    )

    # Clause boundary marking where negation ceases to apply
    CLAUSE_BOUNDARY_REGEX = re.compile(
        r"\b(but|however|although|except|yet|nevertheless|though|reports?|complains? of|complaining of|experiences?|notes?|admitted|admits|presents? with)\b|[.;!\n]",
        re.IGNORECASE,
    )

    # Delimiter for compound coordinate negation items (comma, slash, and, or, nor)
    SPLIT_COORDINATE_REGEX = re.compile(
        r"[,/]\s*(?:\b(?:and|or|nor)\b\s*)?|\s+\b(?:and|or|nor)\b\s+",
        re.IGNORECASE,
    )

    # Uncertainty cues
    UNCERTAINTY_REGEX = re.compile(
        r"\b(suspected|possible|likely|probable|rule out|differential|unconfirmed|evaluating for|consider)\b\s+([^,.;!\n]+)",
        re.IGNORECASE,
    )

    def generate_soap_note(
        self,
        request: SOAPGenerateRequest,
        context: Optional[Dict[str, Any]] = None,
    ) -> SOAPPayload:
        if request.language_code.lower() not in self.SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unsupported language code '{request.language_code}'. Supported languages: {', '.join(sorted(self.SUPPORTED_LANGUAGES))}"
            )

        text = request.consultation_text.strip()

        # Reject native Indic script consultation content in deterministic offline adapter
        if self.NATIVE_INDIC_REGEX.search(text):
            raise ValueError(
                "Native Indic script detected (e.g. Kannada / Devanagari). "
                "The deterministic offline adapter only processes English clinical terminology and Latin-script transliterations. "
                "Reliable native Indic script comprehension requires the upcoming multilingual LLM adapter (e.g. Bhashini / Gemini). "
                "Please provide English or Latin-script transcribed text."
            )

        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # Partition text by speaker if dialogue format is present
        patient_lines, doctor_lines, unassigned_lines = self._partition_dialogue(lines)

        # Extract sections
        subjective = self._extract_subjective(patient_lines, unassigned_lines, text)
        objective = self._extract_objective(doctor_lines, unassigned_lines, text, context)
        assessment = self._extract_assessment(doctor_lines, unassigned_lines, text, context)
        plan = self._extract_plan(doctor_lines, unassigned_lines, text)
        patient_context = self._build_patient_context(context)

        return SOAPPayload(
            subjective=subjective,
            objective=objective,
            assessment=assessment,
            plan=plan,
            patient_context=patient_context,
        )

    def _partition_dialogue(
        self, lines: List[str]
    ) -> Tuple[List[str], List[str], List[str]]:
        patient_lines = []
        doctor_lines = []
        unassigned_lines = []

        patient_prefix = re.compile(r"^(patient|pt|user|client)\s*[:\-]\s*", re.IGNORECASE)
        doctor_prefix = re.compile(r"^(doctor|dr\.?|clinician|physician)\s*[:\-]\s*", re.IGNORECASE)
        speaker_boundary = re.compile(
            r"(?:\n+|\b(?=(?:doctor|dr\.?|clinician|physician|patient|pt)\s*[:\-]))",
            re.IGNORECASE,
        )

        # Break lines further if speaker tags appear mid-line
        normalized_lines = []
        for line in lines:
            parts = [p.strip() for p in speaker_boundary.split(line) if p.strip()]
            normalized_lines.extend(parts if parts else [line])

        for line in normalized_lines:
            if patient_prefix.search(line):
                cleaned = patient_prefix.sub("", line).strip()
                if cleaned:
                    patient_lines.append(cleaned)
            elif doctor_prefix.search(line):
                cleaned = doctor_prefix.sub("", line).strip()
                if cleaned:
                    doctor_lines.append(cleaned)
            else:
                unassigned_lines.append(line)

        return patient_lines, doctor_lines, unassigned_lines

    def _extract_subjective(
        self,
        patient_lines: List[str],
        unassigned_lines: List[str],
        full_text: str,
    ) -> SubjectiveSection:
        # Source lines for subjective
        candidate_lines = patient_lines if patient_lines else unassigned_lines

        reported_symptoms: List[str] = []
        pertinent_negatives: List[str] = []
        evidence: List[ExtractedItem] = []

        negated_phrases = set()
        negation_spans_by_line: Dict[str, List[Tuple[int, int]]] = {}

        # 1. Bounded compound negation extraction
        for line in candidate_lines:
            negation_spans_by_line[line] = []
            for match in self.NEGATION_CUE_REGEX.finditer(line):
                cue_start = match.start()
                cue_end = match.end()

                # Find boundary where negation ceases to apply
                boundary_match = self.CLAUSE_BOUNDARY_REGEX.search(line, cue_end)
                scope_end = boundary_match.start() if boundary_match else len(line)

                # Record negation character span in the line
                negation_spans_by_line[line].append((cue_start, scope_end))

                # Extract scope text
                scope_text = line[cue_end:scope_end].strip()
                full_source_evidence = line[cue_start:scope_end].strip()

                if not scope_text:
                    continue

                # Split compound items inside the bounded scope
                raw_tokens = self.SPLIT_COORDINATE_REGEX.split(scope_text)
                for raw_tok in raw_tokens:
                    cleaned_tok = raw_tok.strip().rstrip(".,;")
                    # Strip leading stop words / negation words if repeated
                    cleaned_tok = re.sub(
                        r"^(any|a|an|the|history of|or|and|no|not)\s+",
                        "",
                        cleaned_tok,
                        flags=re.IGNORECASE,
                    ).strip()

                    if cleaned_tok and len(cleaned_tok) > 1:
                        neg_item = f"Denies {cleaned_tok}"
                        if neg_item not in pertinent_negatives:
                            pertinent_negatives.append(neg_item)
                            negated_phrases.add(cleaned_tok.lower())
                            evidence.append(
                                ExtractedItem(
                                    text=neg_item,
                                    source_evidence=full_source_evidence,
                                    is_negated=True,
                                )
                            )

        # Common clinical symptom keywords
        symptom_keywords = [
            "cough", "phlegm", "sputum", "chills", "fever", "feverish",
            "pain", "ache", "aches", "headache", "stiffness", "swelling",
            "edema", "rash", "vomiting", "nausea", "diarrhea", "fatigue",
            "tiredness", "weakness", "dizziness", "breathlessness", "dyspnea",
            "burning", "itching", "cold", "congestion", "sore throat"
        ]

        # 2. Extract positive symptoms strictly outside negation spans
        for line in candidate_lines:
            # Skip pure doctor assessment lines if unassigned
            if not patient_lines and any(k in line.lower() for k in ["i will prescribe", "diagnosed with", "examination shows"]):
                continue

            line_spans = negation_spans_by_line.get(line, [])

            for kw in symptom_keywords:
                if kw in line.lower():
                    # Check if keyword is part of an already negated phrase
                    if any(kw in neg_phrase for neg_phrase in negated_phrases):
                        continue

                    # Check if the keyword match in the line falls inside any negation span
                    kw_matches = list(re.finditer(r"\b" + re.escape(kw) + r"\b", line, re.IGNORECASE))
                    if not kw_matches:
                        continue

                    # If all occurrences of kw in this line fall within negation spans, skip
                    outside_matches = [
                        m for m in kw_matches
                        if not any(start <= m.start() < end for start, end in line_spans)
                    ]
                    if not outside_matches:
                        continue

                    # Extract concise phrase around positive symptom
                    symptom_item = self._clean_symptom_phrase(line, kw)
                    if symptom_item and symptom_item not in reported_symptoms:
                        if not any(cue in symptom_item.lower() for cue in ["no ", "denies", "without", "negative"]):
                            reported_symptoms.append(symptom_item)
                            evidence.append(
                                ExtractedItem(
                                    text=symptom_item,
                                    source_evidence=line,
                                    is_negated=False,
                                )
                            )

        # Chief complaint
        chief_complaint = "[Not documented]"
        if reported_symptoms:
            chief_complaint = reported_symptoms[0]
        elif candidate_lines:
            if not pertinent_negatives:
                chief_complaint = candidate_lines[0]
            else:
                chief_complaint = "[No affirmative complaints documented; pertinent negatives recorded]"

        # History of present illness narrative
        if candidate_lines:
            hpi = " ".join(candidate_lines)
        else:
            hpi = "[History of present illness not documented]"

        return SubjectiveSection(
            chief_complaint=chief_complaint,
            history_of_present_illness=hpi,
            reported_symptoms=reported_symptoms,
            pertinent_negatives=pertinent_negatives,
            evidence=evidence,
        )

    def _clean_symptom_phrase(self, line: str, keyword: str) -> Optional[str]:
        # Split on sentence boundaries and contrast conjunctions to isolate positive sub-clause
        clauses = re.split(
            r"[,.;!\n]|\b(?:but|however|although|except|yet|nevertheless)\b",
            line,
            flags=re.IGNORECASE,
        )
        for clause in clauses:
            if keyword in clause.lower():
                cleaned = clause.strip()
                if not any(neg in cleaned.lower() for neg in ["no ", "denies", "denied", "without", "negative", "not having"]):
                    return cleaned
        return None

    def _extract_objective(
        self,
        doctor_lines: List[str],
        unassigned_lines: List[str],
        full_text: str,
        context: Optional[Dict[str, Any]],
    ) -> ObjectiveSection:
        physical_examination: List[str] = []
        investigations_reviewed: List[str] = []
        evidence: List[ExtractedItem] = []

        candidate_lines = doctor_lines if doctor_lines else unassigned_lines

        # Vital signs summary from context if passed
        vital_summary = None
        if context and context.get("vital_signs"):
            v = context["vital_signs"]
            parts = []
            if v.get("systolic_bp") is not None and v.get("diastolic_bp") is not None:
                parts.append(f"BP: {v['systolic_bp']:.0f}/{v['diastolic_bp']:.0f} mmHg")
            if v.get("pulse_rate") is not None:
                parts.append(f"HR: {v['pulse_rate']} bpm")
            if v.get("temperature_celsius") is not None:
                parts.append(f"Temp: {v['temperature_celsius']}°C")
            if v.get("spo2_percentage") is not None:
                parts.append(f"SpO2: {v['spo2_percentage']}%")
            if v.get("respiratory_rate") is not None:
                parts.append(f"RR: {v['respiratory_rate']} bpm")
            if v.get("weight_kg") is not None:
                parts.append(f"Weight: {v['weight_kg']} kg")
            if v.get("height_cm") is not None:
                parts.append(f"Height: {v['height_cm']} cm")

            if context and context.get("bmi"):
                bmi_data = context["bmi"]
                bmi_val = bmi_data.get("value")
                if bmi_val is not None and bmi_data.get("is_concurrent") is True:
                    parts.append(f"BMI: {bmi_val:.2f} kg/m²")

            if parts:
                enc_id = context.get("encounter_identifier") or "encounter"
                vital_summary = f"{', '.join(parts)} (verified from {enc_id})"

        # Physical exam keywords
        exam_keywords = [
            "auscultation", "rhonchi", "wheeze", "crepitations", "clear",
            "throat", "tonsils", "congestion", "edema", "tenderness",
            "palpation", "swelling", "pulse is", "bp is", "chest", "lungs",
            "abdomen", "heart sounds", "s1 s2", "pupils", "reflexes"
        ]

        # Investigation keywords
        investigation_keywords = [
            "x-ray", "ecg", "ultrasound", "blood report", "creatinine",
            "hba1c", "hemoglobin", "platelets", "ct scan", "mri", "biopsy"
        ]

        for line in candidate_lines:
            line_lower = line.lower()
            # Physical examination findings
            if any(k in line_lower for k in exam_keywords) and not any(k in line_lower for k in ["i will prescribe", "order", "take"]):
                physical_examination.append(line)
                evidence.append(
                    ExtractedItem(
                        text=line,
                        source_evidence=line,
                        is_negated=False,
                    )
                )

            # Investigations reviewed
            if any(k in line_lower for k in investigation_keywords) and any(w in line_lower for w in ["shows", "reveals", "normal", "elevated", "reported"]):
                investigations_reviewed.append(line)
                evidence.append(
                    ExtractedItem(
                        text=line,
                        source_evidence=line,
                        is_negated=False,
                    )
                )

        return ObjectiveSection(
            vital_signs_summary=vital_summary,
            physical_examination=physical_examination,
            investigations_reviewed=investigations_reviewed,
            evidence=evidence,
        )

    def _extract_assessment(
        self,
        doctor_lines: List[str],
        unassigned_lines: List[str],
        full_text: str,
        context: Optional[Dict[str, Any]],
    ) -> AssessmentSection:
        candidate_lines = doctor_lines if doctor_lines else unassigned_lines

        primary_impression = "[Clinician working impression not documented]"
        differential_diagnoses: List[str] = []
        chronic_conditions: List[str] = []
        evidence: List[ExtractedItem] = []

        impression_keywords = [
            "looks like", "diagnosed with", "impression is", "consistent with",
            "acute", "bronchitis", "pharyngitis", "gastritis", "pneumonia",
            "infection", "hypertension", "diabetes", "osteoarthritis"
        ]

        for line in candidate_lines:
            line_lower = line.lower()

            # Check for uncertainty / differential diagnoses across all matches in the line
            for uncertainty_match in self.UNCERTAINTY_REGEX.finditer(line):
                qualifier = uncertainty_match.group(1).capitalize()
                condition = uncertainty_match.group(2).strip().rstrip(".,;")
                # Clean condition if multiple clauses were grouped
                condition_clean = re.split(r"[,;]|\bbut\b|\band\b", condition)[0].strip()
                if condition_clean:
                    diff_text = f"{qualifier} {condition_clean}"
                    if diff_text not in differential_diagnoses:
                        differential_diagnoses.append(diff_text)
                        evidence.append(
                            ExtractedItem(
                                text=diff_text,
                                source_evidence=uncertainty_match.group(0),
                                uncertainty_qualifier=qualifier.lower(),
                            )
                        )

            # Check for primary clinical impression (excluding lines that are pure treatment plans)
            if any(k in line_lower for k in impression_keywords) and not any(k in line_lower for k in ["prescribe", "take 1 tablet", "drink"]):
                if primary_impression == "[Clinician working impression not documented]":
                    primary_impression = line
                    evidence.append(
                        ExtractedItem(
                            text=line,
                            source_evidence=line,
                        )
                    )

            # Check for chronic comorbidities mentioned
            for chronic in ["diabetes", "hypertension", "hypothyroidism", "kidney disease", "asthma"]:
                if chronic in line_lower and chronic not in [c.lower() for c in chronic_conditions]:
                    chronic_conditions.append(line)

        # Contextual active chronic conditions from patient history if not mentioned
        if context and context.get("medical_history_active"):
            for cond_name in context["medical_history_active"]:
                cond_text = f"{cond_name} (active comorbidity from patient history)"
                if not any(cond_name.lower() in c.lower() for c in chronic_conditions):
                    chronic_conditions.append(cond_text)
        elif context and context.get("medical_history"):
            for cond in context["medical_history"]:
                if isinstance(cond, dict) and (cond.get("status") or "active").lower() == "active":
                    cond_name = cond.get("condition")
                    if cond_name:
                        cond_text = f"{cond_name} (active comorbidity from patient history)"
                        if not any(cond_name.lower() in c.lower() for c in chronic_conditions):
                            chronic_conditions.append(cond_text)

        return AssessmentSection(
            primary_impression=primary_impression,
            differential_diagnoses=differential_diagnoses,
            chronic_conditions_status=chronic_conditions,
            evidence=evidence,
        )

    def _extract_plan(
        self,
        doctor_lines: List[str],
        unassigned_lines: List[str],
        full_text: str,
    ) -> PlanSection:
        candidate_lines = doctor_lines if doctor_lines else unassigned_lines

        diagnostic_workup: List[str] = []
        proposed_medications: List[str] = []
        patient_instructions: List[str] = []
        red_flag_warnings: List[str] = []
        follow_up: Optional[str] = None
        evidence: List[ExtractedItem] = []

        for line in candidate_lines:
            line_lower = line.lower()

            # Diagnostic tests ordered
            if any(k in line_lower for k in ["order", "test for", "get an x-ray", "cbc", "blood test", "fasting blood", "urine test", "ultrasound"]):
                if any(w in line_lower for w in ["will order", "order a", "get a", "need a test", "do a"]):
                    diagnostic_workup.append(line)
                    evidence.append(ExtractedItem(text=line, source_evidence=line))

            # Medications documented
            if any(k in line_lower for k in ["prescribe", "tablet", "tab", "capsule", "cap", "mg", "syrup", "once daily", "twice daily", "od", "bd", "tds", "sos", "continue", "consider"]):
                if any(verb in line_lower for verb in ["prescribe", "take", "give", "start", "tablets", "capsule", "continue", "consider"]):
                    # Distinguish clinical prescription intent
                    is_negated = bool(re.search(r"\b(?:do not|don't|no|never|avoid|not to|should not)\s+(?:take|use|start|prescribe|consume)?\b", line_lower))
                    is_discontinued = bool(re.search(r"\b(?:stop|discontinue|withhold|hold|taper off|cease)\s+(?:taking|using)?\b", line_lower))
                    is_historical = bool(re.search(r"\b(?:previously|prior to|history of|in the past|earlier|already tried|past use)\b", line_lower))
                    is_patient_reported = bool(re.search(r"\b(?:patient (?:took|takes|is taking|reported|states)|i (?:took|take|am taking|have been taking))\b", line_lower))

                    if is_negated or is_discontinued:
                        # Negated instructions or discontinuations belong in patient instructions, not proposed prescriptions
                        if line not in patient_instructions:
                            patient_instructions.append(line)
                            evidence.append(ExtractedItem(text=line, source_evidence=line, is_negated=True))
                    elif is_historical or is_patient_reported:
                        # Historical mentions and patient-reported intake are not new prescriptions
                        pass
                    else:
                        proposed_medications.append(line)
                        evidence.append(ExtractedItem(text=line, source_evidence=line))

            # Patient instructions
            if any(k in line_lower for k in ["steam", "inhalation", "warm water", "rest", "diet", "avoid", "hydration", "exercise", "walk"]):
                patient_instructions.append(line)
                evidence.append(ExtractedItem(text=line, source_evidence=line))

            # Red flag warnings
            if any(k in line_lower for k in ["immediately", "casualty", "emergency", "danger", "red flag", "worsens", "shortness of breath"]):
                if any(c in line_lower for c in ["if", "in case", "seek", "come", "rush"]):
                    red_flag_warnings.append(line)
                    evidence.append(ExtractedItem(text=line, source_evidence=line))

            # Follow up
            if any(k in line_lower for k in ["follow up", "review after", "come back", "visit again", "days", "weeks"]):
                if any(verb in line_lower for verb in ["review", "come for", "follow up", "visit"]):
                    follow_up = line
                    evidence.append(ExtractedItem(text=line, source_evidence=line))

        return PlanSection(
            diagnostic_workup=diagnostic_workup,
            proposed_medications=proposed_medications,
            patient_instructions=patient_instructions,
            red_flag_warnings=red_flag_warnings,
            follow_up=follow_up or "[Follow-up schedule not documented]",
            evidence=evidence,
        )

    def _build_patient_context(self, context: Optional[Dict[str, Any]]) -> Optional[SOAPPatientContext]:
        if not context:
            return None

        has_patient_data = any(
            context.get(k)
            for k in [
                "patient_id",
                "demographics",
                "allergies",
                "medications",
                "medical_history",
                "alerts",
                "is_synthetic",
            ]
        )
        if not has_patient_data:
            return None

        # Demographics summary
        demo_str = None
        if context.get("demographics"):
            d = context["demographics"]
            demo_parts = []
            if d.get("calculated_age") is not None:
                demo_parts.append(f"{d['calculated_age']}y")
            if d.get("gender"):
                demo_parts.append(d["gender"])
            if d.get("preferred_language"):
                demo_parts.append(f"Lang: {d['preferred_language']}")
            if demo_parts:
                demo_str = ", ".join(demo_parts)

        # Allergies
        allergy_status = None
        documented_allergies: List[str] = []
        patient_reported_allergies: List[str] = []
        unverified_allergies: List[str] = []

        if context.get("allergies"):
            al = context["allergies"]
            allergy_status = al.get("allergy_status")
            for item in al.get("documented", []):
                name = item.get("substance") or item.get("allergen") or "Unknown substance"
                sev = item.get("severity")
                documented_allergies.append(f"{name} ({sev})" if sev else name)
            for item in al.get("patient_reported", []):
                name = item.get("substance") or item.get("allergen") or "Unknown substance"
                patient_reported_allergies.append(f"{name} (patient-reported)")
            for item in al.get("unverified", []):
                name = item.get("substance") or item.get("allergen") or "Unknown substance"
                unverified_allergies.append(f"{name} (unverified)")

        # Medications
        active_meds: List[str] = []
        historical_meds: List[str] = []
        if context.get("medications"):
            meds = context["medications"]
            for m in meds.get("active", []):
                med_obj = m.get("medication")
                name = med_obj.get("generic_name") if med_obj else "Unknown medication"
                strength = med_obj.get("strength") if med_obj else None
                med_str = f"{name} {strength}" if strength else name
                active_meds.append(med_str)

            for m in meds.get("historical", []):
                med_obj = m.get("medication")
                name = med_obj.get("generic_name") if med_obj else "Unknown medication"
                strength = med_obj.get("strength") if med_obj else None
                med_str = f"{name} {strength}" if strength else name
                historical_meds.append(f"{med_str} [historical]")

            for m in meds.get("discontinued", []):
                med_obj = m.get("medication")
                name = med_obj.get("generic_name") if med_obj else "Unknown medication"
                strength = med_obj.get("strength") if med_obj else None
                med_str = f"{name} {strength}" if strength else name
                historical_meds.append(f"{med_str} [discontinued]")

            for m in meds.get("uncertain", []):
                med_obj = m.get("medication")
                name = med_obj.get("generic_name") if med_obj else "Unknown medication"
                strength = med_obj.get("strength") if med_obj else None
                med_str = f"{name} {strength}" if strength else name
                historical_meds.append(f"{med_str} [uncertain status]")

        # Chronic conditions (active only) vs past medical history (resolved/historical/unknown)
        chronic_conditions: List[str] = []
        past_medical_history: List[str] = []

        if context.get("medical_history_active") is not None or context.get("medical_history_past") is not None:
            if context.get("medical_history_active"):
                for c_name in context["medical_history_active"]:
                    chronic_conditions.append(f"{c_name} (active)")
            if context.get("medical_history_past"):
                for c_str in context["medical_history_past"]:
                    past_medical_history.append(c_str)
        elif context.get("medical_history"):
            for cond in context["medical_history"]:
                c_name = cond.get("condition")
                c_status = (cond.get("status") or "active").lower()
                if c_name:
                    if c_status == "active":
                        chronic_conditions.append(f"{c_name} (active)")
                    else:
                        past_medical_history.append(f"{c_name} ({c_status})")

        # Historical vitals & summary
        hist_vitals_models: List[VitalMeasurement] = []
        hist_vitals_raw = context.get("historical_vitals", [])
        for hv in hist_vitals_raw:
            if isinstance(hv, VitalMeasurement):
                hist_vitals_models.append(hv)
            elif isinstance(hv, dict):
                hist_vitals_models.append(VitalMeasurement.model_validate(hv))

        hist_vitals_summary = context.get("historical_vitals_summary")

        # BMI in patient context (historical or concurrent)
        bmi_model: Optional[BMIMeasurement] = None
        bmi_raw = context.get("historical_bmi") or context.get("bmi")
        if bmi_raw:
            if isinstance(bmi_raw, BMIMeasurement):
                bmi_model = bmi_raw
            elif isinstance(bmi_raw, dict):
                bmi_model = BMIMeasurement.model_validate(bmi_raw)

        # Alerts
        alert_codes: List[str] = []
        if context.get("alerts"):
            for a in context["alerts"]:
                alert_codes.append(a.get("code") if isinstance(a, dict) else getattr(a, "code", str(a)))

        return SOAPPatientContext(
            demographics_summary=demo_str,
            allergy_status=allergy_status,
            documented_allergies=documented_allergies,
            patient_reported_allergies=patient_reported_allergies,
            unverified_allergies=unverified_allergies,
            active_medications=active_meds,
            historical_or_discontinued_medications=historical_meds,
            chronic_conditions=chronic_conditions,
            past_medical_history=past_medical_history,
            historical_vitals_summary=hist_vitals_summary,
            historical_vitals=hist_vitals_models,
            bmi=bmi_model,
            clinical_alerts=alert_codes,
            is_synthetic=bool(context.get("is_synthetic", False)),
        )
