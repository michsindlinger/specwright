# Aufwandsschätzung: Multi-Project Support

**Erstellt:** 2026-01-30
**Spec:** multi-project-support
**Anzahl Stories:** 7

---

## 📊 Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | 54h | 19h | 35h (65%) |
| **Arbeitstage** | 6.75d | 2.4d | 4.35d |
| **Arbeitswochen** | 1.35w | 0.5w | 0.85w |

### Was bedeutet das?

**Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

---

## 📋 Schätzung pro Story

| ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| MPRO-001 | Tab-Navigation Component | S | 6h | high (0.20) | 1.2h | 4.8h |
| MPRO-002 | Project Add Modal | M | 12h | high (0.20) | 2.4h | 9.6h |
| MPRO-003 | Recently Opened Service | XS | 3h | high (0.20) | 0.6h | 2.4h |
| MPRO-004 | Backend Multi-Project Context | S | 6h | high (0.20) | 1.2h | 4.8h |
| MPRO-005 | WebSocket Multi-Connection | M | 12h | medium (0.40) | 4.8h | 7.2h |
| MPRO-006 | Project Context Switching | M | 12h | medium (0.40) | 4.8h | 7.2h |
| MPRO-999 | Integration & E2E Validation | M | 3h | none (1.00) | 3h | 0h |
| **TOTAL** | | | **54h** | | **18h** | **36h** |

---

## 🤖 KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 4 | 27h | 5.4h | -80% |
| **Medium** (60% schneller) | 2 | 24h | 9.6h | -60% |
| **Low** (30% schneller) | 0 | 0h | 0h | -30% |
| **None** (keine Beschleunigung) | 1 | 3h | 3h | 0% |

### Erklärung der Kategorien

- **High (Faktor 0.20):** Lit Components, Services, REST-Endpoints, CRUD-Operationen - KI kann 5x schneller helfen
  - MPRO-001: Standard Lit Component mit Events
  - MPRO-002: Modal mit File-Picker (bekanntes Pattern)
  - MPRO-003: Einfacher localStorage-Service
  - MPRO-004: Standard Express Routes + Service

- **Medium (Faktor 0.40):** WebSocket-Management, State-Synchronisation, Multi-Layer-Integration - KI hilft 2.5x schneller
  - MPRO-005: WebSocket-Management erfordert sorgfältige Connection-Handling
  - MPRO-006: Full-Stack Integration mit Race-Condition-Prevention

- **None (Faktor 1.00):** Integration Testing, E2E Validation - menschliches Urteil erforderlich
  - MPRO-999: Test-Szenarien erfordern manuelle Validierung

---

## 📈 Aufschlüsselung nach Story-Typ

| Typ | Stories | Human (h) | KI-Adjusted (h) |
|-----|---------|-----------|-----------------|
| Frontend | 4 | 33h | 9h |
| Backend | 2 | 18h | 6h |
| Test | 1 | 3h | 3h |

---

## ⚠️ Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)
- Die Schätzungen gehen von einem erfahrenen Entwickler aus
- Frontend-Stories profitieren stark von KI (bekannte Lit-Patterns)
- Backend-WebSocket-Integration hat mittlere Komplexität wegen Connection-Lifecycle

---

## 🎯 Empfehlung

**Geplanter Aufwand:** 18h (2.25d / ~0.5w)
**Mit Puffer (+25%):** 22.5h (2.8d / ~0.6w)

### Ausführungsreihenfolge (Optimiert)

**Phase 1 - Parallel (6h KI-adjusted):**
- MPRO-001: Tab-Navigation (Frontend)
- MPRO-003: Recently Opened Service (Frontend)
- MPRO-004: Backend Multi-Project Context (Backend)

**Phase 2 - Sequential (7.2h KI-adjusted):**
- MPRO-005: WebSocket Multi-Connection (nach MPRO-004)
- MPRO-002: Project Add Modal (nach MPRO-001, MPRO-003)

**Phase 3 - Integration (4.8h KI-adjusted):**
- MPRO-006: Project Context Switching (nach MPRO-001, MPRO-004, MPRO-005)

**Phase 4 - Validation (3h):**
- MPRO-999: Integration & E2E Validation (nach allen anderen)

---

*Erstellt mit Agent OS /create-spec v2.7*
