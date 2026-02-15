# MCP Kanban Tool Anpassung

> Story ID: KIRC-002
> Spec: Kanban In Review Column
> Created: 2026-02-12
> Last Updated: 2026-02-12

**Priority**: Critical
**Type**: Backend
**Estimated Effort**: S
**Status**: Done
**Dependencies**: KIRC-001

---

## Feature

```gherkin
Feature: MCP Kanban Tool für In Review Workflow
  Als Entwickler
  möchte ich dass das MCP Kanban Tool Stories auf "in_review" setzt statt "done",
  damit abgeschlossene Stories erst nach meiner manuellen Prüfung als fertig gelten.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Complete Story setzt auf In Review

```gherkin
Scenario: kanban_complete_story setzt Status auf "in_review"
  Given eine Story befindet sich im Status "in_progress"
  When das MCP Tool "kanban_complete_story" aufgerufen wird
  Then wird der Story-Status auf "in_review" gesetzt
  And die boardStatus-Statistik zeigt 1 Story unter "inReview"
```

### Szenario 2: Approve Story setzt auf Done

```gherkin
Scenario: Neues Tool kanban_approve_story setzt auf "done"
  Given eine Story befindet sich im Status "in_review"
  When das MCP Tool "kanban_approve_story" aufgerufen wird
  Then wird der Story-Status auf "done" gesetzt
  And die Statistiken werden korrekt aktualisiert
  And der changeLog erhält einen Eintrag
```

### Szenario 3: Approve nur von In Review möglich

```gherkin
Scenario: kanban_approve_story nur von in_review Status
  Given eine Story befindet sich im Status "in_progress"
  When das MCP Tool "kanban_approve_story" aufgerufen wird
  Then wird ein Fehler zurückgegeben
  And der Status bleibt unverändert
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Get Next Task zählt in_review nicht als fertig
  Given 3 Stories existieren: 1 "done", 1 "in_review", 1 "ready"
  When "kanban_get_next_task" aufgerufen wird
  Then wird die "ready" Story als nächste zurückgegeben
  And "remainingStories" zählt die "in_review" Story NICHT als fertig
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [x] CONTAINS: `kanban-mcp-server.ts` enthält "kanban_approve_story" Tool-Definition
- [x] CONTAINS: `kanban-mcp-server.ts` setzt in `handleKanbanCompleteStory` Status auf "in_review"

### Funktions-Prüfungen

- [x] LINT_PASS: TypeScript Compilation des MCP Servers

---

## Required MCP Tools

Keine MCP Tools erforderlich (wir ÄNDERN das MCP Tool selbst).

---

## Technisches Refinement (vom Architect)

> **Dieser Abschnitt wird vom Architect ausgefüllt**

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

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** (Frontend/Backend/Database/DevOps)
- [x] **Integration Type bestimmt** (Backend-only/Frontend-only/Full-stack)
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer: API Contracts, Data Structures)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Code Review durchgeführt und genehmigt
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [x] Dokumentation aktualisiert

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only (externer MCP Server ausserhalb des Projekt-Repos)

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend (extern) | `~/.agent-os/scripts/mcp/kanban-mcp-server.ts` | `handleKanbanCompleteStory`: Status von `'done'` auf `'in_review'` aendern; Phase auf `'in_progress'` statt `'done'` setzen |
| Backend (extern) | `~/.agent-os/scripts/mcp/kanban-mcp-server.ts` | Neues Tool `kanban_approve_story` + Handler `handleKanbanApproveStory` |
| Backend (extern) | `~/.agent-os/scripts/mcp/kanban-mcp-server.ts` | TOOLS Array: neue Tool-Definition; CallToolRequestSchema switch-case: neuer Case |

**WICHTIG: Externer Pfad!** Diese Datei liegt NICHT im Projekt-Repository, sondern unter `~/.agent-os/scripts/mcp/kanban-mcp-server.ts`. Der implementierende Agent muss den absoluten Pfad verwenden.

---

### Technical Details

**WAS:** MCP Kanban Tool anpassen, sodass `kanban_complete_story` Stories auf `in_review` setzt statt `done`, und ein neues `kanban_approve_story` Tool erstellen, das von `in_review` auf `done` setzt.

**WIE (Architektur-Guidance ONLY):**
- `handleKanbanCompleteStory` (Zeile 814): `story.status` auf `'in_review'` statt `'done'` setzen; `story.phase` auf `'in_progress'` statt `'done'` setzen; `story.timing.completedAt` NICHT setzen (Story ist noch nicht endgueltig fertig); `story.verification.dodChecked` auf `false` lassen (DoD erst bei Approve)
- `remainingStories` Logik (Zeile 847): Filter anpassen - `in_review` zaehlt NICHT als fertig, d.h. `s.status !== 'done'` bleibt korrekt (da `in_review` !== `done`)
- Execution-Completion-Check (Zeile 853-858): Nicht mehr nur auf `done` pruefen, sondern: Spec ist erst komplett wenn ALLE Stories `done` sind (nicht `in_review`)
- Neues Tool `kanban_approve_story`: Tool-Definition nach bestehendem Pattern im TOOLS Array (Parameter: specId, storyId); Handler `handleKanbanApproveStory` nach Pattern von `handleKanbanCompleteStory`; Guard: Nur von `in_review` Status aufrufbar (sonst Error); Setzt `story.status = 'done'`, `story.phase = 'done'`, `story.timing.completedAt = now`, `story.verification.dodChecked = true`; updateBoardStatus + updateStatistics aufrufen; changeLog-Eintrag
- CallToolRequestSchema Handler (Zeile 502): Neuen `case 'kanban_approve_story'` hinzufuegen
- `kanban_get_next_task` Tool: `in_review` Stories werden korrekt uebersprungen (sucht nur nach `ready`)

**WO:**
- `~/.agent-os/scripts/mcp/kanban-mcp-server.ts` (1 Datei, ca. 80 LOC neue/geaenderte Zeilen)

**WER:** dev-team__backend-developer

**Abhängigkeiten:** KIRC-001 (Backend Schema muss `in_review` als eigenstaendigen Status behandeln)

**Geschätzte Komplexität:** S (1 Datei, ~80 LOC)

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| `kanban_approve_story` | MCP Tool | `~/.agent-os/scripts/mcp/kanban-mcp-server.ts` | Neues MCP Tool zum Genehmigen von Stories (in_review -> done). Wird auch vom `/execute-tasks` Workflow genutzt. |

---

### Relevante Skills

| Skill | Pfad | Relevanz |
|-------|------|----------|
| backend-express/services | `.claude/skills/backend-express/services.md` | Service-Layer Patterns (Handler-Funktionen) |
| domain-agent-os-web-ui/task-tracking | `.claude/skills/domain-agent-os-web-ui/task-tracking.md` | Kanban/Story Status Domain Knowledge |
| domain-agent-os-web-ui/workflow-execution | `.claude/skills/domain-agent-os-web-ui/workflow-execution.md` | MCP Tool Execution Patterns |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten

# 1. Neues Tool kanban_approve_story existiert
grep -q "kanban_approve_story" ~/.agent-os/scripts/mcp/kanban-mcp-server.ts

# 2. handleKanbanCompleteStory setzt in_review statt done
grep -q "in_review" ~/.agent-os/scripts/mcp/kanban-mcp-server.ts

# 3. handleKanbanApproveStory Handler existiert
grep -q "handleKanbanApproveStory" ~/.agent-os/scripts/mcp/kanban-mcp-server.ts

# 4. TOOLS Array hat approve-Tool Definition
grep -c "kanban_approve_story" ~/.agent-os/scripts/mcp/kanban-mcp-server.ts | grep -q "[2-9]\|[1-9][0-9]"
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle grep commands exit 0
3. Git diff zeigt nur Aenderungen in `~/.agent-os/scripts/mcp/kanban-mcp-server.ts`
