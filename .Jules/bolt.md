# Bolt's Journal

## 2026-09-21 - Avoiding JSON.stringify In Loop During Session Resumption

**Learning:** `determineAgentForResumption` runs on every agent turn and loops backwards through session events. Calling `JSON.stringify(session.events[i])` inside `logger.info` inside this loop caused unnecessary CPU serialization and memory allocation on every turn, especially for long session histories.
**Action:** Always avoid `JSON.stringify` or heavy string transformations inside loops over session events, and use `logger.debug` with lightweight properties like `event.id` instead.
