---
intent_id: "INT-2026-026"  
titel: "UI: Anruf freihändig — Mikrofon nach dem Vorlesen, Senden per Schlusswort"  
status: "angenommen"  
version: "1.0.0"  
autor: "Michael Sindlinger (Wunsch aus dem Gebrauch, 28.09.2026, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-28"  
geaendert: "2026-09-28"  
risikoklasse: "mittel"  
groesse: "M"  
bypass: "nein"  
bypass_grund: ""  
bezuege:  
  product: "docs/product-brief.md"  
  spec: "spec.md"  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: "INT-2026-025 teilweise: AK-12, NZ-03 (eingeengt); spec.md FA-19, FA-20; plan.md O3"  
schlagworte: [ui, sprache, anruf, freihaendig, stt, tts]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — im Chat: „freigabe, alle OF -> ok\", 28.09."  
  am: "2026-09-28"  

---

# Absicht: UI: Anruf freihändig — Mikrofon nach dem Vorlesen, Senden per Schlusswort

<!-- Ablage: intent/INT-2026-026-anruf-freihaendig/intent.md -->

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

- **Zweck:** Ein Anruf soll ohne Hände gehen: Michael hört zu, antwortet und schickt ab, ohne „Sprechen", „Fertig" und „Senden" zu klicken — sonst bringt der Anruf gegenüber dem Blick auf den Bildschirm nichts.
- **Kernaufgaben:** (1) Nach dem Vorlesen öffnet sich das Mikrofon von selbst. (2) Endet das Gesprochene mit „Antwort senden" oder „Antwort absenden", geht die Antwort ohne das Schlusswort sofort raus. (3) 20 Sekunden Stille legen auf, ohne zu senden. (4) Plan-Freigabe per „freigeben" und „ja", ohne Knopf.
- **Endzustand:** AK-01 bis AK-10 sind erfüllt; Knöpfe und Tastatur bleiben als Rückfall; Weckwort und Mikrofon außerhalb eines Anrufs bleiben draußen (NZ-01).

## 1. Problem und Anlass

<!-- leser: mensch -->

Seit INT-2026-025 (PR #95, gemergt am 27.09.) rufen Sitzungen an. Um zu antworten, muss Michael heute dreimal eingreifen: „Sprechen" klicken oder die Leertaste halten, „Fertig" klicken, dann „Senden" [Q: `ui/frontend/src/components/anruf/aos-anruf.ts:139,150,167`]. Das Mikrofon hört nur zwischen „Sprechen" und „Fertig" [Q: `intent/INT-2026-025-agenten-anrufe/spec.md:126` FA-19]. Den erkannten Text liest die UI vor und fragt „Senden oder verwerfen?"; gesendet wird erst danach [Q: `ui/frontend/src/services/anruf.service.ts:925-926`, `spec.md:127` FA-20]. „Das nimmt dem Anruf den Nutzen" [Q: Michael, Chat 28.09.].

Im Code gefunden, was das Vorhaben größer macht als drei entfernte Klicks:

- Die Aufnahme endet nur auf „Fertig" oder nach 30 Sekunden und wird erst dann als Ganzes erkannt [Q: `ui/src/shared/types/anruf.protocol.ts:202`, `anruf.service.ts:806,811-840`]. Es gibt keine Erkennung von Sprechpausen. Freihändig heißt: die UI muss selbst merken, wann gesprochen und wann geschwiegen wird, und zwischendurch erkennen, ob das Schlusswort gefallen ist.
- Sprachbefehle zählen heute nur, wenn das ganze Gesprochene genau das Wort ist [Q: `ui/src/shared/anruf-befehle.ts:42-45`]. Ein Schlusswort am Ende eines längeren Satzes ist neu.
- Die Sprachausgabe meldet nicht, wann sie fertig vorgelesen hat [Q: `anruf.service.ts:54-58,1043-1051`]. „Mikrofon erst nach dem Vorlesen" braucht dieses Signal.

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael am Mac, Anrufmodus an | Antwortet ohne Klick; muss das Schlusswort sagen, damit etwas rausgeht; Schweigen legt auf. Anrufmodus aus: nichts ändert sich. |
| Laufende Sitzungen | Bekommen Antworten ohne vorheriges Vorlesen und Bestätigen; der Inhalt einer Antwort ist derselbe wie heute. |
| Systeme | Web-UI (Anruf-Kasten, Anruf-Dienst im Browser), Deutung der Sprachbefehle; Backend-Anrufzustand nur, falls „auflegen wegen Stille" dort geführt wird; Docs: `design.md` (Anruf-Muster), INT-2026-025 als abgelöst in Teilen markiert |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Michael führt einen Anruf von der Annahme bis zum Senden ohne Maus und ohne Tastatur.
- **Z-02:** Nichts geht raus, was Michael nicht ausdrücklich abgeschlossen hat — ein „senden" mitten im Satz, Schweigen oder ein abgebrochener Satz senden nichts.
- **Z-03:** Ein Plan wird nur nach „freigeben" und einem zweiten „ja" freigegeben.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Weckwort und Mikrofon außerhalb eines Anrufs. Das Mikrofon ist nur offen, während ein angenommener Anruf auf Antwort wartet (engt INT-2026-025 NZ-03 ein, hebt es nicht auf).
- **NZ-02:** Dazwischenreden: Das Vorlesen lässt sich nicht durch Sprechen unterbrechen. „Nochmal" und Knöpfe bleiben dafür.
- **NZ-03:** Berechtigungsfragen per Stimme (bleibt INT-2026-025 NZ-04).
- **NZ-04:** Anderes Erkennungsmodell oder Fremddienst. Es bleibt die lokale Erkennung aus INT-2026-025.
- **NZ-05:** Mitschrift Wort für Wort während des Sprechens. Der erkannte Text erscheint abschnittsweise nach Sprechpausen.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn die UI in einem angenommenen Anruf das Vorlesen beendet hat (Sprechfassung, Frage, Nachfrage oder Hinweis), MUSS sie das Mikrofon ohne Klick und ohne Taste öffnen. | Z-01 | Test |
| AK-02 | Solange die UI spricht, DARF das Mikrofon NICHT hören. | Z-02 | Test |
| AK-03 | Wenn das Gesprochene mit „Antwort senden" oder „Antwort absenden" endet, MUSS die Sitzung den erkannten Text ohne dieses Schlusswort erhalten, ohne dass die UI den Text vorher vorliest oder eine Frist zum Widerspruch abwartet. | Z-01 | Test |
| AK-04 | Steht „senden" oder „Antwort senden" nicht am Ende des Gesprochenen, DARF das System NICHT senden und MUSS weiter zuhören. | Z-02 | Test |
| AK-05 | Wenn 20 s lang nicht gesprochen wird, gezählt ab Öffnen des Mikrofons und neu ab jedem gesprochenen Wort, MUSS der Anruf ohne Senden enden, bei in der Glocke verbleibender Meldung. | Z-02 | Test |
| AK-06 | Wenn Michael bei einer Plan-Freigabe „freigeben" sagt, MUSS die UI „Plan wirklich freigeben?" fragen und nur nach gesprochenem „ja" freigeben; beide Wörter brauchen kein Schlusswort, jede andere Antwort auf die Nachfrage gibt nicht frei. | Z-03 | Test |
| AK-07 | Wenn Michael eine Rückfrage mit Nummer oder Wortlaut einer Möglichkeit und Schlusswort beantwortet, MUSS die Sitzung genau diese Möglichkeit erhalten, bei mehreren Fragen gesammelt nach der letzten Frage (das Schlusswort führt jeweils zur nächsten). | Z-01 | Test |
| AK-08 | Solange das Mikrofon offen ist, MUSS die UI den bisher erkannten Text und einen sichtbaren Hinweis „hört zu" anzeigen. | Z-02 | Test |
| AK-09 | Das System MUSS jeden Schritt eines Anrufs weiterhin per Knopf und Tastatur erlauben (annehmen, ablehnen, später, senden, verwerfen, freigeben, auflegen); „Senden" per Knopf schickt den angezeigten Text. | Z-01 | Test |
| AK-10 | Falls das Mikrofon nicht geöffnet werden kann, dann MUSS die UI den Grund ansagen und anzeigen, bei per Knopf weiterführbarem Anruf. | Z-01 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Betrieb | Erkennung und Sprachausgabe bleiben lokal auf dem Mac, keine kostenpflichtigen Dienste. | INT-2026-025 RB-01, AK-16 |
| RB-02 | Datenschutz | Audio und erkannter Text nur im Arbeitsspeicher und nur bis Anrufende; das gilt auch für die längere Zuhörzeit. | INT-2026-025 AK-17, `docs/security.md` |
| RB-03 | Sicherheit | Antworten in Rückfrage- und Plan-Dialoge nur in einen gerade gelesenen Zustand, Nachlesen nach jeder Taste. Grund: AR-08. | `docs/architecture.md` AR-08 |
| RB-04 | Technik | TypeScript strict, Präfix `aos-`; Anruf-Kasten bleibt Light DOM, Styles nicht in einen Shadow-Root über `theme.css`. | `CLAUDE.md` (Konventionen, Fehler zweimal) |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Ansagen am Ende: nach dem Senden „Gesendet", nach 20 s Stille „Keine Antwort, aufgelegt"? „Ohne Ansage" gilt dann nur für das Vorlesen des Texts vor dem Senden. | *entschieden 2026-09-28 (Product Owner)*: Vorschlag angenommen → B-05 | Product Owner | erledigt |
| OF-02 | Längste freie Antwort: heute 30 s Aufnahme. | *entschieden 2026-09-28 (Product Owner)*: Vorschlag angenommen → B-06 | Product Owner | erledigt |
| OF-03 | Schlusswort „Antwort verwerfen": löscht das bisher Gesprochene, Mikrofon bleibt offen. | *entschieden 2026-09-28 (Product Owner)*: Vorschlag angenommen → B-07 | Product Owner | erledigt |
| OF-04 | „Auflegen" als ganzer Satz legt sofort auf, ohne zu senden. | *entschieden 2026-09-28 (Product Owner)*: Vorschlag angenommen → B-04 | Product Owner | erledigt |
| OF-05 | Eigener Schalter „freihändig" neben dem Anrufmodus? | *entschieden 2026-09-28 (Product Owner)*: Vorschlag angenommen → B-08 | Product Owner | erledigt |

---

## 8. Begriffe

<!-- leser: mensch -->

- **B-01 Schlusswort:** „Antwort senden" oder „Antwort absenden" als letzte Wörter des Gesprochenen vor einer Sprechpause; Groß- und Kleinschreibung und Satzzeichen zählen nicht. Nur am Ende gültig (AK-04).
- **B-02 Das Gesprochene:** alles, was Michael seit dem Öffnen des Mikrofons zu dieser Frage gesagt hat, über Sprechpausen hinweg zusammengesetzt.
- **B-03 Stille:** keine Sprache erkannt; Grundrauschen im Raum zählt als Stille.
- **B-04 Einzelwort-Befehl:** „freigeben", „ja", „nein", „nochmal" und „auflegen" (legt sofort ohne Senden auf; OF-04, entschieden 28.09., Product Owner) wirken als ganzer Satz ohne Schlusswort, wie in INT-2026-025.
- **B-05 Ansagen am Ende (OF-01, entschieden 28.09., Product Owner):** nach dem Senden „Gesendet", nach 20 s Stille „Keine Antwort, aufgelegt". „Ohne Ansage" in AK-03 meint nur: der erkannte Text wird vor dem Senden nicht vorgelesen.
- **B-06 Längste Antwort (OF-02, entschieden 28.09., Product Owner):** 2 Minuten je Frage; danach Ansage „Antwort zu lang", Text bleibt sichtbar, Zuhören endet, nichts gesendet.
- **B-07 „Antwort verwerfen" (OF-03, entschieden 28.09., Product Owner):** als Schlusswort löscht es das bisher Gesprochene; das Mikrofon bleibt offen.
- **B-08 Kein eigener Schalter (OF-05, entschieden 28.09., Product Owner):** freihändig gilt immer, wenn der Anrufmodus an ist.

## 9. Erfolgskennzahlen

<!-- leser: mensch -->

| ID | Kennzahl | Zielwert | Messung vor Produktion | Messung im Betrieb | Reaktion bei Verfehlen |
|---|---|---|---|---|---|
| EK-01 | Zeit vom Ende des Schlussworts bis die Sitzung die Eingabe hat | ≤ 3 s | 10 Anrufe am Mac, Median | kein Gate | ER-03 |
| EK-02 | Schlusswort erkannt | ≥ 19 von 20 | 20 Antworten mit Michaels Stimme | kein Gate | ER-03 |
| EK-03 | Fehlauslösung durch „senden" mitten im Satz | 0 von 20 | 20 Sätze mit „senden"/„Antwort senden" in der Mitte, Kontrollfall: dieselben Sätze mit Schlusswort am Ende senden | kein Gate | ER-03 |
| EK-04 | Anruf legt während einer Sprechpause unter 5 s auf | 0 von 10 | 10 Antworten mit bewussten Pausen von 3–5 s | Stichprobe erste Woche | ER-03 |

## 10. Auslieferung, Betrieb, Zeitbudget

<!-- leser: mensch -->

- **Freigabe Produktion:** Michael (Merge nach `main` löst Auto-Deploy der UI aus).
- **Stufen:** auf einmal; nur wirksam bei Anrufmodus an.
- **Rückzug:** Anrufmodus ausschalten; Michael allein.
- **Betrieb:** Michael.
- **Zeitbudget:** 4 Arbeitstage ab Spec-Freigabe; danach Stopp und Neubewertung (ER-08).

## 11. Entscheidungsrechte

<!-- leser: agent -->

| ID | Stufe | Regel |
|---|---|---|
| ER-00 | allein (vorläufig) | Auslegungsfragen zu AK, RB oder B ohne Widerspruch: engste Auslegung, die den Wortlaut erfüllt; in der Spec unter „Annahmen" dokumentieren; weiterarbeiten. Bestätigung gesammelt bei der Spec-Freigabe. |
| ER-01 | allein | Details ohne Datenverlust und ohne Außenwirkung: interne Struktur, Benennungen, Aufgabenschnitt, synthetische Testdaten, Schwellen für Sprechpausen innerhalb der Kennzahlen; INT-2026-025 `spec.md`/`plan.md` mit Verweis „geändert durch INT-2026-026" versehen. |
| ER-02 | fragen | Neue externe Abhängigkeit (Bibliothek, Modell, Fremddienst), etwa eine fertige Sprechpausen-Erkennung. |
| ER-03 | fragen | Eine Kennzahl wird vor Produktion verfehlt. |
| ER-04 | stopp | Zugriff auf Produktionsdaten. |
| ER-05 | stopp | Zwei Kriterien widersprechen sich. |
| ER-06 | stopp | Tests, Gates oder Schwellen müssten geändert werden, damit etwas grün wird. |
| ER-07 | stopp | Produktionsfreigabe: bereitet der Agent vor; freigeben darf nur Michael. |
| ER-08 | stopp | Zeitbudget ausgeschöpft. |

## 12. Annahmen

<!-- leser: mensch -->

- **AN-01:** Die lokale Erkennung gibt „Antwort senden" am Satzende verlässlich wieder, auch als „Antwort senden." oder „Antworten senden". Prüfung: Messung EK-02/EK-03 mit Michaels Stimme vor Plan-Freigabe.
- **AN-02:** Der Browser meldet das Ende jedes vorgelesenen Satzes zuverlässig, auch bei Tab im Hintergrund. Heute wird es nicht abgefragt [Q: `anruf.service.ts:1043-1051`]. Prüfung: Plan Mode, Probe am Mac.
- **AN-03:** Sprechpausen lassen sich im Browser an der Lautstärke erkennen; Lüfter oder leise Musik halten die 20 s nicht dauerhaft offen. Prüfung: Plan Mode, Probe am Mac mit Hintergrundgeräusch.
- **AN-04:** Wiederholtes Erkennen des wachsenden Gesprochenen nach jeder Pause bleibt schnell genug für EK-01 (heute 0,64 s Median für einen Satz von 10 s [Q: `intent/INT-2026-025-agenten-anrufe/plan.md:33`]). Prüfung: Plan Mode.
- **AN-05:** Die Warnung vor falsch erkannten Antworten aus INT-2026-025 Z-03 trägt künftig allein das Schlusswort: eine falsch erkannte, aber abgeschlossene Antwort geht als Eingabe an die Sitzung. Das ist umkehrbar (Michael korrigiert im nächsten Satz), eine Plan-Freigabe nicht — daher bleibt dort die Nachfrage (AK-06). Prüfung: Freigabe dieser Absicht.

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-28 | Freigabe durch den PO; OF-01 bis OF-05 mit Vorschlag entschieden (B-04 bis B-08), AN-05 mit Freigabe bestätigt. Abgleich Mensch/Agent: ohne Befund | alle | Product Owner, 2026-09-28 |
| 0.1.0 | 2026-09-28 | Entwurf aus Michaels Beschreibung vom 28.09.; Ist-Stand im Code belegt (Aufnahme nur bis „Fertig", keine Pausenerkennung, Befehle nur als ganzer Satz, kein Ende-Signal der Sprachausgabe) | alle | — |

<!-- Definition of Ready (vor status "angenommen"):
     [x] Drei Sätze nennen Zweck, Kernaufgaben, Endzustand und versprechen nichts, was AK/RB/NZ einschränken.
     [x] Problem mit Beleg, Anlass genannt.
     [x] Jedes AK: EARS-Form, ein Modalverb, Ziel, Prüfart, beobachtbar statt Mechanismus.
     [x] Mindestens ein Nicht-Ziel. Jede RB mit Herkunft.
     [x] Keine offene Frage mit „Blockiert: ja".
     [x] Keine Projektregeln, die in CLAUDE.md gehören.
     [x] Ab risikoklasse mittel: Abschnitte 8–12 ausgefüllt. Ab hoch: Blindprobe durch frischen Agenten, 0 blockierende Rückfragen.
     [x] `verantwortlich` hat angenommen, Commit dokumentiert die Annahme. -->
