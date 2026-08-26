# DEBT-007: DEFAULT_CONFIG in model-config.ts ist stale und faellt still zurueck

**Type:** Todo
**Priority:** medium
**Estimated Effort:** TBD
**Created:** 2026-08-26T16:42:08.378Z
**Source:** Plan-Review Kimi-K3-OpenRouter, Finding F18
**Related Spec:** N/A

## Description

model-config.ts:33-87 (DEFAULT_CONFIG) kennt nur anthropic/glm/gemini/kimi-kw/deepseek — kein openrouter, kein minimax, kein grok — und traegt veraltete Namen (Opus 4.5, Sonnet 4, Haiku 3.5, glm-5, anthropic cliCommand-Erwartungen).

Problem 1 (Fallback): loadModelConfig() faengt Parse-Fehler bzw. fehlende Datei mit console.warn ab und liefert DEFAULT_CONFIG. Im Fehlerfall verschwinden dadurch drei Provider komplett aus der UI — das sieht wie ein Deploy-Problem aus, nicht wie ein kaputtes JSON. Entweder DEFAULT_CONFIG synchron halten oder bei Parse-Fehler laut scheitern statt still zurueckfallen.

Problem 2 (Tests): ui/tests/unit/model-config.test.ts hat 4 Tests, die gegen einen laengst ueberholten DEFAULT_CONFIG-Stand assert'en und deshalb dauerhaft rot sind: erwartet cliCommand 'claude-anthropic-simple' fuer anthropic (ist 'claude'), 'claude' fuer glm (ist 'claude-glm'), und providers.length === 2 (sind 5). Baseline auf HEAD bestaetigt: 22 failed / 1316 passed, davon diese 4.

Gefunden beim Anbinden von Kimi K3 ueber OpenRouter (externes Plan-Review, Finding 18).




## Acceptance Criteria

- [ ] Task completed
- [ ] Verified working

## Notes

[Additional notes]
