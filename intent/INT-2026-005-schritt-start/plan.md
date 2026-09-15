# Plan: Nächster Schritt aus der Web-UI — Sitzung sichtbar im Vollbild, Befehl mit `specwright:`-Präfix

> **Intent:** `intent.md` (INT-2026-005, 1.0.0) · **Spec:** entfällt (bypass: zwei Bugs in INT-2026-004, Größe S; Verhalten durch INT-2026-004 spec.md Ablauf E Schritt 6, FA-35, FA-21 festgelegt)
> **Status:** freigegeben — Bau beauftragt (Michael, „Mach A1", Board-Sitzung 15.09.)
> **Erstellt:** 2026-09-15 (Bypass ohne Plan Mode — Recherche in §2 belegt gegen `origin/main` `ed29667`) · **Freigabe:** Product Owner (Michael Sindlinger) mit dem PR
> **Pflichtinput gelesen:** `docs/architecture.md` (Stand `ed29667`, §2 Frontend/Backend, AR-04, AR-05, §10), `CLAUDE.md` (Konventionen UI, Hooks, „Nie"), `docs/security.md` §2 (T-06: UI führt Befehle über das Terminal aus — unverändert), `docs/design.md` §7

## In einfachen Worten

**Worum geht es?** Seit heute Abend hat die Web-UI auf jeder Vorhaben-Seite einen Knopf für den nächsten Schritt — „Absicht beginnen", „Spec schreiben", „Plan erstellen", „Bau starten". Ein Klick startet im Hintergrund eine Claude-Sitzung und tippt dort den passenden Befehl ein. Michael hat den Knopf zum ersten Mal ausprobiert, und zwei Dinge gingen schief. Erstens: Die Sitzung wurde zwar gestartet, aber sie war nicht zu sehen. Die Terminal-Ansicht kann den Bildschirm in zwei oder vier Felder teilen, und jedes Feld gehört zu einem Projekt. Die neue Sitzung wurde keinem Feld zugeteilt — sie lief unsichtbar im Hintergrund. Zweitens: Der eingetippte Befehl hieß `/intent`. Claude Code kennt den Befehl aber nur unter seinem vollen Namen `/specwright:intent`, weil alle Specwright-Befehle in einem eigenen Ordner liegen und deshalb diesen Vorsatz tragen. Der kurze Name läuft ins Leere.

**Was ändert sich?** Nach diesem Vorhaben passiert nach dem Klick genau das, was Michael erwartet: Die Terminal-Ansicht geht in den Vollbildmodus, die neue Sitzung liegt allein auf der ganzen Fläche — so, als hätte man das Feld mit der Tastenkombination ⌘⇧↩ groß gezogen — und das richtige Projekt ist ausgewählt. Wenn die Ansicht gerade nicht geteilt ist, wechselt die UI auf das Projekt der Sitzung und zeigt sie als aktiven Reiter. Und der Befehl, der in der Sitzung landet, heißt jetzt `/specwright:intent` beziehungsweise `/specwright:spec INT-…` und so weiter — an allen drei Stellen, wo die UI ihn zeigt, und an der einen, wo sie ihn tippt.

**Wie wird das gemacht?** Für das Sichtbarmachen gibt es schon ein Vorbild: die Glocke oben in der Terminal-Ansicht. Klickt man dort auf eine fertige Sitzung, holt die UI sie bereits ins richtige Feld — egal ob geteilt oder nicht, egal welches Projekt. Diese Logik bekommt einen kleinen Zusatz „und dann allein auf die Fläche" (Vollbild an, Feld zoomen) und einen Namen, unter dem die Vorhaben-Seite sie aufrufen kann. Für den Befehl gibt es künftig eine einzige Funktion, die aus „Schritt + Kennung" den vollen Befehl baut; die vier Stellen, die den Befehl heute selbst zusammensetzen, rufen sie auf. So kann die Schreibweise nicht wieder auseinanderlaufen. Zuerst werden die Tests geschrieben, die das heutige Verhalten als Fehler festhalten; dann der Code, bis die Tests grün sind; am Ende ein echter Klick im Browser gegen ein Test-Backend mit Bildschirmfoto.

**Was kann schiefgehen?** Die Glocken-Logik wird nur erweitert, nicht umgebaut — ihre eigenen Tests bleiben gleich. Der Vollbildmodus ist wie heute nicht dauerhaft: Wer die Seitenleiste schließt, ist beim nächsten Öffnen wieder im normalen Modus. Die Erkennung „welche Sitzung gehört zu welchem Vorhaben" versteht schon heute beide Schreibweisen des Befehls, daran ändert sich nichts. Am Handy bleibt alles wie es ist. Rückgängig: Revert der PR.

**Was musst du entscheiden?** Nichts — Freigabe mit dem Pull Request. Merge ist dein Schritt (Auto-Deploy der UI).

## 1. Kurzfassung

Sidebar bekommt eine öffentliche Methode `showSessionSolo(sessionId)`: Vollbild an, dann dieselbe Sprung-Logik wie die Glocke (`resolveJumpTarget`), deren Ziel über einen neuen reinen Helfer `soloJumpTarget()` auf „zoomen" verschärft wird (`focus-pane` → `zoom-pane`, `assign-pane` mit `keepZoom: true`). `app.ts` ruft sie an den beiden Stellen, die heute nur `activeTerminalSessionId` setzen (`_handleVorhabenSessionStarted`, `pendingSelectSessionId`-Pfad). Befehlsform zentral in `ui/src/shared/types/vorhaben.protocol.ts` als `stepCommand(step, intentId?)` → `/specwright:<step>[ INT-…]`; vier Aufrufstellen ersetzen ihre Vorlagen-Strings. Tests zuerst (rot), `fix-mode`, dann Code; Playwright-Nachweis gegen Branch-Backend 3111 mit Screenshot.

## 2. Ausgangslage im Code

| Bereich | Heute (Datei:Zeile, `origin/main` `ed29667`) | Bedeutung für dieses Vorhaben |
|---|---|---|
| Start-Ereignis | `aos-naechster-schritt.ts:175-191` `start()` → `vorhabenService.startStep` → Ereignis `vorhaben-session-started` (bubbles, composed) | unverändert |
| Handy | `aos-vorhaben-view.ts` `onSessionStarted`: `isMobile` → `stopPropagation` + Toast | unverändert (NZ-03) |
| App-Reaktion | `app.ts:1741-1751` `_handleVorhabenSessionStarted`: Tab da → `activeTerminalSessionId`, `isTerminalSidebarOpen = true`; sonst `pendingSelectSessionId`. `app.ts:1722-1730` `_handleCloudTerminalCreatedElsewhere`: bei Treffer dasselbe | beide Stellen rufen künftig `_showSessionSolo(tab.id)` |
| Einzel-Layout | `app.ts:799` `projectTerminalSessions` = Sitzungen des aktiven Projekts; Sidebar `.sessions` | anderes Projekt → Reiter unsichtbar; Glocke löst es über `session-jump` → `_handleTerminalSessionJump` (`app.ts:891-900`, `switchToProject` + `lastActiveSessionByProject`) |
| Split-Layout | `aos-cloud-terminal-sidebar.ts:1854-1941` `_reconcilePanes` (nur `_pendingNewSession`, Restore, Fallback, Dedup); `_assignPaneSession` `:2502-2529` (Move-Semantik, Zoom bleibt nur im gezoomten Pane); `_handlePaneFocus` `:2531-2535` | Vorhaben-Sitzung bekommt kein Pane |
| Vorbild Glocke | `_jumpToNotification` `:1636-1682` mit `resolveJumpTarget` (`agent-notifications.ts:124-143`, rein, getestet in `agent-notifications.test.ts:65-139`): `select-tab` / `focus-pane` / `zoom-pane` / `assign-pane` | wiederverwenden; Rumpf in `_jumpTo(session, solo)` ausgliedern |
| Vollbild / Zoom | `isFullscreen` `:115`, `_toggleFullscreen` `:2360-2367` (`updateContentOffset`, `_refreshVisibleTerminals`); `_zoomedPane` `:151`, `_zoomPane` `:1446`, `_afterZoomChange` `:1466-1474` (Fokus, `_emitSessionSelect`, Refit, xterm-Fokus); `updated()` `:2981-2995` (Schließen → Vollbild aus) | `showSessionSolo` setzt Vollbild vor dem Sprung |
| Befehl getippt | `vorhaben-service.ts:444` `step === 'intent' ? '/intent' : `/${step} ${intentId}`` → `createSession(..., command, ...)` | ersetzen durch `stepCommand` |
| Befehl angezeigt | `vorhaben-reader.ts:141-149` `deriveNextStep` (`command` in `VorhabenNextStep`); `aos-naechster-schritt.ts:205` Fallback; `aos-projekt-seite.ts:242` `command="/intent"`, `:245` Hinweistext | ersetzen durch `stepCommand` |
| Erkennung | `vorhaben-service.ts:130` `V4_COMMAND_RE = /^\s*\/(?:specwright:)?(intent\|spec\|plan\|build)…/` | unverändert, beide Formen |
| Richtig gemacht | `aos-getting-started-view.ts:80` `commandId: `specwright:${command}`` → `cloud-terminal-manager.ts:993` | Muster |
| Tests Kurzform | `vorhaben-reader.test.ts:145-148,200` · `vorhaben-service.test.ts:95,117` · `vorhaben-service-stage2.test.ts:162,165,203` (`createSession`-Argument [5]) · `aos-vorhaben-stage2.test.ts:249,253` (explizites `command`, bleibt) | Erwartungen auf Präfix; `session.prompt-text`-Emits mit Kurzform bleiben (simulieren Handeingabe) |
| Bezugsliste | `ui/tests/known-failures.txt`: 5 Einträge, keiner betroffen | unangetastet |

## 3. Entwurf

### Ansatz

**Sichtbarkeit.** `aos-cloud-terminal-sidebar.ts`: `_jumpToNotification(sessionId)` wird zu `_closeBell(); this._jumpTo(session, false)`. Neu `private _jumpTo(session, solo: boolean)`: berechnet `resolveJumpTarget(...)`, bei `solo` durch `soloJumpTarget()` geschärft, dann der bestehende `switch`. Neu öffentlich:

```ts
/** Bring a session to the front alone (INT-2026-005, FA-35): fullscreen, its pane/tab selected, zoomed in split — what ⌘⇧↩ does by hand. */
showSessionSolo(sessionId: string): void {
  const session = this.allSessions.find((s) => s.id === sessionId);
  if (!session) return;
  this._setFullscreen(true);
  this._jumpTo(session, true);
}
```

`_toggleFullscreen` ruft `_setFullscreen(!this.isFullscreen)`; `_setFullscreen(on)` enthält den heutigen Rumpf (Quad-Downgrade beim Verlassen, `updateContentOffset`, `_refreshVisibleTerminals`) und ist bei gleichem Wert ein No-op.

`agent-notifications.ts`, rein:

```ts
/** Sharpen a jump into "alone on the screen": the target pane gets zoomed (split only). */
export function soloJumpTarget(target: JumpTarget): JumpTarget {
  switch (target.kind) {
    case 'focus-pane': return { kind: 'zoom-pane', pane: target.pane };
    case 'assign-pane': return { ...target, keepZoom: true };
    default: return target;
  }
}
```

`assign-pane` mit `keepZoom: true` setzt im bestehenden `switch` `_zoomedPane = pane` vor `_assignPaneSession` — genau der Weg, den die Glocke bei aktivem Zoom nimmt; `_assignPaneSession` behält den Zoom, weil er das Zielpane trifft. `select-tab` (Einzel-Layout) bleibt: Reiter wählen oder `session-jump` an `app.ts` (Projektwechsel). Vollbild ist dort die einzige Änderung.

`app.ts`: neu `private _showSessionSolo(tabId: string)`: `isTerminalSidebarOpen = true`, `activeTerminalSessionId = tabId`, dann `void this.updateComplete.then(() => this.querySelector('aos-cloud-terminal-sidebar')?.showSessionSolo(tabId))` (Light-DOM, Muster `app.ts:444,681`). `_handleVorhabenSessionStarted` und der `pendingSelectSessionId`-Zweig rufen sie statt der zwei Zuweisungen. Der Aufruf nach `updateComplete` stellt sicher, dass die Sidebar `allSessions` mit dem neuen Tab kennt und gerendert ist.

**Befehl.** `ui/src/shared/types/vorhaben.protocol.ts`:

```ts
/** Claude Code name of a step command. The commands live in `.claude/commands/specwright/`, so the namespace is part of the name (INT-2026-005). */
export function stepCommand(step: VorhabenStep, intentId?: string): string {
  const name = `/specwright:${step}`;
  return step === 'intent' || !intentId ? name : `${name} ${intentId}`;
}
```

Aufrufer: `vorhaben-service.ts:444`, `vorhaben-reader.ts:144-148`, `aos-naechster-schritt.ts:205` (Fallback), `aos-projekt-seite.ts:242,245`. Spec INT-2026-004: Fußnote unter Ablauf E „`/intent` steht für `/specwright:intent`" (Doku, keine FA).

### Verworfene Alternativen

| Alternative | Warum nicht |
|---|---|
| In `_reconcilePanes` Vorhaben-Sitzungen automatisch adoptieren | Läuft bei jeder `allSessions`-Änderung, auch für Sitzungen anderer Geräte (AR-05) — würde fremde Starts auf den Bildschirm ziehen. Der Sprung gehört an das Klick-Ereignis. |
| Layout auf `single` umschalten statt zoomen | Wirft die Pane-Belegung weg (persistiert); ⌘⇧↩ ist das, was Michael beschrieben hat, und lässt sich mit derselben Taste zurücknehmen. |
| `resolveJumpTarget` um `solo`-Parameter erweitern | Würde 10 bestehende Testfälle berühren; ein Nachschärfer darüber lässt sie unangetastet. |
| Präfix nur im Backend (`vorhaben-service.ts:444`) | Anzeige bliebe falsch (AK-04); Drift zwischen drei Stellen ist genau der Fehler, der passiert ist. |
| `V4_COMMAND_RE` auf Präfix-Pflicht ziehen | Handeingabe im Terminal darf weiter `/spec INT-…` sein — ob Claude Code das versteht, ist Sache des Nutzers; die Zuordnung soll großzügig bleiben (FA-21). |

### Architektur-Auswirkung

- **Nein** — bleibt in `architecture.md` §2 (Frontend Lit, Backend Express/WS), AR-04 (keine harten Pfade), AR-05 (Workspace-Zustand im Backend: das Vollbild bleibt wie heute Browser-lokal und nicht persistent — keine neue Zustandsklasse). Kein ADR.

## 4. Änderungen

| # | Datei / Komponente | Art | Was | Herkunft |
|---|---|---|---|---|
| 1 | `ui/src/shared/types/vorhaben.protocol.ts` | ändern | `stepCommand(step, intentId?)` | AK-03, AK-04 |
| 2 | `ui/src/server/services/vorhaben-service.ts` | ändern | `:444` → `stepCommand(step, intentId)` | AK-03 |
| 3 | `ui/src/server/services/vorhaben-reader.ts` | ändern | `deriveNextStep` nutzt `stepCommand` | AK-04 |
| 4 | `ui/frontend/src/components/vorhaben/aos-naechster-schritt.ts` | ändern | Fallback `:205` → `stepCommand`; Kopfkommentar | AK-04 |
| 5 | `ui/frontend/src/components/vorhaben/aos-projekt-seite.ts` | ändern | `command=${stepCommand('intent')}`, Hinweistext | AK-04 |
| 6 | `ui/frontend/src/components/terminal/agent-notifications.ts` | ändern | `soloJumpTarget()` | AK-01 |
| 7 | `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` | ändern | `showSessionSolo()`, `_jumpTo()`, `_setFullscreen()`; `_jumpToNotification` und `_toggleFullscreen` delegieren | AK-01, AK-02 |
| 8 | `ui/frontend/src/app.ts` | ändern | `_showSessionSolo(tabId)`; zwei Aufrufstellen | AK-01, AK-02 |
| 9 | `ui/tests/unit/agent-notifications.test.ts` | ändern | `describe('soloJumpTarget()')` (4 Fälle) | AK-01 |
| 10 | `ui/tests/unit/aos-cloud-terminal-solo.test.ts` | neu | Komponente in happy-dom: split-2 mit Hintergrund-Sitzung → `showSessionSolo` → Vollbild, Pane, Zoom; Einzel-Layout anderes Projekt → `session-jump` + Vollbild | AK-01, AK-02 |
| 11 | `ui/tests/unit/{vorhaben-reader,vorhaben-service,vorhaben-service-stage2,aos-vorhaben-stage2}.test.ts` | ändern | Erwartungen auf `/specwright:…`; `stepCommand`-Fälle in `vorhaben-reader.test.ts` | AK-03, AK-04 |
| 12 | `intent/INT-2026-004-ui-vorhaben-sicht/spec.md` | ändern | Fußnote Ablauf E: Schreibweise der Befehle | — |
| 13 | `intent/INT-2026-005-schritt-start/{intent,plan}.md` | neu | Vorhaben (Bypass) | — |

**Nicht betroffen (ausdrücklich):** `_reconcilePanes`, `_assignPaneSession`, `resolveJumpTarget` und ihre Tests; `V4_COMMAND_RE`; `vorhaben-watcher.ts`; `cloud-terminal-manager.ts`; Handy-Pfad; `known-failures.txt`; `docs/architecture.md`; `CLAUDE.md`.

## 5. Verbindungen

| Von | Nach | Art | Schnittstelle | Nachweis (Befehl) | Teil |
|---|---|---|---|---|---|
| `app.ts` `_showSessionSolo` | Sidebar `showSessionSolo` | DOM-Methodenaufruf | `(sessionId: string) => void` | `grep -n 'showSessionSolo' ui/frontend/src/app.ts ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` → je ≥ 1 | — |
| Sidebar `_jumpTo` | `soloJumpTarget` | Import | `JumpTarget → JumpTarget` | `grep -n 'soloJumpTarget' ui/frontend/src/components/terminal/*.ts` → 2 Dateien | — |
| Sidebar `select-tab` | `app.ts` `_handleTerminalSessionJump` | Ereignis `session-jump` (bestehend) | `{sessionId, projectPath}` | Komponententest AK-02 | — |
| `vorhaben-service.ts`, `vorhaben-reader.ts`, `aos-naechster-schritt.ts`, `aos-projekt-seite.ts` | `stepCommand` | Import aus `shared/types` | `(step, intentId?) => string` | `grep -rn 'stepCommand' ui/src ui/frontend/src` → 5 Dateien; `grep -rn "'/intent'\|\`/\${" ui/src ui/frontend/src` → 0 | — |
| `stepCommand`-Ausgabe | `V4_COMMAND_RE` | Text in Sitzung | `/specwright:spec INT-…` | `vorhaben-service-stage2.test.ts` Zuordnung nach `session.prompt-text` mit Präfix | — |

- [x] Jede neue Komponente hat mindestens eine Verbindung.
- [x] Jeder Nachweis ist ein ausführbarer Befehl.

## 6. Reihenfolge der Arbeit

0. Vorprüfung (erledigt in der Board-Sitzung, §2): Glocken-Logik als Vorbild bestätigt, 4 Befehlsquellen, Testliste.
1. Tests zuerst: (a) `agent-notifications.test.ts` `soloJumpTarget` (Modul fehlt → rot); (b) `aos-cloud-terminal-solo.test.ts` neu (Methode fehlt → rot); (c) Erwartungen in den vier Vorhaben-Tests auf `/specwright:` (rot); (d) `stepCommand`-Fälle. `cd ui && npx vitest run tests/unit/agent-notifications.test.ts tests/unit/aos-cloud-terminal-solo.test.ts tests/unit/vorhaben-reader.test.ts tests/unit/vorhaben-service.test.ts tests/unit/vorhaben-service-stage2.test.ts tests/unit/aos-vorhaben-stage2.test.ts` → rot. Dann `touch .claude/fix-mode`.
2. `stepCommand` + vier Aufrufer (#1–#5) → Vorhaben-Tests grün.
3. `soloJumpTarget` (#6) → `agent-notifications.test.ts` grün.
4. Sidebar (#7): `_setFullscreen`, `_jumpTo`, `showSessionSolo`; `app.ts` (#8) → Komponententest grün.
5. Spec-Fußnote (#12). `cd ui && npm run lint` (Backend + Frontend) grün, `npx tsc --noEmit` beide.
6. Playwright gegen Branch-Backend 3111 (Rezept Memory `reference_cloud_terminal_e2e_playwright`): Split-2 herstellen, „Absicht beginnen" klicken → Sidebar `isFullscreen`, `_effectiveZoom` = Pane der Sitzung, erste Eingabe im Backend-Log `/specwright:intent`; Screenshot `intent/INT-2026-005-schritt-start/design/ist-vollbild.png`.
7. `bash scripts/verify.sh` → `verify: OK`; §13; `rm .claude/fix-mode`; Commit, Push, PR; CI abwarten.

## 7. Zerlegung

### Variante A — nicht zerlegbar, eine Sitzung

Acht Quelldateien, über das Start-Ereignis und die Befehlsfunktion verbunden; unter einem halben Tag.

## 8. Tests und Nachweis

| AK / FA | Test | Datei | Art |
|---|---|---|---|
| AK-01 | `soloJumpTarget`: `focus-pane`→`zoom-pane`, `assign-pane`→`keepZoom: true`, `select-tab`/`zoom-pane` unverändert | `ui/tests/unit/agent-notifications.test.ts` | Unit (rein) |
| AK-01 | Komponente split-2, Sitzung `s3` (Projekt B) im Hintergrund, Pane 1 zeigt B → `showSessionSolo('s3')` → `isFullscreen`, `paneSessionIds[1] === 's3'`, `_zoomedPane === 1`, `session-select` gefeuert | `ui/tests/unit/aos-cloud-terminal-solo.test.ts` | Komponente (happy-dom) |
| AK-02 | Komponente single, aktives Projekt A, Sitzung `s3` (Projekt B) → `showSessionSolo('s3')` → `isFullscreen`, Ereignis `session-jump` `{sessionId:'s3', projectPath:'/b'}` | `ui/tests/unit/aos-cloud-terminal-solo.test.ts` | Komponente |
| AK-03 | `startStep('intent')` → `createSession`-Argument [5] `'/specwright:intent'`; `startStep('spec', 'INT-2026-004')` → `'/specwright:spec INT-2026-004'` | `ui/tests/unit/vorhaben-service-stage2.test.ts` | Unit (Fake-Manager) |
| AK-04 | `deriveNextStep` liefert Präfix für bau/plan/spec; `stepCommand` 4 Fälle; Übersicht-Zeile `nextStep.command`; Knopf-Fallback | `vorhaben-reader.test.ts`, `vorhaben-service.test.ts`, `aos-vorhaben-stage2.test.ts` | Unit / Komponente |
| FA-35 | Playwright: Klick „Absicht beginnen" im Split → Vollbild + Zoom + Log-Eingabe `/specwright:intent` | Skript im Scratchpad, Screenshot in `design/` | E2E (Browser + Backend 3111) |

- **Verify-Befehl:** `bash scripts/verify.sh` — muss grün sein, Ausgabe im PR. **CI ist die Wahrheit.**
- **Datenkorrektur:** entfällt (kein gespeicherter Zustand ändert Form; `lastModel`/Zuordnungen bleiben).
- **Angeschlossen (E2E-Pfad):** Knopf → `vorhaben:start-step` → `createSession` mit Präfix-Befehl → `vorhaben:step-started` → `vorhaben-session-started` → `_showSessionSolo` → Sidebar Vollbild/Zoom — im Playwright-Lauf als ein Klick durchlaufen.
- **Bugfix:** Tests zuerst (Schritt 1), Fehlschlag bestätigt, dann Fix; `.claude/fix-mode` ab Schritt 2, Hook `protect-tests` aktiv. Erwartungen der vier Vorhaben-Tests werden in Schritt 1 (vor dem Marker) auf das korrekte Verhalten gezogen — das ist die Fehlerfeststellung, nicht eine Anpassung an den Code.

## 9. Risiken

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme | Wer merkt es |
|---|---|---|---|---|
| Sidebar hat den neuen Tab beim Aufruf noch nicht in `allSessions` (Rennen `step-started` vs. `cloud-terminal:created`) | mittel | Sprung ohne Wirkung | Aufruf erst nach `updateComplete`; `pendingSelectSessionId`-Pfad ruft dieselbe Methode nach der Adoption — zwei Wege, einer greift | Michael: Sitzung nicht im Vollbild |
| Zoom im Quad-Layout | niedrig | keine | `zoom-pane` und `_afterZoomChange` sind layoutunabhängig (`_paneCount` 4); Test deckt split-2, Quad manuell im Playwright-Lauf nicht — Risiko benannt | — |
| Nutzer, die bewusst im Split bleiben wollen, verlieren beim Start die Übersicht | niedrig | gering | ⌘⇧↩ oder Header-Knopf hebt Zoom auf, Esc verlässt Vollbild; Belegung der Panes bleibt (kein Layoutwechsel) | Michael |
| Spec/Docs zeigen weiter `/intent` | — | Verwirrung | Fußnote in Spec Ablauf E; `CLAUDE.md` nennt die Phasen, nicht die Befehle | — |

## 10. Manuelle Schritte

| Schritt | Wer | Wann | Erledigt |
|---|---|---|---|
| PR-Freigabe und Merge nach `main` (löst Auto-Deploy der Web-UI aus) | Michael | nach CI grün | [ ] |
| Haupt-Checkout `git pull --ff-only`, Frontend bauen, Backend 3001 neu starten | Michael / nächste Sitzung | nach Merge | [ ] |

## 11. Schätzung

2–3 h. Unsicherheit gering: Sprung-Logik und Vollbild existieren; neu sind ein reiner Helfer, eine Sidebar-Methode, eine App-Methode und eine Befehlsfunktion.

## 12. Review des Plans

| Finding | Quelle | Entscheidung | Änderung am Plan |
|---|---|---|---|
| `showSessionSolo` bei geschlossener Sidebar: `updated()` schaltet Vollbild beim Schließen aus, nicht beim Öffnen — Reihenfolge `isOpen = true` (App) → Render → `showSessionSolo` (Vollbild) ist sicher | Self | angenommen, im Entwurf so | §3 |
| Einzel-Layout, gleiches Projekt: `select-tab` wählt nur den Reiter — „allein auf der Fläche" ist im Einzel-Layout ohnehin gegeben | Self | angenommen | §3 |
| Tests der vier Vorhaben-Dateien werden geändert — widerspricht das „Test nie anpassen"? | Self | Nein: die Erwartung war falsch (Kurzform läuft ins Leere); Änderung vor `fix-mode`, dokumentiert in §8 | §8 |

**Minimalinvasiv geprüft:** Glocken-Logik nur ausgegliedert, nicht geändert (ihre 10 Tests unverändert); kein Layoutwechsel, keine Persistenz; Befehlsform an einer Stelle statt vier.

## 13. Definition of Done

- [ ] AK-01 bis AK-04 haben einen grünen Test (§8).
- [ ] Nachweise aus §5 ausgeführt und im PR zitiert.
- [ ] E2E-Pfad (Playwright, Split-2, Klick) läuft; Screenshot in `design/`.
- [ ] `verify` grün lokal (`verify: OK`), Ausgabe im PR — PR-Check grün (CI ist die Wahrheit).
- [ ] `docs/architecture.md`: keine Änderung nötig (§3 Nein).
- [ ] Manuelle Schritte (§10) im PR als offen markiert.
- [ ] Abweichungen in §14.
- [ ] 2x-Regel geprüft.
- [ ] Board: Block „Für das Board" im Abschlussbericht (Karten Quick Wins → Erledigt nach Merge).

## 14. Abweichungen bei der Umsetzung

| Datum | Abweichung | Grund | Auswirkung auf Abschnitt |
|---|---|---|---|
