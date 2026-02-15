# Requirements Clarification - Kanban Auto-Execution

**Created:** 2026-01-31
**Status:** Pending User Approval

## Feature Overview

Auto-Mode Toggle im Kanban Board Header, der die automatische Ausführung aller Stories einer Spec ermöglicht - ähnlich wie das Terminal-Script `auto-execute.sh`, aber direkt in der UI integriert.

## Target Users

- Entwickler, die Specs ohne manuelle Interaktion ausführen möchten
- Teams, die die UI als primäres Interface nutzen, aber Terminal-Funktionalität benötigen

## Business Value

- **Effizienz:** Keine manuelle Drag-and-Drop-Aktion pro Story erforderlich
- **Konsistenz:** Gleiche Auto-Execution-Logik wie Terminal-Script
- **Übersicht:** Visueller Fortschritt direkt im UI sichtbar
- **Flexibilität:** UI ergänzt Terminal-Script, ersetzt es nicht

## Functional Requirements

### Auto-Mode Toggle
1. Toggle-Schalter im Kanban Board Header (neben Spec-Titel)
2. Aktivierung startet automatische Story-Ausführung
3. Deaktivierung pausiert die Ausführung nach aktueller Story
4. Toggle-Status wird NICHT persistiert (nach Browser-Refresh: aus)

### Automatische Story-Ausführung
1. Nach Aktivierung: Nächste "ready" Story wird automatisch gestartet
2. Nach Story-Completion: Nächste Story wird automatisch gestartet
3. Respektiert Story-Dependencies (blockierte Stories werden übersprungen)
4. Durchläuft alle Phasen (1-5) wie Terminal-Script

### Git Strategy Handling
1. Bei erster Story: Git Strategy Dialog erscheint (wie bisher)
2. User muss Strategie manuell wählen (branch/worktree)
3. Gewählte Strategie gilt für gesamte Spec
4. Auto-Mode pausiert während Dialog offen ist

### Progress Display (Summary)
1. Anzeige der aktuellen Phase (1-5 oder "complete")
2. Anzeige der aktuell laufenden Story (ID + Titel)
3. Keine volle Claude-Output-Anzeige (nur Summary)
4. Visuelles Feedback: "Auto-Mode aktiv" Indikator

### Error Handling
1. Bei Fehler: Auto-Mode pausiert automatisch
2. Modal Dialog erscheint mit:
   - Fehlerbeschreibung
   - Betroffene Story
   - "Resume" Button (Auto-Mode fortsetzen)
   - "Stop" Button (Auto-Mode deaktivieren)
3. User kann Fehler beheben und dann Resume wählen

## Affected Areas & Dependencies

### Frontend (UI)
- `kanban-board.ts` - Auto-Mode Toggle im Header, Status-Anzeige
- `dashboard-view.ts` - Integration der Auto-Mode Logik
- `gateway.ts` - Neue WebSocket Events für Auto-Mode
- Neuer Error Modal Dialog

### Backend (Server)
- `websocket.ts` - Neue Message Handler für Auto-Mode
- `workflow-executor.ts` - Auto-Mode State Management
- `specs-reader.ts` - Story-Queuing Logik

### Bestehende Features (Integration)
- Git Strategy Dialog (KSE-005) - Muss mit Auto-Mode kompatibel sein
- Story Drag & Drop (KSE-001) - Parallel nutzbar
- Working Indicator (KSE-004) - Wird im Auto-Mode genutzt

## Edge Cases & Error Scenarios

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Keine "ready" Stories | Auto-Mode aktiviert, aber wartet auf ready Stories |
| Alle Stories blockiert | Error Modal: "Keine ausführbaren Stories" |
| Browser Refresh während Execution | Auto-Mode aus, aber laufende Execution läuft weiter (Backend) |
| Manueller Drag während Auto-Mode | Erlaubt, Auto-Mode überspringt bereits verschobene Stories |
| Git Strategy Dialog offen | Auto-Mode wartet auf User-Entscheidung |
| Story Execution Fehler | Modal Dialog, Auto-Mode pausiert |
| Alle Stories complete | Auto-Mode deaktiviert sich automatisch |
| Phase 5 (PR Creation) | Auto-Mode führt auch Phase 5 aus |

## Security & Permissions

- Keine zusätzlichen Permissions erforderlich
- Nutzt bestehende WebSocket-Authentifizierung
- Auto-Mode nur für ausgewähltes Projekt aktiv

## Performance Considerations

- Delay zwischen Story-Executions (wie Terminal-Script: 2 Sekunden)
- Keine parallele Story-Execution (sequentiell)
- WebSocket-basierte Updates (keine Polling)

## Scope Boundaries

**IN SCOPE:**
- Auto-Mode Toggle im Kanban Header
- Automatische Story-Ausführung (sequentiell)
- Summary Progress Anzeige (Phase + Story)
- Error Handling mit Modal Dialog
- Pause/Resume Funktionalität
- Integration mit bestehendem Git Strategy Dialog

**OUT OF SCOPE:**
- Voller Claude Output Stream in UI
- Persistenz des Auto-Mode Status nach Refresh
- Parallele Story-Execution
- Automatische Git Strategy Auswahl
- Ersatz des Terminal-Scripts (bleibt als Alternative)
- Konfigurierbare Delays zwischen Stories

## Open Questions

*Keine offenen Fragen - alle Anforderungen geklärt.*

## Proposed User Stories (High Level)

1. **KAE-001: Auto-Mode Toggle Component** - Toggle-Schalter im Kanban Header mit On/Off Status
2. **KAE-002: Auto-Execution Engine** - Backend-Logik für automatische Story-Queuing und Ausführung
3. **KAE-003: Progress Summary Display** - Anzeige der aktuellen Phase und Story im Header
4. **KAE-004: Error Handling Modal** - Modal Dialog für Fehler mit Resume/Stop Optionen
5. **KAE-005: Git Strategy Integration** - Auto-Mode wartet auf Git Strategy Auswahl bei erster Story

---

*Review this document carefully. Once approved, detailed user stories will be generated.*
