---
intent_id: "INT-2026-002"  
titel: "Command-Schnitt 45 → 23, ein Installer-Manifest, Specwright lebt den v4-Flow selbst"  
status: "angenommen"  
version: "1.0.1"  
autor: "Claude (Gespräch mit Michael Sindlinger)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-14"  
geaendert: "2026-09-14"  
risikoklasse: "mittel"  
groesse: "M"  
bypass: "nein"  
bypass_grund: ""  
bezuege:  
  product: "docs/product-brief.md (entsteht in diesem Vorhaben, AK-08)"  
  spec: "spec.md"  
  plan: "plan.md"  
  board_karte: "Specwright — Backlog Board · „AI-native SDLC v4 — Flow nach Anthropic-Playbook neu aufsetzen“"  
  adr: []  
  ersetzt: ""  
schlagworte: [sdlc-v4, commands, installer, dogfood, phase-4]  
freigabe:  
  von: "Product Owner (Michael Sindlinger)"  
  am: "2026-09-14"  

---

# Absicht: Command-Schnitt 45 → 23, ein Installer-Manifest, Specwright lebt den v4-Flow selbst

<!-- Ablage: intent/INT-2026-002-command-schnitt/intent.md -->

## Absicht in drei Sätzen

- **Zweck:** Wer Specwright installiert, bekommt nur noch Befehle, die im neuen Ablauf (Absicht → Spec → Plan → Umsetzung) eine Rolle haben, und jeder Installer liefert dieselbe Menge — damit kein Projekt mehr mit 45 Befehlen startet, von denen 22 nichts mit dem Ablauf zu tun haben, und kein Installer eine andere Liste hat als der nächste.
- **Kernaufgaben:** (1) 22 Befehle samt ihren Workflows, Vorlagen, Agenten und MCP-Profilen entfernen, (2) eine einzige Liste, aus der alle Installer lesen, mit einer Prüfung, die bei Abweichung scheitert, (3) bestehende Projekte beim Update aktiv von den entfernten Dateien befreien, (4) das Specwright-Repo selbst auf den v4-Stand bringen: `intent/`, Projekt-Docs, einseitige `CLAUDE.md`, ein Verify-Befehl.
- **Endzustand:** Ein frisch installiertes Projekt hat genau die 23 Befehle aus der Liste (AK-01, AK-02); ein Projekt mit altem Stand hat nach dem Update dieselben 23 und keine Reste (AK-04); die Prüfung schlägt an, sobald eine Datei in einem Installer fehlt (AK-03); Specwright hat seine eigenen v4-Artefakte und einen Verify-Befehl (AK-07 bis AK-10); Version 4.0.0 (AK-11).

## 1. Problem und Anlass

Specwright liefert heute 45 Befehle [Q: `.claude/commands/specwright/`, 45 Dateien, 14.09.2026], davon stammen 20 aus Zeremonien, die der v4-Flow ersetzt (Story-Schnitt, Plattform-Planung, Marktvalidierung, Instagram-Planung, Transfer-Befehle) und 3 aus der Specwright-Memory-DB, die wegfällt [Q: `~/Documents/AI-native-SDLC-Plan-2026-09-13.md` Phase 4, O7]. Die drei Installer führen drei verschiedene Listen: `install.sh` 44 Einträge, `setup-claude-code.sh` 43, `update-specwright.sh` 25; `assign-spec` steht in keiner, `check-update` fehlt in einer [Q: Vergleich der `command_files`-Arrays gegen das Verzeichnis, 14.09.2026]. Derselbe Fehler war schon am 27.02.2026 aufgefallen (`add-team-member` in keinem Installer) und ist wiedergekommen, weil nichts den Abgleich erzwingt [Q: Memory `MEMORY.md` „Installer-Checkliste“]. Der Anlass: Der erste Pilot des v4-Flows (INT-2026-001 bei Applai) ist durch, die vier neuen Befehle sind seit 3.33.0 in allen Installern, und mit jedem weiteren Projekt, das jetzt einsteigt, wächst die Altlast — Applai trägt bereits 45 Befehle projektlokal [Q: `applai-nextjs/.claude/commands/specwright/`]. Specwright selbst lebt den Flow noch nicht: kein `intent/`, keine Projekt-Docs, `CLAUDE.md` mit 269 Zeilen, kein Verify-Befehl, keine CI [Q: Repo-Root und `CLAUDE.md`, 14.09.2026].

Nicht Teil des Problems: Die Web-UI (Auto-Mode) treibt Stories über `execute-tasks`, `kanban_get_next_task` und `kanban.json` [Q: `ui/src/server/workflow-executor.ts:30-33`, `services/auto-mode-spec-orchestrator.ts`; 88 Fundstellen `kanban.json`, 26 `execute-tasks` in `ui/src`]. Dieses Modell bleibt, bis Phase 5 die UI neu denkt (OF → entschieden, siehe NZ-01).

## 2. Betroffene

| Wer oder was | Was ändert sich |
|---|---|
| Michael als einziger Nutzer, in Terminal und Web-UI | Sieht in neuen und aktualisierten Projekten 23 statt 45 Befehle; `/intent` `/spec` `/plan` `/build` sind der Hauptweg. Nichts an der UI ändert sich. |
| Bestehende Projekte mit Specwright 3.x (Applai, Kreis Lippe, Brodybookings, kinder-phone, RD-Recruiting) | Nach `update-specwright.sh` fehlen die 22 entfernten Befehle samt Workflows; alles andere bleibt. |
| Wer Specwright liest (Referenzprojekt, Personal Brand) | Sieht ein Repo, das seinen eigenen Flow anwendet: `intent/INT-2026-002/`, `docs/`, kurze `CLAUDE.md`. |
| Systeme | Installer (`install.sh`, `setup.sh`, `setup-claude-code.sh`, `setup-devteam-global.sh`, `update-specwright.sh`), `specwright/{workflows,templates,mcp-profiles}`, `.claude/{commands,agents,skills}`, `VERSION`, `README.md`, `CLAUDE.md`. Unberührt: `ui/`, `specwright/scripts/mcp/` (Kanban-MCP), `execute-tasks`-Workflows. |

## 3. Ziele

- **Z-01:** Ein Projekt bekommt aus jedem Installer dieselbe, kleine Befehlsmenge — nur was im v4-Flow eine Rolle hat.
- **Z-02:** Installer-Drift ist ausgeschlossen: eine Liste, eine Prüfung, die jede Abweichung meldet.
- **Z-03:** Bestehende Projekte kommen ohne Handarbeit auf den neuen Stand, ohne dass etwas verloren geht, was sie noch brauchen.
- **Z-04:** Specwright ist selbst ein v4-Projekt und damit Vorlage und zweiter Pilot des Flows.

## 4. Nicht-Ziele

- **NZ-01:** Kein Umbau des Ausführungsmodells der Web-UI: `execute-tasks` (15 Workflow-Dateien), Kanban-MCP-Server, `kanban.json` und Auto-Mode bleiben unverändert (entschieden 14.09., O5). `/build` ist der Weg im Terminal; `execute-tasks` bleibt der UI-Weg bis Phase 5.
- **NZ-02:** Kein Umbau der 19 verbleibenden Alt-Befehle (`plan-product`, `create-spec`, `add-bug` usw.) auf v4-Semantik — jeder Umbau ist ein eigenes Vorhaben (entschieden 14.09., O7).
- **NZ-03:** Keine Änderung an `ui/` (Code, Tests, Build).
- **NZ-04:** Keine neue Funktion in den vier v4-Befehlen; sie werden nur nicht angefasst.
- **NZ-05:** Kein Rollout in andere Projekte innerhalb dieses Vorhabens (Kreis Lippe, Brodybookings …) — nur der Update-Weg wird gebaut und an einem Projekt nachgewiesen (AK-04).

## 5. Abnahmekriterien

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Nach einer frischen Installation in ein leeres Projekt MUSS `.claude/commands/specwright/` genau die 23 Befehle aus B-01 enthalten, nicht mehr, nicht weniger. | Z-01 | Test (Installer-Lauf gegen lokales Repo, Verzeichnis-Vergleich) |
| AK-02 | Für jeden Befehl aus B-01 MUSS der zugehörige Workflow im Projekt vorhanden sein; für keinen entfernten Befehl DARF ein Workflow, eine Vorlage, ein Agent oder ein MCP-Profil zurückbleiben, das nur er benutzt hat. | Z-01 | Test (Referenzsuche über das Repo nach jedem entfernten Namen: 0 Treffer außerhalb des Änderungsprotokolls) |
| AK-03 | Wenn eine Datei aus dem Manifest in einem Installer fehlt oder ein Installer eine Datei nennt, die das Manifest nicht kennt, MUSS die Prüfung mit Fehlercode und Dateinamen scheitern. | Z-02 | Test (absichtlich eine Zeile entfernen, Prüfung läuft rot; zurück, grün) |
| AK-04 | Wenn `update-specwright.sh` in einem Projekt mit Stand 3.x läuft, MUSS es danach genau die 22 entfernten Befehle samt ihren Workflows gelöscht, jede gelöschte Datei im Lauf benannt und alle übrigen Projektdateien unverändert gelassen haben. | Z-03 | Test (Lauf im Applai-Checkout auf einem Branch, `git status` zeigt nur Löschungen aus der Liste) |
| AK-05 | Solange ein Projekt Dateien enthält, die es selbst geändert hat (Diff zur Repo-Fassung), DARF das Update sie NICHT überschreiben oder löschen, ohne es im Lauf zu melden. | Z-03 | Test (eine Datei lokal ändern, Update laufen lassen, Meldung vorhanden, Datei unverändert) |
| AK-06 | Wenn die Web-UI nach dem Umbau Auto-Mode für eine Spec startet, MUSS sie sich verhalten wie vorher (gleiche Befehle, gleiche Kanban-Schritte). | NZ-01 | Test (`cd ui && npm test` gegen die Bezugsliste; Stichprobe Auto-Mode-Start im lokalen Backend) |
| AK-07 | Das Specwright-Repo MUSS ein `intent/`-Verzeichnis mit diesem Vorhaben und die vier Projekt-Docs (`docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md`) nach den v4-Vorlagen enthalten; `security.md` und `design.md` DÜRFEN kurz sein, aber nicht leer. | Z-04 | Review |
| AK-08 | `CLAUDE.md` des Specwright-Repos MUSS auf eine Seite passen (höchstens 90 Zeilen) und auf die Projekt-Docs verweisen statt sie zu enthalten. | Z-04 | Test (`wc -l`), Review |
| AK-09 | Ein Verify-Befehl MUSS existieren, der Installer-Syntax, beide Guards, `ui`-Lint, `ui`-Backend-Build und `ui`-Frontend-Build in einem Lauf prüft und mit `verify: OK` endet; die bekannten roten `ui`-Tests MÜSSEN als Bezugsliste geführt werden, so dass nur neue rote Suiten den Lauf brechen. | Z-04 | Test (Lauf grün auf `main`; eine Suite absichtlich brechen → rot) |
| AK-10 | Falls der Verify-Befehl lokal grün ist, MUSS dasselbe Ergebnis auch in einem CI-Lauf auf dem PR erscheinen (CI ist die Wahrheit, Pilot-Lehre). | Z-04 | Test (GitHub-Workflow auf dem PR grün) |
| AK-11 | `VERSION` und `FRAMEWORK_VERSION` MÜSSEN `4.0.0` lauten, und `README.md` DARF keinen entfernten Befehl mehr nennen. | Z-01 | Test (Guard), Review |
| AK-12 | Bevor Vorlagen der Marktvalidierung gelöscht werden, MÜSSEN sie als Rohmaterial für Phase 3 (Firmenwissen) an einem benannten Ort außerhalb des Repos liegen. | Z-01 | Stichprobe (Pfad im PR genannt, Dateien vorhanden) |

## 6. Randbedingungen

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Betrieb | Die Web-UI läuft auf dem Cloud-Droplet mit Auto-Deploy bei jedem Push auf `main`; ein Merge dieses Vorhabens deployt die UI. Was `ui/` nicht anfasst, kann sie nicht brechen — deshalb NZ-03. | Memory „Cloud Auto-Deploy + Gate“, `CLAUDE.md` (UI-Abschnitt) |
| RB-02 | Technik | Installer laden von `raw.githubusercontent.com/…/main`; eine Manifest-Datei muss deshalb selbst über dieselbe URL erreichbar sein oder in die Installer eingebettet werden. Grund: kein Build-Schritt, Nutzer führt `curl … \| bash` aus. | `install.sh` (`REPO_URL`), `setup.sh` |
| RB-03 | Betrieb | Kanban-MCP wird direkt über `$MCP_DIR/node_modules/.bin/tsx` gestartet; `scripts/check-mcp-launcher.sh` muss grün bleiben. | `CLAUDE.md` „MCP Server Launch Model“ |
| RB-04 | Technik | Vorhaben und Projekt-Docs liegen im Repo-Root (`intent/`, `docs/`), nicht unter `specwright/`. `specwright/` enthält nur Werkzeug (Workflows, Vorlagen, Standards, MCP-Profile). Grund: Absicht, Spec und Plan sind Produkt-Artefakte, die ein Mensch ohne Specwright-Kenntnis finden soll; v3 legte Specs unter `specwright/specs/`, und genau die wanderten im Pilot nach `specwright/archive/`. Gilt so schon in Applai (`CLAUDE.md:43`) und in den Vorlagen (`templates/sdlc/README.md` „Drei Ebenen, drei Ablagen“). | Pilot INT-2026-001; OF-01 |
| RB-05 | Betrieb | Kein Commit auf `main`, nur über PR; keine Änderung an `ui/config/model-config.json` (lokal ungestaged, gehört Michael). | Repo-Praxis (alle Merges via PR), Arbeitsbaum 14.09. |
| RB-06 | Technik | Entfernte Dateien werden gelöscht, nicht nach `archive/` verschoben: Git ist das Archiv. | D „harter Schnitt erlaubt“ (Gesamtplan D, 13.09.) |

## 7. Offene Fragen

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Bleibt die Ablage im Repo-Root (`intent/`, `docs/`) oder soll alles unter `specwright/` liegen wie in v3? | *entschieden 2026-09-14 (Product Owner)*: Root bleibt → RB-04, B-07 | — | — |
| OF-02 | Bleiben `document-feature`, `update-changelog`, `extract-design`, `check-update`, `add-learning`, `add-skill` (KEEP 6 laut Gesamtplan) auch dann, wenn niemand sie im Pilot benutzt hat? | *entschieden 2026-09-14 (Product Owner, Spec-Freigabe AN-S02)*: bleiben → B-01 | — | — |
| OF-03 | Wie heißt der Verify-Befehl in einem Repo ohne Root-`package.json`? | *entschieden 2026-09-14 (Product Owner)*: `scripts/verify.sh` im Root, ruft die `ui`-Skripte auf → B-08 | — | — |

---

## 8. Begriffe

- **B-01 Bleibende Befehle (23):** `intent`, `spec`, `plan`, `build` · `plan-product`, `analyze-product`, `build-development-team` · `create-spec`, `change-spec`, `add-bug`, `add-todo`, `execute-tasks` · `retroactive-spec`, `document-feature`, `update-changelog` · `add-skill`, `add-learning`, `add-domain` · `start-brainstorming`, `process-feedback`, `estimate-spec` · `extract-design`, `check-update`.
- **B-02 Entfernte Befehle (22):** `plan-platform`, `add-story`, `flag-user-actions`, `assign-spec`, `create-project-agents`, `assign-skills-to-agent`, `add-team-member`, `validate-estimation`, `analyze-feasibility`, `analyze-blockers`, `transfer-and-create-spec`, `transfer-and-create-bug`, `transfer-and-plan-product`, `brainstorm-growth-ideas`, `validate-market`, `validate-market-for-existing`, `create-instagram-account`, `create-content-plan`, `retroactive-doc`, `save-memory`, `recall-memory`, `manage-memory` (entschieden 14.09., O6; Memory-Befehle laut Gesamtplan O7: Finalize macht den 2x-Regel-Check, Claude-Code-Auto-Memory übernimmt).
- **B-03 Zugehörig:** Alles, was ausschließlich ein entfernter Befehl benutzt: sein Workflow (`specwright/workflows/{core,team,validation,marketing}/`), Vorlagen (`templates/market-validation/`, `templates/platform/`, `CLAUDE-PLATFORM.md`, Memory-Skills), Agenten (`.claude/agents/marketing-system__*`, `business-analyst`, `validation-specialist`), MCP-Profil `validate-market.json`, das Skript `setup-market-validation-global.sh`. Was ein bleibender Befehl mitbenutzt, bleibt (Prüfung per Referenzsuche, AK-02).
- **B-04 Manifest:** Eine Datei im Repo, die je Dateiart (Befehl, Workflow, Vorlage, Agent, Skill, MCP-Profil) die vollständige Liste hält, und aus der jeder Installer liest oder gegen die ein Guard ihn prüft. Zusätzlich die Liste der in 4.0.0 entfernten Dateien für den Update-Weg (AK-04).
- **B-05 Installer:** `install.sh`, `setup.sh`, `setup-claude-code.sh`, `setup-devteam-global.sh`, `update-specwright.sh`. `setup-market-validation-global.sh` wird gelöscht (B-03).
- **B-07 Ablage (entschieden 14.09., OF-01):** Vorhaben unter `intent/`, Projekt-Docs unter `docs/` im Repo-Root; `specwright/` bleibt Werkzeug. Gilt für Specwright selbst und für die Vorlagen.
- **B-08 Verify-Befehl (entschieden 14.09., OF-03):** `scripts/verify.sh` im Repo-Root; Ausgabe endet mit `verify: OK`; ruft `ui`-Lint, `ui`-Builds, Installer-Syntax, Guards und Tests gegen die Bezugsliste auf.
- **B-06 Bezugsliste:** Liste bekannter roter Testsuiten, gegen die der Verify-Befehl vergleicht; nur neue rote Suiten brechen den Lauf. Muster: Applai `.github/jest-known-failures.txt`. Stand 14.09.: 21 bekannte Fehler in `ui` laut Memory „UI-Test-Baseline in Worktrees“ [Uncertain, wird beim Bau gemessen].

## 9. Erfolgskennzahlen

| ID | Kennzahl | Zielwert | Messung vor Produktion | Messung im Betrieb | Reaktion bei Verfehlen |
|---|---|---|---|---|---|
| EK-01 | Befehle nach frischer Installation | 23 | Installer-Lauf in leeres Verzeichnis, `ls \| wc -l` | bei jedem neuen Projekt einmal zählen | Manifest und Installer abgleichen, Guard nachschärfen |
| EK-02 | Abweichungen Manifest ↔ Installer | 0 | Guard im Verify-Befehl | Guard in CI bei jedem PR | PR bleibt rot bis 0 |
| EK-03 | Reste in einem aktualisierten 3.x-Projekt (Dateien aus B-02 und B-03) | 0 | Update-Lauf im Applai-Checkout, Referenzsuche | beim nächsten Projekt-Rollout erneut | Update-Skript nachbessern, kein Handlöschen |
| EK-04 | Zeilen `CLAUDE.md` (Specwright) | ≤ 90 | `wc -l` | bei jedem PR (Guard) | kürzen, in `docs/` auslagern |

## 10. Auslieferung, Betrieb, Zeitbudget

- **Freigabe Produktion:** Michael Sindlinger (Merge des PR nach `main` = Veröffentlichung für alle Installationen und Deploy der UI auf dem Droplet).
- **Stufen:** Auf einmal (ein PR, Version 4.0.0). Vorher Nachweis des Update-Wegs an einem Projekt auf einem Branch (AK-04), nicht auf dessen `main`.
- **Rückzug:** Bei Fehlern in einer Installation: `git revert` des Merge-Commits, Version zurück auf 3.33.x; Projekte, die schon aktualisiert wurden, laufen mit `update-specwright.sh` der alten Version erneut. Abschalten und Wiedereinschalten darf Michael.
- **Betrieb:** Michael; Alarme: rote CI auf `main`, Guard-Fehler im Verify-Befehl.
- **Zeitbudget:** 3 Arbeitstage ab Plan-Freigabe. Abbruchkriterium: Wenn AK-04 (Update-Weg) nach 1 Tag nicht sauber ist, wird der Update-Weg als eigenes Vorhaben ausgekoppelt und 4.0.0 ohne ihn veröffentlicht — dann steht in den Release-Notes, dass Altprojekte von Hand aufräumen.

## 11. Entscheidungsrechte

| ID | Stufe | Regel |
|---|---|---|
| ER-00 | allein (vorläufig) | Auslegungsfragen zu AK, RB oder B ohne Widerspruch: engste Auslegung, die den Wortlaut erfüllt; in der Spec unter „Annahmen“ dokumentieren; weiterarbeiten. Bestätigung gesammelt bei der Spec-Freigabe. |
| ER-01 | allein | Details ohne Datenverlust und ohne Außenwirkung: Dateiname und Format des Manifests, interne Struktur der Installer, Reihenfolge der Löschungen, Wortlaut von Meldungen. |
| ER-02 | fragen | Neue externe Abhängigkeit (Bibliothek, Fremddienst) — auch in Installern (z. B. `jq`). |
| ER-03 | fragen | Eine Kennzahl wird vor Produktion verfehlt. |
| ER-04 | stopp | Zugriff auf Produktionsdaten — hier: Update-Lauf auf dem `main` eines fremden Projekts oder auf dem Droplet. |
| ER-05 | stopp | Zwei Kriterien widersprechen sich. |
| ER-06 | stopp | Tests, Gates oder Schwellen müssten geändert werden, damit etwas grün wird — einschließlich der Bezugsliste (B-06) nach einem nur lokalen Lauf. |
| ER-07 | stopp | Produktionsfreigabe: bereitet der Agent vor; freigeben darf nur die Rolle aus Abschnitt 10. |
| ER-08 | stopp | Zeitbudget ausgeschöpft. |
| ER-09 | stopp | Ein Befehl aus B-01 oder eine Datei, die `ui/` liest, müsste gelöscht oder verschoben werden. |

## 12. Annahmen

- **AN-01:** Kein bleibender Befehl und keine `ui`-Datei benutzt eine Datei aus B-03. Prüfung: Referenzsuche im Plan (Schritt 0), bestätigt durch AK-02 und AK-06.
- **AN-02:** Die Web-UI ruft keinen der 22 entfernten Befehle auf. Prüfung: `grep` in `ui/src` am 14.09. fand nur `execute-tasks`, `create-spec`, `add-bug` [Q: `ui/src/server/workflow-executor.ts`]; erneut im Plan.
- **AN-03:** Die Marktvalidierungs-Vorlagen sind als Rohmaterial für Phase 3 nützlich (Gesamtplan Phase 4). Prüfung: Michael sichtet die 7 Dateien beim Sichern (AK-12) und darf sie stattdessen verwerfen.
- **AN-04:** Kein anderes Repo als Applai muss innerhalb dieses Vorhabens aktualisiert werden (NZ-05). Prüfung: Michael bei Freigabe.

---

## Änderungsprotokoll

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.1 | 2026-09-14 | OF-02 entschieden (bleiben), `bezuege.spec` gesetzt — keine Änderung an Zielen oder Kriterien | OF-02, B-01 | — |
| 1.0.0 | 2026-09-14 | Freigabe durch Product Owner (Michael Sindlinger) im Gespräch; OF-02 bleibt offen bis `/spec` | alle | Michael Sindlinger, 2026-09-14 |
| 0.2.0 | 2026-09-14 | OF-01 und OF-03 entschieden (Root-Ablage, `scripts/verify.sh`), B-07/B-08 ergänzt; OF-02 bleibt offen bis `/spec` | OF-01, OF-03, B-07, B-08, RB-04 | — |
| 0.1.0 | 2026-09-14 | Entwurf nach Gespräch (O5–O9 entschieden: UI-Modell bleibt, REMOVE-Liste 22, nur Schnitt + Manifest + Dogfood, Update löscht aktiv, Risikoklasse mittel) | alle | — |

<!-- Definition of Ready (vor status "angenommen"):
     [x] Drei Sätze nennen Zweck, Kernaufgaben, Endzustand und versprechen nichts, was AK/RB/NZ einschränken.
     [x] Problem mit Beleg, Anlass genannt.
     [x] Jedes AK: EARS-Form, ein Modalverb, Ziel, Prüfart, beobachtbar statt Mechanismus.
     [x] Mindestens ein Nicht-Ziel. Jede RB mit Herkunft.
     [x] Keine offene Frage mit „Blockiert: ja".
     [x] Keine Projektregeln, die in CLAUDE.md gehören.
     [x] Ab risikoklasse mittel: Abschnitte 8–12 ausgefüllt.
     [x] `verantwortlich` hat angenommen, Commit dokumentiert die Annahme. -->
