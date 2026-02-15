# Requirements Clarification - Git Integration Erweitert

**Created:** 2026-02-11
**Status:** Pending User Approval

## Feature Overview
Erweiterung der bestehenden Git Integration UI um Datei-Management (Revert/Delete), PR-Anzeige und einen "Alles committen und pushen"-Workflow.

## Target Users
Developer - Nutzer der Agent OS Web UI, die direkt aus der Webanwendung heraus Git-Operationen durchführen.

## Business Value
Developer können ihren kompletten Git-Workflow innerhalb der Web UI abschließen, ohne zwischen Terminal und UI wechseln zu müssen. Revert und Delete reduzieren manuelle Fehler, die PR-Anzeige gibt sofortigen Kontext, und "Commit & Push" beschleunigt den häufigsten Workflow.

## Functional Requirements

### FR1: Dateien reverten (Revert)
- Geänderte Dateien (modified, staged) können einzeln revertiert werden
- Ein "Alle reverten" Button ermöglicht Batch-Revert aller geänderten Dateien
- Revert-Aktion setzt die Datei auf den letzten Commit-Stand zurück
- Für staged Dateien: erst unstage, dann revert
- Revert-Icons/-Buttons erscheinen neben jeder Datei im **bestehenden Commit-Dialog**

### FR2: Untracked Dateien löschen (Delete)
- Untracked (neue, nicht-getrackete) Dateien können einzeln gelöscht werden
- Vor dem Löschen erscheint ein Bestätigungs-Dialog ("Bist du sicher?")
- Delete-Icons/-Buttons erscheinen neben untracked Dateien im **bestehenden Commit-Dialog**

### FR3: PR-Anzeige in der Status-Leiste
- Falls ein Pull Request für den aktuellen Branch existiert, wird ein PR-Badge in der Git Status-Leiste angezeigt
- Badge zeigt: PR-Nummer und Status (z.B. "#42 Open", "#42 Merged")
- Klick auf den Badge öffnet den PR im Browser (GitHub-URL)

### FR4: "Alles committen und pushen" Button
- Neuer Button in der Git Status-Leiste: "Commit & Push"
- Öffnet den bestehenden Commit-Dialog mit allen Dateien vorausgewählt
- User gibt Commit-Message ein
- Nach dem Commit wird automatisch ein Push ausgeführt
- Fortschrittsanzeige während commit + push

## Affected Areas & Dependencies
- **aos-git-status-bar.ts** - Neuer "Commit & Push" Button, PR-Badge Anzeige
- **aos-git-commit-dialog.ts** - Revert/Delete Icons pro Datei, "Alle reverten" Button, Auto-Push nach Commit
- **git.protocol.ts** - Neue Message-Typen für revert, delete, PR-Info
- **git.service.ts** - Neue Backend-Methoden: revert, delete untracked, PR-Info abrufen
- **git.handler.ts** - Neue Handler für revert, delete, PR-Info Messages
- **Bestehende Git Integration Spec** (2026-02-11-git-integration-ui) - Basis auf der aufgebaut wird

## Edge Cases & Error Scenarios
- **Revert einer Datei mit Merge-Konflikten** - Fehlermeldung anzeigen, nicht silent failen
- **Löschen einer Datei die gerade in Bearbeitung ist** - Bestätigungs-Dialog warnt
- **Kein PR für den Branch vorhanden** - PR-Badge wird nicht angezeigt (kein leerer Platzhalter)
- **PR existiert aber GitHub API nicht erreichbar** - Graceful degradation, Badge nicht anzeigen
- **Push nach Commit schlägt fehl** - Commit war erfolgreich, Push-Fehler separat anzeigen mit Retry-Option
- **Revert aller Dateien bei leerem Working Directory** - Button disabled wenn keine Änderungen
- **Untracked Datei in einem neuen Verzeichnis** - Nur die Datei löschen, nicht das Verzeichnis

## Security & Permissions
- Revert und Delete sind destruktive Operationen - Bestätigungsdialoge erforderlich
- PR-Info wird über `gh` CLI oder GitHub API abgerufen (lokale Authentifizierung wird vorausgesetzt)
- Keine zusätzlichen Berechtigungen nötig (nutzt bestehende Git-Konfiguration)

## Performance Considerations
- PR-Info kann gecacht werden (nicht bei jedem Status-Refresh neu abfragen)
- Revert/Delete sind schnelle lokale Operationen
- "Commit & Push" ist ein sequentieller Workflow (erst commit, dann push) - Fortschrittsanzeige nötig

## Scope Boundaries
**IN SCOPE:**
- Einzelne Dateien reverten im Commit-Dialog
- "Alle reverten" Button im Commit-Dialog
- Einzelne untracked Dateien löschen im Commit-Dialog (mit Bestätigung)
- PR-Badge in der Status-Leiste (Nummer + Status + Link)
- "Commit & Push" Button in der Status-Leiste
- Automatischer Push nach erfolgreichem Commit

**OUT OF SCOPE:**
- Partial revert (einzelne Hunks/Zeilen einer Datei)
- PR erstellen aus der UI
- PR-Reviews anzeigen oder kommentieren
- Merge-Konflikt-Resolution UI
- Interaktives Rebase
- Stash-Funktionalität

## Open Questions
- Keine offenen Fragen

## Proposed User Stories (High Level)
1. **Git Backend Erweiterung** - Neue Backend-Methoden für revert, delete und PR-Info
2. **Datei-Aktionen im Commit-Dialog** - Revert/Delete Icons und "Alle reverten" im bestehenden Dialog
3. **PR-Anzeige in Status-Leiste** - PR-Badge mit Nummer, Status und Link
4. **Commit & Push Workflow** - Neuer Button und Auto-Push nach Commit

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
