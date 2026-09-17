# Plan: UI: Projektname im Kopf der Vorhaben-Seite

> **Intent:** `intent.md` (INT-2026-017) · **Spec:** entfällt (bypass: Größe S, eine Anzeige-Zeile in einer Frontend-Komponente, Daten liegen schon in der Zeile)
> **Status:** in_umsetzung
> **Erstellt:** 2026-09-17 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger) — im Chat „freigabe", 2026-09-17
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand 960c22e), `CLAUDE.md`, `docs/security.md`

<!-- Der Plan ist TECHNISCH und die EINHEIT DER AUSFÜHRUNG. Eine Sitzung setzt ihn ganz um.
     Maßstab: Ein neues Teammitglied könnte allein anhand dieses Dokuments umsetzen.
     Jede Änderung verweist auf ein AK (intent.md). Keine Änderung ohne Herkunft.
     Zwei Leser: „In einfachen Worten" liest die Person, die freigibt; „Details" liest der Agent, der baut. Die erste Zeile unter jeder
     Überschrift sagt, für wen der Abschnitt ist (R1, specwright/workflows/meta/leser-und-rueckfragen.md). Marker übernehmen, keinen entfernen. -->

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Wenn du eine Vorhaben-Seite öffnest — aus der Liste, über die Glocke oder über einen Link —, steht oben die Kennung (etwa `INT-2026-017`) und der Titel, darunter Zustand, Sitzung und Arbeitskopie. Was fehlt: zu welchem Projekt das Vorhaben gehört. Seit mehrere Projekte nebeneinander laufen (Applai, Kreis Lippe, Specwright) und die Glocke direkt auf Vorhaben-Seiten führt, musst du zurück zur Liste oder in den Pfad im Terminal schauen, um das Projekt zu erkennen. Die Nachbarseiten machen es besser: „Neue Absicht" nennt das Projekt als graue Zeile, die Projekt-Seite als Überschrift, die Liste in jeder Zeile.

**Was ändert sich?** Auf jeder Vorhaben-Seite steht künftig der Projektname als kleine graue Zeile direkt über der Kennung — so wie in der Liste, wo über jeder Kennung der Projektname steht. Das gilt für jedes Dokument der Seite (intent, spec, plan, build, design) und auch dann, wenn die Phase noch kein Dokument hat. Am Handy steht die Zeile an derselben Stelle. Alles andere bleibt: die Kopfzeile der App sagt weiter „Vorhaben", der Name ist reiner Text, kein Link, und Liste, „Neue Absicht" und Projekt-Seite werden nicht angefasst.

**Wie wird das gemacht?** Der Projektname ist der Seite schon bekannt — er kommt mit jeder Vorhaben-Zeile aus dem Backend und wird heute nur im Bestätigungsdialog von „Freigeben" gezeigt. Die Seite muss ihn also nur noch an einer weiteren Stelle hinschreiben: eine Zeile im Kopf, vor der Kennung. Dazu kommt eine kleine Gestaltungsregel (grau, klein), die genau die Werte übernimmt, die die Liste für ihren Projektnamen benutzt. Wichtig dabei: Die Vorhaben-Seite hat einen eigenen abgeschotteten Stil-Bereich, den das allgemeine Stylesheet der App nicht erreicht — die Regel kommt deshalb in die Komponente selbst, nicht ins zentrale Stylesheet (der Fehler ist hier dreimal passiert und steht in `CLAUDE.md`). Weil die Seite ihre Daten aus der Zeile liest, wechselt der Name automatisch mit, wenn du über die Glocke oder einen Kennungs-Link zu einem Vorhaben eines anderen Projekts springst. Der bestehende Test der Seite bekommt drei neue Prüfungen: Name steht über der Kennung; Name bleibt bei jedem Dokument und ohne Dokument; Name wechselt mit der Zeile, auch wenn zwei Projekte dieselbe Kennung führen. Für das Handy gibt es keinen Test, sondern zwei Bildschirmfotos (Mac und Handy) aus dem Scratch-Projekt, die neben das heutige Bild `intent/INT-2026-016-status-und-glocke/design/ist-pr2/c2-tab-geklickt-gebunden.png` gelegt werden. Zusätzlich bekommt das Design-Dokument `docs/design.md` eine Zeile, die festhält: Seiten, die zu einem Projekt gehören, nennen es im Kopf — der Rahmen bleibt neutral.

**Was kann schiefgehen?** Wenig. Der Kopf wird um eine Zeile höher (rund 18 Pixel); die Phasen-Chips rechts daneben sitzen unten bündig und rücken deshalb nicht sichtbar — das prüft das Bildschirmfoto neben dem heutigen Bild. Bricht etwas, ist es sofort auf der Seite sichtbar (du merkst es beim ersten Öffnen), und der Rückweg ist ein einziger Commit. Ein Stolperstein liegt in der Arbeitskopie, nicht im Code: Der Ordner hat noch keine installierten Abhängigkeiten; ohne die zwei Installationsschritte vorab meldet die Prüfung Phantom-Fehler (steht in `CLAUDE.md` und im Gedächtnis). Sehr lange Projektnamen brechen in eine zweite Zeile um statt abgeschnitten zu werden — bei „Applai", „Kreis Lippe", „Specwright" kein Thema.

**Was musst du entscheiden?** Nichts, Freigabe reicht. Einzige Kleinigkeit zur Kenntnis: Die Zeile steht **über** der Kennung (wie in der Liste), während „Neue Absicht" das Projekt **unter** der Überschrift nennt — so hast du es am 17.09. in AK-01 festgelegt.

## Details

<!-- leser: mensch -->

<!-- Volle technische Tiefe: Dateien, Funktionen, Datenmodell, Tradeoffs, Testplan. Geht an Reviewer und in die Bausitzung, muss für sich stehen.
     Confidence-Tags in beiden Teilen: [Certain] harte Belege · [Likely] starke Inferenz · [Uncertain] Vermutung. -->

### 1. Kurzfassung

<!-- leser: mensch -->

Die Komponente `aos-vorhaben-seite` rendert in `.kopf-text` vor `.kennung` eine Zeile `<div class="projekt">${r.projectName}</div>` und bekommt dafür zwei CSS-Regeln in ihren `static styles` (Werte wie `.projekt` in `aos-vorhaben-zeile`). Kein Backend, kein Zustand, keine neue Komponente: `row.projectName` ist seit `vorhaben-reader.ts:492` in jeder Zeile [Certain]. Drei Testfälle im bestehenden Chips-Test decken AK-01 bis AK-03, zwei Screenshots (1440 px, 390 px) aus dem Scratch-Projekt decken AK-04 und AN-02; `docs/design.md` §4 bekommt eine Musterzeile.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Kopf der Vorhaben-Seite | `ui/frontend/src/components/vorhaben/aos-vorhaben-seite.ts:626-633` — `.kopf` > `.kopf-text` (`.kennung`, `h1`) + `renderChips()` | muss geändert werden: eine Zeile vor `.kennung` [Certain] |
| Stil-Bereich der Seite | `aos-vorhaben-seite.ts:133` `static override styles = css\`…\`` — Shadow-Root, keine `createRenderRoot`-Überschreibung | Regel `.projekt` gehört hierhin (RB-01); `theme.css` erreicht die Kinder nicht [Certain] |
| Stil von `.kennung`, `h1`, `.kopf-text` | `aos-vorhaben-seite.ts:147-168` — `.kopf` `align-items: flex-end`, `flex-wrap: wrap`; `.kopf-text` `flex: 1 1 320px`; `.kennung` mono, `--font-size-lg`, Akzentfarbe; `h1` `margin: 2px 0 0` | Chips sitzen unten bündig (`flex-end`) → eine Zeile mehr oben verschiebt sie nicht relativ zur Titelzeile (AN-02) [Likely] |
| Mobil-Variante des Kopfs | `aos-vorhaben-seite.ts:379-381` `:host([mobile]) .kopf { align-items: flex-start; }` | gleiches DOM am Handy, nur Ausrichtung — AK-04 folgt aus demselben Template [Certain] |
| Projektname in der Zeile | `ui/src/shared/types/vorhaben.protocol.ts:104` `projectName: string`; gesetzt in `ui/src/server/services/vorhaben-reader.ts:492` `projectName: project.name` | Daten vorhanden, kein Nachladen (AN-01) [Certain] |
| Heutiger einziger Leser auf der Seite | `aos-vorhaben-seite.ts:746` `${r.projectName}` im Freigabe-Dialog (`.ziel`, nur mit Live-Sitzung) | bleibt unverändert; zweite Verwendung kommt dazu [Certain] |
| Muster „grauer Projektname" | `aos-vorhaben-zeile.ts:51-57` `.projekt { color: var(--color-text-secondary); font-size: var(--font-size-sm); … nowrap/ellipsis }`; `theme.css:6300` `.neue-absicht .sub` und `theme.css:6078` `aos-projekt-seite .sub` (gleiche Farbe/Größe, `margin-bottom`) | Werte werden übernommen (Farbe, Größe); `nowrap`/`ellipsis` nicht (Kopf hat Platz, Umbruch ist ehrlicher als Abschneiden) [Certain] |
| Wirt der Seite | `ui/frontend/src/views/aos-vorhaben-view.ts:356-367` `.row=${row}` aus `currentRow()`; Lit rendert bei jeder neuen `row`-Referenz neu | AK-03 (Wechsel Glocke/Link) ist ein Property-Wechsel; `willUpdate` (`:386-394`) setzt nur Leser-Zustand zurück, wenn `intentId` wechselt — der Kopf liest `this.row` in jedem Render, also stimmt der Name auch bei gleicher Kennung in zwei Projekten [Certain] |
| App-Kopfzeile | `ui/frontend/src/app.ts:639-647` `getPageTitle()` fest „Vorhaben" | nicht betroffen (NZ-01) [Certain] |
| Tests der Seite | `ui/tests/unit/aos-vorhaben-seite-chips.test.ts` (happy-dom, Helfer `row()`, `seite()`, `settle()`; Zeile 76 Kommentar „no project name in the head" — nur Kommentar, keine Assertion), `aos-vorhaben-seite-grund.test.ts` (reine Funktionen) | Chips-Test wird erweitert; Kommentar angepasst [Certain] |
| Andere Konsumenten der Selektoren `.kopf-text`, `.kennung`, `.projekt` | `grep -rn 'kopf-text\|\.kennung\b' ui/frontend/src ui/tests` → nur `aos-terminal.ts` (`.kennung-tip*`), `aos-dokument-leser.ts` (`.kennung-hit`), keine Treffer außerhalb der Komponente auf den Kopf | kein Bruch möglich [Certain] |
| E2E-Rezept Screenshots | Memory `reference_cloud_terminal_e2e_playwright.md` (Addendum INT-2026-010 Stufe 3: keine Sitzung nötig, `page.goto('#/vorhaben/<enc realpath>/<intent>')`); Scratch `/private/tmp/scratch-int010` mit `intent/INT-2026-001-rahmen-e2e` vorhanden; globales Playwright `~/.nvm/versions/node/v22.12.0/lib/node_modules/playwright/index.mjs` vorhanden | wiederverwendbar; Branch-Backend auf 3111 mit `SPECWRIGHT_TMUX=off` reicht [Certain] |
| Arbeitskopie | Worktree `session-ui-opt` (Branch `session/ui-opt` = `origin/main` + Intent-Commit `796b7a6`); `ui/node_modules` und `ui/frontend/node_modules` fehlen | Schritt 0: `npm ci` in beiden + `chmod +x` node-pty spawn-helper (CLAUDE.md, Memory `project_ui_test_baseline_worktree.md`) [Certain] |
| Design-Doku | `docs/design.md` §4 Muster-Tabelle (`:34-45`), Änderungsprotokoll `:75-76` | eine Zeile „Seite eines Projekts nennt das Projekt im Kopf" [Certain] |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

In `aos-vorhaben-seite.ts`:

1. `static styles`: nach `.kopf-text { … }` (Zeile 154) eine Regel
   ```css
   .projekt {
     color: var(--color-text-secondary);
     font-size: var(--font-size-sm);
   }
   ```
   Werte identisch mit `aos-vorhaben-zeile.ts:51-53` und `.neue-absicht .sub` (`theme.css:6300`). Kein `nowrap`, kein `margin` (die `.kennung` folgt direkt; `h1` hat bereits `margin-top: 2px`).
2. `render()`: in `.kopf-text` als erstes Kind `<div class="projekt">${r.projectName}</div>` (vor `.kennung`, Zeile 629). Keine Bedingung: `projectName` ist im Typ Pflicht und im Reader immer gesetzt.
3. Kopf-Kommentar der Datei (Zeile 2-3): „head with project name, id, title …".

Kein neuer Zustand, kein neues Event, keine Änderung an `willUpdate`. AK-03 ist durch Lits Property-Rendering erfüllt (§2, Zeile „Wirt der Seite").

Test `aos-vorhaben-seite-chips.test.ts`: Kommentar Zeile 76 „no project name in the head" streichen; drei neue `it`-Fälle im `describe('… head and Phasen-Chips')` (Details §8). Die Fixture `row()` liefert bereits `projectName: 'P'`.

`docs/design.md` §4: neue Zeile

| Seite, die zu einem Projekt gehört (Vorhaben-Seite, „Neue Absicht", Projekt-Seite) | das Projekt steht auf der Seite, nicht im Rahmen: als graue kleine Zeile im Kopf (Vorhaben-Seite über der Kennung, „Neue Absicht" unter der Überschrift) oder als Überschrift (Projekt-Seite); Text, kein Link (INT-2026-017, NZ-01/NZ-02) | `aos-vorhaben-seite` `.projekt`, `aos-vorhaben-view` `.neue-absicht .sub`, `aos-projekt-seite h1` |

plus Protokollzeile.

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Projektname in der App-Kopfzeile (`app.ts getPageTitle()` → „Specwright · Vorhaben") | NZ-01: Rahmen-Regel INT-2026-010 (FA-07/EK-02, höchstens drei Bedienelemente, Kopfzeile neutral); Entscheidung PO 17.09. |
| Projektname als Link zur gefilterten Liste oder zur Projekt-Seite | NZ-02 (Entscheidung PO 17.09.); außerdem müsste die Seite Routing kennen, das heute der Wirt `aos-vorhaben-view` besitzt |
| Projektname als weiteres `<span>` in der `.meta`-Zeile (neben Zustand, Sitzung, Arbeitskopie) | steht unter dem Titel, nicht „auf den ersten Blick"; `.meta` bricht am Handy zuerst um, der Name wanderte je nach Breite; AK-01 legt „über der Kennung" fest |
| Präfix in der Kennungszeile (`Specwright · INT-2026-017` in Mono/Akzent) | vermischt Projekt und Kennung in einer Textzeile; `.kennung`-Text wird von Tests wörtlich geprüft (`chips.test.ts:73`); die Liste trennt beides ebenfalls in zwei Spans (`aos-vorhaben-zeile.ts:184-185`) |
| Regel in `theme.css` | RB-01: Shadow-Root, `theme.css` erreicht die Kinder nicht (CLAUDE.md, dreimal passiert) |
| Gemeinsame CSS-Konstante für `.projekt` (Zeile + Seite) | zwei Deklarationen für zwei Werte; ein neues Modul wäre mehr Code als die Dopplung (Minimalinvasiv) |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Nein** — bleibt innerhalb von `architecture.md` §2 (Frontend, Web Components `aos-*`) und §3 (kein neues Datenobjekt; `projectName` gehört zur Vorhaben-Zeile, Besitzer Backend). AR-04 nicht berührt (kein Server-Code), AR-05 eingehalten (kein neuer Zustand, nichts in `localStorage`), AR-06 eingehalten (nur UI). Kein ADR (keine Datenhaltung, Lieferkette, Auth, MCP).
- `security.md` §6 Pflichtprüfungen: kein Endpunkt, kein Lieferumfang (UI-Quelle ist nicht im Manifest), kein Installer, kein externes System, keine personenbezogenen Daten; Screenshots nur aus dem Scratch-Projekt (RB-02), keine Host-Details in `plan.md`/`design/`.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/frontend/src/components/vorhaben/aos-vorhaben-seite.ts` | ändern | `static styles`: Regel `.projekt` (Farbe `--color-text-secondary`, Größe `--font-size-sm`); `render()`: `<div class="projekt">${r.projectName}</div>` als erstes Kind von `.kopf-text`; Datei-Kopfkommentar um „project name" ergänzt | AK-01, AK-02, AK-03 |
| 2 | `ui/tests/unit/aos-vorhaben-seite-chips.test.ts` | ändern | Kommentar „no project name in the head" (Z. 76) streichen; drei `it`-Fälle: Name über der Kennung (AK-01); Name bei jedem Dokument und bei `docs: []` (AK-02); Name wechselt mit der Zeile, auch bei gleicher Kennung in zwei Projekten (AK-03); Kopfkommentar der Datei ergänzt | AK-01–AK-03 |
| 3 | `docs/design.md` | ändern | §4 Muster-Zeile „Seite, die zu einem Projekt gehört" + Änderungsprotokoll-Zeile | AK-01, NZ-01, NZ-02 |
| 4 | `intent/INT-2026-017-projektname-im-kopf/design/ist/mac-1440.png`, `handy-390.png` | neu | Screenshots aus dem Scratch-Projekt (Seite mit Projektname), Vergleichsbild ist `intent/INT-2026-016-status-und-glocke/design/ist-pr2/c2-tab-geklickt-gebunden.png` (vorher) | AK-04, AN-02 |
| 5 | `intent/INT-2026-017-projektname-im-kopf/plan.md` §14, `intent.md` Änderungsprotokoll | ändern | Abweichungen, Status `in_umsetzung` → `umgesetzt`, PR-Bezug | DoD |

**Nicht betroffen (ausdrücklich):** `ui/frontend/src/app.ts` (`getPageTitle`, NZ-01) · `aos-kopfzeile`, `aos-glocke` · `aos-vorhaben-zeile`, `aos-vorhaben-uebersicht` (Liste) · `aos-vorhaben-view.ts` (`renderNeu`, Wirt-Binding) · `aos-projekt-seite` · `ui/src/server/**` (Reader, Protokoll, Typen) · `ui/src/shared/types/vorhaben.protocol.ts` · `theme.css` · `docs/architecture.md` (§3 „Nein") · `specwright/manifest.tsv` (UI-Quellen sind nicht im Lieferumfang) · Terminal/Sidebar.

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `aos-vorhaben-seite.render()` (Kopf) | `VorhabenRow.projectName` (bestehende Property `row`) | Property-Lesen im Template | `this.row.projectName: string` (`vorhaben.protocol.ts:104`) | `grep -n 'r.projectName' ui/frontend/src/components/vorhaben/aos-vorhaben-seite.ts` → 2 Treffer (Dialog `.ziel` + Kopf `.projekt`) | — |
| Test AK-01–AK-03 | `aos-vorhaben-seite` Shadow-DOM | `shadowRoot.querySelector('.projekt')` | Klasse `projekt` im Template | `grep -n "'.projekt'" ui/tests/unit/aos-vorhaben-seite-chips.test.ts` → ≥ 3 Treffer; `cd ui && npx vitest run tests/unit/aos-vorhaben-seite-chips.test.ts` grün | — |
| `docs/design.md` §4 | Komponente | Doku-Verweis | Text `aos-vorhaben-seite` `.projekt` | `grep -n 'INT-2026-017' docs/design.md` → 2 Treffer (Muster + Protokoll) | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung — es gibt keine neue Komponente; die neue Zeile hängt an der bestehenden Property `row`.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. **Lesende Vorprüfung:** (a) Konsumenten der Kopf-Selektoren: `grep -rn 'kopf-text\|\.kennung\b\|\.projekt\b' ui/frontend/src ui/tests` → außerhalb von `aos-vorhaben-seite.ts` nur `kennung-tip*`/`kennung-hit`/Zeile — kein Treffer auf den Kopf der Seite; (b) `grep -rn 'projectName' ui/tests/unit/aos-vorhaben-seite-*.test.ts` → nur Fixture, keine Abwesenheits-Assertion; (c) `git fetch origin && git log --oneline HEAD..origin/main` → leer (Stand 17.09., 20:50: `session/ui-opt` = `origin/main` + `796b7a6`). Prüfbar durch die grep-Ausgaben.
1. **Arbeitskopie:** Branch `feat/INT-2026-017-projektname-im-kopf` von `HEAD` (`796b7a6`, enthält den Intent-Commit) in diesem Worktree; `cd ui && npm ci && cd frontend && npm ci`; `chmod +x ui/node_modules/node-pty/prebuilds/*/spawn-helper`; `bash scripts/verify.sh --fast` → `verify: OK` (Nullmessung, bevor Code entsteht). Prüfbar: `verify: OK`.
2. **Test zuerst (#2):** drei `it`-Fälle einfügen, Kommentar Z. 76 streichen → `cd ui && npx vitest run tests/unit/aos-vorhaben-seite-chips.test.ts` → genau die drei neuen Fälle rot (`.projekt` ist `null`). Prüfbar: 3 failed, Rest passed.
3. **Komponente (#1):** Regel + Template-Zeile + Kopfkommentar → derselbe Vitest-Lauf grün. Prüfbar: 0 failed.
4. **Doku (#3):** `docs/design.md` §4-Zeile + Protokollzeile. Prüfbar: `grep -c 'INT-2026-017' docs/design.md` = 2.
5. **Verbindungen nachweisen** (§5, drei Befehle) und Ausgaben für den PR sichern.
6. **`bash scripts/verify.sh`** (voll, inkl. UI-Builds und Vitest-Bezugsliste) → `verify: OK`. Prüfbar: letzte Zeile.
7. **E2E-Screenshots (#4, AK-04/AN-02):** `cd ui/frontend && npm run build`; Branch-Backend `env -u SPECWRIGHT_CLOUD_SESSION_ID PORT=3111 HOST=127.0.0.1 SPECWRIGHT_TMUX=off SPECWRIGHT_RUNTIME_DIR=<scratchpad>/e2e-runtime npx tsx src/server/index.ts` (aus `ui/`); Scratch `/private/tmp/scratch-int010` per ws `workspace:open-project` öffnen; Playwright-Skript `<scratchpad>/e2e-017.mjs` (globales Playwright, Chrome-Channel, headless): `page.goto('http://127.0.0.1:3111/#/vorhaben/<enc realpath>/INT-2026-001')` bei 1440×900 und 390×844 (`isMobile`), warten auf `aos-vorhaben-seite`, Deep-Walk in den Shadow-Root, Assertion `projekt.getBoundingClientRect().top < kennung.getBoundingClientRect().top` und `projekt.textContent` = der beim `workspace:open-project` übergebene `name` (z. B. `scratch-int010`; Laufzeitordner ist frisch, der Name kommt aus dem Skript) in beiden Breiten, dann Chip `plan` klicken (Phase ohne Dokument) → `.projekt` weiterhin vorhanden; Screenshots nach `intent/INT-2026-017-projektname-im-kopf/design/ist/mac-1440.png` und `handy-390.png`. Bilder vor `git add` mit Read ansehen (RB-02: nur Scratch-Inhalte). Aufräumen: 3111-Listener beenden, `lsof -iTCP:3111` leer. Prüfbar: zwei PNGs, Skript-Ausgabe `ok` je Breite.
8. **Commit(s)** (Conventional, Bezug INT-2026-017; `plan.md` Status `in_umsetzung` im ersten, `umgesetzt` + §14 im letzten), PR mit `verify`-Ausgabe, §5-Nachweisen und Screenshot-Paar (vorher `c2-tab-geklickt-gebunden.png`, nachher `mac-1440.png`), CI abwarten. Abschlussbericht nach R3 mit Block „Für das Board".

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Eine Komponente, ein Test, eine Doku-Zeile, zwei Screenshots — zusammen unter zwei Stunden; eine Zerlegung brächte Worktrees für Minuten Arbeit und eine Integrationsaufgabe obendrauf (Pilot-Maßstab).

#### Variante B — parallel in Worktrees

<!-- leser: agent -->

Entfällt.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01 | `seite(row())` → `shadowRoot.querySelector('.projekt')?.textContent === 'P'`; DOM-Ordnung: `[...querySelector('.kopf-text').children].map(c => c.tagName + '.' + c.className)` beginnt mit `DIV.projekt`, dann `DIV.kennung`, dann `H1`; `.kennung` weiterhin `'INT-2026-004'` | `ui/tests/unit/aos-vorhaben-seite-chips.test.ts` | Unit (happy-dom) |
| AK-02 | für `doc` in `intent`, `spec`, `plan` (ohne Datei → `.kein-dokument`), `build-stand`, `design` (Zeile mit `designFiles: ['skizze.png']`) → `.projekt` vorhanden und `'P'`; zusätzlich `row({ docs: [], designFiles: [] })` mit `doc: 'intent'` → `.kein-dokument` **und** `.projekt` | dieselbe Datei | Unit |
| AK-03 | `el.row = row({ projectId: 'q', projectPath: '/q', projectName: 'Kreis Lippe', intentId: 'INT-2026-009' })` → `settle` → `.projekt` = `'Kreis Lippe'`, `.kennung` = `'INT-2026-009'`; dann `el.row = row({ projectId: 'r', projectName: 'Applai' })` mit **gleicher** `intentId` `INT-2026-004` → `.projekt` = `'Applai'` (zwei Projekte, gleiche Kennung — der `willUpdate`-Reset greift nicht, der Kopf muss trotzdem wechseln) | dieselbe Datei | Unit |
| AK-04 | Playwright-Skript gegen 3111: bei 390×844 (`isMobile`) und 1440×900 ist `.projekt` sichtbar, steht über `.kennung` (Rect-Vergleich), Text = Projektname aus `workspace:open-project`; Screenshots `design/ist/handy-390.png`, `mac-1440.png` | `<scratchpad>/e2e-017.mjs` (nicht im Repo), Bilder im Intent-Ordner | E2E / Screenshot |
| AN-01 | Name im Kopf = Name der Liste: im E2E zusätzlich Liste `#/vorhaben` öffnen, `aos-vorhaben-zeile .projekt` der Zeile `INT-2026-001` lesen und mit dem Kopf vergleichen | `e2e-017.mjs` | E2E |
| AN-02 | Screenshot `mac-1440.png` neben `c2-tab-geklickt-gebunden.png`: Chips unten bündig mit dem Titel, Kopf eine Zeile höher, `.meta` darunter unverändert | Bilder | Screenshot (Sichtprüfung im PR) |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss mit `verify: OK` enden, Ausgabe wird im PR zitiert. **CI ist die Wahrheit:** lokal grün zählt erst, wenn die PR-Checks grün sind. `ui/tests/known-failures.txt` wird nicht angefasst (Hook `protect-tests`).
- **Datenkorrektur:** entfällt (keine Bestandsdaten).
- **Angeschlossen (E2E-Pfad):** Liste `#/vorhaben` → Klick auf Zeile `INT-2026-001` (Projekt `scratch-int010`) → Vorhaben-Seite zeigt `.projekt` = Name der Liste, über der Kennung → Chip `plan` (kein Dokument) → `.projekt` bleibt → Handy-Breite: gleiche Stelle. Durchläuft die Verbindung `row.projectName → .projekt` (§5). Geprüft per Playwright-Skript + Screenshots.
- **Bugfix:** entfällt (Feature); Test dennoch zuerst (Schritt 2 in §6), Hook `protect-tests` aktiv (kein `fix-mode`-Marker nötig).
- **UI:** kein Mock vorhanden (Intent beschreibt die Zeile wörtlich: „grau und klein über der Kennung, wie „Neue Absicht" das Projekt nennt"); Referenz ist das Ist-Bild `c2-tab-geklickt-gebunden.png` plus die Liste (`aos-vorhaben-zeile .projekt`). Prüfung per Screenshot-Paar im PR.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| Regel landet aus Gewohnheit in `theme.css` und greift nicht (Shadow-Root) | niedrig (im Plan ausdrücklich `static styles`, RB-01) | niedrig — Zeile erscheint ungestylt in Standardschrift | Regel in der Komponente; Screenshot zeigt Grau/Klein | Michael beim ersten Öffnen; Screenshot im PR |
| Kopf wird um eine Zeile höher, Chips oder `.meta` verrutschen sichtbar | niedrig (`.kopf` ist `align-items: flex-end`, Chips bündig zum Titel) | niedrig — kosmetisch | Vergleichsbild vorher/nachher im PR (AN-02) | Michael im PR-Screenshot |
| Worktree ohne `node_modules`: `verify` rot mit Phantom-Fehlern (21× TS2307, node-pty ohne `+x`) | hoch, wenn Schritt 1 übersprungen wird | mittel — falscher Rot-Befund, Zeit | §6 Schritt 1 vor jedem Code: `npm ci` in `ui/` und `ui/frontend/`, `chmod +x` spawn-helper, Nullmessung `verify --fast` | Bausitzung sofort |
| Bild aus dem Scratch-Projekt zeigt versehentlich Fremdinhalte (Dock, andere Fenster, Kundenprojekt) | niedrig (headless Chrome, Scratch-Projekt) | mittel (Repo öffentlich, RB-02) | Playwright-Screenshot statt Bildschirmfoto; Bild vor `git add` mit Read prüfen | Bausitzung vor dem Commit; Michael im PR |
| Sehr langer Projektname bricht in zwei Zeilen | niedrig (Applai, Kreis Lippe, Specwright) | niedrig | bewusst kein `nowrap`; bei Bedarf später Ellipsis wie in der Liste | Michael, nur bei exotischen Namen |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| Plan freigeben: `Status: freigegeben` in `intent/INT-2026-017-projektname-im-kopf/plan.md`, Commit `plan(INT-2026-017): Plan freigegeben` (Weg: Workflow `specwright/workflows/core/plan.md` Schritt 9b; `intent.bezuege.plan` steht schon auf `plan.md`) | PO (Michael) im Chat, Agent committet | vor Umsetzung | [x] 2026-09-17 |
| PR mergen — löst den Auto-Deploy der UI auf dem Cloud-Host aus (`architecture.md` §5, Deploy-Gate `GET /api/status/deploy-readiness`); Weg: GitHub-PR, nur Michael (CLAUDE.md „Nie") | Michael | nach CI grün | [ ] |
| Board nachziehen: Karte zu INT-2026-017 anlegen/verschieben mit dem Block „Für das Board" aus dem Abschlussbericht; Weg: Skill `obsidian-po-board` in eigener kurzer Sitzung nach `/clear` (Regel 15.09.2026) | Michael startet, Agent führt aus | nach PR | [ ] |

Kein Secret, kein Flag, keine Migration, kein Datenlauf; Hook `production-gate` wird nicht ausgelöst (kein `deploy`+`prod`-Befehl in der Bausitzung).

### 11. Schätzung

<!-- leser: mensch -->

1–2 h in einer Sitzung. Davon Code + Test ≈ 20 min, `verify` ≈ 5 min, Worktree-Vorbereitung (`npm ci` ×2) ≈ 5–10 min, Screenshots per Branch-Backend + Playwright ≈ 30–45 min (der größte und unsicherste Posten: Backend-Start, Scratch öffnen, Skript), PR + CI ≈ 15 min. Unsicherheit liegt allein im E2E-Aufbau, nicht im Code.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| F1, AK-02 verlangt „kein Dokument vorhanden": ein Chip ohne Datei reicht als Test nicht, die Zeile kann auch gar keine Dokumente haben | Self | angenommen | §8 AK-02: zusätzlicher Fall `docs: [], designFiles: []` |
| F2, der bestehende Test kommentiert „no project name in the head" (nur Kommentar, keine Assertion) und würde dem neuen Stand widersprechen | Self | angenommen | §4 #2: Kommentar streichen, Kopfkommentar der Testdatei ergänzen |
| F3, `willUpdate` setzt nur bei anderer `intentId` zurück — zwei Projekte mit gleicher Kennung (real: `INT-2026-001` in Scratch und Specwright) könnten den alten Namen stehen lassen | Self | angenommen als Testfall (Code braucht keine Änderung: der Kopf liest `this.row` in jedem Render) | §8 AK-03: zweiter Wechsel mit gleicher `intentId` |
| F4, `nowrap`/`ellipsis` wie in der Liste übernehmen? | Self | abgelehnt, weil der Kopf Platz hat und Umbruch ehrlicher ist als Abschneiden; Risiko in §9 benannt | — |
| F5, gemeinsame CSS-Konstante für `.projekt` in Zeile und Seite | Self | abgelehnt, weil ein neues Modul für zwei Deklarationen mehr Code ist als die Dopplung | §3 Alternativen |
| F6, `docs/design.md`-Zeile nötig, obwohl NZ-03 die Nachbarseiten ausnimmt? | Self | angenommen, weil die Zeile das nun dreifach gelebte Muster dokumentiert (CLAUDE.md: `design.md` = „was entspricht dem Mock"), nicht die Nachbarseiten ändert | §4 #3 |
| F7, Screenshot per macOS-`screencapture` (Memory-Rezept) statt Playwright? | Self | abgelehnt, weil Playwright headless keine Fremdinhalte einfängt (RB-02) und beide Breiten ohne Fenstergefummel liefert | §6 Schritt 7 |
| F8, Bedingung `${r.projectName ? … : nothing}` für leere Namen? | Self | abgelehnt, weil `projectName` im Typ Pflicht und im Reader immer gesetzt ist; eine leere `div` wäre unsichtbar und harmlos | — |

**Minimalinvasiv geprüft:** wiederverwendet werden die Property `row` (kein neuer Datenfluss), die Stilwerte von `aos-vorhaben-zeile .projekt`, die Test-Helfer `row()`/`seite()`/`settle()` des bestehenden Chips-Tests, das Scratch-Projekt `scratch-int010` und das E2E-Rezept ohne Sitzung. Gestrichen: eigener Testfall für Mobil (gleiches DOM, Screenshot reicht), `aria-label`-Ergänzung (Text ist ohnehin lesbar), Änderung an `aos-vorhaben-view`/`app.ts`/Backend (nicht nötig).

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-09-17: ohne Befund (R4). Der Mensch-Teil verspricht: Zeile über der Kennung auf jeder Seite/jedem Dokument, Wechsel mit der Zeile, Handy gleich, drei Tests, zwei Screenshots, eine Doku-Zeile, keine Änderung an Rahmen/Liste/Nachbarseiten/Backend — §4 #1–#4 und §8 lösen genau das ein; „Nicht betroffen" deckt die Nicht-Ziele.

### 13. Definition of Done

<!-- leser: agent -->

- [x] AK-01, AK-02, AK-03 haben grüne Tests in `aos-vorhaben-seite-chips.test.ts` (14/14, drei neue Fälle, erst rot dann grün); AK-04/AN-01/AN-02 per Skript (`E2E: ok`, beide Breiten) und Screenshots (§8).
- [x] Alle drei Nachweise aus §5 ausgeführt (2 · 6 · 2 Treffer) und im PR zitiert.
- [x] E2E-Pfad läuft (§8), Screenshots `design/ist/mac-1440.png`, `handy-390.png` im Intent-Ordner, Vergleich zu `c2-tab-geklickt-gebunden.png` im PR.
- [ ] `bash scripts/verify.sh` → lokal `verify: ROT` allein wegen vorbestehendem `terminal-io.test.ts` (§14, auch auf `main`); Ausgabe im PR — **offen bis PR-Checks grün** (CI ist die Wahrheit).
- [x] `docs/architecture.md` unverändert (§3 „Nein"); `docs/design.md` §4 + Protokoll ergänzt.
- [x] Manuelle Schritte (§10): Merge und Board im PR als offen markiert.
- [x] Abweichungen in §14; `plan.md` Status `umgesetzt`; `intent.md` Änderungsprotokoll mit PR.
- [x] 2x-Regel-Check: kein Wiederholungsfehler — Regel `.projekt` in `static styles` (RB-01), Worktree-`npm ci` ×2 + `chmod +x` vorab, Nullmessung grün; kein `CLAUDE.md`-Vorschlag.
- [x] Abschlussbericht nach R3 (nur Mensch-Abschnitte im Chat), endet mit dem Block „Für das Board" (Projekt Specwright · Karte „neu": INT-2026-017 Projektname im Kopf · Zielspalte `✅ Erledigt` · Beleg PR · Verweis `intent/INT-2026-017-projektname-im-kopf/`); Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-09-17 | `bash scripts/verify.sh` endet lokal mit `verify: ROT`: Stufe 5 meldet `tests/integration/terminal-io.test.ts` als neue rote Datei (Fall „Ctrl+C auf `sleep 30`", erwartet Exit `1/2/130/143`, bekommt `0`). Alle übrigen Stufen grün, `--fast` grün. | Vorbestehend und umgebungsbedingt, nicht durch dieses Vorhaben: derselbe Befund auf Michaels `main`-Checkout (ad70b5c, nur Test ausgeführt), auch ohne `SPECWRIGHT_CLOUD_SESSION_ID`/`TMUX`. Ursache [Likely]: zsh 5.9 führt `-c 'sleep 30'` per `exec` aus, SIGINT tötet `sleep` direkt, node-pty meldet `exitCode 0` + `signal 2`, `terminal-manager.ts:306` gibt nur `exitCode` weiter. Der Diff dieses Vorhabens berührt `ui/src/server/**` nicht (§4 „Nicht betroffen"); Test und Bezugsliste bleiben unangetastet (Hook `protect-tests`, CLAUDE.md). CI ist die Wahrheit (§8). | §6 Schritt 6, §13 (Verify-Punkt offen bis PR-Check grün); Befund als eigene Karte fürs Board (Bugfix-Kandidat: Signal in Exit-Code abbilden) |
| 2026-09-17 | E2E-Skript wählt vor dem Screenshot ausdrücklich Chip `spec` | Die Dokumentwahl ist geteilter Sichtzustand im Backend (AR-05, INT-2026-010): der Mac-Lauf klickte `plan`, der Handy-Kontext („zweites Gerät") startete damit ohne Dokument — gewolltes Verhalten, nur das Skript war zu streng | §6 Schritt 7 (Skript), kein Code |
| 2026-09-17 | Test AK-03: Reihenfolge der Wechsel getauscht — erst anderes Projekt mit **gleicher** Kennung (`Applai`, `INT-2026-004`), dann anderes Vorhaben (`Kreis Lippe`, `INT-2026-009`) | In der Reihenfolge aus §8 (erst 009, dann 004) wäre der zweite Wechsel wieder ein Kennungswechsel gewesen; der Fall „gleiche Kennung, `willUpdate`-Reset greift nicht" (F3) braucht den Übergang 004 → 004 | §8 AK-03 (Inhalt gleich, Reihenfolge) |
