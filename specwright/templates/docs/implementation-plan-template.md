# Implementierungsplan: [SPEC_NAME]

> **Status:** [DRAFT / UNDER_REVIEW / APPROVED]
> **Spec:** [SPEC_PATH]
> **Erstellt:** [DATE]
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

[2-3 Sätze: Was wird gebaut, für wen, und warum ist es wertvoll]

---

## Architektur-Entscheidungen

### Gewählter Ansatz
[Beschreibung des architektonischen Ansatzes]

### Begründung
[Warum dieser Ansatz und nicht Alternativen]

### Patterns & Technologien
- **Pattern:** [z.B. Repository Pattern, Observer, etc.]
- **Technologie:** [z.B. React Query, Zustand, etc.]
- **Begründung:** [Warum diese Wahl]

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| [NAME] | [UI/Service/API/...] | [Was macht sie] |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| [NAME] | [Erweitern/Refactoren/...] | [Warum] |

### Nicht betroffen (explizit)
[Komponenten die NICHT geändert werden, zur Klarheit]

---

## Umsetzungsphasen

### Phase 1: [NAME]
**Ziel:** [Was wird erreicht]
**Komponenten:** [Liste]
**Abhängig von:** Nichts (Startphase)

### Phase 2: [NAME]
**Ziel:** [Was wird erreicht]
**Komponenten:** [Liste]
**Abhängig von:** Phase 1

### Phase 3: Integration & Validation
**Ziel:** Alles zusammenführen und testen
**Komponenten:** [Integrationspunkte]
**Abhängig von:** Alle vorherigen Phasen

---

## Komponenten-Verbindungen (KRITISCH)

> **Zweck:** Explizit definieren WIE Komponenten miteinander verbunden werden.
> Jede Verbindung MUSS einer Story zugeordnet sein.

### Verbindungs-Matrix

| Source | Target | Verbindungsart | Zuständige Story | Validierung |
|--------|--------|----------------|------------------|-------------|
| [Komponente A] | [Komponente B] | [API Call / Import / Event / etc.] | [STORY-ID] | [Wie prüfen] |
| [Service X] | [Component Y] | [Hook / Context / Props] | [STORY-ID] | [grep/test] |

### Verbindungs-Details

**[VERBINDUNG-1]: [Source] → [Target]**
- **Art:** [z.B. REST API Call, Direct Import, Event Bus, Context Provider]
- **Schnittstelle:** [z.B. `GET /api/users`, `import { useUser } from...`]
- **Datenfluss:** [Was wird übertragen]
- **Story:** [STORY-ID] - Diese Story MUSS die Verbindung herstellen
- **Validierung:** `[Bash-Befehl zum Prüfen, z.B. grep -r "import.*ServiceName"]`

**[VERBINDUNG-2]: [Source] → [Target]**
- **Art:** [...]
- **Schnittstelle:** [...]
- **Datenfluss:** [...]
- **Story:** [STORY-ID]
- **Validierung:** `[...]`

### Verbindungs-Checkliste
- [ ] Jede neue Komponente hat mindestens eine Verbindung definiert
- [ ] Jede Verbindung ist einer Story zugeordnet
- [ ] Validierungsbefehle sind ausführbar

---

## Abhängigkeiten

### Interne Abhängigkeiten
```
[Komponente A] ──depends on──> [Komponente B]
[Komponente C] ──uses──> [Shared Service]
```

### Externe Abhängigkeiten
- [Library/API]: [Wofür benötigt]

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| [RISIKO] | [Low/Med/High] | [Low/Med/High] | [Maßnahme] |

---

## Self-Review Ergebnisse

### Validiert
- [Was geprüft wurde und OK ist]

### Identifizierte Probleme & Lösungen
| Problem | Ursprünglicher Plan | Verbesserung |
|---------|--------------------|--------------|
| [PROBLEM] | [Was geplant war] | [Bessere Lösung] |

### Offene Fragen
- [Falls noch Klärungsbedarf]

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| [Pattern/Code] | `[Datei]` | [Komponente] |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| [Plan A] | [Plan B] | [Weniger Code/Aufwand] |

### Feature-Preservation bestätigt
- [ ] Alle Requirements aus Clarification sind abgedeckt
- [ ] Kein Feature wurde geopfert
- [ ] Alle Akzeptanzkriterien bleiben erfüllbar

---

## Nächste Schritte

Nach Genehmigung dieses Plans:
1. Step 2.6: User Stories aus diesem Plan ableiten
2. Step 3: Architect fügt technische Details hinzu
3. Step 4: Spec ready for execution
