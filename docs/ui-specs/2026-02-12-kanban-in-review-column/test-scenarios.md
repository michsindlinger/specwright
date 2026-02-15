# Test-Szenarien: Kanban In Review Column

> Generiert am 2026-02-13 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-12-kanban-in-review-column

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI für automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung läuft lokal (`npm run dev` im `agent-os-ui` Verzeichnis)
- [ ] MCP Kanban Server läuft (automatisch via Claude Code MCP Config)
- [ ] Mindestens eine Spec mit kanban.json existiert

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Spec | `2026-02-12-kanban-in-review-column` | Test-Spec mit In Review Stories |
| kanban.json | `agent-os/specs/*/kanban.json` | Kanban-Daten mit in_review Status |

---

## Test-Szenarien

### Szenario 1: KIRC-001 - Backend Schema: In Review Status Mapping

**Beschreibung:** Backend mappt `in_review` Status korrekt zwischen kanban.json und Frontend

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Story in kanban.json manuell auf `"status": "in_review"` setzen | JSON valide |
| 2 | Frontend Kanban-Board der Spec öffnen | Board lädt ohne Fehler |
| 3 | Story-Card in der Spalte prüfen | Story erscheint in "In Review"-Spalte (nicht "In Progress") |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Backward Compatibility | Bestehende Spec ohne `in_review` Stories laden | Alle Stories werden normal angezeigt, "In Review"-Spalte ist leer |
| Roundtrip | Frontend sendet `in_review` → Backend speichert → Frontend liest | Status bleibt `in_review` nach Roundtrip |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Ungültiger Status | Manuell `"status": "invalid"` in kanban.json | Graceful Fallback auf Backlog |

---

### Szenario 2: KIRC-002 - MCP Kanban Tool Anpassung

**Beschreibung:** MCP Tools `kanban_complete_story` und `kanban_approve_story` funktionieren korrekt

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | `kanban_complete_story` für eine `in_progress` Story aufrufen | Story-Status wird auf `in_review` gesetzt |
| 2 | `kanban_approve_story` für die `in_review` Story aufrufen | Story-Status wird auf `done` gesetzt |
| 3 | boardStatus in kanban.json prüfen | Counter `inReview` und `done` korrekt |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Approve nur von in_review | `kanban_approve_story` auf `in_progress` Story | Fehler: "only in_review stories can be approved" |
| Remaining Count | 3 Stories: 1 done, 1 in_review, 1 ready | `kanban_get_next_task` gibt `ready` Story zurück; `in_review` zählt NICHT als fertig |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Story nicht gefunden | `kanban_approve_story` mit ungültiger storyId | "Story X not found in kanban.json" |
| Falscher Status | `kanban_approve_story` auf `done` Story | "only in_review stories can be approved" |

---

### Szenario 3: KIRC-003 - Frontend Kanban-Board: In Review Spalte

**Beschreibung:** Kanban-Board zeigt 5 Spalten mit "In Review" zwischen "In Progress" und "Done"

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Kanban-Board einer Spec öffnen | 5 Spalten sichtbar: Backlog, In Progress, In Review, Done, Blocked |
| 2 | Spaltenreihenfolge prüfen | "In Review" zwischen "In Progress" und "Done" |
| 3 | Spaltenfarbe prüfen | "In Review" hat orange/amber Farbgebung (distinct von anderen Spalten) |
| 4 | Story via Workflow abschließen | Story erscheint in "In Review"-Spalte |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Leere Spalte | Keine Story hat Status `in_review` | "In Review"-Spalte wird angezeigt mit Counter "0" |
| Mehrere Stories | 3 Stories mit `in_review` | Alle 3 in der Spalte, Counter zeigt "3" |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Keine Spec geladen | Kanban-Board ohne ausgewählte Spec | Leeres Board oder Fehlerhinweis |

---

### Szenario 4: KIRC-004 - Story-Status-Transitionen für In Review

**Beschreibung:** Drag&Drop-Transitionen für Genehmigung und Rückweisung

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Story von "In Review" auf "Done" ziehen | Story verschiebt sich zu "Done", Backend-Status ist `done` |
| 2 | Story von "In Review" auf "In Progress" ziehen | Story verschiebt sich zu "In Progress", kein DoR-Check, kein Workflow-Start |
| 3 | Zurückgewiesene Story via `/execute-tasks` erneut bearbeiten | Story wird ohne erneuten DoR-Check aufgenommen |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Rückweisung ohne Workflow | Story von in_review nach in_progress | Kein Git-Strategy-Dialog, kein Workflow-Trigger |
| DoR-Skip bei Rückweisung | Zurückgewiesene Story hat unerfüllte Dependencies | DoR-Check wird übersprungen (Story war bereits aktiv) |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Ungültige Transition | Story von "In Review" auf "Backlog" ziehen | Aktion wird abgelehnt, Story bleibt in "In Review" |
| Ungültige Transition | Story von "In Review" auf "Blocked" ziehen | Aktion wird abgelehnt, Story bleibt in "In Review" |

---

## Regressions-Checkliste

Bestehende Funktionalität, die nach der Implementierung noch funktionieren muss:

- [ ] Bestehende Kanban-Boards ohne in_review Stories laden korrekt
- [ ] Drag&Drop zwischen Backlog, In Progress und Done funktioniert wie bisher
- [ ] Story-Workflow-Execution via `/execute-tasks` startet korrekt
- [ ] MCP Tool `kanban_complete_story` funktioniert (nun mit in_review statt done)
- [ ] MCP Tool `kanban_start_story` funktioniert unverändert
- [ ] TypeScript Backend kompiliert fehlerfrei
- [ ] boardStatus-Statistiken werden korrekt berechnet

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
Kanban-Board: aos-kanban-board
Spalte In Review: .kanban-column.in-review
Story-Card: .story-card[data-story-id="KIRC-XXX"]
Spalten-Header: .column-header
```

### API-Endpunkte
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| WebSocket: `specs.story.updateStatus` | WS Message | Story-Status via Drag&Drop ändern |
| MCP: `kanban_complete_story` | MCP Tool | Story auf in_review setzen |
| MCP: `kanban_approve_story` | MCP Tool | Story von in_review auf done |

### Mock-Daten
```json
{
  "story": {
    "id": "KIRC-001",
    "status": "in_review",
    "title": "Backend Schema: In Review Status Mapping"
  }
}
```

---

## Notizen

- Die pre-existierenden TypeScript-Fehler in `chat-view.ts` (CSSResultGroup) und `dashboard-view.ts` (unused variables) sind NICHT durch dieses Feature verursacht
- MCP Server-Datei liegt unter `~/.agent-os/scripts/mcp/kanban-mcp-server.ts` (außerhalb des Projekts)
- Backward Compatibility: Bestehende Specs ohne in_review Stories funktionieren unverändert
