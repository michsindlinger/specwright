import { describe, it, expect } from 'vitest';
import * as uiCopy from '../../src/server/utils/plan-section-lookup.js';

// Import the canonical MCP copy via relative path. Vitest uses esbuild which
// happily imports outside ui/src — TS compilation skips it (declaration-only),
// but tests verify byte-equivalence by running fixtures against both copies.
import * as mcpCopy from '../../../specwright/scripts/mcp/plan-section-lookup.js';

type LookupModule = typeof uiCopy;

const PLAN_BASIC = `# Implementation Plan

## Executive Summary

Some prose.

<!-- section:backend-1-domain-model -->
## 1. Domain Model

Domain content here.
Two lines.

<!-- section:backend-2-adapter -->
## 2. Adapter

Adapter content.

<!-- section:frontend-1-layout -->
### 1. Frontend Layout

Layout content body.
`;

const PLAN_NESTED_ANCHORS = `# Plan

<!-- section:parent-section -->
## Parent

Parent intro paragraph.

<!-- section:parent-child-1 -->
### Child One

Child one body.

<!-- section:parent-child-2 -->
### Child Two

Child two body.
`;

const PLAN_NESTED_NO_CHILD_ANCHOR = `# Plan

<!-- section:parent-section -->
## Parent

Parent intro paragraph.

### Sub heading without anchor

Sub content inside parent.

<!-- section:next-section -->
## Next

Next body.
`;

const PLAN_DUPLICATE = `# Plan

<!-- section:dupe -->
## A

A body.

<!-- section:dupe -->
## B

B body.
`;

const PLAN_EMPTY_BODY = `# Plan

<!-- section:empty-one -->
### Empty Heading
<!-- section:after-empty -->
### After

After body.
`;

const PLAN_ANCHOR_AT_EOF = `# Plan

<!-- section:before -->
## Before

Before body.

<!-- section:last -->
## Last

Last body line one.
Last body line two.`;

const PLAN_WHITESPACE_VARIANTS = `# Plan

<!--   section:tabs-and-spaces   -->
## Heading

Body content.

<!--	section:tab-only	-->
## Tab Heading

Tab body.
`;

const PLAN_LEGACY = `# Plan

## Phase 1: Foundation

Phase 1 body line.

## Phase 2: Build

Phase 2 body line.

| Component | Notes |
|-----------|-------|
| AuthHandler | Handles authentication |
| TokenStore | Stores tokens |
`;

/** Run a single suite of behavioral checks against an arbitrary copy. */
function runBehaviorSuite(name: string, mod: LookupModule): void {
  describe(`${name} — behavior`, () => {
    describe('Strategy 0 (anchor-ID)', () => {
      it('finds anchored section with heading included', () => {
        const result = mod.lookupPlanSection(PLAN_BASIC, 'backend-1-domain-model');
        expect(result.found).toBe(true);
        expect(result.source).toBe('anchor');
        expect(result.content).toContain('## 1. Domain Model');
        expect(result.content).toContain('Domain content here');
        expect(result.content).toContain('Two lines.');
        expect(result.content).not.toContain('Executive Summary');
      });

      it('finds anchored ### sub-section', () => {
        const result = mod.lookupPlanSection(PLAN_BASIC, 'frontend-1-layout');
        expect(result.found).toBe(true);
        expect(result.source).toBe('anchor');
        expect(result.content).toContain('### 1. Frontend Layout');
        expect(result.content).toContain('Layout content body');
      });

      it('does not bleed content from sibling sections', () => {
        const result = mod.lookupPlanSection(PLAN_BASIC, 'backend-1-domain-model');
        expect(result.content).not.toContain('Adapter content');
        expect(result.content).not.toContain('Layout content');
      });

      it('throws anchor-not-found when slug-format ID is absent', () => {
        expect(() => mod.lookupPlanSection(PLAN_BASIC, 'backend-1-typo')).toThrow(
          mod.PlanSectionLookupError,
        );
        try {
          mod.lookupPlanSection(PLAN_BASIC, 'backend-1-typo');
        } catch (err) {
          expect(err).toBeInstanceOf(mod.PlanSectionLookupError);
          expect((err as InstanceType<typeof mod.PlanSectionLookupError>).reason).toBe(
            'anchor-not-found',
          );
        }
      });

      it('throws duplicate-anchor when ID appears more than once', () => {
        try {
          mod.lookupPlanSection(PLAN_DUPLICATE, 'dupe');
          expect.fail('expected throw');
        } catch (err) {
          expect(err).toBeInstanceOf(mod.PlanSectionLookupError);
          expect((err as InstanceType<typeof mod.PlanSectionLookupError>).reason).toBe(
            'duplicate-anchor',
          );
        }
      });

      it('throws empty-anchor-body when body is whitespace-only', () => {
        try {
          mod.lookupPlanSection(PLAN_EMPTY_BODY, 'empty-one');
          expect.fail('expected throw');
        } catch (err) {
          expect(err).toBeInstanceOf(mod.PlanSectionLookupError);
          expect((err as InstanceType<typeof mod.PlanSectionLookupError>).reason).toBe(
            'empty-anchor-body',
          );
        }
      });

      it('stops at child anchor when looking up parent', () => {
        const result = mod.lookupPlanSection(PLAN_NESTED_ANCHORS, 'parent-section');
        expect(result.found).toBe(true);
        expect(result.content).toContain('## Parent');
        expect(result.content).toContain('Parent intro paragraph');
        expect(result.content).not.toContain('Child One');
        expect(result.content).not.toContain('Child Two');
      });

      it('includes unanchored ### sub-headings under anchored ## parent', () => {
        const result = mod.lookupPlanSection(
          PLAN_NESTED_NO_CHILD_ANCHOR,
          'parent-section',
        );
        expect(result.found).toBe(true);
        expect(result.content).toContain('## Parent');
        expect(result.content).toContain('### Sub heading without anchor');
        expect(result.content).toContain('Sub content inside parent');
        expect(result.content).not.toContain('Next body');
      });

      it('reads anchor section that runs to EOF', () => {
        const result = mod.lookupPlanSection(PLAN_ANCHOR_AT_EOF, 'last');
        expect(result.found).toBe(true);
        expect(result.content).toContain('## Last');
        expect(result.content).toContain('Last body line one');
        expect(result.content).toContain('Last body line two');
      });

      it('tolerates extra whitespace around section: token', () => {
        const result = mod.lookupPlanSection(
          PLAN_WHITESPACE_VARIANTS,
          'tabs-and-spaces',
        );
        expect(result.found).toBe(true);
        expect(result.content).toContain('## Heading');
        expect(result.content).toContain('Body content');
      });

      it('tolerates tabs around section: token', () => {
        const result = mod.lookupPlanSection(PLAN_WHITESPACE_VARIANTS, 'tab-only');
        expect(result.found).toBe(true);
        expect(result.content).toContain('## Tab Heading');
      });

      it('rejects slugs that fail ANCHOR_ID_REGEX format (falls through)', () => {
        // Uppercase slug → not anchor format → falls through to legacy strategies.
        // PLAN_BASIC has no heading matching "Backend-1-Domain", so result is not-found.
        const result = mod.lookupPlanSection(PLAN_BASIC, 'Backend-1-Domain');
        expect(result.found).toBe(false);
        expect(result.source).toBe('not-found');
      });
    });

    describe('Strategy 1-3 (legacy heading match)', () => {
      it('finds exact heading match', () => {
        const result = mod.lookupPlanSection(PLAN_LEGACY, 'Phase 1: Foundation');
        expect(result.found).toBe(true);
        expect(result.source).toBe('heading-exact');
        expect(result.content).toContain('Phase 1 body line');
      });

      it('falls back to phase-number when exact heading misses', () => {
        const result = mod.lookupPlanSection(PLAN_LEGACY, 'Phase 2');
        expect(result.found).toBe(true);
        expect(result.source).toBe('phase-number');
        expect(result.content).toContain('Phase 2 body line');
      });

      it('falls back to component-table for "Component: X" string', () => {
        const result = mod.lookupPlanSection(PLAN_LEGACY, 'Component: AuthHandler');
        expect(result.found).toBe(true);
        expect(result.source).toBe('component-table');
        expect(result.content).toContain('AuthHandler');
      });

      it('returns not-found when no strategy matches', () => {
        const result = mod.lookupPlanSection(PLAN_LEGACY, 'Phase 99: Nonexistent');
        expect(result.found).toBe(false);
        expect(result.source).toBe('not-found');
        expect(result.content).toBe('');
      });

      it('does not throw on missing legacy heading (only Strategy 0 is strict)', () => {
        expect(() =>
          mod.lookupPlanSection(PLAN_LEGACY, 'Phase 99: Nonexistent'),
        ).not.toThrow();
      });
    });

    describe('ANCHOR_ID_REGEX', () => {
      it('accepts valid slug formats', () => {
        expect(mod.ANCHOR_ID_REGEX.test('backend-1-domain')).toBe(true);
        expect(mod.ANCHOR_ID_REGEX.test('a')).toBe(true);
        expect(mod.ANCHOR_ID_REGEX.test('123')).toBe(true);
        expect(mod.ANCHOR_ID_REGEX.test('a-b-c-d')).toBe(true);
      });

      it('rejects invalid slug formats', () => {
        expect(mod.ANCHOR_ID_REGEX.test('')).toBe(false);
        expect(mod.ANCHOR_ID_REGEX.test('-leading-dash')).toBe(false);
        expect(mod.ANCHOR_ID_REGEX.test('Uppercase')).toBe(false);
        expect(mod.ANCHOR_ID_REGEX.test('with space')).toBe(false);
        expect(mod.ANCHOR_ID_REGEX.test('underscore_separator')).toBe(false);
        expect(mod.ANCHOR_ID_REGEX.test('a'.repeat(81))).toBe(false);
      });
    });
  });
}

runBehaviorSuite('ui copy (ui/src/server/utils/plan-section-lookup)', uiCopy);
runBehaviorSuite('mcp copy (specwright/scripts/mcp/plan-section-lookup)', mcpCopy);

describe('byte-identical sync', () => {
  it('ui copy and mcp copy export the same surface', () => {
    expect(Object.keys(uiCopy).sort()).toEqual(Object.keys(mcpCopy).sort());
  });

  it('ANCHOR_ID_REGEX source is identical between copies', () => {
    expect(uiCopy.ANCHOR_ID_REGEX.source).toBe(mcpCopy.ANCHOR_ID_REGEX.source);
    expect(uiCopy.ANCHOR_ID_REGEX.flags).toBe(mcpCopy.ANCHOR_ID_REGEX.flags);
  });
});
