// LongForm L4: maska osoby przez Apple Vision (VNGeneratePersonSegmentationRequest, .accurate).
// Użycie: longform-mask <wideo> <od s> <do s> <katalog wyjścia>
// Wynik: <katalog>/000001.png… (maska 8-bit w natywnej rozdzielczości Vision; skalowanie robi FFmpeg),
// na stdout JSON-y: {"type":"start","total":N,"pts":s,"width":w,"height":h}, {"type":"progress","done":i,"total":N}, {"type":"done",...}.
// Wygładzanie w czasie: EMA (α = 0,6) + dylatacja 3×3 (1 px w rozdzielczości maski).
import AVFoundation
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

func emit(_ obj: [String: Any]) {
  let data = try! JSONSerialization.data(withJSONObject: obj)
  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write("\n".data(using: .utf8)!)
}
func fail(_ msg: String) -> Never {
  FileHandle.standardError.write((msg + "\n").data(using: .utf8)!)
  exit(1)
}

let args = CommandLine.arguments
guard args.count == 5, let from = Double(args[2]), let to = Double(args[3]), to > from else {
  fail("Użycie: longform-mask <wideo> <od> <do> <katalog>")
}
let outDir = URL(fileURLWithPath: args[4])
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let sema = DispatchSemaphore(value: 0)
nonisolated(unsafe) var track: AVAssetTrack?
nonisolated(unsafe) var fps: Float = 30
Task {
  track = try? await asset.loadTracks(withMediaType: .video).first
  if let t = track { fps = (try? await t.load(.nominalFrameRate)) ?? 30 }
  sema.signal()
}
sema.wait()
guard let videoTrack = track else { fail("Brak ścieżki wideo") }

let reader = try! AVAssetReader(asset: asset)
reader.timeRange = CMTimeRange(start: CMTime(seconds: from, preferredTimescale: 600), end: CMTime(seconds: to, preferredTimescale: 600))
let output = AVAssetReaderTrackOutput(track: videoTrack, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
output.alwaysCopiesSampleData = false
reader.add(output)
guard reader.startReading() else { fail("AVAssetReader: \(reader.error?.localizedDescription ?? "?")") }

let total = Int(((to - from) * Double(fps)).rounded())
let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = .accurate
request.outputPixelFormat = kCVPixelFormatType_OneComponent8

var prev: [Float] = []
var n = 0
var started = false
let t0 = Date()
let gray = CGColorSpaceCreateDeviceGray()

while let sample = output.copyNextSampleBuffer() {
  guard let pixels = CMSampleBufferGetImageBuffer(sample) else { continue }
  let pts = CMSampleBufferGetPresentationTimeStamp(sample).seconds
  if pts < from - 0.5 / Double(fps) { continue }
  if pts >= to - 0.5 / Double(fps) { break }
  try! VNImageRequestHandler(cvPixelBuffer: pixels, options: [:]).perform([request])
  guard let mask = request.results?.first?.pixelBuffer else { fail("Vision nie zwrócił maski (klatka \(n + 1))") }
  CVPixelBufferLockBaseAddress(mask, .readOnly)
  let w = CVPixelBufferGetWidth(mask)
  let h = CVPixelBufferGetHeight(mask)
  let stride = CVPixelBufferGetBytesPerRow(mask)
  let base = CVPixelBufferGetBaseAddress(mask)!.assumingMemoryBound(to: UInt8.self)
  if !started {
    emit(["type": "start", "total": total, "pts": pts, "width": w, "height": h, "fps": Double(fps)])
    started = true
  }
  if prev.count != w * h { prev = [Float](repeating: -1, count: w * h) }
  // EMA w czasie (α = 0,6 dla nowej klatki), pierwsza klatka bez historii
  for y in 0..<h {
    for x in 0..<w {
      let v = Float(base[y * stride + x])
      let i = y * w + x
      prev[i] = prev[i] < 0 ? v : 0.6 * v + 0.4 * prev[i]
    }
  }
  CVPixelBufferUnlockBaseAddress(mask, .readOnly)
  // dylatacja 3×3: osoba nie traci włosów/krawędzi ubrania przy skalowaniu w górę
  var bytes = [UInt8](repeating: 0, count: w * h)
  for y in 0..<h {
    for x in 0..<w {
      var m: Float = 0
      for dy in -1...1 {
        let yy = min(h - 1, max(0, y + dy))
        for dx in -1...1 { m = max(m, prev[yy * w + min(w - 1, max(0, x + dx))]) }
      }
      bytes[y * w + x] = UInt8(min(255, max(0, m.rounded())))
    }
  }
  n += 1
  let provider = CGDataProvider(data: Data(bytes) as CFData)!
  let image = CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 8, bytesPerRow: w, space: gray, bitmapInfo: CGBitmapInfo(rawValue: 0), provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent)!
  let file = outDir.appendingPathComponent(String(format: "%06d.png", n))
  let dest = CGImageDestinationCreateWithURL(file as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, image, nil)
  guard CGImageDestinationFinalize(dest) else { fail("Nie zapisano \(file.path)") }
  emit(["type": "progress", "done": n, "total": max(total, n)])
}
if reader.status == .failed { fail("AVAssetReader: \(reader.error?.localizedDescription ?? "?")") }
emit(["type": "done", "frames": n, "seconds": Date().timeIntervalSince(t0)])
