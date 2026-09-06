# Bolt's Journal

## 2026-03-31 - Fast-Path Regex & O(1) Lookups for Deep Object Case Conversions

**Learning:** Recursively traversing objects to convert keys between `snake_case` and `camelCase` (e.g. for event payload transformations) spends significant CPU time on regex allocations/replaces and $O(N)$ array `.includes()` searches. Adding fast-path checks (`!key.includes('_')` and `!/[A-Z]/.test(key)`) and converting `preserveKeys` to a `Set` once at entry point drastically reduces string allocations and lookup overhead during high-frequency event transformations.
**Action:** Always prefer fast-path string/regex tests before running complex replacement operations, and convert preserve lists to Sets once before recursive traversal.
