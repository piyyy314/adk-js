## 2026-08-28 - Small Array Set conversion vs Array.includes in V8
**Learning:** Converting small fixed arrays (length <= 10) to `Set` for `has()` lookups in hot loops can be slower than native `Array.prototype.includes()` in V8 due to `Set` instantiation/lookup overhead and V8 fast-path optimizations for array methods.
**Action:** Measure micro-benchmarks before replacing `includes()` with `Set.has()`, especially when array length is small or known to be fixed.
