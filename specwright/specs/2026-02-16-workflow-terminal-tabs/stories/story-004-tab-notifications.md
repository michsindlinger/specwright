# Tab-Notifications bei Input-Bedarf

> Story ID: WTT-004
> Spec: Workflow Terminal Tabs
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: WTT-002

---

## Feature

```gherkin
Feature: Visuelle Benachrichtigung bei Terminal-Input-Bedarf
  Als Entwickler
  moechte ich sehen wenn ein Workflow-Tab auf meine Eingabe wartet,
  damit ich nicht staendig jeden Tab manuell pruefen muss.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Badge erscheint bei Input-Bedarf

```gherkin
Scenario: Tab zeigt Badge wenn Claude eine Frage stellt
  Given ein Workflow laeuft in einem inaktiven Terminal-Tab
  When Claude im Terminal eine Frage stellt
  Then erscheint ein Badge/Indikator am Tab
  And der Tab-Titel aendert seine Farbe
```

### Szenario 2: Badge verschwindet bei Tab-Fokus

```gherkin
Scenario: Notification verschwindet wenn Tab aktiv wird
  Given ein Workflow-Tab hat einen aktiven Input-Badge
  When ich diesen Tab anklicke und er aktiv wird
  Then verschwindet der Badge
  And der Tab-Titel kehrt zur normalen Farbe zurueck
```

### Szenario 3: Mehrere Tabs mit Notifications

```gherkin
Scenario: Mehrere Workflow-Tabs zeigen gleichzeitig Notifications
  Given drei Workflows laufen in verschiedenen Tabs
  And zwei davon warten auf Input
  When ich die Tab-Leiste betrachte
  Then zeigen genau die zwei wartenden Tabs einen Badge
  And der aktive Tab zeigt keinen Badge
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: False-Positive bei Terminal-Output
  Given ein Workflow laeuft und produziert viel Output
  When der Output zufaellig ein Prompt-aehnliches Muster enthaelt
  Then soll moeglichst kein falscher Badge angezeigt werden
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] CONTAINS: ui/frontend/src/components/terminal/aos-terminal-tabs.ts enthaelt "needsInput"
- [ ] CONTAINS: ui/frontend/src/styles/theme.css enthaelt "needs-input"

### Funktions-Pruefungen

- [ ] BUILD_PASS: cd ui/frontend && npm run build

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und pruefbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschaetzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [x] Alle Akzeptanzkriterien erfuellt
- [x] Tests geschrieben und bestanden
- [x] Code Review durchgefuehrt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | aos-terminal-tabs.ts | Badge-Rendering, Farbwechsel CSS |
| Frontend | aos-cloud-terminal-sidebar.ts | needsInput State-Management |
| Frontend | theme.css | CSS-Klassen fuer needs-input State |

---

### Technical Details

**WAS:**
- `needsInput` Property auf `TerminalSession` Interface (bereits in WTT-002 definiert) wird jetzt aktiv genutzt
- Badge/Dot-Element in `aos-terminal-tabs.ts` das angezeigt wird wenn `session.needsInput === true`
- CSS-Klasse `.tab.needs-input` mit Farbwechsel (orange/gelb) im Tab-Titel
- Heuristik-basierte Input-Detection: Terminal-Output-Monitoring auf Prompt-Patterns
- Badge verschwindet automatisch wenn Tab aktiv wird

**WIE (Architektur-Guidance):**
- Input-Detection Heuristik: Nutze xterm.js `onData` oder Buffer-Monitoring um auf Prompt-Patterns zu pruefen (z.B. `?` am Ende einer Zeile, Claude CLI Prompt-Marker)
- Alternativ: Backend sendet `cloud-terminal:needs-input` WebSocket Message wenn PTY-Output ein bestimmtes Pattern enthaelt
- CSS Custom Properties nutzen fuer Farbwechsel (kompatibel mit Theme-System: `--color-warning` fuer needsInput)
- Badge als kleiner Punkt (Dot) rechts oben am Tab -- CSS `::after` Pseudo-Element oder separates `<span>`
- `needsInput` zuruecksetzen wenn `activeSessionId === session.id` (via Lit `updated()` Lifecycle)

**WO:**
- `ui/frontend/src/components/terminal/aos-terminal-tabs.ts`
- `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts`
- `ui/frontend/src/styles/theme.css`

**Abhaengigkeiten:** WTT-002

**Geschaetzte Komplexitaet:** S

**Relevante Skills:**

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Lifecycle, CSS Custom Properties |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
grep -q "needsInput" ui/frontend/src/components/terminal/aos-terminal-tabs.ts && echo "OK notification badge"
grep -q "needs-input" ui/frontend/src/styles/theme.css && echo "OK CSS styles"
cd ui/frontend && npm run build
```
