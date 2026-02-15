# Aufwandsschätzung: Workflow Multi-Question Protocol

**Erstellt:** 2026-01-30
**Spec:** MQP (Workflow Multi-Question Protocol)
**Anzahl Stories:** 6

---

## 📊 Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | 24h | 8h | 16h (67%) |
| **Arbeitstage** | 3d | 1d | 2d |
| **Arbeitswochen** | 0.6w | 0.2w | 0.4w |

### Was bedeutet das?

**Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

---

## 📋 Schätzung pro Story

| ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| MQP-001 | Backend Question Collection | S | 4h | high (0.20) | 0.8h | 3.2h |
| MQP-002 | Backend Batch Detection & Sending | S | 4h | high (0.20) | 0.8h | 3.2h |
| MQP-003 | Backend Text Suppression | XS | 2h | high (0.20) | 0.4h | 1.6h |
| MQP-004 | Frontend Multi-Tab Question Component | M | 8h | medium (0.40) | 3.2h | 4.8h |
| MQP-005 | Frontend Integration | S | 4h | high (0.20) | 0.8h | 3.2h |
| MQP-999 | Integration & End-to-End Validation | S | 2h | none (1.00) | 2h | 0h |
| **TOTAL** | | | **24h** | | **8h** | **16h** |

---

## 🤖 KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 4 | 14h | 2.8h | -80% |
| **Medium** (60% schneller) | 1 | 8h | 3.2h | -60% |
| **Low** (30% schneller) | 0 | 0h | 0h | -30% |
| **None** (keine Beschleunigung) | 1 | 2h | 2h | 0% |

### Erklärung der Kategorien

- **High (Faktor 0.20):** Boilerplate, CRUD, Tests, Dokumentation - KI kann 5x schneller helfen
  - MQP-001, MQP-002, MQP-003: Backend TypeScript mit klaren Patterns
  - MQP-005: Frontend Integration mit existierendem Pattern

- **Medium (Faktor 0.40):** Business-Logik, State Management, API-Integration - KI hilft 2.5x schneller
  - MQP-004: Frontend Komponente mit UI-Logik und State

- **Low (Faktor 0.70):** Neue Technologien, komplexe Bugs, Architektur - KI hilft 1.4x schneller
  - Keine Stories in dieser Kategorie

- **None (Faktor 1.00):** QA, Design-Entscheidungen, Code-Review - menschliches Urteil erforderlich
  - MQP-999: Integration Testing erfordert manuelles Testen

---

## ⚠️ Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)
- Backend-Stories (MQP-001, 002, 003) können teilweise parallel entwickelt werden
- Frontend-Stories (MQP-004, 005) haben sequentielle Abhängigkeit

---

## 🎯 Empfehlung

**Geplanter Aufwand:** 8h (1 Arbeitstag)
**Mit Puffer (+25%):** 10h (1.25 Arbeitstage)

**Execution Strategy:**
1. Phase 1 (Parallel): MQP-001 + MQP-004 gleichzeitig starten
2. Phase 2 (Nach MQP-001): MQP-002, MQP-003
3. Phase 3 (Nach MQP-004): MQP-005
4. Phase 4 (Abschluss): MQP-999 Integration Test

---

*Erstellt mit Agent OS /create-spec v2.7*
