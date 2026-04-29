## 2026-04-29 - CLI Polishing with Clack
**Learning:** When enhancing CLI commands with rich UI elements like `@clack/prompts`, it's critical to provide fallbacks for non-interactive or "force-yes" modes. Automated scripts and CI pipelines may rely on raw stdout or minimal output, and rich UI elements can interfere with parsing or fail in non-TTY environments.
**Action:** Wrap `intro`, `note`, and `outro` calls in checks for `forceYes` or similar flags, and ensure `spinner` failures are gracefully handled with appropriate exit codes and error messages.
