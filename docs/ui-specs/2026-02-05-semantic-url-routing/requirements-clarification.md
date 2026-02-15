# Requirements Clarification: Semantic URL Routing with Deep-Link Support

## Feature Summary
Umstellung der Navigation von Hash-basiertem Routing (#/) auf sprechende URLs mit History API und vollständiger Deeplink-Funktionalität. Alle Ansichten erhalten eigene, bookmarkbare URLs, die einen Page-Reload überleben.

## Problem Statement
- Aktuell: Hash-basiertes Routing mit nur 4 Top-Level-Routes (#/dashboard, #/chat, #/workflows, #/settings)
- Kanban-Board, Story-Detail, Backlog etc. sind interne States der Dashboard-View ohne eigene URL
- Bei Page-Reload geht der gesamte View-State verloren (z.B. Kanban → Specs-Liste)
- Browser Back/Forward funktioniert nicht zwischen Sub-Views
- URLs sind nicht sprechend und nicht teilbar

## Confirmed Requirements

### URL-Format
- **History API** mit echten Pfaden (kein Hash-Prefix)
- Server-Side SPA Fallback für Vite Dev Server und Production

### URL-Schema (verschachtelt)
| Route | URL | Beschreibung |
|-------|-----|--------------|
| Specs-Übersicht | `/specs` | Liste aller Specs |
| Kanban-Board | `/specs/{spec-id}/kanban` | Kanban eines spezifischen Specs |
| Story-Detail | `/specs/{spec-id}/stories/{story-id}` | Story-Detail innerhalb eines Specs |
| Backlog | `/backlog` | Top-Level Backlog-Ansicht |
| Backlog-Story | `/backlog/{story-id}` | Story-Detail im Backlog |
| Dokumentation | `/docs` | Top-Level Docs-Ansicht |
| Chat | `/chat` | Chat-View |
| Workflows | `/workflows` | Workflow-Übersicht |
| Workflow-Execution | `/workflows/{execution-id}` | Aktive Workflow-Ausführung |
| Settings | `/settings` | Settings-Übersicht (→ Models) |
| Settings Models | `/settings/models` | Model-Konfiguration |
| Settings General | `/settings/general` | Allgemeine Einstellungen |
| Settings Appearance | `/settings/appearance` | Erscheinungsbild |

### Router-Implementierung
- **Custom Router** ohne externe Library
- Leichtgewichtig, maßgeschneidert für History API
- Pattern-Matching mit Named Parameters (`:specId`, `:storyId`)
- Singleton-Pattern (analog zu bestehendem `gateway`)

### Deep-Link Anforderungen
- Alle URLs sind bookmarkbar
- Alle URLs überleben Page-Reload
- Browser Back/Forward funktioniert korrekt
- Legacy Hash-URLs (#/) werden automatisch auf neue URLs umgeleitet

### Nicht im Scope
- SSR/SEO-Optimierung
- Lazy Loading von View-Komponenten
- URL-basierte Filter/Sortierung
- Breadcrumb-Navigation
