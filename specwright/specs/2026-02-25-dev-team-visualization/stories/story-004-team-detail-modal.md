# Team Detail Modal

> Story ID: TEAM-004
> Spec: Dev-Team Visualization
> Created: 2026-02-25
> Last Updated: 2026-02-25

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: TEAM-003

---

## Feature

```gherkin
Feature: Skill-Detail-Modal
  Als Entwickler
  möchte ich die vollständigen Details eines Skills in einem Modal sehen,
  damit ich den Skill-Inhalt und die Learnings einsehen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Modal öffnet mit Skill-Details

```gherkin
Scenario: Detail-Modal zeigt vollständigen Skill-Inhalt
  Given ich bin auf der Team-Seite
  And ich sehe eine Skill-Karte "Frontend Lit"
  When ich auf die Karte klicke
  Then öffnet sich ein Modal-Overlay
  And ich sehe den vollständigen SKILL.md-Inhalt
  And ich sehe den Skill-Namen im Header
  And ich sehe die Kategorie als Badge
```

### Szenario 2: Learnings-Tab anzeigen

```gherkin
Scenario: Modal zeigt Dos-and-Donts Learnings
  Given das Detail-Modal ist geöffnet für einen Skill
  And der Skill hat 3 Learnings in dos-and-donts.md
  When ich den "Learnings" Tab auswähle
  Then sehe ich die 3 Learnings-Einträge
```

### Szenario 3: Modal schließen

```gherkin
Scenario: Modal wird geschlossen
  Given das Detail-Modal ist geöffnet
  When ich den Close-Button klicke
  Then wird das Modal geschlossen
  And ich bin wieder auf der Team-Übersichtsseite

Scenario: Modal schließen mit Escape-Taste
  Given das Detail-Modal ist geöffnet
  When ich die Escape-Taste drücke
  Then wird das Modal geschlossen
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Skill ohne Learnings
  Given ein Skill hat keine dos-and-donts.md
  When ich das Detail-Modal öffne
  Then zeigt der Learnings-Tab "Keine Learnings vorhanden"
  And es tritt kein Fehler auf

Scenario: Laden der Detail-Daten
  Given ich klicke auf eine Skill-Karte
  When die Detail-Daten noch geladen werden
  Then sehe ich einen Ladezustand im Modal
  And nach dem Laden sehe ich den vollständigen Inhalt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: ui/frontend/src/components/team/aos-team-detail-modal.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: ui/frontend/src/components/team/aos-team-detail-modal.ts enthält "modal-close"
- [ ] CONTAINS: ui/frontend/src/components/team/aos-team-detail-modal.ts enthält "/api/team"
- [ ] CONTAINS: ui/frontend/src/views/aos-team-view.ts enthält "aos-team-detail-modal"

### Funktions-Prüfungen

- [ ] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0

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
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-team-detail-modal.ts | Neue Komponente: Modal mit Skill-Details und Tabs |
| Frontend | aos-team-view.ts | Änderung: Modal-Integration (Property Binding, Event Handling) |

**Kritische Integration Points:**
- aos-team-detail-modal → team.routes.ts: HTTP fetch() für Skill-Detail (API aus TEAM-001)
- aos-team-view → aos-team-detail-modal: Property Binding `.open`, `.skillId`
- aos-team-detail-modal → aos-team-view: Custom Event `@modal-close`

---

### Technical Details

**WAS:** Detail-Modal-Komponente (aos-team-detail-modal) mit Tabs für Skill-Inhalt und Learnings. Integration in aos-team-view.

**WIE (Architektur-Guidance ONLY):**
- Folge Pattern von `aos-installation-wizard-modal.ts` (Modal mit Open/Close)
- Light DOM Pattern
- Lazy Loading: Detail-Daten erst bei Modal-Öffnung laden
- Tabs: "Skill" (SKILL.md Inhalt) und "Learnings" (dos-and-donts.md)
- SKILL.md-Inhalt initial als `<pre>` mit Whitespace-Preservation
- Escape-Taste zum Schließen via Keyboard-Event
- Modal-Overlay mit z-index und Click-Outside-to-Close

**WO:**
- NEU: `ui/frontend/src/components/team/aos-team-detail-modal.ts`
- ÄNDERN: `ui/frontend/src/views/aos-team-view.ts` (Modal-Integration)

**Abhängigkeiten:** TEAM-003 (Team View)

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns, Modal, Events |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-team-detail-modal | UI Component | ui/frontend/src/components/team/aos-team-detail-modal.ts | Skill-Detail-Modal mit Tabs |

---

### Completion Check

```bash
# Verify file exists
test -f ui/frontend/src/components/team/aos-team-detail-modal.ts && echo "modal exists"

# Verify modal integration in view
grep -q "aos-team-detail-modal" ui/frontend/src/views/aos-team-view.ts && echo "modal integrated"

# Verify modal-close event
grep -q "modal-close" ui/frontend/src/components/team/aos-team-detail-modal.ts && echo "close event exists"

# Verify API call in modal
grep -q "/api/team" ui/frontend/src/components/team/aos-team-detail-modal.ts && echo "API call exists"

# Verify frontend compiles
cd ui/frontend && npm run build
```

**Story ist DONE wenn:**
1. Modal öffnet bei Karten-Klick mit Detail-Daten
2. Tabs für Skill-Inhalt und Learnings funktionieren
3. Modal schließt via Close-Button und Escape-Taste
4. Frontend kompiliert fehlerfrei
