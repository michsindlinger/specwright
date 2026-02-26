# Navigation & Routing

> Story ID: TEAM-002
> Spec: Dev-Team Visualization
> Created: 2026-02-25
> Last Updated: 2026-02-25

**Priority**: High
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: None

---

## Feature

```gherkin
Feature: Team-Navigation und Routing
  Als Entwickler
  möchte ich über die Seitenleiste zur Team-Seite navigieren können,
  damit ich mein Agent-Team schnell überblicken kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Team-Menüpunkt in Seitenleiste

```gherkin
Scenario: Team-Menüpunkt ist in der Navigation sichtbar
  Given ich bin in der Specwright Web UI
  When ich die Seitenleiste betrachte
  Then sehe ich einen Menüpunkt "Team"
  And er befindet sich zwischen "Dashboard" und "Getting Started"
  And er hat ein passendes Icon
```

### Szenario 2: Navigation zur Team-Seite

```gherkin
Scenario: Klick auf Team navigiert zur Team-Seite
  Given ich bin auf der Dashboard-Seite
  When ich auf den Menüpunkt "Team" klicke
  Then wechselt die URL zu /#team
  And die Team-Seite wird angezeigt
  And der Seitentitel zeigt "Team"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Direkter URL-Zugriff auf Team-Seite
  Given ich öffne die Web UI mit dem Hash /#team
  When die Seite geladen wird
  Then wird die Team-Seite direkt angezeigt
  And der "Team" Menüpunkt ist aktiv markiert
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [x] CONTAINS: ui/frontend/src/types/route.types.ts enthält "'team'"
- [x] CONTAINS: ui/frontend/src/app.ts enthält "aos-team-view"
- [x] CONTAINS: ui/frontend/src/app.ts enthält "'Team'"

### Funktions-Prüfungen

- [x] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0

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
- [x] Kritische Integration Points dokumentiert
- [x] Handover-Dokumente definiert

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | route.types.ts | Erweitern: 'team' zu ViewType und VALID_VIEWS |
| Frontend | app.ts | Erweitern: Import, NavItem, Icon, Route-Rendering, Page-Title |

---

### Technical Details

**WAS:** ViewType um 'team' erweitern, NavItem "Team" in die Seitenleiste einfügen, Route-Rendering für Team-View hinzufügen.

**WIE (Architektur-Guidance ONLY):**
- Folge dem bestehenden Pattern für NavItems in app.ts
- Team-Icon als SVG inline (Users/People Icon), konsistent mit bestehenden Icons
- ViewType erweitern (Union Type + VALID_VIEWS Array)
- `renderView()` Case für 'team' hinzufügen
- `getPageTitle()` Mapping für 'team' hinzufügen

**WO:**
- ÄNDERN: `ui/frontend/src/types/route.types.ts`
- ÄNDERN: `ui/frontend/src/app.ts`

**Abhängigkeiten:** None

**Geschätzte Komplexität:** XS

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns und Navigation |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify route type extended
grep -q "'team'" ui/frontend/src/types/route.types.ts && echo "team route type exists"

# Verify nav item in app.ts
grep -q "Team" ui/frontend/src/app.ts && echo "Team nav item exists"

# Verify view rendering
grep -q "aos-team-view" ui/frontend/src/app.ts && echo "team view rendering exists"

# Verify frontend compiles
cd ui/frontend && npm run build
```

**Story ist DONE wenn:**
1. 'team' in ViewType und VALID_VIEWS vorhanden
2. NavItem "Team" in Seitenleiste sichtbar
3. Route-Rendering für aos-team-view funktioniert
4. Frontend kompiliert fehlerfrei
