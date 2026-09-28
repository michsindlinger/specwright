---
intent_id: "INT-2026-027"  
titel: "UI: Anruf — Leitung bleibt nach dem Senden offen"  
status: "angenommen"  
version: "1.0.0"  
autor: "Michael Sindlinger (Wunsch aus dem Gebrauch, 28.09.2026, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-28"  
geaendert: "2026-09-28"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Größe S: eine Erweiterung der Anruf-Zustandstabelle und des Anruf-Kastens; Wunsch der Person: Absicht, dann Plan."  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: ""  
  board_karte: ""  
  adr: []  
  ersetzt: "INT-2026-026 teilweise: spec.md FA-18 (Auflegen nach „Gesendet“)"  
schlagworte: [ui, sprache, anruf, freihaendig, leitung]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — im Chat: „freigabe, alle OF -> ok\", 28.09."  
  am: "2026-09-28"  

---

# Absicht: UI: Anruf — Leitung bleibt nach dem Senden offen

<!-- Ablage: intent/INT-2026-027-anruf-leitung-offen/intent.md -->

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

- **Zweck:** Ein Gespräch mit einer Sitzung soll über mehrere Runden laufen, ohne dass Michael nach jeder Antwort neu annehmen muss.
- **Kernaufgaben:** (1) Nach „Gesendet" bleibt die Leitung 2 Minuten offen, das Mikrofon ist zu. (2) Meldet sich dieselbe Sitzung in der Zeit, liest die UI ohne Klingeln vor und hört danach zu. (3) Andere Sitzungen klingeln während der offenen Leitung nicht. (4) Nach 2 Minuten ohne neue Meldung legt die UI von selbst auf.
- **Endzustand:** AK-01 bis AK-11 sind erfüllt; ohne Anrufmodus ändert sich nichts.

## 1. Problem und Anlass

<!-- leser: mensch -->

Seit INT-2026-026 (PR #96, gemergt am 28.09.) legt der Anruf nach „Gesendet" auf [Q: `intent/INT-2026-026-anruf-freihaendig/spec.md:93` FA-18]. Ist die Sitzung kurz danach fertig oder fragt nach, klingelt es neu, und Michael muss wieder annehmen, obwohl er noch im Gespräch ist [Q: Michael, Chat 28.09.].

Im Code gefunden:

- Nach erfolgreichem Senden geht der Anruf-Zustand im Backend auf „Ruhe" und lässt sofort die nächste wartende Meldung klingeln [Q: `ui/src/server/services/anruf-zustand.ts:285-293`, `anruf-service.ts:634-656`]. Das kann eine andere Sitzung sein, die dann mitten ins Gespräch klingelt.
- Meldet sich dieselbe Sitzung, während noch gesendet wird, wird ihre neue Meldung eingereiht und klingelt nach „Gesendet" ganz normal [Q: `anruf-zustand.ts:143-146`]. Meldet sie sich danach, klingelt sie ebenfalls ganz normal [Q: `anruf-zustand.ts:160-163`].
- Die UI beendet den eigenen Anruf beim Ergebnis „Gesendet" und sagt „Gesendet" [Q: `ui/frontend/src/services/anruf.service.ts:576-582`]. Einen Zustand „Leitung offen, wartet" gibt es weder im Backend noch im Kasten.

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael am Mac, Anrufmodus an | Nach „Gesendet" bleibt der Kasten offen; die nächste Meldung derselben Sitzung kommt ohne Annehmen. Andere Sitzungen warten bis zum Auflegen. Anrufmodus aus: nichts ändert sich. |
| Andere laufende Sitzungen | Ihre Meldungen klingeln bis zu 2 Minuten später; in der Glocke stehen sie sofort. |
| Systeme | Anruf-Zustand im Backend (neuer Zustand, Frist von 2 Minuten), Anruf-Kasten und Anruf-Dienst im Browser; Docs: `design.md` (Anruf-Muster), INT-2026-026 FA-18 als geändert markiert |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Michael führt mehrere Runden mit derselben Sitzung, ohne zwischen den Runden anzunehmen.
- **Z-02:** Während eines Gesprächs klingelt keine andere Sitzung dazwischen, und keine Meldung geht verloren.
- **Z-03:** Die offene Leitung hört nicht mit und bleibt nicht unbegrenzt offen.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Mikrofon während der offenen Leitung. Michael kann in der Wartezeit nichts sagen; „Auflegen" geht nur per Knopf oder Taste (schränkt INT-2026-026 NZ-01 nicht weiter ein, das Mikrofon bleibt an die Antwort auf eine Meldung gebunden).
- **NZ-02:** Einstellbare Dauer. Die 2 Minuten sind fest.
- **NZ-03:** Leitung offen nach Auflegen, Ablehnen, „Später" oder gescheitertem Senden. Nur ein erfolgreiches Senden öffnet die Leitung.
- **NZ-04:** Wechsel zu einer anderen Sitzung aus der offenen Leitung heraus.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn eine Antwort in einem Anruf erfolgreich gesendet ist, MUSS die Leitung offen bleiben und der Kasten „Leitung offen — wartet auf [Sitzung] …" mit einem Knopf „Auflegen" zeigen. | Z-01 | Test |
| AK-02 | Solange die Leitung offen ist, DARF das Mikrofon NICHT hören. | Z-03 | Test |
| AK-03 | Wenn bei offener Leitung dieselbe Sitzung eine neue Meldung abgibt (fertig, Rückfrage, Plan), MUSS die UI sie ohne Klingeln und ohne Annehmen vorlesen und danach zuhören wie nach einem Annehmen. | Z-01 | Test |
| AK-04 | Wenn dieselbe Sitzung ihre neue Meldung abgibt, bevor „Gesendet" bestätigt ist, MUSS sie ebenfalls ohne Klingeln vorgelesen werden. | Z-01 | Test |
| AK-05 | Solange die Leitung offen ist, DARF eine Meldung einer anderen Sitzung NICHT klingeln; sie steht weiter in der Glocke. | Z-02 | Test |
| AK-06 | Wenn 2 Minuten nach dem letzten „Gesendet" keine neue Meldung derselben Sitzung da ist, MUSS die Leitung ohne Zutun enden, auch wenn die Sitzung noch arbeitet (OF-04). | Z-03 | Test |
| AK-07 | Wenn die Leitung endet (Auflegen oder Frist), MUSS die älteste wartende Meldung einer anderen Sitzung klingeln wie heute nach einem Anruf. | Z-02 | Test |
| AK-08 | Wenn das Fenster mit der offenen Leitung geschlossen wird oder der Anrufmodus ausgeht, MUSS die Leitung enden. | Z-03 | Test |
| AK-09 | Wenn in einer offenen Leitung erneut erfolgreich gesendet wird, MUSS die Leitung wieder für 2 Minuten offen bleiben, ohne Obergrenze an Runden (OF-01). | Z-01 | Test |
| AK-10 | Wenn die Leitung durch die Frist endet, MUSS die UI „Leitung geschlossen" sagen; endet sie per Knopf „Auflegen", sagt sie nichts (OF-02). | Z-03 | Test |
| AK-11 | Wenn bei offener Leitung eine neue Meldung derselben Sitzung kommt, MUSS die UI vor dem Vorlesen einen einzelnen kurzen Ton spielen (OF-03). | Z-01 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | Der Zustand der Leitung (offen, für welche Sitzung, bis wann) lebt im Backend, nicht im Browser. Grund: AR-05, und der Anruf-Zustand liegt dort schon. | `docs/architecture.md` AR-05, `ui/src/server/services/anruf-zustand.ts` |
| RB-02 | Datenschutz | Audio und erkannter Text nur im Arbeitsspeicher und nur bis Anrufende; die offene Leitung verlängert das nicht, weil das Mikrofon zu ist. | INT-2026-025 AK-17, `docs/security.md` |
| RB-03 | Technik | TypeScript strict, Präfix `aos-`; Anruf-Kasten bleibt Light DOM. | `CLAUDE.md` (Konventionen, Fehler zweimal) |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Neue Runde, neue Frist: Nach jedem weiteren „Gesendet" in derselben Leitung laufen wieder 2 Minuten, das Gespräch hat keine Obergrenze an Runden. | *entschieden 2026-09-28 (Product Owner)*: Vorschlag angenommen → AK-09 | Product Owner | erledigt |
| OF-02 | Ansage beim Ende durch Frist: kurz „Leitung geschlossen", damit Michael weiß, dass nichts mehr kommt. Beim Knopf „Auflegen" keine Ansage. | *entschieden 2026-09-28 (Product Owner)*: Vorschlag angenommen → AK-10 | Product Owner | erledigt |
| OF-03 | Signal vor dem Vorlesen: Kommt die neue Meldung bei offener Leitung, spielt die UI einen einzelnen kurzen Ton, dann liest sie vor — sonst beginnt die Stimme ohne Vorwarnung. | *entschieden 2026-09-28 (Product Owner)*: Vorschlag angenommen → AK-11 | Product Owner | erledigt |
| OF-04 | Sitzung arbeitet weiter ohne Meldung: Die Frist zählt stur 2 Minuten ab „Gesendet", auch wenn die Sitzung sichtbar noch arbeitet; keine Verlängerung nach Aktivität. | *entschieden 2026-09-28 (Product Owner)*: Vorschlag angenommen → AK-06 | Product Owner | erledigt |

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-28 | Freigabe durch den PO; OF-01 bis OF-04 mit Vorschlag entschieden (AK-09 bis AK-11 neu, AK-06 präzisiert). Abgleich Mensch/Agent: ohne Befund | alle | Product Owner, 2026-09-28 |
| 0.1.0 | 2026-09-28 | Entwurf aus Michaels Beschreibung vom 28.09.; Ist-Stand im Code belegt (Ruhe und nächstes Klingeln direkt nach Senden, Meldung derselben Sitzung wird eingereiht, kein Zustand „Leitung offen") | alle | — |

<!-- Definition of Ready (vor status "angenommen"):
     [x] Drei Sätze nennen Zweck, Kernaufgaben, Endzustand und versprechen nichts, was AK/RB/NZ einschränken.
     [x] Problem mit Beleg, Anlass genannt.
     [x] Jedes AK: EARS-Form, ein Modalverb, Ziel, Prüfart, beobachtbar statt Mechanismus.
     [x] Mindestens ein Nicht-Ziel. Jede RB mit Herkunft.
     [x] Keine offene Frage mit „Blockiert: ja".
     [x] Keine Projektregeln, die in CLAUDE.md gehören.
     [ ] Ab risikoklasse mittel: entfällt (niedrig).
     [x] `verantwortlich` hat angenommen, Commit dokumentiert die Annahme. -->
