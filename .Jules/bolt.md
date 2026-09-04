## 2026-09-04 - Set.has vs Array.includes for Small Fixed Key Lists
**Learning:** In V8, searching tiny fixed-size arrays (<= 7 strings) using `Array.prototype.includes` is faster than `Set.prototype.has` due to array inline cache optimization and zero hash-lookup/wrapper allocation overhead.
**Action:** Do not prematurely replace `Array.includes` with `Set` for key matching when the array length is known to be small (< 10 items). Always benchmark small-data operations before converting to set structures.
