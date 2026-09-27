# Bolt's Journal

## 2026-09-27 - Bypassing Path Allocations in Recursive Object Converters

**Learning:** In recursive object transformation functions like `toCamelCase` and `toSnakeCase`, generating full property path strings (`parentKey + '.' + key`) and searching `preserveKeys` arrays (`array.includes`) on every property causes significant unnecessary string allocations and $O(N)$ overhead when `preserveKeys` is empty (the standard case). Converting non-empty `preserveKeys` to a `Set` for $O(1)$ lookup and short-circuiting path generation when `preserveKeys` is empty eliminates all path string allocations.
**Action:** Always check if path-tracking parameters are empty before allocating path strings during deep object traversals, and convert array lookups to Sets.
