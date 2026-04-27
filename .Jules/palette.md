# Palette's Journal - Critical UX Learnings

## 2025-05-15 - Modernizing CLI Interaction with @clack/prompts
**Learning:** Replacing `readline` with `@clack/prompts` enables a more consistent and accessible CLI experience, including better handling of user cancellations (SIGINT) which allows for clean-up or session saving before exiting.
**Action:** Use `@clack/prompts` for all interactive CLI inputs to provide a modern UX and handle `isCancel` correctly.
