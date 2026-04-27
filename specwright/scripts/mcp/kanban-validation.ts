/**
 * Pure validation functions for V2 Lean kanban_create (v3.12).
 *
 * No external dependencies (no MCP SDK) — safe to import from tests.
 */

export const DESCRIPTION_MAX_CHARS = 150;

export interface TaskDescriptionInput {
  id: string;
  description: string;
}

/**
 * Soft-warn (does not reject) when description exceeds the V2 Lean cap.
 * V2 Lean expects 1-sentence subject-line; detail lives in planSection.
 */
export function validateTaskDescriptions(
  tasks: ReadonlyArray<TaskDescriptionInput>,
  maxChars: number = DESCRIPTION_MAX_CHARS
): string[] {
  const warnings: string[] = [];
  for (const t of tasks) {
    if (t.description.length > maxChars) {
      warnings.push(
        `Task ${t.id}: description ${t.description.length} chars (>${maxChars}). ` +
        `V2 Lean expects 1-sentence subject-line; detail lives in planSection.`
      );
    }
  }
  return warnings;
}
