# Aufwandsschätzung: Multi-Session Chat

**Erstellt:** 2026-01-30
**Spec:** Multi-Session Chat
**Anzahl Stories:** 7

---

## 📊 Zusammenfassung

| Metrik | Human-only | Human + KI Agent | Ersparnis |
|--------|------------|------------------|-----------|
| **Stunden** | 30h | 11h | 19h (63%) |
| **Arbeitstage** | 3.75d | 1.4d | 2.35d |
| **Arbeitswochen** | 0.75w | 0.28w | 0.47w |

### Was bedeutet das?

**Human-only:** So lange würde die Implementierung dauern, wenn ein Entwickler komplett manuell arbeitet (ohne KI-Unterstützung).

**Human + KI Agent:** So lange dauert es realistisch mit modernen KI-Werkzeugen (Claude Code, Cursor, GitHub Copilot, etc.). Der Entwickler bleibt verantwortlich für Architektur, Code-Review und Qualitätssicherung.

---

## 📋 Schätzung pro Story

| ID | Story | Komplexität | Human (h) | KI-Faktor | KI-Adjusted (h) | Ersparnis |
|----|-------|-------------|-----------|-----------|-----------------|-----------|
| MSC-002 | Session Types & Contracts | XS | 3h | High (0.20) | 0.6h | 2.4h |
| MSC-001 | Session Tab Bar Component | S | 6h | High (0.20) | 1.2h | 4.8h |
| MSC-003 | Session Persistence Service | S | 6h | High (0.20) | 1.2h | 4.8h |
| MSC-004 | Session State Management | S | 6h | Medium (0.40) | 2.4h | 3.6h |
| MSC-005 | WebSocket Multi-Session Routing | S | 6h | Medium (0.40) | 2.4h | 3.6h |
| MSC-006 | Session Archive Feature | S | 6h | Medium (0.40) | 2.4h | 3.6h |
| MSC-999 | Integration & Validation | S | 3h | Low (0.70) | 2.1h | 0.9h |
| **TOTAL** | | | **36h** | | **12.3h** | **23.7h** |

---

## 🤖 KI-Beschleunigung nach Kategorie

| Kategorie | Stories | Human (h) | KI-Adjusted (h) | Reduktion |
|-----------|---------|-----------|-----------------|-----------|
| **High** (80% schneller) | 3 | 15h | 3h | -80% |
| **Medium** (60% schneller) | 3 | 18h | 7.2h | -60% |
| **Low** (30% schneller) | 1 | 3h | 2.1h | -30% |
| **None** (keine Beschleunigung) | 0 | 0h | 0h | 0% |

### Erklärung der Kategorien

- **High (Faktor 0.20):** MSC-002 (Types), MSC-001 (UI Components), MSC-003 (CRUD Service)
  - Boilerplate-Code, Standard-Patterns, Type-Definitionen
  - KI kann diese sehr effizient generieren

- **Medium (Faktor 0.40):** MSC-004, MSC-005, MSC-006
  - State Management, WebSocket-Routing, Business-Logik
  - KI hilft signifikant, aber mehr menschliche Überprüfung nötig

- **Low (Faktor 0.70):** MSC-999
  - Integration Tests, End-to-End Validierung
  - Erfordert menschliches Verständnis des Gesamtsystems

---

## 📅 Empfohlene Ausführungsreihenfolge

```
Tag 1 (Morning):  MSC-002 Types (0.6h)
Tag 1 (Parallel): MSC-001 Tab UI + MSC-003 Persistence (1.2h + 1.2h)
Tag 1 (After):    MSC-004 State Management (2.4h)
                  ─────────────────────────────────────
Tag 2 (Morning):  MSC-005 WebSocket Routing (2.4h)
Tag 2 (After):    MSC-006 Archive Feature (2.4h)
Tag 2 (End):      MSC-999 Integration Tests (2.1h)
```

---

## ⚠️ Annahmen & Hinweise

- Schätzungen basieren auf der Komplexitätsbewertung des Architects
- KI-Faktoren setzen aktive Nutzung von AI-Tools voraus (Claude Code, Cursor, etc.)
- Qualitätssicherung und Code-Review bleiben unverändert wichtig
- Unvorhergesehene Probleme können Aufwand erhöhen (+20-30% Puffer empfohlen)
- Parallele Ausführung von MSC-001 und MSC-003 spart zusätzlich Zeit

---

## 🎯 Empfehlung

**Geplanter Aufwand:** 12h (1.5 Arbeitstage)
**Mit Puffer (+25%):** 15h (2 Arbeitstage)

**Empfohlenes Team:**
- 1 Frontend-Developer (MSC-001, MSC-004, MSC-006)
- 1 Backend-Developer (MSC-002, MSC-003, MSC-005)
- QA-Specialist (MSC-999)

Bei paralleler Arbeit von Frontend + Backend: **~1 Arbeitstag** realistisch.

---

*Erstellt mit Agent OS /create-spec v2.7*
