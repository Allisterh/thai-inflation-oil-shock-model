"""FastAPI backend: serves the web app and a small JSON API.

Run with ``python -m thai_oil_cpi serve`` (or ``uvicorn thai_oil_cpi.app:app``).
"""
from __future__ import annotations

import asyncio
import json
import logging
import threading
from contextlib import asynccontextmanager

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import config as C
from .pipeline import run
from .projection import household_breakdown, pump_price_change, scenario_path

log = logging.getLogger("thai_oil_cpi")
_state: dict = {"payload": None, "lock": threading.Lock()}
REFRESH_HOURS = C.DEFAULT_MAX_AGE_HOURS


def _load_or_build(sync: bool) -> dict:
    with _state["lock"]:
        if not sync and C.LATEST_JSON.exists():
            payload = json.loads(C.LATEST_JSON.read_text())
        else:
            try:
                payload = run(sync=sync)
            except Exception as exc:
                log.exception("refresh failed: %s", exc)
                if not C.LATEST_JSON.exists():
                    raise
                payload = json.loads(C.LATEST_JSON.read_text())
        _state["payload"] = payload
        return payload


async def _refresh_loop():
    while True:
        await asyncio.sleep(REFRESH_HOURS * 3600)
        try:
            await asyncio.to_thread(_load_or_build, True)
        except Exception as exc:
            log.warning("background refresh failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await asyncio.to_thread(_load_or_build, True)
    except Exception as exc:
        log.warning("initial sync failed: %s", exc)
    task = asyncio.create_task(_refresh_loop())
    yield
    task.cancel()


app = FastAPI(title="Thai oil-shock → cost of living", version="2.0", lifespan=lifespan)


def _payload() -> dict:
    if _state["payload"] is None:
        raise HTTPException(503, "data not ready yet")
    return _state["payload"]


@app.get("/api/latest")
def api_latest():
    return JSONResponse(_payload())


@app.get("/api/status")
def api_status():
    p = _payload()
    return {"generated_at": p["generated_at"], "current": p["current"], "cpi_latest": p["cpi_latest"], "sources": p["sources"]}


@app.post("/api/refresh")
def api_refresh(force: bool = False):
    payload = run(sync=True, force=force)
    _state["payload"] = payload
    return {"generated_at": payload["generated_at"], "sources": payload["sources"]}


@app.get("/api/project")
def api_project(
    shock_pct: float = Query(..., ge=-80, le=200, description="Oil price change in % (log points)"),
    monthly_spend_thb: float = Query(24000, ge=0),
    shock: str = Query(C.PRIMARY_SHOCK, pattern="^(dubai_thb|dubai_usd|brent_usd)$"),
    share_vehicles_fuel: float | None = Query(None, ge=0, le=1),
    share_electricity_fuel_water: float | None = Query(None, ge=0, le=1),
    share_public_transport: float | None = Query(None, ge=0, le=1),
    share_food: float | None = Query(None, ge=0, le=1),
    pump_pass_through: float = Query(1.0, ge=0, le=1.5),
):
    p = _payload()
    irfs = {oc: pd.DataFrame(rows) for oc, rows in p["irfs"][shock].items()}
    paths = {oc: scenario_path(irf, shock_pct) for oc, irf in irfs.items()}
    shares = dict(p["default_shares"])
    for k, v in (("vehicles_fuel", share_vehicles_fuel), ("electricity_fuel_water", share_electricity_fuel_water),
                 ("public_transport", share_public_transport), ("food", share_food)):
        if v is not None:
            shares[k] = v
    shares["other"] = max(0.0, 1 - sum(v for k, v in shares.items() if k != "other"))
    hh = household_breakdown(irfs, paths, monthly_spend_thb, shares)
    nc = p["current"]["nowcast"]
    pump = None
    if nc.get("dubai_spot_nowcast_thb"):
        base = nc["dubai_spot_nowcast_thb"]
        pump = pump_price_change(base, base * (2.718281828 ** (shock_pct / 100)), pass_through=pump_pass_through)
    return {"shock": shock, "shock_pct": shock_pct, "paths": paths, "household": hh, "pump": pump}


@app.get("/")
def index():
    return FileResponse(C.WEB_DIR / "index.html")


app.mount("/", StaticFiles(directory=str(C.WEB_DIR)), name="static")
