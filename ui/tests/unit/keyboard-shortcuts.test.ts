import { describe, it, expect } from 'vitest';
import {
  isPaneZoomShortcut,
  isNotepadShortcut,
  isEditableTarget,
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
