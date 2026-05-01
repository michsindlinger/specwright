---
description: Transfer Brainstorming to V2 Lean Spec (with --classic opt-in)
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
requires: create-spec.md >= v3.6 (Phase Detection branch (b))
---

# Transfer and Create Spec Rules

## Overview

Transfer a completed brainstorming session into a `requirements-clarification.md` and hand off to `/specwright:create-spec` via Phase Detection / Resume Support. Output is V2 Lean by default (matches `create-spec.md` v3.11+); pass `--classic` to keep V1 Classic flow.

**v2.0 Changes (V2 Lean Alignment):**
- **BREAKING:** Output now V2 Lean by default (matches `create-spec.md` v3.11+). Pass `--classic` to opt into V1.
- **NEW:** `--classic` flag pass-through (parsed from `$ARGUMENTS`, forwarded in resume command).
- **NEW:** Pre-fill `requirements-clarification.md`, hand off via user-typed resume command (mirrors `create-spec.md` Phase 1 pause pattern, lines 506-520).
- **NEW:** Down-Sizing Pre-Check — advisory `/add-todo` switch only (Score ≥ 7). M/S classification deferred to `create-spec` Step 2.6-lean.
- **NEW:** Cancel-Transfer abort path in approval step.
- **NEW:** Idempotency guard for re-transfer (no duplicate `## Transfer Complete` blocks).
- **NEW:** Folder collision check before spec creation.
- **NEW:** Thin-Session early-exit recommendation (>8 of 11 sections empty → suggest cold-start `/specwright:create-spec`).
- **NEW:** Post-edit structure validation (all 11 section headers must remain after user edit).
- **NEW:** Shared template `specwright/templates/docs/requirements-clarification-template.md` (used by both `create-spec.md` and this workflow).
- **REMOVED:** Sub-Agent delegation for content tasks (Main Agent only, except `date-checker` utility).
- **REMOVED:** Technical questions from gap-fragebogen (architecture, integrations, performance, testing — these belong to Plan-Agent in `create-spec` Step 2.5).
- **REMOVED:** Context-blob handoff (`EXECUTE: ... WITH context:` — `create-spec` is dialog-driven and does not consume blobs).
- **FIX:** Step numbering gap (was 1,2,3,4,5,7,8 — now 0-9 sequential).
- **FIX:** Final summary references `kanban.json` — old `tasks.md` path removed.
- **COUPLING:** Depends on `create-spec.md` >= v3.6 (Phase Detection branch (b) at lines 188-208).

<pre_flight_check>
  EXECUTE: @~/.specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="0" name="parse_arguments">

### Step 0: Parse Arguments

```
SET: PASS_CLASSIC = false
SET: SESSION_FILTER = ""

IF $ARGUMENTS contains "--classic":
  SET: PASS_CLASSIC = true
  STRIP: "--classic" token

REMAINING $ARGUMENTS (trimmed) = SESSION_FILTER
```

`SESSION_FILTER` semantics in Step 1:
- Empty → list all `ready-for-spec` sessions
- Exact match against a session-ID directory name → auto-select that session
- Substring match → narrow the list to matching sessions

</step>

<step number="1" name="session_retrieval">

### Step 1: Retrieve Brainstorming Session

Main agent (no sub-agent) scans `specwright/brainstorming/` and selects the session.

<session_discovery>
  SCAN specwright/brainstorming/ for sub-directories containing session.md

  DEFAULT FILTER: only sessions whose Status is `ready-for-spec`.

  IF SESSION_FILTER is empty:
    LIST all ready-for-spec sessions with topic + status
    IF none found: INFORM "No ready-for-spec sessions. Use 'start-brainstorming' first or override (Status: Active)."
                   OFFER to show Active sessions (with warning that they may be incomplete).
  ELSE IF SESSION_FILTER exact-matches a session-ID:
    AUTO-SELECT that session
  ELSE:
    LIST sessions where folder name OR topic contains SESSION_FILTER substring

  IF list shown: PRESENT numbered list to user, WAIT for selection (or "show all" to include Active/transferred).

  IF user selects an `Active` session: WARN "Session is still active and may be incomplete. Continue?"
  IF user selects a `transferred` session: WARN "Session was transferred before. Are you sure?"
</session_discovery>

<session_load>
  READ selected session.md
  EXTRACT raw content for Step 2 mapping.
</session_load>

</step>

<step number="2" name="gap_analysis">

### Step 2: Map Session Content to Clarification Sections

Main agent maps the brainstorming session against the 11 clarification template sections (see `specwright/templates/docs/requirements-clarification-template.md`).

<sections>
  1. Feature Overview
  2. Target Users
  3. Business Value
  4. Functional Requirements
  5. Affected Areas & Dependencies
  6. Edge Cases & Error Scenarios
  7. Security & Permissions
  8. Performance Considerations
  9. Scope Boundaries (IN / OUT)
  10. Open Questions
  11. Proposed User Stories (titles + 1-liner)
</sections>

<gap_analysis>
  FOR each section:
    SCAN session.md for relevant content
    IF found: MARK section as filled, CAPTURE excerpt
    ELSE: ADD to missing_sections list

  COMPUTE: empty_count = len(missing_sections)
</gap_analysis>

<thin_session_check>
  IF empty_count > 8:
    INFORM user:
      "Session is thin — [empty_count]/11 clarification sections are empty.
       Brainstorming sessions of this size do not benefit from transfer.
       Recommendation: run /specwright:create-spec directly (cold-start with roadmap context)."

    ASK via AskUserQuestion:
      1. "Run /specwright:create-spec instead (Recommended)" → STOP this workflow, user runs create-spec
      2. "Continue transfer anyway"                          → proceed (full questionnaire ahead)
</thin_session_check>

</step>

<step number="3" name="fachlicher_fragebogen">

### Step 3: Fill PO/fachliche Gaps via Interactive Questionnaire

For each `missing_section` in Step 2, ask the user via AskUserQuestion or open dialog.

<question_map>
  Feature Overview:        "In 1-2 sentences, what is this feature?"
  Target Users:            "Who will use it?"
  Business Value:          "Why does it matter?"
  Functional Requirements: "What should the feature do (user-facing only — no implementation details)?"
  Affected Areas:          "Which existing components/systems are touched?"
  Edge Cases:              "What error scenarios or edge cases should we handle?"
  Security:                "Who can access what? (Permissions only — no implementation.)"
  Performance:             "Any user-facing performance expectations?"
  Scope IN:                "What is explicitly IN scope?"
  Scope OUT:               "What is explicitly OUT of scope?"
  Open Questions:          "Any unresolved questions for the team?"
  Proposed Stories:        "List 1-N story titles with 1-line descriptions (no Gherkin AC — that's later)."
</question_map>

<rules>
  - Ask ONLY for missing sections — do not re-ask if already filled from session.
  - DO NOT ask technical questions: architecture, integration mechanics, testing approach, success metrics, technical constraints. These belong to the Plan-Agent in create-spec Step 2.5.
  - Capture answers in memory for Step 6.
  - Track which sections were gathered via questionnaire (for Origin section's `gaps_filled` list).
</rules>

</step>

<step number="4" name="down_sizing_pre_check">

### Step 4: Down-Sizing Pre-Check (Advisory)

Mirror `create-spec.md` Step 2.3.1 score formula. **Pre-check only offers `/add-todo` switch — M/S tier classification is deferred to create-spec.** Reason: `kanban.json` does not exist yet, so create-spec's Phase Detection (lines 188-208) would not honor a pre-set tier on resume.

<scoring>
  proposed_stories  = count of items in section 11
  func_reqs         = count of items in section 4
  affected_areas    = count of items in section 5
  is_single_layer   = true if all affected areas are in same layer (Frontend-only OR Backend-only)

  Score = 0
  IF proposed_stories <= 2: Score += 3
  IF func_reqs <= 3:        Score += 2
  IF affected_areas <= 1:   Score += 2
  IF is_single_layer:       Score += 1
</scoring>

<advisory>
  IF Score >= 7:
    INFORM user (advisory note: "Pre-check may undercount because brainstorming-derived clarifications are sparser than dialog-driven ones."):
      "Strong advisory: feature appears very small (Score [N]/8).
       /add-todo saves significant overhead for small tasks."

    ASK via AskUserQuestion:
      1. "Switch to /add-todo (Recommended)" → INVOKE /add-todo with feature description, STOP this workflow
      2. "Continue with transfer"           → proceed to Step 5

  ELSE IF Score 4-6:
    INFORM user (info-only, no choice):
      "Feature size is moderate (Score [N]/8). Implementation Plan will run as usual.
       create-spec will classify the spec tier (M/S) automatically in Step 2.6-lean."
    PROCEED to Step 5

  ELSE (Score 0-3):
    SILENTLY proceed to Step 5
</advisory>

</step>

<step number="5" name="date_and_folder">

### Step 5: Determine Date and Create Spec Folder

<date_resolution>
  DELEGATE to date-checker via Task tool (model="haiku") to get YYYY-MM-DD.
</date_resolution>

<slug_generation>
  Derive slug from Feature Overview / brainstorming topic:
  - lowercase
  - replace whitespace and non-alphanumeric with hyphens
  - collapse multiple hyphens
  - max 60 chars

  PROPOSED_FOLDER = specwright/specs/YYYY-MM-DD-{slug}/
</slug_generation>

<collision_check>
  IF PROPOSED_FOLDER already exists:
    ASK via AskUserQuestion:
      1. "Append disambiguator (-2, -3, ...)" → use first available suffix
      2. "Rename slug"                        → ask for new slug, re-check collision
      3. "Abort transfer"                     → STOP workflow

  CREATE the folder once unique.
</collision_check>

</step>

<step number="6" name="write_clarification">

### Step 6: Write requirements-clarification.md

Main agent writes the file directly via Write tool (no sub-agent delegation — same pattern as `create-spec.md` Step 2.2).

<template_load>
  TRY READ: specwright/templates/docs/requirements-clarification-template.md
  IF not found: READ ~/.specwright/templates/docs/requirements-clarification-template.md
  IF still not found: ERROR — run setup-devteam-global.sh
</template_load>

<substitutions>
  Fill template with:
  - [SPEC_NAME]: human-readable feature name from Feature Overview
  - [DATE]: YYYY-MM-DD from Step 5
  - All bracketed placeholders → content from Step 2 (session) and Step 3 (questionnaire)
</substitutions>

<append_origin>
  After the closing `*Review this document carefully...*` line, append:

  ```markdown
  ## Origin

  > **Transferred from Brainstorming Session:** [SESSION_ID]
  > **Original Discussion:** @specwright/brainstorming/[SESSION_ID]/session.md
  > **Transfer Date:** [YYYY-MM-DD]
  > **Mode:** [V2 Lean | V1 Classic]   ← reflects PASS_CLASSIC

  ### Information Added During Transfer
  [List of sections gathered via Step 3 questionnaire — empty list if all filled from session]

  ### Notes
  [Optional transfer notes, e.g. ambiguities resolved, alternative ideas not carried over]
  ```
</append_origin>

<preview>
  OPEN document preview via MCP tool `document_preview_open`:
  - filePath: "specwright/specs/[YYYY-MM-DD-{slug}]/requirements-clarification.md"
</preview>

</step>

<step number="7" name="user_approval">

### Step 7: User Approval

Approval is required here because `create-spec.md` Phase Detection branch (b) (lines 188-208) **skips Step 2.3 (Approval) on resume** — it reads the clarification and jumps directly to Step 2.5. If we don't approve here, the user never gets a chance to review.

<approval_question>
  ASK via AskUserQuestion:
    1. "Approve & continue to create-spec handoff" → proceed to Step 8
    2. "Edit directly in editor"                   → see edit_path below
    3. "Re-open dialog (more questions)"           → return to Step 3 with focused gaps
    4. "Cancel transfer"                           → see cancel_path below
</approval_question>

<edit_path>
  INFORM: "Edit specwright/specs/[YYYY-MM-DD-{slug}]/requirements-clarification.md, then say 'fertig'."
  WAIT for user confirmation.
  RE-READ the file.

  STRUCTURE VALIDATION:
    REQUIRED_HEADERS = [
      "## Feature Overview", "## Target Users", "## Business Value",
      "## Functional Requirements", "## Affected Areas & Dependencies",
      "## Edge Cases & Error Scenarios", "## Security & Permissions",
      "## Performance Considerations", "## Scope Boundaries",
      "## Open Questions", "## Proposed User Stories", "## Origin"
    ]

    FOR each header in REQUIRED_HEADERS:
      IF header not found in file:
        WARN: "Section '[header]' is missing after edit. The downstream Plan-Agent expects all sections."
        ASK: 1. "Re-edit"  2. "Continue anyway (your responsibility)"

  Re-ask approval after edit.
</edit_path>

<cancel_path>
  INFORM: "Cancelling transfer. Spec folder will be deleted; brainstorming session remains untouched."
  CONFIRM: AskUserQuestion 1. "Yes, cancel and delete folder"  2. "Wait, go back"
  IF confirmed:
    DELETE specwright/specs/[YYYY-MM-DD-{slug}]/ (use Bash with `rm -rf` only if confirmed)
    STOP workflow
</cancel_path>

<close_preview>
  ON approval: CLOSE document preview via `document_preview_close`.
</close_preview>

</step>

<step number="8" name="update_brainstorming">

### Step 8: Update Brainstorming Session

Main agent updates `session.md` with transfer status — idempotent (safe to re-run).

<idempotency_check>
  READ specwright/brainstorming/[SESSION_ID]/session.md

  IF body already contains "## Transfer Complete":
    INFORM user: "Session was transferred before. Skip update or replace existing block?"
    ASK: 1. "Skip update"  2. "Replace previous Transfer Complete block"
    IF skip: SKIP append, but still update Status field
    IF replace: REMOVE old block, append new
</idempotency_check>

<status_update>
  Find the line `> Status: [VALUE]` in the session header (typically line 6).
  REPLACE with `> Status: transferred`.
</status_update>

<append_block>
  APPEND to session.md:

  ```markdown
  ---

  ## Transfer Complete

  **Transferred to Spec:** [YYYY-MM-DD]
  **Spec Location:** @specwright/specs/[YYYY-MM-DD-{slug}]/
  **Mode:** [V2 Lean | V1 Classic]
  **Status:** Transferred
  ```
</append_block>

</step>

<step number="9" name="resume_handoff">

### Step 9: Hand off to create-spec via User Resume Command

Mirror `create-spec.md` Phase 1 pause pattern (lines 506-520). The user types the resume command — this gives a clean token reset between Transfer and Plan-Agent and lets the user explicitly decide to continue or `/clear` first.

<handoff_question>
  Resume-Command (used in both options):
    IF PASS_CLASSIC = true:  CMD = "/specwright:create-spec --classic specwright/specs/[YYYY-MM-DD-{slug}]/"
    ELSE:                    CMD = "/specwright:create-spec specwright/specs/[YYYY-MM-DD-{slug}]/"

  ASK via AskUserQuestion:
    "Phase 1 complete (clarification approved). Implementation Plan (Plan-Agent) is the next phase and benefits from a fresh context window. How would you like to proceed?"

    1. "Clear context and resume (Recommended)"
       → PRINT: "Run /clear, then: [CMD]"
       → STOP workflow.

    2. "Continue in this session"
       → INFORM: "Continuing inline. Note: brainstorming + transfer context is still loaded."
       → EXECUTE inline: load create-spec.md, resume at the path argument (Phase Detection branch (b) → Step 2.5).
</handoff_question>

<final_summary>
  Print a one-line summary regardless of choice:

  ```
  ✅ Transfer complete.
     Brainstorming: specwright/brainstorming/[SESSION_ID]/ (status → transferred)
     New spec:      specwright/specs/[YYYY-MM-DD-{slug}]/
     Clarification: requirements-clarification.md (with Origin section)
     Mode:          [V2 Lean | V1 Classic]
     Resume:        [CMD]
  ```

  No `tasks.md` is mentioned — V2 Lean uses `kanban.json`, which is created later by create-spec Step 2.6-lean.
</final_summary>

</step>

</process_flow>

## Coupling Notes

- **Depends on** `create-spec.md` >= v3.6 — specifically Phase Detection branch (b) at lines 188-208 (resume from existing clarification jumps to Step 2.5).
- **Depends on** `requirements-clarification-template.md` (shared template, same template used by `create-spec.md` Step 2.2 since v3.13).
- **Brainstorming Status field convention**: `> Status: [Active|ready-for-spec|transferred]` in the session header (typically line 6 of session.md).

## Transfer Quality Standards

<information_integrity>
  - Preserve original brainstorming context (Origin section links back).
  - Keep decision rationale (mention key decisions in Notes if relevant).
  - Document gaps filled via questionnaire (gaps_filled list under Origin).
</information_integrity>

<scope_boundary>
  - Transfer fills PO/fachliche sections only.
  - Technical decisions (architecture, integration mechanics, testing) are owned by Plan-Agent in create-spec Step 2.5.
  - Spec tier (S/M/L) classification is owned by create-spec Step 2.6-lean (V2) or Step 2.6 (V1 Classic) — Transfer does not pre-set it.
</scope_boundary>

<final_checklist>
  <verify>
    - [ ] Brainstorming session selected and read
    - [ ] Gap analysis run and missing sections identified
    - [ ] Thin-session check applied (if applicable)
    - [ ] Fachlicher Fragebogen filled missing sections (PO/fachlich only)
    - [ ] Down-sizing pre-check applied (advisory /add-todo only)
    - [ ] Spec folder created (collision-free)
    - [ ] requirements-clarification.md written via shared template
    - [ ] Origin section appended
    - [ ] User approved (or edited + re-validated)
    - [ ] Brainstorming session updated (idempotent, status → transferred)
    - [ ] User informed of resume command (with --classic if applicable)
  </verify>
</final_checklist>
