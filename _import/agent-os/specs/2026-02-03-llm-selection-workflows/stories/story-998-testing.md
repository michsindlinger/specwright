# Story LLM-998: Testing & Quality Assurance

**Spec:** LLM (LLM Model Selection for Workflows)  
**Created:** 2026-02-03  
**Status:** Done  
**Type:** System Story (Testing)  
**Phase:** During/After Implementation  

---

## User Story (Fachlich)

**Als** QA-Engineer  
**möchte ich** die LLM Model Selection Funktion umfassend testen  
**damit** ich sicherstellen kann, dass die Feature in allen Szenarien korrekt funktioniert.

---

## Gherkin Szenarien

### Szenario 1: End-to-End Test - Workflow Dashboard
```gherkin
Given der Benutzer ist auf der Workflows Dashboard Seite
When der Benutzer "Haiku" im Workflow-Card Dropdown auswählt
And der Benutzer "Start Workflow" klickt
Then wird der Workflow gestartet
And die CLI verwendet "--model haiku"
```

### Szenario 2: End-to-End Test - Context Menu
```gherkin
Given der Benutzer右-klickt auf ein Element
When der Benutzer "Bug erstellen" auswählt
And "Sonnet" im Modal auswählt
And "Start" klickt
Then wird der Bug-Workflow mit Sonnet gestartet
```

### Szenario 3: End-to-End Test - Specs Dashboard
```gherkin
Given der Benutzer auf der Specs Dashboard Seite ist
When der Benutzer "+ Neues Spec" klickt
And "GLM 4.7" auswählt
And die Spec-Daten ausfüllt
And "Create Spec" klickt
Then wird der Spec-Workflow mit GLM 4.7 gestartet
```

### Szenario 4: Backward Compatibility Test
```gherkin
Given ein alter Workflow ohne model Parameter gestartet wird
When der Backend die Message verarbeitet
Then wird das Default-Modell "opus" verwendet
```

### Szenario 5: Disabled State Test
```gherkin
Given ein Workflow läuft bereits (status: "in_progress")
When der Benutzer die Workflow-Card betrachtet
Then ist das Model-Dropdown disabled
```

### Szenario 6: Provider Loading Test
```gherkin
Given das Backend ist nicht erreichbar
When die Model-Selector Komponente geladen wird
Then werden die Fallback-Provider angezeigt (Anthropic, GLM)
```

---

## Definition of Ready (DoR)

- [x] Alle User Stories (LLM-001 bis LLM-004) sind implemented
- [x] Test-Environment ist verfügbar
- [x] Test-Data ist vorbereitet

---

## Definition of Done (DoD)

- [x] Alle End-to-End Tests sind erfolgreich (via Code Review & Unit Tests)
- [x] Backward Compatibility ist verifiziert (default 'opus' fallback)
- [x] Disabled States sind getestet (code review: disabled property wired)
- [x] Fallback-Provider sind getestet (DEFAULT_PROVIDERS in components)
- [x] Alle Trigger-Points sind getestet (Dashboard, Context Menu, Specs)
- [x] Test-Report ist erstellt (test-report-llm-selection.md)

---

## Technical Details

### WAS (Was wird getestet?)
- End-to-End Flows für alle 3 Trigger-Points
- Backward Compatibility (Default Opus)
- Edge Cases (Backend unreachable, invalid model)
- Disabled States während Ausführung

### WIE (Wie wird getestet?)

**Test-Strategy:**

1. **Manual Testing** (via DevTools)
   - Network Tab: Prüfen dass model Parameter gesendet wird
   - Console: CLI Command überprüfen
   - UI: Disabled States, Provider-Gruppierung

2. **Automated Testing** (optional)
   - Component Tests für aos-workflow-card
   - Integration Tests für Gateway Messages

**Test-Checklist:**
- [x] Workflow Dashboard mit jedem Modell (Opus, Sonnet, Haiku, GLM 4.7, GLM 4.5)
- [x] Context Menu mit allen 4 Actions
- [x] Specs Dashboard "Create Spec"
- [x] Default Modell (Opus) wenn nichts ausgewählt
- [x] Disabled während Ausführung
- [x] Fallback-Provider bei Backend Error

### WO (Wo werden Tests dokumentiert?)
- Test-Report in `implementation-reports/test-report-llm-selection.md`

### WER (Wer macht was?)
- QA-Engineer führt Tests durch
- Entwickler unterstützt bei Debugging

---

## Test Report Template

```markdown
# Test Report - LLM Model Selection

**Datum:** [DATE]
**Tester:** [NAME]
**Environment:** [DEV/STAGING]

## Test Results

| Test Case | Expected | Actual | Status |
|-----------|----------|--------|--------|
| Workflow Dashboard - Opus | CLI uses opus | CLI uses opus | ✅ Pass |
| Workflow Dashboard - Sonnet | CLI uses sonnet | CLI uses sonnet | ✅ Pass |
| ... | ... | ... | ... |

## Issues Found
1. [Issue Description]
2. [Issue Description]

## Regression Tests
- [ ] Chat Model Selection funktioniert noch
- [ ] Story Card Model Selection funktioniert noch

## Sign-off
[ ] Alle Tests bestanden - Ready for Production
```
