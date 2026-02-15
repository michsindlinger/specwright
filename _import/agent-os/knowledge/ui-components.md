# UI Components

> Zentrale Dokumentation für wiederverwendbare Lit Web Components
> Last Updated: 2026-02-12

## Overview

Tabelle aller UI Components im Projekt:

| Name | Pfad | Props/Signature | Quelle Spec | Datum |
|------|------|-----------------|-------------|-------|
| aos-context-menu | agent-os-ui/ui/src/components/aos-context-menu.ts | - | Context Menu (2026-02-03) | 2026-02-03 |
| aos-workflow-modal | agent-os-ui/ui/src/components/aos-workflow-modal.ts | open: boolean, workflowCommand: WorkflowCommand, mode: 'direct' | 'add-story' | Context Menu (2026-02-03) | 2026-02-03 |
| aos-confirm-dialog | agent-os-ui/ui/src/components/aos-confirm-dialog.ts | open: boolean, title: string, message: string | Context Menu (2026-02-03) | 2026-02-03 |
| aos-spec-selector | agent-os-ui/ui/src/components/aos-spec-selector.ts | - | Context Menu (2026-02-03) | 2026-02-03 |
| aos-spec-chat | agent-os-ui/ui/src/components/chat/aos-spec-chat.ts | messages: ChatMessage[], isLoading: boolean | Chat with the Spec (2026-02-04) | 2026-02-04 |
| aos-cloud-terminal-sidebar | agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts | - | Cloud Code Terminal (2026-02-05) | 2026-02-05 |
| aos-terminal-tabs | agent-os-ui/ui/src/components/terminal/aos-terminal-tabs.ts | - | Cloud Code Terminal (2026-02-05) | 2026-02-05 |
| aos-terminal-session | agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts | - | Cloud Code Terminal (2026-02-05) | 2026-02-05 |
| aos-model-dropdown | agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts | - | Cloud Code Terminal (2026-02-05) | 2026-02-05 |
| aos-git-status-bar | agent-os-ui/ui/src/components/git/aos-git-status-bar.ts | branch, ahead, behind, changedFiles, branches, isOperationRunning | Git Integration UI (2026-02-11) | 2026-02-11 |
| aos-git-commit-dialog | agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts | open, files, error | Git Integration UI (2026-02-11) | 2026-02-11 |
| aos-spec-file-tabs | agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts | files, activeFile | Spec Docs Viewer Extension (2026-02-12) | 2026-02-12 |
| aos-setup-wizard | agent-os-ui/ui/src/components/setup/aos-setup-wizard.ts | - (self-contained) | AgentOS Extended Setup Wizard (2026-02-13) | 2026-02-13 |
| aos-kanban-board | agent-os-ui/ui/src/components/kanban-board.ts | mode, stories, showChat, showSpecViewer, showGitStrategy | Unified Kanban Board (2026-02-13) | 2026-02-13 |
| aos-quick-todo-modal | agent-os-ui/ui/src/components/aos-quick-todo-modal.ts | open | Quick-To-Do (2026-02-13) | 2026-02-13 |

---

## Detail-Dokumentation

### aos-spec-chat

**Pfad:** `agent-os-ui/ui/src/components/chat/aos-spec-chat.ts`

**Beschreibung:** Diese Komponente dient als UI für den spec-spezifischen Chat. Sie ist eine "dumb" component, die Nachrichten anzeigt und Benutzereingaben über Events weitergibt.

**Usage:**
```typescript
<aos-spec-chat
  .messages=${this.chatMessages}
  ?isLoading=${this.isChatLoading}
  @send-message=${(e: CustomEvent) => this.handleSendMessage(e.detail.value)}>
</aos-spec-chat>
```

**Props/API:**
| Prop/Parameter | Typ | Beschreibung |
|----------------|-----|--------------|
| messages | ChatMessage[] | Liste der anzuzeigenden Nachrichten |
| isLoading | boolean | Zeigt einen Ladeindikator während Claude antwortet |

**Events:**
- `send-message`: Wird ausgelöst, wenn der Benutzer eine Nachricht abschickt. Detail enthält `{ value: string }`.

**Source Spec:** Chat with the Spec (2026-02-04)

---

### aos-context-menu

**Pfad:** `agent-os-ui/ui/src/components/aos-context-menu.ts`

**Beschreibung:** Rechtsklick-Kontextmenü mit konfigurierbaren Menu Items. Zeigt 4 Aktionen: "Neue Spec erstellen", "Bug erstellen", "TODO erstellen", "Story zu Spec hinzufügen". Positioniert sich automatisch an Mauskoordinaten und bleibt im sichtbaren Viewport-Bereich.

**Usage:**
```typescript
// In app.ts oder parent component
<aos-context-menu
  ?open=${this.showContextMenu}
  .x=${this.contextMenuPosition.x}
  .y=${this.contextMenuPosition.y}
  @menu-item-select=${this.handleMenuItemSelect}>
</aos-context-menu>
```

**Events:**
| Event | Detail | Beschreibung |
|-------|--------|--------------|
| menu-item-select | { action: 'create-spec' \| 'add-bug' \| 'add-todo' \| 'add-story' } | Wird ausgelöst wenn ein Menu Item geklickt wird |

**CSS Integration:**
- Styles in `agent-os-ui/ui/src/styles/theme.css` unter `.context-menu`
- Nutzt CSS Custom Properties: `--color-bg-secondary`, `--color-border`, `--color-text-primary`
- z-index: 1000

**Source Spec:** Context Menu (CTX-001, 2026-02-03)

**Integration Notes:**
- Light DOM Pattern (`createRenderRoot = this`)
- Event mit `bubbles: true, composed: true`
- Schließt bei Outside-Click und ESC-Taste
- Viewport-Boundary Check für Randpositionen

---

### aos-workflow-modal

**Pfad:** `agent-os-ui/ui/src/components/aos-workflow-modal.ts`

**Beschreibung:** Generisches Modal das beliebige Workflow-Karten einbetten kann. Unterstützt zwei Modi: Direct (Workflow sofort anzeigen) und Add-Story (zuerst Spec-Selector, dann Workflow). Beinhaltet Dirty State Tracking für Unsaved Changes Dialog.

**Usage:**
```typescript
// Direct Mode - Workflow sofort anzeigen
<aos-workflow-modal
  ?open=${this.showWorkflowModal}
  .workflowCommand=${{id: 'agent-os:create-spec'}}
  .mode=${'direct'}
  @modal-close=${this.handleModalClose}
  @workflow-start-interactive=${this.handleWorkflowStart}>
</aos-workflow-modal>

// Add-Story Mode - Zwei-Schritt-Flow
<aos-workflow-modal
  ?open=${this.showWorkflowModal}
  .workflowCommand=${{id: 'agent-os:add-story'}}
  .mode=${'add-story'}
  @modal-close=${this.handleModalClose}
  @workflow-start-interactive=${this.handleWorkflowStart}>
</aos-workflow-modal>
```

**Properties:**
| Property | Typ | Pflicht | Beschreibung |
|----------|-----|---------|--------------|
| open | boolean | Ja | Steuert Modal-Sichtbarkeit |
| workflowCommand | WorkflowCommand | Ja | Workflow der angezeigt werden soll |
| mode | 'direct' \| 'add-story' | Nein | Modus: Direct=Workflow sofort, Add-Story=Spec-Selector zuerst |

**Events:**
| Event | Detail | Beschreibung |
|-------|--------|--------------|
| modal-close | - | Wird ausgelöst wenn Modal geschlossen wird |
| workflow-start-interactive | { command: WorkflowCommand, argument?: string } | Wird ausgelöst wenn Workflow gestartet wird |

**Integrierte Components:**
- `aos-workflow-card` - Zeigt die eigentliche Workflow-Karte
- `aos-spec-selector` - Für Add-Story Modus (Schritt 1)
- `aos-confirm-dialog` - Für Dirty State Bestätigung

**CSS Integration:**
- Styles in `agent-os-ui/ui/src/styles/theme.css` unter `.workflow-modal`
- Nutzt bestehende Modal-Styles als Basis (`.create-spec-modal`)
- z-index: 1001 (über context-menu)

**Source Spec:** Context Menu (CTX-003, 2026-02-03)

**Integration Notes:**
- Light DOM Pattern
- Focus Trap mit Tab Key Handler
- Dirty State Tracking via `input` Event von aos-workflow-card
- ESC und Outside-Click mit Confirm Dialog bei Dirty State
- "Zurück" Button im Add-Story Mode

---

### aos-confirm-dialog

**Pfad:** `agent-os-ui/ui/src/components/aos-confirm-dialog.ts`

**Beschreibung:** Leichtgewichtiger Bestätigungsdialog für "Änderungen verwerfen?" Szenarien. Zeigt Titel und Nachricht mit zwei Buttons: "Abbrechen" und "Verwerfen" (destructive).

**Usage:**
```typescript
<aos-confirm-dialog
  ?open=${this.showConfirmDialog}
  .title=${'Änderungen verwerfen?'}
  .message=${'Du hast ungespeicherte Änderungen. Möchtest du diese wirklich verwerfen?'}
  @confirm=${this.handleConfirm}
  @cancel=${this.handleCancel}>
</aos-confirm-dialog>
```

**Properties:**
| Property | Typ | Pflicht | Beschreibung |
|----------|-----|---------|--------------|
| open | boolean | Ja | Steuert Dialog-Sichtbarkeit |
| title | string | Ja | Dialog-Titel |
| message | string | Ja | Dialog-Nachricht |

**Events:**
| Event | Detail | Beschreibung |
|-------|--------|--------------|
| confirm | - | User klickte "Verwerfen" (destructive action) |
| cancel | - | User klickte "Abbrechen" |

**CSS Integration:**
- Styles in `agent-os-ui/ui/src/styles/theme.css` unter `.confirm-dialog`
- Destructive Button mit `--color-accent-error`
- z-index: 1002 (über workflow-modal)

**Source Spec:** Context Menu (CTX-003, 2026-02-03)

**Integration Notes:**
- Light DOM Pattern
- Wird typischerweise von aos-workflow-modal bei Dirty State verwendet
- Kann aber auch standalone verwendet werden

---

### aos-spec-selector

**Pfad:** `agent-os-ui/ui/src/components/aos-spec-selector.ts`

**Beschreibung:** Spec-Auswahlkomponente mit Suchfunktion. Zeigt alle verfügbaren Specs als scrollbare Liste und ermöglicht client-seitige Filterung über Suchfeld. Unterstützt Loading State während Specs geladen werden.

**Usage:**
```typescript
<aos-spec-selector
  @spec-selected=${this.handleSpecSelected}>
</aos-spec-selector>
```

**Events:**
| Event | Detail | Beschreibung |
|-------|--------|--------------|
| spec-selected | { id: string, name: string, path: string } | Wird ausgelöst wenn eine Spec ausgewählt wird |

**Gateway Integration:**
- Nutzt `specs.list` WebSocket Request
- Response Handler speichert Specs in Component State

**Features:**
- **Search Filter:** Client-seitige Filterung basierend auf `searchTerm` State
- **Loading State:** Zeigt `aos-loading-spinner` während Laden
- **Empty State:** "Keine Specs vorhanden" mit Hinweis "Erstelle zuerst eine Spec"
- **No Results State:** "Keine Specs gefunden" bei leerem Suchergebnis
- **Keyboard Support:** Enter auf Suchfeld selektiert erstes Ergebnis

**CSS Integration:**
- Styles in `agent-os-ui/ui/src/styles/theme.css` unter `.spec-selector`
- Suchfeld mit `--color-bg-primary` und `--color-border`
- List Items mit hover State (`--color-bg-tertiary`)
- Abwechselnde Hintergrundfarben mit `:nth-child(even)`

**Source Spec:** Context Menu (CTX-004, 2026-02-03)

**Integration Notes:**
- Light DOM Pattern
- Gateway: `gateway.send({ type: 'specs.list' })`
- Caching: Specs werden in Component State gespeichert
- Computed Property für `filteredSpecs` basierend auf `searchTerm`

---

### aos-cloud-terminal-sidebar

**Pfad:** `agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts`

**Beschreibung:** Ein-/ausfahrbare Sidebar für das Cloud Terminal. Enthält Tab-Leiste, Session-Management und "Neue Session" Button. Fährt von rechts ein/aus mit CSS transitions.

**Usage:**
```typescript
<aos-cloud-terminal-sidebar
  ?open=${this.showTerminalSidebar}>
</aos-cloud-terminal-sidebar>
```

**Source Spec:** Cloud Code Terminal (CCT-002, 2026-02-05)

**Integration Notes:**
- Light DOM Pattern
- Fixed positioning mit z-index
- CSS transitions für slide-in/out
- Enthält aos-terminal-tabs und aos-terminal-session als Kinder

---

### aos-terminal-tabs

**Pfad:** `agent-os-ui/ui/src/components/terminal/aos-terminal-tabs.ts`

**Beschreibung:** Tab-Leiste für Terminal Sessions. Zeigt aktive Sessions als Tabs mit Modell-Name und Close-Button.

**Usage:**
```typescript
<aos-terminal-tabs></aos-terminal-tabs>
```

**Source Spec:** Cloud Code Terminal (CCT-002, 2026-02-05)

**Integration Notes:**
- Light DOM Pattern
- Wird in aos-cloud-terminal-sidebar eingebettet
- Tab-Wechsel dispatcht Events

---

### aos-terminal-session

**Pfad:** `agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts`

**Beschreibung:** Terminal Session Wrapper mit State Management. Kapselt das bestehende aos-terminal Component und fügt Session-Lifecycle hinzu.

**Usage:**
```typescript
<aos-terminal-session></aos-terminal-session>
```

**Source Spec:** Cloud Code Terminal (CCT-003, 2026-02-05)

**Integration Notes:**
- Light DOM Pattern
- Nutzt bestehendes aos-terminal Component
- Session-State wird in CloudTerminalService verwaltet
- WebSocket-Verbindung für Terminal-I/O

---

### aos-model-dropdown

**Pfad:** `agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts`

**Beschreibung:** Modell-Auswahl Dropdown für Cloud Terminal. Zeigt alle konfigurierten Provider-Modelle gruppiert nach Provider.

**Usage:**
```typescript
<aos-model-dropdown></aos-model-dropdown>
```

**Source Spec:** Cloud Code Terminal (CCT-003/CCT-005, 2026-02-05)

**Integration Notes:**
- Light DOM Pattern
- Fetcht Provider-Konfiguration via CloudTerminalService
- Speichert zuletzt verwendetes Modell

---

## Component Patterns

### Light DOM Pattern

Alle wiederverwendbaren Components nutzen Light DOM statt Shadow DOM:

```typescript
export class AoSContextMenu extends LitElement {
  createRenderRoot() {
    return this;
  }
}
```

**Vorteile:**
- Globale Styles wirken direkt (kein ::part workaround)
- Einfacheres CSS ohne CSS Custom Properties propagieren
- Bessere Integration mit bestehenden Styles

### Event Dispatch Pattern

Alle Custom Events nutzen的一致 pattern:

```typescript
this.dispatchEvent(new CustomEvent('event-name', {
  bubbles: true,
  composed: true,
  detail: { /* data */ }
}));
```

**Vorteile:**
- Events bubbeln durch Component Grenzen
-composed: true erlaubt Event über Shadow DOM Grenzen (auch wenn wir Light DOM nutzen)

### z-Index Hierarchy

Für modale Components:

| Component | z-Index |
|-----------|---------|
| context-menu | 1000 |
| workflow-modal | 1001 |
| confirm-dialog | 1002 |

**Regel:** Jede Modale Ebene hat höheren z-Index als die darunterliegende.

---

## Migration Guide

### Bestehenden Component in Knowledge aufnehmen

1. Story File mit `Creates Reusable: yes` erstellen
2. Component mit `@customElement('aos-my-component')` dekorieren
3. Light DOM Pattern nutzen (`createRenderRoot = this`)
4. Custom Events mit `bubbles: true, composed: true` dispatchen
5. Diese Datei aktualisieren:
   - Eintrag in Overview-Tabelle hinzufügen
   - Detail-Sektion mit Documentation hinzufügen
6. Spec-Referenz und Datum eintragen

---

### aos-git-status-bar

**Pfad:** `agent-os-ui/ui/src/components/git/aos-git-status-bar.ts`

**Beschreibung:** Git Status-Leiste die unterhalb der Projekt-Tabs angezeigt wird. Zeigt Branch-Name (klickbar fuer Branch-Wechsel-Dropdown), Ahead/Behind-Zaehler, Anzahl geaenderter Dateien, und Action Buttons (Pull mit Rebase-Option, Push, Commit, Refresh). Unterstuetzt Loading-State und Operation-Lock.

**Usage:**
```typescript
<aos-git-status-bar
  .gitStatus=${this.gitStatus}
  .branches=${this.gitBranches}
  .isOperationRunning=${this.gitOperationRunning}
  @refresh-git=${this.handleRefreshGit}
  @open-commit-dialog=${this.handleOpenCommitDialog}
  @pull-git=${this.handlePullGit}
  @push-git=${this.handlePushGit}
  @checkout-branch=${this.handleCheckoutBranch}>
</aos-git-status-bar>
```

**Events:**
| Event | Detail | Beschreibung |
|-------|--------|--------------|
| refresh-git | - | Refresh-Button geklickt |
| open-commit-dialog | - | Commit-Button geklickt |
| pull-git | { rebase?: boolean } | Pull-Button geklickt |
| push-git | - | Push-Button geklickt |
| checkout-branch | { branch: string } | Branch im Dropdown ausgewaehlt |

**Source Spec:** Git Integration UI (GIT-002/003/005, 2026-02-11)

**Integration Notes:**
- Light DOM Pattern
- Daten werden ausschliesslich ueber Properties von app.ts empfangen
- Branch-Dropdown mit Uncommitted-Changes-Warnung
- Operation-Lock deaktiviert alle Buttons waehrend laufender Git-Operation

---

### aos-git-commit-dialog

**Pfad:** `agent-os-ui/ui/src/components/git/aos-git-commit-dialog.ts`

**Beschreibung:** Modal-Dialog fuer Git Commits mit scrollbarer Dateiliste (Checkboxen + Status-Badges: modified, added, deleted, untracked), Commit-Message-Textarea und Commit/Abbrechen Buttons. Commit-Button ist deaktiviert wenn keine Dateien ausgewaehlt oder keine Message eingegeben.

**Usage:**
```typescript
<aos-git-commit-dialog
  ?open=${this.showCommitDialog}
  .files=${this.gitStatus?.changedFiles || []}
  .error=${this.commitError}
  @git-commit=${this.handleGitCommit}
  @close-dialog=${this.handleCloseCommitDialog}>
</aos-git-commit-dialog>
```

**Events:**
| Event | Detail | Beschreibung |
|-------|--------|--------------|
| git-commit | { files: string[], message: string } | Commit-Button geklickt mit ausgewaehlten Dateien und Message |
| close-dialog | - | Abbrechen-Button oder ESC geklickt |

**Source Spec:** Git Integration UI (GIT-004, 2026-02-11)

**Integration Notes:**
- Light DOM Pattern
- Status-Badges mit farbcodierten CSS-Klassen
- Fehleranzeige im Dialog bei fehlgeschlagenem Commit
- Dateiliste scrollbar bei vielen Dateien

---

### aos-spec-file-tabs

**Pfad:** `agent-os-ui/ui/src/components/specs/aos-spec-file-tabs.ts`

**Beschreibung:** Dynamische Tab-Bar fuer Spec-Dateien mit Ordner-Gruppierung. Zeigt alle Markdown-Dateien eines Specs gruppiert nach Verzeichnis (root, stories/, etc.) als horizontal scrollbare Tabs an. Unterstuetzt Active-State-Markierung und emittiert Events bei Tab-Wechsel.

**Usage:**
```typescript
<aos-spec-file-tabs
  .files=${this.specViewerFiles}
  .activeFile=${this.specViewerRelativePath}
  @file-selected=${this.handleFileSelected}>
</aos-spec-file-tabs>
```

**Props/API:**
| Prop/Parameter | Typ | Beschreibung |
|----------------|-----|--------------|
| files | Array<{folder: string, files: Array<{relativePath: string, filename: string}>}> | Gruppierte Dateiliste aus specs.files Response |
| activeFile | string | relativePath der aktuell ausgewaehlten Datei |

**Events:**
| Event | Detail | Beschreibung |
|-------|--------|--------------|
| file-selected | { relativePath: string, filename: string } | Tab wurde angeklickt, neue Datei soll geladen werden |

**Source Spec:** Spec Docs Viewer Extension (SDVE-002, 2026-02-12)

**Integration Notes:**
- Light DOM Pattern (`createRenderRoot() { return this; }`)
- Horizontales Scrolling mit `overflow-x: auto`
- Gruppen-Header als kleine Labels
- Nutzt CSS Custom Properties (`--border-color`, `--bg-color-tertiary`, `--primary-color`, `--text-color`)
- Wird in kanban-board.ts Spec Viewer Modal eingebettet

---

### aos-setup-wizard

**Pfad:** `agent-os-ui/ui/src/components/setup/aos-setup-wizard.ts`

**Beschreibung:** Step-by-Step Setup Wizard fuer die AgentOS Extended Installation. Zeigt 4 Installations-Schritte mit Echtzeit-Status (installed/not_installed/running/error), fuehrt Shell-Commands per WebSocket aus mit Live-Output-Streaming, und integriert Cloud Terminal fuer DevTeam-Setup.

**Usage:**
```typescript
// In settings-view.ts
import '../components/setup/aos-setup-wizard.js';

// Template
html`<aos-setup-wizard></aos-setup-wizard>`
```

**State:**
| Property | Typ | Beschreibung |
|----------|-----|--------------|
| steps | SetupStepInfo[] | 4 Steps mit Status (installed/not_installed/running/error) |
| activeStep | number \| null | Aktuell laufender Step (1-4) |
| output | string | Live-Output Buffer des Shell-Prozesses |
| loading | boolean | Initial-Load State |
| error | string \| null | Fehlermeldung |

**WebSocket Messages:**
| Message | Richtung | Beschreibung |
|---------|----------|--------------|
| setup:check-status | Send | Status aller Schritte abfragen |
| setup:status | Receive | Status-Array empfangen |
| setup:run-step | Send | Installations-Schritt starten |
| setup:step-output | Receive | Live-Output empfangen |
| setup:step-complete | Receive | Schritt abgeschlossen |
| setup:start-devteam | Send | Cloud Terminal fuer DevTeam starten |
| setup:error | Receive | Fehler empfangen |

**Source Spec:** AgentOS Extended Setup Wizard (SETUP-004, 2026-02-13)

**Integration Notes:**
- Light DOM Pattern (`createRenderRoot() { return this; }`)
- Self-contained: Registriert eigene Gateway-Handler im connectedCallback
- Wird in settings-view.ts als Tab eingebettet (SettingsSection = 'setup')
- Step 4 (DevTeam) oeffnet Cloud Terminal statt direkter Shell-Ausfuehrung
- Status-Icons: Grau (not_installed), Gruen (installed), Spinner (running), Rot (error)

---

### aos-kanban-board

**Pfad:** `agent-os-ui/ui/src/components/kanban-board.ts`

**Beschreibung:** Generisches, wiederverwendbares Kanban Board Component mit mode Property fuer Spec- und Backlog-Kontexte. Zeigt 5-Spalten Kanban (Backlog, Blocked, In Progress, In Review, Done) mit Drag & Drop, Feature-Flags fuer kontextabhaengige UI-Elemente und Auto-Mode fuer Batch-Processing.

**Usage:**
```typescript
// Spec-Mode (mit allen Features)
<aos-kanban-board
  .mode=${'spec'}
  .stories=${this.specStories}
  .kanbanData=${this.specKanban}
  ?showChat=${true}
  ?showSpecViewer=${true}
  ?showGitStrategy=${true}
  @story-start=${this.handleStoryStart}
  @story-status-change=${this.handleStatusChange}>
</aos-kanban-board>

// Backlog-Mode (reduzierte Features)
<aos-kanban-board
  .mode=${'backlog'}
  .stories=${this.backlogItems}
  .kanbanData=${this.backlogKanban}
  ?showChat=${false}
  ?showSpecViewer=${false}
  ?showGitStrategy=${false}
  @story-start=${this.handleBacklogStoryStart}
  @story-status-change=${this.handleBacklogStatusChange}>
</aos-kanban-board>
```

**Props/API:**
| Prop/Parameter | Typ | Beschreibung |
|----------------|-----|--------------|
| mode | 'spec' \| 'backlog' | Kontext-Mode - steuert Header, Button-Sichtbarkeit, Event-Names |
| stories | StoryInfo[] | Array von Story/Item-Daten zum Rendern |
| kanbanData | KanbanJsonV1 \| BacklogKanbanBoard | Kanban JSON Daten |
| showChat | boolean | Spec Chat Button anzeigen (default: true) |
| showSpecViewer | boolean | Spec Docs Button anzeigen (default: true) |
| showGitStrategy | boolean | Git Strategy Dialog anzeigen (default: true) |

**Events:**
| Event | Detail | Beschreibung |
|-------|--------|--------------|
| story-start | { storyId: string } | Story zu In Progress verschoben |
| story-status-change | { storyId: string, newStatus: string } | Drag & Drop Status-Aenderung |
| auto-mode-toggle | { enabled: boolean } | Auto-Mode Toggle geklickt |

**Feature Flags:**
- `showChat`: Spec Chat Button im Header (nur im Spec-Mode sinnvoll)
- `showSpecViewer`: Spec Docs Button im Header (nur im Spec-Mode sinnvoll)
- `showGitStrategy`: Git Strategy Dialog beim ersten Story-Start (nur Spec-Workflow)

**Mode-spezifisches Verhalten:**
| Feature | Spec-Mode | Backlog-Mode |
|---------|-----------|--------------|
| Header Title | Spec Name | "Backlog" |
| Spec Chat Button | Sichtbar (wenn showChat) | Versteckt |
| Spec Docs Button | Sichtbar (wenn showSpecViewer) | Versteckt |
| Back-Button Text | "Back to Specs" | "Back to Dashboard" |
| Story-Start Event | workflow.story.start | backlog.story.start |

**Source Spec:** Unified Kanban Board (UKB-002, 2026-02-13)

**Integration Notes:**
- Light DOM Pattern (`createRenderRoot() { return this; }`)
- Nutzt StoryInfo Interface - sowohl Spec-Stories als auch Backlog-Items muessen diesem Interface entsprechen
- Drag & Drop mit HTML5 Drag API
- Auto-Mode: Wenn aktiviert, wird nach Story-Abschluss automatisch die naechste verfuegbare Story gestartet
- Spalten-Farben in theme.css definiert (.kanban-column-backlog, .kanban-column-in-progress, etc.)

---

### aos-quick-todo-modal

**Pfad:** `agent-os-ui/ui/src/components/aos-quick-todo-modal.ts`

**Beschreibung:** Quick-Capture Modal fuer spontane Ideen und Aufgaben. Oeffnet sich ueber das Kontextmenue ("Quick-To-Do"). Unterstuetzt Bild-Upload per Paste (Ctrl+V) und Drag & Drop, Prioritaet-Auswahl und speichert ueber REST API im Backlog.

**Usage:**
```typescript
<aos-quick-todo-modal
  ?open=${this.showQuickTodoModal}
  @quick-todo-saved=${this.handleQuickTodoSaved}
  @modal-close=${() => this.showQuickTodoModal = false}>
</aos-quick-todo-modal>
```

**Props/API:**
| Prop/Parameter | Typ | Beschreibung |
|----------------|-----|--------------|
| open | boolean | Steuert Modal-Sichtbarkeit (reflected) |

**Events:**
| Event | Detail | Beschreibung |
|-------|--------|--------------|
| quick-todo-saved | { itemId: string } | Wird ausgeloest wenn Speichern erfolgreich war |
| modal-close | - | Modal geschlossen ohne Speichern |

**Internal State:**
| State | Typ | Beschreibung |
|-------|-----|--------------|
| todoTitle | string | Titel-Eingabe |
| description | string | Optionale Beschreibung |
| priority | 'low' \| 'medium' \| 'high' \| 'critical' | Prioritaet (Default: medium) |
| stagedImages | StagedImage[] | Hochgeladene Bilder (max. 5) |
| isSaving | boolean | Loading-State waehrend REST-Request |
| errorMessage | string | Inline-Fehlermeldung |

**Keyboard Shortcuts:**
- Escape: Modal schliessen
- Enter (auf Titel-Feld): Speichern
- Enter (in Textarea): Zeilenumbruch (kein Speichern)

**CSS Integration:**
- Styles in `agent-os-ui/ui/src/styles/theme.css` unter `.quick-todo-modal`
- Nutzt CSS Custom Properties

**Source Spec:** Quick-To-Do (QTD-001/002/004, 2026-02-13)

**Integration Notes:**
- Light DOM Pattern (`createRenderRoot() { return this; }`)
- Nutzt `image-upload.utils.ts` fuer Bild-Validierung und File-Reading
- Nutzt `aos-image-staging-area` Komponente fuer Thumbnail-Anzeige
- REST-Call an `POST /api/backlog/:projectPath/quick-todo` via `fetch()`
- Projekt-Pfad wird ueber `gateway.getProjectPath()` abgefragt
