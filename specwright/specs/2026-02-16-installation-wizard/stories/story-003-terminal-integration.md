# Terminal-Integration im Wizard

> Story ID: IW-003
> Spec: Installation Wizard
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: IW-002
**Integration**: aos-installation-wizard-modal -> aos-terminal-session, aos-installation-wizard-modal -> gateway.ts

---

## Feature

```gherkin
Feature: Terminal-Integration im Wizard
  Als Benutzer der Specwright Web UI
  moechte ich den ausgewaehlten Setup-Command direkt im Wizard-Modal ausfuehren koennen,
  damit ich den Installationsprozess nicht verlassen muss.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Terminal startet nach Command-Auswahl

```gherkin
Scenario: Claude Code Terminal startet nach Command-Auswahl
  Given ich sehe den Wizard Modal mit den vier Setup-Optionen
  When ich "plan-product" auswaehle
  Then wechselt der Modal zur Terminal-Ansicht
  And ein Claude Code Terminal wird im Modal angezeigt
  And der Command "/plan-product" wird automatisch gestartet
```

### Szenario 2: Terminal-Interaktion im Modal

```gherkin
Scenario: Benutzer kann im Terminal interagieren
  Given der Wizard zeigt das Claude Code Terminal mit einem laufenden Command
  When Claude Code mir Fragen stellt
  Then kann ich direkt im Terminal antworten
  And die Interaktion verhaelt sich wie im normalen Cloud Terminal
```

### Szenario 3: Erfolgreicher Abschluss des Commands

```gherkin
Scenario: Command wird erfolgreich abgeschlossen
  Given ein Setup-Command laeuft im Wizard-Terminal
  When der Command erfolgreich abgeschlossen wird
  Then sehe ich eine Erfolgsmeldung im Wizard
  And ein "Weiter"-Button erscheint
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Terminal-Fehler waehrend der Ausfuehrung
  Given ein Setup-Command laeuft im Wizard-Terminal
  When ein Fehler bei der Ausfuehrung auftritt
  Then sehe ich die Fehlermeldung im Terminal
  And ich kann den Command erneut starten oder den Wizard abbrechen
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Pruefungen

- [ ] CONTAINS: aos-installation-wizard-modal.ts enthaelt "aos-terminal-session"
- [ ] CONTAINS: aos-installation-wizard-modal.ts enthaelt "cloud-terminal:create"

### Funktions-Pruefungen

- [ ] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und pruefbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschaetzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] **Integration hergestellt: aos-installation-wizard-modal -> aos-terminal-session**
  - [ ] Import/Aufruf existiert in Code
  - [ ] Verbindung ist funktional (nicht nur Stub)
  - [ ] Validierung: `grep -q "aos-terminal-session" ui/frontend/src/components/setup/aos-installation-wizard-modal.ts`
- [ ] **Integration hergestellt: aos-installation-wizard-modal -> gateway (cloud-terminal:create)**
  - [ ] Import/Aufruf existiert in Code
  - [ ] Verbindung ist funktional
  - [ ] Validierung: `grep -q "cloud-terminal:create" ui/frontend/src/components/setup/aos-installation-wizard-modal.ts`

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt
- [ ] Code Review durchgefuehrt und genehmigt

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | `aos-installation-wizard-modal.ts` | Terminal-Schritt hinzufuegen: `aos-terminal-session` einbetten, Cloud-Terminal-Session erstellen, Command-Injection |

**Kritische Integration Points:**
- `aos-installation-wizard-modal` -> `aos-terminal-session` (Child-Component-Einbettung)
- `aos-installation-wizard-modal` -> `gateway.ts` (WebSocket `cloud-terminal:create` Message)

---

### Technical Details

**WAS:**
- Terminal-Schritt in `aos-installation-wizard-modal` implementieren
- `aos-terminal-session` als Child-Komponente einbetten
- Cloud-Terminal-Session via Gateway erstellen bei Command-Auswahl
- Ausgewaehlten Slash-Command als initialen Input senden
- Auf Terminal-Session-Events reagieren (created, closed, error)

**WIE (Architektur-Guidance ONLY):**
- Pattern von `handleSetupStartDevteam()` in `websocket.ts` folgen fuer Command-Injection
- `aos-terminal-session`-Komponente mit `terminalSessionId` Property binden
- Gateway importieren fuer `cloud-terminal:create` Message
- `resolveCommandDir()` nutzen fuer korrekten Command-Prefix
- setTimeout-Pattern fuer Command-Injection nach Session-Erstellung (wie im bestehenden Code)
- Terminal-Session-ID als State in der Wizard-Komponente verwalten

**WO:**
- `ui/frontend/src/components/setup/aos-installation-wizard-modal.ts` (Terminal-Step hinzufuegen)

**Abhaengigkeiten:** IW-002 (braucht die Modal-Grundstruktur)

**Geschaetzte Komplexitaet:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Composition, Child-Component-Einbettung |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Cloud Terminal Patterns, Gateway-Nutzung |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Frontend compiles
cd ui/frontend && npm run build

# Terminal session embedded
grep -q "aos-terminal-session" ui/frontend/src/components/setup/aos-installation-wizard-modal.ts && echo "Terminal embedded"

# Cloud terminal create message
grep -q "cloud-terminal:create" ui/frontend/src/components/setup/aos-installation-wizard-modal.ts && echo "Terminal creation found"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
