# Requirements Clarification: Model Selection for Kanban Board

## Feature Overview

**Feature Name:** Model Selection for Story Execution
**Requested By:** User
**Date:** 2026-02-01

### Problem Statement
Aktuell wird bei der Story-Ausführung kein Modell ausgewählt - das System verwendet immer das Standard-Modell. User benötigen die Möglichkeit, pro Story das Claude-Modell (Opus, Sonnet, Haiku) auszuwählen, um Kosten und Qualität je nach Story-Komplexität zu optimieren.

### Target Users
- Entwickler die mit Agent OS arbeiten
- Product Owner die Stories priorisieren und ausführen

### Business Value
- **Kostenoptimierung**: Einfache Stories können mit Haiku schneller und günstiger ausgeführt werden
- **Qualitätskontrolle**: Komplexe Stories profitieren von Opus' höherer Qualität
- **Flexibilität**: User können pro Story entscheiden statt global
- **Transparenz**: Sichtbare Auswahl zeigt welches Modell verwendet wird

---

## Functional Requirements

### FR-1: Model Dropdown auf Story-Cards
- Ein Dropdown zur Modell-Auswahl soll **immer sichtbar** auf jeder Story-Card angezeigt werden
- Verfügbare Optionen: **Opus**, **Sonnet**, **Haiku**
- Standard-Auswahl: **Opus**

### FR-2: Persistenz der Auswahl
- Die Modell-Auswahl wird **pro Story persistent** gespeichert
- Beim erneuten Laden des Kanban-Boards wird die Auswahl wiederhergestellt
- Speicherort: Im Kanban-Board Markdown (neue Spalte)

### FR-3: Scope
- Gilt für **Spec-Stories** und **Backlog-Items**
- Beide Kanban-Board Typen unterstützen die Model-Auswahl

### FR-4: Integration mit Workflow-Execution
- Bei Story-Start wird das gewählte Modell an den Workflow-Executor übergeben
- Der Claude Code Prozess wird mit dem entsprechenden `--model` Flag gestartet

---

## Affected Areas

### Frontend (Lit Components)
- `story-card.ts` - Dropdown hinzufügen
- `kanban-board.ts` - Model-Change Events verarbeiten
- Neue CSS-Styles für Dropdown

### Backend (Express + TypeScript)
- `specs-reader.ts` - Model-Spalte parsen
- `backlog-reader.ts` - Model-Spalte parsen
- `websocket.ts` - Neuer Message-Typ für Model-Update
- `workflow-executor.ts` - Model an Claude Code übergeben

### Daten (Markdown)
- `kanban-board.md` - Neue Spalte "Model"
- Backlog-Kanban - Neue Spalte "Model"

---

## Edge Cases

### EC-1: Leere Auswahl
- Wenn kein Model gespeichert ist, wird **Opus** als Default verwendet

### EC-2: Migration bestehender Boards
- Bestehende Kanban-Boards ohne Model-Spalte werden automatisch migriert
- Alle Stories erhalten den Default-Wert "Opus"

### EC-3: Story bereits in Ausführung
- Dropdown wird deaktiviert wenn Story Status "in_progress" ist
- Visueller Hinweis (grayed out)

### EC-4: Inkonsistenz Spec vs Backlog
- Beide Board-Typen verwenden identische Model-Optionen
- Konsistente UI in beiden Kontexten

---

## Scope Boundaries

### In Scope
- Model-Dropdown auf Story-Cards (Specs + Backlog)
- Persistente Speicherung im Kanban-Markdown
- Übergabe an Workflow-Executor
- Default-Model: Opus

### Out of Scope
- Globale Default-Einstellung in Settings (kann später hinzugefügt werden)
- Kosten-Tracking pro Model
- Model-Empfehlungen basierend auf Story-Komplexität
- Automatische Model-Auswahl

---

## Acceptance Criteria (High-Level)

1. **AC-1**: User sieht ein Model-Dropdown auf jeder Story-Card
2. **AC-2**: Dropdown zeigt drei Optionen: Opus, Sonnet, Haiku
3. **AC-3**: Opus ist als Default vorausgewählt
4. **AC-4**: Änderungen werden sofort im Kanban-Markdown gespeichert
5. **AC-5**: Bei Story-Ausführung wird das gewählte Model verwendet
6. **AC-6**: Dropdown ist deaktiviert während Story in Ausführung ist

---

## Dependencies

- Keine externen Dependencies
- Basiert auf bestehendem Kanban-Board System (KSE-005)
- WebSocket Gateway bereits vorhanden

---

## Open Questions

1. ~~UI-Position des Dropdowns~~ → **Geklärt: Immer sichtbar**
2. ~~Default-Modell~~ → **Geklärt: Opus**
3. ~~Persistenz~~ → **Geklärt: Pro Story persistent**
4. ~~Scope~~ → **Geklärt: Beide (Specs + Backlog)**

**Alle Fragen sind geklärt. Spec ist ready für Implementierung.**
