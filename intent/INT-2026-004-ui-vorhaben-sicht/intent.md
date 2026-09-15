---
intent_id: "INT-2026-004"  
titel: "Web-UI zeigt Vorhaben statt Stories: Dokumente lesen, an Review-Punkten antworten"  
status: "umgesetzt"  
version: "1.2.0"  
autor: "Michael Sindlinger (Idee, 15.09.2026) · Claude (Text, Belege)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-15"  
geaendert: "2026-09-15"  
risikoklasse: "mittel"  
groesse: "L"  
bypass: "nein"  
bypass_grund: ""  
bezuege:  
  product: "docs/product-brief.md"  
  spec: "spec.md"  
  plan: "plan.md"  
  board_karte: "Specwright — Backlog Board · „AI-native SDLC v4 — Flow nach Anthropic-Playbook neu aufsetzen" (In Arbeit, Phase 5) — eigene Karte folgt"  
  adr: []  
  ersetzt: ""  
schlagworte: [web-ui, vorhaben, review-punkt, phase-5, story-pfad-abbau, mobil, projekt-docs]  
freigabe:  
  von: "Product Owner (Michael Sindlinger)"  
  am: "2026-09-15"  

---

# Absicht: Web-UI zeigt Vorhaben statt Stories: Dokumente lesen, an Review-Punkten antworten

<!-- Ablage: intent/INT-2026-004-ui-vorhaben-sicht/intent.md -->

## Absicht in drei Sätzen

- **Zweck:** Michael soll am Mac und am Handy sehen, welche Vorhaben in seinen Projekten in welcher Phase stehen, die drei Dokumente eines Vorhabens (`intent.md`, `spec.md`, `plan.md`) bequem lesen und an jedem Freigabe-Punkt des Flows aus der Oberfläche antworten können — ohne ins Terminal zu tippen.
- **Kernaufgaben:** (1) Eine Übersicht aller Vorhaben über alle offenen Projekte mit Phase und „wartet auf dich"; (2) die Dokumente lesbar anzeigen; (3) Anmerkungen und Freigaben aus der Oberfläche in die wartende Claude-Sitzung bringen; (4) den Story-Pfad (Kanban, Auto-Mode je Story) aus der Oberfläche entfernen; (5) die Projekt-Docs eines Projekts (`docs/product-brief.md`, `architecture.md`, `security.md`, `design.md`, `CLAUDE.md`) in der Oberfläche lesen und bearbeiten.
- **Endzustand:** Ein Vorhaben läuft von `/intent` bis zum PR, und Michael hat jede Freigabe am Handy oder Mac in der UI gegeben (AK-01 bis AK-16), die Projekt-Docs pflegt er in der UI (AK-17); Kanban-, Story- und Backlog-Sichten gibt es nicht mehr (AK-13).

## 1. Problem und Anlass

<!-- Fakten mit Beleg [Q: Quelle]. Kein Lösungsvorschlag. Anlass = warum jetzt. -->

Seit 4.0.0 (14.09.2026) läuft jedes Vorhaben als `intent/INT-JJJJ-NNN-kurzname/` mit `intent.md` → `spec.md` → `plan.md` → Bau in einer Sitzung [Q: `CLAUDE.md` „Arbeitsweise"; `docs/product-brief.md` §4]. Die Web-UI kennt diesen Ordner nicht: Ihre Arbeitsfläche hat sechs Modi `specs | kanban | story | backlog | docs | backlog-story` [Q: `ui/frontend/src/views/dashboard-view.ts:84`], das Docs-Panel liest nur `specwright/product/` [Q: `ui/src/server/docs-reader.ts:28`], und der Auto-Mode startet je Story eine Cloud-Sitzung mit `/specwright:execute-tasks <spec> <story>` [Q: `ui/src/server/services/auto-mode-cloud-session.ts:203,271`] — das Ausführungsmodell, das v4 abgeschafft hat [Q: `docs/architecture.md` §10; `docs/design.md` §7]. Folge: Die drei Dokumente liest Michael in MacDown oder auf GitHub, und jede Freigabe (Absicht Step 5, Spec Step 5, Plan Step 9b, Bau-Fertigmeldung) tippt er im Terminal [Q: `specwright/workflows/core/intent.md:104-110`, `spec.md:88-93`, `plan.md:126-130`, `build.md:106`]; am Handy ist das der Engpass, die Mobile-Shell bietet dort Story-Karten und Kanban [Q: `ui/frontend/src/components/mobile/aos-mobile-spec-kanban.ts` und 5 weitere `aos-mobile-story-*`].

Der Story-Pfad sitzt tief: 87 Stellen in 12 Dateien unter `ui/` lesen `kanban.json` [Q: `grep -rn kanban.json ui/src ui/frontend/src`, 15.09.2026], 43 von 113 Testdateien berühren Kanban oder Story [Q: `ui/tests/`], und das Deploy-Readiness-Gate hält Neustarts nur zurück, solange ein Auto-Mode läuft [Q: `ui/src/server/index.ts:66-76`]. Rohmaterial für Review-Punkte existiert: Hooks melden je Sitzung „arbeitet / wartet / fertig" [Q: `ui/src/server/services/claude-hooks.ts:65-71`, `agent-status.ts:26-40`]; der Plan-Review-Orchestrator tippt Text in den wartenden ExitPlanMode-Dialog [Q: `services/plan-review-orchestrator.ts`, `utils/plan-dialog-state.ts:166,186`]; ein Vorschau-Panel rendert Markdown, aber ohne Mermaid [Q: `aos-document-preview-panel.ts:9-20`, `aos-docs-viewer.ts:4,13-18`], obwohl `docs/architecture.md:8` ein Diagramm enthält; Kommentar-Threads hängen an Backlog-Items, nicht an Dokumenten [Q: `aos-comment-thread.ts:41`]. Für lange Dokumente nutzt Michael heute den schwebenden Notizblock (Cmd+Shift+E), weil eine Eingabe nur am Ende den Bezug zur gelesenen Stelle verliert [Q: Michael, 2026-09-15; `ui/frontend/src/components/aos-notepad-panel.ts:11-16`].

**Anlass:** Der Gesamtplan sah Phase 5 (UI) erst nach zwei Projekten im neuen Flow vor [Q: `~/Documents/AI-native-SDLC-Plan-2026-09-13.md`, Phase 5]. Erfüllt: Applai (INT-2026-001) und Specwright (INT-2026-002, -003) sind durch, der Rollout deckt sechs Projekte [Q: Memory `project_ai_native_sdlc_rebuild`, 15.09.]. Michael, 15.09.: „… so dass die entstehenden Dokumente direkt und einfach gelesen werden können und auch die Reviews vom Nutzer an den Review Points direkt vorgenommen werden können." [Q: Michael, 2026-09-15]

## 2. Betroffene

| Wer oder was | Was ändert sich |
|---|---|
| Michael am Mac | Startseite zeigt Vorhaben statt Specs/Kanban; Dokumente und Freigaben in der UI; Projekt-Docs je Projekt lesen und bearbeiten; Kanban, Story-Sichten, Backlog, Auto-Mode je Story verschwinden |
| Michael am Handy | Neuer Hauptfall: Dokument lesen, Anmerkung schreiben, freigeben — ohne Terminal |
| Claude-Sitzungen im Cloud-Terminal | Unverändert; erhalten Anmerkungen und Freigaben als Eingabe statt per Tastatur |
| Systeme | `ui/src/server/` (Backend, WebSocket, Deploy-Gate), `ui/frontend/src/` (Arbeitsfläche, Mobile), `ui/tests/`, `docs/architecture.md` §10; Workflows nur, falls OF-01 einen Marker verlangt; Cloud-Host (Auto-Deploy bei Merge). **Unberührt:** Kanban-MCP-Server, Installer, Manifest, Vorlagen. |

## 3. Ziele

<!-- 1 bis 5, ergebnisorientiert, lösungsfrei. Jedes Ziel wird von mindestens einem AK abgedeckt. -->

- **Z-01 Überblick:** In einer Ansicht sehen, welche Vorhaben in allen offenen Projekten in welcher Phase stehen und welche gerade auf Michael warten.
- **Z-02 Lesen:** Die Dokumente eines Vorhabens in der UI so lesen wie in MacDown — Tabellen, Diagramme, IDs — auf Mac und Handy.
- **Z-03 Antworten:** An jedem Freigabe-Punkt des Flows aus der UI antworten (freigeben oder Änderungen mit Bezug auf Absatz oder ID), und zwar an der Stelle im Dokument, an der Michael gerade liest; die Antwort erreicht die wartende Sitzung.
- **Z-04 Starten:** Den nächsten Schritt eines Vorhabens (`/intent`, `/spec`, `/plan`, `/build`) aus der UI in einer Sitzung anstoßen.
- **Z-05 Ein Ablauf:** Die UI zeigt nur noch den Vorhaben-Flow; der Story-Pfad ist aus der Oberfläche verschwunden.
- **Z-06 Projekt-Docs pflegen:** Die Dokumente, die jeder Befehl des Flows liest (Projekt-Docs, `CLAUDE.md`), je Projekt in der UI lesen und bearbeiten — am Mac und am Handy. Ergänzt 15.09. (Michael: „die wichtigen Specwright-Dateien … editieren können").

## 4. Nicht-Ziele

<!-- Mindestens eins. Naheliegende Erweiterungen ausdrücklich ausschließen. -->

- **NZ-01:** Kein Neubau des Rahmens — Workspace-Sidebar, Projekt-Tabs, Cloud-Terminal (tmux, Replay, Hooks), Settings, Team, Mobile-Shell bleiben, wie sie sind. Entschieden Michael 15.09. („Arbeitsfläche neu, Rahmen bleibt").
- **NZ-02:** Kein Umbau oder Abbau des Kanban-MCP-Servers und des Memory-Stores (`specwright/scripts/mcp/`); sie bleiben installiert. Abbau ist ein eigenes Vorhaben (Aufräum-Karte im Board).
- **NZ-03:** Kein Editieren der **Vorhaben-Dokumente** (`intent.md`, `spec.md`, `plan.md`, `build-stand.md`) in der UI — die schreibt der Agent; Michael schreibt Anmerkungen. Entschieden Michael 15.09. („Anmerkungen + Knopf → Sitzung"). Präzisiert 15.09.: Projekt-Docs (B-12) sind davon ausgenommen (Z-06).
- **NZ-04:** Keine Änderung am Flow selbst (Vorlagen, Schritte, Freigabe-Regeln der Workflows). Ausnahme nur, falls OF-01 einen Marker verlangt.
- **NZ-05:** Keine Website und keine Vault-Zwischenlösung „Cockpit" (beide aus Gesamtplan Phase 5); Letztere entfällt durch dieses Vorhaben.
- **NZ-06:** Kein Umbau des externen Plan-Reviews (Plan-Review-Orchestrator, Reviewer-Konfiguration) und der SDK-Chat-Ansicht.
- **NZ-07:** Keine Migration alter `kanban.json`- oder Backlog-Daten; sie bleiben in den Projekten liegen und werden nicht mehr gelesen.
- **NZ-08:** Keine Mehrbenutzer-Funktionen, keine Anmeldung (`docs/product-brief.md` §7, `docs/security.md` §2).
- **NZ-09:** Kein Self-Improving-Loop (Cron je Projekt, der Messprotokolle aus Produktion/Staging — eigene Logs und Traces, Dienste wie BetterStack oder Sentry — prüft und daraus neue Absichten anlegt) und keine Regel „alles ist messbar" in Vorlagen oder `CLAUDE.md`-Vorlage. Beides ist ein eigenes Vorhaben (Framework, NZ-04). Die UI sieht dafür Platz vor (RB-08). Entschieden Michael 15.09. („noch kein Implementierungsgegenstand, aber vorsehen").

## 5. Abnahmekriterien

<!-- Eine Zeile = ein beobachtbares Verhalten, genau ein Modalverb, kein Mechanismus.
     Schablonen (EARS): „Das System MUSS …" · „Wenn [Auslöser], MUSS das System …" · „Solange [Zustand], MUSS …" · „Falls [Fehler], dann MUSS …"
     Zeitangaben mit Startpunkt. Prüfung: Test | Stichprobe | Review | Messung. -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn ein Projekt in der UI geöffnet ist, MUSS die Startseite jedes Vorhaben aus dessen `intent/`-Ordner mit Kennung, Titel, Phase und Wartezustand zeigen. | Z-01 | Test |
| AK-02 | Solange mehrere Projekte geöffnet sind, MUSS die Übersicht die Vorhaben aller Projekte in einer Liste zeigen, die wartenden vor allen anderen. | Z-01 | Test |
| AK-03 | Wenn sich ein Dokument in einem Vorhaben-Ordner ändert, MUSS die Übersicht Phase und Wartezustand innerhalb von 5 s ab Speichern nachziehen, ohne Neuladen der Seite. | Z-01 | Test |
| AK-04 | Falls ein geöffnetes Projekt keinen `intent/`-Ordner hat, dann MUSS die Übersicht das mit einem Satz und dem Weg zum ersten Vorhaben zeigen. | Z-01 | Stichprobe |
| AK-05 | Wenn Michael ein Vorhaben öffnet, MUSS die UI `intent.md`, `spec.md`, `plan.md` sowie `build-stand.md` und `design/` (falls vorhanden) als gerenderten Text zeigen, mit Überschriften, Tabellen, Codeblöcken und Mermaid-Diagrammen. | Z-02 | Stichprobe (Screenshot neben MacDown) |
| AK-06 | Wenn Michael am Handy (Breite unter 768 px) ein Vorhaben öffnet, MUSS er das Dokument lesen, eine Anmerkung schreiben und freigeben können, ohne horizontal zu scrollen und ohne Terminal. | Z-02, Z-03 | Stichprobe (Screenshot) |
| AK-07 | Solange eine Sitzung des Vorhabens auf eine Freigabe wartet, MUSS die UI das am Vorhaben und am betroffenen Dokument zeigen, mit dem Schritt (Absicht, Spec, Plan, Bau). | Z-03 | Test |
| AK-08 | Wenn Michael Anmerkungen mit Bezug (Absatz oder ID wie AK-03, FA-07, §6) schreibt und „Änderungen schicken" wählt, MUSS die wartende Sitzung diese Anmerkungen samt Bezug innerhalb von 10 s ab Klick als Eingabe erhalten. | Z-03 | Test (Sitzungsprotokoll) |
| AK-09 | Wenn Michael „Freigeben" wählt, MUSS die wartende Sitzung die Freigabe als Eingabe erhalten, unterscheidbar von einem Änderungswunsch. | Z-03 | Test (Sitzungsprotokoll) |
| AK-10 | Falls beim Absenden keine wartende Sitzung existiert, dann MUSS die UI die Anmerkungen behalten und den Grund nennen (keine Sitzung, Sitzung arbeitet, Sitzung beendet). | Z-03 | Test |
| AK-11 | Wenn Anmerkungen oder eine Freigabe gesendet wurden, MUSS die UI am Vorhaben zeigen, was wann gesendet wurde. | Z-03 | Test |
| AK-12 | Wenn Michael den nächsten Schritt eines Vorhabens wählt, MUSS die UI im Projekt eine Sitzung mit dem passenden Befehl starten (`/intent`, `/spec INT-…`, `/plan INT-…`, `/build INT-…`). | Z-04 | Test |
| AK-13 | Das System DARF NICHT mehr Kanban-, Story- oder Backlog-Sichten oder einen Auto-Mode je Story anbieten — am Mac und am Handy. | Z-05 | Review + Test (Komponenten entfernt) |
| AK-14 | Solange Michael in einem Dokument liest, MUSS er an der gerade sichtbaren Stelle eine Anmerkung beginnen können, ohne zum Dokumentende zu scrollen; der Bezug (Absatz, Überschrift oder ID) wird von der Stelle übernommen. | Z-03 | Test + Stichprobe |
| AK-15 | Wenn Michael mehrere Anmerkungen an verschiedenen Stellen geschrieben hat, MUSS die UI sie gesammelt und in Dokumentreihenfolge zeigen, bevor er sie schickt. | Z-03 | Test |
| AK-16 | Wenn Michael den nächsten Schritt eines Vorhabens startet, MUSS die UI ihn das Modell der Sitzung wählen lassen — vorbelegt mit einem je Schritt (Absicht, Spec, Plan, Bau) einstellbaren Standard, der ohne Einstellung Claude Opus ist, wählbar aus allen in den Einstellungen konfigurierten Modellen (z. B. GLM, Grok), wie heute je Story. | Z-04 | Test |
| AK-17 | Wenn Michael ein Projekt geöffnet hat, MUSS die UI dessen Projekt-Docs (B-12) gerendert zeigen und als Text bearbeiten und speichern lassen — am Mac und am Handy; Speichern schreibt die Datei im Projekt, ohne Commit. | Z-06 | Test + Stichprobe (Screenshot) |

## 6. Randbedingungen

<!-- Jede mit Herkunft (Norm, Pfad zur Richtlinie, security.md, Vertrag). Technik nur, wenn von außen vorgegeben, mit „Grund:". Sonst „Keine." -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Betrieb | Merge nach `main` löst den Auto-Deploy der UI auf dem Cloud-Host aus; laufende tmux-Terminalsitzungen müssen den Neustart überleben; das Deploy-Readiness-Gate braucht nach Wegfall des Auto-Mode ein Kriterium, das eine laufende Freigabe-Antwort schützt. | `CLAUDE.md` „Nie"; `docs/security.md` §5; `ui/src/server/index.ts:66-76`; Memory `project_tmux_session_persistence` |
| RB-02 | Technik | Bestehende UI-Regeln gelten: Lit Web Components mit Präfix `aos-`, TypeScript strict ohne `any`, `projectDir()` statt harter Pfade (AR-04), Workspace-Zustand im Backend (AR-05), MCP direkt starten (AR-02). Grund: bestehende Codebasis, Rahmen bleibt (NZ-01). | `docs/architecture.md` §4; `CLAUDE.md` „Konventionen" |
| RB-03 | Technik | Das Framework darf nie von der UI abhängen (AR-06): Falls OF-01 einen Marker in den Workflows verlangt, muss der Flow ohne UI genauso laufen. | `docs/architecture.md` AR-06 |
| RB-04 | Design | Weniger ist mehr; Mocks sind Pflicht (neue Seite, neuer Ablauf, geänderte Navigation) unter `intent/INT-2026-004-ui-vorhaben-sicht/design/`; Playwright-Screenshot neben dem Mock im PR; Leerzustand, Laden, Fehler je Ansicht. | `docs/design.md` §1, §4, §6 |
| RB-05 | Sicherheit | Repo ist öffentlich: keine Hostnamen, Pfade, Nutzer, Ports des Cloud-Hosts; Anmerkungen und Freigaben laufen nur über den bestehenden Backend-Kanal (netzebenen-begrenzt), kein neuer offener Endpunkt. | `docs/security.md` §2, §5 |
| RB-06 | Betrieb | Tests der entfernten Story-Sichten werden mit den Komponenten entfernt und in `plan.md` §14 gelistet; die Bezugsliste `ui/tests/known-failures.txt` wird nur nach CI-Lauf geändert und nie gekürzt, damit etwas grün wird. | `CLAUDE.md` „Definition of Done", „Nie"; Hook `protect-tests` |
| RB-07 | Betrieb | `docs/architecture.md` §10 und `docs/design.md` §7 werden in derselben PR nachgezogen (Abweichung „Story pro Session" entfällt). | `CLAUDE.md` „Arbeitsweise" |
| RB-08 | Design | Die Arbeitsfläche ist so geschnitten, dass sie später ohne Umbau einen Self-Improving-Loop aufnimmt (NZ-09): je Projekt eine Projekt-Seite (B-13) mit Abschnitten, in der heute die Projekt-Docs liegen und später Messquellen, Läufe und Befunde; und ein Vorhaben kann eine Herkunft tragen (von Michael angelegt oder automatisch aus einer Messung), die Übersicht und Leser anzeigen, ohne umgebaut zu werden. Keine Funktion davon wird jetzt gebaut. | Michael, 15.09. („in der neuen UI bereits vorsehen, damit wir später keine teuren Änderungen machen müssen") |

## 7. Offene Fragen

<!-- Bei status "angenommen" keine blockierende Frage. Nicht blockierende nennen die Übergangsregel. Entschiedene wandern mit Datum nach „Begriffe" oder ins Kriterium. Sonst „Keine." -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Woran erkennt die UI, dass ein Review-Punkt erreicht ist und welches Dokument gemeint ist? | *entschieden 2026-09-15 (Product Owner)*: Sitzung wartet **und** das jüngste geänderte Dokument des Vorhabens ist nicht freigegeben → B-04. Ob die Workflows zusätzlich einen Marker schreiben, prüft die Spec (Bedenken RB-03). | — | — |
| OF-02 | Wie werden Anmerkungen und Freigabe als Eingabe formuliert? | *entschieden 2026-09-15 (Product Owner)*: Freigabe als Satz „Freigabe: [Dokument] [Version]", Änderungen als nummerierte Liste mit Bezug → B-05, B-06. Genauen Wortlaut legt die Spec fest. | — | — |
| OF-03 | Zerlegung in Teil-PRs oder eine PR? | *entschieden 2026-09-15 (Product Owner)*: drei PRs → B-10. Schnitt und Reihenfolge legt `plan.md` §7 fest. | — | — |
| OF-04 | Behält der Bell-Ton seine heutige Bedeutung? | *entschieden 2026-09-15 (Product Owner)*: Bell bleibt wie heute und bleibt wichtig; Review-Punkt zusätzlich sichtbar in der Übersicht (AK-07) → B-08. | — | — |

---

<!-- ===== Vertragsschicht — Pflicht ab risikoklasse "mittel" ===== -->

## 8. Begriffe

<!-- Jeden Begriff aus AK oder RB definieren, der mehr als eine Lesart hat. Entscheidungen zu offenen Fragen hier festhalten, mit Datum und Rolle. -->

- **B-01 Vorhaben:** Ein Ordner `intent/INT-JJJJ-NNN-kurzname/` im Repo-Root eines Projekts (`docs/product-brief.md` §8, AR-07). Vorhaben mit `status: abgeloest` oder `verworfen` erscheinen nicht in der Übersicht.
- **B-02 Phase:** Aus den Dokumenten abgeleiteter Stand eines Vorhabens, genau eine von: **Absicht** (nur `intent.md`, nicht `angenommen`) · **Spec** (`intent.md` angenommen, `bypass: nein`, `spec.md` fehlt oder nicht freigegeben) · **Plan** (Spec freigegeben oder `bypass: ja`, `plan.md` fehlt oder nicht freigegeben) · **Bau** (`plan.md` freigegeben, kein PR) · **PR** (`plan.md` nennt einen PR, nicht gemergt) · **umgesetzt** (`intent.md` `status: umgesetzt`). Die Lesart der Statusfelder legt die Spec fest.
- **B-03 Review-Punkt:** Eine Stelle, an der ein Workflow auf die Antwort der Person wartet: Absicht Step 5, Spec Step 5, Plan Step 9b, Bau-Fertigmeldung (`build.md:106`). Der ExitPlanMode-Dialog von Claude Code ist **kein** Review-Punkt (Vorprüfung, `plan.md:110`); er bleibt Sache des Terminals und des Plan-Review-Orchestrators (NZ-06).
- **B-04 Wartet auf dich:** Ein Vorhaben, dessen jüngste Sitzung im Zustand „wartet" ist (Hook-Status) und dessen jüngstes geändertes Dokument noch nicht freigegeben ist; dieses Dokument ist das Review-Dokument. Entschieden 2026-09-15 (Product Owner, OF-01).
- **B-05 Anmerkung:** Text von Michael mit Bezug auf ein Dokument und einen Absatz, eine Überschrift oder eine ID (AK-nn, FA-nn, §n). Entsteht an der Stelle, an der Michael gerade liest (AK-14); der Bezug kommt von dieser Stelle. Mehrere Anmerkungen gehen als nummerierte Liste mit Bezug in die Sitzung (OF-02), nie in die Datei (NZ-03).
- **B-06 Freigabe:** Die Antwort, die der Workflow als Annahme des Dokuments versteht (`ON Freigabe` in `intent.md`, `spec.md`, `plan.md`). Wortlaut: „Freigabe: [Dokument] [Version]". Entschieden 2026-09-15 (Product Owner, OF-02); genaue Form in der Spec.
- **B-07 Story-Pfad:** Kanban-Sichten, Story- und Backlog-Karten, `kanban.json`-Leser in der UI, Auto-Mode je Story mit `/execute-tasks`, Spec-Auswahl und Spec-Reihenfolge (`docs/product-brief.md` §8 „Web-UI-Pfad").
- **B-08 Rahmen:** Workspace-Sidebar, Projekt-Tabs, Cloud-Terminal samt tmux und Hooks, Bell-Ton beim Wechsel „arbeitet → wartet", Settings, Team, Mobile-Shell (Top-Bar, Bottom-Nav, Drawer, Terminal-Keys), Notizblock (Cmd+Shift+E). Bleibt (NZ-01; Bell: OF-04, entschieden 2026-09-15).
- **B-09 Sitzung des Vorhabens:** Eine Cloud-Terminal-Sitzung im Projekt des Vorhabens, in der ein v4-Befehl mit dessen Kennung läuft oder zuletzt lief. Zuordnung legt die Spec fest.
- **B-10 Drei PRs:** Lieferung in drei Pull Requests — (1) Übersicht und Lesen, (2) Review-Kanal (Anmerkungen, Freigabe, nächster Schritt), (3) Abbau des Story-Pfads. Jede PR für sich `verify: OK` und deploybar; genauer Schnitt, Reihenfolge und Abhängigkeiten in `plan.md` §7. Entschieden 2026-09-15 (Product Owner, OF-03).
- **B-11 Modell:** Die Modellwahl einer Claude-Sitzung (Anbieter + Modell), wie sie heute in den Einstellungen unter „Modelle" konfiguriert ist und je Story auf der Karte gewählt wird. Ergänzt 2026-09-15 (Product Owner, AK-16).
- **B-12 Projekt-Docs:** Die fünf Dateien, die jeder Befehl des Flows liest: `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` und `CLAUDE.md` im Repo-Root des Projekts (AR-07). Nicht dazu: ADRs, Vorhaben-Dokumente, Vorlagen unter `specwright/`. Ergänzt 2026-09-15 (Product Owner, AK-17).
- **B-13 Projekt-Seite:** Die Sicht auf ein einzelnes Projekt in der Arbeitsfläche, getrennt von der projektübergreifenden Übersicht: heute Projekt-Docs (B-12) und „Neues Vorhaben"; später Messquellen und Loop (RB-08). Ergänzt 2026-09-15 (Product Owner).

## 9. Erfolgskennzahlen

<!-- Zielwert mit Zahl und Einheit. Messung vor Produktion (Gate) oder „kein Gate". Zielwert 0 nur mit Kontrollfall. -->

| ID | Kennzahl | Zielwert | Messung vor Produktion | Messung im Betrieb | Reaktion bei Verfehlen |
|---|---|---|---|---|---|
| EK-01 | Anteil der Freigaben und Änderungswünsche, die Michael über die UI statt im Terminal gibt | ≥ 80 % über 2 Wochen ab Deploy | E2E-Lauf: ein Vorhaben durch alle vier Review-Punkte per UI (Gate) | Backend-Log der gesendeten Antworten gegen Michaels Zählung nach 2 Wochen | Ursache klären (Bedienung, Latenz, Handy) → neue `intent.md` |
| EK-02 | Zeit vom Klick „Freigeben"/„Änderungen schicken" bis der Text in der Sitzung steht | ≤ 10 s, P95 | Test mit echter Sitzung (Gate) | Backend-Log, 2 Wochen | Ursache im Kanal, Nachbesserung vor weiterer Nutzung |
| EK-03 | Ladezeit der Übersicht bei 6 offenen Projekten mit je 20 Vorhaben | ≤ 2 s ab Öffnen | Messung mit Scratch-Projekten (Gate) | Stichprobe Michael | Lesestrategie ändern |
| EK-04 | Referenzen auf `kanban.json` unter `ui/` | 0 (Kontrollfall: der Kanban-MCP-Server unter `specwright/scripts/mcp/` behält seine) | `grep` (Gate) | — | Rest entfernen vor Merge |
| EK-05 | Neue rote Testdateien gegen die Bezugsliste | 0 | `scripts/verify.sh` in CI (Gate) | CI je PR | Code reparieren, nicht die Liste |

## 10. Auslieferung, Betrieb, Zeitbudget

- **Freigabe Produktion:** Product Owner (Michael Sindlinger) — durch Merge nach `main`, der den Auto-Deploy auslöst.
- **Stufen:** drei PRs nacheinander (B-10), jede auf einmal live (ein Nutzer). Davor je PR: Branch-Backend lokal auf eigenem Port mit Scratch-Projekt (Playwright), dann Handy über Tailscale gegen das Branch-Backend.
- **Rückzug:** Revert des Merge-Commits → Auto-Deploy stellt die vorherige UI her. Daten sind unberührt (`intent/`-Ordner liegen im Projekt-Repo; alte `kanban.json` blieben liegen, NZ-07). Abschalten und Wiedereinschalten: Michael.
- **Betrieb:** Michael; keine Alarme außer dem Bell-Ton der UI.
- **Zeitbudget:** 8 Arbeitstage ab Plan-Freigabe. Abbruchkriterium: nach 8 Tagen kein durchgängiger E2E-Pfad (AK-08, AK-09) → Stand in `build-stand.md`, Vorhaben neu zuschneiden; keine stillschweigende Verlängerung.

## 11. Entscheidungsrechte

<!-- allein = entscheiden und dokumentieren · fragen = dieser Punkt ruht, Rest läuft · stopp = alles ruht. ER-00 als Auffangregel. -->

| ID | Stufe | Regel |
|---|---|---|
| ER-00 | allein (vorläufig) | Auslegungsfragen zu AK, RB oder B ohne Widerspruch: engste Auslegung, die den Wortlaut erfüllt; in der Spec unter „Annahmen" dokumentieren; weiterarbeiten. Bestätigung gesammelt bei der Spec-Freigabe. |
| ER-01 | allein | Details ohne Datenverlust und ohne Außenwirkung: interne Struktur, Benennungen, Aufgabenschnitt, synthetische Testdaten, Reihenfolge des Abbaus. |
| ER-02 | fragen | Neue externe Abhängigkeit (Bibliothek, Fremddienst). Mermaid ist bereits Abhängigkeit (`ui/frontend/package.json:30`). |
| ER-03 | fragen | Eine Kennzahl wird vor Produktion verfehlt. |
| ER-04 | stopp | Zugriff auf Produktionsdaten — hier: Läufe auf dem Cloud-Host, Änderungen an `main` eines Projekts. |
| ER-05 | stopp | Zwei Kriterien widersprechen sich. |
| ER-06 | stopp | Tests, Gates oder Schwellen müssten geändert werden, damit etwas grün wird. |
| ER-07 | stopp | Produktionsfreigabe: bereitet der Agent vor (PR, `verify: OK`, Screenshots); mergen darf nur Michael. |
| ER-08 | stopp | Zeitbudget ausgeschöpft. |
| ER-09 | fragen | Ein Test soll entfernt werden, dessen Komponente bleibt (B-08 Rahmen). Tests entfernter Story-Komponenten: allein, Liste in `plan.md` §14. |
| ER-10 | fragen | Eine Änderung an Workflows oder Vorlagen (NZ-04) erscheint nötig. |

## 12. Annahmen

- **AN-01:** Michael führt den v4-Flow in der UI über das Cloud-Terminal (`claude`-CLI in tmux) aus, nicht über die SDK-Chat-Ansicht. Prüfung: Michael bestätigt bei der Freigabe dieser Absicht. [Likely — Plan-Review-Orchestrator, Hooks und Mobile-Terminal sind für die CLI gebaut]
- **AN-02:** Der Hook-Status „wartet" (Stop-Hook, Notification `agent_needs_input`/`idle_prompt`) feuert zuverlässig, wenn ein Workflow an einem Review-Punkt anhält. Prüfung: Testlauf `/intent` in einer Cloud-Sitzung bis Step 5, Status im Backend-Log, vor Spec-Freigabe. [Likely — Bell-Funktion nutzt ihn heute, `claude-hooks.ts:70-71`]
- **AN-03:** Text lässt sich außerhalb des Plan-Dialogs genauso in eine wartende Sitzung eingeben wie im Plan-Review-Orchestrator (Tippen in die PTY plus Enter). Prüfung: Spike mit einer echten Sitzung vor Plan-Freigabe. [Uncertain — heutige Injektion ist auf den Ink-Dialog zugeschnitten, `plan-review-orchestrator.ts`]
- **AN-04:** Alle sechs Projekte im Flow haben `intent/` im Repo-Root (AR-07). Prüfung: `ls` je Projekt bei Spec-Freigabe. [Likely — Rollout 14./15.09.]
- **AN-05:** Die Übersicht kann Phase und Wartezustand allein aus Dateien im Projekt und dem Sitzungsstatus ableiten; keine eigene Datenhaltung nötig (AR-05 gilt nur für Workspace-Zustand). Prüfung: Spec. [Likely]

---

## Änderungsprotokoll

<!-- Oberste Zeile = Frontmatter-Version und -Datum.
     MAJOR: Ziel, Nicht-Ziel, Begriff oder Bedeutung eines Kriteriums geändert → Spec und Tests der IDs erneut prüfen, erneute Freigabe.
     MINOR: Kriterium ergänzt. PATCH: nur Formulierung.
     Ab status "umgesetzt" nicht mehr ändern; neue intent.md mit bezuege.ersetzt. -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.2.0 | 2026-09-15 | Z-06 und AK-17 ergänzt (Projekt-Docs lesen und bearbeiten); NZ-03 auf Vorhaben-Dokumente präzisiert (Bedeutung unverändert); NZ-09 und RB-08 ergänzt (Self-Improving-Loop: nicht bauen, Platz vorsehen); B-12, B-13. MINOR, weil nichts Bestehendes seine Bedeutung ändert | Z-06, AK-17, NZ-03, NZ-09, RB-08, B-12, B-13 | Product Owner (Michael Sindlinger), 2026-09-15 (Hinweis nach Sichtung der Mocks) |
| 1.1.0 | 2026-09-15 | AK-16 ergänzt: Modellwahl je Schritt beim Start (Standard je Schritt, Claude Opus ohne Einstellung); B-11 Modell | AK-16, B-11 | Product Owner (Michael Sindlinger), 2026-09-15 (Hinweis bei der Spec-Vorlage) |
| 1.0.0 | 2026-09-15 | Freigabe; OF-03 entschieden (drei PRs) → B-10, §10 Stufen | OF-03, B-10 | Product Owner (Michael Sindlinger), 2026-09-15 |
| 0.2.0 | 2026-09-15 | AK-14, AK-15 ergänzt (Anmerkung an der gelesenen Stelle, gesammelt in Dokumentreihenfolge); Z-03, B-05 präzisiert; OF-01, OF-02, OF-04 entschieden → B-04, B-05, B-06, B-08 | Z-03, AK-14, AK-15, B-04–B-06, B-08, OF-01/02/04 | — |
| 0.1.0 | 2026-09-15 | Entwurf nach Gespräch (4 Rückfragen: Zuschnitt, Review-Weg, Übersicht, Handy) und Codebelegen | alle | — |

<!-- Definition of Ready (vor status "angenommen"):
     [x] Drei Sätze nennen Zweck, Kernaufgaben, Endzustand und versprechen nichts, was AK/RB/NZ einschränken.
     [x] Problem mit Beleg, Anlass genannt.
     [x] Jedes AK: EARS-Form, ein Modalverb, Ziel, Prüfart, beobachtbar statt Mechanismus.
     [x] Mindestens ein Nicht-Ziel. Jede RB mit Herkunft.
     [x] Keine offene Frage mit „Blockiert: ja".
     [x] Keine Projektregeln, die in CLAUDE.md gehören.
     [x] Ab risikoklasse mittel: Abschnitte 8–12 ausgefüllt. (Risikoklasse hoch: nein → keine Blindprobe.)
     [x] `verantwortlich` hat angenommen, Commit dokumentiert die Annahme. -->
