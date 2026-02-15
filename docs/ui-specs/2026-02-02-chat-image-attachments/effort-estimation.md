# Aufwandsschätzung: Chat Image Attachments

**Erstellt:** 2026-02-02
**Spec:** Chat Image Attachments
**Anzahl Stories:** 10 (7 Feature + 3 System)

---

## Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | 56h | 17h | 39h (70%) |
| **Arbeitstage** | 7d | 2.1d | 4.9d |
| **Arbeitswochen** | 1.4w | 0.4w | 1.0w |

### Was bedeutet das?

**Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

---

## Schätzung pro Story

| ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| CIMG-001 | Image Upload UI | S | 6h | high (0.20) | 1.2h | 4.8h |
| CIMG-002 | Image Staging Area | S | 6h | high (0.20) | 1.2h | 4.8h |
| CIMG-003 | Backend Image Storage | S | 6h | high (0.20) | 1.2h | 4.8h |
| CIMG-004 | WebSocket Image Protocol | M | 12h | medium (0.40) | 4.8h | 7.2h |
| CIMG-005 | Chat Message Image Display | S | 6h | high (0.20) | 1.2h | 4.8h |
| CIMG-006 | Image Lightbox | S | 4h | high (0.20) | 0.8h | 3.2h |
| CIMG-007 | Claude Vision Integration | S | 6h | high (0.20) | 1.2h | 4.8h |
| CIMG-997 | Code Review | S | 4h | none (1.00) | 4.0h | 0h |
| CIMG-998 | Integration Validation | S | 4h | low (0.70) | 2.8h | 1.2h |
| CIMG-999 | Finalize PR | XS | 2h | medium (0.40) | 0.8h | 1.2h |
| **TOTAL** | | | **56h** | | **17.2h** | **38.8h** |

---

## KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 6 | 34h | 6.8h | -80% |
| **Medium** (60% schneller) | 2 | 14h | 5.6h | -60% |
| **Low** (30% schneller) | 1 | 4h | 2.8h | -30% |
| **None** (keine Beschleunigung) | 1 | 4h | 4.0h | 0% |

### Erklärung der Kategorien

- **High (Faktor 0.20):** UI-Komponenten, CRUD-Services, Standard-Pattern - KI kann 5x schneller helfen
  - CIMG-001, 002, 003, 005, 006, 007: Standard Lit-Komponenten, File I/O, Event Handler

- **Medium (Faktor 0.40):** Full-Stack Integration, Protokoll-Design - KI hilft 2.5x schneller
  - CIMG-004: WebSocket Protocol erfordert koordinierte Frontend/Backend Änderungen
  - CIMG-999: PR-Erstellung ist teilautomatisiert

- **Low (Faktor 0.70):** Testing, Validierung - KI hilft 1.4x schneller
  - CIMG-998: Integration Tests erfordern manuelle Überprüfung

- **None (Faktor 1.00):** Code Review - menschliches Urteil erforderlich
  - CIMG-997: Architektur- und Qualitätsreview durch Menschen

---

## Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)

---

## Empfehlung

**Geplanter Aufwand:** 17h (2.1d / 0.4w)
**Mit Puffer (+25%):** 21h (2.6d / 0.5w)

---

*Erstellt mit Agent OS /create-spec v3.1*
