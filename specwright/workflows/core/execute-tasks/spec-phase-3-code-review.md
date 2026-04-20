---
description: Spec Phase 3 — System Story 997 (Code Review)
version: 1.0
---

# System Story 997: Code Review

**Purpose:** Strong model reviews the complete feature diff and auto-fixes findings.

<code_review_execution>
  1. UPDATE: kanban.json
     - MOVE: story-997 to "In Progress"
     - UPDATE resumeContext

  2. GET: Full diff between main and current branch
     ```bash
     git diff main...HEAD --name-only > /tmp/changed_files.txt
     git diff main...HEAD --stat
     ```

  3. CATEGORIZE: Changed files (Added / Modified / Deleted)

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
  7. MARK: story-997 as Done (UPDATE kanban.json)

     STAGE + COMMIT (housekeeping — kanban.json and story-997 markdown
     are written AFTER feature commits and would otherwise leak as
     uncommitted changes at the end of the spec):
     ```bash
     git add specwright/specs/{SELECTED_SPEC}/kanban.json \
             specwright/specs/{SELECTED_SPEC}/stories/story-997-*.md \
             specwright/specs/{SELECTED_SPEC}/review-report.md 2>/dev/null || true
     git diff --cached --quiet || git commit -m "feat: [story-997] Code Review completed"
     ```

  8. PROCEED: To next story (story-998)
  </step_997_mark_done>
</code_review_execution>

GOTO: phase_complete
