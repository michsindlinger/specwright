# Automated Story Execution Guide

> Automatisierte Ausführung von User Stories mit Claude Code

## Overview

Das Automated Story Execution System ermöglicht die vollautomatische Ausführung von User Stories ohne manuelle Eingriffe. Claude Code wird in einer Schleife gestartet, führt jeweils eine Phase aus und beendet sich. Das Script startet dann die nächste Iteration.

**Vorteile:**
- Keine manuellen `/clear` und `/execute-tasks` Befehle nötig
- Optimale Token-Nutzung durch frischen Context pro Phase
- Läuft unbeaufsichtigt durch (z.B. über Nacht)
- Logs für jede Phase zur Nachverfolgung

## Installation

### Quick Install (empfohlen)

```bash
# Im Projekt-Root ausführen
mkdir -p specwright/scripts && \
curl -fsSL https://raw.githubusercontent.com/michsindlinger/specwright/main/specwright/scripts/auto-execute.sh \
  -o specwright/scripts/auto-execute.sh && \
chmod +x specwright/scripts/auto-execute.sh
```

### Manuelle Installation

1. Script herunterladen:
```bash
curl -fsSL https://raw.githubusercontent.com/michsindlinger/specwright/main/specwright/scripts/auto-execute.sh \
  -o auto-execute.sh
```

2. In Projekt verschieben:
```bash
mkdir -p specwright/scripts
mv auto-execute.sh specwright/scripts/
chmod +x specwright/scripts/auto-execute.sh
```

### Global installieren (optional)

```bash
sudo curl -fsSL https://raw.githubusercontent.com/michsindlinger/specwright/main/specwright/scripts/auto-execute.sh \
  -o /usr/local/bin/auto-execute && \
sudo chmod +x /usr/local/bin/auto-execute
```

## Usage

### Grundlegende Verwendung

```bash
# Auto-detect: Findet Spec mit existierendem Kanban Board
./specwright/scripts/auto-execute.sh

# Spezifischen Spec ausführen
./specwright/scripts/auto-execute.sh 2026-01-13-feature-name
```

### Workflow

```
┌─────────────────────────────────────────────────────────┐
│  1. Script startet                                      │
│     └─ Findet Spec (auto oder Parameter)                │
├─────────────────────────────────────────────────────────┤
│  2. Iteration Loop                                      │
│     ├─ Liest kanban-board.md → Current Phase            │
│     ├─ Wenn "complete" → Exit erfolgreich               │
│     ├─ Startet: claude -p "/execute-tasks"              │
│     ├─ Wartet auf Beendigung                            │
│     └─ Nächste Iteration                                │
├─────────────────────────────────────────────────────────┤
│  3. Phasen-Ablauf                                       │
│     ├─ Phase 1: Kanban Board erstellen                  │
│     ├─ Phase 2: Git Branch erstellen                    │
│     ├─ Phase 3: Story 1 ausführen                       │
│     ├─ Phase 3: Story 2 ausführen                       │
│     ├─ ...                                              │
│     ├─ Phase 3: Story N ausführen                       │
│     └─ Phase 4: PR erstellen                            │
├─────────────────────────────────────────────────────────┤
│  4. Abschluss                                           │
│     └─ Sound-Benachrichtigung 🔔                        │
└─────────────────────────────────────────────────────────┘
```

## Voraussetzungen

### 1. Spec mit User Stories

Ein Spec muss existieren mit `user-stories.md`:
```
specwright/specs/2026-01-13-feature-name/
├── user-stories.md    # Required
├── spec.md            # Optional
└── technical-spec.md  # Optional
```

### 2. Claude Code CLI

Claude Code muss installiert und konfiguriert sein:
```bash
# Prüfen ob installiert
claude --version

# API-Key muss konfiguriert sein
```

### 3. Git Repository

Das Projekt muss ein Git Repository sein:
```bash
git status  # Sollte funktionieren
```

## Konfiguration

### Script-Variablen

Im Script können folgende Variablen angepasst werden:

```bash
SPECS_DIR="specwright/specs"    # Pfad zu Specs
MAX_ITERATIONS=50             # Safety-Limit
DELAY_BETWEEN_PHASES=2        # Sekunden zwischen Phasen
```

### Claude Code Optionen

Das Script verwendet:
```bash
claude -p "/execute-tasks $spec" \
    --dangerously-skip-permissions \
    --model sonnet
```

- `-p`: Print mode (non-interactive)
- `--dangerously-skip-permissions`: Keine Permission-Prompts
- `--model sonnet`: Schnelleres Modell (kann auf `opus` geändert werden)

## Logs

Jede Phase wird geloggt:
```bash
# Logs ansehen
cat /tmp/claude-phase-1.log
cat /tmp/claude-phase-2.log
# ...

# Alle Logs durchsuchen
grep -l "ERROR" /tmp/claude-phase-*.log

# Live mitverfolgen (in separatem Terminal)
tail -f /tmp/claude-phase-*.log
```

## Troubleshooting

### Script stoppt nicht

**Problem:** Script läuft endlos weiter.

**Lösung:**
- Prüfen ob `kanban-board.md` korrekt aktualisiert wird
- Current Phase muss auf "complete" gesetzt werden
- Safety-Limit (50 Iterationen) greift automatisch

```bash
# Manuell prüfen
cat specwright/specs/*/kanban-board.md | grep "Current Phase"
```

### Claude Code Fehler

**Problem:** Claude Code bricht mit Fehler ab.

**Lösung:**
- Log der letzten Phase prüfen: `cat /tmp/claude-phase-N.log`
- Script neu starten (resumed automatisch)

### Permission Errors

**Problem:** Claude fragt nach Permissions.

**Lösung:**
- `--dangerously-skip-permissions` ist bereits gesetzt
- Prüfen ob Claude Code korrekt konfiguriert ist

## Best Practices

### 1. Vor dem Start prüfen

```bash
# Spec existiert?
ls specwright/specs/

# User Stories vorhanden?
cat specwright/specs/*/user-stories.md | head -20

# Git Status clean?
git status
```

### 2. Im Hintergrund laufen lassen

```bash
# Mit nohup (läuft weiter nach Terminal-Schließung)
nohup ./specwright/scripts/auto-execute.sh > auto-execute.log 2>&1 &

# Mit screen
screen -S auto-execute
./specwright/scripts/auto-execute.sh
# Ctrl+A, D zum Detachen
# screen -r auto-execute zum Wiederverbinden
```

### 3. Fortschritt überwachen

```bash
# In separatem Terminal
watch -n 5 'cat specwright/specs/*/kanban-board.md | grep -A5 "Resume Context"'
```

## Beispiel: Kompletter Durchlauf

```bash
# 1. Spec erstellen (manuell oder via /create-spec)
# specwright/specs/2026-01-13-user-auth/ existiert mit user-stories.md

# 2. Script starten
./specwright/scripts/auto-execute.sh 2026-01-13-user-auth

# Output:
# [INFO] === Automated Story Execution ===
# [INFO] Starting automated execution...
# [SUCCESS] Using spec: 2026-01-13-user-auth
# [INFO] === Iteration 1 ===
# [INFO] Current Phase: no-board
# [INFO] Progress: 0/0 stories
# [INFO] Starting Phase (Iteration 1)...
# ... Claude Code läuft ...
# [INFO] Waiting 2s before next phase...
# [INFO] === Iteration 2 ===
# [INFO] Current Phase: 1-complete
# ... etc ...
# [SUCCESS] === All phases complete! ===
# [SUCCESS] Spec execution finished successfully.
# 🔔 (Sound)
```

## Siehe auch

- [Story Sizing Guidelines](story-sizing-guidelines.md) - Wie Stories für Automation optimiert werden
- [Execute Tasks Workflow](../workflows/core/execute-tasks.md) - Details zum phasenbasierten Workflow
