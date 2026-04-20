## 2025-04-20 - [CLI Interactivity with @clack/prompts]
**Learning:** Standardizing CLI interactivity using `@clack/prompts` significantly improves the user experience by providing visual feedback (spinners) and a more polished interface (intro/outro). However, it can break fragile integration tests that rely on exact terminal output.
**Action:** When updating CLI UX, check for integration tests that use `spawn` and `expect(...).toContain(...)` on the output, and be prepared to update them or provide fallback mechanisms for non-TTY environments.
