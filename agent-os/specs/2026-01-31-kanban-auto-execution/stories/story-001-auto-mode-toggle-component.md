# Auto-Mode Toggle Component

> Story ID: KAE-001
> Spec: kanban-auto-execution
> Created: 2026-01-31
> Last Updated: 2026-01-31

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: None
**Status**: Done

---

## Feature

```gherkin
Feature: Auto-Mode Toggle im Kanban Board
  Als Entwickler
  möchte ich einen Toggle-Schalter im Kanban Board Header sehen,
  damit ich die automatische Story-Ausführung ein- und ausschalten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Toggle wird angezeigt

```gherkin
Scenario: Auto-Mode Toggle ist im Header sichtbar
  Given ich öffne ein Kanban Board für eine Spec
  When das Kanban Board geladen ist
  Then sehe ich einen Toggle-Schalter rechts neben dem Spec-Titel
  And der Toggle zeigt "Auto" als Label
  And der Toggle ist initial deaktiviert (aus)
```

### Szenario 2: Toggle aktivieren

```gherkin
Scenario: Auto-Mode Toggle einschalten
  Given der Auto-Mode Toggle ist deaktiviert
  When ich auf den Toggle klicke
  Then wird der Toggle als aktiv angezeigt (visuell hervorgehoben)
  And ein Event 'auto-mode-toggle' mit { enabled: true } wird dispatched
```

### Szenario 3: Toggle deaktivieren

```gherkin
Scenario: Auto-Mode Toggle ausschalten
  Given der Auto-Mode Toggle ist aktiviert
  When ich auf den Toggle klicke
  Then wird der Toggle als inaktiv angezeigt
  And ein Event 'auto-mode-toggle' mit { enabled: false } wird dispatched
```

### Szenario 4: Visual Feedback während Auto-Mode aktiv

```gherkin
Scenario: Visuelles Feedback bei aktivem Auto-Mode
  Given der Auto-Mode ist aktiviert
  When ich das Kanban Board betrachte
  Then pulsiert der Toggle-Bereich sanft (CSS Animation)
  And eine kleine Badge zeigt "Auto aktiv"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Toggle-Status nach Browser Refresh
  Given der Auto-Mode war aktiviert
  When ich die Seite neu lade (Browser Refresh)
  Then ist der Auto-Mode Toggle deaktiviert
  And der vorherige Status wird NICHT wiederhergestellt
```

```gherkin
Scenario: Toggle während laufender Story-Execution
  Given eine Story wird gerade ausgeführt (In Progress)
  And der Auto-Mode ist aktiviert
  When ich den Toggle deaktiviere
  Then läuft die aktuelle Story-Execution weiter
  And nach Abschluss wird KEINE nächste Story gestartet
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/kanban-board.ts enthält Auto-Mode Toggle
- [ ] FILE_EXISTS: agent-os-ui/ui/src/styles/theme.css enthält Auto-Mode Styles (optional)

### Inhalt-Prüfungen

- [ ] CONTAINS: kanban-board.ts enthält "autoModeEnabled" als @state() Property
- [ ] CONTAINS: kanban-board.ts enthält "handleAutoModeToggle" Methode
- [ ] CONTAINS: kanban-board.ts enthält CustomEvent 'auto-mode-toggle'

### Funktions-Prüfungen

- [ ] LINT_PASS: npm run lint exits with code 0
- [ ] BUILD_PASS: npm run build exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **Ausgefüllt:** 2026-01-31

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
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | kanban-board.ts | Erweitern um Toggle im Header |
| Frontend | theme.css | Optionale Styles für Toggle-Animation |

**Kritische Integration Points:**
- CustomEvent 'auto-mode-toggle' muss von dashboard-view.ts gehandelt werden

---

### Technical Details

**WAS:**
- @state() Property `autoModeEnabled: boolean = false`
- Toggle-Element im kanban-header (nach Spec-Titel, vor Warning)
- CSS-Klasse für aktiven Zustand mit Puls-Animation
- CustomEvent 'auto-mode-toggle' bei Toggle-Änderung

**WIE (Architektur-Guidance ONLY):**
- Verwende nativen HTML `<input type="checkbox">` mit Custom Styling (kein externes UI-Framework)
- Verwende CSS Custom Properties aus theme.css für Farben
- Puls-Animation via `@keyframes pulse` in Komponente oder theme.css
- Dispatch CustomEvent mit `bubbles: true, composed: true`
- Toggle-Status ist transient (kein localStorage, kein Backend-Sync)

**WO:**
- `agent-os-ui/ui/src/components/kanban-board.ts` (Anpassen)
- `agent-os-ui/ui/src/styles/theme.css` (Optional, für Animation)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** Keine

**Geschätzte Komplexität:** S (ca. 50-80 LOC)

**Relevante Skills:**
- `frontend-lit` - Lit-State-Management und Event-Handling
- `quality-gates` - Accessibility-Checkliste

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "autoModeEnabled" agent-os-ui/ui/src/components/kanban-board.ts
grep -q "handleAutoModeToggle" agent-os-ui/ui/src/components/kanban-board.ts
grep -q "auto-mode-toggle" agent-os-ui/ui/src/components/kanban-board.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Toggle funktioniert manuell im Browser
