# Palette's Journal

## 2025-05-14 - Enhancing CLI UX with @clack/prompts

**Learning:** Using `intro`, `outro`, and `spinner` from `@clack/prompts` significantly improves the perceived responsiveness and professionalism of a CLI tool, especially during long-running operations like `npm install`.
**Action:** Always consider adding visual feedback for asynchronous tasks in CLI tools to keep the user informed.

## 2025-05-15 - Improving Perceived Latency with "Thinking" Spinners

**Learning:** Adding a "Thinking..." spinner immediately after user input in interactive CLI agents bridges the gap between user submission and the first model response chunk, making the application feel much more responsive.
**Action:** Implement a spinner that starts on user input and stops before the first chunk of streaming output is displayed.

## 2025-05-22 - Reducing CLI Friction with Defaults and Placeholders

**Learning:** Providing a timestamped string as an 'initialValue' for identifiers (like Session IDs) and using 'placeholder' to show example inputs significantly reduces the cognitive load and typing effort for users in interactive CLI sessions.
**Action:** Always provide sensible defaults and descriptive placeholders in CLI prompts to guide users and streamline repetitive tasks.

## 2025-05-29 - Guiding Selection with Hints

**Learning:** Using the `hint` property in `@clack/prompts` selection options provides critical context (like distinguishing between AI model tiers or programming language benefits) at the point of decision, reducing the need for users to refer to external documentation.
**Action:** Incorporate brief, descriptive hints into selection prompts to help users make informed choices quickly.

## 2025-05-30 - Graceful CLI Degradation in non-TTY Environments

**Learning:** Rich terminal UI elements (intro, outro, spinner) from `@clack/prompts` can emit ANSI escape codes that pollute logs and disrupt integration tests in non-TTY environments. Furthermore, creating multiple `readline` interfaces on the same stdin stream in a loop causes "MaxListenersExceededWarning" and breaks input consumption.
**Action:** Wrap terminal-only UI elements in `process.stdout.isTTY` checks and use a single `readline` interface with an asynchronous iterator for non-TTY input processing.

## 2025-05-31 - Consolidating CLI Lifecycle and Validation

**Learning:** Placing `outro` before conditional final interactions (like session saving) creates a "zombie interaction" feel. Also, providing immediate validation feedback for session identifiers prevents runtime errors and file-system pollution.
**Action:** Always place `outro` at the absolute end of the command lifecycle and use `validate` in `@clack/prompts` to ensure identifiers conform to expected patterns (e.g., filename-safe).

## 2025-06-15 - Enhancing CLI Onboarding and Error Prevention
**Learning:** Adding validation to mandatory CLI inputs (like API keys and Project IDs) prevents downstream runtime errors and improves the robust feel of the tool. Providing copy-pasteable commands for common follow-up actions (like resuming a session or starting different interface modes) significantly lowers the barrier to entry for new users.
**Action:** Always include 'validate' functions for required fields and provide actionable, copy-pasteable next steps in 'note' and 'log.info' outputs.

## 2025-07-11 - Resilient CLI Feedback Loops
**Learning:** When a CLI command performs a mandatory but potentially flaky step (like `npm install`), catching errors and dynamically adjusting the post-execution guidance (e.g., updating the success message to a warning and adding manual recovery steps) prevents user frustration and ensures the tool remains helpful even in partial failure states.
**Action:** Always wrap external command executions in try/catch blocks, track their success, and use that state to customize final user feedback and "next steps".
