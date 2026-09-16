# Spec: Vorhaben ohne Terminal führen — Sitzung als Gespräch in der Web-UI, Sprache in beide Richtungen

> **Intent:** `intent.md` (INT-2026-007, Version 1.0.0)
> **Status:** freigegeben
> **Erstellt:** 2026-09-15 · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-16 (alle Vorschläge D1–D5, Annahmen AN-S01–S16 bestätigt, R1: Einreihen erlaubt)
> **Gelesene Projekt-Docs:** `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` (Stand: Commit 52dbeff)

<!-- Die Spec ist FACHLICH. Sie beschreibt, was Nutzer erleben und was fachlich gelten muss.
     Nicht hinein gehören: Dateien, Komponenten, Datenbanktabellen, Bibliotheken, Architekturentscheidungen. Das ist plan.md.
     Die Projekt-Docs werden gelesen und dürfen hier nur BEDENKEN markieren (Abschnitt 7). Sie entscheiden nichts.
     Jede Anforderung verweist auf ein Ziel oder Abnahmekriterium der intent.md. Keine Anforderung ohne Herkunft. -->

## 1. Zusammenfassung

Nach diesem Vorhaben zeigt die Vorhaben-Seite der Web-UI neben den Dokumenten das laufende Gespräch mit der Sitzung des Vorhabens: Was Claude sagt, was Michael eingibt, welche Rückfrage gerade offen ist (Z-01, Z-02, AK-01, AK-10). Michael antwortet dort mit Freitext, wählt bei Rückfragen eine Option, entscheidet über den Plan und startet den externen Plan-Review mit Reviewer-Auswahl — ohne die Terminal-Ansicht zu öffnen (AK-02 bis AK-06). Wartet die Sitzung auf eine Tool-Berechtigung, sagt die Seite das und bietet den Sprung ins Terminal (AK-11). Schaltet Michael das Mikro ein, kommt Gesprochenes als Text in der Sitzung an; ist Vorlesen eingeschaltet, hört er Claudes Antworten satzweise und kann sie durch Sprechen unterbrechen (Z-03, AK-07 bis AK-09, AK-12 bis AK-14). Die Sitzung bleibt dieselbe Claude-Code-Sitzung wie heute; das Cloud-Terminal zeigt sie unverändert als Roh-Ansicht (Z-02, RB-02). Die Auslieferung erfolgt in drei Stufen (Abschnitt 2, Ablauf M).

## 2. Nutzer und Abläufe

<!-- Je Ablauf: wer, Auslöser, Schritte aus Nutzersicht, Ergebnis. Jeder Ablauf deckt mindestens ein AK ab. -->

Alle Abläufe haben einen Nutzer: Michael am Mac. Das Handy ist nicht Teil dieses Vorhabens (NZ-01); Abläufe dürfen es nicht ausschließen, das heißt: nichts in ihnen setzt Maus, Hover oder eine Mindestbreite voraus.

Begriffe aus der Absicht gelten unverändert: Gesprächsbeitrag (B-01), Rückfrage mit Auswahl (B-02), Plan-Dialog (B-03), Sitzung (B-04), Unterbrechen (B-05), Ohne Terminal (B-06), Vorlesen eingeschaltet (B-07). Zusätzlich in dieser Spec:

- **Gesprächsbereich:** der Teil der Vorhaben-Seite, der das Gespräch zeigt und die Eingabe annimmt.
- **Karte:** ein hervorgehobener Beitrag im Gesprächsbereich, der eine Handlung von Michael erwartet — Rückfrage mit Auswahl, Plan-Dialog, Berechtigungs-Hinweis. Eine Karte ist offen, bis die Sitzung weiterarbeitet.
- **Arbeitsblock:** eine zusammengeklappte Zeile zwischen zwei Gesprächsbeiträgen, die nur zählt, was die Sitzung dazwischen getan hat („arbeitet … 7 Werkzeugaufrufe, 1:20 min"). Inhalte von Werkzeugaufrufen bleiben dem Terminal vorbehalten (B-01, AN-S02).

### Ablauf A: Gespräch lesen (AK-01, AK-10, AK-13)

1. Michael öffnet ein Vorhaben, dem eine Sitzung zugeordnet ist (FA-21 aus INT-2026-004). Die Vorhaben-Seite zeigt wie heute Kennung, Titel, Phase, Zustand und die Dokumente — und daneben den Gesprächsbereich mit dem Namen der Sitzung, ihrer Arbeitskopie und ihrem Zustand.
2. Der Gesprächsbereich zeigt den Verlauf der Sitzung seit ihrem Start (AN-S01): Michaels Eingaben (auch die, die er im Terminal getippt hat, und die, die die UI als Änderungen oder Freigabe geschickt hat), Claudes Texte an Michael, Rückfragen mit den gegebenen Antworten, Plan-Vorlagen mit der getroffenen Entscheidung. Jeder Beitrag trägt Uhrzeit und Absender („Du", „Claude"). Zwischen den Beiträgen stehen Arbeitsblöcke.
3. Claudes Texte erscheinen gerendert wie die Dokumente (Überschriften, Listen, Tabellen, Codeblöcke), Kennungen wie `AK-03` bleiben lesbar. Sehr lange Beiträge sind vollständig lesbar und scrollen im Gesprächsbereich; der Bereich hält am neuesten Beitrag, solange Michael nicht nach oben gescrollt hat.
4. Sagt Claude etwas Neues, steht es innerhalb von 3 s im Gesprächsbereich (AK-01); die Übersicht und die Kopfzeile ziehen den Zustand wie heute nach.
5. Tippt Michael im Terminal derselben Sitzung, erscheint das dort Eingegebene als sein Beitrag im Gespräch; gibt er im Gespräch ein, steht es im Terminal (AK-10).
6. Ergebnis: Michael weiß, was die Sitzung zuletzt gesagt und gefragt hat, ohne das Terminal zu öffnen.

### Ablauf B: Mit Freitext antworten (AK-03, AK-10)

1. Voraussetzung: Die Sitzung wartet (FA-14 aus INT-2026-004: letzte Antwort abgeschlossen oder Frage gestellt, seither keine Eingabe) oder arbeitet; kein Dialog ist offen (bei einer Rückfrage mit Auswahl gilt Ablauf C).
2. Unter dem Gespräch steht ein Eingabefeld. Es ist aktiv, wenn die Sitzung wartet oder arbeitet; arbeitet sie, heißt der Sende-Knopf „einreihen" (der Text reiht sich ein und wird verarbeitet, sobald die Sitzung ihren aktuellen Zug beendet hat — wie beim Tippen im Terminal, AN-S09). Sonst nennt das Feld den Grund an der Stelle des Sende-Knopfs: „Sitzung wartet auf Berechtigung — im Terminal antworten", „Sitzung wartet auf Plan-Entscheidung — Karte oben", „Sitzung beendet — nächsten Schritt starten", „keine Sitzung — nächsten Schritt starten".
3. Michael schreibt (mehrzeilig möglich) und schickt mit Enter oder Knopf; Umschalt+Enter macht eine neue Zeile.
4. Der Text erscheint sofort als Michaels Beitrag im Gespräch, mit dem Zustand „gesendet" (bei arbeitender Sitzung „eingereiht"); sobald die Sitzung ihn angenommen hat, ohne Zusatz. Die Sitzung arbeitet; die Kopfzeile zeigt „arbeitet".
5. Der Text ist für die Sitzung immer Text, nie ein Befehl oder ein Tastenkürzel (FA-11). Ein Vorhaben-Befehl (`/specwright:…`) läuft nur über den Knopf „nächster Schritt" (NZ-04).
6. Kann nicht gesendet werden (Sitzung in der Zwischenzeit beendet, Dialog geöffnet), bleibt der Text im Feld, und das Feld nennt den Grund.
7. Anmerkungen und Freigaben aus dem Dokument-Leser (INT-2026-004, Abläufe C und D) bleiben, wie sie sind, und erscheinen nach dem Senden als Michaels Beitrag im Gespräch. Das Eingabefeld ersetzt sie nicht.
8. Ergebnis: Diskussion in `/intent` und `/spec` läuft in der Vorhaben-Seite, nicht im Terminal.

### Ablauf C: Rückfrage mit Auswahl beantworten (AK-02, AK-10)

1. Die Sitzung stellt eine Rückfrage mit Auswahl (B-02). Der Gesprächsbereich zeigt eine offene Karte: die Frage, optional ihre Überschrift, die Optionen mit ihrem Beschreibungstext, dazu ein Freitextfeld „Anderes". Stellt die Sitzung mehrere Fragen auf einmal, zeigt die Karte alle, jede mit eigener Auswahl, und lässt sich erst abschicken, wenn jede Frage eine Antwort hat. Erlaubt eine Frage Mehrfachauswahl, sind mehrere Optionen wählbar.
2. Die Übersicht zeigt das Vorhaben als „wartet · Rückfrage"; der Bell-Ton kommt wie heute (FA-16 aus INT-2026-004).
3. Michael wählt Optionen und/oder schreibt Freitext und schickt die Karte ab. Die Antwort geht so an die Sitzung, dass sie weiterarbeitet, als hätte Michael im Terminal geantwortet; die Karte schließt und wird zum Beitrag „Antwort: [Option] …" im Verlauf.
4. Beantwortet Michael die Rückfrage stattdessen im Terminal, schließt die Karte in der UI innerhalb von 3 s, und die gegebene Antwort erscheint im Verlauf.
5. Solange die Karte offen ist, ist das Freitextfeld unter dem Gespräch gesperrt mit dem Hinweis „Rückfrage oben beantworten" — es gibt für eine Rückfrage genau einen Antwortweg in der UI (AN-S05).
6. Ergebnis: Rückfragen der Workflows (`/intent`-Interview, Klärungen im Bau) sind ohne Terminal beantwortbar.

### Ablauf D: Plan-Entscheidung treffen (AK-04, AK-10)

1. Die Sitzung legt den Plan zur Freigabe vor (B-03). Der Gesprächsbereich zeigt eine offene Karte „Plan liegt vor" mit dem Plan-Text, wie ihn die Sitzung vorgelegt hat, eingeklappt auf die Überschriften mit „ganz lesen", und darunter die Entscheidungen des Dialogs, so benannt, wie der Dialog sie nennt: annehmen (ohne weitere Nachfragen), annehmen (Änderungen einzeln bestätigen), ändern mit Text, abbrechen (AN-S06). Bei Bedarf steht auf der Karte ein Knopf „Extern prüfen lassen" (Ablauf E).
2. Die Übersicht zeigt „wartet · Plan-Entscheidung"; der Zustand der Sitzung ist „wartet auf Plan-Entscheidung" (FA-09).
3. Michael wählt. Bei „ändern mit Text" öffnet die Karte ein Textfeld; Anmerkungen, die Michael am Dokument `plan.md` gesammelt hat, bietet die Karte an, in dieses Feld zu übernehmen (Wortlaut wie beim Senden von Änderungen, FA-27 aus INT-2026-004). Nach dem Abschicken arbeitet die Sitzung weiter, die Karte schließt und wird zum Beitrag „Plan: angenommen" bzw. „Plan: Änderungen geschickt" bzw. „Plan: abgebrochen".
4. Liegt ein externer Review vor (Ablauf E), steht sein Ergebnis auf der Karte; „ändern mit Text" ist dann mit dem Review vorbelegt, so wie der Review heute im Terminal in der dritten Option steht.
5. Trifft Michael die Entscheidung im Terminal, schließt die Karte innerhalb von 3 s mit dem dort gewählten Ergebnis.
6. „Freigeben" aus dem Dokument-Leser (INT-2026-004, Ablauf D) ist etwas anderes als die Plan-Entscheidung: Es ist die Antwort am Review-Punkt des Workflows (Wortlaut `Freigabe: plan.md (Stand …)`), die Plan-Entscheidung ist die Antwort auf den Dialog des Plan Mode. Die UI zeigt jeweils nur das an, was gerade offen ist; solange der Plan-Dialog offen ist, ist „Freigeben" im Leser nicht wählbar und die Sendeleiste sagt „Plan-Entscheidung offen — Karte im Gespräch" (FA-15).
7. Ergebnis: Der Plan Mode ist ohne Terminal abschließbar.

### Ablauf E: Externen Plan-Review von der Vorhaben-Seite starten (AK-05)

1. Voraussetzung: Die Plan-Karte ist offen (Ablauf D). Auf der Karte steht „Extern prüfen lassen" mit der Reviewer-Auswahl: dieselbe Liste konfigurierter Anbieter und Modelle wie im Umschalter der Terminal-Leiste, vorbelegt mit der für diese Sitzung dort gesetzten Auswahl, sonst mit den Standard-Reviewern. Ob die automatische Prüfung für die Sitzung eingeschaltet ist, steht ebenfalls dort und ist dort umschaltbar — dieselbe Einstellung wie in der Terminal-Leiste, an beiden Orten gleich (FA-18).
2. Michael wählt Reviewer und startet. Die Karte zeigt den Fortschritt je Reviewer („Claude Opus: läuft · GLM: fertig · Grok: fehlgeschlagen"), nie nur einen Spinner. Solange der Review läuft, sind die Entscheidungen der Plan-Karte gesperrt mit dem Hinweis „Review läuft — Entscheidung danach" (AN-S07).
3. Liegt das Ergebnis vor, landet es dort, wo es heute landet — in der dritten Option des Dialogs im Terminal — und zusätzlich lesbar auf der Karte: die zusammengeführten Befunde, mit der Angabe, wie viele Reviewer geliefert haben („2 von 3"). Michael entscheidet dann nach Ablauf D; „ändern mit Text" ist mit dem Review vorbelegt.
4. Liefert kein Reviewer, sagt die Karte das mit Ursache je Reviewer und gibt die Entscheidungen wieder frei; der Dialog bleibt offen, Michael kann neu starten oder ohne Review entscheiden.
5. Ist der automatische Review eingeschaltet und läuft er beim Erscheinen des Dialogs von allein an, zeigt die Karte das genauso wie einen von Hand gestarteten.
6. Ergebnis: Review-Start und -Ergebnis ohne Terminal-Leiste; das Ergebnis ist dasselbe wie über den Knopf im Terminal.

### Ablauf F: Tool-Berechtigung ohne Terminal-Formular (AK-11)

1. Die Sitzung wartet auf eine Tool-Berechtigung (etwas anderes als Rückfrage oder Plan-Dialog). Der Gesprächsbereich zeigt eine offene Karte „Sitzung wartet auf Berechtigung: [Werkzeug]" mit dem Knopf „Im Terminal öffnen". Die UI baut den Berechtigungs-Dialog nicht nach (NZ-02, OF-01).
2. „Im Terminal öffnen" zeigt die Sitzung allein im Vollbild, so wie INT-2026-005 es für den Start eines Schritts eingeführt hat. Michael antwortet im Terminal, schließt das Vollbild und ist wieder auf der Vorhaben-Seite; die Karte ist zu, die Sitzung arbeitet.
3. Erkennt die UI einen Dialog, kann ihn aber nicht einordnen (Darstellung von Claude Code geändert, AN-02 verletzt), gilt dasselbe Verhalten mit dem Text „Sitzung zeigt einen Dialog — im Terminal antworten" (FA-10). Das ist die Rückfallebene für Abläufe C und D.
4. Ergebnis: Berechtigungen bleiben Terminal-Sache, sind aber der einzige Grund, es zu öffnen (EK-01).

### Ablauf G: Ein Vorhaben ohne Terminal von Anfang bis PR (AK-06)

1. Michael wählt auf der Projekt-Seite „Absicht beginnen". Die Sitzung startet; am Mac bleibt Michael auf der Seite des Projekts, und sobald der Vorhaben-Ordner entsteht, öffnet die UI die Vorhaben-Seite mit dem Gesprächsbereich (AN-S03 — ändert Ablauf E Schritt 6 aus INT-2026-004 und INT-2026-005 Z-01: kein Sprung ins Terminal mehr; der Sprung bleibt als Knopf „Im Terminal öffnen" in der Kopfzeile).
2. Das Interview des Absicht-Workflows läuft als Gespräch: Claudes Fragen als Text (Ablauf A), Rückfragen mit Auswahl als Karten (Ablauf C), Michaels Antworten als Freitext (Ablauf B). Am Review-Punkt liest Michael `intent.md` im Leser, schreibt Anmerkungen oder gibt frei (INT-2026-004).
3. „Spec schreiben", „Plan erstellen", „Bau starten" starten je eine Sitzung und bleiben auf der Vorhaben-Seite; das Gespräch wechselt auf die neue Sitzung (Ablauf L).
4. Im Plan-Schritt: Plan-Karte, Review, Entscheidung (Abläufe D, E), danach Review-Punkt für `plan.md` im Leser.
5. Im Bau: Rückfragen als Karten, Berechtigungen als Hinweis mit Terminal-Sprung (Ablauf F), Fertigmeldung mit PR-Verweis wie heute (INT-2026-004, Ablauf F).
6. Ergebnis: Terminal-Öffnungen je Vorhaben: 0, außer für Berechtigungen (EK-01).

### Ablauf H: Sprechen statt tippen (AK-07, AK-14, AK-12)

1. Am Eingabefeld steht ein Mikro-Knopf mit drei sichtbaren Zuständen, mit Text und Symbol, nicht nur Farbe: „Mikro aus", „hört zu", „nicht verfügbar (Grund)". Standard beim Öffnen der Seite: aus (AK-14).
2. Michael schaltet das Mikro ein (Klick oder Taste). Der Browser fragt beim ersten Mal nach der Erlaubnis; verweigert er sie oder fehlt ein sicherer Zugang (RB-06), zeigt der Knopf „nicht verfügbar" mit Ursache und nächstem Schritt, und alles andere läuft als Text weiter.
3. Solange das Mikro an ist, erscheint Gesprochenes fortlaufend als Text im Eingabefeld (Zwischenstand sichtbar, noch nicht gesendet). Erkennt die UI das Ende eines Sprechabschnitts (Pause), schickt sie den Text ab, sofern die Sitzung wartet oder arbeitet — innerhalb von 3 s nach Sprechende steht er in der Sitzung (AK-07); bei arbeitender Sitzung ist er eingereiht und wird nach ihrem aktuellen Zug verarbeitet. Das Feld ist danach leer, das Mikro bleibt an.
4. Ist ein Dialog außer einer Rückfrage offen (Plan-Entscheidung, Berechtigung) oder die Sitzung beendet, bleibt der erkannte Text im Feld mit dem Hinweis des Feldes (Ablauf B Schritt 2); Michael schickt ihn später von Hand, ergänzt ihn per Sprache oder löscht ihn. Die UI schickt nichts von allein, sobald der Dialog zu ist (AN-S09).
5. Ist eine Rückfrage-Karte offen, geht Gesprochenes in das Freitextfeld „Anderes" dieser Karte und wird mit dem Sprechende als Antwort abgeschickt; Optionen wählt Michael mit der Hand (AN-S10).
6. Das Mikro schaltet sich nur durch Michael aus, mit einer Ausnahme: Verlässt er die Vorhaben-Seite oder wechselt die Sitzung des Vorhabens, geht es aus (AK-14, AN-S11). Sein Zustand ist in der Kopfzeile des Gesprächsbereichs jederzeit sichtbar.
7. Fällt die Spracherkennung aus (Dienst nicht erreichbar, Verbindung abgebrochen), geht das Mikro aus, der Knopf zeigt „nicht verfügbar: Spracherkennung ausgefallen — erneut versuchen", das Feld bleibt zum Tippen offen (AK-12).
8. Ergebnis: Michael führt das Gespräch mit der Stimme; alles, was er sagt, ist vorher als Text zu sehen.

### Ablauf I: Antworten hören und unterbrechen (AK-08, AK-09, AK-13, AK-12)

1. In der Kopfzeile des Gesprächsbereichs steht der Schalter „Vorlesen" (B-07): eine Einstellung je Nutzer, gespeichert im Backend, Standard aus; sie gilt auf allen Geräten und für alle Vorhaben, bis Michael sie ändert (AN-S12).
2. Ist Vorlesen an und Claude antwortet, beginnt das Vorlesen spätestens 3 s nach dem ersten vollständigen Satz (AK-08) und liest satzweise weiter, während der Rest noch entsteht. Vorgelesen wird nur Claudes Text an Michael; Codeblöcke werden mit „Codeblock übersprungen" ersetzt, Tabellen mit „Tabelle, [n] Zeilen — im Text", Auszeichnungszeichen (Sterne, Rauten, Backticks) werden nicht gesprochen (AK-13, FA-27).
3. Rückfragen mit Auswahl werden vorgelesen: die Frage und die Optionen mit Nummer, dann wartet die UI. Die Plan-Karte wird angekündigt („Der Plan liegt vor: [Titel]. Entscheidungen: …"), der Plan-Text selbst wird nicht vorgelesen (AN-S13). Berechtigungs-Karten werden mit ihrem Hinweistext vorgelesen. Arbeitsblöcke werden nicht vorgelesen.
4. Während des Vorlesens steht am Beitrag „wird vorgelesen" mit einem Knopf „Stopp".
5. Unterbrechen (B-05): Ist das Mikro an und Michael beginnt zu sprechen, stoppt das Vorlesen sofort (unter 0,5 s hörbar), der Rest dieser Antwort und alles, was noch zum Vorlesen anstand, verfällt; die Antwort bleibt vollständig lesbar. Das Gesprochene läuft nach Ablauf H weiter (AK-09, AN-S14). Ist das Mikro aus, unterbricht der Knopf „Stopp" oder das Abschicken einer getippten Eingabe.
6. Kommen mehrere Beiträge, während noch vorgelesen wird, werden sie in Reihenfolge nachgelesen; unterbrechen verwirft alle.
7. Was die UI selbst vorliest, DARF NICHT als Michaels Sprache erkannt werden (kein Echo): erkennt die Spracherkennung während des Vorlesens nur die vorgelesenen Worte, gilt das nicht als Unterbrechen und nicht als Eingabe (Randfall, Abschnitt 4).
8. Fällt das Vorlesen aus (Dienst nicht erreichbar), zeigt der Schalter „Vorlesen: ausgefallen — Text bleibt lesbar", der Beitrag ist wie immer lesbar, das Gespräch läuft weiter (AK-12). Michael kann den Schalter erneut betätigen.
9. Verlässt Michael die Vorhaben-Seite, stoppt das Vorlesen; die Einstellung bleibt an.
10. Ergebnis: Michael hört, was die Sitzung sagt, und kann ihr ins Wort fallen.

### Ablauf J (Betrieb): Neustart der UI während eines Gesprächs (RB-05, AK-10)

1. Ein Merge löst den Neustart der UI aus, während ein Gespräch läuft. Die Sitzung selbst überlebt wie heute (tmux).
2. Nach dem Neustart zeigt die Vorhaben-Seite denselben Verlauf wie zuvor (er kommt aus der Sitzung, nicht aus der UI); die Zuordnung, die Einstellung Vorlesen und die Reviewer-Auswahl bleiben erhalten. Mikro und Vorlesen sind nach dem Neustart aus bzw. gestoppt, bis Michael das Mikro erneut einschaltet oder der nächste Beitrag kommt (Vorlesen laut Einstellung).
3. Eine Eingabe, die Michael in der Sekunde des Neustarts geschickt hat, kommt genau einmal an oder wird als „nicht bestätigt — im Terminal prüfen" gezeigt (wie INT-2026-004, Ablauf H).
4. Ergebnis: Eine Auslieferung kostet keinen Beitrag.

### Ablauf K (Betrieb): Gespräch nicht verfügbar (AK-01, AK-11)

1. Die UI kann den Verlauf einer zugeordneten Sitzung nicht lesen (Sitzung vor der letzten Auslieferung gestartet und meldet sich nicht mehr; Verlauf nicht auffindbar; Sitzung gehört einem Backend auf einem anderen Port).
2. Der Gesprächsbereich zeigt statt des Verlaufs einen Satz mit Ursache und nächstem Schritt: „Gespräch nicht verfügbar: [Ursache] — im Terminal öffnen oder Sitzung neu starten". Freitext, Karten und Sprache sind dann nicht verfügbar; Anmerkungen und Freigabe aus dem Leser funktionieren wie heute, wenn die Sitzung wartet.
3. Ergebnis: Kein stilles Leerbleiben; Michael weiß, warum, und hat einen Weg.

### Ablauf L (Betrieb): Sitzungswechsel und Sitzungsende

1. Endet die Sitzung (beendet, abgestürzt), bleibt der Verlauf lesbar, das Eingabefeld ist gesperrt mit „Sitzung beendet — nächsten Schritt starten", offene Karten schließen mit dem Vermerk „nicht beantwortet, Sitzung beendet".
2. Wird dem Vorhaben eine neue Sitzung zugeordnet (nächster Schritt per Knopf oder Befehl im Terminal, FA-21 aus INT-2026-004), zeigt der Gesprächsbereich ab jetzt die neue Sitzung; der Verlauf der alten ist in der UI nicht mehr sichtbar (AN-S04). Das Protokoll der gesendeten Antworten (INT-2026-004, FA-31) bleibt.
3. Ergebnis: Es gibt immer genau ein Gespräch je Vorhaben — das mit der zugeordneten Sitzung.

### Ablauf M (Betrieb): Auslieferung in drei Stufen (Absicht Abschnitt 10)

1. **Stufe 1 — lesen und antworten:** Abläufe A, B, F (Berechtigung + Terminal-Sprung), J, K, L und der geänderte Start (Ablauf G Schritt 1 und 3). Deckt AK-01, AK-03, AK-10, AK-11. Abbruchkriterium der Absicht (4 Sitzungen) gilt für diese Stufe.
2. **Stufe 2 — Karten:** Abläufe C, D, E und der ganze Pfad G. Deckt AK-02, AK-04, AK-05, AK-06.
3. **Stufe 3 — Sprache:** Abläufe H, I. Deckt AK-07, AK-08, AK-09, AK-12, AK-13, AK-14.
4. Jede Stufe ist eine PR, für sich nützlich, für sich rückrollbar (Revert). Nach Stufe 1 ist die Terminal-Ansicht für Freitext-Diskussion entbehrlich, nach Stufe 2 für den ganzen Ablauf, nach Stufe 3 die Tastatur.
5. Ergebnis: Nutzen ab der ersten PR; das Zeitbudget (10 Sitzungen) verteilt sich 4 / 3 / 3.

## 3. Fachliche Anforderungen

<!-- Eine Zeile = eine prüfbare Aussage. Modalverben groß. Herkunft = AK/Z/NZ aus intent.md oder „neu (Grund)". -->

### 3.1 Gespräch lesen

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-01 | Solange einem Vorhaben eine Sitzung zugeordnet ist, MUSS die Vorhaben-Seite einen Gesprächsbereich zeigen mit Sitzungsname, Arbeitskopie, Zustand und dem Verlauf der Gesprächsbeiträge (B-01) dieser Sitzung seit ihrem Start, jeder mit Absender und Uhrzeit. | AK-01, Z-02 | Test |
| FA-02 | Wenn in der Sitzung ein neuer Gesprächsbeitrag entsteht, MUSS er innerhalb von 3 s im Gesprächsbereich stehen, ohne Neuladen der Seite. | AK-01, EK-02 | Test + Messung (20 Beiträge, Zeitstempel) |
| FA-03 | Gesprächsbeiträge MÜSSEN sein: jede Eingabe von Michael (im Terminal getippt, aus der UI als Freitext, Änderungen, Freigabe, Antwort auf eine Karte) und jeder Text, den Claude an Michael richtet, einschließlich Rückfragen und Plan-Vorlage; Werkzeugaufrufe, deren Ergebnisse, Dateiinhalte und Terminal-Rohausgabe DÜRFEN NICHT als Beiträge erscheinen. | B-01, AK-13 | Test (je Art ein Fall) |
| FA-04 | Zwischen zwei Beiträgen MUSS die Tätigkeit der Sitzung als ein zusammengeklappter Arbeitsblock erscheinen, der nur Anzahl der Werkzeugaufrufe und Dauer nennt; er DARF NICHT Inhalte von Werkzeugaufrufen zeigen. | B-01 („eingeklappt anbieten"), AN-S02 | Test + Review |
| FA-05 | Claudes Text MUSS gerendert erscheinen wie Dokumente im Leser (Überschriften, Listen, Tabellen, Codeblöcke); Kennungen bleiben unverändert lesbar. | AK-01; design.md §1 Prinzip 4 | Stichprobe |
| FA-06 | Jede Eingabe, die Michael im Terminal derselben Sitzung macht, MUSS als sein Beitrag im Gespräch erscheinen, und jede Eingabe aus dem Gesprächsbereich MUSS im Terminal der Sitzung stehen; eine Eingabe an eine arbeitende Sitzung MUSS sich einreihen und als „eingereiht" gezeigt werden; eine Eingabe bei geschlossener Sitzung oder offenem Dialog (außer Rückfrage) MUSS abgewiesen und mit Grund gemeldet werden. | AK-10, EK-04, AN-S09 | Test (Sitzungsprotokoll beide Richtungen; Kontrollfall) |
| FA-07 | Falls der Verlauf einer zugeordneten Sitzung nicht lesbar ist, MUSS der Gesprächsbereich das mit Ursache und nächstem Schritt sagen („im Terminal öffnen", „Sitzung neu starten"); Anmerkungen und Freigabe aus dem Leser bleiben davon unberührt. | AK-01, AK-11; design.md §4 (Fehler nach Aktion) | Test |
| FA-08 | Der Verlauf MUSS einen Neustart der UI überleben, solange die Sitzung existiert; Zuordnung, Einstellung Vorlesen und Reviewer-Auswahl je Sitzung MÜSSEN erhalten bleiben. | RB-05, AK-10 | Test |

### 3.2 Zustände und Karten

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-09 | Der Zustand „wartet im Terminal" aus INT-2026-004 (FA-13) MUSS in drei Werte zerfallen: „wartet · Rückfrage" (Rückfrage mit Auswahl offen), „wartet · Plan-Entscheidung" (Plan-Dialog offen), „wartet · Berechtigung" (anderer Dialog); Übersicht und Kopfzeile MÜSSEN den Wert nennen. Die Sortierung der Übersicht behandelt alle drei wie bisher „wartet im Terminal". | AK-02, AK-04, AK-11 | Test (je Wert ein Fall) |
| FA-10 | Falls die UI einen offenen Dialog nicht einordnen kann, MUSS sie ihn als „wartet · Berechtigung" mit dem Text „Sitzung zeigt einen Dialog — im Terminal antworten" behandeln; sie DARF NICHT raten und Tasten in die Sitzung geben. | AK-11, AN-02, ER-09 | Test |
| FA-11 | Freitext aus dem Gesprächsbereich MUSS die Sitzung als Text erreichen, nie als Befehl oder Tastenkürzel: führende `/` oder `!` und Zeilenumbrüche im Text DÜRFEN NICHT eine andere Wirkung haben als in einer eingefügten Textzeile. | AK-03, NZ-04; security.md §5 | Test |
| FA-12 | Wenn die Sitzung eine Rückfrage mit Auswahl stellt, MUSS der Gesprächsbereich innerhalb von 3 s eine offene Karte zeigen mit jeder Frage, ihren Optionen samt Beschreibung, dem Hinweis auf Mehrfachauswahl (falls erlaubt) und einem Freitextfeld „Anderes" je Frage. | AK-02, B-02 | Test + Playwright |
| FA-13 | Wenn Michael die Rückfrage-Karte abschickt, MUSS jede Frage eine Antwort haben (Option(en) oder Freitext), und die Sitzung MUSS mit genau dieser Antwort weiterarbeiten, als wäre sie im Terminal gegeben worden; die Karte wird zum Beitrag „Antwort: …". | AK-02 | Test + Playwright (Sitzungsprotokoll) |
| FA-14 | Wenn ein Dialog (Rückfrage, Plan, Berechtigung) im Terminal beantwortet wird, MUSS die Karte in der UI innerhalb von 3 s schließen und die dort gegebene Antwort als Beitrag zeigen. | AK-10 | Test |
| FA-15 | Solange eine Karte offen ist, DARF das Freitextfeld NICHT senden und MUSS auf die Karte verweisen; solange der Plan-Dialog offen ist, DARF „Freigeben" im Leser NICHT wählbar sein, und die Sendeleiste MUSS auf die Karte verweisen. | AK-02, AK-04; AN-S05 | Test |
| FA-16 | Wenn die Sitzung den Plan vorlegt, MUSS der Gesprächsbereich innerhalb von 3 s eine offene Karte zeigen mit dem vorgelegten Plan-Text (eingeklappt auf Überschriften, vollständig lesbar) und den Entscheidungen des Dialogs in dessen Benennung: annehmen ohne Nachfragen, annehmen mit Einzelbestätigung, ändern mit Text, abbrechen. | AK-04, B-03, AN-S06 | Test + Playwright |
| FA-17 | Wenn Michael auf der Plan-Karte entscheidet, MUSS die Sitzung genau diese Entscheidung erhalten (bei „ändern mit Text" mit dem Text) und weiterarbeiten; ungesendete Anmerkungen an `plan.md` MÜSSEN als Text übernehmbar sein, im Wortlaut der Änderungen (FA-27 aus INT-2026-004); die Karte wird zum Beitrag „Plan: [Entscheidung]". | AK-04 | Test + Playwright (Sitzungsprotokoll) |
| FA-18 | Solange die Plan-Karte offen ist, MUSS sie den externen Plan-Review starten lassen, mit derselben Reviewer-Liste, derselben Vorbelegung und demselben Auto-Schalter wie die Terminal-Leiste; eine Änderung an einem Ort MUSS am anderen innerhalb von 3 s sichtbar sein. | AK-05 | Test |
| FA-19 | Wenn ein Review läuft, MUSS die Karte den Fortschritt je Reviewer zeigen (läuft, fertig, fehlgeschlagen) und die Entscheidungen sperren; wenn er endet, MUSS das Ergebnis (zusammengeführte Befunde, „n von m geliefert") auf der Karte stehen und, wie heute, in der dritten Option des Terminal-Dialogs; „ändern mit Text" MUSS damit vorbelegt sein. | AK-05; design.md §4 (langlaufender Vorgang) | Test |
| FA-20 | Falls kein Reviewer liefert oder das Ergebnis nicht in den Dialog gelangt, MUSS die Karte das mit Ursache je Reviewer sagen, die Entscheidungen freigeben und einen erneuten Start anbieten; der Dialog bleibt offen. | AK-05, AK-12 (sinngemäß) | Test |
| FA-21 | Wenn die Sitzung auf eine Tool-Berechtigung wartet, MUSS der Gesprächsbereich eine Karte mit Werkzeugname und dem Knopf „Im Terminal öffnen" zeigen; der Knopf MUSS die Sitzung allein im Vollbild zeigen (wie INT-2026-005 AK-01/AK-02); die UI DARF den Dialog NICHT nachbauen. | AK-11, NZ-02, OF-01 | Test |
| FA-22 | Wenn am Mac ein Schritt gestartet wird, MUSS die UI auf der Vorhaben-Seite bleiben (bei „Absicht beginnen": auf die neue Vorhaben-Seite wechseln, sobald der Ordner entsteht) und den Gesprächsbereich der neuen Sitzung zeigen; der Sprung ins Terminal MUSS als Knopf in der Kopfzeile bleiben. | Z-01, AK-06, AN-S03 (ändert INT-2026-004 FA-35 / INT-2026-005 Z-01) | Test + Playwright |
| FA-23 | Ein Vorhaben MUSS sich am Mac von „Absicht beginnen" bis zur Bau-Fertigmeldung mit PR durchlaufen lassen, ohne dass die Terminal-Ansicht geöffnet wird, mit höchstens einer Öffnung für Berechtigungen. | AK-06, EK-01 | Stichprobe E2E (Bildschirmfoto je Phase, Zähler der Terminal-Öffnungen) |

### 3.3 Sprache

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-24 | Das Mikro DARF NUR durch eine ausdrückliche Handlung von Michael eingeschaltet werden (Klick oder Taste); sein Zustand (aus, hört zu, nicht verfügbar mit Grund) MUSS jederzeit in der Kopfzeile des Gesprächsbereichs mit Text und Symbol sichtbar sein; beim Öffnen der Seite, beim Verlassen und beim Sitzungswechsel ist es aus. | AK-14, AN-S11; design.md §5 | Test + Review |
| FA-25 | Solange das Mikro an ist, MUSS Gesprochenes fortlaufend als Text im Eingabefeld erscheinen, und wenn ein Sprechabschnitt endet und die Sitzung wartet oder arbeitet, MUSS der Text innerhalb von 3 s nach Sprechende in der Sitzung stehen (bei arbeitender Sitzung eingereiht); ist ein Dialog außer einer Rückfrage offen oder die Sitzung beendet, bleibt der Text im Feld, und die UI DARF NICHT von allein nachsenden. | AK-07, AK-03, EK-03, AN-S09 | Messung (5 Versuche) + Test |
| FA-26 | Wenn eine Rückfrage-Karte offen ist, MUSS Gesprochenes in das Freitextfeld dieser Karte gehen und mit dem Sprechende als Antwort gelten; Optionen werden nicht per Sprache gewählt. | AK-07, AK-02, AN-S10 | Test |
| FA-27 | Wenn Vorlesen eingeschaltet ist und ein Beitrag von Claude entsteht, MUSS das Vorlesen spätestens 3 s nach dem ersten vollständigen Satz beginnen und satzweise fortlaufen; vorgelesen wird nur Claudes Text an Michael; Codeblöcke, Tabellen und Auszeichnungszeichen werden übersprungen oder benannt; Arbeitsblöcke, Werkzeugaufrufe, Dateiinhalte und Terminal-Rohausgabe DÜRFEN NICHT vorgelesen werden. | AK-08, AK-13, EK-03 | Messung (5 Versuche) + Review + Stichprobe |
| FA-28 | Rückfrage-Karten MÜSSEN mit Frage und nummerierten Optionen vorgelesen werden; die Plan-Karte MUSS nur angekündigt werden (Titel, Entscheidungen), der Plan-Text DARF NICHT vorgelesen werden; Berechtigungs-Karten werden mit ihrem Hinweis vorgelesen. | AK-08, AK-13, AN-S13 | Test |
| FA-29 | Wenn Michael während des Vorlesens spricht (Mikro an), MUSS das Vorlesen innerhalb von 0,5 s stoppen; der Rest des Beitrags und alles Wartende verfällt, der Text bleibt lesbar, das Gesprochene zählt als Eingabe nach FA-25. Ist das Mikro aus, MUSS ein Knopf „Stopp" und das Abschicken einer getippten Eingabe dasselbe bewirken. | AK-09, B-05, AN-S14 | Test |
| FA-30 | Vorgelesene Sprache DARF NICHT als Eingabe von Michael zählen und DARF NICHT als Unterbrechen gelten. | AK-09, AK-14 | Test (Wiedergabe über Lautsprecher, Mikro an) |
| FA-31 | Vorlesen MUSS eine Einstellung je Nutzer sein, gespeichert im Backend, Standard aus, gültig auf allen Geräten und für alle Vorhaben; Mikro und Vorlesen MÜSSEN getrennt schaltbar sein. | B-07, RB-01 (AR-05), AN-S12 | Test |
| FA-32 | Falls ein Sprachdienst ausfällt (Erkennung oder Vorlesen), MUSS das Gespräch als Text weiterlaufen, der betroffene Schalter den Ausfall mit Ursache zeigen und einen erneuten Versuch anbieten; die Sitzung DARF davon NICHTS bemerken. | AK-12, RB-05 | Test (Dienst abgeschaltet) |
| FA-33 | Falls der Browser das Mikro verweigert oder kein sicherer Zugang besteht, MUSS der Mikro-Knopf „nicht verfügbar" mit Ursache und nächstem Schritt zeigen; alles Übrige läuft als Text. | AK-12, RB-06 | Test |
| FA-34 | Gesprochenes, erkannter Text und vorgelesener Text DÜRFEN NICHT gespeichert werden außer dort, wo sie ohnehin landen: im Verlauf der Sitzung (als Eingabe) und flüchtig beim Sprachdienst; die UI legt keine Audio- oder Transkriptdateien an. | RB-04; security.md §1 | Review |

## 4. Fehler- und Randfälle

| Fall | Erwartetes Verhalten | Herkunft |
|---|---|---|
| Rückfrage mit mehreren Fragen (bis zu vier) | Eine Karte mit allen Fragen; Abschicken erst, wenn jede beantwortet ist; Antwort je Frage. | FA-12, FA-13 |
| Rückfrage wird im Terminal beantwortet, während die Karte in der UI offen ist | Karte schließt binnen 3 s; die Terminal-Antwort erscheint als Beitrag; eine gleichzeitig in der UI abgeschickte Antwort wird abgewiesen („bereits im Terminal beantwortet"). | FA-14, FA-06 |
| Michael tippt im Terminal, während die UI eine Eingabe schickt | Beide Eingaben erscheinen in der Reihenfolge, in der die Sitzung sie erhalten hat; nichts geht verloren, nichts wird doppelt. | FA-06 |
| Sitzung endet, während eine Karte offen ist | Karte schließt mit „nicht beantwortet, Sitzung beendet"; Eingabefeld gesperrt; Verlauf bleibt lesbar. | Ablauf L |
| Dialog erkannt, aber nicht einzuordnen (Darstellung von Claude Code geändert) | Karte „Sitzung zeigt einen Dialog — im Terminal antworten" mit Terminal-Sprung; keine Tasten in die Sitzung. | FA-10 |
| Plan-Dialog offen, Michael wählt „annehmen", während der Review läuft | Nicht möglich: Entscheidungen sind gesperrt, bis der Review geliefert hat oder fehlgeschlagen ist (höchstens die heutige Wartezeit des Reviews). | FA-19, AN-S07 |
| Kein Reviewer liefert | Karte nennt je Reviewer die Ursache; Entscheidungen frei; erneuter Start möglich; Dialog offen. | FA-20 |
| Review geliefert, aber der Dialog ist inzwischen zu (im Terminal entschieden) | Karte zeigt das Ergebnis mit Vermerk „Dialog bereits geschlossen — Ergebnis nur hier lesbar"; kein Text wird in die Sitzung getippt. | FA-14, FA-20 |
| Anmerkungen an `plan.md` liegen vor, Plan-Dialog geht auf | Sendeleiste sagt „Plan-Entscheidung offen — Karte im Gespräch"; die Plan-Karte bietet „Anmerkungen als Änderungstext übernehmen"; die Anmerkungen bleiben erhalten, bis sie übernommen und geschickt oder gelöscht werden. | FA-15, FA-17 |
| Sehr langer Claude-Beitrag (mehrere tausend Wörter, z. B. Plan-Text) | Vollständig lesbar, im Gesprächsbereich scrollbar, Plan-Text eingeklappt auf Überschriften; Vorlesen nur laut FA-27/FA-28. | FA-05, FA-16, FA-28 |
| Claude antwortet, während Michael nach oben gescrollt hat | Der Bereich springt nicht; ein Hinweis „neuer Beitrag" führt nach unten. | FA-02; design.md §1 |
| Zwei Fenster am Mac zeigen dasselbe Vorhaben | Beide zeigen denselben Verlauf und dieselben Karten; eine Antwort in einem Fenster schließt die Karte im anderen binnen 3 s. | FA-14; AR-05 |
| Verlauf nicht lesbar (Sitzung vor der letzten Auslieferung gestartet, meldet an alten Port; Datei fehlt) | Gesprächsbereich mit Ursache und Weg; Leser-Funktionen wie heute. | FA-07 |
| Freitext beginnt mit `/` oder `!` | Kommt als Text an; die Sitzung behandelt ihn nicht als Befehl; die UI weist nicht ab und ändert den Text nicht. | FA-11 |
| Mikro an, lange Stille | Mikro bleibt an, Zustand „hört zu"; kein Zeitlimit; nichts wird gesendet. | FA-24, FA-25 |
| Erkannter Text ist leer oder besteht nur aus Füllwörtern/Rauschen | Nichts wird gesendet; das Feld bleibt leer. | FA-25 |
| Michael spricht oder tippt, Sitzung arbeitet gerade | Text wird eingereiht und als „eingereiht" gezeigt; die Sitzung verarbeitet ihn nach ihrem aktuellen Zug; im Terminal steht er wie eine dort eingereihte Eingabe. | FA-06, FA-25, AN-S09 |
| Michael spricht oder tippt, Plan-Dialog oder Berechtigung offen | Text bleibt im Feld mit dem Hinweis des Feldes; nichts wird in den Dialog getippt. | FA-15, FA-25 |
| Spracherkennung fällt mitten im Satz aus | Mikro aus, Knopf „nicht verfügbar: … — erneut versuchen"; der bis dahin erkannte Text bleibt im Feld. | FA-32 |
| Vorlesen läuft, neuer Beitrag kommt | Wird nachgelesen in Reihenfolge; ein Unterbrechen verwirft alles Wartende. | FA-27, FA-29 |
| Vorlesen läuft, Michael tippt (spricht nicht) | Vorlesen läuft weiter; erst Abschicken oder „Stopp" beendet es. | FA-29, AN-S14 |
| Lautsprecher und Mikro offen: Vorgelesenes wird erkannt | Zählt nicht als Eingabe, nicht als Unterbrechen (kein Echo). Gelingt das nicht sicher, muss die UI beim Einschalten beider Schalter darauf hinweisen (Kopfhörer). | FA-30; Abschnitt 7 |
| Vorlesen fällt aus | Schalter zeigt Ausfall mit Ursache; Text da; Sitzung unberührt. | FA-32 |
| Browser verweigert Mikro / kein sicherer Zugang | Knopf „nicht verfügbar" mit Ursache („Zugriff verweigert — in den Browser-Einstellungen erlauben", „nur über HTTPS oder localhost"). | FA-33 |
| Seite verlassen bei Mikro an oder Vorlesen läuft | Mikro aus, Vorlesen stoppt; Einstellung Vorlesen bleibt. | FA-24, FA-31 |
| Neustart der UI während einer Eingabe | Genau einmal angekommen oder „nicht bestätigt — im Terminal prüfen" (wie INT-2026-004). | Ablauf J |
| Sitzung von Hand im Terminal mit `/specwright:spec INT-…` gestartet | Zuordnung nach FA-21 (INT-2026-004); Gesprächsbereich zeigt sie genauso wie eine per Knopf gestartete. | FA-01 |
| Sitzung mit einem anderen Modell (Provider-Wrapper) gestartet | Gespräch, Karten und Sprache verhalten sich gleich, solange die Sitzung eine Claude-Code-Sitzung ist (AN-03). | Z-02 |

## 5. Daten, fachlich

<!-- Welche fachlichen Informationen sichtbar werden, entstehen, sich ändern oder verschwinden. Ohne Tabellen- oder Feldnamen. Datenklasse laut security.md nennen. -->

| Information | Entsteht / ändert sich / verschwindet | Wer sieht sie | Datenklasse |
|---|---|---|---|
| Verlauf des Gesprächs (Beiträge, Rückfragen, Antworten, Plan-Vorlage und -Entscheidung) | Entsteht in der Claude-Code-Sitzung; die UI liest ihn nur; verschwindet aus der UI mit dem Sitzungswechsel, nicht aus der Sitzung | Michael (Vorhaben-Seite, Terminal) | intern (Projektinhalt des jeweiligen Projekts; dessen `security.md` gilt) |
| Offene Karte (Rückfrage, Plan, Berechtigung) mit Optionen und Text | Entsteht mit dem Dialog der Sitzung, verschwindet mit seiner Beantwortung (in UI oder Terminal) | Michael | intern |
| Antworten von der Vorhaben-Seite (Freitext, Option, Plan-Entscheidung, Änderungstext) | Entstehen bei Michael, landen in der Sitzung; ein Eintrag im Protokoll des Vorhabens wie bei Änderungen und Freigabe (INT-2026-004, FA-31) | Michael | intern |
| Einstellung „Vorlesen" (an/aus) | Entsteht beim ersten Umschalten; je Nutzer; gültig auf allen Geräten | Michael | intern |
| Zustand des Mikros (aus / hört zu / nicht verfügbar) | Flüchtig je Seite und Gerät; nie gespeichert | Michael | — |
| Reviewer-Auswahl und Auto-Schalter je Sitzung | Bestehend (Terminal-Leiste); jetzt auch von der Vorhaben-Seite änderbar | Michael | intern |
| Review-Ergebnis (Befunde, Lieferstand je Reviewer) | Entsteht beim Review; sichtbar auf der Karte, bis der Dialog zu ist; landet wie heute im Dialog der Sitzung | Michael | intern |
| Audio vom Mikro, erkannter Text | Entsteht beim Sprechen; geht zum Erkennungsdienst; erkannter Text wird Eingabe; Audio wird nirgends gespeichert | Michael; Erkennungsdienst flüchtig | intern (verlässt den Host zum Dienst, RB-04) |
| Text zum Vorlesen, erzeugtes Audio | Claudes Text geht zum Vorlese-Dienst; Audio wird abgespielt, nicht gespeichert | Michael; Vorlese-Dienst flüchtig | intern (verlässt den Host zum Dienst, RB-04) |
| Zustand der Sprachdienste (verfügbar / ausgefallen mit Ursache) | Flüchtig; sichtbar an den Schaltern | Michael | — |
| Zugänge zu den Sprachdiensten | Bestehend, lokal; unverändert | niemand in der UI | vertraulich |

## 6. Was der Nutzer sieht

<!-- Nur bei UI-Änderung. Beschreibung in Worten; Mock unter `design/` (Pfad nennen), sonst „kein Mock nötig, weil …". -->

- **Vorhaben-Seite, Gesprächsbereich (neu):** Am Mac neben den Dokumenten, das Gespräch rechts, die Dokumente behalten den Leser mit Anmerkungen und Sendeleiste. Kopfzeile des Bereichs: Sitzungsname, Arbeitskopie, Zustand, Schalter „Vorlesen", Knopf „Im Terminal öffnen". Verlauf mit Beiträgen (Absender, Uhrzeit), Arbeitsblöcken und Karten. Unten das Eingabefeld mit Sende-Knopf und Mikro-Knopf; bei gesperrtem Feld steht der Grund an der Stelle des Sende-Knopfs. Wie sich Dokument und Gespräch die Breite teilen und ob eines einklappbar ist: Mock.
- **Karten:** Rückfrage (Frage, Optionen mit Beschreibung, „Anderes", Abschicken), Plan (Titel, eingeklappter Plan-Text, „Extern prüfen lassen" mit Reviewer-Auswahl und Auto-Schalter, Fortschritt je Reviewer, Ergebnis, vier Entscheidungen, Textfeld bei „ändern mit Text" mit „Anmerkungen übernehmen"), Berechtigung (Werkzeug, „Im Terminal öffnen"). Zustände je Karte: offen, gesperrt (Review läuft), beantwortet (als Beitrag), verfallen (Sitzung beendet).
- **Übersicht:** Zustandstexte „wartet · Rückfrage", „wartet · Plan-Entscheidung", „wartet · Berechtigung" statt „wartet im Terminal"; sonst unverändert.
- **Projekt-Seite / Start eines Schritts:** kein Wechsel ins Terminal mehr; nach „Absicht beginnen" wechselt die UI auf die neue Vorhaben-Seite. Kein neuer Bildschirm.
- **Sprache:** Mikro-Knopf mit drei Zuständen (Text + Symbol), Live-Text im Feld, „wird vorgelesen"-Marke mit „Stopp" am Beitrag, Ausfall-Hinweise an den Schaltern.
- **Terminal-Ansicht:** unverändert (Roh-Ansicht, Terminal-Leiste mit Review-Umschalter bleibt).
- **Handy:** nicht Teil des Vorhabens (NZ-01); der Gesprächsbereich darf am Handy vorerst fehlen oder als eigener Reiter erscheinen — Mock zeigt nur den Mac.
- **Mocks (Pflicht nach `design.md` §6, neuer Ablauf auf bestehender Seite):** `design/08-gespraech-mac` (Vorhaben-Seite mit Gesprächsbereich, Verlauf, Arbeitsblock, Eingabefeld gesperrt/aktiv), `design/09-karten-mac` (Rückfrage-Karte, Plan-Karte mit Review-Fortschritt und Ergebnis, Berechtigungs-Karte), `design/10-sprache-mac` (Mikro-Zustände, Live-Text, Vorlesen-Marke, Ausfall). Entstehen direkt nach der Spec-Freigabe, vor `/plan`, wie bei INT-2026-004.

## 7. Bedenken aus den Projekt-Docs

<!-- PFLICHT. Beim Schreiben wurden product-brief, architecture, security, design gelesen. Alles, was dort reibt, steht hier — markiert, nicht entschieden.
     „Geklärt" heißt: die zuständige Rolle hat entschieden; Entscheidung steht in der Spalte. Vor der Freigabe muss jede Zeile geklärt oder als „offen, blockiert nicht, weil …" begründet sein.
     Gibt es nichts: „Keine — geprüft gegen Stand [sha]." -->

Geprüft gegen Stand 52dbeff.

| Quelle | Bedenken | Betrifft | Geklärt? (wer, wann, wie) |
|---|---|---|---|
| security.md §1 Datenklassen („die UI verarbeitet Projektinhalte der jeweiligen Projekte, deren `security.md` gilt"); intent RB-04 | Vorlesen schickt Claudes Text, das Mikro schickt Michaels Stimme an externe Sprachdienste. In Vorhaben anderer Projekte (Kreis Lippe: Behörde; Applai: Kandidatendaten) können das Inhalte sein, die deren Regeln nicht an Dritte lassen. Standard aus (B-07) mildert, entscheidet aber nicht. | FA-27, FA-25, FA-34 | geklärt: Product Owner, 2026-09-16 (D1) — Standard aus bleibt; beim ersten Einschalten je Gerät ein Hinweis, dass Text und Stimme zu den Diensten gehen; kein Schalter je Projekt in diesem Vorhaben. „Sprache je Projekt sperrbar" als Folge-Vorhaben (Board-Karte). |
| security.md §1 Datenklassen; §5 (nichts ins öffentliche Repo) | Der Verlauf zitiert Projektinhalte; Screenshots für AK-06 und Mocks dürfen keine echten Inhalte fremder Projekte und keine Host-Details zeigen. | FA-23, Abschnitt 6 | geklärt durch intent RB-04/RB-05 und ER-04 (Product Owner, 15.09.): E2E nur gegen Branch-Backend mit Scratch-Projekt; Review vor Commit. |
| security.md §3 Geheimnisse | Die Zugänge zu den Sprachdiensten fehlen in der Tabelle §3 (heute nur in der lokalen Sprach-Konfiguration, RB-03). | FA-32, FA-34 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Zeile in §3 in der PR der Stufe 3; Rotation: Nutzer. |
| security.md §6 Pflichtprüfung „Endpunkt anlegen oder ändern"; §2 T-06 (UI führt Befehle über das Terminal aus) | Neue Wege in die Sitzung: Freitext, Karten-Antworten (Tasten in einen Dialog), Audio-Strom, Einstellungen; neue Wege heraus: Verlauf lesen. Kein neuer offener Zugang, Zugriffsmodell bleibt netzseitig; T-06 wird nicht verschlimmert, aber jede Karte ist ein weiterer Weg, in ein Terminal zu tippen. | FA-06, FA-11, FA-13, FA-17, FA-25 | offen — an den Plan delegiert, nicht blockierend. Der Plan nennt je Kanal: Zugriffsbegrenzung (bestehender Kanal), Eingabevalidierung (Länge, Zeichen; bei Karten nur die vom Dialog angebotenen Optionen), Datenklasse. |
| security.md §5 Verbotsliste (Sinn: T-06) | Freitext darf in der Sitzung nie als Befehl wirken. | FA-11 | geklärt fachlich (FA-11, wie FA-33 in INT-2026-004); wie: Plan. |
| security.md §7 (T-06 offen, eigenes Vorhaben) | Unverändert; dieses Vorhaben schließt Anmeldung aus (NZ-06). | — | geklärt durch intent RB-03/NZ-06 (Product Owner, 15.09.). |
| architecture.md §3 Datenbesitz | Der Verlauf der Sitzung ist eine Datenquelle, die die UI bisher nicht liest (Besitzer: Claude Code, Speicher außerhalb des Repos); die Einstellung „Vorlesen" ist neuer Nutzerzustand. Beides fehlt in §3. | FA-01, FA-08, FA-31 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Zeile „Sitzungsverlauf — Besitzer Claude Code, die UI liest nur" und Ergänzung der Nutzerzustand-Zeile; ADR nur, wenn die UI eine eigene Ablage des Verlaufs anlegt (Vorschlag: keine, AN-S01). |
| architecture.md AR-05 (Nutzerzustand im Backend) | „Vorlesen" muss auf allen Geräten gleich sein; Mikro-Zustand ist bewusst flüchtig je Gerät (AK-14) — eine Ausnahme von „gleiche Sicht auf jedem Gerät", fachlich gewollt. | FA-24, FA-31 | geklärt fachlich (FA-24/FA-31, AN-S11/AN-S12): Mikro ist eine Hardware-Eigenschaft des Geräts, keine Sicht. Bestätigung: AN-S11. |
| architecture.md §2 (Backend: Antworten als Eingabe in die wartende PTY); intent RB-02, ER-09 | Karten-Antworten steuern Dialoge über Tasten, deren Darstellung die UI vom Bildschirm liest — so wie der Review-Inject heute. Das ist die zerbrechlichste Stelle (Claude-Code-Updates ändern die Darstellung; die Plan-Erkennung ist genau daran schon einmal gestorben). | FA-13, FA-17, FA-19, FA-10 | offen — an den Plan delegiert, nicht blockierend. Fachlich abgesichert durch FA-10 (fail closed: nicht raten, ins Terminal verweisen) und FA-14. Vorschlag: Dialogzustand vor und nach jeder Taste lesen, wie heute beim Review; Tests mit aufgezeichneten Bildschirmen je Claude-Code-Version. |
| architecture.md AR-06 (Framework nie von der UI abhängig); intent NZ-04 | Keine Marker in Workflows nötig: Rückfragen und Plan-Dialog sind Claude-Code-Mechanismen, keine Workflow-Mechanismen. | FA-12, FA-16 | geklärt fachlich, Spec 15.09.: Workflows unverändert. Bestätigung: AN-S08. |
| architecture.md §5 Externe Systeme | Sprachdienste (Erkennung, Vorlesen) fehlen in §5, obwohl der Voice-Call sie seit März nutzt. | FA-32 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: zwei Zeilen in §5 in der PR der Stufe 3 (Wofür, Ausfall = Text weiter, Zugang = lokale Sprach-Konfiguration). |
| architecture.md §10 bekannte Abweichungen; intent OF-02 | Nach Stufe 3 gibt es zwei Sprach-Gesprächspartner (Voice-Call mit SDK-Aufruf unter „Team → Anrufen", Sitzung als Gespräch). NZ-05 lässt den Voice-Call stehen. | — | geklärt: Product Owner, 2026-09-16 (D4, OF-02) — Voice-Call bleibt in diesem Vorhaben unangetastet; nach Stufe 3 Aufräum-Karte „Voice-Call abbauen oder auf die Sitzung umziehen" im Board; bis dahin Zeile in §10 (Plan, Stufe 3). |
| architecture.md §2 (Backend „Vorhaben-Sicht und Review-Kanal") | Der Gesprächsbereich erweitert den Review-Kanal um Freitext und Dialog-Antworten; §2 muss das nennen. | FA-06, FA-13 | offen — an den Plan delegiert, nicht blockierend (Doku-Nachzug in der PR der Stufe 1). |
| design.md §1 Prinzip 1 (eine Aktion pro Bildschirm zuerst; kein Element ohne Aufgabe) | Die Vorhaben-Seite trägt danach Leser, Anmerkungen, Sendeleiste, Gespräch, Karten, Mikro, Vorlesen. Überfrachtungsgefahr. | Abschnitt 6 | offen — an die Mocks delegiert, nicht blockierend. Vorschlag: eine Karte ist immer die erste Aktion (oben im Gespräch); Sprachschalter nur am Eingabefeld und in der Kopfzeile; Leser und Gespräch einklappbar. |
| design.md §1 Prinzip 4 (bestehende Komponenten zuerst) | Es gibt einen SDK-Chat, eine Voice-Call-Oberfläche, den Review-Umschalter der Terminal-Leiste und den Dokument-Leser. Ob sie wiederverwendet werden, entscheidet der Plan; fachlich zählt nur FA-05, FA-18. | FA-05, FA-18 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Leser-Rendering und Review-Umschalter wiederverwenden; SDK-Chat nicht (anderer Sitzungstyp, NZ-03). |
| design.md §4 Muster „Langlaufender Vorgang: Fortschritt je Schritt, nie nur Spinner" | Review dauert Minuten. | FA-19 | geklärt fachlich (FA-19: Fortschritt je Reviewer). |
| design.md §4 Muster „Fehler nach Aktion: inline mit Ursache und nächstem Schritt" | Übernommen in FA-07, FA-20, FA-32, FA-33 und in die Gründe am Eingabefeld. | FA-07, FA-20, FA-32, FA-33 | geklärt fachlich, Spec 15.09. |
| design.md §5 (Tastatur-Bedienbarkeit, Kontrast, Fokus, Labels) | Karten-Optionen, Mikro- und Vorlesen-Schalter müssen per Tastatur erreichbar sein; Mikro-Zustand nicht nur über Farbe (AK-14). | FA-12, FA-16, FA-24 | geklärt fachlich (FA-24: Text + Symbol); Tastaturwege: Mocks und Plan. |
| design.md §5 (Mobil zuerst für Cloud-Terminal, Projektwechsel); intent NZ-01 | Der Gesprächsbereich wird nur für den Mac entworfen; er darf das Handy nicht ausschließen. | Abschnitt 6 | geklärt durch intent NZ-01 (Product Owner, 15.09.): nichts in den Abläufen setzt Maus, Hover oder Mindestbreite voraus; Handy-Ausgestaltung als Folge-Vorhaben. |
| design.md §6 (Mock Pflicht: neuer Ablauf) | Drei Mocks nötig (Abschnitt 6). Wann? | Abschnitt 6 | geklärt: Product Owner, 2026-09-16 (D5) — direkt nach der Freigabe, vor `/plan`, wie bei INT-2026-004. |
| design.md §3 (Terminal: Buffer-Replay zweimal regressiert — nicht anfassen ohne Test) | Alles, was die UI in die Sitzung tippt, läuft durch dieselbe PTY, die das Terminal zeigt. | FA-06, FA-13, FA-17 | offen — an den Plan delegiert, nicht blockierend (Regel für den Bau: Terminal-Replay bleibt unberührt; Tests). |
| product-brief.md §7 (kein Werkzeug für Teams; ein Entwickler) | Sprache und Gespräch sind für einen Nutzer; keine Sprecher-Erkennung, keine Mehrbenutzer-Funktionen. | — | geklärt durch intent NZ-06 (Product Owner, 15.09.). |
| product-brief.md §5 Kernfunktionen (Zeile Web-UI) | Die Zeile nennt Vorhaben-Übersicht, Leser, Review-Kanal, Cloud-Terminal; Gespräch und Sprache fehlen. | — | offen — an den Plan delegiert, nicht blockierend (Zeile in der PR der Stufe 1 bzw. 3 ergänzen). |
| product-brief.md §2 (Agent, der ein Projekt frisch öffnet) | Unberührt: Der Agent liest Dateien, nicht die UI (AR-06). | — | geklärt: keine Reibung. |
| INT-2026-004 spec.md Ablauf E Schritt 6, FA-35, AN-S14; INT-2026-005 Z-01/AK-01/AK-02 (Start eines Schritts springt am Mac ins Terminal, Vollbild) | Widerspricht Z-01 dieses Vorhabens (Terminal bleibt zu). FA-22 kehrt das um: Start bleibt auf der Vorhaben-Seite. Das ändert Verhalten, das vor wenigen Stunden gebaut wurde (PR #49); der Vollbild-Mechanismus bleibt für „Im Terminal öffnen" (FA-21) erhalten. | FA-22, FA-21 | geklärt: Product Owner, 2026-09-16 (D2) — FA-22 gilt; Nachtrag in INT-2026-004 spec.md (Ablauf E Schritt 6, AN-S14) in der PR der Stufe 1. |
| INT-2026-004 spec.md FA-13, FA-30 („wartet im Terminal (Dialog) — im Terminal antworten") | Für Rückfrage und Plan-Dialog gilt das nicht mehr; nur noch für Berechtigungen. FA-09 und FA-15 verfeinern. | FA-09, FA-15 | geklärt fachlich (FA-09, FA-15); Nachtrag in INT-2026-004 spec.md in der PR der Stufe 2. |
| intent OF-01 (Tool-Berechtigungen: reicht AK-11?) | Sitzungen aus der UI laufen heute mit übersprungenen Berechtigungen; der Plan-Dialog kommt trotzdem. Berechtigungs-Dialoge sind damit selten, aber möglich (z. B. Sitzung von Hand ohne die Argumente gestartet). | FA-21 | geklärt: Product Owner, 2026-09-16 (D3, OF-01) — reicht; kein eigenes Berechtigungs-Verhalten der UI; EK-01 misst, wie oft der Sprung nötig wird. |
| intent OF-03 (Sprachdienste: vorhandene Adapter oder Browser-eigene) | Fachlich neutral: FA-25, FA-27 gelten für beide; EK-03 entscheidet. Ein Wechsel des Dienstes ist ER-02. | FA-25, FA-27, FA-32 | geklärt durch intent (Tech Lead, Plan-Freigabe); die Spec legt nichts fest. |
| intent AN-01 (Verlauf lesbar, zeitnah, mit Rückfragen und Optionen) | Stichprobe 15.09.: Der Verlauf einer Sitzung enthält Claudes Text, Michaels Eingaben, Rückfragen mit Optionen, die gegebene Antwort und die Plan-Vorlage, jeweils mit Zeitstempel [Certain, eine Sitzung vom 09.09.]. Ob er zeitnah genug für 3 s ist: Plan (AN-01, Messung). | FA-01, FA-02, FA-12, FA-16 | offen — an den Plan delegiert, nicht blockierend (AN-01 der Absicht; Rückfallebene Bildschirmkopie). |

## 8. Nicht im Umfang

<!-- Aus NZ der intent.md plus alles, was beim Schreiben ausgeschlossen wurde. -->

- NZ-01: Kein Handy in diesem Vorhaben; nichts, was die Handy-Ansicht später ausschließt.
- NZ-02: Tool-Berechtigungs-Dialoge werden nicht als Formular nachgebaut (FA-21).
- NZ-03: Kein zweiter Sitzungstyp; der SDK-Chat unter „Chat" bleibt, wie er ist.
- NZ-04: Keine Änderung an Workflows und Vorlagen; keine Marker (AN-S08).
- NZ-05: Kein eigener Sprach-Assistent; der Voice-Call bleibt unangetastet, bis OF-02 entschieden ist.
- NZ-06: Kein Aufwachwort, keine Nutzerverwaltung, keine Mehrbenutzer-Funktionen.
- Zusätzlich ausgeschlossen beim Schreiben der Spec:
    - Verlauf früherer Sitzungen desselben Vorhabens in der UI (AN-S04); nur die zugeordnete Sitzung.
    - Inhalte von Werkzeugaufrufen im Gespräch, auch nicht aufklappbar (AN-S02); dafür ist das Terminal da.
    - Optionen einer Rückfrage per Sprache wählen (AN-S10).
    - Vorlesen des Plan-Texts (AN-S13).
    - Abbrechen eines laufenden Reviews (AN-S07).
    - Eigene Ablage des Gesprächsverlaufs durch die UI; Export, Suche oder Durchsuchen des Verlaufs.
    - Einstellung „Vorlesen" je Projekt oder je Vorhaben (Abschnitt 7, erste Zeile: Folge-Vorhaben, falls der Product Owner es will).
    - Sprecher-Erkennung, Aufwachwort, Stimmauswahl, Sprachen außer Deutsch und Englisch (was die Dienste heute können, bleibt).
    - Unterbrechen der Sitzung selbst (Escape/Abbruch der laufenden Arbeit) aus der UI; B-05 meint nur das Vorlesen.
    - Handy-Mikro-Knopf („Voice coming soon") — bleibt, wie er ist.
    - Änderungen am Terminal, an der Terminal-Leiste und am Review-Umschalter dort (nur: die Einstellung ist an beiden Orten dieselbe, FA-18).
    - Merge des PR aus der UI (ER-07).

## 9. Annahmen

<!-- Vorläufige Auslegungen nach ER-00 der intent.md. Werden bei der Freigabe gesammelt bestätigt. -->

- **AN-S01:** Der Gesprächsbereich zeigt den Verlauf der Sitzung seit ihrem Start, nicht nur Beiträge ab dem Öffnen der Seite (AK-01 spricht nur von neuen Beiträgen; ohne Verlauf wäre AK-06 nicht erfüllbar, weil Michael die Seite nicht dauernd offen hat). Die UI legt dafür keine eigene Ablage an; der Verlauf kommt aus der Sitzung. — bestätigt am 2026-09-16 von Product Owner
- **AN-S02:** Werkzeugaufrufe erscheinen nur als zusammengeklappter Arbeitsblock mit Anzahl und Dauer, ohne Inhalte, nicht aufklappbar (engste Auslegung von B-01 „darf eingeklappt anbieten"). — bestätigt am 2026-09-16 von Product Owner
- **AN-S03:** Der Start eines Schritts springt am Mac nicht mehr ins Terminal (kehrt INT-2026-004 FA-35/AN-S14 und INT-2026-005 Z-01 um); „Im Terminal öffnen" bleibt als Knopf mit demselben Vollbild-Verhalten. Bei „Absicht beginnen" wechselt die UI auf die neue Vorhaben-Seite, sobald der Ordner entsteht; bis dahin zeigt die Projekt-Seite „Sitzung gestartet — Vorhaben entsteht". — bestätigt am 2026-09-16 von Product Owner
- **AN-S04:** Je Vorhaben gibt es genau ein Gespräch: das mit der zugeordneten Sitzung. Frühere Sitzungen sind in der UI nicht mehr lesbar (Terminal und Protokoll bleiben). — bestätigt am 2026-09-16 von Product Owner
- **AN-S05:** Solange eine Karte offen ist, ist das Freitextfeld gesperrt; solange der Plan-Dialog offen ist, ist „Freigeben" im Leser nicht wählbar (genau ein Antwortweg je offenem Dialog). — bestätigt am 2026-09-16 von Product Owner
- **AN-S06:** Die Plan-Karte zeigt vier Entscheidungen: die drei Optionen des Dialogs in dessen Benennung und „abbrechen" (entspricht dem Verlassen des Dialogs im Terminal). AK-04 nennt „annehmen, ändern mit Text, ablehnen"; „annehmen" zerfällt in die zwei Annehmen-Optionen des Dialogs, „ablehnen" ist „abbrechen". — bestätigt am 2026-09-16 von Product Owner
- **AN-S07:** Während ein Review läuft, sind die Entscheidungen der Plan-Karte gesperrt; ein laufender Review ist nicht abbrechbar (wie heute). — bestätigt am 2026-09-16 von Product Owner
- **AN-S08:** Keine Marker in Workflows; Rückfragen und Plan-Dialog werden als Claude-Code-Mechanismen erkannt (NZ-04, AR-06). — bestätigt am 2026-09-16 von Product Owner
- **AN-S09:** Gesprochenes und getippter Freitext werden gesendet, wenn die Sitzung wartet oder arbeitet; bei arbeitender Sitzung reiht sich der Text ein (wie beim Tippen im Terminal) und wird als „eingereiht" gezeigt. Nur bei offenem Dialog (außer Rückfrage) oder beendeter Sitzung bleibt der Text im Feld, und die UI sendet nichts von allein nach. Die engste Auslegung von AK-03 (nur senden, wenn die Sitzung wartet) wurde vorgelegt und vom Product Owner verworfen (R1, 2026-09-16: „Einreihen erlauben"). — bestätigt am 2026-09-16 von Product Owner
- **AN-S10:** Bei offener Rückfrage geht Gesprochenes als Freitext „Anderes" in die Karte; Optionen werden nicht per Sprache gewählt. — bestätigt am 2026-09-16 von Product Owner
- **AN-S11:** Das Mikro ist je Gerät und je Seite flüchtig; es geht beim Verlassen der Seite und beim Sitzungswechsel aus; kein Zeitlimit bei Stille. — bestätigt am 2026-09-16 von Product Owner
- **AN-S12:** „Vorlesen" ist eine Einstellung je Nutzer, gültig auf allen Geräten und für alle Vorhaben; keine Einstellung je Projekt oder je Vorhaben. — bestätigt am 2026-09-16 von Product Owner
- **AN-S13:** Rückfragen werden mit Optionen vorgelesen; die Plan-Karte wird nur angekündigt, der Plan-Text nicht vorgelesen; Berechtigungs-Karten mit ihrem Hinweis. — bestätigt am 2026-09-16 von Product Owner
- **AN-S14:** Unterbrechen (B-05) verwirft den Rest des Beitrags und alle wartenden Beiträge; Tippen unterbricht nicht, Abschicken und „Stopp" schon. — bestätigt am 2026-09-16 von Product Owner
- **AN-S15:** Stufen-Zuschnitt wie in Ablauf M (1: lesen und Freitext; 2: Karten und Review; 3: Sprache), Zeitbudget 4 / 3 / 3 Sitzungen. — bestätigt am 2026-09-16 von Product Owner
- **AN-S16:** Der Zustand „wartet im Terminal" (INT-2026-004 FA-13) zerfällt in „wartet · Rückfrage", „wartet · Plan-Entscheidung", „wartet · Berechtigung"; die Sortierung bleibt. — bestätigt am 2026-09-16 von Product Owner

## 10. Freigabe

- [x] Jede FA hat Herkunft und Prüfung.
- [x] Jedes AK der intent.md ist von mindestens einer FA abgedeckt (Matrix unten, AK-01 bis AK-14).
- [x] Abschnitt 7 vollständig geklärt oder begründet offen (D1–D5 durch den Product Owner am 2026-09-16; übrige offene Zeilen an den Plan delegiert, nicht blockierend).
- [x] Keine Technik, keine Architektur, keine Dateinamen in diesem Dokument (Dokumentnamen der Vorhaben sind Fachbegriffe; Pfade nur in Abschnitt 7 als Herkunft).
- [x] Bei risikoklasse hoch: Tech Lead hat gelesen. (nicht zutreffend, mittel)
- **Freigegeben:** Product Owner (Michael Sindlinger), 2026-09-16, Commit siehe `git log -- spec.md`

**Zuordnung AK → FA:**

| AK | FA |
|---|---|
| AK-01 | FA-01, FA-02, FA-03, FA-05, FA-07 |
| AK-02 | FA-09, FA-12, FA-13, FA-15 |
| AK-03 | FA-06, FA-11, FA-25 |
| AK-04 | FA-09, FA-15, FA-16, FA-17 |
| AK-05 | FA-18, FA-19, FA-20 |
| AK-06 | FA-22, FA-23 |
| AK-07 | FA-25, FA-26 |
| AK-08 | FA-27, FA-28 |
| AK-09 | FA-29, FA-30 |
| AK-10 | FA-06, FA-08, FA-14 |
| AK-11 | FA-07, FA-09, FA-10, FA-21 |
| AK-12 | FA-20, FA-32, FA-33 |
| AK-13 | FA-03, FA-04, FA-27, FA-28 |
| AK-14 | FA-24, FA-30 |
| RB-04 | FA-34 |
| RB-05 | FA-08, FA-32 |
