# Requirements Clarification - Interactive Workflows

**Created:** 2026-01-30
**Status:** ✅ Approved

## Feature Overview

Interaktive Ausführung von Agent OS Workflows (wie `/create-spec`, `/execute-tasks`, `/plan-product`) in der WebUI. Der Nutzer kann über die Workflow-View einen Workflow starten und dann im Dialog-Modus Fragen beantworten - genau wie im Claude Code CLI, aber mit visueller UI.

## Target Users

- Entwickler, die Agent OS Workflows nutzen
- Teams, die Feature-Spezifikationen über die WebUI erstellen wollen
- Nutzer, die eine visuelle Alternative zur CLI-basierten Workflow-Ausführung bevorzugen

## Business Value

- **Niedrigere Einstiegshürde:** Workflows sind über eine intuitive UI zugänglich, kein CLI-Wissen nötig
- **Bessere Übersicht:** Live-Preview von generierten Dokumenten während des Workflows
- **Effizientere Interaktion:** Klickbare Optionen statt Texteingabe für Standardantworten
- **Transparenter Fortschritt:** Sichtbare Schritt-Indikatoren zeigen wo man im Workflow steht

## Functional Requirements

### Workflow-Start
- Nutzer startet Workflow über bestehende Workflow-Karten in der Workflow-View
- Nach Klick öffnet sich ein inline Chat-Bereich innerhalb der Workflow-View
- Optionale Argumente können vor dem Start eingegeben werden

### Interaktiver Dialog
- Workflow-Fragen (AskUserQuestion) erscheinen als klickbare Buttons/Optionen im Chat
- "Other" Option zeigt ein inline Textfeld für freie Eingabe
- Nach Antwort fährt der Workflow automatisch fort (kein explizites "Weiter")
- Schritt-Indikator zeigt aktuellen Workflow-Schritt (z.B. "Step 2/4: Requirements Dialog")

### Tool-Ausführung
- Tool-Calls (Read, Write, Bash) werden minimal angezeigt (Spinner/Indikator)
- Keine detaillierte Tool-Expansion wie im normalen Chat
- Nur Ergebnisse/Outcomes sind relevant für den Workflow

### Dokumenten-Handling
- Generierte Dokumente (spec.md, stories/, requirements-clarification.md) werden live im eingebetteten Docs-Viewer-Panel angezeigt
- Docs-Viewer erscheint als Panel rechts neben dem Workflow-Chat
- Dokumente aktualisieren sich automatisch wenn der Workflow sie ändert

### Lange Texte
- Lange Workflow-Outputs (z.B. generierte Requirements-Clarification) erscheinen eingeklappt im Chat
- "Mehr anzeigen" Option zum Expandieren
- Alternativ: Link zum Docs-Viewer für vollständige Ansicht

### Error Handling & Cancellation
- Fehler erscheinen inline im Chat mit Retry-Option
- Cancel-Button ist während des gesamten Workflows sichtbar
- Bei Abbruch: Workflow-Status wird gespeichert für möglichen späteren Resume

## Affected Areas & Dependencies

| Bereich | Komponente | Impact |
|---------|------------|--------|
| Frontend | `workflow-view.ts` | Komplette Überarbeitung für interaktiven Modus |
| Frontend | Neue `workflow-chat.ts` | Neuer Chat-Bereich speziell für Workflow-Dialoge |
| Frontend | Neue `workflow-question.ts` | UI für AskUserQuestion mit Optionen |
| Frontend | Neue `workflow-progress.ts` | Schritt-Indikator Komponente |
| Frontend | `docs-viewer.ts` | Integration als eingebettetes Panel |
| Backend | `workflow-executor.ts` | Erweitern für interaktiven Modus (Frage/Antwort-Handling) |
| Backend | `websocket.ts` | Neue Message-Types für Workflow-Interaktion |
| Backend | `claude-handler.ts` | Eventuell: Shared Logic mit Workflow-Executor |

### Externe Abhängigkeiten
- Claude CLI muss `AskUserQuestion` Tool-Calls im Stream-JSON Format ausgeben
- WebSocket-Protokoll-Erweiterung für bidirektionale Workflow-Interaktion

## Edge Cases & Error Scenarios

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Workflow startet, aber Claude CLI nicht erreichbar | Fehler im Chat, Retry-Button |
| Nutzer schließt Browser während Workflow läuft | Workflow wird abgebrochen, kein Auto-Resume |
| AskUserQuestion hat keine validen Optionen | Nur Textfeld für freie Eingabe anzeigen |
| Docs-Viewer kann Datei nicht laden | Fallback: Link zur Datei anzeigen |
| Workflow generiert sehr große Dateien | Docs-Viewer mit Lazy-Loading |
| Nutzer wechselt Projekt während Workflow läuft | Warnung anzeigen, Workflow abbrechen |
| Mehrere Workflows gleichzeitig | Nur ein interaktiver Workflow pro Session erlaubt |
| Timeout bei Claude CLI Response | Timeout-Error nach 5 Minuten, Retry-Option |

## Security & Permissions

- Lokale Ausführung nur - keine Cloud-Kommunikation
- Workflow-Ausführung läuft im Kontext des ausgewählten Projekts
- Keine zusätzlichen Permissions nötig (Claude CLI hat bereits Zugriff)

## Performance Considerations

- WebSocket-Streaming für Echtzeit-Updates (bereits implementiert)
- Docs-Viewer: Lazy-Loading für große Dokumente
- Chat-History: Nur letzte N Nachrichten im DOM behalten bei langen Workflows
- Tool-Call-Badge: Minimale UI reduziert Rendering-Last

## Scope Boundaries

**IN SCOPE:**
- Interaktive Ausführung aller Agent OS Workflows
- AskUserQuestion UI mit klickbaren Optionen
- Schritt-Indikator für Workflow-Progress
- Eingebetteter Docs-Viewer für Live-Preview
- Eingeklappte lange Texte im Chat
- Inline Error-Handling mit Retry
- Cancel-Funktion

**OUT OF SCOPE:**
- Background-Execution-Modus (wird entfernt/ersetzt)
- Multi-Workflow parallel (nur einer gleichzeitig)
- Workflow-Resume nach Browser-Schließung
- Custom Workflow-Erstellung in der UI
- Workflow-Editing/Modifikation
- Chat-basierter Workflow-Start (nur über Karten)

## Open Questions

1. Soll es einen "Pause" Button geben zusätzlich zu "Cancel"?
2. Sollen abgeschlossene Workflows in einer History gespeichert werden?
3. Wie soll der Docs-Viewer-Panel geschlossen werden können (Toggle-Button)?

## Proposed User Stories (High Level)

1. **WKFL-001: Workflow-Start über Karten** - Nutzer kann Workflow über Karte starten und sieht inline Chat-Bereich
2. **WKFL-002: AskUserQuestion UI** - Workflow-Fragen erscheinen als klickbare Optionen mit "Other" Textfeld
3. **WKFL-003: Workflow-Progress-Indikator** - Schritt-Indikator zeigt aktuellen Workflow-Status
4. **WKFL-004: Embedded Docs-Viewer** - Generierte Dokumente werden live im eingebetteten Panel angezeigt
5. **WKFL-005: Collapsible Long Text** - Lange Outputs sind eingeklappt mit Expand-Option
6. **WKFL-006: Error-Handling & Cancel** - Fehler inline mit Retry, Cancel-Button immer sichtbar
7. **WKFL-007: Minimal Tool-Activity** - Tool-Calls als Spinner ohne Details
8. **WKFL-008: Backend Workflow-Interaction** - WebSocket-Erweiterung für bidirektionale Kommunikation
9. **WKFL-999: Integration & E2E Validation** - Vollständiger Workflow-Durchlauf (create-spec) funktioniert

---

*Review this document carefully. Once approved, detailed user stories will be generated.*
