# User-Todos: Cloud Terminal Erweiterung

> Generiert am 2026-02-11
> Spec: agent-os/specs/2026-02-11-cloud-terminal-erweiterung/

## Zweck

Diese Checkliste enthält Aufgaben, die **manuell vom Benutzer** erledigt werden müssen, damit das Feature vollständig funktioniert. Diese Aufgaben konnten während der Implementierung nicht automatisch durchgeführt werden.

---

## Kritisch (vor Nutzung erforderlich)

Keine kritischen manuellen Aufgaben erforderlich. Das Feature funktioniert sofort nach dem Merge.

---

## Wichtig (für Produktion erforderlich)

Keine wichtigen manuellen Aufgaben erforderlich. Shell-Terminals benötigen keine zusätzliche Konfiguration.

---

## Optional (Empfohlen)

- [ ] **Manueller Smoketest durchführen**
  - Beschreibung: Die 5 Test-Szenarien aus `implementation-reports/test-scenarios.md` manuell durchspielen
  - Grund: Automatisierte E2E-Tests sind für WebSocket-basierte Terminal-Interaktionen komplex
  - Hinweis: Besonders Szenario 4 (Session-Persistenz nach Seite-Neuladen) prüfen

---

## Kategorien

### Secrets & Credentials
Keine - Shell-Terminals benötigen keine API-Keys oder Credentials.

### Externe Services
Keine - Shell-Terminals nutzen nur lokale System-Shell.

### Infrastruktur
Keine - Keine Änderungen an der Infrastruktur nötig.

### Dokumentation
- [ ] **Nutzung dokumentieren (optional)**
  - Beschreibung: "Terminal" als erste Option im Session-Dropdown auswählen startet eine Shell
  - Grund: Nutzer müssen wissen, dass die neue Option existiert
  - Hinweis: Bekannte Limitation - immer System-Default-Shell, keine Custom-Shell-Auswahl

---

## Erledigte Aufgaben

Keine bisherigen manuellen Aufgaben.

---

## Notizen

- Keine spezielle Konfiguration nötig für Shell-Terminals
- Nutzung: "Terminal" als erste Option im Session-Dropdown auswählen
- Bekannte Limitationen: Immer System-Default-Shell, keine Custom-Shell-Auswahl
