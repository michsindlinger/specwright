---
description: Estimation Validation Rules for Specwright
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
installation: global
---

# Estimation Validation Rules

## What's New in v2.0

- **Main Agent Pattern**: All steps already Main Agent (no Sub-Agents in v1.0)
- **Path fixes**: `specwright/specs/` instead of `.specwright/specs/`
- **Added**: Pre-flight check, proper frontmatter

## Overview

Validate existing estimations for mathematical consistency, industry alignment, and overall plausibility. Provides independent verification that can be used by clients, stakeholders, or external AI tools.

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="load_estimation">

### Step 1: Load Estimation Data

Identify and load the estimation to validate.

<spec_selection>
  IF user specifies spec name:
    LOAD from specwright/specs/[spec-name]/
  ELSE:
    LIST available estimations
    ASK user to select
</spec_selection>

<file_loading>
  REQUIRED FILES:
  - estimation-technical.md
  - estimation-client.md
  - estimation-validation.json

  IF any missing:
    ERROR: "Incomplete estimation - missing files"
    LIST: Which files are present
    EXIT
</file_loading>

<data_extraction>
  PARSE estimation-validation.json

  EXTRACT:
  - Summary (total weeks, confidence, methods)
  - Breakdown (phases, story points, percentages)
  - Validation data (reference projects, team velocity, monte carlo)
  - Assumptions, Risks, Industry benchmarks, Adjustment factors

  STORE in memory for validation checks
</data_extraction>

</step>

<step number="2" name="mathematical_validation">

### Step 2: Mathematical Consistency Check

Verify all calculations are mathematically consistent.

**Check 1: Story Points Consistency**
- total_story_points / team_velocity = estimated_sprints
- FLAG if deviation > 0.5 sprints

**Check 2: Sprint to Weeks Conversion**
- sprints x sprint_length = estimated_weeks
- FLAG if deviation > 1 week

**Check 3: Percentage Consistency**
- All phase percentages must sum to 100%
- FLAG if deviation > 1%

**Check 4: Confidence Interval Ordering**
- REQUIREMENT: P10 < P50 < P90
- WARN if ratio P90/P10 > 3 (high uncertainty) or < 1.2 (overconfident)

**Check 5: Monte Carlo Validation** (if present)
- Mean should approximate P50 (within 10%)

</step>

<step number="3" name="benchmark_validation">

### Step 3: Industry Benchmark Alignment

Compare estimates against industry benchmarks.

<load_benchmarks>
  READ: specwright/estimations/config/industry-benchmarks.json
  IF not found: WARN and skip
</load_benchmarks>

FOR each component in estimation breakdown:
  IDENTIFY component type
  LOOKUP benchmark
  CALCULATE deviation

  ASSESS:
  - Within range: OK
  - 50-100% deviation: Outside range but may be justified
  - >100% deviation: Significantly outside range, FLAG

CALCULATE: benchmarks_aligned percentage
- >= 80%: Good alignment
- >= 60%: Moderate alignment
- < 60%: Poor alignment, recommend review

</step>

<step number="4" name="assumption_validation">

### Step 4: Assumptions Plausibility Check

FOR each assumption:
  CHECK required fields: assumption, criticality, validation_method, impact_if_false, mitigation
  CHECK validation method is specific and actionable
  CHECK impact is quantified
  CHECK critical assumptions have mitigations

REPORT: Total assumptions, critical count, quality score

</step>

<step number="5" name="reference_project_validation">

### Step 5: Reference Projects Check (if used)

IF method is Reference Class Forecasting:
  FOR each reference project:
    VALIDATE: similarity_score >= 0.5
    REQUIRE: actual data documented
    VERIFY: MRE calculation correct
    CHECK: lessons learned documented

  CHECK statistical validity (>= 3-5 projects)
  CALCULATE average MRE (< 0.15: excellent, < 0.25: good, < 0.40: moderate)

</step>

<step number="6" name="adjustment_factor_validation">

### Step 6: Adjustment Factors Reasonableness

<factor_ranges>
  REASONABLE RANGES:
  - Reusability bonus: -10% to -60%
  - Technical debt penalty: +10% to +50%
  - Complexity adjustment: -30% to +50%
  - Integration complexity: +10% to +30%
  - New technology: +20% to +40%
</factor_ranges>

CHECK each factor against ranges
FLAG extreme values (> +/-60%)
CHECK net adjustment (warn if > +/-100%)
CHECK for contradictory adjustments

</step>

<step number="7" name="risk_assessment_validation">

### Step 7: Risk Assessment Check

FOR each risk:
  CHECK required fields: risk, probability, impact, mitigation
  VALIDATE: 0 <= probability <= 1
  REQUIRE: impact quantified

CALCULATE total expected impact = Sum(probability x impact)
COMPARE with contingency buffer (P90 - P50)
WARN if expected impact exceeds buffer

CHECK: high-probability risks (> 0.3) have documented mitigations

</step>

<step number="8" name="generate_validation_report">

### Step 8: Generate Comprehensive Validation Report

CREATE: specwright/specs/[spec-name]/estimation-validation-report.md

<scoring>
  - Mathematical Consistency: 20 points
  - Benchmark Alignment: 20 points
  - Assumptions Quality: 15 points
  - Reference Projects: 15 points (if applicable)
  - Adjustment Factors: 15 points
  - Risk Assessment: 15 points

  DEDUCTIONS:
  - Each failed check: -5 points
  - Each warning: -2 points
  - Each red flag: -10 points

  CATEGORIZE:
  - 80-100: Robust and defensible
  - 60-79: Reasonable with minor concerns
  - < 60: Needs revision
</scoring>

**Present to user:**
```
Validation Complete!

Overall Confidence: [score]/100 - [status]

Passed Checks: [count]/[total]
Warnings: [count]
Red Flags: [count]

Key Findings:
- [Finding 1]
- [Finding 2]
- [Finding 3]

Recommendation: [overall recommendation]

Full report: specwright/specs/[spec-name]/estimation-validation-report.md
```

</step>

</process_flow>

## Validation Standards

This validation follows:
- IEEE 1045-1992 (Software Productivity Metrics)
- PMBOK estimation guidelines
- Industry best practices for software estimation

## Execution Summary

**Duration:** 5-10 minutes
**User Interactions:** 0 (fully automated)
**Output:** 1 validation report
