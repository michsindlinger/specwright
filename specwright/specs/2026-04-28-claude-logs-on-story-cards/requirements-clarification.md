# Requirements Clarification - Claude Code Logs auf Story-Cards

**Created:** 2026-04-28
**Status:** Pending User Approval
**Mode:** V2 Lean
**Related Branch:** `feature/parallel-auto-mode`

## Feature Overview
Claude-Code-Output (Live-Stream) wird direkt am Story-Card im Kanban-Board sichtbar gemacht — als inline expandierbares Panel pro Card, nur für Stories mit aktiver Auto-Mode-Session.

## Target Users
- **Power-User von Auto-Mode (parallel)** — beobachtet mehrere Slots gleichzeitig und braucht Sicht auf jeden Claude-Stream pro Story.
- Specwright-User, die ohne Tab-Wechsel zur Terminal-View den Fortschritt einer Story nachvollziehen wollen.

## Business Value
- Auto-Mode mit `maxConcurrent=2+` (PAM-007) macht es schwer, parallele Claude-Sessions zu beobachten — User muss zwischen Terminal-Tabs hin/her springen.
- Inline-Logs am Card geben unmittelbares Feedback "läuft die Story sinnvoll?" ohne Kontext-Wechsel.
- Frühe Sicht auf hängende Sessions / Blocker ohne dass man manuell jedes Terminal öffnet.

## Functional Requirements
1. **Inline expand-Panel im Story-Card** — Toggle unter dem Status-Pill (eigene Zeile), öffnet/schließt Log-Panel direkt im Card.
2. **Live-Stream während In-Progress** — Logs werden in Realtime via WebSocket gepusht (kein Polling).
3. **Vollständiger Claude-Stream (raw stdout)** — keine Filterung; alle Bytes vom PTY werden angezeigt (ANSI-Codes vor Render entfernt).
4. **ANSI-Codes strippen, Plain-Text rendern** — keine Farben, keine Cursor-Manipulation. Nur lesbarer Text.
5. **Auto-Scroll mit fixed Height (~300 px)** — Tail-Verhalten wie Terminal, User kann hochscrollen für Backscroll.
6. **Mehrere Cards parallel expandiert möglich** — kein Akkordeon, alle parallelen Slots gleichzeitig sichtbar.
7. **Toggle nur bei aktiver Cloud-Session sichtbar** — Stories ohne Session (Backlog/Done/Blocked ohne sessionId) zeigen keinen Toggle.
8. **State ist ephemer** — Reload schließt alle expandierten Panels (Default: collapsed).
9. **Scope: Auto-Mode only** — Logs aus `cloud-terminal-manager` / `auto-mode-cloud-session`. Manuelle `/execute-tasks`-Sessions in dieser Spec NICHT supported (Follow-up).

## Affected Areas & Dependencies

### Backend (vorhanden — nutzen)
- `ui/src/server/services/cloud-terminal-manager.ts` — Buffer + `session.data` Event existiert; `MAX_BUFFER_LINES` bounded.
- `ui/src/server/services/auto-mode-story-slot.ts` — mappt `storyId → sessionId` (existiert).
- `ui/src/server/websocket.ts` — broadcastet bereits `cloud-terminal:data` mit `{sessionId, data}`.

### Backend (Erweiterung)
- **storyId↔sessionId-Mapping ans Frontend exposen** — `AutoModeSnapshot` (`auto-mode.protocol.ts`) hat aktuell `SlotSnapshot { id, title }`, fehlt: `sessionId`. Erweitern auf `{ id, title, sessionId? }`.
- Eventuell push-Event bei Session-Start/Close, damit Frontend `cardSessionMap` aktuell hält.

### Frontend
- `ui/frontend/src/components/story-card.ts` — neuer Slot/Section: Log-Toggle + Panel.
- Neue Komponente: `aos-claude-log-panel.ts` (oder ähnlich) — gekapselter Renderer, subscribed sich auf WebSocket `cloud-terminal:data` für eine bestimmte `sessionId`.
- `ui/frontend/src/views/dashboard-view.ts` — propagiert `sessionId` (aus `AutoModeSnapshot`) an `<story-card>`.
- ANSI-Strip-Util — kleine Funktion oder npm-Lib (`strip-ansi`).

### Persistence
- Keine — Logs nur im RAM-Buffer (`CloudTerminalManager`). Nach `closeSession()` weg.
- Reconnect-Verhalten: Frontend kann beim Toggle-Open `cloud-terminal:buffer-request` senden (existiert bereits), bekommt aktuellen Buffer.

## Edge Cases & Error Scenarios
- **Session existiert noch nicht (race)** — Story-Card rendert, Auto-Mode-Slot startet erst gleich. → Toggle erst nach `sessionId`-Propagation rendern.
- **Session schließt während Panel offen** — Stream endet, Panel zeigt Buffer als read-only. Nach kurzer Zeit / Card-Status-Wechsel auf Done verschwindet Toggle (Buffer im Manager wird beim `closeSession` gelöscht).
- **Session-Buffer-Overflow** — `CloudTerminalManager` truncated bei `MAX_BUFFER_LINES`. UI zeigt einfach den verfügbaren Tail (kein expliziter "truncated"-Marker nötig).
- **Mehrere Browser-Tabs** — beide bekommen Broadcast (idempotent); jedes Tab hat eigenen UI-State (ephemer ok).
- **WebSocket-Reconnect** — Frontend muss beim Reconnect `buffer-request` triggern, falls Panel offen war (bzw. da State ephemer ist, ist der Reload-Reset akzeptabel).
- **Sehr schneller Stream (>1k Zeilen/sec)** — Lit Re-Render kann blocken. → Throttle/RAF-Batching im Log-Panel.
- **ANSI-Sequenzen, die Cursor zurücksetzen** (z.B. Spinner) — Strip entfernt Sequenz, Output bleibt aber sinnvoll lesbar (nur ohne Live-Spinner-Anim).

## Security & Permissions
- Logs werden bereits via WebSocket broadcastet (existing); Spec fügt keine neuen Server-APIs hinzu.
- Keine sensiblen Daten erwartet (Claude-Output ist normaler stdout). User-Tokens werden nicht in Card-Logs geleakt, weil sie im PTY nicht erscheinen (CLI nutzt Env-Vars).

## Performance Considerations
- Bounded Buffer: `CloudTerminalManager.MAX_BUFFER_LINES` (existing).
- DOM: Auto-Scroll-Container mit fixed `max-height: 300px`; nur sichtbarer Bereich gerendert (kein virtualisiertes Scrolling nötig bei 300px ≈ 15-20 Zeilen).
- Update-Throttling: WebSocket-Bursts via `requestAnimationFrame` batchen, sonst hängt Lit-Re-Render bei 2 parallelen Slots.

## Scope Boundaries
**IN SCOPE:**
- Inline Log-Panel an Story-Card für Auto-Mode-Sessions.
- Live-Stream via WebSocket (nutzt existing `cloud-terminal:data`).
- ANSI-Strip + Plain-Text Render.
- Auto-Scroll mit Backscroll, fixed Height.
- Mehrere Cards parallel expandable.
- `AutoModeSnapshot` um `sessionId` erweitern.

**OUT OF SCOPE:**
- Manuelle `/execute-tasks`-Sessions (Follow-up Spec).
- Persistente Logs (File/DB) — nur Session-Buffer.
- ANSI-Farb-Render, xterm.js-Integration im Card.
- Strukturierte Tool-Call-Anzeige / Filter / Search im Log-Panel.
- Toggle-State LocalStorage-Persistierung.
- Logs für abgeschlossene Stories (Done) — Buffer ist nach `closeSession` weg.
- "Mini-Tail" am Card (3 Zeilen sichtbar ohne Expand) — kein User-Wunsch.

## Open Questions
*(keine — User hat alle Optionen entschieden)*

## Proposed Tasks (High Level)
1. **Backend: AutoModeSnapshot um sessionId erweitern** — `SlotSnapshot.sessionId` Feld, im Snapshot-Builder befüllen.
2. **Frontend: aos-claude-log-panel-Komponente** — gekapselter Renderer, subscribe auf `cloud-terminal:data` für gegebene sessionId, ANSI-Strip, Auto-Scroll, fixed Height.
3. **Frontend: story-card Integration** — Toggle unter Status-Pill, conditional auf `story.sessionId`, propagiert sessionId an `<aos-claude-log-panel>`.
4. **Frontend: dashboard-view storyId→sessionId propagation** — aus `AutoModeSnapshot` Map bauen, an `<story-card>` durchreichen.
5. **Buffer-Hydration on Toggle-Open** — Panel triggert `cloud-terminal:buffer-request` beim ersten Open, damit User direkt vorhandenen Tail sieht (nicht nur ab Open).
6. **Throttling/Batching** — RAF-batched Updates im Log-Panel für High-Frequency-Streams.
7. **Tests** — Unit für ANSI-Strip + Buffer-Append; E2E-Smoke (Auto-Mode start → Card → Toggle expand → Logs visible).

---
*Review this document carefully. Once approved, the implementation plan will be created.*
