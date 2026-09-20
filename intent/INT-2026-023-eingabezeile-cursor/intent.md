---
intent_id: "INT-2026-023"  
titel: "Der Knopf „Nächster Schritt" darf am Autovorschlag der Sitzung nicht scheitern"  
status: "umgesetzt"  
version: "1.0.1"  
autor: "Michael Sindlinger (aus dem Gebrauch, 19.09.2026, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-19"  
geaendert: "2026-09-20"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Bugfix unter einem Tag: die Bildschirmprüfung bekommt ein zweites Signal (Cursorposition); Kern-Absicht direkt zu plan.md (CLAUDE.md Arbeitsweise)"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, naechster-schritt, bildschirmpruefung, cloud-terminal, bugfix, INT-2026-021]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — im Chat: „Freigabe: intent.md 0.1.0", 19.09."  
  am: "2026-09-19"  

---

# Absicht: Der Knopf „Nächster Schritt" darf am Autovorschlag der Sitzung nicht scheitern

<!-- Ablage: intent/INT-2026-023-eingabezeile-cursor/intent.md · Bypass: Kern-Absicht, Plan in plan.md -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Der Knopf im Kasten „Nächster Schritt" lässt sich in fast keiner laufenden Sitzung mehr benutzen. Grund ist nicht getippter Text, sondern der graue Vervollständigungs-Vorschlag, den Claude Code nach jeder Runde in die leere Eingabezeile zeichnet — die Prüfung hält ihn für Eingabe.
- **Kernaufgaben:** (1) Die Prüfung entscheidet nicht mehr allein am gezeichneten Text, sondern an der Cursorposition. (2) Steht der Cursor unmittelbar hinter dem Eingabezeichen, gilt die Zeile als leer, egal was dort steht. (3) Echter getippter Text blockiert weiterhin, mit der Meldung aus INT-2026-021.
- **Endzustand:** AK-01 bis AK-05 sind erfüllt; in allen Sitzungen, deren Eingabezeile nur einen Vorschlag zeigt, startet der Knopf wieder.

## 1. Problem und Anlass

<!-- leser: mensch -->

Seit INT-2026-018 prüft die UI vor jedem maschinellen Schreiben den Bildschirm der Sitzung und schreibt nur, wenn die Eingabezeile leer ist [Q: `ui/src/server/services/vorhaben-service.ts:707-731`]. INT-2026-021 hat die Prüfung genauer gemacht: maßgeblich ist die unterste Zeile mit dem Eingabezeichen, und getippter Text bekam eine eigene, ehrliche Meldung [Q: `ui/src/server/services/dialog-driver.ts:51-119`].

Michael hat am 19.09.2026 festgestellt, dass der dort erkannte „Text" in seinen Sitzungen gar kein Text ist, sondern die Autovervollständigung von Claude Code [Q: Michael Sindlinger, 19.09.2026, Screenshot].

Nachgemessen an den zehn laufenden Sitzungen über die Cursorposition (`tmux display-message -p '#{cursor_x}'`) [Q: Messung 19.09.2026]:

| Sitzung | gezeichnete Eingabezeile | cursor_x |
|---|---|---|
| qwen3.8-flash-next (INT-2026-012) | `❯ /spec INT-2026-012` | 2 |
| compass | `❯ npm run verify` | 2 |
| brodybookings | `❯ ja, leg den Entwurf an` | 2 |
| outlook | `❯ prüf mal ob outlook die pac geholt hat` | 2 |
| Wegwerf-Sitzung, `/` wirklich getippt | `❯ /` | 3 |

`cursor_x = 2` heißt: Der Cursor steht direkt hinter dem Eingabezeichen und seinem Trennzeichen — die Zeile ist leer. Echte Eingabe schiebt den Cursor nach rechts (`2 + Länge`). Alle vier „gefüllten" Zeilen waren also leer; sichtbar war der Vorschlag der letzten Eingabe.

Aus dem gezeichneten Text allein ist das nicht zu entscheiden: Die Bildschirmprobe liest mit `capture-pane -p -J` und verwirft damit die Dimmung, mit der der Vorschlag gezeichnet wird [Q: `ui/src/server/services/tmux-session-backend.ts:363-371`]. Die Cursorposition wird heute nirgends mitgelesen [Q: `ui/src/server/services/cloud-terminal-manager.ts:1807-1818`].

Das Problem besteht seit INT-2026-018 und ist durch INT-2026-021 nur sichtbar geworden: Vorher meldete dieselbe Lage „Sitzung arbeitet — warten", seitdem „in der Eingabezeile steht noch Text". Blockiert war der Knopf in beiden Fassungen. Weil Claude Code 2.1.277 nach jeder Runde den letzten Befehl vorschlägt, trifft es praktisch jede Sitzung, in der schon einmal etwas gelaufen ist.

## 2. Betroffene

<!-- leser: mensch -->

- **Michael** als einziger Nutzer: kann den Kasten „Nächster Schritt" in laufenden Sitzungen nicht benutzen und muss die Phase im Terminal von Hand starten.
- **Agenten, die den Kasten bedienen**, bekommen eine Ablehnung, die sie nicht auflösen können — im Terminal ist nichts zu löschen.
- **Nicht betroffen:** der Freitext-Pfad (Freigaben, Anmerkungen); er prüft bewusst lockerer [Q: `ui/src/server/services/vorhaben-service.ts:718-721`].

## 3. Ziele

<!-- leser: mensch -->

- Z-01: Eine Sitzung, deren Eingabezeile nur einen Vorschlag zeigt, gilt als bereit.
- Z-02: Getippter Text blockiert weiterhin und wird weiterhin benannt.
- Z-03: Die Entscheidung stützt sich auf ein Signal, das der Bildschirmtext nicht verfälschen kann.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- NZ-01: Der Vorschlag wird nicht unterdrückt oder weggeschrieben — er gehört Claude Code.
- NZ-02: Die Dimmung des Vorschlags wird nicht ausgewertet (Farbcodes sind versionsabhängig und werden von der heutigen Bildschirmprobe verworfen).
- NZ-03: Der Freitext-Pfad bleibt unverändert durchlässig (wie NZ-01 aus INT-2026-021).
- NZ-04: Kein Räumen der Eingabezeile durch die UI — das ist in INT-2026-021 gemessen und verworfen worden.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn der Cursor der Sitzung unmittelbar hinter dem Eingabezeichen steht, MUSS das System die Eingabezeile als leer behandeln — unabhängig davon, was dort gezeichnet ist. | Z-01 | Test |
| AK-02 | Wenn der Cursor weiter rechts steht, MUSS das System die Ablehnung aus INT-2026-021 samt zitiertem Text beibehalten. | Z-02 | Test |
| AK-03 | Falls die Sitzung keine Cursorposition liefert, MUSS das System sich verhalten wie heute (gezeichneter Text blockiert). | Z-03 | Test |
| AK-04 | Das System MUSS Spinner und Dialog weiterhin vor der Eingabezeile bewerten. | Z-02 | Test |
| AK-05 | Wenn Michael in einer Sitzung mit sichtbarem Vorschlag den Knopf drückt, MUSS die Phase starten. | Z-01 | Messung |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | Die Cursorposition wird über die vorhandene tmux-Anbindung gelesen; kein zweiter Kanal, kein neuer Prozess. Grund: AR-02 (MCP/Prozessmodell) und der bestehende Aufruf-Weg. | `docs/architecture.md` AR-02 |
| RB-02 | Technik | Die Prüfung bleibt fail closed: Ohne verlässliches Signal wird nicht geschrieben. Grund: AR-08. | `docs/architecture.md` AR-08 |
| RB-03 | Betrieb | Die Bildschirmprobe darf nicht spürbar langsamer werden; sie läuft vor jedem Klick. | `docs/architecture.md` §2 |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Soll die Cursorposition auch die Bildschirmprobe bei Stille (Dialog-Erkennung) mitbenutzen? *entschieden 2026-09-19 (Product Owner)*: nein — nur der strenge Pfad vor `/clear` und Befehl, siehe NZ-03 und AK-04. | entschieden | Product Owner | erledigt |
| OF-02 | Reicht die Cursorposition allein? *entschieden 2026-09-19 (Product Owner)*: ja, Cursorposition allein; je eine echte Aufzeichnung für beide Lagen sichert sie ab, siehe AK-01, AK-02 und AN-01. | entschieden | Product Owner | erledigt |

## 12. Annahmen

<!-- leser: mensch -->

- AN-01: Claude Code zeichnet den Vorschlag rechts vom Cursor und rückt den Cursor dabei nicht vor. Gemessen an fünf Sitzungen am 19.09.2026; der Plan hält beide Lagen als Aufzeichnung fest.
- AN-02: Die Eingabezeile ist einzeilig; bei mehrzeiliger Eingabe steht der Cursor auf einer der Folgezeilen und damit nicht auf der Prompt-Zeile — das gilt als „nicht leer". Wird im Plan geprüft.

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Autor | Änderung |
|---|---|---|---|
| 0.1.0 | 2026-09-19 | Claude (Gespräch mit Michael) | Erstfassung nach Messung der Cursorposition an zehn laufenden Sitzungen |
| 1.0.0 | 2026-09-19 | Claude (Freigabe Michael) | Freigabe „intent.md 0.1.0"; OF-01 und OF-02 wie vorgeschlagen entschieden. Abgleich Mensch/Agent (R4): ohne Befund — Kopf (Größe S, Risiko niedrig, Bypass ja) deckt sich mit Kern und Abnahmekriterien, keine Vertragsschicht nötig. |
| 1.0.1 | 2026-09-20 | Claude (nach Merge) | Umgesetzt: PR #86 nach `main` gemerged (1a074f2, CI-Run 35492667656 grün). AK-01 bis AK-04 durch 67 Tests belegt (`plan.md` §8), AK-05 im E2E-Lauf vorgeführt und von Michael im Betrieb zu bestätigen. Abweichungen in `plan.md` §14, Belege in §13. |
