---
description: Retroactive Feature Documentation Rules for Agent OS Extended
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Retroactive Feature Documentation Rules

## Overview

Create comprehensive documentation for existing implemented features that lack formal specifications, through code analysis and interactive feature discovery.

<pre_flight_check>
  EXECUTE: @~/.agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="context-fetcher" name="codebase_analysis">

### Step 1: Codebase Analysis

Use the context-fetcher subagent to analyze the existing codebase and identify implemented features that lack documentation.

<analysis_strategy>
  <code_scanning>
    - UI components and pages
    - API endpoints and controllers
    - Database models and schemas
    - Service modules and utilities
    - Configuration files
  </code_scanning>
  <discovery_patterns>
    - React/Vue components in src/components/
    - Route definitions in routing files
    - API endpoints in controllers/routes
    - Database migrations and models
    - Feature-related directories
  </discovery_patterns>
</analysis_strategy>

<scanning_approach>
  <file_structure>
    USE: Glob tool to identify key directories and file patterns
    FOCUS: src/, components/, pages/, api/, routes/, models/
  </file_structure>
  <content_analysis>
    USE: Grep tool to find feature indicators
    PATTERNS: component names, route paths, API endpoints, model definitions
  </content_analysis>
</scanning_approach>

</step>

<step number="2" subagent="context-fetcher" name="feature_discovery">

### Step 2: Feature Discovery & Categorization

Use the context-fetcher subagent to group discovered code elements into logical features and present them to the user.

<feature_identification>
  <grouping_logic>
    - UI components that work together
    - API endpoints serving related functionality
    - Database models for the same domain
    - Services handling related business logic
  </grouping_logic>
  <categorization>
    - core_features: Primary application functionality
    - supporting_features: Utilities and helpers
    - integration_features: Third-party integrations
    - admin_features: Administrative functionality
  </categorization>
</feature_identification>

<presentation_format>
  <feature_list>
    Present discovered features as numbered list:
    1. **[Feature Name]** - [Brief Description]
       - Components: [component1.js, component2.js]
       - API: [/api/endpoint1, /api/endpoint2]
       - Models: [Model1, Model2]
    2. **[Feature Name]** - [Brief Description]
       - [Related Elements]
  </feature_list>
</presentation_format>

<user_interaction>
  PRESENT: "I've discovered these implemented features in your codebase:"
  LIST: All identified features with their components
  ASK: "Which feature would you like to document? (Enter number or describe a different feature I may have missed)"
  WAIT: For user selection or feature description
</user_interaction>

</step>

<step number="3" subagent="context-fetcher" name="feature_analysis">

### Step 3: Deep Feature Analysis

Use the context-fetcher subagent to thoroughly analyze the selected feature's implementation.

<implementation_analysis>
  <code_examination>
    READ: All files related to the selected feature
    ANALYZE: Implementation patterns and logic
    IDENTIFY: Entry points, data flow, user interactions
  </code_examination>
  <functionality_mapping>
    - user_actions: What can users do?
    - data_processing: How is data handled?
    - business_logic: What rules are implemented?
    - integrations: What external systems are used?
  </functionality_mapping>
</implementation_analysis>

<analysis_output>
  <feature_summary>
    - primary_purpose: What this feature accomplishes
    - user_benefit: Value provided to end users
    - technical_approach: How it's implemented
    - dependencies: Required systems/libraries
  </feature_summary>
</analysis_output>

</step>

<step number="4" name="interactive_discovery">

### Step 4: Interactive Feature Discovery

Conduct an interactive session with the user to understand the feature's purpose, scope, and business context.

<discovery_questions>
  <purpose_questions>
    1. "What problem does this feature solve for your users?"
    2. "What was the main business requirement that led to this feature?"
    3. "Who are the primary users of this functionality?"
  </purpose_questions>
  <scope_questions>
    4. "What are the main things users can do with this feature?"
    5. "Are there any parts of the implementation that should be considered separate sub-features?"
    6. "What functionality is intentionally NOT included in this feature?"
  </scope_questions>
  <context_questions>
    7. "How does this feature integrate with other parts of your application?"
    8. "Are there any important limitations or known issues users should be aware of?"
    9. "What would you consider the most important benefits this feature provides?"
  </context_questions>
</discovery_questions>

<questioning_approach>
  ASK: Questions one at a time
  WAIT: For detailed responses
  CLARIFY: Any unclear or incomplete answers
  SYNTHESIZE: Responses into comprehensive feature understanding
</questioning_approach>

</step>

<step number="5" subagent="date-checker" name="date_determination">

### Step 5: Date Determination

Use the date-checker subagent to determine the current date in YYYY-MM-DD format for spec folder creation.

<date_usage>
  <purpose>create retrospective spec folder</purpose>
  <format>YYYY-MM-DD-feature-name</format>
  <naming_convention>mark as retroactive with "retro-" prefix</naming_convention>
</date_usage>

<folder_naming>
  <format>YYYY-MM-DD-retro-feature-name</format>
  <example>2025-08-13-retro-user-authentication</example>
  <rationale>distinguish retroactive documentation from forward-planned specs</rationale>
</folder_naming>

</step>

<step number="6" subagent="file-creator" name="retroactive_spec_creation">

### Step 6: Retroactive Spec Creation

Use the file-creator subagent to create a retroactive specification folder and files based on the analyzed implementation.

<folder_structure>
  <main_folder>.agent-os/specs/YYYY-MM-DD-retro-feature-name/</main_folder>
  <required_files>
    - spec.md (retroactive specification)
    - spec-lite.md (condensed summary)
    - technical-spec.md (implementation documentation)
    - retro-notes.md (retroactive documentation notes)
  </required_files>
</folder_structure>

<spec_template>
  <header>
    # Retroactive Spec: [FEATURE_NAME]
    
    > Retroactive Documentation
    > Feature: [FEATURE_NAME]
    > Created: [CURRENT_DATE]
    > Status: Already Implemented
  </header>
  
  <required_sections>
    - Overview
    - Implementation Analysis
    - User Stories (Reconstructed)
    - Feature Scope (Current)
    - Technical Implementation
    - Integration Points
  </required_sections>
</spec_template>

<overview_section>
  <template>
    ## Overview
    
    [PURPOSE_AND_VALUE_FROM_USER_INTERVIEW]
    
    This feature was reverse-engineered from existing implementation to provide comprehensive documentation.
  </template>
  <content_source>user interview responses and code analysis</content_source>
</overview_section>

<implementation_analysis_section>
  <template>
    ## Implementation Analysis
    
    ### Current Implementation
    - **Entry Points**: [UI_COMPONENTS_OR_API_ENDPOINTS]
    - **Core Logic**: [MAIN_BUSINESS_LOGIC_LOCATION]
    - **Data Layer**: [DATABASE_MODELS_OR_DATA_SOURCES]
    - **Dependencies**: [EXTERNAL_LIBRARIES_OR_SERVICES]
    
    ### Architecture Pattern
    [DESCRIPTION_OF_IMPLEMENTATION_APPROACH]
  </template>
  <content_source>code analysis from step 3</content_source>
</implementation_analysis_section>

<user_stories_section>
  <template>
    ## User Stories (Reconstructed)
    
    ### [PRIMARY_USER_STORY]
    As a [USER_TYPE], I want to [ACTION], so that [BENEFIT].
    
    **Current Implementation:** [HOW_THIS_IS_CURRENTLY_IMPLEMENTED]
    
    ### [SECONDARY_USER_STORY]
    As a [USER_TYPE], I want to [ACTION], so that [BENEFIT].
    
    **Current Implementation:** [HOW_THIS_IS_CURRENTLY_IMPLEMENTED]
  </template>
  <story_derivation>
    - analyze user interactions from code
    - combine with user interview responses
    - focus on actual implemented functionality
  </story_derivation>
</user_stories_section>

<feature_scope_section>
  <template>
    ## Feature Scope (Current)
    
    ### Implemented Functionality
    1. **[FUNCTION_1]** - [DESCRIPTION_AND_LOCATION]
    2. **[FUNCTION_2]** - [DESCRIPTION_AND_LOCATION]
    
    ### Integration Points
    - **[INTEGRATION_1]**: [HOW_IT_CONNECTS]
    - **[INTEGRATION_2]**: [HOW_IT_CONNECTS]
    
    ### Known Limitations
    - [LIMITATION_1]: [DESCRIPTION_AND_IMPACT]
  </template>
  <scope_definition>based on actual implementation, not planned features</scope_definition>
</feature_scope_section>

</step>

<step number="7" subagent="file-creator" name="create_retro_notes">

### Step 7: Create Retroactive Documentation Notes

Use the file-creator subagent to create a special notes file documenting the retroactive documentation process.

<retro_notes_template>
  <header>
    # Retroactive Documentation Notes
    
    > Documentation Process Record
    > Feature: [FEATURE_NAME]
    > Documented: [CURRENT_DATE]
  </header>
  
  <documentation_process>
    ## Documentation Process
    
    ### Discovery Method
    - **Code Analysis**: [BRIEF_DESCRIPTION_OF_ANALYSIS]
    - **User Interview**: [SUMMARY_OF_INTERVIEW_INSIGHTS]
    - **Implementation Review**: [KEY_IMPLEMENTATION_FINDINGS]
    
    ### Key Insights
    - [INSIGHT_1]: [DESCRIPTION]
    - [INSIGHT_2]: [DESCRIPTION]
    
    ### Documentation Challenges
    - [CHALLENGE_1]: [HOW_ADDRESSED]
    - [CHALLENGE_2]: [HOW_ADDRESSED]
    
    ### Recommendations for Future
    - [RECOMMENDATION_1]
    - [RECOMMENDATION_2]
  </documentation_process>
</retro_notes_template>

<notes_purpose>
  <record_keeping>document the retroactive process for future reference</record_keeping>
  <knowledge_capture>preserve insights that might be lost</knowledge_capture>
  <process_improvement>identify patterns for better retroactive documentation</process_improvement>
</notes_purpose>

</step>

<step number="8" name="documentation_structure_planning">

### Step 8: Documentation Structure Planning

Determine the optimal structure for user-facing documentation based on feature complexity and relationships.

<structure_assessment>
  <complexity_factors>
    - number of distinct user workflows
    - integration with other features
    - technical complexity for end users
    - logical grouping of functionality
  </complexity_factors>
  
  <structure_decision>
    IF feature_has_multiple_distinct_user_workflows:
      PLAN hierarchical structure with main feature.md + sub-features/
    ELSE IF feature_integrates_heavily_with_others:
      PLAN single feature.md with strong cross-references
    ELSE:
      PLAN single comprehensive feature.md
  </structure_decision>
</structure_assessment>

<documentation_planning>
  <user_perspective>
    - focus on what users can accomplish
    - emphasize practical benefits and outcomes
    - organize by user goals, not technical structure
  </user_perspective>
  <integration_context>
    - document how feature fits into larger workflows
    - explain relationships with other documented features
    - provide clear navigation paths
  </integration_context>
</documentation_planning>

</step>

<step number="9" subagent="file-creator" name="create_user_documentation">

### Step 9: Create User Documentation

Use the file-creator subagent to create comprehensive user-facing documentation in the .agent-os/docs/ structure.

<docs_structure_creation>
  <directory_setup>
    CREATE: .agent-os/docs/[FEATURE_NAME]/
    CREATE: .agent-os/docs/[FEATURE_NAME]/sub-features/ (if hierarchical)
  </directory_setup>
</docs_structure_creation>

<main_documentation_template>
  <header>
    # [FEATURE_NAME]
    
    > User Documentation
    > Last Updated: [CURRENT_DATE]
    > Status: Retroactively Documented
  </header>
  
  <user_focused_sections>
    - What This Feature Does
    - How to Use It
    - Key Benefits
    - Step-by-Step Guide
    - Examples and Use Cases
    - Integration with Other Features
    - Troubleshooting (if applicable)
  </user_focused_sections>
</main_documentation_template>

<what_feature_does_section>
  <template>
    ## What This Feature Does
    
    [USER_FOCUSED_EXPLANATION_OF_FUNCTIONALITY]
    
    ### Main Capabilities
    - **[CAPABILITY_1]**: [USER_BENEFIT_EXPLANATION]
    - **[CAPABILITY_2]**: [USER_BENEFIT_EXPLANATION]
    
    ### Real-World Applications
    - [USE_CASE_1]: [PRACTICAL_EXAMPLE]
    - [USE_CASE_2]: [PRACTICAL_EXAMPLE]
  </template>
  <content_approach>
    - translate technical implementation into user benefits
    - focus on outcomes and value proposition
    - use concrete, relatable examples
  </content_approach>
</what_feature_does_section>

<how_to_use_section>
  <template>
    ## How to Use It
    
    ### Getting Started
    [INITIAL_STEPS_FOR_USERS_TO_ACCESS_FEATURE]
    
    ### Common Workflows
    
    #### [WORKFLOW_1_NAME]
    1. [STEP_1_WITH_UI_REFERENCES]
    2. [STEP_2_WITH_EXPECTED_RESULTS]
    3. [STEP_3_WITH_OUTCOMES]
    
    #### [WORKFLOW_2_NAME]
    1. [STEP_1]
    2. [STEP_2]
    3. [EXPECTED_OUTCOME]
  </template>
  <instruction_quality>
    - reference actual UI elements and locations
    - provide clear success indicators
    - include common variations and options
  </instruction_quality>
</how_to_use_section>

<examples_section>
  <template>
    ## Examples and Use Cases
    
    ### Example 1: [REALISTIC_SCENARIO]
    **Situation:** [USER_CONTEXT]
    **Steps:** 
    1. [CONCRETE_ACTION]
    2. [CONCRETE_ACTION]
    **Result:** [SPECIFIC_OUTCOME]
    
    ### Example 2: [DIFFERENT_SCENARIO]
    **Situation:** [USER_CONTEXT]
    **Steps:** [ABBREVIATED_WORKFLOW]
    **Result:** [SPECIFIC_OUTCOME]
  </template>
  <example_selection>
    - choose realistic, relatable scenarios
    - demonstrate different aspects of the feature
    - show variety in usage patterns
  </example_selection>
</examples_section>

</step>

<step number="10" name="cross_reference_and_review">

### Step 10: Cross-Reference Creation and User Review

Create comprehensive cross-references between retroactive spec and user documentation, then present for user review.

<cross_reference_strategy>
  <spec_to_docs>
    ADD: Reference in retroactive spec pointing to user documentation
    FORMAT: "## User Documentation\n\nSee: @agent-os/docs/[FEATURE_NAME]/feature.md"
  </spec_to_docs>
  <docs_to_spec>
    ADD: Reference in user docs pointing to technical spec
    FORMAT: "## Technical Details\n\nFor implementation details: @agent-os/specs/[RETRO_SPEC]/spec.md"
  </docs_to_spec>
  <retro_notation>
    MARK: All documents as retroactively created
    PURPOSE: Distinguish from forward-planned documentation
  </retro_notation>
</cross_reference_strategy>

<documentation_index_update>
  <index_management>
    IF .agent-os/docs/README.md exists:
      UPDATE with new feature entry
    ELSE:
      CREATE index with new feature
    MARK: Retroactively documented features distinctly
  </index_management>
</documentation_index_update>

<user_review_presentation>
  <review_request>
    I've created comprehensive retroactive documentation for [FEATURE_NAME]:
    
    **Retroactive Specification:**
    - Main Spec: @agent-os/specs/[RETRO_SPEC]/spec.md
    - Technical Details: @agent-os/specs/[RETRO_SPEC]/technical-spec.md
    - Process Notes: @agent-os/specs/[RETRO_SPEC]/retro-notes.md
    
    **User Documentation:**
    - Main Guide: @agent-os/docs/[FEATURE_NAME]/feature.md
    [LIST_SUB_DOCS_IF_CREATED]
    
    This documentation was created by analyzing your existing implementation and understanding the feature's purpose through our discussion.
    
    Please review and let me know if:
    1. The feature description accurately reflects the implementation
    2. The user instructions match the actual workflow
    3. Any important details or use cases are missing
    4. The documentation structure works for your needs
  </review_request>
</user_review_presentation>

</step>

</process_flow>

## Execution Standards

<retroactive_documentation_principles>
  <accuracy_first>
    - document what IS implemented, not what should be
    - verify all instructions against actual implementation
    - acknowledge limitations and known issues
  </accuracy_first>
  <user_value_focus>
    - emphasize practical benefits and outcomes
    - organize by user goals, not code structure  
    - provide actionable guidance and examples
  </user_value_focus>
  <process_transparency>
    - clearly mark retroactive documentation
    - document the discovery and analysis process
    - preserve insights for future reference
  </process_transparency>
</retroactive_documentation_principles>

<documentation_quality>
  <completeness>
    - cover all user-accessible functionality
    - include integration points and relationships
    - address common use cases and scenarios
  </completeness>
  <usability>
    - write for actual end users, not developers
    - use clear, jargon-free language
    - provide concrete examples and workflows
  </usability>
  <maintainability>
    - establish clear links between spec and docs
    - document the retroactive process thoroughly
    - enable future updates and enhancements
  </maintainability>
</documentation_quality>

<final_checklist>
  <verify>
    - [ ] Codebase thoroughly analyzed for feature identification
    - [ ] Feature selected and deeply analyzed
    - [ ] Interactive discovery session completed
    - [ ] Retroactive spec created with all sections
    - [ ] Technical implementation documented accurately  
    - [ ] Process notes recorded for future reference
    - [ ] User documentation created with practical focus
    - [ ] Cross-references established between spec and docs
    - [ ] Documentation index updated appropriately
    - [ ] User review completed and feedback incorporated
  </verify>
</final_checklist>