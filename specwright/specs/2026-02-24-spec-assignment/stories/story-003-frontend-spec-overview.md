# Frontend Assignment in Spec-Übersicht

> Story ID: ASGN-003
> Spec: Spec Assignment for External Bot
> Created: 2026-02-24
> Last Updated: 2026-02-24

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 3 SP
**Dependencies**: ASGN-002

---

## Feature

```gherkin
Feature: Assignment-Anzeige und -Steuerung in der Spec-Übersicht
  Als Specwright-Nutzer
  möchte ich in der Spec-Übersicht sehen welche Specs assigned sind und direkt assignen können,
  damit ich den Überblick über Bot-Zuweisungen habe und schnell handeln kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Assignment-Badge sichtbar

```gherkin
Scenario: Assigned Spec zeigt Badge in der Übersicht
  Given ich bin in der Spec-Übersicht
  And die Spec "Spec Assignment" ist an OpenClaw assigned
  When ich die Spec-Liste betrachte
  Then sehe ich ein Bot-Assignment-Badge an der Spec-Karte
  And das Badge ist visuell hervorgehoben
```

### Szenario 2: Spec direkt assignen aus Übersicht

```gherkin
Scenario: Spec aus der Übersicht assignen
  Given ich bin in der Spec-Übersicht
  And die Spec "Spec Assignment" hat alle Stories im Status "ready"
  When ich den Assignment-Toggle an der Spec-Karte aktiviere
  Then erscheint das Bot-Assignment-Badge
  And die Änderung wird sofort in der Übersicht sichtbar
```

### Szenario 3: Spec un-assignen aus Übersicht

```gherkin
Scenario: Assignment zurücknehmen aus der Übersicht
  Given ich bin in der Spec-Übersicht
  And die Spec "Spec Assignment" ist assigned
  When ich den Assignment-Toggle an der Spec-Karte deaktiviere
  Then verschwindet das Bot-Assignment-Badge
```

### Edge Case: Toggle deaktiviert bei nicht-ready Spec

```gherkin
Scenario: Assignment-Toggle nicht verfügbar bei nicht-ready Spec
  Given ich bin in der Spec-Übersicht
  And die Spec hat Stories im Status "blocked"
  When ich die Spec-Karte betrachte
  Then ist der Assignment-Toggle deaktiviert oder nicht sichtbar
```

### Edge Case: Fehlerbehandlung

```gherkin
Scenario: Fehlermeldung bei gescheitertem Assignment
  Given ich bin in der Spec-Übersicht
  When das Assignment fehlschlägt (z.B. weil die Spec zwischenzeitlich nicht mehr ready ist)
  Then sehe ich eine Fehlermeldung als Toast-Notification
  And der Toggle kehrt zum vorherigen Zustand zurück
```

---

## Technische Verifikation (Automated Checks)

- [ ] FILE_EXISTS: ui/frontend/src/components/spec-card.ts
- [ ] CONTAINS: ui/frontend/src/components/spec-card.ts enthält "assignedToBot"
- [ ] CONTAINS: ui/frontend/src/components/spec-card.ts enthält "spec-assign"
- [ ] CONTAINS: ui/frontend/src/views/dashboard-view.ts enthält "specs.assign"
- [ ] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0

---

## Required MCP Tools

Keine MCP-Tools erforderlich.

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

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

- [ ] Code implementiert und folgt Style Guide
- [ ] Frontend `SpecInfo` Interface um `assignedToBot?: boolean` und `isReady?: boolean` erweitert
- [ ] Assignment-Badge in spec-card gerendert (Bot-Icon, hervorgehoben)
- [ ] Toggle-Button für Assignment in spec-card (nur sichtbar wenn `isReady`)
- [ ] Custom Event `spec-assign` wird korrekt dispatcht mit `{ specId }`
- [ ] dashboard-view: Event-Handler für `spec-assign` → sendet `specs.assign` WS Message
- [ ] dashboard-view: Listener für `specs.assign.ack` → aktualisiert lokalen `specs` State
- [ ] dashboard-view: Listener für `specs.assign.error` → zeigt Toast-Notification
- [ ] Badge nicht sichtbar wenn `assignedToBot` falsy
- [ ] Toggle deaktiviert wenn `isReady` falsy
- [ ] Frontend Build kompiliert: `cd ui/frontend && npm run build`
- [ ] Keine `any` Types verwendet
- [ ] Completion Check commands erfolgreich

### Integration DoD (v2.9)

- [ ] **Integration hergestellt: spec-card.ts → dashboard-view.ts**
  - [ ] Custom Event `spec-assign` wird dispatcht und in dashboard-view gehandled
  - [ ] Validierung: `grep -q "spec-assign" ui/frontend/src/components/spec-card.ts`
- [ ] **Integration hergestellt: dashboard-view.ts → WebSocket Gateway**
  - [ ] WS Message `specs.assign` wird gesendet
  - [ ] Validierung: `grep -q "specs.assign" ui/frontend/src/views/dashboard-view.ts`

---

### Betroffene Layer & Komponenten

- **Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend (Presentation) | `spec-card.ts` | `SpecInfo` Interface erweitern; Assignment-Badge rendern; Toggle-Button hinzufügen; `spec-assign` Event dispatchen |
| Frontend (Presentation) | `dashboard-view.ts` | Event-Handler `spec-assign`; WS Listener für `specs.assign.ack` / `specs.assign.error`; lokalen State updaten |

- **Kritische Integration Points:**
  - `spec-card.ts` → `dashboard-view.ts` (Custom Event `spec-assign`)
  - `dashboard-view.ts` → WebSocket Gateway (WS Message `specs.assign`)

- **Handover-Dokumente:**
  - Nutzt `SpecInfo.assignedToBot` und `SpecInfo.isReady` aus ASGN-001
  - Nutzt `specs.assign` / `specs.assign.ack` / `specs.assign.error` WS Messages aus ASGN-002

---

### Technical Details

**WAS:**
- Frontend `SpecInfo` Interface erweitern um `assignedToBot?: boolean` und `isReady?: boolean`
- Assignment-Badge in `spec-card.ts` rendern (neben bestehenden Kanban/Not Started Badges)
- Toggle-Button für Assignment (Robot-Icon) in spec-card
- Custom Event `spec-assign` dispatchen mit `{ specId }` (bubble + composed)
- In `dashboard-view.ts`: `@spec-assign` Event-Handler → `gateway.send({ type: 'specs.assign', specId })`
- In `dashboard-view.ts`: Gateway Listener `specs.assign.ack` → `SpecInfo.assignedToBot` in `this.specs` updaten
- In `dashboard-view.ts`: Gateway Listener `specs.assign.error` → Toast-Notification anzeigen

**WIE:**
- Bestehendes Badge-Rendering-Pattern aus spec-card folgen (Kanban/Not Started Badges)
- Bestehendes Custom-Event-Dispatch-Pattern folgen (bubble + composed, wie `spec-select`)
- Bestehendes `gateway.on()` Pattern für WS-Listener in dashboard-view folgen
- Bestehendes `gateway.send()` Pattern für WS-Nachrichten folgen
- Toggle-Button mit Robot/Bot-Icon (Lucide `bot` icon)
- Toggle visuell hervorheben wenn assigned (z.B. accent Farbe)
- Toggle disabled/hidden wenn `spec.isReady` falsy
- Bei `specs.assign.ack`: Immutable State-Update auf `this.specs` Array (neues Array erzeugen für Lit Reactivity)
- Event-Propagation stoppen um Navigation zu verhindern (Click auf Toggle soll nicht spec-select triggern)

**WO:**
- `ui/frontend/src/components/spec-card.ts` (SpecInfo Interface + Badge + Toggle + Event)
- `ui/frontend/src/views/dashboard-view.ts` (Event-Handler + WS-Listener + State-Update)

**Integration:** specs-reader.ts (SpecInfo) → spec-card.ts (Badge/Toggle)

**Abhängigkeiten:** ASGN-002 (benötigt `specs.assign` WS Message-Handler im Backend)

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Web Component Patterns, Custom Events, Property Binding |

---

### Creates Reusable Artifacts

Creates Reusable: no

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "assignedToBot" ui/frontend/src/components/spec-card.ts && echo "OK: assignedToBot in spec-card"
grep -q "isReady" ui/frontend/src/components/spec-card.ts && echo "OK: isReady in spec-card"
grep -q "spec-assign" ui/frontend/src/components/spec-card.ts && echo "OK: spec-assign event"
grep -q "specs.assign" ui/frontend/src/views/dashboard-view.ts && echo "OK: specs.assign in dashboard"
grep -q "specs.assign.ack" ui/frontend/src/views/dashboard-view.ts && echo "OK: ack listener"
cd ui/frontend && npm run build 2>&1 | tail -1
```

### Story ist DONE wenn:
1. Alle CONTAINS checks bestanden
2. Frontend Build kompiliert ohne Fehler
3. Git diff zeigt nur erwartete Änderungen in spec-card.ts und dashboard-view.ts
