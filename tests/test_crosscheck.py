"""The official TPSO series must agree with the curated quarterly spreadsheet used by the original notebook."""
import pandas as pd
import pytest

from thai_oil_cpi import config as C
from thai_oil_cpi.sync import read_tpso_cache


@pytest.mark.skipif(not C.TPSO_CPI_CSV.exists(), reason="no TPSO cache; run the sync first")
def test_tpso_matches_curated_quarterly():
    long = read_tpso_cache()
    head = long[long.code == "00000"].set_index("month")["index"]
    q = head.groupby(head.index.asfreq("Q")).mean()
    seed = pd.read_excel(C.SEED_CPI_XLSX)
    seed.index = pd.PeriodIndex([s.replace("-Q", "Q") for s in seed["Date"]], freq="Q")
    overlap = q.index.intersection(seed.index)
    assert len(overlap) >= 30
    diff = (q[overlap] - seed.loc[overlap, "CPI_Index"]).abs().max()
    assert diff < 0.02, f"max abs difference {diff}"
