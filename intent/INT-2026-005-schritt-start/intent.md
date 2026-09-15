---
intent_id: "INT-2026-005"  
titel: "Nächster Schritt aus der Web-UI: Sitzung sichtbar im Vollbild, Befehl mit specwright:-Präfix"  
status: "angenommen"  
version: "1.0.0"  
autor: "Claude (aus Michaels Test 15.09. 22:40, Board-Karten Quick Wins)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-15"  
geaendert: "2026-09-15"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Zwei Bugs in frisch gemergtem Code (INT-2026-004), Aufwand unter einem halben Tag; das fachliche Verhalten ist in INT-2026-004 spec.md Ablauf E Schritt 6 und FA-35 festgelegt"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: "intent/INT-2026-004-ui-vorhaben-sicht/spec.md (Ablauf E, FA-35, FA-21)"  
  plan: "plan.md"  
  board_karte: "Specwright — Backlog Board · Quick Wins „„Absicht beginnen“ / nächster Schritt: neue Sitzung landet nicht sichtbar“ und „Nächster Schritt tippt `/intent` statt `/specwright:intent`“"  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, cloud-terminal, vorhaben, naechster-schritt, bypass]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — Bau beauftragt („Mach A1“, Board-Sitzung 15.09.)"  
  am: "2026-09-15"  

---

# Absicht: Nächster Schritt aus der Web-UI — Sitzung sichtbar im Vollbild, Befehl mit `specwright:`-Präfix

<!-- Ablage: intent/INT-2026-005-schritt-start/intent.md -->

## Absicht in drei Sätzen

- **Zweck:** Wer in der Web-UI „Absicht beginnen", „Spec schreiben", „Plan erstellen" oder „Bau starten" drückt, soll die gestartete Claude-Sitzung sofort vor sich haben — im Vollbild, als Einzelansicht, mit dem richtigen Projekt — und die Sitzung soll den Befehl ausführen, den Claude Code kennt.
- **Kernaufgaben:** (1) Nach dem Start die Sitzung wie mit ⌘⇧↩ allein auf die Fläche holen (Vollbild, im Split-Layout ins Pane ihres Projekts und dieses Pane zoomen, im Einzel-Layout Projekt wechseln und Reiter wählen); (2) den Befehl mit Namensraum senden und anzeigen (`/specwright:intent`, `/specwright:spec INT-…`, …) statt der Kurzform.
- **Endzustand:** AK-01 bis AK-04 erfüllt; keine Änderung an Spec-Anforderungen, nur eine Fußnote zur Schreibweise der Befehle.

## 1. Problem und Anlass

Michael hat am 15.09. um 22:40 nach dem Merge von INT-2026-004 auf der Projekt-Seite „Absicht beginnen" gedrückt. Zwei Befunde [Q: Michael im Chat, Board-Sitzung 15.09.]:

1. Die Terminal-Seitenleiste öffnet, aber die neue Sitzung ist nicht zu sehen. `app.ts:1741-1751` setzt nur `activeTerminalSessionId` und `isTerminalSidebarOpen` [Q: `ui/frontend/src/app.ts`, `origin/main` `ed29667`]. Im Split-Layout sind die Panes an Projekte gebunden; `_reconcilePanes` (`aos-cloud-terminal-sidebar.ts:1854-1941`) weist nur „+"-Sitzungen (`_pendingNewSession`) und Restore-Projekte zu — eine Vorhaben-Sitzung bekommt kein Pane. Im Einzel-Layout zeigt die Seitenleiste nur die Sitzungen des aktiven Projekts (`app.ts:799` `projectTerminalSessions`); startet Michael aus der projektübergreifenden Übersicht einen Schritt für ein anderes Projekt, bleibt der Reiter unsichtbar. Vollbild (`isFullscreen`, `:2360`) und Zoom (`_zoomPane`, `:1446`) werden nicht gesetzt. Die Glocke kann das alles bereits: `_jumpToNotification` (`:1636-1682`) mit `resolveJumpTarget` (`agent-notifications.ts:124`) löst Einzel-/Split-Fälle inklusive Projektwechsel — nur ohne Vollbild und ohne erzwungenen Zoom.
2. Als erste Eingabe tippt die Sitzung `/intent`. Die Befehle liegen unter `.claude/commands/specwright/` und heißen in Claude Code `/specwright:intent`, `/specwright:spec` usw. [Q: Skill-Liste dieser Sitzung; `~/.claude/commands/specwright/intent.md`]. Getting Started macht es richtig (`aos-getting-started-view.ts:80` `specwright:${command}`). Kurzform an drei Quellen: `vorhaben-service.ts:444` (getippt), `vorhaben-reader.ts:144-148` (`deriveNextStep`, Anzeige in der Übersicht), `aos-naechster-schritt.ts:205` (Anzeige am Knopf) und `aos-projekt-seite.ts:242,245`. `V4_COMMAND_RE` (`vorhaben-service.ts:130`) akzeptiert beide Formen — die Zuordnung Sitzung → Vorhaben (FA-21) ist nicht betroffen.

Die Spec schreibt `/intent`, `/spec INT-…` als Kurznamen der Phasen (Ablauf E Schritt 2, FA-21 „auch in der langen Form mit Präfix"); `CLAUDE.md` ebenso. Das ist eine Doku-Konvention, kein Claude-Code-Befehl.

## 2. Betroffene

| Wer oder was | Was ändert sich |
|---|---|
| Michael am Mac (Web-UI, Vorhaben-Seite, Projekt-Seite) | Nach Klick auf den nächsten Schritt liegt die neue Sitzung allein im Vollbild vor ihm; der Befehl läuft |
| Michael am Handy | unverändert (die Vorhaben-Seite stoppt das Ereignis, Toast „Sitzung gestartet") |
| Systeme | `ui/frontend/src/app.ts`, `aos-cloud-terminal-sidebar.ts`, `agent-notifications.ts`, `aos-naechster-schritt.ts`, `aos-projekt-seite.ts`; `ui/src/shared/types/vorhaben.protocol.ts`, `ui/src/server/services/{vorhaben-service,vorhaben-reader}.ts` |

## 3. Ziele

- **Z-01:** Nach dem Start eines Schritts ist die neue Sitzung am Mac sofort allein sichtbar — Vollbild, richtiges Projekt, ein Pane (Ablauf E Schritt 6, FA-35).
- **Z-02:** Der getippte und der angezeigte Befehl ist der, den Claude Code ausführt.

## 4. Nicht-Ziele

- **NZ-01:** Kein Umbau der Pane-Logik, der Glocke oder des Layout-Speichers; das Vollbild bleibt wie heute nicht persistent.
- **NZ-02:** Keine Änderung an Spec-Anforderungen von INT-2026-004; `/intent` bleibt als Kurzname in Spec, `CLAUDE.md` und Vorlagen stehen (Fußnote in der Spec).
- **NZ-03:** Kein Handy-Verhalten (dort bleibt Michael auf der Vorhaben-Seite, AN-S19).

## 5. Abnahmekriterien

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn am Mac ein Schritt gestartet wird und die Seitenleiste im Split-Layout steht, MUSS die neue Sitzung im Pane ihres Projekts (sonst im betrachteten Pane) liegen, dieses Pane gezoomt und die Seitenleiste im Vollbild sein. | Z-01 | Test (Unit `soloJumpTarget`, Komponente `showSessionSolo`) + Playwright |
| AK-02 | Wenn am Mac ein Schritt für ein anderes als das aktive Projekt gestartet wird und die Seitenleiste im Einzel-Layout steht, MUSS die UI auf dieses Projekt wechseln und die Sitzung als aktiven Reiter im Vollbild zeigen. | Z-01 | Test (Komponente: `session-jump`) + Playwright |
| AK-03 | Die erste Eingabe einer gestarteten Sitzung MUSS `/specwright:<schritt>` lauten, bei spec/plan/build gefolgt von der Kennung. | Z-02 | Test (`vorhaben-service-stage2`, `createSession`-Argument) |
| AK-04 | Jede Anzeige des nächsten Schritts (Übersicht, Vorhaben-Seite, Projekt-Seite) MUSS denselben Befehl mit Präfix zeigen. | Z-02 | Test (`vorhaben-reader`, `aos-vorhaben-stage2`) |

## 6. Randbedingungen

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | TypeScript strict, kein `any`; Präfix `aos-`; Frontend und Backend teilen die Befehlsform über `ui/src/shared/types` | `CLAUDE.md` Konventionen |
| RB-02 | Technik | Bugfix: fehlschlagender Test vor dem Fix, `.claude/fix-mode` nach den Tests; Bezugsliste `known-failures.txt` unangetastet | `CLAUDE.md`, Hook `protect-tests` |
| RB-03 | Betrieb | Merge nach `main` löst den Auto-Deploy der UI aus — Merge ist Michaels Schritt | `CLAUDE.md` „Nie" |

## 7. Offene Fragen

Keine.

---

## Änderungsprotokoll

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-15 | Kern-Schicht, Bypass (zwei Bugs aus Michaels Test, Größe S) | alle | Product Owner, 15.09. („Mach A1") |
