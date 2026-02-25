# Implementierungsplan: Dev-Team Visualization

> **Status:** APPROVED
> **Spec:** specwright/specs/2026-02-25-dev-team-visualization/
> **Erstellt:** 2026-02-25
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Das Feature "Dev-Team Visualization" fügt eine neue "/team" Seite zur Specwright Web UI hinzu, die alle Skills (`.claude/skills/[name]/`) eines Projekts als Karten-Grid darstellt. Jede Karte zeigt Skill-Name, Rolle, Beschreibung und Lernfortschritt (Dos/Don'ts Zählung). Ein Klick auf eine Karte öffnet ein Detail-Modal mit dem vollständigen SKILL.md-Inhalt und der Dos-and-Donts-Liste. Das Feature nutzt eine REST-API, die Skills aus dem Dateisystem liest, und folgt exakt den bestehenden Patterns der Codebase (Light DOM Lit Components, Express Router, Hash-Based Routing).

**Umfang:** 6 neue Dateien, 3 existierende Dateien ändern. Geschätzter Aufwand: 4-5 Stories.

---

## Architektur-Entscheidungen

### AE-1: REST API statt WebSocket für Skills-Daten

**Entscheidung:** REST-Endpunkt (`GET /api/team/:projectPath/skills`) statt WebSocket-Message.

**Begründung:**
- Skills ändern sich nicht in Echtzeit (kein Push-Bedarf)
- Passt zum Pattern von `quick-todo.routes.ts` (projektpfad-basiert)
- Simpler als WebSocket für reine Read-Only-Daten
- Lazy Loading des Detail-Inhalts (SKILL.md Body) über separaten Endpunkt oder Query-Parameter

### AE-2: Light DOM Pattern wie alle bestehenden Komponenten

**Entscheidung:** Alle neuen Komponenten nutzen `createRenderRoot() { return this; }` (Light DOM).

**Begründung:** Alle bestehenden Komponenten nutzen Light DOM. CSS kommt aus `theme.css`. Konsistenz ist wichtiger als Shadow DOM Isolation.

### AE-3: Zwei-stufiges Laden (Summary + Detail)

**Entscheidung:**
- **Stufe 1 (Seiten-Load):** API liefert Skill-Liste mit Name, Beschreibung, Rolle, Dos/Don'ts-Zählung
- **Stufe 2 (Modal-Klick):** API liefert vollständigen SKILL.md-Inhalt und Dos-and-Donts-Einträge

**Begründung:** Reduziert initiale Ladezeit. SKILL.md-Dateien können gross sein (5+ KB), und der vollständige Inhalt wird nur bei Bedarf geladen.

### AE-4: YAML-Frontmatter Parsing für Skill-Metadaten

**Entscheidung:** Skill-Rolle/Kategorie wird aus dem SKILL.md YAML-Frontmatter und der ersten Heading-Zeile extrahiert.

**Begründung:** Alle bestehenden SKILL.md-Dateien haben ein `description` Feld im Frontmatter und einen `# Name Skill`-Heading. Die Rolle wird aus dem Verzeichnisnamen oder dem Heading abgeleitet (z.B. "Frontend Lit" -> Kategorie "Frontend"). Falls kein Frontmatter, wird ein Fallback genutzt.

### AE-5: Markdown-Rendering im Detail-Modal

**Entscheidung:** Einfaches HTML-Rendering des SKILL.md-Inhalts über eine Lightweight Markdown-zu-HTML Konvertierung (serverseitig oder Frontend).

**Begründung:** Der SKILL.md-Inhalt enthält Code-Blöcke, Listen und Headings. Reines `<pre>` wäre zu unleserlich. Initial: Preformatierter Text mit Whitespace-Preservation. Optimierung mit Markdown-Renderer möglich.

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `skills-reader.service.ts` | Backend Service | Liest Skills aus `.claude/skills/` Dateisystem, parst Frontmatter und Dos-and-Donts |
| `team.routes.ts` | Backend Route | REST API für Skills-Daten (Liste + Detail) |
| `team.protocol.ts` | Shared Types | TypeScript Interfaces für Skill-Daten (SkillSummary, SkillDetail) |
| `aos-team-view` | Frontend View | Team-Übersichtsseite mit Grid-Layout, Loading/Error/Empty States |
| `aos-team-card` | Frontend Component | Einzelne Skill-Karte mit Name, Kategorie-Badge, Beschreibung, Lernfortschritt |
| `aos-team-detail-modal` | Frontend Component | Detail-Modal mit SKILL.md-Inhalt und Dos-and-Donts-Liste |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `route.types.ts` | Erweitern | `'team'` zu ViewType und VALID_VIEWS hinzufügen |
| `app.ts` | Erweitern | Import, NavItem "Team", Team-Icon SVG, Route-Rendering |
| `index.ts` (Server) | Erweitern | Import + Registrierung von teamRouter unter `/api/team` |

### Nicht betroffen (explizit)

- `gateway.ts` - Kein WebSocket nötig
- `theme.css` - Nutze existierende CSS Variables
- `websocket.ts` - Keine neuen Message-Handler
- `package.json` - Keine neuen Dependencies
- Alle bestehenden Komponenten und Views

---

## Umsetzungsphasen

### Phase 1: Backend - Skills Reader Service + REST API
**Ziel:** REST API zum Lesen und Parsen von Skills aus dem Dateisystem
**Komponenten:** skills-reader.service.ts, team.routes.ts, team.protocol.ts, index.ts (Änderung)
**Abhängig von:** Nichts (Startphase)

### Phase 2: Frontend - Routing & Navigation
**Ziel:** Team-Route und Menüpunkt in der Navigation
**Komponenten:** route.types.ts (Änderung), app.ts (Änderung)
**Abhängig von:** Nichts (parallel zu Phase 1 möglich)

### Phase 3: Frontend - Team View + Cards
**Ziel:** Team-Übersichtsseite mit Karten-Grid und Empty State
**Komponenten:** aos-team-view, aos-team-card
**Abhängig von:** Phase 1 + Phase 2

### Phase 4: Frontend - Detail-Modal
**Ziel:** Detail-Modal mit vollständigem Skill-Inhalt und Dos-and-Donts
**Komponenten:** aos-team-detail-modal
**Abhängig von:** Phase 3

### Phase 5: Integration & Tests
**Ziel:** Backend-Tests und Build-Verifikation
**Komponenten:** Vitest Tests für Service + Routes
**Abhängig von:** Alle vorherigen Phasen

---

## Komponenten-Verbindungen (KRITISCH)

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| `app.ts` | `aos-team-view` | Route Rendering | TEAM-002 | `grep -q "aos-team-view" ui/frontend/src/app.ts` |
| `app.ts` | `route.types.ts` | Type Import ('team') | TEAM-002 | `grep -q "'team'" ui/frontend/src/types/route.types.ts` |
| `aos-team-view` | `team.routes.ts` | HTTP fetch() | TEAM-003 | `grep -q "/api/team" ui/frontend/src/views/aos-team-view.ts` |
| `aos-team-view` | `aos-team-card` | Property Binding | TEAM-003 | `grep -q "aos-team-card" ui/frontend/src/views/aos-team-view.ts` |
| `aos-team-view` | `aos-team-detail-modal` | Property Binding | TEAM-004 | `grep -q "aos-team-detail-modal" ui/frontend/src/views/aos-team-view.ts` |
| `aos-team-card` | `aos-team-view` | Custom Event (@card-click) | TEAM-003 | `grep -q "card-click" ui/frontend/src/components/team/aos-team-card.ts` |
| `aos-team-detail-modal` | `team.routes.ts` | HTTP fetch() Detail | TEAM-004 | `grep -q "/api/team" ui/frontend/src/components/team/aos-team-detail-modal.ts` |
| `team.routes.ts` | `skills-reader.service.ts` | Service Call | TEAM-001 | `grep -q "skills-reader" ui/src/server/routes/team.routes.ts` |
| `index.ts` | `team.routes.ts` | Route Mount | TEAM-001 | `grep -q "teamRouter\|team.routes" ui/src/server/index.ts` |
| Alle Komponenten | `team.protocol.ts` | Type Import | TEAM-001 | `test -f ui/src/shared/types/team.protocol.ts` |

### Verbindungs-Details

**V-1: app.ts -> aos-team-view (Route Rendering)**
- **Art:** Direct Import + HTML Tag Rendering
- **Schnittstelle:** `<aos-team-view></aos-team-view>` in `renderView()`
- **Datenfluss:** projectContext via Lit Context API
- **Story:** TEAM-002
- **Validierung:** `grep -q "aos-team-view" ui/frontend/src/app.ts`

**V-2: aos-team-view -> team.routes.ts (REST API)**
- **Art:** HTTP fetch()
- **Schnittstelle:** `GET /api/team/:projectPath/skills`
- **Datenfluss:** Request: projectPath -> Response: SkillsListResponse
- **Story:** TEAM-003
- **Validierung:** `grep -q "/api/team" ui/frontend/src/views/aos-team-view.ts`

**V-3: aos-team-detail-modal -> team.routes.ts (Detail API)**
- **Art:** HTTP fetch()
- **Schnittstelle:** `GET /api/team/:projectPath/skills/:skillId`
- **Datenfluss:** Request: projectPath + skillId -> Response: SkillDetailResponse
- **Story:** TEAM-004
- **Validierung:** `grep -q "/api/team" ui/frontend/src/components/team/aos-team-detail-modal.ts`

**V-4: team.routes.ts -> skills-reader.service.ts (Service Call)**
- **Art:** Direct Import + Function Call
- **Schnittstelle:** `listSkills(projectPath)`, `getSkillDetail(projectPath, skillId)`
- **Datenfluss:** projectPath -> SkillSummary[] / SkillDetail
- **Story:** TEAM-001
- **Validierung:** `grep -q "skills-reader" ui/src/server/routes/team.routes.ts`

### Verbindungs-Checkliste
- [x] Jede neue Komponente hat mindestens eine Verbindung definiert
- [x] Jede Verbindung ist einer Story zugeordnet
- [x] Validierungsbefehle sind ausführbar

---

## Abhängigkeiten

### Interne Abhängigkeiten

```
TEAM-001 (Backend API) ──parallel──> TEAM-002 (Navigation & Routing)
         |                                      |
         +──────────> TEAM-003 (Team View + Card) <──────+
                           |
                           +──> TEAM-004 (Detail Modal)
                                     |
                                     +──> TEAM-005 (Integration & Tests)
```

### Externe Abhängigkeiten

- **Keine neuen npm-Dependencies** erforderlich
- YAML-Frontmatter Parsing: Einfache Regex-Lösung (kein `gray-matter` o.ä. nötig)
- Markdown-Rendering: Initial als `<pre>`, später optional

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| SKILL.md Format-Variationen (kein Frontmatter, anderes Heading) | Medium | Low | Defensive Parsing mit Fallback-Werten |
| Große Anzahl Skills (50+) | Low | Low | Aktuell unrealistisch (5-10 Skills typisch). Pagination nachrüstbar |
| Path-Traversal über projectPath | Low | High | Validierung wie bei quick-todo.routes.ts |
| Fehlendes `.claude/skills/` Verzeichnis | Medium | Low | Leeres Array zurückgeben, Empty State anzeigen |

---

## Self-Review Ergebnisse

### Validiert

| FR | Status | Abdeckung |
|----|--------|-----------|
| FR-1: Team-Übersichtsseite | Abgedeckt | TEAM-002 (Route/Nav) + TEAM-003 (View) |
| FR-2: Team-Mitglieder-Karte | Abgedeckt | TEAM-003 (aos-team-card) |
| FR-3: Detailansicht Modal | Abgedeckt | TEAM-004 (aos-team-detail-modal) |
| FR-4: Leerer Zustand | Abgedeckt | TEAM-003 (Empty State in aos-team-view) |
| FR-5: Backend-Endpunkt | Abgedeckt | TEAM-001 (skills-reader + routes) |

### Identifizierte Probleme & Lösungen

| Problem | Ursprünglicher Plan | Verbesserung |
|---------|--------------------|--------------|
| Dos/Don'ts Zählung unklar | Separate dosCount/dontsCount | Vereinfacht zu learningsCount (da aktuelle Struktur keine Do/Don't-Unterscheidung hat) |
| Markdown-Rendering komplex | Library hinzufügen | Initial `<pre>` mit Whitespace-Preservation, Markdown-Renderer als spätere Optimierung |

### Offene Fragen

- Keine

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| REST Route mit projectPath | `quick-todo.routes.ts` | 1:1 für `team.routes.ts` |
| Card-Komponente mit Click-Event | `spec-card.ts` | CSS + Event-Pattern für `aos-team-card` |
| View mit Context + Data Loading | `aos-getting-started-view.ts` | Pattern für `aos-team-view` |
| Modal mit Open/Close | `aos-installation-wizard-modal.ts` | Pattern für `aos-team-detail-modal` |
| Route Registration | `index.ts` | Eine Zeile für neuen Router |
| ViewType Erweiterung | `route.types.ts` | Zwei minimale Änderungen |
| NavItem Erweiterung | `app.ts` | Ein Objekt zum Array hinzufügen |
| Empty State Pattern | `aos-getting-started-view.ts` | Ähnliches Card-Layout für Hinweis |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| Eigene CSS-Styles pro Komponente | Bestehende theme.css Variables nutzen | Weniger CSS, konsistenteres Design |
| WebSocket-Integration erwägt | REST-only (read-only Daten) | Einfacher, kein gateway.ts Änderung |
| Separate Markdown-Library | `<pre>` mit CSS-Styling | Keine neue Dependency |

### Feature-Preservation bestätigt
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar

---

## Nächste Schritte

Nach Genehmigung dieses Plans:
1. Step 2.6: User Stories aus diesem Plan ableiten
2. Step 3: Architect fügt technische Details hinzu
3. Step 4: Spec ready for execution
