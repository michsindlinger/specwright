---
intent_id: "INT-2026-011"  
titel: "UI: Terminal statt Gespräch — die Sitzung selbst neben dem Dokument"  
status: "angenommen"  
version: "1.0.0"  
autor: "Michael Sindlinger (Gespräch mit Claude, 16.09.2026, nach Sicht von PR #59/#60)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-16"  
geaendert: "2026-09-16"  
risikoklasse: "mittel"  
groesse: "M"  
bypass: "nein"  
bypass_grund: ""  
bezuege:  
  product: "docs/product-brief.md"  
  spec: "spec.md"  
  plan: "plan.md"  
  board_karte: ""  
  adr: ["docs/adr/0003-sitzungsverlauf-aus-dem-claude-code-transkript.md"]  
  ersetzt: "intent/INT-2026-007-sitzung-als-gespraech/intent.md (Stufe 2 und 3 nie gebaut, siehe OF-03)"  
schlagworte: [ui, terminal, gespraech, abbau, vorhaben-seite, kennungen, less-is-more, phase-5]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — „Alles freigegeben, du kannst starten", Vorschläge zu OF-01 bis OF-03 und Textfeld behalten, Chat 16.09."  
  am: "2026-09-16"  

---

# Absicht: UI: Terminal statt Gespräch — die Sitzung selbst neben dem Dokument

<!-- Ablage: intent/INT-2026-011-terminal-statt-gespraech/intent.md · Mock: design/11-terminal-mac.html, design/11a–11d-terminal-mac.png -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Rechts neben dem Dokument soll auf der Vorhaben-Seite die Sitzung selbst stehen — das Terminal, in dem Claude Code läuft — und nicht eine nachgebaute Gesprächsansicht. Michael sieht, was wirklich passiert, jede Aktion der Dokumentseite wird dort sichtbar, und die UI pflegt keine zweite Darstellung derselben Sitzung mehr.
- **Kernaufgaben:** (1) Vorhaben-Seite am Mac: Dokument links, angedocktes Terminal rechts, je halbe Breite, Tab der Vorhaben-Sitzung gewählt; (2) die Knöpfe der Dokumentseite wirken sichtbar im Terminal — ein Schritt startet wie heute eine neue Sitzung, deren Tab erscheint und ist gewählt; Freigabe und Anmerkungen erscheinen als Eingabe in der laufenden Sitzung; (3) Kennungen im Terminal sind Verweise ins Dokument (übernimmt INT-2026-010 AK-13); (4) das Gespräch aus INT-2026-007 wird abgebaut — Frontend, Backend, Transkript-Leser, Tests —, ADR-0003 wird abgelöst.
- **Endzustand:** AK-01 bis AK-14 erfüllt; Screenshots neben Mock 11a–11d in `design/`; `docs/architecture.md`, `docs/design.md` und `docs/adr/` kennen kein Gespräch mehr; Handy unverändert.

## 1. Problem und Anlass

<!-- leser: mensch -->

Die Vorhaben-Seite zeigt neben dem Dokument das „Gespräch": eine eigene Ansicht der Claude-Sitzung aus Hook-Ereignissen und dem Transkript, das Claude Code schreibt — mit Dedup zwischen beiden Quellen, Dialog-Zustand je Werkzeugaufruf und Pfad-Prüfungen für die Transkriptdatei [Q: `ui/src/server/services/gespraech-service.ts:1-22`]. Rund 2.250 Zeilen in acht Dateien plus fünf Testdateien [Q: `wc -l` 16.09.: `aos-gespraech*.ts` 608, `gespraech.service.ts` 184, `gespraech-service.ts` 651, `gespraech-handler.ts` 169, `transcript-reader.ts` 405, `gespraech.protocol.ts` 241]. Alles davon bildet nach, was das Terminal ohnehin zeigt: Beiträge, Rückfragen, Berechtigungs-Dialoge, Plan-Mode, Fortschritt. Von INT-2026-007 wurde nur Stufe 1 gebaut (Verlauf, Freitext); Dialog-Karten und Sprache kamen nie [Q: `intent/INT-2026-007-sitzung-als-gespraech/plan.md:3`].

Das Terminal ist da: `aos-terminal` (xterm.js, Buffer-Replay), Sidebar mit Tabs — heute ein schwebendes Fenster, das `--terminal-open-width` setzt [Q: `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts:183,187,2604`]; die App reicht ihm schon eine aktive Sitzung durch [Q: `ui/frontend/src/app.ts:1610`]. Die Knöpfe der Dokumentseite arbeiten längst über das Terminal: „Nächster Schritt" startet eine neue Sitzung mit dem Befehl als Startargument [Q: `ui/src/server/services/vorhaben-service.ts:646-655`]; Freigabe und Anmerkungen gehen als Einfügung in die wartende Sitzung, nach Bildschirmprüfung auf offene Dialoge [Q: `vorhaben-service.ts:494,578,585-589`]. Michael sieht davon nur „gesendet · angenommen" im Protokoll.

Ein Terminal hat eine Größe; beim Ändern gewinnt der letzte Schreiber [Q: `ui/src/server/services/cloud-terminal-manager.ts:1424`]. Zwei Ansichten derselben Sitzung in verschiedener Breite zerreißen den Verlauf — deshalb wird die vorhandene Sidebar angedockt, kein zweites xterm gebaut (RB-07).

Anlass: Nach PR #58 wurde das Layout zweimal gedreht (PR #59 Gespräch links, PR #60 wieder rechts) [Q: INT-2026-010 `plan.md` §14]. Beim Betrachten hat Michael entschieden: Das Terminal reicht, das Gespräch ist doppelt [Q: Michael, Chat 16.09. abends]. INT-2026-010 Stufe 3 würde Code-Links (AK-13) in eine Ansicht bauen, die wegfällt; das wandert hierher (OF-04, entschieden).

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael am Mac | Vorhaben-Seite: Dokument links, echtes Terminal rechts; Knöpfe zeigen ihre Wirkung im Terminal; Kennungen im Terminal anklickbar; Cmd/Ctrl+D klappt das Terminal weg und zurück |
| Michael am Handy | nichts (Terminal-Symbol öffnet die Sitzung als Vollbild, INT-2026-010 AK-17 bleibt) |
| Seite „Neue Absicht" | rechts der Karte das Terminal der Absicht-Sitzung statt des Gesprächs; Ordner-Folge wie INT-2026-008 |
| Cloud-Droplet | Merge nach `main` deployt automatisch; laufende Sitzungen überleben (tmux) |
| INT-2026-007 | abgelöst: Stufe 2 (Dialog-Karten) und 3 (Sprache) entfallen (OF-03) |
| INT-2026-010 | Stufe 3 ohne AK-13/FA-15 (Code-Links im Gespräch); Verweise kommen hier (AK-06) |
| Systeme | `ui/frontend/src/views/aos-vorhaben-view.ts`, `components/vorhaben/aos-gespraech*.ts`, `services/gespraech.service.ts`, `components/terminal/aos-cloud-terminal-sidebar.ts`, `components/aos-terminal.ts`, `styles/theme.css`; `ui/src/server/services/{gespraech-service,gespraech-handler,transcript-reader}.ts`, `websocket.ts`, `shared/types/gespraech.protocol.ts`; `docs/architecture.md`, `docs/design.md`, `docs/adr/0003…`, neue ADR |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Auf der Vorhaben-Seite steht die echte Sitzung neben dem Dokument — nichts Nachgebautes, ein Verlauf, eine Eingabe.
- **Z-02:** Jede Aktion der Dokumentseite (Schritt, Freigabe, Anmerkung) ist im Terminal sichtbar nachvollziehbar.
- **Z-03:** Kennungen, die Claude im Terminal nennt, führen zum Absatz im Dokument (übernommen aus INT-2026-010 Z-04).
- **Z-04:** Weniger Code: das Gespräch ist weg, nicht versteckt; je Sitzung gibt es eine Darstellung.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Kein Umbau des Terminals selbst (xterm, Tabs, Sitzungen, Buffer-Replay) über das Andocken und die Verweise hinaus.
- **NZ-02:** Kein Gespräch und keine Sprache (Mikro, Vorlesen): INT-2026-007 Stufe 2 und 3 werden nicht gebaut; Sprache wäre ein eigenes Vorhaben.
- **NZ-03:** Kein Handy-Umbau: die Vorhaben-Seite am Handy bleibt wie in INT-2026-010 (Dokument, Terminal-Knopf, Vollbild-Terminal).
- **NZ-04:** Kein Tippen des nächsten Schritts in die laufende Sitzung: ein Schritt bleibt eine neue Sitzung mit eigenem Modell und eigener Arbeitskopie (entschieden 16.09., PO).
- **NZ-05:** Keine Änderung an Vorlagen oder Workflows.
- **NZ-06:** Kein Abbau von Glocke, Protokoll, Freitext-Zustellung (Einfügen, Dialog-Prüfung, Lock) oder Hook-Pfad — nur, was allein dem Gespräch dient, geht.
- **NZ-07:** Kein Umbau der Seite „Neue Absicht": Textfeld, Modellwahl und „Starten" bleiben; der Text wird nach der ersten Frage zugestellt (INT-2026-010 AK-08/AK-09). Grund: die Sitzung braucht ~10 s zum Hochfahren, der Text ist vorher getippt (entschieden 16.09., PO).

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn ein Vorhaben eine lebende Sitzung hat, MUSS die Vorhaben-Seite am Mac links das Dokument und rechts das Terminal zeigen, beide gleich breit, mit dem Tab dieser Sitzung gewählt. | Z-01 | Playwright + Screenshot |
| AK-02 | Solange das Terminal auf der Vorhaben-Seite angedockt ist, DARF die schwebende Terminal-Sidebar nicht zusätzlich erscheinen; Verlauf und Eingabe sind dieselben wie auf anderen Seiten. | Z-01 | Test |
| AK-03 | Wenn „Nächster Schritt" gedrückt wird, MUSS die neue Sitzung binnen 2 s ab Klick als gewählter Tab im angedockten Terminal erscheinen und der Befehl dort sichtbar laufen. | Z-02 | Messung |
| AK-04 | Wenn „Freigeben" oder „Änderungen schicken" gedrückt wird und die Sitzung wartet, MUSS der Text binnen 2 s ab Klick im Terminal als Eingabe sichtbar sein; das Protokoll MUSS wie heute „gesendet" und „angenommen" zeigen. | Z-02 | Test + Messung |
| AK-05 | Solange die Sitzung arbeitet oder einen Dialog zeigt, MUSS ein Text aus Freigabe oder Anmerkung wie heute eingereiht werden (Protokoll „eingereiht") und DARF NICHT in den Dialog tippen. | Z-02 | Test |
| AK-06 | Wenn im Terminal eine Kennung steht, die im Dokument der gewählten Phase vorkommt (AK-, NZ-, OF-, AN-, FA-, RB-, EK-, ER-, B- oder F/R/D/O/A mit Nummer), MUSS sie als Verweis erscheinen: Klick springt zum Absatz, Hover zeigt ihn; ein zugeklappter Absatz MUSS dabei aufgehen. | Z-03 | Test |
| AK-07 | Ein Klick auf eine Kennung im Terminal DARF NICHT als Eingabe in der Sitzung landen. | Z-03 | Test |
| AK-08 | Wenn auf der Vorhaben-Seite Cmd/Ctrl+D gedrückt wird, MUSS das angedockte Terminal weichen und das Dokument die volle Breite nutzen; ein zweites Cmd/Ctrl+D MUSS es zurückholen. | Z-01 | Test |
| AK-09 | Ein Vorhaben ohne Sitzung MUSS das Dokument in voller Breite zeigen; wird das Terminal dort geöffnet, MUSS es ebenfalls angedockt erscheinen (OF-01, entschieden). | Z-01 | Test |
| AK-10 | Wenn auf „Neue Absicht" „Starten" gedrückt wird, MUSS rechts der Karte das angedockte Terminal die Absicht-Sitzung zeigen und die Seite dem Ordner folgen wie in INT-2026-008 AK-01 und AK-03. | Z-01 | Test + Playwright |
| AK-11 | Nach dem Umbau DARF es keinen Gesprächs-Code mehr geben: Komponenten, Dienst, Handler, Transkript-Leser, Protokolltypen und ihre Tests sind entfernt; Glocke, Protokoll, Freitext-Zustellung und Dialog-Prüfung funktionieren unverändert. | Z-04 | Review + Test |
| AK-12 | `docs/architecture.md` und `docs/design.md` DÜRFEN das Gespräch nicht mehr als Bestandteil nennen; ADR-0003 MUSS als abgelöst gekennzeichnet sein, mit Verweis auf die Nachfolge-Entscheidung. | Z-04 | Review |
| AK-13 | Auf dem Handy MUSS die Vorhaben-Seite unverändert bleiben (INT-2026-010 AK-17). | Z-01 | Playwright |
| AK-14 | Solange das Fenster am Mac schmaler als 1024 px ist, DARF das Terminal auf der Vorhaben-Seite nicht angedockt sein; es MUSS wie auf anderen Seiten schwebend erscheinen (OF-02, entschieden). | Z-01 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Betrieb | Merge nach `main` löst den Auto-Deploy der UI auf dem Cloud-Droplet aus; Merge ist Michaels Schritt. Laufende Sitzungen müssen den Neustart überleben. | `CLAUDE.md` „Nie", tmux-Persistenz (Memory) |
| RB-02 | Technik | TypeScript strict, kein `any`; Präfix `aos-`; Nutzerzustand im Backend (AR-05); `projectDir()` statt Pfade (AR-04); MCP direkt starten (AR-02). | `CLAUDE.md`, `docs/architecture.md` |
| RB-03 | Design | Weniger ist mehr: ein Zweck je Element, eine Akzentfarbe je Seite, keine dekorativen Trenner. Buffer-Replay über `stripTerminalQueries` nicht anfassen ohne Test (zweimal regressiert). | `docs/design.md` §1, §3 |
| RB-04 | Sicherheit | Repo öffentlich: Screenshots aus dem Scratch-Projekt, keine Hostnamen, Pfade, Nutzer oder Tokens des Cloud-Hosts. | `docs/security.md`, INT-2026-010 RB-04 |
| RB-05 | Betrieb | Bezugsliste `ui/tests/known-failures.txt` nur nach CI-Lauf ändern; entfernter Code zieht seine Tests mit sich, kein Test wird gelöscht, damit etwas grün wird. | `CLAUDE.md` Definition of Done |
| RB-06 | Architektur | ADR-Pflicht bei Datenhaltung: das Ende des Transkript-Lesens (ADR-0003) braucht eine Nachfolge-ADR; `docs/architecture.md` in derselben PR. | `CLAUDE.md` Konventionen |
| RB-07 | Technik | Ein Terminal hat eine Größe (letzter Schreiber gewinnt). Grund: deshalb je Sitzung genau eine Ansicht im Browser — die Sidebar wird angedockt, kein zweites xterm. | `ui/src/server/services/cloud-terminal-manager.ts:1424` |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Vorhaben ohne Sitzung: Terminal beim Öffnen (Cmd/Ctrl+D) angedockt oder schwebend? *entschieden 2026-09-16 (PO)*: angedockt, sobald auf der Vorhaben-Seite offen — ein Modus je Seite (AK-09, B-01). | nein | Product Owner | erledigt |
| OF-02 | Fenster unter 1024 px am Mac: Terminal unter dem Dokument oder schwebend wie überall? *entschieden 2026-09-16 (PO)*: schwebend, kein Andocken unter 1024 px (AK-14). | nein | Product Owner | erledigt |
| OF-03 | INT-2026-007 als `abgeloest` markieren (Stufe 2 Dialog-Karten und Stufe 3 Sprache entfallen; Sprache später eigenes Vorhaben, wenn gewünscht)? *entschieden 2026-09-16 (PO)*: ja — 007 `status: abgeloest`, Verweis auf diese Absicht im Änderungsprotokoll von 007. | nein | Product Owner | erledigt |
| OF-04 | INT-2026-010 Stufe 3 ohne AK-13/FA-15 bauen und die Code-Links hier übernehmen (AK-06)? *entschieden 2026-09-16 (PO, Chat)*: ja — 010 Stufe 3 abgespeckt zuerst, dann 011; Vermerk in 010 `plan.md` §14 beim Bau von Stufe 3. | nein | Product Owner | erledigt |

---

<!-- ===== Vertragsschicht ===== -->

## 8. Begriffe

<!-- leser: mensch -->

- **B-01 Angedocktes Terminal:** Die Cloud-Terminal-Sidebar als rechte Spalte der Vorhaben-Seite (und der Seite „Neue Absicht" nach „Starten") statt als schwebendes Fenster: gleiche Tabs, gleiche Sitzungen, gleiche Knöpfe (Neue Session, Layout, Vollbild, Schließen). Auf diesen Seiten gilt ab 1024 px Fensterbreite: offen = angedockt (OF-01, OF-02, 16.09.).
- **B-02 Sitzung des Vorhabens:** Die Claude-Code-Sitzung, die dem Vorhaben zugeordnet ist (Zuordnung im Backend seit INT-2026-005/007); bei „Neue Absicht" die anhängige Absicht-Sitzung bis zum Ordner-Claim (INT-2026-008).
- **B-03 Kennung:** Code einer Dokumentfamilie (AK, NZ, OF, AN, FA, RB, EK, ER, B mit zweistelliger Nummer) oder Reference Point (F, R, D, O, A mit Nummer), der im Dokument der gewählten Phase vorkommt. Nur solche werden zu Verweisen.
- **B-04 Eingereiht:** Ein Text aus Freigabe oder Anmerkung, der auf die nächste Eingabemöglichkeit der Sitzung wartet, weil sie arbeitet oder einen Dialog zeigt (Protokoll-Status heute).
- **B-05 Gespräch:** Die mit INT-2026-007 Stufe 1 gebaute Sitzungsansicht (Beiträge aus Hooks und Transkript, Freitext-Feld) samt Backend-Dienst und Transkript-Leser. Gegenstand des Abbaus.

## 9. Erfolgskennzahlen

<!-- leser: mensch -->

| ID | Kennzahl | Zielwert | Messung vor Produktion | Messung im Betrieb | Reaktion bei Verfehlen |
|---|---|---|---|---|---|
| EK-01 | Gesprächs-Code in `ui/` (Dateien mit `gespraech` im Namen, Nutzer von `gespraech.protocol`) | 0 Dateien; Kontrollfall: Treffer in `intent/` und `docs/adr/` bleiben | `find`/`grep` im Build, Review AK-11 | kein Gate | Abbau nachholen |
| EK-02 | Zeit Klick „Nächster Schritt" → Befehl im angedockten Terminal sichtbar | unter 2 s | E2E-Messung (AK-03) | Stichprobe Michael, erste Woche | Ursache im Start- oder Tab-Pfad suchen |
| EK-03 | Zeit Klick „Freigeben" → Text im Terminal sichtbar | unter 2 s (Sitzung wartet) | E2E-Messung (AK-04) | Stichprobe Michael | Einfüge-Pfad prüfen |
| EK-04 | Ansichten derselben Sitzung je Browser-Fenster | genau 1 | Test AK-02 | kein Gate | Andocken korrigieren |
| EK-05 | Verweise je Terminal-Beitrag mit Kennungen | jede vorkommende Kennung des Dokuments ist Verweis; 0 Fehlverweise auf Codes, die nicht im Dokument stehen | Test AK-06 mit Prüfdokument | Stichprobe Michael | Mustererkennung nachziehen |

## 10. Auslieferung, Betrieb, Zeitbudget

<!-- leser: mensch -->

- **Freigabe Produktion:** Product Owner (Michael) durch Merge des PR nach `main`.
- **Stufen:** auf einmal; ein Nutzer, ein Droplet. Der Abbau des Gesprächs DARF NICHT vor dem Andocken mergen — kein Stand ohne Sitzungsansicht auf der Vorhaben-Seite.
- **Rückzug:** Revert-PR auf `main`; Auto-Deploy spielt den alten Stand ein. Abschalten und Einschalten: Michael.
- **Betrieb:** Michael; Alarme über die Glocke (Stop-Hook) und den Verbindungs-Hinweis der UI.
- **Zeitbudget:** höchstens 2 Bausitzungen ab Plan-Freigabe (Andocken und Verweise; Abbau und Docs); danach Stopp und Neuzuschnitt in einer weiteren `intent.md`.

## 11. Entscheidungsrechte

<!-- leser: agent -->

| ID | Stufe | Regel |
|---|---|---|
| ER-00 | allein (vorläufig) | Auslegungsfragen zu AK, RB oder B ohne Widerspruch: engste Auslegung, die den Wortlaut erfüllt; in der Spec unter „Annahmen" dokumentieren; weiterarbeiten. Bestätigung gesammelt bei der Spec-Freigabe. |
| ER-01 | allein | Details ohne Datenverlust und ohne Außenwirkung: interne Struktur, Benennungen, Aufgabenschnitt, synthetische Testdaten, Reihenfolge des Abbaus. |
| ER-02 | fragen | Neue externe Abhängigkeit (Bibliothek, Fremddienst). |
| ER-03 | fragen | Eine Kennzahl wird vor Produktion verfehlt. |
| ER-04 | stopp | Zugriff auf Produktionsdaten oder den Cloud-Host. |
| ER-05 | stopp | Zwei Kriterien widersprechen sich. |
| ER-06 | stopp | Tests, Gates, Bezugsliste oder Schwellen müssten geändert werden, damit etwas grün wird. |
| ER-07 | stopp | Produktionsfreigabe: bereitet der Agent vor (PR); mergen darf nur Michael. |
| ER-08 | stopp | Zeitbudget ausgeschöpft. |
| ER-09 | fragen | Ein Stück Gesprächs-Code wird auch von Glocke, Protokoll, Freitext-Zustellung oder Dialog-Prüfung genutzt und lässt sich nicht sauber trennen. |
| ER-10 | fragen | Das Andocken erfordert einen Neuaufbau des xterm (zweiter Buffer-Replay) statt eines Wirtwechsels. |

## 12. Annahmen

<!-- leser: mensch -->

- **AN-01:** Die Cloud-Terminal-Sidebar lässt sich als Spalte der Seite hosten (CSS-Modus, „docked"), ohne dass das xterm neu aufgebaut wird und ohne zweiten Buffer-Replay. Prüfung: Spike im Plan Mode an `aos-cloud-terminal-sidebar.ts` (Wirt, `--terminal-open-width`), vor Plan-Freigabe; sonst ER-10.
- **AN-02:** xterm.js erlaubt eigene Verweise im Text (Link-Provider), deren Klick keine Eingabe auslöst und deren Hover einen Tooltip zeigt. Prüfung: xterm-API im Plan Mode, Spike mit einer Kennung, vor Plan-Freigabe.
- **AN-03:** Die Freitext-Zustellung (Einfügen, Dialog-Prüfung, `withMachineWrite`) und die Glocke hängen nicht am Gesprächs-Dienst. Prüfung: Import-Graph `vorhaben-service.ts` ↔ `gespraech-service.ts`, `dialog-driver.ts`, `claude-hooks.ts` im Plan Mode; sonst ER-09.
- **AN-04:** Die Typen in `gespraech.protocol.ts`, die Hooks, Manager und Registry nutzen (Beitrag- und Dialog-Ereignisse), lassen sich vom Gesprächs-Protokoll trennen oder bleiben als Hook-Typen bestehen. Prüfung: Import-Graph im Plan Mode; sonst ER-09.
- **AN-05:** INT-2026-010 Stufe 3 (Leser klappt Agenten-Abschnitte, Schalter „Technik zeigen") ist vor dem Bau dieser Absicht gemerged, damit AK-06 „zugeklappter Absatz geht auf" prüfbar ist. Prüfung: 010 `plan.md` §14 Stufe 3 gemerged vor `/build INT-2026-011`.
- **AN-06:** Die Absicht-Sitzung von „Neue Absicht" (INT-2026-008, anhängig bis zum Claim) erscheint im Terminal als Tab wie jede Sitzung; die Ordner-Folge liegt im Backend und in der View, nicht im Gespräch. Prüfung: `aos-vorhaben-view.ts` Route `neu` und `pendingIntents` im Plan Mode.

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-16 | Angenommen; OF-01 (angedockt, sobald offen), OF-02 (unter 1024 px schwebend → AK-14), OF-03 (007 abgelöst) mit den Vorschlägen entschieden; NZ-07 Textfeld auf „Neue Absicht" bleibt; Mock 11d ergänzt. Abgleich Mensch/Agent: ohne Befund (ER-09/ER-10 decken NZ-06 und AN-01/AN-03/AN-04) | OF-01–OF-03, AK-14, NZ-07, B-01 | PO, 16.09. |
| 0.1.0 | 2026-09-16 | Entwurf aus dem Gespräch vom 16.09. abends (nach PR #59/#60); drei Empfehlungen vom PO angenommen: Sidebar andocken statt zweites xterm, Schritt bleibt neue Sitzung (NZ-04), Gespräch komplett abbauen; 010 Stufe 3 abgespeckt zuerst (OF-04) | alle | — |

<!-- Definition of Ready (vor status "angenommen"):
     [x] Drei Sätze nennen Zweck, Kernaufgaben, Endzustand und versprechen nichts, was AK/RB/NZ einschränken.
     [x] Problem mit Beleg, Anlass genannt.
     [x] Jedes AK: EARS-Form, ein Modalverb, Ziel, Prüfart, beobachtbar statt Mechanismus.
     [x] Mindestens ein Nicht-Ziel. Jede RB mit Herkunft.
     [x] Keine offene Frage mit „Blockiert: ja".
     [x] Keine Projektregeln, die in CLAUDE.md gehören.
     [x] Ab risikoklasse mittel: Abschnitte 8–12 ausgefüllt.
     [x] `verantwortlich` hat angenommen, Commit dokumentiert die Annahme. -->
