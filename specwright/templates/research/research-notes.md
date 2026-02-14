# Research Notes: [Feature Name]

> Research Session: [Date]
> Feature Spec: @specwright/specs/YYYY-MM-DD-feature-name/

## Feature Overview

[Brief description of the feature being researched]

---

## Codebase Analysis

### Existing Similar Features

**Feature 1: [Name]**
- **Location**: `path/to/file.ext:line`
- **Purpose**: [What it does]
- **Patterns Used**: [Design patterns, architectural choices]
- **Reusability**: [Can this be reused? How?]

**Feature 2: [Name]**
- **Location**: `path/to/file.ext:line`
- **Purpose**: [What it does]
- **Patterns Used**: [Design patterns, architectural choices]
- **Reusability**: [Can this be reused? How?]

### Reusable Components

**Services:**
- `ServiceName` - `path/to/service.ext:line`
  - **Functionality**: [What it provides]
  - **Reuse Strategy**: [How to use for this feature]

**Utilities:**
- `UtilityName` - `path/to/utility.ext:line`
  - **Functionality**: [What it provides]
  - **Reuse Strategy**: [How to use for this feature]

**Models/Entities:**
- `ModelName` - `path/to/model.ext:line`
  - **Fields**: [Key fields]
  - **Relationships**: [Related entities]
  - **Reuse Strategy**: [Extend? Reference? New model?]

### Architectural Patterns Observed

**Layering:**
```
[Document the layering pattern found]
Controller → Service → Repository → Database
```

**Naming Conventions:**
- Controllers: `{Entity}Controller`
- Services: `{Entity}Service`
- Repositories: `{Entity}Repository`
- DTOs: `{Entity}Dto` or `{Action}{Entity}Request`

**Package/Directory Structure:**
```
[Document the structure]
src/
  ├── controllers/
  ├── services/
  └── models/
```

**Design Patterns:**
- [Pattern name]: Used in [location] for [purpose]
- [Pattern name]: Used in [location] for [purpose]

### Technology Stack In Use

**Backend:**
- Framework: [e.g., Spring Boot 3.2]
- Database: [e.g., PostgreSQL]
- ORM: [e.g., Hibernate]
- Libraries: [List key libraries found]

**Frontend:**
- Framework: [e.g., React 18]
- State Management: [e.g., Zustand]
- Styling: [e.g., TailwindCSS]
- Libraries: [List key libraries found]

### Testing Approaches

**Test Structure:**
```
[Document how tests are organized]
```

**Testing Libraries:**
- [Library name]: Used for [purpose]

**Test Patterns:**
- [Pattern observed in tests]

---

## Requirements Clarification

### Questions Asked

**Q1: [Question]**
- **Answer**: [User's response]
- **Impact**: [How this affects the spec]

**Q2: [Question]**
- **Answer**: [User's response]
- **Impact**: [How this affects the spec]

### Decisions Made

**Decision 1: [Topic]**
- **Options Considered**: [List options]
- **Chosen**: [Selected option]
- **Rationale**: [Why this choice]

**Decision 2: [Topic]**
- **Options Considered**: [List options]
- **Chosen**: [Selected option]
- **Rationale**: [Why this choice]

---

## Visual Assets

### Mockups/Wireframes

**Mockup 1: [Name]**
- **File**: `mockups/mockup-name.png`
- **Description**: [What it shows]
- **Key Elements**: [Important UI elements]
- **Notes**: [Observations or questions]

**Wireframe 1: [Name]**
- **File**: `wireframes/wireframe-name.png`
- **Description**: [What it shows]

### Screenshots (Existing UI)

**Screenshot 1: [Context]**
- **File**: `screenshots/existing-ui.png`
- **Purpose**: [Why this was captured]
- **Observations**: [What to note]

---

## Technical Constraints

### Infrastructure
- [Constraint 1]: [Details]
- [Constraint 2]: [Details]

### Performance
- Maximum response time: [e.g., 2 seconds]
- Expected load: [e.g., 1000 requests/minute]
- Data volume: [e.g., 1M records]

### Security
- Authentication method: [e.g., JWT]
- Authorization model: [e.g., RBAC]
- Data privacy: [e.g., GDPR compliance required]
- Rate limiting: [e.g., 100 requests/hour per user]

### Compatibility
- Browsers supported: [e.g., Chrome, Firefox, Safari latest]
- Mobile support: [e.g., Responsive design required]
- API versioning: [e.g., /api/v1/]

---

## Recommendations

### Reuse Strategy

**Components to Reuse:**
1. [Component name] - [How to use]
2. [Component name] - [How to use]

**Components to Extend:**
1. [Component name] - [What to add]
2. [Component name] - [What to add]

**New Components Needed:**
1. [Component name] - [Purpose]
2. [Component name] - [Purpose]

### Implementation Approach

**Recommended Architecture:**
```
[Describe the recommended implementation structure]
```

**Technology Choices:**
- [Choice 1]: Use existing [library/approach]
- [Choice 2]: Introduce new [library/approach] because [reason]

### Risks and Considerations

**Technical Risks:**
- [Risk 1]: [Mitigation strategy]
- [Risk 2]: [Mitigation strategy]

**Dependencies:**
- Depends on [Component/Service]: [Why and how]

---

## Next Steps

1. Review research findings with stakeholders
2. Finalize requirements based on Q&A
3. Create formal specification
4. Break down into implementation tasks

## Open Questions

- [ ] [Question still needing answer]
- [ ] [Question still needing answer]

---

**Research completed by**: Claude Code
**Date**: [Current date]
**Time spent**: [Duration]
