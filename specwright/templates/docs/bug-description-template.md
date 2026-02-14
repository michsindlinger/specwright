# Bug Description

> Bug ID: [BUG_ID]
> Created: [CREATED_DATE]
> Status: [STATUS]
> Priority: [PRIORITY]
> Severity: [SEVERITY]

## Summary

[BUG_SUMMARY]

## Environment

- **Browser/Platform**: [BROWSER_PLATFORM]
- **OS Version**: [OS_VERSION]
- **Application Version**: [APP_VERSION]
- **User Role**: [USER_ROLE]
- **Environment**: [ENVIRONMENT]

## Steps to Reproduce

1. [STEP_1]
2. [STEP_2]
3. [STEP_3]
4. [STEP_4]

## Expected Behavior

[EXPECTED_BEHAVIOR]

## Actual Behavior

[ACTUAL_BEHAVIOR]

## Impact

**User Impact**: [USER_IMPACT_DESCRIPTION]

**Affected Users**: [AFFECTED_USER_COUNT_OR_SCOPE]

**Business Impact**: [BUSINESS_IMPACT]

**Workaround Available**: [YES_NO]
[WORKAROUND_DESCRIPTION]

## Evidence

### Screenshots

[SCREENSHOT_LINKS_OR_DESCRIPTIONS]

### Error Messages

```
[ERROR_MESSAGE_TEXT]
```

### Console Logs

```
[CONSOLE_LOG_OUTPUT]
```

### Server Logs

```
[SERVER_LOG_OUTPUT]
```

## Technical Context

**Affected Component**: [COMPONENT_NAME]

**Related Code**: [FILE_PATHS_OR_COMPONENTS]

**Recent Changes**: [RECENT_CHANGES_OR_COMMITS]

**Database State**: [RELEVANT_DB_STATE]

## Root Cause Analysis

[ROOT_CAUSE_DESCRIPTION]

## Proposed Fix

[FIX_DESCRIPTION]

**Estimated Effort**: [EFFORT_ESTIMATE]

**Risk Assessment**: [RISK_LEVEL_AND_DESCRIPTION]

## Testing Requirements

- [ ] [TEST_REQUIREMENT_1]
- [ ] [TEST_REQUIREMENT_2]
- [ ] [TEST_REQUIREMENT_3]
- [ ] [TEST_REQUIREMENT_4]

## Related Issues

- [RELATED_ISSUE_1]
- [RELATED_ISSUE_2]

## Timeline

- **Reported**: [REPORTED_DATE]
- **Triaged**: [TRIAGED_DATE]
- **Started**: [STARTED_DATE]
- **Fixed**: [FIXED_DATE]
- **Deployed**: [DEPLOYED_DATE]
- **Verified**: [VERIFIED_DATE]

---

## Template Usage Instructions

### Placeholders

**Header Information**:
- `[BUG_ID]`: Unique identifier (e.g., BUG-123, JIRA-456)
- `[CREATED_DATE]`: ISO date format (YYYY-MM-DD)
- `[STATUS]`: New, In Progress, Testing, Resolved, Closed, Reopened
- `[PRIORITY]`: Critical, High, Medium, Low
- `[SEVERITY]`: Blocker, Major, Minor, Trivial

**Summary & Environment**:
- `[BUG_SUMMARY]`: One-sentence description of the issue
- `[BROWSER_PLATFORM]`: Chrome 120, Safari 17, Firefox 121, iOS 17.2, etc.
- `[OS_VERSION]`: macOS 14.2, Windows 11, Ubuntu 22.04, etc.
- `[APP_VERSION]`: Release version or commit SHA
- `[USER_ROLE]`: Admin, User, Guest, etc.
- `[ENVIRONMENT]`: Production, Staging, Development, Local

**Reproduction & Behavior**:
- `[STEP_1-4]`: Specific, repeatable steps
- `[EXPECTED_BEHAVIOR]`: What should happen
- `[ACTUAL_BEHAVIOR]`: What actually happens

**Impact Assessment**:
- `[USER_IMPACT_DESCRIPTION]`: How users are affected
- `[AFFECTED_USER_COUNT_OR_SCOPE]`: All users, 10% of users, Admin users only, etc.
- `[BUSINESS_IMPACT]`: Revenue loss, support load, reputation, etc.
- `[YES_NO]`: Whether workaround exists
- `[WORKAROUND_DESCRIPTION]`: Temporary solution if available

**Evidence**:
- `[SCREENSHOT_LINKS_OR_DESCRIPTIONS]`: Visual proof
- `[ERROR_MESSAGE_TEXT]`: Exact error text
- `[CONSOLE_LOG_OUTPUT]`: Browser console output
- `[SERVER_LOG_OUTPUT]`: Server-side logs

**Technical Details**:
- `[COMPONENT_NAME]`: Module, service, or feature affected
- `[FILE_PATHS_OR_COMPONENTS]`: Specific files involved
- `[RECENT_CHANGES_OR_COMMITS]`: Recent deployments or changes
- `[RELEVANT_DB_STATE]`: Database conditions related to bug

**Resolution**:
- `[ROOT_CAUSE_DESCRIPTION]`: Why the bug occurred
- `[FIX_DESCRIPTION]`: How to resolve the issue
- `[EFFORT_ESTIMATE]`: Time to fix
- `[RISK_LEVEL_AND_DESCRIPTION]`: Risk of the fix
- `[TEST_REQUIREMENT_1-4]`: What must be tested

**Timeline**:
- `[REPORTED_DATE]`: When first reported
- `[TRIAGED_DATE]`: When prioritized
- `[STARTED_DATE]`: When work began
- `[FIXED_DATE]`: When fix completed
- `[DEPLOYED_DATE]`: When deployed to production
- `[VERIFIED_DATE]`: When fix confirmed working

### Priority Guidelines

**Critical**: Application down, data loss, security breach
**High**: Major functionality broken, many users affected
**Medium**: Feature broken, workaround available
**Low**: Minor issue, cosmetic problem

### Severity Guidelines

**Blocker**: Prevents release or critical function
**Major**: Significant feature impairment
**Minor**: Small feature problem
**Trivial**: Cosmetic or minimal impact

### Example

```markdown
# Bug Description

> Bug ID: BUG-142
> Created: 2026-01-09
> Status: In Progress
> Priority: High
> Severity: Major

## Summary

Profile picture upload fails silently when image exceeds 10MB, leaving users with no feedback.

## Environment

- **Browser/Platform**: Chrome 120.0.6099.109
- **OS Version**: macOS 14.2.1
- **Application Version**: v2.4.1 (commit: a7f3d92)
- **User Role**: Registered User
- **Environment**: Production

## Steps to Reproduce

1. Log in as a registered user
2. Navigate to Profile Settings page
3. Click "Upload Profile Picture" button
4. Select an image file larger than 10MB (e.g., high-res DSLR photo)
5. Click "Save Changes"

## Expected Behavior

User should see an error message: "Profile picture must be smaller than 10MB. Please choose a smaller image or compress your file."

Upload button should be disabled until valid file selected.

## Actual Behavior

Upload appears to succeed (spinner shows briefly) but no picture is saved. No error message displayed. Page refreshes and old profile picture (or default avatar) still shown.

User is confused about what happened.

## Impact

**User Impact**: Users unable to upload high-quality profile pictures, leading to frustration and support tickets. No feedback makes users think system is broken.

**Affected Users**: Approximately 15% of users attempting uploads (based on logs showing ~200 failed uploads per day)

**Business Impact**:
- Increased support tickets (12 in last week)
- Poor user experience
- Incomplete profiles reduce platform engagement

**Workaround Available**: Yes
Users can manually compress images before upload using external tools, but most users don't know to do this.

## Evidence

### Screenshots

- Screenshot 1: Upload dialog with large file selected (no warnings shown)
- Screenshot 2: Profile page after "successful" upload (no change visible)

### Error Messages

No error message shown in UI.

### Console Logs

```
ProfilePictureUploader: File size validation failed
Upload aborted: File size 15728640 bytes exceeds limit 10485760 bytes
```

### Server Logs

```
[2026-01-09 14:23:41] WARN -- : ActiveStorage::FileUploadError: File size exceeds limit
[2026-01-09 14:23:41] INFO -- : Upload rejected for user_id: 1247, file_size: 15728640
```

## Technical Context

**Affected Component**: Profile Picture Upload (ProfilesController, ActiveStorage)

**Related Code**:
- `app/controllers/profiles_controller.rb#update`
- `app/models/user.rb` (profile_picture attachment validation)
- `app/javascript/components/ProfilePictureUploader.jsx`

**Recent Changes**:
- v2.4.0 (2026-01-05): Added file size validation to prevent large uploads
- Validation works but error not propagated to frontend

**Database State**:
- User records show null profile_picture_attachment when upload fails
- No temp files created (validation happens before upload)

## Root Cause Analysis

File size validation added in backend (User model) correctly rejects files over 10MB, but the validation error is not being sent back to the frontend.

The React component assumes any non-200 response is a network error and doesn't display validation messages. The backend returns 422 (Unprocessable Entity) but with an empty error message in the expected JSON format.

Missing: Error serialization in controller and error handling in frontend component.

## Proposed Fix

**Backend**:
1. Update ProfilesController#update to properly serialize validation errors
2. Return structured JSON: `{ errors: { profile_picture: ["must be smaller than 10MB"] } }`

**Frontend**:
1. Update ProfilePictureUploader to handle 422 responses
2. Display validation errors to user
3. Add client-side file size check for immediate feedback (before upload attempt)

**Estimated Effort**: 3 hours

**Risk Assessment**: Low risk
- Changes isolated to upload flow
- Existing validation logic unchanged (just exposing errors)
- Client-side validation is additive

## Testing Requirements

- [ ] Upload file exactly at 10MB limit (should succeed)
- [ ] Upload file at 10MB + 1 byte (should fail with clear message)
- [ ] Upload file at 15MB (should fail with clear message)
- [ ] Upload valid file under 5MB (should succeed)
- [ ] Test with different image formats (JPG, PNG, WebP)
- [ ] Test on mobile devices
- [ ] Verify error message clears when valid file selected
- [ ] Test with slow network connection

## Related Issues

- BUG-127: Similar validation issue with bio text length
- FEATURE-56: File upload progress indicator (would improve UX here)

## Timeline

- **Reported**: 2026-01-08
- **Triaged**: 2026-01-08
- **Started**: 2026-01-09
- **Fixed**: [TBD]
- **Deployed**: [TBD]
- **Verified**: [TBD]
```
