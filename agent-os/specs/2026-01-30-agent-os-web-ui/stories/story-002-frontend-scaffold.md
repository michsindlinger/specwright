# Frontend Scaffold

> Story ID: AOSUI-002
> Spec: Agent OS Web UI
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: None
**Status**: Done

---

## Feature

```gherkin
Feature: Frontend Grundstruktur
  Als Entwickler
  möchte ich eine Lit-basierte Frontend-Struktur haben,
  damit ich darauf aufbauend die UI-Komponenten entwickeln kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Frontend startet erfolgreich

```gherkin
Scenario: Vite Dev Server startet
  Given ich bin im agent-os-ui Projektordner
  When ich "npm run dev" ausführe
  Then öffnet sich die App auf http://localhost:5173
  And ich sehe die Haupt-App-Shell
```

### Szenario 2: Routing zwischen Views

```gherkin
Scenario: Navigation zu verschiedenen Views
  Given die App ist gestartet
  When ich auf "Dashboard" in der Navigation klicke
  Then sehe ich den Dashboard-View
  And die URL ändert sich zu "/dashboard"
```

### Szenario 3: Moltbot-Style Design

```gherkin
Scenario: Dark Theme ist aktiv
  Given die App ist gestartet
  Then hat die Seite einen dunklen Hintergrund
  And die Schriftart ist Space Grotesk für Text
  And Code-Bereiche nutzen JetBrains Mono
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Unbekannte Route
  Given die App ist gestartet
  When ich zu einer unbekannten URL navigiere
  Then sehe ich eine 404-Seite mit Zurück-Link
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/package.json
- [x] FILE_EXISTS: agent-os-ui/ui/src/main.ts
- [x] FILE_EXISTS: agent-os-ui/ui/src/app.ts
- [x] FILE_EXISTS: agent-os-ui/ui/src/styles/theme.css

### Inhalt-Prüfungen

- [x] CONTAINS: ui/package.json enthält "lit"
- [x] CONTAINS: ui/package.json enthält "vite"
- [x] CONTAINS: theme.css enthält "Space Grotesk"

### Funktions-Prüfungen

- [x] BUILD_PASS: cd agent-os-ui/ui && npm run build
- [x] LINT_PASS: cd agent-os-ui/ui && npm run lint

---

## Required MCP Tools

Keine MCP Tools erforderlich.

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
- [ ] Unit Tests geschrieben und bestanden (Scaffold only - no unit tests required)
- [x] Code Review durchgeführt (self-review)

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | ui/src/main.ts | Vite Entry Point |
| Frontend | ui/src/app.ts | Root Lit Component mit Router |
| Frontend | ui/src/styles/theme.css | Dark Theme CSS (Moltbot-inspired) |
| Config | ui/package.json | UI Dependencies |
| Config | ui/vite.config.ts | Vite Build Config |

---

### Technical Details

**WAS:**
- Vite-basiertes Frontend-Projekt in ui/ Unterordner
- Root Lit Component `<aos-app>` mit Navigation
- Client-side Routing (hash-based: #/dashboard, #/chat, #/workflows)
- Dark Theme CSS mit Space Grotesk + JetBrains Mono
- 404 Handler für unbekannte Routes

**WIE:**
- Lit 3.x mit @customElement Decorator (Pattern aus Moltbot)
- Hash-based Routing via window.onhashchange
- CSS Custom Properties für Theme-Variablen
- Fonts via Google Fonts CDN
- createRenderRoot() return this für globales CSS

**WO:**
```
agent-os-ui/
└── ui/
    ├── package.json                # NEU: UI package.json
    ├── index.html                  # NEU: HTML Entry
    ├── vite.config.ts              # NEU: Vite Config
    ├── tsconfig.json               # NEU: UI TypeScript config
    └── src/
        ├── main.ts                 # NEU: Vite Entry
        ├── app.ts                  # NEU: Root Component <aos-app>
        ├── views/                  # NEU: View Components (Platzhalter)
        │   ├── dashboard-view.ts
        │   ├── chat-view.ts
        │   └── workflow-view.ts
        └── styles/
            └── theme.css           # NEU: Moltbot-style Dark Theme
```

**WER:** dev-team__fullstack-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

---

### Completion Check

```bash
# Verify UI project structure
test -f agent-os-ui/ui/package.json && echo "OK: ui/package.json exists"
test -f agent-os-ui/ui/src/main.ts && echo "OK: main.ts exists"
test -f agent-os-ui/ui/src/app.ts && echo "OK: app.ts exists"
test -f agent-os-ui/ui/src/styles/theme.css && echo "OK: theme.css exists"

# Verify dependencies
grep -q "lit" agent-os-ui/ui/package.json && echo "OK: lit dependency"
grep -q "vite" agent-os-ui/ui/package.json && echo "OK: vite dependency"

# Verify theme contains required fonts
grep -q "Space Grotesk" agent-os-ui/ui/src/styles/theme.css && echo "OK: Space Grotesk font"

# Build check
cd agent-os-ui/ui && npm run build && echo "OK: UI builds"
```
