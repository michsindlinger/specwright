# Research Questions Template

Use these question categories to clarify requirements during the research phase.

## Technical Scope Questions

### Functionality
- What are the core functions this feature must provide?
- What are optional/nice-to-have functions?
- Are there any edge cases to consider?
- What should happen when errors occur?

### Data & Storage
- What data needs to be stored?
- What data format is expected?
- Are there data retention requirements?
- What are the data validation rules?

### Performance
- What are the performance requirements?
- How many concurrent users/requests?
- Are there response time requirements?
- Should operations be synchronous or asynchronous?

### Integration
- Which existing services/components should this integrate with?
- Are there external APIs to integrate?
- What authentication/authorization is required?
- Are there webhook or event requirements?

## User Experience Questions

### UI/UX
- Where should this feature be accessible in the UI?
- What user interactions are required?
- What feedback should users receive?
- Are there accessibility requirements?

### User Flow
- What is the step-by-step user journey?
- What happens on success?
- What happens on failure?
- Can users undo/rollback actions?

### Visual Design
- Are there mockups or wireframes available?
- What is the visual style (matches existing components)?
- Are there responsive design requirements?
- What states need to be visualized (loading, error, success)?

## Business Logic Questions

### Rules & Validation
- What business rules apply?
- What validation is required?
- Are there conditional behaviors?
- What are the constraints and limits?

### Permissions
- Who can access this feature?
- Are there role-based restrictions?
- What data privacy considerations exist?
- Are there audit/logging requirements?

### Workflows
- What is the complete business workflow?
- Are there approval processes?
- Are there notification requirements?
- What triggers this feature?

## Technical Implementation Questions

### Architecture
- Should this be a new service or extend existing?
- What design patterns are appropriate?
- How should errors be handled?
- What logging is needed?

### Data Model
- What database tables/collections are needed?
- What relationships exist?
- What indexes are needed for performance?
- Are migrations backward compatible?

### API Design
- What endpoints are needed?
- What request/response formats?
- What HTTP methods?
- What status codes for different scenarios?

### Testing
- What test scenarios are critical?
- What edge cases need testing?
- Are integration tests needed?
- What is the acceptance criteria?

## Format for Asking Questions

When asking questions, use this format:

```markdown
## [Category]

**Q1: [Question]**
- [ ] Option A - [Description]
- [ ] Option B - [Description]
- [ ] Option C - [Description]
- [ ] Other: [Text input]

**Q2: [Question]**
[Open-ended answer expected]

**Q3: [Multiple choice question]**
Select all that apply:
- [ ] Option A
- [ ] Option B
- [ ] Option C
```

## Example Research Session

```markdown
## Technical Scope

**Q1: What export formats should be supported?**
- [x] PDF
- [x] Excel
- [ ] CSV
- [ ] JSON

**Q2: Should exports be generated synchronously or asynchronously?**
- [ ] Synchronous (immediate download, user waits)
- [x] Asynchronous for large exports (>50 items)
- [ ] Always asynchronous (background job)

**Answer**: Use synchronous for small exports, async for large ones

**Q3: What are the performance requirements?**
Maximum generation time: 30 seconds
Maximum file size: 50MB
Concurrent exports per user: 5

## Integration

**Q4: Should we reuse existing export functionality?**
Yes, I found `ReportExporter.java` that uses iText for PDFs.
We should extend this service for invoice exports.

**Q5: Where should exported files be stored?**
- [ ] Local filesystem
- [x] AWS S3 with signed URLs
- [ ] Database as BLOB

**Answer**: Use existing S3UploadService, files expire after 24 hours
```

## Priority Levels

**Must Ask:**
- Core functionality scope
- Data model requirements
- Integration points
- Security/permissions

**Should Ask:**
- Performance requirements
- Error handling preferences
- UI/UX details
- Testing priorities

**Nice to Ask:**
- Edge case handling
- Future extensibility
- Monitoring/logging
- Documentation preferences
