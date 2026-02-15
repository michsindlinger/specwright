# Session Persistence

> Story ID: CCT-004
> Spec: Cloud Code Terminal
> Created: 2026-02-05
> Last Updated: 2026-02-05
> Status: Done

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 3 SP
**Dependencies**: CCT-003

---

## Feature

```gherkin
Feature: Session Persistence
  Als Entwickler
  möchte ich dass meine Terminal-Sessions über Page-Reloads und Projektwechsel erhalten bleiben,
  damit ich meine Arbeit nicht verliere wenn ich die Seite neu lade oder das Projekt wechsle.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Sessions über Page-Reload erhalten

```gherkin
Scenario: Sessions bleiben nach Browser-Reload erhalten
  Given ich habe 2 aktive Terminal-Sessions
  When ich die Seite neu lade (F5)
  Then werden die Sessions aus IndexedDB wiederhergestellt
  And die Sidebar zeigt alle vorherigen Sessions an
  And die Sessions zeigen den Status "Pausiert" oder "Wiederverbinden"
  When ich auf eine Session klicke
  Then wird versucht die Session wiederherzustellen
```

### Szenario 2: Sessions bei Projektwechsel pausieren

```gherkin
Scenario: Sessions werden bei Projektwechsel pausiert
  Given ich habe im Projekt "A" 2 aktive Terminal-Sessions
  When ich zu Projekt "B" wechsle
  Then werden die Sessions von Projekt "A" pausiert
  And der Zustand wird in IndexedDB gespeichert
  And die Sidebar zeigt keine Sessions an (oder "Andere Projekt-Sessions")
  When ich zurück zu Projekt "A" wechsle
  Then werden die pausierten Sessions wiederhergestellt
  And ich kann mit den Sessions fortfahren
```

### Szenario 3: Session-Metadaten speichern

```gherkin
Scenario: Session-Metadaten werden persistiert
  Given ich habe eine Terminal-Session mit Namen "Bugfix Session"
  And das ausgewählte Modell ist "Claude Sonnet"
  And das Projekt ist "/Users/dev/project-a"
  When die Session persistiert wird
  Then werden gespeichert: Session-ID, Name, Modell, Projekt-Pfad, Status
  And der Terminal-Buffer wird nicht persistiert (nur Metadaten)
```

### Szenario 4: Session-Wiederherstellung

```gherkin
Scenario: Session wird nach Reload wiederhergestellt
  Given ich habe eine persistierte Session
  And die Seite wurde neu geladen
  When die App initialisiert wird
  Then lädt der CloudTerminalService alle Sessions aus IndexedDB
  And filtert nach dem aktuellen Projekt
  And zeigt die Sessions in der Sidebar an
```

### Edge Case: Session-Wiederherstellung fehlgeschlagen

```gherkin
Scenario: Session kann nicht wiederhergestellt werden
  Given ich habe eine persistierte Session
  And die Backend-Session wurde beendet (z.B. Server-Neustart)
  When ich versuche die Session wiederherzustellen
  Then wird eine Fehlermeldung angezeigt: "Session nicht mehr verfügbar"
  And die Session wird aus IndexedDB entfernt
  And ich kann eine neue Session starten
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/services/cloud-terminal.service.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/ui/src/services/cloud-terminal.service.ts enthält "class CloudTerminalService"
- [ ] CONTAINS: agent-os-ui/ui/src/services/cloud-terminal.service.ts enthält "indexedDB" OR "idb-keyval"
- [ ] CONTAINS: agent-os-ui/ui/src/services/cloud-terminal.service.ts enthält "saveSessions" OR "persistSessions"
- [ ] CONTAINS: agent-os-ui/ui/src/services/cloud-terminal.service.ts enthält "loadSessions" OR "restoreSessions"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd agent-os-ui && npm run lint
- [ ] BUILD_PASS: cd agent-os-ui && npm run build

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | - | No |

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
- [x] **Alle betroffenen Layer identifiziert** (Frontend/Backend/Database/DevOps)
- [x] **Integration Type bestimmt** (Backend-only/Frontend-only/Full-stack)
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer: API Contracts, Data Structures)

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
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

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | CloudTerminalService (NEW) | Session persistence service |
| Frontend | IndexedDB | Storage for session metadata |
| Frontend | gateway.ts (MODIFY) | Handle reconnection |

**Kritische Integration Points:**
- CloudTerminalService → IndexedDB: Session storage
- CloudTerminalService → gateway.ts: Session restoration

---

### Technical Details

**WAS:**
- CloudTerminalService für Session-State-Management
- IndexedDB-Integration für Persistenz
- Session-Wiederherstellung nach Reload
- Projekt-basiertes Session-Filtering

**WIE (Architektur-Guidance ONLY):**
- Nutze IndexedDB (idb-keyval oder native IDB) für Storage
- Speichere NUR Metadaten (Session-ID, Name, Modell, Projekt, Status)
- KEIN Terminal-Buffer-Persistenz (zu groß, wird neu aufgebaut)
- Session-State: 'active' | 'paused' | 'reconnecting' | 'closed'
- Kopiere Pattern aus recently-opened.service.ts für IDB-Operationen
- Reagiere auf project-change Events für Projektwechsel-Handling

**WO:**
- agent-os-ui/ui/src/services/cloud-terminal.service.ts (NEW)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** CCT-003

**Geschätzte Komplexität:** M

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-state-management | agent-os/skills/frontend-state-management.md | Session state management |
| frontend-persistence-adapter | agent-os/skills/frontend-persistence-adapter.md | IndexedDB integration |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| CloudTerminalService | Service | ui/src/services/cloud-terminal.service.ts | Session persistence and state management |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "class CloudTerminalService" agent-os-ui/ui/src/services/cloud-terminal.service.ts
grep -q "indexedDB\|idb-keyval" agent-os-ui/ui/src/services/cloud-terminal.service.ts
grep -q "saveSessions\|persistSessions\|loadSessions\|restoreSessions" agent-os-ui/ui/src/services/cloud-terminal.service.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
