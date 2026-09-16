# Sicherheit: Specwright

> **Stand:** 2026-09-15 · **Verantwortlich:** Michael Sindlinger
> **Rolle dieses Dokuments:** Pflichtlektüre beim Schreiben jeder Spec (Bedenken), jedes Plans und jedes Reviews. Die Verbotsliste (Abschnitt 5) ist für Agenten bindend und durch Hooks abgesichert.
> **Firmenrichtlinie:** Firmen-Repo SBS (entsteht in Phase 3)

## 1. Datenklassen

| Klasse | Bedeutung | Beispiele hier | Regeln |
|---|---|---|---|
| öffentlich | darf jeder sehen — **das Repo ist öffentlich** | Befehle, Workflows, Vorlagen, Installer, `docs/`, `intent/`, `ui/config/model-config.json` (Provider- und Modellnamen der UI; Zugänge nie darin — versioniert, Hook-Ausnahme `.claude/no-secrets-allow.txt`) | nichts hinein, was Kunden, Hosts oder Zugänge verrät |
| intern | nur auf Michaels Geräten | `~/.specwright/memory.db`, `<runtime>/workspace-*.json`, tmux-Registry | nie committen |
| vertraulich | Zugänge | `~/.claude.json` (MCP-Server-Konfiguration), Provider-Wrapper unter `~/bin/claude-<id>`, `~/.claude-<id>/settings.json` (Proxy-URL, Modell-Mapping, ggf. Token), `~/.config/claude-code-proxy/<provider>/auth.json` (OAuth des Proxys), `~/.codex/auth.json` (Codex-CLI), `.env` der UI | siehe Abschnitt 3 |
| personenbezogen | DSGVO | keine im Repo; die UI verarbeitet Projektinhalte der jeweiligen Projekte (deren `security.md` gilt) | — |

| Datenobjekt | Klasse | Speicherort | Löschfrist |
|---|---|---|---|
| Manifest, Entfernt-Liste | öffentlich | Repo | — |
| Vorhaben, Projekt-Docs von Specwright | öffentlich | Repo | — |
| Memory-Store des MCP | intern | `~/.specwright/memory.db` | Nutzer entscheidet |
| Sicherungskopien des Updaters | wie Original | `specwright/backups/<Zeitstempel>/` im Projekt | Nutzer löscht den Ordner |

## 2. Zugriffsmodell

- **Anmeldung:** keine im Framework. Die Web-UI hat keine eigene Nutzerverwaltung; Zugriff wird auf Netzebene begrenzt (Tailscale/tailnet-only lokal; Cloud-Host hinter eigenem Zugang, Details außerhalb des Repos).
- **Rollen:** ein Nutzer. „Product Owner", „Tech Lead" sind Hüte in den Dokumenten, keine Rechte.
- **Mandanten:** keine.
- **Vertrauensannahme (INT-2026-007):** genau ein Nutzer, dessen Claude-Code-Prozesse auf dem Host vertrauenswürdig sind. Die Hook-Route der UI vertraut dem Token, nicht dem Absender; was ein Hook meldet (Transkriptpfad, Dialoge, Beiträge), gilt als Aussage dieses Nutzers über seine eigene Sitzung.
- **Wer sieht was:**

| Rolle | darf sehen | darf ändern | darf nie |
|---|---|---|---|
| Michael | alles | alles | Secrets ins Repo |
| Agent (Claude Code) | Repo, Projekt-Dateien | Repo-Dateien auf Branches | Produktions-Deploy ohne Freigabe; Tests/Baselines lockern; Secrets committen |
| Installer im Projekt | Manifest, Ziel-Verzeichnisse | nur Manifest-Ziele; Entferntes nur bei passender Prüfsumme | fremde Projektdateien, `CLAUDE.md` des Projekts |

## 3. Geheimnisse

| Geheimnis | Wofür | Liegt in | Kommt zur Laufzeit über | Rotation |
|---|---|---|---|---|
| Anthropic/Provider-Zugänge | Claude-Sitzungen aus der UI | Claude-Code-Konfiguration des Nutzers, Provider-Wrapper | Umgebung des Prozesses | Nutzer |
| OpenAI/ChatGPT-Zugang (INT-2026-011) | Provider `codex` (Claude Code über `claude-code-proxy`) und `codex-cli` (native Codex-CLI) | Proxy-OAuth unter `~/.config/claude-code-proxy/codex/`, Codex-Login unter `~/.codex/auth.json`; die UI kennt nur Provider- und Modellnamen | Proxy-Prozess `claude-code-proxy serve` auf localhost (Wrapper `~/bin/claude-codex` prüft Erreichbarkeit und Anmeldung vor dem Start, sonst Meldung und Exit 1) bzw. Codex-Prozess selbst. Ausfall: Proxy weg → Wrapper bricht sichtbar ab; Konto abgemeldet → Wrapper-Meldung im Terminal, im Prüfer-Pfad (SDK ohne Wrapper) der Fehlertext des SDK; Codex ohne Login → Codex fragt im Terminal nach. Kein stilles Ausweichen auf Anthropic (`ANTHROPIC_BASE_URL` fest auf den Proxy). Projektinhalte gehen an OpenAI — die `security.md` des jeweiligen Projekts gilt | Nutzer (Proxy: `claude-code-proxy codex auth login`; CLI: `codex login`) |
| MCP-Server-Zugänge (Supabase, Firebase) | Projekt-MCPs | `~/.claude.json` (user-scope) | Claude Code | Nutzer |
| GitHub-Token | Auto-Deploy, `gh` | Host-Konfiguration | Umgebung | Nutzer |
| Sprachdienst-Zugänge (Deepgram, ElevenLabs) | **entfernt (INT-2026-010):** Anruf-Modus und Sprachdienste sind aus der UI gelöscht (`voice-call.service.ts`, `voice-config.ts`); die Datei `ui/config/voice-config.json` liest kein Code mehr, sie bleibt gitignored, der Guard `check-no-voice-config` in `verify` bleibt | — (Datei liegt lokal ungenutzt) | — | **Vorfall 2026-09-16:** Datei mit echten Schlüsseln seit März versioniert (Commit `65799ee`, Repo öffentlich); aus dem Index entfernt, beide Schlüssel rotieren (Historie bleibt öffentlich) |

**Nie im Repo, nie im Image, nie im Diff:** `.env*`, Service-Account-JSON, Tokens, private Schlüssel, `~/.claude.json`, Hostnamen und Pfade des Cloud-Hosts. Hook `no-secrets` blockiert Commits mit solchen Mustern.

## 4. Bedrohungen und Gegenmaßnahmen

| ID | Bedrohung | Gegenmaßnahme | Stand | Nachweis |
|---|---|---|---|---|
| T-01 | Installer schreibt bei GitHub-Rate-Limit (429) eine HTML-Fehlerseite in eine Projektdatei | `curl -sSLf` in `install-lib.sh`; Fehler zählt als Fehlschlag, Datei bleibt unangetastet | umgesetzt (INT-2026-002) | `sw_fetch` |
| T-02 | Update löscht eine Datei, die ein Projekt selbst angepasst hat | Löschen nur bei Prüfsummen-Treffer gegen `removed.tsv`; sonst behalten und melden; `keep.txt` | umgesetzt | `scripts/test-installers.sh` T4 |
| T-03 | Secret landet im öffentlichen Repo | Hook `no-secrets` bei `git commit`; Verbotsliste | umgesetzt (Hook im Repo seit INT-2026-002) | `.claude/hooks/no-secrets.sh` |
| T-04 | Agent kürzt Bezugsliste oder Tests, damit Verify grün wird | Hook `protect-tests` (Baselines immer gesperrt), ER-06, CI als Wahrheit | umgesetzt | `.claude/hooks/protect-tests.sh` |
| T-05 | `curl … \| bash`-Installer lädt manipulierten Code | HTTPS zu GitHub; keine weitere Signatur | offen (bewusst, ein Nutzer) | — |
| T-06 | Web-UI führt beliebige Befehle über Cloud-Terminal aus | Zugriff netzseitig begrenzt; keine Nutzerverwaltung | offen (Phase 5) | — |
| T-07 | Details des Cloud-Hosts geraten in Docs/Intents des öffentlichen Repos | Regel in Abschnitt 5; Review | umgesetzt (Regel) | Review |

## 5. Verbotsliste für Agenten

| Verbot | Abgesichert durch |
|---|---|
| Zugriff auf Produktionsdaten ohne ausdrückliche Freigabe (ER-04) — hier: Update-Lauf auf `main` eines fremden Projekts, Läufe auf dem Cloud-Host | Arbeitsweise (`CLAUDE.md`), Review |
| Secrets im Diff | Hook `no-secrets` |
| Auth-Prüfungen entfernen oder lockern, um einen Test grün zu bekommen (ER-06) | Review, Hook `protect-tests` |
| Produktions-Deploy ohne Freigabe (Merge nach `main` löst Auto-Deploy der UI aus) | Merge nur durch Michael; Hook `production-gate` für `deploy`+`prod`-Befehle |
| Tests oder Baselines ändern, um grün zu werden; Bezugsliste nach lokalem Lauf kürzen | Hook `protect-tests`, AP-03 |
| Hostnamen, Pfade, Nutzer, Ports des Cloud-Hosts in Repo-Dateien | Review, Verbotsliste |
| Dateien im Repo-Root anlegen außer `CLAUDE.md`, `README.md`, `VERSION`, Installern, `intent/`, `docs/`, `scripts/` | Review |

## 6. Pflichtprüfungen bei Änderungen

| Wenn ein Plan … | dann MUSS er … |
|---|---|
| einen von außen erreichbaren Endpunkt der UI anlegt oder ändert | Zugriffsbegrenzung, Eingabevalidierung und Datenklasse der Antwort nennen |
| eine Datei in den Lieferumfang aufnimmt oder entfernt | Manifest-Zeile bzw. `removed.tsv`-Zeile mit Prüfsumme; Guard grün |
| einen Installer ändert | `scripts/test-installers.sh` grün, Bash-3.2-Verträglichkeit |
| ein externes System anbindet | Zugang (Abschnitt 3), Ausfallverhalten nennen |
| Projekt-Docs oder Intents schreibt | keine Host-Details (Abschnitt 5) |
| eine Datei liest, deren Pfad von außen gemeldet wird (z. B. Transkriptpfad aus einem Hook) | den Pfad nie vom Client nehmen; `realpath` gegen eine Allowlist prüfen (Transkripte: reguläre Datei unter `~/.claude` oder `~/.claude-<providerId>` der konfigurierten Provider, `projects/<slug>/<session_id>.jsonl` mit der `session_id` desselben Hooks, `cwd` = Arbeitsverzeichnis der Sitzung); Ablehnung sichtbar melden (`nicht_verfuegbar` mit Ursache) |

## 7. Offene Lücken

| Lücke | Risiko | Karte / Intent | Frist |
|---|---|---|---|
| Web-UI ohne Nutzerverwaltung (T-06) | mittel (netzseitig begrenzt) | eigenes Vorhaben (Board-Karte „UI-Nutzerverwaltung") | offen |
| Installer ohne Signaturprüfung (T-05) | niedrig (ein Nutzer) | — | keine |
| Hooks liegen nicht in Managed Settings, lokal abschaltbar | niedrig | Board Specwright | — |

## Änderungsprotokoll

| Datum | Änderung | PR |
|---|---|---|
| 2026-09-14 | Erstfassung (INT-2026-002) | folgt |
| 2026-09-16 | §2 Vertrauensannahme (ein Nutzer, Hook-Route vertraut dem Token), §6 Zeile Transkript-Allowlist (INT-2026-007, Stufe 1) | PR 1 |
| 2026-09-16 | §3: Sprachdienst-Zugänge ergänzt, Vorfall versionierte `voice-config.json` (INT-2026-007 PR 0); Datei aus dem Index, `.gitignore`, Guard in `verify.sh` | PR 0 |
| 2026-09-15 | §7: T-06 verweist auf ein eigenes Vorhaben statt auf den Gesamtplan Phase 5 (INT-2026-004, Stufe 3); §4 Stand unverändert offen | PR #46 |
| 2026-09-16 | §3: Sprachdienst-Zeile auf „entfernt" — Anruf-Modus, Sprachdienste, Chat-Handler und Bild-Upload (`/api/images`) aus der UI gelöscht; Guard und `.gitignore`-Eintrag bleiben (INT-2026-010, Stufe 1); kein neuer Endpunkt | PR folgt |
| 2026-09-16 | §1: `ui/config/model-config.json` von „intern" nach „öffentlich" (versioniert seit Monaten; Namen, keine Zugänge), „vertraulich" um `~/.claude-<id>/settings.json`, Proxy-OAuth und `~/.codex/auth.json`; §3 Zeile OpenAI/ChatGPT-Zugang mit Ausfallverhalten (INT-2026-011); Hook `no-secrets` liest `.claude/no-secrets-allow.txt` (nur Dateinamen-Regel) und die Inhaltsregel greift jetzt auch mit BSD-grep (leere Alternative behoben) | PR folgt |
