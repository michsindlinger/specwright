# Requirements Clarification - Spec Assignment for External Bot

**Created:** 2026-02-24
**Status:** Pending User Approval

## Feature Overview

Ermöglicht es, fertige Spezifikationen (Status "ready") einem externen Bot (OpenClaw) zuzuweisen. OpenClaw überwacht alle GitHub-Repositories, erkennt ihm zugewiesene Specs und arbeitet diese autonom über Claude Code + Specwright CLI (`/execute-tasks`) ab. Das Assignment ist ein einfaches Flag in der kanban.json - es löst keine automatische Aktion aus, sondern dient OpenClaw als Signal.

## Target Users

- **Primär:** Specwright-Nutzer (du), der über die Web UI oder CLI Specs an OpenClaw assignen möchte
- **Sekundär:** OpenClaw (externer Bot), der die kanban.json liest, um zugewiesene Specs zu identifizieren

## Business Value

- **Kontrolle:** Nur explizit freigegebene Specs werden von OpenClaw bearbeitet - keine unkontrollierte autonome Abarbeitung
- **Effizienz:** Specs können vorab vorbereitet und bei Bedarf an den Bot delegiert werden
- **Flexibilität:** Assignment kann jederzeit zurückgenommen werden

## Functional Requirements

### 1. Assignment-Flag in kanban.json
- Neues Feld `assignedToBot` auf Spec-Ebene in kanban.json
- Struktur:
  ```json
  {
    "assignedToBot": {
      "assigned": true,
      "assignedAt": "2026-02-24T14:30:00Z",
      "assignedBy": "user"
    }
  }
  ```
- Default: `assigned: false` (oder Feld nicht vorhanden = nicht assigned)
- Wird nur gesetzt, wenn Spec-Status "ready" ist (alle Stories haben DoR complete)

### 2. Web UI - Spec-Übersicht (Liste)
- In der Spec-Übersichtsliste soll erkennbar sein, welche Specs assigned sind (z.B. Badge/Icon)
- Assignment soll direkt aus der Übersicht möglich sein (ohne in die Detailansicht zu gehen)
- Un-Assignment ebenfalls direkt aus der Übersicht

### 3. Web UI - Kanban-Ansicht (Detail)
- Innerhalb der Kanban-Ansicht einer Spezifikation soll ein Assignment-Toggle/Button vorhanden sein
- Button nur aktiv, wenn Spec-Status "ready" ist
- Visuelles Feedback nach Assignment (z.B. Status-Badge)

### 4. Slash-Command (CLI)
- Neuer Command: `/assign-spec specwright/specs/YYYY-MM-DD-name/`
- Setzt das `assignedToBot`-Flag in der kanban.json
- Prüft, ob Spec "ready" ist - Fehlermeldung wenn nicht
- Auch un-assign über denselben Command (Toggle) oder separaten Command

## Affected Areas & Dependencies

- **kanban.json Schema** - Neues Feld `assignedToBot` auf Spec-Ebene
- **Specwright Web UI (Frontend)** - Spec-Übersicht und Kanban-View um Assignment-UI erweitern
- **Specwright Web UI (Backend)** - API-Endpunkt(e) für Assignment-Toggle
- **Slash-Command System** - Neuer `/assign-spec` Command
- **MCP Kanban Server** - Kein neuer Endpunkt nötig (laut User-Entscheidung)

## Edge Cases & Error Scenarios

- **Spec nicht ready:** Assignment wird abgelehnt mit Hinweis "Spec muss Status 'ready' haben"
- **Spec bereits assigned:** Toggle-Verhalten - wird un-assigned
- **Spec wird un-assigned während OpenClaw arbeitet:** Keine direkte Auswirkung - OpenClaw nutzt `/execute-tasks`, der bestehende Status-Flow bleibt erhalten. OpenClaw muss selbst prüfen, ob Assignment noch besteht
- **kanban.json hat kein assignedToBot-Feld:** Default-Verhalten = nicht assigned (backward compatible)
- **Mehrere Specs gleichzeitig assignen:** Jede Spec hat ihr eigenes Flag - kein Konflikt

## Security & Permissions

- Keine speziellen Berechtigungen nötig - wer Zugriff auf die UI/CLI hat, kann assignen
- Keine Authentifizierung zwischen OpenClaw und dem Flag (OpenClaw liest direkt aus Git)

## Performance Considerations

- Keine relevanten Performance-Anforderungen - ein JSON-Feld wird gesetzt/gelesen

## Scope Boundaries

**IN SCOPE:**
- `assignedToBot`-Feld in kanban.json (setzen, lesen, entfernen)
- Web UI: Assignment-Badge in Spec-Übersicht
- Web UI: Assignment-Toggle in Spec-Übersicht und Kanban-View
- Slash-Command `/assign-spec`
- Validierung: Nur "ready" Specs können assigned werden
- Backward Compatibility: Bestehende kanban.json ohne Feld funktioniert weiterhin

**OUT OF SCOPE:**
- OpenClaw Agent-Logik (existiert bereits separat)
- Automatische Aktionen nach Assignment (OpenClaw pollt selbst)
- Neue MCP-Server-Operationen
- Multi-Agent-Support (nur ein Bot, kein Agent-Name nötig)
- Benachrichtigungen/Webhooks bei Assignment

## Open Questions

- Keine offenen Fragen

## Proposed User Stories (High Level)

1. **kanban.json Schema erweitern** - `assignedToBot`-Feld mit Validierung (nur bei ready-Status)
2. **Web UI: Assignment in Spec-Übersicht** - Badge/Icon + Toggle-Button in der Spec-Liste
3. **Web UI: Assignment in Kanban-View** - Toggle-Button in der Kanban-Detailansicht einer Spec
4. **Backend: Assignment API-Endpunkt** - REST-Endpunkt für Assignment-Toggle mit Ready-Validierung
5. **Slash-Command `/assign-spec`** - CLI-Command zum Assignen/Un-Assignen einer Spec

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
