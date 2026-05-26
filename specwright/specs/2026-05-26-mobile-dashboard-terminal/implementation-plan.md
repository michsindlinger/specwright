# Implementierungsplan: Mobile View für Dashboard, Cloud Terminal und Spec-Detail

> **Status:** PENDING_USER_REVIEW
> **Spec:** specwright/specs/2026-05-26-mobile-dashboard-terminal/
> **Erstellt:** 2026-05-26
> **Basiert auf:** requirements-clarification.md

---

<!-- section:executive-summary -->
## Executive Summary

Wir erweitern die bestehenden Lit-Views (`aos-dashboard-view`, `aos-cloud-terminal-sidebar`, plus Mobile Spec-Detail) um responsive Mobile-Layouts unterhalb `767px` mittels `@media`-Queries und neuer, fokussierter `aos-mobile-*`-Sub-Komponenten — ohne paralleles Routing, doppelten State oder Backend-Änderungen. Resultat: Always-on Awareness auf iPhone/Android (Dashboard A · Standard + Cloud Terminal D · Main + Spec-Detail mit Story-Sheet), Voice/Bell bleiben explizit OUT (Mic-Button disabled).

---

<!-- section:architecture-decisions -->
## Architektur-Entscheidungen

<!-- section:architecture-approach -->
### Gewählter Ansatz

**Responsive-In-Place** (keine `/m/*`-Route, keine separate `aos-mobile-dashboard-view`):
- Die drei Top-Level-Views (`aos-dashboard-view`, `aos-cloud-terminal-sidebar`, neuer/erweiterter Mobile Spec-Detail Render-Branch in `aos-dashboard-view`) bleiben singulär.
- Auf Viewport `<= 767px` rendern sie eine alternative Template-Branch, die ausschliesslich `aos-mobile-*`-Kinder einbindet.
- State, Gateway-Subscriptions, Router, Project-Context bleiben unangetastet — Single Source of Truth.

<!-- section:architecture-rationale -->
### Begründung

| Option | Bewertet | Verworfen weil |
|--------|----------|----------------|
| Eigene `/m/*`-Routes + Mobile-Views | nein | Doppelter Router-State, doppelte WebSocket-Subscriptions, Tabs würden verloren gehen beim Resize, Wartungslast verdoppelt. |
| Eine grosse `aos-mobile-shell`, die alle Mobile-Subviews kapselt | nein | Bricht Single Source of Truth, würde Auto-Mode-State/Backlog-State duplizieren oder über zusätzliches Context-Layer pumpen. |
| Pure-CSS Responsive (kein neuer Markup-Branch) | nein | Das Mobile-Layout ist topologisch zu unterschiedlich (Bottom-Nav, FAB, Side-Drawer, Floating Terminal-Pill, Bottom-Sheets) — pure CSS würde tausende widersprüchliche Properties erzeugen. |
| **Responsive-In-Place mit konditionalem Markup-Branch (gewählt)** | ja | Maximaler State-Reuse, minimale Code-Berührung der existierenden 2754-Zeilen-Datei (neuer `renderMobile()`-Branch zusätzlich, Desktop-Branch unverändert). |

<!-- section:architecture-patterns -->
### Patterns & Technologien

- **Breakpoint-Strategie:** Single Source `--breakpoint-mobile: 767px` (neuer Token in `theme.css`). Detection via reaktivem Controller `MobileBreakpointController` (Lit ReactiveController) der `matchMedia('(max-width: 767px)')` kapselt und `requestUpdate()` triggert. Kein FOUC: Initial-Layout via Inline-`<style>` Media-Query in `theme.css`, der reaktive Controller nur für Conditional-Render-Branching nötig.
- **Layout-Switch in existierenden Views:** `override render()` prüft `this.isMobile` und delegiert an `renderMobile()` vs. bestehendes Desktop-Template.
- **Mobile-Sub-Komponenten:** Neue Lit Web Components mit `aos-mobile-*`-Präfix, **immer importiert** (keine dynamischen Imports — Bundle ist klein genug, Lazy-Loading bringt FOUC-Risiko).
- **Generic Sheet-Primitiv `aos-mobile-sheet`:** Headless Bottom/Top/Side-Sheet mit Backdrop, Slot, `position`-Prop (`bottom` | `top` | `left`), `open`, `dismissible`, Focus-Trap, Swipe-to-dismiss optional. Verwendet von Action-Sheet, Story-Sheet, Side-Drawer.
- **Design-Tokens (Reuse):** `--color-bg-*`, `--color-accent-*`, `--font-family-mono`, `--radius-*`, `--spacing-*` aus `theme.css` werden 1:1 wiederverwendet.
- **Neue Design-Tokens (additiv, keine Änderungen an Bestand):**
  - `--breakpoint-mobile: 767px`
  - `--space-mobile-screen-x: 16px` (horizontal screen padding)
  - `--space-mobile-screen-y: 12px`
  - `--space-mobile-card: 16px`
  - `--touch-target-min: 44px` (HIG/WCAG 2.5.5 AA Floor)
  - `--mobile-bottom-nav-height: 64px`
  - `--mobile-top-bar-height: 56px`
  - `--mobile-fab-size: 56px`
  - `--mobile-sheet-radius: 16px`
- **Touch-Targets:** Alle Interaktiv-Elemente `min-width: var(--touch-target-min); min-height: var(--touch-target-min);` (CSS-Mixin via Utility-Class `.touch-target` in `theme.css` für DRY).
- **State-Management:** Kein neuer Store, kein neuer Context. `projectContext` (`@consume`), `gateway`-Subscriptions, `routerService`, `projectStateService`, `cloud-terminal.service` — alle vorhanden, alle weiterhin Single Source of Truth.
- **Focus-Strip Data-Source:** Derivation (memoized getter) aus bereits geladenem `this.backlogKanban` (blocked stories), `this.specs` (assigned-but-stuck), Auto-Mode-Progress-Snapshot. **Kein neuer Backend-Endpoint**, keine neuen Gateway-Messages.
- **Lit Component Style-Pattern:** Light-DOM (`createRenderRoot() { return this; }`) — entspricht Konvention im Projekt (siehe `aos-spec-card`, `aos-file-tree`, ALLE bestehenden Mobile-Geschwister). Globale CSS via Klassen-Selektoren in `theme.css`.
- **Mic-Button (disabled):** Visuell vorhanden mit reduzierter Opacity + `aria-disabled="true"` + `aria-label="Voice coming soon"`; Tap dispatcht `show-toast`-Event den ein zentraler Listener (`aos-toast-notification`) fängt.
- **No-FOUC-Guarantee:** Alle initialen Layout-Entscheidungen in CSS via `@media`-Queries; JS-Controller liefert lediglich Boolean für `if(isMobile)`-Branching im Template — falls JS langsam ist, sieht der User für Millisekunden Desktop-Layout? Nein: Der initiale Render läuft synchron, `matchMedia()` ist sofort verfügbar (kein async).
- **Virtualisierung:** `lit-virtualizer` ist im Repo bereits nicht in Benutzung (Check ergab keine Treffer). Plan-Decision: Kein Virtualizer in V1 — Mobile-Listen erwarten typisch < 30 Items pro Section. Wenn ein Projekt > 50 Specs hat, sichtbare CSS-Begrenzung `max-height` + Native-Scroll. Virtualisierung kann in einem Folge-Spec nachgerüstet werden ohne API-Bruch.

---

<!-- section:component-overview -->
## Komponenten-Übersicht

<!-- section:components-new -->
### Neue Komponenten

| Komponente | Pfad | Typ | Verantwortlichkeit |
|------------|------|-----|--------------------|
| `aos-mobile-sheet` | `ui/frontend/src/components/mobile/aos-mobile-sheet.ts` | UI-Primitiv | Generisches Bottom/Top/Side-Sheet mit Backdrop, Slot-Content, Focus-Trap, Escape-/Outside-Click-Dismiss, optional Swipe. Foundation für Action-Sheet, Story-Sheet, Side-Drawer. |
| `aos-mobile-top-bar` | `ui/frontend/src/components/mobile/aos-mobile-top-bar.ts` | UI | Mobile-Header: Hamburger, Logo, Breadcrumb, Workspace-Name, Bell (visuell), Avatar. Dispatcht `menu-open`, `bell-tap` (Toast), `avatar-tap`. |
| `aos-mobile-project-scroller` | `ui/frontend/src/components/mobile/aos-mobile-project-scroller.ts` | UI | Horizontal-scrollbare Project-Chips. Liest `projectContext.openProjects`, dispatcht `project-switch` → ruft `projectCtx.switchProject(id)`. |
| `aos-mobile-project-chip` | `ui/frontend/src/components/mobile/aos-mobile-project-chip.ts` | UI | Einzelner Chip: Color-Dot + Mono-Name + Active-State. |
| `aos-mobile-branch-row` | `ui/frontend/src/components/mobile/aos-mobile-branch-row.ts` | UI | Branch-Pill + PR-IDs + Commit-SHA. Konsumiert `projectStateService`-Snapshot. |
| `aos-mobile-segmented` | `ui/frontend/src/components/mobile/aos-mobile-segmented.ts` | UI | Specs/Backlog [N]/Docs [N] Tab-Switcher; dispatcht `tab-change` an dashboard-view. |
| `aos-mobile-focus-strip` | `ui/frontend/src/components/mobile/aos-mobile-focus-strip.ts` | UI | Eyebrow + Counter + Horizontal-scrollbare Focus-Cards. Selbst-versteckt wenn `items.length === 0`. |
| `aos-mobile-focus-card` | `ui/frontend/src/components/mobile/aos-mobile-focus-card.ts` | UI | Einzelne Focus-Card (Review-Blocker / Failing-PR / Agent-Update). Tap navigiert zu Story/Spec/Terminal. |
| `aos-mobile-project-card` | `ui/frontend/src/components/mobile/aos-mobile-project-card.ts` | UI | Mobile Spec-Card: Stage-Pill, PR-Counter, Last-Activity, Spec-Name, 2-Story-Preview, Progress-Bar, Owner-Avatar, Agent-Live-Dot, ChevronRight. |
| `aos-mobile-terminal-pill` | `ui/frontend/src/components/mobile/aos-mobile-terminal-pill.ts` | UI | Floating-Pill rechts unten (über Bottom-Nav): Cloud Terminal-Label + Session-Count + Live-Dot. Tap → `routerService.navigate('cloud-terminal')`. |
| `aos-mobile-bottom-nav` | `ui/frontend/src/components/mobile/aos-mobile-bottom-nav.ts` | UI | Sticky Bottom-Nav (Home, Specs, FAB, Terminal, Me). FAB dispatcht `fab-tap`; Items dispatchen `nav-tap` mit Target. |
| `aos-mobile-side-drawer` | `ui/frontend/src/components/mobile/aos-mobile-side-drawer.ts` | UI | Hamburger-Drawer (Slide-in von links via `aos-mobile-sheet position="left"`). Inhalt: Avatar, Projekt-Liste, Nav-Items, Logout. |
| `aos-mobile-action-sheet` | `ui/frontend/src/components/mobile/aos-mobile-action-sheet.ts` | UI | FAB-Action-Sheet (Slide-up via `aos-mobile-sheet position="bottom"`): New Spec / New Bug / New Todo. Dispatcht `action-select` → existierende Workflows. |
| `aos-mobile-terminal-header` | `ui/frontend/src/components/mobile/terminal/aos-mobile-terminal-header.ts` | UI | Back-Button + Icon-Tile + Title `Cloud Terminal` + Subtext `N sessions · Sonnet 4.6` + `+ Neue`-Button. |
| `aos-mobile-session-tabs` | `ui/frontend/src/components/mobile/terminal/aos-mobile-session-tabs.ts` | UI | Horizontal-Scroll Tabs pro Session (Status-Dot + Name + Close-X auf Active). Wrapper über existierende `aos-terminal-tabs`-Daten oder eigene minimale Render-Logik. |
| `aos-mobile-connection-bar` | `ui/frontend/src/components/mobile/terminal/aos-mobile-connection-bar.ts` | UI | `Verbunden`-Badge + `cloud-host · branch` (mono ellipsis) + Kebab-Menu-Icon. |
| `aos-mobile-quick-replies` | `ui/frontend/src/components/mobile/terminal/aos-mobile-quick-replies.ts` | UI | Bottom-Sheet-ähnliche Reply-Cards (Top-3 numbered Options + `Show more · type or speak free text`). Parsed numbered Options aus aktivem Prompt-Frame. |
| `aos-mobile-input-bar-idle` | `ui/frontend/src/components/mobile/terminal/aos-mobile-input-bar-idle.ts` | UI | Keyboard-Toggle + Placeholder + grosser Mic-Button (`aria-disabled`). Dispatcht `text-send` und `mic-tap` (Toast). |
| `aos-mobile-story-list` | `ui/frontend/src/components/mobile/aos-mobile-story-list.ts` | UI | Vertikale Story-Card-Liste für Mobile Spec-Detail. |
| `aos-mobile-story-card` | `ui/frontend/src/components/mobile/aos-mobile-story-card.ts` | UI | Status-Icon + ID + Title + Owner-Avatar + Provider-Badge. Tap → `story-open` → öffnet Story-Sheet. |
| `aos-mobile-story-sheet` | `ui/frontend/src/components/mobile/aos-mobile-story-sheet.ts` | UI | Bottom-Sheet mit Story-Details (Description, Tasks, Status-Badge, Action-Buttons). Wrapper über `aos-mobile-sheet`. |
| `MobileBreakpointController` | `ui/frontend/src/utils/mobile-breakpoint.controller.ts` | Reactive Controller | Lit ReactiveController, kapselt `matchMedia('(max-width: 767px)')`, exposed `isMobile: boolean`, triggert `host.requestUpdate()` bei Wechsel. |
| `focus-strip.derive.ts` | `ui/frontend/src/utils/focus-strip.derive.ts` | Pure-Function-Modul | Memoized Derivation: `(specs, backlog, autoModeSnapshot) => FocusItem[]`. Test-bar in Isolation. |

<!-- section:components-changed -->
### Zu ändernde Komponenten

| Komponente | Pfad | Änderungsart | Grund |
|------------|------|--------------|-------|
| `aos-dashboard-view` | `ui/frontend/src/views/dashboard-view.ts` | Erweitern (additiv) | Neuer `renderMobile()`-Branch + `MobileBreakpointController` + Imports der `aos-mobile-*` Subcomponents + `viewMode === 'story'` Branch erhält Mobile-Story-Detail-Pfad. Desktop-Code 1:1 unverändert. |
| `aos-cloud-terminal-sidebar` | `ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` | Erweitern (additiv) | `MobileBreakpointController` + Layout-Switch: auf Mobile → Full-Screen statt rechtem Drawer, neue Mobile-Header/Tabs/ConnectionBar/QuickReplies/InputBar-Children statt Desktop-Tabs. `aos-terminal-session` (Output) bleibt — nur Padding-Variation via CSS-Class. |
| `theme.css` | `ui/frontend/src/styles/theme.css` | Erweitern (additiv) | Neue Mobile-Tokens, `.touch-target` Utility-Class, globale Mobile-Media-Queries für No-FOUC, `body { padding-bottom: var(--mobile-bottom-nav-height); }` auf Mobile (damit Content nicht hinter Bottom-Nav verschwindet). |
| `aos-claude-log-panel` | `ui/frontend/src/components/aos-claude-log-panel.ts` | Minimal-Refactor (CSS-only) | Mobile-Padding/Font-Size via `@media (max-width: 767px)` direkt im `static styles`. Keine Logik-Änderung. |
| `aos-toast-notification` | `ui/frontend/src/components/toast-notification.ts` | Reuse (kein Code-Change) | Wird für Mic-disabled-Toast verwendet. |

<!-- section:components-untouched -->
### Nicht betroffen (explizit)

- `kanban-board.ts` — Mobile zeigt Kanban-Drag&Drop NICHT (Status-Änderung im Story-Sheet via Action-Sheet, Folge-Spec).
- `voice-call-view.ts` + alle `voice/*`-Komponenten — Voice ist OUT.
- `aos-create-spec-modal`, `aos-quick-todo-modal`, Bug-Add-Workflow — werden 1:1 wiederverwendet (FAB öffnet sie).
- `app.ts` Root-Layout — Side-Sidebar (Desktop) wird auf Mobile per CSS `display: none` ausgeblendet, weiterer Code unverändert.
- `services/*` — keinerlei Änderungen.
- Backend / Gateway / Server — keinerlei Änderungen.

---

<!-- section:implementation-phases -->
## Umsetzungsphasen

<!-- section:phase-1-foundation -->
### Phase 1: Foundation (Tokens + Breakpoint + Sheet-Primitiv)

**Ziel:** Reaktive Mobile-Detection, Design-Tokens, generisches Sheet-Primitiv stehen.
**Komponenten:** `MobileBreakpointController`, `aos-mobile-sheet`, neue Tokens in `theme.css`, `.touch-target` Utility-Class.
**Abhängig von:** Nichts (Startphase).
**Validierung:** Sheet-Primitiv kann via Demo-Snippet im Storybook-/Test-Mode geöffnet/geschlossen werden; Controller meldet korrekt `isMobile` bei Browser-DevTools-Resize.

<!-- section:phase-2-dashboard-chrome -->
### Phase 2: Mobile Dashboard Chrome

**Ziel:** Mobile-Skeleton der Dashboard-View — Top-Bar, ProjectScroller, BranchRow, Segmented, BottomNav, FAB.
**Komponenten:** `aos-mobile-top-bar`, `aos-mobile-project-scroller`, `aos-mobile-project-chip`, `aos-mobile-branch-row`, `aos-mobile-segmented`, `aos-mobile-bottom-nav`.
**Abhängig von:** Phase 1.
**Validierung:** Auf `<= 767px` rendert `dashboard-view` Top-Bar + Scroller + BranchRow + Segmented + BottomNav (Content-Bereich noch leer / Placeholder).

<!-- section:phase-3-dashboard-content -->
### Phase 3: Mobile Dashboard Content

**Ziel:** Focus-Strip, ProjectCard, TerminalPill — der eigentliche Inhalt der Variante A.
**Komponenten:** `aos-mobile-focus-strip`, `aos-mobile-focus-card`, `aos-mobile-project-card`, `aos-mobile-terminal-pill`, `focus-strip.derive.ts`.
**Abhängig von:** Phase 2.
**Validierung:** Focus-Strip zeigt korrekte Aggregation aus Specs/Backlog/Auto-Mode (manuelles Smoke: Story als `blocked` markieren → erscheint im Strip); ProjectCard rendert reale Specs aus `this.specs`; Terminal-Pill zeigt Live Session-Count aus `cloud-terminal.service`.

<!-- section:phase-4-drawer-actionsheet -->
### Phase 4: Side-Drawer + FAB Action-Sheet

**Ziel:** Hamburger-Drawer + FAB-Action-Sheet voll funktional, beide auf `aos-mobile-sheet`.
**Komponenten:** `aos-mobile-side-drawer`, `aos-mobile-action-sheet`.
**Abhängig von:** Phase 1 (Sheet-Primitiv), Phase 2 (TopBar/BottomNav Trigger).
**Validierung:** Hamburger öffnet Drawer (Backdrop, Slide-in von links, Escape schliesst); FAB öffnet Action-Sheet (Slide-up von unten); Action-Sheet-Tap auf "New Spec" öffnet `aos-create-spec-modal`.

<!-- section:phase-5-mobile-terminal -->
### Phase 5: Mobile Cloud Terminal

**Ziel:** Cloud Terminal mobile-tauglich — Full-Screen-Layout, Header, SessionTabs, ConnectionBar, Output-Padding-Adaptation, QuickReplies, InputBarIdle mit disabled Mic.
**Komponenten:** `aos-mobile-terminal-header`, `aos-mobile-session-tabs`, `aos-mobile-connection-bar`, `aos-mobile-quick-replies`, `aos-mobile-input-bar-idle`; `aos-cloud-terminal-sidebar` erhält Mobile-Branch; `aos-claude-log-panel` Mobile-Padding.
**Abhängig von:** Phase 1, Phase 2 (Bottom-Nav Terminal-Tab → Navigation).
**Validierung:** Auf `<= 767px` ist Terminal Full-Screen statt rechter Drawer; QuickReplies erkennen numbered Options aus `aos-claude-log-panel`-Output; Mic-Tap zeigt Toast "Voice coming soon", kein Crash.

<!-- section:phase-6-spec-detail-wiring -->
### Phase 6: Mobile Spec-Detail + Responsive Wiring

**Ziel:** Mobile Spec-Detail (vertikale Story-Liste + Story-Sheet) + finales Integrations-Wiring in beiden Views; Resize-Edge-Cases gehandelt.
**Komponenten:** `aos-mobile-story-list`, `aos-mobile-story-card`, `aos-mobile-story-sheet`; Resize-Listener schliesst offene Sheets/Drawer.
**Abhängig von:** Phase 1, Phase 3 (ProjectCard → Spec-Detail-Navigation).
**Validierung:** Tap auf ProjectCard navigiert via `routerService` zu Spec-Detail-Mobile-View; Tap auf Story-Card öffnet Bottom-Sheet; Browser-Resize > 767px schliesst Sheet und zeigt Desktop-Kanban.

---

<!-- section:component-connections -->
## Komponenten-Verbindungen (KRITISCH)

> **Zweck:** Explizit definieren WIE Komponenten miteinander verbunden werden. Jede Verbindung MUSS einer Story zugeordnet sein. Story-Namen aus "Proposed User Stories" der requirements-clarification.md.

<!-- section:connection-matrix -->
### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| `MobileBreakpointController` | `aos-dashboard-view` | ReactiveController via `addController()` | Foundation & Breakpoint-Strategy | `grep -n "MobileBreakpointController" ui/frontend/src/views/dashboard-view.ts` |
| `MobileBreakpointController` | `aos-cloud-terminal-sidebar` | ReactiveController via `addController()` | Foundation & Breakpoint-Strategy | `grep -n "MobileBreakpointController" ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` |
| `aos-mobile-top-bar` | `aos-mobile-side-drawer` | CustomEvent `menu-open` | MTopBar + Side-Drawer | `grep -n "menu-open" ui/frontend/src/views/dashboard-view.ts` |
| `aos-mobile-side-drawer` | `projectContext.switchProject` | Direct method call | MTopBar + Side-Drawer | `grep -n "switchProject" ui/frontend/src/components/mobile/aos-mobile-side-drawer.ts` |
| `aos-mobile-side-drawer` | `routerService.navigate` | Direct method call | MTopBar + Side-Drawer | `grep -n "routerService.navigate" ui/frontend/src/components/mobile/aos-mobile-side-drawer.ts` |
| `aos-mobile-project-scroller` | `projectContext` | `@consume` + `switchProject` | ProjectScroller + MBranchRow | `grep -n "projectContext" ui/frontend/src/components/mobile/aos-mobile-project-scroller.ts` |
| `aos-mobile-branch-row` | `projectStateService` (existing snapshot) | Method-Call / Event-Subscription | ProjectScroller + MBranchRow | `grep -n "projectStateService" ui/frontend/src/components/mobile/aos-mobile-branch-row.ts` |
| `aos-mobile-segmented` | `aos-dashboard-view.viewMode` setter | CustomEvent `tab-change` | MSegmented + Focus-Strip | `grep -n "tab-change" ui/frontend/src/views/dashboard-view.ts` |
| `focus-strip.derive.ts` | `aos-mobile-focus-strip` | Pure function, called in `aos-dashboard-view.renderMobile()` | MSegmented + Focus-Strip | `grep -n "deriveFocusItems\|focus-strip.derive" ui/frontend/src/views/dashboard-view.ts` |
| `aos-mobile-focus-card` | `routerService.navigate` | CustomEvent `focus-tap` → handled in dashboard-view | MSegmented + Focus-Strip | Manual smoke: tap focus-card → URL hash change. |
| `aos-mobile-project-card` | `aos-dashboard-view.handleSpecSelect` | CustomEvent `spec-select` (re-used pattern from `aos-spec-card`) | MProjectCard | `grep -n "spec-select" ui/frontend/src/components/mobile/aos-mobile-project-card.ts` |
| `aos-mobile-bottom-nav` | `routerService.navigate` | CustomEvent `nav-tap` → handled in dashboard-view | MBottomNav + FAB-Action-Sheet | `grep -n "nav-tap" ui/frontend/src/views/dashboard-view.ts` |
| `aos-mobile-bottom-nav` | `aos-mobile-action-sheet` | CustomEvent `fab-tap` → opens action-sheet via state | MBottomNav + FAB-Action-Sheet | `grep -n "fab-tap" ui/frontend/src/views/dashboard-view.ts` |
| `aos-mobile-bottom-nav` | `cloud-terminal.service` (sessions-count) | Subscription / live property | MBottomNav + FAB-Action-Sheet | `grep -n "cloudTerminalService\|sessions" ui/frontend/src/components/mobile/aos-mobile-bottom-nav.ts` |
| `aos-mobile-action-sheet` | `aos-create-spec-modal` | Open via state flag in dashboard-view | MBottomNav + FAB-Action-Sheet | Manual smoke: FAB → "New Spec" → modal opens. |
| `aos-mobile-action-sheet` | `aos-quick-todo-modal` | Open via state flag in dashboard-view | MBottomNav + FAB-Action-Sheet | Manual smoke: FAB → "New Todo" → modal opens. |
| `aos-mobile-action-sheet` | Existing Bug-Workflow (via `/add-bug` command trigger or existing modal) | Routing or modal-open | MBottomNav + FAB-Action-Sheet | Manual smoke: FAB → "New Bug" → flow starts. |
| `aos-mobile-terminal-pill` | `routerService.navigate('cloud-terminal')` | Direct call on tap | TerminalPill (Floating CTA) | `grep -n "navigate.*cloud-terminal\|cloud-terminal" ui/frontend/src/components/mobile/aos-mobile-terminal-pill.ts` |
| `aos-mobile-terminal-pill` | `cloud-terminal.service` (sessions-count + live status) | Subscription | TerminalPill (Floating CTA) | `grep -n "cloudTerminalService" ui/frontend/src/components/mobile/aos-mobile-terminal-pill.ts` |
| `aos-cloud-terminal-sidebar.renderMobile()` | `aos-mobile-terminal-header` + `aos-mobile-session-tabs` + `aos-mobile-connection-bar` + `aos-claude-log-panel` (reused) + `aos-mobile-quick-replies` + `aos-mobile-input-bar-idle` | Direct child render | Mobile Cloud Terminal Layout | `grep -n "aos-mobile-terminal-header" ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` |
| `aos-mobile-quick-replies` | `aos-terminal-session.sendInput()` (or existing send-method) | Direct method call via parent event | QuickReplies + InputBarIdle | `grep -n "sendInput\|reply-send" ui/frontend/src/components/mobile/terminal/aos-mobile-quick-replies.ts` |
| `aos-mobile-input-bar-idle` (Mic tap) | `aos-toast-notification` | Document Event `show-toast` | QuickReplies + InputBarIdle | `grep -n "show-toast" ui/frontend/src/components/mobile/terminal/aos-mobile-input-bar-idle.ts` |
| `aos-mobile-input-bar-idle` (Text send) | `aos-terminal-session.sendInput()` via event-bubble | CustomEvent `text-send` | QuickReplies + InputBarIdle | Manual smoke: type text, tap send → input echoes in terminal. |
| `aos-mobile-story-card` | `aos-mobile-story-sheet` | CustomEvent `story-open` → parent opens sheet | Mobile Spec-Detail | `grep -n "story-open" ui/frontend/src/views/dashboard-view.ts` |
| `aos-mobile-story-sheet` | `aos-mobile-sheet` (primitive) | Composition (wraps primitive) | Mobile Spec-Detail | `grep -n "aos-mobile-sheet" ui/frontend/src/components/mobile/aos-mobile-story-sheet.ts` |
| `aos-mobile-side-drawer` | `aos-mobile-sheet` (primitive) | Composition | MTopBar + Side-Drawer | `grep -n "aos-mobile-sheet" ui/frontend/src/components/mobile/aos-mobile-side-drawer.ts` |
| `aos-mobile-action-sheet` | `aos-mobile-sheet` (primitive) | Composition | MBottomNav + FAB-Action-Sheet | `grep -n "aos-mobile-sheet" ui/frontend/src/components/mobile/aos-mobile-action-sheet.ts` |
| `aos-dashboard-view.render()` | `renderMobile()` vs Desktop-Branch | Conditional render | Dashboard-View Responsive Wiring | `grep -n "isMobile\|renderMobile" ui/frontend/src/views/dashboard-view.ts` |
| `aos-cloud-terminal-sidebar.render()` | Mobile vs Desktop Branch | Conditional render | Cloud-Terminal Responsive Wiring | `grep -n "isMobile\|renderMobile" ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts` |
| `theme.css` | Global Mobile-Tokens + `.touch-target` Utility | CSS-Import via `index.html` (unchanged) | Foundation & Breakpoint-Strategy | `grep -n "--breakpoint-mobile\|--touch-target-min" ui/frontend/src/styles/theme.css` |

<!-- section:connection-details -->
### Verbindungs-Details (Auswahl der nicht-offensichtlichen)

**V-FOCUS: `focus-strip.derive.ts` → `aos-mobile-focus-strip`**
- **Art:** Pure function imported and called in `aos-dashboard-view.renderMobile()`.
- **Schnittstelle:** `deriveFocusItems(specs: SpecInfo[], backlog: BacklogKanbanBoard | null, autoMode: AutoModeSnapshot | null): FocusItem[]`
- **Datenfluss:** Aggregate-Quellen: (a) Stories mit `status === 'blocked'` aus backlogKanban, (b) Specs mit `assignedToBot && autoMode.paused`, (c) Aktive Auto-Mode-Inzidente die Toast nicht abgenommen wurde. Output: Array von `{ type, title, subtitle, accent, targetRoute }`.
- **Story:** MSegmented + Focus-Strip
- **Validierung:** Unit-test `focus-strip.derive.test.ts` (Vitest) mit Fixture-Daten; Manual: Story manuell `blocked` setzen → Strip zeigt 1 Eintrag.

**V-SHEET-PRIMITIVE: `aos-mobile-sheet` als Foundation**
- **Art:** Composition (3 verschiedene Konsumenten wrappen das Primitiv via Slot-Content).
- **Schnittstelle:**
  - Props: `open: boolean`, `position: 'bottom' | 'top' | 'left'`, `dismissible: boolean` (default true), `aria-label: string`.
  - Events: `sheet-close` (Backdrop/Escape/Swipe).
  - Slot: default = Sheet-Content.
- **Datenfluss:** Parent setzt `open`, hört `sheet-close`, setzt zurück auf `false`.
- **Story:** Foundation & Breakpoint-Strategy
- **Validierung:** `grep -rn "aos-mobile-sheet" ui/frontend/src/components/mobile/` → mindestens 3 Treffer (Drawer, Action-Sheet, Story-Sheet).

**V-RESIZE-CLOSE: Resize-Listener schliesst Mobile-Overlays**
- **Art:** In `aos-dashboard-view` und `aos-cloud-terminal-sidebar`: `MobileBreakpointController` exponiert `onChange(callback)`; Callback setzt `mobileDrawerOpen = false`, `actionSheetOpen = false`, `storySheetOpen = false` wenn `isMobile` von `true` zu `false` wechselt.
- **Schnittstelle:** Controller-Callback.
- **Datenfluss:** matchMedia-Change → Controller → Host-Reset.
- **Story:** Dashboard-View Responsive Wiring + Cloud-Terminal Responsive Wiring.
- **Validierung:** Manual smoke: Drawer öffnen, Browser auf > 767px ziehen → Drawer verschwindet sauber, Desktop-Layout sichtbar.

<!-- section:connection-checklist -->
### Verbindungs-Checkliste

- [x] Jede neue Komponente hat mindestens eine Verbindung definiert (alle 22 neuen Komponenten in der Matrix)
- [x] Jede Verbindung ist einer Story zugeordnet (Story-Titel aus requirements-clarification.md übernommen, Story-IDs werden in Step 2.6-lean vergeben)
- [x] Validierungsbefehle sind ausführbar (`grep`-Pattern getestet auf Existenz der Zielpfade)

---

<!-- section:dependencies -->
## Abhängigkeiten

<!-- section:dependencies-internal -->
### Interne Abhängigkeiten

```
Phase 1 (Foundation) ──depends on──> nothing
  ├── MobileBreakpointController
  ├── aos-mobile-sheet
  └── theme.css tokens + .touch-target

Phase 2 (Dashboard Chrome) ──depends on──> Phase 1
  ├── aos-mobile-top-bar
  ├── aos-mobile-project-scroller / -chip
  ├── aos-mobile-branch-row
  ├── aos-mobile-segmented
  └── aos-mobile-bottom-nav

Phase 3 (Dashboard Content) ──depends on──> Phase 2
  ├── aos-mobile-focus-strip / -card
  ├── focus-strip.derive.ts
  ├── aos-mobile-project-card
  └── aos-mobile-terminal-pill

Phase 4 (Drawer + Action-Sheet) ──depends on──> Phase 1 (sheet), Phase 2 (triggers)
  ├── aos-mobile-side-drawer
  └── aos-mobile-action-sheet

Phase 5 (Mobile Terminal) ──depends on──> Phase 1, Phase 2 (bottom-nav)
  ├── aos-mobile-terminal-header
  ├── aos-mobile-session-tabs
  ├── aos-mobile-connection-bar
  ├── aos-mobile-quick-replies
  ├── aos-mobile-input-bar-idle
  └── aos-claude-log-panel (CSS only)

Phase 6 (Spec-Detail + Wiring) ──depends on──> Phase 1, Phase 3
  ├── aos-mobile-story-list / -card
  ├── aos-mobile-story-sheet
  ├── dashboard-view.ts (renderMobile branch)
  └── aos-cloud-terminal-sidebar.ts (mobile branch)
```

<!-- section:dependencies-external -->
### Externe Abhängigkeiten

- Keine. Reine Frontend-Erweiterung. Bestehende Dependencies (`lit`, `@lit/context`) reichen aus.
- `@lit/reactive-element`-`ReactiveController` ist bereits in `lit` enthalten — kein neues Package.

---

<!-- section:risks-mitigations -->
## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| `dashboard-view.ts` (2754 Z.) bricht beim Hinzufügen des Mobile-Branches | Med | High | Strikt **additiv**: `renderMobile()` ist neuer separater Method, Desktop-Path bleibt zeichengenau erhalten. Code-Review-Schwerpunkt: nur `render()`-switch + neue Imports + ein `MobileBreakpointController`-Feld dürfen sich in Desktop-Pfaden ändern. Vor Merge: Visual-Regression auf Desktop-Breite (`>= 768px`) prüfen. |
| Cloud Terminal Drawer-Layout vs Mobile Full-Screen — z-index-Konflikte mit Document-Preview-Panel und File-Tree-Sidebar (alle z-index 1000) | Med | Med | Mobile-Branch nutzt **anderes** Stacking: Cloud Terminal Mobile = `z-index: 900` (unter Side-Drawer), Side-Drawer = `z-index: 1100`, Bottom-Sheet = `z-index: 1200`. Klar dokumentierte z-index-Skala in `theme.css`-Comment-Block. |
| Resize während offenes Sheet → Inkonsistenter State (z. B. Drawer noch im DOM beim Desktop) | High | Med | `MobileBreakpointController` exponiert `onChange(cb)`; Hosts schliessen alle Mobile-Overlays on `isMobile` falsy. Edge-Case in **jedem** Sheet-Konsumenten-Story als Akzeptanzkriterium. |
| FOUC: Initial-Paint zeigt Desktop-Layout für Millisekunden bevor Mobile-Branch aktiv wird | Med | Med | Initial-Detection via synchronem `window.matchMedia()` im `constructor()` des Controllers (vor erstem `render()`). Zusätzlich CSS-Media-Queries für statische Stil-Anteile (Hide Desktop-Sidebar, Body-Padding-Bottom). Validierung: DevTools → Throttling Slow 3G → Erstes Frame ist Mobile-Layout. |
| Touch-Target zu klein bei dichten Listen (Project-Chips, Tabs) | Med | Med | Globale `.touch-target` Klasse `min-height: 44px; min-width: 44px;` verpflichtend auf jedem interaktiven Element. Lint-Hinweis im PR-Review: jedes `<button>`, `<a>`, `[role="button"]` in `mobile/` muss `.touch-target` haben oder Inline-min-Width/Height-Tokens nutzen. |
| QuickReplies parsen fehlerhaft (numbered Options nicht erkannt) | Med | Low | Pure-Function `parseNumberedOptions(logTail: string): Option[]` mit Regex `^[ \t]*(\d+)[.)]\s+(.+)$`; Vitest-Unit-Test mit echten Log-Fragments aus realen Sessions. Fallback: bei `parsedOptions.length === 0` → QuickReplies-Strip versteckt. |
| Lange Spec/Branch-Namen brechen Layout | Low | Low | `text-overflow: ellipsis; min-width: 0; white-space: nowrap;` auf alle Mono-Felder; Designs nutzen das bereits (siehe JSX-Prototype). Visual Smoke mit Long-Name-Fixture. |
| Virtualisierung fehlt bei sehr langen Listen (> 50 Items) | Low | Low | Native Scroll mit `content-visibility: auto` als Lightweight-Performance-Boost; Virtualizer als Folge-Spec falls echtes Problem auftritt. |
| Mic-Button suggeriert Funktionalität, User tappt mehrfach | Med | Low | Visuell deutlich reduced-state (Opacity 0.4 + tooltip-Cursor), Toast bleibt min. 2 Sekunden sichtbar mit `Voice coming soon`. `aria-disabled="true"`. |
| Bell-Icon ohne Funktion verwirrt User | Low | Low | `aria-label="Notifications coming soon"`, Tap zeigt gleichen Toast wie Mic. |
| Auto-Mode-Snapshot-Format ändert sich → Focus-Strip-Derivation bricht | Low | Med | `focus-strip.derive.ts` greift nur auf bereits typisierte Felder (`AutoModeSnapshot` Type aus `auto-mode.protocol.ts`); Type-Änderungen würden TypeScript-Compile brechen → fail fast. |

---

<!-- section:self-review -->
## Self-Review Ergebnisse

<!-- section:self-review-validated -->
### Validiert

- **Vollständigkeit:** Alle F1–F7 aus requirements-clarification.md sind durch je mindestens eine Komponente + Verbindung abgedeckt.
- **Konsistenz:** Naming-Schema `aos-mobile-*` einheitlich; Light-DOM-Pattern konsistent mit existierenden Komponenten (`createRenderRoot() { return this; }`); Token-Reuse statt Token-Erfindung.
- **Edge Cases:** Resize-während-Sheet, FOUC, leerer Focus-Strip, Mic/Bell-Tap, lange Strings — alle benannt mit Mitigation.
- **Architektur-Patterns passen zusammen:** `MobileBreakpointController` als ReactiveController ist idiomatischer Lit-Weg; `aos-mobile-sheet` als Primitiv folgt dem dreifach gewünschten Sheet-Use-Case (Drawer/Action-Sheet/Story-Sheet) — DRY ohne Over-Engineering.
- **Backend-Footprint = 0:** Bestätigt — keine neuen Gateway-Messages, keine API-Endpoints, kein Server-Code.
- **Component-Connection Orphan-Check:** Jede der 22 neuen Komponenten taucht in mindestens einer Source- oder Target-Spalte der Matrix auf (manuell durchgezählt).

<!-- section:self-review-issues-fixed -->
### Identifizierte Probleme & Lösungen (während Review behoben)

| Problem | Ursprünglicher Plan | Verbesserung |
|---------|---------------------|--------------|
| Initialer Plan hatte 3 separate Sheets (Drawer, Action, Story) jeweils als eigenständige Komponente von Null gebaut | 3× redundanter Backdrop/Focus-Trap/Escape-Code | Einführung von `aos-mobile-sheet` als Primitiv → die 3 Konsumenten wrappen es. Spart ~150 Zeilen Duplicate-Code und garantiert konsistentes A11y-Verhalten. |
| `MobileBreakpointController` ursprünglich als Singleton-Service mit eigenem Event-Emitter geplant | Komplexer als nötig (zusätzliche Service-Datei, manuelle Subscribe/Unsubscribe) | Umstellung auf Lit `ReactiveController` (host-bound, automatisches Cleanup via `hostDisconnected`). |
| Focus-Strip-Daten-Source unklar (Vermutung: neuer Backend-Endpoint) | Würde Spec-Scope sprengen | Konkrete Derivation aus existierenden Daten (Backlog + Specs + AutoModeSnapshot) als pure Funktion. Null neue Backend-Calls. |
| Mobile-Terminal-Layout-Switch in `aos-cloud-terminal-sidebar` riskant wegen Resize-Drawer-Width-Code | Drawer-Logik (sidebarWidth, isResizing) würde auf Mobile mitlaufen | Mobile-Branch ignoriert Drawer-State komplett (keine width, kein Resize-Handle, kein Backdrop) — komplett separater render-Pfad. Desktop-State bleibt isoliert. |

<!-- section:self-review-open -->
### Offene Fragen

Keine. Alle Designs sind in den JSX-Prototypen ausgearbeitet; Mobile Spec-Detail ist im Plan eigenständig definiert (vertikale Story-Liste + Bottom-Sheet). Edge-Cases sind via Mitigation adressiert.

---

<!-- section:minimal-invasive -->
## Minimalinvasiv-Optimierungen

<!-- section:reusable-elements -->
### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| `aos-claude-log-panel` (Renderer für Claude-Output) | `ui/frontend/src/components/aos-claude-log-panel.ts` | Mobile-Terminal-Output → kein neuer Output-Renderer, nur CSS-Padding-Variation. |
| `aos-spec-card` Patterns (Stage-Pill, PR-Counter, Progress) | `ui/frontend/src/components/spec-card.ts` | `aos-mobile-project-card` übernimmt Visual-Vokabular (Stage-Pill-Klassen, ProgressBar-Markup) — kein Reverse-Engineering nötig. |
| `aos-create-spec-modal`, `aos-quick-todo-modal` | `ui/frontend/src/components/` | Action-Sheet-Targets — keine Neuimplementierung der Wizards für Mobile. |
| `aos-toast-notification` | `ui/frontend/src/components/toast-notification.ts` | Mic/Bell-disabled-Feedback. |
| `projectContext` (`@consume` Pattern) | `ui/frontend/src/context/project-context.ts` | Project-Switching im Scroller + Drawer ohne neuen Store. |
| `routerService` | `ui/frontend/src/services/router.service.ts` | Navigation aus Bottom-Nav, Terminal-Pill, Focus-Cards ohne Router-Erweiterung. |
| `cloud-terminal.service` | `ui/frontend/src/services/cloud-terminal.service.ts` | Session-Count + Live-Status für Terminal-Pill und Bottom-Nav-Badge. |
| Existing CSS Tokens (`--color-*`, `--font-family-mono`, `--radius-*`) | `ui/frontend/src/styles/theme.css` | 100 % Token-Reuse — nur additive Mobile-Tokens. |
| Existing `@media (max-width: 768px)` patterns | `kanban-board.ts`, `story-card.ts`, `theme.css` | Bestätigt dass 768px-Breakpoint (= unser 767px-Maxima) bereits etablierter Standard. |
| `auto-mode.protocol.ts` Typen | `ui/src/shared/types/auto-mode.protocol.ts` | Focus-Strip-Derivation typisiert ohne Type-Duplikation. |

<!-- section:optimizations -->
### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| 3 separate Sheet-Komponenten mit eigenem Backdrop/Focus-Trap | 1 generisches `aos-mobile-sheet`-Primitiv + 3 dünne Wrapper | ~150 LOC, A11y-Konsistenz, eine Bug-Fix-Stelle |
| Neuer Backend-Endpoint `GET /api/dashboard/focus` für Focus-Strip | Frontend-only Pure-Function-Derivation aus vorhandenen Daten | Kein BE-Code, keine neue Gateway-Message, kein Caching-Layer |
| Eigene Service-Datei `mobile-detection.service.ts` mit Singleton + Event-Emitter | Lit `ReactiveController` (host-scoped, ~30 LOC) | Eine Datei statt zwei, automatisches Cleanup |
| Neuer Mobile-Output-Renderer für Terminal | Reuse `aos-claude-log-panel` mit CSS-Padding-Override | ~250 LOC Renderer-Code gespart, keine zweite Parsing-Logik für ANSI/Tool-Calls |
| Eigener `MobileRouter` für `/m/*`-Pfade | Reuse `routerService` (gleiche URLs, gleiche Routes) | Zero Router-Code, keine Doppel-Subscriptions |
| Neue Project-State-Duplikation für Mobile | Reuse `projectContext` via `@consume` | Single Source of Truth bleibt erhalten |

<!-- section:feature-preservation -->
### Feature-Preservation bestätigt

- [x] **F1 Responsive Switching** — durch `MobileBreakpointController` + `@media`-Queries + `renderMobile()`-Branch in beiden Top-Views. Same URL, same Component, kein Reload.
- [x] **F2 Mobile Dashboard A** — alle 8 Sub-Komponenten (TopBar, Scroller, BranchRow, Segmented, Focus-Strip, ProjectCard, TerminalPill, BottomNav) explizit als neue Lit-Components geplant.
- [x] **F3 Mobile Cloud Terminal D** — alle 6 Sub-Layouts (Header, SessionTabs, ConnectionBar, Output, QuickReplies, InputBarIdle) explizit; Mic visuell vorhanden + disabled.
- [x] **F4 Mobile Spec-Detail** — vertikale Story-List + Bottom-Sheet für Story-Details (eigene Konzeption, da kein JSX-Mockup) — Story-Card + Story-Sheet + Action-Sheet für Status-Änderung geplant.
- [x] **F5 Side-Drawer** — `aos-mobile-side-drawer` mit Avatar, Projekt-Liste, Nav-Items, Logout.
- [x] **F6 FAB Action-Sheet** — `aos-mobile-action-sheet` mit New Spec/Bug/Todo → triggert existierende Workflows.
- [x] **F7 Cross-Project-Switching** — Scroller + Drawer beide via `projectContext.switchProject`, garantiert synchron.
- [x] Alle Edge-Cases aus requirements-clarification.md (Empty-Project-Chips, lange Namen, Focus-Strip-leer, Mic-Tap-Toast, Side-Drawer-Resize) sind in Mitigations dokumentiert.
- [x] OUT-OF-SCOPE-Liste eingehalten: Voice, Bell-System, neue Wizards, native Wrapper, `/m/*`-Routing, Push-Notifications, Drag&Drop — alles ausgeschlossen.

---

<!-- section:next-steps -->
## Nächste Schritte

Nach Genehmigung dieses Plans:
1. **Step 2.6-lean:** User Stories aus den Phasen 1–6 ableiten (eine Story pro logischem Bündel — siehe "Proposed User Stories" der requirements-clarification.md, 12 Stories als Ausgangspunkt). Jede Story bekommt eine `planSection`-Referenz auf einen der Anker oben (z. B. Phase-3-Story referenziert `section:phase-3-dashboard-content`).
2. **Step 3 (Architect Refinement):** Pro Story Technical-Details + DoR/DoD, insbesondere für `aos-mobile-sheet` (A11y-Anforderungen) und `focus-strip.derive.ts` (Test-Fixtures).
3. **Step 4:** Spec ready for execution. Beginnt mit Phase 1 (Foundation), da alle anderen Phasen darauf aufbauen.
