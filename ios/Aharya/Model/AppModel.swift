import Foundation
import Observation

/// Everything the app knows, saved as one JSON file on the phone. No account, no server
/// unless the user chooses to send reports.
@Observable
final class AppModel {
    var profile: Profile?
    var week: WeekPlan?
    /// Ingredient ids the user says are already in their kitchen.
    var pantry: Set<String> = []
    /// Ingredient ids ticked "got it" on this week's haul.
    var have: Set<String> = []
    /// Ingredient ids already put in a grocery app's cart this week.
    var inCart: Set<String> = []
    var health: HealthReport?
    var kiranaPhone = ""

    private struct Saved: Codable {
        var profile: Profile?
        var week: WeekPlan?
        var pantry: Set<String>
        var have: Set<String>
        var inCart: Set<String>
        var health: HealthReport?
        var kiranaPhone: String
    }

    private static var file: URL {
        URL.documentsDirectory.appending(path: "aharya.json")
    }

    init() {
        let args = ProcessInfo.processInfo.arguments
        if args.contains("-reset") { try? FileManager.default.removeItem(at: Self.file) }
        if let data = try? Data(contentsOf: Self.file), let saved = try? JSONDecoder().decode(Saved.self, from: data) {
            profile = saved.profile
            week = saved.week
            pantry = saved.pantry
            have = saved.have
            inCart = saved.inCart
            health = saved.health
            kiranaPhone = saved.kiranaPhone
        }
        if args.contains("-demo"), profile == nil { loadDemo() }
        rollWeekIfStale()
    }

    func save() {
        let saved = Saved(profile: profile, week: week, pantry: pantry, have: have, inCart: inCart, health: health, kiranaPhone: kiranaPhone)
        try? JSONEncoder().encode(saved).write(to: Self.file, options: .atomic)
    }

    // MARK: Derived

    var targets: DailyTargets {
        Nutrition.targets(for: profile ?? Profile(), health: health?.status == "completed" ? health : nil)
    }

    var planner: Planner {
        Planner(
            profile: profile ?? Profile(),
            targets: targets,
            findings: health?.status == "completed" ? health?.findings ?? [] : [],
            pantry: pantry
        )
    }

    var groceries: [GroceryLine] {
        guard let week else { return [] }
        return Groceries.lines(for: week, planner: planner)
    }

    var weekCost: Double { week.map(planner.weekCost) ?? 0 }

    /// Lines still to buy: not a staple, not in the kitchen, not ticked off.
    var toBuy: [GroceryLine] {
        groceries.filter { !$0.ingredient.isStaple && !have.contains($0.id) && !pantry.contains($0.id) }
    }

    // MARK: Plan actions

    func finishOnboarding(_ p: Profile) {
        profile = p
        newWeek(keepPins: false)
    }

    /// Builds this week again; pinned meals stay put.
    func newWeek(keepPins: Bool = true) {
        let start = Calendar.current.startOfDay(for: .now)
        week = planner.makeWeek(start: start, keeping: keepPins ? week : nil)
        have = []
        inCart = []
        save()
    }

    func swap(_ meal: PlannedMeal, in day: DayPlan) {
        guard var w = week, let d = w.days.firstIndex(where: { $0.id == day.id }),
              let m = w.days[d].meals.firstIndex(where: { $0.id == meal.id }) else { return }
        w.days[d].meals[m] = planner.swap(meal, in: w.days[d], week: w)
        planner.rescale(&w.days[d])
        week = w
        save()
    }

    func toggle(_ keyPath: WritableKeyPath<PlannedMeal, Bool>, _ meal: PlannedMeal) {
        guard var w = week else { return }
        for d in w.days.indices {
            if let m = w.days[d].meals.firstIndex(where: { $0.id == meal.id }) {
                w.days[d].meals[m][keyPath: keyPath].toggle()
            }
        }
        week = w
        save()
    }

    func toggleHave(_ id: String) {
        if have.contains(id) { have.remove(id) } else { have.insert(id) }
        save()
    }

    func togglePantry(_ id: String) {
        if pantry.contains(id) { pantry.remove(id) } else { pantry.insert(id) }
        save()
    }

    func markInCart(_ id: String) {
        inCart.insert(id)
        save()
    }

    func resetCart() {
        inCart = []
        save()
    }

    /// A plan from last week rolls forward into a fresh one, keeping pins.
    private func rollWeekIfStale() {
        guard profile != nil, let w = week,
              let end = Calendar.current.date(byAdding: .day, value: 7, to: w.start), end <= .now else { return }
        newWeek()
    }

    func startOver() {
        profile = nil
        week = nil
        pantry = []
        have = []
        inCart = []
        health = nil
        kiranaPhone = ""
        save()
    }

    func applyReport(_ report: HealthReport) {
        health = report
        save()
    }

    private func loadDemo() {
        pantry = ["rice", "atta", "onion", "tomato", "curd", "moong_dal"]
        finishOnboarding(Profile(
            name: "Rhea Mehta", age: 27, gender: .female, goal: .lose, diet: .eggetarian, cuisine: .west,
            allergies: [], activity: .light, heightCm: 160, weightKg: 68, household: 2, budget: .chill, shop: "blinkit"
        ))
    }
}
