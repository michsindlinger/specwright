# Add Bug

Add a bug to the backlog with hypothesis-driven root-cause analysis.

Refer to the instructions located in specwright/workflows/core/add-bug.md

**Bug Workflow (v3.2):**
- Main agent gathers bug description (symptom, repro steps, expected/actual)
- User Hypothesis Dialog (optional) - Benutzer-Wissen vor RCA abfragen
- Main agent führt Hypothesis-Driven Root-Cause-Analyse direkt durch
- Fix-Impact Layer Analysis - Welche Layer sind betroffen?
- Bug Complexity Assessment - Automatische Entscheidung für Planungsmodus
- Optionaler PlanAgent für komplexe Fixes (Score >= 6)
  - Self-Review (Kollegen-Methode)
  - Minimal-Invasive Optimierungen
  - Fix-Phasen mit Rollback-Plan
- Main agent adds technical refinement guided by architect-refinement skill (WAS/WIE/WO)
- Output: Bug story in specwright/backlog/
- Optional: Bug-Fix Implementation Plan (bei PlanAgent-Pfad)
- Bug ID format: YYYY-MM-DD-[index]
- Ready for /execute-tasks backlog
