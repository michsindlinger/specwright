# Story Size Guidelines

## Context

Guidelines for optimal User Story size to minimize token usage and prevent mid-story conversation compaction.

Based on Claude Code best practices and the 200K token threshold optimization.

---

## Why Story Size Matters

**Token Economics:**
- Under 200K tokens: $3 per million input tokens
- Over 200K tokens: $6 per million (2x cost)
- Output tokens: $22.50 per million (1.5x above 200K)

**Quality Impact:**
- Smaller stories = Deeper analysis
- Focused context = More accurate code
- Clear boundaries = Better reviews
- Less context = Faster responses

**Workflow Impact:**
- Auto-compaction during story = Lost context
- Need to resume mid-story = Continuity issues
- Large reviews = Review fatigue

---

## Story Size Limits

### Backend Stories

**Recommended:**
- Max **3-5 files** created/modified
- Max **300-500 lines** of new/changed code
- Max **2-3 dependencies** on other stories
- Single responsibility (one feature aspect)

**Examples of Good Size:**
```
✅ "Implement JWT token refresh endpoint"
   - 1 service file
   - 1 controller file
   - 1 test file
   - ~400 lines total

✅ "Add Redis session storage"
   - 1 session service
   - 1 Redis adapter
   - 1 config file
   - 1 test file
   - ~350 lines total
```

**Too Large:**
```
❌ "Implement complete authentication system"
   - Would touch 15+ files
   - Mix of concerns (JWT, sessions, OAuth, MFA)
   - Should be 4-6 separate stories
```

### Frontend Stories

**Recommended:**
- Max **3-4 components** created/modified
- Max **400-600 lines** including JSX/CSS
- Max **2-3 hooks/utilities**
- Single UI feature or user flow

**Examples of Good Size:**
```
✅ "Create Login Form Component"
   - 1 LoginForm component
   - 1 useAuth hook
   - 1 test file
   - ~300 lines total

✅ "Add Dark Mode Toggle"
   - 1 ThemeToggle component
   - 1 useTheme hook
   - Update 2 layout components
   - ~450 lines total
```

**Too Large:**
```
❌ "Build complete user dashboard"
   - Would create 10+ components
   - Multiple features mixed together
   - Should be 5-8 separate stories
```

### DevOps Stories

**Recommended:**
- Max **2-3 config files**
- Max **1-2 scripts**
- Max **300 lines** configuration
- Single deployment/infrastructure aspect

**Examples of Good Size:**
```
✅ "Setup GitHub Actions CI pipeline"
   - 1 workflow file
   - 1 docker-compose.yml update
   - ~200 lines total

✅ "Add Redis to infrastructure"
   - 1 docker-compose addition
   - 1 environment config
   - 1 health check script
   - ~250 lines total
```

### Test Stories

**Recommended:**
- Test **one specific feature/module**
- Max **3-4 test files**
- Max **500 lines** of test code
- Focus on one testing aspect (unit, integration, or e2e)

**Examples of Good Size:**
```
✅ "Write integration tests for auth endpoints"
   - 1 test file covering 3-4 endpoints
   - ~400 lines total

✅ "Add e2e tests for checkout flow"
   - 1 e2e test file
   - Test data setup
   - ~350 lines total
```

---

## Story Splitting Strategies

### When to Split

If a story has ANY of these characteristics, consider splitting:

- [ ] Touches more than 5 files
- [ ] Adds/modifies more than 600 lines of code
- [ ] Has more than 3 dependencies on other stories
- [ ] Mixes multiple concerns (e.g., backend + frontend + DevOps)
- [ ] Takes more than one session to complete
- [ ] Agent needs to read 10+ files for context

### How to Split

**Pattern 1: Vertical Slice (Recommended)**
```
❌ Original: "Add user profile editing"

✅ Split:
   Story 1: "Backend - User profile update endpoint"
   Story 2: "Frontend - Profile edit form component"
   Story 3: "Integration - Connect form to API"
   Story 4: "Tests - Profile editing test suite"
```

**Pattern 2: Layer by Layer**
```
❌ Original: "Implement product catalog"

✅ Split:
   Story 1: "Database - Product schema and migrations"
   Story 2: "Backend - Product CRUD endpoints"
   Story 3: "Frontend - Product list component"
   Story 4: "Frontend - Product detail component"
   Story 5: "Tests - Product feature test coverage"
```

**Pattern 3: Feature Decomposition**
```
❌ Original: "Build authentication system"

✅ Split:
   Story 1: "JWT token generation and validation"
   Story 2: "Login/logout endpoints"
   Story 3: "Session management with Redis"
   Story 4: "Password reset flow"
   Story 5: "OAuth integration (Google)"
   Story 6: "MFA (2FA) support"
```

**Pattern 4: Incremental Enhancement**
```
❌ Original: "Add comprehensive error handling"

✅ Split:
   Story 1: "Error handling - API layer"
   Story 2: "Error handling - Database layer"
   Story 3: "Error handling - Frontend components"
   Story 4: "Error logging and monitoring"
```

---

## Validation During /create-spec

### Automated Checks

When creating user stories, the system should validate:

1. **File Count Check**
   - Count files in WO (Where) section
   - Warn if > 5 files

2. **Complexity Indicators**
   - Multiple WAS (What) items?
   - Complex WIE (How) description?
   - Many dependencies?

3. **Multi-Layer Detection**
   - Story touches backend AND frontend?
   - Suggest splitting by layer

### Warning Messages

```markdown
⚠️ Story Size Warning: Story 3 exceeds recommended size

**Detected Issues:**
- Touches 8 files (recommended: max 5)
- Spans backend + frontend layers
- Estimated 800+ lines of code

**Recommendation:**
Split into 2-3 stories:
1. Backend implementation (API + DB)
2. Frontend implementation (Components)
3. Integration + tests

**Proceed anyway? (yes/no/edit)**
```

---

## Context Budget Per Story

### Estimated Token Usage by Story Type

**Small Story (3 files, 300 lines):**
- Initial context load: ~10K tokens
- Agent implementation: ~15K tokens
- Reviews (Architect + QA): ~20K tokens
- **Total: ~45K tokens** ✅ Safe

**Medium Story (5 files, 500 lines):**
- Initial context load: ~18K tokens
- Agent implementation: ~30K tokens
- Reviews: ~35K tokens
- **Total: ~83K tokens** ⚠️ Watch carefully

**Large Story (8+ files, 800+ lines):**
- Initial context load: ~30K tokens
- Agent implementation: ~50K tokens
- Reviews: ~60K tokens
- **Total: ~140K tokens** ❌ Likely auto-compact

### Target

**Aim for stories that consume < 60K tokens total**
- Leaves headroom for conversation
- Prevents mid-story compaction
- Stays well under 200K threshold

---

## Story Template with Size Hints

```markdown
## Story X: [Title]

**Size Estimate:** [Small | Medium | Large]
- Files affected: [count]
- Estimated lines: [count]
- Complexity: [Low | Medium | High]

⚠️ If Large: Consider splitting before implementation

### [Rest of story template...]
```

---

## Benefits of Right-Sized Stories

1. **Cost Optimization**
   - Stay under 200K threshold
   - Minimize token usage
   - Reduce output token costs

2. **Quality Improvement**
   - Deeper agent focus
   - More accurate code generation
   - Better review quality

3. **Workflow Continuity**
   - No mid-story compaction
   - Clear completion points
   - Easy resume after pause

4. **Team Efficiency**
   - Clear story boundaries
   - Easier to parallelize
   - Better progress tracking

---

## References

- [Agent OS Best Practices](../standards/best-practices.md)
- [Execute Tasks Workflow](../workflows/core/execute-tasks.md)
- [Create Spec Workflow](../workflows/core/create-spec.md)

**External:**
- Claude Code 1M Token Optimization (Medium article)
- Microservices decomposition principles
