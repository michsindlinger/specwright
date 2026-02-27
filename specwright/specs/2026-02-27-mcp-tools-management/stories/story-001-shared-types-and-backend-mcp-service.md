# Shared Types & Backend MCP Service

> Story ID: MCP-001
> Spec: MCP Tools Management
> Created: 2026-02-27
> Last Updated: 2026-02-27

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: None

---

## Feature

```gherkin
Feature: MCP-Konfiguration ueber Backend-API bereitstellen
  Als Entwickler
  moechte ich die MCP-Server-Konfiguration ueber eine API abrufen koennen,
  damit das Frontend die verfuegbaren MCP-Tools anzeigen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: MCP-Config erfolgreich laden

```gherkin
Scenario: Erfolgreicher Abruf der MCP-Konfiguration
  Given ein Projekt hat eine `.mcp.json` mit 3 MCP-Servern
  When ich die MCP-Config API aufrufe
  Then erhalte ich eine Liste mit 3 MCP-Servern
  And jeder Server hat Name, Typ und Command-Info
  And keiner der Server enthaelt env-Daten
```

### Szenario 2: mcpTools aus Skill-Frontmatter parsen

```gherkin
Scenario: Parsing des mcpTools-Feldes aus SKILL.md
  Given eine SKILL.md hat das Frontmatter-Feld "mcpTools: [perplexity, playwright]"
  When das Skill geladen wird
  Then enthaelt die SkillSummary ein mcpTools-Array mit ["perplexity", "playwright"]
```

### Szenario 3: mcpTools beim Speichern ins Frontmatter schreiben

```gherkin
Scenario: Speichern von mcpTools ueber die PUT-API
  Given ein Skill hat noch keine mcpTools im Frontmatter
  When ich den Skill mit mcpTools ["perplexity"] aktualisiere
  Then wird das Frontmatter der SKILL.md um "mcpTools: [perplexity]" erweitert
  And der restliche Inhalt der SKILL.md bleibt unveraendert
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: .mcp.json existiert nicht
  Given ein Projekt hat keine `.mcp.json`
  When ich die MCP-Config API aufrufe
  Then erhalte ich eine leere Server-Liste
  And einen Hinweis "Keine MCP-Konfiguration gefunden"

Scenario: .mcp.json ist fehlerhaft
  Given ein Projekt hat eine `.mcp.json` mit invalidem JSON
  When ich die MCP-Config API aufrufe
  Then erhalte ich eine Fehlermeldung "Invalid MCP configuration"

Scenario: .mcp.json hat keine mcpServers Property
  Given ein Projekt hat eine `.mcp.json` ohne mcpServers-Eigenschaft
  When ich die MCP-Config API aufrufe
  Then erhalte ich eine leere Server-Liste

Scenario: Skill hat kein mcpTools-Feld
  Given eine SKILL.md hat kein mcpTools im Frontmatter
  When das Skill geladen wird
  Then ist mcpTools ein leeres Array
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] FILE_EXISTS: ui/src/server/services/mcp-config-reader.service.ts
- [ ] FILE_EXISTS: ui/src/shared/types/team.protocol.ts

### Inhalt-Pruefungen

- [ ] CONTAINS: ui/src/shared/types/team.protocol.ts enthaelt "McpServerSummary"
- [ ] CONTAINS: ui/src/shared/types/team.protocol.ts enthaelt "McpConfigResponse"
- [ ] CONTAINS: ui/src/shared/types/team.protocol.ts enthaelt "mcpTools"
- [ ] CONTAINS: ui/src/server/services/skills-reader.service.ts enthaelt "mcpTools"
- [ ] CONTAINS: ui/src/server/routes/team.routes.ts enthaelt "mcp-config"

### Funktions-Pruefungen

- [ ] BUILD_PASS: `cd ui && npm run build:backend` exits with code 0
- [ ] LINT_PASS: `cd ui && npm run lint` exits with code 0

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
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschaetzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] **Alle betroffenen Layer identifiziert** (Backend + Shared Types)
- [x] **Integration Type bestimmt** (Backend-only)
- [x] **Kritische Integration Points dokumentiert** (n/a - Backend-only)
- [x] **Handover-Dokumente definiert** (API Contract fuer Frontend-Stories)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfuellt (env-Feld gefiltert)

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Backend | mcp-config-reader.service.ts (NEU) | Neuer Service zum Lesen der .mcp.json |
| Backend | skills-reader.service.ts | parseFrontmatter() um mcpTools erweitern |
| Backend | team.routes.ts | Neuer GET mcp-config Endpunkt, PUT mcpTools |
| Shared Types | team.protocol.ts | McpServerSummary, McpConfigResponse, mcpTools auf SkillSummary/SkillDetail |

**Handover-Dokumente (API Contract fuer MCP-002, MCP-003):**
- GET `/:projectPath/mcp-config` liefert `McpConfigResponse` mit `servers: McpServerSummary[]`
- `McpServerSummary`: `{ name: string, type: string, command: string, args: string[] }`
- `SkillSummary.mcpTools`: `string[]` (leer wenn kein Frontmatter-Feld)
- PUT `/:projectPath/skills/:skillId` akzeptiert optionales `mcpTools: string[]` im Body

---

### Technical Details

**WAS:**
1. Neue Interfaces in `team.protocol.ts`: `McpServerSummary`, `McpConfigResponse`, plus `mcpTools: string[]` auf `SkillSummary` und `SkillDetail`
2. Neuer `McpConfigReaderService` als Singleton: Liest `.mcp.json` aus Projekt-Root (+ Parent fuer Monorepos), parst `mcpServers`, filtert `env`-Feld heraus
3. Erweiterung `SkillsReaderService.parseFrontmatter()`: Parst neues `mcpTools`-Array aus YAML-Frontmatter
4. Erweiterung `SkillsReaderService.updateSkillContent()`: Akzeptiert optionales `mcpTools`-Array und schreibt es ins Frontmatter
5. Neuer GET-Endpunkt in `team.routes.ts`: `/:projectPath/mcp-config`
6. Erweiterung PUT-Endpunkt in `team.routes.ts`: Optionales `mcpTools` im Request-Body

**WIE (Architektur-Guidance ONLY):**
- `McpConfigReaderService` folgt dem bestehenden Singleton-Service-Pattern (analog `SkillsReaderService`): `export const mcpConfigReaderService = new McpConfigReaderService()`
- `.mcp.json`-Pfad-Resolution: Bestehende Logik aus `project-context.service.ts` (`detectMcpKanban()`) als Vorlage nutzen - `resolve(projectPath, '.mcp.json')` + `resolve(projectPath, '..', '.mcp.json')` Fallback
- **SICHERHEIT KRITISCH:** Das `env`-Feld in `.mcp.json`-Servern enthaelt API-Keys und darf NIEMALS ans Frontend gesendet werden. Der Service muss `env` aus jedem Server-Objekt entfernen bevor die Response erstellt wird
- Frontmatter-`mcpTools`-Parsing: Gleiches Regex-Pattern wie `globs`-Parsing in `parseFrontmatter()` verwenden. Format: `mcpTools: [tool1, tool2]` (YAML inline array)
- PUT-Erweiterung: Server akzeptiert `{ content: string, mcpTools?: string[] }`. Wenn `mcpTools` im Body vorhanden, wird das Frontmatter des Contents um das `mcpTools`-Feld ergaenzt/aktualisiert bevor es geschrieben wird
- Route-Handler folgt bestehendem Pattern: `decodeURIComponent(projectPath)`, try-catch, konsistente Error-Responses
- Fehlerbehandlung `.mcp.json`: Fehlende Datei = leere Liste (kein Error), invalides JSON = Error-Response

**WO:**
- `ui/src/shared/types/team.protocol.ts` - Interfaces erweitern
- `ui/src/server/services/mcp-config-reader.service.ts` - NEU erstellen
- `ui/src/server/services/skills-reader.service.ts` - parseFrontmatter() + updateSkillContent() erweitern
- `ui/src/server/routes/team.routes.ts` - GET mcp-config Endpunkt + PUT erweitern

**Abhaengigkeiten:** None

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Express Route + Service Pattern |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Bestehende Team-Architektur und Conventions |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| McpConfigReaderService | Service | ui/src/server/services/mcp-config-reader.service.ts | Service zum Lesen und Parsen der .mcp.json |
| McpServerSummary | Type | ui/src/shared/types/team.protocol.ts | Interface fuer MCP-Server-Daten |
| GET /mcp-config | API Endpoint | ui/src/server/routes/team.routes.ts | REST-Endpunkt fuer MCP-Konfiguration |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten
test -f ui/src/server/services/mcp-config-reader.service.ts
grep -q "McpServerSummary" ui/src/shared/types/team.protocol.ts
grep -q "mcpTools" ui/src/server/services/skills-reader.service.ts
grep -q "mcp-config" ui/src/server/routes/team.routes.ts
cd ui && npm run build:backend
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
