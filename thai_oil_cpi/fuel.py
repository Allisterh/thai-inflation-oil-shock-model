"""Oil Fund and pump-price tracker: where each baht of a litre goes, what fuel would cost without
Oil Fund support, the levy history and the Fund's financial position. Writes web/data/fuel.json.

Everything here is official data or simple arithmetic on it. The arithmetic is checked against
EPPO's own wholesale and retail figures before the derived prices are published; if a check fails
for a fuel, that fuel's derived prices are left out rather than shown wrong.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from . import config as C

VAT = 1 + C.VAT_RATE
FUELS = ["gasohol95", "gasohol91", "gasohol_e20", "gasohol_e85", "diesel_b7", "ulg95_premium"]
# Table 7 (EPPO) column for each fuel's levy history.
LEVY_COLUMNS = {"gasohol95": "gasohol95", "gasohol91": "gasohol91", "gasohol_e20": "gasohol_e20", "gasohol_e85": "gasohol_e85",
                "diesel_b7": "diesel", "ulg95_premium": "ulg95"}
TOL = 0.01

# What EPPO's DISCOUNT column is. The Thai column header in EPPO's own spreadsheet
# (pt-price-st-YYYY-MM-DD.xlsx, sheet "โครงสร้างราคาน้ำมัน") is "ส่วนลดราคา ณ โรงกลั่น": a discount on the
# ex-refinery price. It is a government measure: the Energy Policy Administration Committee (กบง.)
# directs refiners to pass part of their excess refining margin to diesel as an ex-refinery discount
# (2026: 5, then 3, 2.40 and 4 baht a litre for diesel B0/B7/B20; the 4-baht round runs 16 Sep–31 Oct 2026).
DISCOUNT_MEANING = {
    "label_th": "ส่วนลดราคา ณ โรงกลั่น", "label_en": "Discount on the ex-refinery price",
    "label_source": "EPPO price-structure spreadsheet, Thai sheet header (pt-price-st-YYYY-MM-DD.xlsx)",
    "government_measure": True,
    "note_en": "Set by the Energy Policy Administration Committee: refiners pass part of their excess refining margin to diesel as a discount on the refinery price. In 2026 the rounds were 5, 3, 2.40 and 4 baht a litre; the 4-baht round covers 16 September to 31 October 2026.",
    "note_th": "มติ กบง. ให้โรงกลั่นนำผลประโยชน์ส่วนเกินจากค่าการกลั่นมาลดราคา ณ โรงกลั่นให้ดีเซล ปี 2569 ลดเป็นระลอก 5, 3, 2.40 และ 4 บาทต่อลิตร รอบ 4 บาทมีผล 16 ก.ย. ถึง 31 ต.ค. 2569",
    "sources": ["https://www.thaipbs.or.th/news/content/508630", "https://thestandard.co/?p=1257413"],
}


def _r(x, d=4):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), d)


def breakdown(rec: dict) -> dict:
    """Per-litre parts of one fuel's EPPO structure, the derived prices and the arithmetic checks."""
    g = lambda k: float(rec.get(k) or 0.0)
    ex, disc, exc, mun, fund, cons = g("ex_refinery"), g("discount"), g("excise"), g("municipal_tax"), g("oil_fund"), g("conservation_fund")
    wholesale, vat_ws, marketing, vat_mm, retail = g("wholesale"), g("vat_ws"), g("marketing"), g("vat_mm"), g("retail")
    parts = {"refinery": ex, "discount": disc, "tax": exc + mun, "oil_fund": fund, "conservation_fund": cons, "marketing": marketing, "vat": vat_ws + vat_mm}
    sum_parts = sum(parts.values())
    ws_calc = ex + disc + exc + mun + fund + cons
    retail_calc = ws_calc * VAT + marketing * VAT
    checks = {"wholesale": abs(ws_calc - wholesale) <= TOL, "vat_ws": abs(ws_calc * C.VAT_RATE - vat_ws) <= TOL,
              "vat_mm": abs(marketing * C.VAT_RATE - vat_mm) <= TOL, "retail": abs(retail_calc - retail) <= TOL, "parts": abs(sum_parts - retail) <= TOL}
    ok = all(checks.values())
    out = {"parts": {k: _r(v) for k, v in parts.items()}, "retail": _r(retail, 2), "wholesale": _r(wholesale), "oil_fund": _r(fund), "discount": _r(disc),
           "checks": checks, "checks_ok": ok, "residuals": {"wholesale": _r(ws_calc - wholesale), "retail": _r(retail_calc - retail), "parts": _r(sum_parts - retail)}}
    if ok:
        # The levy sits inside the wholesale price, on which VAT is charged, so removing it removes levy × 1.07.
        out["without_oil_fund"] = _r(retail - fund * VAT, 2)
        out["without_support"] = _r(retail - (fund + disc) * VAT, 2) if disc else None
        out["crude_share_pct"] = _r(100 * ex / retail, 1) if retail else None
    return out


def levy_history(csv_path: Path = C.OIL_FUND_CSV) -> dict:
    if not Path(csv_path).exists():
        return {"months": [], "series": {}, "source": "EPPO petroleum price statistics, Table 7"}
    df = pd.read_csv(csv_path)
    df["month"] = df["month"].astype(str).str[:7]
    series = {}
    for fuel, col in LEVY_COLUMNS.items():
        if col in df:
            series[fuel] = [_r(v, 3) for v in df[col]]
    return {"months": df["month"].tolist(), "series": series, "source": "EPPO petroleum price statistics, Table 7 (monthly levy, THB/litre; negative = subsidy)",
            "last_month": df["month"].iloc[-1] if len(df) else None}


def fund_status(cache_path: Path = C.OFFO_STATUS_JSON, source_status: dict | None = None) -> dict | None:
    if not Path(cache_path).exists():
        return None
    c = json.loads(Path(cache_path).read_text())
    latest = c.get("latest") or {}
    st = source_status or {}
    return {"date": latest.get("date"), "oil": latest.get("oil"), "lpg": latest.get("lpg"), "total": latest.get("total"), "borrowings": latest.get("borrowings"),
            "unit": "million THB", "source_url": latest.get("source_url"), "page_url": latest.get("page_url"),
            "fetched_at": st.get("fetched_at"), "from_cache": bool(st.get("from_cache")), "note": st.get("note"),
            "history": [{"date": h["date"], "oil": h["oil"], "lpg": h["lpg"], "total": h["total"]} for h in c.get("history", [])]}


def build_fuel_payload(structure: dict | None, status: dict | None, structure_history_csv: Path = C.EPPO_STRUCTURE_HISTORY_CSV,
                       retail_daily_csv: Path = C.EPPO_RETAIL_DAILY_CSV) -> dict:
    status = status or {}
    st_struct = status.get("eppo_price_structure", {}) or {}
    fuels = {}
    if structure:
        for f in FUELS:
            if f in structure.get("products", {}):
                fuels[f] = breakdown(structure["products"][f])
    # Recent daily history of the levy and retail price per fuel (the project's own snapshots).
    recent = {}
    if Path(structure_history_csv).exists():
        h = pd.read_csv(structure_history_csv)
        for f in FUELS:
            sub = h[h["product"] == f].sort_values("date")
            recent[f] = [{"date": r["date"], "oil_fund": _r(r["oil_fund"], 2), "retail": _r(r["retail"], 2), "discount": _r(r.get("discount"), 2) if "discount" in sub else None} for _, r in sub.iterrows()]
    return {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "structure": {"date": (structure or {}).get("date"), "title": (structure or {}).get("title"), "fuels": fuels,
                      "source": "EPPO, โครงสร้างราคาขายปลีกน้ำมัน (oil-structure-prices API)", "from_cache": bool(st_struct.get("from_cache")),
                      "fetched_at": st_struct.get("fetched_at"), "note": st_struct.get("note"), "vat_rate": C.VAT_RATE,
                      "all_checks_ok": bool(fuels) and all(v["checks_ok"] for v in fuels.values())},
        "discount": DISCOUNT_MEANING,
        "recent": recent,
        "levy": levy_history(),
        "levy_status": {k: status.get("oil_fund_monthly", {}).get(k) for k in ("fetched_at", "from_cache", "last_obs", "note")},
        "fund": fund_status(source_status=status.get("oil_fund_status")),
        "volumes": {"available": False, "note": "No official monthly sales volume by fuel with a stable download was found (Department of Energy Business publishes quarterly summaries in press releases); the monthly cost of the subsidy is therefore not estimated."},
    }


def run_fuel(ds, json_path: Path = C.FUEL_JSON, write: bool = True) -> dict:
    payload = build_fuel_payload(ds.price_structure, ds.status)
    if write:
        Path(json_path).parent.mkdir(parents=True, exist_ok=True)
        Path(json_path).write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    return payload
