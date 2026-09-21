---
intent_id: "INT-2026-024"  
titel: "UI: Vorhaben per Knopf abschließen — deterministisch, ohne Sitzung"  
status: "angenommen"  
version: "1.0.0"  
autor: "Michael Sindlinger (Beobachtung aus dem Gebrauch, 21.09.2026, Gespräch mit Claude)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-21"  
geaendert: "2026-09-21"  
risikoklasse: "niedrig"  
groesse: "M"  
bypass: "nein"  
bypass_grund: ""  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: ""  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, vorhaben, abschluss, umgesetzt, uebersicht, git, pull-request]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — im Chat: „Freigabe: intent.md 0.1.0", 21.09."  
  am: "2026-09-21"  

---

# Absicht: UI: Vorhaben per Knopf abschließen — deterministisch, ohne Sitzung

<!-- Ablage: intent/INT-2026-024-vorhaben-abschliessen/intent.md -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Ein fertiges Vorhaben soll Michael in der UI mit einem Klick abschließen können — ohne eine Claude-Sitzung, die die Statuszeile von Hand ändert und dabei regelmäßig ein Wort erfindet, das die Übersicht nicht kennt. Heute stehen 18 Vorhaben unter „Läuft", die meisten längst gemergt.
- **Kernaufgaben:** (1) Ein Knopf „Abschließen" auf der Vorhaben-Seite, der nach Bestätigung die Absichtsdatei auf `umgesetzt` setzt und den Abschluss wie bisher als Commit mit Pull Request ins Repo bringt. (2) Immer dasselbe Statuswort, dieselben Kopffelder, dieselbe Protokollzeile — ohne Sprachmodell. (3) Die Zeile steht danach unter „Umgesetzt", auch wenn Arbeitskopien ältere Fassungen tragen oder die zugeordnete Sitzung noch offen ist.
- **Endzustand:** AK-01 bis AK-11 sind erfüllt; das Anlegen der Board-Karte, das Aufräumen von Arbeitskopien und das Mergen des Abschluss-PR bleiben Michaels Schritte (NZ-03, NZ-06, NZ-07).

## 1. Problem und Anlass

<!-- leser: mensch -->

Am 21.09.2026 zeigte die Übersicht unter „Läuft" 18 Vorhaben, die seit Tagen „ruhen" oder „Sitzung beendet" tragen; die meisten sind gemergt [Q: Screenshot im Chat, 21.09.]. Die Übersicht führt ein Vorhaben erst dann unter „Umgesetzt", wenn die Absichtsdatei im Kopf `status: umgesetzt` trägt [Q: `ui/src/server/services/vorhaben-reader.ts:132`]; steht der Plan auf `umgesetzt`, ergibt das nur die Phase „PR", und die Zeile bleibt in „Läuft" [Q: `vorhaben-reader.ts:134`, `ui/frontend/src/components/vorhaben/vorhaben-sort.ts:42`].

Den Abschluss schreibt heute ein Sprachmodell: Nach dem Merge setzt eine Claude-Sitzung Status, Version, Änderungsdatum und Protokollzeile in `intent.md`, legt den Zweig `chore/INT-…-abschluss` an und eröffnet einen PR, den Michael merged [Q: `specwright/workflows/core/build.md:104`; 14 solcher PRs auf specwright-`main`, zuletzt #88 und #89]. Jeder Abschluss kostet eine Sitzung mit Kontext für ein Ergebnis, das immer gleich ist.

Und das Sprachmodell trifft das Wort nicht zuverlässig: In kreis-lippe-audit tragen INT-2026-009, -010 und -011 den Status `in Umsetzung`, INT-2026-012 in der Arbeitskopie ihrer Sitzung `abgeschlossen` [Q: `~/Entwicklung/privat/kreis-lippe-audit/intent/…/intent.md` und `…-worktrees/session-qwen3-8-flash-next/…`, 21.09.]. Beides kennt der Leser nicht: Phase „unbekannt", Zeile hängt ohne Ausweg in „Läuft" [Q: `vorhaben-reader.ts:128-145`].

Zwei Regeln der Übersicht halten eine Zeile auch bei richtigem Status fest. Erstens zeigt die Zeile die Kopie der zugeordneten Sitzung, sonst die zuletzt geänderte [Q: `vorhaben-reader.ts:478-500`, FA-06 aus INT-2026-004]: INT-2026-012 steht im Hauptcheckout längst auf `umgesetzt`, die UI zeigt „unbekannt", weil die Sitzungs-Arbeitskopie gewinnt. Zweitens entscheidet der Sitzungszustand vor der Phase [Q: `vorhaben-sort.ts:39-44`, INT-2026-016 AK-01]: rd-podcast INT-2026-001 ist umgesetzt und steht unter „Wartet auf dich", weil seine Sitzung offen ist und nichts tut.

Die Bausteine sind da: Das Backend kann Zweige anlegen, committen, pushen und über `gh` einen PR eröffnen [Q: `ui/src/server/services/git.service.ts:1072-1276`]; eine Abschluss-Nachricht des Vorhaben-Handlers gibt es nicht [Q: `ui/src/server/services/vorhaben-handler.ts:49-59`].

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael (einziger Nutzer) | Schließt ein fertiges Vorhaben mit einem Klick plus Bestätigung ab; merged danach nur noch den Abschluss-PR. Sieht die Zeile sofort unter „Umgesetzt". |
| Claude-Sitzungen (`/build`) | Schreiben den Abschluss nicht mehr selbst; Schritt 6 des Bau-Workflows verweist auf den Knopf. |
| Systeme | Web-UI (Vorhaben-Seite, Übersicht), Backend (Vorhaben-Handler, Git-Dienst, Nutzerzustand), Git-Repositories der Projekte samt GitHub (Zweig, PR), Workflow `build.md`. |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Ein fertiges Vorhaben lässt sich aus der UI abschließen, ohne eine Claude-Sitzung zu starten oder zu nutzen.
- **Z-02:** Jeder Abschluss schreibt dieselben Kopffelder mit demselben gültigen Statuswort; ein Abschluss aus der UI erzeugt nie eine Phase „unbekannt".
- **Z-03:** Ein abgeschlossenes Vorhaben steht in der Übersicht unter „Umgesetzt" — unabhängig davon, welche Arbeitskopien ältere Fassungen tragen und ob seine Sitzung noch offen ist.
- **Z-04:** Der Abschluss bleibt im Repo so nachvollziehbar wie heute: ein Commit auf einem eigenen Zweig, ein Pull Request, Merge durch Michael.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Kein Terminal-Befehl und kein Skript im Lieferumfang; der Abschluss ist eine Funktion der UI. Der Bau-Workflow verweist nur darauf. *(Entscheidung Michael, 21.09.)*
- **NZ-02:** Kein Abgleich mit GitHub, ob der Bau-PR gemergt ist, und kein automatischer Abschluss; Michaels Klick ist die Entscheidung. *(Entscheidung Michael, 21.09.)*
- **NZ-03:** Die UI merged den Abschluss-PR nicht; sie pusht nicht direkt auf `main`. *(Entscheidung Michael, 21.09.)*
- **NZ-04:** Falsche Statuswörter, die Sitzungen früher geschrieben haben (`in Umsetzung`, `abgeschlossen`), werden nicht repariert; der Leser lernt keine Synonyme. Solche Vorhaben schließt Michael über den Knopf ab.
- **NZ-05:** Kein Knopf für „verworfen" oder „abgelöst".
- **NZ-06:** Board-Karte wird nicht nachgezogen (eigene Sitzung, Skill `obsidian-po-board`).
- **NZ-07:** Weder die zugeordnete Sitzung noch ihre Arbeitskopie werden beendet oder aufgeräumt.
- **NZ-08:** `spec.md` und `plan.md` werden vom Abschluss nicht verändert; der Plan bleibt, wie die Bausitzung ihn hinterließ. *(Entscheidung Michael, 21.09., OF-04)*

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn die Vorhaben-Seite ein Vorhaben mit Ordner zeigt, dessen Absicht nicht `umgesetzt` ist, MUSS sie einen Knopf „Abschließen" anbieten — in jeder Phase (Spec, Plan, Bau, PR, unbekannt). | Z-01 | Test |
| AK-02 | Wenn „Abschließen" gedrückt wird, MUSS die UI vor jeder Änderung nennen, welches Vorhaben, welche Datei, welcher Zweig und welcher Pull Request entstehen, und auf eine Bestätigung warten. | Z-01 | Test |
| AK-03 | Wenn bestätigt wird, MUSS die Absichtsdatei danach `status: umgesetzt`, die nächste PATCH-Version, das heutige Änderungsdatum und eine Protokollzeile tragen („Umgesetzt: abgeschlossen aus der UI durch Michael Sindlinger; Belege in `plan.md` §13", plus die Nummer des Bau-PR, falls die Statuszeile des Plans sie nennt) — alles andere in der Datei unverändert. | Z-02 | Test |
| AK-04 | Wenn bestätigt wird, MUSS das Ergebnis als ein Commit auf einem eigenen Zweig ab dem entfernten Hauptzweig mit offenem Pull Request vorliegen. | Z-04 | Test + Stichprobe |
| AK-05 | Solange der Abschluss läuft und danach, DARF der Hauptcheckout des Projekts NICHT verändert werden (kein Zweigwechsel, keine geänderte Datei). | Z-04 | Test |
| AK-06 | Wenn der Abschluss bestätigt ist, MUSS die Übersicht die Zeile innerhalb von 5 s unter „Umgesetzt" zeigen — mit Hinweis auf den offenen Abschluss-PR, bis die Absichtsdatei in der Hauptkopie selbst `umgesetzt` trägt. | Z-03 | Test |
| AK-07 | Wenn die Absichtsdatei in der Hauptkopie `umgesetzt` trägt, MUSS die Zeile unter „Umgesetzt" stehen, auch wenn Arbeitskopien des Projekts andere Fassungen der Absicht tragen. | Z-03 | Test |
| AK-08 | Solange die zugeordnete Sitzung eines umgesetzten Vorhabens nur wartet (nicht arbeitet, nicht im Dialog steht), MUSS die Zeile unter „Umgesetzt" stehen. | Z-03 | Test |
| AK-09 | Falls Zweig, Commit, Push oder Pull Request scheitern (kein Git-Repository, kein Netz, `gh` fehlt oder ist nicht angemeldet, Kopf der Absicht nicht lesbar), MUSS die UI den Grund nennen und nichts Halbes hinterlassen — keinen Zweig ohne PR, keine Zeile unter „Umgesetzt". | Z-01 | Test |
| AK-10 | Der Abschluss MUSS am Mac und auf dem Cloud-Droplet gleich funktionieren. | Z-01 | Stichprobe |
| AK-11 | Solange die Zeile nur wegen des angestoßenen Abschlusses unter „Umgesetzt" steht (Datei noch nicht `umgesetzt`), MUSS die Vorhaben-Seite an derselben Stelle „Abschluss zurücknehmen" anbieten; danach steht die Zeile wieder in ihrer Phase. | Z-03 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Betrieb | Merge nach `main` nur per Pull Request; Merge löst den Auto-Deploy der UI aus und ist Michaels Schritt. | `CLAUDE.md` „Nie"; Entscheidung Michael 21.09. (Frage 1) |
| RB-02 | Betrieb | Der Hauptcheckout eines Projekts gehört Michael und kann ungestaged sein; Vorhaben laufen in Arbeitskopien unter `../<projekt>-worktrees/`. | `CLAUDE.md` Arbeitsweise |
| RB-03 | Technik | Git-Operationen der UI am Hauptrepo laufen unter dem Hauptrepo-Lock (`withMainProjectLock`). Grund: parallele Session-Worktrees. | `docs/architecture.md` AR-03 |
| RB-04 | Sicherheit | GitHub-Zugang (PAT, `gh`) liegt in der Host-Konfiguration; nie im Repo, nie im Diff, nie in einer Fehlermeldung. | `docs/security.md` §3 und §4 |
| RB-05 | Technik | Ob ein Abschluss läuft, gescheitert ist oder auf seinen PR wartet, weiß allein das Backend; die UI zeigt den Zustand nur. | `docs/architecture.md` AR-05 |
| RB-06 | Produkt | Gültige Statuswerte der Absicht: `entwurf · in_klaerung · angenommen · umgesetzt · abgeloest · verworfen`; Version SemVer, PATCH bei Formulierung; Frontmatter-Zeilen mit zwei Leerzeichen (MacDown). | `specwright/templates/sdlc/vorhaben/intent-template.md` „Felder im Kopf"; `CLAUDE.md` Konventionen |
| RB-07 | Produkt | INT-2026-016 AK-01 („Sitzungszustand vor Phase") wird für umgesetzte Vorhaben durch AK-08 eingeschränkt; INT-2026-004 FA-06 („Kopie der Sitzung gewinnt") durch AK-07. | dieses Vorhaben |
| RB-08 | Produkt | Der Bau-Workflow (`build.md` Schritt 6) nennt den Abschluss künftig als Klick in der UI, nicht als Schritt der Sitzung. | `specwright/workflows/core/build.md:104` |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Soll der Knopf auch direkt in der Übersichtszeile stehen, nicht nur auf der Vorhaben-Seite? | *entschieden 2026-09-21 (Product Owner)*: nein, nur Vorhaben-Seite → AK-01 | Product Owner | — |
| OF-02 | Beim PR-Weg ändert sich die Absichtsdatei im Hauptcheckout erst nach Merge und Pull. Trägt das Backend bis dahin eine Marke „Abschluss angestoßen, PR #n", damit die Zeile sofort unter „Umgesetzt" steht (AK-06)? | *entschieden 2026-09-21 (Product Owner)*: ja, Marke im Backend-Nutzerzustand (RB-05); sie verfällt, sobald die Datei `umgesetzt` trägt → AK-06 | Product Owner | — |
| OF-03 | Wie wird die Marke zurückgenommen, wenn der Abschluss-PR ohne Merge geschlossen wird? | *entschieden 2026-09-21 (Product Owner)*: derselbe Platz zeigt „Abschluss zurücknehmen", solange die Datei noch nicht `umgesetzt` trägt → AK-11 | Product Owner | — |
| OF-04 | Setzt der Abschluss auch `plan.md` auf `umgesetzt`, wenn der Plan noch `freigegeben` oder `in_umsetzung` steht? | *entschieden 2026-09-21 (Product Owner)*: nein, nur `intent.md` → NZ-08 | Product Owner | — |
| OF-05 | Was steht in der Protokollzeile? | *entschieden 2026-09-21 (Product Owner)*: „Umgesetzt: abgeschlossen aus der UI durch Michael Sindlinger; Belege in `plan.md` §13", plus die PR-Nummer des Baus, falls die Statuszeile des Plans sie nennt → AK-03 | Product Owner | — |

---

## 12. Annahmen

<!-- leser: mensch -->

- **AN-01:** Zweig, Commit, Push und PR des Git-Dienstes reichen für den Abschluss; sie laufen am Mac über `gh` und auf dem Droplet über PAT plus `gh` [Q: `git.service.ts:1072-1276`, `ui/src/server/github-config.ts`]. Ob `gh` auf dem Droplet eingerichtet ist, ist offen. Prüfung: Stichprobe auf dem Droplet in der Spec (AK-10). [Uncertain]
- **AN-02:** Der Abschluss lässt sich schreiben, ohne den Hauptcheckout anzufassen — über eine kurzlebige Arbeitskopie ab `origin/main`, wie sie das Backend für Session-Worktrees schon anlegt [Q: `ui/src/server/utils/cloud-session-worktree.ts:127-160`]. Prüfung: Test AK-05. [Likely]
- **AN-03:** Der Leser kann eine `umgesetzt`-Hauptkopie bevorzugen, ohne die Regel „Kopie der Sitzung gewinnt" für laufende Vorhaben zu brechen — `umgesetzt` ist ein Endzustand, aus dem keine Kopie zurückfällt. Prüfung: Tests der Reader-Zusammenführung. [Likely]
- **AN-04:** Der Hinweis in `build.md` Schritt 6 ist eine Textänderung, kein Code. Prüfung: Review. [Certain]

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-21 | Freigabe „intent.md 0.1.0"; OF-01 bis OF-05 wie vorgeschlagen entschieden und eingearbeitet: AK-03 (Wortlaut Protokollzeile), AK-11 neu (Abschluss zurücknehmen), NZ-08 neu (Plan und Spec unverändert). Abgleich Mensch/Agent (R4): ohne Befund — Kopf (Größe M, Risiko niedrig, Bypass nein) deckt sich mit Kern; jedes Ziel hat mindestens ein AK (Z-01: AK-01/02/09/10, Z-02: AK-03, Z-03: AK-06/07/08/11, Z-04: AK-04/05); keine Vertragsschicht nötig | AK-03, AK-11, NZ-08, OF-01–OF-05 | Product Owner, 21.09. |
| 0.1.0 | 2026-09-21 | Entwurf nach Gespräch: PR-Weg wie heute (Frage 1), Knopf in jeder Phase mit Bestätigung (Frage 2), abgeschlossene Zeile immer unter „Umgesetzt" (Frage 3), kein Terminal-Weg (Frage 4), Mac und Droplet (Frage 5); Befund Sitzungskopie/Statuswörter aus kreis-lippe-audit | alle | — |
