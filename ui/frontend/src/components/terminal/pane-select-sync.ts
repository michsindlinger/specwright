/**
 * Imperative selection sync for the pane project `<select>` in the cloud-terminal header.
 *
 * Why this cannot be a template binding:
 *
 * 1. `?selected=${…}` only writes the option's `selected` CONTENT attribute
 *    (`defaultSelected`). Changing it re-runs the select's "ask for a reset"
 *    algorithm only while the option's dirtiness flag is false — i.e. never again
 *    once the user has picked something from that dropdown by hand. A pane whose
 *    project changes programmatically (bell jump, close-fallback, restore) then
 *    keeps showing the stale project while the badge next to it is already correct.
 * 2. `.value=${…}` (with or without `live()`) does not fix it either: lit commits
 *    an element's own parts BEFORE its child parts, so on a pane's first render the
 *    `repeat()`-generated options do not exist yet and the assignment is dropped.
 *
 * So the template keeps `?selected` (correct on the very first paint) and the DOM
 * selection is corrected after every render — see `_syncPaneSelects()` in
 * aos-cloud-terminal-sidebar.ts.
 *
 * DOM-touching but dependency-free, so it is unit-testable under happy-dom without
 * mounting the sidebar (ui/tests/unit/pane-select-sync.test.ts).
 */

/**
 * Force `select`'s displayed selection to `value`.
 *
 * Never clobbers the element into `selectedIndex === -1`: when no option carries
 * `value` (a project that vanished between two renders) the DOM is left alone and
 * the next render — which rebuilds the option list from the same source — settles it.
 *
 * @returns true when the selection actually had to be corrected.
 */
export function syncSelectValue(select: HTMLSelectElement, value: string): boolean {
  if (select.value === value) return false;
  let found = false;
  for (const option of Array.from(select.options)) {
    if (option.value === value) {
      found = true;
      break;
    }
  }
  if (!found) return false;
  select.value = value;
  return true;
}
