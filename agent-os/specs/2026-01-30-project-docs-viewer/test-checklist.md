# Test Checklist: Project Docs Viewer/Editor

> Story: PDOC-999 - Integration & E2E Validation
> Date: 2026-01-30
> Tester: Automated CI/Manual

---

## Automated Verification Results

### Build & Lint Checks

| Check | Status | Notes |
|-------|--------|-------|
| Backend Lint (`agent-os-ui/npm run lint`) | PASS | No errors |
| Frontend Lint (`agent-os-ui/ui/npm run lint`) | PASS | No errors |
| Frontend Build (`agent-os-ui/ui/npm run build`) | PASS | Built successfully (1.57MB bundle) |
| TypeScript Compilation | PASS | No type errors |

---

## Component Verification

### PDOC-001: Backend Docs API

| Check | Status | Notes |
|-------|--------|-------|
| DocsReader service exists | PASS | `src/server/docs-reader.ts` |
| WebSocket handlers registered | PASS | docs.list, docs.read, docs.write in `websocket.ts` |
| Path traversal protection | PASS | Regex validation for safe filenames |

### PDOC-002: Docs Sidebar Component

| Check | Status | Notes |
|-------|--------|-------|
| Component registered | PASS | `<aos-docs-sidebar>` in `aos-docs-sidebar.ts` |
| Lit decorators used | PASS | @customElement, @property, @state |
| Events defined | PASS | doc-selected, unsaved-changes-warning, save-requested |
| CSS styles in theme.css | PASS | .docs-sidebar prefix |

### PDOC-003: Docs Viewer Component

| Check | Status | Notes |
|-------|--------|-------|
| Component registered | PASS | `<aos-docs-viewer>` in `aos-docs-viewer.ts` |
| Markdown rendering | PASS | Uses `marked` library |
| Syntax highlighting | PASS | Uses `highlight.js` |
| Edit button | PASS | Fires edit-requested event |
| Error state handling | PASS | Shows retry button on error |

### PDOC-004: Docs Editor Component

| Check | Status | Notes |
|-------|--------|-------|
| Component registered | PASS | `<aos-docs-editor>` in `aos-docs-editor.ts` |
| CodeMirror integration | PASS | @codemirror/view, @codemirror/lang-markdown |
| Save/Cancel buttons | PASS | doc-saved, edit-cancelled events |
| Unsaved changes indicator | PASS | isDirty computed from content diff |
| Dark theme | PASS | oneDark theme |

### PDOC-005: Dashboard Integration

| Check | Status | Notes |
|-------|--------|-------|
| Docs Panel container | PASS | `<aos-docs-panel>` in `aos-docs-panel.ts` |
| Dashboard tabs | PASS | ViewMode includes 'docs' |
| Tab navigation | PASS | Unsaved changes check before switch |
| WebSocket communication | PASS | docs.list, docs.read, docs.write handlers |

---

## Manual E2E Test Scenarios

### Szenario 1: Vollstaendiger Lese-Flow

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Open Dashboard for any project | Dashboard loads | MANUAL |
| 2 | Click "Docs" tab | Docs panel appears | MANUAL |
| 3 | Wait for docs list | Sidebar shows .md files | MANUAL |
| 4 | Click on a document | Content displays in viewer | MANUAL |
| 5 | Verify formatting | Headings, lists, code blocks render | MANUAL |

### Szenario 2: Vollstaendiger Edit-Flow

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | View a document | Content displayed | MANUAL |
| 2 | Click "Bearbeiten" button | Editor opens with CodeMirror | MANUAL |
| 3 | Make a change | Save button becomes active | MANUAL |
| 4 | Click "Speichern" | Success message appears | MANUAL |
| 5 | Reload document | Changes persist | MANUAL |

### Szenario 3: Unsaved Changes Protection

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Edit a document | Editor is active | MANUAL |
| 2 | Make changes (don't save) | Unsaved indicator shows | MANUAL |
| 3 | Try to select another doc | Warning dialog appears | MANUAL |
| 4 | Click "Abbrechen" | Stays in editor | MANUAL |
| 5 | Click "Verwerfen" | Navigates, changes lost | MANUAL |

### Szenario 4: Error Handling

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Stop backend server | Server not running | MANUAL |
| 2 | Try to load docs | Error message displays | MANUAL |
| 3 | See "Erneut versuchen" | Retry button visible | MANUAL |
| 4 | Start server, click retry | Docs load successfully | MANUAL |

---

## Integration Points Verified

| Integration | Components | Status |
|-------------|------------|--------|
| Backend API -> Frontend | DocsReader -> WebSocket -> aos-docs-panel | PASS |
| Sidebar -> Viewer | doc-selected event -> content display | PASS |
| Viewer -> Editor | edit-requested event -> mode switch | PASS |
| Editor -> Backend | doc-saved event -> docs.write | PASS |
| Dashboard -> Docs Panel | Tab navigation with unsaved check | PASS |

---

## Summary

| Category | Total | Passed | Failed | Manual |
|----------|-------|--------|--------|--------|
| Automated Checks | 4 | 4 | 0 | 0 |
| Component Checks | 15 | 15 | 0 | 0 |
| E2E Scenarios | 4 | 0 | 0 | 4 |
| Integration Points | 5 | 5 | 0 | 0 |

**Overall Status:** PASS (Automated) / PENDING (Manual E2E)

---

## Notes

- Manual E2E tests require running server and UI locally
- No automated E2E tests (Playwright) implemented - marked as optional in story
- All components follow Light DOM pattern for consistent styling
- WebSocket API fully implemented with error handling

## How to Run Manual Tests

```bash
# Terminal 1: Start backend
cd agent-os-ui && npm run dev:backend

# Terminal 2: Start frontend
cd agent-os-ui && npm run dev:ui

# Browser: Open http://localhost:5173
# Select a project with agent-os/product/ folder
# Navigate to Docs tab
```
