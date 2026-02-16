# Requirements Clarification - Branch-per-Story Backlog

**Created:** 2026-02-16
**Status:** Pending User Approval

## Feature Overview
Beim Ausführen von Backlog Stories im Auto-Modus (UI Kanban Board) soll pro Story automatisch ein separater Feature Branch von `main` erstellt werden, die Story darauf ausgeführt, ein PR erstellt und dann zurück auf `main` gewechselt werden, bevor die nächste Story startet.

## Target Users
Senior Software Developers & Architects, die Specwright im UI nutzen und mehrere unabhängige Backlog-Stories automatisiert abarbeiten lassen.

## Business Value
Backlog Stories sind thematisch unabhängig (im Gegensatz zu Spec Stories, die zusammengehören). Durch Branch-per-Story wird jede Änderung isoliert, reviewbar und einzeln mergebar. Dies ermöglicht sauberes Git-Management auch bei autonomer Batch-Ausführung mehrerer unzusammenhängender Stories.

## Functional Requirements

1. **Branch-Erstellung pro Story**: Wenn der Auto-Modus auf dem Backlog Kanban Board aktiv ist, wird vor jeder Story-Ausführung ein neuer Branch `feature/{story-slug}` von `main` erstellt.

2. **Automatischer PR pro Story**: Nach erfolgreicher Story-Ausführung wird automatisch ein Pull Request erstellt (nicht gemergt).

3. **Automatischer Wechsel zurück auf Main**: Nach Story-Abschluss + PR-Erstellung wird automatisch auf `main` zurückgewechselt.

4. **Fehlerbehandlung - Skip & Continue**: Wenn eine Story fehlschlägt, wird sie übersprungen und die nächste Story gestartet. Der angefangene Branch und eventueller PR bleiben bestehen.

5. **Keine Git-Strategie-Abfrage**: Beim Backlog Board wird immer die Branch-Strategie verwendet (kein Worktree, kein Current-Branch). Keine User-Abfrage nötig.

6. **Keine System Stories**: System Stories (997, 998, 999) gibt es nur bei Specs, nicht beim Backlog.

7. **PR-Merge nicht erforderlich**: Der nächste Story-Branch kann erstellt werden, auch wenn der vorherige PR noch nicht gemergt ist.

## Affected Areas & Dependencies

- **Execute-Tasks Workflow (Backlog-Pfad)** - Hauptänderung: Branch-Lifecycle pro Story integrieren
- **Backend WebSocket / Claude SDK** - Story-Execution-Loop muss Branch-Erstellung/Wechsel handhaben
- **Kanban MCP Tool / kanban.json** - Speicherung der Git-Info pro Story (nicht pro Spec)
- **UI Backlog Kanban Board** - Auto-Toggle existiert bereits, keine UI-Änderung nötig

## Edge Cases & Error Scenarios

- **Story schlägt fehl** - Branch bleibt bestehen, Story wird übersprungen, nächste Story startet auf neuem Branch von `main`
- **Branch existiert bereits** - Wenn `feature/{story-slug}` schon existiert (z.B. von vorherigem fehlgeschlagenem Run), soll ein sinnvolles Handling stattfinden (z.B. Branch wiederverwenden oder Suffix anhängen)
- **Main hat sich verändert** - Da immer von `main` abgezweigt wird, basiert jede Story auf dem aktuellen Stand von `main` (kein `git pull` zwischen Stories, da PR-Merge nicht vorausgesetzt)
- **Leerer Backlog** - Auto-Mode stoppt wenn keine Stories mehr "Ready" sind
- **Uncommitted Changes auf Main** - Vor Branch-Erstellung prüfen ob Working Directory clean ist

## Security & Permissions
- Keine besonderen Sicherheitsanforderungen - nutzt bestehende Git-Credentials
- Branch-Push und PR-Erstellung nutzen bestehende `gh` CLI Authentifizierung

## Performance Considerations
- Branch-Wechsel zwischen Stories ist schnell (< 1 Sekunde)
- Kein Performance-Impact auf die Story-Ausführung selbst
- PR-Erstellung via `gh pr create` ist asynchron und blockiert nicht

## Scope Boundaries

**IN SCOPE:**
- Branch-per-Story Logik im execute-tasks Backlog-Pfad
- Automatische PR-Erstellung pro Story
- Branch-Wechsel zurück auf `main` nach jeder Story
- Fehlerbehandlung (Skip & Continue)
- Branch-Naming: `feature/{story-slug}`

**OUT OF SCOPE:**
- Änderungen am Spec-Execution-Flow (bleibt wie bisher: ein Branch pro Spec)
- UI-Änderungen (Auto-Toggle existiert bereits)
- CLI-Unterstützung (nur UI-Feature)
- Automatisches PR-Merging
- Worktree-Strategie für Backlog
- System Stories (997-999) für Backlog

## Open Questions (if any)
- Keine offenen Fragen - alle Aspekte geklärt

## Proposed User Stories (High Level)

1. **Branch-Lifecycle pro Story** - Implementierung der Branch-Erstellung, PR-Erstellung und Wechsel zurück auf `main` im Backlog-Execution-Flow
2. **Skip & Continue bei Fehlern** - Fehlerbehandlung: Story überspringen, Branch behalten, nächste Story auf neuem Branch starten
3. **Backlog Git-Strategie Festlegung** - Backlog nutzt immer Branch-Strategie (kein User-Prompt, keine Worktree-Option)

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
