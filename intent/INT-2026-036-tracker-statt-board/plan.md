# Plan: Tracker statt Board für technischen Arbeitsstand

> **Intent:** `intent.md` (INT-2026-036) · **Spec:** entfällt (bypass: nur Texte, unter 1 Tag)
> **Status:** entwurf
> **Erstellt:** 2026-10-25 · **Freigabe:** ausstehend
> **Pflichtinput gelesen:** `CLAUDE.md`, globale Regel „Arbeitsstand: Tracker für Technik, Obsidian-Board für Internes"
> **Format:** 2.1

## In einfachen Worten

<!-- leser: mensch -->

**Worum geht es?** Bisher sagt Specwright, dass man am Ende eines Vorhabens eine Karte auf dem internen Obsidian-Board nachzieht. Seit 25.10.2026 gilt etwas anderes: Technische Arbeit steht im Tracker des Projekts, also in den GitHub Issues oder in Trello, weil das Team und der Kunde dort mitlesen können. Das Board ist nur noch für Dinge, die der Kunde nicht sehen darf.

**Was ändert sich?** Der Block am Ende eines Berichts heißt weiter „Für das Board", nennt aber jetzt zuerst den Eintrag im Tracker. Die Board-Karte steht darin nur noch, wenn es etwas Internes gibt. Projekte mit Fahrplan-Seite behalten eine grobe Karte je Vorhaben. Neue Projekte bekommen in ihrer Projektdatei eine Zeile, die den Tracker nennt.

**Wie wird das gemacht?** Es sind reine Textänderungen an 10 Dateien: zwei Arbeitsanweisungen, zwei Kurzbefehle, vier Vorlagen und die Anleitung der Vorlagen. Es wird nichts programmiert. Alte Karten bleiben liegen und ziehen erst um, wenn jemand sie anfasst.

**Was kann schiefgehen?** Bestehende Projekte behalten ihre alte Projektdatei, bis der Updater die geänderte Vorlage anbietet. Rückgängig: Revert der PR.

**Was musst du entscheiden?** Nichts, Freigabe reicht.

## Details

<!-- leser: mensch -->

### 1. Kurzfassung

<!-- leser: mensch -->

Der Block „Für das Board" bekommt die Felder Projekt · Tracker-Eintrag · Zielstatus · Beleg · Stand-Zeile · Verweis auf `intent/` · (nur bei Internem: Board-Karte und Spalte) · (bei Kreis Lippe: Vorhaben-Karte und Fahrplan-Station). Der Kopf von `intent.md` bekommt `bezuege.tracker`. Die Projektvorlage bekommt `Tracker:` und `Internes:`.

### 2. Ausgangslage im Code

<!-- leser: agent -->

| Bereich | Heute (Datei:Zeile) | Bedeutung |
|---|---|---|
| Abschlussblock `build` | `specwright/workflows/core/build.md:173` | muss geändert werden |
| Bezüge `intent` | `specwright/workflows/core/intent.md:127` | muss geändert werden |
| Karten anlegen | `specwright/workflows/core/plan.md:197-210` (`create-cards`, Step 10b) | legt die Karten der Factory an; hier nur verweisen |

### 4. Änderungen

<!-- leser: agent -->

| Datei | Änderung |
|---|---|
| `specwright/workflows/core/build.md` | Zeile 21 und Block ab 173 |
| `specwright/workflows/core/intent.md` | `bezuege.tracker`, Board optional |
| `specwright/templates/sdlc/vorhaben/intent-template.md` | Feld `tracker`, Feldtabelle |
| `specwright/templates/sdlc/vorhaben/plan-template.md` | DoD-Punkt |
| `specwright/templates/sdlc/projekt/CLAUDE-template.md` | `Tracker:`, `Internes:` |
| `specwright/templates/sdlc/projekt/architecture-template.md`, `product-brief-template.md` | je ein Wort |
| `specwright/templates/sdlc/README.md` | Abschnitt „Wahrheiten" |
| `.claude/commands/specwright/build.md`, `intent.md` | Kurzfassung |

`manifest.tsv` bleibt unverändert (keine Datei kommt hinzu oder fällt weg).

### 8. Tests und Nachweis

<!-- leser: agent -->

- `grep -rn "Für das Board" specwright/ .claude/commands/`: jede Fundstelle zeigt den neuen Inhalt.
- Projekt-`CLAUDE.md` aus der Vorlage im Probeordner: Zeile `Tracker:` vorhanden.
- Updater-Probelauf gegen den Worktree (`file://`).
- `bash scripts/verify.sh --fast`.

### 13. Definition of Done

<!-- leser: agent -->

- [ ] `verify: OK`
- [ ] AK-01 bis AK-03 geprüft
