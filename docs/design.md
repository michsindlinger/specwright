# Design: Specwright

> **Stand:** 2026-09-17 · **Verantwortlich:** Michael Sindlinger
> **Rolle dieses Dokuments:** Pflichtlektüre für jede Spec mit UI-Anteil (Bedenken) und für jeden Plan, der die Web-UI ändert. Legt fest, was „entspricht dem Mock" bedeutet.
> **Marke:** Farben, Schrift, Tonalität kommen aus dem Firmen-Repo (`brand.md`, Phase 3). Hier steht nur, wie das Produkt sie anwendet.

Specwright hat zwei Oberflächen: das Terminal (Befehle, Installer-Ausgaben) und die Web-UI. Für beide gilt: weniger ist mehr.

## 1. Prinzipien

1. **Weniger ist mehr** (Apple HIG, Skill `ux-less-is-more`): eine Aktion pro Bildschirm zuerst; kein Element ohne Aufgabe.
2. **Terminal-Ausgaben sind Protokoll:** jede Zeile nennt Datei und Ergebnis (`+` neu, `~` ersetzt, `-` gelöscht, `!` behalten, `✗` fehlgeschlagen); am Ende Zähler. Keine Farben als Informationsträger allein.
3. **Gleiche Sicht auf jedem Gerät:** Workspace-Zustand im Backend (AR-05); Handy und Mac zeigen dasselbe.
4. **Bestehende Komponenten zuerst:** nie neu bauen, was unter `ui/frontend/src/` als `aos-*` existiert.
5. **Der Rahmen ist eine Kopfzeile** (INT-2026-010): Seitentitel, Verbindungs-Hinweis, Glocke, Projekt-Symbol, am Handy das Terminal-Symbol — sonst nichts. Alles andere lebt auf den drei Seiten (Vorhaben-Liste, Neue Absicht, Projekt); kein Handy-Rahmen mit eigenen Knöpfen.

## 2. Tokens

| Token | Wert | Quelle |
|---|---|---|
| Primärfarbe, Schrift | aus `brand.md` (Firmen-Repo, Phase 3); bis dahin die in `ui/frontend/src/` definierten CSS-Variablen | brand.md / Code |
| Abstände | 4/8/16/24/32 px | hier |
| Radius, Schatten | wie in den bestehenden `aos-*`-Komponenten | Code |

Wo definiert im Code: `ui/frontend/src/` (Lit `css` und globale Variablen in `index.html`).

## 3. Komponentenbibliothek

| Komponente | Woher | Datei | Regel |
|---|---|---|---|
| Alle UI-Bausteine (`aos-vorhaben-view`, `aos-kopfzeile`, `aos-terminal`, …) | eigene Lit Web Components | `ui/frontend/src/` | Präfix `aos-`, TypeScript strict, keine `any`; Light DOM, wenn `theme.css` die Kinder stylen muss (Projekt-Seite mit Einstellungen, Git-Leiste) |
| Terminal | xterm.js in `aos-terminal` | `ui/frontend/src/` | Buffer-Replay über `stripTerminalQueries` (zweimal regressiert — nicht anfassen ohne Test) |

## 4. Muster

| Situation | Muster | Beispiel im Code |
|---|---|---|
| Liste mit vielen Einträgen (Projekte, Sessions) | Sortierung, Suche, Recents zuerst | Projekt-Seite (offene Projekte, zuletzt geöffnet) |
| Meldung, die nicht verloren gehen darf (Agent fertig, Agent wartet) | ein Zähler an einem Symbol, das auf jeder Seite da ist; Tipp führt zum Ort der Antwort. Die Einträge kommen aus dem Backend-Stand der Sitzungen (INT-2026-016): jede Claude-Sitzung, die einen Dialog zeigt oder fertig gemeldet und noch nicht beantwortet ist (Marke, überlebt Neuladen, Gerätewechsel und einen Neustart bis 24 h); Sitzungen eines Vorhabens heißen nach Kennung und Titel und zeigen den Zustand der Zeile. Ein Eintrag bleibt, bis in der Sitzung geantwortet oder der Tab geschlossen wird — nicht bis man hingeschaut hat; der grüne Punkt am Tab verblasst dagegen nach 10 Minuten (Dekoration, keine Meldung). Die gerade sichtbare Sitzung wird nicht gelistet | `aos-glocke` in der Kopfzeile, `buildBellRows` |
| Langlaufender Vorgang (Auto-Mode, Installer) | Fortschritt je Schritt, nie nur Spinner; Abschluss mit Zählern | `install.sh` `step`/`substep`, Auto-Mode-Log |
| Fehler nach Aktion | Inline mit Ursache und nächstem Schritt („nicht gelöscht: lokal geändert — behalten per keep.txt oder von Hand löschen") | `install-lib.sh` |
| Leerzustand | ein Satz + eine Aktion | Projektliste ohne Projekte |
| Mobil | ein Pane, Terminal mit Flex-Host für xterm-Höhe | Mobile-Terminal-Fix (`4cdb276`) |
| Dokument mit Leser-Teil und Agenten-Teil (INT-2026-009) | Mensch-Abschnitte offen, Agenten-Abschnitte als zugeklappte Kästen mit sichtbarer Überschrift; ein Schalter „Technik zeigen" je Dokument öffnet alle; Dokumente ohne oder mit nur teilweiser Kennzeichnung bleiben ganz offen | `aos-dokument-leser` (`details.technik`, INT-2026-010 Stufe 3) |
| Sitzung neben dem Dokument (INT-2026-011) | das Terminal selbst, angedockt als rechte Spalte (halbe Breite, unter der Kopfzeile, kein Zieh-Griff, kein Schatten), Tab der Vorhaben-Sitzung vorne; kein nachgebauter Verlauf. Stapelordnung: angedockt liegt die Spalte unter der Kopfzeile (Glocken-Liste davor), schwebend und im Vollbild über ihr (INT-2026-014). Kennungen des Dokuments (`FA-03`, `AK-01`, `F1`) sind im Terminal unterstrichen: Hover zeigt den Absatz, Klick springt im Dokument hin und klappt den Kasten auf; nur Codes, die das Dokument enthält | `aos-cloud-terminal-sidebar` (`docked`), `kennung-link-provider.ts`, `aos-dokument-leser.openKennung` |
| Seite, die zu einem Projekt gehört (Vorhaben-Seite, „Neue Absicht", Projekt-Seite) | das Projekt steht auf der Seite, nicht im Rahmen: als graue kleine Zeile im Kopf (Vorhaben-Seite über der Kennung, „Neue Absicht" unter der Überschrift) oder als Überschrift (Projekt-Seite); Text, kein Link (INT-2026-017, NZ-01/NZ-02) | `aos-vorhaben-seite` `.projekt`, `aos-vorhaben-view` `.neue-absicht .sub`, `aos-projekt-seite h1` |

## 5. Responsiv und Barrierefreiheit

- **Breakpoints:** Handy (< 768 px, ein Pane) / Desktop (Split-Panes). Vorhaben-Seite: Terminal angedockt ab 1024 px, darunter schwebend wie auf jeder anderen Seite (INT-2026-011).
- **Volle Breite:** Liste, Vorhaben-Seite und Dokument nutzen die volle Fensterbreite — angedockt ist das Dokument die linke Hälfte, zugeklappt das ganze Fenster; keine Breitengrenze für einzelne Seiten der View, auch nicht für „Neue Absicht" und die Projekt-Seite (PO 17.09., INT-2026-013). Angedockt zeigt das Terminal immer genau ein Fenster mit der Sitzung der Seite; die gespeicherte Aufteilung (zwei oder vier Fenster) gilt nur schwebend und bleibt erhalten. Beim Verlassen einer angedockten Seite auf eine Seite ohne Spalte schließt das Terminal (Sitzung läuft weiter, Cmd+D öffnet schwebend); Cmd+← führt von der Vorhaben-Seite und von „Neue Absicht" zur Übersicht, außer der Cursor steht in einem Textfeld (INT-2026-015). Angedockt zeigt die Spalte die Tabs des **Seiten-Projekts** (aus der Adresse; nennt sie kein offenes Projekt, das aktive): ohne Sitzung öffnet Cmd+D dessen zuletzt benutzten Tab oder den Leerzustand, „Neue Session" entsteht in diesem Projekt; das aktive Projekt der UI wechselt erst mit einer bekannten Sitzung, nie für die Seite allein. Ein dort gestarteter Claude-Tab und ein per Klick gewählter freier Claude-Tab gehören dem Vorhaben der Seite (Bestätigung oder Grund als Hinweis; Tabs anderer laufender Vorhaben werden per Klick nie verschoben — das tut nur ein getippter Befehl); die Fußzeile der Seite nennt diesen Weg, solange keine Sitzung bekannt ist (INT-2026-016). Öffnet die Seite ein Vorhaben, dessen Sitzung ohne Zutun verschwand (Absturz, Neustart), nimmt das Backend sie wieder auf: Toast „Sitzung nach Neustart fortgesetzt", auf dem Mac dockt das Terminal wie sonst an, am Handy bleibt es beim Hinweis und der Schaltfläche „Im Terminal öffnen" (kein automatisches Vollbild); die Meta-Zeile im Kasten sagt „fortgesetzt nach Neustart, Stand HH:MM" (Stand = letzter Eintrag im alten Gespräch), kein Protokolleintrag. Geht es nicht (Arbeitskopie fehlt, Deckel erreicht, Verlauf nicht auffindbar), steht der Grund als erste Hinweis-Zeile „Wiederaufnahme nicht möglich: …" über dem Zustands-Hinweis und verschwindet, sobald die Zeile wieder eine lebende Sitzung hat; „Nächster Schritt" bleibt bedienbar (INT-2026-019). Der Kasten „Nächster Schritt" sagt vor dem Klick, was passiert, und nennt bei Sperre den Grund statt eines Einheitssatzes (INT-2026-018): Wartet die Sitzung der Zeile ruhig und gehört sie einer früheren Phase, sind Modell und Arbeitskopie mit ihren Werten vorbelegt und der Satz lautet „startet in der laufenden Sitzung ‚…': /clear, dann /specwright:…"; wählt Michael ein anderes Modell oder eine andere Arbeitskopie, lautet er „startet eine neue Sitzung mit … — die laufende ‚…' wird geschlossen". Ohne lebende Sitzung bleibt der heutige Satz. Nach dem Klick meldet ein Toast „Nächster Schritt in der laufenden Sitzung gestartet" bzw. „Sitzung gestartet — die vorige wurde geschlossen".
- **Mobil zuerst für:** Cloud-Terminal, Projektwechsel. Am Handy öffnet das Terminal-Symbol der Kopfzeile die Sitzungen; ein Sprung aus Glocke oder Vorhaben-Seite setzt die aktive Sitzung (kein Solo-Modus).
- **Mindeststandard:** Tastatur-Bedienbarkeit, Kontrast ≥ 4.5:1, Fokus sichtbar, Labels an jedem Feld.

## 6. Mocks je Vorhaben

- **Ablage:** `intent/INT-JJJJ-NNN-…/design/` — Bild (`.png`) oder Link mit Screenshot, committet.
- **Wann Pflicht:** neue Seite, neuer Ablauf, geänderte Navigation der Web-UI. Nicht nötig bei: Terminal-Ausgaben (Beispieltext im Plan genügt), Texten, Farben aus Tokens, Reihenfolge in bestehender Liste.
- **„Entspricht dem Mock" heißt:** Layout, Reihenfolge, Zustände (leer, laden, Fehler) wie im Mock; Abweichungen im Plan Abschnitt 14 begründet.
- **Prüfung:** Screenshot per Playwright (Branch-Backend auf eigenem Port, Scratch-Projekt) neben dem Mock im PR.

## 7. Bekannte Abweichungen

| Stelle | Abweichung vom Muster | Karte / Intent |
|---|---|---|
| Installer-Ausgaben der Alt-Skripte | uneinheitlich bis 3.33.0; ab 4.0.0 über `install-lib.sh` vereinheitlicht | INT-2026-002 |

## Änderungsprotokoll

| Datum | Änderung | PR |
|---|---|---|
| 2026-09-14 | Erstfassung (INT-2026-002) | folgt |
| 2026-09-15 | §7: Abweichung „Story-Kanban-Sicht" erledigt — die Web-UI zeigt Vorhaben (INT-2026-004, Stufe 1–3) | PR #46 |
| 2026-09-16 | §1 Prinzip 5 (Rahmen = Kopfzeile), §3 Beispiele und Light-DOM-Regel, §4 Muster Glocke und Projekt-Seite, §5 Dokument über Gespräch unter 1024 px, Handy-Terminal (INT-2026-010, Stufe 1) | PR #57 |
| 2026-09-17 | §4 Muster „Dokument mit Leser-Teil und Agenten-Teil" (INT-2026-010 Stufe 3) | PR #63 |
| 2026-09-17 | §4 Muster „Sitzung neben dem Dokument" (angedocktes Terminal, Kennungen als Verweise), §5 Vorhaben-Seite ab 1024 px angedockt statt „Dokument über dem Gespräch" (INT-2026-011, Stufe 1 PR #65, Stufe 2) | PR #66 |
| 2026-09-17 | §5 volle Breite für Liste, Vorhaben-Seite und Dokument; angedockt immer ein Fenster, gespeicherte Aufteilung nur schwebend (INT-2026-013, Nachbesserung nach PR #66) | PR #68 |
| 2026-09-17 | §4 Stapelordnung angedockt: Spalte unter der Kopfzeile, Glocken-Liste davor (INT-2026-014) | PR #69 |
| 2026-09-17 | §5 Terminal schließt beim Verlassen einer angedockten Seite; Cmd+← zur Übersicht (INT-2026-015) | PR #71 |
| 2026-09-17 | §4 Glocke aus dem Backend-Stand: Dialog oder Marke „fertig, unbeantwortet", Vorhaben-Titel und -Zustand, bleibt bis zur Antwort; Übersicht gruppiert nach Sitzungszustand vor Phase (INT-2026-016, PR 1) | PR #73 |
| 2026-09-17 | §5 angedockte Spalte zeigt das Seiten-Projekt; neuer oder angeklickter Claude-Tab gehört dem Vorhaben; Fußzeilen-Hinweis (INT-2026-016, PR 2) | PR #74 |
| 2026-09-17 | §4 Muster „Seite, die zu einem Projekt gehört": Projektname als graue Zeile im Kopf der Vorhaben-Seite, Rahmen bleibt neutral (INT-2026-017) | PR #76 |
| 2026-09-18 | §5 Vorhaben-Seite: Wiederaufnahme beim Öffnen (Toast, Andocken am Mac, Hinweis am Handy), Meta-Zeile „fortgesetzt nach Neustart, Stand HH:MM", Grund-Zeile „Wiederaufnahme nicht möglich: …" (INT-2026-019) | PR #77 |
| 2026-09-18 | §5 Kasten „Nächster Schritt": Ankündigung vor dem Klick („in der laufenden Sitzung: /clear, dann Befehl" bzw. „neue Sitzung — die laufende wird geschlossen"), Vorbelegung aus der laufenden Sitzung, genauer Sperrgrund statt Einheitssatz, zwei Toasts (INT-2026-018) | PR #82 |
