# Plan: UI: Terminal schließt beim Verlassen der Vorhaben-Seite, Cmd+← führt zur Übersicht

> **Intent:** `intent.md` (INT-2026-015) · **Spec:** entfällt (bypass: Größe S, zwei Verhaltensänderungen im Frontend ohne Daten und ohne Backend)
> **Status:** in_umsetzung
> **Erstellt:** 2026-09-17 im Plan Mode · **Freigabe:** PO (Michael Sindlinger), 2026-09-17 14:55
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand a0adbd1), `CLAUDE.md`, `docs/security.md`

<!-- Der Plan ist TECHNISCH und die EINHEIT DER AUSFÜHRUNG. Eine Sitzung setzt ihn ganz um.
     Maßstab: Ein neues Teammitglied könnte allein anhand dieses Dokuments umsetzen.
     Jede Änderung verweist auf eine FA (spec.md) oder ein AK (intent.md). Keine Änderung ohne Herkunft.
     Zwei Leser: „In einfachen Worten" liest die Person, die freigibt; „Details" liest der Agent, der baut. Die erste Zeile unter jeder
     Überschrift sagt, für wen der Abschnitt ist (R1, specwright/workflows/meta/leser-und-rueckfragen.md). Marker übernehmen, keinen entfernen. -->

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Seit dem Terminal neben dem Dokument (INT-2026-011) steht auf der Vorhaben-Seite und auf „Neue Absicht" rechts die laufende Claude-Sitzung als angedockte Spalte. Verlässt du die Seite — über den Knopf „‹ Vorhaben", über die Glocke oder das Projekt-Symbol —, bleibt dieses Terminal offen und liegt als schwebendes Fenster über der Übersicht. Du schließt es dann jedes Mal von Hand (Cmd+D oder „×"), bevor die Übersicht benutzbar ist. Zweitens gibt es den Weg zurück zur Übersicht nur mit der Maus: der Knopf „‹ Vorhaben" oben links. Eine Taste dafür fehlt.

**Was ändert sich?** Zwei Dinge, beide nur am Mac (ab 1024 px Fensterbreite; am Handy ändert sich nichts):

1. Wechselst du von der Vorhaben-Seite oder von „Neue Absicht" auf eine Seite ohne angedocktes Terminal (Übersicht, Projekt-Seite), schließt sich das Terminal-Fenster von selbst. Die Sitzung dahinter läuft weiter, ihr Tab bleibt erhalten; nur das Fenster geht zu. Braucht die Sitzung danach eine Antwort, meldet die Glocke das wie bisher. Cmd+D holt das Terminal zurück — schwebend, in der Aufteilung, die du dir zuletzt eingerichtet hattest (ein, zwei oder vier Fenster). Wechselst du dagegen von einem Vorhaben direkt in ein anderes (Glocke, Kennung-Link) oder zu „Neue Absicht", bleibt das Terminal offen und zeigt die Sitzung der neuen Seite — wie heute.

2. Auf der Vorhaben-Seite und auf „Neue Absicht" bringt dich **Cmd+←** zur Übersicht — dasselbe wie der Knopf „‹ Vorhaben". Steht der Cursor in einem Textfeld (Anmerkung, Absichtstext, Notizblock, Tab-Umbenennen), tut die Taste, was sie im Textfeld immer tut (Sprung an den Zeilenanfang), und die Seite bleibt. Steht der Cursor im Terminal, greift die Taste trotzdem: das Terminal ignoriert Cmd+Pfeil ohnehin, die Sitzung bekommt davon nichts zu sehen. Auf allen anderen Seiten (Übersicht, Projekt-Seite) fasst die App die Taste nicht an; dort bleibt sie beim Browser (Verlauf zurück). Ctrl+← bleibt frei — im Terminal ist das der Wort-Sprung.

**Wie wird das gemacht?** Die App weiß bei jedem Seitenwechsel, ob die neue Seite ein angedocktes Terminal hat (dieselbe Regel, nach der das Andocken heute schon entschieden wird — `ui/frontend/src/components/terminal/terminal-dock.ts:11`). An genau einer Stelle, dem Empfänger des Seitenwechsels in `ui/frontend/src/app.ts:205`, kommt eine Zeile hinzu: „war die alte Seite angedockt und ist es die neue nicht, dann Terminal-Fenster zu". Mehr braucht das Schließen nicht, weil das Fenster ohnehin nur ein Ja/Nein-Schalter im Browser ist, den Cmd+D und der „×"-Knopf heute schon umlegen. Für Cmd+← bekommt die App-weite Tastenprüfung — die heute nur Cmd+D kennt (`ui/frontend/src/app.ts:1575`) — einen zweiten Fall: Cmd+← auf einer angedockten Seite, und der Cursor steht nicht in einem Textfeld → Übersicht öffnen, so wie es der Knopf tut. Die Regel „was zählt als Textfeld" liegt als kleine, für sich testbare Funktion neben den vorhandenen Tastenregeln (`ui/frontend/src/utils/keyboard-shortcuts.ts`). Zwei Feinheiten: Erstens liegen Anmerkungs- und Absichtsfelder in eigenen, gekapselten Bausteinen der Seite (Web Components mit Shadow DOM), und die App-weite Tastenprüfung sieht von außen nur den Baustein, nicht das Feld darin. Deshalb fragt die Prüfung nach dem ganzen Weg des Tastendrucks vom innersten Feld bis zur Seite (`composedPath()`), nicht nach dem äußeren Ziel. Zweitens empfängt das Terminal seine Tasten über ein unsichtbares Eingabefeld der Terminal-Bibliothek — dort soll Cmd+← ja greifen. Die Prüfung erkennt das nicht an einem Namen, den die Bibliothek vergibt (der könnte sich mit einer neuen Version ändern — Einwand der ersten Review-Runde), und auch nicht an der Lage im Seitenbaum (ein künftiges zweites Feld im Terminal-Baustein würde dann mit übersprungen — Einwand der zweiten Runde), sondern an einer Markierung, die unser Terminal-Baustein beim Start selbst an dieses Feld hängt. Das Feld holt er sich über die offiziell zugesagte Schnittstelle der Bibliothek (`ui/frontend/src/components/aos-terminal.ts:393`, direkt nach dem Öffnen), nicht über einen internen Namen. Als Sicherheitsgurt für künftige Versionen der Terminal-Bibliothek bekommt das Terminal zusätzlich eine Sperre für Cmd+←, damit die Taste nie als Eingabe an die Sitzung geht — nach dem Muster, das für Cmd+Shift+Enter schon existiert (`ui/frontend/src/components/aos-terminal.ts:480`). Beide Neuerungen gelten nur mit der Cmd-Taste am Mac (auf anderen Systemen wäre das die Windows- oder Super-Taste — die App läuft nur auf Michaels Mac und im Browser; eine Abfrage des Betriebssystems baue ich dafür nicht ein); am Handy — auch mit Bluetooth-Tastatur — fasst die App weder das Fenster noch die Taste an. Hältst du Cmd+← gedrückt, zählt nur der erste Druck.

**Was kann schiefgehen?** Drei Dinge, alle klein und rückholbar:

- Du gewöhnst dich um: nach dem Verlassen ist das Terminal zu, auch wenn es vorher schwebend offen war (so gewollt, NZ-01). Cmd+D holt es zurück.
- Cmd+← ist im Browser „Verlauf zurück"; auf den zwei Seiten übersteuert die App das. Wer dort den Verlauf braucht, hat weiterhin Cmd+[. Falls das nach einer Woche stört: eigenes Vorhaben (AN-02).
- Die Prüfung „Cursor im Textfeld?" könnte ein Feld übersehen, das ich nicht gefunden habe — dann würde Cmd+← in diesem Feld zur Übersicht springen. Ich habe alle Textfelder der Vorhaben-Ansicht, der Kopfzeile, des Notizblocks, des Datei-Editors und der Terminal-Leiste durchgesehen; die Regel greift über den Feldtyp, nicht über eine Liste, deckt also auch künftige Felder ab. Merken würdest du es sofort; Rückweg: eine Zeile.

Nichts davon berührt das Backend, die Sitzungen oder gespeicherte Daten. Der Rückweg ist im schlimmsten Fall ein Revert der PR.

**Was musst du entscheiden?** Nichts, Freigabe reicht. Drei externe Reviewer haben den Plan in zwei Runden gelesen (Abschnitt 12, E1–E13 und G1–G14): den Blocker der ersten Runde — die Erkennung des Terminal-Eingabefelds hing an einem Namen der Terminal-Bibliothek — und den Haupteinwand der zweiten — die Ersatzlösung hing an der Lage im Seitenbaum — habe ich behoben (siehe „Wie wird das gemacht?"); die übrigen Punkte sind eingearbeitet (mehr Tests, Handy auch für die Taste ausgenommen, Reihenfolge der Zuweisungen, gehaltene Taste) oder mit Grund abgelehnt (Verlauf-Doppeldruck fängt der Router schon ab; Cmd+← auf „Neue Absicht" und bei Fokus auf einem Knopf ist so in der Absicht festgelegt). Eine Randnotiz zur Kenntnis: die Zoom-Taste des Terminals (Cmd+Shift+Enter) hat dieselbe Shadow-DOM-Lücke bei der Textfeld-Prüfung wie oben beschrieben — beim Tippen im Notizblock würde sie zoomen. Das ist nicht Teil dieses Vorhabens; ich nenne es im Abschlussbericht als Kandidat für eine Board-Karte.

## Details

<!-- leser: mensch -->

<!-- Volle technische Tiefe: Dateien, Funktionen, Datenmodell, Tradeoffs, Testplan. Geht an Reviewer und in die Bausitzung, muss für sich stehen.
     Confidence-Tags in beiden Teilen: [Certain] harte Belege · [Likely] starke Inferenz · [Uncertain] Vermutung. -->

### 1. Kurzfassung

<!-- leser: mensch -->

Zwei Frontend-Änderungen in `app.ts`, gestützt auf zwei neue reine Prädikate in `utils/keyboard-shortcuts.ts`: (1) der Routen-Handler schließt die Terminal-Sidebar beim Übergang angedockt → nicht angedockt (Mac); (2) der globale Keydown-Handler navigiert bei Cmd+← auf angedockten Routen (Mac, kein Tasten-Repeat) zur Übersicht, sofern der Ereignispfad (`composedPath()`) nicht in einem Textfeld beginnt — außer das Feld trägt die Markierung `data-terminal-input`, die `aos-terminal` beim Öffnen an xterms öffentliche `terminal.textarea` hängt. Dazu eine Sperre in xterms Custom-Key-Handler (Cmd+← nie in die PTY), Tests im bestehenden `app-terminal-dock`-Harness und in `keyboard-shortcuts.test.ts`, eine Zeile in `docs/design.md` §5. Kein Backend, kein neuer Zustand, keine Persistenz (AR-05 eingehalten).

### 2. Ausgangslage im Code

<!-- leser: agent -->

<!-- Was existiert, was wiederverwendet wird, was heute anders läuft als gedacht. Mit Datei:Zeile. Das ist der Teil, der Plan-Mode-Recherche festhält. -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Andocken aus der Route | `ui/frontend/src/components/terminal/terminal-dock.ts:11-14` — `terminalDockedFor(route)`: `neu` immer, `vorhaben` mit ≥ 2 Segmenten. Rein, getestet (`tests/unit/app-terminal-dock.test.ts:214`) | wiederverwendbar [Certain]: genau die zwei Seiten aus AK-01/AK-05; keine zweite Routen-Regel nötig |
| Routen-Handler | `ui/frontend/src/app.ts:205-211` — setzt `currentRoute`, `terminalDocked = terminalDockedFor(route)`, `pageSessionId = null` bei nicht angedockt. Einziger Schreiber von `terminalDocked` | muss geändert werden: Übergang angedockt → nicht angedockt ist hier ohne Lit-`changed`-Lookup bekannt (AK-01) |
| Offen/Zu des Terminals | `ui/frontend/src/app.ts:113` `isTerminalSidebarOpen` (`@state`, nicht persistiert — kein `localStorage`-Leser, `grep -n localStorage app.ts` zeigt nur Tab-Namen-Migration und aktives Projekt); Schreiber: `_toggleTerminalSidebar` :674, `_handleTerminalClose` :680, `_openSessionInTerminal` :293, `_syncDock` :352, Solo :1562, Workflow-Tab :1637 | wiederverwendbar [Certain]: Schließen = `false` setzen; RB-01 (kein neuer Zustand) erfüllt; Bindung an die Sidebar `.isOpen` :1738, `.docked` :1739 |
| Abgleich der Spalte | `ui/frontend/src/app.ts:348-393` `_syncDock(changed)` in `willUpdate` :813-830 — bei Wechsel von `pageSessionId`/`terminalDocked`: angedockt + Sitzung → armen + öffnen; sonst Merkstelle löschen. **Nicht** schließen | Falle [Certain]: der `else`-Zweig läuft auch bei `pageSessionId → null` auf angedockter Seite (Test :429 erwartet dort `isTerminalSidebarOpen === true`) — Schließen darf nicht an diesen Zweig, sondern nur an den Übergang `terminalDocked` true → false |
| Cmd+D | `ui/frontend/src/app.ts:674-677` `_toggleTerminalSidebar`: toggelt, armt auf angedockter Seite die Seiten-Sitzung; `:1575-1581` `_handleGlobalKeydown` — einziger globaler Kurzbefehl, Listener auf `document` :450 (bubble) | wiederverwendbar [Certain]: AK-04 läuft ohne Änderung (nach Schließen ist `terminalDocked` false → kein Armen, Sidebar schwebend); Cmd+← kommt als zweiter Fall in `_handleGlobalKeydown` |
| Gespeicherte Aufteilung | `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts:185-187` `effectiveLayoutMode` = `single` wenn `isDocked`, sonst `layoutMode` (Getter, reaktiv); `updated()` :2762 wendet Dock-Wechsel an; Tests `tests/unit/aos-cloud-terminal-docked.test.ts:296,320` | wiederverwendbar [Likely]: nach Schließen + Undock im selben Update zeigt das nächste Öffnen (Cmd+D, `docked=false`) die gespeicherte Aufteilung — keine Änderung an der Sidebar |
| Glocke bei geschlossenem Terminal | `ui/frontend/src/app.ts:418-424` `sichtbareSessionId` = aktiver Tab **nur bei offener** Sidebar; `buildBellRows(…, sichtbareSessionId)` (`components/terminal/agent-notifications.ts:201`) lässt alles andere läuten | wiederverwendbar [Certain]: AK-03/AN-03 ohne Änderung — nach dem Schließen ist `sichtbareSessionId` null |
| Zurück-Knopf | `ui/frontend/src/components/vorhaben/aos-vorhaben-seite.ts:413-415` dispatcht `vorhaben-back`; `views/aos-vorhaben-view.ts:363` → `go('vorhaben')` → `routerService.navigate(view, segments = [])` (`services/router.service.ts:49-60`, setzt `location.hash`) | wiederverwendbar [Certain]: Cmd+← ruft dieselbe Navigation; `app.ts` importiert `routerService` schon (:67). „Neue Absicht" hat keinen Zurück-Knopf (`aos-neue-absicht.ts` ohne `navigate`) — Cmd+← ist dort der erste Rückweg neben Kopfzeile/Glocke |
| Tastenregeln | `ui/frontend/src/utils/keyboard-shortcuts.ts` — reine Prädikate `isPaneZoomShortcut`, `isNotepadShortcut`, `isEditableTarget` (duck-typed, node-testbar); Tests `tests/unit/keyboard-shortcuts.test.ts` mit `combo()`-Helfer | wiederverwendbar [Certain]: zwei neue Prädikate daneben; `isEditableTarget` bleibt der Kern der Textfeld-Regel |
| Sidebar-Kurzbefehle | `aos-cloud-terminal-sidebar.ts:2155-2187` `_handleFullscreenKeydown` (document, bubble): Zoom-Taste ignoriert `isEditableTarget(e.target) && !this.contains(e.target)` | Falle [Certain] als Muster: `e.target` ist auf `document` bei Shadow-Roots der **Host**, nicht das Feld (Retargeting). Für AK-06 reicht `e.target` nicht (siehe nächste Zeile). Nebenbefund (nicht in Scope): Notizblock (`aos-notepad-panel.ts`, Shadow) wird von dieser Prüfung nicht erkannt |
| Textfelder der angedockten Seiten | Shadow-DOM-Komponenten (Lit-Standard, kein `createRenderRoot`): `aos-neue-absicht.ts:206` `<textarea>`, `aos-anmerkung-editor.ts:130` `<textarea>`, `aos-anmerkungen-sammel.ts` (1 Feld), `aos-notepad-panel.ts` (Shadow, 1 Feld), `aos-terminal-tabs.ts` (Shadow, Umbenennen-`<input>`). Light-DOM: `app.ts`, `aos-vorhaben-view.ts:113`, `aos-kopfzeile.ts:30` (kein Feld), `aos-cloud-terminal-sidebar.ts:227`. Keine dieser `keydown`-Behandlungen stoppt die Propagation (`aos-anmerkung-editor.ts:117-125`, `aos-neue-absicht.ts:169-174`, `aos-notepad-panel.ts:128-141` nur Escape/eigene Taste) | muss beachtet werden [Certain]: die Prüfung nimmt `e.composedPath()` (innerstes Ziel = `[0]`, offene Shadow-Roots), sonst verletzt Cmd+← AK-06 in jedem dieser Felder |
| xterm und Cmd+← | `@xterm/xterm@6.0.0` (Lock `ui/frontend/package-lock.json:1913`): `src/common/input/Keyboard.ts:113-117` — `case 37` (←) mit `metaKey` → `break`, `result.key` bleibt undefined; `src/browser/CoreBrowserTerminal.ts:1066-1068` — `if (!result.key) return true;` **vor** `triggerDataEvent` und ohne `cancel()` (:1321-1328 = `preventDefault` + `stopPropagation`). Custom-Key-Handler `components/aos-terminal.ts:455-497`, Muster „nie in die PTY" für Cmd+Shift+Enter :480-483 (`return false` → `_keyDown` kehrt in :1025-1027 zurück, **vor** jedem `cancel()`; der Rückgabewert eines `addEventListener`-Callbacks ist wirkungslos — Propagation läuft weiter) | belegt [Certain]: AN-01 stimmt — Cmd+← geht nicht in die Sitzung und erreicht `document` (AK-07/AK-08), auch mit der Sperre (E7). Wirt der Textarea: `aos-terminal` (Light, :1740) in `aos-terminal-session` (Shadow, `static styles` :66) → auf `document` ist `e.target` der Host, `composedPath()[0]` die Textarea |
| Terminal-Eingabefeld erkennen | `components/aos-terminal.ts:393` `this.terminal.open(this.terminalContainer)`; direkt danach liest :444 schon `this.terminal.textarea` (Paste-Listener) — `Terminal.textarea: HTMLTextAreaElement \| undefined` ist **öffentliche, typisierte** API („The textarea that accepts input for the terminal", `typings/xterm.d.ts:820-822`) und nach `open()` synchron gesetzt (`CoreBrowserTerminal.ts:441`). Die Klasse `xterm-helper-textarea` ist dagegen xterm-intern; der DOM-Ort (unter `aos-terminal`) ein Vertrag mit dem Baum, nicht mit xterm | Entscheidung nach Review E1 und G2 [Certain]: `aos-terminal` markiert die Textarea nach `open()` mit `data-terminal-input` (Konstante `TERMINAL_INPUT_ATTR` aus `keyboard-shortcuts.ts`); die Prüfung fragt `path[0]` nach genau diesem Attribut. Kein xterm-Name, keine Baum-Lage; ein künftiges zweites Feld in `aos-terminal` bliebe ein normales Textfeld |
| Handy | `views/aos-vorhaben-view.ts:152-159` — `vorhaben-page-session` wird nur bei `!breakpoint.isMobile` gesendet; `app.ts:192` `breakpoint = new MobileBreakpointController(this)` | wiederverwendbar [Certain]: Schließen **und** Cmd+← werden auf `!this.breakpoint.isMobile` beschränkt (NZ-05, auch Bluetooth-Tastatur am Handy — Review E6) |
| Router bei Doppeldruck | `services/router.service.ts:53-56` — `navigate()` kehrt zurück, wenn `location.hash` schon das Ziel ist; `location.hash = …` löst `hashchange` als eigene Task aus, Tasten-Repeats davor sehen noch `terminalDocked === true` | wiederverwendbar [Certain]: kein doppelter Verlaufseintrag bei Cmd+← zweimal (Review E10); Repeats zusätzlich per `e.repeat` verworfen (Review G12); auf der Übersicht greift der Handler ohnehin nicht (`terminalDocked` false) |
| Start-Zustand | `app.ts:122` `@state() private terminalDocked = false;`, `:113` `isTerminalSidebarOpen = false`; erste Route kommt aus `routerService.init()` :435 | belegt [Certain] (Review G4): beim Start auf einer Vorhaben-Seite ist `wasDocked` false → kein Schließen; Test AK-01 (Start-Fall) |
| Lit-Bündelung | Lit `ReactiveElement`: jede Zuweisung an ein `@state`-Feld ruft `requestUpdate()`, der Update-Zyklus läuft **einmal** als Microtask nach der synchronen Task; `changedProperties` enthält alle bis dahin gesetzten Felder mit ihren alten Werten, die Felder tragen die neuen. Die drei Zuweisungen des Routen-Handlers laufen synchron im `hashchange`-Listener | belegt [Certain] (Review G3): genau ein Render der App, genau ein `updated()` der Sidebar mit `isOpen=false` und `docked=false` zusammen — kein Zwischenzustand „schwebend offen", kein Flackern; Test AK-01 prüft die Flags zusätzlich synchron vor dem ersten `await` |
| Sidebar-`localStorage` | `aos-cloud-terminal-sidebar.ts:2327-2334, 2742` schreibt `cloud-terminal-layout-mode`, `-pane-sessions`, `-pane-projects`, `-split-ratios`, `-sidebar-width`; `app.ts:919, 1213` `cloud-terminal-session-names` (Migration), `specwright-active-project` | belegt [Certain] (Review G13): kein Schlüssel hält offen/zu — das Schließen muss nichts löschen; Nachweis `grep -rn "localStorage.setItem" ui/frontend/src --include=*.ts` |
| Test-Harness | `tests/unit/app-terminal-dock.test.ts` (happy-dom): mountet `aos-app` mit gemockten Services, Helfer `route(view, segments)`, `pageSession(id)`, `cmdD()`, `sidebarOf(el)`, `settle(el)`, Mock `navigate`, Schalter `mobile`, Interface `AppInternals`. Bestehende Fälle nach dem Verlassen: :313 erwartet `false` (war per Cmd+D zu), :393/:409/:531 prüfen nach `route('vorhaben', [])` nicht auf „offen" | wiederverwendbar [Certain]: alle AK-Tests außer AK-08 laufen in diesem Harness; kein bestehender Test bricht durch das Schließen [Likely — Schritt 0 prüft es] |
| Tests für xterm-Quelle | `Keyboard.ts` importiert `common/Types` (bare specifier, tsconfig-Pfade von xterm) — in Vitest ohne Alias nicht ladbar; `tests/unit/aos-terminal.test.ts` steht in `ui/tests/known-failures.txt` | nicht wiederverwendbar [Certain]: AK-08 wird per Quellen-Beleg + E2E nachgewiesen, nicht per Unit-Test auf xterm |
| E2E-Rezept | Memory `reference_cloud_terminal_e2e_playwright`: Branch-Backend Port 3111, Scratch-Projekt, `page.keyboard.press('Meta+d')` erreicht den App-Handler in Headless Chrome; `page.on('websocket')` liefert `framesent` | wiederverwendbar [Certain]: E2E-Pfad §8 mit `Meta+ArrowLeft`; AK-08 über „kein `cloud-terminal:input`-Frame gesendet" |
| Worktree | `../specwright-worktrees/INT-2026-015`, Branch `feat/INT-2026-015-zurueck-zur-uebersicht`, 1 Commit vor `origin/main` (7e9edcd), nicht dahinter; **ohne `node_modules`** | Schritt 1 in §6: `npm ci` in `ui/` **und** `ui/frontend/`, `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper` (Memory `project_ui_test_baseline_worktree`) |
| Docs | `docs/design.md:50` §5 beschreibt angedockt = ein Fenster, gespeicherte Aufteilung nur schwebend; `docs/architecture.md` §2 Frontend-Zeile, §10 Abweichung „Terminal-Layout in localStorage" | `design.md` §5 bekommt einen Satz + Protokollzeile; `architecture.md` unverändert (§3) |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

**Schließen (AK-01, AK-02, AK-03, AK-04, NZ-05, NZ-06, RB-01).** Im Routen-Handler `app.ts:205-211` den Übergang erkennen, bevor `terminalDocked` überschrieben wird:

```ts
private boundRouteChangeHandler = (route: ParsedRoute) => {
  this.currentRoute = route.view;
  const wasDocked = this.terminalDocked;
  this.terminalDocked = terminalDockedFor(route);
  // Routes without a docked column have no page session — also the ones
  // where the Vorhaben view is replaced and cannot announce (review #7).
  if (!this.terminalDocked) this.pageSessionId = null;
  // Leaving a docked page closes the terminal (INT-2026-015, AK-01): the target page is usable at
  // once. Only the window — sessions and tabs stay, a waiting one rings the bell (AK-03, NZ-06).
  // Docked → docked keeps it open on the new page's session (AK-02); the phone has no docked
  // column and keeps its overlay (NZ-05). Nothing is stored: open/closed stays browser state (RB-01).
  if (wasDocked && !this.terminalDocked && !this.breakpoint.isMobile) this.isTerminalSidebarOpen = false;
};
```

Reihenfolge (Review E9): erst die Routen-Zustände wie heute, das Schließen als letzte Zuweisung — wirft etwas davor, bleibt der heutige Zustand; das Schließen selbst kann nicht werfen.

Wirkung im selben Lit-Update [Certain] — alle drei Zuweisungen sind synchron im selben Handler, Lit bündelt sie in **einen** Update-Zyklus (`changed` enthält `terminalDocked`, `pageSessionId`, `isTerminalSidebarOpen`; die Felder tragen bereits die neuen Werte, `changed.get()` die alten): `willUpdate` :816 (Glocken-Eintrag löschen) verlangt `this.isTerminalSidebarOpen` → false → greift nicht, der Eintrag der verlassenen Sitzung bleibt (gewollt, AK-03); `_syncDock` :349 liest `this.terminalDocked` (neu: false) → `else`-Zweig → Merkstelle löschen, kein Armen, kein Öffnen (Review E2/E12 — Test AK-01 prüft nach `settle()` `isTerminalSidebarOpen === false` und `pendingDockSessionId === null`); die Sidebar bekommt `isOpen=false` und `docked=false` zusammen — `updated()` :2762 wendet den Dock-Wechsel an, :2766-2769 beendet ein Vollbild. Eine späte `vorhaben-page-session`-Meldung der View kann nichts öffnen (`_syncDock` verlangt `terminalDocked`; bestehender Test :500). Beim nächsten Cmd+D (`_toggleTerminalSidebar` :674) ist `terminalDocked` false → kein Armen, `effectiveLayoutMode` liefert die gespeicherte Aufteilung (AK-04). Initialroute (`routerService.init()` :435): `terminalDocked` startet false → `wasDocked` false → kein Schließen.

**Cmd+← (AK-05 … AK-09, NZ-03, RB-02).** Zwei reine Prädikate in `utils/keyboard-shortcuts.ts`:

```ts
/**
 * Cmd+← — back to the Vorhaben overview from the Vorhaben page and „Neue Absicht" (INT-2026-015,
 * AK-05). Cmd only (RB-02): Ctrl+← is the word jump in the terminal (NZ-03); Shift/Alt variants and
 * every other page stay with the browser (AK-09).
 */
export function isBackToOverviewShortcut(e: KeyComboLike): boolean {
  return e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'ArrowLeft';
}

/**
 * Marker `aos-terminal` puts on xterm's input textarea (`terminal.textarea`, public API) right
 * after `open()`, so a document-level shortcut can tell the terminal from other text fields
 * without knowing any xterm class name or DOM position (INT-2026-015, reviews E1/G2).
 */
export const TERMINAL_INPUT_ATTR = 'data-terminal-input';

/**
 * A key stays with the element the person types in: the event path starts in a form control or
 * contenteditable (AK-06) — unless that field is the terminal's input (`TERMINAL_INPUT_ATTR`),
 * where the terminal ignores Cmd+Arrow (AK-07/AK-08). Takes the whole `e.composedPath()`: a
 * listener on `document` sees only the shadow host of the Anmerkung/Absicht fields as `e.target`,
 * never the field. Empty path (event already dispatched, or a synthetic event on `document`) →
 * not typing.
 */
export function isTypingTarget(path: ReadonlyArray<unknown>): boolean {
  const target = path[0];
  if (!isEditableTarget(target)) return false;
  const el = target as { hasAttribute?(name: string): boolean };
  return el.hasAttribute?.(TERMINAL_INPUT_ATTR) !== true;
}
```

In `components/aos-terminal.ts` direkt nach `this.terminal.open(this.terminalContainer)` (:393), neben dem bestehenden Zugriff auf `this.terminal.textarea` (:444):

```ts
// Mark xterm's input textarea (public API, set synchronously by open()) so the app's Cmd+←
// handler can tell it from other text fields (INT-2026-015, AK-07): the terminal ignores
// Cmd+Arrow, the page may take the key. Our attribute, no xterm class name, no DOM position.
this.terminal.textarea?.setAttribute(TERMINAL_INPUT_ATTR, '');
```

In `app.ts:1575` `_handleGlobalKeydown` als zweiter Fall (Import aus `./utils/keyboard-shortcuts.js`):

```ts
// Cmd+← = „‹ Vorhaben" on the docked pages (INT-2026-015, AK-05) — the same two routes that dock
// the terminal (terminal-dock.ts; a page that docks without a back shortcut would split this
// predicate, reviews E5/G9); Mac only like the column itself (NZ-05); a held key counts once.
// Text fields keep the key (AK-06); the terminal's own textarea does not — xterm ignores
// Cmd+Arrow (AK-07/AK-08). Everywhere else the browser keeps it (AK-09).
if (isBackToOverviewShortcut(e)) {
  if (!this.terminalDocked || this.breakpoint.isMobile || e.repeat || isTypingTarget(e.composedPath())) return;
  e.preventDefault();
  routerService.navigate('vorhaben');
  return;
}
```

`preventDefault` auf `document` verhindert den Browser-Verlauf, weil Default-Aktionen erst nach dem Dispatch laufen [Certain]. `navigate('vorhaben')` ist bei bereits erreichtem Ziel ein No-op (`router.service.ts:53-56`; Review E10). Reihenfolge im Handler: Cmd+← vor Cmd+D oder danach ist gleichgültig (disjunkte Tasten). Auf nicht angedockten Routen mit fokussiertem schwebendem Terminal (Review E7/E13): xterm blockt per Custom-Key-Handler (`return false`, kein `cancel()`), das Ereignis erreicht den App-Handler, der wegen `!terminalDocked` ohne `preventDefault` zurückkehrt → Browser-Verlauf wie heute (AK-09).

**Sperre in xterm (AK-08, Sicherheitsgurt).** `components/aos-terminal.ts` im Custom-Key-Handler, direkt hinter dem `isPaneZoomShortcut`-Block :480-483:

```ts
// Cmd+← = back to the overview (app.ts, INT-2026-015 AK-08). Verified on @xterm/xterm 6.0.0:
// Keyboard.ts case 37 + metaKey → no key, _keyDown returns before triggerDataEvent and before
// cancel(). This keeps it out of the PTY should a later version map it. `false` ends xterm's
// _keyDown only — no preventDefault, no stopPropagation, the event still bubbles to the app's
// document listener (review G5: re-check both facts on every xterm major).
if (isBackToOverviewShortcut(event)) return false;
```

Kein `preventDefault` hier — das macht der App-Handler, und nur auf angedockten Routen (AK-09: auf der Übersicht mit fokussiertem schwebendem Terminal bleibt die Taste beim Browser).

**Docs.** `docs/design.md:50` §5 ein Satz: „Beim Verlassen einer angedockten Seite auf eine Seite ohne Spalte schließt das Terminal (Sitzung läuft weiter, Cmd+D öffnet schwebend); Cmd+← führt von der Vorhaben-Seite und von „Neue Absicht" zur Übersicht, außer der Cursor steht in einem Textfeld (INT-2026-015)." plus Protokollzeile.

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Schließen in `_syncDock()` über `changed.get('terminalDocked') === true` | Funktional gleich, aber `_syncDock` ist der Abgleich der **Tab-Wahl**; der Routen-Handler ist der einzige Schreiber von `terminalDocked` und kennt den Übergang direkt. Und der bestehende `else`-Zweig läuft auch bei `pageSessionId → null` (Test :429) — die Bedingung müsste dort ohnehin extra auf den Dock-Übergang eingegrenzt werden |
| Zustand vor dem Betreten merken und wiederherstellen (schwebend offen → nach Verlassen wieder schwebend) | NZ-01 schließt es aus; bräuchte eine Merkstelle mehr und eine Regel, wann sie verfällt (Cmd+D auf der Seite, Solo-Öffnen) |
| Cmd+← in `aos-vorhaben-view` statt in `app.ts` | Das angedockte Terminal ist ein Geschwister der View unter `app.ts`, kein Kind — ein Listener der View sähe Tastendrücke im Terminal nicht (AK-07). `app.ts` besitzt den globalen Kurzbefehl schon |
| `history.back()` statt `navigate('vorhaben')` | Der Verlauf führt nicht zwingend zur Übersicht (Deep-Link, Glocken-Sprung aus einem anderen Vorhaben); AK-05 verlangt „öffnet die Übersicht" |
| `e.target` prüfen wie die Sidebar (`isEditableTarget(e.target)`) | Auf `document` ist `e.target` bei Shadow-Roots der Host: die Anmerkungs-Textarea (`aos-anmerkung-editor`, Shadow) käme als `AOS-ANMERKUNG-EDITOR` an → nicht editierbar → Seite würde wechseln → AK-06 verletzt |
| Ctrl+← zusätzlich | NZ-03/RB-02: Wort-Sprung im Terminal |
| Unit-Test gegen xterms `evaluateKeyboardEvent` (AK-08) | `Keyboard.ts` importiert `common/Types` (bare specifier) — bräuchte Alias/Inline-Konfiguration in `vitest.config.ts` für eine einzige Prüfung; Quellen-Beleg + E2E-Frame-Prüfung + Sperre im Custom-Key-Handler reichen |
| Eigenes Routen-Prädikat `hatZurueckZurUebersicht(route)` statt `terminalDocked` | Heute dieselbe Menge (`terminalDockedFor`); ein zweites Prädikat wäre Duplikat. Sollten die Mengen je auseinanderlaufen, ist das der Moment dafür (Kommentar im Code nennt die Kopplung; Review E5 abgelehnt, siehe §12) |
| Terminal-Eingabefeld an xterms Klasse `xterm-helper-textarea` erkennen (erster Entwurf) | Review-Blocker E1: der Name ist xterm-intern; eine Umbenennung ließe Cmd+← im Terminal still tot laufen |
| Terminal-Eingabefeld daran erkennen, dass der `composedPath()` durch `aos-terminal` führt (zweiter Entwurf) | Review G2: Vertrag mit dem Komponentenbaum, nicht mit xterms API — ein künftiges zweites Feld unter `aos-terminal` würde mit übersprungen, eine außerhalb gerenderte Textarea nicht erkannt. Ersetzt durch die Markierung über `terminal.textarea` (öffentlich, typisiert), gesetzt von `aos-terminal` selbst |
| Plattform-Abfrage (`navigator.platform`), damit `metaKey` nur am Mac zählt | Review G8: auf Windows/Linux wäre `metaKey` die Win-/Super-Taste. Die UI läuft nur auf Michaels Mac (product-brief), `metaKey`-Kurzbefehle (Cmd+D, Cmd+Shift+F) sind heute schon ohne Plattform-Abfrage; eine Abfrage hier wäre ein Sonderfall ohne Nutzer. Teil 1 nennt die Einschränkung ehrlich |
| `role="textbox"`/Canvas/iframe als Textfeld erkennen | Review G11: keine solchen Widgets auf den angedockten Seiten (§2 Bestand: `<textarea>`, `<input>`, CodeMirror-`contenteditable`); `isEditableTarget` ist die bestehende gemeinsame Regel der Sidebar-Kurzbefehle — eine Sonderregel ohne Fall bleibt aus; Restrisiko in §9 |
| Cmd+← am Handy zulassen (Bluetooth-Tastatur) | NZ-05 „Handy: keine Änderung" und §2 der Absicht („Michael am Mac"); Gate `!isMobile` kostet eine Bedingung und hält die Zusage wörtlich (Review E6) |

#### Architektur-Auswirkung

<!-- leser: agent -->

<!-- PFLICHT-Antwort. Verschiebt der Plan eine Grenze aus architecture.md (Service-Verantwortung, Datenbesitz, erlaubte Abhängigkeit, AR-Regel)? -->

- **Nein** — bleibt innerhalb von `architecture.md` §2 (Frontend: Routen `vorhaben`/`neu`, angedockte Sidebar als Präsentation derselben Instanz) und §3 (kein neues Datenobjekt). AR-05: offen/zu bleibt flüchtiger Browser-Zustand wie heute, nichts wandert in `localStorage` oder ins Backend; die bekannte Abweichung §10 „Terminal-Layout in localStorage" bleibt unverändert und wird nicht erweitert. AR-06: Framework unberührt. Kein ADR (keine Datenhaltung, Lieferkette, Auth, MCP). `security.md` §6: kein Endpunkt, kein Datenobjekt, kein externes System, nichts Personenbezogenes, keine Datei im Lieferumfang (`ui/` steht nicht im Manifest) — keine Pflichtprüfung ausgelöst.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/frontend/src/utils/keyboard-shortcuts.ts` | ändern | `TERMINAL_INPUT_ATTR = 'data-terminal-input'`; `isBackToOverviewShortcut(e)` (Cmd, nicht Ctrl/Alt/Shift, `ArrowLeft`); `isTypingTarget(path)` = `isEditableTarget(path[0])` und `path[0]` trägt nicht `TERMINAL_INPUT_ATTR`; leerer Pfad → false | AK-05, AK-06, AK-07, RB-02, NZ-03 |
| 2 | `ui/frontend/src/app.ts` :205-211 | ändern | Routen-Handler: `wasDocked` merken, Routen-Zustände wie heute, zuletzt `isTerminalSidebarOpen = false` bei `wasDocked && !terminalDocked && !breakpoint.isMobile` | AK-01, AK-02, NZ-05, NZ-06, RB-01 |
| 3 | `ui/frontend/src/app.ts` :1575-1581 | ändern | `_handleGlobalKeydown`: Fall Cmd+← → `terminalDocked && !breakpoint.isMobile && !e.repeat && !isTypingTarget(e.composedPath())` → `preventDefault`, `routerService.navigate('vorhaben')`; Import der zwei Prädikate | AK-05 … AK-09, NZ-05 |
| 4 | `ui/frontend/src/components/aos-terminal.ts` :393 und :480-483 | ändern | nach `open()`: `this.terminal.textarea?.setAttribute(TERMINAL_INPUT_ATTR, '')`; Custom-Key-Handler: `if (isBackToOverviewShortcut(event)) return false;` (Import um Konstante + Prädikat erweitern) | AK-07, AK-08 |
| 5 | `ui/tests/unit/keyboard-shortcuts.test.ts` | ändern | `describe` je Prädikat: Cmd+← ja; Ctrl+←, Cmd+Shift+←, Cmd+Alt+←, Cmd+Ctrl+←, Cmd+→ nein; `isTypingTarget(path)`: `[TEXTAREA, …]`/`[INPUT]`/`[contenteditable]` ja; `[TEXTAREA mit hasAttribute(TERMINAL_INPUT_ATTR) → true, …]` nein; `[DIV]` nein; `[]` nein; `[null]` nein; `[TEXTAREA ohne hasAttribute-Methode]` ja | AK-05 … AK-08, RB-02 |
| 6 | `ui/tests/unit/app-terminal-dock.test.ts` | ändern | neuer `describe('app.ts — leaving a docked page closes the terminal, Cmd+← (INT-2026-015)')` mit den Fällen aus §8; `AppInternals` um `glockeRows` erweitern; **kein** zweites `customElements.define` (Review E11): Fixtures sind `div`-Hosts mit `attachShadow`, das Terminal-Feld eine `<textarea data-terminal-input>` | AK-01 … AK-07, AK-09, NZ-05, NZ-06 |
| 7 | `docs/design.md` §5 :50 + Änderungsprotokoll | ändern | ein Satz zum Schließen und zu Cmd+←; Protokollzeile 2026-09-17 | Doku |
| 8 | `intent/INT-2026-015-zurueck-zur-uebersicht/intent.md` | ändern | nach Freigabe `bezuege.plan: "plan.md"`; nach Merge `status: umgesetzt` | Workflow |

**Nicht betroffen (ausdrücklich):** Backend (`ui/src/server/`), WebSocket-Protokoll, Sitzungen/tmux (NZ-06); `aos-cloud-terminal-sidebar.ts` (Aufteilung, `effectiveLayoutMode`, `_handleFullscreenKeydown` — der Nebenbefund zum Notizblock bleibt offen); `_syncDock`/`willUpdate`; `terminal-dock.ts`; `aos-vorhaben-view.ts`, `aos-vorhaben-seite.ts` (Knopf bleibt), `aos-neue-absicht.ts`; `route.types.ts`/`router.service.ts`; Handy-Pfad (NZ-05); `docs/architecture.md`, `docs/security.md`; `specwright/manifest.tsv` (UI nicht im Lieferumfang); `ui/tests/known-failures.txt`.

### 5. Verbindungen

<!-- leser: agent -->

<!-- KRITISCH. Jede neue oder geänderte Verbindung zwischen Komponenten steht hier, mit prüfbarem Nachweis. Das ist der Schutz gegen „gebaut, aber nicht angeschlossen".
     Spalte „Teil": nur bei Zerlegung (Abschnitt 7), sonst „—". -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `app.ts` `_handleGlobalKeydown` | `utils/keyboard-shortcuts.ts` | Import | `import { isBackToOverviewShortcut, isTypingTarget } from './utils/keyboard-shortcuts.js'` | `grep -n "isBackToOverviewShortcut\|isTypingTarget" ui/frontend/src/app.ts` → Import + 2 Aufrufe | — |
| `app.ts` `_handleGlobalKeydown` | `services/router.service.ts` | Aufruf | `routerService.navigate('vorhaben')` | `grep -n "navigate('vorhaben')" ui/frontend/src/app.ts`; Test AK-05 (`navigate` mock `toHaveBeenCalledWith('vorhaben')`) | — |
| `app.ts` Routen-Handler | `aos-cloud-terminal-sidebar` `.isOpen` | Props (bestehend :1738) | `isTerminalSidebarOpen = false` beim Dock-Übergang | Test AK-01: `sidebarOf(el).isOpen === false` nach `route('vorhaben', [])` und `settle()`; `grep -n "wasDocked && !this.terminalDocked" ui/frontend/src/app.ts` | — |
| `app.ts` Routen-Handler + `_handleGlobalKeydown` | `MobileBreakpointController` | Feldzugriff (bestehend :192) | `this.breakpoint.isMobile` | Tests NZ-05 (Schließen, Cmd+←) mit `mobile = true`; `grep -n "breakpoint.isMobile" ui/frontend/src/app.ts` (≥ 4 Treffer, je einer im Routen-Handler und im Keydown) | — |
| `components/aos-terminal.ts` Custom-Key-Handler | `utils/keyboard-shortcuts.ts` | Import | `import { isPaneZoomShortcut, isBackToOverviewShortcut, TERMINAL_INPUT_ATTR } from '../utils/keyboard-shortcuts.js'` | `grep -n "isBackToOverviewShortcut" ui/frontend/src/components/aos-terminal.ts` → Import + 1 Aufruf | — |
| `components/aos-terminal.ts` nach `open()` | xterm `terminal.textarea` → `app.ts` Keydown (über das Attribut) | DOM-Attribut | `setAttribute(TERMINAL_INPUT_ATTR, '')` gesetzt in `aos-terminal`, gelesen in `isTypingTarget` | `grep -rn "TERMINAL_INPUT_ATTR" ui/frontend/src` → Definition + Setzer (`aos-terminal.ts`) + Leser (`keyboard-shortcuts.ts`); E2E-Schritt 4 (`document.querySelector('[data-terminal-input]')` im Deep-Walk ≠ null) | — |
| `tests/unit/keyboard-shortcuts.test.ts` | `utils/keyboard-shortcuts.ts` | Import | beide Prädikate | `grep -n "isBackToOverviewShortcut\|isTypingTarget" ui/tests/unit/keyboard-shortcuts.test.ts` | — |
| `tests/unit/app-terminal-dock.test.ts` | `app.ts` (gemountet) | DOM-Events | `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', metaKey: true, bubbles: true, cancelable: true, composed: true }))` | `grep -n "ArrowLeft" ui/tests/unit/app-terminal-dock.test.ts` | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung (keine neue Komponente; zwei neue Funktionen mit je zwei Konsumenten).
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

<!-- Schritte in Ausführungsreihenfolge. Jeder Schritt endet mit einem prüfbaren Zustand. Schritt 0 ist immer eine lesende Vorprüfung auf Konsumenten, die brechen könnten. -->

0. Lesende Vorprüfung (Review E3: am Bautag wiederholen, nicht aus dem Plan übernehmen): (a) `git fetch origin && git log --oneline HEAD..origin/main` — ist der Worktree hinter `main`, erst `git rebase origin/main`; (b) `git diff origin/main --stat -- ui/tests/unit/app-terminal-dock.test.ts ui/tests/unit/keyboard-shortcuts.test.ts ui/frontend/src/app.ts` muss leer sein (sonst Zeilenangaben dieses Plans gegen den Stand neu lesen); (c) Konsumenten von `isTerminalSidebarOpen`, die nach einem Routenwechsel „offen" erwarten — `grep -n "route('vorhaben', \[\])\|route('projekt'\|route('not-found'" ui/tests/unit/app-terminal-dock.test.ts` und jede folgende `isTerminalSidebarOpen`-Erwartung lesen (Stand Plan Mode: :313 erwartet `false`, :393/:409/:531 prüfen es nicht → kein Bruch [Likely]); `grep -rn "isTerminalSidebarOpen" ui/frontend/src --include=*.ts` auf weitere Leser; (d) Kontrollfall für happy-dom (Review G1): ein `keydown` mit `composed: true` aus einem `attachShadow`-Kind muss den `document`-Listener der App erreichen — die Tests AK-06 (Kontrollfall) und AK-07 sind als Positivfälle so gebaut, dass sie **rot** wären, wenn happy-dom den Pfad nicht durchreicht → prüfbar durch: Liste im Bauprotokoll, keine Erwartung „offen nach Verlassen", Worktree auf `origin/main`.
1. Worktree-Umgebung: `cd ui && npm ci && cd frontend && npm ci && cd .. && chmod +x node_modules/node-pty/prebuilds/*/spawn-helper`; Baseline `env -u SPECWRIGHT_CLOUD_SESSION_ID npx vitest run tests/unit/app-terminal-dock.test.ts tests/unit/aos-cloud-terminal-docked.test.ts tests/unit/keyboard-shortcuts.test.ts` → prüfbar durch: grün vor jeder Änderung.
2. `utils/keyboard-shortcuts.ts` + `keyboard-shortcuts.test.ts` (Test zuerst) → prüfbar durch `npx vitest run tests/unit/keyboard-shortcuts.test.ts` grün.
3. `app.ts` Routen-Handler (Änderung 2) + Tests AK-01, AK-02, AK-03, AK-04, NZ-05, NZ-06 → prüfbar durch `npx vitest run tests/unit/app-terminal-dock.test.ts` grün, bestehende Fälle unverändert grün.
4. `app.ts` Keydown (Änderung 3) + Tests AK-05, AK-06, AK-07, AK-09 → prüfbar durch denselben Lauf.
5. `aos-terminal.ts` Sperre (Änderung 4) → prüfbar durch `grep` aus §5 und `cd ui/frontend && npx tsc --noEmit`.
6. `docs/design.md` §5 + Protokoll → prüfbar durch Lesen; MacDown-Regeln (Leerzeile vor Liste/Tabelle).
7. Verbindungen nachweisen (Abschnitt 5) — alle sechs `grep`s im Bauprotokoll.
8. `bash scripts/verify.sh` grün (Ausgabe in die PR); E2E-Pfad (Abschnitt 8) gegen Branch-Backend 3111, Screenshot der Übersicht nach dem Verlassen; PR mit Verify-Ausgabe, Nachweisen und Screenshot; `intent.md` `bezuege.plan`.

### 7. Zerlegung

<!-- leser: agent -->

<!-- PFLICHT. Genau eine der beiden Varianten.
     Standard ist A. B nur mit Beweis: disjunkte Dateien, Schnittstelle VOR dem Start festgelegt, und eine Integrationsaufgabe in der Hauptsitzung. -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Vier Quelldateien, zwei Testdateien, ein Doc-Satz; beide Verhaltensänderungen greifen in dieselbe Datei (`app.ts`) und denselben Test-Harness — Zerlegung brächte zwei Worktrees für je 30 Minuten plus Integration. Geschätzt 2–3 h insgesamt.

#### Variante B — parallel in Worktrees

<!-- leser: agent -->

Entfällt.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01 | Vorhaben-Seite mit Sitzung (`pageSession('cloud-a2')`, Sidebar offen, angedockt) → `route('vorhaben', [])`: **synchron** (vor dem ersten `await`) `isTerminalSidebarOpen === false` und `terminalDocked === false` (eine Task, ein Update — Review G3); nach `settle(el)`: `sidebarOf(el).isOpen === false`, `sidebarOf(el).docked === false`, `pendingDockSessionId === null` (kein Wiederöffnen durch `_syncDock`, Review E2/E12); zusätzlich eine späte `pageSession('cloud-a2')` nach dem Verlassen + `settle` → bleibt zu; ebenso → `route('projekt', ['p'])`; von `route('neu', ['p'])` → `route('vorhaben', [])`. **Start-Fall** (Review G4): frisch gemountete App, erste Route ist die Vorhaben-Seite + `pageSession('cloud-a2')` → öffnet (kein falsches Schließen beim ersten Dispatch, `wasDocked` = Initialwert `false`) | `ui/tests/unit/app-terminal-dock.test.ts` | Unit (happy-dom, gemountete App) |
| AK-02 | Vorhaben-Seite → `route('vorhaben', ['p', 'INT-2026-004'])` + `pageSession('cloud-a1')`: bleibt offen, `activeTerminalSessionId === 'a1'`; Vorhaben-Seite → `route('neu', ['p'])`: bleibt offen | dito | Unit |
| AK-03 | nach AK-01 `terminalSessions` mit `a2.agentStatus = 'blocked'` setzen: `glockeRows` enthält `sessionId 'a2'` (`kind 'blocked'`); Gegenprobe vor dem Verlassen (Sidebar offen, a2 aktiv): nicht enthalten. Beleg, dass das Feld die Zeilen speist (Review G10): `glockeRows` :422-424 = `buildBellRows(this.agentNotifications, this.terminalSessions, this.sichtbareSessionId)`; `agent-notifications.ts:209-215` iteriert `sessions` und nimmt `s.agentStatus === 'blocked' && s.id !== sichtbareSessionId` — die Gegenprobe beweist den `sichtbareSessionId`-Zweig, der Positivfall den Status-Zweig | dito (Interface `AppInternals` um `glockeRows` erweitern) | Unit |
| AK-04 | nach AK-01 `cmdD()`: `isTerminalSidebarOpen === true`, `sidebarOf(el).docked === false`, `activeTerminalSessionId` unverändert (`'a2'`), `pendingDockSessionId === null`; Aufteilung schwebend = gespeicherte: bereits `aos-cloud-terminal-docked.test.ts:296,320` (Verweis, kein Duplikat) | dito | Unit |
| AK-05 | auf `route('vorhaben', ['p', 'INT-2026-003'])` und auf `route('neu', ['p'])`: `keydown` `ArrowLeft`+`metaKey` auf `document.body` → `navigate` mit `'vorhaben'` aufgerufen, `defaultPrevented === true` | dito | Unit |
| AK-06 | auf der Vorhaben-Seite: (a) `<input>` im Light-DOM von `document.body`, (b) `<textarea>` in einem offenen Shadow-Root eines `div`-Hosts (Retargeting wie `aos-anmerkung-editor`), (c) `<div contenteditable="true">` in einem Shadow-Root (wie CodeMirrors `.cm-content`, Review E8), (d) `<input>` in einem Shadow-Root eines zweiten Hosts (Tab-Umbenennen) — `keydown` `ArrowLeft`+`metaKey`, `bubbles`, `cancelable`, `composed: true` auf dem Feld → `navigate` **nicht** aufgerufen, `defaultPrevented === false`. **Kontrollfall** (Review G1, gegen ein vakuum-grünes Ergebnis): derselbe Shadow-Host aus (b) mit einem `<div>` statt der Textarea → `navigate('vorhaben')` aufgerufen — beweist, dass composed Keydowns aus dem Shadow-Root den App-Listener in happy-dom erreichen; fällt dieser Fall rot, ist happy-dom die Ursache und E2E-Schritt 5 der Nachweis, der Kontrollfall bleibt dann als `it.skip` mit Begründung | dito | Unit |
| AK-07 | `div`-Host + `attachShadow({ mode: 'open' })`, darin `<textarea data-terminal-input>` (die Markierung, die `aos-terminal` in Chrome setzt; kein zweites `customElements.define`, Review E11); auf `route('vorhaben', ['p','INT-2026-003'])`: `keydown` `ArrowLeft`+`metaKey`, `composed: true` auf der Textarea → `navigate('vorhaben')`, `defaultPrevented === true`; Gegenprobe dieselbe Textarea **ohne** Attribut → nicht abgefangen (beweist, dass das Attribut entscheidet) | dito | Unit |
| AK-08 | (1) Quellen-Beleg: `@xterm/xterm@6.0.0` `Keyboard.ts:113-117`, `CoreBrowserTerminal.ts:1066-1068` (im PR zitiert); (2) Sperre `grep -n "isBackToOverviewShortcut" ui/frontend/src/components/aos-terminal.ts`; (3) E2E: Terminal-Textarea per `[data-terminal-input]` (Deep-Walk) fokussieren — belegt zugleich, dass `aos-terminal` die Markierung in Chrome setzt —, `page.keyboard.press('Meta+ArrowLeft')`, `page.on('websocket')`/`framesent`: kein Frame `cloud-terminal:input` nach dem Druck (Vergleich: ein `page.keyboard.type('x')` davor erzeugt einen) | E2E-Skript im Scratchpad (`e2e-015.mjs`) | E2E (Playwright, Branch-Backend 3111) + Grep |
| AK-09 | `route('vorhaben', [])`, `route('projekt', ['p'])`, `route('not-found', [])`: Cmd+← auf `document.body` → `navigate` nicht aufgerufen, `defaultPrevented === false`; **und** auf `route('vorhaben', [])` mit offener schwebender Sidebar aus einer `<textarea data-terminal-input>` im Shadow-Root (Fixture wie AK-07, Review E13) → ebenfalls nicht abgefangen | `app-terminal-dock.test.ts` | Unit |
| Repeat (G12) | Vorhaben-Seite, `keydown` `ArrowLeft`+`metaKey` mit `repeat: true` → `navigate` nicht aufgerufen, `defaultPrevented === false`; danach ohne `repeat` → aufgerufen | dito | Unit |
| RB-02 / NZ-03 | `isBackToOverviewShortcut`: Cmd+← true; Ctrl+←, Cmd+Shift+←, Cmd+Alt+←, Cmd+→, Cmd+Ctrl+← false | `ui/tests/unit/keyboard-shortcuts.test.ts` | Unit |
| AK-06/07 (Regel) | `isTypingTarget(path)`: `[{tagName:'TEXTAREA'}, {tagName:'DIV'}]` true; `[{tagName:'INPUT'}]` true; `[{isContentEditable:true}]` true; `[{tagName:'TEXTAREA', hasAttribute:(n)=>n===TERMINAL_INPUT_ATTR}, …]` false; `[{tagName:'TEXTAREA', hasAttribute:()=>false}]` true; `[{tagName:'TEXTAREA'}]` (ohne Methode) true; `[{tagName:'DIV'}]` false; `[]` false (Review E4); `[null]` false | dito | Unit |
| NZ-05 | `mobile = true`: (a) Vorhaben-Seite, `isTerminalSidebarOpen = true` von Hand → `route('vorhaben', [])`: bleibt `true`; (b) Vorhaben-Seite, Cmd+← auf `document.body` → `navigate` nicht aufgerufen, `defaultPrevented === false` (Review E6) | `app-terminal-dock.test.ts` | Unit |
| NZ-06 | nach AK-01: `terminalSessions.length` unverändert, `gateway.send` nicht mit `type: 'cloud-terminal:close'` aufgerufen | dito | Unit |
| RB-01 | `grep -rn "localStorage" ui/frontend/src/app.ts ui/frontend/src/utils/keyboard-shortcuts.ts` — keine neue Zeile gegenüber `origin/main` (`git diff origin/main -- ui/frontend/src | grep -c localStorage` = 0) | — | Grep |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss grün sein, Ausgabe wird im PR zitiert. **CI ist die Wahrheit:** lokal grün zählt erst, wenn die PR-Checks grün sind. Bezugslisten bekannter roter Tests (Baselines) werden nie aufgrund eines lokalen Laufs gekürzt. Frischer Worktree: erst §6 Schritt 1, sonst 21× TS2307 + 6 Phantom-Testdateien (Umgebung, kein Code).
- **Datenkorrektur:** entfällt (keine Bestandsdaten).
- **Angeschlossen (E2E-Pfad):** Branch-Backend `PORT=3111` gegen Scratch-Projekt mit `INT-2026-001` (Rezept: Memory `reference_cloud_terminal_e2e_playwright` — Backend-Start, Scratch-Projekt per `workspace:open-project`, Session per `vorhaben:start-step` Haiku oder `cloud-terminal:create`, Deep-Walk-Helfer `window.__deep`; Vorgänger-Skripte `e2e-013.mjs`/`e2e-011.mjs` als Vorlage — das Rezept ist am Bautag zu verifizieren, nicht aus dem Plan zu übernehmen, Review E3): (1) `#/vorhaben/<pid>/INT-2026-001` öffnen → Spalte angedockt offen; (2) Fokus auf `body`, `Meta+ArrowLeft` → `location.hash === '#/vorhaben'`, `aos-cloud-terminal-sidebar` `.isOpen === false`, kein `.terminal-sidebar.open` (AK-01 + AK-05); (3) `Meta+d` → schwebend offen, gespeicherte Aufteilung (`localStorage['cloud-terminal-layout-mode']` = `split-2` vorher seeden → zwei Panes sichtbar) (AK-04); (3b) mit dem schwebenden Terminal auf der Übersicht die Terminal-Textarea (`[data-terminal-input]`, Deep-Walk) fokussieren, `Meta+ArrowLeft` → Hash unverändert (AK-09 × schwebend, Review E7/E13); (4) zurück auf die Seite, `[data-terminal-input]` fokussieren (Selektor ≠ null belegt die Markierung durch `aos-terminal`), `framesent` mitschneiden, `Meta+ArrowLeft` → Hash Übersicht, kein `cloud-terminal:input` (AK-07 + AK-08); (5) `#/neu/<pid>`, Textarea von `aos-neue-absicht` (Shadow) fokussieren, `Meta+ArrowLeft` → Hash unverändert (AK-06); (5b) auf der Vorhaben-Seite den Datei-Editor öffnen (Dateibaum-Knopf der Kopfzeile → eine Datei), Fokus in `.cm-content`, `Meta+ArrowLeft` → Hash unverändert (AK-06 × CodeMirror, Review E8; Selektoren am Bautag per Deep-Walk ermitteln); (6) `#/projekt/<pid>`, `Meta+ArrowLeft` → Hash unverändert (AK-09); (7) Screenshot 1440 px der Übersicht nach Schritt 2 (kein schwebendes Fenster) — es gibt keinen Mock, der Screenshot belegt den Zustand. Protokoll und Skript-Pfad im PR. Selektoren (`aos-cloud-terminal-sidebar`, `.terminal-sidebar.open`, `[data-terminal-input]`, `aos-neue-absicht textarea`, `.cm-content`) leben nur im Scratch-Skript, nicht im Repo; brechen sie durch DOM-Umbau, ist das Skript zu richten, kein Produktfehler (Review G14).
- **Bugfix:** entfällt (Verhaltensänderung, kein Defekt); Tests trotzdem vor dem Code (Schritt 2–4). Hook `protect-tests` aktiv.
- **UI:** kein neues Element, kein Mock; Nachweis per Screenshot (E2E Schritt 7) und `design.md` §5-Satz.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| Das Terminal war vor dem Betreten schwebend offen und ist nach dem Verlassen zu — Gewöhnung | mittel | niedrig | so gewollt (NZ-01); Cmd+D holt es mit der gespeicherten Aufteilung zurück (AK-04) | Michael, sofort |
| Cmd+← übersteuert „Verlauf zurück" auf den zwei Seiten | niedrig | niedrig | nur diese zwei Routen (AK-09); Cmd+[ bleibt; AN-02 nach einer Woche prüfen, sonst eigenes Vorhaben | Michael, im Gebrauch |
| Ein Textfeld, das die Prüfung nicht erkennt (weder Formularfeld noch contenteditable, z. B. ein Editor-Widget) → Cmd+← wechselt die Seite beim Tippen | niedrig | mittel | Regel über `isEditableTarget` (Feldtyp, nicht Liste) + `composedPath()`; Bestand durchgesehen (§2); der Datei-Editor (`components/file-editor/aos-file-editor.ts`, CodeMirror, als Panel auch auf angedockten Seiten öffenbar) tippt in `.cm-content` mit `contenteditable` → erkannt [Likely]; Unit-Fall AK-06 (c) und E2E-Schritt 5b prüfen es | Michael, beim Tippen; Rückweg eine Zeile |
| Ein Widget, dessen Tastendruck auf einem nicht editierbaren Kind landet (`role="textbox"` ohne contenteditable, Canvas, iframe) — heute keins auf den angedockten Seiten | niedrig | niedrig | `isEditableTarget` ist die bestehende gemeinsame Regel; beim ersten solchen Widget die Regel erweitern (Review G11) | Michael, beim Tippen |
| happy-dom bildet Shadow-Retargeting/`composedPath()` anders ab als Chrome → Unit-Test grün, Browser anders (oder vakuum-grün, weil der Listener nie läuft) | niedrig | mittel | Kontrollfall AK-06 und Positivfall AK-07 wären dann rot; E2E-Schritte 3b, 4, 5, 5b prüfen dieselben Fälle im echten Chrome (Review G1) | Bausitzung (E2E), sonst Michael |
| Künftige xterm-Version schickt Cmd+← als Sequenz an die PTY oder ändert `terminal.textarea` | niedrig | mittel | Sperre im Custom-Key-Handler (Änderung 4) mit Versionsvermerk im Kommentar (Review G5); Markierung über die typisierte öffentliche API — ein Wegfall bricht `tsc`, nicht still das Verhalten (Reviews E1/G2); Version im Lock gepinnt (6.0.0); E2E-Schritt 4 (`[data-terminal-input]` ≠ null, kein Frame) bei jedem xterm-Update | Michael (Zeichen im Prompt oder tote Taste im Terminal), `tsc` in `verify` |
| Ein drittes angedocktes Blatt ohne Zurück-Kurzbefehl müsste `terminalDocked` an zwei Stellen entkoppeln | niedrig | niedrig | beide Stellen tragen den Kommentar; Entkopplung = ein Prädikat in `terminal-dock.ts` + zwei Aufrufer (Reviews E5/G9) | Bausitzung des künftigen Vorhabens |
| Frischer Worktree: Verify rot aus Umgebungsgründen (fehlende `node_modules`, node-pty ohne Execute-Bit) | hoch | niedrig | §6 Schritt 1 vor jeder Änderung; bekannte Ursache (Memory) | Bausitzung |
| Bestehender Test erwartet „offen nach Verlassen" und bricht | niedrig | niedrig | §6 Schritt 0; im Plan Mode keiner gefunden (:313 erwartet `false`) | Bausitzung |
| Auto-Deploy der UI beim Merge nach `main` startet das Backend neu (laufende Terminals) | sicher | niedrig | Merge ist Michaels Schritt; Deploy-Gate wartet auf unbestätigte Antworten (architecture.md §5) | Michael, beim Merge |

### 10. Manuelle Schritte

<!-- leser: mensch -->

<!-- Alles, was ein Mensch tun muss: Secrets setzen, Flag schalten, Migration freigeben, Deploy autorisieren. Mit Zeitpunkt (vor Umsetzung / vor Merge / vor Deploy). Sonst „Keine."
     Jeder Schritt nennt den Weg belegt (Skript, Workflow-Datei, Befehl mit Pfad). `[Uncertain]` ist hier nicht freigabefähig: entweder im Code belegen oder „Weg klären“ als eigener Schritt mit Wer und Wann.
     Deploy-Schritte laufen nur mit Freigabe (Hook `production-gate`); Freigabe-Datei nach dem Deploy löschen. -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Plan freigeben (diese Datei, `Status: freigegeben`) | PO (Michael) | vor Umsetzung | [x] 2026-09-17 14:55 |
| PR mergen — löst den Auto-Deploy der UI auf dem Cloud-Host aus (Weg: `architecture.md` §5 „Cloud-Host … Auto-Deploy bei Push auf `main`", Deploy-Gate `GET /api/status/deploy-readiness`); kein `deploy`-Befehl aus der Bausitzung, Hook `production-gate` bleibt unberührt | Michael | nach grünem PR-Check | [ ] |
| AN-02 prüfen: fehlt „Verlauf zurück" auf den zwei Seiten? Wenn ja: neues Vorhaben | Michael | eine Woche nach Merge | [ ] |

Keine Secrets, keine Flags, keine Datenläufe, keine Umgebungsvariablen.

### 11. Schätzung

<!-- leser: mensch -->

2,5–3,5 h in einer Sitzung: Vorprüfung + Umgebung im Worktree 20 min · Prädikate + Tests 20 min · `app.ts` beide Änderungen + Unit-Tests (13 Fälle inkl. Shadow-Fixtures) 70 min · xterm-Sperre + Docs 15 min · Verify + E2E-Skript (9 Schritte) + Screenshot 60–75 min · PR 15 min. Unsicherheit: das E2E-Skript (Backend 3111, Scratch-Projekt, Session, Datei-Editor-Selektoren) — Rezept vorhanden, aber jede Sitzung hat bisher eine neue Falle gefunden; Puffer 30 min.

### 12. Review des Plans

<!-- leser: mensch -->

<!-- Vor der Freigabe. Self-Review oder externe Reviewer (Multi-LLM). Jeder Blocker adressiert, jedes Minority-Finding begründet angenommen oder abgelehnt.
     Jede Entscheidung nennt Finding und Gegenstand in einem Satz (R2), damit die Person aus dem Chat heraus widersprechen kann. -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| F1, `e.target` reicht für die Textfeld-Prüfung nicht: Anmerkung/Absicht liegen in Shadow-Roots, auf `document` kommt der Host an — Cmd+← würde beim Tippen die Seite wechseln (AK-06). | Self (Vollständigkeit) | angenommen: Prüfung auf `e.composedPath()[0]`; E2E-Schritt 5 prüft im echten Chrome | §3 Ansatz, §8 AK-06, §9 |
| F2, xterms Helfer-Textarea ist selbst ein Textfeld — mit der reinen `isEditableTarget`-Regel griffe Cmd+← im Terminal nie (AK-07). | Self (Konsistenz) | angenommen: `isTypingTarget` nimmt das Terminal aus — erster Entwurf über xterms Klasse (E1), zweiter über den Pfad durch `aos-terminal` (G2), endgültig über die Markierung `data-terminal-input` an `terminal.textarea` | §3, §4 #1, §8 |
| F3, Schließen im `else`-Zweig von `_syncDock` würde auch bei „Sitzung endet auf der Seite" schließen (Test :429 erwartet offen). | Self (Risiken) | angenommen: Schließen nur am Übergang `terminalDocked` true → false im Routen-Handler | §3 Ansatz, verworfene Alternative 1 |
| F4, Handy: `terminalDocked` ist am Handy aus der Route true, obwohl es keine Spalte gibt — das Schließen träfe das Overlay (NZ-05). | Self (Vollständigkeit) | angenommen: `!this.breakpoint.isMobile` als dritte Bedingung, symmetrisch zur View (`aos-vorhaben-view.ts:156`); Test NZ-05 | §3, §8 |
| F5, AK-08 hat keinen Unit-Test, weil xterms `Keyboard.ts` in Vitest nicht ladbar ist. | Self (Vollständigkeit) | angenommen mit Ersatz: Quellen-Beleg + Sperre im Custom-Key-Handler (grep) + E2E-Frame-Prüfung; kein Eingriff in `vitest.config.ts` für eine Prüfung | §8 AK-08, verworfene Alternative 6 |
| F6, `terminalDocked` als Gate für Cmd+← koppelt die Taste an das Andocken statt an „Seite mit Zurück-Knopf". | Self (Alternativen) | abgelehnt (Duplikat): beide Mengen sind heute identisch (`terminalDockedFor`); Kommentar im Code nennt die Kopplung, ein eigenes Prädikat entsteht erst bei Divergenz | verworfene Alternative 7 |
| F7, Die Zoom-Taste der Sidebar hat dieselbe Shadow-Lücke (Notizblock). | Self (Minimalinvasiv) | abgelehnt für diesen Plan: nicht in Scope (NZ-04 keine weiteren Kurzbefehle; kein AK); als Kandidat für eine Board-Karte im Abschlussbericht | §2 Zeile Sidebar-Kurzbefehle, „In einfachen Worten" |
| F8, Cmd+← bei offenem Projekt-Dialog mit Fokus auf `body` wechselt die Seite unter dem Dialog. | Self (Risiken) | abgelehnt (Randfall, harmlos): der Dialog ist App-Ebene und bleibt stehen; kein AK verlangt eine Sperre; bei Bedarf später `aos-project-add-modal` als Ausnahme | — |
| **Externe Runde** (3 von 4 Reviewern: opus, MiniMax-M3, grok-4.6; 2026-09-17, gegen den Entwurf vor E1–E13) | | | |
| E1 (Blocker, 3/3), Erkennung des Terminal-Eingabefelds hängt an xterms privater Klasse `xterm-helper-textarea` — Umbenennung ließe Cmd+← im Terminal still tot laufen. | Reviewer alle drei | angenommen: `isTypingTarget(path)` prüft den ganzen `composedPath()` auf unser eigenes Tag `AOS-TERMINAL` (der Wirt, in den `terminal.open()` rendert, öffentliche API; `aos-terminal.ts` hat kein anderes Feld) statt auf einen xterm-Namen; Klassenname kommt nur noch im E2E-Skript vor (Fokus setzen), nicht im Produktcode | §3 Ansatz + Alternativen, §2 neue Zeile, §4 #1, §8, §9 |
| E2 (2/3), Schließen und Dock-Wechsel im selben Lit-Update könnten `_syncDock` zum Wiederöffnen bringen oder einen Glocken-Eintrag stehen lassen. | MiniMax, grok | angenommen als Nachweis, kein Code: `_syncDock` liest die **neuen** Feldwerte (`this.terminalDocked` false → `else`-Zweig, `app.ts:349-356`), nur `changed.get()` liefert alte; der stehende Glocken-Eintrag ist gewollt (AK-03). Test AK-01 prüft nach `settle()` zu + Merkstelle leer + späte Seiten-Meldung öffnet nicht | §3 Ansatz, §8 AK-01 |
| E3 (2/3), Zeilenangaben und E2E-Rezept können bis zum Bautag driften; Vorprüfung per grep statt gegen `origin/main`. | MiniMax, grok | angenommen: §6 Schritt 0 beginnt mit `git fetch` + Rückstand prüfen + `git diff origin/main --stat` auf die drei Kerndateien; E2E-Rezept als Verweis auf Memory und Vorgänger-Skripte mit der Anweisung, es am Bautag zu verifizieren. Zeilenangaben bleiben Stand Plan Mode — der Bauende liest die Datei | §6 Schritt 0, §8 E2E |
| E4 (1/3), `composedPath()[0]` ohne Null-Prüfung. | opus | angenommen durch E1-Umbau: das Prädikat nimmt den Pfad, `path[0]` undefined → `isEditableTarget` false; Unit-Fall `[]` | §3, §8 Regel |
| E5 (1/3), Cmd+← an `terminalDocked` statt an „Seite mit Zurück-Knopf" gekoppelt. | MiniMax | abgelehnt (= F6): heute dieselbe Menge, ein zweites Prädikat wäre ein Duplikat; die Kopplung steht im Code-Kommentar; ein drittes angedocktes Blatt ohne Zurück wäre ein neues Vorhaben mit eigenem AK und bekäme dann das eigene Prädikat | — |
| E6 (1/3), Cmd+← nicht auf Handy gegated — Bluetooth-Tastatur widerspricht „am Handy ändert sich nichts". | grok | angenommen: `!this.breakpoint.isMobile` auch im Keydown; Test NZ-05 (b) | §3, §4 #3, §8 NZ-05 |
| E7 (1/3), Auf nicht angedockter Seite mit fokussiertem schwebendem Terminal könnte die Sperre das Ereignis schlucken (keine Navigation, kein Verlauf). | grok | abgelehnt als Sorge, angenommen als Test: `return false` im Custom-Key-Handler beendet nur xterms `_keyDown` (`CoreBrowserTerminal.ts:1025-1027`) **vor** `cancel()`; kein `preventDefault`, keine `stopPropagation`; der App-Handler kehrt bei `!terminalDocked` ohne `preventDefault` zurück → Browser-Verlauf. Unit AK-09 × schwebend + E2E 3b | §2 xterm-Zeile, §3, §8 AK-09, E2E 3b |
| E8 (1/3), CodeMirror-Fokus nicht Ende-zu-Ende geprüft. | opus | angenommen: Unit AK-06 (c) `contenteditable` im Shadow; E2E 5b Datei-Editor auf der Vorhaben-Seite | §8 |
| E9 (1/3), `isTerminalSidebarOpen` vor `terminalDocked` gesetzt — wirft Folgecode, bleibt der Zustand inkonsistent. | opus | angenommen: Zuweisung ans Ende, `wasDocked` lokal | §3 Ansatz, §4 #2 |
| E10 (1/3), `navigate('vorhaben')` bei Doppeldruck → doppelter Verlauf. | opus | abgelehnt: `router.service.ts:53-56` kehrt bei gleichem Hash zurück; auf der Übersicht greift der Handler ohnehin nicht (`terminalDocked` false) | §2 neue Zeile |
| E11 (1/3), zweites `customElements.define('aos-terminal-session')` im AK-07-Test wirft. | grok | angenommen: Fixture per `document.createElement` auf dem Stub des Harness + `attachShadow`; `aos-terminal` im Harness undefiniert (§6 Schritt 0 d prüft, sonst Mock) | §4 #6, §6, §8 AK-07 |
| E12 (1/3), keine Zusicherung, dass `_syncDock` nicht wieder öffnet. | grok | angenommen (= E2): Test nach `settle()` | §8 AK-01 |
| E13 (1/3), kein Unit-Test Cmd+← mit Fokus im Terminal auf nicht angedockter Route. | grok | angenommen: AK-09 zweiter Fall mit der AK-07-Fixture bei `route('vorhaben', [])` | §8 AK-09 |
| **Externe Runde 2** (3 Reviewer, 2026-09-17, gegen den Stand nach E1–E13; keine Blocker) | | | |
| G1 (2/3), `composedPath()` könnte im Unit-Test leer sein oder happy-dom reicht composed Keydowns nicht aus dem Shadow-Root durch — AK-06 wäre vakuum-grün. | opus, grok | angenommen: der App-Listener läuft synchron im Dispatch (kein Microtask dazwischen, `composedPath()` ist dort per Spec gefüllt); gegen Vakuum-Grün ein Kontrollfall in AK-06 (Shadow-Kind ohne Textfeld → `navigate` **muss** feuern) und AK-07 als Positivfall — beide wären rot, wenn happy-dom nicht durchreicht; E2E bleibt der Browser-Beweis | §6 Schritt 0 (d), §8 AK-06, §9 |
| G2 (2/3), Tag-Kopplung an `aos-terminal` ist ein Vertrag mit dem Baum, nicht mit xterms API; ein neues Feld unter `aos-terminal` würde mit übersprungen. | MiniMax, grok | angenommen: Mechanismus gewechselt — `aos-terminal` markiert `terminal.textarea` (öffentliche, typisierte xterm-API, direkt nach `open()`, :393/:444) mit `data-terminal-input`; `isTypingTarget` liest nur `path[0]` auf dieses Attribut. Kein Name, keine Lage; ein Wegfall der API bricht `tsc` statt still das Verhalten | §3 Ansatz + Alternativen, §2, §4 #1/#4, §5 neue Zeile, §8 |
| G3 (2/3), Bündelung der drei Zuweisungen in ein Lit-Update unbelegt; Dock-Flackern möglich. | MiniMax, grok | angenommen als Beleg + Test: Lit `requestUpdate` sammelt alle synchronen Zuweisungen einer Task in einen Microtask-Zyklus; Sidebar bekommt `isOpen=false` und `docked=false` im selben Render, kein Paint dazwischen. Test AK-01 prüft die Flags synchron vor dem ersten `await` und nach `settle()`. `<lit-virtual-scroll>` gibt es in der Sidebar nicht | §2 neue Zeile, §8 AK-01 |
| G4 (1/3), Startwert von `terminalDocked` unbenannt. | MiniMax | angenommen als Beleg + Test: `app.ts:122` `= false`; Start-Fall in AK-01. `??=` nicht nötig — das Feld hat einen Initialisierer | §2 neue Zeile, §8 AK-01 |
| G5 (1/3), xterm-Versionsannahme im Code dokumentieren. | opus | angenommen: Kommentar an der Sperre nennt 6.0.0, `Keyboard.ts case 37` und `_keyDown`-Rückkehr vor `cancel()` | §3 Sperre |
| G6 (1/3), `#/neu` hat keinen Zurück-Knopf und bekommt trotzdem Cmd+←. | grok | abgelehnt: so in der Absicht festgelegt — AK-05 nennt „Neue Absicht" ausdrücklich, Teil 1 sagt es. Cmd+← ist dort der erste Tastaturweg zurück | — |
| G7 (1/3), Fokus auf `body`/Baum/Knopf: Cmd+← verlässt die Seite ohne Klick auf „‹ Vorhaben". | grok | abgelehnt: das ist die Funktion — AK-05 „kein Textfeld hat den Fokus → Übersicht"; ein Kurzbefehl, der nur bei fokussiertem Knopf gälte, wäre keiner | — |
| G8 (1/3), `metaKey` ist auf Windows/Linux die Win-/Super-Taste — Teil 1 überzeichnet „nur Mac". | grok | abgelehnt als Code-Änderung, angenommen als Wortlaut: Ein-Nutzer-Mac-UI, die bestehenden `metaKey`-Kurzbefehle (Cmd+D, Cmd+Shift+F) haben ebenfalls keine Plattform-Abfrage; Teil 1 nennt die Einschränkung jetzt ehrlich | Teil 1, verworfene Alternativen |
| G9 (1/3), `terminalDocked` dient zwei Zwecken — Entkopplung später an zwei Stellen. | opus | abgelehnt als Änderung (= E5/F6), angenommen als Risiko-Zeile: beide Stellen kommentiert; Entkopplung wäre ein Prädikat + zwei Aufrufer | §3 Kommentar, §9 |
| G10 (1/3), AK-03-Test könnte grün sein, ohne dass `agentStatus` die Glocke speist. | grok | angenommen als Beleg: `glockeRows` :422-424 → `buildBellRows(…, this.terminalSessions, …)`, `agent-notifications.ts:209-215` liest `s.agentStatus === 'blocked'`; Positivfall + Gegenprobe im Test decken beide Zweige | §8 AK-03 |
| G11 (1/3), ARIA-Textboxen ohne contenteditable, Canvas, iframe fallen durch. | grok | abgelehnt als Änderung: keine solchen Widgets auf den angedockten Seiten (§2); `isEditableTarget` ist die gemeinsame Regel der bestehenden Kurzbefehle; Restrisiko in §9 | §9, verworfene Alternativen |
| G12 (1/3), kein `e.repeat`-Schutz. | grok | angenommen: `e.repeat` verwirft Wiederholungen (Router fängt Doppel-Navigation ohnehin ab, :53-56); Test „Repeat" | §3, §4 #3, §8 |
| G13 (1/3), „kein `localStorage`-Schalter für offen/zu" unbelegt. | MiniMax | angenommen als Beleg: alle `setItem`-Schlüssel der Sidebar und der App aufgelistet, keiner hält offen/zu; Nachweis-Befehl in §2 und RB-01 | §2 neue Zeile, §8 RB-01 |
| G14 (1/3), E2E-Selektoren sind fragil. | opus | angenommen als Hinweis: Selektoren leben im Scratch-Skript, nicht im Repo; Drift = Skript richten | §8 E2E |

**Minimalinvasiv geprüft:** wiederverwendet — `terminalDockedFor`/`terminalDocked` (Routen-Regel), `isTerminalSidebarOpen` (Schalter), `_toggleTerminalSidebar` + `effectiveLayoutMode` (AK-04 ohne Code), `sichtbareSessionId`/`buildBellRows` (AK-03 ohne Code), `routerService.navigate` (wie der Knopf), `isEditableTarget`, `_handleGlobalKeydown` (Ort des globalen Kurzbefehls), das Muster „nie in die PTY" aus `aos-terminal.ts:480`, der bestehende Zugriff auf `terminal.textarea` nach `open()` (`aos-terminal.ts:444`), der komplette Test-Harness `app-terminal-dock.test.ts` mit `route/pageSession/cmdD/sidebarOf/mobile`, der `combo()`-Helfer, das E2E-Rezept. Gestrichen — kein neues Event, keine neue Komponente, kein Routen-Prädikat, keine Merkstelle für den Zustand vor dem Betreten, keine Sidebar-Änderung, keine Vitest-Konfiguration, kein Backend. Feature-Preservation: AK-01–AK-09, NZ-01–NZ-06, RB-01/02 je einer Zeile in §3/§8 zugeordnet; INT-2026-013 AK-04 („Cmd+D öffnet auf dem Tab der Seite", „gespeicherte Aufteilung schwebend") bleibt durch die unveränderten Tests :447–:498 und `aos-cloud-terminal-docked` gültig.

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-09-17 (nach Einarbeitung E1–E13 und G1–G14): ohne Befund — die sechs Zusagen im Mensch-Teil (nur Cmd am Mac für Fenster **und** Taste, gehaltene Taste zählt einmal, Sitzung läuft weiter, Cmd+D mit gespeicherter Aufteilung, Textfeld behält die Taste, Terminal-Erkennung über eine eigene Markierung an der offiziellen Schnittstelle) haben je eine Zeile in §3 und §8 (R4).

### 13. Definition of Done

<!-- leser: agent -->

- [ ] Jede FA/AK aus Abschnitt 8 hat einen grünen Test (AK-08: Grep + E2E-Protokoll).
- [ ] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [ ] E2E-Pfad läuft (Abschnitt 8), Protokoll und Screenshot im PR.
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün (CI ist die Wahrheit).
- [ ] `docs/architecture.md` unverändert (Abschnitt 3 „Nein"); `docs/design.md` §5 angepasst.
- [ ] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [ ] Abweichungen von diesem Plan in Abschnitt 14 eingetragen.
- [ ] 2x-Regel-Check: Fehler, der zum zweiten Mal vorkam → Vorschlag für `CLAUDE.md` im PR (Kandidat: „Shadow-Root: auf `document` ist `e.target` der Host — `composedPath()[0]` nehmen", falls es in der Bausitzung ein zweites Mal beißt).
- [ ] Abschlussbericht nach R3 (nur Mensch-Abschnitte im Chat), endet mit dem Block „Für das Board" (Karte neu, Spalte, PR-Link, Stand, Verweis auf `intent/INT-2026-015-zurueck-zur-uebersicht/`; Kandidat F7 als eigene Karte); Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

<!-- Wird während der Umsetzung gepflegt. Der committete Plan muss am Ende zum Diff passen. Jede Zeile nennt Gegenstand und Grund in einem Satz (R2). -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| — | — | — | — |
