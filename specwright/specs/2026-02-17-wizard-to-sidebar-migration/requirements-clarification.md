# Requirements Clarification - Wizard-to-Sidebar Migration

**Created:** 2026-02-17
**Status:** Pending User Approval

## Feature Overview
Entfernung des Installations-/Migrations-Wizard-Modals. Migration und Installation werden stattdessen direkt ueber das Cloud Terminal in der rechten Sidebar ausgefuehrt. Die Getting Started Seite bekommt eine zustandsbasierte Kachel-Logik, die schrittweise durch den Setup-Prozess fuehrt.

## Target Users
Entwickler, die ein neues Projekt in der Specwright Web UI oeffnen und entweder:
- Specwright noch nicht installiert haben (Erstinstallation)
- Von Agent OS zu Specwright migrieren muessen
- Noch keinen Product/Platform Brief erstellt haben

## Business Value
- **Vereinfachte UX**: Kein modaler Wizard mehr, der den Benutzer blockiert
- **Konsistenz**: Alle Terminal-Operationen laufen im gleichen Cloud Terminal (Sidebar)
- **Klarheit**: Zustandsbasierte Kacheln zeigen dem User genau, was der naechste Schritt ist
- **Weniger Komplexitaet**: Entfernung einer kompletten Komponente (Wizard-Modal mit ~900 Zeilen)

## Functional Requirements

### FR-1: Wizard-Modal komplett entfernen
- Die Komponente `aos-installation-wizard-modal` wird nicht mehr gerendert
- Alle Wizard-bezogenen State-Properties in `app.ts` werden entfernt (showWizard, wizardProjectPath, wizardFileCount etc.)
- Die Wizard-Events (wizard-complete, wizard-cancel) werden nicht mehr benoetigt
- Die CSS-Styles des Wizards koennen entfernt werden

### FR-2: Getting Started - Kachel-Logik (zustandsbasiert)
Die Getting Started Seite zeigt je nach Projektzustand unterschiedliche Kacheln:

| Zustand | Anzeige |
|---------|---------|
| `!hasSpecwright` (kein specwright/ UND kein agent-os/) | Hint "Installation notwendig" + Button "Installation starten". **Keine Kacheln.** |
| `needsMigration` (agent-os/ vorhanden, specwright/ fehlt) | Hint "Migration empfohlen" + Button "Migration starten". **Keine Kacheln.** |
| `hasSpecwright && !hasProductBrief` | Hint "Brief fehlt" + Planning-Kacheln (Plan Product, Plan Platform, Analyze Product, Analyze Platform) |
| `hasSpecwright && hasProductBrief` | Standard-Kacheln (Create Spec, Add Bug, Add Todo) |

### FR-3: Installation/Migration ueber Sidebar-Terminal
- Klick auf "Installation starten" oder "Migration starten" auf der Getting Started Seite
- Oeffnet das Cloud Terminal in der rechten Sidebar
- Erstellt eine Shell-Session und fuehrt automatisch den curl-Befehl aus:
  - Installation: `curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/install.sh | bash -s -- --yes --all`
  - Migration: `curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/migrate-to-specwright.sh | bash -s -- --yes --no-symlinks`
- Terminal-Session bekommt einen sprechenden Namen ("Installation" bzw. "Migration")

### FR-4: Auto-Detection nach Terminal-Completion
- Wenn die Shell-Session (Installation/Migration) erfolgreich beendet wird (exit code 0), wird automatisch der Projektzustand neu validiert
- Die Getting Started Seite aktualisiert sich automatisch (keine manuelle Seiten-Aktualisierung noetig)
- Nach erfolgreicher Installation/Migration: Kacheln wechseln zu Planning-Kacheln (wenn kein Brief vorhanden)

### FR-5: Auto-Redirect auf Getting Started
- Wenn ein neues Projekt hinzugefuegt wird und Specwright nicht installiert ist (`!hasSpecwright` oder `needsMigration`), wird automatisch auf die Getting Started Seite navigiert
- Der User sieht sofort den Zustand und die naechste Aktion

## Affected Areas & Dependencies

| Komponente | Impact |
|------------|--------|
| `ui/frontend/src/views/aos-getting-started-view.ts` | Rendering-Logik aendern: bei !hasSpecwright/needsMigration keine Kacheln zeigen, neues Event fuer Terminal-Oeffnung |
| `ui/frontend/src/app.ts` | Wizard-Modal entfernen, neuen Event-Handler fuer Setup-Terminal, Auto-Detection nach Terminal-Close, Auto-Redirect |
| `ui/frontend/src/components/setup/aos-installation-wizard-modal.ts` | Datei kann entfernt oder als unused belassen werden |
| `ui/frontend/src/styles/theme.css` | Wizard-CSS-Klassen koennen entfernt werden |

## Edge Cases & Error Scenarios

| Edge Case | Erwartetes Verhalten |
|-----------|---------------------|
| User schliesst Terminal-Tab waehrend Installation laeuft | Zustand bleibt unveraendert. Getting Started zeigt weiterhin den Installations-Hint. User kann erneut klicken. |
| Installation/Migration schlaegt fehl (exit code != 0) | Kein Auto-Refresh des Zustands. Terminal bleibt offen mit Fehlerausgabe. User kann neuen Versuch starten. |
| User wechselt Projekt waehrend Installation laeuft | Terminal-Session bleibt bestehen (wie bei normalen Sessions). Beim Zurueckwechseln ist die Session noch da. |
| Kein WebSocket verbunden | Button ist klickbar, aber Terminal-Erstellung schlaegt fehl. Standard-Fehlerbehandlung greift. |
| Projekt bereits installiert, aber Brief fehlt | Getting Started zeigt Planning-Kacheln. Kein Terminal noetig. |

## Security & Permissions
- Keine Aenderungen an Sicherheits- oder Berechtigungskonzepten
- Die curl-Befehle sind identisch zu den bisherigen im Wizard-Modal

## Performance Considerations
- Entfernung des Wizard-Modals reduziert die DOM-Groesse
- Auto-Detection basiert auf dem bestehenden `cloud-terminal:closed` Gateway-Event + einem `/api/project/validate` Call
- Kein Polling noetig

## Scope Boundaries

**IN SCOPE:**
- Wizard-Modal entfernen (nicht mehr rendern in app.ts)
- Getting Started Kachel-Logik anpassen (keine Kacheln bei !hasSpecwright/needsMigration)
- Neues Event von Getting Started zum Oeffnen einer Shell-Session in der Sidebar
- Auto-Detection nach Terminal-Close (Projektzustand neu validieren)
- Auto-Redirect auf Getting Started bei neuem Projekt ohne Specwright
- Aufraeuem der Wizard-Properties in app.ts

**OUT OF SCOPE:**
- Loeschen der Wizard-Modal-Datei (bleibt als unused, kann spaeter entfernt werden)
- Aenderungen am Backend (project-context.service.ts bleibt unveraendert)
- Aenderungen an der Terminal-Sidebar-Komponente selbst
- Aenderungen am CSS-Theme (Wizard-Styles koennen spaeter aufgeraeumt werden)

## Open Questions
Keine - alle Fragen wurden geklaert.

## Proposed User Stories (High Level)
1. **Getting Started Kachel-Logik** - Zustandsbasierte Anzeige ohne Kacheln bei fehlender Installation/Migration
2. **Setup-Terminal Integration** - Neues Event + Handler zum Oeffnen einer Shell-Session mit Auto-Execute in der Sidebar
3. **Auto-Detection nach Setup** - Automatische Projektzustand-Aktualisierung nach Terminal-Close
4. **Wizard-Modal Entfernung & Redirect** - Wizard aus app.ts entfernen, Auto-Redirect auf Getting Started

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
