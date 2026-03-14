# Comment Count Backend Integration

> Story ID: BLC-002
> Spec: Backlog Item Comments
> Created: 2026-03-14
> Last Updated: 2026-03-14

**Priority**: Medium
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: BLC-001

---

## Feature

```gherkin
Feature: Kommentar-Anzahl pro Backlog Item berechnen
  Als Specwright Web UI Nutzer
  möchte ich die Anzahl der Kommentare pro Backlog Item kennen,
  damit ich auf einen Blick sehe, welche Items Diskussionen haben.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Comment Count wird berechnet

```gherkin
Scenario: Backlog Item mit Kommentaren zeigt korrekte Anzahl
  Given das Backlog Item "bug-005-login-fix" hat 3 Kommentare in comments.json
  When das Kanban Board geladen wird
  Then enthält die Item-Information ein commentCount von 3
```

### Szenario 2: Item ohne Kommentare

```gherkin
Scenario: Backlog Item ohne Kommentare zeigt Count 0
  Given das Backlog Item "todo-010-refactor" hat keine comments.json
  When das Kanban Board geladen wird
  Then enthält die Item-Information ein commentCount von 0
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Leere comments.json
  Given das Backlog Item hat eine comments.json mit leerem Array
  When das Kanban Board geladen wird
  Then enthält die Item-Information ein commentCount von 0
```

---

## Technische Verifikation (Automated Checks)

- CONTAINS: `ui/src/server/backlog-reader.ts` → `commentCount`
- BUILD_PASS: `cd ui && npm run build:backend`
- LINT_PASS: `cd ui && npm run lint`

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
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

- [x] `commentCount` Berechnung in `backlog-reader.ts` implementiert (analog `attachmentCount`)
- [x] `BacklogStoryInfo` Interface um `commentCount?: number` erweitert
- [x] `comments.json` wird gelesen und Array-Länge als Count zurückgegeben
- [x] Fehlende/leere `comments.json` gibt Count 0 zurück
- [x] Backend Build erfolgreich (`cd ui && npm run build:backend`)
- [x] Lint fehlerfrei (`cd ui && npm run lint`)
- [x] Alle Akzeptanzkriterien erfüllt

**Integration DoD:**
- [x] **Integration: backlog-reader.ts → comments.json (Dateisystem)**
  - [x] Liest `comments.json` aus Attachment-Verzeichnis
  - [x] Validierung: `grep -q "commentCount" ui/src/server/backlog-reader.ts`

---

### Betroffene Layer & Komponenten

- **Integration Type:** Backend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Service | `ui/src/server/backlog-reader.ts` | MODIFY: commentCount Berechnung parallel zu attachmentCount in getKanbanBoard() |

---

### Technical Details

**WAS:**
- `commentCount` Berechnung in `getKanbanBoard()` Methode von `backlog-reader.ts` hinzufügen
- `BacklogStoryInfo` Interface um optionales `commentCount` Feld erweitern

**WIE (Architecture Guidance):**
- Folge dem bestehenden `attachmentCount` Pattern in `getKanbanBoard()`
- `Promise.all()` Parallelisierung wie bei `attachmentCount`
- Lese `{projectDir}/backlog/items/attachments/{itemId}/comments.json`, parse JSON, zähle Array-Länge
- Bei fehlender Datei oder leerem Array: Count = 0
- Kein separater Service nötig - direkte JSON-Parse im Reader reicht

**WO:**
- `ui/src/server/backlog-reader.ts` (MODIFY: commentCount Logik + Interface-Erweiterung)

**Abhängigkeiten:** BLC-001 (comments.json Struktur muss definiert sein)

**Geschätzte Komplexität:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | .claude/skills/backend-express/SKILL.md | Express Backend Patterns |

---

### Creates Reusable Artifacts

Creates Reusable: no

---

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
grep -q "commentCount" ui/src/server/backlog-reader.ts && echo "Comment count exists"
cd ui && npm run build:backend
cd ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
