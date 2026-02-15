---
description: Start Brainstorming Session Rules for Agent OS Extended
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Start Brainstorming Session Rules

## Overview

Initiate an interactive brainstorming session to explore feature ideas or bug solutions in a collaborative, unstructured format before creating formal specifications.

<pre_flight_check>
  EXECUTE: @~/.agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="date-checker" name="session_initialization">

### Step 1: Session Initialization

Use the date-checker subagent to establish session timestamp and create unique session identifier.

<session_setup>
  <identifier_format>YYYY-MM-DD-HH-MM-[topic-slug]</identifier_format>
  <session_metadata>
    - creation_timestamp: YYYY-MM-DD HH:MM:SS
    - session_type: feature|bug|general
    - status: active
    - participant: user
  </session_metadata>
</session_setup>

<user_prompt>
  ASK: "What would you like to brainstorm about today?"
  WAIT for user response
  DETERMINE session_type based on response:
    - Feature development → type: feature
    - Bug fixing → type: bug
    - General exploration → type: general
</user_prompt>

</step>

<step number="2" subagent="file-creator" name="session_file_creation">

### Step 2: Create Brainstorming Session File

Use the file-creator subagent to create the brainstorming session file in the designated directory.

<file_location>agent-os/brainstorming/[SESSION_ID]/session.md</file_location>

<initial_template>
  # Brainstorming Session: [TOPIC]
  
  > Session ID: [SESSION_ID]
  > Started: [TIMESTAMP]
  > Type: [SESSION_TYPE]
  > Status: Active
  
  ## Topic
  
  [USER_PROVIDED_TOPIC_DESCRIPTION]
  
  ## Discussion Thread
  
  ### Initial Thoughts
  **User:** [INITIAL_USER_INPUT]
  
  **Assistant:** [INITIAL_RESPONSE_AND_QUESTIONS]
  
  ---
  
  ## Ideas Explored
  
  _Ideas will be captured here as the discussion progresses_
  
  ## Key Decisions
  
  _Important decisions will be documented here_
  
  ## Action Items
  
  _Actionable items identified during brainstorming_
  
  ## Questions & Unknowns
  
  _Open questions that need resolution_
</initial_template>

</step>

<step number="3" name="interactive_brainstorming">

### Step 3: Interactive Brainstorming Process

Engage in collaborative exploration with the user, capturing all ideas and refining concepts.

<brainstorming_guidelines>
  <conversation_style>
    - Be exploratory and open-ended
    - Ask probing questions to deepen understanding
    - Suggest alternatives and variations
    - Challenge assumptions constructively
    - Build on user's ideas
  </conversation_style>
  
  <capture_strategy>
    AFTER each exchange:
      UPDATE session.md with:
        - New ideas discussed
        - Decisions made
        - Questions raised
        - Action items identified
      
    ORGANIZE content into:
      - Main concepts
      - Implementation approaches
      - Potential challenges
      - Alternative solutions
  </capture_strategy>
  
  <progressive_refinement>
    AS discussion evolves:
      - Identify patterns and themes
      - Group related ideas
      - Highlight consensus points
      - Note areas needing clarification
      - Suggest next exploration areas
  </progressive_refinement>
</brainstorming_guidelines>

<question_prompts>
  <for_features>
    - "What problem does this feature solve?"
    - "Who are the primary users?"
    - "What's the core functionality?"
    - "Are there existing similar features?"
    - "What are the success criteria?"
    - "What constraints should we consider?"
  </for_features>
  
  <for_bugs>
    - "When did you first notice this issue?"
    - "What were you trying to accomplish?"
    - "How frequently does it occur?"
    - "What's the impact on users?"
    - "Have you found any workarounds?"
    - "What would ideal behavior look like?"
  </for_bugs>
  
  <general_exploration>
    - "What's the main goal here?"
    - "What alternatives have you considered?"
    - "What are the must-haves vs nice-to-haves?"
    - "What risks or challenges do you foresee?"
    - "How does this fit with existing functionality?"
  </general_exploration>
</question_prompts>

</step>

<step number="4" name="idea_synthesis">

### Step 4: Synthesize and Structure Ideas

Periodically synthesize the discussion into structured insights.

<synthesis_triggers>
  PERFORM synthesis when:
    - User asks for summary
    - Significant milestone reached
    - Direction change needed
    - 10+ ideas accumulated
    - Preparing for session end
</synthesis_triggers>

<synthesis_format>
  ## Synthesis [TIMESTAMP]
  
  ### Core Concept
  [MAIN_IDEA_CRYSTALLIZED]
  
  ### Key Components
  1. [COMPONENT_1]: [DESCRIPTION]
  2. [COMPONENT_2]: [DESCRIPTION]
  
  ### Implementation Approach
  [PROPOSED_APPROACH]
  
  ### Open Questions
  - [UNRESOLVED_QUESTION_1]
  - [UNRESOLVED_QUESTION_2]
  
  ### Next Steps
  - [SUGGESTED_ACTION_1]
  - [SUGGESTED_ACTION_2]
</synthesis_format>

</step>

<step number="5" name="plan_development">

### Step 5: Develop Actionable Plan

When ideas mature, help structure them into an actionable plan.

<plan_triggers>
  DEVELOP plan when:
    - User requests plan creation
    - Ideas sufficiently explored
    - Clear direction emerged
    - Session nearing completion
</plan_triggers>

<plan_structure>
  ## Action Plan
  
  ### Objective
  [CLEAR_STATEMENT_OF_GOAL]
  
  ### Scope
  **Included:**
  - [IN_SCOPE_ITEM_1]
  - [IN_SCOPE_ITEM_2]
  
  **Excluded:**
  - [OUT_OF_SCOPE_ITEM_1]
  
  ### Implementation Strategy
  1. [PHASE_1]: [DESCRIPTION]
  2. [PHASE_2]: [DESCRIPTION]
  
  ### Success Metrics
  - [METRIC_1]: [TARGET]
  - [METRIC_2]: [TARGET]
  
  ### Required Information
  _For spec/bug creation:_
  - [x] Problem statement defined
  - [x] User impact clarified
  - [ ] Technical approach outlined
  - [ ] Dependencies identified
  - [ ] Testing strategy considered
</plan_structure>

<readiness_assessment>
  EVALUATE if ready for:
    - transfer-and-create-spec
    - transfer-and-create-bug
    - continued brainstorming
    - parking for later
</readiness_assessment>

</step>

<step number="6" subagent="file-creator" name="session_finalization">

### Step 6: Finalize Brainstorming Session

Use the file-creator subagent to update session status and create summary.

<finalization_options>
  <continue_later>
    STATUS: paused
    ADD note about next discussion points
    PRESERVE all context for resumption
  </continue_later>
  
  <ready_for_transfer>
    STATUS: ready-for-spec|ready-for-bug
    HIGHLIGHT key decisions
    FLAG information gaps
    PREPARE for transfer command
  </ready_for_transfer>
  
  <completed>
    STATUS: completed
    CREATE executive summary
    DOCUMENT all decisions
    ARCHIVE for reference
  </completed>
</finalization_options>

<session_summary>
  ## Session Summary
  
  **Duration:** [START_TIME] - [END_TIME]
  **Ideas Generated:** [COUNT]
  **Key Decisions:** [COUNT]
  **Next Actions:** [LIST]
  
  ### Main Outcome
  [BRIEF_DESCRIPTION_OF_SESSION_RESULT]
  
  ### Ready for Transfer
  - [ ] Feature Spec (use: transfer-and-create-spec)
  - [ ] Bug Report (use: transfer-and-create-bug)
  - [ ] Needs more brainstorming
  
  ### Session Notes
  [ANY_ADDITIONAL_CONTEXT_OR_NOTES]
</session_summary>

</step>

</process_flow>

## Brainstorming Best Practices

<facilitation_techniques>
  <idea_generation>
    - Use "Yes, and..." approach
    - Build on partial ideas
    - Explore tangents briefly
    - Capture everything initially
    - Defer judgment during ideation
  </idea_generation>
  
  <clarification>
    - Ask specific examples
    - Request user stories
    - Explore edge cases
    - Identify constraints
    - Validate understanding
  </clarification>
  
  <organization>
    - Group related concepts
    - Identify themes
    - Note dependencies
    - Track decisions
    - Maintain context
  </organization>
</facilitation_techniques>

<session_management>
  <active_listening>
    - Reflect user's ideas back
    - Ask follow-up questions
    - Validate understanding
    - Summarize periodically
  </active_listening>
  
  <documentation>
    - Capture ideas verbatim first
    - Synthesize after exploration
    - Note context and rationale
    - Track evolution of ideas
  </documentation>
  
  <progression>
    - Start broad, narrow focus
    - Move from problem to solution
    - Identify concrete next steps
    - Ensure actionable outcomes
  </progression>
</session_management>

<final_checklist>
  <verify>
    - [ ] Session file created with unique ID
    - [ ] All ideas captured in discussion thread
    - [ ] Key decisions documented
    - [ ] Questions and unknowns listed
    - [ ] Action plan developed (if applicable)
    - [ ] Session status updated
    - [ ] Summary created
    - [ ] Transfer readiness assessed
  </verify>
</final_checklist>