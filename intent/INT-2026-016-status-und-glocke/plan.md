# Plan: UI: Vorhaben-Status, Glocke und angedocktes Terminal stimmen wieder

> **Intent:** `intent.md` (INT-2026-016) · **Spec:** entfällt (bypass: vier Fehlerberichte aus dem Gebrauch, kein Datenmodell-Umbau)
> **Status:** in_umsetzung (PR 1 #73, PR 2 #74, PR 3 folgt)
> **Erstellt:** 2026-09-17 im Plan Mode · **Freigabe:** PO (Michael Sindlinger), 2026-09-17 (Plan Mode, Fassung 4)
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand 7124f3a), `CLAUDE.md`, `docs/design.md`, Spec INT-2026-004 (FA-02, FA-13), Spec INT-2026-010 (FA-04/05, §4/§5, AN-S01), Spec INT-2026-011 (FA-06, AK-09), Plan INT-2026-013
> **Review:** Self-Review + externes Multi-LLM-Review, zwei Runden (je 3 Reviewer; Runde 1: 3 Blocker + 17 weitere, Runde 2: 3 Likely + 17 Minority) — alle in §12 entschieden
> **Entscheidungen PO (17.09., Chat):** Sitzungszustand vor Phase · Auto-Zuordnung neuer Dock-Sitzung · Arbeitskopie-Fix · „der Tab ist da, er muss korrekt ausgewählt werden" → Klick im Dock

<!-- Der Plan ist TECHNISCH und die EINHEIT DER AUSFÜHRUNG. Eine Sitzung setzt ihn ganz um.
     Maßstab: Ein neues Teammitglied könnte allein anhand dieses Dokuments umsetzen.
     Jede Änderung verweist auf eine FA (spec.md) oder ein AK (intent.md). Keine Änderung ohne Herkunft.
     Zwei Leser: „In einfachen Worten" liest die Person, die freigibt; „Details" liest der Agent, der baut. Die erste Zeile unter jeder
     Überschrift sagt, für wen der Abschnitt ist (R1, specwright/workflows/meta/leser-und-rueckfragen.md). Marker übernehmen, keinen entfernen. -->

## In einfachen Worten

<!-- leser: mensch -->

### Worum geht es?

<!-- leser: mensch -->

Die Web-UI zeigt auf der Startseite alle Vorhaben (die Arbeitspakete, die als Ordner `intent/INT-…/` in den Projekten liegen). Jede Zeile hat zwei Angaben, die aus zwei verschiedenen Quellen kommen — und genau das ist der Kern des Problems:

1. **Die Phase** (der Chip „Absicht", „Spec", „Plan", „Bau", „PR", „Umgesetzt"): Sie kommt aus dem Dokument. In `intent.md` steht `status: umgesetzt`, in `plan.md` steht `Status: freigegeben` — daraus liest die UI, wo das Vorhaben im Ablauf steht. Das ist der Zustand der **Akte**.
2. **Der Sitzungszustand** (hinten in der Zeile: „ruht", „arbeitet · opus", „wartet auf dich · Spec · spec.md"): Er kommt vom Terminal. Jede Claude-Sitzung, die die UI gestartet hat, meldet über kleine Rückrufe („Hooks") an das Backend: „ich habe eine Eingabe bekommen und arbeite", „ich bin fertig und warte", „ich zeige gerade einen Dialog". Das ist der Zustand des **Mitarbeiters**, der gerade an der Akte sitzt.

Die Übersicht sortiert die Zeilen in drei Gruppen: „Wartet auf dich", „Läuft" und — eingeklappt — „Umgesetzt". Und hier liegt Fehler 1: Die Gruppe wird **zuerst** nach der Akte entschieden. Steht in `intent.md` „umgesetzt", landet die Zeile im eingeklappten Kasten, egal ob gerade jemand daran arbeitet oder auf dich wartet. Beim Kreis-Lippe-Vorhaben (Outlook-Add-in) ist genau das passiert: Die Akte sagt „umgesetzt", aber du hast beim Testen etwas gefunden, die Sitzung hat geantwortet und wartet — und die Zeile ist unsichtbar. Die ursprüngliche Spec (INT-2026-004, FA-02) hatte es andersherum gewollt: Wartende zuerst, Umgesetzte zuletzt.

Deine Frage „was ist der korrekte Status?" beantwortet dieser Plan so: **Beides stimmt gleichzeitig, und beides bleibt.** Die Akte ist umgesetzt (Phase „Umgesetzt" bleibt als Chip stehen). Der Mitarbeiter wartet (Sitzungszustand „wartet"). Nur die Frage, **in welcher Gruppe die Zeile steht**, darf nicht die Akte entscheiden, sondern der Mitarbeiter: Wer arbeitet, steht unter „Läuft". Wer wartet, steht unter „Wartet auf dich". Nur wer keinen Mitarbeiter hat (keine Sitzung, oder die Sitzung ist beendet), wird nach der Akte einsortiert — und dann eben unter „Umgesetzt". Startest du in der Sitzung neu (tippst etwas), springt die Zeile nach „Läuft"; stoppt die Sitzung mit einer Antwort, nach „Wartet auf dich"; schließt du die Sitzung, fällt sie zurück in „Umgesetzt". Du hast diese Regel im Chat bestätigt.

### Was ändert sich für dich?

<!-- leser: mensch -->

**Fehler 1 — Umgesetzt versteckt Wartende:** Ein umgesetztes Vorhaben, an dem eine Sitzung arbeitet oder wartet, steht oben bei „Läuft" oder „Wartet auf dich", mit dem Chip „Umgesetzt" daneben. Sobald die Sitzung geschlossen ist, wandert es in den eingeklappten Kasten. Nebenwirkung, die du kennen musst: Umgesetzte Vorhaben, deren Bau-Sitzung noch offen ist und nach dem Merge einfach stehen geblieben ist, tauchen ab jetzt ebenfalls unter „Wartet auf dich · wartet" auf (im Live-Stand betrifft das heute vermutlich zwei bis drei Zeilen). Das ist ehrlich — die Sitzung ist offen und wartet —, aber es heißt: Sitzungen schließen, wenn sie fertig sind, sonst bleibt die Zeile oben.

**Fehler 2 — Glocke schweigt:** Die Glocke in der Kopfzeile führt heute eine eigene, zweite Buchführung im Browser: Sie merkt sich, welche Sitzungen „fertig" gemeldet haben — aber nur, wenn der Browser die Meldung live mitbekommen hat und die Sitzung in dem Moment nicht sichtbar war. Nach einem Neuladen ist diese Liste leer, auf dem Handy war sie nie da. Die Vorhaben-Zeile dagegen fragt das Backend. Beide rechnen verschieden, und beim applai-Vorhaben lief es auseinander: Zeile „wartet auf dich", Glocke nichts.

Neu gibt es **nur noch eine Buchführung, im Backend**: Jede Claude-Sitzung trägt dort neben ihrem Zustand eine Marke „fertig gemeldet, noch nicht beantwortet". Die Marke entsteht, wenn die Sitzung stoppt, und verschwindet, sobald du in dieser Sitzung etwas eingibst oder sie schließt. Die Glocke zeigt genau zwei Sorten Einträge: Sitzungen, die einen Dialog zeigen („wartet"), und Sitzungen mit dieser Marke („fertig"). Beides kommt aus dem Backend, überlebt Neuladen und ist auf jedem Gerät gleich. Gehört die Sitzung zu einem Vorhaben, steht im Eintrag Kennung und Titel des Vorhabens und derselbe Zustand wie in der Zeile („wartet auf dich · Spec · spec.md"); sonst der Tab-Name. Die Browser-Merkliste wird gelöscht — es gibt keine zwei Quellen mehr, die sich widersprechen können.

Zwei Folgen: Ein „fertig"-Eintrag bleibt stehen, **bis du antwortest oder den Tab schließt** — nicht mehr nur, bis du einmal hingeschaut hast (das ist die Regel aus der Spec INT-2026-010: „wird beim Antworten abgeräumt"). Die Sitzung, die du gerade offen vor dir hast, wird weiterhin nicht gelistet. Und nach einem Neustart des Backends (Deploy) beginnt die Marke leer — sonst stünden nach jedem Deploy Dutzende alte, nie beantwortete Tabs als „fertig" in der Glocke. Dialoge („wartet") überleben den Neustart wie heute.

**Fehler 3 — Cmd+D zeigt ein fremdes Projekt, obwohl der Tab des Vorhabens da ist:** Zwei Dinge liegen hier übereinander.

Erstens weiß das Backend beim OpenAI-Vorhaben (INT-2026-012) **nicht**, welcher Tab dazugehört. Die Verbindung „Sitzung ↔ Vorhaben" entsteht heute nur auf zwei Wegen: du startest die Sitzung über den Knopf auf der Vorhaben-Seite, oder du tippst in einer von der UI gestarteten Sitzung einen Befehl mit voller Kennung (`/build INT-2026-012`). Für INT-2026-012 gibt es im gespeicherten Stand keine Verbindung — sehr wahrscheinlich, weil dieses Vorhaben bis zum 17.09. die Kennung INT-2026-011 trug; unter diesem Schlüssel steht heute die Sitzung des anderen Vorhabens „Terminal statt Gespräch", die die Umbenennung überschrieben hat. Die Seite sagt deshalb „keine Sitzung zu diesem Vorhaben", obwohl dein Tab offen ist. Ich konnte den Tab aus den Daten nicht identifizieren — keine der fünf specwright-Sitzungen trägt die Kennung im Namen, im Arbeitsverzeichnis oder auf dem Bildschirm.

Zweitens zeigt die angedockte Seitenleiste die Tabs des „aktiven Projekts" der UI — und das ist nicht das Projekt der Seite, wenn das Vorhaben keine Verbindung hat.

Neu, in zwei Teilen:

1. **Das angedockte Terminal zeigt die Tabs des Seiten-Projekts.** Auf einer Vorhaben-Seite von specwright zeigt Cmd+D die specwright-Tabs (den zuletzt benutzten vorne) oder den Leerzustand „Keine aktiven Sessions" — egal, welches Projekt die UI sonst gerade als aktiv führt. Welches Projekt „das der Seite" ist, steht in der Adresse (`#/vorhaben/<Projekt>/<Kennung>`, `#/neu/<Projekt>`); nennt die Adresse kein offenes Projekt, gilt wie heute das aktive. „Neue Session" dort landet immer im Projekt der Seite. Das aktive Projekt der UI wird dabei **nicht** umgeschaltet (das würde, weil es im Backend liegt, jedes offene Browserfenster und jedes Gerät mit umschalten — ein Reviewer hat zu Recht gewarnt); umgeschaltet wird wie bisher erst, wenn die Seite eine bekannte Sitzung hat und deren Tab nach vorn holt. Das Terminal öffnet sich weiterhin nicht von allein, wenn keine Verbindung bekannt ist (so steht es in der Spec von INT-2026-011).
2. **Du setzt die Verbindung mit einem Klick.** Bist du auf einer Vorhaben-Seite ohne bekannte Sitzung, sagt die Fußzeile der Seite: „keine Sitzung — Tab im Terminal anklicken oder Neue Session: gehört dann diesem Vorhaben". Klickst du im angedockten Terminal einen Claude-Tab an, gehört dieser Tab ab sofort dem Vorhaben. Das Backend bestätigt (oder lehnt ab, mit Grund), und du siehst die Antwort als Hinweis unten: „Sitzung ‚neue-ui' gehört jetzt zu INT-2026-012" — oder „Sitzung ‚neue-ui' gehört zu INT-2026-015", wenn der Tab schon einem anderen laufenden Vorhaben gehört; dann passiert nichts, kein stilles Verschieben durch einen Fehlklick. Nur dein Klick zählt: Wenn die UI selbst einen Tab nach vorn holt (Cmd+D zeigt den zuletzt benutzten), wird nichts zugeordnet. Gespeichert im Backend, gilt auf jedem Gerät; ab dann öffnet die Seite den Tab von selbst, die Zeile zeigt seinen Zustand, die Glocke nennt das Vorhaben. Für INT-2026-012 heißt das: einmal Cmd+D, einmal den richtigen Tab anklicken, fertig.

Eine automatische Herleitung („Sitzung liegt in einer Arbeitskopie, deren Name die Kennung trägt") stand in Fassung 3 und ist nach dem zweiten Review wieder raus: Sie hätte INT-2026-012 nicht geholfen (die Arbeitskopie ist weg), hätte im Normalfall nichts gebracht (wer in der Arbeitskopie `/build INT-…` tippt, ist ohnehin verbunden) und hätte Sitzungen still an Vorhaben gehängt, die dort nur nebenbei etwas tun. Der Klick ist ehrlicher.

**Zusatz (von dir bestätigt):** Drückst du auf einer Vorhaben-Seite „Neue Session" im angedockten Terminal, gehört die neue Claude-Sitzung ebenfalls **diesem Vorhaben** — derselbe Weg mit derselben Bestätigung. Die Zeile springt auf „arbeitet", sobald du tippst, ohne `/build INT-…`. Die Glocke klingelt für so eine frische Sitzung nicht, bevor sie einmal gearbeitet hat. Für reine Shell-Tabs gilt beides nicht (die melden keinen Zustand).

Zur Glocke noch eine Ergänzung aus dem zweiten Review: Die Marke „fertig, unbeantwortet" wird jetzt **doch** mit der Sitzung gespeichert und übersteht einen Neustart des Backends — sonst hätte die Glocke nach jedem Deploy genau die Sitzung vergessen, die kurz davor fertig wurde (der applai-Fall in neuem Gewand). Damit nach dem Neustart nicht Dutzende uralte Tabs als „fertig" auftauchen, werden nur Marken wiederhergestellt, die jünger als 24 Stunden sind. Und eine bewusste Ungleichheit, die ins Design-Dokument kommt: Der grüne Punkt am Tab verblasst nach 10 Minuten von selbst, der Glocken-Eintrag bleibt, bis du antwortest — der Punkt ist Dekoration, die Glocke ist die Meldung, die nicht verloren gehen darf.

**Fehler 4 — Plan-Dialog gilt als „arbeitet":** Beim compass-Vorhaben zeigt das Terminal den Dialog „Claude has written up a plan… Would you like to proceed?", die Zeile sagt aber „arbeitet". Ich habe den Fall im Live-System nachvollzogen: Die Sitzung hatte gestern Abend den Plan vorgelegt (da hat der Rückruf funktioniert), du hast heute 13:36 „Tell Claude what to change" mit Feedback gewählt, Claude hat den Plan nachgebessert — und den Dialog **erneut** gezeigt, diesmal ohne dass der Rückruf kam. Im Transkript gibt es für diesen zweiten Dialog keinen Werkzeug-Aufruf; Claude Code 2.1.274 zeigt ihn offenbar auf einem anderen Weg. Die Rückrufe sind also nicht lückenlos, und sie haben sich schon zweimal verändert (die frühere Box-Erkennung `PLAN_BOX_PATTERN` ist genauso gestorben).

Neu kommt ein **Sicherheitsgurt, unabhängig von den Rückrufen**: Wenn eine Sitzung laut Rückruf „arbeitet", aber das Terminal seit anderthalb Sekunden nichts mehr ausgibt, schaut das Backend einmal auf den Bildschirm der Sitzung (das kann es heute schon — dieselbe Prüfung, die vor dem Senden eines Freitexts läuft) und erkennt die bekannten Dialoge: Plan-Freigabe, Rückfrage, Berechtigung. Findet es einen, setzt es den Zustand auf „wartet · Plan-Entscheidung" (bzw. Rückfrage/Berechtigung) — so, als wäre der Rückruf gekommen. Verschwindet der Dialog wieder vom Bildschirm, ohne dass ein Rückruf kam (Claude arbeitet weiter), nimmt das Backend die Sperre zurück — ein Fehltreffer bleibt nicht kleben. Dazu gehört als erster Schritt ein Versuch am Test-Backend, der festhält, welche Rückrufe Claude Code 2.1.274 beim zweiten Dialog wirklich schickt; das Ergebnis landet im Plan (§14) und in der Gedächtnisnotiz zu den Plan-Dialogen. Der Sicherheitsgurt wird in jedem Fall gebaut — er hängt nicht davon ab, was der Versuch zeigt.

**Zwei Nebenbefunde aus denselben Screenshots werden mit erledigt:**

- Beim compass-Vorhaben zeigt die Zeile INT-2026-001 den Zustand einer Sitzung, die längst an INT-2026-002 arbeitet. Grund: Eine Sitzung, die per `/intent` zwei Absichten anlegt, wird dem **ersten** Ordner zugeordnet und bleibt dort kleben; das spätere `/specwright:plan INT-002` hat nicht gezählt, weil die UI nur die lange Form `INT-2026-002` erkennt. Neu: Wechselt eine Sitzung per Befehl oder per neu angelegtem Ordner zu einem anderen Vorhaben, verliert sie die alte Zuordnung (die alte Zeile zeigt dann „ruht" — technisch der Zustand „keine Sitzung", dessen Beschriftung „ruht" lautet); die Kurzform `INT-002` wird auf das passende Vorhaben des Projekts aufgelöst — ist sie nicht eindeutig (zwei Jahrgänge), passiert nichts, und du setzt die Verbindung per Klick (Teil 2 oben).
- INT-2026-012 zeigt „Arbeitskopie chore/INT-2026-015-abschluss" — ein falscher Zweig. Grund: Wenn ein Vorhaben in mehreren Kopien liegt (Haupt-Checkout und Arbeitskopien), gewinnt ohne Zuordnung die Kopie mit dem neuesten Datei-Datum; `git worktree add` stempelt aber alle Dateien neu, obwohl der Inhalt gleich ist. Neu: Bei inhaltsgleichen Kopien (alle vier Vorhaben-Dokumente byteweise gleich) gewinnt der Haupt-Checkout; nur bei abweichendem Inhalt das neueste Datum.

### Wie wird das gemacht?

<!-- leser: mensch -->

Sieben Bausteine, alle in der Web-UI (`ui/`), kein Framework-Anteil, keine neue Datenhaltung:

1. **Gruppenregel drehen** — eine Funktion (`groupOf`) prüft erst den Sitzungszustand, dann die Phase. Rund 5 Zeilen plus Tests.
2. **Glocke aus dem Backend** — das Backend führt je Sitzung die Marke „fertig, unbeantwortet" mit (gespeichert, nach Neustart nur, wenn jünger als 24 h); die Glocke baut ihre Liste aus den Sitzungen (Dialog oder Marke) und holt Titel und Zustand aus den Vorhaben-Zeilen. Die Browser-Merkliste und ihre Aufräum-Stellen fallen weg.
3. **Angedocktes Terminal folgt der Seite** — die Seitenleiste bekommt angedockt die Tabs des Seiten-Projekts (aus der Adresse); „Neue Session" dort nimmt das Seiten-Projekt.
4. **Sitzung dem Vorhaben zuordnen** — eine neue Nachricht `vorhaben:session.assign` mit Antwort (bestätigt oder Fehler mit Text) und zwei Auslösern: „Neue Session" auf der Vorhaben-Seite (nach dem Verbinden) und dein Klick auf einen Claude-Tab im angedockten Terminal einer Seite ohne Sitzung. Die Fußzeile der Seite sagt vorher, was der Klick tut.
5. **Zuordnung wandert mit** — ordnet ein getippter Befehl oder ein neuer Ordner eine Sitzung einem anderen Vorhaben zu, streicht das Backend ihre älteren Zuordnungen; Kurzformen wie `INT-002` werden aufgelöst, wenn eindeutig.
6. **Arbeitskopie nach Inhalt** — beim Einlesen bekommt jede Kopie einen Fingerabdruck ihrer Dokumente; gleicher Fingerabdruck → Haupt-Checkout gewinnt.
7. **Bildschirm-Probe bei Stille** — im Backend ein Timer je Claude-Sitzung, der nach 1,5 s Stille **einmal** den Bildschirm liest (nicht wiederholt, bis wieder etwas ausgegeben wird) und die bekannten Dialog-Muster prüft (die Muster gibt es schon in `dialog-driver.ts`; ob sie zur aktuellen Claude-Code-Version passen, wird im Versuch zu den Rückrufen mit echten Bildschirmen belegt); Treffer → „wartet" mit Dialogart; Dialog weg oder Taste gedrückt → Sperre weg. Die Rückrufe bleiben die erste Instanz; die Probe greift nur, wo sie schweigen, und ein Rückruf gewinnt immer gegen die Probe.

Ausgeliefert in drei PRs aus einer Bau-Sitzung (Worktree `../specwright-worktrees/INT-2026-016`): PR 1 Liste und Glocke (Bausteine 1–2), PR 2 Terminal und Zuordnung (3–6), PR 3 Bildschirm-Probe (7) samt dem Versuch zu den Rückrufen.

### Was kann schiefgehen?

<!-- leser: mensch -->

- **Zu viele Zeilen unter „Wartet auf dich"** — alte, nie geschlossene Sitzungen umgesetzter Vorhaben stehen plötzlich oben. Du merkst es sofort nach dem Deploy; Abhilfe: Sitzung schließen (Tab ×). Rückgängig: eine Zeile in `groupOf`.
- **Glocke zeigt „fertig" länger als gewohnt** — bis du antwortest oder den Tab schließt, nicht bis du hinschaust; auch nach einem Deploy (Marken jünger als 24 h). Gewollt (Spec INT-2026-010 §5), aber anders als heute.
- **Fehlklick im Dock ordnet einen Tab zu** — nur freie Claude-Tabs, nur auf Seiten ohne Sitzung, immer mit Bestätigung unten. Rückweg: in der richtigen Sitzung `/build INT-…` tippen oder den Tab schließen. Tabs, die schon einem laufenden Vorhaben gehören, werden per Klick nie verschoben.
- **Bildschirm-Probe irrt** — ein Text im Terminal, der wie ein Dialog aussieht („Do you want to proceed" am Zeilenanfang), setzt die Sitzung kurz auf „wartet"; sobald der Text vom Bildschirm ist oder der nächste Rückruf kommt, ist der Zustand wieder richtig. Kosten: eine Bildschirmabfrage je Ruhepause je Sitzung (Millisekunden).
- **Claude Code ändert die Rückrufe erneut** — genau dafür ist die Probe da; sie hängt nicht an Hooks.
- **CI-Flake** `vorhaben-service-stage4.test.ts` (Handoff 17.09.) kann PR-Läufe rot färben; Rerun, nicht Bezugsliste.

### Was musst du entscheiden?

<!-- leser: mensch -->

Nichts mehr — die drei Fragen (Gruppenregel, Auto-Zuordnung, Arbeitskopie) hast du im Chat beantwortet, die Rückfrage zu Fehler 3 ist eingearbeitet, das externe Review ist in §12 entschieden. Freigabe reicht.

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: agent -->

Vier gemeldete Fehler, sieben Bausteine, drei PRs aus einer Bausitzung. AK-Zuordnung: AK-01 → D1 · AK-02/03/04 → D2 · AK-05 → D3 · AK-06 → D4 · AK-07 → D10 · AK-08 → D5 · AK-09 → D6 · AK-10/11 → D7. Kein ADR, keine AR-Änderung, kein neuer Browser-Zustand. Eine Bildschirm-Probe im Backend wird zweite Statusquelle neben den Hooks (Präzedenz: Sendeprüfung INT-2026-007). Michael hat am 17.09. beim Gebrauch vier Fehler gemeldet; Ziel: Liste, Glocke und angedocktes Terminal erzählen dieselbe Geschichte, und die Sitzung, die auf Michael wartet, ist nie versteckt.

### 2. Ausgangslage im Code

<!-- leser: agent -->


- **F1** [Certain] `ui/frontend/src/components/vorhaben/vorhaben-sort.ts:26-30` `groupOf`: `if (row.phase === 'umgesetzt') return 'umgesetzt'` steht **vor** der `wartet*`-Prüfung. Spec INT-2026-004 FA-02 verlangt die umgekehrte Reihenfolge. Live: `kreis-lippe-audit::INT-2026-004` → Sitzung `cloud-1789616475460-3` (build, zugeordnet 11:29Z), `intent.md` `umgesetzt` → Kasten.
- **F2** [Certain] Glocke: `ui/frontend/src/components/terminal/agent-notifications.ts:201-237` `buildBellRows` kennt nur `agentStatus === 'blocked'` (live) und `AgentNotification` aus einem live empfangenen `stop` bei unsichtbarer Sitzung (`app.ts:790`). Die Zeile dagegen (`vorhaben-reader.ts:237-243`) nennt `done|idle|unknown` + Review-Doc „wartet auf dich". Kein Nachladen nach Reload (`agentNotifications` startet leer, `app.ts:172`); Spec INT-2026-010 §4 „nach Wiederverbindung nachgeladen" nicht umgesetzt. Live: `applai-nextjs::INT-2026-004` → `cloud-1789645444291-2`, `agentStatus: idle` seit 13:31Z (Stop ≈ 13:21Z, Decay 10 min), Zeile „wartet auf dich · Spec · spec.md", Glocke leer.
- **F3** [Certain] Dock: `app.ts:355-392` `_syncDock` tut bei `pageSessionId === null` nichts; `app.ts:715-719` `projectTerminalSessions` filtert nach `activeProjectId` (Workspace), nicht nach dem Projekt der Route; `_handleNewTerminalSession` (`app.ts:690-709`) erzeugt im aktiven Projekt. Test `ui/tests/unit/app-terminal-dock.test.ts:505` pinnt das Ist.
- **F4** [Certain] Zuordnung klebt: `vorhaben-state.ts:227-230` `setAssignment` überschreibt nur den Schlüssel `projectId::intentId`; kein `clear`. `vorhaben-service.ts:813-823` `onDirAdded` claimt für die pending `/intent`-Sitzung den **ersten** Ordner. Live: `compass::INT-2026-001 → cloud-1789550443886-1` (intent, 16.09. 09:44Z), kein Eintrag für INT-2026-002; Transkript `last-prompt: /specwright:plan INT-002`. Der Kommentar in `glocke-ziel.ts:10-12` („the backend marks the older assignment ended") beschreibt Soll, nicht Ist.
- **F5** [Certain] `vorhaben-service.ts:168` `V4_COMMAND_RE` verlangt `INT-\d{4}-\d{3}`; `INT-002` → Befehl ohne Id → für `plan` keine Zuordnung.
- **F6** [Certain] Plan-Dialog: `claude-hooks.ts:209-256` mappt `PreToolUse`/`PermissionRequest ExitPlanMode` → `blocked`/`plan` (Tests `claude-hooks.test.ts:302`). Live compass: `agentStatus: working` seit 11:36:24.900Z; Transkript `bf3077d2…`: ExitPlanMode-tool_use 16.09. 19:30Z (Zeile 287) → Ablehnung mit Feedback 17.09. 11:36:24.904Z (Zeile 295; Tastendruck → `user-input` → working) → Edits bis 11:37:51Z → Metadaten-Block (Sitzung pausiert) **ohne** neuen ExitPlanMode-tool_use; tmux-Screen zeigt jetzt den Dialog („1. Yes, and use auto mode"). [Likely] Claude Code 2.1.274 zeigt den Dialog nach Option-3-Feedback erneut ohne Werkzeug-Aufruf → kein Hook. Backend lief seit 13:15 durch (PID 67380), Hook-Token stimmt — kein Verlust auf dem Weg.
- **F7** [Certain] Arbeitskopie: `vorhaben-reader.ts:410-428` `mergeCandidates` nimmt ohne Zuordnung das neueste `lastChangedMs` (`:347-353` = max(Ordner-mtime, Doc-mtimes)); `git worktree add` (14:12) stempelt die identische Kopie in `specwright-worktrees/INT-2026-015/` neu → INT-2026-012 zeigt Branch `chore/INT-2026-015-abschluss`. Test `vorhaben-reader.test.ts:313` pinnt „else newest mtime".
- **F8** [Certain] Nebenbefund, **nicht** Teil des Plans: `unknown` (Sitzung ohne je gefeuerten Hook, z. B. Codex-CLI, frisch gestartete Sitzung) zählt in `deriveZustand` als „wartet auf dich"/„wartet". Bleibt in der Zeile; die Glocke (D2) listet `unknown` nie. Karte im Block „Für das Board".
- **F9** [Certain] Nebenbefund, nicht Teil des Plans: „vor 19 min" in der Zeile ist `lastChangedMs` (Dokument-mtime), nicht die Wartezeit der Sitzung (`aos-vorhaben-zeile.ts:197`). Die Glocke zeigt `agentStatusAt`/`agentDoneAt`; die Zeile bleibt wie spezifiziert (FA-13 „Zeitpunkt der letzten Änderung").
- **F10** [Certain] `specwright::INT-2026-012` hat **keinen** Eintrag in `assignments` (`vorhaben-3001.json`); `specwright::INT-2026-011 → cloud-1789507308644-2` (build 17.09. 05:00Z, ended) ist die Sitzung von „Terminal statt Gespräch". [Likely] Ursache: Umbenennung 011 → 012 am 17.09. (Board-Karte „Kennung umbenannt") — eine Zuordnung unter dem alten Schlüssel wurde vom echten 011-Bau überschrieben; `onDirAdded` kennt keine Umbenennung. Keine der 5 live specwright-Sitzungen (`cloud-1788936480805-2`, `…-5 ui`, `…-8`, `…-25 neue-ui`, `…-1 intent`) trägt die Kennung in Name, `effectiveCwd` oder tmux-Screen; Branch `feat/INT-2026-012-openai-modelle` hat keinen Worktree mehr. Michaels Tab ist aus den Daten nicht bestimmbar → die Verbindung muss von Hand setzbar sein (D10). Spec INT-2026-011 (FA-06) kennt für „Seite ohne Sitzung" nur „letzter Tab oder Leerzustand" — die Lücke „Tab existiert, Verbindung fehlt" war nicht spezifiziert.
- **F11** [Certain] `activeProjectId` ist Workspace-Zustand im Backend (AR-05, `workspace-<port>.json`), ein Wechsel wirkt auf jedes Browserfenster und Gerät. `_syncDock` (`app.ts:379-382`) und der Glocken-Sprung (`app.ts:813-814`) wechseln ihn heute, wenn eine Sitzung in einem anderen Projekt liegt.

### 3. Entwurf

<!-- leser: agent -->

- **D1** Gruppierung: Sitzungszustand vor Phase (Michael 17.09.). `groupOf`: `wartet*` → `wartet_auf_dich`; `arbeitet` → `laeuft`; sonst `phase === 'umgesetzt'` → `umgesetzt`; sonst `laeuft`. `keine_sitzung`, `sitzung_beendet`, `bau_unterbrochen` bleiben Phasen-gesteuert. Alternative (nur Dialoge und `arbeitet` heben heraus) verworfen: deckt den gemeldeten Fall („wartet") nicht ab.
- **D2** Glocke = **eine** Quelle, das Backend (Review Runde 1, Blocker 1). Backend: `ManagedCloudSession.agentDoneAt?: Date` — gesetzt in `applyAgentEvent` bei `stop`, gelöscht bei `prompt-submitted`, `user-input`, `blocked`, `session-start`, `stop-failure` und beim Schließen; **nicht** durch `idle-timeout` gelöscht (die Marke „fertig, unbeantwortet" überlebt den Decay des Tab-Punkts — Asymmetrie bewusst, `design.md` §4 nennt sie: der Punkt ist Dekoration, die Glocke die Meldung; Review 2 Nr. 3). **Persistiert** in der Registry (`toPersistedEntry`, Review 2 Nr. 1) und beim Restore nur übernommen, wenn jünger als `AGENT_DONE_MAX_AGE_MS = 24 h` — der applai-Fall (Stop kurz vor einem Deploy) überlebt, wochenalte Tabs fluten die Glocke nicht. Mitgeführt in `session.agent-event` (`doneAt`) und in `getSessionMetadata` (`agentDoneAt`). Frontend: `TerminalSession.agentDoneAt?: number`; `buildBellRows(sessions, rows, sichtbareSessionId)`: **gelistet ⇔ `agentStatus === 'blocked'` ∨ `agentDoneAt`**, ausgenommen `sichtbareSessionId`; `kind = blocked ? 'blocked' : 'done'`; `at = blocked ? agentStatusAt : agentDoneAt`; Sortierung blocked → done, je neueste zuerst. Schlüssel bleibt die **Frontend-Id** (`TerminalSession.id`), `terminalSessionId` für Sprung und Zeilen-Lookup (Review-Minority 9). Vorhaben-Zeilen (`vorhabenState.rows`) liefern **nur Beschriftung**: ist die Sitzung `row.session.id` einer Zeile mit `!ended` (bei mehreren die mit dem neuesten `lastChangedMs`, wie `glockeZiel`), dann `title = "INT-… · Titel"`, `label = ZUSTAND_LABELS[row.zustand]` (+ Step/Detail wie in der Zeile), `projectPath = row.projectId`; sonst Tab-Name und „wartet"/„fertig". `unknown` wird nie gelistet (keine Marke, nicht blocked) → F8 und Review-Minority 8 erledigt. `AgentNotification`, `upsertNotification`, `removeNotification`, `pruneNotifications` und ihre Aufrufer (`app.ts:391, :732, :824-826, :831-834, :790-797`) werden gelöscht; `ringsForAgentEvent` (Ton) bleibt ereignisbasiert. `VorhabenSessionRef` bekommt **kein** `statusAt` (Review-Minority 11) — die Glocke joint `terminalSessions`. Beide Quellen sind Backend-Snapshots (AR-05; Spec INT-010 §4 „nachgeladen" und §5 „beim Antworten abgeräumt" damit erfüllt). Verhaltensänderung: „fertig" bleibt bis zur Antwort, nicht bis zum Hinschauen (Spec §5; INT-010 review E2 wollte ohnehin „mit geschlossener Seitenleiste ist jede Sitzung gelistet").
- **D3** Angedocktes Terminal zeigt die Tabs des **Seiten-Projekts** (Review-Minority 4 angenommen, ersetzt „aktives Projekt folgt der Seite" aus Fassung 2). Auflösungsregel (Review 2 Nr. 4): `pageProject` = das offene Projekt (`openProjects`), dessen `id` gleich `safeDecode(segments[0])` ist — bei Route `vorhaben` mit ≥ 2 Segmenten und bei `neu` mit 1 Segment; sonst (`neu` ohne Segment, unbekanntes oder geschlossenes Projekt in der Adresse, alle anderen Routen) `undefined`. `pageIntentId = segments[1]`, wenn `INTENT_ID_RE` passt. `dockProjectPath = terminalDocked && pageProject ? pageProject.path : activeProject.path` — Adresse vor aktivem Projekt, aktives Projekt als Rückfall; `projectTerminalSessions` filtert nach `dockProjectPath`; `dockActiveSessionId` = `activeTerminalSessionId`, wenn dessen Tab im Seiten-Projekt liegt, sonst `lastActiveSessionByProject.get(pageProject.id)`, sonst der erste Tab, sonst Leerzustand; `_handleNewTerminalSession` nutzt angedockt `pageProject.path` (der `projectPath`-Override existiert schon für Split-Panes). **Kein** `switchToProject` ohne Sitzung (F11); mit Sitzung wechselt `_syncDock` wie heute. Kein Auto-Öffnen ohne Sitzung (Spec INT-011 FA-06/AK-09).
- **D4** Zuordnung per Nachricht (Michael 17.09.): `vorhaben:session.assign { projectId, intentId, sessionId, requestId }` mit **Antwort** `vorhaben:session-assigned { requestId, projectId, intentId, sessionId }` oder `vorhaben:error { requestId, code }` (Review-Blocker 2; Muster `start-step` → `step-started`, Frontend `vorhabenService.request()` mit 15-s-Timeout, `vorhaben.service.ts:214-217`). Backend prüft in dieser Reihenfolge, vollständige Fehlerliste (Review 2 Nr. 7): Felder/`INTENT_ID_RE`/`CLOUD_SESSION_ID_RE` (`INVALID_MESSAGE`), Projekt offen (`UNKNOWN_PROJECT`), Zeile vorhanden (`UNKNOWN_VORHABEN`), Sitzung im Manager und nicht `closed` (`SESSION_NOT_ACTIVE`), `terminalType === 'claude-code'` (`SESSION_NOT_CLAUDE`), `session.projectPath === project.path` (`SESSION_NOT_IN_PROJECT`), Zeile ohne lebende Sitzung (`ROW_HAS_SESSION`), Sitzung keiner anderen Zeile mit `!ended` zugeordnet (`SESSION_ASSIGNED_ELSEWHERE`). Die Fehlernachricht trägt wie heute `code` **und** `message`; für `SESSION_ASSIGNED_ELSEWHERE` baut das Backend die Nachricht mit Namen und Kennung („Sitzung ‚neue-ui' gehört zu INT-2026-015"), das Frontend zeigt `message` als Toast — keine Schema-Erweiterung nötig (Review 2 Nr. 17). Erfolg: `store.setAssignment(step = stepOfPhase(phase) ?? 'build', model, cwd = effectiveCwd, at)` + `scheduleRescan(0)`; `assignSession` und `runScan` laufen im selben Event-Loop-Tick-Modell des Service, der Rescan liest den Store danach — keine Sperre nötig (Review 2 Nr. 18). Frontend: Erfolg → Toast „Sitzung ‚<Name>' gehört jetzt zu <Kennung>"; Fehler/Timeout → Toast mit `message`, kein Retry (der Nutzer klickt erneut; die Zeile zeigt den Ist-Stand). Auslöser 1: „Neue Session" auf angedockter Vorhaben-Seite → Merkstelle `assignOnConnect` (Frontend-Tab-Id → {projectId, intentId}), gesendet in `_handleTerminalSessionConnected` bei `claude-code`; Merkstelle geräumt bei Antwort, Tab-Schließen und Routenwechsel. Kein Rennen mit dem Projektwechsel: die Sitzung wird per `pageProject.path` erzeugt (D3), nicht per `activeProjectId`.
- **D5** Zuordnung wandert bei Befehl und Ordner: `store.moveAssignment(sessionId, projectId, intentId, a)` löscht alle anderen Schlüssel mit `a.sessionId === sessionId` und setzt den neuen (ein `commit`). Verwendet von `onPromptText` (getippter Befehl mit Kennung) **und** `onDirAdded` (Claim) — beide sind „die Sitzung ist zu einem anderen Vorhaben gewechselt" (Review-Minority 12: Reihenfolge egal, jeder Weg ist ein Verschieben, der letzte gewinnt). `/intent` ohne Kennung setzt pending und löscht die Zuordnungen der Sitzung ebenfalls (sie beginnt etwas Neues). D4/D10 verschieben **nie** (`SESSION_ASSIGNED_ELSEWHERE`). Löschen statt `ended`, damit die alte Zeile den Zustand `keine_sitzung` bekommt — dessen Beschriftung ist „ruht" (`ZUSTAND_LABELS`, `vorhaben-sort.ts:75`); Teil 1 und §4 meinen dasselbe (Review 2 Nr. 8). Kurz-Id: `V4_COMMAND_RE = /^\s*\/(?:specwright:)?(intent|spec|plan|build)(?:\s+(INT-\d{4}-\d{3}|INT-\d{3}))?\b/` — **lange Form zuerst** in der Alternation, beide mit `\b`, Test `/plan INT-2026-002` → `INT-2026-002` (Review 2 Nr. 13); `resolveIntentId(projectId, short)` gegen die Zeilen des letzten Scans: genau ein Treffer → verwenden; keiner oder mehrere (zwei Jahrgänge) → keine Zuordnung, `console.warn('[vorhaben] Kurz-Kennung mehrdeutig …')`, Nutzer setzt per D10 (Review-Minority 5). `/intent` ohne Kennung, Ordner entsteht nie (Sitzung wird vorher geschlossen): `onSessionClosed` räumt pending und Protokoll wie heute; die Sitzung ist dann ohne Zuordnung — harmlos, Test ergänzt (Review 2 Nr. 16).
- **D6** Arbeitskopie: Fingerabdruck je Kopie = SHA-256 (`crypto.createHash('sha256')`, Review 2 Nr. 9) über den **Rohtext** der vier Dokumente aus `VORHABEN_DOC_ORDER` (`intent`, `spec`, `plan`, `build-stand`), berechnet **vor** dem Parsen im Cache-Callback (also unabhängig vom Parse-Erfolg, Review-Minority 18), fehlende Datei = Marker `-`. `ScanCopy.main: boolean`. `mergeCandidates`: Zuordnung > gleicher Fingerabdruck → `main` > neuestes `lastChangedMs`. FA-06 bleibt für Bauten, die Dokumente ändern (build-stand.md, plan.md §14); Restfall: unzugeordneter Bau in generisch benannter Arbeitskopie, der **nur** Code ändert → Dokumente gleich → Zeile trägt den Zweig des Haupt-Checkouts (Phase/Zustand identisch, nur das Arbeitskopie-Etikett) — hingenommen, AN-07 (Review-Minority 7). 1-Doc → 3-Doc: entsteht `spec.md` in der Arbeitskopie, weicht ihr Fingerabdruck ab und ihr `lastChangedMs` ist neuer → sie gewinnt; bleibt sie unberührt, ist der Inhalt gleich und `main` gewinnt zu Recht (Review-Minority 13).
- **D7** Dialog-Probe im Backend, unabhängig vom Hook-Ergebnis (Review-Minority 17): `session.dialogProbeTimer` je `claude-code`-Sitzung, gestellt im `terminal.data`-Handler (`cloud-terminal-manager.ts:1459-1482`, nach `lastActivity` `:1474`) bei `agentStatus === 'working'` oder `blockedBy === 'probe'`; nach `DIALOG_PROBE_QUIET_MS = 1500` ohne neue Ausgabe: `readScreen` (nur `live: true`) → `findDialogCue` (`dialog-driver.ts:36-45`). Treffer bei `working` → `applyAgentEvent(session, 'blocked', { blockKind: cueToBlockKind(kind), reason: cue.line })`, `session.blockedBy = 'probe'`. Kein Treffer bei `blockedBy === 'probe'` → `applyAgentEvent(session, 'unblocked')` (Selbstheilung, Review-Minority 6); Hook-Blocks (`blockedBy === 'hook'`) fasst die Probe nie an. **Vorrang** (Review 2 Nr. 19): Hooks sind die erste Instanz — jedes Hook-Ereignis läuft durch den normalen Reducer und setzt bei `blocked` `blockedBy = 'hook'`, überschreibt also einen Probe-Block; die Probe handelt nur bei `working` (setzt Probe-Block) oder bei eigenem Probe-Block (hebt ihn auf), nie bei Hook-Block, `done`, `idle`, `error`, `unknown`. Tastendruck im Dialog (Enter, Ziffer, Esc) geht wie heute über `sendInput` → `user-input` → `working` und löscht damit auch einen Probe-Block; eine Plan-Option (1/2) löst zusätzlich `PostToolUse ExitPlanMode` → `unblocked` aus, falls der Hook kommt (Review 2 Nr. 6). `blockedBy` wird **mit** `blockKind` in der Registry persistiert und beim Restore übernommen (Review 2 Nr. 12). Lebenszyklus (Review-Blocker 3): Timer gelöscht in `applyAgentEvent` bei jedem Statuswechsel, in `closeSession`/`terminal.exit`/`dispose`; `probeInFlight`-Flag gegen Überlappung; `readScreen`-Fehler → keine Änderung; `session.closing` → keine Probe. **Last** (Review 2 Nr. 5): genau eine Probe je Ruhephase — nach dem Timer wird nicht erneut gestellt, bis neue Ausgabe kommt; eine ruhende Sitzung kostet also eine `capture-pane` (einstellige Millisekunden) je Ruhephase, nicht je 1,5 s; N gleichzeitig ruhende Sitzungen kosten N Aufrufe einmalig. Zusätzlich ein globaler Serialisierer (eine Probe zur Zeit, Warteschlange), damit ein Backend mit 50 Sitzungen nie 50 parallele tmux-Aufrufe startet. Die E2E (e) zählt die Proben im Log als Beleg. Restore (tmux-Sitzungen werden aus der Registry wiederhergestellt, `startRestore` `:346`): für wiederhergestellte `working`-Sitzungen einmal armen — die Probe liest den **aktuellen** Bildschirm, ein veralteter `working` mit Dialog wird so gerade korrigiert, ohne Dialog bleibt er wie heute. WebSocket-Abbruch/Browser-Absturz sind irrelevant: die Probe lebt im Backend, nicht im Client. Abbildung `plan→plan`, `rueckfrage→rueckfrage`, `berechtigung→berechtigung`, `trust→unbekannt`. **Cue-Belege** (Review 2 Nr. 11): Schritt 0 speichert die tmux-Screens der drei Dialoge (Plan, Berechtigung, AskUserQuestion) unter Claude Code 2.1.274 als Fixtures in `ui/tests/fixtures/dialog-screens/` und `findDialogCue` bekommt je Fixture einen Test; der Plan-Cue („Claude has written up a plan … Would you like to proceed?") ist heute auf dem compass-Screen belegt, die anderen zwei werden belegt oder die Muster angepasst, bevor PR 3 baut. Mit ADR-0004 vereinbar: Bildschirm, nicht Transkript — ADR-0004 wird **nicht** geändert; `architecture.md` §2 erhält den Satz, dass die Hook-Route die erste und die Bildschirm-Probe die zweite Statusquelle ist (Präzedenz: Sendeprüfung INT-2026-007). `PLAN_BOX_PATTERN`/`detectPlanBox` bleiben unberührt (eigene Karte).
- **D8** Kein ADR (weder Datenhaltung, Lieferkette, Auth noch MCP-Start). `architecture.md` §2 Backend-Zeile um Marke und Probe, §2 Frontend-Zeile um „Glocke aus dem Backend-Stand", `design.md` §4 Glocke-Muster und §5 Seiten-Projekt im Dock — in derselben PR wie der Code.
- **D9** — **gestrichen in Fassung 4** (Review 2 Nr. 2, zwei Reviewer): die Herleitung aus dem Worktree-Namen hilft INT-2026-012 nicht (Worktree weg), bringt im Normalfall nichts (wer `/build INT-…` in einer UI-Sitzung tippt, ist verbunden) und hängt Sitzungen ohne Beleg und ohne Sichtbarkeit an Vorhaben. Damit entfallen R7, AN-06, Review-Minority 14 und 18 aus Runde 2 sowie `vorhaben-service-stage5.test.ts` und E2E (c3).
- **D10** Explizite Wahl (F10, Auslöser 2 für `session.assign`): **Nutzer-Klick** auf einen Tab im **angedockten** Terminal einer Vorhaben-Seite, deren Zeile keine lebende Sitzung hat, Tab `terminalType === 'claude-code'`, nicht am Handy → `session.assign` mit Antwort-Toast (D4). „Nutzer-Klick" heißt: das Tab-Ereignis trägt `userInitiated: true` (gesetzt nur im Klick-Handler von `aos-terminal-tabs`); programmatische Tab-Wahl (Cmd+D holt den letzten Tab nach vorn, `_syncDock`, List-Response, Projektwechsel) setzt `activeTerminalSessionId` direkt oder ohne das Flag und ordnet **nie** zu (Review 2 Nr. 10). Affordanz (Review 2 Nr. 20): die Fußzeile von `aos-vorhaben-seite` (heute „keine Sitzung zu diesem Vorhaben", `:1209`-Bereich) sagt angedockt ohne Sitzung „keine Sitzung — Tab im Terminal anklicken oder Neue Session: gehört dann diesem Vorhaben"; mit Sitzung zeigt sie wie heute deren Namen, und der Tab steht angedockt allein vorne (ein Fenster, INT-2026-013). Verschieben bleibt dem getippten Befehl vorbehalten (D5). Alternative (Klick verschiebt mit Bestätigungsdialog) verworfen: ein Dialog je Tab-Wechsel wäre lästig; `/build INT-…` tippen ist der bestehende Weg.

### 4. Änderungen

<!-- leser: agent -->

**PR 1 — Liste und Glocke (D1, D2)**

| Datei | Änderung |
|---|---|
| `ui/frontend/src/components/vorhaben/vorhaben-sort.ts` | `groupOf` nach D1; Hilfsfunktion `isWaitingZustand(z)` (ersetzt die Kette `:28`); Kopfkommentar |
| `ui/src/server/services/cloud-terminal-manager.ts` | `ManagedCloudSession.agentDoneAt?: Date`; `applyAgentEvent` (`:401-443`) setzt/löscht nach D2; `getSessionMetadata` (`:2056-2083`) liefert `agentDoneAt`; `session.agent-event`-Detail um `doneAt`; `toPersistedEntry` (`:1737-1739`) und Restore (`:1863-1868`) mit `agentDoneAt`, Restore nur wenn jünger als `AGENT_DONE_MAX_AGE_MS` |
| `ui/src/server/websocket.ts` | `cloud-terminal:agent-event` (`:2121-2140`) trägt `doneAt`; `cloud-terminal:list` (`:2770-2793`) unverändert (Metadata) |
| `ui/src/shared/types/cloud-terminal.protocol.ts` | `agentDoneAt?: string` in Session-Metadata und Agent-Event; `CLOUD_TERMINAL_CONFIG.AGENT_DONE_MAX_AGE_MS = 24 h` |
| `ui/frontend/src/types/terminal*.ts` (TerminalSession) | `agentDoneAt?: number` |
| `ui/frontend/src/components/terminal/agent-notifications.ts` | `AgentNotification` + `upsert/remove/prune` **löschen**; `BellRow` um `title?`, `label?`, `projectPath?`; `buildBellRows(sessions, rows, sichtbareSessionId)` nach D2; `ringsForAgentEvent` bleibt |
| `ui/frontend/src/app.ts` | `agentNotifications` und alle Aufrufer weg (`:171-172, :391, :732, :790-797, :824-826, :831-834`); `_handleCloudTerminalAgentEvent` (`:757-802`) übernimmt `doneAt`; `handleCloudTerminalListResponse`/`toRestoredTab` übernehmen `agentDoneAt`; `glockeRows` (`:429-431`) → `buildBellRows(this.terminalSessions, this.vorhabenState?.rows ?? [], this.sichtbareSessionId)` |
| `ui/frontend/src/components/terminal/session-naming.ts` | `toRestoredTab` (`:109-115`) um `agentDoneAt` |
| `ui/frontend/src/components/rahmen/aos-glocke.ts` | `renderRow` (`:96-118`): `row.title ?? session.name`, Chip `row.label ?? ('wartet'/'fertig')`, Projekt-Badge `row.projectPath ?? session.projectPath` |
| `ui/frontend/src/components/rahmen/glocke-ziel.ts` | Kommentar `:10-12` korrigieren (Ist: Zuordnung wird verschoben/gelöscht, D5 in PR 2); Logik unverändert |
| `docs/design.md`, `docs/architecture.md` | §4 Glocke-Muster („Backend-Marke fertig/unbeantwortet, Dialoge; Vorhaben-Titel und -Zustand; bleibt bis zur Antwort, auch über einen Neustart (24 h); der Tab-Punkt verblasst nach 10 min, die Glocke nicht"); §2 Backend-Zeile Marke, Frontend-Zeile Glocke; Protokollzeilen |

**PR 2 — Terminal und Zuordnung (D3, D4, D5, D6, D10)**

| Datei | Änderung |
|---|---|
| `ui/src/shared/types/vorhaben.protocol.ts` | `VorhabenSessionAssignMessage`, `VorhabenSessionAssignedMessage`, Fehlercodes `SESSION_NOT_CLAUDE`, `SESSION_NOT_IN_PROJECT`, `ROW_HAS_SESSION`, `SESSION_ASSIGNED_ELSEWHERE` |
| `ui/src/server/services/vorhaben-state.ts` | `moveAssignment(sessionId, projectId, intentId, a)`; `clearAssignmentsOfSession(sessionId)` (für `/intent` ohne Kennung) |
| `ui/src/server/services/vorhaben-service.ts` | `assignSession(projectId, intentId, sessionId)` (D4-Prüfungen, `setAssignment`, `scheduleRescan(0)`); `onPromptText` (`:784-810`): `resolveIntentId`, `moveAssignment`, `/intent` ohne Id → `clearAssignmentsOfSession` + pending; `onDirAdded` (`:813-823`): `moveAssignment`; `V4_COMMAND_RE` (`:168`) um `INT-\d{3}` (lange Form zuerst); Fehlertexte mit Name/Kennung für `SESSION_ASSIGNED_ELSEWHERE` |
| `ui/src/server/services/vorhaben-handler.ts` | `case 'vorhaben:session.assign'` nach dem Muster `start-step` (`:197-227`); `CLOUD_SESSION_ID_RE` aus `claude-hooks.ts:161` |
| `ui/src/server/services/vorhaben-reader.ts` | `ScanCopy.main`; `readCandidate` (`:336-396`) berechnet `fingerprint` vor dem Parsen (Cache-Eintrag `{ head, hash }`, `VorhabenParseCache.get` `:304`); `mergeCandidates` (`:410-428`) nach D6 |
| `ui/frontend/src/services/vorhaben.service.ts` | `assignSession(projectId, intentId, sessionId): Promise<…>` über `request()` (`:214-217`) |
| `ui/frontend/src/app.ts` | `pageProjectId`/`pageIntentId` aus der Route (`boundRouteChangeHandler` `:205-218`); `dockProjectPath`, `projectTerminalSessions` (`:715-719`) und `dockActiveSessionId` nach D3; `_handleNewTerminalSession` (`:690-709`) angedockt mit `pageProject.path` + Merkstelle `assignOnConnect`; `_handleTerminalSessionConnected` (`:899`) sendet `assignSession`, Toast; `_handleTerminalSessionSelect` (`:728`) nach D10 nur bei `userInitiated`; Merkstelle räumen bei Antwort, Tab-Schließen (`:890`), Routenwechsel |
| `ui/frontend/src/components/terminal/aos-terminal-tabs.ts` | Klick-Handler setzt `userInitiated: true` im `session-select`-Detail |
| `ui/frontend/src/components/vorhaben/aos-vorhaben-seite.ts` | Fußzeile: Hinweistext angedockt ohne Sitzung (D10) |
| `docs/design.md`, `docs/architecture.md` | §5: „Angedockt zeigt die Spalte die Tabs des Seiten-Projekts; ohne Sitzung öffnet Cmd+D dessen letzten Tab oder den Leerzustand; ein dort gestarteter oder angeklickter Claude-Tab gehört dem Vorhaben; das aktive Projekt der UI wechselt erst mit einer bekannten Sitzung"; §3 Nutzerzustand: Zuordnung wandert mit der Sitzung, Klick im Dock ordnet zu; Protokollzeilen |

**PR 3 — Dialog-Probe (D7)**

| Datei | Änderung |
|---|---|
| `ui/src/server/services/cloud-terminal-manager.ts` | `ManagedCloudSession.dialogProbeTimer`, `blockedBy?: 'hook' \| 'probe'` (persistiert neben `blockKind`), `probeInFlight`; globaler Proben-Serialisierer; `armDialogProbe`/`probeDialog`; Aufrufe im `terminal.data`-Handler (`:1459-1482`), in `applyAgentEvent`, `closeSession`, `terminal.exit`, `dispose`, nach `startRestore` (`:346`) |
| `ui/src/server/services/dialog-driver.ts` | `cueToBlockKind(kind: DialogCueKind): BlockKind`; Muster ggf. an die Fixtures aus Schritt 0 angepasst |
| `ui/tests/fixtures/dialog-screens/*.txt` | tmux-Screens der drei Dialoge unter Claude Code 2.1.274 (Schritt 0) |
| `ui/src/shared/types/cloud-terminal.protocol.ts` | `CLOUD_TERMINAL_CONFIG.DIALOG_PROBE_QUIET_MS = 1500` |
| `docs/architecture.md` | §2 Backend-Zeile: „… Hook-Route (Status, Blockart, Kontext) als erste Statusquelle **plus Bildschirm-Probe bei Stille als zweite, selbstheilend; ein Hook-Ereignis gewinnt immer (INT-2026-016)**"; kein ADR-Wechsel; Protokollzeile |
| Memory `reference_claude_plan_dialog_hooks.md` | Ergebnis von Schritt 0 (welche Hooks 2.1.274 beim zweiten Dialog schickt) |

### 5. Verbindungen

<!-- leser: agent -->

- Liste ↔ Glocke: Sitzung mit Marke oder Dialog erscheint in der Glocke mit dem Zustand der Zeile; Antwort in der Sitzung räumt beides (E2E: Zähler der Glocke = wartende Zeilen minus sichtbare Sitzung, solange jede wartende Zeile eine Marke oder einen Dialog hat).
- Glocke → Sprung: `glockeZiel` mit Backend-Id (unverändert) landet auf der Vorhaben-Seite → `_syncDock` öffnet den Tab.
- Route → Seiten-Projekt → Dock-Tabs → „Neue Session" → `cloud-terminal:create` im Seiten-Projekt → `session-connected` → `session.assign` → `session-assigned` → Toast → `vorhaben:state` mit Zeile `arbeitet` nach erster Eingabe. Tab-Klick (`userInitiated`) → derselbe Weg ab `session.assign`.
- Hook `UserPromptSubmit` `/plan INT-002` → `resolveIntentId` → `moveAssignment` → alte Zeile `keine_sitzung`, neue Zeile trägt die Sitzung.
- PR 3: Stille → Probe → `applyAgentEvent` → `session.agent-event` → `vorhaben-service.onAgentEvent` → Rescan → Zeile `wartet_plan` → Glocke „wartet · Plan-Entscheidung"; Dialog weg → `unblocked` → Zeile `arbeitet`.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. **Probe der Rückrufe und Cue-Belege (vor PR 3, Ergebnis unabhängig vom Bau):** Branch-Backend auf 3111 mit Scratch-Projekt (Rezept `reference_cloud_terminal_e2e_playwright.md`), Claude-Sitzung, Plan Mode, `ExitPlanMode` → Dialog → Option 3 mit Text → zweiter Dialog; dazu ein Berechtigungs-Dialog (Bash außerhalb der Allowlist, ohne bypass) und eine `AskUserQuestion`. Hook-Eingänge an der Route mitschreiben (temporär `console.info` in `cloud-terminal.routes.ts`, nicht committen); die drei tmux-Screens als Fixtures sichern und `findDialogCue` dagegen laufen lassen — Muster anpassen, falls nötig. Ergebnis in `plan.md` §14 und Memory. Erwartung [Likely]: erster Dialog `PreToolUse`+`PermissionRequest`, zweiter Dialog keiner. D7 wird in jedem Fall gebaut (Review-Minority 17).
1. Worktree `../specwright-worktrees/INT-2026-016`, `npm ci` in `ui/` **und** `ui/frontend/`, `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper`.
2. `intent/INT-2026-016-status-und-glocke/intent.md` (Kern, Bypass) + `plan.md` aus diesem Plan (Vorlage `specwright/templates/sdlc/plan.md`) committen, bevor Code entsteht.
3. PR 1 Tests-zuerst: D1 → D2 Backend (Marke) → D2 Frontend (Builder, Glocke, Abbau der Merkliste) → Docs. `bash scripts/verify.sh --fast` je Baustein, voll am Ende. E2E (a) Zeile umgesetzt + wartende Sitzung sichtbar; (b) Stop einer Vorhaben-Sitzung → Glocke nennt das Vorhaben; Reload → noch da; Antwort → weg. Screenshots `intent/INT-2026-016-…/design/ist/`. PR öffnen, CI abwarten.
4. PR 2 Tests-zuerst: D5/F5 → D6 → D4 Backend + Handler → D3 → D4/D10 Frontend → Docs. E2E (c) Vorhaben ohne Sitzung in Projekt B bei aktivem Projekt A → Cmd+D → Tabs von B / Leerzustand, aktives Projekt bleibt A, **keine** Zuordnung durch Cmd+D allein; „Neue Session" → entsteht in B, Toast, Zeile `arbeitet` nach Eingabe; (c2) bestehender Claude-Tab von B angeklickt → Toast, Zeile trägt den Tab, Reload → Seite öffnet den Tab von selbst; (d) `/plan INT-002` in der Sitzung von 001 → 001 „ruht", 002 trägt die Sitzung. PR öffnen, CI.
5. PR 3: Schritt 0, dann D7 Tests-zuerst, E2E (e) Plan-Dialog nach Option 3 → Zeile `wartet · Plan-Entscheidung` binnen 3 s, Glocke klingelt, Proben-Zähler im Log = 1 je Ruhephase; (f) Berechtigungs-Dialog; (g) Dialog beantwortet → `arbeitet`; (h) Backend-Neustart mit offenem Probe-Block → Zustand bleibt `wartet`, `blockedBy` erhalten. Docs, Memory, PR.
6. Abschluss: `intent.md` `umgesetzt` nach Merge (Michaels Schritt), Board-Block im Abschlussbericht.

### 7. Zerlegung

<!-- leser: agent -->

Eine Bausitzung, drei PRs in dieser Reihenfolge (Review-Minority 14): PR 1 Liste + Glocke (nur D1, D2 — die zwei gemeldeten Sichtbarkeitsfehler), PR 2 Terminal + Zuordnung (D3, D4, D5, D6, D10 — ein Codepfad `vorhaben-service`/`app.ts`-Dock), PR 3 Probe (D7, nur Backend). Integration in der Hauptsitzung; keine Sub-Agenten für Kernarbeit (AP-01).

### 8. Tests und Nachweis

<!-- leser: agent -->

**PR 1**

- `ui/tests/unit/vorhaben-sort.test.ts`: „umgesetzt + arbeitet → Läuft", „umgesetzt + wartet / wartet_plan / wartet_auf_dich → Wartet auf dich", „umgesetzt + keine_sitzung / sitzung_beendet → Umgesetzt"; Reihenfolge-Test `:35` bleibt.
- `ui/tests/unit/aos-vorhaben-uebersicht.test.ts`: Zeile `phase: 'umgesetzt'`, `zustand: 'wartet'` steht sichtbar in „Wartet auf dich" mit Chip „Umgesetzt"; `:106` (eingeklappt) bleibt für `keine_sitzung`.
- `ui/tests/unit/cloud-terminal-agent-event.test.ts`: „stop setzt agentDoneAt; prompt-submitted / user-input / blocked / session-start löschen es; idle-timeout lässt es stehen"; „agentDoneAt in Metadata, Agent-Event und Registry; Restore übernimmt nur Marken jünger als 24 h"; `:405-447` (Decay) bleibt.
- `ui/tests/unit/agent-notifications.test.ts`: `buildBellRows` — `blocked` gelistet; `agentDoneAt` gelistet als fertig; `done` ohne Marke (nach Neustart) nicht gelistet; `unknown` nie; sichtbare Sitzung ausgenommen, nach Schließen der Sidebar wieder da; Zeilen-Lookup liefert Titel/Label/Projekt; Sitzung mit zwei Zeilen → Label der neuesten; Sitzung ohne Zeile → Tab-Name; Sortierung blocked → done, neueste zuerst; `:23-51` (upsert/remove/prune) und `:170-218` entfernt bzw. ersetzt.
- `ui/tests/unit/aos-glocke.test.ts`: Eintrag zeigt Kennung + Titel + Zustands-Chip; Zähler.
- `ui/tests/unit/app-terminal-dock.test.ts` `:649` (AK-03 INT-015): auf `agentDoneAt`/`blocked` umstellen — „die zurückgelassene Sitzung klingelt nach dem Schließen des Fensters".

**PR 2**

- `ui/tests/unit/app-terminal-dock.test.ts`: `:505` umschreiben → „Cmd+D auf angedockter Seite ohne Sitzung zeigt die Tabs des Seiten-Projekts (letzter Tab, sonst erster, sonst Leerzustand), aktives Projekt bleibt"; „Neue Session auf der Vorhaben-Seite entsteht im Seiten-Projekt, auch wenn das aktive Projekt ein anderes ist (assign-before-switch)"; „Neue Session sendet `session.assign` nach dem Verbinden (claude-code), nicht für shell; Antwort → Toast; Fehler → Toast"; „Nutzer-Klick auf einen Tab im Dock einer Seite ohne Sitzung sendet `session.assign` (claude-code), nicht bei Seite mit Sitzung, nicht schwebend, nicht für shell, nicht am Handy"; „Cmd+D allein (programmatische Tab-Wahl ohne `userInitiated`) sendet nichts"; „`SESSION_ASSIGNED_ELSEWHERE` → Toast mit `message`, Zuordnung unverändert"; „Merkstelle geräumt bei Routenwechsel und Tab-Schließen"; „Adresse nennt ein geschlossenes Projekt → Dock folgt dem aktiven Projekt"; „`neu` ohne Segment → aktives Projekt".
- `ui/tests/unit/vorhaben-state.test.ts`: `moveAssignment` löscht die anderen Einträge der Sitzung, lässt fremde Sitzungen stehen, ein Commit; `clearAssignmentsOfSession`.
- `ui/tests/unit/vorhaben-service-stage2.test.ts`: `:184` → „eine Sitzung, zwei Intents: das alte Assignment verschwindet, die alte Zeile ist `keine_sitzung`"; `detectV4Command('/specwright:plan INT-002')` → `{ step: 'plan', intentId: 'INT-002' }`; `detectV4Command('/plan INT-2026-002')` → lange Form (Alternation); `resolveIntentId`: eindeutig / mehrdeutig (INT-2025-002 + INT-2026-002 → keine Zuordnung, warn) / unbekannt; `/intent` ohne Id löscht die Zuordnungen; „`/intent`-Sitzung ohne Ordner geschlossen → pending weg, keine Zuordnung, kein Fehler"; `onDirAdded` verschiebt (`:203` erweitern); `assignSession`: ok, `SESSION_NOT_ACTIVE`, `SESSION_NOT_CLAUDE`, `SESSION_NOT_IN_PROJECT`, `UNKNOWN_VORHABEN`, `ROW_HAS_SESSION`, `SESSION_ASSIGNED_ELSEWHERE` mit Name und Kennung im `message`.
- neu `ui/tests/unit/vorhaben-handler.test.ts` (Muster `workspace-handler.test.ts`): `session.assign` → `session-assigned` mit `requestId`; ungültige Kennung / fehlende Felder → `vorhaben:error` mit `requestId` (Review-Minority 19).
- `ui/tests/unit/aos-vorhaben-seite*.test.ts`: Fußzeilen-Hinweis angedockt ohne Sitzung; mit Sitzung der Name.
- `ui/tests/unit/vorhaben-reader.test.ts` `:313` erweitern: „gleicher Fingerabdruck → Haupt-Checkout"; „abweichender Inhalt → neuestes mtime"; „Zuordnung gewinnt immer"; „Fingerabdruck trotz Parse-Fehler gesetzt (kaputtes Frontmatter)"; „Bau in generischer Arbeitskopie nur mit Code-Änderung → Haupt-Checkout (dokumentierter Restfall AN-07)"; „spec.md entsteht in der Arbeitskopie → sie gewinnt".

**PR 3**

- `ui/tests/unit/cloud-terminal-agent-event.test.ts`: „working + 1,5 s Stille + Plan-Cue → blocked/plan mit Grund, `blockedBy: probe`"; „Berechtigungs-Cue → berechtigung"; „kein Cue → bleibt working, keine zweite Probe ohne neue Ausgabe"; „Ausgabe innerhalb der Frist → Timer neu"; „Stop vor Ablauf → keine Probe"; „Probe-Block + Enter → working (user-input)"; „Probe-Block, Dialog vom Bildschirm verschwunden, Stille → unblocked (Selbstheilung)"; „Hook-Block wird von der Probe nie aufgehoben"; „bereits working mit Dialog auf dem Bildschirm beim Restore → eine Probe → blocked"; „closeSession räumt den Timer"; „readScreen wirft → Status unverändert"; „Hook `blocked` nach Probe-Block setzt `blockedBy: hook`"; „`blockedBy` in Registry und Restore"; „Serialisierer: zwei gleichzeitig fällige Proben laufen nacheinander". Fake-Timer wie `:405ff`; `readScreen` gemockt.
- `ui/tests/unit/dialog-driver.test.ts` (falls vorhanden, sonst neu): `cueToBlockKind`; `findDialogCue` gegen die drei Fixtures aus Schritt 0 (Plan, Berechtigung, AskUserQuestion) und gegen einen Nicht-Dialog-Screen (Prompt mit „Do you want to proceed" als Zitat im Fließtext → kein Cue, wenn nicht am Zeilenanfang).

### 9. Risiken

<!-- leser: agent -->

- **R1** Mehr Zeilen unter „Wartet auf dich" nach D1 (offene, gestoppte Bau-Sitzungen umgesetzter Vorhaben). Sichtbar sofort; Abhilfe Tab schließen. [Certain]
- **R2** „fertig" bleibt bis zur Antwort (D2) — Verhaltensänderung gegenüber „bis zum Hinschauen". Spec-konform; falls lästig: eine Zeile („sichtbar gewesen" löscht die Marke per `cloud-terminal:seen`) als Folgekarte. [Likely]
- **R3** Probe-Fehltreffer: Zustand kurz `wartet_berechtigung`, heilt sich, sobald der Text vom Bildschirm ist oder ein Hook kommt (D7). [Uncertain, gering]
- **R4** Fingerabdruck liest die vier Dokumente nur bei mtime-Wechsel (Cache); bei Cache-Miss ≤ 4 Dateien je Kopie. [Certain]
- **R5** CI-Flake `vorhaben-service-stage4.test.ts` (Handoff 17.09.). Rerun, nicht Bezugsliste. [Certain]
- **R6** `unknown` bleibt in der Zeile „wartet" (F8); in der Glocke nie. Mit D4/D10 nur `claude-code` zugeordnet. [Certain]
- **R7** — entfallen mit D9 (Fassung 4).
- **R8** D10: Fehlklick auf einen freien Claude-Tab im Dock ordnet ihn zu. Sichtbar durch Toast; Rückweg `/build INT-…` oder Tab schließen. Zugeordnete Tabs werden nie verschoben. [Certain]
- **R9** `session.assign` verloren (WS-Abbruch): Timeout-Toast nach 15 s, Zeile zeigt weiter „ruht", Klick wiederholen. Kein automatischer Retry (idempotent wäre er, aber ein zweiter Klick ist billiger als eine Warteschlange). [Certain]
- **R10** Nach Backend-Neustart kehren Marken jünger als 24 h zurück: ein Stop kurz vor dem Deploy bleibt in der Glocke (Fehler 2 kommt nicht zurück); ältere, nie beantwortete Tabs bleiben draußen. Wer nach einem Urlaub zurückkommt, sieht die Vorhaben-Zeilen („wartet"), nicht die Glocke — hingenommen, Zeile ist die Wahrheit. [Certain]
- **R11** Probe-Last: eine `capture-pane` je Ruhephase je arbeitender Claude-Sitzung, serialisiert; bei 50 Sitzungen, die gleichzeitig still werden, 50 Aufrufe nacheinander (≈ 0,3 s gesamt), dann nichts bis zur nächsten Ausgabe. Beleg über den Zähler in E2E (e). [Likely]

**Annahmen**

- **AN-01** Zwei `/intent`-Ordner aus einer Sitzung: der zweite bekommt keine Zuordnung; das spätere Phasen-Kommando ordnet um (D5). Kein Umbau der Debounce-Logik in `onDirAdded`.
- **AN-02** Zeit in der Zeile bleibt `lastChangedMs` (F9); nur die Glocke zeigt `agentStatusAt`/`agentDoneAt`.
- **AN-03** Die Probe läuft nur für `claude-code`-Sitzungen mit tmux (`live: true`); der rohe PTY-Puffer (`live: false`) wird nicht ausgewertet (Stale-Frames, Kommentar in `plan-dialog-state.ts`).
- **AN-04** Kein Auto-Öffnen des Docks ohne Sitzung (Spec INT-2026-011 FA-06 gilt weiter).
- **AN-05** Eine verlorene Verbindung (Umbenennung, Sitzung außerhalb der UI gestartet, alte Kennung getippt) wird nicht rückwirkend rekonstruiert; D10 setzt sie mit einem Klick. Für INT-2026-012 heute: Cmd+D, richtigen Tab anklicken.
- **AN-06** — entfallen mit D9.
- **AN-07** D6-Restfall: unzugeordneter Bau in Arbeitskopie, der nur Code ändert, zeigt das Arbeitskopie-Etikett des Haupt-Checkouts (Dokumente identisch, Phase/Zustand richtig); mit Zuordnung (D4/D5/D10) gewinnt immer die Kopie der Sitzung.
- **AN-08** Mehrdeutige Kurz-Kennung (zwei Jahrgänge) wird nicht zugeordnet; der Befehl selbst läuft in Claude ohnehin weiter, die UI hat keinen Kanal ins Terminal für einen Hinweis.

### 10. Manuelle Schritte

<!-- leser: mensch -->

1. Nach dem Deploy von PR 1: Übersicht prüfen — umgesetzte Vorhaben mit offener Sitzung stehen jetzt oben (R1); nicht mehr gebrauchte Sitzungen schließen.
2. Nach PR 2: auf der Vorhaben-Seite INT-2026-012 Cmd+D drücken, den richtigen Tab anklicken — die Zeile trägt danach die Sitzung (AN-05).
3. Nach PR 3: die compass-Sitzung mit offenem Plan-Dialog beobachten — Zeile muss `wartet · Plan-Entscheidung` zeigen, Glocke den Eintrag.
4. Merge je PR = Michaels Schritt (Auto-Deploy).

### 11. Schätzung

<!-- leser: mensch -->

PR 1 ≈ 3 h (D1 klein, D2 Backend-Marke + Frontend-Abbau + Glocke), PR 2 ≈ 4 h (Zuordnung, Handler, Dock, Fingerabdruck, Tests), PR 3 ≈ 3 h (Schritt 0 mit Fixtures, Probe, Tests, E2E). Gesamt ≈ 10 h Agentenzeit in einer Sitzung; unter einem Tag (Bypass).

### 12. Review des Plans

<!-- leser: mensch -->


**Runde 1** — **Blocker**

- **B1 Zwei Quellen für die Glocke, fragile Invalidierung, Schlüssel unklar** — **angenommen, Design geändert (D2).** Keine Frontend-Merkliste mehr; Listung ⇔ `blocked` ∨ `agentDoneAt` aus dem Backend; Vorhaben-Zeilen liefern nur Beschriftung; Schlüssel bleibt die Frontend-Id, Backend-Id nur für Sprung/Lookup. Es gibt nichts mehr zu invalidieren, wenn eine Sitzung ein Vorhaben bekommt — nur das Etikett wechselt.
- **B2 `session.assign` ohne Antwort, Rennen mit dem Projektwechsel** — **angenommen (D3, D4).** Request/Reply mit `requestId` und Toast; Sitzung wird angedockt immer im Seiten-Projekt erzeugt, das Rennen entfällt; Backend prüft Projekt, Typ, Zeile, Fremdzuordnung; Test „assign-before-switch".
- **B3 Timer-Lebenszyklus der Probe, Restore** — **angenommen (D7).** Timer an jeden Statuswechsel, Schließen, Exit, Dispose gebunden; `probeInFlight`; Restore armt einmal und liest den aktuellen Bildschirm; Client-Abbrüche sind für eine Backend-Probe irrelevant. Die Behauptung „nach Deploy werden Sitzungen nicht wiederhergestellt" trifft hier nicht zu — tmux-Sitzungen werden aus der Registry restauriert (`startRestore`, Memory `project_tmux_session_persistence`).

**Minority**

- **4 Aktives Projekt folgt der Route** — **angenommen, D3 umgebaut**: kein globaler Wechsel ohne Sitzung (F11: Workspace-Zustand wirkt auf alle Fenster/Geräte); die angedockte Spalte filtert lokal nach dem Seiten-Projekt.
- **5 Kurz-Kennung mehrdeutig** — **angenommen (D5, AN-08)**: keine Zuordnung + `console.warn`; Nutzer setzt per Klick (D10). Ein Hinweis ins Terminal ist nicht möglich (kein Kanal), ein Toast im Browser für einen im Terminal getippten Befehl wäre orts­fremd.
- **6 Probe-Fehltreffer kleben** — **angenommen (D7)**: `blockedBy: 'probe'` + Selbstheilung, wenn der Dialog vom Bildschirm ist; Hook-Blocks unberührt.
- **7 Fingerabdruck deckt FA-06-Restfall nicht** — **teilweise angenommen (D6, AN-07)**: Fingerabdruck über alle vier Dokumente inkl. `build-stand.md`; der Restfall „nur Code geändert" betrifft nur das Arbeitskopie-Etikett (Phase/Zustand identisch); mit Zuordnung gewinnt die Kopie der Sitzung. Die FA-06-Aussage in Fassung 2 war zu stark; korrigiert.
- **8 Neue Dock-Sitzung klingelt vor der ersten Eingabe** — **angenommen (D2)**: die Glocke listet nur `blocked` oder Marke; `unknown`/`idle` ohne Marke nie.
- **9 `BellRow.sessionId` unklar** — **angenommen (D2)**: Frontend-Id, explizit.
- **10 `kind` reicht nicht zum Sortieren** — **angenommen (D2)**: Sortierung nach `kind` (blocked → done) und Zeit; Zustandstext als `label`, kein weiteres Sortkriterium nötig, weil der Zustand nur Etikett ist.
- **11 `statusAt` doppelt** — **angenommen**: kein Protokollfeld auf `VorhabenSessionRef`; Zeit kommt aus `terminalSessions`.
- **12 Rennen D4 vs. `onDirAdded`** — **angenommen (D5)**: beide Wege verschieben, der letzte gewinnt, Reihenfolge egal; `/intent` ohne Kennung löscht die Zuordnungen der Sitzung.
- **13 Übergang 1-Doc → 3-Doc** — **abgelehnt als Nicht-Problem, erklärt (D6)**: neue Datei ändert Fingerabdruck und mtime der Arbeitskopie → sie gewinnt; unberührte Kopie ist inhaltsgleich → `main` gewinnt richtig. Test ergänzt.
- **14 PR 1 zu breit** — **angenommen (§7)**: drei PRs; F4/F5/F7 gehören fachlich zu Fehler 3/4 (falsche Sitzung an der Zeile, falsches Etikett) und bleiben im Vorhaben, aber in PR 2.
- **15 Fehlende Tests für Rennen/Kanten** — **angenommen (§4)**: alle sieben genannten Fälle haben jetzt einen Test.
- **16 Reihenfolge in `groupOf`** — **kein Finding**, bestätigt F1.
- **17 Probe erst nach Schritt 0 formen** — **abgelehnt**: D7 ist als hook-unabhängige Rückfallebene gedacht und wird unabhängig vom Ergebnis gebaut; Schritt 0 dient der Dokumentation (Memory, §14) und der Frage, ob Hook-Matcher zusätzlich anzupassen sind.
- **18 Fingerabdruck bei Parse-Fehler leer** — **angenommen (D6)**: Hash über den Rohtext vor dem Parsen.
- **19 `vorhaben-handler.test.ts` fehlt in der Tabelle** — **angenommen (§3/§4)**.
- **20 Zeilennummer `≈1470`** — **angenommen**: `terminal.data`-Handler `cloud-terminal-manager.ts:1459-1482`, `lastActivity` `:1474`, `session.data`-Emit `:1482`, `startRestore` `:346`, `toPersistedEntry` `:1737-1739`, Restore-Felder `:1863-1868` — alle geprüft.

**Runde 2** — **Likely**

- **1 `agentDoneAt` nicht persistiert → Fehler 2 nach jedem Deploy** — **angenommen (D2, R10)**: Marke wird in der Registry persistiert und beim Restore übernommen, wenn jünger als 24 h. Der Einwand stimmt: die Registry führt nur lebende tmux-Sitzungen, ein Schwall geschlossener Tabs war nie das Risiko — nur wochenalte lebende Tabs, und die schneidet das Fenster ab.
- **2 D9 hängt Sitzungen still an, ohne Sichtbarkeit; optional neben D10; hilft INT-2026-012 nicht** — **angenommen, D9 gestrichen.** Damit entfallen R7, AN-06, `stage5`-Tests, E2E (c3) und die Runde-2-Punkte 14 und 18.
- **3 Marke bleibt, Tab-Punkt verblasst** — **angenommen als Dokumentation (D2, `design.md` §4)**: die Asymmetrie ist gewollt; die Marke auf `idle-timeout` zu löschen würde den applai-Fall (29 min) wieder verlieren.

**Minority**

- **4 Auflösungsregel `pageProjectId`** — **angenommen (D3)**: Adresse (`vorhaben/<p>/<INT>`, `neu/<p>`) vor aktivem Projekt, unbekanntes/geschlossenes Projekt → aktives Projekt; Tests ergänzt.
- **5 Probe-Last unbegrenzt** — **angenommen (D7, R11)**: die Rechnung „4 Proben/s über Nacht" trifft nicht zu — eine ruhende Sitzung probt genau einmal je Ruhephase, danach nichts bis zur nächsten Ausgabe; zusätzlich globaler Serialisierer und Zähler-Beleg in E2E (e).
- **6 Plan-Option löscht Probe-Block?** — **geklärt (D7)**: Enter/Ziffer/Esc laufen über `sendInput` → `user-input` → `working` (hook-unabhängig); Option 1/2 löst zusätzlich `PostToolUse` → `unblocked` aus. Test vorhanden.
- **7 Fehlercodes unvollständig** — **angenommen (D4)**: vollständige, geordnete Liste inkl. `UNKNOWN_VORHABEN`, `SESSION_NOT_ACTIVE`, `INVALID_MESSAGE`; Tests je Code.
- **8 „ruht" vs. `keine_sitzung`** — **kein Widerspruch, Wortlaut geschärft**: `keine_sitzung` ist der Zustand, „ruht" seine Beschriftung (`ZUSTAND_LABELS`).
- **9 SHA-1 → SHA-256** — **angenommen (D6)**.
- **10 Programmatische Tab-Wahl ordnet zu** — **angenommen (D10)**: nur Klick-Ereignisse mit `userInitiated: true` aus `aos-terminal-tabs`; Cmd+D, `_syncDock`, List-Response, Projektwechsel ordnen nie zu; Test „Cmd+D allein sendet nichts".
- **11 Cues nicht gegen Live-Screens belegt** — **angenommen (D7, Schritt 0)**: drei Screens als Fixtures unter 2.1.274, `findDialogCue`-Tests je Fixture, Muster vor PR 3 angepasst, falls nötig. Plan-Cue heute schon auf dem compass-Screen belegt.
- **12 `blockedBy` nicht persistiert** — **angenommen (D7)**: mit `blockKind` in der Registry.
- **13 Alternation-Reihenfolge der Kurz-Id** — **angenommen (D5)**: lange Form zuerst, `\b`, Test.
- **14 D6/D9-Etikett-Spalt** — **entfallen** (D9 gestrichen).
- **15 `arbeitet` + `umgesetzt`** — **bereits abgedeckt (D1, §4 erster Test)**: landet unter „Läuft", Chip „Umgesetzt"; gewollt, von Michael bestätigt.
- **16 `/intent` ohne Ordner verwaist** — **angenommen als Test (D5)**: `onSessionClosed` räumt pending; ohne Zuordnung zu bleiben ist richtig.
- **17 Fehlertext ohne Kennung** — **angenommen (D4)**: `message` trägt Name und Kennung, Frontend zeigt `message`; kein Schema-Umbau.
- **18 Rennen Zuordnung vs. D9-Scan** — **entfallen** (D9 gestrichen); D4/D10 laufen im Service vor dem Rescan, keine Sperre nötig.
- **19 Vorrang Hooks vs. Probe, ADR-0004** — **angenommen (D7)**: Hook-Ereignis gewinnt immer, Probe handelt nur bei `working` oder eigenem Block; ADR-0004 bleibt unverändert, `architecture.md` §2 erhält den Satz zu erster und zweiter Statusquelle.
- **20 Keine Affordanz „welcher Tab ist meiner"** — **angenommen (D10)**: Fußzeilen-Hinweis ohne Sitzung; mit Sitzung steht ihr Name dort und ihr Tab allein vorne.

### 13. Definition of Done

<!-- leser: agent -->

`verify: OK` lokal und CI grün je PR · Tests aus §4 vorhanden und grün · E2E (a)–(h) mit Screenshots im `design/`-Ordner · `architecture.md`/`design.md` mit Protokollzeilen · Abweichungen in `plan.md` §14 (inkl. Schritt-0-Ergebnis) · Memory zu Plan-Dialog-Hooks aktualisiert · Abschlussbericht mit Block „Für das Board" (Karte INT-2026-016; Folgekarten: F8 `unknown` = wartet in der Zeile, `detectPlanBox`/`PLAN_BOX_PATTERN` an die Probe hängen, F9 Zeit in der Zeile, R2 „gesehen"-Marke falls gewünscht).

### 14. Abweichungen bei der Umsetzung

<!-- leser: agent -->

| Datum | Abweichung | Grund | Auswirkung |
|---|---|---|---|
| 2026-09-17 | Schritt 0: Unter Claude Code 2.1.274 mit Haiku feuern für **beide** Plan-Dialoge `PreToolUse ExitPlanMode` + `PermissionRequest ExitPlanMode` (auch nach Option 3 mit Feedback); der compass-Befund (Dialog ohne Hook) ließ sich so nicht reproduzieren. [Likely] Ursache: die compass-Sitzung lief noch unter einem älteren Claude Code (gestartet 16.09., vor dem Update auf 2.1.274) oder das Verhalten hängt am Modell (Fable 5.1). | Beobachtung im E2E (`e2e-016-pr3.mjs`, `probe-summary.txt`) | D7 bleibt als hook-unabhängige Rückfallebene; der verpasste Hook wurde simuliert (falsches `UserPromptSubmit` bei offenem Dialog) — die Probe setzte `wartet · Plan-Entscheidung` nach 1 518 ms, eine Leseoperation. Memory-Notiz aktualisiert. |
| 2026-09-17 | Probe wird zusätzlich bei jedem Übergang nach `working` armiert, nicht nur bei Terminal-Ausgabe. | Im E2E blieb eine Sitzung, die ohne weitere Ausgabe `working` wurde (Hook nach dem Dialog), ungeprüft; nach dem Neustart deckte dasselbe Muster die Lücke auf (Restore-Arm war schon vorgesehen). | Unit-Test „a session that becomes working without further output is probed"; Live-Beleg: Backend-Neustart mit offenem Dialog → `blocked/plan/probe` nach 1,5 s. |
| 2026-09-17 | Berechtigungs-Dialog als Fixture aus einer **einfachen** `claude`-tmux-Sitzung ohne Bypass (Write-Dialog „Do you want to create …?"), nicht aus einer UI-Sitzung. | UI-Sitzungen laufen mit `--dangerously-skip-permissions`; dort gibt es keinen Berechtigungs-Dialog. | E2E (f) entfällt als UI-Fall; `findDialogCue` gegen die Fixture getestet (`dialog-driver.test.ts`). |
| 2026-09-17 | `vorhaben:session.assign` fehlte in der Weiche `websocket.ts` (PR 2). | Handler-Tests grün, Weiche nicht abgedeckt; im E2E gefunden. | Behoben in PR 2; Folgekarte: Weiche testbar machen. |
| 2026-09-17 | Das aktive Projekt ist gerätelokal (`localStorage['specwright-active-project']`), nicht Workspace-Zustand. | Review-1-Einwand (Minority 4) ging von Workspace-Zustand aus. | D3 bleibt lokal (einfacher, kein Projektwechsel ohne Sitzung); der Einwand „alle Geräte schalten um" traf so nicht zu. |
| 2026-09-17 | Fixtures für 2.1.274 unter `ui/tests/fixtures/tui/2.1.274/` (idle, AskUserQuestion, Plan-Dialog ×3, Berechtigung), Test `dialog-driver.test.ts` läuft über alle Versionsordner. | Plan nannte `ui/tests/fixtures/dialog-screens/`; der Ordner `tui/<Version>/` existierte schon aus INT-2026-007. | Bestehende Ablage weiterverwendet. |
| 2026-09-17 | „Fertig"-Marke wird persistiert (24 h), wie in Fassung 4 entschieden; die Glocke zeigt einen Vorhaben-Eintrag mit Chip „fertig" und Zustandstext „wartet" (Zeilen-Semantik). | Review 2 Nr. 1. | Kein Umbau; Chip = Sitzungs-Ereignis, Text = Zustand der Zeile. |
