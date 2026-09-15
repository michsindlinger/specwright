# Bau-Stand INT-2026-004

> Stufe 1 fertig (Branch `feat/INT-2026-004-ui-s1`, PR folgt) · nächste: **Stufe 2 ab Schritt 0** (Spike AN-03: Bracketed Paste + `prompt`-Feld)
> Fortsetzen: `/build INT-2026-004` in einer neuen Sitzung nach dem Merge von PR 1, Branch `feat/INT-2026-004-ui-s2` von `main`.

## Erledigt (Stufe 1, Plan §6)

- Schritte 0–14: Protokolltypen, `project-dirs`/`runtime-paths`, Reader (31 Tests), Wächter (5), Zustandsdatei (4), Projekt-Docs-Dienst (6), Service + Handler (7), `websocket.ts` verdrahtet (V-01), Routen `vorhaben`/`projekt` (Startroute `vorhaben`), `aos-vorhaben-view` mit Mobile-Shell, `mermaid-render.ts` extrahiert, `codeRenderer` exportiert, Leser (eigene `Marked`-Instanz, Kopffelder-Tabelle, Mermaid, Bilder, Reload-Hinweis mit Leseposition), Übersicht/Zeile/Sortierung, Vorhaben-Seite (ohne Sende-Leiste), Bottom-Nav-Zähler, Drawer-Einträge, Projekt-Seite + Doc-Editor (Konflikt, Entwurf), Messung FA-07, `architecture.md` §3/AR-05, ADR-0002, Verify OK.
- Letzter prüfbarer Zustand: `bash scripts/verify.sh` → `verify: OK`; 25 neue Tests grün; E2E am Branch-Backend 3111 (Übersicht, Leser, Projekt-Docs speichern/Konflikt) mit Screenshots unter `design/ist-stufe1/`.

## Offen

- Stufe 2 (Plan §6): Schritte 0–12 — Spike, Registry-Felder, `reportPromptText`, Zustandsdatei vollständig, Senden/Zuordnung/Gate, Modell-Standards, Anker/Anmerkungen/Sende-Leiste/Freigabe, nächster Schritt + `app.ts`-Handler, Settings-Block, E2E, Neustart-Test, Docs §2/§5.
- Stufe 3 (Plan §6): Abbau.
- Manuelle Schritte §10: Handy-Stichprobe PR 1 (Michael), Merge PR 1.
- Stufe-1-Nachweise stehen in §14; Stufe-2-Abweichungen dort fortschreiben.
