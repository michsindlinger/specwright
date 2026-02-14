# Validate Market

Conduct comprehensive market research and validation before product development

Refer to the instructions located in @specwright/workflows/validation/validate-market.md

**Version**: 5.0 (Phase A - Market Validation System)

**Features:**
- Product idea sharpening with interactive Q&A
- Competitive analysis using Perplexity MCP
- Strategic market positioning with brand story
- Production-ready landing page generation (HTML/CSS/JS)
- Quality assurance with visual validation
- Ad campaign planning (Google Ads, Meta Ads)
- Analytics setup guidance (Google Analytics 4, conversion tracking)
- Data-driven GO/NO-GO decision based on validation metrics

**Deliverables** (per validation campaign):

*Core Outputs (always created):*
- product-brief.md - Sharp product definition with target persona
- competitor-analysis.md - 5-10 competitors with feature comparison
- market-position.md - Strategic positioning and messaging pillars
- story.md - Brand narrative using StoryBrand framework
- stil-tone.md - Communication style and voice guidelines

*Optional Outputs - Phase 3 (if landing page requested):*
- design-system.md - Visual design tokens from reference
- landing-page-module-structure.md - Page structure and modules
- seo-keywords.md - Keyword research and SEO specifications
- landingpage-contents.md - All copy and content for landing page
- landing-page/index.html - Production-ready, deployable landing page

*Optional Outputs - Phase 4 (if user opts in after QA):*
- ad-campaigns.md - Complete Google + Meta ad campaign plans
- analytics-setup.md - GA4 and conversion tracking setup guide
- validation-plan.md - Timeline, budget, success criteria
- validation-results.md - Metrics analysis with GO/NO-GO decision (after campaign)

**Workflow Phases:**
1. **Product Definition** (Steps 1-4): Idea capture → Product brief → User review
2. **Market Research** (Steps 5-7): Competitor analysis → Market positioning → User review
3. **Landing Page Creation** (Steps 8-13, optional): Design → Structure → SEO → Content → Build → QA
4. **Campaign & Decision** (Steps 14-17, optional - user is asked): Campaign plan → User executes → GO/NO-GO

**Timeline:**
- Core validation: 10-15 minutes (Steps 1-7)
- Full setup: 30-40 minutes (Steps 1-14)
- Campaign Execution: 2-4 weeks (user runs campaigns)
- GO/NO-GO Analysis: 5-10 minutes (Step 16)

**Estimated Cost:**
- Ad Spend: €100-€2,000 (user chooses, €500 recommended)
- Tools: €0 (all free tiers: GA4, Netlify, Clarity)
- **Total**: €100-€2,000

**Success Criteria** (default thresholds, configurable):
- **GO**: Conversion ≥5%, CPA ≤€10, TAM ≥100k
- **MAYBE**: Conversion 3-5%, CPA €10-€15, TAM 50-100k
- **NO-GO**: Conversion <3%, CPA >€15, TAM <50k

**Usage:**
```bash
# Basic usage (interactive Q&A)
/validate-market

# With product idea upfront
/validate-market "Automated invoice generation for freelance designers who hate accounting"

# After campaign completion
"I have validation metrics" (workflow resumes for GO/NO-GO analysis)
```

**Example Flow:**
1. You describe product idea (can be vague)
2. Main Agent asks clarifying questions, creates product brief
3. User reviews and approves product brief
4. Main Agent finds 5-10 competitors, identifies market gaps
5. Main Agent creates positioning, brand story, and tone guide
6. User reviews and approves positioning (can stop here or continue to Phase 3)
7. Design system extracted from reference URL/screenshot → design-system.md
8. Main Agent defines page modules → landing-page-module-structure.md
9. Main Agent conducts keyword research → seo-keywords.md
10. Main Agent writes all content → landingpage-contents.md
11. Main Agent generates HTML → index.html
12. Main Agent validates quality before deployment
13. **User is asked: Continue to Phase 4?** (can stop here or continue)
14. Main Agent creates ad campaigns and analytics setup
15. You deploy landing page and run campaigns (2-4 weeks)
16. Main Agent analyzes results and provides GO/NO-GO decision
17. If GO → Proceed to /plan-product with validated demand

**Workflow Flow:**
```
Main Agent: Product Brief → Competitive Analysis → Market Positioning →
  [OPTIONAL: PHASE 3 - LANDING PAGE]
  → Page Structure → SEO Keywords → Content → Final Build → QA →
  [USER DECISION: Continue to Phase 4?]
  [OPTIONAL: PHASE 4 - CAMPAIGN & DECISION]
  → Campaign Plan → [USER CAMPAIGN 2-4 weeks] → GO/NO-GO Analysis
```

**Integration:**
- Validation results automatically loaded into /plan-product workflow
- Competitive insights inform product feature prioritization
- Validated positioning guides product messaging
- User feedback shapes product roadmap

**Learn More**: @specwright/workflows/validation/README.md (complete guide)
