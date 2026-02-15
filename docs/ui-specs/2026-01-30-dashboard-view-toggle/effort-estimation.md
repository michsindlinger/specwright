# Aufwandsschaetzung: Dashboard View Toggle

**Erstellt:** 2026-01-30
**Spec:** DVT (Dashboard View Toggle)
**Anzahl Stories:** 4

---

## Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | 8h | 2.4h | 5.6h (70%) |
| **Arbeitstage** | 1d | 0.3d | 0.7d |
| **Arbeitswochen** | 0.2w | 0.06w | 0.14w |

### Was bedeutet das?

**Human-only:** So lange wuerde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstuetzung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich fuer Architektur, Code-Review und Qualitaetssicherung.

---

## Schaetzung pro Story

| ID | Story | Komplexitaet | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| DVT-001 | View Toggle Component | S | 3h | high (0.20) | 0.6h | 2.4h |
| DVT-002 | List View Implementation | S | 3h | high (0.20) | 0.6h | 2.4h |
| DVT-003 | View Preference Persistence | XS | 1h | high (0.20) | 0.2h | 0.8h |
| DVT-999 | Integration & E2E Validation | XS | 1h | none (1.00) | 1.0h | 0h |
| **TOTAL** | | | **8h** | | **2.4h** | **5.6h** |

---

## KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 3 | 7h | 1.4h | -80% |
| **Medium** (60% schneller) | 0 | 0h | 0h | -60% |
| **Low** (30% schneller) | 0 | 0h | 0h | -30% |
| **None** (keine Beschleunigung) | 1 | 1h | 1h | 0% |

### Erklaerung der Kategorien

- **High (Faktor 0.20):** DVT-001, DVT-002, DVT-003 - Standard UI-Komponenten, CSS-Styling, LocalStorage - KI kann 5x schneller helfen
- **None (Faktor 1.00):** DVT-999 - Manuelle Integration Tests, menschliches Urteil erforderlich

---

## Annahmen & Hinweise

- Schaetzungen basieren auf der Komplexitaetsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Qualitaetssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme koennen Aufwand erhoehen (+20-30% Puffer empfohlen)
- **Alle Stories sind Frontend-only** - keine Backend-Aenderungen erforderlich
- **Nur 2 Dateien betroffen:** dashboard-view.ts und theme.css

---

## Empfehlung

**Geplanter Aufwand:** 2.4h (0.3d / 0.06w)
**Mit Puffer (+25%):** 3h (0.4d / 0.08w)

---

*Erstellt mit Agent OS /create-spec v2.7*
