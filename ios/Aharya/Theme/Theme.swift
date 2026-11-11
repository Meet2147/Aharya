import SwiftUI

/// "Masala Pop": cream paper, turmeric and chilli, thick ink outlines, hard sticker shadows.
enum Pop {
    static let bg = Color(hex: 0xFFF4DE)
    static let paper = Color.white
    static let ink = Color(hex: 0x141414)
    static let muted = Color(hex: 0x5C5346)
    static let turmeric = Color(hex: 0xFFB800)
    static let chilli = Color(hex: 0xFF4D2E)
    static let pudina = Color(hex: 0x2EC4B6)
    static let pink = Color(hex: 0xFF8FB1)
    static let lilac = Color(hex: 0xB9A6FF)
    static let butter = Color(hex: 0xFFE7A3)
    static let mint = Color(hex: 0xBFF0D4)
    static let blush = Color(hex: 0xFFD0C4)
    static let sky = Color(hex: 0xDDEBFF)
    static let peach = Color(hex: 0xFFE0B8)
    static let lavender = Color(hex: 0xE6DEFF)

    static let border: CGFloat = 2.5
}

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

enum BricoWeight { case regular, semi, bold }

extension Font {
    /// Bricolage Grotesque, scaled with Dynamic Type relative to `style`.
    static func brico(_ size: CGFloat, _ weight: BricoWeight = .regular, relativeTo style: Font.TextStyle = .body) -> Font {
        let name = switch weight {
        case .regular: "BricolageGrotesque-Regular"
        case .semi: "BricolageGrotesque-SemiBold"
        case .bold: "BricolageGrotesque-ExtraBold"
        }
        return .custom(name, size: size, relativeTo: style)
    }

    static let h1 = brico(38, .bold, relativeTo: .largeTitle)
    static let h2 = brico(26, .bold, relativeTo: .title)
    static let h3 = brico(18, .semi, relativeTo: .headline)
    static let bodyPop = brico(16, .regular, relativeTo: .body)
    static let small = brico(13.5, .regular, relativeTo: .footnote)
    static let label = brico(12, .semi, relativeTo: .caption)
}

// MARK: - Sticker

/// A card with a thick outline and a hard, offset shadow, like a sticker on a laptop.
struct Sticker: ViewModifier {
    var color: Color = Pop.paper
    var offset: CGFloat = 4
    var radius: CGFloat = 20
    var padding: CGFloat = 16

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(shape.fill(color))
            .overlay(shape.strokeBorder(Pop.ink, lineWidth: Pop.border))
            .background(shape.fill(Pop.ink).offset(x: offset, y: offset))
            .padding(.trailing, offset)
            .padding(.bottom, offset)
    }
}

extension View {
    func sticker(_ color: Color = Pop.paper, offset: CGFloat = 4, radius: CGFloat = 20, padding: CGFloat = 16) -> some View {
        modifier(Sticker(color: color, offset: offset, radius: radius, padding: padding))
    }

    /// A small outlined pill, e.g. a tag or stat.
    func pill(_ color: Color = Pop.paper) -> some View {
        self.font(.brico(13, .bold, relativeTo: .footnote))
            .foregroundStyle(Pop.ink)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(Capsule().fill(color))
            .overlay(Capsule().strokeBorder(Pop.ink, lineWidth: 2))
    }
}

// MARK: - Buttons

/// Chunky pill button whose face drops onto its shadow while pressed.
struct PopButtonStyle: ButtonStyle {
    var color: Color = Pop.turmeric
    var text: Color = Pop.ink
    var small = false

    func makeBody(configuration: Configuration) -> some View {
        let offset: CGFloat = small ? 3 : 4
        let pressed = configuration.isPressed
        configuration.label
            .font(small ? .brico(14, .bold, relativeTo: .subheadline) : .brico(18, .bold, relativeTo: .headline))
            .foregroundStyle(text)
            .multilineTextAlignment(.center)
            .padding(.vertical, small ? 9 : 15)
            .padding(.horizontal, small ? 14 : 22)
            .frame(maxWidth: .infinity)
            .background(Capsule().fill(color))
            .overlay(Capsule().strokeBorder(Pop.ink, lineWidth: Pop.border))
            .offset(x: pressed ? offset : 0, y: pressed ? offset : 0)
            .background(Capsule().fill(Pop.ink).offset(x: offset, y: offset))
            .padding(.trailing, offset)
            .padding(.bottom, offset)
            .animation(.snappy(duration: 0.12), value: pressed)
            .sensoryFeedback(.impact(weight: .light), trigger: pressed) { _, new in new }
    }
}

extension ButtonStyle where Self == PopButtonStyle {
    static func pop(_ color: Color = Pop.turmeric, text: Color = Pop.ink, small: Bool = false) -> PopButtonStyle {
        PopButtonStyle(color: color, text: text, small: small)
    }
}

/// Selectable outlined pill.
struct Chip: View {
    let label: String
    var on: Bool
    var color: Color = Pop.turmeric
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.brico(16, .semi))
                .foregroundStyle(Pop.ink)
                .padding(.vertical, 9)
                .padding(.horizontal, 15)
                .background(Capsule().fill(on ? color : Pop.paper))
                .overlay(Capsule().strokeBorder(Pop.ink, lineWidth: 2))
                .offset(y: on ? -1 : 0)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
        .sensoryFeedback(.selection, trigger: on)
    }
}

/// Wrapping row of chips.
struct Flow: Layout {
    var spacing: CGFloat = 10

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, maxX: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            maxX = max(maxX, x - spacing)
            rowHeight = max(rowHeight, size.height)
        }
        // Report the full proposed width so placement wraps exactly where measuring did
        return CGSize(width: proposal.width ?? maxX, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

/// Outlined progress bar.
struct PopBar: View {
    var value: Double
    var color: Color = Pop.chilli

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Pop.paper)
                Capsule().fill(color).frame(width: geo.size.width * min(1, max(0, value)))
            }
            .clipShape(Capsule())
            .overlay(Capsule().strokeBorder(Pop.ink, lineWidth: 2))
        }
        .frame(height: 14)
        .animation(.snappy, value: value)
    }
}

/// Text field in the sticker style.
struct PopField: View {
    let label: String
    @Binding var text: String
    var placeholder = ""
    var keyboard: UIKeyboardType = .default
    var hint: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased()).font(.label).foregroundStyle(Pop.muted).tracking(0.6)
            TextField(placeholder, text: $text)
                .font(.brico(18, .semi))
                .keyboardType(keyboard)
                .padding(.horizontal, 14)
                .padding(.vertical, 13)
                .background(RoundedRectangle(cornerRadius: 16).fill(Pop.paper))
                .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Pop.ink, lineWidth: Pop.border))
            if let hint {
                Text(hint).font(.small).foregroundStyle(Pop.muted)
            }
        }
    }
}

/// Small uppercase section label.
struct Eyebrow: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text.uppercased()).font(.label).tracking(0.6).foregroundStyle(Pop.muted)
    }
}
