# Integration & End-to-End Validation

> Story ID: MSC-999
> Spec: Multi-Session Chat
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Test
**Estimated Effort**: S
**Dependencies**: MSC-001, MSC-002, MSC-003, MSC-004, MSC-005, MSC-006

---

## Feature

```gherkin
Feature: Multi-Session Integration
  Als Systemadministrator
  möchte ich dass alle Komponenten dieser Spec zusammenwirken,
  damit das Multi-Session Feature vollständig funktioniert.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Kompletter Session-Lifecycle

```gherkin
Scenario: Session von Erstellung bis Archivierung
  Given die Anwendung ist gestartet
  When ich eine neue Session "Test Projekt" erstelle
  And ich eine Nachricht "Hallo Claude" sende
  And ich die Antwort vom Agent erhalte
  And ich die Session schließe
  Then ist die Session im Archiv
  When ich die Session wiederherstelle
  Then sehe ich die komplette Chat-Historie
  And ich kann die Konversation fortsetzen
```

### Szenario 2: Parallele Sessions mit aktiven Agents

```gherkin
Scenario: Zwei Sessions arbeiten gleichzeitig
  Given ich habe Session "Projekt A" und "Projekt B"
  When ich in "Projekt A" eine Aufgabe starte
  And ich zu "Projekt B" wechsle
  And ich in "Projekt B" eine andere Aufgabe starte
  Then zeigen beide Tabs Aktivitäts-Indikatoren
  And beide Agent-Prozesse laufen unabhängig
  And die Antworten werden den richtigen Sessions zugeordnet
```

### Szenario 3: App-Neustart mit Sessions

```gherkin
Scenario: Sessions überleben Neustart
  Given ich habe 3 Sessions mit verschiedenen Chat-Historien
  And Session "Aktiv" war zuletzt ausgewählt
  When ich die Anwendung neu starte
  Then werden alle 3 Sessions wiederhergestellt
  And Session "Aktiv" ist automatisch ausgewählt
  And alle Chat-Historien sind vollständig
```

### Szenario 4: Session schließen während Agent arbeitet

```gherkin
Scenario: Aktiver Agent wird beim Schließen gestoppt
  Given Session "Laufend" hat einen aktiven Agent-Prozess
  When ich versuche die Session zu schließen
  Then erscheint ein Bestätigungs-Dialog
  And der Dialog warnt vor dem laufenden Prozess
  When ich bestätige
  Then wird der Agent-Prozess beendet
  And die Session wird archiviert
```

### Szenario 5: WebSocket-Reconnect

```gherkin
Scenario: Verbindungswiederherstellung
  Given ich habe 2 aktive Sessions
  And die WebSocket-Verbindung wird unterbrochen
  When die Verbindung wiederhergestellt wird
  Then werden beide Sessions synchronisiert
  And eventuell verpasste Nachrichten werden nachgeladen
  And ich kann normal weiterarbeiten
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Korrupte Session beim Start
  Given eine Session-Datei ist korrupt
  When die Anwendung startet
  Then wird die korrupte Session übersprungen
  And eine Warnung wird angezeigt
  And die anderen Sessions funktionieren normal
```

```gherkin
Scenario: Speicherplatz wird knapp
  Given der verfügbare Speicherplatz ist gering
  When ich eine Session speichere
  Then wird eine Warnung angezeigt
  And die Session bleibt im Memory erhalten
  And der User kann manuell aufräumen
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: `agent-os-ui/tests/integration/multi-session.test.ts`

### Funktions-Prüfungen

- [ ] TEST_PASS: `cd agent-os-ui && npm test -- --grep "multi-session"`
- [ ] BUILD_PASS: `cd agent-os-ui && npm run build`
- [ ] LINT_PASS: `cd agent-os-ui && npm run lint`

### Browser-Prüfungen (optional)

- [ ] MCP_PLAYWRIGHT: E2E Tests (nur wenn Playwright MCP verfügbar)

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| Playwright | E2E Browser Tests | No (optional) |

**Pre-Flight Check:**
```bash
# Optional - E2E tests werden nur ausgeführt wenn Playwright verfügbar ist
claude mcp list | grep -q "playwright" || echo "Playwright not available - skipping E2E tests"
```

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
- [ ] Integration Tests implementiert
- [ ] Alle vorherigen Stories erfolgreich integriert
- [ ] Manuelle E2E Verifizierung durchgeführt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Integration Tests bestanden
- [ ] Alle Unit Tests der vorherigen Stories bestanden

#### Dokumentation
- [ ] Feature als "Complete" in story-index.md markiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-Stack (Test/Validation)

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | Alle aos-session-* Komponenten | Verifizieren |
| Frontend | session.store.ts | Verifizieren |
| Backend | session.service.ts | Verifizieren |
| Backend | websocket.ts | Verifizieren |
| Test | multi-session.test.ts | NEU: Integration Tests |

**Kritische Integration Points:**
- Session-Lifecycle: Create -> Use -> Archive -> Restore -> Delete
- WebSocket-Routing: Messages korrekt an Sessions zugeordnet
- State-Sync: Frontend und Backend synchron
- Persistence: Sessions überleben Server-Restart

---

### Technical Details

**WAS:**
- Integration Test Suite für Multi-Session Feature:
  - Test 1: Session-Lifecycle (Create, Rename, Close, Archive)
  - Test 2: Parallele Sessions mit unabhängigen Messages
  - Test 3: Session-Persistenz nach Server-Restart
  - Test 4: WebSocket-Reconnect mit Session-Recovery
  - Test 5: Archiv-Restore mit Namenskollision
- Manuelle E2E Checkliste:
  - [ ] Neue Session erstellen via "+" Button
  - [ ] Session umbenennen via Doppelklick
  - [ ] Zwischen Sessions wechseln
  - [ ] Agent-Indikator bei laufendem Prozess
  - [ ] Session schließen (mit/ohne aktiven Agent)
  - [ ] Archiv öffnen und Session wiederherstellen
  - [ ] Browser/App neustarten, Sessions prüfen

**WIE:**
- Nutze Vitest für Integration Tests
- Mock-WebSocket für isolierte Tests oder echte Verbindung
- Test-Fixtures für Session-Daten
- Optional: Playwright MCP für Browser-Automatisierung (nicht blockierend)
- Manuelle Tests folgen Gherkin-Szenarien aus spec.md

**WO:**
- `agent-os-ui/tests/integration/multi-session.test.ts` (NEU)
- `agent-os-ui/tests/fixtures/session-fixtures.ts` (NEU - optional)

**WER:** dev-team__qa-specialist (oder dev-team__backend-developer falls kein QA Agent verfügbar)

**Abhängigkeiten:**
- MSC-001, MSC-002, MSC-003, MSC-004, MSC-005, MSC-006 (ALLE Stories)
- Diese Story MUSS als letzte ausgeführt werden

**Geschätzte Komplexität:** S (~150-200 LOC für Tests)

---

### Relevante Skills

- `backend-express` (Testing Patterns)
- `quality-gates` (Verification Checklists)

---

### Completion Check

```bash
# Full Build Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm run build

# Full Lint Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm run lint

# All Tests
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm test

# Integration Tests specifically
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm test -- --grep "multi-session"

# Server Start Check (manual verification)
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm run dev &
sleep 5 && curl -s http://localhost:3001/health && pkill -f "npm run dev"
```

---

### Technische Verifikation

- [x] FILE_EXISTS: `agent-os-ui/tests/integration/multi-session.test.ts`
- [x] TEST_PASS: `npm test` ohne Fehler (alle Tests)
- [x] BUILD_PASS: `npm run build` ohne Fehler (Frontend + Backend)
- [x] LINT_PASS: `npm run lint` ohne Fehler
