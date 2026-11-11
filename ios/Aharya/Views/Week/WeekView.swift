import SwiftUI

struct WeekView: View {
    @Environment(AppModel.self) private var model
    @State private var dayIndex: Int?
    @State private var open: Opened?
    @State private var rerolling = 0

    struct Opened: Identifiable {
        let meal: PlannedMeal
        let day: DayPlan
        var id: UUID { meal.id }
    }

    var body: some View {
        if let week = model.week {
            let today = todayIndex(week)
            let index = dayIndex ?? today
            let day = week.days[index]
            let targets = model.targets
            PageScroll {
                header
                HStack(spacing: 10) {
                    stat("🔥", "\(targets.kcal)", "kcal / day", Pop.turmeric)
                    stat("💪", "\(targets.protein)g", "protein / day", Pop.pink)
                }
                ReportNudge()
                dayStrip(week, selected: index, today: today)
                dayProgress(day)
                ForEach(day.meals) { meal in
                    MealCard(meal: meal, household: model.profile?.household ?? 1) {
                        open = Opened(meal: meal, day: day)
                    } swap: {
                        withAnimation(.snappy) { model.swap(meal, in: day) }
                    } pin: {
                        model.toggle(\.pinned, meal)
                    } cooked: {
                        model.toggle(\.cooked, meal)
                    }
                }
                Button("🎲 shuffle the week (keeps 📌 pins)") {
                    rerolling += 1
                    withAnimation(.snappy) { model.newWeek() }
                }
                .buttonStyle(.pop(Pop.paper))
                .sensoryFeedback(.success, trigger: rerolling)
            }
            .sheet(item: $open) { o in
                RecipeDetailView(mealID: o.meal.id)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 2) {
            Eyebrow(Date.now.formatted(.dateTime.weekday(.wide).day().month(.abbreviated)))
            Text("hey \(model.profile?.firstName ?? "you") 👋").font(.h1).foregroundStyle(Pop.ink)
        }
    }

    private func stat(_ emoji: String, _ value: String, _ unit: String, _ color: Color) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("\(emoji) \(value)").font(.h2)
            Text(unit).font(.brico(13, .semi)).foregroundStyle(Pop.ink)
        }
        .sticker(color, offset: 3, padding: 12)
    }

    private func dayStrip(_ week: WeekPlan, selected: Int, today: Int) -> some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                ForEach(Array(week.days.enumerated()), id: \.element.id) { i, d in
                    let on = i == selected
                    Button {
                        dayIndex = i
                    } label: {
                        VStack(spacing: 0) {
                            Text(i == today ? "today" : d.date.formatted(.dateTime.weekday(.abbreviated)).lowercased())
                                .font(.brico(12, .semi)).foregroundStyle(on ? Pop.paper : Pop.muted)
                            Text(d.date.formatted(.dateTime.day())).font(.h2).foregroundStyle(on ? Pop.paper : Pop.ink)
                        }
                        .frame(width: 56)
                        .padding(.vertical, 8)
                        .background(RoundedRectangle(cornerRadius: 18).fill(on ? Pop.chilli : Pop.paper))
                        .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Pop.ink, lineWidth: Pop.border))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.vertical, 2)
        }
        .scrollIndicators(.hidden)
        .sensoryFeedback(.selection, trigger: dayIndex)
    }

    private func dayProgress(_ day: DayPlan) -> some View {
        let cooked = day.meals.filter(\.cooked)
        let eaten = cooked.reduce(0.0) { $0 + Double($1.recipe?.kcal ?? 0) * $1.scale }
        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("\(cooked.count)/\(day.meals.count) meals done").font(.h3.weight(.bold))
                Spacer()
                Text("\(Int(eaten)) / \(day.kcal) kcal").font(.small).foregroundStyle(Pop.muted)
            }
            PopBar(value: day.kcal > 0 ? eaten / Double(day.kcal) : 0, color: Pop.pudina)
        }
        .sticker()
    }

    private func todayIndex(_ week: WeekPlan) -> Int {
        let days = Calendar.current.dateComponents([.day], from: week.start, to: Calendar.current.startOfDay(for: .now)).day ?? 0
        return min(max(days, 0), week.days.count - 1)
    }
}

/// Prompts for reports when there are none; summarises them when there are.
struct ReportNudge: View {
    @Environment(AppModel.self) private var model
    @State private var showReports = false

    var body: some View {
        Group {
            if let h = model.health, h.status == "completed", !h.findings.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Eyebrow("tuned for your reports 🩸")
                    Text(h.findings.prefix(3).map(\.title).joined(separator: " · ")).font(.brico(15, .semi))
                }
                .sticker(Pop.mint, offset: 3, padding: 12)
            } else if model.health == nil {
                Button { showReports = true } label: {
                    HStack {
                        Text("🩸 got a blood report? add it and we’ll tune this plan to your numbers. totally optional.")
                            .font(.brico(14, .semi)).foregroundStyle(Pop.ink).multilineTextAlignment(.leading)
                        Spacer(minLength: 4)
                        Text("→").font(.h3)
                    }
                    .sticker(Pop.butter, offset: 3, padding: 12)
                }
                .buttonStyle(.plain)
            }
        }
        .sheet(isPresented: $showReports) { ReportsView() }
    }
}

struct MealCard: View {
    let meal: PlannedMeal
    let household: Int
    let open: () -> Void
    let swap: () -> Void
    let pin: () -> Void
    let cooked: () -> Void

    private var color: Color {
        if meal.cooked { return Color(hex: 0xEFEAE0) }
        switch meal.slot {
        case .breakfast: return Pop.butter
        case .lunch: return Pop.peach
        case .snack: return Pop.mint
        case .dinner: return Pop.lavender
        }
    }

    var body: some View {
        if let r = meal.recipe {
            VStack(alignment: .leading, spacing: 12) {
                Button(action: open) {
                    HStack(alignment: .top, spacing: 12) {
                        Text(r.emoji).font(.system(size: 34))
                        VStack(alignment: .leading, spacing: 3) {
                            HStack(spacing: 6) {
                                Eyebrow("\(meal.slot.emoji) \(meal.slot.label)")
                                if meal.pinned { Text("📌").font(.system(size: 12)) }
                            }
                            Text(r.name).font(.h3.weight(.bold)).foregroundStyle(Pop.ink)
                                .strikethrough(meal.cooked).multilineTextAlignment(.leading)
                            Text("\(r.minutes) min · \(Int(Double(r.kcal) * meal.scale)) kcal · \(Int(Double(r.protein) * meal.scale)) g protein")
                                .font(.small).foregroundStyle(Pop.muted)
                            if meal.scale != 1 {
                                Text("\(portion(meal.scale)) serving").font(.brico(12.5, .semi)).foregroundStyle(Pop.ink)
                            }
                        }
                        Spacer(minLength: 0)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                HStack(spacing: 8) {
                    action(meal.cooked ? "✅ done" : "✓ ate it", on: meal.cooked, cooked)
                    action("🔀 swap", on: false, swap)
                    action(meal.pinned ? "📌 pinned" : "📌 pin", on: meal.pinned, pin)
                }
            }
            .sticker(color, offset: meal.cooked ? 2 : 4)
        }
    }

    private func action(_ label: String, on: Bool, _ run: @escaping () -> Void) -> some View {
        Button(action: run) {
            Text(label).font(.brico(13, .bold)).foregroundStyle(Pop.ink)
                .padding(.vertical, 7).frame(maxWidth: .infinity)
                .background(Capsule().fill(on ? Pop.paper : Pop.paper.opacity(0.6)))
                .overlay(Capsule().strokeBorder(Pop.ink, lineWidth: on ? 2.5 : 1.5))
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.impact(weight: .light), trigger: on)
    }
}

func portion(_ scale: Double) -> String {
    scale == scale.rounded() ? "\(Int(scale))×" : String(format: "%.2g×", scale)
}
