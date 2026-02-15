# Error Handling Modal

> Story ID: KAE-004
> Spec: kanban-auto-execution
> Created: 2026-01-31
> Last Updated: 2026-01-31

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: KAE-001, KAE-002
**Status**: Done

---

## Feature

```gherkin
Feature: Error Handling Modal für Auto-Mode
  Als Entwickler
  möchte ich bei Fehlern während des Auto-Mode einen Modal Dialog sehen,
  damit ich den Fehler verstehen und entscheiden kann ob ich fortfahren möchte.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Error Modal erscheint bei Fehler

```gherkin
Scenario: Modal erscheint bei Story-Execution Fehler
  Given der Auto-Mode ist aktiviert
  And Story "KAE-002" wird gerade ausgeführt
  When ein Fehler bei der Ausführung auftritt
  Then pausiert der Auto-Mode automatisch
  And ein Modal Dialog erscheint
  And der Modal zeigt die Fehlerbeschreibung
  And der Modal zeigt die betroffene Story (KAE-002)
```

### Szenario 2: Resume Button funktioniert

```gherkin
Scenario: Auto-Mode fortsetzen nach Fehler
  Given der Error Modal ist geöffnet
  And ich habe den Fehler extern behoben
  When ich auf "Resume" klicke
  Then schließt sich der Modal
  And der Auto-Mode wird fortgesetzt
  And die nächste ready Story wird gestartet
```

### Szenario 3: Stop Button funktioniert

```gherkin
Scenario: Auto-Mode stoppen bei Fehler
  Given der Error Modal ist geöffnet
  When ich auf "Stop" klicke
  Then schließt sich der Modal
  And der Auto-Mode wird deaktiviert
  And der Toggle zeigt "aus"
```

### Szenario 4: Modal Inhalt

```gherkin
Scenario: Error Modal zeigt alle relevanten Informationen
  Given ein Fehler ist aufgetreten während Story "KAE-002" in Phase 3
  When der Error Modal angezeigt wird
  Then sehe ich den Titel "Auto-Mode Fehler"
  And ich sehe die Fehlermeldung (z.B. "Lint Fehler in story-002.ts")
  And ich sehe "Story: KAE-002 - Auto-Execution Engine"
  And ich sehe "Phase: 3/5"
  And ich sehe zwei Buttons: "Resume" und "Stop"
```

### Szenario 5: Modal ist nicht blockierend für UI

```gherkin
Scenario: Kanban Board bleibt interaktiv während Modal offen
  Given der Error Modal ist geöffnet
  When ich außerhalb des Modals klicke
  Then bleibt der Modal offen (kein Schließen durch Outside-Click)
  And ich kann das Kanban Board nicht interagieren (Modal blockiert)
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Keine ready Stories nach Resume
  Given der Error Modal ist geöffnet
  And alle anderen Stories sind blockiert oder done
  When ich auf "Resume" klicke
  Then schließt sich der Modal
  And der Auto-Mode bleibt aktiv
  And es wird gewartet bis eine Story ready wird
```

```gherkin
Scenario: Modal bei "Keine ausführbaren Stories"
  Given der Auto-Mode ist aktiviert
  And alle Stories sind blockiert (Dependencies nicht erfüllt)
  When das System keine ausführbare Story findet
  Then erscheint ein Info-Modal (nicht Error-Modal)
  And der Modal zeigt "Keine ausführbaren Stories"
  And der Modal zeigt nur einen "OK" Button
  And der Auto-Mode bleibt aktiv (wartet)
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/auto-mode-error-modal.ts (Neu)
- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/kanban-board.ts enthält Modal-Integration

### Inhalt-Prüfungen

- [ ] CONTAINS: auto-mode-error-modal.ts enthält "@customElement('aos-auto-mode-error-modal')"
- [ ] CONTAINS: auto-mode-error-modal.ts enthält "Resume" Button Handler
- [ ] CONTAINS: auto-mode-error-modal.ts enthält "Stop" Button Handler
- [ ] CONTAINS: kanban-board.ts enthält "aos-auto-mode-error-modal"

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
| Frontend | auto-mode-error-modal.ts | Neu erstellen |
| Frontend | kanban-board.ts | Modal-Integration |
| Frontend | dashboard-view.ts | Event-Handler für Resume/Stop |

**Kritische Integration Points:**
- Modal muss CustomEvents `auto-mode-resume` und `auto-mode-stop` dispatchen
- dashboard-view.ts muss diese Events handeln und Auto-Mode State anpassen

---

### Technical Details

**WAS:**
- Neue Lit-Komponente `aos-auto-mode-error-modal`
- Interface `AutoModeError { message: string; storyId: string; storyTitle: string; phase: number }`
- @property() `open: boolean`, `error: AutoModeError | null`
- Zwei Buttons: "Resume" und "Stop"
- Modal Backdrop (Semi-transparent Overlay)

**WIE (Architektur-Guidance ONLY):**
- Lit Web Component mit `@customElement('aos-auto-mode-error-modal')`
- Modal-Pattern wie git-strategy-dialog.ts (als Referenz)
- Backdrop: `position: fixed; inset: 0; background: rgba(0,0,0,0.5)`
- Modal Box: `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)`
- CustomEvents mit `bubbles: true, composed: true`:
  - `auto-mode-resume`: User will fortfahren
  - `auto-mode-stop`: User will Auto-Mode beenden
- Kein Outside-Click-to-Close (User muss explizit wählen)
- Keyboard: Escape = Stop, Enter = Resume

**WO:**
- `agent-os-ui/ui/src/components/auto-mode-error-modal.ts` (Neu)
- `agent-os-ui/ui/src/components/kanban-board.ts` (Anpassen - Integration)
- `agent-os-ui/ui/src/views/dashboard-view.ts` (Anpassen - Event Handler)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** KAE-001 (Toggle), KAE-002 (Engine)

**Geschätzte Komplexität:** S (ca. 100-120 LOC)

**Relevante Skills:**
- `frontend-lit` - Modal Pattern, Event Handling
- `quality-gates` - Accessibility (Focus Management, Keyboard)

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f agent-os-ui/ui/src/components/auto-mode-error-modal.ts && echo "Modal component exists"
grep -q "@customElement('aos-auto-mode-error-modal')" agent-os-ui/ui/src/components/auto-mode-error-modal.ts
grep -q "auto-mode-resume\|handleResume" agent-os-ui/ui/src/components/auto-mode-error-modal.ts
grep -q "auto-mode-stop\|handleStop" agent-os-ui/ui/src/components/auto-mode-error-modal.ts
grep -q "aos-auto-mode-error-modal" agent-os-ui/ui/src/components/kanban-board.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Modal erscheint bei Fehler (manueller Test)
3. Resume startet nächste Story
4. Stop deaktiviert Auto-Mode
5. Keyboard Navigation funktioniert (Escape/Enter)
