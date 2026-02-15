# Story: Code Review (System)

## Feature
Als System möchte ich, dass der gesamte Code-Diff dieser Spec von einem starken LLM (Opus) reviewt wird, um logische Fehler, Sicherheitslücken und Stil-Verstöße vor dem Merge zu finden.

## Akzeptanzkriterien
- Gesamt-Diff der Spec wird analysiert
- Kritische Fehler werden als Blocker gemeldet
- Verbesserungsvorschläge werden dokumentiert
- Bericht liegt unter `implementation-reports/code-review.md`

## Technisches Refinement

**DoR (Definition of Ready)**
- [x] Alle vorherigen Stories implementiert
- [x] Skill `reviewer` verfügbar

**DoD (Definition of Done)**
- [x] Review durchgeführt
- [x] Kritische Findings behoben (oder als neue Stories/Bugs erfasst)

**Verifikation:**
```bash
test -f agent-os/specs/2026-02-04-chat-with-spec/implementation-reports/code-review.md
```
