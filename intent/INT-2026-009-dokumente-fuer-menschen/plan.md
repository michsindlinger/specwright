# Plan INT-2026-009: Dokumente für Menschen — Leser-Kennzeichnung und Rückfragen mit Kontext

> **Intent:** `intent/INT-2026-009-dokumente-fuer-menschen/intent.md` (angenommen 16.09., Bypass: Größe S) · **Spec:** entfällt
> **Status:** umgesetzt (Merge steht aus; Fassung 2 nach externem Review, 3 Reviewer, 24 Findings, §12) · **Erstellt:** 2026-09-16 im Plan Mode · **Freigabe:** Product Owner (Michael Sindlinger), 2026-09-16 („freigabe", Chat)
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand `4c97b63`, §2 Vorlagen/Workflows, AR-01, AR-06, AP-02), `CLAUDE.md` (Konventionen Lieferumfang, Manifest, Bash 3.2), `docs/security.md` §5/§6 (Lieferumfang → Manifest-Zeile, Guard grün)
> **Branch:** `feat/INT-2026-009-dokumente-fuer-menschen` ab `4c97b63` (die beiden Intent-Commits wandern mit), Worktree `../specwright-worktrees/session-sdlc-ui`

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Wenn ein Vorhaben durch Absicht, Spec und Plan läuft, entstehen drei Dokumente. Michael liest sie, um zu entscheiden: Ist die Absicht richtig verstanden? Passt der Plan? Beim Lesen stolpert er heute über zwei Dinge. Erstens stehen in den Dokumenten lange Teile, die nur der Agent beim Bauen braucht: Dateipfade mit Zeilennummern, Tabellen mit Verbindungen zwischen Programmteilen, Testpläne. Für Michaels Entscheidung tragen die nichts bei, er muss sie überspringen. Zweitens stellt der Agent seine Rückfragen mit einem Kürzel wie „OF-03 bestätigen?", und weil ein Dokument Dutzende solcher Kürzel hat, scrollt Michael zurück, um nachzusehen, worum es überhaupt geht.

**Was ändert sich?** Danach steht in jedem Abschnitt der drei Vorlagen eine unsichtbare Notiz, für wen er gedacht ist: „Mensch" oder „Agent". Unsichtbar heißt: In MacDown, auf GitHub und in der Web-UI sieht man die Notiz nicht, nur wer die Rohdatei öffnet, findet sie. Sie ändert am Dokument selbst nichts, sie ist ein Etikett. Die Web-UI kann diese Etiketten später benutzen, um die Agenten-Teile zuzuklappen (das ist das nächste Vorhaben INT-2026-010). Dazu kommen drei Regeln, die für alle vier Befehle gelten: Jede Rückfrage, die sich auf ein Kürzel bezieht, nennt das Kürzel und in einem Satz, worum es geht, mit Vorschlag, so dass Michael aus dem Chat heraus antworten kann. Wenn der Agent ein Dokument vorlegt oder am Ende einer Bausitzung berichtet, erzählt er im Chat nur den Menschen-Teil und verweist für den Rest auf die Datei. Und bevor Michael freigibt, prüft der Agent, ob der Menschen-Teil noch zu dem passt, was im Agenten-Teil steht, und trägt das Ergebnis dieser Prüfung sichtbar ins Dokument ein, damit man später sieht, dass sie stattgefunden hat. Die Plan-Vorlage bekommt außerdem den Teil „In einfachen Worten" fest eingebaut, den die Pläne bisher nur aufgrund einer Regel in Michaels persönlicher Konfiguration hatten. Alte Dokumente ohne Etiketten bleiben gültig, niemand muss sie nachbearbeiten.

**Wie wird das gemacht?** Das Etikett ist ein Kommentar im Markdown, immer die erste Zeile direkt unter einer Überschrift. Kommentare dieser Art gibt es in den Vorlagen schon lange, sie tragen die Ausfüllhinweise, und alle Anzeigeprogramme blenden sie aus. Neu ist nur, dass das Etikett ein festes Format und einen festen Platz hat, damit ein Programm es sicher erkennt. Welche Abschnitte „Mensch" sind, folgt aus der Absicht: alles, worüber Michael entscheidet, also Kurzfassung, Ziele, Abnahmekriterien, offene Fragen, Annahmen, Risiken, Review-Entscheidungen, manuelle Schritte und Abweichungen. „Agent" sind die Teile mit Dateien, Verbindungen, Reihenfolgen, Tests, Checklisten und die Erklärtabellen der Vorlagen selbst. Für ein fertiges Dokument gilt: Entweder es hat gar keine Etiketten (dann ist alles „Mensch", so wie bei allen bisherigen Vorhaben), oder jede Hauptüberschrift hat eins. Halb etikettierte Dokumente lehnt die Prüfung ab, damit nicht aus Versehen ein Agenten-Teil als Menschen-Teil durchgeht.

Die drei Regeln für Rückfragen, Vorlegen und Abgleich stehen einmal in einer gemeinsamen Datei, die alle vier Befehle am Anfang laden, so wie sie heute schon eine gemeinsame Datei mit der Vorlagen-Suche laden. In den vier Befehlen selbst steht an jeder Stelle, an der gefragt, vorgelegt oder freigegeben wird, ein Verweis darauf. Ein kleines Prüfskript sichert das Ganze ab. Es kennt für jede der drei Vorlagen die vollständige Liste „welche Überschrift bekommt welches Etikett" und schlägt Alarm, wenn die Vorlage davon abweicht. Diese Liste im Skript ist die einzige Stelle, an der die Zuordnung festgeschrieben ist; die Vorlagen müssen ihr entsprechen. Dasselbe Skript prüft auch alle bestehenden Vorhaben-Dokumente und akzeptiert dort, dass gar kein Etikett vorhanden ist. Das Skript läuft in der Prüfkette, die vor jeder Fertigmeldung und in der CI läuft. Weil die Vorlagen an installierte Projekte ausgeliefert werden, steigt die Versionsnummer von 4.0.2 auf 4.1.0, damit der Update-Befehl die neuen Vorlagen dort auch anbietet.

Geprüft wird das Ganze nicht mit einem künstlichen Testlauf, sondern an der ersten echten Verwendung: Direkt nach dem Umbau läuft auf demselben Branch der Befehl `/spec INT-2026-010` für das UI-Vorhaben bis zum Vorlegen. Dabei zeigt sich, ob der Agent die Etiketten in die neue Spec übernimmt, ob seine Rückfragen den Gegenstand nennen und ob er nur den Menschen-Teil vorträgt. Das Ergebnis wird als Protokoll abgelegt; die Spec selbst bleibt ein Entwurf, den die nächste Sitzung fertigstellt.

**Was kann schiefgehen?** Drei Dinge. Erstens könnte der Agent die Regeln ignorieren, denn sie sind Text, keine Technik; das Prüfskript kontrolliert die Vorlagen und Dokumente, nicht das Verhalten im Chat. Michael merkt das an der nächsten Rückfrage ohne Kontext, und dann wird die Regel an der betreffenden Stelle im Befehl nachgeschärft. Zweitens könnte die Plan-Vorlage mit dem neuen Teil oben die Nummerierung der bestehenden Pläne durcheinanderbringen; deshalb bleiben die Abschnittsnummern 1 bis 14 unverändert, nur die Überschriften rutschen eine Ebene tiefer, wie es der jüngste Plan INT-2026-008 schon macht, und ein Prüfschritt sucht vorher alle Stellen, die diese Überschriften lesen. Drittens könnte ein Projekt, das die Vorlagen selbst angepasst hat, beim Update eine Meldung bekommen; das ist das gewohnte Verhalten des Update-Befehls, er ersetzt nichts, was verändert wurde. Rückgängig geht mit einem Revert der PR; die Arbeit ist in drei getrennte Commits geschnitten (Etiketten und Regeln, Umbau der Plan-Vorlage, Versionssprung), so dass jeder Teil einzeln zurückgenommen werden kann. Dokumente, die bis dahin mit Etiketten entstanden sind, bleiben lesbar, die Etiketten sind dann nur wirkungslos.

**Was musst du entscheiden?** Nichts, Freigabe reicht. Vier Dinge sind gesetzt, sag Bescheid, falls du anders willst: Das Etikett heißt `leser: mensch` oder `leser: agent` und steht als Markdown-Kommentar direkt unter der Überschrift. Ohne Etikett gilt ein Dokument als „Mensch"; halb etikettiert gilt als Fehler. Die Prüfung an der ersten echten Verwendung erzeugt einen Spec-Entwurf für INT-2026-010, der mit in die PR geht. Und die Versionsnummer springt auf 4.1.0.

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: mensch -->

Die drei Vorhaben-Vorlagen bekommen als erste Zeile unter jeder Überschrift (Ebenen `##`–`####`) einen Marker `<!-- leser: mensch -->` oder `<!-- leser: agent -->`; die plan-Vorlage erhält zusätzlich die Struktur `## In einfachen Worten` → `## Details` → `### 1.…14.` (wie INT-2026-008). Die Regeln R1–R4 (Marker, Rückfragen mit Kontext, Vorlegen nur mit dem Mensch-Teil, Abgleich mit sichtbarem Eintrag) stehen einmal in `specwright/workflows/meta/leser-und-rueckfragen.md`, geladen von den vier Kern-Workflows und an jeder ASK/PRESENT/WAIT-Stelle referenziert. Ein Guard `scripts/check-leser-marker.sh` trägt die vollständige Soll-Zuordnung je Vorlage (einzige Wahrheit), prüft die Vorlagen dagegen und prüft Dokumente auf „keine Marker oder alle Hauptüberschriften markiert". Er hängt in `verify.sh` und `test-installers.sh` (T7). E2E ist die erste echte Sitzung `/spec INT-2026-010` auf dem Branch. Version 4.0.2 → 4.1.0 in eigenem Commit. Kein UI-Code, keine AR-Änderung.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Vorlagen | `specwright/templates/sdlc/vorhaben/intent-template.md` (15 Überschriften `##`; Kopf-Tabelle „Felder im Kopf" :29-40; Kern/Vertragsschicht nur als Kommentar :41-45), `spec-template.md` (11 Überschriften: 10 × `##`, 1 × `###` „Ablauf A"), `plan-template.md` (19 Überschriften: 14 × `##`, 5 × `###` unter §3 und §7; **ohne** „In einfachen Worten") | **[Certain]** HTML-Kommentare sind dort bereits das Mittel für Ausfüllhinweise; sie stehen heute direkt unter der Überschrift → Marker muss davor, als erste Zeile. Zahlen aus `grep -cE '^#{2,4} '`. |
| Workflow-Einstieg | `specwright/workflows/core/{intent,spec,plan,build}.md`: alle laden `specwright/workflows/meta/pre-flight.md` per `<pre_flight_check> EXECUTE …` (`intent.md:22-24`, `spec.md:20-22`, `plan.md:22-24`, `build.md:23-25`); `pre-flight.md` im Manifest (`manifest.tsv:333`, `workflow project`) | **[Certain]** Muster für eine gemeinsame Regeldatei: zweite EXECUTE-Zeile im selben Block. Es gibt keinen Laufzeit-Mechanismus dahinter, Claude liest die Anweisung; Nachweis nur per grep und in der echten Sitzung (§8). |
| Frage- und Vorlege-Stellen | `intent.md` Step 2 „gespraech" (ASK :44-54), Step 4 „schreiben" (:76-88), Step 5 „vorlegen" (PRESENT/WAIT :92-99), Step 6 „freigabe" (:103-113); `spec.md` Step 3 „schreiben" (:48-64), Step 5 „vorlegen_und_freigabe" (PRESENT/WAIT :88-98); `plan.md` Step 7 „review" (Findings → plan.md §12, :99-103), Step 9a (WRITE/PRESENT :119-124), Step 9b (WAIT/Freigabe :126-130); `build.md` Step 3 „umsetzen" (Abweichung → §14, :63-71), Step 6 „pr_und_status" (Abschlussbericht :107-116) | **[Certain]** Zehn Stellen, je eine RULE-Zeile. Workflow-Step-Nummern ≠ Dokument-§: „plan.md Step 7" ist der Review-Schritt des Workflows, seine Findings landen in `plan.md` §12. |
| „In einfachen Worten" | nur im `plan.md`-Workflow (`:120`, `:124`), nicht in der Vorlage; Pläne 002–007: `## In einfachen Worten` + `## 1.`; Plan 008: `## In einfachen Worten` + `## Details` + `### 1.` + `####` für Unterabschnitte | **[Certain]** Vorlage nachziehen, Struktur wie 008 (wörtlich die globale Plan-Regel „`## Details`"). §-Nummern bleiben; UI-Anker (`vorhaben-anchors.ts:32` `NUMBERED_HEADING_RE`) sind ebenenunabhängig. Konsumenten der Überschriften: Schritt 0 in §6. |
| UI-Renderer | `ui/frontend/src/components/vorhaben/vorhaben-markdown.ts:87` `renderDocument`, marked 17, kein Sanitizer (kein DOMPurify in `components/vorhaben/*`, `utils/markdown-renderer.ts`) | **[Certain]** HTML-Kommentare gehen als Roh-HTML durch, im DOM unsichtbar. Nichts zu ändern (NZ-01). |
| Guards und Verify | `scripts/verify.sh:27-32` Block „[2/6] Guards" (`[[ -f … ]] && run …`); `scripts/check-manifest.sh` (Bash 3.2, `set -uo pipefail`, `err()`); `scripts/test-installers.sh` T5/T6 (Guard rot bei manipulierter Kopie, `awk` bereits im Einsatz) | **[Certain]** Guard nach demselben Muster, Kern in `awk` (POSIX, kein `mapfile`). `scripts/` im Root ist kein Lieferverzeichnis (`SHIPPED_DIRS`), keine Manifest-Zeile. |
| Lieferumfang und Version | `VERSION` = `4.0.2`, `install.sh:18` `FRAMEWORK_VERSION="4.0.2"`, Guard (e) prüft Gleichheit; `check-update.sh:27,40` vergleicht `.installed-version` mit `VERSION` → ohne Sprung bietet kein Projekt das Update an; `ceb0850` (4.0.2) war ein reiner Workflow-Fix mit Sprung | **[Certain]** Minor-Sprung 4.1.0 nötig; kein Bruch (AP-02), keine `removed.tsv`-Zeile. |
| Bestehende Dokumente | 9 `intent.md`, 3 `spec.md`, 7 `plan.md` unter `intent/`, keine enthält `leser:` | **[Certain]** Guard-Dokument-Modus muss über alle 19 grün sein (AK-07: keine Regression). |
| Kürzel-Familien | `vorhaben-anchors.ts:30` `KENNUNG_RE` (`AK|FA|RB|B|NZ|Z|EK|ER|AN|OF|D|T|AR|AP|V`), Reference Points `F/R/D/O/A` (`~/.claude/CLAUDE.md`) | **[Certain]** R2 nennt genau diese Familien als „Kennung". |
| Blindproben-Rezept | INT-2026-008 (Scratch-Projekt, Haiku, Kopien von Workflow und Vorlage) | **[Certain]** Verworfen für dieses Vorhaben (Review 3/22/23): nicht deterministisch, hoher Aufwand; ersetzt durch echte `/spec INT-2026-010`-Sitzung. |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

1. **Marker-Syntax und Platz (R1).** Genau eine Zeile `<!-- leser: mensch -->` oder `<!-- leser: agent -->` als **erste nicht-leere Zeile nach einer Überschrift** (höchstens eine Leerzeile dazwischen). Nichts anderes darf dazwischenstehen, insbesondere kein Hinweis-Kommentar, keine Tabelle. Guard-Regex: `^<!-- leser: (mensch|agent) -->$`. Ein Marker an anderer Stelle ist ein Fehler.
2. **Geltung und Ebenen.** Ein Marker gilt von seiner Überschrift bis zur nächsten Überschrift gleicher oder höherer Ebene. **Vorlagen:** jede Überschrift der Ebenen `##`, `###`, `####` trägt einen Marker (kein Erben). **Dokumente** (ausgefüllte intent/spec/plan): entweder kein Marker im ganzen Dokument (dann gilt alles als `mensch`, AK-07), oder jede Überschrift der Ebenen `##` und `###` trägt einen; `####` und tiefer dürfen erben (nächster markierter Vorfahr). Teilweise markierte Dokumente sind ein Fehler; der Guard nennt jede unmarkierte Überschrift. Die H1 (`# Absicht: …`, `# Spec: …`, `# Plan …`) trägt keinen Marker.
3. **Soll-Zuordnung, einzige Wahrheit im Guard.** Der Guard trägt je Vorlage eine Tabelle „Überschriften-Präfix → Wert", in dieser Reihenfolge; die Vorlage muss genau diese Überschriften in dieser Reihenfolge mit diesen Werten haben (zusätzliche oder fehlende Überschrift = rot). README und Plan zitieren die Tabelle, definieren sie nicht.
   - **intent-template** (15): `## Felder im Kopf` agent · `## Absicht in drei Sätzen` mensch · `## 1.` bis `## 10.` mensch · `## 11. Entscheidungsrechte` agent · `## 12. Annahmen` mensch · `## Änderungsprotokoll` agent. (Erfüllt AK-03: Kurzfassung, Ziele §3, AK §5, OF §7, AN §12 sind mensch; „alles andere mensch" aus intent.md gilt damit wörtlich.)
   - **spec-template** (11): `## 1. Zusammenfassung` mensch · `## 2. Nutzer und Abläufe` mensch · `### Ablauf A` mensch · `## 3. Fachliche Anforderungen` mensch · `## 4. Fehler- und Randfälle` mensch · `## 5. Daten, fachlich` agent · `## 6. Was der Nutzer sieht` mensch · `## 7. Bedenken aus den Projekt-Docs` agent · `## 8. Nicht im Umfang` mensch · `## 9. Annahmen` mensch · `## 10. Freigabe` agent.
   - **plan-template neu** (21): `## In einfachen Worten` mensch · `## Details` mensch (Container) · `### 1. Kurzfassung` mensch · `### 2. Ausgangslage im Code` agent · `### 3. Entwurf` agent · `#### Ansatz` agent · `#### Verworfene Alternativen` agent · `#### Architektur-Auswirkung` agent · `### 4. Änderungen` agent · `### 5. Verbindungen` agent · `### 6. Reihenfolge der Arbeit` agent · `### 7. Zerlegung` agent · `#### Variante A` agent · `#### Variante B` agent · `### 8. Tests und Nachweis` agent · `### 9. Risiken` mensch · `### 10. Manuelle Schritte` mensch · `### 11. Schätzung` mensch · `### 12. Review des Plans` mensch · `### 13. Definition of Done` agent · `### 14. Abweichungen bei der Umsetzung` mensch.
   - Aus AK-03 folgt die Menge der Pflicht-Mensch-Abschnitte; sie ist Teilmenge dieser Tabellen, es gibt keine zweite Liste.
4. **Gemeinsame Regeldatei** `specwright/workflows/meta/leser-und-rueckfragen.md`:
   - **R1** Marker: Syntax, Platz, Ebenen, Erben, „ohne Marker = mensch"; beim Schreiben eines Dokuments die Marker der Vorlage übernehmen, keinen entfernen; neue `##`/`###`-Überschrift bekommt einen Marker.
   - **R2** Rückfragen mit Kontext: Jede Rückfrage, jeder Vorschlag zur Bestätigung, jede Review-Entscheidung und jede Abweichung, die sich auf eine Kennung bezieht (AK, NZ, OF, AN, FA, RB, B, EK, ER, F/R/D/O/A, Finding-Nr.), hat die Form `KENNUNG, Gegenstand in einem Satz: Vorschlag. Frage?` (Beispiel: „OF-03, Sprache je Projekt sperrbar: Vorschlag Ja, Standard aus. Ok?"). Interviewfragen ohne Kennung (intent Step 2, bevor ein Dokument existiert) nennen ihren Gegenstand ohnehin und brauchen keine Kennung.
   - **R3** Vorlegen und Berichten: Chat-Text gibt nur Mensch-Abschnitte wieder (intent: drei Sätze, §1, §3, §4, §7, §12; spec: §1, §2, §6, §8, §9; plan: „In einfachen Worten", §9, §10, §12; build-Abschlussbericht: plan §1, offene §10, §14, Nachweise als Verweis) und verweist für Agenten-Abschnitte auf die Datei mit Pfad.
   - **R4** Abgleich vor Freigabe: Mensch-Abschnitte gegen Agenten-Abschnitte lesen; jede Abweichung als Rückfrage nach R2; Ergebnis **sichtbar** eintragen: intent Änderungsprotokoll-Zeile der Freigabe-Version („Abgleich Mensch/Agent: ohne Befund" oder „… Befund: …"), spec §10 Checklisten-Punkt „Mensch-Teil gegen Agenten-Teil geprüft (Datum)", plan §12 Zeile „Abgleich Mensch/Agent".
5. **Workflows** (§4 #5–#8): zweite EXECUTE-Zeile im `<pre_flight_check>`; RULE-Zeilen mit „R1/R2/R3/R4 nach `specwright/workflows/meta/leser-und-rueckfragen.md`" an den zehn Stellen aus §2; `plan.md` Step 9a: Struktur aus der Vorlage (In einfachen Worten, Details, `###` 1–14). Frontmatter-Versionen: intent 1.2, spec 1.1, plan 1.2, build 1.2.
6. **Guard** `scripts/check-leser-marker.sh` (Bash 3.2, Kern `awk`):
   - Standardmodus (Vorlagen): für jede der drei Dateien Überschriften `^#{2,4} ` einlesen, je Überschrift die erste nicht-leere Folgezeile prüfen (Marker vorhanden, gültig), Folge (Präfix, Wert) gegen die Soll-Tabelle vergleichen; Marker außerhalb dieser Position → rot. Fehlermeldung `Datei:Zeile Überschrift: erwartet <wert>, gefunden <…>`.
   - `--doc <datei>…`: zählt Marker; 0 → OK; sonst jede `##`/`###`-Überschrift braucht einen gültigen Marker als erste nicht-leere Folgezeile, `####` optional; jede Marker-Zeile muss an dieser Position stehen; Verstöße mit `Datei:Zeile`.
   - Exit 0/1, Ausgabe wie `check-manifest.sh`. Kein Fallback nötig: `awk` ist auf macOS und Ubuntu vorhanden und in `test-installers.sh` schon im Einsatz.
7. **verify.sh:** zwei `run`-Zeilen im Block [2/6] (Vorlagen; `--doc intent/*/intent.md intent/*/spec.md intent/*/plan.md`). **test-installers.sh T7:** Kopie der intent-Vorlage nach `$tmp_root`, (a) einen Marker entfernen → Guard rot, nennt Datei:Zeile; (b) einen Pflicht-Mensch-Marker auf `agent` setzen → rot; (c) Kopie eines Dokuments mit Markern, einen entfernt → `--doc` rot; (d) Original → grün. Der Guard nimmt dafür `LESER_TEMPLATE_DIR` und `--doc` als Pfade entgegen.
8. **README** `specwright/templates/sdlc/README.md`: Abschnitt „Zwei Leser je Dokument" (Prinzip, Syntax, Ohne-Marker-Regel, Rückfrage-Form, Verweis auf Guard als Wahrheit der Zuordnung); Ablauf-Punkt 4 nennt „In einfachen Worten".
9. **Drei Commits** (Review 19): (A) Marker-System: Vorlagen-Marker, Meta-Datei, Manifest, Workflows, Guard, verify, T7, README; (B) plan-Vorlage Struktur (`In einfachen Worten`, `Details`, `###`) inkl. Guard-Tabelle plan; (C) Version 4.1.0. Jeder Commit für sich `verify: OK`.

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| Sichtbare Überschriften-Suffixe (`## 5. Verbindungen (Agent)`) oder eigene Überschrift „Technik" | Verletzt AK-02 (sichtbar in MacDown/GitHub); ändert Überschriftentexte, auf die Anker und Workflows verweisen. |
| Zuordnung im Frontmatter (`leser_agent: [2,4,5]`) | plan.md hat kein YAML-Frontmatter (Blockquote-Kopf); bricht bei Umnummerierung; für die UI schwerer zu binden als ein Marker am Ort. |
| Zweite Datei je Dokument (Menschen-Fassung) | NZ-03; zwei Wahrheiten, Drift. |
| Rückfrage-Regel in jedem Workflow ausformulieren statt Meta-Datei | Vier Kopien derselben Regel; nächste Änderung muss vier Stellen treffen (AR-01-Lehre). |
| Regeln in Specwrights `CLAUDE.md` oder in Michaels globaler `CLAUDE.md` (Review 17) | Regeln müssen in installierte Projekte ausgeliefert werden; `CLAUDE.md` des Repos ist repo-only und auf 90 Zeilen gedeckelt, die globale ist persönlich und nicht im Lieferumfang. Der Workflow-Ordner ist der einzige Lieferweg (AR-01). |
| Marker nur für `agent`, „mensch" implizit | Guard könnte fehlende Marker nicht von bewusst-mensch unterscheiden; AK-01 verlangt „jeden Abschnitt". |
| Marker irgendwo im Abschnitt (Suchfenster) statt erste Zeile (Review 4) | Mehrdeutig bei Hinweis-Kommentaren und Tabellen direkt unter der Überschrift; feste Position ist für Guard und UI eindeutig. |
| Pflicht-Mensch-Liste getrennt von der Zuordnung (Fassung 1, Review 1) | Zwei Listen driften; die vollständige Zuordnung im Guard enthält die Pflicht-Menge und ist prüfbar. |
| Guard als Vitest | Muss ohne `ui/` laufen (AR-06); Bash-Muster existiert. |
| Blindprobe mit Haiku im Scratch-Projekt (Fassung 1, Review 3/22/23) | Nicht deterministisch, ~1 h Aufwand für Prosa-Regeln; die erste echte Sitzung (`/spec INT-2026-010`) prüft dieselben Dinge mit Nutzen. |
| Regeln in `pre-flight.md` einbauen | `pre-flight.md` laden auch Alt-Workflows (NZ-05). |

#### Architektur-Auswirkung

<!-- leser: agent -->

- **Nein** — bleibt innerhalb von `architecture.md` §2 (Vorlagen/Workflows sind Markdown, Owner Michael), AR-01 (neue Datei → Manifest-Zeile, Guard prüft), AR-06 (kein UI-Bezug), AP-02 (kein Bruch, Minor-Sprung). Kein ADR.

`security.md` §6: Lieferumfang aufnehmen → Manifest-Zeile für `meta/leser-und-rueckfragen.md`, Guard grün. Kein Endpunkt, kein externes System, keine personenbezogenen Daten. Installer-Skripte: nur `install.sh:18` Versionskonstante; `test-installers.sh` läuft in `verify`.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft | Commit |
|---|---|---|---|---|---|
| 1 | `specwright/templates/sdlc/vorhaben/intent-template.md` | ändern | Marker als erste Zeile unter jeder der 15 Überschriften nach §3.3; Kommentar „Zwei Schichten" um zwei Sätze zu R1; Änderungsprotokoll-Kommentar um R4-Zeile | AK-01, AK-02, AK-03, AK-06 | A |
| 2 | `specwright/templates/sdlc/vorhaben/spec-template.md` | ändern | Marker unter jeder der 11 Überschriften; §10 Checklisten-Punkt „Mensch-Teil gegen Agenten-Teil geprüft" | AK-01–AK-03, AK-06 | A |
| 3 | `specwright/templates/sdlc/vorhaben/plan-template.md` | ändern | (B) `## In einfachen Worten` mit Kommentar (fünf Fragen der globalen Regel), `## Details`, §1–§14 als `###`, Unterabschnitte `####`; (A) Marker unter allen 21 Überschriften; §12 Zeile „Abgleich Mensch/Agent" als Vorgabe | AK-01–AK-03, AK-06, RB-02 | A + B |
| 4 | `specwright/workflows/meta/leser-und-rueckfragen.md` | neu | R1–R4 nach §3.4 | AK-04–AK-07 | A |
| 5 | `specwright/workflows/core/intent.md` | ändern | EXECUTE; RULE Step 2 „gespraech" (R2-Carve-out, Vorschlag mitliefern), Step 4 „schreiben" (R1), Step 5 „vorlegen" (R3, R2), Step 6 „freigabe" (R4 + Änderungsprotokoll-Eintrag); version 1.2 | AK-04–AK-07 | A |
| 6 | `specwright/workflows/core/spec.md` | ändern | EXECUTE; RULE Step 3 „schreiben" (R1), Step 5 „vorlegen_und_freigabe" (R3, R2, R4 + §10-Punkt); version 1.1 | AK-04–AK-07 | A |
| 7 | `specwright/workflows/core/plan.md` | ändern | EXECUTE; RULE Step 7 „review" (Findings in plan.md §12 nach R2), Step 9a (Struktur aus Vorlage, R1, PRESENT nach R3), Step 9b (R4 + §12-Zeile); version 1.2 | AK-04–AK-07 | A (+ B für Struktur-Satz) |
| 8 | `specwright/workflows/core/build.md` | ändern | EXECUTE; RULE Step 3 „umsetzen" (Rückfragen/Abweichungen nach R2), Step 6 „pr_und_status" (Abschlussbericht nach R3); version 1.2 | AK-04, AK-05 | A |
| 9 | `specwright/manifest.tsv` | ändern | Zeile `workflow	project	specwright/workflows/meta/leser-und-rueckfragen.md	specwright/workflows/meta/leser-und-rueckfragen.md` | RB-01, security §6 | A |
| 10 | `scripts/check-leser-marker.sh` | neu | Guard nach §3.6 mit Soll-Tabellen | AK-01–AK-03, AK-07 | A (Tabelle plan: B) |
| 11 | `scripts/verify.sh` | ändern | Block [2/6]: `[[ -f scripts/check-leser-marker.sh ]] && run "check-leser-marker" bash scripts/check-leser-marker.sh` und `run "check-leser-marker --doc" bash scripts/check-leser-marker.sh --doc intent/*/intent.md intent/*/spec.md intent/*/plan.md` | AK-07 | A |
| 12 | `scripts/test-installers.sh` | ändern | T7 nach §3.7; Kopfkommentar; Schlusszeile „T1–T7 grün" | AK-01, AK-03 | A |
| 13 | `specwright/templates/sdlc/README.md` | ändern | Abschnitt „Zwei Leser je Dokument"; Ablauf-Punkt 4 | AK-01, AK-04 | A |
| 14 | `VERSION`, `install.sh:18` | ändern | 4.0.2 → 4.1.0 | RB-01, AP-02 | C |
| 15 | `intent/INT-2026-009-dokumente-fuer-menschen/plan.md` | neu | dieser Plan, in neuer Struktur, markiert | — | A |
| 16 | `intent/INT-2026-009-dokumente-fuer-menschen/design/e2e-protokoll.txt` | neu | Protokoll der E2E-Sitzung (§8) | AK-04–AK-06 | nach E2E |
| 17 | `intent/INT-2026-010-ui-vorhaben-als-mitte/spec.md` | neu | Entwurf aus der E2E-Sitzung (`Status: entwurf`, nicht freigegeben) | E2E | nach E2E |

**Nicht betroffen (ausdrücklich):** `ui/` (NZ-01), `.claude/commands/specwright/*.md` (Kurzfassungen mit „Refer to workflow"), Alt-Workflows und `pre-flight.md` (NZ-05), `templates/sdlc/projekt/*` (OF-01 offen), bestehende `intent/INT-2026-002…010/intent.md` und ältere Pläne (NZ-02), `~/.claude/CLAUDE.md` (RB-02), `removed.tsv`, `docs/architecture.md` (§3 Nein), `CLAUDE.md` des Repos.

### 5. Verbindungen

<!-- leser: agent -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| 4 Kern-Workflows | Meta-Datei | EXECUTE-Verweis | `EXECUTE: specwright/workflows/meta/leser-und-rueckfragen.md` | `for f in intent spec plan build; do grep -c "meta/leser-und-rueckfragen.md" specwright/workflows/core/$f.md; done` → 4, 3, 4, 3 (EXECUTE + RULE-Stellen aus §4) | — |
| Workflows | Vorlagen | Marker-Vertrag R1 | Regex `^<!-- leser: (mensch\|agent) -->$` | `for f in specwright/templates/sdlc/vorhaben/*-template.md; do echo "$f $(grep -cE '^#{2,4} ' $f) $(grep -cE '^<!-- leser: (mensch\|agent) -->$' $f)"; done` → je Datei gleiche Zahl (15/15, 11/11, 21/21) | — |
| Guard | Vorlagen | Soll-Tabelle | Tabellen im Skript | `bash scripts/check-leser-marker.sh` → Exit 0, „3 Vorlagen, 47 Überschriften geprüft" | — |
| `verify.sh` | Guard | Aufruf | zwei `run`-Zeilen | `grep -c check-leser-marker scripts/verify.sh` → 2; `bash scripts/verify.sh --fast` grün | — |
| `test-installers.sh` T7 | Guard | Aufruf auf manipulierten Kopien | `LESER_TEMPLATE_DIR`, `--doc` | `bash scripts/test-installers.sh` → „T7: …" viermal ✅, Ende „T1–T7 grün" | — |
| `manifest.tsv` | Meta-Datei | Lieferumfang | Art `workflow` | `bash scripts/check-manifest.sh` grün; `grep -c leser-und-rueckfragen specwright/manifest.tsv` → 1 | — |
| Installer | Meta-Datei | Kopie ins Projekt | `install-lib.sh` aus Manifest | `test-installers.sh` T1/T2 (Zielmenge = Manifest) | — |
| Guard `--doc` | bestehende Dokumente | Dokument-Modus | `--doc` | `bash scripts/check-leser-marker.sh --doc intent/*/intent.md intent/*/spec.md intent/*/plan.md` → Exit 0, „19 Dokumente, 18 ohne Marker, 1 vollständig markiert" (dieser Plan) | — |
| E2E-Sitzung | neue Vorlage + Workflow | Hybrid-Lookup (Projekt vor global) | `specwright/templates/sdlc/vorhaben/spec-template.md` | `bash scripts/check-leser-marker.sh --doc intent/INT-2026-010-ui-vorhaben-als-mitte/spec.md` → „vollständig markiert" | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung (Meta-Datei: 4 Workflows + Manifest; Guard: verify + T7 + E2E).
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

0. **Lesende Vorprüfung:** `grep -rn "In einfachen Worten\|## 1\. Kurzfassung\|^## [0-9]*\. \|## Details" specwright/workflows specwright/templates .claude/commands .claude/skills ui/src ui/frontend/src scripts docs/*.md` → Konsumenten der Plan-Überschriften. Erwartet: `workflows/core/plan.md`, `commands/specwright/plan.md`, Vorlagen selbst, `docs/*.md` (eigene §). **Entscheidung:** Treffer, der Überschriftenebene `## n.` in plan.md auswertet → wenn ≤ 5 Zeilen Anpassung, in Commit B mitziehen und in §14 nennen; sonst STOP, Rückfrage nach R2 („F-n, Konsument X liest `## n.`: Vorschlag …"). → prüfbar: Trefferliste im PR-Text.
1. Branch `feat/INT-2026-009-dokumente-fuer-menschen` ab `4c97b63`. → `git branch --show-current`.
2. Guard schreiben (Standard + `--doc`, Soll-Tabellen intent/spec/plan-neu), `chmod +x`. → Standardmodus **rot** (Vorlagen noch ohne Marker); `--doc intent/*/*.md` grün mit „18 ohne Marker" (dieser Plan noch nicht im Ordner).
3. Vorlagen intent und spec markieren (#1, #2); Meta-Datei (#4); Manifest (#9); Workflows (#5–#8); verify (#11); T7 (#12); README (#13). → Guard für intent/spec grün, plan noch rot; `check-manifest.sh` grün; Verbindungen 1, 4, 5, 6 aus §5.
4. **Commit A** (`feat(INT-2026-009): Leser-Marker in intent/spec-Vorlage, Regeln R1–R4, Guard, T7`) — verify muss grün sein → Guard-Tabelle plan in Schritt 2 so anlegen, dass sie erst mit Commit B aktiv wird (Schalter: Tabelle plan prüft nur, wenn `## Details` in der Vorlage vorkommt; sonst wird die plan-Vorlage im Standardmodus noch als „alte Struktur, nicht geprüft" gemeldet). → `bash scripts/verify.sh --fast` grün.
5. plan-Vorlage umbauen und markieren (#3), Guard-Schalter entfernen, `plan.md`-Workflow Step 9a Struktur-Satz. → Guard grün „3 Vorlagen, 47 Überschriften"; Verbindung 2, 3.
6. **Commit B** (`feat(INT-2026-009): plan-Vorlage mit „In einfachen Worten", „Details", ### 1–14, markiert`). → verify grün.
7. Version 4.1.0 (#14). → Guard (e) in `check-manifest.sh` grün. **Commit C** (`chore(INT-2026-009): 4.1.0`).
8. Diesen Plan als `intent/INT-2026-009-…/plan.md` in neuer Struktur mit Markern ablegen, §14 nachziehen. → `--doc` meldet „1 vollständig markiert". Commit `docs(INT-2026-009): plan.md`.
9. `bash scripts/verify.sh` → `verify: OK`; Nachweise §5 ausführen, Ausgaben für den PR sichern.
10. **E2E** (§8): in dieser Sitzung `/spec INT-2026-010` bis Step 5 PRESENT (ohne Freigabe); Protokoll schreiben (#16); `spec.md` als Entwurf committen (#17: `spec(INT-2026-010): Entwurf aus der E2E-Sitzung INT-2026-009`). → `--doc` auf die neue spec.md grün „vollständig markiert"; Protokoll-Punkte (1)–(4) aus §8 ausgefüllt.
11. MacDown-Screenshot (§10 Zeile 1) → `design/marker-macdown.png`.
12. PR (Body: §1, Verify-Ausgabe, Nachweise, Protokoll, §14, offene §10), CI abwarten, `plan.md` Status `umgesetzt`.

### 7. Zerlegung

<!-- leser: agent -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

Sieben Dateien mit einem gemeinsamen Vertrag (Marker-Regex, Soll-Tabellen), Guard und Vorlagen greifen ineinander; drei sequentielle Commits in einer Sitzung, geschätzt unter drei Stunden plus E2E-Sitzung.

#### Variante B — parallel in Worktrees

<!-- leser: agent -->

Entfällt.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK | Test | Datei | Art |
|---|---|---|---|
| AK-01 | Guard Standardmodus: jede Überschrift `##`–`####` der drei Vorlagen trägt einen Marker als erste Zeile; T7(a): Marker entfernt → rot mit Datei:Zeile | `scripts/check-leser-marker.sh`, `scripts/test-installers.sh` T7 | Bash-Test in `verify` |
| AK-02 | Guard-Regex erlaubt nur HTML-Kommentare; MacDown-Screenshot der markierten plan-Vorlage aus dem Branch-Arbeitsbaum (Datei liegt lokal, kein Merge nötig) zeigt keinen Text „leser:"; `grep -c "leser:"` auf der Rohdatei = 21 | Guard + `design/marker-macdown.png` | Test + Screenshot |
| AK-03 | Guard Standardmodus: Soll-Tabelle §3.3 (enthält alle AK-03-Abschnitte als `mensch`); T7(b): `## 7. Offene Fragen` auf `agent` gesetzt → rot | Guard, T7 | Bash-Test |
| AK-04 | `grep -n "R2" specwright/workflows/core/{intent,spec,plan,build}.md` → intent 2 (Step 2, Step 5), spec 1 (Step 5), plan 1 (Step 7), build 1 (Step 3); E2E-Protokoll Punkt (2) | Workflows, Protokoll | grep + E2E |
| AK-05 | `grep -n "R3" …` → intent 1 (Step 5), spec 1 (Step 5), plan 1 (Step 9a), build 1 (Step 6); E2E-Protokoll Punkt (3) | Workflows, Protokoll | grep + E2E |
| AK-06 | `grep -n "R4" …` → intent 1 (Step 6), spec 1 (Step 5), plan 1 (Step 9b); Vorlagen tragen das sichtbare R4-Artefakt (intent Änderungsprotokoll-Kommentar, spec §10-Punkt, plan §12-Zeile): `grep -c "Abgleich Mensch/Agent" specwright/templates/sdlc/vorhaben/*.md` → 1, 1, 1; E2E-Protokoll Punkt (4) | Workflows, Vorlagen, Protokoll | grep + E2E |
| AK-07 | Guard `--doc` über die 18 bestehenden markerlosen Dokumente → Exit 0 (Nachweis: **keine Regression**, alte Dokumente bleiben gültig; keine Aussage über ihren Inhalt); Meta-Datei R1 nennt „ohne Marker = mensch"; T7(c): teilweise markiertes Dokument → rot | Guard, `verify.sh`, T7 | Bash-Test |

- **Verify-Befehl:** `bash scripts/verify.sh` → `verify: OK`; Ausgabe im PR. CI ist die Wahrheit; Bezugsliste `ui/tests/known-failures.txt` unberührt (kein UI-Code).
- **Angeschlossen (E2E-Pfad):** die erste echte Verwendung auf dem Branch: `/spec INT-2026-010` (Hybrid-Lookup nimmt die Projekt-Vorlage und den Projekt-Workflow) bis zum Vorlegen (spec Step 5 PRESENT), ohne Freigabe. Protokoll `design/e2e-protokoll.txt` mit vier Punkten: (1) `spec.md` besteht `check-leser-marker.sh --doc` als „vollständig markiert" (R1 übernommen); (2) jede Rückfrage oder Annahme zur Bestätigung, die eine Kennung nennt, hat die R2-Form (Zitate); (3) das Vorlegen im Chat enthält keine Zeile aus §5 oder §7 der Spec, verweist auf die Datei (R3, Zitat des Vorlege-Textes); (4) der Agent meldet den R4-Abgleich (Zitat) und §10 der Spec trägt den Punkt. Das Protokoll ist ein Sitzungsprotokoll, kein reproduzierbarer Lauf (Review 23): festgehalten werden Datum, Modell, Zitate. Intent-Workflow: nicht in der E2E-Sitzung, aber die Vorlage ist per Guard/T7 gesichert; Plan- und Build-Workflow: dieser Plan (Struktur, Marker, §12-Zeile) und die Bausitzung selbst (Abschlussbericht nach R3, Abweichungen nach R2) sind der erste Lauf, im PR-Text belegt.
- **Bugfix:** entfällt.
- **UI:** entfällt; Screenshot nur für AK-02.

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| R2/R3 sind Prosa; Agent fragt trotzdem ohne Kontext oder trägt Technik vor | mittel | niedrig (Ärger, kein Datenverlust) | RULE an allen zehn Stellen; Beispielzeile in R2; E2E-Protokoll mit Zitaten; bei Verstoß Regel an der Stelle nachschärfen (neues kleines Vorhaben, kein Hook) | Michael bei der nächsten Rückfrage |
| R4 wird abgehakt ohne echten Abgleich | mittel | niedrig | sichtbares Artefakt (Zeile/Punkt mit Datum) ist prüfbar im Review der Freigabe; Michael sieht es beim Freigeben | Michael |
| Guard-Position „erste Zeile" kollidiert mit Vorlagen-Kommentaren | niedrig | niedrig | Vorlagen werden so umgestellt, dass der Marker vor dem Hinweis-Kommentar steht; Fehlermeldung nennt Sollform | Agent in `verify` |
| Plan-Überschriften `### 1.` brechen einen Leser, der `^## 1\.` erwartet | niedrig | mittel | Schritt 0 mit Entscheidungsregel; UI-Anker ebenenunabhängig; INT-2026-008 läuft schon so | `verify`/Build |
| Commit A allein rot, weil plan-Vorlage erst in B markiert wird | sicher ohne Maßnahme | mittel | Guard-Schalter (§6 Schritt 4): plan-Tabelle greift erst, wenn `## Details` in der Vorlage steht; Schalter in B entfernt | `verify` |
| Installiertes Projekt hat Vorlagen angepasst; Update meldet statt ersetzt | niedrig | niedrig | gewohntes Verhalten (T-02), Meldung nennt Datei | Michael beim Update |
| E2E-Sitzung erzeugt einen Spec-Entwurf im PR, der später überarbeitet wird | sicher | niedrig | `Status: entwurf`, Commit-Nachricht nennt Herkunft; `/spec INT-2026-010` setzt darauf auf | Michael im PR |

### 10. Manuelle Schritte

<!-- leser: mensch -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| MacDown-Screenshot: `open -a MacDown specwright/templates/sdlc/vorhaben/plan-template.md` im Branch-Arbeitsbaum, Bildschirmfoto nach `design/marker-macdown.png` (Datei liegt lokal, vor dem Merge) | Agent am Mac (Michael bestätigt Sichtprüfung) | §6 Schritt 11, vor PR | [x] Agent 2026-09-16 (`ce3087e`); Sichtprüfung Michael offen |
| E2E-Sitzung `/spec INT-2026-010` bis Vorlegen; Michael liest das Vorlegen und beantwortet die R2-Rückfragen nicht (Entwurf bleibt) | Agent + Michael | §6 Schritt 10 | [x] Agent 2026-09-16 (`efcb14a`, Protokoll `design/e2e-protokoll.txt`); Michael hat im Chat geantwortet und freigegeben (§14) |
| PR mergen (löst Auto-Deploy der UI aus; UI unverändert) | Michael | nach CI grün | [ ] |
| Installierte Projekte nachziehen: `bash update-specwright.sh` je Projekt; Weg: `check-update.sh` zeigt 4.1.0 | Michael | nach Merge, je Projekt | [ ] |
| `~/.specwright` global nachziehen: `bash setup-devteam-global.sh` (Vorlagen `both`) | Michael | nach Merge | [ ] |

Kein `production-gate`-Befehl, keine Bestandsdaten.

### 11. Schätzung

<!-- leser: mensch -->

2–3 h Umbau plus 30–45 min E2E-Sitzung. Unsicherheit: `awk`-Parsing für Position und Reihenfolge (Ebenen, Soll-Tabelle) und der Guard-Schalter zwischen Commit A und B; E2E ist eine echte Sitzung mit Michaels Beteiligung.

### 12. Review des Plans

<!-- leser: mensch -->

Externer Review (3 Reviewer: anthropic:opus, glm:glm-5.3, minimax:MiniMax-M3), 24 Findings; jedes entschieden.

| # | Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|---|
| 1 | Blocker: Zuordnung §3 ≠ Pflicht-Liste §8; drei Kopien | 3/3 | angenommen | eine vollständige Soll-Tabelle je Vorlage im Guard (§3.3), keine Pflicht-Liste mehr; README/Plan zitieren; „alles andere mensch" gilt wörtlich (§9, §10 intent sind mensch) |
| 2 | Erben vs. „jede Überschrift" unklar | 2/3 | angenommen | §3.2: Vorlagen ohne Erben (alle Ebenen markiert); Dokumente: `##`/`###` Pflicht, nur `####` erbt |
| 3 | E2E nur intent | 2/3 | angenommen | §8: E2E = `/spec INT-2026-010` (spec-Workflow, Marker, R2–R4); plan/build über diesen Plan und die Bausitzung belegt; intent über Guard/T7 |
| 4 | Marker-Position mehrdeutig (Kommentare, Tabellen) | 2/3 | angenommen | §3.1: erste nicht-leere Zeile, sonst Fehler; Vorlagen-Kommentare rücken hinter den Marker |
| 5 | Teilmarkierung unerkannt | 2/3 | angenommen | §3.2 alles-oder-nichts je Dokument; T7(c) |
| 6 | Schwelle ≥ 16 unerreichbar | glm | angenommen | §5: Zählvergleich Überschriften = Marker (15/15, 11/11, 21/21) |
| 7 | Bash-Parsing fragil, kein Fallback | opus | teilweise angenommen | §3.6: Kern in `awk` (POSIX, schon in `test-installers.sh`); kein weiterer Fallback nötig |
| 8 | `###` unter `## Details` → Unterabschnitte `####`, Guard übersieht | glm | angenommen | §3.2/§3.3: Guard prüft `##`–`####` in Vorlagen; plan-Tabelle listet die `####` |
| 9 | Regex nur `##`/`###` | opus | angenommen | wie 8; Dokument-Modus: `####` optional |
| 10 | R2 vs. Interviewfragen ohne Kennung | glm | angenommen | §3.4 R2 Carve-out; intent Step 2 RULE |
| 11 | Schwellen nicht geprüft | opus | angenommen | wie 6 |
| 12 | intent Step 4 „nicht Marker" | opus | abgelehnt (Step 4 heißt „schreiben", `intent.md:76-88`, Marker gehören dorthin) | §2/§4 nennen Step-Namen zu den Nummern |
| 13 | Schritt 0 ohne Entscheidung | opus | angenommen | §6 Schritt 0: ≤ 5 Zeilen mitziehen, sonst STOP + R2-Rückfrage |
| 14 | `--doc` ohne Teilprüfung | opus | angenommen | wie 5 |
| 15 | AK-07-Nachweis überverkauft | minimax | angenommen (Formulierung) | §8 AK-07: „keine Regression", keine Inhaltsaussage |
| 16 | R3/R4 ohne sichtbares Artefakt | minimax | angenommen für R4, abgelehnt für R3 | R4: sichtbare Zeile/Punkt in allen drei Vorlagen (§3.4), grep-Nachweis; R3 ist Chat-Verhalten, Artefakt = Protokoll-Zitat |
| 17 | `CLAUDE.md` als Ziel statt Meta-Datei | minimax | abgelehnt | Lieferweg: nur `specwright/workflows/` erreicht installierte Projekte; Repo-`CLAUDE.md` ist ≤ 90 Zeilen und repo-only; globale `CLAUDE.md` ist persönlich (§3 Alternativen) |
| 18 | build Step 6 Abschlussbericht ohne R3 | glm | angenommen | §4 #8: Step 6 RULE R3; R3 nennt den Abschlussbericht |
| 19 | Drei Anliegen in einer PR | glm | angenommen (Sequenz) | §3.9/§6: drei Commits A/B/C, je für sich `verify: OK`; eine PR (Größe S) |
| 20 | Zweite EXECUTE-Zeile ungetestet | minimax | teilweise angenommen | kein Laufzeit-Mechanismus, nur Text (§2); Nachweis: grep (§5 Zeile 1) + E2E-Sitzung lädt die Datei sichtbar |
| 21 | Screenshot-Sequenz unklar | opus | angenommen (Klarstellung) | §8/§10: Datei liegt im Branch-Arbeitsbaum, Screenshot vor PR |
| 22 | Blindprobe zu schwer | glm | angenommen | wie 3 |
| 23 | Haiku nicht reproduzierbar | minimax | angenommen | §8: Sitzungsprotokoll mit Datum, Modell, Zitaten; kein Reproduzierbarkeitsanspruch |
| 24 | §7/§12-Verwirrung | minimax | abgelehnt als Missverständnis, Text geschärft | §2/§4: „Workflow Step 7 (Review) → Findings in plan.md §12" |
| S1 | Self: AK-05/AK-06 nur Review | Self | angenommen | §8: grep-Nachweise mit erwarteten Zahlen |
| S2 | Self: Commit A wäre rot ohne plan-Marker | Self | angenommen | Guard-Schalter §6 Schritt 4, Risiko §9 |

**Minimalinvasiv geprüft:** Wiederverwendet: HTML-Kommentar-Konvention der Vorlagen, `pre_flight_check`-Block als Ladepunkt, `verify.sh`-Guard-Muster, T5/T6-Muster, `awk` aus `test-installers.sh`, INT-2026-008-Struktur der plan.md, Hybrid-Lookup für die E2E-Sitzung. Gestrichen: Commands, `pre-flight.md`, UI, Projekt-Docs-Vorlagen, bestehende Dokumente, Haiku-Scratch-Blindprobe, separate Pflicht-Liste.

**Abgleich Mensch/Agent:** „In einfachen Worten" gegen §3–§8 gelesen am 2026-09-16 nach Fassung 2: ohne Befund (E2E-Weg, Alles-oder-nichts-Regel, drei Commits, R4-Artefakt in beiden Teilen).

### 13. Definition of Done

<!-- leser: agent -->

- [x] Jedes AK aus §8 hat einen grünen Nachweis (AK-01/03/07 Guard + T7, AK-02 Guard + Screenshot, AK-04–06 grep + E2E-Protokoll).
- [x] Alle Nachweise aus §5 ausgeführt und im PR zitiert.
- [x] E2E-Sitzung gelaufen, Protokoll unter `design/`, Spec-Entwurf 010 committet.
- [x] `verify: OK` lokal (2026-09-16, voll und `--fast`), PR-Checks grün (PR #55, Run 35102037217, verify 1m39s).
- [x] `docs/architecture.md` unverändert (§3 Nein).
- [x] Manuelle Schritte §10 erledigt oder im PR offen markiert (Sichtprüfung, Merge, Update-Läufe offen).
- [x] Abweichungen in §14.
- [x] 2x-Regel-Check: kein Fehler, der schon einmal vorkam (node-pty-`chmod` vorbeugend gesetzt, kein Ausfall).
- [x] Abschlussbericht nach R3, endet mit „Für das Board".

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-09-16 | Guard `--doc` prüft 20 Dokumente (19 ohne Marker, 1 markiert) statt 19/18 | `intent/INT-2026-010/intent.md` wurde nach der Planerstellung committet (`4c97b63`) | §2 „Bestehende Dokumente", §5 Zeile 8, §8 AK-07 |
| 2026-09-16 | Struktur-Satz für `plan.md`-Workflow Step 9a schon in Commit A statt B | Step 9a wurde in einem Edit mit der R3-RULE umgebaut; Workflow ist Text, Commit A blieb grün | §4 #7 |
| 2026-09-16 | T7(c) nimmt eine Kopie der intent-Vorlage als „teilweise markiertes Dokument", nicht ein Repo-Dokument | Bei Commit A gab es noch kein markiertes Dokument im Repo (dieser Plan wird erst in Schritt 8 markiert); die Vorlage ist für `--doc` ein gültiges Dokument | §3.7 |
| 2026-09-16 | Guard überspringt Zeilen in ```-Zäunen | zwei bestehende Pläne (005, 008) enthalten Codeblöcke; eine `## `-Zeile darin wäre sonst eine Überschrift | §3.6 (Ergänzung, kein Bruch) |
| 2026-09-16 | Guard `--doc` nach der E2E-Sitzung: 21 Dokumente, 19 ohne Marker, 2 vollständig markiert (dieser Plan, Spec-Entwurf 010) | Spec-Entwurf 010 ist das 21. Dokument | §5 Zeile 8 (Zahl) |
| 2026-09-16 | Screenshot als Vollbild aufgenommen und auf das MacDown-Fenster zugeschnitten statt Fenster-Capture | `screencapture -R` und `-l <window>` scheitern auf diesem Mac („could not create image"); Vollbild plus `sips`-Zuschnitt liefert dasselbe Bild ohne Dock und fremde Fenster | §10 Zeile 1 (Weg) |
| 2026-09-16 | PR direkt mit `gh` aus der Bausitzung statt über den Agenten `git-workflow` | PR-Text zitiert Nachweise und Protokoll aus dem Kontext dieser Sitzung; ein Utility-Agent hätte ihn nur weitergereicht | Workflow Step 6 (kein Plan-Abschnitt) |
| 2026-09-16 | E2E-Sitzung ging über das Vorlegen hinaus: Michael beantwortete die neun Rückfragen im Chat, FA-22 (Freigabe per Knopf) kam dazu, die Spec 010 wurde freigegeben (`spec(INT-2026-010): fachliche Spec freigegeben`) | Michael entschied im Abschlussbericht statt in einer eigenen `/spec`-Sitzung; die Rückfragen in R2-Form ließen sich aus dem Chat beantworten (Zweck von R2) | §8 E2E, §10 Zeile 2 |
| 2026-09-16 | Schritt 0: Treffer `.claude/commands/specwright/plan.md:10` („oben zusätzlich `## In einfachen Worten`") nicht angepasst | Commands sind „Nicht betroffen"; die Zeile wertet keine Ebene aus und bleibt inhaltlich richtig | §4 Nicht betroffen, §6 Schritt 0 |
