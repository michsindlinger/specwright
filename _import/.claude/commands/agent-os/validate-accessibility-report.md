---
match: validate-accessibility-report
tags:
  - accessibility
  - qa
  - validation
---

You are now executing the **Validate Accessibility Report** workflow.

## Your Task
1. Ask the user for the path to the accessibility report PDF
2. Follow the workflow in `agent-os/workflows/core/validate-accessibility-report.md`
3. Read the PDF report and extract all violations
4. Fetch the live website using WebFetch
5. Randomly sample minimum 3 violations per WCAG criterion
6. Validate each sampled violation against the live website
7. Output a validation table with status (✓ Korrekt / ✗ Nicht bestätigt / ? Unklar)

## Important Guidelines
- **Sampling Strategy**: Prioritize CRITICAL and HIGH severity violations
- **Validation Accuracy**: Check CSS selectors, element attributes, and WCAG criteria carefully
- **Limitations**: Mark color contrast and dynamic content as "?" if not verifiable from HTML
- **Table Format**: Use the format specified in Step 5 of the workflow

## Expected Output
A markdown table showing:
- Total violations in report
- Number of samples validated
- Accuracy percentage (✓ vs ✗ vs ?)
- Detailed validation results with brief explanations

Load the workflow and begin by asking for the PDF report path.
