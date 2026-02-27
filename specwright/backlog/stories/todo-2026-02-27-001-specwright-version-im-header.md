# Installierte Specwright-Version im Header anzeigen

> Story ID: 2026-02-27-001
> Spec: Backlog Todo
> Created: 2026-02-27
> Last Updated: 2026-02-27

**Priority**: Low
**Type**: Frontend
**Estimated Effort**: 1 SP
**Dependencies**: None

---

## Feature

```gherkin
Feature: Specwright-Version im Header
  Als Benutzer
  möchte ich die installierte Specwright-Version im Header sehen,
  damit ich jederzeit weiß welche Framework-Version mein Projekt nutzt.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Version wird im Header angezeigt

```gherkin
Scenario: Installierte Version ist sichtbar
  Given ich habe ein Projekt mit installiertem Specwright geöffnet
  When die Seite geladen ist
  Then sehe ich die installierte Versionsnummer rechts oben im Header
  And die Version wird dezent neben den Header-Actions angezeigt
```

### Szenario 2: Keine Version verfügbar

```gherkin
Scenario: Projekt ohne installierte Version
  Given ich habe ein Projekt ohne installiertes Specwright geöffnet
  When die Seite geladen ist
  Then wird keine Versionsnummer im Header angezeigt
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [ ] CONTAINS: ui/frontend/src/app.ts enthält "version-label"
- [ ] CONTAINS: ui/frontend/src/styles/theme.css enthält ".version-label"

### Funktions-Prüfungen

- [ ] BUILD_PASS: cd ui/frontend && npm run build
- [ ] LINT_PASS: cd ui && npm run lint

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
- [x] **Alle betroffenen Layer identifiziert** (Frontend only)
- [x] **Integration Type bestimmt** (Frontend-only)
- [x] **Kritische Integration Points dokumentiert** (keine - Daten bereits vorhanden)
- [x] **Handover-Dokumente definiert** (nicht nötig - Single Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [ ] Code Review durchgeführt und genehmigt
- [ ] Keine Linting Errors

#### Dokumentation
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `aos-app` (app.ts) | Version-Label im Header-Actions-Bereich hinzufügen |
| Frontend | theme.css | Styling für `.version-label` hinzufügen |

**Kritische Integration Points:**
- Keine - `frameworkInstalledVersion` State existiert bereits in `aos-app` und wird via `/api/version` befüllt

---

### Technical Details

**WAS:**
- Neues `<span class="version-label">` Element im Header-Actions-Bereich von `aos-app`
- CSS-Klasse `.version-label` für dezentes Styling

**WIE (Architektur-Guidance ONLY):**
- Bestehenden `frameworkInstalledVersion` State nutzen (bereits via `checkFrameworkVersion()` befüllt)
- Conditional Rendering: nur anzeigen wenn `frameworkInstalledVersion` nicht leer
- Dezentes Styling: kleine Schriftgröße, sekundäre Textfarbe, passend zum bestehenden Header-Design
- Positionierung: als erstes Element in `header-actions` (vor Update-Badge und Terminal-Button)
- Format: `v3.6.0` (mit "v"-Prefix)

**WO:**
- `ui/frontend/src/app.ts` - Version-Label im Header-Template einfügen
- `ui/frontend/src/styles/theme.css` - `.version-label` Styling hinzufügen

**Domain:** Nicht relevant

**Abhängigkeiten:** None

**Geschätzte Komplexität:** XS

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
cd /Users/michaelsindlinger/Entwicklung/specwright && grep -q "version-label" ui/frontend/src/app.ts
cd /Users/michaelsindlinger/Entwicklung/specwright && grep -q "version-label" ui/frontend/src/styles/theme.css
cd /Users/michaelsindlinger/Entwicklung/specwright/ui/frontend && npm run build
cd /Users/michaelsindlinger/Entwicklung/specwright/ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle BUILD/LINT commands exit 0
3. Git diff zeigt nur erwartete Änderungen
