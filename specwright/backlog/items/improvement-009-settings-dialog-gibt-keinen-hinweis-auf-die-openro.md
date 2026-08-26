# ITEM-009: Settings-Dialog gibt keinen Hinweis auf die OpenRouter-ID-Konvention

**Type:** Todo
**Priority:** low
**Estimated Effort:** TBD
**Created:** 2026-08-26T16:42:26.989Z
**Source:** Eigen-Review Kimi-K3-OpenRouter, Finding F9
**Related Spec:** N/A

## Description

Das Feld 'Model ID' in ui/frontend/src/views/settings-view.ts:1216-1218 ist ein freies Textfeld ohne Validierung und ohne providerspezifischen Hinweis.

Fuer den openrouter-Provider gelten aber zwei Bedingungen, die man dort nicht sieht: die ID muss die Form 'openrouter,<slug>' haben (claude-code-router routet nur bei Komma-Format — ein blanker Slug wird still durch Router.default ersetzt), und der Slug muss zusaetzlich in der Allowlist ~/.claude-code-router/presets/openrouter/manifest.json unter Providers[0].models stehen.

Wer das nicht weiss, legt ueber die UI einen Eintrag an, der scheinbar funktioniert, aber ein anderes Modell bedient — exakt der Bug, der 7 bestehende OpenRouter-Eintraege betroffen hat (Nachweis: ohne Komma antwortete arcee-ai/trinity-large-thinking, mit Komma deepseek/deepseek-v3.2).

Vorschlag: providerspezifischer Platzhalter/Hilfetext im Dialog, oder eine Validierungswarnung, wenn fuer einen ccr-basierten Provider eine ID ohne Komma eingetragen wird.




## Acceptance Criteria

- [ ] Task completed
- [ ] Verified working

## Notes

[Additional notes]
