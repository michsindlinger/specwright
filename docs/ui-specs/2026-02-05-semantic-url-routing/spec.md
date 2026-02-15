# Spec: Semantic URL Routing with Deep-Link Support

## Overview
Umstellung der Navigation von Hash-basiertem Routing auf sprechende URLs mit History API und vollständiger Deeplink-Funktionalität. Alle Ansichten erhalten eigene, bookmarkbare URLs, die Page-Reload, Browser Back/Forward und Deep-Linking unterstützen.

## Problem
- Hash-basiertes Routing (#/dashboard) mit nur 4 Top-Level-Routes
- Kanban-Board, Story-Detail, Backlog sind interne States ohne URL
- State-Verlust bei Page-Reload (z.B. Kanban → Specs-Liste)
- Browser Back/Forward funktioniert nicht zwischen Sub-Views
- URLs sind nicht sprechend und nicht teilbar

## Solution
- Custom History API Router mit Pattern-Matching und Named Parameters
- 14 sprechende Routes mit verschachtelter URL-Struktur
- URL-getriebene View-States: Views leiten ihren Zustand aus URL-Parametern ab
- Automatische Legacy Hash-URL Umleitung
- Browser-native Back/Forward Navigation

## URL-Schema

| Route | URL | Beschreibung |
|-------|-----|--------------|
| Root | `/` | Redirect → `/specs` |
| Specs | `/specs` | Specs-Übersicht |
| Kanban | `/specs/:specId/kanban` | Kanban-Board |
| Story | `/specs/:specId/stories/:storyId` | Story-Detail |
| Backlog | `/backlog` | Backlog-Ansicht |
| Backlog-Story | `/backlog/:storyId` | Backlog Story-Detail |
| Docs | `/docs` | Dokumentation |
| Chat | `/chat` | Chat-View |
| Workflows | `/workflows` | Workflow-Übersicht |
| Workflow-Exec | `/workflows/:executionId` | Workflow-Ausführung |
| Settings | `/settings` | Settings (→ Models) |
| Settings Models | `/settings/models` | Model-Konfiguration |
| Settings General | `/settings/general` | Allgemeine Einstellungen |
| Settings Appearance | `/settings/appearance` | Erscheinungsbild |

## Technical Approach
- **Custom Router**: Leichtgewichtiger Singleton ohne externe Dependencies
- **History API**: `pushState`/`popstate` statt Hash-basiertem Routing
- **Pattern Matching**: `:paramName` Segments → RegExp Compilation → Named Capture Groups
- **Event System**: Callback-basierte Route-Change-Subscription (analog zu Gateway)
- **State Restoration**: Views laden Daten basierend auf URL-Parametern bei Mount/Reload

## Scope

### In Scope
- Custom Router Module (router.ts)
- History API Migration (alle Hash-Referenzen ersetzen)
- Deep-Linking für alle Views
- Legacy Hash-URL Redirect
- Vite SPA Fallback Konfiguration
- Browser Back/Forward Support

### Out of Scope
- SSR/SEO-Optimierung
- Lazy Loading von View-Komponenten
- URL-basierte Filter/Sortierung
- Breadcrumb-Navigation

## Stories
See `story-index.md` and individual story files in `stories/`.
