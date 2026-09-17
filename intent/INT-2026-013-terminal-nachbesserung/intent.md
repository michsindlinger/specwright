---
intent_id: "INT-2026-013"  
titel: "UI: Nachbesserung Terminal neben dem Dokument — Liste ohne Überlauf, volle Breite, angedockt immer ein Fenster"  
status: "angenommen"  
version: "1.0.0"  
autor: "Michael Sindlinger (Test am 1 728-px-Mac, 17.09.2026, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-17"  
geaendert: "2026-09-17"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Bugfix nach Abnahme von INT-2026-011, unter einem Tag; Kern-Absicht direkt zu plan.md (CLAUDE.md Arbeitsweise)"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: ""  
  adr: ["docs/adr/0004-sitzung-zeigen-statt-nachlesen.md"]  
  ersetzt: ""  
schlagworte: [ui, terminal, vorhaben-seite, vorhaben-liste, bugfix, phase-5]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — Plan im Chat freigegeben nach externem Review (22 Findings adressiert), 17.09."  
  am: "2026-09-17"  

---

# Absicht: UI: Nachbesserung Terminal neben dem Dokument

<!-- Ablage: intent/INT-2026-013-terminal-nachbesserung/intent.md · Bypass: Kern-Absicht, Plan in plan.md · Screenshots des Tests in design/ -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Vier Befunde aus Michaels Test von INT-2026-011 (PR #65/#66) beheben: Texte laufen in der Vorhaben-Liste über den Rand, das Dokument wird bei geschlossenem Terminal nicht voll breit, das angedockte Terminal erscheint beim Betreten eines Vorhabens nicht sofort, und Cmd+D zeigt den falschen Tab oder eine geteilte Ansicht.
- **Kernaufgaben:** (1) Phasen-Notiz der Liste kürzen und in der Zeile begrenzen, Titel hat Vorrang; (2) Breitengrenzen der Vorhaben-Ansicht und des Dokument-Lesers entfernen — alles 100 % (PO-Entscheidung 17.09.); (3) Seite meldet ihre Sitzung bei jedem Betreten, die App gleicht Andocken, Öffnen und Tab in einer Funktion ab, Cmd+D öffnet auf dem Seiten-Tab, Projektwechsel wird bis zu dreimal wiederholt; (4) angedockt immer ein Fenster: gespeicherte Aufteilung wird nicht angewendet und nicht gelöscht, Umschalter ausgeblendet, kein Vollbild durch `quad-4`, kein Remount.
- **Endzustand:** AK-01 bis AK-04 erfüllt, Screenshots bei 1 728 px in `design/ist/`, `verify: OK`, ein PR; `plan.md` §14 führt Abweichungen.

## 1. Problem und Anlass

<!-- leser: mensch -->

Michael hat die gemergte Stufe 1 + 2 von INT-2026-011 am 17.09. auf seinem 1 728-px-Mac getestet (Screenshots `design/befund-1-liste.png`, `design/befund-2-breite.png`) und vier Befunde gemeldet. Ursachen laut Plan §2: die Phasen-Notiz übernimmt den ganzen Rest der `> **Status:**`-Zeile aus `plan.md` und die Listenzeile begrenzt sie nicht (`vorhaben-reader.ts:86-96`, `aos-vorhaben-zeile.ts:22,67-85`); `.vorhaben-view { max-width: 1180px }` und `.markdown-body { max-width: 900px }` stammen aus INT-004; das Seiten-Ereignis feuert nur bei Sitzungswechsel, Cmd+D ist ein reiner Toggle, und `docked` beeinflusst `layoutMode`/`isFullscreen`/Pane-Wahl nicht; dazu ein 150-ms-Debounce im Projektwechsel, der ein Promise hängen lassen kann.

## 3. Ziele

<!-- leser: mensch -->

- Z-01: Keine Listenzeile läuft über ihren Rand; der Titel ist immer lesbar.
- Z-02: Bei geschlossenem Terminal nutzen Liste, Vorhaben-Seite und Dokument die volle Fensterbreite.
- Z-03: Beim Betreten eines Vorhabens mit laufender Sitzung ist das Terminal angedockt offen, ein Fenster, Tab der Sitzung vorne — auch wenn es zuvor geschlossen war und auch bei Sitzung in einem anderen Projekt.
- Z-04: Cmd+D auf einer Vorhaben-Seite öffnet genau diese Sitzung in einem Fenster; die gespeicherte Aufteilung bleibt für schwebende Ansichten erhalten.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- NZ-01: Kein Umbau des Projektwechsel-Debounce in `project-state.service.ts` (eigene Karte).
- NZ-02: Keine Änderung am Handy-Pfad, an `aos-terminal`, am Buffer-Replay.
- NZ-03: Keine neue Breitengrenze für „Neue Absicht" oder die Projekt-Seite (eine Regel für alle Seiten der View).

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium (EARS) | Prüfart |
|---|---|---|
| AK-01 | WENN eine `plan.md` eine lange Status-Zeile trägt, DANN MUSS die Liste die Notiz auf höchstens 80 Zeichen Klartext (bis zum ersten ` · `, ohne `**`/Backticks) zeigen und die Zeile darf nicht über ihren Rand laufen (`scrollWidth === clientWidth`), der Titel bleibt > 200 px breit. | Unit (Reader, Zeile) + E2E 1 728 px |
| AK-02 | WENN das Terminal geschlossen ist, DANN MUSS die Vorhaben-Seite (inkl. Dokumenttext) die volle Breite minus Rahmen-Padding nutzen; angedockt die linke Hälfte. | E2E 1 728 px + Screenshot |
| AK-03 | WENN der Nutzer bei geschlossenem Terminal aus der Liste ein Vorhaben mit laufender Sitzung öffnet, DANN MUSS das Terminal im selben Render-Zyklus angedockt offen sein und der Tab der Sitzung binnen 300 ms (bei Projektwechsel: nach dem Backend-Ack, bis zu 3 Versuche, sonst Hinweis) vorne liegen. | Unit (`app-terminal-dock`) + E2E |
| AK-04 | WENN das Terminal angedockt ist, DANN MUSS es genau ein Fenster mit dem Tab der Seiten-Sitzung zeigen — unabhängig von der in `localStorage` gespeicherten Aufteilung, ohne diese zu ändern; Cmd+D öffnet auf diesem Tab; beim Verlassen angedockter Seiten gilt die gespeicherte Aufteilung wieder; `aos-terminal` wird dabei nicht neu angelegt. | Unit (`aos-cloud-terminal-docked`, `app-terminal-dock`) + E2E |

## 6. Randbedingungen

<!-- leser: mensch -->

- RB-01: Dieselbe Sidebar-Instanz, kein Remount (Buffer-Replay zweimal regressiert, `design.md` §3).
- RB-02: Hook `protect-tests`: Tests zuerst rot, dann `.claude/fix-mode`, dann Code.
- RB-03: `localStorage`-Layout wird angedockt nie geschrieben (AR-05-Bestand bleibt wie in `architecture.md` §10).

## 12. Annahmen

<!-- leser: mensch -->

- AN-01: „Alles 100 %" gilt für alle Seiten der Vorhaben-View (Liste, Vorhaben, `neu`, Projekt) — PO kann widersprechen.
- AN-02: Auto-Öffnen beim Betreten ist gewollt (FA-02/AN-S02 aus INT-2026-011), kein neues Verhalten.

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-17 | Angenommen als Bypass; Plan im Plan Mode entworfen, externer Review (3 Reviewer, 22 Findings) in `plan.md` §12 adressiert; B2-Entscheidung „alles 100 %" (PO). Abgleich Mensch/Agent: ohne Befund | AK-01–AK-04 | PO, 17.09. (Chat) |
