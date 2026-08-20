#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MakeHuman の人体メッシュ（演者モーションモデル Phase 3 の資産）を実測して、
舞台スケッチ（stage-sketch.js）の肉付け定数の根拠を出す。

なぜこれが要るか
----------------
stage-sketch.js の TORSO_RINGS / NECK_RINGS / LIMB_TAPER は手で調整した値で、
「それらしく見える」ところまでは来ているが、実際の人体の断面ではない。
別プロジェクト apps/Analyze-app/performer-motion-model は MakeHuman 1.3.0 から
CC0 の人体メッシュ（13,380頂点・163ボーンのスキニング済み）を持っていて、
そこには本物の肉付きが入っている。**その断面を測って舞台スケッチへ移す。**

読み込むもの（読むだけ。相手のプロジェクトのファイルは一切書き換えない）
  phase3-viewer/data/body-skin.json … レイアウトとボーン名の並び
  phase3-viewer/data/body-skin.bin  … 頂点座標・スキンウェイト（Aポーズ静止形）
  phase3-viewer/data/makehuman-body-rest.json … 骨格・床の高さ・身長

出す単位
  すべて**身長比**。stage-sketch.js の joints / TORSO_RINGS と同じ尺度。
  座標系も一致している（Y上・+Z＝演者の正面・+X＝演者の左）。

使い方
  /usr/bin/python3 tools/measure_makehuman_body.py
"""

import json
import os
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# iCloud 上の相対位置。別マシンでも同じ構成で並んでいる前提
DATA = os.path.normpath(os.path.join(
    HERE, "..", "..", "..", "apps", "Analyze-app",
    "performer-motion-model", "phase3-viewer", "data"))


def load():
    meta = json.load(open(os.path.join(DATA, "body-skin.json"), encoding="utf-8"))
    rest = json.load(open(os.path.join(DATA, "makehuman-body-rest.json"), encoding="utf-8"))
    raw = open(os.path.join(DATA, "body-skin.bin"), "rb").read()
    lay = meta["layout"]

    def block(name, fmt):
        d = lay[name]
        n = d["count"]
        vals = struct.unpack_from("<%d%s" % (n, fmt), raw, d["offset"])
        k = d["itemSize"]
        return [vals[i:i + k] for i in range(0, n, k)]

    pos = block("position", "f")
    skin_i = block("skinIndex", "H")
    skin_w = block("skinWeight", "f")
    return meta, rest, pos, skin_i, skin_w


def dominant_bone(meta, skin_i, skin_w):
    """頂点ごとに、いちばん強く引かれているボーン名。部位分けに使う。
    （胴の断面を測るとき、腕の肉を混ぜないため。混ぜると肩幅が実際の1.5倍になる）"""
    bones = meta["bones"]
    out = []
    for idx, wts in zip(skin_i, skin_w):
        best, bw = 0, -1.0
        for b, w in zip(idx, wts):
            if w > bw:
                bw, best = w, b
        out.append(bones[best] if best < len(bones) else "")
    return out


def part_of(bone):
    """ボーン名 → 大まかな部位。MakeHuman の default skeleton の命名に従う。"""
    if bone.startswith(("upperarm", "lowerarm", "wrist", "shoulder")) or "finger" in bone \
            or bone.startswith("metacarpal") or bone.startswith("hand"):
        return ("armL" if bone.endswith(".L") else "armR") if bone.endswith((".L", ".R")) else "arm"
    if bone.startswith(("upperleg", "lowerleg", "foot", "toe")):
        return ("legL" if bone.endswith(".L") else "legR") if bone.endswith((".L", ".R")) else "leg"
    if bone.startswith(("head", "eye", "jaw", "tongue", "orbicularis", "levator",
                        "risorius", "oculi", "oris", "temporalis", "special")):
        return "head"
    if bone.startswith("neck"):
        return "neck"
    return "torso"   # spine / pelvis / breast / clavicle / root


def main():
    meta, rest, pos, skin_i, skin_w = load()
    height = rest["heightUnits"]
    floor = rest["floorY"]
    dom = dominant_bone(meta, skin_i, skin_w)
    parts = [part_of(b) for b in dom]

    # 身長比へ。x/z は身長で割るだけ（原点は体の中心＝x=0, z=0 のまま）
    def norm(p):
        return (p[0] / height, (p[1] - floor) / height, p[2] / height)

    V = [norm(p) for p in pos]

    bones = rest["bones"]

    def bone_head(name):
        h = bones[name]["head"]
        return (h[0] / height, (h[1] - floor) / height, h[2] / height)

    print("== 骨格の基準点（身長比・stage-sketch.js の joints と同じ尺度）==")
    key_pts = {
        "頭頂(head tail)": bones["head"]["tail"],
        "head": bones["head"]["head"],
        "neck01": bones["neck01"]["head"],
        "clavicle.L": bones["clavicle.L"]["head"],
        "upperarm01.L(肩関節)": bones["upperarm01.L"]["head"],
        "lowerarm01.L(肘)": bones["lowerarm01.L"]["head"],
        "wrist.L": bones.get("wrist.L", bones["lowerarm02.L"])["tail"],
        "upperleg01.L(股関節)": bones["upperleg01.L"]["head"],
        "lowerleg01.L(膝)": bones["lowerleg01.L"]["head"],
        "foot.L(足首)": bones["foot.L"]["head"],
        "spine05(腰の付け根)": bones["spine05"]["head"],
    }
    for k, v in key_pts.items():
        x, y, z = v[0] / height, (v[1] - floor) / height, v[2] / height
        print("  %-22s x=%+.3f y=%.3f z=%+.3f" % (k, x, y, z))

    # ---- 胴の断面（高さで薄切りにして、左右の張り出しと前後の厚みを測る）----
    print("\n== 胴＋首＋頭の断面（身長比の半径）==")
    print("  y      halfX   halfZ   部位（頂点数）")
    trunk = [i for i, p in enumerate(parts) if p in ("torso", "neck", "head")]
    ys = [V[i][1] for i in trunk]
    lo, hi = min(ys), max(ys)
    steps = 44
    rows = []
    for s in range(steps + 1):
        y = lo + (hi - lo) * s / steps
        band = (hi - lo) / steps * 0.6
        sel = [i for i in trunk if abs(V[i][1] - y) < band]
        if len(sel) < 12:
            continue
        hx = max(abs(V[i][0]) for i in sel)
        hz = (max(V[i][2] for i in sel) - min(V[i][2] for i in sel)) / 2
        cz = (max(V[i][2] for i in sel) + min(V[i][2] for i in sel)) / 2
        tag = {}
        for i in sel:
            tag[parts[i]] = tag.get(parts[i], 0) + 1
        rows.append((y, hx, hz, cz, tag))
        print("  %.3f  %.4f  %.4f  cz=%+.4f  %s" % (
            y, hx, hz, cz, " ".join("%s:%d" % kv for kv in sorted(tag.items()))))

    # ---- 手足の太さ（骨に沿って、断面の平均半径）----
    print("\n== 手足の太さ（骨に沿った位置 t → 身長比の半径）==")
    chains = {
        "腕(肩→肘→手首)": [("upperarm01.L", "lowerarm01.L"), ("lowerarm01.L", "wrist.L")],
        "脚(股→膝→足首)": [("upperleg01.L", "lowerleg01.L"), ("lowerleg01.L", "foot.L")],
    }
    for label, segs in chains.items():
        print("  --", label)
        want = "armL" if "腕" in label else "legL"
        pts = [i for i, p in enumerate(parts) if p == want]
        for a, b in segs:
            pa = bone_head(a)
            pb = bone_head(b) if b in bones else (
                lambda t: (t[0] / height, (t[1] - floor) / height, t[2] / height))(bones["lowerarm02.L"]["tail"])
            ax = tuple(pb[k] - pa[k] for k in range(3))
            L = sum(c * c for c in ax) ** 0.5
            ax = tuple(c / L for c in ax)
            for s in range(0, 11):
                t = s / 10
                sel = []
                for i in pts:
                    d = tuple(V[i][k] - pa[k] for k in range(3))
                    proj = sum(d[k] * ax[k] for k in range(3))
                    if abs(proj / L - t) < 0.055:
                        rad = sum((d[k] - proj * ax[k]) ** 2 for k in range(3)) ** 0.5
                        sel.append(rad)
                if len(sel) < 8:
                    continue
                sel.sort()
                # 外周をなぞる線なので、外側寄り（p75）を代表値にする。
                # 平均だと骨に近い頂点に引かれて細く出る
                p75 = sel[int(len(sel) * 0.75)]
                print("     %s→%s t=%.1f  r=%.4f (n=%d, 最大%.4f)"
                      % (a, b, t, p75, len(sel), sel[-1]))

    # ---- 頭・手・足の実寸 ----
    print("\n== 頭・手・足 ==")
    for name, key in (("頭", "head"), ("腕(手を含む)", "armL"), ("脚(足を含む)", "legL")):
        sel = [i for i, p in enumerate(parts) if p == key]
        if not sel:
            continue
        xs = [V[i][0] for i in sel]
        ys2 = [V[i][1] for i in sel]
        zs = [V[i][2] for i in sel]
        print("  %-12s x[%+.3f,%+.3f] y[%.3f,%.3f] z[%+.3f,%+.3f]"
              % (name, min(xs), max(xs), min(ys2), max(ys2), min(zs), max(zs)))

    # 手（指を含む）と足（つま先）だけを取り出す
    hand = [i for i, b in enumerate(dom)
            if b.endswith(".L") and (b.startswith(("finger", "metacarpal")) or "wrist" in b)]
    if hand:
        ys3 = [V[i][1] for i in hand]
        print("  手(指・L)      y[%.3f,%.3f] 長さ%.3f" % (min(ys3), max(ys3), max(ys3) - min(ys3)))
    foot = [i for i, b in enumerate(dom) if b.startswith(("foot.L", "toe")) and b.endswith(".L")]
    if foot:
        zs3 = [V[i][2] for i in foot]
        ys4 = [V[i][1] for i in foot]
        print("  足(甲・つま先L) z[%+.3f,%+.3f] 前後%.3f / 厚み%.3f"
              % (min(zs3), max(zs3), max(zs3) - min(zs3), max(ys4) - min(ys4)))


if __name__ == "__main__":
    sys.exit(main())
