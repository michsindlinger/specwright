# User-Todos: Git Integration UI

> Generiert am 2026-02-11
> Spec: agent-os/specs/2026-02-11-git-integration-ui

## Zweck

Diese Checkliste enthaelt Aufgaben, die **manuell vom Benutzer** erledigt werden muessen, damit das Feature vollstaendig funktioniert. Diese Aufgaben konnten waehrend der Implementierung nicht automatisch durchgefuehrt werden.

---

## Kritisch (vor Nutzung erforderlich)

Diese Aufgaben muessen erledigt werden, **bevor** das Feature verwendet werden kann:

- [ ] **Git muss auf dem System installiert sein**
  - Beschreibung: Die Git CLI muss im System-PATH verfuegbar sein
  - Grund: Alle Git-Operationen werden ueber `git` CLI-Befehle im Backend ausgefuehrt
  - Hinweis: `git --version` ausfuehren um Installation zu pruefen. Installation: https://git-scm.com/downloads

---

## Wichtig (fuer Produktion erforderlich)

Diese Aufgaben sollten vor dem Produktiv-Deployment erledigt werden:

- [ ] **Git-Authentifizierung fuer Remote-Operationen konfigurieren**
  - Beschreibung: SSH-Keys oder Credential-Manager muessen fuer Push/Pull zum Remote konfiguriert sein
  - Grund: Push und Pull erfordern Authentifizierung zum Remote-Repository
  - Hinweis: SSH-Key einrichten oder Git Credential Manager konfigurieren

- [ ] **Manuelles Testen der Git-Integration**
  - Beschreibung: Die Test-Szenarien aus `test-scenarios.md` durchfuehren
  - Grund: Automatisierte E2E-Tests sind noch nicht vorhanden
  - Hinweis: Siehe `agent-os/specs/2026-02-11-git-integration-ui/test-scenarios.md`

---

## Optional (Empfohlen)

Diese Aufgaben sind empfohlen, aber nicht zwingend erforderlich:

- [ ] **E2E-Tests fuer Git-Integration schreiben**
  - Beschreibung: Automatisierte Tests basierend auf den Test-Szenarien erstellen
  - Grund: Manuelle Tests bei jedem Deployment sind aufwendig
  - Hinweis: Test-Szenarien und Mock-Daten sind in `test-scenarios.md` dokumentiert

---

## Kategorien

### Infrastruktur
- [ ] Git muss auf dem Server/Deployment-System installiert sein
- [ ] Git-Authentifizierung (SSH-Keys/Credentials) muss auf dem Server konfiguriert sein

### Dokumentation
- [ ] Nutzer ueber neue Git-Integration informieren
- [ ] Bekannte Limitationen kommunizieren (z.B. keine Merge-Konflikt-Loesung in der UI)

---

## Bekannte Limitationen

- **Keine Merge-Konflikt-Loesung:** Merge-Konflikte muessen ausserhalb der Anwendung geloest werden
- **Kein Force Push:** Force Push ist absichtlich nicht implementiert
- **Kein Stash:** Git Stash ist nicht in der UI verfuegbar
- **Kein Diff-Viewer:** Dateiinhalts-Aenderungen koennen nicht in der UI betrachtet werden
- **Timeout:** Git-Operationen haben ein Timeout von 10 Sekunden

---

## Erledigte Aufgaben

Hier zur Nachverfolgung bereits erledigte Aufgaben:

_(Noch keine erledigten Aufgaben)_

---

## Notizen

- Die Git-Integration kommuniziert ausschliesslich ueber WebSocket-Messages
- Alle Git-Befehle werden ueber `execFile` ausgefuehrt (keine Shell-Injection moeglich)
- Die Status-Leiste aktualisiert sich automatisch bei Projektwechsel und nach Git-Operationen
