# Plan: Vorhaben-Vorlagen tragen eine Formatversion

> **Intent:** `intent.md` (INT-2026-031) · **Spec:** entfällt (bypass: Größe S, drei Kopffelder, Hinweise in drei Workflows, README, CHANGELOG-Abschnitt, ein Guard)
> **Status:** umgesetzt (Merge steht aus)
> **Erstellt:** 2026-10-06 im Plan Mode · **Freigabe:** Michael (Produktverantwortung), 2026-10-06 („Freigabe: plan.md (Stand 2026-10-06 13:55)", Chat)
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand 568bef5), `CLAUDE.md`, `docs/security.md`

<!-- Der Plan ist TECHNISCH und die EINHEIT DER AUSFÜHRUNG. Eine Sitzung setzt ihn ganz um.
     Maßstab: Ein neues Teammitglied könnte allein anhand dieses Dokuments umsetzen.
     Jede Änderung verweist auf eine FA (spec.md) oder ein AK (intent.md). Keine Änderung ohne Herkunft.
     Zwei Leser: „In einfachen Worten" liest die Person, die freigibt; „Details" liest der Agent, der baut. Die erste Zeile unter jeder
     Überschrift sagt, für wen der Abschnitt ist (R1, specwright/workflows/meta/leser-und-rueckfragen.md). Marker übernehmen, keinen entfernen. -->

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Specwright schreibt für jedes Vorhaben drei Dokumente nach festen Vorlagen: die Absicht, die fachliche Beschreibung (Spec) und den technischen Plan. Die Software Factory will genau diese Dokumente übernehmen und maschinell lesen. Dafür muss sie wissen, nach welcher Fassung der Vorlage ein Dokument geschrieben ist. Heute steht das nirgends. Specwright hat nur eine Gesamtversionsnummer (gerade 4.1.1), und die steigt auch, wenn sich nur am Installer oder an der Web-Oberfläche etwas ändert. Die Factory müsste also bei jeder Specwright-Version raten, ob sich für sie etwas geändert hat.

**Was ändert sich?** Jede der drei Vorlagen bekommt im Kopf eine kleine Angabe „Format 1.0". Jedes neue Dokument, das aus einer Vorlage entsteht, übernimmt diese Angabe. Michael sieht in neuen Absichten, Specs und Plänen genau eine zusätzliche Zeile im Kopf, sonst nichts. Alte Dokumente bleiben, wie sie sind; ein Dokument ohne die Angabe gilt als „älter als Format 1". Die Web-Oberfläche zeigt alles wie bisher.

**Wie wird das gemacht?** Man kann sich das wie die Ausgabe eines Formulars beim Amt vorstellen: Auf jedem Formular steht unten klein „Fassung 1.0". Wer die Formulare auswertet, weiß dann, welche Felder er erwarten darf. Die Nummer hat zwei Teile. Die erste Zahl steigt, wenn ein altes Dokument nach der neuen Vorlage nicht mehr passen würde, etwa weil ein Abschnitt umbenannt wurde oder ein Pflichtfeld dazukommt. Die zweite Zahl steigt, wenn nur etwas dazukommt, das ein alter Leser einfach überspringen kann. Reine Umformulierungen ändern gar nichts. Die Factory legt sich auf die erste Zahl fest („ich verstehe Format 1") und muss nur reagieren, wenn die auf 2 springt.

Die drei Vorlagen tragen immer dieselbe Nummer. Damit das nicht versehentlich auseinanderläuft, kommt eine automatische Prüfung dazu, die bei jedem Prüflauf (`verify`) mitläuft: Fehlt die Angabe in einer Vorlage, ist sie falsch geschrieben oder tragen die drei verschiedene Nummern, wird der Prüflauf rot. Die Regel selbst steht in der Anleitung zu den Vorlagen (`specwright/templates/sdlc/README.md`), und die Arbeitsanweisungen für Absicht, Spec und Plan sagen dem Agenten, die Angabe aus der Vorlage zu übernehmen und nie selbst zu erfinden. Im Änderungsprotokoll (CHANGELOG) bekommen Formatänderungen einen eigenen Unterabschnitt „Format", sodass die Factory nur diese Stellen lesen muss. Weil sich die ausgelieferten Vorlagen ändern, steigt die Specwright-Version auf 4.2.0.

Insgesamt sind es 3 Vorlagen, 3 Arbeitsanweisungen, die Vorlagen-Anleitung, das Änderungsprotokoll, ein neues Prüfskript von etwa 50 Zeilen, ein Eintrag im Prüflauf, ein neuer Testblock im bestehenden Installer-Test und zwei bis drei kleine Tests für die Web-Oberfläche.

**Was kann schiefgehen?** Erstens: Ein Projekt hat die Vorlagen bei sich lokal verändert und bekommt beim Update die neuen nicht. Dann entstehen dort weiter Dokumente ohne Nummer. Das schadet nichts, sie gelten als „vor Format 1"; man merkt es, wenn die Factory ein solches Dokument liest. Zweitens: Jemand ändert später eine Vorlage und vergisst die Nummer. Das fängt die Prüfung nur teilweise ab (sie merkt nur, wenn die drei auseinanderlaufen), den Rest muss der Review des Vorhabens leisten. Drittens: Die neue Kopfzeile könnte die Web-Oberfläche stören. Das ist ausgeschlossen, weil die Zeile neben und nicht in den Zeilen steht, die die Oberfläche liest; ein Test sichert das ab. Rückgängig machen geht mit einem Revert der PR.

**Was musst du entscheiden?** Nichts, Freigabe reicht. Zwei Dinge habe ich selbst entschieden und nenne sie, damit du widersprechen kannst: Die Prüfung verlangt, dass alle drei Vorlagen *genau* dieselbe Nummer tragen, nicht nur dieselbe erste Zahl. Das folgt aus deiner Entscheidung „eine gemeinsame Nummer". Und die Specwright-Version steigt auf 4.2.0, weil ausgelieferte Vorlagen eine neue Angabe bekommen.

## Details

<!-- leser: mensch -->

<!-- Volle technische Tiefe: Dateien, Funktionen, Datenmodell, Tradeoffs, Testplan. Geht an Reviewer und in die Bausitzung, muss für sich stehen.
     Confidence-Tags in beiden Teilen: [Certain] harte Belege · [Likely] starke Inferenz · [Uncertain] Vermutung. -->

### 1. Kurzfassung

<!-- leser: mensch -->

Formatversion `1.0` als Kopfangabe in den drei Vorlagen unter `specwright/templates/sdlc/vorhaben/` (intent: YAML-Feld `format: "1.0"`, spec/plan: eigene Kopfzeile `> **Format:** 1.0` unter den bestehenden), Regel in `templates/sdlc/README.md`, Übernahme-Anweisung in den Workflows `intent`/`spec`/`plan`, CHANGELOG-Unterabschnitt `### Format` in Release 4.2.0, neuer Guard `scripts/check-vorlagen-format.sh` in `verify` mit Test T8 in `scripts/test-installers.sh`, und UI-Tests, die zeigen, dass der Vorhaben-Leser unverändert liest. Kein Code der Web-UI ändert sich.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Intent-Vorlage Kopf | `specwright/templates/sdlc/vorhaben/intent-template.md:1-24` (YAML, Zeilen enden mit zwei Leerzeichen, Leerzeile vor `---`) | neues Feld `format`; `version` (:5) zählt Fassungen der Absicht, nicht der Vorlage → Verwechslungsgefahr, Erklärtabelle „Felder im Kopf" (:30ff.) bekommt eine Zeile und einen Präzisierungssatz bei `version` |
| Spec-/Plan-Vorlage Kopf | `spec-template.md:3-6`, `plan-template.md:3-6` (Blockquote `> **Intent:** …`, `> **Status:** …`, `> **Erstellt:** …`, letzte Zeile Pflichtinput/Gelesene Docs) | neue Zeile `> **Format:** 1.0` als **letzte** Kopfzeile; die `Status`-Zeile bleibt unberührt (RB-01) |
| UI-Leser Intent | `ui/src/server/services/vorhaben-reader.ts:49-83` `parseIntentHead`: sammelt alle `key: value`-Zeilen, liest nur bekannte Schlüssel | unbekanntes `format` wird ignoriert [Certain] — keine Codeänderung |
| UI-Leser Spec/Plan | `vorhaben-reader.ts:106-115` `parseStatusLine`: sucht nur `^>\s*\*\*Status:\*\*`; `boundNote` (:94-100) schneidet die Notiz am ersten ` · ` | Formatangabe darf **nicht** in die Status-Zeile (würde Notiz nicht ändern, aber RB-01 verbietet Eingriff); eigene Zeile ist unsichtbar für den Leser [Certain] |
| UI-Tests Leser | `ui/tests/unit/vorhaben-reader.test.ts:27-31` Fixtures `intentText`, `statusDoc`; `:33ff.`, `:54ff.` | wiederverwendbar für AK-07; nicht in `ui/tests/known-failures.txt` [Certain] |
| Guard Leser-Marker | `scripts/check-leser-marker.sh` (154 Z., `LESER_TEMPLATE_DIR`, Bash 3.2 + awk) | Muster für neuen Guard (Env-Override des Vorlagenordners, `err` mit Datei:Zeile, ✅-Zeile); Format-Zeilen sind keine Überschriften → Guard unberührt (RB-04) [Certain] |
| verify | `scripts/verify.sh:24-31` Stufe „[2/6] Guards" | eine Zeile für den neuen Guard |
| Installer-Test | `scripts/test-installers.sh:13-14` Kopf, `:113-131` T7 (Kopien nach `$t7`, mit Env-Override prüfen), `:131` Schlusszeile „T1–T7"; T1 (`:37-48`) installiert in `$t1` | T8 nach Muster T7; T8 nutzt zusätzlich die von T1 installierten Vorlagen als Lieferweg-Nachweis |
| Manifest | `scripts/check-manifest.sh:18` `SHIPPED_DIRS` enthält kein Root-`scripts/` | neuer Guard braucht **keine** Manifest-Zeile (wie `check-leser-marker.sh`) [Certain]; Vorlagen stehen schon drin (`specwright/manifest.tsv:194-196`, README :183) |
| Workflows | `specwright/workflows/core/intent.md:85-90` (WRITE Frontmatter), `spec.md:52-67` (Step 3 WRITE), `plan.md:119-125` (Step 9a WRITE); Frontmatter-Versionen `plan.md` 1.2, `intent.md` 1.2, `spec.md` 1.1 | je ein Satz Übernahme-Regel, Workflow-Version +0.1 |
| Platzhalter der Reservierung | `specwright/scripts/next-intent-id.sh:115-123` schreibt Mini-Kopf mit `version: "0.0.0"` | wird von `/intent` im selben Schritt überschrieben → nicht betroffen |
| Vorlagen-README | `specwright/templates/sdlc/README.md` (Abschnitt „Zwei Leser je Dokument" als Vorbild) | neuer Abschnitt `## Formatversion` = Regeltext (AK-04, AK-05) |
| Versionen | `VERSION:1` = 4.1.1, `install.sh:18` `FRAMEWORK_VERSION="4.1.1"`; `CHANGELOG.md:3` letzter Eintrag 4.1.1 (INT-009 hob Vorlagenänderung auf 4.1.0, `9c7e5c1`) | Sprung auf 4.2.0, beide Stellen synchron |
| CLAUDE.md Befehlstabelle | `CLAUDE.md` Zeile „Installer gegen lokalen Stand": erwartet „T1–T5 grün", tatsächlich „T1–T7" | auf „T1–T8" ziehen (gleiche Zeilenzahl) |
| Kollisionen | `grep -l "^format:\|\*\*Format:\*\*" intent/*/*.md` → kein Treffer; nur zwei fremde Skill-Dateien unter `templates/skills/` | keine Bestandsdatei trägt das Feld schon [Certain] |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

**Ort und Form der Angabe (AK-01):**

- `intent-template.md`: YAML-Feld `format: "1.0"  ` direkt unter `intent_id`; in Anführungszeichen (sonst liest YAML `1.0` als Zahl und `1.10` als `1.1`). Zeile „Felder im Kopf": `format` | Formatversion der Vorlage, aus der die Datei entstand; nie von Hand setzen oder erhöhen; Regel `templates/sdlc/README.md` „Formatversion" | `"1.0"`. In der Zeile `version` den Zusatz „Fassung dieser Absicht, nicht der Vorlage".
- `spec-template.md`, `plan-template.md`: neue letzte Kopfzeile `> **Format:** 1.0` (nach „Gelesene Projekt-Docs" bzw. „Pflichtinput gelesen").
- Maschinenlesbare Formen, die README nennt: intent `^format:\s*"(\d+)\.(\d+)"`, spec/plan `^>\s*\*\*Format:\*\*\s*(\d+)\.(\d+)\s*$`, jeweils im Kopf (vor der ersten `##`-Überschrift).

**Regel (AK-04, AK-05) — neuer Abschnitt `## Formatversion` in `specwright/templates/sdlc/README.md`:**

- Wo die Angabe steht (beide Formen, s. o.), aktueller Stand `1.0`, eine gemeinsame Nummer für alle drei Vorlagen.
- Hauptnummer steigt, wenn eine bestehende Datei nach der neuen Vorlage nicht mehr gültig wäre oder ein Leser sie anders auslesen müsste: Abschnitt entfernt oder umbenannt, Pflichtfeld neu, Kennungsschema geändert. Nebennummer steigt bei Ergänzungen, die alte Leser ignorieren können (neuer optionaler Abschnitt, neues optionales Kopffeld). Reine Formulierungen (Hinweiskommentare, Platzhaltertexte, Beispiele) ändern die Nummer nicht.
- Eine Datei ohne Formatangabe gilt als „vor Format 1".
- Die Nummer einer Datei bleibt, wenn die Vorlage später steigt; nur wer die Datei bewusst auf die neue Fassung umschreibt, setzt die neue Nummer. Kein Nachtragen in Bestandsdateien.
- Wer eine Vorlage ändert: entscheidet nach dieser Regel, hebt alle drei Vorlagen gemeinsam an und schreibt einen Eintrag unter `### Format` im CHANGELOG. Guard `scripts/check-vorlagen-format.sh` prüft Vorhandensein, Form und Gleichheit, nicht die Einstufung.
- Leser (Software Factory) legen sich auf die Hauptnummer fest.

**Übernahme beim Schreiben (AK-02):** je ein RULE-Satz in den drei Workflows: „Formatangabe der verwendeten Vorlage unverändert übernehmen (intent: Kopf-Feld `format`; spec/plan: Kopfzeile `> **Format:**`); nie selbst setzen oder erhöhen. Trägt die verwendete Vorlage (Hybrid-Lookup Projekt → `~/.specwright`) keine Angabe, bleibt sie weg (Datei gilt als vor Format 1)." Plus Workflow-Version +0.1.

**Guard (AK-03) — `scripts/check-vorlagen-format.sh`** (Bash 3.2, awk, kein `mapfile`):

- Ordner `${FORMAT_TEMPLATE_DIR:-specwright/templates/sdlc/vorhaben}`, Dateien `intent-template.md`, `spec-template.md`, `plan-template.md`.
- intent: zwischen erstem und zweitem `---` genau eine Zeile `format: "X.Y"` (X, Y Ziffernfolgen). spec/plan: vor der ersten `## `-Zeile genau eine Zeile `> **Format:** X.Y`.
- Rot (Exit 1, `❌ datei:zeile …` bzw. `❌ datei: keine Formatangabe im Kopf`): fehlt, mehrfach, falsche Form, oder die drei Werte sind nicht **identisch** (Meldung nennt alle drei Werte). Grün: `✅ Vorlagen-Format: 3 Vorlagen auf 1.0.`
- Strenger als AK-03 (dort nur Hauptnummer) — folgt aus OF-02 „eine gemeinsame Nummer".
- In `verify.sh` Stufe 2 **ohne** `[[ -f … ]]`-Vorbedingung, damit ein gelöschter Guard rot wird.

**Änderungshistorie (AK-06):** `CHANGELOG.md` neuer Eintrag `## 4.2.0 - [Datum]` mit erstem Unterabschnitt `### Format` („**Format 1.0 eingeführt** …: Felder, Regel, Dateien ohne Angabe = vor Format 1") und `### Neu` (Guard, T8). Unter `# Changelog` ein Hinweissatz: „Formatänderungen der Vorhaben-Vorlagen stehen je Release unter `### Format` (Regel: `specwright/templates/sdlc/README.md`, Abschnitt Formatversion)." `VERSION` und `install.sh:18` auf `4.2.0`.

**UI unverändert (AK-07):** nur Tests (§8).

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Formatangabe in die bestehende `> **Status:**`-Zeile (z. B. `· **Format:** 1.0`) | RB-01: Status-Zeile darf sich nicht ändern; `boundNote` schneidet zwar am ` · `, aber jeder Statuswechsel im Build (`Status: umgesetzt …`) schreibt diese Zeile neu und könnte die Angabe verlieren. |
| Werkzeugversion `VERSION` als Formatnummer nutzen | genau das Problem aus intent §1: steigt bei UI-/Installer-Änderungen, Factory müsste jede Version nachvollziehen. |
| Je Vorlage eigene Nummer | OF-02 entschieden: eine gemeinsame Nummer. |
| Prüfung in `check-leser-marker.sh` einbauen | Guard hat einen klaren Zweck (Marker) und eine Soll-Tabelle als Wahrheit; Vermischung erschwert beide Fehlermeldungen. Eigener Guard kostet ~50 Zeilen und folgt demselben Muster. |
| Guard prüft auch, dass CHANGELOG einen `### Format`-Eintrag zur aktuellen Nummer hat | AK-06 ist Review; Kopplung CHANGELOG ↔ Guard wäre neu und bricht bei Nebeneinträgen leicht. Minimal halten. |
| Guard prüft Dokumente in `intent/` auf gültige Formatangabe | NZ-02 (keine Bestandsänderung), Dokumente ohne Angabe sind gültig (AK-05); kein Nutzen für AK-01–AK-03. |
| ADR für das Versionsschema | ADR-Pflicht laut `CLAUDE.md` bei Datenhaltung, Lieferkette (Installer/Manifest), Auth, MCP — nichts davon ändert sich; Schema-Entscheidungen stehen in intent OF-01/OF-02, Regel im README. |
| Formatangabe in der Web-UI anzeigen | NZ-05. |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Nein** — bleibt innerhalb von `docs/architecture.md`. AR-01 eingehalten (keine neue ausgelieferte Datei; Root-`scripts/` ist kein Lieferverzeichnis, `check-manifest.sh:18`). AR-06 eingehalten (Framework-Änderung hängt nicht an der UI; UI liest nur, Tests lesen die Vorlagen). AR-07 eingehalten. Kein ADR. §9 Drift-Erkennung listet nur AR-Guards; der Format-Guard prüft keine AR-Regel (wie `check-leser-marker.sh`, das dort auch nicht steht) → keine Änderung.
- `security.md` §6: kein Endpunkt, kein Datenobjekt, kein externes System, nichts Personenbezogenes; öffentliches Repo — Inhalt ist reine Vorlagenstruktur.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `specwright/templates/sdlc/vorhaben/intent-template.md` | ändern | Feld `format: "1.0"  ` unter `intent_id`; Tabellenzeile `format`; Zusatz bei `version` | AK-01 |
| 2 | `specwright/templates/sdlc/vorhaben/spec-template.md` | ändern | Kopfzeile `> **Format:** 1.0` als letzte Kopfzeile | AK-01 |
| 3 | `specwright/templates/sdlc/vorhaben/plan-template.md` | ändern | Kopfzeile `> **Format:** 1.0` als letzte Kopfzeile | AK-01 |
| 4 | `specwright/templates/sdlc/README.md` | ändern | Abschnitt `## Formatversion` (Regel, Formen, vor Format 1, Pflege) | AK-04, AK-05 |
| 5 | `specwright/workflows/core/intent.md` | ändern | Step 4 WRITE: Bullet Übernahme `format`; `version` 1.2 → 1.3 | AK-02 |
| 6 | `specwright/workflows/core/spec.md` | ändern | Step 3: RULE Übernahme Kopfzeile; `version` 1.1 → 1.2 | AK-02 |
| 7 | `specwright/workflows/core/plan.md` | ändern | Step 9a: Bullet Übernahme Kopfzeile; `version` 1.2 → 1.3 | AK-02 |
| 8 | `scripts/check-vorlagen-format.sh` | neu | Guard (s. §3) | AK-03 |
| 9 | `scripts/verify.sh` | ändern | Stufe 2: `run "check-vorlagen-format" bash scripts/check-vorlagen-format.sh` | AK-03 |
| 10 | `scripts/test-installers.sh` | ändern | T8 (a–e), Kopfkommentar, Schlusszeile „T1–T8" | AK-01, AK-03 |
| 11 | `ui/tests/unit/vorhaben-reader.test.ts` | ändern | Tests AK-07 (s. §8) | AK-07 |
| 12 | `CHANGELOG.md` | ändern | Hinweissatz oben; `## 4.2.0` mit `### Format` und `### Neu` | AK-06 |
| 13 | `VERSION`, `install.sh:18` | ändern | 4.1.1 → 4.2.0 | Konvention `CLAUDE.md` „Lieferumfang" |
| 14 | `CLAUDE.md` | ändern | Befehlstabelle: „T1–T5" → „T1–T8" | Folge aus #10 |
| 15 | `intent/INT-2026-031-vorlagen-formatversion/{intent.md,plan.md}` | ändern | `bezuege.plan`, Status-Pflege, §14 | Ablauf |

**Nicht betroffen (ausdrücklich):** `ui/src/server/services/vorhaben-reader.ts` (kein Code), `specwright/scripts/next-intent-id.sh` (Platzhalter wird überschrieben), `scripts/check-leser-marker.sh` (Format-Zeilen sind keine Überschriften), `specwright/manifest.tsv` und `removed.tsv` (keine neue/entfernte ausgelieferte Datei), Installer-Skripte (lesen das Manifest), `docs/architecture.md`, `templates/sdlc/projekt/*` und Hooks (NZ-04), alle Dateien unter `intent/` außer INT-2026-031 (NZ-02), `workflows/core/build.md` (setzt nur Status, berührt Kopf-Format nicht).

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `verify.sh` | `check-vorlagen-format.sh` | Aufruf | `run "check-vorlagen-format" bash scripts/check-vorlagen-format.sh` | `grep -n "check-vorlagen-format" scripts/verify.sh` + `bash scripts/verify.sh --fast` zeigt `✅ check-vorlagen-format` | — |
| `check-vorlagen-format.sh` | drei Vorlagen | Datei lesen | `FORMAT_TEMPLATE_DIR`, Formen aus §3 | `bash scripts/check-vorlagen-format.sh` → `✅ Vorlagen-Format: 3 Vorlagen auf 1.0.` | — |
| `test-installers.sh` T8 | `check-vorlagen-format.sh` | Aufruf mit Env | `FORMAT_TEMPLATE_DIR="$t8"` | `bash scripts/test-installers.sh` → `✅ T8 …` (5 Zeilen) | — |
| Manifest/Installer | installierte Vorlagen | Lieferung | `manifest.tsv:194-196` (unverändert) | T8(e): Guard grün auf `$t1/specwright/templates/sdlc/vorhaben` | — |
| Workflows intent/spec/plan | Vorlagen | Anweisung | RULE-Satz „Formatangabe … übernehmen" | `grep -n "Formatangabe" specwright/workflows/core/{intent,spec,plan}.md` → 3 Treffer | — |
| Vorlagen | `vorhaben-reader.ts` | Datei lesen | `parseIntentHead`, `parseStatusLine` | Vitest `vorhaben-reader.test.ts` (neue Fälle) | — |
| README „Formatversion" | Vorlagen, Guard, CHANGELOG | Verweis | Pfade im Text | `grep -n "check-vorlagen-format\|### Format" specwright/templates/sdlc/README.md` | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. Lesende Vorprüfung: `git fetch && git log HEAD..origin/main --oneline` (keine Änderung an Vorlagen/verify seit 568bef5); `grep -rn "format:" ui/src/server` (kein anderer Leser, der `format` anders deutet); `grep -rln "> \*\*Status:\*\*" ui/src` (nur `vorhaben-reader.ts`) → prüfbar durch leere/erwartete Ausgaben.
1. UI-Tests (#11) zuerst schreiben, gegen die **echten** Vorlagen laufen lassen → grün schon vorher (Leser liest Vorlagen heute), bleibt grün nach Schritt 2.
2. Vorlagen #1–#3 → `bash scripts/check-leser-marker.sh` grün, `npx vitest run tests/unit/vorhaben-reader.test.ts` grün.
3. Guard #8 + verify #9 → `bash scripts/check-vorlagen-format.sh` grün; von Hand: Zeile in Kopie entfernen → rot.
4. T8 #10 → `bash scripts/test-installers.sh` endet `✅ Installer-Test: T1–T8 grün`.
5. README #4, Workflows #5–#7, CHANGELOG #12, Version #13, CLAUDE.md #14 → `bash scripts/check-manifest.sh` grün, `wc -l CLAUDE.md` ≤ 90.
6. Verbindungen nachweisen (§5).
7. `bash scripts/verify.sh` → `verify: OK`; PR, CI grün.

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Etwa 2–3 h Arbeit, Guard, Test und Vorlagen hängen an derselben Kopfform (§3); Teilen brächte nur Integrationsaufwand.

#### Variante B — parallel in Worktrees

<!-- leser: agent -->

Entfällt.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01 | Guard grün auf echten Vorlagen, nennt `1.0`; T8(a) grün auf Kopien | `scripts/check-vorlagen-format.sh`, `scripts/test-installers.sh` T8 | Guard / Integration |
| AK-01 | T8(e) Guard grün auf den von T1 installierten Vorlagen (Lieferweg) | `scripts/test-installers.sh` T8 | Integration |
| AK-02 | Stichprobe: Workflow-Text nennt Übernahme (grep §5); erste echte `/intent`-Datei nach Merge trägt `format: "1.0"` (§10) | Workflows; nächstes Vorhaben | Stichprobe |
| AK-03 | T8(b) Formatzeile in spec-Kopie entfernt → rot, nennt `spec-template.md`; T8(c) plan-Kopie `2.0` → rot; T8(d) intent-Kopie `format: "1"` → rot | `scripts/test-installers.sh` T8 | Integration |
| AK-04, AK-05 | Regeltext im README enthält Haupt-/Nebenregel mit den drei Beispielen und „vor Format 1" | `specwright/templates/sdlc/README.md` | Review |
| AK-06 | `grep -n "^### Format" CHANGELOG.md` → Treffer unter `## 4.2.0` | `CHANGELOG.md` | Review |
| AK-07 | `parseIntentHead` mit und ohne `format: "1.0"` liefert identisches Ergebnis; `parseStatusLine` mit zusätzlicher `> **Format:** 1.0`-Zeile liefert identisches Ergebnis; die drei echten Vorlagen (über `new URL('../../../specwright/templates/sdlc/vorhaben/…', import.meta.url)`) werden nicht `null` gelesen | `ui/tests/unit/vorhaben-reader.test.ts` | Unit |

- **Verify-Befehl:** `bash scripts/verify.sh` → `verify: OK`, Ausgabe im PR. **CI ist die Wahrheit.** Bezugsliste `ui/tests/known-failures.txt` wird nicht angefasst.
- **Datenkorrektur:** entfällt (keine Bestandsdaten, NZ-02).
- **Angeschlossen (E2E-Pfad):** Vorlage im Repo → Manifest → `install.sh` (T1) → installierte Vorlage → Guard grün (T8e); dazu echte Vorlage → `vorhaben-reader` (Vitest). Protokoll: Ausgabe von `test-installers.sh` und `verify.sh` im PR.
- **Bugfix:** entfällt.
- **UI:** keine sichtbare Änderung, kein Screenshot.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| Projekt mit lokal geänderten Vorlagen behält beim Update die alten (Hybrid-Lookup nimmt Projektvorlage zuerst) → neue Dateien ohne Angabe | mittel | niedrig | Regel: ohne Angabe = vor Format 1; Workflow erfindet keine Angabe | Software Factory beim Lesen |
| Spätere Vorlagenänderung ohne Nummernanhebung | mittel | mittel | Guard fängt nur Ungleichheit; README-Regel + Review des Vorhabens; Workflow `plan` verweist bei Vorlagenänderung auf README | Review / Factory |
| Verwechslung `version` (Fassung der Absicht) mit `format` (Fassung der Vorlage) | niedrig | niedrig | Erklärtabelle in der Intent-Vorlage | Michael beim Lesen |
| UI-Test liest echte Vorlagen über relativen Pfad → bricht, wenn Vorlagen verschoben werden | niedrig | niedrig | gewollt: Verschieben der Vorlagen soll auffallen | CI |
| Agent schreibt Formatzeile in die Status-Zeile oder ändert sie beim Statuswechsel | niedrig | niedrig | eigene Zeile, Workflow-Regel „unverändert übernehmen" | Factory / Review |

Rückweg: Revert der PR; Dateien, die zwischenzeitlich mit `format` entstanden, bleiben gültig (UI ignoriert das Feld).

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| PR reviewen und mergen (`gh pr merge`, Michaels Schritt; Merge löst Auto-Deploy der UI aus, UI-Code ist unverändert) | Michael | nach CI grün | [ ] |
| Stichprobe AK-02: Kopf der ersten nach dem Merge mit `/intent` (und später `/spec`, `/plan`) erzeugten Datei prüfen — `grep -n '^format:' intent/INT-…/intent.md` bzw. `grep -n '\*\*Format:\*\*' …/plan.md` | Agent der nächsten Intent-/Plan-Sitzung, Ergebnis im Bericht | nächstes Vorhaben nach Merge | [ ] |
| Software Factory über Format 1.0 informieren (Issue software-factory#28) — außerhalb dieses Vorhabens (NZ-03) | Michael | nach Merge | [ ] |

### 11. Schätzung

<!-- leser: mensch -->

2–3 h. Unsicherheit gering; größter Posten ist T8 im Installer-Test (Bash-3.2-Muster, ein lokaler Lauf ~1 min) und ein vollständiger `verify`-Lauf (~2 min, Stufe 5 auf dem Mac gelegentlich flaky, siehe Memory).

### 12. Review des Plans

<!-- leser: mensch -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| F1, Guard-Strenge: AK-03 verlangt nur gleiche Hauptnummer, OF-02 eine gemeinsame Nummer | Self | angenommen: Guard verlangt identische Nummer, weil eine gemeinsame Nummer sonst auseinanderlaufen dürfte | §3 Ansatz, „In einfachen Worten" |
| F2, Diese `plan.md` entsteht vor der Änderung aus der alten Vorlage und trägt keine Formatangabe | Self | angenommen ohne Änderung: konsistent mit NZ-02 und der Regel „Datei ohne Angabe = vor Format 1"; kein Sonderfall | — |
| F3, `CLAUDE.md` erwartet „T1–T5", Ausgabe ist schon „T1–T7" | Self | angenommen: auf „T1–T8" ziehen, sonst widerspricht die Befehlstabelle dem neuen Test | §4 #14 |
| F4, Formatangabe in der Status-Zeile wäre die kleinste Änderung | Self | abgelehnt: RB-01 und Statuswechsel im Build schreiben die Zeile neu | §3 verworfene Alternativen |
| F5, Hybrid-Lookup kann ältere Projektvorlage ohne Angabe liefern | Self | angenommen: Workflow-Regel „keine Angabe erfinden" | §3 Übernahme, §9 |
| F6, Versionssprung nötig? | Self | angenommen: 4.2.0, ausgelieferte Vorlagen ändern sich (Präzedenz INT-2026-009 → 4.1.0) | §4 #13 |
| F7, Neue Datei ohne Manifest-Zeile bricht `verify`? | Self | geprüft: Root-`scripts/` liegt nicht in `SHIPPED_DIRS` (`check-manifest.sh:18`), keine Zeile nötig | §2, §3 |

**Minimalinvasiv geprüft:** Kein UI-Code; Guard folgt dem Muster von `check-leser-marker.sh` (Env-Override, `err`, ✅-Zeile), Test T8 dem Muster von T7 und nutzt die T1-Installation wieder statt eines eigenen Installationslaufs; README-Abschnitt nach dem Vorbild „Zwei Leser je Dokument". Gestrichen: CHANGELOG-Prüfung im Guard, Prüfung der Bestandsdokumente, ADR, UI-Anzeige.

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am 2026-10-06: ohne Befund (R4)

### 13. Definition of Done

<!-- leser: agent -->

- [x] Jede FA/AK aus Abschnitt 8 hat einen grünen Test.
- [x] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [x] E2E-Pfad läuft (Abschnitt 8).
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün (CI ist die Wahrheit).
- [x] `docs/architecture.md` angepasst, falls Abschnitt 3 „Ja" (hier: Nein).
- [x] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [x] Abweichungen von diesem Plan in Abschnitt 14 eingetragen.
- [x] 2x-Regel-Check: Fehler, der zum zweiten Mal vorkam → Vorschlag für `CLAUDE.md` im PR.
- [ ] Abschlussbericht nach R3 (nur Mensch-Abschnitte im Chat), endet mit dem Block „Für das Board" (Karte, Spalte, PR-Link, Stand, Verweis auf `intent/INT-2026-031-vorlagen-formatversion/`); Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-10-06 | Workflow `plan` Step 9a bekommt zusätzlich zum Übernahme-Satz den Halbsatz „Ändert der Plan eine Vorhaben-Vorlage, entscheidet er die neue Nummer nach der Regel im README" | §9 nennt diesen Verweis als Gegenmaßnahme zu „Vorlagenänderung ohne Nummernanhebung", §4 #7 hatte ihn nicht | §4 #7 |
| 2026-10-06 | Worktree ohne `node_modules`: `npm ci` in `ui/` und `ui/frontend`, `chmod +x` für node-pty vor Schritt 1 | bekannte Worktree-Falle (`CLAUDE.md`, Memory), keine Planänderung | — |
