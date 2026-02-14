# Landing Page Module Structure: [PRODUCT_NAME]

> Version: 1.0
> Created: [DATE]
> Based on: product-brief.md, market-position.md, story.md

---

## Overview

This document defines the modular structure of the landing page for [PRODUCT_NAME]. Each module is designed to be self-contained and can be reordered based on A/B testing results.

---

## Page Structure Summary

| Order | Module | Purpose | Priority |
|-------|--------|---------|----------|
| 1 | Hero | Capture attention, communicate value prop | REQUIRED |
| 2 | Social Proof Bar | Build immediate trust | RECOMMENDED |
| 3 | Problem/Pain | Establish relevance | REQUIRED |
| 4 | Solution Overview | Show how we solve it | REQUIRED |
| 5 | Features | Detail key capabilities | REQUIRED |
| 6 | How It Works | Reduce friction | RECOMMENDED |
| 7 | Testimonials | Build trust through stories | RECOMMENDED |
| 8 | Pricing | Enable decision | OPTIONAL |
| 9 | FAQ | Handle objections | RECOMMENDED |
| 10 | Final CTA | Convert | REQUIRED |
| 11 | Footer | Legal, navigation | REQUIRED |

---

## Module 1: Hero Section

### Purpose
Capture attention in 3 seconds, communicate core value proposition, drive primary conversion action.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [HEADLINE - H1]                          │
│                    6-12 words, benefit-driven               │
│                                                             │
│                    [SUBHEADLINE]                            │
│                    15-25 words, target audience + how       │
│                                                             │
│              ┌─────────────────────────────────┐            │
│              │  [EMAIL INPUT]  [CTA BUTTON]   │            │
│              └─────────────────────────────────┘            │
│                                                             │
│                    [TRUST SIGNAL]                           │
│                    Social proof micro-copy                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Content Requirements

| Element | Content | Source |
|---------|---------|--------|
| **Headline** | [FROM_CONTENT_CREATOR] | landingpage-contents.md |
| **Subheadline** | [FROM_CONTENT_CREATOR] | landingpage-contents.md |
| **CTA Text** | [FROM_CONTENT_CREATOR] | landingpage-contents.md |
| **Trust Signal** | [TESTIMONIAL_SNIPPET / USER_COUNT] | landingpage-contents.md |

### Design Specs

| Property | Value | Notes |
|----------|-------|-------|
| **Background** | [SOLID / GRADIENT / IMAGE] | From design-system.md |
| **Headline Size** | [Xpx / Xrem] | Mobile: [X], Desktop: [X] |
| **CTA Color** | [HEX] | Primary action color |
| **Spacing** | [PADDING_TOP/BOTTOM] | From spacing system |

### Conversion Goal
- **Primary:** Email signup / Free trial start
- **Micro-conversion:** Scroll to features

---

## Module 2: Social Proof Bar

### Purpose
Build immediate credibility with logos, numbers, or trust badges.

### Layout Options

**Option A: Logo Bar**
```
┌─────────────────────────────────────────────────────────────┐
│  "Trusted by teams at"                                      │
│  [LOGO_1]  [LOGO_2]  [LOGO_3]  [LOGO_4]  [LOGO_5]          │
└─────────────────────────────────────────────────────────────┘
```

**Option B: Stats Bar**
```
┌─────────────────────────────────────────────────────────────┐
│  [STAT_1]        │  [STAT_2]        │  [STAT_3]            │
│  [NUMBER]        │  [NUMBER]        │  [NUMBER]            │
│  [LABEL]         │  [LABEL]         │  [LABEL]             │
└─────────────────────────────────────────────────────────────┘
```

**Option C: Trust Badges**
```
┌─────────────────────────────────────────────────────────────┐
│  [BADGE: SSL]  [BADGE: GDPR]  [BADGE: RATING]              │
└─────────────────────────────────────────────────────────────┘
```

### Content Requirements

| Element | Content | Source |
|---------|---------|--------|
| **Logos** | [CLIENT_LOGOS or PLACEHOLDER] | Real or "As seen in" |
| **Stats** | [USERS / INVOICES / TIME_SAVED] | Real metrics |
| **Badges** | [SECURITY / COMPLIANCE / REVIEWS] | Certifications |

---

## Module 3: Problem/Pain Section

### Purpose
Connect with visitor by articulating their pain point better than they can.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [PROBLEM_HEADLINE - H2]                  │
│                    "Sound familiar?"                        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ [PAIN_1]    │  │ [PAIN_2]    │  │ [PAIN_3]    │         │
│  │ Icon + Text │  │ Icon + Text │  │ Icon + Text │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│                    [AGITATION_TEXT]                         │
│                    Quantify the cost of inaction            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Content Requirements

| Element | Content | Source |
|---------|---------|--------|
| **Headline** | [PROBLEM_FRAMING_QUESTION] | landingpage-contents.md |
| **Pain Points** | 3 specific, relatable pains | product-brief.md |
| **Agitation** | Cost/impact of problem | story.md |

---

## Module 4: Solution Overview

### Purpose
Introduce how [PRODUCT_NAME] solves the problem.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [SOLUTION_HEADLINE - H2]                 │
│                    "There's a better way"                   │
│                                                             │
│                    [SOLUTION_DESCRIPTION]                   │
│                    2-3 sentences explaining the approach    │
│                                                             │
│                    [PRODUCT_VISUAL]                         │
│                    Screenshot / Illustration / GIF          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Content Requirements

| Element | Content | Source |
|---------|---------|--------|
| **Headline** | [TRANSFORMATION_PROMISE] | landingpage-contents.md |
| **Description** | [HOW_IT_WORKS_BRIEF] | product-brief.md |
| **Visual** | [SCREENSHOT / MOCKUP / EMOJI_ILLUSTRATION] | To be created |

---

## Module 5: Features Section

### Purpose
Detail the key capabilities that deliver the promised value.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [FEATURES_HEADLINE - H2]                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [ICON]  [FEATURE_1_NAME - H3]                       │   │
│  │         [FEATURE_1_BENEFIT]                         │   │
│  │         [FEATURE_1_DETAIL]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [ICON]  [FEATURE_2_NAME - H3]                       │   │
│  │         [FEATURE_2_BENEFIT]                         │   │
│  │         [FEATURE_2_DETAIL]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [ICON]  [FEATURE_3_NAME - H3]                       │   │
│  │         [FEATURE_3_BENEFIT]                         │   │
│  │         [FEATURE_3_DETAIL]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Content Requirements

| Feature | Name | Benefit | Icon |
|---------|------|---------|------|
| 1 | [FEATURE_NAME] | [USER_BENEFIT] | [EMOJI/ICON] |
| 2 | [FEATURE_NAME] | [USER_BENEFIT] | [EMOJI/ICON] |
| 3 | [FEATURE_NAME] | [USER_BENEFIT] | [EMOJI/ICON] |
| 4 | [FEATURE_NAME] | [USER_BENEFIT] | [EMOJI/ICON] |
| 5 | [FEATURE_NAME] | [USER_BENEFIT] | [EMOJI/ICON] |

---

## Module 6: How It Works

### Purpose
Reduce cognitive load by showing simple steps to success.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [HOW_IT_WORKS_HEADLINE - H2]             │
│                    "Get started in 3 steps"                 │
│                                                             │
│     [STEP_1]              [STEP_2]              [STEP_3]    │
│     ┌──────┐              ┌──────┐              ┌──────┐    │
│     │  1   │ ──────────── │  2   │ ──────────── │  3   │    │
│     └──────┘              └──────┘              └──────┘    │
│     [STEP_TITLE]          [STEP_TITLE]          [STEP_TITLE]│
│     [STEP_DESC]           [STEP_DESC]           [STEP_DESC] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Content Requirements

| Step | Title | Description | Visual |
|------|-------|-------------|--------|
| 1 | [ACTION_VERB] | [WHAT_USER_DOES] | [NUMBER/ICON] |
| 2 | [ACTION_VERB] | [WHAT_USER_DOES] | [NUMBER/ICON] |
| 3 | [ACTION_VERB] | [WHAT_USER_DOES] | [NUMBER/ICON] |

---

## Module 7: Testimonials

### Purpose
Build trust through customer stories and social proof.

### Layout Options

**Option A: Quote Cards**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ "[TESTIMONIAL_QUOTE]"                               │   │
│  │                                                      │   │
│  │ [PHOTO]  [NAME]                                     │   │
│  │          [TITLE], [COMPANY]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ "[TESTIMONIAL_QUOTE]"                               │   │
│  │                                                      │   │
│  │ [PHOTO]  [NAME]                                     │   │
│  │          [TITLE], [COMPANY]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Option B: Carousel (if >3 testimonials)**

**Option C: Video Testimonials (highest trust)**

### Content Requirements

| # | Quote | Name | Title | Photo |
|---|-------|------|-------|-------|
| 1 | [QUOTE] | [NAME] | [TITLE] | [PLACEHOLDER/REAL] |
| 2 | [QUOTE] | [NAME] | [TITLE] | [PLACEHOLDER/REAL] |
| 3 | [QUOTE] | [NAME] | [TITLE] | [PLACEHOLDER/REAL] |

---

## Module 8: Pricing (Optional)

### Purpose
Enable decision-making with clear pricing information.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [PRICING_HEADLINE - H2]                  │
│                    "Simple, transparent pricing"            │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ [TIER_1]    │  │ [TIER_2]    │  │ [TIER_3]    │         │
│  │ [PRICE]     │  │ [PRICE]     │  │ [PRICE]     │         │
│  │ [FEATURES]  │  │ [FEATURES]  │  │ [FEATURES]  │         │
│  │ [CTA]       │  │ [CTA]       │  │ [CTA]       │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Content Requirements

| Tier | Name | Price | Features | CTA |
|------|------|-------|----------|-----|
| 1 | [FREE/STARTER] | €[X]/mo | [FEATURE_LIST] | [CTA_TEXT] |
| 2 | [PRO/RECOMMENDED] | €[X]/mo | [FEATURE_LIST] | [CTA_TEXT] |
| 3 | [ENTERPRISE] | [CONTACT] | [FEATURE_LIST] | [CTA_TEXT] |

---

## Module 9: FAQ Section

### Purpose
Handle objections and reduce friction before signup.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [FAQ_HEADLINE - H2]                      │
│                    "Frequently Asked Questions"             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Q: [QUESTION_1]                                 [+] │   │
│  │    [ANSWER_1 - expandable]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Q: [QUESTION_2]                                 [+] │   │
│  │    [ANSWER_2 - expandable]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ... (5-7 FAQs)                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Content Requirements

| # | Question | Answer | Objection Addressed |
|---|----------|--------|---------------------|
| 1 | [Q] | [A] | [OBJECTION] |
| 2 | [Q] | [A] | [OBJECTION] |
| 3 | [Q] | [A] | [OBJECTION] |
| 4 | [Q] | [A] | [OBJECTION] |
| 5 | [Q] | [A] | [OBJECTION] |

---

## Module 10: Final CTA

### Purpose
Last conversion opportunity before footer.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [FINAL_CTA_HEADLINE]                     │
│                    "Ready to get started?"                  │
│                                                             │
│                    [FINAL_CTA_SUBHEADLINE]                  │
│                    Reinforce key benefit                    │
│                                                             │
│              ┌─────────────────────────────────┐            │
│              │  [EMAIL INPUT]  [CTA BUTTON]   │            │
│              └─────────────────────────────────┘            │
│                                                             │
│                    [RISK_REVERSAL]                          │
│                    "No credit card required"                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Module 11: Footer

### Purpose
Legal compliance, secondary navigation, trust signals.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [LOGO]                                                     │
│                                                             │
│  [LINK: Privacy Policy]  [LINK: Terms of Service]          │
│  [LINK: Imprint/Contact]                                    │
│                                                             │
│  [COPYRIGHT]                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Responsive Behavior

### Mobile (< 768px)

| Module | Adaptation |
|--------|------------|
| Hero | Stack form vertically |
| Features | Single column |
| How It Works | Vertical steps |
| Pricing | Swipeable cards |
| FAQ | Full-width accordion |

### Tablet (768px - 1024px)

| Module | Adaptation |
|--------|------------|
| Features | 2-column grid |
| Pricing | 2 visible, 1 swipe |

### Desktop (> 1024px)

| Module | Adaptation |
|--------|------------|
| All | Full layout as designed |
| Max-width | 1200px container |

---

## A/B Testing Notes

### High-Impact Tests

1. **Hero Headline:** Test benefit vs. problem framing
2. **CTA Button:** Test color, text, and placement
3. **Social Proof:** Test logos vs. stats vs. testimonials
4. **Module Order:** Test problem-first vs. solution-first

### Module Variants to Create

| Module | Variant A | Variant B |
|--------|-----------|-----------|
| Hero | Email form | Demo video |
| Features | Icons + text | Screenshots |
| Social Proof | Logo bar | Stats bar |

---

## Implementation Notes

### For landing-page-builder

- Use semantic HTML5 elements
- Ensure each module is a `<section>` with unique ID
- Mobile-first CSS approach
- Lazy load images below fold
- Total page size < 30KB

### Content Placeholders

All `[PLACEHOLDER]` text must be replaced by content from:
- `landingpage-contents.md` (copy)
- `design-system.md` (visual specs)
- `seo-keywords.md` (SEO elements)
