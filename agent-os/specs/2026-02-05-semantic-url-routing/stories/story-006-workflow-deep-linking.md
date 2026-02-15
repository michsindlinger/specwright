# SUR-006: Workflow Deep-Linking & Query-Parameter Migration

## User Story
**Als** User
**möchte ich** laufende Workflow-Ausführungen über URL erreichen und Workflows über URL-Parameter starten können,
**damit** Workflow-Kontexte nicht über sessionStorage gehandelt werden müssen.

## Akzeptanzkriterien (Gherkin)

```gherkin
Feature: Workflow Deep-Linking

  Scenario: Workflow Start via Query Params
    Given die URL ist "/workflows?start=agent-os:create-spec&argument=My+Feature"
    When die Seite lädt
    Then wird der Workflow "agent-os:create-spec" mit Argument "My Feature" gestartet
    And die Query-Parameter werden aus der URL entfernt

  Scenario: Workflow Execution Deep-Link
    Given ein Workflow mit ID "exec-123" läuft
    And die URL ist "/workflows/exec-123"
    When die Seite lädt
    Then wird die aktive Ausführung "exec-123" angezeigt

  Scenario: Cross-Route Workflow Start
    Given der User ist auf "/specs"
    When der User "Create Spec" über das Kontextmenü startet
    Then navigiert die App zu "/workflows?start=agent-os:create-spec&argument=..."
    And der Workflow wird automatisch gestartet

  Scenario: sessionStorage Migration
    Given die alte sessionStorage "pendingWorkflow" Logik existiert
    When die Migration abgeschlossen ist
    Then werden keine sessionStorage Einträge mehr für Workflows verwendet
```

## Technische Details

### WAS (Scope)
- Workflow-View akzeptiert `route` Property
- `checkPendingWorkflow()` liest Query-Parameter statt sessionStorage
- `/workflows/:executionId` Route zeigt aktive Ausführung
- Workflow-Start aus Dashboard/Kontextmenü nutzt Query-Parameter

### WIE (Implementierung)
- `@property() route: RouteMatch` hinzufügen
- In `updated()`: Prüfe `route.query.get('start')` für Auto-Start
- Nach Workflow-Start: `router.navigate('/workflows', { replace: true })` (Query-Params entfernen)
- `/workflows/:executionId`: `executionStore.setActiveExecution(executionId)`
- In `app.ts handleWorkflowStart()`: `router.navigate('/workflows?start=...')` statt sessionStorage

### WO (Dateien)
| Datei | Aktion | Beschreibung |
|-------|--------|-------------|
| `ui/src/views/workflow-view.ts` | MODIFY | Query-Param basierter Workflow-Start, Execution Deep-Link |
| `ui/src/app.ts` | MODIFY | handleWorkflowStart() auf Query-Params umstellen |
| `ui/src/views/dashboard-view.ts` | MODIFY | handleCreateSpecStart() auf router.navigate() umstellen |

### WER (Layer)
- **Layer**: Presentation
- **Skill**: frontend-lit

## Dependencies
- SUR-002 (App Shell Migration)

## Definition of Ready
- [x] User Story klar formuliert
- [x] Akzeptanzkriterien definiert
- [x] Technische Details vollständig
- [x] Aufwand geschätzt: M

## Definition of Done
- [ ] Workflow-Start via URL Query-Parameter funktioniert
- [ ] sessionStorage pendingWorkflow Logik entfernt
- [ ] /workflows/{executionId} zeigt korrekte Ausführung
- [ ] Cross-Route Workflow-Start (Dashboard → Workflows) funktioniert
- [ ] Query-Parameter werden nach Start bereinigt
- [ ] Keine TypeScript Errors
