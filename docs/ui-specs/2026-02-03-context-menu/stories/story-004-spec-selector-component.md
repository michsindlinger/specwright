# Spec Selector Component

> Story ID: CTX-004
> Spec: 2026-02-03-context-menu
> Created: 2026-02-03
> Last Updated: 2026-02-03

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Spec Selector Component
  Als Entwickler
  möchte ich eine Spec aus einer Liste auswählen können,
  damit ich eine Story zu einer bestehenden Spec hinzufügen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Spec-Liste wird angezeigt

```gherkin
Scenario: Spec-Liste wird angezeigt
  Given ich habe "Story zu Spec hinzufügen" ausgewählt
  Then sehe ich eine Liste aller verfügbaren Specs
  And jede Spec zeigt ihren Namen an
```

### Szenario 2: Suche filtert Specs

```gherkin
Scenario: Suche filtert Specs
  Given die Spec-Liste ist sichtbar
  And es gibt Specs "Context Menu", "Dashboard" und "Chat"
  When ich "menu" in das Suchfeld eingebe
  Then sehe ich nur "Context Menu" in der Liste
```

### Szenario 3: Spec auswählen

```gherkin
Scenario: Spec auswählen
  Given die Spec-Liste ist sichtbar
  When ich auf eine Spec klicke
  Then wird diese Spec ausgewählt
  And der add-story Workflow wird mit dieser Spec geöffnet
```

### Szenario 4: Loading-State während Laden

```gherkin
Scenario: Loading-State während Laden
  Given ich habe "Story zu Spec hinzufügen" ausgewählt
  When die Specs noch geladen werden
  Then sehe ich einen Loading-Indikator
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Keine Specs vorhanden
  Given es existieren keine Specs
  When ich "Story zu Spec hinzufügen" auswähle
  Then sehe ich den Hinweis "Keine Specs vorhanden"
  And ein Vorschlag "Erstelle zuerst eine Spec"
```

```gherkin
Scenario: Suche ohne Ergebnis
  Given die Spec-Liste ist sichtbar
  When ich "xyz123" in das Suchfeld eingebe
  Then sehe ich den Hinweis "Keine Specs gefunden"
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/aos-spec-selector.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/ui/src/components/aos-spec-selector.ts enthält "@customElement('aos-spec-selector')"
- [ ] CONTAINS: agent-os-ui/ui/src/components/aos-spec-selector.ts enthält "spec-selected"
- [ ] CONTAINS: agent-os-ui/ui/src/components/aos-spec-selector.ts enthält "specs.list"

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
| Frontend | aos-spec-selector.ts | Neue Komponente erstellen |
| Frontend | theme.css | Styles fuer .spec-selector |
| Frontend | gateway.ts | Nutzt bestehenden specs.list Message Type (keine Aenderung) |

**Kritische Integration Points:**
- aos-spec-selector → gateway (specs.list WebSocket Request/Response)

---

### Technical Details

**WAS:**
- Neue Lit Web Component `aos-spec-selector` erstellen
- Such-Input Feld mit Placeholder "Spec suchen..."
- Scrollbare Liste aller verfuegbaren Specs
- Client-seitige Filterung der Spec-Liste basierend auf Suchbegriff
- Loading State waehrend Specs geladen werden (aos-loading-spinner)
- Empty State: "Keine Specs vorhanden" mit Hinweis
- No Results State: "Keine Specs gefunden"
- Spec-Liste Caching (in Component State, optional in Service)
- Event: `spec-selected` mit ausgewaehlter Spec im Detail

**WIE (Architecture Guidance):**
- Pattern: Light DOM (createRenderRoot = this)
- Pattern: gateway.send({ type: 'specs.list' }) und gateway.on('specs.list.response', handler)
- Pattern: @state() fuer specs Array, filteredSpecs, searchTerm, isLoading
- Pattern: Computed Property fuer filteredSpecs basierend auf searchTerm
- Pattern: Event Dispatch mit bubbles: true, composed: true
- CSS: Suchfeld mit --color-bg-primary Background und --color-border Border
- CSS: Liste Items mit hover State (--color-bg-tertiary)
- CSS: Abwechselnde Hintergrundfarben mit :nth-child(even) Selector
- Keyboard: Enter auf Suchfeld selektiert erstes Ergebnis
- Keyboard: Arrow Keys fuer Navigation in Liste (optional, nice-to-have)

**WO:**
- Erstellen: `agent-os-ui/ui/src/components/aos-spec-selector.ts`
- Erweitern: `agent-os-ui/ui/src/styles/theme.css` (.spec-selector Styles)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** None (specs.list Backend-Handler existiert bereits)

**Geschätzte Komplexität:** S

**Relevante Skills:** frontend-ui-component-architecture

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-spec-selector | UI Component | agent-os-ui/ui/src/components/aos-spec-selector.ts | Spec-Auswahl mit Suchfunktion |

---

### Completion Check

```bash
# Verify component file exists
test -f agent-os-ui/ui/src/components/aos-spec-selector.ts && echo "OK: Component file exists" || echo "ERROR: Component file missing"

# Verify custom element decorator
grep -q "@customElement('aos-spec-selector')" agent-os-ui/ui/src/components/aos-spec-selector.ts && echo "OK: Custom element decorator found" || echo "ERROR: Custom element decorator missing"

# Verify spec-selected event dispatch
grep -q "spec-selected" agent-os-ui/ui/src/components/aos-spec-selector.ts && echo "OK: spec-selected event found" || echo "ERROR: spec-selected event missing"

# Verify specs.list gateway integration
grep -q "specs.list" agent-os-ui/ui/src/components/aos-spec-selector.ts && echo "OK: specs.list integration found" || echo "ERROR: specs.list integration missing"

# Verify Light DOM pattern
grep -q "createRenderRoot" agent-os-ui/ui/src/components/aos-spec-selector.ts && echo "OK: Light DOM pattern found" || echo "ERROR: Light DOM pattern missing"

# Verify CSS styles
grep -q ".spec-selector" agent-os-ui/ui/src/styles/theme.css && echo "OK: CSS styles found" || echo "ERROR: CSS styles missing"

# Lint check
cd agent-os-ui && npm run lint

# Build check
cd agent-os-ui && npm run build
```
