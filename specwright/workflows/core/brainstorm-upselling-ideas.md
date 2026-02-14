---
description: Brainstorm Upselling & Cross-Selling Ideas for Specwright Projects
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
installation: global
---

# Brainstorm Upselling & Cross-Selling Ideas

## What's New in v2.0

- **Main Agent Pattern**: Step 1 executed by Main Agent directly (was: context-fetcher Sub-Agent)
- **Path fixes**: `specwright/` instead of `.specwright/`
- **Kept**: file-creator (Utility) for Step 6

## Overview

Analyze the current project and generate strategic upselling and cross-selling ideas through interactive discussion. The agent presents opportunities, discusses them with you, and only documents after collaborative refinement.

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="gather_project_context">

### Step 1: Gather Project Context

Analyze existing product documentation and codebase to understand the current state.

<analysis_sequence>
  IF specwright/product/ directory exists:
    READ: specwright/product/product-brief.md (or product-brief-lite.md)
    READ: specwright/product/tech-stack.md
    READ: specwright/product/roadmap.md
    READ: specwright/product/architecture-decision.md
    STORE: Product context from documentation

  ELSE:
    ANALYZE codebase:
      - Project structure and file organization
      - Dependencies (package.json, Gemfile, requirements.txt, etc.)
      - Implemented features and functionality
      - Database schema, API endpoints
      - UI/UX patterns, authentication systems
      - Integration points, configuration

  IF insufficient information:
    ASK user:
      - What is the main purpose of this project?
      - Who are the target users?
      - What problem does it solve?
      - What are the key features currently implemented?
      - What industry/domain is this project in?
</analysis_sequence>

</step>

<step number="2" name="analyze_current_state">

### Step 2: Analyze Current State & Identify Gaps

<analysis_dimensions>
  **Feature Completeness:**
  - Partially implemented features
  - Missing components in feature sets
  - Incomplete user workflows
  - Gaps in user journey

  **Technical Infrastructure:**
  - Missing monitoring/logging
  - Absent backup/disaster recovery
  - Performance optimization gaps
  - Security hardening needs
  - Testing coverage gaps
  - CI/CD pipeline needs

  **User Experience:**
  - Missing mobile/responsive versions
  - Accessibility features
  - Internationalization
  - Onboarding/tutorials
  - Analytics

  **Business Capabilities:**
  - Reporting/analytics dashboards
  - Payment/billing systems
  - Admin/management tools
  - Integration capabilities
  - API for third-party access

  **Scalability:**
  - Architecture limitations
  - Performance bottlenecks
  - Multi-tenancy gaps
  - Caching needs
</analysis_dimensions>

PREPARE: Initial list of 10-15 opportunity ideas (internal, not shared yet)

</step>

<step number="3" name="present_opportunities">

### Step 3: Present High-Level Opportunities

Present a curated list grouped by effort level:

```
## Upselling Opportunities for [PROJECT_NAME]

### Quick Wins (1-2 weeks)
1. **[OPPORTUNITY]** - [ONE_LINE_DESCRIPTION]
2. **[OPPORTUNITY]** - [ONE_LINE_DESCRIPTION]

### Mid-Term Projects (3-6 weeks)
3. **[OPPORTUNITY]** - [ONE_LINE_DESCRIPTION]
4. **[OPPORTUNITY]** - [ONE_LINE_DESCRIPTION]

### Strategic Initiatives (2+ months)
5. **[OPPORTUNITY]** - [ONE_LINE_DESCRIPTION]
6. **[OPPORTUNITY]** - [ONE_LINE_DESCRIPTION]

Which of these interest you most? We can discuss any in detail.
```

</step>

<step number="4" name="interactive_discussion">

### Step 4: Interactive Discussion & Refinement

FOR each opportunity the user selects:
  EXPLAIN in detail:
    - What exactly would be built
    - Why it's valuable for the client
    - Technical approach and complexity
    - Estimated effort and timeline
    - Business value and ROI potential

  ASK clarifying questions:
    - Does this align with client priorities?
    - Any constraints to consider?
    - Would you modify this approach?
    - Should we bundle with other opportunities?

<conversational_style>
  - Be consultative, not salesy
  - Listen to priorities
  - Adapt ideas based on feedback
  - Build on user's insights
</conversational_style>

</step>

<step number="5" name="collaborative_prioritization">

### Step 5: Collaborative Prioritization

Work with user to select 3-5 opportunities for documentation.

**Criteria:**
- Business value for client
- Technical feasibility
- Effort/timeline
- Strategic fit
- Quick wins vs. long-term investments

ASK: "Which 3-5 opportunities should we document?"
WAIT: For explicit confirmation before proceeding

</step>

<step number="6" subagent="file-creator" name="create_documentation">

### Step 6: Create Documentation

USE: file-creator subagent

**ONLY AFTER** user confirmation.

CREATE: specwright/business/upselling-ideas-[CURRENT_DATE].md

**Structure:**
```markdown
# Upselling Opportunities for [PROJECT_NAME]

> Created: [CURRENT_DATE]
> Analyzed Basis: [WHAT_WAS_ANALYZED]

## Summary
- Selected Opportunities: [COUNT]
- Quick Wins: [COUNT]
- Mid-Term Projects: [COUNT]
- Strategic Initiatives: [COUNT]

## Detailed Opportunities

### [NUMBER]. [OPPORTUNITY_NAME]

**Category:** [CATEGORY]
**Priority:** [High|Medium|Low]
**Effort:** [ESTIMATE]
**Value:** [VALUE_ESTIMATE]

#### What Gets Built
[DESCRIPTION_FROM_DISCUSSION]

#### Business Value
- For the client: [BENEFITS]
- For end users: [BENEFITS]
- ROI indicators: [METRICS]

#### Technical Approach
- Complexity: [XS|S|M|L|XL]
- Technologies: [TECH]
- Dependencies: [DEPS]

#### Sales Positioning
- Pain point: [PROBLEM]
- Value proposition: [WHY_BUY]
- Best timing: [WHEN]

#### Discussion Insights
[KEY_INSIGHTS_FROM_DISCUSSION]

---

## Recommended Next Steps
[PRIORITIZED_ACTIONS]

## Bundles & Packages
[IF_DISCUSSED]
```

ALSO CREATE: specwright/business/upselling-summary-[CURRENT_DATE].md (client-facing 1-2 page summary)

</step>

<step number="7" name="review_and_iterate">

### Step 7: Review & Iterate

Present documentation for review.
IF user requests changes: iterate.
IF satisfied: summarize next steps for using the documentation.

</step>

</process_flow>

## Important

**CRITICAL**: Do NOT create documentation files until:
1. You have discussed opportunities with the user
2. User has selected which to document
3. User explicitly confirms documentation creation

The goal is COLLABORATIVE EXPLORATION first, DOCUMENTATION second.

## Execution Summary

**Duration:** 20-40 minutes (interactive)
**User Interactions:** 3-5 discussion points
**Output:** 2 files (detailed + summary)
