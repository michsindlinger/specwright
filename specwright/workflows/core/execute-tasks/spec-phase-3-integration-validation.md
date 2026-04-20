---
description: Spec Phase 3 — System Story 998 (Integration Validation, Tier-Aware)
version: 1.0
---

# System Story 998: Integration Validation

**Purpose:** Integration Tests aus spec.md ausführen.

**Tier-Gating (v5.1):** The dispatcher in `spec-phase-3.md` may have already:
- Skipped 998 entirely (S-Spec, single-layer) → this file not loaded
- Set `SIMPLIFIED_998 = true` (S-Spec, Full-stack) → run simplified mode below

<integration_validation_execution>
  1. UPDATE: kanban.json
     - MOVE: story-998 to "In Progress"
     - UPDATE resumeContext

  2. **CHECK: Simplified Mode**
     IF SIMPLIFIED_998 = true:
       LOG: "S-Spec simplified integration validation: lint + build + test only"
       RUN:
       ```bash
       [LINT_COMMAND]
       [BUILD_COMMAND]
       [TEST_COMMAND]
       ```
       IF all pass: GOTO step 8 (mark done)
       IF any fail: GOTO step 7 (handle failures)
       SKIP: Steps 3-6

  3. LOAD: Integration Requirements from spec.md
     READ: specwright/specs/{SELECTED_SPEC}/spec.md
     EXTRACT: "## Integration Requirements" section

  4. CHECK: MCP tools available (`claude mcp list`)
     NOTE: Tests requiring unavailable MCP tools will be skipped

  5. DETECT: Integration Type
     | Integration Type | Action |
     |------------------|--------|
     | Backend-only | API + DB integration tests |
     | Frontend-only | Component tests, optional browser |
     | Full-stack | All tests + E2E |
     | Not defined | Basic smoke tests |

  6. RUN: Integration Tests
     FOR EACH test command in Integration Requirements:
       RUN: command
       RECORD: PASSED / FAILED / SKIPPED

     VERIFY: Komponenten-Verbindungen (from implementation-plan.md)
     FOR EACH defined connection:
       VERIFY: Connection active (import + usage exists)

  7. HANDLE: Test Results
     IF all PASSED:
       LOG: "Integration validation passed"

     ELSE:
       GENERATE: Integration Fix Report
       ASK user via AskUserQuestion:
       "Integration validation failed. Options:
         1. Fix issues now (Recommended)
         2. Review and manually fix
         3. Skip and continue anyway (NOT RECOMMENDED)"

       IF fix: Fix + re-run failed tests
       IF skip: WARN and proceed

  8. MARK: story-998 as Done (UPDATE kanban.json)

     STAGE + COMMIT (integration validation is read-only but still modifies
     the story markdown — DoD checkboxes, validation results, and kanban.json
     updates must be captured):
     ```bash
     git add specwright/specs/{SELECTED_SPEC}/kanban.json \
             specwright/specs/{SELECTED_SPEC}/stories/story-998-*.md 2>/dev/null || true
     git diff --cached --quiet || git commit -m "feat: [story-998] Integration Validation completed"
     ```

  9. PROCEED: To next story (story-999)
</integration_validation_execution>

GOTO: phase_complete
