# Plan: UI: Terminal statt Gespräch — die Sitzung selbst neben dem Dokument

> **Intent:** `intent.md` (INT-2026-011) · **Spec:** `spec.md`
> **Status:** in_umsetzung
> **Erstellt:** 2026-09-16 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-16 („Freigegeben, beide Auslegungen ja", Chat)
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand 1153a33), `CLAUDE.md`, `docs/security.md`

<!-- Der Plan ist TECHNISCH und die EINHEIT DER AUSFÜHRUNG. Eine Sitzung setzt ihn ganz um.
     Maßstab: Ein neues Teammitglied könnte allein anhand dieses Dokuments umsetzen.
     Jede Änderung verweist auf eine FA (spec.md) oder ein AK (intent.md). Keine Änderung ohne Herkunft.
     Zwei Leser: „In einfachen Worten" liest die Person, die freigibt; „Details" liest der Agent, der baut. Die erste Zeile unter jeder
     Überschrift sagt, für wen der Abschnitt ist (R1, specwright/workflows/meta/leser-und-rueckfragen.md). Marker übernehmen, keinen entfernen. -->

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Auf der Vorhaben-Seite steht heute rechts neben dem Dokument das „Gespräch": eine von uns nachgebaute Ansicht dessen, was in der Claude-Sitzung passiert. Sie liest dafür zwei Quellen (die Hook-Meldungen von Claude Code und die Transkriptdatei, die Claude Code auf die Platte schreibt), gleicht beide ab und zeichnet daraus Sprechblasen. Das sind rund 2.250 Zeilen Code, die nichts anderes tun, als das Terminal nachzuahmen — und sie waren erst zu einem Drittel fertig (Dialog-Karten und Sprache kamen nie). Du hast dir das Ergebnis angesehen und entschieden: Das echte Terminal reicht. Es zeigt ohnehin alles — Claudes Text, Rückfragen, Berechtigungs-Dialoge, den Plan-Modus — und du kannst direkt darin antworten.

**Was ändert sich?** Nach dem Umbau steht rechts neben dem Dokument das Terminal selbst, halbe Bildschirmbreite, mit dem Tab der Sitzung dieses Vorhabens vorne. Es ist dasselbe Cloud-Terminal wie bisher, nur „angedockt": Es schwebt nicht mehr über der Seite, sondern ist die rechte Spalte, beginnt unter der Kopfzeile (die Glocke bleibt sichtbar) und hat keinen Zieh-Griff zum Verbreitern — die Breite ist immer die Hälfte. Alles, was du auf der Dokumentseite tust, siehst du dort passieren: Drückst du „Plan erstellen", erscheint ein neuer Tab und du siehst Claude Code hochfahren. Drückst du „Freigeben", siehst du den Freigabetext als Eingabe in der Sitzung. Nennt Claude im Terminal eine Kennung wie „FA-03", ist sie unterstrichen: Maus darüber zeigt den Absatz aus dem Dokument, Klick springt im Dokument dorthin und klappt einen zugeklappten Abschnitt auf. Cmd+D klappt das Terminal weg (Dokument volle Breite) und wieder zurück. Bei „Neue Absicht" bleibt alles wie heute — Textfeld, Modellwahl, „Starten" — nur dass rechts danach das Terminal mit der Absicht-Sitzung steht, statt des Gesprächs. Am Handy ändert sich nichts. Das Gespräch verschwindet vollständig aus dem Code: 3 Bausteine im Browser, 3 Dienste im Backend, die Nachrichten dazwischen und ihre Tests. Übrig bleibt, was auch anderes trägt: die Glocke, das Protokoll („gesendet · angenommen"), die Zustellung deiner Freigaben und Anmerkungen mit der Prüfung, ob gerade ein Dialog offen ist.

**Wie wird das gemacht?** Der Kern ist ein Trick, der den Umbau klein hält: Das Cloud-Terminal schiebt schon heute den Seiteninhalt zur Seite, wenn es offen ist — es setzt eine Zahl („wie breit bin ich") an die Wurzel der Seite, und der Inhalt macht Platz. „Andocken" heißt deshalb nur: Auf der Vorhaben-Seite und auf „Neue Absicht" bekommt das Terminal eine feste Breite (Hälfte der Fläche) statt der von dir gezogenen, beginnt unter der Kopfzeile, verliert Schatten und Zieh-Griff. Die Seite selbst weiß davon fast nichts — sie rendert nur noch das Dokument, die Gesprächsspalte fällt weg, und die Sende-Leiste unten endet automatisch am Terminalrand, weil sie dieselbe Breitenzahl liest. Zweitens sagt die Vorhaben-Seite der App, welche Sitzung zu ihr gehört, sobald sich das ändert („ich zeige jetzt Vorhaben X, dessen Sitzung ist Y"). Die App öffnet daraufhin das Terminal und wählt den Tab Y — oder merkt sich Y, falls der Tab eine halbe Sekunde später eintrifft als die Nachricht, und wählt ihn dann. Drittens die Kennungen: Der Dokument-Leser kennt schon heute jeden Absatz mit seiner Kennung (dafür gibt es die Anmerkungs-Marken am Rand). Er meldet diese Liste an einen kleinen gemeinsamen Zettel; das Terminal liest den Zettel und markiert im Text genau diese Codes als Verweise — nichts anderes, also auch keine Fehltreffer. Ein Klick löst kein Tippen aus, sondern ruft im Dokument „springe zu FA-03" auf. Verlässt du die Vorhaben-Seite, wird der Zettel geleert; auf der Liste gibt es keine Verweise. Viertens der Abbau, in einer zweiten Bausitzung nach dem Andocken: Die drei Gesprächs-Bausteine im Browser, die drei Dienste im Backend (Gesprächsdienst, sein Nachrichten-Handler, der Transkript-Leser), die Nachrichtentypen dafür und die Teile der Hook-Verarbeitung, die nur Sprechblasen und Dialog-Karten gefüttert haben, werden gelöscht. Was bleibt, wird nachgewiesen: Glocke, Protokoll, Zustellung. Die vier Projekt-Docs werden nachgezogen, die alte Architektur-Entscheidung („Verlauf aus dem Transkript lesen", ADR-0003) wird durch eine neue abgelöst („die Sitzung wird gezeigt, nicht nachgelesen", ADR-0004).

**Was kann schiefgehen?** Drei Dinge sind noch nicht bewiesen und stehen deshalb als Schritt 0 ganz vorne, bevor gebaut wird. Erstens: Klicks im Terminal gehen heute an tmux weiter (Maus-Modus), damit Ziehen zum Kopieren funktioniert. Ein Klick auf eine Kennung könnte also zusätzlich bei tmux ankommen. Erwartung: tmux macht bei einem Einzelklick in einem einzelnen Fenster nichts; Claude Code selbst hört nicht auf Mausklicks. Wenn die Probe zeigt, dass doch etwas passiert, wird der Verweis nur mit Cmd-Klick ausgelöst (wie in VS Code) — das wäre eine dokumentierte Abweichung von der Spec, kein Umbau. Zweitens: Wenn das Terminal beim Andocken seine Breite wechselt, darf es den Verlauf nicht neu einspielen (das hat uns zweimal Startfragen von Claude Code als Eingabe untergeschoben). Das Terminal-Element bleibt beim Andocken dasselbe, nur seine Breite ändert sich — die Probe misst das. Drittens: Nach „Plan erstellen" kommt die Nachricht „die Sitzung gehört zu diesem Vorhaben" oft, bevor der neue Tab in der Terminalliste steht; das fangen wir mit einer Merkstelle ab. Was du merkst, wenn etwas schiefgeht: Terminal nicht angedockt oder falscher Tab (sofort sichtbar), Verweise ohne Wirkung (sichtbar beim Klick), Glocke oder Protokoll stumm nach dem Abbau (Tests fangen es, dazu die E2E-Probe). Rückweg: jeder Schritt ist ein eigener PR; Revert spielt den alten Stand ein, der Auto-Deploy folgt.

**Was musst du entscheiden?** Zwei Auslegungen habe ich getroffen, du kannst widersprechen: (1) Auf „Neue Absicht" ist das Terminal immer angedockt, sobald es offen ist — auch vor „Starten" — damit die Breite nicht springt, wenn du „Starten" drückst (die Spec sagt „nach Starten"). (2) Der Hook-Kontext (Transkriptpfad, Claude-Sitzungs-ID) bleibt als Sitzungsmerkmal im Backend gespeichert, nur der Leser dafür geht — das spart einen Umbau der Sitzungs-Registry. Sonst: nichts, Freigabe reicht.

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: mensch -->

Die Cloud-Terminal-Sidebar bekommt einen Modus `docked`, den die App auf der Vorhaben-Seite und auf `neu` setzt: Breite = halbe Inhaltsbreite, `top` = Kopfzeile, kein Resizer, kein Schatten; alles andere (Tabs, Panes, Vollbild, `--terminal-open-width`, Buffer-Replay) bleibt unverändert. Die Vorhaben-View rendert nur noch die Seite und meldet der App per Ereignis die Sitzung, die zur Seite gehört; die App öffnet das Terminal und wählt den Tab (mit Merkstelle für Tabs, die später eintreffen). Kennungen wandern über einen kleinen Frontend-Dienst vom Dokument-Leser (Index aus `deriveAnchors`) in einen xterm-Link-Provider; ein Klick löst `kennung-open` aus, der Leser springt und klappt auf. Stufe 2 löscht Gesprächs-Frontend, `GespraechService`, `GespraechHandler`, `TranscriptTailer`, die `gespraech:*`-Nachrichten und die Beitrag-/Dialog-Meldungen der Hooks, verschiebt die Freitext-Konstanten in `vorhaben.protocol.ts` und zieht Docs und ADR nach. `[Certain]` für Ausgangslage und Reihenfolge, `[Likely]` für die Klick-Verträglichkeit mit tmux (Schritt 0).

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Sidebar-Wirt | `ui/frontend/src/app.ts:1605-1619` rendert `<aos-cloud-terminal-sidebar .isOpen .sessions .allSessions .activeSessionId …>`; Light DOM (`app.ts:1644`) | `[Certain]` neue Prop `.docked`, sonst unverändert |
| Sidebar-Geometrie | `aos-cloud-terminal-sidebar.ts:183-195` `.terminal-sidebar { position: fixed; top: 0; right: 0; width: var(--sidebar-width) … box-shadow }`; `:955-965` `effectiveWidth = isFullscreen ? innerWidth : sidebarWidth`, Resizer `right: sidebarWidth-3`; `:2601-2605` `updateContentOffset()` setzt `--terminal-open-width` auf `documentElement`; Light DOM mit eigenem `<style>` (`:165-176`) | `[Certain]` wiederverwendbar: Andocken = andere Breite + Klasse; `--terminal-open-width` treibt bereits `aos-app .main-content { padding-right }` (`theme.css:1930`) → Inhalt weicht ohne weitere Änderung |
| Sidebar-Zustand im Browser | `aos-cloud-terminal-sidebar.ts:2213-2227` (`localStorage`: layout-mode, pane-sessions, pane-projects, split-ratios), `:2707-2711` (`cloud-terminal-sidebar-width`) | `[Certain]` Bestand (AR-05-Abweichung, Spec §7); Andocken speichert nichts Neues; §10-Zeile in `architecture.md` nachtragen |
| Öffnen/Schließen, Cmd+D | `app.ts:112` `isTerminalSidebarOpen`; `:1445-1448` Cmd/Ctrl+D toggelt; `:549` `_handleTerminalClose` | `[Certain]` FA-05 ohne Änderung (Docked = Darstellung, nicht Zustand) |
| Sitzung im Terminal öffnen | `app.ts:236-268` `_openSessionInTerminal(terminalSessionId)`: Handy → Projekt wechseln oder `activeTerminalSessionId` setzen + öffnen; Mac → `_showSessionSolo` (`:1428-1435`: Vollbild + Zoom) via Sidebar `showSessionSolo` (`aos-cloud-terminal-sidebar.ts:1284-1289`) | `[Certain]` Handy-Zweig ist die Vorlage für „Tab wählen ohne Solo"; Mac-Zweig bleibt für nicht angedockte Seiten |
| Tab-Adoption neuer Sitzungen | `app.ts:1355-1393` Liste (`cloud-terminal:list`), `:1400-1418` `_handleCloudTerminalCreatedElsewhere` (Broadcast `cloud-terminal:created` aus `websocket.ts:2024-2030`); Tab-Id `TerminalSession.id` ≠ Backend-Id `terminalSessionId` (`aos-cloud-terminal-sidebar.ts:26-35`) | `[Certain]` Falle: Row-Session (Backend-Id) kann vor dem Tab eintreffen → Merkstelle `pendingDockSessionId`, aufgelöst in `willUpdate` bei `terminalSessions`-Änderung |
| Projektwechsel für fremde Sitzung | `app.ts:671-680` `_handleTerminalSessionJump` (`lastActiveSessionByProject` + `switchToProject`) | `[Certain]` wiederverwenden, wenn die Vorhaben-Sitzung nicht zum aktiven Projekt gehört |
| Route | `app.ts:173-175` `boundRouteChangeHandler(route: ParsedRoute)` setzt nur `currentRoute`; Vorhaben-Seite = `vorhaben` mit `segments [pid, intentId]` (`app.ts:284`), `neu` mit `[pid]` (`:289`) | `[Certain]` `terminalDocked` aus `route.view`/`segments.length` ableiten |
| Vorhaben-View | `views/aos-vorhaben-view.ts:286-296` Split-Klasse; `:308-330` Split-Render mit `aos-gespraech`, `GESPRAECH_BREITE`, `.gespraechBreite`; `:391-400` Split auf `neu`; `:193-211` `onSessionStarted` (Handy → `open-terminal-session`); `:263-271` `neuGespraech()` liefert `pending`/`claimedRow`; `:132` `currentRow()` | `[Certain]` Split raus; `pageSessionId()` aus `currentRow().row.session` (`ended` beachten: `vorhaben.protocol.ts:81`) bzw. `neuGespraech()` |
| Seite / Sende-Leiste | `aos-vorhaben-seite.ts:113-120,394-398` `gespraechBreite` → `--gespraech-width/-versatz`; `aos-sende-leiste.ts:59-82` `right: calc(terminal + gespraech-width + versatz)`, Media < 1024 | `[Certain]` auf `right: var(--terminal-open-width, 0px)` zurück; Variablen und Media weg |
| Neue Absicht | `aos-neue-absicht.ts:229-236` Karte mit Text „Gespräch rechts", `button.terminal` → `open-terminal-session` | `[Certain]` Text „Terminal rechts"; Knopf bleibt (AN-S08) |
| Dokument-Leser | `aos-dokument-leser.ts:84` Shadow DOM mit `static styles`; `:195` `leser-loaded {mtimeMs}`; `:149` `scrollIntoView` in `openAnmerkung`; `:121-124` `pendingScrollTo` | `[Certain]` `openKennung(code)` analog `openAnmerkung`; `leser-loaded` um `kennungen` erweitern |
| Anker/Kennungen | `vorhaben-anchors.ts:31` `KENNUNG_RE` (Dokumentfamilien, ohne Reference Points), `:34` `BLOCK_SELECTOR` (h1–h6, p, li, tr, pre), `:72-100` `deriveAnchors` → `BlockAnchor {ordinal, ref, snippet, element}` mit erster Kennung je Block | `[Certain]` Index `indexKennungen(anchors)` ist eine Schleife darüber; Reference Points ergänzen (`KENNUNG_ALL_RE`) |
| INT-2026-010 Stufe 3 | `intent/INT-2026-010-…/plan.md:230-246` #80–#95: Klappen (#80, #83), `indexKennungen` (#81), `openKennung`/`leser-loaded.kennungen` (#82), Code-Links im Gespräch (#84–#89, #93, #94) | `[Certain]` PO-Entscheidung OF-04: Stufe 3 ohne Code-Links. **Schnitt hier:** Stufe 3 liefert #80, #83, #90 und aus #82 nur Schalter/`technikOffen`/`ensureSichtbar`; **dieses Vorhaben** liefert `KENNUNG_ALL_RE`, `indexKennungen`, `openKennung`, `leser-loaded.kennungen` (#81/#82-Rest) — Schritt 0 prüft, ob Stufe 3 sie doch schon enthält (dann nur anschließen) |
| xterm | `aos-terminal.ts:361-388` `new Terminal({…, allowProposedApi: true})`, `terminal.open`; Light DOM (`:1681`); `@xterm/xterm` 6.0.0 (`frontend/package.json:26`); `registerLinkProvider(ILinkProvider)` mit `ILink.activate/hover/leave`, Hover-Element in `Terminal.element` mit Klasse `xterm-hover` (`node_modules/@xterm/xterm/typings/xterm.d.ts:1102,1393-1450`) | `[Certain]` API vorhanden; kein `WebLinksAddon` im Projekt |
| Maus-Modus | `aos-terminal.ts:367-372` Kommentar: tmux `mouse on` → xterm im Mouse-Tracking, `macOptionClickForcesSelection` | `[Likely]` Klick wird zusätzlich an tmux gemeldet; Einzelklick in einem Pane ohne Maus-App = kein Effekt → Schritt 0 misst |
| Sitzungsgröße | `cloud-terminal-manager.ts:1415-1435` `resize` letzter Schreiber gewinnt | `[Certain]` RB-07: kein zweites xterm; Andocken ändert nur die Breite derselben Instanz |
| Gespräch Backend | `websocket.ts:47-48,100-101,131-145,245,391-397`; `gespraech-service.ts` (651) hört `session.dialog/beitrag/agent-event` (`:167-169`); `gespraech-handler.ts` (169); `transcript-reader.ts` (405); Fixtures `ui/tests/fixtures/transcript/` (ADR-0003) | `[Certain]` einzige Konsumenten von `session.beitrag`/`session.dialog`/`session.hook-context` |
| Hook-Pfad | `cloud-terminal.routes.ts:83-97` ruft `reportHookContext`, `reportDialog`, `reportBeitrag`; `claude-hooks.ts:206-211` `hookContext`, `:255-262` `planDialog`/`rueckfrageDialog`, `:302-355` `mapHookPayload` liefert `blockKind` **und** `dialog`/`beitrag`; `cloud-terminal-manager.ts:460-524` `reportHookContext/reportDialog/isDialogClosed/nextDialogSeq/reportBeitrag`, `closedDialogIds`, `dialogSeq` | `[Certain]` `blockKind` (Glocke, Zustandszeile) bleibt; `dialog`/`beitrag`-Extras und Dialog-Monotonie gehen; `HookContext`/`reportHookContext` bleibt (Registry-Feld `transcriptPath` `cloud-session-registry.ts:68`) |
| Freitext-Zustellung | `vorhaben-service.ts:57-58` importiert `GESPRAECH_*`, `GespraechGrund`, `findDialogCue`/`readStableScreen` aus `dialog-driver.ts`; `:494-600` `sendToSession`/`pasteLocked` unter `withMachineWrite` (`cloud-terminal-manager.ts:535`); `:703-705` hört `session.agent-event/closed/prompt-text`; `vorhaben-handler.ts:208-214` `GESPRAECH_TEXT_MAX_CHARS` | `[Certain]` unabhängig vom Gesprächs-Dienst (AN-03 bestätigt); nur Konstanten umziehen |
| Geteilte Typen | `gespraech.protocol.ts` (241): `BlockKind` ← `cloud-session-registry.ts:24`, `cloud-terminal-manager.ts:71`, `vorhaben.protocol.ts:12`, `cloud-terminal.protocol.ts:11`; `HookContext/HookBeitrag/HookDialog/HookDialogClosed/RueckfrageFrage` ← `claude-hooks.ts:43`, `cloud-terminal-manager.ts:71`; Konstanten ← `vorhaben-service.ts:57`, `vorhaben-handler.ts:34`, `tests/unit/vorhaben-service-stage4.test.ts:23` | `[Certain]` Datei aufteilen: Hook-Typen → `hook-events.protocol.ts`, Freitext-Konstanten → `vorhaben.protocol.ts` |
| Gespräch Frontend | `components/vorhaben/aos-gespraech.ts` (344), `-beitrag.ts` (161), `-eingabe.ts` (103), `services/gespraech.service.ts` (184); `vorhaben-markdown.ts:93` `renderBeitrag`; `theme.css:5795-6171` Gesprächsblock inkl. `.vorhaben-split*`, `:6683-6715` Media < 1024; Kommentare `app.ts:1415-1417,1426`, `aos-vorhaben-protokoll.ts:15`, `vorhaben.service.ts:224` | `[Certain]` löschen bzw. Kommentar anpassen |
| Tests | `tests/unit/aos-vorhaben-view-split.test.ts` (Split, `GESPRAECH_BREITE`), `aos-neue-absicht.test.ts:124,134` („Gespräch rechts"), `aos-gespraech.test.ts`, `gespraech-client-service.test.ts`, `gespraech-service.test.ts`, `gespraech-handler.test.ts`, `transcript-reader.test.ts`, `claude-hooks.test.ts:257-281` (Gespräch-Extensions), `cloud-terminal-routes.test.ts:191ff` (INT-007-Block), `vorhaben-service-stage4.test.ts:23`; Muster für Sidebar-Tests `aos-cloud-terminal-solo.test.ts:12-28` (Mocks für gateway/terminal-session), `aos-terminal.test.ts` (dynamischer Import), `vorhaben-anchors.test.ts`, `aos-dokument-leser.test.ts` | `[Certain]` anpassen/löschen/neu wie §8 |
| E2E-Rezept | Memory `reference_cloud_terminal_e2e_playwright.md`: Branch-Backend 3111 (`SPECWRIGHT_RUNTIME_DIR=/tmp/sw-3111`, `SPECWRIGHT_TMUX=off`), Scratch `/private/tmp/scratch-int010` (INT-2026-001 spec freigegeben, -002 pr), `vorhaben:start-step` per ws, Playwright global 1.57 mit Chrome | `[Certain]` wiederverwenden; für den tmux-Klick-Spike einmal mit `SPECWRIGHT_TMUX` an |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

**Stufe 1 — Andocken, Sitzung folgen, Kennungen; Gesprächs-Frontend raus (PR 1).**

1. **Sidebar `docked`** (`aos-cloud-terminal-sidebar.ts`): `@property({ type: Boolean, reflect: true }) docked = false`. Getter `isDocked = docked && !isMobile && window.innerWidth >= 1024`. `dockWidth() = Math.floor((window.innerWidth - fileTreeOpenWidth()) / 2)` mit `fileTreeOpenWidth()` = `parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--file-tree-open-width')) || 0`. `effectiveWidth` in `render()` und `updateContentOffset()`: `isFullscreen ? innerWidth : isDocked ? dockWidth() : sidebarWidth`. Resizer `display: none`, wenn `isDocked || isFullscreen`. Klasse `docked` auf `.terminal-sidebar` → im eigenen `<style>`: `.terminal-sidebar.docked { top: var(--header-height, 56px); box-shadow: none; }`. `window` `resize`-Listener (rAF-gedrosselt) → `updateContentOffset()` + `requestUpdate()` + `_refreshVisibleTerminals()`; `updated(changed.has('docked'))` → dasselbe. Vollbild hat Vorrang (deckt die Seite, kehrt in `docked` zurück — FA-04/AN-S07 ohne Code). Kein Speichern.
2. **App** (`app.ts`): `@state() terminalDocked` in `boundRouteChangeHandler`: `route.view === 'neu' || (route.view === 'vorhaben' && route.segments.length >= 2)`. Prop `.docked=${this.terminalDocked}`. Neuer `document`-Listener `vorhaben-page-session` (`CustomEvent<{ terminalSessionId: string }>`) → `_dockSession(id)`: `isTerminalSidebarOpen = true`; `match = terminalSessions.find(s => s.terminalSessionId === id)`; gefunden → `_selectSessionTab(match)` (Extrakt des Handy-Zweigs aus `_openSessionInTerminal:253-263`: Projekt wechseln via `lastActiveSessionByProject`/`switchToProject` oder `activeTerminalSessionId = match.id`; `needsInput` löschen), sonst `pendingDockSessionId = id`. In `willUpdate` bei `changed.has('terminalSessions')`: Merkstelle auflösen. `_openSessionInTerminal`: `if (this.breakpoint.isMobile || this.terminalDocked) → _selectSessionTab + öffnen`, sonst Solo wie heute (AN-S08). Kommentar `:1415-1417` ersetzen.
3. **View** (`aos-vorhaben-view.ts`): Split-Render (beide Routen), `aos-gespraech`-Import, `GESPRAECH_BREITE`, `.gespraechBreite`, `onGespraechNextStep`, Klasse `split` entfernen. `pageSessionId()`: Route `vorhaben` → `row.session && !row.session.ended ? row.session.id : null`; Route `neu` → `neuGespraech().pending?.sessionId ?? claimedRow?.session?.id ?? null`. In `updated()`: bei Wechsel auf einen neuen, nicht-leeren Wert (Vergleich mit `lastPageSessionId`) `document.dispatchEvent(new CustomEvent('vorhaben-page-session', { detail: { terminalSessionId } }))` — nur am Mac (`!isMobile`). `null` löst nichts aus (AN-S03). Kennungen: `@kennungen-changed` der Seite → `kennungenService.set(map)`; `document`-Listener `kennung-open` → `(querySelector('aos-vorhaben-seite'))?.openKennung(code)`; `disconnectedCallback`/Routenwechsel weg von der Seite → `kennungenService.clear()` (AN-S01). `neuGespraech()` → `neuSitzung()` umbenennen (nur Name).
4. **Kennungen-Dienst** (`services/kennungen.service.ts`, neu, ~40 Zeilen): Singleton nach dem Muster `themeService`: `set(kennungen: ReadonlyMap<string, KennungEintrag>)`, `clear()`, `get()`, `subscribe(cb): () => void`; `KennungEintrag = { ref: string; snippet: string }`. Flüchtig, kein Speicher.
5. **Anker/Leser/Seite**: `vorhaben-anchors.ts`: `KENNUNG_ALL_RE = /\b(?:(?:AK|FA|RB|B|NZ|Z|EK|ER|AN|OF|D|T|AR|AP|V)-S?\d+|[FRDOA]\d{1,2})\b/g`; `indexKennungen(anchors): Map<string, KennungEintrag & { ordinal: number }>` — je Anker alle Codes des Textes, erster Treffer gewinnt, ein Code am Blockanfang ersetzt einen späteren Fund im Fließtext. `aos-dokument-leser.ts`: in `syncAnchors()` Index bilden, `leser-loaded` um `kennungen` erweitern; `public openKennung(code): boolean` → Anker suchen, umschließende `details` öffnen (`el.closest('details')` — falls 010 Stufe 3 `ensureSichtbar` liefert, das nutzen), `scrollIntoView({ block: 'center' })`, Klasse `kennung-hit` 2 s (Stil in `dokument-leser-styles.ts`). `aos-vorhaben-seite.ts`: `leser-loaded` → `kennungen-changed` (bubbles, composed) weiterreichen; `public openKennung(code)` → Leser; `gespraechBreite`/CSS-Variablen entfernen.
6. **Link-Provider** (`components/terminal/kennung-link-provider.ts`, neu): `findKennungRanges(line: string, codes: ReadonlySet<string>): { start: number; end: number; text: string }[]` (rein, testbar; Regex aus escaped Codes, `\b`-Grenzen, keine Treffer ohne Codes) und `class KennungLinkProvider implements ILinkProvider` mit `provideLinks(y, cb)`: Zeile `terminal.buffer.active.getLine(y - 1)?.translateToString(true)`, je Range ein `ILink { range: {start:{x,y}, end:{x,y}}, text, decorations: { underline: true, pointerCursor: true }, activate: () => document.dispatchEvent(kennung-open {code}), hover: tooltip zeigen, leave: tooltip weg }`. Tooltip: `div.kennung-tip.xterm-hover` in `terminal.element`, Position aus dem MouseEvent (fixed, geklemmt an den Viewport), Inhalt `ref` · `snippet` · „Klick springt hin". `aos-terminal.ts`: nach `terminal.open` und nur bei `cloudMode`: `registerLinkProvider(new KennungLinkProvider(terminal, () => kennungenService.get()))`; Disposable in `disconnectedCallback`. Stile `.kennung-tip` in `theme.css` (Light DOM). Kein `refresh` nötig — xterm fragt Links beim Hovern je Zeile ab.
7. **Sende-Leiste**: `:host { left: 0; right: var(--terminal-open-width, 0px); }`, Media < 1024 raus. **Neue Absicht**: Text „Terminal rechts". **theme.css**: Block `5795-6171` und Media `6683-6715` löschen (Stelle prüfen: Block endet vor `/* ==== ` in `:6172`), `.kennung-tip` ergänzen. **Löschen:** `aos-gespraech*.ts`, `services/gespraech.service.ts`, `renderBeitrag` in `vorhaben-markdown.ts`, Tests `aos-gespraech.test.ts`, `gespraech-client-service.test.ts`; `aos-vorhaben-view-split.test.ts` → `aos-vorhaben-view-terminal.test.ts`.

**Stufe 2 — Backend-Abbau, Docs, ADR (PR 2).**

8. `websocket.ts`: Import, Felder, Konstruktion (`:131-145`), `onClientClosed` (`:245`), `case 'gespraech:*'` (`:391-397`) entfernen. Löschen: `gespraech-service.ts`, `gespraech-handler.ts`, `transcript-reader.ts`, `tests/unit/{gespraech-service,gespraech-handler,transcript-reader}.test.ts`, `tests/fixtures/transcript/` (falls vorhanden — `ls`).
9. `gespraech.protocol.ts` → aufteilen und löschen: `shared/types/hook-events.protocol.ts` (`BlockKind`, `HookContext`); `vorhaben.protocol.ts` (`FREITEXT_MAX_CHARS`, `FREITEXT_QUEUE_MAX`, `FREITEXT_GRUND_TEXT`, `FreitextGrund` — Werte unverändert, Gründe `rueckfrage_offen|plan_offen|berechtigung|warteschlange_voll|…` bleiben). Importe umstellen: `vorhaben-service.ts:57`, `vorhaben-handler.ts:34`, `cloud-session-registry.ts:24`, `cloud-terminal-manager.ts:71`, `cloud-terminal.protocol.ts:11`, `vorhaben.protocol.ts:12`, `claude-hooks.ts:43`, `tests/unit/vorhaben-service-stage4.test.ts:23`.
10. Hooks entschlacken: `claude-hooks.ts` — `HookBeitrag`, `HookDialog`, `HookDialogClosed`, `RueckfrageFrage/Option`, `planDialog`, `rueckfrageDialog`, `extra.beitrag/dialog/dialogClosed` entfernen; `blockKind`-Ableitung (`:322-355`) und `hookContext` bleiben. `cloud-terminal-manager.ts` — `reportDialog`, `isDialogClosed`, `nextDialogSeq`, `reportBeitrag`, `closedDialogIds`, `dialogSeq` (+ Registry-Persistenz von `dialogSeq`, `CLOSED_DIALOG_IDS_MAX`) entfernen; Ereignisse `session.dialog`, `session.beitrag` aus der Doku `:250ff`; `reportHookContext`/`session.hook-context` bleiben. `cloud-terminal.routes.ts:87-97` — Dialog-/Beitrag-Aufrufe raus. Tests: `claude-hooks.test.ts:257-281` auf `blockKind` reduzieren; `cloud-terminal-routes.test.ts` INT-007-Block auf Hook-Kontext reduzieren.
11. Docs in derselben PR: `docs/architecture.md` (§1 Text „zeigt … Gespräch" → „zeigt die Sitzung angedockt neben dem Dokument"; §2 Backend-Zeile: Gespräch/Transkript raus, „Freitext-Zustellung nach Bildschirmprüfung unter `withMachineWrite`" bleibt; §2 Frontend-Zeile: angedocktes Terminal; §3 Zeile „Sitzungsverlauf" löschen, Nutzerzustand „Freitext-Einträgen des Gesprächs" → „Freitext-Einträgen"; §3 Terminal-Sitzungen: Hook-Kontext bleibt; §10 neue Bestandszeile „Terminal-Layout, Breite und Panes in `localStorage` (AR-05), seit INT-2026-005/Split-Panes, Karte Aufräumen"; Änderungsprotokoll), `docs/design.md` (§5 Zeile → „Vorhaben-Seite: Terminal angedockt ab 1024 px, sonst schwebend"; §4 Muster „Sitzung neben dem Dokument = angedockte Sidebar, Kennungen als Verweise"; Protokoll), `docs/security.md` (§2 Vertrauensannahme: „Dialoge, Beiträge" → „Zustand, Blockart, Kontext"; §6 Transkript-Zeile: Zusatz „derzeit ohne Leser (INT-2026-011); gilt, sobald wieder einer existiert"; Protokoll), `docs/product-brief.md` (§5 Kernfunktionen: „Gespräch …" → „Terminal angedockt neben dem Dokument, Kennungen als Verweise (INT-2026-011)"), `docs/adr/0003-…md` (Status „Abgelöst durch ADR-0004"), **`docs/adr/0004-sitzung-zeigen-statt-nachlesen.md`** (neu: Kontext, Entscheidung, Konsequenzen — u. a. `sanitizeSessionEnv`-Persistenz bleibt, Hook-Kontext bleibt gespeichert, kein Leser —, Alternativen, Belege).

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Zweites `aos-terminal` in der rechten Spalte der Seite, Sidebar blendet den Tab aus | Zwei xterm auf einem PTY: `resize` letzter Schreiber gewinnt (`cloud-terminal-manager.ts:1424`) → zerrissener Verlauf; neuer Wirt = neuer Buffer-Replay (zweimal regressiert, `design.md` §3); doppelte Ereignis-Verdrahtung. RB-07. |
| Kennungen per Props durch Sidebar → `aos-terminal-session` → `aos-terminal` reichen | Zwei Render-Stellen für `aos-terminal-session` (`:938`, `:1642`), Panes, Handy-Pfad — viele Berührungen für einen flüchtigen Wert. Ein Dienst nach dem Muster `themeService` ist eine Stelle; die Richtung Terminal → Seite läuft ohnehin als `document`-Ereignis wie `open-terminal-session`. |
| Andock-Zustand im Backend (AR-05, `vorhaben:ansicht.set`) | Kein Nutzerzustand: Ableitung aus Route und Fensterbreite, je Fenster verschieden (Breite). Speichern würde Geräte mit verschiedenen Breiten koppeln. |
| `open-terminal-session` (Solo/Vollbild) für den Vorhaben-Wechsel wiederverwenden | Solo = Vollbild + Zoom (`_showSessionSolo`), das Gegenteil von angedockt. Deshalb neues Ereignis `vorhaben-page-session` und `_selectSessionTab` aus dem Handy-Zweig. |
| Gesprächs-Backend behalten, nur Frontend entfernen | Z-04 „weg, nicht versteckt"; toter Transkript-Leser mit Sicherheitsprüfungen (ADR-0003) ohne Nutzer; EK-01 = 0. |
| Hook-Kontext (`transcriptPath`, `claudeSessionId`) mit entfernen | Registry-Schema und `toPersistedEntry` ändern für einen String ohne Leser; kein Sicherheitsgewinn (Pfad wird gespeichert, nicht gelesen). Bleibt, in ADR-0004 festgehalten (§ „Was du entscheiden musst" (2)). |
| Kennungs-Verweis nur mit Cmd/Ctrl+Klick | Spec FA-13 sagt Klick. Nur Rückfallebene, falls Schritt 0 zeigt, dass der Klick tmux/Claude stört — dann §14. |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Ja** — §3 Datenbesitz: Zeile „Sitzungsverlauf (Transkript …, ADR-0003)" entfällt, die UI liest kein Transkript mehr; §2 Backend-Zeile verliert „Gespräch (…)", §2 Frontend-Zeile bekommt das angedockte Terminal; §10 bekommt die Bestandszeile zum Terminal-Zustand in `localStorage` (AR-05, Spec §7). `docs/architecture.md` wird **in PR 2** angepasst. **ADR nötig: ja** — ADR-0004 löst ADR-0003 ab (Datenhaltung: Sitzungsverlauf wird nicht mehr gelesen; RB-06).
- Regeln: AR-01–AR-07 unverändert. AR-05 eingehalten: kein neuer Browser-Zustand (Andocken ist Ableitung); AR-04: keine Pfade; AR-02: kein MCP.
- `security.md` §6: kein neuer Endpunkt, keine neue Datei von außen, kein externes System; ein Leser eines von außen gemeldeten Pfads verschwindet (Zeile bleibt mit Zusatz).

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| **Stufe 1 — Andocken, Sitzung folgen, Kennungen, Gesprächs-Frontend (PR 1)** | | | | |
| 1 | `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` | ändern | Prop `docked`, `isDocked`, `dockWidth()`, `effectiveWidth`, Resizer aus, Klasse + Stil `.docked` (top Kopfzeile, kein Schatten), `resize`-Listener, `updated('docked')` | FA-01, FA-03, FA-04, FA-05, FA-07 |
| 2 | `ui/frontend/src/app.ts` | ändern | `terminalDocked` aus Route, `.docked`, Listener `vorhaben-page-session`, `_dockSession`, `_selectSessionTab`, `pendingDockSessionId` + Auflösung in `willUpdate`, `_openSessionInTerminal` docked-Zweig, Kommentare | FA-02, FA-06, FA-08, FA-12, FA-18, AN-S02, AN-S04, AN-S08 |
| 3 | `ui/frontend/src/views/aos-vorhaben-view.ts` | ändern | Split raus, `pageSessionId()`, Ereignis `vorhaben-page-session`, Kennungen setzen/leeren, `kennung-open` → Seite, `neuSitzung()` | FA-01, FA-08, FA-16, FA-18, FA-19, FA-24, AN-S01 |
| 4 | `ui/frontend/src/services/kennungen.service.ts` | neu | Singleton `set/clear/get/subscribe`, Typ `KennungEintrag` | FA-13, FA-16, FA-17 |
| 5 | `ui/frontend/src/components/vorhaben/vorhaben-anchors.ts` | ändern | `KENNUNG_ALL_RE`, `indexKennungen` | FA-13, FA-16 |
| 6 | `ui/frontend/src/components/vorhaben/aos-dokument-leser.ts` | ändern | Index in `syncAnchors`, `leser-loaded.kennungen`, `openKennung(code)` (details öffnen, scrollen, `kennung-hit`) | FA-13, FA-14, FA-17 |
| 7 | `ui/frontend/src/components/vorhaben/dokument-leser-styles.ts` | ändern | `.kennung-hit` (2 s Hervorhebung, `prefers-reduced-motion` ohne Animation) | FA-13 |
| 8 | `ui/frontend/src/components/vorhaben/aos-vorhaben-seite.ts` | ändern | `kennungen-changed` weiterreichen, `openKennung`, `gespraechBreite` + CSS-Variablen entfernen | FA-13, FA-01 |
| 9 | `ui/frontend/src/components/terminal/kennung-link-provider.ts` | neu | `findKennungRanges`, `KennungLinkProvider` (activate → `kennung-open`, hover/leave → `.kennung-tip.xterm-hover`) | FA-13, FA-15, FA-16 |
| 10 | `ui/frontend/src/components/aos-terminal.ts` | ändern | `registerLinkProvider` bei `cloudMode`, Disposable aufräumen | FA-13, FA-15 |
| 11 | `ui/frontend/src/components/vorhaben/aos-sende-leiste.ts` | ändern | `right: var(--terminal-open-width, 0px)`, Variablen und Media < 1024 raus | FA-01, FA-05 |
| 12 | `ui/frontend/src/components/vorhaben/aos-neue-absicht.ts` | ändern | Karte „Terminal rechts" | FA-18 |
| 13 | `ui/frontend/src/styles/theme.css` | ändern | Gesprächsblock `5795-6171` + Media `6683-6715` löschen; `.kennung-tip` | FA-21 (Frontend-Teil), FA-13 |
| 14 | `ui/frontend/src/components/vorhaben/aos-gespraech.ts`, `aos-gespraech-beitrag.ts`, `aos-gespraech-eingabe.ts`, `ui/frontend/src/services/gespraech.service.ts` | löschen | Gesprächs-Frontend | FA-21, Z-04 |
| 15 | `ui/frontend/src/components/vorhaben/vorhaben-markdown.ts` | ändern | `renderBeitrag` + Kommentar `:93` entfernen | FA-21 |
| 16 | `ui/frontend/src/components/vorhaben/aos-vorhaben-protokoll.ts`, `ui/frontend/src/services/vorhaben.service.ts` | ändern | nur Kommentare (`:15`, `:224`) | FA-21 |
| 17 | `ui/tests/unit/aos-vorhaben-view-split.test.ts` → `aos-vorhaben-view-terminal.test.ts` | ersetzen | kein Split; Ereignis `vorhaben-page-session` bei Sitzung, Wechsel, `neu`; kein Ereignis bei `ended`/`null`; Kennungen set/clear | FA-01, FA-16, FA-18, FA-24, AN-S01, AN-S03 |
| 18 | `ui/tests/unit/aos-cloud-terminal-docked.test.ts` | neu | `docked` → Breite = Hälfte (minus Dateibaum), Resizer aus, Klasse `docked`, `--terminal-open-width` = Breite; `docked` bei 1000 px → normale Breite; Vollbild gewinnt | FA-01, FA-03, FA-04, FA-07 |
| 19 | `ui/tests/unit/app-terminal-dock.test.ts` | neu | `_dockSession`: Tab vorhanden → aktiv + offen, kein Solo; Tab fehlt → Merkstelle, Auflösung bei `terminalSessions`; fremdes Projekt → `switchToProject`; `terminalDocked` aus Route (`vorhaben`+2 Segmente, `neu`, nicht Liste) | FA-02, FA-06, FA-08, FA-12, AN-S04 |
| 20 | `ui/tests/unit/kennung-link-provider.test.ts` | neu | `findKennungRanges`: nur bekannte Codes, Wortgrenzen, mehrere je Zeile, leere Menge → keine Links; Provider: `activate` sendet `kennung-open`, schreibt nichts ins Terminal (Fake-Terminal ohne `input`-Aufruf) | FA-13, FA-15, FA-16 |
| 21 | `ui/tests/unit/vorhaben-anchors.test.ts`, `aos-dokument-leser.test.ts` | ändern | `indexKennungen` (Reference Points, Blockanfang gewinnt), `openKennung` öffnet `details` + scrollt + `kennung-hit`, `leser-loaded.kennungen` | FA-13, FA-14 |
| 22 | `ui/tests/unit/aos-neue-absicht.test.ts` | ändern | „Terminal rechts" | FA-18 |
| 23 | `intent/INT-2026-011-…/design/ist-stufe1/*.png`, `design/e2e-protokoll.txt` | neu | Screenshots 11a–11d neben Mock, Messwerte FA-08/FA-10, Geometrie | AK-01–AK-10, AK-14 |
| **Stufe 2 — Backend-Abbau, Docs, ADR (PR 2)** | | | | |
| 30 | `ui/src/server/websocket.ts` | ändern | Gesprächs-Import, Felder, Konstruktion, `onClientClosed`, `case 'gespraech:*'` raus | FA-21 |
| 31 | `ui/src/server/services/gespraech-service.ts`, `gespraech-handler.ts`, `transcript-reader.ts`, `ui/tests/unit/gespraech-service.test.ts`, `gespraech-handler.test.ts`, `transcript-reader.test.ts`, `ui/tests/fixtures/transcript/` | löschen | Gesprächs-Backend | FA-21 |
| 32 | `ui/src/shared/types/hook-events.protocol.ts` | neu | `BlockKind`, `HookContext` (aus `gespraech.protocol.ts`) | FA-22 |
| 33 | `ui/src/shared/types/vorhaben.protocol.ts` | ändern | `FREITEXT_MAX_CHARS`, `FREITEXT_QUEUE_MAX`, `FREITEXT_GRUND_TEXT`, `FreitextGrund`; Import `BlockKind` umstellen | FA-22 |
| 34 | `ui/src/shared/types/gespraech.protocol.ts` | löschen | nach Aufteilung | FA-21 |
| 35 | `ui/src/shared/types/cloud-terminal.protocol.ts`, `ui/src/server/services/cloud-session-registry.ts`, `vorhaben-service.ts`, `vorhaben-handler.ts` | ändern | Importe umstellen (`BlockKind`, `FREITEXT_*`, `FreitextGrund`) | FA-22 |
| 36 | `ui/src/server/services/claude-hooks.ts` | ändern | Dialog-/Beitrag-Extras, `planDialog`, `rueckfrageDialog`, Typen raus; `blockKind` + `hookContext` bleiben | FA-21, FA-22 |
| 37 | `ui/src/server/services/cloud-terminal-manager.ts` | ändern | `reportDialog`, `isDialogClosed`, `nextDialogSeq`, `reportBeitrag`, `closedDialogIds`, `dialogSeq`, Ereignis-Doku; `reportHookContext` bleibt | FA-21, FA-22 |
| 38 | `ui/src/server/routes/cloud-terminal.routes.ts` | ändern | `:87-97` Dialog-/Beitrag-Aufrufe raus | FA-21 |
| 39 | `ui/tests/unit/claude-hooks.test.ts`, `cloud-terminal-routes.test.ts`, `vorhaben-service-stage4.test.ts` | ändern | Gesprächs-Erwartungen raus, `blockKind`/Kontext bleiben, Import `FREITEXT_MAX_CHARS` | FA-22 |
| 40 | `docs/architecture.md` | ändern | §1, §2 (Backend, Frontend), §3 (Sitzungsverlauf raus, Nutzerzustand-Wortlaut), §10 Bestandszeile `localStorage`, Änderungsprotokoll | FA-23, Spec §7 |
| 41 | `docs/design.md` | ändern | §4 Muster, §5 Zeile 1024 px, Änderungsprotokoll | FA-23, Spec §7 |
| 42 | `docs/security.md` | ändern | §2 Vertrauensannahme, §6 Transkript-Zeile Zusatz, Änderungsprotokoll | FA-23, Spec §7 |
| 43 | `docs/product-brief.md` | ändern | §5 Kernfunktionen-Zeile | FA-23 |
| 44 | `docs/adr/0003-sitzungsverlauf-aus-dem-claude-code-transkript.md` | ändern | Status „Abgelöst durch ADR-0004 (INT-2026-011)" | FA-23 |
| 45 | `docs/adr/0004-sitzung-zeigen-statt-nachlesen.md` | neu | Kontext, Entscheidung, Konsequenzen, Alternativen, Belege | FA-23, RB-06 |
| 46 | `intent/INT-2026-011-…/plan.md` §14, `design/e2e-protokoll.txt` | ändern | Abweichungen, Nachweis FA-22 (E2E nach Abbau) | FA-22 |

**Nicht betroffen (ausdrücklich):** `aos-terminal-session.ts`, `aos-terminal-tabs.ts`, Panes/Layout-Modi/Vollbild der Sidebar (nur Breite und Klasse), `replay-sanitize.ts`/`stripTerminalQueries`, Handy-Komponenten und `renderMobile()`, `aos-glocke`/`agent-notifications.ts`, `dialog-driver.ts`, `withMachineWrite`, `sanitizeSessionEnv`, `cloud-session-registry.ts` außer Import, `vorhaben-service.ts` außer Importen (Freitext-Zustellung, `firstInput`, Ordner-Folge unverändert), `vorhaben-reader.ts`, `vorhaben-store`, `tmux-session-backend.ts`, `plan-review-orchestrator.ts`, Backend-Nachrichten `vorhaben:*`/`cloud-terminal:*` (kein neuer Typ), Workflows/Vorlagen (NZ-05), `specwright/manifest.tsv` (UI ist kein Lieferumfang).

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `aos-vorhaben-view` | `app.ts` | `document`-Ereignis | `CustomEvent('vorhaben-page-session', { detail: { terminalSessionId } })` | `grep -rn "vorhaben-page-session" ui/frontend/src` → 1 Dispatch (View), 1 Listener (App) | — |
| `app.ts` | `aos-cloud-terminal-sidebar` | Prop | `.docked=${this.terminalDocked}` / `@property docked` | `grep -n "\.docked=" ui/frontend/src/app.ts && grep -n "docked = false" ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` | — |
| `aos-cloud-terminal-sidebar` | `aos-app .main-content`, `aos-sende-leiste` | CSS-Variable | `--terminal-open-width` (Wert = Dock-Breite) | `grep -rn "terminal-open-width" ui/frontend/src/styles/theme.css ui/frontend/src/components/vorhaben/aos-sende-leiste.ts ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` | — |
| `app.ts` | `terminalSessions` | Merkstelle | `pendingDockSessionId` aufgelöst in `willUpdate` (`changed.has('terminalSessions')`) | Test #19; `grep -n "pendingDockSessionId" ui/frontend/src/app.ts` ≥ 3 | — |
| `aos-dokument-leser` → `aos-vorhaben-seite` → `aos-vorhaben-view` | `kennungen.service` | Ereignis + Aufruf | `leser-loaded {kennungen}` → `kennungen-changed` → `kennungenService.set()` | `grep -rn "kennungen-changed\|kennungenService.set\|kennungenService.clear" ui/frontend/src` | — |
| `aos-terminal` | `kennungen.service`, xterm | Abo + API | `kennungenService.get()` in `provideLinks`; `terminal.registerLinkProvider(...)` | `grep -n "registerLinkProvider\|kennungenService" ui/frontend/src/components/aos-terminal.ts ui/frontend/src/components/terminal/kennung-link-provider.ts` | — |
| `KennungLinkProvider` | `aos-vorhaben-view` → `aos-vorhaben-seite` → `aos-dokument-leser` | `document`-Ereignis + Methode | `CustomEvent('kennung-open', { detail: { code } })` → `seite.openKennung(code)` → `leser.openKennung(code)` | `grep -rn "kennung-open\|openKennung(" ui/frontend/src` → Dispatch (Provider), Listener (View), 2 Methoden | — |
| `app.ts` | `aos-cloud-terminal-sidebar` | Prop | `.activeSessionId` (Tab-Wahl, bestehend) | Test #19 (`activeTerminalSessionId === match.id`) | — |
| Stufe 2: `websocket.ts` | — | entfernt | keine `gespraech:*`-Nachricht, kein `GespraechService` | `grep -c "gespraech" ui/src/server/websocket.ts` → 0; `find ui/src ui/frontend/src ui/tests -iname '*gespraech*'` → leer (EK-01) | — |
| Stufe 2: `cloud-terminal.routes.ts` | `cloud-terminal-manager.ts` | Aufruf | nur noch `reportHookContext` + Agent-Event | `grep -n "reportDialog\|reportBeitrag" ui/src/server` → leer; `grep -n "reportHookContext" ui/src/server/routes/cloud-terminal.routes.ts` → 1 | — |
| Stufe 2: `vorhaben-service.ts`, `vorhaben-handler.ts` | `vorhaben.protocol.ts` | Import | `FREITEXT_MAX_CHARS`, `FREITEXT_QUEUE_MAX`, `FREITEXT_GRUND_TEXT`, `FreitextGrund` | `grep -rn "FREITEXT_\|FreitextGrund" ui/src` ≥ 6; `grep -rn "GESPRAECH_" ui/src ui/frontend/src` → leer | — |
| Stufe 2: `claude-hooks.ts`, `cloud-terminal-manager.ts`, `cloud-session-registry.ts`, `*.protocol.ts` | `hook-events.protocol.ts` | Import | `BlockKind`, `HookContext` | `grep -rn "hook-events.protocol" ui/src` ≥ 5 | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung (`kennungen.service`: Seite/View schreiben, Terminal liest; `kennung-link-provider`: Terminal registriert, View hört).
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. **Lesende Vorprüfung und zwei Spikes** → prüfbar durch Protokoll in `e2e-protokoll.txt` („Schritt 0"): (a) `git log origin/main --oneline -5` und `grep -n "indexKennungen\|openKennung\|kennungen" ui/frontend/src/components/vorhaben/aos-dokument-leser.ts vorhaben-anchors.ts` — was 010 Stufe 3 geliefert hat (Schnitt §2); (b) Konsumenten von `.vorhaben-split`, `GESPRAECH_BREITE`, `--gespraech-width`, `gespraechBreite`: `grep -rn` → nur die Dateien aus §4; (c) **Spike Klick im Terminal:** Branch-Backend mit tmux **an** (Standard), Sitzung starten, Link-Provider provisorisch mit festem Code registrieren, Klick per Playwright; Nachweis: `tmux capture-pane` vor/nach identisch, keine `cloud-terminal:input`-Frame vom Browser, `terminal.modes.mouseTrackingMode` protokolliert; bei Effekt → Rückfallebene Cmd/Ctrl+Klick (§14, ER-00 mit Rückfrage); (d) **Spike Andocken ohne Replay:** Sidebar offen, `docked` per DOM umschalten, Zähler auf `cloud-terminal:buffer`-Frames und `aos-terminal`-Neuanlage (MutationObserver) = 0 → sonst ER-10 (fragen).
1. Sidebar `docked` (#1) + Test #18 → `npx vitest run tests/unit/aos-cloud-terminal-docked.test.ts` grün; von Hand im Branch-Backend: Vorhaben-Seite mit Sitzung, Terminal per Cmd+D öffnen → halbe Breite, unter Kopfzeile.
2. App (#2) + Test #19 → grün; Route-Wechsel Liste → Seite setzt `docked`, `neu` ebenso.
3. View (#3): Split raus, `vorhaben-page-session`, Seite/Sende-Leiste/Neue Absicht (#8 Teil, #11, #12) → Test #17 grün; Seite rendert ohne `.vorhaben-split`; Terminal öffnet und wählt den Tab beim Betreten.
4. Kennungen: #4, #5, #6, #7, #8 Rest, #9, #10, #13 `.kennung-tip` → Tests #20, #21 grün; von Hand: Code im Terminal unterstrichen, Hover, Klick springt, kein Tippen.
5. Gesprächs-Frontend löschen (#13 Blöcke, #14, #15, #16, alte Tests) → `cd ui && npm run lint && npm run build:ui` grün; `grep -rn "gespraech" ui/frontend/src` → leer.
6. Verbindungen nachweisen (§5, Stufe-1-Zeilen) → Befehle ausführen, Ausgabe ins Protokoll.
7. `bash scripts/verify.sh` grün; E2E-Pfad Stufe 1 (§8) mit Screenshots 11a–11d → `design/ist-stufe1/`, Messwerte ins Protokoll; `plan.md` §14; PR 1; **Merge = Michael** (§10).
8. **Stufe 2:** #30–#39 → `cd ui && npx vitest run` (betroffene Tests) grün; `grep -c gespraech websocket.ts` = 0; `find … -iname '*gespraech*'` leer.
9. Docs + ADR (#40–#45) → `bash scripts/verify.sh` grün (CLAUDE.md ≤ 90 Zeilen unberührt); Leser-Marker-Guard grün.
10. Verbindungen Stufe 2 (§5) nachweisen; E2E-Pfad nach Abbau (FA-22: Glocke, Protokoll gesendet/angenommen, eingereiht, erste Eingabe) → Protokoll; `plan.md` §14, Status; PR 2; Merge = Michael.

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Zwei **aufeinanderfolgende** Bausitzungen (Stufe 1 = PR 1, Stufe 2 = PR 2, Intent §10: Abbau nie vor dem Andocken), keine parallelen Teile: Innerhalb der Stufe 1 greifen Sidebar, App, View, Leser und Terminal über vier Ereignisse und eine CSS-Variable ineinander (Abschnitt 5, 7 Verbindungen); Stufe 2 ist ein zusammenhängender Abbau mit Typ-Aufteilung, den ein zweiter Worktree nur behindern würde. Parallelisierung brächte zwei Worktrees für je 20–40 Minuten disjunkter Arbeit (Link-Provider vs. Sidebar-Breite) und eine Integration obendrauf.

#### Variante B — parallel in Worktrees

<!-- leser: agent -->

Entfällt.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01, FA-01, FA-02 | Vorhaben mit Sitzung → `docked`, `activeSessionId` = Tab der Sitzung; Geometrie 1440: Dokument-Spalte ≈ Terminal-Breite (±8 px), Terminal `top` = 56 | #17, #19; E2E `e2e-011.mjs` Phase `dock` + Screenshot 11a | Unit + E2E |
| AK-02, FA-03, FA-04 | genau eine `aos-cloud-terminal-sidebar`, Klasse `docked`; Tabs/Knöpfe vorhanden; Panes/Vollbild funktionieren angedockt | #18; E2E `document.querySelectorAll('aos-cloud-terminal-sidebar').length === 1` | Unit + E2E |
| AK-03, FA-08 | `vorhaben:start-step` per ws → Zeit bis `.tab.on`/aktiver Tab der neuen Sitzung im DOM; Ziel < 2 s (EK-02); Tab kommt nach Ereignis → Merkstelle | #19 (Merkstelle); E2E Phase `schritt` (Zeitstempel ws `step-started` → DOM) + Screenshot 11b | Unit + Messung |
| AK-04, FA-10 | Freigabe/Anmerkung bei wartender Sitzung → Zeit bis Text in `el.terminal.buffer.active` sichtbar; Protokoll `gesendet`→`angenommen` | E2E Phase `freigabe` (bestehendes Rezept INT-010 S2: INT-2026-001 spec.md auf `entwurf`, Sitzung haiku) | Messung |
| AK-05, FA-11 | arbeitet/Dialog → `eingereiht`, nicht in Dialog getippt | bestehend `vorhaben-service-stage4.test.ts` (unverändert außer Import) + E2E-Stichprobe | Unit + E2E |
| FA-12 | „Freigeben" ohne Sitzung → Sitzung startet mit `firstInput`, Tab gewählt | bestehend (INT-010 S2) + #19 | Unit + E2E |
| AK-06, FA-13, FA-14, FA-17 | `indexKennungen` (Reference Points, Blockanfang), Provider markiert nur Codes der Menge, Hover-Tooltip, `openKennung` öffnet `details`, scrollt, `kennung-hit`; Phasenwechsel → Menge neu | #20, #21, #17 (set bei `leser-loaded`, clear bei Routenwechsel); E2E Phase `kennung`: `el.terminal.write('… FA-01 …')` lokal, `mousemove` → `.kennung-tip`, Klick → Leser scrollt (Bounding-Box im Viewport) | Unit + E2E |
| AK-07, FA-15 | Klick sendet keinen `cloud-terminal:input`-Frame; PTY-Bildschirm unverändert (Spike Schritt 0 mit tmux an) | #20 (Fake-Terminal ohne `input`); E2E ws-Frame-Zähler; `tmux capture-pane` vor/nach | Unit + E2E |
| FA-16 | fremder Code / kein Dokument → kein Link | #20, #17 | Unit |
| AK-08, FA-05 | Cmd+D → `isTerminalSidebarOpen` false → `--terminal-open-width` 0, Dokument volle Breite; erneut → angedockt, gleicher Tab | E2E Phase `cmdd` + Screenshot 11c | E2E |
| AK-09, FA-06 | Vorhaben ohne Sitzung → kein Ereignis, Dokument voll; Cmd+D → angedockt | #17, #18; E2E INT-2026-002 | Unit + E2E |
| AK-14, FA-07 | Fenster 1000×900 → Klasse `docked` fehlt, Breite = `sidebarWidth`, `top` 0; auf 1440 zurück → angedockt, gleicher Tab, kein Replay-Frame | #18; E2E Phase `schmal` | Unit + E2E |
| AK-10, FA-18, FA-19 | `neu` nach Starten: Karte mit „Terminal rechts", Ereignis mit Pending-Sitzung; Claim → Route wechselt, gleicher Tab, `aos-terminal` nicht neu angelegt | #17, #22; E2E Phase `neu` (haiku, Scratch-CLAUDE.md mit YAML-Kopf-Hinweis) + Screenshot 11d | Unit + E2E |
| AK-13, FA-20 | Handy 390 px: kein `docked`, Knopf „Im Terminal öffnen ↗", Vollbild-Terminal | E2E Phase `handy` | E2E |
| FA-24 | Sitzung endet → kein Ereignis, `docked` bleibt, Zustandszeile „Sitzung beendet" | #17 (Row mit `ended`), E2E `cloud-terminal:close` per ws | Unit + E2E |
| AK-11, FA-21, FA-25 | `find … -iname '*gespraech*'` leer (nach PR 2); PR 1 vor PR 2 gemerged | Befehl im PR 2; Reihenfolge §6 | Review |
| AK-11, FA-22 | Glocke, Protokoll, Zustellung, erste Eingabe, Ordner-Folge nach Abbau | bestehende Tests `cloud-terminal-agent-event.test.ts`, `vorhaben-service-stage3/4.test.ts`, `claude-hooks.test.ts` (reduziert), `cloud-terminal-routes.test.ts` (reduziert); E2E nach Abbau: Stop → Glocke +1; Freigabe → `angenommen`; „Neue Absicht" → Claim | Unit + E2E |
| AK-12, FA-23 | Docs ohne Gespräch, ADR-0003 abgelöst, ADR-0004 vorhanden | `grep -n "Gespräch" docs/architecture.md docs/design.md docs/security.md docs/product-brief.md` → nur Änderungsprotokoll-Zeilen; `ls docs/adr/0004-*` | Review |

- **Verify-Befehl:** `bash scripts/verify.sh` → `verify: OK`; Ausgabe im PR. **CI ist die Wahrheit:** lokal grün zählt erst mit grünen PR-Checks. Bezugsliste `ui/tests/known-failures.txt` unverändert (gelöschte Gesprächs-Tests stehen nicht darin — geprüft `grep gespraech` → leer). Bekannte lastabhängige Flakes (`vorhaben-watcher`, `cloud-terminal-paste-image`) → Verify wiederholen, nicht anfassen.
- **Datenkorrektur:** keine Bestandsdaten. Protokoll-Einträge der Art `freitext` bleiben lesbar (Label in `aos-vorhaben-protokoll.ts` bleibt).
- **Angeschlossen (E2E-Pfad):** Branch-Backend 3111 + Scratch `/private/tmp/scratch-int010`; Playwright-Skript `e2e-011.mjs` im Scratchpad (nicht im Repo), Phasen `dock | schritt | freigabe | kennung | cmdd | schmal | neu | handy`; Liste → Vorhaben INT-2026-001 (Sitzung per `vorhaben:start-step` haiku) → Terminal angedockt, Tab gewählt (Verbindung 1–3) → „Plan erstellen" → neuer Tab < 2 s (Merkstelle) → Freigabe sichtbar im Terminal → Kennung Hover/Klick → Leser springt (Verbindung 5–7) → Cmd+D weg/zurück → 1000 px schwebend → `neu` mit Absicht-Sitzung → Handy. Nachweis: Screenshots `design/ist-stufe1/ist-11a…d.png` neben `design/11a…d-terminal-mac.png`, Messwerte und Geometrie in `design/e2e-protokoll.txt`.
- **Bugfix:** entfällt.
- **UI:** Ergebnis entspricht `design/11a-terminal-mac.png` … `11d` — Prüfung per Playwright-Screenshot; erlaubte Abweichung: Terminal-Kopf ist der heutige Sidebar-Kopf (Symbole), nicht die Mock-Zeichnung.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| Klick auf eine Kennung wird zusätzlich an tmux gemeldet (Maus-Modus) und löst dort oder in Claude Code etwas aus | mittel | mittel (AK-07) | Spike Schritt 0 mit tmux an; Rückfallebene Cmd/Ctrl+Klick als dokumentierte Abweichung (§14, Rückfrage) | Michael beim ersten Klick; E2E-Frame-Zähler |
| Andocken lässt xterm neu einspielen (Replay) → Startfragen als Eingabe (zweimal regressiert) | niedrig | hoch | Dieselbe Sidebar-Instanz, nur Breite/Klasse; Spike Schritt 0 zählt `buffer`-Frames und Neuanlagen = 0; ER-10 | Michael (Fremdtext im Prompt); Test #18 |
| Tab der neuen Sitzung trifft nach dem Seiten-Ereignis ein → falscher oder kein Tab gewählt | hoch ohne Maßnahme | mittel (AK-03) | Merkstelle `pendingDockSessionId`, Auflösung bei Listen-/Created-Nachricht; Test #19; Messung EK-02 | Michael (Tab nicht vorne); E2E |
| Vorhaben-Sitzung gehört zu einem anderen Projekt als dem aktiven → Tab-Liste zeigt sie nicht | niedrig | mittel | `_selectSessionTab` wechselt das Projekt wie `_handleTerminalSessionJump`; Test #19 | Michael |
| Auto-Öffnen beim Betreten stört bewusstes Lesen ohne Terminal | niedrig | niedrig | AN-S02 bestätigt; Cmd+D bleibt ein Griff | Michael |
| Abbau reißt Hook-Pfad an (Glocke stumm, `blockKind` weg) | niedrig | hoch | `blockKind`/`hookContext` bleiben; reduzierte Tests `claude-hooks`, `cloud-terminal-routes`, `agent-event`; E2E nach Abbau (FA-22) | Michael (Glocke); Tests |
| Typ-Aufteilung bricht Importe an Stellen, die `grep` nicht fand | niedrig | niedrig | `npm run build:backend` + `build:ui` in Verify; TypeScript strict | Verify |
| Unter 1024 px bleibt die schwebende Sidebar 400–500 px breit und drückt das Dokument schmal (heutiges Verhalten) | sicher | niedrig | OF-02 entschieden; kein Sonderfall | Michael (schmales Fenster) |
| Verify lastabhängig flaky (`vorhaben-watcher`, `paste-image`) | mittel | niedrig | wiederholen, Bezugsliste nicht anfassen | Agent |
| Merge löst Auto-Deploy aus, laufende Cloud-Sitzungen | sicher | niedrig | tmux-Persistenz (RB-01); Merge ist Michaels Schritt | Michael |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| INT-2026-010 Stufe 3 **abgespeckt** bauen und mergen (Plan 010 §4: #80, #83, #90 ganz; #82 nur Schalter/`technikOffen`/`ensureSichtbar`; **ohne** #81, #84–#89, #93, #94 und ohne `openKennung`/`kennungen` aus #82/#91/#92; Vermerk in 010 `plan.md` §14 „Code-Links → INT-2026-011") — Weg: `/build INT-2026-010 stufe 3` in frischem Worktree, PR, `gh pr merge` | Claude (Bau), Michael (Merge) | vor Umsetzung (AN-05) | [x] PR #63, #64 (2026-09-17) |
| Frischer Worktree von `origin/main` für Stufe 1: `git worktree add ../specwright-worktrees/INT-2026-011-s1 -b feat/INT-2026-011-s1 origin/main`, `cd ui && npm ci && (cd frontend && npm ci)`, `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper` (Memory) | Claude | vor Umsetzung | [x] Branch `feat/INT-2026-011-s1` im Worktree `session-sdlc-ui` (§14) |
| PR 1 mergen (`gh pr merge <n> --merge`) — löst den Auto-Deploy der UI auf dem Cloud-Host aus (`architecture.md` §5, Timer außerhalb des Repos) | Michael | nach CI grün Stufe 1 | [ ] |
| Stichprobe Cloud nach Deploy: Vorhaben-Seite mit laufender Sitzung öffnen, Terminal angedockt, Kennung klicken; laufende tmux-Sitzungen noch da | Michael | nach Deploy 1 | [ ] |
| PR 2 mergen (Abbau + Docs + ADR) — Auto-Deploy | Michael | nach CI grün Stufe 2 | [ ] |
| Board-Karte nachziehen (Block „Für das Board" aus dem Abschlussbericht; Skill `obsidian-po-board` in eigener Sitzung) | Michael/Claude | nach Merge 2 | [ ] |

Keine Secrets, keine Flags, keine Datenläufe. Hook `production-gate` wird nicht berührt (kein Deploy-Befehl im Repo).

### 11. Schätzung

<!-- leser: mensch -->

**Stufe 1:** 6–9 h — Schritt 0 mit zwei Spikes 1–1,5 h; Sidebar `docked` 1–1,5 h; App/View/Ereignis + Merkstelle 1,5 h; Kennungen (Index, Leser, Dienst, Provider, Tooltip) 2–2,5 h; Frontend-Abbau + Tests 1 h; E2E mit Screenshots 1–1,5 h. **Stufe 2:** 3–5 h — Abbau + Typ-Aufteilung 1,5–2 h; Test-Reduktion 0,5–1 h; Docs + ADR-0004 1 h; E2E nach Abbau 0,5–1 h. Unsicherheit: Spike (c) — bei Rückfallebene +0,5 h und eine Rückfrage; Spike (d) — bei Replay-Befund ER-10 (Stopp, Neubewertung). Zeitbudget der Absicht (2 Bausitzungen) eingehalten.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| F1, Klick im Terminal erreicht tmux über den Maus-Modus: Spec verlangt Klick, Verhalten ungemessen | Self | angenommen als Risiko mit Spike; Rückfallebene Cmd/Ctrl+Klick nur mit Rückfrage (§14) | §6 Schritt 0 (c), §9 |
| F2, Tab-Adoption kommt nach dem Seiten-Ereignis (Race) | Self | angenommen: Merkstelle `pendingDockSessionId` | §3 Ansatz 2, §4 #2, #19 |
| F3, `neu`-Seite: Spec B-01 sagt „nach Starten", Plan dockt sobald offen | Self | angenommen als ER-00-Auslegung: kein Breitensprung beim Starten, ein Modus je Seite; **PO bestätigt 16.09.** | §3 Ansatz 2 |
| F4, Hook-Kontext (`transcriptPath`, `claudeSessionId`) mit entfernen? | Self | abgelehnt: Registry-Schema für einen String ohne Leser; kein Sicherheitsgewinn; in ADR-0004 festgehalten; **PO bestätigt 16.09.** | §3 Alternativen |
| F5, Dock-Breite ohne Dateibaum → Dokument schmaler als Terminal bei offenem Dateibaum | Self | angenommen: `dockWidth()` zieht `--file-tree-open-width` ab | §3 Ansatz 1 |
| F6, Solo/Vollbild über „Im Terminal öffnen ↗" widerspricht angedockt | Self | angenommen: `_openSessionInTerminal` wählt bei `terminalDocked` nur den Tab (AN-S08) | §3 Ansatz 2 |
| F7, Schnitt zu INT-2026-010 Stufe 3 unklar (was liefert Stufe 3, was 011) | Self | angenommen: Schnitt in §2 und §10 festgelegt; Schritt 0 (a) prüft den Ist-Stand | §2, §6, §10 |
| F8, Kennungen per Props durchreichen wäre „expliziter" | Self | abgelehnt: zwei Render-Stellen + Panes; Dienst nach `themeService`-Muster, Ereignis nach `open-terminal-session`-Muster | §3 Alternativen |
| F9, Reference Points (`F1`, `R2`) im Terminal sind Rauschen | Self | entkräftet: Menge kommt aus dem Dokument (FA-16); Regex nur aus Codes der Menge | §3 Ansatz 6 |
| F10, Stufe 1 löscht Frontend-Gespräch, Backend lebt einen PR lang ohne Client | Self | angenommen: unschädlich (Abo ohne Abonnenten), Intent §10 verlangt nur „Abbau nicht vor Andocken" | §7 |

**Minimalinvasiv geprüft:** Wiederverwendet: Sidebar samt Tabs/Panes/Vollbild/Replay, `--terminal-open-width` + `main-content padding-right` (Andocken ohne Layout-Code auf der Seite), Handy-Zweig von `_openSessionInTerminal` als `_selectSessionTab`, `_handleTerminalSessionJump`-Logik, `deriveAnchors` als Kennungs-Index, `openAnmerkung`-Muster für `openKennung`, `document`-Ereignis-Muster (`open-terminal-session`), `themeService`-Muster, bestehendes E2E-Rezept und Scratch. Gestrichen: zweites xterm, Props-Kette, Backend-Zustand fürs Andocken, neue WebSocket-Nachrichten, eigener Buffer-Umgang, ADR fürs Andocken (nur ADR-0004 für den Wegfall des Transkript-Lesens).

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-09-16: ohne Befund — die zwei Auslegungen (neu dockt immer; Hook-Kontext bleibt) stehen in beiden Teilen; die drei Spikes aus „Was kann schiefgehen" sind Schritt 0 (c), (d) und die Merkstelle in §3/§9. (R4)

### 13. Definition of Done

<!-- leser: agent -->

- [x] Jede FA/AK aus Abschnitt 8 hat einen grünen Test — Stufe 1 (FA-01–FA-20, FA-24: Tests #17–#22 + E2E); Stufe 2 (FA-21–FA-23, FA-25) offen.
- [x] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert — Stufe-1-Zeilen in PR 1; Stufe-2-Zeilen in PR 2 offen.
- [x] E2E-Pfad läuft (Abschnitt 8), Screenshots 11a–11d neben dem Mock (`design/ist-stufe1/`), Messwerte EK-02 (58 ms) / EK-03 (389 ms) in `design/e2e-protokoll.txt`.
- [x] `verify` grün, Ausgabe im PR — PR-Checks: siehe PR 1 (CI ist die Wahrheit).
- [ ] `docs/architecture.md`, `design.md`, `security.md`, `product-brief.md`, ADR-0003/0004 angepasst (PR 2, Abschnitt 3 „Ja").
- [x] Manuelle Schritte (Abschnitt 10): Zeile 1 erledigt (PR #63/#64), Zeile 2 erledigt (anderer Worktree, §14); Merge PR 1, Stichprobe, PR 2, Board offen und im PR markiert.
- [x] Abweichungen von diesem Plan in Abschnitt 14 eingetragen (Stufe 1).
- [x] 2x-Regel-Check: `theme.css` erreicht keinen Shadow-Root (3. Fall) → `CLAUDE.md`-Zeile in PR 1.
- [ ] Abschlussbericht nach R3 (nur Mensch-Abschnitte im Chat), endet mit dem Block „Für das Board" (Karte, Spalte, PR-Link, Stand, Verweis auf `intent/INT-2026-011-terminal-statt-gespraech/`); Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-09-17 | Schritt 0 (c): Klick auf eine Kennung sendet 2 `cloud-terminal:input`-Frames mit SGR-Maus-Reports (`ESC[<0;x;yM`/`m`), weil tmux `mouse on` xterm ins Maus-Tracking setzt. Claude Code selbst hat keinen Maus-Modus (tmux-Pane-Flags 0), tmux verwirft den Report — die Sitzung bleibt unverändert. Umsetzung: `KennungLinkProvider` stoppt `mousedown` auf `.xterm-screen`, solange eine Kennung gehovert ist (nach dem Linkifier-Listener, vor dem Terminal-Listener), ruft `preventDefault` und `terminal.focus()` selbst → 0 Frames. Keine Rückfallebene Cmd/Ctrl+Klick nötig. | Messung `design/e2e-protokoll.txt` Schritt 0 (c) | §3 Ansatz 6, §8 AK-07 (Nachweis bleibt „0 Frames", jetzt erreicht durch den Stopper) |
| 2026-09-17 | Stufe 1 läuft im bestehenden Worktree `session-sdlc-ui` auf Branch `feat/INT-2026-011-s1` (von `origin/main` a63ac64), nicht in einem neuen Worktree `INT-2026-011-s1`. | Worktree mit fertigen `node_modules` und `spawn-helper`-Fix vorhanden; die Bausitzung wurde dort gestartet. | §10 Zeile 2 (erledigt, anderer Pfad) |
| 2026-09-17 | Tooltip-Stil `.kennung-tip` steht im eigenen `<style>` von `aos-terminal.ts`, nicht in `theme.css` (#13). | `aos-terminal` ist Light DOM, sein Wirt `aos-terminal-session` aber ein Shadow-Root — `theme.css` erreicht den Tooltip nicht (E2E: Tooltip ungestylt). Dritter Fall dieser Falle (INT-004, INT-010) → 2x-Regel, `CLAUDE.md`-Zeile in dieser PR. | §3 Ansatz 6, §4 #13 (`theme.css` verliert nur den Gesprächsblock) |
| 2026-09-17 | `leser-loaded` feuert erst nach `await this.updateComplete` (statt direkt nach `readDoc`). | Die Kennungen entstehen mit den Ankern in `syncAnchors()` — erst nach dem Render; das Ereignis trägt jetzt `kennungen` (Plan §3 Ansatz 5). `readStand` kommt einen Render später, fachlich gleich. | §4 #6 |
| 2026-09-17 | `aos-vorhaben-seite` meldet bei Dokument-/Vorhaben-Wechsel zuerst eine leere Kennungsmenge (`kennungen-changed`), der Leser füllt sie danach. | FA-16: Entwurfsansicht und „Kein Dokument in dieser Phase" senden nie `leser-loaded`; ohne Reset blieben die Verweise des vorigen Dokuments stehen. | §4 #8 |
| 2026-09-17 | Test #19 mountet die ganze `aos-app` in happy-dom mit gemockten Diensten (Router, Gateway, Vorhaben-, Git-, Projekt-Dienste, Terminal-Stubs); Routenableitung liegt als reine Funktion in `components/terminal/terminal-dock.ts`. | Erstes DOM-Test-Muster für `app.ts`; die Merkstelle und `switchToProject` sind nur am echten App-Zustand prüfbar. | §4 #19, neue Datei `terminal-dock.ts` |
| 2026-09-17 | E2E-Gesamtlauf 33/34: FA-19 im Gesamtlauf rot (Haiku legte in 180 s keinen Ordner an), in zwei Einzelläufen grün (INT-2026-005, gleicher Tab, 0 Remounts). | Agentenvarianz der Absicht-Sitzung, kein UI-Befund; Protokoll `design/e2e-protokoll.txt`. | §8 FA-19 |
