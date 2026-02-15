# Implementation Plan: Deep Link Navigation

**Status:** PENDING_USER_REVIEW
**Created:** 2026-02-13
**Spec:** 2026-02-13-deep-link-navigation

---

## 1. Executive Summary

Die Deep Link Navigation erweitert das bestehende Hash-basierte Routing in der Agent OS Web UI um Segment-basierte URLs, die den vollständigen Navigations-Zustand abbilden. Aktuell nutzt die App einfache Single-Segment-Hashes wie `#/dashboard` oder `#/settings`. Dieser Plan erweitert das zu Multi-Segment-Hashes wie `#/dashboard/spec/{id}/{tab}`, um Page Reload Persistence, Browser History Navigation und Shareable URLs zu ermöglichen.

Die zentrale Architektur-Entscheidung ist die Einführung eines **Router Service** als Standalone-Singleton (analog zu `projectStateService` und `gateway`), der URL-Parsing, Route-Matching und URL-Generierung zentralisiert. Views subscriben sich auf Route-Changes über diesen Service statt URL-State selbst zu verwalten.

**Geschätzter Scope:** 6 User Stories, ~7 bestehende Dateien betroffen, ~2 neue Dateien.

---

## 2. Architecture Decisions

### AD-1: Standalone Router Service (nicht in app.ts erweitern)

**Entscheidung:** Neuen `router.service.ts` als Singleton-Service erstellen, analog zum bestehenden `project-state.service.ts` Pattern.

**Begründung:**
- `app.ts` hat bereits 1165 Zeilen mit massiver Verantwortung (Projects, Git, Terminals, Modals, Context). Route-Parsing/Generation dort hinzuzufügen verschlimmert das God-Object-Problem.
- Ein Service kann von jeder View importiert werden ohne Kopplung an die App-Komponente.
- Folgt dem bestehenden Architektur-Pattern: `projectStateService` ist ein Singleton, importiert von `app.ts` und anderen Konsumenten. Der Router-Service funktioniert genauso.
- Ermöglicht isoliertes Testen.

**Trade-off:** Minimale Indirektion (Views importieren einen Service statt eine Parent-Component-Property zu lesen), aber das matcht wie `gateway` und `projectStateService` bereits funktionieren.

### AD-2: Hash-basiertes Segment-Routing (kein History API)

**Entscheidung:** Hash-basiertes Routing (`#/view/param1/param2`) beibehalten und erweitern.

**Begründung:**
- Requirements schließen History API / Clean URLs explizit aus.
- Keine Server-Konfiguration nötig (lokale Anwendung).
- Kompatibel mit dem bestehenden `hashchange` Event-Listener in `app.ts`.
- Static File Serving funktioniert weiterhin unverändert.

### AD-3: Views treiben URL-Updates, Router treibt View-Wechsel

**Entscheidung:** Bidirektionaler Flow:
- **URL-Änderungen (extern)** → Router parst Hash, emittiert Route-Change-Event, Views lesen ihre Segmente und updaten internen State.
- **User-Interaktionen (intern)** → Views rufen `routerService.navigate(...)` auf, was `window.location.hash` setzt und den Hashchange-Zyklus triggert.

**Begründung:** Single Source of Truth (der URL-Hash) verhindert Split-Brain zwischen URL und Component-State.

### AD-4: Lazy Validation, keine zusätzlichen API-Calls

**Entscheidung:** Ungültige Deep Links werden **nach** dem View-Laden und der bestehenden Daten-Abfrage-Logik behandelt. Keine zusätzlichen API-Calls für URL-Validierung.

**Begründung:**
- Performance-Anforderung: "Keine zusätzlichen API-Calls nur für URL-Validierung."
- Die bestehende `specs.kanban` WebSocket-Nachricht behandelt Fehler bereits (emittiert `specs.error`). Das wird wiederverwendet.
- Bei Fehler fällt die View auf einen sicheren Zustand zurück und zeigt einen Toast.

### AD-5: Event-basierte Kommunikation (EventTarget + Service)

**Entscheidung:** Router Service nutzt ein EventTarget-basiertes Pattern (analog zum bestehenden `gateway.on()`/`gateway.off()` Pattern) um Subscriber über Route-Changes zu notifizieren.

**Begründung:** Konsistent mit den etablierten Kommunikations-Patterns der Codebase. Keine neuen Dependencies nötig.

---

## 3. Component Overview

### Neue Komponenten

| Komponente | Typ | Beschreibung |
|------------|-----|--------------|
| `router.service.ts` | Service | Singleton-Service für URL-Parsing, Route-Matching, Navigation, Event-Emission |
| `route.types.ts` | Types | Route-Typ-Definitionen, ParsedRoute-Interfaces, Route-Konstanten |

### Bestehende Komponenten (zu modifizieren)

| Komponente | Änderungsgrad | Beschreibung der Änderung |
|------------|---------------|---------------------------|
| `app.ts` | Moderat (~30 Zeilen) | Hash-Handler entfernen, Router-Service-Integration, Route-Subscription |
| `dashboard-view.ts` | Moderat (~40-50 Zeilen) | Spec-ID + Tab aus Route lesen, URL bei Navigation updaten |
| `chat-view.ts` | Minimal (~5 Zeilen) | Basis-Integration (Session-Management UI existiert noch nicht) |
| `workflow-view.ts` | Moderat (~20-30 Zeilen) | Workflow-ID in URL tracken, Fallback bei Stale-IDs |
| `settings-view.ts` | Minimal (~10 Zeilen) | Tab aus Route lesen, URL bei Tab-Wechsel updaten |

---

## 4. Komponenten-Verbindungen

| Source | Target | Verbindungstyp | Zuständige Story |
|--------|--------|----------------|------------------|
| `router.service` | `app.ts` | EMITS route-changed Events | Story 1 + 2 (Router + App-Integration) |
| `app.ts` | `router.service` | SUBSCRIBES to route events | Story 1 |
| `dashboard-view` | `router.service` | READS route params, WRITES via navigate() | Story 2 |
| `chat-view` | `router.service` | READS route params, WRITES via navigate() | Story 3 |
| `workflow-view` | `router.service` | READS route params, WRITES via navigate() | Story 4 |
| `settings-view` | `router.service` | READS route params, WRITES via navigate() | Story 5 |
| Alle Views | Toast-System | Error-Feedback bei ungültigen Links | Story 6 |

**Keine verwaisten Komponenten:** Jede neue/modifizierte Komponente hat mindestens eine Verbindung.

---

## 5. URL Patterns

```
#/dashboard                         -> { view: 'dashboard', params: {} }
#/dashboard/spec/{specId}           -> { view: 'dashboard', params: { specId } }
#/dashboard/spec/{specId}/{tab}     -> { view: 'dashboard', params: { specId, tab } }
#/chat                              -> { view: 'chat', params: {} }
#/chat/{sessionId}                  -> { view: 'chat', params: { sessionId } }
#/workflows                         -> { view: 'workflows', params: {} }
#/workflows/{workflowId}            -> { view: 'workflows', params: { workflowId } }
#/settings                          -> { view: 'settings', params: {} }
#/settings/{tab}                    -> { view: 'settings', params: { tab } }
```

---

## 6. Implementation Phases

### Phase 1: Router Service Foundation (Story 1)
- Neuen `router.service.ts` erstellen (Singleton, URL-Parsing, Event-Emission)
- `route.types.ts` mit Typ-Definitionen
- `app.ts` Migration: Hash-Handler durch Router-Service ersetzen
- **Blocker für alle anderen Phasen**

### Phase 2: Dashboard Deep Links (Story 2)
- Spec-ID und Tab aus URL lesen bei Mount
- URL updaten bei Spec-Auswahl und Tab-Wechsel
- Route-Change-Subscription für Browser Back/Forward
- **Komplexeste View-Integration**

### Phase 3: Chat Deep Links (Story 3)
- Basis-Integration (nur `#/chat`, Session-Konzept minimal)
- Session-Management UI existiert noch nicht → vereinfachte Integration

### Phase 4: Workflow Deep Links (Story 4)
- Workflow/Execution-ID in URL abbilden
- Fallback bei Stale-IDs nach Reload

### Phase 5: Settings Deep Links (Story 5)
- Tab-Segment in URL abbilden
- Einfachste View-Integration (nur 1 State-Dimension)

### Phase 6: Edge Case Handling (Story 6)
- Ungültige Spec-IDs → Toast + Fallback
- Ungültige Tab-Namen → Silent Correction
- Ungültige Session/Workflow-IDs → Fallback
- Projekt-Kontext-Mismatch → Toast-Nachricht
- Leerer Hash → Default zu `#/dashboard`

---

## 7. Dependencies & Sequencing

```
Story 1 (Router Service) ─── BLOCKER ───┐
                                         ├──→ Story 2 (Dashboard)  ──┐
                                         ├──→ Story 3 (Chat)        ├──→ Story 6 (Edge Cases)
                                         ├──→ Story 4 (Workflows)  ──┤
                                         └──→ Story 5 (Settings)   ──┘
```

- Story 1 blockiert alle anderen Stories
- Stories 2-5 sind **unabhängig** voneinander (parallel möglich)
- Story 6 hängt von allen View-Integrationen ab

---

## 8. Risks & Mitigations

| Risiko | Impact | Wahrscheinlichkeit | Mitigation |
|--------|--------|---------------------|------------|
| Infinite Hash-Change Loops | App friert ein | Mittel | Router-Service trackt "pending navigation" Flag; überspringt Processing wenn neuer Hash = aktueller State |
| Race Condition: Route-Change während Daten-Laden | Stale Data angezeigt | Mittel | Views prüfen ob aktuelle Route noch matcht nach async Daten-Ankunft (Guard Pattern) |
| Breaking bestehender `window.location.hash` Zuweisungen | Navigation bricht | Hoch | Alle direkten Hash-Zuweisungen im Codebase auditieren und durch `routerService.navigate()` ersetzen |
| Chat Session-ID Konzept fehlt | Story 3 unvollständig | Mittel | Vereinfachung auf `#/chat` only in v1; Session-Deep-Links deferred bis Session-Management UI existiert |
| Workflow-IDs sind ephemeral | Deep Links stale nach Reload | Mittel | Graceful Fallback auf `#/workflows` mit Info-Toast |

### Bekannte direkte Hash-Zuweisungen im Code
1. `app.ts` Zeile ~438: `navigateTo()` Methode
2. `dashboard-view.ts` Zeile ~1217: `handleCreateSpecStart()` → `window.location.hash = '#/workflows'`
3. `app.ts` Zeile ~635: `handleWorkflowStart()` → `window.location.hash = '#/workflows'`

---

## 9. Self-Review Results

### Vollständigkeits-Check
- [x] Alle 4 Views abgedeckt (Dashboard, Chat, Workflows, Settings)
- [x] Browser History (Back/Forward) durch native `hashchange` behandelt
- [x] Edge Cases dokumentiert (ungültige Links, Projekt-Kontext)
- [x] Keine Server-Änderungen nötig (bestätigt: nur Hash-basiert)
- [x] Performance: Keine Extra-API-Calls, synchrones URL-Parsing
- [x] Alle Komponenten-Verbindungen definiert und zugeordnet

### Konsistenz-Check
- [x] Router-Service folgt bestehendem Singleton-Pattern (`projectStateService`, `gateway`)
- [x] Event-Pattern matcht `gateway.on()`/`gateway.off()` Konvention
- [x] Datei-Naming folgt `kebab-case.service.ts` Konvention
- [x] Typ-Naming folgt `PascalCase` Konvention

### Alternativen bewertet
- **Lit Router Library:** Abgelehnt - fügt externe Dependency hinzu für einfaches Hash-Routing. Custom Service ist ~100-150 Zeilen und voll zugeschnitten.
- **app.ts direkt erweitern:** Abgelehnt - app.ts ist bereits überdimensioniert mit 1165 Zeilen und zu vielen Verantwortlichkeiten.
- **URL Query Parameters:** Out of Scope per Requirements.

---

## 10. Minimal-Invasive Optimizations

### Was unverändert bleibt
- **Gateway** (`gateway.ts`): Keine Änderungen. WebSocket ist URL-unabhängig.
- **Backend**: Keine Änderungen. Hash-Routing ist rein Client-seitig.
- **Project Context** (`project-context.ts`): Keine Änderungen. Projekt-Wechsel ist orthogonal zu URL-Routing.
- **Not-Found View**: Funktioniert bereits als Fallback.
- **Alle Child-Komponenten** (kanban-board, spec-card, workflow-card etc.): Keine Änderungen. Sie emittieren Events nach oben; Parent-Views handeln URL-Updates.

### Was minimal geändert wird
- **app.ts**: ~30 Zeilen geändert (Hash-Handler entfernen, Router-Service-Import und Subscription). Rendering-Logik bleibt identisch.
- **settings-view.ts**: ~10 Zeilen hinzugefügt (Tab aus Route lesen bei Mount, URL bei Tab-Wechsel updaten).
- **chat-view.ts**: ~5 Zeilen hinzugefügt (minimal, da Session-Management-UI noch nicht existiert).

### Was moderat geändert wird
- **dashboard-view.ts**: ~40-50 Zeilen hinzugefügt. Komplexeste View wegen Spec-ID + Tab-Kombinationen. Braucht Route-Reading bei Mount, URL-Updates bei Spec-Select, Tab-Change und Kanban-Back. Guard-Logic für Handling von Stale Routes nach async Data-Loads.
- **workflow-view.ts**: ~20-30 Zeilen hinzugefügt. Execution-ID-Tracking in URL; Fallback bei Stale-IDs.

### Wiederverwendung bestehender Patterns
- **Singleton-Service-Pattern**: Kopiert von `projectStateService`
- **Event-Subscription-Pattern**: Kopiert von `gateway.on()`/`gateway.off()`
- **Toast-Notifications für Errors**: Wiederverwendung des bestehenden `show-toast` Custom-Event-Patterns
- **SessionStorage**: NICHT für Routes verwendet (URL IST die Persistence)

### Feature-Preservation Checklist
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erreichbar

---

*Erstellt mit Agent OS /create-spec v3.4 - Plan Agent*
