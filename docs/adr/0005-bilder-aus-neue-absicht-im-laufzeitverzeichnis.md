# ADR-0005: Bilder aus „Neue Absicht" liegen im Laufzeitverzeichnis der UI, sieben Tage

> Status: Angenommen
> Datum: 2026-09-18
> Betrifft: Web-UI (`ui/src/server/utils/paste-image.ts`, `ui/src/server/utils/runtime-paths.ts`, `ui/src/server/services/vorhaben-handler.ts`, `ui/src/server/websocket.ts`), Vorhaben INT-2026-020
> Umgesetzt in: PR zu `feat/INT-2026-020-bild-in-neue-absicht`

---

## Kontext

Das Cloud-Terminal kann seit dem Cloud-Host Bilder aus der Zwischenablage annehmen: Der Browser schickt die Bytes per WebSocket, das Backend prüft Art und Größe, schreibt die Datei unter `<runtime>/cloud-terminal/paste/<sessionId>/` und tippt den Pfad in die PTY. Beim Ende der Sitzung löscht `closeSession` den Ordner der Sitzung, beim Herunterfahren des Managers den ganzen `paste/`-Baum. Der Ablageort liegt bewusst nicht unter `/tmp`: Auf dem Cloud-Host läuft die UI mit `PrivateTmp`, und ein `/tmp`-Pfad ist für die Claude-Prozesse im tmux-Dienst unsichtbar.

INT-2026-020 bringt denselben Handgriff auf die Seite „Neue Absicht". Dort gibt es zum Zeitpunkt des Einfügens **noch keine Sitzung**: Der Text wird erst mit „Starten" zur ersten Eingabe einer neuen Sitzung. Ein Bild, das vor der Sitzung entsteht, hat also keinen Besitzer, dessen Ende es aufräumen könnte — und es muss die Sitzung überleben, die es später liest (Claude öffnet die Datei erst im ersten Turn; ein erneuter Zustellversuch braucht sie noch).

Datenhaltung verlangt hier ein ADR (`CLAUDE.md`, ADR-Pflicht bei Datenhaltung).

---

## Entscheidung

**Eigener Ordner neben den Terminal-Bildern, flach, unter dem Laufzeitverzeichnis.** Bilder aus „Neue Absicht" liegen unter `<runtime>/intent-paste/img-<uuid>.<ext>` (`getIntentPasteImageRoot()` in `runtime-paths.ts`), Ordner `0700`, Datei `0600`. Der Ordner liegt **nicht** unter `getPasteImageRoot()`: Alles unter `paste/` gehört einer Sitzung und wird mit ihr gelöscht; der neue Ordner darf von keinem Sitzungsende berührt werden (AK-07).

**Löschfrist sieben Tage, Aufräumen beim Backend-Start.** `pruneOldImages(getIntentPasteImageRoot(), INTENT_PASTE_MAX_AGE_MS)` läuft in `bootWorkspace()` (`websocket.ts`) einmal je Start und löscht nur reguläre Dateien direkt im Ordner, deren `mtime` älter als sieben Tage ist — nie rekursiv, nie anhand eines Pfads aus einer Nachricht. Ein Fehler dort bricht den Start nicht ab. Der Cloud-Host startet bei jedem Merge neu, der Mac täglich; ein Timer im laufenden Betrieb wäre Zustand ohne Nutzen (AK-08, OF-01/OF-02 der Absicht).

**Eine Prüf- und Ablagefunktion für beide Wege.** Allowlist der Bildarten und die 10-MB-Grenze bleiben allein in `cloud-terminal.protocol.ts`; `persistPastedImage(dir, base64, mimeType)` in `utils/paste-image.ts` prüft und schreibt für Terminal **und** „Neue Absicht" (Reihenfolge und Fehlercodes des Terminals, Endung immer aus der Map, nie vom Client). `savePastedImage` des Terminals behält nur Sitzungsprüfung und PTY-Schreiben (RB-04, NZ-05).

**Kein neuer Zustand in `vorhaben-<port>.json`.** Der Pfad steht als Text im Feld und wandert mit `firstInput` in die Sitzung (ADR-0002 unverändert). Der Eingang ist eine WebSocket-Nachricht (`vorhaben:absicht-bild`), kein HTTP-Endpunkt; Zugriffsbegrenzung wie die ganze UI plus „Projekt muss offen sein" (RB-01, `security.md` §6).

---

## Konsequenzen

- Bilder ohne Sitzung überleben bis zu sieben Tage; eine verwaiste Datei (Antwort erreichte den Browser nicht, Sitzung nie gestartet) kostet höchstens sieben Tage Platz.
- Der Ordner ist intern (`security.md` §1), pro Backend-Instanz/Host; er liegt unter `ui/runtime/` (gitignored) bzw. `SPECWRIGHT_RUNTIME_DIR` und wird beim `git reset --hard` des Deploys nicht angefasst.
- Das Terminal-Einfügen ändert sein Verhalten nicht; seine Backend-Tests laufen unverändert gegen die gemeinsame Funktion.
- Ein zweiter Aufrufer der Ablage (etwa ein Bild in einer Anmerkung) nutzt dieselbe Funktion mit eigenem Ordner — die Regel „Sitzungsordner werden mit der Sitzung gelöscht, alles andere hat eine Frist" bleibt.

---

## Alternativen

| Alternative | Warum nicht |
|---|---|
| Sitzung sofort beim Einfügen starten und den Terminal-Weg nutzen | Kehrt den Ablauf um: Sitzung läuft, bevor der Text fertig ist; Modell schon gewählt; „Starten" ohne Sinn; der Pfad träfe den Startbildschirm statt den ersten Stop. |
| Bild als Base64 im `firstInput` mitschicken, Backend legt es beim Start ab | `firstInput` ist ein Text mit 8000 Zeichen Grenze; 13 MB Base64 im Nutzerzustand wären eine neue Datenart in `vorhaben-<port>.json` (ADR-0002). |
| Unterordner von `paste/` (etwa `paste/<projectId>` oder `paste/absicht`) | Heute sicher, aber die Regel „alles unter `paste/` gehört einer Sitzung" bekäme eine Ausnahme; beim Herunterfahren wird der ganze Baum gelöscht. |
| Bild nach der Zustellung sofort löschen | PO-Entscheidung OF-02: Claude liest die Datei erst im Turn, ein Re-Send braucht sie noch. |
| Aufräumen per Timer im Betrieb | Zustand ohne Nutzen; die Hosts starten oft genug (AK-08 sagt „beim Start"). |
| HTTP-Upload (`POST /api/…`) | NZ-04; `/api/images` wurde am 16.09. bewusst entfernt (`security.md` Änderungsprotokoll). |

---

## Belege

- Absicht `intent/INT-2026-020-bild-in-neue-absicht/intent.md` (AK-07, AK-08, OF-01/OF-02, RB-01…RB-04, NZ-04/NZ-05).
- Plan `intent/INT-2026-020-bild-in-neue-absicht/plan.md` §3 (Ansatz, verworfene Alternativen, Sicherheit), §12 Finding 3 und 7.
- Tests: `ui/tests/unit/vorhaben-absicht-bild.test.ts` (Ablage, Codes, Projektprüfung, Ordner nicht unter `paste/`, `pruneOldImages`), `ui/tests/unit/cloud-terminal-paste-image.test.ts` (Terminal unverändert).
- `docs/architecture.md` §3 (Zeile „Bilder aus „Neue Absicht""), `docs/security.md` §1.
