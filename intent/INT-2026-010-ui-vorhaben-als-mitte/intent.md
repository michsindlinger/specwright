---
intent_id: "INT-2026-010"  
titel: "UI: Vorhaben als Mitte — Rahmen ohne Seitenleiste, Glocke immer sichtbar, Dokumente klappbar"  
status: "angenommen"  
version: "1.0.0"  
autor: "Michael Sindlinger (Skizze und Gespräch mit Claude, 16.09.2026, Skill ux-less-is-more)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-16"  
geaendert: "2026-09-16"  
risikoklasse: "mittel"  
groesse: "L"  
bypass: "nein"  
bypass_grund: ""  
bezuege:  
  product: "docs/product-brief.md"  
  spec: "spec.md"  
  plan: ""  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, rahmen, vorhaben-liste, glocke, dokument-leser, mobile, abbau, less-is-more, phase-5]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — „beide freigeben, Vorschläge zu OF-01 und OF-02 übernehmen", Chat 16.09."  
  am: "2026-09-16"  

---

# Absicht: UI: Vorhaben als Mitte — Rahmen ohne Seitenleiste, Glocke immer sichtbar, Dokumente klappbar

<!-- Ablage: intent/INT-2026-010-ui-vorhaben-als-mitte/intent.md · Skizze: design/skizze-01.jpg -->

## Absicht in drei Sätzen

- **Zweck:** Die Web-UI soll um die Vorhaben kreisen, nicht um Projekte, Sitzungen oder Terminals: Die Startseite sagt auf einen Blick, wo Michael gebraucht wird und was läuft; die Vorhaben-Seite zeigt Gespräch und Dokument nebeneinander; alles andere verschwindet oder rutscht hinter ein Symbol. Weniger, aber besser.
- **Kernaufgaben:** (1) Rahmen: keine Seitenleiste, keine Projekt-Tabs, keine Git-Leiste; Kopfzeile mit Glocke (immer sichtbar), Projekt-Symbol, auf dem Handy dazu Terminal-Symbol; (2) Vorhaben-Liste als Startseite nach Skizze 1; (3) „Neue Absicht" als Seite mit Textfeld, Modellwahl, Starten (Skizze 2); (4) Vorhaben-Seite mit Phasen-Chips, Gespräch links, Dokument rechts, ein Knopf für den nächsten Schritt (Skizze 3), Dokument zeigt den Mensch-Teil, Technik zugeklappt, Codes im Gespräch führen zum Absatz; (5) Projekt-Seite hinter dem Symbol: Docs-Editor, Git, Einstellungen mit Prompt-Vorlagen und Getting Started; (6) Chat und Voice-Call raus, Team ausgeblendet.
- **Endzustand:** AK-01 bis AK-17 erfüllt; je Seite ein Screenshot neben der Skizze in `design/`; `docs/design.md` und `docs/architecture.md` beschreiben den neuen Rahmen.

## 1. Problem und Anlass

Der Rahmen der UI stammt aus v3 und trägt mehr, als der Vorhaben-Flow braucht: eine Seitenleiste mit sieben Routen (`vorhaben`, `getting-started`, `team`, `chat`, `settings`, `prompt-templates`, `call`) [Q: `ui/frontend/src/app.ts:1972-2008`], eine Kopfzeile mit Seitentitel, Update-Hinweis, Versionsnummer, Auslastungs-Badge, Terminal-Knopf und Modellwahl [Q: `ui/frontend/src/app.ts:2056-2095`], darunter Projekt-Tabs und eine Git-Statusleiste auf jeder Seite [Q: `ui/frontend/src/app.ts:2097-2113`]. Die Glocke, die fertige oder blockierte Agenten meldet, lebt im Kopf des Cloud-Terminals und ist nur sichtbar, wenn das Terminal offen ist [Q: `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts:286-361`; Daten aus `ui/frontend/src/app.ts:146`]; Michael übersieht deshalb, wenn ein Agent fertig ist [Q: Michael, Chat 16.09.]. Das Handy hat einen eigenen Rahmen mit fünf Einträgen (Home, Vorhaben, Neu, Terminal, Me) [Q: `ui/frontend/src/components/mobile/aos-mobile-bottom-nav.ts:65-130`]. Was die Skizze verlangt, ist zu großen Teilen da: Liste mit Projekt-Chips und Gruppen „Wartet auf dich / Wartet / Läuft" [Q: `ui/frontend/src/components/vorhaben/aos-vorhaben-uebersicht.ts:3-6`], Zeile mit Phase und Agent-Zustand getrennt [Q: `ui/frontend/src/components/vorhaben/aos-vorhaben-zeile.ts:3-4,180`], Gespräch neben Dokument seit INT-2026-007, Interview ab Sitzungsstart seit INT-2026-008. Der Dokument-Leser rendert jedes Dokument vollständig und kann nichts zuklappen [Q: `ui/frontend/src/components/vorhaben/vorhaben-markdown.ts:87`]; Codes im Gespräch sind Text ohne Verweis. Anlass: Mit INT-2026-007 und 008 ist der Vorhaben-Pfad in der UI vollständig; Michael hat am 16.09. vier Skizzen gezeichnet [Q: `design/skizze-01.jpg`], und die Kennzeichnung der Dokumente kommt mit INT-2026-009. Das ist Phase 5 des SDLC-Umbaus.

## 2. Betroffene

| Wer oder was | Was ändert sich |
|---|---|
| Michael am Mac | Startseite ist die Vorhaben-Liste; Glocke immer da; Terminal per Cmd/Ctrl+D; Projekt-Seite hinter Symbol |
| Michael am Handy | gleicher Rahmen wie am Mac plus Terminal-Symbol; keine Bottom-Nav; Vorhaben-Seite mit Dokument und Terminal-Knopf (kein Gespräch, INT-2026-007 NZ-01) |
| Cloud-Droplet | Merge nach `main` deployt automatisch; laufende Sitzungen überleben den Neustart (tmux) |
| Systeme | `ui/frontend/src/app.ts`, `components/mobile/*`, `views/{chat,voice-call,team,prompt-templates,settings,aos-getting-started}-view.ts`, `components/vorhaben/*`, `components/terminal/aos-cloud-terminal-sidebar.ts`, `components/voice/*`; Docs: `docs/design.md`, `docs/architecture.md` |

## 3. Ziele

- **Z-01:** Die Startseite beantwortet auf einen Blick: Wo werde ich gebraucht, was läuft.
- **Z-02:** Jede Seite hat eine Aufgabe und eine primäre Aktion; der Rahmen enthält nur, was auf jeder Seite gebraucht wird.
- **Z-03:** Fertige oder wartende Agenten fallen sofort auf, egal welche Seite offen ist und ob das Terminal offen ist.
- **Z-04:** Dokumente zeigen zuerst, was ein Mensch entscheiden muss; Technik auf Abruf; Codes im Gespräch führen zum Absatz.
- **Z-05:** Weniger Code: Entferntes ist weg, nicht versteckt; nur Team bleibt ausgeblendet im Code.

## 4. Nicht-Ziele

- **NZ-01:** Keine neuen Backend-Funktionen für den Vorhaben-Flow; das Backend ändert sich nur, wo Glocke oder Liste Daten brauchen, die es noch nicht liefert.
- **NZ-02:** Kein Umbau des Terminals selbst (xterm, Tabs, Sitzungen).
- **NZ-03:** Team-Ansicht bleibt im Code, ohne Route und ohne Link (entschieden 16.09., PO).
- **NZ-04:** Kein Abbau des Kanban-MCP (eigenes Vorhaben laut Product-Brief).
- **NZ-05:** Keine Änderung an Vorlagen oder Workflows (INT-2026-009).
- **NZ-06:** Keine Nachmarkierung alter Dokumente; ohne Kennzeichnung zeigt der Leser alles offen.
- **NZ-07:** Kein Gespräch auf dem Handy (INT-2026-007 NZ-01 bleibt, siehe OF-01).

## 5. Abnahmekriterien

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Nach dem Öffnen der UI MUSS die Vorhaben-Liste als erste Seite erscheinen: Projekt-Chips als Filter, Gruppen „Wartet auf dich" und „Läuft", je Zeile Projekt, Kennung, Titel, Phase und Agent-Zustand, unten der Knopf „Neue Absicht". | Z-01 | Test + Playwright |
| AK-02 | Auf jeder Seite MUSS die Kopfzeile die Glocke mit der Zahl der Sitzungen zeigen, die auf Michael warten oder fertig sind. | Z-03 | Test + Playwright |
| AK-03 | Wenn ein Agent fertig wird oder blockiert, MUSS die Glocke das binnen 2 s ab Ereignis anzeigen, auch bei geschlossenem Terminal. | Z-03 | Messung |
| AK-04 | Wenn eine Zeile der Glocke angeklickt wird, MUSS die UI zum betreffenden Vorhaben wechseln, bei einer Sitzung ohne Vorhaben zur Terminal-Sitzung. | Z-03 | Test |
| AK-05 | Außerhalb der Projekt-Seite DARF die UI nichts als die Kopfzeile (Glocke, Projekt-Symbol, auf dem Handy Terminal-Symbol) und den Seiteninhalt zeigen; keine Seitenleiste, keine Projekt-Tabs, keine Git-Leiste, keine Versions- oder Auslastungsanzeige. | Z-02 | Review + Screenshot |
| AK-06 | Am Mac MUSS Cmd/Ctrl+D das Terminal weiterhin öffnen und schließen. | Z-02 | Test |
| AK-07 | Auf dem Handy MUSS das Terminal-Symbol der Kopfzeile das Terminal öffnen. | Z-02 | Playwright |
| AK-08 | Wenn „Neue Absicht" gedrückt wird, MUSS die UI eine Seite mit genau drei Elementen zeigen: Textfeld, Modellwahl, Knopf „Starten". | Z-02 | Test |
| AK-09 | Wenn „Starten" gedrückt wird, MUSS die UI wie in INT-2026-008 AK-01 und AK-03 das Gespräch der Sitzung zeigen und dem Vorhaben-Ordner folgen; der Text aus dem Textfeld MUSS die erste Eingabe der Sitzung sein. | Z-01 | Test + Playwright |
| AK-10 | Die Vorhaben-Seite MUSS Kennung und Titel, Phasen-Chips (intent, spec, plan, build), links das Gespräch, rechts das Dokument der gewählten Phase und einen Knopf für den nächsten Schritt zeigen. | Z-02 | Playwright + Screenshot |
| AK-11 | Wenn ein Dokument Abschnitte als „Agent" kennzeichnet (INT-2026-009), MUSS der Leser sie zugeklappt zeigen, mit einem Schalter „Technik zeigen" je Dokument. | Z-04 | Test |
| AK-12 | Ein Dokument ohne Kennzeichnung MUSS vollständig offen erscheinen. | Z-04 | Test |
| AK-13 | Wenn im Gespräch ein Code steht, der im Dokument der gewählten Phase vorkommt (AK-, NZ-, OF-, AN-, FA-, F/R/D/O/A mit Nummer), MUSS er als Verweis erscheinen: Klick springt zum Absatz, Hover zeigt ihn; ein zugeklappter Absatz MUSS dabei aufgehen. | Z-04 | Test |
| AK-14 | Das Projekt-Symbol MUSS die Projekt-Seite öffnen: Projektwechsel, Docs-Editor, Git-Status und -Aktionen, Einstellungen einschließlich Prompt-Vorlagen, Getting Started, Modellwahl, Update-Hinweis und Auslastungsanzeige (OF-02). | Z-02 | Playwright |
| AK-15 | Die Routen `chat`, `call` und `team` DÜRFEN NICHT erreichbar sein, auch nicht über eine eingegebene Adresse. | Z-05 | Test |
| AK-16 | Der Code der Ansichten Chat und Voice-Call MUSS entfernt sein; der Team-Code bleibt kompilierbar erhalten. | Z-05 | Review |
| AK-17 | Auf dem Handy MUSS derselbe Rahmen gelten wie am Mac; Liste, Neue Absicht, Vorhaben-Seite (Dokument, Terminal-Knopf statt Gespräch) und Projekt-Seite MÜSSEN bei 400 px Breite bedienbar sein. | Z-02 | Playwright |

## 6. Randbedingungen

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Betrieb | Merge nach `main` löst den Auto-Deploy der UI auf dem Cloud-Droplet aus; Merge ist Michaels Schritt. Laufende Sitzungen müssen den Neustart überleben. | `CLAUDE.md` „Nie", tmux-Persistenz (Memory) |
| RB-02 | Technik | TypeScript strict, kein `any`; Präfix `aos-`; Nutzerzustand im Backend (AR-05); `projectDir()` statt Pfade (AR-04); MCP direkt starten (AR-02). | `CLAUDE.md`, `docs/architecture.md` |
| RB-03 | Design | Grundsätze Klarheit, Zurückhaltung, Tiefe: ein Zweck je Element, eine Akzentfarbe je Seite, sekundäre Aktionen erst bei Hover, keine dekorativen Trenner oder Schatten, `prefers-reduced-motion`. | Skill `ux-less-is-more` (Apple HIG, Rams), `docs/design.md` §1 |
| RB-04 | Sicherheit | Repo öffentlich: keine Hostnamen, Pfade, Nutzer oder Tokens des Cloud-Hosts in Screenshots oder Docs. | `docs/security.md` |
| RB-05 | Betrieb | Bezugsliste `ui/tests/known-failures.txt` nur nach CI-Lauf kürzen; entfernte Ansichten ziehen ihre Tests mit sich, kein Test wird gelöscht, damit etwas grün wird. | `CLAUDE.md` Definition of Done |

## 7. Offene Fragen

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Soll das Gespräch mit diesem Umbau auch auf dem Handy kommen? *entschieden 2026-09-16 (PO)*: nein, Terminal-Knopf statt Gespräch (NZ-07); Handy-Gespräch ist ein eigenes Vorhaben. | nein | Product Owner | erledigt |
| OF-02 | Auslastungs-Badge (⚡ n/max) und Update-Hinweis: ganz weg oder auf die Projekt-Seite? *entschieden 2026-09-16 (PO)*: auf die Projekt-Seite (AK-14). | nein | Product Owner | erledigt |
| OF-03 | Was in `app.ts` hängt an Chat und Voice-Call (Auto-Mode, Voice-Nachrichten, Gateway-Events) und wird mitentfernt? | nein, bis dahin gilt: nur entfernen, was keine andere Seite nutzt; Nachweis im Plan §2 | Agent im Plan Mode | Plan-Freigabe |

---

<!-- ===== Vertragsschicht ===== -->

## 8. Begriffe

- **B-01 Rahmen:** Alles, was auf jeder Seite gleich ist: Kopfzeile mit Glocke, Projekt-Symbol und auf dem Handy Terminal-Symbol. Sonst nichts.
- **B-02 Phase:** Stand des Vorhabens im Flow: intent, spec, plan, build. Unabhängig vom Agent-Zustand.
- **B-03 Agent-Zustand:** arbeitet, wartet (auf Michael), ruht (keine Sitzung). Kommt aus dem Backend-Zustand, wird nicht in der UI abgeleitet.
- **B-04 Mensch-Teil / Agenten-Teil:** Abschnitte eines Vorhaben-Dokuments nach der Kennzeichnung aus INT-2026-009.
- **B-05 Projekt-Seite:** Die eine Seite hinter dem Projekt-Symbol: Projektwechsel, Docs-Editor, Git, Einstellungen.
- **B-06 Glocke:** Liste der Sitzungen, die auf Michael warten oder fertig sind, mit Zähler; Klick führt hin. Heute im Terminal-Kopf, künftig im Rahmen.

## 9. Erfolgskennzahlen

| ID | Kennzahl | Zielwert | Messung vor Produktion | Messung im Betrieb | Reaktion bei Verfehlen |
|---|---|---|---|---|---|
| EK-01 | Klicks vom Öffnen der UI bis zur Antwort auf ein wartendes Vorhaben | höchstens 2 (Glocke oder Zeile, dann Eingabe) | Playwright-Lauf, Zähler im E2E-Protokoll | Stichprobe Michael, erste Woche | Zuschnitt der Liste oder Glocke ändern |
| EK-02 | Bedienelemente im Rahmen außerhalb der Projekt-Seite | höchstens 3 (Glocke, Projekt, Handy: Terminal) | Screenshot-Review je Seite | kein Gate | Element auf die Projekt-Seite verschieben |
| EK-03 | Routen der UI | 4 (`vorhaben`, `neu`, `projekt`, Not-Found) | `grep` in `app.ts`, Test AK-15 | kein Gate | Abbau nachholen |
| EK-04 | Zeit von Agent-Ereignis bis Glocke sichtbar | unter 2 s | Messung im E2E-Lauf (AK-03) | Stichprobe Michael | Ursache im Ereignispfad suchen |

## 10. Auslieferung, Betrieb, Zeitbudget

- **Freigabe Produktion:** Product Owner (Michael) durch Merge des PR nach `main`.
- **Stufen:** auf einmal; ein Nutzer, ein Droplet.
- **Rückzug:** Revert-PR auf `main`; Auto-Deploy spielt den alten Stand ein. Abschalten und Einschalten: Michael.
- **Betrieb:** Michael; Alarme über die Glocke selbst (Stop-Hook) und den Verbindungs-Hinweis der UI.
- **Zeitbudget:** höchstens 3 Bausitzungen ab Plan-Freigabe; danach Stopp und Neuzuschnitt in einer weiteren `intent.md`.

## 11. Entscheidungsrechte

| ID | Stufe | Regel |
|---|---|---|
| ER-00 | allein (vorläufig) | Auslegungsfragen zu AK, RB oder B ohne Widerspruch: engste Auslegung, die den Wortlaut erfüllt; in der Spec unter „Annahmen" dokumentieren; weiterarbeiten. Bestätigung gesammelt bei der Spec-Freigabe. |
| ER-01 | allein | Details ohne Datenverlust und ohne Außenwirkung: interne Struktur, Benennungen, Aufgabenschnitt, synthetische Testdaten, Reihenfolge des Abbaus. |
| ER-02 | fragen | Neue externe Abhängigkeit (Bibliothek, Fremddienst). |
| ER-03 | fragen | Eine Kennzahl wird vor Produktion verfehlt. |
| ER-04 | stopp | Zugriff auf Produktionsdaten oder den Cloud-Host. |
| ER-05 | stopp | Zwei Kriterien widersprechen sich. |
| ER-06 | stopp | Tests, Gates, Bezugsliste oder Schwellen müssten geändert werden, damit etwas grün wird. |
| ER-07 | stopp | Produktionsfreigabe: bereitet der Agent vor (PR); mergen darf nur Michael. |
| ER-08 | stopp | Zeitbudget ausgeschöpft. |
| ER-09 | fragen | Ein Element des heutigen Rahmens hat keinen Platz auf der Projekt-Seite und keinen Beleg, dass es entfallen darf. |

## 12. Annahmen

- **AN-01:** Das Backend liefert schon alles, was die Glocke im Rahmen braucht (Stop-Hook-Ereignisse, blockierte Sitzungen); nur die Darstellung zieht um. Prüfung: Agent im Plan Mode, `app.ts:146` und `agent-notifications.ts`, vor Plan-Freigabe.
- **AN-02:** Chat und Voice-Call haben keine Nutzer außer sich selbst; Voice-Nachrichten im Gespräch (INT-2026-007) hängen nicht an der Voice-Call-Ansicht. Prüfung: Import-Graph im Plan Mode (Technik aus INT-2026-004 Stufe 3), vor Plan-Freigabe.
- **AN-03:** Der Team-Code kompiliert ohne Route und Import weiter, ohne dass Lint oder `noUnusedLocals` anschlagen. Prüfung: `bash scripts/verify.sh --fast` im Plan Mode.
- **AN-04:** Die Kennzeichnung aus INT-2026-009 liegt vor, bevor AK-11 gebaut wird; bis dahin gilt AK-12 für alle Dokumente. Prüfung: INT-2026-009 Status `umgesetzt` vor `/build`.

---

## Änderungsprotokoll

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-16 | Angenommen; OF-01 entschieden (kein Handy-Gespräch, NZ-07), OF-02 entschieden (Badges auf die Projekt-Seite, AK-14); OF-03 bleibt offen für den Plan Mode | OF-01, OF-02, AK-14 | PO, 16.09. |
| 0.1.0 | 2026-09-16 | Entwurf aus Skizze und Gespräch vom 16.09.; fünf Zuschnittsfragen vom PO beantwortet (Reihenfolge, alte Dokumente, Chat/Voice raus, Bottom-Nav weg, Projekt-Tabs und Git-Leiste auf die Projekt-Seite) | alle | — |
