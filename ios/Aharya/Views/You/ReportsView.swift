import SwiftUI
import UniformTypeIdentifiers

/// Optional: send lab reports so the plan gets tuned to the user's numbers.
struct ReportsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var files: [String: ReportsAPI.Upload] = [:]
    @State private var picking: String?
    @State private var contact = ReportsAPI.Contact(email: "", phone: "", alcohol: false, smoker: false)
    @State private var consent = false
    @State private var busy = false
    @State private var error: String?

    private let slots: [(kind: String, emoji: String, title: String, sub: String)] = [
        ("blood", "🩸", "blood report", "needed to send · CBC, lipid, sugar, thyroid… whatever you have"),
        ("urine", "🧪", "urine report", "optional"),
        ("inbody", "⚖️", "InBody / body scan", "optional · makes calories super accurate"),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Text("your reports 🩸").font(.h2)
                    Spacer()
                    Button { dismiss() } label: { Text("✕").font(.h2).foregroundStyle(Pop.ink) }.accessibilityLabel("close")
                }
                if let h = model.health, h.isPending {
                    pending(h)
                } else if let h = model.health, h.status == "completed" || h.status == "needs_doctor" {
                    ReportSummary(report: h)
                    Button("upload newer reports") { model.health = nil; model.save() }.buttonStyle(.pop(Pop.paper))
                } else {
                    form
                }
            }
            .padding(20)
        }
        .scrollIndicators(.hidden)
        .background(Pop.bg.ignoresSafeArea())
        .fileImporter(isPresented: Binding(get: { picking != nil }, set: { if !$0 { picking = nil } }),
                      allowedContentTypes: [.pdf, .image]) { result in
            guard let kind = picking else { return }
            picking = nil
            load(result, kind: kind)
        }
        .task(id: model.health?.assessmentID) { await poll() }
    }

    private var form: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("totally optional. your plan already works without this. add a report and we’ll tune calories and meals to your actual numbers (sugar, cholesterol, haemoglobin…).")
                .font(.bodyPop).foregroundStyle(Pop.muted)
            if let h = model.health, h.status == "failed" {
                Text("last upload couldn’t be read: \(h.error ?? "unknown error"). try a clearer photo or the lab’s PDF.")
                    .font(.brico(14, .semi)).sticker(Pop.blush, offset: 3, padding: 12)
            }
            ForEach(slots, id: \.kind) { slot in
                Button { picking = slot.kind } label: {
                    HStack(spacing: 14) {
                        Text(slot.emoji).font(.system(size: 32))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(slot.title).font(.h3.weight(.bold)).foregroundStyle(Pop.ink)
                            Text(files[slot.kind].map { "✓ \($0.filename)" } ?? slot.sub)
                                .font(.small).foregroundStyle(Pop.muted).lineLimit(1)
                        }
                        Spacer()
                        Text(files[slot.kind] == nil ? "+" : "↺").font(.h2).foregroundStyle(Pop.ink)
                    }
                    .sticker(files[slot.kind] == nil ? Pop.paper : Pop.mint)
                }
                .buttonStyle(.plain)
            }
            Eyebrow("so the report reader can match it to you")
            PopField(label: "email", text: $contact.email, placeholder: "you@gmail.com", keyboard: .emailAddress)
                .textInputAutocapitalization(.never)
            PopField(label: "mobile", text: $contact.phone, placeholder: "98765 43210", keyboard: .phonePad)
            Toggle("🍺 I drink alcohol", isOn: $contact.alcohol).font(.brico(16, .semi)).tint(Pop.pudina)
            Toggle("🚬 I smoke", isOn: $contact.smoker).font(.brico(16, .semi)).tint(Pop.pudina)
            Toggle("I agree to Aharya reading these reports to make my plan. I can delete them any time.", isOn: $consent)
                .font(.brico(14)).tint(Pop.pudina)
            if let error {
                Text(error).font(.brico(14, .semi)).sticker(Pop.blush, offset: 3, padding: 10)
            }
            Button(busy ? "sending…" : "read my reports 🔍") { Task { await send() } }
                .buttonStyle(.pop())
                .disabled(busy)
        }
    }

    private func pending(_ h: HealthReport) -> some View {
        let stages = [("extracting", "🔍 reading your reports"), ("analysing", "🧪 checking every number"), ("planning", "🍳 tuning your plan")]
        let current = stages.firstIndex { $0.0 == h.stage } ?? 0
        return VStack(alignment: .leading, spacing: 14) {
            Text("hang tight, usually under a minute ⏳").font(.bodyPop).foregroundStyle(Pop.muted)
            ForEach(Array(stages.enumerated()), id: \.offset) { i, s in
                Text(i < current ? "✅ " + s.1.dropFirst(2) : s.1 + (i == current ? "…" : ""))
                    .font(.brico(17, i == current ? .bold : .semi))
                    .sticker(i < current ? Pop.mint : i == current ? Pop.turmeric : Pop.paper, offset: i == current ? 5 : 3)
            }
        }
    }

    private func load(_ result: Result<URL, Error>, kind: String) {
        guard case let .success(url) = result else { return }
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url) else {
            error = "couldn’t open that file"
            return
        }
        guard data.count <= 15 * 1024 * 1024 else {
            error = "that file is over 15 MB"
            return
        }
        let type = UTType(filenameExtension: url.pathExtension)
        let mime = type?.preferredMIMEType ?? "application/octet-stream"
        files[kind] = ReportsAPI.Upload(kind: kind, data: data, filename: url.lastPathComponent, mime: mime)
        error = nil
    }

    private func send() async {
        let email = contact.email.trimmingCharacters(in: .whitespaces).lowercased()
        let phone = String(contact.phone.filter(\.isNumber).suffix(10))
        guard files["blood"] != nil else { return error = "add your blood report to send (the others are optional)" }
        guard email.contains("@"), email.contains(".") else { return error = "that email looks off" }
        guard phone.count == 10, let first = phone.first, "6789".contains(first) else { return error = "enter a 10-digit indian mobile number" }
        guard consent else { return error = "we need your ok to read your reports" }
        guard let profile = model.profile else { return }
        busy = true
        error = nil
        defer { busy = false }
        do {
            contact.email = email
            contact.phone = phone
            let id = try await ReportsAPI.submit(profile: profile, contact: contact, files: Array(files.values))
            model.applyReport(HealthReport(assessmentID: id, status: "queued"))
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// Polls while the server reads the reports, then rebuilds the week around the result.
    private func poll() async {
        while let h = model.health, h.isPending, !Task.isCancelled {
            if let fresh = try? await ReportsAPI.fetch(h.assessmentID) {
                model.applyReport(fresh)
                if fresh.status == "completed" { model.newWeek() }
                if !fresh.isPending { return }
            }
            try? await Task.sleep(for: .seconds(3))
        }
    }
}

/// Findings, tests to add and warnings from a finished report.
struct ReportSummary: View {
    let report: HealthReport

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if report.status == "needs_doctor" {
                Text("something in your report needs a doctor before any diet change. this isn’t a diagnosis, just a flag worth taking seriously.")
                    .font(.brico(15, .semi)).sticker(Pop.blush, offset: 3, padding: 12)
            }
            if report.findings.isEmpty {
                Text("nothing flagged 🎉").font(.h3.weight(.bold)).sticker(Pop.mint)
            }
            ForEach(report.findings) { f in
                VStack(alignment: .leading, spacing: 4) {
                    Eyebrow(severity(f.severity).label)
                    Text(f.title).font(.h3.weight(.bold))
                    Text(f.message).font(.small)
                }
                .sticker(severity(f.severity).color, offset: 3)
            }
            if !report.warnings.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Eyebrow("heads up")
                    ForEach(report.warnings, id: \.self) { Text("• \($0)").font(.small) }
                }
                .sticker()
            }
            if !report.recommendedTests.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow("tests worth adding next time")
                    ForEach(report.recommendedTests, id: \.test) { t in
                        VStack(alignment: .leading, spacing: 1) {
                            Text("🧾 \(t.test)").font(.brico(15, .semi))
                            Text(t.why).font(.small).foregroundStyle(Pop.muted)
                        }
                    }
                }
                .sticker()
            }
        }
    }

    private func severity(_ s: String) -> (label: String, color: Color) {
        switch s {
        case "urgent": ("see a doctor now", Color(hex: 0xFF8A75))
        case "see_doctor": ("see a doctor", Pop.blush)
        case "attention": ("fix with food", Pop.butter)
        default: ("good to know", Pop.sky)
        }
    }
}
