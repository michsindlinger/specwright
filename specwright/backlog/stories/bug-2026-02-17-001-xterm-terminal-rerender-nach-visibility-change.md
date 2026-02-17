# Bug: Xterm Terminal rerendert nicht korrekt nach Visibility-Change

> Bug ID: 2026-02-17-001
> Created: 2026-02-17
> Severity: High
> Status: Ready

**Priority**: High
**Type**: Bug - Frontend
**Affected Component**: aos-terminal, aos-terminal-session, aos-cloud-terminal-sidebar

---

## Bug Description

### Symptom
Das Xterm Terminal rendert nicht korrekt, wenn die Sidebar geschlossen und wieder geoeffnet wird oder wenn zwischen Projekten gewechselt wird (wodurch sich die projektbezogenen Terminal-Sessions aendern).

### Reproduktion
1. Cloud Terminal Sidebar oeffnen und eine Terminal-Session starten
2. Sidebar schliessen (X-Button oder Toggle)
3. Sidebar wieder oeffnen
4. Terminal zeigt Inhalt nicht korrekt an (falsche Dimensionen, leerer Canvas, verzerrte Darstellung)

**Alternativer Reproduktionspfad (Projektwechsel):**
1. Projekt A oeffnen, Terminal-Session starten
2. Zu Projekt B wechseln (ueber Project-Tabs)
3. Zurueck zu Projekt A wechseln
4. Terminal zeigt Inhalt nicht korrekt an

### Expected vs. Actual
- **Expected:** Terminal zeigt vollstaendigen, korrekt gerenderten Inhalt nach Wiedersichtbarkeit mit korrekten Dimensionen
- **Actual:** Terminal-Inhalt ist leer, verzerrt oder zeigt falsche Dimensionen nach Visibility-Wechsel

---

## User-Input (aus Step 2.5)

> Dokumentation des Benutzer-Wissens vor der RCA

**Hat User Vermutungen geteilt:** Nein

---

## Root-Cause-Analyse

### Hypothesen (vor Analyse)

| # | Hypothese | Wahrscheinlichkeit | Quelle | Pruefmethode |
|---|-----------|-------------------|--------|-------------|
| 1 | `fitAddon.fit()` berechnet falsche Dimensionen weil Container noch display:none hat | 50% | Agent | Code-Analyse: refreshTerminal() Timing vs CSS display Toggle |
| 2 | Bei Projektwechsel recreated repeat() Terminal-Elemente, xterm.open() laeuft in Zero-Size Container | 30% | Agent | Code-Analyse: repeat() Key-Lifecycle + initializeTerminal() Timing |
| 3 | Doppeltes display:none (session-panel + terminal-wrapper.hidden) verursacht Timing-Race | 20% | Agent | Code-Analyse: CSS-Cascade Light DOM vs Shadow DOM |

### Pruefung

**Hypothese 1 pruefen:** fitAddon.fit() Dimension Timing
- Aktion: refreshTerminal() Code-Pfad in aos-terminal-session.ts und aos-terminal.ts analysiert
- Befund:
  - `aos-terminal-session.refreshTerminal()` (Zeile 287-293) nutzt nur ein `requestAnimationFrame`
  - Session-Panels nutzen `display: none` / `display: block` Toggle (Sidebar CSS Zeile 262-273)
  - Ein einzelnes rAF garantiert NICHT vollstaendiges Layout-Reflow nach display-Wechsel
  - `initializeTerminal()` (Zeile 169-195) hat keinen Visibility-Check vor `terminal.open()` + `fit()`
- Ergebnis: BESTAETIGT (Teilursache)
- Begruendung: requestAnimationFrame reicht nicht nach display:none -> display:block fuer korrektes Layout

**Hypothese 2 pruefen:** Terminal Destroy/Recreate bei Projektwechsel
- Aktion: repeat() Lifecycle + cleanupTerminal/initializeTerminal analysiert
- Befund:
  - repeat() nutzt session.id als Key - verschiedene Projekte haben verschiedene Session-IDs
  - Bei Projektwechsel: alte Elemente disconnected (cleanupTerminal -> terminal.dispose()), neue erstellt
  - Neue aos-terminal.connectedCallback() -> updateComplete.then(() -> initializeTerminal())
  - Container kann 0-Dimensionen haben wenn Session-Panel noch nicht sichtbar
  - ResizeObserver hat Zero-Guard (Zeile 389-391) aber keine Retry-Logik
- Ergebnis: BESTAETIGT (Teilursache)
- Begruendung: Terminal-Recreate in moeglicherweise unsichtbarem Container problematisch

**Hypothese 3 pruefen:** Doppeltes display:none Race
- Aktion: CSS-Cascade zwischen Light DOM (.session-panel) und Shadow DOM (.terminal-wrapper.hidden)
- Befund: Beide werden durch isActive gesteuert, aber in verschiedenen Render-Cycles. Theoretisch moeglicher Timing-Unterschied, aber requestAnimationFrame sollte dies ueberbruecken.
- Ergebnis: Ausgeschlossen (geringer Impact)
- Begruendung: Der RAF-Delay kompensiert den Render-Cycle Unterschied

### Root Cause

**Ursache:** Kombination aus zwei Problemen:
1. **Stale Dimensions bei Refresh**: `refreshTerminal()` nutzt nur ein einzelnes `requestAnimationFrame`, was nach `display: none` -> `display: block` nicht immer ausreicht fuer ein vollstaendiges Layout-Reflow. `fitAddon.fit()` berechnet dann falsche Cols/Rows.
2. **Zero-Size Initialization**: Bei Projektwechsel werden Terminal-Elemente durch `repeat()` destroyed/recreated. `initializeTerminal()` prueft NICHT ob der Container sichtbar ist und oeffnet das xterm-Terminal moeglicherweise in einen Container mit 0-Dimensionen.

**Beweis:**
- `aos-terminal-session.ts:287-293`: refreshTerminal() nutzt nur requestAnimationFrame - kein Double-rAF
- `aos-terminal.ts:169-195`: initializeTerminal() hat keinen Visibility-Check vor terminal.open() + fitAddon.fit()
- `aos-terminal.ts:380-415`: ResizeObserver hat Zero-Dimension-Guard aber keine Retry-Logik
- `aos-cloud-terminal-sidebar.ts:262-273`: display:none/display:block Toggle per CSS-Klasse

**Betroffene Dateien:**
- `ui/frontend/src/components/aos-terminal.ts`
- `ui/frontend/src/components/terminal/aos-terminal-session.ts`
- `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts`

---

## Feature (Bug-Fix)

```gherkin
Feature: Xterm Terminal Rerender nach Visibility-Change beheben
  Als Entwickler
  moechte ich dass das Xterm Terminal nach Sidebar-Oeffnen und Projektwechsel korrekt rerendert,
  damit ich nahtlos zwischen Projekten und Terminal-Sessions wechseln kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Terminal nach Sidebar-Reopen korrekt

```gherkin
Scenario: Terminal rendert korrekt nach Sidebar schliessen und wieder oeffnen
  Given eine aktive Terminal-Session in der Cloud Terminal Sidebar
  And das Terminal zeigt Ausgaben mit korrekten Dimensionen
  When ich die Sidebar schliesse
  And ich die Sidebar wieder oeffne
  Then zeigt das Terminal den vollstaendigen Inhalt mit korrekten Dimensionen
  And die Spalten/Zeilen passen zur Container-Groesse
```

### Szenario 2: Terminal nach Projektwechsel korrekt

```gherkin
Scenario: Terminal rendert korrekt nach Projektwechsel
  Given eine aktive Terminal-Session in Projekt A
  And eine aktive Terminal-Session in Projekt B
  When ich von Projekt A zu Projekt B wechsle
  Then zeigt das Terminal fuer Projekt B den korrekten Inhalt
  And die Dimensionen stimmen mit dem Container ueberein
  When ich zurueck zu Projekt A wechsle
  Then zeigt das Terminal fuer Projekt A den korrekten Inhalt
```

### Szenario 3: Regression-Schutz - Session-Tab-Wechsel

```gherkin
Scenario: Terminal rendert korrekt bei Tab-Wechsel innerhalb eines Projekts
  Given zwei aktive Terminal-Sessions im selben Projekt
  When ich zwischen den Session-Tabs wechsle
  Then zeigt jede Session ihren korrekten Inhalt
  And die Dimensionen sind korrekt
```

---

## Technische Verifikation

- [ ] BUG_FIXED: Terminal zeigt korrekte Dimensionen nach Sidebar-Reopen
- [ ] BUG_FIXED: Terminal zeigt korrekte Dimensionen nach Projektwechsel
- [ ] BUG_FIXED: Terminal zeigt korrekte Dimensionen nach Tab-Wechsel
- [ ] TEST_PASS: Regression test added and passing
- [ ] LINT_PASS: No linting errors
- [ ] MANUAL: Bug no longer reproducible with original steps

---

## Technisches Refinement

### DoR (Definition of Ready)

#### Bug-Analyse
- [x] Bug reproduzierbar
- [x] Root Cause identifiziert
- [x] Betroffene Dateien bekannt

#### Technische Vorbereitung
- [x] Fix-Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Risiken bewertet

**Bug ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done)

- [ ] Bug behoben gemaess Root Cause
- [ ] Regression Test hinzugefuegt
- [ ] Keine neuen Bugs eingefuehrt
- [ ] Code Review durchgefuehrt
- [ ] Original Reproduktionsschritte fuehren nicht mehr zum Bug

**Bug ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten (Fix-Impact)

> **PFLICHT:** Basierend auf Fix-Impact Analysis (Step 3.5)

**Fix Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Impact | Aenderung |
|-------|-------------|--------|----------|
| Presentation | aos-terminal.ts | Direct | refreshTerminal() + initializeTerminal() verbessern |
| Presentation | aos-terminal-session.ts | Direct | refreshTerminal() mit Double-rAF oder Retry |
| Presentation | aos-cloud-terminal-sidebar.ts | Indirect | Ggf. zusaetzlicher Refresh bei Session-Wechsel |

**Kritische Integration Points:** Keine (reiner Frontend-Fix)

---

### Technical Details

**WAS:**
1. `refreshTerminal()` in `aos-terminal-session.ts` robust machen: Double-rAF oder `setTimeout(0)` statt einzelnem rAF
2. `refreshTerminal()` in `aos-terminal.ts` erweitern: Expliziten `terminal.refresh(0, rows-1)` Aufruf nach `fitAddon.fit()` hinzufuegen fuer Canvas-Recovery
3. `initializeTerminal()` in `aos-terminal.ts` absichern: Visibility-Check mit Retry-Logik wenn Container 0-Dimensionen hat
4. Optional: `aos-cloud-terminal-sidebar.updated()` auch bei `activeSessionId`-Wechsel refreshen (nicht nur bei `isOpen`-Change)

**WIE (Architektur-Guidance ONLY):**
- Pattern: Double-requestAnimationFrame fuer sicheres Layout-Reflow nach display-Wechsel
- Constraint: Keine Breaking Changes am Public API der Komponenten
- Constraint: Bestehende Gateway-Listener und Buffer-Request Mechanik nicht aendern
- Pattern: Deferred Initialization - wenn Container 0-Dimensionen hat, Initialization in einem ResizeObserver-Callback nachholen

**WO:**
- `ui/frontend/src/components/aos-terminal.ts`: refreshTerminal() + initializeTerminal()
- `ui/frontend/src/components/terminal/aos-terminal-session.ts`: refreshTerminal()
- `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts`: updated() Hook erweitern

**Abhaengigkeiten:** None

**Geschaetzte Komplexitaet:** S

---

### Completion Check

```bash
# Frontend compiles
cd ui/frontend && npm run build

# Linter passes
cd ui && npm run lint

# Tests pass
cd ui && npm test
```

**Bug ist DONE wenn:**
1. Original Reproduktionsschritte funktionieren korrekt (Sidebar close/reopen, Projektwechsel)
2. Terminal-Dimensionen stimmen nach jedem Visibility-Wechsel
3. Keine verwandten Fehler bei Tab-Wechsel oder Resize
