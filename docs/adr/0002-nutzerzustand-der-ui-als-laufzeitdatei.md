# ADR-0002: Nutzerzustand der Web-UI liegt in einer Laufzeitdatei je Backend-Instanz

> Status: Angenommen
> Datum: 2026-09-15
> Betrifft: Web-UI (`ui/src/server/services/vorhaben-state.ts`, `ui/src/server/utils/runtime-paths.ts`), Vorhaben INT-2026-004
> Umgesetzt in: PR zu `feat/INT-2026-004-ui-s1` (Stufe 1: Doc-Entwürfe; Stufe 2: Zuordnung, Anmerkungen, Protokoll, Modellwahl)

---

## Kontext

Mit INT-2026-004 zeigt die Web-UI Vorhaben statt Stories und wird zum Antwortkanal an Review-Punkten. Dabei entsteht Zustand, der nicht aus den Projektdateien ableitbar ist und trotzdem auf jedem Gerät gleich sein muss:

- welche Claude-Sitzung zu welchem Vorhaben gehört (FA-21, FA-22),
- ungesendete Anmerkungen zu einem Dokument (FA-26),
- das Protokoll gesendeter Antworten mit „gesendet / angenommen" (FA-31, FA-32),
- die zuletzt gewählte Modellwahl je Vorhaben und Schritt (FA-40),
- ungespeicherte Entwürfe zu Projekt-Docs (FA-47).

Die Dokumente selbst bleiben die Wahrheit für Phase und Status (AR-06, Spec AN-S03: kein Marker, keine Statuszeile, die die Workflows schreiben). Anmerkungen dürfen nie in das Dokument geschrieben werden (NZ-03). Die Daten enthalten Zitate aus fremden Projekten (Kreis Lippe, Applai) und sind damit Datenklasse *intern* (`docs/security.md` §3) — das Specwright-Repo ist öffentlich.

---

## Entscheidung

**Der Nutzerzustand der UI liegt in einer versionierten JSON-Datei je Backend-Instanz: `<runtime>/vorhaben-<port>.json`** (`getVorhabenStatePath()`), neben `workspace-<port>.json`, nach demselben Muster: serialisierte, atomare Schreibvorgänge (tmp + rename, `0600`), unlesbare Datei wird beiseitegelegt statt überschrieben, der Zustand wird als Ganzes über WebSocket (`vorhaben:state`) an alle Clients gebroadcastet.

Das erweitert AR-05: nicht nur der Workspace, auch der Nutzerzustand lebt im Backend, nie in `localStorage`.

Dateiformat (Version 1): `assignments`, `drafts`, `protocol`, `lastModel`, `docDrafts`. Stufe 1 schreibt nur `docDrafts`; die übrigen Schlüssel sind Teil des Formats, damit Stufe 2 additiv bleibt. Prune-Regel für das Protokoll: Einträge älter als 30 Tage **und** Vorhaben nicht mehr in der Liste.

---

## Konsequenzen

- Mac und Handy (über Tailscale gegen dasselbe Backend) sehen dieselben Entwürfe, Zuordnungen und Protokolle; ein Neustart der UI (Auto-Deploy bei jedem Merge auf `main`) verliert nichts.
- Die Datei ist gitignored (`ui/runtime/` bzw. `SPECWRIGHT_RUNTIME_DIR`) und liegt nie im Projekt-Repo — Projektdateien bleiben unverändert (NZ-03, NZ-07).
- Grenzen: kein Mehrbenutzerbetrieb (ein Nutzer je Backend), kein Abgleich zwischen zwei Backends (lokal und Cloud-Host haben getrennte Dateien). Beides ist heute nicht gefordert (Nutzer ist Michael allein, `docs/product-brief.md`).
- Prompt-Text aus dem `UserPromptSubmit`-Hook (Stufe 2) wird nur server-intern verglichen und **nicht** in diese Datei geschrieben.

---

## Alternativen

| Alternative | Warum nicht |
|---|---|
| Zustand im Projekt-Repo (z. B. `intent/INT-…/.ui-state.json`) | Datenklasse: Anmerkungen zitieren Projektinhalte, das Specwright-Repo ist öffentlich; außerdem Rauschen in `git status` jedes Projekts (NZ-03). |
| `localStorage` im Browser (wie der Notizblock) | Gerätelokal — Handy und Mac hätten verschiedene Entwürfe (FA-26, AR-05). |
| SQLite (wie der Memory-Store des Kanban-MCP) | Neue Abhängigkeit für wenige Kilobyte Zustand; das JSON-Muster des Workspace-Stores ist vorhanden und getestet. |
| Marker-Datei, die die Workflows an Review-Punkten schreiben | Framework-Änderung nur für die UI (AR-06), Spec AN-S03. |

---

## Belege

- Muster: `ui/src/server/services/workspace-state.ts`, `ui/src/server/services/cloud-session-registry.ts` (atomarer Write).
- Umsetzung: `ui/src/server/services/vorhaben-state.ts`, Test `ui/tests/unit/vorhaben-state.test.ts` (Laden, Backup bei Unlesbarkeit, `0600`, atomar).
- Pfad: `ui/src/server/utils/runtime-paths.ts` → `getVorhabenStatePath()`.
- Spec: `intent/INT-2026-004-ui-vorhaben-sicht/spec.md` §5 (Daten, fachlich), Plan §3 „Architektur-Auswirkung".

---

## Erweiterungen

Optionale Felder, die spätere Vorhaben der Datei hinzugefügt haben. Das Format bleibt `version: 1`; jedes Feld ist beim Laden optional, ältere Dateien laden unverändert. Neue Textfelder aus Nutzereingaben brauchen weiterhin ein eigenes ADR (`architecture.md` §3).

| Datum | Vorhaben | Feld | Beleg |
|---|---|---|---|
| 2026-09-18 | INT-2026-019 | Zuordnung: `provider`, `claudeSessionId` (UUID-geprüft, nur `--resume`-Argument und Dateiname der Existenzprüfung), `resumed` (Wiederaufnahme-Marke) | PR #77 |
| 2026-09-19 | INT-2026-022 | anhängige Absicht-Sitzung: `arbeitstitel` (≤ 80 Zeichen, beim Start einmal gebildet — die einzige Ausnahme der Flag-Regel) | PR #87 |
| 2026-09-22 | INT-2026-024 | `abschluesse` je Vorhaben: Marke „Abschluss angestoßen" (PR-Nummer, PR-Link, Zweig, Zeitpunkt) und letzter Fehlgrund; verfällt beim Scan, sobald der Hauptcheckout `umgesetzt` trägt, durch „Abschluss zurücknehmen" oder mit dem Ordner (`prune`); „läuft" nur im Speicher | PR offen |
