# Implementierungsplan: Multi-Project Support

> **Status:** APPROVED (Retrospektiv erstellt)
> **Spec:** agent-os/specs/2026-01-30-multi-project-support
> **Erstellt:** 2026-01-30
> **Modernisiert:** 2026-02-02 (v3.1 Compliance)
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Multi-Project Support ermöglicht Entwicklern das gleichzeitige Öffnen und Wechseln zwischen mehreren Agent OS Projekten über eine Tab-Navigation im Header. Jedes Projekt erhält eine eigene WebSocket-Verbindung, sodass Workflows unabhängig voneinander laufen können.

---

## Architektur-Entscheidungen

### Gewählter Ansatz
**Tab-basierte Multi-Projekt-Architektur** mit projekt-spezifischem State-Management und separaten WebSocket-Verbindungen pro Projekt.

### Begründung
- **Isolation**: Projekte beeinflussen sich nicht gegenseitig (keine Workflow-Kollisionen)
- **Performance**: Nur aktive Projekte verbrauchen Ressourcen (Lazy WebSocket)
- **UX**: Bekanntes Tab-Pattern wie in IDEs (VS Code, Browser)
- **Wiederherstellbarkeit**: sessionStorage ermöglicht Zustand-Persistenz nach Refresh

### Patterns & Technologien
- **Pattern:** Lit Context API für globales State-Management
- **Pattern:** Observer für WebSocket-Nachrichten-Routing
- **Technologie:** sessionStorage für Tab-Persistenz, localStorage für Recently Opened
- **Begründung:** Native Browser-APIs, keine zusätzlichen Abhängigkeiten

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `aos-project-tabs` | UI | Tab-Leiste mit Projekt-Navigation |
| `aos-project-add-modal` | UI | Dialog zum Hinzufügen von Projekten |
| `RecentlyOpenedService` | Service (FE) | localStorage-Persistenz für Projekt-Historie |
| `ProjectContextService` | Service (BE) | Multi-Projekt-Context-Management |
| `WebSocketManagerService` | Service (BE) | Multi-Connection WebSocket-Routing |
| `ProjectContext` | Context (FE) | Lit Context für aktives Projekt |
| `ProjectStateService` | Service (FE) | Projekt-Wechsel-Logik und Synchronisation |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `app.ts` | Erweitern | Integration von Project-Tabs und Context Provider |
| `gateway.ts` | Erweitern | projectId in API-Calls und WebSocket |
| `websocket.ts` | Erweitern | Multi-Connection Support mit projectId-Routing |
| `specs-reader.ts` | Erweitern | Projekt-spezifischer Pfad statt hardcoded |
| `workflow-executor.ts` | Erweitern | projectId für Workflow-Zuordnung |
| `dashboard-view.ts` | Erweitern | Context Consumer für Projekt-Wechsel |

### Nicht betroffen (explizit)
- `workflow-chat.ts` - Wird nur zurückgesetzt, keine Logik-Änderung
- `kanban-board.ts` - Konsumiert nur neue Specs, keine Änderung nötig
- `model-selector.ts` - Projekt-unabhängig

---

## Komponenten-Verbindungen

| Source | Target | Art | Zuständige Story |
|--------|--------|-----|------------------|
| `aos-project-tabs` | `aos-project-add-modal` | Event: `add-project` | MPRO-002 |
| `aos-project-add-modal` | `RecentlyOpenedService` | Methode: `getRecentlyOpened()` | MPRO-002 |
| `aos-project-tabs` | `ProjectStateService` | Event: `tab-select` → `switchProject()` | MPRO-006 |
| `ProjectStateService` | `ProjectContextService` (BE) | REST: `POST /api/project/switch` | MPRO-006 |
| `WebSocketManagerService` | `ProjectContextService` | Methode: `getProjectPath(projectId)` | MPRO-005 |
| `gateway.ts` | `WebSocketManagerService` | WebSocket: `projectId` in Messages | MPRO-005 |

---

## Umsetzungsphasen

### Phase 1: Foundation (Parallel)
**Ziel:** Grundkomponenten ohne Abhängigkeiten erstellen
**Komponenten:**
- MPRO-001: `aos-project-tabs` (Frontend UI)
- MPRO-003: `RecentlyOpenedService` (Frontend Service)
- MPRO-004: `ProjectContextService` (Backend Service + Routes)

**Abhängig von:** Nichts (Startphase)

### Phase 2: Core Features (Sequential)
**Ziel:** Kern-Features mit Abhängigkeiten
**Komponenten:**
- MPRO-005: `WebSocketManagerService` (nach MPRO-004)
- MPRO-002: `aos-project-add-modal` (nach MPRO-001, MPRO-003)

**Abhängig von:** Phase 1

### Phase 3: Integration Layer
**Ziel:** Frontend State-Management und End-to-End Verbindung
**Komponenten:**
- MPRO-006: `ProjectContext` + `ProjectStateService` (nach MPRO-001, MPRO-004, MPRO-005)

**Abhängig von:** Phase 1 + Phase 2

### Phase 4: Validation
**Ziel:** End-to-End Tests und Integration Validation
**Komponenten:**
- MPRO-999: Integration & E2E Tests

**Abhängig von:** Alle vorherigen Phasen

---

## Abhängigkeiten

### Interne Abhängigkeiten
```
MPRO-001 (Tab-Navigation) ────────────────────┐
                                               │
MPRO-003 (Recently Opened) ───────────────────┼──→ MPRO-002 (Add Modal)
                                               │
MPRO-004 (Backend Context) ───────────────────┼──→ MPRO-005 (WebSocket) ──┐
                                               │                           │
                                               └───────────────────────────┼──→ MPRO-006 (Context Switching)
                                                                           │
                                                                           ↓
                                                            MPRO-999 (Integration)
```

### Externe Abhängigkeiten
- **File System Access API**: Browser-native Ordnerauswahl (nur Chrome/Edge)
- **WebSocket API**: Bestehende Infrastruktur, keine neue Bibliothek

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| File System Access API nicht in allen Browsern | Medium | Medium | Fallback-Text-Input für Pfad |
| WebSocket Memory Leaks bei vielen Projekten | Low | High | Explicit Cleanup in `ws.on('close')` |
| Race Conditions beim schnellen Tab-Wechsel | Medium | Medium | Debounce in `switchProject()` |
| sessionStorage voll | Low | Low | Limit auf 20 offene Projekte |

---

## Self-Review Ergebnisse

### Validiert
- [x] Alle Requirements aus Clarification sind als Stories abgedeckt
- [x] Layer-Trennung: Frontend-only, Backend-only, Full-stack Stories korrekt klassifiziert
- [x] Dependency-Graph ist azyklisch und logisch
- [x] Keine Story überschreitet 5 Dateien oder 400 LOC

### Identifizierte Probleme & Lösungen
| Problem | Ursprünglicher Plan | Verbesserung |
|---------|--------------------|--------------|
| WebSocket global statt projekt-spezifisch | Eine Verbindung für alle | `Map<projectId, WebSocket>` |
| Specs-Reader hardcoded | Fester Pfad | Dynamisch aus ProjectContext |

### Offene Fragen
- Keine offenen Fragen (Clarification war vollständig)

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| Modal-Pattern | `git-strategy-dialog.ts` | `aos-project-add-modal` |
| CustomEvent-Pattern | `story-card.ts` | `aos-project-tabs` |
| localStorage-Service | Nicht vorhanden | `RecentlyOpenedService` (Neu) |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| Separates CSS-File pro Komponente | Styles in `createRenderRoot()` | Weniger Dateien |
| Redux-artiges State Management | Lit Context API | Keine Dependency |

### Feature-Preservation bestätigt
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar

---

## Nächste Schritte

Da diese Spec bereits teilweise implementiert ist:
1. ✅ MPRO-001 und MPRO-003 sind fertig
2. → MPRO-002, MPRO-004, MPRO-005, MPRO-006 implementieren
3. → MPRO-999 Integration Tests
4. → System Stories (997, 998, 999) ausführen
