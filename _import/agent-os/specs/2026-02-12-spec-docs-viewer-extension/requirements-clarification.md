# Requirements Clarification - Spec Docs Viewer Extension

**Created:** 2026-02-12
**Status:** Pending User Approval

## Feature Overview

Erweiterung des bestehenden Spec Document Viewers im Kanban Board, sodass alle `*.md` Dateien im Spec-Ordner (inkl. Unterordner) angezeigt, bearbeitet und gespeichert werden können - nicht nur `spec.md` und `spec-lite.md`. Zusätzlich sollen Markdown-Checkboxen in `user-todos.md` interaktiv abhakbar sein mit automatischer Persistierung.

## Target Users

Entwickler und Projektmanager, die über das Agent OS Web UI Specs verwalten und die vollständige Dokumentation eines Specs einsehen, bearbeiten und interaktiv nutzen möchten.

## Business Value

- **Vollständige Spec-Transparenz:** Alle Spec-Dokumente sind direkt im UI zugänglich, ohne in den Dateisystem-Explorer wechseln zu müssen
- **Effizientere Workflows:** User-Todos können direkt im UI abgehakt werden statt Dateien manuell zu editieren
- **Besserer Überblick:** Gruppierte Tabs zeigen die gesamte Dokumentstruktur eines Specs auf einen Blick

## Functional Requirements

1. **Dynamische Datei-Erkennung:** Backend scannt den Spec-Ordner rekursiv nach allen `*.md` Dateien (inkl. Unterordner wie `stories/`, `sub-specs/`)
2. **Gruppierte Tab-Darstellung:** Tabs sind nach Ordnern gruppiert: Hauptordner | stories/ | sub-specs/ - mit horizontalem Scrolling bei vielen Tabs
3. **Lesen aller Dateien:** Jede `*.md` Datei kann im bestehenden `aos-docs-viewer` angezeigt werden (Markdown-Rendering)
4. **Bearbeiten aller Dateien:** Jede `*.md` Datei kann im Edit-Modus bearbeitet und gespeichert werden
5. **Interaktive Checkboxen:** Markdown-Checkboxen (`- [ ]` / `- [x]`) sind im gerenderten View anklickbar
6. **Checkbox-Persistierung:** Beim Anklicken einer Checkbox wird die Änderung sofort in der Datei gespeichert (Toggle `[ ]` ↔ `[x]`)
7. **Datei-Liste als API:** Backend liefert eine Liste aller verfügbaren `*.md` Dateien im Spec-Ordner (mit relativen Pfaden)

## Affected Areas & Dependencies

- `kanban-board.ts` - Spec Viewer Modal: Tab-Generierung muss dynamisch werden
- `aos-docs-viewer.ts` - Markdown Rendering: Checkbox-Interaktivität hinzufügen
- `websocket.ts` - Backend Handler: `specs.read` und `specs.save` erweitern, neuer `specs.list` Handler
- `specs-reader.ts` - SpecsReader Service: Neue Methode zum Auflisten aller `.md` Dateien
- **Bestehende Komponente wiederverwendbar:** `aos-docs-viewer` und `aos-docs-editor` bleiben die Anzeige-/Edit-Komponenten

## Edge Cases & Error Scenarios

- **Leerer Spec-Ordner:** Graceful Handling wenn kein `.md` file existiert
- **Gelöschte Datei:** Wenn eine Datei zwischen Listing und Lesen gelöscht wird → Fehlermeldung im Viewer
- **Gleichzeitige Bearbeitung:** Wenn User eine Datei editiert, die extern geändert wurde → Hinweis beim Speichern
- **Sehr viele Dateien:** Bei >20 Tabs pro Gruppe → horizontales Scrolling mit Overflow-Handling
- **Checkbox in Code-Block:** Checkboxen innerhalb von `` ```code blocks``` `` dürfen NICHT interaktiv sein
- **Spezialzeichen in Dateinamen:** Korrekte URL-Enkodierung für Dateinamen mit Leerzeichen/Umlauten

## Security & Permissions

- Dateizugriff ist auf den Spec-Ordner beschränkt (kein Path Traversal)
- Nur `*.md` Dateien werden angezeigt (keine anderen Dateitypen)
- Backend validiert, dass der angeforderte Pfad innerhalb des Spec-Ordners liegt

## Performance Considerations

- Dateiliste wird einmalig beim Öffnen des Viewers geladen (kein Polling)
- Dateien werden erst beim Tab-Klick geladen (Lazy Loading), nicht alle auf einmal
- Checkbox-Toggle sendet minimalen Payload (nur geänderte Zeile oder Full-Content-Save)

## Scope Boundaries

**IN SCOPE:**
- Dynamische Tab-Generierung aus allen `*.md` Dateien im Spec-Ordner (rekursiv)
- Gruppierung der Tabs nach Ordnerstruktur (Hauptordner, stories/, sub-specs/, etc.)
- Lesen und Bearbeiten aller `*.md` Dateien
- Interaktive Markdown-Checkboxen mit Persistierung
- Backend-API zum Auflisten aller Dateien
- Horizontales Tab-Scrolling

**OUT OF SCOPE:**
- Anzeige von JSON-Dateien (kanban.json)
- Erstellen neuer Dateien über das UI
- Löschen von Dateien über das UI
- Drag-Drop zum Umordnen der Tabs
- Suche innerhalb der Spec-Dokumente
- Diff-Ansicht bei Änderungen

## Open Questions (if any)

- Keine offenen Fragen

## Proposed User Stories (High Level)

1. **Backend: Spec-Dateien auflisten** - Neuer WebSocket-Handler `specs.list` der alle `*.md` Dateien im Spec-Ordner rekursiv auflistet und nach Ordner gruppiert zurückgibt
2. **Backend: Generische Datei-Read/Save** - `specs.read` und `specs.save` Handler erweitern, sodass sie beliebige `*.md` Dateien (nicht nur spec.md/spec-lite.md) lesen/speichern können
3. **Frontend: Dynamische Tab-Generierung** - Kanban-Board Spec Viewer so erweitern, dass Tabs dynamisch aus der Dateiliste generiert werden, gruppiert nach Ordner
4. **Frontend: Interaktive Checkboxen** - Markdown-Renderer erweitern, sodass Checkboxen klickbar sind und Änderungen sofort persistiert werden

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
