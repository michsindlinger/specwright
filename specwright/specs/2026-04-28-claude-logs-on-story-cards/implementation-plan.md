# Implementation Plan: Claude-Code-Logs auf Story-Cards im Kanban-Board

> **Status:** PENDING_USER_REVIEW
> **Spec:** `specwright/specs/2026-04-28-claude-logs-on-story-cards/`
> **Erstellt:** 2026-04-28
> **Basiert auf:** `requirements-clarification.md`
> **Branch:** `feature/parallel-auto-mode`

---

## Executive Summary

Wir machen den Claude-Code-Live-Output direkt auf jeder Story-Card im Kanban-Board sichtbar — als optional aufklappbares Inline-Panel, das den existierenden `cloud-terminal:data` WebSocket-Stream pro `sessionId` abonniert. Backend wird nur minimal erweitert (additives `sessionId`-Feld auf `SlotSnapshot`); der Hauptaufwand liegt in einer neuen, gekapselten Lit-Komponente `aos-claude-log-panel`, die ANSI-Codes strippt, RAF-batched rendert und den Buffer beim Öffnen via existierendem `cloud-terminal:buffer-request` hydriert.

---

## Architektur-Entscheidungen

### Gewählter Ansatz
Pure Frontend-Feature mit minimaler additiver Backend-Änderung: keine neuen WebSocket-Nachrichtentypen, keine neuen REST-Endpunkte, keine neuen Services. Die existierende Infrastruktur aus dem `feature/parallel-auto-mode`-Branch (`CloudTerminalManager` mit Bounded Buffer + `session.data` Event, Gateway-Broadcast `cloud-terminal:data`, `cloud-terminal:buffer-request` Handler, `AutoModeStorySlot.getSessionId()`) wird vollständig wiederverwendet.

### Begründung
- **Maximale Wiederverwendung:** Backend ist „fertig genug" — Buffer, Broadcast und Buffer-Request existieren produktiv für `aos-terminal.ts`. Wir nutzen exakt denselben Stream, nur mit einer anderen UI-Repräsentation. Kein Protokoll-Drift.
- **Backward-kompatibel:** `SlotSnapshot` bekommt ein optionales `sessionId?`-Feld. Alte Clients ignorieren es. Dashboard-Hydration-Code (`_hydrateSpecBoardFromSnapshot`, `_hydrateBacklogBoardFromSnapshot`) muss nicht angefasst werden, solange er das Feld nicht aktiv konsumiert.
- **Encapsulation:** Eine eigene Lit-Komponente `aos-claude-log-panel` isoliert die Stream-Subscription, ANSI-Stripping, RAF-Batching und Auto-Scroll-Logik. `aos-story-card` bleibt schlank — sie reicht nur `sessionId` + `expanded`-Flag durch.

### Patterns & Technologien
- **Pattern: Observer/Subscription** — Log-Panel registriert sich beim `gateway.on('cloud-terminal:data', …)` mit sessionId-Filter, dispatcht beim Disconnect.
- **Pattern: Lazy Hydration** — Buffer wird nur beim erstmaligen Öffnen (`expanded=true`) per `cloud-terminal:buffer-request` geholt; danach genügt der Live-Stream.
- **Pattern: Frame-coalescing (RAF Batching)** — Eingehende Daten werden in einem Pending-Buffer akkumuliert und einmal pro `requestAnimationFrame` zur Lit-Property committed. Verhindert Re-Render-Storms bei `>1k` Lines/sec.
- **ANSI-Stripping:** Hand-rolled regex `/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g` (~10 Zeilen Util). Kein npm-Dep notwendig — Lib `strip-ansi` wäre überdimensioniert für eine 10-Zeilen-Funktion und würde dem Frontend-Bundle zusätzliches Gewicht geben. Empfehlung: **hand-rolled** in `ui/frontend/src/utils/ansi-strip.ts`.
- **Technologie:** Lit 3 (existierend), CSS `overflow-y: auto` mit `scrollTop = scrollHeight`-Pattern für Auto-Tail-Scroll.

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit | Erstellt in Phase/Task |
|---|---|---|---|
| `aos-claude-log-panel` | Lit Web Component | Subscribe `cloud-terminal:data` für eine `sessionId`, ANSI-strip, RAF-batch, Auto-Scroll mit Backscroll-Detection, Buffer-Hydration on Mount | Phase 2 / Task 2.1 |
| `ansi-strip.ts` | Frontend Util | Pure-Function `stripAnsi(s: string): string` — entfernt CSI/SGR/Cursor-Sequenzen | Phase 2 / Task 2.2 |
| `raf-batcher.ts` (optional) | Frontend Util | Generischer RAF-Coalescer — falls als Util ausgelagert; alternativ inline im Panel | Phase 2 / Task 2.3 |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|---|---|---|
| `ui/src/shared/types/auto-mode.protocol.ts` | Erweitern (additiv) | `SlotSnapshot.sessionId?: string` hinzufügen — Frontend-Hook für Card→Session-Zuordnung |
| `ui/src/server/services/auto-mode-orchestrator-base.ts` | Erweitern | `OrchestratorSlotSnapshot` um `sessionId?` und in `getSnapshot()` via `slot.getSessionId()` befüllen |
| `ui/src/server/workflow-executor.ts` | Erweitern | Adapter-Methoden `getSpecAutoModeSnapshot` / `getBacklogAutoModeSnapshot` reichen `sessionId` durch |
| `ui/frontend/src/views/dashboard-view.ts` | Erweitern | Beim Hydrieren der Auto-Mode-Boards: Map `storyId → sessionId` aufbauen; an `<aos-story-card>` als Property propagieren |
| `ui/frontend/src/components/story-card.ts` | Erweitern | Neue Property `sessionId?: string`; conditional Toggle-Button + `<aos-claude-log-panel>` (eigene Zeile, unter Status-Pill); Toggle-State `@state() private logExpanded = false` (ephemer) |
| `ui/frontend/src/gateway.ts` | Nicht geändert | Sendet/empfängt `cloud-terminal:data` + `buffer-request` bereits |
| `ui/src/server/websocket.ts` | Nicht geändert | Broadcast existiert (~line 4564); `buffer-request`-Handler existiert (~line 519, 4921) |
| `ui/src/server/services/cloud-terminal-manager.ts` | Nicht geändert | Bounded Buffer + `session.data` existieren produktiv |
| `ui/src/server/services/auto-mode-story-slot.ts` | Nicht geändert | `getSessionId()` existiert bereits |

### Nicht betroffen (explizit)
- Manuelle `/execute-tasks`-Sessions (out of scope laut FR-9)
- Persistente Log-Speicherung (out of scope)
- xterm.js / `aos-terminal.ts` (separate Komponente, bleibt unverändert)
- LocalStorage / Toggle-State-Persistierung (FR-8: Reload schließt alle Panels)

---

## Komponenten-Verbindungen (KRITISCH)

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Phase/Task | Validierung |
|---|---|---|---|---|
| `AutoModeStorySlot.getSessionId()` | `OrchestratorSnapshot.active[].sessionId` | Direkter Method-Call in `getSnapshot()` | Phase 1 / Task 1.1 | `grep -n "getSessionId" auto-mode-orchestrator-base.ts` |
| `OrchestratorSnapshot` | `AutoModeSnapshot` (protocol) | Adapter-Pass-Through in `workflow-executor.ts` | Phase 1 / Task 1.2 | Type-Check + Snapshot-Roundtrip Unit-Test |
| `AutoModeSnapshot` (server) | `dashboard-view._hydrate*BoardFromSnapshot` | WebSocket payload (`activeSlots[*].sessionId`) | Phase 1 / Task 1.3 | Browser-DevTools: payload zeigt `sessionId` |
| `dashboard-view` | `<aos-story-card>` | Lit Property `sessionId` | Phase 3 / Task 3.1 | DOM-Inspektion: `<aos-story-card sessionid="…">` |
| `<aos-story-card>` | `<aos-claude-log-panel>` | Lit Property `sessionId`, slot/conditional render | Phase 3 / Task 3.2 | DOM: Panel nur bei `story.sessionId !== undefined` |
| `<aos-claude-log-panel>` | `gateway` (WebSocketClient) | `gateway.on('cloud-terminal:data', handler)` mit sessionId-Filter | Phase 2 / Task 2.1 | Unit-Test: Mock-Gateway emit → Panel rendert |
| `<aos-claude-log-panel>` | `gateway` (WebSocketClient) | `gateway.send({ type: 'cloud-terminal:buffer-request', sessionId })` on toggle-open | Phase 3 / Task 3.3 | E2E: Toggle öffnen → Buffer sichtbar (nicht leer) |
| `<aos-claude-log-panel>` | `stripAnsi()` | Direct Import | Phase 2 / Task 2.2 | Unit-Test: ANSI-Sample → plain text |
| `gateway` (`cloud-terminal:buffer-response`) | `<aos-claude-log-panel>` | Subscription mit sessionId-Filter | Phase 3 / Task 3.3 | E2E wie oben |

### Verbindungs-Details

**V1: `AutoModeStorySlot` → `OrchestratorSlotSnapshot.sessionId`**
- **Art:** Direct Method-Call innerhalb `auto-mode-orchestrator-base.ts:getSnapshot()`
- **Schnittstelle:** `slot.getSessionId(): CloudTerminalSessionId | null`
- **Datenfluss:** Slot hält intern `this.sessionId` nach erfolgreichem `start()`; Snapshot-Builder liest und mappt `null → undefined`.
- **Validierung:** `grep -n "getSessionId" ui/src/server/services/auto-mode-orchestrator-base.ts`

**V2: Server-Snapshot → Frontend `AutoModeSnapshot`**
- **Art:** WebSocket-Push (`specs.kanban` Response + Auto-Mode Updates)
- **Schnittstelle:** `SlotSnapshot { id, title, sessionId? }`
- **Datenfluss:** Pass-Through über `getSpecAutoModeSnapshot` / `getBacklogAutoModeSnapshot`, dann WebSocket-`broadcast`.
- **Validierung:** Browser-DevTools Network-Tab: `activeSlots[0].sessionId` ist gesetzt, sobald Auto-Mode-Slot aktiv ist.

**V3: `dashboard-view` → `<aos-story-card>`**
- **Art:** Lit Property Binding
- **Schnittstelle:** `<aos-story-card .sessionId=${storyIdToSessionId.get(story.id)}>`
- **Datenfluss:** Dashboard baut beim Hydrate eine Map `storyId → sessionId` aus `snap.activeSlots`. Map wird beim Render an alle Story-Cards weitergegeben (oder pro Card aufgelöst).
- **Validierung:** `grep -n "sessionId" ui/frontend/src/views/dashboard-view.ts`

**V4: `<aos-story-card>` → `<aos-claude-log-panel>`**
- **Art:** Conditional Render + Lit Property
- **Schnittstelle:** `${this.sessionId && this.logExpanded ? html`<aos-claude-log-panel .sessionId=${this.sessionId}></aos-claude-log-panel>` : nothing}`
- **Datenfluss:** Toggle-Button (eigene Zeile unter Status-Pill) flippt `@state() logExpanded`. `sessionId` wird durchgereicht.
- **Validierung:** DevTools-Inspektion: Toggle nur sichtbar bei aktiver Session; Panel rendert erst nach Click.

**V5: `<aos-claude-log-panel>` → `gateway` (Subscribe)**
- **Art:** EventEmitter-Subscription (Gateway hat `on(type, handler)` Pattern wie `aos-terminal.ts:358`)
- **Schnittstelle:**
  ```ts
  gateway.on('cloud-terminal:data', (msg) => {
    if (msg.sessionId !== this.sessionId) return;
    this._appendChunk(stripAnsi(msg.data as string));
  });
  ```
- **Datenfluss:** Stream wird gefiltert nach eigener `sessionId`, in Pending-Queue gepusht, RAF-flushed in `@state() logText`.
- **Validierung:** Unit-Test mit Mock-Gateway: 100 emit → 100 Zeilen sichtbar nach RAF-Flush.

**V6: `<aos-claude-log-panel>` → Buffer-Hydration**
- **Art:** WebSocket-Send beim ersten `connectedCallback`/`firstUpdated`
- **Schnittstelle:** `gateway.send({ type: 'cloud-terminal:buffer-request', sessionId, timestamp })` (existing in `aos-terminal.ts:331`)
- **Datenfluss:** Server antwortet mit `cloud-terminal:buffer-response { sessionId, buffer }`; Panel initialisiert `logText` mit `stripAnsi(buffer)` und scrollt ans Ende.
- **Validierung:** E2E: Auto-Mode 30 s laufen → Card-Toggle öffnen → Buffer (nicht nur ab-jetzt-Stream) sichtbar.

### Verbindungs-Checkliste
- [x] Jede neue Komponente (`aos-claude-log-panel`, `ansi-strip`) erscheint mindestens einmal als Source ODER Target
- [x] Jede Verbindung ist einer Phase/Task zugeordnet
- [x] Validierungsbefehle sind ausführbar (grep / DevTools / Unit-Test)
- [x] Keine Orphans: `aos-claude-log-panel` ist Target von `aos-story-card` (V4) und Source von Subscribe (V5) + Buffer-Request (V6); `ansi-strip` ist Target von Direct-Import in V5/V6 und Unit-Tests.

---

## Umsetzungsphasen

### Phase 1: Backend Snapshot-Erweiterung (sessionId Exposure)
**Ziel:** Frontend kann pro Story die zugehörige aktive Cloud-Terminal-`sessionId` ablesen.
**Komponenten:**
- `auto-mode.protocol.ts` (`SlotSnapshot.sessionId?`)
- `auto-mode-orchestrator-base.ts` (`OrchestratorSlotSnapshot.sessionId?`, `getSnapshot()` befüllen)
- `workflow-executor.ts` (Adapter-Methoden inkludieren `sessionId` im Return-Type)
**Tasks:**
- 1.1: Protocol-Type um `sessionId?: string` erweitern
- 1.2: `OrchestratorSlotSnapshot` + `getSnapshot()`-Mapping anpassen (`slot.getSessionId() ?? undefined`)
- 1.3: `getSpecAutoModeSnapshot` / `getBacklogAutoModeSnapshot` Return-Type erweitern + Pass-Through
- 1.4: Unit-Test für Snapshot-Roundtrip (Slot mit/ohne sessionId → korrekt im Snapshot)
**Abhängig von:** Nichts.

### Phase 2: Frontend Log-Panel Standalone
**Ziel:** `<aos-claude-log-panel>` funktioniert isoliert mit Mock-Gateway in Tests.
**Komponenten:**
- `ui/frontend/src/utils/ansi-strip.ts`
- `ui/frontend/src/components/aos-claude-log-panel.ts` (~150–200 LOC)
**Tasks:**
- 2.1: `aos-claude-log-panel.ts` Skeleton — Properties (`sessionId: string`), `@state` (`logText`, `userScrolledUp`), Subscribe in `connectedCallback`, Unsubscribe in `disconnectedCallback`
- 2.2: `ansi-strip.ts` Util + Unit-Tests (CSI, SGR, Cursor-Move-Sequenzen, Spinner-Sample)
- 2.3: RAF-Batching: Pending-Buffer-Array, `requestAnimationFrame`-Flush, max 1 Lit-Update/Frame
- 2.4: Auto-Scroll-Verhalten: `scrollTop = scrollHeight` nach Update; bei User-Scroll-Up `userScrolledUp = true` → Auto-Scroll pausieren bis User wieder ans Ende scrollt
- 2.5: CSS: `max-height: 300px; overflow-y: auto; font-family: monospace; white-space: pre-wrap; font-size: 11px`
- 2.6: Unit-Test: Mock-Gateway 1000 emits → exakt 1 RAF-Flush, finale `logText` korrekt
**Abhängig von:** Phase 1 (für Type-Imports), aber technisch entkoppelbar.

### Phase 3: Integration + Buffer-Hydration + Tests
**Ziel:** Card zeigt Toggle nur bei aktiver Session; Toggle öffnet Panel mit hydriertem Buffer; mehrere Cards gleichzeitig expandierbar.
**Komponenten:**
- `dashboard-view.ts` (Map-Aufbau + Property-Propagation)
- `story-card.ts` (Property `sessionId`, Toggle, conditional Panel-Render)
- `aos-claude-log-panel.ts` (Buffer-Request on `firstUpdated`)
**Tasks:**
- 3.1: `dashboard-view._hydrateSpecBoardFromSnapshot` und `_hydrateBacklogBoardFromSnapshot` erweitern: Map `storyId → sessionId` zusätzlich pflegen, beim Render an Card durchreichen (entweder als Prop oder via `story.sessionId`-Anreicherung)
- 3.2: `story-card.ts`: neue Property `sessionId?: string`, neue `@state logExpanded`, Toggle-Button auf eigener Zeile unter Status-Pill (nur wenn `sessionId !== undefined`), conditional `<aos-claude-log-panel>`-Render
- 3.3: `aos-claude-log-panel.firstUpdated` → `gateway.send({ type: 'cloud-terminal:buffer-request', sessionId, timestamp })` + Subscribe auf `cloud-terminal:buffer-response`
- 3.4: Reconnect-Handling: Bei `gateway.connected`-Event nach Reconnect den Buffer-Request erneut senden, falls Panel noch mounted ist
- 3.5: E2E-Smoke (Playwright): Auto-Mode mit `maxConcurrent=2` starten → 2 Cards expandieren → beide Streams sichtbar → Reload → Panels collapsed
- 3.6: Edge-Case-Tests: (a) Story rendert vor sessionId-Propagation (kein Toggle), (b) sessionId kommt nach (Toggle erscheint), (c) Session schließt während Panel offen (Stream stoppt, Inhalt bleibt sichtbar bis Card-Status wechselt)
**Abhängig von:** Phase 1 + Phase 2.

---

## Abhängigkeiten

### Interne Abhängigkeiten
```
Phase 3.2 (story-card)        ──depends on──> Phase 1.1 (protocol sessionId)
Phase 3.2 (story-card)        ──depends on──> Phase 2 (aos-claude-log-panel)
Phase 3.1 (dashboard-view)    ──depends on──> Phase 1.3 (workflow-executor adapter)
Phase 2.1 (panel)             ──uses──>       Phase 2.2 (ansi-strip util)
Phase 3.3 (buffer-hydration)  ──depends on──> existing cloud-terminal:buffer-request handler
```

### Externe Abhängigkeiten
- **Lit 3** (existierend) — keine neue Version, keine neuen Decorators
- **xterm/strip-ansi** — bewusst NICHT verwendet (Bundle-Size-Vermeidung; hand-rolled ist trivial)
- Existing: `gateway.ts` (`on`/`send`-API), `cloud-terminal:data`, `cloud-terminal:buffer-request`, `cloud-terminal:buffer-response`, `MAX_BUFFER_LINES`-Bounded Buffer

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| **Lit Re-Render-Storm bei High-Frequency-Stream (>1k Lines/sec)** — UI hängt, Frames werden gedroppt | High | High | RAF-Batching (Phase 2.3): Pending-Queue, max 1 Update/Frame. Zusätzlich harter Cap: bei `pending.length > 5000` älteste 50 % verwerfen (Sicherung gegen Pending-Buffer-Overflow). |
| **Race: Story-Card rendert vor sessionId-Propagation** — User sieht Story, aber Toggle fehlt | Med | Low | Toggle ist conditional auf `story.sessionId !== undefined`. Wenn Snapshot nachkommt → Card re-rendert via Lit-Property-Update → Toggle erscheint. Kein expliziter Loader nötig (acceptable UX). E2E-Test 3.6.b deckt das ab. |
| **WebSocket-Reconnect während Panel offen** — Stream bricht ab, Panel zeigt veralteten Stand | Med | Med | Phase 3.4: Subscribe auf `gateway.connected`-Event; nach Reconnect Buffer-Request neu senden, lokaler `logText` wird mit Clear + re-write Buffer ersetzt. Alternative falls zu komplex: Reload-Reset wird in FR-8 toleriert; Session-Buffer bleibt im Manager (überlebt WS-Reconnect serverseitig). |
| **Mehrere Browser-Tabs subscriben parallel auf gleiche sessionId** | Low | Low | Bereits gelöst: `broadcast()` in `websocket.ts` sendet an alle Clients (idempotent). Jedes Tab hat eigenen UI-State. |
| **Sehr lange Buffer-Hydration blockiert Lit Render** (Buffer ist `MAX_BUFFER_LINES` lang, ~5000 Zeilen) | Low | Med | Initialer Render: `logText` als ein einziger String setzen (kein Array-Map in Template). Browser-Native `<pre>` mit `white-space: pre-wrap` rendert auch 5000 Zeilen schnell, da fixed `max-height: 300px` nur ~20 Zeilen ins Layout zwingt (browser-internal scrollback). |
| **ANSI-Strip übersieht exotische Sequenzen** (OSC, DCS) | Low | Low | Regex deckt CSI/SGR ab. Falls OSC/DCS auftauchen, fallback: alles `\x1B…\x07`-terminierte verwerfen. Im Worst-Case bleiben Restzeichen — lesbar, aber „dirty". Akzeptabel laut FR-3. |
| **`closeSession()` löscht Buffer während Panel noch offen** | Low | Low | Server sendet `cloud-terminal:closed`; Card-Status-Wechsel auf `done` triggert ohnehin Re-Render und Toggle verschwindet (`sessionId === undefined`). Out-of-scope MVP für expliziten "[Session ended]"-Marker. |
| **`maxConcurrent=4+` mit allen Panels offen** — n parallele RAF-Loops | Low | Med | Jedes Panel hat eigene RAF-Loop, RAF synchronisiert sich aber pro Frame; max 4 Updates/Frame ist kein Problem für moderne Browser. Bei `n=10+` evtl. zentralen RAF-Coalescer (out-of-scope MVP). |

---

## Self-Review Ergebnisse

### Validiert
- **Vollständigkeit:** Alle 9 funktionalen Requirements (FR-1 bis FR-9) sind in den 3 Phasen abgedeckt — siehe Feature-Preservation-Checkliste.
- **Konsistenz:** Naming-Convention (`aos-`-Prefix für Lit-Components) eingehalten — `aos-claude-log-panel` matched `aos-story-card`, `aos-terminal`, etc.
- **Backward-Compat:** `SlotSnapshot.sessionId?` ist optional, additiv. Kein bestehender Code bricht.
- **Wiederverwendung:** `cloud-terminal:data`, `cloud-terminal:buffer-request`, `cloud-terminal:buffer-response`, `MAX_BUFFER_LINES`, `AutoModeStorySlot.getSessionId()` — alles existiert produktiv im `feature/parallel-auto-mode`-Branch.
- **Komponenten-Verbindungen:** Alle 6 Connections haben Source + Target + Phase/Task + Validierung.

### Identifizierte Probleme & Lösungen
| Problem | Ursprünglicher Plan | Verbesserung |
|---|---|---|
| Property `sessionId` in `story-card.ts` würde sich an `StoryInfo` schmuggeln (impliziter Kontrakt) | `StoryInfo.sessionId?: string` ergänzen | Stattdessen separate Top-Level Property `@property sessionId?: string` auf `aos-story-card`. Hält `StoryInfo` als reines Domain-Model, `sessionId` als laufzeit-/UI-Zustand sauber getrennt. |
| Auto-Scroll mit Backscroll-Detection ist non-trivial (Scroll-Event vs. programmatic scroll) | Nach jedem Update `scrollTop = scrollHeight` | Tracking via `userScrolledUp = (scrollTop + clientHeight < scrollHeight - 4)`. Bei `scroll`-Event prüfen, bei eigenen Scroll-Schreibungen Flag temporär unterdrücken. |
| Lit-Property `logText` als ein großer String führt bei `MAX_BUFFER_LINES`-Buffer zu großem DOM-String | Single `<pre>` mit Full-String | Akzeptabel: Browser handhabt `<pre>`-Strings mit 5k Zeilen problemlos. Alternative (Array-Map mit Lit `repeat`) wäre teurer wegen N DOM-Nodes statt 1 TextNode. |
| Buffer-Request beim Tab-Wechsel zwischen Specs | Beim `firstUpdated` requesten | Reicht: `aos-claude-log-panel` wird beim Toggle-Schließen unmounted, beim Öffnen erneut gemounted → erneuter Request. Kein Memo-Cache nötig (ephemer per FR-8). |

### Offene Fragen
*(keine — alle Architektur-Entscheidungen sind durch existierende Patterns und FR-Dokument abgedeckt)*

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---|---|---|
| `cloud-terminal:data` Broadcast | `ui/src/server/websocket.ts:4564` | `<aos-claude-log-panel>` Subscribe — null neue Server-Messages nötig |
| `cloud-terminal:buffer-request` Handler | `ui/src/server/websocket.ts:519, 4921` | Buffer-Hydration on Toggle-Open |
| `cloud-terminal:buffer-response` Broadcast | `ui/src/server/websocket.ts` (existing) | Initial-State für Panel |
| Bounded Buffer `MAX_BUFFER_LINES` | `cloud-terminal-manager.ts:634` | Server-seitig limitiert; Frontend muss nicht kappen |
| `AutoModeStorySlot.getSessionId()` | `auto-mode-story-slot.ts:119` | Snapshot-Builder befüllt `sessionId` ohne neue Logik |
| `gateway.on/send`-Pattern | `aos-terminal.ts:330–382` | 1:1 übertragbar auf `<aos-claude-log-panel>` |
| Lit `customElement` + `@property/@state` | Alle existing `aos-*`-Components | Standard-Pattern, kein Boilerplate |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|---|---|---|
| `strip-ansi` npm-Dep | Hand-rolled Regex (~10 LOC) | ~3 KB Bundle, 0 Dep-Updates, 0 Audit-Surface |
| Neuer WebSocket-Message-Type `story-log:subscribe` | Wiederverwendung `cloud-terminal:data` mit sessionId-Filter | 0 Server-Code, 0 Protokoll-Drift |
| Push-Event `slot.session-started` für Frontend | `SlotSnapshot.sessionId` im existierenden Snapshot-Push | 0 neue Events, vorhandener Hydration-Code reicht |
| Eigener Bounded-Buffer im Frontend | Server-Buffer + RAF-Batching im Frontend | 0 zusätzliche State-Synchronisierung |
| `StoryInfo.sessionId` (Domain-Model-Pollution) | Separate Lit-Property auf `<aos-story-card>` | Cleanere Domain-Trennung |
| LocalStorage für Toggle-State | Ephemer (`@state`) per FR-8 | 0 Persistenz-Code, kein Quota-Risiko |

### Feature-Preservation bestätigt
- [x] **FR-1** Inline expand-Panel im Story-Card → Phase 3.2 (Toggle + conditional Panel)
- [x] **FR-2** Live-Stream während In-Progress → Phase 2.1 (`gateway.on('cloud-terminal:data')`)
- [x] **FR-3** Vollständiger Claude-Stream (raw stdout) → Phase 2.1 (kein Filter, alle Bytes nach Strip)
- [x] **FR-4** ANSI-Codes strippen → Phase 2.2 (`stripAnsi()`)
- [x] **FR-5** Auto-Scroll mit fixed Height (~300 px) + Backscroll → Phase 2.4, 2.5
- [x] **FR-6** Mehrere Cards parallel expandiert → unabhängige `<aos-claude-log-panel>`-Instanzen, kein globaler State
- [x] **FR-7** Toggle nur bei aktiver Cloud-Session → Phase 3.2 (conditional auf `sessionId !== undefined`)
- [x] **FR-8** State ephemer → `@state` (kein LocalStorage)
- [x] **FR-9** Scope: Auto-Mode only → `sessionId` kommt nur aus `AutoModeSnapshot.activeSlots`; manuelle `/execute-tasks` haben kein `sessionId`-Mapping → kein Toggle

---

## Critical Files for Implementation

- `/Users/michaelsindlinger/Entwicklung/specwright/ui/src/shared/types/auto-mode.protocol.ts`
- `/Users/michaelsindlinger/Entwicklung/specwright/ui/src/server/services/auto-mode-orchestrator-base.ts`
- `/Users/michaelsindlinger/Entwicklung/specwright/ui/src/server/workflow-executor.ts`
- `/Users/michaelsindlinger/Entwicklung/specwright/ui/frontend/src/components/story-card.ts`
- `/Users/michaelsindlinger/Entwicklung/specwright/ui/frontend/src/views/dashboard-view.ts`

(Plus zwei NEUE Dateien, die Phase 2 erstellt: `ui/frontend/src/components/aos-claude-log-panel.ts` und `ui/frontend/src/utils/ansi-strip.ts`.)
