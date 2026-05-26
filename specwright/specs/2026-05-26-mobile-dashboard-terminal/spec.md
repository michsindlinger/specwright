# Spec: Mobile View für Dashboard, Cloud Terminal und Spec-Detail

> **Created:** 2026-05-26
> **Status:** Ready for execution
> **Mode:** V2 Lean
> **Tier:** L (22 Business-Tasks)
> **Prefix:** MOB

## Overview

Mobile-responsives Layout für Specwright UI auf Viewport `<768px` (Phone). Drei Top-Level-Views erhalten `renderMobile()`-Branches: Dashboard (Variante A · Standard), Cloud Terminal (Variante D · Main) und Spec-Detail (eigene Mobile-Konzeption mit Story-Sheet). Realisierung als additive Code-Erweiterung — Desktop-Pfade bleiben unverändert.

## Task List

Siehe `kanban.json` für die kanonische Liste. Kurzfassung der 22 Business-Tasks plus 2 System-Tasks (kein 998, da Frontend-only):

| ID | Title |
|----|-------|
| MOB-001 | Mobile Design-Tokens & `.touch-target` Utility |
| MOB-002 | `MobileBreakpointController` (Lit ReactiveController) |
| MOB-003 | `aos-mobile-sheet` Primitiv (Bottom/Top/Side, A11y) |
| MOB-004 | `aos-mobile-top-bar` (Hamburger, Logo, Bell, Avatar) |
| MOB-005 | `aos-mobile-project-scroller` + `aos-mobile-project-chip` + `aos-mobile-branch-row` |
| MOB-006 | `aos-mobile-segmented` (Specs/Backlog/Docs Tabs) |
| MOB-007 | `aos-mobile-bottom-nav` (Home/Specs/FAB/Terminal/Me) |
| MOB-008 | `focus-strip.derive.ts` Pure-Function + Vitest |
| MOB-009 | `aos-mobile-focus-strip` + `aos-mobile-focus-card` |
| MOB-010 | `aos-mobile-project-card` |
| MOB-011 | `aos-mobile-terminal-pill` (Floating CTA) |
| MOB-012 | `aos-mobile-side-drawer` (Hamburger-Drawer) |
| MOB-013 | `aos-mobile-action-sheet` (FAB → New Spec/Bug/Todo) |
| MOB-014 | `aos-mobile-terminal-header` |
| MOB-015 | `aos-mobile-session-tabs` + `aos-mobile-connection-bar` |
| MOB-016 | `aos-mobile-quick-replies` + `parseNumberedOptions` |
| MOB-017 | `aos-mobile-input-bar-idle` (Mic disabled) |
| MOB-018 | `aos-claude-log-panel` Mobile-Padding (CSS-only) |
| MOB-019 | `aos-mobile-story-list` + `aos-mobile-story-card` |
| MOB-020 | `aos-mobile-story-sheet` |
| MOB-021 | `aos-dashboard-view` `renderMobile()` + Wiring |
| MOB-022 | `aos-cloud-terminal-sidebar` Mobile-Branch + Resize-Close |
| MOB-997 | Code Review (System) |
| MOB-999 | Finalize PR (System) |

## Spec Scope

- Mobile-Layout für **`aos-dashboard-view`** (Variante A) inkl. Top-Bar, ProjectScroller, BranchRow, Segmented Tabs, Focus-Strip, ProjectCards, BottomNav mit FAB, Floating Terminal-Pill, Side-Drawer.
- Mobile-Layout für **`aos-cloud-terminal-sidebar`** (Variante D) inkl. Header, SessionTabs, ConnectionBar, Output-Padding, QuickReplies, InputBar-Idle mit deaktiviertem Mic.
- Mobile-Layout für **Spec-Detail** (eigene Konzeption) inkl. vertikaler Story-Liste und Bottom-Sheet für Story-Details.
- Reaktive Breakpoint-Detection via `MobileBreakpointController` und Generic `aos-mobile-sheet`-Primitiv.
- 22 neue `aos-mobile-*` Components unter `ui/frontend/src/components/mobile/` und `ui/frontend/src/components/mobile/terminal/`.
- Additive Mobile-Tokens in `theme.css`, `.touch-target` Utility-Klasse.
- Vitest-Unit-Tests für `focus-strip.derive.ts` und `parseNumberedOptions`.

## Out of Scope

- Variante B (Compact list), C (Today), E (Voice listening), F (Sessions list).
- Voice-Push-to-talk / Live-Transcript-Integration im Terminal (Mic-Button vorhanden aber disabled).
- Bell-Notifications-System (Icon dekorativ, gleicher Toast wie Mic).
- Mobile Kanban-Board mit Drag&Drop (Status-Änderungen via Story-Sheet Action-Sheet).
- Mobile Settings/Team/Chat-View (separater Spec).
- Native-App-Wrapper, PWA-Manifest, Push-Notifications.
- Separate `/m/*`-Routing — Same URL, same Component.
- Backend-Änderungen jeder Art.

## Integration Requirements

- **Integration Type:** Frontend-only.
- **Integration Test Commands** (System-Story 998 NICHT erforderlich da Frontend-only — Smoke-Validierung pro Story über DoD-Items):
  - `cd ui/frontend && npm run build` → muss ohne Fehler durchlaufen
  - `cd ui && npm test -- focus-strip.derive` → Unit-Tests grün
  - `cd ui && npm test -- parse-numbered-options` → Unit-Tests grün
  - `cd ui/frontend && npm run lint` → keine Fehler
- **End-to-End Smoke (manuell oder via Playwright optional):**
  - Browser-Viewport auf `375x812` (iPhone) → Dashboard zeigt Mobile-Layout, Bottom-Nav klickbar, ProjectScroller scrollbar.
  - Resize auf `1280x800` → Desktop-Layout, keine Mobile-Overlays übrig.
  - Tap auf Cloud Terminal Pill → Mobile-Terminal-Full-Screen erscheint.
  - Tap auf Mic in Terminal → Toast "Voice coming soon" sichtbar.

## User-Action Tasks

Keine. Alle 22 Business-Tasks und beide System-Tasks sind autonom durch AI ausführbar — keine externen Credentials, keine 3rd-Party-UI-Konfigurationen, keine manuellen Setup-Schritte erforderlich.

## Notes

- **Dependency-Bottleneck:** MOB-021 (Dashboard-Wiring) hängt von ~12 Vorgänger-Tasks ab; MOB-022 (Terminal-Wiring) von 6. Erst nach Abschluss dieser Wiring-Tasks ist das End-to-End-Smoke ausführbar.
- **CSS-only Änderung an `aos-claude-log-panel`** (MOB-018) ist minimal und unkritisch, kann parallel zur Terminal-Komponenten-Entwicklung passieren.
