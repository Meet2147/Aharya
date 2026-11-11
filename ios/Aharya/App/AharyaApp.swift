import SwiftUI

@main
struct AharyaApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .tint(Pop.chilli)
        }
    }
}

enum Tab: String, CaseIterable {
    case week, haul, kitchen, you

    var emoji: String {
        switch self {
        case .week: "🍛"
        case .haul: "🛒"
        case .kitchen: "🧺"
        case .you: "🫶"
        }
    }
}

struct RootView: View {
    @Environment(AppModel.self) private var model
    @State private var tab: Tab = {
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-tab"), let t = args[safe: i + 1].flatMap(Tab.init) { return t }
        return .week
    }()

    var body: some View {
        Group {
            if model.profile == nil || model.week == nil {
                OnboardingView()
                    .transition(.opacity)
            } else {
                ZStack(alignment: .bottom) {
                    Pop.bg.ignoresSafeArea()
                    switch tab {
                    case .week: WeekView()
                    case .haul: HaulView()
                    case .kitchen: KitchenView()
                    case .you: YouView()
                    }
                    TabBar(tab: $tab)
                }
            }
        }
        .animation(.snappy, value: model.profile == nil)
        .preferredColorScheme(.light)
    }
}

/// Floating sticker tab bar.
struct TabBar: View {
    @Binding var tab: Tab

    var body: some View {
        HStack(spacing: 4) {
            ForEach(Tab.allCases, id: \.self) { t in
                Button {
                    tab = t
                } label: {
                    VStack(spacing: 1) {
                        Text(t.emoji).font(.system(size: 20))
                        Text(t.rawValue).font(.brico(12, tab == t ? .bold : .semi, relativeTo: .caption))
                    }
                    .foregroundStyle(Pop.ink)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 7)
                    .background(Capsule().fill(tab == t ? Pop.turmeric : .clear))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(t.rawValue)
                .accessibilityAddTraits(tab == t ? .isSelected : [])
            }
        }
        .padding(5)
        .background(Capsule().fill(Pop.paper))
        .overlay(Capsule().strokeBorder(Pop.ink, lineWidth: Pop.border))
        .background(Capsule().fill(Pop.ink).offset(x: 4, y: 4))
        .padding(.horizontal, 20)
        .padding(.bottom, 6)
        .sensoryFeedback(.selection, trigger: tab)
    }
}

/// Standard scrolling page: cream background, padded, room for the tab bar.
struct PageScroll<Content: View>: View {
    var bottom: CGFloat = 110
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) { content }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, bottom)
        }
        .scrollIndicators(.hidden)
        .background(Pop.bg.ignoresSafeArea())
    }
}
