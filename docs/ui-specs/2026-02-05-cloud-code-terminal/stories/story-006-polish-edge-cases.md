# Polish & Edge Cases

> Story ID: CCT-006
> Spec: Cloud Code Terminal
> Created: 2026-02-05
> Last Updated: 2026-02-05
> Status: Done

**Priority**: Medium
**Type**: Frontend/Backend
**Estimated Effort**: 2 SP
**Dependencies**: CCT-004, CCT-005

---

## Feature

```gherkin
Feature: Polish & Edge Cases
  Als Entwickler
  möchte ich robuste Fehlerbehandlung und Limits für das Cloud Terminal,
  damit das System stabil bleibt und Ressourcen nicht überlastet werden.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Maximale Sessions Limit

```gherkin
Scenario: Limit von 5 Sessions wird erreicht
  Given ich habe bereits 5 aktive Terminal-Sessions
  When ich versuche eine 6. Session zu starten
  Then wird eine Fehlermeldung angezeigt: "Maximale Anzahl Sessions (5) erreicht"
  And ein Hinweis wird angezeigt: "Bitte schließen Sie eine bestehende Session"
  And die neue Session wird nicht erstellt
```

### Szenario 2: Session Timeout nach Inaktivität

```gherkin
Scenario: Session wird nach 30 Minuten Inaktivität pausiert
  Given ich habe eine aktive Terminal-Session
  And ich habe für 30 Minuten keine Eingabe gemacht
  Then wird die Session automatisch pausiert
  And ich sehe einen Hinweis: "Session pausiert wegen Inaktivität"
  And ich kann die Session mit einem Klick fortsetzen
```

### Szenario 3: Fehler beim Session-Start

```gherkin
Scenario: Session-Start schlägt fehl
  Given ich möchte eine neue Session starten
  When das Backend einen Fehler zurückgibt (z.B. PTY nicht verfügbar)
  Then wird eine Fehlermeldung angezeigt: "Session konnte nicht gestartet werden"
  And ein "Erneut versuchen" Button wird angezeigt
  And der Fehler-Status wird im Tab angezeigt
```

### Szenario 4: Loading States

```gherkin
Scenario: Loading States werden angezeigt
  Given ich starte eine neue Session
  When die Session erstellt wird
  Then sehe ich einen Loading-Spinner
  And der Text "Session wird gestartet..." wird angezeigt
  When die Session bereit ist
  Then verschwindet der Loading-Spinner
  And das Terminal wird angezeigt
```

### Edge Case: Browser-Tab im Hintergrund

```gherkin
Scenario: Tab ist lange im Hintergrund
  Given ich habe eine aktive Terminal-Session
  When der Browser-Tab für >10 Minuten im Hintergrund ist
  Then wird die Session pausiert
  And Ressourcen werden freigegeben
  When ich zurück zum Tab wechsle
  Then wird die Session fortgesetzt
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: agent-os-ui/ui/src/services/cloud-terminal.service.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: agent-os-ui/ui/src/services/cloud-terminal.service.ts enthält "MAX_SESSIONS" OR "maxSessions"
- [ ] CONTAINS: agent-os-ui/ui/src/services/cloud-terminal.service.ts enthält "TIMEOUT" OR "timeout"
- [ ] CONTAINS: agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts enthält "loading" OR "spinner"

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

**Integration Type:** Full-stack

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | CloudTerminalService (MODIFY) | Add limits and timeout handling |
| Frontend | aos-cloud-terminal-sidebar (MODIFY) | Add loading states |
| Backend | CloudTerminalManager (MODIFY) | Add session limits |

**Kritische Integration Points:**
- Frontend → Backend: Session limit validation
- Frontend → Backend: Timeout handling

---

### Technical Details

**WAS:**
- Maximale Sessions Limit (5, konfigurierbar)
- Session Timeout nach Inaktivität (30 Minuten)
- Fehlerbehandlung für Session-Start
- Loading States für alle async Operationen
- Background-Tab Detection

**WIE (Architektur-Guidance ONLY):**
- MAX_SESSIONS = 5 (konfigurierbar via Config)
- INACTIVITY_TIMEOUT = 30 * 60 * 1000 ms
- Nutze Page Visibility API für Background-Tab Detection
- Implementiere Debounce für Inaktivitäts-Tracking
- Fehler-Handling: Zeige Retry-Option, logge Fehler

**WO:**
- agent-os-ui/ui/src/services/cloud-terminal.service.ts (MODIFY)
- agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts (MODIFY)
- agent-os-ui/src/server/services/cloud-terminal-manager.ts (MODIFY)

**WER:** dev-team__frontend-developer, dev-team__backend-developer

**Abhängigkeiten:** CCT-004, CCT-005

**Geschätzte Komplexität:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-state-management | agent-os/skills/frontend-state-management.md | Limits and timeout handling |
| backend-logic-implementing | agent-os/skills/backend-logic-implementing.md | Backend session limits |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| - | - | - | - |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "MAX_SESSIONS\|maxSessions" agent-os-ui/ui/src/services/cloud-terminal.service.ts
grep -q "TIMEOUT\|timeout" agent-os-ui/ui/src/services/cloud-terminal.service.ts
grep -q "loading\|spinner" agent-os-ui/ui/src/components/terminal/aos-cloud-terminal-sidebar.ts
cd agent-os-ui && npm run lint
cd agent-os-ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
