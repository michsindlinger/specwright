# Create Spec

Create a detailed specification. Default mode is V2 Lean (tasks in kanban.json, no story files). Use `--classic` for the V1 flow with Gherkin stories and technical refinement.

**Usage:**
- `/create-spec` — V2 Lean (default, ~50-80k tokens saved)
- `/create-spec --classic` — V1 Classic (Gherkin stories, DoR/DoD, WAS/WIE/WO)
- `/create-spec specwright/specs/YYYY-MM-DD-spec-name/` — Resume (mode auto-detected from kanban.json)

**Resume Support (v3.6):** If the context window gets large during spec creation,
you can `/clear` and re-run `/create-spec` with the spec folder path to resume
from where you left off. The workflow auto-detects which phase to continue from.

Refer to the instructions located in specwright/workflows/core/create-spec.md

**Workflow (V2 Lean — default):**
- Main agent gathers fachliche requirements from user (PO role)
- Plan Agent creates implementation plan (delegated for focused planning)
- Main agent generates tasks directly into kanban.json (mode="lean") with planSection references
- No technical refinement, no DoR/DoD, no story files
- Task context is read on-the-fly from the implementation plan during /execute-tasks

**Workflow (V1 Classic — `--classic`):**
- Main agent gathers fachliche requirements from user (PO role)
- Main agent creates user stories (business perspective) with Gherkin ACs
- Plan Agent creates implementation plan (delegated for focused planning)
- Main agent adds technical refinement guided by architect-refinement skill (WAS/WIE/WO/DoR/DoD)
- Output: Complete spec ready for /execute-tasks
