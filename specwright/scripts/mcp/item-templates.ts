/**
 * Template generators for different item types (story, bug, fix, todo)
 */

export interface StoryItemData {
  id: string;
  title: string;
  type: string;
  priority: string;
  effort: number;
  dependencies: string[];
  content?: string;
}

export interface BugItemData extends StoryItemData {
  severity?: string;
  rootCause?: string;
  reproduction?: string;
}

export interface FixItemData extends StoryItemData {
  fixFor?: string;
  errorOutput?: string;
}

export interface TodoItemData {
  title: string;
  description: string;
  priority: string;
  source?: string;
  relatedSpec?: string;
  estimatedEffort?: number;
  severity?: string;
  reproduction?: string;
  content?: string;
}

/**
 * Generate story markdown from template
 */
export function generateStoryTemplate(data: StoryItemData): string {
  return `# Story ${data.id}: ${data.title}

**Type:** ${data.type}
**Priority:** ${data.priority}
**Estimated Effort:** ${data.effort} SP
**Dependencies:** ${data.dependencies.length > 0 ? data.dependencies.join(', ') : 'None'}

## Feature

\`\`\`gherkin
Feature: ${data.title}
  As a [user role]
  I want to [action]
  So that [benefit]
\`\`\`

## Acceptance Criteria

\`\`\`gherkin
Scenario: [Scenario name]
  Given [precondition]
  When [action]
  Then [expected result]
\`\`\`

## Technisches Refinement (vom Architect)

### DoR
- [ ] Requirements clear
- [ ] Approach defined
- [ ] Dependencies identified

### DoD
- [ ] Implementation complete
- [ ] Tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated

**WAS:** [What needs to be built]

**WIE:** [Architecture guidance]

**WO:** [File paths]

**WER:** [Agent name]
`;
}

/**
 * Generate bug story markdown from template
 */
export function generateBugTemplate(data: BugItemData): string {
  const severity = data.severity || 'medium';
  const rootCause = data.rootCause || 'To be determined';
  const reproduction = data.reproduction || 'To be documented';

  return `# Bug ${data.id}: ${data.title}

**Type:** Bug
**Severity:** ${severity}
**Priority:** ${data.priority}
**Estimated Effort:** ${data.effort} SP
**Dependencies:** ${data.dependencies.length > 0 ? data.dependencies.join(', ') : 'None'}

## Problem Description

${data.title}

## Reproduction Steps

${reproduction}

## Root Cause Analysis

${rootCause}

## Expected Behavior

[Describe what should happen]

## Actual Behavior

[Describe what currently happens]

## Technisches Refinement (vom Architect)

### DoR
- [ ] Bug reproduced
- [ ] Root cause identified
- [ ] Fix approach defined

### DoD
- [ ] Bug fixed
- [ ] Root cause addressed
- [ ] Regression test added
- [ ] Tests passing
- [ ] No side effects

**WAS:** Fix for ${data.title}

**WIE:** [Fix approach]

**WO:** [Files to modify]

**WER:** [Agent name]
`;
}

/**
 * Generate fix story markdown from template
 */
export function generateFixTemplate(data: FixItemData): string {
  const fixFor = data.fixFor || 'quality checks';
  const errorOutput = data.errorOutput || 'See error details';

  return `# Fix ${data.id}: ${data.title}

**Type:** Fix/Quality
**Priority:** ${data.priority}
**Estimated Effort:** ${data.effort} SP
**Fix For:** ${fixFor}
**Dependencies:** ${data.dependencies.length > 0 ? data.dependencies.join(', ') : 'None'}

## Issue

${data.title}

## Error Output

\`\`\`
${errorOutput}
\`\`\`

## Fix Approach

[Describe how to fix this issue]

## Technisches Refinement (vom Architect)

### DoR
- [x] Error identified
- [x] Fix approach clear

### DoD
- [ ] Error resolved
- [ ] Quality checks pass
- [ ] No new issues introduced

**WAS:** ${data.title}

**WO:** [Files to modify]

**WER:** ${data.type === 'frontend' ? 'dev-team__frontend-developer' : 'dev-team__backend-developer'}
`;
}

/**
 * Generate todo item markdown from template
 */
export function generateTodoTemplate(data: TodoItemData, itemId: string): string {
  const now = new Date().toISOString();
  const source = data.source || 'Manual entry';
  const relatedSpec = data.relatedSpec || 'N/A';

  return `# ${itemId}: ${data.title}

**Type:** ${data.severity ? 'Bug' : 'Todo'}
**Priority:** ${data.priority}
**Estimated Effort:** ${data.estimatedEffort || 'TBD'}
**Created:** ${now}
**Source:** ${source}
**Related Spec:** ${relatedSpec}

## Description

${data.description}

${data.reproduction ? `## Reproduction Steps\n\n${data.reproduction}\n` : ''}
${data.severity ? `## Severity\n\n${data.severity}\n` : ''}

## Acceptance Criteria

- [ ] Task completed
- [ ] Verified working

## Notes

[Additional notes]
`;
}
