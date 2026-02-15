---
name: review-implementation-plan
description: Kritischer Review eines Implementierungsplans mit Self-Review und Minimalinvasiv-Analyse. Nutze diesen Skill wenn du einen bestehenden Plan reviewen, optimieren oder den "Kollegen-Review-Prozess" durchführen möchtest.
---

# Review Implementation Plan

Führt den "Kollegen-Review" für einen bestehenden Implementierungsplan durch.

## Wann nutzen?
- Nach manueller Planung außerhalb von /create-spec
- Zum Re-Review eines existierenden Plans
- Wenn der strukturierte Review-Prozess gewünscht ist

## Input
User gibt Pfad zum Plan oder Spec-Ordner an.

## Workflow

### Schritt 1: Plan laden

1. Frage den User nach dem Pfad zum Plan oder Spec-Ordner
2. Suche `implementation-plan.md` im angegebenen Pfad
3. Falls nicht vorhanden:
   - Prüfe ob `requirements-clarification.md` existiert
   - Frage ob Plan aus Clarification generiert werden soll

### Schritt 2: Self-Review durchführen

Führe einen kritischen Review des Plans durch:

```
Mache einen kritischen Review des Implementierungsplans:

1. VOLLSTÄNDIGKEIT
   - Sind alle Anforderungen abgedeckt?
   - Fehlen wichtige Aspekte?

2. KONSISTENZ
   - Gibt es Widersprüche im Plan?
   - Passen die Architektur-Entscheidungen zusammen?

3. RISIKEN
   - Welche Probleme könnten auftreten?
   - Gibt es kritische Abhängigkeiten?

4. ALTERNATIVEN
   - Gibt es einen besseren Weg?
   - Was sind die Trade-offs?

Wenn du Probleme findest, schlage Verbesserungen vor die ALLE
Anforderungen OHNE Abstriche erfüllen.
```

Dokumentiere Ergebnisse in der "Self-Review Ergebnisse" Sektion des Plans.

### Schritt 3: Minimalinvasiv-Analyse

1. **Codebase-Exploration durchführen:**
   - Suche nach bestehenden Patterns die wiederverwendet werden können
   - Identifiziere ähnliche Features im Projekt
   - Prüfe welche Infrastruktur bereits existiert

2. **Analyse-Prompt ausführen:**
```
Analysiere den Plan auf Minimalinvasivität:

1. WIEDERVERWENDUNG
   - Welcher bestehende Code kann genutzt werden?
   - Welche Patterns existieren bereits im Projekt?

2. ÄNDERUNGSUMFANG
   - Welche Änderungen sind wirklich nötig?
   - Was kann vermieden werden?

3. FEATURE-PRESERVATION (KRITISCH!)
   - Validiere: KEIN Feature wird geopfert!
   - Jede Optimierung muss alle Requirements erhalten

Optimiere den Plan basierend auf deinen Erkenntnissen.
Dokumentiere jede Optimierung mit Begründung.
```

3. **Ergebnisse dokumentieren:**
   - Fülle "Wiederverwendbare Elemente" Sektion
   - Fülle "Optimierungen" Sektion
   - Bestätige Feature-Preservation Checkliste

### Schritt 4: User-Review anbieten

Nutze AskUserQuestion mit folgenden Optionen:

1. **Plan genehmigen**
   - Status auf APPROVED setzen
   - Plan ist bereit für Story-Generierung

2. **Im Editor öffnen**
   - Zeige dem User den Dateipfad
   - Warte auf Bestätigung dass Änderungen abgeschlossen sind
   - Lies Plan erneut und validiere Änderungen

3. **Änderungen besprechen**
   - User beschreibt gewünschte Anpassungen
   - Aktualisiere Plan entsprechend
   - Erneut zur Genehmigung vorlegen

## Best Practices

### DO
- Immer Codebase auf bestehende Patterns prüfen
- Feature-Preservation als oberste Priorität
- Konkrete Beispiele aus Codebase zitieren
- Trade-offs transparent machen
- Plan-Status aktualisieren nach Review

### DON'T
- Features ohne Rücksprache streichen
- Over-Engineering vorschlagen
- Bestehende Patterns ignorieren
- Risiken verschweigen
- Review überspringen

## Referenz-Dokumente

- Guidelines: agent-os/standards/plan-review-guidelines.md
- Template: agent-os/templates/docs/implementation-plan-template.md

## Beispiel-Ausgabe

Nach erfolgreichem Review:

```
Implementation Plan Review abgeschlossen!

Ergebnisse:
- Self-Review: 2 Probleme gefunden und gelöst
- Minimalinvasiv: 3 wiederverwendbare Patterns identifiziert
- Feature-Preservation: Alle 5 Requirements abgedeckt

Optimierungen vorgenommen:
1. AuthService wiederverwendet statt neu implementiert
2. Bestehende Form-Validation-Patterns genutzt
3. Test-Utilities aus __tests__/utils verwendet

Plan-Status: UNDER_REVIEW
Nächster Schritt: User-Genehmigung
```
