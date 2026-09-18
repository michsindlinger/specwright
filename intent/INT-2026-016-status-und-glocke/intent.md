---
intent_id: "INT-2026-016"  
titel: "UI: Vorhaben-Status, Glocke und angedocktes Terminal stimmen wieder"  
status: "umgesetzt"  
version: "1.0.1"  
autor: "Michael Sindlinger (Feedback aus dem Gebrauch, 17.09.2026, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-17"  
geaendert: "2026-09-18"  
risikoklasse: "niedrig"  
groesse: "M"  
bypass: "ja"  
bypass_grund: "Vier Fehlerberichte aus dem Gebrauch, kein Datenmodell-Umbau, keine neue Datenhaltung; Kern-Absicht direkt zu plan.md (CLAUDE.md Arbeitsweise)"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, vorhaben, glocke, terminal, hooks, phase-5]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — Plan im Plan Mode freigegeben, 17.09."  
  am: "2026-09-17"  

---

# Absicht: UI: Vorhaben-Status, Glocke und angedocktes Terminal stimmen wieder

<!-- Ablage: intent/INT-2026-016-status-und-glocke/intent.md · Bypass: Kern-Absicht, Plan in plan.md -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Liste, Glocke und angedocktes Terminal der Web-UI erzählen dieselbe Geschichte: die Sitzung, die auf Michael wartet, ist nie versteckt, die Glocke kennt sie, und die Vorhaben-Seite findet ihren Tab.
- **Kernaufgaben:** (1) Die Gruppe einer Zeile entscheidet der Sitzungszustand, nicht der Dokumentstatus. (2) Die Glocke liest den Backend-Stand statt einer Browser-Merkliste. (3) Das angedockte Terminal zeigt die Tabs des Seiten-Projekts, und ein Klick dort verbindet Tab und Vorhaben. (4) Dialoge im Terminal gelten auch dann als „wartet", wenn kein Hook kommt.
- **Endzustand:** AK-01 bis AK-11 sind erfüllt; Sitzungen, Tabs, Dokumente und gespeicherte Zuordnungen bleiben erhalten.

## 1. Problem und Anlass

<!-- leser: mensch -->

Vier Fehler aus dem Gebrauch am 17.09.2026 [Q: Michael, Screenshots im Chat]:

1. Ein umgesetztes Vorhaben (kreis-lippe-audit INT-2026-004) hat eine wartende Sitzung, steht aber im eingeklappten Kasten „Umgesetzt": die Gruppierung prüft die Phase vor dem Sitzungszustand [Q: `ui/frontend/src/components/vorhaben/vorhaben-sort.ts:26-30`], entgegen Spec INT-2026-004 FA-02.
2. Die Zeile applai-nextjs INT-2026-004 sagt „wartet auf dich · Spec · spec.md", die Glocke schweigt: die Glocke kennt nur `blocked` und eine Browser-Merkliste aus live empfangenen Stops [Q: `ui/frontend/src/components/terminal/agent-notifications.ts:201-237`, `ui/frontend/src/app.ts:790`], die Zeile rechnet im Backend anders [Q: `ui/src/server/services/vorhaben-reader.ts:237-243`].
3. specwright INT-2026-012 hat einen offenen Terminal-Tab, aber keine gespeicherte Verbindung Sitzung ↔ Vorhaben [Q: `ui/runtime/vorhaben-3001.json`, kein Schlüssel für INT-2026-012; Umbenennung 011 → 012 am 17.09.]; die Seite sagt „keine Sitzung", Cmd+D zeigt die Tabs des Workspace-aktiven Projekts, nicht des Seiten-Projekts [Q: `ui/frontend/src/app.ts:715-719`].
4. compass INT-2026-001 steht auf „arbeitet", das Terminal zeigt den Plan-Dialog: Claude Code 2.1.274 zeigt den Dialog nach „Tell Claude what to change" erneut, ohne Werkzeug-Aufruf und ohne Hook [Q: Transkript `bf3077d2…`, kein `ExitPlanMode`-tool_use nach der Ablehnung; tmux-Screen 17.09. 15:40]. Dieselbe Sitzung ist außerdem noch dem ersten von zwei Vorhaben zugeordnet, das sie angelegt hat [Q: `vorhaben-service.ts:813-823`, `vorhaben-state.ts:227-230`].

Nebenbefunde aus denselben Screenshots: die Kurzform `INT-002` wird nicht als Kennung erkannt [Q: `vorhaben-service.ts:168`]; INT-2026-012 zeigt den Zweig einer fremden Arbeitskopie, weil `git worktree add` alle Dateien neu stempelt [Q: `vorhaben-reader.ts:410-428`].

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael am Mac | Wartende Zeilen sind sichtbar; Glocke stimmt mit der Liste überein und überlebt Neuladen; Cmd+D auf einer Vorhaben-Seite zeigt das richtige Projekt; ein Klick verbindet Tab und Vorhaben; Plan-Dialoge gelten als „wartet" |
| Michael am Handy | Glocke wie am Mac (Backend-Stand); keine Zuordnung per Tab-Klick (kein angedocktes Terminal) |
| Systeme | Web-UI Backend (`cloud-terminal-manager`, `vorhaben-service`, `vorhaben-state`, `vorhaben-reader`, Handler) und Frontend (`app.ts`, Glocke, Vorhaben-Sortierung, Terminal-Tabs, Vorhaben-Seite); Framework unberührt |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Eine Sitzung, die arbeitet oder wartet, ist in der Übersicht nie eingeklappt — unabhängig vom Dokumentstatus.
- **Z-02:** Die Glocke und die Zeile haben dieselbe Quelle; ein Eintrag bleibt, bis Michael antwortet oder den Tab schließt, und überlebt Neuladen und Gerätewechsel.
- **Z-03:** Die Vorhaben-Seite zeigt angedockt das Terminal ihres Projekts und lässt Michael die Verbindung zu einem vorhandenen Tab mit einem Klick setzen.
- **Z-04:** Ein Dialog im Terminal führt zum Zustand „wartet", auch wenn der Hook ausbleibt.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Keine Rekonstruktion verlorener Verbindungen (Umbenennung, alte Kennung, Sitzung außerhalb der UI) — der Klick setzt sie.
- **NZ-02:** Keine automatische Herleitung der Verbindung aus Worktree- oder Zweignamen (nach Review gestrichen: ohne Beleg, ohne Sichtbarkeit).
- **NZ-03:** `unknown` (Sitzung ohne je gefeuerten Hook) bleibt in der Zeile „wartet"; eigene Karte.
- **NZ-04:** Die Zeit in der Zeile bleibt „letzte Änderung" (Dokument-mtime); nur die Glocke zeigt, seit wann die Sitzung wartet.
- **NZ-05:** Kein Auto-Öffnen des Docks ohne Sitzung (Spec INT-2026-011 FA-06 gilt weiter).
- **NZ-06:** Kein Umbau von `detectPlanBox`/`PLAN_BOX_PATTERN` (Plan-Review-Auto-Trigger); eigene Karte.
- **NZ-07:** ADR-0004 bleibt unverändert; die Bildschirm-Probe liest den Bildschirm, nicht das Transkript.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn die Sitzung einer Zeile `arbeitet`, MUSS die Zeile unter „Läuft" stehen; wenn sie in einem `wartet*`-Zustand ist, unter „Wartet auf dich" — jeweils unabhängig von der Phase. Ohne Sitzung oder mit beendeter Sitzung entscheidet die Phase; `umgesetzt` ist dann eingeklappt. | Z-01 | Test |
| AK-02 | Die Glocke MUSS jede Claude-Sitzung listen, die einen Dialog zeigt (`blocked`) oder fertig gemeldet und nicht beantwortet ist (Backend-Marke), aus dem Backend-Stand, nach Neuladen und auf jedem Gerät gleich; die gerade sichtbare Sitzung (offene Seitenleiste, aktiver Tab) ist ausgenommen. Sitzungen ohne Hook-Meldung (`unknown`) werden nie gelistet. | Z-02 | Test |
| AK-03 | Ein Glocken-Eintrag einer Vorhaben-Sitzung MUSS Kennung, Titel und den Zustand der Zeile zeigen; eine Eingabe in der Sitzung oder ihr Schließen MUSS den Eintrag entfernen. | Z-02 | Test |
| AK-04 | Die Marke „fertig, unbeantwortet" MUSS einen Backend-Neustart überleben, wenn sie jünger als 24 Stunden ist; ältere Marken werden nicht wiederhergestellt. | Z-02 | Test |
| AK-05 | Das angedockte Terminal MUSS die Tabs des Projekts der Seite zeigen (aus der Adresse; sonst das aktive Projekt); Cmd+D auf einer Seite ohne Sitzung öffnet den zuletzt benutzten Tab dieses Projekts oder den Leerzustand; das aktive Projekt des Workspace DARF sich dabei NICHT ändern. | Z-03 | Test |
| AK-06 | „Neue Session" im angedockten Terminal einer Vorhaben-Seite MUSS im Projekt der Seite entstehen; eine Claude-Sitzung MUSS nach dem Verbinden diesem Vorhaben zugeordnet werden, mit Bestätigung oder Fehlertext als Hinweis. | Z-03 | Test |
| AK-07 | Ein Nutzer-Klick auf einen Claude-Tab im angedockten Terminal einer Vorhaben-Seite ohne lebende Sitzung MUSS den Tab dem Vorhaben zuordnen und das bestätigen; gehört der Tab einem anderen laufenden Vorhaben, DARF nichts verschoben werden, und der Hinweis nennt dieses Vorhaben. Programmatische Tab-Wahl (Cmd+D, Seitenwechsel, Projektwechsel) DARF nie zuordnen. Die Fußzeile der Seite nennt den Klick vorher als Weg. | Z-03 | Test |
| AK-08 | Wenn eine Sitzung per getipptem Befehl (`/spec`, `/plan`, `/build` mit Kennung; `/intent` mit neuem Ordner) zu einem anderen Vorhaben wechselt, MUSS ihre alte Zuordnung entfallen (alte Zeile: keine Sitzung, „ruht"); eine Kurzform `INT-NNN` MUSS aufgelöst werden, wenn im Projekt eindeutig, sonst nicht zugeordnet werden. | Z-03 | Test |
| AK-09 | Liegt ein Vorhaben in mehreren Kopien mit byteweise gleichen Dokumenten (intent, spec, plan, build-stand), MUSS die Zeile ohne Zuordnung die Arbeitskopie des Haupt-Checkouts zeigen; bei abweichendem Inhalt die neueste; mit Zuordnung die Kopie der Sitzung. | Z-03 | Test |
| AK-10 | Zeigt eine Claude-Sitzung im Zustand `working` seit 1,5 s ohne neue Ausgabe einen Plan-, Rückfrage- oder Berechtigungs-Dialog, MUSS das Backend sie binnen 3 s als `wartet` mit Dialogart führen; verschwindet der Dialog ohne Hook, MUSS die Sperre zurückgenommen werden; ein Hook-Ereignis gewinnt immer gegen die Probe. | Z-04 | Test + E2E |
| AK-11 | Die Probe DARF je Ruhephase und Sitzung höchstens einmal den Bildschirm lesen und MUSS Proben nacheinander ausführen. | Z-04 | Test + Zähler in E2E |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | Kein neuer Nutzerzustand im Browser; Marke, Zuordnung und Status leben im Backend (AR-05). | `docs/architecture.md` AR-05 |
| RB-02 | Technik | Kein Transkript-Leser; die Probe liest den tmux-Bildschirm wie die Sendeprüfung aus INT-2026-007. | ADR-0004 |
| RB-03 | Produkt | Das aktive Projekt des Workspace wird nicht ohne bekannte Sitzung gewechselt — es wirkt auf alle Fenster und Geräte. | Review 1, Minority 4 |

## 7. Offene Fragen

<!-- leser: mensch -->

Keine. Drei Rückfragen am 17.09. entschieden (PO): Gruppenregel → AK-01 · Auto-Zuordnung neuer Dock-Sitzung → AK-06 · Arbeitskopie-Fix → AK-09. Rückfrage „der Tab ist da" → AK-07.

---

## 12. Annahmen

<!-- leser: mensch -->

- **AN-01:** Claude Code 2.1.274 zeigt den Plan-Dialog nach Option 3 ohne Hook [Q: Transkript, Screen 17.09.]. Prüfung: Schritt 0 des Plans; Ergebnis in plan.md §14 und Memory.
- **AN-02:** Die Dialog-Muster in `dialog-driver.ts` passen zur aktuellen Darstellung. Prüfung: Fixtures aus Schritt 0, Tests je Fixture.
- **AN-03:** Umgesetzte Vorhaben mit offener, gestoppter Sitzung dürfen unter „Wartet auf dich" stehen, bis die Sitzung geschlossen ist [Q: PO 17.09.]. Prüfung: Michael nach dem Deploy.

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.1 | 2026-09-18 | Umgesetzt: drei PRs gemerged am 17.09. — PR #73 `da806cd` (Liste und Glocke, AK-01–AK-04), PR #74 `250c6c5` (Terminal und Zuordnung, AK-05–AK-09), PR #75 `ad70b5c` (Bildschirm-Probe, AK-10, AK-11); CI `verify` grün je Merge; Abweichungen in `plan.md` §14 (7 Zeilen, u. a. Schritt-0-Befund zu den Plan-Dialog-Hooks) | alle | PO, 2026-09-18 (Chat: Karte nach Erledigt) |
| 1.0.0 | 2026-09-17 | Kern-Absicht aus dem Plan Mode; Bypass ja (vier Fehlerberichte, kein Datenmodell); Plan in zwei externen Review-Runden geprüft | alle | PO, 17.09. |
