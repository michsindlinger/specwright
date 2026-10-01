---
intent_id: "INT-2026-029"  
titel: "Backend überlebt einen früh beendeten Claude-Helfer"  
status: "angenommen"  
version: "1.0.0"  
autor: "Claude (Opus 5.5)"  
verantwortlich: "Michael"  
erstellt: "2026-10-01"  
geaendert: "2026-10-01"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Bugfix unter 1 Tag"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "intent/INT-2026-029-sdk-stdin-epipe/plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [bugfix, backend, agent-sdk, plan-review]  

---

# Absicht: Backend überlebt einen früh beendeten Claude-Helfer

<!-- Ablage: intent/INT-2026-029-sdk-stdin-epipe/intent.md -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Das UI-Backend stürzt nicht mehr ab, wenn ein Hintergrund-Helfer (Plan-Review-Zusammenfassung, externer Reviewer, Vorlagen-Extraktion) vorzeitig endet; Michaels Terminals und Sitzungen laufen weiter.
- **Kernaufgaben:** Den Schreibfehler auf dem Eingabekanal des Helfers abfangen; die Fehlerausgabe des Helfers der Zusammenfassung ins Log bringen, damit die Ursache des frühen Endes sichtbar wird.
- **Endzustand:** Ein früh beendeter Helfer führt zum normalen Rückfall-Pfad statt zum Prozessende (AK-01, AK-02), und das Log nennt dessen Fehlerausgabe (AK-03).

## 1. Problem und Anlass

<!-- leser: mensch -->

Zweimal hintereinander ist das Backend während einer Plan-Review mit `Error: write EPIPE … Emitted 'error' event on Socket instance` beendet worden, direkt nach `[FindingAggregator] cluster call started` [Q: Terminal-Ausgabe Michael, 2026-10-01]. Das Agent SDK 0.1.77 startet einen `claude`-Kindprozess, hört aber nicht auf `error` an dessen stdin [Q: `ui/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs:7810–7832`]. Endet das Kind, während der Prompt noch geschrieben wird, gibt es niemanden, der den Fehler annimmt, und Node beendet den Prozess. Warum das Kind früh endet, ist unbekannt: Die Zusammenfassung leitet seine Fehlerausgabe nicht weiter [Q: `ui/src/server/services/finding-aggregator.ts:190–201`].

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael (UI-Nutzer) | Terminals und Sitzungen bleiben bei einem gescheiterten Helfer bestehen; die Review fällt auf die Einzelansicht zurück. |
| Systeme | UI-Backend: Plan-Review (Zusammenfassung, externer Reviewer), Vorlagen-Extraktion aus Bildern. |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Ein vorzeitig beendeter SDK-Kindprozess beendet das Backend nicht.
- **Z-02:** Die Ursache eines gescheiterten Zusammenfassungs-Aufrufs ist im Backend-Log ablesbar.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Kein Upgrade des Agent SDK (0.1.77 → 0.3.x); eigene Karte.
- **NZ-02:** Kein globaler `uncaughtException`-Handler.
- **NZ-03:** Die Ursache des frühen Endes wird hier nicht behoben, nur sichtbar gemacht.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Falls der Kindprozess endet, während noch in seine Eingabe geschrieben wird, dann MUSS das Backend weiterlaufen. | Z-01 | Test |
| AK-02 | Falls der Zusammenfassungs-Aufruf an einem früh beendeten Kindprozess scheitert, dann MUSS die Review mit dem Rückfall `llm-error` weiterlaufen. | Z-01 | Test |
| AK-03 | Falls der Zusammenfassungs-Aufruf scheitert, MUSS das Backend-Log die Fehlerausgabe des Kindprozesses enthalten. | Z-02 | Test |
| AK-04 | Der externe Reviewer MUSS die Fehlerausgabe seines Kindprozesses weiterhin in seiner Fehlermeldung nennen. | Z-02 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Sicherheit | Werkzeug- und MCP-Regel der Helfer bleibt unverändert (nur Lese-Werkzeuge, keine MCP-Server). | `ui/src/server/utils/sdk-call-options.ts`, INT-2026-006 |
| RB-02 | Technik | TypeScript strict, kein `any`. Grund: Projektkonvention. | `CLAUDE.md` |

## 7. Offene Fragen

<!-- leser: mensch -->

Keine.

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-10-01 | Angenommen als Bugfix (A1 + A2 aus der Diagnose). Abgleich Mensch/Agent: ohne Befund | alle | Michael, 2026-10-01 (Chat: „ja mach A1 und A2 als bugfix") |
