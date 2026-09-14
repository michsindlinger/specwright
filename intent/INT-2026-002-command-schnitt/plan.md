# Plan: Command-Schnitt 45 → 23, ein Installer-Manifest, Specwright lebt den v4-Flow selbst

> **Intent:** `intent.md` (INT-2026-002, 1.0.1) · **Spec:** `spec.md` (freigegeben 14.09.)
> **Status:** umgesetzt (PR #38 gemergt `3ade63f7`, 14.09.; CI `verify` grün auf PR-Head, Run `34816030121`)
> **Erstellt:** 2026-09-14 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-14
> **Pflichtinput gelesen:** `docs/architecture.md` — existiert noch nicht (entsteht hier, §4 #40); ersatzweise `CLAUDE.md` (269 Zeilen, Stand `73ddbe5`), `README.md`, `spec.md` §7; `docs/security.md` — existiert noch nicht, Verbotsliste ersatzweise aus `CLAUDE.md` „Production Safety Rules" und `spec.md` §5.

## In einfachen Worten

**Worum geht es?** Specwright liefert heute 45 Befehle aus, obwohl der neue Arbeitsablauf nur 23 davon braucht. Schlimmer: Die fünf Installations-Skripte führen jedes eine eigene Liste, welche Dateien sie holen, und diese Listen stimmen nicht überein. Das ist der Grund, warum schon zweimal ein Befehl in einem Installer fehlte und niemand es merkte. Und Specwright selbst hält sich nicht an den Ablauf, den es allen anderen Projekten vorschreibt: Es hat keine Absichts-Ordner, keine Projekt-Docs, eine 269 Zeilen lange Arbeitsanweisung und keinen Prüfbefehl.

**Was ändert sich?** Nach diesem Vorhaben gibt es im Repo eine einzige Liste (ein „Manifest"), die sagt: diese Datei gehört dazu, kommt von dort, landet da. Alle fünf Installer lesen nur noch diese Liste, statt eigene zu führen. Eine Prüfung läuft bei jedem Pull Request und schlägt an, wenn eine Datei im Repo liegt, aber nicht in der Liste steht — oder umgekehrt. 22 Befehle verschwinden samt allem, was nur sie benutzt haben: 20 Workflow-Dateien, 15 Vorlagen, 9 Agenten, 6 Skill-Ordner, ein Installer-Skript, zwei alte Doku-Seiten. Wer ein bestehendes Projekt aktualisiert, bekommt diese Reste automatisch weggeräumt — aber nur, wenn die Datei unverändert ist; alles, was jemand selbst angepasst hat, bleibt liegen und wird gemeldet. Wer einen entfernten Befehl bewusst behalten will, trägt ihn in eine kleine Behalten-Liste ein, dann schweigt das Update. Sicherungskopien landen nicht mehr neben den Dateien, sondern in einem Ordner mit Zeitstempel, den man gesammelt löschen kann. Specwright selbst bekommt seinen Absichts-Ordner (dieses Vorhaben), die vier Projekt-Docs, eine Arbeitsanweisung unter 90 Zeilen, einen Prüfbefehl und zum ersten Mal eine automatische Prüfung auf GitHub. Version 4.0.0.

**Wie wird das gemacht?** In sechs Schritten, in einer Sitzung. Erstens eine Vorprüfung nur lesend: Wer benutzt was, damit nichts gelöscht wird, das ein bleibender Befehl braucht. Zweitens der Schnitt: 22 Befehle und ihr Zubehör löschen, und in 12 bleibenden Dateien die Sätze streichen, die noch auf gelöschte Befehle zeigen. Drittens Manifest und gemeinsame Lade-Routine bauen — eine kleine Bibliothek, die alle fünf Installer laden, damit sie sich beim Herunterladen, Überschreiben, Sichern und Löschen gleich verhalten. Die fünf Installer werden darauf umgestellt; ihre Bedienung (Fragen, Vorschau, Flags) bleibt. Viertens ein Testskript, das jeden Installer gegen den lokalen Repo-Stand in einen leeren Ordner laufen lässt und nachzählt — ohne Internet, ohne GitHub. Dasselbe Skript simuliert ein altes Projekt und prüft, dass das Update genau die richtigen Dateien löscht, veränderte liegen lässt und die Behalten-Liste respektiert. Fünftens der Prüfbefehl für Specwright selbst plus GitHub-Prüfung, mit einer Liste der 7 Test-Dateien, die in der Web-UI heute schon rot sind (die brechen nichts, alles Neue schon). Sechstens die Projekt-Docs, die kurze Arbeitsanweisung, die drei Sicherungs-Hooks aus den Vorlagen, Versionsnummer 4.0.0.

**Was kann schiefgehen?** Das größte Risiko ist der Umbau des Haupt-Installers (1.431 Zeilen): Wenn dort etwas bricht, bricht die Installation in jedem neuen Projekt. Dagegen steht das Testskript, das jeden Installer vor dem Merge tatsächlich laufen lässt. Zweites Risiko: Das Update löscht in einem Projekt etwas, das jemand brauchte. Dagegen: Es löscht nur Dateien, deren Inhalt exakt einer ausgelieferten Fassung entspricht (Prüfsumme), meldet jede Löschung, und Git hat alles. Drittes Risiko: Die Skripte müssen auf dem Mac (altes Bash 3.2) und auf Linux (Droplet, GitHub) gleich laufen — die Bibliothek verzichtet deshalb auf neuere Bash-Funktionen, und die GitHub-Prüfung läuft auf Linux, der Test lokal auf dem Mac. Der Merge löst wie immer den automatischen Neustart der Web-UI auf dem Droplet aus; da kein UI-Code angefasst wird, ändert sich dort nichts. Rückgängig: Revert des Merges, Version zurück auf 3.33.

**Was musst du entscheiden?** Nichts Neues — nur die Freigabe. Zwei Punkte, bei denen ich von deinem Vorschlag in der Spec abweiche, damit du sie siehst: (1) Das MCP-Profil der Marktvalidierung bleibt liegen, weil die Web-UI seinen Namen kennt — Aufräumen in Phase 5. (2) Die 8 Agenten-Vorlagen unter `templates/agents/` bleiben, weil sie zwar niemand mehr benutzt, aber auch nie an einem entfernten Befehl hingen — Aufräum-Karte.

## 1. Kurzfassung

Ein tab-getrenntes Manifest (`specwright/manifest.tsv`: Art, Geltung, Quelle, Ziel) und eine Liste entfernter Dateien mit Prüfsummen (`specwright/removed.tsv`) werden die einzige Wahrheit über den Lieferumfang; eine gemeinsame Bibliothek `specwright/scripts/install-lib.sh` (Bash 3.2-tauglich) liest beide und übernimmt Laden, Überspringen, Überschreiben, Sichern, Löschen und Zählen für alle fünf Installer, die nur noch ihre Bedienung behalten. 22 Befehle und ihr exklusives Zubehör werden gelöscht, 12 bleibende Dateien von Nennungen bereinigt. `scripts/verify.sh` (Guards, Installer-Test gegen `file://`-Quelle, `CLAUDE.md`-Länge, UI-Lint/Builds, Vitest gegen Bezugsliste) läuft lokal und in `.github/workflows/verify.yml`. Specwright bekommt `docs/{product-brief,architecture,security,design}.md`, eine `CLAUDE.md` ≤ 90 Zeilen, die drei Hooks aus den Vorlagen und Version 4.0.0.

## 2. Ausgangslage im Code

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Befehle | `.claude/commands/specwright/` 45 Dateien; `assign-spec.md`, `save-/recall-/manage-memory.md` ohne Workflow-Datei | 22 löschen (B-02), 23 bleiben (B-01) |
| Workflows entfernter Befehle | `specwright/workflows/core/{plan-platform,add-story,flag-user-actions,validate-estimation,analyze-feasibility,analyze-blockers,transfer-and-create-spec,transfer-and-create-bug,transfer-and-plan-product,brainstorm-growth-ideas,retroactive-doc}.md` (11), `workflows/team/` (4 inkl. README), `workflows/validation/` (3), `workflows/marketing/` (2) | 20 Dateien löschen; Ordner `team`, `validation`, `marketing` verschwinden |
| Nennungen entfernter Befehle in bleibenden Dateien | `workflows/core/create-spec.md` (add-story, flag-user-actions, transfer-and-create-spec), `start-brainstorming.md` + `.claude/commands/specwright/start-brainstorming.md` (3× transfer-and-*), `estimate-spec.md` (validate-estimation), `extract-design.md`, `plan-product.md` (validate-market), `retroactive-spec.md` (retroactive-doc), `build-development-team.md` (plan-platform), `templates/CLAUDE-LITE.md` (plan-platform, retroactive-doc, 3 Memory), `templates/docs/user-action-detection-rules.md`, `templates/skills/{architect-refinement,atomicity-validator,po-requirements}/SKILL.md` (add-story), `templates/concept/overview-template.md` (analyze-feasibility), `README.md:117,120,124,130,201-202` | 14 Stellen: Satz/Zeile streichen oder durch `/intent` bzw. `/build` ersetzen, keine Semantikänderung (NZ-02) |
| Exklusives Zubehör | `templates/market-validation/` (7), `templates/platform/` (7), `templates/CLAUDE-PLATFORM.md`, `templates/skills/{save,recall,manage}-memory/`, `.claude/skills/{save,recall,manage}-memory/`, `.claude/agents/{marketing-system__*×7,business-analyst,validation-specialist}.md`, `setup-market-validation-global.sh` (153 Zeilen), `docs/{add-story,plan-platform}-workflow.md`; in `install.sh`: `install_market_validation_global()` 729-773, `install_market_validation_project()` 1297-1333 (schreibt `market_validation:` in `config.yml`), Aufrufe 1421/1425, Flags 228-229 | löschen; `install.sh`-Funktionen und Flags entfernen |
| Nicht exklusiv, bleibt | `specwright/mcp-profiles/validate-market.json` — `ui/src/server/utils/mcp-profile.ts:33-36` kennt den Namen; `loadProfile()` 92-107 prüft `existsSync` und fällt auf `null` zurück | bleibt (Spec §7 Zeile 6); Aufräum-Karte Phase 5. `templates/agents/` (8): von niemandem referenziert, nicht in Installern → bleibt, Aufräum-Karte |
| Installer-Listen | `install.sh` Arrays `product_files@545`(11) `concept_files@558`(7) `platform_files@570`(7) `doc_files@651`(24) `document_files@669`(16) `mv_files@683`(7) `knowledge_files@694`(5) `agents@751`(10) `command_files@1241`(44) `agent_files@1271`(13) + 142 direkte `download_file`-Zeilen; `setup.sh` 88 direkte Zeilen; `setup-claude-code.sh` Array 43 + 36 Zeilen; `setup-devteam-global.sh` 174 Zeilen; `update-specwright.sh` Arrays 20/10/25/12 + 10 Zeilen | alles durch Manifest-Schleifen ersetzen (FA-04) |
| Lade-Semantik | `install.sh:346-394` `download_file` (skip-if-exists, Kategorie-Overwrite, Dry-Run, Zähler, `curl -f`); `setup-claude-code.sh:~20` überschreibt bedingungslos; `update-specwright.sh:44-75` `cmp` + Backup neben der Datei (`.backup-<ts>`), keine Löschung; `setup.sh`/`setup-devteam-global.sh` eigene `download_file` mit Overwrite-Flag | eine Routine für alle (Spec §7 Zeile 5, FA-08, FA-20) |
| Repo-Quelle | `REPO_URL` fest auf `raw.githubusercontent.com/…/main` in allen 5 Skripten (`install.sh:19`, andere `:15`/`:8`) | Override `SPECWRIGHT_REPO_URL` für Tests mit `file://` (curl kann `file://`, wget nicht → Test verlangt curl) |
| Portabilität | macOS Bash 3.2 (kein `mapfile`, keine assoziativen Arrays), `shasum -a 256` vs. Linux `sha256sum` | Bibliothek nur mit `while read`, Arrays, `case`; Prüfsummen-Helfer mit Fallback |
| Guards | `scripts/check-mcp-launcher.sh`, `scripts/check-sdlc-installers.sh` (heute früh, #37) | zweiter wird durch `scripts/check-manifest.sh` ersetzt (obsolet, weil Manifest alle Dateien abdeckt) |
| Verify-Bausteine UI | `ui/package.json`: `lint` (eslint src + frontend), `build:backend` (tsc), `build:ui`, `test` (vitest run); `ui/frontend/package.json`: `build` (tsc && vite build); Vitest kann `--reporter=json --outputFile` | `scripts/verify.sh` ruft diese; Bezugsliste aus JSON |
| UI-Test-Baseline | gemessen 14.09. im Hauptcheckout: 534 Testdateien, 7 rot: `tests/integration/websocket-terminal.test.ts`, `tests/integration/workflow.test.ts`, `tests/unit/{aos-terminal,execution-store,model-config,terminal-manager,workflow-view}.test.ts` (Memory „21" ist veraltet) | `ui/tests/known-failures.txt` mit diesen 7; Vorsicht: frische Worktrees brauchen `npm ci` in `ui/` und `ui/frontend/`, `node-pty` baut nativ |
| CI | kein `.github/` im Repo | `.github/workflows/verify.yml` neu (ubuntu, Node 22, `npm ci` beide Pakete, `bash scripts/verify.sh`) |
| `CLAUDE.md` | 269 Zeilen, 12 Abschnitte (Repository Structure 15-72, UI Guidelines 101-156, Essential Commands 165-233, Production Safety 249-256 mit „Never remove templates without deprecation notice") | Inhalt wandert in `docs/`; neue Datei ≤ 90 Zeilen nach `templates/sdlc/projekt/CLAUDE-template.md` |
| Vorlagen für Projekt-Docs und Hooks | `specwright/templates/sdlc/projekt/*.md`, `templates/sdlc/hooks/{protect-tests,no-secrets,production-gate}.sh`, `settings.json` | Dogfood: kopieren, ausfüllen; `.claude/settings.json` existiert im Repo nicht |
| `docs/` heute | `docs/{add-bug,add-story,add-todo,analyze-product,create-spec,execute-tasks,plan-platform,plan-product}-workflow.md`, `docs/adr/` (1), `docs/assets/`, `docs/ui-specs/` | Root-Ablage laut B-07; 2 Alt-Dokus löschen, Rest bleibt |
| Version | `VERSION` 3.33.0, `install.sh:18` `FRAMEWORK_VERSION`; `check-update.md` ruft `check-update.sh` aus dem Repo-Root | beide auf 4.0.0; `check-update.sh` in Schritt 0 auf Nennungen prüfen |
| `install.sh:974-1073 setup_memory_db_fallback()` | legt Ablage für den Memory-Store des Kanban-MCP an [Likely, Kopf gelesen] | bleibt — Kanban-MCP samt Memory-Werkzeugen ist NZ-01; Schritt 0 bestätigt, dass die Funktion nicht an den Memory-Befehlen hängt |
| `templates/skills/`, `.claude/skills/` | 103 bzw. 27 Dateien; Installer liefern nur `review-implementation-plan`, `atomicity-validator` und die 3 Memory-Skills nach `.claude/skills/`; UI-Skills (`backend-express`, `frontend-lit`, `domain-specwright-ui`, `innovation-coach`, …) sind Repo-intern | Manifest-Art `repo-only` für Repo-interne Dateien, damit die Vollständigkeitsprüfung sie kennt |

## 3. Entwurf

### Ansatz

1. **Manifest** `specwright/manifest.tsv` — eine Zeile je ausgelieferter Datei: `art<TAB>geltung<TAB>quelle<TAB>ziel`. `art` ∈ `command|workflow|agent|skill|template|standard|mcp-profile|mcp-script|repo-only`; `geltung` ∈ `project|global|both`; `quelle` = Pfad im Repo; `ziel` = Pfad relativ zum Projekt (`project`) bzw. zu `~/.specwright` oder `~/.claude` (`global`). `repo-only`-Zeilen deklarieren Dateien in Lieferverzeichnissen, die bewusst nicht ausgeliefert werden (UI-Skills, `templates/agents/`), damit die Vollständigkeitsprüfung sie nicht als vergessen meldet.
2. **Entfernt-Liste** `specwright/removed.tsv`: `version<TAB>geltung<TAB>ziel<TAB>sha256[,sha256]` — je gelöschter Datei die Prüfsummen ihrer letzten ausgelieferten Fassung (aus `git show eecb1cd6:<quelle>`, für Dateien, die sich in 3.3x geändert haben, zusätzlich die Fassung von `05364c1^`). „Unverändert" (FA-07) = Prüfsumme trifft eine der Listen.
3. **Bibliothek** `specwright/scripts/install-lib.sh`, von jedem Installer per `SPECWRIGHT_REPO_URL`/`REPO_URL` geladen (`curl -sSLf … | source`, bei `file://` direkt `source`). Funktionen: `sw_fetch_manifest`, `sw_install <art> <geltung> [<ziel-wurzel>]`, `sw_get <quelle> <ziel> <art>` (Skip-if-exists / Overwrite je Art über Umgebungsvariablen `SW_OVERWRITE`, `SW_OVERWRITE_<ART>`, `SW_DRY_RUN`, Backup nach `specwright/backups/<JJJJ-MM-TTTHH-MM-SS>/<ziel>` bei Ersetzen abweichender Dateien, Zähler `SW_INSTALLED/SKIPPED/UPDATED/FAILED`), `sw_remove_obsolete <geltung>` (liest `removed.tsv`, prüft `specwright/keep.txt`, vergleicht Prüfsumme, löscht oder meldet, Zähler `SW_REMOVED/SW_KEPT_MODIFIED/SW_KEPT_BY_LIST`), `sw_report`. Bash 3.2-tauglich.
4. **Installer** behalten Bedienung, Prüfungen und Anzeige; jede Dateiliste wird durch `sw_install`-Aufrufe ersetzt: `install.sh` (global: standard+template; project: workflow+mcp-profile+mcp-script; claude-code: command+agent+skill), `setup.sh` (workflow + template/project), `setup-claude-code.sh` (command+agent+skill), `setup-devteam-global.sh` (standard+template/global), `update-specwright.sh` (workflow+command+agent+skill mit Update-Semantik + `sw_remove_obsolete project`). `install.sh --update` ruft zusätzlich `sw_remove_obsolete`. Marktvalidierungs-Funktionen, Flags und der `config.yml`-Block fallen weg.
5. **Guard** `scripts/check-manifest.sh`: (a) jede `quelle` existiert, (b) jede Datei unter den Lieferverzeichnissen steht im Manifest (auch als `repo-only`), (c) kein Installer enthält noch ein Dateiliterat `download_file "$REPO_URL/…` außer dem Laden der Bibliothek, (d) `removed.tsv` und `manifest.tsv` überschneiden sich nicht, (e) `VERSION` = `FRAMEWORK_VERSION`, (f) kein entfernter Befehlsname in ausgelieferten Dateien, `README.md`, `CLAUDE.md`, `check-update.sh` (Ausnahme `intent/`, `removed.tsv`). Ersetzt `check-sdlc-installers.sh`.
6. **Installer-Test** `scripts/test-installers.sh`: `SPECWRIGHT_REPO_URL=file://$PWD`; (T1) `install.sh --project --claude-code --no-mcp --non-interactive` in `mktemp -d` → Verzeichnisvergleich gegen Manifest (`geltung` project/both je Art), erwartet 23 Befehle; (T2) `setup.sh`, `setup-claude-code.sh` einzeln ebenso; (T3) `setup-devteam-global.sh` mit `HOME=$(mktemp -d)`; (T4) Fixture „3.x-Projekt": Dateien aus `removed.tsv` per `git show eecb1cd6:` hergestellt + eine modifiziert + eine in `keep.txt`; `update-specwright.sh` → erwartet: alle unveränderten gelöscht und genannt, modifizierte liegt + gemeldet, `keep.txt`-Datei still übersprungen, `git status`-Äquivalent (Verzeichnis-Diff) zeigt nur Listen-Änderungen; (T5) Manifest um eine Zeile gekürzt → `check-manifest.sh` rot; zurück → grün.
7. **Verify + CI** `scripts/verify.sh`: `bash -n` auf 5 Installern + Bibliothek, `check-mcp-launcher.sh`, `check-manifest.sh`, `test-installers.sh`, `CLAUDE.md` ≤ 90 Zeilen, `cd ui && npm run lint && npm run build:backend && npm run build:ui`, `npx vitest run --reporter=json --outputFile=/tmp/…` + `node scripts/check-vitest-baseline.mjs` (Bezugsliste `ui/tests/known-failures.txt`, Muster Applai `check-jest-regressions.mjs`: neue rote Suite → rot, grün gewordene → Hinweis). Ende: `verify: OK`. `.github/workflows/verify.yml`: ubuntu-latest, Node 22, `npm ci` in `ui/` und `ui/frontend/`, `bash scripts/verify.sh`.
8. **Dogfood**: `docs/{product-brief,architecture,security,design}.md` aus den Vorlagen, Inhalte aus der heutigen `CLAUDE.md` (Struktur, UI-Guidelines, Locking, MCP-Launch-Modell, Shared Workspace → `architecture.md`; Zweck/Befehle/Nutzer → `product-brief.md`; Production Safety, Secrets, Hooks, „kein Droplet-Detail im öffentlichen Repo" → `security.md`; Lit/`aos-`-Muster, Less-is-More → `design.md`). `CLAUDE.md` neu nach `CLAUDE-template.md`, ≤ 90 Zeilen, Verify `bash scripts/verify.sh`, Ablage `intent/`, `docs/`, Regel „Bruch nur mit Update-Weg und Versionssprung" statt „never remove templates". Hooks nach `.claude/hooks/`, `.claude/settings.json` aus `templates/sdlc/hooks/settings.json`. `VERSION`/`FRAMEWORK_VERSION` 4.0.0, `README.md` Befehlstabelle auf 23.

### Verworfene Alternativen

| Alternative | Warum nicht |
|---|---|
| Manifest nur als Guard, Installer behalten ihre Listen (wie #37) | Drift bleibt möglich, nur später entdeckt; FA-04 verlangt genau eine Liste. |
| Manifest in die Installer einbetten (generiert per Skript, kein zweiter Download) | Generator ist ein Build-Schritt, den niemand ausführt (Muster „Skript existiert, niemand ruft es"); RB-02 erlaubt den zusätzlichen Download. |
| Jeder Installer parst das Manifest selbst, keine Bibliothek | Fünf Kopien der Lade-Semantik = die Drift im Verhalten, die Spec §7 Zeile 5 vermeiden will. |
| Löschen beim Update ohne Prüfsumme (nur Pfad) | Verletzt FA-08: lokal Verändertes würde gelöscht. |
| Prüfsumme gegen die aktuelle Repo-Fassung statt Liste | Die Datei existiert im Repo nicht mehr; Liste mit Historien-Prüfsummen ist die einzige Quelle. |
| `git` im Projekt fragen, ob die Datei geändert ist | Projekte ohne Git oder mit uncommitteten Änderungen; Installer sollen ohne Git laufen. |
| Zerlegung in zwei Worktrees (Docs vs. Installer) | Mechanisch disjunkt, aber `CLAUDE.md` beschreibt das Ergebnis des Schnitts und den Verify-Befehl; in einer Sitzung sind das 30 Minuten Doku nach dem Bau, in zwei Worktrees eine Integrationsaufgabe obendrauf (§7). |
| `validate-market.json` löschen, UI-Mapping ist tot | Spec §7 Zeile 6 hat entschieden: bei Treffer bleibt es; NZ-03 verbietet die Mapping-Änderung. Phase 5. |

### Architektur-Auswirkung

- **Nein** für die heutige (implizite) Architektur: Kanban-MCP, UI, `projectDir()`-Auflösung, Lock-Hierarchie bleiben. Neu entsteht `docs/architecture.md` als Soll; darin wird die Lieferkette „Manifest → Bibliothek → Installer" als AR-Regel festgehalten („Kein Installer führt eine eigene Dateiliste"). Kein ADR nötig: keine Datenhaltung, keine Grenze verschoben; `docs/adr/` bleibt der ADR-Ort (Vorlage sagt `docs/decisions/` — bestehender Ordner gewinnt, in `architecture.md` vermerkt).
- `security.md` §6-Fragen: kein Endpunkt, kein Datenobjekt, kein externes System außer GitHub-Raw (wie heute), keine personenbezogenen Daten.

## 4. Änderungen

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `.claude/commands/specwright/{22 Dateien aus B-02}.md` | löschen | Befehle | FA-01, FA-03 |
| 2 | `specwright/workflows/core/{11 Dateien, §2 Zeile 2}.md`, `workflows/team/`, `workflows/validation/`, `workflows/marketing/` | löschen | 20 Workflow-Dateien, 3 Ordner | FA-03 |
| 3 | `specwright/templates/market-validation/`, `templates/platform/`, `templates/CLAUDE-PLATFORM.md`, `templates/skills/{save,recall,manage}-memory/` | löschen | 15 Vorlagen + 3 Skill-Vorlagen | FA-03 |
| 4 | `.claude/skills/{save,recall,manage}-memory/` | löschen | 3 Repo-Skills | FA-03 |
| 5 | `.claude/agents/{marketing-system__*×7,business-analyst,validation-specialist}.md` | löschen | 9 Agenten | FA-03 |
| 6 | `setup-market-validation-global.sh` | löschen | Installer-Skript | FA-03 |
| 7 | `docs/add-story-workflow.md`, `docs/plan-platform-workflow.md` | löschen | Alt-Dokus | FA-03, FA-18 |
| 8 | `specwright/workflows/core/create-spec.md` | ändern | Nennungen add-story/flag-user-actions/transfer-and-create-spec streichen (Sätze, keine Schritte) | FA-18, NZ-02 |
| 9 | `specwright/workflows/core/start-brainstorming.md`, `.claude/commands/specwright/start-brainstorming.md` | ändern | „Nächster Schritt" von `transfer-and-*` auf `/intent` | FA-18 |
| 10 | `workflows/core/{estimate-spec,extract-design,plan-product,retroactive-spec,build-development-team}.md` | ändern | je eine Nennung streichen | FA-18 |
| 11 | `specwright/templates/CLAUDE-LITE.md` | ändern | Befehlsliste auf B-01 | FA-18 |
| 12 | `templates/docs/user-action-detection-rules.md`, `templates/skills/{architect-refinement,atomicity-validator,po-requirements}/SKILL.md`, `templates/concept/overview-template.md` | ändern | Nennungen streichen | FA-18 |
| 13 | `README.md` | ändern | Befehlstabelle (23, v4 zuerst), Zeilen 117/120/124/130/201-202, Installer-Optionen ohne Marktvalidierung | FA-18, AK-11 |
| 14 | `specwright/manifest.tsv` | neu | alle ausgelieferten Dateien + `repo-only` | FA-04 |
| 15 | `specwright/removed.tsv` | neu | 4.0.0-Einträge mit Prüfsummen (Befehle, Workflows, Skills, Agenten, globale Vorlagen/Workflows/Befehle der Marktvalidierung) | FA-07 |
| 16 | `specwright/scripts/install-lib.sh` | neu | Lade-/Lösch-/Zähl-Routine, Bash 3.2 | FA-04, FA-08, FA-10, FA-20, FA-21 |
| 17 | `install.sh` | ändern | Bibliothek laden; Listen → `sw_install`; `install_market_validation_*`, Flags 228-229, Aufrufe 1421/1425, `config.yml`-Block raus; `--update` → `sw_remove_obsolete`; Zähler aus Bibliothek; `SPECWRIGHT_REPO_URL`-Override; `FRAMEWORK_VERSION` 4.0.0; Quick-Reference | FA-01, FA-04, FA-17 |
| 18 | `setup.sh` | ändern | Listen → `sw_install workflow project`, `sw_install template project`; Override | FA-04 |
| 19 | `setup-claude-code.sh` | ändern | Listen → `sw_install command|agent|skill project`; bekommt damit Skip/Backup-Semantik (heute bedingungslos) | FA-04, FA-08 |
| 20 | `setup-devteam-global.sh` | ändern | Listen → `sw_install standard|template global` | FA-04 |
| 21 | `update-specwright.sh` | ändern | Listen → `sw_install … project` mit `SW_MODE=update` (ersetzen bei Abweichung, Backup in Ordner), dann `sw_remove_obsolete project`, `sw_report`; Backup-Suffix-Logik raus; `--force` bleibt (löscht trotzdem nichts Verändertes) | FA-07 bis FA-10, FA-20, FA-21 |
| 22 | `scripts/check-manifest.sh` | neu | Guard (a)–(f) | FA-05, FA-06, FA-17, FA-18 |
| 23 | `scripts/check-sdlc-installers.sh` | löschen | ersetzt durch #22 | — |
| 24 | `scripts/test-installers.sh` | neu | T1–T5 gegen `file://` | AK-01, AK-03, AK-04, AK-05 |
| 25 | `scripts/verify.sh` | neu | Kette laut §3 Punkt 7, Ende `verify: OK` | FA-06, FA-13, FA-14 |
| 26 | `scripts/check-vitest-baseline.mjs` | neu | Vergleich JSON-Report ↔ Bezugsliste | FA-15 |
| 27 | `ui/tests/known-failures.txt` | neu | 7 Dateien aus §2 | FA-15 |
| 28 | `.github/workflows/verify.yml` | neu | CI-Lauf | FA-16 |
| 29 | `check-update.sh` (Root) | ändern, falls Schritt 0 Nennungen findet | keine entfernten Namen | FA-18 |
| 30 | `VERSION` | ändern | 4.0.0 | FA-17 |
| 31 | `.gitignore` | ändern | `specwright/backups/` (Specwright selbst als Projekt) | FA-20 |
| 32 | `specwright/templates/sdlc/README.md` | ändern | Abschnitt „Update: Behalten-Liste `specwright/keep.txt`, Backups unter `specwright/backups/`" | FA-21, FA-20 |
| 33 | `docs/product-brief.md` | neu | aus Vorlage; Zweck, Nutzer (Michael), Befehle, Nicht-Ziele, Domänenbegriffe (Vorhaben, Manifest, Bezugsliste) | FA-12 |
| 34 | `docs/architecture.md` | neu | Soll: Repo-Gliederung, Framework vs. UI, Lieferkette Manifest→Bibliothek→Installer (AR-01 „keine eigene Liste"), Kanban-MCP direkt gestartet (AR-02), Lock-Hierarchie (AR-03), Shared Workspace, `projectDir()`; Droplet nur abstrakt | FA-12, Spec §7 Zeile 4 |
| 35 | `docs/security.md` | neu | Datenklassen (öffentliches Repo), Geheimnisse (`~/.claude.json`, `.env`), Verbotsliste (kein Droplet-Detail, kein Token), Hooks, Pflichtprüfungen | FA-12 |
| 36 | `docs/design.md` | neu | UI-Prinzipien (Lit, `aos-`, Less-is-More), Mock-Regel; kurz | FA-12 |
| 37 | `CLAUDE.md` | ersetzen | ≤ 90 Zeilen nach `CLAUDE-template.md`; „Production Safety" → „Bruch nur mit Update-Weg + Versionssprung"; Verify `bash scripts/verify.sh`; Verweise auf `docs/` | FA-13, FA-18, Spec §7 Zeile 2 |
| 38 | `.claude/hooks/{protect-tests,no-secrets,production-gate}.sh`, `.claude/settings.json` | neu | aus `templates/sdlc/hooks/`, Pfade angepasst | FA-12 (Vorlagen) |
| 39 | `intent/INT-2026-002-command-schnitt/plan.md` §14 | ändern | Abweichungen während der Umsetzung | — |
| 40 | `specwright/manifest.tsv` Zeilen für `templates/sdlc/**`, `workflows/core/{intent,spec,plan,build}.md`, `.claude/commands/specwright/{intent,spec,plan,build}.md` | neu (Teil von #14) | ersetzt die #37-Sonderbehandlung | FA-04 |

**Nicht betroffen (ausdrücklich):** `ui/` (Code, Tests, Build, `mcp-profile.ts`), `specwright/scripts/mcp/` (Kanban-MCP, Memory-Store), `specwright/workflows/core/execute-tasks/` (15), `specwright/mcp-profiles/{execute-tasks,create-spec,validate-market,mcp-always-on-template}.json`, `specwright/templates/agents/` (8), `templates/{concept,research,docs,documents,json,knowledge,schemas}/`, `specwright/docs/`, `docs/adr/`, `docs/ui-specs/`, `docs/{add-bug,add-todo,analyze-product,create-spec,execute-tasks,plan-product}-workflow.md`, `install.sh` MCP-Teil 1074-1139 und `setup_memory_db_fallback` 974-1073, die 23 bleibenden Befehle inhaltlich (nur Nennungen, #8-#10), `setup-mcp.sh`, `setup-ui.sh`.

## 5. Verbindungen

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| jeder Installer | `install-lib.sh` | Laden + `source` | `SW_REPO_URL`, Funktionen `sw_*` | `grep -c 'install-lib.sh' install.sh setup.sh setup-claude-code.sh setup-devteam-global.sh update-specwright.sh` → 5× ≥ 1 | — |
| `install-lib.sh` | `manifest.tsv` | Datei lesen | 4 Spalten TAB | `bash scripts/test-installers.sh` T1 (Zahl der installierten Dateien = Manifestzeilen der Art/Geltung) | — |
| `install-lib.sh` | `removed.tsv` | Datei lesen | 4 Spalten TAB | T4 | — |
| `update-specwright.sh` | `sw_remove_obsolete` | Funktionsaufruf | `sw_remove_obsolete project` | `grep -n 'sw_remove_obsolete' update-specwright.sh install.sh` | — |
| `sw_remove_obsolete` | `specwright/keep.txt` (Projekt) | Datei lesen, optional | eine Zielpfad-Zeile je Eintrag | T4 (Behalten-Fall) | — |
| `check-manifest.sh` | `manifest.tsv`, `removed.tsv`, Installer, Lieferverzeichnisse | lesen | — | `bash scripts/check-manifest.sh` grün; T5 rot/grün | — |
| `verify.sh` | Guards, `test-installers.sh`, `ui`-Skripte, `check-vitest-baseline.mjs` | Aufruf | Exit-Codes | `bash scripts/verify.sh` → `verify: OK` | — |
| `check-vitest-baseline.mjs` | `ui/tests/known-failures.txt`, Vitest-JSON | lesen | Dateipfade relativ `ui/` | eine Suite absichtlich brechen → rot; zurück → grün | — |
| `.github/workflows/verify.yml` | `scripts/verify.sh` | Aufruf | — | PR-Check grün | — |
| `CLAUDE.md` | `docs/*.md`, `scripts/verify.sh` | Verweis | Pfade | `grep -nE 'docs/(product-brief|architecture|security|design)\.md|scripts/verify.sh' CLAUDE.md` ≥ 5 | — |
| `.claude/settings.json` | `.claude/hooks/*.sh` | Hook-Registrierung | Pfade | `grep -c hooks/ .claude/settings.json` = 3; `bash -n` je Hook | — |
| `README.md` / `CLAUDE-LITE.md` | Befehle B-01 | Nennung | Namen | `check-manifest.sh` (f) | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

## 6. Reihenfolge der Arbeit

0. **Lesende Vorprüfung:** (a) Referenzsuche nach jedem B-02-Namen in `ui/src`, `specwright/scripts/mcp`, `check-update.sh`, `setup-mcp.sh`, `setup-ui.sh` → Treffer außer `mcp-profile.ts:33-36` sind Planänderungen (§14); (b) `setup_memory_db_fallback` liest keinen Memory-Befehl; (c) `templates/{concept,research}` von keinem entfernten Befehl exklusiv genutzt (bleiben); (d) Bash-Version des Droplets/CI irrelevant (Linux), Mac `bash --version` = 3.2 → Bibliothek dagegen testen. → prüfbar: Notiz in §14 „Schritt 0 ohne Treffer" oder Einträge.
1. **Bezugsliste + Verify-Skelett:** #27, #26, #25 (zunächst ohne Installer-Test), lokal `bash scripts/verify.sh` → `verify: OK` auf unverändertem Stand (Voraussetzung: `npm ci` in `ui/`, `ui/frontend/` im Worktree). → prüfbar: `verify: OK`.
2. **Schnitt:** #1–#7 löschen, #8–#13 Nennungen bereinigen, #29 prüfen. → prüfbar: `grep -rlE '\b(<22 Namen>)\b' --include='*.md' --include='*.sh' . | grep -vE '^./(intent/|ui/node_modules|specwright/removed.tsv)'` → leer außer `mcp-profile.ts`.
3. **Manifest + Entfernt-Liste:** #14, #15 (Prüfsummen per `git show eecb1cd6:<pfad> | shasum -a 256`), #40. → prüfbar: Zeilenzahl Manifest = Zahl der Dateien in Lieferverzeichnissen (`find`-Vergleich), 23 `command`-Zeilen.
4. **Bibliothek + Guard:** #16, #22, #23. → prüfbar: `bash -n`, `bash scripts/check-manifest.sh` grün; T5-Handprobe rot/grün.
5. **Installer umstellen:** #17–#21, Override `SPECWRIGHT_REPO_URL`. → prüfbar je Skript: `bash -n`; `SPECWRIGHT_REPO_URL=file://$PWD bash install.sh --dry-run --project --claude-code --no-mcp` zeigt Plan mit 23 Befehlen.
6. **Installer-Test:** #24 (T1–T5), in #25 einhängen. → prüfbar: `bash scripts/test-installers.sh` grün, danach `verify: OK`.
7. **Nachweis am Applai-Checkout (AN-S04):** Branch `chore/specwright-4.0.0` von Applai-`main`, `SPECWRIGHT_REPO_URL=file://<worktree> bash update-specwright.sh`, `git status` → nur Löschungen aus `removed.tsv` + Aktualisierungen bleibender Dateien; Protokoll nach §14/PR; Branch bleibt als PR-Angebot. → prüfbar: Zahl gelöscht = 22 Befehle + 20 Workflows + Skills/Agenten, die dort liegen; 0 Fremdänderungen.
8. **Dogfood:** #33–#38, #31, #32, #30, #13 Rest, `FRAMEWORK_VERSION`. → prüfbar: `wc -l CLAUDE.md` ≤ 90, `check-manifest.sh` (e) grün, Hooks `bash -n`.
9. **CI:** #28, Push, PR → prüfbar: PR-Check grün (CI ist die Wahrheit).
10. Verbindungen nachweisen (§5), `verify: OK` zitieren, E2E (§8), §13.

## 7. Zerlegung

### Variante A — nicht zerlegbar, eine Sitzung
Der Schnitt (Schritt 2) bestimmt den Inhalt von Manifest, Entfernt-Liste, README und `CLAUDE.md`; die Docs beschreiben den Endzustand des Umbaus. Eine Zerlegung ergäbe zwei Worktrees mit einer Integrationsaufgabe für 30 Minuten Doku-Arbeit — Pilot-Maßstab greift.

## 8. Tests und Nachweis

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01 / FA-01, FA-02 | T1–T3: Installer gegen `file://` in leere Ordner, Verzeichnis = Manifest, 23 Befehle | `scripts/test-installers.sh` | Integration (Shell) |
| AK-02 / FA-03 | Referenzsuche nach B-02-Namen = 0 in ausgelieferten Dateien | `scripts/check-manifest.sh` (f) | Test |
| AK-03 / FA-04, FA-05, FA-06 | Guard (a)–(e); T5 Manifest-Zeile entfernen → rot | `scripts/check-manifest.sh`, `test-installers.sh` | Test |
| AK-04 / FA-07, FA-09, FA-10 | T4 Fixture 3.x → genau Listen-Löschungen, Bericht mit Zählern; Applai-Nachweis (Schritt 7) | `test-installers.sh`; Protokoll im PR | Integration + manuell mit Protokoll |
| AK-05 / FA-08 | T4: modifizierte Datei bleibt + Meldung; `--force` löscht sie nicht | `test-installers.sh` | Integration |
| FA-21 | T4: `keep.txt`-Eintrag → still übersprungen | `test-installers.sh` | Integration |
| FA-20 | T4: Backup unter `specwright/backups/<ts>/`, keine `*.backup-*` neben Dateien | `test-installers.sh` | Integration |
| AK-06 / FA-11 | `cd ui && npm test` gegen Bezugsliste unverändert 7; `grep -rn 'execute-tasks\|create-spec\|add-bug' ui/src` unverändert; Auto-Mode-Start im lokalen Backend (Port 3111, Scratch-Projekt) | `ui/tests/known-failures.txt`; Stichprobe | Test + Stichprobe |
| AK-07 / FA-12 | vier Docs existieren, keine `[…]`-Platzhalter mehr | `grep -c '\[…\]' docs/*.md` = 0 | Review |
| AK-08 / FA-13 | `wc -l CLAUDE.md` ≤ 90 in `verify.sh` | `scripts/verify.sh` | Test |
| AK-09 / FA-14, FA-15 | `verify: OK`; eine Suite absichtlich brechen → rot; Bezugsliste 7 | `scripts/verify.sh`, `check-vitest-baseline.mjs` | Test |
| AK-10 / FA-16 | PR-Check grün | `.github/workflows/verify.yml` | CI |
| AK-11 / FA-17, FA-18 | Guard (e), (f); README-Tabelle 23 | `check-manifest.sh` | Test + Review |
| AK-12 / FA-19 | Kopie im Vault vorhanden, Pfad im PR | Stichprobe | Stichprobe |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss `verify: OK` ausgeben, Ausgabe wird im PR zitiert. **CI ist die Wahrheit:** lokal grün zählt erst, wenn der PR-Check grün ist. Bezugsliste `ui/tests/known-failures.txt` wird nie aufgrund eines lokalen Laufs gekürzt.
- **Datenkorrektur:** keine Bestandsdaten; der Applai-Nachweis (Schritt 7) läuft auf einem Branch, ist reversibel (`git checkout`).
- **Angeschlossen (E2E-Pfad):** `SPECWRIGHT_REPO_URL=file://$PWD bash install.sh --project --claude-code --no-mcp` in leeres Verzeichnis → 23 Befehle, Workflows, Agenten, Skills laut Manifest → dort `update-specwright.sh` erneut → „0 gelöscht, alles aktuell" → Fixture-Update T4 → Löschbericht. Zusätzlich Applai-Branch-Lauf mit `git status`-Auszug im PR. Prüfung: Protokoll (Terminal-Ausgabe) im PR.
- **Bugfix:** entfällt.
- **UI:** keine Änderung; kein Mock (Spec §6).

## 9. Risiken

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| `install.sh`-Umbau bricht einen Pfad (Dry-Run, Plan-Anzeige, Zähler, `--update`) | mittel | hoch — jede neue Installation | T1–T3 in `verify.sh` + CI; Dry-Run-Vergleich alt/neu vor dem Schnitt (Ausgabe von `install.sh --dry-run` vorher sichern, nachher diffen, nur Marktvalidierungs- und B-02-Zeilen dürfen fehlen) | Michael beim nächsten Projekt; CI vorher |
| Bash-3.2-Inkompatibilität der Bibliothek auf dem Mac | mittel | mittel | keine `mapfile`/`declare -A`/`${var,,}`; lokaler Lauf auf dem Mac ist Teil von `verify.sh` | Michael sofort beim lokalen Lauf |
| Update löscht Datei, die ein Projekt in anderer Form brauchte (Prüfsumme trifft, Inhalt aber gewollt) | niedrig | mittel | nur Listen-Dateien, Bericht je Datei, Git im Projekt, `keep.txt` | Projektinhaber beim Lesen des Berichts |
| `curl file://` funktioniert in CI/Mac unterschiedlich (`-f` mit file://) | niedrig | niedrig | Test verlangt curl; bei `file://` Bibliothek `cp` statt curl nutzen | CI |
| `node-pty` baut in CI nicht → UI-Tests rot | mittel | mittel | CI `npm ci` mit Node 22 + build-essential (ubuntu-latest hat es); falls rot: betroffene Suiten in Bezugsliste **nur nach CI-Lauf** eintragen (FA-15) | CI |
| Merge löst Droplet-Neustart der UI aus | sicher | niedrig — kein UI-Code geändert | Deploy-Readiness-Gate (Memory „Cloud Auto-Deploy + Gate") greift wie immer | Michael, Cloud-Terminal |
| Globale Reste auf Michaels Mac (`~/.claude/commands/specwright/validate-market*.md`, `~/.specwright/templates/market-validation/`, `~/.specwright/workflows/validation/`) | sicher | niedrig | `removed.tsv` mit `geltung global`; `install.sh --global --update` räumt sie; manueller Schritt §10 | Michael |
| Nennung eines entfernten Befehls übersehen | niedrig | niedrig | Guard (f) in CI | CI |

## 10. Manuelle Schritte

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Marktvalidierungs-Vorlagen sichern: `cp -R specwright/templates/market-validation/ "<Vault>/AI/Rohmaterial/Specwright-Marktvalidierung-2026-09/"` (Vault-Pfad aus `CLAUDE.md`, global) — Michael sichtet, „behalten/verwerfen" | Claude (Kopie), Michael (Sichtung) | vor Schritt 2 | [x] Kopie 14.09. (8 Dateien) · [ ] Sichtung Michael |
| Applai-Nachweis auf Branch: `cd ~/cloud-mount-mutagen/applai-nextjs && git checkout -b chore/specwright-4.0.0 main && SPECWRIGHT_REPO_URL=file://<worktree> bash <worktree>/update-specwright.sh`; `git status` ins Protokoll; Branch als PR anbieten oder verwerfen (Michael) | Claude (Lauf), Michael (Entscheid über PR) | Schritt 7 | [x] Lauf 14.09., Commit `0c1acaf5` (45 gelöscht, 0 lokal geändert) · [ ] Entscheid PR |
| PR-Review und Merge (`gh pr merge --merge`, wie alle Merges im Repo) = Veröffentlichung 4.0.0 + Auto-Deploy der UI auf dem Droplet (`autodeploy.timer`, 2-min-Poll auf `main`, laut Memory „Cloud Auto-Deploy + Gate") | Michael | nach `verify: OK` + PR-Check grün | [x] 14.09., `3ade63f7` |
| Globale Reste auf dem Mac räumen: `bash <(curl -sSL …/main/install.sh) --global --update` (ruft `sw_remove_obsolete global`) — oder `rm` der drei Pfade aus §9 | Claude mit Michaels Freigabe | nach Merge | [ ] |
| Board-Karte: Stand + PR-Link; Aufräum-Karte anlegen (`templates/agents/`, unreferenzierte Agenten/Skills, `validate-market.json` Phase 5) | Claude | laufend | [x] 14.09. |

Hook `production-gate`: kein Befehl in diesem Vorhaben enthält `deploy`+`prod`; der Merge ist der Deploy und liegt bei Michael.

## 11. Schätzung

12–20 h in einer Sitzung, Aufteilung: Schnitt + Nennungen 2 h, Manifest + Prüfsummen 2 h, Bibliothek + Guard 3–4 h, fünf Installer 3–5 h, Installer-Test 2–3 h, Verify/CI/Baseline 1–2 h, Docs + `CLAUDE.md` + Hooks 2 h, Applai-Nachweis 1 h. Unsicherheit: `install.sh` (1.431 Zeilen, Dry-Run-Anzeige und Zähler) und CI-Erstlauf (node-pty). Innerhalb des Zeitbudgets von 3 Tagen (Absicht §10); Abbruchkriterium für den Update-Weg gilt.

## 12. Review des Plans

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| Bibliothek per zusätzlichem Download macht jeden Installer von einer zweiten Datei abhängig; bei GitHub-429 bricht der Lauf früher | Self | angenommen — Bibliothek wird mit `curl -f` geladen, Fehler sofort und klar (heute schreibt `setup.sh` bei 429 Fehlerseiten in Dateien); `file://`-Modus für Tests | §3 Punkt 3, §9 |
| `removed.tsv` mit nur einer Prüfsumme je Datei erkennt ältere ausgelieferte Fassungen nicht → Update lässt sie liegen und meldet „lokal geändert" | Self | angenommen mit Änderung — mehrere Prüfsummen je Zeile (3.33.0 und die Fassung vor `05364c1`); Meldung nennt den Weg über `keep.txt` oder Handlöschung; kein stiller Verlust | §3 Punkt 2 |
| `setup-claude-code.sh` bekommt neue Skip-Semantik — wer heute „einfach überschreiben" erwartet, bekommt Skips | Self | angenommen — Flag `--overwrite` wie in `install.sh`, Ausgabe zählt Skips; dokumentiert in README | §4 #19 |
| Zwei Docs (`security.md`, `design.md`) drohen Platzhalter-Dokus zu werden | Self | angenommen — AK-07 verlangt „nicht nur Platzhalter"; Nachweis `grep -c '\[…\]'` = 0; Inhalte aus `CLAUDE.md` 101-156 und 249-256 sind real | §8 |
| Plan setzt `--non-interactive` in `install.sh` voraus, Flag-Liste zeigt Zeile 80 nicht | Self | angenommen — Schritt 0 prüft Zeile 80 (`grep -n 'non-interactive\|--yes' install.sh`); fehlt es, ergänzt #17 `--yes` | §6 Schritt 0, §4 #17 |
| Ersetzt `check-manifest.sh` den heute früh gemergten `check-sdlc-installers.sh` zu schnell? | Self | angenommen — er ist eine Teilmenge (nur `sdlc/` + 4 Befehle); Manifest deckt alles ab; Löschen mit Verweis im Commit | §4 #23 |
| Minimalinvasiv: Ist die Bibliothek nötig, oder reicht eine Schleife je Installer? | Self | abgelehnt (Schleife je Installer) — Spec §7 Zeile 5 nennt die Verhaltens-Drift ausdrücklich; fünf Schleifen mit Skip/Backup/Delete-Logik wären fünf Kopien | §3 Alternativen |

**Minimalinvasiv geprüft:** Wiederverwendet: `install.sh`-`download_file`-Semantik als Vorbild der Bibliothek (Kategorie-Overwrite, `curl -f`, Zähler), Applai-`check-jest-regressions.mjs` als Muster für die Vitest-Bezugsliste, `templates/sdlc/{projekt,hooks}` für Docs und Hooks, `check-mcp-launcher.sh` als Guard-Muster. Gestrichen: kein Generator für das Manifest, kein Umbau der MCP-Installation, kein Umbau der bleibenden Befehle, keine Änderung an `mcp-profile.ts`, keine Zerlegung.

## 13. Definition of Done

- [x] Jede FA/AK aus Abschnitt 8 hat einen grünen Test bzw. den genannten Nachweis (T1–T5, Guard, Review der Docs; AK-12 Sichtung offen).
- [x] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [x] E2E-Pfad läuft (Abschnitt 8), Protokoll im PR (T1, T4, Applai-Branch).
- [x] `verify: OK`, Ausgabe im PR — und PR-Check grün (Run `34816030121`, ubuntu).
- [x] `docs/architecture.md` angelegt (AR-01 bis AR-07).
- [ ] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert — offen: Sichtung Rohmaterial, Entscheid Applai-PR, globale Reste am Mac.
- [x] Abweichungen in Abschnitt 14 eingetragen (9).
- [x] 2x-Regel-Check: zwei Zeilen in `CLAUDE.md` (Installer-Drift, lokal grün ≠ CI grün).
- [x] Board-Karte verweist auf `intent/INT-2026-002-command-schnitt/`, Stand nachgezogen; Aufräum-Karte angelegt.

## 14. Abweichungen bei der Umsetzung

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-09-14 | Schritt 0: nur bekannte Treffer (`mcp-profile.ts:35-36`; zwei Kommentare in `specwright/scripts/mcp/kanban-mcp-server.ts`, bleibt laut NZ-01); `setup_memory_db_fallback` legt die SQLite-Ablage des MCP-Memory-Stores an, hängt nicht an den Memory-Befehlen; Flag heißt `--yes`, nicht `--non-interactive` | — | §4 #17 (kein neues Flag nötig), §6 |
| 2026-09-14 | Zusätzlich gelöscht: `setup-market-validation-project.sh` (im Plan nur das `-global`-Skript genannt); 3 Repo-Kopien der Skills (`.claude/skills/{architect-refinement,atomicity-validator,po-requirements}/SKILL.md`) von `add-story`-Nennungen bereinigt | Referenzsuche nach dem Schnitt | §4 #6, #12 |
| 2026-09-14 | Manifest liefert **alle** `templates/skills/` (100 Dateien statt 20 wie bisher in `install.sh` gelistet) und `workflows/skill/` (29, bisher von keinem Installer ausgeliefert, obwohl `add-skill` sie braucht) — Drift-Korrektur, keine neue Funktion | Installer-Listen waren unvollständig | §3 Punkt 1, §4 #14 |
| 2026-09-14 | Neue Manifest-Arten `doc` (3 Dateien `specwright/docs/`, die `setup.sh`/`install.sh` ins Projekt legen) und `script` (`specwright/scripts/auto-execute.sh`); `install-lib.sh`, `manifest.tsv`, `removed.tsv` selbst als `repo-only` | im Plan übersehen | §3 Punkt 1 |
| 2026-09-14 | `install.sh` legte bisher Specwrights eigene `CLAUDE.md` als Projekt-`CLAUDE.md` an; jetzt `templates/sdlc/projekt/CLAUDE-template.md` (wie `setup.sh`, `update-specwright.sh`) | Fehler im Bestand, beim Umbau gesehen | §4 #17 |
| 2026-09-14 | MCP-Skripte (`specwright/scripts/mcp/*.ts`) laufen als Manifest-Art `mcp-script` mit Geltung `global` (Ziel `~/.specwright/scripts/mcp/`) über `sw_install`; `install_mcp` behält Paket-Anlage und Registrierung | `mcp_files`-Array war eine weitere Liste | §4 #17 |
| 2026-09-14 | Guard (f) nimmt `specwright/scripts/mcp/` und `specwright/mcp-profiles/` aus (Kommentare bzw. bewusst bleibendes Profil) | NZ-01, Spec §7 Zeile 6 | §3 Punkt 5 |
| 2026-09-14 | UI-Test-Baseline: im Worktree waren 6 weitere Suiten rot (`posix_spawnp failed`) — Ursache: `node-pty/prebuilds/*/spawn-helper` ohne Ausführrecht nach `npm ci`; `chmod +x` behebt es. Bezugsliste bleibt bei den 7 Dateien aus dem Hauptcheckout; Hinweis in `CLAUDE.md` „Fehler zweimal“ | Umgebung, kein Repo-Fehler | §2, §8 |
| 2026-09-14 | `scripts/test-installers.sh`: `install.sh` verlangt ein beschreibbares `$HOME` (T1 legt es an); Grep-Filter für T1/T4 auf exakte Pfade eingeengt (traf `mcp-profiles/validate-market.json` bzw. den Workflow `plan-platform.md`) | Testfehler, nicht Produktfehler | §4 #24 |
