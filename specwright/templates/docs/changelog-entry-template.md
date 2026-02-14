# CHANGELOG Entry Template

## Version [VERSION_NUMBER] - [RELEASE_DATE]

### [CHANGE_TYPE]

- [CHANGE_DESCRIPTION] ([#ISSUE_NUMBER])

---

## Template Usage Instructions

### Placeholders

- `[VERSION_NUMBER]`: Semantic version (e.g., 1.2.0, 2.0.0-beta.1)
- `[RELEASE_DATE]`: ISO date format (YYYY-MM-DD)
- `[CHANGE_TYPE]`: Category of change (see below)
- `[CHANGE_DESCRIPTION]`: Brief, user-focused description
- `[#ISSUE_NUMBER]`: Reference to issue, PR, or story ID

### Change Types

Use these standard categories in order:

1. **Added**: New features or capabilities
2. **Changed**: Changes to existing functionality
3. **Deprecated**: Features marked for removal in future versions
4. **Removed**: Features removed in this version
5. **Fixed**: Bug fixes
6. **Security**: Security improvements or vulnerability fixes

### Writing Guidelines

**Good Changelog Entries**:
- Focus on user impact, not implementation details
- Use active voice and present tense
- Start with a verb (Added, Fixed, Updated, etc.)
- Be specific but concise
- Include issue/PR reference

**Examples**:

Good:
```markdown
- Added ability to crop profile pictures before upload (#PROF-003)
- Fixed profile picture upload failing silently for files over 10MB (#BUG-142)
- Changed email verification to expire after 24 hours instead of 7 days (#PROF-002)
```

Bad:
```markdown
- Updated code
- Bug fixes
- Refactored ProfileController
```

### Semantic Versioning

Follow semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes, incompatible API changes
- **MINOR** (1.1.0 → 1.2.0): New features, backward-compatible
- **PATCH** (1.1.1 → 1.1.2): Bug fixes, backward-compatible

**Pre-release versions**:
- Alpha: 1.0.0-alpha.1
- Beta: 1.0.0-beta.1
- Release Candidate: 1.0.0-rc.1

### Full Example

```markdown
# CHANGELOG Entry Template

## Version 2.1.0 - 2026-01-15

### Added

- Added privacy settings allowing users to control profile visibility (#PROF-005)
- Added profile picture upload with client-side cropping (#PROF-003)
- Added email verification for profile email changes (#PROF-002)
- Added notification preferences management (#PROF-004)

### Changed

- Changed profile edit form to use optimistic UI updates for better responsiveness (#PROF-002)
- Updated profile page layout to be mobile-responsive (#PROF-001)

### Fixed

- Fixed profile picture upload failing silently when file exceeds 10MB (#BUG-142)
- Fixed profile bio text not wrapping properly on mobile devices (#BUG-145)
- Fixed concurrent profile edits causing data loss (#BUG-148)

### Security

- Added rate limiting to email verification requests to prevent abuse (#SEC-023)

---

## Version 2.0.1 - 2026-01-10

### Fixed

- Fixed critical bug causing profile updates to fail for users with non-ASCII characters in names (#BUG-139)
- Fixed profile picture variants not generating correctly for PNG images (#BUG-141)

---

## Version 2.0.0 - 2026-01-09

### Added

- Added complete user profile management system (#PROF-001, #PROF-002)
- Added real-time form validation for profile fields (#PROF-002)

### Changed

- **BREAKING**: Changed profile API endpoint from `/users/:id/profile` to `/api/profiles/:id` (#PROF-002)
- **BREAKING**: Changed profile picture storage from local filesystem to S3 (#PROF-003)

### Removed

- **BREAKING**: Removed deprecated `/profile/update` endpoint (use `/api/profiles/:id` instead) (#PROF-002)

### Security

- Added authentication requirement for all profile endpoints (#PROF-002)
```

### Integration with Specwright

When completing a story or spec, add entries to the project's CHANGELOG.md file:

**For Individual Stories**:
```markdown
### Added
- Added [feature description] ([#STORY_ID])
```

**For Completed Specs**:
Group all stories from the spec under appropriate categories:
```markdown
### Added
- Added [feature 1] ([#STORY_1])
- Added [feature 2] ([#STORY_2])

### Fixed
- Fixed [bug 1] ([#BUG_ID])
```

**Version Bumping**:
- Feature spec complete → Minor version bump
- Bug fixes only → Patch version bump
- Breaking changes → Major version bump

### Changelog File Structure

Maintain chronological order with newest entries at the top:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Features in development but not yet released

## [2.1.0] - 2026-01-15

[Version details...]

## [2.0.1] - 2026-01-10

[Version details...]

## [2.0.0] - 2026-01-09

[Version details...]

[Older versions...]
```

### Unreleased Section

Maintain an `[Unreleased]` section at the top for changes merged but not yet released:

```markdown
## [Unreleased]

### Added
- Added privacy settings UI (#PROF-005)

### Fixed
- Fixed email verification token expiration bug (#BUG-150)
```

When releasing, move unreleased changes to a new version section:

```markdown
## [2.2.0] - 2026-01-20

### Added
- Added privacy settings UI (#PROF-005)

### Fixed
- Fixed email verification token expiration bug (#BUG-150)

## [Unreleased]

(empty - ready for next changes)
```

### Best Practices

1. **Update Continuously**: Add changelog entries as PRs are merged, not at release time
2. **User Focus**: Write for end users, not developers (unless developer-facing tool)
3. **Link Everything**: Reference issues, PRs, and stories
4. **Group Related Changes**: Combine related changes in one entry when appropriate
5. **Highlight Breaking Changes**: Mark breaking changes clearly with **BREAKING**
6. **Security First**: Always list security fixes prominently
7. **Keep History**: Never delete old changelog entries
8. **Date Format**: Always use YYYY-MM-DD for consistency and sortability
