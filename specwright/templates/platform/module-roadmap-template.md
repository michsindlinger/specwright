# Module Roadmap Template

<!--
This template is used by the plan-platform command to generate a module-specific roadmap.
It shows features and milestones for a single module, aligned with the platform roadmap phase.
-->

# [MODULE_NAME] Module Roadmap

> Last Updated: [CURRENT_DATE]
> Version: 1.0.0
> Platform: [PLATFORM_NAME]
> Platform Phase: [Phase Number]

## Module Overview

[TODO: Brief module description - What does this module do?]

[MODULE_OVERVIEW]

## Feature List

[TODO: List all features for this module - Extracted from module-brief.md]

### Must Have Features

1. **[Feature Name]**
   - **Description**: [What does this feature do?]
   - **Effort**: [XS / S / M / L / XL]
   - **Dependencies**: [Other features or modules]
   - **Success Criteria**: [How do we know it's done?]

2. **[Feature Name]**
   - **Description**: [What does this feature do?]
   - **Effort**: [XS / S / M / L / XL]
   - **Dependencies**: [Other features or modules]
   - **Success Criteria**: [How do we know it's done?]

### Should Have Features

1. **[Feature Name]**
   - **Description**: [What does this feature do?]
   - **Effort**: [XS / S / M / L / XL]
   - **Dependencies**: [Other features or modules]
   - **Success Criteria**: [How do we know it's done?]

### Could Have Features

1. **[Feature Name]**
   - **Description**: [What does this feature do?]
   - **Effort**: [XS / S / M / L / XL]
   - **Dependencies**: [Other features or modules]
   - **Success Criteria**: [How do we know it's done?]

## Module Phases

### Phase 1: Foundation

**Goal**: [What foundational work is needed?]

**Features**:
- [ ] [Feature 1]: [Brief description]
- [ ] [Feature 2]: [Brief description]

**Deliverables**:
- [Deliverable 1]
- [Deliverable 2]

**Definition of Done**:
- [ ] All Must Have features implemented
- [ ] Unit tests passing
- [ ] Integration tests with dependent modules passing
- [ ] Documentation complete

---

### Phase 2: Core Functionality

**Goal**: [What core value does this phase deliver?]

**Features**:
- [ ] [Feature 3]: [Brief description]
- [ ] [Feature 4]: [Brief description]

**Deliverables**:
- [Deliverable 1]
- [Deliverable 2]

**Definition of Done**:
- [ ] All Should Have features implemented
- [ ] Performance benchmarks met
- [ ] User acceptance criteria met
- [ ] Documentation updated

---

### Phase 3: Enhancement

**Goal**: [What enhancements are added?]

**Features**:
- [ ] [Feature 5]: [Brief description]
- [ ] [Feature 6]: [Brief description]

**Deliverables**:
- [Deliverable 1]

**Definition of Done**:
- [ ] All Could Have features implemented
- [ ] Advanced features operational
- [ ] Optimization complete
- [ ] User feedback incorporated

---

## Milestones

### Milestone 1: [Name]
- **Date**: [Target - avoid hard dates if possible]
- **Features**: [Features included in this milestone]
- **Dependencies**: [What must be done before this?]
- **Success Criteria**: [How do we measure success?]

### Milestone 2: [Name]
- **Date**: [Target]
- **Features**: [Features included]
- **Dependencies**: [What must be done before?]
- **Success Criteria**: [How do we measure success?]

### Module Complete
- **Date**: [Target]
- **Features**: All features implemented
- **Success Criteria**:
  - [ ] All features live in production
  - [ ] Performance targets met
  - [ ] Security audit passed
  - [ ] Documentation complete
  - [ ] User training complete

## Technical Tasks

[TODO: Technical tasks beyond features - Infrastructure, tooling, etc.]

### Infrastructure
- [ ] [Task 1]: Set up module-specific infrastructure
- [ ] [Task 2]: Configure monitoring and logging
- [ ] [Task 3]: Set up CI/CD pipeline

### Integration
- [ ] [Task 1]: Implement API contracts with [Module X]
- [ ] [Task 2]: Set up event subscriptions from [Module Y]
- [ ] [Task 3]: Configure shared database access

### Testing
- [ ] [Task 1]: Unit test coverage > 80%
- [ ] [Task 2]: Integration tests with all dependent modules
- [ ] [Task 3]: Performance tests (load, stress)
- [ ] [Task 4]: Security tests (penetration, vulnerability scan)

### Documentation
- [ ] [Task 1]: API documentation
- [ ] [Task 2]: Architecture diagrams
- [ ] [Task 3]: User guides
- [ ] [Task 4]: Runbooks for operations

## Dependencies

### Blocked By

[TODO: What modules or features must be done before this module can proceed?]

- **[Module Name]**: [What feature from that module?]
  - **Impact**: [What can't be done until this is ready?]
  - **Mitigation**: [How to work around or parallelize?]

### Blocks

[TODO: What modules or features are waiting for this module?]

- **[Module Name]**: [What feature is blocked?]
  - **Impact**: [What happens if this module delays?]
  - **Mitigation**: [How to minimize impact?]

## Risks

[TODO: Module-specific risks and mitigation strategies]

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| [Technical complexity] | High | Medium | [Prototype early, get expert help] |
| [External dependency delays] | Medium | High | [Mock external service, parallelize work] |
| [Resource constraints] | High | Low | [Cross-train team, adjust scope] |

## Success Metrics

[TODO: How do we measure success for this module?]

### Performance Metrics
- **Response Time**: [Target: < 200ms]
- **Throughput**: [Target: 1000 req/sec]
- **Error Rate**: [Target: < 0.1%]

### Quality Metrics
- **Test Coverage**: [Target: > 80%]
- **Bug Rate**: [Target: < 5 bugs/1000 LOC]
- **Code Review**: [Target: 100% reviewed]

### Business Metrics
- **User Adoption**: [Target metric]
- **User Satisfaction**: [Target metric]
- **Value Delivered**: [Target metric]

---

**Note:** This module roadmap should be reviewed weekly and updated based on actual progress. Adjust priorities and scope as needed to stay aligned with platform roadmap.
