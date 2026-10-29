#!/usr/bin/env python3
"""Extract the documented passages from the archived MusicXML editions.

Usage: python3 scripts/score-import/prepare-tchaikovsky-hits.py OUT_DIR
No notes are composed, transposed, simplified, or corrected here.
"""
import copy
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
import zipfile

SOURCES = Path(__file__).parent / "sources" / "tchaikovsky-hits"
PASSAGES = [
    ("tchaikovsky-swan-lake", "swan-theme", 1, 27),
    ("tchaikovsky-sugar-plum-fairy", "sugar-plum", 1, 28),
    ("tchaikovsky-waltz-of-flowers-4hands", "waltz-flowers", 34, 65),
]


def extract(destination):
    for source, name, first, last in PASSAGES:
        with zipfile.ZipFile(SOURCES / (source + ".mxl")) as archive:
            container = ET.fromstring(archive.read("META-INF/container.xml"))
            entry = container.find(".//{*}rootfile").get("full-path")
            root = ET.fromstring(archive.read(entry))
        for part in root.findall("part"):
            attributes = copy.deepcopy(part.find("measure/attributes"))
            for measure in list(part):
                if measure.tag == "measure" and not first <= int(measure.get("number")) <= last:
                    part.remove(measure)
            measures = part.findall("measure")
            assert len(measures) == last - first + 1
            if measures[0].find("attributes") is None:
                measures[0].insert(0, attributes)
            # Local numbering keeps musicxml2ly's bar checks consistent. The
            # library restores the source bar number with startMeasure.
            for number, measure in enumerate(measures, 1):
                measure.set("number", str(number))
        folder = destination / name
        folder.mkdir(parents=True, exist_ok=True)
        ET.ElementTree(root).write(folder / (name + ".musicxml"), encoding="utf-8", xml_declaration=True)
        print(f"{name}: source measures {first}-{last}")


if __name__ == "__main__":
    extract(Path(sys.argv[1]))
