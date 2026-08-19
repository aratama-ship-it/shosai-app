// 制作の書斎 — アプリアイコン生成器
//
// 意匠の根拠（style.css 冒頭の設計方針に合わせる）:
//   「書斎らしさは木目や革の模倣ではなく、背表紙の縦書きと明朝の問いで作る。」
//   暗い机の色＝資料・根拠の側、生成りの紙＝本人の制作の側。
//   よって、暗い背表紙が並ぶ棚の中に、紙色の背表紙を一本だけ立てる。
//   縦書き明朝「書斎」を箔押しの罫で挟み、栞の紅を一点だけ上へ覗かせる。
//
// 使い方: swift tools/make_app_icon.swift <出力ディレクトリ>

import AppKit
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

// ---- 色（style.css の :root と同じ値）----
func rgb(_ hex: UInt32, _ a: CGFloat = 1) -> CGColor {
  CGColor(srgbRed: CGFloat((hex >> 16) & 0xff) / 255,
          green: CGFloat((hex >> 8) & 0xff) / 255,
          blue: CGFloat(hex & 0xff) / 255,
          alpha: a)
}
let cDesk      = rgb(0x191512)   // --desk
let cDesk2     = rgb(0x201b16)   // --desk-2
let cDesk3     = rgb(0x282119)   // --desk-3
let cBoard     = rgb(0x14100e)   // 棚板の見付け（--desk より一段暗い）
let cLineDark  = rgb(0x382f25)   // --line-dark
let cPaper     = rgb(0xefe7d6)   // --paper
let cPaper2    = rgb(0xe7dcc5)   // --paper-2
let cInk       = rgb(0x2b2620)   // --ink
let cBrass     = rgb(0x9c823f)   // --brass
let cRust      = rgb(0xa84b26)   // --rust

// ---- 版面（1024 の画布に 824 のスクワークル）----
let CANVAS: CGFloat = 1024
let INSET: CGFloat = 100          // 824 = 1024 - 100*2
let A: CGFloat = (CANVAS - INSET * 2) / 2

// スクワークル（超楕円 n=5。macOS のアイコン形状に近い）
func squirclePath(cx: CGFloat, cy: CGFloat, a: CGFloat, n: CGFloat = 5) -> CGPath {
  let p = CGMutablePath()
  let steps = 720
  for i in 0...steps {
    let t = CGFloat(i) / CGFloat(steps) * 2 * .pi
    let ct = cos(t), st = sin(t)
    let x = cx + a * (ct < 0 ? -1 : 1) * pow(abs(ct), 2 / n)
    let y = cy + a * (st < 0 ? -1 : 1) * pow(abs(st), 2 / n)
    if i == 0 { p.move(to: CGPoint(x: x, y: y)) } else { p.addLine(to: CGPoint(x: x, y: y)) }
  }
  p.closeSubpath()
  return p
}

// ---- 背表紙の並び（座標は 824 の面の中。左上原点で考え、描画時に反転）----
struct Spine { let x: CGFloat; let w: CGFloat; let top: CGFloat; let fill: CGColor }
let SHELF_Y: CGFloat = 700        // 棚板の天端
let TOP_BOARD_Y: CGFloat = 96     // 上の棚板の下端

let spines: [Spine] = [
  Spine(x:  96, w: 108, top: 268, fill: rgb(0x3a3227)),
  Spine(x: 218, w:  86, top: 300, fill: rgb(0x2a241d)),
  Spine(x: 318, w: 152, top: 214, fill: cPaper),      // ← 制作の側。一本だけ紙色
  Spine(x: 484, w:  94, top: 288, fill: rgb(0x453a2a)),
  Spine(x: 592, w: 136, top: 252, fill: rgb(0x2f2820)),
]
let PAPER_INDEX = 2

// ---- 明朝の字形をパスで取り出す（フォント差に依存させない）----
func glyphPath(_ ch: Character, font: CTFont) -> CGPath? {
  let s = Array(String(ch).utf16)
  var glyphs = [CGGlyph](repeating: 0, count: s.count)
  guard CTFontGetGlyphsForCharacters(font, s, &glyphs, s.count) else { return nil }
  return CTFontCreatePathForGlyph(font, glyphs[0], nil)
}

func mincho(_ size: CGFloat) -> CTFont {
  for name in ["HiraMinProN-W6", "HiraMinProN-W3", "YuMincho-Demibold", "ToppanBunkyuMincho-Regular"] {
    let f = CTFontCreateWithName(name as CFString, size, nil)
    if (CTFontCopyPostScriptName(f) as String).hasPrefix(String(name.prefix(6))) { return f }
  }
  return CTFontCreateWithName("HiraMinProN-W6" as CFString, size, nil)
}

// 字を指定の正方形へ、実測の外接矩形で光学的に合わせる
func drawGlyph(_ ctx: CGContext, _ ch: Character, boxCX: CGFloat, boxCY: CGFloat, boxSize: CGFloat, color: CGColor) {
  let font = mincho(1000)
  guard let path = glyphPath(ch, font: font) else { return }
  let bb = path.boundingBoxOfPath
  let scale = boxSize / max(bb.width, bb.height)
  var t = CGAffineTransform.identity
    .translatedBy(x: boxCX, y: boxCY)
    .scaledBy(x: scale, y: scale)
    .translatedBy(x: -bb.midX, y: -bb.midY)
  guard let moved = path.copy(using: &t) else { return }
  ctx.addPath(moved)
  ctx.setFillColor(color)
  ctx.fillPath()
}

// ---- 本体の描画（上下は CoreGraphics の y 上向きへ変換して使う）----
// yUp(v): 左上原点 v を、面の中の y 上向き座標へ
func yUp(_ v: CGFloat) -> CGFloat { (A * 2) - v }

func drawIcon(_ ctx: CGContext, px: CGFloat) {
  let scale = px / CANVAS
  ctx.scaleBy(x: scale, y: scale)

  // 詳細度: 小さい寸法では字と細部を落とし、輪郭で読ませる
  let detail: Int = px >= 128 ? 2 : (px >= 48 ? 1 : 0)

  let clip = squirclePath(cx: CANVAS / 2, cy: CANVAS / 2, a: A)

  // 影（macOS の並びに馴染ませる）
  ctx.saveGState()
  ctx.setShadow(offset: CGSize(width: 0, height: -12), blur: 28, color: rgb(0x000000, 0.38))
  ctx.addPath(clip); ctx.setFillColor(cDesk); ctx.fillPath()
  ctx.restoreGState()

  ctx.saveGState()
  ctx.addPath(clip); ctx.clip()
  ctx.translateBy(x: INSET, y: INSET)   // 以降は 824 の面の座標（y 上向き）

  // 机の地（背表紙の後ろ）。棚の奥は机の色より一段暗い
  ctx.setFillColor(rgb(0x100d0b))
  ctx.fill(CGRect(x: 0, y: 0, width: A * 2, height: A * 2))

  // 上の棚板（下端に細い罫）
  ctx.setFillColor(cBoard)
  ctx.fill(CGRect(x: 0, y: yUp(TOP_BOARD_Y), width: A * 2, height: TOP_BOARD_Y))
  ctx.setFillColor(cLineDark)
  ctx.fill(CGRect(x: 0, y: yUp(TOP_BOARD_Y) - 4, width: A * 2, height: 4))

  // 背表紙
  for (i, s) in spines.enumerated() {
    let h = SHELF_Y - s.top
    let r = CGRect(x: s.x, y: yUp(SHELF_Y), width: s.w, height: h)
    ctx.setFillColor(s.fill)
    ctx.fill(r)
    if i == PAPER_INDEX {
      // 紙の厚みの陰（右端）
      ctx.setFillColor(cPaper2)
      ctx.fill(CGRect(x: s.x + s.w - 16, y: r.minY, width: 16, height: h))
      // 天の小口
      ctx.setFillColor(rgb(0xd8c9ab))
      ctx.fill(CGRect(x: s.x, y: r.maxY - 7, width: s.w, height: 7))
    } else {
      // 暗い背表紙は、左辺の細い明かりと右辺の陰で分ける
      ctx.setFillColor(rgb(0x5b4e3b))
      ctx.fill(CGRect(x: s.x, y: r.minY, width: 4, height: h))
      ctx.setFillColor(rgb(0x000000, 0.45))
      ctx.fill(CGRect(x: s.x + s.w - 8, y: r.minY, width: 8, height: h))
      // 天の小口（薄暗い紙）
      ctx.setFillColor(rgb(0x6b6152))
      ctx.fill(CGRect(x: s.x, y: r.maxY - 5, width: s.w, height: 5))
      // 褪せた箔の題字（資料の側。読ませず、本であることだけ伝える）
      if detail >= 1 {
        ctx.setFillColor(rgb(0x9c823f, 0.55))
        let bw = min(s.w - 34, CGFloat(46))
        let bx = s.x + (s.w - bw) / 2
        let by = s.top + 66
        ctx.fill(CGRect(x: bx, y: yUp(by), width: bw, height: 4))
        ctx.fill(CGRect(x: bx, y: yUp(by + 14), width: bw, height: 4))
      }
    }
  }

  let p = spines[PAPER_INDEX]
  let pcx = p.x + p.w / 2

  // 栞（紅を一点だけ、天から覗かせる）
  if detail >= 1 {
    ctx.setFillColor(cRust)
    ctx.fill(CGRect(x: pcx + 30, y: yUp(p.top) - 6, width: 24, height: 52))
    // 小口の影で、紙に差し込まれて見えるようにする
    ctx.setFillColor(rgb(0x6f2f16))
    ctx.fill(CGRect(x: pcx + 30, y: yUp(p.top) - 6, width: 24, height: 6))
  }

  // 箔押しの罫（上下二本ずつ）
  if detail >= 1 {
    ctx.setFillColor(cBrass)
    for y in [CGFloat(292), 306, 632, 646] {
      ctx.fill(CGRect(x: p.x + 22, y: yUp(y), width: p.w - 44, height: 5))
    }
  }

  // 縦書き明朝「書斎」
  if detail >= 2 {
    drawGlyph(ctx, "書", boxCX: pcx, boxCY: yUp(414), boxSize: 96, color: cInk)
    drawGlyph(ctx, "斎", boxCX: pcx, boxCY: yUp(530), boxSize: 96, color: cInk)
  }

  // 棚板
  ctx.setFillColor(cBoard)
  ctx.fill(CGRect(x: 0, y: 0, width: A * 2, height: yUp(SHELF_Y)))
  ctx.setFillColor(cBrass)
  ctx.fill(CGRect(x: 0, y: yUp(SHELF_Y) - 6, width: A * 2, height: 6))

  // 机の面と同じ、ごく弱い光の減衰（body::before に合わせる）
  if let sp = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                         colors: [rgb(0x000000, 0), rgb(0x000000, 0.30)] as CFArray,
                         locations: [0.62, 1.0]) {
    ctx.saveGState()
    ctx.drawRadialGradient(sp,
      startCenter: CGPoint(x: A, y: A * 2), startRadius: 0,
      endCenter: CGPoint(x: A, y: A * 2), endRadius: A * 2.1,
      options: [.drawsAfterEndLocation])
    ctx.restoreGState()
  }
  ctx.restoreGState()

  // 縁の一本罫（形を締める）
  ctx.addPath(clip)
  ctx.setStrokeColor(rgb(0xffffff, 0.06))
  ctx.setLineWidth(3)
  ctx.strokePath()
}

func render(px: Int, to url: URL) {
  let cs = CGColorSpace(name: CGColorSpace.sRGB)!
  guard let ctx = CGContext(data: nil, width: px, height: px, bitsPerComponent: 8,
                            bytesPerRow: 0, space: cs,
                            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return }
  ctx.setAllowsAntialiasing(true)
  ctx.interpolationQuality = .high
  drawIcon(ctx, px: CGFloat(px))
  guard let img = ctx.makeImage(),
        let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)
  else { return }
  CGImageDestinationAddImage(dest, img, nil)
  CGImageDestinationFinalize(dest)
  print("  \(url.lastPathComponent)")
}

// ---- SVG 用に字形パスを吐く ----
func svgPath(for ch: Character, boxCX: CGFloat, boxCY: CGFloat, boxSize: CGFloat) -> String {
  let font = mincho(1000)
  guard let path = glyphPath(ch, font: font) else { return "" }
  let bb = path.boundingBoxOfPath
  let scale = boxSize / max(bb.width, bb.height)
  // SVG は y 下向き。y を反転して合わせる
  var t = CGAffineTransform.identity
    .translatedBy(x: boxCX, y: boxCY)
    .scaledBy(x: scale, y: -scale)
    .translatedBy(x: -bb.midX, y: -bb.midY)
  guard let moved = path.copy(using: &t) else { return "" }
  var d = ""
  func f(_ v: CGFloat) -> String { String(format: "%.2f", v) }
  moved.applyWithBlock { e in
    let pts = e.pointee.points
    switch e.pointee.type {
    case .moveToPoint:         d += "M\(f(pts[0].x)) \(f(pts[0].y))"
    case .addLineToPoint:      d += "L\(f(pts[0].x)) \(f(pts[0].y))"
    case .addQuadCurveToPoint: d += "Q\(f(pts[0].x)) \(f(pts[0].y)) \(f(pts[1].x)) \(f(pts[1].y))"
    case .addCurveToPoint:     d += "C\(f(pts[0].x)) \(f(pts[0].y)) \(f(pts[1].x)) \(f(pts[1].y)) \(f(pts[2].x)) \(f(pts[2].y))"
    case .closeSubpath:        d += "Z"
    @unknown default: break
    }
  }
  return d
}

// ---- 実行 ----
let out = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ".")
try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)

if CommandLine.arguments.contains("--glyphs") {
  let p = spines[PAPER_INDEX]
  let pcx = p.x + p.w / 2 + INSET
  print("SHO:\(svgPath(for: "書", boxCX: pcx, boxCY: 414 + INSET, boxSize: 96))")
  print("SAI:\(svgPath(for: "斎", boxCX: pcx, boxCY: 530 + INSET, boxSize: 96))")
} else {
  print("制作の書斎 アイコンを書き出します → \(out.path)")
  for px in [16, 32, 64, 128, 180, 192, 256, 512, 1024] {
    render(px: px, to: out.appendingPathComponent("shosai-app-\(px).png"))
  }
}
