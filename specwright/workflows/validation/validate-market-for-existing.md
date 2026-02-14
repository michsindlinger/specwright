---
description: Retroactive Market Validation for existing products
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
installation: global
---

# Validate Market for Existing Products

Perform market validation for products that were built without prior validation. Creates competitor analysis and market positioning based on existing product definition.

## What's New in v2.0

- **Main Agent Pattern**: All steps executed by Main Agent directly (no Sub-Agent delegation)
- **Removed Sub-Agents**: `market-researcher` (Steps 3, 4), `product-strategist` (Step 2)
- **Kept**: `context-fetcher` (Utility Agent for document loading)

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="context-fetcher" name="check_product_brief">

### Step 1: Check for Existing Product Brief

Verify if product-brief.md exists.

<conditional_logic>
  IF .specwright/product/product-brief.md exists:
    LOAD: product-brief.md
    INFORM user: "Found existing product-brief.md. Will use this for market validation."
    PROCEED to step 3
  ELSE:
    INFORM user: "No product-brief.md found. Need to create one first."
    PROCEED to step 2
</conditional_logic>

</step>

<step number="2" name="create_product_brief">

### Step 2: Create Product Brief (If Missing)

If no product-brief exists, create one based on existing product.

**Process:**
1. If .specwright/product/ exists with other files:
   - Analyze tech-stack.md, roadmap.md for context
   - Ask user about product purpose and target users
2. If no Specwright installed:
   - Recommend running /plan-product first
   - OR ask user to describe the product

**Prompt User:**
```
To perform market validation, I need to understand your product:

1. What does your product do? (elevator pitch)
2. Who is it for? (target audience)
3. What problem does it solve?
4. What are the main features? (3-5)
5. What makes it different from alternatives?
```

Refine user input and generate product-brief.md.

**Template:** `@specwright/templates/documents/product-brief.md`
**Output:** `.specwright/product/product-brief.md`

</step>

<step number="3" name="competitive_analysis">

### Step 3: Competitive Analysis

Conduct comprehensive competitive research.

**Process:**
1. Load product-brief.md as context
2. Use Perplexity MCP (or WebSearch as fallback) for competitor identification
3. Research 5-10 competitors:
   - Pricing tiers
   - Key features
   - Target audience
   - User reviews
   - Strengths/weaknesses
4. Create feature comparison matrix
5. Identify market gaps
6. Generate competitor-analysis.md

**Template:** `@specwright/templates/documents/competitor-analysis.md`
**Output:** `.specwright/product/competitor-analysis.md`

<quality_check>
  Competitive analysis must include:
  - 5-10 competitors
  - Feature comparison matrix
  - Pricing analysis
  - 3+ market gaps with evidence
  - Research sources cited

  IF incomplete:
    REDO competitive analysis with missing elements
  ELSE:
    PROCEED to step 4
</quality_check>

<error_handling>
  IF Perplexity MCP rate limit:
    - Use WebSearch as fallback
    - Note limitation in output
    - PROCEED (don't block)
</error_handling>

</step>

<step number="4" name="market_positioning">

### Step 4: Market Positioning

Develop positioning strategy based on competitive analysis.

**Process:**
1. Load competitor-analysis.md as context
2. Identify positioning opportunities
3. Create positioning statement
4. Develop messaging framework
5. Create battle cards vs. key competitors
6. Generate market-position.md

**Template:** `@specwright/templates/documents/market-position.md`
**Output:** `.specwright/product/market-position.md`

</step>

<step number="5" name="user_review">

### Step 5: User Review

Present findings for review.

**Prompt User:**
```
Market Validation Complete!

I've analyzed the competitive landscape and created positioning recommendations.

Please review:
- .specwright/product/competitor-analysis.md
- .specwright/product/market-position.md

Key Findings:
- [N] competitors identified
- Market gaps: [SUMMARY]
- Positioning opportunity: [SUMMARY]

Options:
1. Accept findings
2. Request deeper analysis on specific aspects
3. Provide additional competitors to include
```

<conditional_logic>
  IF user accepts:
    PROCEED to step 6
  ELIF user requests deeper analysis:
    PERFORM additional research
    UPDATE documents
    RETURN to step 5
  ELSE:
    ADD specified competitors
    RETURN to step 3
</conditional_logic>

</step>

<step number="6" name="summary">

### Step 6: Validation Summary

Present summary and recommendations.

**Summary:**
```
Retroactive Market Validation Complete!

Created Documentation:
✅ competitor-analysis.md - [N] competitors analyzed
✅ market-position.md - Positioning strategy

[IF product-brief was created:]
✅ product-brief.md - Product definition

Key Insights:
1. [INSIGHT_1]
2. [INSIGHT_2]
3. [INSIGHT_3]

Recommendations:
- [RECOMMENDATION_1]
- [RECOMMENDATION_2]

Location: .specwright/product/

Next Steps:
1. Review positioning recommendations
2. Consider A/B testing positioning messages
3. Update marketing materials based on findings
4. Optional: Run full /validate-market for landing page and ad campaigns
```

</step>

</process_flow>

## Output Files

| File | Description | Created When |
|------|-------------|--------------|
| product-brief.md | Product definition | Only if missing |
| competitor-analysis.md | Competitive research | Always |
| market-position.md | Positioning strategy | Always |

## Use Cases

1. **Product launched without validation** - Understand competitive landscape post-launch
2. **Pivoting product** - Validate new direction against market
3. **Marketing refresh** - Update positioning based on current market
4. **Investment preparation** - Document market opportunity

## Execution Summary

**Duration:** 15-20 minutes
**User Interactions:** 1-2 decision points
**Output:** 2-3 files depending on existing documentation
