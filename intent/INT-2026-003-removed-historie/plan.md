# Plan: Update erkennt jede jemals ausgelieferte Fassung einer entfernten Datei

> **Intent:** `intent.md` (INT-2026-003, 1.0.0) · **Spec:** entfällt (bypass: Bugfix in der Lieferkette, Größe S; Verhalten durch INT-2026-002 spec.md FA-07/FA-08 festgelegt)
> **Status:** in_umsetzung
> **Erstellt:** 2026-09-14 (Handoff-Fortsetzung, Bypass ohne Plan Mode — Recherche in §2 belegt) · **Freigabe:** Product Owner (Michael Sindlinger) mit dem PR
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand `dc9647c`, §3 Datenbesitz „Lieferumfang", AR-01, AP-02, §9), `CLAUDE.md` (Konventionen „Lieferumfang", „Installer"), `docs/security.md` §5 (Verbotsliste — keine Host-Daten, keine Test-Kürzung)

## In einfachen Worten

**Worum geht es?** Seit Specwright 4.0.0 gibt es eine Liste der Dateien, die das Framework nicht mehr ausliefert — 72 Stück, etwa alte Befehle und Vorlagen. Wenn ein Projekt Specwright aktualisiert, schaut das Update in jedes dieser 72 Dateien im Projekt hinein und vergleicht einen Fingerabdruck des Inhalts (eine Prüfsumme) mit der Liste. Stimmt der Fingerabdruck, wird gelöscht. Stimmt er nicht, geht das Update davon aus, dass jemand die Datei im Projekt bewusst verändert hat, lässt sie liegen und meldet „lokal geändert". Das Problem: In der Liste steht je Datei nur ein einziger Fingerabdruck, der der allerletzten Fassung. Fast jede dieser Dateien hat aber im Lauf der Zeit 2 bis 4 verschiedene Fassungen gehabt. Ein Projekt, das nicht bei jeder Specwright-Version nachgezogen hat, besitzt eine ältere Fassung — und bekommt beim Update 72 mal die Meldung „lokal geändert", obwohl niemand je etwas daran geändert hat. Genau das ist am 14.09. auf Michaels Mac passiert und musste von Hand aufgeräumt werden.

**Was ändert sich?** Nach diesem Vorhaben stehen in der Liste je Datei alle Fingerabdrücke, die diese Datei jemals hatte — 149 statt 72. Das Update erkennt damit jede Fassung, die Specwright je ausgeliefert hat, und löscht sie. Was wirklich jemand im Projekt verändert hat, bleibt weiterhin liegen und wird gemeldet; daran ändert sich nichts. Außerdem gibt es ein kleines Skript, das diese Fingerabdrücke aus der Git-Historie erzeugt, und eine Prüfung, die bei jedem Pull Request anschlägt, wenn jemand eine Datei entfernt, aber die Fingerabdrücke nicht nachgezogen hat. Die Versionsnummer geht auf 4.0.1, damit Projekte, die schon auf 4.0.0 sind, beim nächsten `check-update.sh` den Hinweis bekommen, noch einmal zu aktualisieren.

**Wie wird das gemacht?** Erstens der Test zuerst: Der bestehende Installer-Test baut ein altes Projekt nach und lässt das Update darüber laufen. Ich lasse ihn eine Datei in ihrer ältesten Fassung hinlegen — damit wird der Test rot und beweist den Fehler. Zweitens das Skript: Es geht die 72 Zeilen der Liste durch, holt aus Git jede Fassung der Datei, berechnet den Fingerabdruck und schreibt alle in die Zeile. Läuft es ein zweites Mal, ändert es nichts mehr. Drittens die Wächter-Prüfung: Dasselbe Skript kann im Prüfmodus laufen und sagt dann nur „Liste ist veraltet, führe mich aus" — das hängen wir in die vorhandene Manifest-Prüfung, die in jedem Pull Request läuft. Viertens wird die Liste einmal erzeugt und eingecheckt; der Test wird grün. Dazu ein Test für den Wächter selbst, eine Zeile in der Projektregel-Datei, ein Changelog-Eintrag und die Versionsnummer.

**Was kann schiefgehen?** Das Update könnte jetzt Dateien löschen, die es vorher liegen ließ — aber nur solche, deren Inhalt Byte für Byte einer Fassung entspricht, die Specwright selbst ausgeliefert hat. Eine eigene Änderung im Projekt hat nie diesen Fingerabdruck. Das Skript liest nur Git, schreibt nur die eine Liste; die Lade- und Löschroutine der Installer wird nicht angefasst. Zweites Risiko: Die Prüfung braucht die vollständige Git-Historie. Auf GitHub ist das eingestellt; in einem flachen Klon überspringt sie sich selbst mit Hinweis, statt fälschlich rot zu werden. Rückgängig: Revert des Merges, Version zurück auf 4.0.0.

**Was musst du entscheiden?** Nichts — Freigabe mit dem Pull Request reicht. Der Merge bleibt dein Schritt (löst den Auto-Deploy der Web-UI aus; hier ändert sich kein UI-Code).

## 1. Kurzfassung

`specwright/removed.tsv` bekommt je Eintrag die Prüfsummen aller Fassungen aus der `main`-Historie (149 statt 72), erzeugt von `scripts/removed-hashes.sh` (Bash 3.2, idempotent, Vereinigung aus vorhandenen und historischen Prüfsummen). Derselbe Befehl mit `--check` läuft als Prüfpunkt (d) in `scripts/check-manifest.sh` und macht `verify` rot, wenn die Liste hinter der Historie zurückbleibt. Der Installer-Test T4 stellt eine Datei in ihrer ältesten Fassung her und erwartet die Löschung (rot vor dem Fix, grün danach); neues T6 prüft den Guard und die Idempotenz. `install-lib.sh` bleibt unverändert; Version 4.0.1.

## 2. Ausgangslage im Code

| Bereich | Heute (Datei:Zeile) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Löschlogik | `specwright/scripts/install-lib.sh:151-177` `sw_remove_obsolete`: liest Spalte 4 als kommagetrennte Liste (`:164`), Treffer → `rm -f`, sonst `SW_KEPT_MODIFIED` + Meldung (`:169-171`) | wiederverwendbar, unverändert — mehrere Prüfsummen je Zeile werden bereits unterstützt |
| Prüfsummen-Helfer | `install-lib.sh:67-71` `sw_sha256` (`sha256sum` → `shasum -a 256` → `openssl`) | Muster für das neue Skript (gleiche Fallback-Kette) |
| Liste | `specwright/removed.tsv`: 4 Kommentarzeilen + 72 Einträge, **jeder mit genau 1 Prüfsumme** | zu ergänzen; Messung 2026-09-14: `git log -- <ziel>` je Eintrag → 2–4 verschiedene Fassungen, 149 verschiedene Prüfsummen gesamt; alle 72 gelisteten Werte sind in der Historie enthalten (0 fehlend) |
| Herkunft der Lücke | INT-2026-002 `plan.md` §3 Punkt 2 sah `eecb1cd6` + `05364c1^` vor; §12 nahm das Review-Finding „nur eine Prüfsumme" mit „mehrere Prüfsummen je Zeile" an — umgesetzt wurde nur `eecb1cd6` | Ursache: Prüfsummen von Hand aus zwei Commits statt aus der Historie; deshalb jetzt Skript + Guard |
| Guard | `scripts/check-manifest.sh:56-61` Punkt (d): prüft nur „Prüfsumme vorhanden" und „nicht zugleich im Manifest" | um Aufruf `removed-hashes.sh --check` erweitern |
| Installer-Test | `scripts/test-installers.sh:60-86` T4: Fixture aus `git show eecb1cd6:<ziel>` für alle project/both-Einträge (`:65-70`), erwartet `fixture_count - 2` Löschungen (`:82-83`) | eine Datei stattdessen in ältester Fassung → heute rot (AK-01); T6 neu nach T5-Muster (`:88-93`) |
| CI | `.github/workflows/verify.yml:16` `fetch-depth: 0` | volle Historie vorhanden — Guard darf `git log` nutzen |
| Version | `VERSION` = `4.0.0`, `install.sh:18` `FRAMEWORK_VERSION="4.0.0"`, Guard (e) `check-manifest.sh:63-65`; `check-update.sh:40,60-73` vergleicht mit Raw-`VERSION` und zeigt den `CHANGELOG.md`-Abschnitt `## <LATEST>` | beide auf 4.0.1; Changelog-Eintrag, damit `check-update.sh` etwas zeigt (letzter Eintrag dort: 3.38.0 — 4.0.0 fehlt, siehe §14) |
| Konvention | `CLAUDE.md` Zeile „entfernte Datei → Zeile in `removed.tsv` mit Prüfsumme(n) der letzten Fassung" | auf „alle Fassungen, `bash scripts/removed-hashes.sh`" ändern; Datei bleibt ≤ 90 Zeilen (heute 74) |

## 3. Entwurf

### Ansatz

Ein Skript `scripts/removed-hashes.sh` (nicht ausgeliefert — `scripts/` ist kein Lieferverzeichnis, siehe `check-manifest.sh:17`) liest `specwright/removed.tsv` Zeile für Zeile. Kommentarzeilen und Leerzeilen gehen unverändert durch. Für jeden Eintrag bildet es die Vereinigung aus (a) den bereits gelisteten Prüfsummen (Reihenfolge bleibt) und (b) den Prüfsummen jeder Fassung von `<ziel>` in der Historie des aktuellen `HEAD` (`git log --format=%H -- <ziel>`, je Commit `git show <sha>:<ziel>`; Commits, in denen die Datei fehlt — die Löschung selbst — überspringt es). Neue Prüfsummen hängt es in Git-Log-Reihenfolge (neueste zuerst) an. Ohne Argument schreibt es die Datei atomar (tmp + `mv`) und meldet die Zahl neuer Prüfsummen; mit `--check` schreibt es nichts, vergleicht per `cmp` und endet mit Exit 1 und der Meldung `removed.tsv veraltet — bash scripts/removed-hashes.sh ausführen` samt den betroffenen Zielen. Ist das Repo flach (`git rev-parse --is-shallow-repository` = `true`), meldet `--check` einen Hinweis und endet mit 0; der Schreibmodus bricht mit 1 ab.

`HEAD`-Historie statt `origin/main`: Im Worktree und in CI (PR-Head) enthält `HEAD` die `main`-Historie bis zum Abzweig plus die eigenen Commits — genau die Fassungen, die ausgeliefert wurden oder werden. `--follow` wird nicht genutzt: Stichprobe an 3 Dateien zeigt identische Trefferzahlen mit und ohne, und Ähnlichkeitserkennung könnte fremde Inhalte einmischen.

### Verworfene Alternativen

| Alternative | Warum nicht |
|---|---|
| Prüfsummen von Hand um `05364c1^` ergänzen (wie INT-2026-002 §3 vorsah) | Behebt den Einzelfall, nicht die Ursache; die nächste Entfernung wiederholt den Fehler. |
| Beim Update statt Liste die Historie befragen | Projekte haben das Specwright-Repo nicht; Installer laden nur Raw-Dateien (`architecture.md` §5). |
| Löschen ohne Prüfsummentreffer, wenn `.installed-version` < 4.0.0 | Verletzt FA-08 (lokal Verändertes bleibt); Versionsstempel fehlt in alten Projekten (`check-update.sh:29`). |
| Guard direkt in `check-manifest.sh` einbauen statt eigenes Skript | Erzeugen und Prüfen müssen dieselbe Logik teilen; ein Skript mit zwei Modi verhindert Drift zwischen beiden. |
| Major-Versionssprung | AP-02 verlangt den Sprung bei Bruch; hier kein Bruch, nur vollständigere Liste → Patch 4.0.1. |

### Architektur-Auswirkung

- **Nein** — bleibt innerhalb von `architecture.md` §3 (Lieferumfang gehört dem Specwright-Repo, Speicher `removed.tsv`), AR-01 (keine Installer-Liste) und §9 (Drift-Erkennung erweitert sich um einen Prüfpunkt im bestehenden `check-manifest.sh`). Kein ADR: die Lieferkette wird nicht geändert, nur die vorhandene Liste vollständig gefüllt.

## 4. Änderungen

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `scripts/removed-hashes.sh` | neu | Erzeugen (Standard) und Prüfen (`--check`) der Prüfsummen aus der Git-Historie; Bash 3.2; Fallback-Kette für sha256 wie `install-lib.sh:67-71` | AK-01, AK-03, AK-04 |
| 2 | `specwright/removed.tsv` | ändern | Kopfkommentar nennt das Skript; 72 Einträge mit allen Prüfsummen (149) | AK-01 |
| 3 | `scripts/check-manifest.sh` | ändern | Punkt (d): zusätzlich `bash scripts/removed-hashes.sh --check`, Fehlermeldung durchreichen; Kopfkommentar | AK-03 |
| 4 | `scripts/test-installers.sh` | ändern | T4: `specwright/workflows/core/add-story.md` aus ältester Fassung (`git log --format=%H -- … \| tail -1`) statt `eecb1cd6`; Assertion „gelöscht und im Log genannt". T6 neu: eine Prüfsumme aus einer Zeile mit ≥ 2 entfernen → `check-manifest.sh` rot; zurück → grün; Skript zweimal laufen lassen → `git diff --quiet -- specwright/removed.tsv`; Kopfkommentar T1–T6 | AK-01, AK-02, AK-03, AK-04 |
| 5 | `VERSION`, `install.sh:18` | ändern | 4.0.1 | RB-03 |
| 6 | `CHANGELOG.md` | ändern | Abschnitt `## 4.0.1 - 2026-09-14` (wird von `check-update.sh` gezeigt) | RB-03 |
| 7 | `CLAUDE.md` | ändern | Konvention „Lieferumfang": Prüfsummen aller Fassungen per `bash scripts/removed-hashes.sh`, Guard erzwingt es | AK-03 |
| 8 | `intent/INT-2026-003-removed-historie/{intent,plan}.md` | neu | Vorhaben (Bypass) | — |

**Nicht betroffen (ausdrücklich):** `specwright/scripts/install-lib.sh` (Löschlogik kann Listen bereits), `update-specwright.sh` und die vier anderen Installer, `specwright/manifest.tsv`, `docs/architecture.md`, `.github/workflows/verify.yml`, `ui/`.

## 5. Verbindungen

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `check-manifest.sh` (d) | `removed-hashes.sh --check` | Skriptaufruf | Exit 0/1, Meldung auf stderr | `grep -n 'removed-hashes.sh --check' scripts/check-manifest.sh` | — |
| `removed-hashes.sh` | `specwright/removed.tsv` | Datei lesen/schreiben | 4 Spalten TAB, Spalte 4 kommagetrennt | `bash scripts/removed-hashes.sh --check; echo $?` → 0 | — |
| `removed.tsv` (149 Prüfsummen) | `install-lib.sh:164` | Datei lesen | kommagetrennte Liste | T4: älteste Fassung von `add-story.md` gelöscht | — |
| `test-installers.sh` T6 | `check-manifest.sh`, `removed-hashes.sh` | Skriptaufruf | Exit-Code | `bash scripts/test-installers.sh` → `T1–T6 grün` | — |
| `verify.sh` | `check-manifest.sh` | bestehend (`:26`) | — | `bash scripts/verify.sh --fast` | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

## 6. Reihenfolge der Arbeit

1. Test zuerst: T4 auf älteste Fassung von `add-story.md` umstellen → `bash scripts/test-installers.sh` rot mit „nicht gelöscht" (Fehler bestätigt).
2. `scripts/removed-hashes.sh` schreiben; `--check` → Exit 1 mit 72 betroffenen Zielen.
3. Skript ausführen → `removed.tsv` mit 149 Prüfsummen; zweiter Lauf → `git diff --quiet` (AK-04); `--check` → Exit 0.
4. `check-manifest.sh` (d) erweitern; T6 anlegen; `bash scripts/test-installers.sh` → T1–T6 grün.
5. Version 4.0.1, Changelog, `CLAUDE.md`-Zeile; `bash scripts/check-manifest.sh` grün (Guard e).
6. Verbindungen nachweisen (§5), `bash scripts/verify.sh` → `verify: OK`; Ausgabe in den PR.
7. Commit, Push, PR; CI abwarten (CI ist die Wahrheit). Board-Karte nachziehen.

## 7. Zerlegung

### Variante A — nicht zerlegbar, eine Sitzung

Sechs Dateien, alle über den Installer-Test verbunden (§5); Aufwand unter einem Tag.

## 8. Tests und Nachweis

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01 | T4: `specwright/workflows/core/add-story.md` in ältester Fassung wird gelöscht und im Log genannt | `scripts/test-installers.sh` | Integration (Bash) |
| AK-02 | T4: `.claude/commands/specwright/add-story.md` mit angehängter Zeile bleibt und wird gemeldet (bestehend) | `scripts/test-installers.sh` | Integration (Bash) |
| AK-03 | T6: Prüfsumme entfernt → `check-manifest.sh` Exit 1 und Meldung nennt `removed-hashes.sh`; wiederhergestellt → Exit 0 | `scripts/test-installers.sh` | Integration (Bash) |
| AK-04 | T6: Skript zweimal → `git diff --quiet -- specwright/removed.tsv` | `scripts/test-installers.sh` | Integration (Bash) |
| RB-01 | `bash -n` in `verify.sh` [1/6]; Lauf auf macOS Bash 3.2 lokal, ubuntu in CI | `scripts/verify.sh` | Syntax + Lauf |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss grün sein, Ausgabe wird im PR zitiert. **CI ist die Wahrheit.**
- **Datenkorrektur:** entfällt (keine Bestandsdaten; Projekte werden erst beim nächsten Update-Lauf berührt, mit Bericht je Datei).
- **Angeschlossen (E2E-Pfad):** T4 durchläuft `update-specwright.sh` → `install-lib.sh` → `removed.tsv` gegen ein Fixture mit ältester Fassung — der reale Nutzerpfad. Zusätzlich manuell: `SPECWRIGHT_REPO_URL=file://<worktree> bash update-specwright.sh --dry-run` in einer Kopie eines Altprojekts (Applai-Checkout ist schon auf 4.0.0 mit 0 „lokal geändert" — dort nichts zu erwarten; Nachweis über T4).
- **Bugfix:** Test zuerst (Schritt 1), Fehlschlag bestätigt, dann Fix ohne Änderung an der Test-Erwartung. Hook `protect-tests` aktiv (Fix-Modus).

## 9. Risiken

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| Update löscht jetzt eine Datei, die ein Projekt in alter Fassung bewusst weiterbenutzt | niedrig | niedrig | Nur Byte-identische ausgelieferte Fassungen; Bericht je Datei; Git im Projekt; `keep.txt` | Projektinhaber beim Lesen des Berichts |
| Guard rot in Umgebungen ohne Historie (flacher Klon, Tarball) | niedrig | niedrig | `--check` überspringt bei `is-shallow-repository` = true mit Hinweis | Entwickler |
| Laufzeit des Guards (72 × 2–4 `git show`) | niedrig | niedrig | Messung lokal < 5 s; Teil des ~2-min-`verify` | — |
| Historie enthält eine Fassung, die nie ausgeliefert wurde (nur kurz auf `main`) | niedrig | keine | Löschen einer Datei, die exakt diesem Inhalt entspricht, ist trotzdem korrekt — sie stammt aus Specwright | — |

## 10. Manuelle Schritte

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| PR-Freigabe und Merge nach `main` (löst Auto-Deploy der Web-UI aus; kein UI-Code geändert) | Michael | nach CI grün | [ ] |
| `install.sh --global --update` auf dem Mac erneut ausführen — erwartet 0 Löschungen (Reste am 14.09. von Hand entfernt) | Michael | nach Merge | [ ] |

## 11. Schätzung

2–3 h. Unsicherheit gering: Löschlogik und Testgerüst existieren; neu sind ein Skript von ~60 Zeilen und zwei Testblöcke.

## 12. Review des Plans

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| `HEAD` statt `origin/main` — im Worktree eines Feature-Branches könnten Fassungen aus dem Branch einfließen, die nie auf `main` waren | Self | angenommen als bekannt, kein Umbau: solche Fassungen entstehen nur, wenn ein Branch eine Datei ändert und dann entfernt; Löschen ist auch dann korrekt (§9). `origin/main` ist in CI nicht garantiert vorhanden | §3 |
| Vereinigung statt Neuberechnung — von Hand ergänzte Prüfsummen blieben erhalten, auch falsche | Self | angenommen: Verlust von Handeinträgen wäre schlimmer; falsche Prüfsummen treffen nie eine reale Datei | §3 |
| 4.0.0 fehlt im `CHANGELOG.md` | Self | außerhalb des Vorhabens; nur 4.0.1 ergänzen, Befund nach §14 | §14 |

**Minimalinvasiv geprüft:** `install-lib.sh` unangetastet (Listenlogik existiert); T4 wird angepasst statt ein neuer Test; Guard hängt sich in (d) ein statt neuer Verify-Stufe.

## 13. Definition of Done

- [ ] AK-01 bis AK-04 haben einen grünen Test (§8).
- [ ] Nachweise aus §5 ausgeführt und im PR zitiert.
- [ ] E2E-Pfad (T4) läuft.
- [ ] `verify` grün, Ausgabe im PR — und PR-Checks grün.
- [ ] `docs/architecture.md`: keine Änderung nötig (§3 Nein).
- [ ] Manuelle Schritte (§10) im PR als offen markiert.
- [ ] Abweichungen in §14.
- [ ] 2x-Regel: Prüfsummen von Hand statt aus der Historie — erstes Vorkommen, kein `CLAUDE.md`-Eintrag; Guard verhindert das zweite.
- [ ] Board-Karte verweist auf `intent/INT-2026-003-removed-historie/`, Stand nachgezogen.

## 14. Abweichungen bei der Umsetzung

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
| 2026-09-14 | `CHANGELOG.md` endet bei 3.38.0; 4.0.0 hat keinen Eintrag | Befund beim Lesen von `check-update.sh`; nicht Teil dieses Vorhabens | Hinweis für die Aufräum-Karte im Board |
