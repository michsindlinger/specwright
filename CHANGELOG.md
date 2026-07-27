# Changelog

## 3.35.0 - 2026-07-27

### Neu
- **Optionaler Worktree-Name beim Session-Start.** Die Zeile „Neuer Worktree" im Ziel-Picker hat jetzt ein Feld *Name (optional)*. Eingabe `Refactor: Auth!` → Verzeichnis `session-refactor-auth`, Branch `session/refactor-auth`. Ohne Eingabe passiert exakt das Bisherige (Benennung nach der Session-ID). Ein Klick wie zuvor; unter dem Feld steht live, was daraus wird. Alte Clients ohne Namensfeld senden kein `name` und verhalten sich unverändert.
- **Neues geteiltes Modul `shared/worktree-name.ts`** — `slugifyWorktreeName()` wird von Frontend (Live-Vorschau) und Server (autoritative Ableitung) genutzt. Der Server slugged immer neu und vertraut dem Client nie.

### Sicherheit
- **Derive-then-validate statt Blocklisting.** Die Ausgabe matcht per Konstruktion `/^[a-z0-9][a-z0-9-]*$/`: NFKD, Combining-Marks strippen, lowercase, alles Nicht-`[a-z0-9]` → Bindestrich, trimmen, 40 Zeichen. Damit sind `/`, `\`, `..`, führendes `-`, `~ ^ : ? * [ @{` und Control-Chars — sämtliche Traversal-Bausteine und `git check-ref-format`-Verstöße — nicht konstruierbar, statt abgefangen zu werden. Ein auf `.lock` endender Ref ist unmöglich, weil Punkte nicht überleben (`foo.lock` → `foo-lock`, gültig).
- **ASCII-only als bewusste Einschränkung.** Lateinische Diakritika werden aufgelöst (é→e, ü→u). `ß`, Griechisch, Kyrillisch, CJK, Emoji, ZWJ/RTL-Marker ergeben den Leerstring → klarer Fehler mit Nennung des erlaubten Alphabets, statt eines Verzeichnisses namens Nichts. Eingabelänge ist auf 200 Zeichen begrenzt, geprüft **vor** der Normalisierung.
- **Reserviertes Namensschema.** `/^cloud-\d+-\d+$/` — exakt die Form von `generateSessionId()` — ist für eigene Namen gesperrt. Sonst könnte ein Nutzer den Pfad einer künftigen automatisch benannten Session besetzen, die dann ohne erkennbaren Grund scheitert.
- **Der Rollback löscht keine fremden Branches mehr.** Der bisherige Fehlerpfad in `createCloudSessionWorktree` führte bei *jedem* Fehlschlag `git branch -D` aus. Das war gefahrlos, solange der Branchname aus der eindeutigen Session-ID stammte — der Branch konnte nur uns gehören. Mit selbstvergebenen Namen ist ein Fehlschlag *wegen Kollision* aber genau der Fall, in dem der Branch einer laufenden Session oder älterer unmerged Arbeit gehört; der Rollback hätte sie vernichtet. Bei erkannter Kollision wird jetzt nichts angefasst, nur der typisierte Fehler geworfen. Eigener Regressionstest.
- **Zwei Kollisionsschichten, weil eine nicht reicht.** Die Vorabprüfung (`existsSync` + `show-ref --verify refs/heads/<b>`) liefert die gute Fehlermeldung, ist aber nicht autoritativ: `withMainProjectLock` ist ein prozesslokaler Mutex und schützt nicht gegen einen zweiten Serverprozess. Autorität ist `git worktree add` selbst — dessen Fehlschlag wird über stderr auf `WORKTREE_NAME_TAKEN` gemappt. `show-ref --verify refs/heads/…` statt `rev-parse --verify`, sonst zählte ein gleichnamiger *Tag* als Branch-Kollision.
- **Leerstring degeneriert nicht.** `name` als `''` oder Whitespace von einem Nicht-UI-Client fällt auf die Session-ID zurück, statt einen Worktree namens `session-` anzulegen.

### Geändert
- Keine Auto-Suffixe bei Kollision (`refactor-auth-2`): der Name wurde zur Wiedererkennung gewählt, eine still angehängte Zahl macht genau das kaputt. Stattdessen `WORKTREE_NAME_TAKEN` und zurück in Schritt 2.
- Teardown benannter Worktrees ist **identisch** zu unbenannten (clean+ohne Commits → weg, mit Commits → Branch bleibt, dirty → alles bleibt). Zwei Aufräum-Regeln je nach Benennung wären eine Falle statt eines Features.
- Neue Error-Codes `INVALID_WORKTREE_NAME` und `WORKTREE_NAME_TAKEN`; beide laufen über den vorhandenen Ziel-Fehler-Pfad, der bereits in Schritt 2 mit frischer Liste zurückführt.
- Die Namens-Eingabe stoppt Event-Propagation **selektiv** — nur `ArrowUp`/`ArrowDown`/`Space`, also die Tasten, die die Listbox selbst behandelt. `Enter` startet die Session; `Tab`, Cursor-Tasten und normales Tippen laufen unverändert durch.

### Tests
- `worktree-name.test.ts` (neu, 41): Diakritika, nicht-lateinische Schriften, Emoji, ZWJ/RTL, Control-Chars via `String.fromCharCode`, Traversal-Formen, `.lock`, Längenkappung inkl. freigelegtem Trailing-Dash, reserviertes Schema.
- `session-target.test.ts` 15 → 22: Name absent/leer, Slugging, Protokollverstöße (non-string, >200) englisch vs. Nutzerfehler deutsch, reserviertes Schema, Name wird bei `main`/`existing-worktree` verworfen.
- `cloud-session-worktree.test.ts` 22 → 32: Benennung inkl. Präfix-Erhalt, Leerstring-Fallback, Kollision via Vorabprüfung **und** via git-stderr, fremder Branch überlebt beide Wege, Tag ist keine Kollision, Teardown benannter Worktrees in allen drei Zuständen.

## 3.34.1 - 2026-07-26

### Behoben
- **Session-Worktrees verlieren nicht mehr die Projekt-Agents.** Ein frischer Worktree wird von `git worktree add` befüllt und enthält daher ausschließlich *eingecheckte* Dateien. Viele Projekte halten ihre Claude-Konfiguration bewusst aus der Versionierung heraus — per `.gitignore` oder, unsichtbar im Repo, per `/.claude/` in `.git/info/exclude`. In solchen Projekten fehlten in jeder Worktree-Session die Projekt-Agents, Slash-Commands, Skills und die Permission-Allowlist. Gemessener Fall: 13 von 19 Agents waren da (die vor dem Exclude eingecheckten), 6 fehlten, dazu ein Skill und `settings.local.json`.
- **Fix:** `createCloudSessionWorktree` seedet jetzt zusätzlich zu `.mcp.json` auch `.claude/agents/`, `.claude/commands/`, `.claude/skills/` und `.claude/settings.local.json` (neue Helfer `ensureClaudeConfigInWorktree` / `removeSeededClaudeConfig` in `worktree-story.ts`). `.mcp.json` hatte exakt dasselbe Problem und wird aus exakt demselben Grund seit jeher kopiert — der Rest derselben Kategorie war schlicht vergessen.
- **Strikte Allowlist statt Blocklist.** `.claude/` enthält auch Runtime-State und Caches, die in einem Wegwerf-Worktree nichts verloren haben (`worktrees/` allein erreicht zweistellige MB, dazu `backup/`, `checkpoints/`, `mailbox/`, `scheduled_tasks.*`, `agent-registry.json`). Ein neues Junk-Verzeichnis upstream ist damit ein No-op statt einer stillen Regression. Gemessen am Referenzprojekt: 1,1 MB pro Session statt 58 MB. `.DS_Store` wird übersprungen, Symlinks werden nie verfolgt — ein Link in `.claude/` kann aus dem Projekt herauszeigen.
- **Seed-if-missing, never overwrite** — dieselbe Semantik wie `ensureMcpConfigInWorktree`, aber pro *Datei* statt pro Verzeichnis: ein `.claude/agents/` aus dem Checkout wird um die uncommitteten Agents ergänzt, statt komplett übersprungen zu werden. Was der Checkout geliefert hat, gewinnt.
- **Teardown räumt die eigenen Seeds weg**, bevor die Sauberkeitsprüfung läuft, und nur bei Byte-Gleichheit zur Quelle. Ohne das würde in einem Projekt, das `.claude/` *doch* versioniert, jede geseedete Kopie als untracked zählen — jeder Session-Worktree bliebe dauerhaft „dirty" und würde nie zurückgebaut (Orphan-Akkumulation). Eine in der Session bearbeitete Datei bleibt bewusst liegen und landet im bestehenden `keptReason: 'dirty'`-Pfad. Die Seed-Liste hängt an `OwnedSessionWorktree`, wird also nicht beim Teardown neu berechnet — eine Datei aus dem Checkout kann so nie für eine eigene gehalten werden.
- **Scope:** nur der Cloud-Session-Pfad. Der Auto-Mode hat dieselbe Lücke, aber committet und merged seine Worktrees — dort könnten geseedete Dateien in einen Commit geraten. Bewusst separat gelassen.

### Tests
- `cloud-session-worktree.test.ts` 13 → 22. Neu: Seeding trotz `.git/info/exclude`, Allowlist hält (`worktrees`/`backup`/`scheduled_tasks.lock`), `.DS_Store`, Symlink-Escape, Projekt ohne `.claude/`, Checkout-Datei bleibt unangetastet, Teardown entfernt unveränderte Seeds, behält bearbeitete, und löscht ohne Seed-Liste nichts.

### Caveats / Operator-Notiz
- Jeder neue `session-*`-Pfad ist für Claude Code ein unbekanntes Projekt (`~/.claude.json` hat keinen Eintrag dafür) → Trust-Dialog beim Start jeder Session. Blockiert die Agents nachweislich nicht, kostet aber eine Bestätigung. Ein Vorab-Eintrag würde in die globale Claude-Config des Nutzers schreiben und bleibt deshalb offen.

## 3.34.0 - 2026-07-25

### Neu
- **Ziel-Auswahl beim Start einer Cloud-Terminal-Session:** Nach der Modellwahl folgt ein zweiter Schritt „Wo soll die Session laufen?" mit drei Optionen — **Neuer Worktree** (Default, immer oben, zeigt den Base-Branch), **Hauptverzeichnis** (mit aktuellem Branch) und **bestehende Worktrees** (Ordnername + Stand). Erst der Klick auf ein Ziel startet die Session; „← Modell ändern" führt zurück. Shell-Terminals überspringen Schritt 2 und laufen wie bisher im Projektverzeichnis.
- **Belegte Worktrees sind gesperrt** (ausgegraut, Badge „aktiv"), damit nicht zwei Claude-Instanzen im selben Verzeichnis kollidieren. **Ausnahme Hauptverzeichnis:** nicht gesperrt, nur Badge „N Sessions aktiv" — Shell-Terminals, Setup-Assistent und Nicht-Git-Projekte laufen zwingend dort, Sperren wäre eine Regression. Auto-Mode-Worktrees (Branch `story/*` oder Ordner `backlog-*`) bekommen einen Hinweis-Badge, werden aber nicht gesperrt: `backlogBranchName` ist `feature/<slug>` und würde sonst handgemachte Feature-Worktrees mittreffen.
- **Alter der Worktrees in der Liste:** Jede Worktree-Zeile zeigt hinter dem Branch, wann der Worktree angelegt wurde („feature/x · vor 3 Tagen"), der Tooltip nennt Datum und Uhrzeit. git speichert kein Erstelldatum, deshalb dient das Admin-Verzeichnis `.git/worktrees/<id>` als Quelle (einmalig bei `git worktree add` geschrieben). Genommen wird der kleinste plausible Zeitstempel aus `birthtime` des Verzeichnisses, `birthtime` und `mtime` der `gitdir`-Datei — auf Dateisystemen ohne Geburtszeit liefert Node sonst die `ctime`, die bei jedem git-Schreibzugriff wandert. Ohne verwertbaren Zeitstempel bleibt die Zeile wie bisher. Das Hauptverzeichnis hat kein Admin-Verzeichnis und damit kein Alter — außer es ist selbst ein verlinkter Worktree.
- **Neuer WS-Kanal `cloud-terminal:targets`** (+ `:response`/`:error`) liefert Projekt-Root und alle Worktrees mit Branch, Sauberkeit, Belegung, Auto-Mode-Marker, `worktreeCreationEnabled` und `newWorktreeBase`. Neue pure Module `utils/git-worktree-list.ts` (Porcelain-Parser + `pathKey`) und `utils/session-target.ts` (Parsing + Allowlist-Autorisierung).
- **`effectiveCwd`** ist jetzt Teil der Session-Metadaten (Protokoll-Typ + `getSessionMetadata`) — Ground Truth statt Wunsch, sichtbar im Tab-Tooltip. `projectPath` bleibt unverändert das registrierte Projekt (sonst brächen `getSessionsForProject`, Per-Projekt-Config und Voice-Transcripts).

### Geändert
- **Notaus-Schalter `cloudSessionWorktree` lügt nicht mehr:** Bei explizit geklicktem „Neuer Worktree" antwortet der Server mit `WORKTREE_CREATION_DISABLED` statt still ins Hauptverzeichnis zu degradieren; die UI graut die Zeile mit Begründung aus und wählt „Hauptverzeichnis" vor. Alte Clients ohne `sessionTarget` behalten exakt das bisherige stille Fallback-Verhalten (plus Notice) — `parseSessionTarget` unterscheidet dafür „geklickt" von „defaulted".
- **Plan-Review liest im richtigen Baum:** externe Reviewer laufen mit `session.effectiveCwd` als `cwd` statt mit `projectPath`. Vorher verifizierten sie Pläne gegen das Hauptverzeichnis, was beim Einklinken in einen fremden Worktree zu „diese Datei gibt es nicht"-Befunden geführt hätte. Die Config-Lookups (`getReviewPrompt`) bleiben am registrierten Projekt.
- **`cloud-terminal:error` trägt jetzt `requestId`** bei Create-Fehlern. Ohne das adoptierte im Split-Screen jeder Pane den Fehler eines Nachbarn — durch die neuen Ziel-Fehler (belegt/ungültig) wäre das vom Sonderfall zum Alltag geworden. Ziel-Fehler führen zurück in Schritt 2 mit frischer Liste statt in `disconnected`.
- **`cloud-terminal:notice` hat endlich einen Consumer** (dismissible Banner). Notices aus der Create-Phase reisen in der `cloud-terminal:created`-Antwort mit (`notices[]`), weil der Client zu dem Zeitpunkt nur seine `requestId` kennt, nicht die `sessionId`.
- **Config-Lookup nach `resolveMainWorktreePath`:** vorher wurde `getCloudSessionWorktreeEnabled` mit dem rohen Pfad aufgerufen, wodurch ein als Projekt registrierter Sub-Worktree seinen Per-Projekt-Override verfehlte.

### Sicherheit
- **Drei Schichten gegen das Löschen fremder Worktrees.** (1) `createCloudSessionWorktree` liefert einen Branded Type `OwnedSessionWorktree`, den nur diese Funktion erzeugen kann — `worktreeCleanup` bei einem angehängten Worktree zu setzen ist damit ein Compile-Fehler, keine Review-Frage. (2) `removeCloudSessionWorktree` verweigert per Early-Return alles außerhalb von `session-*` / `session/*` und deckt damit beide `git branch -d`-Stellen mit einer Prüfung ab. (3) Tests über `closeSession`, `terminal.exit` und `shutdown`.
- **Keine Shell-Interpolation mehr** in `removeCloudSessionWorktree`: alle git-Aufrufe laufen über `spawnSync` mit argv-Array. Vorher waren die Pfade serverseitig erzeugt und damit harmlos — mit einem client-gelieferten Zielpfad wäre daraus eine Command-Injection-Fläche geworden.
- **Zielprüfung ist eine Exakt-Match-Allowlist** gegen `git worktree list --porcelain`, kein Prefix-Check auf `<projekt>-worktrees/`. Traversal-Pfade und Worktrees fremder Repos stehen schlicht nicht in der Liste. Normalisierung läuft beidseitig durch dieselbe `pathKey`-Funktion (`realpathSync.native` → `realpathSync` → `resolve`); jede Restdiskrepanz endet damit in einer Ablehnung, nie in einem falschen Arbeitsverzeichnis.
- **Race-frei belegt:** Occupancy-Check und `session.effectiveCwd`-Claim liegen ohne `await` dazwischen — Node ist single-threaded, damit ist Check-then-Set atomar gegen ein paralleles `createSession`. Zusätzlich `existsSync`-Re-Check unmittelbar vor `spawn` gegen externes Entfernen zwischen Validierung und Start.
- **`.mcp.json` wird in fremden Worktrees nur noch geseedet, nie überschrieben** (`ensureMcpConfigInWorktree`): fehlend → kopieren, identisch → No-op, abweichend → unangetastet + Notice. `copyMcpConfigToWorktree` behält die Overwrite-Semantik für die Auto-Mode-Aufrufer.
- **`ensureSpecwrightRuntimeGitignored` fasst gestagte Fremdarbeit nicht mehr an:** liegt beim Aufruf irgendetwas im Index, wird die komplette Migration verschoben (nichts geschrieben, nächste Session versucht es erneut). Ein pathspec-limitierter Commit wäre der falsche Fix — `git commit -- <pfad>` verhält sich wie `--only` und würde den Worktree-Inhalt der genannten Pfade neu stagen, also genau das `git rm --cached` rückgängig machen. Relevant geworden, weil „Hauptverzeichnis" jetzt eine reguläre Wahl ist.

### Tests
- `git-worktree-list.test.ts` (29), `session-target.test.ts` (14), `cloud-session-target.test.ts` (22), `session-target-rows.test.ts` (25), `runtime-gitignore.test.ts` +2 (10). Abgedeckt u.a.: Backward-Compat ohne `sessionTarget`, alle drei Safety-Teardown-Pfade, Race mit `Promise.allSettled`, keine Geister-Occupancy nach Fehlschlag, sofortige Freigabe bei `terminal.exit`, Traversal/Fremd-Repo/gelöschter Worktree, Notaus explizit vs. implizit, Erstelldatum inkl. gelöschtem Worktree und Nicht-Repo, Altersformatierung inkl. Uhr-Vorlauf.

### Caveats / Operator-Notiz
- `CloudTerminalManager.shutdown()` hat weiterhin **keinen Aufrufer** (`websocket.ts` ruft nur `webSocketManager.shutdown()`) — verwaiste `session-*`-Worktrees überleben deshalb Server-Neustarts und tauchen im Picker auf. Einklinken ist erlaubt (praktisch zur Rettung liegengebliebener Arbeit), sie werden dann aber nie automatisch entfernt. Verdrahtung + Startup-Orphan-Sweep bleiben der bereits unter 3.33.0 notierte Folgeschritt.
- Occupancy kennt nur Cloud-Sessions. Ein Mensch mit offenem Editor oder ein Spec-Level-Auto-Mode-Worktree ohne eigene Session erscheinen als frei.
- Prozessübergreifendes TOCTOU bleibt: zwischen Auflistung und Start kann ein Fremdprozess den Worktree entfernen oder sperren. Abgefedert durch den Pre-Spawn-Check, nicht ausgeschlossen (dafür bräuchte es ein Advisory-Lockfile).

## 3.33.0 - 2026-07-24

### Neu
- **Eigener Git-Worktree pro interaktiver Cloud-Terminal-Claude-Session:** Jede vom Nutzer gestartete `claude-code`-Cloud-Session läuft ab jetzt in einem frischen, wegwerfbaren Worktree auf einem eigenen `session/<sessionId>`-Branch (abgezweigt vom `baseBranch`, Fallback `HEAD`). Parallele Claude-Sessions kollidieren so nicht mehr im selben Working Tree/Branch. Das einfache **"Terminal" (shell) bleibt** im Hauptordner. **Ausgenommen:** Auto-Mode (legt eigene Story-Worktrees an) und Workflow-Tabs (spec-eigene git-Strategie) — beide erhalten kein `isolateInWorktree`. Neu: `utils/cloud-session-worktree.ts` (reused Bausteine aus `worktree-story.ts`), zentralisiert in `CloudTerminalManager.createSession` (jetzt `async`). Kanban-Runtime-Writes werden per `SPECWRIGHT_MAIN_PROJECT_PATH` zurück ins Hauptprojekt geroutet (wie Auto-Mode).
- **Teardown:** Beim Schließen — clean ohne Commits → Worktree + leerer Branch weg; clean mit Commits → Worktree weg, Branch bleibt (für PR); dirty → alles behalten + UI-Notice (`cloud-terminal:notice`) statt nur Log. Idempotent über `closeSession`/`terminal.exit`/`shutdown`.
- **Feature-Flag `cloudSessionWorktree`** (`general-config.json`, default `true`) als Notaus.

### Tests
- `cloud-session-worktree.test.ts`: Naming-Disjunktheit, Base-Fallback/Non-Repo, vier Remove-Fälle, Idempotenz, Manager-Wiring (claude-code→Worktree-cwd, shell→Hauptordner). 13/13.

### Caveats / Operator-Notiz
- Neue Sibling-Ordner `<projekt>-worktrees/session-*` (außerhalb des Repos → kein `.gitignore` nötig) und lokale `session/*`-Branches. Bei Server-Hard-Crash können Worktree+Branch verwaisen (nur Plattenplatz/Metadaten) → `git worktree prune` + `git branch -D session/*`. Startup-Orphan-Sweep ist als Folgeschritt vorgesehen.

## 3.28.6 - 2026-05-06

### Behoben
- **Append-only Spec-Docs auto-concat via `merge=union` (D17):** Stories die unabhängig `integration-context.md` oder `user-todos.md` anlegen oder erweitern, kollidierten beim Auto-Rebase mit add/add- oder modify/modify-Conflicts → Halt. Beobachtet bei TITLE-001 in `2026-05-06-title-substring-search`: TITLE-001 added `integration-context.md` (Story-Inhalt), Spec-Branch hatte denselben File aus TITLE-002-Merge — D13 Auto-Rebase failed, Orchestrator halted. Fix: `seedSpecDirInWorktree` installiert idempotent eine `.gitattributes`-Datei im Spec-Dir, die `integration-context.md` und `user-todos.md` als `merge=union` markiert. Git's built-in Union-Driver concat'd beide Seiten bei Conflict statt zu failen.
- Backfill: existing Spec-Worktrees re-runnen `seedSpecDirInWorktree` bei jedem Orchestrator-Init via `setupSpecWorktree` → `.gitattributes` wird beim ersten Post-D17-Init committed und propagiert via Story-Branch-Fork zu allen neuen Story-Branches.

### Geändert
- Neue Const `SHARED_SPEC_DOCS = ['integration-context.md', 'user-todos.md']` in `worktree-story.ts`. Pattern wie `MUTABLE_SPEC_FILES` — Future-Erweiterung (z.B. `glossary.md`) ist One-Line-Change.
- Neue private Helper `ensureGitattributesUnion(specDir)` — sentinel-grep idempotent install, append-only auf existing `.gitattributes` (überschreibt nichts).

### Tests
- `pam-005-worktree-helpers.test.ts`: D17-Regression — Story branched off altem Spec-Tip mit eigenem `integration-context.md`-Append; Spec-Tip advanced mit Sibling-Append; `mergeStoryBranchIntoSpec` (mit D13 Auto-Rebase) muss erfolgreich concat'en (alle drei Sections in finaler Datei). 61/61 passing.

### Caveats
- `merge=union` ist line-level concat ohne Struktur-Awareness. Duplikate möglich (z.B. doppelte Header-Zeilen). Akzeptabel für append-only Docs; periodische manuelle Konsolidierung bleibt User-Verantwortung. Alternative wäre Markdown-Section-Parser, aber Overengineering vs. surgical D17-Fix.
- D17 schützt NICHT vor echten Code-Conflicts (zwei Stories editieren gleiche Source-Line). Source-Files brauchen weiterhin Human-Resolution wenn Rebase-Conflict fired.

## 3.28.5 - 2026-05-06

### Behoben
- **Auto-Commit forgotten changes statt halt-on-dirty (D16):** `onItemCompleted` halt'te bisher das gesamte Auto-Mode wenn LLM eine Story als done markierte aber Datei-Änderungen uncommitted ließ (typisch: `integration-context.md` Update vergessen). Mit Sequential-Mode (D15) reicht ein vergessenes Doc-Update um den ganzen Run zu stoppen — extrem fragil. Fix: Wenn Story-Worktree dirty bei Completion → `git add -A && git commit -m "chore(${storyId}): auto-commit forgotten changes (D16)"` automatisch, dann normal weiter zum Merge. Auto-Commit ist sicher: Story-Branch-Isolation, descriptive message für Audit, keine Data-Loss vs. dem alten Halt der nichts löste sondern nur User-Intervention erforderte. Beobachtet: WCAG-010/011 hingen weil LLM `integration-context.md` doc-only-updates ohne commit ließ.
- Fallback bleibt: wenn Auto-Commit selbst failt (git index lock, hook reject, etc.) → alte Halt-Behavior mit Incident.

### Tests
- `orchestrator-routing.test.ts`: D16 Test — `onItemCompleted` mit dirty worktree triggert auto-commit + merge, kein halt, kein incident. 21/21 passing.

### Behaviour-Change
- Story-Branch-Historie kann jetzt zusätzliche `chore(${storyId}): auto-commit forgotten changes (D16)` Commits enthalten. User kann nach Run via `git log --grep "D16"` auditen welche Stories Auto-Commit getriggert haben — Hinweis auf LLM-Workflow-Verbesserungspotential.

## 3.28.4 - 2026-05-06

### Geändert
- **Worktree-Strategy = Sequential per Default (D15):** `AutoModeSpecOrchestrator.create()` zwingt `maxConcurrent=1` wenn `gitStrategy=worktree`, unabhängig vom Caller-Request. v3.28.0..3 haben individuelle Parallel-Race-Bugs (Mutex, Branch-Base, Auto-Rebase, Merge-CWD) gefixt, aber Real-World-Runs zeigen weiterhin Edge-Cases (LLM-side Hangs maskiert als Parallel-Probleme, stale-base-detection-Lücken). Sequential ist der sichere Default. Branch-Strategy bleibt beliebig parallelisierbar — kein Worktree-Overhead, kein Race-Surface.
- Log-Hint: Wenn Force-Down passiert, loggt Backend `[SpecOrchestrator] D15: gitStrategy=worktree → forcing maxConcurrent=1 (was N)`.

### Tests
- `orchestrator-routing.test.ts`: D15 Force-Down assertion. Existing parallel-mode-Tests (`parallel mode + missing worktreeOps`, `parallel mode + createStoryWorktree throws/succeeds`, `parallel mode + missing specBranch`) jetzt via `makeParallelWorktreeOrch` Helper über Constructor — bypassen D15 um Parallel-Mode-Code-Pfad weiterhin testbar zu halten. 20/20 passing.

### Nicht-Ziel
- D15 ist eine **konservative Default-Wahl**, kein Verbot. Wer Parallel-Worktree-Mode will, kann via direktem Constructor (`new AutoModeSpecOrchestrator({...})`) bypass'en — Production-Caller benutzt aber `.create()` und kriegt Sequential. Wenn Parallel-Mode bullet-proof ist (alle Edge-Cases gefixt + breite Test-Coverage), kann D15 entfernt werden.

## 3.28.3 - 2026-05-06

### Behoben
- **Merge läuft jetzt im Spec-Worktree, nicht im Main-Repo (D14):** `mergeStoryBranchIntoSpec` machte vorher `git checkout ${specBranch}` mit `cwd: projectPath` (= Main-Repo). Wenn `gitStrategy=worktree` aktiv ist, lebt die Spec-Branch im Spec-Sub-Worktree → `git checkout` failed mit `branch already used by worktree`. Try/Catch hat den echten Fehler verschluckt und `Merge conflict: ...` geworfen — irreführende Fehlermeldung. Folge: ALLE automatisierten Merges im Worktree-Mode failed silent. "Erfolgreiche" Merges in der Vergangenheit waren entweder LLM-seitig im Story-Worktree oder manuell. v3.28.0/.1/.2 Race-/Base-Fixes hatten daher nie eine Chance, weil die Merge-Funktion grundsätzlich falsche `cwd` benutzte.
- **Fix:** `mergeStoryBranchIntoSpec` akzeptiert neuen Pflicht-Parameter `specWorktreePath` und führt rebase + merge in dieser Working-Tree-Direktory aus. `git checkout` Schritt komplett entfernt — Spec-Worktree ist per Definition schon auf `specBranch`. Für Non-Worktree-Strategy bleibt `specWorktreePath === projectPath` (Caller-Verantwortung), Verhalten unverändert.

### Geändert
- `SpecWorktreeOps.mergeStoryBranchIntoSpec` Interface erweitert: 5. Parameter `specWorktreePath: string`. Caller in `auto-mode-spec-orchestrator.ts:resolveSlotProjectPath` reicht `this.config.projectPath` durch (= Spec-Worktree-Pfad bei `gitStrategy=worktree`).

### Tests
- `pam-005-worktree-helpers.test.ts`: D14-Regression (Merge läuft in Spec-Worktree, Main-Repo bleibt auf `main`, Spec-Branch advanced). Existing D11/D13-Tests auf Spec-Worktree umgestellt. 60/60 passing.

## 3.28.2 - 2026-05-06

### Behoben
- **Auto-Rebase vor Merge (D13 / BPAM-013):** `mergeStoryBranchIntoSpec` rebased Story-Branch auf aktuellen Spec-Tip BEVOR der Merge versucht wird. D11 stellt sicher, dass eine Story zum Erstellungszeitpunkt vom Spec-Tip abzweigt — D13 schließt die Lücke, dass Sibling-Stories den Spec-Tip währenddessen advancen können. Common ancestor ist dann der ALTE Spec-Tip; ein Inhalt-Overlap auf shared Spec-Docs (z.B. `integration-context.md`) explodiert als Merge-Conflict, den ein sauberer Rebase trivial löst. Beobachtet bei `2026-05-05-ifdb-wcag-2-2-aa-remediation` WCAG-005: WCAG-005's Merge-Base war stale → Conflict trotz D11. Mit D13: Rebase repliziert WCAG-005's Diff auf Spec-Tip mit bereits gemergten Sibling-Commits, danach Fast-Forward-Merge.
- **Echter Rebase-Conflict halt-fast:** Wenn Rebase wirklich nicht auflösbar ist (zwei Stories editieren exakt dieselbe Zeile), wirft `Rebase conflict: ${storyBranch} → ${specBranch} (manual resolve required)`. `git rebase --abort` cleant Worktree, Orchestrator hält an statt fragwürdigen Half-Merge zu produzieren.
- **Fast-path no-op:** Wenn `git merge-base specBranch storyBranch === specBranch` (Story-Branch ist bereits up-to-date), wird Rebase übersprungen — keine unnötige Commit-Replay.

### Geändert
- `SpecWorktreeOps.mergeStoryBranchIntoSpec` Interface erweitert um `storyWorktreePath: string` Parameter. Caller in `auto-mode-spec-orchestrator.ts:resolveSlotProjectPath` reicht den Story-Worktree-Pfad durch, damit Rebase im richtigen Working-Tree läuft.

### Tests
- `pam-005-worktree-helpers.test.ts`: Auto-Rebase-Happy-Path (zwei Stories editieren disjoint sections derselben Datei → clean rebase), Rebase-Conflict-Halt (zwei Stories editieren exakt dieselbe Zeile → throw + worktree clean). +2 Tests, 59/59 passing.

## 3.28.1 - 2026-05-06

### Behoben
- **Story-Sub-Worktrees branchen jetzt vom Spec-Branch-Tip (D11 / BPAM-011):** `WorkflowExecutor.createStoryWorktree` akzeptiert einen neuen Pflicht-Parameter `specBranch` und übergibt ihn als expliziten Base-Ref an `git worktree add -b storyBranch path specBranch`. Vorher branchte Git implizit von `cwd: mainProjectPath` HEAD = main-Branch — Story-Branches starteten ohne bereits gemergte Sibling-Stories und kollidierten deterministisch beim Re-Merge bei jeder Datei-Überschneidung. Beobachtet: WCAG-003-Story-Branch ohne WCAG-001's `globals.css`-Fix → garantierter Merge-Conflict beim `mergeStoryBranchIntoSpec`. Mit D11 startet jeder neue Story-Branch vom aktuellen Spec-Branch-Tip, alle bereits-gemergten Sibling-Commits sind vorhanden, Re-Merge ist no-op. (`workflow-executor.ts createStoryWorktree`, `auto-mode-spec-orchestrator.ts resolveSlotProjectPath`)
- **`gitStrategy=worktree` ohne `specBranch` halt-fast statt silent fallback:** Wenn `this.specBranch` undefined ist (sollte bei `setupSpecWorktree` gesetzt werden), wirft die Orchestrator-Logik im Parallel-Modus einen Setup-Error und triggert Sub-Worktree-Failure-Incident statt unbemerkt auf die Project-Root-Path zu fallen. Im Serial-Modus bleibt der safe Fallback auf `projectPath` (mit Warning).

### Geändert (D12 — Halted-State UI Parity)
- **Cloud-Terminal-Buffer wird vor Session-Close persistiert:** Vor jedem `closeSession`-Call (normaler Story-Übergang, Cancel, Crash via `session.closed`) schreibt `AutoModeCloudSession.archiveLogsBeforeClose` den Tail (max 200 KB) des PTY-Buffers nach `${specPath}/auto-mode-logs/${storyId}-${sessionId}.log`. Best-effort: Disk-Failures loggen nur, throwen nicht. Existenz-Check verhindert Spurious-Writes für leere Buffer.
- **GET `/api/specs/:specId/stories/:storyId/logs?projectPath=...`** liefert den jüngsten archivierten Log eines Stories. 200 mit `{content, path}`, 404 wenn kein Log existiert. Lex-largest sessionId gewinnt — sessionIds enthalten `Date.now()`, also de-facto neueste Session.
- **Halt-Events werden jetzt als WS-Broadcasts emittiert:** `story.dirty-worktree` und `story.sub-worktree-failure` (von `auto-mode-spec-orchestrator.ts haltScheduling`-Pfaden) werden als `workflow.auto-mode.dirty-worktree` / `workflow.auto-mode.sub-worktree-failure` Frontend-seitig zugestellt — vorher fehlten WS-Listener komplett, UI hatte keinerlei Halt-Signal. Außerdem werden `setAutoModeIncident`-Persistierungen jetzt mit `specs.kanban.updated`-Broadcast begleitet, damit der Spec-Kanban-Modal sofort aktualisiert.
- **`aos-auto-mode-error-modal` zeigt pro Incident "Logs anzeigen"-Button:** Toggle-fetcht den archivierten Log via neuem Endpoint und expandiert inline (max 240 px scrollable pre-block). Modal nimmt neue Properties `specId` + `projectPath` (von `aos-kanban-board` durchgereicht). Persistent-Toast auf Halt-Event-Empfang.

### Tests
- `pam-005-worktree-helpers.test.ts`: D11-Regression (Story-Branch-Parent === Spec-Branch-Tip, NICHT main HEAD), Existing-Branch-Reuse (kein Reset auf specBranch bei zweitem Worktree-Add), Nonexistent-Base-Branch wirft. +3 Tests, 57/57 passing.
- `orchestrator-routing.test.ts`: D11-Strict-Failure (parallel ohne specBranch → halt+incident; serial ohne specBranch → silent fallback). 4-arg-Update für bestehende `createStoryWorktree`-Mocks. +2 Tests.
- `auto-mode-logs.test.ts`: Tail-Trim, Path-Sanitization, Latest-Selection, Disk-Failure-Best-Effort. Neu, 11 Tests passing.

### Technisch
- **Lock-Hierarchie unverändert:** `withMainProjectLock` (outer) → `withKanbanLock` (inner). D11 ist eine Branch-Base-Korrektur, kein neuer Lock.
- **Auto-mode-logs-Verzeichnis wächst monoton:** Pro Story × Session ein File. Sessions sind kurz (eine pro Story-Run). Keine Rotation implementiert — Disk-Cleanup user-/CI-responsibility.

## 3.28.0 - 2026-05-06

### Neu
- **`withMainProjectLock` — in-memory async Mutex pro Main-Project-Pfad:** Serialisiert alle Orchestrator-Git-Index-Operationen gegen das Main-Repo (`commitMainKanbanIfDirty`, `mergeStoryBranchIntoSpec`, `purgeShadowSpecMutables` post-merge, `setupSpecWorktree` auto-commit). Promise-Chain-Pattern mit `prev.catch(()=>{}).then(fn)` — Rejection eines Callers blockiert nachfolgende Waiters nicht (`ui/src/server/utils/main-project-mutex.ts`).
- **`setup-mcp.sh` gitignore-Installer:** Idempotenter Append-Block für Kanban-Mutable-State (`kanban.json`, `kanban-board.md`, `backlog-index.json`) in `.gitignore`. Verhindert, dass nach Parallel-Executions Tracking-Files versehentlich committed werden.

### Geändert
- **`withKanbanLock` Timeouts getuned:** 15s Acquire-Timeout, 20s Stale-Lock-Threshold, 100ms+Jitter Retry-Interval. Module-Init-Invariant-Assertion (`LOCK_TIMEOUT_MS < STALE_LOCK_MS`). Beide Kopien (`ui/src/server/utils/kanban-lock.ts` + `specwright/scripts/mcp/kanban-lock.ts`) byte-identisch.
- **`commitMainKanbanIfDirty` async + dual-locked:** Outer `withMainProjectLock` + inner `withKanbanLock`. Sole Caller in `onItemCompleted` awaitet jetzt (`worktree-story.ts`).
- **`mergeStoryBranchIntoSpec` wrapped:** Gesamter Body in `withMainProjectLock` — kein paralleles Git-Merge auf demselben Main-Repo möglich (`workflow-executor.ts`).
- **`purgeShadowSpecMutables` post-merge wrapped:** `onItemCompleted`-Purge nach Merge in `withMainProjectLock` (`auto-mode-spec-orchestrator.ts`).
- **`setupSpecWorktree` auto-commit wrapped:** Initiales `git add -A` + commit vor Worktree-Erstellung in `withMainProjectLock` — Race mit Completion-Handlers geschlossen (`workflow-executor.ts`).
- **`onItemFailed` Cleanliness-Gate-Parity:** `isWorktreeClean`-Check vor `removeStoryWorktree` spiegelt `onItemCompleted`-Verhalten. Dirty Worktree bei Failure triggert Incident statt silent force-remove (`auto-mode-spec-orchestrator.ts`).

### Technisch
- **Lock-Hierarchie-Invariant:** `withMainProjectLock` (outer) → `withKanbanLock` (inner). Nie umgekehrt — ABBA-Deadlock. Dokumentiert in `main-project-mutex.ts` JSDoc + `specs-reader.ts` writer-invariant comment.
- **`execSync` blockiert Event Loop während Mutex-Hold** — akzeptiert, da scoped per Main-Project-Pfad; andere Projects unberührt. Sub-second per Call.

### Tests
- `main-project-mutex.test.ts`: Mutex-Semantik + Rejection-Poisoning-Regression + Soft-30s-Warn. Neu.
- `kanban-lock-sync.test.ts`: Byte-Equality CI-Test für UI + MCP `kanban-lock.ts` Kopien. Neu.
- `parallel-completion.test.ts`: Concurrent commit/merge/purge/updateStatus Race-Szenarien. Neu.
- `pam-005-worktree-helpers.test.ts`: `onItemFailed`-Cleanliness-Gate-Regression ergänzt.
- `orchestrator-routing.test.ts`: `onItemFailed` dirty-worktree path ergänzt.

## 3.27.7 - 2026-05-06

### Behoben
- **Auto-Mode-Slots stallen am Bash-Permission-Prompt:** Wenn Claude Code für einen Bash-Befehl Erlaubnis braucht, zeigt es interaktiv `Do you want to proceed?\n❯ 1. Yes / 2. Yes, and don't ask again / 3. No\nEsc to cancel · Tab to amend`. Auto-Mode kann Prompts nicht beantworten — Slot stallt indefinitely. Existing `AUTO_MODE_CLI_FLAGS` disabled `AskUserQuestion`, aber NICHT Bash-Permissions. Existing `PROMPT_PATTERN` deckte dieses neue Format nicht ab. Stall-Recovery resettete in Endlosschleife (LLM trifft denselben Befehl, prompt feuert wieder).
- Konkret beobachtet: LLM versuchte `python3 -c "import json,sys;..."` für kanban-Introspection (statt MCP `kanban_read`), Permission-Prompt fired, Slot hung. Spec `2026-05-05-ifdb-wcag-2-2-aa-remediation` WCAG-015.

### Geändert
- **`AUTO_MODE_CLI_FLAGS` (`auto-mode-cli-flags.ts`)** ergänzt um `--dangerously-skip-permissions`. Auto-Mode bypasst alle Bash-Tool-Approval-Prompts. Trade-off bewusst: Auto-Mode ist explizite User-Opt-in (UI-Toggle), ohne Flag stallt Slot beim ersten nicht-allowlisteten Bash-Command.
- **`PROMPT_PATTERN` (`cloud-terminal-manager.ts:78`)** Layer-3-Detector erweitert um `Do you want to proceed?[\s\S]{0,500}?Esc to cancel.*?Tab to amend` — non-greedy mit max 500-Zeichen-Gap, damit Prosa-Mentions des Begriffs ("Do you want to proceed?" über Absätze hinweg) nicht fälschlich matchen.

### Behaviour-Change
- **Sicherheitsrelevant:** Auto-Mode-Sessions führen Bash-Commands ohne User-Approval aus. Standard für CLI-Auto-Mode-Tools, aber bewusst: User aktiviert Auto-Mode nur wenn er dem LLM in dem Repo trustet.

### Tests
- `pam-fix-008-prompt-pattern-anchored.test.ts`: +2 positive (3-option + compact bash-permission prompts), +1 negative (Prosa-Mention mit großem Gap). 20/20 passing.

## 3.27.6 - 2026-05-06

### Behoben
- **`copyMcpConfigToWorktree` kopierte falsche `.mcp.json`:** Helper las immer aus `dirname(projectPath)/.mcp.json` (eine Ebene über dem Project-Root). Wenn das Projekt der Claude-Code-Konvention folgt und `.mcp.json` IM Project-Root liegt (Standard, auch von `setup-mcp.sh` so eingerichtet), wurde stattdessen eine ggf. existierende `.mcp.json` im Parent-Verzeichnis kopiert — typisch eine Workspace-Level-Config (BrowserTools, trello, …) ohne `kanban`-Server. Folge: LLMs in Worktrees konnten kanban-MCP-Tools nicht aufrufen → Fallback auf direkte File-Edits → Shadow-`kanban.json` im Worktree-CWD, MCP-Routing zu main brach.
- Helper sucht jetzt in dieser Reihenfolge: (1) `${projectPath}/.mcp.json` (Claude-Code-Konvention), (2) `${dirname(projectPath)}/.mcp.json` (Legacy-Fallback). Erste Existenz gewinnt.
- **Idempotenz-Bug:** Bestehende `.mcp.json` im Worktree wurde nicht überschrieben (`if existsSync(dst) return`). Stale Kopien aus früheren Setups (z.B. ohne `kanban`-Server) blieben silent erhalten. Jetzt wird immer überschrieben — `.mcp.json` ist Config, muss zu Project-Root passen.

### Behaviour-Change
- Bestehende Worktrees mit falscher `.mcp.json` werden beim nächsten `setupSpecWorktree`/`createStoryWorktree`-Aufruf automatisch korrigiert (overwrite). Manuelle Migration nicht nötig.

### Tests
- `pam-005-worktree-helpers.test.ts > copyMcpConfigToWorktree`: 6 Tests (2 neu für project-root-priority + overwrite, 4 angepasst). 52/52 passing.

## 3.27.5 - 2026-05-06

### Behoben
- **Story-Sub-Branches kollidierten mit Spec-Branch (git ref hierarchy):** `storyBranchName(specId, storyId)` baute `feature/${feature}/${storyId}` — kollidierte mit der Spec-Branch `feature/${feature}`. Git-Refs sind hierarchisch und `git worktree add -b feature/foo/STORY` failed mit `fatal: cannot lock ref 'refs/heads/feature/foo/STORY': 'refs/heads/feature/foo' exists; cannot create 'refs/heads/feature/foo/STORY'`. Folge: jeder Parallel-Auto-Mode-Lauf (`maxConcurrent > 1`) hängte unmittelbar nach `git_strategy_set` (siehe v3.27.4-Halt-Mechanik).
- Story-Branches leben jetzt in eigenem Namespace `story/${feature}/${storyId}` — keine Kollision mit Spec-Branch.

### Behaviour-Change
- Bestehende Story-Sub-Worktrees aus Pre-v3.27.5 (Branch `feature/${feature}/${storyId}`) gibt es in der Praxis nicht — die Branch-Erstellung schlug ja immer fehl. Migration daher trivial: bei nächstem Auto-Mode-Run werden Sub-Worktrees mit neuem `story/...`-Branch-Schema erstellt.

### Tests
- `pam-005-worktree-helpers.test.ts > storyBranchName`: Erwartungen auf `story/...`-Format aktualisiert. +1 Regression-Test (`does NOT collide with spec branch`). 50/50 passing.

## 3.27.4 - 2026-05-06

### Behoben
- **Race-Condition bei Parallel-Auto-Mode ohne Story-Sub-Worktrees:** Wenn `gitStrategy='worktree'` + `maxConcurrent > 1` und `createStoryWorktree` fehlschlug (oder `worktreeOps` fehlte), fiel `AutoModeSpecOrchestrator.resolveSlotProjectPath` silent auf den geteilten Spec-Worktree-CWD zurück. Zwei parallele Stories landeten dann im selben CWD und blockierten sich gegenseitig — beide LLMs stallten in Endlosschleife (Stall-Recovery → Reset → Pickup → Stall …), Code-Fixes wurden zwar committed aber `kanban_complete_story` nie erreicht. Konkret beobachtet bei Spec `2026-05-05-ifdb-wcag-2-2-aa-remediation` (WCAG-012 + WCAG-013).
- Fallback-Verhalten ist jetzt strict: bei `maxConcurrent > 1` + Sub-Worktree-Failure halt + Incident + Throw (`story.sub-worktree-failure` Event). Bei `maxConcurrent === 1` bleibt der Silent-Fallback erlaubt (serial in geteiltem CWD = unproblematisch).

### Geändert
- `auto-mode-spec-orchestrator.ts:resolveSlotProjectPath`: neue Hilfsmethode `handleSubWorktreeFailure(itemId, reason)` setzt Auto-Mode-Incident, emittet `story.sub-worktree-failure`, ruft `haltScheduling()`. Throws nach Setup, damit der aufrufende `launchSlot` die Slot-Erstellung abbricht.
- `auto-mode-orchestrator-base.ts:launchSlot`: `resolveSlotProjectPath` Aufruf jetzt in try/catch — bei Throw wird `gate` released und der Slot wird nicht gestartet (kein Leak, kein activeSlots-Eintrag). Zusätzlicher `isCancelling`-Check zwischen `acquire` und Slot-Start.

### Behaviour-Change
- Auto-Mode-Halts wegen Sub-Worktree-Failure produzieren neuen Event-Type `story.sub-worktree-failure` (zusätzlich zu `story.dirty-worktree`, `story.merge-conflict`). UI-Handler sollten ihn ggf. spezifisch anzeigen — Default-Incident-Banner reicht aus.

### Tests
- `orchestrator-routing.test.ts`: +6 Tests für `resolveSlotProjectPath` (parallel + missing ops, serial + missing ops, parallel + throw, serial + throw, parallel + success, non-worktree). 14/14 passing.
- Bestehende Tests `pam-005-worktree-helpers` (49) + `orchestrator-routing` (existierende 8) unverändert grün.

## 3.27.3 - 2026-05-06

### Behoben
- Auto-Mode-Spec hängt erneut bei `<<BLOCKER:kanban.json-missing-V2-lean-spec-cannot-track-status>>` wenn ein manueller `git restore`-Style-Commit (oder ein Branch-Merge der einen alten kanban.json wiederbelebt) zwischen Auto-Mode-Stop und -Restart das gestrippte `kanban.json` ins Worktree zurückbringt. Die v3.27.0-Strip-Logik in `seedSpecDirInWorktree` lief nur einmalig beim Worktree-Setup und nutzte `fs.rm` — Index-Einträge aus späteren Commits blieben unberührt.
- Strip in `seedSpecDirInWorktree` + `seedBacklogDirInWorktree` ist jetzt zweistufig: `fs.rm` für Working-Tree + `git rm --cached --ignore-unmatch` für den Index. Catcht Restore-Commit-Drift beim nächsten Seed-Run.
- Neuer Helper `purgeShadowSpecMutables(worktreePath, specId)` (`worktree-story.ts`) als idempotente Drift-Defense. Wird nach jedem `onItemCompleted` in `auto-mode-spec-orchestrator.ts` aufgerufen — fängt Drift zwischen Stories ab (LLM-Fehler, Branch-Merges während Auto-Mode-Lauf).

### Geändert
- Spec-Orchestrator `onItemCompleted` (auto-mode-spec-orchestrator.ts): nach `commitMainKanbanIfDirty` zusätzlich `purgeShadowSpecMutables` für Spec-Worktree (skip wenn `gitStrategy !== 'worktree'` oder `projectPath === mainProjectPath`).
- JSDoc auf `MUTABLE_SPEC_FILES` erweitert um Drift-Defense-Hinweis (Doppel-Schutz: Seed + per-item Purge).

### Behaviour-Change
- Worktree-Branches die per `git restore`/Merge ein `kanban.json`/`kanban-board.md` (oder `backlog-index.json`) zurückgebracht hatten, bekommen beim nächsten Seed ODER nach jedem Story-Done einen `chore: drop shadow ...`-Commit. Architektur-bedingt korrekt — diese Files leben nur in main.

### Tests
- `pam-005-worktree-helpers.test.ts`: +6 Tests für `purgeShadowSpecMutables` (idempotent, restore-commit drift, both files, untracked-on-disk, missing path, non-repo) und +2 Tests für `seedSpecDirInWorktree` v3.27.3 strip-via-git-rm (restore-commit, tracked-but-missing). 49/49 passing.

## 3.27.2 - 2026-05-06

### Behoben
- Auto-Mode-V2-Lean-Specs blieben mit `<<BLOCKER:kanban.json-missing-V2-lean-spec-cannot-track-status>>` stehen, wenn der LLM im Worktree-CWD `kanban.json` nicht fand. Root-Cause: Workflow-Markdown las `kanban.json` direkt vom Filesystem statt über die kanban-MCP. Da `kanban.json` nach v3.27.0 nur noch im main-Repo lebt (Worktree-Strip via `seedSpecDirInWorktree`), schlugen alle direkten FS-Reads im Worktree fehl.
- Migriert auf MCP-Tool-Calls (`kanban_read`, `kanban_start_story`, `kanban_complete_story`, `kanban_update_phase`):
  - `spec-phase-1-lean.md` v2.0 → v2.1 — Validate + Finalize über MCP, kein direkter `ls/READ/WRITE`.
  - `spec-phase-3.md` v5.5 → v5.6 — Routing-Note, `specTier` aus `resumeInfo`, `phase_complete` über `kanban_update_phase` (oder no-op wenn `kanban_complete_story` `remaining=0` schon `currentPhase=complete` setzt).
  - `spec-phase-3-lean.md` v2.0 → v2.1 — gleiche Migration für V2-Lean-Variante (kritisch: V2-Lean ist der Standard-Pfad ab v3.24).
  - `spec-phase-3-code-review.md` v1.1 → v1.2, `spec-phase-3-integration-validation.md` v1.0 → v1.1, `spec-phase-3-finalize-pr.md` v1.0 → v1.1 — System-Stories (997/998/999) starten/abschließen über `kanban_start_story` + `kanban_complete_story`.

### Geändert
- `git add specwright/specs/{spec}/kanban.json` aus allen Worktree-Workflows entfernt — die Datei lebt nur in main, der Worktree-`git add` war silent-No-Op und ließ Mutationen als uncommitted Changes in main liegen.
- Neuer Helper `commitMainKanbanIfDirty` (`worktree-story.ts`) committet `kanban.json` aus dem main-Repo nach jedem `onItemCompleted`-Event in `auto-mode-spec-orchestrator.ts`. Cadence: per-Story (nicht per-Watcher-Tick), Skip auf early-return-Pfaden (dirty Worktree, Merge-Konflikt — werden bei nächstem erfolgreichen Story-Done re-synct).
- JSDoc auf `MUTABLE_SPEC_FILES` ergänzt um Hinweis auf orchestrator-side Commit-Pfad.

### Behaviour-Change
- Pro Story-Done entsteht jetzt zusätzlich ein `chore: [{storyId}] kanban.json post-completion sync`-Commit auf dem main-Branch. Hält das main-Working-Tree zwischen Story-Boundaries clean.

### Tests
- `pam-005-worktree-helpers.test.ts`: +5 Tests für `commitMainKanbanIfDirty` (modified, clean, missing, non-repo, isolation/only-kanban-staged). 41/41 passing.

### Out-of-Scope (Follow-up)
- `auto-mode-backlog-orchestrator.ts` hat dieselbe Lücke für `backlog-index.json`. TODO-Kommentar in `commitMainKanbanIfDirty`-JSDoc verweist darauf; Fix wenn analoger Blocker auftritt.

## 3.27.1 - 2026-05-05

### Behoben
- Auto-Mode-Spec im Sub-Worktree: UI sah Story-Fortschritt nicht. Drei kombinierte Lücken nach v3.27.0 — alle adressiert:
  - **Watcher-Path-Mismatch** (`auto-mode-spec-orchestrator.ts:71`, `auto-mode-backlog-orchestrator.ts`): Watcher zeigte auf Worktree-`kanban.json`/`backlog-index.json` statt main. MCP-Writes auf main wurden nie als Story-Done erkannt → Slot blieb belegt, weitere Stories warteten endlos. Watcher routet jetzt über `mainProjectPath ?? projectPath`.
  - **Seed-Helper Early-Return** (`worktree-story.ts seedSpecDirInWorktree` + `seedBacklogDirInWorktree`): Frühes `return` bei existierendem Worktree-Spec-Dir (z.B. aus base-branch-Checkout / auto-commit-before-worktree) übersprang den Mutable-Strip → `kanban.json`/`kanban-board.md`/`backlog-index.json` blieben als Shadow im Worktree und divergierten von main. Strip läuft jetzt unconditional.
  - **`mainProjectPath` collapse** (`workflow-executor.ts`): Wenn der UI-Project-Pfad selbst ein Sub-Worktree war, fiel `mainProjectPath` auf `projectPath` zurück → Slot-Check `slotProjectPath !== mainProjectPath` false → `SPECWRIGHT_MAIN_PROJECT_PATH` env-var nie gesetzt → MCP defaultete auf `process.cwd()` (Worktree). Neuer `resolveMainWorktreePath`-Helper (`worktree-detect.ts`) detektiert Sub-Worktrees via `git rev-parse --git-common-dir` und liefert den canonical main-worktree-Pfad.
- Finalize verwirft jetzt mutable-File-Drift im Worktree vor jedem `isWorktreeClean()`-Gate (`workflow-executor.ts finalizeSpecExecution`, beide Gates) — `rm` statt `git checkout HEAD --`, weil mutable Files nach Fix #2 nicht mehr getrackt sind.
- Plan-Review-Reviewer (`external-reviewer.ts`) haben jetzt Read/Grep/Glob auf den Codebase (vorher `tools: []`); Output-Validation lehnt substanzlose Reviews (nur tool_call-XML / Code-Blocks ohne Prosa) als Failure ab statt sie als gültigen Review durchzureichen.
- **Spec-/Backlog-Orchestrator-interne Kanban-Operationen** (`getReadyStories`, `resetStaleInProgress`, `updateStoryStatus`, `setAutoModeIncident`, `clearAutoModeIncident`, `resolveDependencies`, `getReadyBacklogItems`, `markItemInProgress`, `resetStaleInProgressItems`) liefen gegen `this.config.projectPath` (= Worktree-CWD bei gitStrategy=worktree). Da das Worktree-Spec-Dir nach Seed-Strip keine `kanban.json` enthält, sah `getReadyStories` ein leeres Kanban → keine Stories ready → Auto-Mode blieb stumm trotz aktivem `Auto`-Toggle. Operationen routen jetzt über `mainProjectPath` (canonical Source of Truth). Auch `worktreeOps`-git-Operationen (`mergeStoryBranchIntoSpec`, `removeStoryWorktree`) routen über main, da der git-Common-Dir dort liegt.

### Geändert
- `MUTABLE_SPEC_FILES` und `MUTABLE_BACKLOG_FILES` jetzt aus `worktree-story.ts` exportiert (single source of truth, importiert von `workflow-executor.ts`).
- `AutoModeBacklogOrchestrator.create` akzeptiert optionales `mainProjectPath`-Argument für defense-in-depth-Routing.
- `DEFAULT_REVIEW_PROMPT` (`general-config.ts`) benennt verfügbare Tools explizit und untersagt raw `<tool_call>`-XML.

### Behaviour-Change
- Feature-Branches die `kanban.json`/`kanban-board.md`/`backlog-index.json` getrackt hatten, bekommen beim nächsten Seed-Run einen `chore:`-Commit mit deren Deletion. Architektur-bedingt korrekt — mutable Files leben nur in main und werden via MCP-env-var-Routing aktualisiert.

### Tests
- `pam-005-worktree-helpers.test.ts`: +3 Tests für unconditional mutable-strip + MUTABLE_*_FILES exports.
- `worktree-detect.test.ts` (neu): 5 Tests für `resolveMainWorktreePath` (kein Repo, main, sub-worktree, nested path, nicht-existent).
- `external-reviewer.test.ts` (neu): 6 Tests für `isSubstanceLessReview`.
- `orchestrator-routing.test.ts` (neu): 8 Tests für Spec- und Backlog-Orchestrator Kanban-Op-Routing über `mainProjectPath` inklusive non-worktree-Regression und `getSpecWorkingDirectory`-Beibehaltung.

## 3.27.0 - 2026-05-04

### Behoben
- Auto-Mode Worktree-Strategie: Spec-Worktree-Symlinks ersetzt durch echte Datei-Kopie + `chore:`-Seed-Commit auf Feature-Branch. Symlinks haben `git status --porcelain` dauerhaft als dirty gezeigt → `isWorktreeClean()` blockierte `finalizeSpecExecution` → kein `git push`, kein `gh pr create`. Nach Fix entsteht der PR automatisch am Ende der Story-Ausführung.
- Symlink-Pollution-Folgefehler (`fatal: pathspec ... is beyond a symbolic link`) bei Claude-`git add` im Worktree fällt weg.
- Backlog-Auto-Mode analog migriert.

### Geändert
- MCP `kanban-mcp-server.ts` resolved Projektpfad jetzt über `SPECWRIGHT_MAIN_PROJECT_PATH` env-var (vom UI-Server gesetzt, wenn Claude im Worktree läuft). Schreib- und Lese-Operationen landen im Hauptprojekt → UI sieht Live-Fortschritt ohne Symlink.
- `.mcp.json` wird ins Worktree kopiert statt verlinkt.
- Alte Worktrees mit Legacy-Symlinks werden beim nächsten Auto-Mode-Run automatisch migriert (Symlink → Real-Seed).

## 3.19.3 - 2026-04-16

### Behoben
- UI `_initializeKanbanBoard` legte ein Legacy `kanban-board.md` an, obwohl `kanban.json` (v4.0) vom Workflow erstellt werden sollte — Folge: UI-Fallback hat die JSON-Version verschattet, wenn /create-spec Step 8.2 (MCP `kanban_create`) nicht ausgeführt wurde. Die Methode prüft jetzt zuerst auf `kanban.json` und bricht ab, bevor ein MD-Fallback geschrieben wird.

## 3.1.0 - 2026-02-18

### Neu
- Update-Benachrichtigung fuer CLI und UI
- `check-update.sh` Script fuer Versionspruefung
- `/check-update` Slash Command
- `VERSION` Datei als Single Source of Truth
- Update-Banner in der Getting Started Seite

### Geaendert
- `install.sh` schreibt jetzt `.installed-version` pro Projekt und `.version` global
- create-spec v3.6: Phase Detection und Resume Support

## 3.0.0 - 2026-01-15

Initiales Open Source Release.
