# Implementation Plan: Git Integration Erweitert

**Status:** APPROVED
**Created:** 2026-02-11
**Spec:** 2026-02-11-git-integration-erweitert

---

## Executive Summary

Erweiterung der bestehenden Git Integration UI um vier Funktionen: (1) Datei-Revert (einzeln + batch) im Commit-Dialog, (2) Löschen von Untracked Dateien (einzeln, mit Bestätigung) im Commit-Dialog, (3) PR-Badge in der Status-Leiste, (4) "Commit & Push" Combined-Workflow. Die Implementierung folgt einem minimalinvasiven Ansatz -- alle Features werden durch Erweiterung der 9 bestehenden Dateien umgesetzt. Keine neuen Dateien nötig. Das bestehende WebSocket-Pattern (`git:<action>` / `git:<action>:response`) und die Handler-Delegation (websocket.ts -> git.handler.ts -> git.service.ts) bleiben unverändert.

---

## Architecture Decisions

**AD-1: Keine neuen Dateien.** Alle UI-Änderungen in bestehenden `aos-git-status-bar` und `aos-git-commit-dialog`. Der Delete-Bestätigungs-Dialog nutzt den bestehenden `aos-confirm-dialog` (bereits für Branch-Wechsel-Bestätigung verwendet).

**AD-2: PR-Info via `gh pr view` CLI.** Backend ruft `gh pr view --json number,state,url,title` via `execFile` auf (gleiche Security-Pattern wie bestehende Git-Befehle). Kein GitHub-API-Dependency, nutzt lokale Authentifizierung.

**AD-3: PR-Info Caching.** 60-Sekunden TTL pro project+branch Key in `git.service.ts`. Cache wird bei Branch-Checkout invalidiert. Vermeidet zu häufige CLI-Aufrufe.

**AD-4: Revert via `git checkout -- <file>`.** Für staged Dateien: erst `git reset HEAD -- <file>`, dann `git checkout -- <file>`. Sicherster, vorhersagbarster Ansatz.

**AD-5: Delete Untracked via `fs.unlink`.** NICHT `git clean` (zu aggressiv). `fs.unlink` zielt exakt auf eine Datei. Verzeichnis wird nicht gelöscht (Sicherheit).

**AD-6: "Commit & Push" als UI-orchestrierter sequentieller Workflow.** Kein neues Backend-Endpoint. `app.ts` orchestriert: commit -> wait -> push -> wait. Nutzt bestehende `git:commit` und `git:push` Messages.

---

## Component Overview

**Modifizierte Dateien (keine neuen Dateien):**

| Datei | Änderungen |
|-------|------------|
| `src/shared/types/git.protocol.ts` | 6 neue Message-Typen + 2 neue Interfaces (`GitPrInfo`, `GitRevertResult`) |
| `src/server/services/git.service.ts` | 3 neue Methoden: `revertFiles`, `deleteUntrackedFile`, `getPrInfo` + PR-Cache |
| `src/server/handlers/git.handler.ts` | 3 neue Handler: `handleRevert`, `handleDeleteUntracked`, `handlePrInfo` |
| `src/server/websocket.ts` | 3 neue Case-Branches im Message-Switch + 3 Proxy-Methoden |
| `ui/src/gateway.ts` | 3 neue Gateway-Methoden: `sendGitRevert`, `sendGitDeleteUntracked`, `requestGitPrInfo` |
| `ui/src/app.ts` | State für PR-Info, Handler für Revert/Delete/PR-Responses, Commit & Push Orchestrierung |
| `ui/src/components/git/aos-git-status-bar.ts` | PR-Badge Rendering, "Commit & Push" Button, neue Property für PR-Daten |
| `ui/src/components/git/aos-git-commit-dialog.ts` | Revert/Delete Action-Buttons pro Datei, "Alle reverten" Button, `autoPush` Property |
| `ui/src/styles/theme.css` | CSS für PR-Badge, Revert/Delete-Buttons, Commit-and-Push Progress States |

---

## Component Connections

| Source | Target | Data/Event | Feature |
|--------|--------|-----------|---------|
| `aos-git-commit-dialog` | `app.ts` | `@revert-file` event `{ path }` | FR1 |
| `app.ts` | `gateway.ts` | `gateway.sendGitRevert(paths)` | FR1 |
| `gateway.ts` | Backend websocket.ts | WS message `git:revert` | FR1 |
| `websocket.ts` | `git.handler.ts` | `handleRevert(client, message, projectPath)` | FR1 |
| `git.handler.ts` | `git.service.ts` | `revertFiles(projectPath, files)` | FR1 |
| Backend response | `app.ts` | `git:revert:response` handler → refresh | FR1 |
| `aos-git-commit-dialog` | `app.ts` | `@revert-all` event | FR1 |
| `aos-git-commit-dialog` | `app.ts` | `@delete-untracked` event `{ path }` | FR2 |
| `app.ts` | `gateway.ts` | `gateway.sendGitDeleteUntracked(path)` | FR2 |
| `gateway.ts` | Backend | WS message `git:delete-untracked` | FR2 |
| `git.handler.ts` | `git.service.ts` | `deleteUntrackedFile(projectPath, filePath)` | FR2 |
| Backend response | `app.ts` | `git:delete-untracked:response` handler → refresh | FR2 |
| `app.ts` | `gateway.ts` | `gateway.requestGitPrInfo()` (on status load) | FR3 |
| `gateway.ts` | Backend | WS message `git:pr-info` | FR3 |
| `git.handler.ts` | `git.service.ts` | `getPrInfo(projectPath)` | FR3 |
| Backend response | `app.ts` | `git:pr-info:response` → stores PR state | FR3 |
| `app.ts` | `aos-git-status-bar` | `.prInfo` property | FR3 |
| `aos-git-status-bar` | Browser | `window.open(prUrl)` on badge click | FR3 |
| `aos-git-status-bar` | `app.ts` | `@open-commit-dialog` event `{ autoPush: true }` | FR4 |
| `app.ts` | `aos-git-commit-dialog` | `.autoPush` property | FR4 |
| `aos-git-commit-dialog` | `app.ts` | `@git-commit` event `{ files, message, autoPush }` | FR4 |
| `app.ts` (orchestrator) | `gateway.ts` | After commit success: `gateway.requestGitPush()` | FR4 |

---

## Implementation Phases

### Phase 1: Protocol & Backend (Story 1)
**Ziel:** Alle neuen Backend-Funktionen sind funktional und via WebSocket testbar.

1. **git.protocol.ts erweitern** -- 6 neue Message-Typen + Interfaces
2. **git.service.ts erweitern** -- `revertFiles()`, `deleteUntrackedFile()`, `getPrInfo()` + PR-Cache
3. **git.handler.ts erweitern** -- 3 neue Handler-Methoden
4. **websocket.ts erweitern** -- 3 neue Case-Branches + Proxy-Methoden

### Phase 2: Commit-Dialog Erweiterungen (Story 2)
**Ziel:** Revert/Delete Aktionen pro Datei im Commit-Dialog.

1. **aos-git-commit-dialog.ts** -- Revert/Delete Buttons pro Datei-Zeile, "Alle reverten" Button, Bestätigungs-Dialog für Delete, `autoPush` Property
2. **gateway.ts** -- `sendGitRevert()`, `sendGitDeleteUntracked()` Methoden
3. **app.ts** -- Handler für `revert-file`, `revert-all`, `delete-untracked` Events + Response-Handler
4. **theme.css** -- CSS für Action-Buttons

### Phase 3: PR-Badge in Status-Leiste (Story 3)
**Ziel:** PR-Information als klickbarer Badge in der Status-Leiste.

1. **gateway.ts** -- `requestGitPrInfo()` Methode
2. **app.ts** -- PR-State, Handler, PR-Info bei Status-Load anfragen
3. **aos-git-status-bar.ts** -- PR-Badge Rendering mit Status-Farben
4. **theme.css** -- CSS für PR-Badge

### Phase 4: Commit & Push Workflow (Story 4)
**Ziel:** "Commit & Push" Button mit Auto-Push nach Commit.

1. **aos-git-status-bar.ts** -- "Commit & Push" Button
2. **app.ts** -- Commit & Push Orchestrierung (commit → push Sequenz)
3. **aos-git-commit-dialog.ts** -- Progress-States (committing/pushing)
4. **theme.css** -- CSS für Commit & Push Button und Progress

---

## Dependencies

| Phase | Abhängig von | Grund |
|-------|-------------|-------|
| Phase 2 (Dialog) | Phase 1 (Backend) | Revert/Delete UI braucht Backend-Endpoints |
| Phase 3 (PR Badge) | Phase 1 (Backend) | PR-Info kommt vom Backend |
| Phase 4 (Commit & Push) | Phase 2 (Dialog) | Nutzt den erweiterten Commit-Dialog |

**Empfohlene Reihenfolge:** Phase 1 → Phase 2 → (Phase 3 + Phase 4 parallel)

---

## Risks & Mitigations

| Risiko | Impact | Wahrscheinlichkeit | Mitigation |
|--------|--------|---------------------|-----------|
| `gh` CLI nicht installiert | PR-Badge fehlt | Mittel | Graceful Fallback: `getPrInfo` gibt `null` zurück. UI versteckt Badge. Kein Error-Toast. |
| Revert bei Merge-Konflikten | Fehler verwirrend | Niedrig | stderr parsen, "Datei hat Konflikte - Revert nicht möglich" anzeigen |
| `fs.unlink` fehlschlägt (Permissions) | Delete scheitert | Niedrig | Error in Response, Toast "Datei konnte nicht gelöscht werden" |
| Push fehlschlägt nach Commit | User verwirrt | Mittel | Klar kommunizieren "Commit erfolgreich, Push fehlgeschlagen". Refresh zeigt ahead+1. |
| PR-Cache zeigt veraltete Daten | Badge falsch | Niedrig | 60s TTL + Invalidierung bei Branch-Wechsel |
| Viele Action-Buttons bei langer Dateiliste | Visual Clutter | Mittel | Action-Buttons klein (16x16), erscheinen bei Hover |

---

## Self-Review Results

**1. COMPLETENESS** -- Alle vier Features (FR1-FR4) sind abgedeckt. FR1 (Revert einzeln + batch), FR2 (Delete untracked mit Bestätigung), FR3 (PR-Badge mit Nummer, Status, Link), FR4 (Commit & Push mit Auto-Push). Alle Edge Cases aus dem Requirements-Dokument sind in der Risiko-Tabelle adressiert.

**2. CONSISTENCY** -- Alle neuen Message-Typen folgen dem `git:<action>` / `git:<action>:response` Pattern. Alle Service-Methoden folgen dem `execGit`/`execFileAsync` Pattern. Alle Handler folgen dem try/catch/sendGitError Pattern. Commit-Dialog-Erweiterungen nutzen Light DOM, BEM-Klassen und Event-Dispatch.

**3. RISKS** -- Höchstes Risiko: "Push fehlschlägt nach Commit" in FR4. Mitigation solide: separate Phasen mit klarem Feedback. `gh` CLI Dependency für PR-Info ist portability-relevant, aber graceful degradation explizit dokumentiert.

**4. ALTERNATIVES**
- *Revert*: `git restore --staged --worktree <file>` (Git 2.23+) → Abgelehnt: `git checkout --` universell verfügbar.
- *PR-Info*: GitHub REST API → Abgelehnt: benötigt Token, `gh` nutzt bestehende Auth.
- *Commit & Push*: Einzelnes Backend-Endpoint → Abgelehnt: neues Pattern, kann bestehenden Push-Response-Handler nicht nutzen.
- *Delete*: `git clean -f -- <file>` → Abgelehnt: gefährliche Flag-Kombinationen, `fs.unlink` expliziter.

**5. COMPONENT CONNECTIONS** -- Jede neue Komponenten-Interaktion hat Source, Target und zuständige Story. Keine verwaisten Komponenten. Alle Events aus Commit-Dialog werden in `app.ts` behandelt. Alle Gateway-Methoden haben Backend-Handler. Alle Backend-Responses haben `gateway.on()` Listener.

---

## Minimal-Invasive Optimizations

1. **Null neue Dateien.** Alle Änderungen in den 9 bestehenden Dateien. Saubere Projektstruktur.

2. **Reuse `aos-confirm-dialog`.** Delete-Bestätigung nutzt den bestehenden Dialog (bereits für Branch-Wechsel im Einsatz).

3. **Reuse Gateway-Pattern.** Die 3 neuen Gateway-Methoden folgen exakt `this.send({ type, ..., timestamp })`.

4. **Reuse `_handleRefreshGit`.** Nach Revert und Delete: bestehende Refresh-Funktion aufrufen, kein neuer Refresh-Code.

5. **Commit & Push nutzt bestehende Messages.** Kein neues Backend-Endpoint. Orchestrierung rein in `app.ts` mit existierenden `git:commit` und `git:push` Messages.

6. **PR-Cache in-memory.** Einfache `Map<string, { data, timestamp }>` im Service. Keine Persistenz nötig.

7. **CSS folgt BEM.** Alle neuen Klassen nutzen bestehende `git-status-bar__` und `git-commit-dialog__` Prefixe.

---

## Feature-Preservation Checklist
- [x] Alle Requirements aus der Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erreichbar

---
*Status: PENDING_USER_REVIEW*
