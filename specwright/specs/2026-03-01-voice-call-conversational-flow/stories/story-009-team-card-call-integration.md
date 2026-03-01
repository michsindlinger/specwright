# Team Card Call Integration

> Story ID: VCF-009
> Spec: Voice Call Conversational Flow
> Created: 2026-03-01
> Last Updated: 2026-03-01

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 2 SP
**Dependencies**: VCF-006
**Integration**: aos-team-card -> aos-voice-call-view (Navigation)

---

## Feature

```gherkin
Feature: Team Card Call Integration
  Als Specwright User
  moechte ich auf einer Team Card ein Telefon-Icon sehen und anklicken koennen,
  damit ich direkt aus der Team-Uebersicht einen Voice Call starten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Telefon-Icon auf Team Card

```gherkin
Scenario: Telefon-Icon ist auf jeder Team Card sichtbar
  Given ich bin in der Team-Uebersicht
  When ich die Team Cards betrachte
  Then sehe ich auf jeder Card ein Telefon-Icon
  And das Icon ist neben den bestehenden Aktions-Buttons (Edit, Delete) platziert
```

### Szenario 2: Call starten per Klick

```gherkin
Scenario: Klick auf Telefon-Icon startet Voice Call
  Given ich bin in der Team-Uebersicht
  When ich auf das Telefon-Icon des "Frontend Dev" Agents klicke
  Then werde ich zur Voice Call View navigiert
  And der Call wird mit dem "Frontend Dev" Agent initiiert
```

### Szenario 3: Agent-Kontext wird uebergeben

```gherkin
Scenario: Agent-Informationen werden an Call-View uebergeben
  Given ich klicke auf das Telefon-Icon eines Agents
  When die Call-View geoeffnet wird
  Then zeigt sie den korrekten Agent-Namen und Rolle an
  And der Agent hat Zugriff auf seine Skills und Domain-Knowledge
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Voice nicht konfiguriert
  Given die Voice-API-Keys sind nicht konfiguriert
  When ich auf das Telefon-Icon klicke
  Then sehe ich einen Hinweis "Voice nicht konfiguriert"
  And einen Link zu den Voice-Settings
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
- [ ] Telefon-Icon (Lucide Phone) auf jeder Team Card sichtbar
- [ ] Klick auf Icon emittiert call-click Custom Event mit skillId
- [ ] Team View faengt call-click Event ab und navigiert zu #/call/:skillId
- [ ] Voice-nicht-konfiguriert: Hinweis mit Link zu Voice-Settings
- [ ] Frontend kompiliert fehlerfrei (`cd ui/frontend && npm run build`)
- [ ] Keine Linting-Fehler (`cd ui && npm run lint`)
- [ ] **Integration hergestellt: aos-team-card -> aos-voice-call-view (Navigation)**
  - [ ] routerService.navigate funktional
  - [ ] Korrekter skillId wird uebergeben

---

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend (Presentation) | Team Card Component (V2) | MODIFY: Telefon-Icon Button, call-click Event |
| Frontend (Presentation) | team-view.ts | MODIFY: call-click Event Handler, Navigation |

- **Hinweis:** V2-Komponenten werden fuer Teams verwendet (siehe CLAUDE.md). Die genaue Team-Card-Datei muss vom Implementierer identifiziert werden (V2 Pattern).

---

### Technical Details

**WAS:**
- Team Card (V2) erweitern: Telefon-Icon (Lucide Phone) neben bestehenden Aktions-Buttons, click dispatcht call-click CustomEvent
- Team View erweitern: Event Handler fuer call-click, Voice-Config-Status pruefen, Navigation zu #/call/:skillId

**WIE (Architecture Guidance):**
- Follow bestehende Team Card Action-Button-Pattern (neben Edit/Delete Buttons)
- Phone Icon: Lucide Phone Component (import { Phone } from 'lucide-lit' oder SVG inline)
- Custom Event: `new CustomEvent('call-click', { detail: { skillId }, bubbles: true, composed: true })`
- Navigation: routerService.navigate(`call/${skillId}`) oder window.location.hash = `#/call/${skillId}`
- Voice-Config-Check: Vor Navigation pruefen ob API-Keys konfiguriert (Gateway send settings.voice.get, Response pruefen)
- Wenn nicht konfiguriert: Toast/Notification mit Link zu Settings Voice Section

**WO:**
- Team Card V2 Component (MODIFY - genauen Dateipfad beim Implementieren identifizieren)
- `ui/frontend/src/views/team-view.ts` (MODIFY)

**Abhaengigkeiten:** VCF-006 (Voice Call View muss als Route existieren)

**Geschaetzte Komplexitaet:** XS

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Custom Events, Component Extension |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Team View Architektur, V2 Komponenten |

---

### Creates Reusable Artifacts

Creates Reusable: no (Erweitert bestehende Komponenten, keine neuen standalone Artefakte)

---

### Technische Verifikation (Automated Checks)

- CONTAINS: ui/frontend/src/views/team-view.ts -> "call-click" oder "call"
- LINT_PASS: cd ui && npm run lint
- BUILD_PASS: cd ui/frontend && npm run build

### Completion Check

```bash
# Auto-Verify Commands - all must exit with 0
grep -qi "call" ui/frontend/src/views/team-view.ts && echo "Team view call handler OK"
cd ui/frontend && npm run build 2>&1 | tail -1
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle BUILD_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
