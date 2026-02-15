# Spec: Copy File Path

## Feature Summary
Ein Copy-Icon an drei Stellen in der UI (Story-Karten, Spec-Doc-Tabs, Spec-Viewer-Header), das den projekt-root-relativen Dateipfad in die Zwischenablage kopiert. Ermoeglicht schnelle Wiederverwendung von Pfaden im Chat oder Cloud Terminal.

## User Need
Entwickler brauchen haeufig Dateipfade aus der aktuellen Spec fuer Claude Code Interaktionen. Manuelles Zusammenbauen der Pfade ist fehleranfaellig und zeitaufwaendig.

## Scope
- **IN**: Copy-Icon auf Story-Karten, Spec-Doc-Tabs, Spec-Viewer-Header
- **OUT**: Keyboard Shortcuts, Kontextmenue, Copy fuer andere Entitaeten

## Technical Approach
- Shared Utility (`copy-path.ts`) fuer Clipboard-Logik und Pfad-Konstruktion
- Backend erweitert `StoryInfo` Interface um `file`-Feld
- Inline SVG Icons (Clipboard + Checkmark) mit 2s Feedback-Animation
- Pfad-Format: `agent-os/specs/{specId}/{relativePath}`

## Stories
See stories/ directory and story-index.md for complete story list.
