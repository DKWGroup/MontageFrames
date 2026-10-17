import Foundation
import CoreText
func descriptor(_ font: CTFont) -> [String: Any] {
 let desc = CTFontCopyFontDescriptor(font)
 let url = CTFontDescriptorCopyAttribute(desc, kCTFontURLAttribute) as? URL
 let traits = CTFontCopyTraits(font) as NSDictionary
 let rawWeight = traits[kCTFontWeightTrait] as? Double ?? 0
 let weight = rawWeight >= 0.58 ? "900" : rawWeight >= 0.48 ? "800" : rawWeight >= 0.35 ? "700" : rawWeight >= 0.265 ? "600" : rawWeight >= 0.115 ? "500" : rawWeight <= -0.7 ? "100" : rawWeight <= -0.5 ? "200" : rawWeight <= -0.2 ? "300" : "400"
 return ["id": CTFontCopyPostScriptName(font) as String, "family": CTFontCopyFamilyName(font) as String, "fullName": CTFontCopyFullName(font) as String,"postScriptName":CTFontCopyPostScriptName(font) as String,"weight":weight,"style":CTFontGetSymbolicTraits(font).contains(.traitItalic) ? "italic" : "normal","file":url?.path ?? "", "format":url?.pathExtension.lowercased() ?? ""]
}
func output(_ item:Any){let data=try! JSONSerialization.data(withJSONObject:item,options:[.sortedKeys]);print(String(data:data,encoding:.utf8)!)}
let args=CommandLine.arguments
if args.count > 2 && args[1] == "inspect" {
 let url=URL(fileURLWithPath:args[2]);guard let descs=CTFontManagerCreateFontDescriptorsFromURL(url as CFURL) as? [CTFontDescriptor],descs.count==1 else {fputs("Kolekcje TTC i pliki bez jednej odmiany nie są obsługiwane.\n",stderr);exit(2)}
 let font=CTFontCreateWithFontDescriptor(descs[0],32,nil)
 let chars=Array("ĄĆĘŁŃÓŚŹŻąćęłńóśźż".utf16);var glyphs=[CGGlyph](repeating:0,count:chars.count)
 let valid=CTFontGetGlyphsForCharacters(font,chars,&glyphs,chars.count)
 guard valid && !glyphs.contains(0) else {fputs("Font nie zawiera wszystkich polskich znaków.\n",stderr);exit(2)}
 output(descriptor(font))
} else {
 let names=CTFontManagerCopyAvailablePostScriptNames() as! [String]
 let fonts=names.sorted().map {descriptor(CTFontCreateWithName($0 as CFString,32,nil))}.filter { !(($0["family"] as! String).lowercased().contains("times new roman")) }
 if args.count>2 && args[1]=="resolve" {guard let item=fonts.first(where:{$0["id"] as? String==args[2]}) else {exit(2)};output(item)} else {output(fonts)}
}
