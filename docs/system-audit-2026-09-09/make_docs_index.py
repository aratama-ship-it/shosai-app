#!/usr/bin/env python3
"""docs/INDEX.md を docs/ の実ファイルから作り直す（C-4）。判断を含まないので夜間タスク向き。
使い方: python3 docs/system-audit-2026-09-09/make_docs_index.py   （shosai-app を cwd に）
分類は名前の規則だけで決める。中身は読まない。"""
import re, datetime
from pathlib import Path
DOCS = Path(__file__).resolve().parents[1]
KINDS = [
  ("発注書（WORKORDER）", r"WORKORDER"), ("QA・検証記録", r"^QA_|_TEST|RESULTS"), ("リリース判断・レビュー（HTML）", r"RELEASE|REVIEW|AUDIT|FOLLOWUP"),
  ("仕様・設計（SPEC/DESIGN/HANDOFF）", r"SPEC|DESIGN|HANDOFF|PLAN|MIGRATION|^spec_"), ("バックログ・状態", r"BACKLOG|STATUS|ROADMAP|DECISION|INVITE|CHECKLIST|feature|reachability"),
  ("設計フォルダ（日付付き作業場）", r"-20\d\d-\d\d-\d\d$"),
]
def kind(name):
    for label, pat in KINDS:
        if re.search(pat, name): return label
    return "その他"
def date_of(name):
    m = re.search(r"(20\d\d-\d\d-\d\d)", name); return m.group(1) if m else ""
rows = {}
for p in sorted(DOCS.iterdir()):
    if p.name.startswith(".") or p.name == "INDEX.md": continue
    n = p.name + ("/" if p.is_dir() else "")
    rows.setdefault(kind(p.name) if not p.is_dir() else "設計フォルダ（日付付き作業場）", []).append((date_of(p.name), n))
out = [f"# docs/ 索引（自動生成 {datetime.date.today()}・make_docs_index.py）", "", "名前の規則だけで分類した一覧。採用状態は各文書の冒頭を見る。**この索引は手で直さない**（再生成で消える）。", ""]
for label, _ in KINDS + [("その他", "")]:
    items = rows.get(label)
    if not items: continue
    out += [f"## {label}（{len(items)}）", ""]
    for d, n in sorted(items, key=lambda x: (x[0], x[1]), reverse=True):
        out.append(f"- {d + '　' if d else ''}[{n}]({n})")
    out.append("")
(DOCS / "INDEX.md").write_text("\n".join(out), encoding="utf-8")
print(f"docs/INDEX.md を書き出しました（{sum(len(v) for v in rows.values())} 件）")
