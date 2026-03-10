# UI Components

> Verfügbare UI-Komponenten im Projekt.
> Zuletzt aktualisiert: 2026-03-10 (Document Preview Panel)

## Komponenten-Übersicht

| Komponente | Pfad | Props/Variants | Erstellt in Spec |
|------------|------|----------------|------------------|
| aos-file-tree | ui/frontend/src/components/file-editor/aos-file-tree.ts | rootPath, selectedPath, filterText | File Editor (2026-02-16) |
| aos-file-tree-sidebar | ui/frontend/src/components/file-editor/aos-file-tree-sidebar.ts | isOpen | File Editor (2026-02-16) |
| aos-file-editor | ui/frontend/src/components/file-editor/aos-file-editor.ts | content, filename | File Editor (2026-02-16) |
| aos-file-tabs | ui/frontend/src/components/file-editor/aos-file-tabs.ts | tabs, activeTabPath | File Editor (2026-02-16) |
| aos-file-editor-panel | ui/frontend/src/components/file-editor/aos-file-editor-panel.ts | (Orchestrator) | File Editor (2026-02-16) |
| aos-installation-wizard-modal | ui/frontend/src/components/setup/aos-installation-wizard-modal.ts | projectPath, hasSpecwright, hasProductBrief, fileCount, open | Installation Wizard (2026-02-17) |
| aos-getting-started-view | ui/frontend/src/views/aos-getting-started-view.ts | hasProductBrief, projectName | Installation Wizard (2026-02-17) |
| aos-team-view | ui/frontend/src/views/team-view.ts | (uses projectContext) | Dev-Team Visualization (2026-02-26) |
| aos-team-card | ui/frontend/src/components/team/aos-team-card.ts | skill: SkillSummary | Dev-Team Visualization (2026-02-26) |
| aos-team-detail-modal | ui/frontend/src/components/team/aos-team-detail-modal.ts | open, skillId | Dev-Team Visualization (2026-02-26) |
| aos-team-edit-modal | ui/frontend/src/components/team/aos-team-edit-modal.ts | open, skillId | Custom Team Members (2026-02-26) |
| aos-mcp-server-card | ui/frontend/src/components/team/aos-mcp-server-card.ts | server: McpServerSummary | MCP Tools Management (2026-02-27) |
| aos-voice-call-view | ui/frontend/src/views/voice-call-view.ts | (Orchestrator) | Voice Call Conversational Flow (2026-03-01) |
| aos-audio-visualizer | ui/frontend/src/components/voice/audio-visualizer.ts | audioData, isActive | Voice Call Conversational Flow (2026-03-01) |
| aos-call-controls | ui/frontend/src/components/voice/call-controls.ts | callState, isMuted, inputMode | Voice Call Conversational Flow (2026-03-01) |
| aos-action-log | ui/frontend/src/components/voice/action-log.ts | actions | Voice Call Conversational Flow (2026-03-01) |
| aos-call-transcript | ui/frontend/src/components/voice/call-transcript.ts | entries | Voice Call Conversational Flow (2026-03-01) |
| aos-document-preview-panel | ui/frontend/src/components/document-preview/aos-document-preview-panel.ts | isOpen, content, filePath | Document Preview Panel (2026-03-10) |

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

### aos-installation-wizard-modal

**Pfad:** `ui/frontend/src/components/setup/aos-installation-wizard-modal.ts`
**Erstellt:** Installation Wizard (2026-02-17)

**Beschreibung:** Modaler Wizard fuer Specwright-Installation mit zweistufiger Logik: (1) Framework-Installation via install.sh, (2) Planning-Command-Auswahl. Erkennt Bestandsprojekte via Dateianzahl.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| open | boolean | false | Modal sichtbar/versteckt |
| hasSpecwright | boolean | false | Ob specwright/ Ordner existiert |
| hasProductBrief | boolean | false | Ob Product Brief existiert |
| fileCount | number | 0 | Anzahl Top-Level-Dateien (Bestandsprojekt-Erkennung) |
| projectPath | string | '' | Pfad zum Projekt |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| modal-close | - | Modal soll geschlossen werden |
| wizard-cancel | - | Wizard wurde abgebrochen |
| command-selected | { command, projectPath } | Planning-Command wurde im Terminal ausgefuehrt |

**Usage Example:**
```html
<aos-installation-wizard-modal
  .open=${this.showWizard}
  .hasSpecwright=${this.wizardHasSpecwright}
  .hasProductBrief=${this.wizardHasProductBrief}
  .fileCount=${this.wizardFileCount}
  .projectPath=${this.wizardProjectPath}
  @modal-close=${this._handleWizardClose}
  @wizard-cancel=${this._handleWizardCancel}
  @command-selected=${this._handleWizardComplete}
></aos-installation-wizard-modal>
```

**Notes:**
- Multi-Step-Wizard: install -> command-select -> terminal -> complete
- Nutzt aos-terminal-session fuer Command-Ausfuehrung
- Light DOM Pattern
- Bestandsprojekt-Hinweis bei fileCount > 10

---

### aos-getting-started-view

**Pfad:** `ui/frontend/src/views/aos-getting-started-view.ts`
**Erstellt:** Installation Wizard (2026-02-17)

**Beschreibung:** Getting-Started-View mit kontextabhaengigen Naechste-Schritte-Cards. Zeigt Planning-Commands wenn kein Product Brief, sonst create-spec/add-todo/add-bug.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| hasProductBrief | boolean | false | Ob Product Brief existiert (steuert Card-Auswahl) |
| hasSpecwright | boolean | true | Ob Specwright installiert ist |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| workflow-start-interactive | { command } | Workflow soll im Terminal gestartet werden |

**Usage Example:**
```html
<aos-getting-started-view
  .hasProductBrief=${this.hasProductBrief}
  .hasSpecwright=${this.hasSpecwright}
></aos-getting-started-view>
```

**Notes:**
- Drei Zustaende: not installed, no product brief, fully configured
- Erreichbar via /getting-started Route und Sidebar-Navigation
- Light DOM Pattern

---

### aos-team-view

**Pfad:** `ui/frontend/src/views/team-view.ts`
**Erstellt:** Dev-Team Visualization (2026-02-26)

**Beschreibung:** Team-Übersichtsseite mit responsivem Karten-Grid. Lädt Skills via REST-API und zeigt Loading/Error/Empty States. Nutzt projectContext für aktiven Projektpfad.

**Props/State:**
| Prop/State | Type | Default | Description |
|------------|------|---------|-------------|
| skills (state) | SkillSummary[] | [] | Geladene Skills-Liste |
| viewState (state) | 'loading' \| 'loaded' \| 'empty' \| 'error' | 'loading' | Aktueller View-State |
| modalOpen (state) | boolean | false | Detail-Modal geöffnet |
| selectedSkillId (state) | string | '' | ID des ausgewählten Skills |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| team-skill-select | { skillId } | Skill-Karte wurde angeklickt |

**Usage Example:**
```html
<aos-team-view></aos-team-view>
```

**Notes:**
- Nutzt `@consume` projectContext für aktiven Projektpfad
- API-Call: `GET /api/team/${encodedPath}/skills`
- Light DOM Pattern
- Enthält aos-team-detail-modal Integration

---

### aos-team-card

**Pfad:** `ui/frontend/src/components/team/aos-team-card.ts`
**Erstellt:** Dev-Team Visualization (2026-02-26)

**Beschreibung:** Skill-Karte mit Name, Kategorie-Badge (farbcodiert), Beschreibung und Learnings-Anzeige.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| skill | SkillSummary | - | Skill-Daten für die Anzeige |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| card-click | { skillId } | Karte wurde angeklickt |

**Usage Example:**
```html
<aos-team-card
  .skill=${skillSummary}
  @card-click=${this.handleCardClick}
></aos-team-card>
```

**Notes:**
- Kategorie-Badges: frontend (blau), backend (grün), architecture (lila), quality, domain, devops, product
- Light DOM Pattern
- Zeigt "Always Active" Badge wenn `alwaysApply: true`

---

### aos-team-detail-modal

**Pfad:** `ui/frontend/src/components/team/aos-team-detail-modal.ts`
**Erstellt:** Dev-Team Visualization (2026-02-26)

**Beschreibung:** Modal mit Tabs für Skill-Inhalt (SKILL.md) und Learnings (dos-and-donts.md). Lazy-Loading der Detail-Daten bei Öffnung.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| open | boolean | false | Modal sichtbar/versteckt |
| skillId | string | '' | ID des anzuzeigenden Skills |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| modal-close | - | Modal soll geschlossen werden |

**Usage Example:**
```html
<aos-team-detail-modal
  .open=${this.modalOpen}
  .skillId=${this.selectedSkillId}
  @modal-close=${this.handleModalClose}
></aos-team-detail-modal>
```

**Notes:**
- Tabs: "Skill" (SKILL.md Inhalt) und "Learnings" (dos-and-donts.md)
- Escape-Taste und Click-Outside zum Schließen
- Lazy Loading: Detail-Daten erst bei Modal-Öffnung
- API-Call: `GET /api/team/${encodedPath}/skills/${skillId}`
- Light DOM Pattern
- Nutzt `@consume` projectContext

---

### aos-team-edit-modal

**Pfad:** `ui/frontend/src/components/team/aos-team-edit-modal.ts`
**Erstellt:** Custom Team Members (2026-02-26)

**Beschreibung:** Modal mit integriertem CodeMirror-Editor (aos-file-editor) zur Bearbeitung von SKILL.md Inhalten. Lazy-Loading der Skill-Daten, Speichern via PUT API.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| open | boolean | false | Modal sichtbar/versteckt |
| skillId | string | '' | ID des zu bearbeitenden Skills |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| modal-close | - | Modal soll geschlossen werden |
| skill-saved | { skillId } | Skill wurde erfolgreich gespeichert |

**Usage Example:**
```html
<aos-team-edit-modal
  .open=${this.editModalOpen}
  .skillId=${this.editSkillId}
  @modal-close=${this.handleEditClose}
  @skill-saved=${this.handleSkillSaved}
></aos-team-edit-modal>
```

**Notes:**
- Nutzt aos-file-editor (CodeMirror 6) für Markdown-Editing
- Lazy Loading: Detail-Daten erst bei Modal-Öffnung
- API-Call: PUT /api/team/${encodedPath}/skills/${skillId}
- Escape-Taste und Click-Outside zum Schließen
- Light DOM Pattern
- Nutzt `@consume` projectContext

---

### aos-mcp-server-card

**Pfad:** `ui/frontend/src/components/team/aos-mcp-server-card.ts`
**Erstellt:** MCP Tools Management (2026-02-27)

**Beschreibung:** Read-only Karte zur Anzeige eines MCP-Servers. Zeigt Name, Typ-Badge (stdio/sse/etc.) und Command+Args an.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| server | McpServerSummary | - | MCP-Server-Daten (name, type, command, args) |

**Usage Example:**
```html
<aos-mcp-server-card .server=${mcpServer}></aos-mcp-server-card>
```

**Notes:**
- Keine Events (read-only Anzeige)
- Typ-Badge farbcodiert (stdio, sse, etc.)
- Light DOM Pattern
- Wird in team-view.ts im MCP-Bereich gerendert

---

### aos-voice-call-view

**Pfad:** `ui/frontend/src/views/voice-call-view.ts`
**Erstellt:** Voice Call Conversational Flow (2026-03-01)

**Beschreibung:** Vollbild Voice Call View mit Gateway Integration. Orchestriert Audio-Visualizer, Call-Controls, Action-Log und Transcript. Verwaltet den gesamten Call-Lifecycle (idle -> connecting -> active -> ended).

**Usage Example:**
```html
<aos-voice-call-view></aos-voice-call-view>
```

**Notes:**
- Vollbild-View, erreichbar via `/call/:agentId` Route
- Integriert AudioCaptureService und AudioPlaybackService
- Gateway-Subscriptions fuer voice:* WebSocket Messages
- Light DOM Pattern

---

### aos-audio-visualizer

**Pfad:** `ui/frontend/src/components/voice/audio-visualizer.ts`
**Erstellt:** Voice Call Conversational Flow (2026-03-01)

**Beschreibung:** Canvas-basierte Audio-Wellenform-Visualisierung. Zeigt Echtzeit-Audioaktivitaet als animierte Wellenform an.

**Usage Example:**
```html
<aos-audio-visualizer
  .audioData=${this.audioData}
  .isActive=${this.isActive}
></aos-audio-visualizer>
```

**Notes:**
- Canvas-basiertes Rendering fuer Performance
- Animiert via requestAnimationFrame
- Light DOM Pattern

---

### aos-call-controls

**Pfad:** `ui/frontend/src/components/voice/call-controls.ts`
**Erstellt:** Voice Call Conversational Flow (2026-03-01)

**Beschreibung:** Voice Call Steuerungs-Buttons (Mute, End Call, Input Mode Switch). Unterstuetzt Umschaltung zwischen Voice- und Text-Modus.

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| mute-toggle | - | Mikrofon stumm/aktiv schalten |
| end-call | - | Call beenden |
| input-mode-change | { mode: 'voice' \| 'text' } | Eingabemodus wechseln |

**Usage Example:**
```html
<aos-call-controls
  .callState=${this.callState}
  .isMuted=${this.isMuted}
  .inputMode=${this.inputMode}
  @mute-toggle=${this._handleMuteToggle}
  @end-call=${this._handleEndCall}
  @input-mode-change=${this._handleInputModeChange}
></aos-call-controls>
```

**Notes:**
- Light DOM Pattern
- Unterstuetzt Text-Fallback-Modus (VCF-010)

---

### aos-action-log

**Pfad:** `ui/frontend/src/components/voice/action-log.ts`
**Erstellt:** Voice Call Conversational Flow (2026-03-01)

**Beschreibung:** Live-Streaming Action Log fuer Tool-Calls. Zeigt Agent-Aktionen in Echtzeit an (Tool-Aufrufe, Ergebnisse, etc.).

**Usage Example:**
```html
<aos-action-log .actions=${this.actions}></aos-action-log>
```

**Notes:**
- Auto-Scroll zum neuesten Eintrag
- Farbcodierung nach Aktionstyp
- Light DOM Pattern

---

### aos-call-transcript

**Pfad:** `ui/frontend/src/components/voice/call-transcript.ts`
**Erstellt:** Voice Call Conversational Flow (2026-03-01)

**Beschreibung:** Live-Gespraechs-Transkript mit Farbcodierung. Zeigt User- und Agent-Beitraege in Echtzeit an.

**Usage Example:**
```html
<aos-call-transcript .entries=${this.transcriptEntries}></aos-call-transcript>
```

**Notes:**
- Farbcodierung: User vs Agent Beitraege
- Auto-Scroll zum neuesten Eintrag
- Light DOM Pattern

---

### aos-document-preview-panel

**Pfad:** `ui/frontend/src/components/document-preview/aos-document-preview-panel.ts`
**Erstellt:** Document Preview Panel (2026-03-10)

**Beschreibung:** Overlay Side-Panel von links mit Markdown-Viewer (aos-docs-viewer) und CodeMirror-Editor (aos-file-editor). Öffnet/schließt sich via MCP-Tool-generierte Preview-Requests über WebSocket.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| isOpen | boolean | false | Panel sichtbar/versteckt |
| content | string | '' | Markdown-Inhalt zur Anzeige |
| filePath | string | '' | Pfad zur Datei (für Save-Operation) |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| panel-close | - | Panel soll geschlossen werden |

**Gateway Messages:**
| Message | Direction | Description |
|---------|-----------|-------------|
| document-preview.open | Incoming | Öffnet Panel mit filePath + content |
| document-preview.close | Incoming | Schließt Panel |
| document-preview.save | Outgoing | Speichert editierten Inhalt |
| document-preview.save.response | Incoming | Save-Bestätigung |

**Usage Example:**
```html
<aos-document-preview-panel
  .isOpen=${this.previewOpen}
  .content=${this.previewContent}
  .filePath=${this.previewFilePath}
  @panel-close=${this._handlePreviewClose}
></aos-document-preview-panel>
```

**Notes:**
- Light DOM Pattern
- Slide-in von links mit CSS-Transition (folgt aos-file-tree-sidebar Pattern)
- z-index 1000
- View/Edit Mode Toggle
- Unsaved Changes Warning bei Content-Switch
- Save via WebSocket (document-preview.save)

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
