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
