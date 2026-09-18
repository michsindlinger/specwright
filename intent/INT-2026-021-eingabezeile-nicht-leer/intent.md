---
intent_id: "INT-2026-021"  
titel: "UI: Text in der Eingabezeile meldet nicht mehr „Sitzung arbeitet""  
status: "in Arbeit"  
version: "0.1.0"  
autor: "Michael Sindlinger (Fehlermeldung aus dem Gebrauch, 18.09.2026, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-18"  
geaendert: "2026-09-18"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Bugfix unter einem Tag: ein Prüfergebnis wird richtig benannt, dazu ein optionaler Aufräum-Knopf; Kern-Absicht direkt zu plan.md (CLAUDE.md Arbeitsweise)"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, naechster-schritt, bildschirmpruefung, cloud-terminal, bugfix]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — im Chat: Planfreigabe nach externem Review, 18.09."  
  am: "2026-09-18"  

---

# Absicht: UI: Text in der Eingabezeile meldet nicht mehr „Sitzung arbeitet"

<!-- Ablage: intent/INT-2026-021-eingabezeile-nicht-leer/intent.md · Bypass: Kern-Absicht, Plan in plan.md -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Der Knopf im Kasten „Nächster Schritt" scheitert mit „Sitzung arbeitet — warten", obwohl die Sitzung ruhig wartet. Der wahre Grund ist getippter, nie abgeschickter Text in der Eingabezeile der Sitzung. Die Meldung soll das sagen, statt auf etwas warten zu lassen, das nie eintritt.
- **Kernaufgaben:** (1) Die Bildschirmprüfung unterscheidet „arbeitet" von „Eingabezeile nicht leer" und nennt den gelesenen Text. (2) Nur noch die unterste Eingabezeile entscheidet, nicht irgendeine `❯`-Zeile im Verlauf. (3) Ein Knopf räumt die Zeile und startet — nur auf Klick, und nur wenn eine Messung belegt, dass die Taste wirkt.
- **Endzustand:** AK-01 bis AK-08 sind erfüllt; der Freitext-Pfad (`send`) verhält sich unverändert.

## 1. Problem und Anlass

<!-- leser: mensch -->

Vor jedem maschinellen Schreiben in eine Sitzung prüft die UI den Bildschirm: Erst wenn er eine leere Eingabezeile ohne Spinner und ohne Dialog zeigt, darf `/clear` und danach der Phasenbefehl eingefügt werden [Q: `ui/src/server/services/vorhaben-service.ts:697-714`, `:919-949`]. Die Prüfung `isIdlePrompt` kennt jedoch nur „wartet" und „alles andere", und „alles andere" wird pauschal als `arbeitet` gemeldet [Q: `ui/src/server/services/dialog-driver.ts:50-72`, `vorhaben-service.ts:712`]. Der Text dazu lautet „Sitzung arbeitet — warten" [Q: `ui/src/shared/types/vorhaben.protocol.ts:307`].

Messung am 18.09.2026 über zehn laufende Sitzungen (`tmux capture-pane`): Drei von vier ruhig wartenden Sitzungen tragen getippten Text in der Eingabezeile (`❯ npm run verify`, `❯ ja, leg den Entwurf an`, `❯ streich die zwei Zusagen bei Michael F`) — kein Spinner, kein Dialog. Genau diese drei lassen sich nicht starten und melden „arbeitet" [Q: Messung 18.09.2026, dokumentiert in `plan.md` §2].

Die Blockade selbst ist richtig: Ein `/clear`, das in eine gefüllte Zeile gepastet wird, verkettet sich mit dem vorhandenen Text (`ja, leg den Entwurf an/clear`) und geht so als Nachricht an Claude. Falsch ist allein die Benennung — und dass es keinen Weg heraus gibt außer dem Wechsel ins Terminal.

Zweiter, bisher unbemerkter Fehler derselben Funktion: Sie sucht mit `lines.some(…)` nach *irgendeiner* leeren `❯`-Zeile. Der Verlauf oberhalb enthält frühere Eingaben ebenfalls als `❯ …`-Zeilen [Q: `ui/tests/fixtures/tui/2.1.276/prompt-idle.txt:6,8,18`]. Eine leere Verlaufszeile über einer gefüllten Eingabebox gäbe damit fälschlich grünes Licht — genau die Verkettung, vor der die Prüfung schützen soll.

## 2. Betroffene

<!-- leser: mensch -->

- **Michael** als einziger Nutzer der UI: verliert heute Zeit mit Warten auf ein Ereignis, das nicht kommt, und muss die Ursache im Terminal selbst finden.
- **Agenten, die den Kasten bedienen:** bekommen eine Fehlermeldung, aus der sich keine Handlung ableiten lässt.

## 3. Ziele

<!-- leser: mensch -->

- Z-01: Die abgelehnte Phase nennt den wahren Grund und den gelesenen Zeileninhalt.
- Z-02: Die Prüfung schaut auf die echte Eingabezeile, nicht auf den Verlauf.
- Z-03: Der Weg heraus ist ein Klick, kein Terminalwechsel — sofern die Taste belegbar wirkt.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- NZ-01: Der Freitext-Pfad (`send`, Freigaben, Änderungen) wird **nicht** auf die strenge Prüfung gehoben. Dort besteht dieselbe Verkettungsgefahr, aber die Prüfung ist bewusst durchlässig (INT-2026-007); das zu ändern lehnt heute funktionierende Freigaben ab und ist eine eigene Entscheidung. Eigene Karte.
- NZ-02: Der Knopf wird nie von selbst ausgelöst; kein stillschweigendes Löschen von Tipparbeit.
- NZ-03: Kein Sperrgrund vorab am Knopf — der Zustandsleser hat keinen Bildschirm, und der Zeileninhalt ändert sich zwischen Broadcast und Klick.
- NZ-04: Keine Sanierung des losen Casts in `vorhaben-handler.ts:200` (vorbestehend, eigene Karte).

## 5. Abnahmekriterien

<!-- leser: mensch+agent -->

- AK-01: Trägt die Eingabezeile Text, meldet der Kasten „in der Eingabezeile der Sitzung steht noch Text: …" samt gekürztem Zeileninhalt — nicht „Sitzung arbeitet — warten".
- AK-02: In diesem Fall wird nichts in die Sitzung geschrieben (weder `/clear` noch der Befehl).
- AK-03: Nur die unterste `❯`-Zeile entscheidet. Ein Bildschirm mit leerer Verlaufszeile und gefüllter Eingabebox gilt als „nicht leer".
- AK-04: Spinner meldet weiter „arbeitet", ein Dialog weiter „Dialog"; der Vorrang Dialog vor Spinner bleibt wie heute.
- AK-05: Der Freitext-Pfad (`send`) lehnt eine gefüllte Eingabezeile weiterhin **nicht** ab (NZ-01 nachgewiesen).
- AK-06: Der Knopf „Eingabezeile leeren und starten" erscheint nur bei diesem Grund, zeigt den zu löschenden Text vor dem Klick und löst nur auf Klick aus.
- AK-07: Das Räumen schickt höchstens zwei Tasten und liest nach jeder nach; bleibt Text stehen, bricht es mit demselben Grund ab, ohne zu pasten.
- AK-08: Die Wirkung der Tasten ist durch eine Aufzeichnung belegt (Fixture). Ohne Beleg entfällt AK-06 und AK-07; dann wird Stufe 1 allein ausgeliefert und der Befund im PR vermerkt.

## 6. Randbedingungen

<!-- leser: mensch+agent -->

- RB-01: Die bestehende Reihenfolge im Schreibpfad bleibt: Die synchrone Schlussprüfung (Status, Zuordnung, Gesprächskennung) ist das Letzte vor dem Paste; das Räumen schiebt sich nicht dazwischen.
- RB-02: Alles unter der vorhandenen Schreibsperre (`withMachineWrite`), keine zweite Sperre, keine neue Reihenfolge (AR-03).
- RB-03: TypeScript strict, kein `any`; Präfix `aos-`; Backend-Meldungen deutsch mit echten Umlauten.
- RB-04: Die Messung der Tastenwirkung läuft in einer Wegwerf-Sitzung, nie in einer laufenden Sitzung von Michael.

## 7. Offene Fragen

<!-- leser: mensch -->

- OF-01: Keine. Die einzige Unsicherheit (Wirkung von Strg-U und Esc im Ink-Editor) ist keine Frage an Michael, sondern eine Messung — sie steht als erster Schritt der Stufe 2 im Plan.

## 12. Annahmen

<!-- leser: mensch+agent -->

- AN-01: Die unterste `❯`-Zeile ist die Eingabebox. Geprüft gegen dreizehn aufgezeichnete Bildschirme und zehn laufende Sitzungen, ohne Abweichung; ein Test über alle Fixtures hält die Annahme künftig fest.
- AN-02: Bei mehrzeiliger Eingabe trägt nur die erste Zeile das `❯`; sie bleibt damit die letzte Treffer-Zeile. Wird im Plan mit einer Aufzeichnung geprüft, soweit reproduzierbar.

## Änderungsprotokoll

| Version | Datum | Autor | Änderung |
|---|---|---|---|
| 0.1.0 | 2026-09-18 | Claude (Gespräch mit Michael) | Erstfassung nach Messung an zehn Sitzungen und externem Plan-Review |
