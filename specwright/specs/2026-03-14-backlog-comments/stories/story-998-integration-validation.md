# Integration Validation

> Story ID: BLC-998
> Spec: Backlog Item Comments
> Created: 2026-03-14
> Last Updated: 2026-03-14

**Priority**: High
**Type**: System/Integration
**Estimated Effort**: S
**Dependencies**: BLC-997 (Code Review)

---

## Feature

```gherkin
Feature: Integration Validation nach Code-Review
  Als System
  möchte ich alle Komponenten auf korrekte Integration prüfen,
  damit das Feature vollständig und funktional ist.
```

---

## DoR (Definition of Ready) - System Story

- [x] story-997 (Code Review) ist abgeschlossen
- [x] Integration Tests sind in spec.md definiert
- [x] Alle regulären Stories haben Status "Done"

## DoD (Definition of Done) - System Story

- [x] Integration Tests aus spec.md extrahiert
- [x] Alle Integration Tests ausgeführt
- [x] Alle Tests bestanden (oder Fehler dokumentiert)
- [x] Komponenten-Verbindungen verifiziert

## Integration Test Results

| # | Test | Command | Result |
|---|------|---------|--------|
| 1 | Comment Handler Tests (19 tests) | `cd ui && npx vitest run tests/unit/comment.handler.test.ts` | PASSED |
| 2 | Backend Build | `cd ui && npm run build:backend` | PASSED |
| 3 | Frontend Build | `cd ui/frontend && npm run build` | PASSED |
| 4 | Lint | `cd ui && npm run lint` | PASSED |

## Komponenten-Verbindungen (12/12 verifiziert)

| # | Source → Target | Validierung | Status |
|---|----------------|-------------|--------|
| 1 | `comment.protocol.ts` → `comment.handler.ts` | Direct import | ACTIVE |
| 2 | `comment.protocol.ts` → `gateway.ts` | String-Literal Protocol Match | ACTIVE |
| 3 | `comment.handler.ts` → `websocket.ts` | Import + 5 case-Statements | ACTIVE |
| 4 | `comment.handler.ts` → `attachment-storage.service.ts` | Import + usage | ACTIVE |
| 5 | `comment.handler.ts` → `kanban-lock.ts` | Import + 3 usages | ACTIVE |
| 6 | `comment.handler.ts` → `project-dirs.ts` | Import + 4 usages | ACTIVE |
| 7 | `gateway.ts` → `aos-comment-thread.ts` | 13 gateway calls | ACTIVE |
| 8 | `aos-comment-thread.ts` → `markdown-renderer.ts` | Import + usage | ACTIVE |
| 9 | `aos-comment-thread.ts` → `image-upload.utils.ts` | Import + usage | ACTIVE |
| 10 | `story-card.ts` → `dashboard-view.ts` | `comment-open` event | ACTIVE |
| 11 | `backlog-reader.ts` → `story-card.ts` | `commentCount` property | ACTIVE |
| 12 | `aos-comment-thread.ts` → `dashboard-view.ts` | Import + embedded | ACTIVE |

**Status: Done**

## Technisches Refinement

**WAS:** Integration Validation aller Komponenten

**WO:**
- Input: specwright/specs/2026-03-14-backlog-comments/spec.md (Integration Requirements)
- Input: specwright/specs/2026-03-14-backlog-comments/implementation-plan.md (Komponenten-Verbindungen)

**Abhängigkeiten:** BLC-997
**Geschätzte Komplexität:** S

## Completion Check

```bash
cd ui && npx vitest run tests/unit/comment.handler.test.ts
cd ui && npm run build:backend
cd ui/frontend && npm run build
cd ui && npm run lint
```
