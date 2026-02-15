# Aufwandsschätzung: Context Menu

**Erstellt:** 2026-02-03
**Spec:** 2026-02-03-context-menu
**Anzahl Stories:** 9 (6 Feature + 3 System)

---

## Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | 48h | 9.6h | 38.4h (80%) |
| **Arbeitstage** | 6d | 1.2d | 4.8d |
| **Arbeitswochen** | 1.2w | 0.24w | 0.96w |

### Was bedeutet das?

**Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

---

## Schätzung pro Story

| ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| CTX-001 | Context Menu Component | S | 6h | high (0.20) | 1.2h | 4.8h |
| CTX-002 | Global Event Handler | XS | 3h | high (0.20) | 0.6h | 2.4h |
| CTX-003 | Generic Workflow Modal | S | 6h | high (0.20) | 1.2h | 4.8h |
| CTX-004 | Spec Selector Component | S | 6h | high (0.20) | 1.2h | 4.8h |
| CTX-005 | Add Story Flow Integration | S | 6h | high (0.20) | 1.2h | 4.8h |
| CTX-006 | Integration & Styling | S | 6h | high (0.20) | 1.2h | 4.8h |
| CTX-997 | Code Review | S | 6h | medium (0.40) | 2.4h | 3.6h |
| CTX-998 | Integration Validation | S | 6h | low (0.70) | 4.2h | 1.8h |
| CTX-999 | Finalize PR | XS | 3h | high (0.20) | 0.6h | 2.4h |
| **TOTAL** | | | **48h** | | **13.8h** | **34.2h** |

---

## KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 7 | 36h | 7.2h | -80% |
| **Medium** (60% schneller) | 1 | 6h | 2.4h | -60% |
| **Low** (30% schneller) | 1 | 6h | 4.2h | -30% |
| **None** (keine Beschleunigung) | 0 | 0h | 0h | 0% |

### Erklärung der Kategorien

- **High (Faktor 0.20):** Boilerplate, UI-Komponenten, CSS Styling, Standard-Integration - KI kann 5x schneller helfen
- **Medium (Faktor 0.40):** Code Review, komplexere Logik - KI hilft 2.5x schneller
- **Low (Faktor 0.70):** Integration Testing, E2E Validation - KI hilft 1.4x schneller
- **None (Faktor 1.00):** Manuelle QA, Design-Entscheidungen - menschliches Urteil erforderlich

---

## Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)
- Alle Stories sind Frontend-only (keine Backend-Komplexität)

---

## Empfehlung

**Geplanter Aufwand:** 13.8h (1.7d / 0.35w)
**Mit Puffer (+25%):** 17.3h (2.2d / 0.44w)

---

*Erstellt mit Agent OS /create-spec v3.3*
