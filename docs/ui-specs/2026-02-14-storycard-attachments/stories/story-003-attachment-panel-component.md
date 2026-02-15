# Attachment Panel Component

> Story ID: SCA-003
> Spec: Storycard Attachments
> Created: 2026-02-14
> Last Updated: 2026-02-14

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 3 SP
**Dependencies**: SCA-002

---

## Feature

```gherkin
Feature: Attachment-Panel zum Verwalten von Datei-Anhaengen
  Als Entwickler
  moechte ich ein Panel haben, in dem ich Dateien hochladen, ansehen und loeschen kann,
  damit ich bequem Attachments an Storycards verwalten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Datei ueber File Picker hochladen

```gherkin
Scenario: Datei ueber Dateiauswahl hochladen
  Given das Attachment-Panel ist geoeffnet fuer Storycard "SCA-001"
  When ich auf den Upload-Button klicke
  And eine PNG-Datei "wireframe.png" auswaehle
  Then erscheint die Datei in der Upload-Vorschau
  And nach dem Upload erscheint sie in der Attachment-Liste mit Dateiname und Groesse
```

### Szenario 2: Datei per Drag & Drop hochladen

```gherkin
Scenario: Datei per Drag & Drop hochladen
  Given das Attachment-Panel ist geoeffnet
  When ich eine Datei "anforderungen.pdf" in die Drop-Zone ziehe
  Then wird die Drop-Zone visuell hervorgehoben
  And nach dem Ablegen wird die Datei hochgeladen
  And sie erscheint in der Attachment-Liste
```

### Szenario 3: Bild per Clipboard Paste einfuegen

```gherkin
Scenario: Bild aus Zwischenablage einfuegen
  Given das Attachment-Panel ist geoeffnet
  And ich habe einen Screenshot in der Zwischenablage
  When ich Strg+V druecke
  Then wird das Bild als Attachment hochgeladen
  And es erscheint in der Attachment-Liste mit automatisch generiertem Namen
```

### Szenario 4: Attachment loeschen mit Bestaetigung

```gherkin
Scenario: Attachment nach Bestaetigung loeschen
  Given an Storycard "SCA-001" ist "wireframe.png" angehaengt
  And das Attachment-Panel zeigt die Datei in der Liste
  When ich den Loeschen-Button fuer "wireframe.png" klicke
  Then erscheint ein Bestaetigungsdialog "Moechten Sie wireframe.png wirklich loeschen?"
  And wenn ich bestaetige, wird die Datei entfernt
  And die Attachment-Liste aktualisiert sich
```

### Szenario 5: Mehrere Dateien gleichzeitig hochladen

```gherkin
Scenario: Mehrere Dateien auf einmal auswaehlen
  Given das Attachment-Panel ist geoeffnet
  When ich 3 Dateien gleichzeitig im File Picker auswaehle
  Then werden alle 3 Dateien nacheinander hochgeladen
  And alle erscheinen in der Attachment-Liste
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Upload einer zu grossen Datei
  Given das Attachment-Panel ist geoeffnet
  When ich eine Datei mit 6 MB Groesse auswaehle
  Then sehe ich eine Fehlermeldung "Datei ueberschreitet 5 MB Limit"
  And die Datei wird nicht hochgeladen

Scenario: Upload eines nicht unterstuetzten Dateityps
  Given das Attachment-Panel ist geoeffnet
  When ich eine .exe Datei auswaehle
  Then sehe ich eine Fehlermeldung "Dateityp nicht unterstuetzt. Erlaubt: Bilder, PDF, TXT, JSON, MD"
  And die Datei wird nicht hochgeladen
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/attachments/aos-attachment-panel.ts
- [ ] CONTAINS: agent-os-ui/ui/src/components/attachments/aos-attachment-panel.ts enthaelt "customElement"
- [ ] CONTAINS: agent-os-ui/ui/src/styles/theme.css enthaelt "attachment-panel"
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
- [ ] Lit Component mit `@customElement('aos-attachment-panel')` registriert
- [ ] Upload-Zone unterstuetzt File Picker, Drag & Drop, Clipboard Paste

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Panel zeigt Upload-Zone und Attachment-Liste
- [ ] Loeschen verwendet `aos-confirm-dialog`
- [ ] Mehrfach-Upload funktioniert sequentiell
- [ ] Fehlermeldungen bei zu grossen/ungueltigen Dateien

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
| Frontend | `aos-attachment-panel.ts` | Neu: Reusable Panel-Komponente mit Upload-Zone, Dateiliste, Loeschen |
| Frontend | `theme.css` | Modifiziert: CSS Custom Properties fuer Attachment-Panel-Styling |

**Kritische Integration Points:**
- Panel nutzt Gateway-Methoden aus SCA-002 (`sendAttachmentUpload`, `requestAttachmentList`, `sendAttachmentDelete`)
- Panel nutzt `validateFile()` aus `image-upload.utils.ts` (erweitert in SCA-002)
- Panel nutzt bestehende `aos-confirm-dialog` Komponente fuer Loeschbestaetigung
- Panel empfaengt Properties von aussen: `contextType`, `specId`, `storyId`, `itemId` (wird in SCA-004 gesetzt)

---

### Technical Details

**WAS:**
- Neue Datei `agent-os-ui/ui/src/components/attachments/aos-attachment-panel.ts` -- zentrale UI-Komponente
- Modifikation von `agent-os-ui/ui/src/styles/theme.css` -- Attachment-Panel CSS-Variablen und Styles

**WIE (Architektur-Guidance ONLY):**
- Komponenten-Architektur: Standard Lit Web Component mit `@customElement('aos-attachment-panel')`. Verwende `LitElement` mit Shadow DOM (NICHT Light DOM). Properties fuer Context: `contextType: 'spec' | 'backlog'`, `specId`, `storyId`, `itemId`. Interne States fuer `attachments` Array, `isUploading`, `error`
- Upload-Zone: Implementiere als `<div>` mit `@dragover`, `@dragleave`, `@drop` Event-Handler fuer Drag & Drop. File Picker via versteckten `<input type="file" multiple accept="...">`. Clipboard Paste via `@paste` Event-Handler auf dem Panel. Verwende `readFileAsDataUrl()` und `validateFile()` aus `image-upload.utils.ts`
- Gateway-Integration: Im `connectedCallback()`, registriere `gateway.on('attachment:upload:response', ...)`, `gateway.on('attachment:list:response', ...)`, `gateway.on('attachment:delete:response', ...)`. Im `disconnectedCallback()` alle Handler deregistrieren (folge Pattern von `kanban-board.ts`). Rufe `gateway.requestAttachmentList()` im `connectedCallback()` auf um initiale Liste zu laden
- Dateiliste: Render als Liste mit Dateiname, Dateigroesse (formatiert), Dateityp-Icon. Jeder Eintrag hat einen Loeschen-Button
- Loeschbestaetigung: Verwende bestehende `aos-confirm-dialog` Komponente (Import aus `../aos-confirm-dialog.js`). Dialog bekommt `title`, `message`, `confirmText` Properties
- Mehrfach-Upload: Bei mehreren Dateien sequentiell hochladen (eine nach der anderen), um WebSocket nicht zu ueberlasten
- Fehlerbehandlung: Verwende Toast-Events (`show-toast` CustomEvent, bubbles: true, composed: true) fuer User-Feedback bei Fehlern. Folge bestehendes Pattern aus `kanban-board.ts`
- Styling: Definiere CSS in der Komponente. Nutze bestehende CSS Custom Properties (`--bg-color-secondary`, `--border-color`, `--text-color`, `--primary-color` etc.). Fuege neue theme-spezifische Variablen in `theme.css` hinzu fuer Drop-Zone-Highlighting

**WO:**
- `agent-os-ui/ui/src/components/attachments/aos-attachment-panel.ts` (NEU)
- `agent-os-ui/ui/src/styles/theme.css` (MODIFIZIERT: ~40 Zeilen CSS-Variablen)

**WER:** dev-team__frontend-developer

**Abhaengigkeiten:** SCA-002 (benoetigt Gateway-Methoden und erweiterte MIME-Types)

**Geschaetzte Komplexitaet:** M

**Relevante Skills:** ui-component-architecture, state-management

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| `aos-attachment-panel` | Lit Component | `agent-os-ui/ui/src/components/attachments/aos-attachment-panel.ts` | Wiederverwendbare Attachment-Management-Komponente, parametrisiert durch Context-Type und IDs |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten
test -f agent-os-ui/ui/src/components/attachments/aos-attachment-panel.ts && echo "Panel component exists" || exit 1
grep -q "customElement" agent-os-ui/ui/src/components/attachments/aos-attachment-panel.ts && echo "Component registered" || exit 1
grep -q "aos-attachment-panel" agent-os-ui/ui/src/components/attachments/aos-attachment-panel.ts && echo "Correct tag name" || exit 1
grep -q "attachment-panel\|attachment_panel" agent-os-ui/ui/src/styles/theme.css && echo "Theme styles added" || exit 1
grep -q "aos-confirm-dialog" agent-os-ui/ui/src/components/attachments/aos-attachment-panel.ts && echo "Confirm dialog used" || exit 1
cd agent-os-ui/ui && npx tsc --noEmit && echo "Frontend TypeScript compiles" || exit 1
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
