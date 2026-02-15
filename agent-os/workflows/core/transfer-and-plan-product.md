---
description: Transfer Brainstorming to Product Planning Rules for Agent OS
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Transfer Brainstorming to Product Planning Rules

## Overview

Transfer a completed brainstorming session into comprehensive product planning documentation, validating completeness and filling gaps through interactive questionnaire before delegating to the plan-product command.

<pre_flight_check>
  EXECUTE: @~/.agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="context-fetcher" name="session_retrieval">

### Step 1: Retrieve Brainstorming Session

Use the context-fetcher subagent to find and analyze the relevant brainstorming session containing product planning ideas.

<session_discovery>
  SCAN agent-os/brainstorming/ for sessions
  IF multiple_sessions_found:
    FILTER by content: product concepts, business ideas, startup plans
    PRESENT numbered list to user
    WAIT for selection
  ELSE IF single_session_found:
    CONFIRM with user: "Transfer session '[SESSION_ID]' to product plan?"
  ELSE IF no_sessions_found:
    INFORM user: "No brainstorming sessions found"
    SUGGEST: "Use 'start-brainstorming' first to develop product ideas"
    EXIT process
</session_discovery>

<session_analysis>
  READ selected session.md file
  EXTRACT:
    - Product concept and vision
    - Target market and users
    - Key features and capabilities
    - Technical considerations
    - Business model hints
    - Competitive landscape
    - Success metrics ideas
  
  ASSESS completeness for product planning
</session_analysis>

</step>

<step number="2" name="completeness_validation">

### Step 2: Validate Information Completeness

Analyze brainstorming content against product planning requirements to identify gaps.

<required_elements>
  <product_mission>
    - [ ] Main idea and elevator pitch
    - [ ] Target users and personas (minimum 1)
    - [ ] Problems being solved
    - [ ] Key differentiators (minimum 2)
    - [ ] Feature list (minimum 3)
  </product_mission>
  
  <technical_stack>
    - [ ] Application framework preference
    - [ ] Database system choice
    - [ ] Frontend technology stack
    - [ ] Hosting and deployment preferences
    - [ ] Development tools and libraries
  </technical_stack>
  
  <development_roadmap>
    - [ ] Development phases (1-3 phases)
    - [ ] Feature prioritization
    - [ ] Dependencies and blockers
    - [ ] Timeline estimates
  </development_roadmap>
  
  <project_setup>
    - [ ] Project initialization status
    - [ ] Code repository setup
    - [ ] Development environment
  </project_setup>
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
  To create a complete product plan, I need clarification on a few points:"
</questionnaire_intro>

<question_categories>
  <product_clarification>
    IF mission_elements_incomplete:
      ASK: "Can you describe your product in one elevator pitch sentence?"
      ASK: "Who is your primary target user?"
      ASK: "What are the 3 key features that make your product unique?"
      ASK: "What main problems does your product solve?"
  </product_clarification>
  
  <technical_requirements>
    IF tech_stack_missing:
      ASK: "Do you have preferences for programming language or framework?"
      ASK: "What type of database do you prefer (SQL/NoSQL)?"
      ASK: "Where do you plan to host/deploy the application?"
      ASK: "Are there specific technical constraints to consider?"
  </technical_requirements>
  
  <project_context>
    IF project_setup_unclear:
      ASK: "Have you already initialized a new project, or should I help plan that too?"
      ASK: "Are we inside the project folder already?"
      ASK: "Do you have a preferred code repository setup?"
  </project_context>
  
  <development_approach>
    IF roadmap_undefined:
      ASK: "What features are most critical for the MVP?"
      ASK: "How would you prioritize the features we discussed?"
      ASK: "Are there any dependencies between features?"
  </development_approach>
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

<step number="4" name="product_planning_preparation">

### Step 4: Prepare Information for Product Planning

Prepare all gathered information in the format expected by plan-product command.

<information_preparation>
  <compile_product_data>
    STRUCTURE information as:
      - main_idea: [FROM_BRAINSTORMING_CONCEPT]
      - key_features: [EXTRACTED_AND_GATHERED_FEATURES]
      - target_users: [FROM_DISCUSSION_AND_QUESTIONNAIRE]
      - tech_stack_preferences: [FROM_TECHNICAL_QUESTIONS]
      - project_status: [NEW_OR_EXISTING_PROJECT]
  </compile_product_data>
  
  <add_transfer_metadata>
    - source: "brainstorming_transfer"
    - session_id: [SESSION_ID]
    - session_path: "agent-os/brainstorming/[SESSION_ID]/session.md"
    - transfer_date: [CURRENT_DATE]
    - gaps_filled: [LIST_OF_QUESTIONNAIRE_ITEMS]
  </add_transfer_metadata>
</information_preparation>

</step>

<step number="5" name="execute_plan_product">

### Step 5: Execute Plan-Product Command

Use the existing plan-product command with the prepared information.

<command_execution>
  EXECUTE: @agent-os/workflows/core/plan-product.md
  
  WITH context:
    - Pre-filled answers from brainstorming
    - Questionnaire responses
    - Skip redundant questions already answered
    - Include transfer attribution in all documents
  
  MODIFICATIONS:
    - Add "Origin" section with brainstorming reference to mission.md
    - Include brainstorming insights in decisions.md
    - Reference original discussion in all generated files
</command_execution>

<product_docs_customization>
  ENSURE all generated docs include:
    ## Origin
    > Transferred from Brainstorming Session: [SESSION_ID]
    > Original Discussion: @agent-os/brainstorming/[SESSION_ID]/session.md
    > Transfer Date: [CURRENT_DATE]
    
    ## Notes from Brainstorming
    - Key insights from original discussion
    - Alternative approaches considered
    - Questions resolved during transfer
</product_docs_customization>

</step>

<step number="6" subagent="file-creator" name="session_update">

### Step 6: Update Brainstorming Session

Use the file-creator subagent to update the original brainstorming session with transfer status.

<session_update>
  APPEND to original session.md:
  
  ---
  
  ## Transfer Complete
  
  **Transferred to Product Plan:** [YYYY-MM-DD]
  **Product Docs Location:** @agent-os/product/
  **Additional Information Gathered:** [YES/NO]
  **Status:** Transferred
  
  ### Information Added During Transfer
  [LIST_ANY_QUESTIONNAIRE_RESPONSES]
  
  ### Created Files
  - Mission: @agent-os/product/mission.md
  - Tech Stack: @agent-os/product/tech-stack.md
  - Roadmap: @agent-os/product/roadmap.md
  - Decisions: @agent-os/product/decisions.md
  - Mission Lite: @agent-os/product/mission-lite.md
  
  ### Notes
  [ANY_TRANSFER_NOTES]
</session_update>

</step>

<step number="7" name="user_confirmation">

### Step 7: Present Results to User

Provide summary of the transfer and product planning completion.

<transfer_summary>
  ## Brainstorming Successfully Transferred to Product Plan
  
  **Original Session:** [SESSION_ID] - [TOPIC]
  **Product Documentation Created:** Complete product planning suite
  
  ### Information Status
  ✅ Transferred from brainstorming: [X] items
  ✅ Gathered via questionnaire: [Y] items
  ✅ Generated with defaults: [Z] items
  
  ### Created Files
  - Product Mission: @agent-os/product/mission.md
  - Mission Summary: @agent-os/product/mission-lite.md
  - Technical Stack: @agent-os/product/tech-stack.md
  - Development Roadmap: @agent-os/product/roadmap.md
  - Decision Log: @agent-os/product/decisions.md
  
  ### Next Steps
  1. Review the generated product documentation for accuracy
  2. Refine technical choices if needed
  3. Begin feature development using create-spec
  4. Set up development environment if new project
  
  Your product plan captures all ideas from the brainstorming session plus the additional details we clarified.
</transfer_summary>

</step>

</process_flow>

## Transfer Quality Standards

<information_integrity>
  <preservation>
    - Maintain original context from brainstorming
    - Keep decision rationale from session
    - Preserve alternative ideas discussed
    - Document evolution of thinking
  </preservation>
  
  <enhancement>
    - Add structure to brainstormed ideas
    - Clarify ambiguities through questionnaire
    - Fill identified gaps with user input
    - Ensure completeness for product planning
  </enhancement>
  
  <traceability>
    - Link to original brainstorming session
    - Note information sources in all docs
    - Track questionnaire additions
    - Maintain audit trail
  </traceability>
</information_integrity>

<validation_rules>
  <completeness_check>
    - All required product planning elements populated
    - No critical information missing
    - Dependencies identified
    - Success criteria defined
  </completeness_check>
  
  <consistency_check>
    - No contradictions with brainstorming content
    - Questionnaire answers properly integrated
    - Technical details align across documents
    - Scope clearly defined in all files
  </consistency_check>
</validation_rules>

<final_checklist>
  <verify>
    - [ ] Brainstorming session found and analyzed
    - [ ] Information gaps identified
    - [ ] Questionnaire conducted if needed
    - [ ] Complete product plan generated via plan-product
    - [ ] All 5 product files created with transfer attribution
    - [ ] Original session updated with transfer status
    - [ ] User informed of results
    - [ ] All files properly linked and referenced
  </verify>
</final_checklist>