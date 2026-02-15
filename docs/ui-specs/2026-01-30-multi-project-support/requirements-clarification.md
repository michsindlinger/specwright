# Requirements Clarification - Multi-Project Support

**Created:** 2026-01-30
**Status:** Pending User Approval

## Feature Overview
Ermöglicht das gleichzeitige Öffnen und Wechseln zwischen mehreren Projekten über eine Tab-Navigation im Header. Nutzer können zwischen Projekten wechseln, während Workflows unabhängig voneinander weiterlaufen.

## Target Users
- Entwickler, die mit mehreren Agent OS Projekten gleichzeitig arbeiten
- Power-User, die Context-Switching zwischen Projekten benötigen

## Business Value
- Erhöhte Produktivität durch schnelles Wechseln zwischen Projekten
- Paralleles Arbeiten an mehreren Projekten ohne Browser-Tab-Wechsel
- Unabhängige Workflow-Ausführung pro Projekt

## Functional Requirements

### Tab-Navigation (Header)
- Neue Zeile im Header unterhalb der bestehenden Header-Leiste
- Tabs zeigen Projekt-Namen (z.B. "agent-os-web-ui")
- Aktiver Tab ist visuell hervorgehoben
- Jeder Tab hat einen Schließen-Button (X)
- Plus-Icon zum Hinzufügen neuer Projekte
- Keine Begrenzung der Anzahl gleichzeitig geöffneter Projekte

### Projekt hinzufügen (Modal-Dialog)
- Plus-Icon öffnet Modal-Dialog mit zwei Optionen:
  1. **Recently Opened Liste:** Zeigt zuvor geöffnete Projekte
  2. **Ordner auswählen:** Browser File-Picker für neuen Ordner
- Validierung: Ordner muss `agent-os/` Unterordner enthalten
- Duplikat-Prüfung: Bereits geöffnete Projekte können nicht erneut hinzugefügt werden
- Ungültige Pfade (nicht mehr existierend) werden automatisch aus der Liste entfernt

### Recently Opened Liste
- Gespeichert im Browser localStorage
- Sortiert nach "zuletzt geöffnet"
- Automatische Bereinigung nicht mehr existierender Pfade

### Projekt-Wechsel Verhalten
- **Specs/Stories:** Werden aus dem `agent-os/specs/` Ordner des jeweiligen Projekts geladen
- **Docs:** Zeigen auf den `agent-os/docs/` Ordner des jeweiligen Projekts
- **Chat:** Wird beim Wechsel zurückgesetzt (kein History-Persistence zwischen Projekten)
- **Workflows:** Laufen unabhängig pro Projekt weiter (eigene WebSocket-Verbindung)

### Backend-Architektur
- Ein Server mit Context-Management pro Projekt
- Eine WebSocket-Verbindung pro aktivem Projekt
- Parallele Workflow-Ausführung möglich

## Affected Areas & Dependencies

| Component | Impact |
|-----------|--------|
| `aos-header` | Neue Tab-Leiste unterhalb des Headers |
| `aos-shell` | Project-Context-Management |
| Backend WebSocket | Multi-Connection Support |
| Backend Services | Project-scoped Context |
| localStorage | Recently Opened Projekte speichern |

## Edge Cases & Error Scenarios

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Projekt-Pfad existiert nicht mehr | Automatisch aus Recently Opened entfernen, Fehlermeldung wenn aktuell geöffnet |
| Gleiches Projekt zweimal hinzufügen | Verhindert, zeigt Hinweis "Projekt bereits geöffnet" |
| Ungültiger Ordner (kein agent-os/) | Validierungsfehler im Modal |
| Letztes Projekt schließen | Leerer Zustand oder Placeholder anzeigen |
| Browser-Refresh | Offene Tabs aus localStorage wiederherstellen |
| Workflow läuft bei Projekt-Wechsel | Workflow läuft im Hintergrund weiter |

## Security & Permissions
- File-Picker nutzt Browser-native Sicherheitsmechanismen
- Keine zusätzlichen Berechtigungen erforderlich
- Nur lokale Dateisystem-Zugriffe

## Performance Considerations
- Lazy Loading: Projekt-Daten erst bei Tab-Aktivierung laden
- WebSocket-Verbindungen: Nur für aktives Projekt + Projekte mit laufenden Workflows
- localStorage: Begrenzte Größe der Recently Opened Liste (z.B. max. 20 Einträge)

## Scope Boundaries

**IN SCOPE:**
- Tab-Navigation im Header
- Modal-Dialog zum Hinzufügen von Projekten
- Recently Opened Liste (localStorage)
- File-Picker Integration
- Project-Context-Switching
- Unabhängige WebSocket-Verbindungen pro Projekt
- Validierung von Projekt-Ordnern

**OUT OF SCOPE:**
- Chat-Historie Persistenz zwischen Projekten
- Projekt-spezifische Icons/Avatare
- Drag & Drop Reordering von Tabs
- Projekt-Gruppen oder Kategorien
- Remote-Projekte (nur lokales Filesystem)
- Synchronisation zwischen Browser-Sessions

## Open Questions
- Keine offenen Fragen

## Proposed User Stories (High Level)

1. **Tab-Navigation Component** - Neue Komponente `aos-project-tabs` für die Tab-Leiste im Header
2. **Project Add Modal** - Modal-Dialog mit Recently Opened Liste und File-Picker
3. **Recently Opened Service** - localStorage-basierter Service für Projekt-Historie
4. **Backend Multi-Project Context** - Server-seitige Unterstützung für mehrere Projekt-Kontexte
5. **WebSocket Multi-Connection** - Eine WebSocket-Verbindung pro Projekt
6. **Project Context Switching** - Frontend State-Management beim Projekt-Wechsel
7. **Integration & E2E Validation** - End-to-End Tests für Multi-Projekt-Workflows

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
