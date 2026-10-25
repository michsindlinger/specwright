---
intent_id: "INT-2026-036"  
format: "2.1"  
titel: "Tracker statt Board für technischen Arbeitsstand"  
status: "entwurf"  
version: "0.1.0"  
autor: "Claude"  
verantwortlich: "Produktverantwortung"  
erstellt: "2026-10-25"  
geaendert: "2026-10-25"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Nur Texte in Vorlagen und Arbeitsanweisungen, unter 1 Tag."  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  tracker: ""  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: ["tracker", "board", "abschlussblock"]  

---

# Absicht: Tracker statt Board für technischen Arbeitsstand

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Technischer Arbeitsstand eines Vorhabens steht im Tracker des Projekts (GitHub Issues oder Trello), damit das Team ihn dort sieht; das Obsidian-Board trägt nur noch Internes.
- **Kernaufgaben:** Abschlussblock „Für das Board", Vorhaben-Kopf und Projektvorlage auf den Tracker umstellen; Projekte mit Fahrplan-Seite behalten je Vorhaben eine grobe Board-Karte.
- **Endzustand:** Ein Projekt, das aus den Vorlagen entsteht, enthält die Zeile `Tracker:` und keine Pflicht, technische Arbeit aufs Board zu legen (AK-01 bis AK-03).

## 1. Problem und Anlass

<!-- leser: mensch -->

Die Workflows `intent` und `build`, die Vorlagen und die Projektvorlage `CLAUDE-template.md` verlangen, den technischen Stand auf eine Board-Karte zu legen. Seit 25.10.2026 gilt global die Gegenregel: Technik gehört in den Tracker des Projekts, das Board nur für Internes. Neue Projekte erben sonst die alte Pflicht über die Vorlage.

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Person, die ein Vorhaben abschließt | Der Abschlussbericht nennt zuerst den Tracker-Eintrag, das Board nur bei Internem. |
| Neue Projekte | Die Projekt-`CLAUDE.md` enthält die Zeile `Tracker:`. |
| Systeme | Vorlagen, Workflows `intent` und `build`, Befehlsdateien, Anleitung der Vorlagen. |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Vorlagen und Workflows nennen den Tracker als Ort des technischen Arbeitsstands.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Kein Umzug bestehender Board-Karten; eine alte Karte zieht um, wenn jemand sie anfasst.
- **NZ-02:** Keine Änderung am Anlegen von Karten durch `plan` Step 10b (`create-cards`).
- **NZ-03:** Die Regel, am Ende von `/intent`, `/plan` und `/build` nicht nachzuziehen, bleibt.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Der Abschlussblock MUSS Projekt, Tracker-Eintrag, Zielstatus, Beleg, Stand-Zeile und Verweis auf den Vorhaben-Ordner in dieser Reihenfolge nennen. | Z-01 | Review |
| AK-02 | Die Vorlage der Projekt-`CLAUDE.md` MUSS eine Zeile `Tracker:` enthalten. | Z-01 | Stichprobe |
| AK-03 | Der Kopf von `intent.md` MUSS ein Feld `bezuege.tracker` anbieten. | Z-01 | Review |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Datenschutz | Das Repo ist öffentlich: keine Kundennamen, Aufwände oder Preise. | `docs/security.md` |

## 7. Offene Fragen

<!-- leser: mensch -->

Keine.

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 0.1.0 | 2026-10-25 | Entwurf | alle | — |
