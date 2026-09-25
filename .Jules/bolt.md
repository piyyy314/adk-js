## 2026-09-25 - Tool declaration schema conversion memoization
**Learning:** Re-converting Zod and MCP tool parameter schemas (`toSchema` / `toGeminiSchema`) via `_getDeclaration()` on every LLM agent turn incurs redundant schema parsing overhead (~21.6 µs per tool per turn).
**Action:** Memoize tool declarations on instance properties (`cachedSchema` / `cachedDeclaration`) for `FunctionTool` and `MCPTool` to avoid re-running schema transformations on every LLM request while keeping cache state instance-scoped and leak-free.
