---
description: Market Validation System for data-driven GO/NO-GO decisions before development
globs:
alwaysApply: false
version: 5.0
encoding: UTF-8
installation: global
---

# Market Validation Workflow

Validate product-market fit through competitive analysis, landing page validation, ad campaigns, and data-driven decision-making.

## What's New in v5.0

- **BREAKING: Main Agent Pattern** - All complex tasks now executed by main agent directly (was: Sub-Agent delegation to 9 specialist agents)
- **REMOVED: Sub-Agent delegations** - No more specialist agent handoff chain
- **Utility Agents remain** - context-fetcher for file loading
- **Inline Guidance** - All process knowledge embedded in step descriptions (no separate skills needed - workflow runs once per product)

### Removed in v5.0
- ❌ `marketing-system__product-idea-refiner` → Main Agent (interactive dialog)
- ❌ `marketing-system__market-researcher` → Main Agent (WebSearch + Perplexity MCP)
- ❌ `marketing-system__product-strategist` → Main Agent (positioning + brand story)
- ❌ `marketing-system__content-creator` → Main Agent (copywriting)
- ❌ `marketing-system__seo-expert` → Main Agent (keyword research)
- ❌ `marketing-system__landing-page-builder` → Main Agent (HTML/CSS generation)
- ❌ `marketing-system__quality-assurance` → Main Agent (QA checks)
- ❌ `validation-specialist` → Main Agent (campaign planning)
- ❌ `business-analyst` → Main Agent (GO/NO-GO decision)

## File Lookup Strategy

This workflow uses **dual-lookup** for templates:

**Lookup Order**:
1. **Project-local first**: `projekt/specwright/templates/documents/`
2. **Global fallback**: `~/.specwright/templates/documents/`

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<!-- ============================================ -->
<!-- PHASE 1: PRODUCT DEFINITION (Steps 1-4)     -->
<!-- ============================================ -->

<step number="1" subagent="context-fetcher" name="context_loading">

### Step 1: Context Loading (Conditional)

Use the context-fetcher subagent to load existing product context if available.

<conditional_logic>
  IF product-brief.md exists in .specwright/product/:
    LOAD: product-brief.md
    INFORM user: "Found existing product-brief.md, will use this as base."
    SKIP: Step 2 and 3
    PROCEED to step 4
  ELSE:
    PROCEED to step 2
</conditional_logic>

</step>

<step number="2" name="product_idea_capture">

### Step 2: Product Idea Capture

Request product idea from user (if not provided in command arguments).

**Prompt User:**
```
Please describe your product idea (1-3 paragraphs). Can be rough - we'll sharpen it together.

Examples of valid input:
- Vague: "A tool for invoicing"
- Moderate: "An invoicing app for freelancers that's simpler than QuickBooks"
- Detailed: "Automated invoice generation from time tracking for creative freelancers"
```

<conditional_logic>
  IF user provided idea in command arguments:
    USE provided idea
    PROCEED to step 3
  ELSE:
    ASK user for product idea
    WAIT for user input
    STORE user input
    PROCEED to step 3
</conditional_logic>

</step>

<step number="3" name="idea_sharpening">

### Step 3: Idea Sharpening (Interactive)

Main agent transforms the vague idea into a complete product brief through interactive dialog.

**Process:**
1. Analyze user's initial idea for completeness
2. Identify missing information required for product-brief.md template
3. Ask clarifying questions using AskUserQuestion tool:
   - Target audience (specific segment, not "everyone")
   - Core problem (measurable impact)
   - Key features (3-5 concrete features)
   - Value proposition (why better than alternatives)
   - Success metrics (how to measure success)
4. Continue asking until ALL template fields can be filled
5. Generate product-brief.md from template

**Template Location:** `@specwright/templates/documents/product-brief.md`

**Output:** `.specwright/product/product-brief.md`

<quality_check>
  Product brief must include:
  - Specific target audience (not "everyone")
  - Measurable problem (frequency, impact, cost)
  - 3-5 concrete features (not 20)
  - Clear value proposition
  - Differentiation hypothesis

  IF any element missing or vague:
    CONTINUE asking questions
  ELSE:
    PROCEED to step 4
</quality_check>

</step>

<step number="4" name="user_review_product_brief">

### Step 4: User Review Gate - Product Brief

**PAUSE FOR USER APPROVAL**

Present the generated product-brief.md to the user for review.

**Prompt User:**
```
I've created your Product Brief based on our discussion.

Please review: .specwright/product/product-brief.md

Options:
1. Approve and continue to competitive analysis
2. Request changes (specify what needs adjustment)
3. Start over with a different idea
```

<conditional_logic>
  IF user approves:
    PROCEED to step 5
  ELIF user requests changes:
    MAKE requested changes
    RETURN to step 4 (re-review)
  ELSE:
    RETURN to step 2
</conditional_logic>

</step>

<!-- ============================================ -->
<!-- PHASE 2: MARKET RESEARCH (Steps 5-6)        -->
<!-- ============================================ -->

<step number="5" name="competitive_analysis">

### Step 5: Competitive Analysis

Main agent conducts comprehensive competitive research using available search tools.

**Input:**
- Product brief: `.specwright/product/product-brief.md`

**Process:**
1. READ product-brief.md for context
2. Use Perplexity MCP (`mcp__perplexity__deep_research`) to identify 5-10 competitors
3. Use WebSearch and WebFetch for detailed competitor info:
   - Pricing (all tiers)
   - Key features
   - Target audience
   - Reviews (G2, Capterra, Trustpilot)
   - Strengths and weaknesses
4. Create feature comparison matrix
5. Identify 3-5 market gaps (with evidence)
6. Generate competitor-analysis.md from template

**Template Location:** `@specwright/templates/documents/competitor-analysis.md`

**Output:** `.specwright/product/competitor-analysis.md`

<quality_check>
  Competitive analysis must include:
  - 5-10 competitors identified
  - Feature comparison matrix (5+ features)
  - Pricing analysis
  - 3+ market gaps with evidence
  - Research sources cited

  IF incomplete:
    REDO research for missing elements
  ELSE:
    PROCEED to step 6
</quality_check>

<error_handling>
  IF Perplexity MCP rate limit reached:
    - Use WebSearch as fallback
    - Note: "Perplexity rate limited, completed with WebSearch"
    - PROCEED (don't block)
</error_handling>

</step>

<step number="6" name="market_positioning">

### Step 6: Market Positioning & Brand Story

Main agent develops strategic positioning based on competitive analysis.

**Input:**
- Product brief: `.specwright/product/product-brief.md`
- Competitor analysis: `.specwright/product/competitor-analysis.md`

**Process:**
1. Analyze product brief and competitor analysis
2. Develop strategic market positioning based on identified gaps
3. Create compelling brand story using StoryBrand framework
4. Define communication style and tone of voice
5. Generate three output files from templates

**Template Locations:**
- `@specwright/templates/documents/market-position.md`
- `@specwright/templates/documents/story.md`
- `@specwright/templates/documents/stil-tone.md`

**Output:**
- `.specwright/product/market-position.md` (positioning statement, messaging pillars)
- `.specwright/product/story.md` (brand narrative, origin story, StoryBrand elements)
- `.specwright/product/stil-tone.md` (voice attributes, tone by context, writing style)

<quality_check>
  Strategic positioning must include:
  - Clear positioning statement (formula-based)
  - 3 messaging pillars with proof points
  - Complete StoryBrand framework
  - Practical tone guide with examples

  IF incomplete:
    REDO incomplete sections
  ELSE:
    PROCEED to step 7
</quality_check>

</step>

<step number="7" name="user_review_market_position">

### Step 7: User Review Gate - Market Position

**PAUSE FOR USER APPROVAL**

Present the competitive analysis and market positioning to the user.

**Prompt User:**
```
I've completed the competitive analysis and market positioning.

Please review:
- .specwright/product/competitor-analysis.md
- .specwright/product/market-position.md
- .specwright/product/story.md
- .specwright/product/stil-tone.md

Options:
1. Approve and finish (core validation complete)
2. Approve and continue to landing page creation (optional)
3. Request changes to analysis
```

<conditional_logic>
  IF user approves and finishes:
    PROCEED to step 16 (summary)
  ELIF user approves and wants landing page:
    PROCEED to step 8
  ELSE:
    MAKE requested changes
    RETURN to step 7
</conditional_logic>

</step>

<!-- ============================================ -->
<!-- PHASE 3: LANDING PAGE CREATION (Steps 8-14) -->
<!-- OPTIONAL SECTION                            -->
<!-- ============================================ -->

<step number="8" name="design_extraction">

### Step 8: Design System Extraction (Optional)

Ask user for design reference before creating landing page.

**Prompt User with AskUserQuestion:**
```
Would you like to provide a design reference for your landing page?

Options:
1. Provide URL of a website you like
2. Provide screenshot/mockup path
3. Use default clean minimal design
```

<conditional_logic>
  IF user provides URL:
    USE WebFetch to analyze design
    EXTRACT: colors, fonts, spacing, components
    GENERATE: .specwright/product/design-system.md

  ELIF user provides screenshot:
    USE Read tool to analyze image
    EXTRACT: visual patterns
    GENERATE: .specwright/product/design-system.md

  ELSE:
    USE default design tokens
    GENERATE: .specwright/product/design-system.md with defaults
</conditional_logic>

**Template:** `@specwright/templates/documents/design-system.md`
**Output:** `.specwright/product/design-system.md`

</step>

<step number="9" name="landing_page_structure">

### Step 9: Landing Page Structure (Optional)

Main agent defines the modular page structure based on product positioning.

**Input:**
- Product brief: `.specwright/product/product-brief.md`
- Market position: `.specwright/product/market-position.md`
- Brand story: `.specwright/product/story.md`
- Design system: `.specwright/product/design-system.md`

**Process:**
1. Analyze product brief and positioning to determine optimal page structure
2. Define module order (Hero, Social Proof, Problem, Solution, Features, How It Works, Testimonials, Pricing, FAQ, Final CTA, Footer)
3. Determine which modules are REQUIRED vs OPTIONAL for this product
4. Create wireframe-style layout specifications for each module
5. Define responsive behavior (mobile, tablet, desktop)
6. Document A/B testing opportunities

**Template:** `@specwright/templates/documents/landing-page-module-structure.md`
**Output:** `.specwright/product/landing-page-module-structure.md`

<quality_check>
  Module structure must include:
  - At least 6 modules defined (Hero, Features, CTA are mandatory)
  - Layout specifications for each module
  - Responsive breakpoints documented
  - Content placeholders clearly marked

  IF incomplete:
    REDO incomplete modules
  ELSE:
    PROCEED to step 10
</quality_check>

</step>

<step number="10" name="seo_optimization">

### Step 10: SEO Keyword Research & Optimization (Optional)

Main agent conducts keyword research and defines SEO specifications.

**Input:**
- Product brief: `.specwright/product/product-brief.md`
- Competitor analysis: `.specwright/product/competitor-analysis.md`
- Market position: `.specwright/product/market-position.md`
- Brand story: `.specwright/product/story.md`

**Process:**
1. Conduct keyword research using Perplexity MCP or WebSearch
2. Identify primary keyword (highest volume, medium difficulty)
3. Identify 3-5 secondary keywords
4. Identify 5-10 long-tail keywords (lower difficulty)
5. Analyze competitor keywords and gaps
6. Create keyword mapping for landing page elements
7. Define title tag, meta description, OG tags
8. Document keyword density targets
9. Create technical SEO checklist

**Template:** `@specwright/templates/documents/seo-keywords.md`
**Output:** `.specwright/product/seo-keywords.md`

<quality_check>
  SEO keywords document must include:
  - Primary keyword with volume and difficulty
  - At least 3 secondary keywords
  - At least 5 long-tail keywords
  - Keyword mapping for page elements
  - Title tag (50-60 chars)
  - Meta description (150-160 chars)

  IF incomplete:
    REDO keyword research for missing elements
  ELSE:
    PROCEED to step 11
</quality_check>

</step>

<step number="11" name="copywriting">

### Step 11: Content Creation (Optional)

Main agent creates landing page and ad copy.

**Input:**
- Product brief: `.specwright/product/product-brief.md`
- Market position: `.specwright/product/market-position.md`
- Brand story: `.specwright/product/story.md`
- Style and tone: `.specwright/product/stil-tone.md`
- Landing page structure: `.specwright/product/landing-page-module-structure.md`
- SEO keywords: `.specwright/product/seo-keywords.md`

**Process:**
1. Review landing-page-module-structure.md to understand required modules
2. Review seo-keywords.md for keyword integration requirements
3. Apply AIDA formula for landing page:
   - Attention: Benefit-driven headline (6-12 words, include primary keyword)
   - Interest: Subheadline with target audience
   - Desire: 3-5 features with emotional benefits
   - Action: Specific CTA (2-5 words)
4. Write content for each module defined in structure
5. Write FAQ section (5-7 Q&As addressing objections)
6. Create 7 Google ad variants (within character limits)
7. Create 5 Facebook ad variants (within character limits)
8. Integrate SEO keywords naturally (1-2% density)

**Template:** `@specwright/templates/documents/landingpage-contents.md`
**Output:** `.specwright/product/landingpage-contents.md`

<quality_check>
  Landing page content must include:
  - Content for all REQUIRED modules from structure
  - All headlines are benefit-driven
  - SEO keywords integrated naturally
  - 7 Google ad variants (all within character limits)
  - 5 Facebook ad variants (all within character limits)
  - Tone matches stil-tone.md guidelines

  IF incomplete:
    REDO incomplete content sections
  ELSE:
    PROCEED to step 12
</quality_check>

</step>

<step number="12" name="landing_page_build">

### Step 12: Landing Page Build (Optional)

Main agent generates the production-ready HTML landing page.

**Input:**
- Landing page structure: `.specwright/product/landing-page-module-structure.md`
- Landing page content: `.specwright/product/landingpage-contents.md`
- SEO keywords: `.specwright/product/seo-keywords.md`
- Design system: `.specwright/product/design-system.md`

**Process:**
1. Load module structure from landing-page-module-structure.md
2. Load content from landingpage-contents.md
3. Load SEO specifications from seo-keywords.md
4. Apply design system (colors, fonts, spacing) from design-system.md
5. Generate responsive HTML5 landing page following structure
6. Implement form with validation
7. Include all SEO meta tags (title, description, OG, Twitter)
8. Create self-contained index.html (<30KB)
9. NO external dependencies (except analytics placeholders)

**Constraints:**
- Single self-contained index.html file
- Inline CSS and JavaScript
- System fonts only (no Google Fonts CDN)
- Emoji icons only (no external images)
- No YouTube/video embeds
- <30KB total size, <3s load time

**Output:** `.specwright/market-validation/[DATE]-[product]/landing-page/index.html`

</step>

<step number="13" name="quality_assurance">

### Step 13: Quality Assurance (Optional)

Main agent validates the landing page for quality and responsiveness.

**Input:**
- Landing page: `.specwright/market-validation/[DATE]-[product]/landing-page/index.html`
- Design system: `.specwright/product/design-system.md`
- Landing page structure: `.specwright/product/landing-page-module-structure.md`

**Process:**
1. Test responsiveness across mobile, tablet, desktop viewports
2. Validate visual appearance (no broken layouts)
3. Verify all modules from structure are implemented
4. Check performance metrics (file size <30KB)
5. Verify accessibility basics (contrast, keyboard navigation)
6. Test form functionality (validation, submission)
7. Check for external dependencies (should be none except analytics)
8. Verify SEO elements present (title, meta, OG tags)
9. Compare against design-system.md specifications

**Output:** QA assessment with APPROVED or NEEDS_FIXES status

<conditional_logic>
  IF QA status = APPROVED:
    PROCEED to step 13b
  ELIF QA status = NEEDS_FIXES:
    FIX identified issues directly
    RE-RUN QA checks (step 13)
</conditional_logic>

</step>

<step number="13b" name="user_decision_phase4">

### Step 13b: User Decision - Continue to Phase 4?

**PAUSE FOR USER DECISION**

After landing page QA is approved, ask user if they want to proceed with Campaign Planning & GO/NO-GO Analysis.

**Prompt User with AskUserQuestion:**
```
Your landing page is ready for deployment!

Would you like to continue with Phase 4 (Campaign Planning & GO/NO-GO Analysis)?

Options:
1. Yes, continue to Campaign Planning
   → Create ad campaigns, analytics setup, and validation plan
   → After you run campaigns (2-4 weeks), get data-driven GO/NO-GO decision

2. No, finish here
   → Landing page is ready to deploy manually
   → You can return later with "/validate-market" and say "I have validation metrics"
```

<conditional_logic>
  IF user chooses "Yes, continue":
    PROCEED to step 14 (Campaign Planning)
  ELSE:
    PROCEED to step 17 (Summary)
    NOTE: "Phase 4 skipped - user can return later for GO/NO-GO analysis"
</conditional_logic>

</step>

<step number="14" name="campaign_planning">

### Step 14: Campaign Planning (Optional - requires user opt-in from Step 13b)

Main agent creates campaign plans after gathering budget and timeline from user.

**Prompt User with AskUserQuestion:**
```
Budget options: €300 (Starter) | €500 (Recommended) | €1,000 (Confident) | €2,000 (Aggressive)
Timeline options: 2 weeks (Fast) | 3 weeks (Balanced) | 4 weeks (Recommended)
```

**Input:**
- Product brief: `.specwright/product/product-brief.md`
- Market position: `.specwright/product/market-position.md`
- Landing page URL (after deployment)
- Ad copy from step 11 (landingpage-contents.md)

**Process:**
1. Calculate budget allocation (60% Google, 30% Meta, 10% Reserve)
2. Create detailed ad campaign plans (Google Ads + Meta Ads)
3. Generate analytics setup guide (GA4, Meta Pixel, Clarity)
4. Create comprehensive validation plan with success criteria
5. Provide step-by-step execution checklist

**Output:**
- `.specwright/market-validation/[DATE]-[product]/ad-campaigns.md`
- `.specwright/market-validation/[DATE]-[product]/analytics-setup.md`
- `.specwright/market-validation/[DATE]-[product]/validation-plan.md`

</step>

<!-- ============================================ -->
<!-- PHASE 4: VALIDATION & DECISION (Steps 15-17)-->
<!-- ============================================ -->

<step number="15" name="user_campaign_execution">

### Step 15: User Campaign Execution

**USER ACTION REQUIRED**

The user executes the validation campaign based on the provided plans.

**Duration:** 2-4 weeks (as selected in step 14)

**User Responsibilities:**
1. Deploy landing page to Netlify/Vercel/GitHub Pages
2. Install analytics tracking (GA4, Meta Pixel)
3. Create and launch ad campaigns
4. Monitor daily, optimize weekly
5. Collect qualitative feedback (reply to signups)
6. Compile final metrics after campaign ends

**Workflow Pauses Here Until User Returns With Metrics**

**Resume Trigger:** User provides validation metrics or says "I have validation metrics"

</step>

<step number="16" name="go_nogo_decision">

### Step 16: GO/NO-GO Decision

Main agent performs data-driven analysis for GO/NO-GO recommendation.

**Input:**
- Validation metrics from user:
  - Total visitors
  - Total conversions (email signups)
  - Ad spend (Google + Meta)
  - Campaign duration
  - Qualitative feedback (optional)
- Validation plan: `.specwright/market-validation/[DATE]-[product]/validation-plan.md`
- Competitor analysis: `.specwright/product/competitor-analysis.md`

**Process:**
1. Calculate primary metrics (Conversion Rate, CPA)
2. Evaluate against success criteria from validation-plan.md
3. Assess statistical significance (sample size, confidence interval)
4. Analyze qualitative feedback (sentiment, themes)
5. Generate decision matrix
6. Provide clear GO/MAYBE/NO-GO recommendation
7. Include product refinement recommendations (if GO)
8. Include alternative paths (if NO-GO)
9. Calculate financial projection (if GO)

**Decision Criteria (default, configurable):**
```
GO:     Conversion ≥5%, CPA ≤€10, TAM ≥100k
MAYBE:  Conversion 3-5%, CPA €10-€15, TAM 50-100k
NO-GO:  Conversion <3%, CPA >€15, TAM <50k
```

**Output:** `.specwright/market-validation/[DATE]-[product]/validation-results.md`

<quality_check>
  Validation results must include:
  - Clear decision (GO/MAYBE/NO-GO with confidence level)
  - Data-driven rationale (not opinions)
  - All 3 criteria analyzed with calculations
  - Statistical significance assessment
  - Specific actionable next steps

  IF decision is MAYBE:
    INCLUDE: Improvement plan and re-test criteria
  IF decision is NO-GO:
    INCLUDE: Value of validation (money/time saved)
    INCLUDE: Alternative paths (pivot options)
</quality_check>

</step>

<step number="17" name="summary">

### Step 17: Workflow Summary

Present summary based on what was created.

**Core Outputs (Always Created):**
- `product-brief.md` - Sharp product definition
- `competitor-analysis.md` - Market landscape
- `market-position.md` - Strategic positioning
- `story.md` - Brand narrative
- `stil-tone.md` - Communication guide

**Optional Outputs (If Landing Page Requested):**
- `design-system.md` - Visual design tokens
- `landing-page-module-structure.md` - Page structure and modules
- `seo-keywords.md` - Keyword research and SEO specifications
- `landingpage-contents.md` - All copy and content for landing page
- `landing-page/index.html` - Production-ready page
- `ad-campaigns.md` - Google + Meta ad plans
- `analytics-setup.md` - Tracking setup guide
- `validation-plan.md` - Campaign execution plan

**Post-Campaign Output:**
- `validation-results.md` - GO/NO-GO decision with analysis

**Next Steps Based on Decision:**

```
IF decision = GO:
  → Run /plan-product to proceed to product planning
  → Validated insights automatically inform product development
  → Use winning ad copy and channel insights

IF decision = MAYBE:
  → Implement improvement plan from validation-results.md
  → Re-run validation with specified changes
  → Reconvene for decision after re-test

IF decision = NO-GO:
  → Value: Saved €X development cost + Y months
  → Review alternative paths in validation-results.md
  → Apply learnings to next product idea

All files are in .specwright/product/ and .specwright/market-validation/
```

</step>

</process_flow>

## Quality Standards

### User Review Gates
1. After product-brief.md creation (Step 4)
2. After market-position.md creation (Step 7)

### QA Check
- After landing page generation (Step 13) - main agent validates quality

### Optional Features
- Landing page creation (Steps 8-13)
- **Phase 4: Campaign & Decision (Steps 14-16)** - User is asked at Step 13b if they want to continue
  - Campaign planning (Step 14) - requires user opt-in
  - User campaign execution (Step 15) - 2-4 weeks
  - GO/NO-GO decision (Step 16) - requires user to return with metrics

### Template Usage
All outputs use templates from `@specwright/templates/documents/`

### Workflow Flow

```
Main Agent: Idea Sharpening (interactive)
         ↓ (product-brief.md)
Main Agent: Competitive Analysis (WebSearch + Perplexity MCP)
         ↓ (competitor-analysis.md)
Main Agent: Market Positioning + Brand Story
         ↓ (market-position.md, story.md, stil-tone.md)
         ↓
    [OPTIONAL: LANDING PAGE PHASE - Steps 8-13]
         ↓
Main Agent: Design System Extraction
         ↓ (design-system.md)
Main Agent: Landing Page Structure
         ↓ (landing-page-module-structure.md)
Main Agent: SEO Keyword Research
         ↓ (seo-keywords.md)
Main Agent: Copywriting (AIDA formula)
         ↓ (landingpage-contents.md)
Main Agent: Landing Page Build (HTML/CSS)
         ↓ (index.html)
Main Agent: Quality Assurance
         ↓ (QA: APPROVED)
         ↓
    [USER DECISION: Continue to Phase 4? - Step 13b]
         ↓ (Yes / No → Summary)
         ↓
    [OPTIONAL: PHASE 4 - CAMPAIGN & DECISION - Steps 14-16]
         ↓
Main Agent: Campaign Planning
         ↓ (ad-campaigns.md, analytics-setup.md, validation-plan.md)
    [USER EXECUTES CAMPAIGN - 2-4 weeks]
         ↓ (metrics)
Main Agent: GO/NO-GO Decision
         ↓ (validation-results.md: GO/MAYBE/NO-GO)
```

---

## Execution Summary

**Minimum Duration:** 10-15 minutes (core only: Steps 1-7)
**Full Duration:** 30-40 minutes (with landing page: Steps 1-14)
**Post-Campaign:** 5-10 minutes (GO/NO-GO decision: Step 16)

**Core Outputs (5 files):**
1. `product-brief.md`
2. `competitor-analysis.md`
3. `market-position.md`
4. `story.md`
5. `stil-tone.md`

**Optional Outputs (8 files):**
6. `design-system.md`
7. `landing-page-module-structure.md`
8. `seo-keywords.md`
9. `landingpage-contents.md`
10. `landing-page/index.html`
11. `ad-campaigns.md`
12. `analytics-setup.md`
13. `validation-plan.md`

**Post-Campaign Output (1 file):**
14. `validation-results.md`
