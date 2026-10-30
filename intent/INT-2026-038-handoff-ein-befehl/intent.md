---
intent_id: "INT-2026-038"  
format: "2.3"  
titel: "Sitzungswechsel per Handoff in einem Schritt"  
status: "angenommen"  
version: "1.0.0"  
autor: "Michael"  
verantwortlich: "Michael (Product Owner)"  
erstellt: "2026-10-29"  
geaendert: "2026-10-29"  
freigabe:  
  von: "Michael (Product Owner)"  
  am: "2026-10-29"  
risikoklasse: "niedrig"  
groesse: "M"  
bypass: "nein"  
bypass_grund: ""  
bezuege:  
  product: "docs/product-brief.md"  
  spec: "spec.md"  
  plan: "plan.md"  
  tracker: ""  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [handoff, cloud-terminal, sitzungswechsel]  

---

# Absicht: Sitzungswechsel per Handoff in einem Schritt

<!-- Ablage: intent/INT-2026-038-handoff-ein-befehl/intent.md -->

## Felder im Kopf

<!-- leser: agent -->

| Feld | Bedeutung | Werte |
|---|---|---|
| `intent_id` | stabile Kennung, nie wiederverwenden | `INT-JJJJ-NNN` |
| `titel` | 5 bis 80 Zeichen | — |
| `status` | Lebenszyklus | `entwurf` · `in_klaerung` · `angenommen` · `umgesetzt` · `abgeloest` · `verworfen` |
| `format` | Formatversion der Vorlage, aus der die Datei entstand; nie von Hand setzen oder erhöhen; Regel: `specwright/templates/sdlc/README.md`, Abschnitt „Formatversion" | `"2.3"` |
| `version` | Fassung dieser Absicht, nicht der Vorlage; SemVer, Regeln im Änderungsprotokoll; Datum und Version immer in Anführungszeichen | `"0.1.0"` |
| `verantwortlich` | Rolle, die annimmt und bei Eskalation entscheidet (Pflicht) | — |
| `risikoklasse` | ab `mittel` gilt die Vertragsschicht (Abschnitte 8–12) | `niedrig` · `mittel` · `hoch` |
| `groesse` | Aufwand | `S` unter 1 Tag · `M` 1–5 Tage · `L` über 5 Tage |
| `bypass` | `ja` bei Bugfix oder Größe S: direkt zu `plan.md`, keine `spec.md`; Grund in `bypass_grund` | `ja` · `nein` |
| `bezuege` | Pfade zu Produkt, Spec, Plan, ADRs; `tracker` = Tracker-Eintrag des Projekts (`repo#nr` oder Trello-Karte; technischer Arbeitsstand); `board_karte` = Boardname und Kartentitel, nur bei Internem oder als grobe Vorhaben-Karte in Projekten mit Fahrplan-Seite; `ersetzt` = Vorgänger-Intent | — |
| `schlagworte` | kleinbuchstaben-mit-bindestrich | — |
| `kennung_hinweis` | optional (INT-2026-022): steht nur, wenn `next-intent-id.sh` die Kennung ohne entfernten Stand vergeben hat (kein Netz, Fetch gescheitert oder abgeschaltet) — beim Push auf Kollision prüfen | `"ohne entfernten Stand vergeben (JJJJ-MM-TT)"` |

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Michael wechselt im Cloud-Terminal der Web-UI oft per Handoff in eine frische Sitzung und tippt dafür heute drei Befehle nacheinander; künftig reicht ein Befehl oder ein Knopfdruck.
- **Kernaufgaben:** Handoff schreiben lassen, Sitzung erst danach leeren, Handoff in der neuen Sitzung nur einlesen; beide Handoff-Skills mit Specwright ausliefern.
- **Endzustand:** Ein Auslöser genügt, die neue Sitzung zeigt die Kurzfassung und wartet (AK-01 bis AK-03); schlägt ein Schritt fehl, bleibt die alte Sitzung erhalten (AK-04 bis AK-06).

## 1. Problem und Anlass

<!-- leser: mensch -->

Michael ruft `/session-handoff` regelmäßig im Cloud-Terminal der Specwright-Web-UI auf und muss danach von Hand `/clear` und `/start-from-handoff nur lesen` tippen, bevor er weiterarbeiten kann [Q: Michael, 2026-10-29]. Der Skill selbst verweist auf genau diese zwei Folgeschritte [Q: ~/.claude/skills/session-handoff/SKILL.md, Workflow Schritt 4]. Ein Skill kann `/clear` nicht selbst auslösen, eingebaute Befehle tippt nur, wer ins Terminal schreibt [Likely]. Die Web-UI kann das bereits: Beim Phasenwechsel eines Vorhabens fügt sie `/clear` ein, wartet auf die neue Gesprächskennung aus dem SessionStart-Hook und schickt erst dann den nächsten Befehl, jeweils nur bei leerer Eingabezeile ohne laufende Runde [Q: ui/src/server/services/vorhaben-service.ts:1098-1145], [Q: ui/src/server/services/vorhaben-service.ts:243-249]. Beide Handoff-Skills liegen am Mac nur global unter `~/.claude/skills/` und werden nicht über das Manifest ausgeliefert [Q: specwright/manifest.tsv, keine Zeile `handoff`]. Für den Cloud-Host spielt `setup-ui-cloud.sh` eine ältere `session-handoff`-Fassung aus `cloud-deploy/claude-user-skills/` ein, die das Handoff im Terminal zum Kopieren ausgibt statt als Datei; `start-from-handoff` fehlt dort [Q: setup-ui-cloud.sh:236-253], [Q: cloud-deploy/claude-user-skills/session-handoff/SKILL.md:9-15]. Welche Fassung auf dem Cloud-Host heute tatsächlich liegt, ist nicht geprüft [Uncertain]. `start-from-handoff` beginnt ohne Zusatz sofort mit dem nächsten Schritt [Q: ~/.claude/skills/start-from-handoff/SKILL.md, Workflow Schritt 5]; deshalb hängt Michael heute „nur lesen" an.

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael im Cloud-Terminal (Cloud-Host und Mac) | ein Befehl oder ein Knopf statt drei Eingaben |
| Michael im nackten Claude-Code-Terminal | nichts; `/session-handoff` und `/start-from-handoff` bleiben einzeln nutzbar |
| Projekte, die Specwright installieren | bekommen die zwei Handoff-Skills und den neuen Befehl |
| Systeme | Web-UI Backend (Sitzungen, Hooks), Web-UI Frontend (Terminal-Leiste), Lieferumfang (`specwright/manifest.tsv`, Installer), Cloud-Einrichtung (`setup-ui-cloud.sh`, `cloud-deploy/claude-user-skills/`) |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Der Wechsel in eine frische Sitzung mit Handoff braucht im Cloud-Terminal genau einen Auslöser.
- **Z-02:** Die neue Sitzung liest das Handoff nur ein und wartet auf Michael.
- **Z-03:** Kein Kontextverlust: geleert wird nur, wenn das Handoff vorher wirklich geschrieben wurde.
- **Z-04:** Die Handoff-Skills kommen mit Specwright in jedes Projekt und auf den Cloud-Host.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Kein automatisches Auslösen (etwa bei vollem Kontext); nur Michael startet den Wechsel.
- **NZ-02:** Keine Änderung am Format der Handoff-Datei und an ihrem Ablageort `.claude/handoffs/`.
- **NZ-03:** Kein Ein-Schritt-Ablauf im nackten Claude-Code-Terminal außerhalb der Web-UI.
- **NZ-04:** Kein Aufräumen oder Löschen alter Handoff-Dateien.
- **NZ-05:** Kein eigener Knopf in der mobilen Tastenleiste; dort funktioniert der Befehl.
- **NZ-06:** Keine Unterstützung für fremde Agenten-CLIs (Codex u. a.) in Sitzungen ohne Hooks.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn Michael in einer wartenden Claude-Sitzung des Cloud-Terminals den Handoff-Knopf der Terminal-Leiste drückt, MUSS das System ohne weitere Eingabe ein Handoff schreiben lassen, die Sitzung leeren und das neue Handoff in der geleerten Sitzung einlesen lassen. | Z-01 | Test + Stichprobe |
| AK-02 | Wenn Michael den neuen Handoff-Befehl in einer Claude-Sitzung des Cloud-Terminals eingibt, MUSS das System dieselbe Folge wie in AK-01 ausführen. | Z-01 | Test + Stichprobe |
| AK-03 | Nach dem Einlesen MUSS die neue Sitzung eine Kurzfassung (Kontext, offene Aufgaben, nächster Schritt) zeigen und auf Michaels Eingabe warten, ohne Dateien zu ändern oder den nächsten Schritt zu beginnen. | Z-02 | Stichprobe |
| AK-04 | Falls nach dem Handoff-Schritt keine neue Handoff-Datei vorliegt, DARF das System die Sitzung NICHT leeren und MUSS Michael den Grund im Terminal-Bereich anzeigen. | Z-03 | Test |
| AK-05 | Solange die Sitzung arbeitet, einen Dialog zeigt oder Text in der Eingabezeile steht, DARF der Knopf nichts in die Sitzung schreiben; das System MUSS den Grund anzeigen. | Z-03 | Test |
| AK-06 | Falls das Leeren der Sitzung nicht bestätigt wird, DARF das System den Einlese-Befehl NICHT senden und MUSS das melden. | Z-03 | Test |
| AK-07 | Die über AK-01 oder AK-02 entstandene Handoff-Datei MUSS dasselbe Format und denselben Ablageort haben wie eine über `/session-handoff` entstandene. | Z-01 | Review |
| AK-08 | Das System MUSS die Skills `session-handoff`, `start-from-handoff` und den neuen Befehl über den Lieferumfang des Installers ausliefern, auf dem Cloud-Host in der Fassung mit Handoff-Datei; `/session-handoff` und `/start-from-handoff` MÜSSEN einzeln wie bisher funktionieren. | Z-04 | Test (Manifest-Guard, Installer-Test) |
| AK-09 | Das System MUSS den Handoff-Knopf nur in Claude-Sitzungen anbieten. | Z-01 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | Eingaben der UI in eine Sitzung nur als Bracketed Paste unter dem Maschinen-Lock nach Bildschirmprüfung; Grund: bestehende Schreibregel. | `docs/architecture.md` AR-08, Zeile 35 |
| RB-02 | Technik | Neue ausgelieferte Dateien bekommen eine Zeile in `specwright/manifest.tsv`; kein Installer bekommt eine eigene Liste. | `docs/architecture.md` AR-01, `CLAUDE.md` Konventionen |
| RB-03 | Sicherheit | Repo ist öffentlich: Skills enthalten keine Hostnamen, Pfade oder Nutzer des Cloud-Hosts. | `docs/security.md` |
| RB-04 | Betrieb | Merge nach `main` startet den Auto-Deploy der UI; Merge ist Michaels Schritt. | `CLAUDE.md` „Nie" |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | *entschieden 2026-10-29 (Michael):* Befehl heißt `/handoff-weiter` (AK-02). | nein | Michael | — |
| OF-02 | *entschieden 2026-10-29 (Michael):* Repo-Fassung übernimmt den heutigen Inhalt unverändert; globale Kopien unter `~/.claude/skills/` bleiben unangetastet, Projektfassung geht vor (AK-08). | nein | Michael | — |
| OF-03 | *entschieden 2026-10-29 (Michael):* eine Quelle im Repo; alte Cloud-Kopie wird ersetzt oder entfällt zugunsten des Manifests — Wahl in der Spec mit Beleg zur Ladereihenfolge Projekt/Nutzer (AK-08). | nein | Michael | — |

---

## Review-Entscheidungen

<!-- leser: mensch -->

| Befund | Prüfer | Schweregrad | Entscheidung | Beleg oder Person, Datum |
|---|---|---|---|---|
| B1 Platzhalter ohne Inhalt | alle 4 | BLOCKER | erledigt: Inhalt geschrieben | intent.md §1–§7 (0.1.0) |
| B2 Bestehender Skill, drei Handgriffe | alle 4 | BLOCKER | angenommen, steht in §1; ergänzt um alte Cloud-Fassung | §1, setup-ui-cloud.sh:236-253 |
| B3 AK von außen beobachtbar | sonnet, opus | BLOCKER | angenommen; AK-01…AK-09 beschreiben Verhalten | §5 |
| B4 clearAndPaste wiederverwenden | sonnet, opus | LIKELY | angenommen, Grundlage des Vorhabens | §1, vorhaben-service.ts:1098-1145 |
| B5 Erstes-Eingabe-Pfad (setFirstInput) wiederverwenden | minimax, glm | LIKELY | abgelehnt als Hauptweg (`/clear` in derselben Sitzung behält Terminal und Arbeitskopie); Spec prüft es als Alternative | Michael, 2026-10-29 |
| B6 „Für das Board"-Block zusammenlegen (DROP) | sonnet, opus | LIKELY | abgelehnt: anderer Zweck (Abschlussbericht vs. Weiterarbeiten), Format bleibt (NZ-02) | Michael, 2026-10-29 |
| B7 Kein zweites Handoff-Format (DROP) | sonnet, opus | LIKELY | angenommen, ist NZ-02 | §4 NZ-02 |
| B8 Kleinste Lösung ohne neue UI | sonnet, opus | LIKELY | abgelehnt: Knopf und Befehl ausdrücklich gewünscht; dahinter bestehender Clear-Ablauf | Michael, 2026-10-29 |
| B9 Über /intent schreiben, neu prüfen | sonnet, opus | LIKELY | erledigt | diese Datei |
| B10 Sperre gegen Review eines Platzhalters | opus | LIKELY | angenommen als eigenes Issue im Tracker, nicht in diesem Vorhaben | Michael, 2026-10-29 |
| B11 Nur SessionStart-Hook, ohne UI | sonnet | MINOR | abgelehnt: `/clear` bleibt Handgriff, Z-01 verfehlt | §3 Z-01 |
| B12 Keine UI vor kleineren Wegen (DROP) | sonnet | MINOR | abgelehnt (wie B8) | Michael, 2026-10-29 |
| B13 Nicht neu reservieren | glm | MINOR | erledigt: Inhalt in den reservierten Ordner geschrieben | intent/INT-2026-038-handoff-ein-befehl/ |
| B14 Größe S | glm | MINOR | abgelehnt: M bleibt (Knopf, Befehlserkennung, zwei Auslieferungswege, Tests) | Michael, 2026-10-29 |
| B15 Eingang von außen (INT-2026-030) wiederverwenden | minimax | MINOR | abgelehnt: startet neue Sitzung in neuer Arbeitskopie, nur macOS, standardmäßig aus | docs/architecture.md:35 („Eingang von außen") |
| B16 Transkript-Leser (findTranscript) | minimax | MINOR | abgelehnt: Handoff kommt aus der Datei; Backend liest kein Transkript | docs/architecture.md:35 („kein Transkript-Leser, INT-2026-011") |
| B17 Sitzung zeigen statt neu einlesen | minimax | MINOR | abgelehnt: außerhalb des Umfangs | Michael, 2026-10-29 |
| B18 Namenskollision „Handoff" | minimax | MINOR | abgelehnt: Dev-Team nutzt Dateinamen `frontend-handoff.md`, kein Befehl gleichen Namens | .claude/agents/frontend-dev.md:109 |
| B19 Neue Gesprächskennung nach /clear | opus | MINOR | angenommen, deckt clearAndPaste ab (wartet auf neue Kennung) | vorhaben-service.ts:1119-1131 |
| B20 INT-2026-038 auf anderem Zweig | opus | MINOR | erledigt: kein Zweig (lokal/entfernt) trägt INT-2026-038 | `git ls-tree` über alle Refs, 2026-10-29 |

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-10-29 | Angenommen; OF-01…OF-03 und offene Review-Befunde nach Empfehlung entschieden. Abgleich Mensch/Agent: ohne Befund (Risikoklasse niedrig, keine Vertragsschicht; Kopf groesse M/bypass nein passt zu §1–§5) | OF-01…OF-03, B5–B17 | Michael, 2026-10-29 |
| 0.2.0 | 2026-10-29 | Review (4 Prüfer) eingearbeitet; alte Cloud-Fassung des Skills in §1, AK-08 um Cloud-Host ergänzt, OF-03 | §1, §2, AK-08, OF-03 | — |
| 0.1.0 | 2026-10-29 | Entwurf nach Gespräch (Ort Cloud-Terminal, nur lesen, Befehl und Knopf, Auslieferung über Manifest) | alle | — |
