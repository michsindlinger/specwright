# Requirements Engineering Skill

> Template for Product Owner requirements gathering and user story writing
> Created: 2026-01-09
> Version: 1.0.0

## Skill Name
**requirements-engineering** - Expert requirements elicitation, documentation, and user story crafting

## Purpose
Enable systematic requirements gathering from stakeholders, users, and business needs, transforming them into clear, actionable user stories with well-defined acceptance criteria.

## When to Activate

Activate this skill when:
- Gathering requirements for new features
- Conducting user research or interviews
- Writing user stories from stakeholder requests
- Defining acceptance criteria
- Clarifying ambiguous requirements
- Validating requirements with stakeholders
- Documenting non-functional requirements

## Core Capabilities

### 1. Requirements Elicitation

#### Stakeholder Interviews
- **Preparation**: Define interview objectives and questions
- **Active Listening**: Uncover needs behind stated wants
- **Question Techniques**:
  - Open-ended questions: "How do you currently...?"
  - Probing questions: "Can you tell me more about...?"
  - Scenario-based: "Walk me through what happens when...?"
- **Documentation**: Capture verbatim quotes and context

#### User Research Methods
- **User Interviews**: One-on-one conversations with end users
- **Surveys**: Quantitative data from larger user base
- **Usage Analytics**: Behavioral data and patterns
- **Competitor Analysis**: Feature gaps and opportunities
- **User Personas**: Representative user archetypes

### 2. User Story Writing

#### Story Structure
```
As a [user role/persona]
I want [goal/desire]
So that [benefit/value]
```

#### Story Quality Guidelines
- **User-Centric**: Focus on user needs, not technical implementation
- **Value-Driven**: Clear benefit statement in "so that" clause
- **Specific**: Concrete goal, not vague aspirations
- **Testable**: Can verify completion through acceptance criteria

### 3. Acceptance Criteria Definition

#### Given-When-Then Format (Gherkin)
```
Given [initial context/state]
When [action/event occurs]
Then [expected outcome]
```

#### Checklist Format
```
- [ ] System does X when user does Y
- [ ] Error message appears when Z condition
- [ ] Data persists after action completion
```

### 4. Requirements Documentation

#### Functional Requirements
- **User Actions**: What users can do
- **System Behavior**: How system responds
- **Business Rules**: Constraints and validations
- **Data Requirements**: Information needed/stored

#### Non-Functional Requirements
- **Performance**: Response times, throughput
- **Security**: Authentication, authorization, data protection
- **Usability**: Accessibility, user experience standards
- **Scalability**: Growth capacity and limits
- **Reliability**: Uptime, error handling

## [TECH_STACK_SPECIFIC] Considerations

While requirements are implementation-agnostic, be aware of:
- Platform constraints (web, mobile, desktop)
- Integration capabilities with existing systems
- Data storage and retrieval patterns
- API availability and limitations
- Browser/device compatibility needs

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - fetch - Retrieve product specs and requirements documentation
     - github - Access user stories, issues, and feedback
     - filesystem - Manage requirements artifacts and templates

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Research & Discovery
- User interview guides
- Survey platforms
- Analytics tools (Google Analytics, Mixpanel, etc.)
- User session recording tools

### Documentation
- Access to `.specwright/specs/` for detailed specifications
- Access to `.specwright/product/mission.md` for product vision
- Issue tracking system for story management
- Collaboration tools for stakeholder feedback

### Validation
- Prototype or mockup tools (Figma, Sketch, etc.)
- User testing platforms
- Stakeholder review processes

## Quality Checklist

Before considering requirements complete:

- [ ] All stakeholders interviewed and input captured
- [ ] User needs validated with actual users (not just stakeholders)
- [ ] User stories follow proper structure (As a... I want... So that...)
- [ ] Each story has clear, testable acceptance criteria
- [ ] Non-functional requirements documented
- [ ] Edge cases and error scenarios identified
- [ ] Dependencies and constraints documented
- [ ] Business rules clearly defined
- [ ] Success metrics identified for feature validation
- [ ] Mockups or wireframes created for UI-heavy features
- [ ] Requirements reviewed with development team for feasibility
- [ ] Spec document created at `.specwright/specs/YYYY-MM-DD-feature-name/`

## User Story Examples

### Example 1: E-commerce Feature

**Story**:
As a **returning customer**
I want **to view my order history**
So that **I can track past purchases and reorder items easily**

**Acceptance Criteria**:
```gherkin
Given I am a logged-in customer with previous orders
When I navigate to "My Account" > "Order History"
Then I see a list of my orders sorted by date (most recent first)

Given I am viewing my order history
When I click on a specific order
Then I see the full order details including:
  - Order number and date
  - Items purchased with quantities
  - Total amount paid
  - Shipping address
  - Current delivery status

Given I am viewing order details
When I click "Reorder" on a past order
Then all items are added to my cart
And I am redirected to the checkout page

Given I am a new customer with no orders
When I navigate to "Order History"
Then I see a message "No orders yet" with a link to continue shopping
```

**Non-Functional Requirements**:
- Order history loads within 2 seconds
- Support for viewing up to 100 orders per page
- Mobile-responsive design
- Accessible (WCAG 2.1 AA compliant)

### Example 2: Admin Dashboard Feature

**Story**:
As a **system administrator**
I want **to export user data in CSV format**
So that **I can analyze user trends in external tools**

**Acceptance Criteria**:
- [ ] Export button available on user management page
- [ ] Clicking export generates CSV with all user fields
- [ ] CSV includes: username, email, registration date, last login, account status
- [ ] Export respects current filters (e.g., if filtering active users, only exports active)
- [ ] Download starts immediately (no email delivery needed)
- [ ] Export limited to 10,000 users per request (performance limit)
- [ ] Error message shown if export fails with option to retry
- [ ] Export action logged in admin audit trail

**Non-Functional Requirements**:
- Export generates within 10 seconds for up to 10,000 users
- Only accessible to users with "Admin" role
- PII data handling compliant with privacy regulations

### Example 3: Developer Tool Feature

**Story**:
As a **software developer**
I want **to receive webhook notifications when builds fail**
So that **I can respond quickly to broken builds without constantly checking the dashboard**

**Acceptance Criteria**:
```gherkin
Given I have configured a webhook URL in my project settings
When a build fails on any branch
Then a POST request is sent to my webhook URL
And the payload includes:
  - Project name
  - Branch name
  - Commit SHA
  - Build failure reason
  - Timestamp
  - Link to build logs

Given the webhook delivery fails (timeout or non-200 response)
When the initial delivery fails
Then the system retries up to 3 times with exponential backoff
And I can view delivery status in webhook settings

Given I want to test my webhook integration
When I click "Send test notification" in webhook settings
Then a sample payload is sent to my webhook URL
And I see confirmation of successful delivery or error details
```

**Non-Functional Requirements**:
- Webhook delivery attempts within 30 seconds of build failure
- Retry logic: 1min, 5min, 15min intervals
- Webhook configuration supports HTTPS URLs only
- Payload size limited to 10KB

## Requirements Elicitation Template

### Stakeholder Interview Guide

**Preparation**:
- Review existing product documentation
- Identify stakeholder role and interests
- Prepare core questions

**Interview Structure** (45-60 minutes):

1. **Introduction** (5 min)
   - Explain purpose and how input will be used
   - Set expectations for follow-up

2. **Current State Discovery** (15 min)
   - "Walk me through how you currently accomplish [task]?"
   - "What tools or processes do you use today?"
   - "What works well in your current workflow?"

3. **Pain Points Exploration** (15 min)
   - "What are the biggest challenges you face with [process]?"
   - "How much time do you spend on [task]?"
   - "What workarounds have you developed?"
   - "What would make your work easier?"

4. **Future State Vision** (15 min)
   - "If you could wave a magic wand, what would the ideal solution look like?"
   - "What outcomes would make this feature successful for you?"
   - "How would you measure success?"

5. **Constraints & Context** (5 min)
   - "Are there any regulatory or compliance requirements?"
   - "What integrations with other systems are needed?"
   - "Are there budget or timeline constraints I should know about?"

6. **Wrap-up** (5 min)
   - Summarize key points
   - Clarify any ambiguities
   - Set expectations for next steps

### Requirements Documentation Template

```markdown
# Feature Requirements: [Feature Name]

> Created: [DATE]
> Stakeholders: [Names/Roles]
> Status: Draft | Under Review | Approved

## Executive Summary
[2-3 sentence overview of feature purpose and value]

## Business Context
**Problem Statement**: [What problem are we solving?]
**Target Users**: [Who will use this feature?]
**Business Value**: [Why build this now?]
**Success Metrics**: [How will we measure success?]

## User Personas
### Primary Persona: [Name]
- **Role**: [Job title/description]
- **Goals**: [What they want to achieve]
- **Pain Points**: [Current challenges]
- **Technical Proficiency**: [Low | Medium | High]

### Secondary Persona: [Name]
[Repeat structure]

## User Stories

### Story 1: [Title]
As a [persona]
I want [goal]
So that [benefit]

**Priority**: Must Have | Should Have | Could Have
**Acceptance Criteria**:
[Detailed criteria using Given-When-Then or checklist]

**Mockups/Wireframes**: [Link or attachment]

[Repeat for each story]

## Non-Functional Requirements

### Performance
- [Specific performance targets]

### Security
- [Authentication/authorization requirements]
- [Data protection needs]

### Usability
- [Accessibility standards]
- [Browser/device support]

### Scalability
- [Expected volume/growth]

## Business Rules
1. [Rule 1]
2. [Rule 2]

## Dependencies
- **Upstream**: [Features that must exist first]
- **Downstream**: [Features that depend on this]
- **External**: [Third-party integrations]

## Out of Scope
[Explicitly state what this feature will NOT include]

## Open Questions
- [ ] [Question requiring stakeholder input]
- [ ] [Technical feasibility question for dev team]

## Appendix
- **Research Notes**: [Link to interview notes]
- **Analytics Data**: [Supporting usage data]
- **Competitive Analysis**: [How competitors solve this]
```

## Common Requirements Anti-Patterns

### 1. Solution-Focused Stories
**Bad**: "As a user, I want a dropdown menu for selecting categories"
**Good**: "As a user, I want to filter products by category so that I can find relevant items quickly"
*Why*: Focus on the need, not the implementation

### 2. Vague Acceptance Criteria
**Bad**: "System should be fast"
**Good**: "Page load time is under 2 seconds for 95% of requests"
*Why*: Testable, specific criteria enable clear completion definition

### 3. Technical Jargon in User Stories
**Bad**: "As a user, I want to POST data to the API endpoint"
**Good**: "As a user, I want to save my profile information so that it's available on my next visit"
*Why*: User-centric language, not technical implementation

### 4. Missing "So That" Clause
**Bad**: "As a user, I want to reset my password"
**Good**: "As a user, I want to reset my password so that I can regain access to my account if I forget it"
*Why*: Understanding the value helps with prioritization and validation

### 5. Overly Large Stories
**Bad**: "As a user, I want a complete dashboard with charts, reports, exports, and alerts"
**Good**: Break into multiple stories:
- "As a user, I want to view my key metrics in a dashboard"
- "As a user, I want to export dashboard data as CSV"
- "As a user, I want to receive alerts when metrics exceed thresholds"
*Why*: Smaller stories are easier to estimate, develop, and test

## Requirements Review Checklist

### With Stakeholders
- [ ] Does this solve the stated problem?
- [ ] Are the priorities aligned with business goals?
- [ ] Have we addressed all key user personas?
- [ ] Are there regulatory/compliance considerations?
- [ ] What is the expected ROI or business impact?

### With Development Team
- [ ] Are the requirements technically feasible?
- [ ] Do we understand the acceptance criteria?
- [ ] Are there technical dependencies we should know about?
- [ ] What are the implementation risks?
- [ ] Do we need to spike/research anything first?

### With UX/Design
- [ ] Are there design patterns we should follow?
- [ ] Have we considered accessibility?
- [ ] What devices/browsers need support?
- [ ] Do we need user testing before development?

### With QA/Testing
- [ ] Are acceptance criteria testable?
- [ ] Have we identified edge cases?
- [ ] What test data is needed?
- [ ] Are there performance testing requirements?

## Integration with Specwright

### Creating Detailed Specs
When requirements are approved:
```bash
create-spec  # Generate full specification in .specwright/specs/
```

### Requirements Traceability
- Link user stories to specs: `.specwright/specs/YYYY-MM-DD-feature-name/`
- Reference product vision: `.specwright/product/mission.md`
- Document decisions: `specwright/product/architecture-decision.md`

### Iterative Refinement
When requirements change:
```bash
update-feature  # Track requirement changes over time
```

## Success Metrics

Track requirements quality through:
- **Story Rework Rate**: % of stories sent back for clarification
- **Acceptance Criteria Clarity**: Developer questions during sprint
- **Stakeholder Satisfaction**: Feedback on delivered features
- **Scope Creep**: Mid-sprint requirement changes
- **User Validation**: Post-launch user feedback alignment

---

**Remember**: Great requirements come from deep user understanding, clear communication, and collaborative refinement. Focus on problems, not solutions. Listen more than you speak. Validate assumptions early and often.
