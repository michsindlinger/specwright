---
description: Identify external dependencies and blockers that could delay project delivery
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
installation: global
---

# Blocker Analysis Workflow

## What's New in v2.0

- **Main Agent Pattern**: All steps executed by Main Agent directly (was: business-analyst Sub-Agent delegation)
- **Path fixes**: `specwright/product/` instead of `.specwright/product/`
- **Kept**: No Sub-Agents needed

## Overview

Systematically identify external dependencies, blockers, and prerequisites that could delay or prevent project delivery. Essential for realistic project planning and stakeholder communication.

**Use Cases:**
- New project kick-offs (identify dependencies early)
- Project scoping (realistic delivery estimates)
- Stakeholder communication (what's needed for success)
- Risk assessment (what could block progress)

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="detect_project_type">

### Step 1: Detect Project Type

Determine if this is a single product or platform with multiple modules.

<detection_logic>
  CHECK for project documentation:

  IF specwright/product/platform-brief.md EXISTS:
    PROJECT_TYPE = "platform"
    LOAD: platform-brief.md
    SCAN: specwright/product/modules/*/module-brief.md
    SET: modules = list of all module directories
    INFORM user: "Detected platform project with [N] modules: [module names]"
    PROCEED to step 2a

  ELSE IF specwright/product/product-brief.md EXISTS:
    PROJECT_TYPE = "product"
    LOAD: product-brief.md
    INFORM user: "Detected single product project"
    PROCEED to step 2b

  ELSE:
    ERROR: "No product-brief.md or platform-brief.md found."
    SUGGEST: "Run /plan-product or /plan-platform first."
    ABORT workflow
</detection_logic>

</step>

<step number="2a" name="platform_analysis">

### Step 2a: Platform-Wide Blocker Analysis (Platform Projects)

For platform projects, analyze at two levels: platform-wide and per-module.

<context_loading>
  READ:
  - specwright/product/platform-brief.md
  - specwright/product/tech-stack.md (if exists)
  - specwright/product/modules/*/module-brief.md (all modules)
  - specwright/product/roadmap/platform-roadmap.md (if exists)
  - specwright/product/architecture/module-dependencies.md (if exists)
</context_loading>

<analysis_tasks>
  1. LOAD blocker-analysis-template.md (hybrid lookup: project -> global)

  2. Analyze PLATFORM-WIDE blockers:
     - Infrastructure dependencies (hosting, servers, networks)
     - External system access (APIs, databases, services)
     - Third-party licenses/contracts
     - Security/compliance requirements
     - Team/skill availability
     - Budget constraints

  3. For EACH MODULE, analyze:
     - Module-specific external dependencies
     - Stakeholder deliverables (what others must provide)
     - External system integrations
     - Data requirements from external sources
     - Approval/sign-off requirements
     - Hardware/infrastructure needs

  4. Categorize each blocker:
     - Category: Stakeholder | External System | License | Infrastructure | Skills | Budget | Compliance | Other
     - Severity: Critical (blocks all) | High (blocks phase) | Medium (delays) | Low (workaround possible)
     - Status: Unknown | Requested | In Progress | Resolved
     - Owner: Who needs to provide/resolve this
     - Deadline: When is this needed by (based on roadmap)

  5. Create dependency timeline:
     - Map blockers to roadmap phases
     - Identify critical path blockers
     - Flag blockers without owners
</analysis_tasks>

**Template:** `@specwright/templates/product/blocker-analysis-template.md`

<template_lookup>
  LOOKUP: specwright/templates/product/ (project) → ~/.specwright/templates/product/ (global fallback)
</template_lookup>

**Output:**
- Platform overview: specwright/product/blocker-analysis.md
- Per-module: specwright/product/modules/[module-name]/blocker-analysis.md

PROCEED to step 3

</step>

<step number="2b" name="product_analysis">

### Step 2b: Product Blocker Analysis (Single Product Projects)

For single product projects, analyze all dependencies.

<context_loading>
  READ:
  - specwright/product/product-brief.md
  - specwright/product/tech-stack.md (if exists)
  - specwright/product/roadmap.md (if exists)
  - specwright/product/architecture-decision.md (if exists)
</context_loading>

<analysis_categories>
  STAKEHOLDER DELIVERABLES:
  - Content/copy from marketing
  - Design assets from design team
  - Business requirements clarification
  - Approval/sign-off requirements
  - Test data provision

  EXTERNAL SYSTEM ACCESS:
  - Third-party API credentials
  - Database access rights
  - External service accounts
  - VPN/network access
  - Testing environment access

  INFRASTRUCTURE & LICENSES:
  - Hosting/server provisioning
  - Domain/DNS setup
  - SSL certificates
  - Software licenses
  - Third-party service subscriptions

  COMPLIANCE & SECURITY:
  - Security review/audit
  - Data protection compliance
  - Legal review
  - Penetration testing
  - Accessibility audit

  SKILLS & RESOURCES:
  - Specialized expertise needed
  - Training requirements
  - External consultants
  - Team availability

  BUDGET & PROCUREMENT:
  - Hardware procurement
  - Software purchases
  - Service contracts
  - Budget approval
</analysis_categories>

<blocker_documentation>
  For each identified blocker, document:
  - Description: What is needed
  - Category: Which category above
  - Severity: Critical | High | Medium | Low
  - Status: Unknown | Requested | In Progress | Resolved
  - Owner: Who provides/resolves this (person/role/department)
  - Needed By: When must this be resolved (map to roadmap phase)
  - Impact: What cannot proceed without this
  - Notes: Additional context, alternatives

  Create timeline view:
  - Phase 1 blockers (resolve before development starts)
  - Phase 2 blockers (resolve before feature X)
  - Ongoing blockers (continuous dependencies)

  Generate action items:
  - Immediate actions (this week)
  - Short-term actions (this month)
  - Planning actions (before phase X)
</blocker_documentation>

**Template:** `@specwright/templates/product/blocker-analysis-template.md`

<template_lookup>
  LOOKUP: specwright/templates/product/ (project) → ~/.specwright/templates/product/ (global fallback)
</template_lookup>

**Output:** specwright/product/blocker-analysis.md

PROCEED to step 3

</step>

<step number="3" name="user_review">

### Step 3: User Review Gate

Present analysis to user for review and refinement.

**Prompt User:**
```
Blocker Analysis Complete!

I've identified [N] potential blockers:
- Critical: [X] (blocks project start)
- High: [X] (blocks specific phases)
- Medium: [X] (causes delays)
- Low: [X] (workarounds available)

Please review: specwright/product/blocker-analysis.md
[If platform: Also check per-module analyses]

Options:
1. Approve analysis
2. Add missing blockers I should consider
3. Adjust severity/ownership of existing blockers
```

<conditional_logic>
  IF user approves:
    PROCEED to step 4
  ELSE IF user adds blockers:
    UPDATE analysis with new blockers
    RETURN to step 3
  ELSE IF user adjusts existing:
    UPDATE analysis with changes
    RETURN to step 3
</conditional_logic>

</step>

<step number="4" name="summary">

### Step 4: Summary and Next Steps

```
Blocker Analysis Complete!

Project Type: [Product/Platform]
[If Platform: Modules Analyzed: [list]]

Blockers Identified:
- Critical: [X] blockers
- High: [X] blockers
- Medium: [X] blockers
- Low: [X] blockers

Most Urgent Actions:
1. [Action 1] - Owner: [X] - Deadline: [X]
2. [Action 2] - Owner: [X] - Deadline: [X]
3. [Action 3] - Owner: [X] - Deadline: [X]

Files Created:
- specwright/product/blocker-analysis.md
[If Platform: - specwright/product/modules/[module]/blocker-analysis.md for each module]

Recommended Next Steps:
1. Share blocker-analysis.md with project stakeholders
2. Assign owners to unassigned blockers
3. Create calendar reminders for blocker deadlines
4. Schedule kick-off meetings with external providers
5. Re-run /analyze-blockers periodically to track status updates
```

</step>

</process_flow>

## Blocker Categories Reference

| Category | Examples |
|----------|----------|
| Stakeholder | Content, designs, requirements, approvals, test data |
| External System | API keys, database access, VPN, service accounts |
| License | Software licenses, third-party services, contracts |
| Infrastructure | Servers, hosting, domains, SSL, DNS |
| Skills | Specialized expertise, training, consultants |
| Budget | Hardware, software, services, contractor fees |
| Compliance | Security audit, legal review, accessibility, GDPR |

## Severity Levels Reference

| Severity | Description | Action Required |
|----------|-------------|-----------------|
| Critical | Blocks entire project | Resolve before any development |
| High | Blocks specific phase | Resolve before that phase starts |
| Medium | Causes delays | Plan mitigation, track closely |
| Low | Workaround available | Document workaround, resolve when possible |

## Execution Summary

**Duration:** 10-20 minutes
**User Interactions:** 1 review gate
**Output:** 1 file (product) or N+1 files (platform with N modules)
