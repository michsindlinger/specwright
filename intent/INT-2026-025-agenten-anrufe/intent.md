---
intent_id: "INT-2026-025"  
titel: "UI: Agenten rufen an — Warteschlange, Sprechfassung, lokale Sprache"  
status: "angenommen"  
version: "1.0.0"  
autor: "Michael Sindlinger (Wunsch aus dem Gebrauch, 27.09.2026, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-27"  
geaendert: "2026-09-27"  
risikoklasse: "mittel"  
groesse: "L"  
bypass: "nein"  
bypass_grund: ""  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: ""  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, sprache, anruf, warteschlange, glocke, stt, tts, lokal]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — im Chat: „Freigabe: intent.md 0.1.0", 27.09."  
  am: "2026-09-27"  

---

# Absicht: UI: Agenten rufen an — Warteschlange, Sprechfassung, lokale Sprache

<!-- Ablage: intent/INT-2026-025-agenten-anrufe/intent.md -->

## Felder im Kopf

<!-- leser: agent -->

| Feld | Bedeutung | Werte |
|---|---|---|
| `intent_id` | stabile Kennung, nie wiederverwenden | `INT-JJJJ-NNN` |
| `titel` | 5 bis 80 Zeichen | — |
| `status` | Lebenszyklus | `entwurf` · `in_klaerung` · `angenommen` · `umgesetzt` · `abgeloest` · `verworfen` |
| `version` | SemVer, Regeln im Änderungsprotokoll; Datum und Version immer in Anführungszeichen | `"0.1.0"` |
| `verantwortlich` | Rolle, die annimmt und bei Eskalation entscheidet (Pflicht) | — |
| `risikoklasse` | ab `mittel` gilt die Vertragsschicht (Abschnitte 8–12) | `niedrig` · `mittel` · `hoch` |
| `groesse` | Aufwand | `S` unter 1 Tag · `M` 1–5 Tage · `L` über 5 Tage |
| `bypass` | `ja` bei Bugfix oder Größe S: direkt zu `plan.md`, keine `spec.md`; Grund in `bypass_grund` | `ja` · `nein` |
| `bezuege` | Pfade zu Produkt, Spec, Plan, ADRs; `board_karte` = Boardname und Kartentitel; `ersetzt` = Vorgänger-Intent | — |
| `schlagworte` | kleinbuchstaben-mit-bindestrich | — |
| `kennung_hinweis` | optional (INT-2026-022): steht nur, wenn `next-intent-id.sh` die Kennung ohne entfernten Stand vergeben hat | `"ohne entfernten Stand vergeben (JJJJ-MM-TT)"` |

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Michael arbeitet in mehreren Claude-Sitzungen gleichzeitig und will nicht ständig auf den Bildschirm schauen müssen: Braucht ein Agent ihn oder ist er fertig, soll der Agent ihn „anrufen", kurz das Wesentliche sagen und eine gesprochene Antwort entgegennehmen — ohne laufende Kosten.
- **Kernaufgaben:** (1) Eine Warteschlange, die Meldungen der Sitzungen nacheinander als Anruf zustellt, Rückfragen und Plan-Freigaben zuerst. (2) Eine Sprechfassung je Meldung: Ergebnis oder Frage in wenigen Sätzen statt der ganzen Antwort. (3) Antworten per Stimme, die in der Sitzung ankommen, mit Schutz vor falsch erkannten Entscheidungen. (4) Spracherkennung und Sprachausgabe laufen auf dem Mac, ohne Fremddienst.
- **Endzustand:** AK-01 bis AK-18 sind erfüllt; Handy, Cloud-Host, Weckwort und Berechtigungen per Stimme bleiben draußen (NZ-01 bis NZ-04).

## 1. Problem und Anlass

<!-- leser: mensch -->

Michael bearbeitet meist mehrere Sitzungen parallel; welche gerade eine Rückfrage hat oder fertig ist, sieht er heute nur mit Blick auf die UI [Q: Michael, Chat 27.09.]. Die Erkennung dafür existiert: Claude-Code-Hooks melden je Sitzung „blockiert" mit Art (Rückfrage, Plan, Berechtigung) und „fertig" [Q: `ui/src/server/services/claude-hooks.ts:209-254`, `ui/src/shared/types/hook-events.protocol.ts:15`], die Glocke in der Kopfzeile listet diese Sitzungen, ein Ton kündigt an [Q: `ui/frontend/src/components/rahmen/aos-glocke.ts:1-17`, `ui/frontend/src/components/terminal/agent-notifications.ts:201-226`]. Die Glocke zeigt aber alles gleichzeitig und verlangt Lesen. Die volle letzte Antwort des Agenten kommt mit der Fertig-Meldung an, wird heute auf 160 Zeichen gekürzt [Q: `ui/src/server/services/claude-hooks.ts:52,147,217`]; Vorlesen des ganzen Texts (Codeblöcke, Pfade, Tabellen) wäre unbrauchbar [Q: Michael, Chat 27.09.]. Antworten erreichen eine Sitzung heute nur als Tastatureingabe [Q: `ui/src/server/websocket.ts:2672-2690`, `ui/src/server/services/cloud-terminal-manager.ts:1418`].

Einen Anruf-Modus gab es schon: mit Deepgram und ElevenLabs (kostenpflichtig), am 16.09. in INT-2026-010 entfernt, weil ungenutzt; die Schlüssel lagen versehentlich öffentlich im Repo [Q: `docs/security.md:49`, `intent/INT-2026-010-ui-vorhaben-als-mitte/intent.md:88`]. Reste: `ui/src/shared/types/voice.protocol.ts`, Hinweis in `ui/frontend/src/views/team-view.ts:228`. Dieses Vorhaben baut nicht darauf auf.

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael am Mac | Kann Anrufmodus einschalten; Meldungen kommen als Anruf, er antwortet per Stimme oder lehnt ab. Ausgeschaltet bleibt alles wie heute. |
| Laufende Agenten (Sitzungen der UI) | Liefern zu jeder Meldung eine kurze Sprechfassung; bekommen gesprochene Antworten als Eingabe. |
| Systeme | Web-UI (Kopfzeile, Glocke, Einstellungen), Backend (Hook-Empfang, Sitzungseingabe), neu: lokale Sprachmodelle auf dem Mac; `setup-ui.sh` und Manifest, falls Modelle mitinstalliert werden; Docs: `docs/architecture.md`, `docs/security.md` |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Michael erfährt ohne Blick auf den Bildschirm, dass eine Sitzung ihn braucht oder fertig ist — eine Meldung nach der anderen, das Dringende zuerst.
- **Z-02:** Was er hört, ist das Wesentliche: Ergebnis oder Frage samt Antwortmöglichkeiten, nicht der ganze Text.
- **Z-03:** Er antwortet per Stimme, die Sitzung arbeitet weiter; eine falsch erkannte Antwort löst nichts Unumkehrbares aus.
- **Z-04:** Keine laufenden Kosten; Sprache verlässt den Mac nicht.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Handy und Cloud-Host. Nur die UI am Mac; der Cloud-Host hat zu wenig Speicher für lokale Modelle, der Handy-Browser ist zu schwach.
- **NZ-02:** Sitzungen außerhalb der UI (Claude im normalen Terminal) — nur UI-Sitzungen melden sich per Hook.
- **NZ-03:** Weckwort oder dauernd offenes Mikrofon. Gesprochen wird per Taste oder Knopf.
- **NZ-04:** Berechtigungsfragen (Befehl ausführen, Datei schreiben) per Stimme beantworten; sie klingeln nicht und bleiben in der Glocke.
- **NZ-05:** Mitschnitt: Audio und Gesprächsverlauf werden nicht gespeichert.
- **NZ-06:** Kostenpflichtige Sprachdienste und die alte Anruf-Ansicht wiederbeleben.
- **NZ-07:** Aufräumen der Team-Ansicht (eigene Karte, `docs/architecture.md:113`); nur die Voice-Reste, die dieses Vorhaben ersetzt, dürfen mit weg.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Das System MUSS einen Anrufmodus bieten, der ein- und ausschaltbar ist, Standard aus, und ausgeschaltet dasselbe Verhalten zeigen wie vor dem Vorhaben. | Z-01 | Test |
| AK-02 | Wenn eine Sitzung eine Rückfrage stellt, eine Plan-Freigabe braucht oder fertig wird und der Anrufmodus an ist, MUSS die UI binnen 5 s nach Eingang der Meldung einen Anruf mit Sitzungs- und Projektname anzeigen und mit einem eigenen Klingelton ankündigen. | Z-01 | Test |
| AK-03 | Solange ein Anruf klingelt oder läuft, MUSS das System jede weitere Meldung in die Warteschlange stellen, statt sie klingeln zu lassen. | Z-01 | Test |
| AK-04 | Die Warteschlange MUSS Rückfragen und Plan-Freigaben vor Fertig-Meldungen reihen, innerhalb einer Art nach Eingangszeit. | Z-01 | Test |
| AK-05 | Wenn Michael einen Anruf ablehnt, MUSS die Meldung in der Glocke bleiben, ohne erneut zu klingeln, bis die Sitzung eine neue Meldung schickt. | Z-01 | Test |
| AK-06 | Wenn Michael „später" wählt, MUSS der Anruf ans Ende der Warteschlange. | Z-01 | Test |
| AK-07 | Wenn eine wartende Meldung auf anderem Weg erledigt wird (im Terminal beantwortet, Sitzung geschlossen), MUSS sie binnen 5 s aus der Warteschlange verschwinden, auch mitten im Klingeln. | Z-01 | Test |
| AK-08 | Das System MUSS Michael erlauben, eine wartende oder fertige Sitzung aus der Glocke selbst anzurufen. | Z-01 | Test |
| AK-09 | Nach Annahme MUSS die UI eine Sprechfassung vorlesen: bei „fertig" das Ergebnis, bei einer Rückfrage die Frage und ihre Antwortmöglichkeiten, bei einer Plan-Freigabe den Kern des Plans. | Z-02 | Stichprobe |
| AK-10 | Die vorgelesene Sprechfassung MUSS höchstens 80 Wörter umfassen, ohne Codeblöcke, Dateipfade, Tabellen oder Links. | Z-02 | Test |
| AK-11 | Falls eine Meldung keine Sprechfassung mitbringt, dann MUSS die UI das ansagen und höchstens die ersten zwei Sätze der letzten Antwort vorlesen, bereinigt nach AK-10. | Z-02 | Test |
| AK-12 | Wenn Michael spricht, MUSS die UI den erkannten Text anzeigen und ihn erst nach Bestätigung „senden" in die Sitzung geben, alternativ verwerfen. | Z-03 | Test |
| AK-13 | Wenn Michael eine Rückfrage mit Antwortmöglichkeiten per Stimme beantwortet, MUSS die Sitzung bei Nummer oder Wortlaut einer Möglichkeit genau diese erhalten, sonst den Text als freie Antwort. | Z-03 | Test |
| AK-14 | Wenn Michael einen Plan per Stimme freigibt, MUSS die UI einmal ausdrücklich nachfragen und nur nach bestätigender Antwort freigeben. | Z-03 | Test |
| AK-15 | Berechtigungsfragen DÜRFEN KEINEN Anruf auslösen. | Z-03 | Test |
| AK-16 | Spracherkennung und Sprachausgabe MÜSSEN ohne Verbindung zu einem Rechner außerhalb des Macs funktionieren. | Z-04 | Test (Netz getrennt) |
| AK-17 | Das System DARF Audio und erkannten Text nur im Arbeitsspeicher und nur für die Dauer des Anrufs halten. | Z-04 | Review |
| AK-18 | Falls Sprachmodelle oder Mikrofon fehlen, dann MUSS die UI den Anrufmodus als nicht verfügbar mit Grund anzeigen, bei unverändert arbeitender Glocke samt Ton. | Z-01 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Betrieb | Keine kostenpflichtigen Dienste für Spracherkennung, Sprachausgabe oder Kürzung; lokale Modelle. | Michael, Chat 27.09. |
| RB-02 | Sicherheit | Repo ist öffentlich: keine Schlüssel, keine Audiodateien, keine Modellgewichte im Repo; Guard `check-no-voice-config` bleibt. | `docs/security.md:49` |
| RB-03 | Technik | Neue mitgelieferte Dateien nur über `specwright/manifest.tsv`; Installer Bash-3.2-tauglich, Downloads über `install-lib.sh`. Grund: AR-01. | `CLAUDE.md` (Konventionen), `docs/architecture.md` |
| RB-04 | Technik | TypeScript strict, Präfix `aos-`, `projectDir()`, Workspace-Zustand im Backend. Grund: AR-04, AR-05. | `CLAUDE.md` (Konventionen) |
| RB-05 | Technik | Styles für Elemente unter einem Shadow-Root nicht in `theme.css`. | `CLAUDE.md` (Fehler zweimal) |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Soll die Sprechfassung auch im Terminal der Sitzung sichtbar sein? | nein, bis dahin gilt: ja, als kurzer Absatz am Ende der Antwort | Product Owner | Spec-Freigabe |
| OF-02 | Senden per Sprachbefehl („senden") zusätzlich zu Taste/Knopf? | nein, bis dahin gilt: beides | Product Owner | Spec-Freigabe |
| OF-03 | Welche Modelle (Erkennung, Stimme) — Wahl nach Messung EK-01 bis EK-03 | nein, bis dahin gilt: Auswahl im Plan Mode nach Messung, Freigabe über ER-02 | Agent im Plan Mode | Plan-Freigabe |
| OF-04 | Klingeln, wenn der UI-Tab im Hintergrund liegt oder der Browser zu ist? | nein, bis dahin gilt: Tab im Hintergrund klingelt (Ton plus Systemmitteilung), Browser zu klingelt nicht | Product Owner | Spec-Freigabe |

---

## 8. Begriffe

<!-- leser: mensch -->

- **B-01 Meldung:** eine Rückfrage, eine Plan-Freigabe oder ein „fertig" einer UI-Sitzung — dieselben Ereignisse, die heute die Glocke füllt; Berechtigungsfragen nicht (NZ-04).
- **B-02 Anruf:** Zustellung genau einer Meldung: klingeln → annehmen / ablehnen / später → Sprechfassung → Antwort oder Auflegen.
- **B-03 Warteschlange:** Reihenfolge der noch nicht zugestellten Meldungen nach AK-04.
- **B-04 Sprechfassung:** kurzer Sprechtext zu einer Meldung nach AK-09/AK-10, geschrieben vom Agenten der Sitzung selbst (entschieden 27.09., Product Owner: kein drittes Modell).
- **B-05 Lokal:** Rechenweg bleibt auf Michaels Mac; einmaliger Download der Modelle bei der Einrichtung ist erlaubt.

## 9. Erfolgskennzahlen

<!-- leser: mensch -->

| ID | Kennzahl | Zielwert | Messung vor Produktion | Messung im Betrieb | Reaktion bei Verfehlen |
|---|---|---|---|---|---|
| EK-01 | Zeit von Sprechende bis erkannter Text angezeigt, Satz von 10 s | ≤ 3 s | 10 Sätze am Mac, Median | kein Gate | anderes Modell (ER-03) |
| EK-02 | Zeit von Annahme bis erstes gesprochenes Wort | ≤ 2 s | 10 Anrufe, Median | kein Gate | ER-03 |
| EK-03 | Wortfehlerrate deutscher Sätze mit Fachbegriffen (Spec, Plan, Merge, Pull Request) | ≤ 15 % | 20 vorgegebene Sätze, von Michael gesprochen | kein Gate | ER-03 |
| EK-04 | Anteil Sprechfassungen ≤ 80 Wörter | 100 % | Test mit 10 echten Fertig-Meldungen | Stichprobe erste Woche | Anweisung an Agenten nachschärfen |

## 10. Auslieferung, Betrieb, Zeitbudget

<!-- leser: mensch -->

- **Freigabe Produktion:** Michael (Merge nach `main` löst Auto-Deploy der UI aus).
- **Stufen:** auf einmal; Anrufmodus Standard aus (AK-01), damit ohne Einschalten nichts anders ist.
- **Rückzug:** Anrufmodus ausschalten; Michael allein.
- **Betrieb:** Michael; Fehler zeigt die UI (AK-18).
- **Zeitbudget:** 8 Arbeitstage ab Spec-Freigabe; danach Stopp und Neubewertung (ER-08).

## 11. Entscheidungsrechte

<!-- leser: agent -->

| ID | Stufe | Regel |
|---|---|---|
| ER-00 | allein (vorläufig) | Auslegungsfragen zu AK, RB oder B ohne Widerspruch: engste Auslegung, die den Wortlaut erfüllt; in der Spec unter „Annahmen" dokumentieren; weiterarbeiten. Bestätigung gesammelt bei der Spec-Freigabe. |
| ER-01 | allein | Details ohne Datenverlust und ohne Außenwirkung: interne Struktur, Benennungen, Aufgabenschnitt, synthetische Testdaten; Entfernen der ersetzten Voice-Reste (`voice.protocol.ts`, Toast in `team-view.ts`). |
| ER-02 | fragen | Neue externe Abhängigkeit (Bibliothek, Modell, Fremddienst); Modellwahl mit Lizenz und Größe vorlegen. |
| ER-03 | fragen | Eine Kennzahl wird vor Produktion verfehlt. |
| ER-04 | stopp | Zugriff auf Produktionsdaten. |
| ER-05 | stopp | Zwei Kriterien widersprechen sich. |
| ER-06 | stopp | Tests, Gates oder Schwellen müssten geändert werden, damit etwas grün wird. |
| ER-07 | stopp | Produktionsfreigabe: bereitet der Agent vor; freigeben darf nur Michael. |
| ER-08 | stopp | Zeitbudget ausgeschöpft. |

## 12. Annahmen

<!-- leser: mensch -->

- **AN-01:** Ein aktueller Mac schafft deutsche Spracherkennung und Sprachausgabe lokal innerhalb EK-01/EK-02. Prüfung: Messung im Plan Mode vor Plan-Freigabe.
- **AN-02:** Der Agent kann eine Sprechfassung zuverlässig selbst mitliefern (Anweisung an die Sitzung), und sie erreicht die UI mit der Fertig-Meldung — die volle letzte Antwort kommt heute schon an [Q: `ui/src/server/services/claude-hooks.ts:217`]. Prüfung: Plan Mode, Probe mit einer echten Sitzung.
- **AN-03:** Frage und Antwortmöglichkeiten einer Rückfrage sind aus der Meldung lesbar (heute wird nur die erste Frage gelesen [Q: `ui/src/server/services/claude-hooks.ts:197-201`]). Prüfung: Plan Mode.
- **AN-04:** Eine Wahl in einem Rückfrage- oder Plan-Dialog lässt sich per Eingabe an die Sitzung auslösen; die UI erkennt Dialoge schon am Bildschirm [Q: `ui/src/server/services/dialog-driver.ts:23-48`, `ui/src/server/services/agent-status.ts:63`]. Prüfung: Plan Mode.
- **AN-05:** Der Browser gibt das Mikrofon für die UI am Mac frei (`localhost` gilt als sicher). Prüfung: Plan Mode.

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-27 | Freigabe durch den PO ohne Änderung; OF-01 bis OF-04 bleiben offen, nicht blockierend, Übergangsregeln gelten; AK-08 (selbst anrufen) mit Freigabe angenommen. Abgleich Mensch/Agent: ohne Befund | alle | Product Owner, 2026-09-27 |
| 0.1.0 | 2026-09-27 | Entwurf aus Gespräch vom 27.09.; fünf Zuschnittsfragen vom PO bestätigt (nur Mac, Agent schreibt Sprechfassung, ein Anruf zur Zeit mit Vorrang, Berechtigungen nicht per Stimme, Taste statt Weckwort, kein Mitschnitt) | alle | — |

<!-- Definition of Ready (vor status "angenommen"):
     [x] Drei Sätze nennen Zweck, Kernaufgaben, Endzustand und versprechen nichts, was AK/RB/NZ einschränken.
     [x] Problem mit Beleg, Anlass genannt.
     [x] Jedes AK: EARS-Form, ein Modalverb, Ziel, Prüfart, beobachtbar statt Mechanismus.
     [x] Mindestens ein Nicht-Ziel. Jede RB mit Herkunft.
     [x] Keine offene Frage mit „Blockiert: ja".
     [x] Keine Projektregeln, die in CLAUDE.md gehören.
     [x] Ab risikoklasse mittel: Abschnitte 8–12 ausgefüllt.
     [x] `verantwortlich` hat angenommen, Commit dokumentiert die Annahme. -->
