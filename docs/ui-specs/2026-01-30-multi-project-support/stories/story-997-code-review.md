# Code Review

> Story ID: MPRO-997
> Spec: multi-project-support
> Created: 2026-02-02
> Last Updated: 2026-02-02

**Priority**: High
**Type**: System/Review
**Estimated Effort**: S
**Dependencies**: MPRO-001, MPRO-002, MPRO-003, MPRO-004, MPRO-005, MPRO-006, MPRO-007
**Status**: Ready

---

## Feature

```gherkin
Feature: Code Review durch starkes Modell
  Als Qualitätssicherung
  möchte ich einen vollständigen Code-Review des gesamten Feature-Diffs,
  damit Architektur-Konsistenz, Code-Qualität und Best Practices validiert werden.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Vollständiger Diff-Review

```gherkin
Scenario: Gesamter Feature-Diff wird geprüft
  Given alle regulären Stories der Spec sind abgeschlossen
  When der Code-Review gestartet wird
  Then wird der gesamte Git-Diff seit Feature-Branch-Erstellung analysiert
  And alle Änderungen werden auf Architektur-Konformität geprüft
```

### Szenario 2: Qualitäts-Checkliste

```gherkin
Scenario: Code-Qualität wird validiert
  Given der Diff ist geladen
  When die Qualitätsprüfung läuft
  Then werden folgende Aspekte geprüft:
    | Aspekt | Prüfung |
    | TypeScript Strict Mode | Keine `any` Types |
    | Error Handling | Alle Fehler werden behandelt |
    | Security | Keine Vulnerabilities |
    | Performance | Keine offensichtlichen Bottlenecks |
    | Code Style | Konsistent mit Projekt |
```

### Szenario 3: Review-Bericht

```gherkin
Scenario: Review-Ergebnisse werden dokumentiert
  Given die Code-Analyse ist abgeschlossen
  When Findings vorhanden sind
  Then wird ein Review-Bericht erstellt
  And Findings werden nach Severity kategorisiert (Critical/High/Medium/Low)
  And Empfehlungen werden dokumentiert
```

---

## Technische Verifikation (Automated Checks)

### Funktions-Prüfungen

- [ ] GIT_DIFF: `git diff main...HEAD` zeigt alle Feature-Änderungen
- [ ] LINT_PASS: Keine Linting-Fehler im Diff
- [ ] TYPE_CHECK: `tsc --noEmit` erfolgreich
- [ ] NO_CONSOLE: Keine `console.log` in Production-Code

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| None | Opus führt Review durch | No |

---

## Technisches Refinement (vom Architect)

> **Ausgefüllt:** 2026-02-02

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
- [x] **Alle betroffenen Layer identifiziert**
- [x] **Integration Type bestimmt**
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Git Diff wurde vollständig analysiert
- [ ] Architektur-Konformität bestätigt
- [ ] Security-Review durchgeführt

#### Qualitätssicherung
- [ ] Review-Bericht erstellt
- [ ] Kritische Findings adressiert
- [ ] Code-Qualität als akzeptabel bestätigt

#### Dokumentation
- [ ] Review-Bericht in `implementation-reports/` gespeichert
- [ ] Findings dokumentiert

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Review-only (keine Code-Änderungen)

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Review | Alle geänderten Dateien | Analyse |

**Kritische Integration Points:**
- Review erfolgt auf gesamtem Feature-Branch-Diff
- Keine Code-Änderungen durch diese Story

---

### Technical Details

**WAS:**
- Vollständiger Code-Review des Feature-Diffs
- Architektur-Konformität prüfen (gemäß tech-stack.md, architecture-decision.md)
- Security-Review (OWASP Top 10, Input Validation)
- Performance-Review (keine N+1 Queries, Memory Leaks)
- Code-Style-Review (TypeScript strict, keine `any`)

**WIE (Architektur-Guidance ONLY):**
- Git Diff analysieren: `git diff main...HEAD`
- Jede geänderte Datei einzeln reviewen
- Findings kategorisieren: Critical > High > Medium > Low
- Review-Bericht im Markdown-Format erstellen

**WO:**
- Input: Git Diff (alle geänderten Dateien)
- Output: `agent-os/specs/2026-01-30-multi-project-support/implementation-reports/code-review-report.md`

**WER:** Claude Opus (starkes Modell für tiefgehende Analyse)

**Abhängigkeiten:** Alle regulären Stories (MPRO-001 bis MPRO-999)

**Geschätzte Komplexität:** S

**Relevante Skills:**
- `quality-gates` - Code-Review Checklisten

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
git diff main...HEAD --stat | head -20  # Diff existiert
test -f agent-os/specs/2026-01-30-multi-project-support/implementation-reports/code-review-report.md
cd agent-os-ui && npm run lint
cd agent-os-ui && npx tsc --noEmit
```

**Story ist DONE wenn:**
1. Review-Bericht erstellt
2. Keine Critical Findings offen
3. Lint und Type-Check erfolgreich
