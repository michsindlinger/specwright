# Plan: UI: Glocken-Liste liegt vor dem angedockten Terminal

> **Intent:** `intent.md` (INT-2026-014, Bypass) · **Spec:** entfällt (Bypass)
> **Status:** umgesetzt (PR folgt, Merge = Michael)
> **Erstellt:** 2026-09-17 im Chat (Bugfix, eine Stilzeile) · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-17 (Chat: „Bau das bitte direkt, ich gebe es frei")
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand 7da7167), `CLAUDE.md`, `docs/design.md` §4/§5
> **Branch:** `fix/INT-2026-014-glocke-ueber-terminal` von `origin/main` 7da7167, Worktree `session-sdlc-ui`. Hook `protect-tests`: Test zuerst rot, dann `.claude/fix-mode`, dann Code.

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Die Kopfzeile mit der Glocke „klebt" oben und hat dafür eine eigene Ebene mit Rang 60. Alles in der Kopfzeile — auch die aufgeklappte Glocken-Liste — kann diese Ebene nicht verlassen; die Liste hat intern Rang 200, zählt nach außen aber wie 60. Das Cloud-Terminal ist ein eigenes Element mit Rang 1000. Schwebend deckt es die Kopfzeile absichtlich ab; angedockt beginnt es erst unter der Kopfzeile, behielt aber Rang 1000 — deshalb liegt die Liste dahinter.

**Was ändert sich?** Das angedockte Terminal bekommt Rang 55: unter der Kopfzeile (60), über den festen Leisten der Seite (50). Schwebend und im Vollbild bleibt es bei 1000. Die Glocken-Liste liegt dann vor dem angedockten Terminal; sonst merkt niemand etwas.

**Wie wird das gemacht?** Eine Zeile in der Stilregel des angedockten Terminals, ein Test, der die Regel festhält, ein Blick im Browser mit Screenshot. Verworfen: Kopfzeile über das Terminal heben (verdeckt die Titelzeile des schwebenden und des Vollbild-Terminals); Liste aus der Kopfzeile herauslösen (Umbau ohne Gewinn).

**Was kann schiefgehen?** Etwas mit Rang zwischen 55 und 1000 könnte die angedockte Spalte überlagern — geprüft, siehe `intent.md` AN-01. Rückweg: eine Zeile.

**Was musst du entscheiden?** Nichts — im Chat freigegeben.

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: mensch -->

`.terminal-sidebar.docked` bekommt `z-index: 55` (unter `aos-kopfzeile` 60, über `aos-sende-leiste`/Übersichts-Leiste 50); `.terminal-sidebar` bleibt bei 1000 (schwebend, Vollbild — die Klasse `docked` fällt im Vollbild weg). Test auf den injizierten Style-Text, E2E mit `elementFromPoint`, `docs/design.md` §4 ein Satz zur Stapelordnung.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung |
|---|---|---|
| Kopfzeile | `ui/frontend/src/styles/theme.css:5798-5803` `aos-kopfzeile { position: sticky; z-index: 60 }` | `[Certain]` Stapelkontext für Glocke |
| Glocke | `theme.css:5915-5927` `.glocke-dropdown { position: absolute; z-index: 200 }`; `aos-glocke` Light-DOM in `aos-kopfzeile` (`rahmen/aos-kopfzeile.ts:49`) | `[Certain]` wirkt nach außen wie 60 |
| Terminal | `components/terminal/aos-cloud-terminal-sidebar.ts:243-251` `.terminal-sidebar { position: fixed; z-index: 1000 }`; `:263-267` `.docked { top: var(--header-height); box-shadow: none }`; `render()` `docked = isDocked && !isFullscreen` | `[Certain]` Geschwister auf `aos-app`-Ebene, 1000 > 60 |
| Weitere Stufen | Seite: `aos-sende-leiste.ts:68`, `aos-vorhaben-uebersicht.ts:141` je 50 mit `right: var(--terminal-open-width)`; Dialoge 1002/1100/9999; Datei-Seitenleiste 1000; Dropdowns 100 in der linken Spalte | `[Certain]` AN-01 |

### 3. Entwurf

<!-- leser: agent -->

`.terminal-sidebar.docked { z-index: 55; }` mit Kommentar. Keine JS-Änderung. Verworfen: `aos-kopfzeile` auf 1010 (verdeckt Titelzeile bei `top: 0`), Dropdown-Portal.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei | Art | Was |
|---|---|---|---|
| 1 | `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` | ändern | `.terminal-sidebar.docked` + `z-index: 55` |
| 2 | `ui/tests/unit/aos-cloud-terminal-docked.test.ts` | ändern | Test: Style-Text `.terminal-sidebar.docked` enthält `z-index: 55`, `.terminal-sidebar` bleibt 1000 |
| 3 | `docs/design.md` | ändern | §4 „Sitzung neben dem Dokument": Stapelordnung; Änderungsprotokoll |
| 4 | `intent/INT-2026-014-glocke-ueber-terminal/{intent,plan}.md`, `design/befund-glocke.png`, `design/ist/ist-glocke.png`, `design/e2e-protokoll.txt` | neu | Vorhaben, Befund, Nachweis |

**Nicht betroffen:** Kopfzeile, Glocke, Layout/Andocken-Logik, Handy-Pfad.

### 5. Verbindungen / Nachweise

<!-- leser: agent -->

| Von | Nach | Nachweis |
|---|---|---|
| Sidebar-Style | Kopfzeile | `grep -n "z-index" aos-cloud-terminal-sidebar.ts` zeigt 55 unter `.docked`; Test #2; E2E `elementFromPoint` |

### 6. Reihenfolge

<!-- leser: agent -->

1. Vorhaben-Ordner, Branch. 2. Test rot → `.claude/fix-mode`. 3. Stilzeile → Test grün. 4. `docs/design.md`. 5. Lint, Build, `bash scripts/verify.sh`. 6. E2E 1 728 px (Branch-Backend 3111, Vorhaben-Seite, Cmd+D, Glocke klicken, `elementFromPoint` in der Listenfläche = `.glocke-dropdown`, Screenshot); `.claude/fix-mode` weg; PR.

### 7. Zerlegung

<!-- leser: agent -->

Variante A — eine Sitzung.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK | Test | Art |
|---|---|---|
| AK-01 | Style-Text: `.terminal-sidebar.docked {…z-index: 55…}`; E2E: Terminal angedockt, Glocke offen, `document.elementFromPoint` an drei Punkten der Listenfläche liegt in `.glocke-dropdown`; Screenshot `design/ist/ist-glocke.png` | Unit + E2E |
| AK-02 | Style-Text: `.terminal-sidebar {…z-index: 1000…}` unverändert; E2E: schwebend (Liste) `elementFromPoint` an derselben Stelle liegt in der Sidebar | Unit + E2E |

### 9. Risiken

<!-- leser: mensch -->

| Risiko | W. | Wirkung | Gegenmaßnahme |
|---|---|---|---|
| Ein Element mit Stufe 55–1000 überlagert die angedockte Spalte | niedrig | niedrig | AN-01 geprüft; Stichprobe nach Deploy |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann |
|---|---|---|
| PR mergen (Auto-Deploy) | Michael | nach CI grün |
| Stichprobe am 1 728-px-Mac: Glocke bei angedocktem Terminal | Michael | nach Deploy |

### 12. Review des Plans

<!-- leser: mensch -->

Kein externer Review (eine Stilzeile). **Abgleich Mensch/Agent:** Teil 1 gegen §2–§8 gelesen am 17.09.: ohne Befund.

### 14. Abweichungen

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Abschnitt |
|---|---|---|---|
| 2026-09-17 | Kein „Vorher"-E2E-Lauf; Ausgangszustand belegt Michaels Screenshot `design/befund-glocke.png`. | Der Fix ist eine Stilzeile; ein zweiter Build nur für das Vorher-Bild lohnt nicht. | §8 |
