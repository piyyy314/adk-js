## 2025-05-15 - [CLI Polish with @clack/prompts]
**Learning:** Migrating from `readline` to `@clack/prompts` significantly improves the micro-UX of CLI tools by providing styled prompts, spinners, and structured intro/outro sequences. When using spinners with streaming responses, it's better to stop the spinner as soon as the first data chunk arrives to avoid output fragmentation.
**Action:** Use `@clack/prompts` for all interactive CLI logic in the `dev` package. Stop spinners before printing streamed content.
