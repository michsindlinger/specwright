# Pattern Enforcement Skill

> Skill: Pattern Enforcement
> Role: Architect
> Created: 2026-01-09
> Version: 1.0.0

## Purpose

Ensures architectural patterns, design principles, and code organization standards are consistently followed across the codebase. Acts as the guardian of architectural integrity.

## When to Activate This Skill

**Trigger Conditions:**
- Code review requests
- Feature implementation reviews
- Refactoring proposals
- Architecture violation detection
- New component/module creation
- Pattern deviation analysis

**Context Signals:**
- "Review this implementation"
- "Is this following our patterns?"
- "Check architectural compliance"
- "Validate code structure"

## Core Capabilities

### 1. Pattern Recognition
- Identify existing architectural patterns in codebase
- Detect pattern violations and deviations
- Recognize anti-patterns and code smells
- Map code to architectural diagrams

### 2. Compliance Validation
- Verify adherence to established patterns
- Check layer separation (MVC, Clean Architecture, etc.)
- Validate dependency directions
- Ensure proper abstraction boundaries

### 3. Pattern Documentation
- Document patterns currently in use
- Create pattern examples and templates
- Maintain architectural decision records
- Update pattern guidelines

### 4. Refactoring Guidance
- Suggest pattern-compliant refactoring
- Provide migration paths for legacy code
- Recommend incremental improvements
- Balance pragmatism with ideal architecture

## [TECH_STACK_SPECIFIC] Best Practices

### Framework Patterns
[TECH_STACK_SPECIFIC]
- **MVC Structure**: [Framework-specific MVC implementation]
- **Service Objects**: [When and how to use service objects]
- **Concerns/Mixins**: [Proper usage of shared behavior]
- **Decorators/Presenters**: [View logic patterns]

### Code Organization
[TECH_STACK_SPECIFIC]
- **Directory Structure**: [Standard directory layout]
- **Module Boundaries**: [How to organize modules]
- **Naming Conventions**: [Framework-specific naming]
- **File Placement**: [Where different types of code belong]

### Common Patterns
[TECH_STACK_SPECIFIC]
- **Repository Pattern**: [If applicable to stack]
- **Factory Pattern**: [Common use cases]
- **Observer Pattern**: [Event/callback handling]
- **Strategy Pattern**: [Algorithm variation handling]

### Anti-Patterns to Avoid
[TECH_STACK_SPECIFIC]
- [Framework-specific anti-pattern #1]
- [Framework-specific anti-pattern #2]
- [Framework-specific anti-pattern #3]

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - filesystem - Read and analyze code structure
     - git - Review commit history and changes
     - [TECH_STACK_SPECIFIC] - Framework-specific analysis tools

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Specwright Workflows
- **specwright/workflows/execute-tasks.md** - Execute refactoring and pattern improvements
- **specwright/product/architecture-decision.md** - Reference architectural decisions

### External Tools
- Static analysis tools for pattern detection
- Dependency graph visualization
- Code complexity analyzers

## Quality Checklist

### Pattern Compliance
- [ ] Code follows established architectural patterns
- [ ] Layer separation is maintained (no layer violations)
- [ ] Dependencies point in correct direction
- [ ] Abstractions are appropriate for complexity level
- [ ] No circular dependencies exist

### Code Organization
- [ ] Files are in correct directories
- [ ] Naming follows project conventions
- [ ] Modules have clear, single responsibilities
- [ ] Similar functionality is grouped logically
- [ ] Code duplication is minimized

### Maintainability
- [ ] New patterns are documented when introduced
- [ ] Pattern deviations have justification
- [ ] Code is consistent with existing codebase
- [ ] Future developers can understand the structure
- [ ] Technical debt is tracked and acceptable

### Documentation
- [ ] Architectural decisions are recorded
- [ ] Pattern usage is documented
- [ ] Complex implementations have explanatory comments
- [ ] README reflects current architecture

## Integration with Other Skills

### Works Closely With
- **api-designing** - Ensures API follows architectural patterns
- **data-modeling** - Validates data layer patterns
- **security-guidance** - Enforces security architecture patterns
- **dependency-checking** - Validates architectural dependency rules

### Provides Input To
- **Code review processes** - Pattern compliance checks
- **Refactoring decisions** - Pattern migration strategies
- **Team standards** - Pattern documentation and guidelines

### Receives Input From
- **Product decisions** - New architectural directions
- **Technical specs** - Required patterns for features
- **Performance requirements** - Pattern optimization needs

## Examples

### Example 1: Controller Pattern Enforcement

**Scenario:** Review a controller with business logic

**Analysis:**
```
ISSUE: Business logic in controller
PATTERN: MVC - Controllers should be thin

VIOLATION:
[TECH_STACK_SPECIFIC]
```python
# Bad: Business logic in controller
def create_user(request):
    user = User(email=request.POST['email'])
    if User.objects.filter(email=user.email).exists():
        return error("Email exists")
    user.save()
    send_welcome_email(user)
    create_default_settings(user)
    return success(user)
```

RECOMMENDATION:
[TECH_STACK_SPECIFIC]
```python
# Good: Thin controller, logic in service
def create_user(request):
    result = UserService.create(request.POST['email'])
    return result
```

**Justification:** Controllers should orchestrate, not implement business logic.

### Example 2: Service Object Pattern

**Scenario:** Complex business operation spanning multiple models

**Pattern Application:**
```
PATTERN: Service Object for complex operations

IMPLEMENTATION:
[TECH_STACK_SPECIFIC]
```ruby
# Service object pattern
class OrderFulfillmentService
  def initialize(order)
    @order = order
  end

  def fulfill
    ActiveRecord::Base.transaction do
      process_payment
      update_inventory
      send_notifications
      create_shipment
    end
  end

  private
  # Implementation details...
end
```

BENEFITS:
- Single responsibility
- Transactional integrity
- Testable in isolation
- Reusable across controllers
```

### Example 3: Dependency Direction Validation

**Scenario:** Feature module depends on infrastructure

**Analysis:**
```
ISSUE: Dependency violation
PATTERN: Clean Architecture - Inner layers should not depend on outer layers

VIOLATION:
Domain Layer -> Infrastructure Layer (WRONG)

RECOMMENDATION:
Domain Layer -> Abstraction (Interface/Protocol)
Infrastructure Layer -> Implements Abstraction (CORRECT)

REFACTORING:
[TECH_STACK_SPECIFIC]
1. Define interface in domain layer
2. Implement interface in infrastructure layer
3. Use dependency injection
```

### Example 4: Pattern Documentation

**Scenario:** New pattern introduced in project

**Documentation Template:**
```markdown
# [Pattern Name]

## Purpose
[Why this pattern exists in our codebase]

## When to Use
[Specific scenarios where this pattern applies]

## Implementation
[TECH_STACK_SPECIFIC]
[Code example showing the pattern]

## Related Patterns
[Other patterns this works with or replaces]

## Decision Reference
See: specwright/product/architecture-decision.md#DEC-XXX
```

## Skill Activation Flow

```
1. RECEIVE: Code/design to review
2. IDENTIFY: Applicable architectural patterns
3. ANALYZE: Compliance with patterns
4. DETECT: Violations or anti-patterns
5. EVALUATE: Severity and impact
6. RECOMMEND: Fixes or justifications
7. DOCUMENT: Findings and decisions
8. EDUCATE: Explain pattern rationale
```

## Success Metrics

- Consistent pattern application across codebase
- Reduced architectural violations over time
- Clear architectural documentation
- Team understanding of patterns
- Maintainable and scalable code structure

## Notes

- Balance idealism with pragmatism
- Document when deviating from patterns (with justification)
- Patterns should serve the project, not constrain it unnecessarily
- Update patterns as project evolves
- Educate team on pattern rationale, not just rules
