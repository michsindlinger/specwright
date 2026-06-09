# Spec — Spec-Priorisierung & Abhängigkeits-Sequenzierung

**ID:** `2026-06-09-spec-prioritization-dependencies`
**Prefix:** `SPD`
**Tier:** L
**Mode:** V2 Lean
**Created:** 2026-06-09

## Overview

Die Spec-Übersicht im Dashboard erhält **Priorität (P0–P3)** und **Abhängigkeiten (`blockedBy`)** je Spezifikation, eine daraus berechnete **empfohlene Abarbeitungsreihenfolge** (neue Ansicht) und eine **KI-gestützte Abhängigkeitsanalyse** beim Spec-Anlegen. Persistenz erfolgt abwärtskompatibel im `spec`-Objekt der `kanban.json` nach dem bewährten `assignedToBot`-Muster. Der Auto-Mode bleibt unberührt — die Reihenfolge ist in v1 rein visuell.

## Tasks

| ID | Titel | planSection |
|----|-------|-------------|
| SPD-001 | Backend-Typen & Persistenz (priority/blockedBy) | phase-1-backend-types-persistence |
| SPD-002 | Graph-Logik: Topo-Sort, Zyklen, abgeleiteter Status | phase-2-graph-logic |
| SPD-003 | WebSocket-Handler für priority/blockedBy | phase-3-websocket-handlers |
| SPD-004 | Prioritäts-UI: Badge + Sortier-Selektor | phase-4-priority-ui |
| SPD-005 | Abhängigkeits-UI: bidirektionaler Editor + Karten-Hinweis | phase-5-dependency-ui |
| SPD-006 | Reihenfolge-Ansicht (topologische Liste) | phase-6-order-view |
| SPD-007 | KI-Abhängigkeitsanalyse + Vorschlags-Dialog | phase-7-ai-analysis |
| SPD-008 | Wartung: Backfill, Re-Analyse, Cleanup bei Löschung | phase-8-maintenance-workflow |
| SPD-009 | `/create-spec`-Workflow-Anpassung (Analyse-Schritt) | phase-8-maintenance-workflow |

Detailkontext je Task liegt in `implementation-plan.md` (Anchor = planSection) und wird zur Ausführungszeit on-the-fly via `kanban_get_next_task` geladen.

## Spec Scope

- Priorität P0–P3 pro Spec: Badge (Karte + Liste), Editor, neuer Sortier-Modus (Datum · Priorität · Empfohlene Reihenfolge).
- Abhängigkeiten `blockedBy` (Spec-IDs), bidirektional editierbar, Backend-enforced Zyklus-Prüfung.
- Abgeleiteter Karten-Status (🟢 Bereit / 🔒 Blockiert + "blockiert durch …"); abgeschlossene Vorgänger gelten erfüllt; nur aktive Specs wählbar.
- Neue "Reihenfolge"-Ansicht: nummerierte topologische Liste, "wartet auf"/"ermöglicht", Zyklus-Warnung, "⚠ noch nicht eingeordnet".
- KI-Analyse beim Anlegen: alle aktiven Specs via spec-lite, bidirektionale Kanten mit Konfidenz, paarweise/lazy Eskalation auf plan/spec bei mittlerer/niedriger Konfidenz, "⚠ bitte prüfen" statt Raten, Propose-&-Confirm.
- Backfill ("Alle analysieren"), Re-Analyse on demand, Cleanup verwaister `blockedBy` bei Spec-Löschung.
- Persistenz: optionale Felder `spec.priority`/`spec.blockedBy` in kanban.json, lock-safe, WebSocket-Broadcast.
- Anpassung des `/create-spec`-Workflows um den Analyse-Schritt.

## Out of Scope (v1)

- Echte Graph-Visualisierung (Boxen + Pfeile) — spätere Ausbaustufe.
- Freie Drag-&-Drop-Sortierung als Default.
- Hard-Locking (Start-Button für blockierte Specs deaktivieren).
- Aktives Abarbeiten der Reihenfolge durch den Auto-Mode (Reihenfolge bleibt rein visuell).
- Änderungen an Task-Ebene-Abhängigkeiten (existieren separat in kanban `tasks[]`).

## Integration Requirements

**Integration Type:** Full-stack (Backend + Frontend + Framework-Workflow)

**Integration Test Commands** (exit 0 bei Erfolg):
- `cd ui && npm test` — Backend-Unit-Tests inkl. neuer `spec-graph`-Tests (Topo-Sort, Zyklen, Status) und Persistenz-Read-Back.
- `cd ui && npm run lint` — keine Fehler, TS strict (kein `any`).
- `cd ui && npm run build:backend` — Backend kompiliert.
- `cd ui/frontend && npm run build` — Frontend kompiliert (neue `aos-*`-Komponenten).

**End-to-End-Szenarien:**
1. Priorität einer Spec auf P0 setzen → Badge aktualisiert sich, Sortier-Modus "Priorität" ordnet korrekt, Persistenz in kanban.json überlebt Reload.
2. Spec B als "blockiert durch" Spec A setzen → B zeigt 🔒 + "blockiert durch A"; Reihenfolge-Ansicht listet A vor B; Versuch A→B→A wird mit Zyklus-Fehler abgelehnt.
3. Neue Spec anlegen → KI-Analyse schlägt Kanten gegen alle aktiven Specs vor (mit Konfidenz); Confirm schreibt `blockedBy` in die jeweils abhängige Spec; "⚠ bitte prüfen" bei niedriger Konfidenz.

**MCP/Browser-Tests:** Playwright nicht erforderlich (Requires MCP: no) — UI-Verhalten wird über Build + manuelle/Vitest-Abdeckung verifiziert.
