---
description: Transfer Brainstorming to Bug Report Rules for Agent OS Extended
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Transfer and Create Bug Report Rules

## Overview

Transfer a brainstorming session about a bug into a formal bug report, validating completeness and filling gaps through interactive questionnaire.

<pre_flight_check>
  EXECUTE: @~/.agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="context-fetcher" name="session_retrieval">

### Step 1: Retrieve Bug Brainstorming Session

Use the context-fetcher subagent to find and analyze the relevant bug-related brainstorming session.

<session_discovery>
  SCAN agent-os/brainstorming/ for sessions
  FILTER by:
    - status: ready-for-bug OR active
    - type: bug OR general (with bug content)
  
  IF multiple_sessions_found:
    PRESENT numbered list with bug indicators
    WAIT for user selection
  ELSE IF single_session_found:
    CONFIRM: "Transfer bug session '[SESSION_ID]' to bug report?"
  ELSE IF no_sessions_found:
    INFORM: "No bug-related brainstorming sessions found"
    SUGGEST: "Use 'start-brainstorming' first"
    EXIT process
</session_discovery>

<session_analysis>
  READ selected session.md file
  EXTRACT bug-related content:
    - Problem description
    - Symptoms observed
    - Impact discussion
    - Reproduction attempts
    - Workarounds mentioned
    - Root cause theories
    - Solution ideas
  
  ASSESS completeness for bug report
</session_analysis>

</step>

<step number="2" name="bug_report_validation">

### Step 2: Validate Bug Information Completeness

Analyze brainstorming content against bug report requirements to identify gaps.

<required_elements>
  <bug_identification>
    - [ ] Clear bug title
    - [ ] Problem summary
    - [ ] First occurrence date/version
    - [ ] Frequency of occurrence
  </bug_identification>
  
  <reproduction_details>
    - [ ] Steps to reproduce
    - [ ] Expected behavior
    - [ ] Actual behavior
    - [ ] Error messages/logs
  </reproduction_details>
  
  <environment_info>
    - [ ] System/browser/device
    - [ ] Software version
    - [ ] User role/permissions
    - [ ] Related configurations
  </environment_info>
  
  <impact_assessment>
    - [ ] Users affected
    - [ ] Severity level
    - [ ] Business impact
    - [ ] Workaround availability
  </impact_assessment>
  
  <investigation_details>
    - [ ] Initial investigation done
    - [ ] Root cause hypotheses
    - [ ] Related issues/bugs
    - [ ] Solution proposals
  </investigation_details>
</required_elements>

<gap_analysis>
  FOR each required_element:
    IF found_in_brainstorming:
      MARK as complete
      EXTRACT relevant content
    ELSE:
      ADD to missing_information list
      PREPARE specific questions
</gap_analysis>

</step>

<step number="3" name="interactive_questionnaire">

### Step 3: Interactive Bug Details Collection

If gaps identified, conduct targeted questionnaire to gather missing bug information.

<questionnaire_intro>
  "I've analyzed your bug discussion about '[TOPIC]'.
  To create a complete bug report, I need some additional details:"
</questionnaire_intro>

<question_categories>
  <reproduction_questions>
    IF steps_to_reproduce_missing:
      ASK: "Can you provide exact steps to reproduce this bug?"
      ASK: "Does this happen every time or intermittently?"
      ASK: "What were you doing when you first encountered this?"
  </reproduction_questions>
  
  <behavior_questions>
    IF expected_vs_actual_unclear:
      ASK: "What should happen normally?"
      ASK: "What actually happens instead?"
      ASK: "Are there any error messages or unusual outputs?"
  </behavior_questions>
  
  <environment_questions>
    IF environment_unknown:
      ASK: "What browser/device/system are you using?"
      ASK: "What version of the software?"
      ASK: "Are there specific configurations or settings?"
  </environment_questions>
  
  <impact_questions>
    IF severity_undefined:
      ASK: "How many users are affected?"
      ASK: "Can users continue working despite this bug?"
      ASK: "What's the business impact?"
      ASK: "Is there a workaround available?"
  </impact_questions>
  
  <investigation_questions>
    IF root_cause_unclear:
      ASK: "Have you noticed any patterns?"
      ASK: "When did this start happening?"
      ASK: "Were there recent changes to the system?"
  </investigation_questions>
</question_categories>

<response_handling>
  FOR each question:
    PRESENT question contextually
    WAIT for user response
    IF response_needs_clarification:
      ASK specific follow-up
    CAPTURE detailed response
    UPDATE bug information model
</response_handling>

</step>

<step number="4" name="bug_information_preparation">

### Step 4: Prepare Information for Bug Report Generation

Prepare all gathered information in the format expected by create-bug command.

<information_preparation>
  <compile_bug_data>
    STRUCTURE information as:
      - bug_title: [FROM_BRAINSTORMING_TOPIC]
      - description: [FROM_DISCUSSION_AND_QUESTIONNAIRE]
      - reproduction_steps: [EXTRACTED_OR_GATHERED]
      - expected_behavior: [FROM_QUESTIONNAIRE]
      - actual_behavior: [FROM_DISCUSSION]
      - environment: [FROM_QUESTIONNAIRE]
      - severity: [ASSESSED_FROM_IMPACT]
      - workaround: [IF_DISCUSSED]
  </compile_bug_data>
  
  <add_transfer_metadata>
    - source: "brainstorming_transfer"
    - session_id: [SESSION_ID]
    - session_path: "agent-os/brainstorming/[SESSION_ID]/session.md"
    - transfer_date: [CURRENT_DATE]
    - gaps_filled: [LIST_OF_QUESTIONNAIRE_ITEMS]
    - investigation_notes: [FROM_BRAINSTORMING]
  </add_transfer_metadata>
</information_preparation>

</step>

<step number="5" name="execute_create_bug">

### Step 5: Execute Create-Bug Command

Use the existing create-bug command with the prepared information.

<command_execution>
  EXECUTE: @agent-os/workflows/core/create-bug.md
  
  WITH context:
    - Pre-filled bug details from brainstorming
    - Questionnaire responses for gaps
    - Skip redundant questions
    - Include transfer attribution
  
  MODIFICATIONS:
    - Add "Source" section with brainstorming reference
    - Include investigation theories from session
    - Preserve solution ideas discussed
</command_execution>

<bug_report_customization>
  ENSURE bug report includes:
    ## Source
    > Transferred from Brainstorming Session: [SESSION_ID]
    > Original Discussion: @agent-os/brainstorming/[SESSION_ID]/session.md
    > Transfer Date: [CURRENT_DATE]
    
    ## Additional Context from Brainstorming
    - Initial theories explored
    - Workarounds discovered
    - Solution ideas proposed
    - Questions resolved during transfer
</bug_report_customization>

</step>

<step number="7" subagent="file-creator" name="session_update">

### Step 7: Update Brainstorming Session

Use the file-creator subagent to update the original brainstorming session with transfer status.

<session_update>
  APPEND to original session.md:
  
  ---
  
  ## Transfer Complete
  
  **Transferred to Bug Report:** [YYYY-MM-DD]
  **Bug ID:** [BUG_ID]
  **Bug Report:** @agent-os/bugs/[BUG_FOLDER]/bug-report.md
  **Additional Information Gathered:** [YES/NO]
  **Status:** Transferred
  
  ### Information Added During Transfer
  - Reproduction steps: [REFINED/ADDED]
  - Environment details: [SPECIFIED]
  - Impact assessment: [COMPLETED]
  - [OTHER_ADDITIONS]
  
  ### Transfer Notes
  [ANY_IMPORTANT_NOTES]
</session_update>

</step>

<step number="8" name="user_confirmation">

### Step 8: Present Transfer Results

Provide comprehensive summary of the bug report creation.

<transfer_summary>
  ## Bug Report Successfully Created from Brainstorming
  
  **Bug ID:** [BUG_ID]
  **Original Session:** [SESSION_ID] - [TOPIC]
  **Severity:** [SEVERITY_LEVEL]
  
  ### Information Transfer Status
  ✅ Transferred from brainstorming: [X] items
  ✅ Gathered via questionnaire: [Y] items  
  ✅ Structured for investigation: [Z] aspects
  
  ### Created Structure
  - Bug Report: @agent-os/bugs/[BUG_FOLDER]/bug-report.md
  - Investigation: @agent-os/bugs/[BUG_FOLDER]/investigation/
  - Resolution: @agent-os/bugs/[BUG_FOLDER]/resolution/
  
  ### Key Information Captured
  - **Reproduction:** [STEPS_STATUS]
  - **Environment:** [DETAILS_STATUS]
  - **Impact:** [ASSESSMENT_STATUS]
  - **Investigation:** [NOTES_STATUS]
  
  ### Next Steps
  1. Review the bug report for accuracy
  2. Add any screenshots or logs if available
  3. Begin investigation using provided structure
  4. Update status as investigation progresses
  
  The bug report preserves all insights from your brainstorming while adding the structure needed for systematic resolution.
</transfer_summary>

</step>

</process_flow>

## Bug Transfer Quality Standards

<information_preservation>
  <maintain_context>
    - Keep all symptom descriptions
    - Preserve investigation attempts
    - Retain workaround discoveries
    - Document timeline of observations
  </maintain_context>
  
  <enhance_structure>
    - Organize symptoms systematically
    - Clarify reproduction steps
    - Quantify impact clearly
    - Structure investigation notes
  </enhance_structure>
  
  <ensure_actionability>
    - Clear reproduction steps
    - Specific environment details
    - Measurable success criteria
    - Defined investigation path
  </ensure_actionability>
</information_preservation>

<validation_criteria>
  <reproducibility>
    - Steps are specific and numbered
    - Prerequisites clearly stated
    - Expected vs actual documented
    - Frequency indicated
  </reproducibility>
  
  <completeness>
    - All required sections populated
    - Severity properly assessed
    - Impact clearly described
    - Investigation notes included
  </completeness>
  
  <clarity>
    - Title describes issue concisely
    - Summary captures essence
    - Technical details accurate
    - Business impact explained
  </clarity>
</validation_criteria>

<error_handling>
  <missing_critical_info>
    IF cannot_determine_reproduction_steps:
      WARN user about limitation
      CREATE draft with available info
      FLAG for follow-up testing
    
    IF severity_cannot_be_determined:
      DEFAULT to Medium
      NOTE need for impact assessment
      REQUEST user validation
  </missing_critical_info>
</error_handling>

<final_checklist>
  <verify>
    - [ ] Bug brainstorming session found
    - [ ] Bug information extracted
    - [ ] Gaps identified and addressed
    - [ ] Bug ID generated
    - [ ] Complete bug report created
    - [ ] Investigation structure setup
    - [ ] Original session updated
    - [ ] User informed of results
    - [ ] All cross-references established
  </verify>
</final_checklist>