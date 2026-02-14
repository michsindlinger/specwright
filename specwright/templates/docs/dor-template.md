# Definition of Ready (DoR)

> Project: [PROJECT_NAME]
> Created: [CREATED_DATE]
> Last Updated: [LAST_UPDATED_DATE]
> Version: [VERSION]

## Purpose

The Definition of Ready ensures that user stories are sufficiently detailed and prepared before development begins. A story should not be pulled into a sprint unless it meets all DoR criteria.

---

## Universal DoR Criteria

These criteria apply to ALL stories before they can be started.

### Story Clarity

- [ ] User story follows the format: "As a [role], I want [action], so that [benefit]"
- [ ] Story title is clear and descriptive
- [ ] Story description provides sufficient context
- [ ] Business value and user benefit are clear
- [ ] Story is sized appropriately (completable within one sprint)
- [ ] Story is independent (not tightly coupled to other stories)

### Acceptance Criteria

- [ ] Acceptance criteria are clearly defined
- [ ] Acceptance criteria are specific and testable
- [ ] Edge cases are identified in acceptance criteria
- [ ] Error scenarios are included in acceptance criteria
- [ ] Success criteria are measurable
- [ ] Criteria use Given/When/Then format (where appropriate)

### Dependencies

- [ ] All dependencies identified (other stories, systems, APIs)
- [ ] Blocking dependencies are resolved or have clear timeline
- [ ] Required external services/APIs are available
- [ ] Required third-party integrations are documented
- [ ] Database dependencies identified
- [ ] Team dependencies identified (design, content, etc.)

### Design & UX

- [ ] UI/UX designs available (if applicable)
- [ ] Design approved by stakeholders
- [ ] Mobile and desktop designs provided (if applicable)
- [ ] Design system components identified
- [ ] Interaction patterns documented
- [ ] Accessibility requirements specified
- [ ] User flows documented (if complex)

### Technical Clarity

- [ ] Technical approach discussed with team
- [ ] Architecture decisions documented (if significant)
- [ ] API contracts defined (if new endpoints)
- [ ] Database schema changes identified
- [ ] Performance requirements specified
- [ ] Security requirements identified
- [ ] Known technical constraints documented

### Resources & Environment

- [ ] Required skills available in team
- [ ] Development environment ready
- [ ] Test data available or can be created
- [ ] Access to required systems/services granted
- [ ] Required accounts/credentials available
- [ ] Third-party API keys/tokens available (if needed)

### Estimation & Priority

- [ ] Story estimated by development team (story points or hours)
- [ ] Estimation confidence is reasonable (not a wild guess)
- [ ] Priority assigned by product owner
- [ ] Story fits within sprint capacity
- [ ] Risk level assessed (Low, Medium, High)

### Testing Requirements

- [ ] Test scenarios documented
- [ ] Testing approach discussed
- [ ] Test data requirements identified
- [ ] Automation strategy determined
- [ ] Performance testing needs identified (if applicable)
- [ ] Security testing needs identified (if applicable)

### Documentation Requirements

- [ ] Documentation needs identified
- [ ] API documentation requirements specified
- [ ] User documentation requirements specified
- [ ] Changelog impact identified

---

## Story-Type Specific DoR

### Frontend Stories

Additional criteria for frontend-focused stories:

- [ ] Design mockups in Figma/design tool
- [ ] Component breakdown identified
- [ ] Responsive behavior specified (mobile, tablet, desktop)
- [ ] Browser support requirements confirmed
- [ ] Animation/interaction requirements documented
- [ ] Accessibility requirements (WCAG level) specified
- [ ] Analytics tracking requirements identified

### Backend Stories

Additional criteria for backend-focused stories:

- [ ] API endpoint specifications defined
- [ ] Request/response schemas documented
- [ ] Database schema changes specified
- [ ] Migration strategy discussed
- [ ] Data validation rules defined
- [ ] Error handling approach documented
- [ ] Performance benchmarks defined
- [ ] Scalability considerations discussed

### Infrastructure Stories

Additional criteria for infrastructure/DevOps stories:

- [ ] Infrastructure requirements specified
- [ ] Cost estimate provided and approved
- [ ] Security implications reviewed
- [ ] Monitoring and alerting strategy defined
- [ ] Rollback plan documented
- [ ] Disaster recovery impact assessed
- [ ] Compliance requirements identified
- [ ] Runbook template prepared

### Bug Fix Stories

Additional criteria for bug fixes:

- [ ] Bug is reproducible with clear steps
- [ ] Root cause identified or hypothesized
- [ ] Affected users/scope quantified
- [ ] Workaround documented (if available)
- [ ] Priority based on impact assessment
- [ ] Regression test approach defined
- [ ] Production deployment risk assessed

### Research/Spike Stories

Additional criteria for research/spike stories:

- [ ] Research questions clearly defined
- [ ] Success criteria for spike specified
- [ ] Time-box agreed upon (typically 1-2 days)
- [ ] Output format specified (document, POC, recommendation)
- [ ] Follow-up action plan considered
- [ ] Who will review findings identified

---

## DoR Checklist by Role

### Product Owner Responsibilities

- [ ] Story prioritized in backlog
- [ ] Business value articulated
- [ ] Acceptance criteria defined
- [ ] Stakeholder approval obtained (if needed)
- [ ] Available for questions during sprint

### Designer Responsibilities

- [ ] Design mockups completed
- [ ] Design review conducted
- [ ] Design assets exported/available
- [ ] Responsive behavior specified
- [ ] Accessibility considerations documented

### Technical Lead Responsibilities

- [ ] Technical approach reviewed
- [ ] Architecture impact assessed
- [ ] Technical risks identified
- [ ] Code review assignment planned
- [ ] Integration points validated

### Development Team Responsibilities

- [ ] Story understood by team
- [ ] Story estimated
- [ ] Technical questions answered
- [ ] Testing strategy agreed upon
- [ ] Implementation approach discussed

---

## DoR Validation Process

### When to Check DoR

1. **Backlog Refinement**: Review stories before refinement meeting
2. **Sprint Planning**: Final DoR check before pulling into sprint
3. **Story Start**: Quick DoR revalidation before beginning work

### DoR Review Checklist

Use this quick checklist during sprint planning:

```markdown
**Story**: [STORY_ID] - [STORY_TITLE]

**Quick DoR Check**:
- [ ] Clear user story and benefit
- [ ] Testable acceptance criteria
- [ ] No blocking dependencies
- [ ] Design available (if needed)
- [ ] Technical approach clear
- [ ] Estimated and prioritized
- [ ] Team has required skills/access

**DoR Status**: ✅ Ready | ⚠️ Almost Ready | ❌ Not Ready

**Blockers**: [LIST_ANY_BLOCKERS]

**Action Items**: [LIST_WHAT_NEEDS_TO_BE_DONE]
```

### What to Do When DoR Not Met

If a story doesn't meet DoR:

1. **Identify Gaps**: Clearly list what's missing
2. **Assign Owners**: Who will address each gap
3. **Set Timeline**: When will gaps be resolved
4. **Defer if Needed**: Don't pull into sprint if not ready
5. **Document**: Note why story was deferred

Example:
```markdown
**Story TASK-123 deferred from Sprint 15**

**DoR Gaps**:
- Missing: Design mockups for mobile view
- Missing: API endpoint specification for user endpoint
- Missing: Test data for edge case scenario

**Action Items**:
- @designer will provide mobile mockups by Thursday
- @tech-lead will define API contract by Wednesday
- @developer-1 will create test data fixtures by Thursday

**Target Sprint**: Sprint 16 (pending gap resolution)
```

---

## DoR Evolution

This Definition of Ready is a living document. Update it as the team learns and processes mature.

### When to Update DoR

- Sprint retrospectives identify preparation gaps
- Team capabilities expand
- New story types emerge
- Process improvements identified
- Tools or technologies change

### Update Process

1. Propose change in backlog refinement or retrospective
2. Discuss impact with team
3. Trial new criteria for one sprint
4. Gather feedback
5. Adopt or reject based on results
6. Update this document
7. Communicate changes to all stakeholders

---

## Template Usage Instructions

### Placeholders

- `[PROJECT_NAME]`: Name of the project
- `[CREATED_DATE]`: ISO date format (YYYY-MM-DD)
- `[LAST_UPDATED_DATE]`: ISO date format (YYYY-MM-DD)
- `[VERSION]`: Version number of DoR document
- `[STORY_ID]`: Story identifier
- `[STORY_TITLE]`: Story title
- `[LIST_ANY_BLOCKERS]`: List of blocking issues
- `[LIST_WHAT_NEEDS_TO_BE_DONE]`: Action items to achieve DoR

### Customization Guidelines

**For Small Teams/Projects**:
- May combine some criteria
- May reduce documentation requirements
- May simplify design requirements
- Focus on minimum viable preparation

**For Large Teams/Projects**:
- May add approval workflows
- May require multiple stakeholder sign-offs
- May add compliance checks
- May require formal technical review

**For Startups/MVP**:
- May reduce design detail requirements
- May accept higher uncertainty in estimates
- May defer some documentation
- Focus on learning and iteration

**For Enterprise**:
- May add compliance approval requirements
- May require security review
- May need change management approval
- May require legal review for certain features

### Implementation Tips

1. **Start Simple**: Begin with core criteria, add more as needed
2. **Be Realistic**: Criteria should be achievable given team constraints
3. **Enforce Consistently**: Don't make exceptions without documenting why
4. **Review Regularly**: Check DoR effectiveness in retrospectives
5. **Automate Checks**: Use templates and checklists in project management tools
6. **Educate Team**: Ensure everyone understands why DoR matters

### Example (Customized for SaaS Web Application)

```markdown
# Definition of Ready (DoR)

> Project: TaskFlow SaaS Platform
> Created: 2026-01-09
> Last Updated: 2026-01-09
> Version: 1.0.0

## Purpose

The Definition of Ready ensures that user stories are sufficiently detailed and prepared before development begins. A story should not be pulled into a sprint unless it meets all DoR criteria.

---

## Universal DoR Criteria

These criteria apply to ALL stories before they can be started.

### Story Clarity

- [ ] User story follows format: "As a [role], I want [action], so that [benefit]"
- [ ] Story title is clear and descriptive
- [ ] Story description provides context and background
- [ ] Business value is clearly articulated
- [ ] Story is sized 1-5 story points (larger stories must be broken down)
- [ ] Story is independent (not dependent on in-progress work)

### Acceptance Criteria

- [ ] At least 3 specific acceptance criteria defined
- [ ] Criteria are testable (can verify pass/fail)
- [ ] Edge cases included (empty states, errors, limits)
- [ ] Error scenarios documented
- [ ] Success metrics defined (analytics, performance)

### Dependencies

- [ ] All blocking stories identified and completed
- [ ] Required APIs available or mocked
- [ ] Third-party service access confirmed
- [ ] Database access/credentials available
- [ ] Design dependencies resolved

### Design & UX

- [ ] Figma designs linked in story (if UI changes)
- [ ] Desktop and mobile views provided
- [ ] Design approved by Product Owner
- [ ] Design system components identified (Button, Card, Modal, etc.)
- [ ] Error states designed
- [ ] Loading states designed
- [ ] WCAG 2.1 AA requirements noted

### Technical Clarity

- [ ] Technical approach discussed in team meeting
- [ ] Cross-cutting decisions documented (if architectural impact)
- [ ] API endpoints defined in API spec doc (if new API)
- [ ] Database schema changes in technical spec (if DB changes)
- [ ] Performance target: Page load < 2s, API response < 500ms
- [ ] Security checklist reviewed (authentication, authorization, input validation)

### Resources & Environment

- [ ] Developer with required skills available
- [ ] Local development environment setup documented
- [ ] Staging environment available for testing
- [ ] Test user accounts available
- [ ] Required API keys in 1Password team vault

### Estimation & Priority

- [ ] Story estimated using planning poker (team consensus)
- [ ] Team confidence level: High (not a complete unknown)
- [ ] Priority set by Product Owner (Critical, High, Medium, Low)
- [ ] Story fits in current sprint (based on team velocity ~25 points/sprint)
- [ ] Risk assessed: Low (standard feature), Medium (new tech), High (mission-critical)

### Testing Requirements

- [ ] Happy path test scenarios documented
- [ ] Edge case test scenarios documented
- [ ] Unit test expectations clear
- [ ] Integration test needs identified
- [ ] Manual QA test plan outlined

### Documentation Requirements

- [ ] README update needed: Yes/No
- [ ] API docs update needed: Yes/No
- [ ] User docs needed: Yes/No (if yes, draft outline provided)
- [ ] CHANGELOG category identified: Added, Changed, Fixed, etc.

---

## Story-Type Specific DoR

### Frontend Stories

- [ ] Figma designs linked and approved
- [ ] Component hierarchy mapped (ProfileCard > Avatar + ProfileInfo)
- [ ] Responsive breakpoints defined: mobile (375px), tablet (768px), desktop (1440px)
- [ ] Browser support: Chrome, Firefox, Safari, Edge (latest 2 versions)
- [ ] Animations/transitions specified (duration, easing)
- [ ] WCAG AA compliance requirements reviewed
- [ ] Google Analytics events defined (if tracking needed)

### Backend Stories

- [ ] API endpoint specification: POST /api/v1/users (example)
- [ ] Request schema documented (JSON example)
- [ ] Response schema documented (success + error cases)
- [ ] Database migration script drafted
- [ ] Data validation rules defined (email format, password strength, etc.)
- [ ] Error codes defined (400, 401, 404, 422, 500)
- [ ] Performance target: < 100ms for simple queries, < 500ms for complex
- [ ] Caching strategy: Redis for session data, query caching for reports

### Bug Fix Stories

- [ ] Bug reproduction steps documented (numbered list)
- [ ] Root cause identified or best hypothesis documented
- [ ] Affected users: 100 users/day, 5% of user base, etc.
- [ ] Workaround documented (if available)
- [ ] Priority based on severity matrix:
  - Critical: System down, data loss
  - High: Major feature broken, many users affected
  - Medium: Minor feature broken, workaround exists
  - Low: Cosmetic issue
- [ ] Regression test approach: unit test for specific bug condition

---

## DoR Validation Process

### Sprint Planning DoR Check

Use this checklist when reviewing stories in sprint planning:

**Story**: TASK-125 - Add profile picture upload

**Quick DoR Check**:
- [x] Clear user story: "As a user, I want to upload a profile picture, so that my profile is personalized"
- [x] Testable acceptance criteria: Upload flow, cropping, size limits, error handling
- [x] No blocking dependencies (authentication story TASK-100 is complete)
- [x] Design available: Figma link provided, approved
- [x] Technical approach clear: ActiveStorage + Cropper.js
- [x] Estimated: 5 story points (team consensus)
- [x] Team has skills: React, Rails, S3 integration

**DoR Status**: ✅ Ready

**Notes**: All criteria met, ready to pull into Sprint 15.

---

### DoR Gap Example

**Story**: TASK-126 - Implement user notifications

**Quick DoR Check**:
- [x] Clear user story
- [x] Acceptance criteria defined
- [❌] Blocking dependency: Email service integration (TASK-120) not complete
- [⚠️] Design missing: notification icon states not designed
- [x] Technical approach discussed
- [❌] Not estimated: team needs more technical detail
- [x] Team has skills

**DoR Status**: ❌ Not Ready

**Blockers**:
- TASK-120 (Email service) must complete first
- Missing notification icon states design
- Needs technical breakdown session for estimation

**Action Items**:
- Wait for TASK-120 to complete (expected Thursday)
- @designer to provide notification icon states by Wednesday
- Schedule technical breakdown meeting Tuesday 2pm
- Target Sprint 16

---

## DoR Evolution

Last reviewed: 2026-01-09
Next review: 2026-04-09 (quarterly)

**Recent Changes**:
- v1.0.0 (2026-01-09): Initial DoR established for TaskFlow project

**Proposed Changes**:
- None currently

**Retrospective Feedback**:
- Team finds DoR helpful for preventing mid-sprint blockers
- Design handoff sometimes happens too late - considering adding "design review 1 week before sprint" requirement
```

---

## Benefits of DoR

**For Developers**:
- Clear requirements before starting work
- Reduced mid-sprint surprises and blockers
- Better estimates with complete information

**For Product Owners**:
- Forces clarification of requirements upfront
- Reduces rework and scope creep
- Better sprint planning and predictability

**For Teams**:
- Shared understanding of readiness
- Fewer mid-sprint scope discussions
- Higher velocity and fewer story carryovers
- Better work-life balance (fewer urgent clarifications)

---

## Common DoR Pitfalls

1. **Too Rigid**: DoR should be a guideline, not a bureaucratic blocker
2. **Too Loose**: If most stories fail mid-sprint, DoR is too lenient
3. **Not Enforced**: DoR only works if team consistently checks it
4. **Not Updated**: DoR should evolve with team maturity
5. **Blame Culture**: DoR is for quality, not to blame people for gaps

**Remember**: The goal is better preparation, not perfection. Use DoR to improve flow, not to create bottlenecks.
