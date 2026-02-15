# Requirements Clarification - Kanban In Review Column

**Created:** 2026-02-12
**Status:** Pending User Approval

## Feature Overview
Erweiterung des Kanban-Boards einer Spezifikation um eine neue "In Review"-Spalte. Nach Abschluss einer Story durch `/execute-tasks` wird diese nicht mehr direkt auf "Done" gesetzt, sondern auf "In Review", sodass der Benutzer sie prüfen und manuell auf "Done" schieben kann.

## Target Users
Entwickler und Projektmanager, die das Agent OS Web UI nutzen, um Spezifikationen mit Kanban-Boards zu verwalten und Stories per `/execute-tasks` abzuarbeiten.

## Business Value
- **Qualitätssicherung:** Der Benutzer behält die Kontrolle über die endgültige Abnahme jeder Story
- **Transparenz:** Klare Sichtbarkeit welche Stories noch geprüft werden müssen
- **Feedback-Loop:** Möglichkeit Stories zur Nacharbeit zurückzuweisen und erneut ausführen zu lassen
- **Workflow-Verbesserung:** Natürlicherer Workflow der manuelle Review-Phase einschließt

## Functional Requirements

1. **Neue Kanban-Spalte "In Review":** Zwischen "In Progress" und "Done" im Kanban-Board UI
2. **Automatischer Status-Wechsel:** Wenn eine Story via `/execute-tasks` abgeschlossen wird, Status auf "in_review" statt "done"
3. **Benutzer-Review-Aktionen:**
   - Story von "In Review" auf "Done" schieben (Genehmigung)
   - Story von "In Review" zurück auf "In Progress" schieben (Rückweisung/Nacharbeit)
4. **Re-Execute bei Rückweisung:** Wenn eine Story zurück auf "In Progress" gesetzt wird, kann `/execute-tasks` sie erneut bearbeiten
5. **Batch-Review am Ende:** Bei der automatischen Story-Abarbeitung werden alle Stories durchgeführt. Am Ende kann der User alle auf einmal im Kanban-Board reviewen
6. **Full-Stack Integration:** kanban.json erhält "in_review" als neuen Status, MCP Kanban Tool wird erweitert
7. **MCP Tool Anpassung:** `kanban_complete_story` setzt Stories auf "in_review". Neues Tool `kanban_approve_story` setzt auf "done"

## Affected Areas & Dependencies

- **kanban.json Schema** - Neuer Status "in_review" im Story-Status-Enum
- **MCP Kanban Tool** - `kanban_complete_story` Verhalten ändern (→ in_review), neues `kanban_approve_story` Tool
- **Frontend Kanban-Board UI** - Neue Spalte "In Review" rendern, Drag&Drop für Review-→Done und Review-→InProgress
- **boardStatus in kanban.json** - Neue Kategorie "in_review" für Board-Statistiken
- **execute-tasks Workflow** - Anpassung der Story-Abschluss-Logik (Stories landen in "in_review")
- **Story Status Flow** - Neuer Statusübergang: in_progress → in_review → done (und in_review → in_progress)

## Edge Cases & Error Scenarios

- **Alle Stories bereits "done":** In-Review-Spalte ist leer - normaler Zustand
- **Story hat keine Änderungen:** Benutzer kann trotzdem auf Done schieben
- **Re-Execute nach Rückweisung:** Story muss wieder auf "ready"/"in_progress" stehen für erneute Ausführung
- **Backward Compatibility:** Bestehende Specs ohne "in_review" Status funktionieren weiterhin (done bleibt done)
- **System Stories (997, 998, 999):** Auch diese durchlaufen den "in_review" Status

## Security & Permissions
- Keine besonderen Sicherheitsanforderungen - lokale Anwendung ohne Auth
- Statusänderungen sind nur über das UI oder MCP Tools möglich

## Performance Considerations
- Keine zusätzlichen Backend-Aufrufe nötig - Status wird im bestehenden kanban.json gespeichert
- Kanban-Board UI muss eine zusätzliche Spalte rendern - minimal

## Scope Boundaries

**IN SCOPE:**
- Neue "In Review" Spalte im Kanban-Board UI
- kanban.json Schema-Erweiterung um "in_review" Status
- MCP Kanban Tool: `kanban_complete_story` → in_review, neues `kanban_approve_story`
- boardStatus-Statistiken mit in_review Counter
- Story-Status-Flow: in_progress → in_review → done / in_review → in_progress
- Backward Compatibility für bestehende Specs

**OUT OF SCOPE:**
- Diff-Preview in der Review-Ansicht
- Kommentar-/Notiz-Funktion für Review-Feedback
- Eigene Review-Übersichtsseite (bestehendes Kanban-Board reicht)
- Automatische Benachrichtigungen bei Review-Bedarf
- Review-History oder Audit-Trail

## Open Questions (if any)
- Keine offenen Fragen

## Proposed User Stories (High Level)

1. **kanban.json Schema erweitern** - "in_review" als neuen Story-Status hinzufügen, boardStatus um in_review-Counter erweitern
2. **MCP Kanban Tool anpassen** - `kanban_complete_story` setzt auf "in_review", neues `kanban_approve_story` Tool erstellen
3. **Kanban-Board UI: In Review Spalte** - Neue Spalte zwischen "In Progress" und "Done" rendern, Drag&Drop-Support
4. **Story-Status-Transitionen** - Review→Done (Genehmigung) und Review→InProgress (Rückweisung) im UI und Backend

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
