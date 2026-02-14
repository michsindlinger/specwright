---
description: Changelog Update Rules for Specwright
globs:
alwaysApply: false
version: 2.0
encoding: UTF-8
installation: global
---

# Changelog Update Rules

## What's New in v2.0

- **Main Agent Pattern**: Steps 2, 3, 3b, 5 executed by Main Agent directly (was: context-fetcher Sub-Agent)
- **Path fixes**: `specwright/docs/` and `specwright/bugs/` instead of `.specwright/docs/` and `.specwright/bugs/`
- **Kept**: date-checker (Utility), file-creator (Utility)

## Overview

Create or update bilingual changelogs (German and English) based on documented features in specwright/docs/ and resolved bugs in specwright/bugs/ that have been added since the last update.

<pre_flight_check>
  EXECUTE: @specwright/workflows/meta/pre-flight.md
</pre_flight_check>

<process_flow>

<step number="1" subagent="date-checker" name="current_date_and_version_determination">

### Step 1: Current Date and Version

USE: date-checker subagent
PROMPT: "Get current date in YYYY-MM-DD format"

<version_check>
  IF public/version.json exists:
    READ public/version.json
    EXTRACT version from "version" field
    USE format: [version] - YYYY-MM-DD
  ELSE:
    USE format: [YYYY-MM-DD] (date only, no version)
</version_check>

</step>

<step number="2" name="existing_changelog_analysis">

### Step 2: Analyze Existing Changelogs

Check for existing changelogs and determine last update date.

<changelog_locations>
  - specwright/docs/changelog.md (German)
  - specwright/docs/changelog-en.md (English)
</changelog_locations>

<existing_changelog_check>
  FOR each changelog_file in [changelog.md, changelog-en.md]:
    IF changelog_file_exists:
      READ changelog_file
      EXTRACT last_update_date from "Last Updated: YYYY-MM-DD" line
      STORE baseline_date for that language
    ELSE:
      SET baseline_date to null for that language
      PREPARE for new changelog creation

  USE most_recent_baseline_date from both files as reference
</existing_changelog_check>

</step>

<step number="3" name="documented_features_scan">

### Step 3: Scan Documented Features

Identify all documented features in specwright/docs/ and their creation dates.

<scan_strategy>
  <main_features>
    SCAN specwright/docs/*/feature.md files
    EXTRACT creation_date from "Created: YYYY-MM-DD" line in each file
    EXTRACT last_updated_date from "Last Updated: YYYY-MM-DD" line in each file
    EXTRACT feature_name from folder name and first header
    DETERMINE change_type based on dates and baseline comparison
  </main_features>

  <sub_features>
    SCAN specwright/docs/*/sub-features/*.md files
    EXTRACT creation_date from "Created: YYYY-MM-DD" line in each file
    EXTRACT last_updated_date from "Last Updated: YYYY-MM-DD" line in each file
    EXTRACT sub_feature_name and parent_feature from file structure
    DETERMINE change_type based on dates and baseline comparison
  </sub_features>
</scan_strategy>

<feature_data_structure>
  {
    "feature_name": "string",
    "creation_date": "YYYY-MM-DD",
    "last_updated_date": "YYYY-MM-DD|null",
    "change_type": "new|changed",
    "type": "main_feature|sub_feature",
    "parent_feature": "string (for sub_features)",
    "file_path": "string",
    "description": "string (extracted from feature overview)"
  }
</feature_data_structure>

</step>

<step number="3b" name="resolved_bugs_scan">

### Step 3b: Scan Resolved Bugs

Identify all resolved bugs in specwright/bugs/ and their resolution dates.

<bug_scan_strategy>
  <resolved_bugs>
    SCAN specwright/bugs/*/bug-report.md files
    FILTER by Status: "Resolved" or "Closed"
    EXTRACT resolution_date from "Resolved Date:" line in resolution/ files
    EXTRACT bug_title from main header
    EXTRACT bug_summary from "Summary" section
  </resolved_bugs>
</bug_scan_strategy>

<bug_data_structure>
  {
    "bug_title": "string",
    "resolution_date": "YYYY-MM-DD",
    "type": "bug_fix",
    "severity": "Critical|High|Medium|Low",
    "file_path": "string",
    "summary": "string (extracted from bug summary)",
    "solution_summary": "string (extracted from resolution)"
  }
</bug_data_structure>

</step>

<step number="4" name="content_filtering">

### Step 4: Filter Features and Bugs Since Last Update

Filter features and bugs based on their dates relative to last changelog update.

<filtering_logic>
  IF baseline_date is null:
    INCLUDE all documented features and resolved bugs
    FOR each feature:
      SET change_type = "new" (first changelog generation)
  ELSE:
    FOR each feature:
      IF feature.creation_date > baseline_date:
        SET change_type = "new"
        INCLUDE in changelog with section "Added"

      ELSE IF feature.last_updated_date EXISTS AND feature.last_updated_date > baseline_date:
        SET change_type = "changed"
        INCLUDE in changelog with section "Changed"

      ELSE IF feature.creation_date == baseline_date:
        CHECK if feature already exists in current changelog
        IF not_in_changelog:
          SET change_type = "new"
          INCLUDE in changelog with section "Added"

      ELSE IF feature.last_updated_date == baseline_date:
        CHECK if feature change already exists in current changelog
        IF not_in_changelog:
          SET change_type = "changed"
          INCLUDE in changelog with section "Changed"

    FOR each bug:
      IF bug.resolution_date > baseline_date:
        INCLUDE in resolved_bugs list with section "Fixed"
      ELSE IF bug.resolution_date == baseline_date:
        CHECK if bug already exists in current changelog
        IF not_in_changelog:
          INCLUDE in resolved_bugs list with section "Fixed"
</filtering_logic>

</step>

<step number="5" name="content_description_extraction">

### Step 5: Feature and Bug Description Extraction

Extract concise descriptions from each new feature and resolved bug for changelog entries.

<description_extraction>
  FOR each new_feature:
    READ feature.md or sub-feature.md file
    EXTRACT only the FIRST content block (## Purpose OR ## Overview)
    USE extracted English text directly for English changelog
    TRANSLATE to German for German changelog
    LIMIT both descriptions to 1-2 sentences maximum
    FOCUS on user benefit, not technical details

  FOR each resolved_bug:
    READ bug-report.md and resolution files
    EXTRACT concise description from summary and solution
    USE English text directly for English changelog
    TRANSLATE to German for German changelog
    LIMIT both descriptions to 1-2 sentences maximum
    FOCUS on user impact and fix benefit
</description_extraction>

<description_optimization>
  - Maximum 120 characters per item description (both DE and EN)
  - User-facing benefits (features), issue resolution (bugs)
  - Clear, concise, action-oriented language
  - "Fixed:" prefix for bug fixes, "Added:" prefix for new features
</description_optimization>

</step>

<step number="6" name="changelog_content_grouping">

### Step 6: Group Features and Bugs into Version Block

Group ALL new features, changed features, and resolved bugs into a SINGLE version block.

<grouping_strategy>
  CREATE single version block with current version and date:
    - Use version from public/version.json (if exists)
    - Use current date for the version block
    - Group ALL changes since last update into this ONE block

  WITHIN the single version block:
    SECTION "Added": ALL new features and sub-features (sorted alphabetically)
    SECTION "Changed": ALL updated features and sub-features (sorted alphabetically)
    SECTION "Fixed": ALL resolved bugs (sorted by severity then alphabetically)
</grouping_strategy>

</step>

<step number="7" subagent="file-creator" name="changelog_update">

### Step 7: Create or Update Bilingual Changelogs

USE: file-creator subagent

<changelog_templates>
  <german_template>
    # Changelog

    > Feature Release History & Bug Fixes
    > Last Updated: [CURRENT_DATE]

    Dieses Changelog dokumentiert alle implementierten Features und gelösten Bugs chronologisch.

    ## [VERSION] - [YYYY-MM-DD]
    ### Added
    - **[Feature-Name]**: [german_description]

    ### Changed
    - **[Parent-Feature]** > **[Sub-Feature-Name]**: [german_description]

    ### Fixed
    - **[Bug-Title]**: [german_fix_description]
  </german_template>

  <english_template>
    # Changelog

    > Feature Release History & Bug Fixes
    > Last Updated: [CURRENT_DATE]

    This changelog documents all implemented features and resolved bugs chronologically.

    ## [VERSION] - [YYYY-MM-DD]
    ### Added
    - **[Feature-Name]**: [english_description]

    ### Changed
    - **[Parent-Feature]** > **[Sub-Feature-Name]**: [english_description]

    ### Fixed
    - **[Bug-Title]**: [english_fix_description]
  </english_template>
</changelog_templates>

<update_strategy>
  FOR each language [de, en]:
    IF existing_changelog_for_language:
      UPDATE header with new Last Updated date
      INSERT single new version block at top (after header)
      PRESERVE all existing version blocks below
    ELSE:
      CREATE new changelog with appropriate language template
      ADD single version block with all documented features and resolved bugs

  IMPORTANT: Create only ONE version block per update with ALL changes since last update
</update_strategy>

<file_locations>
  - German: specwright/docs/changelog.md
  - English: specwright/docs/changelog-en.md
</file_locations>

</step>

<step number="8" name="changelog_validation">

### Step 8: Validate Bilingual Changelogs

<validation_checks>
  <content_validation>
    FOR each language [de, en]:
      - [ ] All new features included
      - [ ] All resolved bugs included
      - [ ] Descriptions are concise and user-focused
      - [ ] Dates are properly formatted
      - [ ] No duplicate entries
      - [ ] Translation quality maintained
      - [ ] Bug severity levels included
  </content_validation>

  <format_validation>
    FOR each language [de, en]:
      - [ ] Header contains correct Last Updated date
      - [ ] SINGLE version block created with current version/date
      - [ ] ALL changes in ONE block (not multiple date blocks)
      - [ ] Consistent formatting throughout
      - [ ] Sub-features properly nested under parents
      - [ ] Section order: Added > Changed > Fixed
  </format_validation>

  <cross_language_validation>
    - [ ] Both changelogs contain identical feature and bug sets
    - [ ] Descriptions convey same meaning across languages
    - [ ] No missing translations
  </cross_language_validation>
</validation_checks>

</step>

<step number="9" name="user_summary">

### Step 9: User Summary

Present summary of bilingual changelog update.

<summary_template>
  Bilingual changelogs successfully updated:

  **New features added:** [FEATURE_COUNT]
  **New sub-features added:** [SUB_FEATURE_COUNT]
  **Resolved bugs added:** [BUG_COUNT]
  **Period:** [OLDEST_NEW_DATE] to [NEWEST_NEW_DATE]

  **Added Features:**
  [LIST_OF_NEW_FEATURES_WITH_DATES]

  **Resolved Bugs:**
  [LIST_OF_RESOLVED_BUGS_WITH_DATES_AND_SEVERITY]

  **Changelog files:**
  - German: specwright/docs/changelog.md
  - English: specwright/docs/changelog-en.md

  Both changelogs are now up to date with all documented features and resolved bugs.
</summary_template>

<no_updates_scenario>
  IF no_new_features_and_no_resolved_bugs_found:
    OUTPUT: "No new features or resolved bugs found since last changelog update ([LAST_UPDATE_DATE]). Both changelogs are already up to date."
</no_updates_scenario>

</step>

</process_flow>

## Final Checklist

<verify>
  - [ ] Current date correctly determined
  - [ ] Existing changelogs analyzed
  - [ ] All documented features scanned
  - [ ] All resolved bugs scanned
  - [ ] Content since last update filtered
  - [ ] Descriptions extracted and optimized
  - [ ] Features and bugs grouped into single version block
  - [ ] Changelogs correctly updated (features + bugs)
  - [ ] Validation successful
  - [ ] User summary presented
</verify>
