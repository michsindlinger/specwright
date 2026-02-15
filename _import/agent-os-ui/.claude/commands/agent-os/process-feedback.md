---
description: Verarbeite Kundenfeedback und kategorisiere in Specs, Bugs und Todos
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion, Task
activation-mode: explicit
---

# Process Feedback

Du führst jetzt den **Process Feedback** Workflow aus.

## Deine Aufgabe

Analysiere das Kundenfeedback und kategorisiere jeden Punkt als:
- **Spec** - Größeres Feature (→ `/create-spec`)
- **Bug** - Fehler (→ `/add-bug`)
- **Todo** - Kleine Aufgabe (→ `/add-todo`)

## Workflow

**LIES UND BEFOLGE:** `agent-os/workflows/core/process-feedback.md`

## Input

$ARGUMENTS

## Wichtige Regeln

1. **Jeder Punkt einzeln** - Trenne zusammenhängende Themen
2. **Originaltext zitieren** - Belege woher die Kategorisierung kommt
3. **Rückfragen identifizieren** - Bei Unklarheiten konkrete Fragen formulieren
4. **JSON-Output** - Strukturiertes Ergebnis am Ende

## Output-Format

Generiere am Ende ein vollständiges JSON mit:
- metadata (Zeitstempel, Projekt)
- summary (Zählungen nach Kategorie/Priorität)
- items[] (alle extrahierten Punkte mit Kategorisierung)
- rawFeedback (Original zur Referenz)

## Flags

- `--apply` - Legt Bugs und Todos automatisch an (Specs müssen manuell erstellt werden)
- `--save` - Speichert JSON in `agent-os/feedback/`

Beginne jetzt mit der Analyse.
