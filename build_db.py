#!/usr/bin/env python3
"""制作の書斎: クライアント用索引 db.js を正本データから生成する。

- 正本: ../show-reference/data/*.json （読み取りのみ。書き込まない）
- 配信しない: drafts/ element_drafts/ review_queue.md candidates.json research_intake.json
- 再生成: cd shosai-app && python3 build_db.py
"""

import json
import datetime
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "show-reference" / "data"
OUT = HERE / "db.js"


def load(name):
    with open(DATA / name, encoding="utf-8") as f:
        return json.load(f)


# ジャンル大分類: genre/show_type/media_type/company のキーワードから導出（先勝ち）
# 正本には書き戻さない。分類はUI絞り込み用の便宜であり、確定情報ではない。
CATEGORY_RULES = [
    ("ミュージックビデオ", ["music_video"]),
    ("映画・映像", ["film", "documentary", "movie"]),
    ("メディアアート・テクノロジー", ["media_art", "rhizomatiks", "elevenplay", "tech_driven", "audiovisual", "teamlab", "digital_art"]),
    ("展示・インスタレーション", ["exhibition", "installation"]),
    ("オペラ", ["opera"]),
    ("伝統芸能", ["kabuki", "noh_", "bunraku", "rakugo"]),
    # `conte` は contemporary に部分一致するため使わない。
    ("コント・お笑い", ["sketch_comedy", "rahmens", "ラーメンズ", "お笑い", "kajalla", "potsunen"]),
    ("クラウン・道化", ["clown"]),
    ("サーカス・アクロバット", [
        "circus", "cirque", "cirk", "circo", "big_top", "acrobat", "juggling",
        "diabolo", "aerial", "highwire", "tightwire", "trapeze",
        "fingers", "gandini", "akoreacro", "baro d'evel", "recirquel",
        "machine de cirque", "flip fabrique", "circa", "defracto", "colporteurs",
        "upswing", "mimbre", "compagnie 111",
    ]),
    ("ミュージカル", ["musical", "broadway", "takarazuka", "宝塚"]),
    ("式典・イベントショー", ["ceremony", "olympic", "paralympic", "festival", "anniversary", "halftime", "super_bowl"]),
    ("ダンス・舞踊", ["ballet", "butoh", "dance", "danza", "tanztheater"]),
    ("マジック・イリュージョン", ["magic", "illusion", "mindfreak"]),
    ("水上・氷上ショー", ["aquatic", "water", "on_ice", "ice_show", "figure_skating", "ice_dance"]),
    ("没入型・体験", ["immersive", "site_specific", "participatory"]),
    ("音楽・コンサート", ["concert", "music_tribute", "song"]),
    ("演劇", ["theatre", "theater", "drama", "_play", "comedy", "teatro"]),
    ("バラエティ・キャバレー", ["cabaret", "variety", "revue"]),
]


# サーカス内サブ分類（先勝ち）。該当なしは「その他サーカス」
CIRCUS_SUB_RULES = [
    ("クルーズ・カジノ常設", ["cruise", "casino"]),
    ("キャバレー・バラエティ系", ["cabaret", "variety", "revue", "dinner"]),
    ("屋外・ストリート", ["outdoor", "street", "public_space", "site_specific", "urban", "promenade"]),
    ("ジャグリング・オブジェクト", ["juggling", "diabolo", "gandini", "defracto", "jay gilligan"]),
    ("綱・ワイヤー系", ["highwire", "tightwire", "colporteurs", "funambul"]),
    ("ビッグトップ・大規模", [
        "big_top", "chapiteau", "arena", "resident", "stadium", "cirque du soleil", "dragone",
    ]),
    ("現代サーカス", [
        "contemporary", "nouveau", "fingers", "éloize", "eloize", "putyka", "akoreacro",
        "baro d'evel", "recirquel", "machine de cirque", "flip fabrique", "circa", "casus",
        "barely methodical", "nofit", "inextremiste", "phare", "upswing", "mimbre",
        "compagnie 111", "gravity & other myths", "company 2",
    ]),
]


def subcategorize(hay):
    for label, keys in CIRCUS_SUB_RULES:
        if any(k in hay for k in keys):
            return label
    return "その他サーカス"


def categorize(w):
    hay = " ".join(
        str(w.get(k) or "")
        for k in ("genre", "show_type", "media_type", "company", "venue_type", "tour_or_resident")
    ).lower()
    # opera house / operation / cooperation 等を「オペラ」と誤認しない
    hay = hay.replace("opera_house", "").replace("opera house", "")
    hay = re.sub(r"\S*operat\S*", " ", hay)
    if not hay.strip():
        return "その他・未分類"
    # MVは楽曲・映像・振付を含むため、映画や音楽カテゴリより先に独立させる。
    if "music_video" in str(w.get("media_type") or "").lower():
        return "ミュージックビデオ"
    # genre自体がミュージカル（かつサーカスでない）なら、会社等の語より優先する
    g = str(w.get("genre") or "").lower()
    show_type = str(w.get("show_type") or "").lower()
    if "musical" in g and "circus" not in g and "cirque" not in g:
        return "ミュージカル"
    # 式典自体は制作会社や技法より優先する。ただし opening ceremony を含む
    # サーカス作品（Effervescence等）はサーカスとして残す。
    event_hay = f"{g} {show_type}"
    event_keys = ("ceremon", "olympic", "paralympic", "world_cup", "fifa", "halftime", "super_bowl", "cruise_ship")
    if any(k in event_hay for k in event_keys) and "circus" not in g and "cirque" not in g:
        return "式典・イベントショー"
    if "figure_skating" in g or "ice_dance" in g or "ice_show" in g:
        return "水上・氷上ショー"
    # ライブ公演は会場説明に immersive / sphere 等を含んでも、作品の主形式を優先する。
    if g.startswith(("stadium_concert", "arena_concert", "concert_residency")):
        return "音楽・コンサート"
    for label, keys in CATEGORY_RULES:
        if any(k in hay for k in keys):
            return label
    return "その他・未分類"


# 分類規則の変更で既知作品が大移動しないための最小回帰チェック。
CATEGORY_EXPECTATIONS = {
    "show_cds_kooza": "サーカス・アクロバット",
    "show_finzi_sochi_olympic_closing": "式典・イベントショー",
    "show_finzi_turin_olympic_closing": "式典・イベントショー",
    "show_eloize_effervescence": "サーカス・アクロバット",
    "show_mv_perfume_fake_it": "ミュージックビデオ",
    "show_mv_valentino_khan_deep_down_low": "ミュージックビデオ",
    "show_live_u2_uv_sphere_2023": "音楽・コンサート",
}


# 演出構造の横断レンズ: 正本の既存メモに明示された文だけから導出する。
# これは作品の本質を分類する正本項目ではなく、資料棚をめくるための「見方」。
# 根拠文もそのまま出力し、推測で補わない。
STAGING_LENS_RULES = [
    {
        "id": "opening",
        "label": "開幕をつくる",
        "description": "最初の数分で、世界・儀礼・ルールを置く",
        "pattern": r"opening ceremony|\bopening\b|開幕",
        "fields": ("show_type", "structure", "signature_scenes"),
    },
    {
        "id": "entrance",
        "label": "登場を設計する",
        "description": "人物・物・集団を、現れ方そのものとして見せる",
        "pattern": r"\bentrance\b|\benter(?:s|ed|ing)?\b|\bemerge(?:s|d|ing)?\b|\breveal(?:s|ed|ing)?\b|登場|出現|暗闇から.*現れ|霧の中から.*現れ",
        "fields": ("structure", "signature_scenes", "set_mechanics", "lighting_features"),
    },
    {
        "id": "surface",
        "label": "場を変える",
        "description": "舞台・氷面・競技面を、別の世界として扱う",
        "pattern": r"舞台を変|空間を変|氷面|競技面|コート面|\bice rink\b|\bcourt\b|\bfloor\b|projection.*(?:stage|ice|rink|court|floor)|(?:stage|ice|rink|court|floor).*projection",
        "fields": ("structure", "signature_scenes", "set_mechanics", "lighting_features"),
        "feature_ids": ("transforming-stage-surface",),
    },
    {
        "id": "audience",
        "label": "観客を巻き込む",
        "description": "観るだけでない役割を、客席へ明示的に渡す",
        "pattern": r"audience participation|\bparticipatory\b|\binteractive\b|\binvit(?:e|es|ed|ing|ation)\b.*\baudience\b|\baudience\b.*\binvit|観客参加|参加型|観客.*(?:招|誘)|客席.*(?:招|誘|参加)|観衆.*(?:招|誘|参加)",
        "fields": ("structure", "signature_scenes", "audience_experience"),
    },
    {
        "id": "closing",
        "label": "終わりを残す",
        "description": "終幕・別れ・余韻を、最後の場面として設計する",
        "pattern": r"closing ceremony|\bclosing\b|\bfinale\b|\bfarewell\b|閉会|終演",
        "fields": ("show_type", "structure", "signature_scenes"),
    },
]

FIELD_LABELS = {
    "show_type": "作品種別",
    "structure": "構造",
    "signature_scenes": "象徴的な場面",
    "set_mechanics": "装置・機構",
    "lighting_features": "照明",
    "audience_experience": "観客体験",
    "staging_features": "演出特徴",
}

# 「参加形式は未確認」のような注意書きは、参加の根拠には使わない。
NON_EVIDENCE_TEXT = re.compile(
    r"未確認|未調査|not confirmed|unknown|明記しない|確定しない|根拠にはしない|同一視しない|登録しない|有無.*(?:確定|不明)",
    re.IGNORECASE,
)


def staging_lenses_for(work):
    """既存の正本メモから、根拠付きの横断レンズを作る。"""
    lenses = []
    for rule in STAGING_LENS_RULES:
        matcher = re.compile(rule["pattern"], re.IGNORECASE)
        evidence = []
        for field in rule["fields"]:
            value = work.get(field)
            values = value if isinstance(value, list) else [value]
            for text in values:
                if not text:
                    continue
                text = str(text)
                if matcher.search(text) and not NON_EVIDENCE_TEXT.search(text):
                    evidence.append({"field": field, "label": FIELD_LABELS[field], "text": text})
        for assignment in work.get("staging_features", []):
            if assignment.get("feature_id") not in rule.get("feature_ids", ()):
                continue
            text = str(assignment.get("note") or "")
            if text and not NON_EVIDENCE_TEXT.search(text):
                evidence.append({"field": "staging_features", "label": FIELD_LABELS["staging_features"], "text": text})
        if evidence:
            lenses.append({
                "id": rule["id"],
                # 一作品に同種の記述が多数ある場合も、詳細で読める量に絞る。
                "evidence": evidence[:2],
            })
    return lenses


def validate_staging_lenses(works):
    allowed = {rule["id"] for rule in STAGING_LENS_RULES}
    counts = {lens_id: 0 for lens_id in allowed}
    for work in works:
        for lens in work.get("staging_lenses", []):
            if lens["id"] not in allowed:
                raise ValueError(f"unknown staging lens: {lens['id']}")
            if not lens.get("evidence"):
                raise ValueError(f"staging lens without evidence: {work['id']} / {lens['id']}")
            for item in lens["evidence"]:
                if item.get("field") not in FIELD_LABELS or not item.get("text"):
                    raise ValueError(f"invalid staging evidence: {work['id']} / {lens['id']}")
            counts[lens["id"]] += 1
    missing = [lens_id for lens_id, count in counts.items() if count == 0]
    if missing:
        raise ValueError("staging lens validation failed: no matches for " + ", ".join(missing))
    return counts


def validate_categories(works):
    by_id = {w["id"]: w for w in works}
    errors = []
    for work_id, expected in CATEGORY_EXPECTATIONS.items():
        if work_id not in by_id:
            continue
        actual = by_id[work_id].get("category")
        if actual != expected:
            errors.append(f"{work_id}: expected {expected}, got {actual}")
    comedy_count = sum(w.get("category") == "コント・お笑い" for w in works)
    if comedy_count > 50:
        errors.append(f"コント・お笑いが{comedy_count}件。部分一致による誤分類の可能性")
    if errors:
        raise ValueError("category validation failed: " + "; ".join(errors))


def main():
    ri = load("reference_index.json")
    ei = load("element_index.json")
    er = load("element_relations.json")
    sf = load("staging_features.json")
    pi = load("person_index.json")

    works = ri["references"]  # 全項目そのまま（表示が目的のため削らない）

    def extract_links(obj, out):
        # 正本の全文字列からURLを拾う（現状0件だが、将来追記されたら自動で表示に乗る）
        if isinstance(obj, str):
            out.extend(re.findall(r"https?://[^\s\"'）)】>]+", obj))
        elif isinstance(obj, list):
            for x in obj:
                extract_links(x, out)
        elif isinstance(obj, dict):
            for x in obj.values():
                extract_links(x, out)

    for w in works:
        w["category"] = categorize(w)
        urls = []
        extract_links(w, urls)
        if urls:
            w["links"] = sorted(set(urls))
        if w["category"] == "サーカス・アクロバット":
            hay = " ".join(
                str(w.get(k) or "")
                for k in ("genre", "show_type", "media_type", "company", "venue_type", "tour_or_resident")
            ).lower()
            w["subcategory"] = subcategorize(hay)
        w["staging_lenses"] = staging_lenses_for(w)

    validate_categories(works)
    staging_lens_counts = validate_staging_lenses(works)

    from collections import Counter
    cat_dist = Counter(w["category"] for w in works)
    print("category distribution:")
    for c, n in cat_dist.most_common():
        print(f"  {n:3d}  {c}")
    sub_dist = Counter(w.get("subcategory") for w in works if w.get("subcategory"))
    print("circus subcategory distribution:")
    for c, n in sub_dist.most_common():
        print(f"  {n:3d}  {c}")
    print("staging lens coverage (source-backed notes only):")
    for rule in STAGING_LENS_RULES:
        print(f"  {staging_lens_counts[rule['id']]:3d}  {rule['label']}")

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
        "staging_lenses": [
            {
                "id": rule["id"],
                "label": rule["label"],
                "description": rule["description"],
                "works_count": staging_lens_counts[rule["id"]],
            }
            for rule in STAGING_LENS_RULES
        ],
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
