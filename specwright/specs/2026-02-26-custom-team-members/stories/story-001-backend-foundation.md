# Backend Foundation - Shared Types, Service & API Endpoints

> Story ID: CTM-001
> Spec: Custom Team Members
> Created: 2026-02-26
> Last Updated: 2026-02-26

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Backend-Erweiterung für Custom Team Members
  Als Specwright-Nutzer
  möchte ich dass das Backend teamType und teamName aus Skills ausliest,
  damit die Team-Seite Skills gruppiert darstellen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Skill mit teamType wird korrekt geparst

```gherkin
Scenario: Backend parst teamType aus Frontmatter
  Given ein Skill hat im Frontmatter "teamType: individual"
  And der Skill hat "teamName: Steuerberater"
  When die Skills-API aufgerufen wird
  Then enthält die Response teamType "individual"
  And enthält die Response teamName "Steuerberater"
```

### Szenario 2: Skill ohne teamType wird als devteam behandelt

```gherkin
Scenario: Rückwärtskompatibilität für bestehende Skills
  Given ein bestehender Skill hat kein teamType im Frontmatter
  When die Skills-API aufgerufen wird
  Then wird teamType als "devteam" zurückgegeben
  And teamName ist leer
```

### Szenario 3: Skill-Inhalt aktualisieren

```gherkin
Scenario: SKILL.md Inhalt über PUT Endpoint aktualisieren
  Given ein Skill "steuerberater" existiert
  When ich den PUT Endpoint mit neuem Markdown-Inhalt aufrufe
  Then wird die SKILL.md Datei mit dem neuen Inhalt überschrieben
  And die API gibt Status 200 zurück
```

### Szenario 4: Skill löschen

```gherkin
Scenario: Skill-Ordner über DELETE Endpoint entfernen
  Given ein Skill "steuerberater" existiert
  When ich den DELETE Endpoint aufrufe
  Then wird der gesamte Skill-Ordner gelöscht
  And die API gibt Status 200 zurück
```

### Edge Case: Nicht existierender Skill

```gherkin
Scenario: Löschen eines nicht existierenden Skills
  Given kein Skill mit dem Namen "nicht-vorhanden" existiert
  When ich den DELETE Endpoint für "nicht-vorhanden" aufrufe
  Then gibt die API Status 404 zurück
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] CONTAINS: `ui/src/shared/types/team.protocol.ts` enthält "teamType"
- [ ] CONTAINS: `ui/src/shared/types/team.protocol.ts` enthält "teamName"
- [ ] CONTAINS: `ui/src/server/services/skills-reader.service.ts` enthält "teamType"
- [ ] CONTAINS: `ui/src/server/services/skills-reader.service.ts` enthält "deleteSkill"
- [ ] CONTAINS: `ui/src/server/services/skills-reader.service.ts` enthält "updateSkillContent"
- [ ] CONTAINS: `ui/src/server/routes/team.routes.ts` enthält "delete"

### Funktions-Prüfungen

- [ ] BUILD_PASS: `cd ui && npm run build:backend` exits with code 0
- [ ] LINT_PASS: `cd ui && npm run lint` exits with code 0
- [ ] TEST_PASS: `cd ui && npx vitest run` exits with code 0

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
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests geschrieben und bestanden
- [ ] Code Review durchgeführt
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | `skills-reader.service.ts` | teamType/teamName Parsing, updateSkillContent(), deleteSkill() |
| Backend | `team.routes.ts` | PUT und DELETE Endpoints hinzufügen |
| Backend | `team.protocol.ts` (Shared Types) | teamType und teamName Felder in Interfaces |

---

### Technical Details

**WAS:**
- Shared Types `SkillSummary` und `SkillDetail` um `teamType` und `teamName` erweitern
- `SkillsReaderService.parseFrontmatter()` um Parsing der neuen Felder erweitern
- Neue Service-Methoden: `updateSkillContent(projectPath, skillId, content)` und `deleteSkill(projectPath, skillId)`
- Neue API-Endpoints: `PUT /api/team/:projectPath/skills/:skillId` und `DELETE /api/team/:projectPath/skills/:skillId`

**WIE (Architektur-Guidance):**
- Bestehende `parseFrontmatter()` Regex-Methode erweitern (nur 2 neue Zeilen für teamType/teamName)
- PUT Endpoint: Validiere dass SKILL.md existiert, überschreibe Dateiinhalt
- DELETE Endpoint: Validiere dass Skill-Ordner existiert, lösche rekursiv
- Skills ohne `teamType` Feld bekommen Default `"devteam"`
- Follow existing error handling pattern in team.routes.ts (try/catch mit HTTP Status Codes)

**WO:**
- `ui/src/shared/types/team.protocol.ts`
- `ui/src/server/services/skills-reader.service.ts`
- `ui/src/server/routes/team.routes.ts`

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Express.js Backend-Patterns für Routes und Services |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| PUT /api/team/:projectPath/skills/:skillId | API Endpoint | ui/src/server/routes/team.routes.ts | Skill-Inhalt aktualisieren |
| DELETE /api/team/:projectPath/skills/:skillId | API Endpoint | ui/src/server/routes/team.routes.ts | Skill löschen |

---

### Completion Check

```bash
# Verify shared types contain new fields
grep -q "teamType" ui/src/shared/types/team.protocol.ts
grep -q "teamName" ui/src/shared/types/team.protocol.ts

# Verify service has new methods
grep -q "deleteSkill" ui/src/server/services/skills-reader.service.ts
grep -q "updateSkillContent" ui/src/server/services/skills-reader.service.ts

# Verify routes have new endpoints
grep -q "delete" ui/src/server/routes/team.routes.ts

# Build check
cd ui && npm run build:backend
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Backend Build kompiliert ohne Fehler
3. Alle Tests bestehen
