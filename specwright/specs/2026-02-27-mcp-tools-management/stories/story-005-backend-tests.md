# Backend Tests

> Story ID: MCP-005
> Spec: MCP Tools Management
> Created: 2026-02-27
> Last Updated: 2026-02-27

**Priority**: High
**Type**: Test
**Estimated Effort**: S
**Dependencies**: MCP-001

---

## Feature

```gherkin
Feature: Backend-Tests fuer MCP Tools Management
  Als Qualitaetssicherung
  moechte ich umfassende Tests fuer die MCP-Funktionalitaet haben,
  damit die Zuverlaessigkeit der neuen Features sichergestellt ist.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: McpConfigReaderService Tests

```gherkin
Scenario: Tests fuer den MCP-Config-Reader-Service
  Given es gibt einen neuen McpConfigReaderService
  When ich die Test-Suite ausfuehre
  Then werden alle Szenarien getestet:
  And erfolgreicher Parse einer .mcp.json mit mehreren Servern
  And fehlende .mcp.json gibt leere Liste zurueck
  And invalide JSON gibt Fehlermeldung zurueck
  And env-Feld wird herausgefiltert
```

### Szenario 2: Skills-Reader mcpTools Tests

```gherkin
Scenario: Tests fuer mcpTools-Parsing in SkillsReaderService
  Given der SkillsReaderService parst mcpTools im Frontmatter
  When ich die Test-Suite ausfuehre
  Then werden die neuen mcpTools-Tests bestanden:
  And Parsing von mcpTools aus Frontmatter
  And Leeres mcpTools-Array bei fehlendem Feld
  And Schreiben von mcpTools ins Frontmatter via PUT
```

### Szenario 3: Team Routes Tests

```gherkin
Scenario: Tests fuer die erweiterten Team-Routes
  Given team.routes.ts hat einen neuen MCP-Config-Endpunkt
  When ich die Route-Tests ausfuehre
  Then wird der GET mcp-config Endpunkt getestet
  And wird der erweiterte PUT mit mcpTools getestet
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [x] FILE_EXISTS: ui/tests/team/mcp-config-reader.service.test.ts

### Funktions-Pruefungen

- [x] TEST_PASS: `cd ui && npx vitest run tests/team/mcp-config-reader.service.test.ts` exits with code 0
- [x] TEST_PASS: `cd ui && npx vitest run tests/team/skills-reader.service.test.ts` exits with code 0
- [x] TEST_PASS: `cd ui && npx vitest run tests/team/team.routes.test.ts` exits with code 0

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
- [x] Story ist angemessen geschaetzt (3 Dateien, ~300 LOC)

#### Full-Stack Konsistenz
- [x] **Alle betroffenen Layer identifiziert** (Test-only)
- [x] **Integration Type bestimmt** (Test)
- [x] **Kritische Integration Points dokumentiert** (n/a)
- [x] **Handover-Dokumente definiert** (n/a)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Alle Test-Szenarien aus Akzeptanzkriterien abgedeckt

#### Qualitaetssicherung
- [x] Alle Tests bestehen (vitest run)
- [x] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [x] Keine Linting Errors

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Test

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Test | mcp-config-reader.service.test.ts (NEU) | Neue Testdatei fuer McpConfigReaderService |
| Test | skills-reader.service.test.ts | Erweiterte Tests fuer mcpTools-Parsing |
| Test | team.routes.test.ts | Erweiterte Tests fuer GET mcp-config und PUT mcpTools |

---

### Technical Details

**WAS:**
1. Neue Testdatei `mcp-config-reader.service.test.ts`: Tests fuer McpConfigReaderService mit Szenarien fuer erfolgreichen Parse, fehlende Datei, invalides JSON, fehlende mcpServers Property, env-Feld-Filterung, Monorepo-Fallback
2. Erweiterung `skills-reader.service.test.ts`: Tests fuer mcpTools-Frontmatter-Parsing (vorhanden, fehlend, leeres Array) und mcpTools-Schreiben via updateSkillContent()
3. Erweiterung `team.routes.test.ts`: Tests fuer GET mcp-config Endpunkt (Erfolg, Fehler), erweiterten PUT mit mcpTools-Feld

**WIE (Architektur-Guidance ONLY):**
- `mcp-config-reader.service.test.ts`:
  - Folgt dem bestehenden Test-Pattern aus `skills-reader.service.test.ts`: `beforeEach` mit `mkdtemp()`, `afterEach` mit `rm()`, Helper-Funktionen fuer Testdaten
  - Helper-Funktion `createMcpConfig()` erstellt `.mcp.json` mit konfigurierbaren Servern im tmpDir
  - Test-Szenarien:
    - Erfolgreiches Parsen mit mehreren Servern
    - Verifizierung dass `env`-Feld NICHT in Response enthalten ist (Sicherheitstest!)
    - Fehlende `.mcp.json` -> leere Server-Liste
    - Invalides JSON -> Error
    - Fehlende `mcpServers` Property -> leere Liste
    - Monorepo-Fallback: `.mcp.json` im Parent-Directory
- `skills-reader.service.test.ts`:
  - Neue Test-Gruppe fuer mcpTools in bestehender describe-Struktur
  - Test: SKILL.md mit `mcpTools: [tool1, tool2]` -> `SkillSummary.mcpTools = ['tool1', 'tool2']`
  - Test: SKILL.md ohne mcpTools -> `SkillSummary.mcpTools = []`
  - Test: updateSkillContent mit mcpTools -> Frontmatter korrekt aktualisiert
- `team.routes.test.ts`:
  - Folgt bestehendes Mock-Pattern: `vi.mock()` fuer Service, `getHandler()` Helper, `mockReq()`/`mockRes()`
  - Mock fuer `mcpConfigReaderService` hinzufuegen
  - Test: GET mcp-config Endpunkt mit Mock-Daten
  - Test: PUT mit mcpTools im Body -> Service wird mit mcpTools aufgerufen

**WO:**
- `ui/tests/team/mcp-config-reader.service.test.ts` - NEU erstellen
- `ui/tests/team/skills-reader.service.test.ts` - Erweitern
- `ui/tests/team/team.routes.test.ts` - Erweitern

**Abhaengigkeiten:** MCP-001 (Implementation muss vorhanden sein damit Tests laufen)

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Test-Patterns fuer Express Routes und Services |
| quality-gates | .claude/skills/quality-gates/SKILL.md | Quality Standards und Test-Coverage-Anforderungen |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
test -f ui/tests/team/mcp-config-reader.service.test.ts
cd ui && npx vitest run tests/team/mcp-config-reader.service.test.ts
cd ui && npx vitest run tests/team/skills-reader.service.test.ts
cd ui && npx vitest run tests/team/team.routes.test.ts
```

**Story ist DONE wenn:**
1. Alle Tests bestanden
2. Keine Linting-Fehler
3. Git diff zeigt nur erwartete Aenderungen
