# E2E-Protokoll INT-2026-025 — Anrufmodus

<!-- leser: mensch -->

> Stand 2026-09-27 · Branch `feat/INT-2026-025-agenten-anrufe` · Claude Code 2.1.283 · whisper.cpp 1.9.1 · Modell `ggml-large-v3-turbo-q5_0.bin`

## Aufbau

- Branch-Backend auf Port 3111 mit eigenem Laufzeitordner und tmux (`SPECWRIGHT_TMUX=on`), Scratch-Projekt mit `CLAUDE.md` („Werkzeuge erlaubt, wenn die Eingabe sie nennt"), echte Claude-Sitzung (Haiku), echter `whisper-server`.
- Browser: Google Chrome headless über Playwright, Adresse `http://localhost:3111` (gilt als lokal), echte Mac-Stimmen im Browser (`Anna`, `localService: true`).
- Mikrofon: `getUserMedia` im Browser durch einen Tonstrom aus einer WAV-Datei ersetzt, erzeugt mit `say -v Anna` (16 kHz). Es spricht also die Mac-Stimme, nicht Michael — die Messung mit eigener Stimme bleibt §10.
- Skript `e2e-025.mjs` im Scratchpad der Build-Sitzung (nicht im Repo).

## Ablauf (letzter vollständiger Lauf)

| Zeit | Schritt | Ergebnis |
|---|---|---|
| 7,9 s | Einstellungen › General › Schalter „Anrufmodus" | an; `anruf-3111.json` `{"an":true}`, `anruf-kontext-3111/an.json` angelegt, `whisper-server` auf `127.0.0.1` gestartet |
| 23,2 s | Prompt „AskUserQuestion … Rot, Grün, Blau" | klingelt 11,8 s nach dem Prompt (inkl. Antwortzeit Haiku) |
| 23,6 s | Annehmen | `speak()` nach 54 ms, erstes Wort (start-Ereignis) nach 136 ms; vorgelesen: „Frage: Welche Farbe soll der Knopf haben? Eins: Rot. Zwei: Grün. Drei: Blau. Oder eine eigene Antwort." |
| 27,5 s | Sprechen „zwei" → Fertig | erkannt „2", „Wird gesendet als: Möglichkeit 2 — Grün"; Mikrofonspur danach `ended` (FA-19) |
| 28,5 s | Senden | „✓ Gesendet"; Terminal: `User answered … → Grün` |
| 29,6 s | Fertig-Meldung annehmen | Prompt verlangte „antworte nur mit der Farbe" → „Keine Sprechfassung — hier der Anfang der Antwort. Grün" (FA-17) |
| 42,6 s | Sprechen „Danke, benutze jetzt Enter Plan Mode und plane eine Datei hallo punkt txt …" | wörtlich erkannt, „Neue Eingabe an Sitzung" |
| 45,3 s | „senden" gesprochen (Leertaste gehalten) | „✓ Gesendet" |
| 81,3 s | Plan-Meldung annehmen | Sprechfassung des Plans vorgelesen (erstes Wort nach 54 ms) |
| 88,2 s | „freigeben" gesprochen | Nachfrage mit vollem Wortlaut der Option 1 und Hinweis auf BYPASS PERMISSIONS |
| 90,8 s | „ja" gesprochen | „✓ Gesendet", Taste `1`, Sitzung legt `hallo.txt` an |
| 104,7 s | Fertig-Meldung nach der Umsetzung | Sprechfassung „Datei mit dem Wort hallo angelegt. Plan akzeptiert, ausgeführt, fertig." |
| 109,5 s | FA-24: „abc" in die Eingabezeile getippt, Anruf angenommen, gesprochen, Senden | „Nicht gesendet: In der Eingabezeile steht noch Text — im Terminal abschicken oder löschen." — keine Taste gesendet |
| 117,6 s | AK-07: Rückfrage klingelt, im Terminal mit `1` beantwortet | Kasten nach 152 ms weg |
| 151,4 s | FA-12: Glocke › „Anrufen" auf abgelehnter Fertig-Meldung | Anruf beginnt ohne Klingeln (Spec FA-12) und liest vor |

Screenshots je Zustand: `design/ist/01…13-*.png` neben `design/anruf-mock.png`.

## Messungen

- **EK-02** (Annahme → erstes Wort): `speak()` in allen Anrufen nach 28–184 ms; das start-Ereignis der Sprachausgabe kam in 6 von 8 Anrufen (zwei Läufe) nach 48–251 ms, in 2 Anrufen meldete Headless-Chrome keins. Schwelle 2 s eingehalten. [Likely] — die Messung mit hörbarem Lautsprecher gehört zu §10.
- **EK-04** (Sprechfassung ≤ 80 Wörter, Rohtext aus dem Sitzungsprotokoll): Lauf A (Haiku) 10 von 12 Antworten mit Sprechfassung, alle 3–43 Wörter; Lauf B (Haiku, gleiche Prompts) nur 1 von 11; Gegencheck Opus 5.5: 3 von 3, 11–14 Wörter, mit dem Ergebnis im Satz („Sieben mal acht ist sechsundfünfzig."). Der Hinweis kam in jeder Runde an (11× im Protokoll). Ohne Sprechfassung greift der Rückfall FA-17. In beiden Haiku-Läufen war das globale Caveman-Plugin aktiv („Drop filler"). **Nach dem Schärfen der Anweisung** (Ergebnis zuerst, Pflicht auch bei kurzen Antworten): Haiku in zwei Läufen 14 von 14 mit Sprechfassung, 7–17 Wörter, das Ergebnis im ersten Satz („Sieben mal acht ist sechsundfünfzig."), auch bei Prompts mit „antworte nur mit …".
- **Kontext-Hook** (D2, echter Befehl aus `claude-hooks-3111.json`, 100 Aufrufe über `/bin/sh`): `an.json` vorhanden: Median 4,8 ms, p95 5,8 ms, max 6,5 ms; `aus-<id>.json`: p95 6,7 ms, max 8,4 ms; nichts vorhanden: p95 3,5 ms. Schwelle p95 ≤ 20 ms / max ≤ 100 ms eingehalten.
- **Erkennung** (`npm run sprache:messen`, 10 Sätze, Stimme Anna): Median 0,26 s, WER 4,7 %.
- **FA-27**: `sprache-tmp-3111` nach allen Erkennungen leer; keine `.wav`/`.pcm`/`.webm` im Laufzeitordner oder Projekt; Backend-Log enthält nur Nachrichtentypen, keinen erkannten Text.

## Manuelle Checkliste (Plan §8)

| Punkt | Stand |
|---|---|
| Rückfrage mit 2 Fragen und Mehrfachauswahl | offen (Unit-Tests gegen Fixtures 2.1.283; nicht per Stimme durchgespielt) |
| eigene Antwort | offen (Unit-Test); im E2E nur Möglichkeit und Freitext bei „fertig" |
| Plan überarbeiten | offen (Unit-Test) |
| Plan mit laufendem Plan-Review | offen (Unit-Test) |
| im Terminal antworten, während es klingelt | ✓ 152 ms |
| Text in der Eingabezeile | ✓ nicht gesendet, Grund angezeigt |
| zwei Fenster | offen (Unit-Test) |
| Neuladen während des Anrufs | offen |
| Stille/Rauschen | offen (Unit-Test Halluzinationsliste; `no_speech_prob` wirkungslos, §14) |
| Mikrofon abziehen | offen (Unit-Test `track.onended`) |
| Backend-Neustart bei Modus an | ✓ Schalter blieb an, `whisper-server` beim Stopp beendet und beim Start neu gestartet, nichts klingelte nach |
| Sitzung von vor dem Update | offen (Rückfall FA-17 im E2E gesehen, aber aus anderem Grund) |
| Latenz Kontext-Hook p95 | ✓ 5,8 ms |

## Befunde aus dem E2E

- **Plan-Freigabe bei schmalem Terminal** (55 Spalten): Option 1 bricht um („… (no further" / „prompts) for this session"); der Sender las nur die erste Zeile und brach mit „unbekannter Wortlaut" ab. Behoben mit `planOptionVoll()` in `ui/src/server/utils/plan-dialog-state.ts`, Fixture `plan-dialog-schmal.txt`, Tests; `parsePlanDialog` unverändert.
- **Frage-Block mit Leerzeilen**: `white-space: pre-line` zeigte die Umbrüche des Templates; Klasse `anruf-frage` mit `white-space: normal`.
- **Nachfrage-Text** um die Folge von BYPASS PERMISSIONS ergänzt (wie im Mock).
- **Bereinigung entfernt Dateinamen auch mitten im Satz** („Ich lege gleich eine Datei namens an …") — so verlangt FA-15; klingt holprig.
- **Harness-Lehre**: Den vom Backend verwalteten tmux-Server nicht von außen beenden — danach wertet Claude Code Enter als Zeilenumbruch; Backend neu starten.
