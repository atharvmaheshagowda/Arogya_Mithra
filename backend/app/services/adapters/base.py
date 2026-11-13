from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from app.schemas.clinical_note import SOAPGenerateRequest, SOAPPayload


class ClinicalNoteAdapter(ABC):
    """Abstract interface for SOAP note extraction engines.
    
    Permits clean switching between deterministic mock extraction and future AI models
    (Gemini, Med-PaLM, local LLMs) without altering service or API layers.
    
    Core Principles:
    1. Generated output is strictly an unverified draft.
    2. Negation and diagnostic uncertainty must be preserved verbatim.
    3. Attribution between patient report and clinician findings must be respected.
    4. Missing information must never be invented.
    """

    @abstractmethod
    def generate_soap_note(
        self,
        request: SOAPGenerateRequest,
        context: Optional[Dict[str, Any]] = None,
    ) -> SOAPPayload:
        """Extracts structured SOAP payload from consultation text and clinical context."""
        pass

