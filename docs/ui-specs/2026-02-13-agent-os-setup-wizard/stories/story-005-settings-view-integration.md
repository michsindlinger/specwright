# Settings View: Setup Tab Integration

> Story ID: SETUP-005
> Spec: AgentOS Extended Setup Wizard
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Status**: Done
**Dependencies**: SETUP-004

---

## Feature

```gherkin
Feature: Setup-Tab in den Settings
  Als Benutzer
  moechte ich den Setup Wizard ueber einen Tab in den Settings erreichen,
  damit ich die Installation bequem aus der bestehenden Settings-Seite starten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Tab sichtbar

```gherkin
Scenario: Setup-Tab ist in der Settings-Navigation sichtbar
  Given der Benutzer oeffnet die Settings-Seite
  Then ist ein "Setup" Tab neben den bestehenden Tabs sichtbar
  And der Tab ist nicht disabled
```

### Szenario 2: Tab-Navigation

```gherkin
Scenario: Klick auf Setup-Tab zeigt den Wizard
  Given der Benutzer ist auf der Settings-Seite
  When er auf den "Setup" Tab klickt
  Then wird der Setup Wizard angezeigt
  And die URL aendert sich auf #/settings/setup
```

### Szenario 3: Deep-Link

```gherkin
Scenario: Setup-Tab per Deep-Link erreichbar
  Given der Benutzer navigiert direkt zu #/settings/setup
  Then wird die Settings-Seite mit aktivem Setup-Tab geoeffnet
  And der Setup Wizard wird angezeigt
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Pruefungen

- [ ] CONTAINS: `settings-view.ts` enthaelt `'setup'` in SettingsSection Type
- [ ] CONTAINS: `settings-view.ts` enthaelt `aos-setup-wizard` Import
- [ ] CONTAINS: `settings-view.ts` enthaelt `<aos-setup-wizard>` Template

### Funktions-Pruefungen

- [ ] BUILD_PASS: `cd agent-os-ui/ui && npx tsc --noEmit` exits with code 0

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
- [x] **Alle betroffenen Layer identifiziert** (Frontend-only)
- [x] **Integration Type bestimmt** (Frontend-only)
- [x] **Kritische Integration Points dokumentiert** (keine)
- [x] **Handover-Dokumente definiert** (keine)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Code Review durchgefuehrt und genehmigt
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

#### Dokumentation
- [ ] Dokumentation aktualisiert

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only (minimal)

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | `agent-os-ui/ui/src/views/settings-view.ts` | SettingsSection Type + VALID_TABS + Tab-Button + Import + Case in renderContent() |

---

### Technical Details

**WAS:** Minimale Integration des Setup Wizards in die bestehende Settings-View.

**WIE (Architektur-Guidance ONLY):**

1. **Type erweitern (Zeile 27):**
   ```typescript
   type SettingsSection = 'models' | 'general' | 'appearance' | 'setup';
   ```

2. **VALID_TABS erweitern (Zeile 66):**
   ```typescript
   private readonly VALID_TABS: readonly SettingsSection[] = ['models', 'general', 'appearance', 'setup'] as const;
   ```

3. **Import hinzufuegen (am Anfang der Datei):**
   ```typescript
   import '../components/setup/aos-setup-wizard.js';
   ```

4. **Tab-Button hinzufuegen (in render(), nach Appearance Button):**
   - Neuer `<li>` mit Button "Setup", NICHT disabled
   - `@click=${() => this.handleSectionChange('setup')}`
   - Active-Class Pattern wie bestehende Tabs

5. **Case in renderContent() (nach appearance case):**
   ```typescript
   case 'setup':
     return html`<aos-setup-wizard></aos-setup-wizard>`;
   ```

**WO:**
- `agent-os-ui/ui/src/views/settings-view.ts`

**WER:** dev-team__frontend-developer

**Abhaengigkeiten:** SETUP-004 (Wizard-Komponente muss existieren)

**Geschaetzte Komplexitaet:** S (1 Datei, ~20 LOC Aenderungen)

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Relevante Skills

| Skill | Pfad | Relevanz |
|-------|------|----------|
| frontend-lit | `.claude/skills/frontend-lit/` | Lit Web Component Patterns |

---

### Completion Check

```bash
# Auto-Verify Commands

# 1. SettingsSection Type enthaelt 'setup'
grep -q "'setup'" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/views/settings-view.ts

# 2. Import vorhanden
grep -q "aos-setup-wizard" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/views/settings-view.ts

# 3. TypeScript kompiliert (Frontend)
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui && npx tsc --noEmit
```
