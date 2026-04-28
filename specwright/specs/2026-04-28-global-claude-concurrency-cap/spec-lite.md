# Spec Lite — Global Claude Concurrency Cap

App-weiter Cap auf 2 parallele Claude-Code-Sessions (env-konfigurierbar bis Hard-Ceiling 4). Erweitert `ProjectConcurrencyGate` um statische Counter, wrappt direkt-spawn-Pfade in `workflow-executor.ts` und `claude-handler.ts`, sendet `chat.queued`-WS-Event mit Frontend-Banner. Cloud-Terminal-Sessions bleiben ungegated.
