# UI Components

> Verfügbare UI-Komponenten im Projekt.
> Zuletzt aktualisiert: 2026-02-16

## Komponenten-Übersicht

| Komponente | Pfad | Props/Variants | Erstellt in Spec |
|------------|------|----------------|------------------|
| aos-file-tree | ui/frontend/src/components/file-editor/aos-file-tree.ts | rootPath, selectedPath, filterText | File Editor (2026-02-16) |
| aos-file-tree-sidebar | ui/frontend/src/components/file-editor/aos-file-tree-sidebar.ts | isOpen | File Editor (2026-02-16) |
| aos-file-editor | ui/frontend/src/components/file-editor/aos-file-editor.ts | content, filename | File Editor (2026-02-16) |
| aos-file-tabs | ui/frontend/src/components/file-editor/aos-file-tabs.ts | tabs, activeTabPath | File Editor (2026-02-16) |
| aos-file-editor-panel | ui/frontend/src/components/file-editor/aos-file-editor-panel.ts | (Orchestrator) | File Editor (2026-02-16) |

---

## Komponenten-Details

### aos-file-tree

**Pfad:** `ui/frontend/src/components/file-editor/aos-file-tree.ts`
**Erstellt:** File Editor (2026-02-16)

**Beschreibung:** Tree-View Komponente mit Lazy-Loading für Verzeichnisstrukturen. Kommuniziert mit dem Backend via Gateway `files:list` Messages.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| rootPath | string | '.' | Root-Pfad für die Verzeichnisliste |
| selectedPath | string | '' | Aktuell ausgewählter Pfad |
| filterText | string | '' | Client-side Filter für Dateinamen |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| file-open | { path, filename } | Datei wurde angeklickt |
| file-contextmenu | { path, filename, type, x, y } | Rechtsklick auf Datei/Ordner |

**Usage Example:**
```html
<aos-file-tree
  rootPath="."
  .selectedPath=${this.selectedPath}
  .filterText=${this.filterText}
  @file-open=${this._handleFileOpen}
  @file-contextmenu=${this._handleContextMenu}
></aos-file-tree>
```

**Notes:**
- Nutzt Light DOM Pattern (`createRenderRoot` returns `this`)
- Lazy-Loading: Verzeichnisse werden erst beim Expandieren geladen
- Keyboard-Navigation: Enter/Space zum Öffnen, aria-expanded für Ordner
- Public method: `refreshDirectory(path)` zum Neuladen nach File-Operationen

---

### aos-file-tree-sidebar

**Pfad:** `ui/frontend/src/components/file-editor/aos-file-tree-sidebar.ts`
**Erstellt:** File Editor (2026-02-16)

**Beschreibung:** Overlay-Sidebar von links mit Resize-Handle, enthält aos-file-tree und aos-file-context-menu.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| isOpen | boolean | false | Sidebar sichtbar/versteckt |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| sidebar-close | - | Sidebar soll geschlossen werden |
| file-open | { path, filename } | Datei wurde im Tree ausgewählt (re-dispatched) |

**Usage Example:**
```html
<aos-file-tree-sidebar
  .isOpen=${this.isFileTreeOpen}
  @sidebar-close=${() => this.isFileTreeOpen = false}
  @file-open=${this._handleFileTreeFileOpen}
></aos-file-tree-sidebar>
```

**Notes:**
- Slide-in von links mit CSS-Transition
- Resizable via Drag-Handle
- z-index 1000, koexistiert mit Terminal-Sidebar (rechts)
- Enthält Search-Input für Dateifilterung

---

### aos-file-editor

**Pfad:** `ui/frontend/src/components/file-editor/aos-file-editor.ts`
**Erstellt:** File Editor (2026-02-16)

**Beschreibung:** CodeMirror 6 basierter Editor mit automatischer Spracherkennung und Theme-Switching.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| content | string | '' | Dateiinhalt |
| filename | string | '' | Dateiname (für Spracherkennung) |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| content-changed | { content, hasUnsavedChanges } | Inhalt wurde geändert |
| save-requested | { filename, content } | Ctrl+S/Cmd+S gedrückt |

**Public Methods:**
- `markSaveSuccess()` - Zeigt Speichererfolg an
- `markSaveError(msg)` - Zeigt Speicherfehler an

**Usage Example:**
```html
<aos-file-editor
  .content=${this.activeFile.content}
  .filename=${this.activeFile.filename}
  @content-changed=${this._handleContentChanged}
  @save-requested=${this._handleSaveRequested}
></aos-file-editor>
```

**Notes:**
- Unterstützte Sprachen: ts/tsx/js/jsx/json/html/css/md/yaml
- Theme-Switching via `themeCompartment` + `languageCompartment`
- Light DOM Pattern
- Ctrl+S/Cmd+S triggert Save-Event

---

### aos-file-tabs

**Pfad:** `ui/frontend/src/components/file-editor/aos-file-tabs.ts`
**Erstellt:** File Editor (2026-02-16)

**Beschreibung:** Tab-Bar Komponente mit Unsaved-Changes-Indikator.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| tabs | FileTab[] | [] | Array der offenen Tabs |
| activeTabPath | string | '' | Pfad des aktiven Tabs |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| tab-select | { path } | Tab wurde angeklickt |
| tab-close | { path } | Tab-Schließen-Button wurde geklickt |

**Types:**
```typescript
interface FileTab {
  path: string;
  filename: string;
  isModified: boolean;
}
```

**Usage Example:**
```html
<aos-file-tabs
  .tabs=${this.openTabs}
  .activeTabPath=${this.activeTabPath}
  @tab-select=${this._handleTabSelect}
  @tab-close=${this._handleTabClose}
></aos-file-tabs>
```

---

### aos-file-editor-panel

**Pfad:** `ui/frontend/src/components/file-editor/aos-file-editor-panel.ts`
**Erstellt:** File Editor (2026-02-16)

**Beschreibung:** Orchestrator für Multi-Tab File Editing. Verwaltet offene Dateien, Tab-State, Speichern und Gateway-Kommunikation.

**Public Methods:**
- `openFile(path, filename)` - Öffnet eine Datei (oder wechselt zum Tab)
- `hasUnsavedChanges()` - Prüft ob ungespeicherte Änderungen existieren

**Usage Example:**
```html
<aos-file-editor-panel></aos-file-editor-panel>
```

```typescript
// Datei programmatisch öffnen
const panel = document.querySelector('aos-file-editor-panel');
panel.openFile('src/app.ts', 'app.ts');
```

**Notes:**
- Tab-Limit: 15 Tabs max mit LRU-Eviction
- Gateway-Subscriptions: files:read:response, files:write:response, etc.
- Unsaved-Changes-Warnung via `window.confirm()`
- Listener für `file-renamed` und `file-deleted` Document-Events

---

## Patterns & Conventions

### Lit Component Pattern (File Editor)
Alle File-Editor-Komponenten nutzen:
- Light DOM (`createRenderRoot` returns `this`)
- Gateway-Pattern für WebSocket-Kommunikation
- Custom Events für Eltern-Kind-Kommunikation
- CSS-Variablen aus `theme.css` für Styling

### Overlay-Sidebar Pattern
`aos-file-tree-sidebar` implementiert das Overlay-Sidebar-Pattern:
- Slide-in von links mit CSS-Transition
- Resizable via Drag-Handle
- z-index für korrektes Stacking
- Toggle via Property-Binding

---

*Template Version: 1.0*
