# Bolt's Journal

## 2026-10-03 - Filter/Slice Session Events Before Deep Cloning

**Learning:** Deep cloning entire session objects prior to filtering events (`numRecentEvents` or `afterTimestamp`) causes massive CPU and memory allocation overhead when sessions contain long histories (e.g. 1000+ events). Slicing the event array before calling `cloneDeep()` on the sliced subset reduces benchmark execution time by ~99% (from ~40ms to ~0.4ms for 1000 events).
**Action:** Always slice or filter collection slices before deep cloning, avoiding unnecessary copies of discarded items.
