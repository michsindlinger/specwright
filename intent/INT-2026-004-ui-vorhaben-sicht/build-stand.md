# Bau-Stand INT-2026-004

> Stufe 1 fertig (PR #44, gemergt 15.09.) · Stufe 2 fertig (Branch `feat/INT-2026-004-ui-s2`, PR 2) · nächste: **Stufe 3 ab Schritt 0** (Konsumentenliste, Abbau)
> Fortsetzen: `/build INT-2026-004` in einer neuen Sitzung nach dem Merge von PR 2, Branch `feat/INT-2026-004-ui-s3` von `main`.

## Erledigt

- **Stufe 1** (Plan §6, Schritte 0–14): Vorhaben-Dienst, Reader, Wächter, Zustandsdatei, Projekt-Docs, Routen, Übersicht, Leser, Vorhaben-Seite, Projekt-Seite, Mobile-Shell, `architecture.md` §3/AR-05, ADR-0002.
- **Stufe 2** (Plan §6, Schritte 0–12): Spike AN-03 bestanden (PTY-Weg), Registry-Status persistiert, `reportPromptText`, Zustandsdatei vollständig (assignments, drafts, protocol, lastModel, pendingIntents), Zuordnung (Knopf, Handeingabe, `/intent` + `dir-added`), Senden als Bracketed Paste + Enter mit Bestätigung/10-s-Timer, Gate `review-send-pending`, Schritt-Standards (`stepDefaults`, WS `settings.step-defaults.update`, Settings-Block), Anker/Randmarken/Tipp-Leiste/Editor, Sammelansicht, Sende-Leiste, Protokoll, nächster Schritt mit Modellwahl und Ziel, `app.ts` springt ins Terminal, `architecture.md` §2/§5. E2E (Scratch-Projekt mit Stellvertreter-Befehlen) und Neustart-Test in §14; Screenshots `design/ist-stufe2/`.
- Letzter prüfbarer Zustand: `bash scripts/verify.sh` → `verify: OK` (Ausgabe in PR 2).

## Offen

- Stufe 3 (Plan §6): Schritte 0–7 — Konsumentenliste, Backend beschneiden/löschen, Frontend-Abbau, Routen-Alias, Tests entfernen, Rahmen-Stichprobe FA-38, Docs §1/§2/§3/AR-03/§10 + `design.md`/`product-brief.md`/`security.md`, Bezugsliste nach grünem CI kürzen, `plan.md` auf `umgesetzt · PR #nn`.
- Manuelle Schritte §10: Handy-Stichprobe PR 2 (Michael, Tailscale), Merge PR 2, Prüfung Host-Skript (nur HTTP-Status), optional Standardmodelle je Schritt setzen.
- Entscheidung PO aus §14: FA-12 bei „wartet ohne Review-Dokument" den nächsten Schritt anbieten?
