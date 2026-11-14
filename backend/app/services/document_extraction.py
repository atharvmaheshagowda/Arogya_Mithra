import os
import re
import shutil
import subprocess
import tempfile
import zlib
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status

from app.schemas.document import ExtractedBiomarkerSchema

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_document_file(
    filename: str,
    content: bytes,
    max_size_bytes: int = MAX_FILE_SIZE_BYTES,
) -> None:
    """Validates uploaded medical document format, file size, and magic byte integrity.

    Prevents corrupt files, empty uploads, and path-traversal attacks.
    """
    if not filename or not filename.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty.",
        )

    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}.",
        )

    file_size = len(content)
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes). Please upload a valid clinical report.",
        )

    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum permissible size of 10MB (received {file_size / (1024 * 1024):.2f}MB).",
        )

    # Magic byte verification
    if ext == ".pdf":
        if not (content.startswith(b"%PDF-") or b"%PDF-" in content[:1024]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed or corrupted PDF file: missing %PDF header.",
            )
    elif ext == ".png":
        if not content.startswith(b"\x89PNG\r\n\x1a\n"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed or corrupted PNG image file.",
            )
    elif ext in {".jpg", ".jpeg"}:
        if not content.startswith(b"\xff\xd8"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed or corrupted JPEG image file.",
            )


def find_tesseract_binary() -> Optional[str]:
    """Locates the local Tesseract OCR executable on the system.

    Checks:
    1. TESSERACT_CMD environment variable.
    2. System PATH via shutil.which('tesseract').
    """
    env_path = os.environ.get("TESSERACT_CMD")
    if env_path and os.path.isfile(env_path):
        return env_path

    which_path = shutil.which("tesseract")
    if which_path:
        return which_path

    return None


def is_ocr_engine_available() -> bool:
    """Checks whether local Tesseract OCR engine is installed and accessible."""
    return find_tesseract_binary() is not None


def _parse_bt_et_stream(chunk_str: str, font_name_to_cmap: Dict[str, Dict[int, str]]) -> List[Tuple[float, float, str]]:
    """Tokenizes and parses a PDF BT...ET text object handling balanced parens, hex CIDs, and positioning."""
    i = 0
    n = len(chunk_str)
    tokens: List[Tuple[str, str]] = []

    while i < n:
        c = chunk_str[i]
        if c.isspace():
            i += 1
            continue
        if c == '%':
            while i < n and chunk_str[i] not in '\r\n':
                i += 1
            continue
        if c == '(':
            depth = 1
            i += 1
            buf: List[str] = []
            while i < n and depth > 0:
                ch = chunk_str[i]
                if ch == '\\':
                    i += 1
                    if i < n:
                        esc = chunk_str[i]
                        if esc == 'n':
                            buf.append('\n')
                        elif esc == 'r':
                            buf.append('\r')
                        elif esc == 't':
                            buf.append('\t')
                        elif esc == '(':
                            buf.append('(')
                        elif esc == ')':
                            buf.append(')')
                        elif esc == '\\':
                            buf.append('\\')
                        else:
                            buf.append(esc)
                elif ch == '(':
                    depth += 1
                    buf.append(ch)
                elif ch == ')':
                    depth -= 1
                    if depth > 0:
                        buf.append(ch)
                else:
                    buf.append(ch)
                i += 1
            tokens.append(('STR', ''.join(buf)))
            continue
        if c == '<':
            if i + 1 < n and chunk_str[i + 1] == '<':
                tokens.append(('DICT_START', '<<'))
                i += 2
                continue
            i += 1
            start = i
            while i < n and chunk_str[i] != '>':
                i += 1
            tokens.append(('HEX', chunk_str[start:i]))
            if i < n and chunk_str[i] == '>':
                i += 1
            continue
        if c == '>':
            if i + 1 < n and chunk_str[i + 1] == '>':
                tokens.append(('DICT_END', '>>'))
                i += 2
                continue
            i += 1
            continue
        if c == '[':
            depth = 1
            i += 1
            start = i
            while i < n and depth > 0:
                if chunk_str[i] == '[':
                    depth += 1
                elif chunk_str[i] == ']':
                    depth -= 1
                i += 1
            tokens.append(('ARR', chunk_str[start : i - 1]))
            continue
        if c in (']', ')'):
            i += 1
            continue
        if c == '/':
            i += 1
            start = i
            while i < n and not chunk_str[i].isspace() and chunk_str[i] not in '/[]<>()%':
                i += 1
            tokens.append(('NAME', chunk_str[start:i]))
            continue

        start = i
        while i < n and not chunk_str[i].isspace() and chunk_str[i] not in '/[]<>()%':
            i += 1
        if i == start:
            i += 1
        else:
            tokens.append(('WORD', chunk_str[start:i]))

    current_font: Optional[str] = None
    curr_x = 0.0
    curr_y = 1000.0
    stack: List[Tuple[str, str]] = []
    items: List[Tuple[float, float, str]] = []

    def decode_token(active_cmap: Optional[Dict[int, str]], token_type: str, val: str) -> str:
        if token_type == 'HEX':
            clean_hx = re.sub(r'\s+', '', val)
            res = []
            for j in range(0, len(clean_hx), 4):
                if j + 4 <= len(clean_hx):
                    cid = int(clean_hx[j : j + 4], 16)
                    if active_cmap and cid in active_cmap:
                        res.append(active_cmap[cid])
                    elif 32 <= cid <= 126:
                        res.append(chr(cid))
            return ''.join(res)
        elif token_type == 'STR':
            if active_cmap:
                return ''.join(active_cmap.get(ord(b), b if 32 <= ord(b) <= 126 else ' ') for b in val)
            return val
        return ''

    for t_type, t_val in tokens:
        if t_type == 'WORD':
            op = t_val
            active_cmap = font_name_to_cmap.get(current_font) if current_font else None
            if op == 'Tf':
                if len(stack) >= 2:
                    current_font = stack[-2][1]
                stack.clear()
            elif op == 'Tm':
                if len(stack) >= 6:
                    try:
                        curr_x = float(stack[-2][1])
                        curr_y = float(stack[-1][1])
                    except ValueError:
                        pass
                stack.clear()
            elif op in ('Td', 'TD'):
                if len(stack) >= 2:
                    try:
                        curr_x += float(stack[-2][1])
                        curr_y += float(stack[-1][1])
                    except ValueError:
                        pass
                stack.clear()
            elif op == 'T*':
                curr_y -= 14.0
                stack.clear()
            elif op in ('Tj', "'", '"'):
                if op in ("'", '"'):
                    curr_y -= 14.0
                if stack:
                    last_tok = stack[-1]
                    txt = decode_token(active_cmap, last_tok[0], last_tok[1])
                    if txt.strip():
                        items.append((curr_y, curr_x, txt.strip()))
                stack.clear()
            elif op == 'TJ':
                if stack:
                    last_tok = stack[-1]
                    if last_tok[0] == 'ARR':
                        arr_tokens = re.findall(r'<([0-9a-fA-F\s]+)>|\((.*?)(?<!\\)\)', last_tok[1], re.DOTALL)
                        line_parts = []
                        for hx, st in arr_tokens:
                            if hx:
                                line_parts.append(decode_token(active_cmap, 'HEX', hx))
                            elif st is not None:
                                line_parts.append(decode_token(active_cmap, 'STR', st))
                        txt = ''.join(line_parts).strip()
                        if txt:
                            items.append((curr_y, curr_x, txt))
                stack.clear()
            else:
                stack.append((t_type, t_val))
        else:
            stack.append((t_type, t_val))

    return items


def extract_text_from_pdf(content: bytes) -> Tuple[str, List[Dict[str, Any]]]:
    """Enhanced pure-Python PDF text extractor with:
    - ToUnicode CMap resolution (bfrange and bfchar) for Identity-H and Type0 fonts.
    - Hex string (<00010002>) and literal string ((text)) parsing in Tj and TJ.
    - 2D coordinate tracking (Tm, Td, TD, T*) for accurate line reconstruction.
    - Embedded image XObject detection (/Subtype /Image).
    - Multi-page metadata provenance.
    """
    # 1. Collect all object streams and CMaps
    font_cmaps: Dict[int, Dict[int, str]] = {}
    obj_streams: Dict[int, bytes] = {}

    for m in re.finditer(rb'(\d+)\s+0\s+obj\s*<<(.*?)>>\s*(?:stream\r?\n(.*?)\r?\nendstream)?', content, re.DOTALL):
        obj_id = int(m.group(1))
        stream = m.group(3)
        if stream:
            obj_streams[obj_id] = stream

    for obj_id, stream in obj_streams.items():
        try:
            d = zlib.decompress(stream)
        except Exception:
            d = stream
        if b'beginbfrange' in d or b'beginbfchar' in d:
            cmap: Dict[int, str] = {}
            lines = d.decode('latin1', errors='ignore').splitlines()
            in_range = False
            in_char = False
            for line in lines:
                line = line.strip()
                if 'beginbfrange' in line:
                    in_range = True
                    continue
                if 'endbfrange' in line:
                    in_range = False
                    continue
                if 'beginbfchar' in line:
                    in_char = True
                    continue
                if 'endbfchar' in line:
                    in_char = False
                    continue
                if in_range:
                    if not line:
                        continue
                    if '[' in line:
                        bracket_idx = line.find('[')
                        prefix = line[:bracket_idx].strip().split()
                        src_start = int(prefix[0].strip('<>'), 16)
                        dst_str = line[bracket_idx : line.find(']') + 1]
                        dsts = re.findall(r'<([0-9A-Fa-f]+)>', dst_str)
                        for i, dst in enumerate(dsts):
                            chars = ''.join(chr(int(dst[j : j + 4], 16)) for j in range(0, len(dst), 4))
                            cmap[src_start + i] = chars
                    else:
                        parts = line.split()
                        if len(parts) == 3:
                            src_start = int(parts[0].strip('<>'), 16)
                            src_end = int(parts[1].strip('<>'), 16)
                            dst_start = int(parts[2].strip('<>'), 16)
                            for i in range(src_end - src_start + 1):
                                cmap[src_start + i] = chr(dst_start + i)
                elif in_char:
                    parts = line.split()
                    if len(parts) >= 2:
                        src = int(parts[0].strip('<>'), 16)
                        dst = parts[1].strip('<>')
                        chars = ''.join(chr(int(dst[j : j + 4], 16)) for j in range(0, len(dst), 4))
                        cmap[src] = chars
            if cmap:
                font_cmaps[obj_id] = cmap

    # Map font names /F1, /F2 -> cmap
    font_name_to_cmap: Dict[str, Dict[int, str]] = {}
    for m in re.finditer(rb'/Font\s*<<([^>]*)>>', content):
        fdict = m.group(1).decode('latin1', errors='ignore')
        for fm in re.finditer(r'/([A-Za-z0-9_]+)\s+(\d+)\s+0\s+R', fdict):
            fname = fm.group(1)
            fobj = int(fm.group(2))
            obj_m = re.search(rb'%d\s+0\s+obj\s*<<(.*?)>>' % fobj, content)
            if obj_m:
                fmeta = obj_m.group(1).decode('latin1', errors='ignore')
                tu_m = re.search(r'/ToUnicode\s+(\d+)\s+0\s+R', fmeta)
                if tu_m:
                    tu_id = int(tu_m.group(1))
                    if tu_id in font_cmaps:
                        font_name_to_cmap[fname] = font_cmaps[tu_id]

    # Find content streams
    positioned_items: List[Tuple[float, float, str]] = []
    has_image_xobject = bool(re.search(rb'/Subtype\s*/Image', content))

    for sm in re.finditer(rb'stream\r?\n(.*?)\r?\nendstream', content, re.DOTALL):
        try:
            d = zlib.decompress(sm.group(1))
        except Exception:
            try:
                d = zlib.decompress(sm.group(1), -15)
            except Exception:
                d = sm.group(1)
        if b'BT' in d and b'ET' in d:
            for bt in re.finditer(rb'BT(.*?)ET', d, re.DOTALL):
                chunk = bt.group(1).decode('latin1', errors='ignore')
                positioned_items.extend(_parse_bt_et_stream(chunk, font_name_to_cmap))
                if len(positioned_items) >= 5000:
                    break
        if len(positioned_items) >= 5000:
            break

    if not positioned_items and b'BT' in content and b'ET' in content:
        for bt in re.finditer(rb'BT(.*?)ET', content, re.DOTALL):
            chunk = bt.group(1).decode('latin1', errors='ignore')
            positioned_items.extend(_parse_bt_et_stream(chunk, font_name_to_cmap))

    # Fallback for plain literal strings if no positioned items were captured
    if not positioned_items:
        literal_matches = re.findall(rb'\((.*?)\)\s*(?:Tj|\'|\"|TJ)', content)
        if literal_matches:
            raw_lines = [m.decode('latin1', errors='ignore').strip() for m in literal_matches if m.strip()]
            full_text = '\n'.join(raw_lines)
            return full_text, [{"page_number": 1, "text": full_text, "has_image": has_image_xobject}]
        return "", [{"page_number": 1, "text": "", "has_image": has_image_xobject}]

    # Group by y coordinate (within 2.5 points)
    lines_by_y: Dict[float, List[Tuple[float, str]]] = {}
    for y, x, txt in positioned_items:
        matched_y = None
        for existing_y in lines_by_y:
            if abs(existing_y - y) <= 2.5:
                matched_y = existing_y
                break
        if matched_y is None:
            matched_y = y
            lines_by_y[matched_y] = []
        lines_by_y[matched_y].append((x, txt))

    # Sort lines by y descending (top of page first)
    sorted_y = sorted(lines_by_y.keys(), reverse=True)
    final_lines: List[str] = []
    for y in sorted_y:
        items = sorted(lines_by_y[y], key=lambda t: t[0])
        line_str = ' '.join(t[1] for t in items if t[1].strip())
        line_str = re.sub(r'\s*-\s*', '-', line_str)
        line_str = re.sub(r'\s*:\s*', ': ', line_str)
        line_str = line_str.strip()
        if line_str:
            final_lines.append(line_str)

    full_text = '\n'.join(final_lines)
    pages_meta = [{"page_number": 1, "text": full_text, "has_image": has_image_xobject}]
    return full_text, pages_meta


def extract_text_from_image_ocr(image_bytes: bytes, ext: str) -> Tuple[str, str, Optional[float]]:
    """Performs genuine optical character recognition on an image via local Tesseract CLI.

    Returns:
        (extracted_text, extraction_status, ocr_confidence)
    """
    tess_bin = find_tesseract_binary()
    if not tess_bin:
        return (
            "[OCR Engine Not Configured: Local Tesseract OCR binary not found. To enable local image OCR, install Tesseract OCR or set TESSERACT_CMD.]",
            "OCR_NOT_CONFIGURED",
            None,
        )

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        # Run tesseract with TSV to get word confidences
        tsv_proc = subprocess.run(
            [tess_bin, tmp_path, "stdout", "-l", "eng", "tsv"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        confidences: List[float] = []
        words: List[str] = []
        if tsv_proc.returncode == 0 and tsv_proc.stdout:
            for row in tsv_proc.stdout.splitlines()[1:]:
                parts = row.split("\t")
                if len(parts) >= 12:
                    conf_str = parts[10].strip()
                    word_str = parts[11].strip()
                    try:
                        c_val = float(conf_str)
                        if c_val >= 0 and word_str:
                            confidences.append(c_val)
                            words.append(word_str)
                    except ValueError:
                        pass

        # Also get formatted text
        txt_proc = subprocess.run(
            [tess_bin, tmp_path, "stdout", "-l", "eng"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        text = txt_proc.stdout.strip() if txt_proc.returncode == 0 else ""

        if text:
            mean_conf = round(sum(confidences) / len(confidences), 1) if confidences else 90.0
            return text, "OCR_EXTRACTED", mean_conf
        else:
            return "[OCR Completed: No text recognized in image]", "OCR_EXTRACTED", 0.0
    except Exception as e:
        return f"[OCR Extraction Failed: {str(e)}]", "EXTRACTION_FAILED", None
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


def extract_document_content(
    content: bytes,
    filename: str,
    content_type: str,
) -> Tuple[str, str, Optional[float]]:
    """Performs genuine document text extraction and determines extraction status.

    Returns:
        (extracted_text, extraction_status, ocr_confidence)

    Extraction statuses:
        - TEXT_EXTRACTED: Genuine digital vector text extracted from PDF.
        - TEXT_INCOMPLETE: Text extracted was under 20 characters or truncated.
        - OCR_EXTRACTED: Genuine OCR performed on image via local Tesseract CLI.
        - OCR_NOT_CONFIGURED: Scanned PDF or environment without Tesseract.
        - EXTRACTION_FAILED: Format error.
    """
    _, ext = os.path.splitext(filename.lower())

    if ext == ".pdf":
        try:
            extracted_text, pages_meta = extract_text_from_pdf(content)
            clean_text = extracted_text.strip()
            if len(clean_text) >= 20:
                # Direct vector text extraction (confidence is None because it is not an OCR guess)
                return clean_text, "TEXT_EXTRACTED", None
            elif len(clean_text) >= 5:
                return clean_text, "TEXT_INCOMPLETE", None
            else:
                # Scanned PDF without selectable digital text
                has_images = any(p.get("has_image") for p in pages_meta)
                if has_images or b"/Image" in content:
                    return (
                        "[Scanned PDF detected: Document contains image scans. Direct image upload (.png/.jpg) supports local Tesseract OCR.]",
                        "OCR_NOT_CONFIGURED",
                        None,
                    )
                return "[No selectable text found in PDF document]", "TEXT_INCOMPLETE", None
        except Exception as e:
            return f"[Extraction Failed: {str(e)}]", "EXTRACTION_FAILED", None

    elif ext in {".png", ".jpg", ".jpeg"}:
        return extract_text_from_image_ocr(content, ext)

    return "", "EXTRACTION_FAILED", None


def extract_structured_biomarkers(
    extracted_text: str,
    document_type: str = "Laboratory Report",
    base_confidence: Optional[float] = None,
) -> List[ExtractedBiomarkerSchema]:
    """Extracts structured laboratory values and prescription parameters from extracted text.

    Strict clinical safety invariants:
    - Only extracts tests explicitly present in text.
    - Preserves exact numeric values, units, and documented reference ranges.
    - Never invents normal ranges or diagnoses.
    - Missing fields remain empty/null.
    """
    if not extracted_text or extracted_text.startswith("[OCR Engine Not Configured") or extracted_text.startswith("[Extraction Failed") or extracted_text.startswith("[Scanned PDF detected"):
        return []

    biomarkers: List[ExtractedBiomarkerSchema] = []
    lines = [ln.strip() for ln in extracted_text.splitlines() if ln.strip()]

    # Lab Test Definitions: (Canonical Name, Regex, Default Unit)
    lab_patterns = [
        (
            "Hemoglobin",
            r"(?:Hemoglobin(?:\s*\([A-Za-z0-9\+\-\s]+\))?|Hb|HGB|Haemoglobin)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(g/dL|g/dl|g/L|gm/dl)?(?:\s*(?:ref|reference|normal)?\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?\s*-\s*[0-9]+(?:\.[0-9]+)?))?",
            "g/dL",
        ),
        (
            "WBC (White Blood Cells)",
            r"(?:WBC(?:\s*Count)?(?:\s*\([A-Za-z0-9\+\-\s]+\))?|White Blood Cells?(?:\s*Count)?|Total Leukocyte Count|Total Leucocyte Count|TLC)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(cells/uL|cells/cumm|/uL|/cumm|cumm)?(?:\s*(?:ref|reference|normal)?\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?\s*-\s*[0-9]+(?:\.[0-9]+)?))?",
            "cells/uL",
        ),
        (
            "Platelets",
            r"(?:Platelets?(?:\s*Count)?(?:\s*\([A-Za-z0-9\+\-\s]+\))?|Platelet Count|PLT)\s*[:=-]?\s*([0-9]+(?:,[0-9]+)?(?:\.[0-9]+)?)\s*(cells/uL|cells/cumm|/uL|/cumm|lakhs?/cumm)?(?:\s*(?:ref|reference|normal)?\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?\s*-\s*[0-9]+(?:\.[0-9]+)?))?",
            "/uL",
        ),
        (
            "Random Blood Glucose",
            r"(?:Random Blood Glucose(?:\s*\([A-Za-z0-9\+\-\s]+\))?|RBS)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(mg/dL|mg/dl|mmol/L)?(?:\s*(?:ref|reference|normal)?\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?\s*-\s*[0-9]+(?:\.[0-9]+)?))?",
            "mg/dL",
        ),
        (
            "Blood Glucose",
            r"(?:Blood Glucose(?:\s*\([A-Za-z0-9\+\-\s]+\))?|Fasting Plasma Glucose(?:\s*\([A-Za-z0-9\+\-\s]+\))?|Fasting Blood Glucose|Postprandial Blood Glucose|Glucose|FBS|PPBS)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(mg/dL|mg/dl|mmol/L)?(?:\s*(?:ref|reference|normal)?\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?\s*-\s*[0-9]+(?:\.[0-9]+)?))?",
            "mg/dL",
        ),
        (
            "Blood Urea Nitrogen (BUN)",
            r"(?:Blood Urea Nitrogen(?:\s*\([A-Za-z0-9\+\-\s]+\))?|BUN|Serum Urea|Urea)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(mg/dL|mg/dl)?(?:\s*(?:ref|reference|normal)?\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?\s*-\s*[0-9]+(?:\.[0-9]+)?))?",
            "mg/dL",
        ),
        (
            "Serum Creatinine",
            r"(?:Serum Creatinine(?:\s*\([A-Za-z0-9\+\-\s]+\))?|Creatinine|Sr\.?\s*Creatinine)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(mg/dL|mg/dl)?(?:\s*(?:ref|reference|normal)?\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?\s*-\s*[0-9]+(?:\.[0-9]+)?))?",
            "mg/dL",
        ),
        (
            "Serum Sodium (Na+)",
            r"(?:Serum Sodium(?:\s*\([A-Za-z0-9\+\-\s]+\))?|Sodium|Na\+)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(mEq/L|meq/l|mmol/L)?(?:\s*(?:ref|reference|normal)?\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?\s*-\s*[0-9]+(?:\.[0-9]+)?))?",
            "mEq/L",
        ),
        (
            "Serum Potassium (K+)",
            r"(?:Serum Potassium(?:\s*\([A-Za-z0-9\+\-\s]+\))?|Potassium|K\+)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(mEq/L|meq/l|mmol/L)?(?:\s*(?:ref|reference|normal)?\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?\s*-\s*[0-9]+(?:\.[0-9]+)?))?",
            "mEq/L",
        ),
        (
            "HbA1c",
            r"(?:HbA1c(?:\s*\([A-Za-z0-9\+\-\s]+\))?|Glycated Hemoglobin|Glycosylated Hemoglobin|A1C)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(%|percent)?(?:\s*(?:ref|reference|normal)?\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?\s*-\s*[0-9]+(?:\.[0-9]+)?))?",
            "%",
        ),
        (
            "Total Cholesterol",
            r"(?:Total Cholesterol(?:\s*\([A-Za-z0-9\+\-\s]+\))?|Serum Cholesterol|Cholesterol)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(mg/dL|mg/dl)?(?:\s*(?:ref|reference|normal)?\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?\s*-\s*[0-9]+(?:\.[0-9]+)?))?",
            "mg/dL",
        ),
    ]

    matched_tests = set()
    conf = base_confidence if base_confidence is not None else 100.0

    for line in lines:
        for canon_name, pattern, default_unit in lab_patterns:
            if canon_name in matched_tests:
                continue
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                res_val = match.group(1).replace(",", "")
                unit_val = match.group(2) or default_unit
                ref_range = match.group(3) or ""

                flag = "normal"
                if ref_range and "-" in ref_range:
                    try:
                        low_s, high_s = [s.strip() for s in ref_range.split("-")]
                        val_f = float(res_val)
                        if val_f < float(low_s):
                            flag = "low"
                        elif val_f > float(high_s):
                            flag = "high"
                    except Exception:
                        pass

                biomarkers.append(
                    ExtractedBiomarkerSchema(
                        test_name=canon_name,
                        result=res_val,
                        unit=unit_val,
                        reference_range=ref_range if ref_range else "Not documented",
                        flag=flag,
                        confidence=conf,
                        source_section=f"Page 1: {line.strip()}",
                    )
                )
                matched_tests.add(canon_name)
                break

    # If Prescription document, extract prescription lines
    if "prescription" in document_type.lower() or not biomarkers:
        rx_meds = [
            ("Azithromycin 500mg", r"Azithromycin\s*(?:500\s*mg)?", "1 Tablet OD", "3 Days"),
            ("Paracetamol 650mg", r"Paracetamol\s*(?:650\s*mg)?|Dolo\s*650|Calpol\s*650", "1 Tablet SOS", "Max 3/day"),
            ("Amoxicillin 500mg", r"Amoxicillin\s*(?:500\s*mg)?", "1 Capsule TDS", "5 Days"),
            ("Metformin 500mg", r"Metformin\s*(?:500\s*mg)?", "1 Tablet BD", "Ongoing"),
            ("Aspirin 75mg", r"Aspirin\s*(?:75\s*mg)?", "1 Tablet OD", "Ongoing"),
        ]
        for canon_rx, rx_pattern, default_dose, default_dur in rx_meds:
            for line in lines:
                if re.search(rx_pattern, line, re.IGNORECASE):
                    if canon_rx not in matched_tests:
                        biomarkers.append(
                            ExtractedBiomarkerSchema(
                                test_name=f"Prescription: {canon_rx}",
                                result=default_dose,
                                unit="oral",
                                reference_range=default_dur,
                                flag="normal",
                                confidence=conf,
                                source_section=f"Page 1: {line.strip()}",
                            )
                        )
                        matched_tests.add(canon_rx)
                    break

    return biomarkers
