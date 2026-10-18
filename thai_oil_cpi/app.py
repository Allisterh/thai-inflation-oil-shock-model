"""FastAPI backend: serves the web app and a small JSON API.

Run with ``python -m thai_oil_cpi serve`` (or ``uvicorn thai_oil_cpi.app:app``).
The payload is rebuilt from the cache on startup and refreshed in the
background on a timer, so the page always reflects the latest synced oil price.
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
from .projection import household_costs, pump_price_change, scenario_path

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
            except Exception as exc:  # keep serving the previous payload
                log.exception("refresh failed: %s", exc)
                if C.LATEST_JSON.exists():
                    payload = json.loads(C.LATEST_JSON.read_text())
                else:
                    raise
        _state["payload"] = payload
        return payload


async def _refresh_loop():
    while True:
        await asyncio.sleep(REFRESH_HOURS * 3600)
        try:
            await asyncio.to_thread(_load_or_build, True)
            log.info("background refresh complete")
        except Exception as exc:
            log.warning("background refresh failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await asyncio.to_thread(_load_or_build, True)
    except Exception as exc:
        log.warning("initial sync failed, serving cached payload if present: %s", exc)
        if C.LATEST_JSON.exists():
            _state["payload"] = json.loads(C.LATEST_JSON.read_text())
    task = asyncio.create_task(_refresh_loop())
    yield
    task.cancel()


app = FastAPI(title="Thai oil-shock → cost of living", version="1.0", lifespan=lifespan)


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
    return {"generated_at": p["generated_at"], "current": p["current"], "sources": p["sources"]}


@app.post("/api/refresh")
def api_refresh(force: bool = False):
    payload = _load_or_build(sync=True) if not force else run(sync=True, force=True)
    _state["payload"] = payload
    return {"generated_at": payload["generated_at"], "sources": payload["sources"]}


@app.get("/api/project")
def api_project(
    shock_pct: float = Query(..., ge=-80, le=200, description="Oil price change in %"),
    monthly_spend_thb: float = Query(24000, ge=0),
    shock_currency: str = Query("usd", pattern="^(usd|thb)$"),
    pump_pass_through: float = Query(1.0, ge=0, le=1.5),
):
    p = _payload()
    proj = p["projections"].get(shock_currency) or p["projections"]["usd"]
    irf = pd.DataFrame(proj["irf"])
    path = scenario_path(irf, shock_pct)
    cur = p["current"]
    brent = cur.get("brent_latest")
    fx = cur.get("usdthb_latest")
    pump = None
    if brent and fx:
        pump = pump_price_change(brent, brent * (1 + shock_pct / 100), fx, pass_through=pump_pass_through)
    return {"shock_pct": shock_pct, "shock_currency": shock_currency, "path": path,
            "household": household_costs(path, monthly_spend_thb), "pump": pump}


@app.get("/")
def index():
    return FileResponse(C.WEB_DIR / "index.html")


app.mount("/", StaticFiles(directory=str(C.WEB_DIR)), name="static")
