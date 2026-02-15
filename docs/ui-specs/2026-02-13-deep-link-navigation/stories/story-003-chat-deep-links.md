# Chat Deep Links

> Story ID: DLN-003
> Spec: Deep Link Navigation
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: DLN-001
<<<<<<< HEAD
=======
**Status**: Done
>>>>>>> 40e0947e98a8772e353d077cd90b75981a13b604

**Integration:** router.service → chat-view (Route-Parameter lesen/schreiben)

---

## Feature

```gherkin
Feature: Chat Deep Links
  Als Entwickler
  möchte ich dass die aktive Chat-Session in der URL abgebildet wird,
  damit ich nach einem Reload zur gleichen Chat-Ansicht zurückkehre.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Chat-View URL bleibt stabil

```gherkin
Scenario: Chat-Ansicht hat eine stabile URL
  Given ich bin auf der Chat-Ansicht
  When ich die Seite neu lade
  Then lande ich wieder auf der Chat-Ansicht
  And die URL zeigt "#/chat"
```

### Szenario 2: Chat-Session in URL (wenn Session-Konzept vorhanden)

```gherkin
Scenario: Chat-Session wird in URL abgebildet
  Given ich habe eine aktive Chat-Session
  When die Session geladen wird
  Then wird die Session-ID in der URL abgebildet als "#/chat/{session-id}"
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Ungültige Session-ID in URL
  Given die URL enthält "#/chat/nicht-existierende-session"
  When die Seite geladen wird
  Then wird die Chat-Übersicht angezeigt
  And ich erhalte einen Hinweis dass die Session nicht gefunden wurde
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: `agent-os-ui/ui/src/views/chat-view.ts` (MODIFY)

### Inhalt-Prüfungen

- [ ] CONTAINS: `chat-view.ts` importiert `routerService` aus `../services/router.service.js`

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui/ui && npx eslint src/views/chat-view.ts`
- [ ] BUILD_PASS: `cd agent-os-ui/ui && npx tsc --noEmit`

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
<<<<<<< HEAD
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [ ] Unit Tests geschrieben und bestanden
- [ ] Integration Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)
=======
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)
>>>>>>> 40e0947e98a8772e353d077cd90b75981a13b604

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `chat-view.ts` (MODIFY) | Minimale Router-Integration: Basis-URL `#/chat` sicherstellen, Session-Deep-Links vorbereiten (deferred bis Session-Management UI existiert) |

---

### Technical Details

**WAS:**
- Minimale Router-Integration in `chat-view.ts`: `routerService` importieren
- Bei `connectedCallback`: Route-Params lesen. Da Session-Management UI noch nicht existiert, wird nur `#/chat` unterstuetzt (kein `sessionId`-Segment in v1)
- Vorbereitung fuer spaetere Session-Deep-Links: Kommentar-Block der zeigt wo kuenftig `sessionId` aus der Route gelesen wird
- Route-Change-Subscription einrichten (analog zu anderen Views) damit Browser Back/Forward korrekt zur Chat-View navigiert

**WIE (Architektur-Guidance ONLY):**
- Gleiches `routerService.on('route-changed', handler)` Pattern wie in dashboard-view verwenden
- Da kein Session-Konzept vorhanden: keine URL-Parameter schreiben, nur `#/chat` als Basis-Route registrieren
- Subscription in `connectedCallback` / Unsubscription in `disconnectedCallback` analog zum bestehenden `boundHandlers` Pattern in chat-view.ts
- Keine Aenderung am bestehenden Chat-Message-Flow oder WebSocket-Handling

**WO:**
- `agent-os-ui/ui/src/views/chat-view.ts` (MODIFY - ~5 Zeilen hinzugefuegt)

**WER:** codebase-analyzer

**Abhängigkeiten:** DLN-001

**Geschätzte Komplexität:** XS

**Relevante Skills:** Keine projektspezifischen Skills vorhanden. Orientierung an bestehenden Patterns: `chat-view.ts` `setupWebSocketHandlers()` Methode.

---

### Creates Reusable Artifacts

**Creates Reusable:** Nein - Aenderungen sind spezifisch fuer chat-view.

---

### Completion Check

```bash
# Pruefen ob routerService in chat-view importiert wird
grep -q "routerService" agent-os-ui/ui/src/views/chat-view.ts && echo "OK: routerService imported" || echo "FAIL: routerService not found"

# TypeScript Check
cd agent-os-ui/ui && npx tsc --noEmit && echo "OK: TypeScript compiles" || echo "FAIL: TypeScript errors"
```
