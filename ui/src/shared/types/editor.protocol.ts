/**
 * Editor-Protokoll (INT-2026-028): Remote-SSH-Host für den Link
 * „In VS Code öffnen", geteilt von Backend (editor-config.ts) und Frontend
 * (editor-link.ts, aos-editor-einstellung).
 *
 * Datenklasse intern: der Host-Alias liegt nur in `<runtime>/editor-<port>.json`
 * (gitignored), nie in `ui/config/` (versioniert, öffentliches Repo).
 *
 * WebSocket:
 * - `settings.editor.get` → `settings.editor { config }`
 * - `settings.editor.update { remoteSshHost }` → `settings.editor { config }` oder `settings.error`
 * Antwort nur an den Absender; andere Browser laden beim nächsten (Re-)Connect.
 */

/**
 * SSH-Alias oder `user@host`: beginnt und endet alphanumerisch, ≤ 253 Zeichen.
 * Nur Zeichen ohne Bedeutung in einer URI-Authority — ausgeschlossen sind u. a.
 * `/ \ + ? # % : " < >`, Leerzeichen und Zeilenumbrüche. Ein Port gehört in den
 * Alias der `~/.ssh/config`, nicht hierher. Leerer String = „lokal" und wird
 * vor der Regex behandelt.
 */
export const REMOTE_SSH_HOST_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9._@-]{0,251}[A-Za-z0-9])?$/;

export interface EditorConfig {
  /** Leer = UI läuft auf dem Rechner des Browsers → lokaler `vscode://file`-Link. */
  remoteSshHost: string;
  /** Gespeicherte Datei war unlesbar; Host ist deshalb leer und muss neu eingetragen werden. */
  lesefehler?: true;
}
