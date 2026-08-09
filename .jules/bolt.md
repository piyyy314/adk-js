## 2026-08-09 - [Bounded Cache & Set lookup optimization]
**Learning:** General notation helper routines (`toCamelCase`, `toSnakeCase`) convert arbitrary keys and recursively traverse deep hierarchies. In a production system processing dynamically-generated JSON, caching converted keys on an unbounded global `Map` poses a serious memory leak risk. Also, converting lookup arrays (like `preserveKeys`) into `Set`s dynamically should only be done when keys are actually provided to avoid useless allocations on hot paths where `preserveKeys` is empty.
**Action:** Use a size-bounded Map cache (like an LRU or bounded eviction map) to cap memory usage, and only instantiate Sets when lookup arrays have elements.

## 2026-08-09 - [Windows Cross-Platform Path Separator and Subprocess Execution]
**Learning:** File path assertions using hardcoded forward slashes (`/`) fail on Windows systems where backslashes (`\`) are used as path separators (e.g. `fs.cp` arguments). Furthermore, spawning subprocesses (such as executing shell commands via Powershell on Windows) is significantly slower on GHA runners and easily triggers the default 5-second Vitest timeout.
**Action:** Always construct path-containment assertions using `path.join` to remain platform-agnostic, and assign robust test timeouts (such as 20000ms) to any test executing dynamic shell or subprocess environments.
