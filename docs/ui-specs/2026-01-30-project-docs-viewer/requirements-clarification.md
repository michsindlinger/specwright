# Requirements Clarification - Project Docs Viewer/Editor

**Created:** 2026-01-30
**Status:** Pending User Approval

## Feature Overview

Ein integrierter Dokument-Viewer und Editor für Projekt-Dokumentation (`agent-os/product/`) direkt im Dashboard, mit dem Benutzer die wichtigsten Product- oder Platform-Dokumente eines Projekts einsehen und bearbeiten können.

## Target Users

- Entwickler, die Agent OS Web UI nutzen
- Technical Leads, die Projekt-Dokumentation pflegen
- Alle Nutzer, die schnell auf Product-Briefs, Roadmaps oder Tech-Stack-Dokumentation zugreifen wollen

## Business Value

- **Effizienz:** Keine Notwendigkeit, in einen externen Editor zu wechseln um Dokumentation anzupassen
- **Kontext:** Dokumentation direkt neben Kanban-Board und Story-Details sichtbar
- **Konsistenz:** Alle Projektinformationen an einem Ort
- **Workflow:** Schnelles Review und Update von Product-Briefs während der Entwicklung

## Functional Requirements

### Dokument-Anzeige
- Alle `.md` Dateien aus `agent-os/product/` werden aufgelistet
- Typische Dokumente: `product-brief.md`, `roadmap.md`, `tech-stack.md`, `architecture-decision.md`
- Markdown wird gerendert angezeigt (View-Modus)
- Syntax-Highlighting für Markdown-Elemente

### Navigation
- Sidebar mit Dateiliste (links)
- Dokument-Inhalt (rechts)
- Klick auf Datei lädt und zeigt deren Inhalt

### Editieren
- Edit-Button wechselt in Bearbeitungsmodus
- In-Place Markdown Editor mit Syntax-Highlighting
- Save-Button speichert direkt in die Datei
- Cancel-Button verwirft Änderungen

### Status-Tracking
- Visueller Indikator für ungespeicherte Änderungen (z.B. * im Tab/Titel)
- Warnung beim Verlassen/Wechseln wenn ungespeicherte Änderungen existieren
- Bestätigungsdialog: "Ungespeicherte Änderungen vorhanden. Wirklich verlassen?"

### Platzierung in UI
- Im Dashboard als zusätzliches Tab/Panel
- Neben "Kanban" und "Story Details" als dritter Bereich
- Tab-Name: "Docs" oder "Projekt-Dokumente"

## Affected Areas & Dependencies

### Frontend
- **aos-dashboard** - Neue Tab/Panel-Struktur für Docs
- **aos-docs-viewer** - Neues Component für Dokument-Anzeige
- **aos-docs-editor** - Neues Component für Markdown-Editing
- **aos-docs-sidebar** - Dateiliste mit Navigation

### Backend
- **Neuer API-Endpunkt** - `/api/projects/:id/docs` für Dateiliste
- **Neuer API-Endpunkt** - `/api/projects/:id/docs/:filename` für Lesen/Schreiben
- **ProjectService** - Erweiterung um Docs-Operationen

### Bestehende Komponenten
- **aos-dashboard** - Muss erweitert werden um Docs-Tab
- **ProjectService (Backend)** - Muss erweitert werden

## Edge Cases & Error Scenarios

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Projekt hat keinen `agent-os/product/` Ordner | Friendly Message: "Keine Projekt-Dokumente gefunden" |
| Datei kann nicht gelesen werden (Permissions) | Error Toast: "Datei konnte nicht gelesen werden" |
| Datei kann nicht gespeichert werden | Error Toast: "Speichern fehlgeschlagen" + Änderungen behalten |
| Große Dateien (>1MB) | Warnung anzeigen, aber trotzdem laden |
| Leere Dateien | Leerer Editor, kein Fehler |
| Datei während Bearbeitung extern geändert | Bei Speichern warnen (optional: Conflict Resolution) |
| Nicht-UTF8 Dateien | Error anzeigen, nicht öffnen |

## Security & Permissions

- **Keine speziellen Permissions** - Lokale Anwendung, User hat bereits Zugriff auf Dateien
- **Path Traversal Protection** - Backend validiert dass nur Dateien aus `agent-os/product/` gelesen werden
- **Nur .md Dateien** - Keine Ausführung von Scripts

## Performance Considerations

- **Lazy Loading** - Datei-Inhalt erst bei Auswahl laden, nicht alle auf einmal
- **Caching** - Einmal geladene Dateien im Memory halten
- **Debouncing** - Syntax-Highlighting nicht bei jedem Keystroke neu berechnen
- **Max File Size** - Warnung bei Dateien >1MB, Blockieren bei >5MB

## Scope Boundaries

**IN SCOPE:**
- Markdown-Dateien aus `agent-os/product/` lesen
- Markdown-Dateien bearbeiten und speichern
- Syntax-Highlighting im Editor
- Gerenderte Markdown-Vorschau
- Datei-Navigation via Sidebar
- Ungespeicherte-Änderungen-Warnung
- Integration in Dashboard als Tab

**OUT OF SCOPE:**
- Neue Dateien erstellen
- Dateien löschen
- Dateien umbenennen
- Ordner-Navigation (nur `agent-os/product/`)
- YAML/JSON Dateien
- Bilder-Upload oder Einbettung
- Collaborative Editing
- Version History / Git Integration
- Datei-Suche innerhalb von Dokumenten

## Open Questions

Keine offenen Fragen - alle Requirements geklärt.

## Proposed User Stories (High Level)

1. **PDOC-001: Backend Docs API** - API-Endpunkte für Docs-Listing und CRUD
2. **PDOC-002: Docs Sidebar Component** - Dateiliste mit Navigation
3. **PDOC-003: Docs Viewer Component** - Markdown-Rendering im View-Modus
4. **PDOC-004: Docs Editor Component** - Markdown-Editor mit Syntax-Highlighting
5. **PDOC-005: Dashboard Integration** - Docs-Tab im Dashboard + Unsaved-Changes Handling
6. **PDOC-999: Integration & E2E Validation** - Vollständige Feature-Integration testen

---

*Review this document carefully. Once approved, detailed user stories will be generated.*
