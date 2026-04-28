# Code Review Report — Global Claude Concurrency Cap

**Datum:** 2026-04-28
**Branch:** feature/global-claude-concurrency-cap
**Reviewer:** Claude (Opus)

## Review Summary

**Geprüfte Commits:** 1 (c3e1ecd) + uncommitted Working-Tree-Stand der Stories CCG-002, CCG-003, CCG-004
**Geprüfte Dateien:** 7
**Gefundene Issues:** 2

| Schweregrad | Anzahl |
|-------------|--------|
| Critical | 0 |
| Major | 1 |
| Minor | 1 |

## Spec-Conformance

### Expected Deliverable Checklist

| Deliverable (aus spec.md) | Implementiert? | Files / Notes |
|---------------------------|----------------|---------------|
| Statische Counter + Helper in `ProjectConcurrencyGate` | ✅ | `ui/src/server/services/project-concurrency-gate.ts` |
| Wrap an `workflow-executor.ts` (3 Sites) | ✅ | `runClaudeCommand` (1808+), `resumeWithAnswer` (2612+); Fallback `--print` (488+) ist transitiv abgedeckt — Codepfad geht über `runClaudeCommand` (Line 868) |
| Wrap an `claude-handler.ts` (2 Sites) | ✅ | `streamClaudeCodeResponse` (330+), `streamClaudeCodeResponseWithImages` (498+) |
| WS-Event `chat.queued` mit minimal-Payload | ✅ | Beide Chat-Pfade emittieren `{ type, reason, state }` vor blockierender acquire |
| Frontend-Banner in Chat-Component | ✅ | `ui/frontend/src/views/chat-view.ts` + `ui/frontend/src/styles/theme.css` |
| Test-Erweiterung (Unit + Integration) | ✅ | 13 Unit-Cases + 3 Integration-Cases (Soll: ≥8 Unit) |
| README-Notiz zur env-Variable `SPECWRIGHT_GLOBAL_CLAUDE_CONCURRENCY` | ✅ | Auto-fixed: Environment-Variables-Section in `README.md` ergänzt |

### Plan-Validation Results (Verbindungs-Matrix)

Implementation-Plan enthält keine "Verbindungs-Matrix"-Tabelle (`Source/Target/Validierung`) → Plan-Validation-Schritt übersprungen.

### Scope Compliance

- **In-Scope deliverables present:** 7/7
- **Out-of-Scope-Violations:** 0
- **Plan-Drift (undocumented files):** 0

Alle Modifikationen liegen in den im Plan benannten Dateien.

### Requirements (aus requirements-clarification.md)

| Acceptance Criterion | Erfüllt? | Implementation Reference |
|----------------------|----------|--------------------------|
| Globaler Cap = 2, env-konfigurierbar (Hard-Ceiling 4) | ✅ | `project-concurrency-gate.ts:6-9` (`Math.min(env, 4)`) |
| Gegated: Auto-Mode-Slots, runClaudeCommand, Resume, Fallback `--print`, Chat | ✅ | Alle Pfade via `acquireGlobalOnly`/Instance-`acquire` gegated |
| Ungegated: Cloud-Terminal-Sessions | ✅ | Cloud-Terminal-Manager nicht angefasst |
| WS-Event `chat.queued` an blockierten Client | ✅ | `claude-handler.ts:330-339`, `498-507` |
| Backwards-Compatible Public Instance-API | ✅ | `acquire`, `release`, `drain` Signaturen unverändert |

## Geprüfte Dateien

| Datei | Status | Stories |
|-------|--------|---------|
| `ui/src/server/services/project-concurrency-gate.ts` | Modified (+ Auto-Fix) | CCG-001, CCG-005 |
| `ui/src/server/workflow-executor.ts` | Modified | CCG-002 |
| `ui/src/server/claude-handler.ts` | Modified | CCG-003 |
| `ui/frontend/src/views/chat-view.ts` | Modified | CCG-004 |
| `ui/frontend/src/styles/theme.css` | Modified | CCG-004 |
| `ui/tests/unit/project-concurrency-gate.test.ts` | Added (+ Auto-Fix) | CCG-005 |
| `ui/tests/integration/global-gate-cross-orchestrator.test.ts` | Added | CCG-005 |
| `README.md` | Modified (Auto-Fix) | CCG-997 |

## Issues

### Critical Issues
Keine gefunden.

### Major Issues

**M-1: Stampede-Race in `releaseGlobal` + `acquireGlobalOnly` lässt Cap überschreiten**

- **Datei:** `ui/src/server/services/project-concurrency-gate.ts:63-80` (vor Fix)
- **Beschreibung:** Die in CCG-005 ("fix releaseGlobal counter bug") eingeführte Variante decrementiert in `releaseGlobal` IMMER und lässt `acquireGlobalOnly` IMMER nach dem `await` incrementieren. Sequence:
  1. `release()` (sync): `_globalRunning--` (max−1), shift Waiter, signal Promise
  2. Synchroner neuer Caller `acquire()` läuft im selben Tick: Check `count < max` ist true → `_globalRunning++` (zurück auf max). Returnt sofort.
  3. Waiter-Microtask wacht auf: `_globalRunning++` (max+1) → **Cap überschritten**.
- **Auswirkung:** In Stampede-Scenario (Release im Event-Handler, neuer Spawn im selben Tick getriggert) kann `globalActive > globalMax` werden. Defeats den eigentlichen Zweck des Caps.
- **Fix (angewandt):** Canonical Hand-off-Pattern:
  - `releaseGlobal`: Wenn Waiter vorhanden → shift + signal **ohne** Counter-Decrement (Slot-Transfer); sonst decrement.
  - `acquireGlobalOnly` / `acquire`: Wenn Fast-Path → increment; wenn await → **kein** Increment nach Wakeup (Slot wurde übertragen).
- **Regression-Test:** `tests/unit/project-concurrency-gate.test.ts` Suite "stampede invariant" — release + sync-acquire im selben Tick darf Cap nicht überschreiten.

### Minor Issues

**m-1: README env-Variable nicht dokumentiert**

- **Datei:** `README.md`
- **Beschreibung:** Spec-Scope nennt explizit "README-Notiz zur env-Variable `SPECWRIGHT_GLOBAL_CLAUDE_CONCURRENCY`". Vor dem Fix gab es keinen Eintrag.
- **Fix (angewandt):** Section "Environment Variables" mit Tabelle (`PORT`, `SPECWRIGHT_GLOBAL_CLAUDE_CONCURRENCY`) unter "### Start the UI" ergänzt. Default 2, Hard-Ceiling 4, Hinweis auf Anthropic-Throttling-Tradeoff.

## Fix Status

| # | Schweregrad | Issue | Status | Fix-Details |
|---|-------------|-------|--------|-------------|
| 1 | Major | Stampede-Race überschreitet Cap | fixed | Hand-off in `releaseGlobal`, kein Increment-after-await in `acquire`/`acquireGlobalOnly`. Regression-Test ergänzt (Suite "stampede invariant"). |
| 2 | Minor | README env-Variable fehlt | fixed | "Environment Variables"-Section in `README.md` ergänzt. |

## Re-Review

**Datum:** 2026-04-28
**Geänderte Dateien (Re-Review-Scope):**
- `ui/src/server/services/project-concurrency-gate.ts` — Hand-off-Pattern korrekt implementiert, Public-API (`acquire`/`release`/`drain`) signaturengleich.
- `ui/tests/unit/project-concurrency-gate.test.ts` — Neue Suite "stampede invariant" deckt das Race ab.
- `README.md` — Doku-only-Change.

**Verifikation:**
- `npx vitest run tests/unit/project-concurrency-gate.test.ts tests/integration/global-gate-cross-orchestrator.test.ts` → **16/16 grün**
- `npm run lint` → **0 errors**
- `npm run build:backend` → **OK** (`tsc -p tsconfig.json` exit 0)
- `npm --prefix frontend run build` → **OK** (Vite warnt nur über Chunk-Size, keine Fehler)

Keine neuen Issues durch Auto-Fix eingeführt.

## Empfehlungen

1. **integration-context.md** — manuell aktualisieren auf finalen Stand: CCG-002 ist done (heute noch "in_progress" im Text), CCG-004/005 nicht aufgeführt. Nicht blocking, aber hilft dem nächsten Story-Fenster.
2. **Pre-existing flaky tests** (`tests/unit/terminal-manager.test.ts` — `posix_spawnp failed`) liegen außerhalb dieses Specs und betreffen die node-pty-Umgebung. Vor PR-Erstellung kurz prüfen, ob der CI-Runner das gleiche Problem hat.
3. **Folge-Spec-Idee** — der globale Header-Indikator ("⚡ 2/2") ist Out-of-Scope laut Spec, würde nun aber `globalActive`/`globalMax`-Getter elegant nutzen können.

## Fazit

**Review passed (after fixes).**

Implementation deckt Spec-Scope vollständig ab. Major Stampede-Race in der Counter-Mechanik wurde behoben und durch einen Regression-Test abgesichert. Doku-Lücke geschlossen. Alle Acceptance-Tests grün, Lint und Builds clean.
