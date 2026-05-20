# Atomicity Guidelines

> Specwright Framework Standard
> Version: 1.0 (2026-05-20)
> Based on: Patel, Surendira, George, Kapale — *The Six Sigma Agent* (arXiv:2601.22290, Jan 2026), §4.2 Definition 2

## Why Atomicity Matters

Specwright stories and tasks are units of work executed by `/execute-tasks` (often by independent LLM sessions). If a unit is **not atomic**, downstream reliability collapses:

- **Consensus voting** (Six-Sigma §4.4) cannot work on subjective outputs — multiple agents produce divergent "correct" answers.
- **Build/test gates** cannot run without a concrete oracle.
- **Multi-agent execution** cannot parallelize work whose dependencies are unclear.

This standard defines what makes a story or task atomic, which Test-Oracles are accepted, and how the `atomicity-validator` skill applies these criteria.

## The Three Criteria (Six-Sigma §4.2 Definition 2)

An atomic action `a: X → Y` satisfies all three:

### 1. Minimality

The action cannot be decomposed further without loss of semantic coherence.

**In Specwright:** ≤5 files in scope, single dominant concern (no "AND" connecting 3+ verbs), spans at most 2 architectural layers.

### 2. Verifiability

Given an input and a candidate output, correctness is objectively determinable.

**In Specwright:** the story names a concrete Test-Oracle — a Bash command or MCP-Playwright scenario whose pass/fail outcome decides done-ness.

### 3. Functional Determinism

Given perfect reasoning, the correct output is uniquely determined by the input.

**In Specwright:** no subjective vocabulary in the work description. Words like "improve", "polish", "verbessern", "aufräumen" admit multiple equally-valid outputs.

## Acceptable Test-Oracle Types

Source: `specwright/templates/docs/story-template.md`, section "Technische Verifikation".

| Oracle | Format | Example |
|--------|--------|---------|
| `FILE_EXISTS:` | `FILE_EXISTS: <path>` | `FILE_EXISTS: src/auth/totp.py` |
| `CONTAINS:` | `CONTAINS: <path> <text>` | `CONTAINS: package.json "node": ">=20"` |
| `LINT_PASS:` | `LINT_PASS:` (no arg) | `LINT_PASS:` |
| `TEST_PASS:` | `TEST_PASS: <test path>` | `TEST_PASS: tests/auth/test_totp.py` |
| `MCP_PLAYWRIGHT:` | `MCP_PLAYWRIGHT: <scenario>` | `MCP_PLAYWRIGHT: mfa-setup-flow` |

**Not accepted as oracle:**
- `TBD`, `tbd`, `<TODO>`, `?`, empty
- Prose without a runnable command (e.g. "verify visually that it looks right")
- "User confirms" without a measurable check

## Subjective Vocabulary List (Determinism FAIL Triggers)

Validator-Heuristik matches case-insensitively on word boundaries.

**English:**
`improve`, `polish`, `clean up`, `refactor for clarity`, `make better`, `nicer`, `smoother`, `optimize ux`, `optimize performance` (without metric), `beautify`, `streamline`

**German:**
`verbessern`, `aufräumen`, `optimieren`, `schöner`, `sauberer`, `klarer`, `robuster`, `einfacher`, `eleganter`, `übersichtlicher`, `polishen`, `vereinfachen`, `hübscher`

**Allowed contexts (PASS):**

- Banned word + numeric metric: `"optimize to <100ms"`, `"verbessern auf 200 req/sec"`
- Banned word + oracle reference: `"clean up — see TEST_PASS in section"`
- Story frontmatter contains `atomicity_override: <reason>` — skips determinism check entirely

## Atomic-vs-Non-Atomic Examples

### Example 1: AND-Concern

❌ `WAS: Rename UserSvc to MemberSvc AND add MFA AND migrate DB schema`
✅ Three stories with dependencies:
1. Rename UserSvc to MemberSvc (rename-only, atomic)
2. Migrate DB schema for MemberSvc (depends on 1)
3. Add MFA endpoint to MemberSvc (depends on 1+2)

### Example 2: Subjective UX

❌ `WAS: Improve checkout UX`
✅ `WAS: Reduce checkout from 4 steps to 2 steps. Verify via MCP_PLAYWRIGHT: checkout-2step-flow`

### Example 3: Refactor Without Oracle

❌ `WAS: Refactor logging module for clarity` (no oracle, subjective verb)
✅ `WAS: Extract Logger class out of utils.py. Move 6 functions to logger.py. Verify via TEST_PASS: tests/test_logger.py LINT_PASS:`

### Example 4: Too Wide Scope

❌ Story touches 8 files across frontend + backend + db + tests + infra
✅ Split into one story per layer with explicit dependencies

### Example 5: Optimize With Metric

✅ `WAS: Optimize getUserDashboard query to p95 < 50ms. Verify via TEST_PASS: tests/perf/dashboard.py` (metric + oracle = atomic)

### Example 6: Multi-Layer Single-Concern

✅ `WAS: Add /auth/mfa/totp endpoint (backend) + MfaSetupForm component (frontend)` (2 layers, single concern: MFA setup — atomic, even though crossing layers)

## Severity Table (which FAIL → which Prompt)

| FAIL Criterion | Severity | User Action |
|----------------|----------|-------------|
| Verifiability | High | Prompt: add oracle or accept warning (frontmatter `atomicity_status: warn-no-oracle`) |
| Minimality | Medium | Advisory display; choice: continue OR re-decompose (max 3 retries) |
| Functional Determinism | Medium | Advisory display with suggested rewording; choice: continue OR re-decompose |
| Multiple FAILs on same story | High | All prompts apply; resolve Verifiability first, then offer single re-decompose option |

After 3 re-decompose retries, validator force-proceeds and writes audit-log to `spec.md` tail-section. This prevents infinite loops on inherently subjective work (e.g. UX polish stories) — the audit-log makes the trade-off visible.

## Frontmatter Fields

The validator reads/writes these YAML frontmatter fields at the top of each story file:

- `atomicity_status: warn-no-oracle` — set when user accepts Verifiability warning
- `atomicity_accepted_on: YYYY-MM-DD` — date of user acceptance
- `atomicity_override: <reason>` — user-set, skips Determinism check (e.g. "user-facing UX iteration, measurable via A/B test")

## V2 Lean Mode

V2 Lean tasks live in `kanban.json` (no per-task `.md` files). The validator's inline subset used in Step 2.6-lean checks Minimality + Determinism only. Verifiability is implied via the `planSection` reference — if the plan section names Build/Test/Lint commands, that satisfies the oracle requirement. The full skill is **not loaded** in Lean mode.

## References

- Patel, Surendira, George, Kapale. *The Six Sigma Agent: Achieving Enterprise-Grade Reliability in LLM Systems Through Consensus-Driven Decomposed Execution.* arXiv:2601.22290, Jan 2026.
- `specwright/templates/skills/atomicity-validator/SKILL.md` — heuristic implementation
- `specwright/workflows/core/create-spec.md` Step 3.5.1 (V1) + Step 2.6-lean inline (V2)
- `specwright/templates/docs/story-template.md` — canonical story format
