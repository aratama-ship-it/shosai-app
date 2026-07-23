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
REFERENCE_ROOT = HERE.parent / "show-reference"
DATA = REFERENCE_ROOT / "data"
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
    event_keys = ("ceremon", "olympic", "paralympic", "world_cup", "fifa", "halftime", "super_bowl", "cruise_ship", "event_show")
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
        "pattern": r"opening[_ -]ceremony|\bopening\b|開幕|開会式",
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
        "pattern": r"closing[_ -]ceremony|\bclosing\b|\bfinale\b|\bfarewell\b|閉会|閉会式|終演",
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


RESEARCH_DEPTH_LEVELS = {
    "deep": {"label": "深掘り済み", "min_score": 10},
    "detailed": {"label": "詳細調査済み", "min_score": 9},
    "standard": {"label": "基本調査済み", "min_score": 6},
    "outline": {"label": "概要中心", "min_score": 0},
    "source_gap": {"label": "出典要確認", "min_score": 0},
}

RESEARCH_AMOUNT_LEVELS = {
    3: {
        "label": "調査レベル3",
        "description": "人物・演出特徴・再利用要素のうち複数まで接続",
        "min_score": 9,
    },
    2: {
        "label": "調査レベル2",
        "description": "出典と作品骨格・複数の制作項目を記録",
        "min_score": 6,
    },
    1: {
        "label": "調査レベル1",
        "description": "概要・基礎情報を中心に記録",
        "min_score": 0,
    },
}


def research_amount_level_for(score, people_count=0, feature_count=0, element_count=0):
    """調査量を3段階で返す。

    レベル3は総合点だけでなく、作品から外部の制作知識へ広く接続されている
    状態を示すため、人物・演出特徴・再利用要素のうち2種類以上を必要とする。
    """
    linked_dimensions = sum((
        people_count > 0,
        feature_count > 0,
        element_count > 0,
    ))
    if score >= RESEARCH_AMOUNT_LEVELS[3]["min_score"] and linked_dimensions >= 2:
        return 3
    if score >= RESEARCH_AMOUNT_LEVELS[2]["min_score"]:
        return 2
    return 1


def has_content(work, field):
    value = work.get(field)
    if isinstance(value, list):
        return any(bool(item) for item in value)
    return bool(value)


def research_depth_for(work, element_count):
    """DB内の調査記録の厚みを示す。作品価値や外部情報量の評価ではない。"""
    source_file = work.get("source_file")
    source_resolves = bool(source_file and (REFERENCE_ROOT / source_file).exists())
    source_url_count = len(work.get("source_urls", []))
    confidence = str(work.get("confidence") or "").lower()
    primary_evidence = bool(re.search(
        r"official|primary|interview|press|program|report",
        confidence,
        re.IGNORECASE,
    ))
    technical_fields = [
        "set_mechanics",
        "costume_features",
        "lighting_features",
        "music_style",
        "cast_scale",
        "apparatus_or_disciplines",
    ]
    analysis_fields = [
        "useful_for",
        "risk_of_cliche",
        "production_learning",
        "interpretation_notes",
    ]
    technical_count = sum(has_content(work, field) for field in technical_fields)
    analysis_count = sum(has_content(work, field) for field in analysis_fields)
    people_count = len(work.get("people", []))
    feature_count = len(work.get("staging_features", []))

    signals = {
        "source_file": source_resolves,
        "source_url": source_url_count > 0,
        "primary_evidence": primary_evidence,
        "structure": has_content(work, "structure"),
        "signature_scenes": has_content(work, "signature_scenes"),
        "people": people_count > 0,
        "staging_features": feature_count > 0,
        "elements": element_count > 0,
        "technical_breadth": technical_count >= 2,
        "creative_analysis": analysis_count >= 2,
        "uncertainty": has_content(work, "unverified_notes"),
    }
    score = sum(signals.values())
    amount_level = research_amount_level_for(
        score,
        people_count=people_count,
        feature_count=feature_count,
        element_count=element_count,
    )

    explicit_source_constraint_text = " ".join([
        confidence,
        " ".join(map(str, work.get("source_notes", []))),
        " ".join(map(str, work.get("unverified_notes", []))),
    ])
    public_source_constraint = bool(re.search(
        r"unpublished|not published|公開されていない|公開情報.{0,8}(少ない|限定)|"
        r"(個人|制作|全)クレジット.{0,8}未公開",
        explicit_source_constraint_text,
        re.IGNORECASE,
    ))

    if not source_resolves:
        level = "source_gap"
        reason = "深掘り元として指定されたファイルが見つかりません。外部情報が無いという判定ではなく、DB側の参照切れです。"
        next_step = "参照ファイルを復元または正しい出典へ接続してから、深さを再評価する。"
        cause = "参照先の欠損"
    else:
        if score >= RESEARCH_DEPTH_LEVELS["deep"]["min_score"]:
            level = "deep"
        elif score >= RESEARCH_DEPTH_LEVELS["detailed"]["min_score"]:
            level = "detailed"
        elif score >= RESEARCH_DEPTH_LEVELS["standard"]["min_score"]:
            level = "standard"
        else:
            level = "outline"

        missing = []
        if not source_url_count:
            missing.append("個別出典URL")
        if not people_count:
            missing.append("制作人物")
        if not feature_count:
            missing.append("演出特徴")
        if not element_count:
            missing.append("再利用要素")
        if technical_count < 2:
            missing.append("装置・照明・衣装・音楽などの制作項目")
        if analysis_count < 2:
            missing.append("制作分析")

        if amount_level == 3 and level == "deep":
            reason = "出典、構造、制作項目、人物・演出特徴・再利用要素、未確認事項が広く接続されています。"
        elif amount_level == 3:
            reason = "複数の制作項目に加え、人物・演出特徴・再利用要素のうち複数が接続されています。"
        elif amount_level == 2:
            reason = "出典と作品の骨格、複数の制作項目を記録しています。人物や再利用要素には追加調査の余地があります。"
        else:
            reason = "題名・概要・基本的な出典が中心で、制作方法を読むための記録はまだ少ない状態です。"

        if public_source_constraint:
            cause = "公開資料に制約"
            next_step = "公式公開が限定されている項目は断定せず、制作会社資料や信頼できるインタビューを追加探索する。"
        else:
            cause = "十分な記録" if amount_level == 3 and level == "deep" else "追加調査余地"
            next_step = (
                "次に補う: " + "、".join(missing[:3]) + "。"
                if missing else
                "版差、全キュー、技術仕様など、一次資料で確認できる範囲をさらに詰める。"
            )

    return {
        "level": level,
        "label": RESEARCH_AMOUNT_LEVELS[amount_level]["label"],
        "amount_level": amount_level,
        "amount_label": RESEARCH_AMOUNT_LEVELS[amount_level]["label"],
        "amount_description": RESEARCH_AMOUNT_LEVELS[amount_level]["description"],
        "score": score,
        "max_score": len(signals),
        "cause": cause,
        "reason": reason,
        "next_step": next_step,
        "public_source_constraint": public_source_constraint,
        "basis": {
            "source_file_resolves": source_resolves,
            "source_url_count": source_url_count,
            "people_count": people_count,
            "staging_feature_count": feature_count,
            "element_count": element_count,
            "technical_field_count": technical_count,
            "analysis_field_count": analysis_count,
        },
    }


def validate_research_depth(works):
    allowed = set(RESEARCH_DEPTH_LEVELS)
    errors = []
    for work in works:
        depth = work.get("research_depth")
        if not depth or depth.get("level") not in allowed:
            errors.append(f"{work['id']}: missing or invalid research_depth")
            continue
        if depth.get("max_score") != 11 or not 0 <= depth.get("score", -1) <= 11:
            errors.append(f"{work['id']}: invalid research_depth score")
        basis = depth.get("basis") or {}
        expected_amount_level = research_amount_level_for(
            depth.get("score", 0),
            people_count=basis.get("people_count", 0),
            feature_count=basis.get("staging_feature_count", 0),
            element_count=basis.get("element_count", 0),
        )
        if depth.get("amount_level") != expected_amount_level:
            errors.append(f"{work['id']}: invalid research amount level")
        if depth["level"] == "source_gap" and depth["basis"]["source_file_resolves"]:
            errors.append(f"{work['id']}: source_gap despite resolved source file")
    if errors:
        raise ValueError("research depth validation failed: " + "; ".join(errors[:10]))


def main():
    ri = load("reference_index.json")
    ei = load("element_index.json")
    er = load("element_relations.json")
    sf = load("staging_features.json")
    pi = load("person_index.json")

    works = ri["references"]  # 全項目そのまま（表示が目的のため削らない）
    element_counts = {}
    for element in ei.get("elements", []):
        for link in element.get("work_links", []):
            work_id = link.get("work_id")
            if work_id:
                element_counts[work_id] = element_counts.get(work_id, 0) + 1

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
        w["research_depth"] = research_depth_for(w, element_counts.get(w["id"], 0))

    validate_categories(works)
    staging_lens_counts = validate_staging_lenses(works)
    validate_research_depth(works)

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
    depth_dist = Counter(w["research_depth"]["level"] for w in works)
    amount_dist = Counter(w["research_depth"]["amount_level"] for w in works)
    print("research amount distribution (DB record coverage, not work quality):")
    for amount_level in (3, 2, 1):
        print(f"  {amount_dist[amount_level]:3d}  {RESEARCH_AMOUNT_LEVELS[amount_level]['label']}")
    print(f"  {depth_dist['source_gap']:3d}  出典要確認（調査量とは別の警告）")

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
        "research_depth_levels": [
            {
                "id": str(amount_level),
                "label": meta["label"],
                "description": meta["description"],
                "works_count": amount_dist[amount_level],
            }
            for amount_level, meta in RESEARCH_AMOUNT_LEVELS.items()
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
