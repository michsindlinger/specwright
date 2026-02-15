# Storycard & Kanban Integration

> Story ID: SCA-004
> Spec: Storycard Attachments
> Created: 2026-02-14
> Last Updated: 2026-02-14

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 3 SP
**Dependencies**: SCA-003

---

## Feature

```gherkin
Feature: Attachment-Integration in Storycards und Kanban-Board
  Als Entwickler
  moechte ich direkt auf der Storycard sehen, ob Attachments vorhanden sind, und das Attachment-Panel oeffnen koennen,
  damit ich schnell Dateien an Stories anhaengen und den Ueberblick behalten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Attachment-Button auf Storycard anzeigen

```gherkin
Scenario: Attachment-Button auf jeder Storycard sichtbar
  Given ich sehe das Spec-Kanban-Board mit mehreren Storycards
  When ich eine Storycard betrachte
  Then sehe ich einen Bueroklammer-Button auf der Karte
```

### Szenario 2: Bueroklammer-Icon mit Anzahl

```gherkin
Scenario: Attachment-Anzahl auf Storycard anzeigen
  Given Storycard "SCA-001" hat 3 angehaengte Dateien
  When ich das Kanban-Board betrachte
  Then sehe ich ein Bueroklammer-Icon mit der Zahl "3" auf der Karte
```

### Szenario 3: Attachment-Panel oeffnen im Spec-Kanban

```gherkin
Scenario: Attachment-Panel aus Spec-Kanban oeffnen
  Given ich sehe eine Storycard im Spec-Kanban-Board
  When ich auf den Bueroklammer-Button klicke
  Then oeffnet sich das Attachment-Panel als Popover
  And das Panel zeigt die Upload-Zone und die Liste der vorhandenen Attachments
  And das Panel kennt den Kontext (Spec-ID und Story-ID)
```

### Szenario 4: Attachment-Panel oeffnen im Backlog

```gherkin
Scenario: Attachment-Panel aus Backlog oeffnen
  Given ich sehe eine Storycard im Backlog-Kanban-Board
  When ich auf den Bueroklammer-Button klicke
  Then oeffnet sich das Attachment-Panel als Popover
  And das Panel kennt den Kontext (Backlog-Item-ID)
```

### Szenario 5: Attachment-Panel schliessen

```gherkin
Scenario: Attachment-Panel schliessen
  Given das Attachment-Panel ist geoeffnet
  When ich ausserhalb des Panels klicke
  Then schliesst sich das Panel
  And die Attachment-Anzahl auf der Storycard ist aktualisiert
```

### Szenario 6: Karte ohne Attachments

```gherkin
Scenario: Storycard ohne Attachments zeigt keinen Zaehler
  Given Storycard "SCA-002" hat keine angehaengten Dateien
  When ich das Kanban-Board betrachte
  Then sehe ich den Bueroklammer-Button aber keine Zahl
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Attachment-Panel bei fehlender Backend-Verbindung
  Given die WebSocket-Verbindung ist unterbrochen
  When ich auf den Bueroklammer-Button klicke
  Then oeffnet sich das Panel mit einer Hinweismeldung "Verbindung nicht verfuegbar"
```

---

## Technische Verifikation (Automated Checks)

- [ ] CONTAINS: Storycard-Komponente enthaelt "attachment" Event-Handler
- [ ] CONTAINS: Kanban-Board-Komponente enthaelt "aos-attachment-panel"
- [ ] LINT_PASS: cd agent-os-ui/ui && npx tsc --noEmit exits with code 0

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

> **Refinement durch:** dev-team__architect
> **Datum:** 2026-02-14

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

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** (Frontend/Backend/Database/DevOps)
- [x] **Integration Type bestimmt** (Backend-only/Frontend-only/Full-stack)
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer: API Contracts, Data Structures)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Bueroklammer-Button auf `aos-story-card` sichtbar
- [ ] Attachment-Anzahl wird auf Karte angezeigt (wenn > 0)

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] `aos-attachment-panel` wird als Popover im `aos-kanban-board` gerendert
- [ ] Panel oeffnet/schliesst korrekt
- [ ] Panel erhaelt korrekten Context (specId/storyId fuer Spec, itemId fuer Backlog)
- [ ] Klick ausserhalb des Panels schliesst es

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | `story-card.ts` | Modifiziert: Bueroklammer-Button mit Attachment-Count hinzufuegen, `attachment-open` Event emittieren |
| Frontend | `kanban-board.ts` | Modifiziert: State fuer aktives Attachment-Panel, Event-Handler, Panel als Popover rendern |
| Frontend | `story-card.ts` (StoryInfo) | Modifiziert: `attachmentCount` Property zu `StoryInfo` Interface hinzufuegen |

**Kritische Integration Points:**
- `aos-story-card` emittiert `attachment-open` CustomEvent mit `{ storyId, story }` Detail
- `aos-kanban-board` faengt das Event ab, setzt State fuer aktives Panel, rendert `aos-attachment-panel` (SCA-003)
- Kanban Board muss korrekten Context uebergeben: Im `spec` Mode: `specId` + `storyId`, im `backlog` Mode: `itemId`
- Attachment-Count muss von der Attachment-Liste (`attachment:list:response`) aktualisiert werden
- Panel-Position relativ zur Storycard oder als fixiertes Popover

---

### Technical Details

**WAS:**
- Modifikation `aos-story-card`: Bueroklammer-Icon-Button im Header-Bereich, `attachmentCount` Property auf StoryInfo, CustomEvent `attachment-open`
- Modifikation `aos-kanban-board`: State `activeAttachmentPanel` (storyId oder null), Event-Handler fuer `attachment-open` und Panel-Close, Rendering von `aos-attachment-panel` als positioniertes Popover
- Modifikation `StoryInfo` Interface: neues optionales Feld `attachmentCount?: number`

**WIE (Architektur-Guidance ONLY):**
- Story Card Erweiterung: Fuege den Bueroklammer-Button im `story-header` Bereich ein (neben dem bestehenden Copy-Path-Button und Effort-Badge). Verwende ein Lucide-artiges Paperclip SVG-Icon. Zeige die Zahl neben dem Icon nur wenn `attachmentCount > 0`. Event `attachment-open` mit `bubbles: true, composed: true` (folge `story-select` Event-Pattern). Stopfe `e.stopPropagation()` im Click-Handler um `story-select` nicht auszuloesen
- Kanban Board Integration: Fuege `@state() private activeAttachmentStoryId: string | null = null` hinzu. Handle `@attachment-open` Event auf der Story-Card-Ebene (innerhalb `renderColumn`). Rendere `aos-attachment-panel` als absolut positioniertes Element oder als Modal-Overlay (aehnlich dem Spec-Viewer-Pattern). Uebergebe Context-Properties basierend auf `this.mode`: Bei `spec` Mode: `contextType="spec"`, `specId`, `storyId`. Bei `backlog` Mode: `contextType="backlog"`, `itemId`
- Panel-Closing: Registriere einen `@click`-Handler auf einem Overlay-Backdrop um das Panel bei Klick ausserhalb zu schliessen (folge Pattern des `spec-viewer-overlay` im Kanban Board)
- Attachment-Count Aktualisierung: Das Kanban Board registriert sich auf `attachment:list:response` und `attachment:upload:response` um die Counts auf den Story-Cards zu aktualisieren. Alternativ: Das Panel emittiert ein `attachment-count-changed` Event das der Kanban Board faengt
- Import: `import '../attachments/aos-attachment-panel.js'` im `kanban-board.ts`

**WO:**
- `agent-os-ui/ui/src/components/story-card.ts` (MODIFIZIERT: ~20 Zeilen render + ~10 Zeilen CSS + Event-Handler)
- `agent-os-ui/ui/src/components/kanban-board.ts` (MODIFIZIERT: ~40 Zeilen State + Handler + Render)

**WER:** dev-team__frontend-developer

**Abhaengigkeiten:** SCA-003 (benoetigt `aos-attachment-panel` Komponente)

**Geschaetzte Komplexitaet:** M

**Relevante Skills:** ui-component-architecture, state-management

---

### Creates Reusable Artifacts

**Creates Reusable:** no

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| - | - | - | Keine neuen wiederverwendbaren Artefakte; erweitert bestehende Komponenten |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten
grep -q "attachment-open\|attachmentOpen" agent-os-ui/ui/src/components/story-card.ts && echo "Story card has attachment event" || exit 1
grep -q "attachmentCount\|attachment-count" agent-os-ui/ui/src/components/story-card.ts && echo "Story card has attachment count" || exit 1
grep -q "aos-attachment-panel" agent-os-ui/ui/src/components/kanban-board.ts && echo "Kanban board renders attachment panel" || exit 1
grep -q "attachment-open\|attachmentOpen" agent-os-ui/ui/src/components/kanban-board.ts && echo "Kanban board handles attachment event" || exit 1
cd agent-os-ui/ui && npx tsc --noEmit && echo "Frontend TypeScript compiles" || exit 1
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
