# Palette's Journal

## 2025-05-14 - Enhancing CLI UX with @clack/prompts
**Learning:** Using `intro`, `outro`, and `spinner` from `@clack/prompts` significantly improves the perceived responsiveness and professionalism of a CLI tool, especially during long-running operations like `npm install`.
**Action:** Always consider adding visual feedback for asynchronous tasks in CLI tools to keep the user informed.

## 2025-05-15 - Improving Perceived Latency with "Thinking" Spinners
**Learning:** Adding a "Thinking..." spinner immediately after user input in interactive CLI agents bridges the gap between user submission and the first model response chunk, making the application feel much more responsive.
**Action:** Implement a spinner that starts on user input and stops before the first chunk of streaming output is displayed.
