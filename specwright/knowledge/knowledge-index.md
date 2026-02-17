# Project Knowledge Index

> Automatisch gepflegt. Übersicht aller verfügbaren Projekt-Artefakte aus abgeschlossenen Specs.
> Zuletzt aktualisiert: 2026-02-17

## Kategorien

| Kategorie | Datei | Trigger-Keywords | Einträge | Zuletzt aktualisiert |
|-----------|-------|------------------|----------|----------------------|
| UI Components | ui-components.md | UI, Component, Button, Form, Modal, Input, Frontend, Widget | 7 | 2026-02-17 |
| API Contracts | api-contracts.md | API, Endpoint, REST, Backend, Route, Controller | 0 | - |
| Shared Services | shared-services.md | Service, Hook, Utility, Helper, Provider | 3 | 2026-02-16 |
| Data Models | data-models.md | Model, Schema, Type, Interface, Entity, DTO | 1 | 2026-02-16 |

> **Hinweis:** Architecture/Patterns sind in `specwright/product/` definiert (nicht hier).
> Neue Kategorien werden automatisch hinzugefügt wenn Artefakte nicht in bestehende passen.

## Quick Summary

**UI:** aos-file-tree, aos-file-tree-sidebar, aos-file-editor, aos-file-tabs, aos-file-editor-panel, aos-installation-wizard-modal, aos-getting-started-view
**API:** (keine Endpunkte)
**Services:** FileService, FileHandler, GitService
**Models:** file.protocol.ts

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
