# Plan: Lernstück aus einer Session

> **Intent:** `intent.md` (INT-2026-039) · **Spec:** entfällt (bypass: Größe S, ein Befehl, ein Workflow, eine Vorlage)
> **Status:** umgesetzt
> **Erstellt:** 2026-10-31 im Plan Mode · **Freigabe:** Michael (Product Owner), 2026-11-01
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand 1d3c6c4), `CLAUDE.md`, `docs/security.md`
> **Format:** 2.3

<!-- Der Plan ist TECHNISCH und die EINHEIT DER AUSFÜHRUNG. Eine Sitzung setzt ihn ganz um.
     Maßstab: Ein neues Teammitglied könnte allein anhand dieses Dokuments umsetzen.
     Jede Änderung verweist auf eine FA (spec.md) oder ein AK (intent.md). Keine Änderung ohne Herkunft.
     Zwei Leser: „In einfachen Worten" liest die Person, die freigibt; „Details" liest der Agent, der baut. Die erste Zeile unter jeder
     Überschrift sagt, für wen der Abschnitt ist (R1, specwright/workflows/meta/leser-und-rueckfragen.md). Marker übernehmen, keinen entfernen. -->

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Wenn du mit Claude ein Thema durcharbeitest, entsteht in einer Sitzung oft mehr, als du nebenher verstehst: neuer Code, Entscheidungen, Irrwege. Am Ende steht das alles nur im Chat, und nach dem Leeren der Sitzung ist es weg. Specwright kann heute Regeln für Agenten festhalten (der Befehl „add-learning“ schreibt in Skill-Dateien), aber nichts, das sich an dich als Lernenden richtet.

**Was ändert sich?** Es gibt einen neuen Befehl `/specwright:lernstueck`. Rufst du ihn am Ende eines Themas auf, schreibt Claude eine Lerndatei: was gebaut wurde und warum, welche Wege verworfen wurden und weshalb, welche bekannten Muster drinstecken (ehrlich: „ähnlich zu …“, wenn es nur teilweise passt), welche Fehler unterwegs passiert sind und was man daraus lernt, höchstens zwei Diagramme als Mermaid (eine Textform, die Obsidian als Bild zeigt), ein paar Hinweise, wie man das auf andere Projekte überträgt, und 3 bis 5 Prüffragen mit Antworten. Du merkst es als neue Datei; sonst ändert sich nichts. Andere Specwright-Nutzer bekommen den Befehl mit dem nächsten Update.

**Wie wird das gemacht?** Ein Befehl in Specwright ist im Kern eine Arbeitsanweisung an Claude. Es entstehen drei Textdateien: die kurze Befehlsdatei, die ausführliche Anleitung (wie Claude das Thema findet, wo es nachliest, was ins Lernstück gehört, was auf keinen Fall hinein darf) und eine Vorlage mit den Überschriften des Lernstücks. Kein Programmcode, keine Änderung an der Web-Oberfläche.

Zwei Stellen brauchen etwas mehr Sorgfalt:

- Lange Sitzungen werden von Claude Code irgendwann zusammengefasst; danach kennt Claude den frühen Teil nur noch grob. Vollständig steht er im Gesprächsprotokoll, das Claude Code ohnehin auf deiner Platte mitschreibt. Die Anleitung sagt Claude: Wenn deine Sitzung zusammengefasst wurde, hol dir aus diesem Protokoll die Kurzfassung des Verlaufs (nur deine Eingaben, Claudes Antworttexte und Fehlermeldungen) und lies sie. Ich habe das an einer echten Sitzung ausprobiert: aus 2 MB Protokoll werden etwa 21 KB lesbarer Text.
- Ablageort: Ohne weitere Angabe landet das Lernstück im Projekt unter `docs/lernen/`. Legst du auf deinem Rechner eine kleine Einstellungsdatei an (`~/.specwright/lernstueck.conf` mit einer Zeile, die auf deinen Obsidian-Ordner `AI/Insights/` zeigt), landet es dort. Dein Vault-Pfad steht so nur auf deinem Rechner und nie im öffentlichen Repo. Gibt es den eingetragenen Ordner nicht (zum Beispiel wegen eines Tippfehlers), bricht der Befehl mit einer Meldung ab, statt still einen neuen Ordner anzulegen oder woanders abzulegen. Eine bestehende Datei wird nie überschrieben, und der Befehl checkt nichts ins Git ein.

Damit der Befehl wirklich bei allen ankommt, trägt der Plan die drei Dateien in die zentrale Lieferliste ein (aus der alle Installer lesen), zählt im Installer-Test von 23 auf 24 Befehle hoch und hebt die Version auf 4.9.0 mit Eintrag im Änderungsprotokoll.

**Was kann schiefgehen?**

- Das Lernstück kann etwas Falsches erklären oder eine Zeilenangabe danebenliegen. Das ist bewusst nicht abgesichert (du wolltest es „nicht zu eng und zu strikt“). Du merkst es beim Lesen.
- Im Gesprächsprotokoll können Geheimnisse stehen (Tokens, Passwörter). Die Anleitung verbietet, solche Werte zu übernehmen; sie werden durch „[entfernt]“ ersetzt. Ein Restrisiko bleibt, weil das ein Modell befolgt und kein Filterprogramm. Wer es merkt: du beim Lesen; im Specwright-Repo selbst blockiert zusätzlich der vorhandene Commit-Wächter Geheimnis-Muster.
- Ohne Einstellungsdatei landet das Lernstück im Projektordner. In einem öffentlichen Repo könnte man es versehentlich mit einchecken. Der Befehl checkt nie selbst ein; für dich ist das mit der Einstellungsdatei erledigt.
- Wie genau Claude Code eine Zusammenfassung im Protokoll markiert, konnte ich nicht an einem echten Beispiel prüfen (auf diesem Rechner liegt keins). Die Anleitung hat deshalb einen Rückweg: Claude weiß selbst, ob seine Sitzung mit einer Zusammenfassung beginnt, und liest dann den ganzen Auszug. Das prüfst du einmal von Hand in einer langen Sitzung nach dem Merge.
- Rückgängig: die PR zurücknehmen. Sie bringt 3 neue Dateien und ändert sonst nur die Lieferliste, den Zähler im Installer-Test, die Zähler in 2 Doku-Dateien sowie Version und Änderungsprotokoll.

**Was musst du entscheiden?** Nichts, Freigabe reicht. Nach dem Merge legst du einmal die Einstellungsdatei an (Abschnitt 10).

## Details

<!-- leser: mensch -->

<!-- Volle technische Tiefe: Dateien, Funktionen, Datenmodell, Tradeoffs, Testplan. Geht an Reviewer und in die Bausitzung, muss für sich stehen.
     Confidence-Tags in beiden Teilen: [Certain] harte Belege · [Likely] starke Inferenz · [Uncertain] Vermutung. -->

### 1. Kurzfassung

<!-- leser: mensch -->

Neuer Befehl `/specwright:lernstueck` nach dem bestehenden Muster Befehl → Workflow → Vorlage (Hybrid-Lookup), rein als Markdown-Anweisung an den Hauptagenten. Quellen: Sitzungskontext, Git-Stand, bei zusammengefasster Sitzung ein `jq`-Auszug aus dem eigenen Transkript (`$CLAUDE_CODE_SESSION_ID`). Ablage `docs/lernen/` oder Ziel aus `~/.specwright/lernstueck.conf`. Lieferung über Manifest, Installer-Test-Zähler 23 → 24, Version 4.9.0.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Befehlsmuster | `.claude/commands/specwright/plan.md:1-5` (Titel, ein Satz, „Refer to the instructions located in specwright/workflows/core/plan.md") | wiederverwendbar: neue Befehlsdatei genauso kurz [Certain] |
| Workflow-Muster | `specwright/workflows/core/plan.md:1-7` (Frontmatter `description`, `version`, `encoding`), `<process_flow>`/`<step>` | wiederverwendbar [Certain] |
| Nächstes Gegenstück | `.claude/commands/specwright/add-learning.md:3` schreibt Agenten-Regeln in `dos-and-donts.md` | Abgrenzung: Lernstück richtet sich an den Menschen; kein Umbau von add-learning [Certain] |
| Lieferliste | `specwright/manifest.tsv:7-29` (command project), `:300-336` (workflow project), `:121ff` (template global unter `templates/docs/`), `:186-195` (template both unter `templates/sdlc/`) | drei neue Zeilen; Vorlage als `both`, damit der Hybrid-Lookup auch ohne globale Installation trifft [Certain] |
| Installer-Test | `scripts/test-installers.sh:5` (Kommentar „23 Befehle"), `:45` (`[[ "$n" -eq 23 ]]`) | muss auf 24, sonst T1 rot [Certain] |
| Zähler in Doku | `CLAUDE.md:25` („23 Befehle"), `README.md:37` („commands (23)"), `README.md:115` („ships 23 commands") + Tabelle `README.md:117-139` | auf 24 und Tabellenzeile [Certain] |
| Version | `VERSION` = 4.8.0, `install.sh:18` `FRAMEWORK_VERSION="4.8.0"`, `CHANGELOG.md:5` | 4.9.0 (neues Feature, Nebennummer) [Certain] |
| Vorlagen-Guards | `scripts/check-leser-marker.sh:150`, `scripts/check-vorlagen-format.sh:64` prüfen nur `specwright/templates/sdlc/vorhaben` | Vorlage unter `templates/docs/` fällt nicht darunter; keine Format-Zeile, keine Leser-Marker nötig [Certain] |
| Eigene Sitzungskennung | Bash-Umgebung trägt `CLAUDE_CODE_SESSION_ID` (Stichprobe 2026-10-31: `a77c7614-…` = Dateiname des laufenden Transkripts unter `~/.claude/projects/<slug>/`) | Transkript ohne Slug-Berechnung finden: `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/*/$CLAUDE_CODE_SESSION_ID.jsonl` [Certain für Anthropic-Home; Likely für Provider-Homes `~/.claude-<id>`, die `CLAUDE_CONFIG_DIR` setzen] |
| Transkript-Struktur | Stichprobe `c878a0b3-….jsonl` (2,0 MB): Typen `user`, `assistant`, `system`, `attachment`, `api-request*` u. a.; Nutzer-Eingaben als `message.content` String, Antworttext als `message.content[].type=="text"`, Werkzeugfehler als `tool_result` mit `is_error` | `jq`-Auszug (§3) ergibt 21 663 Byte [Certain] |
| Markierung der Zusammenfassung | kein Transkript mit Zusammenfassung auf diesem Rechner gefunden (`grep -rl compact_boundary` traf nur Texttreffer) | Annahme `type=="system" and subtype=="compact_boundary"` [Uncertain]; Rückweg im Workflow (§3), Handprüfung §10 |
| UI liest keine Transkripte | `docs/adr/0004-sitzung-zeigen-statt-nachlesen.md:26`, `docs/architecture.md:35` | bleibt; hier liest nur Claude die eigene Sitzung (NZ-03) [Certain] |
| Allowlist-Regel Transkript | `docs/security.md:103` (gilt für Pfade „von außen gemeldet", UI) | nicht berührt: Pfad entsteht aus der eigenen Prozessumgebung, kein Client, kein Backend [Likely] |
| Globale Konfiguration | `~/.specwright/` existiert (Installer), `lernstueck.conf` existiert nicht | neue, optionale Datei; nicht ausgeliefert, nur im Workflow beschrieben [Certain] |
| Factory | `SPECWRIGHT_FACTORY_DIR` gesetzt, aber keine `~/.factory/*/factory.yaml` mit `repo: michsindlinger/specwright` | kein Schnitt (§7) [Certain] |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

Drei neue Markdown-Dateien, keine Skripte:

1. `.claude/commands/specwright/lernstueck.md` — Titel, ein Satz Zweck, Aufruf `/specwright:lernstueck [thema]`, Verweis auf den Workflow.
2. `specwright/workflows/core/lernstueck.md` (version 1.0) — Hauptagent führt aus, keine Sub-Agenten (RB-04). Schritte:
    - **1 Thema:** Argument, sonst das zuletzt abgeschlossene Thema der Sitzung; bei Zweifel eine Rückfrage mit Vorschlag.
    - **2 Quellen:** eigener Kontext; `git log`/`git diff --stat` des Zweigs für das Gebaute. Wurde die Sitzung zusammengefasst (Claude erkennt das am Beginn seines Kontexts), dann Transkript-Auszug:
      `f=$(ls ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/*/"$CLAUDE_CODE_SESSION_ID".jsonl 2>/dev/null | head -1)` und
      `jq -r '<Filter>' "$f" > [Scratch]/lernstueck-verlauf.md` mit dem Filter: Nutzer-String-Eingaben als `## Nutzer:`, Antworttext als `## Claude:`, Werkzeugfehler (erste 300 Zeichen) als `## Fehler:`, `system/compact_boundary` als `## --- Zusammenfassung ---`. Gelesen wird der Teil vor der letzten Markierung; fehlt die Markierung, der ganze Auszug, in Abschnitten. Kennung leer oder Datei fehlt → im Lernstück unter „Quellen" vermerken „früher Teil nur aus der Zusammenfassung".
    - **3 Schreiben** nach der Vorlage: Abschnitte siehe Vorlage; Regeln: verworfene Alternative je wesentlicher Entscheidung mit Grund (AK-02), Muster in Alltagssprache, Teilumsetzung als „ähnlich zu …" (AK-03), Sackgassen mit Lehre nur falls vorhanden (AK-04), 3–5 Selbsttest-Fragen mit Antwort und ≥ 1 Übertragungshinweis (AK-05), höchstens zwei `mermaid`-Codeblöcke (AK-06), MacDown-Regeln (RB-06), keine erfundenen Fundstellen — nur, was Kontext/Git/Transkript belegen.
    - **Verbot (RB-02):** keine Werte, die nach Geheimnis aussehen (Tokens, Schlüssel, Passwörter, `.env`-Inhalte, Verbindungs-URLs mit Zugangsdaten) → `[entfernt]`. Keine Hostnamen oder Nutzerpfade des Cloud-Hosts.
    - **4 Ablage:** `ziel=$(sed -n 's/^ziel=//p' ~/.specwright/lernstueck.conf 2>/dev/null | tail -1)`, führendes `~` expandieren. Gesetzt → dieser Ordner; existiert er nicht → STOP mit Meldung (kein stilles Anlegen, kein Ausweichen; Tippfehler im Vault-Pfad soll auffallen) (AK-10). Nicht gesetzt → `docs/lernen/` im Projekt-Root, `mkdir -p` (AK-08). Dateiname `JJJJ-MM-TT-[kurzthema].md` (Kleinbuchstaben, Bindestriche, ASCII-Umschrift); besteht er, `-2`, `-3` … — nie überschreiben.
    - **5 Abschluss:** Pfad nennen; kein Commit, kein `git add`.
3. `specwright/templates/docs/lernstueck-template.md` — Frontmatter (`title`, `tags: [lernstueck]`, `created`, `source` = Projekt und Zweig, `ai-generated: true`; vault-tauglich, ohne Vault-Pfad), Abschnitte: Worum es ging · Was gebaut wurde und warum · Entscheidungen und verworfene Wege (Tabelle Entscheidung/Verworfen/Grund) · Muster und Methoden · Sackgassen und Fehler · Diagramme · Übertragen auf andere Projekte · Selbsttest · Quellen (Commits, Dateien). Platzhalter `[…]` (RB-04). Lookup: Projekt `specwright/templates/docs/…`, dann `~/.specwright/templates/docs/…`.

Lieferung: drei Manifest-Zeilen, `test-installers.sh` 23 → 24, Zähler in `CLAUDE.md`/`README.md`, README-Tabellenzeile, `VERSION`/`install.sh` 4.9.0, `CHANGELOG.md` 4.9.0 „Neu".

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| `add-learning` erweitern (Modus „für Menschen") | anderes Ziel (Agenten-Regeln in Skill-Dateien), andere Ablage; Vermischung macht beide Abläufe unklarer |
| Skill statt Befehl | Intent verlangt Befehl `/specwright:lernstueck` (Absicht „Kernaufgaben"); Specwright liefert Abläufe als Befehl + Workflow |
| Shell-Skript für Transkript-Auszug und Ablage | zwei Zeilen `jq`/`sed` im Workflow reichen; ein Skript bräuchte eigenen Test, Manifest-Zeile und Bash-3.2-Pflege |
| Slug aus `pwd` berechnen statt `CLAUDE_CODE_SESSION_ID` | Slug-Regel undokumentiert (Punkte, Unterstriche); Kennung trifft die Datei direkt |
| Transkript immer lesen | kostet Kontext ohne Nutzen, solange nichts zusammengefasst wurde |
| Fehlenden Ziel-Ordner anlegen | ein Tippfehler im Vault-Pfad erzeugte stillen Müll-Ordner |
| Vorlage unter `templates/sdlc/` | dort gelten Vorhaben-Guards (Format-Zeile, Leser-Marker), die für ein Lernstück nicht passen |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Nein** — bleibt innerhalb von `docs/architecture.md` §4: AR-01 (neue Dateien nur über `manifest.tsv`), AR-06 (keine UI-Abhängigkeit), AR-07 (Ablage `docs/lernen/` im Projekt-Root, Werkzeug unter `specwright/`). ADR-0004 unverändert: kein Transkript-Leser in der UI. Kein ADR (keine Datenhaltung der UI, keine Lieferketten-Änderung außer neuen Zeilen).

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `.claude/commands/specwright/lernstueck.md` | neu | Befehl, Verweis auf Workflow | AK-01, AK-09 |
| 2 | `specwright/workflows/core/lernstueck.md` | neu | Ablauf Schritte 1–5 (§3) | AK-01–AK-08, AK-10, RB-02, RB-04, RB-06 |
| 3 | `specwright/templates/docs/lernstueck-template.md` | neu | Gliederung und Frontmatter | AK-02–AK-06 |
| 4 | `specwright/manifest.tsv` | ändern | `command project`, `workflow project`, `template both` (je alphabetisch einsortiert) | AK-09, RB-03 |
| 5 | `scripts/test-installers.sh` | ändern | Zeile 5 und 45: 23 → 24 | AK-09 |
| 6 | `CLAUDE.md`, `README.md` | ändern | Zähler 23 → 24; README-Tabellenzeile `/lernstueck` | AK-09 |
| 7 | `VERSION`, `install.sh:18`, `CHANGELOG.md` | ändern | 4.9.0, Eintrag „Neu" mit Konfigurationsformat | RB-05 |

**Nicht betroffen (ausdrücklich):** `ui/` (NZ-03, NZ-05), Installer-Code (`install.sh` außer Versionszeile, `setup*.sh`, `update-specwright.sh`, `install-lib.sh` — lesen das Manifest), `add-learning`, `docs/architecture.md`, `docs/security.md`, ADR-0004, `removed.tsv`, Skill `session-handoff`.

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| Befehl `lernstueck.md` | Workflow `core/lernstueck.md` | Verweis | „Refer to the instructions located in specwright/workflows/core/lernstueck.md" | `grep -n "workflows/core/lernstueck.md" .claude/commands/specwright/lernstueck.md` | — |
| Workflow | Vorlage | Hybrid-Lookup | `specwright/templates/docs/lernstueck-template.md` → `~/.specwright/templates/docs/…` | `grep -n "lernstueck-template.md" specwright/workflows/core/lernstueck.md` | — |
| Manifest | alle Installer | Lieferliste (AR-01) | drei Zeilen | `grep -c lernstueck specwright/manifest.tsv` = 3; `bash scripts/check-manifest.sh` | — |
| Installer-Test | Manifest | T1-Zählung | `n -eq 24` | `bash scripts/test-installers.sh` → `✅ Installer-Test: T1–T8 grün` | — |
| Workflow | Transkript | Datei lesen (eigene Sitzung) | `$CLAUDE_CODE_SESSION_ID`, `jq` | Stichprobe §8 (AK-07) | — |
| Workflow | `~/.specwright/lernstueck.conf` | Datei lesen | Zeile `ziel=` | Stichprobe §8 (AK-08, AK-10) | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl oder eine benannte Stichprobe.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. Lesende Vorprüfung: `grep -rn "23 Befehle\|(23)\|23 commands\|-eq 23" --exclude-dir=node_modules --exclude-dir=intent .` → nur die Stellen aus §2 (sonst §4 ergänzen).
1. Erste Scheibe: Befehl + Workflow + Vorlage + Manifest-Zeilen + Zähler 24 → vorführbar durch Aufruf `/specwright:lernstueck` in dieser Bausitzung (ohne Konfiguration) → Datei unter `docs/lernen/`. Nur eine Schicht (Anweisungstexte + Lieferliste), weil es keinen Code gibt.
2. Verbreitern: Konfigurationsweg (zweiter Aufruf mit `ziel=` auf Scratch-Ordner; dritter mit nicht existentem Ordner → STOP), Transkript-Auszug am eigenen Transkript prüfen.
3. Version/CHANGELOG/README; Verbindungen aus §5 nachweisen.
4. `bash scripts/verify.sh` → `verify: OK`; Stichproben-Dateien aus `docs/lernen/` nicht committen (eine davon als Beispiel nach `intent/INT-2026-039-lernstueck-aus-session/e2e/`).

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Drei kleine Textdateien plus Zählerstellen, die nur gemeinsam einen lieferbaren Befehl ergeben; Zerlegung brächte nur Integrationsaufwand.

#### Karten für die Factory (optional)

<!-- leser: mensch -->

Kein Schnitt: keine Betriebsdatei für dieses Projekt.

### 8. Tests und Nachweis

<!-- leser: agent -->

Nahtstelle für AK-01 bis AK-08 und AK-10: der Befehl `/specwright:lernstueck` selbst — die höchste und einzige öffentliche Schnittstelle; es gibt keinen Code, der sich darunter testen ließe. Für AK-09: der Installer-Test (bestehend).

| AK / FA | Nahtstelle (warum diese) | Test | Datei | Art |
|---|---|---|---|---|
| AK-09 | Installer-Test T1 (bestehend, prüft Befehle = Manifest) | Zähler 24, Manifest-Gleichheit | `scripts/test-installers.sh` | Test (in `verify`) |
| AK-01, AK-08 | Befehl, ohne `lernstueck.conf` | Aufruf in der Bausitzung → Datei `docs/lernen/2026-…-….md` existiert | Beispiel nach `intent/INT-2026-039-…/e2e/lernstueck-beispiel.md` | Stichprobe |
| AK-10 | Befehl, `ziel=` auf Scratch-Ordner | Datei liegt im Scratch-Ordner, nicht unter `docs/lernen/`; zweiter Lauf mit nicht existentem Ziel → Meldung, keine Datei | Protokoll in `e2e/README.md` | Stichprobe |
| AK-02–AK-06 | Inhalt des Beispiel-Lernstücks | Review gegen Checkliste: Alternative je Entscheidung, „ähnlich zu", Sackgasse, 3–5 Fragen, ≤ 2 Mermaid, MacDown-Leerzeilen | `e2e/lernstueck-beispiel.md` | Review |
| AK-07 | Transkript-Auszug | (a) Filter am eigenen Transkript: Ausgabe nicht leer, enthält `## Nutzer:`; (b) echte zusammengefasste Sitzung → Handprüfung §10 | `e2e/README.md` | Stichprobe |
| RB-02 | Beispiel-Lernstück | `grep -nE "sk-|ghp_|token=|password" e2e/lernstueck-beispiel.md` leer | — | Stichprobe |
| RB-01 | Repo | `git grep -n "Mobile Documents\|Michael-MBPro" -- specwright .claude/commands` leer | — | Stichprobe |

- **Verify-Befehl:** `bash scripts/verify.sh` — `verify: OK`, Ausgabe im PR. CI ist die Wahrheit; Bezugsliste nicht anfassen.
- **Angeschlossen (E2E-Pfad):** Befehl → Workflow → Vorlage → Datei am Ablageort, zweimal (ohne/mit Konfiguration), Protokoll in `e2e/README.md`.
- **Bugfix:** entfällt.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| Lernstück erklärt etwas falsch oder nennt eine falsche Fundstelle | mittel | niedrig | Regel „nur Belegtes"; keine Prüfung (NZ-01) | Michael beim Lesen |
| Geheimnis aus Transkript gelangt ins Lernstück | niedrig | hoch | Verbot im Workflow, `[entfernt]`; Hook `no-secrets` im Specwright-Repo | Michael beim Lesen; Hook beim Commit |
| Lernstück unter `docs/lernen/` wird in einem öffentlichen Repo versehentlich committet | niedrig | mittel | Befehl committet nie; Michael nutzt die Konfiguration | Michael im `git status` |
| Markierung der Zusammenfassung heißt anders als angenommen | mittel | niedrig | Rückweg: ganzer Auszug; Handprüfung §10 | Michael bei der Handprüfung |
| `CLAUDE_CODE_SESSION_ID` fehlt (ältere Claude-Code-Fassung) | niedrig | niedrig | Vermerk im Lernstück, Stand aus Kontext | Michael im Abschnitt „Quellen" |
| Provider-Sitzung mit eigenem Home ohne `CLAUDE_CONFIG_DIR` | niedrig | niedrig | Vermerk wie oben | Michael |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Merge der PR (löst Auto-Deploy der UI aus; diese PR ändert die UI nicht) | Michael | nach Review | [ ] |
| Update im eigenen Projekt: `bash update-specwright.sh` bzw. `install.sh` im Zielprojekt | Michael | nach Merge | [ ] |
| Konfiguration anlegen: `~/.specwright/lernstueck.conf` mit einer Zeile `ziel=[Vault]/AI/Insights` | Michael | nach Merge | [ ] |
| Handprüfung AK-07: in einer zusammengefassten Sitzung `/specwright:lernstueck` aufrufen, prüfen, ob der frühe Teil vorkommt; falls nicht: Markierung im Transkript nachsehen (`jq -c 'select(.type=="system") | .subtype' [datei] | sort -u`) und als Bug melden | Michael | erste lange Sitzung nach Merge | [ ] |

### 11. Schätzung

<!-- leser: mensch -->

2–3 h. Unsicherheit: Stichproben-Aufrufe des Befehls in der Bausitzung kosten Kontext und Zeit; Transkript-Markierung nicht vorab prüfbar.

**Kontext für den Bau:** ~55k Tokens — Plan ~8k, zu lesende Dateien ~12k (Workflow-Muster, Manifest-Ausschnitte, Test, README, CHANGELOG), Änderungen ~10k, Prüfausgaben und Stichproben-Läufe ~25k. Unter der Grenze von ~120k.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| S1 — Installer-Test zählt Befehle hart (23): angenommen, sonst bricht T1 nach der neuen Manifest-Zeile. | Self | angenommen | §4 #5 |
| S2 — Vorlage nur `global` wie die übrigen `templates/docs/`: abgelehnt, weil ein Projekt ohne globale Installation (T1 installiert nur Projekt) die Vorlage nicht fände; `both` wie `templates/sdlc/` (`manifest.tsv:186`). | Self | abgelehnt | §3, §4 #4 |
| S3 — Transkript-Auszug als eigenes Skript: abgelehnt, zwei Zeilen im Workflow genügen; Skript bräuchte Test und Manifest-Zeile (Minimalinvasiv). | Self | abgelehnt | §3 Alternativen |
| S4 — `docs/security.md` um das Lesen des eigenen Transkripts ergänzen: abgelehnt, die Regel `security.md:103` betrifft von außen gemeldete Pfade in der UI; hier liest Claude die eigene Datei über die eigene Prozessumgebung, Klasse unverändert. | Self | abgelehnt | — |
| S5 — Fehlender Ziel-Ordner: STOP statt Anlegen oder Ausweichen, damit ein Tippfehler auffällt und AK-10 („MUSS dort ablegen") nicht still verletzt wird. | Self | angenommen | §3 Schritt 4 |
| S6 — Eintrag im Vault-Index `AI/Index.md`: abgelehnt, Michael-spezifisch und nicht ins öffentliche Repo (RB-01); bleibt Michaels Sache. | Self | abgelehnt | — |

**Minimalinvasiv geprüft:** Wiederverwendet: Befehl/Workflow-Muster, Manifest + bestehende Installer, bestehender Installer-Test (nur Zähler), `jq` (vorhanden, `/usr/bin/jq`), `CLAUDE_CODE_SESSION_ID`. Gestrichen: Skript, ADR, Änderungen an `security.md`/`architecture.md`, Vault-Index-Pflege, Geheimnis-Filterprogramm.

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-11-01: Befund: (1) „In einfachen Worten“ nannte nicht, dass ein fehlender Zielordner zum Abbruch führt und nie überschrieben oder committet wird (§3 Schritt 4/5), ergänzt; (2) der Satz zum Rückgängigmachen nannte nur „drei neue Dateien und Zählerstellen“, jetzt vollständig nach §4. §9, §10, §12 ohne Befund.

### 13. Definition of Done

<!-- leser: agent -->

- [ ] Jede FA/AK aus Abschnitt 8 hat einen grünen Test bzw. ein Stichproben-Protokoll.
- [ ] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [ ] E2E-Pfad läuft (Abschnitt 8).
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün (CI ist die Wahrheit).
- [ ] `docs/architecture.md` angepasst, falls Abschnitt 3 „Ja" (hier: Nein).
- [ ] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [ ] Abweichungen von diesem Plan in Abschnitt 14 eingetragen.
- [ ] 2x-Regel-Check: Fehler, der zum zweiten Mal vorkam → zuerst automatische Prüfung (Hook, Lint, Test); sonst nummerierte Regel in `docs/architecture.md` (AR/AP); `CLAUDE.md` nur, wenn nicht aus dem Code ablesbar und für jede Aufgabe gültig. Vorschlag im PR.
- [ ] Abschlussbericht nach R3 (nur Mensch-Abschnitte im Chat), endet mit dem Block „Für das Board" (Projekt, Tracker-Eintrag, Zielstatus, PR-Link, Stand, Verweis auf `intent/INT-2026-039-lernstueck-aus-session/`; Board-Karte nur bei Internem); Tracker nachgezogen, Board nur bei Internem; Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-11-01 | AK-10, Lauf mit Konfiguration: Ablage-Schritt des Workflows als Shell-Funktion mit `HOME` auf einen Testordner geprüft, kein zweiter Agentenlauf mit echter `~/.specwright/lernstueck.conf`. | Michaels echte Konfiguration sollte vor dem Merge nicht entstehen; geprüft wird die Ablage-Logik, der Inhalt ist derselbe wie in Lauf 1. | §8 (Protokoll `e2e/README.md`) |
| 2026-11-01 | Lokales `verify` Stufe 5 rot: Lauf 1 sechs, Lauf 2 zwei neue rote Testdateien (`sprach-erkennung`, `vorhaben-abschluss-git`, Terminal-Tests); einzeln laufen Terminal- und Abschluss-Tests grün. Bezugsliste nicht angefasst. | Der Diff berührt `ui/` nicht; die rote Menge wechselt je Lauf (bekannte Mac-Flakiness, Zeitüberschreitungen unter Last). CI entscheidet. | §8, §13 (PR-Check abwarten) |
| 2026-11-01 | Vor `verify` `npm ci` in `ui/` und `ui/frontend/` plus `chmod +x` für `spawn-helper` nötig. | Frische Arbeitskopie ohne `node_modules` (bekannte Falle, `CLAUDE.md` „Fehler zweimal"). | — |
| 2026-11-01 | Workflow: Leerzeile nach „**Grundsätze:**" ergänzt. | MacDown-Prüfung aus §8 schlug an. | — |
