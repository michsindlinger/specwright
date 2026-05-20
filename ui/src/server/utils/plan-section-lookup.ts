/**
 * Plan Section Lookup — shared helper for resolving planSection references
 * against implementation-plan.md content.
 *
 * SYNC-NOTE: This file is the CANONICAL source. A byte-identical copy lives at
 * `ui/src/server/utils/plan-section-lookup.ts` for the UI server (Vite/tsc
 * cannot import outside its rootDir). Any edit here MUST be mirrored there.
 * `ui/tests/unit/plan-section-lookup.test.ts` imports BOTH copies and asserts
 * identical behavior.
 *
 * Strategy chain (v3.16+):
 *   0 — Anchor-ID strict-mode (`<!-- section:slug -->`). Errors out (no
 *       fallthrough) when planSection looks like an anchor slug but is not
 *       present in the plan, or appears multiple times, or has empty body.
 *   1 — Exact heading match (legacy, planSection = heading-string).
 *   2 — "Phase N" flexible heading match (legacy).
 *   3 — Component-name in markdown table (legacy).
 *   Fallback — empty string; caller chooses what to substitute.
 */

export const ANCHOR_ID_REGEX = /^[a-z0-9][a-z0-9-]{0,79}$/;

export type LookupSource =
  | 'anchor'
  | 'heading-exact'
  | 'phase-number'
  | 'component-table'
  | 'not-found';

export interface LookupResult {
  found: boolean;
  content: string;
  source: LookupSource;
  warnings: string[];
}

export type LookupFailureReason =
  | 'duplicate-anchor'
  | 'empty-anchor-body'
  | 'anchor-not-found';

export class PlanSectionLookupError extends Error {
  constructor(
    public readonly reason: LookupFailureReason,
    message: string,
  ) {
    super(message);
    this.name = 'PlanSectionLookupError';
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tryAnchorLookup(planText: string, planSection: string): LookupResult | null {
  if (!ANCHOR_ID_REGEX.test(planSection)) {
    return null;
  }

  // Anchor-ID is regex-safe by construction ([a-z0-9-]+); no escape needed.
  const anchorMarkerRegex = new RegExp(
    `<!--\\s*section:${planSection}\\s*-->`,
    'gm',
  );
  const allMatches = [...planText.matchAll(anchorMarkerRegex)];

  if (allMatches.length > 1) {
    throw new PlanSectionLookupError(
      'duplicate-anchor',
      `Anchor ID '${planSection}' appears ${allMatches.length} times in plan — must be unique. Fix the plan before continuing.`,
    );
  }

  if (allMatches.length === 0) {
    throw new PlanSectionLookupError(
      'anchor-not-found',
      `Anchor ID '${planSection}' looks like an anchor slug but is not present in plan. Did the plan regenerate without anchors, or is the kanban task referencing a typo?`,
    );
  }

  // Single match — extract section body.
  // Body runs from after the anchor comment until the next `<!-- section:` or next `## ` (top-level peer) heading, or true EOF.
  // Note: we stop at `## ` only (not `###+`). Anchored `###` children stop the lookup via the anchor-marker branch.
  // Unanchored `###` sub-headings are included as part of the parent section — they semantically belong to it.
  const sectionRegex = new RegExp(
    `<!--\\s*section:${planSection}\\s*-->[\\t ]*\\n*(#{2,6}\\s+[^\\n]*)?([\\s\\S]*?)(?=\\n?<!--\\s*section:|\\n##\\s|$(?![\\s\\S]))`,
    'm',
  );
  const match = planText.match(sectionRegex);
  if (!match) {
    throw new PlanSectionLookupError(
      'anchor-not-found',
      `Anchor ID '${planSection}' matched the marker pattern but no section body could be extracted — plan may be malformed.`,
    );
  }

  const heading = match[1] ?? '';
  const body = (match[2] ?? '').trim();

  if (!body) {
    throw new PlanSectionLookupError(
      'empty-anchor-body',
      `Anchor '${planSection}' has empty section body — plan-agent regression?`,
    );
  }

  return {
    found: true,
    content: (heading + body).trim(),
    source: 'anchor',
    warnings: [],
  };
}

function tryExactHeading(planText: string, planSection: string): LookupResult | null {
  const exactHeading = planSection.trim();
  const exactRegex = new RegExp(
    `^#{2,3}\\s+${escapeRegex(exactHeading)}\\s*\\n+([\\s\\S]*?)(?=\\n#{2,3}\\s|$(?![\\s\\S]))`,
    'im',
  );
  const match = planText.match(exactRegex);
  if (!match) return null;
  return {
    found: true,
    content: match[0].trim(),
    source: 'heading-exact',
    warnings: [],
  };
}

function tryPhaseNumber(planText: string, planSection: string): LookupResult | null {
  const phaseMatch = planSection.match(/Phase\s+(\d+)/i);
  if (!phaseMatch) return null;
  const phaseNum = phaseMatch[1];
  const sectionRegex = new RegExp(
    `^#{2,3}\\s+(?:Phase\\s*)?${phaseNum}[\\s.:\\-–—]*[^\\n]*\\n+([\\s\\S]*?)(?=\\n#{2,3}\\s+(?:Phase\\s*)?\\d|\\n##\\s|$(?![\\s\\S]))`,
    'im',
  );
  const match = planText.match(sectionRegex);
  if (!match) return null;
  return {
    found: true,
    content: match[0].trim(),
    source: 'phase-number',
    warnings: [],
  };
}

function tryComponentTable(planText: string, planSection: string): LookupResult | null {
  const componentMatch = planSection.match(/(?:Component|Komponente)[:\s]+(.+)/i);
  if (!componentMatch) return null;
  const componentName = componentMatch[1].trim();
  const compRegex = new RegExp(
    `\\|\\s*\\*?${escapeRegex(componentName)}\\b[^|]*\\|[\\s\\S]*?(?=\\n(?!\\s*\\|)|$)`,
    'i',
  );
  const match = planText.match(compRegex);
  if (!match) return null;
  return {
    found: true,
    content: match[0].trim(),
    source: 'component-table',
    warnings: [],
  };
}

/**
 * Resolve `planSection` against `planText`. See module docstring for the
 * strategy chain. Throws `PlanSectionLookupError` for strict-mode failures
 * triggered by Strategy 0 (anchor-ID format). Legacy strategies (1-3) never
 * throw — they return `{ found: false, source: 'not-found' }` on miss.
 */
export function lookupPlanSection(planText: string, planSection: string): LookupResult {
  // Strategy 0: anchor-ID strict-mode lookup.
  const anchorResult = tryAnchorLookup(planText, planSection);
  if (anchorResult) return anchorResult;

  // Legacy strategies. Order: exact heading → phase number → component table.
  return (
    tryExactHeading(planText, planSection) ??
    tryPhaseNumber(planText, planSection) ??
    tryComponentTable(planText, planSection) ?? {
      found: false,
      content: '',
      source: 'not-found',
      warnings: [],
    }
  );
}
