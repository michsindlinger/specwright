---
intent_id: "INT-2026-015"  
titel: "UI: Terminal schließt beim Verlassen der Vorhaben-Seite, Cmd+← führt zur Übersicht"  
status: "umgesetzt"  
version: "1.0.0"  
autor: "Michael Sindlinger (Feedback aus dem Gebrauch, 17.09.2026, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-17"  
geaendert: "2026-09-17"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Größe S, zwei Verhaltensänderungen im Frontend ohne Daten und ohne Backend; Kern-Absicht direkt zu plan.md (CLAUDE.md Arbeitsweise)"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, terminal, vorhaben-seite, tastatur, phase-5]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — im Chat: „Freigabe: intent.md 0.1.0", 17.09."  
  am: "2026-09-17"  

---

# Absicht: UI: Terminal schließt beim Verlassen der Vorhaben-Seite, Cmd+← führt zur Übersicht

<!-- Ablage: intent/INT-2026-015-zurueck-zur-uebersicht/intent.md · Bypass: Kern-Absicht, Plan in plan.md -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Michael verlässt eine Vorhaben-Seite ohne Nacharbeit: das angedockte Terminal räumt sich beim Verlassen selbst weg, und der Weg zurück zur Übersicht geht über die Tastatur statt über den Knopf.
- **Kernaufgaben:** (1) Beim Wechsel von einer angedockten Seite auf eine Seite ohne angedocktes Terminal schließt das Terminal. (2) Cmd+← auf der Vorhaben-Seite und auf „Neue Absicht" öffnet die Übersicht. (3) Textfelder behalten ihr Cmd+←, das Terminal bekommt davon keine Eingabe.
- **Endzustand:** AK-01 bis AK-09 sind erfüllt; Sitzungen, Tabs und Glocke arbeiten dabei unverändert weiter.

## 1. Problem und Anlass

<!-- leser: mensch -->

Seit INT-2026-011 steht das Terminal auf der Vorhaben-Seite und auf „Neue Absicht" als rechte Spalte neben dem Dokument [Q: `ui/frontend/src/components/terminal/terminal-dock.ts:13-16`]. Verlässt Michael die Seite — über den Knopf „‹ Vorhaben", über die Glocke oder die Kopfzeile —, bleibt das Terminal offen: die Routenbehandlung setzt nur das Andocken und die Seiten-Sitzung zurück [Q: `ui/frontend/src/app.ts:205-211`], der Abgleich der Spalte löscht beim Verlassen nur die Merkstelle des Tabs [Q: `ui/frontend/src/app.ts:348-356`]; ob das Terminal offen ist, bleibt unberührt, und es erscheint auf der Übersicht als schwebendes Fenster. Das war in INT-2026-013 so gemeint: „beim Verlassen angedockter Seiten gilt die gespeicherte Aufteilung wieder" [Q: `intent/INT-2026-013-terminal-nachbesserung/intent.md:72`, AK-04]. Im Gebrauch stört es: Michael schließt das Terminal nach jedem Vorhaben von Hand (Cmd+D oder „×"), bevor die Übersicht nutzbar ist [Q: Michael, 2026-09-17].

Zweitens führt der Weg zurück zur Übersicht nur über die Maus: der Knopf „‹ Vorhaben" schickt `vorhaben-back`, die Ansicht wechselt die Route [Q: `ui/frontend/src/components/vorhaben/aos-vorhaben-seite.ts:620`, `ui/frontend/src/views/aos-vorhaben-view.ts:330`]. Die App kennt genau einen globalen Kurzbefehl, Cmd/Ctrl+D für das Terminal [Q: `ui/frontend/src/app.ts:1575-1581`]; die Terminal-Sidebar hat eigene (Cmd/Ctrl+Shift+F, Cmd/Ctrl+Shift+Enter) [Q: `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts:2155-2172`]. Cmd+← ist im Browser „Verlauf zurück"; xterm reicht Cmd+Pfeil nicht an die Sitzung weiter [Q: `ui/node_modules/@xterm/xterm/src/common/input/Keyboard.ts:113-117`], die Taste kann also auch greifen, wenn der Cursor im Terminal steht.

Anlass: Feedback aus dem täglichen Gebrauch nach den Merges von INT-2026-013 und INT-2026-014 (16./17.09.2026). Eine Board-Karte gibt es dazu nicht [Q: Vault, Specwright — Backlog Board, 17.09.].

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael am Mac (Fenster ab 1024 px) | Terminal ist nach dem Verlassen einer Vorhaben-Seite zu; Cmd+← bringt ihn zur Übersicht |
| Michael am Handy | nichts — dort gibt es kein angedocktes Terminal (INT-2026-011, FA-20) |
| Systeme | Web-UI-Frontend: `app.ts` (Routenbehandlung, Kurzbefehle), Vorhaben-Ansicht; Backend unberührt |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Wer eine angedockte Seite verlässt, findet auf der Zielseite kein offenes Terminal vor — ohne Handgriff.
- **Z-02:** Von der Vorhaben-Seite und von „Neue Absicht" führt eine Tastenkombination zur Übersicht, ohne Textfelder oder das Terminal zu stören.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Kein Wiederherstellen des Zustands vor dem Betreten: war das Terminal vorher als schwebendes Fenster offen, ist es nach dem Verlassen zu.
- **NZ-02:** Wechsel von Vorhaben zu Vorhaben (Glocke, Kennung-Link): das Terminal bleibt offen und folgt der Sitzung der neuen Seite wie heute (INT-2026-011, FA-08).
- **NZ-03:** Ctrl+← wird nicht belegt — im Terminal ist es der Wort-Sprung.
- **NZ-04:** Keine weiteren Kurzbefehle (vorwärts, Dokumentwechsel, Übersicht → Vorhaben) und keine Tastenübersicht.
- **NZ-05:** Handy: keine Änderung.
- **NZ-06:** Sitzungen werden nicht beendet, Tabs nicht geschlossen — nur das Fenster geht zu.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn die Route von einer angedockten Seite (Vorhaben-Seite, „Neue Absicht") auf eine Seite ohne angedocktes Terminal wechselt und das Terminal offen ist, MUSS das System das Terminal schließen. | Z-01 | Test |
| AK-02 | Wenn die Route von einer angedockten Seite auf eine andere angedockte Seite wechselt, MUSS das Terminal offen bleiben und der Sitzung der neuen Seite folgen. | Z-01 | Test |
| AK-03 | Wenn nach AK-01 die Sitzung der verlassenen Seite Eingabe braucht, MUSS die Glocke sie melden. | Z-01 | Test |
| AK-04 | Wenn nach AK-01 Cmd+D gedrückt wird, MUSS das Terminal mit der gespeicherten Aufteilung wieder erscheinen (INT-2026-013, AK-04 bleibt gültig). | Z-01 | Test |
| AK-05 | Wenn auf der Vorhaben-Seite oder auf „Neue Absicht" Cmd+← gedrückt wird und kein Textfeld den Fokus hat, MUSS das System die Übersicht öffnen. | Z-02 | Test |
| AK-06 | Wenn Cmd+← gedrückt wird, während ein Textfeld (Anmerkung, Sende-Leiste, Absichtstext, Kopfzeile) den Fokus hat, DARF das System die Seite NICHT wechseln; das Feld behält das Browserverhalten. | Z-02 | Test |
| AK-07 | Wenn Cmd+← gedrückt wird, während der Cursor im angedockten Terminal steht, MUSS das System die Übersicht öffnen. | Z-02 | Test |
| AK-08 | Wenn Cmd+← im angedockten Terminal gedrückt wird, DARF die Sitzung dafür KEINE Eingabe erhalten. | Z-02 | Test |
| AK-09 | Wenn Cmd+← auf einer anderen Seite (Übersicht, Projekt-Seite, Team, Einstellungen) gedrückt wird, DARF das System die Taste NICHT abfangen. | Z-02 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | Ob das Terminal offen ist, bleibt Zustand des Browsers wie heute; nichts davon wandert ins Backend oder in `localStorage`. Grund: das Andocken leitet sich aus der Route ab und speichert nichts Neues. | `docs/architecture.md` AR-05 und Abweichung „Terminal-Layout" (Zeile 112) |
| RB-02 | Technik | Nur Cmd (Mac). Grund: Ctrl+← ist im Terminal der Wort-Sprung, am Mac systemweit belegt. | Entscheidung PO, 17.09.2026 (NZ-03) |

## 7. Offene Fragen

<!-- leser: mensch -->

Keine. Vier Rückfragen am 2026-09-17 entschieden (PO): Geltung des Schließens → AK-01, AK-02, NZ-02 · nur Cmd → NZ-03, RB-02 · Reichweite der Taste → AK-05, AK-06, AK-09 · Browser-„Zurück" auf den zwei Seiten übersteuert → AK-05, AN-02.

---

## 12. Annahmen

<!-- leser: mensch -->

- **AN-01:** xterm gibt Cmd+← nicht an die Sitzung weiter, die Taste erreicht die Seite [Q: `Keyboard.ts:113-117`]. Prüfung: Test zu AK-07/AK-08 im Plan; Michael am Mac bei der Abnahme.
- **AN-02:** Das Browser-„Verlauf zurück" (Cmd+←) wird auf der Vorhaben-Seite und auf „Neue Absicht" nicht vermisst; Cmd+[ bleibt. Prüfung: Michael nach einer Woche Gebrauch; sonst neues Vorhaben.
- **AN-03:** Das Schließen betrifft nur das Fenster; mit geschlossenem Fenster darf jede Sitzung läuten [Q: `ui/frontend/src/app.ts:412-416`]. Prüfung: Test zu AK-03.

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-17 | Angenommen ohne Änderung am Entwurf; Bypass ja (Größe S) → direkt `/plan`. Abgleich Mensch/Agent: ohne Befund (Kopf S/niedrig/Bypass deckt Endzustand AK-01–AK-09) | alle | PO, 17.09. |
| 0.1.0 | 2026-09-17 | Entwurf nach Gespräch; vier Rückfragen mit den Vorschlägen entschieden | alle | — |
