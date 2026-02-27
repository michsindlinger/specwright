# Implementierungsplan: MCP Tools Management

> **Status:** APPROVED
> **Spec:** specwright/specs/2026-02-27-mcp-tools-management/
> **Erstellt:** 2026-02-27
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

MCP Tools Management erweitert den Team-Bereich der Specwright UI um eine neue Sektion, die alle installierten MCP-Server aus der Projekt-`.mcp.json` anzeigt. Skills (Teammitglieder) koennen ueber ein neues optionales Frontmatter-Feld `mcpTools` gezielt MCP-Tools zugewiesen bekommen. Dies schafft Transparenz darueber, welche externen Tools im Projekt verfuegbar sind, und ermoeglicht die gezielte Zuordnung von Tools zu Agents.

---

## Architektur-Entscheidungen

### Gewaehlter Ansatz

REST-API-Erweiterung mit neuer Service-Klasse fuer MCP-Konfiguration, Erweiterung des bestehenden SkillsReaderService fuer `mcpTools`-Frontmatter, und Erweiterung der bestehenden Team-View-Komponenten.

### Begruendung

- Das Projekt nutzt bereits das Pattern: REST-API-Route -> Service-Singleton -> Frontend-Fetch. Die MCP-Daten lassen sich optimal mit einer neuen `McpConfigReaderService`-Klasse abbilden, analog zu `SkillsReaderService`.
- Der bestehende `projectContextService.detectMcpKanban()` in `ui/src/server/project-context.service.ts` zeigt bereits ein Pattern fuer `.mcp.json`-Zugriff mit Monorepo-Support (Projekt-Root + Parent-Directory).
- Die Team-View nutzt bereits Sektionen (`team-section` CSS-Klasse), die MCP-Tools-Sektion fuegt sich als neue Sektion in dieses bestehende Layout ein.
- Das Edit-Modal (`aos-team-edit-modal`) nutzt aktuell einen CodeMirror-Editor fuer die gesamte SKILL.md. Fuer die MCP-Checkbox-Zuweisung wird eine strukturierte Bearbeitungsoberflaeche (Checkboxen) **im selben Modal als neue Sektion vor dem Editor** hinzugefuegt.

### Patterns & Technologien

- **Pattern:** Bestehendes Singleton-Service-Pattern (analog `SkillsReaderService`)
- **API-Style:** REST wie bestehende Team-Routes
- **Frontmatter-Parsing:** Erweiterung des bestehenden Regex-Parsers in `SkillsReaderService.parseFrontmatter()`
- **Begruendung:** Maximale Konsistenz mit bestehender Architektur, minimaler Lernaufwand

---

## Komponenten-Uebersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `McpConfigReaderService` | Backend Service | Liest `.mcp.json` aus Projekt-Root (und Parent fuer Monorepos), parst mcpServers, validiert JSON, filtert `env`-Feld heraus |
| `McpServerSummary` (Interface) | Shared Type | Typdefinition fuer einen MCP-Server (name, type, command, args) |
| `McpConfigResponse` (Interface) | Shared Type | API-Response-Typ fuer MCP-Config-Endpunkt |
| `aos-mcp-server-card` | Frontend Component | Karte zur Anzeige eines einzelnen MCP-Servers (Name, Typ, Command-Info) |

### Zu aendernde Komponenten

| Komponente | Aenderungsart | Grund |
|------------|--------------|-------|
| `team.protocol.ts` | Erweitern | Neues Interface `McpServerSummary`, `McpConfigResponse`; `mcpTools: string[]` zu `SkillSummary` und `SkillDetail` hinzufuegen |
| `skills-reader.service.ts` | Erweitern | `parseFrontmatter()` um `mcpTools`-Array-Parsing erweitern |
| `team.routes.ts` | Erweitern | Neuer Endpunkt `GET /:projectPath/mcp-config`; PUT-API um optionales `mcpTools`-Feld erweitern |
| `team-view.ts` | Erweitern | Neue MCP-Sektion in `renderGrouped()`, MCP-Daten laden, an Karten/Modals weiterreichen |
| `aos-team-card.ts` | Erweitern | MCP-Tool-Badges anzeigen, Warnung bei verwaisten Referenzen |
| `aos-team-detail-modal.ts` | Erweitern | MCP-Tools-Anzeige im Detail-Modal |
| `aos-team-edit-modal.ts` | Erweitern | Checkbox-Sektion fuer MCP-Tool-Zuweisung, Frontmatter-Manipulation beim Speichern |
| `theme.css` | Erweitern | CSS fuer MCP-Server-Cards, MCP-Badges, Warnung-Badge, Checkbox-Sektion |

### Nicht betroffen (explizit)

- `project-context.service.ts` - Die `detectMcpKanban()`-Methode bleibt unveraendert, ist kein Duplikat
- `file.service.ts`, `FileHandler` - Keine Dateisystem-Aenderungen noetig
- `index.ts` (Server) - Keine neuen Route-Registrierungen, da bestehender Team-Router erweitert wird
- `project-context.ts` (Frontend) - Keine Aenderungen am Context
- `aos-file-editor.ts` - Wird weiterhin im Edit-Modal genutzt, keine Aenderung

---

## Umsetzungsphasen

### Phase 1: Shared Types und Backend Foundation

**Ziel:** API-Vertrag definieren, MCP-Config lesen, Frontmatter erweitert parsen
**Komponenten:**
- `team.protocol.ts` - `McpServerSummary`, `McpConfigResponse`, `mcpTools` in `SkillSummary`/`SkillDetail`
- `McpConfigReaderService` (neue Datei `ui/src/server/services/mcp-config-reader.service.ts`)
- `skills-reader.service.ts` - `mcpTools`-Parsing in `parseFrontmatter()`
- `team.routes.ts` - Neuer Endpunkt `GET /:projectPath/mcp-config`

**Abhaengig von:** Nichts (Startphase)

### Phase 2: MCP-Tools-Uebersicht im Frontend

**Ziel:** MCP-Server als Karten in der Team-View anzeigen
**Komponenten:**
- `aos-mcp-server-card` (neue Datei `ui/frontend/src/components/team/aos-mcp-server-card.ts`)
- `team-view.ts` - MCP-Daten laden, neue Sektion rendern
- `theme.css` - CSS fuer MCP-Server-Cards und MCP-Sektion

**Abhaengig von:** Phase 1

### Phase 3: MCP-Zuweisung zu Skills

**Ziel:** MCP-Tools ueber Checkboxen im Edit-Modal zuweisen, in Cards und Detail-Modal anzeigen
**Komponenten:**
- `aos-team-edit-modal.ts` - Checkbox-Sektion, mcpTools-Array im Save-Request
- `aos-team-card.ts` - MCP-Tool-Badges im Footer
- `aos-team-detail-modal.ts` - MCP-Tools-Anzeige
- `theme.css` - CSS fuer MCP-Badges und Checkbox-Sektion

**Abhaengig von:** Phase 1, Phase 2 (MCP-Daten muessen verfuegbar sein)

### Phase 4: Warnung bei verwaisten Referenzen und Edge Cases

**Ziel:** Warnungen anzeigen wenn ein Skill ein MCP-Tool referenziert das nicht mehr in `.mcp.json` existiert, plus alle Edge Cases abdecken
**Komponenten:**
- `aos-team-card.ts` - Verwaiste-Referenz-Warnung
- `aos-team-detail-modal.ts` - Verwaiste-Referenz-Warnung
- `team-view.ts` - Fehlerzustaende fuer fehlende/fehlerhafte `.mcp.json`

**Abhaengig von:** Phase 2, Phase 3

### Phase 5: Tests

**Ziel:** Backend-Tests fuer alle neuen Funktionalitaeten
**Komponenten:**
- Neue Testdatei: `ui/tests/team/mcp-config-reader.service.test.ts`
- Erweitern: `ui/tests/team/skills-reader.service.test.ts`
- Erweitern: `ui/tests/team/team.routes.test.ts`

**Abhaengig von:** Alle vorherigen Phasen

---

## Komponenten-Verbindungen (KRITISCH)

> **Zweck:** Explizit definieren WIE Komponenten miteinander verbunden werden.
> Jede Verbindung MUSS einer Story zugeordnet sein.

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zustaendige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| `team.routes.ts` (neuer Endpunkt) | `McpConfigReaderService` | Direct Import + Method Call | Phase 1 Story | `grep "mcpConfigReaderService" ui/src/server/routes/team.routes.ts` |
| `McpConfigReaderService` | `McpServerSummary` (team.protocol.ts) | Type Import | Phase 1 Story | `grep "McpServerSummary" ui/src/server/services/mcp-config-reader.service.ts` |
| `skills-reader.service.ts` | `SkillSummary.mcpTools` | Frontmatter Parsing + Return | Phase 1 Story | `grep "mcpTools" ui/src/server/services/skills-reader.service.ts` |
| `team-view.ts` | `GET /api/team/:path/mcp-config` | REST API Fetch | Phase 2 Story | `grep "mcp-config" ui/frontend/src/views/team-view.ts` |
| `team-view.ts` | `aos-mcp-server-card` | Lit Component Import + HTML | Phase 2 Story | `grep "aos-mcp-server-card" ui/frontend/src/views/team-view.ts` |
| `team-view.ts` | `aos-team-card` (mcpTools prop) | Property Binding | Phase 3 Story | `grep "availableMcpTools" ui/frontend/src/views/team-view.ts` |
| `aos-team-card` | `SkillSummary.mcpTools` | Property Access | Phase 3 Story | `grep "mcpTools" ui/frontend/src/components/team/aos-team-card.ts` |
| `aos-team-edit-modal` | MCP-Config-Daten | Props von team-view | Phase 3 Story | `grep "mcp" ui/frontend/src/components/team/aos-team-edit-modal.ts` |
| `aos-team-edit-modal` | SKILL.md Frontmatter | mcpTools via PUT API | Phase 3 Story | `grep "mcpTools" ui/frontend/src/components/team/aos-team-edit-modal.ts` |

### Verbindungs-Details

**VERBINDUNG-1: team.routes.ts -> McpConfigReaderService**
- **Art:** Direct Import + Method Call
- **Schnittstelle:** `import { mcpConfigReaderService } from '../services/mcp-config-reader.service.js'`, then `mcpConfigReaderService.readMcpConfig(projectPath)`
- **Datenfluss:** projectPath -> McpServerSummary[]
- **Story:** Phase 1 Story
- **Validierung:** `grep -r "mcpConfigReaderService" ui/src/server/routes/team.routes.ts`

**VERBINDUNG-2: team-view.ts -> GET /api/team/:path/mcp-config**
- **Art:** REST API Call (fetch)
- **Schnittstelle:** `fetch(/api/team/${encodedPath}/mcp-config)`
- **Datenfluss:** McpConfigResponse -> McpServerSummary[] in state
- **Story:** Phase 2 Story
- **Validierung:** `grep -r "mcp-config" ui/frontend/src/views/team-view.ts`

**VERBINDUNG-3: team-view.ts -> aos-mcp-server-card (MCP-Uebersicht)**
- **Art:** Lit Component Import + Property Binding
- **Schnittstelle:** `<aos-mcp-server-card .server=${server}></aos-mcp-server-card>`
- **Datenfluss:** McpServerSummary -> Card-Rendering
- **Story:** Phase 2 Story
- **Validierung:** `grep -r "aos-mcp-server-card" ui/frontend/src/views/team-view.ts`

**VERBINDUNG-4: team-view.ts -> aos-team-card (MCP availability data)**
- **Art:** Property Binding
- **Schnittstelle:** `.availableMcpTools=${this.mcpServerNames}` auf aos-team-card
- **Datenfluss:** string[] (verfuegbare MCP-Tool-Namen) fuer Verwaist-Check
- **Story:** Phase 3/4 Story
- **Validierung:** `grep -r "availableMcpTools" ui/frontend/src/views/team-view.ts`

**VERBINDUNG-5: aos-team-edit-modal -> MCP-Config-Daten + Save via API**
- **Art:** Props von team-view + mcpTools-Feld in PUT-Request
- **Schnittstelle:** Checkbox-State -> mcpTools Array -> PUT API mit mcpTools-Feld -> Server schreibt Frontmatter
- **Datenfluss:** Ausgewaehlte MCP-Tools -> PUT API -> Server aktualisiert SKILL.md Frontmatter
- **Story:** Phase 3 Story
- **Validierung:** `grep -r "mcpTools" ui/frontend/src/components/team/aos-team-edit-modal.ts`

### Verbindungs-Checkliste
- [x] Jede neue Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungsbefehle sind ausfuehrbar

---

## Abhaengigkeiten

### Interne Abhaengigkeiten
```
McpConfigReaderService ──depends on──> team.protocol.ts (McpServerSummary)
team.routes.ts ──uses──> McpConfigReaderService
team.routes.ts ──uses──> skillsReaderService (besteht schon)
skills-reader.service.ts ──produces──> SkillSummary.mcpTools (neues Feld)
team-view.ts ──fetches──> GET /api/team/:path/mcp-config
team-view.ts ──fetches──> GET /api/team/:path/skills (besteht schon)
aos-mcp-server-card ──receives──> McpServerSummary (via property)
aos-team-card ──receives──> SkillSummary.mcpTools + availableMcpTools (via properties)
aos-team-edit-modal ──needs──> McpServerSummary[] (fuer Checkbox-Liste)
```

### Externe Abhaengigkeiten
- Keine neuen externen Libraries noetig
- `.mcp.json`-Dateiformat: Definiert durch Claude Code, stabile Struktur

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| `.mcp.json` enthaelt sensible env-Daten (API-Keys) | High | High | McpConfigReaderService filtert `env`-Feld heraus, sendet NIEMALS env-Daten ans Frontend. Nur name, type, command, args. |
| Frontmatter-Manipulation koennte bestehende Formatierung zerstoeren | Medium | Medium | Server-seitige Frontmatter-Manipulation: PUT-API akzeptiert optionales `mcpTools`-Array, Server schreibt Frontmatter korrekt. Frontend manipuliert SKILL.md-Content nicht direkt. |
| Monorepo-Layout: `.mcp.json` im Parent-Verzeichnis | Low | Medium | Bestehendes Pattern aus `project-context.service.ts` mit Parent-Directory-Fallback nutzen. |
| Performance bei vielen MCP-Servern | Low | Low | `.mcp.json` ist typischerweise klein (< 1KB). Kein Caching noetig. |

---

## Self-Review Ergebnisse

### Validiert
- Alle 9 funktionalen Requirements aus der Requirements Clarification sind abgedeckt
- Die bestehende Architektur (REST + Service + Lit Components) wird konsistent weiterverwendet
- Edge Cases (fehlende `.mcp.json`, invalides JSON, verwaiste Referenzen, fehlende `mcpServers`) sind alle adressiert
- Das `env`-Feld in `.mcp.json` wird NICHT ans Frontend gesendet (Sicherheitsrisiko: API-Keys)
- Alle neuen Komponenten haben mindestens eine definierte Verbindung

### Identifizierte Probleme & Loesungen

| Problem | Urspruenglicher Plan | Verbesserung |
|---------|--------------------|--------------|
| Frontmatter-Manipulation im Frontend ist fehleranfaellig | Frontend manipuliert SKILL.md-String direkt | **Besser:** PUT-API um optionales `mcpTools`-Array erweitern, Server schreibt Frontmatter korrekt. Das Edit-Modal sendet `{ content: "...", mcpTools: ["tool1", "tool2"] }` und der Server fuegt `mcpTools` ins Frontmatter ein. |
| Edit-Modal braeuchte MCP-Server-Liste, muesste separat laden | Eigener Fetch im Modal | **Besser:** team-view.ts laedt MCP-Config einmal und reicht sie als Property ans Edit-Modal weiter. |
| `env`-Feld in `.mcp.json` enthaelt API-Keys | Alles 1:1 senden | McpConfigReaderService stripped `env` komplett, sendet nur name/type/command/args. |

### Offene Fragen
- Keine. Alle Requirements sind klar spezifiziert und die Architektur ist durch die bestehende Codebase vorgegeben.

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar fuer |
|---------|-------------|-------------|
| `.mcp.json` Lese-Pattern mit Monorepo-Support | `project-context.service.ts` (`detectMcpKanban()`) | `McpConfigReaderService` - Gleiche Logik fuer Pfad-Resolution |
| `team-section` CSS-Klassen | `theme.css` | MCP-Sektion in team-view (wiederverwendet `.team-section`, `.team-section__title`) |
| Frontmatter-Regex-Parsing | `skills-reader.service.ts` (`parseFrontmatter()`) | Erweiterung um `mcpTools` Array-Parsing - gleiches Pattern wie `globs` |
| Card-Component-Pattern | `aos-team-card.ts` | `aos-mcp-server-card` folgt dem gleichen Muster (Light DOM, Property Binding, Click Events) |
| REST Route Handler Pattern | `team.routes.ts` | Neuer MCP-Config-Endpunkt nutzt exakt das gleiche Pattern |
| Test-Setup | `tests/team/skills-reader.service.test.ts` | `mcp-config-reader.service.test.ts` nutzt das gleiche tmpdir/beforeEach/afterEach Pattern |

### Optimierungen

| Urspruenglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| Neuer Router + neue Route-Datei fuer MCP | Erweiterung von `team.routes.ts` um einen Endpunkt | Kein neuer Router, keine Aenderung in `index.ts` |
| Edit-Modal laedt MCP-Config selbst via Fetch | team-view.ts laedt einmal, reicht als Prop weiter | Ein API-Call weniger pro Modal-Oeffnung |
| Frontend-Frontmatter-Manipulation | Server-seitige mcpTools-Integration in PUT-API | Robuster, weniger fehleranfaellig |
| Separate MCP-Types-Datei | Erweiterung von `team.protocol.ts` | Eine Datei weniger, alles Team-bezogene zusammen |

### Feature-Preservation bestaetigt
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfuellbar

---

## Naechste Schritte

Nach Genehmigung dieses Plans:
1. Step 2.6: User Stories aus diesem Plan ableiten (5-7 Stories erwartet)
2. Step 3: Architect fuegt technische Details hinzu (File-Pfade, Code-Patterns, Schnittstellen)
3. Step 4: Spec ready for execution
