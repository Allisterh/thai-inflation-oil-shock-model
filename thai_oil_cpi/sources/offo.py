"""Oil Fuel Fund Office (สำนักงานกองทุนน้ำมันเชื้อเพลิง, offo.or.th).

The office posts a weekly one-page PDF, "ประมาณการฐานะกองทุนน้ำมันเชื้อเพลิง" (estimated fund position),
at https://www.offo.or.th/th/estimate/fuelfund-status. The sheet gives assets, liabilities and the
net position split between the oil account and the LPG account, in million baht, as of a Sunday.
``fetch_fund_status`` finds the newest PDF on that page and reads the net position and the
borrowings line. Some weeks are posted as images instead of PDFs; those are skipped, so the
returned date is the newest machine-readable week.
"""
from __future__ import annotations

import io
import re
import urllib.parse
from datetime import date

from .http import SourceError, get

STATUS_URL = "https://www.offo.or.th/th/estimate/fuelfund-status"
TH_MONTHS = {"ม.ค.": 1, "ก.พ.": 2, "มี.ค.": 3, "เม.ย.": 4, "พ.ค.": 5, "มิ.ย.": 6, "ก.ค.": 7, "ส.ค.": 8, "ก.ย.": 9, "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12,
             "มกราคม": 1, "กุมภาพันธ์": 2, "มีนาคม": 3, "เมษายน": 4, "พฤษภาคม": 5, "มิถุนายน": 6, "กรกฎาคม": 7, "สิงหาคม": 8,
             "กันยายน": 9, "ตุลาคม": 10, "พฤศจิกายน": 11, "ธันวาคม": 12}


def _num(s: str) -> float | None:
    s = s.strip().replace(",", "")
    if s in ("", "-"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _date_from_name(name: str) -> date | None:
    """'ฐานะกองทุน ส่ง สนพ 69-10-18.pdf' → 2026-10-18 (two-digit Buddhist year);
    'สิ้นสุด ณ วันที่ 16 สิงหาคม 2569.pdf' → 2026-08-16."""
    m = re.search(r"(\d{2})-(\d{2})-(\d{2})\.pdf$", name)
    if m:
        yy, mm, dd = (int(x) for x in m.groups())
        return date(2500 + yy - 543, mm, dd)
    m = re.search(r"(\d{1,2})\s+(\S+)\s+(25\d{2})", name)
    if m and m.group(2) in TH_MONTHS:
        return date(int(m.group(3)) - 543, TH_MONTHS[m.group(2)], int(m.group(1)))
    return None


def list_reports(html: str) -> list[dict]:
    """PDF reports linked from the status page, newest first: [{'url', 'name', 'date'}]."""
    out = []
    for url in re.findall(r'href="(https://www\.offo\.or\.th/sites/default/files/estimate/files/[^"]+)"', html):
        name = urllib.parse.unquote(url.rsplit("/", 1)[-1])
        if not name.lower().endswith(".pdf"):
            continue
        d = _date_from_name(name)
        if d:
            out.append({"url": url, "name": name, "date": d.isoformat()})
    out.sort(key=lambda r: r["date"], reverse=True)
    return out


def parse_status_pdf(data: bytes) -> dict:
    """Net position (oil, LPG, total) and borrowings from the weekly sheet, in million baht."""
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(data))
    text = "\n".join((p.extract_text() or "") for p in reader.pages)
    out = {}
    for line in text.splitlines():
        flat = line.replace("​", "")
        if "สุทธิ" in flat and "ฐานะ" in flat and "net" not in out:
            nums = [_num(x) for x in re.findall(r"-?\d[\d,]*", flat.split("สุทธิ", 1)[1])]
            nums = [n for n in nums if n is not None]
            if len(nums) >= 3:
                out["net"] = {"oil": nums[0], "lpg": nums[1], "total": nums[2]}
        elif "กู้ยืม" in flat or "กูย้ ืม" in flat or "กู้ย" in flat:
            nums = [n for n in (_num(x) for x in re.findall(r"-?\d[\d,]*", flat)) if n is not None]
            if len(nums) >= 3 and "borrowings" not in out:
                out["borrowings"] = {"oil": nums[0], "lpg": nums[1], "total": nums[2]}
        m = re.search(r"วันที่\s*(\d{1,2})\s*(\S+?\.)\s*(\d{2})\b", flat)
        if m and "as_of_text" not in out and m.group(2) in TH_MONTHS:
            out["as_of_text"] = date(2500 + int(m.group(3)) - 543, TH_MONTHS[m.group(2)], int(m.group(1))).isoformat()
    if "net" not in out:
        raise SourceError("OFFO status PDF: net position line not found")
    n = out["net"]
    if abs((n["oil"] + n["lpg"]) - n["total"]) > 2:   # million baht; rounding of the three printed figures
        raise SourceError(f"OFFO status PDF: oil + LPG does not equal total ({n})")
    return out


def fetch_fund_status() -> dict:
    """{'date', 'oil', 'lpg', 'total', 'borrowings': {...}, 'source_url', 'unit': 'million THB'} for the newest PDF."""
    html = get(STATUS_URL).decode("utf-8", "ignore")
    reports = list_reports(html)
    if not reports:
        raise SourceError("OFFO status page: no PDF reports found")
    newest = reports[0]
    parsed = parse_status_pdf(get(newest["url"]))
    return {"date": parsed.get("as_of_text") or newest["date"], "oil": parsed["net"]["oil"], "lpg": parsed["net"]["lpg"], "total": parsed["net"]["total"],
            "borrowings": parsed.get("borrowings"), "source_url": newest["url"], "page_url": STATUS_URL, "unit": "million THB",
            "title": "ประมาณการฐานะกองทุนน้ำมันเชื้อเพลิง (สกนช.)", "reports_listed": len(reports)}


def fetch_fund_history(max_reports: int = 80) -> list[dict]:
    """Every machine-readable weekly sheet linked on the status page (used once to seed the cache)."""
    html = get(STATUS_URL).decode("utf-8", "ignore")
    out = []
    for rep in list_reports(html)[:max_reports]:
        try:
            parsed = parse_status_pdf(get(rep["url"]))
        except Exception:
            continue
        out.append({"date": parsed.get("as_of_text") or rep["date"], "oil": parsed["net"]["oil"], "lpg": parsed["net"]["lpg"], "total": parsed["net"]["total"],
                    "borrowings": parsed.get("borrowings"), "source_url": rep["url"]})
    out.sort(key=lambda r: r["date"])
    return out
