# Implementierungsplan: Spec-Priorisierung & Abhängigkeits-Sequenzierung

> Status: PENDING_USER_REVIEW
> Created: 2026-06-09
> Spec: 2026-06-09-spec-prioritization-dependencies

<!-- section:executive-summary -->
## Executive Summary

Das Feature erweitert die Spec-Übersicht um **Priorität (P0–P3)** und **Abhängigkeiten (`blockedBy`)** je Spec, eine **empfohlene Reihenfolge** (topologische Sortierung), sowie eine **KI-gestützte Abhängigkeits-Analyse** beim Spec-Anlegen.

Architektur-Leitidee: **`assignedToBot` ist der exakte End-to-End-Blueprint.** Genau wie `assignedToBot` werden `priority` und `blockedBy` als optionale Felder ins bestehende `kanban.json`-`spec`-Objekt geschrieben, lock-sicher über `withKanbanLock` mutiert (Muster `toggleBotAssignment`), via neuem WebSocket-Handler (Muster `specs.assign` → `webSocketManager.sendToProject`-Broadcast) aktualisiert und über `SpecInfo` (Backend + Frontend) zur Karte getragen. Es wird **keine neue Datei, keine neue Datenbank, kein neues SDK** eingeführt — die KI-Analyse nutzt die bereits vorhandene `@anthropic-ai/claude-agent-sdk` `query()`-Infrastruktur (Muster `external-reviewer.ts`).

Die Topo-Sortierung, Zyklus-Erkennung und der abgeleitete Karten-Status (🟢 Bereit / 🔒 Blockiert) sind **reine, datei-lose Backend-Funktionen** über die ohnehin geladene Spec-Liste — günstig bei realistischen Spec-Zahlen. Auto-Mode bleibt **unberührt** (locked decision): Reihenfolge ist rein visuell.

Scope umfasst 8 Implementierungsphasen, wovon die ersten 6 die Web-UI (Backend + Frontend) betreffen und Phase 7 die KI-Analyse, Phase 8 die Framework-Workflow-Anpassung von `create-spec.md`.

<!-- section:architecture-decisions -->
## Architecture Decisions

<!-- section:decision-1-mirror-assigned-to-bot -->
### 1. `assignedToBot` als Blueprint spiegeln

`priority`/`blockedBy` folgen exakt dem `assignedToBot`-Datenfluss: optional in `kanban.json` → in `getSpecInfo()` gelesen → `SpecInfo` (backend `specs-reader.ts` + frontend `spec-card.ts`) → Karte. Mutation: neue Methoden `setSpecPriority` / `setSpecBlockedBy` auf `SpecsReader`, gebaut wie `toggleBotAssignment` (read-modify-write innerhalb `withKanbanLock` via `readKanbanJsonUnlocked`/`writeKanbanJsonUnlocked` + `addChangeLogEntry`). Begründung: minimal-invasiv, bewährte Lock-Disziplin, kein neues Lese-/Schreibmuster.

<!-- section:decision-2-backward-compat-spec-object -->
### 2. Abwärtskompatible Erweiterung des `spec`-Objekts

`priority?: 'P0'|'P1'|'P2'|'P3'` und `blockedBy?: string[]` werden an `KanbanJsonSpec` (gemeinsames Sub-Interface von V1+V2) angehängt — beide optional. Bestands-Specs ohne Felder verhalten sich exakt wie heute (Datums-Sort, kein Badge). **Default P2 ist eine reine Anzeige-Konvention im Frontend** — es wird NICHT proaktiv in Dateien geschrieben (kein Massen-Write der Bestands-Specs). Begründung: Edge-Case "Default-Priorität P2 erst bei expliziter Vergabe".

<!-- section:decision-3-derived-state-backend -->
### 3. Abgeleiteter Zustand wird im Backend berechnet, nicht persistiert

`dependencyStatus` ('ready' | 'blocked'), `blockedByNames`, und die Reihenfolge-Position werden **on read** in `listSpecs()` aus dem geladenen Spec-Set berechnet (Pure Functions in neuem `spec-graph.ts`). Persistiert wird nur die rohe Kante `blockedBy`. Begründung: vermeidet Stale-State, keine zusätzliche Write-Last, Single Source of Truth = die Kanten.

<!-- section:decision-4-reuse-claude-sdk -->
### 4. KI-Analyse über bestehende `claude-agent-sdk`

Die Analyse-Logik kapselt einen neuen Service `dependency-analysis.service.ts`, der das `query()`-Muster aus `external-reviewer.ts` wiederverwendet (Anthropic-Provider via Default `~/.claude`, `permissionMode`, `withTimeout`, Result-Event-Schleife). **Kein neues SDK, keine API-Keys.** Eskalation (spec-lite → implementation-plan/spec) ist Datei-Auswahl-Logik im Service, kein neuer Transport. Begründung: Requirement "reuse existing infrastructure".

<!-- section:decision-5-propose-not-set -->
### 5. Propose-&-Confirm statt Auto-Set

Die KI setzt **nie** still Kanten. Der Analyse-Handler liefert `proposedEdges[]` (mit Richtung, Begründung, Konfidenz) an die UI zurück; erst nach User-Confirm werden `setSpecBlockedBy`-Mutationen ausgeführt. Begründung: spec-lite ist lossy; ein falscher Blocker vergiftet die Reihenfolge.

<!-- section:decision-6-bidirectional-write -->
### 6. Bidirektionale Kanten = immer Write ins `blockedBy` der abhängigen Spec

"A ist Voraussetzung für B" wird gespeichert als `B.blockedBy += A`. Es gibt nur EINE kanonische Speicherrichtung (`blockedBy`); die "ermöglicht/Voraussetzung-für"-Sicht ist eine invertierte Ableitung. Begründung: vermeidet doppelte Wahrheit.

<!-- section:component-overview -->
## Component Overview

<!-- section:new-components -->
### Neue Komponenten

| Komponente | Pfad | Zweck |
|---|---|---|
| Spec-Graph-Utils | `ui/src/server/utils/spec-graph.ts` | Pure Functions: Topo-Sort, Zyklus-Erkennung (DFS), `wouldCreateCycle(edge)`, abgeleiteter `dependencyStatus`, Reihenfolge-Index. Keine I/O. |
| Dependency-Analysis-Service | `ui/src/server/services/dependency-analysis.service.ts` | KI-Analyse: lädt spec-lite aller aktiven Specs, baut Prompt, ruft `query()` (Muster external-reviewer), eskaliert paarweise/lazy auf implementation-plan→spec bei Konfidenz mittel/niedrig, liefert `ProposedEdge[]`. |
| Shared Dependency-Types | `ui/src/shared/types/spec-dependencies.protocol.ts` | `Priority`, `ProposedEdge`, `DependencyStatus`, `OrderEntry`, WS-Message-Shapes. Geteilt Backend/Frontend (TS strict). |
| Reihenfolge-Ansicht | `ui/frontend/src/components/aos-spec-order-view.ts` | Nummerierte topo-sortierte Liste, "wartet auf"/"ermöglicht", Zyklus-Warnung, "⚠ noch nicht eingeordnet". |
| Abhängigkeits-Editor-Dialog | `ui/frontend/src/components/aos-spec-dependency-editor.ts` | Bidirektionaler Editor (blocked-by + is-prerequisite-for), Zyklus-Fehlermeldung, nur aktive Specs wählbar. |
| Prioritäts-Badge/Selektor | `ui/frontend/src/components/aos-priority-badge.ts` | P0–P3 Badge + inline-editierbarer Selektor (auf Karte + Liste wiederverwendbar). |
| KI-Vorschlags-Dialog | `ui/frontend/src/components/aos-dependency-proposal-dialog.ts` | Zeigt `ProposedEdge[]` mit Konfidenz + Begründung; Übernehmen/Anpassen/Verwerfen; "⚠ bitte prüfen"-Markierung. |

<!-- section:changed-components -->
### Zu ändernde Komponenten

| Komponente | Pfad | Änderung |
|---|---|---|
| Backend SpecInfo + Reader | `ui/src/server/specs-reader.ts` | `KanbanJsonSpec` (+`priority?`,`blockedBy?`); `SpecInfo` (+`priority?`,`blockedBy?`,`dependencyStatus?`,`blockedByIds?`); `getSpecInfo()` liest neue Felder; `listSpecs()` reichert via `spec-graph.ts` an; neue Methoden `setSpecPriority`, `setSpecBlockedBy` (lock-safe, Muster `toggleBotAssignment`); `deleteSpec()` triggert `blockedBy`-Cleanup. |
| WebSocket-Handler | `ui/src/server/websocket.ts` | Neue `case`-Zweige + Handler: `specs.setPriority`, `specs.setBlockedBy`, `specs.analyzeDependencies`, `specs.analyzeDependencies.backfill`. Alle nach Muster `handleSpecsAssign` (validate → mutate → `sendToProject`-Broadcast `specs.list`/`*.ack`). |
| Frontend SpecInfo + Karte | `ui/frontend/src/components/spec-card.ts` | `SpecInfo` (+Felder); Prioritäts-Badge im Header, "🔒 Blockiert durch …"-Hinweis; neue Events `spec-priority-change`, `spec-edit-dependencies`. |
| Dashboard-View | `ui/frontend/src/views/dashboard-view.ts` | Sortier-Selektor (Datum·Priorität·Empfohlene Reihenfolge); `getSortedSpecs()` neue Modi; dritter View-Mode "order" in `renderViewToggle`/`renderSpecsList`; WS-Handler für ack/proposal; Backfill/Re-Analyse-Trigger; Editor-/Proposal-Dialog-Einbindung. |
| create-spec Workflow | `specwright/workflows/core/create-spec.md` | Neuer Schritt "Abhängigkeitsanalyse" nach spec-lite-Erzeugung in Step 2.6-lean (nach Action 4) und Step 2.6. |

<!-- section:not-affected -->
### Nicht betroffen (explizit)

Auto-Mode / Orchestrator (`auto-mode-*.ts`), `withMainProjectLock`, Parallel-Locking-Hierarchie, Task-Ebene-`dependencies`/`blockedBy` (stories/tasks), MCP-Kanban-Server. Locked decision: Reihenfolge ist rein visuell.

<!-- section:component-connections -->
## Component Connections

| Source | Target | Verantwortliche Phase |
|---|---|---|
| `aos-priority-badge` (change-Event) | `dashboard-view` → `gateway.send('specs.setPriority')` | Phase 4 |
| `dashboard-view` `specs.setPriority` | `websocket.ts` `handleSpecsSetPriority` | Phase 3 |
| `handleSpecsSetPriority` | `SpecsReader.setSpecPriority` (`withKanbanLock`) | Phase 1/3 |
| `setSpecPriority` write | Broadcast `specs.list` via `sendToProject` → alle Clients | Phase 3 |
| `aos-spec-dependency-editor` (save) | `dashboard-view` → `specs.setBlockedBy` | Phase 5 |
| `handleSpecsSetBlockedBy` | `spec-graph.wouldCreateCycle()` (Vor-Validierung) | Phase 2/3 |
| `setSpecBlockedBy` (out-edge) | `blockedBy` der **abhängigen** Spec | Phase 1/5 |
| `SpecsReader.listSpecs` | `spec-graph.computeOrder()` + `deriveStatus()` | Phase 2 |
| `listSpecs` → `SpecInfo` | `spec-card` Badge + `aos-spec-order-view` | Phase 4/6 |
| `aos-spec-order-view` | `getSortedSpecs('order')` Daten | Phase 6 |
| `dashboard-view` "Alle analysieren" | `specs.analyzeDependencies.backfill` | Phase 8 |
| `handleSpecsAnalyzeDependencies` | `dependency-analysis.service.analyze()` | Phase 7 |
| `dependency-analysis.service` | `claude-agent-sdk query()` (Muster external-reviewer) | Phase 7 |
| Analyse-Result `ProposedEdge[]` | `aos-dependency-proposal-dialog` | Phase 7 |
| Proposal-Confirm | `specs.setBlockedBy` (je bestätigter Kante) | Phase 5/7 |
| `SpecsReader.deleteSpec` | `blockedBy`-Cleanup über alle Specs | Phase 8 |
| create-spec Workflow (Step 2.6) | spec-lite vorhanden → Analyse-Schritt | Phase 8 |

<!-- section:implementation-phases -->
## Implementation Phases

<!-- section:phase-1-backend-types-persistence -->
### Phase 1: Backend-Typen & Persistenz

`KanbanJsonSpec` + `SpecInfo` (backend) um `priority?`/`blockedBy?` erweitern; `getSpecInfo()` liest sie aus beiden kanban-Formaten; `setSpecPriority`/`setSpecBlockedBy` lock-safe analog `toggleBotAssignment` (inkl. `addChangeLogEntry`). Shared protocol-Types anlegen. Tests: read-back, abwärtskompatibles Fehlen der Felder.

<!-- section:phase-2-graph-logic -->
### Phase 2: Graph-Logik (Topo-Sort, Zyklen, Status)

`spec-graph.ts` als reine Funktionen: `detectCycles`, `wouldCreateCycle(specs, from, to)`, `computeRecommendedOrder` (Kahn/topo; Ties: Priorität dann Datum), `deriveDependencyStatus` (done-Vorgänger gelten erfüllt; nur aktive Specs blocken). `listSpecs()` ruft diese an und reichert `SpecInfo` an. Reine Unit-Tests (kein I/O).

<!-- section:phase-3-websocket-handlers -->
### Phase 3: WebSocket-Handler

`case`-Zweige + Handler `specs.setPriority`, `specs.setBlockedBy` nach Muster `handleSpecsAssign`: validate specId/projectPath → Zyklus-Vorprüfung (für blockedBy) → Reader-Mutation → Broadcast frischer `specs.list` an Projekt-Clients + `*.ack`/`*.error`. Frontend-Gateway-Handler registrieren.

<!-- section:phase-4-priority-ui -->
### Phase 4: Prioritäts-UI

`aos-priority-badge` (Badge + Selektor). In `spec-card.ts` einbinden (Header, neben Stage-Pill/Kanban-Badge). Sortier-Selektor in `dashboard-view` (Datum·Priorität·Empfohlene Reihenfolge) als `@state sortMode` + localStorage; `getSortedSpecs()` erweitern.

<!-- section:phase-5-dependency-ui -->
### Phase 5: Abhängigkeits-UI

`aos-spec-dependency-editor` (bidirektional, nur aktive Specs, Zyklus-Fehler vom Backend anzeigen). "🔒 Blockiert durch …"-Hinweis in `spec-card`. Editor öffnen via Karten-Event.

<!-- section:phase-6-order-view -->
### Phase 6: Reihenfolge-Ansicht

`aos-spec-order-view`: dritter View-Mode neben grid/list. Nummerierte Liste aus `computeRecommendedOrder`, "wartet auf ②/ermöglicht …", Zyklus-Warnbanner, "⚠ noch nicht eingeordnet" für Specs ohne Einordnung. `SpecsViewMode` um `'order'` erweitern; `renderViewToggle`/`renderSpecsList` ergänzen.

<!-- section:phase-7-ai-analysis -->
### Phase 7: KI-Abhängigkeits-Analyse + Vorschlags-Dialog

`dependency-analysis.service.ts` (spec-lite-Sammlung aller aktiven Specs → Prompt → `query()` → bidirektionale Kanten mit Konfidenz; Eskalation paarweise/lazy auf implementation-plan→spec bei mittel/niedrig; nach Volltext immer-noch-niedrig → "⚠ bitte prüfen"). WS-Handler `specs.analyzeDependencies`. `aos-dependency-proposal-dialog` (Confirm/Adjust → `setSpecBlockedBy`).

<!-- section:phase-8-maintenance-workflow -->
### Phase 8: Wartung, Cleanup & Workflow

Backfill ("Alle analysieren") + Re-Analyse-Trigger in Reihenfolge-Ansicht. `deleteSpec` → `blockedBy`-Cleanup über alle Specs (lock-safe). `create-spec.md`: Analyse-Schritt nach spec-lite in Step 2.6-lean + Step 2.6 + Version-Bump im Frontmatter.

<!-- section:dependencies -->
## Dependencies

<!-- section:internal-dependencies -->
### Interne Abhängigkeiten

- Phase 2 (`spec-graph.ts`) braucht Phase 1 (`SpecInfo`-Felder).
- Phase 3 (Handler) braucht Phase 1 (Reader-Methoden) + Phase 2 (Zyklus-Check).
- Phase 4/5/6 (Frontend) brauchen Phase 1 (Felder) + Phase 3 (Mutationen) + shared protocol-Types.
- Phase 7 (Analyse) braucht Phase 5 (`setBlockedBy` für Confirm) + shared `ProposedEdge`.
- Phase 8 braucht Phase 7 (Analyse-Service) + Phase 6 (View für Trigger).

<!-- section:external-dependencies -->
### Externe Abhängigkeiten

- `@anthropic-ai/claude-agent-sdk` (bereits vorhanden, kein Neuzugang).
- `withKanbanLock` (`utils/kanban-lock.ts`), `projectDir` (`utils/project-dirs.ts`) — bestehend.
- Lock-Hierarchie-Invariante: diese Mutationen halten nur den inneren `withKanbanLock`; sie laufen außerhalb des Auto-Mode-Pfads → kein `withMainProjectLock` nötig (User-initiierte Metadaten-Writes, keine Git-Index-Ops).

<!-- section:risks-and-mitigations -->
## Risks & Mitigations

| Risiko | Wahrsch. | Impact | Mitigation |
|---|---|---|---|
| KI setzt falschen Blocker → vergiftet Reihenfolge | mittel | hoch | Propose-&-Confirm (nie still setzen); "⚠ bitte prüfen" statt Raten. |
| Zyklus durch Confirm mehrerer Kanten gleichzeitig | mittel | mittel | Zyklus-Vorprüfung bei JEDER Kante im Handler (nicht nur UI); Kanten sequenziell anwenden, abbrechen bei Zyklus. |
| Lock-Hierarchie-Verstoß (ABBA-Deadlock) | niedrig | hoch | Nur innerer `withKanbanLock`; kein `withMainProjectLock` in diesen Pfaden; Writer-Invariante des Readers respektieren. |
| Verwaiste `blockedBy` nach Spec-Löschung | mittel | mittel | Cleanup in `deleteSpec`; Anzeige "⚠ Vorgänger entfernt" als Fallback wenn Ref unbekannt. |
| Token-Kosten bei vielen aktiven Specs | mittel | mittel | Lite-first; Volltext nur paarweise/lazy bei mittel/niedrig; `withTimeout` wie external-reviewer. |
| Stale `SpecInfo` zwischen Clients | niedrig | mittel | Mutationen broadcasten frische `specs.list` an alle Projekt-Clients (Muster assign). |
| Default-P2 versehentlich massenhaft persistiert | niedrig | mittel | P2 ist reine Frontend-Anzeige-Konvention; kein proaktiver Write. |
| `query()` ohne OAuth-Session schlägt fehl | mittel | mittel | Anthropic-Default-`~/.claude`-Pfad wie external-reviewer; Fehler als "⚠ Analyse fehlgeschlagen"-Toast, kein Block. |

<!-- section:self-review-results -->
## Self-Review Results

<!-- section:self-review-completeness -->
### Vollständigkeit (alle Requirements abgedeckt)

A. Priorität: P0–P3, Badge (Karte+Liste), editierbar, Sortier-Selektor → Phasen 1,3,4. ✔
B. Abhängigkeiten: `blockedBy`, bidirektional, Zyklus-Prüfung, abgeleiteter Status → Phasen 1,2,3,5. ✔
C. Reihenfolge-Ansicht: nummeriert/topo, "wartet auf", Zyklus-Warnung, "noch nicht eingeordnet" → Phase 6. ✔
D. KI-Analyse: alle aktiven via spec-lite, bidirektional, Eskalation mittel/niedrig auf plan→spec, "⚠ bitte prüfen", Propose-&-Confirm → Phase 7. ✔
E. Pflege: Backfill, Re-Analyse, Cleanup bei Löschung → Phase 8. ✔
F. Persistenz: `spec.priority`/`spec.blockedBy` optional, lock-safe, WS-Handler wie assign → Phasen 1,3. ✔
Workflow: create-spec Step 2.6-lean + 2.6 → Phase 8. ✔

<!-- section:self-review-consistency -->
### Konsistenz

`assignedToBot`-Blueprint wird durchgängig gespiegelt (Persistenz, Lock, Handler, Broadcast, SpecInfo). `aos-`-Präfix für alle neuen Komponenten. `projectDir()`/`projectDotDir()` für Pfade — kein hardcoded `specwright`/`agent-os`. TS strict, kein `any` (geprüft gegen bestehende Handler). Eine kanonische Speicherrichtung (`blockedBy`) verhindert Doppel-Wahrheit.

<!-- section:self-review-risks -->
### Risiken-Bewertung

Höchstes Restrisiko: KI-Kanten-Qualität → durch Propose-&-Confirm + "⚠ bitte prüfen" entschärft. Lock-Risiko durch Beschränkung auf inneren Lock + Außerhalb-Auto-Mode-Pfad gering.

<!-- section:self-review-alternatives -->
### Alternativen erwogen

(a) `priority`/`blockedBy` in eigener Datei → verworfen (keine neue Datei nötig). (b) Persistierter `dependencyStatus` → verworfen (Stale-Risiko; on-read-Berechnung gewählt). (c) Eigener LLM-HTTP-Client → verworfen (bestehendes SDK wiederverwenden). (d) Hard-Locking Start-Buttons → out of scope (locked).

<!-- section:self-review-orphaned-check -->
### Orphaned-Component-Check

Jede neue Komponente hat mind. eine eingehende UND ausgehende Verbindung (siehe Connections-Tabelle): `spec-graph.ts` ← listSpecs/Handler; `dependency-analysis.service` ← Handler → SDK/Proposal-Dialog; alle `aos-*` ← dashboard-view → gateway. Keine verwaisten Komponenten.

<!-- section:minimal-invasive-optimizations -->
## Minimal-Invasive Optimizations

<!-- section:mio-reuse -->
### Wiederverwendbare Elemente gefunden

- `toggleBotAssignment` → 1:1-Vorlage für `setSpecPriority`/`setSpecBlockedBy` (Lock, read-modify-write, changeLog).
- `handleSpecsAssign` → Vorlage für neue WS-Handler (validate→mutate→`sendToProject`).
- `external-reviewer.ts` `query()`-Block → Vorlage für KI-Call (Env-Handling, `withTimeout`, Result-Event-Schleife).
- `getSpecContext()` liest bereits spec.md/spec-lite.md/kanban.json → wiederverwendbar für Eskalation.
- `readKanbanJsonUnlocked`/`writeKanbanJsonUnlocked`, `addChangeLogEntry`, `isV2Kanban` → kein neuer I/O-Code nötig.
- `renderViewToggle`/`getSortedSpecs`/`specsViewMode` → erweitern statt ersetzen.

<!-- section:mio-scope-reduction -->
### Change-Scope-Reduktion

- Keine neue Datei für Daten; nur 2 optionale Felder am `spec`-Objekt.
- Abgeleiteter Zustand nicht persistiert → kein Migrationsskript, kein Massen-Write.
- `KanbanJsonSpec` ist gemeinsames Sub-Interface (V1+V2) → eine Stelle deckt beide Formate.
- Reihenfolge rein visuell → null Eingriff in Auto-Mode/Locking.
- Graph-Logik als pure functions → isoliert testbar, kein Eingriff in bestehende Reader-Pfade außer einer Anreicherungszeile in `listSpecs`.

<!-- section:mio-feature-preservation -->
### Feature-Preservation-Checkliste (kein Requirement fällt weg)

- [x] Priorität P0–P3, Badge Karte+Liste, editierbar, Sortier-Selektor
- [x] `blockedBy` bidirektional editierbar, beide Richtungen → `blockedBy` der abhängigen Spec
- [x] Zyklus-Prüfung bei jeder Kanten-Änderung (Backend-enforced)
- [x] Karten-Status 🟢 Bereit / 🔒 Blockiert + "blocked by: …"
- [x] Done-Vorgänger gelten erfüllt; nur aktive Specs wählbar
- [x] Reihenfolge-Ansicht: nummeriert, topo, "wartet auf"/"ermöglicht", Zyklus-Warnung, "⚠ noch nicht eingeordnet"
- [x] KI: alle aktiven via spec-lite, bidirektional + Konfidenz, Eskalation bei mittel/niedrig auf plan→spec paarweise/lazy
- [x] Nach Volltext niedrig → "⚠ bitte prüfen" (nicht setzen)
- [x] Propose-&-Confirm (nie still gesetzt)
- [x] Backfill + Re-Analyse + Cleanup bei Löschung
- [x] kanban.json `spec.priority`/`spec.blockedBy` optional/abwärtskompatibel, lock-safe + WS-Handler wie assign
- [x] create-spec Step 2.6-lean + 2.6 Analyse-Schritt
- [x] Out-of-scope respektiert: Auto-Mode unberührt, kein Graph-Viz, kein D&D, kein Hard-Lock, keine Task-Ebene

<!-- section:next-steps -->
## Next Steps

User-Review dieses Plans. Nach Freigabe → Task-Ableitung (Step 2.6-lean), wobei jede `## `/`### `-Sektion oben als stabiler `planSection`-Anchor dient.
