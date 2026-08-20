// 正方形のPNG（スマホ用の全面アイコン）から、macOS のアイコン用PNG一式を書き出す。
//
// スマホのアイコンは全面の正方形で、角丸はOSが被せる。macOS は自分で形を持つので、
// 1024 の画布の中に 824 のスクワークルを置き、その中へ絵を収めて影を付ける。
// これをしないと Dock で他のアプリより一回り大きい四角に見える。
//
// 使い方: swift tools/png_to_macos_icns.swift <元のPNG> <出力ディレクトリ>

import AppKit
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count > 2 else { fputs("usage: <src.png> <outdir>\n", stderr); exit(1) }
let srcURL = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

guard let isrc = CGImageSourceCreateWithURL(srcURL as CFURL, nil),
      let src = CGImageSourceCreateImageAtIndex(isrc, 0, nil) else {
  fputs("元のPNGを読めません: \(srcURL.path)\n", stderr); exit(1)
}

let CANVAS: CGFloat = 1024
let INSET: CGFloat = 100
let A: CGFloat = (CANVAS - INSET * 2) / 2

func squirclePath(cx: CGFloat, cy: CGFloat, a: CGFloat, n: CGFloat = 5) -> CGPath {
  let p = CGMutablePath()
  let steps = 720
  for i in 0...steps {
    let t = CGFloat(i) / CGFloat(steps) * 2 * .pi
    let ct = cos(t), st = sin(t)
    p.addLine(to: CGPoint(x: cx + a * (ct < 0 ? -1 : 1) * pow(abs(ct), 2 / n),
                          y: cy + a * (st < 0 ? -1 : 1) * pow(abs(st), 2 / n)))
    if i == 0 { p.move(to: CGPoint(x: cx + a, y: cy)) }
  }
  p.closeSubpath()
  return p
}

func render(px: Int, to url: URL) {
  let cs = CGColorSpace(name: CGColorSpace.sRGB)!
  guard let ctx = CGContext(data: nil, width: px, height: px, bitsPerComponent: 8,
                            bytesPerRow: 0, space: cs,
                            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return }
  ctx.interpolationQuality = .high
  ctx.scaleBy(x: CGFloat(px) / CANVAS, y: CGFloat(px) / CANVAS)

  let clip = squirclePath(cx: CANVAS / 2, cy: CANVAS / 2, a: A)

  // 影（Dock と Finder で他のアプリと同じ立ち方にする）
  ctx.saveGState()
  ctx.setShadow(offset: CGSize(width: 0, height: -12), blur: 28,
                color: CGColor(srgbRed: 0, green: 0, blue: 0, alpha: 0.38))
  ctx.addPath(clip)
  ctx.setFillColor(CGColor(srgbRed: 0.098, green: 0.082, blue: 0.071, alpha: 1)) // --desk
  ctx.fillPath()
  ctx.restoreGState()

  // 絵をスクワークルへ収める
  ctx.saveGState()
  ctx.addPath(clip); ctx.clip()
  ctx.draw(src, in: CGRect(x: INSET, y: INSET, width: A * 2, height: A * 2))
  ctx.restoreGState()

  // 縁の一本罫
  ctx.addPath(clip)
  ctx.setStrokeColor(CGColor(srgbRed: 1, green: 1, blue: 1, alpha: 0.06))
  ctx.setLineWidth(3)
  ctx.strokePath()

  guard let img = ctx.makeImage(),
        let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)
  else { return }
  CGImageDestinationAddImage(dest, img, nil)
  CGImageDestinationFinalize(dest)
  print("  \(url.lastPathComponent)")
}

print("元: \(srcURL.lastPathComponent) (\(src.width)x\(src.height)) → \(outDir.path)")
for px in [16, 32, 64, 128, 256, 512, 1024] {
  render(px: px, to: outDir.appendingPathComponent("icon-\(px).png"))
}
