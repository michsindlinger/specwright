---
description: Analyze feasibility of product/platform/module briefs before development
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
installation: global
---

# Analyze Feasibility Workflow

## What's New in v2.0

- **Main Agent Pattern**: Steps 1-8, 10 executed by Main Agent directly (was: context-fetcher Sub-Agent)
- **Path fixes**: `specwright/` instead of `.specwright/`
- **Kept**: file-creator (Utility) for Step 9

## Overview

Perform comprehensive feasibility analysis on product-brief, platform-brief, or module-brief to determine technical viability, resource requirements, and risks before starting development.

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<arguments>
  --market    Include market & competition analysis (optional)
  --brief     Path to specific brief file (optional, auto-detects if not provided)
</arguments>

<process_flow>

<step number="1" name="detect_and_load_brief">

### Step 1: Detect and Load Brief

Identify the brief type and load the appropriate file.

<detection_logic>
  CHECK for briefs in order:
  1. IF --brief argument provided:
     LOAD specified brief
  2. ELIF specwright/product/product-brief.md exists:
     LOAD as Product Brief
  3. ELIF specwright/platform/platform-brief.md exists:
     LOAD as Platform Brief
  4. ELIF specwright/platform/modules/*/module-brief.md exists:
     ASK user which module to analyze
  5. ELSE:
     ERROR: "No brief found. Run /plan-product or /plan-platform first."
</detection_logic>

**Store:**
- `brief_type`: [product | platform | module]
- `brief_path`: Path to brief file
- `brief_content`: Full brief content
- `project_name`: Extracted project name

</step>

<step number="2" name="load_tech_stack">

### Step 2: Load Tech Stack

Load tech-stack.md to understand planned technologies.

<file_lookup>
  1. TRY: specwright/product/tech-stack.md
  2. ELIF platform: specwright/platform/tech-stack.md
  3. ELIF module: Parent platform tech-stack.md
  4. FALLBACK: ~/.specwright/standards/tech-stack.md (global defaults)
</file_lookup>

**Store:**
- `tech_stack`: Parsed technology list
- `frameworks`: List of frameworks
- `databases`: List of databases
- `external_apis`: List of external APIs/integrations

</step>

<step number="3" name="technical_feasibility_analysis">

### Step 3: Technical Feasibility Analysis

Analyze each technology and integration for viability.

<mcp_usage>
  FOR EACH technology in tech_stack:
    USE Perplexity MCP (mcp__perplexity__search or mcp__perplexity__reason):
      - "[Technology] current version stability 2026"
      - "[Technology] known issues limitations"
      - "[Technology] deprecation status"

    IF library/framework:
      USE Context7 MCP (if available) OR Perplexity:
        - Check latest documentation
        - Verify API stability
        - Check for breaking changes

    STORE results in tech_assessment[]
</mcp_usage>

<assessment_criteria>
  FOR EACH technology:
    EVALUATE:
    - availability: [available | limited | unavailable]
    - maturity: [stable | beta | experimental | deprecated]
    - documentation: [excellent | good | poor | missing]
    - community: [active | moderate | minimal | dead]
    - risk_level: [low | medium | high | critical]

    CALCULATE tech_score (1-10) based on:
    - stable + excellent docs + active community = 9-10
    - stable + good docs + moderate community = 7-8
    - beta OR poor docs OR minimal community = 4-6
    - experimental OR deprecated OR dead = 1-3
</assessment_criteria>

</step>

<step number="4" name="integration_analysis">

### Step 4: API & Integration Analysis

Analyze external integrations and APIs.

<mcp_usage>
  FOR EACH external_api in brief:
    USE Perplexity MCP:
      - "[API] availability pricing 2026"
      - "[API] rate limits quotas"
      - "[API] reliability uptime"
      - "[API] alternatives competitors"

    STORE results in integration_assessment[]
</mcp_usage>

<assessment_criteria>
  FOR EACH integration:
    EVALUATE:
    - availability: [public | private | waitlist | discontinued]
    - pricing: [free | freemium | paid | enterprise-only]
    - rate_limits: [generous | adequate | restrictive | blocking]
    - reliability: [99.9%+ | 99%+ | <99% | unknown]
    - vendor_lock_in: [none | low | medium | high]
</assessment_criteria>

</step>

<step number="5" name="resource_analysis">

### Step 5: Resource Analysis

Assess skill requirements against available DevTeam.

<check_devteam>
  LOAD: .claude/skills/ (if exists) and .claude/agents/ (if exists)

  EXTRACT required skills from brief:
  - Frontend skills (React, Vue, Angular, etc.)
  - Backend skills (Node, Python, Ruby, Go, etc.)
  - Database skills (PostgreSQL, MongoDB, etc.)
  - DevOps skills (Docker, K8s, CI/CD, etc.)
  - Specialized skills (ML, AI, Real-time, etc.)

  COMPARE required vs available:
  - Match each requirement to existing skills/agents
  - Identify skill gaps
  - Calculate coverage percentage
</check_devteam>

<effort_estimation>
  BASED ON brief complexity:
  - Feature count
  - Integration count
  - UI complexity (if frontend)
  - Business logic complexity
  - Data model complexity

  ESTIMATE effort:
  - MVP: [Small | Medium | Large | Very Large]
  - Full Scope: [Small | Medium | Large | Very Large]

  Definitions:
  - Small: < 1 week
  - Medium: 1-3 weeks
  - Large: 3-8 weeks
  - Very Large: > 8 weeks
</effort_estimation>

</step>

<step number="6" name="risk_analysis">

### Step 6: Risk Analysis

Identify and categorize risks.

<risk_categories>
  <technical_risks>
    - New/unproven technologies
    - Complex integrations
    - Performance requirements
    - Scalability challenges
    - Security requirements
  </technical_risks>

  <external_risks>
    - API dependency on third parties
    - Vendor lock-in potential
    - Pricing changes
    - Service discontinuation
  </external_risks>

  <dependency_risks>
    - Skill gaps in team
    - Timeline constraints
    - Budget constraints
    - Unclear requirements
  </dependency_risks>
</risk_categories>

<risk_assessment>
  FOR EACH identified risk:
    EVALUATE:
    - probability: [low | medium | high]
    - impact: [low | medium | high]
    - total_risk: probability x impact -> [minor | moderate | major | critical]

    DEFINE mitigation strategy
</risk_assessment>

<blocker_identification>
  IDENTIFY blockers:
  - Critical technology unavailable
  - Required API not accessible
  - Essential skill completely missing
  - Fundamental requirement impossible

  IDENTIFY potential blockers:
  - Conditions that could become blockers
  - Dependencies on external factors
</blocker_identification>

</step>

<step number="7" name="market_analysis" condition="--market">

### Step 7: Market & Competition Analysis (Optional)

Only executed when `--market` flag is provided.

<conditional_logic>
  IF --market flag NOT provided:
    SKIP this step
    SET market_score = "N/A"
    PROCEED to step 8
</conditional_logic>

<mcp_usage>
  USE Perplexity MCP (mcp__perplexity__reason or mcp__perplexity__deep_research):
    - "[Product type] market size 2026"
    - "[Product type] competitors comparison"
    - "[Product type] market trends growth"
    - "Alternatives to [Product name] comparison"
</mcp_usage>

<market_assessment>
  EVALUATE:
  - market_size: [small | medium | large]
  - market_growth: [declining | stable | growing | booming]
  - entry_barriers: [low | medium | high]
  - differentiation_potential: [low | medium | high]

  CALCULATE market_score (1-10)
</market_assessment>

</step>

<step number="8" name="calculate_scores">

### Step 8: Calculate Final Scores

Aggregate all assessments into final scores.

<score_calculation>
  technical_score = AVERAGE(tech_assessment[].score)

  resource_score = WEIGHTED_AVERAGE(
    skill_coverage: 40%
    effort_realistic: 30%
    dependencies_clear: 30%
  )

  risk_score = 10 - (critical_risks x 3 + major_risks x 2 + moderate_risks x 1)
  risk_score = MAX(1, risk_score)

  IF --market:
    market_score = calculated_market_score
  ELSE:
    market_score = "N/A"
</score_calculation>

<status_determination>
  DETERMINE overall status:

  GO:
    - ALL scores >= 7
    - NO identified blockers
    - Confidence >= 70%

  CAUTION:
    - ANY score 4-6
    - OR open questions with significant impact
    - OR Confidence 50-69%

  NO-GO:
    - ANY score < 4
    - OR critical blocker identified
    - OR Confidence < 50%
</status_determination>

</step>

<step number="9" subagent="file-creator" name="generate_report">

### Step 9: Generate Feasibility Report

USE: file-creator subagent

Create the final report.

**Template:** `@specwright/templates/feasibility/feasibility-report.md`

<template_lookup>
  LOOKUP: specwright/templates/feasibility/ (project) → ~/.specwright/templates/feasibility/ (global fallback)
</template_lookup>

**Output Location:**
```
specwright/feasibility/
└── [project-name]-feasibility-report.md
```

**Alternative for modules:**
```
specwright/platform/modules/[module-name]/
└── feasibility-report.md
```

</step>

<step number="10" name="present_results">

### Step 10: Present Results to User

Display summary and recommendations.

```
Feasibility Analysis Complete!

Project: [PROJECT_NAME]
Brief Type: [BRIEF_TYPE]

OVERALL ASSESSMENT: [GO / CAUTION / NO-GO]
Confidence: [X]%

Dimensions:
| Dimension               | Score | Status |
|-------------------------|-------|--------|
| Technical Feasibility   | [X]/10| [OK/WARN/FAIL] |
| Resources               | [X]/10| [OK/WARN/FAIL] |
| Risks                   | [X]/10| [OK/WARN/FAIL] |
| Market & Competition    | [X]/10| [OK/WARN/FAIL] | (if --market)

[IF GO:]
  Next step: /create-spec or /build-development-team

[IF CAUTION:]
  [X] points need clarification before start.
  See: specwright/feasibility/[name]-feasibility-report.md

[IF NO-GO:]
  Project not recommended in current form.
  Blockers: [BLOCKER_LIST]

Report saved: specwright/feasibility/[name]-feasibility-report.md
```

</step>

</process_flow>

## MCP Server Usage

| MCP Server | Purpose | Steps |
|------------|---------|-------|
| **Perplexity** | Technology research, market analysis | 3, 4, 7 |
| **Context7** | Library documentation (if available) | 3 |

<mcp_fallback>
  IF Perplexity not available:
    USE WebSearch tool as fallback
    NOTE: Results may be less comprehensive
</mcp_fallback>

## Error Handling

<error_scenarios>
  <scenario name="no_brief_found">
    <condition>No product-brief, platform-brief, or module-brief exists</condition>
    <action>SUGGEST: "Run /plan-product or /plan-platform first."</action>
  </scenario>
  <scenario name="tech_stack_missing">
    <condition>No tech-stack.md found</condition>
    <action>USE global defaults, WARN user</action>
  </scenario>
  <scenario name="mcp_unavailable">
    <condition>No research MCP available</condition>
    <action>USE WebSearch as fallback, reduce confidence by 20%</action>
  </scenario>
</error_scenarios>

## Execution Summary

**Duration:** 5-15 minutes
**User Interactions:** 0-2
**Output:** 1 comprehensive report
