# Implementierungsplan: File Editor

> **Status:** PENDING_USER_REVIEW
> **Spec:** specwright/specs/2026-02-16-file-editor/
> **Erstellt:** 2026-02-16
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Ein integrierter File Editor für die Specwright Web UI, der Entwicklern das Browsen und Bearbeiten von Projektdateien direkt in der UI ermöglicht. Das Feature besteht aus einer Dateibaum-Sidebar (Overlay von links), einem Multi-Tab Code-Editor auf Basis von CodeMirror 6 (bereits im Projekt vorhanden), und einem Backend FileService mit CRUD-Operationen über das bestehende WebSocket-Protokoll.

---

## Architektur-Entscheidungen

### Gewählter Ansatz

**CodeMirror 6** als Editor-Bibliothek, integriert als Lit Web Component, kommunizierend mit einem neuen Backend `FileService` über WebSocket-Nachrichten nach dem etablierten Pattern von `DocsReader`, `AttachmentHandler` und `SpecsReader`.

Die Dateibaum-Sidebar wird ein **Overlay von links**, toggle-bar über den Header, nach dem gleichen Pattern wie die existierende `aos-cloud-terminal-sidebar` (Overlay von rechts). Der File Editor ist ein **globales Feature**, das unabhängig vom aktiven View (Dashboard, Kanban, Chat etc.) nutzbar ist.

### Begründung

1. **CodeMirror 6 statt Monaco Editor:** CodeMirror ist bereits als Dependency vorhanden (`@codemirror/commands`, `@codemirror/lang-markdown`, `@codemirror/state`, `@codemirror/view`, `@codemirror/theme-one-dark`, `@codemirror/language`) und wird in `aos-docs-editor.ts` genutzt. Monaco wäre ~4MB zusätzlich. CodeMirror 6 hat exzellente Performance und Tree-Shaking-Support.

2. **WebSocket statt REST für Datei-Operationen:** Die gesamte UI kommuniziert über WebSocket (`gateway.ts` / `websocket.ts`). WebSocket für File-Ops sorgt für Konsistenz und ermöglicht zukünftige Live-Updates (File-Watcher). REST wird nur für binäre/Upload-Operationen genutzt.

3. **Overlay-Sidebar-Pattern:** Die Terminal-Sidebar (`aos-cloud-terminal-sidebar`) implementiert bereits ein Sliding-Overlay-Pattern mit Resize-Handle. Die Dateibaum-Sidebar folgt dem gleichen Pattern, aber von **links**.

4. **Light DOM:** Alle bestehenden Komponenten nutzen Light DOM (`createRenderRoot = this`) für CSS-Kompatibilität mit dem globalen Theme-System.

5. **Globale Sidebar statt Dashboard-Tab:** Der File Editor ist architektonisch unabhängig vom Dashboard. Als globales Overlay funktioniert er auf jedem View - man kann Dateien bearbeiten während man das Kanban-Board betrachtet oder den Chat nutzt.

### Patterns & Technologien
- **Pattern:** WebSocket Message Handler (wie `AttachmentHandler`, `DocsReader`)
- **Pattern:** Lit Component mit Gateway-Event-Subscriptions (wie `AosDocsPanel`)
- **Pattern:** Overlay-Sidebar mit Resize-Handle (wie `AosCloudTerminalSidebar`)
- **Technologie:** CodeMirror 6 (bereits installiert)
- **Technologie:** Zusätzliche CodeMirror-Sprachpakete für Syntax-Highlighting
- **Technologie:** Express/Node.js `fs.promises` für Datei-Operationen

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `aos-file-tree` | UI Component | Tree-View des Projektverzeichnisses mit Lazy-Loading, Expand/Collapse, Datei-Icons |
| `aos-file-tree-sidebar` | UI Component | Overlay-Sidebar-Container (linke Seite), Resize-Handle, Toggle-Logik |
| `aos-file-editor` | UI Component | CodeMirror-Integration für Multi-Language-Editing, einzelne Datei |
| `aos-file-tabs` | UI Component | Tab-Bar für offene Dateien, Unsaved-Changes-Indikator, Close mit Warnung |
| `aos-file-editor-panel` | UI Component | Orchestrator: kombiniert Tabs + Editor, verwaltet Open-Files-State |
| `aos-file-context-menu` | UI Component | Rechtsklick-Menü für Tree (New File, New Folder, Rename, Delete) |
| `FileService` | Backend Service | Dateisystem-Operationen: list, read, write, create, delete, rename mit Path-Traversal-Schutz |
| `FileHandler` | Backend Handler | WebSocket-Message-Handler, routet `files.*` Messages an FileService |
| `file.protocol.ts` | Shared Types | TypeScript-Interfaces für alle datei-bezogenen WebSocket-Messages |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `app.ts` | Erweitern | Toggle-Button für File-Sidebar im Header, Sidebar-Component rendern, Open/Close-State |
| `websocket.ts` | Erweitern | `files.*` Message-Routing in `handleMessage()` Switch-Statement |
| `theme.css` | Erweitern | CSS-Variablen für File-Editor-Tokens (Tree-Icons, Tab-Styling, Editor-Container) |
| `frontend/package.json` | Erweitern | Zusätzliche CodeMirror-Sprachpakete |

### Nicht betroffen (explizit)
- `dashboard-view.ts` - File Editor ist global, kein Dashboard-Tab
- `kanban-board.ts` - Keine Änderungen
- `chat-view.ts` / `workflow-view.ts` / `settings-view.ts` - Keine Änderungen
- Bestehende `docs/` Komponenten - Separates Feature
- `specs-reader.ts` / `backlog-reader.ts` - Anderer Datenbereich
- REST Routes - File-Operationen nutzen WebSocket

---

## Umsetzungsphasen

### Phase 1: Backend File Service & Protocol
**Ziel:** Backend-Fundament für alle Datei-Operationen mit Sicherheitsschutz
**Komponenten:** `file.protocol.ts`, `FileService`, `FileHandler`, `websocket.ts` (Erweiterung)
**Abhängig von:** Nichts (Startphase)

**Details:**
- WebSocket-Message-Typen definieren: `files.list`, `files.read`, `files.write`, `files.create`, `files.delete`, `files.rename`, `files.mkdir`
- `FileService` mit Path-Traversal-Schutz (nach `DocsReader`-Pattern: `resolve()` + `relative()`)
- Dateigrößen-Limit (5 MB)
- Binärdatei-Erkennung (UTF-8-Validierung)
- Lazy Directory Listing (nur direkte Kinder, nicht rekursiv)

### Phase 2: File Tree Component & Sidebar
**Ziel:** Visueller Datei-Browser mit Tree-Navigation
**Komponenten:** `aos-file-tree`, `aos-file-tree-sidebar`, `app.ts` (Modifikation), `theme.css` (Erweiterung)
**Abhängig von:** Phase 1 (braucht `files.list`)

**Details:**
- Tree-View mit Expand/Collapse für Ordner
- Lazy-Loading: Verzeichnisinhalte nur bei Ordner-Öffnung laden
- Datei/Ordner-Icons basierend auf Typ/Endung
- Selected-File-Highlighting
- Truncation mit Tooltip für lange Namen
- Overlay-Sidebar: `position: fixed; left: 0; top: 0; bottom: 0;` mit z-index
- Resize-Handle am rechten Rand
- Toggle-Button im Header

### Phase 3: Code Editor & Tab Management
**Ziel:** Multi-Tab Code-Editor mit vollem Editing
**Komponenten:** `aos-file-editor`, `aos-file-tabs`, `aos-file-editor-panel`, CodeMirror-Sprachpakete
**Abhängig von:** Phase 1 (braucht `files.read` und `files.write`)

**Details:**
- CodeMirror-6-Integration nach `aos-docs-editor.ts` Pattern
- Sprach-Erkennung basierend auf Dateiendung (`.ts` → TypeScript, `.md` → Markdown, etc.)
- Theme-Support (dark/light) via bestehendem `themeService` + `Compartment`
- Tab-Bar mit Unsaved-Changes-Punkt-Indikator
- Ctrl+S / Cmd+S Keyboard-Shortcut für Speichern
- Save-Button im Editor-Header
- Tab-Close mit Unsaved-Changes-Warnung
- Tab-Limit (z.B. 15 offene Tabs)

### Phase 4: Context Menu & File Operations
**Ziel:** CRUD-Operationen via Rechtsklick-Kontextmenü im Dateibaum
**Komponenten:** `aos-file-context-menu`, Dialog-Komponenten für Rename/New/Delete
**Abhängig von:** Phase 1 + Phase 2

**Details:**
- Rechtsklick auf Tree-Items zeigt Kontextmenü
- "New File" - Name-Prompt, erstellen via `files.create`
- "New Folder" - Name-Prompt, erstellen via `files.mkdir`
- "Rename" - Inline-Editing oder Prompt, `files.rename`
- "Delete" - Bestätigungs-Dialog, `files.delete`
- Nach CRUD-Operationen: Betroffenes Verzeichnis im Tree refreshen

### Phase 5: Integration, Edge Cases & Polish
**Ziel:** Alle Komponenten verbinden, Edge Cases behandeln, Qualität sichern
**Komponenten:** Alle Komponenten - Integration + Edge-Case-Handling
**Abhängig von:** Alle vorherigen Phasen

**Details:**
- Extern gelöschte Datei während Tab offen: Warn-Banner im Editor
- Berechtigungsfehler: Error-Toast
- Binärdatei-Erkennung: "Binary file cannot be displayed" Message
- Auto-Save (optional, konfigurierbar): Debounced Write nach Änderungen
- Dateisuche/Filter im Tree (Nice-to-have): Text-Input oben in der Sidebar
- Keyboard-Navigation im File Tree

---

## Komponenten-Verbindungen (KRITISCH)

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| `app.ts` | `aos-file-tree-sidebar` | Lit Property Binding + Custom Events | Story 3 (Sidebar) | Component renders in App-Template |
| `aos-file-tree-sidebar` | `aos-file-tree` | Lit Property Binding + Custom Events | Story 2 (Tree) | Tree rendert in Sidebar |
| `aos-file-tree` | `gateway.ts` | `gateway.send({ type: 'files.list' })` | Story 2 (Tree) | WebSocket-Message gesendet |
| `gateway.ts` | `websocket.ts` | WebSocket Transport | Story 1 (Backend) | Message-Routing |
| `websocket.ts` | `FileHandler` | Method-Call-Delegation | Story 1 (Backend) | Switch-Case-Routing |
| `FileHandler` | `FileService` | Method Calls | Story 1 (Backend) | Service-Aufruf |
| `aos-file-tree` | `aos-file-editor-panel` | Custom Event `@file-open` | Story 3 (Sidebar) | Event-Listener auf Panel |
| `aos-file-editor-panel` | `aos-file-tabs` | Lit Property Binding (open files, active tab) | Story 5 (Tabs) | Tab-Bar rendert |
| `aos-file-editor-panel` | `aos-file-editor` | Lit Property Binding (content, language, filename) | Story 5 (Tabs) | Editor rendert |
| `aos-file-editor-panel` | `gateway.ts` | `gateway.send({ type: 'files.read/write' })` | Story 4 (Editor) | WebSocket-Messages |
| `aos-file-editor` | `aos-file-editor-panel` | Custom Events `@content-changed`, `@save-requested` | Story 4 (Editor) | Parent handles Events |
| `aos-file-tabs` | `aos-file-editor-panel` | Custom Events `@tab-select`, `@tab-close` | Story 5 (Tabs) | Parent handles Events |
| `aos-file-context-menu` | `aos-file-tree` | Custom Event `@menu-action` | Story 6 (Context Menu) | Tree handles Action |
| `aos-file-tree` | `gateway.ts` | `files.create` / `files.delete` / `files.rename` / `files.mkdir` | Story 6 (Context Menu) | WebSocket-Messages |

### Verbindungs-Details

**VERBINDUNG-1: app.ts → aos-file-tree-sidebar**
- **Art:** Lit Property Binding + Custom Events
- **Schnittstelle:** `<aos-file-tree-sidebar .isOpen=${this.isFileTreeOpen} @sidebar-close=${...} @file-open=${...}>`
- **Datenfluss:** Open/Close-State von App; Dateiauswahl-Events von Sidebar
- **Story:** Story 3 (File Tree Sidebar)
- **Validierung:** `grep "aos-file-tree-sidebar" ui/frontend/src/app.ts`

**VERBINDUNG-2: aos-file-tree → gateway (files.list)**
- **Art:** WebSocket-Message via Gateway-Singleton
- **Schnittstelle:** `gateway.send({ type: 'files.list', path: '/relative/dir' })` / `gateway.on('files.list', handler)`
- **Datenfluss:** Verzeichnispfad zum Server; Verzeichnislisting als Response
- **Story:** Story 2 (File Tree Component)
- **Validierung:** `grep "files.list" ui/frontend/src/components/file-editor/aos-file-tree.ts`

**VERBINDUNG-3: websocket.ts → FileHandler**
- **Art:** Method-Call-Delegation im handleMessage Switch
- **Schnittstelle:** `case 'files.list': this.fileHandler.handleList(client, message, projectPath)`
- **Datenfluss:** Client, Message, Project-Path zum Handler; Response zurück zum Client
- **Story:** Story 1 (Backend File API)
- **Validierung:** `grep "files\." ui/src/server/websocket.ts`

**VERBINDUNG-4: aos-file-tree → aos-file-editor-panel (file-open Event)**
- **Art:** Custom Event Bubbling
- **Schnittstelle:** `new CustomEvent('file-open', { detail: { path: string, filename: string } })`
- **Datenfluss:** Dateipfad von Tree-Auswahl zu Editor-Panel zum Laden
- **Story:** Story 3 (Sidebar-Integration)
- **Validierung:** `grep "file-open" ui/frontend/src/components/file-editor/aos-file-tree.ts`

**VERBINDUNG-5: aos-file-editor-panel → aos-file-editor (Content Binding)**
- **Art:** Lit Property Binding
- **Schnittstelle:** `.content=${activeTab.content} .language=${activeTab.language} .filename=${activeTab.filename}`
- **Datenfluss:** Datei-Content und Metadaten vom Panel-State zum Editor
- **Story:** Story 5 (Tab Management)
- **Validierung:** `grep "aos-file-editor" ui/frontend/src/components/file-editor/aos-file-editor-panel.ts`

### Verbindungs-Checkliste
- [x] Jede neue Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungsbefehle sind ausführbar

---

## Abhängigkeiten

### Interne Abhängigkeiten
```
aos-file-tree-sidebar ──contains──> aos-file-tree
aos-file-tree ──sends messages via──> gateway.ts
gateway.ts ──transports to──> websocket.ts
websocket.ts ──delegates to──> FileHandler
FileHandler ──uses──> FileService
aos-file-editor-panel ──contains──> aos-file-tabs + aos-file-editor
aos-file-editor-panel ──sends messages via──> gateway.ts
aos-file-tree ──opens files in──> aos-file-editor-panel
aos-file-context-menu ──triggers operations in──> aos-file-tree
app.ts ──orchestrates──> aos-file-tree-sidebar + aos-file-editor-panel
```

### Externe Abhängigkeiten
- **@codemirror/lang-javascript:** JavaScript/TypeScript Syntax-Highlighting (NEU)
- **@codemirror/lang-json:** JSON Syntax-Highlighting (NEU)
- **@codemirror/lang-html:** HTML Syntax-Highlighting (NEU)
- **@codemirror/lang-css:** CSS Syntax-Highlighting (NEU)
- **@codemirror/lang-yaml:** YAML Syntax-Highlighting (NEU, falls verfügbar)
- **@codemirror/lang-markdown:** Markdown Syntax-Highlighting (BEREITS installiert)

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Path-Traversal-Schwachstelle | Medium | High | `path.resolve()` + `path.relative()` Validierung wie `DocsReader`. Unit-Tests. |
| Performance bei großen Dateien | Low | Medium | 5MB Limit im Backend. CodeMirror handelt große Dateien gut. Warnung bei >1MB. |
| Binärdatei-Korruption | Medium | Medium | Binärdateien via UTF-8-Decode-Validierung erkennen. Klare Fehlermeldung. |
| CodeMirror Bundle-Größe | Low | Low | Dynamic Imports für Sprachpakete. Nur laden wenn Datei dieses Typs geöffnet wird. |
| Race Conditions beim Speichern | Low | Medium | Save-Button deaktivieren während Speichervorgang. Saving-Indikator anzeigen. |
| Z-Index-Konflikte Overlay-Sidebar | Low | Low | Gleiche Z-Index-Strategie wie Terminal-Sidebar. Test mit beiden Sidebars gleichzeitig. |
| Tab-Memory-Usage bei vielen Dateien | Low | Medium | Tab-Limit (Standard 15). Bei Überschreitung: LRU-Tab schließen (mit Unsaved-Check). |

---

## Self-Review Ergebnisse

### Validiert
- **COMPLETENESS:** Alle 7 vorgeschlagenen Stories aus der Requirements-Clarification sind über die 5 Phasen abgedeckt
- **CONSISTENCY:** Keine Widersprüche gefunden. WebSocket-Pattern ist konsistent mit bestehender Codebase
- **TECHNOLOGY:** CodeMirror 6 ist bereits im Projekt - natürliche, risikofreie Wahl
- **LAYOUT:** Overlay-von-links für die Dateibaum-Sidebar ist architektonisch solide und kollidiert nicht mit der Terminal-Sidebar (rechte Seite)
- **SECURITY:** Path-Traversal-Schutz folgt dem bewährten `DocsReader`-Pattern
- **CONNECTION COVERAGE:** Jede neue Komponente hat mindestens eine Verbindung in der Matrix. Jede Verbindung ist einer Story zugeordnet.

### Identifizierte Probleme & Lösungen

| Problem | Ursprünglicher Plan | Verbesserung |
|---------|---------------------|--------------|
| File Editor als Dashboard-Tab wäre einschränkend | Könnte ein vierter Dashboard-Tab neben Specs/Backlog/Docs sein | Globales Overlay (wie Terminal-Sidebar) das auf JEDEM View funktioniert |
| Einzelnes Context-Menu-Component reuse | Könnte `aos-context-menu.ts` erweitern | Separates `aos-file-context-menu` da Menü-Items komplett anders (Datei-Ops vs. Workflow-Actions) |
| Editor-Panel-Platzierung | Könnte in der Sidebar sein | Editor-Panel als separater Bereich der erscheint wenn Datei geöffnet wird. Sidebar + Editor nebeneinander. |

### Offene Fragen
- **Editor-Panel-Platzierung:** Editor-Panel ersetzt den Main-Content-Bereich (wie VS Code) oder Split-View? Empfehlung: Main-Content ersetzen, zugänglich via View-Navigation.
- **Auto-Save Default:** Auto-Save standardmäßig an oder aus? Empfehlung: Aus, toggle-bar pro Session.

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| CodeMirror-Integration (Theme-Compartment, Light/Dark, EditorView-Lifecycle) | `ui/frontend/src/components/docs/aos-docs-editor.ts` | `aos-file-editor` - gesamtes Init-Pattern wiederverwendbar |
| Overlay-Sidebar-Pattern (Fixed Positioning, Resize-Handle, Slide-Animation, Z-Index) | `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` | `aos-file-tree-sidebar` - Pattern für linke Seite spiegeln |
| Path-Traversal-Schutz (resolve + relative Validierung) | `ui/src/server/docs-reader.ts` | `FileService` - Pattern replizieren |
| WebSocket-Handler-Pattern (Klasse mit typed Methods, sendError Helper) | `ui/src/server/handlers/attachment.handler.ts` | `FileHandler` - identische Struktur folgen |
| Protocol-Types-Pattern (Message-Types, Request/Response-Interfaces) | `ui/src/shared/types/attachment.protocol.ts` | `file.protocol.ts` - identische Struktur folgen |
| Gateway-Event-Subscription-Pattern (setupHandlers, boundHandlers, removeHandlers) | `ui/frontend/src/components/docs/aos-docs-panel.ts` | `aos-file-editor-panel` - identisches Pattern |
| Unsaved-Changes-Handling (Pending Selection, Confirm Navigation) | `ui/frontend/src/components/docs/aos-docs-sidebar.ts` | `aos-file-tabs` - Pattern für Tab-Switching wiederverwenden |
| CSS Design Tokens (Spacing, Colors, Borders, Transitions) | `ui/frontend/src/styles/theme.css` | Alle File-Editor-Komponenten - bestehende Tokens nutzen |
| Context-Menu-Positionierung (Viewport-Bounds-Adjustment) | `ui/frontend/src/components/aos-context-menu.ts` | `aos-file-context-menu` - Positionierungslogik wiederverwenden |
| Project-Path-Resolution | `ui/src/server/utils/project-dirs.ts` | `FileService` - für Projekt-Root-Auflösung |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|-------------|-----------|
| Neue CodeMirror-Integration von Grund auf | `aos-docs-editor.ts` Pattern wiederverwenden + mit Language-Switching erweitern | ~60% weniger Editor-Boilerplate |
| Neue Sidebar von Grund auf | `aos-cloud-terminal-sidebar` Pattern spiegeln | ~50% weniger Sidebar-Boilerplate |
| Neue Protocol-Types von Grund auf | `attachment.protocol.ts` Struktur folgen | Klare Struktur, weniger Design-Time |
| Neuer Handler von Grund auf | `attachment.handler.ts` Pattern folgen | Konsistente Codebase |
| Custom Context-Menu bauen | `aos-context-menu.ts` Positionierungslogik wiederverwenden | ~30% weniger Context-Menu-Code |
| Custom Path-Validierung | `DocsReader` Validierungs-Pattern wiederverwenden | Bewährte Sicherheit |

### Feature-Preservation bestätigt
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar

**Detailliertes Mapping:**
- Dateibaum mit Tree-View → Phase 2 (Story 2)
- Toggle-Button im Header → Phase 2 (Story 3)
- Overlay-Sidebar von links → Phase 2 (Story 3)
- Ordner Expand/Collapse → Phase 2 (Story 2)
- Kontextmenü mit CRUD → Phase 4 (Story 6)
- Dateisuche/Filter (Nice-to-have) → Phase 5 (Story 7)
- Code-Editor (CodeMirror) → Phase 3 (Story 4)
- Syntax-Highlighting mit Auto-Detection → Phase 3 (Story 4)
- Zeilennummern → Phase 3 (Story 4, CodeMirror built-in)
- Multi-Tab-Support → Phase 3 (Story 5)
- Manuelles Speichern (Ctrl+S) → Phase 3 (Story 4)
- Auto-Save (optional) → Phase 5
- Unsaved-Changes-Warnung → Phase 3 (Story 5)
- Visueller Indikator für ungespeicherte Änderungen → Phase 3 (Story 5)
- Gesamtes Projektverzeichnis → Phase 1 (Story 1)
- Nur Text-Dateien → Phase 1 (Story 1, Binärerkennung)
- Path-Traversal-Schutz → Phase 1 (Story 1)
- Lazy-Loading Directory → Phase 2 (Story 2)
- 5MB Dateigrößen-Limit → Phase 1 (Story 1)
- Edge Cases → Phase 5

---

## Nächste Schritte

Nach Genehmigung dieses Plans:
1. Step 2.6: User Stories aus diesem Plan ableiten (7 Stories)
2. Step 3: Architect fügt technische Details hinzu (WAS/WIE/WO/DoR/DoD)
3. Step 4: Spec ready for /execute-tasks
