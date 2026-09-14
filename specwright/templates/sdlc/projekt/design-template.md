# Design: [Produkt]

> **Stand:** JJJJ-MM-TT · **Verantwortlich:** [Rolle]
> **Rolle dieses Dokuments:** Pflichtlektüre für jede Spec mit UI-Anteil (Bedenken) und für jeden Plan, der Oberfläche ändert. Legt fest, was „entspricht dem Mock" bedeutet.
> **Marke:** Farben, Schrift, Tonalität kommen aus dem Firmen-Repo (`brand.md`). Hier steht nur, wie das Produkt sie anwendet.

## 1. Prinzipien

<!-- 3 bis 5. Kurz. Was bei Zielkonflikten gewinnt. -->

1. [z. B. Weniger ist mehr: eine Aktion pro Bildschirm zuerst.]
2. […]

## 2. Tokens

| Token | Wert | Quelle |
|---|---|---|
| Primärfarbe | [#…] | brand.md |
| Schrift | […] | brand.md |
| Abstände | [4/8/16/24/32] | hier |
| Radius, Schatten | […] | hier |

Wo definiert im Code: `[tailwind.config / tokens.css]`

## 3. Komponentenbibliothek

| Komponente | Woher | Datei | Regel |
|---|---|---|---|
| Button, Input, Dialog | [Radix / eigene] | `components/ui/` | nie neu bauen, was hier existiert |

## 4. Muster

<!-- Für wiederkehrende Situationen genau eine Lösung. -->

| Situation | Muster | Beispiel im Code |
|---|---|---|
| Liste mit vielen Einträgen | [Sortierung, Paginierung, Suche] | `[Datei]` |
| Formular mit Fehlern | [Inline-Fehler unter dem Feld, Zusammenfassung oben] | `[Datei]` |
| Leerzustand | [Text + eine Aktion] | `[Datei]` |
| Laden | [Skeleton statt Spinner] | `[Datei]` |
| Erfolg / Fehler nach Aktion | [Toast / Inline] | `[Datei]` |

## 5. Responsiv und Barrierefreiheit

- **Breakpoints:** […]
- **Mobil zuerst für:** [Seiten]
- **Mindeststandard:** Tastatur-Bedienbarkeit, Kontrast ≥ 4.5:1, Fokus sichtbar, Labels an jedem Feld.

## 6. Mocks je Vorhaben

- **Ablage:** `intent/INT-JJJJ-NNN-…/design/` — Bild (`.png`) oder Link mit Screenshot, committet.
- **Wann Pflicht:** neue Seite, neuer Ablauf, geänderte Navigation. Nicht nötig bei: Texten, Farben aus Tokens, Reihenfolge in bestehender Liste.
- **„Entspricht dem Mock" heißt:** Layout, Reihenfolge, Zustände (leer, laden, Fehler) wie im Mock; Abweichungen im Plan Abschnitt 14 begründet.
- **Prüfung:** Screenshot per [Playwright/Browser-Werkzeug] neben dem Mock im PR.

## 7. Bekannte Abweichungen

| Stelle | Abweichung vom Muster | Karte / Intent |
|---|---|---|
| […] | […] | […] |

## Änderungsprotokoll

| Datum | Änderung | PR |
|---|---|---|
| JJJJ-MM-TT | Erstfassung | — |
