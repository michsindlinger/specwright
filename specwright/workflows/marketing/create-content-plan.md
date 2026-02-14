---
description: Instagram Content Plan Creation for Specwright
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
installation: global
---

# Instagram Content Plan Rules

## What's New in v2.0

- **Main Agent Pattern**: Steps 1, 3 executed by Main Agent directly (was: context-fetcher/perplexity Sub-Agents)
- **Path fixes**: `specwright/` instead of `.specwright/`
- **Kept**: date-checker (Utility), file-creator (Utility)

## Overview

Generate a detailed 7-day Instagram content plan with specific posts, captions, hashtags, and optimal posting times based on the existing Instagram strategy.

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<prerequisites>
  REQUIRE: specwright/marketing/instagram/strategy.md
  IF NOT EXISTS:
    PROMPT: "No Instagram strategy found. Please run `/create-instagram-account` first."
    STOP
</prerequisites>

<process_flow>

<step number="1" name="load_strategy">

### Step 1: Load Instagram Strategy

READ:
- specwright/marketing/instagram/strategy.md
- specwright/marketing/instagram/content-pillars.md
- specwright/marketing/instagram/hashtag-sets.md
- specwright/marketing/instagram/posting-schedule.md
- specwright/product/product-brief-lite.md (if exists)

EXTRACT: content_pillars, posting_schedule, hashtag_sets, brand_voice, target_audience

</step>

<step number="2" subagent="date-checker" name="determine_week">

### Step 2: Determine Content Week

USE: date-checker subagent

Calculate: start_date (next Monday) to end_date (Sunday)

</step>

<step number="3" name="trend_research">

### Step 3: Trend Research

USE Perplexity MCP (if available) OR WebSearch:
- "Instagram trending audio and sounds this week [INDUSTRY]"
- "Trending topics [INDUSTRY] [CURRENT_MONTH] 2026"
- "Upcoming events holidays next 7 days"

STORE: trending_audio, trending_topics, upcoming_events

</step>

<step number="4" name="content_ideation">

### Step 4: Content Ideation

Generate 7-10 content ideas:
- All pillars represented
- Follow content mix percentages
- At least 2 Reels (highest reach)
- At least 1 carousel (highest saves)
- 80/20 value vs promotional balance

</step>

<step number="5" name="create_daily_content">

### Step 5: Create Daily Content Details

FOR each day (Monday-Sunday):

**Feed Post:**
- Type (Reel/Carousel/Post)
- Pillar and posting time
- Content details (script for Reels, slides for carousels, concept for posts)
- Full caption with hook, body, CTA
- Hashtag set assignment
- Visual notes

**Stories:**
- Morning: engagement (poll, question)
- Midday: tease feed post
- Afternoon: promote new post
- Evening: recap, UGC repost

</step>

<step number="6" subagent="file-creator" name="create_content_plan_files">

### Step 6: Create Content Plan Files

USE: file-creator subagent

CREATE:
```
specwright/marketing/instagram/content-plans/
└── [YYYY-MM-DD]-to-[YYYY-MM-DD]/
    ├── overview.md
    ├── monday.md
    ├── tuesday.md
    ├── wednesday.md
    ├── thursday.md
    ├── friday.md
    ├── saturday.md
    └── sunday.md
```

</step>

<step number="7" name="user_review">

### Step 7: User Review

Present content plan for approval.
SUGGEST: "Run `/create-content-plan` again for the next week."

</step>

</process_flow>

## Execution Summary

**Duration:** 15-20 minutes
**User Interactions:** 1 review point
**Output:** 8 content plan files
