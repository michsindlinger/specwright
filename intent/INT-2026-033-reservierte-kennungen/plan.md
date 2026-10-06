# Plan: Vorgemerkte Kennungen: next-intent-id.sh liest intent/RESERVIERT

> **Intent:** `intent.md` (INT-2026-033) · **Spec:** entfällt (bypass: Bugfix Issue #107, Größe S)
> **Status:** umgesetzt (Merge steht aus)
> **Erstellt:** 2026-10-06 im Plan Mode · **Freigabe:** Michael (Produktverantwortung), 2026-10-06 („freigabe", Chat)
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand f242358), `CLAUDE.md`, `docs/security.md`
> **Format:** 2.0

<!-- Der Plan ist TECHNISCH und die EINHEIT DER AUSFÜHRUNG. Eine Sitzung setzt ihn ganz um.
     Maßstab: Ein neues Teammitglied könnte allein anhand dieses Dokuments umsetzen.
     Jede Änderung verweist auf eine FA (spec.md) oder ein AK (intent.md). Keine Änderung ohne Herkunft.
     Zwei Leser: „In einfachen Worten" liest die Person, die freigibt; „Details" liest der Agent, der baut. Die erste Zeile unter jeder
     Überschrift sagt, für wen der Abschnitt ist (R1, specwright/workflows/meta/leser-und-rueckfragen.md). Marker übernehmen, keinen entfernen. -->

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Jedes Vorhaben bekommt eine laufende Nummer, zum Beispiel INT-2026-033. Diese Nummer vergibt ein kleines Skript: Es schaut nach, welche Vorhaben-Ordner es schon gibt, und nimmt die nächste. Manchmal wird eine Nummer aber früher vergeben, als der Ordner entsteht. In der Software Factory stand INT-2026-001 schon in der Roadmap und im Titel eines GitHub-Issues, bevor irgendjemand mit der Arbeit begonnen hatte. Das Skript wusste davon nichts und hat dieselbe Nummer für ein anderes Vorhaben vorgeschlagen. Du musstest sie von Hand ändern. Und wenn das vorgemerkte Vorhaben dann wirklich startet, würde das Skript ihm eine ganz neue Nummer geben, nicht die aus der Roadmap.

**Was ändert sich?** Es gibt im Ordner `intent/` eine einfache Textdatei namens `RESERVIERT`. Darin steht pro Zeile eine vorgemerkte Nummer mit einem Kurznamen, etwa „INT-2026-001 motor-geruest". Das Skript liest diese Datei mit und überspringt alle Nummern, die dort stehen. Startet später das Vorhaben „motor-geruest", erkennt das Skript den Kurznamen, gibt ihm genau seine vorgemerkte Nummer und streicht die Zeile aus der Datei, weil es jetzt ja einen echten Ordner gibt. Neu ist auch ein Befehl zum Vormerken: Statt eine Nummer nur in die Roadmap zu schreiben, ruft man das Skript mit „vormerken" und Kurznamen auf, und es trägt die nächste freie Nummer in die Datei ein und nennt sie. Projekte ohne diese Datei merken keinen Unterschied.

**Wie wird das gemacht?** Man kann sich das wie ein Wartezimmer mit Nummernzetteln vorstellen. Bisher zählte der Automat nur die Leute, die schon im Behandlungsraum sitzen. Jetzt hängt zusätzlich eine Liste mit Terminen an der Wand, und der Automat zählt die mit. Kommt jemand mit Termin, bekommt er seine Nummer und wird von der Liste gestrichen. Das Skript liest die Liste an denselben Stellen, an denen es heute schon Ordner zählt: in der eigenen Arbeitskopie, in allen anderen Arbeitskopien auf dem Rechner und in allen Zweigen, auch denen auf GitHub. Gezählt wird nur die Nummer am Zeilenanfang; Bemerkungen hinter einem `#` zählen nicht, damit ein Kommentar wie „siehe INT-2026-009" keine Nummer blockiert. Geändert werden 6 Dateien: das Skript, sein Test (4 neue Testfälle), die Arbeitsanweisung für `/intent` (ein Absatz), die Anleitung der Vorlagen (eine Zeile), das Änderungsprotokoll und die Versionsnummer (4.3.1 an zwei Stellen).

**Was kann schiefgehen?** Wer eine Nummer vormerkt, muss die geänderte Datei committen und pushen, sonst sieht eine andere Arbeitskopie sie nur auf demselben Rechner. Das ist dieselbe Grenze wie heute bei Ordnern. Merken zwei Sitzungen genau gleichzeitig vor, können sie kurz dieselbe Nummer erwischen; das Skript prüft danach nach und weicht aus, wie heute beim Anlegen von Ordnern. Bleibt eine Zeile stehen, deren Vorhaben nie kommt, ist die Nummer eben verbraucht, was harmlos ist. Rückgängig: Revert der PR; eine angelegte `RESERVIERT`-Datei stört das alte Skript nicht.

**Was musst du entscheiden?** Nichts, Freigabe reicht. Zwei Dinge habe ich selbst entschieden: Der Befehl zum Vormerken heißt `--hold` (passend zum bestehenden `--reserve`), und die Übernahme einer vorgemerkten Nummer beim Start liest nur die Datei der eigenen Arbeitskopie. Steht die Vormerkung nur auf einem anderen Zweig, wird die Nummer zwar übersprungen, aber nicht übernommen; dann zuerst den Zweig mit der Vormerkung hereinholen.

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: mensch -->

`next-intent-id.sh` bekommt eine zweite Kandidatenquelle: den Inhalt von `intent/RESERVIERT` (erstes Feld je Zeile, Kommentare ab `#` entfernt) aus eigener Kopie, Worktrees und allen Refs (`git show <ref>:intent/RESERVIERT`). Neu `--hold <kurzname>` (Eintrag, idempotent, Kollisionsprüfung wie bei `--reserve`); `--reserve <kurzname>` übernimmt eine vorgemerkte Kennung der eigenen Kopie und streicht die Zeile. Test T8–T11, Workflow `intent` 1.x Step 4, README-Zeile, CHANGELOG 4.3.1, VERSION.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Kandidaten | `specwright/scripts/next-intent-id.sh:72-84` `candidates()` — `ls intent`, je Worktree `ls <w>/intent`, je Ref `git ls-tree --name-only <ref> intent/` | wird um Dateiinhalt erweitert; `ls` liefert `RESERVIERT` als Namen, zählt nicht (kein `INT-`-Muster) |
| Vergabe | `next-intent-id.sh:86-91` `next_id()` — `grep -o "INT-$YEAR-…"`, höchste + 1 | unverändert; neue Quelle liefert schon gefilterte Kennungen |
| Reservierung | `next-intent-id.sh:98-129` — `mkdir` ohne `-p`, Tie-Break alphabetisch, fünf Versuche, Platzhalter-`intent.md` | Platzhalter-Schreiben als Funktion herausziehen (Wiederverwendung im Übernahmepfad); Tie-Break-Muster für `--hold` wiederverwenden |
| Argumente | `next-intent-id.sh:28-43` — `--no-fetch`, `--reserve`, Kurznamen-Regex | `--hold` dazu; `--hold` und `--reserve` schließen sich aus |
| Test | `scripts/test-next-intent-id.sh` T1–T7, Fixture mit Bare-Remote, `run()`-Helfer; in `scripts/verify.sh:36` | T8–T11 anhängen, eigenes Fixture-Repo |
| Workflow | `specwright/workflows/core/intent.md:77-84` Step 4 „RESERVE" | Satz zu `RESERVIERT`, Übernahme und `--hold` |
| Web-UI | `ui/src/server/services/vorhaben-reader.ts:399-404` filtert `INTENT_DIR_RE` und `isDirectory()`; `vorhaben-watcher.ts:221` filtert `INTENT_DIR_RE` | Datei `intent/RESERVIERT` wird ignoriert [Certain] — keine Änderung |
| Manifest | `specwright/manifest.tsv:99` liefert das Skript aus | keine neue Datei → keine Manifest-Zeile; `RESERVIERT` entsteht im Projekt |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

**Dateiformat** `intent/RESERVIERT` (Klartext, UTF-8):

- Zeile = `INT-JJJJ-NNN <kurzname>` plus optional `  # Bemerkung`; Leerzeilen und Zeilen mit `#` am Anfang sind Kommentare.
- Gezählt wird nur das erste Feld nach Entfernen von `#…`, und nur wenn es `^INT-[0-9]{4}-[0-9]{3}$` erfüllt (AK-02).
- `--hold` legt die Datei mit zwei Kopfkommentaren an (Zweck, Format, Verweis auf das Skript), falls sie fehlt.

**Funktionen** (Bash 3.2):

- `reserved_ids()` — liest stdin, `sed 's/#.*//'`, `awk '{print $1}'`, `grep -E '^INT-[0-9]{4}-[0-9]{3}$'`.
- `candidates()` erweitert: `[ -f intent/RESERVIERT ] && reserved_ids <intent/RESERVIERT`; je Worktree dasselbe für `$w/intent/RESERVIERT`; je Ref `git show "$ref:intent/RESERVIERT" 2>/dev/null | reserved_ids` (AK-01).
- `held_id <kurzname>` — Kennung aus der eigenen `intent/RESERVIERT`, deren zweites Feld dem Kurznamen entspricht (erste Fundstelle).
- `write_placeholder <dir> <id>` — bisheriger Block `next-intent-id.sh:115-123`, unverändert im Inhalt.
- `drop_held <kurzname>` — Zeile mit diesem Kurznamen entfernen (`awk` in Temp-Datei neben der Datei, `mv`); andere Zeilen und Kommentare bleiben.

**`--hold <kurzname>`** (AK-03): steht der Kurzname schon in der eigenen Datei → Kennung ausgeben, Exit 0, nichts schreiben. Sonst bis zu fünf Versuche: `id=$(next_id)`, Zeile anhängen, dann Kollisionsprüfung: gibt es eine zweite Zeile mit derselben Kennung, behält sie der alphabetisch erste Kurzname, der andere entfernt seine Zeile und bestimmt neu (gleiches Muster wie `--reserve`, `next-intent-id.sh:99-102`). Testnaht `SPECWRIGHT_INTENT_ID_BEFORE_MKDIR` läuft auch vor dem Anhängen (heißt weiter so, Kommentar ergänzt).

**`--reserve <kurzname>`** (AK-04): vor der Schleife `held=$(held_id "$kurzname")`. Ist sie gesetzt: `mkdir intent/$held-$kurzname` (ohne `-p`); gelingt es → Platzhalter schreiben, `drop_held`, stderr `hinweis: vorgemerkte Kennung $held übernommen (intent/RESERVIERT)`, Kennung ausgeben, Exit 0. Gelingt es nicht → Exit 1 mit `fehler: intent/$held-$kurzname existiert schon`. Ohne Vormerkung → bisheriger Ablauf unverändert (AK-05).

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Issues per `gh` mitlesen (Issue-Idee 3) | Netz und `gh` nötig, nur GitHub; NZ-01 |
| Grep über Roadmap/`docs/` (Idee 4) | falsche Treffer und bricht bei umbenannten Ordnern; NZ-01 |
| Nur Regel „Platzhalter-Ordner früh anlegen" (Idee 2) | leicht zu vergessen; ein leerer Ordner erscheint in der Web-UI als Vorhaben-Entwurf |
| Vormerkung bei Übernahme stehen lassen | zweites `--reserve` mit demselben Kurznamen liefe in `mkdir`-Fehler; Datei soll nur Nummern ohne Ordner führen |
| Übernahme auch aus fremden Refs | Skript würde Nummern aus nicht gemergten Zweigen übernehmen; Kandidatenzählung deckt das Doppelvergabe-Risiko schon ab |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Nein** — bleibt innerhalb von architecture.md §3 (Vorhaben `intent/INT-…/` im Projekt-Repo, Git) und AR-07 (Produkt-Artefakte im Repo-Root unter `intent/`). Kein ADR (keine Datenhaltung der UI, keine Lieferkette: keine neue ausgelieferte Datei).

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `specwright/scripts/next-intent-id.sh` | ändern | `reserved_ids`, `candidates()` erweitert, `--hold`, Übernahme in `--reserve`, `write_placeholder`, Kopfkommentar | AK-01–AK-05 |
| 2 | `scripts/test-next-intent-id.sh` | ändern | T8–T11, Kopf und Schlusszeile „T1–T11" | AK-01–AK-05 |
| 3 | `specwright/workflows/core/intent.md` | ändern | Step 4: Übernahme vorgemerkter Kennung, Hinweis auf stderr in den Bericht, `--hold` für Vorab-Nummern; Workflow-Version +0.1 | AK-03, AK-04 |
| 4 | `specwright/templates/sdlc/README.md` | ändern | Zeile „Vorgemerkte Kennungen" unter der Ebenen-Tabelle | AK-03 |
| 5 | `CHANGELOG.md` | ändern | `## 4.3.1 - 2026-10-06`, `### Behoben`, `### Neu` | RB-03 |
| 6 | `VERSION`, `install.sh` (`FRAMEWORK_VERSION`) | ändern | 4.3.1 | RB-03 |

**Nicht betroffen (ausdrücklich):** Web-UI (Leser filtern auf Ordner), `manifest.tsv`, `plan-product` und Roadmap-Vorlage (NZ-02), Vorhaben-Vorlagen (keine Formatänderung).

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `candidates()` | `intent/RESERVIERT` (eigene Kopie, Worktrees, Refs) | Dateilesen / `git show` | `reserved_ids` | `grep -n "RESERVIERT" specwright/scripts/next-intent-id.sh` · T8, T9 | — |
| Argumente | `--hold`-Zweig | CLI | `next-intent-id.sh --hold <kurzname>` | T10 | — |
| `--reserve` | `held_id` / `drop_held` | Funktionsaufruf | Kurzname | T11 | — |
| Workflow `/intent` Step 4 | Skript | Aufruf | `--reserve`, `--hold` | `grep -n "RESERVIERT\|--hold" specwright/workflows/core/intent.md` | — |
| `verify` | Test | Aufruf | `scripts/verify.sh:36` | `bash scripts/verify.sh --fast` zeigt `test-next-intent-id` | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. Lesende Vorprüfung: Konsumenten von `intent/`-Einträgen, die über eine Datei stolpern könnten → `grep -rn "readdir" ui/src/server/services/vorhaben*.ts` (erledigt im Plan: beide filtern, §2) und `grep -rn "next-intent-id" specwright .claude scripts` (nur Workflow `intent`, Test, verify).
1. Erste Scheibe: Test T8 (vorgemerkte Kennung in eigener Kopie zählt) schreiben, rot bestätigen; `reserved_ids` + Erweiterung `candidates()` für die eigene Kopie → T8 grün. Berührt nur eine Schicht (ein Shell-Skript), die Scheibe ist der Pfad Datei → Vergabe.
2. Verbreitern: T9 (Worktree/Ref, Kommentar zählt nicht) → Worktree- und Ref-Quelle; T10 → `--hold`; T11 → Übernahme in `--reserve`. Jeweils Test zuerst rot, dann grün.
3. Workflow, README, CHANGELOG, VERSION.
4. Verbindungen nachweisen (§5), `bash scripts/verify.sh` grün.

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Ein Skript und sein Test greifen ineinander; Umfang S.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Nahtstelle (warum diese) | Test | Datei | Art |
|---|---|---|---|---|
| AK-01 | Aufruf `next-intent-id.sh` (bestehende CLI, einzige öffentliche Schnittstelle; deckt alle AK) | T8: leeres `intent/`, `RESERVIERT` mit `INT-$Y-001 motor` → `INT-$Y-002`; T9: Vormerkung `INT-$Y-005` nur auf Remote-Zweig committet → `INT-$Y-006` | `scripts/test-next-intent-id.sh` | Integration |
| AK-02 | dieselbe CLI | T8b: Kommentarzeile `# siehe INT-$Y-009` und Bemerkung `INT-$Y-001 motor  # vgl. INT-$Y-008` → weiterhin `INT-$Y-002` | dito | Integration |
| AK-03 | `--hold` | T10: `--hold neu` → Ausgabe = nächste Kennung, Zeile in der Datei; zweiter Aufruf gleiche Ausgabe, Zeile nur einmal; danach Vergabe +1 | dito | Integration |
| AK-04 | `--reserve` | T11: `--reserve motor` → `INT-$Y-001`, Ordner `intent/INT-$Y-001-motor/intent.md`, Zeile entfernt, andere Zeilen/Kommentare bleiben, Hinweis auf stderr | dito | Integration |
| AK-05 | dieselbe CLI | T1–T7 unverändert grün | dito | Integration |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss mit `verify: OK` enden, Ausgabe im PR. CI ist die Wahrheit.
- **Angeschlossen (E2E-Pfad):** im Scratch-Repo: `--hold motor` → `next-intent-id.sh` liefert nächste → `--reserve motor` übernimmt; Protokoll im PR.
- **Bugfix:** Test zuerst, Fehlschlag bestätigt, dann Fix ohne Änderung am Test.
- **UI:** entfällt.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| Vormerkung nicht gepusht → andere Rechner sehen sie nicht | mittel | niedrig | gleiche Grenze wie Ordner; Workflow-Satz „committen" | Doppelvergabe beim Push |
| Viele Refs → mehr `git show`-Aufrufe | niedrig | niedrig | ein Prozess je Ref wie heute `ls-tree` | Laufzeit `/intent` |
| BSD/GNU-Unterschiede bei `sed`/`awk` | niedrig | mittel | nur POSIX-Ausdrücke, Test auf macOS und CI (Linux) | `verify` |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| In software-factory `INT-2026-001 motor-geruest` per `--hold` oder von Hand in `intent/RESERVIERT` eintragen, nach Update auf 4.3.1 (`update-specwright.sh` im Projekt) | Michael | nach Merge | [ ] |

### 11. Schätzung

<!-- leser: mensch -->

1–2 h. Unsicherheit: Kollisionsprüfung von `--hold` im Test.

**Kontext für den Bau:** ~40k Tokens — Plan ~8k, zu lesende Dateien ~10k, Änderungen ~8k, Prüfausgaben ~15k. Grenze ~120k: nicht erreicht.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| Datei `intent/RESERVIERT` könnte die Web-UI als Vorhaben lesen | Self | abgelehnt: beide Leser filtern auf `INTENT_DIR_RE` und Ordner (§2) | — |
| Kommentar mit Kennung würde blockieren | Self | angenommen: nur erstes Feld zählt | §3, AK-02 |
| Übernahme ohne Streichen führt zu Fehler beim zweiten `--reserve` | Self | angenommen: Zeile wird gestrichen | §3 |

**Minimalinvasiv geprüft:** bestehende Quellenschleifen, Tie-Break-Muster und Testnaht werden wiederverwendet; keine neue Datei im Lieferumfang, keine UI-Änderung.

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-10-06: ohne Befund.

### 13. Definition of Done

<!-- leser: agent -->

- [ ] Jede FA/AK aus Abschnitt 8 hat einen grünen Test.
- [ ] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [ ] E2E-Pfad läuft (Abschnitt 8).
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün (CI ist die Wahrheit).
- [ ] `docs/architecture.md` angepasst, falls Abschnitt 3 „Ja".
- [ ] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [ ] Abweichungen von diesem Plan in Abschnitt 14 eingetragen.
- [ ] 2x-Regel-Check: Fehler, der zum zweiten Mal vorkam → zuerst automatische Prüfung (Hook, Lint, Test); sonst nummerierte Regel in `docs/architecture.md` (AR/AP); `CLAUDE.md` nur, wenn nicht aus dem Code ablesbar und für jede Aufgabe gültig. Vorschlag im PR.
- [ ] Abschlussbericht nach R3 (nur Mensch-Abschnitte im Chat), endet mit dem Block „Für das Board" (Karte, Spalte, PR-Link, Stand, Verweis auf `intent/INT-JJJJ-NNN/`); Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-10-06 | verify-Stufe Vitest im ersten Lauf rot (3 Terminal-Integrationstests), einzeln 27/27 grün, zweiter voller Lauf `verify: OK` | bekannte Mac-Flakiness der Stufe 5, kein UI-Code geändert; Bezugsliste unverändert | §8 |
