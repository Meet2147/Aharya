import SwiftUI

struct RecipeDetailView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let mealID: UUID

    private var found: (meal: PlannedMeal, day: DayPlan)? {
        for day in model.week?.days ?? [] {
            if let m = day.meals.first(where: { $0.id == mealID }) { return (m, day) }
        }
        return nil
    }

    var body: some View {
        if let (meal, day) = found, let r = meal.recipe {
            let planner = model.planner
            let household = model.profile?.household ?? 1
            let servings = meal.scale * Double(household)
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    HStack {
                        Spacer()
                        Button { dismiss() } label: { Text("✕").font(.h2).foregroundStyle(Pop.ink) }
                            .accessibilityLabel("close")
                    }
                    Text(r.emoji).font(.system(size: 64))
                    Text(r.name).font(.h1).foregroundStyle(Pop.ink)
                    Flow(spacing: 8) {
                        Text("⏱️ \(r.minutes) min").pill(Pop.butter)
                        Text("🔥 \(Int(Double(r.kcal) * meal.scale)) kcal").pill(Pop.turmeric)
                        Text("💪 \(Int(Double(r.protein) * meal.scale)) g protein").pill(Pop.pink)
                        Text("🍚 \(Int(Double(r.carbs) * meal.scale)) g carbs").pill(Pop.peach)
                        Text("🥑 \(Int(Double(r.fat) * meal.scale)) g fat").pill(Pop.lilac)
                        Text("💸 ~\(rupees(planner.costPerServing(r) * meal.scale)) / plate").pill(Pop.mint)
                    }
                    if model.profile?.diet == .jain, r.jain == "adapt" {
                        Text("🙏 jain: skip onion, garlic and ginger. a pinch of hing does the job.")
                            .font(.brico(14, .semi)).sticker(Pop.mint, offset: 3, padding: 12)
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text("ingredients").font(.h2)
                        Text("for \(household == 1 ? "you" : "\(household) people") · \(portion(meal.scale)) serving each")
                            .font(.small).foregroundStyle(Pop.muted)
                        ForEach(planner.items(r), id: \.id) { item in
                            if let ing = Catalog.ingredient(item.id) {
                                HStack {
                                    Text(ing.name).font(.brico(16, .semi))
                                    if ing.isStaple { Text("shelf").pill(Pop.sky) }
                                    Spacer()
                                    Text(amount(item.qty * servings, unit: ing.unit)).font(.brico(15)).foregroundStyle(Pop.muted)
                                }
                                Divider().overlay(Pop.ink.opacity(0.15))
                            }
                        }
                    }
                    .sticker()

                    VStack(alignment: .leading, spacing: 12) {
                        Text("how to make it").font(.h2)
                        ForEach(Array(r.steps.enumerated()), id: \.offset) { i, step in
                            HStack(alignment: .top, spacing: 12) {
                                Text("\(i + 1)").font(.brico(15, .bold)).frame(width: 28, height: 28)
                                    .background(Circle().fill(Pop.turmeric)).overlay(Circle().strokeBorder(Pop.ink, lineWidth: 2))
                                Text(step).font(.bodyPop).foregroundStyle(Pop.ink).fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                    .sticker(Pop.butter)

                    HStack(spacing: 10) {
                        Button(meal.cooked ? "✅ done" : "✓ ate it") { model.toggle(\.cooked, meal) }.buttonStyle(.pop(Pop.pudina, small: true))
                        Button("🔀 swap") { model.swap(meal, in: day); dismiss() }.buttonStyle(.pop(Pop.paper, small: true))
                        Button(meal.pinned ? "📌 pinned" : "📌 pin") { model.toggle(\.pinned, meal) }.buttonStyle(.pop(meal.pinned ? Pop.turmeric : Pop.paper, small: true))
                    }
                }
                .padding(20)
            }
            .scrollIndicators(.hidden)
            .background(Pop.bg.ignoresSafeArea())
        }
    }

    private func amount(_ q: Double, unit: String) -> String {
        switch unit {
        case "g": return q >= 1000 ? String(format: "%.1f kg", q / 1000) : "\(Int(q.rounded())) g"
        case "ml": return "\(Int(q.rounded())) ml"
        default:
            let r = (q * 2).rounded() / 2 // halves read fine for lemons and apples
            return r == r.rounded() ? "\(Int(r))" : String(format: "%.1f", r)
        }
    }
}
