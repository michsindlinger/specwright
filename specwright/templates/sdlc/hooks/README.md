# Hooks — deterministische Leitplanken

Skills und `CLAUDE.md` beraten. Hooks erzwingen. Jede Regel, die ausnahmslos gelten muss, bekommt einen Hook.

## Installation im Projekt

```bash
mkdir -p .claude/hooks
cp [specwright]/templates/sdlc/hooks/*.sh .claude/hooks/
chmod +x .claude/hooks/*.sh
# settings.json-Block aus settings.json hier in .claude/settings.json übernehmen (mergen, nicht überschreiben)
git add .claude/hooks .claude/settings.json && git commit -m "chore: hooks protect-tests, no-secrets, production-gate"
```

**Committen ist Pflicht.** Git-Worktrees haben eigene Arbeitsdateien; ein unkommittetes `.claude/settings.json` wirkt dort nicht.

Nicht verhandelbare Hooks (z. B. `production-gate`) gehören zusätzlich in die Managed Settings, damit sie lokal nicht abschaltbar sind.

## Die drei Hooks

| Hook | Ereignis | Blockiert | Ausnahme |
|---|---|---|---|
| `protect-tests.sh` | `PreToolUse` für `Edit`, `Write`, `MultiEdit` | Änderungen an Testdateien und Test-Baselines, solange die Marker-Datei `.claude/fix-mode` existiert; Baselines immer | Marker löschen (Plan-Phase „finalize") oder `ALLOW_TEST_EDITS=1` |
| `no-secrets.sh` | `PreToolUse` für `Bash` bei `git commit` | Commit, wenn im Staging Secret-Muster oder Secret-Dateien liegen | keine — Datei aus dem Staging nehmen |
| `production-gate.sh` | `PreToolUse` für `Bash` | Befehle, die auf `deploy` **und** `prod`/`production` passen, ohne `RELEASE_APPROVAL` | `RELEASE_APPROVAL=[Name JJJJ-MM-TT]` in der Umgebung oder Datei `.claude/release-approval` (wird nach dem Deploy gelöscht) |

## Mechanik

Claude Code ruft den Befehl mit JSON auf stdin auf (`tool_name`, `tool_input`). Exit `0` = weiter, Exit `2` = blockieren; stderr wird Claude als Begründung gezeigt. `CLAUDE_PROJECT_DIR` zeigt auf das Projekt. JSON wird mit `python3` gelesen (auf macOS vorhanden, kein `jq` nötig).

## Fix-Modus

Bei einem Bugfix gilt: Test zuerst, Fehlschlag bestätigen, dann Fix, Test bleibt unverändert. Die Plan-Phase „execute" legt `.claude/fix-mode` an, sobald `plan.md` als Bugfix markiert ist; „finalize" löscht die Datei. Solange sie existiert, sind Testdateien gesperrt.

## Anpassen

- Testdatei-Muster und Baselines: oben in `protect-tests.sh` (`TEST_PATTERNS`, `BASELINES`).
- Secret-Muster und Dateinamen: oben in `no-secrets.sh`.
- Deploy-Muster: oben in `production-gate.sh` (`DEPLOY_PATTERN`, `PROD_PATTERN`).

Jede Änderung an einem Hook läuft durch die Eval-Suite (Phase 4).
