# E2E-Protokoll INT-2026-027 — Leitung bleibt nach dem Senden offen

<!-- leser: mensch -->

> Stand 2026-09-28 · Branch `feat/INT-2026-027-anruf-leitung-offen` · whisper.cpp mit `ggml-large-v3-turbo-q5_0.bin` · Claude Haiku in zwei echten Sitzungen

## Aufbau

- Branch-Backend auf Port 3112 mit eigenem Laufzeitordner im Scratchpad, tmux an, echter `whisper-server`. Das Live-Backend auf Port 3001 blieb unberührt.
- Zwei Scratch-Projekte, je eine Haiku-Sitzung im Hauptverzeichnis: „bestellung" (A) und „rechnung" (B). Sitzungen, Eingaben und der Anrufmodus-Schalter über einen WebSocket-Client; Trust-Dialog mit Pfeil runter, dann Enter.
- Browser: Google Chrome headless über Playwright, `http://localhost:3112`, echte Mac-Stimme Anna für das Vorlesen.
- Mikrofon: `getUserMedia` im Browser durch einen Tonstrom ersetzt, der je Öffnen den nächsten Clip aus einer Liste abspielt (`say -v Anna`, 16 kHz) und sonst Stille liefert. Es spricht die Mac-Stimme, nicht Michael.
- Töne: jeder Oszillator im Browser wird mit Zeit gezählt. Klingelton = 3 Noten, Hinweiston = 1 Note.
- Skripte `e2e-027.mjs` und `e2e-027b.mjs` im Scratchpad der Build-Sitzung (nicht im Repo).

## Lauf 1 — zwei Runden, andere Sitzung wartet, Auflegen per Knopf

Zeiten in Sekunden ab Skriptstart (Kasten) bzw. Seitenzeit (Töne, Sprache).

| Zeit | Ereignis | AK |
|---|---|---|
| 55,75 | A klingelt („Fertig · bestellung"), 3 Noten Klingelton; „Annehmen" | — |
| 60,40 | Mikrofon öffnet nach dem Vorlesen, Clip „Sag bitte zwei. Antwort senden." | — |
| 65,29 | Kasten „Leitung offen — wartet auf „bestellung" …", „✓ Gesendet", „Mikrofon aus", nur „Auflegen" (Bild `design/ist/leitung-offen.png`) | AK-01 |
| 65,79 | B bekommt „Sag nur Hallo."; B meldet sich um 70,09 als fertig | — |
| 66,92 | A meldet sich zurück: **eine** Note, kein Klingeln, keine Phase „klingelt" | AK-03, AK-11 |
| 67,32 | Vorlesen der neuen Meldung, 0,40 s nach der Note | AK-03, AK-11 |
| 72,71 | Mikrofon öffnet nach dem Vorlesen, Clip „Danke. Antwort senden." | AK-03 |
| 77,03 | zweite Runde: Leitung wieder offen, „noch 1 wartet" (B) — B hat während beider Runden nicht geklingelt (Bild `design/ist/leitung-offen-runde2.png`) | AK-05, AK-09 |
| 77,10 | Knopf „Auflegen" | — |
| 77,20 | B klingelt (3 Noten); zwischen Auflegen und Klingeln keine Ansage | AK-07, AK-10 |
| 85,36 | B beantwortet (Clip „Los. Antwort senden."), Leitung offen für „rechnung", „noch 1 wartet" (A hatte auf „Danke" geantwortet) | AK-05 |
| 93,12 / 93,52 | B meldet sich nach 8 s zurück: eine Note, 0,40 s später Vorlesen | AK-03, AK-11 |

Mikrofon: dreimal geöffnet, jeweils nach dem Vorlesen einer Meldung; in keiner der drei offenen Leitungen (AK-02).

Die geplante Frist-Probe in Lauf 1 kam nicht zustande: B sollte auf „Los" zweimal `sleep 100` ausführen, Haiku lehnte ab („System erlaubt keine reinen Warte-Befehle") und meldete sich nach 8 s zurück. Dafür Lauf 2.

## Lauf 2 — Frist läuft ab

Damit die Sitzung sich nicht binnen 2 Minuten meldet, bekam A direkt nach „Gesendet" ein Escape. Claude Code bricht die Antwort ab und ruft dabei keinen Stop-Hook auf; es entsteht keine neue Meldung. Für die Leitung ist das derselbe Fall wie eine Sitzung, die länger als 2 Minuten arbeitet.

| Zeit | Ereignis | AK |
|---|---|---|
| 15,68 | A klingelt, „Annehmen"; Clip „Schreib mir ein Gedicht mit zehn Strophen über Wolken. Antwort senden." | — |
| 27,13 | Leitung offen für „bestellung" | AK-01 |
| 27,43 | Escape an A (Antwort abgebrochen, kein Stop-Ereignis im Log) | — |
| 30,19 | B meldet sich als fertig → „noch 1 wartet", kein Klingeln | AK-05 |
| 147,10 | Leitung zu, **119,97 s** nach „Leitung offen"; Ansage „Leitung geschlossen."; B klingelt (Bild `design/ist/klingelt-nach-frist.png`) | AK-06, AK-07, AK-10 |

Mikrofon in Lauf 2: einmal geöffnet (Antwort an A), während der 2 Minuten offener Leitung nicht (AK-02).

## Befunde

| Befund | Beleg | Einordnung |
|---|---|---|
| Bei Fristende laufen die Ansage „Leitung geschlossen." und der Klingelton der wartenden Sitzung gleichzeitig an (beide 146,36 s Seitenzeit) | Lauf 2, Ton- und Sprachlog | wie heute bei jedem Anrufende mit Ansage und wartender Meldung (z. B. „In der Sitzung schon beantwortet."); kein neues Verhalten, bei Störung eigene Karte |
| Eine Folgemeldung kam in 2,1 s bzw. 8,2 s nach „Gesendet"; das „Gesendet." der UI war da schon fertig gesprochen | Lauf 1 | R5 (abgeschnittenes „Gesendet") trat nicht auf |
| Haiku lehnt reine Warte-Befehle (`sleep`) ab | Lauf 1, Antwort von B | Harness-Befund, kein Produktfehler |

## Nicht abgedeckt

- AK-04 (Meldung derselben Sitzung trifft ein, bevor „Gesendet" bestätigt ist) — im E2E nicht erzwingbar, weil die Bestätigung nach 0,4 s kommt und Haiku länger braucht. Abgedeckt durch `anruf-service.test.ts` („AK-04: Meldung derselben Sitzung während des Sendens …") und `anruf-frontend-service.test.ts` („AK-04: new message right after sending …").
- AK-08 (Fenster geschlossen, Anrufmodus aus in offener Leitung) — Unit- und Service-Tests.
- Messung mit Michaels eigener Stimme — manueller Schritt laut Plan §10.
