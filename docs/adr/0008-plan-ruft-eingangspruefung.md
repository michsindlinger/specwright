# ADR-0008: Der Plan ruft die Eingangsprüfung einer Software Factory

> Status: Angenommen (Michael, 2026-10-23)
> Datum: 2026-10-23
> Betrifft: Workflow `specwright/workflows/core/plan.md` (1.5, Step 1, Step 4, Step 9c, Step 9b), Befehl `.claude/commands/specwright/plan.md`, Vorlage `specwright/templates/sdlc/vorhaben/plan-template.md` (Format 2.1), Vorhaben INT-2026-034
> Umgesetzt in: Branch `feat/INT-2026-034-factory-karten-im-plan`

---

## Kontext

Ein Plan aus `/plan` mischt Arbeit, die eine Software Factory (eine Agenten-Pipeline, die Tickets selbst umsetzt) übernehmen könnte, mit Arbeit, die nur ein Mensch erledigen kann: eine Stichprobe, eine Freigabe, ein Neustart. Welche Teile die Factory bauen kann, steht heute nirgends. Die Factory hat dafür eine eigene Eingangsprüfung: Sie liest eine Kartendatei `cards.yaml` neben dem Plan und sagt je Karte „factory ready“ oder „nicht ready“ mit jedem Grund. Dieselbe Prüfung entscheidet später im Betrieb, ob eine Karte vom Board angenommen wird.

Specwright soll diese Prüfung beim Planen nutzen, damit Planer und Factory nach denselben Regeln einstufen. Das ist die erste Kopplung des Frameworks an ein externes Werkzeug, das Specwright nicht mitliefert, und Specwright ist öffentlich, die Factory nicht.

---

## Entscheidung

**Kopplung nur über einen Befehl, nur lesend.** Der Workflow `plan` ruft im neuen Step 9c `npm --prefix "$SPECWRIGHT_FACTORY_DIR" run --silent ready-check -- "[Betriebsdatei]" "[cards.yaml]" --repo "[Worktree]" --json`, alle Pfade absolut. Der Befehl schreibt nichts, braucht kein Netz und keine Zugangsdaten. Specwright kennt von der Factory nur diesen Aufruf, die Exit-Codes (0 alle ready, 1 mindestens eine nicht ready, 2 Eingabe nicht brauchbar) und das JSON.

**Format über eine Nummer.** Die Kartendatei, die Specwright schreibt, trägt `format: 2` (Karten und Handschritte); das JSON der Prüfung trägt dieselbe Nummer. Meldet die Prüfung eine andere Nummer, bricht der Schnitt mit Meldung ab, statt zu raten. Ein späterer Formatwechsel der Factory braucht deshalb eine neue Fassung des Workflows.

**Ohne Factory kein Schnitt.** Ist `SPECWRIGHT_FACTORY_DIR` nicht gesetzt, fehlt dort das Skript `ready-check` oder gibt es keine Betriebsdatei für das Projekt, schreibt der Plan einen Satz mit dem Grund in den optionalen Unterabschnitt „Karten für die Factory“ und läuft wie bisher. Die Vorlage bekommt nur diesen optionalen Unterabschnitt; die Formatnummer steigt in der Nebenstelle auf 2.1.

**Keine Regel doppelt.** Specwright schreibt keine Prüfregel der Factory ab und rechnet nichts nach. Einstufung, Gründe, Hinweise und Abdeckung stehen im Plan so, wie das JSON sie meldet. Eine nicht ready Karte schneidet der Plan höchstens zweimal neu; danach wird ihre Arbeit ein Handschritt mit den Gründen aus der Prüfung.

**Nachträglich schneiden.** `/plan INT-… --karten` schneidet einen freigegebenen Plan, ohne ihn neu zu planen; der Status des Plans bleibt, der Commit heißt `plan(INT-…): Karten geschnitten`.

---

## Konsequenzen

- Projekte ohne Factory merken nichts außer einem Satz im Plan; ältere Pläne mit Format 2.0 oder ohne Angabe bleiben gültig.
- Die Prüfung liest den Projektinhalt nur aus eingecheckten oder vorgemerkten Dateien des Worktrees; neue Entscheidungsnotizen des Vorhabens müssen vor dem Aufruf mit `git add` vorgemerkt sein.
- Planer im Worktree und Factory im Betrieb können verschieden einstufen, wenn ihr Stand verschieden ist. Bei gleichem Stand ist die Einstufung gleich, weil es dieselbe Prüfung ist.
- Ändert die Factory ihr Format, bricht der Schnitt mit Meldung ab, bis der Workflow nachgezogen ist.
- Ordner und Betriebsdatei der Factory liegen auf dem Rechner der Person, nie in diesem Repo (`docs/security.md`).

---

## Alternativen

| Alternative | Warum nicht |
|---|---|
| Specwright bringt eine eigene Kopie der Prüfregeln mit | zwei Fassungen derselben Regeln laufen auseinander; die Factory gehört nicht in ein öffentliches Repo |
| Abdeckung rechnet Specwright selbst | zweite Rechenstelle für dieselbe Zahl |
| Prüfung schon im Plan Mode | Plan Mode schreibt nur in die Arbeitskopie des Plans; die Kartendatei muss im Worktree liegen, damit Planer und Factory dieselbe Datei meinen |
| Pflichtabschnitt in der Plan-Vorlage | Hauptnummer 3.0; jedes Projekt ohne Factory hätte einen leeren Pflichtabschnitt |
