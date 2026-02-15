# Model Selection Integration

> Story ID: CCT-005
> Spec: Cloud Code Terminal
> Created: 2026-02-05
> Last Updated: 2026-02-05
> Status: Done

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: 2 SP
**Dependencies**: CCT-002

---

## Feature

```gherkin
Feature: Model Selection Integration
  Als Entwickler
  möchte ich beim Starten einer neuen Terminal-Session ein Modell aus allen konfigurierten Providern auswählen,
  damit ich das passende Modell für meine Aufgabe verwenden kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Alle Provider-Modelle anzeigen

```gherkin
Scenario: Alle konfigurierten Provider-Modelle werden angezeigt
  Given ich habe Provider konfiguriert (z.B. Anthropic, OpenRouter)
  When ich auf "Neue Session" klicke
  Then öffnet sich der Modell-Auswahl-Dialog
  And ich sehe alle verfügbaren Modelle gruppiert nach Provider
  And jedes Modell zeigt Name und Provider an
```

### Szenario 2: Modell auswählen und Session starten

```gherkin
Scenario: Modell wird ausgewählt und Session gestartet
  Given der Modell-Auswahl-Dialog ist geöffnet
  When ich ein Modell auswähle (z.B. "Claude Sonnet")
  And ich auf "Session starten" klicke
  Then wird die Session mit dem ausgewählten Modell gestartet
  And der Dialog schließt sich
  And ein neuer Tab mit dem Modell-Namen wird erstellt
```

### Szenario 3: Standard-Modell vorauswählen

```gherkin
Scenario: Letztes verwendetes Modell ist vorausgewählt
  Given ich habe bereits eine Session mit "Claude Opus" gestartet
  When ich eine neue Session starten möchte
  Then ist "Claude Opus" im Dialog vorausgewählt
  And ich kann es ändern oder direkt bestätigen
```

### Edge Case: Keine Provider konfiguriert

```gherkin
Scenario: Keine Provider konfiguriert
  Given ich habe keine Provider in der Konfiguration
  When ich auf "Neue Session" klicke
  Then wird ein Empty-State angezeigt: "Keine Provider konfiguriert"
  And ein Link zur Konfiguration wird angezeigt
  And der "Session starten" Button ist deaktiviert
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts

### Inhalt-Prüfungen

- [x] CONTAINS: agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts enthält "providers"
- [x] CONTAINS: agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts enthält "model"
- [x] CONTAINS: agent-os-ui/ui/src/services/cloud-terminal.service.ts enthält "getConfiguredProviders" OR "fetchProviders"

### Funktions-Prüfungen

- [x] LINT_PASS: cd agent-os-ui && npm run lint
- [x] BUILD_PASS: cd agent-os-ui && npm run build

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | No |

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

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** (Frontend/Backend/Database/DevOps)
- [x] **Integration Type bestimmt** (Backend-only/Frontend-only/Full-stack)
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer: API Contracts, Data Structures)

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

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-model-dropdown (NEW) | Model selection component |
| Frontend | CloudTerminalService (MODIFY) | Fetch providers, store last used model |

**Kritische Integration Points:**
- aos-model-dropdown → CloudTerminalService: Provider fetching
- aos-model-dropdown → Backend: Provider config loading

---

### Technical Details

**WAS:**
- aos-model-dropdown Component für Modell-Auswahl
- Integration mit bestehender Provider-Konfiguration
- Speicherung des zuletzt verwendeten Modells

**WIE (Architektur-Guidance ONLY):**
- Reuse Logik aus model-selector.ts für Provider-Fetching
- Nutze bestehenden ConfigService für Provider-Konfiguration
- Speichere lastUsedModel im CloudTerminalService (nicht persistieren, nur Session)
- Dropdown: Gruppiere Modelle nach Provider (wie in Workflow-Modell-Auswahl)

**WO:**
- agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts (NEW - erweitert CCT-003)
- agent-os-ui/ui/src/services/cloud-terminal.service.ts (MODIFY)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** CCT-002

**Geschätzte Komplexität:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-ui-component-architecture | agent-os/skills/frontend-ui-component-architecture.md | Dropdown component |
| frontend-api-bridge-building | agent-os/skills/frontend-api-bridge-building.md | Provider config fetching |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| - | - | - | - |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "providers\|model" agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts
grep -q "getConfiguredProviders\|fetchProviders" agent-os-ui/ui/src/services/cloud-terminal.service.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
