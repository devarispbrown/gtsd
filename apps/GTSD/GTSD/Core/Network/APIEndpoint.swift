//
//  APIEndpoint.swift
//  GTSD
//
//  Created by Claude on 2025-10-26.
//

import Foundation

/// HTTP methods
enum HTTPMethod: String, Sendable {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

/// API endpoints with path, method, and configuration
enum APIEndpoint: Sendable {
    // MARK: - Authentication
    case signup(email: String, password: String, name: String)
    case login(email: String, password: String)
    case logout
    case refreshToken
    case currentUser
    case updateProfile(name: String?, email: String?)
    case changePassword(currentPassword: String, newPassword: String)
    case deleteAccount
    case completeOnboarding(CompleteOnboardingRequest)

    // MARK: - Tasks
    case getTasks(page: Int?, limit: Int?, status: String?, category: String?)
    case createTask(title: String, description: String?, category: String, dueDate: Date?, priority: String?)
    case getTask(id: String)
    case updateTask(id: String, title: String?, description: String?, category: String?, dueDate: Date?, priority: String?, status: String?)
    case deleteTask(id: String)
    case completeTask(id: String)
    case uncompleteTask(id: String)

    // MARK: - Photos
    case uploadPhoto(taskId: String, imageData: Data, caption: String?)
    case getPhotos(taskId: String?, page: Int?, limit: Int?)
    case getPhoto(id: String)
    case deletePhoto(id: String)

    // MARK: - Streaks
    case getCurrentStreak
    case getStreakHistory(page: Int?, limit: Int?)

    // MARK: - Badges
    case getBadges
    case getUserBadges

    // MARK: - Summary
    case getHowItWorksSummary

    // MARK: - Plans
    case generatePlan(forceRecompute: Bool)

    var path: String {
        switch self {
        // Authentication
        case .signup: return "/auth/signup"
        case .login: return "/auth/login"
        case .logout: return "/auth/logout"
        case .refreshToken: return "/auth/refresh"
        case .currentUser: return "/auth/me"
        case .updateProfile: return "/auth/profile"
        case .changePassword: return "/auth/change-password"
        case .deleteAccount: return "/auth/delete-account"
        case .completeOnboarding: return "/v1/onboarding"

        // Tasks
        case .getTasks: return "/v1/tasks/today"
        case .createTask: return "/v1/tasks/today"
        case .getTask(let id): return "/v1/tasks/\(id)"
        case .updateTask(let id, _, _, _, _, _, _): return "/v1/tasks/\(id)"
        case .deleteTask(let id): return "/v1/tasks/\(id)"
        case .completeTask(let id): return "/v1/tasks/\(id)/complete"
        case .uncompleteTask(let id): return "/v1/tasks/\(id)/uncomplete"

        // Photos
        case .uploadPhoto: return "/v1/progress/photos"
        case .getPhotos: return "/v1/progress/photos"
        case .getPhoto(let id): return "/v1/progress/photos/\(id)"
        case .deletePhoto(let id): return "/v1/progress/photos/\(id)"

        // Streaks
        case .getCurrentStreak: return "/v1/streaks/me"
        case .getStreakHistory: return "/v1/streaks/history"

        // Badges
        case .getBadges: return "/v1/badges/me"
        case .getUserBadges: return "/v1/badges/me"

        // Summary
        case .getHowItWorksSummary: return "/v1/summary/how-it-works"

        // Plans
        case .generatePlan: return "/v1/plans/generate"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .signup, .login, .createTask, .uploadPhoto, .completeTask, .uncompleteTask, .completeOnboarding, .generatePlan:
            return .post
        case .updateProfile, .updateTask:
            return .put
        case .changePassword:
            return .patch
        case .logout, .deleteAccount, .deleteTask, .deletePhoto:
            return .delete
        default:
            return .get
        }
    }

    var requiresAuth: Bool {
        switch self {
        case .signup, .login:
            return false
        default:
            return true
        }
    }

    func body() throws -> Data? {
        switch self {
        case .signup(let email, let password, let name):
            return try JSONEncoder().encode([
                "email": email,
                "password": password,
                "name": name
            ])

        case .login(let email, let password):
            return try JSONEncoder().encode([
                "email": email,
                "password": password
            ])

        case .updateProfile(let name, let email):
            var params: [String: String] = [:]
            if let name = name { params["name"] = name }
            if let email = email { params["email"] = email }
            return try JSONEncoder().encode(params)

        case .changePassword(let currentPassword, let newPassword):
            return try JSONEncoder().encode([
                "currentPassword": currentPassword,
                "newPassword": newPassword
            ])

        case .createTask(let title, let description, let category, let dueDate, let priority):
            var params: [String: Any] = [
                "title": title,
                "category": category
            ]
            if let description = description { params["description"] = description }
            if let dueDate = dueDate {
                let formatter = ISO8601DateFormatter()
                params["dueDate"] = formatter.string(from: dueDate)
            }
            if let priority = priority { params["priority"] = priority }
            return try JSONSerialization.data(withJSONObject: params)

        case .updateTask(_, let title, let description, let category, let dueDate, let priority, let status):
            var params: [String: Any] = [:]
            if let title = title { params["title"] = title }
            if let description = description { params["description"] = description }
            if let category = category { params["category"] = category }
            if let dueDate = dueDate {
                let formatter = ISO8601DateFormatter()
                params["dueDate"] = formatter.string(from: dueDate)
            }
            if let priority = priority { params["priority"] = priority }
            if let status = status { params["status"] = status }
            return params.isEmpty ? nil : try JSONSerialization.data(withJSONObject: params)

        case .uploadPhoto(let taskId, _, let caption):
            var params: [String: String] = ["taskId": taskId]
            if let caption = caption { params["caption"] = caption }
            return try JSONEncoder().encode(params)

        case .completeOnboarding(let request):
            return try JSONEncoder().encode(request)

        case .generatePlan(let forceRecompute):
            return try JSONEncoder().encode([
                "forceRecompute": forceRecompute
            ])

        default:
            return nil
        }
    }

    func queryItems() -> [URLQueryItem]? {
        switch self {
        case .getTasks(let page, let limit, let status, let category):
            var items: [URLQueryItem] = []
            if let page = page { items.append(URLQueryItem(name: "page", value: "\(page)")) }
            if let limit = limit { items.append(URLQueryItem(name: "limit", value: "\(limit)")) }
            if let status = status { items.append(URLQueryItem(name: "status", value: status)) }
            if let category = category { items.append(URLQueryItem(name: "category", value: category)) }
            return items.isEmpty ? nil : items

        case .getPhotos(let taskId, let page, let limit):
            var items: [URLQueryItem] = []
            if let taskId = taskId { items.append(URLQueryItem(name: "taskId", value: taskId)) }
            if let page = page { items.append(URLQueryItem(name: "page", value: "\(page)")) }
            if let limit = limit { items.append(URLQueryItem(name: "limit", value: "\(limit)")) }
            return items.isEmpty ? nil : items

        case .getStreakHistory(let page, let limit):
            var items: [URLQueryItem] = []
            if let page = page { items.append(URLQueryItem(name: "page", value: "\(page)")) }
            if let limit = limit { items.append(URLQueryItem(name: "limit", value: "\(limit)")) }
            return items.isEmpty ? nil : items

        default:
            return nil
        }
    }
}
