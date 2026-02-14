# Retroactive Spec

Create a specification for an existing feature through codebase analysis.

This command analyzes existing code to understand how a feature is implemented,
then generates spec.md and spec-lite.md documentation.

**Interactive Process:**
- You describe the feature you want documented
- The LLM analyzes relevant code files
- Clarifying questions are asked when implementation details are unclear
- Final spec is generated for your confirmation

**Output:** spec.md, spec-lite.md, code-references.md, and empty kanban.json (no stories, as feature is already implemented)

Refer to the instructions located in specwright/workflows/core/retroactive-spec.md
