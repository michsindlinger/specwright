# Test-Szenarien: AgentOS Extended Setup Wizard

> Generiert am 2026-02-13 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-13-agent-os-setup-wizard/

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI fuer automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung laeuft lokal (`npm run dev` im `agent-os-ui` Verzeichnis)
- [ ] WebSocket-Verbindung ist aktiv (Gateway connected)
- [ ] Ein Projekt ist in der UI ausgewaehlt (fuer projectPath)

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Lokales Projekt | Beliebiges Verzeichnis mit/ohne `.agent-os/` | Fuer Status-Check Tests |

---

## Test-Szenarien

### Szenario 1: SETUP-001 - Backend Setup Service: Status Check

**Beschreibung:** Testen ob der Backend-Service den Installationsstatus aller 4 Schritte korrekt erkennt.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Projekt mit `.agent-os/` Verzeichnis (inkl. `workflows/` oder `standards/`) auswaehlen | Schritt 1 wird als "installed" gemeldet |
| 2 | Projekt mit `CLAUDE.md` und `.claude/` Verzeichnis auswaehlen | Schritt 2 wird als "installed" gemeldet |
| 3 | Sicherstellen dass `~/.agent-os/templates/` existiert | Schritt 3 wird als "installed" gemeldet |
| 4 | Projekt mit `agent-os/team/` Verzeichnis (nicht leer) auswaehlen | Schritt 4 wird als "installed" gemeldet |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Leeres Team-Verzeichnis | `agent-os/team/` existiert aber ist leer | Schritt 4 als "not_installed" |
| Teilweise Installation | Nur `.agent-os/` ohne Unterordner | Schritt 1 als "not_installed" |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Kein Projekt | Kein Projekt ausgewaehlt | setup:error mit Code "NO_PROJECT" |

---

### Szenario 2: SETUP-002 - Backend Setup Service: Shell Execution

**Beschreibung:** Testen ob Shell-Commands fuer die Installation korrekt ausgefuehrt und gestreamt werden.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Schritt 1 (Base Installation) starten | Live-Output wird per "step-output" Event gestreamt |
| 2 | Warten bis Prozess endet | "step-complete" Event mit success=true |
| 3 | Status erneut pruefen | Schritt 1 als "installed" markiert |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Parallele Ausfuehrung | Schritt 2 starten waehrend Schritt 1 laeuft | Anfrage wird abgelehnt mit Fehlermeldung |
| Erneute Installation | Bereits installierten Schritt nochmal ausfuehren | Command wird normal ausgefuehrt |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Command fehlgeschlagen | Shell-Prozess endet mit Exit-Code != 0 | "step-complete" mit success=false und exitCode |
| Netzwerkfehler | Curl kann URL nicht erreichen | "step-complete" mit success=false |

---

### Szenario 3: SETUP-003 - Backend WebSocket Handler

**Beschreibung:** Testen ob WebSocket-Messages korrekt geroutet und verarbeitet werden.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | `setup:check-status` Message senden | Server antwortet mit `setup:status` und Status-Array |
| 2 | `setup:run-step` mit step=1 senden | Server streamt `setup:step-output` und sendet `setup:step-complete` |
| 3 | `setup:start-devteam` senden | Server erstellt Cloud Terminal Session mit initialem `/agent-os:build-development-team` Prompt |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Ungueltiger Step | `setup:run-step` mit step=5 | Fehlerbehandlung (step validiert auf 1-3) |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Kein Projekt | Setup-Message ohne aktives Projekt | `setup:error` mit Code "NO_PROJECT" |

---

### Szenario 4: SETUP-004 - Frontend Setup Wizard Komponente

**Beschreibung:** Testen der visuellen Setup Wizard UI Komponente.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Setup-Tab in Settings oeffnen | Alle 4 Schritte werden mit aktuellem Status angezeigt |
| 2 | Auf "Install" Button bei nicht installiertem Schritt klicken | Output-Bereich erscheint, Live-Output wird angezeigt, Spinner laeuft |
| 3 | Warten bis Installation endet | Status wechselt auf "installed" (gruener Haken), Output zeigt Erfolgsmeldung |
| 4 | Alle 4 Schritte installiert haben | "Setup Complete" Banner wird angezeigt |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Step laeuft bereits | Zweiten Install-Button klicken waehrend Step laeuft | Button ist disabled |
| DevTeam Step | Auf "Open Cloud Terminal" bei Step 4 klicken | Cloud Terminal Session wird geoeffnet, Hinweis wird angezeigt |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Installation fehlgeschlagen | Shell-Prozess endet mit Fehler | Status wechselt auf "error" (roter Indikator), "Retry" Button erscheint |
| Kein Projekt | Setup Wizard ohne ausgewaehltes Projekt | Fehlermeldung wird angezeigt |

---

### Szenario 5: SETUP-005 - Settings View: Setup Tab Integration

**Beschreibung:** Testen der Tab-Integration in der Settings-View.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Settings-Seite oeffnen | "Setup" Tab ist neben den bestehenden Tabs sichtbar |
| 2 | Auf "Setup" Tab klicken | Setup Wizard wird angezeigt, URL aendert sich auf #/settings/setup |
| 3 | Direkt zu #/settings/setup navigieren | Settings-Seite mit aktivem Setup-Tab wird geoeffnet |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Tab-Wechsel | Von Setup zu Models und zurueck | Wizard-State bleibt erhalten |

#### Fehlerfaelle

| Fehlerfall | Ausloeser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Ungueltige URL | #/settings/invalid | Fallback auf Standard-Tab (models) |

---

## Regressions-Checkliste

Bestehende Funktionalitaet, die nach der Implementierung noch funktionieren muss:

- [ ] Settings-Seite: Models Tab funktioniert weiterhin
- [ ] Settings-Seite: General Tab funktioniert weiterhin
- [ ] Settings-Seite: Appearance Tab funktioniert weiterhin
- [ ] WebSocket-Verbindung: Bestehende Messages (cloud-terminal, specs, etc.) funktionieren
- [ ] Cloud Terminal: Bestehende Terminal-Sessions funktionieren unabhaengig vom Setup

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
Setup Wizard: aos-setup-wizard (Custom Element)
Setup Steps: .setup-step (CSS-Klasse)
Install Button: .setup-step button
Output Bereich: .setup-output (CSS-Klasse)
Settings Tabs: settings-view nav button
```

### API-Endpunkte (WebSocket Messages)
| Message Type | Richtung | Beschreibung |
|-------------|----------|--------------|
| setup:check-status | Client → Server | Status aller Schritte abfragen |
| setup:status | Server → Client | Status-Array zurueckgeben |
| setup:run-step | Client → Server | Installations-Schritt starten |
| setup:step-output | Server → Client | Live-Output streamen |
| setup:step-complete | Server → Client | Schritt abgeschlossen |
| setup:start-devteam | Client → Server | Cloud Terminal fuer DevTeam starten |
| setup:error | Server → Client | Fehler melden |

### Mock-Daten
```json
{
  "setupStatus": [
    { "step": 1, "name": "AgentOS Base", "status": "installed" },
    { "step": 2, "name": "Claude Code Setup", "status": "not_installed" },
    { "step": 3, "name": "DevTeam Global", "status": "installed" },
    { "step": 4, "name": "DevTeam Project", "status": "not_installed" }
  ]
}
```

---

## Notizen

- Die Curl-Commands fuer Steps 1-3 sind hardcoded im Backend - kein User-Input fliesst in Shell-Befehle
- Step 4 (DevTeam) nutzt eine Cloud Terminal Session statt direkter Shell-Ausfuehrung
- Der Setup Wizard nutzt Light DOM (`createRenderRoot() { return this; }`) fuer CSS-Kompatibilitaet
