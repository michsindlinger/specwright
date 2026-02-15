# Frontend Terminal Component

> Story ID: PTY-003
> Spec: Workflow Terminal Integration
> Created: 2026-02-02
> Last Updated: 2026-02-02
> Integration: gateway.ts ↔ aos-terminal

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: TBD
**Dependencies**: PTY-002
**Status**: Done

---

## Feature

```gherkin
Feature: Frontend Terminal-Komponente mit xterm.js
  Als Entwickler
  möchte ich ein natives Terminal im Browser sehen,
  damit ich Workflows mit voller Terminal-Interaktivität nutzen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Terminal rendert xterm.js und zeigt Output

```gherkin
Scenario: Terminal-Komponente wird gerendert und zeigt CLI-Output
  Given die aos-terminal Komponente wird in die View geladen
  And sie ist mit einer Execution-ID "exec-123" verbunden
  When das Terminal Output "$ npm test\nRunning tests..." empfängt
  Then sehe ich den Text "Running tests..." im Terminal
  And alle ANSI-Farben und Formatierungen sind korrekt dargestellt
```

### Szenario 2: User kann Input im Terminal eingeben

```gherkin
Scenario: User tippt Text im Terminal und Input wird gesendet
  Given das Terminal ist aktiv und der Cursor blinkt
  When ich "yes" tippe und Enter drücke
  Then wird "yes\n" über WebSocket an das Backend gesendet
  And das Terminal zeigt "yes" als Echo
```

### Szenario 3: Copy-Paste funktioniert

```gherkin
Scenario: User kopiert Text aus dem Terminal
  Given das Terminal zeigt Output "Error: ENOENT file not found"
  When ich den Text "ENOENT" markiere und Strg+C drücke
  Then ist "ENOENT" in meiner Zwischenablage
  And ich kann ihn in andere Apps einfügen
```

### Szenario 4: Theme-Integration mit App-Theme

```gherkin
Scenario: Terminal nutzt Moltbot Dark Theme
  Given die App nutzt das Moltbot Dark Theme
  When das Terminal gerendert wird
  Then sind die Terminal-Farben konsistent mit dem App-Theme
  And Hintergrund, Vordergrund und Akzentfarben passen zusammen
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Terminal empfängt sehr viel Output (1000+ Zeilen)
  Given das Terminal ist gerendert
  When 1000 Zeilen Output innerhalb 5 Sekunden eintreffen
  Then scrollt das Terminal automatisch zum Ende
  And ich kann beliebig zurück scrollen
  And die Performance bleibt flüssig (>30 FPS)
```

---

## Business Value

**Wert für Entwickler:**
- Native Terminal-Experience (wie VSCode Terminal)
- Volle Interaktivität (Input während Workflow)
- Copy-Paste für Fehler-Messages (Dev-Workflow)

**Technischer Wert:**
- xterm.js ist Industry-Standard (bewährt, maintained)
- Theme-Integration reduziert Custom-CSS
- Component-Isolation macht Tests einfacher

---

## Technisches Refinement (vom Architect)

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only

- **Betroffene Komponenten Table:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-terminal (neu) | Create xterm.js Lit wrapper component |
| Frontend | theme.css | Extend with xterm.js theme overrides |
| Frontend | gateway.ts | Wire aos-terminal to gateway (already modified in PTY-002) |

- **Kritische Integration Points:**
  - gateway.ts → aos-terminal (Custom Event dispatch: terminalData)
  - aos-terminal → gateway.ts (Method call: gateway.send(terminal.input))

- **Handover-Dokumente:**
  - aos-terminal.ts exposes terminalSessionId property for PTY-004 to bind

### DoR (Definition of Ready)

- [x] Fachliche requirements clear (Frontend terminal component with xterm.js)
- [x] Technical approach defined (Lit component wrapper, CSS Custom Properties theme)
- [x] Dependencies identified (PTY-002 must provide WebSocket protocol)
- [x] Affected components known (aos-terminal, gateway.ts, theme.css)
- [x] Required MCP Tools documented (N/A)
- [x] Story is appropriately sized (2 files, ~400 LOC)
- [x] Full-Stack Konsistenz:
  - [x] Alle betroffenen Layer identifiziert (Frontend-only)
  - [x] Integration Type bestimmt (Frontend-only)
  - [x] Kritische Integration Points dokumentiert
  - [x] WO deckt alle Layer ab

### DoD (Definition of Done)

- [x] Code implemented and follows Style Guide (TypeScript strict mode, Lit conventions)
- [x] Architecture requirements met (Lit component, CSS Custom Properties theme)
- [x] Security/Performance requirements satisfied (>30 FPS scrolling, 1000+ lines support)
- [x] All acceptance criteria met (xterm.js renders, input/output, copy-paste, theme)
- [x] Tests written and passing (Component tests with @open-wc/testing)
- [x] Code review approved
- [x] Documentation updated (JSDoc for public properties)
- [x] No linting errors
- [x] Completion Check commands successful
- [x] Accessibility tested (keyboard navigation works)

**Integration DoD (v2.9):**

- [x] **Integration hergestellt: gateway.ts → aos-terminal**
  - [x] Import/Aufruf existiert in Code
  - [x] Verbindung ist funktional (nicht nur Stub)
  - [x] Validierung: `grep -q "CustomEvent.*terminalData" agent-os-ui/ui/src/components/aos-terminal.ts`

- [x] **Integration hergestellt: aos-terminal → gateway.ts**
  - [x] Import/Aufruf existiert in Code
  - [x] Verbindung ist funktional (nicht nur Stub)
  - [x] Validierung: `grep -q "gateway.send.*terminal\\.input" agent-os-ui/ui/src/components/aos-terminal.ts`

### Technical Details

**WAS:**

- Create aos-terminal Lit component that wraps xterm.js Terminal
- Implement bidirectional I/O (receive terminal.data via gateway, send terminal.input via gateway)
- Implement copy-paste support (xterm.js built-in feature)
- Implement theme integration (CSS Custom Properties override xterm.js default theme)
- Implement auto-resize (use xterm-addon-fit)
- Add terminalSessionId property for execution-store binding (used in PTY-004)

**WIE (Architecture Guidance ONLY):**

- **Follow Lit component conventions:** Use @property decorators, Lit lifecycle (connectedCallback, disconnectedCallback)
- **Use CSS Custom Properties for theme:** Override xterm.js theme with `--terminal-bg`, `--terminal-fg`, `--terminal-accent` from theme.css
- **Follow existing component patterns:** Look at existing Lit components in ui/src/components/ for structure
- **Use xterm-addon-fit:** Auto-resize terminal to fit container (follow xterm.js docs)
- **Constraints:**
  - Component prefix must be `aos-` (aos-terminal)
  - Must clean up xterm.js Terminal instance in disconnectedCallback (prevent memory leaks)
  - Must listen to gateway Custom Events for terminalData
  - Must call gateway.send() for terminal.input (user keyboard input)
  - Copy-paste must work via browser clipboard API (xterm.js handles this)
- **Performance:** Terminal must handle 1000+ lines without performance degradation (xterm.js buffer management)

**WO:**

- agent-os-ui/ui/src/components/aos-terminal.ts (NEW - Lit component)
- agent-os-ui/ui/src/styles/theme.css (EXTEND - add xterm.js theme overrides)

**WER:**

Frontend Developer

**Abhängigkeiten:**

PTY-002 (WebSocket protocol must be implemented, gateway.ts must emit terminalData events)

**Geschätzte Komplexität:**

M (Medium - xterm.js integration straightforward, but theme + lifecycle management requires care)

**Relevante Skills:**

N/A (skill-index.md not available)

**Completion Check:**

```bash
# Auto-Verify Commands - all must exit with 0
test -f agent-os-ui/ui/src/components/aos-terminal.ts && echo "✓ aos-terminal component exists"
grep -q "CustomEvent.*terminalData" agent-os-ui/ui/src/components/aos-terminal.ts && echo "✓ Receives gateway events"
grep -q "gateway.send.*terminal\\.input" agent-os-ui/ui/src/components/aos-terminal.ts && echo "✓ Sends input to gateway"
grep -q "xterm" agent-os-ui/ui/src/styles/theme.css && echo "✓ Theme overrides exist"
npm run lint -- agent-os-ui/ui/src/components/aos-terminal.ts && echo "✓ No lint errors"
npm test -- aos-terminal.spec.ts && echo "✓ Component tests pass"
```

**Story ist DONE wenn:**

1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen (2 files: new aos-terminal.ts, modified theme.css)
