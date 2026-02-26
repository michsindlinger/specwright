# Frontend Gruppierte Darstellung

> Story ID: CTM-003
> Spec: Custom Team Members
> Created: 2026-02-26
> Last Updated: 2026-02-26

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: CTM-001

---

## Feature

```gherkin
Feature: Gruppierte Team-Darstellung
  Als Specwright-Nutzer
  möchte ich meine Skills gruppiert nach DevTeam, Custom Teams und Einzelpersonen sehen,
  damit ich einen klaren Überblick über mein gesamtes Team habe.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: DevTeam-Sektion wird angezeigt

```gherkin
Scenario: Bestehende DevTeam-Skills werden in eigener Sektion angezeigt
  Given es existieren Skills ohne teamType (bestehende DevTeam-Skills)
  When ich die Team-Seite öffne
  Then sehe ich eine "Development Team" Sektion
  And darin sind alle bestehenden DevTeam-Skills aufgelistet
```

### Szenario 2: Custom Teams Sektion

```gherkin
Scenario: Custom Teams werden gruppiert angezeigt
  Given es existiert ein Skill mit teamType "team" und teamName "Marketing Team"
  And es existiert ein Skill mit teamType "team" und teamName "Marketing Team"
  When ich die Team-Seite öffne
  Then sehe ich eine "Custom Teams" Sektion
  And darunter eine Gruppe "Marketing Team" mit beiden Skills
```

### Szenario 3: Einzelpersonen Sektion

```gherkin
Scenario: Einzelpersonen werden in eigener Sektion angezeigt
  Given es existiert ein Skill mit teamType "individual"
  When ich die Team-Seite öffne
  Then sehe ich eine "Einzelpersonen" Sektion
  And darin ist der individuelle Skill aufgelistet
```

### Szenario 4: Team-Karte zeigt Typ-Badge

```gherkin
Scenario: Team-Karten zeigen den Skill-Typ an
  Given ein Custom-Skill hat teamType "individual"
  When ich die Team-Karte betrachte
  Then zeigt die Karte ein visuelles Badge für den Typ
  And das Badge unterscheidet sich vom DevTeam-Badge
```

### Edge Case: Keine Custom Skills vorhanden

```gherkin
Scenario: Leere Sektionen werden nicht angezeigt
  Given es existieren nur DevTeam-Skills (keine Custom Skills)
  When ich die Team-Seite öffne
  Then sehe ich nur die "Development Team" Sektion
  And die Sektionen "Custom Teams" und "Einzelpersonen" werden nicht angezeigt
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [ ] CONTAINS: `ui/frontend/src/views/team-view.ts` enthält "teamType"
- [ ] CONTAINS: `ui/frontend/src/components/team/aos-team-card.ts` enthält "teamType"

### Funktions-Prüfungen

- [ ] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0
- [ ] LINT_PASS: `cd ui && npm run lint` exits with code 0

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

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Lit-Patterns
- [ ] Architektur-Vorgaben eingehalten
- [ ] Visuell korrekte Darstellung

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Frontend Build kompiliert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `team-view.ts` | Client-seitige Gruppierung nach teamType, Sektions-Rendering |
| Frontend | `aos-team-card.ts` | teamType Badge, visuelle Unterscheidung |
| Frontend | `theme.css` | CSS für Team-Sektionen und Badges |

---

### Technical Details

**WAS:**
- `aos-team-view` refactoren: Skills nach teamType gruppieren (devteam / team / individual)
- `aos-team-card` erweitern: teamType Badge anzeigen, visuelle Unterscheidung
- CSS für Sektions-Überschriften und Team-Gruppen

**WIE (Architektur-Guidance):**
- Client-seitige Gruppierung im Frontend (kein Backend-Grouping nötig)
- Bestehende V2-Komponenten-Patterns verwenden
- Leere Sektionen nicht rendern (conditional rendering)
- `getCategoryClass()` in `aos-team-card` um teamType-Badge erweitern
- Follow Lit Light DOM Pattern für alle Änderungen

**WO:**
- `ui/frontend/src/views/team-view.ts`
- `ui/frontend/src/components/team/aos-team-card.ts`
- `ui/frontend/src/styles/theme.css`

**Abhängigkeiten:** CTM-001 (Backend liefert teamType/teamName)

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Web Components Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify team-view uses teamType
grep -q "teamType" ui/frontend/src/views/team-view.ts

# Verify team-card has teamType support
grep -q "teamType" ui/frontend/src/components/team/aos-team-card.ts

# Frontend build
cd ui/frontend && npm run build
```

**Story ist DONE wenn:**
1. Team-Seite zeigt Skills gruppiert an
2. Leere Sektionen werden ausgeblendet
3. Frontend Build kompiliert
