# Integration und Testing

> Story ID: TEAM-005
> Spec: Dev-Team Visualization
> Created: 2026-02-25
> Last Updated: 2026-02-25

**Priority**: Medium
**Type**: Test
**Estimated Effort**: S
**Dependencies**: TEAM-001, TEAM-002, TEAM-003, TEAM-004

---

## Feature

```gherkin
Feature: Integration Tests für Team-Visualization
  Als Qualitätssicherung
  möchte ich automatisierte Tests für die Skills-API,
  damit die Funktionalität zuverlässig verifiziert wird.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Backend Service Tests

```gherkin
Scenario: Skills-Reader Service Tests bestehen
  Given die Vitest-Tests für skills-reader.service.ts existieren
  When ich die Tests ausführe
  Then bestehen alle Tests
  And sie decken die Szenarien: leeres Verzeichnis, Skills mit/ohne dos-and-donts, Fehlerfall ab
```

### Szenario 2: Backend Route Tests

```gherkin
Scenario: Team Routes Tests bestehen
  Given die Vitest-Tests für team.routes.ts existieren
  When ich die Tests ausführe
  Then bestehen alle Tests
  And GET /api/team/:projectPath/skills liefert 200
  And GET /api/team/:projectPath/skills/:skillId liefert 200 oder 404
```

### Szenario 3: Build-Verifikation

```gherkin
Scenario: Vollständiger Build ohne Fehler
  Given alle Komponenten sind implementiert
  When ich den Backend- und Frontend-Build ausführe
  Then kompiliert beides fehlerfrei
  And es gibt keine TypeScript-Fehler
```

---

## Technische Verifikation (Automated Checks)

### Funktions-Prüfungen

- [ ] TEST_PASS: `cd ui && npx vitest run tests/team` exits with code 0
- [ ] BUILD_PASS: `cd ui && npm run build:backend` exits with code 0
- [ ] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0
- [ ] LINT_PASS: `cd ui && npm run lint` exits with code 0

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
- [x] Kritische Integration Points dokumentiert
- [x] Handover-Dokumente definiert

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only (Tests)

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | tests/team/ | Neue Tests: Service + Route Tests |

---

### Technical Details

**WAS:** Vitest-Tests für skills-reader.service.ts und team.routes.ts.

**WIE (Architektur-Guidance ONLY):**
- Folge bestehende Vitest-Test-Patterns im `ui/tests/` Verzeichnis
- Mock das Dateisystem für Service-Tests (keine echten Dateien nötig)
- Test-Szenarien: Leeres Verzeichnis, Skills mit/ohne Frontmatter, Skills mit/ohne dos-and-donts, Fehlerfall
- Route-Tests mit Supertest oder direktem Handler-Aufruf (je nach bestehendem Pattern)

**WO:**
- NEU: `ui/tests/team/skills-reader.service.test.ts`
- NEU: `ui/tests/team/team.routes.test.ts`

**Abhängigkeiten:** TEAM-001, TEAM-002, TEAM-003, TEAM-004

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Express Testing Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Run team tests
cd ui && npx vitest run tests/team

# Verify backend compiles
cd ui && npm run build:backend

# Verify frontend compiles
cd ui/frontend && npm run build

# Verify lint passes
cd ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle Team-Tests bestehen (vitest)
2. Backend und Frontend kompilieren fehlerfrei
3. Lint läuft ohne Fehler
