# Code Review des Feature-Branches

> Story ID: ASGN-997
> Spec: Spec Assignment for External Bot
> Created: 2026-02-24
> Last Updated: 2026-02-24

**Priority**: High
**Type**: System/Review
**Estimated Effort**: S
**Dependencies**: Alle regulären Stories dieser Spec

---

## Feature

```gherkin
Feature: Code Review des gesamten Feature-Diffs
  Als Qualitätssicherung
  möchte ich den gesamten Code-Diff des Feature-Branches reviewen,
  damit alle Änderungen den Qualitätsstandards entsprechen.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Review aller Commits auf dem Feature-Branch

```gherkin
Scenario: Vollständiger Code-Review des Feature-Branches
  Given alle regulären Stories dieser Spec sind implementiert
  And ich bin auf dem Feature-Branch
  When ich den kompletten Diff zwischen main und Feature-Branch reviewe
  Then analysiere ich alle geänderten Dateien
  And identifiziere ich potenzielle Code-Probleme
  And dokumentiere ich die Ergebnisse in einem Review-Report
```

### Szenario 2: Qualitätsstandards-Prüfung

```gherkin
Scenario: Prüfung auf Qualitätsstandards
  Given ich habe den Feature-Diff analysiert
  When ich die Änderungen gegen die Qualitätsstandards prüfe
  Then verifiziere ich Code-Style-Konformität
  And verifiziere ich Architektur-Patterns
  And verifiziere ich Security-Best-Practices
  And verifiziere ich Performance-Aspekte
```

### Szenario 3: Problem-Dokumentation

```gherkin
Scenario: Dokumentation gefundener Probleme
  Given ich habe Probleme im Code identifiziert
  When ich diese dokumentiere
  Then kategorisiere ich nach Schweregrad (Critical/Major/Minor)
  And beschreibe ich das Problem konkret
  And gebe ich eine Empfehlung zur Behebung
```

### Szenario 4: Auto-Fix gefundener Issues

```gherkin
Scenario: Automatisches Beheben gefundener Issues
  Given der Code Review hat Issues gefunden
  When die Auto-Fix-Phase beginnt
  Then wird jedes Finding automatisch adressiert (Critical > Major > Minor)
  And für jedes Finding wird ein Fix implementiert
  And nach jedem Fix wird der Fix verifiziert
  And der review-report.md wird mit Fix-Status aktualisiert
  And nach allen Fixes wird ein Re-Review durchgeführt
```

### Szenario 5: Fehlgeschlagener Fix wird als Bug-Ticket erstellt

```gherkin
Scenario: Fix schlägt fehl und wird als Bug-Ticket auf das Board gestellt
  Given der Code Review hat Issues gefunden
  And ein Auto-Fix schlägt fehl
  When der Fix nicht angewendet werden kann
  Then wird ein Bug-Ticket via kanban_add_item erstellt
  And das Ticket erhält Typ "fix" und Referenz auf Story-997
  And der review-report.md zeigt Status "fix-failed"
  And Story-997 wird trotzdem als Done markiert
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: specwright/specs/2026-02-24-spec-assignment/review-report.md

### Inhalt-Prüfungen

- [ ] CONTAINS: review-report.md enthält "## Review Summary"
- [ ] CONTAINS: review-report.md enthält "## Geprüfte Dateien"

### Funktions-Prüfungen

- [ ] LINT_PASS: `cd ui && npm run lint` exits with code 0
- [ ] BUILD_PASS: `cd ui && npm run build:backend` exits with code 0
- [ ] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0

---

## System Story Execution (Automatisch)

### Execution Steps

1. **Git Diff erstellen:**
   ```bash
   git diff main...HEAD --name-only
   git diff main...HEAD --stat
   ```

2. **Dateien kategorisieren:**
   - Neue Dateien (Added)
   - Geänderte Dateien (Modified)
   - Gelöschte Dateien (Deleted)

3. **Review durchführen:**
   - Code-Style-Prüfung
   - Architektur-Konformität
   - Security-Check
   - Performance-Analyse
   - Best-Practices

4. **Review-Report erstellen:**
   - Speichern unter: `specwright/specs/2026-02-24-spec-assignment/review-report.md`

---

## DoR (Definition of Ready) - System Story

- [x] Alle regulären Stories sind abgeschlossen
- [x] Alle regulären Stories haben Status "Done"
- [x] Branch enthält alle Änderungen

---

## DoD (Definition of Done) - System Story

- [ ] Git Diff analysiert (main...HEAD)
- [ ] Alle geänderten Dateien reviewt
- [ ] Probleme identifiziert und kategorisiert
- [ ] review-report.md erstellt
- [ ] Alle Critical/Major Issues automatisch behoben ODER als Bug-Ticket (fix) erstellt
- [ ] Fix Status Tabelle im review-report.md aktualisiert
- [ ] Re-Review nach Fixes bestanden (falls Fixes durchgeführt)

---

## Technisches Refinement

**WAS:** Vollständiger Code-Review aller Änderungen auf dem Feature-Branch

**WIE:**
- Git Diff zwischen main und HEAD analysieren
- Jede geänderte Datei reviewen
- Gegen Qualitätsstandards prüfen
- Probleme dokumentieren

**WO:**
- Input: Alle geänderten Dateien (git diff)
- Output: `specwright/specs/2026-02-24-spec-assignment/review-report.md`

**Abhängigkeiten:** Alle regulären Stories dieser Spec (ASGN-001 bis ASGN-005)

**Geschätzte Komplexität:** S

---

## Completion Check

```bash
# Verify review report exists
test -f specwright/specs/2026-02-24-spec-assignment/review-report.md

# Verify report has content
grep -q "Review Summary" specwright/specs/2026-02-24-spec-assignment/review-report.md

# Verify Fix Status section exists
grep -q "Fix Status" specwright/specs/2026-02-24-spec-assignment/review-report.md
```

**Story ist DONE wenn:**
1. review-report.md wurde erstellt
2. Alle Dateien wurden reviewt
3. Probleme wurden dokumentiert
4. Alle Critical/Major Issues automatisch behoben ODER als Bug-Ticket (fix) erstellt
5. Fix Status Tabelle im Report aktualisiert
6. Re-Review nach Fixes bestanden (falls Fixes durchgeführt)
