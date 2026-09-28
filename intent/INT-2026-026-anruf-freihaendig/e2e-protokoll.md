# E2E-Protokoll INT-2026-026 — Anruf freihändig

<!-- leser: mensch -->

> Stand 2026-09-28 · Branch `feat/INT-2026-026-anruf-freihaendig` · whisper.cpp mit `ggml-large-v3-turbo-q5_0.bin` · Claude Haiku in echter Sitzung

## Aufbau

- Branch-Backend auf Port 3112 (3111 war von einem fremden Test-Backend belegt) mit eigenem Laufzeitordner, tmux an, echter `whisper-server`, Scratch-Projekt mit kurzer `CLAUDE.md`.
- Browser: Google Chrome headless über Playwright, `http://localhost:3112` (gilt als lokal), echte Mac-Stimme Anna für das Vorlesen.
- Mikrofon: `getUserMedia` im Browser durch einen Tonstrom ersetzt, der beim Öffnen einen WAV-Clip abspielt (`say -v Anna`, 16 kHz) und sonst Stille liefert. Es spricht die Mac-Stimme, nicht Michael — die Messung mit eigener Stimme bleibt offen (Plan §10).
- Kein Klick auf „Sprechen", „Fertig" oder „Senden": nach „Annehmen" läuft alles über Vorlesen, Mikrofon und Schlusswort.
- Skript `e2e-026.mjs` im Scratchpad der Build-Sitzung (nicht im Repo).

## Ergebnisse

| Szenario | Gesprochen (Clip) | Ergebnis | Befund |
|---|---|---|---|
| A · Fertig-Meldung | „Mach bitte die Tests. [2 s Pause] Und den PR. Antwort senden." | Sitzung erhält „Mach bitte die Tests und den PR", ohne Schlusswort, ohne Vorlesen davor; „Gesendet." | zwei Stücke (0 und 1); Whisper schrieb „und den PR-Antwort senden." — der Bindestrich zählt als Satzzeichen, Schlusswort erkannt |
| B · Rückfrage (AskUserQuestion, Rot/Grün/Blau) | „Die zweite. Antwort senden." | `anruf:senden { art: rueckfrage, antworten: [{ nummern: [2] }] }`, Ergebnis ok | FA-16 |
| C · Plan | „freigeben" → Nachfrage vorgelesen → „ja" | `anruf:freigeben.anfragen`, danach `anruf:senden { art: freigeben }`; Sitzung legt `hallo.txt` an | FA-14; Mikrofon öffnet nach der Nachfrage von selbst |
| D · Stille | nichts | nach 20,1 s „Keine Antwort, aufgelegt", nichts gesendet, Meldung bleibt in der Glocke | FA-09, AN-S07 |
| E · Schlusswort in der Mitte | „Die Antwort senden wir morgen. [1,5 s] Und dann noch die Doku." | nichts gesendet; erkannte Stücke „Die Antwort senden wir morgen." und „Und dann noch die Doku"; Auflegen 20 s nach dem letzten Wort (25,1 s nach dem Öffnen) | FA-06, FA-09 (Uhr ab letztem Wort) |

Ein Nebenbefund aus dem Aufbau, kein Produktfehler: Tippt man in die Sitzung, während ihre Fertig-Meldung schon klingelt, endet der angenommene Anruf mit „In der Sitzung schon beantwortet" (FA-17, wie INT-2026-025).

## Zeiten (Szenario A)

| Ereignis | Zeit ab Annehmen |
|---|---|
| Annehmen, erstes `speak()` | 0 ms |
| Vorlesen fertig (`onend`), Mikrofon offen | 1,62 s |
| Stück 0 an die Erkennung (nach 1 s Pause) | 3,98 s |
| Stück 0 erkannt | 4,51 s |
| Ende des Gesprochenen (Clip-Ende) | 7,34 s |
| Stück 1 an die Erkennung | 8,37 s |
| Stück 1 erkannt, sofort `anruf:senden`, Mikrofon zu | 8,88 s |
| `anruf:ergebnis ok` | 9,27 s |

Vom Ende des Schlussworts bis zum Senden: 1,53 s; bis zur Bestätigung der Sitzung: 1,93 s (Ziel höchstens 3 s). Erkennung je Stück 0,5 s.

## Screenshots neben dem Mock

Mock: `design/anruf-freihaendig-mock.png`. Ist-Aufnahmen unter `design/ist/`:

| Mock | Ist | Stimmt? |
|---|---|---|
| a · liest vor | `ist/a-vorlesen.png` | ja |
| b · hört zu, noch nichts gesagt | `ist/b-zuhoeren-leer.png` | ja („Senden" gesperrt, Hinweis mit 20 s) |
| c · hört zu, Diktat | `ist/c-zuhoeren-diktat.png` | ja (erstes Stück, „Wird gesendet als", Senden primär) |
| d · Rückfrage, hört zu | `ist/d-rueckfrage-zuhoeren.png` | nicht belegt: die Aufnahme kam nach dem Schlusswort und zeigt „Wird gesendet …"; Zustand durch Unit-Test `aos-anruf.test.ts` abgedeckt |
| e · Plan, hört zu | `ist/e-plan-zuhoeren.png` | ja |
| f · Plan-Nachfrage, hört zu | `ist/f-nachfrage-zuhoeren.png` | ja |
| i · Ende „Keine Antwort, aufgelegt" | `ist/i-keine-antwort.png`, `ist/g-mitte-aufgelegt.png` | ja |

## Offen: Messung mit Michaels Stimme (Plan §10)

Am Mac, Branch-Backend `cd ui && PORT=3111 npm run start:backend` im Worktree (vorher `cd ui/frontend && npm run build`), Chrome auf `http://localhost:3111`, Anrufmodus an. Je Zeile Ergebnis eintragen.

**EK-02 — 20 Antworten mit Schlusswort** (Satz sagen, am Ende „Antwort senden"; gezählt wird: kam genau der Satz ohne Schlusswort in der Sitzung an?)

1. Mach bitte noch die Tests für den Randfall mit leerem Namen.
2. Und dann den PR aufmachen.
3. Nimm das kleinere Modell.
4. Die zweite.
5. Schreib die Doku zu Ende.
6. Lass den Build laufen und sag mir das Ergebnis.
7. Nein, nicht so, nimm die alte Fassung.
8. Prüf die Logs vom Backend.
9. Mach weiter mit dem Plan.
10. Committe das bitte.
11. Die erste und die dritte.
12. Warte mit dem Merge bis morgen.
13. Zeig mir den Diff.
14. Räum die toten Klassen im CSS auf.
15. Schreib einen Test dafür.
16. Das passt so.
17. Frag den Reviewer noch mal.
18. Nimm Postgres.
19. Starte die Sitzung neu.
20. Mach eine kurze Zusammenfassung.

**EK-03 — 20 Sätze mit „senden" / „Antwort senden" in der Mitte** (erwartet: nichts gesendet; danach Kontrollfall mit Schlusswort am Ende)

1. Die Antwort senden wir morgen an den Kunden.
2. Kannst du die Mail senden, bevor du den PR machst?
3. Antwort senden und dann die Doku schreiben.
4. Bitte nicht senden, erst prüfen.
5. Wir müssen die Antwort senden, sobald der Test grün ist.
6. … weitere 15 Sätze nach demselben Muster frei formulieren.

**EK-04 — 10 Antworten mit Denkpausen von 3–5 s** (erwartet: nichts abgeschnitten, alles im Kasten, gesendet erst mit Schlusswort)

**EK-01 — 10 Zeiten Schlusswort → Eingabe in der Sitzung** (Stoppuhr oder Zeitstempel; Ziel höchstens 3 s)

**Zusätzlich:** einmal mit Tab im Hintergrund (Vorlesen endet, Mikrofon öffnet? — AN-02, R11) und einmal mit Lüfter oder leiser Musik (legt nach 20 s auf, hält nicht offen — AN-03, FA-10).

| Messung | Ziel | Ergebnis | Datum |
|---|---|---|---|
| EK-02 Schlusswort erkannt | ≥ 19 von 20 | | |
| EK-03 Fehlauslösung | 0 von 20 | | |
| EK-04 Auflegen in Pause < 5 s | 0 von 10 | | |
| EK-01 Schlusswort → Sitzung (Median von 10) | ≤ 3 s | | |
| Hintergrund-Tab | Mikrofon öffnet | | |
| Lüfter/Musik | Auflegen nach 20 s | | |
