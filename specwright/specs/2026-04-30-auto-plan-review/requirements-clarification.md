# Requirements Clarification - Auto-Plan-Review

**Created:** 2026-04-30
**Status:** Pending User Approval
**Source:** Brainstorming Session 2026-04-30-13-16-automated-review-loop

## Feature Overview

Automatisierter Plan-Review-Loop in der Specwright UI: Nach jeder Plan-Erstellung in einem Cloud-Terminal-Tab (Plan-Modus) wird optional ein zweites Modell (z.B. DeepSeek, GLM, Kimi) als Reviewer aufgerufen. Dessen Feedback wird automatisch in die laufende Session injiziert, sodass das Original-Modell den Plan überarbeitet — alles ohne manuelles Tab-Hopping oder Copy-Paste.

## Target Users

Specwright-Nutzer, die im Cloud-Terminal mit Opus (oder anderen Anthropic-Modellen) im Plan-Modus arbeiten und parallel ein Zweitmodell als Reviewer einsetzen wollen, um Plan-Qualität zu erhöhen.

## Business Value

- Eliminiert repetitiven Cross-Model-Review-Workflow (~5-10 Minuten Handarbeit pro Plan-Iteration)
- Erhöht Planqualität durch automatischen externen Sanity-Check
- Nutzt vorhandene Multi-Provider-Infrastruktur (`CLAUDE_CONFIG_DIR`-Wrapper)
- Senkt Einstiegshürde für Multi-Model-Workflows (heute: zwei Terminals manuell jonglieren)

## Functional Requirements

1. **Auto-Review-Toggle pro Tab** im Cloud-Terminal-Tab-Header (an/aus)
2. **Reviewer-Modell-Auswahl (Multi-Select)** im Tab-Header — alle in `model-config.ts` registrierten Multi-Provider auswählbar; **mehrere Reviewer gleichzeitig optional**
3. **Plan-Detection:** Backend erkennt ExitPlanMode-Stream-Event der Claude-SDK-Session
4. **Reviewer-Spawn:** Pro ausgewähltem Modell eine eigene Claude-SDK-Session via `CLAUDE_CONFIG_DIR=~/.claude-{provider}`. Sessions laufen parallel.
5. **Identischer Review-Prompt für alle Reviewer** — derselbe Prompt aus UI-Settings wird an jedes Reviewer-Modell geschickt; nur das Modell unterscheidet sich
6. **Aggregierte Review-Outputs:** Alle Reviewer-Ergebnisse werden gesammelt und gemeinsam als User-Message in Original-Session injiziert (mit Modell-Labels: "Review von DeepSeek: ... Review von GLM: ...")
7. **Inject-Loop:** Aggregiertes Review wird der Original-Session übergeben mit Aufforderung zur Plan-Überarbeitung
8. **1 Iteration fix** — kein Multi-Round-Loop, aber innerhalb der einen Iteration n Reviewer-Modelle parallel
9. **Sichtbarer Review-Block** im UI: collapsible (default eingeklappt), zeigt **pro Reviewer-Modell** einen einklappbaren Sub-Block zwischen Original-Plan und überarbeiteter Version
10. **Editierbarer Default-Review-Prompt** in den UI-Settings (zentral, einmal definiert, von allen Reviewern genutzt)
11. **Settings-Persistenz pro Tab/Session** — Toggle + Reviewer-Auswahl (n Modelle) bleiben für Tab-Lebensdauer, beim Tab-Schließen verworfen

## Affected Areas & Dependencies

- **`ui/src/server/services/cloud-terminal-manager.ts`** — Hook auf ExitPlanMode-Event, Auto-Review-Branch
- **`ui/src/server/services/`** (neu) — `plan-review-orchestrator.ts`, `external-reviewer.ts`, `review-prompt-store.ts`
- **`ui/src/server/model-config.ts`** — wiederverwendet als Provider-Registry (keine Änderung)
- **`ui/src/server/websocket.ts`** — neue Message-Types (Review-Block-Stream)
- **`ui/src/shared/types/`** (neu) — `plan-review.protocol.ts`
- **`ui/frontend/src/components/terminal/`** (neu) — `aos-plan-review-block.ts`, `aos-auto-review-toggle.ts`
- **`ui/frontend/src/components/settings/`** (neu) — `aos-review-prompt-editor.ts`
- **Externes:** `~/.claude-{provider}/settings.json` (DeepSeek/GLM/Kimi/Gemini bereits konfiguriert) — keine Änderung
- **Claude-Code-SDK** — Stream-Event-Filterung für ExitPlanMode

## Edge Cases & Error Scenarios

- **Einzelner Reviewer schlägt fehl** (Provider down, Config fehlt): Best-effort — übrige Reviewer liefern, fehlgeschlagener wird übersprungen, kein Abbruch
- **Alle Reviewer schlagen fehl**: Original-Plan ohne Review weitergeben (kein Inject)
- **Reviewer-Output leer**: dieser Reviewer übersprungen, Aggregat ohne ihn
- **Toggle aus**: Plan-Output normal, kein Review
- **Kein Reviewer ausgewählt trotz Toggle an**: Behandeln wie Toggle aus (oder Warnung im UI)
- **Tab gewechselt während Review läuft**: Review läuft im Backend zu Ende, Ergebnis erscheint beim Zurückwechseln
- **Plan sehr groß**: Reviewer-Modell-Context-Limit kann überschritten werden — kein Cap, einzelner Reviewer-Fail führt zum Skip, andere laufen weiter
- **Mehrere Plan-Modi nacheinander im selben Tab**: jeder Plan löst eigenen Review-Cycle aus (sofern Toggle an)

## Security & Permissions

- **API-Keys**: liegen ausschließlich in `~/.claude-{provider}/settings.json` (existierende Provider-Configs), keine UI-Eingabe nötig, keine Speicherung im Specwright-Repo
- **Review-Output**: bleibt lokal, wird nur per WebSocket an UI gestreamt (keine externe Speicherung)
- **Editierbarer Prompt**: keine Sicherheitsrisiken (User editiert eigenen Default), aber Validierung gegen leere Strings sinnvoll

## Performance Considerations

- **Latenz:** Plan-Erstellung verlängert sich um längsten Reviewer-Roundtrip (typisch 10-30s) — Reviewer laufen parallel, daher Gesamt-Latenz ≈ langsamster Reviewer, nicht Summe
- **Parallelität:** Reviewer-Sessions laufen parallel via Promise.allSettled() — Original-Session bleibt unblockiert
- **Streaming:** Pro Reviewer Stream ins UI in eigenen Sub-Block, nicht warten bis alle fertig
- **Aggregation:** Inject in Original-Session erst wenn alle Reviewer fertig (oder Timeout) — kein Stream-by-Stream-Inject
- **Keine Caching-Anforderung** für v1

## Scope Boundaries

**IN SCOPE:**
- Opt-in Auto-Review-Toggle pro Tab im Cloud-Terminal-Header
- Reviewer-Modell-Multi-Select (1..n Modelle parallel aus `model-config.ts`)
- Identischer Review-Prompt für alle Reviewer (zentral aus UI-Settings)
- Review-Prompt-Editor in UI-Settings
- Plan-Detection via ExitPlanMode-Event
- Parallele Reviewer-Spawns via `CLAUDE_CONFIG_DIR`-Switch (1..n)
- Aggregation aller Reviewer-Outputs mit Modell-Labels
- Inject aggregiertes Review zurück in Original-Session
- Collapsible Review-Block mit Sub-Blöcken pro Reviewer
- 1 Iteration fix (innerhalb dieser Iteration n Reviewer parallel)
- Settings volatil pro Tab/Session

**OUT OF SCOPE:**
- Multi-Iteration-Loops (mehr als 1 Review-Runde)
- Pro-Reviewer unterschiedliche Prompts (Prompt ist immer identisch über alle Reviewer)
- Failure-Recovery / Retries / Fallback-Modelle bei Komplettausfall
- Token-Budget-Caps oder Cost-Tracking
- Per-Projekt-Persistenz von Toggle/Modell-Wahl
- Per-Projekt-Override des Review-Prompts (nur globaler Default in v1)
- Reviewer-Modelle jenseits von `model-config.ts` (z.B. lokale LLMs)
- Auto-Review für andere Modi (z.B. Tool-Use-Output)

## Open Questions

Keine — alle in Brainstorming geklärt.

## Proposed User Stories (High Level)

1. **Backend: ExitPlanMode-Event-Detection** — `cloud-terminal-manager.ts` erkennt Plan-Output und liefert Plan-Payload
2. **Backend: External-Reviewer-Service** — Service spawnt Claude-SDK-Session mit Provider-spezifischem `CLAUDE_CONFIG_DIR`, kann parallel n-mal aufgerufen werden
3. **Backend: Review-Prompt-Store** — JSON-basierter Store für editierbaren Default-Review-Prompt
4. **Backend: Plan-Review-Orchestrator** — koordiniert Detection → parallele Reviewer-Spawns (Promise.allSettled) → Aggregation → Inject zurück in Original-Session
5. **Backend: WebSocket-Protocol** — neue Message-Types für Review-Block-Stream (pro Reviewer eigenes Stream-Topic)
6. **Frontend: Tab-Header Toggle + Reviewer-Multi-Select** — Lit-Component im Cloud-Terminal-Tab-Header (Toggle + n Modelle wählbar)
7. **Frontend: Review-Block UI** — Container collapsible, darin Sub-Blöcke pro Reviewer-Modell, eingebettet zwischen Original- und Updated-Plan
8. **Frontend: Settings-Editor für Review-Prompt** — Lit-Component im UI-Settings für Prompt-Bearbeitung
9. **Integration: End-to-End-Flow** — Toggle an + n Reviewer aktiv → Plan → parallele Reviews → aggregiertes Inject → Updated Plan im selben Tab

---
*Review carefully. Approve to proceed to Implementation Plan.*
