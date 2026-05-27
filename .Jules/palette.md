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

## 2025-06-01 - Precision in CLI Error Hints

**Learning:** Inconsistent or misleading error messages (e.g., instructing a user to fix a 'region' when the missing parameter is 'project') create significant user frustration and diminish trust in the tool.
**Action:** When auditing CLI UX, verify that error hints and suggested commands exactly match the parameters being validated.
