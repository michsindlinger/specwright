# Requirements Clarification - Deep Link Navigation

**Created:** 2026-02-13
**Status:** Pending User Approval

## Feature Overview
Deep Link Navigation ermöglicht es, dass der Navigations-Zustand der Agent OS Web UI vollständig in der URL abgebildet wird. Bei einem Page Reload, Browser-Neustart oder Teilen eines Links bleibt der aktuelle Zustand erhalten - der User landet nicht mehr auf der Startseite, sondern exakt dort wo er war.

## Target Users
Entwickler, die das Agent OS Web UI täglich nutzen - sowohl Einzelnutzer (Reload-Szenario) als auch Teams (URL-Sharing zwischen Kollegen).

## Business Value
- **Produktivität:** Kein Zeitverlust durch erneutes Navigieren nach Reload/Browser-Neustart
- **Zusammenarbeit:** Kollegen können direkt zu einer bestimmten Spec/Story/Ansicht verlinkt werden
- **UX-Standard:** Deep Linking ist eine grundlegende Erwartung an moderne Web-Anwendungen
- **Debugging:** Spezifische Zustände können über URLs reproduziert werden

## Functional Requirements

### URL-Abbildung pro View

**Dashboard:**
- `#/dashboard` - Dashboard-Übersicht (Spec-Liste)
- `#/dashboard/spec/{spec-id}` - Ausgewählte Spec
- `#/dashboard/spec/{spec-id}/{tab}` - Ausgewählte Spec mit aktivem Tab (z.B. kanban, stories, files)

**Chat:**
- `#/chat` - Chat-View (letzte/neue Session)
- `#/chat/{session-id}` - Spezifische Chat-Session

**Workflows:**
- `#/workflows` - Workflow-Übersicht
- `#/workflows/{workflow-id}` - Ausgewählter Workflow

**Settings:**
- `#/settings` - Settings-View
- `#/settings/{tab}` - Settings mit aktivem Tab (z.B. general, projects, profiles, teams)

### Browser History
- Back/Forward-Buttons navigieren vollständig durch die Navigations-Historie
- Auch innerhalb einer View (z.B. von Spec-Detail zurück zur Spec-Liste)
- Hash-Changes werden als eigene History-Einträge behandelt

### URL-Design
- Hash-basierte Segmente (`#/view/param1/param2`)
- Lesbare, selbsterklärende URLs
- Kompatibel mit bestehendem Hash-Routing
- Keine Server-Konfiguration nötig (kein History API Fallback)

## Affected Areas & Dependencies

- **app.ts** - Haupt-Router muss von einfachem Hash-Matching zu Segment-basiertem Routing erweitert werden
- **dashboard-view.ts** - Muss URL-Segmente lesen/schreiben bei Spec-/Tab-Auswahl
- **chat-view.ts** - Muss Session-ID in URL abbilden
- **workflow-view.ts** - Muss Workflow-ID in URL abbilden
- **settings-view.ts** - Muss Tab-Auswahl in URL abbilden
- **gateway.ts** - Keine direkte Änderung erwartet (WebSocket unabhängig von URL)
- **Sidebar-Navigation** - Muss Active-State aus URL-Segmenten ableiten

## Edge Cases & Error Scenarios

### Ungültige Deep Links
- Spec existiert nicht (mehr) → Fallback auf Dashboard mit Toast-Nachricht "Spec nicht gefunden"
- Session-ID ungültig → Fallback auf Chat-Übersicht mit Hinweis
- Tab-Name ungültig → Fallback auf Default-Tab der View
- Komplett ungültiger Pfad → Not-Found-View (wie bisher)

### Projekt-Kontext
- Deep Link enthält Spec die zum aktuellen Projekt gehört → Direkt navigieren
- Deep Link enthält Spec eines anderen Projekts → Projekt automatisch wechseln (falls möglich) ODER Hinweis "Diese Spec gehört zu Projekt X - möchtest du wechseln?"
- Kein Projekt ausgewählt + Deep Link → Projekt aus Spec-ID ableiten oder Fehler zeigen

### Browser-spezifisch
- Mehrere Tabs mit verschiedenen Deep Links → Jeder Tab hat unabhängigen Zustand
- URL manuell editieren → Gleiche Validierung wie bei Deep Link

## Security & Permissions
- Keine zusätzlichen Security-Anforderungen (lokale Anwendung)
- URLs enthalten keine sensitiven Daten (nur Spec-IDs, Tab-Namen)
- Keine Authentifizierung erforderlich

## Performance Considerations
- URL-Parsing muss synchron und schnell sein (kein Flackern beim Laden)
- Keine zusätzlichen API-Calls nur für URL-Validierung (lazy validation)
- Hash-Change-Handler muss effizient sein (keine unnötigen Re-Renders)

## Scope Boundaries

**IN SCOPE:**
- Hash-basiertes Segment-Routing für alle 4 Views
- Sub-Zustände: ausgewählte Spec + Tab, Chat-Session, Workflow, Settings-Tab
- Vollständige Browser-History-Unterstützung (Back/Forward)
- Edge-Case-Handling (ungültige Links, Projekt-Kontext)
- URL-Update bei jeder Navigation innerhalb der Views
- Shareable/kopierbare URLs

**OUT OF SCOPE:**
- History API / Clean URLs (ohne Hash)
- Tiefe Zustände (Scroll-Position, ausgewählte Story im Kanban, geöffnete Datei)
- Query-Parameter für Filter/Suche
- URL-Shortener oder Alias-System
- Session Persistence (gehört zu eigenem Feature)
- Änderungen am Backend/WebSocket-Protokoll

## Open Questions (if any)
- Keine offenen Fragen - Requirements sind vollständig geklärt

## Proposed User Stories (High Level)
1. **Router-Service erstellen** - Zentraler Router-Service der Hash-Segmente parst, validiert und View-Wechsel steuert
2. **Dashboard Deep Links** - URL-Integration für Spec-Auswahl und Tab-Navigation im Dashboard
3. **Chat Deep Links** - URL-Integration für Chat-Session-Auswahl
4. **Workflows Deep Links** - URL-Integration für Workflow-Auswahl
5. **Settings Deep Links** - URL-Integration für Tab-Navigation in Settings
6. **Edge Case Handling** - Ungültige Links, Projekt-Kontext-Wechsel, Fehler-Feedback

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
