# Implementierungsplan: Custom Team Members

> **Status:** PENDING_USER_REVIEW
> **Spec:** specwright/specs/2026-02-26-custom-team-members/
> **Erstellt:** 2026-02-26
> **Basiert auf:** requirements-clarification.md

> **Geladenes Project Knowledge:** ui-components.md, api-contracts.md, shared-services.md, data-models.md

---

## Executive Summary

Erweiterung der Specwright Team-Seite um benutzerdefinierte Teammitglieder (Einzelpersonen und Teams), die interaktiv per `/add-team-member` Slash-Command erstellt, in einem Markdown-Editor bearbeitet und per REST DELETE Endpoint gelöscht werden können. Die Änderungen betreffen den gesamten Stack: neuer Workflow + Command, Backend-Erweiterung für Frontmatter-Parsing und gruppierte Responses, Frontend-Umbau mit Sektionsdarstellung, und ein neues Edit-Modal mit CodeMirror-Integration.

---

## Architektur-Entscheidungen

### Gewählter Ansatz
**Erweitern statt Ersetzen:** Die bestehende Skills-Architektur (`.claude/skills/` Ordner mit `SKILL.md` + Frontmatter) wird um zwei neue Frontmatter-Felder (`teamType`, `teamName`) erweitert. Keine neuen Datenstrukturen, kein neuer Storage -- alles bleibt dateibasiert im bestehenden Pattern.

### Begründung
- Die SKILL.md-Datei mit YAML-Frontmatter ist bereits der Standard für alle Skills. Neue Felder sind additiv und brechen nichts.
- Rückwärtskompatibilität ist automatisch gewährleistet: Skills ohne `teamType` werden als `devteam` behandelt.
- Die Edit-Funktionalität nutzt den bereits vorhandenen `aos-file-editor` (CodeMirror 6) wieder, statt einen neuen Editor zu bauen.

### Delete-Mechanismus
**Empfehlung: REST DELETE Endpoint** statt MCP-Command:
- Direkter API-Call, sofortiges Feedback, bessere UX
- Konsistent mit bestehender REST-API-Architektur
- MCP-Server bleibt für Kanban-Operationen reserviert

### Patterns und Technologien
- **Erweitertes Frontmatter-Parsing** mit Regex (bestehendes Pattern aus `SkillsReaderService.parseFrontmatter`)
- **Client-seitige Gruppierung** der Skills nach teamType (Frontend, kein Backend-Grouping nötig)
- **Modal mit CodeMirror** (bestehendes `aos-file-editor` Pattern)
- **Confirmation Dialog** (bestehendes `aos-confirm-dialog`)
- **Event-basierte Workflow-Trigger** via `workflow-start-interactive` Custom Event

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `/add-team-member` Workflow | Workflow (Markdown) | Interaktiver Dialog-Flow zur Erstellung von Custom-Skills mit `teamType/teamName` Frontmatter |
| `/add-team-member` Command | Command (Markdown) | Slash-Command-Definition, verweist auf Workflow |
| `aos-team-edit-modal` | UI (Lit Component) | Modal mit CodeMirror-Editor zum Bearbeiten von SKILL.md Inhalt |
| `PUT /api/team/:projectPath/skills/:skillId` | API Endpoint | Speichern von geändertem SKILL.md Inhalt |
| `DELETE /api/team/:projectPath/skills/:skillId` | API Endpoint | Löschen eines Skill-Ordners (inkl. aller Dateien) |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `SkillsReaderService` | Erweitern | `teamType` und `teamName` aus Frontmatter parsen, `deleteSkill()` und `updateSkillContent()` Methoden |
| `SkillSummary` / `SkillDetail` (team.protocol.ts) | Erweitern | Neue Felder `teamType` und `teamName` zum Interface |
| `team.routes.ts` | Erweitern | PUT und DELETE Endpoints |
| `aos-team-view` | Refactoren | Gruppierte Darstellung, "Add Team Member" Button, Event-Handling |
| `aos-team-card` | Erweitern | Edit/Delete Buttons, `teamType`-Badge |
| `aos-team-detail-modal` | Erweitern | Edit-Button und Delete-Button im Modal-Header |
| `theme.css` | Erweitern | CSS für Team-Sektionen, Edit-Modal, Buttons |
| `app.ts` | Minimal | `workflow-start-interactive` Event-Handling, Refresh-Trigger |

### Nicht betroffen (explizit)
- **MCP Server** (`kanban-mcp-server.ts`) -- Delete läuft über REST
- **Andere Views** (Specs, Getting Started, Chat, Settings)
- **Bestehende Skills** -- keine Migration, volle Rückwärtskompatibilität

---

## Umsetzungsphasen

### Phase 1: Datenmodell und Backend-Foundation
**Ziel:** Shared Types erweitern, Backend-Service um `teamType/teamName` Parsing, PUT und DELETE Endpoints
**Komponenten:** `team.protocol.ts`, `skills-reader.service.ts`, `team.routes.ts`
**Abhängig von:** Nichts (Startphase)

### Phase 2: Workflow und Command
**Ziel:** `/add-team-member` Workflow + Command für interaktive Skill-Erstellung im Terminal
**Komponenten:** `specwright/workflows/team/add-team-member.md`, `.claude/commands/specwright/add-team-member.md`
**Abhängig von:** Phase 1 (Frontmatter-Format muss definiert sein)

### Phase 3: Frontend - Gruppierte Darstellung
**Ziel:** Team-Seite zeigt Skills gruppiert nach DevTeam / Custom Teams / Einzelpersonen
**Komponenten:** `aos-team-view`, `aos-team-card`, `theme.css`
**Abhängig von:** Phase 1 (Backend liefert `teamType`/`teamName`)

### Phase 4: Frontend - Edit und Delete
**Ziel:** SKILL.md bearbeiten im Modal-Editor, Skills löschen mit Confirmation Dialog
**Komponenten:** `aos-team-edit-modal` (NEU), `aos-team-detail-modal`, `aos-team-card`, `theme.css`
**Abhängig von:** Phase 1 (PUT/DELETE Endpoints), Phase 3 (Buttons in Cards/Modal)

### Phase 5: Integration und Workflow-Trigger
**Ziel:** "Add Team Member" Button triggert Workflow im Terminal, Skills-Liste refresht nach Änderungen
**Komponenten:** `aos-team-view`, `app.ts`
**Abhängig von:** Phase 2 + Phase 3 + Phase 4

---

## Komponenten-Verbindungen

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|-------------------|-------------|
| `SkillsReaderService` | `team.protocol.ts` | Import (Types) | Phase 1 | `grep "teamType" team.protocol.ts` |
| `team.routes.ts` | `SkillsReaderService` | Service Call (PUT/DELETE) | Phase 1 | `grep "updateSkillContent\|deleteSkill" team.routes.ts` |
| `/add-team-member` Workflow | `.claude/skills/[name]/SKILL.md` | File Creation | Phase 2 | SKILL.md enthält `teamType:` |
| `/add-team-member` Command | `/add-team-member` Workflow | Reference | Phase 2 | `grep "add-team-member" .claude/commands/` |
| `aos-team-view` | Backend API (GET) | REST API Call | Phase 3 | `grep "teamType" team-view.ts` |
| `aos-team-view` | `aos-team-card` | Lit Property Binding | Phase 3 | `grep "aos-team-card" team-view.ts` |
| `aos-team-card` | `aos-team-view` | Custom Event (edit/delete) | Phase 4 | `grep "edit-click\|delete-click" aos-team-card.ts` |
| `aos-team-detail-modal` | `aos-team-view` | Custom Event (edit/delete) | Phase 4 | `grep "edit-click\|delete-click" aos-team-detail-modal.ts` |
| `aos-team-view` | `aos-team-edit-modal` | Lit Property Binding | Phase 4 | `grep "aos-team-edit-modal" team-view.ts` |
| `aos-team-edit-modal` | Backend API (PUT) | REST API Call | Phase 4 | `grep "PUT\|fetch.*skills" aos-team-edit-modal.ts` |
| `aos-team-view` | `aos-confirm-dialog` | Lit Property Binding | Phase 4 | `grep "aos-confirm-dialog" team-view.ts` |
| `aos-team-view` | Backend API (DELETE) | REST API Call | Phase 4 | `grep "DELETE" team-view.ts` |
| `aos-team-view` | `app.ts` | Custom Event (workflow-start) | Phase 5 | `grep "workflow-start-interactive" team-view.ts` |

### Verbindungs-Checkliste
- [x] Jede neue Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Phase zugeordnet
- [x] Validierungsbefehle sind ausführbar

---

## Abhängigkeiten

### Interne Abhängigkeiten
```
Phase 2 (Workflow) ──depends on──> Phase 1 (Frontmatter-Format)
Phase 3 (Grouped Display) ──depends on──> Phase 1 (Backend liefert teamType)
Phase 4 (Edit/Delete) ──depends on──> Phase 1 (PUT/DELETE Endpoints)
Phase 4 (Edit/Delete) ──depends on──> Phase 3 (Buttons in Cards)
Phase 5 (Integration) ──depends on──> Phase 2 + Phase 3 + Phase 4
```

### Externe Abhängigkeiten
- **CodeMirror 6:** Bereits vorhanden (`aos-file-editor`)
- **Keine neuen npm-Pakete erforderlich**

---

## Risiken und Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Frontmatter-Parsing bricht bei ungültigem YAML | Low | Med | Defensives Regex-Parsing (bereits vorhanden), Fallback auf Defaults |
| Delete löscht DevTeam-Skills versehentlich | Med | High | Warnung im Confirmation Dialog bei Skills ohne `teamType` |
| Workflow generiert Skills mit falschem Frontmatter | Low | Med | Validation im Workflow, Unit-Tests für `parseFrontmatter` |
| CodeMirror-Reuse im Edit-Modal | Low | Med | `aos-file-editor` ist bereits für Re-Embedding designed |
| Concurrent Edit: User editiert während Workflow läuft | Low | Low | Last-Write-Wins akzeptabel bei Single-User |

---

## Self-Review Ergebnisse

### Validiert
- Alle 6 High-Level User Stories aus der Requirements Clarification sind durch Phasen abgedeckt
- Rückwärtskompatibilität durch additive Änderungen gewährleistet
- Alle neuen Komponenten haben mindestens eine definierte Verbindung
- Alle Verbindungen sind einer Phase zugeordnet
- Bestehende Patterns werden konsistent wiederverwendet

### Identifizierte Probleme und Lösungen

| Problem | Ursprünglicher Plan | Verbesserung |
|---------|---------------------|-------------|
| Delete über MCP-Command ist für UI umständlich | MCP-Command (Requirements) | REST DELETE Endpoint -- direkter API-Call, bessere UX |
| Separate Edit-Modal Komponente nötig? | Beides validiert | Separate Komponente für Separation of Concerns (Detail=ReadOnly, Edit=ReadWrite) |
| Frontend-Gruppierung bei vielen Teams | Flache Gruppierung | Reicht für MVP (typisch < 30 Skills), Collapse optional als Stretch |

### Offene Fragen für User
1. **Delete-Mechanismus:** REST DELETE Endpoint (Empfehlung) oder MCP-Command (wie in Requirements)?
2. **Dokumenten-Templates:** Sollen Templates im Skill-Ordner auch über UI editierbar sein, oder nur SKILL.md?

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| `parseFrontmatter()` Pattern | `skills-reader.service.ts` | Erweitern statt neu schreiben (2 neue Regex-Zeilen) |
| `aos-confirm-dialog` | Bestehendes Lit Component | Direkt wiederverwendbar für Delete |
| `aos-file-editor` (CodeMirror 6) | Bestehendes Lit Component | Wiederverwendbar im Edit-Modal |
| `workflow-start-interactive` Event | `app.ts`, `aos-getting-started-view.ts` | Direkt nutzbar für Add-Button |
| `getCategoryClass()` Methode | `aos-team-card.ts` | Erweitern um Team-Type-Badge |
| Modal-Pattern | `aos-team-detail-modal.ts`, `aos-quick-todo-modal.ts` | Template für `aos-team-edit-modal` |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|-------------|-----------|
| Neuen Markdown-Editor bauen | `aos-file-editor` wiederverwenden | > 200 LOC vermieden |
| Neuen Confirm-Dialog bauen | `aos-confirm-dialog` wiederverwenden | > 100 LOC vermieden |
| Backend-Gruppierung | Client-seitige Gruppierung | Kein neuer Endpoint nötig |
| MCP-Tools für Delete | REST DELETE Endpoint | Einfacher, konsistenter |
| Separates Frontmatter-Parsing | Erweiterung bestehender Methode | 2 Zeilen statt neue Methode |

### Feature-Preservation
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar
- [x] Rückwärtskompatibilität gewährleistet
