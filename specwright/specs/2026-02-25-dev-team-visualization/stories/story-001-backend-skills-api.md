# Backend Skills-API-Endpunkt

> Story ID: TEAM-001
> Spec: Dev-Team Visualization
> Created: 2026-02-25
> Last Updated: 2026-02-25

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: Skills-API-Endpunkt
  Als Entwickler
  möchte ich eine REST-API die alle Skills meines Projekts ausliest,
  damit die Web UI sie als Team-Mitglieder visualisieren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Skills-Liste abrufen

```gherkin
Scenario: Erfolgreicher Abruf aller Skills eines Projekts
  Given ein Projekt hat 3 Skills unter .claude/skills/
  And jeder Skill hat eine SKILL.md mit Frontmatter
  When ich die Skills-Liste des Projekts abrufe
  Then erhalte ich eine Liste mit 3 Einträgen
  And jeder Eintrag enthält Name, Beschreibung und Kategorie
  And jeder Eintrag enthält die Anzahl der Learnings
```

### Szenario 2: Skill-Detail abrufen

```gherkin
Scenario: Abruf der Detail-Informationen eines einzelnen Skills
  Given ein Skill "frontend-lit" existiert mit SKILL.md und dos-and-donts.md
  When ich die Details dieses Skills abrufe
  Then erhalte ich den vollständigen SKILL.md-Inhalt
  And erhalte ich den vollständigen dos-and-donts.md-Inhalt
  And erhalte ich eine Liste der Sub-Dokumente
```

### Szenario 3: Skill ohne dos-and-donts.md

```gherkin
Scenario: Skill hat keine dos-and-donts.md
  Given ein Skill existiert nur mit SKILL.md
  And die Datei dos-and-donts.md fehlt
  When ich die Skills-Liste abrufe
  Then zeigt der Eintrag 0 Learnings
  And es tritt kein Fehler auf
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Skills-Verzeichnis existiert nicht
  Given ein Projekt hat kein .claude/skills/ Verzeichnis
  When ich die Skills-Liste abrufe
  Then erhalte ich eine leere Liste
  And es tritt kein Fehler auf

Scenario: Skill ohne Frontmatter in SKILL.md
  Given ein Skill hat eine SKILL.md ohne YAML-Frontmatter
  When ich die Skills-Liste abrufe
  Then wird der Verzeichnisname als Name verwendet
  And die Beschreibung ist "Keine Beschreibung verfügbar"
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: ui/src/server/services/skills-reader.service.ts
- [ ] FILE_EXISTS: ui/src/server/routes/team.routes.ts
- [ ] FILE_EXISTS: ui/src/shared/types/team.protocol.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: ui/src/server/index.ts enthält "team"
- [ ] CONTAINS: ui/src/shared/types/team.protocol.ts enthält "SkillSummary"
- [ ] CONTAINS: ui/src/shared/types/team.protocol.ts enthält "SkillDetail"

### Funktions-Prüfungen

- [ ] BUILD_PASS: `cd ui && npm run build:backend` exits with code 0

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
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Unit Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | skills-reader.service.ts | Neuer Service: Liest Skills aus Dateisystem |
| Backend | team.routes.ts | Neue Routes: GET /api/team/:projectPath/skills, GET /api/team/:projectPath/skills/:skillId |
| Backend | index.ts | Änderung: Route-Mount hinzufügen |
| Shared | team.protocol.ts | Neue Types: SkillSummary, SkillDetail, Response-Interfaces |

---

### Technical Details

**WAS:** Skills-Reader-Service der `.claude/skills/` aus dem Dateisystem liest und parst, REST-Routes die den Service exponieren, Shared Types für die API-Kommunikation.

**WIE (Architektur-Guidance ONLY):**
- Folge dem Pattern von `quick-todo.routes.ts` für projektpfad-basierte REST-Routes
- YAML-Frontmatter aus SKILL.md via einfacher Regex parsen (kein `gray-matter` nötig)
- Defensive Fallbacks: Kein Frontmatter → Name aus Verzeichnis, keine dos-and-donts → 0 Learnings
- Skills-Pfad ist immer `join(projectPath, '.claude', 'skills')` - kein `project-dirs.ts` nötig
- Response-Interfaces mit `success: boolean` Pattern wie bestehende Routes

**WO:**
- NEU: `ui/src/server/services/skills-reader.service.ts`
- NEU: `ui/src/server/routes/team.routes.ts`
- NEU: `ui/src/shared/types/team.protocol.ts`
- ÄNDERN: `ui/src/server/index.ts` (Route-Mount)

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Express.js Route und Service Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| SkillSummary | Model | ui/src/shared/types/team.protocol.ts | Interface für Skill-Zusammenfassung |
| SkillDetail | Model | ui/src/shared/types/team.protocol.ts | Interface für Skill-Details |
| Skills API | API Endpoint | ui/src/server/routes/team.routes.ts | REST-Endpunkte für Skills-Daten |

---

### Completion Check

```bash
# Verify files exist
test -f ui/src/server/services/skills-reader.service.ts && echo "skills-reader.service.ts exists"
test -f ui/src/server/routes/team.routes.ts && echo "team.routes.ts exists"
test -f ui/src/shared/types/team.protocol.ts && echo "team.protocol.ts exists"

# Verify route mount in index.ts
grep -q "team" ui/src/server/index.ts && echo "team route mounted"

# Verify backend compiles
cd ui && npm run build:backend
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Backend kompiliert fehlerfrei
3. Git diff zeigt nur erwartete Änderungen
