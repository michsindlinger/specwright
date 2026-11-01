# E2E-Protokoll INT-2026-039

Stand: 2026-11-01, Bausitzung auf `feat/INT-2026-039-lernstueck`.

## Lauf 1 — ohne Konfiguration (AK-01, AK-08)

- `~/.specwright/lernstueck.conf` existiert nicht (`ls` meldet „No such file or directory").
- Befehl nach `specwright/workflows/core/lernstueck.md` in der Bausitzung ausgeführt, Thema: Planung und Bau dieses Befehls.
- Ergebnis: `docs/lernen/2026-11-01-befehl-lernstueck.md` im Projekt-Root angelegt. Danach hierher verschoben als `lernstueck-beispiel.md` (Plan §6 Schritt 4: Stichproben-Dateien unter `docs/lernen/` werden nicht committet).

## Inhalt des Beispiels (AK-02 bis AK-06, RB-02, RB-06)

| Prüfpunkt | Befund |
|---|---|
| AK-02 verworfene Alternative je Entscheidung | Tabelle mit 6 Entscheidungen, je eine Alternative mit Grund |
| AK-03 Muster in Alltagssprache, „ähnlich zu" | 4 Muster; Hybrid-Lookup als „ähnlich zu einem Suchpfad" |
| AK-04 Sackgassen mit Lehre | 3 Einträge (Selbstbezug beim Suchen, zsh-Glob, offene Annahme) |
| AK-05 Selbsttest 3–5, Übertragung ≥ 1 | 4 Fragen mit Antwort, 3 Übertragungshinweise |
| AK-06 Mermaid ≤ 2 | 1 Block |
| RB-02 keine Geheimnis-Muster | `grep -nE "sk-\|ghp_\|token=\|password"` leer |
| RB-06 MacDown | keine Liste direkt nach einer Textzeile (awk-Prüfung) |

## Lauf 2 und 3 — mit Konfiguration (AK-10)

Schritt 4 des Workflows (Ablage) als Shell-Funktion 1:1 nach dem Workflow-Text, mit `HOME` auf einen Testordner im Scratchpad, damit die echte `~/.specwright` unberührt bleibt. Der Inhalt war das Beispiel aus Lauf 1; geprüft wurde nur die Ablage.

| Lauf | Konfiguration | Ergebnis |
|---|---|---|
| 2 | `# Test`, `ziel=/falsch`, `ziel=~/vault/AI/Insights` (Ordner existiert) | Datei im Zielordner; letzte `ziel=`-Zeile gilt, `~` aufgelöst; `docs/lernen/` im Repo unverändert |
| 2b | wie 2, zweiter Lauf | `…-2.md` angelegt, nichts überschrieben |
| 3 | `ziel=~/gibtsnicht` | „STOP: Ziel aus ~/.specwright/lernstueck.conf existiert nicht: …", Exit 1, kein Ordner angelegt |

`~`-Auflösung in zsh und bash geprüft, beide gleich.

## Transkript-Auszug (AK-07, Teil a)

- `CLAUDE_CODE_SESSION_ID` gesetzt; `ls "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/projects/*/"$CLAUDE_CODE_SESSION_ID".jsonl` findet das Transkript dieser Sitzung.
- `jq`-Filter aus Step 2 auf dieses Transkript: 8 724 Byte, 5 Zeilen `## Nutzer:`, 1 Zeile `## Fehler:`.
- Auf dem älteren Transkript `c878a0b3-….jsonl` (2,0 MB) in der Planung: 21 663 Byte.
- Teil b (echte zusammengefasste Sitzung, Markierung `compact_boundary`) ist offen: Handprüfung nach dem Merge (Plan §10).

## Grenzen

Lauf 1 war ein echter Agentenlauf nach dem Workflow, aber in der Bausitzung, die den Workflow geschrieben hat. Lauf 2 und 3 prüfen die Ablage mechanisch, keinen zweiten Agentenlauf.
