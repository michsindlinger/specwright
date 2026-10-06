---
intent_id: "INT-2026-033"  
format: "2.0"  
titel: "Vorgemerkte Kennungen: next-intent-id.sh liest intent/RESERVIERT"  
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
bypass_grund: "Bugfix (Issue #107), Größe S: ein Skript, sein Test, ein Workflow-Satz, README-Zeile, CHANGELOG; Lösungsweg im Gespräch entschieden (Reservierungsdatei)."  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: ["kennung", "next-intent-id", "reservierung", "software-factory"]  

---

# Absicht: Vorgemerkte Kennungen: next-intent-id.sh liest intent/RESERVIERT

<!-- Ablage: intent/INT-2026-033-reservierte-kennungen/intent.md -->

<!-- Herkunft: Issue michsindlinger/specwright#107 (2026-10-06), Beobachtung im Projekt software-factory (Issue software-factory#23, specwright/product/roadmap.md:24 dort). Entscheidung im Chat 2026-10-06: Lösungsidee 1 (Reservierungsdatei), Bypass. -->

## Felder im Kopf

<!-- leser: agent -->

| Feld | Bedeutung | Werte |
|---|---|---|
| `intent_id` | stabile Kennung, nie wiederverwenden | `INT-JJJJ-NNN` |
| `titel` | 5 bis 80 Zeichen | — |
| `status` | Lebenszyklus | `entwurf` · `in_klaerung` · `angenommen` · `umgesetzt` · `abgeloest` · `verworfen` |
| `format` | Formatversion der Vorlage, aus der die Datei entstand; nie von Hand setzen oder erhöhen; Regel: `specwright/templates/sdlc/README.md`, Abschnitt „Formatversion" | `"2.0"` |
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

- **Zweck:** Eine Vorhaben-Nummer, die schon in einer Roadmap oder einem Issue vergeben ist, aber noch keinen Ordner hat, darf `/intent` nicht ein zweites Mal vergeben; heute passiert genau das, und beim späteren Start des vorgemerkten Vorhabens muss die Nummer von Hand gesetzt werden.
- **Kernaufgaben:** Eine Datei `intent/RESERVIERT` hält vorgemerkte Nummern mit Kurzname; das Skript zählt sie mit, kann selbst vormerken und übernimmt beim Start eines vorgemerkten Vorhabens dessen Nummer.
- **Endzustand:** AK-01 bis AK-05 sind erfüllt und getestet; Workflow `/intent` und Vorlagen-README beschreiben den Weg.

## 1. Problem und Anlass

<!-- leser: mensch -->

`next-intent-id.sh` sammelt Kandidaten nur aus Ordnernamen unter `intent/` der eigenen Kopie, aller Worktrees und aller Zweige [Q: specwright/scripts/next-intent-id.sh:72-84] und vergibt die höchste Nummer + 1 [Q: next-intent-id.sh:86-91]. `--reserve` legt nur einen Ordner an [Q: next-intent-id.sh:98-129]. Im Projekt software-factory stand `INT-2026-001` am 2026-10-06 im Titel von Issue #23 und in der Roadmap, ohne Ordner; `/intent` für ein anderes Vorhaben schlug trotzdem `INT-2026-001` vor, die Nummer wurde von Hand korrigiert; für #23 würde das Skript jetzt `INT-2026-003` vergeben [Q: Issue #107]. Ein Volltext-Grep über das Repo scheidet aus, weil die Specwright-Kopie im Projekt eigene Kennungen zitiert [Q: Issue #107, specwright/workflows/core/intent.md:15].

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael und jeder Agent, der `/intent` startet | vorgemerkte Nummern werden übersprungen; ein vorgemerktes Vorhaben bekommt seine Nummer automatisch |
| Wer eine Nummer vorab nennt (Roadmap, Issue) | merkt sie mit einem Aufruf vor, statt nur Text zu schreiben |
| Projekte mit Specwright | neues Skript beim nächsten Update; ohne `intent/RESERVIERT` verhält sich alles wie bisher |
| Web-UI | keine Änderung; die Vorhaben-Liste ignoriert Dateien unter `intent/`, die kein Vorhaben-Ordner sind |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Keine Nummer wird doppelt vergeben, auch wenn sie nur vorgemerkt ist.
- **Z-02:** Ein vorgemerktes Vorhaben startet ohne Handarbeit unter seiner Nummer.
- **Z-03:** Vormerken ist ein Befehl, keine Handregel.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Kein Mitlesen von GitHub-Issues und kein Grep über Roadmap oder `docs/` (Lösungsideen 3 und 4 aus #107).
- **NZ-02:** Keine Pflicht, Roadmap-Nummern vorzumerken; `plan-product` und die Roadmap-Vorlage vergeben heute keine Kennungen und bleiben unverändert.
- **NZ-03:** Keine Änderung an der Web-UI.
- **NZ-04:** Bestehende Vormerkungen in anderen Projekten (software-factory) werden nicht von hier aus nachgetragen.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn eine Kennung als erstes Feld einer Zeile in `intent/RESERVIERT` der eigenen Kopie, eines Worktrees oder eines Zweigs steht, MUSS `next-intent-id.sh` sie bei der Vergabe als belegt zählen. | Z-01 | Test |
| AK-02 | Kennungen in Kommentaren (`#`) oder an anderer Stelle einer Zeile von `intent/RESERVIERT` DÜRFEN NICHT zählen. | Z-01 | Test |
| AK-03 | `next-intent-id.sh --hold <kurzname>` MUSS die nächste freie Kennung mit dem Kurznamen in `intent/RESERVIERT` eintragen und ausgeben; steht der Kurzname dort schon, MUSS es die vorhandene Kennung ausgeben, ohne einzutragen. | Z-03 | Test |
| AK-04 | Wenn `--reserve <kurzname>` einen Kurznamen bekommt, der in `intent/RESERVIERT` der eigenen Kopie steht, MUSS das Skript dessen Kennung für den Ordner verwenden und die Zeile aus der Datei entfernen. | Z-02 | Test |
| AK-05 | Ohne `intent/RESERVIERT` MUSS das Skript sich wie bisher verhalten (T1–T7 grün). | Z-01 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | Bash 3.2: kein `mapfile`, keine assoziativen Arrays. | `CLAUDE.md` „Installer"; Kopf von `next-intent-id.sh` |
| RB-02 | Technik | Vorhaben liegen im Repo-Root unter `intent/`; die Datei gehört zum Projekt, nicht zum Werkzeug. | `docs/architecture.md` AR-07 |
| RB-03 | Betrieb | Ausgeliefertes Skript ändert sich → Versionssprung (`VERSION` = `FRAMEWORK_VERSION`), CHANGELOG. | `CLAUDE.md` „Lieferumfang" |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | *entschieden 2026-10-06 (Michael)*: Lösungsweg Reservierungsdatei `intent/RESERVIERT` (Issue-Idee 1), als Bugfix-Bypass. | nein | Michael | 2026-10-06 |

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-10-06 | Angenommen mit der Wahl von Weg D1 im Chat („ja, mach O1 mit D1") | OF-01 | Michael (Produktverantwortung), 2026-10-06 (Chat) |
