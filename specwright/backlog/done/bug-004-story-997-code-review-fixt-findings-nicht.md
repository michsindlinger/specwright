# BUG-004: Story-997 Code Review fixt Findings nicht

**Type:** Bug
**Priority:** High
**Estimated Effort:** M
**Created:** 2026-02-17
**Severity:** High
**Source:** /add-bug - Story-997 Code Review Findings werden nicht gefixt
**Related Spec:** N/A

---

## Bug Description

### Symptom
Story-997 (Code Review) erstellt den review-report.md mit Findings (Critical/Major/Minor Issues), fixt diese aber nicht. Die Findings werden nur dokumentiert, nicht behoben.

### Reproduktion
1. `/create-spec` fuer ein neues Feature ausfuehren
2. Alle regulaeren Stories via `/execute-tasks` implementieren
3. Story-997 wird automatisch ausgefuehrt
4. Code Review erstellt review-report.md mit Findings
5. Findings werden NICHT gefixt - Workflow springt zu "Done"
6. Story-998 und 999 werden ausgefuehrt ohne dass Findings behoben sind

### Expected vs. Actual
- **Expected:** Story-997 reviewt den Code UND fixt alle gefundenen Issues (Critical/Major/Minor) bevor es als Done markiert wird
- **Actual:** Story-997 erstellt nur den Review-Report und markiert sich als Done - kein Fix wird durchgefuehrt

---

## User-Input (aus Step 2.5)

> Dokumentation des Benutzer-Wissens vor der RCA

**Hat User Vermutungen geteilt:** Nein

---

## Root-Cause-Analyse

### Hypothesen (vor Analyse)

| # | Hypothese | Wahrscheinlichkeit | Quelle | Pruefmethode |
|---|-----------|-------------------|--------|-------------|
| 1 | Fehlende Fix-Implementierung nach AskUserQuestion in spec-phase-3.md | 95% | Agent | Code-Analyse: Workflow Step 6-7 Transition |
| 2 | Template DoD definiert Fix nicht als Erfordernis | 30% | Agent | Template-Analyse: system-story-997-code-review-template.md |
| 3 | Intentionaler Design-Entscheid (Fixes in Story-998) | 10% | Agent | Story-998 Template/Workflow analysieren |

### Pruefung

**Hypothese 1 pruefen:** Fehlende Fix-Implementierung im Workflow
- Aktion: spec-phase-3.md Zeilen 305-317 analysiert (Step 6 -> Step 7 Transition)
- Befund:
  - Step 6 fragt via AskUserQuestion mit 3 Optionen:
    1. "Issues jetzt beheben (Recommended)"
    2. "Issues dokumentieren und fortfahren"
    3. "Zurueck zu Phase 3"
  - Es gibt KEINEN Branch fuer Option 1 - keine Fix-Logik implementiert
  - Step 7 wird DIREKT nach der Frage ausgefuehrt (MARK as Done)
  - Nur Critical Issues werden abgefragt - Major/Minor Issues werden komplett ignoriert
  - Kein Fix-Loop, kein Re-Review, kein Report-Update
- Ergebnis: BESTAETIGT (Hauptursache)
- Begruendung: Die Workflow-Implementierung ist unvollstaendig - die Fix-Logik nach der User-Entscheidung fehlt komplett

**Hypothese 2 pruefen:** Template DoD definiert Fix nicht
- Aktion: system-story-997-code-review-template.md DoD analysiert
- Befund: DoD listet nur "review-report.md erstellt" und "Keine Critical Issues gefunden (oder dokumentiert)" - Fix ist KEIN DoD-Kriterium
- Ergebnis: BESTAETIGT (Teilursache)
- Begruendung: Template unterstuetzt den Bug - DoD fordert nur Dokumentation, nicht Behebung

**Hypothese 3 pruefen:** Fixes in Story-998 verlagert
- Aktion: Story-998 Template und Workflow analysiert
- Befund: Story-998 ist fuer "Integration Validation" zustaendig - laeuft Tests, nicht Fixes
- Ergebnis: WIDERLEGT
- Begruendung: Kein System-Story ist fuer das Fixen von Review-Findings zustaendig

### Root Cause

**Ursache:** Die Workflow-Implementierung in `spec-phase-3.md` (Zeilen 305-317) ist unvollstaendig:

1. **Fehlende Fix-Branches:** Nach der AskUserQuestion (Step 6) gibt es keine Implementierung fuer die 3 Optionen. Unabhaengig von der User-Antwort springt der Workflow zu Step 7 (MARK as Done).
2. **Nur Critical Issues:** Major und Minor Issues werden nicht zum Fixen angeboten.
3. **Kein Fix-Loop:** Es fehlt ein iterativer Zyklus: Finding lesen -> Fix implementieren -> Verifizieren -> naechstes Finding.
4. **Template-Luecke:** Die DoD im Story-997-Template fordert keinen Fix der Findings.

**Beweis:**
- `spec-phase-3.md:305-317`: Kein IF/ELSE Branch nach AskUserQuestion
- `spec-phase-3.md:313-317`: Direkt MARK as Done + PROCEED to story-998
- `system-story-997-code-review-template.md`: DoD hat kein Fix-Kriterium

**Betroffene Dateien:**
- `specwright/workflows/core/execute-tasks/spec-phase-3.md`
- `specwright/templates/docs/system-story-997-code-review-template.md`

---

## Feature (Bug-Fix)

```gherkin
Feature: Story-997 Code Review fixt gefundene Findings
  Als Specwright-Nutzer
  moechte ich dass Story-997 die im Code Review gefundenen Issues automatisch fixt,
  damit die Code-Qualitaet vor dem Merge sichergestellt ist.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Fix-Loop fuer alle Issues

```gherkin
Scenario: Story-997 fixt alle gefundenen Issues nach dem Review
  Given Story-997 Code Review wurde ausgefuehrt
  And der review-report.md enthaelt Findings (Critical/Major/Minor)
  When die Fix-Phase beginnt
  Then wird jedes Finding einzeln adressiert
  And fuer jedes Finding wird ein Fix implementiert
  And nach jedem Fix wird der Fix verifiziert
  And der review-report.md wird mit Fix-Status aktualisiert
```

### Szenario 2: User-Entscheidung bei Findings

```gherkin
Scenario: User wird nach Code Review gefragt wie mit Findings umgegangen wird
  Given der Code Review hat Issues gefunden
  When die User-Abfrage erscheint
  And der User waehlt "Issues jetzt beheben"
  Then werden alle Issues (Critical, Major, Minor) systematisch gefixt
  And nach dem Fix wird ein Re-Review durchgefuehrt
  And der finale review-report.md zeigt "Review passed"
```

### Szenario 3: User waehlt "Dokumentieren und fortfahren"

```gherkin
Scenario: User kann Findings dokumentieren ohne Fix
  Given der Code Review hat Issues gefunden
  When die User-Abfrage erscheint
  And der User waehlt "Issues dokumentieren und fortfahren"
  Then werden die Issues im review-report.md belassen
  And Story-997 wird als Done markiert mit Vermerk "Issues documented, not fixed"
  And Story-998 wird fortgesetzt
```

### Szenario 4: Re-Review nach Fix

```gherkin
Scenario: Nach Fix wird ein erneuter Review durchgefuehrt
  Given alle Findings wurden gefixt
  When der Re-Review laeuft
  And keine neuen Issues gefunden werden
  Then wird der review-report.md als "Review passed" aktualisiert
  And Story-997 wird als Done markiert
```

---

## Technische Verifikation

- [ ] BUG_FIXED: Fix-Branches nach AskUserQuestion implementiert
- [ ] BUG_FIXED: Fix-Loop fuer Issues aller Schweregrade vorhanden
- [ ] BUG_FIXED: Re-Review nach Fix implementiert
- [ ] BUG_FIXED: Review-Report wird nach Fix aktualisiert
- [ ] BUG_FIXED: Template DoD enthaelt Fix-Kriterium
- [ ] MANUAL: Test mit einer echten Spec - Findings werden gefixt

---

## Technisches Refinement

### DoR (Definition of Ready)

#### Bug-Analyse
- [x] Bug reproduzierbar
- [x] Root Cause identifiziert
- [x] Betroffene Dateien bekannt

#### Technische Vorbereitung
- [x] Fix-Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Risiken bewertet

**Bug ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done)

- [ ] Bug behoben gemaess Root Cause
- [ ] Workflow-Aenderung getestet mit echter Spec
- [ ] Template aktualisiert
- [ ] Keine neuen Bugs eingefuehrt
- [ ] Original Reproduktionsschritte fuehren nicht mehr zum Bug

**Bug ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten (Fix-Impact)

> **PFLICHT:** Basierend auf Fix-Impact Analysis (Step 3.5)

**Fix Type:** Workflow/Template (kein Code)

**Betroffene Komponenten:**

| Layer | Komponenten | Impact | Aenderung |
|-------|-------------|--------|----------|
| Workflow | spec-phase-3.md | Direct | Fix-Branches nach AskUserQuestion + Fix-Loop + Re-Review implementieren |
| Template | system-story-997-code-review-template.md | Direct | DoD um Fix-Kriterium erweitern |

**Kritische Integration Points:** Kanban MCP Tools (kanban_complete_story Status-Update nach Fix)

---

### Technical Details

**WAS:**
1. `spec-phase-3.md` Step 6: IF/ELSE Branches fuer alle 3 AskUserQuestion-Optionen implementieren
2. Fix-Loop hinzufuegen: Fuer jedes Finding im review-report -> Fix implementieren -> Verifizieren
3. Re-Review Step hinzufuegen: Nach Fix alle geaenderten Dateien erneut reviewen
4. Review-Report Update: Nach Fix den review-report.md mit Fix-Status aktualisieren
5. `system-story-997-code-review-template.md` DoD erweitern: "Alle Critical/Major Issues behoben" als Kriterium

**WIE (Architektur-Guidance ONLY):**
- Pattern: Iterativer Fix-Loop mit Finding-Tracking (fixed/skipped/deferred)
- Constraint: Bestehender Workflow-Flow (997 -> 998 -> 999) bleibt erhalten
- Constraint: User muss weiterhin die Wahl haben, Findings zu dokumentieren statt zu fixen
- Pattern: Re-Review soll nur geaenderte Dateien pruefen (Delta-Review), nicht den gesamten Diff
- Pattern: Review-Report bekommt einen "Fix Status" Abschnitt mit Tracking-Tabelle

**WO:**
- `specwright/workflows/core/execute-tasks/spec-phase-3.md`: Step 6 erweitern (Zeilen 305-317)
- `specwright/templates/docs/system-story-997-code-review-template.md`: DoD aktualisieren

**Abhaengigkeiten:** Keine

**Geschaetzte Komplexitaet:** M

---

### Completion Check

```bash
# Workflow-Datei hat Fix-Branches
grep -q "Issues jetzt beheben" specwright/workflows/core/execute-tasks/spec-phase-3.md
grep -q "FIX_LOOP" specwright/workflows/core/execute-tasks/spec-phase-3.md

# Template hat Fix-DoD
grep -q "Issues behoben" specwright/templates/docs/system-story-997-code-review-template.md
```

**Bug ist DONE wenn:**
1. spec-phase-3.md enthaelt Fix-Branches fuer alle 3 User-Optionen
2. Fix-Loop iteriert ueber alle Findings
3. Re-Review wird nach Fix durchgefuehrt
4. Review-Report wird nach Fix aktualisiert
5. Template DoD fordert Fix der Findings
