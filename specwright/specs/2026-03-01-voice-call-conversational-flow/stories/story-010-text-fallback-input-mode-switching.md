# Text Fallback & Input Mode Switching

> Story ID: VCF-010
> Spec: Voice Call Conversational Flow
> Created: 2026-03-01
> Last Updated: 2026-03-01

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: 3 SP
**Dependencies**: VCF-007

---

## Feature

```gherkin
Feature: Text Fallback & Input Mode Switching
  Als Specwright User
  moechte ich auch per Text mit dem Agent kommunizieren koennen wenn kein Mikrofon verfuegbar ist,
  damit ich Voice Calls auch ohne Mikrofon nutzen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Automatischer Text-Fallback

```gherkin
Scenario: Fallback auf Text wenn kein Mikrofon verfuegbar
  Given mein Browser hat keinen Mikrofon-Zugang
  When ich einen Voice Call starte
  Then sehe ich ein Text-Eingabefeld anstelle der Voice-Controls
  And einen Hinweis "Kein Mikrofon verfuegbar - Text-Modus aktiv"
  And der Agent antwortet weiterhin per Sprache (TTS bleibt aktiv)
```

### Szenario 2: Manueller Wechsel zu Text

```gherkin
Scenario: User wechselt waehrend des Calls zu Text
  Given ein Voice Call ist aktiv mit Mikrofon
  When ich den Text-Input-Toggle aktiviere
  Then erscheint ein Text-Eingabefeld
  And ich kann meine Nachricht tippen und absenden
  And der Agent antwortet weiterhin per Sprache
```

### Szenario 3: Nahtloser Wechsel

```gherkin
Scenario: Wechsel zwischen Voice und Text waehrend des Calls
  Given ich habe per Text "Erstelle eine Komponente" geschrieben
  When ich zurueck zum Voice-Modus wechsle
  And ich sage "Fuege dort ein Formular hinzu"
  Then versteht der Agent den Kontext aus beiden Modi
  And der Gespraechsverlauf ist durchgaengig
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Mikrofon-Berechtigung wird nachtraeglich erteilt
  Given der Call laeuft im Text-Modus weil kein Mikrofon verfuegbar war
  When ich die Mikrofon-Berechtigung im Browser erteile
  Then kann ich zum Voice-Modus wechseln
  And der Call funktioniert ab sofort mit Spracheingabe
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

- [ ] Code implementiert und folgt Style Guide
- [ ] Text-Input-Feld in aos-call-controls verfuegbar
- [ ] Automatischer Fallback auf Text wenn kein Mikrofon verfuegbar/erlaubt
- [ ] Hinweis "Kein Mikrofon verfuegbar - Text-Modus aktiv" wird angezeigt
- [ ] Manueller Wechsel zwischen Voice und Text waehrend des Calls moeglich
- [ ] Text-Nachrichten werden als voice:text:send an Backend gesendet
- [ ] TTS bleibt aktiv auch im Text-Modus (Agent antwortet per Sprache)
- [ ] Konversationskontext bleibt bei Modus-Wechsel erhalten
- [ ] Frontend kompiliert fehlerfrei (`cd ui/frontend && npm run build`)
- [ ] Keine Linting-Fehler (`cd ui && npm run lint`)

---

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend (Presentation) | aos-call-controls | MODIFY: Text-Input-Feld, Text-Input-Toggle, Mode-Indicator |
| Frontend (Presentation) | aos-voice-call-view | MODIFY: Text-Modus-Handling, voice:text:send via Gateway |

---

### Technical Details

**WAS:**
- aos-call-controls (VCF-007) erweitern: Text-Input-Feld mit Send-Button, Text/Voice Toggle Button, Modus-Anzeige
- aos-voice-call-view erweitern: Text-Message-Handling, voice:text:send senden, Mikrofon-Verfuegbarkeits-Check

**WIE (Architecture Guidance):**
- Text-Input: HTML input[type=text] mit Submit auf Enter und Send-Button
- Auto-Fallback: navigator.mediaDevices.getUserMedia() Fehler -> automatisch Text-Modus aktivieren
- Toggle: Button wechselt zwischen voice/text Modus, State in aos-voice-call-view
- Gateway: Text-Nachrichten als voice:text:send { text, sessionId } senden (Backend VoiceCallService behandelt identisch wie STT-Output)
- Mikrofon nachtraeglich: Wenn User Berechtigung erteilt, Voice-Modus wieder aktivierbar

**WO:**
- `ui/frontend/src/components/voice/call-controls.ts` (MODIFY)
- `ui/frontend/src/views/voice-call-view.ts` (MODIFY)

**Abhaengigkeiten:** VCF-007 (Call Controls muessen existieren)

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Extension, Reactive State |

---

### Creates Reusable Artifacts

Creates Reusable: no (Erweitert bestehende Komponenten)

---

### Technische Verifikation (Automated Checks)

- CONTAINS: ui/frontend/src/components/voice/call-controls.ts -> "text" oder "input"
- CONTAINS: ui/frontend/src/views/voice-call-view.ts -> "voice:text:send"
- LINT_PASS: cd ui && npm run lint
- BUILD_PASS: cd ui/frontend && npm run build

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
grep -qi "text" ui/frontend/src/components/voice/call-controls.ts && echo "Text input OK"
grep -q "voice:text:send" ui/frontend/src/views/voice-call-view.ts && echo "Text send OK"
cd ui/frontend && npm run build 2>&1 | tail -1
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle BUILD_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
