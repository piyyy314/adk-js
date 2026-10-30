## 2026-09-07 - Avoid Unconditional Stringification in Search Loops

**Learning:** Calling `JSON.stringify()` on session events inside hot search loops (such as `determineAgentForResumption`) at `INFO` log level causes severe CPU and GC overhead (~175x slowdown) because full event payloads are stringified on every iteration regardless of logging needs.
**Action:** Always use `logger.debug` with specific primitive identifiers (e.g., `event.id`, `event.author`) or avoid stringification entirely inside hot iteration loops.
