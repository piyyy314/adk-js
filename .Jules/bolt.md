## 2026-08-11 - Optimizing LLMRegistry Model Resolution
**Learning:** Resolving model name regex patterns repeatedly compiles new `RegExp` objects inside the loops for every registry query, incurring high garbage collection and CPU overhead when resolving models frequently. Compiling these patterns only once when registering, or caching the precompiled RegExp objects, eliminates this overhead and speeds up resolution.
**Action:** Precompile model name regular expressions on registration or cache them to avoid calling `new RegExp` repeatedly during resolution.
