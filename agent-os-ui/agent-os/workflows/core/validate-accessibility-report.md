---
title: Validate Accessibility Report
version: 1.0.0
category: Quality Assurance
description: Validates WCAG 2.1 AA accessibility audit reports by sampling violations on the live website
author: Agent OS Team
created: 2026-01-26
updated: 2026-01-26
tags:
  - accessibility
  - wcag
  - validation
  - qa
---

# Validate Accessibility Report

## Purpose
Validates the accuracy of WCAG 2.1 AA accessibility audit reports by:
1. Reading the accessibility report (PDF format)
2. Fetching the live website
3. Randomly sampling violations per WCAG category
4. Verifying if reported violations are accurate
5. Providing a validation summary with findings

## Workflow Steps

### Step 1: Read and Parse Report
**Action**: Read the provided PDF accessibility report

**Instructions**:
- Use the Read tool to load the PDF report
- Extract key information:
  - Target URL
  - Total number of violations
  - List of all WCAG criteria with violations
  - For each violation: SC number, severity, description, CSS selector
- Group violations by WCAG Success Criterion (SC)

**Output**: Structured list of violations grouped by WCAG criterion

---

### Step 2: Fetch Live Website
**Action**: Retrieve the current state of the website

**Instructions**:
- Use WebFetch to load the URL from the report
- Prompt: "Extract the complete HTML structure, focusing on accessibility-relevant elements (headings, landmarks, images, links, forms, ARIA attributes, IDs, color contrast information)"
- Store the fetched content for validation

**Output**: Current website HTML and accessibility structure

---

### Step 3: Sample Violations by Category
**Action**: Select violations to validate (minimum 3 per WCAG criterion)

**Instructions**:
- For each WCAG Success Criterion that has violations:
  - If ≤3 violations: validate all
  - If >3 violations: randomly select 3 violations
- Prioritize CRITICAL and HIGH severity violations
- Ensure coverage across different violation types

**Output**: List of selected violations for validation (~20-30 samples total)

---

### Step 4: Validate Each Sampled Violation
**Action**: Check if the reported violation exists on the live website

**Instructions**:
For each sampled violation:
1. Locate the element using the CSS selector from the report
2. Verify the violation description against actual HTML
3. Check if the WCAG criterion is indeed violated
4. Assign status:
   - ✓ **Korrekt**: Violation confirmed as reported
   - ✗ **Nicht bestätigt**: Violation not found or incorrect
   - ? **Unklar**: Cannot verify (element not found, dynamic content, etc.)
5. Provide brief reasoning (1-2 sentences)

**Validation Examples**:
- **SC 1.1.1 (Non-text Content)**: Check if `<img alt="Produktbild 20688">` exists and has generic alt text
- **SC 1.3.1 (Info and Relationships)**: Verify if links are empty or missing h1 headings
- **SC 2.4.4 (Link Purpose)**: Check if links have ambiguous text
- **SC 4.1.1 (Parsing)**: Verify duplicate IDs exist in HTML
- **SC 1.4.3 (Contrast)**: Note that color contrast cannot be fully validated from HTML alone (mark as ?)

**Output**: Validation results for each sampled violation

---

### Step 5: Generate Validation Summary
**Action**: Create a table with validation results

**Instructions**:
Present findings in this format:

```markdown
## Validierungsergebnisse

**Geprüfte Website**: [URL]
**Gesamt-Verstöße im Report**: [X]
**Stichproben validiert**: [Y]

### Zusammenfassung
- ✓ Korrekt bestätigt: [X] ([%])
- ✗ Nicht bestätigt: [X] ([%])
- ? Unklar/Nicht prüfbar: [X] ([%])

### Detaillierte Ergebnisse

| # | WCAG | Fehlertyp | Status | Begründung |
|---|------|-----------|--------|------------|
| 1 | 1.1.1 | Generic Alt Text (Produktbild 20688) | ✓ | Image hat generischen Alt-Text "Produktbild 20688" statt Beschreibung |
| 2 | 1.3.1 | Leerer Link (Datenschutz) | ✓ | Link `a[href='/datenschutz...']` hat keinen sichtbaren Text |
| 3 | 4.1.1 | Duplicate ID (cookies-eu-banner) | ✗ | ID existiert nur einmal im aktuellen HTML |
| ... | ... | ... | ... | ... |

### Empfehlungen
- [List any patterns of false positives or areas where the tool might need improvement]
- [Note any violations that are particularly critical and confirmed]
```

**Output**: Complete validation report in markdown table format

---

## Input Requirements
- PDF accessibility report (WCAG 2.1 AA format)
- Website URL must be accessible via WebFetch

## Output Deliverables
- Validation summary table
- Percentage accuracy of the audit tool
- List of confirmed violations
- List of false positives (if any)
- Recommendations for tool improvement

## Success Criteria
- At least 3 violations validated per WCAG criterion (where available)
- Clear status (✓/✗/?) for each validated item
- Actionable insights about report accuracy

## Notes
- **Color Contrast (1.4.3)**: Cannot be fully validated from HTML alone; mark as "?" unless obvious issues
- **Dynamic Content**: If elements are loaded via JavaScript, note this limitation
- **CSS Selectors**: If selector doesn't match, check for similar elements nearby
- **False Negatives**: If you find violations NOT in the report, mention them separately

## Example Usage
```bash
# User provides report path
/validate-accessibility-report

# Agent asks for PDF path
# User: /Users/name/Downloads/bfsg-report-example.pdf

# Agent reads PDF, fetches website, validates samples, outputs table
```

---

**Version History**:
- v1.0.0 (2026-01-26): Initial workflow for WCAG report validation
