# Plan: Plan-Vorlage schärfen: Nahtstelle, erste Scheibe, Größenmaß, 2x-Regel

> **Intent:** `intent.md` (INT-2026-032) · **Spec:** entfällt (bypass: Größe S, nur Vorlagen- und Workflow-Text)
> **Status:** freigegeben
> **Erstellt:** 2026-10-06 im Plan Mode · **Freigabe:** Michael (Produktverantwortung), 2026-10-06 („freigeben", Chat)
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand bcad391), `CLAUDE.md`, `docs/security.md`
> **Format:** 1.0

<!-- Der Plan ist TECHNISCH und die EINHEIT DER AUSFÜHRUNG. Eine Sitzung setzt ihn ganz um.
     Maßstab: Ein neues Teammitglied könnte allein anhand dieses Dokuments umsetzen.
     Jede Änderung verweist auf eine FA (spec.md) oder ein AK (intent.md). Keine Änderung ohne Herkunft.
     Zwei Leser: „In einfachen Worten" liest die Person, die freigibt; „Details" liest der Agent, der baut. Die erste Zeile unter jeder
     Überschrift sagt, für wen der Abschnitt ist (R1, specwright/workflows/meta/leser-und-rueckfragen.md). Marker übernehmen, keinen entfernen. -->

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Die Vorlage für technische Pläne bekommt vier neue Pflichten, so wie du sie bei der Absicht entschieden hast. Erstens: Bevor ein Test entsteht, steht im Plan, an welcher Stelle das Verhalten geprüft wird, und warum genau dort. Zweitens: Der erste Bauschritt ist eine dünne, vorführbare Scheibe durch alle betroffenen Ebenen. Drittens: Jeder Plan schätzt, wie viel Arbeitsgedächtnis der Bau braucht; über etwa 120.000 Tokens schlägt `/plan` vor, das Vorhaben zu teilen. Viertens: Ein Fehler, der zum zweiten Mal passiert, wird zuerst eine automatische Prüfung, dann eine nummerierte Architekturregel, erst zuletzt eine Zeile in `CLAUDE.md`.

**Was ändert sich?** Für dich: Neue Pläne haben in der Testtabelle eine Spalte „Nahtstelle", in der Reihenfolge einen ersten Schritt „Erste Scheibe" und bei der Schätzung eine Zeile „Kontext für den Bau". Ist ein Vorhaben zu groß, bekommst du vor der Freigabe einen Teilungsvorschlag. Im Abschlussbericht eines Builds steht bei einem wiederholten Fehler zuerst ein Vorschlag für eine Prüfung, nicht für `CLAUDE.md`. Alte Pläne bleiben, wie sie sind. Die Software Factory sieht Format 2.0 und einen Eintrag „Format" im Änderungsprotokoll. Specwright springt auf 4.3.0.

**Wie wird das gemacht?** Man kann sich die Vorlage wie ein Antragsformular vorstellen, das ein paar neue Pflichtfelder bekommt, mit einem kurzen Hinweis, wie man sie ausfüllt. Gleichzeitig bekommen die beiden Arbeitsanweisungen, die das Formular benutzen (`/plan` schreibt es, `/build` setzt es um), je einen Satz dazu, damit der Agent die Felder auch wirklich füllt und beim Bau einhält. Zur Teilung: Wird ein Plan in Teile zerlegt, ist jeder Teil künftig selbst eine Scheibe, die man vorführen kann, statt „Teil 1 macht die Datenbank, Teil 2 die Oberfläche". Teile, die dieselben Dateien anfassen, laufen nacheinander statt gleichzeitig, damit sie sich nicht in die Quere kommen. Die Nummer der Vorlagen steigt von 1.0 auf 2.0, weil neue Pflichtfelder dazukommen; das ist nach der Regel aus dem letzten Vorhaben ein Sprung der ersten Zahl. Die bestehende Prüfung, ob alle drei Vorlagen dieselbe Nummer tragen, läuft mit; ein Test darin benutzt heute „2.0" als absichtlich falschen Wert und wird auf „eine Nummer höher als die aktuelle" umgestellt.

Insgesamt: 3 Vorlagen (davon 2 nur die Nummer), 2 Arbeitsanweisungen, 2 Befehlsbeschreibungen, die Vorlage für `CLAUDE.md`, die Vorlagen-Anleitung, das Änderungsprotokoll, die Versionsnummer, ein Test im Installer-Test und ein neuer Test für die Web-Oberfläche, der alle 28 bestehenden Pläne einliest.

**Was kann schiefgehen?** Pläne werden etwas länger. Die 120.000 sind eine Schätzung, kein Messwert; ein Plan kann knapp durchrutschen oder unnötig zur Teilung vorgeschlagen werden. Die Factory muss auf Format 2.0 reagieren, sonst liest sie die neue Testtabelle mit einer Spalte mehr falsch; genau dafür ist der Sprung da. Projekte, die die Plan-Vorlage bei sich verändert haben, bekommen die neue beim Update nicht automatisch; dort bleibt es bei Format 1.0 oder ohne Nummer, was gültig ist. Rückgängig: Revert der PR.

**Was musst du entscheiden?** Nichts, Freigabe reicht. Eine Sache habe ich selbst entschieden: Die neue Pflicht zur ersten Scheibe darf ein Plan begründet abwählen, wenn er nur eine Ebene berührt (wie dieses Vorhaben, das nur Text ändert). Sonst müsste jeder reine Text-Plan eine künstliche Scheibe erfinden.

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: mensch -->

Plan-Vorlage auf Format 2.0: §6 Schritt 1 „Erste Scheibe" (AK-03), §7 Variante B als Schnitt nach Scheiben mit Reihenfolge bei überlappenden Dateien (AK-05), §8 Spalte „Nahtstelle" plus Regeln zu Nahtstelle, Mocks und Erwartungswerten (AK-01, AK-02), §11 Pflichtzeile „Kontext für den Bau" mit Grenze ~120k (AK-04), §13 neue 2x-Regel (AK-06). Workflows `plan` (1.4) und `build` (1.3) sowie Befehle `/plan`, `/build` und `CLAUDE-template.md` ziehen nach. Intent- und Spec-Vorlage nur Nummer 2.0 (AK-07), README-Stand, CHANGELOG `## 4.3.0` mit `### Format` (AK-08), VERSION 4.3.0. T8(c) auf „Hauptnummer + 1", neuer UI-Test liest alle bestehenden `intent/*/{intent,spec,plan}.md` (AK-09). Kein UI-Code.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Plan-Vorlage §6 | `specwright/templates/sdlc/vorhaben/plan-template.md:107-117` (Kommentar :111, Schritte 0–4) | Schritt 1 wird „Erste Scheibe"; Kommentar um Regel ergänzen |
| Plan-Vorlage §7 | `plan-template.md:119-143`; Kommentar :123-124 „disjunkte Dateien"; Überschrift :132 `#### Variante B — parallel in Worktrees`; Tabelle :136 | Kommentar, Überschrift-Suffix, Tabellenspalten, Beweis-Zeile neu |
| Plan-Vorlage §8 | `plan-template.md:145-157`; Tabelle :149-151 (4 Spalten); Bugfix :156 | Spalte „Nahtstelle" an Position 2; Regelkommentar über der Tabelle |
| Plan-Vorlage §11 | `plan-template.md:179-183` nur Zeit | Zeile „Kontext für den Bau" |
| Plan-Vorlage §13 | `plan-template.md:211` 2x-Regel → `CLAUDE.md` | neue Reihenfolge |
| Leser-Marker-Guard | `scripts/check-leser-marker.sh:52-73` `SOLL_PLAN`, Vergleich per Präfix (`:111` `"$h" != "$sp"*`) | Suffix-Änderung an `#### Variante B` unschädlich, keine neuen Überschriften → Guard unverändert [Certain] |
| Formatguard | `scripts/check-vorlagen-format.sh` verlangt identische Nummer in allen drei Vorlagen | alle drei auf 2.0 |
| Installer-Test T8 | `scripts/test-installers.sh:142-144` setzt plan-Kopie auf fest `2.0` für „ungleich" | nach Sprung auf 2.0 wäre das gleich → T8(c) würde rot; auf Hauptnummer + 1 umstellen |
| Workflow plan | `specwright/workflows/core/plan.md` v1.3: Overview :13, Step 4 :70 (§6), Step 5 :76-81 (Zerlegung, :79 „disjunkt"), Step 6 :88 (§8), :94 (§11) | je ein Satz; Größencheck in Step 5 |
| Workflow build | `specwright/workflows/core/build.md` v1.2: Step 2 :50-53 (Variante B), Step 3 :61-69, Step 5 :92 (2x), Step 6 :103 (PR-Body „`CLAUDE.md`-Vorschlag") | Variante B Reihenfolge, Scheibe zuerst, Nahtstellen, 2x-Regel |
| Befehle | `.claude/commands/specwright/build.md:10,13`; `.claude/commands/specwright/plan.md:12` (Pflichtabschnitte) | Text nachziehen |
| CLAUDE-Vorlage | `specwright/templates/sdlc/projekt/CLAUDE-template.md:55` Kommentar 2x-Regel | neue Reihenfolge |
| Architektur-Regeln | `docs/architecture.md:56-67` AR-Tabelle mit Spalte „Prüfung", `:94-99` AP-nn; Vorlage `projekt/architecture-template.md:69-73` | Ziel für Urteilsfragen existiert schon (AR/AP mit Nummer) → keine Vorlagenänderung nötig |
| Intent-/Spec-Vorlage | `intent-template.md:3` `format: "1.0"`, Tabelle `format`-Zeile Wert `"1.0"`; `spec-template.md:7` `> **Format:** 1.0` | nur Nummer |
| README | `specwright/templates/sdlc/README.md:47` „Aktueller Stand: `1.0`" | 2.0 + Verlauf |
| Versionen | `VERSION` 4.2.0, `install.sh:18`, `CHANGELOG.md:5` letzter Eintrag 4.2.0 | 4.3.0 |
| Bestand | 28 `intent/*/plan.md`, alle mit `> **Status:**`; alle `intent.md` mit `status:`; alle `spec.md` mit Status-Zeile (geprüft per grep 2026-10-06) | Grundlage für AK-09-Test |
| UI-Leser | `ui/src/server/services/vorhaben-reader.ts` liest nur Kopf/Status, keine Abschnitte; kein anderer Konsument von §6–§8/§11 in `ui/src`, `scripts`, `specwright/scripts` (grep) | kein UI-Code [Certain] |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

**Plan-Vorlage (AK-01–AK-06):**

- §6 Kommentar ergänzen: „Schritt 1 ist die erste Scheibe: dünn, durch alle betroffenen Schichten (z. B. Daten → Dienst → Oberfläche oder Befehl), allein vorführbar; danach verbreitern. Kein Schichtbau (erst alle Daten, dann alle Endpunkte …). Berührt der Plan nur eine Schicht, steht das mit Grund in Schritt 1." Schritte: `1. Erste Scheibe: [Pfad von Auslöser bis Ergebnis durch alle betroffenen Schichten] → vorführbar durch […]`, `2. Verbreitern: [Schritt] → prüfbar durch […]`.
- §7 Kommentar: „Standard ist A. Liegt die Kontext-Schätzung (Abschnitt 11) über ~120k, wird nicht zerlegt, sondern das Vorhaben geteilt (`/plan` schlägt vor). B nur mit Beweis: jeder Teil ist eine Scheibe (durchgehender Pfad, allein vorführbar), Schnittstelle vor dem Start festgelegt, Integration in der Hauptsitzung. Gleichzeitig nur bei disjunkten Dateien; sonst nacheinander, jeder Teil auf dem gemergten Vorgänger." Überschrift `#### Variante B — in Scheiben (Worktrees)`. Tabelle: `| Teil | Scheibe (Pfad, vorführbar durch) | Dateien | Schnittstelle, vorab festgelegt | Worktree | Start (parallel / nach Tn) | Verbindungen (Abschnitt 5) |`. Beweiszeile: Scheibe vorführbar (Befehl/Pfad), Dateien disjunkt → parallel (Befehl `comm`), sonst Reihenfolge, Schnittstelle `Datei:Zeile`.
- §8 Regelkommentar über der Tabelle: Nahtstelle = öffentliche Schnittstelle, an der das Verhalten beobachtet wird (Befehl, Endpunkt, exportierte Funktion, Bildschirm); vor dem ersten Test festlegen; bestehende vor neuer; die höchste mögliche; möglichst eine für alle AK; Mocks nur an Systemgrenzen (externe Dienste, Zeit, Zufall), nie um eigene Module; kein Test, dessen Erwartungswert so berechnet wird wie im Code (feste Beispielwerte). Tabelle `| AK / FA | Nahtstelle (warum diese) | Test | Datei | Art |`.
- §11: `**Kontext für den Bau:** ~[N]k Tokens — Plan ~[n]k, zu lesende Dateien ~[n]k, Änderungen ~[n]k, Prüfausgaben ~[n]k. Grenze ~120k: darüber teilt `/plan` das Vorhaben (Abschnitt 7).`
- §13: `- [ ] 2x-Regel-Check: Fehler, der zum zweiten Mal vorkam → zuerst automatische Prüfung (Hook, Lint, Test); sonst nummerierte Regel in `docs/architecture.md` (AR/AP); `CLAUDE.md` nur, wenn nicht aus dem Code ablesbar und für jede Aufgabe gültig. Vorschlag im PR.`

**Workflows:**

- `plan.md` 1.3 → 1.4: Overview-Satz „eine Sitzung setzt ihn ganz um" + „wenn er ins Größenmaß passt (~120k Kontext für den Bau, Step 5)". Step 4 §6: Schritt 1 = erste Scheibe. Step 5 neu vorn: „ESTIMATE Kontext für den Bau (Plan, zu lesende Dateien, Änderungen, Prüfausgaben). IF > ~120k: STOP vor Schritt 6 — Teilung in mehrere Vorhaben vorschlagen (je Vorhaben eine Scheibe, Reihenfolge, was jedes allein liefert), Person entscheidet nach R2; bei Teilung `/intent` je Teil." Variante-B-Satz auf Scheiben/Reihenfolge. Step 6 §8: Nahtstellen und Mock-Regel; §11 mit Kontextzeile.
- `build.md` 1.2 → 1.3: Step 2 Variante B: Teile mit überlappenden Dateien nacheinander auf dem gemergten Vorgänger. Step 3 RULE „Erste Scheibe zuerst: §6 Schritt 1 bis vorführbar, dann verbreitern" und RULE „Tests an den Nahtstellen aus §8; Mocks nur an Systemgrenzen". Step 5 2x-REGEL in neuer Reihenfolge (AK-06), Step 6 PR-Body „Vorschlag aus der 2x-Regel".
- Befehle: `build.md:10` Variante B → „je Scheibe ein Worktree, überlappende nacheinander"; `:13` 2x-Regel-Reihenfolge. `plan.md:12` Pflichtabschnitte um „§6 erste Scheibe, §8 Nahtstellen, §11 Kontext für den Bau (> ~120k → Teilung)".
- `CLAUDE-template.md:55` Kommentar: „2x-Regel: zweiter Vorfall → zuerst Hook/Lint/Test, sonst Regel in `docs/architecture.md` (AR/AP); hier nur, was nicht aus dem Code ablesbar ist und für jede Aufgabe gilt."

**Format und Version (AK-07, AK-08):** drei Vorlagen auf 2.0, `intent-template` Tabellenwert `"2.0"`. README „Aktueller Stand: `2.0`" plus Satz „Verlauf: 1.0 seit 4.2.0 (INT-2026-031), 2.0 seit 4.3.0 (INT-2026-032); Einzelheiten im CHANGELOG unter `### Format`." CHANGELOG `## 4.3.0 - 2026-10-06` mit `### Format` (2.0, Hauptnummer, Liste der neuen Pflichtinhalte und der Lese-Änderung: §8-Tabelle 5 Spalten, §7-B-Tabelle 7 Spalten, §11 Pflichtzeile; intent/spec nur Nummer) und `### Geändert` (Workflows, Befehle, CLAUDE-Vorlage). `VERSION`, `install.sh:18` → 4.3.0 (OF-05).

**Tests (AK-07, AK-09):** T8(c) liest die aktuelle Hauptnummer aus der plan-Kopie und setzt `Haupt+1.0` (awk `split($3,v,".")`), Meldung „ungleiche Nummer". UI-Test: alle `intent/*/intent.md` → `parseIntentHead` ≠ null, alle `intent/*/{spec,plan}.md` → `parseStatusLine` ≠ null (Repo-Pfad über `import.meta.url`, `readdirSync`).

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Neue Unterabschnitte (`#### Nahtstellen`, `#### Größenmaß`) | Jede neue Überschrift braucht `SOLL_PLAN`-Zeile und Marker; Spalte und Pflichtzeile reichen und halten die Struktur für Leser stabil. |
| Nahtstelle als eigene Liste statt Tabellenspalte | Zuordnung AK → Nahtstelle wäre zweimal zu pflegen; Spalte erzwingt sie je Zeile. |
| Größenmaß als Ersatzmaß (Zeilen in §4) | OF-01 entschieden: Kontext-Schätzung. |
| Variante B streichen | OF-02 entschieden: bleibt, nach Scheiben. |
| Hinweis in `architecture-template.md` „Ziel der 2x-Regel" | AR/AP mit Nummer und Spalte „Prüfung" existieren schon; die Anweisung steht in `build.md` und `CLAUDE-template.md`, eine dritte Stelle wäre Doppelung. |
| Werkzeug, das Tokens zählt | NZ-05. |
| Guard prüft Pflichtspalte „Nahtstelle" in neuen Plänen | Kein Guard für Planinhalte bisher; AK-01 ist Review. Prüfung würde alte Pläne (NZ-04) mitprüfen oder Formaterkennung brauchen — mehr als S. |
| Formatnummer 1.1 | OF-04 entschieden: 2.0. |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Nein.** AR-01 (keine neue ausgelieferte Datei, Manifest unverändert), AR-06 (Framework hängt nicht an der UI; UI-Test liest nur), AR-07 eingehalten. Kein ADR (keine Datenhaltung, Lieferkette, Auth, MCP). AP-02 eingehalten: Bruch nur für maschinelle Leser, durch Formatnummer und CHANGELOG angezeigt; Versionssprung 4.3.0.
- `security.md` §6: kein Endpunkt, kein Datenobjekt, kein externes System, nichts Personenbezogenes; Repo öffentlich, Inhalt ist Vorlagentext.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `specwright/templates/sdlc/vorhaben/plan-template.md` | ändern | §6, §7, §8, §11, §13 wie §3; `> **Format:** 2.0` | AK-01–AK-07 |
| 2 | `specwright/templates/sdlc/vorhaben/intent-template.md` | ändern | `format: "2.0"`, Tabellenwert `"2.0"` | AK-07 |
| 3 | `specwright/templates/sdlc/vorhaben/spec-template.md` | ändern | `> **Format:** 2.0` | AK-07 |
| 4 | `specwright/workflows/core/plan.md` | ändern | Overview, Step 4, Step 5 (Größencheck, B), Step 6; 1.4 | AK-01–AK-05 |
| 5 | `specwright/workflows/core/build.md` | ändern | Step 2, Step 3, Step 5, Step 6; 1.3 | AK-03, AK-05, AK-06 |
| 6 | `.claude/commands/specwright/build.md` | ändern | Zeilen Variante B, 2x-Regel | AK-05, AK-06 |
| 7 | `.claude/commands/specwright/plan.md` | ändern | Pflichtabschnitte | AK-01, AK-03, AK-04 |
| 8 | `specwright/templates/sdlc/projekt/CLAUDE-template.md` | ändern | Kommentar 2x-Regel | AK-06 |
| 9 | `specwright/templates/sdlc/README.md` | ändern | Stand 2.0, Verlauf | AK-08 |
| 10 | `CHANGELOG.md` | ändern | `## 4.3.0`, `### Format`, `### Geändert` | AK-08 |
| 11 | `VERSION`, `install.sh:18` | ändern | 4.3.0 | OF-05, RB-04 |
| 12 | `scripts/test-installers.sh` | ändern | T8(c) Hauptnummer + 1, Meldung | AK-07 |
| 13 | `ui/tests/unit/vorhaben-reader.test.ts` | ändern | Test „Bestand lesbar" (AK-09) | AK-09 |
| 14 | `intent/INT-2026-032-plan-vorlage-schaerfen/{intent.md,plan.md}` | ändern | `bezuege.plan`, Status, §14 | Ablauf |

**Nicht betroffen (ausdrücklich):** `ui/src/**` (kein Code), `scripts/check-leser-marker.sh` (Präfixvergleich, keine neue Überschrift), `scripts/check-vorlagen-format.sh`, `scripts/verify.sh`, `specwright/manifest.tsv`, `removed.tsv`, Installer, `docs/architecture.md`, `projekt/architecture-template.md`, `CLAUDE.md` des Repos (NZ-06; Befehlstabelle bleibt „T1–T8"), alle `intent/*` außer INT-2026-032 (NZ-04), Spec-Inhalt (NZ-01).

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| Workflow `plan` | Plan-Vorlage §6/§7/§8/§11 | Anweisung | Step 4–6 nennen Erste Scheibe, Nahtstelle, Kontext für den Bau, Scheiben | `grep -n "Erste Scheibe\|Nahtstelle\|120k" specwright/workflows/core/plan.md specwright/templates/sdlc/vorhaben/plan-template.md` | — |
| Workflow `build` | Plan §6/§8/§13 | Anweisung | Step 3 RULEs, Step 5 2x | `grep -n "Erste Scheibe\|Nahtstelle\|architecture.md" specwright/workflows/core/build.md` | — |
| Befehle | Workflows | Kurzfassung | Textzeilen | `grep -n "Scheibe\|2x" .claude/commands/specwright/{build,plan}.md` | — |
| Formatguard | drei Vorlagen | Datei lesen | Nummer 2.0 | `bash scripts/check-vorlagen-format.sh` → `✅ Vorlagen-Format: 3 Vorlagen auf 2.0.` | — |
| Leser-Marker-Guard | Plan-Vorlage | Datei lesen | `SOLL_PLAN` Präfix | `bash scripts/check-leser-marker.sh` grün | — |
| T8 | Formatguard | Aufruf | `FORMAT_TEMPLATE_DIR`, Hauptnummer + 1 | `bash scripts/test-installers.sh` → `✅ T8: Guard rot bei ungleicher Nummer`, `T1–T8 grün` | — |
| Manifest/Installer | installierte Vorlagen | Lieferung | `manifest.tsv:194-196` | T8(e) grün (installierte Vorlagen auf 2.0) | — |
| Bestand `intent/` | `vorhaben-reader` | Datei lesen | `parseIntentHead`, `parseStatusLine` | `cd ui && npx vitest run tests/unit/vorhaben-reader.test.ts` | — |
| CHANGELOG | Factory | Lesen | `### Format` unter `## 4.3.0` | `grep -n "^## 4.3.0\|^### Format" CHANGELOG.md` | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. Lesende Vorprüfung: `git fetch && git log HEAD..origin/main --oneline -- specwright/templates specwright/workflows scripts .claude/commands` leer; `grep -rn "Variante B\|Tests und Nachweis" ui/src scripts specwright/scripts` nur `check-leser-marker.sh` → prüfbar durch erwartete Ausgaben.
1. Erste Scheibe: Plan-Vorlage §8 Spalte + Nummer 2.0 in allen drei Vorlagen + T8(c) → `bash scripts/check-vorlagen-format.sh` (2.0), `bash scripts/check-leser-marker.sh`, `bash scripts/test-installers.sh` grün. Grund für die Wahl: Vorlage → Guard → Installer → installierte Vorlage ist der einzige Lieferpfad durch alle Schichten dieses Vorhabens (Text, Prüfung, Lieferung).
2. UI-Test AK-09 → grün.
3. Plan-Vorlage §6, §7, §11, §13 fertig → Leser-Marker grün.
4. Workflows `plan`, `build`, Befehle, CLAUDE-Vorlage → grep-Nachweise §5.
5. README, CHANGELOG, VERSION/install.sh → `bash scripts/check-manifest.sh` grün (VERSION synchron).
6. Verbindungen nachweisen (§5).
7. `bash scripts/verify.sh` → `verify: OK`; PR, CI grün.

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Alle Änderungen beschreiben dieselben vier Regeln an verschiedenen Stellen und müssen wortgleich zusammenpassen; Kontext für den Bau ~60k (§11), weit unter der Grenze.

#### Variante B — parallel in Worktrees

<!-- leser: agent -->

Entfällt.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01, AK-02 | Plan-Vorlage §8 enthält Spalte „Nahtstelle" und die Regeln (bestehende vor neuer, höchste, möglichst eine; Mocks nur an Systemgrenzen; kein im Code berechneter Erwartungswert); `plan.md` Step 6 verweist darauf | `plan-template.md`, `workflows/core/plan.md` | Review + grep §5 |
| AK-03 | §6 Schritt 1 „Erste Scheibe" mit Abwahlregel; `build.md` Step 3 RULE | `plan-template.md`, `workflows/core/build.md` | Review + grep |
| AK-04 | `plan.md` Step 5 STOP bei > ~120k mit Teilungsvorschlag; §11 Pflichtzeile. Stichprobe: nächster `/plan` nach Merge füllt die Zeile (§10) | `workflows/core/plan.md`, `plan-template.md` | Review / Stichprobe |
| AK-05 | §7 Variante B: Scheibe je Teil, Reihenfolge bei überlappenden Dateien; `build.md` Step 2 | `plan-template.md`, `workflows/core/build.md` | Review |
| AK-06 | `build.md` Step 5, §13, `CLAUDE-template.md`, Befehl `/build` nennen Reihenfolge Prüfung → `architecture.md` → `CLAUDE.md` | genannte Dateien | Review + grep |
| AK-07 | Guard grün auf 2.0; T8(a–e) grün, T8(c) mit Hauptnummer + 1 | `scripts/check-vorlagen-format.sh`, `scripts/test-installers.sh` | Guard / Integration |
| AK-08 | `grep -n "^### Format" CHANGELOG.md` erster Treffer unter `## 4.3.0` | `CHANGELOG.md` | Review |
| AK-09 | alle `intent/*/intent.md` lesbar (`parseIntentHead` ≠ null), alle `intent/*/{spec,plan}.md` lesbar (`parseStatusLine` ≠ null); bestehender Test „drei echte Vorlagen lesbar" mit 2.0; `check-leser-marker --doc intent/*` in verify | `ui/tests/unit/vorhaben-reader.test.ts`, `scripts/verify.sh` | Unit / Guard |

- **Verify-Befehl:** `bash scripts/verify.sh` → `verify: OK`, Ausgabe im PR. **CI ist die Wahrheit.** `ui/tests/known-failures.txt` wird nicht angefasst.
- **Datenkorrektur:** entfällt (NZ-04).
- **Angeschlossen (E2E-Pfad):** Vorlage → Manifest → `install.sh` (T1) → installierte Vorlage → Formatguard grün auf 2.0 (T8e); Bestand `intent/` → `vorhaben-reader` (Vitest). Protokoll: Ausgabe von `test-installers.sh` und `verify.sh` im PR.
- **Bugfix:** entfällt.
- **UI:** keine sichtbare Änderung.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| Factory liest §8-Tabelle mit 5 Spalten wie die alte mit 4 | mittel | mittel | Hauptnummer 2.0, CHANGELOG `### Format` nennt die Spaltenänderung | Factory beim Lesen |
| Schätzung ~120k ungenau: Plan rutscht durch oder wird unnötig geteilt | mittel | niedrig | Kontextdeckel im Build (200k) bleibt als Netz; Person entscheidet Teilung | Michael im Plan, Build-Deckel |
| Pflicht „Erste Scheibe" erzeugt künstliche Scheiben bei Ein-Schicht-Plänen | mittel | niedrig | Abwahl mit Grund in Schritt 1 | Michael beim Review |
| Projekte mit lokal geänderter Plan-Vorlage bleiben auf 1.0 | mittel | niedrig | Regel: Nummer der Datei gilt; Workflow erfindet keine | Factory |
| Workflow-Text und Vorlage laufen auseinander (vier Regeln an acht Stellen) | niedrig | mittel | grep-Nachweise §5 auf Schlüsselbegriffe | Review |

Rückweg: Revert der PR; Pläne, die zwischenzeitlich mit 2.0 entstanden, bleiben lesbar (UI liest nur Kopf und Status).

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| PR reviewen und mergen (`gh pr merge`; Merge löst Auto-Deploy der UI aus, UI-Code unverändert) | Michael | nach CI grün | [ ] |
| Stichprobe AK-04/AK-01: nächster `/plan` nach Merge füllt „Kontext für den Bau", „Erste Scheibe" und Spalte „Nahtstelle"; Kopf `> **Format:** 2.0` (`grep -n '\*\*Format:\*\*\|Kontext für den Bau\|Nahtstelle' intent/INT-…/plan.md`) | Agent der nächsten Plan-Sitzung, Ergebnis im Bericht | nächstes Vorhaben |
| Software Factory über Format 2.0 informieren (Issue software-factory#28), NZ-03 | Michael | nach Merge | [ ] |

### 11. Schätzung

<!-- leser: mensch -->

2–3 h. Unsicherheit gering; größter Posten ist wortgleiche Formulierung an acht Stellen und ein `verify`-Lauf (~1 min, Stufe 5 auf dem Mac gelegentlich wackelig). Kontext für den Bau ~60k Tokens (Plan ~15k, zu lesende Dateien ~25k, Änderungen ~10k, Prüfausgaben ~10k) — unter der neuen Grenze.

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| F1, T8(c) benutzt fest „2.0" als falschen Wert und würde nach dem Sprung grün statt rot | Self | angenommen: auf Hauptnummer + 1 umstellen, damit der Test bei jedem künftigen Sprung trägt | §4 #12, §6 Schritt 1 |
| F2, Pflicht „Erste Scheibe" passt nicht zu Ein-Schicht-Plänen (wie diesem) | Self | angenommen: Abwahl mit Grund in Schritt 1 | §3, „In einfachen Worten" |
| F3, Variante B nach Scheiben überlappt meist in Dateien → parallele Worktrees kollidieren | Self | angenommen: parallel nur bei disjunkten Dateien, sonst nacheinander auf dem gemergten Vorgänger | §3, `build.md` Step 2 |
| F4, Größencheck in `plan.md` Step 5, Schätzung aber erst in Step 6 (§11) | Self | angenommen: Schätzung wandert an den Anfang von Step 5, §11 übernimmt sie | §3 Workflows |
| F5, Größenmaß (> 120k → mehrere Vorhaben) und Variante B (Teile in einem Plan) überschneiden sich | Self | angenommen: klare Trennung — über der Grenze nie B, sondern Teilung in Vorhaben; B nur für Parallelität unter der Grenze | §3 §7-Kommentar |
| F6, Neue Überschriften würden `SOLL_PLAN` ändern | Self | geprüft: keine neuen Überschriften, Suffix an `#### Variante B` unschädlich (Präfixvergleich `check-leser-marker.sh:111`) | §2 |
| F7, Diese `plan.md` entsteht aus Format 1.0 und hat die neuen Felder nicht | Self | angenommen ohne Änderung am Schema: Kopf bleibt `Format: 1.0` (Regel „Nummer der Datei bleibt"); §11 trägt die Kontextzeile trotzdem freiwillig | §11 |
| F8, Guard für Pflichtspalte „Nahtstelle"? | Self | abgelehnt: Planinhalte hat bisher kein Guard, alte Pläne müssten ausgenommen werden; Review reicht für S | §3 verworfene Alternativen |

**Minimalinvasiv geprüft:** Kein UI-Code, kein neuer Guard, keine neue Überschrift; Formatguard und T8 aus INT-2026-031 wiederverwendet (nur T8(c) robuster), AR/AP-Schema in `architecture.md` als Ziel der 2x-Regel statt neuer Datei. Gestrichen: Hinweis in `architecture-template.md`, Inhaltsguard, Token-Zähler.

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-10-06: ohne Befund (R4)

### 13. Definition of Done

<!-- leser: agent -->

- [ ] Jede FA/AK aus Abschnitt 8 hat einen grünen Test.
- [ ] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [ ] E2E-Pfad läuft (Abschnitt 8).
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün (CI ist die Wahrheit).
- [ ] `docs/architecture.md` angepasst, falls Abschnitt 3 „Ja" (hier: Nein).
- [ ] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [ ] Abweichungen von diesem Plan in Abschnitt 14 eingetragen.
- [ ] 2x-Regel-Check: Fehler, der zum zweiten Mal vorkam → Vorschlag für `CLAUDE.md` im PR.
- [ ] Abschlussbericht nach R3 (nur Mensch-Abschnitte im Chat), endet mit dem Block „Für das Board" (Karte, Spalte, PR-Link, Stand, Verweis auf `intent/INT-2026-032-plan-vorlage-schaerfen/`); Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| — | — | — | — |
