# Test-Szenarien: Git Integration UI

> Generiert am 2026-02-11 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-11-git-integration-ui

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI fuer automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung laeuft lokal (`npm run dev:backend` und `npm run dev:ui`)
- [ ] Git ist auf dem System installiert
- [ ] Ein Projekt mit Git-Repository ist geoeffnet

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Git Remote | Beliebiges GitHub/GitLab Repo | Fuer Pull/Push Tests wird ein Remote benoetigt |
| Testprojekt | Lokales Git-Repository | Mindestens 2 Branches, einige geaenderte Dateien |

---

## Test-Szenarien

### Szenario 1: GIT-001 - Git Backend API

**Beschreibung:** Validierung der Backend-API fuer Git-Operationen ueber WebSocket

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Projekt mit Git-Repository oeffnen | WebSocket-Verbindung wird hergestellt |
| 2 | Git-Status ueber UI anfordern (Refresh) | Backend liefert Branch-Name, Ahead/Behind-Zaehler, geaenderte Dateien |
| 3 | Branch-Liste anfordern | Backend liefert alle lokalen Branches mit Markierung des aktuellen Branch |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Kein Git-Repository | Projekt ohne `.git`-Ordner oeffnen | Info-Meldung "Kein Git-Repository erkannt" |
| Git nicht installiert | Git CLI nicht im PATH | Fehlermeldung "Git nicht gefunden" |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Merge-Konflikt | Pull mit kollidierenden Aenderungen | "Konflikte muessen ausserhalb der Anwendung geloest werden" |
| Timeout | Git-Befehl dauert > 10 Sekunden | Timeout-Fehlermeldung |

---

### Szenario 2: GIT-002 - Git Status-Leiste

**Beschreibung:** Validierung der Git Status-Leiste unterhalb der Projekt-Tabs

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Projekt mit Git-Repository oeffnen | Status-Leiste erscheint unterhalb der Projekt-Tabs |
| 2 | Branch-Name pruefen | Aktueller Branch-Name wird angezeigt |
| 3 | Ahead/Behind pruefen | Ahead-Zaehler (Pfeil hoch) und Behind-Zaehler (Pfeil runter) werden angezeigt |
| 4 | Changed Files pruefen | Anzahl geaenderter Dateien wird angezeigt |
| 5 | Action Buttons pruefen | Buttons fuer Pull, Push, Commit und Refresh sind sichtbar |
| 6 | Refresh-Button klicken | Git-Status wird neu geladen, Anzeige aktualisiert |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Kein Git-Repository | Projekt ohne Git oeffnen | Keine Status-Leiste, dezente Info-Meldung |
| Loading-State | Waehrend Git-Abfrage | Loading-Zustand angezeigt, Buttons deaktiviert |
| Projektwechsel | Von Projekt A zu Projekt B wechseln | Status-Leiste zeigt Branch und Zaehler von Projekt B |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| WebSocket-Verbindung unterbrochen | Netzwerkausfall | Status-Leiste zeigt Fehler-/Offline-Zustand |

---

### Szenario 3: GIT-003 - Branch-Wechsel

**Beschreibung:** Validierung des Branch-Wechsels ueber das Dropdown in der Status-Leiste

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Auf Branch-Namen in der Status-Leiste klicken | Dropdown mit allen lokalen Branches oeffnet sich |
| 2 | Aktuellen Branch im Dropdown pruefen | Aktueller Branch ist visuell hervorgehoben |
| 3 | Anderen Branch im Dropdown auswaehlen (ohne uncommitted changes) | Branch wechselt, Status-Leiste zeigt neuen Branch, Zaehler aktualisiert |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Uncommitted Changes | Branch-Wechsel mit lokalen Aenderungen | Warnung "Bitte lokale Aenderungen erst committen oder verwerfen", Branch bleibt |
| Nur ein Branch | Nur "main" vorhanden | Dropdown mit einem nicht-klickbaren Eintrag |
| Branch-Wechsel fehlgeschlagen | Git meldet Fehler | Fehlermeldung angezeigt, auf aktuellem Branch bleiben |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Checkout-Fehler | Git checkout schlaegt fehl | Git-Fehlermeldung wird angezeigt |

---

### Szenario 4: GIT-004 - Commit-Dialog

**Beschreibung:** Validierung des Commit-Dialogs mit Dateiauswahl und Status-Badges

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Commit-Button in der Status-Leiste klicken | Modal-Dialog oeffnet sich |
| 2 | Dateiliste pruefen | Alle geaenderten Dateien mit Checkboxen und Status-Badges (modified, added, deleted, untracked) |
| 3 | 2 Dateien per Checkbox auswaehlen | Genau 2 Dateien sind ausgewaehlt |
| 4 | Commit-Message "fix: update routing" eingeben | Commit-Button wird aktiviert |
| 5 | Commit-Button klicken | Commit wird ausgefuehrt, Dialog schliesst sich, Status-Leiste aktualisiert |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Keine Datei ausgewaehlt | Nur Message eingegeben | Commit-Button bleibt deaktiviert |
| Keine Message | Dateien ausgewaehlt, leere Message | Commit-Button bleibt deaktiviert |
| Dialog abbrechen | Dateien + Message eingegeben, "Abbrechen" klicken | Dialog schliesst sich, kein Commit |
| Viele Dateien | 50+ geaenderte Dateien | Dateiliste ist scrollbar |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Commit fehlgeschlagen | Technischer Git-Fehler | Fehlermeldung im Dialog, Dialog bleibt offen |

---

### Szenario 5: GIT-005 - Pull, Push und Fehlerbehandlung

**Beschreibung:** Validierung von Pull/Push-Operationen inkl. Rebase-Option und Error Handling

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Pull-Button klicken (3 neue Commits auf Remote) | Pull wird ausgefuehrt, "0 behind" angezeigt, Erfolgsmeldung "Pull erfolgreich: 3 Commits" |
| 2 | Pull mit Rebase-Option waehlen | `git pull --rebase` wird ausgefuehrt, Status aktualisiert |
| 3 | Push-Button klicken (2 lokale Commits) | Push wird ausgefuehrt, "0 ahead" angezeigt, Erfolgsmeldung "Push erfolgreich: 2 Commits" |
| 4 | Waehrend Operation: Buttons pruefen | Alle Git-Buttons (Pull, Push, Commit, Refresh) sind deaktiviert, Loading-Indikator sichtbar |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Nichts zum Pullen | Keine neuen Remote-Commits | Info-Meldung "Bereits aktuell" |
| Nichts zum Pushen | Keine lokalen unpushed Commits | Info-Meldung "Nichts zum Pushen - alles aktuell" |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Merge-Konflikt | Pull mit kollidierenden Aenderungen | "Merge-Konflikte erkannt" + "Bitte Konflikte ausserhalb der Anwendung loesen" |
| Kein Remote | Push ohne Remote-Konfiguration | "Kein Remote-Repository konfiguriert" |
| Netzwerk nicht erreichbar | Remote nicht erreichbar | "Remote nicht erreichbar" nach Timeout |

---

## Regressions-Checkliste

Bestehende Funktionalitaet, die nach der Implementierung noch funktionieren muss:

- [ ] Projekt-Tabs - Projektwechsel funktioniert weiterhin
- [ ] Chat-View - Chat-Funktionalitaet unbeeintraechtigt
- [ ] Cloud Terminal - Terminal-Sessions funktionieren weiterhin
- [ ] Dashboard - Dashboard-Ansicht funktioniert weiterhin
- [ ] WebSocket-Verbindung - Bestehende WebSocket-Kommunikation funktioniert weiterhin

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
Git Status Bar: aos-git-status-bar (Custom Element)
Git Commit Dialog: aos-git-commit-dialog (Custom Element)
Branch-Dropdown: .git-branch-dropdown (CSS Klasse)
Pull-Button: Button mit "Pull" Text in aos-git-status-bar
Push-Button: Button mit "Push" Text in aos-git-status-bar
Commit-Button: Button mit "Commit" Text in aos-git-status-bar
Refresh-Button: Button mit Refresh-Icon in aos-git-status-bar
```

### API-Endpunkte
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| WebSocket `git:status` | WS Message | Git-Status abfragen |
| WebSocket `git:branches` | WS Message | Branch-Liste abfragen |
| WebSocket `git:commit` | WS Message | Commit ausfuehren |
| WebSocket `git:pull` | WS Message | Pull ausfuehren |
| WebSocket `git:push` | WS Message | Push ausfuehren |
| WebSocket `git:checkout` | WS Message | Branch wechseln |

### Mock-Daten
```json
{
  "gitStatus": {
    "branch": "feature/login",
    "ahead": 2,
    "behind": 1,
    "changedFiles": [
      { "path": "src/app.ts", "status": "modified" },
      { "path": "src/new-file.ts", "status": "added" },
      { "path": "src/old-file.ts", "status": "deleted" }
    ]
  }
}
```

---

## Notizen

- Alle Git-Operationen laufen ueber den Backend-Server via WebSocket, nicht direkt im Browser
- Die Git-Integration nutzt `execFile` statt `exec` fuer Sicherheit (keine Shell-Injection moeglich)
- Timeout fuer alle Git-Operationen: 10 Sekunden
- Pre-existierende TS-Fehler in `chat-view.ts` und `dashboard-view.ts` sind NICHT git-bezogen und koennen ignoriert werden
