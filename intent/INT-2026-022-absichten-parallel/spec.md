# Spec: UI: Mehrere Absichten parallel — Formular bleibt, Übersicht zeigt sie sofort, jede im eigenen Worktree

> **Intent:** `intent.md` (INT-2026-022, Version 1.0.0)
> **Status:** freigegeben
> **Erstellt:** 2026-09-19 · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-19
> **Gelesene Projekt-Docs:** `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` (Stand: Commit 9a14336)

<!-- Die Spec ist FACHLICH. Sie beschreibt, was Nutzer erleben und was fachlich gelten muss.
     Nicht hinein gehören: Dateien, Komponenten, Datenbanktabellen, Bibliotheken, Architekturentscheidungen. Das ist plan.md.
     Die Projekt-Docs werden gelesen und dürfen hier nur BEDENKEN markieren (Abschnitt 7). Sie entscheiden nichts.
     Jede Anforderung verweist auf ein Ziel oder Abnahmekriterium der intent.md. Keine Anforderung ohne Herkunft. -->

## 1. Zusammenfassung

<!-- leser: mensch -->

Nach dem Umbau behandelt die Web-UI mehrere Absicht-Sitzungen je Projekt als Normalfall. Die Seite „Neue Absicht" zeigt immer das Formular; laufende Absicht-Sitzungen des Projekts stehen darunter als Liste mit Sitzungsname, Arbeitskopie und „Im Terminal öffnen" (Z-01, AK-01 bis AK-04). Jede aus der UI gestartete Absicht läuft in einer eigenen Arbeitskopie des Projekts, der Hauptcheckout bleibt unberührt; geht das nicht, sagt die UI warum und startet nichts (Z-03, AK-10, AK-11). Die Übersicht zeigt eine begonnene Absicht sofort nach „Starten" als Eintrag ohne Ordner und führt per Klick in ihre Sitzung; entsteht der Ordner, wird der Eintrag zur normalen Vorhaben-Zeile (Z-02, AK-06 bis AK-09). Der Workflow `/intent` bestimmt die nächste Kennung gegen alle Arbeitskopien und Zweige des Projekts, damit parallele Sitzungen keine Nummer doppelt vergeben (Z-04, AK-12). Was nach dem Entstehen des Ordners passiert — Wechsel auf die Vorhaben-Seite, Terminal daneben, Zustellung des Absichtstexts — bleibt wie in INT-2026-008 und INT-2026-011 (AK-05).

## 2. Nutzer und Abläufe

<!-- leser: mensch -->

<!-- Je Ablauf: wer, Auslöser, Schritte aus Nutzersicht, Ergebnis. Jeder Ablauf deckt mindestens ein AK ab. -->

### Ablauf A: Eine weitere Absicht beginnen, während eine läuft (AK-01, AK-02, AK-04, AK-10)

<!-- leser: mensch -->

1. Michael öffnet am Mac „Neue Absicht" für ein Projekt, in dem bereits eine Absicht-Sitzung läuft, deren Ordner noch nicht existiert.
2. Die Seite zeigt oben das Formular: Textfeld, Modellwahl, „Starten". Darunter steht die Liste „Laufende Absicht-Sitzungen" mit einem Eintrag je anhängiger Sitzung des Projekts: Sitzungsname, Arbeitskopie, Zustand (arbeitet, wartet, Dialog), Knopf „Im Terminal öffnen". Rechts ist das Terminal angedockt und zeigt die jüngste dieser Sitzungen.
3. Michael schreibt den Absichtstext, wählt ein Modell und drückt „Starten".
4. Das System legt eine neue Arbeitskopie des Projekts an und startet dort die Absicht-Sitzung mit dem Text als erster Eingabe. Der Hauptcheckout des Projekts ändert sich dabei nicht.
5. Die Seite bleibt. Das Textfeld ist leer, die Modellwahl steht noch. In der Liste erscheint die neue Sitzung als weiterer Eintrag; das angedockte Terminal wechselt auf den Tab dieser neuen Sitzung. Ein Toast meldet „Sitzung gestartet — Vorhaben entsteht".
6. Ergebnis: zwei Absicht-Sitzungen laufen nebeneinander in getrennten Arbeitskopien; Michael kann sofort eine dritte beginnen oder über die Liste in eine der laufenden wechseln.

### Ablauf B: Vom Start bis zum Ordner (AK-05, AK-08)

<!-- leser: mensch -->

1. Michael bleibt auf „Neue Absicht" oder wechselt zur Übersicht; die gestartete Sitzung führt im Terminal das Interview.
2. Claude legt den Vorhaben-Ordner in der Arbeitskopie der Sitzung an.
3. Ist „Neue Absicht" noch offen und ist es die Sitzung, die diese Seite zuletzt gestartet oder aus der Übersicht geöffnet hat, wechselt die UI auf die Vorhaben-Seite dieses neuen Vorhabens; das angedockte Terminal zeigt weiter denselben Tab mit stehendem Verlauf (wie INT-2026-008 AK-03, INT-2026-011).
4. Entsteht der Ordner einer anderen Sitzung aus der Liste, bleibt die Seite; deren Eintrag verlässt die Liste, weil die Sitzung jetzt ein Vorhaben hat.
5. In der Übersicht wird der Eintrag der Sitzung zur normalen Vorhaben-Zeile mit Kennung, Titel, Phase und Arbeitskopie. Die Absicht erscheint zu keinem Zeitpunkt doppelt.
6. Ergebnis: das Vorhaben ist wie bisher erreichbar; Zustellung des Absichtstexts nach der ersten Frage, Protokoll und Glocke verhalten sich wie heute.

### Ablauf C: Begonnene Absicht in der Übersicht finden und hinspringen (AK-06, AK-07)

<!-- leser: mensch -->

1. Michael drückt „Starten" auf „Neue Absicht" und wechselt zur Übersicht (Cmd+← oder Kopfzeile).
2. Innerhalb von 2 s nach dem Sitzungsstart steht dort ein Eintrag für die begonnene Absicht: Projekt, Arbeitstitel (erste Zeile des Absichtstexts), Kennzeichnung „Absicht · entsteht", Sitzungsname, Arbeitskopie, Zustand der Sitzung. Der Eintrag ordnet sich nach dem Zustand der Sitzung in die bestehenden Gruppen der Übersicht ein (Wartet auf dich, Läuft).
3. Michael klickt den Eintrag.
4. Am Mac öffnet die UI „Neue Absicht" des Projekts; das angedockte Terminal zeigt den Tab genau dieser Sitzung, und ihr Eintrag in der Liste unter dem Formular ist hervorgehoben. Auf dem Handy öffnet die UI die Sitzung im Terminal (Vollbild), wie ein Sprung aus der Glocke.
5. Ergebnis: Michael ist in der Sitzung, ohne über das allgemeine Terminal nach dem richtigen Tab zu suchen.

### Ablauf D: Absicht-Sitzung endet ohne Ordner (AK-09)

<!-- leser: mensch -->

1. Eine anhängige Absicht-Sitzung endet, bevor ein Vorhaben-Ordner entstand: Michael schließt den Tab, beendet Claude, oder die Sitzung stirbt.
2. Innerhalb von 2 s verschwindet ihr Eintrag aus der Übersicht und aus der Liste unter dem Formular. Kein Toast, keine Nachfrage.
3. Ihre Arbeitskopie wird wie heute bei Sitzungsende behandelt: sauber (keine ungesicherten Änderungen) → entfernt samt Zweig; mit Änderungen → bleibt liegen und ist auf der Projekt-Seite als Arbeitskopie sichtbar.
4. Ergebnis: Übersicht und Liste zeigen nur lebende Absicht-Sitzungen; nichts Uncommittetes geht verloren.

### Ablauf E: Arbeitskopie lässt sich nicht anlegen (AK-11)

<!-- leser: mensch -->

1. Michael drückt „Starten" in einem Projekt, das kein Git-Repository ist, oder in dem die Worktree-Isolation abgeschaltet ist (RB-03), oder in dem das Anlegen der Kopie scheitert (z. B. Zweig- oder Ordnername belegt).
2. Das System startet keine Sitzung. Unter dem Knopf erscheint der Grund mit dem nächsten Schritt: „Keine Arbeitskopie möglich: Worktree-Isolation ist für dieses Projekt abgeschaltet — in Projekt › Einstellungen einschalten oder die Absicht im Terminal starten." beziehungsweise „Keine Arbeitskopie möglich: kein Git-Repository — Absicht im Terminal starten."
3. Der Absichtstext bleibt im Feld stehen; Michael kann ihn kopieren oder die Einstellung ändern und erneut starten.
4. Ergebnis: es gibt keinen stillen Start im Hauptcheckout.

### Ablauf F: Absicht-Sitzung von Hand im Terminal (NZ-02, AK-02, AK-03)

<!-- leser: mensch -->

1. Michael tippt in einem Claude-Tab des Projekts `/specwright:intent` — im Hauptcheckout oder in einer beliebigen Arbeitskopie.
2. Die Sitzung erscheint wie heute als anhängige Absicht des Projekts: in der Liste unter dem Formular und als Eintrag in der Übersicht; als Arbeitstitel gilt der Sitzungsname, weil kein Absichtstext bekannt ist.
3. Tippt Michael in einem zweiten Tab derselben Arbeitskopie erneut `/specwright:intent`, zeigt die Liste unter beiden Einträgen den Hinweis: „Beide laufen in ‚main' — der nächste Ordner wird der älteren Sitzung ‚…' zugeordnet."
4. Ergebnis: Hand-Sitzungen werden nicht in eine Arbeitskopie gezwungen; die Zuordnungsregel bleibt und ist sichtbar (NZ-01).

### Ablauf G: Dasselbe am Handy (AK-02, AK-07)

<!-- leser: mensch -->

1. Michael öffnet „Neue Absicht" am Handy. Formular oben, Liste der laufenden Absicht-Sitzungen darunter, ohne angedocktes Terminal.
2. „Starten" verhält sich wie am Mac: Seite bleibt, Feld leer, neuer Eintrag in der Liste; das Terminal öffnet sich nicht von selbst (wie heute nach INT-2026-010).
3. „Im Terminal öffnen" in der Liste und der Klick auf einen Eintrag der Übersicht öffnen die Sitzung im Vollbild-Terminal.
4. Ergebnis: dieselben Informationen, eine Aktion je Schritt; keine neuen Rahmen-Knöpfe (NZ-05).

### Ablauf H: Die Sitzung bestimmt ihre Kennung (AK-12)

<!-- leser: mensch -->

1. Eine Absicht-Sitzung — aus der UI in einer frischen Arbeitskopie oder von Hand — erreicht den Punkt, an dem `/intent` die nächste Kennung INT-JJJJ-NNN festlegt.
2. Der Workflow holt zuerst die Verweise des entfernten Repositories nach (nur lesen, kein Zusammenführen). Dann bestimmt er die höchste vorhandene Nummer des laufenden Jahres über den Ordner `intent/` der eigenen Arbeitskopie, den Ordner `intent/` aller anderen Arbeitskopien des Projekts und die Ordner `intent/` aller lokalen und entfernten Zweige.
3. Schlägt das Nachholen fehl (offline), nimmt der Workflow, was lokal bekannt ist, und vermerkt im Kopf der Absicht, dass die Kennung ohne entfernten Stand vergeben wurde.
4. Ergebnis: zwei parallel begonnene Absichten bekommen verschiedene Nummern, auch wenn ihre Arbeitskopien von demselben Stand abzweigen.

### Ablauf I: Betrieb — Arbeitskopien nach Sitzungsende (RB-02, AN-03)

<!-- leser: mensch -->

1. Eine Absicht-Sitzung mit Ordner endet (regulär, per ✕, durch Neustart des Backends). Die Arbeitskopie enthält den uncommitteten Ordner des Vorhabens.
2. Die Arbeitskopie bleibt stehen: einerseits, weil sie ungesicherte Änderungen trägt, andererseits, weil ein offenes Vorhaben darin liegt (RB-02). Die Vorhaben-Zeile zeigt weiter die Arbeitskopie; „Nächster Schritt" und Wiederaufnahme (INT-2026-019) arbeiten darin.
3. Ein Sitzungs-Worktree ohne Vorhaben und ohne Änderungen wird wie heute beim Sitzungsende und beim Wiederanlauf entfernt.
4. Ergebnis: es entsteht kein neuer Aufräum-Vorgang; das Umbenennen des Zweigs, die PR-Anlage und das Entsorgen alter Kopien bleiben außerhalb (NZ-03).

## 3. Fachliche Anforderungen

<!-- leser: mensch -->

<!-- Eine Zeile = eine prüfbare Aussage. Modalverben groß. Herkunft = AK/Z/NZ aus intent.md oder „neu (Grund)". -->

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-01 | Wenn „Neue Absicht" geöffnet wird, MUSS die Seite Textfeld, Modellwahl und „Starten" zeigen — unabhängig davon, ob und wie viele Absicht-Sitzungen des Projekts anhängig sind. | AK-01 | Test |
| FA-02 | Solange mindestens eine Absicht-Sitzung des Projekts anhängig ist, MUSS unter dem Formular eine Liste stehen, die je Sitzung Sitzungsname, Arbeitskopie, Zustand (arbeitet, wartet, Dialog, „Text wird nach der ersten Frage übergeben") und den Knopf „Im Terminal öffnen" zeigt; Reihenfolge: älteste zuerst. | AK-02 | Test |
| FA-03 | Ist keine Absicht-Sitzung des Projekts anhängig, DARF die Liste nicht erscheinen — auch keine leere Überschrift. | AK-02, neu (design.md §1: kein Element ohne Aufgabe) | Test |
| FA-04 | Wenn zwei oder mehr anhängige Sitzungen des Projekts in derselben Arbeitskopie laufen, MUSS die Liste bei diesen Einträgen sagen, dass der nächste Ordner in dieser Arbeitskopie der ältesten von ihnen zugeordnet wird, und diese Sitzung beim Namen nennen. | AK-03 | Test |
| FA-05 | Wenn „Starten" gedrückt wird, MUSS die Seite bleiben, das Textfeld leeren, die Modellwahl behalten und die neue Sitzung binnen 2 s als Eintrag in der Liste zeigen. | AK-04 | Test |
| FA-06 | Wenn „Starten" am Mac (Fenster ≥ 1024 px) gedrückt wird, MUSS das angedockte Terminal den Tab der gerade gestarteten Sitzung wählen — nicht die älteste anhängige. | AK-04 | Test |
| FA-07 | Wenn „Starten" gedrückt wird, MUSS die Sitzung in einer neu angelegten Arbeitskopie des Projekts laufen (Zweig von der konfigurierten Basis, wie beim Terminal-Ziel „neuer Worktree"); der Hauptcheckout DARF dabei weder Dateien noch Zweig wechseln. | AK-10 | Test + Playwright |
| FA-08 | Liste und Übersichts-Eintrag MÜSSEN die Arbeitskopie mit demselben Label nennen wie eine Vorhaben-Zeile (Zweigname oder Ordnername), nie mit einem Host-Pfad. | AK-02, AK-06 | Test |
| FA-09 | Kann die Arbeitskopie nicht angelegt werden (kein Git-Repository, Isolation abgeschaltet, Anlegen scheitert), DARF keine Sitzung starten; unter dem Knopf MUSS der Grund mit nächstem Schritt stehen, und der Absichtstext MUSS im Feld bleiben. | AK-11 | Test |
| FA-10 | Wenn der Ordner der Sitzung entsteht, die die Seite „Neue Absicht" zuletzt gestartet oder aus der Übersicht geöffnet hat, MUSS die UI auf die Vorhaben-Seite dieses Vorhabens wechseln; das angedockte Terminal MUSS denselben Tab mit stehendem Verlauf zeigen. | AK-05 | Test |
| FA-11 | Entsteht der Ordner einer anderen anhängigen Sitzung des Projekts, MUSS die Seite „Neue Absicht" bleiben und nur deren Eintrag aus der Liste nehmen. | AK-05, AK-08, neu (Folge paralleler Sitzungen) | Test |
| FA-12 | Wenn eine Absicht-Sitzung anhängig wird (Start aus der UI oder von Hand), MUSS die Übersicht binnen 2 s einen Eintrag zeigen mit Projekt, Arbeitstitel, Kennzeichnung „Absicht · entsteht", Sitzungsname, Arbeitskopie und Zustand der Sitzung. | AK-06 | Test |
| FA-13 | Der Übersichts-Eintrag MUSS sich nach dem Zustand seiner Sitzung in die bestehenden Gruppen einordnen (Dialog oder fertig-unbeantwortet → „Wartet auf dich", sonst → „Läuft") und dem Projektfilter folgen. | AK-06 | Test |
| FA-14 | Als Arbeitstitel MUSS die erste nicht-leere Zeile des Absichtstexts gelten, auf 80 Zeichen gekürzt; ist kein Text bekannt (Hand-Sitzung), MUSS der Sitzungsname stehen. | AK-06, OF-01 | Test |
| FA-15 | Wenn der Übersichts-Eintrag angeklickt wird, MUSS die UI am Mac „Neue Absicht" des Projekts öffnen, im angedockten Terminal den Tab dieser Sitzung wählen und ihren Listeneintrag hervorheben; auf dem Handy MUSS sie die Sitzung im Vollbild-Terminal öffnen. | AK-07 | Test + Playwright |
| FA-16 | Wenn der Ordner entsteht, MUSS der Übersichts-Eintrag durch die Vorhaben-Zeile ersetzt werden; in keinem Zustand der Übersicht DÜRFEN Eintrag und Zeile derselben Sitzung gleichzeitig sichtbar sein. | AK-08 | Test |
| FA-17 | Endet eine anhängige Sitzung ohne Ordner, MÜSSEN ihr Übersichts-Eintrag und ihr Listeneintrag binnen 2 s verschwinden. | AK-09 | Test |
| FA-18 | Nach Neuladen der Seite oder Neustart des Backends MÜSSEN Liste und Übersichts-Einträge unverändert erscheinen, solange die Sitzungen leben. | Z-02, neu (INT-2026-008 AK-05 fortgeführt) | Test |
| FA-19 | Eine von Hand gestartete Absicht-Sitzung MUSS in Liste und Übersicht wie eine aus der UI gestartete erscheinen, mit ihrer tatsächlichen Arbeitskopie; sie DARF NICHT in eine Arbeitskopie verschoben werden. | NZ-02, AK-02 | Test |
| FA-20 | Glocke, Zustellung des Absichtstexts nach der ersten Frage, Protokoll-Übernahme beim Entstehen des Ordners und Wiederaufnahme nach Neustart MÜSSEN für jede parallele Absicht-Sitzung so funktionieren wie heute für eine. | Z-01, neu (Bestandsschutz) | Test |
| FA-21 | Wenn `/intent` die nächste Kennung bestimmt, MUSS er zuvor die entfernten Verweise nachholen (nur lesen) und die höchste Nummer des Jahres über `intent/` der eigenen Kopie, aller anderen Arbeitskopien des Projekts und aller lokalen und entfernten Zweige nehmen; schlägt das Nachholen fehl, MUSS er die lokale Kennung vergeben und das im Kopf der Absicht vermerken. | AK-12 | Review + Test |
| FA-22 | Die neue Arbeitskopie MUSS von der konfigurierten Basis des Projekts abzweigen (Standard `main`, lokaler Stand), so wie das Terminal-Ziel „neuer Worktree" es heute tut. | AK-10, OF-03 | Test |
| FA-23 | Der Zweig der Arbeitskopie MUSS den heutigen Sitzungsnamen tragen und DARF NICHT durch dieses Vorhaben umbenannt werden. | OF-02, NZ-03 | Review |
| FA-24 | Endet eine Absicht-Sitzung, MUSS ihre Arbeitskopie stehen bleiben, sobald sie ungesicherte Änderungen oder ein offenes Vorhaben trägt; nur eine saubere Kopie ohne Vorhaben DARF entfernt werden — wie heute. | RB-02, AN-03 | Test |
| FA-25 | Ist die Worktree-Isolation für das Projekt abgeschaltet, MUSS „Starten" mit dem Hinweis auf die Einstellung verweigern; es DARF keinen Schalter „trotzdem im Hauptcheckout" geben. | AK-11, RB-03 | Test |
| FA-26 | Nach dem Umbau MÜSSEN die Projekt-Docs den neuen Ablauf beschreiben (Seite „Neue Absicht" mit Liste, Übersichts-Eintrag ohne Ordner, Absicht-Start in Arbeitskopie); INT-2026-010 AK-08 und INT-2026-008 AK-04 gelten als abgelöst. | RB-04 | Review |
| FA-27 | Mehrere Starts kurz nacheinander (auch aus zwei Browsern) MÜSSEN je eine eigene Arbeitskopie und Sitzung ergeben; keine zwei Sitzungen DÜRFEN dieselbe neue Kopie bekommen. | AK-10, Z-01 | Test |

## 4. Fehler- und Randfälle

<!-- leser: mensch -->

| Fall | Erwartetes Verhalten | Herkunft |
|---|---|---|
| „Starten" wird gedrückt, während eine ältere Hand-Sitzung im Hauptcheckout anhängig ist | Neue Sitzung startet in eigener Kopie; beide stehen in der Liste; kein Hinweis nach FA-04, weil verschiedene Arbeitskopien | FA-04, FA-07 |
| Zwei Hand-Sitzungen im Hauptcheckout, dazu eine UI-Sitzung in eigener Kopie | Liste zeigt drei Einträge; der Hinweis nach FA-04 steht nur bei den beiden Hand-Sitzungen | FA-04 |
| Ordner entsteht im Hauptcheckout, während dort zwei Hand-Sitzungen anhängig sind | wie heute: die ältere bekommt das Vorhaben, die jüngere bleibt anhängig (NZ-01); Liste nimmt nur die ältere heraus | FA-11 |
| Absichtstext besteht nur aus Leerzeilen und einem Bildpfad | Arbeitstitel = erste nicht-leere Zeile, also der Pfad-Token — auf 80 Zeichen gekürzt; das ist akzeptiert (Bilder-Absichten sind selten, INT-2026-020) | FA-14 |
| Absichtstext länger als 80 Zeichen in der ersten Zeile | Arbeitstitel endet nach 80 Zeichen mit „…"; der volle Text geht unverändert an die Sitzung | FA-14 |
| Michael tippt in der Sitzung `/intent` erneut (zweite Absicht in derselben Kopie) | wie heute: die Sitzung verlässt ihre Zeile und wird wieder anhängig; Eintrag erscheint erneut mit Sitzungsname als Titel | FA-12, FA-19 |
| Sitzung startet, aber Claude bricht vor der ersten Frage ab (Anmeldung fehlt, Wrapper bricht ab) | Sitzung endet → Eintrag verschwindet nach FA-17; die leere Arbeitskopie wird entfernt (sauber); der Fehler ist im Terminal sichtbar wie heute | FA-17, FA-24 |
| Backend startet neu, während drei Absicht-Sitzungen laufen | Sitzungen überleben (tmux); nach dem Wiederanlauf stehen alle drei in Liste und Übersicht; ihre Kopien bleiben (INT-2026-019) | FA-18, FA-24 |
| Sitzung mit Ordner endet, Michael löscht die Kopie später von Hand | Vorhaben-Zeile verschwindet mit dem Ordner; kein Fehler in der Übersicht; Projekt-Seite listet die Kopie nicht mehr | FA-24 |
| Zwei Browser (Mac und Handy) zeigen „Neue Absicht"; am Mac wird gestartet | Beide Listen zeigen den neuen Eintrag binnen 2 s (gleiche Sicht auf jedem Gerät); nur der Mac wechselt sein angedocktes Terminal | FA-05, FA-06 |
| Klick auf einen Übersichts-Eintrag, dessen Sitzung in der Sekunde davor endete | UI öffnet „Neue Absicht" des Projekts ohne Hervorhebung; Toast „Sitzung ist beendet"; Formular ist da | FA-15, FA-17 |
| Klick auf einen Übersichts-Eintrag, dessen Ordner in der Sekunde davor entstand | UI öffnet die Vorhaben-Seite des neuen Vorhabens (die Sitzung hat jetzt eine Zeile) | FA-15, FA-16 |
| Projekt ist kein Git-Repository | „Starten" verweigert mit Grund „kein Git-Repository — Absicht im Terminal starten"; Hand-Sitzungen laufen wie heute im Projektordner | FA-09 |
| Anlegen der Kopie scheitert nach dem Klick (Name belegt, Platte voll) | keine Sitzung, Grund unter dem Knopf, Text bleibt; ein halb angelegter Ordner wird zurückgebaut | FA-09 |
| Basis-Zweig fehlt im Projekt (Repo nutzt `master`) | wie heute beim Terminal-Ziel: Kopie zweigt vom aktuellen Stand ab; kein Fehler | FA-22 |
| `/intent` läuft in einer Kopie, deren Basis hinter dem entfernten Stand liegt | Kennung stammt aus dem Vergleich mit entfernten Zweigen, ist also frei; die Kopie selbst bleibt auf dem alten Stand (OF-03, NZ-03) | FA-21, FA-22 |
| `/intent` ohne Netz | lokale Kennung, Vermerk im Kopf der Absicht; beim Push kann eine Kollision auftreten — dann ist das Umnummerieren Handarbeit wie am 18.09. | FA-21 |
| Die anhängige Sitzung ist keine Claude-Sitzung (fremde Agenten-CLI) | Solche Sitzungen werden für Absichten nicht gestartet (wie heute: nur Claude-Sitzungen); Hand-Starts anderer CLIs erscheinen nicht als anhängig | FA-12 |
| „Neue Absicht" wird geöffnet, ohne dass eine Sitzung von dieser Seite oder der Übersicht gewählt wurde | Terminal zeigt die jüngste anhängige Sitzung des Projekts angedockt; ohne anhängige Sitzung den zuletzt benutzten Tab oder den Leerzustand wie heute | FA-06, AN-S07 |
| Sitzung endet ohne Ordner, Kopie hat ungesicherte Änderungen (Claude hat Dateien angelegt) | Eintrag verschwindet; Kopie bleibt liegen und ist auf der Projekt-Seite als Arbeitskopie sichtbar; kein zusätzlicher Hinweis (NZ-03) | FA-17, FA-24 |
| Projektfilter der Übersicht steht auf einem anderen Projekt | Der Eintrag ist nicht sichtbar, wie Zeilen anderer Projekte | FA-13 |
| Umgesetzt-Gruppe ist zugeklappt | Einträge liegen nie in „Umgesetzt"; keine Wechselwirkung | FA-13 |

## 5. Daten, fachlich

<!-- leser: agent -->

<!-- Welche fachlichen Informationen sichtbar werden, entstehen, sich ändern oder verschwinden. Ohne Tabellen- oder Feldnamen. Datenklasse laut security.md nennen. -->

| Information | Entsteht / ändert sich / verschwindet | Wer sieht sie | Datenklasse |
|---|---|---|---|
| Anhängige Absicht-Sitzung (Sitzung, Projekt, Arbeitskopie, Beginn, Modell) | unverändert; wird jetzt zusätzlich in der Übersicht und in der Liste unter dem Formular gezeigt statt nur als Karte | Michael (Mac, Handy) | intern (Nutzerzustand der UI, wie heute) |
| Arbeitstitel einer anhängigen Absicht (erste Zeile des Absichtstexts, ≤ 80 Zeichen) | entsteht beim Start aus der UI; verschwindet mit dem Ordner (die Zeile trägt dann den Titel der Absicht) oder mit dem Sitzungsende | Michael | intern; Inhalt = Projektinhalt des jeweiligen Projekts (dessen `security.md` gilt); siehe Bedenken (erste Eingabe liegt heute nie als Text im Snapshot) |
| Zustand der Sitzung (arbeitet, wartet, Dialog, fertig-unbeantwortet) | unverändert (Hook-Route, Bildschirm-Probe); neu am Eintrag und in der Liste sichtbar | Michael | intern |
| Hinweis „gleiche Arbeitskopie → älteste bekommt den Ordner" | entsteht als Ableitung aus den anhängigen Sitzungen; nichts wird gespeichert | Michael | — (flüchtig) |
| Welche Sitzung die Seite „Neue Absicht" gerade zeigt (angedockter Tab, Hervorhebung) | entsteht mit Start oder Klick aus der Übersicht; verschwindet mit Seitenwechsel | Michael, je Fenster | — (flüchtig); siehe Bedenken AR-05 |
| Neue Arbeitskopie des Projekts (Ordner neben dem Projekt, Zweig mit Sitzungsnamen) | entsteht beim Start aus der UI; verschwindet bei Sitzungsende nur, wenn sauber und ohne Vorhaben | Michael (Projekt-Seite, Vorhaben-Zeile, Liste) | Projektinhalt des jeweiligen Projekts; Pfad = intern (nie im Repo, nie in der UI als Pfad) |
| Vorhaben-Ordner in einer Arbeitskopie | entsteht wie heute; die Zeile trägt die Arbeitskopie | Michael | öffentlich (Repo-Inhalt des Projekts, sobald gepusht) |
| Kennung INT-JJJJ-NNN | entsteht in der Sitzung; berücksichtigt jetzt alle Kopien und Zweige; Vermerk „ohne entfernten Stand" im Kopf der Absicht, wenn das Nachholen scheiterte | Michael, spätere Leser | öffentlich |
| Erste Eingabe der Sitzung (Absichtstext bis zur Zustellung) | unverändert | Michael (nur als Hinweis „wird übergeben") | intern |
| Screenshots neben den Mocks | entstehen im Repo | öffentlich | öffentlich — aus dem Scratch-Projekt, keine Kundenprojekte, keine Host-Pfade (Arbeitskopien nur als Label) |

## 6. Was der Nutzer sieht

<!-- leser: mensch -->

<!-- Nur bei UI-Änderung. Beschreibung in Worten; Mock unter `design/` (Pfad nennen), sonst „kein Mock nötig, weil …". -->

- **Seite „Neue Absicht" (Mac):** Überschrift und Projektzeile wie heute. Darunter das Formular (Textfeld, Modellwahl, „Starten") — immer. Darunter, nur wenn vorhanden, der Block „Laufende Absicht-Sitzungen · n": je Sitzung eine Zeile mit Punkt (Zustandsfarbe wie in Vorhaben-Zeilen), Sitzungsname, Label der Arbeitskopie, Zustandstext („arbeitet", „wartet auf Antwort", „Dialog", „Dein Text wird nach der ersten Frage übergeben"), rechts „Im Terminal öffnen ↗". Die Sitzung, die das angedockte Terminal zeigt, ist hervorgehoben. Teilen sich Sitzungen eine Arbeitskopie, steht unter ihren Zeilen ein grauer Satz: „Beide laufen in ‚main' — der nächste Ordner wird der älteren Sitzung ‚…' zugeordnet." Rechts das angedockte Terminal wie heute. Die Karte „Absicht-Sitzung läuft — Vorhaben entsteht …" gibt es nicht mehr; ihr Inhalt lebt in der Liste.
- **Seite „Neue Absicht" (Handy):** dasselbe ohne Terminal-Spalte; „Im Terminal öffnen" öffnet das Vollbild-Terminal.
- **Übersicht:** in den Gruppen „Wartet auf dich" und „Läuft" erscheinen Einträge für begonnene Absichten. Sie sehen aus wie Vorhaben-Zeilen, tragen aber statt der Kennung die Kennzeichnung „Absicht · entsteht", als Titel den Arbeitstitel, darunter Projekt, Sitzungsname, Arbeitskopie und Zustand. Klick führt in die Sitzung (Ablauf C). Entsteht der Ordner, steht an derselben Stelle die normale Zeile.
- **Fehler unter „Starten":** ein Satz mit Ursache und nächstem Schritt, inline, wie bei anderen Aktionen.
- **Skizze (Mac, Neue Absicht):**

```
Neue Absicht
kreis-lippe-audit

┌──────────────────────────────────────────────┐
│ Beschreibe die Absicht …                     │
│                                              │
└──────────────────────────────────────────────┘
[Modell ▾ claude-opus-5]                 [Starten]

Laufende Absicht-Sitzungen · 3
● Absicht 3 · session-a1b2 · wartet auf Antwort      Im Terminal öffnen ↗   ← hervorgehoben
● qwen3.8-flash-next:iq3 · main · arbeitet            Im Terminal öffnen ↗
● Absicht 2 · main · Dialog                           Im Terminal öffnen ↗
  Beide laufen in ‚main' — der nächste Ordner wird der älteren Sitzung
  ‚qwen3.8-flash-next:iq3' zugeordnet.
```

- **Skizze (Übersicht, Gruppe „Läuft"):**

```
Läuft · 4
Absicht · entsteht   Übersicht zeigt begonnene Absichten sofort …
                     kreis-lippe-audit · Absicht 3 · session-a1b2 · arbeitet
INT-2026-021         Eingabezeile nicht leer                       spec · Sitzung wartet
…
```

- **Mock:** Pflicht nach `design.md` §6 (neuer Ablauf, geänderte Navigation). Ablage `design/022a-neue-absicht-liste.png`, `design/022b-uebersicht-eintrag.png`, `design/022c-neue-absicht-handy.png` — siehe AN-S11 zum Zeitpunkt.

## 7. Bedenken aus den Projekt-Docs

<!-- leser: agent -->

<!-- PFLICHT. Beim Schreiben wurden product-brief, architecture, security, design gelesen. Alles, was dort reibt, steht hier — markiert, nicht entschieden.
     „Geklärt" heißt: die zuständige Rolle hat entschieden; Entscheidung steht in der Spalte. Vor der Freigabe muss jede Zeile geklärt oder als „offen, blockiert nicht, weil …" begründet sein.
     Gibt es nichts: „Keine — geprüft gegen Stand [sha]." -->

| Quelle | Bedenken | Betrifft | Geklärt? (wer, wann, wie) |
|---|---|---|---|
| architecture.md §3 Nutzerzustand („erste Eingabe … im Snapshot nur als Flag, nie als Text", INT-2026-010) | Der Arbeitstitel ist eine Ableitung aus dem Absichtstext und würde als Text in den Snapshot wandern — bewusst ein Ausschnitt, kein voller Text | FA-14, §5 Zeile „Arbeitstitel" | offen — an den Plan delegiert, nicht blockierend; Vorschlag vom PO bestätigt, 19.09.: Vorschlag eigener Wert „Arbeitstitel" (≤ 80 Zeichen) neben dem Flag, beim Start einmal gebildet; der volle Text bleibt wie heute außerhalb des Snapshots; §3 um den Wert ergänzen (ADR-0002 optionales Feld, wie INT-2026-019) |
| architecture.md AR-05 (Nutzerzustand nie im Browser) | Welche Sitzung „Neue Absicht" angedockt zeigt und hervorhebt (Start, Klick aus der Übersicht), darf nicht in einer Browser-Merkliste liegen; heute merkt sich die Seite die gestartete Sitzung nur flüchtig im Fenster | FA-06, FA-10, FA-15, §5 Zeile „Welche Sitzung die Seite zeigt" | offen — an den Plan delegiert, nicht blockierend; Vorschlag vom PO bestätigt, 19.09.: Vorschlag Sitzungskennung in der Adresse der Seite (`neu/<projekt>/<sitzung>`), damit Klick und Neuladen dieselbe Sitzung zeigen; ohne Kennung gilt AN-S07 (jüngste anhängige) |
| architecture.md AR-03 (Hauptrepo-Lock der UI sichert das Anlegen von Session-Worktrees) | Mehrere Starts kurz nacheinander legen mehrere Kopien an; sie müssen serialisiert werden wie heute beim Terminal-Ziel | FA-07, FA-27 | geklärt durch FA-27 und Intent AN-02: derselbe Weg wie das Terminal-Ziel „neuer Worktree", kein neuer Lock |
| architecture.md §2 Backend (Aufräumer-Schutzregel `keepWorktree`, `sessionEnded`; INT-2026-019) und §3 Zuordnung nach Verzeichnis | Ein Absicht-Ordner in der Sitzungs-Kopie macht sie zum Zuhause eines offenen Vorhabens; die Schutzregel greift erst, wenn die Zuordnung Sitzung↔Vorhaben besteht (Claim). Zwischen Ordner-Anlage und Claim liegt ein Scan-Intervall | FA-24, Ablauf I | geklärt durch FA-24: die Kopie ist in dieser Zeit ohnehin unsauber (uncommitteter Ordner) und bleibt; die Schutzregel ist der zweite Riegel — Herkunft `ui/src/server/utils/cloud-session-worktree.ts` (Prüfung „sauber" = keine Änderungen laut Status, auch keine unversionierten Dateien) |
| architecture.md §3 Zuordnung („erster neuer Ordner an die älteste anhängige Sitzung derselben Arbeitskopie") | Die Regel bleibt (NZ-01) und erklärt AK-03; parallele UI-Starts umgehen sie durch getrennte Kopien | FA-04, FA-11 | geklärt: PO im Intent, 19.09. (NZ-01, Entscheidung Frage 2) |
| architecture.md §10 (Abweichungen nicht vergrößern) | Keine neue Abweichung; die Karte „Absicht-Sitzung läuft" entfällt, ihre Tests werden ersetzt, nicht gestrichen | FA-02, FA-26 | geklärt durch FA-26 |
| architecture.md AR-06 (Framework nie von der UI abhängig) | AK-12 ändert eine Workflow-Datei des Lieferumfangs; die Kennungsregel darf nur Git benutzen, nichts aus der UI | FA-21 | geklärt durch FA-21: Fetch, `worktree list`, `branch -a` — reine Git-Sicht; Herkunft `specwright/workflows/core/intent.md` Step 1 |
| architecture.md §3 Lieferumfang / AP-02 | Die geänderte Workflow-Datei ist bereits im Manifest; keine neue Datei, kein Bruch, Update-Weg unverändert | FA-21 | geklärt: Textänderung an bestehender Manifest-Datei; Prüfung `verify` |
| security.md §5 Verbotsliste (Host-Pfade nie im Repo) und §1 öffentlich (Screenshots) | Sitzungs-Kopien haben Host-Pfade; Liste, Eintrag und Screenshots dürfen nur das Label zeigen | FA-08, §6 | geklärt durch FA-08: Label wie in Vorhaben-Zeilen (Zweig oder Ordnername); Screenshots aus dem Scratch-Projekt |
| security.md §6 Pflichtprüfung („von außen erreichbarer Endpunkt") | Der Start mit Ziel „neue Arbeitskopie" läuft über die bestehende Start-Nachricht; kein neuer HTTP-Endpunkt, aber ein neuer erlaubter Wert des Sitzungsziels | FA-07 | offen — an den Plan delegiert, nicht blockierend; Vorschlag vom PO bestätigt, 19.09.: Vorschlag Validierung wie beim Terminal-Ziel (Kind und optionaler Name), Projekt muss offen sein; Änderungsprotokoll-Zeile in security.md |
| security.md §1 intern (Nutzerzustand der UI) | Der Arbeitstitel enthält Projektinhalt des jeweiligen Projekts und liegt im Laufzeitzustand des Backends, nicht im Repo | FA-14 | geklärt: gleiche Klasse wie Freitext-Protokoll und erste Eingabe heute (intern) |
| design.md §1 Prinzip 1 (eine Aktion zuerst, kein Element ohne Aufgabe) | Formular und Liste auf einer Seite: die Liste darf dem Formular nicht den Rang streitig machen und ohne Inhalt nicht erscheinen | FA-01, FA-03, §6 | geklärt durch FA-03 und §6 (Formular oben, Liste nur mit Inhalt) |
| design.md §1 Prinzip 4 (bestehende Komponenten zuerst) | Übersichts-Eintrag und Listenzeile sollen wie Vorhaben-Zeilen aussehen, nicht neu gebaut werden | §6 | offen — an den Plan delegiert, nicht blockierend; Vorschlag vom PO bestätigt, 19.09.: Vorschlag die Vorhaben-Zeile um einen Modus „ohne Ordner" erweitern statt eine zweite Zeile zu bauen |
| design.md §4 Muster „Fehler nach Aktion" (Ursache und nächster Schritt) | Die Verweigerung nach AK-11 braucht beides | FA-09, FA-25 | geklärt durch FA-09 (Texte in Ablauf E) |
| design.md §4 Muster Glocke („Sitzungen eines Vorhabens heißen nach Kennung und Titel") | Anhängige Sitzungen heißen in der Glocke heute nach Sitzungsname; der Arbeitstitel könnte sie besser benennen | FA-20 | offen — an den Plan delegiert, nicht blockierend; Vorschlag vom PO bestätigt, 19.09.: Vorschlag Glocke unverändert lassen (FA-20), Arbeitstitel dort als Folge-Kleinkram |
| design.md §4 Muster „Übersicht gruppiert nach Sitzungszustand vor Phase" (INT-2026-016) | Einträge ohne Phase müssen sich einordnen lassen | FA-13 | geklärt durch FA-13 und AN-S05 (Zustand entscheidet, keine eigene Gruppe) |
| design.md §5 (angedockte Spalte zeigt das Seiten-Projekt; „Neue Session" dort gehört dem Vorhaben der Seite) | Auf „Neue Absicht" gibt es kein Vorhaben; ein dort per „Neue Session" gestarteter Tab ist eine gewöhnliche Sitzung | FA-06 | geklärt: wie heute, keine Änderung |
| design.md §6 Mock-Pflicht | Neuer Ablauf und geänderte Navigation → Bild-Mocks nötig; sie liegen noch nicht vor | §6 | geklärt: PO 19.09. (AN-S11) — Textskizzen für die Spec, Bild-Mocks vor `/plan` |
| product-brief.md §8 Domänenbegriffe („Vorhaben = Ordner mit den drei Dokumenten") | Die Übersicht heißt „Vorhaben" und zeigt nun auch begonnene Absichten ohne Ordner | FA-12 | geklärt durch FA-12 (Kennzeichnung „Absicht · entsteht"); Vorschlag an den Plan: Begriff „begonnene Absicht" in §8 ergänzen |
| product-brief.md §5 Kernfunktionen (Web-UI-Zeile) | Zeile nennt den Absicht-Start nicht; nach dem Umbau ergänzen | FA-26 | geklärt durch FA-26 |
| product-brief.md §7 Nicht-Ziele (kein Team-Werkzeug) | Parallele Sitzungen sind ein Nutzer mit mehreren Agenten, kein Mehrbenutzerbetrieb | Z-01 | Keine Reibung |

## 8. Nicht im Umfang

<!-- leser: mensch -->

<!-- Aus NZ der intent.md plus alles, was beim Schreiben ausgeschlossen wurde. -->

- NZ-01: Die Zuordnungsregel „erster neuer Ordner an die älteste anhängige Sitzung derselben Arbeitskopie" bleibt; sie wird nur sichtbar (FA-04).
- NZ-02: Von Hand gestartete Absicht-Sitzungen bleiben, wo sie gestartet wurden.
- NZ-03: Kein Umbenennen des Sitzungszweigs, keine PR-Anlage, kein Aufräumen alter Sitzungs-Kopien — auch nicht für Kopien, die nach diesem Vorhaben ohne Ordner, aber mit Änderungen liegen bleiben.
- NZ-04: Bereits im Hauptpfad liegende Absichten werden nicht verschoben; sie erscheinen wie heute als Zeilen mit Arbeitskopie `main`.
- NZ-05: Keine neue Handy-Gestaltung über Liste und Terminal-Knopf hinaus.
- Zusätzlich: Die Glocke bleibt unverändert (Arbeitstitel dort ist Folge-Kleinkram).
- Zusätzlich: Kein zweites angedocktes Terminalfenster; angedockt bleibt genau ein Fenster (INT-2026-013).
- Zusätzlich: Kein Wahlfeld „Arbeitskopie" im Formular von „Neue Absicht" — jeder UI-Start bekommt eine neue Kopie; wer im Hauptcheckout will, startet im Terminal.
- Zusätzlich: Kein automatisches `git fetch` vor dem Anlegen der Kopie (OF-03: wie heute).
- Zusätzlich: Keine Änderung an der Zustellung des Absichtstexts, am Protokoll und an der Wiederaufnahme (FA-20 sichert nur den Bestand).

## 9. Annahmen

<!-- leser: mensch -->

<!-- Vorläufige Auslegungen nach ER-00 der intent.md. Werden bei der Freigabe gesammelt bestätigt. -->

- **AN-S01:** Arbeitstitel eines Eintrags = erste nicht-leere Zeile des Absichtstexts, auf 80 Zeichen gekürzt; ohne bekannten Text der Sitzungsname (OF-01). — bestätigt am 2026-09-19 von Product Owner
- **AN-S02:** Der Zweig der Arbeitskopie behält den Sitzungsnamen bis zur PR; `/intent` benennt nicht um (OF-02, NZ-03). — bestätigt am 2026-09-19 von Product Owner
- **AN-S03:** Die neue Kopie zweigt von der konfigurierten Basis im lokalen Stand ab, ohne vorheriges `git fetch` — wie heute beim Terminal-Ziel (OF-03). — bestätigt am 2026-09-19 von Product Owner
- **AN-S04:** `/intent` holt vor der Kennung die entfernten Verweise nach (nur lesen); ohne Netz vergibt er die lokale Kennung und vermerkt das im Kopf der Absicht (AK-12). — bestätigt am 2026-09-19 von Product Owner
- **AN-S05:** Der Übersichts-Eintrag ordnet sich nach dem Zustand seiner Sitzung in „Wartet auf dich" oder „Läuft" ein; keine eigene Gruppe „Absichten". — bestätigt am 2026-09-19 von Product Owner
- **AN-S06:** Der Klick auf einen Eintrag führt am Mac auf „Neue Absicht" des Projekts mit dieser Sitzung im angedockten Terminal und hervorgehoben in der Liste; es gibt keine eigene Seite je anhängiger Sitzung. — bestätigt am 2026-09-19 von Product Owner
- **AN-S07:** Wird „Neue Absicht" ohne Start und ohne Klick aus der Übersicht geöffnet, zeigt das angedockte Terminal die jüngste anhängige Sitzung des Projekts (heute: die älteste). — bestätigt am 2026-09-19 von Product Owner
- **AN-S08:** Nach „Starten" bleibt das gewählte Modell im Formular stehen; nur das Textfeld leert sich. — bestätigt am 2026-09-19 von Product Owner
- **AN-S09:** Hand-Sitzungen erscheinen in Liste und Übersicht genau wie UI-Sitzungen, mit Sitzungsname als Titel und ihrer tatsächlichen Arbeitskopie. — bestätigt am 2026-09-19 von Product Owner
- **AN-S10:** Endet eine Sitzung ohne Ordner, wird ihre Kopie wie heute nur entfernt, wenn sie sauber ist; eine Kopie mit Änderungen bleibt ohne zusätzlichen Hinweis liegen (NZ-03). — bestätigt am 2026-09-19 von Product Owner
- **AN-S11:** Für die Freigabe dieser Spec genügen die Textskizzen in §6; die Bild-Mocks (022a–022c) entstehen vor `/plan` und liegen unter `design/`. — bestätigt am 2026-09-19 von Product Owner
- **AN-S12:** Bei abgeschalteter Worktree-Isolation verweigert „Starten" mit Hinweis; es gibt keinen Schalter „trotzdem im Hauptcheckout" (AK-11). — bestätigt am 2026-09-19 von Product Owner
- **AN-S13:** Die Karte „Absicht-Sitzung läuft — Vorhaben entsteht …" entfällt ersatzlos; ihre Informationen stehen in der Liste (FA-02). — bestätigt am 2026-09-19 von Product Owner

## 10. Freigabe

<!-- leser: agent -->

- [x] Jede FA hat Herkunft und Prüfung.
- [x] Jedes AK der intent.md ist von mindestens einer FA abgedeckt: AK-01 → FA-01 · AK-02 → FA-02, FA-03, FA-08, FA-19 · AK-03 → FA-04 · AK-04 → FA-05, FA-06 · AK-05 → FA-10, FA-11 · AK-06 → FA-12, FA-13, FA-14 · AK-07 → FA-15 · AK-08 → FA-11, FA-16 · AK-09 → FA-17 · AK-10 → FA-07, FA-22, FA-27 · AK-11 → FA-09, FA-25 · AK-12 → FA-21 · NZ-02 → FA-19 · NZ-03 → FA-23 · RB-02 → FA-24 · RB-03 → FA-25 · RB-04 → FA-26 · Z-01/Z-02 Bestand → FA-18, FA-20.
- [x] Abschnitt 7 vollständig geklärt oder begründet offen (fünf Zeilen an den Plan delegiert: Arbeitstitel im Snapshot, Sitzung in der Adresse, Validierung des Sitzungsziels, Zeilen-Modus statt Neubau, Glocke; Mock-Zeile geklärt: PO 19.09., AN-S11).
- [x] Keine Technik, keine Architektur, keine Dateinamen in diesem Dokument (Pfade nur als Herkunft in Abschnitt 7 und als Mock-Verweise in Abschnitt 6).
- [x] Bei risikoklasse hoch: Tech Lead hat gelesen — entfällt (niedrig).
- [x] Abgleich Mensch/Agent: Mensch-Teil gegen Agenten-Teil geprüft (2026-09-19, vor dem Vorlegen), Befund: keiner — Ablauf A/C und AN-S05/S07 decken sich mit §5 und den §7-Zeilen AR-05 und Übersichts-Gruppen; §6 „Karte entfällt" steht als AN-S13
- **Freigegeben:** Product Owner (Michael Sindlinger), 2026-09-19 („Freigabe: spec.md (Stand 2026-09-19 21:10)", Chat), Commit folgt
