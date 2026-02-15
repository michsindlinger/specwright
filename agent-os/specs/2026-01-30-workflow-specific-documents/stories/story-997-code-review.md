# WSD-997: Code Review

> Status: Done
> Complexity: S (Small)
> Type: System/Review
> Layer: Quality
> Skill: `quality-gates`

## User Story

**Als** Product Owner
**Möchte ich** dass alle Code-Änderungen dieses Features durch ein starkes LLM-Modell reviewt werden
**Damit** potenzielle Bugs, Sicherheitsprobleme und Architektur-Verstöße früh erkannt werden

## Akzeptanzkriterien (Gherkin)

```gherkin
Feature: Code Review durch LLM

  Scenario: Vollständiger Feature-Diff wird reviewt
    Given alle Feature-Stories (WSD-001 bis WSD-004) sind implementiert
    When das Code Review startet
    Then wird der gesamte Git-Diff seit Feature-Branch-Erstellung analysiert
    And alle geänderten Dateien werden auf Qualität geprüft

  Scenario: Review-Bericht wird erstellt
    Given der Feature-Diff wurde analysiert
    When Probleme gefunden werden
    Then wird ein strukturierter Review-Bericht erstellt
    And Probleme werden nach Schweregrad kategorisiert (Critical/High/Medium/Low)

  Scenario: Kritische Probleme blockieren den Workflow
    Given es wurden kritische Probleme gefunden
    When der Review-Bericht präsentiert wird
    Then muss der User entscheiden ob:
      - Probleme behoben werden sollen
      - Mit Warnung fortgefahren wird
      - Der Workflow abgebrochen wird

  Scenario: Sauberer Code passiert Review
    Given der Code erfüllt alle Qualitätsstandards
    When das Review abgeschlossen ist
    Then wird grünes Licht für Integration Validation gegeben
```

---

## Review-Checkliste

Das LLM-Review prüft folgende Aspekte:

### Code-Qualität
- [x] TypeScript strict mode - keine Fehler
- [x] Keine `any` Types
- [x] Keine ungenutzten Imports/Variablen
- [x] Konsistente Namenskonventionen

### Architektur
- [x] Lit-Komponenten folgen aos-* Prefix-Konvention
- [x] Store-Pattern korrekt verwendet
- [x] Keine zirkulären Abhängigkeiten
- [x] State-Management folgt reaktivem Pattern

### Sicherheit
- [x] Keine hardcodierten Credentials
- [x] XSS-sichere HTML-Templates (lit-html)
- [x] LocalStorage-Keys folgen Namespace-Konvention

### Performance
- [x] Keine unnötigen Re-Renders
- [x] Event-Listener werden korrekt aufgeräumt
- [x] Keine Memory-Leaks bei Resize-Operationen

---

## Technische Details

### WAS (Scope)
- Git-Diff seit Feature-Branch-Start sammeln
- Diff an LLM (Opus) zur Analyse senden
- Review-Bericht generieren und speichern
- User-Entscheidung bei Problemen einholen

### WIE (Implementierung)
1. `git diff main...HEAD --name-only` für geänderte Dateien
2. `git diff main...HEAD` für vollständigen Diff
3. LLM-Prompt mit Review-Checkliste + Diff
4. Bericht in `implementation-reports/code-review-report.md`

### WO (Betroffene Dateien)

| Datei | Änderung |
|-------|----------|
| `agent-os/specs/[spec-name]/implementation-reports/code-review-report.md` | Erstellt |

### WER (Ausführender)
- **Model:** Opus (starkes Modell für kritische Review-Aufgaben)
- **Agent:** Orchestrator führt Review aus

### Abhängigkeiten
- **Benötigt:** WSD-001, WSD-002, WSD-003, WSD-004 (alle Feature-Stories)
- **Blockiert:** WSD-998 (Integration Validation)

---

## Definition of Ready (DoR)

- [x] User Story klar formuliert
- [x] Akzeptanzkriterien vollständig (Gherkin)
- [x] Review-Checkliste definiert
- [x] Abhängigkeiten zu Feature-Stories dokumentiert

## Definition of Done (DoD)

- [x] Git-Diff erfolgreich gesammelt
- [x] LLM-Review durchgeführt
- [x] Review-Bericht erstellt
- [x] User-Entscheidung dokumentiert (bei Problemen) - Keine kritischen Issues gefunden
- [x] Grünes Licht für nächsten Schritt

---

## Completion Check

```bash
# Nach Review ausführen:
test -f agent-os/specs/2026-01-30-workflow-specific-documents/implementation-reports/code-review-report.md && echo "✓ Review-Bericht existiert"
```
