# Verwaiste Referenzen & Edge Cases

> Story ID: MCP-004
> Spec: MCP Tools Management
> Created: 2026-02-27
> Last Updated: 2026-02-27

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: MCP-002, MCP-003

---

## Feature

```gherkin
Feature: Warnungen bei verwaisten MCP-Tool-Referenzen
  Als Entwickler
  moechte ich gewarnt werden wenn ein Skill ein MCP-Tool referenziert das nicht mehr existiert,
  damit ich veraltete Konfigurationen erkennen und bereinigen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Warnung in der Team-Card

```gherkin
Scenario: Warnung-Badge fuer verwaistes MCP-Tool in der Card
  Given ein Skill hat mcpTools: [perplexity, removed-tool] zugewiesen
  And "removed-tool" existiert nicht mehr in `.mcp.json`
  When ich die Team-View sehe
  Then zeigt die Skill-Karte ein Warnung-Badge fuer "removed-tool"
  And das Badge zeigt "MCP Tool nicht verfuegbar"
```

### Szenario 2: Warnung im Detail-Modal

```gherkin
Scenario: Warnung fuer verwaistes MCP-Tool im Detail-Modal
  Given ein Skill hat mcpTools: [removed-tool] zugewiesen
  And "removed-tool" existiert nicht mehr in `.mcp.json`
  When ich das Detail-Modal oeffne
  Then sehe ich eine Warnung "MCP Tool nicht verfuegbar" neben "removed-tool"
```

### Szenario 3: Fehlerhafte .mcp.json

```gherkin
Scenario: Fehlermeldung bei invalider MCP-Konfiguration
  Given die `.mcp.json` enthaelt invalides JSON
  When ich die Team-View oeffne
  Then zeigt die MCP-Sektion eine Fehlermeldung
  And die restliche Team-View funktioniert weiterhin normal
```

### Szenario 4: Leere MCP-Konfiguration

```gherkin
Scenario: Hinweis bei fehlender mcpServers-Property
  Given die `.mcp.json` existiert aber hat keine "mcpServers" Property
  When ich die Team-View oeffne
  Then zeigt die MCP-Sektion einen Hinweis "Keine MCP-Server konfiguriert"
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Pruefungen

- [ ] CONTAINS: ui/frontend/src/components/team/aos-team-card.ts enthaelt "availableMcpTools"
- [ ] CONTAINS: ui/frontend/src/views/team-view.ts enthaelt Fehlerbehandlung fuer MCP-Daten

### Funktions-Pruefungen

- [ ] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0

---

## Required MCP Tools

Keine MCP-Tools erforderlich.

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
- [x] Erforderliche MCP Tools dokumentiert (keine erforderlich)
- [x] Story ist angemessen geschaetzt (3 Dateien, ~80 LOC)

#### Full-Stack Konsistenz
- [x] **Alle betroffenen Layer identifiziert** (Frontend-only)
- [x] **Integration Type bestimmt** (Frontend-only)
- [x] **Kritische Integration Points dokumentiert** (n/a - reine UI-Logik)
- [x] **Handover-Dokumente definiert** (n/a)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Verwaist-Warnungen in Card und Detail-Modal sichtbar
- [ ] Fehlermeldung bei invalider .mcp.json in MCP-Sektion

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Frontend Build erfolgreich

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | aos-team-card.ts | Verwaiste-Referenz-Warnung-Badge |
| Frontend | aos-team-detail-modal.ts | Verwaiste-Referenz-Warnung |
| Frontend | team-view.ts | Fehlerzustaende fuer fehlende/fehlerhafte .mcp.json |

---

### Technical Details

**WAS:**
1. Erweiterung `aos-team-card.ts`: Verwaist-Check fuer MCP-Tool-Badges. Wenn ein Tool aus `skill.mcpTools` NICHT in `availableMcpTools` enthalten ist, wird das Badge mit Warnung-Styling dargestellt (z.B. roter/orangener Badge mit Tooltip "MCP Tool nicht verfuegbar").
2. Erweiterung `aos-team-detail-modal.ts`: Gleicher Verwaist-Check in der MCP-Tools-Anzeige mit Warnung-Text.
3. Erweiterung `team-view.ts`: Fehlerbehandlung in der MCP-Sektion - Fehlermeldung bei API-Fehler, Hinweis bei leerer MCP-Config. Die restliche Team-View bleibt unberuehrt.

**WIE (Architektur-Guidance ONLY):**
- Verwaist-Check ist reine Frontend-Logik: `skill.mcpTools.filter(tool => !availableMcpTools.includes(tool))` ergibt die verwaisten Tools
- `aos-team-card.ts` bekommt bereits `availableMcpTools: string[]` als Property (MCP-003). Der Verwaist-Check ergaenzt die bestehende Badge-Renderlogik
- Warnung-Badge-Styling: Eigene CSS-Klasse (z.B. `.mcp-badge--orphaned`) mit Warnung-Farbe (Orange/Rot aus dem bestehenden Farbsystem)
- `team-view.ts` Fehlerbehandlung: Die `loadMcpConfig()`-Methode (aus MCP-002) setzt bei Fehlern einen Error-State. Die MCP-Sektion rendert basierend auf diesem State: Fehler -> Fehlermeldung, leer -> Hinweis, Daten -> Karten
- Die Fehlerbehandlung in der MCP-Sektion darf NICHT die Skills-Anzeige beeinflussen (unabhaengiger State)

**WO:**
- `ui/frontend/src/components/team/aos-team-card.ts` - Verwaist-Badge-Logik
- `ui/frontend/src/components/team/aos-team-detail-modal.ts` - Verwaist-Warnung
- `ui/frontend/src/styles/theme.css` - CSS fuer Warnung-Badge (`.mcp-badge--orphaned`)

**Abhaengigkeiten:** MCP-002 (MCP-Daten in team-view), MCP-003 (MCP-Badges in Card/Modal)

**Geschaetzte Komplexitaet:** XS

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns und Conditional Rendering |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
grep -q "availableMcpTools" ui/frontend/src/components/team/aos-team-card.ts
cd ui/frontend && npm run build
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
