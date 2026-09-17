# ADR-0004: Die Web-UI zeigt die Claude-Sitzung, statt sie nachzulesen

> Status: Angenommen — löst ADR-0003 ab
> Datum: 2026-09-17
> Betrifft: Web-UI (`ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts`, `kennung-link-provider.ts`, `ui/src/server/services/claude-hooks.ts`, `cloud-terminal-manager.ts`, `ui/src/shared/types/hook-events.protocol.ts`), Vorhaben INT-2026-011
> Umgesetzt in: PR #65 (Stufe 1: Andocken, Kennungen, Gesprächs-Frontend entfernt), PR #66 (Stufe 2: Backend-Abbau, Docs)

---

## Kontext

ADR-0003 (INT-2026-007) hat entschieden, den Verlauf einer Claude-Code-Sitzung aus zwei Quellen aufzubauen: Echtzeit aus den Hooks, Historie aus der Transkriptdatei, die Claude Code je Sitzung schreibt. Daraus wurde das „Gespräch" der Vorhaben-Seite: Sprechblasen, Dialog-Zustand je Werkzeugaufruf, Dedup zwischen Hook und Transkript, Allowlist-Prüfung des Transkriptpfads. Rund 2.250 Zeilen in acht Dateien plus fünf Testdateien (`intent.md` §1, Messung 16.09.2026). Von INT-2026-007 wurde nur Stufe 1 gebaut; Dialog-Karten und Sprache kamen nie.

Alles davon bildet nach, was das Terminal ohnehin zeigt: Claudes Text, Rückfragen, Berechtigungs-Dialoge, Plan-Modus, Fortschritt — und im Terminal kann Michael direkt antworten. Die Knöpfe der Dokumentseite arbeiten längst über das Terminal: „Nächster Schritt" startet eine Sitzung mit dem Befehl als Startargument, Freigabe und Anmerkungen gehen als Bracketed Paste in die wartende PTY nach Bildschirmprüfung auf Dialog-Cues. Nach zwei Layout-Drehungen (PR #59, #60) hat der Product Owner am 16.09.2026 entschieden: Das Terminal reicht, das Gespräch ist doppelt.

Ein PTY hat eine Größe; beim `resize` gewinnt der letzte Schreiber (`cloud-terminal-manager.ts`). Zwei xterm-Instanzen auf derselben Sitzung zerreißen den Verlauf, und ein neuer Wirt löst den Buffer-Replay aus, der zweimal Startfragen von Claude Code als Eingabe untergeschoben hat (`design.md` §3).

---

## Entscheidung

**Die Sitzung wird gezeigt, nicht nachgelesen.** Neben dem Dokument steht die bestehende Cloud-Terminal-Sidebar in einem Modus `docked`: halbe Inhaltsbreite ab 1024 px, unter der Kopfzeile, ohne Zieh-Griff und Schatten, dieselbe xterm-Instanz wie schwebend (nur Breite und Klasse ändern sich, kein zweites xterm, kein Replay). Die Vorhaben-Seite meldet der App per `document`-Ereignis, welche Sitzung zu ihr gehört; die App öffnet die Sidebar und wählt den Tab, mit Merkstelle für Tabs, die nach dem Ereignis eintreffen. Der Andock-Zustand ist eine Ableitung aus Route und Fensterbreite, kein Nutzerzustand (AR-05 unberührt).

**Kennungen als Verweise statt Sprechblasen mit Links.** Der Dokument-Leser kennt jeden Absatz mit seiner Kennung (`deriveAnchors`); er meldet die Menge an einen flüchtigen Frontend-Dienst (`kennungen.service`), ein xterm-`ILinkProvider` markiert im Terminal genau diese Codes. Klick löst `kennung-open` aus, der Leser springt hin und klappt den Abschnitt auf; ein `mousedown`-Stopper verhindert, dass der Klick als SGR-Maus-Report an tmux geht (Messung Stufe 1, Schritt 0 (c)). Keine Treffer auf Codes, die das Dokument nicht enthält.

**Kein Transkript-Leser, kein Gesprächs-Backend.** `GespraechService`, `GespraechHandler`, `TranscriptTailer`, die `gespraech:*`-Nachrichten, die Transkript-Fixtures und die Teile der Hook-Verarbeitung, die nur Sprechblasen und Dialog-Karten gefüttert haben (`beitrag`, `dialog`, `dialogClosed`, `reportDialog`, `reportBeitrag`, `closedDialogIds`, `dialogSeq`), sind entfernt. Die Hook-Route liefert nur noch Status, `blockKind` (Rückfrage, Plan, Berechtigung, unbekannt) und Kontext; das reicht für Glocke, Tab-Farbe und Zustandszeile.

**Was bleibt, bleibt begründet.** Der Hook-Kontext (`transcriptPath`, `claudeSessionId`) wird weiter mit der Sitzung gespeichert (Registry, `toPersistedEntry`), ohne Leser: das Registry-Schema für einen String zu ändern brächte keinen Sicherheitsgewinn (der Pfad wird gespeichert, nicht gelesen), und ein künftiger Leser findet den Pfad vor — die Allowlist-Regel in `security.md` §6 gilt dann wieder. `sanitizeSessionEnv` mit `CLAUDE_CODE_FORCE_SESSION_PERSISTENCE=1` bleibt: Claude Code soll seine Sitzungen weiter persistieren (Fortsetzen mit `--resume`), unabhängig davon, ob die UI liest. Die Freitext-Zustellung (Bildschirmprüfung, `withMachineWrite`, Warteschlange, Protokoll „gesendet · angenommen") ist vom Gespräch unabhängig und bleibt; ihre Konstanten leben jetzt in `vorhaben.protocol.ts` (`FREITEXT_*`, `FreitextGrund`), die Hook-Typen in `hook-events.protocol.ts`.

---

## Konsequenzen

- Die UI pflegt keine zweite Darstellung derselben Sitzung mehr; jede Aktion der Dokumentseite ist im Terminal sichtbar (Schritt startet → neuer Tab, Freigabe → Eingabe in der Sitzung).
- Die Abhängigkeit vom undokumentierten Transkriptformat entfällt; damit auch die Fixtures je Claude-Code-Version und die Degradationsstufen `nur_echtzeit`/`nicht_verfuegbar`.
- Die Dialog-Monotonie (ein geschlossener Dialog öffnet nie wieder, INT-2026-007 Review E1) entfällt mit `closedDialogIds`. Ein verspäteter `blocked`-Hook nach einem `PostToolUse` könnte den Status kurz auf „wartet" setzen; der nächste Stop oder Prompt korrigiert ihn. Hooks laufen Sekunden auseinander, das Fenster ist klein; beobachtet wurde es nicht.
- Unter 1024 px bleibt die Sidebar schwebend (bis 500 px breit) und drückt das Dokument schmal — heutiges Verhalten, bewusst kein Sonderfall (Spec OF-02).
- `localStorage` der Sidebar (Breite, Layout-Modus, Panes) bleibt eine Abweichung von AR-05 (`architecture.md` §10); das Andocken speichert nichts Neues.

---

## Alternativen

| Alternative | Warum nicht |
|---|---|
| Gespräch behalten und fertig bauen (Dialog-Karten, Sprache — INT-2026-007 Stufe 2/3) | Doppelte Darstellung; jede neue Claude-Code-Oberfläche (Dialogarten, Plan-Modus) müsste nachgebaut werden; PO-Entscheidung 16.09. |
| Zweites `aos-terminal` in der rechten Spalte der Seite, Sidebar blendet den Tab aus | Zwei xterm auf einem PTY: `resize` letzter Schreiber gewinnt → zerrissener Verlauf; neuer Wirt = neuer Buffer-Replay (zweimal regressiert). |
| Gesprächs-Backend behalten, nur Frontend entfernen | Toter Transkript-Leser mit Sicherheitsprüfungen ohne Nutzer (Z-04 „weg, nicht versteckt", EK-01 = 0 Dateien). |
| Hook-Kontext (`transcriptPath`, `claudeSessionId`) mit entfernen | Registry-Schema und `toPersistedEntry` für einen String ohne Leser ändern; kein Sicherheitsgewinn. |
| Kennungs-Verweis nur mit Cmd/Ctrl+Klick | Spec FA-13 sagt Klick; der `mousedown`-Stopper macht den einfachen Klick tmux-sicher (0 `cloud-terminal:input`-Frames). |

---

## Belege

- Absicht `intent/INT-2026-011-terminal-statt-gespraech/intent.md` §1 (Zeilenzählung, Anlass), §4 Nicht-Ziele, §9 EK-01.
- Plan `intent/INT-2026-011-terminal-statt-gespraech/plan.md` §3 (Ansatz, verworfene Alternativen), §12 F4 (Hook-Kontext bleibt), §14 (Messung Klick/tmux, Stufe 1).
- Tests: `ui/tests/unit/aos-cloud-terminal-docked.test.ts`, `app-terminal-dock.test.ts`, `kennung-link-provider.test.ts`, `aos-vorhaben-view-terminal.test.ts` (Stufe 1); `claude-hooks.test.ts`, `cloud-terminal-routes.test.ts`, `cloud-terminal-agent-event.test.ts` (reduziert, Stufe 2).
- Nachweis EK-01: `find ui/src ui/frontend/src ui/tests -iname '*gespraech*'` → leer (Stufe 2).
