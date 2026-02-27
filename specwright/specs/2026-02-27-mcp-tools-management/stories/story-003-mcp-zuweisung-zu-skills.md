# MCP-Zuweisung zu Skills

> Story ID: MCP-003
> Spec: MCP Tools Management
> Created: 2026-02-27
> Last Updated: 2026-02-27

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: MCP-001, MCP-002

---

## Feature

```gherkin
Feature: MCP-Tools ueber Checkboxen Skills zuweisen
  Als Tech Lead
  moechte ich MCP-Tools einzelnen Skills zuweisen koennen,
  damit klar definiert ist welche Agents welche externen Tools nutzen.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: MCP-Checkboxen im Edit-Modal

```gherkin
Scenario: Anzeige der MCP-Tool-Checkboxen beim Bearbeiten eines Skills
  Given das Projekt hat 3 MCP-Server konfiguriert
  And ich oeffne das Edit-Modal fuer einen Skill
  When das Modal geladen ist
  Then sehe ich eine Sektion "MCP Tools" mit 3 Checkboxen
  And jede Checkbox zeigt den Namen des MCP-Servers
```

### Szenario 2: MCP-Tools zuweisen und speichern

```gherkin
Scenario: Erfolgreiche Zuweisung von MCP-Tools
  Given ich bin im Edit-Modal eines Skills
  And ich sehe 3 MCP-Tool-Checkboxen
  When ich "perplexity" und "context7" anwaehle
  And ich den Skill speichere
  Then werden die MCP-Tools "perplexity" und "context7" im Frontmatter der SKILL.md gespeichert
```

### Szenario 3: Bestehende MCP-Zuweisung anzeigen

```gherkin
Scenario: Vorhandene MCP-Zuweisungen werden im Edit-Modal angezeigt
  Given ein Skill hat bereits mcpTools: [perplexity] im Frontmatter
  When ich das Edit-Modal oeffne
  Then ist die Checkbox fuer "perplexity" bereits angewaehlt
  And die anderen Checkboxen sind nicht angewaehlt
```

### Szenario 4: MCP-Badges in Team-Card

```gherkin
Scenario: Anzeige zugewiesener MCP-Tools in der Team-Card
  Given ein Skill hat mcpTools: [perplexity, playwright] zugewiesen
  When ich die Team-View sehe
  Then zeigt die Skill-Karte 2 MCP-Tool-Badges
  And die Badges zeigen "perplexity" und "playwright"
```

### Szenario 5: MCP-Tools im Detail-Modal

```gherkin
Scenario: Anzeige zugewiesener MCP-Tools im Detail-Modal
  Given ein Skill hat mcpTools: [context7] zugewiesen
  When ich das Detail-Modal oeffne
  Then sehe ich eine MCP-Tools-Sektion mit "context7"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Keine MCP-Server im Projekt
  Given das Projekt hat keine MCP-Server konfiguriert
  When ich das Edit-Modal oeffne
  Then wird die MCP-Tools-Sektion nicht angezeigt
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Pruefungen

- [ ] CONTAINS: ui/frontend/src/components/team/aos-team-edit-modal.ts enthaelt "mcpTools"
- [ ] CONTAINS: ui/frontend/src/components/team/aos-team-card.ts enthaelt "mcpTools"
- [ ] CONTAINS: ui/frontend/src/components/team/aos-team-detail-modal.ts enthaelt "mcpTools"

### Funktions-Pruefungen

- [ ] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0

---

## Required MCP Tools

Keine MCP-Tools erforderlich.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und pruefbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (keine erforderlich)
- [x] Story ist angemessen geschaetzt (4 Dateien, ~300 LOC)

#### Full-Stack Konsistenz
- [x] **Alle betroffenen Layer identifiziert** (Frontend-only)
- [x] **Integration Type bestimmt** (Frontend-only)
- [x] **Kritische Integration Points dokumentiert** (Edit-Modal -> PUT API, team-view -> Card/Modal Props)
- [x] **Handover-Dokumente definiert** (n/a - nutzt API Contract aus MCP-001)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] MCP-Checkboxen im Edit-Modal funktional
- [ ] MCP-Badges in Team-Card angezeigt
- [ ] MCP-Tools im Detail-Modal angezeigt

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Frontend Build erfolgreich

#### Integration
- [ ] **Integration hergestellt: aos-team-edit-modal -> PUT API mit mcpTools**
  - [ ] mcpTools-Array wird im Save-Request mitgesendet
  - [ ] Bestehende Checkboxen spiegeln aktuelle mcpTools wider
- [ ] **Integration hergestellt: team-view -> aos-team-card (availableMcpTools)**
  - [ ] Property wird von team-view an Cards weitergereicht
- [ ] **Integration hergestellt: team-view -> aos-team-edit-modal (availableMcpTools)**
  - [ ] Property wird von team-view an Edit-Modal weitergereicht

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | aos-team-edit-modal.ts | Checkbox-Sektion fuer MCP-Tool-Zuweisung, mcpTools im Save-Request |
| Frontend | aos-team-card.ts | MCP-Tool-Badges im Footer |
| Frontend | aos-team-detail-modal.ts | MCP-Tools-Anzeige im Detail |
| Frontend | theme.css | CSS fuer MCP-Badges und Checkbox-Sektion |

**Kritische Integration Points:**
- aos-team-edit-modal -> PUT API mit mcpTools-Feld
- team-view.ts -> aos-team-card (availableMcpTools Property)
- team-view.ts -> aos-team-edit-modal (availableMcpTools Property)

---

### Technical Details

**WAS:**
1. Erweiterung `aos-team-edit-modal.ts`: Neue Sektion "MCP Tools" mit Checkboxen VOR dem CodeMirror-Editor. Zeigt alle verfuegbaren MCP-Server als Checkboxen. Beim Speichern wird das `mcpTools`-Array als separates Feld im PUT-Request mitgesendet (nicht im Content).
2. Erweiterung `aos-team-card.ts`: MCP-Tool-Badges im Footer der Card anzeigen (analog zu Learnings-Count). Badges zeigen die Namen der zugewiesenen MCP-Tools.
3. Erweiterung `aos-team-detail-modal.ts`: Neue Sektion "MCP Tools" im Detail-Modal die zugewiesene Tools auflistet.
4. Erweiterung `theme.css`: CSS fuer MCP-Tool-Badges (kompakte Pills) und Checkbox-Sektion im Edit-Modal.

**WIE (Architektur-Guidance ONLY):**
- `aos-team-edit-modal.ts`:
  - Neue Property `availableMcpTools: string[]` (von team-view.ts per Property-Binding uebergeben)
  - Neue State-Variable `selectedMcpTools: string[]` (initialisiert aus `skillDetail.mcpTools`)
  - Checkbox-Sektion wird NUR angezeigt wenn `availableMcpTools.length > 0`
  - Checkboxen rendern: Fuer jeden verfuegbaren MCP-Server eine Checkbox, vorausgewaehlt wenn in `skillDetail.mcpTools` enthalten
  - Save-Logik: PUT-Body erweitern von `{ content }` zu `{ content, mcpTools: this.selectedMcpTools }`. Der Server (MCP-001) uebernimmt das Frontmatter-Schreiben.
- `aos-team-card.ts`:
  - Nutzt `skill.mcpTools` aus `SkillSummary` (kommt bereits vom Backend via MCP-001)
  - Badges im Footer rendern, neben dem bestehenden Learnings-Count
  - Badge-Styling: Kompakte Pills mit eigenem Farbschema (z.B. Teal/Cyan fuer MCP-Tools)
- `aos-team-detail-modal.ts`:
  - Nutzt `skillDetail.mcpTools` fuer die Anzeige
  - Neue Sektion nach der Tab-Navigation oder im Skill-Tab-Content
- `team-view.ts`: Muss die in MCP-002 geladenen MCP-Server-Namen als `availableMcpTools`-Property an `aos-team-card`, `aos-team-edit-modal` und `aos-team-detail-modal` weiterreichen
- **WICHTIG:** Das Edit-Modal manipuliert den SKILL.md-Content NICHT direkt fuer mcpTools. Es sendet mcpTools als separates Feld im PUT-Request. Der Server (MCP-001) fuegt mcpTools korrekt ins Frontmatter ein.

**WO:**
- `ui/frontend/src/components/team/aos-team-edit-modal.ts` - Checkbox-Sektion + Save-Logik
- `ui/frontend/src/components/team/aos-team-card.ts` - MCP-Badges im Footer
- `ui/frontend/src/components/team/aos-team-detail-modal.ts` - MCP-Tools Anzeige
- `ui/frontend/src/styles/theme.css` - CSS fuer MCP-Badges und Checkbox-Sektion

**Abhaengigkeiten:** MCP-001 (Backend API), MCP-002 (MCP-Daten in team-view State)

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns, Property Binding, Event Handling |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Team-Modal-Architektur und bestehende Edit-Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
grep -q "mcpTools" ui/frontend/src/components/team/aos-team-edit-modal.ts
grep -q "mcpTools" ui/frontend/src/components/team/aos-team-card.ts
grep -q "mcpTools" ui/frontend/src/components/team/aos-team-detail-modal.ts
cd ui/frontend && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
