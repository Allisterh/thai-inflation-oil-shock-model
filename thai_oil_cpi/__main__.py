"""Command line: python -m thai_oil_cpi {sync|run|serve}"""
from __future__ import annotations

import argparse
import json
import logging
import sys


def main(argv=None):
    parser = argparse.ArgumentParser(prog="thai_oil_cpi", description="Thai oil-shock → CPI model")
    sub = parser.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("sync", help="fetch the latest oil, FX and CPI data into data/cache")
    s.add_argument("--force", action="store_true", help="ignore cache freshness")
    r = sub.add_parser("run", help="sync, re-estimate the model and write results/ and web/data/latest.json")
    r.add_argument("--force", action="store_true")
    r.add_argument("--no-sync", action="store_true", help="use cached data only")
    r.add_argument("--offline", action="store_true", help="never touch the network")
    v = sub.add_parser("serve", help="run the web app")
    v.add_argument("--host", default="127.0.0.1")
    v.add_argument("--port", type=int, default=8000)
    v.add_argument("--reload", action="store_true")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    if args.cmd == "sync":
        from .sync import sync_all
        print(json.dumps(sync_all(force=args.force), indent=2))
    elif args.cmd == "run":
        from .pipeline import run
        p = run(sync=not args.no_sync, force=args.force, offline=args.offline)
        cur = p["current"]
        print(f"generated {p['generated_at']}; sample {p['model']['sample']}")
        print(f"Brent {cur.get('brent_latest')} USD/bbl on {cur.get('brent_latest_date')}; "
              f"quarter-to-date shock {cur.get('shock_qtd_pct', float('nan')):.1f}%")
        print("wrote web/data/latest.json and results/*.csv")
    elif args.cmd == "serve":
        import uvicorn
        uvicorn.run("thai_oil_cpi.app:app", host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    sys.exit(main())
