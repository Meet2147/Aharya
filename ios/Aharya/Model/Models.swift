import Foundation

// MARK: - Catalogue (bundled catalog.json, built by tools/build_catalog.py)

struct Ingredient: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let aisle: String
    let unit: String // g, ml or pc
    let price: Double // ₹ per kg, per litre or per piece
    let flags: [String]
    let search: String

    var isStaple: Bool { flags.contains("staple") }

    /// Rough price of `qty` of this, in rupees.
    func cost(_ qty: Double) -> Double {
        unit == "pc" ? price * qty : price * qty / 1000
    }
}

struct RecipeItem: Codable, Hashable {
    let id: String
    let qty: Double
}

enum Slot: String, Codable, CaseIterable, Identifiable {
    case breakfast, lunch, snack, dinner
    var id: String { rawValue }

    var label: String { rawValue }
    var emoji: String {
        switch self {
        case .breakfast: "🍳"
        case .lunch: "🍛"
        case .snack: "🫖"
        case .dinner: "🌙"
        }
    }
    /// Share of the day's calories this meal is planned around.
    var share: Double {
        switch self {
        case .breakfast: 0.25
        case .lunch: 0.33
        case .snack: 0.12
        case .dinner: 0.30
        }
    }
}

struct Recipe: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let emoji: String
    let slot: Slot
    let cuisine: String
    let minutes: Int
    let kcal: Int
    let protein: Int
    let carbs: Int
    let fat: Int
    let ingredients: [RecipeItem]
    let steps: [String]
    let tags: [String]
    let kind: String // vegan, veg, egg, nonveg
    let jain: String // yes, adapt, no
    let allergens: [String]
}

struct Catalog: Decodable {
    let ingredients: [Ingredient]
    let recipes: [Recipe]

    static let shared: Catalog = {
        guard let url = Bundle.main.url(forResource: "catalog", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let catalog = try? JSONDecoder().decode(Catalog.self, from: data)
        else { fatalError("catalog.json is missing or malformed") }
        return catalog
    }()

    private static let byID = Dictionary(uniqueKeysWithValues: shared.ingredients.map { ($0.id, $0) })
    private static let recipesByID = Dictionary(uniqueKeysWithValues: shared.recipes.map { ($0.id, $0) })

    static func ingredient(_ id: String) -> Ingredient? { byID[id] }
    static func recipe(_ id: String) -> Recipe? { recipesByID[id] }
}

// MARK: - Profile

enum Gender: String, Codable, CaseIterable { case female, male, other }

enum Diet: String, Codable, CaseIterable {
    case veg, eggetarian, nonVeg = "non_veg", jain, vegan

    var label: String {
        switch self {
        case .veg: "🥦 veg"
        case .eggetarian: "🥚 eggetarian"
        case .nonVeg: "🍗 non-veg"
        case .jain: "🙏 jain"
        case .vegan: "🌱 vegan"
        }
    }

    var kinds: Set<String> {
        switch self {
        case .vegan: ["vegan"]
        case .veg, .jain: ["vegan", "veg"]
        case .eggetarian: ["vegan", "veg", "egg"]
        case .nonVeg: ["vegan", "veg", "egg", "nonveg"]
        }
    }
}

enum Cuisine: String, Codable, CaseIterable {
    case north, south, west, east, mix

    var label: String {
        switch self {
        case .north: "🫓 north indian"
        case .south: "🥥 south indian"
        case .west: "🍛 gujju / marathi"
        case .east: "🐟 bengali / east"
        case .mix: "🌀 mix it up"
        }
    }
}

enum Goal: String, Codable, CaseIterable {
    case lose, maintain, gain, healthier

    var label: String {
        switch self {
        case .lose: "🔥 lose the belly"
        case .maintain: "⚖️ stay where i am"
        case .gain: "💪 gain muscle"
        case .healthier: "🌱 just eat better"
        }
    }
}

enum Activity: String, Codable, CaseIterable {
    case sedentary, light, moderate, active

    var label: String {
        switch self {
        case .sedentary: "🛋️ desk + couch era"
        case .light: "🚶 walks sometimes"
        case .moderate: "🏸 active 3–4 days"
        case .active: "🏋️ gym rat"
        }
    }
    var factor: Double {
        switch self {
        case .sedentary: 1.2
        case .light: 1.375
        case .moderate: 1.55
        case .active: 1.725
        }
    }
}

/// Weekly grocery budget per person, in rupees. 0 = no limit.
enum Budget: Int, Codable, CaseIterable {
    case tight = 700, chill = 1200, comfy = 2000, none = 0

    var label: String {
        switch self {
        case .tight: "🪙 broke era · ₹700"
        case .chill: "😌 chill · ₹1,200"
        case .comfy: "💸 comfy · ₹2,000"
        case .none: "🤷 no limit"
        }
    }
}

enum Allergy: String, Codable, CaseIterable {
    case dairy, peanut, nuts, gluten, soy, egg, fish, shellfish

    var label: String {
        switch self {
        case .dairy: "🥛 dairy"
        case .peanut: "🥜 peanuts"
        case .nuts: "🌰 tree nuts"
        case .gluten: "🌾 gluten"
        case .soy: "🫘 soy"
        case .egg: "🥚 eggs"
        case .fish: "🐟 fish"
        case .shellfish: "🦐 shellfish"
        }
    }
}

struct Profile: Codable, Equatable {
    var name = ""
    var age = 28
    var gender: Gender = .female
    var goal: Goal = .healthier
    var diet: Diet = .veg
    var cuisine: Cuisine = .mix
    var allergies: Set<Allergy> = []
    var activity: Activity = .sedentary
    var heightCm: Double?
    var weightKg: Double?
    var household = 1
    var budget: Budget = .chill
    var shop = "blinkit"

    var firstName: String { name.split(separator: " ").first.map(String.init) ?? name }
}

// MARK: - Health (only when the user uploads reports)

struct Finding: Codable, Hashable, Identifiable {
    let code: String
    let severity: String
    let title: String
    let message: String
    let dietActions: [String]
    var id: String { code }
}

struct ReportTargets: Codable, Hashable {
    let caloriesKcal: Int
    let proteinG: Int
    let carbsG: Int
    let fatG: Int
}

struct RecommendedTest: Codable, Hashable {
    let test: String
    let why: String
}

/// The latest report analysis from the Aharya API.
struct HealthReport: Codable {
    var assessmentID: String
    var status: String // queued, processing, completed, needs_doctor, failed
    var stage: String?
    var error: String?
    var findings: [Finding] = []
    var targets: ReportTargets?
    var recommendedTests: [RecommendedTest] = []
    var warnings: [String] = []
    var updated = Date()

    var isPending: Bool { status == "queued" || status == "processing" }
}

// MARK: - Plan

struct PlannedMeal: Codable, Identifiable, Hashable {
    var id = UUID()
    var slot: Slot
    var recipeID: String
    /// Portion for one person, relative to the recipe's serving.
    var scale: Double = 1
    var pinned = false
    var cooked = false

    var recipe: Recipe? { Catalog.recipe(recipeID) }
}

struct DayPlan: Codable, Identifiable, Hashable {
    var id = UUID()
    var date: Date
    var meals: [PlannedMeal]

    var kcal: Int { Int(meals.reduce(0) { $0 + Double($1.recipe?.kcal ?? 0) * $1.scale }) }
    var protein: Int { Int(meals.reduce(0) { $0 + Double($1.recipe?.protein ?? 0) * $1.scale }) }
}

struct WeekPlan: Codable, Hashable {
    var start: Date
    var days: [DayPlan]
}

struct DailyTargets: Equatable {
    var kcal: Int
    var protein: Int
    var carbs: Int
    var fat: Int
    var source: String
}
