# Bolt's Journal

## 2026-03-04 - Fast Paths and Set Lookups for Object Key Conversions

**Learning:** Recursively converting object key notation (camelCase <-> snake_case) across event streams creates significant string allocation and regex matching overhead. Adding fast-path string checks (`indexOf('_') === -1` and `/[A-Z]/.test()`), using `Set` for O(1) key preservation lookups, and bypassing path concatenation when `preserveKeys` is empty substantially improves event processing efficiency.
**Action:** Always check if string modification routines can short-circuit with fast checks before executing regular expressions or string concatenations.
