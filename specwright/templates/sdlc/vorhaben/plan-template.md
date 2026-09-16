# Plan: [Titel]

> **Intent:** `intent.md` (INT-JJJJ-NNN) · **Spec:** `spec.md` | entfällt (bypass: [Grund])
> **Status:** entwurf | freigegeben | in_umsetzung | umgesetzt
> **Erstellt:** JJJJ-MM-TT im Plan Mode · **Freigabe:** [Rolle], JJJJ-MM-TT
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand [sha]), `CLAUDE.md`, `docs/security.md`

<!-- Der Plan ist TECHNISCH und die EINHEIT DER AUSFÜHRUNG. Eine Sitzung setzt ihn ganz um.
     Maßstab: Ein neues Teammitglied könnte allein anhand dieses Dokuments umsetzen.
     Jede Änderung verweist auf eine FA (spec.md) oder ein AK (intent.md). Keine Änderung ohne Herkunft.
     Zwei Leser: „In einfachen Worten" liest die Person, die freigibt; „Details" liest der Agent, der baut. Die erste Zeile unter jeder
     Überschrift sagt, für wen der Abschnitt ist (R1, specwright/workflows/meta/leser-und-rueckfragen.md). Marker übernehmen, keinen entfernen. -->

## In einfachen Worten

<!-- leser: mensch -->

<!-- Übersetzung, keine Zusammenfassung. Darf so lang werden wie nötig, auch länger als die Details. Maßstab: ein interessierter
     Nicht-Techniker, der das Produkt benutzt, liest das einmal und kann mitreden. Alltagssprache, kein Codezitat, Dateien nur als
     Referenz `pfad/datei.ts:42`. Fünf Fragen, Fließtext erlaubt: -->

**Worum geht es?** [Das Problem aus Nutzer- oder Geschäftssicht, nicht aus Code-Sicht.]

**Was ändert sich?** [Was danach anders ist, wer es merkt.]

**Wie wird das gemacht?** [Der Lösungsweg als Erklärung, nicht als Dateiliste. Analogien und Beispiele erwünscht.]

**Was kann schiefgehen?** [Was kaputtgehen kann, wer es merkt, wie rückgängig.]

**Was musst du entscheiden?** [Offene Fragen mit Vorschlag — oder „nichts, Freigabe reicht".]

## Details

<!-- leser: mensch -->

<!-- Volle technische Tiefe: Dateien, Funktionen, Datenmodell, Tradeoffs, Testplan. Geht an Reviewer und in die Bausitzung, muss für sich stehen.
     Confidence-Tags in beiden Teilen: [Certain] harte Belege · [Likely] starke Inferenz · [Uncertain] Vermutung. -->

### 1. Kurzfassung

<!-- leser: mensch -->

[2 bis 3 Sätze: gewählter Ansatz, warum, was sich am Ende im Code geändert hat.]

### 2. Ausgangslage im Code

<!-- leser: agent -->

<!-- Was existiert, was wiederverwendet wird, was heute anders läuft als gedacht. Mit Datei:Zeile. Das ist der Teil, der Plan-Mode-Recherche festhält. -->

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| […] | `pfad/datei.ts:42` | [wiederverwendbar / muss geändert werden / Falle] |

### 3. Entwurf

<!-- leser: agent -->

#### Ansatz

<!-- leser: agent -->

[Beschreibung.]

#### Verworfene Alternativen

<!-- leser: agent -->

| Alternative | Warum nicht |
|---|---|
| […] | […] |

#### Architektur-Auswirkung

<!-- leser: agent -->

<!-- PFLICHT-Antwort. Verschiebt der Plan eine Grenze aus architecture.md (Service-Verantwortung, Datenbesitz, erlaubte Abhängigkeit, AR-Regel)? -->

- **Nein** — bleibt innerhalb von architecture.md §[…].
- **Ja** — Regel [AR-nn] / Abschnitt […] ändert sich so: […]. `docs/architecture.md` wird **in dieser PR** angepasst. ADR nötig: ja/nein.

### 4. Änderungen

<!-- leser: agent -->

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `pfad/datei.ts` | neu / ändern / löschen | […] | FA-01 |

**Nicht betroffen (ausdrücklich):** [Komponenten, die man vermuten könnte, die aber unangetastet bleiben]

### 5. Verbindungen

<!-- leser: agent -->

<!-- KRITISCH. Jede neue oder geänderte Verbindung zwischen Komponenten steht hier, mit prüfbarem Nachweis. Das ist der Schutz gegen „gebaut, aber nicht angeschlossen".
     Spalte „Teil": nur bei Zerlegung (Abschnitt 7), sonst „—". -->

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| [Komponente A] | [Komponente B] | Import / API-Call / Event / Props | `import { x } from …` / `GET /api/…` | `grep -rn "…" src/` / Test [name] | — |

- [ ] Jede neue Komponente hat mindestens eine Verbindung.
- [ ] Jeder Nachweis ist ein ausführbarer Befehl.

### 6. Reihenfolge der Arbeit

<!-- leser: agent -->

<!-- Schritte in Ausführungsreihenfolge. Jeder Schritt endet mit einem prüfbaren Zustand. Schritt 0 ist immer eine lesende Vorprüfung auf Konsumenten, die brechen könnten. -->

0. Lesende Vorprüfung: […] → prüfbar durch […]
1. [Schritt] → prüfbar durch […]
2. [Schritt] → prüfbar durch […]
3. Verbindungen nachweisen (Abschnitt 5)
4. `verify` grün, E2E-Pfad (Abschnitt 8)

### 7. Zerlegung

<!-- leser: agent -->

<!-- PFLICHT. Genau eine der beiden Varianten.
     Standard ist A. B nur mit Beweis: disjunkte Dateien, Schnittstelle VOR dem Start festgelegt, und eine Integrationsaufgabe in der Hauptsitzung. -->

#### Variante A — nicht zerlegbar, eine Sitzung

<!-- leser: agent -->

[Begründung in einem Satz, z. B. „Änderungen greifen ineinander (Abschnitt 5, 3 Verbindungen)."]

#### Variante B — parallel in Worktrees

<!-- leser: agent -->

| Teil | Dateien (disjunkt) | Schnittstelle, vorab festgelegt | Worktree | Verbindungen (Abschnitt 5) |
|---|---|---|---|---|
| T1 | `a/…`, `b/…` | [Typ/Signatur/Contract] | `[name]-t1` | #1, #2 |
| T2 | `c/…` | […] | `[name]-t2` | #3 |
| **Integration** | alle | — | Hauptsitzung | alle Nachweise, E2E, `verify` |

**Beweis der Unabhängigkeit:** [Dateimengen überschneiden sich nicht (Befehl: `comm`/Liste); jede Schnittstelle ist vor Start in Code oder Typ festgehalten (Datei:Zeile).]
**Integrationsaufgabe:** läuft **immer** in der Hauptsitzung mit diesem Plan im Kontext, nie in einem Teil-Worktree.

### 8. Tests und Nachweis

<!-- leser: agent -->

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01 | […] | `tests/…` | Unit / Integration / E2E |

- **Verify-Befehl:** `[npm run verify]` — muss grün sein, Ausgabe wird im PR zitiert. **CI ist die Wahrheit:** lokal grün zählt erst, wenn die PR-Checks grün sind. Bezugslisten bekannter roter Tests (Baselines) werden nie aufgrund eines lokalen Laufs gekürzt.
- **Datenkorrektur (falls Bestandsdaten angefasst werden):** Werkzeug mit Lesemodus (zählt, berichtet, schreibt nichts) → Bericht an die freigebende Person → Freigabe je Umgebung/Mandant → Schreiben mit Backup und Rückweg → Nachmessung im Lesemodus muss 0 Abweichungen zeigen. Die Nachmessung ist ein Nachweis in dieser Tabelle (Art „Messung").
- **Angeschlossen (E2E-Pfad):** [ein Nutzerpfad von Auslöser bis Ergebnis, der die Verbindungen aus Abschnitt 5 durchläuft; wie geprüft: Playwright / Screenshot / manuell mit Protokoll].
- **Bugfix:** Test zuerst, Fehlschlag bestätigt, dann Fix ohne Änderung am Test. Hook `protect-tests` aktiv.
- **UI:** Ergebnis entspricht `design/[mock]` — Prüfung per [Screenshot/Playwright].

### 9. Risiken

<!-- leser: mensch -->

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| […] | niedrig/mittel/hoch | niedrig/mittel/hoch | […] | […] |

### 10. Manuelle Schritte

<!-- leser: mensch -->

<!-- Alles, was ein Mensch tun muss: Secrets setzen, Flag schalten, Migration freigeben, Deploy autorisieren. Mit Zeitpunkt (vor Umsetzung / vor Merge / vor Deploy). Sonst „Keine."
     Jeder Schritt nennt den Weg belegt (Skript, Workflow-Datei, Befehl mit Pfad). `[Uncertain]` ist hier nicht freigabefähig: entweder im Code belegen oder „Weg klären“ als eigener Schritt mit Wer und Wann.
     Deploy-Schritte laufen nur mit Freigabe (Hook `production-gate`); Freigabe-Datei nach dem Deploy löschen. -->

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| […] | [Rolle] | vor Deploy | [ ] |

### 11. Schätzung

<!-- leser: mensch -->

[Zeit mit Spanne, z. B. 4–6 h. Unsicherheit und ihr Grund. Bei Größe L: Meilensteine.]

### 12. Review des Plans

<!-- leser: mensch -->

<!-- Vor der Freigabe. Self-Review oder externe Reviewer (Multi-LLM). Jeder Blocker adressiert, jedes Minority-Finding begründet angenommen oder abgelehnt.
     Jede Entscheidung nennt Finding und Gegenstand in einem Satz (R2), damit die Person aus dem Chat heraus widersprechen kann. -->

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| […] | Self / Reviewer X | angenommen / abgelehnt (Grund) | Abschnitt […] |

**Minimalinvasiv geprüft:** [Was wiederverwendet wird statt neu gebaut; was aus dem Plan gestrichen wurde.]

**Abgleich Mensch/Agent:** „In einfachen Worten", §9, §10, §12 gegen §2–§8 gelesen am JJJJ-MM-TT: ohne Befund | Befund: […] (R4)

### 13. Definition of Done

<!-- leser: agent -->

- [ ] Jede FA/AK aus Abschnitt 8 hat einen grünen Test.
- [ ] Alle Nachweise aus Abschnitt 5 ausgeführt und im PR zitiert.
- [ ] E2E-Pfad läuft (Abschnitt 8).
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün (CI ist die Wahrheit).
- [ ] `docs/architecture.md` angepasst, falls Abschnitt 3 „Ja".
- [ ] Manuelle Schritte (Abschnitt 10) erledigt oder im PR als offen markiert.
- [ ] Abweichungen von diesem Plan in Abschnitt 14 eingetragen.
- [ ] 2x-Regel-Check: Fehler, der zum zweiten Mal vorkam → Vorschlag für `CLAUDE.md` im PR.
- [ ] Abschlussbericht nach R3 (nur Mensch-Abschnitte im Chat), endet mit dem Block „Für das Board" (Karte, Spalte, PR-Link, Stand, Verweis auf `intent/INT-JJJJ-NNN/`); Nachziehen in eigener Sitzung.

### 14. Abweichungen bei der Umsetzung

<!-- leser: mensch -->

<!-- Wird während der Umsetzung gepflegt. Der committete Plan muss am Ende zum Diff passen. Jede Zeile nennt Gegenstand und Grund in einem Satz (R2). -->

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| — | — | — | — |
