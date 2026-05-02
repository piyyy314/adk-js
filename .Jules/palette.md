## 2026-04-26 - [Graceful CLI Cancellation with @clack/prompts]
**Learning:** When using @clack/prompts in a CLI, handle `isCancel` by breaking out of the interaction loop instead of calling `process.exit()`. This ensures that downstream logic, such as saving session state or recording metrics, can execute before the process terminates.
**Action:** Always return the cancellation state to the caller or throw a specific error instead of abruptly exiting.
