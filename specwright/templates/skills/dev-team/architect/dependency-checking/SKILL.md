# Dependency Checking Skill

> Skill: Dependency Checking
> Role: Architect
> Created: 2026-01-09
> Version: 1.0.0

## Purpose

Evaluates external dependencies (libraries, frameworks, APIs, services) for security, reliability, maintenance status, and architectural fit. Ensures dependencies align with project standards and minimize risk.

## When to Activate This Skill

**Trigger Conditions:**
- Adding new external library or package
- Evaluating third-party API integration
- Security vulnerability in dependency
- Dependency update/upgrade decisions
- Architecture review of dependencies
- License compliance check

**Context Signals:**
- "Should we use [library]?"
- "Evaluate this dependency"
- "Security alert on [package]"
- "Update [dependency] to new version?"
- "What's the best library for [task]?"

## Core Capabilities

### 1. Dependency Evaluation
- Assess library popularity and maintenance
- Evaluate security track record
- Review documentation quality
- Check community support
- Analyze license compatibility

### 2. Version Management
- Plan dependency updates
- Evaluate breaking changes
- Test version compatibility
- Manage version conflicts
- Track deprecation notices

### 3. Security Assessment
- Scan for known vulnerabilities
- Monitor security advisories
- Evaluate dependency chain security
- Assess supply chain risks
- Plan security updates

### 4. Alternative Analysis
- Compare competing libraries
- Evaluate build vs buy decisions
- Assess long-term viability
- Consider maintenance burden
- Analyze total cost of ownership

## [TECH_STACK_SPECIFIC] Best Practices

### Package Management
[TECH_STACK_SPECIFIC]
- **Package Manager**: [npm, bundler, pip, etc.]
- **Lock Files**: [package-lock.json, Gemfile.lock, etc.]
- **Versioning**: [Semantic versioning strategy]
- **Private Packages**: [Internal package management]
- **Registry**: [Public registry or private registry]

### Dependency Declaration
[TECH_STACK_SPECIFIC]
- **Production Deps**: [How to declare runtime dependencies]
- **Development Deps**: [How to declare dev-only dependencies]
- **Version Constraints**: [^, ~, exact version strategies]
- **Peer Dependencies**: [Framework peer dependency handling]

### Security Tools
[TECH_STACK_SPECIFIC]
- **Vulnerability Scanner**: [npm audit, bundle audit, etc.]
- **Update Tools**: [Dependabot, Renovate, etc.]
- **License Checker**: [License compliance tools]
- **SBOM Generation**: [Software Bill of Materials tools]

### Update Strategy
[TECH_STACK_SPECIFIC]
- **Minor Updates**: [Frequency and testing approach]
- **Major Updates**: [Planning and migration process]
- **Security Patches**: [Immediate update policy]
- **Testing**: [Test suite requirements before update]

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - npm/bundler/pip - Package management operations
     - security-scanner - Vulnerability scanning
     - license-checker - License compliance
     - [TECH_STACK_SPECIFIC] - Framework-specific tools

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Specwright Workflows
- **specwright/workflows/execute-tasks.md** - Execute dependency updates and reviews
- **specwright/product/architecture-decision.md** - Dependency decisions log
- **.specwright/specs/[feature]/sub-specs/technical-spec.md** - Tech specs

### External Tools
- GitHub Dependency Graph
- Snyk / GitHub Advanced Security
- npm audit / bundle-audit
- License compliance scanners
- OWASP Dependency-Check

## Quality Checklist

### Library Selection
- [ ] Library is actively maintained (commits in last 6 months)
- [ ] Library has strong community (stars, downloads, issues)
- [ ] Documentation is comprehensive and clear
- [ ] Library is stable (version >= 1.0 or widely used)
- [ ] License is compatible with project

### Security
- [ ] No known security vulnerabilities
- [ ] Security advisories are addressed promptly
- [ ] Dependency chain is scanned
- [ ] Source is from trusted registry
- [ ] Package signatures verified (if available)

### Architecture Fit
- [ ] Library solves the specific problem well
- [ ] Not over-engineered for the use case
- [ ] Compatible with existing stack
- [ ] Doesn't conflict with other dependencies
- [ ] Acceptable performance characteristics

### Maintenance
- [ ] Long-term viability assessed
- [ ] Breaking changes in updates are manageable
- [ ] Alternative libraries exist if needed
- [ ] Internal expertise to maintain if forked
- [ ] Update frequency is reasonable

### Compliance
- [ ] License allows commercial use (if applicable)
- [ ] License is compatible with project license
- [ ] Attribution requirements understood
- [ ] No GPL contamination (if applicable)
- [ ] Export control compliance (if applicable)

## Integration with Other Skills

### Works Closely With
- **pattern-enforcement** - Dependency usage patterns
- **security-guidance** - Security vulnerability assessment
- **api-designing** - Third-party API integration
- **data-modeling** - Database driver selection

### Provides Input To
- **Development team** - Approved dependencies list
- **Security team** - Vulnerability reports
- **Legal team** - License compliance
- **DevOps team** - Deployment dependencies

### Receives Input From
- **Security alerts** - Vulnerability notifications
- **Feature requirements** - New capabilities needed
- **Performance issues** - Library performance problems
- **Compliance team** - License restrictions

## Examples

### Example 1: Evaluating a New Library

**Scenario:** Choose a library for PDF generation

**Evaluation:**
```
[TECH_STACK_SPECIFIC]

REQUIREMENT: Generate PDF invoices from HTML templates

CANDIDATES:
1. [Popular Library A]
2. [Popular Library B]
3. Build custom solution

EVALUATION CRITERIA:

1. [Library A] - Mature and feature-rich
   ✓ GitHub: 15k stars, 200 contributors
   ✓ Last commit: 2 days ago
   ✓ npm downloads: 2M/week
   ✓ Documentation: Excellent with examples
   ✓ License: MIT
   ✓ Version: 3.2.1 (stable)
   ✗ Bundle size: 2.5MB (large)
   ✗ Dependencies: 45 (many transitive deps)

2. [Library B] - Lightweight alternative
   ✓ GitHub: 5k stars, 30 contributors
   ✓ Last commit: 1 week ago
   ✓ npm downloads: 500k/week
   ✓ Documentation: Good
   ✓ License: Apache 2.0
   ✓ Version: 2.0.3 (stable)
   ✓ Bundle size: 400KB (small)
   ✓ Dependencies: 5 (minimal)
   ✗ Fewer advanced features

3. Custom Solution
   ✓ Complete control
   ✓ No external dependency
   ✗ Development time: 2-3 weeks
   ✗ Ongoing maintenance burden
   ✗ Reinventing the wheel

RECOMMENDATION: [Library B]
RATIONALE:
- Meets all current requirements
- Smaller footprint reduces security surface
- Fewer dependencies = less maintenance
- Well-maintained and stable
- Can switch to Library A if advanced features needed

DECISION RECORD: Log in specwright/product/architecture-decision.md
```

### Example 2: Security Vulnerability Response

**Scenario:** Security alert on existing dependency

**Response:**
```
[TECH_STACK_SPECIFIC]

ALERT: CVE-2024-12345 in [library-name] < 2.5.1
SEVERITY: High (CVSS 7.8)
IMPACT: Remote Code Execution via malicious input

CURRENT VERSION: 2.4.0
AFFECTED: Yes
EXPLOITABILITY: High (PoC available)

ASSESSMENT:
1. Verify vulnerability applies to our usage
   - Review vulnerable code path
   - Check if we use affected feature
   - Result: YES, we are vulnerable

2. Check patch availability
   - Version 2.5.1 released 2 days ago
   - Changelog: Security fix only, no breaking changes
   - Result: Safe to update

3. Test compatibility
   - Run test suite with 2.5.1
   - Check for deprecation warnings
   - Result: All tests pass

ACTION PLAN:
1. IMMEDIATE (Today):
   - Update to 2.5.1
   - Run full test suite
   - Deploy to staging
   - Verify fix

2. SHORT-TERM (This week):
   - Deploy to production
   - Monitor for issues
   - Document incident

3. LONG-TERM:
   - Enable automated security scanning
   - Set up dependency update automation
   - Establish security update SLA

COMMUNICATION:
- Notify team: High priority security update
- Notify stakeholders: Timeline for fix
- Document: Post-mortem and prevention
```

### Example 3: Version Update Planning

**Scenario:** Major version update of framework

**Plan:**
```
[TECH_STACK_SPECIFIC]

UPDATE: [Framework] 7.x → 8.x
TYPE: Major version (breaking changes expected)
MOTIVATION: New features, security support, performance

BREAKING CHANGES ANALYSIS:
1. Deprecated feature X removed
   - Impact: Used in 3 controllers
   - Migration: Use new feature Y
   - Effort: 4 hours

2. API change in module Z
   - Impact: Used in authentication layer
   - Migration: Update to new API
   - Effort: 8 hours

3. Configuration format changed
   - Impact: All config files
   - Migration: Run automated converter
   - Effort: 2 hours

DEPENDENCY CONFLICTS:
- [Plugin A] compatible from v2.0+
- [Plugin B] not yet compatible (blocking)
- [Plugin C] requires update to v3.x

MIGRATION PLAN:
Phase 1: Preparation (Week 1)
- Create feature branch
- Update [Plugin A] to v2.0
- Wait for [Plugin B] compatibility or find alternative
- Review all breaking changes

Phase 2: Migration (Week 2)
- Update framework to 8.x
- Fix breaking changes
- Update tests
- Run full test suite

Phase 3: Testing (Week 3)
- QA testing on staging
- Performance testing
- Security review
- Fix any issues

Phase 4: Deployment (Week 4)
- Deploy to production during low-traffic window
- Monitor closely
- Rollback plan ready

ROLLBACK PLAN:
- Keep 7.x branch available
- Database migrations reversible
- Can redeploy 7.x if critical issues

DECISION: Proceed with migration
BLOCKER: Wait for [Plugin B] v8.x support (ETA: 2 weeks)
```

### Example 4: Build vs Buy Decision

**Scenario:** Need user authentication system

**Analysis:**
```
[TECH_STACK_SPECIFIC]

REQUIREMENT: User authentication with OAuth, 2FA, SSO

OPTION 1: Use Authentication Library/Service
Examples: [Auth Service A], [Library B], [Framework Built-in]

PROS:
✓ Battle-tested security
✓ Fast implementation (days)
✓ Regular security updates
✓ Compliance certifications
✓ Documentation and support
✓ Industry best practices

CONS:
✗ External dependency
✗ Ongoing costs (for hosted services)
✗ Less customization
✗ Vendor lock-in risk
✗ Learning curve

OPTION 2: Build Custom Auth System

PROS:
✓ Complete control
✓ Perfect customization
✓ No external dependency
✓ No recurring costs

CONS:
✗ Security expertise required
✗ Development time: 4-6 weeks
✗ Ongoing maintenance burden
✗ Compliance complexity
✗ Testing burden
✗ High risk if done wrong

RECOMMENDATION: Use [Auth Library/Service]

RATIONALE:
- Security is critical - use proven solution
- Faster time to market
- Compliance requirements met out-of-box
- Team can focus on core product
- Auth is not our competitive advantage
- Risk of custom auth errors is too high

COST ANALYSIS:
- Service cost: $X/month
- Build cost: 6 weeks × $developer_rate
- Maintenance: Ongoing burden
- Break-even: Service pays for itself in reduced risk

DECISION: Adopt [Auth Library]
See: specwright/product/architecture-decision.md#DEC-XXX
```

### Example 5: License Compliance Check

**Scenario:** Audit dependencies for license compliance

**Audit:**
```
[TECH_STACK_SPECIFIC]

PROJECT LICENSE: MIT
COMPATIBILITY: Must allow commercial use, modification, distribution

DEPENDENCY LICENSES:

COMPATIBLE (No issues):
✓ MIT: 127 packages
✓ Apache 2.0: 34 packages
✓ BSD-3-Clause: 12 packages
✓ ISC: 8 packages

REVIEW REQUIRED (Copyleft):
⚠ LGPL-3.0: [library-name] v1.2.3
  - Used for: [specific feature]
  - Risk: LGPL allows dynamic linking (OK)
  - Action: Verify dynamic linking, document

⚠ GPL-3.0: [dev-tool] v2.0.0
  - Used for: Development tooling only
  - Risk: Not distributed with product (OK)
  - Action: Ensure stays in devDependencies

PROBLEMATIC (Incompatible):
✗ Custom restrictive license: [library-x]
  - Used for: [feature]
  - Risk: Restricts commercial use
  - Action: REMOVE - find alternative

ACTION ITEMS:
1. Remove [library-x] (incompatible license)
2. Find alternative for [feature]
3. Document LGPL usage compliance
4. Set up automated license checking in CI
5. Create approved licenses list

APPROVED LICENSES:
- MIT
- Apache 2.0
- BSD (2-Clause, 3-Clause)
- ISC
- Unlicense
- CC0

PROHIBITED LICENSES:
- GPL (except dev dependencies)
- AGPL
- Custom restrictive licenses

TOOL SETUP:
Add to CI pipeline:
$ [license-checker-command]
Fail build if prohibited license detected
```

## Skill Activation Flow

```
1. IDENTIFY: Dependency need or issue
2. RESEARCH: Available options and alternatives
3. EVALUATE: Security, maintenance, fit, license
4. COMPARE: Pros/cons of each option
5. TEST: Proof of concept if uncertain
6. DECIDE: Select best option with rationale
7. DOCUMENT: Decision and reasoning
8. MONITOR: Ongoing security and updates
```

## Success Metrics

- No high-severity vulnerabilities in dependencies
- All dependencies actively maintained
- License compliance maintained
- Minimal dependency conflicts
- Smooth dependency updates
- Clear documentation of dependency decisions
- Reduced dependency count over time (where appropriate)

## Notes

- Fewer dependencies = less security surface and maintenance
- Prefer well-maintained, popular libraries over obscure ones
- Security updates should be applied promptly
- Document why each dependency exists
- Regularly audit and remove unused dependencies
- Balance convenience with long-term maintenance burden
- "Not invented here" syndrome is bad, but so is dependency hell
- Lock files should be committed to version control
- Test before updating, especially major versions
