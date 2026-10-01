# Plan: Arbeitsordner einer Sitzung mit einem Klick in VS Code öffnen

> **Intent:** `intent.md` (INT-2026-028) · **Spec:** entfällt (bypass: Größe S, ein Knopf an zwei Stellen, ein Link-Baustein, ein Einstellungsfeld; keine Datenhaltung im Projekt, kein HTTP-Endpunkt)
> **Status:** umgesetzt
> **Erstellt:** 2026-10-01 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger), 2026-10-01 — im Chat: „Freigabe: plan.md (Stand 2026-10-01 11:14)"
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand 7c85222), `CLAUDE.md`, `docs/security.md`

<!-- Der Plan ist TECHNISCH und die EINHEIT DER AUSFÜHRUNG. Eine Sitzung setzt ihn ganz um.
     Maßstab: Ein neues Teammitglied könnte allein anhand dieses Dokuments umsetzen.
     Jede Änderung verweist auf eine FA (spec.md) oder ein AK (intent.md). Keine Änderung ohne Herkunft.
     Zwei Leser: „In einfachen Worten" liest die Person, die freigibt; „Details" liest der Agent, der baut. Die erste Zeile unter jeder
     Überschrift sagt, für wen der Abschnitt ist (R1, specwright/workflows/meta/leser-und-rueckfragen.md). Marker übernehmen, keinen entfernen. -->

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Jede Claude-Sitzung in der Web-UI arbeitet in einem eigenen Ordner, meist einer eigenen Arbeitskopie des Projekts. Wenn du sehen willst, was die Sitzung gerade am Code ändert, musst du heute erst herausfinden, welcher Ordner das ist, und ihn dann in VS Code von Hand öffnen. Die UI kennt den Ordner längst — sie zeigt ihn bisher nur als Ordnernamen im Hinweistext, der erscheint, wenn die Maus über einem Tab steht.

**Was ändert sich?** An jeder laufenden Sitzung erscheint ein kleines VS-Code-Symbol: im Tab der Sitzung (die Tab-Leiste ist die Sitzungsliste) und im Kopf der Sitzung. Ein Klick darauf öffnet VS Code genau in dem Ordner, in dem die Sitzung läuft — egal ob eigene Arbeitskopie, ausgewählter Worktree oder Projektordner, und auch bei einfachen Terminal-Sitzungen ohne Claude. Solange die UI den Ordner einer Sitzung noch nicht kennt (die ersten Sekunden nach dem Start), fehlt das Symbol. Auf dem Handy ändert sich nichts.

**Wie wird das gemacht?** VS Code lässt sich aus dem Browser über einen besonderen Link öffnen, ähnlich wie ein „mailto:"-Link das Mailprogramm öffnet. Für einen Ordner auf deinem Mac sieht der Link aus wie „öffne in VS Code die Datei mit diesem Pfad"; für einen Ordner auf dem Cloud-Host sagt er „verbinde dich per Remote-SSH mit diesem Rechner und öffne dort diesen Pfad". Der Browser fragt beim ersten Mal, ob er VS Code öffnen darf; danach geht es mit einem Klick.

Woher weiß die UI, welcher Link richtig ist? Wie in der Absicht entschieden: allein an einem neuen Feld in den Einstellungen unter „Allgemein". Steht dort ein Remote-SSH-Host (das Kürzel, unter dem dein Mac den Cloud-Host per SSH kennt), baut die UI den Remote-Link; ist das Feld leer, den lokalen Link. Auf dem Mac lässt du das Feld also leer, auf dem Cloud-Host trägst du das Kürzel einmal ein.

Wichtig für das öffentliche Repo: Das Kürzel des Cloud-Hosts darf nie in einer Datei landen, die mit ins Repo geht. Die bestehende Datei für allgemeine Einstellungen (`ui/config/general-config.json`) ist aber im Repo versioniert — sie scheidet deshalb aus. Das Feld wird stattdessen im Laufzeitordner der UI gespeichert, in dem schon heute Sitzungslisten und Nutzerzustand liegen und den Git ausdrücklich ignoriert. Das ist dasselbe Ablagemuster, das die UI seit September für ihren Nutzerzustand nutzt.

Das Symbol ist ein einziger kleiner Baustein, der an drei Stellen eingesetzt wird: im Tab, im Kopf der Einzelansicht und im Kopf jeder Spalte, wenn das Terminal geteilt ist (dort übernimmt der Spaltenkopf die Rolle des Sitzungskopfs). Ein einziger Baustein heißt: die Regel „wann zeigen, welcher Link" steht an genau einer Stelle und wird an einer Stelle getestet.

**Was kann schiefgehen?**

Erstens: Trägst du auf dem Cloud-Host nichts ein, baut die UI dort den lokalen Link mit einem Pfad, den es auf deinem Mac nicht gibt; VS Code meldet dann „Ordner nicht gefunden". Das ist die bewusste Folge der Entscheidung zu OF-01 und mit einem Eintrag im Feld behoben.

Zweitens: Ist auf dem Mac die Remote-SSH-Erweiterung nicht installiert oder das SSH-Kürzel falsch, öffnet VS Code zwar, kann sich aber nicht verbinden und zeigt seine eigene Fehlermeldung. Die UI prüft das nicht, weil sie den Mac nicht sehen kann.

Drittens: Das genaue Linkformat beruht auf der Dokumentation von VS Code. Weil der ganze Ansatz daran hängt, wird es als allererster Schritt der Bausitzung geprüft, noch bevor eine Zeile Code entsteht: lokal prüfe ich es selbst auf dem Mac; für den Cloud-Host brauche ich dich einmal kurz — du tippst in der Sitzung einen vorbereiteten Befehl mit deinem SSH-Kürzel ein, das Kürzel bleibt dabei im Chat und landet in keiner Datei. Klappt eines von beiden nicht, halte ich an und frage dich, statt weiterzubauen.

Viertens: Änderst du das Kürzel in einem Browserfenster, sehen andere offene Fenster oder das Handy den neuen Wert erst nach dem Neuladen. Das ist bewusst so einfach gehalten, weil sich der Wert praktisch nie ändert.

Fünftens: Wird die gespeicherte Einstellungsdatei unlesbar, würde die Cloud-UI unbemerkt wieder lokale Links bauen. Damit das nicht still passiert, zeigt das Einstellungsfeld dann einen Hinweis „bitte neu eintragen".

Rückgängig machen ist einfach: Das Symbol ändert nichts an Sitzungen oder Dateien; entfernt man den Code, ist alles wie vorher. Die neue Einstellungsdatei kann man löschen.

**Was musst du entscheiden?** Nichts, Freigabe reicht. Zwei Dinge habe ich selbst entschieden und unten begründet: die Ablage im Laufzeitordner statt in der versionierten Einstellungsdatei, und dass dafür kein eigenes ADR entsteht, sondern ein Vermerk im bestehenden ADR-0002 (gleiches Ablagemuster). Widersprich, wenn du das anders willst. Zu tun hast du in der Bausitzung nur den einen Prüfbefehl für den Cloud-Host (siehe oben), danach wie immer Merge, Kürzel eintragen, einmal klicken.

## Details

<!-- leser: mensch -->

<!-- Volle technische Tiefe: Dateien, Funktionen, Datenmodell, Tradeoffs, Testplan. Geht an Reviewer und in die Bausitzung, muss für sich stehen.
     Confidence-Tags in beiden Teilen: [Certain] harte Belege · [Likely] starke Inferenz · [Uncertain] Vermutung. -->

### 1. Kurzfassung

<!-- leser: mensch -->

Ein Shadow-DOM-Baustein `aos-vscode-knopf` rendert einen `vscode://`-Link aus `session.effectiveCwd` und dem Remote-SSH-Host; er sitzt im Tab (`aos-terminal-tabs`), im Sitzungskopf der Einzelansicht (`aos-terminal-session`) und im Pane-Kopf der geteilten Ansicht (`aos-cloud-terminal-sidebar`). Der Host kommt aus einer neuen Laufzeitdatei `<runtime>/editor-<port>.json`, gepflegt über zwei WebSocket-Nachrichten `settings.editor.get|update` und ein Feld in Einstellungen › Allgemein; ein Frontend-Singleton `editorLinkService` verteilt ihn. Linkbau und Sichtbarkeitsregel sind reine Funktionen in `editor-link.ts`.

### 2. Ausgangslage im Code

<!-- leser: agent -->

Branch am 2026-10-01 auf `origin/main` (5ab5bc9, nach PR #96) rebased; alle Zeilen gegen diesen Stand.

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Ordner der Sitzung | `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts:57-62` (`TerminalSession.effectiveCwd`), Backend `ui/src/server/services/cloud-terminal-manager.ts:751,837,891` (`pathKey`-normalisiert, auch Shell-Sitzungen) | wiederverwendbar, einzige Quelle für den Pfad (RB-02) [Certain] |
| Ordner nach Neustart/Fremdgerät | `ui/frontend/src/components/terminal/session-naming.ts:100-109` (`toRestoredTab` übernimmt `effectiveCwd`) | wiederverwendbar; Status dort nur `active`/`disconnected` [Certain] |
| Ordner beim Verbinden | `aos-terminal-session.ts:458-468` (Event `session-connected` mit `effectiveCwd`), `ui/frontend/src/app.ts:1009-1022` | vor dem Event fehlt `effectiveCwd` → AK-05 [Certain] |
| Laufende Sitzung | `ui/frontend/src/services/cloud-terminal.service.ts:261` (`active` oder `paused` = läuft) | Sichtbarkeitsregel übernimmt genau diese Menge [Certain] |
| Bisherige Anzeige des Ordners | `tab-title.ts:30-39` (`getSessionLocationHint`, nur im `title`-Tooltip des Tabs, `aos-terminal-tabs.ts:306,315`) | Intent §1 sagt „im Tab-Titel" — tatsächlich Tooltip; ohne Folgen [Certain] |
| Sitzungsliste | `aos-terminal-tabs.ts:296-375` (je Tab: Status, Name, `.tab-edit`, `.tab-close`); Light DOM (`createRenderRoot` `:31`, Stile via `ensureStyles` in `document.head`); Hover-Muster `.tab:hover .tab-edit, .tab.active .tab-edit { opacity: 1 }` `:178-181`; `_handleCloseClick` stoppt Propagation `:401-402` | Einbaustelle 1; Hover-Muster übernehmen; Klick darf den Tab nicht umschalten [Certain] |
| Sitzungskopf, Einzelansicht | `aos-terminal-session.ts:800-810` (`.session-header` mit `.session-info`), Shadow DOM mit `static styles` `:92-100`; versteckt bei `compact` (`:330`, Handy) und `pane-mode` (`:341`, Split) | Einbaustelle 2; Shadow-Root → kein `theme.css` (Fehlerliste CLAUDE.md) [Certain] |
| Sitzungskopf, geteilte Ansicht | `aos-cloud-terminal-sidebar.ts:1773-1900` (`_renderPaneHeaders`, `.pane-header-row` mit Projekt-Badge, Dropdown, Neu-, Maximieren-, Zoom-Knopf; `activeSession` `:1795-1797`); Sidebar Light DOM (`:234`) | Einbaustelle 3: in Split ersetzt der Pane-Kopf den Sitzungskopf [Certain] |
| Handy | `_renderMobileLogAreaContent` `aos-cloud-terminal-sidebar.ts:1014-1026` (`compact`), eigene Tabs `components/mobile/aos-mobile-session-tabs.ts` | bleibt unberührt (NZ-05) [Certain] |
| Allgemeine Einstellungen (Speicher) | `ui/src/server/general-config.ts:24` → `ui/config/general-config.json`, **im Repo versioniert** (`git ls-files ui/config/`) | scheidet für den Host aus (RB-01) [Certain] |
| GitHub-Einstellung (Muster) | `ui/src/server/github-config.ts:35-70` (Datei-Store, Cache, Env-Override für Tests), WS `settings.github.*` `ui/src/server/websocket.ts:472-480` | Muster für Handler und Store; Datei `ui/config/github-config.json` ist **nicht** gitignored (`git check-ignore` leer) — Nebenbefund, nicht Teil dieses Vorhabens [Certain] |
| Laufzeitordner | `ui/src/server/utils/runtime-paths.ts:35-37` (`getRuntimeDir`, `SPECWRIGHT_RUNTIME_DIR`), `:95,128,137` (`anruf-`, `workspace-`, `vorhaben-<port>.json`); `ui/.gitignore:30` `runtime/` | Ablage für den Host; Tests über `SPECWRIGHT_RUNTIME_DIR` [Certain] |
| Einstellungsseite | `ui/frontend/src/views/settings-view.ts:743-793` (`renderGeneralSection`, setzt `<aos-anruf-schalter>` oben ein, unabhängig von der Projekt-Config), Light DOM `:1186` | Einbau des Felds als eigener Baustein wie `aos-anruf-schalter`; Test-Muster `ui/tests/unit/settings-anruf.test.ts:38-45` (Quelltext-Schnitt) [Certain] |
| Frontend-Singleton-Muster | `ui/frontend/src/services/kennungen.service.ts` (get/set/subscribe) | Vorlage für `editorLinkService` [Certain] |
| Gateway-Reconnect | `gateway.on('gateway.connected', …)` z. B. `ui/frontend/src/components/model-selector.ts:228` | Service fragt nach Reconnect neu [Certain] |
| Tests der Nachbarschaft | `ui/tests/unit/tab-title.test.ts`, `github-config.test.ts`, `settings-anruf.test.ts`, `aos-cloud-terminal-docked.test.ts` | Muster für neue Tests; keine dieser Dateien in `ui/tests/known-failures.txt` [Certain] |
| Lieferumfang | `specwright/manifest.tsv` führt keine `ui/src`-Dateien (nur 5 Skill-Zeilen mit `ui/` im Namen) | keine Manifest-Zeile nötig [Certain] |
| VS-Code-Links | — | `vscode://file/<abs>` öffnet Datei oder Ordner; `vscode://vscode-remote/ssh-remote+<host><abs>` öffnet über Remote-SSH [Likely] (VS-Code-Doku); Ordner-Fall lokal und remote wird in §6 Schritt 0 per `open` geprüft, bevor Code entsteht |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

1. **Reine Logik** `ui/frontend/src/components/terminal/editor-link.ts`:
    - `buildVscodeUri(cwd: string, remoteHost: string): string` — Pfad segmentweise mit `encodeURIComponent` kodiert, `/` bleibt; leerer Host → `vscode://file` + Pfad; sonst `vscode://vscode-remote/ssh-remote+${host}` + Pfad. Pfad muss absolut sein (beginnt mit `/`), sonst wirft die Funktion nicht, sondern der Aufrufer bekommt über `vscodeZiel` `null`. Nur POSIX-Pfade: das Backend läuft ausschließlich auf macOS und Linux (tmux-Pflicht, `cloud-terminal-manager.ts`); Windows ist nicht unterstützt und wird im Kommentar der Funktion so benannt.
    - Das Linkformat (Ordner öffnet als Arbeitsbereich, lokal und remote) wird in §6 Schritt 0 geprüft, **bevor** Code entsteht; scheitert es, hält die Bausitzung an und fragt nach (Ansatz hängt daran).
    - `vscodeZiel(session: Pick<TerminalSession, 'status' | 'effectiveCwd'>, remoteHost: string): string | null` — `null`, wenn `effectiveCwd` fehlt/leer/nicht absolut (AK-05) oder Status nicht `active`/`paused` (AK-01 „aktiv"); sonst die URI (AK-02, AK-03, AK-04). Gilt für jeden `terminalType` (Shell eingeschlossen, AK-02).
2. **Geteilte Regel für den Host** `ui/src/shared/types/editor.protocol.ts`: `EditorConfig { remoteSshHost: string }`, `REMOTE_SSH_HOST_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9._@-]{0,251}[A-Za-z0-9])?$/` (SSH-Alias oder `user@host`, beginnt und endet alphanumerisch, ≤ 253 Zeichen). Erlaubt sind nur Zeichen, die in einer URI-Authority/Pfad-Komponente keine Bedeutung haben; ausgeschlossen und je einzeln getestet: `/`, `\`, `+`, `?`, `#`, `%`, `:`, `"`, `<`, `>`, Leerzeichen, Zeilenumbruch. Ein Port gehört in den Alias der `~/.ssh/config` (Hinweistext am Feld), nicht ins Feld. Leerer String = „lokal".
3. **Backend-Store** `ui/src/server/editor-config.ts` nach Muster `github-config.ts`: `loadEditorConfig()`, `updateEditorConfig(host)` (trim; leer erlaubt; sonst Regex, sonst `Error`); Datei `getEditorConfigPath()` = `<runtime>/editor-<port>.json` (neue Funktion in `runtime-paths.ts`, gleiche Form wie `:128`), Cache, unlesbare Datei → leerer Host, Warnung im Log **und** `lesefehler: true` in der Antwort, damit das Einstellungsfeld „Gespeicherter Wert unlesbar — bitte neu eintragen" zeigt (sonst kippt die Cloud-UI unsichtbar auf lokale Links). Kein Projektbezug (Host-Einstellung). `EditorConfig` = `{ remoteSshHost: string; lesefehler?: true }`.
4. **WebSocket** in `websocket.ts`: `settings.editor.get` → `settings.editor { config }`; `settings.editor.update { remoteSshHost }` → `settings.editor { config }` an den Absender; `updateEditorConfig` im `try/catch` wie `handleSettingsGeneralUpdate` (`websocket.ts:1505-1527`), Fehler → `settings.error` mit der Validierungsmeldung; `remoteSshHost` kein String → `settings.error`. Kein HTTP-Endpunkt. Antwort nur an den Absender (wie `settings.general`); andere offene Browser holen den Wert beim nächsten (Re-)Connect oder Neuladen — Grenze von AK-04, ausdrücklich so gewollt (R7).
5. **Frontend-Service** `ui/frontend/src/services/editor-link.service.ts`: Singleton mit `get(): EditorConfig | null` (`null` = noch nicht geladen), `subscribe()`, `ensureLoaded()` (idempotent; sendet beim ersten Aufruf `settings.editor.get`, danach erneut bei jedem `gateway.connected`), lauscht auf `settings.editor` und setzt den Wert. `ensureLoaded()` rufen `aos-vscode-knopf` und `aos-editor-einstellung` in `connectedCallback`. Kein `localStorage` (AR-05).
6. **Baustein** `ui/frontend/src/components/terminal/aos-vscode-knopf.ts` (`aos-vscode-knopf`, Shadow DOM, `static styles`): `@property({ attribute: false }) session` — der Elternteil reicht bei jeder Änderung ein neues Objekt durch (`app.ts:1015-1022` mappt immutabel), Lit rendert also neu, sobald `effectiveCwd` eintrifft; `vscodeZiel` wird in `render()` berechnet, nie zwischengespeichert. Host-Wert als `@state`, gesetzt aus dem Abo (in `connectedCallback`, gelöst in `disconnectedCallback`). Rendert `nothing`, solange der Host-Wert noch nicht geladen ist (kein falscher lokaler Link auf dem Cloud-Host in den ersten Millisekunden) oder `vscodeZiel` `null` ist, sonst `<a href=… title="In VS Code öffnen" aria-label="In VS Code öffnen">` mit 14-px-Symbol; `@click` stoppt die Propagation (Tab wird nicht umgeschaltet), kein `preventDefault` (der Browser übergibt den Link an VS Code).
7. **Einbau** an drei Stellen (AK-01):
    - `aos-terminal-tabs.ts`: vor `.tab-edit`, nicht im Umbenennen-Modus; Host-Klasse `tab-vscode` mit demselben Hover-/Active-Muster wie `.tab-edit` (Stil der Host-Klasse im Light-DOM-`ensureStyles`, Inneres im Shadow-Root).
    - `aos-terminal-session.ts`: in `.session-header` als Geschwister **nach** `.session-info` (Header ist `display:flex; justify-content: space-between` `:92-100`, der Knopf sitzt damit rechts; kein Wrapper nötig).
    - `aos-cloud-terminal-sidebar.ts`: in `.pane-header-row` vor `pane-new-btn`, nur für die aktive Sitzung des Panes (`activeSession` aus `paneSessionIds[i]`, `:1795-1797`); kein Pane ohne aktive Sitzung zeigt einen Knopf. Die übrigen Sitzungen des Panes haben ihren Knopf im Tab darunter.
8. **Einstellung** `ui/frontend/src/components/settings/aos-editor-einstellung.ts` (Light DOM wie die Einstellungsseite, Klassen `provider-card`/`form-field`/`save-btn` der Seite wiederverwenden): Feld „Remote-SSH-Host für VS Code", Hinweis „Leer lassen, wenn die UI auf diesem Rechner läuft. Auf dem Cloud-Host: das SSH-Kürzel, unter dem dein Rechner ihn kennt.", Speichern/Leeren, Validierung mit derselben Regex vor dem Senden; Wert über `editorLinkService`. Eingesetzt in `renderGeneralSection` direkt unter `aos-anruf-schalter`, in **beiden** Zweigen (Laden und geladen), genauso wie der Schalter heute (`settings-view.ts:745-760`): beide sind Host-Einstellungen ohne Projektbezug.
    - Ablageort: `ui/frontend/src/components/settings/` existiert [Certain] (`ls ui/frontend/src/components`).

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Feld in `GeneralConfig` (`general-config.ts`) | Datei `ui/config/general-config.json` ist versioniert; der Host-Alias landete im öffentlichen Repo (RB-01, security.md §5). Außerdem projektbezogen, der Host ist es nicht. |
| Umgebungsvariable im Systemd-Unit des Cloud-Hosts statt Einstellungsfeld | Intent AK-04 und OF-01 verlangen das Einstellungsfeld; Env bräuchte Deploy-Zugriff für jede Änderung. |
| Lokal/remote am `location.hostname` erkennen | OF-01 ist anders entschieden; Tailscale-Zugriff auf den Mac sähe aus wie „remote". |
| Backend öffnet VS Code (`code <pfad>` per `child_process`) | Öffnet auf dem Rechner des Backends, nicht des Browsers — auf dem Cloud-Host sinnlos; neuer Prozessstart aus der UI ohne Not (T-06). |
| Knopf je Stelle einzeln ohne gemeinsamen Baustein | Dreimal Regel, Link und Stil; Shadow-/Light-DOM-Unterschiede dreimal lösen. |
| Wert über den Workspace-Broadcast (`workspace-<port>.json`) | Würde alle Geräte sofort aktualisieren, mischt aber eine Host-Einstellung in den Workspace-Zustand (offene Projekte, Tabs) und erweitert dessen Protokoll; Nutzen gering (ein Nutzer, Wert ändert sich praktisch nie). |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Ja, ohne Regeländerung** — `docs/architecture.md` §3 bekommt eine Zeile „Editor-Einstellung der UI (Remote-SSH-Host)" (Besitzer UI-Backend, `<runtime>/editor-<port>.json`, WebSocket `settings.editor.*`, pro Backend-Instanz); §2 Frontend ein Halbsatz zum Knopf; Änderungsprotokoll. AR-04 (kein Projektpfad im Server), AR-05 (Zustand im Backend, kein `localStorage`) eingehalten; AR-01/02/03/06/07/08 unberührt. **In dieser PR.**
- **ADR: nein.** Begründung: gleiches Ablagemuster wie ADR-0002 (Laufzeitdatei je Backend-Instanz im gitignored Laufzeitordner); kein neuer Speicherort-Typ, keine Daten aus Projekten. Vermerk in ADR-0002 („Weitere Laufzeitdateien nach diesem Muster: `editor-<port>.json`, INT-2026-028"), wie INT-2026-019/022/024 Erweiterungen dort vermerkt haben.
- **security.md:** §1 neue Zeile „Remote-SSH-Host für VS Code" (intern, `<runtime>/editor-<port>.json`, nie im Repo); §2 Absatz zu `settings.editor.*` (Prüfpflicht §6 Zeile 1: Zugriff netzseitig begrenzt wie alle WS-Nachrichten, Validierung `REMOTE_SSH_HOST_REGEX`, Antwortklasse intern); Änderungsprotokoll. Externes System (§6 Zeile 4): VS Code auf dem Rechner des Nutzers wird nur über einen Link angestoßen — kein Zugang, kein Datenfluss vom Backend; Ausfall = VS-Code-Meldung.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/frontend/src/components/terminal/editor-link.ts` | neu | `buildVscodeUri`, `vscodeZiel` | AK-02, AK-03, AK-04, AK-05 |
| 2 | `ui/src/shared/types/editor.protocol.ts` | neu | `EditorConfig`, `REMOTE_SSH_HOST_REGEX` | AK-04, RB-01 |
| 3 | `ui/src/server/utils/runtime-paths.ts` | ändern | `getEditorConfigPath()` | AK-04, RB-01 |
| 4 | `ui/src/server/editor-config.ts` | neu | Store laden/ändern/validieren | AK-04 |
| 5 | `ui/src/server/websocket.ts` | ändern | `settings.editor.get`, `settings.editor.update` | AK-04 |
| 6 | `ui/frontend/src/services/editor-link.service.ts` | neu | Singleton, Laden, Reconnect | AK-03, AK-04 |
| 7 | `ui/frontend/src/components/terminal/aos-vscode-knopf.ts` | neu | Link-Baustein (Shadow DOM) | AK-01, AK-05 |
| 8 | `ui/frontend/src/components/terminal/aos-terminal-tabs.ts` | ändern | Einbau im Tab + Host-Stil `tab-vscode` | AK-01 |
| 9 | `ui/frontend/src/components/terminal/aos-terminal-session.ts` | ändern | Einbau im `.session-header` | AK-01 |
| 10 | `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` | ändern | Einbau in `.pane-header-row` | AK-01 |
| 11 | `ui/frontend/src/components/settings/aos-editor-einstellung.ts` | neu | Einstellungsfeld | AK-04 |
| 12 | `ui/frontend/src/views/settings-view.ts` | ändern | Import + Einbau in `renderGeneralSection` | AK-04 |
| 13 | Tests (siehe §8) | neu | 5 Testdateien | alle AK |
| 14 | `docs/architecture.md`, `docs/security.md`, `docs/adr/0002-…md` | ändern | siehe §3 Architektur-Auswirkung | AR-Pflicht |
| 15 | `intent/INT-2026-028-worktree-im-editor/intent.md` | ändern | `bezuege.plan: "plan.md"` | Workflow |

**Nicht betroffen (ausdrücklich):** `general-config.ts` und `ui/config/*.json`; `github-config.ts` (Nebenbefund `.gitignore` bleibt außen vor, siehe §12); Handy-Komponenten `components/mobile/*` und der `compact`-Pfad (NZ-05); Vorhaben-Seite `aos-vorhaben-view.ts` (NZ-04); Backend-Sitzungslogik `cloud-terminal-manager.ts`, `cloud-session-registry.ts` (Pfad wird nur gelesen, wie er heute geliefert wird); `tab-title.ts`; Installer, Manifest, Framework-Dateien (AR-06).

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `aos-vscode-knopf` | `editor-link.ts` | Import | `vscodeZiel` | `grep -n "vscodeZiel" ui/frontend/src/components/terminal/aos-vscode-knopf.ts` | — |
| `aos-vscode-knopf` | `editor-link.service.ts` | Import + Subscribe | `editorLinkService.subscribe/get/ensureLoaded` | `grep -n "editorLinkService" ui/frontend/src/components/terminal/aos-vscode-knopf.ts`; Test `aos-vscode-knopf.test.ts` „folgt dem Host" | — |
| `aos-terminal-tabs`, `aos-terminal-session`, `aos-cloud-terminal-sidebar` | `aos-vscode-knopf` | Element + Prop `.session` | `<aos-vscode-knopf .session=…>` | `grep -n "aos-vscode-knopf" ui/frontend/src/components/terminal/{aos-terminal-tabs,aos-terminal-session,aos-cloud-terminal-sidebar}.ts` (je ≥ 1 Treffer, plus Import `./aos-vscode-knopf.js`); Test `vscode-knopf-einbau.test.ts` | — |
| `editor-link.service.ts` | Backend `websocket.ts` | WS | `settings.editor.get` → `settings.editor` | `grep -n "settings.editor" ui/frontend/src/services/editor-link.service.ts ui/src/server/websocket.ts`; Test `editor-link-service.test.ts` | — |
| `aos-editor-einstellung` | Backend `websocket.ts` | WS | `settings.editor.update { remoteSshHost }` | `grep -n "settings.editor.update" ui/frontend/src/components/settings/aos-editor-einstellung.ts ui/src/server/websocket.ts`; Test `aos-editor-einstellung.test.ts` | — |
| `settings-view.ts` | `aos-editor-einstellung` | Element | `<aos-editor-einstellung>` in `renderGeneralSection` | Test `aos-editor-einstellung.test.ts` (Quelltext-Schnitt wie `settings-anruf.test.ts:38-45`) | — |
| `websocket.ts` | `editor-config.ts` | Import | `loadEditorConfig`, `updateEditorConfig` | `grep -n "editor-config" ui/src/server/websocket.ts` | — |
| `editor-config.ts` | `runtime-paths.ts` | Import | `getEditorConfigPath` | `grep -n "getEditorConfigPath" ui/src/server/editor-config.ts`; Test `editor-config.test.ts` (Datei unter `SPECWRIGHT_RUNTIME_DIR`) | — |
| `editor-config.ts`, `aos-editor-einstellung`, `editor-link.ts` | `editor.protocol.ts` | Import | `REMOTE_SSH_HOST_REGEX`, `EditorConfig` | `grep -rn "editor.protocol" ui/src/server ui/frontend/src` | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. **Linkformat prüfen, bevor Code entsteht** (R1): auf dem Mac `open "vscode://file/<abs. Pfad dieses Worktrees>"` → VS Code öffnet den **Ordner** als Arbeitsbereich. Remote-Format: Michael ruft einmal `! open "vscode://vscode-remote/ssh-remote+<kürzel>/<pfad auf dem Host>"` auf (Kürzel nur im Chat, nie in einer Datei) → Remote-SSH öffnet den Ordner. Scheitert eines der beiden: anhalten, Befund nach R2 als Rückfrage, Ausweichformat (z. B. Ordner mit abschließendem `/`) erst nach Antwort; Eintrag in §14.
0b. Lesende Vorprüfung: Konsumenten von `TerminalSession` und der drei Render-Stellen auf Abhängigkeit vom DOM-Aufbau (`grep -rn "tab-edit\|session-info\|pane-header-row\|pane-new-btn" ui/tests ui/frontend/src`); `npm ci` in `ui/` und `ui/frontend/`, `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper` → prüfbar durch Trefferliste ohne brechende Selektoren.
1. Tests für `editor-link.ts` und `editor-config.ts` schreiben, rot sehen; dann `editor.protocol.ts`, `editor-link.ts`, `runtime-paths.ts`, `editor-config.ts` → `npx vitest run tests/unit/editor-link.test.ts tests/unit/editor-config.test.ts` grün.
2. `websocket.ts`-Fälle, `editor-link.service.ts` mit Test → `npx vitest run tests/unit/editor-link-service.test.ts` grün.
3. `aos-vscode-knopf.ts` mit Test → grün.
4. Einbau an drei Stellen + Einbau-Test → `npx vitest run tests/unit/vscode-knopf-einbau.test.ts` grün.
5. `aos-editor-einstellung.ts` + `settings-view.ts` + Test → grün.
6. Stichprobe AK-03 auf dem Mac mit der **von `buildVscodeUri` erzeugten** URI (nicht handgeschrieben, inkl. Pfad mit Leerzeichen in einem Scratch-Ordner): `open "<uri>"` → VS Code öffnet den Ordner; Ergebnis im PR.
7. E2E: Branch-Backend auf Port 3111 mit Scratch-Projekt (Muster `reference_cloud_terminal_e2e_playwright`), Playwright: Sitzung starten → Knopf erscheint erst nach `session-connected`, `href` = `vscode://file/<effectiveCwd>`; Einstellung mit Test-Alias `testhost` setzen → `href` wechselt auf `vscode://vscode-remote/ssh-remote+testhost/…`; Split-Ansicht → Knopf im Pane-Kopf; Screenshots Einzelansicht, Split, Einstellungen.
8. Docs: `architecture.md`, `security.md`, ADR-0002-Vermerk.
9. Verbindungen nachweisen (Abschnitt 5), `bash scripts/verify.sh` → `verify: OK`.

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Gewählt. Rund 3–5 h Arbeit; Baustein, Service und Einstellung greifen über `editor.protocol.ts` und den Service ineinander (Abschnitt 5, 9 Verbindungen) — Parallelisierung brächte zwei Worktrees für je eine Stunde und eine Integration obendrauf.

#### Variante B — parallel in Worktrees

<!-- leser: agent -->

Entfällt.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-02, AK-03 | lokale URI aus `effectiveCwd`, Segment-Kodierung (Leerzeichen, `#`, Umlaut), Shell-Sitzung liefert URI | `ui/tests/unit/editor-link.test.ts` | Unit |
| AK-04 | Remote-URI `vscode://vscode-remote/ssh-remote+<host><pfad>` | `ui/tests/unit/editor-link.test.ts` | Unit |
| AK-05 | `vscodeZiel` = `null` ohne/leeres/relatives `effectiveCwd`; `null` bei `disconnected`/`error`; URI bei `active`/`paused` | `ui/tests/unit/editor-link.test.ts` | Unit |
| AK-04, RB-01 | Store: leer per Default, Speichern/Leeren, Annahme von `devbox`, `me@devbox.example`, `a-b_c.d`; Ablehnung je einzeln von `/`, `\`, `+`, `?`, `#`, `%`, `:`, `"`, `<`, `>`, Leerzeichen, `\n`, führendem/abschließendem `.` oder `-`, 254 Zeichen; Datei liegt unter `SPECWRIGHT_RUNTIME_DIR` als `editor-<port>.json`, nicht unter `ui/config/`; kaputte Datei → leer + `lesefehler: true` | `ui/tests/unit/editor-config.test.ts` | Unit |
| AK-04 | WS-Fälle: `settings.editor.get` antwortet `settings.editor`; `update` mit ungültigem Host bzw. Nicht-String antwortet `settings.error`, Verbindung bleibt offen | `ui/tests/unit/editor-config.test.ts` (Handler-Funktion aus `websocket.ts` herausgelöst, falls nötig als `handleEditorSettings(message, send)` in `editor-config.ts`) | Unit |
| AK-04 | Service sendet einmal `settings.editor.get`, erneut bei `gateway.connected`; setzt Wert aus `settings.editor`; Abonnenten werden benachrichtigt | `ui/tests/unit/editor-link-service.test.ts` | Unit (Gateway-Mock wie `settings-anruf.test.ts:10-12`) |
| AK-01, AK-05 | `aos-vscode-knopf`: kein `<a>` vor dem Laden des Host-Werts; kein `<a>` ohne Ordner; neues `session`-Objekt mit `effectiveCwd` → `<a href>` erscheint; `href` wechselt bei Host-Änderung; Klick propagiert nicht über den Wirt hinaus | `ui/tests/unit/aos-vscode-knopf.test.ts` | Komponente (happy-dom) |
| AK-01 | Einbau: `aos-terminal-tabs` rendert je Tab mit Ordner einen Knopf, ohne Ordner keinen, und ein Klick auf den Link löst **kein** `session-select` aus (DOM); `aos-terminal-session` `.session-header` und Sidebar `.pane-header-row` enthalten `<aos-vscode-knopf` (Quelltext-Schnitt) | `ui/tests/unit/vscode-knopf-einbau.test.ts` | Komponente + Quelltext |
| AK-04 | Einstellung: lädt Wert, Speichern sendet getrimmten Wert, ungültige Eingabe sendet nichts und zeigt Fehler, Leeren sendet `''`, `lesefehler` zeigt den Hinweis; Einbau in beiden Zweigen von `renderGeneralSection` | `ui/tests/unit/aos-editor-einstellung.test.ts` | Komponente (happy-dom) |
| AK-03 | `open "<uri>"` auf dem Mac öffnet den Ordner (Schritt 0 und 6) | Protokoll im PR | Stichprobe (Bausitzung) |
| AK-04 | Linkformat remote per `open` mit echtem Kürzel (Schritt 0, vor dem Code) | Chat-Protokoll, im PR ohne Kürzel | Stichprobe (Michael, vor Merge) |
| AK-04 | Klick in der Cloud-UI mit eingetragenem Kürzel öffnet VS Code über Remote-SSH im Ordner | §10 | Stichprobe (Michael, nach Merge) |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss mit `verify: OK` enden, Ausgabe im PR. **CI ist die Wahrheit:** lokal grün zählt erst, wenn die PR-Checks grün sind. `ui/tests/known-failures.txt` wird nicht angefasst.
- **Datenkorrektur:** entfällt (keine Bestandsdaten).
- **Angeschlossen (E2E-Pfad):** Schritt 7 in §6 — Sitzung starten → `session-connected` liefert `effectiveCwd` → Knopf im Tab und Kopf mit lokaler URI → Einstellung setzen (`settings.editor.update` → Store → `settings.editor` → Service) → URI wechselt auf Remote; Playwright gegen Branch-Backend 3111, Screenshots im PR.
- **Bugfix:** entfällt.
- **UI:** kein Mock in `design/` für dieses Vorhaben; Prüfung per Screenshot (Einzelansicht, Split, Einstellungen) im PR, Symbol in Größe und Hover-Verhalten wie `.tab-edit`.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| R1: das Linkformat öffnet den Ordner nicht als Arbeitsbereich (lokal oder remote) | niedrig | hoch (Ansatz hängt daran) | Prüfung in Schritt 0, **bevor** Code entsteht; bei Fehlschlag Halt und Rückfrage | Bausitzung, Michael |
| R2: Cloud-UI ohne eingetragenen Host baut lokalen Link auf einen Pfad, den es auf dem Mac nicht gibt | mittel | niedrig | bewusste Folge von OF-01; Hinweistext am Feld; VS Code meldet „nicht gefunden" | Michael beim ersten Klick |
| R3: Remote-SSH-Erweiterung fehlt oder Alias falsch | niedrig | niedrig | Prüfweg in §10; Fehlermeldung kommt von VS Code | Michael |
| R4: Browser fragt vor dem Öffnen nach Erlaubnis — Chrome beim ersten Mal mit „immer erlauben", Safari und Firefox je nach Einstellung [Uncertain] | mittel | niedrig | einmal erlauben; Verhalten im PR-Protokoll für Michaels Browser festhalten | Michael |
| R8: gespeicherte Datei unlesbar → Cloud-UI fiele still auf lokale Links | niedrig | niedrig | `lesefehler` sichtbar im Einstellungsfeld | Michael in den Einstellungen |
| R5: Knopf im Tab macht schmale Tabs voller | niedrig | niedrig | erscheint nur bei Hover und am aktiven Tab (Muster `.tab-edit`) | Michael |
| R6: Host-Alias gerät doch ins Repo | niedrig | mittel | Speicher im gitignored Laufzeitordner, Test prüft den Pfad; Feld nie in `ui/config/` | Review, Hook `no-secrets` greift hier nicht (kein Geheimnis-Muster) |
| R7: andere offene Browserfenster sehen einen geänderten Host erst nach Neuladen oder Reconnect | niedrig | niedrig | bewusst (Wert ändert sich praktisch nie), siehe §3 verworfene Alternative Workspace-Broadcast | Michael |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Remote-Linkformat einmal prüfen: `! open "vscode://vscode-remote/ssh-remote+<kürzel>/<pfad>"` in dieser Sitzung (Kürzel nur im Chat) | Michael | Bausitzung, Schritt 0, vor dem ersten Code | entfällt (Michael, 2026-10-01: „remote nicht notwendig“, §14) |
| PR prüfen und mergen (Merge löst den Auto-Deploy der Cloud-UI aus, `CLAUDE.md` „Nie") | Michael | nach grünem CI | [ ] |
| Mac: Remote-SSH-Erweiterung vorhanden? Prüfweg: `code --list-extensions \| grep ms-vscode-remote.remote-ssh`; SSH-Kürzel des Cloud-Hosts funktioniert: `ssh <kürzel> true` | Michael | vor der Stichprobe AK-04 | [ ] |
| Cloud-UI: Einstellungen › Allgemein › „Remote-SSH-Host für VS Code" = SSH-Kürzel eintragen (Weg: das neue Feld; Wert landet nur in `<runtime>/editor-<port>.json` auf dem Host) | Michael | nach dem Deploy | [ ] |
| Stichprobe AK-04: in der Cloud-UI an einer laufenden Sitzung auf das Symbol klicken → VS Code öffnet über Remote-SSH den Ordner | Michael | nach dem Eintrag | [ ] |
| Mac-UI (Hauptcheckout, Port 3001): nach dem Merge `git pull` und Backend neu starten, damit der Knopf erscheint; Feld leer lassen; Stichprobe AK-03 per Klick | Michael | nach dem Merge | [ ] |

### 11. Schätzung

<!-- leser: mensch -->

3–5 h. Unsicher sind die Stichprobe zum Ordner-Link (R1) und der Einbau-Test für `aos-terminal-tabs` in happy-dom (mögliche Importketten); Ausweichen ist ein Quelltext-Schnitt-Test nach dem Muster `settings-anruf.test.ts`.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| S1, Ablage des Hosts in `general-config.json`: abgelehnt, weil die Datei im öffentlichen Repo versioniert ist (RB-01) | Self | Ablage im Laufzeitordner | §3 Ansatz 3, verworfene Alternativen |
| S2, „Sitzungskopf" in der geteilten Ansicht: angenommen, weil dort `.session-header` per `pane-mode` versteckt ist und der Pane-Kopf die Rolle übernimmt — ohne dritte Einbaustelle wäre AK-01 im Split nicht erfüllt | Self | dritte Einbaustelle Pane-Kopf | §3 Ansatz 7, §4 #10 |
| S3, Sichtbarkeit bei `paused`: angenommen, weil `cloud-terminal.service.ts:261` `paused` als laufend zählt | Self | Regel `active` oder `paused` | §3 Ansatz 1 |
| S4, ein gemeinsamer Shadow-DOM-Baustein statt drei Inline-Links: angenommen, weil die drei Wirte gemischt Light/Shadow DOM sind (Fehlerliste `theme.css`) und die Regel an einer Stelle getestet wird | Self | `aos-vscode-knopf` mit `static styles` | §3 Ansatz 6 |
| S5, Broadcast an alle Clients: abgelehnt, weil ein Wert, der sich praktisch nie ändert, keine Protokollerweiterung rechtfertigt; Reconnect lädt nach | Self | Antwort nur an den Absender | §3 Ansatz 4, R7 |
| S6, eigenes ADR für die neue Laufzeitdatei: abgelehnt, weil Ablagemuster und Ort aus ADR-0002 unverändert übernommen werden; Vermerk dort genügt | Self | ADR-0002-Vermerk | §3 Architektur-Auswirkung |
| S7, Nebenbefund `ui/config/github-config.json` nicht gitignored (PAT ggf. im Klartext ohne `SPECWRIGHT_SECRET_KEY`): nicht in diesem Vorhaben, weil fremder Bereich; Karte fürs Board | Self | Block „Für das Board" im Abschlussbericht | — |
| S8, Intent §1 „Ordnername im Tab-Titel": tatsächlich im Tooltip (`aos-terminal-tabs.ts:315`); ohne Folgen für AK, kein Intent-Edit | Self | nur hier vermerkt | §2 |
| E1, Windows-Pfade mit `\`: angenommen als Klarstellung, weil das Backend nur auf macOS/Linux läuft (tmux); kein Windows-Code, Grenze im Funktionskommentar benannt | 2/4 Reviewer | Doku statt Code | §3 Ansatz 1 |
| E2, Knopf bleibt versteckt, wenn `effectiveCwd` später eintrifft, und falscher lokaler Link vor dem Laden des Hosts: angenommen, weil beide Fälle real wären; `session` als `@property` mit immutablem Update (`app.ts:1015-1022`), Berechnung in `render()`, Knopf erst nach geladenem Host-Wert | 2/4 | Reaktivität und Ladezustand festgelegt, zwei Tests | §3 Ansatz 5–6, §8 |
| E3, Linkformat erst nach dem Code geprüft: angenommen, weil der Ansatz daran hängt; Prüfung lokal und remote in Schritt 0 vor dem ersten Code, bei Fehlschlag Halt und Rückfrage | 2/4 | Schritt 0 neu, R1 auf „hoch" | §3, §6, §8, §9, §10 |
| E4, Regex zu weit/zu eng und Injektion nicht belegt: angenommen, weil Anfang/Ende mit `.`/`-` kein sinnvoller Alias ist und die Ausschlussliste prüfbar sein muss; `:` bleibt ausgeschlossen, Port gehört in die SSH-Config | 2/4 | Regex verschärft, Ausschlussliste je Zeichen getestet | §3 Ansatz 2, §8 |
| E5, wiederhergestellte, nicht laufende Sitzungen ohne Knopf: abgelehnt, weil NZ-03 beendete Sitzungen ausschließt und `toRestoredTab` `disconnected` nur für im Backend nicht aktive Sitzungen setzt (`session-naming.ts:107`) | 1/4 | — | — |
| E6, Remote-Pfad erst nach dem Merge geprüft: angenommen, weil er der riskanteste Pfad ist; Michael prüft das Format vor dem Code per `open` | 1/4 | manueller Schritt vor dem Code | §6 Schritt 0, §10 |
| E7, zu viele Dateien, Protokolldatei einsparen: abgelehnt, weil Front- und Backend dieselbe Regex brauchen (Muster `github.protocol.ts`) und der Shadow-Baustein die drei gemischten Wirte erst sauber macht (S4) | 1/4 | — | — |
| E8, E9, E18, veralteter Host in anderen Browsern bzw. bei Verbindungsabbruch: abgelehnt als Code-Änderung, angenommen als ausdrückliche Grenze von AK-04, weil der Wert sich praktisch nie ändert und Reconnect neu lädt | je 1/4 | Grenze benannt | §3 Ansatz 4, R7, „In einfachen Worten" |
| E10, kein Feature-Schalter: abgelehnt, weil der Knopf rein additiv ist (ein Link, keine Daten, keine Migration); Rückweg ist ein Revert-PR | 1/4 | — | — |
| E11, Reaktivität unklar: angenommen, siehe E2 | 1/4 | siehe E2 | §3 Ansatz 6 |
| E12, Lage im `.session-header` unklar: angenommen, Geschwister nach `.session-info`, Header ist `space-between` | 1/4 | festgelegt | §3 Ansatz 7 |
| E13, kein `try/catch` im WS-Handler: angenommen, Muster `handleSettingsGeneralUpdate`, Test auf `settings.error` | 1/4 | festgelegt + Test | §3 Ansatz 4, §8 |
| E14, unlesbare Datei kippt still auf lokal: angenommen, weil das R2 unsichtbar machen würde; `lesefehler` im Feld | 1/4 | Feld `lesefehler`, R8 | §3 Ansatz 3, §8, §9 |
| E15, Einbau unter dem Anruf-Schalter vermischt Host- und Projektteil: abgelehnt, weil der Schalter genau so (in beiden Zweigen) eingebaut ist und beide Host-Einstellungen sind; Einbau in beiden Zweigen festgeschrieben | 1/4 | Klarstellung | §3 Ansatz 8 |
| E16, Singleton bei HMR/mehreren Instanzen: abgelehnt, weil `kennungenService` und `themeService` dasselbe Muster haben; Tests nutzen `vi.resetModules()` | 1/4 | — | — |
| E17, E22, Klick im Tab schaltet den Tab um: angenommen, Test „Klick auf den Link löst kein `session-select` aus"; Hover-Stil über Host-Klasse im Light DOM der Tabs | je 1/4 | Test ergänzt | §8 |
| E19, Ordner auf der Platte gelöscht: abgelehnt, weil der Manager beim Start prüft (`cloud-terminal-manager.ts:921`) und ein späteres Löschen von VS Code selbst gemeldet wird | 1/4 | — | — |
| E20, Browser-Nachfrage falsch beschrieben: angenommen, R4 neu formuliert und als `[Uncertain]` markiert, Verhalten im PR festhalten | 1/4 | R4 | §9 |
| E21, „Repo ist öffentlich" ohne Beleg: angenommen, Beleg `CLAUDE.md` („das Repo ist öffentlich"), `docs/security.md` §1 Datenklasse „öffentlich" | 1/4 | Beleg hier | — |
| E23, Zeilennummern aus anderem Stand: abgelehnt, weil der Branch auf `origin/main` 5ab5bc9 rebased ist (HEAD da9a8d2 = 5ab5bc9 + Intent-Commit) und alle Zeilen dort gelesen wurden; der Reviewer las einen älteren Baum | 1/4 | — | §2 Kopfzeile |
| E24, deutsch-englische Namen: abgelehnt, weil Projektkonvention (`aos-anruf-schalter`, `kennungenService`, `vscodeZiel` neben englischem Code) | 1/4 | — | — |
| E25, Nebenbefund S7 hoch priorisieren: angenommen, Karte im Block „Für das Board" mit Priorität hoch | 1/4 | DoD | §13 |
| E26, aktive Sitzung im Split vorab klären: angenommen, belegt (`aos-cloud-terminal-sidebar.ts:1795-1797`), Knopf nur für die aktive Sitzung des Panes | 1/4 | festgelegt | §3 Ansatz 7 |
| E27, Ladezeitpunkt und Protokolldatei vorab klären: angenommen, `ensureLoaded()` in `connectedCallback` beider Bausteine, Protokolldatei-Inhalt festgelegt | 1/4 | festgelegt | §3 Ansatz 2, 5 |

**Minimalinvasiv geprüft:** wiederverwendet — `effectiveCwd` samt Wiederherstellung (`session-naming.ts`), Laufend-Regel aus `cloud-terminal.service.ts`, Store-Muster aus `github-config.ts`, Laufzeitordner aus `runtime-paths.ts`, Singleton-Muster aus `kennungen.service.ts`, Einbau-Muster und Test-Muster von `aos-anruf-schalter`, CSS-Klassen der Einstellungsseite, Hover-Muster von `.tab-edit`. Gestrichen — Broadcast, eigenes ADR, Erkennung über Hostname, Prüfung der VS-Code-Installation.

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-10-01 nach Einarbeitung der externen Reviews: ohne Befund (R4) — drei Einbaustellen, Ablage im Laufzeitordner, Regel „Feld entscheidet", Prüfung des Linkformats vor dem Code mit Michaels Prüfbefehl, Grenze „andere Fenster erst nach Neuladen", Hinweis bei unlesbarer Datei und Handy unberührt stehen in beiden Teilen gleich.

### 13. Definition of Done

<!-- leser: agent -->

- [x] Jede FA/AK aus Abschnitt 8 hat einen grünen Test.
- [x] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [x] E2E-Pfad läuft (Abschnitt 8).
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün (CI ist die Wahrheit). Lokal `verify: OK` (2026-10-01); PR-Check steht aus.
- [x] `docs/architecture.md` angepasst, falls Abschnitt 3 „Ja".
- [x] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [x] Abweichungen von diesem Plan in Abschnitt 14 eingetragen.
- [x] 2x-Regel-Check: Fehler, der zum zweiten Mal vorkam → Vorschlag für `CLAUDE.md` im PR.
- [ ] Abschlussbericht nach R3 (nur Mensch-Abschnitte im Chat), endet mit dem Block „Für das Board" (Karte, Spalte, PR-Link, Stand, Verweis auf `intent/INT-2026-028-worktree-im-editor/`, Nebenbefund S7 als neue Karte mit Priorität hoch); Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-10-01 | Schritt 0 remote (Michael prüft `vscode://vscode-remote/ssh-remote+…` vor dem Code) entfällt; nur lokal geprüft. | Michael im Chat: „remote nicht notwendig". | §6 Schritt 0, §8 Zeile „Linkformat remote", §10 Zeile 1 (entfällt); Remote-Format bleibt [Likely] bis zur Stichprobe AK-04 nach dem Merge (§10). |
| 2026-10-01 | `editorLinkService` hat zusätzlich `update(host)` und `getFehler()`: ein `settings.error`, das nach einem eigenen Update eintrifft, gilt als dessen Ablehnung und erscheint im Feld. | Das Feld soll die Backend-Ablehnung zeigen; `settings.error` teilen sich alle Einstellungen, deshalb nur bei laufendem Update zugeordnet. | §3 Ansatz 5, Test `editor-link-service.test.ts`. |
| 2026-10-01 | Nachweise §5 angepasst: `aos-editor-einstellung` sendet `settings.editor.update` über `editorLinkService.update()` (Treffer im Service, nicht im Baustein); `editor-link.ts` importiert `editor.protocol.ts` nicht — es braucht nur den Host-Text, die Regel liegt bei Store und Feld. | Folge der Service-Methode `update()` (Zeile oben); keine zweite Stelle, die die Nachricht baut. | §5 Zeilen 5 und 9. |
| 2026-10-01 | WS-Handler als `handleEditorSettingsMessage(message, send)` in `editor-config.ts`, `websocket.ts` delegiert nur. | In §8 als Option genannt; macht die WS-Fälle ohne `WebSocketManager` testbar. | §3 Ansatz 4. |
| 2026-10-01 | `aos-vscode-knopf` setzt am Wirt `hidden`, solange kein Link entsteht; Symbolgröße über `--vscode-knopf-icon` (Tab: 12 px wie `.tab-edit`). | Leerer Wirt soll im Flex-Layout keinen Abstand belegen; Größe im Tab an `.tab-edit` angeglichen. | §3 Ansatz 6–7. |
| 2026-10-01 | Knopf im Tab nur bei Hover (`.tab:not(:hover) .tab-vscode { display: none }`), nicht dauerhaft am aktiven Tab und nicht per `opacity` wie `.tab-edit`. | E2E-Screenshot mit drei Sitzungen: `min-width: 120px` lässt dem Namen neben Status, Stift und Schließen ~31 px; ein vierter fester Knopf ließ 7 px (Name „T."). Die aktive Sitzung hat den Knopf ohnehin im Sitzungs- bzw. Pane-Kopf. Gemessen danach: alle Namen 31 px wie vorher, Hover zeigt den Knopf mit Link. | §3 Ansatz 7, §8 (Einbau-Test um Stilregel ergänzt), R5 eingetreten und behoben. |
| 2026-10-01 | Eine im Laufzeitordner gespeicherte, aber ungültige Host-Angabe zählt wie eine unlesbare Datei (`lesefehler`). | Datei könnte von Hand editiert sein; ein ungültiger Host darf nie in einen Link. | §3 Ansatz 3. |
