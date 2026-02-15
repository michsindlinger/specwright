---
description: Manage changes to existing specifications with verification and story adjustment
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Change Spec Workflow

## Overview

Manage changes to EXISTING specifications with complete status verification and story lifecycle management.

**Key Characteristics:**
- Status verification (spec + implementation)
- Implementation discrepancy detection
- Interactive change clarification
- Story evaluation and adjustment (delete/update/create/rollback)
- Automatic changelog maintenance

**When to use:**
- Modifying planned features before implementation
- Adding new requirements to existing specs
- Removing features from scope
- Changing implemented features (requires rollback handling)
- Any spec modifications that affect existing stories

**Workflow Steps:**
1. Spec Selection - Choose existing spec
2. Status Check - Read spec.md, spec-lite.md, kanban.json
3. Implementation Verification - Compare code to spec status
4. Discrepancy Report - Show differences (if any)
5. Change Dialog - Interactively clarify changes
6. Implementation Plan - Create detailed change plan
7. Story Evaluation - Review in-progress and backlog stories
8. Story Adjustment - Delete/update/create/rollback as needed
9. Kanban Update - Update kanban.json
10. Changelog Extension - Document changes in spec.md

<pre_flight_check>
  EXECUTE: @~/.agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="context-fetcher" name="spec_selection">

### Step 1: Spec Selection

<mandatory_actions>
  1. LIST all specs:
     - DIR: agent-os/specs/
     - EXTRACT: Folder names (YYYY-MM-DD-spec-name format)

  2. IF no specs found:
     INFORM: "No specifications found in agent-os/specs/"
     PRESENT: Options via AskUserQuestion:
       ```
       Question: "No existing specs found. What would you like to do?"

       Options:
       1. Create new spec
          → Redirect to /create-spec

       2. Create retroactive spec for existing code
          → Redirect to /retroactive-spec
       ```
     EXIT with appropriate redirection

  3. IF specs found:
     PRESENT list to user:
     ```
     Available Specifications:

     1. [Spec Name] ([Date])
        → [Brief description from spec-lite if available]

     2. [Spec Name] ([Date])
        → ...

     Which spec would you like to modify?
     (Enter number or type full spec name)
     ```

  4. WAIT for user selection

  5. STORE: Selected spec path for all subsequent steps
</mandatory_actions>

</step>

<step number="2" subagent="context-fetcher" name="spec_analysis">

### Step 2: Spec Analysis - Read Current State

<mandatory_actions>
  1. READ spec main files:
     - spec.md
     - spec-lite.md
     - kanban.json (if exists)
     - story-index.md

  2. IF kanban.json exists:
     PARSE: JSON structure
     EXTRACT:
       - All stories
       - Current status (ready/in-progress/done/blocked)
       - Story classifications

  3. CATEGORIZE stories:
     ```
     Done Stories:
     - [ID]: [Title] (Status: done/completed)
     - ...

     In Progress:
     - [ID]: [Title] (Status: in-progress)
       [If any] → These will need special attention!

     Backlog/Ready:
     - [ID]: [Title] (Status: ready/backlog)

     Blocked:
     - [ID]: [Title] (Status: blocked)
     ```

  4. CHECK for changes/ folder:
     - LIST: agent-os/specs/[spec]/changes/
     - COUNT: Existing change files

  5. SUMMARIZE current state:
     ```
     **Spec:** [Spec Name]

     **Story Status:**
     - ✅ Done: [N] stories
     - 🔄 In Progress: [N] stories ⚠️
     - 📋 Backlog: [N] stories
     - 🚫 Blocked: [N] stories

     **Previous Changes:**
     [N] change documents found

     **Change Impact Warning:**
     [!] Changes to "In Progress" stories may require code reversion
     [!] Changes to "Done" stories require rollback stories
     ```
</mandatory_actions>

</step>

<step number="3" name="implementation_check">

### Step 3: Implementation Verification

Compare implemented code with spec status to detect discrepancies.

<mandatory_actions>
  1. IF stories have status "done":
     DELEGATE to codebase-analyzer:
     ```
     Verify implementation status for done stories:

     Stories marked as "done":
     [LIST story IDs and titles]

     For each done story:
     1. Check the story's WO (Where) files exist
     2. Verify Completion Check commands would pass
     3. Look for obvious signs of non-completion
     4. Compare git history with story completion dates

     Return: Verification report with discrepancies
     ```

  2. RECEIVE: Implementation verification report

  3. IF discrepancies found:
     FLAG: "Implementation status differs from spec!"
     DOCUMENT: Discrepancies found

  4. REVIEW "In Progress" stories:
     - Check if files mentioned in WO exist
     - Check git status for recent activity
     - Note if implementation appears abandoned
</mandatory_actions>

</step>

<step number="4" name="discrepancy_report">

### Step 4: Discrepancy Report (Conditional)

<mandatory_actions>
  1. IF discrepancies found:
     GENERATE report:
     ```
     ⚠️ Implementation Status Discrepancy Detected

     **Spec says "Done" but implementation incomplete:**

     Story [ID]: [Title]
     - Expected: [Expected completion criteria]
     - Actual: [What's actually there / not there]
     - Impact: [What this means for changes]

     Story [ID]: [Title]
     - ...

     **Recommended Actions:**
     1. Fix discrepancy first
        → Complete/revert the unfinished stories

     2. Continue with change planning
        → Note these stories in change documentation

     3. Reset story status
        → Mark as "in-progress" if not actually done
     ```

  2. PRESENT: Options via AskUserQuestion

  3. HANDLE user choice:
     - IF "Fix first": Pause, coordinate fixing
     - IF "Continue": Note in change documentation
     - IF "Reset status": Update kanban.json appropriately
</mandatory_actions>

</step>

<step number="5" name="change_dialog">

### Step 5: Change Requirements Dialog (Interactive)

<mandatory_actions>
  1. PRESENT: Current spec context
     ```
     **Current Spec:** [Spec Name]

     Quick Reference (from spec-lite.md):
     [spec-lite content]
     ```

  2. ASK: What changes are needed?
     ```
     Question: "What changes would you like to make to this specification?"

     Describe your changes:
     - What new functionality should be added?
     - What existing features should be modified?
     - What should be removed?
     - Why are these changes needed?

     (You can provide as much or as little detail as you have now -
     I'll ask clarifying questions)"
     ```

  3. COLLECT: Initial change description

  4. ENGAGE: Iterative clarification dialog
     ASK follow-up questions:
     - "When you say [X], do you mean...?"
     - "Should [feature] keep existing behavior for [edge case]?"
     - "Does this affect the [component] that [story] is implementing?"
     - "Are there any breaking changes for implemented features?"

  5. CONTINUE: Until change requirements are clear

  6. DOCUMENT: Final change requirements summary
</mandatory_actions>

</step>

<step number="6" name="impact_analysis">

### Step 6: Change Impact Analysis

<mandatory_actions>
  1. ANALYZE impact on existing stories:

     FOR EACH story:
     ```
     Story [ID]: [Title] ([Status])

     Impact Assessment:
     - [ ] No impact - unrelated to changes
     - [ ] Minimal impact - documentation update only
     - [ ] Moderate impact - requires story update
     - [ ] Significant impact - story needs rewrite
     - [ ] Obsolete - delete story
     - [ ] New dependency - create new story
     - [ ] Rollback required - feature partially/fully implemented
     ```

  2. CLASSIFY changes:
     ```
     **Change Classification:**

     Non-Breaking Changes:
     - [Description] → Can be added without affecting existing work

     Breaking Changes (requires rollback):
     - [Description] → Affects completed implementation
       - Story [ID] will need rollback
       - New story needed to re-implement with changes

     Scope Additions:
     - [Description] → New stories needed

     Scope Removals:
     - [Description] → Delete stories [IDs]
     ```

  3. PREPARE: Impact summary for user review
</mandatory_actions>

</step>

<step number="7" name="user_review_impact">

### Step 7: User Review - Impact Confirmation

<mandatory_actions>
  1. PRESENT impact analysis:
     ```
     **Change Impact Analysis**

     ## Summary
     Your requested changes will affect:
     - Stories to KEEP as-is: [N]
     - Stories to UPDATE: [N]
     - Stories to DELETE: [N]
     - New stories to CREATE: [N]
     - Rollback stories needed: [N]

     ## Detailed Impact

     ### Stories Requiring Updates
     | Story ID | Title | Impact | Action |
     |----------|-------|--------|--------|
     | [ID] | [Title] | [Description] | Update |

     ### Stories to Delete
     | Story ID | Title | Reason |
     |----------|-------|--------|
     | [ID] | [Title] | [Why no longer needed] |

     ### New Stories Required
     | Area | Description |
     |------|-------------|
     | [Area] | [What needs to be built] |

     ### Rollback Required (Breaking Changes)
     | Feature | Rollback Story | New Implementation |
     |---------|----------------|-------------------|
     | [Feature] | Rollback [ID] | New story [NEW-ID] |
     ```

  2. ASK for confirmation:
     ```
     Question: "Here's how your changes will affect the existing stories.

     Do you want to proceed with these adjustments?"

     Options:
     1. Yes, proceed with all adjustments
        → Continue to implementation plan

     2. Modify the approach
        → Let's adjust which stories to update/delete

     3. Reconsider changes
        → Return to change dialog

     4. Cancel changes
        → Exit without modifying spec
     ```

  3. HANDLE user choice appropriately
</mandatory_actions>

</step>

<step number="8" subagent="context-fetcher" name="date_determination">

### Step 8: Date Determination

<mandatory_actions>
  DELEGATE to date-checker:
  PROMPT: "Get current date in YYYY-MM-DD format for changelog entry"

  RECEIVE: Current date
  STORE: For changelog
</mandatory_actions>

</step>

<step number="9" name="implementation_plan">

### Step 9: Create Implementation Plan for Changes

<mandatory_actions>
  1. DELEGATE to Plan Agent via Task tool:

     PROMPT:
     """
     Create a detailed implementation plan for the requested changes.

     **Context:**
     - Original Spec: [spec path]
     - Change Requirements: [documented changes]
     - Affected Stories: [list]

     **Task:**
     Create implementation plan for CHANGES ONLY (not the entire feature).

     Focus on:
     1. How to implement each new requirement
     2. How to modify existing code (if stories in progress)
     3. How to rollback/replace completed features (if breaking changes)
     4. Dependencies between change tasks
     5. Integration with existing code

     Output: Implementation plan document (not file, just structure)
     """

  2. RECEIVE: Implementation plan from Plan Agent

  3. STORE: For story creation/update reference
</mandatory_actions>

</step>

<step number="10" name="story_adjustments">

### Step 10: Story Adjustments Execution

<mandatory_actions>
  1. PROCESS each story based on impact analysis:

     **FOR stories marked "DELETE":**
     ```
     a. READ story file
     b. ADD to top: "**STATUS: DELETED** - [Reason]"
     c. UPDATE kanban.json: status = "deleted"
     d. ARCHIVE file: Move to stories/archive/
     ```

     **FOR stories marked "UPDATE":**
     ```
     a. READ story file
     b. ADD to "Change History" section:
        ### [DATE] - Updated
        - Change: [Description]
        - Impact: [How story changed]
        - Original: [What was there]
        - Updated: [What changed]
     c. UPDATE story content with new requirements
     d. UPDATE kanban.json: status = "updated"
     ```

     **FOR new stories needed:**
     ```
     a. DETERMINE next available story ID
        - SCAN: existing story IDs
        - FIND: highest number
        - NEXT: highest + 1

     b. CREATE story file:
        stories/story-[NEW-ID]-[slug].md
        - Follow standard story template
        - Mark as "Change-Related" in metadata
        - Reference: Related to change on [DATE]

     c. UPDATE kanban.json:
        ADD new story entry with status "ready"
     ```

     **FOR rollback stories needed:**
     ```
     a. CREATE rollback story:
        Title: "Rollback: [Original Feature]"

     b. Content:
        ```markdown
        # Story [ID]-RB: Rollback [Original Feature]

        **Type:** Rollback
        **Reason:** Breaking changes require rollback before re-implementation
        **Original Story:** story-[ID]

        ## Description
        Rollback changes made in story-[ID] to prepare for:
        [Description of new approach]

        ## Rollback Steps
        1. [Step to revert]
        2. [Step to revert]

        ## Verification
        - [ ] Original feature no longer active
        - [ ] Code reverted to pre-story-[ID] state
        - [ ] Tests pass without rolled-back functionality
        ```

     c. CREATE new implementation story:
        "Re-implement [Feature] with changes"

     d. SET dependencies:
        - Rollback story must complete first
        - New implementation depends on rollback
     ```

  2. UPDATE story-index.md:
     - Reflect all status changes
     - Update dependency graph
     - Mark deleted stories
</mandatory_actions>

</step>

<step number="11" name="kanban_update">

### Step 11: Kanban Update

<mandatory_actions>
  1. READ: Current kanban.json

  2. APPLY changes:

     FOR deleted stories:
     ```json
     {
       "id": "[PREFIX]-[ID]",
       "status": "deleted",
       "deletedAt": "[DATE]",
       "deletionReason": "[Reason]"
     }
     ```

     FOR updated stories:
     ```json
     {
       "id": "[PREFIX]-[ID]",
       "status": "ready",
       "originalStatus": "[prior status]",
       "updatedAt": "[DATE]",
       "updateReason": "[Description]"
     }
     ```

     FOR new stories:
     ADD new entry with status "ready"

  3. UPDATE execution plan in kanban.json:
     - Add phase for rollback (if needed)
     - Add phase for new implementation
     - Update dependencies

  4. UPDATE statistics:
     - Recalculate totals
     - Count changes

  5. SAVE: Updated kanban.json
</mandatory_actions>

</step>

<step number="12" name="changelog_update">

### Step 12: Spec.md Changelog Extension

<mandatory_actions>
  1. READ: spec.md

  2. APPEND to ## Changelog section:

     ```markdown
     ### [DATE] - [Change Summary Title]

     **Status:** [Planned/In Progress/Completed]

     **Change File:** See changes/YYYY-MM-DD-[change-name].md

     **Stories Affected:**
     - **Deleted:** [List of deleted story IDs with brief reason]
     - **Updated:** [List of updated story IDs with change summary]
     - **New:** [List of new story IDs]
     - **Rollback:** [List of rollback story IDs and their replacement stories]

     **Summary:**
     [Brief description of the changes - 2-3 sentences]

     **Impact on Existing Work:**
     - [Impact description]

     **Migration Notes:**
     [If applicable: how to migrate from old to new structure]

     ---
     ```

  3. UPDATE spec-lite.md:
     - If changes significantly affect feature, update summary
     - Ensure it reflects current spec status

  4. SAVE: Updated spec files
</mandatory_actions>

</step>

<step number="13" subagent="file-creator" name="change_documentation">

### Step 13: Create Detailed Change Document

<mandatory_actions>
  1. ENSURE: changes/ directory exists
     CREATE: agent-os/specs/[spec]/changes/

  2. CREATE: YYYY-MM-DD-[change-name].md

     <change_document_template>
     # Change: [TITLE]

     > **Date:** [DATE]
     > **Type:** [enhancement/modification/bug_fix/refactoring/rollback]
     > **Original Spec:** @agent-os/specs/[spec]/spec.md

     ## Change Summary

     [1-2 sentence description of WHAT is changing and WHY]

     ## Motivation

     [Why this change is needed]

     ## Detailed Changes

     ### Scope Changes

     #### Added
     - [New feature/capability]
     - ...

     #### Modified
     - [Existing feature change]
     - ...

     #### Removed
     - [Removed feature]
     - ...

     ### Technical Changes

     #### API Changes
     - [New endpoint]
     - [Modified endpoint]
     - [Removed endpoint]

     #### Database Changes
     - [Schema modification]
     - [Migration required: yes/no]

     #### Component Changes
     - [New components]
     - [Modified components]
     - [Removed components]

     ### Stories - Impact Matrix

     | Story ID | Title | Action | Reason |
     |----------|-------|--------|--------|
     | [ID] | [Title] | [Keep/Update/Delete/Rollback/New] | [Reason] |

     ## Implementation Plan

     ### Phase 1: Rollback (if required)
     - [ ] Story [ID]-RB: Rollback [feature]

     ### Phase 2: New Implementation
     - [ ] Story [NEW-ID]: [New implementation]

     ### Phase 3: Updates
     - [ ] Story [ID]: [Updated implementation]

     ## Migration Guide

     ### For Developers
     [How developers should handle this change]

     ### For Users (if applicable)
     [Any user-facing changes they need to know about]

     ## Testing Impact

     [What tests need to be updated/new tests needed]

     ## Dependencies

     [What this change depends on and what depends on it]
     </change_document_template>

  3. IF change is large/significant:
     CREATE: changes/YYYY-MM-DD-[change-name]/ subdirectory
     - Add detailed technical documents
     - Add migration guides
     - Add diagrams if needed
</mandatory_actions>

</step>

<step number="14" name="final_summary">

### Step 14: Final Summary and User Confirmation

<mandatory_actions>
  1. PREPARE: Summary report

     ```
     ✅ Change Specification Complete!

     **Spec:** [Spec Name]

     **Changes Applied:**
     ┌─────────────────────────────────────────────────┐
     │ Stories Affected:                               │
     │  - Deleted:     [N] stories                     │
     │  - Updated:     [N] stories                     │
     │  - New:         [N] stories                     │
     │  - Rollback:    [N] stories                     │
     ├─────────────────────────────────────────────────┤
     │ Documents Created/Updated:                      │
     │  - spec.md (updated changelog)                  │
     │  - spec-lite.md (updated)                       │
     │  - kanban.json (updated statuses)               │
     │  - changes/[file].md (new)                      │
     │  - story-index.md (updated)                     │
     └─────────────────────────────────────────────────┘

     **Current Story Status:**
     - Ready to implement: [N]
     - In Progress: [N]
     - Done (unchanged): [N]
     - Deleted: [N]

     **Next Steps:**
     1. Review the change documentation:
        → changes/YYYY-MM-DD-[change-name].md

     2. Check updated stories:
        → agent-os/specs/[spec]/stories/

     3. Execute changes:
        → /execute-tasks [spec-name]
     ```

  2. PRESENT to user

  3. ASK:
     ```
     Question: "Change specification is complete. What would you like to do?"

     Options:
     1. Execute the changes now
        → Run /execute-tasks for this spec

     2. Review the documentation first
        → I'll show you where to find the details

     3. Make additional changes
        → Return to change dialog

     4. I'm done for now
        → Changes are documented and ready for later
     ```

  4. HANDLE user choice
</mandatory_actions>

</step>

</process_flow>

## Final Checklist

<verify>
  - [ ] Spec selected and loaded
  - [ ] Current story status analyzed (done/in-progress/backlog/blocked)
  - [ ] Implementation verification completed
  - [ ] Discrepancies acknowledged (if any)
  - [ ] Change requirements clarified interactively
  - [ ] Impact analysis performed and reviewed by user
  - [ ] Implementation plan created for changes
  - [ ] Stories adjusted as needed (deleted/updated/new/rollback)
  - [ ] kanban.json updated with new statuses
  - [ ] spec.md changelog extended
  - [ ] spec-lite.md updated (if needed)
  - [ ] Change document created in changes/ folder
  - [ ] User reviewed final summary
</verify>
