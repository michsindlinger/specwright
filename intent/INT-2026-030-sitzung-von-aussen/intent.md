---
intent_id: "INT-2026-030"  
titel: "Neue Sitzung von außen starten (Eingang für hey)"  
status: "angenommen"  
version: "1.1.0"  
autor: "Michael Sindlinger (Idee), Claude (Entwurf)"  
verantwortlich: "Product Owner"  
erstellt: "2026-10-02"  
geaendert: "2026-10-02"  
freigabe:  
  von: "Michael Sindlinger (Product Owner)"  
  am: "2026-10-02"  
risikoklasse: "hoch"  
groesse: "M"  
bypass: "nein"  
bypass_grund: ""  
bezuege:  
  product: "docs/product-brief.md"  
  spec: "spec.md"  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: ["cloud-terminal", "eingang", "hey", "sicherheit", "sitzungsstart"]  

---

# Absicht: Neue Sitzung von außen starten (Eingang für hey)

<!-- Ablage: intent/INT-2026-030-sitzung-von-aussen/intent.md -->

## Felder im Kopf

<!-- leser: agent -->

| Feld | Bedeutung | Werte |
|---|---|---|
| `intent_id` | stabile Kennung, nie wiederverwenden | `INT-JJJJ-NNN` |
| `titel` | 5 bis 80 Zeichen | — |
| `status` | Lebenszyklus | `entwurf` · `in_klaerung` · `angenommen` · `umgesetzt` · `abgeloest` · `verworfen` |
| `version` | SemVer, Regeln im Änderungsprotokoll; Datum und Version immer in Anführungszeichen | `"0.1.0"` |
| `verantwortlich` | Rolle, die annimmt und bei Eskalation entscheidet (Pflicht) | — |
| `risikoklasse` | ab `mittel` gilt die Vertragsschicht (Abschnitte 8–12) | `niedrig` · `mittel` · `hoch` |
| `groesse` | Aufwand | `S` unter 1 Tag · `M` 1–5 Tage · `L` über 5 Tage |
| `bypass` | `ja` bei Bugfix oder Größe S: direkt zu `plan.md`, keine `spec.md`; Grund in `bypass_grund` | `ja` · `nein` |
| `bezuege` | Pfade zu Produkt, Spec, Plan, ADRs; `board_karte` = Boardname und Kartentitel; `ersetzt` = Vorgänger-Intent | — |
| `schlagworte` | kleinbuchstaben-mit-bindestrich | — |
| `kennung_hinweis` | optional (INT-2026-022): steht nur, wenn `next-intent-id.sh` die Kennung ohne entfernten Stand vergeben hat | `"ohne entfernten Stand vergeben (JJJJ-MM-TT)"` |

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Ein Programm auf Michaels Mac (zuerst sein Dispatcher hey) soll einen Satz wie „Kreis Lippe, schau dir die fehlschlagenden Tests an" als ersten Auftrag einer frischen Claude-Code-Sitzung im passenden Projekt ablegen können, ohne in laufende Sitzungen hineinzufunken.
- **Kernaufgaben:** Eingang, den nur ein berechtigtes Programm auf demselben Mac erreicht; neue Sitzung in eigener Arbeitskopie mit denselben Rechten wie eine Sitzung aus der UI, mit dem Satz als erstem Prompt; Rückmeldung in zwei Stufen; Sitzung öffnet sich von selbst als Tab mit aussagekräftigem Titel (B-09) im Cloud-Terminal beim Projekt.
- **Endzustand:** Der Absender hält eine Sitzungs-ID und weiß, dass der Satz angekommen ist (AK-01 bis AK-04); die Sitzung steht ohne Klick als Tab im Cloud-Terminal beim Projekt (AK-05); sie läuft mit den Rechten einer UI-Sitzung, nie mit mehr (AK-06); jede unberechtigte, ungültige oder überzählige Anfrage endet ohne Sitzung (AK-07 bis AK-09, AK-12), jede Anfrage steht im Protokoll (AK-10).

## 1. Problem und Anlass

<!-- leser: mensch -->

hey stellt Sätze bereits an Cockpit-Agenten zu (hey INT-2026-003); für Specwright-Projekte fehlt der Weg, weil Sitzungen nur aus der eigenen UI starten [Q: Michael, 2026-10-02]. Laufende Sitzungen setzen je ein Vorhaben um und sprechen direkt mit Michael; ein Auftrag von außen braucht deshalb eine eigene, neue Sitzung [Q: Michael, PO-Entscheidung 2026-10-02].

Der Sitzungsstart mit erstem Prompt existiert schon: `createSession` nimmt `initialPrompt` [Q: ui/src/server/services/cloud-terminal-manager.ts:707-713] und hängt ihn als Startargument an [Q: ui/src/server/services/cloud-terminal-manager.ts:960-961], genutzt von `createWorkflowSession` [Q: ui/src/server/services/cloud-terminal-manager.ts:1249-1266]. Der eingereichte Prompt einer Sitzung kommt über den `UserPromptSubmit`-Hook am Backend an [Q: ui/src/server/routes/cloud-terminal.routes.ts:104].

Zwei Befunde machen das Vorhaben größer als „einen Endpunkt freischalten":

- Jede Claude-Sitzung aus der UI startet heute mit `--dangerously-skip-permissions` [Q: ui/config/model-config.json:10]. „Rechte wie eine selbst gestartete Sitzung" heißt also Vollzugriff auch für einen Auftrag von außen; Michael nimmt das bewusst in Kauf (B-07).
- Das Backend bindet an `0.0.0.0` [Q: ui/src/server/index.ts:13]. Eine Loopback-Prüfung allein reicht nicht: Cloudflare-Tunnel und `tailscale serve` leiten fremde Geräte über einen lokalen Prozess weiter, die Verbindung kommt als 127.0.0.1 an [Q: ui/src/server/utils/lokal-verbindung.ts:6-8; ui/src/server/routes/cloud-terminal.routes.ts:6-9]. Die vorhandene Lokal-Prüfung verlangt einen Browser-`Origin` und passt nicht für ein Programm [Q: ui/src/server/utils/lokal-verbindung.ts:49-70].

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael | Neue Sitzungen öffnen sich ohne eigenen Klick als Tab im Cloud-Terminal beim Projekt; er arbeitet darin weiter oder schließt sie. |
| hey (Absender) | Bekommt einen Eingang mit Zusage oder Absage samt Grund und eine Statusabfrage. Änderungen an hey selbst sind nicht Teil dieses Vorhabens. |
| Systeme | UI-Backend (Sitzungsverwaltung, Hook-Route, neuer Eingang), UI-Frontend (Sitzungsliste), Git (neue Arbeitskopien in Projekten), Laufzeitordner (Geheimnis, Protokoll). |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Ein berechtigtes Programm auf dem Mac startet mit einem Satz eine neue Claude-Code-Sitzung in einem bekannten Projekt; der Satz ist ihr erster Prompt.
- **Z-02:** Der Absender erfährt verlässlich, ob die Sitzung angelegt wurde und ob der Satz angekommen ist.
- **Z-03:** Eine von außen gestartete Sitzung steht sofort als Tab im Cloud-Terminal beim Projekt, ohne dass Michael etwas tun muss.
- **Z-04:** Niemand außer einem berechtigten Programm auf demselben Mac kann so Sitzungen starten, und eine so gestartete Sitzung hat nie mehr Rechte als eine, die Michael in der UI startet.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Keine Befehlsauswahl durch den Absender. Der Satz geht unverändert hinein; Claude entscheidet in der Sitzung selbst, ob es etwa `/specwright:intent` nutzt.
- **NZ-02:** Keine Änderung an laufenden Sitzungen, keine Zustellung in eine bestehende oder wartende Sitzung, keine Warteschlange (PO-Entscheidung 2026-10-02).
- **NZ-03:** Keine Änderung an hey; das ist Phase 2b der hey-Roadmap im hey-Repo.
- **NZ-04:** Kein Eingang auf dem Cloud-Host und nicht über Tailscale, LAN oder Handy.
- **NZ-05:** Keine Änderung der Rechte von Sitzungen, die Michael in der UI selbst startet.
- **NZ-06:** Kein automatisches Schließen ungeöffneter Sitzungen.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn eine berechtigte Anfrage (B-01) mit einem bekannten Projekt (B-02) und einem gültigen Satz (B-03) eingeht, MUSS das System eine neue Claude-Code-Sitzung in einer neu angelegten Arbeitskopie dieses Projekts starten, mit Modell Claude Opus (B-10) und sonst denselben Einstellungen wie bei einem Start aus der UI mit dieser Auswahl, Rechte eingeschlossen (B-07). | Z-01 | Test |
| AK-02 | Wenn das System eine Sitzung nach AK-01 anlegt, MUSS es dem Absender mit der Antwort auf die Anfrage Stufe 1 (B-04) und die Sitzungs-ID melden. | Z-02 | Test |
| AK-03 | Wenn der `UserPromptSubmit`-Hook der neuen Sitzung einen Text meldet, der mit dem bereinigten Satz (B-03) zeichengleich ist, MUSS das System für diese Sitzungs-ID Stufe 2 (B-04) melden. | Z-02 | Test |
| AK-04 | Falls die neue Sitzung vor Stufe 2 endet, der Hook einen anderen Text meldet oder Stufe 2 nicht binnen 60 Sekunden ab Stufe 1 eintritt, dann MUSS die Statusabfrage für diese Sitzungs-ID einen Fehlerzustand mit Grund liefern statt Stufe 2. | Z-02 | Test |
| AK-05 | Wenn eine Sitzung nach AK-01 angelegt ist, MUSS sie in jedem verbundenen UI-Client ohne Klick und ohne Neuladen als Tab mit Titel nach B-09 im Cloud-Terminal beim Projekt erscheinen, ohne den Fokus vom gerade aktiven Tab oder Eingabefeld zu nehmen; ist das Projekt dort nicht offen, wird es mit diesem Tab geöffnet. | Z-03 | Test, Stichprobe |
| AK-06 | Die von außen gestartete Sitzung DARF NICHT mit anderen Startschaltern oder Rechten laufen als eine Sitzung, die Michael in der UI mit der Auswahl Claude Opus startet. | Z-04 | Test |
| AK-07 | Falls eine Anfrage nicht berechtigt ist (B-01), dann MUSS das System sie ohne Sitzung und ohne Arbeitskopie abweisen, mit einem allgemeinen Grund, der nicht verrät, welche Bedingung fehlt. | Z-04 | Test |
| AK-08 | Falls das Projekt unbekannt ist, kein Git-Repository ist oder keine Arbeitskopie angelegt werden kann, dann MUSS das System ohne Sitzung absagen und den Grund nennen. | Z-01 | Test |
| AK-09 | Falls bereits 3 von außen gestartete Sitzungen offen (B-08) sind oder in den letzten 60 Sekunden 5 Anfragen Stufe 1 erhalten haben, dann MUSS das System ohne Sitzung absagen und den Grund nennen. | Z-04 | Test |
| AK-10 | Wenn eine Anfrage eingeht, MUSS das System Zeitpunkt, Projekt, Absenderadresse, Satztext und Ergebnis protokollieren, auch bei Absagen; bei unberechtigten Anfragen ohne Satztext. | Z-04 | Test |
| AK-11 | Solange eine Sitzung nach AK-01 gestartet wird, DARF das System NICHT in eine andere Sitzung schreiben. | Z-01 | Test |
| AK-12 | Wenn der Abschalter (§10) nicht ausdrücklich eingeschaltet ist, MUSS das System jede Anfrage ohne Sitzung abweisen. | Z-04 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Sicherheit | Ein von außen erreichbarer Endpunkt nennt Zugriffsbegrenzung, Eingabevalidierung und Datenklasse der Antwort. | `docs/security.md` §6 Zeile 1 |
| RB-02 | Sicherheit | Ein Pfad von außen wird nie ungeprüft genommen, sondern gegen eine Liste bekannter Ziele geprüft. | `docs/security.md` §6 letzte Zeile (sinngemäß) |
| RB-03 | Sicherheit | Keine Hostnamen, Pfade, Nutzer oder Ports des Cloud-Hosts in Repo-Dateien; das Geheimnis nie ins Repo. | `docs/security.md` §3, §5; `CLAUDE.md` „Nie" |
| RB-04 | Sicherheit | Satztext ist Projektinhalt (intern): nur im Eingangsprotokoll (lokale Datei, 0600) und in der Sitzung selbst, nie in Broadcasts oder allgemeinen Log-Zeilen. | `docs/security.md` §1; `ui/src/server/routes/cloud-terminal.routes.ts:100-103` |
| RB-05 | Technik | Sitzungsstart nur über den bestehenden Startpfad; neue Arbeitskopie wie beim Absicht-Start, nie stiller Start im Hauptcheckout. Grund: eine Regel für Arbeitskopien. | `docs/architecture.md` §2 (INT-2026-022) |
| RB-06 | Technik | Arbeitskopien unter dem bestehenden Hauptrepo-Lock anlegen. | `docs/architecture.md` AR-03 |
| RB-07 | Technik | Herkunft „von außen" (für die Obergrenzen), Tab-Titel und der Anstoß, den Tab zu öffnen, kommen aus dem Backend, nicht aus dem Browser. | `docs/architecture.md` AR-05 |
| RB-08 | Lieferkette | ADR-Pflicht: neue Schnittstelle nach außen mit eigener Absicherung (Auth der UI). | `CLAUDE.md` „Konventionen" |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Form der Schnittstelle für Anfrage und Statusabfrage: HTTP (Vorschlag, einfach für hey) oder WebSocket? | nein, bis dahin gilt: HTTP-POST für die Anfrage, HTTP-GET mit Sitzungs-ID für den Status; Entscheidung in `/spec` | Tech Lead | Spec-Freigabe |
| OF-02 | Wo liegt das Geheimnis, wie bekommt hey es (Pfad im Laufzeitordner, Anzeige in den Einstellungen, Rotation)? | nein, bis dahin gilt: Datei im Laufzeitordner mit Rechten 0600, beim ersten Start erzeugt; Details in `/spec` und ADR | Tech Lead | Spec-Freigabe |
| OF-03 | Wie lange bleibt der Zustand für die Statusabfrage abrufbar? | nein, bis dahin gilt: solange die Sitzung offen ist, höchstens 24 h | Tech Lead | Spec-Freigabe |
| OF-04 | Ausgangsstand und Name der neuen Arbeitskopie (Zweig von welchem Stand, Namensschema)? | nein, bis dahin gilt: wie beim Absicht-Start (INT-2026-022) | Tech Lead | Spec-Freigabe |
| OF-05 | Was passiert mit dem Tab, wenn das Projekt im Cloud-Terminal eines Clients gerade nicht offen ist? | *entschieden 2026-10-02 (PO)*: Projekt wird mit dem neuen Tab geöffnet, ohne Fokuswechsel → AK-05 | PO | erledigt |

---

<!-- ===== Vertragsschicht ===== -->

## 8. Begriffe

<!-- leser: mensch -->

- **B-01 Berechtigte Anfrage:** alle Bedingungen zugleich: (a) Backend läuft auf macOS; (b) Verbindung von einer Loopback-Adresse; (c) `Host` ist `localhost`, `127.0.0.1` oder `[::1]` mit dem Backend-Port; (d) keine Weiterleitungs-Header (`x-forwarded-for`, `x-forwarded-host`, `tailscale-user-login`, `cf-connecting-ip`); (e) das Geheimnis aus der lokalen Datei wird mitgeschickt und stimmt. *Entschieden 2026-10-02 (PO), Rückfrage 2.*
- **B-02 Bekanntes Projekt:** ein Projektordner, den die UI als Projekt kennt (dieselben Ziele wie `cloud-terminal:targets`, `ui/src/server/websocket.ts:589`), angegeben als Ordnerpfad. Verglichen wird nach Auflösen von Symlinks und abschließenden Schrägstrichen. Andere Pfade gelten als unbekannt.
- **B-03 Gültiger Satz:** nach Entfernen aller Steuerzeichen und Escape-Sequenzen nicht leer und höchstens 500 Zeichen lang. Der bereinigte Satz wird unverändert übergeben und nie als Tastenfolge interpretiert. Längere Sätze werden abgewiesen, nicht gekürzt. Leerraum am Anfang und Ende wird entfernt. Ein Satz darf nie als Schalter von Claude Code gelesen werden (etwa wenn er mit „-“ beginnt).
- **B-04 Stufen der Rückmeldung:** Stufe 1 = „Sitzung angelegt, startet" mit Sitzungs-ID, in der Antwort auf die Anfrage. Stufe 2 = „Sitzung aktiv, Satz angenommen", sobald AK-03 erfüllt ist, abrufbar über die Statusabfrage mit Sitzungs-ID. *Entschieden 2026-10-02 (PO), Rückfrage 5.*
- **B-05 Von außen gestartete Sitzung:** eine Sitzung, die über diesen Eingang entstand. Sie zählt für die Obergrenzen (B-08), bis sie geschlossen ist. In der UI ist sie ein gewöhnlicher Tab; eine eigene Markierung oder ein Übernahme-Schritt entfällt. *Entschieden 2026-10-02 (PO), Änderung zu 0.2.0.*
- **B-06 Arbeitskopie:** je Sitzung eine neue Git-Arbeitskopie des Projekts, nie der Hauptcheckout. *Entschieden 2026-10-02 (PO), Rückfrage 3; Vorschlag Hauptcheckout verworfen, weil er Michael gehört und ungesicherte Änderungen tragen kann.*
- **B-07 Rechte:** die Sitzung startet mit denselben Schaltern wie eine Sitzung aus der UI, heute also mit Vollzugriff (`ui/config/model-config.json:10`). Bewusst in Kauf genommenes Risiko: Ein falsch erkannter oder falsch zugestellter Satz wird ohne Rückfrage ausgeführt, samt Push und global eingerichteten Werkzeugen, die Nachrichten senden können. Abgefedert durch eigene Arbeitskopie (B-06), Berechtigung (B-01) und Obergrenzen (B-08). *Entschieden 2026-10-02 (PO), ersetzt die Entscheidung aus Rückfrage 1 („ohne Vollzugriff").*
- **B-08 Obergrenzen:** höchstens 3 offene von außen gestartete Sitzungen, höchstens 5 Anfragen mit Stufe 1 je gleitende 60 Sekunden; „offen” heißt: Sitzung nicht geschlossen, egal ob der Prozess noch läuft; darüber sofortige Absage, keine Wartezeit. Ungeöffnete Sitzungen bleiben offen wie jede andere. *Entschieden 2026-10-02 (PO), Rückfrage 4.*
- **B-09 Titel des Tabs:** Schickt der Absender einen Titel mit, gilt dieser, bereinigt wie B-03 und höchstens 40 Zeichen lang; sonst die ersten Wörter des bereinigten Satzes, an einer Wortgrenze auf höchstens 40 Zeichen gekürzt und mit „…” markiert. Michael kann den Titel ändern wie jeden anderen Tab-Namen. *Entschieden 2026-10-02 (PO), Änderung zu 0.3.0.*
- **B-10 Modell:** Claude Opus beim Anbieter Anthropic, so wie Michael es beim Start einer Sitzung in der UI auswählen würde (Eintrag `opus`, `ui/config/model-config.json:19`), unabhängig von der Standardwahl der UI (heute `sonnet`, `ui/config/model-config.json:3`). Der Absender wählt das Modell nicht (NZ-01). *Entschieden 2026-10-02 (PO), Änderung zu 1.0.0.*

## 9. Erfolgskennzahlen

<!-- leser: mensch -->

| ID | Kennzahl | Zielwert | Messung vor Produktion | Messung im Betrieb | Reaktion bei Verfehlen |
|---|---|---|---|---|---|
| EK-01 | Anteil berechtigter, gültiger Anfragen, die Stufe 2 erreichen | ≥ 95 % (20 Versuche) | E2E-Lauf mit 20 Anfragen gegen ein Scratch-Projekt | Protokoll (AK-10), erste zwei Wochen | Tech Lead prüft Fehlgründe, Fix als Bugfix |
| EK-02 | Zeit von der Anfrage bis Stufe 2 | ≤ 15 s im Median | derselbe E2E-Lauf | Protokoll, erste zwei Wochen | Ursache suchen; kein Gate für die Freigabe |
| EK-03 | Angenommene Anfragen ohne Berechtigung | 0, Kontrollfälle: ohne Geheimnis, mit Weiterleitungs-Header, mit fremdem `Host`, über Tailscale | Test je Kontrollfall | Protokoll | stopp, Eingang abschalten |

## 10. Auslieferung, Betrieb, Zeitbudget

<!-- leser: mensch -->

- **Freigabe Produktion:** Michael (Merge nach `main`).
- **Stufen:** auf einmal; der Eingang ist nur auf dem Mac aktiv, der Cloud-Host bleibt ohne Eingang.
- **Rückzug:** Abschalter per Umgebungsvariable (Name in der Spec), Standard aus (AK-12); Umschalten braucht einen Backend-Neustart, keinen Neubau; schaltet nur Michael.
- **Betrieb:** Michael; Alarme über das Protokoll (AK-10), kein externer Dienst.
- **Zeitbudget:** 3 Arbeitstage ab Spec-Freigabe. Abbruchkriterium: B-01 lässt sich nicht so umsetzen, dass EK-03 hält, dann stopp und neue Entscheidung.

## 11. Entscheidungsrechte

<!-- leser: agent -->

| ID | Stufe | Regel |
|---|---|---|
| ER-00 | allein (vorläufig) | Auslegungsfragen zu AK, RB oder B ohne Widerspruch: engste Auslegung, die den Wortlaut erfüllt; in der Spec unter „Annahmen" dokumentieren; weiterarbeiten. Bestätigung gesammelt bei der Spec-Freigabe. |
| ER-01 | allein | Details ohne Datenverlust und ohne Außenwirkung: interne Struktur, Benennungen, Aufgabenschnitt, synthetische Testdaten. |
| ER-02 | fragen | Neue externe Abhängigkeit (Bibliothek, Fremddienst). |
| ER-03 | fragen | Eine Kennzahl wird vor Produktion verfehlt. |
| ER-04 | stopp | Zugriff auf Produktionsdaten. |
| ER-05 | stopp | Zwei Kriterien widersprechen sich. |
| ER-06 | stopp | Tests, Gates oder Schwellen müssten geändert werden, damit etwas grün wird. |
| ER-07 | stopp | Produktionsfreigabe: bereitet der Agent vor; freigeben darf nur die Rolle aus Abschnitt 10. |
| ER-08 | stopp | Zeitbudget ausgeschöpft. |
| ER-09 | stopp | Jede Lockerung von B-01, B-06 oder B-08 (weniger Prüfungen, Hauptcheckout statt eigener Arbeitskopie, höhere Grenzen) und jeder Startschalter über die einer UI-Sitzung hinaus. |

## 12. Annahmen

<!-- leser: mensch -->

- **AN-01:** Claude Code verarbeitet den Prompt als Startargument sofort und löst den `UserPromptSubmit`-Hook mit genau diesem Text aus. Prüfung: Tech Lead per E2E-Lauf im Plan Mode, vor `/build`.
- **AN-02:** Der Vertrauensdialog für einen neuen Ordner („Do you trust the files…") erscheint in einer neuen Arbeitskopie nicht oder hält Stufe 2 nicht auf. Prüfung: derselbe E2E-Lauf; trifft sie nicht zu, braucht die Spec eine Regel dafür (CLAUDE.md, Fehlerliste: Trust-Dialog).
- **AN-03:** hey läuft unter demselben macOS-Nutzer wie das Backend und darf die Geheimnis-Datei lesen. Prüfung: Michael bestätigt bei der Spec-Freigabe.
- **AN-04:** Eine Arbeitskopie je Fremdauftrag ist auch für reine Fragen („schau dir die Tests an") vertretbar. Prüfung: Michael nach zwei Wochen Betrieb anhand der Zahl ungenutzter Arbeitskopien.

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.1.0 | 2026-10-02 | Änderung PO in der Spec-Runde: Modell fest Claude Opus statt Standardwahl der UI (neu B-10) | AK-01, AK-06, B-10 | Michael Sindlinger (PO), 2026-10-02 |
| 1.0.0 | 2026-10-02 | Freigabe; OF-05 und B-09 bestätigt, OF-05 in AK-05 übernommen. Abgleich Mensch/Agent, Befund: AK-10/AK-12 Tabellenspalten verrutscht, RB-07 nannte die entfallene Markierung, OF-05 noch offen — formal behoben, keine inhaltliche Änderung | AK-05, AK-10, AK-12, RB-07, OF-05 | Michael Sindlinger (PO), 2026-10-02 |
| 0.4.0 | 2026-10-02 | Änderung PO: Tab bekommt aussagekräftigen Titel (B-09, Kernaufgaben, AK-05); AK-04 (Zeitgrenze 60 s), AK-07 (allgemeiner Absagegrund) und AK-12 (Eingang standardmäßig aus) vom PO bestätigt | AK-04, AK-05, AK-07, AK-12, B-09 | — |
| 0.3.0 | 2026-10-02 | Änderung PO: Sitzung öffnet sich als Tab im Cloud-Terminal beim Projekt, ohne Markierung und Übernahme-Schritt, Fokus bleibt; Rechte wie eine UI-Sitzung (Vollzugriff) statt ohne Vollzugriff, Risiko in B-07 benannt | Z-03, Z-04, AK-01, AK-05, AK-06, B-05, B-07, ER-09, AN-01 | — |
| 0.2.0 | 2026-10-02 | Blindprobe (frischer Agent): 1 blockierend — AK-01 widersprach AK-06 (Standard-Einstellungen enthalten Vollzugriff), behoben durch Ausnahme B-07; eingearbeitet: AK-03 zeichengleich, AK-04 Zeitgrenze 60 s, AK-07 allgemeiner Grund, AK-09/B-08 „offen“ und „Stufe 1“, AK-10 auch Absagen, neu AK-12 (Eingang standardmäßig aus), B-02 Pfadvergleich, B-03 kein Schalter, B-05 „übernehmen“, Endzustand, Beleg Tailscale korrigiert | AK-01, AK-03, AK-04, AK-07, AK-09, AK-10, AK-12, B-02, B-03, B-05, B-08 | — |
| 0.1.0 | 2026-10-02 | Entwurf aus Michaels Beschreibung und fünf Rückfragen (Rechte, Absicherung, Arbeitskopie, Grenzen, Rückmeldung — alle Vorschläge angenommen) | alle | — |
