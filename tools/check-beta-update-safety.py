#!/usr/bin/env python3
"""Stage Sketch beta review gate; read-only, no deploy or automatic approval."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

WARNING = """【舞台スケッチ・ベータ更新の互換性警告】
既存機能（音楽パネル等）が使えなくなる変更、保存済みプロジェクトを
破損・欠落させる変更は、防止策と検証が完了するまでベータへ反映できません。
影響・防止策・検証結果・未確認事項を本人にも必ず表示してください。
"""
CHECKS = (
    "existing_features", "project_roundtrip", "audio_continuity",
    "storage_failure_safety", "update_and_rollback", "target_browsers",
)


def file_hash(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def fingerprint(candidate):
    if not candidate.is_dir() or candidate.is_symlink():
        raise ValueError("配布候補は実在する通常のディレクトリを指定してください")
    entries = []
    for path in sorted(candidate.rglob("*")):
        if path.is_symlink():
            raise ValueError("配布候補のシンボリックリンクは検証できません")
        if path.is_dir():
            continue
        if not path.is_file():
            raise ValueError("通常ファイル以外が配布候補に含まれています")
        entries.append([path.relative_to(candidate).as_posix(), file_hash(path)])
    if not entries:
        raise ValueError("配布候補が空です")
    return hashlib.sha256(json.dumps(entries, ensure_ascii=True).encode()).hexdigest()


def validate_review(candidate, review_path):
    candidate = candidate.resolve()
    review_path = review_path.resolve()
    if review_path.is_relative_to(candidate):
        raise ValueError("確認記録は配布候補の外へ置いてください")
    review = json.loads(review_path.read_text(encoding="utf-8"))
    if not isinstance(review, dict):
        raise ValueError("確認記録はJSONオブジェクトで指定してください")
    if review.get("candidate_sha256") != fingerprint(candidate):
        raise ValueError("配布候補が確認記録と一致しません。変更後の内容で再検証してください")
    if review.get("warning_presented") is not True:
        raise ValueError("本人への警告の記録がありません")
    reference = review.get("current_beta_reference")
    if not isinstance(reference, str) or not reference.strip():
        raise ValueError("公開中ベータの比較基準が未記録です")
    checks = review.get("checks")
    if not isinstance(checks, dict) or any(checks.get(key) is not True for key in CHECKS):
        raise ValueError("既存機能・旧プロジェクト・音楽・保存失敗・更新復旧・ブラウザの確認が未完了です")
    if review.get("unresolved_risks") != []:
        raise ValueError("未解決リスクが残っているか、確認されていません")
    evidence = review.get("evidence")
    if not isinstance(evidence, list) or not evidence:
        raise ValueError("検証結果の証拠ファイルが必要です")
    for item in evidence:
        if not isinstance(item, dict) or not isinstance(item.get("path"), str) or not item["path"].strip():
            raise ValueError("証拠ファイルの指定が不正です")
        path = (review_path.parent / item["path"]).resolve()
        if path.is_relative_to(candidate) or path == review_path:
            raise ValueError("証拠は確認記録とは別に、配布候補の外へ置いてください")
        if not path.is_file() or path.stat().st_size == 0 or file_hash(path) != item.get("sha256"):
            raise ValueError("証拠ファイルが欠落・空、または確認時から変更されています")


def main():
    print(WARNING, file=sys.stderr, flush=True)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", type=Path, required=True)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--fingerprint", action="store_true")
    mode.add_argument("--review", type=Path)
    args = parser.parse_args()
    try:
        if args.candidate.is_symlink():
            raise ValueError("配布候補のシンボリックリンクは検証できません")
        if args.fingerprint:
            print(fingerprint(args.candidate))
            print("ハッシュ取得のみ。ベータ更新の通過判定ではありません。", file=sys.stderr)
        else:
            if args.review is None:
                raise ValueError("確認記録がありません。BETA_UPDATE_SAFETY.mdに従って検証してください")
            validate_review(args.candidate, args.review)
            print("PASS: 配布候補と確認記録・証拠の一致を確認しました。公開許可や無欠陥の保証ではありません。")
        return 0
    except (OSError, ValueError, RuntimeError) as error:
        print(f"STOP: ベータ更新を停止 — {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
