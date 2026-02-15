# Test-Szenarien: Git Integration Erweitert

> Generiert am 2026-02-11 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-11-git-integration-erweitert

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI für automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Agent OS Web UI läuft lokal (`npm run dev` im `agent-os-ui/` Verzeichnis)
- [ ] Ein Git-Repository ist im Projektverzeichnis vorhanden
- [ ] `gh` CLI ist installiert und authentifiziert (für PR-Badge Tests)
- [ ] Dateien im Working Directory vorhanden (modified, staged, untracked)

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Git-Repo | Lokales Test-Repo | Beliebiges Repo mit geänderten Dateien |
| GitHub PR | Offener PR auf aktuellem Branch | Für PR-Badge Tests |

---

## Test-Szenarien

### Szenario 1: GITE-001 - Git Backend Erweiterung (Revert, Delete, PR-Info)

**Beschreibung:** Backend-Endpunkte für Revert, Delete Untracked und PR-Info testen

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Eine Datei modifizieren (z.B. `echo "test" >> src/app.ts`) | Datei erscheint als "modified" in `git status` |
| 2 | WebSocket-Nachricht `git:revert` mit `{ files: ["src/app.ts"] }` senden | Response `git:revert:response` mit `revertedFiles: ["src/app.ts"]` |
| 3 | `git status` prüfen | Datei ist nicht mehr modifiziert |
| 4 | Neue Datei erstellen (`touch src/temp.ts`) | Datei erscheint als "untracked" |
| 5 | WebSocket-Nachricht `git:delete-untracked` mit `{ file: "src/temp.ts" }` senden | Response mit Erfolg, Datei existiert nicht mehr |
| 6 | WebSocket-Nachricht `git:pr-info` senden (Branch mit PR) | Response mit `number`, `state`, `url`, `title` |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Staged Datei reverten | Datei ist staged (`git add`) | Wird zuerst unstaged, dann revertiert |
| Batch-Revert | Mehrere Dateien gleichzeitig reverten | Alle Dateien in `revertedFiles`, fehlgeschlagene in `failedFiles` |
| Tracked Datei löschen | Delete-Request für tracked Datei | Fehler "Datei ist nicht untracked" |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Revert mit Konflikten | Datei mit Merge-Konflikten | Datei in `failedFiles` mit Fehlermeldung |
| PR-Info ohne gh CLI | gh CLI deinstalliert/nicht im PATH | `null` zurückgegeben, kein Fehler |
| PR-Info ohne PR | Branch ohne offenen PR | `null` zurückgegeben |

---

### Szenario 2: GITE-002 - Datei-Aktionen im Commit-Dialog

**Beschreibung:** Revert- und Delete-Buttons im Commit-Dialog testen

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Commit-Dialog öffnen (Commit-Button in Status-Leiste) | Dialog zeigt Dateiliste mit modified/staged/untracked Dateien |
| 2 | Revert-Button neben einer modifizierten Datei klicken | Datei wird revertiert, verschwindet aus der Liste |
| 3 | "Alle reverten" Button klicken | Alle modified/staged Dateien werden revertiert |
| 4 | Lösch-Button neben einer untracked Datei klicken | Bestätigungsdialog erscheint |
| 5 | Löschung bestätigen | Datei wird gelöscht, verschwindet aus der Liste |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Nur untracked Dateien | Keine modified/staged Dateien vorhanden | "Alle reverten" Button ist deaktiviert |
| Revert während Operation | Revert-Button klicken während Revert läuft | Button zeigt Lade-Zustand, weitere Klicks blockiert |
| Löschung abbrechen | Im Bestätigungsdialog "Abbrechen" klicken | Datei bleibt erhalten, Dialog schließt sich |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Revert-Button Typ | Revert bei untracked Datei | Kein Revert-Button sichtbar (nur Lösch-Button) |
| Leere Dateiliste | Keine geänderten Dateien | Keine Action-Buttons sichtbar |

---

### Szenario 3: GITE-003 - PR-Anzeige in Status-Leiste

**Beschreibung:** PR-Badge in der Git-Status-Leiste testen

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Branch mit offenem PR auschecken | PR-Badge "#XX OPEN" erscheint in Status-Leiste |
| 2 | Badge-Farbe prüfen | Grün für OPEN |
| 3 | Auf PR-Badge klicken | GitHub-PR-Seite öffnet sich im neuen Browser-Tab |
| 4 | Branch ohne PR auschecken | PR-Badge verschwindet |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| MERGED PR | Branch mit gemergtem PR | Badge zeigt lila Farbe |
| CLOSED PR | Branch mit geschlossenem PR | Badge zeigt rote Farbe |
| gh CLI fehlt | gh CLI nicht installiert | Kein Badge angezeigt, keine Fehlermeldung |
| Branch-Wechsel | Von Branch mit PR zu Branch ohne PR | Badge verschwindet sofort |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Netzwerkfehler | Kein Internetzugang für gh CLI | Kein Badge angezeigt, keine Fehlermeldung (graceful degradation) |

---

### Szenario 4: GITE-004 - Commit & Push Workflow

**Beschreibung:** "Commit & Push" Button und Workflow testen

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Dateien ändern (mind. 1 Datei) | "Commit & Push" Button in Status-Leiste aktiv |
| 2 | "Commit & Push" Button klicken | Commit-Dialog öffnet sich, alle Dateien vorausgewählt |
| 3 | Commit-Message eingeben | Button zeigt "Commit & Push (N)" |
| 4 | "Commit & Push" klicken | Button zeigt "Committing..." |
| 5 | Warten auf Commit | Button wechselt zu "Pushing..." |
| 6 | Warten auf Push | Dialog schließt sich, Erfolgsmeldung |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Keine Änderungen | Keine geänderten Dateien | "Commit & Push" Button ist deaktiviert |
| Laufende Operation | Git-Operation bereits aktiv | "Commit & Push" Button ist deaktiviert |
| Dialog während Push | Push läuft, Dialog schließen versuchen | "Schließen" und "Abbrechen" Buttons deaktiviert |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Push fehlgeschlagen | Remote nicht erreichbar | "Commit erfolgreich, Push fehlgeschlagen" |
| Commit fehlgeschlagen | Leere Commit-Message | Commit-Fehler angezeigt, kein Push versucht |

---

## Regressions-Checkliste

Bestehende Funktionalität, die nach der Implementierung noch funktionieren muss:

- [ ] Git-Status laden - Status-Leiste zeigt Branch-Name, ahead/behind Counter
- [ ] Git-Commit (normaler Modus) - Commit-Dialog öffnen, Dateien auswählen, committen
- [ ] Git-Push - Push-Button in Status-Leiste funktioniert
- [ ] Git-Pull - Pull-Button in Status-Leiste funktioniert
- [ ] Branch-Wechsel - Branch-Selector funktioniert
- [ ] Dateiliste im Commit-Dialog - Dateien werden korrekt aufgelistet und sind selektierbar
- [ ] WebSocket-Verbindung - Alle bestehenden Git-Messages funktionieren weiterhin

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
Status-Leiste: aos-git-status-bar
Commit-Dialog: aos-git-commit-dialog
Revert-Button: .file-action-btn (revert-file Event)
Delete-Button: .file-action-btn (delete-untracked Event)
Alle Reverten: .revert-all-btn (revert-all Event)
PR-Badge: .git-status-bar__pr-badge
Commit & Push Button: .commit-push-btn
```

### API-Endpunkte (WebSocket Messages)
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `git:revert` | WebSocket | Dateien auf letzten Commit-Stand zurücksetzen |
| `git:revert:response` | WebSocket | Revert-Ergebnis mit revertedFiles/failedFiles |
| `git:delete-untracked` | WebSocket | Untracked Datei löschen |
| `git:delete-untracked:response` | WebSocket | Delete-Ergebnis |
| `git:pr-info` | WebSocket | PR-Info für aktuellen Branch abrufen |
| `git:pr-info:response` | WebSocket | PR-Daten (number, state, url, title) oder null |

### Mock-Daten
```json
{
  "gitRevertResult": {
    "revertedFiles": ["src/app.ts", "src/utils.ts"],
    "failedFiles": []
  },
  "gitPrInfo": {
    "number": 42,
    "state": "OPEN",
    "url": "https://github.com/user/repo/pull/42",
    "title": "feat: Extend Git Integration"
  }
}
```

---

## Notizen

- PR-Badge Tests erfordern eine funktionierende `gh` CLI Installation und GitHub-Authentifizierung
- Revert-Tests sollten mit einem temporären Branch durchgeführt werden, um echte Änderungen nicht zu verlieren
- Batch-Revert Tests sollten sowohl modified als auch staged Dateien einschließen
- Der "Commit & Push" Workflow testet die Sequenz Commit → Push, daher sollte ein Remote konfiguriert sein
