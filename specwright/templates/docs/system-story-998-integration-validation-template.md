# Integration Validation

> Story ID: [SPEC_PREFIX]-998
> Spec: [SPEC_NAME]
> Created: [CREATED_DATE]
> Last Updated: [LAST_UPDATED_DATE]

**Priority**: High
**Type**: System/Integration
**Estimated Effort**: S
**Dependencies**: [SPEC_PREFIX]-997 (Code Review)

---

## Feature

```gherkin
Feature: Integration Validation nach Code-Review
  Als System
  möchte ich alle Komponenten auf korrekte Integration prüfen,
  damit das Feature vollständig und funktional ist.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Alle Integration Tests bestehen

```gherkin
Scenario: Erfolgreiche Integration aller Komponenten
  Given der Code-Review (story-997) ist abgeschlossen
  And alle Integration Tests sind in spec.md definiert
  When ich alle Integration Tests aus spec.md ausführe
  Then bestehen alle Tests
  And die Komponenten arbeiten korrekt zusammen
```

### Szenario 2: Integration-Fehler werden dokumentiert

```gherkin
Scenario: Dokumentation von Integration-Fehlern
  Given ich führe die Integration Tests aus
  When ein oder mehrere Tests fehlschlagen
  Then dokumentiere ich die fehlgeschlagenen Tests
  And beschreibe ich die Ursache des Fehlers
  And erstelle ich einen Fix-Vorschlag
```

### Szenario 3: Komponenten-Verbindungen verifizieren

```gherkin
Scenario: Verifizierung der Komponenten-Verbindungen
  Given alle Komponenten wurden implementiert
  When ich die Verbindungen zwischen Komponenten prüfe
  Then sind alle definierten Verbindungen aktiv
  And keine Komponente ist isoliert
```

---

## Technische Verifikation (Automated Checks)

### Integration Tests (aus spec.md)

> **Hinweis:** Diese Tests werden aus der "Integration Requirements" Sektion
> der spec.md extrahiert und automatisch ausgeführt.

- [ ] INTEGRATION_PASS: Alle Integration Test Commands bestehen
- [ ] END_TO_END: Komplette User Journey funktioniert

### Komponenten-Verbindungen

- [ ] CONNECTION_ACTIVE: Alle Verbindungen aus implementation-plan.md sind aktiv

---

## System Story Execution (Automatisch)

> **Hinweis:** Diese Story ersetzt Phase 4.5 (Integration Validation).
> Der Agent führt folgende Schritte durch:

### Execution Steps

1. **Integration Requirements laden:**
   ```bash
   # Aus spec.md extrahieren
   cat specwright/specs/[SPEC_NAME]/spec.md | grep -A 50 "## Integration Requirements"
   ```

2. **Integration Tests ausführen:**
   - Backend-Tests (API, Services)
   - Frontend-Tests (Components)
   - E2E-Tests (User Journeys)

3. **Komponenten-Verbindungen prüfen:**
   - Für jede Verbindung im implementation-plan.md:
     - Prüfen ob Import existiert
     - Prüfen ob Aufruf existiert
     - Prüfen ob Verbindung funktional ist

4. **Ergebnis dokumentieren:**
   - Bei Erfolg: Proceed to story-999
   - Bei Fehler: Dokumentieren und Fix erstellen

---

## DoR (Definition of Ready) - System Story

- [x] story-997 (Code Review) ist abgeschlossen
- [x] Integration Tests sind in spec.md definiert
- [x] Alle regulären Stories haben Status "Done"

---

## DoD (Definition of Done) - System Story

- [ ] Integration Tests aus spec.md extrahiert
- [ ] Alle Integration Tests ausgeführt
- [ ] Alle Tests bestanden (oder Fehler dokumentiert)
- [ ] Komponenten-Verbindungen verifiziert
- [ ] Keine isolierten Komponenten gefunden

---

## Technisches Refinement

**WAS:** Integration Validation aller Komponenten

**WIE:**
- Integration Tests aus spec.md laden
- Tests nacheinander ausführen
- Ergebnisse sammeln
- Verbindungen verifizieren

**WO:**
- Input: `specwright/specs/[SPEC_NAME]/spec.md` (Integration Requirements)
- Input: `specwright/specs/[SPEC_NAME]/implementation-plan.md` (Komponenten-Verbindungen)
- Output: Test-Ergebnisse, ggf. Fix-Story

**WER:** test-runner Agent oder Main Agent

**Abhängigkeiten:** story-997

**Geschätzte Komplexität:** S

---

## Integration Test Execution

### Test-Kategorien

| Kategorie | Beschreibung | Priorität |
|-----------|--------------|-----------|
| Backend-only | API + DB Integration | Required |
| Frontend-only | Component Tests | Required |
| Full-stack | E2E User Journeys | Required |
| Browser Tests | Playwright/MCP | Optional (wenn MCP verfügbar) |

### Test-Ausführung

```bash
# 1. Backend Tests
[BACKEND_TEST_COMMAND]

# 2. Frontend Tests
[FRONTEND_TEST_COMMAND]

# 3. Integration Tests
[INTEGRATION_TEST_COMMAND]

# 4. E2E Tests (optional, wenn MCP verfügbar)
[E2E_TEST_COMMAND]
```

### Fehler-Handling

Bei fehlgeschlagenen Tests:

1. **Test-Output dokumentieren:**
   - Welcher Test
   - Erwartetes Ergebnis
   - Tatsächliches Ergebnis
   - Stack Trace (wenn vorhanden)

2. **Fix-Vorschlag erstellen:**
   - Ursache identifizieren
   - Lösungsansatz beschreiben

3. **Entscheidung:**
   - Fix direkt implementieren (wenn minor)
   - Zurück zu Phase 3 (wenn major)
   - User fragen (wenn unklar)

---

## Completion Check

```bash
# Run all integration tests
[PROJECT_TEST_COMMAND]

# Verify all tests pass
echo $? # Should be 0
```

**Story ist DONE wenn:**
1. Alle Integration Tests bestanden
2. Alle Komponenten-Verbindungen aktiv
3. Keine kritischen Fehler gefunden
