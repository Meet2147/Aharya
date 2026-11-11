import SwiftUI

struct HaulView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openURL) private var openURL
    @State private var cartRun = false
    @State private var showStaples = false

    var body: some View {
        let lines = model.groceries
        let buy = model.toBuy
        let shop = Shop.byID(model.profile?.shop == "kirana" ? "blinkit" : model.profile?.shop ?? "blinkit")
        let message = Kirana.message(buy, name: model.profile?.name)
        let budget = model.profile.map { Double($0.budget.rawValue * $0.household) } ?? 0
        let cost = buy.reduce(0) { $0 + $1.cost }
        PageScroll {
            Text("this week’s haul 🛒").font(.h1)

            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .lastTextBaseline) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("\(buy.count)").font(.brico(48, .bold, relativeTo: .largeTitle))
                        Text("items to buy").font(.brico(14, .semi))
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("~\(rupees(cost))").font(.h2)
                        Text(budget > 0 ? "of \(rupees(budget)) budget" : "estimated").font(.brico(13, .semi))
                    }
                }
                if budget > 0 { PopBar(value: cost / budget, color: cost > budget ? Pop.chilli : Pop.pudina) }
                Button(model.inCart.isSuperset(of: buy.map(\.id)) && !buy.isEmpty ? "cart’s loaded ✨ review" : "fill my \(shop.name) cart ⚡") {
                    cartRun = true
                }
                .buttonStyle(.pop(Pop.paper))
                HStack(spacing: 10) {
                    Button("💬 send to kirana") {
                        if let url = Kirana.whatsappURL(message, phone: model.kiranaPhone) { openURL(url) }
                    }
                    .buttonStyle(.pop(Pop.mint, small: true))
                    ShareLink(item: message) {
                        Text("📤 share list")
                    }
                    .buttonStyle(.pop(Pop.paper, small: true))
                }
            }
            .sticker(Pop.turmeric)

            Text("tap what you already have and it drops off. prices are rough estimates.")
                .font(.small).foregroundStyle(Pop.muted)

            ForEach(Groceries.aisles, id: \.id) { aisle in
                let group = lines.filter { $0.ingredient.aisle == aisle.id && !$0.ingredient.isStaple }
                if !group.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(aisle.emoji) \(aisle.label)").font(.h3.weight(.bold)).padding(.bottom, 4)
                        ForEach(group) { line in row(line) }
                    }
                    .sticker(color(aisle.id))
                }
            }

            staples(lines.filter(\.ingredient.isStaple))
        }
        .sheet(isPresented: $cartRun) { CartRunView() }
    }

    private func row(_ line: GroceryLine) -> some View {
        let atHome = model.pantry.contains(line.id)
        let have = atHome || model.have.contains(line.id)
        return Button {
            if atHome { model.togglePantry(line.id) } else { model.toggleHave(line.id) }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: have ? "checkmark" : "")
                    .font(.system(size: 12, weight: .heavy))
                    .foregroundStyle(Pop.paper)
                    .frame(width: 24, height: 24)
                    .background(RoundedRectangle(cornerRadius: 7).fill(have ? Pop.ink : Pop.paper))
                    .overlay(RoundedRectangle(cornerRadius: 7).strokeBorder(Pop.ink, lineWidth: Pop.border))
                VStack(alignment: .leading, spacing: 1) {
                    Text(line.ingredient.name).font(.brico(16, .semi)).strikethrough(have)
                    Text(have ? (atHome ? "in your kitchen" : "got it") : detail(line))
                        .font(.small).foregroundStyle(Pop.muted)
                }
                .opacity(have ? 0.5 : 1)
                Spacer()
                if model.inCart.contains(line.id), !have { Text("in cart").pill() }
            }
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: have)
        .accessibilityLabel("\(line.ingredient.name), \(have ? "already have" : "need \(Groceries.need(line))")")
    }

    private func detail(_ line: GroceryLine) -> String {
        if let pack = Groceries.pack(line) { return "need \(Groceries.need(line)) · grab \(pack)" }
        return "need \(Groceries.need(line))"
    }

    private func staples(_ items: [GroceryLine]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Button {
                withAnimation(.snappy) { showStaples.toggle() }
            } label: {
                HStack {
                    Text("🧂 check your shelf (\(items.count))").font(.h3.weight(.bold))
                    Spacer()
                    Text(showStaples ? "−" : "+").font(.h2)
                }
                .foregroundStyle(Pop.ink)
            }
            .buttonStyle(.plain)
            if showStaples {
                Text("salt, oil and masalas we assume you have. restock if you’re low:")
                    .font(.small).foregroundStyle(Pop.muted)
                Text(items.map(\.ingredient.name).joined(separator: " · ")).font(.brico(15, .semi))
            }
        }
        .sticker(Pop.paper)
    }

    private func color(_ aisle: String) -> Color {
        switch aisle {
        case "vegetables": Pop.mint
        case "fruits": Color(hex: 0xFFD3DF)
        case "pulses": Pop.butter
        case "grains": Pop.peach
        case "dairy": Pop.sky
        case "protein": Pop.blush
        case "nuts_seeds": Color(hex: 0xF0E0C8)
        default: Pop.lavender
        }
    }
}
