# Requirements Clarification - Mobile View für Dashboard, Cloud Terminal und Spec-Detail

**Created:** 2026-05-26
**Status:** Pending User Approval

## Feature Overview
Mobile-responsive Layout (`<768px` Viewport) für Specwright UI: Dashboard (Design-Variante A · Standard), Cloud Terminal (Design-Variante D · Main view) und Spec-Detail. Designs wurden im Vorfeld in JSX-Prototypen ausgearbeitet (`/Users/michaelsindlinger/Downloads/Specwright 2/src/MobileDashboard.jsx`, `MobileTerminal.jsx`).

## Target Users
Bestehende Specwright-UI-Nutzer auf iPhone/Android-Smartphones — typischerweise Solo-Entwickler & PO/Architect, die unterwegs einen Status-Check brauchen oder schnell auf Blocker/PR-Updates/Agent-Pings reagieren wollen, ohne den Laptop aufzuklappen.

## Business Value
- **Always-on Awareness:** Reagieren auf Agent-Pings (Plan-Reviews, blocked Auto-Mode, failing PRs) ohne stationäres Setup.
- **Voice-ready Foundation:** Lift-and-shift der Layout-Basis; eigentlicher Voice-Flow (Variante E) folgt im nächsten Spec auf dieser Foundation.
- **Vision:** Langfristig komplettes Mobile-UI — dieser Spec liefert das Fundament (Dashboard + Terminal + Spec-Detail), spätere Specs ergänzen Kanban-Board, Settings, Chat etc.

## Functional Requirements

### F1 — Responsive Switching (alle Views)
- Bei Viewport `<768px` wird automatisch das Mobile-Layout aktiviert, `≥768px` bleibt aktuelles Desktop-Layout unverändert.
- Same URL, same Lit-Component: Umschaltung erfolgt via `@media`-Queries und Mobile-Subcomponents innerhalb der existierenden Views.
- Beim Rotieren / Resizing wechselt das Layout ohne Reload.

### F2 — Mobile Dashboard (Design-Variante A · Standard)
Layout-Reihenfolge von oben nach unten:

1. **MTopBar** — Hamburger-Button (links) + Specwright-Logo + Breadcrumb (`Dashboard`) + Workspace-Name + Bell-Icon (visuell, ohne Funktion) + Avatar.
2. **ProjectScroller** — Horizontal scrollbare Project-Chips (mit Color-Dot + Mono-Name + aktiver State).
3. **MBranchRow** — Branch-Pill + offene PR-IDs + Commit-SHA. Daten aus aktuellem Project-Context.
4. **MSegmented Tabs** — `Specs` / `Backlog [N]` / `Docs [N]` (existierende Desktop-Tabs in Mobile-Form).
5. **Focus-Strip** — Eyebrow `Needs your attention`, Counter-Badge, horizontal scrollbare Cards (Review-blocker, PR mit failing tests, Agent-Update). Datenquelle wird im Plan definiert (vermutlich aggregierter Status aus existing Backlog + Kanban + PR-State).
6. **Project-Specs-Section** — Eyebrow `Specs`, Titel `Project feature specs`, Counter `X of Y`, vertikale Liste von **MProjectCard**:
   - Stage-Pill (In progress / Shipping / Scoping / Not started)
   - PR-Counter + Last-Activity
   - Spec-Name (groß)
   - Specs-Preview (2 Story-Rows: Status-Icon + ID + Title + Priority-Dot)
   - Progress-Bar (Done/Total + %)
   - Footer: Owner-Avatar + Agent-Status (live dot) + ChevronRight
7. **TerminalPill** — Floating Pill rechts unten über Bottom-Nav: Cloud Terminal + Session-Count + Live-Dot. Tap navigiert zu Cloud Terminal D.
8. **MBottomNav** (sticky bottom):
   - `Home` (Dashboard)
   - `Specs` (Spec-Liste des aktiven Projekts)
   - `+ FAB` (zentral, accent-glow; öffnet Action-Sheet mit New Spec / New Bug / New Todo)
   - `Terminal` (mit Live-Badge zeigt aktive Sessions-Count)
   - `Me` (Settings/Profile/Logout)

### F3 — Mobile Cloud Terminal (Design-Variante D · Main view)
Layout-Reihenfolge:

1. **TerminalHeader** — Back-Button + Terminal-Icon-Tile + Titel `Cloud Terminal` + Subtext `N sessions · Sonnet 4.6` (live dot) + Primary-Button `+ Neue` (öffnet Session-Creation-Flow).
2. **SessionTabs** — Horizontal scrollbare Tabs pro Session (Status-Dot grün/grau + Session-Name + bei Active: Close-X).
3. **ConnectionBar** — `Verbunden`-Badge (live dot) + `cloud-host · branch` (mono, ellipsis) + Kebab-Menu-Icon.
4. **TerminalOutput** — Monospace-Render des Claude-Code-Outputs (existing `aos-claude-log-panel.ts` als Renderer wiederverwenden, Mobile-Padding/Font-Size anpassen). Soll Bullets, Tool-Call-Badges, Inline-Hyperlinks, numbered Options identisch zur Desktop-Variante darstellen.
5. **QuickReplies** — Bottom-Sheet ähnliche Reply-Cards (Top-3 numbered Options aus aktivem Prompt + `Show more · type or speak free text`). Tap sendet Option als Reply an die Session.
6. **InputBarIdle** — Keyboard-Toggle (Tap → Text-Input wird visible) + Placeholder `Halt 🎙️ zum Sprechen · oder tippe…` + großer Mic-Button (sichtbar **aber disabled** — Voice-Listening folgt im separaten Spec). Text-Send via Send-Button im Input-Modus.

### F4 — Mobile Spec-Detail
- **Header**: Spec-Name (h1), Phase-Badge, Story-Counter (Done/Total), Progress-Bar.
- **Vertical Story-Cards**: Status-Icon + Story-ID + Titel + Owner-Avatar + Provider-Badge (falls assigned).
- **Story-Sheet**: Tap auf Story-Card öffnet Bottom-Sheet mit Story-Details (Beschreibung, Tasks, Status-Badge, Buttons).
- Kein Kanban-Drag&Drop auf Mobile in diesem Spec (Status-Änderung via Action-Sheet im Story-Sheet).

### F5 — Side-Drawer (Hamburger-Menu)
Slide-in von links, voll-höhig, Overlay-Backdrop. Inhalt:
- Header: User-Avatar + Name
- Projekt-Liste (vertikal — alternative zur ProjectScroller im Dashboard)
- Navigations-Items: Dashboard, Specs, Team, Settings
- Footer: Logout

### F6 — Action-Sheet vom FAB
Slide-up Bottom-Sheet mit 3 großen Action-Buttons:
1. `New Spec` → triggert existing `/create-spec`-Flow
2. `New Bug` → triggert existing `/add-bug`-Flow
3. `New Todo` → triggert existing `/add-todo`-Flow

### F7 — Cross-Project Project-Switching
Project-Chips im ProjectScroller (Dashboard) und Projekt-Liste im Side-Drawer sind synchron mit ProjectContext — Wechsel updated alle aktiven Views.

## Affected Areas & Dependencies

- **`ui/frontend/src/views/dashboard-view.ts`** (2754 Zeilen) — Hauptziel. Existing Specs/Backlog/Docs-Tabs werden in Mobile-Form als MSegmented exposed. Mobile-Subcomponents (MTopBar, ProjectScroller, MBranchRow, MFocusCard, MProjectCard, TerminalPill, MBottomNav) als private Lit-Children oder als neue `aos-mobile-*` Komponenten.
- **`ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts`** + Geschwister (`aos-terminal-tabs.ts`, `aos-terminal-session.ts`, `aos-terminal.ts`) — Mobile-Layout der Cloud Terminal Drawer-View. Renderer `aos-claude-log-panel.ts` wird wiederverwendet.
- **Spec-Detail-View** — falls bisher Teil von `dashboard-view.ts`: ebenfalls Mobile-Layout. Sonst eigene View identifizieren (Routing-Path `/spec/:id`).
- **`ui/frontend/src/services/router.service.ts`** + Project-Context — keine Route-Änderungen, aber Mobile-Layout muss `routerService.currentRoute` weiterhin korrekt verarbeiten.
- **Design-Tokens** — Designs nutzen bereits Desktop-Tokens (`--color-bg-primary`, `--color-accent-primary`, `--font-family-mono`). Kein neues Token-System nötig, eventuell Mobile-spezifische Spacing-Vars (`--space-mobile-padding`).
- **Existing Bottom-Sheet / Dialog-Pattern** — Falls bereits ein `aos-bottom-sheet`/`aos-modal` existiert: wiederverwenden für Action-Sheet, Story-Sheet, Side-Drawer.

## Edge Cases & Error Scenarios

- **Resize während Story-Sheet offen** — Beim Wechsel zu Desktop-Breakpoint (Browser-Resize) wird Sheet geschlossen und Desktop-Layout zeigt die Spec-Detail-Spalte regulär.
- **Project-Switch mit aktiver Terminal-Session** — Sessions sind project-scoped (existing Backend-Verhalten); Project-Switch zeigt nur Sessions des neuen Projekts. Live-Badge in Bottom-Nav updated.
- **Keine Project-Chips vorhanden** — ProjectScroller zeigt Empty-State + Link auf `Add Project` (existing Modal).
- **Lange Spec-Namen / Branch-Namen** — Auf Mobile-Breakpoint: `text-overflow: ellipsis` mit `min-width: 0` (bereits in Designs vorhanden).
- **Focus-Strip leer** — `Needs your attention` Counter 0 → Strip wird ausgeblendet (eyebrow-Section nicht gerendert).
- **Mic-Button-Tap** — Klick auf disabled Mic-Button zeigt non-blocking Toast `Voice coming soon` (oder Tooltip), keine Aktion.
- **Side-Drawer offen + Resize → Desktop** — Drawer wird auto-geschlossen, da Desktop-Sidebar bereits sichtbar.

## Security & Permissions
Keine neuen Permission-Konzepte. Authentication / Session-Handling unverändert (cookies/JWT von Cloud-Backend identisch). Auth-required-Routes bleiben gesichert via Middleware.

## Performance Considerations

- **No layout-shift**: Initial paint sollte auf Mobile keine FOUC verursachen → Media-Query inline im Stylesheet, kein JS-detection für initialen Render.
- **Virtual scroll**: Bei >50 Projects / Specs in Listen → `virtualizer`-Pattern erwägen (existing `lit-virtualizer` nutzen falls schon im Repo). Sonst Plan-Decision.
- **TerminalOutput**: Mobile-Padding nicht aufgebläht — kein zusätzlicher DOM-Overhead pro Log-Line.
- **Touch-Targets**: alle Interaktiv-Elemente ≥44×44 px (Apple HIG / WCAG 2.5.5 AA).

## Scope Boundaries

**IN SCOPE (dieser Spec):**
- Mobile Dashboard (Design A — Standard)
- Mobile Cloud Terminal (Design D — Main view)
- Mobile Spec-Detail (eigene Erfindung, keine Mockups; vertikale Story-Liste + Story-Sheet)
- Side-Drawer (Hamburger-Menu)
- Bottom-Nav mit Home/Specs/FAB/Terminal/Me
- FAB-Action-Sheet (New Spec/Bug/Todo) — verlinkt nur existierende Workflows, keine Mobile-spezifischen Wizards
- Responsive Breakpoint `<768px` mit `@media`-Queries in existierenden Components
- Same URLs, kein eigenes `/m/*`-Routing

**OUT OF SCOPE:**
- Variante B (Compact list), Variante C (Today), Variante E (Voice listening), Variante F (Sessions list) — eigene Specs später
- Voice-Push-to-talk / Live-Transcript (separater Spec)
- Bell-Notifications-System (separater Spec)
- Mobile Kanban-Board / Mobile Chat-View / Mobile Settings-View / Mobile Team-View — separate Specs (Vision: Komplett-Mobile)
- Native-App-Wrapper (Capacitor/PWA-Manifest) — separater Spec
- Push-Notifications (iOS/Android) — separater Spec
- Drag&Drop für Story-Status-Änderung auf Mobile

## Open Questions
Keine offenen Punkte — alle Design-Details kommen aus den JSX-Prototypen und der UX-Q&A-Session. Plan-Agent darf eigenständig die optimale Aufteilung in Lit-Components wählen.

## Proposed User Stories (High Level)

1. **Foundation & Breakpoint-Strategy** — Globaler `<768px`-Breakpoint, Design-Tokens für Mobile-Padding/Spacing, Touch-Target-Standards. Optional ein utility `aos-mobile-only` / CSS-Mixin.
2. **MTopBar + Side-Drawer** — Mobile-Header-Component + Slide-in-Drawer mit Projekt-Liste + Navigation + Logout.
3. **ProjectScroller + MBranchRow** — Horizontal scrollbare Project-Chips + Branch/PR/Commit-Row für Mobile-Dashboard.
4. **MSegmented + Focus-Strip** — Specs/Backlog/Docs Tab-Wechsel + Needs-Your-Attention horizontale Card-Liste.
5. **MProjectCard** — Mobile Spec-Card mit Stage, Specs-Preview, Progress, Owner+Agent-Status.
6. **MBottomNav + FAB-Action-Sheet** — Sticky Bottom-Navigation inkl. Live-Badge im Terminal-Tab + FAB Action-Sheet mit New Spec/Bug/Todo.
7. **TerminalPill (Floating CTA)** — Floating Cloud-Terminal-Pill rechts unten auf Dashboard.
8. **Mobile Cloud Terminal Layout** — TerminalHeader + SessionTabs + ConnectionBar + TerminalOutput-Padding-Adaptation in `aos-cloud-terminal-sidebar.ts` (Mobile = full-screen statt Drawer).
9. **QuickReplies + InputBarIdle** — Tap-friendly numbered Option-Cards + Keyboard/Mic-Toggle-Input-Bar (Mic disabled).
10. **Mobile Spec-Detail** — Vertical Story-List + Bottom-Sheet für Story-Details + Status-Action-Sheet.
11. **Dashboard-View Responsive Wiring** — `dashboard-view.ts` integriert alle Mobile-Subcomponents per `@media (max-width: 767px)`-Branch, Desktop unverändert.
12. **Cloud-Terminal Responsive Wiring** — `aos-cloud-terminal-sidebar.ts` Mobile-Branch (Full-Screen-Layout statt rechtem Drawer).

---
*Review this document carefully. Once approved, the implementation plan will be generated.*
