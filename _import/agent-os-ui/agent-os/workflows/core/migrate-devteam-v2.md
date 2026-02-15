---
description: Migrate existing DevTeam setup to v2.0 (skill-index pattern)
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Migrate DevTeam to v2.0

## Overview

Migrate an existing DevTeam setup from v1.x (skills assigned to agents) to v2.0 (skill-index pattern).

**What changes in v2.0:**
- Skills are stored in `agent-os/skills/` (not `.claude/skills/`)
- Skills are NOT assigned to agents (no `skills:` in YAML frontmatter)
- Skill-index provides lookup table for Architect/Orchestrator
- Orchestrator extracts "Quick Reference" section on-demand
- ~95% reduction in sub-agent context usage

**This migration will:**
1. Detect existing DevTeam setup
2. Remove `skills:` from agent YAML frontmatter
3. Move/convert skills from `.claude/skills/` to `agent-os/skills/`
4. Generate `skill-index.md` for the project
5. Update agent templates to v2.0 format

---

## Pre-Flight Check

<pre_flight>
  CHECK: Is this a DevTeam project?

  VERIFY existence of:
  - `.claude/agents/dev-team/` directory
  - At least one agent file (architect.md, po.md, etc.)

  IF NOT found:
    ERROR: "No DevTeam setup detected. Run /build-development-team first."
    STOP

  CHECK: Already migrated?

  IF agent-os/team/skill-index.md EXISTS:
    WARN: "Project appears to already be on v2.0 (skill-index.md exists)"
    ASK: "Continue anyway? This will regenerate skill-index.md (YES/NO)"
    IF NO: STOP
</pre_flight>

---

## Step 1: Analyze Current Setup

<step number="1" name="analyze_setup">

### Step 1: Analyze Current DevTeam Setup

Detect what needs to be migrated.

<analysis>
  1. LIST agent files:
     ```bash
     ls .claude/agents/dev-team/*.md 2>/dev/null
     ```

  2. FOR EACH agent file:
     READ: YAML frontmatter
     EXTRACT: `skills:` array (if present)
     STORE: agent_name → skills_list

  3. LIST existing skills:
     ```bash
     ls .claude/skills/*/SKILL.md 2>/dev/null
     # OR older format:
     ls .claude/skills/*.md 2>/dev/null
     ```

  4. SUMMARIZE findings:
     - Agents found: [list]
     - Agents with skills assigned: [count]
     - Total skills to migrate: [count]
     - Skills directory structure: [folder-based / flat]
</analysis>

**Output:** Migration analysis report

</step>

---

## Step 2: Confirm Migration

<step number="2" name="confirm_migration">

### Step 2: Confirm Migration Plan

Present migration plan to user and get confirmation.

<user_confirmation>
  DISPLAY:
  ```
  ═══════════════════════════════════════════════════════════
  DevTeam v2.0 Migration Plan
  ═══════════════════════════════════════════════════════════

  Current Setup (v1.x):
  ─────────────────────
  Agents: [N] found in .claude/agents/dev-team/
  Skills assigned to agents: [N]
  Skills in .claude/skills/: [N]

  Migration Actions:
  ─────────────────────
  1. Remove 'skills:' from agent YAML frontmatter
  2. Add 'Skill-Context' section to agents
  3. Move skills to agent-os/skills/ (flat structure)
  4. Generate agent-os/team/skill-index.md
  5. Keep .claude/skills/ as backup (renamed to .claude/skills-v1-backup/)

  Files to be modified:
  ─────────────────────
  [List of agent files]

  Files to be created:
  ─────────────────────
  - agent-os/skills/*.md (migrated skills)
  - agent-os/team/skill-index.md

  ═══════════════════════════════════════════════════════════
  ```

  ASK via AskUserQuestion:
  "Proceed with migration to DevTeam v2.0?"

  Options:
  - "Yes, migrate now" (proceed)
  - "No, cancel" (stop)
</user_confirmation>

</step>

---

## Step 3: Migrate Agent Files

<step number="3" name="migrate_agents">

### Step 3: Update Agent Files

Remove skills from YAML and add Skill-Context section.

<agent_migration>
  FOR EACH agent file in .claude/agents/dev-team/:

    1. READ: Current agent file content

    2. REMOVE from YAML frontmatter:
       - `skills:` line and its array items
       - Keep all other YAML fields (model, name, description, tools, color)

    3. REMOVE from tools (if present):
       - `Task` tool (sub-agents don't delegate in v2.0)

    4. FIND: "## Available Skills" section
       REPLACE with:
       ```markdown
       ## Skill-Context

       Dieser Agent erhält task-spezifische Patterns vom Orchestrator.
       Skills werden NICHT automatisch geladen, sondern:
       1. Architect wählt relevante Skills pro Story (aus skill-index.md)
       2. Orchestrator extrahiert Patterns und übergibt sie im Task-Prompt

       **Skill-Referenz:** agent-os/team/skill-index.md

       ## Available Tools

       - Read/Write/Edit files
       - Bash commands
       ```

    5. WRITE: Updated agent file

    6. LOG: "✓ Migrated: [agent-name].md"
</agent_migration>

**Output:** All agent files updated to v2.0 format

</step>

---

## Step 4: Migrate Skills

<step number="4" name="migrate_skills">

### Step 4: Move Skills to New Location

Move skills from `.claude/skills/` to `agent-os/skills/`.

<skill_migration>
  1. CREATE directory:
     ```bash
     mkdir -p agent-os/skills
     ```

  2. FOR EACH skill in .claude/skills/:

     <detect_structure>
       IF skill is folder-based (.claude/skills/[name]/SKILL.md):
         SOURCE = .claude/skills/[name]/SKILL.md
         SKILL_NAME = [name]

       ELSE IF skill is flat (.claude/skills/[name].md):
         SOURCE = .claude/skills/[name].md
         SKILL_NAME = [name]
     </detect_structure>

     <determine_target>
       PARSE skill name to determine role prefix:
       - If contains "backend" or "logic" or "persistence" or "integration" → backend-
       - If contains "frontend" or "ui" or "component" or "state" → frontend-
       - If contains "architect" or "pattern" or "api-design" → architect-
       - If contains "devops" or "pipeline" or "infrastructure" → devops-
       - If contains "qa" or "test" → qa-
       - If contains "po" or "backlog" or "requirements" → po-
       - If contains "documenter" or "changelog" → documenter-
       - Else → custom-

       TARGET = agent-os/skills/[prefix][skill-name].md
     </determine_target>

     <add_quick_reference>
       READ: Skill content
       CHECK: Does it have "## Quick Reference" section?

       IF NOT:
         EXTRACT: Key patterns from skill
         ADD: "## Quick Reference" section at top (after metadata)
         - When to use (from "When to Activate")
         - Key Patterns (summarize 3-5 main patterns)
         - Quick Example (shortest code example)
         - Anti-Patterns (if present)
     </add_quick_reference>

     WRITE: To TARGET path
     LOG: "✓ Migrated: [skill-name] → [target-path]"

  3. BACKUP old skills directory:
     ```bash
     mv .claude/skills .claude/skills-v1-backup
     ```

  4. LOG: "Skills backup: .claude/skills-v1-backup/"
</skill_migration>

**Output:** Skills in `agent-os/skills/` with Quick Reference sections

</step>

---

## Step 5: Generate Skill-Index

<step number="5" name="generate_skill_index">

### Step 5: Generate Skill-Index

Create the skill-index.md lookup table.

<skill_index_generation>
  1. CREATE directory:
     ```bash
     mkdir -p agent-os/team
     ```

  2. LOAD template:
     TRY: agent-os/templates/docs/skill-index-template.md
     FALLBACK: ~/.agent-os/templates/docs/skill-index-template.md

  3. POPULATE template:
     - [PROJECT_NAME] → Extract from product-brief.md or use directory name
     - [CURRENT_DATE] → Today's date

  4. FOR EACH skill in agent-os/skills/:
     READ: Skill file
     EXTRACT: Skill name, trigger keywords (from "When to Activate")
     ADD: To appropriate category table in skill-index.md

  5. WRITE: agent-os/team/skill-index.md

  6. LOG: "✓ Generated: agent-os/team/skill-index.md"
</skill_index_generation>

**Output:** `agent-os/team/skill-index.md`

</step>

---

## Step 6: Verification

<step number="6" name="verification">

### Step 6: Verify Migration

Confirm all changes were applied correctly.

<verification_checks>
  CHECK 1: Agent files updated
  ```bash
  # Verify no 'skills:' in YAML frontmatter
  grep -l "^skills:" .claude/agents/dev-team/*.md 2>/dev/null
  # Should return nothing
  ```

  CHECK 2: Skills migrated
  ```bash
  ls agent-os/skills/*.md | wc -l
  # Should match expected count
  ```

  CHECK 3: Skill-index exists
  ```bash
  test -f agent-os/team/skill-index.md && echo "✓ skill-index.md exists"
  ```

  CHECK 4: Backup created
  ```bash
  test -d .claude/skills-v1-backup && echo "✓ Backup exists"
  ```
</verification_checks>

</step>

---

## Step 7: Summary

<step number="7" name="summary">

### Step 7: Migration Summary

Present completion summary.

<summary>
  DISPLAY:
  ```
  ═══════════════════════════════════════════════════════════
  ✅ DevTeam v2.0 Migration Complete!
  ═══════════════════════════════════════════════════════════

  Changes Made:
  ─────────────────────
  ✓ [N] agent files updated (skills: removed, Skill-Context added)
  ✓ [N] skills migrated to agent-os/skills/
  ✓ skill-index.md generated at agent-os/team/skill-index.md
  ✓ Old skills backed up to .claude/skills-v1-backup/

  New Architecture:
  ─────────────────────
  • Skills are in agent-os/skills/ (not assigned to agents)
  • Architect selects skills per story during /create-spec
  • Orchestrator extracts Quick Reference during /execute-tasks
  • Sub-agents receive focused patterns (~100 lines instead of ~2700)

  Next Steps:
  ─────────────────────
  1. Review agent-os/team/skill-index.md
  2. Run /create-spec to test new workflow
  3. Delete .claude/skills-v1-backup/ when confident

  ═══════════════════════════════════════════════════════════
  ```
</summary>

</step>

---

## Rollback (If Needed)

<rollback>
  IF migration fails or user wants to revert:

  1. Restore skills:
     ```bash
     rm -rf .claude/skills
     mv .claude/skills-v1-backup .claude/skills
     ```

  2. Restore agent files:
     ```bash
     git checkout -- .claude/agents/dev-team/
     ```

  3. Remove generated files:
     ```bash
     rm -rf agent-os/skills
     rm -f agent-os/team/skill-index.md
     ```

  NOTE: This only works if changes haven't been committed
</rollback>
