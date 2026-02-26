# Edit-Funktionalität - Markdown-Editor Modal

> Story ID: CTM-004
> Spec: Custom Team Members
> Created: 2026-02-26
> Last Updated: 2026-02-26

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: CTM-001, CTM-003

---

## Feature

```gherkin
Feature: Skill-Bearbeitung im Markdown-Editor
  Als Specwright-Nutzer
  möchte ich die SKILL.md eines Teammitglieds direkt im Browser bearbeiten,
  damit ich Anpassungen schnell vornehmen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Edit-Modal öffnen

```gherkin
Scenario: Bearbeiten eines Skills über die Team-Karte
  Given ich bin auf der Team-Seite
  And ich sehe einen Custom-Skill "Steuerberater"
  When ich auf den Edit-Button der Karte klicke
  Then öffnet sich ein Edit-Modal
  And der Markdown-Inhalt der SKILL.md wird im Editor angezeigt
```

### Szenario 2: Änderungen speichern

```gherkin
Scenario: Speichern von Änderungen im Editor
  Given das Edit-Modal ist geöffnet
  And ich habe den Markdown-Inhalt bearbeitet
  When ich auf "Speichern" klicke
  Then wird die SKILL.md mit dem neuen Inhalt überschrieben
  And das Modal schließt sich
  And die Team-Karte zeigt die aktualisierten Informationen
```

### Szenario 3: Edit aus Detail-Modal

```gherkin
Scenario: Bearbeiten über den Edit-Button im Detail-Modal
  Given ich betrachte die Detail-Ansicht eines Skills
  When ich auf den Edit-Button im Detail-Modal klicke
  Then öffnet sich das Edit-Modal mit dem Skill-Inhalt
```

### Edge Case: Abbrechen ohne Speichern

```gherkin
Scenario: Abbrechen der Bearbeitung
  Given das Edit-Modal ist geöffnet
  And ich habe Änderungen vorgenommen
  When ich auf "Abbrechen" klicke oder Escape drücke
  Then schließt sich das Modal
  And keine Änderungen werden gespeichert
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: `ui/frontend/src/components/team/aos-team-edit-modal.ts`
- [x] CONTAINS: `ui/frontend/src/views/team-view.ts` enthält "aos-team-edit-modal"
- [x] CONTAINS: `ui/frontend/src/components/team/aos-team-detail-modal.ts` enthält "edit"

### Funktions-Prüfungen

- [x] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0
- [x] LINT_PASS: `cd ui && npm run lint` exits with code 0

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
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Lit-Patterns
- [x] Edit-Modal nutzt aos-file-editor (CodeMirror) wieder
- [x] PUT API-Call korrekt implementiert

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Frontend Build kompiliert
- [x] Keine Linting Errors

#### Integration DoD
- [x] **Integration hergestellt: aos-team-edit-modal --> Backend API (PUT)**
  - [x] Fetch-Call mit PUT-Methode existiert
  - [x] Validierung: `grep -q "PUT\|fetch.*skills" ui/frontend/src/components/team/aos-team-edit-modal.ts`

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `aos-team-edit-modal.ts` (NEU) | Neues Modal mit CodeMirror-Editor |
| Frontend | `team-view.ts` | Edit-Event-Handling, Modal einbinden |
| Frontend | `aos-team-detail-modal.ts` | Edit-Button im Header |
| Frontend | `aos-team-card.ts` | Edit-Button auf Karte |

**Kritische Integration Points:**
- `aos-team-edit-modal` --> Backend PUT `/api/team/:projectPath/skills/:skillId`

---

### Technical Details

**WAS:**
- Neues `aos-team-edit-modal` Lit-Component mit CodeMirror-basiertem Editor
- Edit-Buttons in `aos-team-card` und `aos-team-detail-modal`
- Event-Handling in `aos-team-view` für Edit-Events
- PUT API-Call zum Speichern

**WIE (Architektur-Guidance):**
- `aos-file-editor` (CodeMirror 6) als Editor-Component wiederverwenden
- Follow Modal-Pattern aus `aos-team-detail-modal` oder `aos-quick-todo-modal`
- Custom Events (`edit-click`, `skill-saved`) für Kommunikation
- Light DOM Pattern beibehalten
- Escape-Key und Click-Outside zum Schließen

**WO:**
- `ui/frontend/src/components/team/aos-team-edit-modal.ts` (NEU)
- `ui/frontend/src/views/team-view.ts`
- `ui/frontend/src/components/team/aos-team-detail-modal.ts`
- `ui/frontend/src/components/team/aos-team-card.ts`

**Abhängigkeiten:** CTM-001 (PUT Endpoint), CTM-003 (Buttons in Cards/View)

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Web Components Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-team-edit-modal | UI Component | ui/frontend/src/components/team/aos-team-edit-modal.ts | Modal mit Markdown-Editor für Skill-Bearbeitung |

---

### Completion Check

```bash
# Verify edit modal exists
test -f ui/frontend/src/components/team/aos-team-edit-modal.ts

# Verify team-view includes edit modal
grep -q "aos-team-edit-modal" ui/frontend/src/views/team-view.ts

# Verify detail modal has edit button
grep -q "edit" ui/frontend/src/components/team/aos-team-detail-modal.ts

# Frontend build
cd ui/frontend && npm run build
```

**Story ist DONE wenn:**
1. Edit-Modal öffnet sich und zeigt SKILL.md Inhalt
2. Speichern ruft PUT Endpoint auf
3. Frontend Build kompiliert
