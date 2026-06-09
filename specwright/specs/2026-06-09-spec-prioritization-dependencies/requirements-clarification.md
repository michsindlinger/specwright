# Requirements Clarification - Spec-Priorisierung & Abhängigkeits-Sequenzierung

**Created:** 2026-06-09
**Status:** Pending User Approval

## Feature Overview
Die Spec-Übersicht im Dashboard ("Project Feature Specs") wird um zwei verknüpfte Konzepte erweitert: eine **Priorität** pro Spezifikation und **Abhängigkeiten** zwischen Spezifikationen ("blockiert durch"). Daraus berechnet das System eine **empfohlene Abarbeitungsreihenfolge**. Beim Anlegen einer Spec werden Abhängigkeiten automatisch (KI-gestützt) aus den `spec-lite.md`-Zusammenfassungen aller aktiven Specs vorgeschlagen, mit gestufter Eskalation auf `implementation-plan.md`/`spec.md` bei unsicherer Konfidenz.

## Target Users
Nutzer der Specwright Web UI, die mehrere offene Spezifikationen parallel verwalten und entscheiden müssen, **was zuerst** umgesetzt wird — sowohl nach Wichtigkeit (Priorität) als auch nach technischem Zwang (Abhängigkeiten).

## Business Value
Heute werden Specs ausschließlich nach Erstelldatum sortiert (`createdDate` absteigend). Es gibt keine Möglichkeit, Wichtigkeit auszudrücken oder festzuhalten, dass Spec B erst nach Spec A umgesetzt werden kann. Das führt zu: falscher Reihenfolge, blockierten Specs die fälschlich "startbereit" wirken, und manuellem Nachhalten der Reihenfolge im Kopf. Das Feature macht Priorität und technische Reihenfolge **sichtbar und automatisch konsistent**.

## Kernunterscheidung (Design-Grundlage)
Priorität und Abhängigkeit sind **getrennte Konzepte** und dürfen nicht vermischt werden:

| | Priorität | Abhängigkeit |
|---|---|---|
| Bedeutung | "Wie wichtig/dringend" (Wunsch) | "Was muss technisch vorher fertig sein" (Zwang) |
| Charakter | weich, frei änderbar | hart, erzwingt Reihenfolge |
| Konflikt-Regel | Tiebreaker | **gewinnt immer** über Priorität |

Die empfohlene Reihenfolge = topologische Sortierung über den Abhängigkeitsgraphen, Gleichstände gebrochen durch Priorität, dann Datum.

## Functional Requirements

### A. Priorität
1. Jede Spec erhält eine Priorität in 4 Stufen: **P0 (kritisch), P1 (hoch), P2 (mittel, Default), P3 (niedrig)**.
2. Prioritäts-Badge auf der Spec-Karte (neben den bestehenden Status-/Kanban-Badges) und in der Listen-Ansicht.
3. Priorität ist über die UI editierbar (Selektor auf der Karte oder im Spec-Detail).
4. Neuer Sortier-Selektor in der Übersicht: **Datum · Priorität · Empfohlene Reihenfolge** (neben "Nur aktive").

### B. Abhängigkeiten
5. Jede Spec hat ein Feld **`blockedBy`** (Liste von Spec-IDs, die vorher abgeschlossen sein müssen).
6. Abhängigkeiten sind **bidirektional editierbar**: "diese Spec wird blockiert durch …" (eingehend) UND "diese Spec ist Voraussetzung für …" (ausgehend → schreibt `blockedBy` bei der bestehenden Spec). Beide Richtungen landen im `blockedBy` der jeweils abhängigen Spec.
7. **Zyklus-Prüfung** bei jeder Kanten-Änderung: keine Kante, die einen Kreis (A→B→A) schließt; Zyklen werden dem User klar gemeldet.
8. **Karten-Status** abgeleitet aus den Abhängigkeiten:
   - 🟢 **Bereit** – alle Vorgänger erledigt
   - 🔒 **Blockiert** – mind. ein Vorgänger offen, Karte zeigt *wodurch* ("Blockiert durch: …").
9. Eine bereits abgeschlossene Spec als Vorgänger gilt als automatisch erfüllt (kein Blocker mehr). Als Blocker wählbar sind nur **aktive (nicht abgeschlossene)** Specs.

### C. Reihenfolge-Ansicht
10. Neue dritte Ansicht (neben Grid/Liste): **"Reihenfolge"** — nummerierte, topologisch sortierte Liste aller (aktiven) Specs mit Prioritäts-Badge, Status und "wartet auf ②/ermöglicht …"-Hinweisen.
11. Zyklus-Warnung in dieser Ansicht, falls keine gültige Reihenfolge berechenbar ist.
12. Neu angelegte Specs ohne Einordnung werden als "⚠ noch nicht eingeordnet" markiert (sichtbar machen statt erzwingen).

### D. Automatische Abhängigkeits-Analyse (KI-gestützt)
13. Beim Anlegen einer Spec (im `/create-spec`-Workflow) werden **immer alle aktiven, nicht abgeschlossenen Specs** über ihre `spec-lite.md` herangezogen — der Nutzer wählt den Betrachtungsumfang NICHT manuell aus.
14. Die Analyse leitet Kanten in **beide Richtungen** ab (neue Spec blockiert durch bestehende / neue Spec ist Voraussetzung für bestehende), je mit kurzer Begründung + Konfidenz.
15. **Gestufte Eskalation bei unsicherer Konfidenz** (paarweise, lazy — nur für das unsichere Spec-Paar, beide Seiten):
    - Default: `spec-lite.md` aller aktiven Specs (günstig).
    - Bei unsicherer Kante: bevorzugt `implementation-plan.md` der beteiligten Specs (falls vorhanden, da technische Blocker dort am greifbarsten), sonst Fallback `spec.md`.
    - Bleibt die Konfidenz danach niedrig: Kante **nicht setzen**, sondern als "⚠ bitte prüfen" markieren (nicht raten).
16. Das Analyse-Ergebnis wird dem User als **Vorschlag** präsentiert (übernehmen/anpassen) — es wird **nicht still automatisch gesetzt** (spec-lite ist eine lossy Zusammenfassung; ein falscher Blocker vergiftet die Reihenfolge).
17. Bei ausgehenden Kanten wird `blockedBy` in der `kanban.json` der **bestehenden** (abhängigen) Spec aktualisiert.

### E. Pflege & Wartung
18. **Backfill-Aktion** ("Alle analysieren") in der Reihenfolge-Ansicht, um den Graphen für die bestehenden Specs (die ohne den neuen Schritt angelegt wurden) initial zu befüllen.
19. **Re-Analyse on demand** ("neu analysieren"), um den Graphen bei verändertem Scope aktuell zu halten.
20. Beim Löschen einer Spec werden `blockedBy`-Verweise darauf bereinigt bzw. als "⚠ Vorgänger entfernt" angezeigt.

### F. Persistenz
21. Erweiterung des bestehenden `spec`-Objekts in `kanban.json` (keine neue Datei, abwärtskompatibel, Felder optional):
    ```json
    "spec": {
      "id": "...",
      "priority": "P0",
      "blockedBy": ["2026-05-30-gmail-read-lightweight"]
    }
    ```
22. `blockedBy` referenziert Spec-**IDs** (stabil), nicht Namen.
23. Schreiben über lock-sicheres `writeKanbanJson` + neuen WebSocket-Handler (Muster wie bestehendes `specs.assign`).

## Affected Areas & Dependencies
- **Frontend `ui/frontend/src/components/spec-card.ts`** — `SpecInfo`-Interface (+ `priority`, `blockedBy`, abgeleiteter `dependencyStatus`), Prioritäts-Badge, "Blockiert durch"-Hinweis.
- **Frontend `ui/frontend/src/views/dashboard-view.ts`** — Sortier-Selektor, `getSortedSpecs()` (neue Modi), neue Reihenfolge-Ansicht, Dependency-Editor-Dialog, Backfill/Re-Analyse-Trigger.
- **Frontend (neu)** — Komponente(n) für Reihenfolge-Ansicht (`aos-*`) und Abhängigkeits-Editor.
- **Backend `ui/src/server/specs-reader.ts`** — `SpecInfo`-Type (+ Felder), Lesen von `priority`/`blockedBy` aus kanban.json, Topo-Sortier-Logik + Zyklus-Erkennung, Schreib-Helfer.
- **Backend `ui/src/server/websocket.ts` / `routes/specs.ts`** — neue Handler: Metadaten-Update (priority/blockedBy), Abhängigkeits-Analyse triggern, Backfill.
- **Backend (neu)** — Abhängigkeits-Analyse-Logik (liest spec-lite → eskaliert zu plan/spec, ruft LLM, liefert Kanten-Vorschläge mit Konfidenz).
- **kanban.json Schema** — `spec.priority`, `spec.blockedBy` (optional, abwärtskompatibel).
- **Framework-Workflow `specwright/workflows/core/create-spec.md`** — neuer Schritt "Abhängigkeitsanalyse" nach spec-lite-Erzeugung (Step 2.6-lean / 2.6).

## Edge Cases & Error Scenarios
- **Zyklus** (A→B→A) → Kante wird nicht gesetzt; klare Meldung; Reihenfolge-Ansicht warnt.
- **Verwaister Verweis** (Blocker-Spec gelöscht) → `blockedBy` bereinigen oder "⚠ Vorgänger entfernt" anzeigen.
- **Specs ohne neue Felder** (Bestand) → verhalten sich exakt wie heute (Datums-Sortierung, kein Badge, Default-Priorität P2 erst bei expliziter Vergabe).
- **Niedrige Analyse-Konfidenz auch nach Volltext** → als "⚠ bitte prüfen" markieren, nicht raten.
- **Viele aktive Specs** → Lite-first hält Token-Kosten klein; Volltext nur paarweise bei Unsicherheit.
- **Abgeschlossene Spec als Vorgänger** → automatisch erfüllt, nicht als Blocker wählbar.

## Security & Permissions
Keine besonderen Berechtigungen — gleiches Zugriffsmodell wie die bestehende Spec-Übersicht. Single-User/Projekt-Kontext.

## Performance Considerations
- Topo-Sortierung + Zyklus-Erkennung sind bei realistischer Spec-Zahl (Dutzende) vernachlässigbar.
- KI-Analyse: Default nur kurze spec-lite-Texte; Volltext-Eskalation lazy und paarweise, um Token-Kosten zu begrenzen.

## Scope Boundaries
**IN SCOPE:**
- Priorität (P0–P3) inkl. Badge, Editor, Sortier-Modus
- Abhängigkeiten (`blockedBy`), bidirektionale Bearbeitung, Zyklus-Prüfung, Karten-Status
- Reihenfolge-Ansicht (nummerierte topologische Liste)
- Automatische KI-Abhängigkeits-Analyse aus spec-lite mit gestufter Eskalation (plan/spec) und Propose-&-Confirm
- Backfill + Re-Analyse, Cleanup bei Spec-Löschung
- Persistenz in kanban.json (`spec.priority`, `spec.blockedBy`), abwärtskompatibel
- Anpassung `/create-spec`-Workflow um den Analyse-Schritt

**OUT OF SCOPE (v1):**
- Echte Graph-Visualisierung (Boxen + Pfeile) — spätere Ausbaustufe; v1 nutzt nummerierte Liste
- Änderungen an Task-Ebene-Abhängigkeiten (existieren bereits separat in kanban tasks[])
- Hard-Locking (Start-Button für blockierte Specs deaktivieren) — wir empfehlen, nicht verbieten
- Freie Drag-&-Drop-Sortierung als Default (höchstens späterer optionaler "Manuell"-Modus)
- Automatisches Abarbeiten der Reihenfolge durch den Auto-Mode (siehe Open Questions)

## Resolved Decisions (2026-06-09)
1. **Auto-Mode-Integration:** Reihenfolge bleibt in v1 **rein visuell/orientierend**. Der Auto-Mode wird NICHT verändert. (Out-of-scope v1 — bewusst kleiner, sicherer Scope ohne Eingriff ins Parallel-Auto-Mode-Locking.)
2. **Konfidenz-Schwelle:** Die LLM stuft jede vorgeschlagene Kante als hoch/mittel/niedrig ein. **Eskalation auf Volltext bei "mittel" ODER "niedrig".** Bleibt es nach Volltext bei niedrig → "⚠ bitte prüfen" (nicht setzen).
3. **Prioritäts-Schema-Beschriftung:** **P0–P3** (P0=kritisch … P3=niedrig), kompakt auf der Karte.

## Proposed Tasks (High Level)
1. **kanban.json-Schema & Backend-Typen** — `spec.priority`, `spec.blockedBy`; SpecInfo erweitern; lock-sicheres Schreiben.
2. **Topo-Sortierung & Zyklus-Erkennung** — Backend-Logik für empfohlene Reihenfolge + abgeleiteter Karten-Status.
3. **WebSocket/Route-Handler** — Metadaten-Update (priority/blockedBy), Analyse-Trigger, Backfill.
4. **Prioritäts-UI** — Badge + Editor auf Spec-Karte/Liste, Sortier-Selektor mit neuen Modi.
5. **Abhängigkeits-UI** — bidirektionaler Editor-Dialog, "Blockiert durch"-Hinweis auf Karte.
6. **Reihenfolge-Ansicht** — neue `aos-*`-Ansicht (nummerierte Liste, "wartet auf", Zyklus-Warnung, "noch nicht eingeordnet").
7. **KI-Abhängigkeits-Analyse** — Analyse-Logik (spec-lite → Eskalation plan/spec, LLM-Kantenvorschläge mit Konfidenz, bidirektional) + Confirm-Dialog.
8. **Backfill & Re-Analyse + Cleanup** — "Alle analysieren"/"neu analysieren"-Aktionen, Verweis-Bereinigung bei Spec-Löschung.
9. **`/create-spec`-Workflow-Anpassung** — neuer Analyse-Schritt nach spec-lite-Erzeugung.

---
*Review this document carefully. Once approved, the implementation plan will be generated.*
