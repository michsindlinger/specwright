# Comment Thread Frontend Component

> Story ID: BLC-003
> Spec: Backlog Item Comments
> Created: 2026-03-14
> Last Updated: 2026-03-14

**Priority**: High
**Type**: Frontend
**Estimated Effort**: L
**Dependencies**: BLC-001

---

## Feature

```gherkin
Feature: Kommentar-Thread anzeigen und Kommentare schreiben
  Als Specwright Web UI Nutzer
  möchte ich eine Kommentar-Ansicht mit Eingabefeld sehen,
  damit ich Kommentare lesen, schreiben, bearbeiten und löschen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Kommentar-Liste anzeigen

```gherkin
Scenario: Bestehende Kommentare werden chronologisch angezeigt
  Given das Backlog Item hat 3 Kommentare
  When ich die Kommentar-Ansicht öffne
  Then sehe ich alle 3 Kommentare in chronologischer Reihenfolge (ältester oben)
  And jeder Kommentar zeigt Datum und Uhrzeit
  And jeder Kommentar zeigt den Author
```

### Szenario 2: Neuen Kommentar schreiben

```gherkin
Scenario: Nutzer schreibt einen Markdown-Kommentar
  Given ich bin in der Kommentar-Ansicht eines Backlog Items
  When ich "## Analyse\nDas Problem liegt im **Token-Refresh**" ins Textfeld eingebe
  And ich den Kommentar absende
  Then erscheint der Kommentar am Ende der Liste
  And der Markdown-Text wird gerendert (Überschrift und Fettschrift sichtbar)
  And Datum und Uhrzeit werden angezeigt
```

### Szenario 3: Kommentar bearbeiten

```gherkin
Scenario: Nutzer bearbeitet eigenen Kommentar
  Given ich sehe meinen Kommentar "Erste Analyse"
  When ich über den Kommentar hovere
  And ich auf das Bearbeiten-Icon klicke
  Then öffnet sich ein Textfeld mit dem bestehenden Text
  And ich sehe "Speichern" und "Abbrechen" Buttons
  When ich den Text ändere und "Speichern" klicke
  Then wird der aktualisierte Text angezeigt
  And ein "bearbeitet" Hinweis erscheint
```

### Szenario 4: Kommentar löschen

```gherkin
Scenario: Nutzer löscht eigenen Kommentar
  Given ich sehe meinen Kommentar
  When ich über den Kommentar hovere
  And ich auf das Löschen-Icon klicke
  Then verschwindet der Kommentar aus der Liste
```

### Szenario 5: Leere Kommentar-Liste

```gherkin
Scenario: Item ohne Kommentare zeigt Hinweis
  Given das Backlog Item hat keine Kommentare
  When ich die Kommentar-Ansicht öffne
  Then sehe ich einen Hinweis "Noch keine Kommentare"
  And ich sehe das Eingabefeld
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Leerer Kommentar kann nicht abgesendet werden
  Given ich bin im Kommentar-Eingabefeld
  When das Textfeld leer ist
  Then ist der Absenden-Button deaktiviert
```

---

## Technische Verifikation (Automated Checks)

- FILE_EXISTS: `ui/frontend/src/components/comments/aos-comment-thread.ts`
- CONTAINS: `aos-comment-thread.ts` enthält `@customElement('aos-comment-thread')`
- CONTAINS: `gateway.ts` enthält Comment-Send/On-Methoden
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

- [ ] `aos-comment-thread` Lit-Komponente implementiert mit Kommentar-Liste, Eingabefeld, Markdown-Rendering
- [ ] Gateway um 5 neue Comment-Methoden erweitert (sendCommentCreate, requestCommentList, sendCommentUpdate, sendCommentDelete, sendCommentImageUpload)
- [ ] Kommentar-Liste chronologisch sortiert (neueste unten) mit Auto-Scroll
- [ ] Pro Kommentar: Author-Badge, Datum/Uhrzeit, Markdown-gerenderter Text
- [ ] Edit-Mode: Textarea mit bestehendem Text, Save/Cancel
- [ ] Delete: Hover-Action mit Löschen-Icon
- [ ] Leerer Kommentar verhindert (Submit-Button deaktiviert)
- [ ] Empty-State "Noch keine Kommentare" angezeigt
- [ ] Frontend Build erfolgreich (`cd ui/frontend && npm run build`)
- [ ] Lint fehlerfrei (`cd ui && npm run lint`)

**Integration DoD:**
- [ ] **Integration: comment.protocol.ts → gateway.ts**
  - [ ] Import der Comment Types in Gateway
  - [ ] Validierung: `grep -q "comment.protocol" ui/frontend/src/gateway.ts`
- [ ] **Integration: gateway.ts → aos-comment-thread.ts**
  - [ ] Gateway on/send Aufrufe in Komponente
  - [ ] Validierung: `grep -q "gateway\." ui/frontend/src/components/comments/aos-comment-thread.ts`
- [ ] **Integration: markdown-renderer.ts → aos-comment-thread.ts**
  - [ ] Markdown-Rendering für Kommentar-Text
  - [ ] Validierung: `grep -q "renderMarkdown" ui/frontend/src/components/comments/aos-comment-thread.ts`

---

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Presentation | `ui/frontend/src/components/comments/aos-comment-thread.ts` | NEU: Lit-Komponente mit Kommentar-Liste, Eingabe, Edit/Delete, Markdown |
| Presentation | `ui/frontend/src/gateway.ts` | MODIFY: 5 neue Comment-Methoden (send/request) |

---

### Technical Details

**WAS:**
- Neue Lit-Komponente `aos-comment-thread` im Unterverzeichnis `comments/`
- Gateway-Erweiterung um 5 Comment-spezifische Methoden

**WIE (Architecture Guidance):**
- Folge dem `aos-attachment-panel.ts` Pattern: Properties (itemId), Gateway-Handler-Registration in connectedCallback/disconnectedCallback, State-Management via @state
- Nutze `renderMarkdown()` aus `markdown-renderer.ts` mit `unsafeHTML` Directive für Kommentar-Text
- Gateway-Methoden nach dem bestehenden Send/On Pattern (Discriminated Union Message mit type + payload + timestamp)
- CSS Custom Properties aus dem bestehenden Design-System (--color-text-primary, --color-bg-secondary, etc.)
- Chronologische Sortierung: älteste oben, neueste unten, Auto-Scroll nach neuem Kommentar
- Edit-Mode als inline Toggle (@state editingCommentId) - bei Klick auf Edit wird Textarea mit bestehendem Text angezeigt
- Toast-Notifications via CustomEvent `show-toast` (bubbles: true, composed: true)
- Komponentenname: `aos-comment-thread` (nicht `aos-backlog-comment-thread` - der Context kommt via Property)

**WO:**
- `ui/frontend/src/components/comments/aos-comment-thread.ts` (NEU)
- `ui/frontend/src/gateway.ts` (MODIFY: 5 neue Methoden)

**Abhängigkeiten:** BLC-001 (Comment Protocol Types + Server Handler müssen existieren)

**Geschätzte Komplexität:** L

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Web Component Patterns, Lifecycle, State |
| quality-gates | .claude/skills/quality-gates/SKILL.md | Frontend Build- und Qualitätsstandards |

---

### Creates Reusable Artifacts

Creates Reusable: yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| Comment Thread Component | UI Component | `ui/frontend/src/components/comments/aos-comment-thread.ts` | Wiederverwendbare Kommentar-Anzeige mit Markdown, Edit/Delete, Gateway-Integration |

---

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
test -f ui/frontend/src/components/comments/aos-comment-thread.ts && echo "Component exists"
grep -q "aos-comment-thread" ui/frontend/src/components/comments/aos-comment-thread.ts && echo "Custom element registered"
grep -q "comment" ui/frontend/src/gateway.ts && echo "Gateway methods exist"
grep -q "renderMarkdown" ui/frontend/src/components/comments/aos-comment-thread.ts && echo "Markdown rendering OK"
cd ui/frontend && npm run build
cd ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
