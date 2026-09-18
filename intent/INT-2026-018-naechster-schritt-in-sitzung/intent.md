---
intent_id: "INT-2026-018"  
titel: "UI: Nächster Schritt startet in der fertigen Sitzung — /clear, dann Befehl"  
status: "umgesetzt"  
version: "1.0.2"  
autor: "Michael Sindlinger (Feedback aus dem Gebrauch, 17.09.2026, zwei Screenshots, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-17"  
geaendert: "2026-09-18"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Größe S: eine Freigabe-Regel im Backend, ein Startweg über den vorhandenen gesicherten Schreibpfad, Hinweistext im Kasten; keine neuen Daten, kein neues Datenobjekt; Kern-Absicht direkt zu plan.md (CLAUDE.md Arbeitsweise)"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: "Specwright — Backlog Board · „PO-Entscheidung FA-12: Sitzung „wartet" ohne Review-Dokument — nächsten Schritt anbieten oder erst nach Schließen?" (Needs Discovery)"  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, vorhaben-seite, naechster-schritt, sitzung, clear, phase-5]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — im Chat: „Freigabe: intent.md 0.1.0", 17.09."  
  am: "2026-09-17"  

---

# Absicht: UI: Nächster Schritt startet in der fertigen Sitzung — /clear, dann Befehl

<!-- Ablage: intent/INT-2026-018-naechster-schritt-in-sitzung/intent.md · Bypass: Kern-Absicht, Plan in plan.md -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Ist eine Phase fertig (Absicht angenommen, Spec freigegeben, Plan freigegeben), startet Michael die nächste mit einem Klick auf der Vorhaben-Seite — statt die fertige Sitzung erst zu schließen oder `/clear` und den Befehl von Hand ins Terminal zu tippen.
- **Kernaufgaben:** (1) Der Knopf für den nächsten Schritt ist frei, sobald die Sitzung der vorigen Phase ruhig wartet. (2) Der Klick leert diese Sitzung (`/clear`) und startet darin den Befehl der nächsten Phase; Modell und Arbeitskopie bleiben. (3) Wählt Michael ein anderes Modell oder eine andere Arbeitskopie, startet eine neue Sitzung und die fertige wird geschlossen. (4) Eine Sitzung, die noch in ihrer Phase steckt oder einen Dialog zeigt, bleibt gesperrt.
- **Endzustand:** AK-01 bis AK-10 sind erfüllt; je Vorhaben läuft nach dem Klick genau eine Claude-Sitzung, und die Zuordnung Sitzung↔Schritt auf der Seite stimmt.

## 1. Problem und Anlass

<!-- leser: mensch -->

Unten auf der Vorhaben-Seite steht der Kasten „startet eine Sitzung mit `/specwright:plan INT-…`" mit Modellwahl, Arbeitskopie und Knopf [Q: `ui/frontend/src/components/vorhaben/aos-naechster-schritt.ts:212-234`]. Der Knopf ist ausgegraut, solange die Zeile `sessionBusy` meldet [Q: `ui/frontend/src/components/vorhaben/aos-vorhaben-seite.ts:800`]; das Backend setzt `sessionBusy`, sobald eine zugeordnete Sitzung lebt und in irgendeinem Zustand ist — arbeitet, wartet, wartet auf dich oder Dialog [Q: `ui/src/server/services/vorhaben-reader.ts:481-483`]. Eine Sitzung, die ihre Phase abgeschlossen hat und nur noch die Eingabeaufforderung zeigt, gilt als „wartet" [Q: `vorhaben-reader.ts:238-246`, Zweig `done`/`idle`] und sperrt den Knopf deshalb dauerhaft; frei wird er erst, wenn die Sitzung beendet ist [Q: `vorhaben-reader.ts:483`, Bedingung `!session.ended`]. Genau das zeigen die Screenshots vom 17.09.: die Absicht-Sitzung von INT-2026-017 meldet „done 20:51", der Kasten sagt „Sitzung arbeitet oder wartet — erst danach kann der nächste Schritt starten" [Q: Michael, Screenshots 17.09.2026].

So war es gebaut und bestätigt: INT-2026-010 FA-21 verlangt den Knopf „ausgegraut, solange eine Sitzung des Vorhabens arbeitet oder wartet" [Q: `intent/INT-2026-010-ui-vorhaben-als-mitte/spec.md:123`], von Michael am 16.09. angenommen [Q: `spec.md:219`, AN-S04]. Die Unbequemlichkeit ist seit dem E2E-Lauf am 15.09. bekannt und liegt als Karte im Board: „nächsten Schritt anbieten oder erst nach Schließen?" mit der Empfehlung, „wartet ohne Review-Dokument" wie „keine Sitzung" zu behandeln [Q: Vault, Specwright — Backlog Board, Zeile 129-132, Spalte Needs Discovery]. Dieses Vorhaben entscheidet die Karte — und geht einen Schritt weiter: nicht nur den Knopf freigeben, sondern die fertige Sitzung weiterverwenden.

Der Startweg legt heute immer eine neue Sitzung an [Q: `ui/src/server/services/vorhaben-service.ts:671-682`, `createSession`]; ein Weg, in eine bestehende Sitzung `/clear` und danach einen Befehl zu schicken, existiert nicht. Die Bausteine dafür gibt es: der gesicherte Schreibpfad für Freitext (Bildschirm stabil lesen, Dialog-Cue prüfen, Bracketed Paste, Enter unter dem Maschinen-Lock) [Q: `vorhaben-service.ts:585-626`, `pasteLocked`], und seit INT-2026-016 folgt die Zuordnung Sitzung↔Schritt einem getippten Phasen-Befehl von selbst [Q: `vorhaben-service.ts:812-826`, `onPromptText` → `moveAssignment`]. Ob eine Sitzung zu einer früheren Phase gehört, weiß nur das Backend: die Zuordnung trägt den Schritt [Q: `ui/src/server/services/vorhaben-state.ts:34-42`], die Sitzungsreferenz an den Browser nicht [Q: `ui/src/shared/types/vorhaben.protocol.ts:73-88`].

Warum nicht einfach eine zweite Sitzung neben der fertigen: der Cloud-Host erlaubt höchstens fünf Sitzungen [Q: `ui/src/server/services/cloud-terminal-manager.ts:673`] und jeder Claude-Prozess kostet dort RAM (AR-02 hat aus demselben Grund `npx` verbannt [Q: `docs/architecture.md:56`]); außerdem hätte das Vorhaben dann zwei Tabs, von denen einer tot ist.

Anlass: Feedback aus dem Gebrauch nach den Merges von INT-2026-016 (PR #73–#75, 17.09.2026); Michael arbeitet seitdem den Vorhaben-Flow durchgehend in der UI und stößt bei jedem Phasenwechsel auf die Sperre.

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael auf der Vorhaben-Seite (Mac und Handy — derselbe Kasten) | Nach einer fertigen Phase ist der Knopf frei; der Klick arbeitet in der laufenden Sitzung weiter |
| Michael im angedockten Terminal | Die Sitzung zeigt `/clear`, dann den Befehl — so, als hätte er es getippt; der Tab heißt danach nach dem neuen Schritt |
| Systeme | Web-UI-Backend (Freigabe-Regel der Zeile, Startweg „in Sitzung", Schließen der alten Sitzung), Frontend-Kasten (Hinweistext); Sitzungs-Manager unverändert |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Nach jeder fertigen Phase startet die nächste mit einem Klick — ohne Schließen, ohne Tippen im Terminal.
- **Z-02:** Nach dem Klick läuft je Vorhaben genau eine Claude-Sitzung; eine fertige Sitzung bleibt nicht als zweiter Tab liegen.
- **Z-03:** Ein laufendes Interview, eine Rückfrage oder ein Dialog geht durch den Knopf nie verloren.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Kein Modellwechsel innerhalb einer Sitzung (`/model`); anderes Modell oder anderer Provider bedeutet neue Sitzung (AK-05).
- **NZ-02:** Keine Änderung am Freigabe-Weg (Knopf „Freigeben", INT-2026-010 FA-22) und an „Neue Absicht".
- **NZ-03:** Kein Bestätigungsdialog vor dem Leeren — der Knopf ist nur frei, wenn die Sitzung ihre Phase hinter sich hat (AK-01, AK-03).
- **NZ-04:** „Bau fortsetzen" bei unterbrochenem Bau (`build-stand.md`) bleibt wie heute — neue Sitzung, ohne die alte zu schließen; ob dort ebenfalls geschlossen werden soll, ist ein eigenes Vorhaben.
- **NZ-05:** Kein automatisches Schließen fertiger Sitzungen ohne Klick; die Sitzung bleibt, bis Michael den nächsten Schritt startet oder sie selbst schließt.
- **NZ-06:** Keine Änderung an Glocke, Übersicht-Zeile oder Terminal über das hinaus, was aus der neuen Zuordnung folgt (Schritt, Tab-Name).

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn die zugeordnete Sitzung eines Vorhabens zu einer früheren Phase gehört als der nächste Schritt und ruhig wartet (kein Dialog, keine Freigabe offen, keine Ersteingabe ausstehend), MUSS der Knopf für den nächsten Schritt bedienbar sein. | Z-01 | Test |
| AK-02 | Solange die zugeordnete Sitzung arbeitet oder einen Dialog zeigt (Rückfrage, Plan-Entscheidung, Berechtigung), MUSS der Knopf gesperrt bleiben und der Kasten den Grund nennen. | Z-03 | Test |
| AK-03 | Solange die zugeordnete Sitzung zur selben Phase gehört wie der nächste Schritt (etwa die Spec-Sitzung wartet auf die Antwort zur `spec.md`), MUSS der Knopf gesperrt bleiben. | Z-03 | Test |
| AK-04 | Wenn der Knopf gedrückt wird und Modell und Arbeitskopie im Kasten denen der Sitzung entsprechen, MUSS das System in dieser Sitzung das Gespräch leeren (`/clear`) und danach den Befehl des nächsten Schritts starten. | Z-01, Z-02 | Test + E2E |
| AK-05 | Wenn der Knopf gedrückt wird und Modell oder Arbeitskopie im Kasten von der Sitzung abweichen, MUSS das System eine neue Sitzung mit dem Befehl starten und die bisherige Sitzung schließen. | Z-02 | Test |
| AK-06 | Wenn nach AK-04 der Befehl läuft, MUSS die Vorhaben-Seite binnen 2 s ab Start dieselbe Sitzung als Sitzung des neuen Schritts zeigen (Tab-Name nach dem Schritt, Zustand „arbeitet"). | Z-01 | Test |
| AK-07 | Solange der Knopf frei ist, MUSS der Kasten sagen, was der Klick tut: „in der laufenden Sitzung: `/clear`, dann Befehl" oder „in einer neuen Sitzung", je nach Wahl von Modell und Arbeitskopie. | Z-01 | Test + Screenshot |
| AK-08 | Falls das Leeren oder der Befehl nicht in die Sitzung geschrieben werden kann (Sitzung beendet, Bildschirm nicht lesbar, Dialog aufgetaucht), dann MUSS das System das im Kasten melden; der Knopf bleibt bedienbar und ein erneuter Klick versucht es erneut. | Z-03 | Test |
| AK-09 | Wenn ein Schritt nach AK-04 oder AK-05 gestartet wurde, MUSS beim nächsten Öffnen des Kastens für diesen Schritt das dabei genutzte Modell vorausgewählt sein (wie heute beim Start einer neuen Sitzung, INT-2026-010 FA-40). | Z-01 | Test |
| AK-10 | Wenn keine Sitzung des Vorhabens lebt, MUSS der Knopf wie heute eine neue Sitzung mit dem Befehl starten. | Z-01 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | Eingaben in eine laufende Sitzung gehen nur über den vorhandenen gesicherten Schreibpfad (stabiler Bildschirm, Dialog-Cue-Prüfung, Bracketed Paste unter dem Maschinen-Lock `withMachineWrite`). Grund: zwei Maschinen-Schreiber dürfen sich nicht zwischen Paste und Enter schieben; ein Dialog darf nie eine Eingabe schlucken. | `docs/architecture.md` §2 Backend-Zeile (INT-2026-007); `vorhaben-service.ts:585-626` |
| RB-02 | Technik | Die Freigabe-Regel des Knopfs (AK-01–AK-03) entscheidet das Backend und liefert sie mit der Zeile; der Browser rechnet sie nicht nach. Grund: nur das Backend kennt den Schritt der Zuordnung; gleiche Sicht auf jedem Gerät. | `docs/architecture.md` AR-05 |
| RB-03 | Betrieb | Der Klick darf auf dem Cloud-Host keine zweite Claude-Sitzung neben einer fertigen erzeugen. Grund: Sitzungsdeckel fünf, RAM-Grenze des Droplets. | `cloud-terminal-manager.ts:673`; AR-02-Begründung |

## 7. Offene Fragen

<!-- leser: mensch -->

Keine. Zwei Rückfragen am 2026-09-17 entschieden (PO): Modell/Arbeitskopie bei Wiederverwendung → AK-04, AK-05, NZ-01 („gleich: `/clear`; anders: neue Sitzung, alte schließen") · Freigabe-Regel → AK-01, AK-03, NZ-03 („nur Sitzung einer früheren Phase, ruhig wartend; gleiche Phase bleibt gesperrt").

---

## 12. Annahmen

<!-- leser: mensch -->

- **AN-01:** `/clear` ist ein lokaler Befehl von Claude Code und löst keinen Stop-Hook aus; dass die Eingabeaufforderung wieder steht, ist nur am Bildschirm erkennbar. Der Schreibpfad liest den Bildschirm vor jeder Eingabe ohnehin stabil [Q: `ui/src/server/services/dialog-driver.ts:82`, `readStableScreen`]. Prüfung: im Plan Mode; E2E zu AK-04.
- **AN-02:** Das Modell einer Sitzung ist das beim Start gesetzte [Q: `vorhaben-service.ts:1000`, `live.modelConfig?.model`]; ein von Hand im Terminal getipptes `/model` sieht die UI nicht. Für den Vergleich in AK-04/AK-05 gilt das Startmodell. Prüfung: Michael; stört es, wird `/model`-Erkennung ein eigenes Vorhaben.
- **AN-03:** Der gepastete Phasen-Befehl verschiebt die Zuordnung auf den neuen Schritt wie ein getippter [Q: `vorhaben-service.ts:812-826`]; nur der Tab-Name und das gemerkte Modell (AK-06, AK-09) brauchen einen eigenen Handgriff. Prüfung: Test zu AK-06 im Plan.
- **AN-04:** Eine ruhig wartende Sitzung einer früheren Phase hat nichts mehr zu sagen — Freigabe und Commit sind durch; ihr Gespräch darf ohne Nachfrage geleert werden (NZ-03). Prüfung: Michael nach einer Woche Gebrauch; sonst Bestätigungsdialog als Nachtrag.

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.2 | 2026-09-18 | Umgesetzt: PR #82 gemerged (`289f831`), CI-Check `verify` grün. AK-01–AK-10 und NZ-04 mit Tests belegt (Reader-Regel `deriveNextStepSperre`, Service-Weiche, Kasten); E2E mit Haiku: Klick leert die laufende Sitzung und startet den Phasen-Befehl darin (764 ms bis zur neuen Zuordnung, keine zweite Sitzung), anderes Modell schließt die alte wie per ✕, ausbleibende Bestätigung meldet „Leeren nicht bestätigt" ohne den Befehl zu senden (plan.md §8, Protokoll und Screenshots unter `design/`). Kopf-Version 1.0.1 war im Kopf nicht nachgezogen worden — mit dieser Zeile korrigiert. Offen: Prüfung nach dem Deploy (AN-01/AN-04, plan.md §10) | alle | PO, 2026-09-18 |
| 1.0.1 | 2026-09-18 | `bezuege.plan` gesetzt — Plan freigegeben (PO, im Chat: „freigabe, O1 wie vorgeschlagen"); Korrektur aus dem Plan (§2/F1): der Sitzungsdeckel „höchstens fünf" in §1/RB-03 ist seit `1cc2f1a` (18.02.2026) aufgehoben, RB-03 stützt sich auf das RAM-Argument | RB-03 | PO, 18.09. |
| 1.0.0 | 2026-09-17 | Angenommen ohne Änderung am Entwurf; Bypass ja (Größe S) → direkt `/plan`. Abgleich Mensch/Agent: ohne Befund (Kopf S/niedrig/Bypass deckt Endzustand AK-01–AK-10; keine Vertragsschicht bei niedrig, §12 Annahmen tragen die Prüfwege) | alle | PO, 17.09. |
| 0.1.0 | 2026-09-17 | Entwurf nach Gespräch; zwei Rückfragen mit den Vorschlägen entschieden | alle | — |
