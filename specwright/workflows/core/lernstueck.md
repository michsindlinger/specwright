---
description: Lernstück für den Menschen aus der laufenden Session — was, warum, verworfene Wege, Muster, Sackgassen, Mermaid, Selbsttest
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Lernstück Workflow

## Overview

Schreibt nach einem abgeschlossenen Thema ein Lernstück als Markdown-Datei. Leser ist der Mensch, der die Session geführt hat und verstehen will, was gebaut wurde und warum, und daraus für andere Projekte lernen will. Gegenstück zu `add-learning` (Regeln für Agenten in Skill-Dateien) und `session-handoff` (Fortsetzung durch einen Agenten).

**Grundsätze:**

- Der Hauptagent führt aus; keine Sub-Agenten.
- Nur Belegtes: was Kontext, Git oder Transkript zeigen. Keine erfundenen Fundstellen, Zahlen oder Entscheidungen.
- Ehrlich benennen: ein Muster, das der Code nur teilweise umsetzt, heißt „ähnlich zu …“.
- Kein Commit, kein `git add`. Was mit der Datei passiert, entscheidet der Mensch.

<process_flow>

<step number="1" name="thema">

### Step 1: Thema bestimmen

IF Argument genannt: dieses Thema.
ELSE: das zuletzt abgeschlossene Thema der Session (letzte Aufgabe, die mit Ergebnis endete: Commit, PR, fertige Datei, beantwortete Frage).
IF unklar, welches Thema gemeint ist: eine Rückfrage mit Vorschlag („Lernstück zu [Thema]? Sonst nenne das Thema.“).

</step>

<step number="2" name="quellen">

### Step 2: Quellen sammeln

1. Eigener Kontext der Session: Aufgabe, Entscheidungen, verworfene Ansätze, Fehler und ihre Behebung.
2. Git, sofern ein Repository: `git log --oneline -20` und `git diff --stat` gegen die Basis des Zweigs, um das Gebaute mit Dateien und Commits zu belegen.
3. Nur wenn die Session zusammengefasst wurde (der Kontext beginnt mit einer Zusammenfassung früherer Gesprächsteile): Verlauf aus dem eigenen Transkript holen.

```bash
f=$(ls "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/projects/*/"$CLAUDE_CODE_SESSION_ID".jsonl 2>/dev/null | head -1)
jq -r '
  if .type=="user" and (.message.content|type=="string") then "## Nutzer: " + .message.content
  elif .type=="assistant" then (.message.content[]? | select(.type=="text") | "## Claude: " + .text)
  elif .type=="user" then (.message.content[]? | select(.type=="tool_result" and .is_error==true) | "## Fehler: " + ((.content|tostring)[0:300]))
  elif .type=="system" and .subtype=="compact_boundary" then "## --- Zusammenfassung ---"
  else empty end' "$f" > "[scratch]/lernstueck-verlauf.md"
```

`[scratch]` = Scratchpad der Sitzung, sonst ein Ordner unter `${TMPDIR:-/tmp}`. Lies den Teil vor der letzten Zeile `## --- Zusammenfassung ---`, in Abschnitten (Read mit `offset`/`limit`). Fehlt diese Zeile, lies den ganzen Auszug. Ist `CLAUDE_CODE_SESSION_ID` leer oder die Datei nicht da: weiter ohne Transkript und unter „Quellen“ vermerken „früher Teil der Sitzung nur aus der Zusammenfassung“.

RULE: Nur das Transkript der eigenen Session (Kennung aus der eigenen Umgebung), nie eine fremde Datei.

</step>

<step number="3" name="schreiben">

### Step 3: Lernstück schreiben

LOAD Vorlage (hybrid): `specwright/templates/docs/lernstueck-template.md`, sonst `~/.specwright/templates/docs/lernstueck-template.md`.
FILL nach Vorlage:
  - **Was gebaut wurde und warum:** Lösungsweg als Erklärung; jeder Fachbegriff beim ersten Auftreten in Alltagssprache erklärt.
  - **Entscheidungen:** zu jeder wesentlichen Entscheidung mindestens eine verworfene Alternative mit Grund.
  - **Muster und Methoden:** jedes in Alltagssprache; Teilumsetzung als „ähnlich zu [Muster]: [Unterschied]“.
  - **Sackgassen und Fehler:** falls Ansätze verworfen oder Fehler behoben wurden, je mit Lehre; sonst Abschnitt weglassen.
  - **Diagramme:** höchstens zwei, als `mermaid`-Codeblock; keins, wenn Text reicht.
  - **Übertragen:** mindestens ein Hinweis, wo und wie sich das Gelernte auf andere Kontexte übertragen lässt.
  - **Selbsttest:** 3 bis 5 Fragen mit Antworten, die Verständnis prüfen.
  - **Quellen:** Commits und Dateien aus Step 2.
FORMAT MacDown-tauglich: Leerzeile vor jeder Liste, vor und nach Überschriften, Tabellen und Codeblöcken; verschachtelte Listen mit 4 Leerzeichen.
RULE Verbot: keine Werte, die nach Geheimnis aussehen (Tokens, API-Schlüssel, Passwörter, Inhalte von `.env`-Dateien, URLs mit Zugangsdaten) — durch `[entfernt]` ersetzen. Keine Hostnamen, Nutzernamen oder Pfade eines Servers aus der Session.

</step>

<step number="4" name="ablage">

### Step 4: Ablage

```bash
ziel=$(sed -n 's/^ziel=//p' ~/.specwright/lernstueck.conf 2>/dev/null | tail -1)
ziel="${ziel/#\~/$HOME}"
```

IF `ziel` gesetzt:
  - Ordner existiert → dort ablegen.
  - Ordner existiert nicht → STOP mit „Ziel aus ~/.specwright/lernstueck.conf existiert nicht: [ziel]. Ordner anlegen oder Zeile korrigieren.“ Nichts anlegen, nicht woanders ablegen.
ELSE: `docs/lernen/` im Projekt-Root (`git rev-parse --show-toplevel`, sonst aktuelles Verzeichnis); `mkdir -p`.

Dateiname `JJJJ-MM-TT-[kurzthema].md`: Tagesdatum, Kurzthema in Kleinbuchstaben mit Bindestrichen, Umlaute als ae/oe/ue/ss. Existiert die Datei, `-2`, `-3` … anhängen; nie überschreiben.

Format von `~/.specwright/lernstueck.conf`: Zeilen `schlüssel=wert`, `#` leitet Kommentare ein; ausgewertet wird nur `ziel=` (letzte Zeile gilt), `~` am Anfang ist erlaubt.

</step>

<step number="5" name="abschluss">

### Step 5: Abschluss

OUTPUT: Pfad der Datei und in einem Satz, welches Thema sie behandelt. Kein Commit, kein `git add`.

</step>

</process_flow>
