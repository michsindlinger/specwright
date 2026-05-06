---
description: Spec Phase 3 — System Story 997 (Code Review + Spec-Conformance)
version: 1.2
---

# System Story 997: Code Review

**Purpose:** Strong model reviews the complete feature diff and auto-fixes findings.

> **MCP routing note:** kanban.json is a *mutable* file and lives in the main
> project (never copied into worktrees). All reads/writes MUST go through the
> kanban MCP server, which routes to `SPECWRIGHT_MAIN_PROJECT_PATH` when the
> CWD is a worktree. Never `ls`/`READ`/`WRITE`/`git add` kanban.json directly.

<code_review_execution>
  1. CALL MCP TOOL: kanban_start_story
     Input: { specId: "{SELECTED_SPEC}", storyId: "{STORY-997-ID}", model: "{CURRENT_MODEL_ID}" }
     VERIFY: Returns {"success": true}

     The tool atomically updates story.status, story.phase, timing.startedAt,
     model, resumeContext, boardStatus counters, execution.status, changeLog.

  2. GET: Full diff between main and current branch
     ```bash
     git diff main...HEAD --name-only > /tmp/changed_files.txt
     git diff main...HEAD --stat
     ```

  3. CATEGORIZE: Changed files (Added / Modified / Deleted)

  3.5. LOAD: Spec-Conformance Context (v1.1)
     **Purpose:** 997 muss in fresh-context wissen WAS gebaut werden sollte, nicht nur WAS gebaut wurde.

     READ: specwright/specs/{SELECTED_SPEC}/spec.md
       EXTRACT sections (regex match `^## ${section}`):
       - "## Spec Scope"
       - "## Out of Scope"
       - "## Expected Deliverable"
       - "## Integration Requirements"

     READ: specwright/specs/{SELECTED_SPEC}/implementation-plan.md
       EXTRACT sections:
       - "## Komponenten-Verbindungen" (the Verbindungs-Matrix table)
       - "## Komponenten-Übersicht" (Neue + Zu ändernde Komponenten tables)

     READ (if exists): specwright/specs/{SELECTED_SPEC}/requirements-clarification.md
       EXTRACT: explicit acceptance criteria, scope-decisions confirmed by user

     SET: SPEC_CONTEXT = above sections

     IF spec.md OR implementation-plan.md missing:
       LOG: "Legacy spec without modern structure — Spec-Conformance check skipped, code-quality only"
       SKIP to Step 4

  3.6. RUN: Plan-Validation Greps (Verbindungs-Matrix)
     **Purpose:** Plan-Validierungen aus "Validierung"-Spalte sind heute Manual-Guidance — automatisieren wenn bash-runnable.

     PARSE: Verbindungs-Matrix table from implementation-plan.md
       Heuristic: find table whose header row contains `Source` AND `Target` AND `Validierung` (or English equivalents `Validation`).
       IF no such table: LOG "No Verbindungs-Matrix found — skipping plan-validation", SET PLAN_VALIDATION_RESULTS={skipped:true}, GOTO Step 4

     **Safety whitelist (Critical):** allowed bash commands for auto-execution:
     - `grep`, `egrep`, `rg` (ripgrep)
     - `test`, `[`, `[[`
     - `find`, `ls`, `wc`
     - Pipes `|` between whitelisted commands OK
     Any other command → classify as MANUAL, do NOT execute.

     INIT: passed=0, failed=0, manual=0, details=[]

     FOR EACH row with non-empty "Validierung" cell:
       cmd = row.Validierung (text content of cell)
       expect_empty = false
       IF cmd starts with `!`: expect_empty = true; cmd = cmd.lstrip('!').trim()

       CLASSIFY cmd:
         IF cmd matches whitelist (first token in {grep, egrep, rg, test, find, ls, wc, [, [[}):
           runnable = true
         ELSE: runnable = false (MANUAL)

       IF NOT runnable:
         manual++
         details.append({source, target, story, cmd, result: "manual"})
         CONTINUE

       EXEC: bash -c "{cmd}" 2>&1
       capture: exit_code, output

       PASS condition:
         - expect_empty=true: exit_code != 0 OR output is empty (negation succeeded)
         - expect_empty=false: exit_code == 0 AND output non-empty

       IF PASS:
         passed++
         details.append({source, target, story, cmd, result: "pass"})
       ELSE:
         failed++
         details.append({source, target, story, cmd, result: "fail", output})
         RECORD as Critical issue:
           - severity: Critical
           - category: "Plan-Validation Fail"
           - issue: "{row.Source} → {row.Target} (Story {row.Story}) — validation `{cmd}` failed"
           - context: expected={'empty' if expect_empty else 'non-empty'}, actual_exit={exit_code}, actual_output={output[:200]}

     SET: PLAN_VALIDATION_RESULTS = { passed, failed, manual, details }
     LOG: "Plan-Validation: {passed} passed, {failed} failed, {manual} manual"

  4. REVIEW: Each changed file
     FOR EACH file in changed_files:
       READ: File content
       ANALYZE:
       - Code style conformance
       - Architecture patterns followed
       - Security best practices
       - Performance considerations
       - Error handling
       - Test coverage
       - **Spec-Conformance (NEU v1.1):** Cross-check against SPEC_CONTEXT (skip if SKIPPED above):
         * GAP — for each item in "Expected Deliverable": is it present in changed files? (substring match case-insensitive on filenames + brief code-look). Missing → Critical
         * SCOPE-CREEP — does this file's purpose violate "Out of Scope" list? Implemented Out-of-Scope item → Major
         * PLAN-DRIFT — is this file in "Komponenten-Übersicht" tables? If touched but not listed → Minor (info-level: may be legitimate test/config — agent-judgment)
         * REQUIREMENTS — if requirements-clarification.md has explicit acceptance criteria, does code address each? Missing → Critical

       RECORD: Issues found (Critical / Major / Minor)

  5. CREATE: specwright/specs/{SELECTED_SPEC}/review-report.md

     **Content:**
     ```markdown
     # Code Review Report - [SPEC_NAME]

     **Datum:** [DATE]
     **Branch:** [BRANCH_NAME]
     **Reviewer:** Claude (Opus)

     ## Review Summary

     **Geprüfte Commits:** [N]
     **Geprüfte Dateien:** [N]
     **Gefundene Issues:** [N]

     | Schweregrad | Anzahl |
     |-------------|--------|
     | Critical | [N] |
     | Major | [N] |
     | Minor | [N] |

     ## Spec-Conformance

     ### Expected Deliverable Checklist
     | Deliverable (aus spec.md) | Implementiert? | Files / Notes |
     |---------------------------|----------------|---------------|
     | [item] | ✅ / ❌ / partial | [file path or note] |

     ### Plan-Validation Results (Verbindungs-Matrix)
     **Geprüft:** [N] Validierungen — [N] passed, [N] failed, [N] manual-only

     | Source → Target | Story | Validation | Result |
     |-----------------|-------|------------|--------|
     | [A → B] | [STORY-ID] | `grep -n ...` | ✅ Pass / ❌ Fail / 📝 Manual |

     ### Scope Compliance
     - **In-Scope deliverables present:** [N]/[N]
     - **Out-of-Scope-Violations:** [N] (siehe Major Issues)
     - **Plan-Drift (undocumented files):** [N] (siehe Minor Issues)

     ### Requirements (aus requirements-clarification.md)
     | Acceptance Criterion | Erfüllt? | Implementation Reference |
     |----------------------|----------|--------------------------|
     | [criterion] | ✅ / ❌ | [file:line or story-id] |

     ## Geprüfte Dateien

     [List of all reviewed files with status]

     ## Issues

     ### Critical Issues
     [Keine gefunden / Issue-Liste mit Datei, Zeile, Beschreibung, Empfehlung]

     ### Major Issues
     [Keine gefunden / Issue-Liste mit Datei, Zeile, Beschreibung, Empfehlung]

     ### Minor Issues
     [Keine gefunden / Issue-Liste mit Datei, Zeile, Beschreibung, Empfehlung]

     ## Fix Status

     | # | Schweregrad | Issue | Status | Fix-Details |
     |---|-------------|-------|--------|-------------|
     | 1 | [Critical/Major/Minor] | [Kurzbeschreibung] | [pending/fixed/skipped/deferred] | [Was wurde gefixt] |

     ## Empfehlungen
     [List of recommendations]

     ## Fazit
     [Review passed / Review with notes / Review failed]
     ```

  6. EVALUATE and AUTO-FIX: Review Results

     COUNT: Total issues (Critical + Major + Minor)

     IF total issues = 0:
       LOG: "Code Review passed"
       GOTO: step_997_mark_done

     ELSE:
       LOG: "Code Review: {TOTAL} issues (Critical: {N}, Major: {N}, Minor: {N}) — starting Auto-Fix"

       <auto_fix>
         **Findings are auto-fixed without user confirmation** so auto-mode can progress.
         Only fix-failures create bug tickets.

         COLLECT: All issues
         SORT: By severity (Critical → Major → Minor)
         SET: TOTAL_ISSUES = count; FIXED_COUNT = 0; FAILED_FIXES = []

         **Spec-Deviation handling (NEU v1.1):**
         - Category "GAP" (missing Expected Deliverable, Critical): cannot auto-fix (would require new feature code) →
           SKIP auto-fix, CREATE bug-ticket immediately (kanban_add_item, type="fix", title="Missing Deliverable: {item}", priority="critical").
           Mark in review-report Fix Status as "deferred-bug-ticket".
         - Category "Plan-Validation Fail" (Critical): try inline fix (often missing import/method-call). If fix fails → bug-ticket as usual.
         - Category "SCOPE-CREEP" (Major): REMOVE the offending code-block (revert via git or manual delete). If unclear which lines → bug-ticket.
         - Category "PLAN-DRIFT" (Minor): log only, NO fix attempted (may be legitimate).

         FOR EACH issue in sorted_issues:
           LOG: "Fixing {FIXED_COUNT + 1}/{TOTAL_ISSUES}: [{severity}] {description}"

           1. READ: Affected file at specified location
           2. UNDERSTAND: Issue + recommended fix
           3. IMPLEMENT: Minimal, focused fix (no new issues)
           4. VERIFY: Fix resolves issue (lint affected file if applicable)

           IF fix successful:
             UPDATE review-report.md Fix Status: pending → fixed
             FIXED_COUNT++

           IF fix failed:
             UPDATE review-report.md Fix Status: pending → fix-failed
             CREATE bug ticket via kanban_add_item:
               - itemType: "fix"
               - id: "{SPEC_PREFIX}-FIX-{NUMBER}"
               - title: "Fix: {issue description}"
               - type: "{affected layer}"
               - priority: Critical→critical, Major→high, Minor→medium
               - effort: 1
               - status: "ready"
               - fixFor: "{SPEC_PREFIX}-997"
               - errorOutput: "{issue details}"
             APPEND issue to FAILED_FIXES

         LOG: "Auto-Fix: {FIXED_COUNT}/{TOTAL_ISSUES} fixed, {len(FAILED_FIXES)} failed"
       </auto_fix>

       <re_review>
         **Purpose:** Verify fixes didn't introduce new issues

         IF FIXED_COUNT = 0: GOTO step_997_update_report

         1. COLLECT: Modified files (`git diff --name-only`)
         2. FOR EACH modified file:
              Delta-Review of changed sections only
              Fix new issues inline if found
         3. RUN: Project-wide lint + tests
       </re_review>

       <step_997_update_report>
         UPDATE: review-report.md Fazit:
           - No FAILED_FIXES → "Review passed (after fixes)"
           - With FAILED_FIXES → "Review passed (after fixes) — {N} Issues als Bug-Tickets erstellt"
         UPDATE: Issue counts
         ADD: "## Re-Review" section with date, files, new issues, Auto-Fix result
         GOTO: step_997_mark_done
       </step_997_update_report>

  <step_997_mark_done>
  7. CALL MCP TOOL: kanban_complete_story
     Input:
     {
       "specId": "{SELECTED_SPEC}",
       "storyId": "{STORY-997-ID}",
       "filesModified": [...],
       "commits": [...]
     }
     VERIFY: Returns {"success": true, "remaining": N}

     NOTE: kanban.json is committed main-side by the auto-mode orchestrator
     after each story-complete event — never `git add` it from the worktree.

     STAGE + COMMIT (worktree-side housekeeping — story-997 markdown +
     review-report.md, both live in the worktree's filesystem):
     ```bash
     git add specwright/specs/{SELECTED_SPEC}/stories/story-997-*.md \
             specwright/specs/{SELECTED_SPEC}/review-report.md 2>/dev/null || true
     git diff --cached --quiet || git commit -m "feat: [story-997] Code Review completed"
     ```

  8. PROCEED: To next story (story-998)
  </step_997_mark_done>
</code_review_execution>

GOTO: phase_complete
