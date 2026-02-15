# Aufwandsschätzung: Agent OS Web UI

**Erstellt:** 2026-01-30
**Spec:** Agent OS Web UI
**Anzahl Stories:** 7

---

## Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | 48h | 16h | 32h (67%) |
| **Arbeitstage** | 6d | 2d | 4d |
| **Arbeitswochen** | 1.2w | 0.4w | 0.8w |

### Was bedeutet das?

**Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

---

## Schätzung pro Story

| ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| AOSUI-001 | Backend Setup | S | 6h | High (0.20) | 1.2h | 4.8h |
| AOSUI-002 | Frontend Scaffold | S | 6h | High (0.20) | 1.2h | 4.8h |
| AOSUI-003 | Projekt-Verwaltung | S | 6h | High (0.20) | 1.2h | 4.8h |
| AOSUI-004 | Chat Interface | M | 12h | Medium (0.40) | 4.8h | 7.2h |
| AOSUI-005 | Workflow Execution | M | 12h | Medium (0.40) | 4.8h | 7.2h |
| AOSUI-006 | Dashboard View | M | 12h | Medium (0.40) | 4.8h | 7.2h |
| AOSUI-007 | Integration & Polish | S | 6h | Medium (0.40) | 2.4h | 3.6h |
| **TOTAL** | | | **60h** | | **20.4h** | **39.6h** |

---

## KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 3 | 18h | 3.6h | -80% |
| **Medium** (60% schneller) | 4 | 42h | 16.8h | -60% |
| **Low** (30% schneller) | 0 | 0h | 0h | - |
| **None** (keine Beschleunigung) | 0 | 0h | 0h | - |

### Erklärung der Kategorien

- **High (Faktor 0.20):** Boilerplate, CRUD, Setup, Konfiguration - KI kann 5x schneller helfen
  - AOSUI-001: Express/WebSocket Setup ist Standard-Boilerplate
  - AOSUI-002: Vite/Lit Scaffold ist gut dokumentiert
  - AOSUI-003: Config + Dropdown ist straightforward

- **Medium (Faktor 0.40):** Business-Logik, State Management, API-Integration - KI hilft 2.5x schneller
  - AOSUI-004: Chat mit Streaming erfordert State-Koordination
  - AOSUI-005: Workflow-Management mit Abort ist komplexer
  - AOSUI-006: Kanban-Parsing und UI-State Koordination
  - AOSUI-007: Integration erfordert Debugging und Feinschliff

- **Low (Faktor 0.70):** Neue Technologien, komplexe Bugs - nicht zutreffend
- **None (Faktor 1.00):** Manuelle QA, Design-Entscheidungen - nicht zutreffend

---

## Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)
- Neues Projekt Setup (kein existierender Code) beschleunigt High-Kategorie zusätzlich

---

## Empfehlung

**Geplanter Aufwand:** 20h (2.5d / 0.5w)
**Mit Puffer (+25%):** 25h (3d / 0.6w)

**Optimaler Ansatz:**
1. **Phase 1** (parallel): AOSUI-001 + AOSUI-002 → ~2.5h
2. **Phase 2**: AOSUI-003 → ~1.2h
3. **Phase 3** (parallel): AOSUI-004 + AOSUI-005 + AOSUI-006 → ~5h
4. **Phase 4**: AOSUI-007 → ~2.4h

**Gesamt mit Parallelisierung:** ~11h effektive Arbeitszeit

---

*Erstellt mit Agent OS /create-spec v2.7*
