# Implementation Plan: Spec Docs Viewer Extension

**Status:** APPROVED
**Spec:** agent-os/specs/2026-02-12-spec-docs-viewer-extension/
**Erstellt:** 2026-02-12
**Basiert auf:** requirements-clarification.md

---

## Executive Summary

Der bestehende Spec Document Viewer im Kanban Board zeigt aktuell nur `spec.md` und `spec-lite.md` über zwei hardcodierte Buttons an. Dieses Feature erweitert den Viewer, sodass ALLE `*.md` Dateien innerhalb eines Spec-Ordners (rekursiv, inkl. `stories/`, `sub-specs/` und weiteren Unterordnern) entdeckt und angezeigt werden können - gruppiert nach Ordner in einer dynamisch generierten Tab-Leiste mit horizontalem Scrolling. Zusätzlich werden Markdown-Checkboxen (`- [ ]` / `- [x]`) interaktiv klickbar mit sofortiger Persistierung in der Datei.

---

## Architektur-Entscheidungen

### Gewählter Ansatz

**Minimal-invasive Erweiterung bestehender Komponenten** - statt komplett neue Komponenten zu erstellen, erweitern wir den bestehenden `SpecsReader` Service, die WebSocket Handler und das Kanban Board Spec Viewer Modal. Die `aos-docs-viewer` Komponente bleibt die Rendering-Engine und erhält zusätzlich Checkbox-Interaktivität. Eine neue leichtgewichtige Tab-Bar-Komponente übernimmt die dynamische Dateilisten-Darstellung.

### Begründung

1. Die bestehenden `specs.read` / `specs.save` Handler bearbeiten bereits Datei-Read/Write für Spec-Dateien - sie benötigen nur eine Generalisierung der Pfad-Auflösung von einem `fileType` Enum zu einem `relativePath` Parameter
2. Die `aos-docs-viewer` nutzt bereits `marked` mit `gfm: true` und `unsafeHTML` für Rendering - die Checkbox-Renderer-Erweiterung passt natürlich in diese Pipeline
3. Das Pattern aus `docs-reader.ts` zeigt bereits wie rekursives File-Listing mit Validierung funktioniert - dieses Pattern kann für das Spec-File-Listing adaptiert werden
4. Durch Beibehaltung der `aos-docs-viewer` Komponente als zentrale Rendering- und Checkbox-Handling-Einheit vermeiden wir Kopplung des Kanban Boards an Markdown-Parsing-Details

### Patterns & Technologien

- **Pattern:** Observer/Event-basiert (Lit Custom Events für Checkbox-Toggle-Propagation, WebSocket-Message-basierte Kommunikation für Backend)
- **Technology:** `marked` Custom Renderer für Checkbox-Override, Lit Web Components, bestehendes Gateway WebSocket Abstraktion
- **Begründung:** Alle Technologien sind bereits im Stack. `marked` GFM parst bereits `- [ ]` / `- [x]` - wir überschreiben lediglich den `checkbox` Renderer um interaktive Inputs mit Data-Attributen auszugeben

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `aos-spec-file-tabs` | UI Component (Lit) | Dynamische Tab-Bar-Darstellung aus Dateiliste, gruppiert nach Ordner, horizontales Scrolling, Active-Tab-State |
| `SpecsReader.listSpecFiles()` | Backend Service Methode | Rekursives Entdecken aller `*.md` Dateien in einem Spec-Ordner, Gruppierung nach Verzeichnis, strukturierte Rückgabe |
| `specs.files` WebSocket Handler | Backend Handler | Neuer Message-Typ der `specId` nimmt, `listSpecFiles()` aufruft, gruppierte Dateiliste zurückgibt |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `kanban-board.ts` (Spec Viewer Modal) | Erweitern | Hardcodierte spec.md/spec-lite.md Buttons durch dynamische `aos-spec-file-tabs` Komponente ersetzen; State Management von `fileType` Enum zu `relativePath` String anpassen |
| `websocket.ts` (`handleSpecsRead`) | Erweitern | `relativePath` Parameter akzeptieren statt nur `fileType`, Pfad sicher innerhalb des Spec-Ordners auflösen |
| `websocket.ts` (`handleSpecsSave`) | Erweitern | `relativePath` Parameter akzeptieren statt nur `fileType`, Pfad-Validierung sicherstellen |
| `aos-docs-viewer.ts` | Erweitern | `marked` Checkbox-Renderer überschreiben für interaktive (nicht-disabled) Checkboxen mit data-index Attributen; Click Event Delegation für Checkbox-Toggle; `checkbox-toggled` Event emittieren |
| `gateway.ts` | Erweitern | `requestSpecFiles(specId)` Convenience-Methode für den neuen `specs.files` Message-Typ hinzufügen |
| `specs-reader.ts` (SpecsReader Klasse) | Erweitern | `listSpecFiles(projectPath, specId)` Methode für rekursive `*.md` Datei-Erkennung mit Gruppierung |

### Nicht betroffen (explizit)

- `aos-docs-editor.ts` - Der CodeMirror Editor bleibt unverändert; handhabt bereits beliebigen Content/Filename
- `docs-reader.ts` - Liest aus `agent-os/product/`, nicht aus Spec-Ordnern
- `backlog-reader.ts` - Nicht mit Spec-Document-Viewing verbunden
- Kanban JSON Methoden in `specs-reader.ts` - Story/Kanban-Management unbetroffen

---

## Umsetzungsphasen

### Phase 1: Backend - File Discovery & Generalized Read/Save

**Ziel:** Backend kann alle `*.md` Dateien in einem Spec-Ordner auflisten und beliebige davon per relativem Pfad lesen/speichern.

**Komponenten:**
- `SpecsReader.listSpecFiles()` - neue Methode
- `specs.files` - neuer WebSocket Handler
- `handleSpecsRead` - generalisiert für `relativePath`
- `handleSpecsSave` - generalisiert für `relativePath`

**Abhängig von:** Nichts (Startphase)

**Key Design Decisions:**
- Dateilisten-Response-Struktur: `{ groups: [{ folder: string, files: [{ relativePath: string, filename: string }] }] }` - gruppiert nach Verzeichnis
- Pfad-Validierung: Angefragten `relativePath` gegen den Spec-Ordner auflösen, sicherstellen dass kein Escape via `..` oder absoluten Pfaden möglich ist. Nur `*.md` Extension erlaubt
- Backward Compatibility: `handleSpecsRead` und `handleSpecsSave` akzeptieren weiterhin den alten `fileType` Parameter (`'spec'` oder `'spec-lite'`) und mappen auf den entsprechenden `relativePath`

### Phase 2: Frontend - Dynamic Tab Bar Component

**Ziel:** Eine wiederverwendbare Tab-Bar-Komponente die gruppierte Datei-Tabs mit horizontalem Scrolling rendert.

**Komponenten:**
- `aos-spec-file-tabs` - neue Lit Komponente

**Abhängig von:** Phase 1 (benötigt Response-Format-Definition)

**Key Design Decisions:**
- Die Komponente empfängt die Dateiliste als Property (holt nicht selbst) - das Kanban Board managed die WebSocket-Kommunikation
- Gruppen werden als Tab-Group-Header (kleine Labels wie "root", "stories/", "sub-specs/") mit Datei-Tabs darunter gerendert
- Aktiver Tab wird durch `active` CSS-Klasse angezeigt
- Emittiert `file-selected` Event mit `{ relativePath, filename }` Detail
- Horizontales Scrolling mit Overflow, kein Wrapping

### Phase 3: Frontend - Kanban Board Integration

**Ziel:** Das Kanban Board Spec Viewer Modal nutzt die neue Tab-Bar und kommuniziert mit dem generalisierten Backend.

**Komponenten:**
- `kanban-board.ts` - refactored Spec Viewer Section
- `gateway.ts` - neue Convenience-Methode

**Abhängig von:** Phase 1, Phase 2

**Key Design Decisions:**
- Beim Öffnen des Spec Viewers `specs.files` senden um Dateiliste zu holen, dann automatisch erste Datei auswählen (typischerweise `spec.md` im Root)
- `specViewerFileType: 'spec' | 'spec-lite'` State durch `specViewerRelativePath: string` ersetzen
- Lazy Loading: Datei-Content wird erst beim Tab-Klick geholt
- `handleSpecSaveRequested` Handler sendet `relativePath` statt `fileType`

### Phase 4: Interactive Checkboxen mit Persistierung

**Ziel:** Markdown-Checkboxen in der gerenderten Ansicht sind klickbar und persistieren Änderungen sofort.

**Komponenten:**
- `aos-docs-viewer.ts` - Checkbox-Renderer-Override und Click-Handling
- `kanban-board.ts` - `checkbox-toggled` Event behandeln, Save triggern

**Abhängig von:** Phase 3 (benötigt den generalisierten Save-Mechanismus)

**Key Design Decisions:**
- `marked` Checkbox-Renderer überschreiben: `<input type="checkbox" data-checkbox-index="N">` ausgeben (NICHT disabled)
- Da der Viewer Light DOM nutzt, funktioniert Event Delegation natürlich - Click Listener auf dem Viewer-Content div für `input[type=checkbox][data-checkbox-index]`
- Bei Checkbox-Klick: N-te Checkbox-Pattern (`- [ ]` oder `- [x]`) im Raw-Markdown finden (Code-Blocks überspringen), togglen, `checkbox-toggled` Event mit aktualisiertem Content emittieren
- Kanban Board fängt `checkbox-toggled`, aktualisiert `specViewerContent`, sendet `specs.save` zur Persistierung
- Wichtiger Edge Case: Checkboxen innerhalb von Fenced Code Blocks (` ``` `) dürfen NICHT gezählt oder getoggelt werden

---

## Komponenten-Verbindungen (KRITISCH)

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| `kanban-board.ts` | Gateway (`specs.files`) | WebSocket message send | Story 3 (Frontend Integration) | Gateway sends `{ type: 'specs.files', specId }` |
| `websocket.ts` (`specs.files` handler) | `SpecsReader.listSpecFiles()` | Direct method call | Story 1 (Backend) | Handler calls service method |
| `kanban-board.ts` | `aos-spec-file-tabs` | Lit property binding (`files`, `activeFile`) | Story 3 (Frontend Integration) | Component rendered in modal template |
| `aos-spec-file-tabs` | `kanban-board.ts` | Custom event (`file-selected`) | Story 3 (Frontend Integration) | Event listener on component |
| `kanban-board.ts` | Gateway (`specs.read` with `relativePath`) | WebSocket message send | Story 3 (Frontend Integration) | Gateway sends with relativePath |
| `kanban-board.ts` | Gateway (`specs.save` with `relativePath`) | WebSocket message send | Story 3 (Frontend Integration) | Gateway sends with relativePath |
| `aos-docs-viewer.ts` | `kanban-board.ts` | Custom event (`checkbox-toggled`) | Story 4 (Checkboxes) | Event carries updated content |
| `kanban-board.ts` | `aos-docs-viewer.ts` | Lit property binding (`.content`, `.filename`) | Story 3 (Frontend Integration) | Already exists, extended |
| `gateway.ts` | `websocket.ts` | WebSocket protocol (new `specs.files` message type) | Story 1 + Story 3 | New message type routing |

### Verbindungs-Checkliste
- [x] Jede neue Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungsbefehle sind ausführbar

---

## Abhängigkeiten

### Interne Abhängigkeiten

```
SpecsReader.listSpecFiles() ──used by──> websocket.ts (specs.files handler)
aos-spec-file-tabs ──rendered in──> kanban-board.ts (spec viewer modal)
kanban-board.ts ──uses──> gateway.ts (WebSocket communication)
aos-docs-viewer.ts (checkbox feature) ──events to──> kanban-board.ts
kanban-board.ts ──persists via──> websocket.ts (specs.save handler)
```

### Externe Abhängigkeiten

- **marked v17.0.1:** Bereits installiert; Custom Renderer API für Checkbox Override. Keine neue Dependency.
- **Keine neuen npm Packages erforderlich.**

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Path Traversal via `relativePath` Parameter | Medium | Hoch (Security) | Strikte Validierung: Pfad auflösen, innerhalb Spec-Ordner verifizieren, `..` und absolute Pfade ablehnen, nur `*.md` Extension erlauben |
| Checkbox-Index-Mismatch bei Code-Blocks mit `- [ ]` | Medium | Mittel (Datenkorruption) | Markdown korrekt parsen - Fenced Code Blocks beim Zählen der Checkbox-Indices überspringen |
| Performance bei vielen Dateien (>50 Tabs) | Niedrig | Niedrig (UX) | Horizontales Scrolling geplant; Lazy Loading von Content; Dateiliste einmalig geladen |
| Backward Compatibility Break für bestehende `specs.read` Caller | Niedrig | Mittel | Support für alten `fileType` Parameter neben neuem `relativePath` beibehalten |
| Race Condition: Datei zwischen Listing und Reading gelöscht | Niedrig | Niedrig | Bereits behandeltes Pattern: Error in `specs.read.error` Response, Fehler im Viewer anzeigen |

---

## Self-Review Ergebnisse

### Validiert

- **Completeness:** Alle 7 funktionalen Requirements aus der Clarification sind abgedeckt:
  1. Dynamische Datei-Erkennung (Phase 1: `listSpecFiles`)
  2. Gruppierte Tab-Darstellung (Phase 2: `aos-spec-file-tabs`)
  3. Lesen aller Dateien (Phase 1: generalisiertes `specs.read`)
  4. Bearbeiten aller Dateien (Phase 1: generalisiertes `specs.save`)
  5. Interaktive Checkboxen (Phase 4: Renderer Override)
  6. Checkbox-Persistierung (Phase 4: Save on Toggle)
  7. Datei-Liste als API (Phase 1: `specs.files` Handler)
- **Edge Cases:** Alle 6 Edge Cases aus der Clarification sind mit der geplanten Architektur adressierbar
- **Security:** Path Traversal Prevention ist explizit in beide Backend Handler eindesigned
- **Performance:** Lazy Loading und einmaliges File-Listing entsprechen den Performance-Requirements
- **Scope:** Der Plan beinhaltet kein JSON-Viewing, keine Datei-Erstellung/-Löschung, kein Drag-Drop, keine Suche, keine Diff-Ansicht

### Identifizierte Probleme & Lösungen

| Problem | Ursprünglicher Plan | Verbesserung |
|---------|---------------------|-------------|
| `specs.list` WebSocket Message-Typ existiert bereits (listet alle Specs, nicht Dateien in einem Spec) | Könnte Namensverwirrung verursachen | `specs.files` als neuen Message-Typ verwenden |
| `aos-docs-viewer` nutzt Light DOM | Könnte Style-Leaks mit Checkbox-Inputs verursachen | Ist tatsächlich vorteilhaft - Click Events propagieren natürlich ohne Shadow DOM Boundaries |
| `specViewerFileType` State ist als `'spec' \| 'spec-lite'` getypt | String-Path könnte Type-Safety brechen | Durch `specViewerRelativePath: string` ersetzen mit temporärem Mapping für Backward Compat |

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| Path Validation Pattern (Traversal Prevention) | `docs-reader.ts` | `SpecsReader.listSpecFiles()` und generalisierte Handler |
| File Listing Pattern (readdir + filter) | `docs-reader.ts`, `specs-reader.ts` | `SpecsReader.listSpecFiles()` rekursive Implementierung |
| WebSocket Handler Pattern | `websocket.ts` (handleSpecsList) | Neuer `specs.files` Handler folgt identischem Pattern |
| Tab Button Styling | `kanban-board.ts` CSS `.spec-viewer-btn` | `aos-spec-file-tabs` kann gleiche CSS Custom Properties nutzen |
| Gateway Send Pattern | `gateway.ts` (requestSpecsList) | `requestSpecFiles(specId)` folgt gleichem Pattern |
| marked Custom Renderer Extension | `aos-docs-viewer.ts` | Checkbox Renderer wird zum gleichen `marked.use()` Call hinzugefügt |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| Separaten `SpecFileService` Klasse erstellen | `listSpecFiles()` Methode direkt in bestehender `SpecsReader` Klasse | Vermeidet neue Datei, hält Spec-Logik co-located |
| Neuen `specs.list.files` Message-Typ mit genested Namespace | Flachen `specs.files` Message-Typ verwenden | Einfacher, konsistent mit bestehendem Naming |
| Checkbox Toggle als separate Utility-Funktion in neuem File | Als private Methode direkt in `aos-docs-viewer.ts` implementieren | Code bleibt beim Consumer; keine unnötige Abstraktion |
| Neuen `specs.checkbox.toggle` WebSocket Message-Typ für granulares Checkbox-Save | Bestehendes `specs.save` mit Full Content wiederverwenden | Viel einfacher; kein neuer Backend Handler nötig |

### Feature-Preservation bestätigt

- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar
