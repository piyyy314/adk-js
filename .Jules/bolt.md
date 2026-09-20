# Bolt's Journal - Critical Learnings

## 2026-09-20 - Reference Equality Guards in Storage Wrappers
**Learning:** Calling `super.appendEvent` on both a passed session and a stored session without checking reference equality (`storageSession !== session`) caused every appended event in `InMemorySessionService` to be pushed twice, doubling memory footprint, event processing overhead, and array iteration costs for in-memory session workflows.
**Action:** Always check instance reference equality (`storageSession !== session`) before performing secondary storage calls or mutations on wrapped in-memory session entities.

## 2026-09-20 - V8 Native Regex Engine vs JS Pre-checks
**Learning:** Adding `.includes('_')` checks prior to string `.replace(/_([a-z])/g, ...)` in object notation converters did not improve performance in V8 because V8 regex operations are compiled in native C++, making JS-level pre-checks add overhead without saving time.
**Action:** Always benchmark micro-optimizations against V8 native engines before assuming JS pre-checks on native string routines save execution time.
