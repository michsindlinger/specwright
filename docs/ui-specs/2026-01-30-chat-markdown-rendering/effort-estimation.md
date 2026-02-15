# Aufwandsschätzung: Chat Markdown Rendering

**Erstellt:** 2026-01-30
**Spec:** Chat Markdown Rendering (CMDR)
**Anzahl Stories:** 6

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
| CMDR-001 | Markdown Parser Integration | M | 12h | high (0.20) | 2.4h | 9.6h |
| CMDR-002 | Markdown Styling | S | 6h | high (0.20) | 1.2h | 4.8h |
| CMDR-003 | Enhanced Copy Code Feature | XS | 3h | high (0.20) | 0.6h | 2.4h |
| CMDR-004 | Mermaid Integration | S | 6h | medium (0.40) | 2.4h | 3.6h |
| CMDR-005 | Streaming Optimization | S | 6h | medium (0.40) | 2.4h | 3.6h |
| CMDR-999 | Integration & E2E Validation | S | 3h | none (1.00) | 3.0h | 0h |
| **TOTAL** | | | **36h** | | **12h** | **24h** |

---

## KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 3 | 21h | 4.2h | -80% |
| **Medium** (60% schneller) | 2 | 12h | 4.8h | -60% |
| **Low** (30% schneller) | 0 | 0h | 0h | -30% |
| **None** (keine Beschleunigung) | 1 | 3h | 3h | 0% |

### Erklärung der Kategorien

- **High (Faktor 0.20):** Boilerplate, CRUD, Tests, Dokumentation - KI kann 5x schneller helfen
  - CMDR-001: Standard marked-Integration, Pattern bereits in aos-docs-viewer vorhanden
  - CMDR-002: CSS-Styling nach etabliertem Pattern
  - CMDR-003: Kleine UI-Erweiterung

- **Medium (Faktor 0.40):** Business-Logik, State Management, API-Integration - KI hilft 2.5x schneller
  - CMDR-004: Mermaid-Integration erfordert Verständnis von async rendering
  - CMDR-005: Streaming-Optimierung erfordert Performance-Überlegungen

- **Low (Faktor 0.70):** Neue Technologien, komplexe Bugs, Architektur - KI hilft 1.4x schneller
  - Keine Stories in dieser Kategorie

- **None (Faktor 1.00):** QA, Design-Entscheidungen, Code-Review - menschliches Urteil erforderlich
  - CMDR-999: Integration-Validierung erfordert manuelles Testing

---

## Story-Details

### CMDR-001: Markdown Parser Integration (M)
- **Human Baseline:** 12h (Komplexität M = 8-16h, Median 12h)
- **KI-Kategorie:** High
- **Begründung:** Existierende Referenz-Implementation in aos-docs-viewer.ts, Standard-Pattern
- **Hauptarbeit:** Neue Utility erstellen, chat-message.ts refactoren

### CMDR-002: Markdown Styling (S)
- **Human Baseline:** 6h (Komplexität S = 4-8h, Median 6h)
- **KI-Kategorie:** High
- **Begründung:** CSS nach etabliertem Pattern, Custom Properties vorhanden
- **Hauptarbeit:** CSS-Erweiterungen in theme.css

### CMDR-003: Enhanced Copy Code Feature (XS)
- **Human Baseline:** 3h (Komplexität XS = 2-4h, Median 3h)
- **KI-Kategorie:** High
- **Begründung:** Kleine Erweiterung, Clipboard API Standard
- **Hauptarbeit:** Button-States, Feedback-Animation

### CMDR-004: Mermaid Integration (S)
- **Human Baseline:** 6h (Komplexität S = 4-8h, Median 6h)
- **KI-Kategorie:** Medium
- **Begründung:** Neue Library, async rendering, Dark Theme Konfiguration
- **Hauptarbeit:** Mermaid-Setup, Post-render Hook, Error Handling

### CMDR-005: Streaming Optimization (S)
- **Human Baseline:** 6h (Komplexität S = 4-8h, Median 6h)
- **KI-Kategorie:** Medium
- **Begründung:** Performance-Optimierung, Debouncing-Logik
- **Hauptarbeit:** requestAnimationFrame, unvollständige Block-Detection

### CMDR-999: Integration & E2E Validation (S)
- **Human Baseline:** 3h (nur Validation)
- **KI-Kategorie:** None
- **Begründung:** Manuelles Testing, visuelle Verifikation erforderlich
- **Hauptarbeit:** Browser-Tests, Smoke-Tests

---

## Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)
- Existierende Infrastruktur (marked, highlight.js) reduziert Setup-Zeit

---

## Empfehlung

**Geplanter Aufwand:** 12h (1.5d)
**Mit Puffer (+25%):** 15h (1.9d)

**Ausführungsreihenfolge:**
1. CMDR-001 zuerst (Foundation)
2. CMDR-002, 003, 004, 005 parallel
3. CMDR-999 zum Schluss (Validation)

---

*Erstellt mit Agent OS /create-spec v2.7*
