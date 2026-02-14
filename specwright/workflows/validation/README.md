# Market Validation System - Complete Guide

> Specwright - Phase A: Market Validation
> Version: 2.0
> Last Updated: 2025-12-27

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Why Market Validation?](#why-market-validation)
4. [How the System Works](#how-the-system-works)
5. [Step-by-Step Walkthrough](#step-by-step-walkthrough)
6. [Specialist Agents](#specialist-agents)
7. [Example Validation Project](#example-validation-project)
8. [Customization & Overrides](#customization--overrides)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)
11. [FAQ](#faq)

---

## Introduction

The Market Validation System helps you validate product-market fit **before** committing to expensive product development. Through competitive analysis, landing page testing, ad campaigns, and data-driven decision-making, you'll know if people actually want your product before investing months building it.

## Installation

### Recommended: Global Installation

Install once, use in all your projects:

```bash
# 1. Install globally to ~/.specwright/ and ~/.claude/
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-market-validation-global.sh | bash

# 2. In each project, create validation results directory
cd your-project
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-market-validation-project.sh | bash

# 3. Ready to use!
/validate-market "Your product idea"
```

**Benefits**:
- Install once, use everywhere
- Updates propagate to all projects
- Override specific components per project if needed

### Alternative: Project-Local Installation

Install in one specific project only:

```bash
cd your-project
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup.sh | bash
curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-claude-code.sh | bash
```

**Use When**:
- Testing the system
- Isolated environment
- Don't want global installation

**What You Get**:
- Sharp product definition (from vague idea)
- Competitive landscape analysis (5-10 competitors)
- Production-ready landing page (HTML/CSS/JS)
- Complete ad campaign plans (Google + Facebook)
- Data-driven GO/NO-GO decision
- Clear next steps (build it, refine it, or pivot)

**Investment**:
- Time: 2-4 weeks (mostly waiting for campaign data)
- Money: €100-€2,000 (ad spend, you choose)
- Setup: ~1 hour (following provided guides)

**What You Avoid**:
- €50,000+ in wasted development costs
- 6+ months building something nobody wants
- Uncertainty and guesswork

---

## Why Market Validation?

### The Problem

**Most Products Fail** because they solve problems nobody cares about enough to pay for.

**Traditional Approach** (risky):
```
1. Have product idea
2. Build it for 6 months
3. Launch
4. Hope people buy
5. [Often] Crickets... product fails
```

**Cost of Failure**:
- €50,000+ in development (salaries, tools, infrastructure)
- 6+ months of time (opportunity cost)
- Emotional toll (burnout, disappointment)
- Sunk cost fallacy (keep investing in failing product)

### The Solution

**Lean Startup Approach** (validated):
```
1. Have product idea
2. Validate with landing page + ads (2-4 weeks, €500)
3. Analyze data
4. IF demand validated → Build it
   ELSE → Pivot or abandon (saved €50k + 6 months)
```

**Success Rate**:
- Without validation: ~10% of products succeed
- With validation: ~40% of products succeed (4x improvement)

**Why?** You only build products with proven demand.

---

## How the System Works

### Architecture

The Market Validation System coordinates **7 specialist agents** sequentially to create a complete validation campaign:

```
User → /validate-market "Product idea"
  ↓
1. product-strategist → Sharpens idea through Q&A
  ↓
2. market-researcher → Finds competitors, gaps, positioning
  ↓
3. content-creator → Writes compelling copy
  ↓
4. seo-specialist → Optimizes for search
  ↓
5. web-developer → Builds production-ready landing page
  ↓
6. validation-specialist → Creates campaign + analytics plans
  ↓
7. [USER RUNS CAMPAIGN - 2-4 weeks]
  ↓
8. business-analyst → Analyzes metrics, GO/NO-GO decision
  ↓
If GO → /plan-product (with validation insights)
```

### Workflow Steps

**Phase 1: Preparation** (~15-20 minutes, automated)
1. Sharpen product idea (interactive Q&A)
2. Competitive analysis (Perplexity MCP)
3. Landing page creation (HTML/CSS/JS)
4. Ad campaign planning (Google + Facebook)
5. Analytics setup guide (GA4)

**Phase 2: Execution** (2-4 weeks, user-driven)
1. Deploy landing page (10 minutes)
2. Launch ad campaigns (30 minutes)
3. Monitor daily (5 minutes/day)
4. Collect data (automatic)

**Phase 3: Decision** (~5 minutes, automated)
1. Provide metrics to business-analyst
2. Receive GO/MAYBE/NO-GO decision
3. Get specific next steps

---

## Step-by-Step Walkthrough

### Before You Start

**What You Need**:
- Product idea (can be vague: "a tool for invoicing")
- Ad budget: €100-€2,000 (€500 recommended)
- Time commitment: 2-4 weeks
- Perplexity MCP integration (for competitive research)

**What You Don't Need**:
- Technical skills (all code generated for you)
- Marketing experience (step-by-step guides provided)
- Existing product (just an idea is enough)

### Step 1: Run /validate-market

```bash
/validate-market
```

Or with your idea upfront:
```bash
/validate-market "Invoice automation for freelancers who hate accounting"
```

**What Happens**:
- Workflow starts
- Context loaded (mission, tech-stack if needed)
- You're prompted for product idea (if not provided)

**Example Product Ideas** (all valid):
- Vague: "A tool for managing invoices"
- Moderate: "Invoice automation for freelancers, simpler than QuickBooks"
- Detailed: "1-click invoice generation from time tracking for creative freelancers in Germany"

### Step 2: Product Idea Sharpening (product-strategist)

**What Happens**:
- product-strategist analyzes your idea
- Identifies gaps (target audience unclear? problem vague?)
- Asks 4-5 strategic questions via interactive prompts

**Example Questions**:
```
Q1: Who specifically is this product for?
Options:
- Freelance designers/creatives
- Freelance developers/consultants
- Small businesses (2-10 employees)
- Solopreneurs (all industries)

Q2: What specific problem does this solve?
Options:
- Forget to invoice clients (lose money)
- Manual invoicing takes too long (waste time)
- Existing tools too complex (intimidated)
- Late payments from clients (cash flow issues)

Q3: How does your product solve this differently?
Options (select multiple):
- 1-click invoice from time tracking
- Automatic payment reminders
- No accounting knowledge needed
- Much cheaper than alternatives

Q4: Why choose this over FreshBooks/QuickBooks?
Options:
- Simpler (no accounting knowledge)
- Faster (60 seconds vs. 30 minutes)
- Cheaper (€5 vs. €15-60/month)
- Specialized for their niche
```

**Output**: `product-brief.md` with:
- Sharp target audience (Freelance designers, 28-42, Germany, non-tech)
- Specific problem (Waste 2h/week, lose €500/month)
- 3-5 key features (1-click generation, auto reminders, templates)
- Clear value proposition ("60-second invoicing for non-accountants")

**Review**: You'll see the product brief and can refine if needed.

### Step 3: Competitive Analysis (market-researcher)

**What Happens**:
- market-researcher uses **Perplexity MCP** to find 10-15 competitors
- Researches each competitor (pricing, features, reviews)
- Creates feature comparison matrix
- Identifies 3-5 market gaps (opportunities)
- Develops positioning strategy

**Technologies Used**:
- `mcp__perplexity__deep_research` - Find competitors, market trends
- WebSearch - Detailed competitor information
- WebFetch - Access competitor websites

**Example Output** (competitor-analysis.md):
```
Competitors Found: 8
- FreshBooks (€15/mo, 30M users, full accounting) - Too complex
- QuickBooks (€25/mo, enterprise-grade) - Too expensive
- Wave (Free, basic features) - Limited functionality
- Zoho Invoice (€10/mo, business suite) - Feature bloat
- Invoice Ninja (€10/mo, open-source) - Technical users
- Bonsai (€24/mo, all-in-one) - Expensive
- HoneyBook (€39/mo, creatives) - US-focused, expensive
- AND.CO (Discontinued) - Market gap!

Market Gaps:
1. Simplicity - No tool for non-accountants (40% of reviews mention "too complex")
2. Speed - All take 10-30 min, none offer 60-second invoicing
3. Price - €5 vs. €15-60 market range (3-5x cheaper)

Positioning: "Budget Simplicity Leader - easiest invoicing for creatives who hate accounting"
```

**Duration**: ~10 minutes (with Perplexity)

### Step 4: Copywriting (content-creator)

**What Happens**:
- content-creator writes landing page copy based on positioning
- Applies AIDA formula (Attention → Interest → Desire → Action)
- Creates 7 Google ad variants (different angles)
- Creates 5 Facebook ad variants
- All copy optimized for conversions

**Example Landing Page Copy**:
```
Headline: "From Timesheet to Invoice in 60 Seconds"
Subheadline: "Automated invoicing for freelancers who hate accounting"
CTA: "Start Free Trial"
Trust: "'Saved me 2 hours every week!' - Maria K., Designer"

Features:
⚡ One-Click Generation - Turn timesheet into invoice instantly
🔔 Automatic Reminders - Never chase clients for payment again
📱 Works Everywhere - Desktop, mobile, tablet

FAQ: 5 questions addressing objections
```

**Example Ad Copy** (Google):
```
Headline 1: "Invoice in 60 Seconds"
Headline 2: "For Freelance Creatives"
Headline 3: "€5/Month, No Setup"

Description: "Stop wasting hours on manual invoicing. Auto-generate from time tracking."
```

**Duration**: ~5 minutes

### Step 5: SEO Optimization (seo-specialist)

**What Happens**:
- seo-specialist conducts keyword research
- Optimizes title tag and meta description
- Creates Open Graph tags (social sharing)
- Integrates keywords naturally into copy
- Provides technical SEO checklist

**Example SEO Output**:
```html
<title>Invoice Automation for Freelancers - 60 Second Invoicing | InvoiceSnap</title>
<meta name="description" content="Automated invoicing for freelancers. Create professional invoices in 60 seconds from time tracking. €5/month, no setup. Try free.">

Keywords Targeted:
- Primary: "invoice automation" (1,000/month)
- Secondary: "invoicing software" (2,000/month)
- Long-tail: "invoice automation for freelancers" (200/month, easier to rank)
```

**Duration**: ~3 minutes

### Step 6: Landing Page Generation (web-developer)

**What Happens**:
- web-developer creates production-ready HTML/CSS/JS
- Integrates copy and SEO optimizations
- Ensures responsive design (mobile, tablet, desktop)
- Optimizes performance (<3 sec load, <30KB total)
- Creates self-contained index.html (no external dependencies)
- Provides deployment instructions

**Example Output** (landing-page/index.html):
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice Automation for Freelancers | InvoiceSnap</title>
  <meta name="description" content="...">
  <!-- All CSS inline -->
  <style>/* Responsive, mobile-first CSS */</style>
</head>
<body>
  <section class="hero">
    <h1>Automated Invoicing for Freelance Creatives</h1>
    <p>Create professional invoices in 60 seconds...</p>
    <form id="signup-form">
      <input type="email" required>
      <button>Start Free Trial</button>
    </form>
  </section>
  <!-- Features, social proof, FAQ sections -->
  <script>/* Form validation, analytics */</script>
</body>
</html>
```

**File Size**: ~12KB uncompressed (~4KB gzipped) ✅
**Load Time**: <2 seconds ✅
**Deployment**: Drag-and-drop to Netlify ✅

**Duration**: ~5 minutes

### Step 7: Campaign Coordination (validation-specialist)

**What Happens**:
- validation-specialist asks for budget (or recommends €500)
- Creates complete ad campaign plans
- Provides Google Analytics 4 setup guide
- Defines success criteria (GO/MAYBE/NO-GO thresholds)
- Creates comprehensive validation plan

**Outputs**:
1. **ad-campaigns.md**:
   - Google Search ads: 7 variants, targeting specs, setup instructions
   - Facebook Feed ads: 5 variants, audience targeting, setup instructions
   - UTM parameters for tracking

2. **analytics-setup.md**:
   - GA4 property creation (step-by-step)
   - Conversion tracking code
   - Meta Pixel setup (for Facebook)
   - Heatmap tool (Microsoft Clarity - free)

3. **validation-plan.md**:
   - 4-week timeline
   - Budget allocation (60% Google, 30% Facebook, 10% reserve)
   - Success criteria (Conversion ≥5%, CPA ≤€10, TAM ≥100k)
   - Risk mitigation strategies
   - Execution checklist (25+ items)

**Duration**: ~5 minutes

**You Now Have**: Complete validation package, ready to execute!

---

## Phase 2: Campaign Execution (User-Driven, 2-4 Weeks)

### Day 0: Setup (~1 hour total)

**A. Deploy Landing Page** (~10-15 minutes):

**Option 1 - Netlify** (recommended, easiest):
```bash
1. Sign up at netlify.com (free)
2. Drag landing-page/index.html to dashboard
3. Done! Live in 30 seconds
4. Copy URL (e.g., your-product.netlify.app)
```

**Option 2 - Vercel**:
```bash
1. Sign up at vercel.com
2. Install CLI: npm install -g vercel
3. cd landing-page && vercel --prod
4. Copy URL
```

**Option 3 - GitHub Pages**:
```bash
1. Create repo: product-name-landing
2. Push index.html
3. Settings → Pages → Enable
4. URL: username.github.io/product-name-landing
```

**B. Install Analytics** (~30 minutes):

Follow **analytics-setup.md** step-by-step:

1. **Google Analytics 4** (15 min):
   - Create property at analytics.google.com
   - Add data stream (website)
   - Copy tracking code
   - Paste into landing page `<head>` (replace placeholder)
   - Redeploy landing page
   - Verify: GA4 Realtime → Should show your visit

2. **Meta Pixel** (10 min, if using Facebook Ads):
   - Create pixel at business.facebook.com/events_manager
   - Copy pixel code
   - Paste into landing page `<head>` (after GA4)
   - Redeploy
   - Verify: Meta Pixel Helper extension → Green checkmark

3. **Heatmap Tool** (5 min):
   - Sign up at clarity.microsoft.com (free)
   - Add project
   - Copy tracking code
   - Paste into landing page
   - Redeploy

4. **Test Everything**:
   - Submit test email in form
   - Check GA4 Realtime → Should show conversion
   - Check Meta Pixel (if installed) → Should show Lead event

**C. Create Ad Accounts** (~15 minutes):

1. **Google Ads**:
   - Go to ads.google.com
   - Sign up
   - Add payment method (credit card)
   - Verify account approved (can take 24 hours)

2. **Facebook Ads Manager**:
   - Go to business.facebook.com
   - Create Business Manager
   - Create Ad Account
   - Add payment method
   - Verify account approved

### Day 1: Launch Campaigns (~50 minutes)

**A. Google Search Campaign** (~30 minutes):

Follow **ad-campaigns.md** → Google Ads section:

1. Create Campaign:
   - Objective: "Leads" or "Website Traffic"
   - Type: "Search"
   - Budget: €7/day (for €200 over 28 days)
   - Location: [Your target country]

2. Create Ad Group:
   - Name: "Invoice Automation - Phrase Match"
   - Add keywords (copy from ad-campaigns.md)

3. Create Ads:
   - Use all 7 variants from ad-campaigns.md
   - Google will rotate and optimize
   - URL: your-landing-page.com?utm_source=google&utm_medium=cpc&utm_campaign=validation

4. Launch:
   - Review settings
   - Publish campaign
   - Wait for approval (~24 hours usually)

**B. Facebook Feed Campaign** (~20 minutes):

Follow **ad-campaigns.md** → Meta Ads section:

1. Create Campaign:
   - Objective: "Leads" or "Traffic"
   - Budget: €5/day (for €150 over 30 days)

2. Create Ad Set:
   - Location: [Your target country]
   - Age: [From product brief, e.g., 28-42]
   - Interests: [From targeting guide, e.g., "Freelancing, Design"]
   - Placements: Facebook Feed + Instagram Feed + Stories

3. Create Ads:
   - Use all 5 variants from ad-campaigns.md
   - Upload images (or use simple graphic)
   - URL: your-landing-page.com?utm_source=facebook&utm_medium=cpc&utm_campaign=validation

4. Launch:
   - Review
   - Publish
   - Verify ads are live (check ad preview)

**C. Verify Tracking** (~5 minutes):

1. Click your own ad (incognito mode)
2. Submit test email
3. Check GA4 → Should show conversion
4. Check ad platform → Should show conversion

**All Set!** Campaigns are running, data is collecting.

### Weeks 1-4: Monitoring & Optimization

**Daily Check** (~5-10 minutes):

```
Login to Google Analytics:
- Total visitors today: [#]
- Total conversions today: [#]
- Conversion rate: [%]
- Running totals: [Track progress]

Login to Ad Platforms:
- Total spend: €[X]
- CPA: €[Y] (spend ÷ conversions)
- Check: On pace for budget? CPA on target?
```

**Weekly Optimization** (~30 minutes):

**Week 1** - Analyze initial performance:
```
1. Compare Google vs. Facebook:
   - Which has lower CPA?
   - Which has higher conversion rate?

2. Identify best ads:
   - Check CTR (click-through rate)
   - Check conversion rate
   - Pause bottom 50% of ads

3. Reallocate budget:
   - Increase budget on winner (Google or Facebook)
   - Decrease or pause underperformer
```

**Week 2-3** - Optimize and refine:
```
1. Create new ad variants based on top performers
2. Narrow targeting (exclude low-converting segments)
3. Test new headlines (if conversion low)
4. Monitor for ad fatigue (CTR declining?)
```

**Week 4** - Final collection:
```
1. Let campaigns run to completion
2. Don't make major changes (need consistent data)
3. Collect qualitative feedback (reply to signups: "What made you sign up?")
```

**Metrics to Track**:
- Total visitors (from GA4)
- Total conversions (email signups)
- Conversion rate (%)
- Total ad spend (€)
- Cost per acquisition (€)
- Traffic by source (Google vs. Facebook vs. Direct)
- Best performing ad variants

### Week 4: Campaign End & Data Collection

**Pause Campaigns**:
```
Google Ads → Campaigns → Pause
Facebook Ads → Campaigns → Pause
```

**Compile Final Metrics**:
```
From Google Analytics (All traffic):
- Total Visitors: [#]
- Total Conversions: [#]
- Traffic by Source:
  - google / cpc: [#] visitors
  - facebook / cpc: [#] visitors
  - (direct): [#] visitors
  - (organic): [#] visitors

From Google Ads:
- Total Spend: €[X]
- Conversions: [#] (from this source)

From Facebook Ads:
- Total Spend: €[Y]
- Conversions: [#] (from this source)

Total Ad Spend: €[X + Y]
Overall Conversion Rate: [#] conversions ÷ [#] visitors × 100% = [%]
Average CPA: €[Total Spend] ÷ [Total Conversions] = €[Z]
```

**Gather Qualitative Feedback**:
- Review any email responses
- Check ad comments
- Note common themes

---

## Phase 3: Analysis & Decision

### Step 8: Provide Metrics

Tell Claude Code you have metrics:
```
"I have validation metrics"
```

Or:
```
"Analyze validation results"
```

**Provide Your Data**:
```
Total Visitors: 1,000
Total Conversions: 62 email signups
Total Ad Spend: €500
Google: 600 visitors
Facebook: 300 visitors
Direct: 100 visitors
Duration: 3 weeks

Optional:
- User feedback: "30 email responses, mostly positive about simplicity"
```

### Step 9: Receive GO/NO-GO Decision (business-analyst)

**What Happens**:
- business-analyst calculates conversion rate
- business-analyst calculates CPA
- business-analyst loads TAM from competitor-analysis
- business-analyst evaluates against success criteria
- business-analyst generates validation-results.md with decision

**Decision Matrix**:
| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| Conversion | ≥5% | 6.2% | ✅ +24% |
| CPA | ≤€10 | €8.06 | ✅ -19% |
| TAM | ≥100k | 300k | ✅ 3x |

**Criteria Met**: 3/3 ✅

**Decision Examples**:

**GO** ✅:
```
DECISION: GO (High confidence: 95%)

Rationale:
- All 3 criteria exceeded
- Conversion 24% above target
- CPA 19% below target
- Large market (300k)
- Positive sentiment

Next Steps:
1. Run /plan-product
2. Build MVP with core features
3. Target designers 30-40 (best segment)
4. Use "60 seconds" messaging (won in ads)
```

**MAYBE** ⚠️:
```
DECISION: MAYBE (Medium confidence: 75%)

Rationale:
- Conversion 3.5% (below 5% target)
- CPA €9 (on target)
- TAM 200k (exceeds target)
- 2/3 criteria met but conversion critical

Improvement Plan:
- Test 3 new headlines (pain-focused)
- Simplify form (email only)
- Re-test for 2 weeks, €300
```

**NO-GO** ❌:
```
DECISION: NO-GO (High confidence: 90%)

Rationale:
- Conversion 1.2% (far below 5%)
- CPA €25 (2.5x target)
- TAM 80k (below 100k)
- 0/3 criteria met

Value of Validation:
- Saved: €50,000 + 6 months
- Investment: €500
- Net Savings: €49,500

Alternative: Pivot to "payment reminders only" (simpler problem)
```

### Step 10: Next Actions

**If GO Decision**:
```bash
/plan-product
```
- Validation results automatically loaded
- Product planning informed by:
  - Validated features (from feedback)
  - Target audience (from product brief)
  - Positioning (from competitive analysis)
  - Marketing approach (winning ad copy)

**If MAYBE Decision**:
- Implement improvements from business-analyst
- Re-run /validate-market with refined approach
- Smaller budget (€200-300) for re-test

**If NO-GO Decision**:
- Review alternative approaches
- Consider pivot (if viable)
- Or: Document learnings, move to new idea
- **Celebrate**: You just saved €50k+ and 6 months!

---

## Specialist Agents

### 1. product-strategist

**Role**: Sharpens vague product ideas into clear, focused briefs

**Process**:
- Analyzes initial idea for gaps
- Asks 4-5 strategic questions
- Synthesizes answers into product brief

**Output**: product-brief.md with target persona, problem statement, solution overview, value prop

**Key Skill**: product-strategy-patterns (Jobs-to-be-Done, Value Proposition Canvas, Persona Development)

### 2. market-researcher

**Role**: Competitive intelligence and market analysis

**Process**:
- Uses Perplexity MCP to find competitors
- Uses WebSearch for detailed research
- Creates feature comparison matrix
- Identifies market gaps
- Develops positioning strategy

**Output**: competitor-analysis.md, market-positioning.md

**Key Skill**: market-research-best-practices (Porter's Five Forces, SWOT, TAM/SAM/SOM)

**Tools**: `mcp__perplexity__deep_research`, WebSearch, WebFetch

### 3. content-creator

**Role**: Compelling copywriting for conversions

**Process**:
- Applies AIDA formula (Attention, Interest, Desire, Action)
- Writes landing page copy (headline, features, FAQ)
- Creates 7 Google ad variants
- Creates 5 Facebook ad variants
- Ensures character limits met

**Output**: Copy (provided to seo-specialist and web-developer)

**Key Skill**: content-writing-best-practices (AIDA, PAS, Headline Formulas, Ad Copy Structure)

### 4. seo-specialist

**Role**: SEO optimization for search visibility

**Process**:
- Keyword research (primary, secondary, long-tail)
- Title tag optimization (50-60 chars)
- Meta description optimization (150-160 chars)
- Open Graph tags (social sharing)
- Natural keyword integration (1-2% density)

**Output**: SEO specs (meta tags, keywords, heading structure)

**Key Skill**: seo-optimization-patterns (On-Page SEO, Meta Tags, Technical SEO)

### 5. web-developer

**Role**: Production-ready landing page generation

**Process**:
- Creates HTML5 structure (semantic)
- Implements responsive CSS (mobile-first)
- Adds JavaScript (form validation, analytics)
- Integrates copy and SEO
- Optimizes performance (<3 sec, <30KB)
- Creates self-contained file

**Output**: landing-page/index.html + deployment instructions

**Key Skills**: validation-strategies (Landing Page Best Practices, CRO), seo-optimization-patterns (Technical SEO)

### 6. validation-specialist

**Role**: Campaign and analytics coordination

**Process**:
- Structures ad campaigns (budget, targeting)
- Creates setup guides (Google, Facebook)
- Configures analytics tracking
- Defines success criteria
- Creates execution checklist

**Output**: ad-campaigns.md, analytics-setup.md, validation-plan.md

**Key Skills**: validation-strategies (Campaign Optimization, Analytics), business-analysis-methods (Success Criteria)

### 7. business-analyst

**Role**: Data analysis and GO/NO-GO decision

**Process**:
- Receives metrics from user
- Calculates conversion rate, CPA
- Loads TAM from research
- Evaluates against criteria
- Analyzes qualitative feedback
- Generates clear recommendation

**Output**: validation-results.md with GO/MAYBE/NO-GO decision

**Key Skills**: business-analysis-methods (Metrics, Decision Frameworks), market-research-best-practices (TAM)

---

## Example Validation Project

### Product Idea

"A tool for freelancers to create invoices faster"

### Step-by-Step Results

**1. Idea Sharpening** (product-strategist):
```
Questions Asked:
Q: Who specifically? → Freelance designers
Q: What problem? → Waste 2h/week + forget invoices
Q: How solve? → 1-click from timesheet + auto reminders
Q: Why better? → Simpler + faster + cheaper

Product Brief:
- Target: Freelance designers 28-42, Germany
- Problem: Manual invoicing wastes 2h/week, forget clients, lose €500/month
- Solution: 1-click invoice from timesheet + automatic reminders
- Value Prop: "60-second invoicing for non-accountants"
- Price: €5/month
- Features: Invoice generation, Auto reminders, Templates
```

**2. Competitive Analysis** (market-researcher):
```
Competitors Found: 8
- FreshBooks (€15/mo) - Complex, 30 min setup
- QuickBooks (€25/mo) - Enterprise-grade, expensive
- Wave (Free) - Basic features only
- Bonsai (€24/mo) - All-in-one, expensive
- [4 more...]

Gaps:
1. Simplicity - All tools too complex for non-accountants
2. Speed - All take 10-30 min, none offer 60-second invoicing
3. Price - Market range €15-60, we offer €5

Positioning:
"For freelance creatives who hate accounting,
InvoiceSnap is the simplest invoicing tool
that creates invoices in 60 seconds from time tracking.
Unlike QuickBooks (complex, €25/mo),
InvoiceSnap requires zero accounting knowledge and costs €5/month."

TAM: 300,000 tech-savvy freelance creatives in Germany
```

**3. Landing Page** (content-creator + seo-specialist + web-developer):
```
Headline: "From Timesheet to Invoice in 60 Seconds"
Subheadline: "Automated invoicing for freelancers who hate accounting"
CTA: "Start Free Trial"

SEO:
Title: "Invoice Automation for Freelancers - 60 Second Invoicing | InvoiceSnap"
Keywords: invoice automation, invoicing software, simple invoicing

File: index.html (12KB, responsive, <2 sec load)
Deployed: invoicesnap.netlify.app
```

**4. Ad Campaigns** (validation-specialist):
```
Budget: €500
- Google Search: €200
- Facebook Feed: €150
- Instagram: €100
- Reserve: €50

Ad Variants:
- Google: 7 (pain-focused, speed-focused, simplicity-focused, price-focused, etc.)
- Facebook: 5 (pain+solution, benefit+proof, question, comparison)

Success Criteria:
- Conversion ≥ 5%
- CPA ≤ €10
- TAM ≥ 100k
```

**5. Campaign Execution** (3 weeks):
```
Week 1:
- Launched campaigns
- Daily monitoring
- Initial performance: 4% conversion, €12 CPA

Week 2:
- Paused low performers (Display ads, Instagram Stories)
- Reallocated to Google Search (best CPA: €6)
- New conversion: 5.5%, €9 CPA

Week 3:
- Continued collection
- Collected user feedback (30 responses)
- Final stats: 6.2% conversion, €8.06 CPA
```

**6. Final Metrics**:
```
Duration: 3 weeks
Total Visitors: 1,000
- Google Search: 600
- Facebook Feed: 300
- Direct/Organic: 100

Total Conversions: 62 email signups
Conversion Rate: 6.2%

Total Ad Spend: €500
- Google: €300
- Facebook: €150
- Instagram: €50 (paused early)

Cost Per Acquisition: €500 ÷ 62 = €8.06
```

**7. Decision** (business-analyst):
```
DECISION: GO ✅ (High confidence: 95%)

Criteria Met: 3/3
- Conversion: 6.2% vs. 5% target (+24%)
- CPA: €8.06 vs. €10 target (-19%)
- TAM: 300k vs. 100k target (3x)

User Feedback: Positive (+0.47 sentiment)
- "So simple!" - 12 mentions
- "Fast!" - 9 mentions
- "Perfect price" - 7 mentions

Recommendations:
1. Proceed to /plan-product
2. Focus on designers 30-40 (best segment: 8% conversion)
3. MVP: Core invoicing only (don't feature-bloat)
4. v1.1: Add expense tracking (8 user requests)
5. Marketing: Use "60 seconds" messaging (best performing ad)
6. Primary channel: Google Search (€6 CPA vs. €10 Facebook)

Financial Outlook:
- Year 1: €144k revenue (2,400 customers @ €60/year)
- Costs: €54k (marketing, dev, ops)
- Profit: €90k (167% ROI)
```

**8. Next Step**:
```bash
/plan-product
# Automatically loads validation insights
# Informed product planning with validated demand
```

---

## Customization & Overrides

### Global + Project Architecture

The Market Validation System uses a **layered approach**:

**Global Components** (in `~/.specwright/` and `~/.claude/`):
- Used by default in all projects
- Updated once, benefits all projects
- Industry-standard best practices

**Project Overrides** (in `projekt/specwright/` and `projekt/.claude/`):
- Optional, only when needed
- Project-specific customizations
- Takes precedence over global

**Validation Results** (always project-specific):
- Stored in `projekt/specwright/market-validation/YYYY-MM-DD-product/`
- Belong to the project (git-committable)

### Lookup Order

**Workflow checks in this order**:
```
1. projekt/.claude/agents/market-researcher.md (local)
   → If exists: Use this ✅ (project-specific)
   → If not: Continue to step 2

2. ~/.claude/agents/market-researcher.md (global)
   → If exists: Use this ✅ (default)
   → If not: Error (global installation required)
```

**Same for**:
- Agents: `.claude/agents/`
- Commands: `.claude/commands/specwright/`
- Skills: `.claude/skills/` (symlinked)
- Templates: `specwright/templates/market-validation/`
- Workflows: `specwright/workflows/validation/`

### When to Override

#### Override Agent (Rare)

**Example 1: Industry-Specific Research**

Pharma product needs FDA compliance checks:

```bash
# Copy global to project
cp ~/.claude/agents/market-researcher.md .claude/agents/

# Edit .claude/agents/market-researcher.md
# Add after Step 6 in workflow:

**Step 7: FDA Compliance Research**
- Check FDA approval requirements
- Research clinical trial standards
- Analyze regulatory competitors
```

**Example 2: Internal Data Source**

Company has internal competitive database:

```bash
cp ~/.claude/agents/market-researcher.md .claude/agents/

# Edit to use internal API instead of Perplexity:
- Use company_api.get_competitors(product_category)
- Supplement with Perplexity for public data
```

#### Override Template (Occasional)

**Example: Industry-Specific Sections**

Healthcare product needs regulatory section:

```bash
mkdir -p specwright/templates/market-validation
cp ~/.specwright/templates/market-validation/product-brief.md \
   specwright/templates/market-validation/

# Edit specwright/templates/market-validation/product-brief.md
# Add section:

## Regulatory Requirements (Healthcare)
- FDA Classification: [Class I / II / III]
- Clearance Type: [510(k) / PMA / Exempt]
- Clinical Trials: [Required / Not Required]
```

#### Override Config (Common)

**Example: B2B Thresholds**

```yaml
# projekt/specwright/config.yml

market_validation:
  decision_criteria:
    conversion_rate_threshold: 2.0  # Lower for B2B (longer consideration)
    cpa_threshold: 50.0             # Higher for high-LTV products
    tam_threshold: 50000            # Smaller niche market OK

  budget_tiers:
    recommended: 1000  # B2B needs more budget
    confident: 2000

  timeline:
    recommended_weeks: 6  # B2B needs longer validation
```

**Inheritance**: Unspecified values inherit from global defaults.

### Override Best Practices

**DO Override When**:
- ✅ Industry regulations require it (pharma, fintech, healthcare)
- ✅ Company-specific data sources available (internal APIs, databases)
- ✅ Significantly different business model (B2B enterprise vs B2C consumer)
- ✅ Legal/compliance requirements (HIPAA, SOX, GDPR-specific)

**DON'T Override For**:
- ❌ Minor threshold tweaks (use config.yml instead)
- ❌ Small copy changes (those go in validation results, not agents)
- ❌ Personal preference (contribute improvements to global instead)
- ❌ "Just because" (global defaults work for 95% of cases)

### Contributing Improvements Back

**If your override would benefit everyone**:

1. Test your improved version locally
2. Contribute back to specwright repository
3. After merged, remove local override (use improved global version)

**Example**:
```bash
# You improved market-researcher to handle SaaS better

# 1. Tested in your project (local override)
# 2. Submit PR to specwright
# 3. After merge, remove local override:
rm .claude/agents/market-researcher.md

# 4. Update global installation:
curl -sSL .../setup-market-validation-global.sh | bash

# 5. All your projects now benefit from improvement!
```

### Verifying Which Version Is Used

**Check during workflow execution**:

The system outputs which components it's using:
```
Using market-researcher: ~/.claude/agents/market-researcher.md (global)
Using product-brief template: ~/.specwright/templates/market-validation/product-brief.md (global)
```

Or with override:
```
Using market-researcher: projekt/.claude/agents/market-researcher.md (PROJECT OVERRIDE)
Using product-brief template: ~/.specwright/templates/market-validation/product-brief.md (global)
```

---

## Troubleshooting

### Issue: Perplexity Rate Limit

**Symptoms**: market-researcher says "Rate limit reached"

**Solution**:
- Workflow continues with WebSearch fallback
- Partial competitor-analysis.md generated
- Template provided for manual completion
- Continue with available data

### Issue: Low Conversion Rate (<2%)

**Symptoms**: After Week 1, conversion is 1-2%

**Solutions**:
1. **Test New Headline**:
   - Current: "Invoice Automation for Freelancers"
   - Try: "Stop Losing €500/Month on Forgotten Invoices" (pain-focused)

2. **Simplify Form**:
   - If asking for Name + Email → Try email only
   - Every field costs ~10% conversion

3. **Add Trust Signals**:
   - Add testimonial above fold
   - Add "No spam" message near form
   - Add security badge

4. **Check Ad-Page Match**:
   - Does landing page deliver on ad promise?
   - If ad says "60 seconds" but page doesn't emphasize that → Fix

### Issue: High CPA (>€20)

**Symptoms**: Cost per acquisition too high

**Solutions**:
1. **Narrow Targeting**:
   - Age: Instead of 25-55, try 30-40
   - Location: Instead of "All Germany", try "Berlin, Munich, Hamburg"
   - Interests: More specific (e.g., "Graphic Design" instead of "Design")

2. **Pause Underperformers**:
   - Check which ads have CPA >€20
   - Pause bottom 50%
   - Reallocate budget to winners

3. **Add Negative Keywords** (Google):
   - Exclude: -free, -job, -template, -course
   - Reduces irrelevant clicks

4. **Lower Bids** (if manual bidding):
   - Reduce max CPC by 20-30%
   - Fewer clicks but better quality

### Issue: Insufficient Traffic (<200 visitors/week)

**Symptoms**: Not getting enough visitors for significance

**Solutions**:
1. **Increase Budget**:
   - Double daily budget temporarily
   - €10/day instead of €5/day

2. **Expand Targeting**:
   - Broaden age range (25-50 instead of 30-40)
   - Add more interests
   - Expand to more locations

3. **Extend Timeline**:
   - Run for 5-6 weeks instead of 3-4
   - Reach 1,000+ visitors minimum

### Issue: Landing Page Not Loading

**Symptoms**: High bounce rate (>80%), or page doesn't load

**Solutions**:
1. **Test Deployment**:
   - Visit URL yourself
   - Try different browsers
   - Try mobile device
   - Check for errors (F12 → Console)

2. **Verify Hosting**:
   - Netlify/Vercel: Check deployment status
   - Ensure index.html uploaded correctly

3. **Check File Size**:
   - Should be <30KB
   - If larger, may load slowly

### Issue: Conversions Not Tracking

**Symptoms**: Form submissions happen but GA4 shows 0 conversions

**Solutions**:
1. **Verify GA4 Setup**:
   - Check tracking code is installed (view page source)
   - Check Measurement ID is correct (not placeholder)
   - Use GA4 DebugView (Admin → DebugView)

2. **Check Conversion Event**:
   - Admin → Events → Find "sign_up"
   - Toggle "Mark as conversion" ✅

3. **Test Manually**:
   - Submit form yourself
   - Check GA4 Realtime → Conversions
   - Wait 24 hours (processing delay)

---

## Best Practices

### Budget Guidelines

**Starter** (€100-300):
- Good for: Very niche products, low expected CPA
- Limitations: May not reach significance (< 1,000 visitors)
- Recommendation: Only if very confident about niche

**Recommended** (€500-1,000):
- Good for: Most B2B/B2C SaaS products
- Adequate: 1,000-2,000 visitors, 50-100 conversions
- Recommendation: Default for most validations

**Confident** (€1,500-2,000):
- Good for: Competitive markets, higher CPA expected
- Robust: 2,000+ visitors, 100-200 conversions
- Recommendation: When you need high confidence

**Aggressive** (€3,000+):
- Good for: Enterprise products, complex sales
- Very robust: 3,000+ visitors, 150+ conversions
- Recommendation: Only if budget allows and market competitive

### Timeline Guidelines

**Minimum** (2 weeks):
- ✅ Faster feedback
- ❌ May not reach significance
- ❌ Seasonal variance not captured

**Recommended** (3-4 weeks):
- ✅ Better sample size (1,000+ visitors likely)
- ✅ Weekly variance captured
- ✅ Time for optimization
- Balanced approach

**Extended** (5-6 weeks):
- ✅ Very robust data (2,000+ visitors likely)
- ✅ Multiple optimization rounds
- ❌ Longer wait for decision
- Use if: Competitive market, need high confidence

**Rule**: Run until BOTH:
- Minimum 1,000 visitors reached
- Minimum 7 days elapsed (capture weekly variance)

### Targeting Best Practices

**Start Broad, Then Narrow**:
```
Week 1 (Broad):
- Age: 25-55
- Location: All Germany
- Interests: 5-10 broad interests

Week 2+ (Narrow to Winners):
- Age: 30-40 (if this converts best)
- Location: Berlin, Munich (if 80% of conversions from here)
- Interests: 2-3 specific (highest converters)
```

**Avoid Over-Narrowing**:
```
❌ Too narrow: "Female, 32-34, Berlin only, exactly these 3 interests"
   → Audience too small, can't reach 1,000 visitors

✅ Targeted: "Female, 28-42, Germany, 5 design-related interests"
   → Audience: 50,000-100,000 (reachable)
```

### Ad Copy Best Practices

**Test Different Angles**:
1. Pain-focused: "Stop losing €500/month"
2. Benefit-focused: "Invoice in 60 seconds"
3. Simplicity-focused: "No accounting knowledge needed"
4. Price-focused: "€5/month vs. €25 competitors"
5. Social proof: "Join 5,000+ freelancers"
6. Question: "Tired of chasing clients for payment?"
7. Urgency: "Limited: 50 beta spots remaining"

**Use Winning Formula**:
- After Week 1, identify top performer
- Create variations of winner
- Pause losers

### Landing Page Optimization

**If Conversion <3%**:
- ❌ Don't immediately give up
- ✅ Try these fixes first:

1. **Headline Test**:
   - Change to more specific benefit
   - "From Timesheet to Invoice in 60 Seconds" (specific)
   - vs. "Better Invoicing Software" (vague)

2. **Form Simplification**:
   - Remove all fields except email
   - Every field costs ~10% conversion

3. **Add Social Proof**:
   - "Join 100+ early users" (even small number helps)
   - Or: "'Finally, an invoicing tool I understand!' - Maria"

4. **Improve CTA**:
   - "Start Free Trial" (specific)
   - vs. "Submit" (generic)

---

## FAQ

### Q: How much should I budget?

**A**: €500 is the sweet spot for most products.

**Breakdown**:
- €500 budget ÷ €10 target CPA = 50 conversions expected
- At 5% conversion rate: Need 1,000 visitors
- €500 ÷ 1,000 visitors = €0.50 per visitor (achievable)

**Less than €500**: Risk not reaching statistical significance
**More than €2,000**: Diminishing returns for validation (save it for launch)

### Q: How long should I run campaigns?

**A**: 3-4 weeks recommended.

**Why**:
- Week 1: Initial data, identify losers
- Week 2: Optimization round 1
- Week 3: Optimization round 2, good sample size
- Week 4: Final collection, robust data

**Minimum**: 2 weeks + 1,000 visitors (whichever takes longer)

### Q: What's a good conversion rate?

**A**: Depends on product and audience, but general benchmarks:

- **Excellent**: >10% (very strong product-market fit)
- **Good**: 5-10% (solid validation, GO decision likely)
- **Fair**: 3-5% (borderline, MAYBE decision)
- **Poor**: <3% (weak validation, NO-GO or refine & re-test)

**Context matters**:
- High-price products (€100+/mo): 2-3% can be good
- Low-price products (€5/mo): Should hit 5-10%
- B2B complex sales: 3-5% is reasonable
- B2C simple products: Aim for 5-10%

### Q: Can I validate multiple product ideas?

**A**: Yes! Run separate validations.

**Approach**:
```
Week 1-4: Validate Product Idea A
→ Result: MAYBE (3% conversion)

Week 5-8: Validate Product Idea B
→ Result: GO (7% conversion)

Decision: Build Product B, shelve Product A
```

**Cost**: €500 per validation
**Value**: Know which idea has stronger demand

**Or: A/B Test Ideas**:
- Create 2 landing pages
- Split budget 50/50
- See which converts better

### Q: What if I don't have Perplexity MCP?

**A**: Workflow falls back to WebSearch.

**Without Perplexity**:
- market-researcher uses WebSearch for competitor discovery
- Slightly longer research time (~30 min vs. 10 min)
- May need to provide some competitor names manually
- Template provided for filling gaps

**Recommendation**: Install Perplexity MCP for best results.

### Q: Can I use this for B2B products?

**A**: Yes! Adjust thresholds.

**B2B Adjustments**:
- Lower conversion target (2-3% is good for B2B)
- Higher CPA acceptable (€30-50 if LTV is €500+)
- Longer timeline (4-6 weeks, B2B has longer consideration)
- Different channels (LinkedIn > Facebook for B2B)

**Success Example**:
```
B2B Product: "Project management for agencies"
Target: Marketing agencies, 10-50 employees
Budget: €1,000
Duration: 5 weeks
Conversion: 2.8% (42 leads from 1,500 visitors)
CPA: €24 (acceptable for B2B LTV: €2,400)
Decision: GO (B2B criteria adjusted)
```

### Q: What if all my metrics are borderline?

**A**: MAYBE decision with specific improvement plan.

**Example**:
```
Conversion: 4% (target: 5%, -20%)
CPA: €12 (target: €10, +20%)
TAM: 90k (target: 100k, -10%)

Decision: MAYBE (all close but not quite)

Improvements:
1. Test 3 new headlines (boost conversion)
2. Narrow targeting (reduce CPA)
3. Re-validate TAM with additional sources

Re-Test:
- Budget: €300
- Duration: 2 weeks
- If conversion hits 5% and CPA hits €10 → GO
- If still borderline after 2 attempts → NO-GO
```

### Q: Should I use my real brand name?

**A**: Depends on your goal.

**Use Real Brand** (if you're committed):
- ✅ Build brand awareness early
- ✅ Email list is valuable long-term
- ❌ Associates your name with potential failure

**Use Generic Name** (if exploring):
- ✅ No brand reputation risk
- ✅ Can rebrand later if GO
- ❌ Lose early brand building

**Recommendation**: If >70% confident → Use real brand

### Q: Can I run campaigns myself without the system?

**A**: Yes, but you lose key benefits.

**DIY Approach**:
- Create landing page yourself (8+ hours)
- Research competitors manually (4+ hours)
- Set up campaigns (2+ hours)
- Analyze results yourself (2+ hours)
- **Total**: 16+ hours + €500 budget

**With /validate-market**:
- System creates everything (15-20 minutes automated)
- Professional quality (best practices built-in)
- Clear decision framework (not guesswork)
- **Total**: 1 hour setup + €500 budget

**Value**: Save 15+ hours + get better quality + data-driven decision

### Q: What if I want to validate in multiple countries?

**A**: Run separate campaigns or split budget.

**Approach 1** (Sequential):
```
Validation 1: Germany (€500, 4 weeks)
→ Result: 6% conversion, GO

Validation 2: Austria (€300, 3 weeks)
→ Result: 5.5% conversion, GO

Validation 3: Switzerland (€300, 3 weeks)
→ Result: 3% conversion, MAYBE

Decision: Launch in Germany + Austria, skip Switzerland initially
```

**Approach 2** (Parallel):
```
Budget: €900 total
- Germany: €500 (largest market)
- Austria: €250
- Switzerland: €150

Run simultaneously for 4 weeks
Compare conversion rates
Launch in all with >5% OR top 2 markets only
```

### Q: Can I validate a physical product?

**A**: Yes, with modifications.

**Adjustments**:
- Landing page: Show product mockup/render
- CTA: "Join waitlist" or "Pre-order"
- Success criteria: Pre-order rate instead of email signups
- Higher CPA acceptable (physical products have higher margins)

**Example**:
```
Product: Smart water bottle
Landing Page: Product renders + value prop ("Hydration tracking")
CTA: "Pre-order at 30% off (€49 instead of €70)"
Target: 2% pre-order rate (higher friction than email)
Result: 3% pre-order rate (€15 CPA) → GO
```

---

## Configuration & Customization

### Adjusting Success Criteria

**Edit** `specwright/config.yml`:

```yaml
market_validation:
  decision_criteria:
    conversion_rate_threshold: 5.0   # Change to 3.0 for B2B, 8.0 for B2C low-price
    cpa_threshold: 10.0              # Change to 30.0 for high-LTV B2B
    tam_threshold: 100000            # Change to 50000 for niche, 500000 for mass-market
```

**When to Adjust**:
- **B2B Products**: Lower conversion (2-3%), higher CPA (€30-50)
- **High-Price Products** (€50+/mo): Lower conversion (2-3%)
- **Low-Price Products** (€3/mo): Higher conversion (8-10%)
- **Niche Markets**: Lower TAM (50k acceptable)
- **Mass Markets**: Higher TAM (500k+ for confidence)

### Customizing Budget Allocation

**Default** (60/30/10):
```yaml
budget_tiers:
  google_search: 60%  # High intent
  meta_ads: 30%       # Discovery
  reserve: 10%        # Boost winner
```

**B2B Focused** (adjust in validation-plan.md):
```
LinkedIn Ads: 50% (professional audience)
Google Search: 40% (high intent)
Reserve: 10%
```

**B2C Visual** (adjust in validation-plan.md):
```
Instagram: 50% (visual platform)
Facebook: 30% (broad reach)
Google Display: 20% (awareness)
```

---

## Advanced Usage

### Testing Multiple Positioning Strategies

**Scenario**: Unsure if to position as "fastest" or "simplest"

**Approach**: Create 2 landing pages
```
Landing Page A: "Fastest Invoicing" positioning
Landing Page B: "Simplest Invoicing" positioning

Budget Split: €250 each
Run simultaneously for 3 weeks
Winner: Page B (7% conversion vs. 4%)

Decision: Position as "Simplest"
```

### Pre-Launch vs. Post-MVP Validation

**Pre-Launch** (no product exists):
- CTA: "Join Waitlist" or "Get Early Access"
- Measures: Interest level only
- Lower friction → Higher conversion expected

**Post-MVP** (product exists):
- CTA: "Start Free Trial"
- Measures: Actual trial signups
- Higher friction → Lower conversion acceptable
- Better quality signal (actual usage intent)

### Combining with User Interviews

**Enhanced Validation**:
```
1. Run /validate-market (landing page + ads)
2. From 50+ signups, interview 10 users:
   - "What problem were you hoping to solve?"
   - "What made you sign up?"
   - "What features are most important?"
3. Feed insights back into product planning
4. Even stronger validation (quantitative + qualitative)
```

---

## File Reference

**All validation files** are created in:
```
specwright/market-validation/YYYY-MM-DD-product-name/
├── product-brief.md              # Sharp product definition
├── competitor-analysis.md        # 5-10 competitors analyzed
├── market-positioning.md         # Strategic positioning
├── landing-page/
│   └── index.html               # Production-ready landing page
├── ad-campaigns.md              # Google + Meta campaign plans
├── analytics-setup.md           # GA4 and tracking setup
├── validation-plan.md           # Timeline, budget, criteria
└── validation-results.md        # GO/NO-GO decision (after campaign)
```

**Templates** available at:
```
specwright/templates/market-validation/
├── product-brief.md
├── competitor-analysis.md
├── market-positioning.md
├── validation-plan.md
├── ad-campaigns.md
├── analytics-setup.md
└── validation-results.md
```

**Skills** auto-activated:
```
specwright/skills/product/product-strategy-patterns.md
specwright/skills/business/market-research-best-practices.md
specwright/skills/business/business-analysis-methods.md
specwright/skills/business/validation-strategies.md
specwright/skills/marketing/content-writing-best-practices.md
specwright/skills/marketing/seo-optimization-patterns.md
```

---

## Support & Resources

**Questions?**
- Review this guide
- Check validation-plan.md for your specific campaign
- Review spec: `specwright/specs/2025-12-27-product-launch-framework/spec.md`

**Issues?**
- See [Troubleshooting](#troubleshooting) section above
- Check generated files for detailed guidance
- Consult specialist agent documentation in `.claude/agents/`

**Contributing**:
- This is Phase A (Market Validation)
- Future phases will add team collaboration, Scrum events, and more
- See product roadmap in spec files

---

**Ready to validate your product idea?**

```bash
/validate-market "Your product idea here"
```

**Good luck! May your validation show strong demand!** 🚀
