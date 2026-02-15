# Semantic URL Routing - Lite Spec

## What
Navigation von Hash-basiertem Routing (#/) auf sprechende History API URLs mit Deep-Link Support umstellen.

## Why
- State-Verlust bei Reload (Kanban → Specs-Liste)
- Keine bookmarkbaren URLs für Sub-Views
- Browser Back/Forward funktioniert nicht

## Key URLs
- `/specs` → Spec-Liste
- `/specs/{id}/kanban` → Kanban-Board
- `/specs/{id}/stories/{storyId}` → Story-Detail
- `/backlog`, `/docs`, `/chat`, `/workflows`, `/settings`

## Technical
- Custom Router Singleton (router.ts) mit History API
- Pattern Matching mit Named Parameters
- URL-getriebene View-States
- Legacy Hash Redirect
