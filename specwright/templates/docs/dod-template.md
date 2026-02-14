# Definition of Done (DoD)

> Project: [PROJECT_NAME]
> Created: [CREATED_DATE]
> Last Updated: [LAST_UPDATED_DATE]
> Version: [VERSION]

## Purpose

The Definition of Done is a shared understanding of what it means for work to be complete. A story is not considered "done" until all DoD criteria are met.

---

## Universal DoD Criteria

These criteria apply to ALL stories unless explicitly exempted.

### Code Quality

- [ ] Code follows project style guide
      (Project: @.specwright/standards/code-style.md OR Global: @~/.specwright/standards/code-style.md)
- [ ] Code follows best practices
      (Project: @.specwright/standards/best-practices.md OR Global: @~/.specwright/standards/best-practices.md)
- [ ] Code is DRY (no unnecessary duplication)
- [ ] Code is readable and self-documenting
- [ ] Complex logic includes explanatory comments
- [ ] No commented-out code blocks (unless explicitly documented why)
- [ ] No debug statements (console.log, debugger, etc.)
- [ ] No hardcoded values (use constants or configuration)

### Functionality

- [ ] All acceptance criteria met
- [ ] Feature works as described in user story
- [ ] Edge cases handled appropriately
- [ ] Error states handled gracefully
- [ ] Loading states implemented where appropriate
- [ ] User feedback provided for all actions

### Testing

- [ ] Unit tests written and passing
- [ ] Integration tests written and passing (where applicable)
- [ ] Test coverage meets minimum threshold ([COVERAGE_THRESHOLD]%)
- [ ] All existing tests still passing
- [ ] Manual testing completed on all supported browsers/devices
- [ ] Accessibility testing completed (keyboard navigation, screen readers)

### Code Review

- [ ] Code reviewed by at least [REVIEWER_COUNT] team member(s)
- [ ] All review comments addressed or discussed
- [ ] PR approved by required reviewers
- [ ] No unresolved conversations in PR

### Documentation

- [ ] Code includes JSDoc/RDoc comments for public APIs
- [ ] README updated if new setup steps required
- [ ] API documentation updated (if API changes)
- [ ] User documentation updated (if user-facing changes)
- [ ] Inline comments added for complex logic
- [ ] CHANGELOG entry added

### Quality Checks

- [ ] No linting errors (`npm run lint` or `bundle exec rubocop`)
- [ ] No TypeScript errors (if applicable)
- [ ] No console warnings in browser
- [ ] No database N+1 queries introduced
- [ ] Performance acceptable (no significant degradation)

### Security

- [ ] No secrets committed to repository
- [ ] User input properly validated and sanitized
- [ ] Authorization checks in place
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (escaped output)
- [ ] CSRF protection enabled (where applicable)

### Deployment

- [ ] Code merged to main/staging branch
- [ ] Deployed to staging environment
- [ ] Smoke tests passed in staging
- [ ] Database migrations run successfully (if applicable)
- [ ] Environment variables configured (if new ones added)
- [ ] Deployed to production
- [ ] Smoke tests passed in production

### Product Acceptance

- [ ] Product owner reviewed and accepted
- [ ] Stakeholder demo completed (if required)
- [ ] User feedback collected (if beta/pilot)

---

## Story-Type Specific DoD

### Frontend Stories

Additional criteria for frontend-focused stories:

- [ ] Responsive design implemented (mobile, tablet, desktop)
- [ ] Cross-browser testing completed ([BROWSER_LIST])
- [ ] Accessibility audit passed (WCAG [WCAG_LEVEL])
- [ ] Images optimized (WebP format, appropriate sizes)
- [ ] Loading states and skeletons implemented
- [ ] Error boundaries implemented (React)
- [ ] Analytics events instrumented (if applicable)

### Backend Stories

Additional criteria for backend-focused stories:

- [ ] Database indexes added where appropriate
- [ ] Background jobs tested and monitored
- [ ] API versioning considered
- [ ] Rate limiting implemented (if public API)
- [ ] Caching strategy implemented (where beneficial)
- [ ] Database migrations are reversible
- [ ] Query performance tested with realistic data volumes

### Infrastructure Stories

Additional criteria for infrastructure/DevOps stories:

- [ ] Infrastructure as Code updated (Terraform, CloudFormation, etc.)
- [ ] Monitoring and alerts configured
- [ ] Runbook/operations documentation updated
- [ ] Rollback procedure documented and tested
- [ ] Security scanning completed
- [ ] Cost impact assessed and approved
- [ ] Disaster recovery tested

### Bug Fix Stories

Additional criteria for bug fixes:

- [ ] Root cause identified and documented
- [ ] Regression test added to prevent recurrence
- [ ] Related bugs checked and fixed
- [ ] Fix verified in production-like environment
- [ ] Customer support team notified of fix
- [ ] Post-mortem completed (if critical bug)

---

## DoD Checklist by Phase

### Before Starting (DoR Check)

- [ ] Story meets Definition of Ready criteria
- [ ] All dependencies resolved
- [ ] Required resources available

### During Development

- [ ] Tests written (TDD approach encouraged)
- [ ] Code quality criteria maintained
- [ ] Regular commits with clear messages

### Before PR Submission

- [ ] All tests passing locally
- [ ] Linting passes
- [ ] Self-code review completed
- [ ] Documentation updated

### During Code Review

- [ ] Address all review comments
- [ ] Update tests if logic changed
- [ ] Rebase/merge with main branch

### Before Deployment

- [ ] Staging deployment successful
- [ ] Stakeholder approval obtained
- [ ] Deployment plan reviewed

### After Deployment

- [ ] Production smoke tests passed
- [ ] Monitoring confirms expected behavior
- [ ] No alerts or errors
- [ ] Product owner acceptance

---

## Exemptions

Some stories may be exempt from certain DoD criteria. Document exemptions explicitly:

### When Exemptions Are Allowed

- Proof of concept or spike stories (document which criteria skipped)
- Emergency hotfixes (document technical debt created)
- Deprecated features being removed (may skip some testing)

### Documenting Exemptions

```markdown
**DoD Exemptions for Story [STORY_ID]**:
- Skipped integration tests (reason: spike/POC only)
- Skipped cross-browser testing (reason: internal tool, Chrome-only)
- Created technical debt item: [DEBT_ID]
```

---

## DoD Evolution

This Definition of Done is a living document. Update it as the team learns and processes mature.

### When to Update DoD

- Sprint retrospectives identify process improvements
- New tools or technologies adopted
- Team capabilities expand
- Quality issues indicate gaps in DoD

### Update Process

1. Propose change in team meeting
2. Discuss impact and feasibility
3. Gain team consensus
4. Update this document
5. Communicate changes to all team members
6. Set effective date for new criteria

---

## Template Usage Instructions

### Placeholders

- `[PROJECT_NAME]`: Name of the project
- `[CREATED_DATE]`: ISO date format (YYYY-MM-DD)
- `[LAST_UPDATED_DATE]`: ISO date format (YYYY-MM-DD)
- `[VERSION]`: Version number of DoD document
- `[COVERAGE_THRESHOLD]`: Minimum test coverage percentage (e.g., 80)
- `[REVIEWER_COUNT]`: Number of required code reviewers (e.g., 1 or 2)
- `[BROWSER_LIST]`: Supported browsers (e.g., Chrome, Firefox, Safari, Edge)
- `[WCAG_LEVEL]`: WCAG compliance level (e.g., AA, AAA)
- `[STORY_ID]`: Story identifier for exemption documentation

### Customization Guidelines

**For Small Teams/Projects**:
- May reduce reviewer count to 1
- May combine some testing requirements
- May reduce browser support scope
- Focus on core quality criteria

**For Large Teams/Projects**:
- May require multiple reviewers
- May add additional security audits
- May require architecture review
- May add compliance checks

**For Startups/MVP**:
- May defer some documentation
- May reduce test coverage threshold
- May limit device testing scope
- Focus on shipping value quickly

**For Enterprise**:
- May add compliance checks (SOC2, HIPAA, etc.)
- May require security team approval
- May add legal review for certain changes
- May require change management board approval

### Implementation Tips

1. **Start Simple**: Begin with core criteria, add more as team matures
2. **Be Realistic**: Don't set criteria the team can't consistently meet
3. **Make It Visible**: Post DoD in team area, link in PR templates
4. **Automate Checks**: Use CI/CD to enforce automatable criteria
5. **Review Regularly**: Revisit DoD quarterly or in retrospectives
6. **Get Buy-In**: Entire team must agree and commit to DoD

### Example (Customized for Web Application)

```markdown
# Definition of Done (DoD)

> Project: TaskFlow Web Application
> Created: 2026-01-09
> Last Updated: 2026-01-09
> Version: 1.0.0

## Purpose

The Definition of Done is a shared understanding of what it means for work to be complete. A story is not considered "done" until all DoD criteria are met.

---

## Universal DoD Criteria

These criteria apply to ALL stories unless explicitly exempted.

### Code Quality

- [ ] Code follows project style guide
      (Project: @.specwright/standards/code-style.md OR Global: @~/.specwright/standards/code-style.md)
- [ ] Code follows best practices
      (Project: @.specwright/standards/best-practices.md OR Global: @~/.specwright/standards/best-practices.md)
- [ ] Code is DRY (no unnecessary duplication)
- [ ] Code is readable and self-documenting
- [ ] Complex logic includes explanatory comments
- [ ] No commented-out code blocks
- [ ] No debug statements (console.log, debugger, etc.)
- [ ] No hardcoded values (use constants or environment variables)

### Functionality

- [ ] All acceptance criteria met
- [ ] Feature works as described in user story
- [ ] Edge cases handled appropriately
- [ ] Error states handled gracefully
- [ ] Loading states implemented where appropriate
- [ ] User feedback provided for all actions (success/error messages)

### Testing

- [ ] Unit tests written and passing
- [ ] Integration tests written and passing (where applicable)
- [ ] Test coverage meets minimum 80%
- [ ] All existing tests still passing
- [ ] Manual testing completed on Chrome, Firefox, Safari
- [ ] Mobile responsive testing completed (iOS Safari, Chrome Android)
- [ ] Accessibility testing: keyboard navigation works, ARIA labels present

### Code Review

- [ ] Code reviewed by at least 1 team member
- [ ] All review comments addressed
- [ ] PR approved
- [ ] No unresolved conversations

### Documentation

- [ ] JSDoc comments for complex functions
- [ ] README updated if setup changes
- [ ] API documentation updated in Postman collection
- [ ] User documentation added to Help Center (if user-facing)
- [ ] CHANGELOG entry added

### Quality Checks

- [ ] `npm run lint` passes with zero errors
- [ ] TypeScript compilation succeeds with zero errors
- [ ] No console errors or warnings
- [ ] Lighthouse score: Performance > 90, Accessibility > 95
- [ ] No new N+1 queries (checked with Bullet gem)

### Security

- [ ] No API keys or secrets in code
- [ ] User input validated on backend
- [ ] Authorization middleware in place
- [ ] Parameterized database queries (no string interpolation)
- [ ] HTML output escaped (XSS prevention)

### Deployment

- [ ] Code merged to main branch
- [ ] Deployed to staging environment
- [ ] Smoke tests passed in staging
- [ ] Database migrations run successfully
- [ ] Environment variables added to deployment config
- [ ] Deployed to production
- [ ] Production smoke test passed

### Product Acceptance

- [ ] Product owner demo completed
- [ ] Product owner approval obtained
- [ ] Story marked as "Done" in project management tool

---

## Story-Type Specific DoD

### Frontend Stories

- [ ] Responsive design: mobile (375px), tablet (768px), desktop (1440px)
- [ ] Cross-browser: Chrome latest, Firefox latest, Safari latest, Edge latest
- [ ] WCAG 2.1 AA compliance verified
- [ ] Images in WebP format with fallbacks
- [ ] Skeleton loaders for async content
- [ ] React Error Boundaries implemented
- [ ] Google Analytics events added (if user action)

### Backend Stories

- [ ] Database indexes on foreign keys and frequently queried columns
- [ ] Background job retry logic implemented
- [ ] API endpoint versioned (/api/v1/...)
- [ ] Rate limiting: 100 requests/minute per user
- [ ] Redis caching for expensive queries
- [ ] Migration has down/rollback method
- [ ] Tested with 10,000+ record dataset

### Bug Fix Stories

- [ ] Root cause documented in bug ticket
- [ ] Regression test prevents bug recurrence
- [ ] Checked for similar bugs in related code
- [ ] Verified fix in staging with exact reproduction steps
- [ ] Support team notified via Slack

---

## Exemptions

### Allowed Exemptions

- **Spike Stories**: May skip tests and documentation (must create follow-up story)
- **Emergency Hotfixes**: May skip staging deployment if production-critical (document technical debt)
- **Internal Tools**: May skip cross-browser testing (Chrome-only acceptable)

### Example Exemption

**DoD Exemptions for Story SPIKE-042**:
- Skipped tests (reason: research spike only, code will be discarded)
- Skipped code review (reason: POC, not production code)
- Created follow-up story TASK-043 for production implementation

---

## DoD Evolution

Last reviewed: 2026-01-09
Next review: 2026-04-09 (quarterly)

**Recent Changes**:
- v1.0.0 (2026-01-09): Initial DoD established

**Proposed Changes**:
- None currently
```
