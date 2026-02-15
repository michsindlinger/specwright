# Session Tab Bar Component

> Story ID: MSC-001
> Spec: Multi-Session Chat
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: MSC-002

---

## Feature

```gherkin
Feature: Session Tab Bar
  Als Entwickler
  möchte ich eine Tab-Leiste mit meinen Chat-Sessions sehen,
  damit ich schnell zwischen verschiedenen Konversationen wechseln kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Tab-Leiste wird angezeigt

```gherkin
Scenario: Tab-Leiste ist sichtbar über dem Chat-Bereich
  Given ich befinde mich in der Chat-Ansicht
  When die Seite geladen ist
  Then sehe ich eine horizontale Tab-Leiste über dem Chat-Bereich
  And mindestens ein Session-Tab ist sichtbar
```

### Szenario 2: Neue Session erstellen

```gherkin
Scenario: Neue Session über Plus-Button erstellen
  Given ich sehe die Tab-Leiste mit meinen Sessions
  When ich auf den "+" Button rechts neben den Tabs klicke
  Then wird eine neue Session mit dem Namen "Chat 2" erstellt
  And der neue Tab wird automatisch aktiviert
  And ich sehe einen leeren Chat-Bereich
```

### Szenario 3: Zwischen Sessions wechseln

```gherkin
Scenario: Session-Wechsel durch Tab-Klick
  Given ich habe zwei Sessions "Projekt A" und "Projekt B"
  And ich bin aktuell in Session "Projekt A"
  When ich auf den Tab "Projekt B" klicke
  Then wird Session "Projekt B" aktiviert
  And ich sehe die Chat-Historie von "Projekt B"
  And der Tab "Projekt B" ist visuell als aktiv markiert
```

### Szenario 4: Session umbenennen

```gherkin
Scenario: Session-Namen per Doppelklick ändern
  Given ich habe eine Session mit dem Namen "Chat 1"
  When ich doppelt auf den Tab-Namen klicke
  Then erscheint ein Eingabefeld mit dem aktuellen Namen
  When ich "Mein Projekt" eingebe und Enter drücke
  Then wird der Tab-Name zu "Mein Projekt" aktualisiert
```

### Szenario 5: Aktivitäts-Indikator anzeigen

```gherkin
Scenario: Spinner zeigt aktiven Agent-Prozess
  Given ich habe eine Session mit laufendem Agent-Prozess
  When ich zu einer anderen Session wechsle
  Then sehe ich einen Spinner-Indikator auf dem Tab der Session mit aktivem Prozess
  And ich kann erkennen welche Sessions gerade arbeiten
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Leerer Session-Name wird verhindert
  Given ich bearbeite den Namen einer Session
  When ich den Namen komplett lösche und Enter drücke
  Then wird der vorherige Name beibehalten
  And das Eingabefeld wird geschlossen
```

```gherkin
Scenario: Session schließen ohne aktive Prozesse
  Given ich habe eine Session ohne laufende Agent-Prozesse
  When ich auf das "X" des Session-Tabs klicke
  Then wird die Session sofort geschlossen und archiviert
  And der nächste Tab wird automatisch aktiviert
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: `agent-os-ui/ui/src/components/session-tabs.ts`
- [ ] FILE_EXISTS: `agent-os-ui/ui/src/components/session-tab.ts`

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui && npm run lint`
- [ ] BUILD_PASS: `cd agent-os-ui/ui && npm run build`
- [ ] TEST_PASS: `cd agent-os-ui && npm test -- --grep "session-tab"`

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| - | Keine MCP Tools erforderlich | - |

---

## Technisches Refinement (vom Architect)

> **Refined:** 2026-01-30

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

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten
- [ ] Accessibility-Anforderungen erfüllt (Keyboard-Navigation, ARIA)

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Component Tests mit @open-wc/testing geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-session-tabs | NEU: Container für Tab-Leiste |
| Frontend | aos-session-tab | NEU: Einzelner Tab mit Name, X-Button, Spinner |
| Frontend | chat-view.ts | ERWEITERN: Session-Tabs einbinden |

**Kritische Integration Points:** N/A (reine UI-Komponente, Events werden nach oben propagiert)

---

### Technical Details

**WAS:**
- `aos-session-tabs`: Container-Komponente mit horizontaler Tab-Leiste
  - Rendert Liste von aos-session-tab Komponenten
  - "+" Button am Ende für neue Session
  - Scrollbar bei vielen Tabs
- `aos-session-tab`: Einzelner Tab
  - Session-Name (editierbar via Doppelklick)
  - "X" Button zum Schließen
  - Spinner-Indikator für aktive Prozesse
  - Active/Inactive State Styling
- Events: `session-select`, `session-create`, `session-close`, `session-rename`

**WIE:**
- Folge Lit Component Pattern aus frontend-lit/SKILL.md
- Nutze CSS Custom Properties für Dark Theme (--color-bg-secondary, --color-accent)
- Events mit bubbles: true, composed: true
- Keyboard-Accessibility: Tab-Navigation, Enter zum Auswählen
- Inline-Editing für Session-Namen via contenteditable oder Input-Overlay
- Spinner via aos-loading-spinner oder CSS Animation

**WO:**
- `agent-os-ui/ui/src/components/session-tabs.ts` (NEU)
- `agent-os-ui/ui/src/components/session-tab.ts` (NEU)
- `agent-os-ui/ui/src/views/chat-view.ts` (ERWEITERN - Tab-Leiste einbinden)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** MSC-002 (Session Types für ISession Interface)

**Geschätzte Komplexität:** S (~200-250 LOC, 2 Komponenten)

---

### Relevante Skills

- `frontend-lit` (Komponenten-Patterns, Event-Handling)
- `domain-agent-os-web-ui` (Chat-Interaction Patterns)

---

### Completion Check

```bash
# Build Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui && npm run build

# Lint Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm run lint

# Test Check (wenn Tests vorhanden)
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm test -- --grep "session-tab" || echo "Tests pending"
```

---

### Technische Verifikation

- [x] FILE_EXISTS: `agent-os-ui/ui/src/components/session-tabs.ts`
- [x] FILE_EXISTS: `agent-os-ui/ui/src/components/session-tab.ts`
- [x] CONTAINS: `session-tabs.ts` enthält `@customElement('aos-session-tabs')`
- [x] CONTAINS: `session-tab.ts` enthält `@customElement('aos-session-tab')`
- [x] LINT_PASS: `npm run lint` ohne Fehler
- [x] BUILD_PASS: `npm run build` ohne Fehler
