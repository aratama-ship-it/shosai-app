#!/usr/bin/env python3
"""制作の書斎: クライアント用索引 db.js を正本データから生成する。

- 正本: ../show-reference/data/*.json （読み取りのみ。書き込まない）
- 配信しない: drafts/ element_drafts/ review_queue.md candidates.json research_intake.json
- 再生成: cd shosai-app && python3 build_db.py
"""

import json
import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "show-reference" / "data"
OUT = HERE / "db.js"


def load(name):
    with open(DATA / name, encoding="utf-8") as f:
        return json.load(f)


def main():
    ri = load("reference_index.json")
    ei = load("element_index.json")
    er = load("element_relations.json")
    sf = load("staging_features.json")
    pi = load("person_index.json")

    works = ri["references"]  # 全項目そのまま（表示が目的のため削らない）

    elements = [
        {
            "id": e["id"],
            "label": e.get("label"),
            "label_ja": e.get("label_ja"),
            "type": e.get("type"),
            "subtype": e.get("subtype"),
            "summary": e.get("summary"),
            "work_links": e.get("work_links", []),
            "feature_ids": e.get("feature_ids", []),
            "confidence": e.get("confidence"),
            "status": e.get("status"),
        }
        for e in ei.get("elements", [])
    ]

    element_relations = [
        {
            "relation_type": r.get("relation_type"),
            "from": r.get("from"),
            "to": r.get("to"),
            "similar_axes": r.get("similar_axes", []),
            "different_axes": r.get("different_axes", []),
            "reason": r.get("reason"),
            "confidence": r.get("confidence"),
        }
        for r in er.get("relations", [])
    ]

    persons = {
        p["person_id"]: {
            "name": p.get("name"),
            "name_ja": p.get("name_ja"),
            "roles": p.get("primary_roles", []),
        }
        for p in pi.get("persons", [])
    }

    db = {
        "generated": datetime.date.today().isoformat(),
        "counts": {
            "works": len(works),
            "elements": len(elements),
            "element_relations": len(element_relations),
            "features": len(sf.get("features", [])),
            "persons": len(persons),
        },
        "works": works,
        "work_relations": ri.get("relations", []),
        "elements": elements,
        "element_relations": element_relations,
        "features": sf.get("features", []),
        "feature_categories": sf.get("categories", []),
        "persons": persons,
    }

    body = json.dumps(db, ensure_ascii=False, separators=(",", ":"))
    OUT.write_text(
        "// 自動生成ファイル。手で編集しない。再生成: python3 build_db.py\n"
        "// 正本: show-reference/data/*.json（本アプリからは読み取りのみ）\n"
        f"const SHOSAI_DB = {body};\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT.name}: {OUT.stat().st_size/1024/1024:.2f} MB, counts={db['counts']}")


if __name__ == "__main__":
    main()
