# Integration Validation

> Story ID: UKB-998
> Spec: Unified Kanban Board
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: High
**Type**: System
**Estimated Effort**: S
**Dependencies**: UKB-997

---

## Feature

```gherkin
Feature: End-to-End Integration Validation
  Als Entwickler
  moechte ich sicherstellen dass alle Komponenten korrekt zusammenarbeiten,
  damit das Unified Kanban Board im Gesamtsystem funktioniert.
```

---

## Akzeptanzkriterien

1. Backlog-Tab zeigt aos-kanban-board mit 5 Spalten korrekt an
2. Backlog-Items werden als aos-story-card gerendert
3. Drag&Drop im Backlog funktioniert und sendet korrekte Events (backlog.story.start)
4. Spec-Kanban funktioniert weiterhin wie bisher (keine Regression)
5. Auto-Mode funktioniert im Backlog-Kontext
6. Kein Inline-Backlog-Rendering-Code mehr in dashboard-view.ts
7. Keine obsoleten Backlog-CSS-Styles in theme.css

---

## Completion Check

```bash
# TypeScript Backend
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npx tsc --noEmit

# TypeScript Frontend
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui && npx tsc --noEmit

# Build
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm run build

# Verify inline rendering removed
grep -q "renderBacklogKanban" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/views/dashboard-view.ts && echo "FAIL: renderBacklogKanban still exists" && exit 1 || echo "PASS: renderBacklogKanban removed"

# Verify obsolete CSS removed
grep -q "backlog-story-card" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/styles/theme.css && echo "FAIL: backlog-story-card still exists" && exit 1 || echo "PASS: backlog-story-card removed"
```
