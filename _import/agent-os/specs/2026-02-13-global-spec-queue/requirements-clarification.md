# Requirements Clarification: Global Spec Queue

## Feature Overview
Projektübergreifende Spezifikationsansicht mit globaler Queue-Ausführung als Bottom Panel, das jederzeit sichtbar sein kann - unabhängig vom aktuell gewählten Projekt.

## Entscheidungen

### 1. Positionierung: Bottom Panel
- Queue wird als **ausklappbares Panel am unteren Bildschirmrand** platziert
- Ähnlich einer IDE-Konsole (VS Code Terminal-Bereich)
- Koexistiert mit dem Cloud Terminal (rechte Seite)
- Resizable in der Höhe

### 2. Panel-Struktur: 3 Tabs
| Tab | Inhalt |
|-----|--------|
| **Queue** | Aktuelle Warteschlange mit Fortschritt, Drag-Drop Reordering, Start/Stop Controls |
| **Specs** | Alle Spezifikationen über alle Projekte, gruppiert nach Projekt, Drag-Drop Source für Queue |
| **Log** | Execution-Log der aktuellen/letzten Ausführung (Fortschritt, Output) |

**Wichtig:** Drag & Drop von Specs-Tab in Queue-Tab muss möglich sein.

### 3. Zugang: Sidebar Icon + Keyboard Shortcut
- **Queue-Icon** in der linken Sidebar-Navigation (wie Cloud Terminal Icon)
- **Keyboard Shortcut** zum Togglen (z.B. Cmd/Ctrl+Q)
- Panel-Zustand (offen/geschlossen, aktiver Tab, Höhe) wird persistiert

### 4. Queue-Befüllung: Drag & Drop + Button
- Specs per **Drag & Drop** aus dem Specs-Tab in die Queue ziehen
- **"Add to Queue" Button** an jeder Spec-Karte
- Auch weiterhin aus dem **Projekt-Dashboard** heraus möglich (Spec-Cards bleiben draggable)

### 5. Ausführung: Sequenziell Global
- **Ein Spec nach dem anderen**, projektübergreifend
- Queue verwaltet die Reihenfolge über Projektgrenzen hinweg
- Ressourcenschonend und vorhersehbar

### 6. Migration: Dashboard-Queue komplett ersetzen
- Bestehende `aos-queue-sidebar` im Dashboard wird **entfernt**
- Queue ist nur noch global im Bottom Panel
- Dashboard erhält mehr Platz für Spec-/Kanban-Ansicht

## Betroffene Bereiche

### Neue Komponenten
- `aos-global-queue-panel` - Bottom Panel Container mit Tab-Navigation
- `aos-queue-tab` - Queue-Tab Inhalt (Migration von aos-queue-sidebar)
- `aos-specs-tab` - Projektübergreifende Spec-Übersicht
- `aos-execution-log-tab` - Execution Log Ansicht

### Zu ändernde Komponenten
- `dashboard-view.ts` - Queue-Sidebar entfernen, Layout anpassen
- `app-shell` / Root-Layout - Bottom Panel global einbinden
- Sidebar-Navigation - Queue-Icon hinzufügen
- `gateway.ts` - Projektübergreifende Queue-Methoden

### Backend-Änderungen
- `queue.service.ts` - Von per-project zu globaler Queue-Verwaltung
- `queue.handler.ts` - Projektübergreifende Messages
- `specs-reader.ts` - Multi-Project Spec-Loading
- Neuer Endpoint/Handler für projektübergreifende Specs

## Nicht im Scope
- Parallele Queue-Ausführung (bleibt sequenziell)
- Queue-Persistierung über Server-Neustarts (In-Memory reicht zunächst)
- Spec-Erstellung aus der globalen Ansicht heraus
- Filter/Suchfunktion in der Spec-Übersicht (kann als Follow-up)
