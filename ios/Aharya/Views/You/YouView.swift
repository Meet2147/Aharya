import SwiftUI

struct YouView: View {
    @Environment(AppModel.self) private var model
    @State private var showReports = false
    @State private var editing = false
    @State private var confirmReset = false

    var body: some View {
        @Bindable var model = model
        let t = model.targets
        PageScroll {
            Text("the tea on you ☕").font(.h1)
            if let p = model.profile {
                VStack(alignment: .leading, spacing: 4) {
                    Text(p.name).font(.h2)
                    Text("\(p.age) · \(p.gender.rawValue) · \(p.diet.label) · \(p.cuisine.label)").font(.brico(15, .semi))
                    Text("\(p.goal.label) · cooking for \(p.household) · \(p.budget.label)").font(.small)
                    if !p.allergies.isEmpty {
                        Text("no " + p.allergies.map(\.rawValue).sorted().joined(separator: ", ")).font(.small)
                    }
                }
                .sticker(Pop.lilac)
            }

            VStack(alignment: .leading, spacing: 8) {
                Eyebrow("daily targets")
                HStack(spacing: 8) {
                    Text("🔥 \(t.kcal) kcal").pill(Pop.turmeric)
                    Text("💪 \(t.protein) g").pill(Pop.pink)
                }
                HStack(spacing: 8) {
                    Text("🍚 \(t.carbs) g carbs").pill(Pop.peach)
                    Text("🥑 \(t.fat) g fat").pill(Pop.lilac)
                }
                Text(t.source).font(.small).foregroundStyle(Pop.muted)
            }
            .sticker()

            Text("reports").font(.h2)
            if let h = model.health, h.status == "completed" || h.status == "needs_doctor" {
                ReportSummary(report: h)
                Button("manage reports") { showReports = true }.buttonStyle(.pop(Pop.paper))
            } else {
                Button {
                    showReports = true
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(model.health?.isPending == true ? "🔍 reading your reports…" : "🩸 add a blood report (optional)")
                            .font(.h3.weight(.bold)).foregroundStyle(Pop.ink)
                        Text("we’ll tune calories and meals to your actual numbers. your plan works fine without it.")
                            .font(.small).foregroundStyle(Pop.muted).multilineTextAlignment(.leading)
                    }
                    .sticker(Pop.butter)
                }
                .buttonStyle(.plain)
            }

            Text("your kirana").font(.h2)
            PopField(label: "kirana whatsapp number", text: $model.kiranaPhone, placeholder: "98765 43210", keyboard: .phonePad,
                     hint: "saved on this phone. “send to kirana” opens their chat directly.")
                .onChange(of: model.kiranaPhone) { model.save() }

            VStack(spacing: 12) {
                Button("edit my preferences") { editing = true }.buttonStyle(.pop())
                Button("start over") { confirmReset = true }.buttonStyle(.pop(Pop.paper, text: Pop.chilli))
            }
            .padding(.top, 6)

            Text("Aharya gives general nutrition guidance. It is not a medical diagnosis or treatment. Speak to a doctor before changing your diet if you have a medical condition or take medication.")
                .font(.small).foregroundStyle(Pop.muted)
        }
        .sheet(isPresented: $showReports) { ReportsView() }
        .sheet(isPresented: $editing) { PreferencesView() }
        .confirmationDialog("start over?", isPresented: $confirmReset, titleVisibility: .visible) {
            Button("clear everything", role: .destructive) { model.startOver() }
        } message: {
            Text("this clears your profile, plan, kitchen and reports from this phone.")
        }
    }
}

/// Edit preferences without redoing onboarding, then reshuffle the week.
struct PreferencesView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var p = Profile()
    @State private var height = ""
    @State private var weight = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Text("preferences").font(.h2)
                    Spacer()
                    Button { dismiss() } label: { Text("✕").font(.h2).foregroundStyle(Pop.ink) }.accessibilityLabel("close")
                }
                group("goal") { ForEach(Goal.allCases, id: \.self) { g in Chip(label: g.label, on: p.goal == g, color: Pop.pink) { p.goal = g } } }
                group("diet") { ForEach(Diet.allCases, id: \.self) { d in Chip(label: d.label, on: p.diet == d, color: Pop.pudina) { p.diet = d } } }
                group("cuisine") { ForEach(Cuisine.allCases, id: \.self) { c in Chip(label: c.label, on: p.cuisine == c, color: Pop.pink) { p.cuisine = c } } }
                group("can’t eat") {
                    ForEach(Allergy.allCases, id: \.self) { a in
                        Chip(label: a.label, on: p.allergies.contains(a), color: Pop.blush) {
                            if p.allergies.contains(a) { p.allergies.remove(a) } else { p.allergies.insert(a) }
                        }
                    }
                }
                group("activity") { ForEach(Activity.allCases, id: \.self) { a in Chip(label: a.label, on: p.activity == a, color: Pop.lilac) { p.activity = a } } }
                group("budget per person / week") { ForEach(Budget.allCases, id: \.self) { b in Chip(label: b.label, on: p.budget == b, color: Pop.butter) { p.budget = b } } }
                group("shop") {
                    ForEach(Shop.all) { s in Chip(label: s.name, on: p.shop == s.id, color: s.color) { p.shop = s.id } }
                    Chip(label: "🏪 kirana", on: p.shop == "kirana", color: Pop.mint) { p.shop = "kirana" }
                }
                HStack(spacing: 12) {
                    PopField(label: "height cm", text: $height, keyboard: .numberPad)
                    PopField(label: "weight kg", text: $weight, keyboard: .numberPad)
                }
                Stepper("cooking for \(p.household)", value: $p.household, in: 1...8).font(.brico(17, .semi))
                Button("save + reshuffle my week 🎲") {
                    p.heightCm = Double(height).flatMap { (120...220).contains($0) ? $0 : nil }
                    p.weightKg = Double(weight).flatMap { (30...250).contains($0) ? $0 : nil }
                    model.profile = p
                    model.newWeek()
                    dismiss()
                }
                .buttonStyle(.pop())
            }
            .padding(20)
        }
        .scrollIndicators(.hidden)
        .background(Pop.bg.ignoresSafeArea())
        .onAppear {
            if let existing = model.profile {
                p = existing
                height = existing.heightCm.map { String(Int($0)) } ?? ""
                weight = existing.weightKg.map { String(Int($0)) } ?? ""
            }
        }
    }

    private func group(_ title: String, @ViewBuilder _ chips: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow(title)
            Flow(spacing: 8) { chips() }
        }
    }
}
