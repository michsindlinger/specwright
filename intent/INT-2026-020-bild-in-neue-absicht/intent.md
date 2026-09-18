---
intent_id: "INT-2026-020"  
titel: "UI: Bild aus der Zwischenablage in „Neue Absicht" einfügen wie im Terminal"  
status: "angenommen"  
version: "1.0.1"  
autor: "Michael Sindlinger (Feedback aus dem Gebrauch, 18.09.2026, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-18"  
geaendert: "2026-09-18"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Größe S: ein Textfeld bekommt den Einfüge-Weg, den das Terminal schon hat; Ablage und Löschregel klein; Kern-Absicht direkt zu plan.md (CLAUDE.md Arbeitsweise)"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, neue-absicht, zwischenablage, screenshot, terminal, phase-5]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — im Chat: „Freigabe: intent.md 0.1.0", 18.09."  
  am: "2026-09-18"  

---

# Absicht: UI: Bild aus der Zwischenablage in „Neue Absicht" einfügen wie im Terminal

<!-- Ablage: intent/INT-2026-020-bild-in-neue-absicht/intent.md · Bypass: Kern-Absicht, Plan in plan.md -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Michael beschreibt ein Vorhaben auf „Neue Absicht" oft mit einem Screenshot; heute muss er dafür erst die Sitzung starten und das Bild im Terminal nachreichen. Künftig fügt Cmd+V das Bild direkt im Textfeld ein — es erscheint dort als Pfad, genau wie im Terminal.
- **Kernaufgaben:** (1) Cmd+V mit einem Bild in der Zwischenablage legt das Bild ab und schreibt seinen Pfad an die Cursorstelle des Textfelds. (2) Der Pfad wandert mit dem Text als erste Eingabe in die Sitzung, die Claude das Bild lesen lässt. (3) Text-Einfügen bleibt, wie es ist.
- **Endzustand:** AK-01 bis AK-08 sind erfüllt; das Terminal-Einfügen ändert sich nicht.

## 1. Problem und Anlass

<!-- leser: mensch -->

Das Textfeld auf „Neue Absicht" ist ein gewöhnliches Textfeld ohne eigene Behandlung des Einfügens; es kennt nur Tippen und Cmd+Enter [Q: `ui/frontend/src/components/vorhaben/aos-neue-absicht.ts:205-213`, `:169-174`]. Liegt ein Bild in der Zwischenablage, tut Cmd+V dort nichts — der Browser wirft Bilddaten in Textfeldern weg [Q: Michael, 18.09.2026]. Der Text des Felds geht beim Start als erste Eingabe an die Sitzung und wird ihr beim ersten Stop zugestellt [Q: `aos-neue-absicht.ts:186`, `ui/src/server/services/vorhaben-service.ts:695`, `:897-903`].

Im Terminal funktioniert das Bild-Einfügen seit dem Cloud-Terminal: ein Einfüge-Lauscher fängt Cmd+V ab, prüft, ob ein Bild dabei ist, und lädt es zum Backend hoch [Q: `ui/frontend/src/components/aos-terminal.ts:449-455`, `:811-838`]. Das Backend legt die Datei unter `<runtime>/cloud-terminal/paste/<sessionId>/` ab und tippt den absoluten Pfad in die Sitzung; Claude Code liest ihn als Bild [Q: `ui/src/server/services/cloud-terminal-manager.ts:1443-1451`, `ui/src/server/utils/runtime-paths.ts:52-54`; der Pfad im Aufruf dieses Vorhabens ist so entstanden, Michael, 18.09.2026]. Dieser Weg setzt eine laufende Sitzung voraus: ohne aktive Sitzung lehnt das Backend ab [Q: `cloud-terminal-manager.ts:1408-1419`], und beim Ende der Sitzung löscht es ihren Bilder-Ordner [Q: `cloud-terminal-manager.ts:1263-1268`]. Auf „Neue Absicht" gibt es die Sitzung beim Tippen noch nicht — sie entsteht erst mit „Starten". Das Bild braucht deshalb einen eigenen Ablageort und eine eigene Löschregel.

Anlass: Feedback aus dem Gebrauch am 18.09.2026 — Michael wollte einen Screenshot zur Absicht mitgeben und musste ihn im Terminal nachreichen. Eine Board-Karte gibt es dazu nicht [Q: Vault nicht erreichbar in dieser Sitzung; Karte laut Abschlussbericht anlegen].

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael am Mac | Cmd+V mit Screenshot auf „Neue Absicht" fügt den Bildpfad ein; die Sitzung sieht das Bild von Anfang an |
| Michael am Handy | dasselbe mit Einfügen aus Fotos (die Bildarten des Terminals gelten, auch HEIC) |
| Systeme | Web-UI-Frontend: `aos-neue-absicht`; Web-UI-Backend: Ablage und Löschregel für Bilder ohne Sitzung; Terminal-Einfügen unberührt |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Ein Bild aus der Zwischenablage landet mit einem Handgriff im Text von „Neue Absicht" und erreicht die Sitzung mit dem Text.
- **Z-02:** Das Verhalten entspricht dem Terminal: gleicher Handgriff, gleiche Bildarten, gleiche Größengrenze, gleiche Rückmeldungen.
- **Z-03:** Abgelegte Bilder sammeln sich nicht an.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Keine Anmerkungs-Felder der Vorhaben-Seite — eigenes Vorhaben, falls gewünscht (Entscheidung PO, 18.09.2026).
- **NZ-02:** Keine Vorschau, kein Miniaturbild, keine Bildliste im Textfeld — der Pfad ist die Darstellung, wie im Terminal.
- **NZ-03:** Kein Ziehen-und-Ablegen von Dateien, kein Datei-Wählen-Knopf.
- **NZ-04:** Kein Bild-Endpunkt außerhalb der WebSocket-Verbindung; `/api/images` bleibt entfernt (`docs/security.md`, 16.09.2026).
- **NZ-05:** Keine Änderung am Terminal-Einfügen und an der Zustellung der ersten Eingabe.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn auf „Neue Absicht" Cmd/Ctrl+V gedrückt wird und die Zwischenablage ein Bild einer erlaubten Art enthält, MUSS das System den absoluten Pfad des abgelegten Bilds an der Cursorstelle des Textfelds einfügen, mit je einem Leerzeichen davor und danach. | Z-01 | Test |
| AK-02 | Wenn die Zwischenablage kein Bild enthält, MUSS das Einfügen als Text ablaufen wie heute. | Z-02 | Test |
| AK-03 | Solange ein Bild hochgeladen wird, MUSS das System das unter dem Feld sagen, und nach Erfolg oder Fehler die Meldung des Terminals zeigen („Screenshot eingefügt", Fehlergrund). | Z-02 | Test |
| AK-04 | Falls das Bild größer als die Grenze des Terminals ist oder eine nicht erlaubte Art hat, dann MUSS das System das Einfügen ablehnen und den Grund nennen; der Text bleibt unverändert. | Z-02 | Test |
| AK-05 | Wenn „Starten" gedrückt wird, MUSS der Pfad Teil der ersten Eingabe sein, die die Sitzung erhält. | Z-01 | Test |
| AK-06 | Solange ein Upload läuft, DARF „Starten" NICHT auslösen. | Z-01 | Test |
| AK-07 | Ein Bild MUSS mindestens bis zur Zustellung der ersten Eingabe an die Sitzung lesbar bleiben; das Ende einer anderen Sitzung DARF es NICHT löschen. | Z-01 | Test |
| AK-08 | Wenn das Backend startet, MUSS es Bilder aus „Neue Absicht" löschen, die älter als sieben Tage sind. | Z-03 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Sicherheit | Ein neuer Eingang der UI für Bilddaten nennt im Plan Zugriffsbegrenzung, Eingabevalidierung (Bildart, Größe, leere Daten) und Datenklasse. Grund: Pflichtprüfung bei Endpunkten. | `docs/security.md` §6 |
| RB-02 | Datenschutz | Abgelegte Bilder sind Klasse „intern": nur unter dem Laufzeitverzeichnis, nie im Repo. `ui/runtime/` ist ausgeschlossen. | `docs/security.md` §1; `ui/.gitignore:29-30` |
| RB-03 | Technik | Ablage unter dem Laufzeitverzeichnis des Backends, nicht unter `/tmp`. Grund: auf dem Cloud-Host sieht Claude `/tmp` des UI-Dienstes nicht. | `ui/src/server/utils/runtime-paths.ts:45-51` |
| RB-04 | Technik | Bildarten und Größengrenze sind die des Terminals, an einer Stelle definiert. Grund: Z-02, keine zweite Liste. | `ui/src/shared/types/cloud-terminal.protocol.ts:708-712` |
| RB-05 | Technik | Der Pfad im Text unterliegt der Längengrenze der ersten Eingabe (8000 Zeichen) wie jeder Text. | `ui/src/shared/types/vorhaben.protocol.ts:257`, `vorhaben-service.ts:166` |

## 7. Offene Fragen

<!-- leser: mensch -->

Keine. Zwei Rückfragen mit der Freigabe 0.1.0 entschieden (PO, 2026-09-18):

- **OF-01** *entschieden 2026-09-18 (PO)*: Löschfrist sieben Tage, Aufräumen beim Backend-Start → AK-08.
- **OF-02** *entschieden 2026-09-18 (PO)*: Bilder bleiben nach der Zustellung bis zur Frist liegen, kein Sofort-Löschen → AK-07, AK-08.

---

## 12. Annahmen

<!-- leser: mensch -->

- **AN-01:** Claude Code liest einen absoluten Bildpfad in der ersten Eingabe als Bild, so wie beim Terminal-Einfügen [Q: Pfad im Aufruf dieses Vorhabens, 18.09.2026]. Prüfung: Michael bei der Abnahme mit einem Screenshot auf „Neue Absicht".
- **AN-02:** Das Bild wird von der Sitzung aus gelesen, in der die Absicht entsteht; Sitzung und Backend laufen auf demselben Host (Mac oder Cloud-Host). Prüfung: gilt schon für das Terminal-Einfügen [Q: `cloud-terminal-manager.ts:1395-1399`].
- **AN-03:** Am Handy liefert Safari beim Einfügen aus Fotos ein Bild im Einfüge-Ereignis, wie im Terminal. Prüfung: Michael am iPhone bei der Abnahme; sonst bleibt der Mac-Weg.

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.1 | 2026-09-18 | Kennung `INT-2026-017` → `INT-2026-020`: 017 war seit 17.09. 21:03 an „Projektname im Kopf" vergeben (`feat/INT-2026-017-projektname-im-kopf`, auf `origin`), 018 und 019 auf anderen Branches; Inhalt unverändert. `bezuege.plan` gesetzt (Plan freigegeben, PO im Chat 18.09. 06:05) | Kopf | PO, 18.09. |
| 1.0.0 | 2026-09-18 | Angenommen ohne Änderung am Entwurf; OF-01, OF-02 mit den Vorschlägen entschieden; Bypass ja (Größe S) → direkt `/plan`. Abgleich Mensch/Agent: ohne Befund (Kopf S/niedrig/Bypass deckt Endzustand AK-01–AK-08; jedes Ziel durch AK abgedeckt) | alle | PO, 18.09. |
| 0.1.0 | 2026-09-18 | Entwurf nach Gespräch; Zuschnitt „nur Neue Absicht" entschieden (NZ-01) | alle | — |
