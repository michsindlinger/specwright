# Plan Review Guidelines

## Der Kollegen-Ansatz

Basiert auf bewährtem Prompt für strukturierte Planung:

> "Erstelle zunächst einen lückenlosen, sorgfältig durchdachten Implementierungsplan.
> Mache dann einen kritischen Review Deines Implementierungsplans. Solltest du hierbei
> auf Probleme stoßen, dann suche einen besseren Weg um die Anforderungen ohne Abstriche
> zu erfüllen. Ändere und optimiere den Implementierungsplan dann aufgrund deiner
> Review-Ergebnisse. Mache dann zunächst ein Refinement. Analysiere genau, wie du
> minimalinvasiv vorgehen kannst OHNE auf eines der geplanten Features zu verzichten.
> Erstelle dann Actionable Items als Tickets mit Definition of Done."

## Self-Review Checkliste

### Vollständigkeit
- [ ] Alle Requirements aus Clarification abgedeckt
- [ ] Alle Akzeptanzkriterien adressierbar
- [ ] Edge Cases berücksichtigt
- [ ] Error Handling geplant

### Konsistenz
- [ ] Keine widersprüchlichen Entscheidungen
- [ ] Architektur-Patterns passen zusammen
- [ ] Naming einheitlich
- [ ] Abhängigkeiten logisch

### Risiko-Bewertung
- [ ] Kritische Pfade identifiziert
- [ ] Mitigationen für Hochrisiko-Bereiche
- [ ] Fallback-Strategien dokumentiert

## Minimalinvasiv-Prinzipien

### DO
- Bestehende Patterns wiederverwenden
- Änderungen auf das Nötigste beschränken
- Bestehende Tests respektieren
- Inkrementell vorgehen
- Von ähnlichen Features lernen

### DON'T
- Over-Engineering
- Unnötige Refactorings
- "Nice-to-have" einschleichen
- Breaking Changes ohne Notwendigkeit
- Patterns neu erfinden die existieren

## Feature-Preservation-Regel (KRITISCH)

> **Jede Optimierung MUSS alle ursprünglichen Features erhalten.**
>
> Wenn ein Feature geopfert werden müsste, ist die Optimierung UNGÜLTIG.
>
> Prüffragen:
> - Kann jedes Akzeptanzkriterium noch erfüllt werden?
> - Ist jeder Use Case aus der Clarification noch möglich?
> - Wurde Funktionalität nur verschoben, nicht entfernt?

## Codebase-Exploration vor Planung

Vor dem Erstellen eines Implementation Plans sollte immer die Codebase exploriert werden:

1. **Ähnliche Features finden:** Suche nach bereits implementierten Features die ähnliche Patterns verwenden
2. **Bestehende Utilities prüfen:** Gibt es wiederverwendbare Hilfsfunktionen, Services, Hooks?
3. **Architektur-Patterns identifizieren:** Welche Patterns werden im Projekt verwendet?
4. **Test-Patterns verstehen:** Wie sind bestehende Tests strukturiert?

## Review-Prompts für Self-Review

### Vollständigkeits-Check
```
Mache einen kritischen Review des Implementierungsplans:

1. VOLLSTÄNDIGKEIT
   - Sind alle Anforderungen aus der Clarification abgedeckt?
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

### Minimalinvasiv-Check
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

## Integration in /create-spec

Der Implementation Plan wird in Step 2.5 erstellt, NACH der Clarification-Genehmigung und VOR der Story-Generierung. Dies stellt sicher dass:

1. Fachliche Anforderungen bereits geklärt sind
2. Der technische Ansatz vor der Detail-Planung validiert wird
3. Stories aus einem durchdachten Plan abgeleitet werden
4. Der User den Plan vor der Detaillierung reviewen kann

## Standalone Nutzung

Für Pläne die außerhalb von /create-spec erstellt wurden, kann der `/review-implementation-plan` Skill verwendet werden um den vollständigen Review-Prozess durchzuführen.
