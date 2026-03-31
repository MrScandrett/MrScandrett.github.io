#!/usr/bin/env python3

import csv
import io
import json
import math
import re
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "geodata" / "climate"


def fetch_text(url: str) -> str:
    with urllib.request.urlopen(url) as response:
        return response.read().decode("utf-8")


def parse_gistemp_number(value: str):
    value = value.strip()
    if value == "***":
        return None
    if value.startswith("-."):
        value = value.replace("-.", "-0.", 1)
    elif value.startswith("."):
        value = "0" + value
    return float(value)


def write_json(name: str, payload):
    path = OUT_DIR / name
    path.write_text(json.dumps(payload, separators=(",", ":")))
    return path


def build_ch4_monthly():
    url = "https://gml.noaa.gov/webdata/ccgg/trends/ch4/ch4_mm_gl.csv"
    text = fetch_text(url)
    rows = []

    for line in text.splitlines():
        if not line or line.startswith("#"):
            continue
        parts = [part.strip() for part in line.split(",")]
        if not parts or not parts[0].isdigit():
            continue
        rows.append(
            {
                "y": int(parts[0]),
                "m": int(parts[1]),
                "d": round(float(parts[2]), 3),
                "c": round(float(parts[3]), 2),
                "trend": round(float(parts[5]), 2),
            }
        )

    write_json("ch4_monthly.json", rows)
    return {
        "source": "NOAA Global Monitoring Laboratory",
        "url": url,
        "description": "Globally averaged marine surface monthly mean methane abundance",
        "updated_through": f"{rows[-1]['y']}-{rows[-1]['m']:02d}",
    }


def build_sea_ice():
    datasets = [
        (
            "sea_ice_arctic_september_extent_annual.json",
            "Arctic",
            "https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/N_09_extent_v4.0.csv",
        ),
        (
            "sea_ice_antarctic_september_extent_annual.json",
            "Antarctic",
            "https://noaadata.apps.nsidc.org/NOAA/G02135/south/monthly/data/S_09_extent_v4.0.csv",
        ),
    ]

    meta = {}
    for file_name, label, url in datasets:
        text = fetch_text(url)
        reader = csv.DictReader(io.StringIO(text), skipinitialspace=True)
        rows = []
        for row in reader:
            rows.append(
                {
                    "y": int(row["year"]),
                    "m": int(row["mo"]),
                    "extent": round(float(row["extent"]), 2),
                    "area": round(float(row["area"]), 2),
                }
            )

        write_json(file_name, rows)
        meta[file_name] = {
            "source": "NSIDC Sea Ice Index v4",
            "url": url,
            "description": f"{label} September sea ice extent and area",
            "updated_through": str(rows[-1]["y"]),
        }

    return meta


def build_sea_level():
    url = "https://sealevel.nasa.gov/understanding-sea-level/key-indicators/global-mean-sea-level/"
    html = fetch_text(url)
    idx_y = html.find("var chart_y = [")
    idx_x = html.find("var chart_x = [")
    idx_ymax = html.find("var chart_ymax = [")
    if min(idx_y, idx_x, idx_ymax) == -1:
        raise RuntimeError("Could not locate sea level arrays on NASA page")
    chart_y_blob = html[idx_y + len("var chart_y = [") : idx_x].rsplit("]", 1)[0]
    chart_x_blob = html[idx_x + len("var chart_x = [") : idx_ymax].rsplit("]", 1)[0]
    chart_x = [float(x.strip()) for x in chart_x_blob.split(",") if x.strip()]
    chart_y = [float(y.strip()) for y in chart_y_blob.split(",") if y.strip()]
    if len(chart_x) != len(chart_y):
        raise RuntimeError("Sea level array length mismatch")

    rows = []
    for d, mm in zip(chart_x, chart_y):
        year = int(math.floor(d))
        frac = d - year
        month = max(1, min(12, int(round(frac * 12 + 0.5))))
        rows.append({"d": round(d, 4), "y": year, "m": month, "mm": round(mm, 1)})

    write_json("sea_level_global_mean_monthly.json", rows)
    return {
        "source": "NASA Sea Level Change portal",
        "url": url,
        "description": "Global mean sea level monthly series parsed from the public chart data on the NASA page",
        "updated_through": f"{rows[-1]['y']}-{rows[-1]['m']:02d}",
        "note": "The linked raw NASA text download is Earthdata-protected, so this file is normalized from the public page arrays.",
    }


def build_temp_anomaly():
    url = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"
    text = fetch_text(url)
    rows = []

    for line in text.splitlines():
        line = line.strip()
        if not re.match(r"^\d{4},", line):
            continue
        parts = [part.strip() for part in line.split(",")]
        annual = parse_gistemp_number(parts[13])
        if annual is None:
            continue
        rows.append({"y": int(parts[0]), "t": round(annual, 2)})

    write_json("temp_anomaly_annual.json", rows)
    return {
        "source": "NASA GISTEMP v4",
        "url": url,
        "description": "Global annual land-ocean temperature anomaly, J-D column",
        "updated_through": str(rows[-1]["y"]),
    }


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    sources = {}
    sources["ch4_monthly.json"] = build_ch4_monthly()
    sources.update(build_sea_ice())
    sources["sea_level_global_mean_monthly.json"] = build_sea_level()
    sources["temp_anomaly_annual.json"] = build_temp_anomaly()

    (OUT_DIR / "sources.json").write_text(json.dumps(sources, indent=2))

    print("Wrote climate datasets:")
    for name in sources:
        print(OUT_DIR / name)


if __name__ == "__main__":
    main()
