# Aufwandsschätzung: Cloud Code Terminal

**Erstellt:** 2026-02-05
**Spec:** Cloud Code Terminal
**Anzahl Stories:** 9

---

## 📊 Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | 72h | 29h | 43h (60%) |
| **Arbeitstage** | 9d | 4d | 5d |
| **Arbeitswochen** | 2w | 1w | 1w |

### Was bedeutet das?

**Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

---

## 📋 Schätzung pro Story

| ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| CCT-001 | Backend Cloud Terminal Infrastructure | M | 16h | Medium (0.40) | 6h | 10h |
| CCT-002 | Frontend Sidebar Container | M | 12h | Medium (0.40) | 5h | 7h |
| CCT-003 | Terminal Session Component | M | 12h | Medium (0.40) | 5h | 7h |
| CCT-004 | Session Persistence | M | 12h | Medium (0.40) | 5h | 7h |
| CCT-005 | Model Selection Integration | S | 6h | High (0.20) | 1h | 5h |
| CCT-006 | Polish & Edge Cases | S | 6h | Medium (0.40) | 2h | 4h |
| CCT-997 | Code Review | S | 4h | Low (0.70) | 3h | 1h |
| CCT-998 | Integration Validation | S | 4h | Low (0.70) | 3h | 1h |
| CCT-999 | Finalize PR | S | 4h | High (0.20) | 1h | 3h |
| **TOTAL** | | | **72h** | | **29h** | **43h** |

---

## 🤖 KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 2 | 10h | 2h | -80% |
| **Medium** (60% schneller) | 5 | 58h | 23h | -60% |
| **Low** (30% schneller) | 2 | 8h | 6h | -30% |
| **None** (keine Beschleunigung) | 0 | 0h | 0h | 0% |

### Erklärung der Kategorien

- **High (Faktor 0.20):** Boilerplate, CRUD, Tests, Dokumentation - KI kann 5x schneller helfen
- **Medium (Faktor 0.40):** Business-Logik, State Management, API-Integration - KI hilft 2.5x schneller
- **Low (Faktor 0.70):** Neue Technologien, komplexe Bugs, Architektur - KI hilft 1.4x schneller
- **None (Faktor 1.00):** QA, Design-Entscheidungen, Code-Review - menschliches Urteil erforderlich

---

## ⚠️ Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)

---

## 🎯 Empfehlung

**Geplanter Aufwand:** 29h (4d / 1w)
**Mit Puffer (+25%):** 36h (5d / 1w)

---

*Erstellt mit Agent OS /create-spec v3.3*
