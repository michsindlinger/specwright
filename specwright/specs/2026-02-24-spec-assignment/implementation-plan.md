# Implementierungsplan: Spec Assignment for External Bot

> **Status:** APPROVED
> **Spec:** specwright/specs/2026-02-24-spec-assignment/
> **Erstellt:** 2026-02-24
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Ermöglicht das Zuweisen fertiger Spezifikationen (Status "ready") an einen externen Bot (OpenClaw) via `assignedToBot`-Flag in kanban.json. Die Implementierung umfasst fünf Schichten: kanban.json Schema, Backend SpecsReader-Service, WebSocket-Handler, Frontend Spec-Views (Übersicht + Kanban-Detail) und einen CLI Slash-Command. Das Design ist minimalinvasiv und nutzt durchgehend bestehende Patterns für WebSocket-Messaging, Spec-Card-Rendering, Kanban-Board-Header-Actions und atomare kanban.json-Updates mit File-Locking.

---

## Architektur-Entscheidungen

### AD-1: WebSocket statt REST-Endpunkt

**Gewählter Ansatz:** Neuer `specs.assign` WebSocket-Message-Typ anstatt eines REST-Endpunkts.

**Begründung:** Die gesamte Spec/Kanban-Interaktion (Spec-Liste, Story-Status-Updates, Model-Updates) läuft über WebSocket via `websocket.ts` → `SpecsReader`. Ein REST-Endpunkt wäre architektonisch inkonsistent. Der WebSocket-Ansatz ermöglicht zudem automatisches Broadcasting an alle verbundenen Clients.

### AD-2: Server-seitige Ready-Validierung

**Gewählter Ansatz:** Die "ready"-Prüfung findet ausschließlich im Backend (SpecsReader) statt.

**Begründung:** Verhindert ungültige Assignments auch über CLI. Frontend zeigt/versteckt Toggle basierend auf dem vom Backend übermittelten Status.

### AD-3: `assignedToBot` auf Root-Ebene in kanban.json

**Gewählter Ansatz:** Feld lebt auf der `KanbanJsonV1` Root-Ebene (neben `spec`, `resumeContext`, `execution`).

**Struktur:**
```json
{
  "assignedToBot": {
    "assigned": true,
    "assignedAt": "2026-02-24T14:30:00Z",
    "assignedBy": "user"
  }
}
```

**Begründung:** Operationelle Metadata gehört auf Root-Ebene. OpenClaw kann das Feld direkt am Top-Level lesen ohne in Unter-Objekte navigieren zu müssen.

### AD-4: Backward Compatibility via Absence

**Gewählter Ansatz:** Fehlendes `assignedToBot`-Feld = `assigned: false`. Keine Migration nötig.

**Begründung:** Alle bestehenden kanban.json-Dateien funktionieren unverändert weiter.

### AD-5: "Ready"-Definition

**Gewählter Ansatz:** `boardStatus.ready === boardStatus.total && boardStatus.total > 0`

**Begründung:** Eine Spec ist "ready for assignment" wenn alle Stories den Status `ready` haben (DoR complete, noch nicht gestartet). Specs mit in-progress, done oder blocked Stories sind nicht assignbar.

### AD-6: Kein neuer MCP-Server-Endpunkt

**Gewählter Ansatz:** Per Requirements - keine neuen MCP-Operationen. Der `/assign-spec` Slash-Command arbeitet direkt mit kanban.json.

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `/assign-spec` Slash-Command | CLI Command | Markdown-Command zum Assignen/Un-Assignen via CLI |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `specs-reader.ts` (Backend) | Erweitern | Neues `toggleBotAssignment()`, `isSpecReady()`, `assignedToBot` in SpecInfo/KanbanBoard |
| `websocket.ts` (Backend) | Erweitern | Neuer `specs.assign` Message-Handler mit Broadcast |
| `spec-card.ts` (Frontend) | Erweitern | Assignment-Badge + Toggle-Button in Spec-Karte |
| `kanban-board.ts` (Frontend) | Erweitern | Assignment-Toggle im Kanban-Header |
| `dashboard-view.ts` (Frontend) | Erweitern | Event-Handler + WebSocket-Integration für Assignment |
| `kanban-mcp-server.ts` (MCP) | Typ-Update | `assignedToBot` im `KanbanJsonV1`-Interface (nur Typ, kein neues Tool) |

### Nicht betroffen (explizit)

- MCP Server Tools (keine neuen Operationen)
- Story-Dateien / Story-Template
- Setup-Scripts (kein neues Install-Target)
- FileService, FileHandler, GitService

---

## Umsetzungsphasen

### Phase 1: Data Layer (Backend Foundation)
**Ziel:** `assignedToBot`-Feld in kanban.json lesen/schreiben mit Validierung
**Komponenten:** `specs-reader.ts`, `KanbanJsonV1`-Interface, `SpecInfo`-Interface, `KanbanBoard`-Interface
**Abhängig von:** Nichts (Startphase)

- `KanbanJsonV1`-Interface um `assignedToBot?` erweitern
- `SpecInfo`-Interface um `assignedToBot?: boolean` erweitern
- `KanbanBoard`-Interface um `assignedToBot?: boolean` erweitern
- `getSpecInfo()` anpassen: `assignedToBot.assigned` aus kanban.json lesen
- `getKanbanBoard()` anpassen: `assignedToBot`-Status einschließen
- Neue Methode `isSpecReady(kanban)`: `boardStatus.ready === boardStatus.total && boardStatus.total > 0`
- Neue Methode `toggleBotAssignment(projectPath, specId)`: Lock → Read → Validate → Toggle → Changelog → Write

### Phase 2: WebSocket Integration (Backend API)
**Ziel:** Assignment über WebSocket steuerbar machen mit Multi-Client-Sync
**Komponenten:** `websocket.ts`
**Abhängig von:** Phase 1

- Neuer `specs.assign` Case im Message-Router-Switch
- Handler `handleSpecsAssign(client, message)`: specId extrahieren → `toggleBotAssignment()` aufrufen
- Response `specs.assign.ack` mit `{ specId, assigned, timestamp }`
- Error Response `specs.assign.error` mit Grund
- Broadcast an alle Clients via `webSocketManager`

### Phase 3: Frontend - Spec-Übersicht (Badge + Toggle)
**Ziel:** Assignment-Status sichtbar und steuerbar in der Spec-Liste
**Komponenten:** `spec-card.ts`, `dashboard-view.ts`
**Abhängig von:** Phase 2
**Parallel zu:** Phase 4

- `SpecInfo`-Interface im Frontend um `assignedToBot?: boolean` erweitern
- Assignment-Badge in `spec-card.ts` rendern (neben bestehenden Badges)
- Toggle-Button für Assignment (Robot-Icon-Button)
- Custom Event `spec-assign` dispatchen mit `{ specId }`
- In `dashboard-view.ts`: Event-Handler → WebSocket `specs.assign` senden
- Listener für `specs.assign.ack` → lokalen State updaten
- Listener für `specs.assign.error` → Toast anzeigen

### Phase 4: Frontend - Kanban Detail View (Assignment Toggle)
**Ziel:** Assignment-Toggle in der Kanban-Detailansicht
**Komponenten:** `kanban-board.ts`, `dashboard-view.ts`
**Abhängig von:** Phase 2
**Parallel zu:** Phase 3

- `KanbanBoard`-Interface um `assignedToBot?: boolean` erweitern
- Property `assignedToBot` in `kanban-board.ts`
- Toggle-Button im Kanban-Header (ähnlich Auto-Mode-Toggle)
- Disabled wenn Spec nicht "ready"
- Custom Event `spec-assign-toggle` dispatchen
- In `dashboard-view.ts`: `assignedToBot` an `kanban-board` Property-Binding durchreichen
- Event-Handler für `spec-assign-toggle` → WebSocket `specs.assign`

### Phase 5: Slash-Command (CLI)
**Ziel:** Assignment über CLI-Command möglich
**Komponenten:** `.claude/commands/specwright/assign-spec.md`
**Abhängig von:** Nichts (arbeitet direkt mit kanban.json)
**Parallel zu:** Phase 1-4

- Neues Command-File `assign-spec.md`
- Argument: Spec-Pfad oder Spec-ID
- kanban.json lesen (direkt oder via `kanban_read` MCP-Tool)
- "Ready"-Status validieren
- `assignedToBot`-Feld togglen
- kanban.json schreiben
- Bestätigung mit aktuellem Status ausgeben

---

## Komponenten-Verbindungen (KRITISCH)

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| `spec-card.ts` | `dashboard-view.ts` | Custom Event `spec-assign` | Phase 3 Story | `grep -q "spec-assign" ui/frontend/src/components/spec-card.ts` |
| `dashboard-view.ts` | WebSocket Gateway | WS Message `specs.assign` | Phase 3 Story | `grep -q "specs.assign" ui/frontend/src/views/dashboard-view.ts` |
| `websocket.ts` | `specs-reader.ts` | Method Call `toggleBotAssignment()` | Phase 2 Story | `grep -q "toggleBotAssignment" ui/src/server/websocket.ts` |
| `specs-reader.ts` | kanban.json (Filesystem) | File R/W mit Lock | Phase 1 Story | `grep -q "assignedToBot" ui/src/server/specs-reader.ts` |
| `websocket.ts` | Alle WS Clients | Broadcast `specs.assign.ack` | Phase 2 Story | `grep -q "specs.assign.ack" ui/src/server/websocket.ts` |
| `dashboard-view.ts` | `kanban-board.ts` | Property Binding `.assignedToBot` | Phase 4 Story | `grep -q "assignedToBot" ui/frontend/src/components/kanban-board.ts` |
| `kanban-board.ts` | `dashboard-view.ts` | Custom Event `spec-assign-toggle` | Phase 4 Story | `grep -q "spec-assign-toggle" ui/frontend/src/components/kanban-board.ts` |
| `specs-reader.ts` → `getSpecInfo()` | Frontend SpecInfo | `assignedToBot` in WS Response | Phase 1 Story | Automatisch durch bestehende Serialisierung |
| `specs-reader.ts` → `getKanbanBoard()` | Frontend KanbanBoard | `assignedToBot` in WS Response | Phase 1 Story | Automatisch durch bestehende Serialisierung |

### Verbindungs-Checkliste
- [x] Jede neue Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungsbefehle sind ausführbar

---

## Abhängigkeiten

### Interne Abhängigkeiten
```
Phase 1 (Data Layer) ──required by──> Phase 2 (WebSocket)
Phase 2 (WebSocket)  ──required by──> Phase 3 (Spec-Übersicht)
Phase 2 (WebSocket)  ──required by──> Phase 4 (Kanban-View)
Phase 3 ──parallel──> Phase 4
Phase 5 (Slash-Command) ──independent── (keine UI-Abhängigkeit)
```

### Externe Abhängigkeiten
- Keine neuen externen Libraries nötig
- Keine neuen NPM-Packages

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| "Ready"-Definition unklar | Low | Med | Klare Definition: `boardStatus.ready === boardStatus.total && total > 0` |
| Concurrent Modification | Low | Low | Bestehender `withKanbanLock()` Mechanismus wird verwendet |
| OpenClaw liest während UI schreibt | Low | Low | File-Locking via `kanban-lock.ts` oder eventual consistency |
| Frontend/Backend Type-Mismatch | Med | Med | Beide `SpecInfo`-Interfaces synchron updaten, Feld ist optional (`?`) |
| Spec wechselt Status während Assignment | Low | Low | Server-seitige Re-Validierung bei jedem Toggle |

---

## Self-Review Ergebnisse

### Validiert
- Alle 5 Requirements aus Clarification sind abgedeckt:
  1. `assignedToBot`-Feld in kanban.json (Phase 1)
  2. Web UI: Assignment in Spec-Übersicht (Phase 3)
  3. Web UI: Assignment in Kanban-View (Phase 4)
  4. Backend: API-Endpunkt via WebSocket (Phase 2)
  5. Slash-Command `/assign-spec` (Phase 5)
- Architektur-Entscheidungen sind konsistent mit bestehendem Codebase
- Alle Komponenten sind verbunden und jede Verbindung hat eine zuständige Story
- Backward Compatibility ist gewährleistet

### Identifizierte Probleme & Lösungen

| Problem | Ursprünglicher Plan | Verbesserung |
|---------|--------------------|--------------|
| REST-Endpunkt wäre inkonsistent | Requirements sagen "REST API" | WebSocket-Message stattdessen - folgt bestehendem Pattern |
| MCP-Interface-Sync | Separate Interfaces in MCP + Backend | Typ-only Update im MCP Server für Konsistenz |
| Ready-Status bei laufender Execution | Nicht definiert | Klare Regel: Nur Specs mit allen Stories in `ready` sind assignbar |

### Offene Fragen
- Keine - alle Aspekte sind geklärt

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| `withKanbanLock()` Pattern | `specs-reader.ts` | Atomares Toggle von `assignedToBot` |
| WS Message Handler Pattern | `websocket.ts` (Switch-Case) | `specs.assign` Handler |
| Custom Event Dispatch | `spec-card.ts` | `spec-assign` Event |
| Badge Rendering Pattern | `spec-card.ts` (Kanban/Not Started Badges) | Assignment-Badge |
| Toggle Pattern | `kanban-board.ts` (Auto-Mode) | Assignment-Toggle |
| Slash-Command Markdown | `add-bug.md`, `add-todo.md` | `/assign-spec` Command |
| Gateway Event System | `dashboard-view.ts` | Assignment WebSocket Events |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| Neuer REST-Endpunkt + Route-File | WebSocket Message im bestehenden Handler | 1 Datei weniger, konsistenter |
| Eigenes Assignment-Service-File | Methoden direkt in `SpecsReader` | Kein neues Service-File nötig |
| Eigenes Frontend-State-Management | Bestehender SpecInfo/KanbanBoard State | Keine neue State-Logik |
| Eigene CSS-Klassen | Bestehende Badge-/Toggle-CSS-Variablen | Minimal zusätzliches CSS |

### Feature-Preservation bestätigt
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar

---

## Geschätzter Gesamtumfang

- **Neue Dateien:** 1 (Slash-Command `assign-spec.md`)
- **Geänderte Dateien:** 5-6 (`specs-reader.ts`, `websocket.ts`, `spec-card.ts`, `kanban-board.ts`, `dashboard-view.ts`, optional `kanban-mcp-server.ts`)
- **Geschätzte LOC:** ~150-250 Zeilen neuer/geänderter Code
- **Stories:** 5 reguläre + 3 System-Stories = 8 gesamt

---

## Nächste Schritte

Nach Genehmigung dieses Plans:
1. Step 2.6: User Stories aus diesem Plan ableiten
2. Step 3: Architect fügt technische Details hinzu (WAS/WIE/WO/DoR/DoD)
3. Step 4: Spec ready for /execute-tasks
