# Design: Specwright

> **Stand:** 2026-09-15 · **Verantwortlich:** Michael Sindlinger
> **Rolle dieses Dokuments:** Pflichtlektüre für jede Spec mit UI-Anteil (Bedenken) und für jeden Plan, der die Web-UI ändert. Legt fest, was „entspricht dem Mock" bedeutet.
> **Marke:** Farben, Schrift, Tonalität kommen aus dem Firmen-Repo (`brand.md`, Phase 3). Hier steht nur, wie das Produkt sie anwendet.

Specwright hat zwei Oberflächen: das Terminal (Befehle, Installer-Ausgaben) und die Web-UI. Für beide gilt: weniger ist mehr.

## 1. Prinzipien

1. **Weniger ist mehr** (Apple HIG, Skill `ux-less-is-more`): eine Aktion pro Bildschirm zuerst; kein Element ohne Aufgabe.
2. **Terminal-Ausgaben sind Protokoll:** jede Zeile nennt Datei und Ergebnis (`+` neu, `~` ersetzt, `-` gelöscht, `!` behalten, `✗` fehlgeschlagen); am Ende Zähler. Keine Farben als Informationsträger allein.
3. **Gleiche Sicht auf jedem Gerät:** Workspace-Zustand im Backend (AR-05); Handy und Mac zeigen dasselbe.
4. **Bestehende Komponenten zuerst:** nie neu bauen, was unter `ui/frontend/src/` als `aos-*` existiert.

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
| Alle UI-Bausteine (`aos-kanban-board`, `aos-chat-view`, `aos-terminal`, …) | eigene Lit Web Components | `ui/frontend/src/` | Präfix `aos-`, TypeScript strict, keine `any` |
| Terminal | xterm.js in `aos-terminal` | `ui/frontend/src/` | Buffer-Replay über `stripTerminalQueries` (zweimal regressiert — nicht anfassen ohne Test) |

## 4. Muster

| Situation | Muster | Beispiel im Code |
|---|---|---|
| Liste mit vielen Einträgen (Projekte, Sessions) | Sortierung, Suche, Recents zuerst | Workspace-Sidebar |
| Langlaufender Vorgang (Auto-Mode, Installer) | Fortschritt je Schritt, nie nur Spinner; Abschluss mit Zählern | `install.sh` `step`/`substep`, Auto-Mode-Log |
| Fehler nach Aktion | Inline mit Ursache und nächstem Schritt („nicht gelöscht: lokal geändert — behalten per keep.txt oder von Hand löschen") | `install-lib.sh` |
| Leerzustand | ein Satz + eine Aktion | Projektliste ohne Projekte |
| Mobil | ein Pane, Terminal mit Flex-Host für xterm-Höhe | Mobile-Terminal-Fix (`4cdb276`) |

## 5. Responsiv und Barrierefreiheit

- **Breakpoints:** Handy (< 768 px, ein Pane) / Desktop (Split-Panes).
- **Mobil zuerst für:** Cloud-Terminal, Projektwechsel.
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
| 2026-09-15 | §7: Abweichung „Story-Kanban-Sicht" erledigt — die Web-UI zeigt Vorhaben (INT-2026-004, Stufe 1–3) | PR 3 |
