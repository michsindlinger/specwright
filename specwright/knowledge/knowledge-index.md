# Project Knowledge Index

> Automatisch gepflegt. Übersicht aller verfügbaren Projekt-Artefakte aus abgeschlossenen Specs.
> Zuletzt aktualisiert: 2026-03-14

## Kategorien

| Kategorie | Datei | Trigger-Keywords | Einträge | Zuletzt aktualisiert |
|-----------|-------|------------------|----------|----------------------|
| UI Components | ui-components.md | UI, Component, Button, Form, Modal, Input, Frontend, Widget | 19 | 2026-03-14 |
| API Contracts | api-contracts.md | API, Endpoint, REST, Backend, Route, Controller | 5 | 2026-02-27 |
| Shared Services | shared-services.md | Service, Hook, Utility, Helper, Provider | 16 | 2026-03-14 |
| Data Models | data-models.md | Model, Schema, Type, Interface, Entity, DTO | 6 | 2026-03-14 |
| Workflows & Commands | workflows-commands.md | Workflow, Command, Slash-Command, Dialog, Team | 2 | 2026-02-26 |
| MCP Tools | mcp-tools.md | MCP, Tool, Preview, Document, Claude | 2 | 2026-03-10 |

> **Hinweis:** Architecture/Patterns sind in `specwright/product/` definiert (nicht hier).
> Neue Kategorien werden automatisch hinzugefügt wenn Artefakte nicht in bestehende passen.

## Quick Summary

**UI:** aos-file-tree, aos-file-tree-sidebar, aos-file-editor, aos-file-tabs, aos-file-editor-panel, aos-installation-wizard-modal, aos-getting-started-view, aos-team-view, aos-team-card, aos-team-detail-modal, aos-team-edit-modal, aos-mcp-server-card, aos-voice-call-view, aos-audio-visualizer, aos-call-controls, aos-action-log, aos-call-transcript, aos-document-preview-panel, aos-comment-thread
**API:** GET /api/team/:projectPath/skills, GET /api/team/:projectPath/skills/:skillId, PUT /api/team/:projectPath/skills/:skillId, DELETE /api/team/:projectPath/skills/:skillId, GET /api/team/:projectPath/mcp-config
**Services:** FileService, FileHandler, GitService, isSpecReady, toggleBotAssignment, McpConfigReaderService, VoiceConfigService, DeepgramAdapter, ElevenLabsAdapter, AudioCaptureService, VoiceCallService, AudioPlaybackService, TranscriptService, PreviewWatcher, DocumentPreviewHandler, CommentHandler
**Models:** file.protocol.ts, SkillSummary, SkillDetail, McpServerSummary, voice.protocol.ts, comment.protocol.ts
**Workflows:** /add-team-member (Workflow + Command)
**MCP Tools:** document_preview_open, document_preview_close

---

## Nutzung

### Bei /create-spec (Step 2.1)
Dieser Index wird automatisch geladen. Der PO sieht verfügbare Artefakte und kann vorschlagen, bestehende Komponenten wiederzuverwenden.

### Bei /create-spec (Step 2.5)
Basierend auf dem Implementation Plan werden relevante Detail-Dateien geladen:
- Frontend-Spec → lädt ui-components.md
- Backend-Spec → lädt api-contracts.md, shared-services.md
- Data-Spec → lädt data-models.md

### Bei story-999 (Finalize PR)
Nach Spec-Abschluss werden neue Artefakte aus Stories mit "Creates Reusable: yes" extrahiert und hier hinzugefügt.

---

*Template Version: 1.0*
