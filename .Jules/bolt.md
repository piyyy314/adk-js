## 2026-10-15 - Module-Scoped Sets for Key Preservation & Hoisted Object Loop Conditions

**Learning:** Converting static array parameters used in recursive object traversal (like object key casing converters) to module-scoped Set instances avoids allocating new Set objects on every transformation call. Furthermore, hoisting Set size checks outside per-key object iteration loops eliminates redundant property evaluations.
**Action:** Always define key preservation constants as module-scoped `Set` instances and evaluate invariant `Set.size` checks outside `for..in` or `for..of Object.keys()` loops.
