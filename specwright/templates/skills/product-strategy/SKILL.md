---
description: Product strategy guidance for interactive product definition and brief creation
globs: []
alwaysApply: false
---

# Product Strategy Skill

> Project: [PROJECT_NAME]
> Generated: [DATE]
> Purpose: Guide for interactive product definition, idea sharpening, and product brief creation

## When to Use

This skill guides you when doing product strategy work for:
- Product idea sharpening in `/plan-product`
- Product brief creation and refinement
- Feature prioritization and value proposition definition

## Quick Reference

### Product Definition Process

1. **Capture Raw Input**: Gather user's initial product idea
2. **Assess Completeness**: Check against required brief fields
3. **Ask Clarifying Questions**: Fill gaps interactively
4. **Validate Quality**: Ensure all criteria met
5. **Generate Brief**: Fill product-brief template

### Product Brief is COMPLETE when

- [ ] Target audience is specific and measurable
- [ ] Problem statement is concrete and validated
- [ ] 3-5 core features defined with clear scope
- [ ] Value proposition differentiates from alternatives
- [ ] Success metrics are measurable (KPIs)
- [ ] Differentiation is clear

---

## Detailed Guidance

### Idea Sharpening Techniques

**Start Broad, Then Focus:**
1. Let user describe freely first
2. Identify the core value (what's the ONE thing?)
3. Ask "Who benefits most?" to narrow audience
4. Ask "What happens without this?" to validate problem

**Question Framework (progressive refinement):**

| Phase | Question Type | Example |
|-------|--------------|---------|
| Discovery | Open-ended | "Tell me about your product idea" |
| Clarification | Specific | "Who is your primary user persona?" |
| Validation | Challenge | "How is this different from [competitor]?" |
| Completion | Gap-filling | "What does success look like in 6 months?" |

### Required Brief Fields

#### 1. Target Audience
```
❌ "Everyone who uses the internet"
❌ "Small businesses"
✅ "SaaS founders with 10-50 employees who struggle with customer onboarding"
✅ "Freelance designers managing 3-10 clients simultaneously"
```

**Validation:** Must include WHO + SIZE/CONTEXT + PAIN POINT

#### 2. Problem Statement
```
❌ "Communication is hard"
❌ "Need better tools"
✅ "Remote teams lose 5+ hours/week to context switching between chat, email, and project tools"
✅ "Freelancers spend 30% of their time on invoicing instead of billable work"
```

**Validation:** Must be SPECIFIC + MEASURABLE + IMPACTFUL

#### 3. Core Features (3-5)
```
❌ "Good UI, Fast, Reliable" (qualities, not features)
❌ "Everything users need" (vague)
✅ Feature 1: "Unified inbox aggregating Slack, Email, and GitHub notifications"
✅ Feature 2: "Smart priority scoring based on project deadlines and sender importance"
✅ Feature 3: "One-click response templates with context-aware suggestions"
```

**Validation:** Each feature must be CONCRETE + BUILDABLE + VALUABLE

#### 4. Value Proposition
```
❌ "The best tool for teams"
✅ "Cut context-switching time by 60% by unifying all team communication in one smart inbox"
```

**Format:** [ACTION] + [METRIC] + [HOW]

#### 5. Success Metrics
```
❌ "Users like it"
✅ "1000 active users within 3 months"
✅ "Average session time > 15 minutes"
✅ "NPS score > 50"
```

**Validation:** Must be NUMERIC + TIME-BOUND + TRACKABLE

### Completeness Check

**Score each field (0-2):**
- 0 = Missing or vague
- 1 = Present but could be sharper
- 2 = Specific and actionable

**Minimum score for proceeding: 8/10 (all fields at least 1, majority at 2)**

### Common Pitfalls

| Pitfall | Detection | Resolution |
|---------|-----------|------------|
| Feature creep | > 7 features listed | Ask "Which 3 are essential for day-1?" |
| Solution-first thinking | User describes tech, not problem | Ask "What problem does this solve?" |
| Too broad audience | "Everyone" or entire industry | Ask "Who would pay for this TODAY?" |
| No differentiation | Can't explain vs. alternatives | Research competitors, find unique angle |
| Vanity metrics | Downloads, page views only | Ask "What metric proves real value?" |

### Interactive Dialog Patterns

**When user is vague:**
```
"I hear you want to build [X]. Let me ask a few questions to sharpen this:
1. Who would be your first 10 paying customers?
2. What are they using today to solve this?
3. Why would they switch?"
```

**When user has too many ideas:**
```
"You've described several interesting features. For a focused MVP:
- Which ONE feature would users pay for on its own?
- Which features can wait for v2?"
```

**When user is stuck on technology:**
```
"Before we discuss technology, let's nail down:
- What's the user's journey from problem to solution?
- What does the user see/do at each step?"
```

---

## Quality Standards

### Product Brief Quality Levels

**Level A (Excellent):** All fields specific, measurable, differentiated. Ready for tech stack and roadmap.

**Level B (Good):** Most fields clear, 1-2 need minor sharpening. Can proceed with notes.

**Level C (Needs Work):** Multiple vague fields. Continue interactive refinement before proceeding.

### Template Reference

Use template: `specwright/templates/product/product-brief-template.md`
Lite version: `specwright/templates/product/product-brief-lite-template.md`

---

## Output Format

The product brief should follow the template structure exactly. All placeholders must be replaced with specific, validated content. No placeholder text should remain in the final output.
