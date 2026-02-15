# Test-Szenarien: LLM Model Selection for Workflows

> Generiert am 2026-02-04 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-03-llm-selection-workflows/

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI für automatisierte E2E-Tests für die LLM Model Selection Feature.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Agent OS Web UI läuft lokal
- [ ] WebSocket-Verbindung zum Backend ist aktiv
- [ ] Backend unterstützt model-Parameter für Workflow-Execution
- [ ] Model-Konfiguration ist geladen (Provider und Modelle verfügbar)

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Test-Projekte | Beliebiges Projekt mit Workflows | Für Workflow-Card Tests |
| Test-Specs | Bestehende Specs im Dashboard | Für Create Spec Modal Tests |

---

## Test-Szenarien

### Szenario 1: LLM-001 - Backend Integration

**Beschreibung:** Backend akzeptiert optionalen model-Parameter beim Starten von Workflows

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Frontend sendet `workflow.interactive.start` mit `model="sonnet"` | Backend empfängt Message mit model-Parameter |
| 2 | Backend extrahiert model aus Message | `execution.model` ist auf "sonnet" gesetzt |
| 3 | CLI-Befehl wird generiert | CLI verwendet `--model sonnet` statt `--model opus` |
| 4 | Workflow wird ausgeführt | Workflow läuft mit ausgewähltem Modell |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Kein model-Parameter | Frontend sendet Message ohne model | Backend verwendet Standardwert "opus" |
| Ungültiges Modell | model="ungueltiges_modell" | Backend fällt auf "opus" zurück oder zeigt Fehler |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Modell nicht verfügbar | model wird nicht in Konfiguration gefunden | Fehlermeldung "Unknown model: {name}" oder Fallback auf "opus" |

---

### Szenario 2: LLM-002 - Workflow Card Model Selection

**Beschreibung:** Model-Dropdown auf Workflow-Cards im Workflows Dashboard

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Benutzer öffnet Workflows Dashboard Seite | Workflow-Cards werden mit Model-Dropdowns angezeigt |
| 2 | Benutzer wählt "Sonnet" im Dropdown | `selectedModel` State wird auf "sonnet" gesetzt |
| 3 | Benutzer klickt "Start Workflow" | Event wird mit `model="sonnet"` gefeuert |
| 4 | Workflow startet | Workflow läuft mit Sonnet |
| 5 | Während Ausführung | Dropdown ist disabled |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Standardmodell | Card wird ohne Auswahl geladen | "Opus" ist als Standard ausgewählt |
| Provider-Gruppierung | Dropdown wird geöffnet | Modelle sind nach Provider gruppiert (Anthropic, GLM) |
| Wechsel während Ausführung | Workflow läuft bereits | Dropdown ist disabled, keine Änderung möglich |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Keine Modelle geladen | Provider-Liste ist leer | Dropdown zeigt "Keine Modelle verfügbar" |

---

### Szenario 3: LLM-003 - Create Spec Modal Model Selection

**Beschreibung:** Model-Selector im "Create Spec" Modal

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Benutzer klickt "+ Neues Spec" | Create Spec Modal öffnet sich |
| 2 | Modal ist offen | Model-Selector Komponente wird angezeigt |
| 3 | Benutzer wählt "Haiku" | `selectedModel` State wird auf "haiku" gesetzt |
| 4 | Benutzer füllt Spec-Daten aus und klickt "Create Spec" | Workflow wird mit `model="haiku"` gestartet |
| 5 | Während Workflow-Ausführung | Model-Selector ist disabled |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Standardmodell | Modal öffnet sich ohne Auswahl | "Opus" ist als Standard ausgewählt |
| Modal schließen | Benutzer wählt Modell, schließt aber Modal | State wird zurückgesetzt beim nächsten Öffnen |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Keine Modelle verfügbar | Model-Selector kann nicht geladen werden | "Modelle konnten nicht geladen werden" |

---

### Szenario 4: LLM-004 - Context Menu Model Selection

**Beschreibung:** Model-Selector in allen Kontextmenü-Workflow-Modals

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Benutzer右-klickt und wählt "Neue Spec erstellen" | Workflow Modal öffnet sich mit Model-Selector |
| 2 | Benutzer wählt "Sonnet" und klickt "Start" | Spec-Workflow wird mit `model="sonnet"` gestartet |
| 3 | Benutzer右-klickt und wählt "Bug erstellen" | Workflow Modal öffnet sich mit Model-Selector |
| 4 | Benutzer wählt "Haiku" und klickt "Start" | Bug-Workflow wird mit `model="haiku"` gestartet |
| 5 | Benutzer右-klickt und wählt "TODO erstellen" | Workflow Modal öffnet sich mit Model-Selector |
| 6 | Benutzer wählt Modell und klickt "Start" | TODO-Workflow wird mit gewähltem Modell gestartet |
| 7 | Benutzer右-klickt und wählt "Story zu Spec hinzufügen" | Workflow Modal öffnet sich mit Model-Selector |
| 8 | Benutzer wählt Modell und klickt "Start" | Add-Story-Workflow wird mit gewähltem Modell gestartet |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Standardmodell | Jedes Kontextmenü-Modal öffnet sich | "Opus" ist als Standard ausgewählt |
| Gleiche Komponente | Alle 4 Actions nutzen gleiche Modal-Komponente | Model-Selector funktioniert identisch für alle |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Kontextmenü ohne Ziel | Benutzer右-klickt außerhalb des gültigen Kontexts | Kontextmenü wird nicht angezeigt |

---

## Regressions-Checkliste

Bestehende Funktionalität, die nach der Implementierung noch funktionieren muss:

- [ ] **Workflow-Start ohne Model-Parameter** - Workflow starten ohne Modellauswahl (sollte mit Opus laufen)
- [ ] **Bestehende Workflow-Card Funktionalität** - Argument-Input, Start/Stop-Buttons, Status-Display
- [ ] **WebSocket-Kommunikation** - Alle Workflow-Events werden korrekt gesendet/empfangen
- [ ] **Create Spec Modal** - Alle Felder und Validierungen funktionieren wie zuvor
- [ ] **Kontextmenü-Actions** - Alle 4 Actions öffnen korrekte Workflows
- [ ] **Multi-Model-Execution** - Mehrere Workflows können gleichzeitig mit verschiedenen Modellen laufen

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren

```css
/* Workflow Card */
aos-workflow-card[data-command-id="{commandId}"]

/* Model Dropdown (Workflow Card) */
select.model-dropdown[data-testid="workflow-model-select"]

/* Model Selector Component */
aos-model-selector[data-testid="model-selector"]

/* Create Spec Modal */
aos-create-spec-modal[data-open="true"]

/* Context Menu */
div.context-menu[data-visible="true"]
```

### API-Endpunkte

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `workflow.interactive.start` | WebSocket | Startet Workflow mit optionalem model-Parameter |
| `model.available` | WebSocket | Gibt verfügbare Modelle und Provider zurück |

### Mock-Daten

```json
{
  "providers": [
    {
      "name": "Anthropic",
      "id": "anthropic",
      "models": [
        {"id": "opus", "name": "Opus"},
        {"id": "sonnet", "name": "Sonnet"},
        {"id": "haiku", "name": "Haiku"}
      ]
    },
    {
      "name": "GLM",
      "id": "glm",
      "models": [
        {"id": "glm-5", "name": "GLM 4.7"},
        {"id": "glm-4.5-air", "name": "GLM 4.5 Air"}
      ]
    }
  ]
}
```

### Test-Data

```typescript
// WebSocket Message mit Model-Parameter
{
  type: 'workflow.interactive.start',
  commandId: 'agent-os:create-spec',
  model: 'sonnet',
  argument: 'My new spec'
}
```

---

## Notizen

**WICHTIGE TEST-HINWEISE:**

1. **Backend-Validierung:** Teste dass ungültige Modelle korrekt behandelt werden (Fallback oder Fehler)
2. **Concurrent Workflows:** Teste dass mehrere Workflows gleichzeitig mit verschiedenen Modellen laufen können
3. **State-Persistenz:** Teste dass Model-Auswahl pro Workflow-Card erhalten bleibt (nicht global)
4. **Disabled-States:** Teste dass alle Model-Selectoren korrekt disabled werden während Workflows laufen
5. **Provider-Gruppierung:** Verifiziere dass Modelle im Dropdown korrekt nach Provider gruppiert sind

**Manuelle Test-Priorität:**
1. High Priority: Backend Integration (LLM-001) - Alle Modelle können ausgewählt und ausgeführt werden
2. High Priority: Workflow Card (LLM-002) - UI funktioniert korrekt
3. Medium Priority: Create Spec Modal (LLM-003) - Integration in Modal
4. Medium Priority: Context Menu (LLM-004) - Alle 4 Actions funktionieren
