# Cross-Cutting Decisions

> Spec: [SPEC_NAME]
> Created: [CREATED_DATE]
> Last Updated: [LAST_UPDATED_DATE]

## Purpose

This document captures architectural and technical decisions that affect multiple user stories or the entire specification. These decisions provide consistency and prevent redundant discussions.

---

## Decision [DECISION_NUMBER]: [DECISION_TITLE]

**ID**: [DECISION_ID]
**Date**: [DECISION_DATE]
**Status**: [STATUS]
**Impacts**: [IMPACTED_STORIES]

### Context

[CONTEXT_DESCRIPTION]

### Decision

[DECISION_DESCRIPTION]

### Rationale

[RATIONALE_DESCRIPTION]

### Consequences

**Positive**:
- [POSITIVE_CONSEQUENCE_1]
- [POSITIVE_CONSEQUENCE_2]

**Negative**:
- [NEGATIVE_CONSEQUENCE_1]
- [NEGATIVE_CONSEQUENCE_2]

**Neutral**:
- [NEUTRAL_CONSEQUENCE_1]

### Alternatives Considered

#### Alternative 1: [ALTERNATIVE_1_NAME]

[ALTERNATIVE_1_DESCRIPTION]

**Why not chosen**: [REJECTION_REASON_1]

#### Alternative 2: [ALTERNATIVE_2_NAME]

[ALTERNATIVE_2_DESCRIPTION]

**Why not chosen**: [REJECTION_REASON_2]

### Implementation Notes

[IMPLEMENTATION_NOTES]

### Related Decisions

- [RELATED_DECISION_1]
- [RELATED_DECISION_2]

---

[ADDITIONAL_DECISIONS]

---

## Template Usage Instructions

### Placeholders

**Document Level**:
- `[SPEC_NAME]`: Name of the parent specification
- `[CREATED_DATE]`: ISO date format (YYYY-MM-DD)
- `[LAST_UPDATED_DATE]`: ISO date format (YYYY-MM-DD)

**Decision Level**:
- `[DECISION_NUMBER]`: Sequential number (1, 2, 3...)
- `[DECISION_TITLE]`: Brief descriptive title
- `[DECISION_ID]`: Unique identifier (e.g., DEC-PROF-001)
- `[DECISION_DATE]`: When decision was made
- `[STATUS]`: Proposed, Accepted, Rejected, Deprecated, Superseded
- `[IMPACTED_STORIES]`: Story IDs affected by this decision
- `[CONTEXT_DESCRIPTION]`: Why this decision needed to be made
- `[DECISION_DESCRIPTION]`: What was decided
- `[RATIONALE_DESCRIPTION]`: Why this approach was chosen
- `[POSITIVE/NEGATIVE/NEUTRAL_CONSEQUENCE]`: Impact of the decision
- `[ALTERNATIVE_NAME]`: Name of alternative approach
- `[ALTERNATIVE_DESCRIPTION]`: How alternative would work
- `[REJECTION_REASON]`: Why alternative was not chosen
- `[IMPLEMENTATION_NOTES]`: Guidance for developers
- `[RELATED_DECISION]`: Links to related decisions
- `[ADDITIONAL_DECISIONS]`: Repeat decision block for each decision

### Decision Categories

Common categories for cross-cutting decisions:

1. **Architecture**: System design, component structure, communication patterns
2. **Data**: Database schema, data models, caching strategies
3. **Security**: Authentication, authorization, data protection
4. **Performance**: Optimization strategies, caching, lazy loading
5. **UI/UX**: Design patterns, component libraries, accessibility
6. **Testing**: Test strategy, coverage requirements, mocking approaches
7. **Infrastructure**: Hosting, deployment, monitoring
8. **Integration**: Third-party services, APIs, external dependencies

### Guidelines

**When to Create a Decision**:
- Affects multiple user stories
- Has significant architectural impact
- Involves trade-offs between alternatives
- Needs team consensus
- Will guide future related decisions

**Status Definitions**:
- **Proposed**: Under discussion, not yet approved
- **Accepted**: Approved and should be implemented
- **Rejected**: Considered but not chosen
- **Deprecated**: Previously accepted but no longer recommended
- **Superseded**: Replaced by a newer decision

**Writing Good Decisions**:
- Provide sufficient context for future readers
- Explain the "why" behind the decision
- Document alternatives to show due diligence
- Be honest about negative consequences
- Include implementation guidance

### Example

```markdown
# Cross-Cutting Decisions

> Spec: User Profile Management
> Created: 2026-01-09
> Last Updated: 2026-01-09

## Purpose

This document captures architectural and technical decisions that affect multiple user stories or the entire specification. These decisions provide consistency and prevent redundant discussions.

---

## Decision 1: Profile Picture Storage and Processing

**ID**: DEC-PROF-001
**Date**: 2026-01-09
**Status**: Accepted
**Impacts**: PROF-002 (Edit Profile), PROF-003 (Upload Picture)

### Context

Users need to upload profile pictures that will be displayed throughout the application at various sizes (thumbnail, medium, full). We need to decide on the storage mechanism, processing pipeline, and serving strategy.

Current constraints:
- Rails 8.0 with ActiveStorage
- Amazon S3 for storage
- CloudFront CDN available
- Mobile users may upload large images
- Need multiple size variants

### Decision

Use ActiveStorage with S3 backend and variant processing for multiple image sizes. Implement client-side image cropping before upload to give users control over framing.

Technical approach:
- Store original images in S3 private bucket
- Generate variants on-demand using ActiveStorage variants
- Use signed URLs with CloudFront for serving
- Implement Cropper.js for client-side cropping
- Limit upload size to 10MB
- Convert all formats to WebP for efficiency

### Rationale

ActiveStorage is Rails' built-in solution and provides:
- Seamless integration with Rails models
- Automatic variant generation
- Direct upload capability
- Proven reliability in production

Client-side cropping provides better UX:
- Users see immediate preview
- Reduces server processing load
- Smaller file uploads
- User control over composition

### Consequences

**Positive**:
- Native Rails integration requires less custom code
- Automatic variant generation simplifies implementation
- CloudFront CDN provides fast global delivery
- Client-side cropping improves user experience
- WebP conversion reduces bandwidth costs

**Negative**:
- ActiveStorage adds dependency on Rails ecosystem
- Variant generation on first request causes slight delay
- Client-side cropping requires JavaScript library
- WebP not supported in very old browsers (negligible)

**Neutral**:
- Need to implement background job for large image processing
- Storage costs increase with user growth (expected)

### Alternatives Considered

#### Alternative 1: Cloudinary for Image Management

Use Cloudinary's full image management platform with CDN, processing, and transformations.

**Why not chosen**:
- Adds external service dependency and monthly costs
- Overkill for our current scale
- Can migrate later if needed
- ActiveStorage meets current requirements

#### Alternative 2: Client-Side Only Processing

Process and resize images entirely in browser before upload, store only processed version.

**Why not chosen**:
- Lose access to original high-resolution image
- Limits future flexibility (new sizes, formats)
- Browser processing inconsistent across devices
- Want to preserve original for quality

#### Alternative 3: Paperclip Gem

Use legacy Paperclip gem for file attachments.

**Why not chosen**:
- Paperclip is deprecated and unmaintained
- ActiveStorage is the modern Rails standard
- No migration path from Paperclip to future solutions

### Implementation Notes

**Setup**:
```ruby
# app/models/user.rb
has_one_attached :profile_picture do |attachable|
  attachable.variant :thumb, resize_to_limit: [100, 100]
  attachable.variant :medium, resize_to_limit: [300, 300]
  attachable.variant :large, resize_to_limit: [600, 600]
end
```

**Controller**:
- Add strong params for profile_picture
- Validate file type (image/jpeg, image/png, image/webp)
- Validate file size (max 10MB)
- Process in background job if needed

**Frontend**:
- Use Cropper.js library
- Set aspect ratio to 1:1 (square)
- Preview cropped result before upload
- Show upload progress indicator

**Storage Configuration**:
- S3 bucket: private access only
- CloudFront distribution for signed URLs
- 24-hour URL expiration
- CORS configured for direct uploads

### Related Decisions

- None yet (first decision in this spec)
```
