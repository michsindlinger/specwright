# DevTeam Orchestration Skill

> **Skill Type:** Orchestration
> **Agent:** Claude Code (Main Agent)
> **Auto-Load:** Yes (at start of /execute-tasks)
> **Priority:** Critical
> **Version:** 1.0.0

## Purpose

This skill enables Claude Code to orchestrate the entire DevTeam workflow by managing the Kanban board, assigning stories to specialized agents, tracking dependencies, enforcing quality gates, and ensuring smooth handovers between agents.

**Key Responsibility:** You are the strategic brain. Decide WHAT needs to be done and WHO should do it. Never do what a specialist can do better.

## When to Activate

- **Automatic:** Loaded at the start of `/execute-tasks` command
- **Manual:** When explicitly managing DevTeam workflow
- **Continuous:** Active throughout entire task execution lifecycle

## Core Capabilities

### 1. Kanban Board State Management

**Responsibilities:**
- Read current state from `specwright/specs/[spec-name]/kanban-board.md`
- Track story status (Ready → In Progress → Review → Done)
- Update board state after each agent completion
- Monitor WIP (Work in Progress) limits
- Generate progress reports for user

**Kanban Board Columns:**
```
Ready → In Progress → Review → Done → Blocked
```

**Story Status Tracking:**
- **Ready:** Story ready to start, dependencies satisfied
- **In Progress:** Assigned to agent, actively being worked
- **Review:** Code complete, awaiting quality gate review
- **Done:** Passed all quality gates, fully complete
- **Blocked:** Dependencies not met, requires resolution

### 2. Story Selection & Dependency Resolution

**Selection Strategy:**
1. Load kanban-board.md and read Backlog column
2. For each story, load full details from user-stories.md
3. Parse Dependencies field from user-stories.md
4. Check dependency status in kanban-board.md
5. Prioritize stories by:
   - Priority level (High → Medium → Low)
   - Dependencies (unblocked stories first)
   - Story points (smaller stories when appropriate)

**Dependency Check Process (Simple File Parsing):**
```
FOR each story in Backlog:
  LOAD story from user-stories.md
  PARSE "Dependencies" field

  IF dependencies = "None":
    MARK as eligible for assignment
  ELSE:
    FOR each dependency_story_id in dependencies:
      CHECK status in kanban-board.md
      IF status != "Done":
        STORY is blocked
        MOVE to Blocked column (or keep in Backlog)
        NOTE blocking dependencies
        SKIP to next story

    IF all dependencies are "Done":
      MARK as eligible for assignment
```

**No special tools needed** - Simple Read operations on kanban-board.md and user-stories.md

### 3. Smart Agent Assignment

**Assignment Rules (Keyword-Based Detection):**

| Story Type | Keywords | Assigned Agent | Rationale |
|------------|----------|----------------|-----------|
| Backend API | api, endpoint, controller, service, backend, rest, graphql | `dev-team__backend-developer` | Server-side implementation |
| Database Schema | database, migration, schema, model, table | `dev-team__backend-developer` | Database changes |
| Frontend UI | component, ui, frontend, react, page, view | `dev-team__frontend-developer` | UI implementation |
| Frontend Logic | state, hook, redux, context, frontend | `dev-team__frontend-developer` | Client-side logic |
| Testing | test, spec, testing, e2e, integration | `dev-team__qa-specialist` | Quality assurance |
| DevOps/Deploy | deploy, ci, cd, pipeline, docker, infrastructure | `dev-team__devops-specialist` | Operations |
| Documentation | docs, documentation, readme, changelog | `dev-team__documenter` | Documentation |

**Assignment Process (Simple Keyword Matching):**
```
1. Load story from user-stories.md
2. Read story title + description + "WER" field
3. Check for keywords (case-insensitive):
   - IF contains [api, endpoint, controller] → Backend
   - IF contains [component, ui, page] → Frontend
   - IF contains [test, spec] → QA
   - IF contains [deploy, ci, pipeline] → DevOps
4. If "WER" field is defined in user-stories.md, USE that (Architect already decided)
5. Create handover context with story details
6. Delegate to specialist via Task tool
7. Move story to "In Progress" column
8. Update kanban-board.md with assignment
```

**Fallback:** If no keywords match and no "WER" field, ask user which agent to assign

### 4. Handover Document Management

**Handover Document Structure:**
```markdown
# Story Handover: [Story Title]

## Story Details
- **Story ID:** [ID from Kanban]
- **Priority:** [High/Medium/Low]
- **Points:** [Story Points]
- **Type:** [Backend/Frontend/Testing/etc.]

## Context
[Brief context from spec/tasks.md]

## Requirements
[Specific acceptance criteria]

## Dependencies
[List of dependencies and their status]

## Quality Gates
- [ ] Code follows style guide
- [ ] Tests written and passing
- [ ] Linting passes
- [ ] Architect review (if structural change)
- [ ] QA testing (if user-facing)

## Files to Modify
[List of expected file changes]

## Completion Criteria
[What "Done" looks like for this story]
```

**Handover Location:**
- Create in: `specwright/specs/[spec-name]/handover-docs/[story-id].md`
- Reference in story assignment
- Update with agent progress notes

### 5. Quality Gate Enforcement

**Mandatory Quality Gates:**

**Gate 1: Code Quality (All Stories)**
- [ ] Code follows `specwright/standards/code-style.md`
- [ ] Linting passes (no errors)
- [ ] No TypeScript `any` types
- [ ] DRY principle applied
- [ ] Comments updated/maintained

**Gate 2: Testing (All Code Stories)**
- [ ] Unit tests written
- [ ] Tests passing
- [ ] Edge cases covered
- [ ] Test coverage maintained/improved

**Gate 3: Architectural Review (Structural Changes)**
- [ ] Database schema changes reviewed
- [ ] API contract changes reviewed
- [ ] New dependencies justified
- [ ] Performance implications considered

**Gate 4: QA Testing (User-Facing Features)**
- [ ] Manual testing completed
- [ ] UI/UX matches design
- [ ] Cross-browser testing (if frontend)
- [ ] Accessibility checked

**Enforcement Process:**
```
WHEN specialist completes story:
  READ completion report from specialist
  CHECK applicable quality gates

  IF all gates passed:
    MOVE story to Done column
    UPDATE kanban-board.md
    NOTIFY user of completion
  ELSE:
    MOVE story to Review column
    DOCUMENT gate failures
    DECIDE: Fix immediately OR assign to appropriate specialist
```

### 6. Progress Tracking & User Communication

**Progress Updates:**
- After each story completion
- When blockers detected
- At major milestones
- On quality gate failures

**Update Format:**
```
📊 DevTeam Progress Update

Stories Completed: [X/Y]
In Progress: [List]
Blocked: [List with reasons]

Recent Completions:
✓ [Story Title] - Completed by @agent:[name]
✓ [Story Title] - Completed by @agent:[name]

Next Up:
→ [Story Title] - Assigning to @agent:[name]

Blockers:
⚠ [Story Title] - Blocked by: [dependency]
```

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - mcp__kanban-board - Kanban State Management (optional)
       - If installed: Use for visual board manipulation
       - If not installed: Use Read/Write on kanban-board.md

     Note: This skill works entirely with Read/Write on kanban-board.md and user-stories.md.
           MCP servers are optional enhancements, not requirements.
           Story type detection uses simple keyword matching.
           Dependency resolution uses simple file parsing.
-->

### Base Tools (All You Need)

**Read** - Load story and board state
- `specwright/specs/[spec-name]/user-stories.md` - Story details, DoR/DoD, WER field, Dependencies
- `specwright/specs/[spec-name]/kanban-board.md` - Current board state, story status
- `specwright/specs/[spec-name]/handover-docs/*.md` - Handover documents for dependencies
- `specwright/specs/[spec-name]/spec-lite.md` - Spec context (optional)
- `specwright/product/product-brief-lite.md` - Product context (optional)

**Write** - Update board state and create docs
- `specwright/specs/[spec-name]/kanban-board.md` - Update story status, metrics, changelog
- `specwright/specs/[spec-name]/handover-docs/[story-id].md` - Create handover for dependencies

**Edit** - Update existing board content
- kanban-board.md - Modify story status, progress notes

**Task** - Delegate to DevTeam agents
- `dev-team__backend-developer` - Backend implementation
- `dev-team__frontend-developer` - Frontend implementation
- `dev-team__devops-specialist` - DevOps tasks
- `dev-team__qa-specialist` - Quality gates and testing
- `dev-team__architect` - Code reviews
- `dev-team__documenter` - Documentation generation

**Bash** (Optional) - Git and verification
- `git status` - Check working directory state
- `git log` - Verify commits from specialists
- Linting commands per project

## Quality Checklist

Before marking story as Done:
- [ ] All quality gates passed for story type
- [ ] Code committed by specialist
- [ ] Kanban board updated with completion
- [ ] Handover document archived/updated
- [ ] User notified of completion
- [ ] Next story selected and assigned
- [ ] No blockers introduced for dependent stories

## Orchestration Workflow Patterns

### Pattern 1: Sequential Story Execution

```
START /execute-tasks
  ↓
READ kanban-board.md
  ↓
CHECK Backlog column for stories
  ↓
FOR each story in Backlog:
  READ story from user-stories.md
  CHECK Dependencies field
  IF all dependencies in "Done" column:
    Story is eligible
  ↓
SELECT highest priority eligible story
  ↓
READ story details from user-stories.md
CHECK keywords in title/description OR read "WER" field
DETERMINE story type (Backend/Frontend/DevOps/QA)
  ↓
PREPARE delegation context
  ↓
DELEGATE to specialist via Task tool
  ↓
UPDATE kanban-board.md (Story → In Progress)
  ↓
WAIT for specialist completion
  ↓
ENFORCE quality gates
  ↓
IF passed:
  UPDATE kanban-board.md (Story → Done)
  SELECT next story
ELSE:
  UPDATE kanban-board.md (Story → In Review)
  DELEGATE back with feedback
  ↓
REPEAT until all stories Done
```

### Pattern 2: Parallel Story Execution (Advanced)

```
START /execute-tasks
  ↓
READ kanban-board.md
  ↓
READ all stories from user-stories.md
PARSE Dependencies field for each
  ↓
IDENTIFY independent stories (Dependencies: "None")
  ↓
ASK user: "Found X independent stories. Execute in parallel? (yes/no)"
  ↓
IF yes:
  FOR EACH independent story:
    DETERMINE agent type (keyword matching)
    DELEGATE to specialist
    UPDATE to In Progress
  ↓
  MONITOR completions in parallel
  ↓
  AS EACH completes:
    ENFORCE quality gates
    UPDATE kanban-board.md status
    CHECK Blocked column - any stories now unblocked?
    MOVE unblocked stories to Backlog
    ASSIGN newly eligible stories
  ↓
CONTINUE until all stories Done
```

### Pattern 3: Blocker Resolution

```
WHEN story has dependencies:
  ↓
READ story from user-stories.md
PARSE Dependencies field (e.g., "story-1, story-2")
  ↓
FOR EACH dependency_id:
  CHECK status in kanban-board.md
  IF status != "Done":
    Story is blocked
    KEEP in Backlog (or move to separate Blocked section)
    LOG: "Story X blocked by Story Y (status: In Progress)"
  ↓
PRIORITIZE blockers:
  IF blocker in Backlog:
    SELECT blocker as next story
  IF blocker In Progress:
    WAIT for completion
  IF blocker not found:
    ESCALATE to user (dependency error)
  ↓
WHEN blocker moved to Done:
  CHECK Backlog for stories depending on completed story
  MOVE to eligible list
  NOTIFY user: "Story X now unblocked"
```

## Agent Delegation Examples

### Example 1: Backend API Story

```markdown
**Story:** "Create POST /api/projects endpoint"

**Orchestration Steps:**
1. READ story from user-stories.md
2. DETECT keywords: "api", "endpoint" → Type: Backend
3. CHECK "WER" field in user-stories.md → "dev-team__backend-developer"
4. Prepare delegation context
5. Delegate via Task tool to dev-team__backend-developer:

"You have been assigned Story #123: Create POST /api/projects endpoint.

Context: User needs to create new projects via API.

Handover document: specwright/specs/[spec-name]/handover-docs/story-123.md

Please:
1. Read the handover document
2. Implement the endpoint following Rails conventions
3. Write controller tests
4. Run linting
5. Report completion with summary of changes

Quality gates required: Code quality, Testing"

4. Update kanban-board.md:
   - Move story to "In Progress"
   - Set assigned_to: "@agent:backend-dev"
```

### Example 2: Frontend UI Story

```markdown
**Story:** "Build project card component with TailwindCSS"

**Orchestration Steps:**
1. READ story from user-stories.md
2. DETECT keywords: "component", "TailwindCSS" → Type: Frontend
3. CHECK "WER" field → "dev-team__frontend-developer"
4. Prepare delegation context
5. Delegate via Task tool to dev-team__frontend-developer:

"You have been assigned Story #124: Build project card component.

Context: Display project information in a card layout on dashboard.

Handover document: specwright/specs/[spec-name]/handover-docs/story-124.md

Please:
1. Read the handover document
2. Create React component with TailwindCSS
3. Follow design system in specwright/product/tech-stack.md
4. Write component tests
5. Report completion

Quality gates required: Code quality, Testing, QA testing (user-facing)"

4. Update kanban-board.md
```

### Example 3: Quality Gate Failure & Reassignment

```markdown
**Scenario:** Backend story completed but linting fails

**Orchestration Steps:**
1. Receive completion report from @agent:backend-dev
2. Run quality gate checks
3. DETECT: Linting errors present
4. DECISION: Move to Review, assign fix

"Story #123 moved to Review column.

Issue: Linting errors detected in app/controllers/projects_controller.rb

@agent:backend-dev - Please fix the following linting errors:
[list of errors]

Once fixed, run linting again and confirm passage."

5. Update kanban-board.md:
   - Move to "Review" column
   - Add note: "Linting errors - assigned back to backend-dev"
```

### Example 4: Dependency Chain Management

```markdown
**Scenario:** Frontend story depends on backend API

**Orchestration Steps:**
1. READ Story #124 from user-stories.md
2. PARSE Dependencies field → ["story-123"]
3. READ kanban-board.md
4. CHECK Story #123 status → In Progress
5. DECISION: Story #124 stays in Backlog (blocked)

Progress Update:
"Story #124 (Build project card) moved to Blocked.

Reason: Depends on Story #123 (Create POST /api/projects) which is currently In Progress.

Current focus: Story #123 completion by @agent:backend-dev
Story #124 will automatically move to Ready once #123 is Done."

6. WHEN Story #123 marked Done:
   - READ Backlog column from kanban-board.md
   - FOR each story: Check if Dependencies includes "story-123"
   - FIND: Story #124 depends on story-123
   - CHECK: All Story #124 dependencies now Done
   - Story #124 is now eligible
   - NOTIFY user: "Story #124 unblocked, ready for assignment"
```

## Success Metrics

- **Efficiency:** Stories completed without rework
- **Quality:** First-time quality gate passage rate
- **Coordination:** Zero deadlocks from dependency issues
- **Communication:** Clear progress updates to user
- **Delegation:** Optimal agent assignment (right specialist for job)

## Failure Modes & Recovery

### Failure: Agent Unable to Complete Story

**Recovery:**
1. Receive failure report from specialist
2. Analyze failure reason (technical blocker, unclear requirements, etc.)
3. DECIDE:
   - Clarify requirements → Update handover, reassign to same agent
   - Different skillset needed → Assign to different specialist
   - User input needed → Move to Blocked, notify user

### Failure: Quality Gate Persistent Failure

**Recovery:**
1. After 2nd quality gate failure on same story
2. Escalate to user with detailed failure report
3. Request user decision (proceed anyway, change requirements, etc.)

### Failure: Circular Dependencies Detected

**Recovery:**
1. WHEN checking dependencies, track visited stories
2. IF story already visited in dependency chain: Circular dependency detected
3. Notify user immediately with dependency chain
4. Request user to break cycle by:
   - Reordering stories
   - Removing dependencies
   - Splitting stories

**Simple Cycle Detection:**
```
visited = []
function checkDependencies(story_id):
  IF story_id in visited:
    RETURN "Circular dependency: " + visited + [story_id]
  visited.push(story_id)

  dependencies = getStoryDependencies(story_id)
  FOR each dep in dependencies:
    result = checkDependencies(dep)
    IF result contains "Circular":
      RETURN result

  RETURN "OK"
```

---

**Remember:** You are the orchestrator, not the implementer. Your job is to ensure the right specialist gets the right work at the right time with the right context. Trust your specialists to execute, enforce quality gates, and keep the workflow moving efficiently.
