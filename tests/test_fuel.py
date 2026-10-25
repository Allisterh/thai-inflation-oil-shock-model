"""Oil Fund and pump-price tracker: arithmetic checks, the no-support formula, source failure handling,
and the Oil Fund Office PDF parser."""
import json
from pathlib import Path

import pytest

from thai_oil_cpi import config as C
from thai_oil_cpi.fuel import FUELS, TOL, breakdown, build_fuel_payload, fund_status
from thai_oil_cpi.sources.offo import list_reports, parse_status_pdf

FIX = Path(__file__).parent / "fixtures"


def _structure():
    p = C.EPPO_STRUCTURE_JSON
    if not p.exists():
        pytest.skip("no cached EPPO price structure")
    return json.loads(p.read_text())


def test_components_add_up_to_eppo_retail_for_every_fuel():
    s = _structure()
    for f in FUELS:
        rec = s["products"][f]
        b = breakdown(rec)
        assert b["checks_ok"], (f, b["checks"], b["residuals"])
        assert abs(sum(b["parts"].values()) - rec["retail"]) <= TOL, f


def test_no_support_formula_reproduces_eppo_wholesale_and_retail():
    s = _structure()
    vat = 1 + C.VAT_RATE
    for f in FUELS:
        r = s["products"][f]
        ws = r["ex_refinery"] + r.get("discount", 0.0) + r["excise"] + r["municipal_tax"] + r["oil_fund"] + r["conservation_fund"]
        assert abs(ws - r["wholesale"]) <= TOL, f
        assert abs(ws * vat + r["marketing"] * vat - r["retail"]) <= TOL, f
        b = breakdown(r)
        # removing the levy removes levy × 1.07 (VAT is charged on the wholesale price, which contains it);
        # published figures are rounded to the satang
        assert abs(b["without_oil_fund"] - (r["retail"] - r["oil_fund"] * vat)) <= 0.005 + 1e-9
        if r.get("discount"):
            assert abs(b["without_support"] - (r["retail"] - (r["oil_fund"] + r["discount"]) * vat)) <= 0.005 + 1e-9
        else:
            assert b["without_support"] is None


def test_breakdown_withholds_derived_prices_when_arithmetic_fails():
    bad = {"ex_refinery": 30.0, "excise": 6.0, "municipal_tax": 0.6, "oil_fund": -1.0, "conservation_fund": 0.05,
           "wholesale": 35.65, "vat_ws": 2.4955, "marketing": 3.0, "vat_mm": 0.21, "retail": 45.0}   # retail does not match
    b = breakdown(bad)
    assert not b["checks_ok"] and "without_oil_fund" not in b


def test_failed_source_keeps_last_good_value_with_its_date(tmp_path):
    cache = tmp_path / "offo.json"
    cache.write_text(json.dumps({"latest": {"date": "2026-10-18", "oil": -62359, "lpg": -41202, "total": -103561, "borrowings": None, "source_url": "u"},
                                 "history": [{"date": "2026-10-11", "oil": -60821, "lpg": -40860, "total": -101681}, {"date": "2026-10-18", "oil": -62359, "lpg": -41202, "total": -103561}]}))
    failed = {"fetched_at": "2026-10-01T00:00:00+00:00", "from_cache": True, "note": "source failed; using the last good weekly sheet", "errors": ["timeout"]}
    f = fund_status(cache_path=cache, source_status=failed)
    assert f["total"] == -103561 and f["date"] == "2026-10-18" and f["from_cache"] is True and len(f["history"]) == 2
    # and the structure block says so too when EPPO failed
    s = _structure()
    pay = build_fuel_payload(s, {"eppo_price_structure": {"from_cache": True, "fetched_at": "x", "note": "source failed; using cached structure"}}, structure_history_csv=tmp_path / "none.csv")
    assert pay["structure"]["from_cache"] is True and pay["structure"]["date"] == s["date"] and pay["structure"]["fuels"]
    assert fund_status(cache_path=tmp_path / "missing.json") is None


def test_offo_pdf_parser_reads_net_position_and_borrowings():
    data = (FIX / "offo_fund_status_2026-10-18.pdf").read_bytes()
    p = parse_status_pdf(data)
    assert p["net"] == {"oil": -62359.0, "lpg": -41202.0, "total": -103561.0}
    assert p["borrowings"]["total"] == 37497.0
    assert p["as_of_text"] == "2026-10-18"


def test_offo_report_listing_picks_newest_pdf_and_skips_images():
    html = '''<a href="https://www.offo.or.th/sites/default/files/estimate/files/%E0%B8%90%E0%B8%B2%E0%B8%99%E0%B8%B0%E0%B8%81%E0%B8%AD%E0%B8%87%E0%B8%97%E0%B8%B8%E0%B8%99%20%E0%B8%AA%E0%B9%88%E0%B8%87%20%E0%B8%AA%E0%B8%99%E0%B8%9E%2069-10-11.pdf">a</a>
              <a href="https://www.offo.or.th/sites/default/files/estimate/files/69-10-18.png">img</a>
              <a href="https://www.offo.or.th/sites/default/files/estimate/files/%E0%B8%AA%E0%B8%B4%E0%B9%89%E0%B8%99%E0%B8%AA%E0%B8%B8%E0%B8%94%20%E0%B8%93%20%E0%B8%A7%E0%B8%B1%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%2016%20%E0%B8%AA%E0%B8%B4%E0%B8%87%E0%B8%AB%E0%B8%B2%E0%B8%84%E0%B8%A1%202569.pdf">b</a>'''
    r = list_reports(html)
    assert [x["date"] for x in r] == ["2026-10-11", "2026-08-16"]
