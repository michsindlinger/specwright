# Audio Visualizer & Call Controls

> Story ID: VCF-007
> Spec: Voice Call Conversational Flow
> Created: 2026-03-01
> Last Updated: 2026-03-01

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 3 SP
**Dependencies**: VCF-006

---

## Feature

```gherkin
Feature: Audio Visualizer & Call Controls
  Als Specwright User
  moechte ich eine Wellenform-Animation sehen und meinen Call steuern koennen,
  damit ich visuelles Feedback bekomme und volle Kontrolle ueber den Call habe.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Audio-Wellenform waehrend Agent spricht

```gherkin
Scenario: Wellenform-Animation zeigt Agent-Audio
  Given ein Voice Call ist aktiv
  When der Agent spricht
  Then sehe ich eine animierte Wellenform die die Sprachausgabe visualisiert
  And die Animation stoppt wenn der Agent aufhoert zu sprechen
```

### Szenario 2: Mute/Unmute

```gherkin
Scenario: Mikrofon stummschalten
  Given ein Voice Call ist aktiv und mein Mikrofon ist aktiv
  When ich den Mute-Button klicke
  Then wird mein Mikrofon stummgeschaltet
  And der Mute-Button zeigt den stummgeschalteten Zustand an
  And ich kann den Button erneut klicken um das Mikrofon zu aktivieren
```

### Szenario 3: Push-to-Talk Modus

```gherkin
Scenario: Push-to-Talk mit Leertaste
  Given der Input-Modus ist auf "Push-to-Talk" gestellt
  When ich die Leertaste gedrueckt halte
  Then ist mein Mikrofon aktiv und nimmt Audio auf
  And wenn ich die Leertaste loslasse stoppt die Aufnahme
```

### Szenario 4: VAD Modus

```gherkin
Scenario: Voice Activity Detection erkennt automatisch Sprache
  Given der Input-Modus ist auf "VAD" gestellt
  When ich anfange zu sprechen
  Then erkennt das System automatisch meine Sprache
  And die Aufnahme beginnt ohne Tastendruck
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Modus-Wechsel waehrend des Calls
  Given ein Voice Call ist aktiv im VAD-Modus
  When ich den Input-Modus auf "Push-to-Talk" umschalte
  Then wechselt der Call sofort in den Push-to-Talk-Modus
  And die VAD-Erkennung wird deaktiviert
```

---

## Technische Verifikation (Automated Checks)

<!-- Wird vom Architect ausgefuellt -->

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

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

- [x] Code implementiert und folgt Style Guide
- [x] aos-audio-visualizer zeigt Canvas-basierte Wellenform-Animation (FFT-Daten)
- [x] Animation reagiert auf Agent-Audio und User-Mikrofon
- [x] aos-call-controls bietet Mute-Toggle, Hang-up-Button, PTT-Button, VAD-Toggle
- [x] Mute/Unmute schaltet Mikrofon-Audio korrekt
- [x] Push-to-Talk: Leertaste aktiviert/deaktiviert Mikrofon
- [x] VAD-Modus: Automatische Spracherkennung
- [x] Modus-Wechsel (PTT/VAD) waehrend des Calls moeglich
- [x] Frontend kompiliert fehlerfrei (`cd ui/frontend && npm run build`)
- [x] Keine Linting-Fehler (`cd ui && npm run lint`)
- [x] **Integration hergestellt: aos-voice-call-view -> aos-audio-visualizer / aos-call-controls**
  - [x] Property Binding funktional
  - [x] Events werden korrekt propagiert

---

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend (Presentation) | aos-audio-visualizer | NEU: Canvas-basierte Wellenform mit AnalyserNode FFT |
| Frontend (Presentation) | aos-call-controls | NEU: Mute, Hang-up, PTT, VAD-Toggle Buttons |

---

### Technical Details

**WAS:**
- aos-audio-visualizer (Lit Component) erstellen: Canvas-Element, AnalyserNode FFT-Daten Visualisierung, Modi fuer User-Mikrofon und Agent-Audio
- aos-call-controls (Lit Component) erstellen: Mute-Toggle, roter Hang-up-Button, PTT-Button (Leertaste), VAD-Toggle, Input-Modus-Anzeige

**WIE (Architecture Guidance):**
- aos-audio-visualizer: Canvas mit requestAnimationFrame Loop, AnalyserNode.getByteFrequencyData() fuer FFT-Daten, zwei Modi (user/agent) via Property
- aos-call-controls: LitElement mit @event Dispatching (mute-toggle, hang-up, ptt-start, ptt-end, mode-change)
- PTT: KeyboardEvent Listener (Space), nur aktiv wenn PTT-Modus ausgewaehlt
- VAD: AudioCaptureService (aus VCF-003) steuert Aktivierung basierend auf Audio-Level
- CSS: Bestehende Theme-Variablen, --color-accent-error fuer Hang-up, --color-accent-primary fuer aktive States

**WO:**
- `ui/frontend/src/components/voice/audio-visualizer.ts` (NEU)
- `ui/frontend/src/components/voice/call-controls.ts` (NEU)

**Abhaengigkeiten:** VCF-006 (Voice Call View - Parent Component)

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Pattern, Property Binding, Custom Events |

---

### Creates Reusable Artifacts

Creates Reusable: yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-audio-visualizer | UI Component | ui/frontend/src/components/voice/audio-visualizer.ts | Canvas-basierte Audio-Wellenform-Visualisierung |
| aos-call-controls | UI Component | ui/frontend/src/components/voice/call-controls.ts | Voice Call Steuerungs-Buttons |

---

### Technische Verifikation (Automated Checks)

- FILE_EXISTS: ui/frontend/src/components/voice/audio-visualizer.ts
- FILE_EXISTS: ui/frontend/src/components/voice/call-controls.ts
- LINT_PASS: cd ui && npm run lint
- BUILD_PASS: cd ui/frontend && npm run build

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
test -f ui/frontend/src/components/voice/audio-visualizer.ts && echo "AudioVisualizer OK"
test -f ui/frontend/src/components/voice/call-controls.ts && echo "CallControls OK"
cd ui/frontend && npm run build 2>&1 | tail -1
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS checks bestanden
2. Alle BUILD_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
