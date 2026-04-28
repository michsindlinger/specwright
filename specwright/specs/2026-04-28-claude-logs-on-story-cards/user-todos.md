# User-Todos: Claude-Code-Logs auf Story-Cards

> Generiert am 2026-04-28
> Spec: specwright/specs/2026-04-28-claude-logs-on-story-cards/

## Zweck

Diese Checkliste enthält Aufgaben, die **manuell vom Benutzer** erledigt werden müssen, damit das Feature vollständig funktioniert. Diese Aufgaben konnten während der Implementierung nicht automatisch durchgeführt werden.

---

## Optional (Empfohlen)

- [ ] **Playwright-Setup für echte E2E-Smoke-Tests**
  - Beschreibung: Plan-Section 3.5 sah einen Playwright-Smoke vor (Auto-Mode mit `maxConcurrent=2`, 2 Cards expandieren, Reload, Panels collapsed). Im `ui/`-Workspace ist Playwright nicht installiert; CLOG-005 hat die Szenarien stattdessen auf Komponenten-Ebene mit happy-dom abgedeckt (`ui/tests/unit/clog-005-e2e-edge-cases.test.ts`).
  - Grund: Echte Browser-E2E würde das Reload-Verhalten und Auto-Mode-Worker-Lifecycle direkt validieren, statt es zu simulieren.
  - Hinweis: `npm i -D @playwright/test` im `ui/`-Workspace, danach `tests/e2e/clog-smoke.spec.ts` mit Server-Start (`dev:backend` + `dev:ui`) anlegen.

---

## Notizen

Alle Edge-Cases aus Plan-Section 3.6 (a/b/c) sind im happy-dom-Test abgedeckt; Race- und Reconnect-Verhalten ebenfalls.
