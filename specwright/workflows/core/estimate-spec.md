---
description: Effort Estimation Rules for Specwright
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
installation: global
---

# Effort Estimation Rules

## What's New in v2.0

- **Main Agent Pattern**: Step 1 executed by Main Agent directly (was: context-fetcher Sub-Agent)
- **Kept**: estimation-specialist (Delegation) for Steps 2-6 - specialized estimation knowledge
- **Path fixes**: `specwright/specs/` instead of `.specwright/specs/`

## Overview

Generate detailed effort estimations for feature specifications using context-aware methods, codebase analysis, and industry benchmarks. Creates both technical and client-facing documentation.

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="spec_selection">

### Step 1: Spec Selection

Identify which specification to estimate.

<option_a_flow>
  <trigger>User specifies spec name or path</trigger>
  <actions>
    1. VALIDATE spec exists in specwright/specs/
    2. CHECK for spec.md and tasks.md (or stories/)
    3. PROCEED to estimation
  </actions>
</option_a_flow>

<option_b_flow>
  <trigger>User doesn't specify spec</trigger>
  <actions>
    1. LIST available specs from specwright/specs/
    2. PRESENT to user with dates
    3. WAIT for selection
  </actions>
</option_b_flow>

<validation>
  REQUIRED FILES:
    - spec.md (feature specification)
    - tasks.md OR stories/ directory (task breakdown)

  IF missing:
    ERROR: "Cannot estimate - missing required files"
    SUGGEST: Run /create-spec first
</validation>

</step>

<step number="2" subagent="estimation-specialist" name="codebase_analysis">

### Step 2: Codebase Analysis

USE: estimation-specialist subagent

Analyze the existing codebase for patterns, complexity, and reusability.

<analysis_tasks>
  **2.1 Project Structure Detection:**
  - Framework/technology (Next.js, React, Node.js, etc.)
  - Architecture pattern (App Router, Pages, MVC, etc.)
  - Directory structure conventions

  **2.2 Similar Feature Search:**
  - Extract keywords from spec (feature type, domain terms, technology)
  - Search codebase for similar implementations
  - Analyze file structure, LOC, reusable components
  - Calculate reusability score (0-100%)

  **2.3 Code Complexity Metrics:**
  - Average lines per file
  - Test file ratio
  - Component complexity indicators

  **2.4 Technical Debt Assessment:**
  - TODO/FIXME comments
  - Security vulnerabilities
  - Outdated dependencies
  - Impact: High (+30-50%) | Medium (+15-25%) | Low (+5-10%)

  **2.5 Dependency Analysis:**
  - Required packages vs installed
  - Version compatibility
  - Setup overhead estimation
</analysis_tasks>

</step>

<step number="3" subagent="estimation-specialist" name="method_selection">

### Step 3: Estimation Method Selection

USE: estimation-specialist subagent

Select the optimal estimation method based on available data.

<decision_tree>
  CHECK: Historical database exists?
  PATH: specwright/estimations/history/index.json

  IF exists AND has >= 10 similar projects:
    PRIMARY_METHOD: "Reference Class Forecasting"
    CONFIDENCE: "High"

  ELSE IF team_velocity_history >= 3 sprints:
    PRIMARY_METHOD: "Planning Poker (Multi-Perspective Analysis)"
    CONFIDENCE: "Medium-High"

  ELSE IF spec is complex (>20 tasks):
    PRIMARY_METHOD: "Wideband Delphi"
    CONFIDENCE: "Medium"

  ELSE:
    PRIMARY_METHOD: "Task-based Estimation"
    CONFIDENCE: "Medium"

  IF uncertainty is high (new tech, new domain):
    ADDITIONAL_METHOD: "Monte Carlo Simulation"
</decision_tree>

</step>

<step number="4" subagent="estimation-specialist" name="estimation_execution">

### Step 4: Estimation Execution

USE: estimation-specialist subagent

Execute the chosen estimation method.

<planning_poker>
  ### Planning Poker (Multi-Perspective Analysis with AI-Acceleration)

  **Modern Approach**: Estimate in **hours** with AI-acceleration factors

  FOR each task:

    **Step 1: Multi-Perspective Complexity Analysis (Human Baseline)**
    - Backend complexity (API, database, logic) -> Score 1-10
    - Frontend complexity (UI, state, interactions) -> Score 1-10
    - Testing effort (unit, integration, e2e) -> Score 1-10
    - Integration complexity (APIs, services, external) -> Score 1-10

    **Step 2: Convert to Hours (Human Developer Baseline)**
    - 1-2: Trivial (1-2 hours)
    - 3-4: Simple (2-4 hours)
    - 4-5: Straightforward (4-8 hours)
    - 6-7: Moderate (8-16 hours = 1-2 days)
    - 7-8: Complex (16-32 hours = 2-4 days)
    - 9-10: Very complex (32-80 hours = 1-2 weeks)

    **Step 3: Apply Code Analysis Adjustments**
    - Reusability bonus: -[%] from code analysis
    - Technical debt penalty: +[%] from code analysis
    - Complexity adjustment: +/-[%] based on similar features

    **Step 4: Categorize for AI-Acceleration**
    LOAD: specwright/estimations/config/estimation-config.json

    HIGH AI-ACCELERATION (Factor 0.20 = 80% reduction):
      - Boilerplate, CRUD, API endpoints, DB migrations, configs, tests
    MEDIUM AI-ACCELERATION (Factor 0.40 = 60% reduction):
      - Business logic, algorithms, state management, API integration
    LOW AI-ACCELERATION (Factor 0.70 = 30% reduction):
      - New tech exploration, architecture decisions, complex debugging
    NO AI-ACCELERATION (Factor 1.00):
      - Manual QA, user testing, design decisions, stakeholder meetings

    **Step 5: Calculate AI-Adjusted Estimate**
    ai_adjusted_hours = human_baseline_hours x ai_factor

    **Step 6: Aggregate to Project Estimate**
    Total Human Baseline Hours = Sum of all task human_baseline_hours
    Total AI-Adjusted Hours = Sum of all task ai_adjusted_hours
    Convert to weeks (40 hours/week)

    **Step 7: Provide Breakdown by AI Category**
</planning_poker>

<reference_class>
  ### Reference Class Forecasting (if historical data available)

  LOAD: specwright/estimations/history/index.json
  FILTER similar projects (similarity >= 0.7)
  EXTRACT: P10, P50, P90 percentiles
  ADJUST for current project differences
</reference_class>

<monte_carlo>
  ### Monte Carlo Simulation (Optional, for high uncertainty)

  FOR each task: Define three-point estimate (optimistic, likely, pessimistic)
  SIMULATE 10,000 iterations using Beta-PERT distribution
  CALCULATE P10, P50, P90 confidence intervals
</monte_carlo>

<industry_validation>
  ### Industry Benchmark Validation

  LOAD: specwright/estimations/config/industry-benchmarks.json
  FOR each component: Compare estimate vs benchmark
  FLAG deviations > 50%
  WARNING for deviations > 100%
</industry_validation>

<bias_detection>
  ### Cognitive Bias Check

  CHECK for: Planning Fallacy, Integration Underestimation, Missing Testing, Optimism Bias
  SUGGEST corrections where detected
</bias_detection>

</step>

<step number="5" subagent="estimation-specialist" name="documentation">

### Step 5: Create Documentation (Triple Output)

USE: estimation-specialist subagent

Create three estimation documents:

**File 1: estimation-technical.md**
LOCATION: specwright/specs/[spec-name]/estimation-technical.md
- Summary (story points, sprints, weeks, confidence intervals)
- Methodology explanation
- Task breakdown table
- Code analysis results
- Adjustment factors
- Assumptions and risks
- Reference projects and industry benchmarks

**File 2: estimation-client.md**
LOCATION: specwright/specs/[spec-name]/estimation-client.md
- ALWAYS in GERMAN language
- NON-TECHNICAL language for business stakeholders
- AI-acceleration explained in simple terms
- Cost breakdown by phases
- Included/excluded features
- Risk explanation in plain language
- Three scenarios (best/realistic/worst)
- Cost-saving options
- Transparency section

**File 3: estimation-validation.json**
LOCATION: specwright/specs/[spec-name]/estimation-validation.json
- Machine-readable format for external validation
- Full breakdown with justifications
- Validation instructions for external AI tools

</step>

<step number="6" subagent="estimation-specialist" name="tracking_setup">

### Step 6: Setup Estimation Tracking

USE: estimation-specialist subagent

Create tracking file for actual vs. estimated comparison.

LOCATION: specwright/estimations/active/[YYYY-MM-DD]-[feature-name].json

Contains: metadata, classification, estimation breakdown, assumptions, risks

</step>

<step number="7" name="user_review">

### Step 7: User Review & Optional Adjustments

Present estimation summary and allow user to review.

**Summary includes:**
- Feature name and estimated effort (min-max weeks)
- Method and confidence level
- Key assumptions and top risks
- Reusability percentage and technical debt impact
- Files created

**User Options:**
1. Accept estimation
2. Adjust assumptions and re-estimate
3. Run external validation (/validate-estimation)
4. Request detailed explanation

</step>

</process_flow>

## Important Notes

### When Estimation is Not Possible

IF spec.md or tasks.md missing:
  ERROR: "Cannot estimate without specification"
  GUIDE: "Run /create-spec first"

IF spec is too vague:
  GUIDE: "Refine spec with clear acceptance criteria, technical requirements, integration points"

### Confidence Levels

- **High (80-90%)**: Historical data, similar projects, stable tech
- **Medium (60-80%)**: Some data, established team, known tech
- **Low (40-60%)**: Limited data, new team, new tech

### Continuous Improvement

After each completed project:
1. Update historical database
2. Calculate accuracy metrics (MRE)
3. Document lessons learned
4. Adjust future estimates

## Execution Summary

**Duration:** 15-30 minutes
**User Interactions:** 1-2 review points
**Output:** 3 estimation files + 1 tracking file
