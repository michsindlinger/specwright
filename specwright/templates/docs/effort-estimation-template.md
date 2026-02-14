# Aufwandsschätzung: [SPEC_NAME]

**Erstellt:** [DATE]
**Spec:** [SPEC_NAME]
**Anzahl Stories:** [N]

---

## 📊 Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | [HUMAN_HOURS]h | [AI_HOURS]h | [SAVED_HOURS]h ([SAVED_PERCENT]%) |
| **Arbeitstage** | [HUMAN_DAYS]d | [AI_DAYS]d | [SAVED_DAYS]d |
| **Arbeitswochen** | [HUMAN_WEEKS]w | [AI_WEEKS]w | [SAVED_WEEKS]w |

### Was bedeutet das?

**Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

---

## 📋 Schätzung pro Story

| ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| [STORY_ID] | [STORY_TITLE] | [COMPLEXITY] | [HUMAN_H] | [AI_FACTOR] | [AI_H] | [SAVED_H] |
| **TOTAL** | | | **[TOTAL_HUMAN]h** | | **[TOTAL_AI]h** | **[TOTAL_SAVED]h** |

---

## 🤖 KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | [N_HIGH] | [H_HIGH]h | [AI_HIGH]h | -80% |
| **Medium** (60% schneller) | [N_MED] | [H_MED]h | [AI_MED]h | -60% |
| **Low** (30% schneller) | [N_LOW] | [H_LOW]h | [AI_LOW]h | -30% |
| **None** (keine Beschleunigung) | [N_NONE] | [H_NONE]h | [H_NONE]h | 0% |

### Erklärung der Kategorien

- **High (Faktor 0.20):** Boilerplate, CRUD, Tests, Dokumentation - KI kann 5x schneller helfen
- **Medium (Faktor 0.40):** Business-Logik, State Management, API-Integration - KI hilft 2.5x schneller
- **Low (Faktor 0.70):** Neue Technologien, komplexe Bugs, Architektur - KI hilft 1.4x schneller
- **None (Faktor 1.00):** QA, Design-Entscheidungen, Code-Review - menschliches Urteil erforderlich

---

## ⚠️ Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)

---

## 🎯 Empfehlung

**Geplanter Aufwand:** [AI_HOURS]h ([AI_DAYS]d / [AI_WEEKS]w)
**Mit Puffer (+25%):** [BUFFERED_HOURS]h ([BUFFERED_DAYS]d / [BUFFERED_WEEKS]w)

---

*Erstellt mit Specwright /create-spec v2.7*
