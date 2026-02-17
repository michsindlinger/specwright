# Shift+Enter im Cloud Terminal aktivieren

> Story ID: 2026-02-17-001
> Spec: Backlog Todo
> Created: 2026-02-17
> Last Updated: 2026-02-17

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: 1 SP
**Dependencies**: None

---

## Feature

```gherkin
Feature: Shift+Enter im Cloud Terminal
  Als Benutzer des Cloud Terminals
  moechte ich Shift+Enter als Zeilenumbruch verwenden koennen,
  damit ich mehrzeilige Eingaben bequem im Terminal machen kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Shift+Enter sendet Zeilenumbruch

```gherkin
Scenario: Shift+Enter erzeugt einen Zeilenumbruch im Cloud Terminal
  Given ich habe eine aktive Cloud Terminal Session
  When ich Shift+Enter druecke
  Then wird ein Zeilenumbruch im Terminal eingefuegt
  And die Eingabe wird nicht abgeschickt
```

### Szenario 2: Enter funktioniert weiterhin normal

```gherkin
Scenario: Enter sendet den Befehl wie gewohnt
  Given ich habe eine aktive Cloud Terminal Session
  And ich habe einen Befehl eingegeben
  When ich Enter druecke
  Then wird der Befehl wie gewohnt ausgefuehrt
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Pruefungen

- [ ] CONTAINS: ui/frontend/src/components/aos-terminal.ts enthaelt "attachCustomKeyEventHandler"
- [ ] CONTAINS: ui/frontend/src/components/aos-terminal.ts enthaelt "shiftKey"

### Funktions-Pruefungen

- [ ] LINT_PASS: cd ui/frontend && npx tsc --noEmit exits with code 0
- [ ] BUILD_PASS: cd ui/frontend && npm run build exits with code 0

### Manuelle Pruefungen (nur wenn unvermeidbar)

- [ ] MANUAL: Shift+Enter im Cloud Terminal testen - Zeilenumbruch wird eingefuegt

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
- [x] **Alle betroffenen Layer identifiziert** (Frontend only)
- [x] **Integration Type bestimmt** (Frontend-only)
- [x] **Kritische Integration Points dokumentiert** (keine - reine Frontend-Aenderung)
- [x] **Handover-Dokumente definiert** (nicht erforderlich)

**Story ist READY - alle Checkboxen angehakt.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Security/Performance Anforderungen erfuellt

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Code Review durchgefuehrt und genehmigt
- [ ] Keine Linting Errors

#### Dokumentation
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | aos-terminal.ts | Custom Key Event Handler fuer Shift+Enter hinzufuegen |

**Kritische Integration Points:** Keine (reine Frontend-Aenderung, PTY-Protokoll bleibt unveraendert)

---

### Technical Details

**WAS:** Custom Key Event Handler in der xterm.js Terminal-Instanz registrieren, der Shift+Enter abfaengt und als Newline-Zeichen an das PTY weiterleitet.

**WIE (Architektur-Guidance ONLY):**
- `terminal.attachCustomKeyEventHandler()` verwenden um Shift+Enter zu intercepten
- Bei Shift+Enter: Newline-Zeichen (`\n`) ueber den bestehenden Gateway-Mechanismus (`cloud-terminal:input`) senden
- `false` zurueckgeben um Default-Browser-Verhalten zu unterdruecken
- Bestehende `terminal.onData()` Logik nicht veraendern
- Nur im `cloudMode` aktivieren (Workflow-Terminal braucht kein Shift+Enter)

**WO:**
- `ui/frontend/src/components/aos-terminal.ts` (Methode `_doInitializeTerminal` erweitern)

**Domain:** cloud-terminal

**Abhaengigkeiten:** None

**Geschaetzte Komplexitaet:** XS

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten
cd /Users/michaelsindlinger/Entwicklung/specwright/ui/frontend && npx tsc --noEmit
cd /Users/michaelsindlinger/Entwicklung/specwright/ui/frontend && npm run build
grep -q "attachCustomKeyEventHandler" /Users/michaelsindlinger/Entwicklung/specwright/ui/frontend/src/components/aos-terminal.ts
grep -q "shiftKey" /Users/michaelsindlinger/Entwicklung/specwright/ui/frontend/src/components/aos-terminal.ts
```

**Story ist DONE wenn:**
1. Alle CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen in aos-terminal.ts
