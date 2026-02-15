# Aufwandsschätzung: Kanban Story Execution

**Erstellt:** 2026-01-31
**Spec:** 2026-01-31-kanban-story-execution
**Anzahl Stories:** 5

---

## Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | 28h | 9h | 19h (68%) |
| **Arbeitstage** | 3.5d | 1.1d | 2.4d |
| **Arbeitswochen** | 0.7w | 0.2w | 0.5w |

### Was bedeutet das?

**Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

---

## Schätzung pro Story

| ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| KSE-001 | Drag & Drop Infrastruktur | S | 6h | high | 1.2h | 4.8h |
| KSE-002 | Pre-Drag Validation | S | 6h | high | 1.2h | 4.8h |
| KSE-003 | Execute-Tasks Trigger | M | 12h | medium | 4.8h | 7.2h |
| KSE-004 | Working Indicator | S | 6h | high | 1.2h | 4.8h |
| KSE-999 | Integration & Validation | S | 4h | none | 4h | 0h |
| **TOTAL** | | | **34h** | | **12.4h** | **21.6h** |

---

## KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 3 | 18h | 3.6h | -80% |
| **Medium** (60% schneller) | 1 | 12h | 4.8h | -60% |
| **Low** (30% schneller) | 0 | 0h | 0h | -30% |
| **None** (keine Beschleunigung) | 1 | 4h | 4h | 0% |

### Erklärung der Kategorien

- **High (Faktor 0.20):** KSE-001, KSE-002, KSE-004 - Standard UI-Komponenten, Event-Handler, CSS - KI kann 5x schneller helfen
- **Medium (Faktor 0.40):** KSE-003 - Full-Stack Integration mit WebSocket, erfordert mehr menschliches Verständnis
- **None (Faktor 1.00):** KSE-999 - Manuelle E2E Validation, menschliches Urteil erforderlich

---

## Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)
- Entwickler kennt bereits die Codebase (agent-os-ui)

---

## Empfehlung

**Geplanter Aufwand:** 12.4h (1.5d / 0.3w)
**Mit Puffer (+25%):** 15.5h (2d / 0.4w)

### Reihenfolge der Umsetzung

1. **KSE-001** (Drag & Drop) - Basis für alle anderen Stories
2. **KSE-002** (Validation) - Erweitert KSE-001 um Validierung
3. **KSE-003** (Trigger) - Kernfunktionalität, Full-Stack
4. **KSE-004** (Indicator) - UI-Feedback
5. **KSE-999** (Validation) - Abschließende E2E Tests

---

*Erstellt mit Agent OS /create-spec v2.7*
