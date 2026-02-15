# Aufwandsschätzung: Chat Model Selection

**Erstellt:** 2026-02-02
**Spec:** chat-model-selection
**Anzahl Stories:** 5

---

## Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | 24h | 8h | 16h (67%) |
| **Arbeitstage** | 3d | 1d | 2d |
| **Arbeitswochen** | 0.6w | 0.2w | 0.4w |

### Was bedeutet das?

**Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

---

## Schätzung pro Story

| ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| MODSEL-001 | Model Selector UI Component | S | 6h | high (0.20) | 1.2h | 4.8h |
| MODSEL-002 | Provider Configuration | XS | 3h | high (0.20) | 0.6h | 2.4h |
| MODSEL-003 | Backend Model Routing | S | 6h | medium (0.40) | 2.4h | 3.6h |
| MODSEL-004 | Session State Integration | S | 6h | medium (0.40) | 2.4h | 3.6h |
| MODSEL-999 | Integration & Validation | S | 3h | low (0.70) | 2.1h | 0.9h |
| **TOTAL** | | | **24h** | | **8.7h** | **15.3h** |

---

## KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 2 | 9h | 1.8h | -80% |
| **Medium** (60% schneller) | 2 | 12h | 4.8h | -60% |
| **Low** (30% schneller) | 1 | 3h | 2.1h | -30% |
| **None** (keine Beschleunigung) | 0 | 0h | 0h | 0% |

### Erklärung der Kategorien

- **High (Faktor 0.20):** UI-Komponenten nach etabliertem Pattern, Config-Dateien, TypeScript Interfaces - KI kann 5x schneller helfen
- **Medium (Faktor 0.40):** WebSocket Integration, Session-Management, Event-Handling - KI hilft 2.5x schneller
- **Low (Faktor 0.70):** Integration-Tests, End-to-End Validation, Debugging - KI hilft 1.4x schneller
- **None (Faktor 1.00):** Nicht anwendbar für diese Spec

---

## Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Das etablierte Project-Selector Pattern reduziert den Aufwand für Story 1 erheblich
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)

---

## Empfehlung

**Geplanter Aufwand:** 8.7h (~1 Arbeitstag)
**Mit Puffer (+25%):** 10.9h (~1.4 Arbeitstage)

### Optimale Ausführungsreihenfolge

1. **Parallel starten:** MODSEL-001 (Frontend) + MODSEL-002 (Backend Config)
2. **Nach MODSEL-002:** MODSEL-003 (Backend Routing)
3. **Nach MODSEL-001 + MODSEL-003:** MODSEL-004 (Session Integration)
4. **Zuletzt:** MODSEL-999 (Integration & Validation)

**Geschätzte Kalenderzeit:** ~4 Stunden bei paralleler Ausführung von Story 1+2

---

*Erstellt mit Agent OS /create-spec v2.7*
