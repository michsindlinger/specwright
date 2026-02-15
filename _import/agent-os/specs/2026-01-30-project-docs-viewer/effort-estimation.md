# Aufwandsschätzung: Project Docs Viewer/Editor

**Erstellt:** 2026-01-30
**Spec:** Project Docs Viewer/Editor (PDOC)
**Anzahl Stories:** 6

---

## 📊 Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | 28h | 9.6h | 18.4h (66%) |
| **Arbeitstage** | 3.5d | 1.2d | 2.3d |
| **Arbeitswochen** | 0.7w | 0.24w | 0.46w |

### Was bedeutet das?

**Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

---

## 📋 Schätzung pro Story

| ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| PDOC-001 | Backend Docs API | S | 6h | high (0.20) | 1.2h | 4.8h |
| PDOC-002 | Docs Sidebar Component | S | 4h | high (0.20) | 0.8h | 3.2h |
| PDOC-003 | Docs Viewer Component | S | 6h | high (0.20) | 1.2h | 4.8h |
| PDOC-004 | Docs Editor Component | M | 8h | medium (0.40) | 3.2h | 4.8h |
| PDOC-005 | Dashboard Integration | S | 4h | high (0.20) | 0.8h | 3.2h |
| PDOC-999 | Integration & E2E Validation | S | 2h | low (0.70) | 1.4h | 0.6h |
| **TOTAL** | | | **30h** | | **8.6h** | **21.4h** |

---

## 🤖 KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 4 | 20h | 4.0h | -80% |
| **Medium** (60% schneller) | 1 | 8h | 3.2h | -60% |
| **Low** (30% schneller) | 1 | 2h | 1.4h | -30% |
| **None** (keine Beschleunigung) | 0 | 0h | 0h | 0% |

### Erklärung der Kategorien

- **High (Faktor 0.20):** PDOC-001, PDOC-002, PDOC-003, PDOC-005 - Boilerplate, Standard Lit-Komponenten, CRUD API, Pattern-Wiederverwendung
- **Medium (Faktor 0.40):** PDOC-004 - CodeMirror Integration erfordert mehr Setup und Konfiguration
- **Low (Faktor 0.70):** PDOC-999 - Manuelle E2E-Tests, menschliches Urteil für Validierung
- **None (Faktor 1.00):** Keine Stories in dieser Kategorie

---

## ⚠️ Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)
- **PDOC-001** ist kritischer Pfad - alle Frontend-Stories hängen davon ab
- **PDOC-002** und **PDOC-003** können parallel entwickelt werden nach PDOC-001

---

## 🎯 Empfehlung

**Geplanter Aufwand:** 8.6h (1.1d / 0.2w)
**Mit Puffer (+25%):** 10.8h (1.35d / 0.27w)

### Optimaler Execution Plan

1. **Tag 1 (4h):** PDOC-001 Backend Docs API
2. **Tag 1-2 (2h parallel):** PDOC-002 + PDOC-003 (können parallel laufen)
3. **Tag 2 (3h):** PDOC-004 Docs Editor
4. **Tag 2 (1h):** PDOC-005 Dashboard Integration
5. **Tag 2 (1h):** PDOC-999 Integration Validation

**Geschätzte Gesamtdauer:** 1-2 Arbeitstage

---

*Erstellt mit Agent OS /create-spec v2.7*
