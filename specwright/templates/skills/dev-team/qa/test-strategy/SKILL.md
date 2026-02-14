# Test Strategy Skill

> Role: QA Engineer - Test Strategy & Planning
> Created: 2026-01-09
> Purpose: Define comprehensive testing strategies and coordinate test planning across the project lifecycle

## Skill Activation

Activate this skill when:
- Planning testing approach for new features or projects
- Defining test coverage requirements and acceptance criteria
- Creating test plans for releases or sprints
- Establishing testing standards and quality gates
- Coordinating testing activities across team members
- Evaluating risk areas and prioritizing test effort

## Core Capabilities

### 1. Test Planning & Strategy
- Define overall testing approach aligned with project goals
- Create risk-based testing strategies
- Establish test coverage targets and quality metrics
- Design test pyramid architecture (unit/integration/e2e ratios)
- Plan testing timelines and resource allocation
- Define entry and exit criteria for test phases

### 2. Requirements Analysis
- Translate user stories into testable acceptance criteria
- Identify edge cases and boundary conditions
- Map requirements to test scenarios
- Validate completeness of requirements
- Document assumptions and dependencies

### 3. Test Scope Definition
- Determine what should be tested (in-scope)
- Identify what won't be tested (out-of-scope with rationale)
- Prioritize testing based on risk and business value
- Define exploratory vs. automated testing balance
- Plan integration testing with external systems

### 4. Quality Gate Establishment
- Define code coverage thresholds
- Set performance benchmarks
- Establish security testing requirements
- Create accessibility testing standards
- Define browser/device compatibility matrix

## [TECH_STACK_SPECIFIC] Testing Frameworks

### Ruby on Rails (RSpec, Capybara)
```ruby
# Test pyramid for Rails applications:
# - 70% Unit Tests (models, services, helpers)
# - 20% Integration Tests (controllers, API endpoints)
# - 10% System Tests (full user flows)

# Example test strategy configuration
# spec/rails_helper.rb
RSpec.configure do |config|
  # Coverage targets
  config.minimum_coverage = 80
  config.minimum_coverage_by_file = 60

  # Test execution settings
  config.use_transactional_fixtures = true
  config.global_fixtures = :all
end
```

### React/JavaScript (Jest, React Testing Library)
```javascript
// Test pyramid for React applications:
// - 70% Unit Tests (components, hooks, utilities)
// - 20% Integration Tests (component interactions)
// - 10% E2E Tests (user workflows)

// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ]
};
```

### E2E Testing (Playwright, Cypress)
```typescript
// playwright.config.ts
export default {
  testDir: './tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Define test environments
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 12'] } }
  ]
};
```

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - fetch - Retrieve test documentation and requirements
     - github - Access project management and issues
     - filesystem - Manage test artifacts and reports

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Test Planning & Documentation
- Test management system (TestRail, Zephyr, or spreadsheets)
- Requirements traceability matrix
- Risk assessment templates
- Test plan templates

### Collaboration & Communication
- Project management tools (Jira, Linear, GitHub Issues)
- Documentation platform (Confluence, Notion)
- Communication channels (Slack, Teams)

### Metrics & Reporting
- Code coverage tools (SimpleCov, Istanbul, Codecov)
- CI/CD dashboards (GitHub Actions, CircleCI)
- Quality metrics tracking (SonarQube)

## Quality Checklist

### Test Strategy Document
- [ ] Testing objectives clearly defined
- [ ] Test scope explicitly documented (in/out of scope)
- [ ] Risk areas identified and prioritized
- [ ] Test pyramid ratios defined for project
- [ ] Coverage targets set by test level
- [ ] Quality gates established with measurable criteria
- [ ] Test environments defined
- [ ] Test data requirements documented
- [ ] Entry/exit criteria defined for each test phase
- [ ] Testing timeline aligned with development schedule

### Acceptance Criteria
- [ ] Each user story has testable acceptance criteria
- [ ] Success scenarios clearly defined
- [ ] Error/edge cases documented
- [ ] Performance requirements specified
- [ ] Security requirements included
- [ ] Accessibility requirements noted
- [ ] Browser/device compatibility specified

### Risk Assessment
- [ ] High-risk areas identified
- [ ] Business impact evaluated
- [ ] Technical complexity assessed
- [ ] Dependencies documented
- [ ] Mitigation strategies defined

## Test Strategy Framework

### 1. Risk-Based Testing Approach

```markdown
## Risk Assessment Matrix

| Feature Area | Business Impact | Technical Complexity | Test Priority | Test Approach |
|--------------|----------------|---------------------|---------------|---------------|
| User Authentication | Critical | Medium | P0 | Automated + Manual |
| Payment Processing | Critical | High | P0 | Automated + Security |
| User Profile | High | Low | P1 | Automated |
| Admin Dashboard | Medium | Medium | P2 | Automated + Exploratory |
| Email Notifications | Low | Low | P3 | Automated |

### Priority Definitions
- **P0**: Must be tested before release, blocks deployment if failing
- **P1**: Should be tested before release, requires sign-off
- **P2**: Can be tested post-release with monitoring
- **P3**: Tested periodically, lower coverage acceptable
```

### 2. Test Pyramid Architecture

```markdown
## Test Distribution Strategy

### Unit Tests (70% of total tests)
**Purpose**: Verify individual units of code in isolation
**Coverage Target**: 85%+
**Execution Speed**: < 10 minutes for full suite
**Responsibility**: Developers write during development

**Focus Areas**:
- Business logic in models/services
- Utility functions and helpers
- Input validation and data transformation
- Error handling and edge cases

### Integration Tests (20% of total tests)
**Purpose**: Verify interactions between components
**Coverage Target**: 70%+
**Execution Speed**: < 20 minutes for full suite
**Responsibility**: Developers + QA Engineers

**Focus Areas**:
- API endpoints and controllers
- Database interactions
- External service integrations
- Authentication and authorization flows

### E2E Tests (10% of total tests)
**Purpose**: Verify complete user workflows
**Coverage Target**: Critical paths only
**Execution Speed**: < 30 minutes for full suite
**Responsibility**: QA Engineers

**Focus Areas**:
- Critical user journeys (signup, checkout, etc.)
- Cross-browser compatibility
- Mobile responsiveness
- Performance under realistic conditions
```

### 3. Test Planning Template

```markdown
# Test Plan: [Feature/Release Name]

## Overview
**Feature**: [Feature name]
**Release Date**: [Target date]
**Test Lead**: [Name]
**Status**: [Planning/In Progress/Complete]

## Test Objectives
- [ ] Verify all acceptance criteria are met
- [ ] Ensure no regressions in existing functionality
- [ ] Validate performance meets requirements
- [ ] Confirm security requirements satisfied
- [ ] Test cross-browser compatibility

## Scope

### In Scope
- [List features/functionality to be tested]
- [Specific user flows]
- [Platforms/browsers to test]

### Out of Scope
- [Features explicitly not tested]
- [Known limitations]
- [Future enhancements]

## Test Approach

### Automated Testing
- Unit Tests: [Coverage target]%
- Integration Tests: [Coverage target]%
- E2E Tests: [Number of critical flows]

### Manual Testing
- Exploratory Testing: [Hours allocated]
- Usability Testing: [If applicable]
- Cross-browser Testing: [Browsers/devices]

## Test Environment
- **Development**: For developer testing
- **Staging**: For QA and stakeholder review
- **Production**: Post-deployment smoke tests

## Test Data Requirements
- [User accounts needed]
- [Test data sets]
- [Third-party service credentials]

## Entry Criteria
- [ ] All features code-complete
- [ ] Unit tests passing (>85% coverage)
- [ ] Feature deployed to staging
- [ ] Test environment stable
- [ ] Test data prepared

## Exit Criteria
- [ ] All P0 test cases passed
- [ ] All P1 test cases passed or have approved exceptions
- [ ] No critical or high-severity bugs open
- [ ] Code coverage targets met
- [ ] Performance benchmarks achieved
- [ ] Security scan completed
- [ ] Stakeholder sign-off received

## Risks & Mitigation
| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| [Risk description] | [High/Med/Low] | [High/Med/Low] | [Mitigation strategy] |

## Schedule
| Phase | Start Date | End Date | Status |
|-------|-----------|----------|--------|
| Test Planning | [Date] | [Date] | [Status] |
| Test Case Development | [Date] | [Date] | [Status] |
| Test Execution | [Date] | [Date] | [Status] |
| Regression Testing | [Date] | [Date] | [Status] |
| Bug Fixing & Retesting | [Date] | [Date] | [Status] |

## Metrics to Track
- Test cases executed vs. planned
- Pass/fail rate
- Defect density by severity
- Code coverage achieved
- Test execution time trends
```

### 4. Acceptance Criteria Template

```markdown
## User Story: [Story title]

### Success Criteria
**Given** [initial context/precondition]
**When** [action taken by user]
**Then** [expected outcome]

### Example Scenarios

#### Happy Path
- [ ] User can [primary action] successfully
- [ ] System displays [expected feedback]
- [ ] Data is [saved/updated/deleted] correctly

#### Edge Cases
- [ ] Handles empty/null input appropriately
- [ ] Validates maximum input length
- [ ] Prevents duplicate submissions
- [ ] Handles concurrent operations safely

#### Error Scenarios
- [ ] Shows clear error message for invalid input
- [ ] Recovers gracefully from network failures
- [ ] Handles timeout conditions
- [ ] Logs errors for debugging

#### Non-Functional Requirements
- [ ] Response time < [X]ms for 95th percentile
- [ ] Page load time < [X] seconds
- [ ] Supports [X] concurrent users
- [ ] WCAG 2.1 Level AA accessibility compliance
- [ ] Works in [browsers/devices list]
```

## Test Strategy Best Practices

### 1. Start with Risk Assessment
- Identify highest-risk areas first
- Prioritize testing effort on critical business functionality
- Consider technical debt and code complexity

### 2. Balance Automation vs. Manual
- Automate stable, repetitive test cases
- Use manual testing for exploratory and usability testing
- Don't automate everything - focus on ROI

### 3. Shift Left
- Involve QA in requirements and design phases
- Write acceptance criteria before development starts
- Encourage developers to write tests during development

### 4. Maintain Test Pyramid
- Avoid "ice cream cone" anti-pattern (heavy E2E, light unit tests)
- Keep E2E tests focused on critical paths only
- Invest in fast, reliable unit tests

### 5. Define Clear Quality Gates
- Set objective, measurable criteria
- Automate quality checks in CI/CD
- Make quality gates visible to entire team

### 6. Plan for Test Maintenance
- Review and update tests regularly
- Remove obsolete tests
- Refactor flaky tests immediately
- Keep test data fresh and realistic

### 7. Communicate Continuously
- Share test progress with team daily
- Escalate blockers immediately
- Provide clear test reports to stakeholders
- Celebrate quality wins

## Success Metrics

Track these metrics to evaluate test strategy effectiveness:

- **Test Coverage**: % of code covered by tests
- **Defect Detection Rate**: Bugs found in testing vs. production
- **Test Execution Time**: Time to run full test suite
- **Test Reliability**: Pass rate stability (target: >98%)
- **Mean Time to Detect (MTTD)**: Time from bug introduction to detection
- **Mean Time to Repair (MTTR)**: Time from bug detection to fix

## Related Skills

- **test-automation** - For implementing automated tests
- **quality-metrics** - For tracking quality metrics
- **regression-testing** - For continuous testing strategy
