# Requirements Clarification: AgentOS Extended Setup Wizard

> Created: 2026-02-13
> Status: Draft
> Author: PO (dev-team__po)

## 1. Feature Overview

**Feature Name:** AgentOS Extended Setup Wizard
**Location:** Settings-Bereich (neuer Tab "Setup" in der bestehenden Settings-View)

Agent OS Web UI basiert auf AgentOS Extended. Damit ein Projekt vollstaendig funktioniert, muss AgentOS Extended installiert und ein Entwicklungsteam konfiguriert sein. Aktuell erfolgt dies manuell ueber drei Curl-Commands und einen Claude Code Slash-Command. Dieses Feature bietet einen gefuehrten Step-by-Step Wizard innerhalb der Settings-View, der alle Installationsschritte ausfuehrt und den Status pro Schritt anzeigt.

## 2. Problem Statement

- Benutzer muessen aktuell manuell drei Curl-Commands in einem Terminal ausfuehren
- Es gibt keine visuelle Rueckmeldung ueber den Installationsstatus
- Neue Benutzer wissen nicht, welche Schritte noetig sind
- Das DevTeam-Setup erfordert Kenntnis des internen `/agent-os:build-development-team` Commands
- Es gibt keine zentrale Stelle, um den Installationsstatus eines Projekts zu pruefen

## 3. Anforderungen

### 3.1 Settings-Tab "Setup"

- Neuer Tab "Setup" in der bestehenden `aos-settings-view` Komponente
- Tab wird in die bestehende Tab-Navigation eingefuegt (neben Models, General, Appearance)
- Deep-Link: `#/settings/setup`
- Der Tab zeigt einen Step-by-Step Wizard mit 4 Schritten

### 3.2 Installations-Schritte (Wizard)

| Schritt | Name | Command | Beschreibung |
|---------|------|---------|-------------|
| 1 | Base Installation | `curl -sSL https://raw.githubusercontent.com/michsindlinger/agent-os-extended/main/setup.sh \| bash` | Installiert AgentOS Extended Grundstruktur ins Projekt |
| 2 | Claude Code Setup | `curl -sSL https://raw.githubusercontent.com/michsindlinger/agent-os-extended/main/setup-claude-code.sh \| bash` | Installiert Claude-Code-spezifische Dateien und Konfiguration |
| 3 | DevTeam Global | `curl -sSL https://raw.githubusercontent.com/michsindlinger/agent-os-extended/main/setup-devteam-global.sh \| bash` | Installiert globale DevTeam-Dateien im Home-Verzeichnis |
| 4 | Build Development Team | Cloud Terminal: `/agent-os:build-development-team` | Erstellt das projektspezifische Entwicklungsteam via Claude Code Session |

### 3.3 Status-Erkennung (pro Schritt)

Das System soll beim Laden der Setup-Seite automatisch pruefen, ob die einzelnen Schritte bereits ausgefuehrt wurden:

- **Schritt 1 (Base):** Pruefen ob `.agent-os/` Verzeichnis im Projektordner existiert (mit typischen Unterordnern/Dateien)
- **Schritt 2 (Claude Code):** Pruefen ob `CLAUDE.md` und `.agent-os/standards/` im Projekt existieren
- **Schritt 3 (DevTeam Global):** Pruefen ob `~/.agent-os/` globale Dateien existieren (z.B. `~/.agent-os/standards/`)
- **Schritt 4 (DevTeam):** Pruefen ob `agent-os/team/` Verzeichnis im Projekt existiert und nicht leer ist

Status pro Schritt:
- `not_installed` - Noch nicht ausgefuehrt
- `installed` - Bereits installiert (gruener Haken)
- `running` - Aktuell in Ausfuehrung (Spinner + Live-Output)
- `error` - Fehler bei der Ausfuehrung (roter Indikator + Fehlermeldung)

### 3.4 Execution-Mechanismus

**Schritte 1-3 (Curl-Commands):**
- Backend fuehrt Curl-Commands als Shell-Prozesse aus
- Ausfuehrung im Projektverzeichnis des aktuell ausgewaehlten Projekts
- Live-Output wird per WebSocket an das Frontend gestreamt
- Fortschrittsanzeige mit Terminal-Output im UI
- Bei Fehler: Fehlermeldung anzeigen, Moeglichkeit zum Retry

**Schritt 4 (Build Development Team):**
- Oeffnet eine Cloud Terminal Session (Claude Code)
- Sendet `/agent-os:build-development-team` als initialen Prompt
- Benutzer sieht den Live-Output der Claude Code Session
- Nach Abschluss kann der Benutzer die Session schliessen und zum Wizard zurueckkehren

### 3.5 UX/Wizard-Flow

```
Settings > Setup Tab
+-------------------------------------------------------+
|  AgentOS Extended Setup                                |
|                                                        |
|  Step 1: Base Installation          [Installed]  |
|  Step 2: Claude Code Setup          [Installed]  |
|  Step 3: DevTeam Global             [Not Installed]   |
|  Step 4: Build Development Team     [Not Installed]   |
|                                                        |
|  [Install Step 3]                                      |
|                                                        |
|  --- Live Output ---                                   |
|  > Downloading setup-devteam-global.sh...              |
|  > Installing global devteam files...                  |
|  > Done.                                               |
+-------------------------------------------------------+
```

**Verhalten:**
- Beim Oeffnen des Setup-Tabs wird der Status aller Schritte geprueft
- Bereits installierte Schritte zeigen gruenen Haken, koennen aber erneut ausgefuehrt werden (Re-Install)
- Der naechste nicht-installierte Schritt wird hervorgehoben
- Ein "Install"-Button startet den naechsten ausstehenden Schritt
- Live-Output wird unterhalb des aktiven Schritts angezeigt
- Nach erfolgreichem Abschluss wechselt der Status auf "installed" und der naechste Schritt wird aktiv
- Schritt 4 oeffnet den Cloud Terminal Sidebar (bestehendes Feature)

### 3.6 Backend API

Neue WebSocket-Message-Types:

| Type | Richtung | Beschreibung |
|------|----------|-------------|
| `setup:check-status` | Client -> Server | Status aller Installationsschritte pruefen |
| `setup:status` | Server -> Client | Status-Ergebnis fuer alle Schritte |
| `setup:run-step` | Client -> Server | Einen Installationsschritt ausfuehren |
| `setup:step-output` | Server -> Client | Live-Output eines laufenden Schritts |
| `setup:step-complete` | Server -> Client | Schritt abgeschlossen (success/error) |

### 3.7 Nicht im Scope

- Automatisches Erkennen beim Projektwechsel (wird manuell ueber Setup-Tab geprueft)
- Deinstallation von AgentOS Extended
- Versionspruefung / Update-Mechanismus
- Konfiguration der Curl-URLs ueber die UI (hardcoded im Backend)

## 4. Akzeptanzkriterien

1. Neuer "Setup"-Tab in der Settings-View sichtbar und per Deep-Link erreichbar
2. Alle 4 Installationsschritte werden mit korrektem Status angezeigt
3. Status-Check erkennt korrekt ob Schritte bereits ausgefuehrt wurden
4. Schritte 1-3 koennen per Button gestartet werden, Live-Output wird angezeigt
5. Schritt 4 oeffnet Cloud Terminal mit `/agent-os:build-development-team` Command
6. Fehlerbehandlung: Bei Fehler wird Fehlermeldung angezeigt und Retry ist moeglich
7. Nach erfolgreicher Installation aller Schritte zeigt der Wizard "Setup Complete" an
8. UI folgt dem bestehenden Moltbot Dark Theme und V2 Component Patterns

## 5. Technischer Kontext

- **Frontend:** Lit Web Components, Light DOM, `aos-` Prefix
- **Backend:** Express + TypeScript, Shell-Execution fuer Curl-Commands
- **Kommunikation:** WebSocket via Gateway (bestehende Infrastruktur)
- **Cloud Terminal:** Bestehendes Cloud Terminal Feature fuer Schritt 4
- **Routing:** Hash-basiert, `#/settings/setup`
- **Settings-View:** Tab-basiert, SettingsSection Type erweitern
