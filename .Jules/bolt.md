## 2026-03-31 - Array.prototype.includes vs Set Overhead for Small Arrays

**Learning:** Creating a `new Set(smallArray)` on every function invocation creates heap allocation overhead (~10x slower) that far outweighs $O(1)$ set lookup benefits when array sizes are small (2-7 items). V8 optimizes `Array.prototype.includes()` for short arrays in contiguous memory.

**Action:** Keep small lookup collections (e.g. key preservation lists) as short arrays instead of instantiating Sets per function call. Fast-path key checks (e.g. `!key.includes('_')` or `!/[A-Z]/.test(key)`) and static replacer closures to avoid regex/closure overhead.
