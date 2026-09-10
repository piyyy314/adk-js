# Bolt's Journal - Critical Learnings

## 2026-09-10 - Fast-path Casing Conversion and O(1) Key Preservation

**Learning:** Object notation transformations (`toCamelCase`/`toSnakeCase`) process thousands of keys across conversation events. Checking regex matches on already-conforming keys and linear array searches (`includes`) on `preserveKeys` create significant performance overhead and unnecessary string allocations.
**Action:** Use string fast-paths (`indexOf('_') === -1` or `!/[A-Z]/.test(key)`) to skip regex replace callbacks on conforming keys, convert `preserveKeys` to `Set<string>` statically, and omit `fullPath` string concatenations when no keys are preserved.
