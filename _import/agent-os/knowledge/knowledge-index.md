# Project Knowledge Index

> Zentraler Index für alle wiederverwendbaren Artefakte im Agent OS Web UI Projekt
> Last Updated: 2026-02-13

## Purpose

Dieses Index dokumentiert alle wiederverwendbaren Komponenten, Services und Patterns, die während der Entwicklung erstellt wurden. Es dient als schnelle Referenz für Developers um Existing Solutions zu finden statt das Rad neu zu erfinden.

---

## Quick Summary

### Kürzlich hinzugefügt (2026-02-13)

**Shared Services:**
- `copy-path.ts` - Utility mit `buildSpecFilePath()` und `copyPathToClipboard()` fuer Copy-to-Clipboard von Spec-Dateipfaden

**UI Components:**
- `aos-quick-todo-modal` - Quick-Capture Modal fuer spontane Ideen mit Bild-Upload (Paste + Drag&Drop), Prioritaet und Backend-Speicherung
- `aos-kanban-board` - Generisches Kanban Board mit mode Property (spec/backlog), Feature-Flags und Auto-Mode Integration
- `aos-setup-wizard` - Step-by-Step Setup Wizard mit Status-Checks, Shell-Output-Streaming und Cloud Terminal Integration

**Shared Services:**
- `image-upload.utils` - Wiederverwendbare Bild-Upload-Funktionen (Validierung, File-Reading, StagedImage-Erstellung)
- `BacklogItemStorageService` - Backend Service fuer atomische Backlog-Item-Erstellung mit optionalen Bild-Attachments
- `Quick-Todo API` - REST Endpoint POST /api/backlog/:projectPath/quick-todo fuer schnelle Backlog-Eintraege
- `SetupService` - Backend Service fuer AgentOS Extended Installationsstatus-Pruefung und Shell-Command-Ausfuehrung mit EventEmitter-Streaming
- `RouterService` - Singleton Router-Service für Hash-basierte URL-Navigation mit Event-Emission, URL-Parsing und programmatischer Navigation
- `RouteTypes` - Shared Type-Definitionen für Routes (ParsedRoute, ViewType, RouteParams)
- `kanban_approve_story` MCP Tool - Neues MCP Tool zum Genehmigen von Stories (in_review -> done), genutzt vom /execute-tasks Workflow

### Zuvor hinzugefügt (2026-02-12)

**UI Components:**
- `aos-spec-file-tabs` - Dynamische Tab-Bar für Spec-Dateien mit Ordner-Gruppierung, Active-State und horizontalem Scrolling

**Shared Services:**
- `SpecsReader.listSpecFiles()` - Rekursive Datei-Erkennung für alle Markdown-Dateien eines Specs mit Ordner-Gruppierung
- `specs.files` WebSocket Message-Typ - API Contract für Spec-Dateilisten-Abfrage
- Interaktiver Checkbox-Renderer in `aos-docs-viewer` - marked Extension für anklickbare Checkboxen in Markdown
- Checkbox-Toggle-Logik - Raw-Markdown Pattern-Matching mit Code-Block-Skip

### Zuvor hinzugefügt (2026-02-11)

**UI Components:**
- `aos-git-status-bar` - Git Status-Leiste mit Branch, Ahead/Behind, Changed Files, Action Buttons, PR-Badge, Commit & Push
- `aos-git-commit-dialog` - Modal-Dialog mit Dateiauswahl, Status-Badges, Commit-Message, Revert/Delete Aktionen

**Shared Services:**
- `GitService` - Backend Service fuer alle Git-Operationen (status, branches, commit, pull, push, checkout, revert, delete, pr-info)
- `GitHandler` - WebSocket Handler fuer Git Message Routing (inkl. revert, delete-untracked, pr-info)
- `GitProtocol` - Shared Types fuer Git WebSocket-Kommunikation (inkl. GitPrInfo, GitRevertResult)
- Gateway Git Methods - Frontend Gateway-Erweiterungen fuer Git-Operationen (inkl. sendGitRevert, sendGitDeleteUntracked, requestGitPrInfo)

**Data Models:**
- `GitPrInfo` - Interface fuer Pull Request Informationen (number, state, url, title)
- `GitRevertResult` - Interface fuer Revert-Ergebnis (revertedFiles, failedFiles)
- `CloudTerminalType` - Union Type zur Unterscheidung zwischen Shell- und Claude-Code-Terminals

### Zuvor hinzugefügt (2026-02-05)

**UI Components:**
- `aos-cloud-terminal-sidebar` - Sliding sidebar container for Cloud Terminal
- `aos-terminal-tabs` - Tab bar for Terminal Sessions
- `aos-terminal-session` - Terminal session wrapper with State Management
- `aos-model-dropdown` - Model selection dropdown for Cloud Terminal

**Shared Services:**
- `CloudTerminalManager` - Multi-session PTY management for Cloud Terminals (Backend)
- `CloudTerminalService` - Session persistence and state management (Frontend)
- `CloudTerminalProtocol` - Message types for Cloud Terminal communication (Shared Types)

---

## Categories

| Kategorie | Datei | Einträge | Zuletzt aktualisiert |
|-----------|-------|----------|---------------------|
| UI Components | ui-components.md | 15 | 2026-02-13 |
| API Contracts | api-contracts.md | 0 | - |
| Shared Services | shared-services.md | 21 | 2026-02-13 |
| Data Models | data-models.md | 3 | 2026-02-11 |

---

## Kategorien im Detail

### UI Components

**Datei:** `ui-components.md`

**Beschreibung:** Alle wiederverwendbaren Lit Web Components

**Einträge:** 15

---

### Shared Services

**Datei:** `shared-services.md`

**Beschreibung:** Backend Services, Hooks und Utilities

**Einträge:** 21

---

## Wissensmanagement-Regeln

### Wann wird Knowledge aktualisiert?

- **Automatisch:** Bei Abschluss von System Story 999 (Finalize PR)
- **Manuell:** Bei Erstellung besonders wiederverwendbarer Artefakte

### Was gehört in Knowledge?

Nur Artefakte mit `Creates Reusable: yes` im Story File:

- UI Components die in anderen Specs verwendet werden können
- Shared Services/Hooks/Utilities
- API Contracts die andere Specs nutzen können
- Data Models/Types die projektweit relevant sind

### Was gehört NICHT in Knowledge?

- Spec-spezifische Implementierungen
- One-off Code ohne Wiederverwendungspotential
- Test-Code (es sei denn, es sind wiederverwendbare Test-Helpers)

---

## Template-Struktur

Für neue Kategorie-Dateien, verwende dieses Template:

```markdown
# [KATEGORIE-NAME]

> Zentrale Dokumentation für [ARTIFAKT-TYP]
> Last Updated: [DATE]

## Overview

Tabelle aller [ARTIFAKT-TYP] im Projekt:

| Name | Pfad | Props/Signature | Quelle Spec | Datum |
|------|------|-----------------|-------------|-------|
| [Name] | [Pfad] | [Props] | [SPEC-NAME] | [DATE] |

---

## Detail-Dokumentation

### [Artifact Name]

**Pfad:** `path/to/artifact.ts`

**Beschreibung:** [Kurze Beschreibung was das Artefakt tut]

**Usage:**
```typescript
// Code Beispiel
```

**Props/API:**
| Prop/Parameter | Typ | Beschreibung |
|----------------|-----|--------------|
| [name] | [type] | [beschreibung] |

**Source Spec:** [SPEC-NAME] ([DATE])

**Integration Notes:**
- [Wichtige Hinweise zur Integration]
- [Abhängigkeiten zu anderen Artefakten]

---
```
