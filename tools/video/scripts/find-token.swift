// Reads every PNG in a folder with macOS's Vision text recognition and prints the ones that show
// the page's address, which carries the session token. Used by check-token.mjs.
// Usage: swift scripts/find-token.swift <folder>
import Foundation
import Vision
import AppKit

let folder = CommandLine.arguments[1]
let files = try FileManager.default.contentsOfDirectory(atPath: folder).filter { $0.hasSuffix(".png") }.sorted()
for file in files {
  let url = URL(fileURLWithPath: folder).appendingPathComponent(file)
  guard let image = NSImage(contentsOf: url), let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = false
  try VNImageRequestHandler(cgImage: cg).perform([request])
  let text = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
  if text.contains("127.0.0.1") || text.contains("#t=") || text.contains("http://127") {
    print(file)
  }
}
