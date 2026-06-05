---
name: session-handoff
description: "Session Handoff: Erstellt eine vollständige Zusammenfassung der aktuellen Session für einen sauberen Kontextwechsel. NUR bei explizitem Aufruf (/session-handoff). NICHT automatisch auslösen. Geeignet wenn der User die Session resetten will, den Kontext aufräumen will, oder bei ~120k Tokens angelangt ist."
---

# Session Handoff

Erstelle strukturierte Zusammenfassung der aktuellen Session. Output direkt in neue Session einfügen.

## Workflow

1. Analysiere gesamte bisherige Konversation
2. Erstelle Handoff-Dokument (Format unten)
3. Informiere User: "Kopiere das Dokument, führe `/clear` aus, füge es als erste Nachricht ein"

## Output-Format

```markdown
# Session Handoff — [Datum]

## Projekt-Kontext
[Welches Projekt, welcher Branch, welcher Stack — nur nicht-offensichtliches]

## Was wurde gemacht
- [Erledigte Task 1]
- [Erledigte Task 2]

## Offene Tasks
- [ ] [Nächste konkrete Aufgabe]
- [ ] [Weitere offene Aufgabe]

## Wichtige Entscheidungen & Erkenntnisse
- [Entscheidung oder Erkenntnis, die nicht im Code steht]
- [Bugs, Workarounds, Constraints]

## Nächster Schritt
[Eine Sache — die wichtigste, die sofort angegangen werden soll]

## Relevante Dateipfade
- `pfad/zur/datei.py` — [warum relevant]
```

## Regeln

- Keine Zusammenfassung von Zusammenfassungen — direkt aus Konversation extrahieren
- Nur nicht-offensichtliche Infos (was nicht aus `git log` oder Code ableitbar ist)
- Nächster Schritt = eine Sache, nicht eine Liste
- Deutsch wenn Session auf Deutsch war
