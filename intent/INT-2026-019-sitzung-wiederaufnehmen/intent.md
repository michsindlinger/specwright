---
intent_id: "INT-2026-019"  
titel: "UI: Verlorene Sitzung eines Vorhabens beim Öffnen wieder aufnehmen"  
status: "umgesetzt"  
version: "1.0.2"  
autor: "Michael Sindlinger (Feedback aus dem Gebrauch nach dem Rechner-Absturz am 17.09.2026, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-17"  
geaendert: "2026-09-18"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Größe S: eine Wiederaufnahme-Regel im Backend über den vorhandenen Startpfad, eine Schutzregel im Aufräumer der Sitzungs-Arbeitskopien, ein Feld in der Zuordnung; keine neuen Datenobjekte; Kern-Absicht direkt zu plan.md (CLAUDE.md Arbeitsweise)"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, vorhaben-seite, sitzung, wiederaufnahme, worktree, neustart, phase-5]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — im Chat: „freigabe", 17.09."  
  am: "2026-09-17"  

---

# Absicht: UI: Verlorene Sitzung eines Vorhabens beim Öffnen wieder aufnehmen

<!-- Ablage: intent/INT-2026-019-sitzung-wiederaufnehmen/intent.md · Bypass: Kern-Absicht, Plan in plan.md -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Stirbt die Sitzung eines Vorhabens ohne Michaels Zutun (Rechner-Absturz, Backend-Neustart, Deploy), ist die Arbeit mit dem Öffnen der Vorhaben-Seite wieder da — in derselben Arbeitskopie, mit demselben Modell, mit dem bisherigen Gesprächsverlauf — statt dass Michael Worktree, Sitzungskennung und `claude --resume` von Hand zusammensucht.
- **Kernaufgaben:** (1) Die Vorhaben-Seite erkennt eine verlorene Sitzung und nimmt sie beim Öffnen ohne Klick wieder auf. (2) Die Wiederaufnahme startet nichts Neues: kein nächster Schritt, keine Eingabe an Claude, keine zweite Sitzung. (3) Die Arbeitskopie eines offenen Vorhabens überlebt einen Neustart des Backends, statt als „tote Sitzungs-Arbeitskopie" aufgeräumt zu werden.
- **Endzustand:** AK-01 bis AK-09 sind erfüllt; nach einem Absturz genügt das Öffnen des Vorhabens, und die Sitzung steht dort, wo sie stand.

## 1. Problem und Anlass

<!-- leser: mensch -->

Am 17.09.2026 stürzte der Rechner mit zwei laufenden Vorhaben-Sitzungen ab (INT-2026-017 im Bau, INT-2026-018 im Plan). Nach dem Neustart fehlten beide Vorhaben in der Übersicht, und die Sitzungen waren weg [Q: Michael, 17.09.2026, Screenshot der Übersicht]. Drei Dinge greifen dabei ineinander.

Erstens: Die Zuordnung Sitzung↔Vorhaben überlebt den Neustart (`vorhaben-3001.json`: Sitzungskennung, Schritt, Modell, Arbeitskopie) [Q: `ui/src/server/services/vorhaben-state.ts:34-43`], aber die Sitzung selbst nicht. Der Sitzungsspeicher wirft beim Wiederanlauf jeden Eintrag weg, dessen tmux-Sitzung fehlt [Q: `ui/src/server/services/cloud-terminal-manager.ts:2034-2066`, `reapDeadEntry`]. Die Seite zeigt das Vorhaben danach als „Sitzung beendet" [Q: `vorhaben-service.ts:992-995`, `sessionRefOf`: unbekannte Sitzung → `ended: true`], und der einzige Weg weiter ist der Knopf „Nächster Schritt", der eine **neue** Sitzung mit dem Phasenbefehl anlegt [Q: `vorhaben-service.ts:638-698`, `startStep`] — der bisherige Verlauf bleibt liegen. Dabei liegt er auf der Platte: Claude Code schreibt jede Sitzung als Transkript unter dem Arbeitsverzeichnis ab und kann sie per `claude --resume <kennung>` oder `claude --continue` (jüngste Sitzung des Verzeichnisses) fortsetzen [Q: `claude --help`, Optionen `-r, --resume` und `-c, --continue`]. Die Kennung meldet der `SessionStart`-Hook ans Backend [Q: `ui/src/server/services/claude-hooks.ts:190-193`], sie landet aber nur im flüchtigen Sitzungseintrag [Q: `cloud-terminal-manager.ts:493-500`], nicht in der Zuordnung des Vorhabens.

Zweitens: Der Aufräumer löscht beim Wiederanlauf die Arbeitskopie einer toten Sitzung, sobald sie sauber ist — nur ungespeicherte Änderungen halten sie am Leben [Q: `ui/src/server/utils/cloud-session-worktree.ts:339-378`, `removeCloudSessionWorktree`, Zweig `dirty → keep`]. Beide Arbeitskopien von heute waren sauber (alles committet) und verschwanden; die Branches blieben [Q: `git branch`, `session/ui-opt`, `session/next-action`, 17.09.]. Die Regel stammt aus der Zeit, in der Sitzungs-Arbeitskopien Wegwerf-Verzeichnisse waren; seit dem Vorhaben-Flow ist die Arbeitskopie das Zuhause eines Vorhabens bis zum PR [Q: `CLAUDE.md` Arbeitsweise: „Vorhaben in Worktrees unter `../specwright-worktrees/`"].

Drittens: Die Übersicht liest Vorhaben nur aus Ordnern auf der Platte — Hauptcheckout und vorhandene Arbeitskopien [Q: `ui/src/server/services/vorhaben-reader.ts:355-359`], nicht aus Branches. Ohne Arbeitskopie ist das Vorhaben unsichtbar, und die Wiederaufnahme hätte keinen Ort. Das dritte Symptom folgt aus dem zweiten; die Schutzregel für die Arbeitskopie behebt beide.

Ob ein Sitzungsende gewollt war, weiß das Backend heute schon: Schließt Michael eine Sitzung oder endet Claude regulär, markiert das Ereignis `session.closed` die Zuordnung als beendet [Q: `vorhaben-service.ts:727`, `:790-800`, `onSessionClosed` → `markSessionEnded`]. Ein Absturz löst dieses Ereignis nie aus. Eine Zuordnung ohne diese Markierung, deren Sitzung der Sitzungsverwalter nicht kennt, ist deshalb genau eine **verlorene** Sitzung.

Warum kein Auto-Start des nächsten Schritts: Der Phasenbefehl (`/specwright:plan INT-…`) beginnt sofort zu lesen und kostet Tokens; die Vorhaben-Seite öffnet Michael auch, um nur ein Dokument zu lesen. Und warum keine zweite Sitzung nebenher: fünf Sitzungen Deckel auf dem Cloud-Host [Q: `cloud-terminal-manager.ts:673`], RAM je Claude-Prozess (AR-02-Begründung [Q: `docs/architecture.md:56`]).

Anlass: der Absturz vom 17.09.2026 mit zwei Vorhaben in der Schwebe; die Wiederherstellung von Hand (Worktree aus Branch anlegen, Transkript-Kennung im Sitzungsverzeichnis suchen, `claude --resume`) dauerte eine halbe Stunde und setzt Wissen voraus, das nur im Kopf ist.

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael auf der Vorhaben-Seite (Mac und Handy — dieselbe Seite) | Nach Absturz oder Neustart steht die Sitzung beim Öffnen wieder; nichts zu tippen |
| Michael in der Vorhaben-Übersicht | Vorhaben in Arbeitskopien verschwinden nach einem Neustart nicht mehr |
| Claude-Sitzung des Vorhabens | Setzt den Verlauf fort statt bei null zu beginnen; sieht dieselbe Arbeitskopie und dasselbe Modell |
| Sitzungs-Arbeitskopien ohne Vorhaben (freie Terminals) | Unverändert: werden nach einer toten Sitzung weiter aufgeräumt |
| Systeme | Web-UI Backend (Vorhaben-Dienst, Sitzungsverwalter, Aufräumer der Sitzungs-Arbeitskopien), Web-UI Frontend (Vorhaben-Seite), Claude Code CLI (Wiederaufnahme-Option) |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Nach einem ungewollten Sitzungsende ist die Arbeit an einem Vorhaben mit dem Öffnen der Vorhaben-Seite wieder da — Verlauf, Arbeitskopie, Modell, Zuordnung zum Schritt.
- **Z-02:** Es entsteht keine Sitzung ohne Grund: kein Doppelstart, keine Wiederbelebung bewusst beendeter Sitzungen, kein Token-Verbrauch, bevor Michael tippt.
- **Z-03:** Die Arbeitskopie eines offenen Vorhabens überlebt einen Neustart des Backends.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Kein automatischer Start des nächsten Schritts beim Öffnen. Der Phasenbefehl bleibt am Knopf; die Weiterarbeit in einer fertigen Sitzung regelt INT-2026-018.
- **NZ-02:** Keine Wiederherstellung einer bereits fehlenden Arbeitskopie aus ihrem Branch. Das bleibt Handarbeit (`git worktree add`, wie am 17.09.); AK-07 verhindert den Verlust künftig. Grund: Der Aufräumer verwirft den Branch-Namen, und nach einem Bau steht die Arbeitskopie auf einem anderen Branch als dem der Sitzung — eine Rekonstruktion wäre ratend.
- **NZ-03:** Keine Wiederaufnahme für Sitzungen ohne Vorhaben-Zuordnung (freie Terminals, `/intent` ohne Ordner) und keine für fremde CLIs (Codex): ohne Claude-Transkript gibt es nichts fortzusetzen.
- **NZ-04:** Keine Änderung am Aufräumen von Sitzungs-Arbeitskopien, die zu keinem offenen Vorhaben gehören.
- **NZ-05:** Keine Wiederaufnahme aus der Übersicht heraus; nur das Öffnen der Vorhaben-Seite löst sie aus.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn die Vorhaben-Seite geöffnet wird und die zugeordnete Sitzung verloren ist (nicht von Michael beendet, aber nicht mehr vorhanden) und ihre Arbeitskopie existiert, MUSS das System ohne Klick eine Sitzung in dieser Arbeitskopie mit dem Modell der verlorenen Sitzung starten, die deren Gesprächsverlauf fortsetzt. | Z-01 | Test + E2E |
| AK-02 | Wenn eine Sitzung nach AK-01 gestartet wurde, MUSS die Vorhaben-Seite binnen 2 s ab Start diese Sitzung als Sitzung des Vorhabens im bisherigen Schritt zeigen und ihr Terminal öffnen. | Z-01 | Test |
| AK-03 | Wenn eine Sitzung nach AK-01 gestartet wurde, DARF das System keine Eingabe an sie senden; die erste Eingabe kommt von Michael. | Z-02 | Test |
| AK-04 | Solange eine Wiederaufnahme läuft oder die daraus entstandene Sitzung lebt, DARF das System für dasselbe Vorhaben keine weitere Sitzung starten — auch nicht bei erneutem Öffnen, Neuladen oder Öffnen auf einem zweiten Gerät. | Z-02 | Test |
| AK-05 | Wenn Michael die Sitzung eines Vorhabens selbst beendet hat oder sie regulär geendet ist, DARF das System sie beim Öffnen NICHT wieder aufnehmen. | Z-02 | Test |
| AK-06 | Wenn ein Vorhaben keine wiederaufnehmbare Sitzung hat (nie eine Sitzung, Sitzung einer fremden CLI, Vorhaben umgesetzt), DARF das System beim Öffnen keine Sitzung starten. | Z-02 | Test |
| AK-07 | Solange ein Vorhaben eine nicht beendete Zuordnung zu einer Sitzungs-Arbeitskopie hat, DARF das System diese Arbeitskopie beim Wiederanlauf NICHT entfernen, auch wenn sie sauber ist. | Z-03 | Test |
| AK-08 | Falls die Arbeitskopie der verlorenen Sitzung fehlt, dann MUSS die Vorhaben-Seite das mit dem Pfad melden und keine Sitzung starten; der Knopf „Nächster Schritt" bleibt bedienbar. | Z-01 | Test |
| AK-09 | Falls die Wiederaufnahme scheitert (Sitzungsdeckel erreicht, Verlauf nicht auffindbar, Start schlägt fehl), dann MUSS die Vorhaben-Seite den Grund nennen, und das System DARF es beim selben Öffnen nicht erneut versuchen; ein erneutes Öffnen versucht es wieder. | Z-02 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | Ob eine Sitzung verloren ist und ob eine Wiederaufnahme läuft, entscheidet und merkt sich das Backend; der Browser löst nur „Seite geöffnet" aus und rechnet nichts nach. Grund: gleiche Sicht auf jedem Gerät, kein Doppelstart durch zwei offene Tabs. | `docs/architecture.md` AR-05 |
| RB-02 | Technik | Eine wieder aufgenommene Sitzung entsteht über denselben Startpfad wie jede andere Sitzung (Sitzungsverwalter, Hook-Einstellungen, Sitzungsziel „vorhandene Arbeitskopie"). Grund: ein zweiter Prozessstart-Weg hätte eigene Status- und Glocken-Lücken. | `cloud-terminal-manager.ts:884-916` (Aufbau der Befehlszeile, `extraCliArgs`); INT-2026-016 |
| RB-03 | Betrieb | Die Wiederaufnahme zählt gegen den Sitzungsdeckel des Cloud-Hosts (fünf) und belegt RAM wie jede Sitzung. Bei erreichtem Deckel gilt AK-09. | `cloud-terminal-manager.ts:673`; AR-02-Begründung in `docs/architecture.md:56` |
| RB-04 | Betrieb | Der Aufräumer entfernt weiterhin nur Arbeitskopien im Sitzungs-Namensraum (`session-…`, Branch `session/…`); die Schutzregel AK-07 schränkt ihn ein, erweitert ihn nicht. | `cloud-session-worktree.ts:108-110`, `:345-354` |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Soll die Wiederaufnahme auch greifen, wenn die Sitzung mit einem Fehler endete (Claude-Prozess abgestürzt, Backend lief weiter)? *entschieden 2026-09-17 (Product Owner)*: nein — ein Fehlerende zählt als regulär beendet, keine Wiederaufnahme, Neustart über den Knopf (AK-05). | nein | Product Owner | — |
| OF-02 | Soll eine wieder aufgenommene Sitzung einen sichtbaren Hinweis tragen („fortgesetzt nach Neustart, Stand HH:MM")? *entschieden 2026-09-17 (Product Owner)*: ja — eine Zeile im Kasten der Vorhaben-Seite, kein Eintrag im Protokoll (gehört zu AK-02). | nein | Product Owner | — |

---

## 12. Annahmen

<!-- leser: mensch -->

- **AN-01:** `claude --resume <kennung>` findet das Transkript, wenn die Sitzung im selben Arbeitsverzeichnis gestartet wird, in dem sie lief; die Kennung aus dem `SessionStart`-Hook ist diese Transkript-Kennung. Prüfung: Bau, erster Test gegen ein echtes Transkript, vor dem ersten Commit.
- **AN-02:** Für Sitzungen, die vor diesem Vorhaben liefen (Zuordnung ohne gespeicherte Kennung), reicht `claude --continue` im Arbeitsverzeichnis — die jüngste Sitzung dort ist die des Vorhabens. Prüfung: Bau, gegen die zwei Arbeitskopien vom 17.09.; trifft es nicht, meldet AK-09 „Verlauf nicht auffindbar".
- **AN-03:** Der Aufräumer kann vor dem Entfernen einer Arbeitskopie fragen, ob ein offenes Vorhaben sie belegt, ohne dass der Sitzungsverwalter den Vorhaben-Dienst kennt (Prüfregel wird ihm beim Start übergeben). Prüfung: Plan, Abschnitt Verbindungen.

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.2 | 2026-09-18 | Umgesetzt: PR #77 gemerged (`286727f`), AK-01–AK-09 mit Tests und E2E belegt (plan.md §8, §13); `resumed`-Marke nur bei lebender Sitzung, `isClaudeProvider` als zweite Modellprüfung (plan.md §14) | alle | PO, 2026-09-18 |
| 1.0.1 | 2026-09-18 | Plan freigegeben (`plan.md`, Status freigegeben; O1 Handy ohne Auto-Vollbild, O2 Schutzregel nur Wiederanlauf/Herunterfahren); `bezuege.plan` gesetzt. AN-02 (`--continue`) im Plan verworfen, siehe plan.md §12 F1 | bezuege.plan, AN-02 | PO, 2026-09-18 |
| 1.0.0 | 2026-09-17 | Freigabe durch den Product Owner im Chat; OF-01 und OF-02 mit den vorgeschlagenen Übergangsregeln entschieden. Abgleich Mensch/Agent: ohne Befund (drei Sätze nennen AK-01–AK-09 und Kernaufgabe 3 = AK-07/Z-03; NZ-02 und AK-08 decken denselben Fall; keine Agenten-Abschnitte außer diesem Protokoll) | OF-01, OF-02 | PO, 2026-09-17 |
| 0.1.0 | 2026-09-17 | Entwurf aus dem Gespräch nach dem Absturz; Ursachen im Code belegt (Zuordnung überlebt, Sitzung nicht; Aufräumer löscht saubere Arbeitskopie; Übersicht liest nur Ordner) | alle | — |
