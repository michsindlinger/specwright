# CLAUDE.md — [Produkt]

> Stand: JJJJ-MM-TT · Firma: [RD | SBS] · Unter einer Seite halten. Wird jede Sitzung ganz gelesen.

## Projekt in drei Zeilen

[Was das Produkt ist.] [Für wen.] [Was gerade der Schwerpunkt ist.]

## Befehle

| Zweck | Befehl | Gesunde Ausgabe endet mit |
|---|---|---|
| Alles prüfen | `npm run verify` | `verify: OK` |
| Tests | `npm test` | `Tests: N passed, 0 failed` |
| Lint | `npm run lint` | `0 warnings` |
| Build | `npm run build` | `Build succeeded` |
| Lokal starten | `npm run dev` | `ready on http://localhost:3000` |

## Verzeichniskarte

- `app/` — […] · `services/` — […] · `lib/` — […]
- `intent/` — Vorhaben (`intent.md`, `spec.md`, `plan.md`, `design/`) · `docs/` — Projekt-Docs · `docs/decisions/` — ADRs

## Projekt-Docs (lesen, wenn die Aufgabe sie berührt)

- `docs/product-brief.md` — für wen, welches Problem, Domänenbegriffe
- `docs/architecture.md` — **Pflicht im Plan Mode.** Services, Datenbesitz, erlaubte Abhängigkeiten (AR-nn)
- `docs/security.md` — Datenklassen, Zugriff, Verbotsliste
- `docs/design.md` — Muster, Tokens, was „entspricht dem Mock" heißt

## Arbeitsweise

- Vorhaben laufen als `intent/INT-JJJJ-NNN-kurzname/`: `intent.md` → `spec.md` → `plan.md` → Umsetzung → PR. Vorlagen: `[Pfad zu templates/sdlc/]`.
- **Bypass:** Bugfix oder unter 1 Tag → `intent.md` (Kern) direkt zu `plan.md`.
- `plan.md` entsteht im Plan Mode und wird vor dem ersten Code committet. Eine Sitzung setzt den ganzen Plan um. Zerlegung nur laut Plan Abschnitt 7, Integration immer in der Hauptsitzung.
- Verschiebt ein Plan eine Architekturgrenze: `docs/architecture.md` in derselben PR.
- Board-Karte verweist auf den `intent/`-Ordner; Stand dort nachziehen.

## Konventionen

- [Sprache/Version, z. B. TypeScript strict, kein `any`]
- [Namensregel, z. B. Geldbeträge als `Decimal`, nie `number`]
- [Testregel, z. B. jeder Endpunkt hat einen Integrationstest]
- [Commit-Regel, z. B. Conventional Commits, deutsch]
- ADR-Pflicht bei: [Datenmodell, externe Systeme, Auth]

## Definition of Done

`verify` grün und Ausgabe im PR · jedes AK/FA hat einen Test · Verbindungen aus `plan.md` §5 nachgewiesen · E2E-Pfad läuft · bei UI: Screenshot neben Mock · `architecture.md` aktuell · Abweichungen in `plan.md` §14 · 2x-Regel geprüft.
Schlägt ein Test fehl: Code reparieren, nicht den Test.

## Fehler, die Claude hier schon zweimal gemacht hat

<!-- 2x-Regel: zweiter Vorfall → Zeile hier. Jede Zeile prüfen: müsste das ein Hook sein? -->

- […]

## Hooks aktiv (`.claude/settings.json`)

`protect-tests` (Testdateien und Baselines während Fixes gesperrt) · `no-secrets` (Commit mit Secret-Muster blockiert) · `production-gate` (Prod-Deploy nur mit `RELEASE_APPROVAL`)

## Nie

- Produktionsdaten lesen oder ändern ohne ausdrückliche Freigabe.
- Auth-Prüfungen lockern, Tests löschen, Baselines anheben, damit etwas grün wird.
- Dateien im Repo-Root anlegen außer den hier genannten.
