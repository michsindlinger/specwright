/**
 * Copy-path utility: builds spec file paths and copies to clipboard.
 * Created by CFP-001.
 */

/**
 * Builds the full relative path for a file within a spec folder.
 *
 * @param specId - The spec identifier (e.g., "2026-02-13-feature")
 * @param relativePath - The path relative to the spec folder (e.g., "stories/story-001.md")
 * @returns The full relative path (e.g., "agent-os/specs/2026-02-13-feature/stories/story-001.md")
 */
export function buildSpecFilePath(specId: string, relativePath: string): string {
  return `agent-os/specs/${specId}/${relativePath}`;
}

/**
 * Copies a path string to the clipboard and provides visual feedback on the button.
 * Adds a "copy-path--copied" CSS class for 2 seconds.
 *
 * @param path - The path string to copy
 * @param button - The button element to apply feedback class to
 */
export async function copyPathToClipboard(path: string, button: HTMLElement): Promise<void> {
  await navigator.clipboard.writeText(path);
  button.classList.add('copy-path--copied');
  setTimeout(() => {
    button.classList.remove('copy-path--copied');
  }, 2000);
}
