# ADR-0001: Ein Session-Worktree darf mehrere Sessions tragen — der Cleanup-Auftrag wandert mit

> Status: Angenommen
> Datum: 2026-09-09
> Betrifft: Cloud-Terminal (`ui/src/server/services/cloud-terminal-manager.ts`), Session-Ziel-Picker
> Umgesetzt in: Commit `e01fe7c`

---

## Kontext

Beim Start einer Cloud-Terminal-Session wählt der Nutzer ein Zielverzeichnis: das Projektverzeichnis, ein bestehender git-Worktree oder ein frisch angelegter („Neuer Worktree"). Ein frisch angelegter Worktree gehört der Session, die ihn erzeugt hat: sie trägt den Cleanup-Token `session.worktreeCleanup` vom Typ `OwnedSessionWorktree` und entfernt Verzeichnis und Branch beim Beenden — außer der Worktree ist dirty, dann bleibt er stehen.

Der Typ ist bewusst gebrandet (`declare const OWNED_BRAND: unique symbol`, `cloud-session-worktree.ts`): nur `createCloudSessionWorktree` kann einen Token erzeugen. Eine Session, die sich lediglich an einen fremden Worktree *anhängt*, kann sich per Compiler keinen Löschanspruch ausdenken.

Bis zu dieser Entscheidung galt zusätzlich eine Exklusivsperre: der Server lehnte den Start in einem Verzeichnis ab, in dem bereits eine Session lief (`TARGET_OCCUPIED`), und der Picker graute solche Zeilen aus. Das Projektverzeichnis war davon ausgenommen — dort laufen Shell-Terminals, der Setup-Assistent und Nicht-Git-Projekte, eine Sperre hätte den Nutzer nach der ersten Session ausgeschlossen.

Diese Ungleichbehandlung war der Auslöser: mit über dreißig Worktrees ist „dieser ist belegt, du darfst nicht rein" eine tägliche Blockade, während dieselbe Situation im Projektverzeichnis seit jeher erlaubt ist.

---

## Entscheidung

**Mehrere Sessions dürfen dasselbe Verzeichnis benutzen — auch einen Worktree.** Die Exklusivsperre im `existing-worktree`-Zweig entfällt. Belegung wird nicht mehr verhindert, sondern angezeigt: die Picker-Zeile trägt ein Schild `N Sessions aktiv`, genau wie das Projektverzeichnis.

**Der Cleanup-Auftrag ist übertragbar.** Endet eine Session, die einen Worktree besitzt, während dort noch eine andere Session arbeitet, wird der Token an diese Session übergeben statt ausgeführt oder verworfen. Die letzte Session, die das Verzeichnis verlässt, räumt auf.

Der Token wird dabei *verschoben*, nicht neu erzeugt — das Branding bleibt gültig und behält seine Bedeutung: eine anhängende Session kann sich weiterhin keinen Löschanspruch ausdenken, sie kann einen bestehenden nur geerbt bekommen. Denselben Weg geht der Boot-Restore seit jeher über `rehydrateOwnedSessionWorktree`.

Ausgegraut bleiben nur die technisch unmöglichen Ziele: `fehlt` (Verzeichnis existiert nicht mehr) und `gesperrt` (git-Lock).

---

## Begründung

Die Sperre schützte gegen zwei verschiedene Dinge, und nur eines davon war ihre Aufgabe:

1. **Zwei Agenten stören sich beim Arbeiten** — gleichzeitige Schreibzugriffe, blockierter git-Index. Das ist ein Nutzungsrisiko, kein Systemfehler, und im Projektverzeichnis akzeptieren wir es seit jeher. Ein Schild mit der Session-Zahl macht es sichtbar; die Entscheidung gehört dem Nutzer.
2. **Eine Session löscht das Verzeichnis einer anderen** — das ist echter Datenverlust und muss verhindert bleiben. Dafür braucht es aber keine Sperre am Eingang, sondern eine Prüfung am Ausgang.

Der zerstörerische Fall ist gerade *nicht* der offensichtliche: `removeCloudSessionWorktree` behält einen dirty Worktree ohnehin (`keptReason: 'dirty'`). Gefährlich ist der saubere Worktree, in dem eine zweite Session gerade erst gestartet ist und noch nichts geschrieben hat — genau dort greift der bestehende Schutz nicht.

Die naheliegende Minimallösung („nicht löschen, solange noch jemand drin sitzt") tauscht nur einen Fehler gegen einen anderen: Der Token hängt an der erzeugenden Session, und die ist danach weg. Die verbleibende Session weiß nichts von einer Aufräumpflicht, und es existiert kein Codepfad, der sie später herstellt. Aus Datenverlust würde ein unbegrenztes Verzeichnis-Leck. Deshalb die Übergabe.

---

## Konsequenzen

**Positiv:**

- Worktrees verhalten sich wie das Projektverzeichnis — eine Regel statt zweier.
- Kein Datenverlust an vier Löschpfaden, die vorher ungeschützt waren (siehe unten).
- Das Aufräumverhalten bleibt aus Nutzersicht unverändert: der Worktree verschwindet, wenn niemand mehr darin ist.

**Negativ / Risiken:**

- Zwei Claude-Agenten im selben Worktree können sich Änderungen überschreiben oder auf einen blockierten git-Index laufen. Bewusst in Kauf genommen, sichtbar gemacht über das Badge.
- Bricht der Serverprozess hart ab, während zwei Sessions ein Verzeichnis teilen, kann ein Worktree liegenbleiben. Er taucht danach als gewöhnlicher Worktree im Picker auf und ist benutz- oder von Hand entfernbar. Leck vor Zerstörung ist hier die bewusste Richtung.
- Der Token wandert und ist damit nicht mehr an die erzeugende Session gebunden — wer den Lebenszyklus liest, muss die Übergabe kennen. Deshalb dieser Eintrag.

**Invarianten, die weiter gelten:**

- Nur `createCloudSessionWorktree` erzeugt einen Token.
- `removeCloudSessionWorktree` prüft weiterhin das Namensschema (`session-*` / `session/*`) und weigert sich, fremde Worktrees anzufassen.
- `worktreeDisposed` wird **vor** jeder Entscheidung synchron gesetzt: kein Teardown-Pfad versucht es zweimal.

---

## Umsetzung

Vier Löschpfade müssen die Prüfung tragen, nicht nur der offensichtliche:

1. **`disposeSessionWorktree`** — Übergabe an `findCleanupSuccessor(worktreePath, excludeSessionId)`. Auswahl und Zuweisung laufen in einem synchronen Block ohne `await`; Node ist single-threaded, damit ist der Vorgang atomar gegen eine gleichzeitig schließende Schwester-Session. Kandidaten mit gesetztem `worktreeDisposed` scheiden aus — sonst schieben zwei gleichzeitig schließende Sessions den Token im Kreis und keine räumt auf. `registry.upsert` persistiert die neue Zuständigkeit sofort.
2. **Boot-Restore (`reapDeadEntry`)** — entscheidet aus der geladenen Registry-Liste plus dem tmux-Snapshot, **nicht** aus `this.sessions`: Restores und Reaps laufen parallel (`Promise.allSettled`), die Map ist zu diesem Zeitpunkt unvollständig. Gehört der Worktree eines toten Eintrags einer überlebenden Session, wird nicht gelöscht und der `worktree`-Payload nach den Restores der überlebenden Session zugeschrieben; das bestehende `replaceAll` persistiert ihn. Wird der Überlebende doch nicht wiederhergestellt, bleibt der Worktree liegen — bewusst.
3. **Rollback nach fehlgeschlagenem Create** — dasselbe Prüfmuster, kleines Zeitfenster, zwei Zeilen.
4. **Auto-Mode** — `removeItemWorktree` (`git worktree remove --force`), `removeStoryWorktree` und `finalizeSpec` fragen `foreignSessionsIn(path)` und lassen das Verzeichnis stehen, sobald eine Session darin arbeitet, die nicht dem Auto-Mode gehört. Slot-Sessions schließen sich über `autoModeActive` selbst aus — nötig, weil `slot.cancel()` nicht awaited wird und die eigene Session beim Removal meist noch lebt.

Pfadvergleiche laufen ausnahmslos über `pathKey()`: `effectiveCwd` ist normalisiert, `worktreeCleanup.worktreePath` nicht (macOS: `/var` vs. `/private/var`). Ohne Normalisierung würde der Schutz still nie greifen.

`CLOUD_TERMINAL_ERROR_CODES.TARGET_OCCUPIED` wird nicht mehr geworfen, bleibt aber im Protokoll und im Recovery-Zweig des Clients: Toleranz gegenüber älteren Servern und ein vorhandener Code, falls je ein Opt-in-Modus „exklusives Ziel" gebaut wird.

---

## Alternativen

- **Sperre beibehalten, nur die Sortierung und Suche liefern.** Löst die Hauptbeschwerde nicht und behält die Ungleichbehandlung gegenüber dem Projektverzeichnis.
- **Sperre entfernen, Löschen einfach überspringen.** Verwandelt Datenverlust in ein unbegrenztes Leck (siehe Begründung).
- **Referenzzähler pro Verzeichnis statt Besitzübergabe.** Fachlich äquivalent, aber ein zweiter Lebenszyklus-Mechanismus neben dem vorhandenen Token — mehr Zustand, mehr Persistenzbedarf, kein zusätzlicher Nutzen.
- **Ownership beim Anhängen kopieren statt beim Beenden übergeben.** Würde das Branding aushöhlen: dann könnte jede anhängende Session löschen, auch wenn der Ersteller noch lebt.

---

## Belege

- `ui/src/server/services/cloud-terminal-manager.ts` — `findCleanupSuccessor`, `foreignSessionsIn`, `disposeSessionWorktree`, `restorePersistedSessions`/`reapDeadEntry`
- `ui/src/server/utils/cloud-session-worktree.ts` — `OwnedSessionWorktree`, `removeCloudSessionWorktree`, `rehydrateOwnedSessionWorktree`
- Tests: `ui/tests/unit/cloud-session-target.test.ts` (Übergabe bei `closeSession` / Ctrl-D / `shutdown`, letzte Session räumt auf, gleichzeitiges Schließen, `foreignSessionsIn`), `ui/tests/unit/cloud-terminal-restore.test.ts` (Boot-Restore-Übergabe)
- `CHANGELOG.md`, Abschnitt 3.36.0
