# Session State Management

> Story ID: MSC-004
> Spec: Multi-Session Chat
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: MSC-002, MSC-003

---

## Feature

```gherkin
Feature: Frontend Session State
  Als Entwickler
  möchte ich zwischen Sessions wechseln ohne den State zu verlieren,
  damit ich nahtlos an verschiedenen Aufgaben arbeiten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Sessions vom Backend laden

```gherkin
Scenario: Frontend lädt Sessions beim Start
  Given der Server hat 3 gespeicherte Sessions
  When das Frontend lädt
  Then werden alle 3 Sessions in den State geladen
  And die zuletzt aktive Session wird automatisch ausgewählt
```

### Szenario 2: Aktive Session wechseln

```gherkin
Scenario: Session-Wechsel aktualisiert den State
  Given ich bin in Session "Projekt A" mit 5 Nachrichten
  And Session "Projekt B" hat 3 Nachrichten
  When ich zu "Projekt B" wechsle
  Then zeigt der Chat-Bereich die 3 Nachrichten von "Projekt B"
  And die 5 Nachrichten von "Projekt A" bleiben im State erhalten
```

### Szenario 3: Neue Session zum State hinzufügen

```gherkin
Scenario: Neue Session wird zum State hinzugefügt
  Given ich habe 2 Sessions im State
  When ich eine neue Session erstelle
  Then hat der State jetzt 3 Sessions
  And die neue Session ist als aktiv markiert
```

### Szenario 4: Session aus State entfernen

```gherkin
Scenario: Geschlossene Session wird aus aktivem State entfernt
  Given ich habe 3 Sessions im State
  When ich Session "Alte Session" schließe
  Then hat der State nur noch 2 aktive Sessions
  And "Alte Session" ist nicht mehr in der Tab-Leiste
```

### Szenario 5: Chat-Nachricht zum Session-State hinzufügen

```gherkin
Scenario: Neue Nachricht aktualisiert Session-State
  Given ich bin in Session "Mein Projekt"
  When ich eine Nachricht "Hallo Claude" sende
  Then wird die Nachricht zum State der aktiven Session hinzugefügt
  And die Nachricht erscheint im Chat-Bereich
```

### Szenario 6: Agent-State pro Session tracken

```gherkin
Scenario: Agent-Status wird pro Session gespeichert
  Given ich habe Session "Projekt A" mit aktivem Agent
  And Session "Projekt B" ohne aktiven Agent
  When ich zwischen den Sessions wechsle
  Then zeigt "Projekt A" den Aktivitäts-Indikator
  And "Projekt B" zeigt keinen Aktivitäts-Indikator
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Letzte Session kann nicht geschlossen werden
  Given ich habe nur noch eine Session
  When ich versuche diese Session zu schließen
  Then wird eine neue leere Session erstellt
  And dann wird die alte Session geschlossen
  And ich habe immer mindestens eine Session
```

```gherkin
Scenario: State-Synchronisation nach Verbindungsverlust
  Given die WebSocket-Verbindung war kurz unterbrochen
  When die Verbindung wiederhergestellt wird
  Then wird der State mit dem Server synchronisiert
  And eventuell verpasste Nachrichten werden nachgeladen
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: `agent-os-ui/ui/src/stores/session.store.ts`

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui && npm run lint`
- [ ] BUILD_PASS: `cd agent-os-ui/ui && npm run build`
- [ ] TEST_PASS: `cd agent-os-ui && npm test -- --grep "SessionStore"`

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
- [ ] Reactive State Updates funktionieren korrekt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests für Store-Methoden geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend/State | session.store.ts | NEU: Session State Store |
| Frontend/Services | gateway.ts | ERWEITERN: Session-Message Handler |
| Frontend/Views | chat-view.ts | ERWEITERN: Session-Store Anbindung |

**Kritische Integration Points:**
- Gateway muss session:list, session:update Events an Store weiterleiten
- Components subscriben auf Store-Changes via Lit reactive properties

---

### Technical Details

**WAS:**
- `SessionStore` Singleton mit folgenden State-Properties:
  - `sessions: Map<string, ISessionState>` - Alle aktiven Sessions
  - `activeSessionId: string | null` - ID der aktuell aktiven Session
  - `isLoading: boolean` - Ladezustand
- Store-Methoden:
  - `loadSessions()`: Lädt Sessions vom Backend via Gateway
  - `setActiveSession(sessionId: string)`: Wechselt aktive Session
  - `createSession(name?: string)`: Erstellt neue Session
  - `closeSession(sessionId: string)`: Schließt und archiviert Session
  - `renameSession(sessionId: string, name: string)`: Benennt Session um
  - `addMessage(sessionId: string, message: ISessionMessage)`: Fügt Nachricht hinzu
  - `updateAgentState(sessionId: string, state: ISessionAgentState)`: Aktualisiert Agent-Status
- Getter: `activeSession`, `sessionList`, `hasMultipleSessions`

**WIE:**
- Folge State Management Pattern aus frontend-lit/state-management.md
- Nutze einfaches Observer-Pattern mit CustomEvents oder Lit @state decorators
- Gateway ruft Store-Methoden bei eingehenden WebSocket-Messages auf
- Components reagieren auf Store-Changes via requestUpdate()
- Mindestens eine Session muss immer existieren (Edge Case abfangen)

**WO:**
- `agent-os-ui/ui/src/stores/session.store.ts` (NEU)
- `agent-os-ui/ui/src/gateway.ts` (ERWEITERN - Session-Events registrieren)
- `agent-os-ui/ui/src/views/chat-view.ts` (ERWEITERN - Store-Integration)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:**
- MSC-002 (Session Types für ISession, ISessionState, ISessionMessage)
- MSC-003 (Backend-Service muss Sessions liefern können)

**Geschätzte Komplexität:** S (~150-200 LOC, State Store)

---

### Relevante Skills

- `frontend-lit` (State Management, Reactive Properties)
- `domain-agent-os-web-ui` (Chat-Interaction Patterns)

---

### Completion Check

```bash
# Build Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui && npm run build

# Lint Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm run lint

# Test Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm test -- --grep "SessionStore" || echo "Tests pending"
```

---

### Technische Verifikation

- [x] FILE_EXISTS: `agent-os-ui/ui/src/stores/session.store.ts`
- [x] CONTAINS: `session.store.ts` enthält `class SessionStore` oder `sessionStore`
- [x] CONTAINS: `session.store.ts` enthält `activeSessionId`, `sessions`
- [x] LINT_PASS: `npm run lint` ohne Fehler
- [x] BUILD_PASS: `npm run build` ohne Fehler
