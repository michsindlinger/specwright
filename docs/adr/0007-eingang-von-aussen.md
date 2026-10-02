# ADR-0007: Eingang von außen — lokales Programm mit Geheimnis startet eine neue Sitzung

> Status: Angenommen
> Datum: 2026-10-02
> Betrifft: Web-UI (`ui/src/server/routes/eingang.routes.ts`, `ui/src/server/services/eingang-service.ts`, `ui/src/server/services/eingang-regeln.ts`, `ui/src/server/utils/lokal-verbindung.ts`, `ui/src/server/services/cloud-terminal-manager.ts`, `ui/src/server/services/workspace-handler.ts`, `ui/src/server/services/vorhaben-service.ts`, `ui/src/server/index.ts`, `ui/src/server/websocket.ts`, `ui/frontend/src/app.ts`), Vorhaben INT-2026-030
> Umgesetzt in: Branch `feat/INT-2026-030-sitzung-von-aussen`

---

## Kontext

Michaels Sprachhelfer hey soll einen gesprochenen Satz an die Specwright-UI am Mac weitergeben können. Die UI startet daraufhin eine neue Claude-Sitzung im genannten Projekt, und der Satz ist der erste Prompt. Bisher kennt die UI nur Browser als Gegenüber: Der Zugriff ist netzseitig begrenzt (Mac lokal, Tailscale, Cloud-Host hinter Cloudflare Access), eine Anmeldung gibt es nicht (`security.md` §2). Die Lokal-Prüfung des Anrufs (ADR-0006) verlangt einen `Origin` der UI selbst und passt deshalb nicht zu einem Programm, das keinen `Origin` schickt.

Der Eingang ist die erste Schnittstelle der UI, die ein Programm statt eines Browsers bedient, die erste mit eigenem Geheimnis und die erste, die von außen eine Sitzung mit Vollzugriff startet. Auth der UI verlangt ein ADR (`CLAUDE.md`, ADR-Pflicht; intent RB-08).

---

## Entscheidung

**HTTP auf dem Backend-Port, standardmäßig aus.** `POST /api/eingang/sitzung` mit `{ projekt, satz, titel? }` und `GET /api/eingang/sitzung/:sessionId`. Der Eingang ist nur an, wenn das Backend auf macOS läuft und `SPECWRIGHT_EINGANG=on` gesetzt ist; jeder andere Wert und das Fehlen der Variable bedeuten aus. Auf dem Cloud-Host (Linux) ist er immer aus.

**Vier Schichten, eine Antwort.** Der Router prüft vor dem Parsen des Body der Reihe nach: (1) Schalter und macOS, (2) Loopback-Adresse, keine Weiterleitungs-Header (`x-forwarded-for`, `x-forwarded-host`, `tailscale-user-login`, `cf-connecting-ip`), `Host` = `localhost`/`127.0.0.1`/`[::1]` mit Backend-Port (`istLokaleVerbindung`, aus `istLokalerBrowser` herausgelöst), (3) kein `Origin`-Header, weil Browser bei Cross-Origin-Anfragen immer einen schicken, (4) Geheimnis im Header `x-specwright-eingang-token`, verglichen in konstanter Zeit (`tokenMatches`). Jede Verletzung antwortet `403 { fehler: 'nicht berechtigt' }` mit demselben Text, damit die Antwort nicht verrät, welche Schicht fehlte. Erst danach wird der Body geparst (8 KB, nur `application/json`); Parser-Fehler werden protokolliert.

**Geheimnis als Laufzeitdatei.** Beim ersten Start mit Eingang an schreibt das Backend 32 Zufallsbytes als Hex nach `<runtime>/eingang-<port>.token` (Ordner `0700`, Datei `0600`) und nennt den Pfad, nicht den Inhalt, im Startlog. hey liest die Datei unter demselben Benutzer. Rotation: Datei löschen, Backend neu starten.

**Inhalt streng geprüft, nichts gekürzt.** Der Satz wird bereinigt (Escape-Sequenzen und Steuerzeichen weg, Zeilenumbrüche und Tabs zu einem Leerzeichen) und abgewiesen, wenn er leer ist, mehr als 500 Zeichen hat oder mit `/` beginnt. Das Projekt muss der Hauptordner eines offenen oder zuletzt geöffneten Projekts sein (Vergleich nach `realpath`, Arbeitskopien gelten als unbekannt). Opus muss in der Modellliste stehen; es gibt kein Ausweichen. Die Hook-Rückmeldung muss bereit sein.

**Bestehender Startpfad, eigene Arbeitskopie, Trenner.** Die Sitzung startet über `CloudTerminalManager.createSession` mit `{ provider: 'anthropic', model: 'opus' }`, explizit in einer neuen Arbeitskopie (`new-worktree`, dieselbe Voraussetzungsprüfung wie der Absicht-Start, `pruefeArbeitskopieMoeglich`) und mit der neuen Option `promptNachTrenner`: vor dem Satz steht `--`, damit ein Satz mit „-" vorn nie als Startschalter gelesen wird. Die übrigen Schalter sind dieselben wie beim UI-Start mit Opus, also auch `--dangerously-skip-permissions` (intent B-07, bewusst angenommen). Der Eingang tippt nie in eine Sitzung und schließt keine (AR-08).

**Obergrenzen im Speicher.** Höchstens 3 offene Sitzungen von außen und höchstens 5 angenommene Anfragen je 60 s. Die Reservierung geschieht synchron vor dem ersten `await`, so überholt keine gleichzeitige Anfrage die Grenze. Das 60-s-Fenster überlebt keinen Neustart; die Grenze der offenen Sitzungen schon (siehe Zustand).

**Zustand und Rückmeldung.** Stufe 1 ist die Zusage (`201 { zustand: 'startet', sessionId, projekt }`). Stufe 2 („aktiv") gilt, wenn der erste `session.prompt-text` der Sitzung (Hook `UserPromptSubmit`) per SHA-256 mit dem Satz übereinstimmt. Anderer Text, Sitzungsende vor Stufe 2 oder 60 s ohne Meldung ergeben „fehler" mit Grund; nach Ablauf der Frist liest der Dienst einmal den Bildschirm und meldet einen offenen Vertrauensdialog als eigenen Grund. Der Zustand liegt in `<runtime>/eingang-<port>.json` (`0600`, tmp + rename, serialisierte Schreibkette) mit Sitzungs-ID, Projektname, Zeitpunkt, Zustand, Grund und Hash, nie mit dem Satz. Der Arbeitsspeicher ist die Quelle der Wahrheit; die Datei wird beim Start gelesen und nach der Wiederherstellung der Sitzungen abgeglichen. Abfragen beantworten Einträge 24 h lang; ein Eintrag einer noch offenen Sitzung bleibt darüber hinaus für die Obergrenze erhalten.

**Protokoll.** Jede Anfrage und Statusabfrage, auch jede abgewiesene, wird als JSON-Zeile in `<runtime>/eingang-<port>.jsonl` (`0600`) geschrieben: Zeit, Art, Projekt, Absenderadresse, Ergebnis, Grund, bei berechtigten Anfragen der bereinigte Satz und die Sitzungs-ID. Zeilen älter als 30 Tage verschwinden beim Start, über 10 MB wird nach `.1` rotiert.

**Browser übernimmt wie jede fremde Sitzung.** Der Tab-Name kommt aus dem Backend (`sessionNames`), ein nur zuletzt geöffnetes Projekt öffnet das Backend im gemeinsamen Arbeitsbereich (`openProjectFromBackend`, ohne Ack, also ohne Aktivierung). Im Frontend wählt ein Fenster ohne aktives Projekt nicht mehr automatisch das erste Projekt, wenn eines dazukommt; beim ersten Zustand und nach dem Schließen des aktiven Projekts bleibt der Rückfall.

---

## Konsequenzen

- Mit Eingang aus verhält sich die UI wie vorher; es entsteht kein Geheimnis. Zustand und Protokoll werden auch dann geschrieben, das Protokoll hält abgewiesene Anfragen fest.
- Jedes Programm unter Michaels Benutzer, das die Token-Datei lesen kann, kann Sitzungen mit Vollzugriff starten (Ein-Nutzer-Annahme, intent AN-03). Gegen Schadsoftware unter demselben Benutzer schützt das nicht.
- Ein falsch erkannter Satz läuft ohne Rückfrage mit Vollzugriff in einer eigenen Arbeitskopie (intent B-07). Der Hauptordner bleibt unberührt; Abschalter ist die Umgebungsvariable.
- Ein Projekt, dem Claude Code noch nie vertraut hat, bleibt am Vertrauensdialog stehen; der Zustand meldet nach 60 s „Vertrauensdialog offen". Arbeitskopien erben das Vertrauen des Hauptordners.
- Startet das Backend zwischen Stufe 1 und Stufe 2 neu, kann eine angekommene Meldung fehlen; die Abfrage zeigt dann „Zeitüberschreitung", obwohl der Satz ankam.
- Der Tab-Titel ist die einzige Stelle, an der Satztext an alle Clients geht (spec AN-S09).
- Ein zweites Programm oder ein Eingang über das Netz braucht ein neues ADR.

---

## Alternativen

| Alternative | Warum nicht |
|---|---|
| WebSocket statt HTTP | hey müsste eine dauerhafte Verbindung halten; HTTP ist für ein Programm einfacher (spec AN-S01) |
| `istLokalerBrowser` direkt nutzen | verlangt einen `Origin`, den ein Programm nicht schickt |
| Nur Loopback ohne Geheimnis | Tunnel und `tailscale serve` liefern fremde Geräte als 127.0.0.1 an; eine fremde Webseite im Browser käme mit einem einfachen POST durch |
| Herkunft als Feld in der tmux-Registry | vier Stellen im Manager, nur für tmux-Sitzungen; die Statusabfrage braucht ohnehin eine eigene Datei |
| Satz wie beim Absicht-Start erst beim ersten Stop einfügen | tippt in eine laufende TUI (AR-08), Stufe 2 später |
| `--` vor jedem ersten Prompt | ändert alle bestehenden Aufrufer ohne Not |
| Satz im Zustand statt Hash | Satztext nur im Protokoll und in der Sitzung (intent RB-04) |
| Vertrauen vorab in `~/.claude.json` eintragen | Datei gehört Claude Code und ist vertraulich; die Arbeitskopie erbt das Vertrauen des Hauptordners |

---

## Belege

- Absicht `intent/INT-2026-030-sitzung-von-aussen/intent.md` (B-01 bis B-10, RB-01 bis RB-08, AK-01 bis AK-12).
- Spec `intent/INT-2026-030-sitzung-von-aussen/spec.md` §4 Randfälle, §5 Daten, §7 Bedenken, AN-S01 bis AN-S12.
- Plan `intent/INT-2026-030-sitzung-von-aussen/plan.md` §2 (Probelauf P1–P7, F4), §3 D1–D12, §9 Risiken, §14 Abweichungen.
- E2E `intent/INT-2026-030-sitzung-von-aussen/e2e/` (Skript, Screenshot, Protokoll).
- `docs/security.md` §1–§4; `docs/architecture.md` §2, §3, §5.
