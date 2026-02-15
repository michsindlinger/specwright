# Aufwandsschätzung: Model Selection for Kanban Board

**Erstellt:** 2026-02-02
**Spec:** 2026-02-01-model-selection-kanban
**Anzahl Stories:** 7 (4 Feature + 3 System)

---

## 📊 Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | 18h | 6h | 12h (67%) |
| **Arbeitstage** | 2.3d | 0.8d | 1.5d |
| **Arbeitswochen** | 0.5w | 0.2w | 0.3w |

### Was bedeutet das?

**Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

**Hinweis:** Durch Wiederverwendung aus der Chat-Model-Selection Spec ist der Aufwand bereits reduziert!

---

## 📋 Schätzung pro Story

| ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| MSK-001 | Model Dropdown Component | S | 4h | high | 0.8h | 3.2h |
| MSK-002 | Kanban Markdown Model Column | S | 4h | high | 0.8h | 3.2h |
| MSK-003 | Workflow Executor Model Integration | S | 4h | medium | 1.6h | 2.4h |
| MSK-004 | Integration Testing | XS | 2h | none | 2h | 0h |
| MSK-997 | Code Review | XS | 2h | low | 0.4h | 1.6h |
| MSK-998 | Integration Validation | XS | 1h | high | 0.2h | 0.8h |
| MSK-999 | Finalize PR | XS | 1h | medium | 0.4h | 0.6h |
| **TOTAL** | | | **18h** | | **6.2h** | **11.8h** |

---

## 🤖 KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 3 | 9h | 1.8h | -80% |
| **Medium** (60% schneller) | 2 | 5h | 2h | -60% |
| **Low** (30% schneller) | 1 | 2h | 0.4h | -30% |
| **None** (keine Beschleunigung) | 1 | 2h | 2h | 0% |

### Erklärung der Kategorien

- **High (Faktor 0.20):** MSK-001, MSK-002, MSK-998 - Boilerplate, CRUD, Standard-Patterns
- **Medium (Faktor 0.40):** MSK-003, MSK-999 - Business-Logik, Integration
- **Low (Faktor 0.70):** MSK-997 - Code Review (menschliches Urteil wichtig)
- **None (Faktor 1.00):** MSK-004 - Manuelle QA Tests

---

## ⚠️ Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- **Wiederverwendung:** `model-config.ts` und `model-config.json` existieren bereits
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)

---

## 🎯 Empfehlung

**Geplanter Aufwand:** 6h (0.8d / 0.2w)
**Mit Puffer (+25%):** 8h (1d / 0.2w)

---

*Erstellt mit Agent OS /create-spec v3.1*
