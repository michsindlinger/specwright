---
intent_id: "INT-2026-007"  
titel: "Vorhaben ohne Terminal führen: Sitzung als Gespräch in der Web-UI, Sprache in beide Richtungen"  
status: "abgeloest"  
version: "1.0.2"  
autor: "Michael Sindlinger (Gespräch mit Claude, 15.09.2026)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-15"  
geaendert: "2026-09-16"  
risikoklasse: "mittel"  
groesse: "L"  
bypass: "nein"  
bypass_grund: ""  
bezuege:  
  product: "docs/product-brief.md"  
  spec: "spec.md"  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, vorhaben, gespraech, sprache, cloud-terminal, plan-review, phase-5]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — „Freigabe, F6 lassen“, Intent-Sitzung 15.09."  
  am: "2026-09-15"  

---

# Absicht: Vorhaben ohne Terminal führen — Sitzung als Gespräch in der Web-UI, Sprache in beide Richtungen

<!-- Ablage: intent/INT-2026-007-sitzung-als-gespraech/intent.md -->

## Absicht in drei Sätzen

- **Zweck:** Michael soll ein Vorhaben von `/intent` bis `/build` ganz auf der Vorhaben-Seite der Web-UI führen können — lesen, was die Sitzung sagt, ihre Rückfragen beantworten, den Plan freigeben, den Plan-Review starten — und dabei mit der Sitzung sprechen wie Tony Stark mit Jarvis: reden statt tippen, hören statt lesen, unterbrechen dürfen.
- **Kernaufgaben:** (1) Die laufende Claude-Sitzung erscheint auf der Vorhaben-Seite als Gespräch, in beide Richtungen und ohne dass das Terminal geöffnet wird; (2) Rückfragen mit Auswahl und der Plan-Freigabe-Dialog sind dort bedienbar, der Plan-Review mit Reviewer-Auswahl von dort startbar; (3) Sprache hinein und heraus, mit Unterbrechen; (4) die Sitzung bleibt eine echte Claude-Code-Sitzung, jederzeit im Cloud-Terminal einsehbar, beide Ansichten zeigen denselben Stand.
- **Endzustand:** AK-01 bis AK-14 erfüllt; ein Vorhaben läuft am Mac von „Absicht beginnen" bis zum PR, ohne dass die Terminal-Ansicht geöffnet wird (AK-06).

## 1. Problem und Anlass

Seit INT-2026-004 und INT-2026-005 (PR #49) kann die UI einen Schritt starten und Anmerkungen oder eine Freigabe in die wartende Sitzung geben — aber nur hinein [Q: `ui/src/server/services/vorhaben-service.ts:405-410,423`]. Zurück kommt fast nichts: Der Stop-Hook liefert einen Auszug von 160 Zeichen für die Glocke, eine Rückfrage der Sitzung erreicht die UI nur als erste Frage im Grund „blockiert", ohne Optionen und ohne Text [Q: `ui/src/server/services/claude-hooks.ts:50,186,203-205`; `ui/src/shared/types/cloud-terminal.protocol.ts:437-442`]. Der Gesprächsinhalt liegt in der Transkriptdatei von Claude Code (JSONL mit `user`- und `assistant`-Zeilen), die Hook-Ereignisse nennen deren Pfad, die UI liest ihn nicht [Q: Stichprobe `~/.claude/projects/…/decf7cbb….jsonl`, 15.09.; `claude-hooks.ts:178-215` wertet nur `last_assistant_message`, `tool_name`, `tool_input.questions[0].question` aus] [Likely]. Deshalb muss Michael für jede Diskussion — und die Workflows `/intent` und `/spec` bestehen aus Diskussion — das Terminal öffnen; Ablauf E von INT-2026-004 endet genau dort (Sitzung im Vollbild).

Der Plan-Freigabe-Dialog ist über den Hook `PermissionRequest ExitPlanMode` erkennbar, die automatische Erkennung des Plan-Reviews greift dagegen nicht mehr (`PLAN_BOX_PATTERN` trifft die heutige Darstellung nicht); der Review startet nur über den Knopf in der Terminal-Leiste, Reviewer-Auswahl ebenda [Q: `ui/src/server/services/cloud-terminal-manager.ts:181,1587`; `ui/frontend/src/components/terminal/aos-auto-review-toggle.ts:305,337`; Memory 10.09. „Plan-Dialog + Hooks"; Board Specwright, Eingang „Auto-Detect des Plan-Reviews …"].

Sprache gibt es schon, aber am falschen Ort: Der Voice-Call (VCF-001…011, März 2026) hat Spracherkennung (Deepgram), Vorlesen satzweise (ElevenLabs) und Unterbrechen [Q: `ui/src/server/services/voice-call.service.ts:1-36`; `git log 91955d8…e392290`]. Sein Gesprächspartner ist aber ein zustandsloser SDK-Aufruf mit einem Zug und der Historie im Prompt, erreichbar nur über Team → Anrufen, nicht mit einer Vorhaben-Sitzung verbunden [Q: `voice-call.service.ts:594-600,656-676`; `ui/frontend/src/views/team-view.ts:210-221`]. Die Zugänge sind lokal eingerichtet, Personas: 0 [Q: `ui/config/voice-config.json`, lokal, 15.09.]. Der Mikro-Knopf am Handy sagt „Voice coming soon" [Q: `ui/frontend/src/components/mobile/aos-mobile-input-bar-idle.ts:58`].

Anlass: Michael hat den Vorhaben-Flow am 15.09. zum ersten Mal aus der UI gestartet (INT-2026-005) und will ihn jetzt ohne Terminal zu Ende führen; Phase 5 des SDLC-Umbaus („Web-UI neu denken") ist der Rahmen [Q: Michael, 15.09.; Board-Karte „AI-native SDLC v4", Stand 15.09.].

## 2. Betroffene

| Wer oder was | Was ändert sich |
|---|---|
| Michael am Mac (Vorhaben-Seite) | Sieht und führt das Gespräch mit der Sitzung dort; Rückfragen, Plan-Dialog, Plan-Review ohne Terminal; kann sprechen und hören |
| Michael am Handy | unverändert in diesem Vorhaben (NZ-01) |
| Cloud-Terminal | unverändert als Roh-Ansicht derselben Sitzung; alles aus der Vorhaben-Seite ist dort sichtbar und umgekehrt |
| Voice-Call (Team → Anrufen) | unverändert, bis OF-02 entschieden ist |
| Systeme | Web-UI Backend (`ui/src/server/`: Hooks, Sitzungen, Vorhaben-Dienst, Sprachadapter), Frontend (`ui/frontend/src/components/vorhaben/`), externe Sprachdienste Deepgram und ElevenLabs |

## 3. Ziele

- **Z-01:** Ein Vorhaben läuft am Mac von „Absicht beginnen" bis zum PR vollständig auf der Vorhaben-Seite; die Terminal-Ansicht bleibt zu.
- **Z-02:** Die Sitzung bleibt eine echte Claude-Code-Sitzung im Cloud-Terminal; Vorhaben-Seite und Terminal zeigen denselben Stand.
- **Z-03:** Sprechen in beide Richtungen: Gesprochenes kommt als Eingabe in der Sitzung an, Antworten der Sitzung sind hörbar, Michael kann unterbrechen.
- **Z-04:** Plan-Dialog und Plan-Review (mit Reviewer-Auswahl) sind von der Vorhaben-Seite aus bedienbar.

## 4. Nicht-Ziele

- **NZ-01:** Kein Handy in diesem Vorhaben (Mac zuerst, 15.09.); nichts bauen, was die Handy-Ansicht später ausschließt.
- **NZ-02:** Tool-Berechtigungs-Dialoge werden nicht als Formular nachgebaut (OF-01, AK-11).
- **NZ-03:** Kein zweiter Sitzungstyp (kein Headless-Chat statt tmux-Sitzung); der SDK-Chat unter „Chat" bleibt, wie er ist.
- **NZ-04:** Keine Änderung an Workflows und Vorlagen; die Sitzung bekommt keine anderen Befehle als heute.
- **NZ-05:** Kein eigener Sprach-Assistent neben der Sitzung; der Voice-Call als Vermittler ist abgewählt (Michael, 15.09.).
- **NZ-06:** Kein Aufwachwort („Hey Jarvis"), keine Nutzerverwaltung (T-06), keine Mehrbenutzer-Funktionen.

## 5. Abnahmekriterien

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Solange eine Sitzung dem Vorhaben zugeordnet ist, MUSS die Vorhaben-Seite jeden Gesprächsbeitrag (B-01) innerhalb von 3 s nach seinem Erscheinen im Terminal zeigen. | Z-01, Z-02 | Test + Messung |
| AK-02 | Wenn die Sitzung eine Rückfrage mit Auswahl stellt (B-02), MUSS die Vorhaben-Seite Frage und Optionen zeigen und die gewählte Antwort so an die Sitzung geben, dass sie weiterarbeitet. | Z-01 | Test + Playwright |
| AK-03 | Solange die Sitzung auf Eingabe wartet, MUSS die Vorhaben-Seite Freitext annehmen und an die Sitzung übergeben. | Z-01 | Test |
| AK-04 | Wenn die Sitzung den Plan zur Freigabe vorlegt (B-03), MUSS die Vorhaben-Seite die Optionen des Plan-Dialogs zeigen und die Wahl — annehmen, ändern mit Text, ablehnen — an die Sitzung geben. | Z-01, Z-04 | Test + Playwright |
| AK-05 | Solange der Plan-Dialog offen ist, MUSS die Vorhaben-Seite den externen Plan-Review mit wählbaren Reviewern starten lassen, mit demselben Ergebnis wie über den Knopf der Terminal-Leiste. | Z-04 | Test |
| AK-06 | Ein Vorhaben MUSS sich am Mac von „Absicht beginnen" bis zum PR durchlaufen lassen, ohne dass die Terminal-Ansicht geöffnet wird. | Z-01 | Stichprobe (E2E, Bildschirmfoto je Phase) |
| AK-07 | Wenn Michael das Mikro einschaltet und spricht, MUSS das Gesprochene innerhalb von 3 s nach Sprechende als Text in der Sitzung ankommen. | Z-03 | Messung |
| AK-08 | Wenn die Sitzung antwortet und Vorlesen eingeschaltet ist, MUSS die Antwort spätestens 3 s nach ihrem ersten vollständigen Satz hörbar beginnen. | Z-03 | Messung |
| AK-09 | Wenn Michael während des Vorlesens spricht, MUSS das Vorlesen sofort stoppen und das Gesprochene als Eingabe zählen (B-05). | Z-03 | Test |
| AK-10 | Jede Eingabe von der Vorhaben-Seite MUSS im Terminal derselben Sitzung sichtbar sein, und jede Eingabe im Terminal auf der Vorhaben-Seite. | Z-02 | Test |
| AK-11 | Falls die Sitzung auf eine Tool-Berechtigung wartet, MUSS die Vorhaben-Seite das mit dem Grund zeigen und den Sprung ins Terminal anbieten. | Z-01 | Test |
| AK-12 | Falls ein Sprachdienst ausfällt, MUSS das Gespräch als Text weiterlaufen und der Ausfall sichtbar sein. | Z-03 | Test |
| AK-13 | Vorgelesen wird nur Claudes Text an Michael; Werkzeugaufrufe, Dateiinhalte und Terminal-Rohausgabe DÜRFEN NICHT vorgelesen werden. | Z-03 | Review + Stichprobe |
| AK-14 | Das Mikro DARF NICHT ohne ausdrückliche Handlung von Michael aktiv werden; sein Zustand ist jederzeit sichtbar. | Z-03 | Test + Review |

## 6. Randbedingungen

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | TypeScript strict, kein `any`; Präfix `aos-`; Nutzerzustand im Backend, nie in `localStorage` (AR-05); keine harten Projektpfade (AR-04); das Framework bleibt ohne UI lauffähig (AR-06) | `CLAUDE.md` Konventionen, `docs/architecture.md` §4 |
| RB-02 | Technik | Die Sitzung bleibt die Claude-Code-Sitzung in tmux mit Hooks; die UI steuert sie nur über Wege, die die Sitzung selbst anbietet (Eingabe in die PTY, Hook-Ereignisse, Transkript). Grund: Z-02, kein zweiter Sitzungstyp | `docs/architecture.md` §2 Zeile Backend; Michael, 15.09. |
| RB-03 | Sicherheit | Zugänge zu Sprachdiensten nur in `ui/config/voice-config.json` (Klasse intern, nie im Repo); neue Endpunkte nennen Zugriffsbegrenzung, Eingabeprüfung und Datenklasse; T-06 (UI ohne Nutzerverwaltung) bleibt offen und wird nicht verschlimmert | `docs/security.md` §1, §3, §6 |
| RB-04 | Datenschutz | Gesprochenes, Transkripte und Gesprächsinhalte sind Projektinhalte (Klasse intern); sie verlassen den Host nur zu den Sprachdiensten und landen nie im Repo | `docs/security.md` §1 |
| RB-05 | Betrieb | Merge nach `main` löst die automatische Auslieferung der UI aus — Merge ist Michaels Schritt; Ausfall eines Sprachdienstes darf die Sitzung nicht stören (AK-12) | `CLAUDE.md` „Nie", `docs/security.md` §6 |
| RB-06 | Technik | Browser geben das Mikro nur in sicherem Kontext (HTTPS oder localhost) frei; der Zugang zur UI läuft lokal über HTTPS (Tailscale) | Browser-Regel (Secure Context); Memory „Tailscale-Handyzugriff" |

## 7. Offene Fragen

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Tool-Berechtigungen ohne Terminal: Sitzungen aus der UI starten heute mit den Argumenten aus der lokalen `model-config.json` (dort `--dangerously-skip-permissions`) [Q: `ui/config/model-config.json:10`, lokal]; der Plan-Dialog löst trotzdem `PermissionRequest` aus. Reicht das, oder braucht die UI ein eigenes Berechtigungs-Verhalten? | nein — bis dahin gilt AK-11 (Anzeige + Sprung ins Terminal) | Product Owner | Spec-Freigabe |
| OF-02 | Was wird aus dem Voice-Call (Team → Anrufen): bleibt, wird abgebaut, oder zieht auf die neuen Adapter um? | nein — bis dahin unangetastet (NZ-05) | Product Owner | Spec-Freigabe |
| OF-03 | Sprachdienste: vorhandene Adapter (Deepgram, ElevenLabs; Zugänge da) oder Browser-eigene Spracherkennung und -ausgabe (ohne Zugänge, ohne Kosten, schlechtere Qualität)? | nein — bis dahin die vorhandenen Adapter; ein neuer Dienst fällt unter ER-02 | Tech Lead | Plan-Freigabe |

---

## 8. Begriffe

- **B-01 Gesprächsbeitrag:** Eine Eingabe von Michael an die Sitzung oder ein Text, den Claude an Michael richtet, einschließlich Rückfragen und Dialogen. Keine Gesprächsbeiträge: Werkzeugaufrufe und ihre Ergebnisse, Dateiinhalte, Terminal-Rohausgabe — sie bleiben dem Terminal vorbehalten (die Spec darf sie eingeklappt anbieten).
- **B-02 Rückfrage mit Auswahl:** Eine Frage der Sitzung mit vorgegebenen Antwortmöglichkeiten und der Möglichkeit „Anderes" (Werkzeug `AskUserQuestion`). Die Vorhaben-Seite zeigt Frage, Optionen und ein Freitextfeld.
- **B-03 Plan-Dialog:** Die Freigabe-Abfrage am Ende des Plan Mode mit den Optionen „annehmen", „annehmen und automatisch ausführen", „Claude sagen, was zu ändern ist"; erkennbar am Hook `PermissionRequest` für `ExitPlanMode` [Q: Memory 10.09.].
- **B-04 Sitzung:** Die Claude-Code-Sitzung in tmux, die die UI für einen Schritt gestartet hat oder die dem Vorhaben nach FA-21 (INT-2026-004) zugeordnet ist.
- **B-05 Unterbrechen:** Michael spricht, während vorgelesen wird; das Vorlesen stoppt sofort, der Rest der Antwort wird nicht mehr vorgelesen, bleibt aber lesbar.
- **B-06 Ohne Terminal:** Die Terminal-Ansicht der UI bleibt geschlossen; der Sprung ins Terminal ist nur bei AK-11 nötig.
- **B-07 Vorlesen eingeschaltet:** Eine Einstellung je Nutzer (im Backend, AR-05), Standard aus; Mikro und Vorlesen sind getrennt schaltbar.

## 9. Erfolgskennzahlen

| ID | Kennzahl | Zielwert | Messung vor Freigabe | Messung im Betrieb | Reaktion bei Verfehlen |
|---|---|---|---|---|---|
| EK-01 | Terminal-Öffnungen je Vorhaben, das aus der UI geführt wird | ≤ 1 (nur AK-11) | E2E-Pfad AK-06: 0 Öffnungen | Michael zählt bei den nächsten 3 Vorhaben | Ursache je Öffnung als Karte; bei > 1 im Schnitt Nachbesserung vor Stufe „Sprache" |
| EK-02 | Verzögerung Terminal → Vorhaben-Seite je Beitrag | ≤ 3 s | Messung im Test mit Zeitstempeln, 20 Beiträge | Stichprobe je Vorhaben | Mechanismus des Rückwegs im Plan ändern (ER-03) |
| EK-03 | Sprache: Sprechende → Text in der Sitzung; erster Satz → hörbar | je ≤ 3 s | Stoppuhr, 5 Versuche je Richtung | Stichprobe | Dienst oder Verfahren wechseln (OF-03, ER-02) |
| EK-04 | Eingaben von der Vorhaben-Seite, die im Terminal fehlen | 0 (Kontrollfall: Eingabe bei geschlossener Sitzung wird abgewiesen und gemeldet) | Test AK-10 | — | Bug, Stopp der Stufe |

## 10. Auslieferung, Betrieb, Zeitbudget

- **Freigabe für den Betrieb:** Product Owner (Michael Sindlinger) — Merge nach `main`.
- **Stufen:** wie INT-2026-004 in getrennten PRs, jede für sich nützlich: (1) Gespräch lesen und Freitext antworten (AK-01, AK-03, AK-10, AK-11); (2) Rückfragen, Plan-Dialog, Plan-Review (AK-02, AK-04, AK-05, AK-06); (3) Sprache (AK-07 bis AK-09, AK-12 bis AK-14). Zuschnitt endgültig in der Spec.
- **Rückzug:** Revert des jeweiligen PR; Mikro und Vorlesen sind per Einstellung abschaltbar, Standard aus (B-07). Wer abschaltet und wieder einschaltet: Michael.
- **Betrieb:** Michael; Ausfälle der Sprachdienste sichtbar in der UI (AK-12), keine Alarme.
- **Zeitbudget:** 10 Arbeitssitzungen ab Plan-Freigabe. Abbruchkriterium: Stufe 1 nach 4 Sitzungen nicht im PR → Stopp und Neubewertung des Rückwegs (AN-01); keine stillschweigende Verlängerung.

## 11. Entscheidungsrechte

| ID | Stufe | Regel |
|---|---|---|
| ER-00 | allein (vorläufig) | Auslegungsfragen zu AK, RB oder B ohne Widerspruch: engste Auslegung, die den Wortlaut erfüllt; in der Spec unter „Annahmen" dokumentieren; weiterarbeiten. Bestätigung gesammelt bei der Spec-Freigabe. |
| ER-01 | allein | Details ohne Datenverlust und ohne Außenwirkung: interne Struktur, Benennungen, Aufgabenschnitt, synthetische Testdaten, Gestaltung der Gesprächsansicht innerhalb von `docs/design.md`. |
| ER-02 | fragen | Neue externe Abhängigkeit (Bibliothek, Sprachdienst, Fremddienst). |
| ER-03 | fragen | Eine Kennzahl wird vor der Freigabe verfehlt. |
| ER-04 | stopp | Zugriff auf Betriebsdaten — hier: Läufe gegen den Live-Backend-Port oder den Cloud-Host; E2E nur gegen ein Branch-Backend mit eigenem tmux-Socket. |
| ER-05 | stopp | Zwei Kriterien widersprechen sich. |
| ER-06 | stopp | Tests, Gates oder Schwellen müssten geändert werden, damit etwas grün wird. |
| ER-07 | stopp | Freigabe für den Betrieb: bereitet der Agent vor; freigeben darf nur die Rolle aus Abschnitt 10. |
| ER-08 | stopp | Zeitbudget ausgeschöpft. |
| ER-09 | stopp | Eine Änderung würde das Cloud-Terminal als Roh-Ansicht einschränken oder die Sitzung durch etwas anderes als eine Claude-Code-Sitzung ersetzen (Z-02, RB-02). |

## 12. Annahmen

- **AN-01:** Die Hook-Ereignisse nennen je Sitzung `session_id` und `transcript_path`, und die Transkriptdatei enthält Claudes Text, Michaels Eingaben und die Rückfragen mit Optionen in lesbarer Form, zeitnah zum Terminal. Prüfung: Tech Lead schneidet vor der Plan-Freigabe ein Hook-Ereignis und die Datei einer Vorhaben-Sitzung mit; scheitert das, ist der Rückweg über die tmux-Bildschirmkopie die Rückfallebene (ER-03).
- **AN-02:** Der Plan-Dialog ist über `PermissionRequest ExitPlanMode` erkennbar und über Tasten steuerbar; Text landet nur bei fokussierter dritter Option (Memory 10.09.). Prüfung: E2E im Plan gegen ein Branch-Backend.
- **AN-03:** „Mit Claude oder anderen LLMs sprechen" ist durch die Modellwahl beim Start des Schritts abgedeckt (Provider-Wrapper, `ModelSelection` in `startStep`) [Q: `vorhaben-service.ts:427,438`]; es entsteht kein neuer Modell-Mechanismus. Prüfung: Product Owner bestätigt bei der Freigabe.
- **AN-04:** Die Sprachadapter des Voice-Call (Deepgram, ElevenLabs) lassen sich ohne den Voice-Call selbst wiederverwenden; ihre Zugänge bleiben verfügbar. Prüfung: Tech Lead im Plan; bei Nein OF-03.
- **AN-05:** Eine Vorhaben-Sitzung wird weiterhin nach FA-21 (INT-2026-004) dem Vorhaben zugeordnet; das Gespräch hängt an dieser Zuordnung. Prüfung: bestehende Tests `vorhaben-service*.test.ts`.

---

## Änderungsprotokoll

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.2 | 2026-09-16 | Abgelöst durch INT-2026-011 „Terminal statt Gespräch" (PO, Chat 16.09.): Stufe 1 (Gespräch, Freitext) wird dort abgebaut, Stufe 2 (Dialog-Karten) und Stufe 3 (Sprache) werden nicht gebaut; Sprache bei Bedarf als eigenes Vorhaben | — | Product Owner, 16.09. |
| 1.0.1 | 2026-09-16 | `bezuege.plan` gesetzt: `plan.md` freigegeben (drei Runden externer Review) | — | Product Owner, 16.09. |
| 1.0.0 | 2026-09-15 | Angenommen ohne inhaltliche Änderung; Kern bewusst über 450 Wörter (Belege in Abschnitt 1, PO-Entscheidung „F6 lassen") | alle | Product Owner, 15.09. |
| 0.1.0 | 2026-09-15 | Entwurf aus dem Gespräch: Sitzung als Chat, Sprache beide Richtungen, Mac zuerst, Dialoge Freitext/Rückfragen/Plan-Dialog/Plan-Review | alle | — |

<!-- Definition of Ready (vor status "angenommen"):
     [x] Drei Sätze nennen Zweck, Kernaufgaben, Endzustand und versprechen nichts, was AK/RB/NZ einschränken.
     [x] Problem mit Beleg, Anlass genannt.
     [x] Jedes AK: EARS-Form, ein Modalverb, Ziel, Prüfart, beobachtbar statt Mechanismus.
     [x] Mindestens ein Nicht-Ziel. Jede RB mit Herkunft.
     [x] Keine offene Frage mit „Blockiert: ja".
     [x] Keine Projektregeln, die in CLAUDE.md gehören.
     [x] Ab risikoklasse mittel: Abschnitte 8–12 ausgefüllt.
     [x] `verantwortlich` hat angenommen, Commit dokumentiert die Annahme. -->
