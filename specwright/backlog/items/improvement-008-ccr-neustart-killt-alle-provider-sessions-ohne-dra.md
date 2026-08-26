# ITEM-008: ccr-Neustart killt alle Provider-Sessions ohne Drain und ohne UI-Warnung

**Type:** Todo
**Priority:** medium
**Estimated Effort:** TBD
**Created:** 2026-08-26T16:42:17.944Z
**Source:** Plan-Review Kimi-K3-OpenRouter, Finding F17
**Related Spec:** N/A

## Description

~/bin/claude-openrouter (und die Schwester-Wrapper claude-gem, claude-kimi) teilen sich eine claude-code-router-Instanz auf Port 3456. Weicht das aktive Preset vom gewuenschten ab, macht der Wrapper 'kill $PID; sleep 1' und startet ccr mit der neuen Config neu.

Folgen: laufende Streams brechen mitten in der Antwort ab (kein SIGTERM-Drain, kein Warten auf In-Flight-Requests), es trifft alle drei Provider gleichzeitig, und die Specwright-UI erfaehrt nichts davon — das Terminal sieht einfach tot aus. Betrifft insbesondere Auto-Mode-Slots, die niemand live mitliest.

Moegliche Loesungen: (a) pro Preset eine eigene ccr-Instanz auf eigenem Port, ANTHROPIC_BASE_URL in ~/.claude-<id>/settings.json entsprechend; (b) SIGTERM + Drain-Fenster statt kill; (c) Preflight in cloud-terminal-manager, der einen anstehenden ccr-Wechsel erkennt und meldet statt ihn stillschweigend auszuloesen.

Gefunden beim Anbinden von Kimi K3 ueber OpenRouter (externes Plan-Review, Finding 17).




## Acceptance Criteria

- [ ] Task completed
- [ ] Verified working

## Notes

[Additional notes]
