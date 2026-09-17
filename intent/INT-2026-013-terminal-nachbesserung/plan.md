# Plan: UI: Nachbesserung Terminal neben dem Dokument — Liste ohne Überlauf, volle Breite, angedockt immer ein Fenster

> **Intent:** `intent.md` (INT-2026-013, Bypass) · **Spec:** entfällt (Bypass)
> **Status:** umgesetzt (PR folgt, Merge = Michael)
> **Erstellt:** 2026-09-17 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-17 (Chat, nach externem Review mit 22 Findings, §12)
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand 79c0ec6), `CLAUDE.md`, `docs/security.md`, `docs/design.md`
> **Branch:** `fix/INT-2026-013-terminal-nachbesserung` von `origin/main` 79c0ec6, Worktree `session-sdlc-ui`. Hook `protect-tests`: Tests zuerst rot, dann `.claude/fix-mode`, dann Code.
## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Du hast die neue Vorhaben-Seite mit dem angedockten Terminal getestet und vier Dinge gefunden. Erstens laufen in der Vorhaben-Liste bei manchen Zeilen Texte über den Rand — es sieht aus, als wäre der Titel kaputt. Zweitens wird das Dokument nicht breiter, wenn du das Terminal mit Cmd+D wegklappst. Drittens erscheint das Terminal nicht sofort, wenn du aus der Liste in ein Vorhaben gehst und es vorher zugeklappt war. Viertens zeigt Cmd+D dann irgendeinen Tab, manchmal sogar die geteilte Ansicht mit mehreren Fenstern, statt genau die Sitzung dieses Vorhabens in einem einzigen Fenster.

**Was ist die Ursache?** (1) In der Liste steht neben der Phase eine kleine Notiz — gedacht für „PR #57". Sie kommt aus der Status-Zeile am Kopf von `plan.md`. Neuere Pläne packen in diese Zeile den ganzen Kopf („… · Erstellt: … · Freigabe: …"), und die Liste zeigt das Wort für Wort in Schreibmaschinenschrift, ohne Begrenzung — die Notiz drückt den Titel auf null Breite und läuft rechts hinaus. Der Titel selbst ist in Ordnung. (2) Die Seite hat seit dem Umbau im Frühjahr eine feste Maximalbreite von 1 180 Pixeln, der Dokumenttext sogar nur 900 — auf deinem breiten Bildschirm bleibt deshalb rechts immer Luft, egal ob das Terminal offen ist. Das Wegklappen selbst funktioniert (die Platzhalter-Breite geht sauber auf 0). (3) und (4) hängen zusammen: Die Seite sagt der App nur dann „meine Sitzung ist X", wenn sich die Sitzung ändert; Cmd+D ist ein reiner Ein-/Aus-Schalter, der nichts von der Seite weiß; und das Terminal-Fenster merkt sich deine letzte Aufteilung (ein, zwei oder vier Fenster) im Browser und wendet sie auch angedockt an — dort passt aber nur ein Fenster hin, und bei vier Fenstern schaltet es sogar auf Vollbild. Dazu kommt: Gehört die Sitzung zu einem anderen Projekt als dem gerade aktiven, wechselt die App erst das Projekt und fragt dafür das Backend; dieser Wechsel hat eine 150-ms-Entprellung — kommt ein zweiter Wechsel dazwischen (etwa beim Neuladen), bleibt der erste ohne Antwort hängen, und der richtige Tab wird nie gewählt. Das erklärt das „manchmal".

**Was ändert sich?** (1) Die Notiz wird auf das Wesentliche gekürzt (bis zum nächsten Kopffeld, ohne Fettdruck-Sternchen, höchstens 80 Zeichen), und die Zeile schneidet sie mit „…" ab, bevor der Titel leidet — der Titel hat immer Vorrang. (2) Liste, Vorhaben-Seite und Dokumenttext nutzen die volle Breite (deine Entscheidung „Alles 100 %"): angedockt ist das Dokument die linke Hälfte, zugeklappt das ganze Fenster. (3)+(4) Angedockt heißt ab jetzt: genau ein Fenster mit dem Tab der Vorhaben-Sitzung, immer. Die Seite meldet ihre Sitzung bei jedem Betreten (auch „keine Sitzung"), Cmd+D auf einer Vorhaben-Seite öffnet das Terminal mit genau dieser Sitzung, ein später eintreffender Tab wird nachgezogen, und ein misslungener Projektwechsel wird beim nächsten Cmd+D oder Seitenwechsel wiederholt. Deine gespeicherte Aufteilung (zwei oder vier Fenster) bleibt für die schwebende Ansicht auf anderen Seiten erhalten — angedockt wird sie nur nicht angewendet, nicht gelöscht; beim Verlassen der Vorhaben-Seite kommt sie zurück. Der Umschalter für die Aufteilung ist angedockt ausgeblendet.

**Wie wird das gemacht?** Die Notiz wird im Backend beim Lesen der Dokumente gekürzt (in der Funktion, die schon heute die Status-Zeile zerlegt), und die Listenzeile bekommt eine Breitengrenze für die Notiz — zwei Schichten, damit weder alte Dokumente noch neue Texte überlaufen. Die zwei Maximalbreiten werden gestrichen (zwei Stilregeln). Für das Andocken bekommt die App einen Merkzettel „Sitzung der aktuellen Seite" und eine einzige Abgleich-Funktion: Immer wenn sich Seite, Sitzung, Terminal-offen oder die Tab-Liste ändert, sorgt sie dafür, dass das angedockte Terminal offen ist und der richtige Tab vorne liegt — auch nach einem Projektwechsel. Das Terminal-Fenster selbst rechnet angedockt mit „ein Fenster", ohne seinen gespeicherten Zustand anzufassen.

**Was kann schiefgehen?** Das Terminal-Fenster darf beim Umschalten nicht neu aufgebaut werden (das hat uns zweimal Startfragen von Claude als Eingabe untergeschoben) — es ändert nur, welches der vorhandenen Fenster sichtbar ist; ein Test zählt Neuanlagen = 0. Der Projektwechsel bleibt asynchron; bis das Backend antwortet, kann der alte Tab kurz sichtbar sein — der Abgleich setzt danach nach. Ausdrückliche Öffnungen (Glocke, „Im Terminal öffnen", Einrichtung) behalten ihren eigenen Tab; nur Cmd+D und der Kopfzeilen-Schalter ziehen die Seiten-Sitzung. Volle Breite macht Fließtext auf 1 700 px lang — deine bewusste Wahl, rückgängig sind es zwei Stilzeilen. „Neue Absicht" und die Projekt-Seite hängen an derselben Regel und werden ebenfalls voll breit; ich gebe ihnen keine eigene Grenze (eine Regel für alle Seiten, du kannst widersprechen). Schlägt der Projektwechsel beim Backend fehl, versucht die App es bis zu dreimal, dann sagt sie es dir mit einem Hinweis, statt still den falschen Tab zu zeigen. Rückweg insgesamt: ein Revert-PR.

**Was musst du entscheiden?** Nichts mehr — B2 hast du entschieden (alles 100 %). Eine Annahme habe ich getroffen: „Neue Absicht" und Projekt-Seite bekommen keine eigene Breitengrenze (alles 100 % heißt alles). Freigabe reicht.

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: mensch -->

Vier Fehler nach dem Merge von INT-2026-011 (PR #65/#66). B1: `phaseNote` ungekürzt + `.note` ohne Overflow-Grenze. B2: `max-width` 1180/900 px aus INT-004. B3/B4: Seiten-Ereignis nur bei Sitzungswechsel und nie `null`; Cmd+D ohne Seitenbezug; `docked` ohne Einfluss auf `layoutMode`/`isFullscreen`/Pane-Wahl; Projektwechsel mit 150-ms-Debounce kann den Tab verlieren. Fix: Reader kürzt die Notiz, Zeile begrenzt sie; zwei CSS-Regeln weg; App bekommt `pageSessionId` + `_syncDock()` in `willUpdate`, View meldet jeden Wechsel inkl. `null`, Cmd+D/Toggle armieren den Seiten-Tab; Sidebar rechnet angedockt mit `effectiveLayoutMode = 'single'` ohne Persistenz, Vollbild angedockt aus, Layout-Umschalter ausgeblendet, kein Remount.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung |
|---|---|---|
| Notiz-Parsing | `ui/src/server/services/vorhaben-reader.ts:86-96` `parseStatusLine`: `note = m[2]` minus führendem Trenner, ungekürzt; `:424-425` `phaseNote = phase === 'pr' ? planNote : bypass ? 'Spec entfällt' : ''` | `[Certain]` B1-Quelle; Spec INT-004 FA-11 erwartete „PR #NN" |
| Zeile | `ui/frontend/src/components/vorhaben/aos-vorhaben-zeile.ts:22` Grid `minmax(90px,130px) 118px minmax(0,1fr) auto minmax(150px,auto) 70px`; `.titel` `:61-66` ellipsis; `.phase` `:67-73` `inline-flex; nowrap` ohne `overflow`/`min-width`; `.note` `:81-85` Monospace; Render `:179-183` | `[Certain]` `auto`-Spalte wächst mit der Notiz, Titel-Spalte fällt auf 0 |
| Seite | `aos-vorhaben-seite.ts:632` zeigt `phaseNote` ebenfalls | profitiert von der Kürzung |
| Breite | `ui/frontend/src/styles/theme.css:5775-5777` `.vorhaben-view { max-width: 1180px }` (Commit 2b9dbd5f, INT-004); `components/vorhaben/dokument-leser-styles.ts:49-51` `.markdown-body { max-width: 900px }`; `.view-container` Padding 2rem (`theme.css:1936`) | `[Certain]` 32 + 1180 = 1212 ≈ Screenshot |
| Offset | `aos-cloud-terminal-sidebar.ts:2653-2656` `updateContentOffset` → 0px bei zu (Test `aos-cloud-terminal-docked.test.ts:137`) | `[Certain]` B2 ist kein Sidebar-Fehler |
| Ereignis | `views/aos-vorhaben-view.ts:85,145-152` `lastPageSessionId`, Dispatch nur bei Wechsel und nur non-null; `:157-166` `pageSessionId()`; Element bleibt über Liste ↔ Seite ↔ neu am Leben (`app.ts:1602-1618`), auf fremden Routen ersetzt (`aos-not-found-view`) ohne Meldung | `[Certain]` B3 |
| App | `app.ts:190-193` `terminalDocked`; `:307-325` `_handleVorhabenPageSession`/`_dockSession`; `:292-300` `_selectSessionTab` → `switchToProject` → `handleProjectTabSelect:479-532` (async, Ack, dann `activeTerminalSessionId` aus `lastActiveSessionByProject`); `services/project-state.service.ts:94-143` `switchProject` mit `DEBOUNCE_MS` 150 (zweiter Aufruf im Fenster: erstes Promise löst nie; laufend: `{success:false}` → Toast, `return`); `:738-762` `willUpdate` mit `pendingDockSessionId`; Cmd+D `:1507-1513` und `_handleTerminalToggle:600-602` reiner Toggle; explizite Öffner `_openSessionInTerminal:267-284`, Glocke `:347-348`, Setup `:961-1001,1565-1569` setzen `isTerminalSidebarOpen = true` mit eigenem Tab | `[Certain]` B3/B4 |
| Sidebar-Layout | `aos-cloud-terminal-sidebar.ts:114-118` `layoutMode`, `paneSessionIds`, `focusedPaneIndex`; Lesestellen von `layoutMode`: `_paneCount:1131`, `_isSplit:1135`, `_paneGeom:1165`, `_paneRowAxis:1202`, `_healRowRatios:1243`, `_mountedSessions:1484-1500`, Container-Klasse `:1674`, Pane-Köpfe `:1729,1779`, `_renderSplitters:1861,1870`, `_setFullscreen:2075`, Escape `:2119`, `_renderLayoutSwitcher:2130`, `_restoreLayout:2283-2344` (`quad-4` → `isFullscreen = true`), `updated:2703-2712`; `_persistLayout:2263-2281`; Render `:1006` `docked = isDocked && !isFullscreen`, Tabs nur `!_isSplit` `:1658`, Sichtbarkeit `:1685-1688`; `_reconcilePanes:1561-1650` setzt nie `activeSessionId` in ein Pane; `docked` berührt Layout nie | `[Certain]` B4 |
| Tests | `vorhaben-reader.test.ts:50-57` nur kurze Notiz, `:248-251` Phase `pr` ohne `phaseNote`-Assert; keine Zeilen-Tests; `app-terminal-dock.test.ts` (6, mountet `aos-app` mit Mocks), `aos-cloud-terminal-docked.test.ts` (6), `aos-vorhaben-view-terminal.test.ts` (`:166`, `:313` erwarten nur non-null-Meldungen) | anpassen/ergänzen |

### 3. Entwurf

<!-- leser: agent -->

**B1 — Notiz kürzen, zwei Schichten.** `vorhaben-reader.ts`: `boundNote(raw)` in `parseStatusLine`: führenden Trenner streichen (wie heute) → am ersten Feldtrenner ` · ` schneiden (Mittelpunkt mit Leerzeichen — so trennen alle sdlc-Vorlagen die Kopffelder, mit oder ohne Fettdruck; Review #5) → `**` und Backticks entfernen → über `NOTE_MAX_CHARS = 80` mit „…" kürzen; Export für den Test. `phaseNote` ist damit per Vertrag ≤ 80 Zeichen Klartext für Liste **und** Seite (`VorhabenRow.phaseNote`-Kommentar im Protokoll nachziehen, Review #12) — eine Transformation an einer Stelle; das Frontend kürzt keinen Text, nur die Darstellung. `aos-vorhaben-zeile.ts`: Grid-Spalte 4 `auto` → `minmax(0, max-content)`; `.phase { max-width: 36ch; min-width: 0; overflow: hidden; }` — die `max-width` des Grid-Items begrenzt seinen max-content-Beitrag und damit die Spurbreite (`overflow: hidden` allein täte das nicht, Review #2); `.note { overflow: hidden; text-overflow: ellipsis; }` (nowrap erbt). Beweis nur im Browser: E2E `scrollWidth === clientWidth` je Zeile und `.titel`-Breite > 200 px (§8).

**B2 — volle Breite.** `theme.css:5775-5777` `.vorhaben-view { max-width }` löschen; `dokument-leser-styles.ts:49-51` `.markdown-body { max-width }` löschen. Entscheidung (Review #22): `neu` und Projekt-Seite bekommen **keine** eigene `max-width` — eine Regel für alle Seiten der View („alles 100 %"); Schritt 0a macht nur den Ist-Screenshot, damit Michael widersprechen kann. `docs/design.md` §5: „Liste, Vorhaben-Seite und Dokument nutzen die volle Breite (PO 17.09.)".

**B3/B4 — Zustandsmodell.**

App (`app.ts`):
- `@state() pageSessionId: string | null` — Sitzung der aktuellen Seite (Backend-ID); gesetzt nur durch `vorhaben-page-session` (jetzt auch `null`), auf `null` im Routen-Handler, wenn die Route nicht angedockt ist (deckt die ausgetauschte View).
- `pendingDockSessionId` (bestehend, neu belegt): „Seiten-Tab, sobald sein Tab existiert". Armiert (a) von `_syncDock`, wenn `pageSessionId`/`terminalDocked` sich ändern und die angedockte Seite eine Sitzung hat (öffnet die Sidebar), (b) beim Toggle-Öffnen (Cmd+D, `terminal-toggle`) auf angedockter Seite mit Sitzung. Gelöscht beim Tab-Wählen, bei Seite ohne Sitzung, beim Verlassen angedockter Routen. Aufgelöst in `willUpdate` bei jedem Update, solange gesetzt (FA-08: später Tab; Retry nach misslungenem Projektwechsel beim nächsten Armieren).
- `_handleVorhabenPageSession`: setzt nur `this.pageSessionId = detail.terminalSessionId ?? null` — sonst nichts; `_dockSession` entfällt, `_syncDock` übernimmt (Review #10).
- `_syncDock(changed)` am Ende von `willUpdate` (Zustandsänderungen in `willUpdate` sind in Lit erlaubt und lösen keinen zweiten Zyklus aus — heutiges Muster `app.ts:745-762`; kein Ereignis wird dort ausgelöst; Review #1): bei `pageSessionId`/`terminalDocked`-Änderung `pendingDockSessionId = terminalDocked ? pageSessionId : null`, `dockSwitchAttempts = 0`; bei Wert → `isTerminalSidebarOpen = true` (gleiches Update = „erscheint sofort"; Auto-Öffnen beim Betreten ist FA-02/AN-S02 aus INT-011, kein neues Verhalten — Review #15). **Pending bleibt gesetzt, bis der Tab wirklich vorne liegt** (Review #4/#9): jedes Update prüft — Tab per `terminalSessionId` fehlt → return (FA-08); Tab aktiv (`activeTerminalSessionId === match.id`, Projekt aktiv) → Pending löschen, `needsInput` löschen, Glocken-Notification entfernen; Tab im aktiven Projekt, nicht aktiv → `activeTerminalSessionId = match.id`; Tab in fremdem Projekt → nur wenn kein Wechsel in Flug (`dockSwitchProjectId === null`) und `dockSwitchAttempts < 3`: `dockSwitchProjectId = project.id`, `dockSwitchAttempts++`, `lastActiveSessionByProject.set(...)`, `switchToProject(...)`; `handleProjectTabSelect` setzt `dockSwitchProjectId = null` an jedem Ausgang (Erfolg, Fehler, frühes `return`) — beim nächsten Update greift der Abgleich erneut (Erfolg → Tab aktiv → fertig; Fehler → nächster Versuch). Nach dem dritten Fehlschlag: Pending löschen, Toast „Projektwechsel für die Sitzung fehlgeschlagen — Tab von Hand wählen". So löst die App nie selbst zwei Wechsel im 150-ms-Debounce aus, und ein hängendes Promise blockiert nichts (Routenwechsel weg von angedockten Seiten räumt `dockSwitchProjectId` mit auf).
- Pending wird außerdem gelöscht, wenn `pageSessionId` sich davon entfernt (Seite meldet `null`, weil die Sitzung endete — der Reader setzt `session.ended` nach `cloud-terminal:closed`; Review #8) oder die Route nicht mehr angedockt ist.
- `_toggleTerminalSidebar()`: flip; `if (open && terminalDocked && pageSessionId) pendingDockSessionId = pageSessionId`. Aus Cmd+D und `_handleTerminalToggle`. Explizite Öffner (`_openSessionInTerminal`, Glocke, Setup) bleiben unangetastet — die Seiten-Sitzung überschreibt sie nicht.
- Neue Felder: `dockSwitchProjectId: string | null`, `dockSwitchAttempts: number` (kein `@state`, reine Buchführung). Kommentare `:124-128`, `:302-306` anpassen.

View (`aos-vorhaben-view.ts:145-154`): Dispatch bei jedem **Wechsel** des Werts inkl. Wechsel auf `null` (Guard `sessionId &&` weg; Detail `{ terminalSessionId: string | null }`), weiterhin nur Mac. Startwert `lastPageSessionId = null`: eine frische Seite ohne Sitzung ist kein Wechsel und meldet nichts — Test und Regel widersprechen sich nicht (Review #16). Kein Tupel (route, intentId, sessionId): Lit dedupliziert `pageSessionId` ohnehin nach Wert, und `neu` → geclaimtes Vorhaben mit derselben Sitzung darf nicht neu melden (FA-19-Test).

Sidebar (`aos-cloud-terminal-sidebar.ts`):
- `type LayoutMode`; Getter `effectiveLayoutMode = isDocked ? 'single' : layoutMode`. Alle Eingänge von `isDocked` sind reaktiv (`docked`-Prop, `MobileBreakpointController`, Resize-Handler mit `requestUpdate()` `:187-195`) — der Getter braucht kein eigenes Tracking (Review #3). Alle verhaltensrelevanten Lesestellen darauf umstellen; Checkliste = `grep -n "layoutMode" aos-cloud-terminal-sidebar.ts` in Schritt 0b (24 Treffer inkl. Typ/Persistenz, jede Zeile wird im Build als effektiv / roh / Persistenz abgehakt; Review #14/#19). **Roh bleiben:** `_persistLayout`, `_restoreLayout`, `_setLayout` und `_mountedSessions()` samt eigener Helfer `_paneCountRaw`/`_isSplitRaw` — die Sitzungen aller geparkten Panes bleiben gemountet, Undock löst keinen Remount/Replay aus (RB-07). Ein Park-Elternteil ist nicht nötig: alle gemounteten `aos-terminal-session` rendern flach in `.terminal-sessions-container` (`:1673-1700`), Panes sind nur `display`/Geometrie-Stile je Element; nicht sichtbare bekommen `display:none` (Review #13).
- `render()`: `${this.isDocked ? nothing : this._renderLayoutSwitcher()}`.
- `_restoreLayout`: `quad-4 → isFullscreen = true` nur `if (!this.isDocked)` (App setzt `docked` vor `connectedCallback`).
- `_applyDockLayout()`: angedockt + Vollbild → Vollbild aus + Offset; nicht angedockt + offen + `quad-4` → Vollbild an + Offset; dann `_reconcilePanes()` (no-op angedockt; löst `_paneRestoreProjects` beim Zurückkehren) + `_refreshVisibleTerminals()`. Aufruf in `updated()` bei `docked`-Änderung und im Resize-Handler vor `updateContentOffset()` (1024-px-Grenze kippt `isDocked` ohne Prop-Wechsel).
- `_persistLayout()`: erste Zeile `if (this.isDocked) return;` — `localStorage` wird angedockt nie geschrieben.
- `_persistLayout`/`_restoreLayout`/`_setLayout` schreiben weiter `layoutMode` (roh).

Randfälle (entschieden): angedockte Seite ohne Sitzung → kein Auto-Öffnen, Cmd+D öffnet Einzel-Pane mit aktuellem Tab; Sitzung in fremdem Projekt → Spalte öffnet sofort auf alten Tabs, landet nach Ack; misslungener Wechsel (Debounce/„already in progress") → alter Tab bleibt, nächstes Armieren wiederholt; bewusst kein Trigger auf `activeProjectId` (würde explizite `session-jump`s bekämpfen); `neu` → Claim gleiche ID → kein Re-Arm (FA-19); Sitzung endet → `null` → Pending weg, Sidebar unberührt (FA-24); manueller Tab-Wechsel angedockt bleibt bis zum nächsten Armieren; `quad-4` gespeichert → angedockt nie Vollbild, Undock offen → Vollbild-Quad mit denselben Panes; Cmd+Shift+F angedockt → Vollbild Einzel-Pane; < 1024 px auf angedockter Route → schwebend mit gespeichertem Split (FA-07), Persistenz erlaubt; Handy unverändert; zwei Armierungen binnen 150 ms → letzter Wechsel gewinnt, erstes Promise hängt harmlos.

**Verworfen:** Tupel-Schlüssel in der View (bricht FA-19); Öffnen aus `isTerminalSidebarOpen` false→true ableiten (überschriebe Glocke/„Im Terminal öffnen"); `layoutMode` angedockt auf `single` schreiben (löscht Nutzer-Layout, AR-05-Bestand); Debounce in `switchProject` anfassen (fremde Baustelle, eigene Karte).

**Architektur:** keine AR-Änderung; `localStorage`-Bestandszeile `architecture.md` §10 bleibt (angedockt wird nicht geschrieben). Kein ADR.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei | Art | Was | Befund |
|---|---|---|---|---|
| 1 | `ui/src/server/services/vorhaben-reader.ts` | ändern | `boundNote`, `NOTE_MAX_CHARS`, `parseStatusLine` | B1 |
| 2 | `ui/frontend/src/components/vorhaben/aos-vorhaben-zeile.ts` | ändern | `.phase` min-width/overflow, `.note` max-width/ellipsis | B1 |
| 3 | `ui/frontend/src/styles/theme.css` | ändern | `.vorhaben-view { max-width }` weg (`:5775-5777`) | B2 |
| 4 | `ui/frontend/src/components/vorhaben/dokument-leser-styles.ts` | ändern | `.markdown-body { max-width }` weg (`:49-51`) | B2 |
| 5 | `ui/frontend/src/views/aos-vorhaben-view.ts` | ändern | Dispatch inkl. `null`, Typ, Kommentar | B3 |
| 6 | `ui/frontend/src/app.ts` | ändern | `pageSessionId`, `_syncDock`, `_toggleTerminalSidebar`, `_dockSession` weg, Routen-Handler, Kommentare | B3/B4 |
| 7 | `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` | ändern | `LayoutMode`, `effectiveLayoutMode`, Lesestellen, `_applyDockLayout`, Switcher, `_restoreLayout`, `_persistLayout`-Guard | B4 |
| 8 | `ui/tests/unit/vorhaben-reader.test.ts` | ändern | lange Notiz, Kopffeld-Schnitt, Markdown weg, Kappung 80; `phaseNote` in `toRow` | B1 |
| 9 | `ui/tests/unit/aos-vorhaben-zeile.test.ts` | neu | Titel und Notiz als getrennte Spans, Notiz-Text = gekürzter Wert (happy-dom, kein Layout) | B1 |
| 10 | `ui/tests/unit/aos-vorhaben-view-terminal.test.ts` | ändern | Listener-Typ `string \| null`; `:166` → `['cloud-1-1', null]`, `:313` → `['cloud-2-2', null, 'cloud-2-3']`; neu: Sitzungsverlust meldet `null` genau einmal, frische Seite ohne Sitzung meldet nichts | B3 |
| 11 | `ui/tests/unit/app-terminal-dock.test.ts` | ändern | `AppInternals` += `pageSessionId`; Helfer `pageSession(id)`, `cmdD()`, verzögertes `switchProject`; Tests s. §8 | B3/B4 |
| 12 | `ui/tests/unit/aos-cloud-terminal-docked.test.ts` | ändern | `sidebar()` mit `layout`-Seed in `localStorage`, `allSessions=[a1,b1]`; Tests s. §8 | B4 |
| 13 | `docs/design.md` | ändern | §5 volle Breite; Änderungsprotokoll | B2 |
| 14 | `intent/INT-2026-013-terminal-nachbesserung/{intent,plan}.md`, `design/e2e-protokoll.txt`, `design/ist/*.png` | neu | Kern-Absicht, Plan, E2E-Protokoll, Screenshots 1 728 px | alle |

**Nicht betroffen:** `replay-sanitize.ts`, `aos-terminal.ts`, `aos-terminal-session.ts`, `kennung-link-provider.ts`, `project-state.service.ts` (Debounce bleibt; eigene Karte), Backend außer Reader, Handy-Pfad.

### 5. Verbindungen / Nachweise

<!-- leser: agent -->

| Von | Nach | Schnittstelle | Nachweis |
|---|---|---|---|
| `aos-vorhaben-view` | `app.ts` | `vorhaben-page-session { terminalSessionId: string \| null }` | `grep -n "vorhaben-page-session" ui/frontend/src` → 1 Dispatch, 1 Listener; Test #10 |
| `app.ts` | `aos-cloud-terminal-sidebar` | `.isOpen`, `.docked`, `.activeSessionId` (bestehend) | Test #11 |
| `app.ts` `_syncDock` | `terminalSessions`, `switchToProject` | Pending-Auflösung, Projektwechsel | `grep -n "pendingDockSessionId" ui/frontend/src/app.ts` ≥ 4; Test #11 |
| Sidebar `effectiveLayoutMode` | `localStorage` | nie geschrieben angedockt | Test #12 (Keys unverändert) |
| Reader | Zeile | `VorhabenRow.phaseNote` ≤ 80 Zeichen | Test #8, #9 |

### 6. Reihenfolge

<!-- leser: agent -->

0. **Lesende Vorprüfung:** (a) Screenshots `neu` und Projekt-Seite bei 1 728 px vor/nach dem Wegfall der Grenze (nur Beleg, keine Grenze). (b) `grep -n "layoutMode" aos-cloud-terminal-sidebar.ts` → Checkliste (24 Treffer), jede Zeile effektiv/roh/Persistenz zuordnen. (c) Branch-Backend 3111, Viewport 1 728×1 000: Ist-Screenshots der vier Befunde (Liste mit langer Notiz: Scratch `INT-2026-002` `plan.md` Status-Zeile verlängern; Cmd+D-Breite; Liste → Vorhaben bei zu; Cmd+D mit `split-2` in `localStorage`). Protokoll „Schritt 0".
1. `intent.md` (Kern) + `plan.md` anlegen, committen.
2. **Tests rot:** #8, #9, #10, #11, #12 schreiben → `npx vitest run` zeigt die neuen rot, Bestand grün. Dann `touch .claude/fix-mode`.
3. B1: #1, #2 → #8, #9 grün.
4. B2: #3, #4 → Sichtprüfung 1 728 px.
5. B3: #5, #6 → #10, #11 grün.
6. B4: #7 → #12 grün; #11 komplett grün.
7. `cd ui && npm run lint && npm run build:ui`; `bash scripts/verify.sh` → `verify: OK`.
8. E2E (§8) → Screenshots `design/ist/`, Protokoll; `.claude/fix-mode` entfernen; `docs/design.md`; PR; Merge = Michael (Auto-Deploy).

### 7. Zerlegung

<!-- leser: agent -->

Variante A — eine Sitzung (vier kleine, verbundene Änderungen).

### 8. Tests und Nachweis

<!-- leser: agent -->

| Befund | Test (Datei) | Art |
|---|---|---|
| B1 | `vorhaben-reader.test.ts`: `parseStatusLine` mit `INT-2026-009`-Zeile → `note` = „(Merge steht aus; Fassung 2 nach externem Review, 3 Reviewer, 24 Findings, §12)"; `**PR #49** offen (…)` → ohne `**`, ≤ 80 mit „…"; kurze `· PR #57` unverändert; `toRow` Phase `pr` setzt `phaseNote` gekürzt | Unit |
| B1 | `aos-vorhaben-zeile.test.ts` (neu): `.titel` = Titel, `.note` = Notiz, beide vorhanden | Unit |
| B1/B2 | E2E 1 728 px: Liste — jede `.zeile` `scrollWidth === clientWidth`, `.titel` Breite > 200 px bei Zeile mit langer Notiz; Vorhaben-Seite angedockt: `aos-vorhaben-seite` Breite ≈ 864 − Padding; Cmd+D → Breite ≈ 1 728 − 64; `.markdown-body` Breite = Spaltenbreite | E2E + Screenshots `ist-liste.png`, `ist-seite-zu.png` |
| B3 | `app-terminal-dock.test.ts`: „Sidebar per Cmd+D zu, Liste → Vorhaben: Spalte öffnet im selben Update auf dem Seiten-Tab"; „Sitzung in fremdem Projekt: Spalte öffnet vor dem Ack, landet danach auf dem Tab" (verzögertes `switchProject`, `activeProjectId` vorher `pa`, nachher `pb`/`b1`); „Wechsel scheitert (`success:false`) → zweiter Versuch beim nächsten Update, nach dem dritten Fehlschlag Toast und Pending weg; während ein Wechsel in Flug ist, wird kein zweiter ausgelöst" (Review #4/#9); „später Tab wird nachgezogen" (bestehend); „Verlassen der Seite verwirft Pending, später Tab wird auf der Liste nicht gewählt"; „`null`/leer = keine Seiten-Sitzung, Pending weg"; „unbekannte Route nach einem Vorhaben vergisst die Seiten-Sitzung" (Review #7); „Sitzung endet, während der Tab noch aussteht → View meldet `null`, Pending weg" (Review #8) | Unit |
| B3 | `aos-vorhaben-view-terminal.test.ts`: Sitzungsverlust meldet `null` genau einmal; Seite ohne Sitzung meldet nichts; FA-19 unverändert (gleiche ID nicht doppelt) | Unit |
| B4 | `app-terminal-dock.test.ts`: „Cmd+D und Kopfzeilen-Toggle auf angedockter Seite öffnen auf dem Seiten-Tab, nachdem ein anderer Tab angesehen wurde"; „Cmd+D auf angedockter Seite ohne Sitzung öffnet Einzel-Pane mit aktuellem Tab" (`localStorage` `split-2` geseedet, `_isSplit === false`, Tab-Leiste da); „Cmd+D außerhalb angedockter Routen rührt den Tab nicht an"; „explizites `open-terminal-session` behält seinen Tab" | Unit |
| B4 | `aos-cloud-terminal-docked.test.ts`: „`split-2` gespeichert + docked → ein Pane, Tab-Leiste, keine Pane-Köpfe/Splitter, Container `.single`; `b1` bleibt gemountet, versteckt"; „`quad-4` + docked → kein Vollbild; undocked offen → Vollbild-Quad mit gespeicherten Panes; wieder docked → single; `localStorage`-Keys unverändert"; „angedockt: Switcher ausgeblendet, Cmd+Shift+F = Vollbild Einzel-Pane, Escape zurück zur Spalte ohne Downgrade/Persistenz"; „Dock ↔ Undock: dieselben `aos-terminal-session`-Elemente, `paneSessionIds` gleich (0 Remounts)"; „Andocken beendet aktives Vollbild"; „< 1024 px: Split kehrt zurück (schwebend), ≥ 1024 → single, kein Vollbild"; „kein Persist angedockt; nach Undock löst die Pane-Wiederherstellung auf a1/b1" | Unit |
| B3/B4 | E2E 1 728 px, Branch-Backend 3111, Scratch: `localStorage` `cloud-terminal-layout-mode = split-2` seeden, aktives Projekt ≠ Scratch; Sitzung `plan` auf INT-2026-001 (haiku); Liste → Vorhaben: `.terminal-sidebar.open.docked` binnen 300 ms, Tab = Sitzung, `_isSplit false`, `aos-terminal` Remounts 0; Cmd+D zu → Cmd+D auf → gleicher Tab, ein Pane; Route `projekt` → Sidebar schwebend mit `split-2` (Layout zurück); Screenshots `ist-dock-single.png`, `ist-projekt-split.png` | E2E |

Verify: `bash scripts/verify.sh` → `verify: OK`; CI ist die Wahrheit; Bezugsliste unverändert. E2E-Rezept: Memory `reference_cloud_terminal_e2e_playwright.md` (Backend 3111, `SPECWRIGHT_RUNTIME_DIR=/tmp/sw-3111`, Scratch `/private/tmp/scratch-int010` auf d07f8c6, `waitIdle` dialogfest, Playwright global 1.57 mit Chrome, Viewport 1 728×1 000). Bugfix-Anteil: ja → `.claude/fix-mode` nach den roten Tests.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | W. | Wirkung | Gegenmaßnahme |
|---|---|---|---|
| Umstellung der `layoutMode`-Lesestellen übersieht eine → angedockt bleibt Split-Rest sichtbar | mittel | mittel | Liste in §2 (21 Stellen) abhaken; Test #12 prüft Pane-Köpfe/Splitter/Container-Klasse |
| Remount beim Dock/Undock → Buffer-Replay (zweimal regressiert) | niedrig | hoch | `_mountedSessions` liest roh; Test „dieselben Elemente"; E2E Remount-Zähler 0 |
| Projektwechsel scheitert (Debounce) → alter Tab bleibt | mittel | niedrig | Pending bleibt armiert, nächstes Cmd+D/Seitenwechsel wiederholt; Karte für den Debounce |
| Volle Breite zerfasert `neu`/Projekt-Seite | mittel | niedrig | Schritt 0a, eigene Grenze je Komponente |
| `protect-tests` blockiert Test-Edits im Fix-Modus | sicher | niedrig | Tests vor dem Marker schreiben (§6 Schritt 2) |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann |
|---|---|---|
| PR mergen (Auto-Deploy) | Michael | nach CI grün |
| Stichprobe am 1 728-px-Mac: Liste, Cmd+D-Breite, Liste → Vorhaben bei zu, Cmd+D mit gespeichertem Split | Michael | nach Deploy |
| Karte „`switchProject`-Debounce lässt ein Promise hängen" ins Board (Eingang, bewertet) — in eigener Board-Sitzung | Claude | nach Merge |

### 12. Review des Plans (externer Konsens, 3 Reviewer, 22 Findings)

<!-- leser: mensch -->

| # | Finding | Entscheidung | Änderung |
|---|---|---|---|
| 1 | `_syncDock` in `willUpdate` mutiert Zustand → Schleifen/stale DOM | **abgelehnt, präzisiert:** Lit erlaubt Zustandsänderungen in `willUpdate` ohne zweiten Zyklus (Lit-Doku; genau so löst `app.ts:745-762` heute `pendingDockSessionId` auf); `_syncDock` löst kein Ereignis aus, die View meldet aus `updated()` | §3 Satz |
| 2 | `auto`-Spur wächst trotz `overflow: hidden` mit der Notiz | **angenommen:** Spur `minmax(0, max-content)`, `.phase { max-width: 36ch }` begrenzt den max-content-Beitrag; Beweis per E2E `scrollWidth === clientWidth` | §3 B1, §8 |
| 3 | Getter `effectiveLayoutMode` rendert bei `isDocked`-Wechsel nicht neu | **abgelehnt:** alle Eingänge reaktiv — `docked`-Prop, Breakpoint-Controller, Resize-Handler mit `requestUpdate()` (`:187-195`) | §3 Satz |
| 4 | Debounce-Race vertagt; Pending vor dem asynchronen Wechsel gelöscht → kein Retry | **angenommen:** Pending lebt bis „Tab vorne"; In-Flight-Guard `dockSwitchProjectId`, höchstens ein Wechsel in Flug, bis zu 3 Versuche, dann Toast; der Debounce selbst bleibt fremde Baustelle (Karte §10) | §3 App, §8, §10 |
| 5 | Schnitt-Regex an ` · **Feld:**` gekoppelt, Kappung lossy für alle Konsumenten | **angenommen:** Schnitt am ersten ` · ` (Vorlagen-Feldtrenner, mit/ohne Fettdruck); Kappung 80 ist der Vertrag von `phaseNote` (eine Stelle, Reader), Frontend kürzt keinen Text | §3 B1 |
| 6 | Reihenfolge Pending vs. `isTerminalSidebarOpen` gedreht | **abgelehnt:** beides im selben Update gebündelt; die Tests prüfen Endzustände, keine Reihenfolge | — |
| 7 | Stale `pageSessionId` bei unbekannter Route | **angenommen:** Routen-Handler läuft für jede Route (auch 404) und setzt `null`; Test „unbekannte Route nach Vorhaben" ergänzt | §8 |
| 8 | Pending bleibt, wenn die Sitzung während des Wartens verschwindet | **angenommen (Klarstellung):** Reader setzt `session.ended` → View meldet `null` → Pending weg; Test ergänzt; die Prüfung je Update ist ein `find` über die Tab-Liste, kein Kostenproblem | §3, §8 |
| 9 | Cmd+D im Debounce-Fenster verwaist ein Promise | **angenommen:** durch den In-Flight-Guard (#4) wird während eines laufenden Wechsels kein zweiter ausgelöst | §3 |
| 10 | Was ersetzt `_dockSession` im Handler? | **angenommen (Klarstellung):** Handler setzt nur `pageSessionId`; `_syncDock` macht den Rest | §3 |
| 11 | Kein Test beweist die CSS-Breite | **angenommen:** Unit-Test deckt Daten; die Breite beweist die E2E-Zeile (`scrollWidth`, `.titel` > 200 px, Screenshot) — Pflichtnachweis im PR | §8 |
| 12 | Kappung trifft auch die Detailseite | **angenommen als Absicht:** ≤ 80 Zeichen Klartext ist dort ebenso richtig; Vertrag im Protokoll-Kommentar | §3 B1 |
| 13 | `_mountedSessions` roh vs. `_paneCount` effektiv, Park-Elternteil fehlt | **abgelehnt, belegt:** alle Sitzungen rendern flach in `.terminal-sessions-container` (`:1673-1700`), Panes sind Stile je Element; Roh-Helfer `_paneCountRaw`/`_isSplitRaw` nur für `_mountedSessions` | §3 Sidebar |
| 14 | Eine Lesestelle übersehen → Split-Reste angedockt | **angenommen:** grep-Checkliste (24) in Schritt 0b, jede Zeile zugeordnet; Test #12 prüft Köpfe/Splitter/Container-Klasse/Switcher | §6 Schritt 0b |
| 15 | Auto-Öffnen bei jedem Seitenwechsel = Verhaltensausweitung | **abgelehnt:** ist FA-02/AN-S02 aus INT-2026-011 (heute öffnet `_dockSession` bei jeder Meldung ebenso); Michaels B3 verlangt genau das | — |
| 16 | `null`-Meldung widerspricht dem Test „frische Seite meldet nichts" | **abgelehnt (Klarstellung):** gemeldet wird ein Wechsel; Startwert `null` → `null` ist keiner | §3 View |
| 17 | Grid-Spalte `vorhaben-note` kollidiert mit Lit-Feld | **abgelehnt:** kommt im Plan nicht vor (Reviewer-Artefakt) | — |
| 18 | Komplexität des Zustandsmodells | **angenommen als Preis:** drei Felder und eine Abgleichfunktion ersetzen drei Sonderpfade (Ereignis, Cmd+D, Pending); Alternativen in §3 „Verworfen" | — |
| 19 | 21 vs. 24 `layoutMode`-Treffer | **angenommen:** Checkliste ist der grep, nicht die Zahl | §6 |
| 20 | Vitest-Erkennung neuer Datei | **abgelehnt:** `vitest.config.ts` `include: ['tests/**/*.test.ts']`; Stufe 1 hat drei neue Dateien so aufgenommen | — |
| 21 | Custom Property im Lit-Template | **abgelehnt:** kommt im Plan nicht vor (Reviewer-Artefakt) | — |
| 22 | Breitengrenze für `neu`/Projekt-Seite ist Produktentscheidung im Bauschritt | **angenommen:** entschieden — keine eigene Grenze („alles 100 %"), als Annahme in Teil 1 genannt | Teil 1, §3 B2, §6 |

**Abgleich Mensch/Agent:** Teil 1 gegen §3–§8 gelesen am 17.09.: ohne Befund — die drei Versuche mit Hinweis, die Annahme zu `neu`/Projekt-Seite und „ein Fenster, immer" stehen in beiden Teilen.

### 14. Abweichungen

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Abschnitt |
|---|---|---|---|
| 2026-09-17 | B3-Symptom („Terminal erscheint nicht sofort") im E2E-Skript nicht reproduzierbar: Erstbesuch aus der Liste öffnet in 15 ms, Wiederbesuch (Cmd+D zu → Liste → dasselbe Vorhaben) in 7 ms, Sitzung in fremdem Projekt landet nach 169 ms. B1, B2, B4 reproduziert (Zahlen in `design/e2e-protokoll.txt`). | Die View setzt ihren Merker auf der Liste auf `null` zurück, also meldet sie beim Wiederbesuch doch. Der Umbau wurde trotzdem wie geplant gebaut: die Ursache laut §2 (Ereignis nie `null`, Cmd+D ohne Seitenbezug, Debounce-Race beim Projektwechsel) bleibt die Arbeitshypothese für Michaels „manchmal"; Stichprobe am 1 728-px-Mac (§10) entscheidet. | §2, §8 |
| 2026-09-17 | `grep layoutMode` liefert 22 Treffer, nicht 24 (§2) bzw. 21 (§9). | Checkliste ist der grep, nicht die Zahl (Review #19); Zuordnung in `design/e2e-protokoll.txt` Schritt 0 (b). | §6 Schritt 0b |
| 2026-09-17 | Test #9 (`aos-vorhaben-zeile.test.ts`) prüft zusätzlich den Stylesheet-Text (Spur `minmax(0, max-content)`, `.phase` min-width/overflow/max-width, `.note` ellipsis). | happy-dom hat kein Layout; ohne diese Prüfung wäre der Test vor dem Fix grün gewesen (Regel „Tests zuerst rot"). Die Breite selbst beweist E2E (§8). | §4 #9, §8 |
| 2026-09-17 | `_syncDock` löscht `dockSwitchProjectId` zusätzlich bei jeder Änderung von `activeProjectId`. | Ein fremder Wechsel (Glocke, Projekt-Tab) kann im 150-ms-Debounce das Promise unseres Wechsels verwaisen lassen; ohne diese Zeile bliebe der In-Flight-Guard bis zum Verlassen der Seite gesetzt und der Abgleich stumm. | §3 App |
| 2026-09-17 | `handleProjectTabSelect` ruft bei misslungenem Wechsel `requestUpdate()`, wenn ein Seiten-Tab aussteht. | „Nächstes Update" hätte sonst auf ein unbeteiligtes Ereignis gewartet; so laufen die bis zu drei Versuche direkt hintereinander (Test #11 „Wechsel scheitert"). | §3 App |
| 2026-09-17 | Sichtprüfung B2 (§6 Schritt 4) im E2E-Lauf von Schritt 8 statt als eigener Schritt. | Braucht denselben Frontend-Build; Zahlen und Screenshots liegen in `design/ist/` (`ist-liste.png`, `ist-seite-zu.png`, `ist-neu.png`, `ist-projekt.png`). | §6 Schritt 4 |
| 2026-09-17 | E2E ergänzt um den Wiederbesuch-Pfad (Cmd+D zu → Liste → dasselbe Vorhaben) und die Projekt-Seite als Undock-Beleg; Screenshots `vorher-*.png` (Schritt 0) neben `ist-*.png`. | Michaels B3-Beschreibung ist der Wiederbesuch; der Plan nannte nur Liste → Vorhaben. | §8 |
