---
intent_id: "INT-2026-014"  
titel: "UI: Glocken-Liste liegt vor dem angedockten Terminal"  
status: "umgesetzt"  
version: "1.1.0"  
autor: "Michael Sindlinger (Fund am 1 728-px-Mac, 17.09.2026, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-17"  
geaendert: "2026-09-17"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Bugfix, eine Stilzeile; Kern-Absicht direkt zu plan.md (CLAUDE.md Arbeitsweise)"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, terminal, glocke, kopfzeile, bugfix, phase-5]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — Vorschlag im Chat freigegeben („Bau das bitte direkt, ich gebe es frei"), 17.09."  
  am: "2026-09-17"  

---

# Absicht: UI: Glocken-Liste liegt vor dem angedockten Terminal

<!-- Ablage: intent/INT-2026-014-glocke-ueber-terminal/intent.md · Bypass: Kern-Absicht, Plan in plan.md · Befund-Screenshot in design/ -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Ist das Terminal auf der Vorhaben-Seite angedockt, erscheint die aufgeklappte Glocken-Liste hinter dem Terminal (Befund `design/befund-glocke.png`) — sie muss davor liegen.
- **Kernaufgaben:** Dem angedockten Terminal eine Stapelstufe unter der Kopfzeile geben (55 statt 1000); schwebend und im Vollbild bleibt es bei 1000, weil es dort die Kopfzeile abdecken soll.
- **Endzustand:** AK-01 erfüllt, Test hält die Regel fest, Screenshot bei 1 728 px in `design/ist/`, `verify: OK`, ein PR.

## 1. Problem und Anlass

<!-- leser: mensch -->

Seit INT-2026-011 beginnt das angedockte Terminal unter der Kopfzeile, damit die Glocke sichtbar bleibt. Die Kopfzeile ist `position: sticky` mit `z-index: 60` und bildet einen Stapelkontext; die Glocken-Liste (`z-index: 200`) liegt darin und zählt nach außen als 60. Das Terminal hat als Geschwister auf `aos-app`-Ebene `z-index: 1000` — angedockt wie schwebend. Schwebend deckt es die Kopfzeile ganz ab (fiel nicht auf); angedockt liegt die Liste dahinter.

## 3. Ziele

<!-- leser: mensch -->

- Z-01: Die aufgeklappte Glocken-Liste liegt bei angedocktem Terminal vollständig davor.
- Z-02: Schwebendes Terminal und Vollbild verhalten sich wie bisher (über der Kopfzeile).

## 4. Nicht-Ziele

<!-- leser: mensch -->

- NZ-01: Kein Umbau der Glocke (kein Portal, keine andere Position).
- NZ-02: Keine Änderung an der Kopfzeile oder an anderen Stapelstufen.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium (EARS) | Prüfart |
|---|---|---|
| AK-01 | WENN das Terminal angedockt und offen ist UND die Glocke geklickt wird, DANN MUSS die Glocken-Liste vor dem Terminal liegen (`elementFromPoint` in der Listenfläche trifft die Liste). | Unit (Stilregel) + E2E 1 728 px + Screenshot |
| AK-02 | WENN das Terminal schwebend oder im Vollbild ist, DANN MUSS es weiterhin über der Kopfzeile liegen (`z-index` 1000 unverändert). | Unit (Stilregel) |

## 6. Randbedingungen

<!-- leser: mensch -->

- RB-01: Hook `protect-tests`: Test zuerst rot, dann `.claude/fix-mode`, dann Code.
- RB-02: Keine Datei außerhalb von `aos-cloud-terminal-sidebar.ts`, dem Test, `docs/design.md` und diesem Ordner.

## 12. Annahmen

<!-- leser: mensch -->

- AN-01: Nichts mit Stapelstufe zwischen 55 und 1000 überlappt die angedockte Spalte: Dialoge (1002, 1100, 9999) sollen darüber liegen, die Datei-Seitenleiste (1000) ist eine bewusste Überlagerung, Git- und Modell-Dropdowns (100) liegen in der linken Spalte, die festen Leisten der Seite (50) enden an `--terminal-open-width`.

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-17 | Angenommen als Bypass; Ursache und Fix im Chat vorgelegt und freigegeben. Abgleich Mensch/Agent: ohne Befund | AK-01–AK-02 | PO, 17.09. (Chat) |
| 1.1.0 | 2026-09-17 | Umgesetzt: PR #69 gemergt `9a60228` (17.09., Merge von Michael beauftragt), CI `verify` grün; Stichprobe bestanden („sieht gut aus") | AK-01–AK-02 | PO, 17.09. (Chat) |
