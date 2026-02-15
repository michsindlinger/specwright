# Provider Configuration

> Story ID: MODSEL-002
> Spec: chat-model-selection
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: High
**Type**: Backend
**Estimated Effort**: S (2 SP)
**Dependencies**: None

---

## Feature

```gherkin
Feature: Provider-Konfiguration mit CLI-Templates
  Als Entwickler
  möchte ich LLM-Provider mit konfigurierbaren CLI-Befehlen definieren,
  damit ich verschiedene Backends (Anthropic, GLM) flexibel nutzen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Default-Provider sind vorkonfiguriert

```gherkin
Scenario: Anthropic und GLM sind standardmäßig konfiguriert
  Given die Anwendung wird gestartet
  When die Konfiguration geladen wird
  Then sind Anthropic-Provider mit Opus, Sonnet, Haiku verfügbar
  And GLM-Provider mit GLM 4.7, GLM 4.5 Air verfügbar
  And jeder Provider hat einen CLI-Befehl-Template
```

### Szenario 2: CLI-Template für Anthropic

```gherkin
Scenario: Anthropic nutzt claude-anthropic-simple
  Given ich wähle das Model "Opus 4.5" (Anthropic)
  When eine Nachricht gesendet wird
  Then wird der CLI-Befehl "claude-anthropic-simple --model opus" ausgeführt
```

### Szenario 3: CLI-Template für GLM

```gherkin
Scenario: GLM nutzt standard claude-Befehl
  Given ich wähle das Model "GLM 4.7"
  When eine Nachricht gesendet wird
  Then wird der CLI-Befehl "claude --model glm-5" ausgeführt
```

### Szenario 4: Konfiguration ist erweiterbar

```gherkin
Scenario: Neue Provider können hinzugefügt werden
  Given die model-config.json existiert
  When ein neuer Provider-Eintrag hinzugefügt wird
  Then steht dieser nach Neustart der Anwendung zur Verfügung
```

### Edge Case: Fehlende Konfiguration

```gherkin
Scenario: Fallback auf hardcoded Defaults bei fehlender Config
  Given die model-config.json existiert nicht
  When die Anwendung startet
  Then werden die hardcoded Default-Provider verwendet
  And es erscheint keine Fehlermeldung
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/config/model-config.json
- [ ] FILE_EXISTS: agent-os-ui/src/server/model-config.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/config/model-config.json enthält "anthropic"
- [ ] CONTAINS: agent-os-ui/config/model-config.json enthält "glm"
- [ ] CONTAINS: agent-os-ui/config/model-config.json enthält "claude-anthropic-simple"
- [ ] CONTAINS: agent-os-ui/src/server/model-config.ts enthält "interface ModelProvider"
- [ ] CONTAINS: agent-os-ui/src/server/model-config.ts enthält "loadModelConfig"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd agent-os-ui && npm run lint
- [ ] BUILD_PASS: cd agent-os-ui && npm run build

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | - |

---

## Technisches Refinement (vom Architect)

> **⚠️ WICHTIG:** Dieser Abschnitt wird vom Architect ausgefüllt

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

**Integration Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | model-config.ts | Neue Service-Datei für Config-Loading |
| Backend | config/model-config.json | Neue Konfigurationsdatei |

**Kritische Integration Points:**
- model-config.ts → claude-handler.ts (Config wird beim Spawn verwendet)

---

### Technical Details

**WAS:**
- TypeScript Interfaces: `ModelProvider`, `ModelConfig`, `Model`
- JSON-Konfigurationsdatei mit Provider-Definitionen
- Config-Loader Service mit Fallback auf hardcoded Defaults
- Export: `loadModelConfig()`, `getProviderCommand(providerId, modelId)`

**WIE (Architektur-Guidance ONLY):**
- Synchrones Laden via `fs.readFileSync()` beim Server-Start
- Fallback auf hardcoded Defaults wenn Config fehlt
- Interface-Definition:
```typescript
interface Model { id: string; name: string; description?: string; }
interface ModelProvider {
  id: string;
  name: string;
  cliCommand: string;  // z.B. "claude-anthropic-simple" oder "claude"
  cliFlags: string[];  // z.B. ["--model", "{modelId}"]
  models: Model[];
}
interface ModelConfig {
  defaultProvider: string;
  defaultModel: string;
  providers: ModelProvider[];
}
```

**WO:**
- `agent-os-ui/src/server/model-config.ts` (NEU, ~100 LOC)
- `agent-os-ui/config/model-config.json` (NEU, ~50 Zeilen JSON)

**WER:** dev-team__backend-developer

**Abhängigkeiten:** None

**Geschätzte Komplexität:** XS

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| backend-express | agent-os/skills/backend-express.md | Services pattern, TypeScript interfaces |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
test -f agent-os-ui/config/model-config.json && echo "✓ model-config.json exists"
test -f agent-os-ui/src/server/model-config.ts && echo "✓ model-config.ts exists"
grep -q '"anthropic"' agent-os-ui/config/model-config.json && echo "✓ Anthropic provider configured"
grep -q '"glm"' agent-os-ui/config/model-config.json && echo "✓ GLM provider configured"
grep -q "interface ModelProvider" agent-os-ui/src/server/model-config.ts && echo "✓ TypeScript interface defined"
cd agent-os-ui && npm run lint && echo "✓ Lint passed"
cd agent-os-ui && npm run build && echo "✓ Build passed"
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
