---
name: session-handoff
description: "Session Handoff: Erstellt eine vollständige Zusammenfassung der aktuellen Session und legt sie als Markdown-Datei im Projektordner ab (.claude/handoffs/, mit Datum+Uhrzeit) für einen sauberen Kontextwechsel. NUR bei explizitem Aufruf (/session-handoff). NICHT automatisch auslösen. Geeignet wenn der User die Session resetten will, den Kontext aufräumen will, oder bei ~120k Tokens angelangt ist. Gegenstück: /start-from-handoff liest die neueste Datei nach einem /clear wieder ein."
---

# Session Handoff

Erstelle eine strukturierte Zusammenfassung der aktuellen Session und **schreibe sie als
Datei ins Projekt** — nicht ins Terminal. Das Terminal zeigt nur eine kurze Bestätigung
mit Pfad; das Dokument selbst wird von `/start-from-handoff` nach dem `/clear` gelesen.

## Workflow

1. Analysiere die gesamte bisherige Konversation.
2. Bestimme Datum + Uhrzeit (`date '+%Y-%m-%d_%H-%M'`) — nicht raten.
3. Schreibe das Handoff-Dokument (Format unten) nach:
   `<Projektroot>/.claude/handoffs/handoff-<YYYY-MM-DD_HH-MM>.md`
   - Projektroot = aktuelles Arbeitsverzeichnis (bzw. Git-Root, falls tiefer gestartet).
   - Verzeichnis `.claude/handoffs/` bei Bedarf anlegen.
   - Prüfe, ob `.claude/handoffs/` in `.gitignore` erfasst ist. Wenn das Projekt
     `.claude/` versioniert und `handoffs/` nicht ignoriert wird: `.claude/handoffs/`
     in die `.gitignore` eintragen (Handoffs sind Sitzungsnotizen, kein Repo-Inhalt).
4. Gib im Terminal NUR aus:
   - den Dateipfad,
   - den einen „Nächsten Schritt" (eine Zeile),
   - den Hinweis: „`/clear` ausführen, dann `/start-from-handoff` — liest die Datei automatisch."

**Nicht das komplette Dokument ins Terminal schreiben.** Genau dafür existiert die Datei.

## Datei-Format

```markdown
# Session Handoff — [YYYY-MM-DD HH:MM]

## Projekt-Kontext
[Welches Projekt, welcher Branch, welcher Stack — nur Nicht-Offensichtliches]

## Was wurde gemacht
- [Erledigte Task 1, mit Beleg (Commit/Datei) wo vorhanden]
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

- Keine Zusammenfassung von Zusammenfassungen — direkt aus der Konversation extrahieren
- Nur nicht-offensichtliche Infos (was nicht aus `git log` oder Code ableitbar ist)
- Nächster Schritt = eine Sache, nicht eine Liste
- Deutsch wenn die Session auf Deutsch war
- MacDown-Regeln beachten: Leerzeile vor jeder Liste und Überschrift, ein Absatz = zusammenhängender Block
