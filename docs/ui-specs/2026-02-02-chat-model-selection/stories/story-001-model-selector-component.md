# Model Selector UI Component

> Story ID: MODSEL-001
> Spec: chat-model-selection
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S (3 SP)
**Dependencies**: None
**Status**: Done

---

## Feature

```gherkin
Feature: Model Selector im Chat-Header
  Als Entwickler
  möchte ich das LLM-Model im Chat-Header auswählen können,
  damit ich je nach Aufgabe das passende Model nutzen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Model-Selector wird im Header angezeigt

```gherkin
Scenario: Model-Selector ist sichtbar im Chat-Header
  Given ich bin auf der Chat-Seite
  When die Seite geladen ist
  Then sehe ich einen Model-Selector neben dem Project-Selector
  And das aktuell ausgewählte Model wird angezeigt
```

### Szenario 2: Dropdown öffnet sich mit verfügbaren Models

```gherkin
Scenario: Dropdown zeigt alle verfügbaren Models gruppiert nach Provider
  Given ich bin auf der Chat-Seite
  When ich auf den Model-Selector klicke
  Then öffnet sich ein Dropdown-Menü
  And ich sehe die Anthropic-Modelle (Opus 4.5, Sonnet 4.5, Haiku 4.5)
  And ich sehe die GLM-Modelle (GLM 4.7, GLM 4.5 Air)
  And die Models sind nach Provider gruppiert
```

### Szenario 3: Model-Auswahl ändert das aktive Model

```gherkin
Scenario: Auswahl eines neuen Models aktualisiert die Anzeige
  Given das Dropdown ist geöffnet
  And aktuell ist "Opus 4.5" ausgewählt
  When ich "Sonnet 4.5" auswähle
  Then schließt sich das Dropdown
  And der Selector zeigt "Sonnet 4.5" an
  And das neue Model wird für die nächste Nachricht verwendet
```

### Szenario 4: Dropdown schließt bei Klick außerhalb

```gherkin
Scenario: Dropdown schließt automatisch bei Klick außerhalb
  Given das Model-Dropdown ist geöffnet
  When ich irgendwo außerhalb des Dropdowns klicke
  Then schließt sich das Dropdown
```

### Edge Case: Default-Model bei erstem Laden

```gherkin
Scenario: Standardmäßig ist Opus 4.5 ausgewählt
  Given ich öffne den Chat zum ersten Mal in dieser Session
  When die Seite geladen ist
  Then ist "Opus 4.5" als Default-Model ausgewählt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/model-selector.ts
- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/index.ts (must export model-selector)

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/ui/src/components/model-selector.ts enthält "@customElement('aos-model-selector')"
- [ ] CONTAINS: agent-os-ui/ui/src/components/model-selector.ts enthält "extends LitElement"
- [ ] CONTAINS: agent-os-ui/ui/src/components/model-selector.ts enthält "gateway.send"
- [ ] CONTAINS: agent-os-ui/ui/src/app.ts enthält "<aos-model-selector>"
- [ ] CONTAINS: agent-os-ui/ui/src/styles/theme.css enthält "aos-model-selector"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd agent-os-ui && npm run lint
- [ ] BUILD_PASS: cd agent-os-ui && npm run build

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **⚠️ WICHTIG:** Dieser Abschnitt wird vom Architect ausgefüllt

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
| Frontend | model-selector.ts | Neue Komponente erstellen |
| Frontend | app.ts | Model-Selector in Header einfügen |
| Frontend | theme.css | Styling für Model-Selector |

**Kritische Integration Points:**
- aos-model-selector → gateway.ts (Event-basierte Kommunikation)

---

### Technical Details

**WAS:**
- Neue Lit Web Component `aos-model-selector` mit Dropdown-Funktionalität
- Provider-gruppierte Model-Liste (Anthropic: Opus 4.5, Sonnet 4.5, Haiku 4.5 / GLM: GLM 4.7, GLM 4.5 Air)
- Light DOM mode (wie `project-selector.ts`)
- Custom Event `model-changed` mit `detail: { providerId, modelId }`

**WIE (Architektur-Guidance ONLY):**
- Folge exakt das Pattern von `project-selector.ts`:
  - Light DOM via `createRenderRoot() { return this; }`
  - `handleOutsideClick` Pattern
  - Gateway-Events mit `gateway.send()`
  - `@state()` für `isOpen`, `selectedModel`, `isLoading`
- Nutze CSS Custom Properties aus theme.css
- Dropdown-Struktur wie in project-selector.ts
- ARIA-Attribute: `aria-expanded`, `aria-haspopup="listbox"`, `role="option"`

**WO:**
- `agent-os-ui/ui/src/components/model-selector.ts` (NEU, ~150 LOC)
- `agent-os-ui/ui/src/app.ts` (MODIFY, +1 Zeile bei header-actions)
- `agent-os-ui/ui/src/styles/theme.css` (MODIFY, +40-60 LOC CSS)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/skills/frontend-lit.md | Lit Web Components patterns, state management |
| domain-agent-os-web-ui | agent-os/skills/domain-agent-os-web-ui.md | Chat interaction patterns |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f agent-os-ui/ui/src/components/model-selector.ts && echo "✓ model-selector.ts exists"
grep -q "@customElement('aos-model-selector')" agent-os-ui/ui/src/components/model-selector.ts && echo "✓ Custom element defined"
grep -q "<aos-model-selector>" agent-os-ui/ui/src/app.ts && echo "✓ Component used in app"
grep -q "aos-model-selector" agent-os-ui/ui/src/styles/theme.css && echo "✓ Styling exists"
cd agent-os-ui && npm run lint && echo "✓ Lint passed"
cd agent-os-ui && npm run build && echo "✓ Build passed"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
