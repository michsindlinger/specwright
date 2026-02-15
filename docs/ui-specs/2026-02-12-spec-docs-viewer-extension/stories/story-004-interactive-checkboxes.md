# Frontend - Interaktive Checkboxen mit Persistierung

> Story ID: SDVE-004
> Spec: Spec Docs Viewer Extension
> Created: 2026-02-12
> Last Updated: 2026-02-12

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: S (2 SP)
**Dependencies**: SDVE-003

**Integration:** aos-docs-viewer.ts → kanban-board.ts (checkbox-toggled Event)

---

## Feature

```gherkin
Feature: Interaktive Markdown-Checkboxen
  Als Entwickler
  möchte ich Checkboxen in Markdown-Dokumenten direkt im Viewer anklicken können und die Änderung automatisch speichern,
  damit ich User-Todos und Checklisten effizient direkt im UI abhaken kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Checkbox anklicken und speichern

```gherkin
Scenario: Offene Checkbox abhaken
  Given ich betrachte "user-todos.md" mit einer Liste von 5 offenen Checkboxen
  When ich die dritte Checkbox anklicke
  Then wird die Checkbox als abgehakt dargestellt
  And die Änderung wird sofort in der Datei gespeichert
  And die Markdown-Datei enthält "- [x]" an der dritten Checkbox-Position
```

### Szenario 2: Checkbox wieder öffnen

```gherkin
Scenario: Abgehakte Checkbox wieder öffnen
  Given ich betrachte ein Dokument mit einer abgehakten Checkbox
  When ich die abgehakte Checkbox anklicke
  Then wird die Checkbox als offen dargestellt
  And die Datei enthält "- [ ]" an dieser Position
```

### Szenario 3: Mehrere Checkboxen in verschiedenen Abschnitten

```gherkin
Scenario: Checkboxen in verschiedenen Dokumentabschnitten
  Given ein Dokument hat Checkboxen in der Überschrift "Pre-Deploy" und "Post-Deploy"
  When ich eine Checkbox im Abschnitt "Post-Deploy" anklicke
  Then wird nur diese spezifische Checkbox geändert
  And alle anderen Checkboxen bleiben unverändert
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Checkbox in Code-Block bleibt nicht-interaktiv
  Given ein Dokument enthält "- [ ] Todo" sowohl im Fließtext als auch in einem Code-Block
  When das Dokument gerendert wird
  Then ist die Checkbox im Fließtext anklickbar
  And die Checkbox im Code-Block ist nicht anklickbar
```

```gherkin
Scenario: Speicherfehler bei Checkbox-Toggle
  Given ich klicke eine Checkbox an
  And das Speichern schlägt fehl (z.B. Dateisystem-Fehler)
  Then wird die Checkbox visuell zurückgesetzt
  And ich sehe eine Fehlermeldung
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: `agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts` (erweitert)
- [ ] FILE_EXISTS: `agent-os-ui/ui/src/components/kanban-board.ts` (erweitert)

### Inhalt-Prüfungen

- [ ] CONTAINS: `agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts` enthält `checkbox-toggled`
- [ ] CONTAINS: `agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts` enthält `data-checkbox-index`
- [ ] CONTAINS: `agent-os-ui/ui/src/components/kanban-board.ts` enthält `checkbox-toggled`

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui/ui && npx tsc --noEmit`
- [ ] BUILD_PASS: `cd agent-os-ui/ui && npx tsc --noEmit`

---

## Required MCP Tools

_No MCP tools required for this story._

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
- [x] **Alle betroffenen Layer identifiziert** - Frontend-only (aos-docs-viewer.ts + kanban-board.ts), Persistierung ueber bestehenden `specs.save` aus SDVE-003
- [x] **Integration Type bestimmt** - Frontend-only (nutzt bestehende Save-Infrastruktur aus SDVE-003)
- [x] **Kritische Integration Points dokumentiert** - `aos-docs-viewer.ts` emittiert `checkbox-toggled` Event mit aktualisiertem Content; `kanban-board.ts` faengt Event und triggert `specs.save` ueber bestehenden Mechanismus
- [x] **Handover-Dokumente definiert** - Event-Interface: `checkbox-toggled` Custom Event mit `{ content: string }` detail (aktualisierter raw Markdown)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Checkboxen in Code-Blocks (fenced) bleiben nicht-interaktiv

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [ ] TypeScript kompiliert fehlerfrei (`npx tsc --noEmit`)
- [ ] Checkbox-Toggle aktualisiert den richtigen `- [ ]` / `- [x]` Pattern im Markdown
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `aos-docs-viewer.ts` (marked Renderer) | `marked.use()` um Custom Checkbox-Renderer erweitern: nicht-disabled `<input type="checkbox">` mit `data-checkbox-index="N"` Attribut |
| Frontend | `aos-docs-viewer.ts` (Event Handling) | Click Event Delegation auf dem Viewer-Content div fuer Checkbox-Inputs; Toggle-Logik fuer Raw-Markdown; `checkbox-toggled` Event Emission |
| Frontend | `kanban-board.ts` (Event Handler) | Neuer `handleCheckboxToggled` Handler der `checkbox-toggled` Event faengt, `specViewerContent` aktualisiert und `specs.save` triggert |

---

### Technical Details

**WAS:**
- Erweiterung des `marked` Custom Renderers in `aos-docs-viewer.ts` um einen `checkbox` Override der interaktive (nicht-disabled) Checkbox-Inputs mit `data-checkbox-index` Attribut ausgibt
- Click Event Delegation auf dem `viewer-content` div fuer `input[type=checkbox][data-checkbox-index]` Clicks
- Private Toggle-Methode die den N-ten Checkbox-Pattern (`- [ ]` oder `- [x]`) im Raw-Markdown findet und togglet (Code-Blocks ueberspringend)
- `checkbox-toggled` Custom Event Emission mit aktualisiertem Markdown-Content
- Neuer Event Handler `handleCheckboxToggled` in `kanban-board.ts` der den Content aktualisiert und speichert

**WIE (Architektur-Guidance ONLY):**
- `marked` Custom Renderer Extension: Zum bestehenden `marked.use({ renderer, gfm: true, breaks: false })` Aufruf in `aos-docs-viewer.ts` (Zeile 19) einen `checkbox` Renderer hinzufuegen. Der Renderer gibt `<input type="checkbox" data-checkbox-index="N" checked>` (oder ohne `checked`) aus, NICHT disabled
- Checkbox-Index-Zaehlung muss einen globalen Counter verwenden der pro `renderMarkdown()` Aufruf zurueckgesetzt wird - entweder als `marked.use()` Extension State oder als Instanzvariable
- Da `aos-docs-viewer` Light DOM nutzt (`createRenderRoot() { return this; }`, Zeile 186), funktioniert Event Delegation natuerlich - Click Listener auf dem `viewer-content` Element registrieren
- Toggle-Logik: Im Raw-Markdown den N-ten Checkbox-Pattern finden. WICHTIG: Fenced Code Blocks (Zeilen zwischen ``` Markierungen) muessen uebersprungen werden. Pattern: Zeile-fuer-Zeile durchgehen, Code-Block-Status tracken, nur Zeilen ausserhalb von Code-Blocks zaehlen
- Event-Propagation: `checkbox-toggled` Event mit `{ content: updatedMarkdown }` detail emittieren, `bubbles: true`, `composed: true`
- In `kanban-board.ts`: Event Handler auf dem `<aos-docs-viewer>` Element registrieren (`@checkbox-toggled=${this.handleCheckboxToggled}`), dort `specViewerContent` aktualisieren und `specs.save` mit `relativePath` aufrufen (nutzt den in SDVE-003 etablierten Save-Mechanismus)
- Fehlerbehandlung: Bei Save-Fehler die Checkbox visuell zuruecksetzen (re-render mit altem Content)

**WO:**
- `agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts` - Checkbox Renderer Override, Click Handler, Toggle-Logik
- `agent-os-ui/ui/src/components/kanban-board.ts` - `handleCheckboxToggled` Event Handler, Event-Binding im Template

**WER:** codebase-analyzer

**Abhängigkeiten:** SDVE-003 (benoetigt den generalisierten Save-Mechanismus mit `relativePath`)

**Geschätzte Komplexität:** S

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artifact | Typ | Genutzt von |
|----------|-----|-------------|
| Interaktiver Checkbox-Renderer in `aos-docs-viewer` | marked Extension | Alle zukuenftigen Markdown-Views die `aos-docs-viewer` nutzen |
| Checkbox-Toggle-Logik (Raw-Markdown Pattern-Matching) | Private Methode | Wiederverwendbar fuer andere Markdown-Inline-Editing Features |

---

### Relevante Skills

- ui-component-architecture (Erweiterung bestehender Lit Component)
- state-management (Event-basierte Content-Aktualisierung und Persistierung)

---

### Completion Check

```bash
# 1. TypeScript Frontend compilation
cd agent-os-ui/ui && npx tsc --noEmit

# 2. Verify checkbox renderer in docs-viewer
grep -n "data-checkbox-index" agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts

# 3. Verify checkbox-toggled event emission
grep -n "checkbox-toggled" agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts

# 4. Verify checkbox handler in kanban-board
grep -n "checkbox-toggled\|handleCheckboxToggled" agent-os-ui/ui/src/components/kanban-board.ts

# 5. Verify code block skip logic exists
grep -n "code.block\|fenced\|\`\`\`" agent-os-ui/ui/src/components/docs/aos-docs-viewer.ts
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt Aenderungen in `aos-docs-viewer.ts` und `kanban-board.ts`
4. Checkboxen in Code-Blocks sind NICHT interaktiv
