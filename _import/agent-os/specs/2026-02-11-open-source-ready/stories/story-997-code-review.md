# Code Review

> Story ID: OSR-997
> Spec: Open Source Ready
> Created: 2026-02-11
> Last Updated: 2026-02-11
> Type: System/Review

**Priority**: High
**Type**: System
**Estimated Effort**: -
**Dependencies**: OSR-001, OSR-002, OSR-003, OSR-004, OSR-005, OSR-006, OSR-007, OSR-008

---

## Purpose

Starkes Modell (Opus) reviewt den gesamten Feature-Diff nach Abschluss aller regulären Stories.

## Tasks

1. **Git Diff Review**: Gesamten Feature-Diff gegen base branch reviewen
2. **Code Quality Check**: Code Style, Patterns, Best Practices prüfen
3. **Security Review**: Keine Secrets, API Keys oder sensible Daten im Diff
4. **Consistency Check**: Alle Dateien konsistent und vollständig
5. **Documentation Review**: Alle Docs korrekt und vollständig

## Acceptance Criteria

- [ ] Gesamter Feature-Diff reviewed
- [ ] Keine Security Issues gefunden (oder gefixt)
- [ ] Keine Code Quality Issues gefunden (oder gefixt)
- [ ] Alle Dateien konsistent
- [ ] Review-Findings dokumentiert

## Execution Notes

- Wird automatisch nach allen regulären Stories ausgeführt
- Nutzt `git diff main...HEAD` für den vollständigen Feature-Diff
- Bei kritischen Findings: Fix-Story wird erstellt
- Bei Minor Findings: Inline-Fix im selben Durchlauf
