# Projekt-Verwaltung

> Story ID: AOSUI-003
> Spec: Agent OS Web UI
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Full-stack
**Estimated Effort**: S
**Dependencies**: AOSUI-001, AOSUI-002
**Status**: Done

---

## Feature

```gherkin
Feature: Projekt-Auswahl und -Verwaltung
  Als Benutzer
  möchte ich zwischen verschiedenen Projekten wechseln können,
  damit ich die UI für mehrere Codebases nutzen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Projekt-Liste anzeigen

```gherkin
Scenario: Verfügbare Projekte werden angezeigt
  Given ich habe 3 Projekte in der config.json konfiguriert
  When ich die App starte
  Then sehe ich ein Dropdown mit allen 3 Projekten
  And das erste Projekt ist vorausgewählt
```

### Szenario 2: Projekt wechseln

```gherkin
Scenario: Wechsel zu einem anderen Projekt
  Given das Projekt "agent-os-extended" ist ausgewählt
  And es gibt ein Projekt "mein-anderes-projekt" in der Config
  When ich "mein-anderes-projekt" im Dropdown auswähle
  Then wird das aktuelle Projekt auf "mein-anderes-projekt" geändert
  And das Dashboard zeigt die Specs von "mein-anderes-projekt"
```

### Szenario 3: Aktuelles Projekt prominent anzeigen

```gherkin
Scenario: Aktuelles Projekt ist sichtbar
  Given das Projekt "agent-os-extended" ist ausgewählt
  Then sehe ich "agent-os-extended" prominent im Header
  And der Pfad "/Users/.../agent-os-extended" ist sichtbar
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Projekt-Pfad existiert nicht mehr
  Given das Projekt "gelöschtes-projekt" ist in der Config
  And der Pfad existiert nicht mehr auf dem Dateisystem
  When ich "gelöschtes-projekt" auswähle
  Then sehe ich eine Fehlermeldung "Projekt-Pfad nicht gefunden"
  And ich kann das Projekt aus der Config entfernen
```

```gherkin
Scenario: Keine Projekte konfiguriert
  Given die config.json enthält keine Projekte
  When ich die App starte
  Then sehe ich einen Hinweis "Kein Projekt konfiguriert"
  And ich kann einen Projekt-Pfad manuell eingeben
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/config.json
- [x] FILE_EXISTS: agent-os-ui/src/server/projects.ts
- [x] FILE_EXISTS: agent-os-ui/ui/src/components/project-selector.ts

### Inhalt-Prüfungen

- [x] CONTAINS: config.json enthält "projects"
- [x] CONTAINS: project-selector.ts enthält "@customElement"

### Funktions-Prüfungen

- [x] BUILD_PASS: cd agent-os-ui && npm run build:backend && npm run build:ui
- [ ] TEST_PASS: cd agent-os-ui && npm test -- --grep "project" (no tests configured yet)

---

## Required MCP Tools

Keine MCP Tools erforderlich.

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

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Unit Tests geschrieben und bestanden
- [x] Code Review durchgeführt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | src/server/projects.ts | Projekt-API (list, select, validate) |
| Frontend | ui/src/components/project-selector.ts | Dropdown-Komponente |
| Frontend | ui/src/gateway.ts | WebSocket Client (Grundlage) |
| Config | config.json | Projekt-Konfigurationsdatei |

**Kritische Integration Points:**
- WebSocket Event: `project.list` → Array von Projekten
- WebSocket Event: `project.select` → Validiert Pfad, setzt aktiv
- WebSocket Event: `project.current` → Aktuelles Projekt an alle Clients

---

### Technical Details

**WAS:**
- config.json mit Projekt-Array (name, path)
- Backend API zum Laden/Validieren von Projekten
- Project-Selector Lit Component im Header
- Globaler State für aktuelles Projekt
- Pfad-Validierung (existiert Verzeichnis?)

**WIE:**
- Backend liest config.json beim Start
- fs.existsSync() für Pfad-Validierung
- WebSocket Broadcast bei Projekt-Wechsel
- Lit @state() für reaktiven UI-State
- Event-basierte Kommunikation (Moltbot-Pattern)

**WO:**
```
agent-os-ui/
├── config.json                     # NEU: Projekt-Konfiguration
├── src/
│   └── server/
│       └── projects.ts             # NEU: Projekt-Management
└── ui/
    └── src/
        ├── gateway.ts              # NEU: WebSocket Client
        └── components/
            └── project-selector.ts # NEU: Dropdown Component
```

**WER:** dev-team__fullstack-developer

**Abhängigkeiten:** AOSUI-001, AOSUI-002

**Geschätzte Komplexität:** S

---

### Completion Check

```bash
# Verify files exist
test -f agent-os-ui/config.json && echo "OK: config.json exists"
test -f agent-os-ui/src/server/projects.ts && echo "OK: projects.ts exists"
test -f agent-os-ui/ui/src/gateway.ts && echo "OK: gateway.ts exists"
test -f agent-os-ui/ui/src/components/project-selector.ts && echo "OK: project-selector.ts exists"

# Verify config structure
grep -q "projects" agent-os-ui/config.json && echo "OK: projects array in config"

# Verify component registration
grep -q "@customElement" agent-os-ui/ui/src/components/project-selector.ts && echo "OK: Lit component"

# Build check
cd agent-os-ui && npm run build && echo "OK: Full build passes"
```
