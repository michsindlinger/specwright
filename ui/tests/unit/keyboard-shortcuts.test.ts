import { describe, it, expect } from 'vitest';
import {
  isPaneZoomShortcut,
  isNotepadShortcut,
  isEditableTarget,
  isBackToOverviewShortcut,
  isTypingTarget,
  TERMINAL_INPUT_ATTR,
  type KeyComboLike,
} from '../../frontend/src/utils/keyboard-shortcuts.js';

const combo = (over: Partial<KeyComboLike>): KeyComboLike => ({
  key: '',
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...over,
});

describe('isPaneZoomShortcut', () => {
  it('matches Cmd+Shift+Enter and Ctrl+Shift+Enter', () => {
    expect(isPaneZoomShortcut(combo({ key: 'Enter', metaKey: true, shiftKey: true }))).toBe(true);
    expect(isPaneZoomShortcut(combo({ key: 'Enter', ctrlKey: true, shiftKey: true }))).toBe(true);
  });

  it('rejects plain Shift+Enter (cloud newline) and Cmd+Enter', () => {
    expect(isPaneZoomShortcut(combo({ key: 'Enter', shiftKey: true }))).toBe(false);
    expect(isPaneZoomShortcut(combo({ key: 'Enter', metaKey: true }))).toBe(false);
  });

  it('rejects when Alt is held or the key differs', () => {
    expect(isPaneZoomShortcut(combo({ key: 'Enter', metaKey: true, shiftKey: true, altKey: true }))).toBe(false);
    expect(isPaneZoomShortcut(combo({ key: 'E', metaKey: true, shiftKey: true }))).toBe(false);
  });
});

describe('isNotepadShortcut', () => {
  it('matches Cmd/Ctrl+Shift+E regardless of key case', () => {
    expect(isNotepadShortcut(combo({ key: 'E', metaKey: true, shiftKey: true }))).toBe(true);
    expect(isNotepadShortcut(combo({ key: 'e', ctrlKey: true, shiftKey: true }))).toBe(true);
  });

  it('falls back to code KeyE for non-Latin layouts', () => {
    expect(isNotepadShortcut(combo({ key: 'У', code: 'KeyE', metaKey: true, shiftKey: true }))).toBe(true);
  });

  it('rejects without Shift, with Alt, or other keys', () => {
    expect(isNotepadShortcut(combo({ key: 'e', metaKey: true }))).toBe(false);
    expect(isNotepadShortcut(combo({ key: 'E', metaKey: true, shiftKey: true, altKey: true }))).toBe(false);
    expect(isNotepadShortcut(combo({ key: 'Enter', metaKey: true, shiftKey: true }))).toBe(false);
  });
});

describe('isEditableTarget', () => {
  it('recognises form controls and contenteditable', () => {
    expect(isEditableTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isEditableTarget({ tagName: 'input' })).toBe(true);
    expect(isEditableTarget({ tagName: 'SELECT' })).toBe(true);
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });

  it('rejects other elements and non-objects', () => {
    expect(isEditableTarget({ tagName: 'DIV' })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget(undefined)).toBe(false);
    expect(isEditableTarget('textarea')).toBe(false);
  });
});

describe('isBackToOverviewShortcut (INT-2026-015, AK-05, RB-02)', () => {
  it('matches Cmd+← only', () => {
    expect(isBackToOverviewShortcut(combo({ key: 'ArrowLeft', metaKey: true }))).toBe(true);
  });

  it('rejects Ctrl+← (word jump in the terminal, NZ-03) and every other modifier mix', () => {
    expect(isBackToOverviewShortcut(combo({ key: 'ArrowLeft', ctrlKey: true }))).toBe(false);
    expect(isBackToOverviewShortcut(combo({ key: 'ArrowLeft', metaKey: true, shiftKey: true }))).toBe(false);
    expect(isBackToOverviewShortcut(combo({ key: 'ArrowLeft', metaKey: true, altKey: true }))).toBe(false);
    expect(isBackToOverviewShortcut(combo({ key: 'ArrowLeft', metaKey: true, ctrlKey: true }))).toBe(false);
    expect(isBackToOverviewShortcut(combo({ key: 'ArrowLeft' }))).toBe(false);
  });

  it('rejects other keys with Cmd', () => {
    expect(isBackToOverviewShortcut(combo({ key: 'ArrowRight', metaKey: true }))).toBe(false);
    expect(isBackToOverviewShortcut(combo({ key: '[', metaKey: true }))).toBe(false);
  });
});

describe('isTypingTarget (INT-2026-015, AK-06/AK-07)', () => {
  const terminalField = { tagName: 'TEXTAREA', hasAttribute: (n: string) => n === TERMINAL_INPUT_ATTR };

  it('is true when the path starts in a form control or contenteditable', () => {
    expect(isTypingTarget([{ tagName: 'TEXTAREA' }, { tagName: 'DIV' }])).toBe(true);
    expect(isTypingTarget([{ tagName: 'INPUT' }])).toBe(true);
    expect(isTypingTarget([{ isContentEditable: true }])).toBe(true);
  });

  it("is false for the terminal's own textarea (marked with TERMINAL_INPUT_ATTR)", () => {
    expect(isTypingTarget([terminalField, { tagName: 'DIV' }])).toBe(false);
  });

  it('is true for a textarea without the marker, with or without hasAttribute', () => {
    expect(isTypingTarget([{ tagName: 'TEXTAREA', hasAttribute: () => false }])).toBe(true);
    expect(isTypingTarget([{ tagName: 'TEXTAREA' }])).toBe(true);
  });

  it('is false for non-editable targets, an empty path and a null head', () => {
    expect(isTypingTarget([{ tagName: 'DIV' }])).toBe(false);
    expect(isTypingTarget([])).toBe(false);
    expect(isTypingTarget([null])).toBe(false);
  });

  it('only looks at the innermost element: a textarea deeper in the path does not count', () => {
    expect(isTypingTarget([{ tagName: 'DIV' }, { tagName: 'TEXTAREA' }])).toBe(false);
  });
});
