# User-Todos: Git Integration Erweitert

> Generiert am 2026-02-11
> Spec: agent-os/specs/2026-02-11-git-integration-erweitert

## Zweck

Diese Checkliste enthält Aufgaben, die **manuell vom Benutzer** erledigt werden müssen, damit das Feature vollständig funktioniert. Diese Aufgaben konnten während der Implementierung nicht automatisch durchgeführt werden.

---

## Kritisch (vor Nutzung erforderlich)

Diese Aufgaben müssen erledigt werden, **bevor** das Feature verwendet werden kann:

_Keine kritischen Todos - alle Features funktionieren ohne manuelle Konfiguration._

---

## Wichtig (für Produktion erforderlich)

Diese Aufgaben sollten vor dem Produktiv-Deployment erledigt werden:

- [ ] **gh CLI installieren und authentifizieren**
  - Beschreibung: Das `gh` CLI Tool muss installiert und mit einem GitHub-Account authentifiziert sein, damit der PR-Badge in der Status-Leiste funktioniert
  - Grund: PR-Info wird via `gh pr view --json` abgerufen, was eine lokale Installation erfordert
  - Hinweis: Installation: `brew install gh` (macOS), dann `gh auth login`
  - Story: GITE-001, GITE-003

---

## Optional (Empfohlen)

Diese Aufgaben sind empfohlen, aber nicht zwingend erforderlich:

- [ ] **Tastenkürzel für "Commit & Push" konfigurieren**
  - Beschreibung: Ein Tastenkürzel für den häufig genutzten "Commit & Push" Workflow einrichten
  - Grund: Beschleunigt den häufigsten Git-Workflow
  - Hinweis: Kann in den App-Einstellungen konfiguriert werden
  - Story: GITE-004

---

## Kategorien

### Externe Services
- [ ] GitHub CLI (`gh`) installiert und authentifiziert (für PR-Badge Feature)

### Dokumentation
- [ ] Team über neue Git-Features informieren (Revert, Delete, PR-Badge, Commit & Push)

---

## Bekannte Limitationen

Diese Limitationen sind by-design und keine Bugs:

| Limitation | Beschreibung | Workaround |
|------------|-------------|------------|
| Kein Partial Revert | Dateien können nur komplett revertiert werden, nicht zeilenweise | Git CLI für selektives Reverten nutzen |
| Kein PR-Create | Es kann kein neuer PR aus der UI erstellt werden | GitHub UI oder `gh pr create` nutzen |
| PR-Cache 60s | PR-Info wird 60 Sekunden gecacht | Seite neu laden für sofortiges Update |
| Nur aktueller Branch | PR-Info wird nur für den aktuellen Branch angezeigt | Branch wechseln für andere PR-Infos |

---

## Erledigte Aufgaben

Hier zur Nachverfolgung bereits erledigte Aufgaben:

_Noch keine erledigten Aufgaben._

---

## Notizen

- Alle neuen Git-Features funktionieren über WebSocket-Kommunikation und erfordern eine aktive Verbindung zum Backend
- Der Revert-Mechanismus nutzt `git checkout -- <file>` und `git reset HEAD -- <file>`, was identisch zum manuellen Git-Revert ist
- Das Delete-Feature löscht nur untracked Dateien und schützt tracked Dateien vor versehentlichem Löschen
