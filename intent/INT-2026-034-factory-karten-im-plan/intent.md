---
intent_id: "INT-2026-034"  
format: "2.1"  
titel: "Plan schneidet Karten für eine Software Factory und Handschritte"  
status: "angenommen"  
version: "1.0.0"  
freigabe:  
  von: "Michael (Produktverantwortung)"  
  am: "2026-10-23"  
autor: "Michael Sindlinger"  
verantwortlich: "Michael (Produktverantwortung)"  
erstellt: "2026-10-23"  
geaendert: "2026-10-23"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Plan und Entscheidungen liegen im Vorhaben INT-2026-076 des Projekts software-factory (Teil 6, PR 2), dort am 2026-10-23 freigegeben; hier nur Workflow-Text, Vorlage, Guard, ADR und Lieferumfang."  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: ""  
  board_karte: ""  
  adr: ["docs/adr/0008-plan-ruft-eingangspruefung.md"]  
  ersetzt: ""  
schlagworte: ["plan", "software-factory", "karten", "handschritte", "abdeckung"]  

---

# Absicht: Plan schneidet Karten für eine Software Factory und Handschritte

<!-- Ablage: intent/INT-2026-034-factory-karten-im-plan/intent.md -->

<!-- Herkunft: Vorhaben INT-2026-076 im Projekt software-factory (Teil 6 von „Factory ready“), Entscheidungen D6.1 bis D6.9 dort am 2026-10-23 angenommen. Die Factory-Seite (Kartendatei Format 2, Abdeckung, JSON) ist dort mit PR 1 gemergt. -->

## Felder im Kopf

<!-- leser: agent -->

| Feld | Bedeutung | Werte |
|---|---|---|
| `intent_id` | stabile Kennung, nie wiederverwenden | `INT-JJJJ-NNN` |
| `status` | Lebenszyklus | `entwurf` · `in_klaerung` · `angenommen` · `umgesetzt` · `abgeloest` · `verworfen` |
| `format` | Formatversion der Vorlage; Regel: `specwright/templates/sdlc/README.md`, Abschnitt „Formatversion" | `"2.1"` |
| `bypass` | `ja`: direkt zur Umsetzung; Plan liegt im Vorhaben der Factory (siehe `bypass_grund`) | `ja` |

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Wer mit `/plan` ein Vorhaben in einem Projekt mit Software Factory plant, sieht vor dem Bau, welche Arbeit die Factory übernehmen kann und welche ein Mensch erledigen muss, und warum.
- **Kernaufgaben:** Der Workflow `plan` schreibt eine Kartendatei mit Karten und Handschritten, lässt jede Karte von der Eingangsprüfung der Factory einstufen, schneidet nicht ready Karten höchstens zweimal neu und übernimmt Einstufung und Abdeckung in den Plan; `--karten` macht das für einen schon freigegebenen Plan.
- **Endzustand:** AK-01 bis AK-07 erfüllt; ohne Factory ändert sich für ein Projekt nichts außer einem Satz im Plan.

## 1. Problem und Anlass

<!-- leser: mensch -->

Ein Plan mischt heute Arbeit für eine Factory mit Arbeit für Menschen, ohne sie zu trennen [Q: specwright/workflows/core/plan.md 1.4, Step 9a]. Die Factory hat eine Eingangsprüfung für Kartendateien, aber kein Plan schreibt eine. Specwright soll diese Prüfung benutzen und keine eigene Fassung der Regeln führen (ADR-0008).

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Wer `/plan` in einem Projekt mit Software Factory startet | neuer Unterabschnitt „Karten für die Factory“ in §7 mit Einstufung, Handschritten, Abdeckung; `cards.yaml` im Vorhaben-Ordner |
| Projekte ohne Factory | ein Satz im Plan, sonst nichts |
| Leser der Vorlagen (Software Factory) | Format 2.1, optionaler Unterabschnitt, Hauptnummer unverändert |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Planer und Factory stufen nach denselben Regeln ein.
- **Z-02:** Der Plan zeigt vor dem Bau, wie viel des Vorhabens bei der Factory landet.
- **Z-03:** Bestehende Pläne lassen sich nachträglich schneiden.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Keine Prüfregel der Factory in Specwright, keine eigene Rechnung der Abdeckung.
- **NZ-02:** Kein Anlegen von Karten am Board aus Specwright; das bleibt Sache der Factory.
- **NZ-03:** Keine Änderung an der Web-UI.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn eine Software Factory eingerichtet und die Betriebsdatei bestätigt ist, MUSS `/plan` nach dem Entwurf eine Kartendatei in Format 2 schreiben und jede Karte von der Eingangsprüfung der Factory einstufen lassen. | Z-01 | Stichprobe (E2E) |
| AK-02 | Einstufung, Gründe, Hinweise und Abdeckung MÜSSEN im Plan so stehen, wie die Eingangsprüfung sie meldet; der Workflow DARF keine Prüfregel enthalten. | Z-01, Z-02 | Review |
| AK-03 | Ohne eingerichtete Factory oder ohne Betriebsdatei MUSS der Plan einen Satz mit dem Grund schreiben und ohne Kartendatei weiterlaufen. | Z-02 | Stichprobe (E2E, Kontrollfall) |
| AK-04 | Eine nicht ready Karte DARF höchstens zweimal neu geschnitten werden; danach MUSS ihre Arbeit ein Handschritt mit den Gründen der Prüfung sein. | Z-02 | Review |
| AK-05 | `/plan INT-… --karten` MUSS einen freigegebenen Plan schneiden, ohne ihn neu zu planen; sein Status bleibt. | Z-03 | Stichprobe (E2E) |
| AK-06 | Meldet die Prüfung ein anderes Format als 2, MUSS der Schnitt mit Meldung abbrechen. | Z-01 | Review |
| AK-07 | Die drei Vorhaben-Vorlagen MÜSSEN Format 2.1 tragen, die Plan-Vorlage den optionalen Unterabschnitt mit Marker; `verify` MUSS grün sein. | Z-02 | Test (Guard) |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Sicherheit | Repo ist öffentlich: keine Pfade, Hosts, Projektnamen oder Interna der Factory außer Aufruf und Format. | `docs/security.md` |
| RB-02 | Technik | Die Kartendatei liegt im Vorhaben-Ordner im Repo-Root. | `docs/architecture.md` AR-07 |
| RB-03 | Betrieb | Vorlage ändert sich → Formatregel, Versionssprung (`VERSION` = `FRAMEWORK_VERSION`), CHANGELOG `### Format`. | `CLAUDE.md` „Lieferumfang", `templates/sdlc/README.md` |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | *entschieden 2026-10-23 (Michael)*: Form, Aufruf, Neuschnitt-Grenze und Modus `--karten` wie im Vorhaben der Factory (D6.1 bis D6.9). | nein | Michael | 2026-10-23 |

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-10-23 | Angenommen mit dem Plan des Factory-Vorhabens (Teil 6, PR 2) | OF-01 | Michael (Produktverantwortung), 2026-10-23 |
