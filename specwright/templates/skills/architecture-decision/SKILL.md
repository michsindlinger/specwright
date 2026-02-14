---
description: Architecture pattern recommendation and decision documentation guidance
globs: []
alwaysApply: false
---

# Architecture Decision Skill

> Project: [PROJECT_NAME]
> Generated: [DATE]
> Purpose: Guide for analyzing product complexity and recommending appropriate architecture patterns

## When to Use

This skill guides you when making architecture decisions for:
- Architecture pattern selection in `/plan-product`
- Architecture Decision Records (ADRs)
- Complexity assessment and pattern matching

## Quick Reference

### Architecture Decision Process

1. **Assess Complexity**: Evaluate domain, business rules, integrations, team, scale
2. **Match Pattern**: Select architecture pattern based on complexity profile
3. **Evaluate Trade-offs**: Document pros, cons, and alternatives
4. **Present Recommendation**: Interactive discussion with user
5. **Document Decision**: ADR format in architecture-decision.md

### Decision is COMPLETE when

- [ ] Complexity assessment documented (5 dimensions scored)
- [ ] Architecture pattern selected with rationale
- [ ] Trade-offs documented (pros and cons)
- [ ] Alternatives considered and documented
- [ ] User has approved the decision

---

## Detailed Guidance

### Complexity Assessment

Score each dimension (1-5):

| Dimension | 1 (Low) | 3 (Medium) | 5 (High) |
|-----------|---------|------------|----------|
| **Domain Complexity** | Simple CRUD, few entities | Moderate business rules, 10-20 entities | Rich domain logic, complex workflows, 50+ entities |
| **Business Rules** | Straightforward validation | Conditional logic, state machines | Complex calculations, regulatory compliance |
| **External Integrations** | 0-1 APIs | 2-4 APIs | 5+ APIs, payment, auth providers |
| **Team Size** | 1-2 developers | 3-5 developers | 6+ developers, multiple teams |
| **Scalability** | < 1K users | 1K-100K users | 100K+ users, high concurrency |

**Total Score Ranges:**
- **5-10**: Simple architecture sufficient
- **11-17**: Moderate architecture with clear patterns
- **18-25**: Complex architecture with strong boundaries

### Pattern Selection Framework

#### Simple (Score 5-10)

**Layered (3-Tier)**
```
Presentation → Business Logic → Data Access
```
- **Best for**: Simple CRUD, rapid development, small teams
- **Pros**: Simple to understand, fast to build, easy to hire
- **Cons**: Can become monolithic, tight coupling risk
- **Example**: Blog, simple e-commerce, internal tools

**MVC / MVVM**
```
Model ↔ View ↔ Controller/ViewModel
```
- **Best for**: Standard web apps with framework support
- **Pros**: Well-known, framework support (Rails, Django, Angular)
- **Cons**: Controllers can grow, view logic mixing

#### Moderate (Score 11-17)

**Clean Architecture**
```
Entities → Use Cases → Interface Adapters → Frameworks
```
- **Best for**: Medium complexity, good testability needs
- **Pros**: Testable, framework-independent, clear dependencies
- **Cons**: More boilerplate, learning curve
- **Example**: SaaS applications, business tools

**Modular Monolith**
```
Module A | Module B | Module C (shared database, clear boundaries)
```
- **Best for**: Starting simple with future scale plans
- **Pros**: Simple deployment, module independence, easy refactoring
- **Cons**: Discipline needed for boundaries, shared database risk
- **Example**: Marketplace, multi-feature platform

**Hexagonal (Ports & Adapters)**
```
Core Domain ← Ports → Adapters (DB, API, UI)
```
- **Best for**: Many integrations, domain-driven design
- **Pros**: Swappable adapters, testable core, integration flexibility
- **Cons**: Complexity overhead for simple cases
- **Example**: Integration-heavy platforms, enterprise systems

#### Complex (Score 18-25)

**Domain-Driven Design (DDD)**
```
Bounded Contexts → Aggregates → Domain Events
```
- **Best for**: Complex business domains, large teams
- **Pros**: Models real-world complexity, team boundaries, rich domain
- **Cons**: High learning curve, over-engineering risk
- **Example**: Banking, insurance, logistics

**Microservices**
```
Service A ↔ Message Bus ↔ Service B (independent deployment)
```
- **Best for**: Independent teams, independent scaling, polyglot
- **Pros**: Independent deployment, team autonomy, tech freedom
- **Cons**: Operational complexity, distributed systems challenges
- **Example**: Large platforms (Netflix, Uber scale)

**Event-Driven Architecture**
```
Producers → Event Bus → Consumers (async processing)
```
- **Best for**: Async workflows, event sourcing, audit trails
- **Pros**: Loose coupling, scalable, good audit trail
- **Cons**: Eventual consistency, debugging complexity
- **Example**: Financial systems, IoT platforms

#### Specialized Patterns

| Pattern | Best For | Key Trade-off |
|---------|----------|--------------|
| **CQRS** | Separate read/write models | Complexity vs. performance |
| **Serverless** | Variable load, cost optimization | Vendor lock-in vs. ops simplicity |
| **JAMstack** | Content sites + APIs | Static limitation vs. performance |
| **Micro-frontends** | Independent frontend teams | Integration complexity vs. autonomy |
| **Plugin Architecture** | Extensibility focus | Plugin API design vs. flexibility |

### Trade-off Documentation

For each decision, document:

```markdown
## Architecture Decision: [Pattern Name]

### Context
[What requirements drive this decision]

### Decision
[What pattern was chosen]

### Rationale
[Why this pattern fits the requirements]

### Consequences

**Positive:**
- [Benefit 1]
- [Benefit 2]

**Negative:**
- [Trade-off 1]
- [Trade-off 2]

**Risks:**
- [Risk 1 and mitigation]

### Alternatives Considered

| Alternative | Why Not Chosen |
|------------|---------------|
| [Pattern A] | [Reason] |
| [Pattern B] | [Reason] |
```

### Presenting Recommendations

**Interactive format:**

```
Based on my analysis of your product:

**Complexity Score:** [X]/25
- Domain: [score] — [brief justification]
- Business Rules: [score] — [brief justification]
- Integrations: [score] — [brief justification]
- Team Size: [score] — [brief justification]
- Scale: [score] — [brief justification]

**Recommended Pattern:** [Pattern Name]

[2-3 sentences explaining why this pattern fits]

**Key Trade-offs:**
+ [Pro 1]
+ [Pro 2]
- [Con 1]
- [Con 2]

**Alternatives:**
- [Alternative 1]: [Why it could also work]
- [Alternative 2]: [Why it's less ideal]

Would you like to:
1. Approve this architecture
2. Discuss the alternative patterns
3. Adjust the complexity assessment
```

### Common Mistakes

| Mistake | Better Approach |
|---------|-----------------|
| Microservices for a 2-person team | Start with modular monolith, extract later |
| No architecture for complex domain | Invest in DDD or Clean Architecture upfront |
| Choosing pattern because it's popular | Match to actual complexity and team |
| Ignoring operational complexity | Factor in deployment, monitoring, debugging |
| Over-engineering MVP | Simple layered is fine for validation phase |

---

## Template Reference

Use template: `specwright/templates/product/architecture-decision-template.md`

Hybrid lookup:
- TRY: `specwright/templates/product/architecture-decision-template.md` (project)
- FALLBACK: `~/.specwright/templates/product/architecture-decision-template.md` (global)
