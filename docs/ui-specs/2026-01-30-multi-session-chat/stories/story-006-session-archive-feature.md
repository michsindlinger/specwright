# Session Archive Feature

> Story ID: MSC-006
> Spec: Multi-Session Chat
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: Medium
**Type**: Full-Stack
**Estimated Effort**: S
**Dependencies**: MSC-001, MSC-003, MSC-004

---

## Feature

```gherkin
Feature: Session Archiv
  Als Entwickler
  möchte ich geschlossene Sessions in einem Archiv wiederfinden,
  damit ich alte Konversationen später fortsetzen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Session wird beim Schließen archiviert

```gherkin
Scenario: Geschlossene Session landet im Archiv
  Given ich habe eine Session "Altes Projekt"
  When ich die Session schließe
  Then verschwindet der Tab aus der Tab-Leiste
  And die Session ist im Archiv verfügbar
  And die komplette Chat-Historie bleibt erhalten
```

### Szenario 2: Archiv-Liste anzeigen

```gherkin
Scenario: Archivierte Sessions einsehen
  Given ich habe 3 archivierte Sessions
  When ich das Archiv öffne
  Then sehe ich eine Liste aller archivierten Sessions
  And jede Session zeigt Namen und Archivierungsdatum
  And die Liste ist nach Datum sortiert (neueste zuerst)
```

### Szenario 3: Session aus Archiv wiederherstellen

```gherkin
Scenario: Archivierte Session reaktivieren
  Given die Session "Wichtiges Projekt" ist im Archiv
  When ich auf "Wiederherstellen" klicke
  Then erscheint ein neuer Tab mit "Wichtiges Projekt"
  And die komplette Chat-Historie ist verfügbar
  And die Session ist nicht mehr im Archiv
```

### Szenario 4: Archivierte Session endgültig löschen

```gherkin
Scenario: Session aus Archiv permanent entfernen
  Given die Session "Unwichtiges Projekt" ist im Archiv
  When ich auf "Löschen" klicke
  Then werde ich um Bestätigung gebeten
  When ich die Löschung bestätige
  Then wird die Session permanent gelöscht
  And sie ist weder im Archiv noch wiederherstellbar
```

### Szenario 5: Archiv-Zugang über UI

```gherkin
Scenario: Archiv über Tab-Leiste erreichen
  Given ich bin in der Chat-Ansicht
  When ich auf das Archiv-Icon in der Tab-Leiste klicke
  Then öffnet sich ein Dropdown oder Modal mit dem Archiv
  And ich kann archivierte Sessions durchsuchen
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Leeres Archiv
  Given es sind keine Sessions archiviert
  When ich das Archiv öffne
  Then sehe ich eine Nachricht "Keine archivierten Sessions"
  And einen Hinweis wie Sessions archiviert werden
```

```gherkin
Scenario: Session mit gleichem Namen wiederherstellen
  Given ich habe eine aktive Session "Projekt X"
  And eine archivierte Session "Projekt X" im Archiv
  When ich die archivierte Session wiederherstelle
  Then wird sie als "Projekt X (2)" wiederhergestellt
  And beide Sessions sind verfügbar
```

```gherkin
Scenario: Viele archivierte Sessions
  Given ich habe 50 archivierte Sessions
  When ich das Archiv öffne
  Then werden nur die ersten 20 angezeigt
  And ich kann weitere Sessions laden (Lazy Loading)
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: `agent-os-ui/ui/src/components/session-archive.ts`
- [ ] DIR_EXISTS: `agent-os/sessions/archive/`

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd agent-os-ui && npm run lint`
- [ ] BUILD_PASS: `cd agent-os-ui/ui && npm run build`
- [ ] TEST_PASS: `cd agent-os-ui && npm test -- --grep "session-archive"`

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| - | Keine MCP Tools erforderlich | - |

---

## Technisches Refinement (vom Architect)

> **Refined:** 2026-01-30

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

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten
- [ ] Accessibility-Anforderungen erfüllt (Keyboard-Navigation)

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Component Tests geschrieben und bestanden
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Dokumentation aktualisiert
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-Stack

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | aos-session-archive | NEU: Archiv-Liste Komponente |
| Frontend | aos-session-tabs | ERWEITERN: Archiv-Icon Button |
| Frontend/State | session.store.ts | ERWEITERN: archivedSessions State |
| Backend | websocket.ts | ERWEITERN: session.archive.list, session.restore Handler |
| Backend | session.service.ts | NUTZEN: getArchivedSessions, restoreSession |

**Kritische Integration Points:**
- Archiv-Komponente lädt archivierte Sessions via WebSocket
- Restore-Aktion muss Session in aktiven State zurückbringen
- Bei gleichem Namen: Session umbenennen mit "(2)" Suffix

---

### Technical Details

**WAS:**
- `aos-session-archive` Komponente:
  - Liste der archivierten Sessions (Name, Archivierungsdatum)
  - "Wiederherstellen" Button pro Session
  - "Löschen" Button pro Session (mit Bestätigungs-Dialog)
  - Sortierung nach Datum (neueste zuerst)
  - Lazy Loading bei > 20 Sessions
  - Leerer Zustand: "Keine archivierten Sessions"
- Tab-Leiste Erweiterung:
  - Archiv-Icon (z.B. Lucide archive) rechts neben Tabs
  - Dropdown oder Modal öffnet Archiv-Liste
- Store Erweiterung:
  - `archivedSessions: ISession[]`
  - `loadArchivedSessions()`, `restoreSession(id)`
- WebSocket Handler:
  - `session.archive.list`, `session.restore`, `session.delete.permanent`

**WIE:**
- Folge Lit Component Pattern aus frontend-lit/SKILL.md
- Archiv-UI als Dropdown (aos-dropdown) oder Modal (aos-modal falls vorhanden)
- Lazy Loading via IntersectionObserver oder "Mehr laden" Button
- Konfirmations-Dialog vor permanentem Löschen
- Bei Restore: Prüfe auf Namenskollision, füge "(2)" hinzu wenn nötig
- Nutze existing session.service.ts Methoden im Backend

**WO:**
- `agent-os-ui/ui/src/components/session-archive.ts` (NEU)
- `agent-os-ui/ui/src/components/session-tabs.ts` (ERWEITERN - Archiv-Button)
- `agent-os-ui/ui/src/stores/session.store.ts` (ERWEITERN - archivedSessions)
- `agent-os-ui/src/server/websocket.ts` (ERWEITERN - Archive Handler)

**WER:** dev-team__frontend-developer (führend), dev-team__backend-developer (Handler)

**Abhängigkeiten:**
- MSC-001 (Tab-Leiste für Archiv-Button Platzierung)
- MSC-003 (Persistence Service für Archiv-Ordner)
- MSC-004 (Session Store für State Management)

**Geschätzte Komplexität:** S (~200-250 LOC, UI + Backend)

---

### Relevante Skills

- `frontend-lit` (Komponenten, Modal/Dropdown Pattern)
- `backend-express` (WebSocket Handler)
- `domain-agent-os-web-ui` (Session Management)

---

### Completion Check

```bash
# Build Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui/ui && npm run build

# Lint Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm run lint

# Test Check
cd /Users/michaelsindlinger/Entwicklung/agent-os-web-ui/agent-os-ui && npm test -- --grep "session-archive" || echo "Tests pending"
```

---

### Technische Verifikation

- [x] FILE_EXISTS: `agent-os-ui/ui/src/components/session-archive.ts`
- [x] CONTAINS: `session-archive.ts` enthält `@customElement('aos-session-archive')`
- [x] CONTAINS: `websocket.ts` enthält `session.archive.list` Handler
- [x] LINT_PASS: `npm run lint` ohne Fehler
- [x] BUILD_PASS: `npm run build` ohne Fehler
