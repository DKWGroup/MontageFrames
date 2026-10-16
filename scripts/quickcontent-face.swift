import Foundation
import Vision
import ImageIO

// Happy News has a green studio wall: the dark frame connects the embedded topic screen.
func topicPanel(_ file: String) -> [[String: Double]] {
  guard let source=CGImageSourceCreateWithURL(URL(fileURLWithPath:file) as CFURL,nil), let image=CGImageSourceCreateImageAtIndex(source,0,nil) else {return []}
  let w=image.width, h=image.height
  var pixels=[UInt8](repeating:0,count:w*h*4)
  guard let context=CGContext(data:&pixels,width:w,height:h,bitsPerComponent:8,bytesPerRow:w*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue) else {return []}
  context.draw(image,in:CGRect(x:0,y:0,width:w,height:h))
  var seen=[Bool](repeating:false,count:w*h), out=[[String:Double]]()
  let x0=Int(Double(w)*0.28), x1=Int(Double(w)*0.72), y1=Int(Double(h)*0.55)
  func eligible(_ x:Int,_ y:Int)->Bool {
    if x<x0 || x>=x1 || y<0 || y>=y1 {return false}
    let i=(y*w+x)*4, r=Double(pixels[i]), g=Double(pixels[i+1]), b=Double(pixels[i+2])
    return !(g>r*1.12 && g>b*1.05 && g>35)
  }
  for y in 0..<y1 {for x in x0..<x1 {
    if seen[y*w+x] || !eligible(x,y) {continue}
    var stack=[y*w+x], loX=x,hiX=x,loY=y,hiY=y,count=0
    seen[y*w+x]=true
    while let p=stack.popLast() {
      let px=p%w,py=p/w
      loX=min(loX,px);hiX=max(hiX,px);loY=min(loY,py);hiY=max(hiY,py);count+=1
      for (nx,ny) in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)] {
        if eligible(nx,ny) && !seen[ny*w+nx] {seen[ny*w+nx]=true;stack.append(ny*w+nx)}
      }
    }
    let bw=Double(hiX-loX+1)/Double(w),bh=Double(hiY-loY+1)/Double(h),cx=Double(loX+hiX)/2/Double(w)
    if loY<Int(Double(h)*0.1) && bw>0.12 && bw<0.5 && bh>0.18 && bh<0.53 && cx>0.35 && cx<0.65 && Double(count)>Double((hiX-loX+1)*(hiY-loY+1))*0.25 {
      out.append(["x":Double(loX)/Double(w),"y":Double(loY)/Double(h),"width":bw,"height":bh])
    }
  }}
  return out
}

// Per frame: faces (top-left origin, fractions) + mouth = inner-lip opening / face height (for speaker detection).
let withPanels = CommandLine.arguments.contains("--with-panels")
var samples = [[[String: Double]]]()
var panels = [[[String: Double]]]()
do {
  for file in CommandLine.arguments.dropFirst().filter({ $0 != "--with-panels" }) {
    let request = VNDetectFaceLandmarksRequest()
    let handler = VNImageRequestHandler(url: URL(fileURLWithPath: file), options: [:])
    try handler.perform([request])
    if withPanels {
      let rectangles = VNDetectRectanglesRequest()
      rectangles.minimumAspectRatio = 0.25
      rectangles.maximumAspectRatio = 1.0
      rectangles.minimumSize = 0.1
      rectangles.minimumConfidence = 0.7
      rectangles.maximumObservations = 12
      try handler.perform([rectangles])
      panels.append(topicPanel(file) + (rectangles.results ?? []).map { r in
        let b = r.boundingBox
        return ["x": Double(b.minX), "y": Double(1-b.maxY), "width": Double(b.width), "height": Double(b.height)]
      })
    }
    samples.append((request.results ?? []).map { face in
      let box = face.boundingBox
      var row = ["x": Double(box.minX), "y": Double(1-box.maxY), "width": Double(box.width), "height": Double(box.height)]
      if let lips = face.landmarks?.innerLips?.normalizedPoints, lips.count > 2 {
        let ys = lips.map { Double($0.y) }
        row["mouth"] = ys.max()! - ys.min()!
      }
      return row
    })
  }
  let data = try JSONSerialization.data(withJSONObject: withPanels ? ["samples": samples, "panels": panels] as Any : samples as Any)
  print(String(data: data, encoding: .utf8)!)
} catch {
  FileHandle.standardError.write(Data("Detektor twarzy jest niedostępny.\n".utf8))
  exit(1)
}
