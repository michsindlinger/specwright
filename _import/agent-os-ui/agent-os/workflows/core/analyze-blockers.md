---
description: Identify external dependencies and blockers that could delay project delivery
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
installation: global
---

# Blocker Analysis Workflow

Systematically identify external dependencies, blockers, and prerequisites that could delay or prevent project delivery. Essential for realistic project planning and stakeholder communication.

**Use Cases:**
- New project kick-offs (identify dependencies early)
- Project scoping (realistic delivery estimates)
- Stakeholder communication (what's needed for success)
- Risk assessment (what could block progress)

<pre_flight_check>
  EXECUTE: @agent-os/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="detect_project_type">

### Step 1: Detect Project Type

Determine if this is a single product or platform with multiple modules.

<detection_logic>
  CHECK for project documentation:

  IF agent-os/product/platform-brief.md EXISTS:
    PROJECT_TYPE = "platform"
    LOAD: platform-brief.md
    SCAN: agent-os/product/modules/*/module-brief.md
    SET: modules = list of all module directories
    INFORM user: "Detected platform project with [N] modules: [module names]"
    PROCEED to step 2a

  ELSE IF agent-os/product/product-brief.md EXISTS:
    PROJECT_TYPE = "product"
    LOAD: product-brief.md
    INFORM user: "Detected single product project"
    PROCEED to step 2b

  ELSE:
    ERROR: "No product-brief.md or platform-brief.md found."
    SUGGEST: "Run /plan-product or /plan-platform first to create project documentation."
    ABORT workflow
</detection_logic>

</step>

<step number="2a" subagent="business-analyst" name="platform_analysis">

### Step 2a: Platform-Wide Blocker Analysis (Platform Projects)

For platform projects, analyze at two levels: platform-wide and per-module.

<delegation>
  DELEGATE to business-analyst via Task tool:

  PROMPT:
  "Analyze platform for external dependencies and blockers.

  Context:
  - Platform Brief: agent-os/product/platform-brief.md
  - Tech Stack: agent-os/product/tech-stack.md (if exists)
  - Module Briefs: agent-os/product/modules/*/module-brief.md
  - Platform Roadmap: agent-os/product/roadmap/platform-roadmap.md (if exists)
  - Module Dependencies: agent-os/product/architecture/module-dependencies.md (if exists)

  Tasks:
  1. Load blocker-analysis-template.md (hybrid lookup: project -> global)

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

  6. Write PLATFORM OVERVIEW to: agent-os/product/blocker-analysis.md
  7. Write per-module details to: agent-os/product/modules/[module-name]/blocker-analysis.md

  Templates (hybrid lookup):
  - TRY: agent-os/templates/product/blocker-analysis-template.md
  - FALLBACK: ~/.agent-os/templates/product/blocker-analysis-template.md

  Output must include:
  - Executive summary (critical blockers count)
  - Platform-wide blockers section
  - Per-module blockers sections
  - Timeline view (when each blocker must be resolved)
  - Action items (who needs to do what, by when)"

  WAIT for business-analyst completion
  RECEIVE blocker-analysis files
</delegation>

PROCEED to step 3

</step>

<step number="2b" subagent="business-analyst" name="product_analysis">

### Step 2b: Product Blocker Analysis (Single Product Projects)

For single product projects, analyze all dependencies.

<delegation>
  DELEGATE to business-analyst via Task tool:

  PROMPT:
  "Analyze product for external dependencies and blockers.

  Context:
  - Product Brief: agent-os/product/product-brief.md
  - Tech Stack: agent-os/product/tech-stack.md (if exists)
  - Roadmap: agent-os/product/roadmap.md (if exists)
  - Architecture: agent-os/product/architecture-decision.md (if exists)

  Tasks:
  1. Load blocker-analysis-template.md (hybrid lookup: project -> global)

  2. Analyze for external dependencies in these categories:

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

  3. For each identified blocker, document:
     - Description: What is needed
     - Category: Which category above
     - Severity: Critical | High | Medium | Low
     - Status: Unknown | Requested | In Progress | Resolved
     - Owner: Who provides/resolves this (person/role/department)
     - Needed By: When must this be resolved (map to roadmap phase)
     - Impact: What cannot proceed without this
     - Notes: Additional context, alternatives

  4. Create timeline view:
     - Phase 1 blockers (resolve before development starts)
     - Phase 2 blockers (resolve before feature X)
     - Ongoing blockers (continuous dependencies)

  5. Generate action items:
     - Immediate actions (this week)
     - Short-term actions (this month)
     - Planning actions (before phase X)

  6. Write to: agent-os/product/blocker-analysis.md

  Templates (hybrid lookup):
  - TRY: agent-os/templates/product/blocker-analysis-template.md
  - FALLBACK: ~/.agent-os/templates/product/blocker-analysis-template.md

  Output must include:
  - Executive summary with blocker counts by severity
  - Categorized blocker list with all fields
  - Timeline view mapped to roadmap
  - Action items with owners"

  WAIT for business-analyst completion
  RECEIVE blocker-analysis.md
</delegation>

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

Please review: agent-os/product/blocker-analysis.md
[If platform: Also check per-module analyses in agent-os/product/modules/*/blocker-analysis.md]

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

Present summary and actionable next steps.

**Summary Template:**
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
- agent-os/product/blocker-analysis.md
[If Platform: - agent-os/product/modules/[module]/blocker-analysis.md for each module]

Recommended Next Steps:
1. Share blocker-analysis.md with project stakeholders
2. Assign owners to unassigned blockers
3. Create calendar reminders for blocker deadlines
4. Schedule kick-off meetings with external providers
5. Re-run /analyze-blockers periodically to track status updates
```

</step>

</process_flow>

## Output Files

| File | Description | When Created |
|------|-------------|--------------|
| agent-os/product/blocker-analysis.md | Main analysis (or platform overview) | Always |
| agent-os/product/modules/[name]/blocker-analysis.md | Per-module analysis | Platform only |

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
