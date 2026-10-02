# E2E-Protokoll INT-2026-030 — Eingang von außen

> **Lauf:** 2026-10-02, 09:37–09:48 · Claude Code 2.1.287 · macOS · Branch `feat/INT-2026-030-sitzung-von-aussen`

## Aufbau

- Branch-Backend auf Port 3111 (`PORT=3111 HOST=127.0.0.1`), eigener Laufzeitordner (`SPECWRIGHT_RUNTIME_DIR` im Scratchpad), tmux an. Michaels Backend auf 3001 blieb unberührt.
- Zwei Scratch-Git-Projekte im Scratchpad: `Scratch030` (nur in den Recents) und `Anderes` (offen).
- Werkzeuge: `eingang-e2e.sh` (curl, Kontrollfälle und Messung), `ws-op.mjs` (Arbeitsbereich und Schließen über WebSocket), ein Playwright-Skript mit zwei Browser-Kontexten (nicht im Repo, Aufbau unten).

## 1. Schalter aus (AK-12, FA-19)

Backend ohne `SPECWRIGHT_EINGANG`: `POST` mit beliebigem Geheimnis → `403 {"fehler":"nicht berechtigt"}`. Im Laufzeitordner entstand keine Token-Datei. Protokollzeile `start 403` ohne Satz.

## 2. Schalter an

Neustart mit `SPECWRIGHT_EINGANG=on`: Startlog `[Eingang] an — neues Geheimnis in <runtime>/eingang-3111.token`, Datei `-rw-------` (64 Hex + Zeilenende).

## 3. Projekt aus den Recents, Vertrauensdialog (D5, D12, F4)

`POST {"projekt": <Scratch030>, "satz": "Vertrauensprobe: antworte nur mit OK"}` → `201 {"zustand":"startet","sessionId":"cloud-…-1","projekt":"Scratch030"}`. `Scratch030` stand danach unter den offenen Projekten, der Tab hieß „Vertrauensprobe: antworte nur mit OK". Das Projekt war in Claude Code noch nie vertraut; die Sitzung blieb am Dialog „Quick safety check … ❯ No, exit / Yes, I trust this folder" stehen. Nach 61 s: `{"zustand":"fehler","grund":"Vertrauensdialog offen — Projekt einmal in Claude bestätigen"}`. Der Eingang hat nichts getippt. Sitzung geschlossen → Arbeitskopie und Zweig `session/…` entfernt (FA-22).

Danach beide Scratch-Hauptordner einmal in Claude Code bestätigt (Pfeil runter, Enter).

## 4. Zwei Browser, Fokus (AK-05, FA-08 bis FA-10, AN-S10)

Zwei Browser-Kontexte (1440 × 900) auf der UI, beide mit `Anderes` aktiv und offener Terminal-Spalte (Cmd+D), darin eine UI-Shell-Sitzung „Terminal 1" als aktiver Tab. In Fenster 1 ein fokussiertes Eingabefeld mit getipptem Text.

`POST {"projekt": <Anderes>, "satz": "Browser-Probe: antworte nur mit OK", "titel": "Von außen"}`:

| Prüfung | Fenster 1 | Fenster 2 |
|---|---|---|
| Tab „Von außen" erschienen | ja (nach 161 ms) | ja |
| neuer Tab aktiv | nein | nein |
| aktiver Tab unverändert („Terminal 1") | ja | ja |
| aktives Projekt unverändert | ja | ja |
| Fokus unverändert (Eingabefeld bzw. Body) | ja | ja |

Zustand `aktiv` nach 1,7 s. Screenshot: `screenshot-tab-von-aussen.png` (Terminal vor der Aufnahme geleert, damit kein Pfad sichtbar ist).

## 5. Kontrollfälle (EK-03) und Messung (EK-01, EK-02)

Ausgabe von `eingang-e2e.sh <Scratch030> <token-datei> 20`: `e2e-lauf.txt`.

- **EK-03:** ohne Geheimnis, falsches Geheimnis, `x-forwarded-for`, `x-forwarded-host`, `tailscale-user-login`, `cf-connecting-ip`, fremder `Host`, `Origin` → 8 von 8 mit 403, kein Start. Der Weg über die echte Tailscale-URL wurde nicht gefahren (Branch-Backend hängt nicht am Tailnet); `tailscale serve` setzt genau die geprüften Header und einen fremden `Host`.
- **EK-01:** 20 von 20 Anfragen erreichten `aktiv` (Ziel ≥ 95 %).
- **EK-02:** Median bis `aktiv` 2,25 s, Spanne 1,6–4,0 s (Ziel ≤ 15 s).
- Zwischen den Starts 13 s Pause, jede Sitzung nach der Messung über `cloud-terminal:close` geschlossen.

## 6. Nachkontrolle

- `git worktree list` in beiden Scratch-Projekten: nur der Hauptordner; keine Zweige `session/*` übrig.
- Eingangsprotokoll: 182 Zeilen — `start 403` 9, `start 201` 24, `status 200` 149; keine 403-Zeile mit Satz, jede 201-Zeile mit Satz und Sitzungs-ID; Datei `0600`.
- Zustandsdatei `0600`, enthält keinen Satz (nur Hashes); das Backend-Log enthält keinen Satz.
- Branch-Backend, tmux-Server von 3111 und Claude-Prozesse beendet, Port 3111 frei.

## Aufbau des Browser-Skripts (nicht im Repo)

Playwright (globale Installation, `channel: 'chrome'`, headless), zwei `newContext`, `goto` auf die UI, Shell-Sitzung über `ws-op.mjs shell`, `keyboard.press('Meta+d')`, Eingabefeld per `evaluate` angelegt und fokussiert, Tabs, aktives Projekt und tiefster `activeElement` per Shadow-DOM-Durchlauf vor und nach dem `POST` gelesen, Zustand per `GET` bis nicht mehr `startet`.
