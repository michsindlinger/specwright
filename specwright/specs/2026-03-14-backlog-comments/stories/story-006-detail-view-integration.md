# Detail View Integration

> Story ID: BLC-006
> Spec: Backlog Item Comments
> Created: 2026-03-14
> Last Updated: 2026-03-14

**Priority**: High
**Type**: Full-stack
**Estimated Effort**: S
**Dependencies**: BLC-003, BLC-005

---

## Feature

```gherkin
Feature: Kommentar-Thread in Backlog Detail-Ansicht einbinden
  Als Specwright Web UI Nutzer
  möchte ich den Kommentar-Thread in der Detail-Ansicht eines Backlog Items sehen,
  damit ich Kommentare direkt beim Betrachten des Items lesen und schreiben kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Kommentar-Sektion in Detail-Ansicht

```gherkin
Scenario: Kommentar-Thread erscheint unter dem Item-Content
  Given ich bin in der Detail-Ansicht eines Backlog Items
  Then sehe ich den Item-Content (Markdown-Viewer) oben
  And darunter sehe ich die Kommentar-Sektion
  And die Kommentar-Sektion enthält die Liste bestehender Kommentare
  And die Kommentar-Sektion enthält ein Eingabefeld
```

### Szenario 2: End-to-End Flow

```gherkin
Scenario: Vom Kanban Board zum Kommentieren
  Given ich sehe ein Backlog Item auf dem Kanban Board
  When ich auf die Story Card klicke
  Then öffnet sich die Detail-Ansicht
  And ich sehe den Kommentar-Thread
  When ich einen Kommentar schreibe und absende
  Then erscheint der Kommentar in der Liste
  When ich zurück zum Board navigiere
  Then zeigt die Story Card den aktualisierten Comment-Count
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Detail-Ansicht lädt auch ohne Kommentare
  Given ein Backlog Item hat keine Kommentare
  When ich die Detail-Ansicht öffne
  Then sehe ich den Item-Content normal
  And die Kommentar-Sektion zeigt "Noch keine Kommentare"
  And das Eingabefeld ist verfügbar
```

---

## Technische Verifikation (Automated Checks)

- CONTAINS: `dashboard-view.ts` enthält `aos-comment-thread` Element
- CONTAINS: `dashboard-view.ts` importiert `aos-comment-thread.js`
- BUILD_PASS: `cd ui/frontend && npm run build`
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

- [x] `<aos-comment-thread>` in `renderBacklogStoryDetail()` eingebettet unterhalb von `<aos-docs-viewer>`
- [x] Import von `aos-comment-thread.js` in `dashboard-view.ts`
- [x] `itemId` Property korrekt an Komponente übergeben
- [x] Comment-Thread lädt automatisch Kommentare beim Öffnen der Detail-Ansicht
- [x] `comment-open` Event von Story Card öffnet Detail-Ansicht (falls nicht bereits implementiert)
- [x] Frontend Build erfolgreich (`cd ui/frontend && npm run build`)
- [x] Lint fehlerfrei (`cd ui && npm run lint`)

**Integration DoD:**
- [x] **Integration: aos-comment-thread.ts → dashboard-view.ts**
  - [x] Komponente eingebettet und korrekt verbunden
  - [x] Validierung: `grep -q "aos-comment-thread" ui/frontend/src/views/dashboard-view.ts`
- [x] **Integration: story-card.ts (comment-open) → dashboard-view.ts**
  - [x] Event-Handler navigiert zur Detail-Ansicht
  - [x] Validierung: `grep -q "comment-open\|commentOpen" ui/frontend/src/views/dashboard-view.ts`

---

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Presentation | `ui/frontend/src/views/dashboard-view.ts` | MODIFY: Import + `<aos-comment-thread>` in renderBacklogStoryDetail(), comment-open Event Handler |

---

### Technical Details

**WAS:**
- `<aos-comment-thread>` Komponente in die Backlog Detail-Ansicht einbetten
- Comment-open Event von Story Card behandeln

**WIE (Architecture Guidance):**
- Import des Side-Effect-Moduls: `import '../components/comments/aos-comment-thread.js';`
- Platzierung: Unterhalb des `<aos-docs-viewer>` in `renderBacklogStoryDetail()`
- Property Binding: `.itemId=${this.backlogStoryId}`
- Event-Handler für `comment-open` von Story Card: Navigiert zur Detail-Ansicht des Items (analog zum Klick auf die Card selbst)
- Kein neuer State in dashboard-view nötig - die Komponente verwaltet ihren eigenen State

**WO:**
- `ui/frontend/src/views/dashboard-view.ts` (MODIFY: Import + Template-Erweiterung + Event Handler)

**Abhängigkeiten:** BLC-003 (Comment-Thread Komponente), BLC-005 (Comment-Count Badge auf Story Card)

**Geschätzte Komplexität:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Integration, Event Handling |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Dashboard-View Struktur und Patterns |

---

### Creates Reusable Artifacts

Creates Reusable: no

---

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
grep -q "aos-comment-thread" ui/frontend/src/views/dashboard-view.ts && echo "Component embedded"
grep -q "comment-thread" ui/frontend/src/views/dashboard-view.ts && echo "Import exists"
cd ui/frontend && npm run build
cd ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
