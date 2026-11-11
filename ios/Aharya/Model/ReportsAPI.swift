import Foundation

/// The optional part: sending lab reports to the Aharya API, which reads them and returns
/// findings and calorie targets. The app works fully without this.
enum ReportsAPI {
    static let base = URL(string: ProcessInfo.processInfo.environment["AHARYA_API_URL"] ?? "https://aharya.fastapicloud.dev")!

    struct Upload {
        let kind: String // blood, urine, inbody
        let data: Data
        let filename: String
        let mime: String
    }

    struct Contact {
        var email: String
        var phone: String
        var alcohol: Bool
        var smoker: Bool
    }

    enum APIError: LocalizedError {
        case server(String)
        var errorDescription: String? { if case let .server(m) = self { m } else { nil } }
    }

    /// Sends the profile and reports; returns the assessment id to poll.
    static func submit(profile p: Profile, contact: Contact, files: [Upload]) async throws -> String {
        var fields: [String: String] = [
            "name": p.name,
            "age": String(p.age),
            "gender": p.gender.rawValue,
            "alcohol": String(contact.alcohol),
            "smoker": String(contact.smoker),
            "email": contact.email,
            "phone": contact.phone,
            "consent": "true",
            "diet_type": p.diet.rawValue,
            "cuisine": p.cuisine == .mix ? "north" : p.cuisine.rawValue,
            "activity_level": p.activity.rawValue,
            "allergies": p.allergies.map(\.rawValue).joined(separator: ","),
            "weeks": "1",
        ]
        if let h = p.heightCm { fields["height_cm"] = String(h) }
        if let w = p.weightKg { fields["weight_kg"] = String(w) }

        let boundary = "aharya-\(UUID().uuidString)"
        var body = Data()
        func add(_ s: String) { body.append(Data(s.utf8)) }
        for (k, v) in fields {
            add("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(k)\"\r\n\r\n\(v)\r\n")
        }
        for f in files {
            add("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(f.kind)_report\"; filename=\"\(f.filename)\"\r\n")
            add("Content-Type: \(f.mime)\r\n\r\n")
            body.append(f.data)
            add("\r\n")
        }
        add("--\(boundary)--\r\n")

        var req = URLRequest(url: base.appending(path: "v1/assessments"))
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        req.timeoutInterval = 120
        let (data, response) = try await URLSession.shared.data(for: req)
        try check(data, response)
        struct Created: Decodable { let assessmentId: String }
        return try decoder.decode(Created.self, from: data).assessmentId
    }

    static func fetch(_ id: String) async throws -> HealthReport {
        let (data, response) = try await URLSession.shared.data(from: base.appending(path: "v1/assessments/\(id)"))
        try check(data, response)
        let dto = try decoder.decode(AssessmentDTO.self, from: data)
        return HealthReport(
            assessmentID: dto.assessmentId,
            status: dto.status,
            stage: dto.stage,
            error: dto.error,
            findings: dto.findings,
            targets: dto.targets,
            recommendedTests: dto.recommendedTests,
            warnings: dto.warnings
        )
    }

    private struct AssessmentDTO: Decodable {
        let assessmentId: String
        let status: String
        let stage: String?
        let error: String?
        let warnings: [String]
        let findings: [Finding]
        let recommendedTests: [RecommendedTest]
        let targets: ReportTargets?
    }

    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    private static func check(_ data: Data, _ response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) else { return }
        // FastAPI puts the reason in "detail": a string, a list of validation errors, or an object
        let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        let detail = json?["detail"]
        let message = (detail as? String)
            ?? ((detail as? [[String: Any]])?.first?["msg"] as? String)
            ?? ((detail as? [String: Any])?["message"] as? String)
            ?? "Request failed (\(http.statusCode))."
        throw APIError.server(message)
    }
}
