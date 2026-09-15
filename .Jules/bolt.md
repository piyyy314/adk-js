## 2026-09-15 - Tool Declaration Memoization in ADK Tools

**Learning:** Tool declarations (`_getDeclaration()`) in ADK JS tools (`FunctionTool`, `MCPTool`, `LongRunningFunctionTool`) are invoked on every single LLM turn during request processing (`processLlmRequest`). Uncached calls repeatedly parse Zod schemas, transform MCP input/output schemas into Gemini schemas, and build OpenAPI parameters, causing unnecessary CPU overhead and GC allocations.

**Action:** Always memoize `_getDeclaration()` results on tool instances, since tool parameters and options do not change after tool creation.
