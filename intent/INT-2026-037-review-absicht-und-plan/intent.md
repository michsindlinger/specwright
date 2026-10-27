---
intent_id: "INT-2026-037"  
format: "2.2"  
titel: "Review für Absicht und Plan aus dem Vorhaben-Ordner, automatisch und ausfallsicher"  
status: "angenommen"  
version: "1.0.0"  
autor: "Michael Sindlinger (mit Claude)"  
verantwortlich: "Product Owner"  
erstellt: "2026-10-27"  
geaendert: "2026-10-27"  
risikoklasse: "mittel"  
groesse: "M"  
bypass: "nein"  
bypass_grund: ""  
bezuege:  
  product: "docs/product-brief.md"  
  spec: "spec.md"  
  plan: "plan.md"  
  tracker: ""  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [review, externe-pruefer, absicht, plan, ausfallsicher, ui, hooks]  

---

# Absicht: Review für Absicht und Plan aus dem Vorhaben-Ordner, automatisch und ausfallsicher

<!-- Ablage: intent/INT-2026-037-review-absicht-und-plan/intent.md -->

## Felder im Kopf

<!-- leser: agent -->

| Feld | Bedeutung | Werte |
|---|---|---|
| `intent_id` | stabile Kennung, nie wiederverwenden | `INT-JJJJ-NNN` |
| `titel` | 5 bis 80 Zeichen | — |
| `status` | Lebenszyklus | `entwurf` · `in_klaerung` · `angenommen` · `umgesetzt` · `abgeloest` · `verworfen` |
| `format` | Formatversion der Vorlage, aus der die Datei entstand; nie von Hand setzen oder erhöhen; Regel: `specwright/templates/sdlc/README.md`, Abschnitt „Formatversion" | `"2.2"` |
| `version` | Fassung dieser Absicht, nicht der Vorlage; SemVer, Regeln im Änderungsprotokoll; Datum und Version immer in Anführungszeichen | `"0.1.0"` |
| `verantwortlich` | Rolle, die annimmt und bei Eskalation entscheidet (Pflicht) | — |
| `risikoklasse` | ab `mittel` gilt die Vertragsschicht (Abschnitte 8–12) | `niedrig` · `mittel` · `hoch` |
| `groesse` | Aufwand | `S` unter 1 Tag · `M` 1–5 Tage · `L` über 5 Tage |
| `bypass` | `ja` bei Bugfix oder Größe S: direkt zu `plan.md`, keine `spec.md`; Grund in `bypass_grund` | `ja` · `nein` |
| `bezuege` | Pfade zu Produkt, Spec, Plan, ADRs; `tracker` = Tracker-Eintrag des Projekts (`repo#nr` oder Trello-Karte; technischer Arbeitsstand); `board_karte` = Boardname und Kartentitel, nur bei Internem oder als grobe Vorhaben-Karte in Projekten mit Fahrplan-Seite; `ersetzt` = Vorgänger-Intent | — |
| `schlagworte` | kleinbuchstaben-mit-bindestrich | — |
| `kennung_hinweis` | optional (INT-2026-022): steht nur, wenn `next-intent-id.sh` die Kennung ohne entfernten Stand vergeben hat (kein Netz, Fetch gescheitert oder abgeschaltet) — beim Push auf Kollision prüfen | `"ohne entfernten Stand vergeben (JJJJ-MM-TT)"` |

<!-- Zwei Schichten.
     Kern (Pflicht, für Menschen, etwa 3 Minuten, höchstens ~450 Wörter bis einschließlich Nicht-Ziele): drei Sätze bis Abnahmekriterien.
     Vertragsschicht (Pflicht ab risikoklasse mittel): Abschnitte 6 bis 11.
     IDs: Z, NZ, AK, RB, OF, B, EK, ER, AN — zweistellig, nie wiederverwenden.
     Normsprache: MUSS, DARF NICHT, SOLLTE, DARF nur in Großbuchstaben verbindlich (BSI/DIN 820-2, entspricht RFC 2119).
     Leser-Marker (R1, specwright/workflows/meta/leser-und-rueckfragen.md): Die erste Zeile unter jeder Überschrift sagt, für wen der Abschnitt ist — `mensch` entscheidet, `agent` baut. Beim Ausfüllen die Marker übernehmen, keinen entfernen; eine neue Überschrift bekommt einen. -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Fehlentscheidungen sollen dort auffallen, wo sie entstehen — schon in der Absicht, nicht erst im Plan oder nach dem Merge —, indem frische Prüfer ohne Gesprächskontext auch die Absicht lesen und fragen „gibt es das schon, braucht es das?".
- **Kernaufgaben:** Review liest Absicht oder Plan aus dem Vorhaben-Ordner; Absicht-Review startet in UI-Sitzungen einmal von selbst; ausgefallene Prüfer werden vorab erkannt und ersetzt; der Autor darf einen Befund nur mit Beleg ablehnen.
- **Endzustand:** Jede Absicht ab Risiko mittel, die in einer UI-Sitzung entsteht, bekommt ohne Knopfdruck ein Review von mindestens drei Prüfern, solange die Ersatzreihe reicht, und jeder Befund ist mit Beleg erledigt oder liegt Michael vor (AK-01 bis AK-10).

## 1. Problem und Anlass

<!-- leser: mensch -->

Frische Prüfer gibt es heute nur beim Plan, als Multi-LLM-Review in der UI [Q: `specwright/workflows/core/plan.md:112-115`]; für die Absicht steht in der Vorlage nur der Satz „Blindprobe durch frischen Agenten" ohne Ablauf [Q: `specwright/templates/sdlc/vorhaben/intent-template.md:209`]. Die teuerste Fehlentscheidung der letzten Monate lag in der Absicht: INT-2026-007 (Gesprächsansicht) brachte rund 2.250 Zeilen, die INT-2026-011 nach dem Merge wieder abbaute [Q: `intent/INT-2026-011-terminal-statt-gespraech/intent.md:44`]; von rund 80 externen Plan-Befunden fragte keiner, ob es das braucht [Q: Analyse Elephant-Goldfish-Modell, Michael, 2026-10-27]. Der Plan-Review hat vier weitere Schwächen: Er liest die Plan-Mode-Kopie statt `plan.md` [Q: `ui/src/server/services/plan-review-orchestrator.ts:437`]; der Standard-Prompt verlangt Alternativen, „that preserve all features", schließt Streichen also aus [Q: `ui/src/server/general-config.ts:28-35`]; ein überlastetes Modell hält das Review bis zu 300 s auf [Q: `ui/src/server/services/external-reviewer.ts:113`]; ausgefallene Prüfer werden nicht ersetzt [Q: `plan-review-orchestrator.ts:489`, `Promise.allSettled` ohne Ersatz]. Der automatische Start greift faktisch nicht, weil die Plan-Box, auf die er wartet, in Claude Code nicht mehr erscheint [Likely, Q: Memory `reference_claude_plan_dialog_hooks`]. Unter den Standard-Prüfern steht DeepSeek, für das kein Abo mehr besteht [Q: `ui/src/server/model-config.ts:306-311`; Michael, 2026-10-27]. Der Inject-Text sagt dem Autor „argue for it" und lässt ihn Befunde ohne Beleg verwerfen [Q: `plan-review-orchestrator.ts:84`].

Anlass: Analyse des Elephant-Goldfish-Modells gegen Specwright am 27.10.2026; Entscheidungen D2, D5, D6, D7 von Michael bestätigt.

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael (Product Owner) | Bekommt nach dem ersten Absicht-Entwurf ein Review ohne Knopfdruck; Befunde ohne Beleg und alle Streich-Empfehlungen landen bei ihm; sieht, welcher Prüfer ausfiel und wer einsprang |
| Autor-Agent in `/intent` und `/plan` | Muss jede Ablehnung eines Befunds belegen; darf Schweregrade nicht herabstufen |
| Sitzungen außerhalb der UI (reines Terminal) | Kein Unterschied, weil der automatische Start Hooks der UI braucht |
| Systeme | UI-Backend (Review-Orchestrator, externer Prüfer, Hook-Route, Einstellungen, Modell-Config), UI-Frontend (Review-Anzeige), Workflows `intent.md` und `plan.md`, Vorlagen `intent-template.md` und `plan-template.md`, externe Modellanbieter |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Eine Absicht bekommt dasselbe externe Review wie ein Plan, mit einem Auftrag, der Vorhandenes und Streichbares sucht statt Funktionen zu bewahren.
- **Z-02:** Das Review prüft die Datei im Vorhaben-Ordner, also den Stand, der committet wird.
- **Z-03:** Das Absicht-Review läuft einmal von selbst, ohne dass Michael daran denken muss.
- **Z-04:** Ein Review kommt auch zustande, wenn einzelne Anbieter ausfallen, und zeigt offen, wer ausfiel und wer einsprang.
- **Z-05:** Kein externer Befund verschwindet ohne Beleg oder ohne Michaels Entscheidung.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Skill `review-implementation-plan` auf v4 umstellen (eigener Kleinkram, A3).
- **NZ-02:** Frische Prüfung nach `/build` (eigenes Vorhaben nach Auswertung des Versuchs, D3).
- **NZ-03:** Plan-Inhalt in Factory-Briefs (Factory-Entscheidung, O1).
- **NZ-04:** Schlüssel-Rotation (Security, getrennt und sofort, R1).
- **NZ-05:** Review für `spec.md`.
- **NZ-06:** Abo-Status der Anbieter verwalten oder abfragen; erkannt wird nur, ob ein Prüfer jetzt antwortet.
- **NZ-07:** Automatischer Start in Sitzungen außerhalb der UI.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn ein Review für ein Vorhaben gestartet wird, MUSS das System den Text aus `intent.md` bzw. `plan.md` im Vorhaben-Ordner der Sitzung prüfen; nur wenn der Plan dort fehlt, die zuletzt erkannte Plan-Mode-Datei. | Z-02 | Test |
| AK-02 | Wenn eine Absicht geprüft wird, MUSS der Auftrag an die Prüfer eine Codesuche verlangen und nach Vorhandenem (mit `datei:zeile`), der kleinsten Lösung der Ursache, streichbaren Zielen oder Kriterien und der Beobachtbarkeit jedes Kriteriums fragen; er DARF „preserve all features" NICHT enthalten. | Z-01 | Test |
| AK-03 | Das System MUSS Prüfern einer Absicht ein höheres Werkzeug-Budget geben als Prüfern eines Plans (Absicht etwa 15, Plan 6). | Z-01 | Test |
| AK-04 | Wenn in einer UI-Sitzung `intent/INT-*/intent.md` geschrieben oder geändert wurde und die Sitzung danach anhält, während die Absicht `status: entwurf` trägt, MUSS das System das Absicht-Review starten — je Absicht genau einmal automatisch. | Z-03 | Test |
| AK-05 | Das System MUSS jedes weitere Review einer Absicht und jedes Plan-Review auf Knopfdruck anbieten. | Z-03 | Stichprobe |
| AK-06 | Bevor ein Review startet, MUSS das System jeden gewählten Prüfer mit einer Probe-Anfrage ohne Werkzeuge prüfen (höchstens 15 s) und das Ergebnis als ok, Zeitüberschreitung, überlastet, Anmeldung, unbekanntes Modell oder Fehler einordnen; ein Ergebnis gilt 5 min. | Z-04 | Test |
| AK-07 | Falls nach der Probe weniger als drei Prüfer bereitstehen, MUSS das System aus der Ersatzreihe der Einstellungen (Standard: Fable, MiniMax-M2.5, Haiku) nachfüllen, bis drei bereitstehen oder die Reihe leer ist, und dabei einen Anbieter vorziehen, der noch nicht vertreten ist. | Z-04 | Test |
| AK-08 | Das System MUSS in der UI und im Text an den Autor nennen, welche Prüfer ausfielen (mit Grund), wer einsprang und auf wie vielen erfolgreichen Prüfern das Ergebnis beruht — beim automatischen und beim manuellen Review. | Z-04 | Test |
| AK-09 | Die Standard-Prüfer einer neuen Sitzung MÜSSEN Sonnet, Opus, MiniMax-M3 und GLM-5.2 sein; DeepSeek DARF NICHT darunter sein. | Z-04 | Test |
| AK-10 | Der Text an den Autor und die Workflows `intent` und `plan` MÜSSEN verlangen: Ein Befund wird nur mit lesbarem Beleg (`datei:zeile` oder Abschnitt in Absicht oder Spec) abgelehnt, sonst nach R2 an Michael; Schweregrade bleiben; bei einer Absicht gehen Blocker, Befunde mit „Likely" und jede Streich-Empfehlung (auch von nur einem Prüfer) immer an Michael. | Z-05 | Review |
| AK-11 | Falls weniger als ein Prüfer erfolgreich antwortet, MUSS das System das Review als gescheitert melden, statt ein leeres Ergebnis zu übergeben. | Z-04 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Sicherheit | Das Hook-Geheimnis steht nur in `--settings`, nie in der Umgebung der Sitzung; ein erweiterter Matcher ändert daran nichts. | `ui/src/server/services/claude-hooks.ts:94-105`, `docs/security.md` §2 |
| RB-02 | Technik | Die UI tippt nur in einen Zustand, den sie gerade vom Bildschirm gelesen hat; das Review-Ergebnis geht nur bei leerer Eingabezeile in die Sitzung, sonst beim nächsten Halt. Grund: AR-08. | `docs/architecture.md` AR-08 |
| RB-03 | Technik | Kein Flag am Modell-Objekt für Standard- oder Ersatzprüfer; der Einstellungs-Editor ersetzt Modelle als Ganzes. Grund: Datenverlust beim Bearbeiten. | `ui/src/server/model-config.ts:300-305` |
| RB-04 | Technik | Framework-Änderungen (Workflows, Vorlagen) dürfen nicht von der UI abhängen; ohne UI bleibt der manuelle Weg. | `docs/architecture.md` AR-06 |
| RB-05 | Betrieb | Neue oder geänderte Workflow- und Vorlagen-Dateien laufen über `specwright/manifest.tsv`, Versionssprung und CHANGELOG. | `CLAUDE.md` Konventionen; AR-01 |
| RB-06 | Datenschutz | Der Text der Absicht geht wie heute der Plan an externe Anbieter; in Kundenprojekten gilt dieselbe Regel wie für den Plan-Review. | `docs/security.md` §1 Datenklassen |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Was gilt, wenn Michael die Absicht freigibt, bevor das Review zurück ist? *entschieden 2026-10-27 (PO)*: Vorschlag angenommen — Befunde kommen trotzdem in die Sitzung; jede übernommene Änderung ist ein Nachtrag mit Versionssprung (MINOR/MAJOR) nach den Regeln des Änderungsprotokolls. | nein | Product Owner | erledigt |
| OF-02 | Hook `PostToolUse` für `Write\|Edit` feuert in jeder UI-Sitzung bei jeder Dateiänderung (ein `curl` mit 0,2 s Verbindungs-Timeout). *entschieden 2026-10-27 (PO)*: Vorschlag angenommen — hinnehmen und in der Spec messen; bei spürbarer Verzögerung Filter im Hook-Befehl auf den Pfad. | nein | Product Owner | erledigt |
| OF-03 | Gilt der Automatismus auch für Absichten mit Risikoklasse niedrig? *entschieden 2026-10-27 (PO)*: Vorschlag angenommen — ja, das Review ist günstig und gerade kleine Absichten verdecken „schon da"; die Messung des Versuchs zählt nur ab mittel. | nein | Product Owner | erledigt |

---

<!-- ===== Vertragsschicht — Pflicht ab risikoklasse "mittel", sonst löschen ===== -->

## 8. Begriffe

<!-- leser: mensch -->

- **B-01 Absicht-Review:** externes Review einer `intent.md` durch frische Prüfer ohne Gesprächskontext, mit eigenem Auftrag (AK-02) und Budget (AK-03).
- **B-02 Prüfer:** ein Modell aus der Modell-Config, das das Review mit Lesezugriff (Read, Grep, Glob) auf die Arbeitskopie schreibt [Q: `external-reviewer.ts:4`].
- **B-03 Probe:** eine Anfrage „Reply with: ok" an einen Prüfer, ohne Werkzeuge, höchstens 15 s, vor dem eigentlichen Review.
- **B-04 Ersatzreihe:** geordnete Liste von Prüfern in den allgemeinen Einstellungen, die nur einspringt, wenn sonst weniger als drei bereitstehen.
- **B-05 Lesbarer Beleg:** `datei:zeile` im Repo oder Abschnitt in `intent.md`/`spec.md`, den Michael ohne Gesprächskontext nachlesen kann. „Steht im Plan" ohne Stelle ist keiner.
- **B-06 Streich-Empfehlung:** Befund, der vorschlägt, ein Ziel, ein Kriterium oder einen Teil des Vorhabens wegzulassen, weil es schon existiert oder nicht gebraucht wird.
- **B-07 Erfolgreicher Prüfer:** Prüfer, dessen Review eine nicht leere Antwort ohne Fehler zurückgab; Basis jeder Mehrheits- oder Blocker-Schwelle (n von n).

## 9. Erfolgskennzahlen

<!-- leser: mensch -->

| ID | Kennzahl | Zielwert | Messung vor Produktion | Messung im Betrieb | Reaktion bei Verfehlen |
|---|---|---|---|---|---|
| EK-01 | Übernommene „schon-da"- oder Streich-Befunde aus Absicht-Reviews | mindestens 1 in den nächsten 3 Vorhaben ab Risiko mittel | kein Gate | Änderungsprotokolle der 3 Absichten | Bei 0 in 3: Product Owner schaltet den Automatismus ab (Versuch beendet) |
| EK-02 | Reviews mit mindestens 3 erfolgreichen Prüfern | 100 % der Reviews, solange die Ersatzreihe nicht leer ist | Test mit simuliertem Ausfall von 2 Prüfern | Review-Ergebnis in der UI, 3 Vorhaben | Ersatzreihe anpassen |
| EK-03 | Zeit vom Start bis zum Ergebnis, wenn ein Prüfer überlastet ist | höchstens Probe-Zeit (15 s) plus Dauer des langsamsten gesunden Prüfers | Test mit simulierter Überlastung | Stichprobe | Probe-Timeout anpassen |

## 10. Auslieferung, Betrieb, Zeitbudget

<!-- leser: mensch -->

- **Freigabe Produktion:** Michael (Merge nach `main` löst den Auto-Deploy der UI aus).
- **Stufen:** auf einmal; der Automatismus ist der Versuch (EK-01).
- **Rückzug:** Abbruch nach EK-01 oder bei Störungen; Michael schaltet den automatischen Absicht-Review ab, manueller Knopf bleibt.
- **Betrieb:** Michael; Ausfälle sieht er in der Review-Anzeige (AK-08).
- **Zeitbudget:** 5 Tage ab `/build`-Start; danach Stopp und Rückmeldung (ER-08).

## 11. Entscheidungsrechte

<!-- leser: agent -->

| ID | Stufe | Regel |
|---|---|---|
| ER-00 | allein (vorläufig) | Auslegungsfragen zu AK, RB oder B ohne Widerspruch: engste Auslegung, die den Wortlaut erfüllt; in der Spec unter „Annahmen" dokumentieren; weiterarbeiten. Bestätigung gesammelt bei der Spec-Freigabe. |
| ER-01 | allein | Details ohne Datenverlust und ohne Außenwirkung: interne Struktur, Benennungen, Aufgabenschnitt, synthetische Testdaten. |
| ER-02 | fragen | Neue externe Abhängigkeit (Bibliothek, Fremddienst). |
| ER-03 | fragen | Eine Kennzahl wird vor Produktion verfehlt. |
| ER-04 | stopp | Zugriff auf Produktionsdaten. |
| ER-05 | stopp | Zwei Kriterien widersprechen sich. |
| ER-06 | stopp | Tests, Gates oder Schwellen müssten geändert werden, damit etwas grün wird. |
| ER-07 | stopp | Produktionsfreigabe: bereitet der Agent vor; freigeben dürfen nur die Rollen aus Abschnitt 10. |
| ER-08 | stopp | Zeitbudget ausgeschöpft. |
| ER-09 | fragen | Ersatzreihe oder Standard-Prüfer weichen von AK-07/AK-09 ab (z. B. Modell in der Config nicht vorhanden). |

## 12. Annahmen

<!-- leser: mensch -->

- **AN-01:** Der Agent-SDK-Aufruf liefert bei Wrapper-Anbietern genug Fehlerinformation, um „überlastet" und „Anmeldung" von „Zeitüberschreitung" zu trennen; sonst bleiben nur ok, Zeitüberschreitung und Fehler. Prüfung: Spec, Probe gegen GLM und MiniMax, bis Spec-Freigabe.
- **AN-02:** Die Probe-Anfragen zählen gegen Anfrage-Limits (GLM); der 5-min-Cache hält das klein genug. Prüfung: Stichprobe in den ersten 3 Vorhaben.
- **AN-03:** Ein Inject an der normalen Eingabezeile (nicht im Plan-Dialog) funktioniert mit dem bestehenden Sendeweg; das ist ungetestet [Q: Brief R6]. Prüfung: E2E im Build.
- **AN-04:** Fable, MiniMax-M2.5, Haiku, Sonnet, Opus, MiniMax-M3 und GLM-5.2 stehen in der Modell-Config [Q: `ui/config/model-config.json`, 27.10.2026]. Prüfung: Test gegen die geladene Config; fehlende werden übersprungen.

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-10-27 | Freigabe; OF-01 bis OF-03 wie vorgeschlagen entschieden. Abgleich Mensch/Agent, Befund: Endzustand versprach „mindestens drei Prüfer" unbedingt, AK-07/AK-11 lassen weniger zu, wenn die Ersatzreihe leer ist → Endzustand um „solange die Ersatzreihe reicht" ergänzt | Endzustand, OF-01–03 | Product Owner, 2026-10-27 |
| 0.1.0 | 2026-10-27 | Entwurf aus dem Brief `intent-brief-review-absicht.md` (Entscheidungen D2, D5, D6, D7, O3–O5 von Michael bestätigt am 27.10.); Belege gegen `origin/main` 162d75e geprüft | alle | — |

<!-- Definition of Ready (vor status "angenommen"):
     [ ] Drei Sätze nennen Zweck, Kernaufgaben, Endzustand und versprechen nichts, was AK/RB/NZ einschränken.
     [ ] Problem mit Beleg, Anlass genannt.
     [ ] Jedes AK: EARS-Form, ein Modalverb, Ziel, Prüfart, beobachtbar statt Mechanismus.
     [ ] Mindestens ein Nicht-Ziel. Jede RB mit Herkunft.
     [ ] Keine offene Frage mit „Blockiert: ja".
     [ ] Keine Projektregeln, die in CLAUDE.md gehören.
     [ ] Ab risikoklasse mittel: Abschnitte 8–12 ausgefüllt. Ab hoch: Blindprobe durch frischen Agenten, 0 blockierende Rückfragen.
     [ ] `verantwortlich` hat angenommen, Commit dokumentiert die Annahme. -->
