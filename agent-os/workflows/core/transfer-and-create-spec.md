---
description: Transfer Brainstorming to Spec Rules for Agent OS Extended
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Transfer and Create Spec Rules

## Overview

Transfer a completed brainstorming session into a formal feature specification, validating completeness and filling gaps through interactive questionnaire.

<pre_flight_check>
  EXECUTE: @~/.agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="context-fetcher" name="session_retrieval">

### Step 1: Retrieve Brainstorming Session

Use the context-fetcher subagent to find and analyze the relevant brainstorming session.

<session_discovery>
  SCAN agent-os/brainstorming/ for sessions
  IF multiple_sessions_found:
    FILTER by status: ready-for-spec OR active
    PRESENT numbered list to user
    WAIT for selection
  ELSE IF single_session_found:
    CONFIRM with user: "Transfer session '[SESSION_ID]' to spec?"
  ELSE IF no_sessions_found:
    INFORM user: "No brainstorming sessions found"
    SUGGEST: "Use 'start-brainstorming' first"
    EXIT process
</session_discovery>

<session_analysis>
  READ selected session.md file
  EXTRACT:
    - Topic and objective
    - Key decisions made
    - Action plan (if exists)
    - Ideas explored
    - Questions and unknowns
    - Technical discussions
  
  ASSESS completeness for spec creation
</session_analysis>

</step>

<step number="2" name="completeness_validation">

### Step 2: Validate Information Completeness

Analyze brainstorming content against spec requirements to identify gaps.

<required_elements>
  <problem_definition>
    - [ ] Clear problem statement
    - [ ] User pain points identified
    - [ ] Current limitations described
    - [ ] Success criteria defined
  </problem_definition>
  
  <solution_design>
    - [ ] Core functionality outlined
    - [ ] User flow described
    - [ ] Technical approach suggested
    - [ ] Integration points identified
  </solution_design>
  
  <scope_definition>
    - [ ] Features included specified
    - [ ] Features excluded specified
    - [ ] MVP vs future phases
    - [ ] Dependencies identified
  </scope_definition>
  
  <technical_details>
    - [ ] Architecture considerations
    - [ ] Data requirements
    - [ ] Performance expectations
    - [ ] Security requirements
  </technical_details>
  
  <validation_criteria>
    - [ ] Testing approach
    - [ ] Acceptance criteria
    - [ ] Success metrics
    - [ ] Risk assessment
  </validation_criteria>
</required_elements>

<gap_analysis>
  FOR each required_element:
    IF found_in_brainstorming:
      MARK as complete
      EXTRACT relevant content
    ELSE:
      ADD to missing_information list
      PREPARE targeted questions
</gap_analysis>

</step>

<step number="3" name="interactive_questionnaire">

### Step 3: Interactive Gap Filling

If gaps identified, conduct interactive questionnaire to gather missing information.

<questionnaire_intro>
  "I've analyzed your brainstorming session for '[TOPIC]'. 
  To create a complete spec, I need clarification on a few points:"
</questionnaire_intro>

<question_categories>
  <problem_clarification>
    IF problem_statement_incomplete:
      ASK: "Can you describe the specific problem this feature solves?"
      ASK: "Who experiences this problem most acutely?"
      ASK: "What's the impact of not solving this?"
  </problem_clarification>
  
  <solution_details>
    IF functionality_unclear:
      ASK: "What are the must-have capabilities for the MVP?"
      ASK: "How do you envision users interacting with this feature?"
      ASK: "Are there any existing tools that work similarly?"
  </solution_details>
  
  <technical_requirements>
    IF technical_approach_missing:
      ASK: "Are there specific technical constraints to consider?"
      ASK: "What systems need to integrate with this feature?"
      ASK: "What performance expectations do you have?"
  </technical_requirements>
  
  <validation_approach>
    IF testing_undefined:
      ASK: "How will we know this feature is successful?"
      ASK: "What are the key user scenarios to test?"
      ASK: "What metrics should we track?"
  </validation_approach>
</question_categories>

<response_handling>
  FOR each question:
    PRESENT question clearly
    WAIT for user response
    IF response_unclear:
      ASK follow-up for clarification
    CAPTURE response in context
    UPDATE information model
</response_handling>

</step>

<step number="4" name="spec_generation_preparation">

### Step 4: Prepare Information for Spec Generation

Prepare all gathered information in the format expected by create-spec command.

<information_preparation>
  <compile_spec_data>
    STRUCTURE information as:
      - feature_name: [FROM_BRAINSTORMING_TOPIC]
      - problem_statement: [FROM_DISCUSSION_AND_QUESTIONNAIRE]
      - proposed_solution: [FROM_ACTION_PLAN]
      - user_stories: [EXTRACTED_OR_GATHERED]
      - technical_approach: [FROM_DISCUSSION]
      - scope: [MVP_AND_EXCLUSIONS]
      - success_criteria: [FROM_QUESTIONNAIRE]
  </compile_spec_data>
  
  <add_transfer_metadata>
    - source: "brainstorming_transfer"
    - session_id: [SESSION_ID]
    - session_path: "agent-os/brainstorming/[SESSION_ID]/session.md"
    - transfer_date: [CURRENT_DATE]
    - gaps_filled: [LIST_OF_QUESTIONNAIRE_ITEMS]
  </add_transfer_metadata>
</information_preparation>

</step>

<step number="5" name="execute_create_spec">

### Step 5: Execute Create-Spec Command

Use the existing create-spec command with the prepared information.

<command_execution>
  EXECUTE: @agent-os/workflows/core/create-spec.md
  
  WITH context:
    - Pre-filled answers from brainstorming
    - Questionnaire responses
    - Skip redundant questions
    - Include transfer attribution
  
  MODIFICATIONS:
    - Add "Origin" section with brainstorming reference
    - Preserve key decisions from session
    - Include alternative approaches discussed
</command_execution>

<spec_customization>
  ENSURE spec includes:
    ## Origin
    > Transferred from Brainstorming Session: [SESSION_ID]
    > Original Discussion: @agent-os/brainstorming/[SESSION_ID]/session.md
    > Transfer Date: [CURRENT_DATE]
    
    ## Notes from Brainstorming
    - Key decisions made during discussion
    - Alternative approaches considered
    - Questions resolved during transfer
</spec_customization>

</step>

<step number="7" subagent="file-creator" name="session_update">

### Step 7: Update Brainstorming Session

Use the file-creator subagent to update the original brainstorming session with transfer status.

<session_update>
  APPEND to original session.md:
  
  ---
  
  ## Transfer Complete
  
  **Transferred to Spec:** [YYYY-MM-DD]
  **Spec Location:** @agent-os/specs/[SPEC_ID]/spec.md
  **Additional Information Gathered:** [YES/NO]
  **Status:** Transferred
  
  ### Information Added During Transfer
  [LIST_ANY_QUESTIONNAIRE_RESPONSES]
  
  ### Notes
  [ANY_TRANSFER_NOTES]
</session_update>

</step>

<step number="8" name="user_confirmation">

### Step 8: Present Results to User

Provide summary of the transfer and spec creation.

<transfer_summary>
  ## Brainstorming Successfully Transferred to Spec
  
  **Original Session:** [SESSION_ID] - [TOPIC]
  **New Spec:** [SPEC_ID] - [FEATURE_NAME]
  
  ### Information Status
  ✅ Transferred from brainstorming: [X] items
  ✅ Gathered via questionnaire: [Y] items
  ✅ Inferred from context: [Z] items
  
  ### Created Files
  - Specification: @agent-os/specs/[SPEC_ID]/spec.md
  - Quick Reference: @agent-os/specs/[SPEC_ID]/spec-lite.md
  - Implementation Tasks: @agent-os/specs/[SPEC_ID]/tasks.md
  
  ### Next Steps
  1. Review the generated spec for accuracy
  2. Refine tasks if needed
  3. Begin implementation when ready
  
  The spec captures all ideas from your brainstorming session plus the additional details we clarified.
</transfer_summary>

</step>

</process_flow>

## Transfer Quality Standards

<information_integrity>
  <preservation>
    - Maintain original context
    - Keep decision rationale
    - Preserve alternative ideas
    - Document evolution of thinking
  </preservation>
  
  <enhancement>
    - Add structure to ideas
    - Clarify ambiguities
    - Fill identified gaps
    - Ensure completeness
  </enhancement>
  
  <traceability>
    - Link to original session
    - Note information sources
    - Track questionnaire additions
    - Maintain audit trail
  </traceability>
</information_integrity>

<validation_rules>
  <completeness_check>
    - All required spec sections populated
    - No critical information missing
    - Dependencies identified
    - Success criteria defined
  </completeness_check>
  
  <consistency_check>
    - No contradictions with brainstorming
    - Questionnaire answers integrated
    - Technical details align
    - Scope clearly defined
  </consistency_check>
</validation_rules>

<final_checklist>
  <verify>
    - [ ] Brainstorming session found and analyzed
    - [ ] Information gaps identified
    - [ ] Questionnaire conducted if needed
    - [ ] Complete spec generated
    - [ ] Spec-lite created
    - [ ] Tasks generated
    - [ ] Original session updated
    - [ ] User informed of results
    - [ ] All files properly linked
  </verify>
</final_checklist>