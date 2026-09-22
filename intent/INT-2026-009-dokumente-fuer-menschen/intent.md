---
intent_id: "INT-2026-009"  
titel: "Dokumente für Menschen: Leser-Teil und Agenten-Teil in Vorhaben-Dokumenten, Rückfragen mit Kontext"  
status: "umgesetzt"  
version: "1.0.1"  
autor: "Michael Sindlinger (Gespräch mit Claude, 16.09.2026, Skill ux-less-is-more)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-16"  
geaendert: "2026-09-22"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Größe S: drei Vorlagen, vier Workflows, ein Prüfskript; kein UI-Code, keine Datenhaltung"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [vorlagen, workflows, intent, spec, plan, lesbarkeit, rueckfragen, reference-points]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — „beide freigeben", Chat 16.09."  
  am: "2026-09-16"  

---

# Absicht: Dokumente für Menschen — Leser-Teil und Agenten-Teil, Rückfragen mit Kontext

<!-- Ablage: intent/INT-2026-009-dokumente-fuer-menschen/intent.md -->

## Absicht in drei Sätzen

- **Zweck:** Michael liest `intent.md`, `spec.md` und `plan.md`, um zu entscheiden. Heute stehen Dateipfade, Zeilennummern, Verbindungen und Testpläne zwischen dem, was er entscheiden muss, und Rückfragen nennen nur einen Code. Die Dokumente sollen zuerst das zeigen, was ein Mensch braucht, ohne dass der Agent etwas verliert.
- **Kernaufgaben:** (1) Jeder Abschnitt der drei Vorlagen trägt eine unsichtbare Kennzeichnung, für wen er ist: Mensch oder Agent; (2) jede Rückfrage, jeder Vorschlag und jede Review-Entscheidung des Agenten nennt neben dem Code den Gegenstand in einem Satz; (3) beim Vorlegen zeigt der Agent nur den Mensch-Teil im Chat; (4) vor jeder Freigabe prüft der Workflow, dass der Mensch-Teil den aktuellen Stand wiedergibt.
- **Endzustand:** AK-01 bis AK-06 erfüllt; die Web-UI kann die Kennzeichnung später zum Zuklappen nutzen (INT-2026-010); alte Dokumente bleiben gültig.

## 1. Problem und Anlass

Michael muss bei offenen Fragen und Annahmen „immer wieder hin- und herscrollen und gucken, um was es geht", weil Rückfragen und Vorschläge nur den Code nennen (`OF-03`, `AN-S02`) und ein Dokument viele Codes hat [Q: Michael, Chat 16.09.]. Die Workflows verlangen das Gegenteil nicht: `/intent` sagt nur „die Person antwortet per ID" [Q: `specwright/workflows/core/intent.md:96`], `/spec` legt „die Annahmen zum Bestätigen" vor [Q: `specwright/workflows/core/spec.md:90`], `/plan` entscheidet Findings in §12 [Q: `specwright/workflows/core/plan.md:101`]; keine Stelle fordert, dass die Frage ihren Gegenstand trägt. Zweiter Befund: Die Dokumente mischen Leser. `plan.md` führt Ausgangslage im Code, Änderungen je Datei, Verbindungen, Zerlegung und Testplan [Q: `specwright/templates/sdlc/vorhaben/plan-template.md:16-100`]; das braucht der Agent beim Bauen, der Mensch nicht. Nur `plan.md` hat oben „In einfachen Worten" [Q: `specwright/workflows/core/plan.md:120`]. Die intent-Vorlage trennt Kern und Vertragsschicht, aber nur als Anweisung im Kommentar, nicht als Kennzeichnung, die ein Programm lesen kann [Q: `specwright/templates/sdlc/vorhaben/intent-template.md:41-45`]. Der Dokument-Leser der Web-UI rendert deshalb alles gleich und kann nichts zuklappen [Q: `ui/frontend/src/components/vorhaben/vorhaben-markdown.ts:87`]. Anlass: Michael will die Web-UI auf das Wesentliche reduzieren (INT-2026-010); das Zuklappen braucht die Kennzeichnung, und die Rückfrage-Regel wirkt sofort, auch im Terminal.

## 2. Betroffene

| Wer oder was | Was ändert sich |
|---|---|
| Michael als Leser (heute Terminal und MacDown, künftig Web-UI) | Rückfragen sind ohne Blick ins Dokument beantwortbar; Dokumente sehen in MacDown und Terminal unverändert aus |
| Agent in `/intent`, `/spec`, `/plan`, `/build` | schreibt nach der neuen Vorlage, fragt mit Kontext, legt nur den Mensch-Teil im Chat vor |
| Externe Plan-Reviewer | sehen dasselbe Dokument, prüfen zusätzlich Mensch-Teil gegen Agenten-Teil |
| Installierte Projekte (Applai, Kreis Lippe, Compass, …) | bekommen die Vorlagen per Update; alte Dokumente bleiben gültig |
| Systeme | `specwright/templates/sdlc/vorhaben/{intent,spec,plan}-template.md`, `specwright/templates/sdlc/README.md`, `specwright/workflows/core/{intent,spec,plan,build}.md`, ein Prüfskript unter `scripts/`, `specwright/manifest.tsv` bei neuer Datei |

## 3. Ziele

- **Z-01:** Michael erkennt in jedem Vorhaben-Dokument ohne Suchen, welche Teile er lesen muss, um zu entscheiden.
- **Z-02:** Jede Rückfrage des Agenten ist beantwortbar, ohne das Dokument zu öffnen.
- **Z-03:** Der Agent verliert nichts: ein Dokument bleibt eine Datei mit vollem technischen Inhalt.

## 4. Nicht-Ziele

- **NZ-01:** Keine Änderung an der Web-UI; das Zuklappen ist INT-2026-010.
- **NZ-02:** Keine Nachmarkierung der bestehenden Vorhaben INT-2026-002 bis 008 (entschieden 16.09., PO).
- **NZ-03:** Keine Kürzung technischer Inhalte und keine zweite Datei je Dokument; eine Wahrheit je Vorhaben.
- **NZ-04:** Keine neuen Code-Schemata; AK, NZ, OF, AN, FA, F/R/D/O/A bleiben, wie sie sind.
- **NZ-05:** Keine Änderung an Alt-Befehlen (`/create-spec`, `/add-bug`, …) und Projekt-Docs-Vorlagen.

## 5. Abnahmekriterien

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Jede der drei Vorhaben-Vorlagen MUSS jeden Abschnitt als Leser „Mensch" oder „Agent" kennzeichnen, so dass ein Programm die Kennzeichnung findet. | Z-01 | Test |
| AK-02 | Die Kennzeichnung DARF NICHT im gerenderten Dokument (MacDown, GitHub, Terminal-`cat`) als Text erscheinen. | Z-01 | Test |
| AK-03 | Alles, was eine Entscheidung der Person verlangt (Kurzfassung, Ziele, offene Fragen, Annahmen, Risiken, Review-Entscheidungen, manuelle Schritte, Abweichungen), MUSS als „Mensch" gekennzeichnet sein. | Z-01 | Review |
| AK-04 | Wenn der Agent eine Rückfrage stellt, einen Vorschlag zur Bestätigung vorlegt oder ein Review-Finding entscheidet, MUSS die Zeile den Code und den Gegenstand in einem Satz nennen (Beispiel: „OF-03, Sprache je Projekt sperrbar: Vorschlag Ja, Standard aus. Ok?"). | Z-02 | Review |
| AK-05 | Wenn ein Workflow ein Dokument im Chat vorlegt, MUSS der Chat-Text den Mensch-Teil wiedergeben und für den Agenten-Teil auf die Datei verweisen. | Z-01 | Review |
| AK-06 | Vor jeder Freigabe MUSS der Workflow den Mensch-Teil gegen den Agenten-Teil prüfen und Abweichungen als Rückfrage nennen. | Z-03 | Review |
| AK-07 | Ein Dokument ohne Kennzeichnung MUSS in allen Workflows weiterhin gültig sein. | Z-03 | Test |

## 6. Randbedingungen

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Betrieb | Vorlagen und Workflows sind Lieferumfang; jede neue Datei braucht eine Manifest-Zeile, geänderte Dateien keinen Versionssprung, solange alte Dokumente gültig bleiben (AK-07). | `CLAUDE.md` Konventionen, `docs/architecture.md` AR-01 |
| RB-02 | Betrieb | Die globale Plan-Regel (zwei Teile „In einfachen Worten" und „Details", Reference Points) bleibt maßgeblich; die Vorlagen dürfen ihr nicht widersprechen. | `~/.claude/CLAUDE.md` |
| RB-03 | Technik | Docs Deutsch, MacDown-tauglich: Leerzeile vor Listen, Frontmatter-Zeilen mit zwei Leerzeichen. Grund: Michael liest in MacDown und im Terminal. | `CLAUDE.md` Konventionen |

## 7. Offene Fragen

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Sollen die Projekt-Docs-Vorlagen (`architecture`, `design`, `security`, `product-brief`) dieselbe Kennzeichnung bekommen? | nein, bis dahin nur Vorhaben-Dokumente (NZ-05) | Product Owner | 2026-09-30 |

---

## Änderungsprotokoll

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-16 | Angenommen; OF-01 bleibt offen mit Übergangsregel | alle | PO, 16.09. |
| 0.1.0 | 2026-09-16 | Entwurf aus dem Gespräch vom 16.09. | alle | — |
| 1.0.1 | 2026-09-22 | Umgesetzt: abgeschlossen aus der UI durch Michael Sindlinger; Belege in `plan.md` §13 | — | Product Owner (Klick in der UI) |
