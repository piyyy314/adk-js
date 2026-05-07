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

## 2025-05-23 - Providing Context in Selection Prompts with Hints
**Learning:** Adding short, descriptive hints to selection options (e.g., "fastest", "recommended") in CLI tools helps users make informed decisions quickly without needing to check documentation, especially for technical choices like models or languages.
**Action:** Use the `hint` property in `@clack/prompts` select options to provide brief, helpful context for each choice.

## 2025-05-23 - Proper Commander Option Definition for Readable Help
**Learning:** Commander `Option` constructors expect the flag string and description as separate arguments. Combining them into one string (e.g., `'--flag <value>, description'`) results in malformed help menus where the description is not correctly aligned or may be treated as part of the flag.
**Action:** Always pass the flag string and the description as distinct arguments to the `Option` constructor to ensure the CLI help text is correctly parsed and formatted.
