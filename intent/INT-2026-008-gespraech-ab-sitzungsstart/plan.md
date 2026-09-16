# Plan INT-2026-008: Gespräch ab Sitzungsstart — das Absicht-Interview auf der Projekt-Seite

> **Intent:** `intent/INT-2026-008-gespraech-ab-sitzungsstart/intent.md` (neu, Bypass: Größe S, Verhalten durch INT-2026-007 spec.md FA-22/AN-S03 festgelegt, nur der Zuschnitt fehlt) · **Spec:** entfällt
> **Status:** umgesetzt — PR #54 offen (Merge = Michael), `verify: OK` lokal (65 s) und CI grün; Fassung 2 nach externem Review (3 Reviewer, 23 Findings, §12), freigegeben 16.09. · **Erstellt:** 2026-09-16 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger) mit „eigene PR" (16.09.) und Annahme dieses Plans
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand `957da79`, §2 Backend/Frontend, §3 Nutzerzustand, AR-04, AR-05), `CLAUDE.md`, `docs/security.md` §6, `docs/design.md` §6, INT-2026-007 `spec.md` (FA-22, AN-S03, §10) und `plan.md` (§3 A.9/A.10, §6, §14)
> **Branch:** `feat/INT-2026-008-gespraech-ab-sitzungsstart` von `origin/main` `957da79`, Worktree `../specwright-worktrees/session-sdlc-ui`

## In einfachen Worten

**Worum geht es?** Seit heute Vormittag steht auf der Seite eines Vorhabens rechts ein Gesprächsbereich: Man sieht, was die Claude-Sitzung sagt, und kann ihr antworten, ohne das Terminal zu öffnen. Michael hat das im Projekt Kompass ausprobiert und auf „Absicht beginnen" gedrückt. Die UI meldete „Sitzung gestartet — Vorhaben entsteht …", und dann kam nichts mehr. Im Terminal lief die Sitzung längst und stellte ihre erste Frage: „Beschreib das Vorhaben in zwei bis drei Sätzen." Michael hat dort geantwortet und redet seitdem im Terminal weiter. Genau das sollte das Gespräch in der UI ersetzen.

Der Grund ist ein Denkfehler im Zuschnitt der ersten Stufe, kein Programmierfehler. Der Gesprächsbereich hängt an der Seite eines Vorhabens, und die gibt es erst, wenn der Ordner `intent/INT-…/` im Projekt existiert. Der Befehl `/intent` legt diesen Ordner aber erst an, nachdem er seine bis zu fünf Rückfragen gestellt hat. Das ganze Interview, das die Absicht überhaupt erst formt, läuft also in der Zeit, in der die UI noch nichts zeigen kann. Die Spec nennt dieses Interview ausdrücklich als Hauptfall des Gesprächs, aber die Anforderung FA-22 sagt „auf die neue Vorhaben-Seite wechseln, sobald der Ordner entsteht" und übersieht die Zeit davor.

**Was ändert sich?** Nach diesem Vorhaben zeigt die Projekt-Seite am Mac das Gespräch der neuen Sitzung sofort, in derselben rechten Spalte wie auf der Vorhaben-Seite. Michael liest dort die erste Frage, antwortet im Eingabefeld, sieht die zweite Frage, und so weiter. Wenn `/intent` am Ende den Ordner anlegt, springt die UI wie bisher auf die Seite des neuen Vorhabens, und das Gespräch läuft dort ohne Bruch weiter, ohne dass die Spalte dabei kurz verschwindet. Die Antworten, die Michael vorher aus der UI geschickt hat, stehen danach im Protokoll des Vorhabens, als hätte es das Vorhaben schon gegeben. Solange eine Absicht-Sitzung für ein Projekt läuft, bietet die Projekt-Seite keinen zweiten Start-Knopf an, sondern einen Hinweis mit dem Knopf „Im Terminal öffnen". Das verhindert die Doppelstarts, die heute im Screenshot als acht Sitzungen zu sehen waren. Auf dem Handy bleibt es beim Hinweis mit Terminal-Knopf, dort gibt es das Gespräch nach wie vor nicht.

Ein Nebeneffekt, den Michael bisher nur zufällig nicht gemerkt hat: Der Zustand „Vorhaben entsteht" lebte bisher nur im Browser-Tab. Nach einem Neuladen der Seite war er weg, obwohl das Backend die Sitzung kannte. Jetzt kommt dieser Zustand aus dem Backend, wie alles andere auf dieser Seite, und überlebt das Neuladen und auch einen Neustart des Backends, weil das Backend ihn schon heute in seine Zustandsdatei schreibt. Das gilt auch für Absicht-Sitzungen, die Michael von Hand im Terminal mit `/specwright:intent` gestartet hat: Das Backend merkt sich die schon heute, zeigt sie aber nicht; ab jetzt erscheint auch für sie das Gespräch auf der Projekt-Seite.

**Wie wird das gemacht?** Das Backend kennt die Sitzung bereits: Beim Start von „Absicht beginnen" trägt es sie als „anhängige Absicht" mit Projekt und Arbeitsverzeichnis in seine Zustandsdatei ein und wartet auf den ersten neuen Ordner, der dann dieser Sitzung zugeschrieben wird. Bisher hat das Backend diese Liste nur für sich benutzt. Neu schickt es sie in den Zustand mit, den die UI ohnehin bei jeder Änderung bekommt, samt Sitzungsname, Modell und Live-Status (wartet, arbeitet, Rückfrage offen). Die Projekt-Seite liest daraus: „Für dieses Projekt läuft eine Absicht-Sitzung" und blendet den Gesprächsbereich ein. Wechselt der Status so einer Sitzung, schickt das Backend nur den neuen Zustand, es durchsucht dafür nicht die Ordner des Projekts, denn es gibt noch keinen.

Der Gesprächsbereich selbst kann heute nur mit einer Vorhaben-Zeile arbeiten. Er bekommt eine zweite Möglichkeit: Statt einer Zeile reicht ihm auch die anhängige Sitzung. Alles, was er braucht, um den Verlauf zu abonnieren, den Kopf zu beschriften und das Eingabefeld zu sperren oder freizugeben, hat er damit. Der Verlauf kommt wie bisher aus dem Transkript der Sitzung, das ist von Vorhaben-Ordnern unabhängig.

Das Senden einer Antwort ist die eine Stelle, an der das Backend heute zwingend eine Vorhaben-Kennung verlangt. Die Nachricht „Freitext senden" bekommt eine zweite Adressform: statt „Projekt plus Vorhaben" auch „Projekt plus Sitzung". Das Backend prüft dann, ob diese Sitzung wirklich als anhängige Absicht dieses Projekts eingetragen ist, und nur dann schreibt es den Text in die Sitzung. Alle Regeln von heute bleiben: Wartet die Sitzung, geht der Text sofort; arbeitet sie, wird er eingereiht; ist eine Rückfrage oder ein Berechtigungsdialog offen, wird abgelehnt und auf das Terminal verwiesen. Der Protokoll-Eintrag für so eine Antwort hat vorerst keine Vorhaben-Kennung. Sobald der Ordner entsteht und die Sitzung ihm zugeschrieben wird, trägt das Backend die Kennung in genau die Einträge dieser einen Sitzung nach. So wandert das Interview ins Protokoll des Vorhabens. Endet die Sitzung, ohne dass ein Ordner entstanden ist, räumt das Backend diese Einträge weg; sie wären sonst für immer unsichtbar.

Ein Bild dafür: Bisher gab es das Gesprächszimmer erst, wenn die Akte angelegt war. Jetzt wird das Zimmer schon mit der Terminvergabe geöffnet, und was dort besprochen wird, kommt in die Akte, sobald sie eine Nummer hat.

**Was kann schiefgehen?** Drei Dinge sind zu beachten.

Erstens: Die Sitzung, die Michael gerade im Terminal führt, wurde vor diesem Umbau gestartet. Für sie kennt das Backend nach einem Neustart keinen Transkriptpfad, sie würde im Gespräch als „nicht verfügbar" erscheinen. Das ist die bekannte Einschränkung aus INT-2026-007 und kein neuer Fehler. Michael führt diese eine Sitzung im Terminal zu Ende oder bricht sie ab.

Zweitens: Bricht die Sitzung ab, bevor ein Ordner entsteht, verschwindet die anhängige Absicht aus dem Backend und damit das Gespräch von der Projekt-Seite, samt der bis dahin geschickten Antworten. Für einen Abbruch ist das hinnehmbar; das Terminal zeigt die Sitzung ohnehin weiter.

Drittens: Laufen zwei Absicht-Sitzungen für dasselbe Projekt, etwa eine aus der UI und eine von Hand im Terminal, dann zeigt die Projekt-Seite die ältere, weil das Backend auch den nächsten neuen Ordner der ältesten anhängigen Sitzung zuschreibt. Diese Regel gibt es schon heute; sie wird nur sichtbar. Der Start-Knopf ist in dieser Zeit versteckt, damit es nicht noch eine dritte wird.

Rückgängig machen geht per Revert der PR. Die Zustandsdatei des Backends bekommt keine neuen Felder, nur die Protokoll-Einträge anhängiger Sitzungen haben vorübergehend keine Vorhaben-Kennung. Ältere Backend-Stände zeigen solche Einträge nirgends an, weil sie zu keinem Vorhaben passen, und räumen sie nach 30 Tagen weg.

**Was musst du entscheiden?** Nichts, Freigabe reicht. Drei Dinge sind gesetzt, sag Bescheid, falls du anders willst: Auf dem Handy bleibt es beim Hinweis ohne Gespräch. Der Start-Knopf ist während einer laufenden Absicht-Sitzung versteckt, nicht nur ausgegraut. Und die Antworten einer abgebrochenen Absicht-Sitzung werden gelöscht statt aufgehoben.

## Details

### 1. Kurzfassung

Der Gesprächsbereich (`aos-gespraech`) wird von der Vorhaben-Zeile entkoppelt: Er akzeptiert alternativ eine **anhängige Absicht** (`VorhabenPendingIntent`), die das Backend ab jetzt in `vorhaben:state` mitliefert (aus `store.pendingIntents`, das es seit INT-2026-004 Stufe 2 gibt und das persistiert wird, `vorhaben-state.ts:128`). Die Projekt-Seite zeigt am Mac für eine anhängige Absicht denselben Split wie die Vorhaben-Seite. `gespraech:send-text` bekommt eine zweite Adressform `sessionId`, das Backend validiert sie gegen `store.pendingIntents`, schreibt Protokoll-Einträge **ohne** `intentId` (Feld wird optional) und trägt beim Claim des Ordners (`onDirAdded`) die Kennung in die Einträge dieser Sitzung nach; endet die Sitzung ohne Claim, werden sie entfernt. Kein neuer Bildschirm, keine neue WebSocket-Nachricht, keine AR-Änderung.

### 2. Ausgangslage im Code

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Anhängige Absicht im Backend | `vorhaben-state.ts:41-47` `PendingIntent {projectId, cwd, step, model, since}`, `:204-216` set/get/clear, **persistiert** in `vorhaben-<port>.json` (`:61`, Laden `:128`); gesetzt in `vorhaben-service.ts:614` (`startStep` ohne intentId) und `:676` (`onPromptText`, `/intent` von Hand); Claim in `onDirAdded :681-690` (erster Treffer je cwd, Einfügereihenfolge); gelöscht in `onSessionClosed :655` | **[Certain]** Wiederverwendbar — der Zustand existiert und überlebt Neustarts, wird nur nicht ausgeliefert. `getState() :251-262` kennt ihn nicht. |
| Broadcast-Auslöser | `onAgentEvent :660` `if (this.isAssigned(sessionId)) this.scheduleRescan(0)`; `isAssigned :625` nur `allAssignments` | **[Certain]** Statuswechsel einer anhängigen Sitzung lösen heute keinen Broadcast aus. Für sie genügt `broadcastState()` (kein Ordner → kein Scan nötig). `onPromptText`-Pfad `:676` broadcastet nicht. |
| Session-Referenz | `sessionFor(projectId, intentId) :700-711` baut `VorhabenSessionRef` aus Assignment + Live-Status; ohne Live-Sitzung `{agentStatus:'unknown', ended:true}` | **[Certain]** Kern extrahieren: `sessionRefOf(sessionId, name, model)`; `sessionFor` ruft ihn. Verhalten ohne Live-Sitzung bleibt identisch (Eingabe gesperrt „beendet"). |
| Freitext senden | `sendText(projectId, intentId, rawText) :447-497`: `requireRow` → `row.session` → Statusregeln → `ProtokollEintrag` → `pasteLocked(sessions, sessionId, text, mode) :508-556` | **[Certain]** `pasteLocked` und `withMachineWrite` nehmen nur `sessionId`, `readScreen`, `sendInput` — **keine** Zeile, kein Ordner, keine Kopie-Prüfung. Kern ab `:450` ist zeilenunabhängig → `sendToSession(projectId, intentId \| undefined, ref, text)`. |
| Protokoll-Typ und Konsumenten | `ProtokollEintrag.intentId: string` (`vorhaben.protocol.ts:191`); Konsumenten: `aos-vorhaben-seite.ts:381` (Filter `e.intentId === r.intentId`), `vorhaben-state.ts:354` (Prune: `liveKeys.has(assignmentKey(e.projectId, e.intentId))`, sonst 30 Tage), `pendingSends()` (nach `status`), `gespraech-service.ts` Quellen-Zuordnung (nach `sessionId`), `hasPendingSend :356` (nach `status`/`sentAt`) | **[Certain]** Feld optional machen: `tsc` zwingt jeden Konsumenten zur Entscheidung; Filter mit echter Kennung matchen `undefined` nie; Prune räumt kennungslose Einträge nach 30 Tagen. |
| Protokoll-Store | `vorhaben-state.ts:293` `updateProtocolEntry(id, patch: Partial<Pick<…,'status'\|'acceptedAt'>>)`, `:310` `removeProtocolEntry` — Einträge werden heute schon mutiert (Status, Bestätigung) | **[Certain]** Kein Append-only-Vertrag. Neue Methoden: `claimPendingProtocol(sessionId, intentId)`, `dropUnclaimedProtocol(sessionId)`. |
| WS-Handler | `gespraech-handler.ts:84-108` `send-text` verlangt `projectId`+`intentId` (`INTENT_ID_RE`), `findProject`, dann `vorhaben.sendText`; Code `UNKNOWN_SESSION` `:64` vorhanden; `fromError :148-158` | **[Certain]** Zweite Adressform; `VorhabenError.code`-Union (`vorhaben-service.ts:165`) um `UNKNOWN_SESSION`. |
| Frontend-Service | `gespraech.service.ts:102-116` `send(projectId, intentId, text)` | **[Certain]** Signatur auf Ziel-Objekt. |
| Gesprächsbereich | `aos-gespraech.ts:96` `row!`; `eingabeZustand :43-56` liest `row.session`, `row.zustand` (nur `keine_sitzung`/`sitzung_beendet`), `row.nextStep`; `kopfZustand :66-88` liest `session`, `zustand`, `lastChangedMs`; Kopf `:207-213` (`s.name`, `r.arbeitskopie` → `''` zeigt „Im Projekt"); `renderHinweis :247-267` (`r.session`, `r.nextStep`) | **[Certain]** Genau 7 Felder → `GespraechZiel`. `''` als Arbeitskopie ist heute schon ein gültiger Wert. |
| View | `aos-vorhaben-view.ts:56` `pendingIntentSessionId` (Client-Gedächtnis für die Navigation), `followStartedIntent :165-172`, `renderProjekt :296-311` ohne Split, `render() :212` Split-Klasse nur Route `vorhaben` | **[Certain]** Split für Route `projekt`; Anzeige-Quelle wird `state.pendingIntents`, Navigations-Schlüssel bleibt Client-Gedächtnis (siehe §3 Ansatz 7, Review 14/15/21). |
| Projekt-Seite | `aos-projekt-seite.ts:34` `startedSessionId`; `:250` Karte ohne Terminal-Knopf; `:251-260` `aos-naechster-schritt` immer sichtbar | **[Certain]** Prop → `pending`; Karte mit Knopf; Start-Box aus. |
| Split-CSS | `theme.css:6764-6790` | **[Likely]** Wiederverwendbar; R-5. |
| Terminal-Sprung | `open-terminal-session {sessionId}` auf `document` (`aos-gespraech.ts:160`), Handler `app.ts:485/541`, am Handy über die Terminal-Pill-Route | **[Certain]** Wiederverwenden; Handy-Klick wird getestet (AK-06). |
| Verlauf | `gespraech-service.ts ensure()` braucht nur `manager.getSession(id)`; Abo per `sessionId` | **[Certain]** Vorhabenunabhängig, keine Änderung. |
| `/intent`-Workflow | `specwright/workflows/core/intent.md:37,76` | **[Certain]** Ursache; bleibt unverändert (AR-06). |
| Watcher | `vorhaben-watcher.ts:16` `INTENT_DIR_RE = /^(INT-\d{4}-\d{3})(?:-[A-Za-z0-9._-]+)?$/`, `:164-165`, `:198-199`: `dir-added` nur für passende Ordner direkt unter `intent/`, `intent/` selbst löst nur `changed` aus | **[Certain]** Kein Fehl-Claim möglich; R-1 aus Fassung 1 entfällt. |

### 3. Entwurf

#### Ansatz

1. **Backend liefert anhängige Absichten aus.** `VorhabenState.pendingIntents: VorhabenPendingIntent[]` mit `{ sessionId, projectId, cwd, arbeitskopie, since, session: VorhabenSessionRef }`. Gebaut in `getState()` aus `store.getPendingIntents()` + `sessionRefOf()`; Name aus `workspace.sessionNames`, Fallback `'intent'`; `arbeitskopie` aus `this.projects` (cwd = Projektpfad → `info.arbeitskopie`, sonst `basename(cwd)`; beides ohne Scan verfügbar, `''` ist ein gültiger Wert). Ende einer Sitzung ohne Claim: Eintrag entfällt (heute schon, `:655`).
2. **Broadcast bei jedem Wechsel, ohne Scan:** `onAgentEvent`: `isAssigned` → `scheduleRescan(0)` (wie heute); sonst `isPending` → nur `broadcastState()`. `onPromptText` (Pending gesetzt) und `onSessionClosed` (Pending gelöscht) → `broadcastState()`.
3. **Senden an eine Sitzung ohne Vorhaben.** `sendText(projectId, intentId, text)` bleibt für die Vorhaben-Seite und die Stufe-2-Karten. Neu `sendTextToSession(projectId, sessionId, text)`: (a) Assignment der Sitzung in diesem Projekt vorhanden → `intentId` der Zeile (Race: Ordner gerade entstanden); (b) sonst Pending mit `projectId`-Match → `intentId: undefined`; (c) sonst `VorhabenError('UNKNOWN_SESSION')`. Gemeinsamer Kern `sendToSession(projectId, intentId, ref, text)` = heutiger Code ab `:450`. Reihenfolge (a) vor (b) schließt die Lücke aus Review 5: Sobald das Assignment steht, entsteht kein kennungsloser Eintrag mehr; ein Eintrag, der vor dem Claim geschrieben wurde, wird vom Claim erfasst (Ansatz 4), weil beides auf dem Store serialisiert läuft (kein `await` zwischen Pending-Prüfung und `addProtocolEntry`).
4. **Kennung nachtragen, Rest räumen.** `ProtokollEintrag.intentId?: string` (fehlt = anhängig). `store.claimPendingProtocol(sessionId, intentId)` setzt die Kennung auf allen Einträgen **dieser Sitzung** ohne Kennung (Schlüssel ist die Sitzung, die den Claim bekommt; fremde Sitzungen sind nicht betroffen, Review 13); `onDirAdded` ruft es nach `setAssignment`. `store.dropUnclaimedProtocol(sessionId)` entfernt kennungslose Einträge einer Sitzung; `onSessionClosed` ruft es, wenn ein Pending gelöscht wurde. Prune (30 Tage) bleibt als Netz.
5. **WS-Adressform.** `GespraechSendTextMessage`: `intentId?` xor `sessionId?`. Handler: genau eine der beiden, `INTENT_ID_RE` bzw. `CLOUD_SESSION_ID_RE`, `findProject`, dann `sendText` / `sendTextToSession`. Sicherheit (security.md §6): `sessionId` ist nur ein Schlüssel in den Store, nie ein Pfad; ohne Pending/Assignment für dieses Projekt → `UNKNOWN_SESSION`; Antwort-Datenklasse unverändert.
6. **Frontend-Ziel.** `gespraech.service.send(projectId, ziel: {intentId} | {sessionId}, text)`. `aos-gespraech`: `row?: VorhabenRow`, `pending?: VorhabenPendingIntent`; pure `gespraechZiel(row, pending): GespraechZiel | null` mit **vollständiger Abbildung** (Review 19):

    | Feld | aus `row` | aus `pending` |
    |---|---|---|
    | `projectId` | `row.projectId` | `pending.projectId` |
    | `intentId` | `row.intentId` | `undefined` |
    | `session` | `row.session` | `pending.session` |
    | `arbeitskopie` | `row.arbeitskopie` | `pending.arbeitskopie` |
    | `zustand` | `row.zustand` | `session.ended` → `sitzung_beendet`; `blocked` → `wartet_rueckfrage`/`wartet_plan`/`wartet_berechtigung` nach `blockKind`; `working` → `arbeitet`; sonst `wartet` |
    | `nextStep` | `row.nextStep` | `undefined` (kein nächster Schritt vor dem Ordner) |
    | `lastChangedMs` | `row.lastChangedMs` | `Date.parse(pending.since)` |

    `eingabeZustand`/`kopfZustand` nehmen `GespraechZiel`; `row` hat Vorrang, wenn beide gesetzt sind. Zusatz-Notiz im Verlauf bei `pending`: „Vorhaben entsteht — die Vorhaben-Seite öffnet sich, sobald der Ordner da ist." Kopf trägt `data-session-id` (Review 8).
7. **View: Anzeige aus dem Zustand, Navigation aus dem Gedächtnis.** `renderProjekt()`: `pending = state.pendingIntents.filter(p => p.projectId === pid).sort(by since)[0]`. Mac + `pending` → `.vorhaben-split` mit Seite links, `aos-gespraech .pending .protocol=${protocol.filter(e => e.sessionId === pending.sessionId)}` rechts. `pendingIntentSessionId` bleibt Client-Gedächtnis **nur für die Navigation** (FA-22): gesetzt aus `vorhaben-session-started` oder beim ersten Beobachten eines Pending für das angezeigte Projekt; geleert nach der Navigation oder wenn weder Pending noch Zeile die Sitzung tragen (Abbruch). Der Broadcast, der das Pending löscht, ist derselbe, der die neue Zeile bringt (Review 14): `followStartedIntent` matcht die Zeile gegen das Gedächtnis, nicht gegen `state.pendingIntents`. Gegen das Flackern (Review 15): solange `pendingIntentSessionId` gesetzt ist und eine Zeile die Sitzung trägt, rendert die Projekt-Route den Split mit `aos-gespraech .row=${zeile}` weiter, bis die Route gewechselt hat; gleiche `sessionId` → `follow()` abonniert nicht neu. Das ist keine zweite Wahrheit (Review 21): Was gezeigt wird, kommt aus dem Zustand; das Gedächtnis hält nur die Absicht „hier hin springen".
8. **Projekt-Seite.** Bei `pending`: Karte „Absicht-Sitzung „<name>" läuft — Vorhaben entsteht …" mit Knopf „Im Terminal öffnen" (`open-terminal-session`), Text je Gerät („Gespräch rechts" / „im Terminal antworten"), Start-Box versteckt (AK-04). Ohne `pending`: wie heute.

#### Verworfene Alternativen

| Alternative | Warum nicht |
|---|---|
| Nur Hinweis + Terminal-Knopf (Weg A) | Löst das Symptom, nicht den Zweck von INT-2026-007 §10 (Interview ohne Terminal). Michael hat B gewählt. |
| `/intent` legt den Ordner in Step 1 an (Platzhalter-Kurzname) | Kurzname erst nach dem Gespräch bekannt; Umbenennen bricht Board-Verweise und den Claim; AR-06/NZ-04 (Workflows unverändert). |
| Anhängige Absicht als Pseudo-`VorhabenRow` in `rows` | Übersicht, Sortierung, Reader, `requireRow`, `store.prune` müssten den Sonderfall kennen. |
| `sessionId` als einzige Adresse, `intentId` serverseitig auflösen (Review 3) | Stufe-2-Karten (Antwort, Plan-Entscheidung) und der Review-Kanal adressieren Vorhaben und Dokument, nicht Sitzungen; das Protokoll wird nach Vorhaben gefiltert. Umstellung wäre ein eigenes Vorhaben ohne Nutzen für dieses. Die Union ist ein Feld mit xor-Prüfung, kein zweiter Pfad im Kern (`sendToSession` ist gemeinsam). |
| Sentinel `intentId: ''` statt optionalem Feld (Fassung 1) | Falsy-Sentinel entgeht `tsc`; optional zwingt jeden Konsumenten zur Entscheidung (Review 1/17). |

#### Architektur-Auswirkung

- **Nein** — bleibt innerhalb von `architecture.md` §2 (Backend: Vorhaben-Sicht, Gespräch) und §3 (Nutzerzustand im Backend, AR-05). Wortlaut §3 „Zuordnung Sitzung↔Vorhaben" wird um „auch anhängige Absicht-Sitzungen ohne Ordner" ergänzt (Klarstellung, keine Grenzverschiebung). ADR: nein.

### 4. Änderungen

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/src/shared/types/vorhaben.protocol.ts` | ändern | `VorhabenPendingIntent`; `VorhabenState.pendingIntents`; `ProtokollEintrag.intentId?` mit Kommentar (fehlt = anhängige Absicht, wird beim Claim gesetzt) | AK-01, AK-05 |
| 2 | `ui/src/shared/types/gespraech.protocol.ts` | ändern | `GespraechSendTextMessage`: `intentId?` xor `sessionId?` | AK-02 |
| 3 | `ui/src/server/services/vorhaben-state.ts` | ändern | `claimPendingProtocol(sessionId, intentId)`, `dropUnclaimedProtocol(sessionId)`; Prune-Aufruf mit optionalem Feld | AK-03 |
| 4 | `ui/src/server/services/vorhaben-service.ts` | ändern | `pendingIntentInfos()` in `getState()`; `sessionRefOf()`; `isPending`; Broadcast-Regeln (Ansatz 2); `sendTextToSession()` + Kern `sendToSession()`; `onDirAdded` → claim; `onSessionClosed` → drop; `VorhabenError`-Code `UNKNOWN_SESSION`; alle `e.intentId`-Stellen auf optional | AK-01–AK-03, AK-05, AK-07 |
| 5 | `ui/src/server/services/gespraech-handler.ts` | ändern | zweite Adressform, xor-Validierung, Deps-Typ um `sendTextToSession`, `fromError` mappt `UNKNOWN_SESSION` | AK-02 |
| 6 | `ui/frontend/src/services/gespraech.service.ts` | ändern | `send(projectId, ziel, text)` | AK-02 |
| 7 | `ui/frontend/src/components/vorhaben/aos-gespraech.ts` | ändern | `pending`-Prop, `GespraechZiel`, `gespraechZiel()`, Zustandsfunktionen auf Ziel, Notiz, `data-session-id` | AK-01 |
| 8 | `ui/frontend/src/views/aos-vorhaben-view.ts` | ändern | Split auf Route `projekt`, Anzeige aus State, Navigation + Flacker-Schutz | AK-01, AK-03, AK-05, AK-07 |
| 9 | `ui/frontend/src/components/vorhaben/aos-projekt-seite.ts` | ändern | Prop `pending`, Karte mit Terminal-Knopf, Start-Box aus | AK-04, AK-06 |
| 10 | `ui/frontend/src/components/vorhaben/aos-vorhaben-seite.ts` | ändern | Protokoll-Filter mit optionalem `intentId` (nur Typ, Verhalten gleich) | Typ |
| 11 | `intent/INT-2026-007-sitzung-als-gespraech/spec.md` | ändern | Nachtrag an FA-22 und AN-S03, datiert, mit Verweis auf INT-2026-008 (Muster: Nachtrag INT-2026-004 in Stufe 1) | Doku |
| 12 | `docs/architecture.md` | ändern | §3 Nutzerzustand-Zeile, Änderungsprotokoll | Doku |
| 13 | `intent/INT-2026-008-gespraech-ab-sitzungsstart/{intent.md,plan.md,design/}` | neu | Bypass-Intent (Kern), dieser Plan, `ist-*.png`, `e2e-protokoll.txt` | Prozess |
| 14 | Tests (§8) | neu/ändern | — | alle AK |

**Nicht betroffen (ausdrücklich):** `specwright/workflows/core/intent.md`, `.claude/commands/` (AR-06); `transcript-reader.ts`, `gespraech-service.ts`; `vorhaben-reader.ts`, `vorhaben-watcher.ts` (Filter belegt, §2); `aos-sende-leiste.ts`; `theme.css` [Likely]; `app.ts`; `plan-review-orchestrator.ts`; Handy-Shell.

### 5. Verbindungen

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `vorhaben-service.getState` | Client (`vorhaben:state`) | WS-Broadcast | `state.pendingIntents` | `grep -n "pendingIntents" ui/src/server/services/vorhaben-service.ts ui/src/shared/types/vorhaben.protocol.ts` | — |
| `aos-vorhaben-view.renderProjekt` | `aos-gespraech` | Props | `.pending=${…}` bzw. `.row=${…}` (Flacker-Schutz) | `grep -n "\.pending=" ui/frontend/src/views/aos-vorhaben-view.ts` | — |
| `aos-vorhaben-view.renderProjekt` | `aos-projekt-seite` | Props | `.pending=${…}` | `grep -rn "startedSessionId" ui/frontend/src` → 0 Treffer | — |
| `aos-gespraech.onSend` | `gespraech.service.send` | Aufruf | `send(projectId, {sessionId} \| {intentId}, text)` | `grep -n "gespraechService.send(" ui/frontend/src/components/vorhaben/aos-gespraech.ts` | — |
| `gespraech.service.send` | `gespraech-handler` | WS | `gespraech:send-text {projectId, sessionId}` | Test `gespraech-handler.test.ts` „send-text mit sessionId" | — |
| `gespraech-handler` | `vorhaben-service.sendTextToSession` | Aufruf | Deps-Pick | `grep -n "sendTextToSession" ui/src/server/services/gespraech-handler.ts ui/src/server/websocket.ts` | — |
| `vorhaben-service.onDirAdded` | `vorhaben-state.claimPendingProtocol` | Aufruf | `(sessionId, intentId)` | `grep -n "claimPendingProtocol" ui/src/server/services/` | — |
| `vorhaben-service.onSessionClosed` | `vorhaben-state.dropUnclaimedProtocol` | Aufruf | `(sessionId)` | `grep -n "dropUnclaimedProtocol" ui/src/server/services/` | — |
| `aos-projekt-seite` (Knopf) | `app.ts` | DOM-Event | `open-terminal-session {sessionId}` | `grep -n "open-terminal-session" ui/frontend/src/components/vorhaben/aos-projekt-seite.ts` | — |
| `vorhaben-service.onAgentEvent` | Broadcast | Aufruf | `isPending → broadcastState()` | Test „Status einer anhängigen Sitzung: Broadcast ohne Rescan" | — |

- [x] Keine neue Komponente.
- [x] Jeder Nachweis ist ein ausführbarer Befehl oder ein benannter Test.

### 6. Reihenfolge der Arbeit

1. Vorhaben-Ordner: `intent.md` (Kern, `bypass: ja`, Größe S, Risikoklasse niedrig, AK-01…AK-07 wie §8) und `plan.md` (dieser Plan) → Commit **vor dem ersten Code**.
2. Shared-Typen (#1, #2; `intentId?`) → `cd ui && npx tsc --noEmit` in beiden Projekten listet jeden Konsumenten → alle Stellen entscheiden (#4, #10).
3. Store `claimPendingProtocol`, `dropUnclaimedProtocol` + Tests → grün.
4. Service (#4) → `vorhaben-service-stage2/3.test.ts` alt und neu grün.
5. Handler (#5) + Tests → grün.
6. Frontend (#6–#9) → Komponententests grün; `cd ui && npm run lint`; `npx tsc --noEmit` (beide).
7. Docs (#11, #12).
8. E2E (§8) mit Screenshots und Protokoll.
9. `bash scripts/verify.sh` → `verify: OK`; PR; CI; §14 nachziehen; Abschlussbericht mit Block „Für das Board".

### 7. Zerlegung

#### Variante A — nicht zerlegbar, eine Sitzung

Typ, Handler, Service und Komponente greifen über die Adressform und `VorhabenPendingIntent` ineinander (§5, 10 Verbindungen); Umfang unter einem Tag.

### 8. Tests und Nachweis

| AK | Test | Datei | Art |
|---|---|---|---|
| AK-01 Projekt-Seite zeigt am Mac das Gespräch der anhängigen Absicht | Route `projekt`, `state.pendingIntents=[p]` → `.vorhaben-split` mit `aos-gespraech` (`pending` gesetzt); ohne Pending kein Split | `ui/tests/unit/aos-vorhaben-view-split.test.ts` | Komponente |
| AK-01 Kopf/Eingabe aus Pending | `gespraechZiel(undefined, pending)` liefert die Tabelle aus §3.6 für alle vier `agentStatus`-Fälle und `ended`; Kopf „Gespräch mit intent · wartet"; `working` → `einreihen`; `blocked/rueckfrage` → gesperrt mit Terminal-Knopf; `ended` → gesperrt „beendet" ohne nächsten Schritt; Notiz „Vorhaben entsteht" | `ui/tests/unit/aos-gespraech.test.ts` | Komponente |
| AK-02 Senden ohne Vorhaben, **durch `pasteLocked`** | Fake mit `readScreen`/`waitForIdle`/`withMachineWrite`/`sendInput` (Muster `vorhaben-service-stage3.test.ts`): wartend → `gesendet`, Eintrag ohne `intentId`, Paste + Enter unter dem Lock; arbeitend → `eingereiht`; Dialog-Cue auf dem Bildschirm → `dialog_offen`, Eintrag entfernt; `withMachineWrite` → `beschaeftigt`; Sitzung nicht anhängig/zugeordnet für `p` → `UNKNOWN_SESSION`; Sitzung inzwischen zugeordnet → `intentId` der Zeile | `ui/tests/unit/vorhaben-service-stage3.test.ts` | Unit |
| AK-02 Handler | `send-text {projectId, sessionId}` → `sendTextToSession`; beide oder keine Adresse → `INVALID_MESSAGE`; ungültige `sessionId` → `INVALID_MESSAGE`; `UNKNOWN_SESSION` durchgereicht | `ui/tests/unit/gespraech-handler.test.ts` | Unit |
| AK-02 Client | `send('p',{sessionId},'x')` schickt `sessionId`, kein `intentId`; `{intentId}` wie bisher | `ui/tests/unit/gespraech-client-service.test.ts` | Unit |
| AK-03 Kennung nachtragen | `dir-added` → Einträge **dieser** Sitzung ohne Kennung tragen sie danach; Einträge einer zweiten anhängigen Sitzung im selben cwd bleiben ohne; Einträge mit Kennung unverändert; Eintrag, der vor dem Claim geschrieben wurde, wird erfasst | `vorhaben-state.test.ts` (`claimPendingProtocol`), `vorhaben-service-stage2.test.ts` (Ablauf) | Unit |
| AK-03 Aufräumen | `session.closed` einer anhängigen Sitzung → kennungslose Einträge weg, Pending weg, Broadcast; Einträge mit Kennung bleiben | `vorhaben-service-stage2.test.ts` | Unit |
| AK-03 Navigation im selben Zustand | Zustand 1: Pending für `p` → Gedächtnis gesetzt; Zustand 2 (ein Broadcast): Pending leer **und** Zeile mit dieser Sitzung → `navigate('vorhaben', …)`; vor dem Routenwechsel bleibt `aos-gespraech` gemountet (gleiches Element, `.row` gesetzt); auch ohne vorheriges `vorhaben-session-started` | `aos-vorhaben-view-split.test.ts` | Komponente |
| AK-03 Abbruch | Pending verschwindet, keine Zeile → Gedächtnis geleert, kein `navigate`, Split weg | `aos-vorhaben-view-split.test.ts` | Komponente |
| AK-04 kein zweiter Start | Pending → kein `aos-naechster-schritt`, Karte mit Knopf → `open-terminal-session {sessionId}` auf `document` | `aos-vorhaben-view-split.test.ts` (rendert `aos-projekt-seite`) | Komponente |
| AK-05 Zustand aus dem Backend | `getState().pendingIntents` mit `session` (Live-Status, Name aus `sessionNames`, Fallback `intent`, `arbeitskopie` aus Projektinfo/basename); `getSession` fehlt → `ended:true`; `session.agent-event` einer anhängigen Sitzung → Broadcast **ohne** Rescan (Watcher/Scan-Spy unberührt); zugeordnete Sitzung → Rescan wie heute; `onPromptText` `/specwright:intent` → Broadcast; Store-Roundtrip (`load`) behält `pendingIntents` | `vorhaben-service-stage2.test.ts`, `vorhaben-state.test.ts` | Unit |
| AK-06 Handy | `mobile=true` + Pending → kein `aos-gespraech`, Karte sichtbar, Klick auf „Im Terminal öffnen" dispatcht `open-terminal-session` mit der `sessionId` | `aos-vorhaben-view-split.test.ts` | Komponente |
| AK-07 Hand-Sitzung | wie AK-05 (`onPromptText`) + AK-03 Navigation ohne Start-Ereignis | s. o. | Unit + Komponente |

- **Verify-Befehl:** `bash scripts/verify.sh` → `verify: OK`; Ausgabe im PR. CI ist die Wahrheit; `ui/tests/known-failures.txt` unangetastet.
- **Angeschlossen (E2E-Pfad, Playwright, Rezept `reference_cloud_terminal_e2e_playwright.md`):** Branch-Backend 3111 (`env -u CLAUDE_CODE_CHILD_SESSION -u CLAUDECODE -u CLAUDE_CODE_SESSION_ATTENDED CLAUDE_CODE_FORCE_SESSION_PERSISTENCE=1 PORT=3111 SPECWRIGHT_RUNTIME_DIR=/tmp/sw-3111 npm run start:backend`), Scratch-Projekt (Realpath-IDs), Haiku. Ablauf: Projekt-Seite → „Absicht beginnen" → Gespräch rechts, erste Frage sichtbar → Antwort aus der UI → im Terminal sichtbar (`capture-pane`) → Reload während „entsteht" → Gespräch wieder da → zweite Antwort → `/intent` legt Ordner an → UI wechselt auf `#/vorhaben/<pid>/INT-…`, Spalte bleibt stehen (Frame-Zählung wie EK-02) → Protokoll zeigt beide UI-Antworten. Screenshots `design/ist-01-projekt-gespraech.png`, `ist-02-vorhaben-seite.png`, Protokoll `design/e2e-protokoll.txt`. Skript nur im Scratchpad.
- **UI:** kein neuer Mock. Gesprächsspalte = Mock 08 (INT-2026-007); links Projekt-Seite (Mock 07, INT-2026-004). Abweichung in §14, Screenshot neben Mock 08 im PR.

### 9. Risiken

| Risiko | W. | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| R-2 Sitzung endet ohne Ordner → Pending und kennungslose Einträge weg | mittel | niedrig | bewusst (Ansatz 4); Terminal zeigt die Sitzung weiter; Test AK-03 Aufräumen | Michael |
| R-3 Zwei anhängige Absichten je Projekt | niedrig | niedrig | älteste anzeigen = Claim-Regel `onDirAdded`; Kopf nennt Sitzungsname; Start-Box versteckt | Michael |
| R-4 Race Ordner ↔ Senden | niedrig | niedrig | Assignment vor Pending prüfen; Claim erfasst frühere Einträge; Test | Test |
| R-5 Split-CSS auf der Projekt-Seite (Editor-Grid) | mittel | niedrig | Screenshot E2E; nötigenfalls `--gespraech-width` an `.layout` | Screenshot |
| R-6 Broadcast-Häufigkeit | niedrig | niedrig | Pending-Statuswechsel lösen nur `broadcastState()` aus, keinen Scan; zugeordnete Sitzungen wie heute | — |
| R-7 Sitzung vor dem Umbau gestartet (Kompass): kein Transkript, nach Neustart evtl. kein Live-Status → „nicht verfügbar", Eingabe gesperrt „beendet" | sicher | niedrig | bekannte Einschränkung INT-2026-007; gleiches Verhalten wie für zugeordnete Sitzungen; §10 | Michael |
| R-8 Optionales `intentId` an einer Stelle unbehandelt | niedrig | mittel | `tsc` in beiden Projekten; Schritt 2 listet alle Stellen | `tsc`, Tests |

### 10. Manuelle Schritte

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Laufende Absicht-Sitzung im Projekt Kompass im Terminal abschließen oder beenden (R-7) | Michael | vor dem Neustart des Backends 3001 | [ ] |
| Backend 3001 nach dem Merge neu starten: `cd ui && npm run start:backend` (läuft seit 11:18 auf altem Stand) | Michael | nach Merge | [ ] |
| Merge der PR (löst Auto-Deploy auf dem Cloud-Host aus) | Michael | — | [ ] |

### 11. Schätzung

6–8 h (Fassung 1: 5–7 h; plus Tests für Lock-Pfad, Navigation im selben Zustand, Aufräumen). Unsicherheit: View-Tests (happy-dom, Split auf zweiter Route) und E2E mit echter Sitzung.

### 12. Review des Plans

Externer Konsens 16.09. (3 Reviewer: Opus, Grok, MiniMax). Jede Zeile: Entscheidung und Plan-Stelle.

| # | Finding (Kurz) | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|---|
| 1 | Nachtragen von `intentId` verletzt Append-only; `''`-Sentinel | Opus, Grok | **angenommen (Sentinel), abgelehnt (Append-only)** — Store mutiert Einträge heute schon (`updateProtocolEntry`, `removeProtocolEntry`); Claim ist ein einmaliger, benannter Übergang. Sentinel `''` ersetzt durch optionales Feld, `tsc` zwingt Konsumenten. | §2 Protokoll-Typ, §3 Ansatz 4, §4 #1/#10, R-8 |
| 2 | `isTracked` → `scheduleRescan` für ordnerlose Sitzungen | MiniMax, Grok | **angenommen** — Pending nur `broadcastState()`, kein Scan | §3 Ansatz 2, R-6, Test AK-05 |
| 3 | Duale Adressierung dauerhaft; `sessionId` kanonisch machen | Opus | **abgelehnt** — Stufe-2-Karten und Review-Kanal adressieren Vorhaben+Dokument; Protokoll ist nach Vorhaben gefiltert; Kern ist gemeinsam (`sendToSession`), die Union ist eine xor-Prüfung im Handler | §3 Alternativen |
| 4 | `isTracked` vermischt Lebenszyklen | Opus | **angenommen** — getrennte Prädikate `isAssigned`/`isPending` mit unterschiedlicher Reaktion | §3 Ansatz 2 |
| 5 | Race Senden ↔ Claim erzeugt kennungslosen Eintrag | Opus | **angenommen** — Assignment vor Pending prüfen; Store-Operationen ohne `await` dazwischen; Claim erfasst frühere Einträge; Test | §3 Ansatz 3, Test AK-03 |
| 6 | Persistenz von `pendingIntents` unklar | Opus | **abgelehnt (Fakt)** — Teil der Zustandsdatei, `vorhaben-state.ts:61,128`; Roundtrip-Test ergänzt | §2, Test AK-05 |
| 7 | Zwei Browser-Tabs | Opus | **abgelehnt** — identisch zur Vorhaben-Seite heute: Backend ist die Wahrheit, Schreiben serialisiert `withMachineWrite`, `open-terminal-session` ist ein Tab-lokales DOM-Ereignis; keine neue Fläche | — |
| 8 | Name-Fallback `intent` nicht unterscheidbar | Opus | **teilweise angenommen** — `data-session-id` am Kopf; Fallback bleibt (Tab-Name ist die Wahrheit, `startStep` setzt ihn) | §3 Ansatz 6 |
| 9 | Spec-Nachtrag in derselben PR | Opus | **abgelehnt** — etabliertes Muster (Nachtrag INT-2026-004 in PR #53), datiert und mit Verweis; die neuen AKs stehen in `intent.md` von INT-2026-008, die Spec-Zeile ändert keine FA, sie verweist | §4 #11 |
| 10 | Handy: Terminal-Knopf ungetestet | Opus | **angenommen** — Klick-Test | Test AK-06 |
| 11 | `arbeitskopie` ohne Scan | MiniMax | **angenommen (vereinfacht)** — aus `this.projects`/basename, kein Scan, keine Map | §3 Ansatz 1 |
| 12 | Leere `arbeitskopie` bricht Vertrag | MiniMax | **abgelehnt (Fakt)** — `''` ist heute gültig (kein Git-Repo), Kopf zeigt „Im Projekt" (`aos-gespraech.ts:209`); `pasteLocked` hat keine Kopie-Prüfung (`:508-556`) | §2 |
| 13 | Backfill trifft falsche Sitzung | MiniMax | **abgelehnt** — Schlüssel ist die `sessionId`, die den Claim bekommt; deren Einträge gehören ihr; Test mit zweiter anhängiger Sitzung | §3 Ansatz 4, Test AK-03 |
| 14 | Navigation verpasst den Ordner (Pending leer im selben Zustand) | Grok | **angenommen** — Navigations-Schlüssel bleibt Client-Gedächtnis, Test im selben Zustand | §3 Ansatz 7, Test AK-03 |
| 15 | Spalte flackert beim Claim | Grok | **angenommen** — Projekt-Route rendert den Split mit der neuen Zeile weiter, bis die Route gewechselt hat; gleiche `sessionId` → kein Re-Abo | §3 Ansatz 7, E2E Frame-Zählung |
| 16 | `pasteLocked`/`withMachineWrite` setzen Zeile voraus | Grok | **abgelehnt (Fakt)** — Signatur `(sessions, sessionId, text, mode)`, nur `readScreen`/`sendInput`/`withMachineWrite(sessionId)`; keine Zeile, kein Pfad | §2 Freitext senden |
| 17 | Sentinel falsy; Reste nie GC | Grok | **angenommen** — optionales Feld; `dropUnclaimedProtocol` bei Sitzungsende; Prune 30 Tage als Netz | §3 Ansatz 4, R-2 |
| 18 | Watcher-Filter nur Hoffnung | Grok | **abgelehnt (Fakt)** — `INTENT_DIR_RE` (`vorhaben-watcher.ts:16,164,198`); `intent/` selbst löst nur `changed` aus | §2 Watcher |
| 19 | `GespraechZiel`-Abbildung unvollständig | Grok | **angenommen** — Tabelle je Feld, Test aller Statusfälle | §3 Ansatz 6, Test AK-01 |
| 20 | Live-Status fehlt (Neustart, Race) | Grok | **angenommen** — `sessionRefOf` liefert `ended:true` wie `sessionFor` heute → Eingabe gesperrt; Test; R-7 erweitert | §3 Ansatz 1, Test AK-05, R-7 |
| 21 | Zwei Wahrheiten für Pending | MiniMax | **abgelehnt mit Präzisierung** — Anzeige ausschließlich aus `state.pendingIntents`; das Client-Gedächtnis ist Navigationsabsicht, keine Zustandskopie | §3 Ansatz 7 |
| 22 | AK-02 testet den Lock-Pfad nicht | Grok | **angenommen** — Test durch `pasteLocked` mit Fake-Lock, Dialog-Cue, `beschaeftigt` | Test AK-02 |
| 23 | AK-03 testet nicht denselben Zustand | Grok | **angenommen** — siehe 14 | Test AK-03 |

**Minimalinvasiv geprüft:** `store.pendingIntents` (inkl. Persistenz), `sessionFor`-Kern, `sendText`-Kern, `pasteLocked`, Split-CSS, `open-terminal-session`, `pendingAsBeitraege`, `gespraech:subscribe`, Prune wiederverwendet; keine neue WS-Nachricht, keine neue Komponente, kein neuer Mock, Workflows unverändert. Gestrichen: Pseudo-Zeile, Sentinel, Kopie-Label-Map, `isTracked`.

### 13. Definition of Done

- [x] Jedes AK aus §8 hat einen grünen Test (Store 12, Handler 6, Service Stufe 3 16, Komponente 18, View 7, Client 4 — alle grün; Gesamtlauf 95 grün, 5 bekannt rot, keine neue rote Datei).
- [x] Alle Nachweise aus §5 ausgeführt und im PR zitiert.
- [x] E2E-Pfad läuft: `design/e2e-protokoll.txt`, `design/ist-01-projekt-gespraech.png`, `design/ist-02-vorhaben-seite.png`.
- [x] `verify: OK` lokal (65 s) und in der CI: PR #54, Run 35084747869 (`verify` pass, 1 min 38 s).
- [x] `docs/architecture.md` §3 angepasst; INT-2026-007 spec.md Nachtrag an FA-22 und AN-S03.
- [x] Manuelle Schritte (§10) im PR als offen markiert.
- [x] Abweichungen in §14.
- [x] 2x-Regel-Check: Spec-Lücke „Zustand vor dem Ordner" ist neu; kein CLAUDE.md-Vorschlag. Zweimal in dieser Sitzung: Commit-Nachricht mit ASCII-Anführungszeichen in `-m "…"` bricht den String (einmal hier, einmal in Stufe 1 als Hook-Falle mit `deploy`+`prod`) → Commit-Nachrichten per `-F Datei`.
- [x] Abschlussbericht endet mit dem Block „Für das Board" (Karte neu: „Gespräch ab Sitzungsstart (INT-2026-008)"; Nachziehen in eigener Sitzung).

### 14. Abweichungen bei der Umsetzung

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-09-16 | Service-Tests zu Zustand, Broadcast, Claim und Abbruch liegen in `vorhaben-service-stage3.test.ts` (eigener `describe`-Block) statt in `stage2` | Stufe-3-Fixture hat den Lock, den Bildschirm und die Watcher-Referenz; ein Fixture für alle AK-02/03/05/07-Fälle | §8 |
| 2026-09-16 | Navigations-Gedächtnis bleibt bis zum Routenwechsel (`onRoute`) gesetzt statt bis zur Navigation | Beim Löschen vor dem Routenwechsel verschwand der Split für einen Frame (genau Review 15); jetzt hält die Projekt-Route die geclaimte Zeile bis `#/vorhaben/…` steht (Test: gleiches Element, `pending` → `row`) | §3.7 |
| 2026-09-16 | Beim Routenwechsel Projekt → Vorhaben wird `aos-gespraech` einmal neu gemountet (E2E: 1 Entfernung seit dem Reload) | Die Vorhaben-Route ist ein anderes Template (Seite + Split); das Abo läuft über den Service weiter, Snapshot kommt sofort — kein sichtbarer Bruch, aber ein Remount. Der pending → claimed-Übergang selbst bleibt ohne Remount (Test) | §3.7, §8 E2E |
| 2026-09-16 | E2E startet die Sitzung per WebSocket `vorhaben:start-step` (Haiku) statt per Klick auf den Knopf | Knopf-Default ist Opus (Kosten, Dauer); der Klick-Pfad (`vorhaben-session-started` → Gedächtnis) ist per Komponententest belegt, der WS-Pfad deckt AK-07 (Hand-Sitzung ohne Ereignis) mit ab | §8 |
| 2026-09-16 | Vorhaben-Seite öffnet sich, sobald der Ordner da ist — `intent.md` schreibt Claude erst danach; Screenshot ist-02 zeigt deshalb kurz „(Kopf nicht lesbar)" und „intent.md fehlt" | Verhalten des Readers aus INT-2026-004 (Ordner = Zeile), nicht neu; Michael sieht das nur für Sekunden | §8 |
| 2026-09-16 | Scratch-Projekt bekam Kopien von `specwright/workflows/core/intent.md`, der Intent-Vorlage, `docs/product-brief.md` und einer `CLAUDE.md` („höchstens zwei Rückfragen") | Der globale Befehl verweist auf den Projekt-Workflow; ohne ihn improvisiert Haiku. Kein Repo-Inhalt | §8 |
| 2026-09-16 | `aos-projekt-seite` wird beim Erscheinen des Pending im Split-Wrapper neu erzeugt (Docs werden einmal neu geladen) | Gleiches Muster wie die Vorhaben-Seite (`if (!split) return seite`); Test fragt das Element nach dem Wechsel neu ab | §3.7 |
| 2026-09-16 | E2E-Messwerte: Gespräch auf der Projekt-Seite 33 ms nach `step-started`; UI-Antwort im Terminal nach 230 ms bzw. 226 ms; Reload während „entsteht": Gespräch nach 75 ms wieder da (4 Beiträge); Ordner nach der zweiten Antwort, Navigation innerhalb des Wartefensters; Backend danach `pendingIntents: []`, beide Protokoll-Einträge der Sitzung tragen `INT-2026-002`; 0 × „agent-event rejected" | — | §8 |
