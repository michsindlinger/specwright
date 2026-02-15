# Context Menu Component

> Story ID: CTX-001
> Spec: 2026-02-03-context-menu
> Created: 2026-02-03
> Last Updated: 2026-02-03
> **Status**: Done

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Context Menu Component
  Als Entwickler
  möchte ich ein Rechtsklick-Menü mit Workflow-Aktionen sehen,
  damit ich schnell auf häufig genutzte Funktionen zugreifen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Context Menu erscheint bei Rechtsklick

```gherkin
Scenario: Context Menu erscheint bei Rechtsklick
  Given ich bin in der Agent OS Web UI
  When ich mit der rechten Maustaste klicke
  Then sehe ich ein Context Menu an der Mausposition
  And das Menu enthält 4 Einträge
```

### Szenario 2: Menüpunkte sind korrekt beschriftet

```gherkin
Scenario: Menüpunkte sind korrekt beschriftet
  Given das Context Menu ist sichtbar
  Then sehe ich den Eintrag "Neue Spec erstellen"
  And sehe ich den Eintrag "Bug erstellen"
  And sehe ich den Eintrag "TODO erstellen"
  And sehe ich den Eintrag "Story zu Spec hinzufügen"
```

### Szenario 3: Menu schließt bei Klick außerhalb

```gherkin
Scenario: Menu schließt bei Klick außerhalb
  Given das Context Menu ist sichtbar
  When ich außerhalb des Menus klicke
  Then verschwindet das Context Menu
```

### Szenario 4: Menu schließt bei ESC-Taste

```gherkin
Scenario: Menu schließt bei ESC-Taste
  Given das Context Menu ist sichtbar
  When ich die ESC-Taste drücke
  Then verschwindet das Context Menu
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Menu bleibt im sichtbaren Bereich
  Given ich bin am rechten Rand des Fensters
  When ich rechtsklicke
  Then erscheint das Context Menu vollständig sichtbar
  And es wird nicht außerhalb des Viewports angezeigt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/aos-context-menu.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/ui/src/components/aos-context-menu.ts enthält "@customElement('aos-context-menu')"
- [ ] CONTAINS: agent-os-ui/ui/src/components/aos-context-menu.ts enthält "menu-item-select"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd agent-os-ui && npm run lint
- [ ] BUILD_PASS: cd agent-os-ui && npm run build

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
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests geschrieben und bestanden
- [ ] Code Review durchgeführt
- [ ] Keine Linting Errors

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-context-menu.ts | Neue Komponente erstellen |
| Frontend | theme.css | Styles für Context Menu |

---

### Technical Details

**WAS:**
- Neue Lit Web Component `aos-context-menu` erstellen
- 4 Menüpunkte: "Neue Spec erstellen", "Bug erstellen", "TODO erstellen", "Story zu Spec hinzufügen"
- Positionierungslogik für Menu an Mauskoordinaten
- Keyboard Support (ESC zum Schließen)
- Outside-Click Handler zum Schließen
- Viewport-Boundary Check (Menu bleibt im sichtbaren Bereich)
- Custom Event `menu-item-select` mit Action-Type im Detail

**WIE (Architecture Guidance):**
- Pattern: Light DOM (createRenderRoot = this) wie in aos-create-spec-modal.ts
- Pattern: Event Dispatch mit bubbles: true, composed: true wie in workflow-card.ts
- Pattern: Conditional Rendering mit Lit html`` Template
- CSS: Nutze CSS Custom Properties aus theme.css (--color-bg-secondary, --color-border, etc.)
- z-index: 1000 für Context Menu (unter Modals mit 1001)
- Animation: fade-in konsistent mit lightbox-fade-in in theme.css
- Positionierung: Absolute Positioning mit top/left aus Mouse Event
- Viewport Check: getBoundingClientRect() für Menu-Dimensionen, window.innerWidth/Height für Viewport

**WO:**
- Erstellen: `agent-os-ui/ui/src/components/aos-context-menu.ts`
- Erweitern: `agent-os-ui/ui/src/styles/theme.css` (Context Menu Styles)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

**Relevante Skills:** frontend-ui-component-architecture

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-context-menu | UI Component | agent-os-ui/ui/src/components/aos-context-menu.ts | Wiederverwendbares Context Menu |

---

### Completion Check

```bash
# Verify component file exists
test -f agent-os-ui/ui/src/components/aos-context-menu.ts && echo "OK: Component file exists" || echo "ERROR: Component file missing"

# Verify custom element decorator
grep -q "@customElement('aos-context-menu')" agent-os-ui/ui/src/components/aos-context-menu.ts && echo "OK: Custom element decorator found" || echo "ERROR: Custom element decorator missing"

# Verify event dispatch
grep -q "menu-item-select" agent-os-ui/ui/src/components/aos-context-menu.ts && echo "OK: Event dispatch found" || echo "ERROR: Event dispatch missing"

# Verify Light DOM pattern
grep -q "createRenderRoot" agent-os-ui/ui/src/components/aos-context-menu.ts && echo "OK: Light DOM pattern found" || echo "ERROR: Light DOM pattern missing"

# Verify CSS styles added
grep -q ".context-menu" agent-os-ui/ui/src/styles/theme.css && echo "OK: CSS styles found" || echo "ERROR: CSS styles missing"

# Lint check
cd agent-os-ui && npm run lint

# Build check
cd agent-os-ui && npm run build
```
