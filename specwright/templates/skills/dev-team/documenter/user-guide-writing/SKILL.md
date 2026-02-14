# User Guide Writing Skill

> Skill: user-guide-writing
> Created: 2026-01-09
> Agent: documenter
> Category: Documentation

## Purpose

Write clear, user-facing feature documentation that helps end users understand and use features effectively. Focuses on "how-to" guides, tutorials, and feature overviews in accessible language.

## When to Activate

**Trigger Conditions:**
- After feature completion and testing
- After UI/UX changes
- When new user workflows are implemented
- When documenter agent creates user-facing docs

**Activation Pattern:**
```
When: Feature marked complete AND ready for users
Then: Create/update user guide documentation
```

## Core Capabilities

### 1. Feature Overview Writing
- Explain what the feature does (not how it works internally)
- Highlight key benefits and use cases
- Identify target user personas
- Set proper expectations

### 2. Step-by-Step Guides
- Break down complex workflows into simple steps
- Use numbered lists for sequential actions
- Include decision points and branching paths
- Add troubleshooting sections

### 3. Visual Documentation
- Identify where screenshots would help
- Suggest annotated images for complex UI
- Recommend video tutorials for workflows
- Create diagrams for process flows

### 4. Accessibility Writing
- Use plain language (avoid jargon)
- Write at 8th-grade reading level
- Provide alternative text descriptions
- Support screen reader compatibility

## [TECH_STACK_SPECIFIC] Sections

### Web Application Documentation
```markdown
## Integration Points
- Reference UI routes and URLs
- Link to actual feature pages
- Include browser compatibility notes
- Document keyboard shortcuts

## Web-Specific Elements
- Screenshot annotations with arrows/highlights
- Browser console instructions (if needed)
- Mobile vs desktop differences
- Responsive behavior notes

## Example Structure
# Feature Name

## What is [Feature]?
[Feature] helps you [primary benefit]. Use it to [common use cases].

## Getting Started
1. Navigate to [Menu > Feature]
2. Click "New [Item]"
3. Fill in required fields
4. Click "Save"

## Key Features
- **[Feature 1]** - [Benefit]
- **[Feature 2]** - [Benefit]

## Step-by-Step Guides
### How to [Task]
[Detailed steps...]

## Tips and Best Practices
- [Tip 1]
- [Tip 2]

## Troubleshooting
**Problem:** [Common issue]
**Solution:** [How to fix]
```

### Mobile App Documentation
```markdown
## Integration Points
- Reference screen names
- Document gestures (swipe, pinch, etc.)
- Note platform differences (iOS vs Android)
- Include version requirements

## Mobile-Specific Elements
- Device screenshots (different sizes)
- Gesture animations/diagrams
- Offline behavior notes
- Push notification settings

## Example Structure
# Feature Name

## Quick Start
Open the app → Tap [Icon] → Select [Option]

## Common Actions
### To [Action]
1. Tap [Button]
2. Swipe [Direction] on [Item]
3. Confirm by tapping "Done"

## Gestures
- **Swipe Left** - [Action]
- **Long Press** - [Action]
- **Pinch to Zoom** - [Context]

## Settings
To configure [Feature]:
Settings → [Feature] → [Options]
```

### API/Developer Documentation
```markdown
## Integration Points
- Link to API documentation
- Reference code examples
- Document SDKs and libraries
- Include authentication details

## Developer-Specific Elements
- Code snippets in multiple languages
- Authentication flow diagrams
- Rate limit explanations
- Error handling guides

## Example Structure
# Using [Feature] API

## Overview
The [Feature] API allows you to [capability].

## Quick Start
```language
[minimal working example]
```

## Authentication
[How to authenticate]

## Common Operations
### [Operation]
```language
[code example]
```

## Error Handling
[Common errors and solutions]
```

### SaaS Product Documentation
```markdown
## Integration Points
- Link to account settings
- Reference pricing/plan differences
- Document admin vs user permissions
- Include billing implications

## SaaS-Specific Elements
- Plan comparison tables
- Permission matrices
- Onboarding checklists
- Integration guides (Zapier, webhooks)

## Example Structure
# Feature Name

## Availability
Available on: [Plans that include this]
Upgrade here: [Link]

## Who Can Use This?
- **Admins** - Full access
- **Managers** - [Permissions]
- **Users** - [Permissions]

## Setup
### For Admins
[Setup steps for admins]

### For Users
[User onboarding]

## Integrations
Connect [Feature] with:
- [Integration 1] - [How and why]
- [Integration 2] - [How and why]
```

## Tools Required

### Primary Tools
- **nn__documentation-generator** - Format user guides
- **nn__screenshot-annotator** - Add annotations to images

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - mcp__code-analyzer - Extract feature workflows
     - mcp__screen-recorder - Create tutorial videos
     - mcp__accessibility-checker - Verify readability

     Note: Skills work without MCP servers, but functionality may be limited
-->

## Quality Checklist

**Before Writing:**
- [ ] Feature fully tested and working
- [ ] User workflows identified
- [ ] Common use cases documented
- [ ] Edge cases and errors known
- [ ] Screenshots/videos available

**Content Quality:**
- [ ] Written for target audience (not developers)
- [ ] Uses plain language (no jargon)
- [ ] Includes all necessary steps
- [ ] Has screenshots/visuals where helpful
- [ ] Covers common questions
- [ ] Includes troubleshooting section

**Structure Quality:**
- [ ] Clear hierarchy (H1, H2, H3)
- [ ] Scannable (bullets, numbered lists)
- [ ] Consistent formatting
- [ ] Working links (internal and external)
- [ ] Proper code formatting (if applicable)
- [ ] Version/date information

**Accessibility:**
- [ ] Alt text for all images
- [ ] Descriptive link text (not "click here")
- [ ] Readable font size
- [ ] Sufficient contrast
- [ ] Screen reader compatible

## Documentation Examples

### Feature Overview Template
```markdown
# [Feature Name]

> Last Updated: 2026-01-09 | Version: 1.0

## What is [Feature Name]?

[Feature Name] helps you [primary benefit]. It's designed for [target users] who need to [common use case].

**Key Benefits:**
- [Benefit 1] - [Why it matters]
- [Benefit 2] - [Why it matters]
- [Benefit 3] - [Why it matters]

**Who Should Use This?**
- [User Persona 1] - [Their specific need]
- [User Persona 2] - [Their specific need]

## Quick Start

Get started with [Feature Name] in 3 easy steps:

1. **[Step 1 Name]** - [Brief description]
2. **[Step 2 Name]** - [Brief description]
3. **[Step 3 Name]** - [Brief description]

[Screenshot: Overview of feature]

## Detailed Guide

### Step 1: [Action]

[Detailed explanation of what user needs to do]

1. Navigate to [Location]
2. Click [Button/Link]
3. [Next action]

**Tips:**
- [Helpful tip 1]
- [Helpful tip 2]

[Screenshot: Step 1 completion]

### Step 2: [Action]

[Detailed explanation]

**Important:** [Critical information user must know]

[Screenshot: Step 2 in progress]

### Step 3: [Action]

[Final steps]

**Success Indicators:**
- [How user knows it worked]
- [What to expect next]

## Common Tasks

### How to [Task 1]

1. [Step]
2. [Step]
3. [Step]

**Result:** [What happens]

### How to [Task 2]

1. [Step]
2. [Step]

**When to use this:** [Context]

## Tips and Best Practices

- **[Tip Category 1]**
  - [Specific tip]
  - [Specific tip]

- **[Tip Category 2]**
  - [Specific tip]
  - [Specific tip]

## Troubleshooting

### Problem: [Common Issue 1]

**Symptoms:**
- [How user knows they have this problem]

**Solution:**
1. [Step to fix]
2. [Step to fix]

**Still not working?** [Link to support or alternative solution]

### Problem: [Common Issue 2]

**Cause:** [Why this happens]

**Solution:** [How to fix]

## Frequently Asked Questions

**Q: [Common question]?**
A: [Clear answer]

**Q: [Common question]?**
A: [Clear answer]

## Related Features

- **[Related Feature 1]** - [How it connects]
- **[Related Feature 2]** - [How it connects]

## Getting Help

- **Documentation:** [Link to related docs]
- **Support:** [Link to support contact]
- **Community:** [Link to forums/community]

## Video Tutorial

[Embedded video or link]
*Duration: X minutes*

---

**Need more help?** Contact our support team at [support@example.com]
```

### Step-by-Step Tutorial Template
```markdown
# How to [Accomplish Goal]

> Estimated Time: X minutes | Difficulty: Beginner/Intermediate/Advanced

## What You'll Learn

By the end of this guide, you'll be able to:
- [Learning outcome 1]
- [Learning outcome 2]
- [Learning outcome 3]

## Before You Start

**Prerequisites:**
- [Requirement 1]
- [Requirement 2]

**What You'll Need:**
- [Item/access 1]
- [Item/access 2]

## Step 1: [Initial Setup]

Let's start by [action].

1. Open [application/page]
2. Click on [menu item]
3. Select [option]

You should now see [description of what appears].

[Screenshot with annotations showing where to click]

**Checkpoint:** Verify you see [specific element] before continuing.

## Step 2: [Configuration]

Now we'll configure [aspect].

1. In the [section name], enter:
   - **[Field 1]:** [What to enter and why]
   - **[Field 2]:** [What to enter and why]

2. Choose [option] from the dropdown

**Why this matters:** [Explanation of why these settings matter]

[Screenshot showing completed form]

## Step 3: [Main Action]

Here's where the magic happens.

1. Click the [button name] button
2. Wait for [process] to complete (this may take [time])
3. You'll see [confirmation message/screen]

**What's happening behind the scenes:** [Brief explanation]

[Screenshot or animated GIF showing the action]

## Step 4: [Verification]

Let's make sure everything worked correctly.

1. Navigate to [location]
2. Look for [indicator]
3. Verify that [condition is met]

**Success looks like this:**
- [Indicator 1]
- [Indicator 2]

[Screenshot showing successful completion]

## Next Steps

Now that you've completed [task], you can:

- **[Next action 1]** - [Why you'd do this]
- **[Next action 2]** - [Why you'd do this]
- **[Next action 3]** - [Why you'd do this]

## Common Questions

**What if [something goes wrong]?**
[Troubleshooting steps]

**Can I [variation of task]?**
[Answer with guidance]

**How often should I [do this task]?**
[Recommendation]

## Summary

You've successfully learned how to [main goal].

**Key takeaways:**
- [Important point 1]
- [Important point 2]
- [Important point 3]

## Related Tutorials

- [Related tutorial 1]
- [Related tutorial 2]

---

**Questions?** Join our [community forum] or email [support]
```

### Quick Reference Guide
```markdown
# [Feature] Quick Reference

One-page reference for common [feature] tasks.

## Common Actions

| I want to... | Steps |
|--------------|-------|
| [Action 1] | [Menu] → [Option] → [Click Button] |
| [Action 2] | [Quick shortcut or path] |
| [Action 3] | [Quick shortcut or path] |

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| [Action] | `Ctrl+X` | `Cmd+X` |
| [Action] | `Ctrl+Shift+X` | `Cmd+Shift+X` |

## Status Indicators

| Icon/Color | Meaning | Action |
|------------|---------|--------|
| Green | [Status] | [What to do] |
| Yellow | [Status] | [What to do] |
| Red | [Status] | [What to do] |

## Common Error Messages

**"[Error Message]"**
→ Cause: [Why this happens]
→ Fix: [How to resolve]

**"[Error Message]"**
→ Cause: [Why this happens]
→ Fix: [How to resolve]

## Tips

- **Tip 1:** [Quick tip]
- **Tip 2:** [Quick tip]
- **Tip 3:** [Quick tip]

## Limits and Restrictions

- [Limit 1]: [Details]
- [Limit 2]: [Details]

## Getting Help

**Full Documentation:** [Link]
**Video Tutorials:** [Link]
**Support:** [Link]
```

## Format Guidelines

### Writing Style

**DO:**
- Use second person ("you") to address users
- Use active voice: "Click the button" not "The button should be clicked"
- Use present tense: "The system sends" not "The system will send"
- Be concise and direct
- Use common words over technical terms
- Include context: "Click Save to store your changes"

**DON'T:**
- Use jargon or acronyms without explanation
- Assume prior knowledge
- Write long paragraphs (max 3-4 sentences)
- Use passive voice
- Be vague: "Click here" → "Click the Save button"

### Structure Patterns

**Headings:**
- H1: Feature name or main topic
- H2: Major sections (Overview, Getting Started, etc.)
- H3: Specific tasks or subsections
- H4: Sub-points or additional detail

**Lists:**
- Use numbered lists for sequential steps
- Use bullet lists for non-sequential items
- Keep items parallel in structure
- Start each item with a verb for action items

**Emphasis:**
- **Bold** for UI elements: Click **Save**
- *Italic* for emphasis or new terms
- `Code formatting` for technical terms, file names
- > Blockquotes for important notes or warnings

### Visual Elements

**Screenshots:**
- Show only relevant portion of screen
- Add annotations (arrows, highlights, numbers)
- Keep consistent size and style
- Update when UI changes

**Diagrams:**
- Use flowcharts for decision trees
- Use sequence diagrams for processes
- Keep simple and uncluttered
- Include legend if needed

**Videos:**
- Keep under 3 minutes
- Show one task per video
- Include captions
- Provide transcript

## Best Practices

1. **Know Your Audience**: Write for your least technical user
2. **Test Instructions**: Have someone follow your steps
3. **Update Regularly**: Review after every feature change
4. **Link Generously**: Connect related topics
5. **Show, Don't Tell**: Use visuals where possible
6. **Anticipate Questions**: Include FAQs and troubleshooting
7. **Make it Scannable**: Use headings, lists, and white space
8. **Provide Context**: Explain why, not just how
9. **Version Documentation**: Note when docs were last updated
10. **Get Feedback**: Let users suggest improvements

---

**Remember:** Great documentation helps users succeed independently. Write for clarity, not completeness.
