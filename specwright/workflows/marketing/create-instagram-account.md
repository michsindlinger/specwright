---
description: Instagram Account Strategy Creation for Specwright
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
installation: global
---

# Instagram Account Strategy Rules

## What's New in v2.0

- **Main Agent Pattern**: Steps 1, 2 executed by Main Agent directly (was: context-fetcher/perplexity Sub-Agents)
- **Path fixes**: `specwright/` instead of `.specwright/`
- **Kept**: date-checker (Utility), file-creator (Utility)

## Overview

Generate a comprehensive Instagram marketing strategy for the product/project including account setup, content strategy, competitor analysis, and posting schedule.

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" name="product_analysis">

### Step 1: Product Analysis

Gather product information for Instagram strategy alignment.

<context_sources>
  READ (if available):
  - specwright/product/product-brief.md (or product-brief-lite.md)
  - specwright/product/tech-stack.md
  - specwright/product/roadmap.md
</context_sources>

<extraction_focus>
  - product_name, value_proposition
  - target_users, key_features
  - differentiators, industry
  - brand_voice (derive from product brief tone)
</extraction_focus>

IF insufficient information: ASK user for product details

</step>

<step number="2" name="competitor_research">

### Step 2: Competitor Research

Research successful Instagram accounts in the same industry/niche.

<research_method>
  USE Perplexity MCP (if available) OR WebSearch:
    - "Top Instagram accounts in [INDUSTRY] with high engagement rates 2026"
    - "[INDUSTRY] Instagram marketing case studies"
    - "Best performing Instagram content types for [INDUSTRY]"
</research_method>

FOR top 3-5 accounts, ANALYZE:
- follower_count, engagement_rate, posting_frequency
- content_types, content_themes, hashtag_strategy
- bio_structure, call_to_action

IDENTIFY success patterns:
- Common themes that perform well
- Optimal posting times
- Hashtag patterns
- Visual style patterns

</step>

<step number="3" name="account_naming">

### Step 3: Account Name Recommendations

Generate 3-5 Instagram username options.

Criteria: memorable, searchable, available, consistent with brand, under 20 characters

</step>

<step number="4" name="bio_optimization">

### Step 4: Bio Optimization

Create optimized bio (max 150 characters):
- Line 1: Value proposition
- Line 2: Key benefit
- Line 3: Social proof / differentiator
- Line 4: Call-to-action with emoji

</step>

<step number="5" name="content_pillars">

### Step 5: Define Content Pillars

Create 4-6 content pillars with recommended mix:
- Educational: 30-40%
- Promotional: 20%
- Engagement: 20%
- User-generated: 10-15%
- Entertainment: 10-15%

FOR each pillar: purpose, content types, frequency, examples

</step>

<step number="6" name="posting_schedule">

### Step 6: Define Posting Schedule

Create weekly schedule:
- Feed posts: 3-5/week
- Reels: 3-4/week
- Stories: 1-2/day
- Carousels: 2-3/week

With optimal posting times based on research.

</step>

<step number="7" name="hashtag_strategy">

### Step 7: Hashtag Strategy

Create 3-5 hashtag sets (20-30 each):
- Branded: 1-2 unique hashtags
- Industry: 5-10 (medium competition)
- Niche: 5-10 (lower competition)
- Trending: 2-3 (rotate)

</step>

<step number="8" name="engagement_tactics">

### Step 8: Engagement Tactics

Define community building, growth tactics, and content optimization strategies.

</step>

<step number="9" name="kpi_definition">

### Step 9: Define KPIs

Set milestone targets:
- Month 1: 500 followers, 3% engagement
- Month 3: 2,000 followers, first viral reel
- Month 6: 5,000+ followers, consistent 5%+ engagement

</step>

<step number="10" subagent="date-checker" name="date_determination">

### Step 10: Date Determination

USE: date-checker subagent

</step>

<step number="11" subagent="file-creator" name="create_strategy_files">

### Step 11: Create Strategy Files

USE: file-creator subagent

CREATE:
```
specwright/marketing/instagram/
├── strategy.md           # Main strategy document
├── content-pillars.md    # Detailed content pillars
├── hashtag-sets.md       # All hashtag sets
├── posting-schedule.md   # Weekly schedule template
└── kpis.md               # Goals and metrics tracking
```

</step>

<step number="12" name="user_review">

### Step 12: User Review

Present strategy for approval.
SUGGEST: "When ready, use `/create-content-plan` to generate your first 7-day content plan."

</step>

</process_flow>

## Execution Summary

**Duration:** 15-25 minutes
**User Interactions:** 2-3 review points
**Output:** 5 strategy files
