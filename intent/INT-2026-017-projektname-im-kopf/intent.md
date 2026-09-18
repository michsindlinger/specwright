---
intent_id: "INT-2026-017"  
titel: "UI: Projektname im Kopf der Vorhaben-Seite"  
status: "umgesetzt"  
version: "1.1.0"  
autor: "Michael Sindlinger (Feedback aus dem Gebrauch, 17.09.2026, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-17"  
geaendert: "2026-09-18"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Größe S, eine Anzeige-Zeile in einer Frontend-Komponente, Daten liegen schon in der Zeile, kein Backend; Kern-Absicht direkt zu plan.md (CLAUDE.md Arbeitsweise)"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, vorhaben-seite, projekt, phase-5]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — im Chat: „Freigabe: intent.md 0.1.0", 17.09."  
  am: "2026-09-17"  

---

# Absicht: UI: Projektname im Kopf der Vorhaben-Seite

<!-- Ablage: intent/INT-2026-017-projektname-im-kopf/intent.md · Bypass: Kern-Absicht, Plan in plan.md -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Wer eine Vorhaben-Seite öffnet — aus der Liste, über die Glocke, über einen Link —, sieht auf den ersten Blick, zu welchem Projekt das Vorhaben gehört, ohne zurück zur Übersicht oder ins Terminal zu schauen.
- **Kernaufgaben:** (1) Der Kopf der Vorhaben-Seite nennt den Projektnamen, grau und klein über der Kennung, so wie „Neue Absicht" das Projekt nennt. (2) Das gilt für jedes Dokument der Seite (intent, spec, plan, build, design) und auf jedem Gerät gleich.
- **Endzustand:** AK-01 bis AK-04 sind erfüllt; App-Kopfzeile, Liste und Projekt-Seite bleiben, wie sie sind.

## 1. Problem und Anlass

<!-- leser: mensch -->

Die Vorhaben-Seite zeigt im Kopf die Kennung und den Titel, darunter Zustand, Sitzung, Arbeitskopie und Phasen-Hinweis — den Projektnamen nirgends [Q: `ui/frontend/src/components/vorhaben/aos-vorhaben-seite.ts:627-640`]. Die App-Kopfzeile darüber sagt auf dieser Seite fest „Vorhaben", der Titel ist je Route festgelegt und kennt das Vorhaben nicht [Q: `ui/frontend/src/app.ts:639-647`]. Der Projektname der Zeile ist der Seite bekannt, sie zeigt ihn aber nur im Bestätigungsdialog von „Freigeben" [Q: `aos-vorhaben-seite.ts:746`]; die Daten kommen aus dem Backend mit jeder Zeile [Q: `ui/src/shared/types/vorhaben.protocol.ts:104`, `ui/src/server/services/vorhaben-reader.ts:492`]. Die beiden Nachbarseiten nennen ihr Projekt: „Neue Absicht" als graue Zeile unter der Überschrift [Q: `ui/frontend/src/views/aos-vorhaben-view.ts:417-418`], die Projekt-Seite als Überschrift [Q: `ui/frontend/src/components/vorhaben/aos-projekt-seite.ts:158`]; die Liste zeigt es in jeder Zeile [Q: `ui/frontend/src/components/vorhaben/aos-vorhaben-zeile.ts:184`]. Auf dem Bild `intent/INT-2026-016-status-und-glocke/design/ist-pr2/c2-tab-geklickt-gebunden.png` verrät nur der Pfad im Terminal, dass die Seite zum Scratch-Projekt gehört.

Anlass: Seit INT-2026-016 führen Glocke und Sitzungs-Zuordnung öfter direkt auf eine Vorhaben-Seite, und mehrere Projekte laufen nebeneinander (Applai, Kreis Lippe, Specwright); Michael muss dann zurück zur Liste, um das Projekt zu sehen [Q: Michael, 2026-09-17]. Eine Board-Karte gibt es dazu nicht [Uncertain — Vault am 17.09. nicht geprüft; wird beim Nachziehen im Block „Für das Board" geklärt].

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael am Mac und am Handy | Auf jeder Vorhaben-Seite steht der Projektname über der Kennung; sonst sieht die Seite gleich aus |
| Sitzungen, Glocke, Terminal | nichts |
| Systeme | Web-UI-Frontend: eine Komponente (`aos-vorhaben-seite`) und ihr Test; Backend und geteilter Ansichtszustand unberührt |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Auf jeder Vorhaben-Seite ist das Projekt ohne Klick, Scrollen oder Blick ins Terminal erkennbar.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Die App-Kopfzeile bleibt „Vorhaben" — kein Projektname dort (Rahmen-Regel INT-2026-010, FA-07/EK-02; Entscheidung PO, 17.09.2026).
- **NZ-02:** Der Projektname ist Text, kein Link — kein Sprung zur gefilterten Liste oder zur Projekt-Seite (Entscheidung PO, 17.09.2026).
- **NZ-03:** Keine Änderung an Liste, „Neue Absicht", Projekt-Seite, Glocke oder Terminal-Tabs.
- **NZ-04:** Kein Projektpfad, keine Arbeitskopie im Kopf — die Arbeitskopie steht wie heute in der Zeile darunter.
- **NZ-05:** Kein eigener Text für das Handy — dort gleiche Stelle, gleiche Schrift (Entscheidung PO, 17.09.2026).

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn eine Vorhaben-Seite geöffnet wird, MUSS das System im Kopf der Seite den Projektnamen der Zeile über der Kennung zeigen. | Z-01 | Test |
| AK-02 | Solange ein anderes Dokument des Vorhabens gewählt wird (intent, spec, plan, build, design) oder kein Dokument vorhanden ist, MUSS der Projektname sichtbar bleiben. | Z-01 | Test |
| AK-03 | Wenn die Seite von einem Vorhaben zu einem Vorhaben eines anderen Projekts wechselt (Glocke, Kennung-Link), MUSS der Projektname mit der Zeile wechseln. | Z-01 | Test |
| AK-04 | Wenn die Seite am Handy gezeigt wird, MUSS der Projektname an derselben Stelle stehen wie am Mac. | Z-01 | Screenshot |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | Die Vorhaben-Seite hat einen eigenen Stil-Bereich (Shadow-Root); die neue Zeile wird dort gestaltet, nicht in `theme.css`. Grund: `theme.css` erreicht Kinder eines Shadow-Roots nicht (dreimal passiert, CLAUDE.md „Fehler, die Claude hier schon zweimal gemacht hat"). | `CLAUDE.md`, `aos-vorhaben-seite.ts:133` |
| RB-02 | Sicherheit | Screenshots für die Abnahme aus dem Scratch-Projekt, keine Kundenprojekte im Bild. | `docs/security.md` §1 (Repo öffentlich), INT-2026-010 Bedenken security.md §5 |
| RB-03 | Betrieb | Kein neuer Rahmen-Bestandteil: die Zeile lebt auf der Seite, nicht in der Kopfzeile. | INT-2026-010 FA-07, EK-02 („höchstens 3 Bedienelemente im Rahmen") |

## 7. Offene Fragen

<!-- leser: mensch -->

Keine. Drei Rückfragen am 2026-09-17 entschieden (PO): Ort → AK-01, NZ-01 · anklickbar → NZ-02 · Handy → AK-04, NZ-05.

---

## 12. Annahmen

<!-- leser: mensch -->

- **AN-01:** Der Projektname aus der Zeile (`projectName`) ist derselbe Name, den Liste und Projekt-Seite zeigen; nichts muss neu geladen werden [Q: `vorhaben-reader.ts:492`]. Prüfung: Test zu AK-01 im Plan.
- **AN-02:** Eine zusätzliche graue Zeile im Kopf verschiebt die Phasen-Chips nicht sichtbar; der Kopf bricht bei schmalen Fenstern wie heute um [Q: `aos-vorhaben-seite.ts:147-158`, `flex-wrap`]. Prüfung: Screenshot Mac und Handy neben dem heutigen Bild `c2-tab-geklickt-gebunden.png`.

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.1.0 | 2026-09-18 | Umgesetzt: PR #76 nach `main` gemergt (Merge-Commit `6c2c896`), CI-Check `verify` grün. Status `angenommen` → `umgesetzt` | alle | PO, 18.09. |
| 1.0.1 | 2026-09-17 | Umgesetzt in PR #76 (`feat/INT-2026-017-projektname-im-kopf`, Commit fe186c6): `aos-vorhaben-seite` `.projekt` über der Kennung, drei Tests AK-01–AK-03, Screenshots `design/ist/`, `docs/design.md` §4; Abweichungen in `plan.md` §14. Status bleibt `angenommen` bis Merge | AK-01–AK-04 | — |
| 1.0.0 | 2026-09-17 | Angenommen ohne Änderung am Entwurf; Bypass ja (Größe S) → direkt `/plan`. Abgleich Mensch/Agent: ohne Befund (Kopf S/niedrig/Bypass deckt Endzustand AK-01–AK-04: eine Komponente, kein Backend, keine Daten) | alle | PO, 17.09. |
| 0.1.0 | 2026-09-17 | Entwurf nach Gespräch; drei Rückfragen mit den Vorschlägen entschieden | alle | — |
