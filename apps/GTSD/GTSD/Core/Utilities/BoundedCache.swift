//
//  BoundedCache.swift
//  GTSD
//
//  Created by Claude on 2025-10-27.
//

import Foundation

/// A generic bounded cache with LRU (Least Recently Used) eviction policy
/// Prevents unbounded memory growth by maintaining a maximum size limit
@MainActor
final class BoundedCache<Element: Identifiable> {
    private var items: [Element] = []
    private var accessOrder: [Element.ID] = []
    private let maxSize: Int

    /// Initialize cache with maximum size
    /// - Parameter maxSize: Maximum number of items to store (default: 100)
    init(maxSize: Int = 100) {
        self.maxSize = maxSize
    }

    /// All items in the cache
    var all: [Element] {
        return items
    }

    /// Number of items currently in cache
    var count: Int {
        return items.count
    }

    /// Check if cache is empty
    var isEmpty: Bool {
        return items.isEmpty
    }

    /// Add or update item in cache
    /// If cache is at capacity, removes least recently used item
    func upsert(_ item: Element) {
        // Remove existing item if present
        if let existingIndex = items.firstIndex(where: { $0.id == item.id }) {
            items.remove(at: existingIndex)
        }

        // Add new item
        items.insert(item, at: 0)

        // Update access order
        accessOrder.removeAll { $0 == item.id }
        accessOrder.insert(item.id, at: 0)

        // Evict least recently used if at capacity
        if items.count > maxSize {
            if let lruId = accessOrder.last {
                remove(id: lruId)
            }
        }
    }

    /// Add multiple items to cache
    func upsertAll(_ newItems: [Element]) {
        for item in newItems {
            upsert(item)
        }
    }

    /// Replace all items in cache with new items
    /// Maintains LRU ordering and size limit
    func replaceAll(_ newItems: [Element]) {
        clear()

        // Take only up to maxSize items
        let itemsToAdd = Array(newItems.prefix(maxSize))

        items = itemsToAdd
        accessOrder = itemsToAdd.map { $0.id }
    }

    /// Get item by ID and mark as recently used
    func get(id: Element.ID) -> Element? {
        guard let item = items.first(where: { $0.id == id }) else {
            return nil
        }

        // Update access order
        accessOrder.removeAll { $0 == id }
        accessOrder.insert(id, at: 0)

        return item
    }

    /// Remove item by ID
    func remove(id: Element.ID) {
        items.removeAll { $0.id == id }
        accessOrder.removeAll { $0 == id }
    }

    /// Remove multiple items
    func removeAll(where predicate: (Element) -> Bool) {
        let idsToRemove = items.filter(predicate).map { $0.id }
        items.removeAll(where: predicate)
        accessOrder.removeAll { idsToRemove.contains($0) }
    }

    /// Clear all items from cache
    func clear() {
        items.removeAll()
        accessOrder.removeAll()
    }

    /// Update existing item in cache
    func update(id: Element.ID, with updatedItem: Element) {
        if let index = items.firstIndex(where: { $0.id == id }) {
            items[index] = updatedItem

            // Mark as recently used
            accessOrder.removeAll { $0 == id }
            accessOrder.insert(id, at: 0)
        }
    }

    /// Filter items in cache
    func filter(_ predicate: (Element) -> Bool) -> [Element] {
        return items.filter(predicate)
    }
}

// MARK: - Convenience Methods

extension BoundedCache where Element: Equatable {
    /// Check if cache contains specific item
    func contains(_ item: Element) -> Bool {
        return items.contains(item)
    }
}
