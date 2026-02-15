# Add Bug

Add a bug to the backlog with hypothesis-driven root-cause analysis.

Refer to the instructions located in agent-os/workflows/core/add-bug.md

**Bug Workflow (v3.1):**
- PO gathers bug description (symptom, repro steps, expected/actual)
- User Hypothesis Dialog (optional) - Benutzer-Wissen vor RCA abfragen
- Zuständiger Agent führt Hypothesis-Driven Root-Cause-Analyse durch
- Fix-Impact Layer Analysis - Welche Layer sind betroffen?
- **NEU v3.1:** Bug Complexity Assessment - Automatische Entscheidung für Planungsmodus
- **NEU v3.1:** Optionaler PlanAgent für komplexe Fixes (Score >= 6)
  - Self-Review (Kollegen-Methode)
  - Minimal-Invasive Optimierungen
  - Fix-Phasen mit Rollback-Plan
- Architect adds technical refinement (WAS/WIE/WO)
- Output: Bug story in agent-os/backlog/
- Optional: Bug-Fix Implementation Plan (bei PlanAgent-Pfad)
- Bug ID format: YYYY-MM-DD-[index]
- Ready for /execute-tasks backlog

**When to use PlanAgent mode:**
- Complexity Score >= 6 (automatisch)
- Full-stack fixes mit >2 Integration Points
- Systemische Bugs mit architektonischen Auswirkungen
- Bei Critical/High Severity mit vielen betroffenen Dateien
