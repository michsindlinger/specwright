# Aufwandsschätzung: Multi-Command Execution

**Erstellt:** 2026-01-30
**Spec:** Multi-Command Execution (MCE)
**Anzahl Stories:** 7

---

## Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | 26h | 8h | 18h (69%) |
| **Arbeitstage** | 3.3d | 1d | 2.3d |
| **Arbeitswochen** | 0.7w | 0.2w | 0.5w |

### Was bedeutet das?

**Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

---

## Schätzung pro Story

| ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| MCE-001 | Workflow Tab Bar Component | S | 6h | high | 1.2h | 4.8h |
| MCE-002 | Multi-Execution State Management | S | 6h | high | 1.2h | 4.8h |
| MCE-003 | Tab Status Indicators | XS | 3h | high | 0.6h | 2.4h |
| MCE-004 | Command Selector Enhancement | XS | 3h | high | 0.6h | 2.4h |
| MCE-005 | Tab Close & Cancel Logic | XS | 3h | medium | 1.2h | 1.8h |
| MCE-006 | Background Notifications | XS | 3h | high | 0.6h | 2.4h |
| MCE-999 | Integration & E2E Validation | S | 2h | low | 1.4h | 0.6h |
| **TOTAL** | | | **26h** | | **6.8h** | **19.2h** |

---

## KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 5 | 21h | 4.2h | -80% |
| **Medium** (60% schneller) | 1 | 3h | 1.2h | -60% |
| **Low** (30% schneller) | 1 | 2h | 1.4h | -30% |
| **None** (keine Beschleunigung) | 0 | 0h | 0h | 0% |

### Erklärung der Kategorien

- **High (Faktor 0.20):** Boilerplate, CRUD, UI-Komponenten, State Management - KI kann 5x schneller helfen
  - MCE-001: Standard Lit Component (Tab-Leiste)
  - MCE-002: State Management (Map-basierter Store)
  - MCE-003: CSS Styling (Status-Indikatoren)
  - MCE-004: Dropdown-Komponente (bekanntes Pattern)
  - MCE-006: Badge/Notification (CSS + einfache Logik)

- **Medium (Faktor 0.40):** Business-Logik mit Nebenwirkungen - KI hilft 2.5x schneller
  - MCE-005: Close/Cancel Logic (WebSocket-Integration, Dialog-Handling)

- **Low (Faktor 0.70):** Manuelle Verifikation, Debugging - KI hilft 1.4x schneller
  - MCE-999: Integration Testing (manueller E2E-Test)

- **None (Faktor 1.00):** Nicht anwendbar für dieses Spec

---

## Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)
- **Frontend-heavy Spec:** 6 von 7 Stories sind Frontend-only, was hohe KI-Beschleunigung ermöglicht
- **Bestehende Patterns:** Lit Component Patterns bereits im Projekt vorhanden (workflow-chat.ts, etc.)

---

## Empfehlung

**Geplanter Aufwand:** 7h (0.9d / 0.2w)
**Mit Puffer (+25%):** 9h (1.1d / 0.2w)

---

## Story-Abhängigkeiten (Execution Order)

```
Phase 1 (parallel):
├── MCE-001: Tab Bar Component (1.2h)
└── MCE-003: Status Indicators (0.6h)

Phase 2 (nach Phase 1):
└── MCE-002: State Management (1.2h)

Phase 3 (nach Phase 2, parallel):
├── MCE-004: Command Selector (0.6h)
├── MCE-005: Close/Cancel Logic (1.2h)
└── MCE-006: Notifications (0.6h)

Phase 4 (nach Phase 3):
└── MCE-999: Integration Validation (1.4h)
```

**Kritischer Pfad:** MCE-001 → MCE-002 → MCE-005 → MCE-999 = 5h

---

*Erstellt mit Agent OS /create-spec v2.7*
