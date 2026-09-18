/**
 * Clipboard-image detection and encoding shared by the Cloud Terminal
 * (`aos-terminal.ts`) and „Neue Absicht" (`aos-neue-absicht.ts`, INT-2026-020).
 *
 * Both listen to the browser's native `paste` event — it delivers the
 * clipboard image bytes directly via `clipboardData`, with none of the
 * focus/permission quirks of the async Clipboard API. The allowlist is the
 * one from `cloud-terminal.protocol.ts` (RB-04): callers pass it in so this
 * module stays free of protocol imports.
 */

export interface ClipboardImage {
  file: File;
  /** `true` when `file.type` is in the caller's allowlist. */
  allowed: boolean;
}

/**
 * Find an image on the clipboard. Prefers the first file whose MIME type is
 * in `allowed`; otherwise returns the first `image/*` file with
 * `allowed: false` so the caller can name the rejected type (AK-04). Returns
 * `null` when there is no image at all (plain text paste → let the browser
 * do its thing, AK-02).
 *
 * Screenshots usually arrive as files; some sources expose them as items.
 */
export function findClipboardImage(
  dataTransfer: DataTransfer | null,
  allowed: readonly string[],
): ClipboardImage | null {
  if (!dataTransfer) return null;
  let fallback: File | null = null;

  for (const candidate of Array.from(dataTransfer.files)) {
    if (allowed.includes(candidate.type)) return { file: candidate, allowed: true };
    if (!fallback && candidate.type.startsWith('image/')) fallback = candidate;
  }
  for (const item of Array.from(dataTransfer.items)) {
    if (item.kind !== 'file') continue;
    if (allowed.includes(item.type)) {
      const file = item.getAsFile();
      if (file) return { file, allowed: true };
    } else if (!fallback && item.type.startsWith('image/')) {
      fallback = item.getAsFile();
    }
  }

  return fallback ? { file: fallback, allowed: false } : null;
}

/** Read a blob as base64 (data-URL prefix stripped). */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      const comma = r.indexOf(',');
      resolve(comma >= 0 ? r.slice(comma + 1) : r);
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}
