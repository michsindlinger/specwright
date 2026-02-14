# Kanban Board: {{SPEC_NAME}}

## Resume Context

> **CRITICAL**: This section is used for phase recovery after /clear or conversation compaction.
> **NEVER** change the field names or format.

| Field | Value |
|-------|-------|
| **Current Phase** | {{CURRENT_PHASE}} |
| **Next Phase** | {{NEXT_PHASE}} |
| **Spec Folder** | specwright/specs/{{SPEC_FOLDER}} |
| **Worktree Path** | {{WORKTREE_PATH}} |
| **Git Branch** | {{GIT_BRANCH}} |
| **Current Story** | {{CURRENT_STORY}} |
| **Last Action** | {{LAST_ACTION}} |
| **Next Action** | {{NEXT_ACTION}} |

---

## Board Status

| Metric | Value |
|--------|-------|
| **Total Stories** | {{TOTAL_STORIES}} |
| **Completed** | {{COMPLETED_COUNT}} |
| **In Progress** | {{IN_PROGRESS_COUNT}} |
| **In Review** | {{IN_REVIEW_COUNT}} |
| **Testing** | {{TESTING_COUNT}} |
| **Backlog** | {{BACKLOG_COUNT}} |
| **Blocked** | {{BLOCKED_COUNT}} |

---

## ⚠️ Blocked (Incomplete DoR)

<!-- Stories that cannot start due to incomplete Definition of Ready -->
<!-- These stories need technical refinement completion via /create-spec -->

{{BLOCKED_STORIES}}

---

## Backlog

<!-- Stories that have not started yet (with complete DoR) -->

{{BACKLOG_STORIES}}

---

## In Progress

<!-- Stories currently being worked on -->

{{IN_PROGRESS_STORIES}}

---

## In Review

<!-- Stories awaiting architecture/UX review -->

{{IN_REVIEW_STORIES}}

---

## Testing

<!-- Stories being tested -->

{{TESTING_STORIES}}

---

## Done

<!-- Stories that are complete -->

{{DONE_STORIES}}

---

## Change Log

<!-- Track all changes to the board -->

| Timestamp | Story | From | To | Notes |
|-----------|-------|------|-----|-------|
{{CHANGE_LOG_ENTRIES}}

---

## DoR Status Legend

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| ✅ Ready | All DoR checkboxes checked | Can be executed |
| ⚠️ Blocked | Some DoR checkboxes unchecked | Run /create-spec again |

## Story Table Format

For each section, use this table format:

```markdown
| Story ID | Title | Type | Dependencies | DoR Status | Points |
|----------|-------|------|--------------|------------|--------|
| STORY-ID | Story Title | Backend/Frontend/DevOps/Test | None or STORY-ID, STORY-ID | ✅ Ready / ⚠️ Blocked | 1/2/3/5/8 |
```

**Type Categories:**
- Backend: Backend development work
- Frontend: Frontend/UI work
- DevOps: Infrastructure, CI/CD, deployment
- Test: Testing framework, test automation
- Docs: Documentation work

**DoR Status:**
- ✅ Ready: All Definition of Ready checkboxes are [x] checked
- ⚠️ Blocked: Some DoR checkboxes are [ ] unchecked - story needs technical refinement

**Dependencies:**
- None: No dependencies
- STORY-ID: Depends on another story
- STORY-ID, STORY-ID: Multiple dependencies
