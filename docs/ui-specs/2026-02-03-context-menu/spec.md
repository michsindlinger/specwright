# Specification: Context Menu

> Spec ID: 2026-02-03-context-menu
> Created: 2026-02-03
> Status: Ready for Execution

---

## Overview

Globales Context Menu (Rechtsklick-Menü) für die Agent OS Web UI, das Schnellzugriff auf häufig genutzte Workflows bietet: Neue Spec erstellen, Bug erstellen, TODO erstellen und Story zu bestehender Spec hinzufügen.

## User Stories

| ID | Title | Type | Priority | Dependencies |
|----|-------|------|----------|--------------|
| CTX-001 | Context Menu Component | Frontend | High | None |
| CTX-002 | Global Event Handler | Frontend | High | CTX-001 |
| CTX-003 | Generic Workflow Modal | Frontend | High | None |
| CTX-004 | Spec Selector Component | Frontend | High | None |
| CTX-005 | Add Story Flow Integration | Frontend | High | CTX-003, CTX-004 |
| CTX-006 | Integration & Styling | Frontend | Medium | CTX-001, CTX-002, CTX-003, CTX-004, CTX-005 |

## Spec Scope

**Included:**
- Globales Context Menu mit 4 Menüpunkten (Rechtsklick überall)
- Modal mit Workflow-Karte für jeden Menüpunkt
- Spec-Auswahl mit Suchfunktion für "Story zu Spec hinzufügen"
- Bestätigungsdialog bei ungespeicherten Änderungen (nur wenn Eingaben vorhanden)
- CSS Styling passend zum Moltbot Dark Theme

## Out of Scope

- Tastaturkürzel für Context Menu
- Kontextabhängige Menüpunkte (andere Optionen auf Story-Cards)
- Anpassbare Menüpunkte (User kann keine eigenen hinzufügen)
- Rechtsklick auf nativen Browser-Content

## Expected Deliverable

Nach erfolgreicher Implementierung:
1. User kann überall in der Anwendung rechtsklicken und sieht Context Menu
2. Auswahl von "Neue Spec erstellen" öffnet Modal mit create-spec Workflow
3. Auswahl von "Bug erstellen" öffnet Modal mit add-bug Workflow
4. Auswahl von "TODO erstellen" öffnet Modal mit add-todo Workflow
5. Auswahl von "Story zu Spec hinzufügen" zeigt Spec-Auswahl, dann add-story Workflow
6. ESC oder Click außerhalb schließt Context Menu/Modal
7. Bestätigung bei Abbruch nur wenn Eingaben vorhanden

## Integration Requirements

**Integration Type:** Frontend-only

**Integration Test Commands:**
```bash
# Build passes
cd agent-os-ui && npm run build

# Lint passes
cd agent-os-ui && npm run lint

# TypeScript compiles without errors
cd agent-os-ui && npx tsc --noEmit
```

**End-to-End Scenarios:**
1. Rechtsklick → Context Menu erscheint → Klick auf "Neue Spec" → Modal öffnet
2. Context Menu → "Story zu Spec" → Spec auswählen → Workflow starten
3. Modal mit Eingabe → ESC → Bestätigungsdialog erscheint

---

*Spec created with Agent OS /create-spec v3.3*
