# Data Analysis Skill

> Template for Product Owner user metrics analysis and product analytics
> Created: 2026-01-09
> Version: 1.0.0

## Skill Name
**data-analysis** - Expert product analytics, user metrics interpretation, and data-driven decision making

## Purpose
Enable Product Owners to analyze user behavior, interpret product metrics, validate hypotheses, and make informed prioritization decisions based on quantitative and qualitative data.

## When to Activate

Activate this skill when:
- Analyzing user behavior patterns
- Measuring feature adoption and engagement
- Validating product hypotheses with data
- Identifying user pain points through analytics
- Prioritizing features based on data insights
- Creating data-driven product roadmaps
- Reporting product performance to stakeholders
- Conducting A/B test analysis
- Investigating user drop-off or conversion issues

## Core Capabilities

### 1. Product Metrics Framework

#### AARRR Pirate Metrics
- **Acquisition**: How users find your product
  - Traffic sources, signup conversion rate
- **Activation**: First valuable experience
  - Onboarding completion, time-to-value
- **Retention**: Repeat usage
  - Daily/weekly/monthly active users, churn rate
- **Referral**: User-driven growth
  - Viral coefficient, referral rate
- **Revenue**: Monetization success
  - Average revenue per user (ARPU), lifetime value (LTV)

#### Key Performance Indicators (KPIs)
- **Engagement Metrics**: DAU, WAU, MAU, session duration, feature usage
- **Conversion Metrics**: Signup rate, trial-to-paid, checkout completion
- **Retention Metrics**: Cohort retention, churn rate, customer lifetime
- **Business Metrics**: Revenue, customer acquisition cost (CAC), LTV:CAC ratio
- **Quality Metrics**: Error rates, page load time, customer satisfaction (NPS, CSAT)

### 2. Data Collection Strategy

#### Event Tracking
```javascript
// Example event structure
{
  event: "feature_used",
  user_id: "user_123",
  timestamp: "2026-01-09T14:30:00Z",
  properties: {
    feature_name: "export_csv",
    context: "dashboard",
    duration_ms: 1200
  }
}
```

#### Key Events to Track
- **User Actions**: Clicks, form submissions, navigation
- **Feature Usage**: Specific feature interactions
- **Conversions**: Goal completions, purchases
- **Errors**: Failed actions, system errors
- **Engagement**: Time on page, scroll depth

#### Data Quality Principles
- **Consistent Naming**: Standardized event names (e.g., `button_clicked`, not `btn_click`, `ButtonClick`)
- **Complete Context**: Include relevant metadata (user type, plan, etc.)
- **Privacy Compliance**: Respect user consent, anonymize PII
- **Validation**: Test tracking before production deployment

### 3. Analysis Techniques

#### Cohort Analysis
Track groups of users over time:
```
Week 0: 1000 users signed up
Week 1: 650 users returned (65% retention)
Week 2: 520 users returned (52% retention)
Week 4: 400 users returned (40% retention)
```

**Insights**:
- Identify retention drop-off points
- Compare cohorts by signup date, feature, or user segment
- Validate if product changes improve retention

#### Funnel Analysis
Track step-by-step user progression:
```
Homepage Visit:        10,000 users (100%)
  ↓
Signup Page:           3,000 users (30%)
  ↓
Form Submission:       1,500 users (15%)
  ↓
Email Confirmation:    1,200 users (12%)
  ↓
Onboarding Complete:   900 users (9%)
```

**Insights**:
- Identify biggest drop-off points
- Prioritize optimizations with highest potential impact
- Measure before/after improvements

#### Segmentation Analysis
Compare behavior across user groups:
```
Free Plan Users:
- Avg session: 5 min
- Feature usage: 40%
- Retention: 30%

Paid Plan Users:
- Avg session: 15 min
- Feature usage: 85%
- Retention: 75%
```

**Insights**:
- Understand power users vs. casual users
- Tailor features to different segments
- Identify conversion drivers

#### A/B Testing
Compare variants to validate hypotheses:
```
Variant A (Control):  1000 users, 10% conversion
Variant B (New CTA):  1000 users, 14% conversion
Statistical Significance: p < 0.05 ✓
```

**Best Practices**:
- Test one variable at a time
- Ensure sufficient sample size
- Run for full business cycle
- Validate statistical significance

### 4. Hypothesis-Driven Development

#### Hypothesis Template
```
We believe that [change/feature]
For [user segment]
Will result in [expected outcome]
We will know we're right when we see [measurable signal]
```

#### Example Hypotheses

**Hypothesis 1**:
- **We believe that**: Adding onboarding tooltips
- **For**: New free trial users
- **Will result in**: Increased feature discovery
- **We will know we're right when**: Feature usage in first week increases from 40% to 60%

**Hypothesis 2**:
- **We believe that**: Simplifying the checkout flow from 5 steps to 3
- **For**: All purchasing users
- **Will result in**: Higher conversion rate
- **We will know we're right when**: Checkout completion rate increases from 65% to 75%

**Validation Process**:
1. Define hypothesis and success metrics
2. Implement tracking before building feature
3. Build and release (potentially as A/B test)
4. Collect data for defined period
5. Analyze results against success criteria
6. Decide: keep, iterate, or kill feature

## [TECH_STACK_SPECIFIC] Considerations

### Analytics Implementation
Common analytics platforms:
- **Google Analytics 4**: Web traffic, user journeys
- **Mixpanel**: Product analytics, funnels, cohorts
- **Amplitude**: Behavioral analytics, retention
- **Heap**: Auto-capture analytics
- **PostHog**: Open-source product analytics
- **Custom**: In-house analytics pipeline

### Data Warehouse
- Ensure analytics data flows to central warehouse
- Common tools: PostgreSQL, BigQuery, Redshift, Snowflake
- Enable SQL queries for custom analysis

### Dashboard Tools
- **Metabase**: Open-source BI tool
- **Looker**: Enterprise BI platform
- **Tableau**: Advanced visualization
- **Custom**: Built with Recharts, D3.js, etc.

## Tools Required

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - postgres - Query analytics data from production database
     - fetch - Retrieve metrics dashboards and reports
     - filesystem - Manage data analysis artifacts and reports

     Note: Skills work without MCP servers, but functionality may be limited
-->

### Analytics Platforms
- Access to product analytics tool (Mixpanel, Amplitude, etc.)
- Web analytics (Google Analytics)
- Session recording tools (FullStory, Hotjar) - optional but valuable

### Data Access
- SQL access to production database (read-only) or data warehouse
- Dashboard tools for visualization
- Spreadsheet software (Excel, Google Sheets) for ad-hoc analysis

### Testing Tools
- A/B testing platform (Optimizely, VWO, LaunchDarkly, etc.)
- Statistical significance calculators

### Communication
- Data visualization tools for stakeholder reports
- Presentation software for sharing insights

## Quality Checklist

Before making data-driven decisions:

- [ ] Data source is reliable and recent
- [ ] Sample size is statistically significant
- [ ] Time period is representative (not holiday/anomaly period)
- [ ] Segmentation is appropriate for analysis
- [ ] Correlation vs. causation considered
- [ ] Confounding factors identified
- [ ] Statistical significance validated (for A/B tests)
- [ ] Data privacy and compliance respected
- [ ] Qualitative feedback considered alongside quantitative data
- [ ] Insights translated to actionable recommendations
- [ ] Findings documented for future reference
- [ ] Stakeholders aligned on interpretation

## Metrics Dashboard Template

```markdown
# Product Metrics Dashboard: [Product Name]

> Last Updated: [DATE]
> Data Period: [Date Range]
> Reporting Frequency: Weekly | Monthly

## Executive Summary
[2-3 sentence overview of current product health]

## Key Metrics

### Acquisition
- **Total Signups**: [Number] ([% change] vs. last period)
- **Signup Conversion Rate**: [%] ([% change])
- **Top Traffic Sources**:
  1. [Source]: [%]
  2. [Source]: [%]
  3. [Source]: [%]

### Activation
- **Onboarding Completion Rate**: [%] ([% change])
- **Time to First Value**: [Avg time] ([% change])
- **Feature Adoption (First Week)**: [%] ([% change])

### Retention
- **DAU**: [Number] ([% change])
- **WAU**: [Number] ([% change])
- **MAU**: [Number] ([% change])
- **30-Day Retention**: [%] ([% change])
- **Churn Rate**: [%] ([% change])

### Revenue
- **MRR**: $[Amount] ([% change])
- **ARPU**: $[Amount] ([% change])
- **LTV**: $[Amount]
- **CAC**: $[Amount]
- **LTV:CAC Ratio**: [Ratio]

### Quality
- **Error Rate**: [%] ([% change])
- **Avg Page Load Time**: [Seconds] ([% change])
- **NPS Score**: [Score] ([% change])

## Cohort Analysis

| Signup Week | Week 0 | Week 1 | Week 2 | Week 4 | Week 8 |
|-------------|--------|--------|--------|--------|--------|
| 2025-12-02  | 100%   | 68%    | 54%    | 42%    | 38%    |
| 2025-12-09  | 100%   | 70%    | 56%    | 44%    | -      |
| 2025-12-16  | 100%   | 72%    | 58%    | -      | -      |
| 2025-12-23  | 100%   | 65%    | -      | -      | -      |

**Insight**: [Interpretation of cohort trends]

## Feature Usage

| Feature | % of Active Users | Avg Uses per User | Trend |
|---------|-------------------|-------------------|-------|
| [Feature 1] | [%] | [Number] | ↑ ↓ → |
| [Feature 2] | [%] | [Number] | ↑ ↓ → |
| [Feature 3] | [%] | [Number] | ↑ ↓ → |

**Insight**: [Key takeaways on feature adoption]

## Conversion Funnels

### Signup Funnel
1. Homepage → Signup Page: [%]
2. Signup Page → Form Submit: [%]
3. Form Submit → Email Confirm: [%]
4. Email Confirm → Onboarding: [%]

**Overall Conversion**: [%]
**Biggest Drop-off**: [Step] ([%] drop)

### Purchase Funnel
1. Free User → Trial Start: [%]
2. Trial Start → Trial Engaged: [%]
3. Trial Engaged → Purchase: [%]

**Overall Conversion**: [%]
**Biggest Drop-off**: [Step] ([%] drop)

## User Segments

| Segment | % of Users | Avg Session | Feature Usage | Retention |
|---------|------------|-------------|---------------|-----------|
| Power Users | [%] | [Time] | [%] | [%] |
| Regular Users | [%] | [Time] | [%] | [%] |
| At-Risk Users | [%] | [Time] | [%] | [%] |

**Insight**: [Segment-specific observations]

## Key Insights

1. **[Insight Title]**: [Description and implication]
2. **[Insight Title]**: [Description and implication]
3. **[Insight Title]**: [Description and implication]

## Recommended Actions

| Priority | Action | Expected Impact | Owner | Status |
|----------|--------|-----------------|-------|--------|
| High | [Action] | [Impact] | [Name] | [Status] |
| Medium | [Action] | [Impact] | [Name] | [Status] |

## Experiments in Progress

| Experiment | Hypothesis | Status | Early Results |
|------------|------------|--------|---------------|
| [Name] | [Hypothesis] | Running | [Update] |
```

## SQL Query Examples

### Daily Active Users (DAU)
```sql
SELECT
  DATE(logged_in_at) as date,
  COUNT(DISTINCT user_id) as dau
FROM user_sessions
WHERE logged_in_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(logged_in_at)
ORDER BY date DESC;
```

### Feature Adoption Rate
```sql
SELECT
  COUNT(DISTINCT user_id) as total_users,
  COUNT(DISTINCT CASE WHEN feature_used THEN user_id END) as users_with_feature,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN feature_used THEN user_id END) / COUNT(DISTINCT user_id), 2) as adoption_rate
FROM users
LEFT JOIN feature_events ON users.id = feature_events.user_id
WHERE users.created_at >= CURRENT_DATE - INTERVAL '30 days';
```

### Cohort Retention
```sql
WITH cohorts AS (
  SELECT
    user_id,
    DATE_TRUNC('week', created_at) as cohort_week
  FROM users
),
activity AS (
  SELECT
    user_id,
    DATE_TRUNC('week', logged_in_at) as activity_week
  FROM user_sessions
)
SELECT
  c.cohort_week,
  DATE_DIFF('week', c.cohort_week, a.activity_week) as weeks_since_signup,
  COUNT(DISTINCT c.user_id) as cohort_size,
  COUNT(DISTINCT a.user_id) as active_users,
  ROUND(100.0 * COUNT(DISTINCT a.user_id) / COUNT(DISTINCT c.user_id), 2) as retention_rate
FROM cohorts c
LEFT JOIN activity a ON c.user_id = a.user_id
GROUP BY c.cohort_week, weeks_since_signup
ORDER BY c.cohort_week, weeks_since_signup;
```

### Conversion Funnel
```sql
SELECT
  COUNT(DISTINCT user_id) as total_visitors,
  COUNT(DISTINCT CASE WHEN signed_up THEN user_id END) as signups,
  COUNT(DISTINCT CASE WHEN onboarded THEN user_id END) as completed_onboarding,
  COUNT(DISTINCT CASE WHEN upgraded THEN user_id END) as paid_users,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN signed_up THEN user_id END) / COUNT(DISTINCT user_id), 2) as signup_rate,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN onboarded THEN user_id END) / COUNT(DISTINCT CASE WHEN signed_up THEN user_id END), 2) as onboarding_rate,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN upgraded THEN user_id END) / COUNT(DISTINCT CASE WHEN signed_up THEN user_id END), 2) as conversion_rate
FROM user_journey
WHERE visited_at >= CURRENT_DATE - INTERVAL '30 days';
```

## Data Analysis Anti-Patterns

### 1. Vanity Metrics
**Problem**: Tracking metrics that look good but don't inform decisions
**Example**: Total signups without considering retention or activation
**Solution**: Focus on actionable metrics tied to business outcomes

### 2. Analysis Paralysis
**Problem**: Collecting endless data without making decisions
**Solution**: Set decision deadlines, use "good enough" data

### 3. Ignoring Statistical Significance
**Problem**: Declaring A/B test winner with insufficient data
**Solution**: Use proper sample size calculators, validate p-values

### 4. Correlation = Causation
**Problem**: Assuming correlation implies causation
**Example**: "Users who use Feature X have higher retention" → doesn't mean Feature X causes retention
**Solution**: Consider confounding factors, run experiments

### 5. Cherry-Picking Data
**Problem**: Selecting date ranges or segments that support desired conclusion
**Solution**: Define analysis parameters before looking at data

### 6. Ignoring Qualitative Data
**Problem**: Relying solely on numbers without user feedback
**Solution**: Combine quantitative metrics with user interviews, surveys, support tickets

## Integration with Specwright

### Metrics in Product Decisions
Document data-driven decisions:
```
specwright/product/architecture-decision.md
```

Include:
- Hypothesis tested
- Data analyzed
- Results observed
- Decision made and rationale

### Feature Prioritization
Reference metrics in specs:
```
.specwright/specs/YYYY-MM-DD-feature-name/spec.md
```

Include:
- Current state metrics
- Expected impact on KPIs
- Success criteria post-launch

### Roadmap Validation
Update roadmap based on data:
```
.specwright/product/roadmap.md
```

Adjust priorities when data reveals:
- Unexpected user behavior
- Higher/lower than expected adoption
- New growth opportunities

## Success Metrics

Track data analysis effectiveness through:
- **Decision Velocity**: Time from question to data-informed decision
- **Prediction Accuracy**: % of hypotheses validated
- **Stakeholder Confidence**: Trust in data-driven recommendations
- **Feature Success Rate**: % of launched features meeting success criteria
- **Data Quality**: % of metrics tracked accurately and reliably

---

**Remember**: Data tells stories, but you must interpret them wisely. Combine quantitative metrics with qualitative insights. Question your assumptions. Test your hypotheses. And always ask "so what?" – what action does this data inform?
