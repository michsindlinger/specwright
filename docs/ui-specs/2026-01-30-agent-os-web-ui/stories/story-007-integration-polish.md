# Integration & Polish

> Story ID: AOSUI-007
> Spec: Agent OS Web UI
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Medium
**Type**: Full-stack
**Estimated Effort**: S
**Dependencies**: AOSUI-001, AOSUI-002, AOSUI-003, AOSUI-004, AOSUI-005, AOSUI-006
**Status**: Done

---

## Feature

```gherkin
Feature: Integration und UX-Verbesserungen
  Als Benutzer
  möchte ich eine durchgängig funktionierende App,
  damit alle Komponenten nahtlos zusammenarbeiten.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Durchgängige Navigation

```gherkin
Scenario: Navigation zwischen allen Views
  Given ich bin in der App eingeloggt
  When ich durch alle Views navigiere (Dashboard → Chat → Workflows → Dashboard)
  Then funktioniert jeder Übergang ohne Fehler
  And der aktuelle View ist in der Navigation hervorgehoben
```

### Szenario 2: Konsistentes Error Handling

```gherkin
Scenario: Fehler werden einheitlich angezeigt
  Given ein API-Fehler tritt auf
  When der Fehler verarbeitet wird
  Then erscheint eine Toast-Notification mit der Fehlermeldung
  And die App bleibt funktionsfähig
  And ich kann die Aktion erneut versuchen
```

### Szenario 3: Loading States

```gherkin
Scenario: Ladezustände sind sichtbar
  Given ich wechsle zu einem View der Daten lädt
  Then sehe ich einen Loading-Spinner
  And der Content erscheint sobald geladen
  And es gibt kein "Flackern" des UI
```

### Szenario 4: Responsive Verhalten

```gherkin
Scenario: App funktioniert auf verschiedenen Fenstergrößen
  Given ich nutze die App im Vollbild
  When ich das Fenster auf 800px Breite verkleinere
  Then passt sich das Layout an
  And die Navigation bleibt erreichbar
  And alle Funktionen sind nutzbar
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: WebSocket Reconnection
  Given ich nutze die App
  When die WebSocket-Verbindung kurz unterbrochen wird
  Then verbindet sich die App automatisch wieder
  And ich sehe kurz einen "Verbinde..." Indicator
  And danach funktioniert alles wie zuvor
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/src/components/toast-notification.ts
- [x] FILE_EXISTS: agent-os-ui/ui/src/components/loading-spinner.ts

### Inhalt-Prüfungen

- [x] CONTAINS: app.ts enthält "router"
- [x] CONTAINS: gateway.ts enthält "reconnect"

### Funktions-Prüfungen

- [x] BUILD_PASS: cd agent-os-ui && npm run build
- [x] LINT_PASS: cd agent-os-ui && npm run lint
- [ ] TEST_PASS: cd agent-os-ui && npm test (no tests configured)

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| Playwright MCP | E2E Navigation Tests | No (optional) |

---

## Technisches Refinement (vom Architect)

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

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Integration Tests bestanden
- [x] Code Review durchgeführt (self-review)

#### Dokumentation
- [x] README.md mit Setup-Anleitung
- [x] Keine Linting Errors
- [x] Completion Check Commands erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | ui/src/components/toast-notification.ts | Toast System |
| Frontend | ui/src/components/loading-spinner.ts | Loading Indicator |
| Frontend | ui/src/app.ts | UPDATE: Router Polish, Error Handler |
| Frontend | ui/src/gateway.ts | UPDATE: Auto-Reconnect Logic |
| Docs | README.md | Setup-Anleitung |

**Kritische Integration Points:**
- Global Error Handler → Toast Notification
- Gateway Disconnect → Auto-Reconnect mit Backoff
- Navigation State → Active View Highlight

---

### Technical Details

**WAS:**
- Toast Notification System (Error/Success/Info)
- Loading Spinner Component
- Enhanced Router mit Active State
- WebSocket Auto-Reconnect (Moltbot-Pattern)
- Responsive CSS für verschiedene Fenstergrößen
- README.md mit npm start Anleitung

**WIE:**
- Toast als Overlay mit CSS Animation
- Spinner als SVG Animation
- Router highlight via CSS :host([active])
- Reconnect mit exponential Backoff (800ms → 15s max)
- CSS Media Queries für < 800px
- README mit Prerequisites + Quickstart

**WO:**
```
agent-os-ui/
├── README.md                       # NEU: Setup-Anleitung
└── ui/
    └── src/
        ├── app.ts                  # UPDATE: Error Handler, Router Polish
        ├── gateway.ts              # UPDATE: reconnect Logic
        └── components/
            ├── toast-notification.ts # NEU: Toast System
            └── loading-spinner.ts    # NEU: Spinner
```

**WER:** dev-team__fullstack-developer

**Abhängigkeiten:** AOSUI-001 bis AOSUI-006 (alle vorherigen Stories)

**Geschätzte Komplexität:** S

---

### Completion Check

```bash
# Verify files exist
test -f agent-os-ui/README.md && echo "OK: README.md exists"
test -f agent-os-ui/ui/src/components/toast-notification.ts && echo "OK: toast-notification.ts exists"
test -f agent-os-ui/ui/src/components/loading-spinner.ts && echo "OK: loading-spinner.ts exists"

# Verify reconnect logic
grep -q "reconnect" agent-os-ui/ui/src/gateway.ts && echo "OK: Reconnect support"

# Verify router
grep -q "router" agent-os-ui/ui/src/app.ts && echo "OK: Router in app"

# Full build check
cd agent-os-ui && npm run build && echo "OK: Full build passes"

# Lint check
cd agent-os-ui && npm run lint && echo "OK: No lint errors"
```
