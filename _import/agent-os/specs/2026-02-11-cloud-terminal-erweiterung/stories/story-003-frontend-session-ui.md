# Frontend Session-Erstellungs-UI

> Story ID: CTE-003
> Spec: Cloud Terminal Erweiterung
> Created: 2026-02-11
> Last Updated: 2026-02-11

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: CTE-001, CTE-002
**Integration:** aos-model-dropdown -> aos-terminal-session -> Gateway/WebSocket

---

## Feature

```gherkin
Feature: Terminal-Auswahl im Session-Dropdown
  Als Entwickler
  möchte ich beim Erstellen einer neuen Terminal-Session zwischen "Terminal" und Cloud Code Providern wählen können,
  damit ich schnell ein normales Shell-Terminal öffnen kann ohne erst Provider und Model auswählen zu müssen.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Terminal-Option ist sichtbar

```gherkin
Scenario: "Terminal" erscheint als erste Option im Dropdown
  Given ich bin in der Cloud Terminal Sidebar
  When ich auf "Neue Session" klicke
  Then sehe ich "Terminal" als erste Option im Dropdown
  And darunter einen visuellen Separator
  And darunter die bekannten Provider mit ihren Models
```

### Szenario 2: Normales Terminal starten

```gherkin
Scenario: Auswahl von "Terminal" startet sofort ein Shell-Terminal
  Given ich bin in der Cloud Terminal Sidebar
  And das Session-Dropdown ist geöffnet
  When ich "Terminal" auswähle
  Then wird sofort ein Shell-Terminal gestartet
  And ich muss keinen Provider auswählen
  And ich muss kein Model auswählen
  And das Terminal ist im Projektpfad geöffnet
```

### Szenario 3: Cloud Code Session funktioniert wie bisher

```gherkin
Scenario: Auswahl eines Providers startet Claude Code wie gewohnt
  Given ich bin in der Cloud Terminal Sidebar
  And das Session-Dropdown ist geöffnet
  When ich den Provider "Anthropic" auswähle
  And ich das Model "Sonnet" auswähle
  Then wird eine Claude Code Session mit diesen Einstellungen gestartet
  And der bestehende Flow bleibt unverändert
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Dropdown zeigt Terminal auch ohne konfigurierte Provider
  Given kein LLM-Provider ist konfiguriert
  When ich auf "Neue Session" klicke
  Then sehe ich trotzdem "Terminal" als Option
  And ich kann ein normales Terminal öffnen
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [x] FILE_EXISTS: `agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts`
- [x] FILE_EXISTS: `agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts`
- [x] CONTAINS: `Terminal` group rendering in `aos-model-dropdown.ts`
- [x] CONTAINS: `terminalType` handling in `aos-terminal-session.ts`

### Funktions-Prüfungen

- [x] LINT_PASS: `cd agent-os-ui && npx tsc --noEmit`
- [x] BUILD_PASS: `cd agent-os-ui && npm run build`

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

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] `aos-model-dropdown` zeigt "Terminal" als erste Gruppe im Dropdown mit visuellem Separator (`border-bottom`)
- [x] "Terminal"-Eintrag ist immer sichtbar, auch wenn keine Provider konfiguriert sind
- [x] Klick auf "Terminal" dispatcht `model-selected` Event mit `{ terminalType: 'shell' }` als Detail
- [x] `aos-terminal-session.handleModelSelected()` unterscheidet zwischen Shell-Auswahl und Model-Auswahl via Discriminated Union im Event-Detail
- [x] Bei Shell-Auswahl: `cloud-terminal:create` Message wird mit `terminalType: 'shell'` und ohne `modelConfig` gesendet
- [x] Bei Model-Auswahl: bestehender Flow mit `modelConfig` und `terminalType: 'claude-code'` bleibt unveraendert
- [x] Model-Selector-Overlay wird bei Shell-Typ uebersprungen (sofortige Session-Erstellung)

#### Qualitaetssicherung
- [x] TypeScript kompiliert fehlerfrei
- [x] Bestehende Model-Auswahl fuer Claude Code funktioniert unveraendert
- [x] Terminal-Option erscheint als erste Gruppe im Dropdown
- [x] Alle Akzeptanzkriterien erfuellt

#### Dokumentation
- [x] JSDoc-Kommentare fuer geaenderte Methoden
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend

| Layer | Komponenten | Aenderung |
|-------|-------------|-----------|
| Frontend Component | `aos-model-dropdown.ts` | "Terminal"-Gruppe als erste Option im Dropdown mit Separator; `selectModel()` erweitert fuer Shell-Auswahl mit speziellem Event-Payload |
| Frontend Component | `aos-terminal-session.ts` | `handleModelSelected()` erweitert um Discriminated Union: `{ terminalType: 'shell' }` vs. `{ providerId, modelId }`; bei Shell kein Model-Selector, direkte Session-Erstellung |

---

### Technical Details

**WAS:**
- `aos-model-dropdown`: Neue "Terminal"-Gruppe oben im Dropdown-Menu rendern (vor den Provider-Gruppen), mit einem Eintrag "Terminal" und einem visuellen Separator (`border-bottom` via bestehende `.provider-group:not(:last-child)` CSS-Regel)
- `aos-model-dropdown`: Bei Klick auf "Terminal" ein `model-selected` Event mit `{ terminalType: 'shell' }` dispatchen (Discriminated Union mit bestehendem `{ providerId, modelId }`)
- `aos-model-dropdown`: Dropdown-Button zeigt "Terminal" als Selected-State wenn Shell gewaehlt
- `aos-terminal-session`: `handleModelSelected()` prueft ob Event-Detail `terminalType === 'shell'` enthaelt
- `aos-terminal-session`: Bei Shell-Auswahl direkt `cloud-terminal:create` senden mit `terminalType: 'shell'`, ohne `modelConfig`
- `aos-terminal-session`: Bei bestehender Model-Auswahl `terminalType: 'claude-code'` zum Create-Message hinzufuegen

**WIE:**
- Grouped Dropdown Pattern: Die bestehende Provider-Group-Rendering-Logik in `render()` wird wiederverwendet. Vor der `this.providers.map()` Loop wird eine statische "Terminal"-Gruppe eingefuegt
- Discriminated Union Pattern fuer Event-Detail: `type ModelSelectedDetail = { terminalType: 'shell' } | { providerId: string; modelId: string }` -- kein separates Event noetig
- In `handleModelSelected()`: Type Guard via `'terminalType' in e.detail` um zwischen Shell und Model zu unterscheiden
- Bei Shell-Auswahl: `showModelSelector = false` setzen und direkt Gateway-Message senden (kein Zwischenschritt)
- Loading-State waehrend Shell-Terminal erstellt wird wiederverwenden (bestehende `connectionStatus: 'connecting'` Logik)
- CSS fuer "Terminal"-Gruppe: bestehende `.provider-group` und `.provider-label` Styles wiederverwenden

**WO:**
- `agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts`
- `agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts`

**WER:** tech-architect

**Abhängigkeiten:** CTE-001, CTE-002

**Geschätzte Komplexität:** S (2 Dateien, ca. 60-80 LOC Aenderungen)

---

### Kritische Integration Points

| Source | Target | Verbindung | Validierung |
|--------|--------|------------|-------------|
| `aos-model-dropdown` | `aos-terminal-session` | Custom Event `model-selected` mit Discriminated Union Detail | grep `model-selected` in `aos-terminal-session.ts` |
| `aos-terminal-session` | Gateway/WebSocket | `cloud-terminal:create` Message mit `terminalType` | grep `cloud-terminal:create` in `aos-terminal-session.ts` |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify Terminal group exists in dropdown
grep -q "Terminal" agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts && echo "PASS: Terminal option in dropdown" || echo "FAIL: Terminal option missing"

# Verify terminalType in model-selected event
grep -q "terminalType" agent-os-ui/ui/src/components/terminal/aos-model-dropdown.ts && echo "PASS: terminalType in dropdown event" || echo "FAIL: terminalType missing in dropdown"

# Verify handleModelSelected handles shell type
grep -A15 "handleModelSelected" agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts | grep -q "shell" && echo "PASS: Shell handling in session" || echo "FAIL: Shell handling missing"

# Verify cloud-terminal:create includes terminalType
grep -A10 "cloud-terminal:create" agent-os-ui/ui/src/components/terminal/aos-terminal-session.ts | grep -q "terminalType" && echo "PASS: terminalType in create message" || echo "FAIL: terminalType missing in create message"

# TypeScript compilation check
cd agent-os-ui && npx tsc --noEmit 2>&1 | head -20
```
