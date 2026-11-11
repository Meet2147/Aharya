import Foundation

// MARK: - Targets

enum Nutrition {
    /// Daily targets: from the report analysis when there is one, otherwise estimated on the phone.
    static func targets(for p: Profile, health: HealthReport?) -> DailyTargets {
        if let t = health?.targets {
            return DailyTargets(kcal: t.caloriesKcal, protein: t.proteinG, carbs: t.carbsG, fat: t.fatG, source: "from your reports")
        }
        let sexTerm: Double = switch p.gender { case .male: 5; case .female: -161; case .other: -78 }
        let bmr: Double
        let source: String
        if let w = p.weightKg, let h = p.heightCm {
            bmr = 10 * w + 6.25 * h - 5 * Double(p.age) + sexTerm
            source = "estimated from your height and weight"
        } else {
            bmr = p.gender == .male ? 1650 : p.gender == .female ? 1350 : 1500
            source = "average for your age (add height + weight to sharpen it)"
        }
        let floor: Double = p.gender == .male ? 1500 : p.gender == .female ? 1200 : 1350
        var kcal = bmr * p.activity.factor
        switch p.goal {
        case .lose: kcal = max(kcal - 450, floor)
        case .gain: kcal += 300
        case .maintain, .healthier: break
        }
        kcal = (kcal / 50).rounded() * 50
        let weight = p.weightKg ?? (p.gender == .male ? 70 : 60)
        let perKg: Double = switch p.goal { case .lose: 1.2; case .gain: 1.6; default: 1.0 }
        let protein = (weight * perKg).rounded()
        let fat = (kcal * 0.27 / 9).rounded()
        let carbs = ((kcal - protein * 4 - fat * 9) / 4).rounded()
        return DailyTargets(kcal: Int(kcal), protein: Int(protein), carbs: Int(carbs), fat: Int(fat), source: source)
    }
}

// MARK: - Planner

/// Builds a week of meals on the phone. Works with no reports at all; report findings, when
/// present, only steer it (leave out high-GI meals for prediabetes, favour iron for anaemia, ...).
struct Planner {
    let profile: Profile
    let targets: DailyTargets
    let findings: [Finding]
    let pantry: Set<String>

    private var findingCodes: Set<String> { Set(findings.map(\.code)) }

    /// Meal tags to leave out, from report findings.
    private var avoidTags: Set<String> {
        var tags = Set<String>()
        for code in findingCodes {
            switch code {
            case "prediabetes", "diabetes_range", "urine_glucose": tags.insert("high_gi")
            case "dyslipidaemia", "liver_enzymes": tags.insert("high_sat_fat")
            case "high_uric_acid": tags.insert("high_purine")
            default: break
            }
        }
        return tags
    }

    func allowed(_ r: Recipe) -> Bool {
        guard profile.diet.kinds.contains(r.kind) else { return false }
        if profile.diet == .jain, r.jain == "no" { return false }
        if !Set(r.allergens).isDisjoint(with: profile.allergies.map(\.rawValue)) { return false }
        return Set(r.tags).isDisjoint(with: avoidTags)
    }

    func candidates(_ slot: Slot) -> [Recipe] {
        Catalog.shared.recipes.filter { $0.slot == slot && allowed($0) }
    }

    /// The ingredients this person actually cooks with (Jain users skip onion, garlic, ginger).
    func items(_ r: Recipe) -> [RecipeItem] {
        guard profile.diet == .jain else { return r.ingredients }
        return r.ingredients.filter { !["onion", "garlic", "ginger"].contains($0.id) }
    }

    func costPerServing(_ r: Recipe) -> Double {
        items(r).reduce(0) { sum, item in
            guard let ing = Catalog.ingredient(item.id), !ing.isStaple else { return sum }
            return sum + ing.cost(item.qty)
        }
    }

    private func score(_ r: Recipe, recent: [String], counts: [String: Int], today: Set<String> = []) -> Double {
        var s = Double.random(in: 0..<1)
        if profile.cuisine != .mix {
            if r.cuisine == profile.cuisine.rawValue { s += 0.7 } else if r.cuisine == "any" { s += 0.3 }
        }
        let fromPantry = items(r).filter { pantry.contains($0.id) && Catalog.ingredient($0.id)?.isStaple == false }.count
        s += 0.35 * Double(fromPantry)
        if findingCodes.contains("anaemia"), r.tags.contains("high_iron") { s += 0.6 }
        if profile.goal == .lose || profile.goal == .gain {
            s += min(0.6, Double(r.protein) / Double(max(r.kcal, 1)) * 6) // protein per calorie
        }
        if profile.budget == .tight { s -= costPerServing(r) / 120 }
        if recent.contains(r.id) { s -= 3 }
        s -= 0.8 * Double(counts[r.id] ?? 0)
        // one egg / meat / fish meal a day is plenty of the same protein
        if r.kind == "egg" || r.kind == "nonveg", today.contains(r.kind) { s -= 1.5 }
        return s
    }

    private func pick(_ slot: Slot, recent: [String], counts: [String: Int], excluding: Set<String> = [], today: Set<String> = []) -> Recipe? {
        // Score once per candidate: the score has a random part, so it must not be recomputed mid-comparison
        candidates(slot)
            .filter { !excluding.contains($0.id) }
            .map { ($0, score($0, recent: recent, counts: counts, today: today)) }
            .max { $0.1 < $1.1 }?.0
    }

    /// A week starting `start`; meals pinned in `keeping` stay on their day.
    func makeWeek(start: Date, keeping old: WeekPlan? = nil) -> WeekPlan {
        let calendar = Calendar.current
        var counts: [String: Int] = [:]
        var recentDays: [[String]] = []
        var days: [DayPlan] = []
        for d in 0..<7 {
            let date = calendar.date(byAdding: .day, value: d, to: start)!
            let recent = recentDays.suffix(2).flatMap { $0 }
            var meals: [PlannedMeal] = []
            for slot in Slot.allCases {
                if let kept = old?.days[safe: d]?.meals.first(where: { $0.slot == slot && $0.pinned }) {
                    meals.append(kept)
                } else if let r = pick(slot, recent: recent, counts: counts, today: Set(meals.compactMap { $0.recipe?.kind })) {
                    meals.append(PlannedMeal(slot: slot, recipeID: r.id))
                }
            }
            for m in meals { counts[m.recipeID, default: 0] += 1 }
            recentDays.append(meals.map(\.recipeID))
            days.append(DayPlan(date: date, meals: meals))
        }
        var week = WeekPlan(start: start, days: days)
        fitBudget(&week)
        for i in week.days.indices { rescale(&week.days[i]) }
        return week
    }

    /// Swaps one meal for the next-best option that isn't already on that day.
    func swap(_ meal: PlannedMeal, in day: DayPlan, week: WeekPlan) -> PlannedMeal {
        let counts = week.days.flatMap(\.meals).reduce(into: [String: Int]()) { $0[$1.recipeID, default: 0] += 1 }
        let sameDay = Set(day.meals.map(\.recipeID))
        let kinds = Set(day.meals.filter { $0.id != meal.id }.compactMap { $0.recipe?.kind })
        guard let r = pick(meal.slot, recent: [], counts: counts, excluding: sameDay, today: kinds) else { return meal }
        var next = meal
        next.recipeID = r.id
        next.cooked = false
        return next
    }

    /// Portions so each day lands near the calorie target.
    func rescale(_ day: inout DayPlan) {
        let base = day.meals.reduce(0.0) { $0 + Double($1.recipe?.kcal ?? 0) }
        guard base > 0 else { return }
        let factor = min(max(Double(targets.kcal) / base, 0.7), 1.6)
        let rounded = (factor * 4).rounded() / 4 // quarter servings read better than 1.13x
        for i in day.meals.indices { day.meals[i].scale = rounded }
    }

    /// Weekly cost estimate for everyone in the house, in rupees.
    func weekCost(_ week: WeekPlan) -> Double {
        week.days.flatMap(\.meals).reduce(0) { sum, m in
            guard let r = m.recipe else { return sum }
            return sum + costPerServing(r) * m.scale * Double(profile.household)
        }
    }

    /// Over budget: replace the priciest unpinned meals with the cheapest alternatives.
    private func fitBudget(_ week: inout WeekPlan) {
        guard profile.budget != .none else { return }
        let limit = Double(profile.budget.rawValue * profile.household)
        for _ in 0..<12 where weekCost(week) > limit {
            var worst: (day: Int, meal: Int, cost: Double)?
            for (d, day) in week.days.enumerated() {
                for (m, meal) in day.meals.enumerated() where !meal.pinned {
                    let c = meal.recipe.map(costPerServing) ?? 0
                    if c > (worst?.cost ?? 0) { worst = (d, m, c) }
                }
            }
            guard let w = worst else { return }
            let current = week.days[w.day].meals[w.meal]
            let sameDay = Set(week.days[w.day].meals.map(\.recipeID))
            guard let cheaper = candidates(current.slot)
                .filter({ !sameDay.contains($0.id) && costPerServing($0) < w.cost })
                .min(by: { costPerServing($0) < costPerServing($1) })
            else { return }
            week.days[w.day].meals[w.meal].recipeID = cheaper.id
        }
    }
}

// MARK: - Groceries

struct GroceryLine: Identifiable, Hashable {
    let ingredient: Ingredient
    let qty: Double
    var id: String { ingredient.id }
    var cost: Double { ingredient.cost(qty) }
}

enum Groceries {
    /// Everything the week needs for the whole household, by ingredient.
    static func lines(for week: WeekPlan, planner: Planner) -> [GroceryLine] {
        var totals: [String: Double] = [:]
        for meal in week.days.flatMap(\.meals) {
            guard let r = meal.recipe else { continue }
            for item in planner.items(r) {
                totals[item.id, default: 0] += item.qty * meal.scale * Double(planner.profile.household)
            }
        }
        return totals.compactMap { id, qty in Catalog.ingredient(id).map { GroceryLine(ingredient: $0, qty: qty) } }
            .sorted { $0.ingredient.name < $1.ingredient.name }
    }

    static let aisles: [(id: String, label: String, emoji: String)] = [
        ("vegetables", "sabzi", "🥬"),
        ("fruits", "fruits", "🍎"),
        ("pulses", "dal & pulses", "🫘"),
        ("grains", "grains & atta", "🌾"),
        ("dairy", "dairy", "🥛"),
        ("protein", "protein", "🍗"),
        ("nuts_seeds", "nuts & seeds", "🥜"),
        ("pantry", "pantry", "🫙"),
    ]

    static func aisle(_ id: String) -> (label: String, emoji: String) {
        aisles.first { $0.id == id }.map { ($0.label, $0.emoji) } ?? (id, "🛍️")
    }

    /// How much the week needs, e.g. "450 g".
    static func need(_ line: GroceryLine) -> String {
        let q = line.qty
        switch line.ingredient.unit {
        case "g": return q >= 1000 ? "\(trim(q / 1000)) kg" : "\(Int(q.rounded())) g"
        case "ml": return q >= 1000 ? "\(trim(q / 1000)) L" : "\(Int(q.rounded())) ml"
        default:
            if line.ingredient.id == "bread" { return "\(Int(q.rounded(.up))) slices" }
            return "\(trim(q.rounded(.up))) \(q > 1 ? "pcs" : "pc")"
        }
    }

    /// What to put in the cart when it differs from the need. nil = buy as needed.
    static func pack(_ line: GroceryLine) -> String? {
        let ing = line.ingredient
        if ing.aisle == "vegetables" || ing.aisle == "fruits" { return nil }
        switch ing.unit {
        case "g", "ml":
            let unit = ing.unit == "g" ? "g" : "ml"
            if let size = [100.0, 200, 250, 500, 1000].first(where: { $0 >= line.qty }) {
                return size >= 1000 ? "a 1 \(unit == "g" ? "kg" : "L") pack" : "a \(Int(size)) \(unit) pack"
            }
            return "\(Int((line.qty / 1000).rounded(.up))) × 1 \(unit == "g" ? "kg" : "L") packs"
        default:
            if ing.id == "eggs" { return line.qty <= 6 ? "a 6-egg pack" : line.qty <= 12 ? "a 12-egg pack" : "a 30-egg tray" }
            if ing.id == "bread" { return line.qty <= 14 ? "1 loaf" : "\(Int((line.qty / 14).rounded(.up))) loaves" }
            if ing.id == "green_tea" { return "a box of 25" }
            return nil
        }
    }

    private static func trim(_ v: Double) -> String {
        v == v.rounded() ? String(Int(v)) : String(format: "%.1f", v)
    }
}

extension Array {
    subscript(safe i: Int) -> Element? { indices.contains(i) ? self[i] : nil }
}

func rupees(_ v: Double) -> String {
    let f = NumberFormatter()
    f.numberStyle = .decimal
    f.locale = Locale(identifier: "en_IN")
    f.maximumFractionDigits = 0
    return "₹" + (f.string(from: NSNumber(value: v.rounded())) ?? String(Int(v)))
}
