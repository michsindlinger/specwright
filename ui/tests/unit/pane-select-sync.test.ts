// @vitest-environment happy-dom

/**
 * syncSelectValue(): the imperative half of the pane project dropdown.
 *
 * The dirty-select test below is the reason the helper exists at all — it pins the
 * browser behaviour that makes `?selected` alone insufficient.
 */
import { describe, it, expect } from 'vitest';
import { syncSelectValue } from '../../frontend/src/components/terminal/pane-select-sync.js';

function makeSelect(values: string[]): HTMLSelectElement {
  const select = document.createElement('select');
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value || '— Projekt wählen —';
    select.appendChild(option);
  }
  return select;
}

describe('syncSelectValue()', () => {
  it('moves the selection and reports the correction', () => {
    const select = makeSelect(['', '/p1', '/p2']);
    select.value = '/p1';
    expect(syncSelectValue(select, '/p2')).toBe(true);
    expect(select.value).toBe('/p2');
  });

  it('repairs a select whose displayed value disagrees with the target', () => {
    // NOTE: happy-dom does not implement the option *dirtiness* flag, so the real-browser
    // failure (a hand-picked option ignoring later `selected` ATTRIBUTE changes) cannot be
    // reproduced here — it is covered by the manual repro in the plan. What this test pins
    // is the contract the sidebar relies on: whatever the attributes say, after the call the
    // displayed selection is the requested one.
    const select = makeSelect(['', '/p1', '/p2']);
    const [, p1, p2] = Array.from(select.options);

    p1.selected = true;
    p2.setAttribute('selected', '');
    p1.removeAttribute('selected');
    select.value = '/p1';

    expect(syncSelectValue(select, '/p2')).toBe(true);
    expect(select.value).toBe('/p2');
  });

  it('leaves an unknown value alone instead of clobbering to selectedIndex -1', () => {
    const select = makeSelect(['', '/p1']);
    select.value = '/p1';
    expect(syncSelectValue(select, '/gone')).toBe(false);
    expect(select.value).toBe('/p1');
    expect(select.selectedIndex).toBe(1);
  });

  it('is a no-op when the selection is already correct', () => {
    const select = makeSelect(['', '/p1']);
    select.value = '/p1';
    expect(syncSelectValue(select, '/p1')).toBe(false);
    expect(select.value).toBe('/p1');
  });

  it('selects the placeholder option for an empty value', () => {
    const select = makeSelect(['', '/p1']);
    select.value = '/p1';
    expect(syncSelectValue(select, '')).toBe(true);
    expect(select.value).toBe('');
    expect(select.selectedIndex).toBe(0);
  });
});
