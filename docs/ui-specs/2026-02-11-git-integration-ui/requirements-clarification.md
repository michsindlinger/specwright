# Requirements Clarification - Git Integration UI

**Created:** 2026-02-11
**Status:** Pending User Approval

## Feature Overview
Eine Git-Informationsleiste direkt unterhalb der Projekt-Tabs, die den aktuellen Branch, Ahead/Behind-Status und geanderte Dateien anzeigt. Nutzer konnen Branches wechseln, Commits erstellen (mit Datei-Auswahl), sowie Pull und Push direkt aus der Web UI ausfuehren.

## Target Users
Entwickler, die Agent OS Web UI nutzen und ihre Git-Workflows direkt in der Anwendung verwalten moechten, ohne in ein separates Terminal oder Git-Client wechseln zu muessen.

## Business Value
- Reduziert Context-Switching zwischen Web UI und Terminal/Git-Client
- Beschleunigt den taeglichen Git-Workflow (Status pruefen, committen, pushen)
- Macht den aktuellen Git-Status des Projekts jederzeit sichtbar
- Ergaenzt die bestehende Projekt-Tab-Navigation um essentielle Entwickler-Informationen

## Functional Requirements

### FR-1: Git-Status-Leiste (permanent sichtbar)
- Neue Zeile direkt unterhalb der Projekt-Tabs
- Zeigt an:
  - **Aktueller Branch-Name** (z.B. `main`, `feature/login`)
  - **Ahead/Behind-Info** (z.B. `2 ↑ 3 ↓` - 2 Commits voraus, 3 hinterher)
  - **Anzahl geaenderter Dateien** (z.B. `5 changed`)
  - **Action-Buttons:** Pull, Push, Commit, Refresh

### FR-2: Branch-Wechsel
- Dropdown/Select-Element im Branch-Bereich der Status-Leiste
- Zeigt alle **lokalen Branches** an
- Wechsel per Klick auf einen Branch
- **Schutz:** Wenn uncommitted Changes vorhanden sind, wird der Wechsel blockiert und eine Warnung angezeigt ("Bitte lokale Aenderungen erst committen oder verwerfen")
- Kein Erstellen neuer Branches

### FR-3: Commit-Dialog (Modal)
- Oeffnet sich bei Klick auf "Commit"-Button
- Inhalt:
  - **Dateiliste** mit Checkboxen zur Einzelauswahl (nicht alle auf einmal)
  - **Commit-Message-Feld** (Textfeld/Textarea)
  - **Commit-Button** zum Ausfuehren
  - **Abbrechen-Button** zum Schliessen
- Keine Diff-Ansicht noetig
- Dateien zeigen Status an (modified, added, deleted, untracked)

### FR-4: Pull & Push
- **Pull-Button:** Fuehrt `git pull` aus
- **Pull mit Rebase:** Option fuer `git pull --rebase`
- **Push-Button:** Fuehrt `git push` aus
- Kein Force-Push
- Bei **Merge-Konflikten:** Fehlermeldung anzeigen mit Hinweis, dass Konflikte ausserhalb der Anwendung geloest werden muessen

### FR-5: Refresh
- Manueller Refresh-Button in der Status-Leiste
- Kein automatisches Polling
- Aktualisiert: Branch-Info, Ahead/Behind, Changed Files Count

### FR-6: Kein Git-Repository
- Wenn das ausgewaehlte Projekt kein Git-Repository hat (kein `.git`-Ordner):
  - Git-Status-Leiste wird **nicht angezeigt**
  - Stattdessen: Dezente Info-Meldung "Kein Git-Repository erkannt"

## Affected Areas & Dependencies
- **Projekt-Tab-Bereich (Frontend)** - Neue Zeile unterhalb der bestehenden Tabs
- **Backend API** - Neue Endpoints fuer Git-Operationen (status, branch, commit, pull, push)
- **WebSocket** - Optional fuer Feedback waehrend laufender Git-Operationen
- **Bestehende Projekt-Verwaltung** - Muss den Projekt-Pfad an die Git-API liefern

## Edge Cases & Error Scenarios
- **Kein Git-Repo:** Status-Leiste ausblenden, Info anzeigen
- **Uncommitted Changes bei Branch-Wechsel:** Wechsel blockieren, Warnung anzeigen
- **Merge-Konflikte bei Pull:** Fehlermeldung anzeigen, Hinweis auf externe Loesung
- **Push ohne Remote:** Fehlermeldung "Kein Remote-Repository konfiguriert"
- **Kein Network/Remote nicht erreichbar:** Timeout-Handling, Fehlermeldung
- **Leere Commit-Message:** Commit-Button deaktiviert, wenn Message leer
- **Keine Dateien ausgewaehlt:** Commit-Button deaktiviert, wenn keine Dateien selektiert
- **Git-Operation laeuft bereits:** Buttons deaktivieren waehrend einer laufenden Operation
- **Sehr viele geaenderte Dateien:** Scrollbare Dateiliste im Commit-Dialog

## Security & Permissions
- Git-Operationen laufen lokal auf dem System des Nutzers
- Keine zusaetzliche Authentifizierung noetig (nutzt bestehende Git-Konfiguration)
- SSH-Keys/Credentials werden vom System-Git verwaltet
- Kein Force-Push moeglich (Schutz vor Datenverlust)

## Performance Considerations
- Git-Status-Abfragen sollten nicht blockierend sein (async)
- Kein automatisches Polling (nur manueller Refresh) - spart Ressourcen
- Commit-Dialog laedt Dateiliste on-demand beim Oeffnen

## Scope Boundaries

**IN SCOPE:**
- Git-Status-Leiste mit Branch, Ahead/Behind, Changed Files
- Branch-Wechsel (nur lokale Branches, Dropdown)
- Commit-Dialog mit Datei-Auswahl und Message
- Pull (normal + rebase)
- Push (normal, kein Force)
- Manueller Refresh
- Error-Handling fuer typische Git-Fehler
- Merge-Konflikt-Erkennung (nur Anzeige)

**OUT OF SCOPE:**
- Neue Branches erstellen
- Remote-Branches auschecken
- Force-Push
- Diff-Ansicht (Datei-Inhalte vergleichen)
- Merge-Konflikt-Loesung in der UI
- Automatisches Polling / Auto-Refresh
- Git-Log / Commit-Historie anzeigen
- Stash-Funktionalitaet
- Git-Blame / File-History
- Cherry-Pick, Revert, Reset

## Open Questions
- Keine offenen Fragen - alle Anforderungen geklaert.

## Proposed User Stories (High Level)
1. **Git-Status Backend API** - Backend-Endpoints fuer Git-Operationen (status, branches, commit, pull, push)
2. **Git-Status-Leiste (Frontend)** - Neue UI-Komponente unterhalb der Projekt-Tabs mit Branch, Status, Buttons
3. **Branch-Wechsel** - Dropdown mit lokalen Branches, Wechsel-Logik, Uncommitted-Changes-Schutz
4. **Commit-Dialog** - Modal mit Dateiliste, Checkboxen, Message-Feld, Commit-Ausfuehrung
5. **Pull & Push Operationen** - Pull (normal/rebase), Push, Error-Handling, Merge-Konflikt-Anzeige
6. **Integration & Fehlerbehandlung** - Kein-Git-Repo-Erkennung, Loading-States, Error-States

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
