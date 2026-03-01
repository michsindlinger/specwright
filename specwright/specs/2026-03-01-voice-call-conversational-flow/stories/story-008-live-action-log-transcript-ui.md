# Live Action Log & Transcript UI

> Story ID: VCF-008
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
Feature: Live Action Log & Transcript UI
  Als Specwright User
  moechte ich in Echtzeit sehen was der Agent tut und was gesprochen wurde,
  damit ich den Fortschritt und das Gespraech nachverfolgen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Live Action Log zeigt Agent-Aktionen

```gherkin
Scenario: Agent-Aktionen werden in Echtzeit angezeigt
  Given ein Voice Call ist aktiv
  When der Agent eine Datei erstellt
  Then sehe ich im Action-Log einen neuen Eintrag "Datei erstellt: user-service.ts"
  And der Eintrag zeigt einen Zeitstempel und Status-Icon (pending/running/complete)
```

### Szenario 2: Action Log scrollt automatisch

```gherkin
Scenario: Auto-Scroll bei neuen Eintraegen
  Given der Action Log hat bereits mehrere Eintraege
  When ein neuer Eintrag hinzukommt
  Then scrollt der Log automatisch zum neuesten Eintrag
```

### Szenario 3: Live-Transkript zeigt Gespraechsverlauf

```gherkin
Scenario: Gespraech wird als Live-Transkript angezeigt
  Given ein Voice Call ist aktiv
  When ich sage "Erstelle einen neuen Service"
  And der Agent antwortet "Ich erstelle jetzt den Service"
  Then sehe ich im Transkript meinen Text markiert als "User"
  And die Agent-Antwort markiert als "Agent"
  And beide Eintraege haben Zeitstempel
```

### Szenario 4: Farbcodierung im Transkript

```gherkin
Scenario: Transkript-Eintraege sind farblich unterschieden
  Given ein Voice Call mit Gespraechsverlauf laeuft
  When ich das Transkript betrachte
  Then sind User-Nachrichten in einer Farbe hervorgehoben
  And Agent-Nachrichten in einer anderen Farbe
  And Aktions-Eintraege in einer dritten Farbe
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Action Log bei vielen gleichzeitigen Aktionen
  Given der Agent fuehrt mehrere Aktionen gleichzeitig aus
  When mehrere Aktionen parallel laufen
  Then werden alle Aktionen im Log angezeigt
  And jede Aktion zeigt ihren individuellen Status
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
- [x] aos-action-log zeigt Agent-Aktionen (Tool-Calls) als Live-Streaming-Liste
- [x] Action-Log hat Auto-Scroll bei neuen Eintraegen
- [x] Jede Aktion zeigt Status-Icon (pending/running/complete/error) und Zeitstempel
- [x] aos-call-transcript zeigt Gespraechsverlauf mit User/Agent-Labels
- [x] Farbcodierung: User-Nachrichten, Agent-Nachrichten, Aktions-Eintraege unterscheidbar
- [x] Live-Updates bei eingehenden voice:transcript:* und voice:action:* Events
- [x] Frontend kompiliert fehlerfrei (`cd ui/frontend && npm run build`)
- [x] Keine Linting-Fehler (`cd ui && npm run lint`)
- [x] **Integration hergestellt: aos-voice-call-view -> aos-action-log / aos-call-transcript**
  - [x] Property Binding funktional
  - [x] Events werden korrekt propagiert

---

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend (Presentation) | aos-action-log | NEU: Live-Streaming-Liste der Agent-Aktionen |
| Frontend (Presentation) | aos-call-transcript | NEU: Live-Transkript mit User/Agent-Labels |

---

### Technical Details

**WAS:**
- aos-action-log (Lit Component) erstellen: Scrollbare Liste mit Tool-Call-Eintraegen (Name, Status-Icon, Zeitstempel), Auto-Scroll, Status-Updates
- aos-call-transcript (Lit Component) erstellen: Gespraechsverlauf mit User/Agent-Labels, Farbcodierung, Zeitstempel, Interim-Transkriptions-Anzeige

**WIE (Architecture Guidance):**
- aos-action-log: Property `actions: VoiceAction[]` (via Property Binding von Voice Call View), Auto-Scroll via scrollIntoView, Status-Icons via Lucide React (oder SVG inline)
- aos-call-transcript: Property `messages: TranscriptMessage[]`, Farbcodierung via CSS Custom Properties (--color-accent-primary fuer User, --color-text-secondary fuer Agent)
- Beide Komponenten sind reine Presentation-Komponenten: Empfangen Daten via Properties, keine eigene WS-Kommunikation
- Voice Call View (Parent) empfaengt voice:action:* und voice:transcript:* Events und reicht sie als Properties weiter

**WO:**
- `ui/frontend/src/components/voice/action-log.ts` (NEU)
- `ui/frontend/src/components/voice/call-transcript.ts` (NEU)

**Abhaengigkeiten:** VCF-006 (Voice Call View - Parent Component)

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Pattern, Reactive Properties, CSS Custom Properties |

---

### Creates Reusable Artifacts

Creates Reusable: yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-action-log | UI Component | ui/frontend/src/components/voice/action-log.ts | Live-Streaming Action Log fuer Tool-Calls |
| aos-call-transcript | UI Component | ui/frontend/src/components/voice/call-transcript.ts | Live-Gespraechs-Transkript mit Farbcodierung |

---

### Technische Verifikation (Automated Checks)

- FILE_EXISTS: ui/frontend/src/components/voice/action-log.ts
- FILE_EXISTS: ui/frontend/src/components/voice/call-transcript.ts
- LINT_PASS: cd ui && npm run lint
- BUILD_PASS: cd ui/frontend && npm run build

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
test -f ui/frontend/src/components/voice/action-log.ts && echo "ActionLog OK"
test -f ui/frontend/src/components/voice/call-transcript.ts && echo "CallTranscript OK"
cd ui/frontend && npm run build 2>&1 | tail -1
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS checks bestanden
2. Alle BUILD_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
