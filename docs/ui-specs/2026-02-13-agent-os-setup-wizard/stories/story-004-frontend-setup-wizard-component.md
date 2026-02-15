# Frontend Setup Wizard Komponente

> Story ID: SETUP-004
> Spec: AgentOS Extended Setup Wizard
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: L
**Status**: Done
**Dependencies**: SETUP-003

---

## Feature

```gherkin
Feature: Setup Wizard UI Komponente
  Als Benutzer
  moechte ich einen visuellen Step-by-Step Wizard sehen,
  damit ich den Installationsstatus verstehe und Schritte per Klick ausfuehren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Status-Anzeige beim Laden

```gherkin
Scenario: Setup Wizard zeigt Installationsstatus an
  Given der Benutzer oeffnet den Setup-Tab in den Settings
  When die Komponente geladen wird
  Then werden alle 4 Schritte mit ihrem aktuellen Status angezeigt
  And installierte Schritte zeigen einen gruenen Status-Indikator
  And nicht installierte Schritte zeigen einen grauen Status-Indikator
```

### Szenario 2: Schritt ausfuehren mit Live-Output

```gherkin
Scenario: Benutzer fuehrt einen Installations-Schritt aus
  Given Schritt 1 ist als "not_installed" markiert
  When der Benutzer auf den "Install" Button klickt
  Then wird ein Output-Bereich unterhalb des Schritts angezeigt
  And der Live-Output des Shell-Prozesses wird in Echtzeit angezeigt
  And der Schritt zeigt einen Spinner waehrend der Ausfuehrung
```

### Szenario 3: Erfolgreicher Abschluss

```gherkin
Scenario: Schritt wird erfolgreich abgeschlossen
  Given ein Installations-Schritt laeuft
  When der Shell-Prozess erfolgreich endet
  Then wechselt der Status auf "installed" (gruener Haken)
  And der Output-Bereich zeigt "Step completed successfully"
```

### Szenario 4: Fehler mit Retry

```gherkin
Scenario: Schritt schlaegt fehl mit Retry-Option
  Given ein Installations-Schritt laeuft
  When der Shell-Prozess mit einem Fehler endet
  Then wechselt der Status auf "error" (roter Indikator)
  And ein "Retry" Button wird angezeigt
```

### Szenario 5: DevTeam via Cloud Terminal

```gherkin
Scenario: DevTeam-Setup oeffnet Cloud Terminal
  Given die Schritte 1-3 sind installiert
  When der Benutzer auf "Start DevTeam Setup" klickt
  Then wird eine Cloud Terminal Session geoeffnet
  And der Wizard zeigt einen Hinweis dass die Cloud Terminal Sidebar geoeffnet wurde
```

### Szenario 6: Alle Schritte abgeschlossen

```gherkin
Scenario: Setup Complete Anzeige
  Given alle 4 Schritte sind als "installed" markiert
  Then zeigt der Wizard eine "Setup Complete" Nachricht an
  And alle Schritte haben gruene Status-Indikatoren
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Pruefungen

- [ ] CONTAINS: `aos-setup-wizard.ts` enthaelt `@customElement('aos-setup-wizard')`
- [ ] CONTAINS: `aos-setup-wizard.ts` enthaelt `setup:check-status` Gateway Message
- [ ] CONTAINS: `aos-setup-wizard.ts` enthaelt `setup:run-step` Gateway Message
- [ ] CONTAINS: `aos-setup-wizard.ts` enthaelt `createRenderRoot`

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
- [x] **Integration Type bestimmt** (Frontend-only, nutzt Backend Messages)
- [x] **Kritische Integration Points dokumentiert** (WebSocket Message-Types von Story 3)
- [x] **Handover-Dokumente definiert** (Komponenten-Tag fuer Story 5)

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

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | `agent-os-ui/ui/src/components/setup/aos-setup-wizard.ts` (NEU) | Neue Lit Web Component mit Step-Anzeige, Status-Checks, Shell-Output, Cloud Terminal Integration |

**Handover an nachfolgende Stories:**
- SETUP-005 (Settings Integration) importiert und rendert `<aos-setup-wizard>`

---

### Technical Details

**WAS:** Lit Web Component die einen visuellen Step-by-Step Wizard fuer die AgentOS Extended Installation darstellt.

**WIE (Architektur-Guidance ONLY):**

1. **Komponenten-Grundstruktur:**
   - `@customElement('aos-setup-wizard')` mit Light DOM (`createRenderRoot() { return this; }`)
   - V2 Pattern: `@state()` Decorators fuer reaktiven State
   - Gateway-Handler im `connectedCallback()` registrieren, in `disconnectedCallback()` entfernen

2. **State:**
   ```typescript
   @state() private steps: SetupStepInfo[] = [];  // 4 Steps mit Status
   @state() private activeStep: number | null = null;  // Laufender Step (1-4)
   @state() private output: string = '';  // Live-Output Buffer
   @state() private loading = true;  // Initial-Load
   @state() private error: string | null = null;
   ```

3. **Gateway Handler registrieren:**
   - `setup:status` → `steps` Array aktualisieren, `loading = false`
   - `setup:step-output` → `output += data`, Auto-Scroll
   - `setup:step-complete` → Step-Status aktualisieren, `activeStep = null`, ggf. Status neu laden
   - `setup:error` → Fehlermeldung anzeigen
   - `cloud-terminal:created` → Hinweis "Cloud Terminal geoeffnet" anzeigen (wenn von Setup getriggert)

4. **Render-Struktur:**
   - Container `div.setup-wizard`
   - Header: "AgentOS Extended Setup" mit Beschreibungstext
   - Step-Liste: 4 Karten/Zeilen mit Status-Indikator, Name, Beschreibung, Action-Button
   - Output-Bereich: `pre.setup-output` mit monospace Font, Auto-Scroll, max-height mit Overflow
   - "Setup Complete" Banner wenn alle Steps `installed`

5. **Step-Karte Render:**
   - Status-Icon: Grauer Kreis (not_installed), Gruener Haken (installed), Spinner (running), Rotes X (error)
   - Step-Name und Kurzbeschreibung
   - Action-Button: "Install" (Steps 1-3), "Open Cloud Terminal" (Step 4), "Retry" (bei Error)
   - Button disabled wenn ein anderer Step laeuft

6. **Actions:**
   - `runStep(step)`: `gateway.send({ type: 'setup:run-step', step })`, `activeStep = step`, `output = ''`
   - `startDevteam()`: `gateway.send({ type: 'setup:start-devteam' })`, Hinweis-Text anzeigen
   - `checkStatus()`: `gateway.send({ type: 'setup:check-status' })`
   - `refreshStatus()`: Erneuter Status-Check nach Step-Complete

7. **Styling:**
   - CSS Klassen im bestehenden Theme (theme.css Custom Properties)
   - `.setup-wizard`, `.setup-step`, `.setup-step-status`, `.setup-output`
   - Status-Farben: `--color-accent-primary` (installed), `--color-accent-error` (error), `--color-text-secondary` (not_installed)

**WO:**
- `agent-os-ui/ui/src/components/setup/aos-setup-wizard.ts` (NEU)

**WER:** dev-team__frontend-developer

**Abhaengigkeiten:** SETUP-003 (Backend WS Handler muss die Messages verarbeiten)

**Geschaetzte Komplexitaet:** L (1 neue Datei, ~350 LOC, UI + Gateway Integration)

---

### Creates Reusable Artifacts

**Creates Reusable:** yes - `<aos-setup-wizard>` Komponente wird in Settings-View eingebettet

---

### Relevante Skills

| Skill | Pfad | Relevanz |
|-------|------|----------|
| frontend-lit | `.claude/skills/frontend-lit/` | Lit Web Component Patterns |

---

### Completion Check

```bash
# Auto-Verify Commands

# 1. Datei existiert
test -f /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/components/setup/aos-setup-wizard.ts

# 2. Custom Element registriert
grep -q "aos-setup-wizard" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/components/setup/aos-setup-wizard.ts

# 3. Gateway Messages verwendet
grep -q "setup:check-status" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/components/setup/aos-setup-wizard.ts
grep -q "setup:run-step" /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui/src/components/setup/aos-setup-wizard.ts

# 4. TypeScript kompiliert (Frontend)
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui && npx tsc --noEmit
```
