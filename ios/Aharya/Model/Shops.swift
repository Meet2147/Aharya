import Foundation
import SwiftUI

/// Getting the haul into a grocery app.
///
/// None of these apps has a public add-to-cart API, so each item opens that app's search for it
/// and the user adds it there. When a partnership brings a real cart API, it plugs in here.
struct Shop: Identifiable, Hashable {
    let id: String
    let name: String
    let color: Color
    let text: Color
    let searchURL: (String) -> URL?
    let home: URL

    static func == (a: Shop, b: Shop) -> Bool { a.id == b.id }
    func hash(into h: inout Hasher) { h.combine(id) }

    static let all: [Shop] = [
        Shop(id: "blinkit", name: "Blinkit", color: Color(hex: 0xF8CB46), text: Pop.ink,
             searchURL: { URL(string: "https://blinkit.com/s/?q=\(enc($0))") }, home: URL(string: "https://blinkit.com")!),
        Shop(id: "zepto", name: "Zepto", color: Color(hex: 0x7B2FF7), text: .white,
             searchURL: { URL(string: "https://www.zepto.com/search?query=\(enc($0))") }, home: URL(string: "https://www.zepto.com")!),
        Shop(id: "instamart", name: "Instamart", color: Color(hex: 0xFC8019), text: .white,
             searchURL: { URL(string: "https://www.swiggy.com/instamart/search?custom_back=true&query=\(enc($0))") },
             home: URL(string: "https://www.swiggy.com/instamart")!),
        Shop(id: "bigbasket", name: "BigBasket", color: Color(hex: 0x84C225), text: Pop.ink,
             searchURL: { URL(string: "https://www.bigbasket.com/ps/?q=\(enc($0))") }, home: URL(string: "https://www.bigbasket.com")!),
    ]

    static func byID(_ id: String) -> Shop { all.first { $0.id == id } ?? all[0] }

    private static func enc(_ s: String) -> String {
        s.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? s
    }
}

enum Kirana {
    /// The haul as a message a kirana can read at a glance.
    static func message(_ lines: [GroceryLine], name: String?) -> String {
        var out = ["🛒 Grocery list\(name.map { " for \($0)" } ?? "")", ""]
        for aisle in Groceries.aisles {
            let group = lines.filter { $0.ingredient.aisle == aisle.id }
            guard !group.isEmpty else { continue }
            out.append("*\(aisle.label)*")
            out += group.map { "• \($0.ingredient.name) — \(Groceries.need($0))" }
            out.append("")
        }
        out.append("Please share the total and delivery time 🙏")
        return out.joined(separator: "\n")
    }

    /// Straight to the kirana's chat when their number is saved, otherwise WhatsApp's contact picker.
    static func whatsappURL(_ text: String, phone: String) -> URL? {
        var digits = phone.filter(\.isNumber)
        if digits.count == 10 { digits = "91" + digits }
        var c = URLComponents(string: "https://wa.me/\(digits)")
        c?.queryItems = [URLQueryItem(name: "text", value: text)]
        return c?.url
    }
}
