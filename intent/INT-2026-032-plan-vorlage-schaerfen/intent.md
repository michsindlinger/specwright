---
intent_id: "INT-2026-032"  
format: "1.0"  
titel: "Plan-Vorlage schärfen: Nahtstelle, erste Scheibe, Größenmaß, 2x-Regel"  
status: "angenommen"  
version: "1.0.0"  
freigabe:  
  von: "Michael (Produktverantwortung)"  
  am: "2026-10-06"  
autor: "Michael Sindlinger"  
verantwortlich: "Michael (Produktverantwortung)"  
erstellt: "2026-10-06"  
geaendert: "2026-10-06"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Größe S: nur Vorlagen- und Workflow-Text (Plan-Vorlage §6/§7/§8/§11/§13, Workflows plan und build, CLAUDE-Vorlage), Formatnummer 2.0, CHANGELOG; Zuschnitt im Gespräch entschieden."  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: ""  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: ["vorlagen", "plan-vorlage", "formatversion", "software-factory", "tests", "zerlegung"]  

---

# Absicht: Plan-Vorlage schärfen: Nahtstelle, erste Scheibe, Größenmaß, 2x-Regel

<!-- Ablage: intent/INT-2026-032-plan-vorlage-schaerfen/intent.md -->

<!-- Herkunft: Briefing ~/Entwicklung/software-factory/docs/briefings/2026-10-06-specwright-vorlagen-format.md, Befunde 1–5 (Befund 6 = INT-2026-031, PR #104, Format 1.0). Software Factory ADR-010 (Formate aus Specwright), ADR-009 (Review zitiert Regeln mit Nummer), Issue software-factory#28. Zeilenangaben des Briefings sind seit INT-2026-031 um eine Zeile verschoben; unten der Stand nach Merge 1f9f4e7. -->

## Felder im Kopf

<!-- leser: agent -->

| Feld | Bedeutung | Werte |
|---|---|---|
| `intent_id` | stabile Kennung, nie wiederverwenden | `INT-JJJJ-NNN` |
| `titel` | 5 bis 80 Zeichen | — |
| `status` | Lebenszyklus | `entwurf` · `in_klaerung` · `angenommen` · `umgesetzt` · `abgeloest` · `verworfen` |
| `format` | Formatversion der Vorlage, aus der die Datei entstand; nie von Hand setzen oder erhöhen; Regel: `specwright/templates/sdlc/README.md`, Abschnitt „Formatversion" | `"1.0"` |
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

- **Zweck:** Die Plan-Vorlage lässt heute offen, wo getestet wird, ob zuerst eine durchgehende Scheibe gebaut wird und wie groß ein Plan höchstens sein darf; genau davon hängt die Qualität des Agenten-Codes ab, in allen Projekten mit Specwright und in der Software Factory, die das Format übernimmt.
- **Kernaufgaben:** Test-Nahtstellen vor dem ersten Test festlegen; erster Bauschritt als dünne Scheibe durch alle Schichten; Größenmaß mit Teilungsvorschlag und Teilung nach Scheiben statt Dateien; 2x-Regel zuerst zur Prüfung, dann zur Architekturregel, zuletzt zu `CLAUDE.md`.
- **Endzustand:** Ein neuer Plan erfüllt AK-01 bis AK-06; die Vorlagen tragen Format 2.0 und die Factory sieht die Änderung im CHANGELOG (AK-07, AK-08); bestehende Pläne bleiben gültig (AK-09).

## 1. Problem und Anlass

<!-- leser: mensch -->

Die Testtabelle der Plan-Vorlage nennt je Kriterium Test, Datei und Art, aber nicht die Stelle, an der das Verhalten beobachtet wird, und keine Regel zu Mocks [Q: specwright/templates/sdlc/vorhaben/plan-template.md:149-151]; gut ist schon „Bugfix: Test zuerst" mit Hook [Q: plan-template.md:156]. Die Reihenfolge verlangt je Schritt einen prüfbaren Zustand, erlaubt aber Schichtbau (erst Daten, dann API, dann Oberfläche) [Q: plan-template.md:107-117]. Variante B der Zerlegung teilt nach disjunkten Dateimengen, also horizontal [Q: plan-template.md:124, :136]. Ein Größenmaß fehlt: Der Workflow sagt „eine Sitzung setzt ihn ganz um", §11 schätzt nur Zeit, erst der Build bremst bei ~200k Kontext [Q: specwright/workflows/core/plan.md:13, plan-template.md:183, specwright/workflows/core/build.md:13]. Die 2x-Regel führt zu einer `CLAUDE.md`-Zeile und fragt nur nebenbei nach einem Hook [Q: build.md:92, plan-template.md:211, specwright/templates/sdlc/projekt/CLAUDE-template.md:55]; `CLAUDE.md` lädt in jede Sitzung und kostet bei jeder Aufgabe Aufmerksamkeit. Anlass: Die Factory übernimmt das Plan-Format (ADR-010) und fixiert seit INT-2026-031 die Formatnummer; diese Schärfung ist die erste Formatänderung danach [Q: Briefing 2026-10-06; Michael, 2026-10-06].

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael und jeder Agent, der mit `/plan` plant | Pläne nennen Nahtstellen, eine erste Scheibe und eine Kontext-Schätzung; zu große Pläne bekommen einen Teilungsvorschlag |
| Agent im `/build` | 2x-Regel schlägt zuerst Prüfung, dann Architekturregel vor |
| Projekte mit Specwright | neue Vorlagen beim nächsten Update; bestehende Pläne unverändert |
| Software Factory | Format springt auf 2.0, Eintrag unter `### Format` im CHANGELOG |
| Systeme | Vorlagen unter `specwright/templates/sdlc/`, Workflows `plan`/`build`, CHANGELOG, Formatprüfung in `verify`; Web-UI nur lesend |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Tests eines Plans prüfen Verhalten an einer bewusst gewählten öffentlichen Stelle, nicht die eigene Umsetzung.
- **Z-02:** Der Bau führt früh einen durchgehenden Pfad vor, statt Schicht für Schicht fertigzustellen.
- **Z-03:** Ein Plan passt in einen Zug; was nicht passt, wird vor der Freigabe in vorführbare Scheiben geteilt.
- **Z-04:** Wiederholte Fehler landen dort, wo sie am wenigsten kosten: zuerst in einer automatischen Prüfung.
- **Z-05:** Die Factory erkennt die Formatänderung, ohne Specwright-Versionen nachzuvollziehen; alte Pläne bleiben gültig.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Keine inhaltliche Änderung an `spec-template.md` und `intent-template.md`; dort ändert sich nur die Formatnummer.
- **NZ-02:** Kein eigener TDD-Skill, keine Übernahme von Pococks Skill-Satz.
- **NZ-03:** Keine Anpassung der Software Factory; das läuft dort.
- **NZ-04:** Keine Migration bestehender `plan.md`, auch nicht in laufenden Vorhaben.
- **NZ-05:** Keine Werkzeug-Messung von Tokens; die Kontext-Schätzung bleibt ein begründetes Urteil im Plan.
- **NZ-06:** Bestehende Zeilen unter „Fehler, die Claude hier schon zweimal gemacht hat" in `CLAUDE.md`-Dateien werden nicht umsortiert.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Die Plan-Vorlage MUSS je Abnahmekriterium eine Test-Nahtstelle mit Begründung verlangen, festgelegt vor dem ersten Test, nach der Regel: bestehende vor neuer, die höchste mögliche, möglichst genau eine. | Z-01 | Review |
| AK-02 | Die Plan-Vorlage MUSS Mocks auf Systemgrenzen (externe Dienste, Zeit, Zufall) beschränken und Tests ausschließen, deren Erwartungswert so berechnet wird wie im Code. | Z-01 | Review |
| AK-03 | Die Plan-Vorlage MUSS als ersten Bauschritt nach der Vorprüfung eine dünne Scheibe durch alle betroffenen Schichten verlangen, die allein vorführbar ist. | Z-02 | Review |
| AK-04 | Wenn die Kontext-Schätzung für den Bau eines Plans 120k Tokens übersteigt, MUSS `/plan` vor der Freigabe eine Teilung in mehrere Vorhaben vorschlagen. | Z-03 | Stichprobe |
| AK-05 | Wenn ein Plan zerlegt wird (Variante B), MUSS jeder Teil ein durchgehender, allein vorführbarer Pfad durch die betroffenen Schichten sein; die Integration bleibt in der Hauptsitzung. | Z-03 | Review |
| AK-06 | Wenn im Build ein Fehler zum zweiten Mal auftritt, MUSS der Ablauf in dieser Reihenfolge vorschlagen: automatische Prüfung (Hook, Lint, Test); sonst eine nummerierte Regel in `docs/architecture.md`; eine `CLAUDE.md`-Zeile nur, wenn der Punkt nicht aus dem Code ablesbar ist und für jede Aufgabe gilt. | Z-04 | Review |
| AK-07 | Die drei Vorhaben-Vorlagen MÜSSEN die Formatnummer 2.0 tragen. | Z-05 | Test |
| AK-08 | Das Änderungsprotokoll (CHANGELOG) MUSS die Änderung unter `### Format` als Wechsel der Hauptnummer mit den neuen Pflichtinhalten führen. | Z-05 | Review |
| AK-09 | Pläne ohne Formatangabe oder mit Format 1.0 MÜSSEN von Web-UI und Prüfungen weiterhin unverändert gelesen werden. | Z-05 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | Eine gemeinsame Formatnummer für alle drei Vorlagen; Hauptnummer steigt bei neuem Pflichtinhalt oder geänderter Bedeutung. Grund: Regel aus INT-2026-031. | `specwright/templates/sdlc/README.md`, Abschnitt „Formatversion"; `scripts/check-vorlagen-format.sh` |
| RB-02 | Technik | Jede Überschrift der Plan-Vorlage trägt einen Leser-Marker laut Soll-Tabelle. Grund: Guard in `verify`. | `scripts/check-leser-marker.sh` (`SOLL_PLAN`), R1 |
| RB-03 | Technik | Die `> **Status:**`-Zeile und der Kopf der Plan-Vorlage bleiben in ihrer Form. Grund: Web-UI liest sie. | `ui/src/server/services/vorhaben-reader.ts` (`parseStatusLine`) |
| RB-04 | Betrieb | Ausgelieferte Vorlagen ändern sich → Versionssprung, Update-Weg über Manifest. | `CLAUDE.md` „Lieferumfang", AR-01 |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | *entschieden 2026-10-06 (Michael)*: Größenmaß ist eine Kontext-Schätzung für den Bau mit Grenze ~120k Tokens; darüber Teilungsvorschlag. Abstand zum Build-Deckel 200k bleibt Puffer. → AK-04, NZ-05 | nein | Michael | 2026-10-06 |
| OF-02 | *entschieden 2026-10-06 (Michael)*: Variante B bleibt, schneidet aber nach Scheiben statt nach Dateimengen; Worktrees und Integration in der Hauptsitzung bleiben. → AK-05 | nein | Michael | 2026-10-06 |
| OF-03 | *entschieden 2026-10-06 (Michael)*: Urteilsfragen aus der 2x-Regel werden eine nummerierte Regel in `docs/architecture.md` (AR-nn oder AP-nn), weil ein Review Regeln mit Nummer zitiert (Factory ADR-009). → AK-06 | nein | Michael | 2026-10-06 |
| OF-04 | *entschieden 2026-10-06 (Michael)*: Formatnummer 2.0 (neue Pflichtinhalte, neue Bedeutung von Variante B). → AK-07, AK-08 | nein | Michael | 2026-10-06 |
| OF-05 | *entschieden 2026-10-06 (Michael, mit Freigabe 1.0.0)*: Specwright-Version 4.3.0; nur Vorlagentext ändert sich, Bestandsprojekte brechen nicht, den Bruch für maschinelle Leser trägt die Formatnummer 2.0. → RB-04, AK-07 | nein | Michael | 2026-10-06 |

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-10-06 | Freigabe; OF-05 entschieden (4.3.0). Abgleich Mensch/Agent: ohne Befund (Z-01–Z-05 je durch AK gedeckt, bypass passt zu Größe S, keine Vertragsschicht bei Risikoklasse niedrig) | OF-05 | Michael (Produktverantwortung), 2026-10-06 („Freigabe, O1 ok mit 4.3.0", Chat) |
| 0.1.0 | 2026-10-06 | Entwurf aus Briefing (Befunde 1–5) und Gespräch (OF-01 bis OF-04 entschieden) | alle | — |
