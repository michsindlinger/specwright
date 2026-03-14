# Comment Count Badge on Story Card

> Story ID: BLC-005
> Spec: Backlog Item Comments
> Created: 2026-03-14
> Last Updated: 2026-03-14

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: BLC-002

---

## Feature

```gherkin
Feature: Kommentar-Anzahl auf Story Card anzeigen
  Als Specwright Web UI Nutzer
  möchte ich auf der Story Card sehen, wie viele Kommentare ein Item hat,
  damit ich auf einen Blick erkenne, welche Items Diskussionen enthalten.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Comment-Count Badge anzeigen

```gherkin
Scenario: Story Card zeigt Kommentar-Anzahl
  Given ein Backlog Item hat 5 Kommentare
  When ich das Kanban Board betrachte
  Then sehe ich neben dem Attachment-Icon ein Kommentar-Icon
  And das Kommentar-Icon zeigt die Zahl "5"
```

### Szenario 2: Kein Badge bei 0 Kommentaren

```gherkin
Scenario: Story Card ohne Kommentare zeigt keinen Count
  Given ein Backlog Item hat 0 Kommentare
  When ich das Kanban Board betrachte
  Then sehe ich das Kommentar-Icon ohne Zahl
  And das Icon erscheint nur beim Hover über die Card
```

### Szenario 3: Klick auf Comment-Badge

```gherkin
Scenario: Klick auf Comment-Icon navigiert zur Detail-Ansicht
  Given ein Backlog Item hat Kommentare
  When ich auf das Kommentar-Icon klicke
  Then öffnet sich die Detail-Ansicht des Items
```

---

## Technische Verifikation (Automated Checks)

- CONTAINS: `story-card.ts` enthält `commentCount` Property
- CONTAINS: `story-card.ts` enthält Comment-Icon/Badge Rendering
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

- [ ] `StoryInfo` Interface in `story-card.ts` um `commentCount?: number` erweitert
- [ ] Comment-Icon (Chat-Bubble/MessageCircle) neben Attachment-Icon auf Story Card gerendert
- [ ] Comment-Count Badge (Zahl) angezeigt wenn commentCount > 0
- [ ] Icon-only (ohne Zahl) bei commentCount === 0, sichtbar nur bei Hover
- [ ] Klick auf Comment-Icon dispatcht `comment-open` CustomEvent
- [ ] CSS-Styling konsistent mit bestehendem Attachment-Button
- [ ] Frontend Build erfolgreich (`cd ui/frontend && npm run build`)
- [ ] Lint fehlerfrei (`cd ui && npm run lint`)

**Integration DoD:**
- [ ] **Integration: backlog-reader.ts → story-card.ts (commentCount Property)**
  - [ ] commentCount wird vom Backend geliefert und in StoryInfo genutzt
  - [ ] Validierung: `grep -q "commentCount" ui/frontend/src/components/story-card.ts`

---

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Presentation | `ui/frontend/src/components/story-card.ts` | MODIFY: commentCount Property, Comment-Icon + Badge, comment-open Event |

---

### Technical Details

**WAS:**
- `StoryInfo` Interface um `commentCount?: number` erweitern
- Comment-Button mit Icon und Count-Badge analog zum Attachment-Button rendern
- `comment-open` CustomEvent dispatchen bei Klick

**WIE (Architecture Guidance):**
- Folge exakt dem Attachment-Button-Pattern in `story-card.ts` (Zeilen ~642-654)
- Chat-Bubble Icon (Lucide `MessageCircle` oder inline SVG)
- Conditional Rendering: Badge-Zahl nur wenn commentCount > 0
- CSS-Klasse `has-comments` analog zu `has-attachments` für visuelles Feedback
- CustomEvent `comment-open` mit `detail: { itemId }` (bubbles: true, composed: true)
- Icon-Position: Neben dem Attachment-Button in der Metadata-Row der Card

**WO:**
- `ui/frontend/src/components/story-card.ts` (MODIFY: Interface + Rendering + Event)

**Abhängigkeiten:** BLC-002 (commentCount muss vom Backend berechnet werden)

**Geschätzte Komplexität:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Rendering, Events |

---

### Creates Reusable Artifacts

Creates Reusable: no

---

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
grep -q "commentCount" ui/frontend/src/components/story-card.ts && echo "commentCount property exists"
grep -q "comment-open\|commentOpen" ui/frontend/src/components/story-card.ts && echo "Comment event exists"
cd ui/frontend && npm run build
cd ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
