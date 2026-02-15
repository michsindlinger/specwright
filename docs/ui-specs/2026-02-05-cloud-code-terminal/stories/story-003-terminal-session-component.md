# Terminal Session Component

> Story ID: CCT-003
> Spec: Cloud Code Terminal
> Created: 2026-02-05
> Last Updated: 2026-02-05

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 3 SP
**Dependencies**: CCT-002
**Status**: Done

---

## Feature

```gherkin
Feature: Terminal Session Component
  Als Entwickler
  möchte ich eine Terminal-Session-Komponente mit vollständiger Claude Code CLI,
  damit ich Befehle direkt im Browser ausführen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Neue Session starten

```gherkin
Scenario: Neue Terminal Session wird gestartet
  Given die Cloud Terminal Sidebar ist geöffnet
  When ich auf "Neue Session" klicke
  Then öffnet sich ein Modell-Auswahl-Dialog
  And ich sehe alle konfigurierten Provider-Modelle
  When ich ein Modell auswähle
  Then wird eine neue Terminal-Session gestartet
  And ein neuer Tab wird erstellt
  And das Terminal zeigt den Claude Code Prompt
```

### Szenario 2: Befehle eingeben

```gherkin
Scenario: Befehle werden im Terminal ausgeführt
  Given ich habe eine aktive Terminal-Session
  When ich einen Befehl eingebe (z.B. "help")
  And ich drücke Enter
  Then wird der Befehl an das Backend gesendet
  And die Antwort wird im Terminal angezeigt
  And Streaming-Output wird live dargestellt
```

### Szenario 3: Zwischen Sessions wechseln

```gherkin
Scenario: Wechsel zwischen Terminal-Sessions
  Given ich habe 2 aktive Terminal-Sessions (Tab 1 und Tab 2)
  And ich befinde mich auf Tab 1
  When ich auf Tab 2 klicke
  Then wird Tab 2 aktiv
  And das Terminal von Tab 2 wird angezeigt
  And Tab 1 wird in den Hintergrund geschoben (aber bleibt aktiv)
```

### Szenario 4: Session schließen

```gherkin
Scenario: Terminal Session wird geschlossen
  Given ich habe 2 aktive Terminal-Sessions
  When ich auf das X-Icon eines Tabs klicke
  Then wird eine Bestätigung angezeigt: "Session beenden?"
  When ich bestätige
  Then wird die Session beendet
  And der Tab wird geschlossen
  And die PTY-Session im Backend wird terminiert
```

### Edge Case: Session-Verbindung verloren

```gherkin
Scenario: Verbindung zum Backend verloren
  Given ich habe eine aktive Terminal-Session
  When die WebSocket-Verbindung unterbrochen wird
  Then wird eine Fehlermeldung angezeigt: "Verbindung verloren"
  And ein "Wiederverbinden" Button wird angezeigt
  When ich auf "Wiederverbinden" klicke
  Then wird versucht die Session wiederherzustellen
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts
- [ ] FILE_EXISTS: agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts enthält "class AosTerminalSession"
- [ ] CONTAINS: agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts enthält "class AosModelDropdown"
- [ ] CONTAINS: agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts enthält "aos-terminal"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd agent-os-ui && npm run lint
- [ ] BUILD_PASS: cd agent-os-ui && npm run build

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | No |

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** (Frontend/Backend/Database/DevOps)
- [x] **Integration Type bestimmt** (Backend-only/Frontend-only/Full-stack)
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer: API Contracts, Data Structures)

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [ ] Unit Tests geschrieben und bestanden
- [ ] Integration Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-terminal-session (NEW) | Session wrapper component |
| Frontend | aos-model-dropdown (NEW) | Model selection dropdown |
| Frontend | aos-terminal (REUSE) | Existing terminal component |

**Kritische Integration Points:**
- aos-terminal-session → aos-terminal: Component rendering
- aos-terminal-session → CloudTerminalService: Session management
- aos-model-dropdown → provider config: Model loading

---

### Technical Details

**WAS:**
- aos-terminal-session Component (Wrapper für aos-terminal mit Session-State)
- aos-model-dropdown Component (Modell-Auswahl aus konfigurierten Providern)
- Integration mit bestehendem aos-terminal Component
- WebSocket-Verbindung für Terminal-I/O

**WIE (Architektur-Guidance ONLY):**
- Nutze bestehendes aos-terminal Component (keine Neuimplementierung)
- Session-State wird in CloudTerminalService verwaltet
- Lazy rendering: Nur aktiver Tab mounted xterm instance
- Nutze bestehende Gateway-Klasse für WebSocket-Kommunikation
- Model-Dropdown: Reuse Logik aus model-selector.ts

**WO:**
- agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts (NEW)
- agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts (NEW)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** CCT-002

**Geschätzte Komplexität:** M

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-ui-component-architecture | agent-os/skills/frontend-ui-component-architecture.md | Terminal session wrapper component |
| frontend-api-bridge-building | agent-os/skills/frontend-api-bridge-building.md | WebSocket communication for terminal I/O |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-terminal-session | UI Component | ui/src/components/terminal/aos-terminal-session.ts | Terminal session wrapper mit State Management |
| aos-model-dropdown | UI Component | ui/src/components/terminal/aos-model-dropdown.ts | Model selection dropdown für Cloud Terminal |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "class AosTerminalSession" agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts
grep -q "class AosModelDropdown" agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts
grep -q "aos-terminal" agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
