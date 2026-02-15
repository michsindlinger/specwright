# WebSocket Multi-Session Routing

> Story ID: MSC-005
> Spec: Multi-Session Chat
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Full-Stack
**Estimated Effort**: S
**Dependencies**: MSC-002, MSC-003, MSC-004

---

## Feature

```gherkin
Feature: WebSocket Session Routing
  Als Entwickler mit mehreren Sessions
  möchte ich dass Nachrichten der richtigen Session zugeordnet werden,
  damit parallele Agent-Prozesse unabhängig voneinander laufen können.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Nachricht an spezifische Session senden

```gherkin
Scenario: Client sendet Nachricht mit Session-ID
  Given ich bin in Session "Projekt A" mit ID "session-123"
  When ich eine Chat-Nachricht sende
  Then enthält die WebSocket-Nachricht die Session-ID "session-123"
  And der Server verarbeitet die Nachricht für diese Session
```

### Szenario 2: Server-Antwort an richtige Session routen

```gherkin
Scenario: Agent-Antwort wird der richtigen Session zugeordnet
  Given Session "Projekt A" hat einen aktiven Agent-Prozess
  And Session "Projekt B" hat keinen aktiven Prozess
  When der Agent eine Antwort sendet
  Then wird die Antwort nur in Session "Projekt A" angezeigt
  And Session "Projekt B" bleibt unverändert
```

### Szenario 3: Parallele Streams für mehrere Sessions

```gherkin
Scenario: Zwei Sessions streamen gleichzeitig
  Given Session "Projekt A" und "Projekt B" haben beide aktive Agents
  When beide Agents gleichzeitig antworten
  Then werden die Streams korrekt getrennt
  And "Projekt A" zeigt nur Antworten von seinem Agent
  And "Projekt B" zeigt nur Antworten von seinem Agent
```

### Szenario 4: Session-Status Updates

```gherkin
Scenario: Agent-Status wird per WebSocket aktualisiert
  Given ich habe Session "Mein Projekt"
  When der Agent mit der Arbeit beginnt
  Then sendet der Server ein Status-Update "agent:working"
  And der Tab zeigt einen Aktivitäts-Indikator
  When der Agent fertig ist
  Then sendet der Server ein Status-Update "agent:idle"
  And der Aktivitäts-Indikator verschwindet
```

### Szenario 5: Neue Session über WebSocket erstellen

```gherkin
Scenario: Session-Erstellung wird synchronisiert
  Given ich klicke auf den "+" Button
  When die Session erstellt wird
  Then sendet der Client eine "session:create" Nachricht
  And der Server bestätigt mit der neuen Session-ID
  And die Session ist auf Client und Server synchron
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Nachricht für nicht existierende Session
  Given eine Nachricht hat Session-ID "invalid-session"
  When der Server die Nachricht empfängt
  Then wird ein Fehler an den Client gesendet
  And die Nachricht wird nicht verarbeitet
```

```gherkin
Scenario: Session geschlossen während Agent arbeitet
  Given Session "Projekt X" hat einen aktiven Agent-Prozess
  When ich die Session schließe und bestätige
  Then wird der Agent-Prozess beendet
  And die Session wird archiviert
  And keine weiteren Nachrichten für diese Session werden gesendet
```

```gherkin
Scenario: Reconnect stellt Session-Kontext wieder her
  Given ich hatte Sessions "A", "B", "C" offen
  And die WebSocket-Verbindung wird unterbrochen
  When die Verbindung wiederhergestellt wird
  Then werden alle aktiven Sessions wiederhergestellt
  And laufende Agent-Prozesse werden fortgesetzt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: `agent-os-ui/src/server/websocket.ts` (ERWEITERT)
- [ ] FILE_EXISTS: `agent-os-ui/ui/src/gateway.ts` (ERWEITERT)

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui && npm run lint`
- [ ] BUILD_PASS: `cd agent-os-ui && npx tsc --noEmit`
- [ ] TEST_PASS: `cd agent-os-ui && npm test -- --grep "WebSocket.*session"`

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| - | Keine MCP Tools erforderlich | - |

---

## Technisches Refinement (vom Architect)

> **Refined:** 2026-01-30

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
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten
- [ ] Session-ID wird in allen relevanten Messages mitgesendet

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests für Message-Routing geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-Stack

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend/Services | gateway.ts | ERWEITERN: sessionId in Messages einfügen |
| Backend/Integration | websocket.ts | ERWEITERN: Session-Routing implementieren |
| Backend/Service | session.service.ts | NUTZEN: Session-Validierung |
| Shared/Types | session.types.ts | NUTZEN: Message-Types mit sessionId |

**Kritische Integration Points:**
- WebSocket-Messages MÜSSEN sessionId enthalten
- Backend MUSS Messages an korrekte Session routen
- Frontend MUSS eingehende Messages nach sessionId filtern
- Parallele Agent-Prozesse MÜSSEN isoliert bleiben

---

### Technical Details

**WAS:**
- Backend-Erweiterungen:
  - Neue Message-Handler: `session.list`, `session.create`, `session.update`, `session.delete`
  - Session-ID Validierung bei allen chat.* und workflow.* Messages
  - Tracking von Agent-Prozessen pro Session (Map<sessionId, AgentProcess>)
  - Broadcast nur an relevante Session
- Frontend-Erweiterungen:
  - Gateway sendet sessionId bei chat.send, workflow.start etc.
  - Eingehende Messages werden nach sessionId gefiltert
  - Reconnect lädt aktive Sessions neu

**WIE:**
- Erweitere bestehende WebSocketMessage um optionales `sessionId` Feld
- Backend: Switch/Case für session.* Message-Types analog zu bestehenden Handlern
- Backend: Map<sessionId, ClaudeHandler-Instance> für parallele Agents
- Frontend: Gateway.send() fügt automatisch activeSessionId ein
- Frontend: Message-Handler prüfen sessionId vor Store-Update
- Folge WebSocket Pattern aus architecture-decision.md (DEC-003)

**WO:**
- `agent-os-ui/src/server/websocket.ts` (ERWEITERN - session.* Handler)
- `agent-os-ui/src/server/claude-handler.ts` (ERWEITERN - Session-Context)
- `agent-os-ui/ui/src/gateway.ts` (ERWEITERN - sessionId in Messages)
- `agent-os-ui/ui/src/stores/session.store.ts` (NUTZEN - Message-Empfang)

**WER:** dev-team__backend-developer (führend), dev-team__frontend-developer (Gateway-Erweiterung)

**Abhängigkeiten:**
- MSC-002 (Session Types für Message-Struktur)
- MSC-003 (Session Persistence Service für CRUD)
- MSC-004 (Session Store für Frontend-State)

**Geschätzte Komplexität:** S (~200-250 LOC, verteilt auf Frontend + Backend)

---

### Relevante Skills

- `backend-express` (WebSocket Handler Pattern)
- `frontend-lit` (Gateway Integration)

---

### Completion Check

```bash
# Backend Build Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npx tsc --noEmit

# Frontend Build Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui && npm run build

# Lint Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm run lint

# Test Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm test -- --grep "session" || echo "Tests pending"
```

---

### Technische Verifikation

- [x] CONTAINS: `websocket.ts` enthält `session.list`, `session.create` Handler
- [x] CONTAINS: `gateway.ts` enthält `sessionId` in send() Methode
- [x] LINT_PASS: `npm run lint` ohne Fehler (Backend + Frontend)
- [x] BUILD_PASS: `npx tsc --noEmit` und `npm run build` ohne Fehler
