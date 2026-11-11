import SwiftUI

/// "Fill my cart": walks the haul one item at a time. Each item opens the chosen store's search;
/// the user adds it there, comes back and taps "added".
struct CartRunView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var shopID = ""
    @State private var skipped: Set<String> = []
    @State private var opened = false

    var body: some View {
        let shop = Shop.byID(shopID.isEmpty ? model.profile?.shop ?? "blinkit" : shopID)
        let buy = model.toBuy
        let left = buy.filter { !model.inCart.contains($0.id) }
        let order = Groceries.aisles.map(\.id)
        let queue = left.filter { !skipped.contains($0.id) }
            .sorted { (order.firstIndex(of: $0.ingredient.aisle) ?? 99) < (order.firstIndex(of: $1.ingredient.aisle) ?? 99) }
        let done = buy.count - left.count

        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Text("fill my cart ⚡").font(.h2)
                    Spacer()
                    Button { dismiss() } label: { Text("✕").font(.h2).foregroundStyle(Pop.ink) }.accessibilityLabel("close")
                }
                Eyebrow("shopping on")
                Flow(spacing: 8) {
                    ForEach(Shop.all) { s in
                        Chip(label: s.name, on: s.id == shop.id, color: s.color) { shopID = s.id }
                    }
                }
                VStack(alignment: .leading, spacing: 6) {
                    PopBar(value: buy.isEmpty ? 1 : Double(done) / Double(buy.count), color: Pop.pudina)
                    Text("\(done) of \(buy.count) in your cart").font(.small).foregroundStyle(Pop.muted)
                }

                if let line = queue.first {
                    VStack(spacing: 6) {
                        Text(Groceries.aisle(line.ingredient.aisle).emoji).font(.system(size: 56))
                        Text(line.ingredient.name).font(.h2).multilineTextAlignment(.center)
                        Text(Groceries.pack(line).map { "need \(Groceries.need(line)) → grab \($0)" } ?? "need \(Groceries.need(line))")
                            .font(.brico(16, .semi)).multilineTextAlignment(.center)
                        Text("\(queue.count - 1) more after this").font(.small).foregroundStyle(Pop.muted)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .sticker(Pop.butter, offset: 6)

                    Button("find it on \(shop.name) ↗") {
                        opened = true
                        if let url = shop.searchURL(line.ingredient.search) { openURL(url) }
                    }
                    .buttonStyle(.pop(shop.color, text: shop.text))
                    HStack(spacing: 10) {
                        Button("added ✓") {
                            model.markInCart(line.id)
                            opened = false
                        }
                        .buttonStyle(.pop(opened ? Pop.pudina : Pop.paper))
                        Button("skip") {
                            skipped.insert(line.id)
                            opened = false
                        }
                        .buttonStyle(.pop(Pop.paper))
                    }
                    Text("one tap per item: we open it in \(shop.name), you yeet it into the cart, come back, tap “added”. grocery apps don’t let other apps fill carts (yet).")
                        .font(.brico(13.5, .semi)).sticker(Pop.butter, offset: 2, radius: 14, padding: 12)
                } else {
                    VStack(spacing: 6) {
                        Text(left.isEmpty ? "🛒✨" : "⏭️").font(.system(size: 56))
                        Text(left.isEmpty ? "cart’s loaded" : "\(left.count) skipped").font(.h2)
                        Text(left.isEmpty ? "head to \(shop.name) to check out." : "go back through them, or check out what you have.")
                            .font(.bodyPop).multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .sticker(Pop.turmeric, offset: 6)
                    Button("open \(shop.name) to check out ↗") { openURL(shop.home) }
                        .buttonStyle(.pop(shop.color, text: shop.text))
                    if !left.isEmpty {
                        Button("go through skipped ones") { skipped = [] }.buttonStyle(.pop(Pop.paper))
                    }
                    Button("start the cart run again") {
                        model.resetCart()
                        skipped = []
                    }
                    .buttonStyle(.pop(Pop.paper))
                }
            }
            .padding(20)
        }
        .scrollIndicators(.hidden)
        .background(Pop.bg.ignoresSafeArea())
        .sensoryFeedback(.success, trigger: model.inCart.count)
    }
}
