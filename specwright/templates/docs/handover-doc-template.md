# Handover Document

> From Story: [SOURCE_STORY_ID] - [SOURCE_STORY_TITLE]
> To Story: [TARGET_STORY_ID] - [TARGET_STORY_TITLE]
> Created: [CREATED_DATE]
> Handover Type: [HANDOVER_TYPE]

## Purpose

This document provides all necessary information for the [TARGET_STORY_TITLE] team to begin work based on the completion of [SOURCE_STORY_TITLE].

---

## Completed Work Summary

### What Was Delivered

[DELIVERABLE_SUMMARY]

### Key Accomplishments

- [ACCOMPLISHMENT_1]
- [ACCOMPLISHMENT_2]
- [ACCOMPLISHMENT_3]

### Changed Scope

[SCOPE_CHANGES_DESCRIPTION]

---

## Technical Handover

### Code Changes

**Files Added**:
- [FILE_PATH_1] - [DESCRIPTION_1]
- [FILE_PATH_2] - [DESCRIPTION_2]

**Files Modified**:
- [FILE_PATH_3] - [DESCRIPTION_3]
- [FILE_PATH_4] - [DESCRIPTION_4]

**Files Deleted**:
- [FILE_PATH_5] - [REASON_5]

### Architecture Changes

[ARCHITECTURE_DESCRIPTION]

**New Components**:
- [COMPONENT_1]: [PURPOSE_1]
- [COMPONENT_2]: [PURPOSE_2]

**Modified Components**:
- [COMPONENT_3]: [CHANGES_3]

### Database Changes

**New Tables**:
```sql
[TABLE_SCHEMA_1]
```

**Modified Tables**:
```sql
[TABLE_MIGRATION_1]
```

**Indexes Added**:
- [INDEX_1]
- [INDEX_2]

### API Changes

**New Endpoints**:
- `[METHOD] [ENDPOINT_PATH]` - [DESCRIPTION]
  - Parameters: [PARAMS]
  - Response: [RESPONSE_FORMAT]

**Modified Endpoints**:
- `[METHOD] [ENDPOINT_PATH]` - [CHANGES]

**Deprecated Endpoints**:
- `[METHOD] [ENDPOINT_PATH]` - [DEPRECATION_REASON]

---

## What's Available for Next Story

### Reusable Components

- **[COMPONENT_NAME]**: [LOCATION] - [USAGE_DESCRIPTION]
- **[COMPONENT_NAME]**: [LOCATION] - [USAGE_DESCRIPTION]

### Utility Functions

- **[FUNCTION_NAME]**: [LOCATION] - [PURPOSE]
  ```[LANGUAGE]
  [USAGE_EXAMPLE]
  ```

### Services/APIs

- **[SERVICE_NAME]**: [ENDPOINT] - [CAPABILITIES]
  - Authentication: [AUTH_METHOD]
  - Rate Limits: [RATE_LIMITS]
  - Example Usage: [EXAMPLE]

### Configuration

**Environment Variables Added**:
- `[ENV_VAR_1]`: [DESCRIPTION_1]
- `[ENV_VAR_2]`: [DESCRIPTION_2]

**Feature Flags**:
- `[FLAG_1]`: [STATUS] - [PURPOSE]

---

## Integration Points

### How to Integrate

[INTEGRATION_INSTRUCTIONS]

### Required Dependencies

**Frontend**:
- [DEPENDENCY_1] - [VERSION] - [REASON]
- [DEPENDENCY_2] - [VERSION] - [REASON]

**Backend**:
- [DEPENDENCY_3] - [VERSION] - [REASON]

### Authentication/Authorization

[AUTH_REQUIREMENTS]

**Required Permissions**:
- [PERMISSION_1]
- [PERMISSION_2]

---

## Known Issues & Limitations

### Current Limitations

- [LIMITATION_1]
- [LIMITATION_2]

### Known Bugs

- **[BUG_ID]**: [BUG_DESCRIPTION] - [STATUS]
- **[BUG_ID]**: [BUG_DESCRIPTION] - [STATUS]

### Technical Debt

- [DEBT_ITEM_1] - [PRIORITY] - [RATIONALE]
- [DEBT_ITEM_2] - [PRIORITY] - [RATIONALE]

### Edge Cases to Consider

- [EDGE_CASE_1]
- [EDGE_CASE_2]

---

## Testing Information

### Test Coverage

**Unit Tests**: [COVERAGE_PERCENTAGE]%
- Location: [TEST_DIRECTORY]
- Key test files: [TEST_FILES]

**Integration Tests**: [COVERAGE_PERCENTAGE]%
- Location: [TEST_DIRECTORY]

**E2E Tests**: [STATUS]
- Location: [TEST_DIRECTORY]

### Test Data

**Fixtures Available**:
- [FIXTURE_1]: [DESCRIPTION]
- [FIXTURE_2]: [DESCRIPTION]

**Test Accounts**:
- [ACCOUNT_TYPE_1]: [CREDENTIALS_LOCATION]
- [ACCOUNT_TYPE_2]: [CREDENTIALS_LOCATION]

### How to Run Tests

```bash
[TEST_COMMAND_1]
[TEST_COMMAND_2]
```

---

## Documentation

### Updated Documentation

- [DOC_LOCATION_1]: [WHAT_WAS_UPDATED]
- [DOC_LOCATION_2]: [WHAT_WAS_UPDATED]

### Documentation Gaps

- [MISSING_DOC_1]: [REASON]
- [MISSING_DOC_2]: [REASON]

### Code Comments

Key areas with detailed comments:
- [FILE_PATH]: [COMMENT_TOPIC]
- [FILE_PATH]: [COMMENT_TOPIC]

---

## Recommendations for Next Story

### Suggested Approach

[APPROACH_RECOMMENDATION]

### Potential Pitfalls

- [PITFALL_1]: [MITIGATION]
- [PITFALL_2]: [MITIGATION]

### Performance Considerations

[PERFORMANCE_NOTES]

### Security Considerations

[SECURITY_NOTES]

---

## Open Questions

- [ ] [QUESTION_1]
- [ ] [QUESTION_2]
- [ ] [QUESTION_3]

---

## Contact Information

**Primary Contact**: [DEVELOPER_NAME] - [CONTACT_INFO]
**Backup Contact**: [DEVELOPER_NAME] - [CONTACT_INFO]
**Best Time to Reach**: [TIME_WINDOW]

---

## Appendix

### Useful Links

- Pull Request: [PR_URL]
- Design Files: [DESIGN_URL]
- Technical Spec: [SPEC_URL]
- Deployment: [DEPLOYMENT_URL]

### Additional Resources

- [RESOURCE_1]: [DESCRIPTION]
- [RESOURCE_2]: [DESCRIPTION]

---

## Template Usage Instructions

### Placeholders

**Header Information**:
- `[SOURCE_STORY_ID]`: ID of completed story
- `[SOURCE_STORY_TITLE]`: Title of completed story
- `[TARGET_STORY_ID]`: ID of dependent story
- `[TARGET_STORY_TITLE]`: Title of dependent story
- `[CREATED_DATE]`: ISO date format (YYYY-MM-DD)
- `[HANDOVER_TYPE]`: Sequential, Parallel, Integration, etc.

**Completed Work**:
- `[DELIVERABLE_SUMMARY]`: What was built
- `[ACCOMPLISHMENT_1-3]`: Key achievements
- `[SCOPE_CHANGES_DESCRIPTION]`: What changed from original plan

**Technical Details**:
- `[FILE_PATH_X]`: Path to modified files
- `[DESCRIPTION_X]`: What changed and why
- `[ARCHITECTURE_DESCRIPTION]`: System design changes
- `[COMPONENT_X]`: Component names and purposes
- `[TABLE_SCHEMA/MIGRATION]`: Database changes
- `[METHOD]`: HTTP method (GET, POST, etc.)
- `[ENDPOINT_PATH]`: API route
- `[PARAMS/RESPONSE_FORMAT]`: API specifications

**Reusable Assets**:
- `[COMPONENT_NAME]`: Shared component
- `[LOCATION]`: File path or module
- `[USAGE_DESCRIPTION]`: How to use
- `[FUNCTION_NAME]`: Utility function
- `[USAGE_EXAMPLE]`: Code example
- `[SERVICE_NAME]`: External service
- `[CAPABILITIES]`: What it can do

**Integration**:
- `[INTEGRATION_INSTRUCTIONS]`: How to connect
- `[DEPENDENCY_X]`: Required packages
- `[VERSION]`: Package version
- `[AUTH_REQUIREMENTS]`: Security needs
- `[PERMISSION_X]`: Required access levels

**Issues & Limitations**:
- `[LIMITATION_X]`: Current constraints
- `[BUG_ID]`: Bug tracking ID
- `[BUG_DESCRIPTION]`: What's wrong
- `[DEBT_ITEM_X]`: Technical debt
- `[EDGE_CASE_X]`: Scenarios to handle

**Testing**:
- `[COVERAGE_PERCENTAGE]`: Test coverage %
- `[TEST_DIRECTORY]`: Where tests live
- `[FIXTURE_X]`: Test data
- `[TEST_COMMAND_X]`: How to run tests

**Documentation & Recommendations**:
- `[DOC_LOCATION_X]`: Updated docs
- `[APPROACH_RECOMMENDATION]`: Suggested strategy
- `[PITFALL_X]`: What to watch out for
- `[PERFORMANCE/SECURITY_NOTES]`: Important considerations

**Contact & Resources**:
- `[DEVELOPER_NAME]`: Who to contact
- `[CONTACT_INFO]`: Email, Slack, etc.
- `[PR/DESIGN/SPEC/DEPLOYMENT_URL]`: Related links

### When to Create Handover Documents

Create handover docs when:
- Story has dependent stories (blocking relationship)
- Complex technical changes need explanation
- Multiple teams involved
- Significant architecture changes
- New patterns or components introduced
- Cross-team dependencies exist

### Handover Types

**Sequential**: Target story cannot start until source completes
**Parallel**: Stories can work simultaneously with coordination
**Integration**: Target story integrates source story's output
**Reference**: Target story uses source story's approach/patterns

### Best Practices

1. **Be Specific**: Provide exact file paths, function names, line numbers
2. **Include Examples**: Show code snippets, API calls, usage patterns
3. **Document Decisions**: Explain why choices were made
4. **Highlight Risks**: Call out potential issues early
5. **Make It Actionable**: Next team should know exactly what to do
6. **Keep It Current**: Update if implementation changed
7. **Be Honest**: Document limitations and technical debt

### Example

```markdown
# Handover Document

> From Story: PROF-002 - Edit Profile Information
> To Story: PROF-005 - Configure Privacy Settings
> Created: 2026-01-09
> Handover Type: Sequential

## Purpose

This document provides all necessary information for the Privacy Settings team to begin work based on the completion of Edit Profile Information. The privacy settings will control which profile fields are visible based on the editing framework established in PROF-002.

---

## Completed Work Summary

### What Was Delivered

A fully functional profile editing interface allowing users to update their name, bio, email, and phone number with real-time validation, optimistic UI updates, and email verification workflow.

### Key Accomplishments

- Built reusable form validation framework
- Implemented optimistic UI pattern for instant feedback
- Created email verification service for sensitive changes
- Established profile update API with proper authorization

### Changed Scope

Originally planned to include privacy settings, but that was split into PROF-005 to reduce story size. Email verification was added as a security requirement discovered during implementation.

---

## Technical Handover

### Code Changes

**Files Added**:
- `app/javascript/components/ProfileEditForm.jsx` - Main profile editing component
- `app/javascript/hooks/useProfileForm.js` - Form state management hook
- `app/javascript/utils/profileValidation.js` - Validation rules and helpers
- `app/controllers/api/profiles_controller.rb` - API endpoints for profile updates
- `app/services/profile_update_service.rb` - Business logic for updates
- `app/mailers/profile_verification_mailer.rb` - Email verification emails

**Files Modified**:
- `app/models/user.rb` - Added email verification tracking fields
- `db/schema.rb` - New verification fields in users table
- `config/routes.rb` - Added profile API routes

**Files Deleted**:
- None

### Architecture Changes

Introduced a form component pattern with custom hooks for complex state management. This pattern should be reused for the privacy settings form.

**New Components**:
- `ProfileEditForm`: Main form container with validation
- `FormField`: Reusable form field with validation display
- `SaveIndicator`: Optimistic UI feedback component

**Modified Components**:
- `UserProfile`: Now renders EditForm in edit mode

### Database Changes

**Modified Tables**:
```sql
-- db/migrate/20260109_add_email_verification_to_users.rb
add_column :users, :pending_email, :string
add_column :users, :email_verification_token, :string
add_column :users, :email_verification_sent_at, :datetime
add_index :users, :email_verification_token, unique: true
```

**Indexes Added**:
- `users.email_verification_token` (unique) - for fast verification lookup

### API Changes

**New Endpoints**:
- `PATCH /api/profiles/:id` - Update profile fields
  - Parameters: `{ name, bio, email, phone }`
  - Response: `{ user: {...}, verification_required: boolean }`
  - Authentication: Required (current user only)

- `POST /api/profiles/:id/verify_email` - Verify email change
  - Parameters: `{ token }`
  - Response: `{ success: boolean, message: string }`

---

## What's Available for Next Story

### Reusable Components

- **FormField**: `app/javascript/components/FormField.jsx` - Renders labeled input with validation errors, can be reused for privacy settings form
  ```jsx
  <FormField
    label="Profile Visibility"
    name="visibility"
    type="select"
    value={value}
    onChange={handleChange}
    error={errors.visibility}
  />
  ```

- **SaveIndicator**: `app/javascript/components/SaveIndicator.jsx` - Shows save status (saving, saved, error)

### Utility Functions

- **validateProfileField**: `app/javascript/utils/profileValidation.js` - Field-level validation
  ```javascript
  const error = validateProfileField('email', 'test@example.com');
  // Returns error message or null
  ```

- **useProfileForm**: `app/javascript/hooks/useProfileForm.js` - Form state management hook
  - Handles: validation, submission, optimistic updates, error handling
  - Can be extended for privacy settings form

### Services/APIs

- **ProfileUpdateService**: `app/services/profile_update_service.rb` - Handles profile updates with verification
  - Use this service for any profile modifications
  - Automatically triggers email verification when needed
  - Example:
    ```ruby
    ProfileUpdateService.new(user).update(params)
    # Returns { success:, user:, verification_required: }
    ```

### Configuration

**Environment Variables Added**:
- None (email already configured)

**Feature Flags**:
- None

---

## Integration Points

### How to Integrate

Privacy settings should use the same form component pattern and validation framework. Create a `PrivacySettingsForm` component similar to `ProfileEditForm`.

Privacy settings will need to:
1. Store privacy preferences in a new `privacy_settings` JSONB column on users table
2. Use the existing FormField and SaveIndicator components
3. Follow the same optimistic UI pattern
4. Use the ProfileUpdateService for persistence

### Required Dependencies

**Frontend**:
- React Hook Form - `^7.48.0` - Already installed, use for privacy form
- Zod - `^3.22.0` - Already installed, use for validation schema

**Backend**:
- None (all dependencies already present)

### Authentication/Authorization

Uses standard Devise authentication. Ensure `authenticate_user!` before_action in controller.

**Required Permissions**:
- User can only update their own profile
- Authorization check: `current_user.id == params[:id]`

---

## Known Issues & Limitations

### Current Limitations

- Email verification tokens expire after 24 hours (may need adjustment)
- No rate limiting on verification emails (could be abused)
- Phone number validation is basic (US format only)

### Known Bugs

- **None currently** - All acceptance criteria met

### Technical Debt

- Form validation duplicated between frontend and backend - [Medium] - Should extract to shared validation schema
- Email verification service could be generalized - [Low] - Works fine for now, but may need refactoring if we add phone verification

### Edge Cases to Consider

- User changes email multiple times before verifying (currently cancels previous verification)
- User closes browser during save (optimistic UI shows saved but may have failed)
- Concurrent updates from multiple tabs (last write wins, may need conflict resolution)

---

## Testing Information

### Test Coverage

**Unit Tests**: 94%
- Location: `spec/services/profile_update_service_spec.rb`
- Location: `spec/models/user_spec.rb`
- Key test files: Tests for validation, email verification, service logic

**Integration Tests**: 87%
- Location: `spec/requests/api/profiles_spec.rb`

**E2E Tests**: Complete
- Location: `spec/system/profile_editing_spec.rb`

### Test Data

**Fixtures Available**:
- `users.yml`: Sample users with various profile states
- `pending_verification_user`: User with pending email verification

**Test Accounts**:
- Standard user: See `spec/support/auth_helpers.rb`

### How to Run Tests

```bash
# All tests
bundle exec rspec spec/services/profile_update_service_spec.rb

# Just the new profile API tests
bundle exec rspec spec/requests/api/profiles_spec.rb

# Frontend component tests
npm test ProfileEditForm
```

---

## Documentation

### Updated Documentation

- `docs/api/profiles.md`: Added new profile update endpoints
- `docs/components/forms.md`: Added FormField and SaveIndicator docs
- Code comments in `ProfileUpdateService` explain verification flow

### Documentation Gaps

- No user-facing documentation yet (waiting for feature complete)
- Privacy settings integration not documented (will be done in PROF-005)

### Code Comments

Key areas with detailed comments:
- `app/services/profile_update_service.rb`: Email verification logic
- `app/javascript/hooks/useProfileForm.js`: Optimistic UI implementation

---

## Recommendations for Next Story

### Suggested Approach

1. Create `privacy_settings` JSONB column on users table
2. Build `PrivacySettingsForm` component using FormField components
3. Add validation for privacy option combinations
4. Use ProfileUpdateService for saving
5. Add UI to show "who can see" preview

### Potential Pitfalls

- JSONB column query performance - [Mitigation]: Add GIN index if filtering by privacy settings
- Form complexity with many options - [Mitigation]: Group settings into sections, use accordion UI

### Performance Considerations

The ProfileUpdateService already includes caching for user profiles. Privacy settings should invalidate this cache when changed. Use the existing `user.touch` approach.

### Security Considerations

Privacy settings are security-critical. Ensure:
- Settings are checked on every profile view
- Default to most restrictive option
- Audit log changes to privacy settings
- Consider adding confirmation for making profile public

---

## Open Questions

- [ ] Should privacy settings apply retroactively to existing profile views?
- [ ] Do we need granular permissions (per-field) or profile-level only?
- [ ] Should admins bypass privacy settings?

---

## Contact Information

**Primary Contact**: @developer-1 - alice@example.com (Slack: @alice)
**Backup Contact**: @tech-lead - bob@example.com (Slack: @bob)
**Best Time to Reach**: 9am-5pm PST weekdays

---

## Appendix

### Useful Links

- Pull Request: https://github.com/org/repo/pull/123
- Design Files: https://figma.com/file/xyz
- Technical Spec: @.specwright/specs/2026-01-09-user-profiles/sub-specs/technical-spec.md
- Deployment: https://staging.example.com/profile/edit

### Additional Resources

- React Hook Form docs: https://react-hook-form.com/
- Email verification pattern: Internal wiki article on verification flows
```
