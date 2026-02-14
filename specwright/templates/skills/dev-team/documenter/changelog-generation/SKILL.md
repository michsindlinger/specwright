# Changelog Generation Skill

> Skill: changelog-generation
> Created: 2026-01-09
> Agent: documenter
> Category: Documentation

## Purpose

Generate CHANGELOG.md entries following the Keep a Changelog format. Creates clear, user-facing descriptions of changes organized by version and change type.

## When to Activate

**Trigger Conditions:**
- After story completion and feature merge
- Before release/deployment
- When documenter agent needs to document changes
- After bug fixes or feature updates

**Activation Pattern:**
```
When: Story marked complete AND code merged
Then: Generate changelog entry for version
```

## Core Capabilities

### 1. Change Classification
- Automatically categorize changes into:
  - **Added** - New features
  - **Changed** - Changes to existing functionality
  - **Deprecated** - Soon-to-be removed features
  - **Removed** - Removed features
  - **Fixed** - Bug fixes
  - **Security** - Security vulnerability fixes

### 2. Version Management
- Follow Semantic Versioning (MAJOR.MINOR.PATCH)
- Link versions to release dates
- Maintain chronological order (newest first)
- Support unreleased changes section

### 3. Entry Generation
- Convert technical commits to user-facing language
- Link to issue/PR numbers
- Highlight breaking changes
- Group related changes together

## [TECH_STACK_SPECIFIC] Sections

### Ruby on Rails Projects
```markdown
## Integration Points
- Parse git commit history: `git log --pretty=format:"%s"`
- Extract version from: `config/version.rb` or Git tags
- Link to PRs via GitHub API
- Reference issues from commit messages

## Rails-Specific Categories
- **Migration** - Database schema changes
- **Dependency** - Gem updates
- **Performance** - Query optimizations, caching
```

### Node.js Projects
```markdown
## Integration Points
- Parse git commit history
- Extract version from: `package.json`
- Link to PRs via GitHub API
- Follow Conventional Commits format

## Node-Specific Categories
- **Dependency** - npm package updates
- **Build** - Build tool or pipeline changes
- **CI/CD** - Continuous integration updates
```

### API Projects
```markdown
## Integration Points
- Track API version changes
- Document endpoint modifications
- Note breaking API changes
- Reference API specification updates

## API-Specific Categories
- **Endpoint** - New or modified endpoints
- **Breaking** - Breaking API changes
- **Response** - Response format changes
```

## Tools Required

### Primary Tools
- **nn__documentation-generator** - Format changelog entries

### MCP Servers
[MCP_TOOLS]
<!-- Populated during skill creation based on:
     1. User's installed MCP servers
     2. User's selection for this skill

     Recommended for this skill (examples):
     - mcp__git-integration - Access commit history
     - mcp__github-api - Link PRs and issues
     - mcp__jira-integration - Link to Jira tickets

     Note: Skills work without MCP servers, but functionality may be limited
-->

## Quality Checklist

**Before Generating:**
- [ ] All changes since last version identified
- [ ] Git tags verified for version numbers
- [ ] PRs/issues linked correctly
- [ ] Breaking changes flagged

**Entry Quality:**
- [ ] User-facing language (no technical jargon)
- [ ] Changes categorized correctly
- [ ] Chronological order maintained
- [ ] Date format: YYYY-MM-DD
- [ ] Links functional (PRs, issues, commits)
- [ ] Breaking changes prominently noted

**Format Compliance:**
- [ ] Follows Keep a Changelog format
- [ ] Semantic versioning used
- [ ] Unreleased section present (if applicable)
- [ ] Comparison links included

## Documentation Examples

### Complete Changelog Structure
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- User profile avatar upload functionality
- Email notification preferences

### Changed
- Improved dashboard loading performance

## [1.2.0] - 2026-01-09

### Added
- OAuth2 authentication support (#123)
- Two-factor authentication via SMS (#145)
- Password strength indicator on signup

### Changed
- Updated user session timeout to 24 hours (#156)
- Improved error messages for login failures

### Fixed
- Fixed password reset email not sending (#178)
- Resolved session persistence issue on mobile browsers (#182)

### Security
- Patched XSS vulnerability in user comments (#190)

## [1.1.0] - 2025-12-15

### Added
- User dashboard with activity timeline
- Export user data to CSV

### Deprecated
- Legacy API v1 endpoints (will be removed in 2.0.0)

## [1.0.0] - 2025-11-01

### Added
- Initial release
- User registration and authentication
- Profile management
- Basic dashboard

[Unreleased]: https://github.com/user/repo/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/user/repo/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/user/repo/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/user/repo/releases/tag/v1.0.0
```

### Single Version Entry
```markdown
## [2.0.0] - 2026-01-15

### Added
- **BREAKING**: New API v2 with GraphQL support (#200)
- Real-time notifications via WebSocket (#210)
- Multi-language support (EN, DE, FR, ES) (#215)

### Changed
- **BREAKING**: User authentication now requires email verification (#220)
- Redesigned dashboard UI with improved navigation (#225)
- Database query optimization reducing load times by 40% (#230)

### Deprecated
- REST API v1 endpoints (use GraphQL API v2)
- Legacy user session format

### Removed
- **BREAKING**: Removed deprecated `/api/v0` endpoints
- Legacy CSV export format

### Fixed
- Fixed memory leak in background job processor (#245)
- Resolved timezone display issue in activity logs (#250)
- Fixed duplicate notification bug (#255)

### Security
- Updated Rails to 8.0.1 for security patches
- Implemented rate limiting on API endpoints (#260)
- Enhanced password encryption algorithm (#265)
```

### Migration Note Example
```markdown
## [2.0.0] - 2026-01-15

### Migration Notes

**Breaking Changes:**
This release includes breaking changes. Please review before upgrading.

1. **API v2 Migration**: All API clients must migrate to GraphQL endpoints
   - Old: `GET /api/v1/users/:id`
   - New: GraphQL query `user(id: $id)`
   - See migration guide: docs/api-v2-migration.md

2. **Email Verification Required**: Existing users must verify emails
   - Run migration: `rails db:migrate`
   - Send verification emails: `rails users:send_verification`

3. **Session Format Change**: Users will be logged out on upgrade
   - No action required
   - Users must log in again after deployment
```

## Format Guidelines

### Keep a Changelog Standards

**Version Headers:**
```markdown
## [VERSION] - YYYY-MM-DD
```

**Category Order:**
1. Added
2. Changed
3. Deprecated
4. Removed
5. Fixed
6. Security

**Entry Format:**
```markdown
- Brief description of change (#PR-number)
- Another change with @username credit (#PR-number)
```

**Breaking Changes:**
```markdown
- **BREAKING**: Description of breaking change (#PR-number)
```

**Comparison Links:**
```markdown
[VERSION]: https://github.com/user/repo/compare/vPREV...vCURRENT
```

### Writing Style

**DO:**
- Use present tense: "Add feature" not "Added feature"
- Start with verb: "Add", "Fix", "Update", "Remove"
- Be specific: "Fix login timeout issue" not "Fix bug"
- Include PR/issue numbers: (#123)
- Credit contributors when appropriate: @username
- Highlight breaking changes: **BREAKING**

**DON'T:**
- Use technical jargon: "Refactored UserService" → "Improved user management performance"
- Include commit hashes in entries (use PR numbers)
- Add developer-only changes (unless significant)
- Duplicate entries across categories

### Version Numbering

**Semantic Versioning:**
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backwards compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backwards compatible

**Pre-release:**
- Alpha: 1.0.0-alpha.1
- Beta: 1.0.0-beta.1
- RC: 1.0.0-rc.1

## Integration Examples

### From Git Commits
```bash
# Extract commits since last tag
git log v1.1.0..HEAD --pretty=format:"%s"

# Convert to changelog entries
feat: Add OAuth2 support (#123)        → Added - OAuth2 authentication support (#123)
fix: Resolve login timeout (#178)      → Fixed - Fixed login timeout issue (#178)
chore: Update dependencies             → [Skip - internal change]
```

### From GitHub PRs
```json
{
  "pr_number": 123,
  "title": "Add OAuth2 authentication support",
  "labels": ["feature", "authentication"],
  "merged_at": "2026-01-09"
}
```

Converts to:
```markdown
### Added
- OAuth2 authentication support (#123)
```

### From Jira Issues
```
PROJ-456: Implement two-factor authentication
Type: Story
Status: Done
```

Converts to:
```markdown
### Added
- Two-factor authentication via SMS (PROJ-456)
```

## Automation Workflow

```
1. Story Completed
   ↓
2. Extract Changes
   - Git commits since last release
   - Merged PRs
   - Closed issues
   ↓
3. Categorize Changes
   - Parse commit messages
   - Analyze PR labels
   - Group related changes
   ↓
4. Generate Entry
   - Format according to Keep a Changelog
   - Add to [Unreleased] section
   - Link PRs and issues
   ↓
5. Review & Update
   - Verify categorization
   - Improve descriptions
   - Flag breaking changes
   ↓
6. On Release
   - Move [Unreleased] to [VERSION]
   - Add release date
   - Create comparison link
```

## Best Practices

1. **Update Continuously**: Add to [Unreleased] as changes merge
2. **User Perspective**: Write for end users, not developers
3. **Be Specific**: "Fix login timeout" not "Fix issue"
4. **Link Everything**: PRs, issues, commits, contributors
5. **Flag Breaking Changes**: Use **BREAKING** prefix prominently
6. **Group Related**: Combine related changes into single entry
7. **Provide Context**: Add migration notes for major changes
8. **Maintain History**: Never delete old entries, only add new ones

---

**Remember:** The changelog is for users to understand what changed and why it matters to them. Focus on impact, not implementation.
