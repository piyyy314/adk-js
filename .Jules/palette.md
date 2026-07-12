## 2025-05-15 - [Graceful CLI Session Termination]
**Learning:** CLI sessions using `@clack/prompts` (or similar UI libraries) must explicitly call `outro()` on ALL exit paths (success, error, and cancellation) to ensure the terminal UI is properly closed and avoids "hanging" or visual artifacts in the user's shell.
**Action:** Always wrap interactive CLI logic in try-catch blocks and ensure every early return (like cancellations or validation failures) is guarded by an `outro()` call when `process.stdout.isTTY` is true.

## 2025-05-15 - [Deferred UI Initiation]
**Learning:** Calling `intro()` too early in a CLI command can lead to a poor user experience if subsequent environment or input validations fail immediately.
**Action:** Defer `intro()` until after mandatory non-interactive validations (like GCP project/region checks or file system permissions) are complete to ensure the visual session only starts when execution is likely to proceed.
