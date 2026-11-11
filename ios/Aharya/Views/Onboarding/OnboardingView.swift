import SwiftUI

/// One question per screen. Nothing here needs a report; those are optional, later, in "you".
struct OnboardingView: View {
    @Environment(AppModel.self) private var model
    @State private var p = Profile()
    @State private var step = -1 // -1 = welcome
    @State private var ageText = ""
    @State private var heightText = ""
    @State private var weightText = ""
    @State private var error: String?
    @State private var cooking = false

    private let steps = 11

    var body: some View {
        ZStack {
            Pop.bg.ignoresSafeArea()
            if cooking {
                CookingView()
            } else if step < 0 {
                Welcome { step = 0 }
            } else {
                question
            }
        }
        .animation(.snappy, value: step)
        .onAppear {
            if let existing = model.profile {
                p = existing
                ageText = String(existing.age)
                heightText = existing.heightCm.map { String(Int($0)) } ?? ""
                weightText = existing.weightKg.map { String(Int($0)) } ?? ""
            }
        }
    }

    private var question: some View {
        VStack(alignment: .leading, spacing: 22) {
            HStack(spacing: 12) {
                Button {
                    error = nil
                    step -= 1
                } label: {
                    Text("←").font(.h2).foregroundStyle(Pop.ink)
                }
                .accessibilityLabel("back")
                PopBar(value: Double(step + 1) / Double(steps), color: Pop.turmeric)
                Text("\(step + 1)/\(steps)").font(.small).foregroundStyle(Pop.muted)
            }
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    let q = content(step)
                    VStack(alignment: .leading, spacing: 8) {
                        Text(q.title).font(.h2).foregroundStyle(Pop.ink)
                        if let sub = q.sub { Text(sub).font(.bodyPop).foregroundStyle(Pop.muted) }
                    }
                    q.body
                    if let error {
                        Text(error).font(.brico(14, .semi)).foregroundStyle(Pop.ink).sticker(Pop.blush, offset: 3, radius: 14, padding: 10)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .scrollIndicators(.hidden)
            Button(step == steps - 1 ? "cook my week 🍳" : "next →") { next() }
                .buttonStyle(.pop())
        }
        .padding(20)
    }

    private func next() {
        if let problem = validate(step) {
            error = problem
            return
        }
        error = nil
        if step < steps - 1 {
            step += 1
            return
        }
        p.name = p.name.trimmingCharacters(in: .whitespaces)
        cooking = true
        Task {
            try? await Task.sleep(for: .seconds(1.6))
            model.finishOnboarding(p)
        }
    }

    private func validate(_ s: Int) -> String? {
        switch s {
        case 0: return p.name.trimmingCharacters(in: .whitespaces).count >= 2 ? nil : "need at least 2 letters"
        case 1:
            guard let a = Int(ageText), (16...85).contains(a) else { return "enter an age between 16 and 85" }
            p.age = a
            return nil
        case 7:
            let h = Double(heightText), w = Double(weightText)
            if !heightText.isEmpty, !(120...220).contains(h ?? 0) { return "height looks off (120–220 cm)" }
            if !weightText.isEmpty, !(30...250).contains(w ?? 0) { return "weight looks off (30–250 kg)" }
            p.heightCm = heightText.isEmpty ? nil : h
            p.weightKg = weightText.isEmpty ? nil : w
            return nil
        default: return nil
        }
    }

    private struct Question {
        let title: String
        var sub: String?
        let body: AnyView
    }

    private func content(_ s: Int) -> Question {
        switch s {
        case 0:
            return Question(title: "first things first, what do we call you?",
                            body: AnyView(PopField(label: "name", text: $p.name, placeholder: "Rhea Mehta")))
        case 1:
            return Question(title: "a lil about you", sub: "your targets change with age", body: AnyView(VStack(alignment: .leading, spacing: 18) {
                PopField(label: "age", text: $ageText, placeholder: "27", keyboard: .numberPad)
                Flow { ForEach(Gender.allCases, id: \.self) { g in Chip(label: g == .other ? "other / rather not say" : g.rawValue, on: p.gender == g) { p.gender = g } } }
            }))
        case 2:
            return Question(title: "what’s the goal?", body: AnyView(
                Flow { ForEach(Goal.allCases, id: \.self) { g in Chip(label: g.label, on: p.goal == g, color: Pop.pink) { p.goal = g } } }))
        case 3:
            return Question(title: "how do you eat?", sub: "we never sneak in anything off-limits", body: AnyView(
                Flow { ForEach(Diet.allCases, id: \.self) { d in Chip(label: d.label, on: p.diet == d, color: Pop.pudina) { p.diet = d } } }))
        case 4:
            return Question(title: "whose ghar ka khana?", sub: "your week leans this way", body: AnyView(
                Flow { ForEach(Cuisine.allCases, id: \.self) { c in Chip(label: c.label, on: p.cuisine == c, color: Pop.pink) { p.cuisine = c } } }))
        case 5:
            return Question(title: "anything you can’t eat?", sub: "tap all that apply, or skip", body: AnyView(
                Flow {
                    ForEach(Allergy.allCases, id: \.self) { a in
                        Chip(label: a.label, on: p.allergies.contains(a), color: Pop.blush) {
                            if p.allergies.contains(a) { p.allergies.remove(a) } else { p.allergies.insert(a) }
                        }
                    }
                }))
        case 6:
            return Question(title: "how much do you move?", body: AnyView(
                Flow { ForEach(Activity.allCases, id: \.self) { a in Chip(label: a.label, on: p.activity == a, color: Pop.lilac) { p.activity = a } } }))
        case 7:
            return Question(title: "height & weight", sub: "optional, but your calories get way more accurate", body: AnyView(VStack(spacing: 14) {
                PopField(label: "height (cm)", text: $heightText, placeholder: "165", keyboard: .numberPad)
                PopField(label: "weight (kg)", text: $weightText, placeholder: "68", keyboard: .numberPad)
            }))
        case 8:
            return Question(title: "who are we cooking for?", sub: "groceries scale to everyone", body: AnyView(VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 16) {
                    Button("−") { p.household = max(1, p.household - 1) }.buttonStyle(.pop(Pop.paper, small: true)).frame(width: 64)
                    Text(p.household == 1 ? "just me" : "\(p.household) people").font(.h2).frame(maxWidth: .infinity)
                    Button("+") { p.household = min(8, p.household + 1) }.buttonStyle(.pop(Pop.paper, small: true)).frame(width: 64)
                }
                Eyebrow("weekly budget per person")
                Flow { ForEach(Budget.allCases, id: \.self) { b in Chip(label: b.label, on: p.budget == b, color: Pop.butter) { p.budget = b } } }
            }))
        case 9:
            return Question(title: "where do you shop?", sub: "we’ll send your haul there", body: AnyView(
                Flow {
                    ForEach(Shop.all) { s in Chip(label: s.name, on: p.shop == s.id, color: s.color) { p.shop = s.id } }
                    Chip(label: "🏪 my local kirana", on: p.shop == "kirana", color: Pop.mint) { p.shop = "kirana" }
                }))
        default:
            return Question(title: "already in your kitchen?", sub: "we’ll cook around it. skip if you’re not sure",
                            body: AnyView(PantryPicker(compact: true)))
        }
    }
}

private struct Welcome: View {
    let start: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                HStack(spacing: 8) {
                    Text("aharya").font(.h3.weight(.heavy)).sticker(Pop.turmeric, offset: 3, radius: 12, padding: 6).fixedSize()
                    Text("meal plans that get you").font(.small).foregroundStyle(Pop.muted)
                }
                (Text("a week of desi meals + the groceries, ").foregroundStyle(Pop.ink)
                    + Text("sorted").foregroundStyle(Pop.chilli))
                    .font(.brico(44, .bold, relativeTo: .largeTitle))
                ZStack(alignment: .topLeading) {
                    VStack(alignment: .leading, spacing: 6) {
                        Eyebrow("🍛 tuesday")
                        Text("moong dal chilla + mint curd").font(.brico(16, .semi))
                        Text("rajma chawal + kachumber").font(.brico(16, .semi))
                        Text("1,500 kcal · 80 g protein").font(.small).foregroundStyle(Pop.muted)
                    }
                    .sticker(Pop.butter)
                    .frame(width: 250)
                    .rotationEffect(.degrees(-5))
                    Text("🛒 28 items → blinkit")
                        .font(.h3.weight(.bold))
                        .sticker(Pop.pink, offset: 3, padding: 12)
                        .fixedSize()
                        .rotationEffect(.degrees(4))
                        .offset(x: 110, y: 150)
                    Text("🩸 report? optional")
                        .font(.brico(15, .bold))
                        .sticker(Pop.mint, offset: 3, padding: 10)
                        .fixedSize()
                        .rotationEffect(.degrees(-3))
                        .offset(x: 10, y: 215)
                }
                .frame(height: 280, alignment: .topLeading)
                Text("tell us how you eat, we plan the week, build the grocery list and send it to Blinkit, Zepto or your kirana. got a blood report? drop it in later and the plan gets sharper.")
                    .font(.bodyPop).foregroundStyle(Pop.muted)
                Button("let’s cook 🔥", action: start).buttonStyle(.pop())
                Text("nutrition guidance, not a diagnosis.").font(.small).foregroundStyle(Pop.muted).frame(maxWidth: .infinity)
            }
            .padding(20)
        }
        .scrollIndicators(.hidden)
    }
}

private struct CookingView: View {
    @State private var spin = false

    var body: some View {
        VStack(spacing: 18) {
            Text("🍳").font(.system(size: 80)).rotationEffect(.degrees(spin ? 12 : -12))
            Text("cooking up your week…").font(.h2)
            Text("picking meals, balancing protein, writing the grocery list").font(.bodyPop).foregroundStyle(Pop.muted).multilineTextAlignment(.center)
        }
        .padding(30)
        .onAppear { withAnimation(.easeInOut(duration: 0.35).repeatForever()) { spin = true } }
    }
}
