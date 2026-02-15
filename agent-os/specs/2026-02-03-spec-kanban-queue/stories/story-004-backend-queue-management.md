# Backend Queue-Management

> Story ID: SKQ-004
> Spec: 2026-02-03-spec-kanban-queue
> Created: 2026-02-03
> Last Updated: 2026-02-03

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: M
**Dependencies**: SKQ-001

---

## Feature

```gherkin
Feature: Backend Queue-Management
  Als System
  möchte ich den Queue-State im Backend verwalten,
  damit die Queue im Hintergrund weiterläuft auch wenn der User den View wechselt.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Queue-State wird im Backend gespeichert

```gherkin
Scenario: Queue-State persistiert über Frontend-Reconnects
  Given ich habe 3 Specs in der Queue
  When ich den Browser-Tab schließe und wieder öffne
  Then sehe ich die gleichen 3 Specs in der Queue
  And alle Status (pending/running/done/failed) sind erhalten
```

### Szenario 2: Frontend erhält Queue-State bei Connect

```gherkin
Scenario: Queue-State wird bei Verbindung synchronisiert
  Given das Backend hat eine Queue mit 2 Specs
  When das Frontend eine WebSocket-Verbindung aufbaut
  Then erhält das Frontend den aktuellen Queue-State
  And die Queue-Sidebar zeigt die korrekten Specs
```

### Szenario 3: Queue-Änderungen werden gepusht

```gherkin
Scenario: Backend pushed Queue-Updates ans Frontend
  Given das Frontend ist verbunden
  When ein Spec im Backend seinen Status ändert (z.B. "pending" → "running")
  Then erhält das Frontend eine Update-Nachricht
  And die UI aktualisiert sich automatisch
```

### Szenario 4: Queue-Operationen werden verarbeitet

```gherkin
Scenario: Backend verarbeitet Queue-Operationen
  Given das Frontend sendet "queue.add" mit specId und gitStrategy
  When das Backend die Nachricht empfängt
  Then wird der Spec zur Queue hinzugefügt
  And das Frontend erhält eine "queue.state" Nachricht mit aktuellem Stand
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/src/server/services/queue.service.ts
- [ ] FILE_EXISTS: agent-os-ui/src/server/handlers/queue.handler.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: queue.service.ts enthält "class QueueService"
- [ ] CONTAINS: queue.handler.ts enthält "queue.add"
- [ ] CONTAINS: queue.handler.ts enthält "queue.remove"
- [ ] CONTAINS: queue.handler.ts enthält "queue.reorder"
- [ ] CONTAINS: websocket.ts enthält "queue.handler" oder "QueueHandler"
- [ ] CONTAINS: gateway.ts enthält "queue."

### Funktions-Prüfungen

- [ ] LINT_PASS: cd agent-os-ui && npm run lint exits with code 0

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

> **⚠️ WICHTIG:** Dieser Abschnitt wird vom Architect ausgefüllt

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert**
- [x] **Handover-Dokumente definiert**

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | `queue.service.ts` | Neu erstellen |
| Backend | `queue.handler.ts` | Neu erstellen |
| Backend | `websocket.ts` | Handler registrieren |
| Frontend | `gateway.ts` | Queue-Message-Types hinzufügen |

**Kritische Integration Points:**
- `gateway.ts` → `queue.handler.ts`: WebSocket Messages
- `queue.handler.ts` → `queue.service.ts`: Service Calls

**Handover-Dokumente:**
- Message-Types: siehe Implementation Plan "Message-Typen"

---

### Technical Details

**WAS:**
- Neuer `QueueService` für Queue-State-Management
- Neuer `QueueHandler` für WebSocket-Message-Verarbeitung
- Gateway-Integration für Client-Side Message-Handling
- WebSocket-Integration für Handler-Registration

**WIE (Architektur-Guidance ONLY):**
- Folge dem Pattern aus bestehenden Handlers in `websocket.ts`
- Queue-State als In-Memory Map im Service (kein DB)
- Nutze bestehende WebSocket-Message-Patterns
- Bei Reconnect: Sende aktuellen Queue-State an Client
- Broadcast Queue-Updates an alle verbundenen Clients des Projekts

**WO:**
- `agent-os-ui/src/server/services/queue.service.ts` (neu)
- `agent-os-ui/src/server/handlers/queue.handler.ts` (neu)
- `agent-os-ui/src/server/websocket.ts` (erweitern)
- `agent-os-ui/ui/src/gateway.ts` (erweitern)

**Abhängigkeiten:** SKQ-001 (für Frontend-Integration)

**Geschätzte Komplexität:** M

**WER:** dev-team__backend-developer

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | agent-os/skills/backend-express.md | Backend Express + TypeScript |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| QueueService | Service | agent-os-ui/src/server/services/queue.service.ts | Queue-State-Management Service |
| QueueHandler | Handler | agent-os-ui/src/server/handlers/queue.handler.ts | WebSocket-Handler für Queue-Messages |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f agent-os-ui/src/server/services/queue.service.ts && echo "✓ QueueService exists"
test -f agent-os-ui/src/server/handlers/queue.handler.ts && echo "✓ QueueHandler exists"
grep -q "queue\." agent-os-ui/src/server/websocket.ts && echo "✓ Handler registered"
grep -q "queue\." agent-os-ui/ui/src/gateway.ts && echo "✓ Gateway integration"
cd agent-os-ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
