# Tab-Navigation Component

> Story ID: MPRO-001
> Spec: multi-project-support
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: None
**Status**: Done

---

## Feature

```gherkin
Feature: Projekt-Tab-Navigation
  Als Entwickler
  möchte ich eine Tab-Leiste im Header sehen, die meine geöffneten Projekte anzeigt,
  damit ich schnell zwischen Projekten wechseln kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Tab-Leiste wird angezeigt

```gherkin
Scenario: Tab-Leiste zeigt geöffnete Projekte
  Given ich habe das Projekt "agent-os-web-ui" geöffnet
  When ich die Anwendung lade
  Then sehe ich eine Tab-Leiste unterhalb des Headers
  And ich sehe einen Tab mit dem Namen "agent-os-web-ui"
  And der Tab ist als aktiv markiert (visuell hervorgehoben)
```

### Szenario 2: Aktiver Tab wechseln

```gherkin
Scenario: Projekt wechseln durch Tab-Klick
  Given ich habe die Projekte "agent-os-web-ui" und "my-other-project" geöffnet
  And "agent-os-web-ui" ist der aktive Tab
  When ich auf den Tab "my-other-project" klicke
  Then wird "my-other-project" als aktiver Tab markiert
  And "agent-os-web-ui" ist nicht mehr als aktiv markiert
```

### Szenario 3: Tab schließen

```gherkin
Scenario: Projekt-Tab schließen
  Given ich habe die Projekte "agent-os-web-ui" und "my-other-project" geöffnet
  When ich auf das Schließen-Symbol (X) des Tabs "my-other-project" klicke
  Then wird der Tab "my-other-project" entfernt
  And ich sehe nur noch den Tab "agent-os-web-ui"
```

### Szenario 4: Plus-Icon für neues Projekt

```gherkin
Scenario: Plus-Icon öffnet Add-Dialog
  Given ich sehe die Tab-Leiste
  When ich auf das Plus-Icon klicke
  Then öffnet sich der "Projekt hinzufügen" Dialog
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Letztes Projekt schließen
  Given ich habe nur das Projekt "agent-os-web-ui" geöffnet
  When ich auf das Schließen-Symbol (X) des Tabs klicke
  Then wird der Tab entfernt
  And ich sehe einen Platzhalter-Zustand "Kein Projekt geöffnet"
  And ich sehe einen Button "Projekt öffnen"
```

```gherkin
Scenario: Viele Tabs überlaufen
  Given ich habe 10 Projekte geöffnet
  When die Tab-Leiste nicht genug Platz hat
  Then werden die Tabs horizontal scrollbar
  And ich kann alle Tabs durch Scrollen erreichen
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/src/components/aos-project-tabs.ts
- [x] FILE_EXISTS: agent-os-ui/ui/src/styles/aos-project-tabs.css (Styles in theme.css instead)

### Inhalt-Prüfungen

- [x] CONTAINS: agent-os-ui/ui/src/components/aos-project-tabs.ts enthält "class AosProjectTabs extends LitElement"
- [x] CONTAINS: agent-os-ui/ui/src/components/aos-project-tabs.ts enthält "@customElement('aos-project-tabs')"

### Funktions-Prüfungen

- [x] LINT_PASS: npm run lint exits with code 0
- [x] TEST_PASS: npm run test -- --filter="aos-project-tabs" exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **Ausgefüllt:** 2026-01-30

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
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-project-tabs | Neu erstellen |
| Frontend | app.ts | Integration der Tab-Komponente |
| Frontend | theme.css | Styling für Tab-Navigation |

**Kritische Integration Points:**
- Keine (rein Frontend-Komponente, kommuniziert via CustomEvents)

---

### Technical Details

**WAS:**
- Neue Lit-Komponente `aos-project-tabs` für Tab-Navigation
- Tab-Darstellung mit Projekt-Name, aktiv-Status, Schließen-Button
- Plus-Icon zum Hinzufügen neuer Projekte
- Horizontales Scrolling bei vielen Tabs
- Platzhalter-Zustand wenn keine Projekte geöffnet

**WIE (Architektur-Guidance ONLY):**
- Lit Web Component mit `@customElement('aos-project-tabs')` Decorator
- Verwende `@property()` für `projects` Array und `activeProjectId`
- Verwende `@state()` für interne UI-Zustände (z.B. Scroll-Position)
- CustomEvents für Kommunikation: `tab-select`, `tab-close`, `add-project`
- CSS Custom Properties aus theme.css für konsistentes Styling
- `repeat()` Directive für performante Tab-Listen
- Keyboard-Navigation (Tab, Arrow Keys) für Accessibility

**WO:**
- `agent-os-ui/ui/src/components/aos-project-tabs.ts` (Neu)
- `agent-os-ui/ui/src/styles/aos-project-tabs.css` (Neu, optional - kann in Komponente)
- `agent-os-ui/ui/src/app.ts` (Anpassen - Integration)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** S

**Relevante Skills:**
- `frontend-lit` - Lit-Komponenten-Patterns und Event-Handling
- `quality-gates` - Accessibility-Checkliste (Keyboard-Navigation)

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| `aos-project-tabs` | UI Component | `agent-os-ui/ui/src/components/aos-project-tabs.ts` | Tab-Navigation Komponente für Multi-Projekt-Ansicht |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f agent-os-ui/ui/src/components/aos-project-tabs.ts && echo "Component exists"
grep -q "class AosProjectTabs extends LitElement" agent-os-ui/ui/src/components/aos-project-tabs.ts
grep -q "@customElement('aos-project-tabs')" agent-os-ui/ui/src/components/aos-project-tabs.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run test -- --filter="aos-project-tabs"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
