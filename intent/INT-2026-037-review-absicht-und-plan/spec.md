# Spec: Review für Absicht und Plan aus dem Vorhaben-Ordner, automatisch und ausfallsicher

> **Intent:** `intent.md` (INT-2026-037, Version 1.0.0)
> **Status:** freigegeben
> **Erstellt:** 2026-10-27 · **Freigabe:** Michael (Product Owner), 2026-10-27
> **Gelesene Projekt-Docs:** `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` (Stand: Commit 63d3cc2)
> **Format:** 2.2

<!-- Die Spec ist FACHLICH. Sie beschreibt, was Nutzer erleben und was fachlich gelten muss.
     Nicht hinein gehören: Dateien, Komponenten, Datenbanktabellen, Bibliotheken, Architekturentscheidungen. Das ist plan.md.
     Die Projekt-Docs werden gelesen und dürfen hier nur BEDENKEN markieren (Abschnitt 7). Sie entscheiden nichts.
     Jede Anforderung verweist auf ein Ziel oder Abnahmekriterium der intent.md. Keine Anforderung ohne Herkunft. -->

## 1. Zusammenfassung

<!-- leser: mensch -->

Nach diesem Vorhaben prüfen frische Prüfer nicht nur den Plan, sondern auch die Absicht, und zwar die Datei im Vorhaben-Ordner statt einer Arbeitskopie (Z-01, Z-02, AK-01 bis AK-03). Entsteht eine Absicht in einer Sitzung der Web-UI, startet das Review einmal von selbst, sobald die Sitzung anhält; jedes weitere Review gibt es auf Knopfdruck (Z-03, AK-04, AK-05). Vor jedem Review werden die Prüfer kurz angefragt, ausgefallene durch eine Ersatzreihe ersetzt und Ausfälle offen genannt; der Autor darf einen Befund nur mit Beleg ablehnen, sonst entscheidet Michael (Z-04, Z-05, AK-06 bis AK-11).

## 2. Nutzer und Abläufe

<!-- leser: mensch -->

Nutzer sind Michael (Product Owner) und der Autor-Agent, der in `/intent` oder `/plan` schreibt. Alle Abläufe gelten nur in Sitzungen, die die Web-UI gestartet hat; im reinen Terminal ändert sich nichts außer den Regeln der Workflows (Ablauf D).

### Ablauf A: Absicht entsteht, Review startet von selbst (AK-01 bis AK-04, AK-06 bis AK-08, OF-01, OF-03)

<!-- leser: mensch -->

Auslöser: In einer UI-Sitzung schreibt oder ändert der Agent eine Absicht im Vorhaben-Ordner, und die Sitzung hält danach an (zum Beispiel, weil `/intent` den Entwurf vorlegt und auf Michael wartet).

1. Das System sieht nach: Trägt die Absicht `status: entwurf`, ist der Automatismus in den Einstellungen an, und wurde diese Absicht noch nie automatisch geprüft? Nur dann geht es weiter. Die Risikoklasse spielt keine Rolle (OF-03).
2. Das System merkt sich die Absicht als „automatisch geprüft", damit sie kein zweites Mal von selbst startet.
3. Das System fragt alle Prüfer kurz an (Ablauf C) und schickt den bereitstehenden den Text der Absicht, so wie er in diesem Moment im Vorhaben-Ordner liegt, mit dem Absicht-Auftrag: Code durchsuchen, Vorhandenes mit Fundstelle nennen, die kleinste Lösung der Ursache vorschlagen, streichbare Ziele oder Kriterien nennen, die Beobachtbarkeit jedes Kriteriums prüfen.
4. In der Review-Anzeige des Terminal-Tabs steht „Absicht-Review läuft", darunter je Prüfer eine Zeile mit Zustand.
5. Sind die Prüfer fertig, fasst das System die Befunde zusammen und gibt sie in die Sitzung, sobald deren Eingabezeile leer ist. Tippt Michael gerade oder steht ein Dialog offen, wartet das Ergebnis bis zum nächsten Halt.
6. Der Agent bearbeitet die Befunde nach Ablauf D.

Ergebnis: Die Absicht hat ein Review, ohne dass Michael daran denken musste. Hat Michael die Absicht schon freigegeben, als das Ergebnis kommt, geht es trotzdem in die Sitzung; jede übernommene Änderung ist dann ein Nachtrag mit Versionssprung (OF-01).

### Ablauf B: Review auf Knopfdruck (AK-01, AK-05)

<!-- leser: mensch -->

Auslöser: Michael drückt im Terminal-Tab den Review-Knopf.

1. Der Knopf sagt vorher, was er prüft: „Plan prüfen", wenn das Vorhaben der Sitzung einen Plan im Ordner hat oder die Sitzung einen Plan-Mode-Plan gezeigt hat; sonst „Absicht prüfen", wenn das Vorhaben eine Absicht hat.
2. Beim Plan nimmt das System den Plan aus dem Vorhaben-Ordner; nur wenn dort keiner liegt, den zuletzt erkannten Plan-Mode-Plan. Die Anzeige nennt, welche Quelle geprüft wurde.
3. Weiter wie Ablauf A ab Schritt 3, mit dem Plan-Auftrag beim Plan. Das Ergebnis eines Plans geht in den offenen Plan-Dialog, sonst wie in Ablauf A an die leere Eingabezeile.

Ergebnis: Jede Absicht und jeder Plan lässt sich beliebig oft prüfen. Der Knopf zählt nicht gegen „einmal automatisch".

### Ablauf C: Prüfer fällt aus (AK-06 bis AK-09, AK-11)

<!-- leser: mensch -->

Auslöser: Ein Review startet (Ablauf A oder B).

1. Gewählt sind die Prüfer des Tabs; eine neue Sitzung beginnt mit Sonnet, Opus, MiniMax-M3 und GLM-5.2 (AK-09). Fehlt eines davon in der Modell-Config, fehlt es in der Auswahl, und die Anzeige sagt das.
2. Das System schickt jedem gewählten Prüfer eine Probe („Reply with: ok", ohne Werkzeuge, höchstens 15 s). Ein Ergebnis von weniger als 5 min wird wiederverwendet.
3. Jeder Prüfer ist danach bereit oder ausgefallen, mit Grund: Zeitüberschreitung, überlastet, Anmeldung, unbekanntes Modell oder Fehler. Wo der Anbieter das nicht unterscheidbar meldet, steht „Fehler" mit seiner Meldung (AN-S07).
4. Stehen weniger als drei bereit, füllt das System aus der Ersatzreihe auf (Standard: Fable, MiniMax-M2.5, Haiku), bis drei bereitstehen oder die Reihe leer ist. Ein Ersatz von einem Anbieter, der unter den bereiten noch fehlt, kommt zuerst.
5. Die Anzeige und der Text an den Autor nennen: wer ausfiel und warum, wer für wen einsprang, auf wie vielen erfolgreichen Prüfern das Ergebnis beruht.
6. Antwortet am Ende kein Prüfer erfolgreich, meldet das System „Review gescheitert" mit den Gründen und gibt nichts in die Sitzung.

Ergebnis: Ein überlasteter Anbieter hält das Review höchstens die Probezeit auf, statt bis zu 5 min (EK-03), und Michael sieht, worauf das Ergebnis beruht.

### Ablauf D: Autor bearbeitet die Befunde (AK-10)

<!-- leser: mensch -->

Auslöser: Das Review-Ergebnis steht in der Sitzung, oder ein Review-Ergebnis liegt aus einem anderen Weg vor (ohne UI).

1. Der Agent geht jeden Befund durch: übernehmen mit Änderung, oder ablehnen mit lesbarem Beleg (Fundstelle im Repo oder Abschnitt in Absicht oder Spec).
2. Hat er keinen Beleg, fragt er Michael nach R2 („Befund n, Gegenstand: Vorschlag. Ok?").
3. Bei einer Absicht gehen Blocker, Befunde mit „Likely" und jede Streich-Empfehlung, auch wenn sie nur ein Prüfer gibt, immer an Michael, auch wenn der Agent einen Beleg hätte.
4. Schweregrade übernimmt der Agent so, wie die Prüfer sie gesetzt haben.
5. Jede Entscheidung steht danach im Dokument: beim Plan wie heute in §12, bei der Absicht an einer festen Stelle der Absicht.

Ergebnis: Kein Befund verschwindet ohne Beleg oder ohne Michaels Entscheidung (Z-05).

### Ablauf E: Versuch auswerten und abschalten (EK-01, Abschnitt 10 der Absicht)

<!-- leser: mensch -->

Auslöser: Drei Vorhaben ab Risiko mittel sind durch, oder das automatische Review stört.

1. Michael liest in den Änderungsprotokollen der drei Absichten, ob mindestens ein „schon da"- oder Streich-Befund übernommen wurde.
2. Bei null schaltet er in den Einstellungen „Absicht automatisch prüfen" aus. Der Knopf bleibt.

Ergebnis: Der Versuch lässt sich ohne Code-Änderung beenden.

## 3. Fachliche Anforderungen

<!-- leser: mensch -->

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-01 | Wenn ein Absicht-Review startet, MUSS das System den Text der Absicht im Vorhaben-Ordner prüfen, wie er beim Start dort liegt. | AK-01 | Test |
| FA-02 | Wenn ein Plan-Review startet, MUSS das System den Plan im Vorhaben-Ordner der Sitzung prüfen; nur wenn dort keiner liegt, den zuletzt erkannten Plan-Mode-Plan. Die Anzeige MUSS die geprüfte Quelle nennen. | AK-01 | Test |
| FA-03 | Falls weder Plan im Ordner noch Plan-Mode-Plan vorliegt (beim Plan) bzw. keine Absicht im Ordner (bei der Absicht), DARF das System NICHT starten und MUSS den Grund anzeigen. | AK-01, AK-11 | Test |
| FA-04 | Der Absicht-Auftrag MUSS eine Codesuche verlangen und nach Vorhandenem mit Fundstelle, der kleinsten Lösung der Ursache, streichbaren Zielen oder Kriterien und der Beobachtbarkeit jedes Kriteriums fragen. | AK-02 | Test |
| FA-05 | Der Absicht-Auftrag DARF „preserve all features" NICHT enthalten. | AK-02 | Test |
| FA-06 | Das System MUSS Prüfern einer Absicht ein Budget von etwa 15 Werkzeug-Aufrufen geben und Prüfern eines Plans etwa 6. | AK-03 | Test |
| FA-07 | Wenn in einer UI-Sitzung eine Absicht im Vorhaben-Ordner geschrieben oder geändert wurde und die Sitzung danach anhält, während die Absicht `status: entwurf` trägt, MUSS das System das Absicht-Review starten — unabhängig von der Risikoklasse. | AK-04, OF-03 | Test |
| FA-08 | Das System DARF eine Absicht NICHT ein zweites Mal automatisch prüfen, auch nicht nach einem Neustart der UI und auch nicht, wenn das erste Review scheiterte. | AK-04 | Test |
| FA-09 | Das System MUSS einen Schalter „Absicht automatisch prüfen" in den Einstellungen anbieten, Standard an; aus heißt kein automatischer Start, der Knopf bleibt. | EK-01, Absicht §10 Rückzug | Test |
| FA-10 | Das System MUSS im Terminal-Tab einen Knopf anbieten, der die Absicht oder den Plan des Vorhabens prüft, beliebig oft, und vorher sagt, was er prüft. | AK-05 | Stichprobe |
| FA-11 | Bevor ein Review startet, MUSS das System jeden gewählten Prüfer mit einer Probe ohne Werkzeuge prüfen, höchstens 15 s, und ihn als bereit oder ausgefallen mit Grund (Zeitüberschreitung, überlastet, Anmeldung, unbekanntes Modell, Fehler) einordnen. | AK-06 | Test |
| FA-12 | Ein Probe-Ergebnis MUSS 5 min gelten; innerhalb dieser Zeit DARF das System denselben Prüfer NICHT erneut proben. | AK-06, AN-02 | Test |
| FA-13 | Falls nach der Probe weniger als drei Prüfer bereitstehen, MUSS das System aus der Ersatzreihe nachfüllen, bis drei bereitstehen oder die Reihe leer ist, und einen Ersatz vorziehen, dessen Anbieter unter den bereiten fehlt. Ein Prüfer, der schon gewählt ist, DARF NICHT doppelt laufen. | AK-07 | Test |
| FA-14 | Das System MUSS die Ersatzreihe in den Einstellungen als geordnete Liste anbieten, Standard Fable, MiniMax-M2.5, Haiku. | AK-07 | Test |
| FA-15 | Wenn ein Prüfer überlastet ist, DARF die Zeit bis zum Ergebnis NICHT länger sein als 15 s plus die Dauer des langsamsten gesunden Prüfers, auch wenn Ersatz einspringt. | EK-03 | Test |
| FA-16 | Das System MUSS in der Review-Anzeige je Prüfer den Zustand zeigen und nennen, wer ausfiel (mit Grund), wer für wen einsprang und auf wie vielen erfolgreichen Prüfern das Ergebnis beruht — beim automatischen und beim manuellen Review. | AK-08 | Test |
| FA-17 | Der Text an den Autor MUSS dieselben Angaben wie FA-16 enthalten. | AK-08 | Test |
| FA-18 | Eine neue Sitzung MUSS Sonnet, Opus, MiniMax-M3 und GLM-5.2 als Prüfer vorwählen; DeepSeek DARF NICHT darunter sein. Fehlt ein Modell in der Modell-Config, MUSS es fehlen und die Anzeige es nennen. | AK-09, AN-04 | Test |
| FA-19 | Der Text an den Autor MUSS verlangen: Ablehnen nur mit lesbarem Beleg, sonst nach R2 an Michael; Schweregrade bleiben; bei einer Absicht gehen Blocker, Befunde mit „Likely" und jede Streich-Empfehlung immer an Michael. Er DARF „argue for it" ohne Beleg NICHT mehr erlauben. | AK-10 | Review |
| FA-20 | Die Workflows `intent` und `plan` MÜSSEN dieselben Regeln wie FA-19 für jedes Review-Ergebnis enthalten, auch ohne UI. | AK-10, RB-04 | Review |
| FA-21 | Jede Entscheidung zu einem Befund MUSS im geprüften Dokument stehen: beim Plan in §12, bei der Absicht an einer festen Stelle der Absicht-Vorlage. | AK-10, Z-05 | Review |
| FA-22 | Falls kein Prüfer erfolgreich antwortet, MUSS das System das Review in der Anzeige und am Tab als gescheitert mit den Gründen melden und DARF NICHTS in die Sitzung geben. | AK-11 | Test |
| FA-23 | Das System DARF ein Ergebnis NUR in eine leere Eingabezeile oder in einen offenen Plan-Dialog geben, nachdem es den Bildschirm gelesen hat; sonst MUSS es bis zum nächsten Halt warten. | RB-02 | Test |
| FA-24 | Wenn das Ergebnis eines Absicht-Reviews erst nach der Freigabe der Absicht vorliegt, MUSS das System es trotzdem in die Sitzung geben. | OF-01 | Test |
| FA-25 | Die Zusatzlast, die die Meldung jeder Dateiänderung in UI-Sitzungen erzeugt, MUSS vor dem Merge gemessen und im Plan berichtet werden. | OF-02 | Messung |

## 4. Fehler- und Randfälle

<!-- leser: mensch -->

| Fall | Erwartetes Verhalten | Herkunft |
|---|---|---|
| Alle gewählten Prüfer und die ganze Ersatzreihe fallen bei der Probe aus | „Review gescheitert" mit Grund je Prüfer, nichts in der Sitzung; bei Ablauf A zählt die Absicht trotzdem als automatisch geprüft, Michael kann per Knopf neu starten | FA-08, FA-22 |
| Probe ok, Prüfer scheitert danach im Review | zählt als ausgefallen, kein Nachfüllen mehr; Ergebnis beruht auf weniger Prüfern, die Anzeige sagt das | FA-13, FA-16, AN-S05 |
| MiniMax mit falschem Modellnamen | antwortet auf die Probe mit „ok" (gemessen 27.10.), gilt also als bereit; den Fehler zeigt erst das Review | FA-11, AN-01 |
| GLM mit falschem Modellnamen | Probe endet mit Fehler ohne Text (gemessen 27.10.), Grund „Fehler", nicht „unbekanntes Modell" | FA-11, AN-01 |
| Michael wählt im Tab bewusst nur einen Prüfer | die Ersatzreihe füllt auf drei auf | FA-13, AN-S06 |
| Michael wählt im Tab keinen Prüfer | Review läuft mit drei aus der Ersatzreihe | FA-13 |
| Ein Modell der Standardwahl oder Ersatzreihe fehlt in der Modell-Config | wird übersprungen, Anzeige nennt es | FA-18, ER-09 |
| Die Sitzung hält mit halbfertiger Absicht an (Michael drückt Esc beim Schreiben) | das automatische Review startet mit dem halben Text; danach nur noch per Knopf | FA-07, FA-08 |
| Absicht wird geändert, während ihr Review läuft | das Review prüft den Stand beim Start; kein zweites automatisches | FA-01, FA-08 |
| Absicht trägt schon `angenommen`, wird für einen Nachtrag geändert | kein automatisches Review | FA-07 |
| Ergebnis fertig, Michael tippt gerade oder ein Dialog ist offen | Ergebnis wartet bis zum nächsten Halt mit leerer Eingabezeile | FA-23 |
| Sitzung wird geschlossen, bevor das Ergebnis drin ist | Ergebnis verfällt mit dem Tab wie heute; die Absicht zählt als automatisch geprüft, ein neues Review gibt es per Knopf in einer anderen Sitzung | FA-08, FA-10 |
| Sitzung ist keinem Vorhaben zugeordnet | Knopf prüft nur einen Plan-Mode-Plan wie heute; „Absicht prüfen" gibt es nicht | FA-02, FA-03 |
| Zwei Sitzungen gehören zum selben Vorhaben | „einmal automatisch" gilt je Absicht, nicht je Sitzung | FA-08 |
| Absicht in einer Sitzung im reinen Terminal | kein automatisches Review | NZ-07 |
| Ein Prüfer fällt aus, der Ausfallgrund enthält Pfade oder Hostnamen | in den Text an den Autor nur der Grund als Kategorie, die volle Meldung nur in der Anzeige | FA-17, AN-S11 |

## 5. Daten, fachlich

<!-- leser: agent -->

| Information | Entsteht / ändert sich / verschwindet | Wer sieht sie | Datenklasse |
|---|---|---|---|
| Text der Absicht bzw. des Plans an die Prüfer | je Review an die Anbieter der bereiten Prüfer | Anbieter, Michael | öffentlich bei Specwright; in Kundenprojekten nach deren `security.md` (RB-06) |
| Probe-Ergebnis je Prüfer (bereit/ausgefallen, Grund, Zeitpunkt) | bei jeder Probe; verfällt nach 5 min | Michael (Anzeige) | intern |
| Marke „automatisch geprüft" je Absicht | beim automatischen Start; bleibt dauerhaft, auch nach Neustart | System | intern |
| Ersatzreihe (geordnete Modellnamen) | Standard; ändert Michael in den Einstellungen | Michael | öffentlich (nur Anbieter- und Modellnamen, wie die Modell-Config) |
| Absicht-Auftrag (Text an die Prüfer) | Standard; ändert Michael in den Einstellungen | Michael, Anbieter | öffentlich |
| Schalter „Absicht automatisch prüfen" | Standard an; ändert Michael | Michael | intern |
| Review-Ergebnis mit Basis, Ausfällen, Ersatz | je Review; geht in die Sitzung und damit ins Gespräch | Michael, Autor-Agent | intern (Projektinhalte); Ausfallgründe im Text an den Autor nur als Kategorie |
| Entscheidungen zu den Befunden | im Dokument (Absicht oder Plan), committet | jeder (Repo öffentlich) | öffentlich |

## 6. Was der Nutzer sieht

<!-- leser: mensch -->

- Review-Anzeige im Terminal-Tab: Kopf „Absicht-Review" oder „Plan-Review" mit der geprüften Quelle (Absicht im Ordner, Plan im Ordner, Plan-Mode-Plan); je Prüfer eine Zeile „bereit", „ausgefallen: Grund", „springt ein für …", „läuft", „fertig" oder „gescheitert"; darunter „Ergebnis aus n von m Prüfern". Bei null Erfolg „Review gescheitert" mit den Gründen.
- Review-Knopf im Terminal-Tab: Beschriftung bzw. Tooltip „Absicht prüfen" oder „Plan prüfen" statt „Review last plan manually"; bedienbar, auch wenn der automatische Plan-Review des Tabs aus ist.
- Einstellungen: neben dem bestehenden Plan-Auftrag ein Feld für den Absicht-Auftrag, die Ersatzreihe als geordnete Liste und der Schalter „Absicht automatisch prüfen".
- Mock: kein Mock nötig, weil die bestehende Review-Anzeige und der bestehende Einstellungsbereich um Zeilen und Felder ergänzt werden; keine neue Seite, keine neue Navigation (design.md §6; AN-S09).

## 7. Bedenken aus den Projekt-Docs

<!-- leser: agent -->

| Quelle | Bedenken | Betrifft | Geklärt? (wer, wann, wie) |
|---|---|---|---|
| architecture.md AR-08; Code `ui/src/server/services/plan-review-orchestrator.ts:316-321` (`submitAtPrompt`) | Heute tippt das System ein Review ohne Plan-Dialog ungeprüft mit Enter in die Eingabezeile, ohne zu lesen, ob sie leer ist. Das widerspricht RB-02, und genau dieser Weg wird für die Absicht der Hauptweg. | FA-23 | geklärt (Product Owner, 2026-10-27, O1): Vorschlag angenommen, Umsetzung im Plan — die Prüfung „leere Eingabezeile" von „Nächster Schritt" (`promptZustand`, `eingabeLeerLautCursor`) wiederverwenden; sonst warten bis zum nächsten `Stop` |
| architecture.md §3 Nutzerzustand, ADR-0002 | Die Marke „automatisch geprüft" muss einen Neustart überleben (FA-08); wo sie liegt, entscheidet der Plan. Kein Text aus Eingaben, nur Kennung + Zeitpunkt. | FA-08 | geklärt (Product Owner, 2026-10-27, O2): Vorschlag angenommen, Umsetzung im Plan — optionales Feld im Nutzerzustand je Vorhaben, Vermerk in ADR-0002 wie INT-2026-019 |
| architecture.md §2 Backend-Zeile; product-brief.md §8 | Absicht-Review, Probe und Ersatzreihe sind neue Bestandteile und Begriffe; Architektur und Domänenbegriffe kennen sie nicht. | alle FA | offen — an den Plan delegiert, nicht blockierend. Vorschlag: architecture.md §2 und product-brief §8 in derselben PR |
| security.md §1; `ui/config/` versioniert | Absicht-Auftrag, Ersatzreihe und Schalter landen in versionierten Einstellungen. Sie enthalten nur Text und Modellnamen. | FA-09, FA-14 | geklärt in der Spec (2026-10-27): keine Zugänge, Klasse öffentlich wie `model-config.json` |
| security.md §5 (keine Pfade, Hosts im Repo) | Fehlermeldungen der Prüfer (stderr) können Pfade oder Hostnamen enthalten. Der Text an den Autor geht ins Gespräch, und Zitate daraus können in eine committete Absicht wandern. | FA-17 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: im Text an den Autor nur die Kategorie, Rohtext nur in der Anzeige (AN-S11) |
| security.md §6 „externes System anbindet"; RB-06 | Die Probe ist ein neuer Aufruf an bestehende Anbieter. Zugang ist der bestehende (§3), Ausfallverhalten steht in Ablauf C. Der Absichtstext geht wie der Plan an die Anbieter. | FA-11, FA-01 | geklärt durch intent RB-06 und Ablauf C (2026-10-27) |
| security.md §2, intent RB-01 | Ein erweiterter Hook-Matcher (Dateiänderungen) darf das Hook-Geheimnis nicht in die Umgebung bringen. | FA-07 | offen — an den Plan delegiert, nicht blockierend: Matcher-Erweiterung im bestehenden `--settings`-Weg (`ui/src/server/services/claude-hooks.ts:71-81`) |
| intent AN-01; Probe gegen GLM und MiniMax am 2026-10-27 (glm-5.2 und MiniMax-M3: „ok" in 4,4 s bzw. 3,9 s; GLM mit falschem Modell: Abbruch „exited with code 1" ohne Text; MiniMax mit falschem Modell: „ok") | „Unbekanntes Modell" ist bei MiniMax nicht erkennbar, bei GLM nicht von „Fehler" unterscheidbar; „überlastet" und „Anmeldung" ließen sich nicht herbeiführen. Die sechs Kategorien von AK-06 sind nur dort erreichbar, wo der Anbieter es meldet. | FA-11 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: einordnen nach erkennbarem Fehlertext (529/overloaded, 401/auth, model not found), sonst „Fehler" mit Text (AN-S07) |
| intent EK-03 | Wird die Ersatzreihe erst nach der ersten Probe geprobt, verlängert das die Wartezeit um bis zu weitere 15 s. | FA-15 | offen — an den Plan delegiert, nicht blockierend. Vorschlag: Ersatzreihe gleichzeitig mit den gewählten proben (AN-S08); Cache hält die Zusatzanfragen klein (AN-02) |
| design.md §1 (weniger ist mehr), §3 (Shadow-DOM-Wirt) | Die Review-Anzeige bekommt mehr Zeilen. Sie ist ein Shadow-Root-Wirt mit eigenen Styles; `theme.css` greift dort nicht. | Abschnitt 6 | offen — an den Plan delegiert, nicht blockierend: Styles in der Komponente (`ui/frontend/src/components/terminal/aos-plan-review-block.ts`) |
| design.md §6 Mock-Pflicht | Neuer Ablauf (automatisches Review) ohne neue Seite. | Abschnitt 6 | geklärt (Product Owner, 2026-10-27): AN-S09 bestätigt, kein Mock |
| architecture.md AR-06, intent RB-04 | Die Beleg-Regeln dürfen in den Workflows nicht von der UI abhängen. | FA-20 | geklärt durch intent RB-04: Regeln stehen als Text im Workflow, gelten für jedes Review-Ergebnis |
| CLAUDE.md Konventionen, intent RB-05 | Geänderte Workflows und Vorlage (Absicht bekommt eine Stelle für Review-Entscheidungen, FA-21) → Manifest, Versionssprung, CHANGELOG, Formatversion der Vorlage. | FA-20, FA-21 | offen — an den Plan delegiert, nicht blockierend |
| Code `ui/frontend/src/components/terminal/aos-auto-review-toggle.ts:440` | Der Knopf ist heute nur bedienbar, wenn der automatische Plan-Review des Tabs an ist. Der automatische Plan-Start greift faktisch nicht (intent §1). | FA-10 | geklärt (Product Owner, 2026-10-27): AN-S04 bestätigt, Knopf unabhängig vom Tab-Schalter |

## 8. Nicht im Umfang

<!-- leser: mensch -->

- NZ-01: Skill `review-implementation-plan` auf v4 umstellen.
- NZ-02: Frische Prüfung nach `/build`.
- NZ-03: Plan-Inhalt in Factory-Briefs.
- NZ-04: Schlüssel-Rotation.
- NZ-05: Review für die Spec.
- NZ-06: Abo-Status der Anbieter verwalten oder abfragen.
- NZ-07: Automatischer Start in Sitzungen außerhalb der UI.
- Den automatischen Plan-Review reparieren (er wartet auf eine Plan-Box, die Claude Code nicht mehr zeigt); der Plan wird per Knopf geprüft.
- Den Plan-Auftrag ändern; er bleibt, wie Michael ihn in den Einstellungen hat.
- Nachfüllen, wenn ein Prüfer erst während des Reviews ausfällt.

## 9. Annahmen

<!-- leser: mensch -->

- **AN-S01:** Der Absicht-Auftrag ist ein eigenes Feld in den Einstellungen neben dem Plan-Auftrag; sein Standard erfüllt FA-04/FA-05, Michael darf ihn ändern; der Plan-Auftrag bleibt unverändert — bestätigt am 2026-10-27 von Product Owner
- **AN-S02:** Das automatische Absicht-Review hängt nicht am Review-Schalter des Tabs, sondern am Schalter „Absicht automatisch prüfen" (Standard an) — bestätigt am 2026-10-27 von Product Owner
- **AN-S03:** „Genau einmal automatisch" gilt dauerhaft je Absicht, auch nach Neustart und auch dann, wenn das erste Review scheiterte — bestätigt am 2026-10-27 von Product Owner
- **AN-S04:** Es gibt einen Knopf, der je nach Stand Plan oder Absicht prüft (Plan, sobald ein Plan im Ordner liegt oder die Sitzung einen Plan-Mode-Plan zeigte); er ist bedienbar, auch wenn der automatische Plan-Review des Tabs aus ist — bestätigt am 2026-10-27 von Product Owner
- **AN-S05:** Nachgefüllt wird nur nach der Probe; fällt ein Prüfer erst im Review aus, beruht das Ergebnis auf weniger Prüfern (EK-02 misst das) — bestätigt am 2026-10-27 von Product Owner
- **AN-S06:** Die Ersatzreihe füllt auch auf, wenn Michael bewusst weniger als drei Prüfer wählt (Wortlaut AK-07) — bestätigt am 2026-10-27 von Product Owner
- **AN-S07:** Wo ein Anbieter den Grund nicht unterscheidbar meldet, steht „Fehler" mit seiner Meldung; „unbekanntes Modell" erkennt die Probe bei MiniMax nicht (gemessen 27.10.) — bestätigt am 2026-10-27 von Product Owner
- **AN-S08:** Die Ersatzreihe wird gleichzeitig mit den gewählten Prüfern geprobt, damit die Wartezeit bei 15 s bleibt; das kostet bis zu drei Proben mehr je 5 min — bestätigt am 2026-10-27 von Product Owner
- **AN-S09:** Kein Mock nötig (bestehende Anzeige und Einstellungen werden ergänzt) — bestätigt am 2026-10-27 von Product Owner
- **AN-S10:** Ohne UI bekommt das Framework keinen neuen Review-Weg; die Workflows enthalten nur die Beleg-Regeln für jedes Review-Ergebnis, egal woher (RB-04) — bestätigt am 2026-10-27 von Product Owner
- **AN-S11:** Im Text an den Autor stehen Ausfallgründe nur als Kategorie, die volle Fehlermeldung nur in der Anzeige (Repo öffentlich) — bestätigt am 2026-10-27 von Product Owner

## 10. Freigabe

<!-- leser: agent -->

- [x] Jede FA hat Herkunft und Prüfung.
- [x] Jedes AK der intent.md ist von mindestens einer FA abgedeckt: AK-01 → FA-01, FA-02, FA-03 · AK-02 → FA-04, FA-05 · AK-03 → FA-06 · AK-04 → FA-07, FA-08 · AK-05 → FA-10 · AK-06 → FA-11, FA-12 · AK-07 → FA-13, FA-14 · AK-08 → FA-16, FA-17 · AK-09 → FA-18 · AK-10 → FA-19, FA-20, FA-21 · AK-11 → FA-03, FA-22. Dazu RB-02 → FA-23, OF-01 → FA-24, OF-02 → FA-25, OF-03 → FA-07, EK-01 → FA-09, EK-03 → FA-15.
- [x] Abschnitt 7 vollständig geklärt oder begründet offen.
- [x] Keine Technik, keine Architektur, keine Dateinamen in diesem Dokument.
- [x] Bei risikoklasse hoch: Tech Lead hat gelesen. (entfällt, Risikoklasse mittel)
- [x] Abgleich Mensch/Agent: Mensch-Teil gegen Agenten-Teil geprüft (2026-10-27), Befund: §4 versprach, ein Ergebnis bleibe nach Schließen der Sitzung sichtbar; die Anzeige gehört zum Tab → Zeile korrigiert (verfällt mit dem Tab, neues Review per Knopf)
- **Freigegeben:** Product Owner, 2026-10-27, Commit `spec(INT-2026-037): fachliche Spec freigegeben`
