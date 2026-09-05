# Bolt's Journal

## 2026-09-05 - Single-pass regex substitution with lookup Map

**Learning:** Replacing dynamic `new RegExp()` creation in loops with pre-compiled regex pattern matching in a single pass (`String.prototype.replace`) and $O(1)$ Map lookup eliminates regex allocation overhead and cuts string replacement execution time by ~50%. Always order multi-word regex alternation tokens from longest phrase to shortest to prevent partial token matches.
**Action:** Identify repetitive regex replacements in hot text processing paths and consolidate them into single-pass pre-compiled RegExp patterns with Map lookups.
