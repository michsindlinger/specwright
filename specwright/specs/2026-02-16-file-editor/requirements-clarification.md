# Requirements Clarification - File Editor

**Created:** 2026-02-16
**Status:** Pending User Approval

## Feature Overview
Ein integrierter File Editor in der Specwright Web UI, der es Entwicklern ermöglicht, Projektdateien direkt in der UI anzuzeigen und zu bearbeiten - ohne in ein externes Tool wie VS Code wechseln zu müssen.

## Target Users
Entwickler, die die Specwright Web UI nutzen und regelmäßig Dateien anpassen oder nachschlagen müssen (Specs, Stories, Konfigurationsdateien, Code etc.).

## Business Value
Eliminiert den ständigen Kontextwechsel zwischen Specwright UI und einem externen Editor. Der Entwickler kann den gesamten Workflow - von der Spec-Planung über die Kanban-Verwaltung bis zur Dateibearbeitung - in einem einzigen Tool erledigen.

## Functional Requirements

### Dateibaum (Sidebar)
- Tree-View des gesamten Projektverzeichnisses (wie in VS Code)
- Öffnen über einen Toggle-Button im Header
- Sidebar erscheint als Overlay von links über den bestehenden Content
- Ordner auf-/zuklappen
- Kontextmenü (Rechtsklick) für Datei-Operationen:
  - Neue Datei erstellen
  - Neuen Ordner erstellen
  - Umbenennen
  - Löschen
- Dateisuche/Filter im Baum (Nice-to-have, wenn nicht zu aufwändig)

### Code Editor
- Vollwertiger Code-Editor (Monaco Editor oder CodeMirror)
- Syntax-Highlighting mit automatischer Spracherkennung basierend auf Dateiendung
  - TypeScript, JavaScript, Markdown, JSON, YAML, HTML, CSS, etc.
- Zeilennummern
- Multi-Tab-Support: Mehrere Dateien gleichzeitig offen halten
- Manuelles Speichern (Ctrl+S / Save-Button)
- Auto-Save als optionale Ergänzung (wenn ohne großen Aufwand umsetzbar)

### Unsaved Changes Handling
- Warnung beim Schließen eines Tabs mit ungespeicherten Änderungen
- Warnung beim Wechseln/Schließen des Editors mit ungespeicherten Änderungen
- Visueller Indikator (z.B. Punkt am Tab) für ungespeicherte Änderungen

### Datei-Scope
- Zeigt das gesamte Projektverzeichnis an (basierend auf Projekt-Konfiguration)
- Nur textbasierte Dateien werden im Editor geöffnet (kein Bild-Viewer)
- Keine Ordner oder Dateien werden ausgeschlossen

## Affected Areas & Dependencies
- **UI Header** - Neuer Toggle-Button für File-Sidebar
- **UI Layout** - Overlay-Sidebar von links
- **Backend API** - Neue Endpoints für Datei-Operationen (read, write, create, delete, rename, list directory)
- **WebSocket** - Optional für Live-Updates bei Dateiänderungen
- **Frontend** - Neue Lit Web Components (aos-file-tree, aos-file-editor, aos-file-tabs)
- **Externe Dependency** - Monaco Editor oder CodeMirror als Editor-Bibliothek

## Edge Cases & Error Scenarios
- **Datei existiert nicht mehr** - Wenn eine geöffnete Datei extern gelöscht wird, Warnung anzeigen
- **Berechtigungsfehler** - Wenn Datei nicht lesbar/schreibbar ist, passende Fehlermeldung
- **Große Dateien** - Sinnvolles Limit für die Dateigröße im Editor (z.B. max 5 MB)
- **Binärdateien** - Wenn der Nutzer eine Binärdatei öffnet, Hinweis anzeigen statt kaputten Content
- **Gleichzeitige Bearbeitung** - Wenn eine Datei extern geändert wird während sie im Editor offen ist, Hinweis oder Reload-Option
- **Leere Ordner** - Korrekte Darstellung im Dateibaum
- **Lange Dateinamen/Pfade** - Truncation mit Tooltip im Dateibaum
- **Lösch-Bestätigung** - Sicherheitsabfrage vor dem Löschen von Dateien/Ordnern

## Security & Permissions
- Der File Editor arbeitet im Scope des Server-Prozesses (gleiche Berechtigungen wie der Express-Server)
- Keine zusätzliche Authentifizierung nötig (lokales Entwicklungstool)
- Path-Traversal-Schutz: Sicherstellen, dass nur Dateien innerhalb des Projektverzeichnisses zugänglich sind

## Performance Considerations
- Dateibaum sollte lazy-loading nutzen (Ordner-Inhalte erst beim Öffnen laden)
- Editor sollte auch bei größeren Dateien (bis 5 MB) flüssig bleiben
- Tab-Management: Sinnvolles Limit für gleichzeitig offene Tabs

## Scope Boundaries

**IN SCOPE:**
- Dateibaum mit Tree-View des gesamten Projektverzeichnisses
- Overlay-Sidebar mit Toggle im Header
- Code-Editor mit Syntax-Highlighting (Monaco/CodeMirror)
- Multi-Tab-Support
- CRUD-Operationen für Dateien und Ordner (Erstellen, Umbenennen, Löschen)
- Manuelles Speichern + optionales Auto-Save
- Kontextmenü im Dateibaum
- Unsaved-Changes-Warnung
- Dateisuche/Filter (Nice-to-have)

**OUT OF SCOPE:**
- Bild-Anzeige/Preview
- Git-Integration (Diff-View, Commit aus Editor)
- Terminal/Konsole in der UI
- Collaborative Editing (Multi-User)
- Datei-Upload von extern
- Dateien außerhalb des Projektverzeichnisses
- Erweiterte Editor-Features (Find & Replace, Minimap, etc.) - können später ergänzt werden

## Open Questions
- Keine offenen Fragen - alle Anforderungen sind geklärt.

## Proposed User Stories (High Level)
1. **Backend File API** - REST-Endpoints für Datei-Operationen (list, read, write, create, delete, rename)
2. **File Tree Component** - Dateibaum-Komponente mit Tree-View und Lazy-Loading
3. **File Tree Sidebar** - Overlay-Sidebar mit Toggle-Button im Header
4. **Code Editor Component** - Monaco/CodeMirror Integration als Lit Web Component
5. **Tab Management** - Multi-Tab-System mit Unsaved-Changes-Handling
6. **Context Menu & File Operations** - Kontextmenü für CRUD-Operationen im Dateibaum
7. **File Search** - (Nice-to-have) Suchfeld zum Filtern im Dateibaum

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
