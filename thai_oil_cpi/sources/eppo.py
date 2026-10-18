"""Energy Policy and Planning Office (EPPO), Ministry of Energy.

* ``fetch_retail_prices``   – today's pump prices by brand (JSON, updated daily).
* ``fetch_price_structure`` – today's official price build-up per product:
                              ex-refinery, excise, municipal tax, Oil Fund,
                              conservation fund, marketing margin, VAT, retail.
* ``fetch_retail_history``  – monthly Bangkok retail prices since 2003
                              (Table 9 of EPPO's petroleum price statistics).
"""
from __future__ import annotations

import io
import json
import re

import pandas as pd

from .http import SourceError, get

RETAIL_URL = "https://www.eppo.go.th/wp-json/oil-api/v1/oil-prices"
STRUCTURE_URL = "https://www.eppo.go.th/wp-json/oil-api/v1/oil-structure-prices"
RETAIL_HISTORY_URL = "https://www.eppo.go.th/wp-content/uploads/2026/04/P09.xls"
OIL_FUND_HISTORY_URL = "https://www.eppo.go.th/wp-content/uploads/2026/04/P07.xls"

# product keys in the retail JSON (per brand prefix) → our names
PRODUCTS = {"gh95": "gasohol95", "gh91": "gasohol91", "e20": "gasohol_e20", "e85": "gasohol_e85",
            "ds": "diesel_b7", "pds": "premium_diesel", "gl95": "ulg95_premium", "dsb20": "diesel_b20"}
STRUCTURE_NAMES = {"GASOHOL95 E10": "gasohol95", "GASOHOL91": "gasohol91", "GASOHOL95 E20": "gasohol_e20",
                   "GASOHOL95 E85": "gasohol_e85", "ULG95 (Premium)": "ulg95_premium", "H-DIESEL": "diesel_b7"}


def _num(x):
    try:
        v = float(str(x).replace(",", ""))
        return v
    except ValueError:
        return None


def fetch_retail_prices() -> dict:
    """{'date': 'YYYY-MM-DD', 'brand': 'ptt', 'prices': {gasohol95: 41.44, ...}, 'brands': {...}}"""
    raw = json.loads(get(RETAIL_URL))
    if raw.get("status") != "success" or "data" not in raw:
        raise SourceError("EPPO retail price payload malformed")
    brands = {}
    for brand, fields in raw["data"].items():
        prices, date = {}, None
        for k, v in fields.items():
            if k.endswith("_date"):
                date = v
                continue
            prod = k.split("_", 2)[-1]
            if prod in PRODUCTS and _num(v) is not None:
                prices[PRODUCTS[prod]] = _num(v)
        if prices:
            brands[brand] = {"date": date, "prices": prices}
    if "ptt" not in brands:
        raise SourceError("EPPO retail prices: no PTT entry")
    ref = brands["ptt"]
    return {"date": ref["date"], "brand": "ptt", "prices": ref["prices"], "brands": brands,
            "last_updated": raw.get("last_updated")}


def fetch_price_structure() -> dict:
    """{'date': 'YYYY-MM-DD', 'products': {gasohol95: {ex_refinery, excise, municipal_tax, oil_fund,
    conservation_fund, wholesale, vat_ws, marketing, vat_mm, retail}, ...}}"""
    raw = json.loads(get(STRUCTURE_URL))
    if raw.get("status") != "success" or "structure_price" not in raw:
        raise SourceError("EPPO price structure payload malformed")
    labels = {str(l["key"]): l["label"].strip() for l in raw.get("structure_label", [])}
    keymap = {"EX-REFIN.": "ex_refinery", "DISCOUNT": "discount", "EXCISE TAX": "excise", "M. TAX": "municipal_tax",
              "OIL FUND": "oil_fund", "CONSV. FUND": "conservation_fund", "WHOLESALE (WS)": "wholesale",
              "VAT (WS)": "vat_ws", "WS&VAT": "ws_vat", "MARKETING MARGIN": "marketing", "VAT (MM)": "vat_mm",
              "RETAIL": "retail"}
    products = {}
    for row in raw["structure_price"]:
        name = str(row.get("1", "")).strip()
        ours = STRUCTURE_NAMES.get(name)
        if not ours:
            continue
        rec = {}
        for k, v in row.items():
            lab = labels.get(k, "")
            if lab in keymap and _num(v) is not None:
                rec[keymap[lab]] = _num(v)
        if "ex_refinery" in rec and "retail" in rec:
            products[ours] = rec
    if "gasohol95" not in products:
        raise SourceError("EPPO price structure: gasohol95 missing")
    return {"date": raw.get("last_updated"), "title": raw.get("post_title"), "products": products}


MONTHS = {m: i + 1 for i, m in enumerate(["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"])}


def fetch_retail_history(url: str = RETAIL_HISTORY_URL) -> pd.DataFrame:
    """Monthly weighted-average Bangkok retail prices (THB/litre) since 2003.

    Columns: ulg95, gasohol91_old, gasohol95, gasohol_e20, gasohol_e85, gasohol91, kerosene, diesel_b7.
    """
    raw = get(url, timeout=180)
    try:
        df = pd.read_excel(io.BytesIO(raw), sheet_name=0, header=None)
    except Exception as exc:
        raise SourceError(f"Could not parse EPPO Table 9: {exc}") from exc
    cols = ["ulg95", "ulg91", "gasohol95", "gasohol_e20", "gasohol_e85", "gasohol91", "kerosene", "diesel_b7"]
    rows, year, month = [], None, None
    for _, r in df.iterrows():
        label = " ".join(str(v) for v in r.iloc[:2].tolist() if isinstance(v, str)).upper()
        ym = re.search(r"\b(19|20)(\d{2})\b", label)
        if ym and "(MIN)" in label or (ym and not re.search(r"-[A-Z]{3}", label) and "(" not in label):
            year = int(ym.group(0)); month = None
        mm = re.search(r"-([A-Z]{3})", label)
        if mm and mm.group(1) in MONTHS:
            month = MONTHS[mm.group(1)]
        if "WT.AVG" in label and year and month:
            vals = r.iloc[1:1 + len(cols)].tolist()
            rec = {"month": pd.Period(year=year, month=month, freq="M")}
            for c, v in zip(cols, vals):
                rec[c] = _num(v) if v == v else None  # NaN check
            rows.append(rec)
    if not rows:
        raise SourceError("EPPO Table 9 layout changed: no monthly WT.AVG rows found")
    out = pd.DataFrame(rows).drop_duplicates("month").set_index("month").sort_index()
    return out


def fetch_oil_fund_history(url: str = OIL_FUND_HISTORY_URL) -> pd.DataFrame:
    """Monthly Oil Fund levy per litre (THB; negative = subsidy) since 2001, Table 7.

    Columns: ulg95, ugr91, gasohol95, gasohol_e20, gasohol_e85, gasohol91, kerosene, diesel_hd, diesel_b7, diesel.
    ``diesel`` splices the pre-B7 high-speed diesel column with B7 so the regime series is continuous.
    """
    raw = get(url, timeout=180)
    try:
        df = pd.read_excel(io.BytesIO(raw), sheet_name=0, header=None)
    except Exception as exc:
        raise SourceError(f"Could not parse EPPO Table 7: {exc}") from exc
    cols = ["ulg95", "ugr91", "gasohol95", "gasohol_e20", "gasohol_e85", "gasohol91", "kerosene", "diesel_hd", "diesel_b7"]
    rows, year = [], None
    for _, r in df.iterrows():
        label = str(r.iloc[0]).strip().upper()
        if re.fullmatch(r"(19|20)\d{2}", label):
            year = int(label); continue
        if label in MONTHS and year:
            vals = r.iloc[1:1 + len(cols)].tolist()
            rec = {"month": pd.Period(year=year, month=MONTHS[label], freq="M")}
            for c, v in zip(cols, vals):
                rec[c] = _num(v) if v == v else None
            rows.append(rec)
    if not rows:
        raise SourceError("EPPO Table 7 layout changed: no monthly rows found")
    out = pd.DataFrame(rows).drop_duplicates("month").set_index("month").sort_index()
    out["diesel"] = out["diesel_b7"].combine_first(out["diesel_hd"])
    return out
