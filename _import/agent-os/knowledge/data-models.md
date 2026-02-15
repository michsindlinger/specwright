# Data Models

> Zentrale Dokumentation für Data Models, Types und Interfaces
> Last Updated: 2026-02-11

## Overview

Tabelle aller Data Models im Projekt:

| Name | Pfad | Props/Signature | Quelle Spec | Datum |
|------|------|-----------------|-------------|-------|
| `CloudTerminalType` | `agent-os-ui/src/shared/types/cloud-terminal.protocol.ts` | `'shell' \| 'claude-code'` | Cloud Terminal Erweiterung | 2026-02-11 |
| `GitPrInfo` | `agent-os-ui/src/shared/types/git.protocol.ts` | `{ number, state, url, title }` | Git Integration Erweitert | 2026-02-11 |
| `GitRevertResult` | `agent-os-ui/src/shared/types/git.protocol.ts` | `{ revertedFiles, failedFiles }` | Git Integration Erweitert | 2026-02-11 |

---

## Detail-Dokumentation

### CloudTerminalType

**Pfad:** `agent-os-ui/src/shared/types/cloud-terminal.protocol.ts`

**Beschreibung:** Union Type zur Unterscheidung zwischen Shell-Terminals und Claude-Code-Sessions im Cloud Terminal System. Dient als Discriminator-Feld im gesamten Protokoll (Session, Create-Message, Metadaten).

**Usage:**
```typescript
import { CloudTerminalType } from '../../shared/types/cloud-terminal.protocol.js';

// Shell-Terminal erstellen
const shellSession: CloudTerminalCreateMessage = {
  type: 'cloud-terminal:create',
  terminalType: 'shell',
  projectPath: '/projects/my-project'
  // modelConfig ist optional bei shell
};

// Claude Code Session erstellen
const claudeSession: CloudTerminalCreateMessage = {
  type: 'cloud-terminal:create',
  terminalType: 'claude-code',
  projectPath: '/projects/my-project',
  modelConfig: { model: 'sonnet', provider: 'anthropic' }
};
```

**Props/API:**
| Prop/Parameter | Typ | Beschreibung |
|----------------|-----|--------------|
| `'shell'` | string literal | Normales Shell-Terminal (System-Default-Shell) |
| `'claude-code'` | string literal | Claude Code Session mit LLM-Provider |

**Source Spec:** Cloud Terminal Erweiterung (2026-02-11)

**Integration Notes:**
- Wird in `CloudTerminalSession`, `CloudTerminalCreateMessage` und `CloudTerminalCreatedMessage` verwendet
- `modelConfig` ist optional wenn `terminalType === 'shell'`
- Backward Compatibility: Sessions ohne `terminalType` werden als `'claude-code'` behandelt
- Verwendet im Backend (`cloud-terminal-manager.ts`), Frontend (`aos-terminal-session.ts`, `aos-model-dropdown.ts`) und Shared Types

---

### GitPrInfo

**Pfad:** `agent-os-ui/src/shared/types/git.protocol.ts`

**Beschreibung:** Interface fuer Pull Request Informationen. Wird vom Backend via `gh pr view --json` befuellt und im Frontend fuer den PR-Badge in der Status-Leiste verwendet.

**Usage:**
```typescript
import type { GitPrInfo } from '../../shared/types/git.protocol.js';

// PR-Info vom Backend empfangen
const prInfo: GitPrInfo | null = response.prInfo;
if (prInfo) {
  console.log(`PR #${prInfo.number}: ${prInfo.title} (${prInfo.state})`);
}
```

**Props/API:**
| Prop/Parameter | Typ | Beschreibung |
|----------------|-----|--------------|
| `number` | `number` | PR-Nummer (z.B. 42) |
| `state` | `string` | PR-Status: "OPEN", "MERGED", "CLOSED" |
| `url` | `string` | URL zur GitHub-PR-Seite |
| `title` | `string` | PR-Titel |

**Source Spec:** Git Integration Erweitert (GITE-001, 2026-02-11)

**Integration Notes:**
- Wird in `aos-git-status-bar.ts` fuer den PR-Badge verwendet
- Backend cached PR-Info fuer 60 Sekunden (In-Memory PR-Cache)
- `null` wenn kein PR existiert oder `gh` CLI nicht verfuegbar

---

### GitRevertResult

**Pfad:** `agent-os-ui/src/shared/types/git.protocol.ts`

**Beschreibung:** Interface fuer das Ergebnis einer Revert-Operation. Unterstuetzt Batch-Revert mit partiellem Erfolg (einige Dateien erfolgreich, andere fehlgeschlagen).

**Usage:**
```typescript
import type { GitRevertResult } from '../../shared/types/git.protocol.js';

// Revert-Ergebnis vom Backend
const result: GitRevertResult = response;
console.log(`Revertiert: ${result.revertedFiles.length}, Fehlgeschlagen: ${result.failedFiles.length}`);
```

**Props/API:**
| Prop/Parameter | Typ | Beschreibung |
|----------------|-----|--------------|
| `revertedFiles` | `string[]` | Erfolgreich revertierte Dateipfade |
| `failedFiles` | `Array<{ file: string, error: string }>` | Fehlgeschlagene Dateien mit Fehlermeldung |

**Source Spec:** Git Integration Erweitert (GITE-001, 2026-02-11)

**Integration Notes:**
- Wird in `aos-git-commit-dialog.ts` fuer Revert-Feedback verwendet
- Staged Dateien werden automatisch zuerst unstaged, dann revertiert
- Partieller Erfolg moeglich: Einige Dateien revertiert, andere fehlgeschlagen

---
