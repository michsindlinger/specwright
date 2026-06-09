# Code Review Report - Spec-Priorisierung & Abhängigkeits-Sequenzierung

**Datum:** 2026-06-09
**Branch:** main (current-branch strategy — feature commits `585170b`…`0d452c1`)
**Reviewer:** Claude (Opus 4.8)

## Review Summary

**Geprüfte Commits:** 9 feature commits (SPD-001…SPD-009) + post-completion syncs
**Geprüfte Dateien:** 19 (13 Code + 5 Tests + 1 Workflow)
**Gefundene Issues:** 3

| Schweregrad | Anzahl |
|-------------|--------|
| Critical | 0 |
| Major | 1 |
| Minor | 2 |

> **Scope-Hinweis:** Der Commit-Range `585170b^..HEAD` enthält zusätzlich die
> unverwandte Auto-Deploy-PR (`6a3bffe` / Merge `97ee0dc`). Die Dateien
> `ui/src/server/index.ts`, `ui/src/server/workflow-executor.ts` und
> `ui/tests/unit/deploy-readiness-gate.test.ts` gehören NICHT zu dieser Spec und
> wurden vom Review ausgeschlossen.

## Spec-Conformance

### Expected Deliverable Checklist
| Deliverable (aus spec.md) | Implementiert? | Files / Notes |
|---------------------------|----------------|---------------|
| Priorität P0–P3: Badge + Editor + Sortier-Modus | ✅ | `aos-priority-badge.ts`, `dashboard-view.ts` (sort selector + `getSortedSpecs`) |
| Abhängigkeiten `blockedBy`, bidirektional, Zyklus-Prüfung | ✅ | `aos-spec-dependency-editor.ts`, `spec-graph.wouldCreateCycle`, `handleSpecsSetBlockedBy` |
| Abgeleiteter Karten-Status 🟢/🔒 + "blockiert durch" | ✅ | `deriveDependencyStatus`, `spec-card.ts` blocked hint |
| Reihenfolge-Ansicht (topo. Liste, Zyklus-Warnung, "noch nicht eingeordnet") | ✅ | `aos-spec-order-view.ts` |
| KI-Analyse aus spec-lite + Eskalation + Propose-&-Confirm | ✅ | `dependency-analysis.service.ts`, `aos-dependency-proposal-dialog.ts` |
| Backfill + Re-Analyse + Cleanup bei Löschung | ✅ | order-view buttons, `cleanupBlockedByRef`, `deleteSpec` |
| Persistenz `spec.priority`/`spec.blockedBy` (lock-safe, Broadcast) | ✅ | `setSpecPriority`/`setSpecBlockedBy` via `withKanbanLock` |
| `/create-spec`-Workflow Analyse-Schritt | ✅ | `create-spec.md` v3.17 (Step 7.5 lean / 8.25 classic) |

### Plan-Validation Results (Verbindungs-Matrix)
**Geprüft:** 0 — die Verbindungs-Matrix in `implementation-plan.md` hat keine
"Validierung"-Spalte (nur Source/Target/Phase). Plan-Validation-Greps übersprungen.

### Scope Compliance
- **In-Scope deliverables present:** 8/8
- **Out-of-Scope-Violations:** 0 (Auto-Mode unangetastet, keine Graph-Viz, kein Hard-Locking, kein Drag-&-Drop, keine Task-Ebene-Änderungen)
- **Plan-Drift (undocumented files):** 0 (alle SPD-Code-Dateien entsprechen der Komponenten-Übersicht)

### Requirements (aus requirements-clarification.md)
| Acceptance Criterion | Erfüllt? | Implementation Reference |
|----------------------|----------|--------------------------|
| Priorität/Abhängigkeit getrennte Konzepte; Abhängigkeit gewinnt | ✅ | `computeRecommendedOrder` (topo zuerst, Priorität nur Tiebreak) |
| Done-Vorgänger automatisch erfüllt; nur aktive Specs wählbar | ✅ | `deriveDependencyStatus`, `_activeOtherSpecs` |
| Zyklus A→B→A wird abgelehnt | ✅ | `wouldCreateCycle` Vor-Validierung im WS-Handler |
| Bidirektionale Kante landet im `blockedBy` der abhängigen Spec | ✅ | `handleDepEditorSave` (out-edge → target.blockedBy) |
| Propose-&-Confirm, nicht still gesetzt | ✅ | `aos-dependency-proposal-dialog`, `handleProposalsApply` |
| Niedrige Konfidenz → "⚠ bitte prüfen", nicht raten | ✅ | `needsReview` flag in `analyze()` |
| Abwärtskompatibel (optionale Felder) | ✅ | konditionale Spread bei `getSpecInfo`/`getKanbanBoard` |

## Geprüfte Dateien

**Backend:** `spec-graph.ts`, `spec-dependencies.protocol.ts`, `specs-reader.ts`, `websocket.ts`, `dependency-analysis.service.ts`
**Frontend:** `aos-priority-badge.ts`, `aos-spec-dependency-editor.ts`, `aos-spec-order-view.ts`, `aos-dependency-proposal-dialog.ts`, `spec-card.ts`, `dashboard-view.ts`, `theme.css`
**Tests:** `spd-001`…`spd-008` (5 Dateien, 72 Tests — alle grün)
**Workflow:** `create-spec.md`

## Issues

### Critical Issues
Keine gefunden.

### Major Issues
1. **`aos-spec-order-view.ts` — Done-Specs als Zyklus fehlklassifiziert.**
   Eine Spec ohne `orderIndex` ist entweder *fertig* (von `computeRecommendedOrder`
   ausgeschlossen) ODER *zyklisch*. Die Komponente warf beide in `cyclicSpecs` und
   zeigte fertige Specs unter dem Banner "⚠ Zyklus erkannt" / "noch nicht eingeordnet",
   sobald "Nur aktive" abgewählt war und `dashboard-view.renderSpecsOrderView` auch
   abgeschlossene Specs durchreichte. → Falsche, irreführende Zyklus-Warnung.
   **Fix:** `cyclicSpecs`-Filter um `&& !isDone(s)` ergänzt (fertige Specs werden
   nicht mehr als zyklisch markiert; sie tauchen mangels `orderIndex` ohnehin nicht
   in der nummerierten Liste auf — konsistent mit dem Backend-Verhalten).

### Minor Issues
2. **`dashboard-view.ts:renderSpecsOrderView` — abweichende "aktiv"-Definition.**
   Der Inline-Filter `!s.hasKanban || s.completedCount !== s.storyCount` behandelt
   eine Kanban-Spec mit 0 Stories als "fertig" (`0 !== 0` = false) und blendet sie
   bei aktivem "Nur aktive" aus der Reihenfolge-Ansicht aus, obwohl das Backend sie
   ordnet (`isDone` verlangt `storyCount > 0`). Kosmetischer Randfall, nur bei einer
   frisch angelegten Kanban-Spec ohne Stories sichtbar. **Nicht gefixt** (geringe
   Auswirkung; Änderung der etablierten Filter-Semantik wäre unverhältnismäßig).
3. **`aos-priority-badge.ts` — `setTimeout(…,0)` Close-Handler.**
   Wird die Komponente innerhalb des 0-ms-Fensters getrennt, feuert der Timer mit
   bereits genulltem `_closeHandler` (→ `addEventListener('click', null)`, per Spec
   No-op, kein Crash). Funktional unkritisch. **Nicht gefixt.**

## Fix Status

| # | Schweregrad | Issue | Status | Fix-Details |
|---|-------------|-------|--------|-------------|
| 1 | Major | Done-Specs als Zyklus fehlklassifiziert (order-view) | fixed | `cyclicSpecs`-Filter um `!isDone(s)` ergänzt |
| 2 | Minor | Abweichende "aktiv"-Definition (renderSpecsOrderView) | skipped | Kosmetisch, Randfall; Filter-Semantik bewusst stabil gelassen |
| 3 | Minor | `setTimeout(…,0)` Close-Handler (priority-badge) | skipped | Per Spec No-op, kein Crash |

## Re-Review

**Datum:** 2026-06-09
**Geänderte Dateien (Fix):** `ui/frontend/src/components/aos-spec-order-view.ts`
**Verifikation nach Fix:**
- `cd ui/frontend && npm run build` → exit 0 (TS strict, type-checked)
- `eslint src/components/aos-spec-order-view.ts` → exit 0
- Keine neuen Issues durch den Fix eingeführt.

## Integration-Test-Ergebnisse

| Befehl | Ergebnis |
|--------|----------|
| `cd ui && npm test` | SPD-Tests: **72/72 grün** (5 Dateien). 22 Failures in unverwandten Suites (`terminal-io`, `terminal-multi`, `websocket-terminal`, `workflow`, `model-config`, …) — vorbestehend, umgebungsbedingt (node-pty/TTY), nicht von dieser Spec berührt. |
| `cd ui && npm run lint` | exit 0 |
| `cd ui && npm run build:backend` | exit 0 |
| `cd ui/frontend && npm run build` | exit 0 |

## Empfehlungen
- Die `isDone`-Logik ist an drei Stellen dupliziert (`spec-graph` via `enrichWithGraphState`, `dependency-analysis.service`, `aos-spec-dependency-editor`, jetzt auch `aos-spec-order-view`). Bei künftiger Erweiterung erwägen, sie als kleine geteilte Hilfsfunktion zu zentralisieren (kein Blocker für v1).
- Die KI-Analyse validiert `from`/`to` nicht gegen existierende Spec-IDs; Halluzinationen werden erst durch die Graph-Logik (Dangling-Refs ignoriert) bzw. den Confirm-Schritt abgefangen — für v1 akzeptabel.

## Fazit
**Review passed (after fixes).** Alle Spec-Deliverables vorhanden, Out-of-Scope eingehalten,
Backend lock-safe nach `assignedToBot`-Muster, Zyklus-Prüfung korrekt. 1 Major-Issue
(irreführende Zyklus-Warnung) auto-gefixt und re-verifiziert; 2 Minor-Issues bewusst
nicht gefixt (kosmetisch/funktional unkritisch). Builds, Lint und alle SPD-Tests grün.
