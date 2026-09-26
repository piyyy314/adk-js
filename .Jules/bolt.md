## 2026-03-26 - Event notation transformation overhead

**Learning:** Event serialization and deserialization (`transformToCamelCaseEvent` / `transformToSnakeCaseEvent`) run frequently on session storage and runner loops. Passing array-based `preserveKeys` caused $O(K)$ linear scans per key in recursive object traversals and per-call array-to-set allocations, while RegExp replacements ran unconditionally even on keys without uppercase or underscore characters.

**Action:** Pre-define preserved key sets as `ReadonlySet<string>` at module load time for $O(1)$ lookups, bypass string path building when `preserveKeys` is empty, and use fast substring checks (`key.includes('_')` and `/[A-Z]/.test(key)`) before calling regex replacement.
