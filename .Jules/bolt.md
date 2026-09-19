# Bolt's Journal - Critical Learnings

## 2026-09-19 - Safe Key Notation Transformations without Unbounded Caching
**Learning:** Transforming key casing in high-frequency data structures (like event logs and session objects) can be optimized without global memoization. Bypassing string allocations when preserve sets are empty, fast-pathing already-conforming keys, and using Sets for $O(1)$ lookups yields substantial speedups while eliminating memory leak risks associated with unbounded key caches.
**Action:** Default to fast-path primitive string checks and Set conversions instead of introducing unbounded global caches for key name memoization.
