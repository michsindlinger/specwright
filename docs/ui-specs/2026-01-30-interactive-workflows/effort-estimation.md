# Aufwandsschätzung: Interactive Workflows

**Erstellt:** 2026-01-30
**Spec:** Interactive Workflows
**Anzahl Stories:** 9

---

## 📊 Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | 44h | 16h | 28h (64%) |
| **Arbeitstage** | 5.5d | 2d | 3.5d |
| **Arbeitswochen** | 1.1w | 0.4w | 0.7w |

### Was bedeutet das?

**Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

---

## 📋 Schätzung pro Story

| ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| WKFL-001 | Workflow-Start über Karten | S | 6h | high | 1.2h | 4.8h |
| WKFL-002 | AskUserQuestion UI | M | 12h | high | 2.4h | 9.6h |
| WKFL-003 | Workflow-Progress-Indikator | S | 6h | high | 1.2h | 4.8h |
| WKFL-004 | Embedded Docs-Viewer | M | 12h | medium | 4.8h | 7.2h |
| WKFL-005 | Collapsible Long Text | S | 6h | high | 1.2h | 4.8h |
| WKFL-006 | Error-Handling & Cancel | S | 6h | medium | 2.4h | 3.6h |
| WKFL-007 | Minimal Tool-Activity | XS | 3h | high | 0.6h | 2.4h |
| WKFL-008 | Backend Workflow-Interaction | M | 12h | medium | 4.8h | 7.2h |
| WKFL-999 | Integration & E2E Validation | S | 6h | low | 4.2h | 1.8h |
| **TOTAL** | | | **69h** | | **22.8h** | **46.2h** |

---

## 🤖 KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 5 | 33h | 6.6h | -80% |
| **Medium** (60% schneller) | 3 | 30h | 12h | -60% |
| **Low** (30% schneller) | 1 | 6h | 4.2h | -30% |
| **None** (keine Beschleunigung) | 0 | 0h | 0h | 0% |

### Erklärung der Kategorien

- **High (Faktor 0.20):** Boilerplate, CRUD, Tests, Dokumentation - KI kann 5x schneller helfen
  - WKFL-001, WKFL-002, WKFL-003, WKFL-005, WKFL-007: Neue Lit-Komponenten mit klaren Anforderungen

- **Medium (Faktor 0.40):** Business-Logik, State Management, API-Integration - KI hilft 2.5x schneller
  - WKFL-004: Docs-Viewer Integration erfordert existierende Komponenten-Analyse
  - WKFL-006: Error-Handling mit Full-Stack Koordination
  - WKFL-008: Backend WebSocket-Erweiterung mit Claude CLI Integration

- **Low (Faktor 0.70):** Neue Technologien, komplexe Bugs, Architektur - KI hilft 1.4x schneller
  - WKFL-999: Integration Tests erfordern manuelle Validierung und E2E-Szenarien

- **None (Faktor 1.00):** QA, Design-Entscheidungen, Code-Review - menschliches Urteil erforderlich
  - (keine Stories in dieser Kategorie)

---

## ⚠️ Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)
- WKFL-008 erfordert Verständnis des Claude CLI Stream-JSON Formats
- WKFL-004 und WKFL-006 sind Full-Stack und erfordern Frontend-Backend Koordination

---

## 🎯 Empfehlung

**Geplanter Aufwand:** 23h (3d / 0.5w)
**Mit Puffer (+25%):** 29h (4d / 0.8w)

**Kritischer Pfad:**
1. WKFL-008 (Backend) parallel zu WKFL-001 (Frontend) - beide blockieren restliche Stories
2. WKFL-002 (AskUserQuestion UI) - Kernfunktionalität für Interaktion
3. WKFL-999 (Integration) - abschließende Validierung

**Empfohlene Ausführungsreihenfolge:**
- Phase 1: WKFL-008 + WKFL-001 (parallel)
- Phase 2: WKFL-002 + WKFL-003 + WKFL-006 (parallel)
- Phase 3: WKFL-004 + WKFL-005 + WKFL-007 (parallel)
- Phase 4: WKFL-999

---

*Erstellt mit Agent OS /create-spec v2.7*
