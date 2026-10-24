---
description: Gemeinsames Muster für PRs auf den Factory-Zweig — Zweig klären, frisch holen, Arbeitskopie, Push/PR/Merge mit Bestätigung, Fortsetzen
globs:
alwaysApply: false
version: 1.0
encoding: UTF-8
---

# Factory-PR

## Overview

Drei Abläufe bringen Dateien eines geschnittenen Vorhabens (Kartendatei `cards.yaml` im Vorhaben-Ordner) auf den Zweig, den die Software Factory liest: der Plan-PR (`plan` Step 10), der Handschritt-PR und der Abschluss-PR (`build` Step 1b–1g). Diese Datei hält das gemeinsame Muster in fünf Bausteinen (INT-2026-035). Die Workflows rufen sie per `EXECUTE` und nennen den Baustein. Es gibt keinen Laufzeit-Mechanismus dahinter: Der Hauptagent liest und befolgt die Regeln.

**Grundsätze:**
- Jeder Schritt, der etwas nach außen trägt (Hochladen, PR anlegen, Mergen), steht hinter einem eigenen WAIT. Ein Ja gilt für genau einen Schritt und genau einen PR.
- Nein an jeder Stelle → Satz „offen: [Schritt]; fortsetzen mit [Befehl]" und Ende, ohne weitere Änderung.
- Jeder Lese- und Aufsetzschritt nach FZ-Holen nutzt nur `origin/[b]`, nie einen lokalen Zweig.
- Zweige eines Ablaufs bilden eine Familie (`[präfix]`, `[präfix]-r1`, …) mit einem Nummernkreis; FZ-Fortsetzen bestimmt Zustand und nächsten freien Zweig.
- Fragen nach R2 (`specwright/workflows/meta/leser-und-rueckfragen.md`): PR-Art und Kennung nennen, Gegenstand in einem Satz, Frage.
- Keine Pfade, Hosts oder Projektnamen der Factory in Dateien, die ins Repo gehen (Commit-Nachrichten, Protokolle).

## FZ-Klären — Factory-Zweig bestimmen

1. Umgebungsvariable `SPECWRIGHT_FACTORY_DIR` gesetzt, und `package.json` in diesem Ordner hat die Skripte `ready-check` und `create-cards`? Sonst Rückkehr „keine Software Factory eingerichtet".
2. Betriebsdatei wie `plan` Step 1: Vorschlag die Datei unter `~/.factory/*/factory.yaml`, deren `github.repo` zum `origin` des Projekts passt; die Person bestätigt. Keine passende Datei → Rückkehr „keine Betriebsdatei für dieses Projekt".
3. Factory-Zweig `[b]` = Feld `code.branch` der Betriebsdatei. Steht in `plan.md` §7 eine Zeile **Factory-Zweig:** mit anderem Wert → Rückfrage nach R2, nicht raten.

## FZ-Holen — frischen Stand holen

RUN `git fetch origin +refs/heads/[b]:refs/remotes/origin/[b]` (expliziter Refspec, auch in Klonen mit nur einem Zweig).
Fehlschlag → Meldung zeigen, Ende.

## FZ-Arbeitskopie — eigener Zweig auf frischem Stand

Eingabe: Name `[name]` (z. B. `INT-JJJJ-NNN-plan`, `INT-JJJJ-NNN-H-nn`) und Zweig `[zweig]`.

1. `mkdir -p ../[projekt]-worktrees`
2. Pfad `../[projekt]-worktrees/[name]` existiert nicht → `git worktree add ../[projekt]-worktrees/[name] -b [zweig] origin/[b]`. Gibt es `[zweig]` lokal schon (früherer Lauf) → `git worktree add ../[projekt]-worktrees/[name] origin/[b]` und darin `git switch -C [zweig] origin/[b]`.
3. Pfad existiert und `git -C [pfad] status --porcelain` ist leer → wiederverwenden: `git -C [pfad] switch -C [zweig] origin/[b]`.
4. Pfad existiert und ist nicht sauber → STOP mit Pfad und Satz „Arbeitskopie nicht sauber; bitte sichern oder entfernen".

Der Hauptcheckout wird nie umgeschaltet. Alle folgenden Git-Befehle laufen mit `git -C [pfad]`.

## FZ-PR — Hochladen, PR, Zustand, Merge

Eingabe: Arbeitskopie `[pfad]`, Zweig `[zweig]`, PR-Art (Plan-PR, Handschritt H-nn, Abschluss-PR), Titel, Fortsetzungsbefehl `[befehl]`.

1. SHOW PR-Art, Zweig, Ziel `[b]` und die Dateiliste `git -C [pfad] diff --name-only origin/[b]..HEAD`.
   WAIT „[PR-Art] INT-JJJJ-NNN, [n] Dateien auf Zweig [zweig]: hochladen?"
   Nein → „offen: Hochladen; fortsetzen mit [befehl]", Ende.
2. RUN `git -C [pfad] push -u origin [zweig]`.
   WAIT „[PR-Art] INT-JJJJ-NNN: PR gegen [b] anlegen?"
   Nein → „offen: PR anlegen; fortsetzen mit [befehl]", Ende.
3. RUN `gh pr create --repo [owner/name] --base [b] --head [zweig] --title "[Titel]" --body "[Kurzbeschreibung]"`; Link zeigen.
4. Merge-Sperre (siehe unten) greift → Satz „Merge ist hier Schritt der Person: [Link]", Ende.
5. RUN `gh pr view [n] --json mergeable,mergeStateStatus,statusCheckRollup` und den Zustand zeigen. Laufen Prüfungen noch (`PENDING`, `UNKNOWN`), bis zu fünf Minuten erneut abfragen.
   Nicht mergebar → nicht mergen, Grund und Weg weiter zeigen, Ende:
   - `mergeable: CONFLICTING` → Weg: PR schließen (`gh pr close [n]`), FZ-Holen, nächster freier Zweig der Familie (FZ-Fortsetzen) vom frischen Stand, Änderung erneut anwenden, FZ-PR.
   - rote Prüfung in `statusCheckRollup` → Weg: Ursache im CI-Log, beheben, erneut hochladen.
   - `mergeStateStatus: BLOCKED` (Schutzregel, fehlendes Review) → Weg: Regel erfüllen, dann `[befehl]`.
   - Prüfungen laufen nach fünf Minuten noch (`PENDING`, `UNKNOWN` oder ein Eintrag in `statusCheckRollup` ohne Ergebnis) → „offen: Merge von PR #[n] (Prüfungen laufen noch); fortsetzen mit [befehl]“. Laufende Prüfungen sperren den Merge in jedem Lauf: Fortsetzen kommt über „offen“ wieder hierher und fragt neu ab.
6. WAIT „[PR-Art] INT-JJJJ-NNN, PR #[n] ([Link]): mergen?"
   Nein → „offen: Merge von PR #[n]; fortsetzen mit [befehl]", Ende.
7. RUN `gh pr merge [n] --merge`. Nie `--admin`, nie `--auto`. Ergebnis zeigen.

RULE: Ein Ja aus Schritt 6 gilt für genau diesen PR. Ein zweiter PR im selben Lauf braucht ein eigenes Ja.

### Merge-Sperre

`gh repo view --json nameWithOwner,defaultBranchRef` zeigt `nameWithOwner` = `michsindlinger/specwright` **und** `[b]` = `defaultBranchRef.name` → kein Merge durch den Lauf; ein Merge dort löst den Auto-Deploy der Web-UI aus. Forks sind nicht gemeint.

## FZ-Fortsetzen — wo steht ein früherer Lauf?

Vor FZ-Arbeitskopie bei jedem Aufruf. Eingabe ist ein Präfix `[präfix]` (z. B. `plan/INT-JJJJ-NNN`, `hand/INT-JJJJ-NNN-H-nn`, `abschluss/INT-JJJJ-NNN`), kein einzelner Zweig.

**Zweigfamilie:** Ein Zweigname gehört genau dann dazu, wenn er dem Ausdruck `^[präfix](-r([1-9][0-9]*))?$` entspricht (Präfix wörtlich). Runde = Zahl nach `-r`, numerisch verglichen (`-r10` ist jünger als `-r9`); der Zweig ohne Anhängsel ist Runde 0. Andere Namen (`[präfix]9`, `[präfix]-r1x`, `[präfix]-r01`) gehören nicht dazu und werden übergangen. Konflikt-Versuche und Neuschnitte teilen diesen einen Nummernkreis; die Runde im Zweignamen ist kein Neuschnitt-Zähler.

1. RUN `gh pr list --state all --search "head:[präfix]" --limit 100 --json number,state,headRefName,mergedAt,url` (GitHub filtert `head:` als Präfix), dann mit der Familienregel filtern. Genau 100 Einträge → STOP „PR-Liste abgeschnitten“, nicht raten.
2. RUN `git ls-remote --heads origin "refs/heads/[präfix]*"`, dann mit derselben Regel filtern.
3. Jüngstes Mitglied = Zweig mit der höchsten Runde aus beiden Quellen. Hat er mehrere PRs, zählt nur die höchste PR-Nummer.

| Lage des jüngsten Mitglieds | Zustand | Weiter |
|---|---|---|
| höchste PR-Nummer `OPEN` | offen | FZ-PR ab Schritt 4 mit diesem PR |
| höchste PR-Nummer `MERGED` | erledigt | nächster Ablauf (auch wenn der Zweig gelöscht ist) |
| höchste PR-Nummer `CLOSED` | verworfen | nächster freier Zweig, FZ-Arbeitskopie, Änderung erneut anwenden, FZ-PR ab Schritt 1 — auch wenn der alte Zweig noch auf origin liegt |
| kein PR, Zweig auf origin | hochgeladen | FZ-PR ab Schritt 2 („PR anlegen?“) |
| Familie leer | neu | Zweig `[präfix]` |

Rückgabe an den Aufrufer: Zustand, PR (falls vorhanden) und **nächster freier Zweig** `[präfix]-r[höchste Runde + 1]`.
