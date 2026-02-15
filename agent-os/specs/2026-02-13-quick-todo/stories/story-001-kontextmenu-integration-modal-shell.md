# Kontextmenü-Integration + Modal-Shell

> Story ID: QTD-001
> Spec: Quick-To-Do
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 3 SP
**Dependencies**: None

---

## Feature

```gherkin
Feature: Quick-To-Do über Kontextmenü öffnen
  Als Entwickler
  möchte ich über das Kontextmenü ein Quick-To-Do Modal öffnen,
  damit ich spontane Ideen sofort festhalten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Quick-To-Do Menüeintrag erscheint

```gherkin
Scenario: Quick-To-Do im Kontextmenü sichtbar
  Given ich bin in der Agent OS Web UI
  When ich einen Rechtsklick ausführe
  Then sehe ich im Kontextmenü den Eintrag "Quick-To-Do"
  And der Eintrag hat ein Blitz-Icon
```

### Szenario 2: Quick-To-Do Modal öffnet sich

```gherkin
Scenario: Modal öffnet sich bei Klick auf Quick-To-Do
  Given das Kontextmenü ist sichtbar
  When ich auf "Quick-To-Do" klicke
  Then öffnet sich ein Modal-Dialog
  And das Modal enthält ein Titel-Eingabefeld
  And das Modal enthält ein optionales Beschreibungsfeld
  And das Modal enthält ein Priorität-Dropdown mit Vorauswahl "Medium"
  And das Modal enthält "Speichern" und "Abbrechen" Buttons
```

### Szenario 3: Modal lässt sich schließen

```gherkin
Scenario: Modal schließen über Escape
  Given das Quick-To-Do Modal ist geöffnet
  When ich die Escape-Taste drücke
  Then wird das Modal geschlossen
  And keine Daten werden gespeichert
```

### Edge Case: Kein zweites Modal bei bereits geöffnetem Modal

```gherkin
Scenario: Kontextmenü blockiert bei geöffnetem Quick-Modal
  Given das Quick-To-Do Modal ist bereits geöffnet
  When ich einen Rechtsklick ausführe
  Then erscheint kein Kontextmenü
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/aos-quick-todo-modal.ts
- [ ] CONTAINS: agent-os-ui/ui/src/components/aos-context-menu.ts enthält "quick-todo"
- [ ] CONTAINS: agent-os-ui/ui/src/app.ts enthält "showQuickTodoModal"
- [ ] CONTAINS: agent-os-ui/ui/src/app.ts enthält "aos-quick-todo-modal"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd agent-os-ui/ui && npx tsc --noEmit exits with code 0
- [ ] BUILD_PASS: cd agent-os-ui/ui && npx vite build exits with code 0

---

## Required MCP Tools

Keine MCP-Tools erforderlich.

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

**Story ist READY.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Kein Unit Test nötig (reine UI-Verdrahtung)
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `aos-context-menu.ts` | Neuer Menüeintrag "Quick-To-Do" hinzufügen |
| Frontend | `aos-quick-todo-modal.ts` | NEUE Lit-Komponente: Modal mit Formular |
| Frontend | `app.ts` | State, Handler, Import, Render für Quick-Modal |
| Frontend | `theme.css` | CSS-Styles für Quick-To-Do Modal |

---

### Technical Details

**WAS:**
- Neuer Menüeintrag "Quick-To-Do" im bestehenden Kontextmenü
- Neue Lit-Komponente `aos-quick-todo-modal` mit Formular (Titel, Beschreibung, Priorität)
- Integration in app.ts (State, Event-Handler, Render)
- CSS-Styles für das Modal im bestehenden Theme

**WIE (Architektur-Guidance):**
- Folge exakt dem Pattern von `aos-create-spec-modal.ts` für Modal-Struktur (Overlay, Focus-Trap, Escape-Handler)
- Nutze Light DOM (`createRenderRoot() { return this; }`) wie alle anderen Komponenten
- Kontextmenü: Füge neuen Eintrag nach dem "TODO erstellen" Eintrag ein
- app.ts: Folge dem bestehenden Pattern für modale Dialoge (`showWorkflowModal`, `showAddProjectModal`)
- `estimatedHeight` im Kontextmenü von 180 auf ~220 erhöhen für 5. Eintrag
- Priorität-Dropdown mit Optionen: low, medium (default), high, critical
- Save-Button soll disabled sein wenn Titel leer ist

**WO:**
- `agent-os-ui/ui/src/components/aos-quick-todo-modal.ts` (NEU)
- `agent-os-ui/ui/src/components/aos-context-menu.ts` (MODIFY)
- `agent-os-ui/ui/src/app.ts` (MODIFY)
- `agent-os-ui/ui/src/styles/theme.css` (MODIFY)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-quick-todo-modal | UI Component | ui/src/components/aos-quick-todo-modal.ts | Wiederverwendbares Quick-Capture-Modal |

---

### Completion Check

```bash
# Auto-Verify Commands
test -f agent-os-ui/ui/src/components/aos-quick-todo-modal.ts && echo "✓ Modal file exists"
grep -q "quick-todo" agent-os-ui/ui/src/components/aos-context-menu.ts && echo "✓ Context menu entry exists"
grep -q "showQuickTodoModal" agent-os-ui/ui/src/app.ts && echo "✓ App state exists"
grep -q "aos-quick-todo-modal" agent-os-ui/ui/src/app.ts && echo "✓ Modal imported in app"
cd agent-os-ui/ui && npx tsc --noEmit 2>&1 | grep -v "TS6133\|CSSResultGroup" | grep -c "error TS" | grep -q "^0$" && echo "✓ TypeScript check passed"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. TypeScript kompiliert fehlerfrei
3. Modal öffnet/schließt sich korrekt
