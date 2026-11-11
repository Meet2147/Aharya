import SwiftUI

/// "What's in your kitchen": the planner cooks around these, and the haul skips them.
struct KitchenView: View {
    @Environment(AppModel.self) private var model
    @State private var rebuilt = 0

    var body: some View {
        PageScroll {
            Text("your kitchen 🧺").font(.h1)
            Text("tap what you’ve got. we’ll plan meals that use it up and leave it off the grocery list. less waste, less spend.")
                .font(.bodyPop).foregroundStyle(Pop.muted)
            HStack {
                Text("\(model.pantry.count) things in stock").font(.h3.weight(.bold))
                Spacer()
                if !model.pantry.isEmpty {
                    Button("clear") { model.pantry = []; model.save() }.font(.brico(14, .bold)).foregroundStyle(Pop.chilli)
                }
            }
            Button("cook with what i have 🍳") {
                rebuilt += 1
                model.newWeek()
            }
            .buttonStyle(.pop())
            .sensoryFeedback(.success, trigger: rebuilt)
            PantryPicker(compact: false)
        }
    }
}

/// Ingredient chips by aisle; used in onboarding (common items only) and the kitchen tab.
struct PantryPicker: View {
    @Environment(AppModel.self) private var model
    let compact: Bool
    @State private var query = ""

    private static let common: Set<String> = [
        "atta", "rice", "poha", "rava", "oats", "besan", "moong_dal", "toor_dal", "masoor_dal", "rajma",
        "kabuli_chana", "milk", "curd", "paneer", "eggs", "onion", "tomato", "potato", "spinach",
        "peas", "peanuts", "banana",
    ]

    var body: some View {
        let all = Catalog.shared.ingredients.filter { !$0.isStaple && (!compact || Self.common.contains($0.id)) }
        let shown = query.isEmpty ? all : all.filter { $0.name.localizedCaseInsensitiveContains(query) }
        VStack(alignment: .leading, spacing: 16) {
            if !compact {
                PopField(label: "search", text: $query, placeholder: "paneer, rajma, spinach…")
            }
            ForEach(Groceries.aisles, id: \.id) { aisle in
                let group = shown.filter { $0.aisle == aisle.id }
                if !group.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("\(aisle.emoji) \(aisle.label)").font(.brico(16, .bold))
                        Flow(spacing: 8) {
                            ForEach(group) { ing in
                                Chip(label: ing.name, on: model.pantry.contains(ing.id), color: Pop.mint) {
                                    model.togglePantry(ing.id)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
