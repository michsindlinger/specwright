# Create Spec

Create a detailed specification with user stories.

**Usage:**
- `/create-spec` - Start fresh (new feature from roadmap or custom)
- `/create-spec specwright/specs/YYYY-MM-DD-spec-name/` - Resume from previous session

**Resume Support (v3.6):** If the context window gets large during spec creation,
you can `/clear` and re-run `/create-spec` with the spec folder path to resume
from where you left off. The workflow auto-detects which phase to continue from.

Refer to the instructions located in specwright/workflows/core/create-spec.md

**Workflow:**
- Main agent gathers fachliche requirements from user (PO role)
- Main agent creates user stories (business perspective)
- Plan Agent creates implementation plan (delegated for focused planning)
- Main agent adds technical refinement guided by architect-refinement skill (WAS/WIE/WO/DoR/DoD)
- Output: Complete spec ready for /execute-tasks
