"""Parser tests on small in-repo fixtures (no network)."""
import json

import pandas as pd
import pytest

from thai_oil_cpi.sources import eppo, tpso


def test_tpso_flatten_and_wide():
    payload = [
        {"commodityCode": "00000", "commodityNameTH": "รวม", "commodityNameEN": "ALL COMMODITIES", "children": [],
         "years": [{"year": 2569, "months": [
             {"month": 9, "index": 102.93, "change": 0.25, "changeYear": 2.82, "weightBar": 100.0, "weightCurrent": 100.0},
             {"month": 8, "index": 102.67, "change": 0.56, "changeYear": 2.53, "weightBar": 100.0, "weightCurrent": 100.0}]}]},
        {"commodityCode": "90000", "commodityNameTH": "", "commodityNameEN": "RAW FOOD AND ENERGY",
         "years": [], "children": [
             {"commodityCode": "92000", "commodityNameTH": "พลังงาน", "commodityNameEN": "ENERGY", "children": [],
              "years": [{"year": 2569, "months": [{"month": 9, "index": 104.87, "weightCurrent": 13.09, "weightBar": 12.9},
                                                   {"month": 8, "index": None}]}]}]},
    ]
    rows = []
    for node, parent in tpso._flatten(payload):
        for y in node.get("years") or []:
            for m in y.get("months") or []:
                if m.get("index") is not None:
                    rows.append({"code": node["commodityCode"], "parent": parent, "name_en": node["commodityNameEN"],
                                 "month": pd.Period(year=y["year"] - 543, month=m["month"], freq="M"),
                                 "index": m["index"], "weight_current": m.get("weightCurrent")})
    df = pd.DataFrame(rows)
    assert set(df.code) == {"00000", "92000"}
    assert df[df.code == "92000"].parent.iloc[0] == "90000"
    w = tpso.wide(df)
    assert list(w.columns) == ["headline", "energy"] or set(w.columns) == {"headline", "energy"}
    assert w.loc[pd.Period("2026-09", freq="M"), "energy"] == 104.87
    assert tpso.latest_weights(df)["energy"] == 13.09


def test_eppo_structure_parser(monkeypatch):
    sample = {"status": "success", "last_updated": "2026-10-15",
              "structure_label": [{"label": "รายการ", "key": 1}, {"label": "EX-REFIN. ", "key": 2}, {"label": "DISCOUNT", "key": 3},
                                  {"label": "EXCISE TAX ", "key": 4}, {"label": "M. TAX ", "key": 5}, {"label": "OIL FUND ", "key": 6},
                                  {"label": "CONSV. FUND ", "key": 7}, {"label": "WHOLESALE (WS)", "key": 8}, {"label": "VAT (WS)", "key": 9},
                                  {"label": "WS&VAT ", "key": 10}, {"label": "MARKETING MARGIN ", "key": 11}, {"label": "VAT (MM)", "key": 12},
                                  {"label": "RETAIL ", "key": 13}],
              "structure_price": [{"1": "GASOHOL95 E10", "2": "29.6882", "3": "", "4": "6.7500", "5": "0.6750", "6": "-1.7800", "7": "0.0500",
                                   "8": "35.3832", "9": "2.4768", "10": "37.8600", "11": "3.3458", "12": "0.2342", "13": "41.44"},
                                  {"1": "H-DIESEL ", "2": "37.1061", "3": "-4.0000", "4": "6.9200", "5": "0.6920", "6": "-2.6400", "7": "0.0500",
                                   "8": "38.1281", "9": "2.6690", "10": "40.7971", "11": "2.0027", "12": "0.1402", "13": "42.94"}]}
    monkeypatch.setattr(eppo, "get", lambda url, **kw: json.dumps(sample).encode())
    out = eppo.fetch_price_structure()
    assert out["date"] == "2026-10-15"
    g = out["products"]["gasohol95"]
    assert g["ex_refinery"] == pytest.approx(29.6882) and g["retail"] == 41.44 and g["oil_fund"] == -1.78
    assert out["products"]["diesel_b7"]["discount"] == -4.0


def test_eppo_retail_parser(monkeypatch):
    sample = {"status": "success", "last_updated": "9 October 2026",
              "data": {"ptt": {"oil_ptt_gh95": "41.44", "oil_ptt_ds": "42.94", "oil_ptt_dsb10": "-", "oil_ptt_date": "2026-10-09", "oil_ptt_time": "05:00"},
                       "shell": {"oil_shell_gh95": "41.94", "oil_shell_date": "2026-10-09"}}}
    monkeypatch.setattr(eppo, "get", lambda url, **kw: json.dumps(sample).encode())
    out = eppo.fetch_retail_prices()
    assert out["date"] == "2026-10-09" and out["prices"] == {"gasohol95": 41.44, "diesel_b7": 42.94}
    assert out["brands"]["shell"]["prices"]["gasohol95"] == 41.94
