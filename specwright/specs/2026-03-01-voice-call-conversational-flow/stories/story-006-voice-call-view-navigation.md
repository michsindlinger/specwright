# Voice Call View & Navigation

> Story ID: VCF-006
> Spec: Voice Call Conversational Flow
> Created: 2026-03-01
> Last Updated: 2026-03-01

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 5 SP
**Dependencies**: VCF-005

---

## Feature

```gherkin
Feature: Voice Call View & Navigation
  Als Specwright User
  moechte ich eine Vollbild-Call-Ansicht sehen wenn ich einen Agent anrufe,
  damit ich mich voll auf das Gespraech konzentrieren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Call-View wird angezeigt

```gherkin
Scenario: Vollbild Call-View oeffnet sich
  Given ich starte einen Voice Call mit dem "Architect" Agent
  When die Verbindung hergestellt wird
  Then sehe ich eine Vollbild-Call-Ansicht
  And ich sehe den Agent-Avatar, Namen "Architect" und seine Rolle
  And ich sehe die Call-Controls (Mute, Auflegen)
```

### Szenario 2: Connecting-Animation

```gherkin
Scenario: Verbindungsaufbau wird visuell angezeigt
  Given ich klicke auf das Telefon-Icon eines Agents
  When der Call verbunden wird
  Then sehe ich eine Klingeln/Connecting-Animation
  And nach erfolgreicher Verbindung wechselt die Anzeige zur aktiven Call-Ansicht
```

### Szenario 3: Call beenden

```gherkin
Scenario: Call wird ueber Auflegen-Button beendet
  Given ich fuehre einen aktiven Voice Call
  When ich auf den roten "Auflegen"-Button klicke
  Then wird der Call sofort beendet
  And ich werde zurueck zur vorherigen Ansicht navigiert
```

### Szenario 4: Navigation als eigene Route

```gherkin
Scenario: Call-View ist als eigene Route erreichbar
  Given ich bin in der Specwright Web UI
  When ein Call gestartet wird
  Then aendert sich die URL auf den Call-Pfad
  And die Browser-Zurueck-Navigation funktioniert korrekt
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Verbindung kann nicht hergestellt werden
  Given die API-Keys sind nicht konfiguriert
  When ich versuche einen Call zu starten
  Then sehe ich eine Fehlermeldung "Voice nicht konfiguriert"
  And einen Link zu den Voice-Settings
```

---

## Technische Verifikation (Automated Checks)

<!-- Wird vom Architect ausgefuellt -->

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| Playwright | Visuelle Validierung der Call-View | No |

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

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

- [x] Code implementiert und folgt Style Guide
- [x] aos-voice-call-view Lit Component erstellt mit Vollbild-Layout
- [x] Agent-Avatar, Name und Rolle werden korrekt angezeigt
- [x] Connecting-Animation waehrend Verbindungsaufbau
- [x] Roter Auflegen-Button beendet Call und navigiert zurueck
- [x] Route 'call' in ViewType registriert
- [x] app.ts rendert aos-voice-call-view fuer case 'call'
- [x] Gateway Listener fuer voice:* Events korrekt registriert
- [x] Frontend kompiliert fehlerfrei (`cd ui/frontend && npm run build`)
- [x] Keine Linting-Fehler (`cd ui && npm run lint`)
- [x] **Integration hergestellt: aos-voice-call-view -> Gateway (voice:call:start)**
  - [x] Import/Aufruf existiert in Code
  - [x] Verbindung ist funktional (nicht nur Stub)

---

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend (Presentation) | aos-voice-call-view | NEU: Vollbild Call-View mit Agent-Info, Layout, Gateway Listener |
| Frontend (Routing) | route.types.ts | MODIFY: 'call' zu ViewType hinzufuegen |
| Frontend (App Shell) | app.ts | MODIFY: Import voice-call-view, case 'call' in renderView() |

---

### Technical Details

**WAS:**
- aos-voice-call-view (Lit Component) erstellen: Vollbild-View mit Agent-Avatar/Name/Rolle, Connecting-Animation, Layout-Slots fuer Controls/Action-Log/Transcript
- Route 'call' registrieren: ViewType um 'call' erweitern
- App Shell erweitern: Import und renderView case fuer voice-call-view
- Gateway-Integration: Listener fuer alle voice:* Events, voice:call:start senden bei Component-Mount

**WIE (Architecture Guidance):**
- Follow bestehende View-Patterns (team-view.ts, chat-view.ts): @consume projectContext, viewState Pattern (connecting/active/ended/error)
- Route: Hash-basiert als #/call/:skillId (skillId als URL-Parameter fuer Agent-Zuordnung)
- Layout: CSS Grid/Flexbox Fullscreen, nutze bestehende CSS Custom Properties (--color-bg-primary, etc.)
- Connecting-State: Pulsing-Animation waehrend voice:call:start -> voice:call:connected
- Agent-Info: Skills API (GET /api/team/:projectPath/skills/:skillId) fuer Name, Rolle, Avatar
- Cleanup: disconnectedCallback() raeumt Gateway-Listener auf und sendet voice:call:end

**WO:**
- `ui/frontend/src/views/voice-call-view.ts` (NEU)
- `ui/frontend/src/types/route.types.ts` (MODIFY)
- `ui/frontend/src/app.ts` (MODIFY)

**Abhaengigkeiten:** VCF-005 (Backend Conversation Engine muss voice:call:start verarbeiten)

**Geschaetzte Komplexitaet:** M

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit View Pattern, Routing, Gateway Integration |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Bestehende View-Architektur, Skills API |

---

### Creates Reusable Artifacts

Creates Reusable: yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-voice-call-view | UI Component | ui/frontend/src/views/voice-call-view.ts | Vollbild Voice Call View mit Gateway Integration |

---

### Technische Verifikation (Automated Checks)

- FILE_EXISTS: ui/frontend/src/views/voice-call-view.ts
- CONTAINS: ui/frontend/src/types/route.types.ts -> "call"
- CONTAINS: ui/frontend/src/app.ts -> "voice-call-view"
- LINT_PASS: cd ui && npm run lint
- BUILD_PASS: cd ui/frontend && npm run build

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
test -f ui/frontend/src/views/voice-call-view.ts && echo "VoiceCallView OK"
grep -q "'call'" ui/frontend/src/types/route.types.ts && echo "Route type OK"
grep -q "voice-call-view" ui/frontend/src/app.ts && echo "App import OK"
cd ui/frontend && npm run build 2>&1 | tail -1
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle BUILD_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
