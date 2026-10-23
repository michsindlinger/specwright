---
intent_id: "INT-2026-035"  
format: "2.1"  
titel: "Plan-PR, Karten anlegen und Handschritte nach dem Factory-Schnitt"  
status: "angenommen"  
version: "1.1.0"  
freigabe:  
  von: "Michael (Produktverantwortung)"  
  am: "2026-10-24"  
autor: "Michael Sindlinger"  
verantwortlich: "Michael (Produktverantwortung)"  
erstellt: "2026-10-24"  
geaendert: "2026-10-24"  
risikoklasse: "mittel"  
groesse: "M"  
bypass: "nein"  
bypass_grund: ""  
bezuege:  
  product: "docs/product-brief.md"  
  spec: "spec.md"  
  plan: ""  
  board_karte: ""  
  adr: ["docs/adr/0008-plan-ruft-eingangspruefung.md"]  
  ersetzt: ""  
schlagworte: ["software-factory", "plan", "build", "handschritte", "pull-request"]  

---

# Absicht: Plan-PR, Karten anlegen und Handschritte nach dem Factory-Schnitt

<!-- Ablage: intent/INT-2026-035-plan-pr-handschritte/intent.md -->

## Felder im Kopf

<!-- leser: agent -->

| Feld | Bedeutung | Werte |
|---|---|---|
| `intent_id` | stabile Kennung, nie wiederverwenden | `INT-JJJJ-NNN` |
| `titel` | 5 bis 80 Zeichen | — |
| `status` | Lebenszyklus | `entwurf` · `in_klaerung` · `angenommen` · `umgesetzt` · `abgeloest` · `verworfen` |
| `format` | Formatversion der Vorlage, aus der die Datei entstand; nie von Hand setzen oder erhöhen; Regel: `specwright/templates/sdlc/README.md`, Abschnitt „Formatversion" | `"2.1"` |
| `version` | Fassung dieser Absicht, nicht der Vorlage; SemVer, Regeln im Änderungsprotokoll; Datum und Version immer in Anführungszeichen | `"0.1.0"` |
| `verantwortlich` | Rolle, die annimmt und bei Eskalation entscheidet (Pflicht) | — |
| `risikoklasse` | ab `mittel` gilt die Vertragsschicht (Abschnitte 8–12) | `niedrig` · `mittel` · `hoch` |
| `groesse` | Aufwand | `S` unter 1 Tag · `M` 1–5 Tage · `L` über 5 Tage |
| `bypass` | `ja` bei Bugfix oder Größe S: direkt zu `plan.md`, keine `spec.md`; Grund in `bypass_grund` | `ja` · `nein` |
| `bezuege` | Pfade zu Produkt, Spec, Plan, ADRs; `board_karte` = Boardname und Kartentitel; `ersetzt` = Vorgänger-Intent | — |
| `schlagworte` | kleinbuchstaben-mit-bindestrich | — |
| `kennung_hinweis` | optional (INT-2026-022): steht nur, wenn `next-intent-id.sh` die Kennung ohne entfernten Stand vergeben hat (kein Netz, Fetch gescheitert oder abgeschaltet) — beim Push auf Kollision prüfen | `"ohne entfernten Stand vergeben (JJJJ-MM-TT)"` |

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Ein Plan, den `/plan` für eine Software Factory in Karten und Handschritte geschnitten hat, soll ohne Handarbeit am Git bis zur Factory kommen, und Menschen sollen ihre Handschritte an einem festen Ort erledigen.
- **Kernaufgaben:** `/plan` bringt den Intent-Ordner per eigenem PR auf den Factory-Zweig und stößt das Anlegen der Karten an; `/build` erkennt einen geschnittenen Plan und baut einzelne Handschritte statt des ganzen Plans; das Vorhaben wird am Ende `umgesetzt`, wo die Factory es liest.
- **Endzustand:** AK-01 bis AK-12 erfüllt; ohne Factory laufen `/plan` und `/build` wie heute (AK-12).

## 1. Problem und Anlass

<!-- leser: mensch -->

Seit INT-2026-034 (PR #109) schneidet `/plan` Karten und Handschritte, endet aber mit einem lokalen Commit und `NEXT: /build` [Q: `specwright/workflows/core/plan.md:159-167`]. Die Factory liest Kartendatei, Erledigt-Vermerke der Handschritte und den Status von Vorhaben nur vom entfernten Factory-Zweig [Q: Factory `create-cards`, Kopfkommentar; ADR-054 Nachträge 3 und 5; Factory `src/core/readiness.ts:585`]. Wo ein Mensch Handschritte erledigt, ist nirgends festgelegt. `/build` legt immer einen Zweig von der aktuellen Basis an und baut den ganzen Plan [Q: `specwright/workflows/core/build.md:33`, Step 3]; bei einem geschnittenen Plan täte es die Arbeit der Factory doppelt. Anlass: erster echter Plan mit Schnitt in einem Zielprojekt, dessen Factory-Zweig nicht `main` ist [Q: Michael, 2026-10-24].

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael (plant und baut) | Nach dem Schnitt fragt `/plan`, ob gepusht, ein PR angelegt, gemergt und `create-cards` gestartet wird. `/build` zeigt bei geschnittenen Plänen die Handschritte statt den ganzen Plan zu bauen. |
| Software Factory | Bekommt Kartendatei und Erledigt-Vermerke über gemergte PRs auf ihrem Zweig; sonst unverändert. |
| Projekte ohne Factory | Nichts. |
| Systeme | Specwright-Workflows `plan` und `build`; Git und GitHub des Zielprojekts; Befehl `create-cards` der Factory (nur Aufruf). |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Ein freigegebener, geschnittener Plan liegt auf dem Factory-Zweig, und seine ready Karten stehen am Board, ohne dass die Person Git-Befehle selbst tippt.
- **Z-02:** Jeder Handschritt hat einen festen Arbeitsort; „erledigt" steht auf dem Factory-Zweig genau dann, wenn die Arbeit gemergt ist.
- **Z-03:** `/build` baut bei einem geschnittenen Plan nur Handschritte, nie die Arbeit von Factory-Karten.
- **Z-04:** Das Vorhaben steht am Ende auf dem Factory-Zweig auf `umgesetzt`, damit abhängige Vorhaben weiterkommen.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Keine Prüfregel der Factory in Specwright; ready und Gründe sagt nur die Factory (ADR-0008).
- **NZ-02:** Keine Handschritte am Board.
- **NZ-03:** Keine Änderung an der Web-UI. Der UI-Abschluss zielt auf den Basis-Zweig der UI-Konfiguration, nicht auf den Factory-Zweig [Q: `ui/src/server/services/vorhaben-abschluss.ts:350`]; der Abgleich ist ein eigenes Vorhaben (OF-01).
- **NZ-04:** Kein Merge ohne ausdrückliche Bestätigung im Lauf; kein Merge nach `main` von Specwright selbst.
- **NZ-05:** Keine Änderung am Code der Factory. Der Nachtrag zu ADR-054 (Arbeitsort D3/D4) läuft getrennt im Factory-Repo.
- **NZ-06:** Kein automatischer Lauf von `create-cards` durch die Factory-Engine; er startet nur aus einer Sitzung mit Bestätigung.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn ein geschnittener Plan freigegeben ist, MUSS `/plan` vor Push, PR-Anlage, Merge und Anlegen der Karten je eine Bestätigung der Person einholen. | Z-01 | Stichprobe (E2E) |
| AK-02 | Der Plan-PR DARF nur Dateien des eigenen Intent-Ordners und die neuen Entscheidungsnotizen des Vorhabens, die eine Karte nennt, enthalten und MUSS auf den Factory-Zweig zielen. | Z-01 | Stichprobe (E2E) |
| AK-03 | Wenn der Plan-PR gemergt ist, MUSS `/plan` zuerst zeigen, welche Karten angelegt und welche ausgelassen würden, und erst nach Bestätigung anlegen. | Z-01 | Stichprobe (E2E) |
| AK-04 | Falls Karten beim Anlegen ausgelassen werden, MUSS `/plan` je Karte die Gründe der Factory zeigen und die Wahl „neu schneiden (neuer Plan-PR)" oder „als Handschritt" anbieten. | Z-01 | Stichprobe (Kontrollfall) |
| AK-05 | Ohne ausdrückliche Bestätigung im Lauf DARF kein Plan- oder Handschritt-PR gemergt werden. | Z-01, Z-02 | Review |
| AK-06 | Wenn `/build` für einen geschnittenen Plan startet, MUSS es jeden Handschritt mit Stand zeigen („erledigt", „frei", „wartet auf K-nn") und DARF NICHT die Arbeit von Factory-Karten bauen. | Z-03 | Stichprobe (E2E) |
| AK-07 | Wenn die Person einen freien Handschritt mit Code wählt, MUSS die Arbeit auf einem eigenen Zweig ab dem entfernten Factory-Zweig entstehen und in einem PR liegen, der zugleich sein Erledigt-Datum setzt. | Z-02 | Stichprobe (E2E) |
| AK-08 | Wenn die Person einen Handschritt ohne Code als erledigt meldet, MUSS ein PR entstehen, der nur sein Erledigt-Datum setzt und den Nachweis in der Commit-Nachricht nennt. | Z-02 | Stichprobe (E2E) |
| AK-09 | Falls der gewählte Handschritt nicht frei ist oder die Arbeitskopie nicht sauber ist, MUSS `/build` mit Grund abbrechen, ohne etwas zu ändern. | Z-02 | Stichprobe (Kontrollfall) |
| AK-10 | Läuft die Sitzung schon in einer eigenen Arbeitskopie, DARF `/build` keine zweite anlegen; sonst MUSS es eine eigene Arbeitskopie für den Handschritt anlegen. | Z-02 | Review |
| AK-11 | Wenn alle Karten gemergt und alle Handschritte erledigt sind, MUSS `/build` fragen, ob das Vorhaben umgesetzt ist, und nach „ja" den Status per PR auf den Factory-Zweig bringen. | Z-04 | Stichprobe (E2E) |
| AK-12 | Ohne Factory-Schnitt MÜSSEN `/plan` und `/build` wie vor diesem Vorhaben laufen; `verify` MUSS grün sein. | Z-03 | Stichprobe (Kontrollfall) + Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Sicherheit | Repo ist öffentlich: keine Pfade, Hosts oder Projektnamen der Factory außer Aufruf und Format. | `docs/security.md` |
| RB-02 | Technik | Factory-Zweig = `code.branch` der Betriebsdatei, die Step 1 von `/plan` klärt. Grund: nur dieser Stand zählt für die Factory. | ADR-054 Nachtrag 3; `specwright/workflows/core/plan.md:39-42` |
| RB-03 | Betrieb | Merge bleibt Entscheidung des Menschen; Merge nach `main` von Specwright löst Auto-Deploy aus. | `CLAUDE.md` „Nie" |
| RB-04 | Produkt | AK-11 schränkt INT-2026-024 NZ-01/NZ-02 („Abschluss nur per UI-Klick") für geschnittene Pläne ein: die ausdrückliche Bestätigung im Lauf ersetzt den Klick. | dieses Vorhaben (Entscheidung Michael, 2026-10-24) |
| RB-05 | Technik | Kein neuer Lieferumfang ohne Manifest-Zeile; Workflows bleiben Hauptagent-Text, keine Prüfregel der Factory. | `CLAUDE.md` „Lieferumfang", ADR-0008 |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Soll der UI-Abschluss bei Factory-Projekten auf den Factory-Zweig zielen? | *entschieden 2026-10-24 (Michael)*: eigenes Vorhaben später, siehe NZ-03; bis dahin gilt: AK-11 ist der Weg zu `umgesetzt`; der UI-Knopf wirkt nur, wenn UI-Basis-Zweig = Factory-Zweig | Michael | später, eigenes Vorhaben |
| OF-02 | Wie heißen Zweige und Arbeitskopien der Handschritte? | *entschieden 2026-10-24 (Michael)*, siehe AK-07/AK-10: Zweig `hand/INT-…-H-nn`, Arbeitskopie `…-worktrees/INT-…-H-nn` (Briefing D7); `/spec` prüft gegen das Schema von `/build` | Agent (ER-01) | `/spec` |

---

## 8. Begriffe

<!-- leser: mensch -->

- **B-01 Factory-Zweig:** der Zweig `code.branch` aus der Betriebsdatei der Factory für das Zielprojekt, immer im entfernten Stand (`origin/…`), nie der lokale Zweig.
- **B-02 Geschnittener Plan:** `plan.md` mit `cards.yaml` im Intent-Ordner und Unterabschnitt „Karten für die Factory" mit Karten- oder Handschritt-Tabelle.
- **B-03 Plan-PR:** PR, der nur den Intent-Ordner auf den Factory-Zweig bringt. Danach ist der Planungs-Zweig kein Arbeitsort mehr (Briefing D5).
- **B-04 Handschritt frei:** ohne `done`, und eine Karte aus `when.after` ist gemergt; `afterIntent` und `before` sind ohne Wartebedingung frei. Entschieden 2026-10-24 (Michael): Briefing D3.
- **B-05 Erledigt:** `done: JJJJ-MM-TT` des Handschritts steht in `cards.yaml` auf dem Factory-Zweig (ADR-054 Nachtrag 5).

## 9. Erfolgskennzahlen

<!-- leser: mensch -->

| ID | Kennzahl | Zielwert | Messung vor Produktion | Messung im Betrieb | Reaktion bei Verfehlen |
|---|---|---|---|---|---|
| EK-01 | Git-Befehle, die die Person zwischen Plan-Freigabe und Karten am Board selbst tippt | 0 | E2E an einem Zielprojekt mit Factory | nächste drei geschnittenen Pläne | Michael meldet; Lücke wird Befund im Plan §14 bzw. neues Vorhaben |
| EK-02 | Factory-Karten, deren Arbeit `/build` selbst baut | 0 (Kontrollfall: Plan ohne Schnitt baut voll) | E2E | nächste drei geschnittenen Pläne | Workflow-Fix als Bugfix-Vorhaben |

## 10. Auslieferung, Betrieb, Zeitbudget

<!-- leser: mensch -->

- **Freigabe Produktion:** Michael (Merge des PR nach `main`).
- **Stufen:** auf einmal; Projekte bekommen es mit dem nächsten Update-Lauf.
- **Rückzug:** Revert-PR; ohne Factory-Schnitt ist das Verhalten unverändert (AK-12).
- **Betrieb:** Michael.
- **Zeitbudget:** 3 Tage ab Spec-Freigabe; danach Stopp und Rückfrage, keine stillschweigende Verlängerung.

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
| ER-09 | stopp | Merge, Push auf einen fremden Zweig oder `create-cards --apply` im E2E ohne Bestätigung im Lauf. |

## 12. Annahmen

<!-- leser: mensch -->

- **AN-01:** `create-cards` liefert Exit 0/1/2 und lesbare Gründe je ausgelassener Karte; Specwright zeigt sie unverändert. Prüfung: `/spec` liest den Factory-Code (`create-cards`, `card-creation`), vor Spec-Freigabe.
- **AN-02:** Ein Handschritt-PR und ein Factory-Entwurf ändern nur bei falsch geschnittenem `before`/`after` dieselbe Datei; dann gibt es einen normalen Merge-Konflikt. Prüfung: Michael im ersten E2E.
- **AN-03:** Ein Plan liegt auf dem Factory-Zweig, bevor sein Code dort liegt; das ist gewollt, `umgesetzt` kommt erst mit AK-11. Prüfung: Michael, bestätigt im Briefing 2026-10-24.
- **AN-04:** Ein E2E-Lauf an einem echten Zielprojekt mit Factory ist möglich, ohne fremde Arbeit zu stören (Übungs-Board oder Probe-Projekt). Prüfung: `/plan` §10, vor dem Bau.

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.1.0 | 2026-10-24 | AK-02 erweitert: Plan-PR darf neue Entscheidungsnotizen enthalten, die eine Karte nennt (sonst lässt die Factory die Karte aus, Regel EP-07); Spec-Annahme AN-S01, bestätigt mit der Spec-Freigabe | AK-02 | Michael (Produktverantwortung), 2026-10-24 |
| 1.0.0 | 2026-10-24 | Freigabe; OF-01 und OF-02 nach Vorschlag entschieden. Abgleich Mensch/Agent: ohne Befund (Z-01 bis Z-04 je durch AK gedeckt, Endzustand nennt AK-01 bis AK-12, RB-04 deckt die Einschränkung von INT-2026-024 durch AK-11) | OF-01, OF-02 | Michael (Produktverantwortung), 2026-10-24 |
| 0.1.0 | 2026-10-24 | Entwurf aus Briefing D2–D8 und Rückfragen (umgesetzt per `/build` nach Bestätigung, UI-Abgleich Nicht-Ziel, mittel/M, Merge-Regel für alle PRs) | alle | — |
