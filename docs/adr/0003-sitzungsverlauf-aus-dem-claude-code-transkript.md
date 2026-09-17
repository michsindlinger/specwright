# ADR-0003: Sitzungsverlauf der Web-UI aus dem Claude-Code-Transkript, nicht aus dem Bildschirm

> Status: Abgelöst durch ADR-0004 (INT-2026-011, 2026-09-17) — der Transkript-Leser und das Gespräch sind entfernt; der Hook-Kontext (Transkriptpfad) wird weiter gespeichert, aber nicht gelesen
> Datum: 2026-09-16
> Betrifft: Web-UI (`ui/src/server/services/transcript-reader.ts`, `gespraech-service.ts`, `claude-hooks.ts`, `cloud-terminal-manager.ts`), Vorhaben INT-2026-007
> Umgesetzt in: PR zu `feat/INT-2026-007-sitzung-als-gespraech` (Stufe 1)

---

## Kontext

Mit INT-2026-007 zeigt die Vorhaben-Seite die zugeordnete Claude-Sitzung als Gespräch: Michaels Eingaben, Claudes Text, Rückfragen, Plan-Vorlagen und zusammengeklappte Arbeitsblöcke, mit Absender und Uhrzeit, seit Sitzungsstart (FA-01, FA-03, FA-04). Die UI hatte bis dahin drei Sichten auf eine Sitzung, keine davon strukturiert:

- den **Terminal-Puffer** (tmux `capture-pane`, Roh-ANSI): kein Unterschied zwischen Claude-Text, Werkzeugausgabe und Eingabe; Optionen nur heuristisch (`parseNumberedOptions`); lange Beiträge scrollen aus dem Puffer,
- die **Hooks** (`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PermissionRequest`, `Stop`, `Notification`): Echtzeit, aber nur der jeweils aktuelle Zug, keine Historie, keine Arbeitsblöcke,
- den **SDK-Chat**: eine zweite Sitzungsart, nicht die Terminal-Sitzung selbst (NZ-03).

Claude Code schreibt je Sitzung eine Transkriptdatei (`~/.claude*/projects/<slug>/<session-id>.jsonl`); jeder Hook-Payload nennt sie als `transcript_path`, die UI verwarf das Feld bisher. Das Format ist nicht dokumentiert, aber über Versionen stabil in den Feldern, die hier gebraucht werden. Die Absicht nennt die Bildschirmkopie als Rückfallebene (AN-01).

Zwei Befunde aus Schritt 0 des Plans (Messung 16.09.2026, Claude Code 2.1.273, 20 Beiträge): der Transkript-Eintrag erscheint im Median 125 ms nach dem `Stop`-Hook (max. 151 ms); `last_assistant_message` im `Stop`-Hook ist in 20/20 Fällen zeichengleich mit dem Transkript-Text, auch über 4 000 Zeichen. Die Datei entsteht erst mit dem ersten Nutzer-Prompt, nicht bei `SessionStart`. Voraussetzung ist, dass die Sitzung ihre Persistenz nicht abschaltet: vom Backend ererbte Marker (`CLAUDE_CODE_CHILD_SESSION` u. a.) tun genau das, deshalb strippt `sanitizeSessionEnv` alle `CLAUDE_CODE_*`-Schlüssel außer einer Behalte-Liste und setzt `CLAUDE_CODE_FORCE_SESSION_PERSISTENCE=1`.

---

## Entscheidung

**Zwei Quellen, klare Rollen.** Echtzeit-Beiträge kommen aus den Hooks (`Stop.last_assistant_message`, `UserPromptSubmit.prompt`, Dialoge aus `PreToolUse`/`PermissionRequest`, Dialog-Ende aus `PostToolUse`). Historie, Zeitstempel, `uuid`s, Arbeitsblöcke und strukturierte Ergebnisse kommen aus dem Transkript, das ein serverseitiger Leser (`TranscriptTailer`) inkrementell verfolgt (Byte-Offset, unvollständige Endzeile zurückgehalten, `fs.watch` plus Poll, `readNow()` bei jedem Hook). Der `GespraechService` verschmilzt beides: ein Hook-Beitrag trägt „ergänzt sich", bis sein Transkript-Eintrag (Text-Gleichheit im Zeitfenster) ihn ersetzt; `uuid` gewinnt, nichts erscheint doppelt. Der Verlauf geht per WebSocket nur an Clients, die das Gespräch dieser Sitzung abonniert haben.

**Vertrag mit dem Transkriptformat.** Genutzt werden nur `type` ∈ {`user`, `assistant`}, `uuid`, `timestamp`, `isMeta`, `isSidechain`, `message.content` (String oder Blöcke `text` | `tool_use` | `tool_result`), `toolUseResult` (nur `answers`, `plan`), `version`, `cwd`, `sessionId`. Alles andere wird ignoriert — insbesondere unbekannte `type`s (Kompaktierung, künftige Einträge), `thinking`, Anhänge, `system`, `queue-operation`. Liefern die ersten 50 Zeilen keinen bekannten Eintrag, meldet das Gespräch `nur_echtzeit (Transkriptformat unbekannt, Version x)`; die Hook-Beiträge laufen weiter. Eine vollständige, aber unparsbare Zeile wird übersprungen und gezählt; über 10 % im Fenster von 200 → `nur_echtzeit (Transkript defekt)`.

**Fixtures je Claude-Code-Version.** `ui/tests/fixtures/transcript/<version>/` hält anonymisierte Sitzungen aus dem Scratch-Projekt mit synthetischem Inhalt (nie aus echten Projekten; Pfade auf `/tmp/scratch` normalisiert; Sichtprüfung vor dem Commit). Ein Versionswechsel auf dem Mac ist der Auslöser, einen neuen Fixture-Satz aufzunehmen; Parser je Versionsbereich sind vorgesehen (`parsers/<from-version>.ts`, Auswahl über `version`), solange nicht nötig gibt es einen.

**Die UI liest nur.** Kein eigener Speicher des Verlaufs (keine Kopie, keine Suche, kein Export — Spec §8, AN-S01); der Transkriptpfad kommt ausschließlich aus dem Token-geschützten Hook und wird gegen eine Allowlist geprüft (`docs/security.md` §6): reguläre Datei unter einem bekannten Config-Verzeichnis (`~/.claude`, `~/.claude-<providerId>` der konfigurierten Provider), Dateiname `<session_id>.jsonl` des Hooks, `cwd` der ersten Zeile = Arbeitsverzeichnis der Sitzung.

**Zwei Stufen der Degradation.** Transkript lesbar → voller Verlauf. Transkript fehlt, Format unbekannt oder Datei bleibt aus (Persistenz aus) → nur Hook-Beiträge ab Backend-Start, Hinweis „Historie vor … nicht verfügbar", keine Arbeitsblöcke. Dialoge und Karten sind in beiden Fällen hookgetrieben. Verlaufszustand (`ok` | `nur_echtzeit` | `nicht_verfuegbar`, je mit Ursache) und Sitzungszustand (`aktiv` | `beendet`) sind zwei Felder.

---

## Konsequenzen

- Die Vorhaben-Seite zeigt die Sitzung als Gespräch mit Uhrzeiten und Arbeitsblöcken, ohne zweite Sitzungsart und ohne Bildschirm-Parsing für den Verlauf; die Bildschirmkopie bleibt Sichtprüfung vor jedem Schreibzugriff der UI (Dialog-Cues), nicht Verlaufsquelle.
- Die UI hängt an einem undokumentierten Format. Der Vertrag oben begrenzt die Fläche; ein Bruch zeigt sich als `nur_echtzeit` mit Versionsangabe statt als leerer oder falscher Verlauf, und die Fixture-Tests je Version sind der erste Schritt der Reparatur.
- Sitzungen aus der UI laufen jetzt mit gestripptem Env; ein neuer `CLAUDE_CODE_*`-Marker fällt durch den Wächter „Persistenz aus" (10 s nach dem ersten `UserPromptSubmit` ohne Datei) sofort auf.
- Neue Datenklasse *intern* im Backend-Speicher: der Verlauf zitiert Projektinhalte; nichts davon in Logs, Verlauf nur an Abonnenten (`architecture.md` §3, `security.md` §1).

---

## Alternativen

| Alternative | Warum nicht |
|---|---|
| Verlauf aus der tmux-Bildschirmkopie rekonstruieren | Keine Struktur (Claude-Text vs. Werkzeugausgabe vs. Eingabe), Optionen nur heuristisch, lange Beiträge scrollen weg. Bleibt Rückfallebene für die Sichtprüfung. |
| Nur Hooks | Keine Historie vor Backend-Start, keine Zeitstempel je Beitrag, keine Arbeitsblöcke, keine Rekonstruktion offener Dialoge nach Neustart (FA-08). |
| Zweiter Sitzungstyp (Headless-SDK-Chat) | Das Terminal wäre keine Roh-Ansicht derselben Sitzung mehr (NZ-03, ER-09). |
| Eigene Ablage des Verlaufs in der UI | Spec §8 ausgeschlossen; das Transkript ist die Quelle, die UI liest nur (AN-S01). |

---

## Belege

- Plan `intent/INT-2026-007-sitzung-als-gespraech/plan.md` §3 „Zwei Quellen, klare Rollen", §14 (Messwerte Schritt 0).
- Tests: `ui/tests/unit/transcript-reader.test.ts` (Fixtures `ui/tests/fixtures/transcript/2.1.273/`), `gespraech-service.test.ts`, `session-env.test.ts`, `cloud-terminal-agent-event.test.ts`.
- Spec `intent/INT-2026-007-sitzung-als-gespraech/spec.md` FA-01–FA-08.
