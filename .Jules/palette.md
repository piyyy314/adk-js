## 2025-05-14 - [Polishing CLI Interaction with @clack/prompts]
**Learning:** Migrating from basic `readline` to `@clack/prompts` significantly improves the "feel" of a CLI tool by providing structured input/output (intro, outro, text) and visual feedback (spinner) during long-running tasks.
**Action:** Use `@clack/prompts` for all interactive CLI flows in the `dev` package. Ensure `isCancel` is handled to gracefully exit without crashing or leaving the terminal in a bad state. Use spinners for any operation that takes more than ~200ms.
