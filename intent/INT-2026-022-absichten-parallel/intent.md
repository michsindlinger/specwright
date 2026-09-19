---
intent_id: "INT-2026-022"  
titel: "UI: Mehrere Absichten parallel — Formular bleibt, Übersicht zeigt sie sofort, jede im eigenen Worktree"  
status: "angenommen"  
version: "1.0.0"  
autor: "Michael Sindlinger (Beobachtung aus dem Gebrauch, 19.09.2026, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-19"  
geaendert: "2026-09-19"  
risikoklasse: "niedrig"  
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
schlagworte: [ui, neue-absicht, uebersicht, worktree, cloud-terminal, vorhaben]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — im Chat: „Freigabe: intent.md 0.1.0", 19.09."  
  am: "2026-09-19"  

---

# Absicht: UI: Mehrere Absichten parallel — Formular bleibt, Übersicht zeigt sie sofort, jede im eigenen Worktree

<!-- Ablage: intent/INT-2026-022-absichten-parallel/intent.md -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Michael beginnt oft mehrere Vorhaben am selben Tag im selben Projekt. Heute sperrt die erste laufende Absicht-Sitzung die Seite „Neue Absicht", die Übersicht zeigt eine begonnene Absicht erst, wenn ihr Ordner da ist, und alle Absichten landen im Hauptcheckout und bleiben dort liegen. Die UI soll parallele Absichten als Normalfall behandeln.
- **Kernaufgaben:** (1) „Neue Absicht" zeigt das Formular immer; laufende Absicht-Sitzungen stehen darunter. (2) Die Übersicht zeigt eine begonnene Absicht sofort nach „Starten" und führt per Klick in ihre Sitzung. (3) Jede aus der UI gestartete Absicht läuft in einer eigenen Arbeitskopie (Worktree). (4) Parallele Absicht-Sitzungen vergeben keine doppelte Kennung.
- **Endzustand:** AK-01 bis AK-12 sind erfüllt; das Verhalten nach Entstehen des Ordners (Wechsel auf die Vorhaben-Seite, Terminal daneben) bleibt wie in INT-2026-008 und INT-2026-011.

## 1. Problem und Anlass

<!-- leser: mensch -->

Am 19.09.2026 öffnete Michael „Neue Absicht" für das Projekt kreis-lippe-audit und sah statt des Textfelds die Karte „Absicht-Sitzung „qwen3.8-flash-next:iq3" läuft — Vorhaben entsteht …" [Q: Screenshot im Chat, 19.09.]. Die Seite rendert das Formular nur, wenn keine Absicht-Sitzung des Projekts anhängig ist [Q: `ui/frontend/src/components/vorhaben/aos-neue-absicht.ts:285`]. Als anhängig zählt die älteste Absicht-Sitzung des Projekts, gleich in welcher Arbeitskopie sie läuft [Q: `ui/frontend/src/views/aos-vorhaben-view.ts:353`] — auch eine von Hand im Terminal gestartete in einem Worktree [Q: `ui/src/server/services/vorhaben-service.ts:1148`]. Genau das war der Fall: Die sperrende Sitzung lief im Worktree `session-qwen3-8-flash-next`.

Das Sperren war Absicht: INT-2026-008 AK-04 verbot einen zweiten Start-Knopf, weil das Backend den ersten neuen `intent/`-Ordner der ältesten anhängigen Sitzung **derselben Arbeitskopie** zuschreibt [Q: `ui/src/server/services/vorhaben-service.ts:1300-1316`, Schlüssel ist das Verzeichnis]. Sitzungen in verschiedenen Arbeitskopien stören sich also nicht; nur zwei Sitzungen im selben Verzeichnis können sich einen Ordner streitig machen.

Zweites Problem: Nach „Starten" erscheint in der Übersicht nichts. Die Übersicht kennt nur Zeilen aus Ordnern [Q: `ui/frontend/src/components/vorhaben/aos-vorhaben-uebersicht.ts:178`]; die anhängigen Sitzungen liefert das Backend zwar mit (`pendingIntents`) [Q: `ui/src/server/services/vorhaben-service.ts:381`], die Übersicht liest sie aber nicht. Bis der Ordner nach dem Interview entsteht, kommt Michael nur über das allgemeine Cloud-Terminal in die Sitzung.

Drittes Problem: Das Formular startet die Sitzung fest im Hauptcheckout (`kind: 'main'`) [Q: `aos-neue-absicht.ts:267`]. Ein Ziel „neuer Worktree" existiert im Terminal-Manager bereits (Pfad `<projekt>-worktrees/session-<id>`, Zweig `session/<id>`, Basis aus der Konfiguration) [Q: `ui/src/server/services/cloud-terminal-manager.ts:798-830`, `ui/src/server/utils/cloud-session-worktree.ts:127-160`]; das Backend gibt es nur nicht an den Absicht-Start weiter [Q: `vorhaben-service.ts:813`]. Folge: mehrere `intent/INT-…/`-Ordner bleiben uncommittet im Hauptpfad liegen [Q: Michael, 19.09.].

Nebenbefund: Der Workflow bestimmt die nächste Kennung nur aus dem lokalen Ordner `intent/` [Q: `specwright/workflows/core/intent.md:39`]. Zwei parallele Sitzungen in getrennten Worktrees kämen so auf dieselbe Nummer (am 18.09. schon passiert: 017 doppelt).

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael (einziger Nutzer) | Kann jederzeit eine weitere Absicht beginnen; sieht begonnene Absichten sofort in der Übersicht; der Hauptcheckout bleibt sauber. |
| Absicht-Sitzungen (Claude) | Laufen in einem eigenen Worktree; müssen die Kennung gegen alle Arbeitskopien und Zweige prüfen. |
| Systeme | Web-UI (Seite „Neue Absicht", Übersicht, Vorhaben-Seite/Terminal-Dock), Backend (Absicht-Start, Zustand), Git-Worktrees der Projekte, Workflow `intent.md`. |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Eine neue Absicht lässt sich jederzeit beginnen, auch während andere Absicht-Sitzungen des Projekts laufen.
- **Z-02:** Eine begonnene Absicht ist sofort in der Übersicht sichtbar und von dort mit einem Klick in ihrer Sitzung erreichbar.
- **Z-03:** Jede aus der UI begonnene Absicht arbeitet in einer eigenen Arbeitskopie; der Hauptcheckout des Projekts bleibt unberührt.
- **Z-04:** Parallel laufende Absicht-Sitzungen vergeben keine doppelten Kennungen.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Die Zuordnungsregel „erster neuer Ordner an die älteste anhängige Sitzung derselben Arbeitskopie" bleibt; sie wird nur sichtbar gemacht (AK-03). *(Entscheidung Michael, 19.09.)*
- **NZ-02:** Von Hand im Terminal gestartete Absicht-Sitzungen werden nicht in einen Worktree gezwungen.
- **NZ-03:** Umbenennen des Sitzungszweigs nach `feat/INT-…`, PR-Anlage, Aufräumen alter Session-Worktrees — nicht hier.
- **NZ-04:** Bereits im Hauptpfad liegende Absichten werden nicht automatisch verschoben.
- **NZ-05:** Keine neue Handy-Gestaltung über Liste und Terminal-Knopf hinaus.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn „Neue Absicht" geöffnet wird, MUSS die UI Textfeld, Modellwahl und „Starten" zeigen, auch solange Absicht-Sitzungen des Projekts anhängig sind. | Z-01 | Test |
| AK-02 | Solange mindestens eine Absicht-Sitzung des Projekts anhängig ist, MUSS die Seite unter dem Formular jede davon mit Sitzungsname, Arbeitskopie und „Im Terminal öffnen" nennen. | Z-01 | Test |
| AK-03 | Wenn zwei anhängige Sitzungen dieselbe Arbeitskopie haben, MUSS die Liste sagen, dass der nächste Ordner der älteren zugeordnet wird. | Z-01 | Test |
| AK-04 | Wenn „Starten" gedrückt wird, MUSS die Seite bleiben, das Feld leeren und die neue Sitzung in der Liste zeigen; am Mac MUSS das angedockte Terminal die gerade gestartete Sitzung zeigen, nicht die älteste. | Z-01 | Test |
| AK-05 | Wenn der Ordner der gestarteten Sitzung entsteht, MUSS die UI auf ihre Vorhaben-Seite wechseln (wie INT-2026-008 AK-03). | Z-01 | Test |
| AK-06 | Wenn „Starten" gedrückt wird, MUSS die Übersicht die Absicht innerhalb von 2 s nach dem Sitzungsstart als Eintrag zeigen — mit Projekt, Sitzungsname, Arbeitskopie und Status, ohne Ordner. | Z-02 | Test |
| AK-07 | Wenn der Eintrag angeklickt wird, MUSS die UI am Mac eine Seite mit dem angedockten Terminal dieser Sitzung zeigen; auf dem Handy MUSS sie die Sitzung im Terminal öffnen. | Z-02 | Test + Playwright |
| AK-08 | Wenn der Ordner entsteht, MUSS der Eintrag zur normalen Vorhaben-Zeile werden; die Absicht DARF NICHT doppelt erscheinen. | Z-02 | Test |
| AK-09 | Wenn eine anhängige Sitzung ohne Ordner endet, MUSS ihr Eintrag aus Übersicht und Liste verschwinden. | Z-02 | Test |
| AK-10 | Wenn „Starten" gedrückt wird, MUSS die Sitzung in einer neuen Arbeitskopie des Projekts laufen; der Hauptcheckout DARF NICHT verändert werden. | Z-03 | Test + Playwright |
| AK-11 | Falls die Arbeitskopie nicht angelegt werden kann (kein Git-Repository, Isolation abgeschaltet), MUSS die UI den Grund zeigen und DARF NICHT stillschweigend im Hauptcheckout starten. | Z-03 | Test |
| AK-12 | Wenn eine Absicht-Sitzung ihre Kennung bestimmt, MUSS sie die Kennungen aller Arbeitskopien und entfernten Zweige des Projekts berücksichtigen. | Z-04 | Review + Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | Welche Absicht anhängig ist und wo sie läuft, weiß allein das Backend; die UI zeigt den Zustand nur. | `docs/architecture.md` AR-05 |
| RB-02 | Betrieb | Ein Session-Worktree wird nach Sitzungsende nur entfernt, wenn kein offenes Vorhaben darin liegt. | INT-2026-019 AK-07, `ui/src/server/websocket.ts:117` |
| RB-03 | Betrieb | Worktree-Isolation lässt sich je Projekt abschalten (`cloudSessionWorktree: false`); dann gilt AK-11. | `ui/src/server/general-config.ts:111` |
| RB-04 | Produkt | INT-2026-010 AK-08 („genau drei Elemente") wird durch AK-01/AK-02 abgelöst; INT-2026-008 AK-04 (kein zweiter Start) entfällt. | dieses Vorhaben |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Was zeigt der Übersichts-Eintrag als Titel, solange kein Ordner existiert? | nein, bis dahin gilt: erste Zeile des Absichtstexts, sonst Sitzungsname | Product Owner | 2026-09-22 |
| OF-02 | Bleibt der Zweigname `session/<id>` bis zur PR, oder benennt `/intent` bei Freigabe nach `feat/INT-…` um? | nein, bis dahin gilt: bleibt (NZ-03) | Product Owner | 2026-09-22 |
| OF-03 | Basis des neuen Worktrees: konfigurierte Basis (Standard `main`, lokaler Stand) oder vorher `git fetch`? | nein, bis dahin gilt: wie heute beim Terminal-Ziel „neuer Worktree" | Product Owner | 2026-09-22 |

---

## 12. Annahmen

<!-- leser: mensch -->

- **AN-01:** Der Scanner liest Worktrees mit; ein `intent/`-Ordner im Session-Worktree ergibt eine normale Zeile mit Arbeitskopie [Q: `ui/src/server/services/vorhaben-service.ts:1513-1522`]. Prüfung: Test in der Spec. [Certain]
- **AN-02:** Das Ziel „neuer Worktree" des Terminal-Managers taugt unverändert für den Absicht-Start; die Zuordnung per Verzeichnis funktioniert dann je Sitzung eindeutig. Prüfung: Playwright-Lauf Start → Ordner → Zeile. [Likely]
- **AN-03:** Endet eine Absicht-Sitzung ohne Ordner, geht beim Abbau ihres Worktrees nichts verloren; mit Ordner bleibt der Worktree (RB-02). Prüfung: Lesen von `removeCloudSessionWorktree` in der Spec — was „sauber" bei uncommitteten Dateien heißt. [Uncertain]
- **AN-04:** AK-12 ist eine Textänderung am Workflow (Kennung gegen `git worktree list` und `git branch -r`), kein UI-Code. Prüfung: Review. [Likely]

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-19 | Freigabe ohne Änderung am Entwurf; OF-01 bis OF-03 bleiben offen, ihre Übergangsregeln gelten bis zur Spec. Abgleich Mensch/Agent: ohne Befund | — | Product Owner, 19.09. |
| 0.1.0 | 2026-09-19 | Entwurf nach Gespräch: Formular immer (Frage 1), Zuordnungsregel bleibt (Frage 2), Seite bleibt nach Start (Frage 3); Ergänzung Michael: Übersicht sofort, Worktree je Absicht | alle | — |
