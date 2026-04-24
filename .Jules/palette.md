## 2025-05-14 - [Polished CLI Framing with @clack/prompts]
**Learning:** Modern CLI tools benefit significantly from consistent framing (intro/outro) and visual feedback for long-running processes (spinners). Using @clack/prompts provides a high-quality baseline for these interactions.
**Action:** Always wrap interactive CLI commands in `intro()` and `outro()` sequences, and use `spinner()` for any task exceeding 1 second (e.g., dependency installation, cloud deployment).
