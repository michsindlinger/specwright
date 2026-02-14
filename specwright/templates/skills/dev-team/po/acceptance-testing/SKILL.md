# Acceptance Testing Skill

> Template for Product Owner acceptance criteria validation and user acceptance testing
> Created: 2026-01-09
> Version: 1.0.0

## Skill Name
**acceptance-testing** - Master acceptance criteria definition and user acceptance testing execution

## Purpose
Enable systematic validation that developed features meet user needs and business requirements through well-defined acceptance criteria and structured user acceptance testing (UAT).

## When to Activate

Activate this skill when:
- Defining acceptance criteria for user stories
- Preparing UAT test plans
- Conducting acceptance testing of completed features
- Validating features meet business requirements
- Coordinating user testing sessions
- Signing off on story completion
- Identifying defects or gaps in implementation

## Core Capabilities

### 1. Acceptance Criteria Definition

#### Criteria Formats

**Given-When-Then (Gherkin)**:
```gherkin
Given [initial context/precondition]
When [action or event]
Then [expected outcome]
And [additional outcome]
```

**Checklist Format**:
```
- [ ] Specific, testable condition
- [ ] Expected system behavior
- [ ] Edge case handling
```

**Scenario-Based**:
```
Scenario: [Descriptive name]
- User performs: [action]
- System responds: [behavior]
- Result: [outcome]
```

#### Criteria Quality Standards
- **Specific**: No ambiguity in what "done" means
- **Testable**: Can be objectively verified
- **Measurable**: Quantifiable where applicable
- **Complete**: Covers happy path, edge cases, and errors
- **User-Centric**: Written from user perspective

### 2. Test Case Development

#### Test Case Structure
```
Test Case ID: TC-[NUMBER]
Feature: [Feature name]
User Story: [Story ID/reference]
Priority: Critical | High | Medium | Low

Preconditions:
- [Required setup or state]

Test Steps:
1. [Action to perform]
2. [Next action]
3. [Final action]

Expected Results:
- [What should happen at each step]

Actual Results:
- [What actually happened - filled during testing]

Status: Pass | Fail | Blocked
Notes: [Any observations or issues]
```

### 3. UAT Execution

#### UAT Planning
- **Scope Definition**: What features to test
- **User Selection**: Identify representative testers
- **Environment Preparation**: Staging/test environment setup
- **Test Data Creation**: Realistic data scenarios
- **Timeline Planning**: Testing duration and milestones

#### UAT Coordination
- **Kickoff Session**: Explain testing goals and process
- **Test Assignment**: Distribute test cases to users
- **Progress Tracking**: Monitor completion rates
- **Issue Triage**: Categorize and prioritize findings
- **Sign-off Process**: Formal acceptance or rejection

### 4. Defect Management

#### Defect Classification
- **Severity**:
  - Critical: Blocks core functionality
  - High: Major feature impaired
  - Medium: Minor feature issue
  - Low: Cosmetic or minor inconvenience

- **Priority**:
  - P0: Fix immediately, blocks release
  - P1: Fix before release
  - P2: Fix in next iteration
  - P3: Backlog for future consideration

#### Defect Reporting
Clear, actionable bug reports with:
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots/recordings
- Environment details
- User impact assessment

## [TECH_STACK_SPECIFIC] Considerations

### Environment Access
- Know how to access staging/test environments
- Understand deployment pipeline (when features are testable)
- Verify test data setup procedures

### Technical Constraints
- Browser/device compatibility testing scope
- Performance benchmarks for acceptance
- API behavior for integrated features
- Database state requirements for testing

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - github - Track test results, defects, and acceptance criteria
     - fetch - Access feature specs and acceptance criteria
     - filesystem - Manage test plans, cases, and UAT documentation

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Testing Environments
- Access to staging/UAT environment
- Test user accounts with appropriate permissions
- Sample/test data sets

### Documentation
- Access to user stories and acceptance criteria
- Reference to `.specwright/specs/` for detailed requirements
- Defect tracking system (GitHub Issues, Jira, etc.)

### Testing Tools
- Browser testing tools (for web features)
- Screen recording software (for bug documentation)
- Performance monitoring (if testing non-functional requirements)

### Communication
- Collaboration platform for coordinating with testers
- Feedback collection method (forms, surveys, etc.)

## Quality Checklist

Before signing off on feature acceptance:

- [ ] All acceptance criteria verified and passing
- [ ] Happy path scenarios tested successfully
- [ ] Edge cases and boundary conditions validated
- [ ] Error handling tested (invalid inputs, failures)
- [ ] Performance meets non-functional requirements
- [ ] Security requirements validated (if applicable)
- [ ] Accessibility tested (keyboard navigation, screen readers)
- [ ] Cross-browser/device testing completed (per requirements)
- [ ] Data validation and persistence verified
- [ ] Integration points with other features tested
- [ ] User documentation or help text reviewed
- [ ] No critical or high-priority defects remain
- [ ] Stakeholder demo completed and approved
- [ ] Rollback plan documented (for production releases)

## Acceptance Criteria Examples

### Example 1: User Registration Feature

**User Story**:
As a new user, I want to create an account so that I can access personalized features.

**Acceptance Criteria (Given-When-Then)**:
```gherkin
Scenario: Successful account creation
Given I am on the registration page
When I enter valid email, password, and confirm password
And I click "Create Account"
Then I see a success message "Account created successfully"
And I receive a confirmation email at the provided address
And I am redirected to the onboarding page

Scenario: Password validation
Given I am on the registration page
When I enter a password shorter than 8 characters
Then I see an error "Password must be at least 8 characters"
And the "Create Account" button is disabled

Scenario: Duplicate email prevention
Given an account already exists with email "test@example.com"
When I try to register with "test@example.com"
Then I see an error "An account with this email already exists"
And I see a link to "Reset Password"

Scenario: Email confirmation requirement
Given I have created an account
When I try to log in before confirming my email
Then I see a message "Please confirm your email address"
And I see an option to "Resend confirmation email"
```

### Example 2: Payment Processing Feature

**User Story**:
As a customer, I want to pay for my order with a credit card so that I can complete my purchase.

**Acceptance Criteria (Checklist)**:
- [ ] User can enter credit card number, expiry date, CVV, and billing address
- [ ] Card number validates format (13-19 digits, passes Luhn check)
- [ ] Expiry date rejects past dates
- [ ] CVV validates as 3-4 digits
- [ ] Payment processes successfully with valid card details
- [ ] User sees confirmation message with order number
- [ ] Order confirmation email sent within 1 minute
- [ ] Failed payment shows specific error (e.g., "Card declined")
- [ ] Payment form clears sensitive data after submission
- [ ] Loading indicator shows during payment processing
- [ ] User cannot submit payment twice (button disables)
- [ ] SSL/TLS encryption used for payment transmission
- [ ] PCI compliance requirements met (no card storage)

### Example 3: Search Functionality

**User Story**:
As a user, I want to search for products by keyword so that I can quickly find items I'm interested in.

**Acceptance Criteria (Scenario-Based)**:
```
Scenario 1: Basic keyword search
- User enters: "laptop" in search box
- System responds: Displays products containing "laptop" in title or description
- Result: At least top 10 relevant results shown, sorted by relevance

Scenario 2: No results handling
- User enters: "xyznonexistent"
- System responds: Shows "No results found for 'xyznonexistent'"
- Result: Suggests popular categories or "try different keywords"

Scenario 3: Partial match search
- User enters: "lap" (incomplete word)
- System responds: Shows autocomplete suggestions including "laptop"
- Result: Clicking suggestion performs full search

Scenario 4: Filter combination
- User enters: "shoes"
- User applies: Size filter (10), Color filter (Black)
- System responds: Shows only black shoes in size 10
- Result: Filter count shows "15 results" and can be cleared

Scenario 5: Search performance
- User enters: Any keyword
- System responds: Within 1 second
- Result: Search results appear with < 1s latency
```

## UAT Test Plan Template

```markdown
# User Acceptance Test Plan: [Feature Name]

> Created: [DATE]
> Feature Spec: .specwright/specs/[spec-folder]/
> UAT Environment: [URL or environment name]
> Test Period: [Start Date] to [End Date]

## Test Objectives
[What are we validating with this UAT?]

## Scope
**In Scope**:
- [Feature 1]
- [Feature 2]

**Out of Scope**:
- [What will not be tested]

## Test Participants

| Name | Role | User Type | Responsibilities |
|------|------|-----------|------------------|
| [Name] | [Job Title] | [Power User/Admin/etc.] | [Test cases assigned] |

## Test Environment
**URL**: [Staging/UAT URL]
**Test Accounts**:
- Admin: [username/access method]
- Standard User: [username/access method]

**Test Data**: [Description of test data available]

## Test Cases

### TC-001: [Test Case Name]
**Priority**: Critical | High | Medium | Low
**User Story**: [Reference to story]

**Preconditions**:
- [Required setup]

**Test Steps**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**:
- [What should happen]

**Acceptance Criteria Validated**:
- [ ] [Specific criterion]
- [ ] [Specific criterion]

---

[Repeat for each test case]

## UAT Schedule

| Date | Activity | Participants |
|------|----------|--------------|
| [Date] | UAT Kickoff & Training | All testers |
| [Date] | Testing Period Begins | All testers |
| [Date] | Mid-UAT Checkpoint | PO + Testers |
| [Date] | Testing Deadline | All testers |
| [Date] | Defect Triage Meeting | PO + Dev Team |
| [Date] | Re-test Fixes | Affected testers |
| [Date] | Final Sign-off | PO + Stakeholders |

## Success Criteria
- [ ] All critical and high priority test cases pass
- [ ] No P0 or P1 defects remain
- [ ] At least [X]% of medium priority test cases pass
- [ ] User feedback is positive overall
- [ ] Key stakeholders approve for release

## Defect Tracking
All defects logged in: [Issue tracking system]
Label: `uat-[feature-name]`

## Sign-off

**Product Owner**: _________________ Date: _______
**Stakeholder**: _________________ Date: _______
```

## UAT Execution Checklist

### Before UAT
- [ ] Test plan created and reviewed
- [ ] Test cases written and mapped to acceptance criteria
- [ ] UAT environment prepared and verified working
- [ ] Test data loaded and validated
- [ ] Test accounts created with appropriate permissions
- [ ] Testers identified and invited
- [ ] Kickoff meeting scheduled
- [ ] Testing instructions documented
- [ ] Defect reporting process communicated

### During UAT
- [ ] Kickoff meeting conducted
- [ ] Testers have access to environment and accounts
- [ ] Test execution tracked (spreadsheet, tool, etc.)
- [ ] Daily/regular check-ins held
- [ ] Defects logged and triaged promptly
- [ ] Questions answered and blockers removed
- [ ] Progress communicated to stakeholders
- [ ] Mid-UAT checkpoint conducted (if multi-week)

### After UAT
- [ ] All test cases executed and results recorded
- [ ] Defects categorized by severity and priority
- [ ] Critical defects resolved and re-tested
- [ ] UAT summary report created
- [ ] Lessons learned documented
- [ ] Formal sign-off obtained
- [ ] Go/no-go decision made for release

## Defect Report Template

```markdown
# Defect Report

**ID**: BUG-[NUMBER]
**Title**: [Clear, concise description]
**Reporter**: [Name]
**Date Found**: [DATE]
**Feature**: [Feature/component name]
**Environment**: [UAT/Staging URL]

## Classification
**Severity**: Critical | High | Medium | Low
**Priority**: P0 | P1 | P2 | P3
**Type**: Functional | UI | Performance | Security | Other

## Description
[Clear explanation of the issue]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happened]

## Screenshots/Videos
[Attach visual evidence]

## Environment Details
- **Browser**: [Chrome 120, Safari 17, etc.]
- **Device**: [Desktop, iPhone 15, etc.]
- **OS**: [macOS, Windows 11, etc.]
- **User Account**: [Test account used]

## Impact Assessment
**Users Affected**: [All users | Specific user type | Edge case]
**Workaround Available**: [Yes/No - describe if yes]
**Business Impact**: [Revenue, user experience, compliance, etc.]

## Related Information
**User Story**: [Link to story]
**Acceptance Criteria**: [Which criterion failed]
**Spec Reference**: .specwright/specs/[spec-folder]/

## Resolution
**Status**: Open | In Progress | Fixed | Won't Fix | Duplicate
**Assigned To**: [Developer name]
**Fix Version**: [Release/sprint number]
**Resolution Notes**: [How it was fixed]
**Re-test Result**: Pass | Fail
```

## Common Testing Anti-Patterns

### 1. Testing Only Happy Path
**Problem**: Only verifying things work when everything goes right
**Solution**: Systematically test edge cases, invalid inputs, error conditions

### 2. Vague Acceptance Criteria
**Problem**: "System should work well"
**Solution**: "Search returns results in < 1 second for 95% of queries"

### 3. Testing in Production
**Problem**: First validation happens in live environment
**Solution**: Use staging/UAT environment that mirrors production

### 4. No Test Data Strategy
**Problem**: Testing with incomplete or unrealistic data
**Solution**: Create comprehensive test data sets covering various scenarios

### 5. Skipping Regression Testing
**Problem**: Only testing new features, not checking if old ones still work
**Solution**: Maintain regression test suite for critical flows

### 6. Accepting "Works on My Machine"
**Problem**: Developer says it works, not validated in real environment
**Solution**: Always test in shared environment with realistic conditions

## Integration with Specwright

### Spec Validation
Reference acceptance criteria in:
```
.specwright/specs/YYYY-MM-DD-feature-name/spec.md
```

### Test Documentation
Create UAT plans in:
```
.specwright/specs/YYYY-MM-DD-feature-name/sub-specs/tests.md
```

### Defect Tracking
Link bugs to original requirements for traceability

### Sign-off Documentation
Document acceptance in:
```
.specwright/specs/YYYY-MM-DD-feature-name/tasks.md
```
Mark tasks as complete once acceptance testing passes

## Success Metrics

Track testing effectiveness through:
- **Defect Detection Rate**: Bugs found in UAT vs. production
- **Test Coverage**: % of acceptance criteria validated
- **Cycle Time**: Time from dev complete to UAT sign-off
- **Pass Rate**: % of test cases passing on first execution
- **User Satisfaction**: Tester feedback on feature quality
- **Escaped Defects**: Bugs found in production after UAT

---

**Remember**: Acceptance testing is the final quality gate before users see your work. Be thorough, be critical, but also recognize when good is good enough. Perfect is the enemy of shipped.
