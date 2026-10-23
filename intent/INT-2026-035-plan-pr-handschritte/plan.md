# Plan: Plan-PR, Karten anlegen und Handschritte nach dem Factory-Schnitt

> **Intent:** `intent.md` (INT-2026-035) · **Spec:** `spec.md`
> **Status:** umgesetzt
> **Erstellt:** 2026-10-24 im Plan Mode · **Freigabe:** Michael (Produktverantwortung), 2026-10-24
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand 9762f05), `CLAUDE.md`, `docs/security.md`
> **Format:** 2.1

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Seit dem letzten Vorhaben kann `/plan` einen Plan in zwei Sorten Arbeit zerlegen: „Karten", die eine Software Factory (eine Agenten-Fabrik, die Tickets von einem Board selbst abarbeitet) übernehmen kann, und „Handschritte", die nur ein Mensch erledigen kann, etwa eine Stichprobe oder eine Freigabe. Danach hört `/plan` aber auf. Die Factory sieht den Plan erst, wenn er auf ihrem Zweig im Online-Repository liegt (der „Factory-Zweig", oft nicht `main`, sondern z. B. `develop`). Bis dahin musst du von Hand hochladen, einen Pull Request (PR, ein Änderungsantrag auf GitHub) anlegen, ihn zusammenführen („mergen") und den Befehl der Factory starten, der die Karten am Board anlegt. Wo du deine Handschritte erledigst und wie die Factory davon erfährt, ist nirgends festgelegt. Und `/build` würde bei so einem Plan heute stur den ganzen Plan bauen, also auch die Arbeit, die eigentlich die Factory macht.

**Was ändert sich?** Du merkst es nur bei Projekten mit Factory. Nach der Freigabe eines geschnittenen Plans führt dich `/plan` durch vier Fragen: hochladen? PR anlegen? mergen? Karten anlegen? Jede Frage beantwortest du mit ja oder nein; Git-Befehle tippst du nicht mehr. Vor dem Anlegen zeigt die Factory, was sie täte (welche Karten neu, welche schon da, welche ausgelassen und warum). `/build` zeigt bei so einem Plan nur noch eine Liste deiner Handschritte mit Stand („erledigt am …", „frei", „wartet auf K-02"). Du wählst einen, `/build` macht dafür eine eigene Arbeitskopie und einen eigenen PR, der im selben Zug „erledigt" in die Kartendatei schreibt. Erledigt ist ein Handschritt also genau dann, wenn sein PR gemergt ist. Wenn alles fertig ist, fragt `/build`, ob das Vorhaben umgesetzt ist, und bringt auch das per PR auf den Factory-Zweig. Projekte ohne Factory merken gar nichts.

**Wie wird das gemacht?** Specwright besteht hier nur aus Anleitungstext, den der Agent liest und befolgt; es gibt keinen neuen Programmcode. Geändert werden die Anleitungen für `/plan` (`specwright/workflows/core/plan.md`) und `/build` (`specwright/workflows/core/build.md`). Weil drei Abläufe dasselbe Muster brauchen (frischen Stand holen, eigenen Zweig darauf, nur bestimmte Dateien, hochladen, PR, Zustand prüfen, mergen, jeweils mit Rückfrage), kommt dieses Muster einmal in eine neue gemeinsame Anleitung `specwright/workflows/meta/factory-pr.md`, auf die beide verweisen. Vergleich: statt dreimal dieselbe Wegbeschreibung in drei Briefe zu schreiben, liegt sie einmal bei, und jeder Brief sagt „siehe Beiblatt".

Zwei Stellen haben wir besonders bedacht:

1. Ob eine ausgelassene Karte „nicht ready" ist (dann darfst du wählen: neu schneiden oder als Handschritt) oder nur „wartet" (auf einen Handschritt oder eine Vorgänger-Karte), entscheidet Specwright nicht selbst. Es fragt die Eingangsprüfung der Factory, die schon beim Planen benutzt wird, und nimmt nur deren Ja/Nein. So bleibt die Regel bei der Factory.
2. Welche Factory-Karte zu welchem PR gehört, steht nur am Board der Factory, und deren Zugänge hat Specwright nicht. Deshalb fragt `/build` dich, wenn es darauf ankommt: „Welcher PR hat K-02 umgesetzt?" Du nennst die Nummer (sie steht an der Karte am Board), und Specwright prüft bei GitHub nach, dass genau dieser PR wirklich auf dem Factory-Zweig gemergt ist. Ein Tippfehler bei „ja, ist gemergt" fällt so auf; nur eine falsche PR-Nummer, die zufällig gemergt ist, fällt nicht auf.

Gemergt wird nie ohne dein Ja für genau diesen einen PR. Ist ein PR nicht mergebar (Konflikt, rote Prüfung, Schutzregel), wird nicht gemergt; du siehst den Grund und den Weg weiter. Ziel ist der Hauptzweig des Specwright-Repos selbst, wird nie gemergt, weil das den Auto-Deploy der Web-UI auslöst; dann endet der Lauf beim PR-Link. Ob es das Specwright-Repo ist, erkennt der Lauf an dessen Namen auf GitHub, nicht an einzelnen Dateien.

Hilfs-Arbeitskopien, die `/plan` für den Plan-PR anlegt, räumt es am Ende des Laufs wieder weg. Die Arbeitskopien der Handschritte bleiben stehen (Aufräumen ist laut Spec nicht im Umfang); der Lauf nennt dir am Ende Pfad und Befehl zum Entfernen.

Zusätzlich: Die Entscheidungsnotiz ADR-0008 bekommt einen Nachtrag (die Kopplung an die Factory wächst um einen zweiten Befehl, der mit deiner Bestätigung schreibt), die Architektur-Doku die passende Zeile, und die Specwright-Version steigt auf 4.5.0.

**Was kann schiefgehen?** (1) Der Agent befolgt die neue Anleitung nicht genau, z. B. mergt ohne Rückfrage. Gegenmittel: jede Rückfrage steht als eigene Zeile mit „WAIT" in der Anleitung, und der Probelauf prüft genau das. Merken würdest du es sofort im Lauf; rückgängig über einen Revert-PR auf dem Factory-Zweig. (2) Der Plan-PR nimmt fremde Dateien mit. Gegenmittel: der Zweig entsteht frisch vom Factory-Zweig und bekommt nur den Vorhaben-Ordner und neue Entscheidungsnotizen; vor dem Hochladen siehst du die Dateiliste. (3) Du nennst für K-02 eine falsche PR-Nummer, die zufällig gemergt ist; dann startet ein Handschritt zu früh. Ein bloßes Versehen („ja" statt „nein") fängt die Nachprüfung bei GitHub ab; den Rest nehmen wir in Kauf, statt Board-Zugänge in Specwright zu holen. (3a) Läuft beim Neuschnitt ein zweiter Plan-PR, während schon Handschritte erledigt sind, dürfen deren Erledigt-Vermerke nicht überschrieben werden. Deshalb ändert der Neuschnitt immer die Kartendatei, wie sie gerade auf dem Factory-Zweig liegt, nicht eine alte Kopie. (4) Bei Projekten ohne Factory ändert sich versehentlich etwas. Gegenmittel: alle neuen Teile hängen an der Bedingung „Kartendatei vorhanden"; ein Kontrolllauf ohne Schnitt gehört zum Nachweis.

**Was musst du entscheiden?** Zwei Punkte mit Vorschlag:

- Ob eine Karte gemergt ist, nennst du über die PR-Nummer der Karte, und Specwright prüft diesen PR bei GitHub nach. Vorschlag: so lassen; eine vollautomatische Zuordnung Karte → PR bräuchte einen neuen Lese-Befehl in der Factory und ist ein eigenes Vorhaben dort.
- Der Probelauf (E2E) läuft an einem Probe-Projekt mit Factory, dessen Factory-Zweig nicht `main` ist, mit Übungs-Board. Vorschlag: das Probe-Projekt, das ich dir im Chat nenne (Name nicht im öffentlichen Repo); du bestätigst es vor dem Bau.

## Details

<!-- leser: mensch -->

Confidence-Tags: [Certain] harte Belege · [Likely] starke Inferenz · [Uncertain] Vermutung.

### 1. Kurzfassung

<!-- leser: mensch -->

Neue gemeinsame Anleitung `specwright/workflows/meta/factory-pr.md` (Factory-Zweig klären, frisch holen, Zweig vom entfernten Stand, Dateien begrenzen, Push/PR/Zustand/Merge je mit Bestätigung, Merge-Sperre für Specwright-`main`); Workflow `plan` 1.6 bekommt Step 10 (Plan-PR, Karten anlegen über `create-cards` mit Vorschau, Wahl bei nicht ready Karten), Workflow `build` 1.4 einen Zweig für geschnittene Pläne (Überblick, Handschritt mit/ohne Code, Abschluss). Ohne `cards.yaml` bleiben beide wörtlich beim bisherigen Verhalten. Dazu ADR-0008 Nachtrag, `architecture.md` §5, Befehlskurztexte, Manifest-Zeile, Version 4.5.0.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Ende von `/plan` | `specwright/workflows/core/plan.md:159-167` (Step 9b: Commit `plan(…): Plan freigegeben`, `NEXT: /build`) | Einstieg für den neuen Step 10; Step 9b bleibt unverändert (AK-12) [Certain] |
| Factory klären | `specwright/workflows/core/plan.md:38-42` (Step 1: `SPECWRIGHT_FACTORY_DIR`, Skript `ready-check`, Betriebsdatei per `github.repo`) | wiederverwendbar für `/build`; Feld `code.branch` der Betriebsdatei = Factory-Zweig (RB-02) [Certain] |
| Modus `--karten` | `specwright/workflows/core/plan.md:43` | AN-S08: Step 10 läuft auch nach `--karten` [Certain] |
| Eingangsprüfung | `specwright/workflows/core/plan.md:132-145` (Step 9c, JSON `format: 2`, Feld `ready`) | wird in Step 10 noch einmal gegen den gemergten Stand gerufen, um nicht ready von wartend zu trennen (FA-10/FA-11) ohne Regel nachzubilden [Certain] |
| Neuschnitt-Grenze | `specwright/workflows/core/plan.md:139` („höchstens zwei Runden Neuschnitt je Plan") | Zähler muss über Sitzungen halten (AN-S03) → Zeile im Plan §7 [Certain] |
| Factory `create-cards` | Factory `src/engine/create-cards.ts:1-11` (Aufruf `npm run create-cards -- <factory.yaml> <INT-…> [--repo <dir>] [--apply]`; liest `origin/<code.branch>` ohne Fetch; Exit 0/1/2) | Specwright holt vorher frisch (Spec §7 Zeile 3); Ausgabe ist Text, keine JSON → unverändert zeigen, nicht parsen [Certain] |
| Factory Auslass-Gründe | Factory `src/core/card-creation.ts:46-67, 128-135` (skip: Regelgründe der Prüfung; „wartet auf Handschritt", „Vorgänger … nicht am Board") | Unterscheidung nicht ready/wartend über `ready` aus `ready-check`, nicht über diese Texte (FA-24) [Certain] |
| „Karte gemergt" | Factory `src/core/status.ts:31-32` (Board-Status „gemerged, nicht ausgeliefert"), Factory-Zweige heißen nach Board-Karten-ID (`src/core/implementation.ts:61-63`) | aus Git ohne Board-Zugang nicht ableitbar; kein lesender Befehl der Factory liefert es → Person nennt den PR der Karte, Specwright prüft ihn per `gh` (D1) [Certain] |
| `/build` Eingang | `specwright/workflows/core/build.md:33-44` (Step 1: Branch `feat/…` von aktueller Basis, `Status: in_umsetzung`) | neuer Abzweig vor dem GIT-Schritt, nur bei `cards.yaml` [Certain] |
| Worktree-Schema | `specwright/workflows/core/build.md:52` (`../<projekt>-worktrees/INT-…-t<n>`) | Schema `…-worktrees/INT-…-H-nn`, Zweig `hand/INT-…-H-nn` (OF-02) passt dazu [Certain] |
| Abschluss | `specwright/workflows/core/build.md:105` (Abschluss per UI-Knopf, ohne UI Kopf von Hand: Status, PATCH, Datum, Protokollzeile) | Ablauf F nutzt dieselbe Kopf-Regel, nur per PR auf den Factory-Zweig (RB-04) [Certain] |
| Merge-Sperre | `install-lib.sh:26` und `update-specwright.sh:16` nennen das Repo `michsindlinger/specwright` (öffentlich) | Erkennung FA-22 über die Repo-Identität `gh repo view --json nameWithOwner,defaultBranchRef` statt über Dateien [Certain] |
| Auslass-Logik der Factory | Factory `src/core/card-creation.ts:126-136`: `!assessment.ready` → skip mit Prüfgründen; „wartet auf Handschritt"/„Vorgänger" nur für ready Karten | `ready: false` aus `ready-check` ist genau die Menge „nicht ready" (widerlegt Externes Finding 15) [Certain] |
| Fetch mit Refspec | `docs/architecture.md:35` (Abschluss-Regel INT-2026-024: „Fetch mit explizitem Refspec") | gleiches Muster: `git fetch origin +refs/heads/<b>:refs/remotes/origin/<b>` (Single-Branch-Klone) [Certain] |
| Lieferumfang | `specwright/manifest.tsv:334-335` (meta-Workflows) | neue Zeile für `factory-pr.md` (AR-01, RB-05) [Certain] |
| Version | `VERSION` 4.4.0, `install.sh:18` | 4.5.0 synchron; `check-manifest.sh` prüft [Certain] |
| Tests | kein Test liest die Workflow-Texte (`grep -rln "workflows/core/plan.md" scripts ui/tests .github` leer) | Nachweise per grep, Guards, Installer-Test, E2E-Protokoll [Certain] |
| Specwright selbst | `~/.factory/*/factory.yaml`: keine Datei mit `github.repo` = Specwright | dieser Plan wird nicht geschnitten [Certain] |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

**Gemeinsame Anleitung `factory-pr.md`** (meta, Hauptagent-Text) mit vier Bausteinen, auf die `plan` und `build` verweisen:

- **FZ-Klären:** Betriebsdatei wie `plan` Step 1 (Vorschlag per `github.repo` = `origin`, Person bestätigt); `code.branch` lesen. Ohne Factory → Rückkehr „kein Schnitt".
- **FZ-Holen:** `git fetch origin +refs/heads/<b>:refs/remotes/origin/<b>`; jeder Lese- oder Aufsetzschritt danach nur auf `origin/<b>`.
- **FZ-Arbeitskopie:** `mkdir -p ../<projekt>-worktrees`; `git worktree add ../<projekt>-worktrees/<name> -b <zweig> origin/<b>`; besteht der Pfad schon und ist sauber → wiederverwenden (`git -C <pfad> switch -C <zweig> origin/<b>`), sonst STOP mit Pfad.
- **FZ-PR:** (1) Art des PR (Plan, Handschritt H-nn, Abschluss) und Dateiliste zeigen, WAIT „Hochladen?"; (2) `git push -u origin <zweig>`; WAIT „PR gegen <b> anlegen?"; `gh pr create --base <b> --head <zweig>`; Link zeigen; (3) `gh pr view <n> --json mergeable,mergeStateStatus,statusCheckRollup` zeigen; nicht mergebar (`CONFLICTING`, rote Prüfung, `BLOCKED`) → Grund, Weg weiter (Konflikt: PR schließen, FZ-Holen, neuer Zweig `…-r<n+1>` vom frischen Stand, Änderung erneut anwenden; rote Prüfung: Ursache im CI-Log), Ende (FA-06); Merge-Sperre (FA-22) → Ende beim Link; sonst WAIT „PR #n mergen?"; `gh pr merge <n> --merge` (keine `--admin`, keine `--auto`). Ein Ja gilt für genau einen PR (FA-05). Nein an jeder Stelle → Satz „offen: <Schritt>; fortsetzen mit <Befehl>" und Ende (FA-02).
- **Merge-Sperre:** `gh repo view --json nameWithOwner,defaultBranchRef` ergibt `michsindlinger/specwright` **und** `<b>` = Standardzweig → kein Merge (FA-22). Forks lösen den Auto-Deploy nicht aus und sind nicht gemeint.
- **FZ-Fortsetzen:** zuerst `gh pr list --head <zweig> --state all --json number,state,mergedAt,url` (neuester zuerst): `MERGED` → nächster Ablauf (auch wenn der Zweig nach dem Merge gelöscht wurde); `OPEN` → ab Zustand/Merge; nur `CLOSED` oder keiner → `git ls-remote --heads origin <zweig>`: Zweig da → ab PR; sonst neuer Zweig `…-r<n+1>` ab Hochladen (AN-S04).

**Workflow `plan` 1.6 — neuer Step 10 „Zur Factory bringen"** (nur wenn `cards.yaml` geschrieben und Unterabschnitt nicht „Kein Schnitt: …"; nach 9b-Commit oder `--karten`-Commit; bei erneutem `/plan INT-…` auf freigegebenem, geschnittenem Plan direkt hierher, FZ-Fortsetzen):

- 10a Plan-PR (Ablauf A, erster Plan-PR): FZ-Holen; FZ-Arbeitskopie `INT-…-plan`, Zweig `plan/INT-…`; Dateien aus dem Planungs-Commit übernehmen: `git -C <wt> checkout <planungs-sha> -- intent/INT-…-*/` plus jede `decisions[].adr` aus `cards.yaml`, die auf `origin/<b>` fehlt (`git cat-file -e origin/<b>:<pfad>`) (FA-03, AN-S01). Fehlt eine solche ADR auch im Planungs-Commit (nicht eingecheckt) → STOP mit Pfad, vor dem Hochladen. ADRs, die keine Karte nennt, gehen nicht mit (Wortlaut AK-02). `git -C <wt> diff --cached --name-only` = Dateiliste (FA-04); Commit `plan(INT-…): Plan zur Factory`; dann FZ-PR. Ende des Laufs (gemergt, abgelehnt oder Fehler): `git worktree remove <wt>`, wenn sauber; Fortsetzen baut sie aus dem entfernten Stand neu (FZ-Fortsetzen).
- 10b Karten anlegen (Ablauf B): FZ-Holen; `git -C <wt> switch --detach origin/<b>`; Vorschau `npm --prefix "$SPECWRIGHT_FACTORY_DIR" run --silent create-cards -- "<Betriebsdatei>" INT-… --repo "<wt>"` → Ausgabe unverändert zeigen (FA-07, FA-09); Exit 2 → Meldung zeigen, Ende (FA-12); Ausgabe meldet 0 anzulegen → „alle Karten stehen am Board", keine Frage; sonst WAIT „Diese n Karten anlegen?"; gleicher Aufruf mit `--apply`, Ausgabe zeigen (FA-08).
- 10c Ausgelassen: `ready-check` wie Step 9c, aber auf `<wt>` im Stand `origin/<b>` → Karten mit `ready: false` = nicht ready (Beleg `card-creation.ts:126-129`) → Wahl „neu schneiden (neuer Plan-PR)" / „als Handschritt" (bei **Neuschnitt-Runden** ≥ 2 nur „als Handschritt"; Zähler aus `origin/<b>:…/plan.md` §7, denn nach dem Plan-PR ist der Factory-Zweig der Arbeitsstand, B-03). Beide ändern `cards.yaml` und §7 (Tabellen, Runden + 1) in einer FZ-Arbeitskopie `INT-…-plan` auf **frischem `origin/<b>`**, nie per Kopie aus dem Planungs-Zweig, damit `done`-Vermerke auf dem Factory-Zweig erhalten bleiben; Neuschnitt läuft durch 9c-Schritte 3–5 (`ready-check`) in dieser Arbeitskopie; Commit `plan(INT-…): Karten neu geschnitten`, Zweig `plan/INT-…-r<n>`, FZ-PR, dann 10b (FA-10). Übrige ausgelassene Karten (ready, aber wartend): Ausgabe der Factory steht schon da, Satz „kommt mit einem späteren Anlegen, sobald der Grund entfällt", keine Wahl (FA-11). Keine Auswertung der Factory-Texte.
- Step 9c schreibt zusätzlich in §7 die Zeilen **Factory-Zweig:** `<b>` und **Neuschnitt-Runden:** n (n aus 9c-Schritt 5). Regel in 9c-Schritt 6: beim Neuschreiben von §7 beide Zeilen erhalten.
- Wiederaufnahme (Step 1): `/plan INT-…` auf freigegebenem Plan mit `cards.yaml` → Step 10 über FZ-Fortsetzen (kein Neuplanen). `/plan INT-… --karten`, wenn `origin/<b>` die Kartendatei schon trägt → STOP „Schon geschnitten und auf <b>; fortsetzen mit `/plan INT-…`, Neuschnitt über Step 10c."

**Workflow `build` 1.4 — Abzweig in Step 1:** `cards.yaml` im Intent-Ordner und §7 nicht „Kein Schnitt" → geschnittener Plan → Step 1b statt GIT/`in_umsetzung` und statt Step 2–6. Sonst wörtlich wie heute (FA-23).

- 1b Überblick (Ablauf C): FZ-Klären, FZ-Holen; `git cat-file -e origin/<b>:intent/INT-…-*/cards.yaml` fehlt → „Plan liegt noch nicht auf <b>; fortsetzen mit `/plan INT-…`", Ende. Sonst `git show origin/<b>:…/cards.yaml` lesen; je Handschritt Zeile `H-nn · was · wer · Stand`: `done` → „erledigt am …"; `before`/`afterIntent` → „frei"; `after: K-nn` → „wartet auf K-nn" (FA-13). WAIT Wahl + „mit Code / ohne Code". Gewählt `after: K-nn` → Frage „Welcher PR hat K-nn umgesetzt? (Nummer steht an der Karte am Board)" (D1); `gh pr view <n> --json state,baseRefName,mergedAt,title,url` muss `MERGED` mit Basis `<b>` zeigen, Titel und Link werden zur Kontrolle gezeigt; sonst Abbruch mit Grund. Die Nummer steht später in der Commit-Nachricht (`K-nn: PR #n`). Unbekannt, erledigt → Abbruch (FA-17). Kein freier → Satz mit den Karten, auf die gewartet wird, Ende. Bitte um Bau einer Karte → Absage „Karten baut die Factory" (FA-14).
- 1c Arbeitskopie: Sitzung in eigener Arbeitskopie (`git rev-parse --git-dir` ≠ `--git-common-dir`) → `git status --porcelain` leer, sonst Abbruch (FA-17, AN-S05); `git switch -c hand/INT-…-H-nn origin/<b>`. Sonst FZ-Arbeitskopie `INT-…-H-nn`, Zweig `hand/INT-…-H-nn`; Hauptcheckout unberührt (FA-18). Am Ende nennt der Lauf Pfad und `git worktree remove <pfad>` (Aufräumen selbst nicht im Umfang, Spec §8).
- 1d Mit Code (Ablauf D): Arbeit nach `what` umsetzen, Verify aus `CLAUDE.md`; in `cards.yaml` beim Handschritt `done: JJJJ-MM-TT` (Tagesdatum, AN-S06) setzen; Commit(s) `feat|chore(INT-…): H-nn …`; FZ-PR (FA-15, FA-19).
- 1e Ohne Code (Ablauf E): Nachweis erfragen, falls nicht genannt; nur `done` setzen; Commit `chore(INT-…): H-nn erledigt` mit Zeile `Nachweis: …`; FZ-PR (FA-16).
- 1f Nach Merge: Handschritt war `before: K-nn` → WAIT „Karten jetzt anlegen (`/plan` Step 10b)?" → 10b ausführen (FA-20). Danach Prüfung Abschluss.
- 1g Abschluss (Ablauf F): `origin/<b>:…/intent.md` steht schon auf `umgesetzt` (z. B. per UI-Knopf, OF-01) → Satz, nichts tun. Sonst alle Handschritte `done` auf `origin/<b>` → je Karte PR-Nummer wie in 1b nennen lassen und prüfen, dann WAIT „Alle Karten gemergt (#…), alle Handschritte erledigt. Ist das Vorhaben umgesetzt?" (D1, FA-21). Ja → Zweig `abschluss/INT-…` von `origin/<b>` (Arbeitskopie wie 1c), `intent.md` Kopf `status: "umgesetzt"`, nächste PATCH-Version, `geaendert`, Protokollzeile nach Vorlage; `plan.md` `Status: umgesetzt` (AN-S07); FZ-PR. Nein → nichts.

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Bash-Skript `specwright/scripts/factory-pr.sh` für Push/PR/Merge | jede Bestätigung braucht den Agenten ohnehin; Skript wäre neuer Lieferumfang mit Test, Bash-3.2-Pflicht und Fehlerwegen, ohne dass ein Ablauf deterministischer wird; Workflows sind Hauptagent-Text (RB-05) |
| Ausgabe von `create-cards` nach „wartet auf …"/Regelkennungen parsen | koppelt an Factory-Texte, bildet deren Unterscheidung nach (FA-24, NZ-01); `ready` aus dem JSON der vorhandenen Schnittstelle reicht |
| „Karte gemergt" über `gh pr list` mit Factory-Zweignamen ableiten | Zweignamen tragen die Board-ID, nicht `K-nn`; Abbildung bräuchte Board-Zugang oder das Namensschema der Factory (interne Regel) |
| Plan-PR aus dem Planungs-Zweig per Rebase/Cherry-Pick | nimmt fremde Commits mit, wenn der Planungs-Zweig von `main` kommt und der Factory-Zweig ein anderer ist (Spec §4 Zeile 1) |
| Muster je Workflow ausschreiben statt `factory-pr.md` | drei Schreiber derselben Regel (Plan-PR, Handschritt-PR, Abschluss-PR) laufen auseinander |
| Plan-PR im Sitzungs-Worktree durch Zweigwechsel | stört den Planungs-Zweig und dessen ungesicherte Dateien; eigener Worktree ist sauber per Konstruktion |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Ja, nur §5 und §8, keine AR-Regel.** §5 Zeile „Software Factory": zweiter Befehl `create-cards`, schreibend nur nach Bestätigung, mit Netz und den Zugängen der Factory (Specwright hält keine); Aufruf aus Workflow `plan` Step 10 und `build` Step 1f. §5 Zeile GitHub um „Workflows `plan`/`build`: Push, PR, Merge über `gh` des Rechners nach Bestätigung" ergänzt. `docs/architecture.md` in dieser PR, Änderungsprotokoll-Zeile. **ADR:** Nachtrag zu ADR-0008 (Kopplung wächst, Spec §7 Zeile 1), kein neues ADR — der Grundsatz „nur über Befehle, keine Regel doppelt" bleibt. AR-06 (keine UI-Abhängigkeit) und AR-07 (Ablage im Vorhaben-Ordner) eingehalten; AR-01 über Manifest-Zeile.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `specwright/workflows/meta/factory-pr.md` | neu | FZ-Klären, FZ-Holen, FZ-Arbeitskopie, FZ-PR (inkl. Konfliktweg und Merge-Sperre), FZ-Fortsetzen; R2-Satzform der Fragen; keine Factory-Pfade/Hosts/Namen | FA-01–FA-06, FA-19, FA-22, FA-25, AN-S04 |
| 2 | `specwright/workflows/core/plan.md` | ändern | Version 1.6; Step 1: Wiederaufnahme-Weiche (freigegeben + geschnitten → Step 10); Step 9c: Zeilen Factory-Zweig und Neuschnitt-Runden in §7; Step 9b: `NEXT` bei Schnitt → Step 10; neuer Step 10 (10a–10c); `--karten` → nach Commit Step 10 | FA-01–FA-12, FA-24, AN-S03, AN-S08 |
| 3 | `specwright/workflows/core/build.md` | ändern | Version 1.4; Overview-Satz; Step 1 Abzweig; Steps 1b–1g; Grundsatz „Karten baut die Factory" | FA-13–FA-21, FA-23 |
| 4 | `.claude/commands/specwright/plan.md` | ändern | Ablauf-Zeile „geschnitten → vier Bestätigungen, Karten anlegen" | FA-01 |
| 5 | `.claude/commands/specwright/build.md` | ändern | Ablauf-Zeile „geschnittener Plan → Handschritte statt Plan" | FA-13 |
| 6 | `specwright/manifest.tsv` | ändern | Zeile `workflow project specwright/workflows/meta/factory-pr.md …` bei den meta-Workflows, direkt nach `leser-und-rueckfragen.md` | RB-05, AR-01 |
| 7 | `docs/adr/0008-plan-ruft-eingangspruefung.md` | ändern | Abschnitt „Nachtrag 1 (2026-10-24, INT-2026-035)": `create-cards` als zweiter Befehl, Vorschau vor `--apply`, nur nach Bestätigung, Zugänge bei der Factory; Unterscheidung nicht ready über `ready`; „gemergt" nennt die Person per PR-Nummer, Specwright prüft per `gh` | Spec §7 Z.1, FA-24 |
| 8 | `docs/architecture.md` | ändern | §5 zwei Zeilen, Kopf-Stand, Änderungsprotokoll | §3 oben |
| 9 | `VERSION`, `install.sh:18`, `CHANGELOG.md` | ändern | 4.5.0; Abschnitt `## 4.5.0 - …` unter „Neu" (kein `### Format`, Vorlagen unverändert) | Konvention |
| 10 | `intent/INT-2026-035-plan-pr-handschritte/e2e-protokoll.md` | neu | Protokoll der Stichproben (Probe-Projekt ohne Namen, RB-01) | §8 |

**Nicht betroffen (ausdrücklich):** `specwright/templates/sdlc/vorhaben/plan-template.md` (die zwei neuen §7-Zeilen sind Inhalt, keine Vorlagenänderung; Format bleibt 2.1), `scripts/check-leser-marker.sh`, Web-UI (`ui/`, NZ-03, inkl. `vorhaben-abschluss.ts`), Code der Factory (NZ-05), `install-lib.sh`, Installer-Skripte außer Versionszeile.

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| Workflow `plan` Step 10 | `factory-pr.md` | Anweisung | „EXECUTE: specwright/workflows/meta/factory-pr.md" | `grep -n "factory-pr.md" specwright/workflows/core/plan.md` ≥ 2 Treffer | — |
| Workflow `build` Step 1b–1g | `factory-pr.md` | Anweisung | dito | `grep -n "factory-pr.md" specwright/workflows/core/build.md` ≥ 2 Treffer | — |
| Workflow `plan` 10b | Factory `create-cards` | Befehl | `npm --prefix "$SPECWRIGHT_FACTORY_DIR" run --silent create-cards -- … INT-… --repo … [--apply]` | `grep -n "create-cards" specwright/workflows/core/plan.md` + E2E Schritt 3/4 | — |
| Workflow `plan` 10c | Factory `ready-check` | Befehl | JSON `format: 2`, Feld `ready` | `grep -n "ready-check" specwright/workflows/core/plan.md` (9c und 10c) | — |
| `build` 1f | `plan` 10b | Anweisung | Verweis „Step 10b" | `grep -n "10b" specwright/workflows/core/build.md` | — |
| Manifest | Installer | Lieferung | Zeile `factory-pr.md` | `bash scripts/check-manifest.sh` → `✅ Manifest: …`; `bash scripts/test-installers.sh` → `T1–T8 grün` | — |
| Befehle | Workflows | Kurzfassung | Textzeilen | `grep -n "Factory-Zweig\|Handschritt" .claude/commands/specwright/{plan,build}.md` | — |
| Kontrollfall | alter Pfad | Anweisung | Bedingung `cards.yaml` | `grep -n "cards.yaml" specwright/workflows/core/build.md` zeigt die Weiche vor `git checkout -b feat/`; E2E Schritt 9 | — |
| Öffentlich-Regel | Workflow-Texte, Protokoll | Prüfung | keine Factory-Pfade/Namen | Namensliste nur im Scratchpad: `for f in ~/.factory/*/factory.yaml; do basename "$(dirname "$f")"; grep -m1 -E '^\s+repo:' "$f" \| awk '{print $2}'; done \| grep -v '^$' > "$SCRATCH/namen"`; dann `grep -nwFf "$SCRATCH/namen" specwright/workflows/meta/factory-pr.md specwright/workflows/core/{plan,build}.md docs/adr/0008-*.md intent/INT-2026-035-*/*.md` und `grep -nE '~/\.factory/[a-z]\|trello\.com' …` leer (`~` steht in Anführungszeichen, wird nicht expandiert) | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. Lesende Vorprüfung: `git fetch -q origin && git log HEAD..origin/main --oneline -- specwright/workflows .claude/commands docs/adr/0008-* docs/architecture.md specwright/manifest.tsv` leer; Factory-Schnittstelle unverändert: `grep -n "usage: npm run create-cards" "$SPECWRIGHT_FACTORY_DIR/src/engine/create-cards.ts"` zeigt `<factory.yaml> <INT-JJJJ-NNN> [--repo <dir>] [--apply]` → prüfbar durch die erwarteten Ausgaben; Abweichung → §14 vor dem ersten Edit.
1. Erste Scheibe: `factory-pr.md` + `plan` Step 10a (Plan-PR) + Manifest-Zeile → am Probe-Projekt `/plan INT-…` auf einem geschnittenen Probe-Plan bis zum gemergten Plan-PR (E2E Schritt 1–2). Berührt nur eine Schicht (Workflow-Text), die Scheibe geht aber durch alle beteiligten Systeme: Anleitung → Git → GitHub → Factory-Zweig. `bash scripts/check-manifest.sh` grün.
2. Verbreitern: `plan` 10b/10c + 9c-Zeilen + Wiederaufnahme-Weiche → E2E Schritt 3–5.
3. `build` Step 1 Abzweig + 1b–1g → E2E Schritt 6–8, Kontrollfall Schritt 9.
4. ADR-0008 Nachtrag, `architecture.md` §5/Protokoll, Befehlskurztexte, VERSION/`install.sh`/CHANGELOG → grep-Nachweise §5.
5. Verbindungen nachweisen (§5), Öffentlich-Regel-grep leer.
6. `bash scripts/verify.sh` → `verify: OK`; PR, CI grün.

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Drei Textdateien greifen über `factory-pr.md` ineinander (§5, 5 Verbindungen auf dieselbe Anleitung), und der E2E-Pfad läuft quer durch `plan` und `build`; Teile wären Worktrees für je eine Stunde Text plus eine Integration mit demselben E2E.

#### Karten für die Factory (optional)

<!-- leser: mensch -->

Kein Schnitt: keine Betriebsdatei für dieses Projekt.

### 8. Tests und Nachweis

<!-- leser: agent -->

Nahtstelle für alle AK: die Befehle `/plan INT-…` und `/build INT-…` in einer Claude-Sitzung im Klon des Probe-Projekts mit dem Specwright-Stand dieses Zweigs — die einzige öffentliche Schnittstelle, an der das Verhalten beobachtbar ist; Workflow-Text hat keine tiefere testbare Einheit. Systemgrenzen echt (GitHub, Factory, Übungs-Board), keine Mocks.

**Probe-Aufbau (vor dem Bau, §10):** frischer Klon des Probe-Projekts im Scratchpad; `SPECWRIGHT_REPO_URL=file://<dieser Worktree> bash update-specwright.sh` darin (installierte Dateien bleiben unversioniert); Probe-Vorhaben `INT-…-probe` mit `intent.md` (bypass), `plan.md` freigegeben, `cards.yaml`: K-01 (klein, ready), K-02 (absichtlich nicht ready), K-03 (ready, `dependsOn: K-02` → „Vorgänger nicht am Board"), H-01 `before: K-01` ohne Code, H-02 `afterIntent` mit Code (eine Textdatei), H-03 `after: K-01`; ein neues ADR, das K-01 nennt.

| AK / FA | Nahtstelle | Test (E2E-Schritt) | Datei | Art |
|---|---|---|---|---|
| AK-01, FA-01, FA-04 | `/plan` | 1: nach Freigabe vier getrennte Fragen; Dateiliste vor „Hochladen?" | `e2e-protokoll.md` | E2E |
| AK-02, FA-03 | `/plan` | 2: `gh pr view <n> --json baseRefName,files` → Basis = Factory-Zweig, nur `intent/INT-…-probe/**` + ADR; Planungs-Zweig absichtlich von `main` | dito | E2E |
| FA-02, FA-06 | `/plan` | 2a: „Mergen?" → nein → offen-Satz; erneut `/plan` setzt bei Merge fort (AN-S04); nach Merge mit gelöschtem Kopfzweig erneut `/plan` → erkennt `MERGED`, weiter bei 10b | dito | Kontrollfall |
| FA-03 (AN-S01) | `/plan` | 2b: ADR nur vorgemerkt, nicht eingecheckt → STOP mit Pfad vor dem Hochladen | dito | Kontrollfall |
| AK-03, FA-07, FA-08 | `/plan` | 3: Vorschau im Wortlaut der Factory, dann `--apply`, Ergebnis | dito | E2E |
| AK-04, FA-09–FA-11 | `/plan` | 4: K-02 → Wahl (zwei Wege); K-01 „wartet auf Handschritt H-01" und K-03 „Vorgänger K-02 nicht am Board" ohne Wahl; Wahl „als Handschritt" → neuer Plan-PR `-r1` vom frischen Factory-Stand | dito | Kontrollfall |
| FA-10 (Erhalt `done`) | `/plan` | 4a: nach Schritt 7 (H-01 erledigt) zweiter Neuschnitt → `done` von H-01 bleibt im neuen Plan-PR erhalten (`gh pr diff`) | dito | Kontrollfall |
| FA-12 | `/plan` | 5: Betriebsdatei-Kopie mit falscher Board-Liste → Exit 2, Meldung, nichts weiter | dito | Kontrollfall |
| AK-06, FA-13, FA-14 | `/build` | 6: Überblick H-01 frei, H-02 frei, H-03 „wartet auf K-01"; Bitte „bau K-01" → Absage | dito | E2E |
| AK-08, FA-16, FA-20 | `/build` | 7: H-01 ohne Code → Nachweis erfragt, PR nur `cards.yaml`, Commit nennt Nachweis; nach Merge Angebot Anlegen → K-01 angelegt | dito | E2E |
| AK-07, AK-10, FA-15, FA-18, FA-19 | `/build` | 8: H-02 mit Code aus Hauptcheckout des Klons → neuer Worktree `…-H-02`, Zweig `hand/…`, PR mit Datei + `done`; Hauptcheckout `git status` unverändert | dito | E2E |
| AK-09, FA-17 | `/build` | 8a: H-03 wählen, PR-Nummer eines offenen oder fremden PR nennen → Abbruch mit Grund; schmutzige Arbeitskopie → Abbruch, `git status` vorher = nachher | dito | Kontrollfall |
| AK-11, FA-21 | `/build` | 8b: alle `done`, Karten-PRs genannt und geprüft, Bestätigung → Abschluss-PR setzt `intent.md`/`plan.md` auf `umgesetzt`; Lauf mit „nein" → nichts; Lauf nach Merge → „schon umgesetzt", nichts | dito | E2E |
| AK-12, FA-23 | `/plan`, `/build` | 9: Probe-Vorhaben ohne `cards.yaml` → `NEXT: /build`, Zweig `feat/…`; dazu `verify` | dito | Kontrollfall + Test |
| AK-05, FA-05, FA-22, FA-24, FA-25 | Workflow-Text | Review: jede Merge-Stelle hinter einem WAIT; Merge-Sperre-Bedingung; keine Auswertung von Factory-Texten; Öffentlich-grep §5 leer | PR | Review |

- **Verify-Befehl:** `bash scripts/verify.sh` → `verify: OK`, Ausgabe im PR. CI ist die Wahrheit; Bezugsliste nie nach lokalem Lauf kürzen.
- **Angeschlossen (E2E-Pfad):** Schritte 1–8b am Probe-Projekt durchlaufen alle Verbindungen aus §5; Protokoll mit Befehl, Frage, Antwort, Ergebnis je Schritt in `e2e-protokoll.md` ohne Projektnamen, Board-Links oder Pfade (RB-01). E2E-Falle aus `CLAUDE.md`: Trust-Dialog der frischen Sitzung erst Pfeil runter, dann Enter.
- **Bugfix:** entfällt. **UI:** entfällt (NZ-03).

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| R1: Agent mergt ohne Bestätigung oder mit einer Bestätigung zwei PRs | niedrig | hoch | WAIT je PR, „gilt für genau einen PR" als Regel in `factory-pr.md`; E2E 2a; kein `--auto`/`--admin` | Michael im Lauf; Revert-PR auf dem Factory-Zweig |
| R2: Person nennt für K-nn einen falschen, aber gemergten PR | niedrig | mittel | PR-Nummer wird bei GitHub auf `MERGED` und Basis `<b>` geprüft, Titel zur Kontrolle gezeigt, Nummer in der Commit-Nachricht | Michael beim Lesen des gezeigten Titels; Review des Handschritt-PR |
| R2a: Neuschnitt-PR überschreibt `done`-Vermerke | niedrig | hoch | Neuschnitt ändert nur den frischen Stand von `origin/<b>`, nie eine Kopie aus dem Planungs-Zweig; E2E 4a | E2E vor Merge |
| R3: Factory ändert Aufruf oder Format von `create-cards` | niedrig | mittel | Schritt 0 prüft die Usage-Zeile; Exit 2 → Meldung, nichts weiter | Lauf bricht sichtbar ab |
| R4: Plan-PR mit Konflikt, weil `cards.yaml` auf dem Factory-Zweig schon anders steht (zweiter Plan-PR) | mittel | niedrig | Zweig immer frisch von `origin/<b>`; Konflikt → FA-06, Grund, Ende | Michael |
| R5: Kontrollfall bricht (Projekt ohne Factory sieht neues Verhalten) | niedrig | hoch | einzige Weiche `cards.yaml` + Satz „Kein Schnitt"; E2E 9 | E2E vor Merge |
| R6: Probe-Lauf stört fremde Arbeit am Board | niedrig | mittel | nur Übungs-Board des Probe-Projekts (AN-04), Bestätigung vor dem Bau | Michael |
| R7: Kontext der Bausitzung über ~120k durch E2E-Ausgaben | mittel | mittel | Ausgaben ins Protokoll schreiben statt in den Chat; Kontextdeckel aus `build` Step 3 | Statuszeile |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Probe-Projekt bestätigen: Betriebsdatei unter `~/.factory/` mit Factory-Zweig ≠ `main` und Übungs-Board (Vorschlag im Chat, Name nicht im Repo, RB-01); Weg: Liste `~/.factory/*/factory.yaml`, Feld `code.branch` | Michael | vor dem Bau | [x] 2026-10-24 im Chat bestätigt |
| Freigabe für Update-Lauf und PRs/Merges am Probe-Projekt (`SPECWRIGHT_REPO_URL=file://… bash update-specwright.sh`, Weg belegt `update-specwright.sh:12`; Merges nur auf dessen Factory-Zweig, `CLAUDE.md` „Nie", ER-09) | Michael | vor dem Bau | [x] 2026-10-24 für den ganzen E2E freigegeben |
| `create-cards --apply` am Übungs-Board im E2E jeweils im Lauf bestätigen (ER-09) | Michael | während E2E | [x] durch die Freigabe oben abgedeckt, im Lauf je Anlegen bestätigt |
| Review und Merge des Specwright-PR nach `main` (löst Auto-Deploy der UI aus) | Michael | nach CI grün | [ ] |
| Nachtrag zu ADR-054 (Arbeitsort Handschritte D3/D4) im Factory-Repo, getrennt (NZ-05) | Michael | nach Merge | [ ] |

### 11. Schätzung

<!-- leser: mensch -->

6–10 h. Text der Workflows 2–3 h; Unsicherheit liegt im E2E (Probe-Vorhaben anlegen, Factory-Läufe, Board-Rundlauf, mögliche Nacharbeit an der Anleitung nach Befunden) mit 3–6 h.

**Kontext für den Bau:** ~105k Tokens — Plan ~20k, zu lesende Dateien ~30k (`plan.md` 12k, `build.md` 6k, Spec/ADR/§5/Manifest-Ausschnitte 12k), Änderungen ~15k, Prüfausgaben ~40k (E2E, verify). Unter der Grenze ~120k, aber knapp; E2E-Ausgaben gehen ins Protokoll, nicht vollständig in den Chat.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| S1, „Karte gemergt" ist aus Git ohne Board nicht erkennbar (Spec §7 offen) | Self | angenommen: die Person liefert die Angabe im Lauf, weil kein lesender Factory-Befehl sie liefert und Board-Zugänge bei der Factory bleiben; Form durch E1 verschärft (PR-Nummer, Prüfung per `gh`) | §3 Ansatz 1b/1g, In einfachen Worten, ADR-Nachtrag |
| S2, nicht ready und wartend unterscheiden, ohne Factory-Texte zu parsen | Self | angenommen: `ready` aus `ready-check` auf dem gemergten Stand, weil das die bestehende JSON-Schnittstelle ist (FA-24) | §3 10c, §2 |
| S3, Zähler der Neuschnitt-Runden geht zwischen Sitzungen verloren | Self | angenommen: Zeile **Neuschnitt-Runden** in §7, weil der Plan ohnehin per Plan-PR wandert | §3 9c, §4 #2 |
| S4, Plan-PR braucht neue ADRs, die eine Karte nennt (AN-S01) | Self | angenommen: Auswahl über `decisions[].adr` der Kartendatei, die auf dem Factory-Zweig fehlen; keine eigene Regel | §3 10a |
| S5, dasselbe PR-Muster in drei Abläufen | Self | angenommen: gemeinsame Anleitung `factory-pr.md` mit Manifest-Zeile, weil drei Schreiber derselben Regel auseinanderlaufen | §4 #1, #6 |
| S6, Merge-Sperre braucht eine prüfbare Erkennung des Specwright-Repos | Self | angenommen; Erkennung durch E2 ersetzt (Repo-Name statt Datei `manifest.tsv`) | §3 Merge-Sperre |
| S7, Zweigwechsel im Sitzungs-Worktree gefährdet ungesicherte Planungsdateien | Self | angenommen: eigener Plan-Worktree `…-plan` | §3 10a |
| S8, `create-cards` holt nicht selbst (Spec §7) | Self | angenommen: FZ-Holen mit explizitem Refspec vor jedem Lesen | §3 |
| S9, Skript statt Text für Push/PR/Merge | Self | abgelehnt: jede Stufe braucht ohnehin eine Agenten-Rückfrage; Skript brächte Test- und Bash-3.2-Last ohne Gewinn | §3 Alternativen |
| E1, bloße Bestätigung „K-nn gemergt" ohne Prüfung (4 Reviewer, 2 einig) | extern | angenommen mit Änderung: Person nennt die PR-Nummer der Karte, Specwright prüft `MERGED` + Basis per `gh pr view`; volle Zuordnung Karte → PR bliebe nur mit Board-Zugang oder neuem Factory-Befehl möglich (NZ-05) | §3 1b/1g, §8 8a/8b, §9 R2, In einfachen Worten |
| E2, Merge-Sperre über Datei `manifest.tsv` ist brüchig | extern | angenommen: Erkennung über `nameWithOwner` = `michsindlinger/specwright` und Standardzweig; bleibt im Specwright-Repo heute ohne Factory ungenutzt, ist aber von FA-22 verlangt | §2, §3 Merge-Sperre |
| E3, zweiter Plan-PR kollidiert, kein Rückweg | extern | angenommen mit Präzisierung: zwei Vorhaben teilen keine `cards.yaml` (je Vorhaben-Ordner); Konflikte entstehen nur im selben Vorhaben. Rückweg in FZ-PR festgelegt (schließen, frisch holen, `-r<n+1>`); dabei gefundener echter Fehler: Neuschnitt aus dem Planungs-Zweig hätte `done`-Vermerke überschrieben → Neuschnitt immer auf frischem `origin/<b>` | §3 FZ-PR, 10c, §8 4a, §9 R2a |
| E4, Lebenszyklus der Arbeitskopien offen | extern | angenommen: FZ-Arbeitskopie mit `mkdir -p` und Wiederverwendung; Plan-Arbeitskopie wird am Laufende entfernt; Handschritt-Arbeitskopien bleiben (Spec §8), Lauf nennt Pfad und Befehl | §3 FZ-Arbeitskopie, 10a, 1c |
| E5, Neuschnitt-Zähler beim Fortsetzen | extern | angenommen: Zähler aus `origin/<b>:…/plan.md` (B-03); 9c-Schritt 6 erhält beide Zeilen | §3 10c, 9c |
| E6, FZ-Fortsetzen erkennt gelöschte Kopfzweige und geschlossene PRs falsch | extern (Minderheit) | angenommen: PR-Zustand vor Zweig, `MERGED` gewinnt, `CLOSED` → neuer Zweig, neuester PR zählt; billig und behebt eine echte Falle | §3 FZ-Fortsetzen, §8 2a |
| E7, nicht eingecheckte ADR fehlt still im Plan-PR | extern (Minderheit) | angenommen: STOP mit Pfad vor dem Hochladen | §3 10a, §8 2b |
| E8, drei PR-Arten mit unterschiedlicher Tragweite unter einer Regel | extern (Minderheit) | abgelehnt: FA-05/FA-19 verlangen dieselbe Bestätigung je Stufe und PR; jede Frage nennt PR-Art und Dateiliste, damit die Tragweite sichtbar ist (eingebaut in FZ-PR Schritt 1) | §3 FZ-PR |
| E9, Doppel-Abschluss mit UI-Knopf; Commits laufen durch Hooks des Zielprojekts | extern (Minderheit) | teils angenommen: 1g prüft zuerst, ob `origin/<b>` schon `umgesetzt` trägt. Hooks: abgelehnt, weil jeder Bau-Commit sie durchläuft und sie Schutz des Zielprojekts sind; die UI umgeht sie nur wegen Plumbing (INT-2026-024) | §3 1g, §8 8b |
| E10, ADR ohne Kartenbezug wird nicht mitgenommen | extern (Minderheit) | angenommen als Klarstellung: gewollt, Wortlaut AK-02 | §3 10a |
| E11, `factory-pr.md` hat Seiteneffekte, passt nicht nach `meta/` | extern (Minderheit) | abgelehnt: `meta/` sammelt Abläufe, die mehrere Workflows per EXECUTE nutzen (`pre-flight.md`); Seiteneffekte stehen hinter WAIT, nicht hinter dem Ablageort | — |
| E12, `~` im Öffentlich-grep wird nicht expandiert | extern (Minderheit) | abgelehnt für den Grund (in Anführungszeichen ist `~` literal, genau gewollt); dabei gefunden: das Muster nannte selbst einen Probe-Projektnamen im öffentlichen Plan → Namensliste nur im Scratchpad | §5 Öffentlich-Regel |
| E13, Zeilennummer im Manifest brüchig | extern (Minderheit) | angenommen: Ort beschrieben statt Zeilennummer | §4 #6 |
| E14, `--karten` nach Unterbrechung unklar | extern (Minderheit) | angenommen: `--karten` auf schon gemergtem Schnitt → STOP mit Verweis auf `/plan INT-…` und 10c | §3 Wiederaufnahme |
| E15, `ready: false` könnte auch wartende Karten treffen | extern (Minderheit) | abgelehnt mit Beleg: Factory `card-creation.ts:126-136` lässt bei `!ready` mit Prüfgründen aus, „wartet"/„Vorgänger" nur für ready Karten | §2 |
| E16, E2E prüft „Vorgänger nicht am Board" nicht | extern (Minderheit) | angenommen: K-03 mit `dependsOn: K-02` im Probe-Vorhaben | §8 Probe-Aufbau, Schritt 4 |

**Minimalinvasiv geprüft:** wiederverwendet werden Factory-Klärung aus `plan` Step 1, `ready-check`-Aufruf aus Step 9c, Kopf-Regel des Abschlusses aus `build` Step 6, Worktree-Schema aus `build` Step 2, Fetch-Muster aus INT-2026-024, `update-specwright.sh` mit `file://` für den Probe-Aufbau. Gestrichen: eigenes Skript, Vorlagenänderung (Format bleibt 2.1), Aufräumen der Handschritt-Zweige (Spec §8), UI-Änderung.

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-10-24: Befund: Spec B-04 nennt einen Handschritt nach einer Karte „frei", sobald die Karte gemergt ist; §3 1b zeigt ihn als „wartet auf K-nn", bis die Person den PR der Karte nennt und er geprüft ist — als Entscheidung D1 an Michael (Was musst du entscheiden, Punkt 1). Nach den externen Findings erneut gelesen: „Was kann schiefgehen" (3)/(3a) und §9 R2/R2a decken §3 10c und 1b.

### 13. Definition of Done

<!-- leser: agent -->

- [x] Jede FA/AK aus Abschnitt 8 hat einen Nachweis (E2E-Schritt, Kontrollfall oder Review) im Protokoll.
- [x] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [x] E2E-Pfad läuft (Abschnitt 8), Protokoll ohne Projektnamen.
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün (CI ist die Wahrheit).
- [x] `docs/architecture.md` §5 und ADR-0008-Nachtrag in dieser PR.
- [x] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [x] Abweichungen von diesem Plan in Abschnitt 14 eingetragen.
- [x] 2x-Regel-Check, Vorschlag im PR.
- [ ] Abschlussbericht nach R3, endet mit dem Block „Für das Board"; Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-10-24 | §3 10a Schritt 5: `decisions[].adr` ist eine Kennung `ADR-nnn`, kein Pfad (Factory `src/core/readiness.ts:40,373`); Datei wird über Entscheidungsordner (`knowledge.decisions`, sonst `docs/decisions`) und Nummer im Dateinamen gefunden | Plan nahm Pfad an; beim Probe-Aufbau aufgefallen (EP-11 „nicht lesbar“) | §3 10a, `plan.md`-Workflow Step 10a |
| 2026-10-24 | `plan`-Workflow 10b Schritt 7: Plan-Arbeitskopie am Ende von 10b/10c entfernen, auch wenn 10b aus `/build` 1f gestartet wird | E2E Schritt 7: Arbeitskopie `…-plan` blieb nach dem Anlegen aus `/build` stehen; §3 regelte das Entfernen nur für 10a | §3 10b |
| 2026-10-24 | E2E über `claude -p` mit `--resume` statt interaktiver Sitzung; Specwright per `install.sh` (Probe-Repo hatte keine Installation) statt `update-specwright.sh` eingespielt, danach Updates per `update-specwright.sh` | Rückfragen werden je Runde beantwortet, Ausgaben landen in Dateien statt im Chat (R7); Trust-Dialog entfällt | §8 Probe-Aufbau |
| 2026-10-24 | Karten-PRs von K-01/K-03 für 8b von Hand nachgestellt (`[PROBE] … simuliert`) | auf dem Übungs-Board läuft keine Factory-Engine; der Abschluss braucht gemergte Karten-PRs | §8 Schritt 8b |
| 2026-10-24 | Kontrollfall 9 nur über `/build` (Step 1) gefahren; `/plan` ohne Schnitt per Review (Step 9b `NEXT` und Step 10 hängen an `cards.yaml` und „Kein Schnitt“) | `/plan` auf einem freigegebenen Plan ohne `cards.yaml` startet die volle Planung im Plan Mode | §8 Schritt 9 |
| 2026-10-24 | Probe-Vorhaben K-01/K-03 mit Testart `verify`, `check: Test` | das Probe-Repo hat keine Projektdatei; eingerichtet ist nur `verify` (Eingangsprüfung EP-01) | §8 Probe-Aufbau |
