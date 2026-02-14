# Backlog Organization Skill

> Template for Product Owner backlog management and prioritization
> Created: 2026-01-09
> Version: 1.0.0

## Skill Name
**backlog-organization** - Master backlog management, prioritization, and roadmap alignment

## Purpose
Enable systematic backlog organization using MoSCoW prioritization, epic/story hierarchy, and sprint planning to maintain a healthy, actionable product backlog.

## When to Activate

Activate this skill when:
- Creating or reorganizing the product backlog
- Prioritizing features for upcoming sprints
- Breaking down epics into user stories
- Grooming backlog items for development readiness
- Aligning backlog with product roadmap
- Managing technical debt vs. feature work balance

## Core Capabilities

### 1. Backlog Structuring
- **Epic Definition**: Create high-level feature groupings
- **Story Breakdown**: Decompose epics into actionable user stories
- **Hierarchy Management**: Maintain clear parent-child relationships
- **Dependency Mapping**: Identify and document story dependencies

### 2. Prioritization Frameworks

#### MoSCoW Prioritization
- **Must Have**: Critical for release, non-negotiable
- **Should Have**: Important but not vital, has workarounds
- **Could Have**: Desirable if resources permit
- **Won't Have**: Explicitly out of scope for this release

#### RICE Scoring (Optional)
- **Reach**: Number of users affected
- **Impact**: Effect on individual users (1-5 scale)
- **Confidence**: Certainty in estimates (percentage)
- **Effort**: Time/resources required (person-months)

### 3. Sprint Planning Support
- **Velocity Tracking**: Monitor team capacity and throughput
- **Story Pointing**: Facilitate estimation sessions
- **Sprint Goal Alignment**: Ensure stories support sprint objectives
- **Capacity Planning**: Balance story points with team availability

### 4. Backlog Health Metrics
- **Ready Stories**: Maintain 2+ sprints of ready stories
- **Grooming Cadence**: Regular backlog refinement sessions
- **Age Monitoring**: Track and address stale backlog items
- **Technical Debt Ratio**: Balance feature work vs. tech debt (typically 20-30%)

## [TECH_STACK_SPECIFIC] Considerations

While backlog organization is largely tool-agnostic, consider:
- Integration with issue tracking systems (GitHub Issues, Jira, Linear)
- Linking specs to `.specwright/specs/` documentation
- Tagging stories with technical components or services

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - github - Access issues, projects, and backlog management
     - fetch - Retrieve specifications and product documentation
     - filesystem - Manage backlog artifacts and roadmap files

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Backlog Management
- Issue tracking platform (GitHub Projects, Jira, Linear, etc.)
- Roadmap visualization tool
- Sprint planning board

### Documentation
- Access to `.specwright/product/roadmap.md`
- Access to `.specwright/specs/` for feature specifications
- Product decisions log at `specwright/product/architecture-decision.md`

### Communication
- Team collaboration platform
- Stakeholder communication channels

## Quality Checklist

Before considering backlog organized:

- [ ] All epics have clear business value statements
- [ ] Stories follow INVEST criteria (see below)
- [ ] Priorities clearly marked using MoSCoW or similar framework
- [ ] Top 2 sprints worth of stories are "Ready for Development"
- [ ] Dependencies identified and documented
- [ ] Story point estimates assigned (where applicable)
- [ ] Acceptance criteria defined for all ready stories
- [ ] Technical debt items identified and balanced with features
- [ ] Roadmap alignment verified for prioritized items
- [ ] Stakeholder input incorporated into priorities

## INVEST Criteria for User Stories

Every user story should be:
- **Independent**: Can be developed in any order
- **Negotiable**: Details can be discussed and refined
- **Valuable**: Delivers clear value to users or business
- **Estimable**: Team can estimate the effort required
- **Small**: Can be completed within a single sprint
- **Testable**: Has clear acceptance criteria

## Backlog Item Template

```markdown
### Epic: [Epic Name]

**Business Value**: [Why this epic matters to users/business]
**Target Release**: [Release version or timeframe]
**Priority**: [Must Have | Should Have | Could Have | Won't Have]

#### User Stories

---

**Story**: [Story Title]
**As a** [user type]
**I want** [goal/desire]
**So that** [benefit/value]

**Priority**: [Must Have | Should Have | Could Have]
**Story Points**: [Estimate]
**Dependencies**: [List any dependent stories]
**Spec Reference**: .specwright/specs/[spec-folder]/

**Acceptance Criteria**:
- [ ] [Specific testable criterion]
- [ ] [Specific testable criterion]
- [ ] [Specific testable criterion]

**Technical Notes**:
- [Any technical considerations]
- [Integration points]

**Definition of Done**:
- [ ] Code complete and reviewed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Acceptance criteria verified
- [ ] Deployed to staging environment

---
```

## Prioritization Examples

### Example 1: Feature Prioritization

**Epic**: User Authentication System

**Breakdown**:
1. **Must Have** - Basic email/password login (blocks all user features)
2. **Must Have** - Password reset functionality (critical for user recovery)
3. **Should Have** - OAuth integration (improves UX but has workaround)
4. **Could Have** - Two-factor authentication (security enhancement)
5. **Won't Have** - Biometric authentication (future consideration)

**Rationale**: Focus on core authentication first, then enhance security and convenience.

### Example 2: Technical Debt vs. Features

**Sprint Capacity**: 40 story points

**Allocation**:
- **28 points (70%)** - New feature development
  - Payment integration (Must Have): 13 points
  - User dashboard improvements (Should Have): 8 points
  - Email notifications (Should Have): 7 points
- **12 points (30%)** - Technical debt
  - Database query optimization: 5 points
  - Test coverage improvement: 4 points
  - Dependency updates: 3 points

**Rationale**: Maintain healthy codebase while delivering business value.

## Sprint Planning Flow

### Pre-Sprint Preparation
1. Review roadmap and upcoming milestones
2. Groom top backlog items with team
3. Ensure acceptance criteria are clear
4. Identify dependencies and blockers
5. Prepare sprint goal candidates

### Sprint Planning Meeting
1. **Present sprint goal** (15 min)
2. **Review prioritized stories** (30 min)
3. **Team capacity assessment** (15 min)
4. **Story selection and commitment** (45 min)
5. **Task breakdown** (optional, 30 min)
6. **Final sprint backlog confirmation** (15 min)

### Post-Planning
1. Update backlog priorities based on team feedback
2. Document sprint commitment
3. Communicate sprint goal to stakeholders
4. Schedule mid-sprint check-in

## Backlog Grooming Session Template

**Frequency**: Weekly, 1-2 hours
**Participants**: PO, Development Team, Scrum Master (if applicable)

**Agenda**:
1. **Review new items** (20 min)
   - Clarify requirements
   - Assign initial priorities
2. **Refine upcoming stories** (40 min)
   - Add acceptance criteria
   - Break down large stories
   - Estimate effort
3. **Re-prioritize backlog** (20 min)
   - Adjust based on new information
   - Balance technical debt
4. **Dependency check** (10 min)
   - Update dependency map
   - Flag blockers
5. **Next actions** (10 min)
   - Assign follow-up tasks
   - Schedule stakeholder conversations

## Anti-Patterns to Avoid

- **Waterfall Backlog**: Don't plan everything upfront, maintain flexibility
- **Unchanging Priorities**: Backlog should evolve with learning
- **No Technical Debt**: Always allocate time for code health
- **Skipping Refinement**: Regular grooming prevents planning bottlenecks
- **Over-Detailed Future Items**: Detail should match timeline
- **Ignoring Dependencies**: Track and communicate blockers early
- **Feature Factory**: Balance output with outcomes and user impact

## Integration with Specwright

### Spec Creation
When prioritizing new features:
```bash
create-spec  # Generate detailed specification for Must Have items
```

### Roadmap Alignment
Reference: `.specwright/product/roadmap.md`
- Ensure backlog priorities align with roadmap phases
- Update roadmap when priorities shift significantly

### Decision Documentation
When making significant prioritization decisions:
- Document in `specwright/product/architecture-decision.md`
- Include stakeholder input and rationale

## Success Metrics

Track backlog health through:
- **Ready Ratio**: % of stories ready for development
- **Age Distribution**: How long stories stay in backlog
- **Completion Rate**: Sprint commitment vs. completion
- **Scope Changes**: Mid-sprint additions/removals
- **Stakeholder Satisfaction**: Feedback on delivered value

---

**Remember**: A well-organized backlog is a living document that balances business value, technical health, and team capacity. Prioritize ruthlessly, communicate transparently, and adjust based on learning.
