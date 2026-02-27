# Delete-Funktionalität - REST DELETE mit Confirmation Dialog

> Story ID: CTM-005
> Spec: Custom Team Members
> Created: 2026-02-26
> Last Updated: 2026-02-26

**Priority**: High
**Type**: Frontend
**Estimated Effort**: XS
**Dependencies**: CTM-001, CTM-003

---

## Feature

```gherkin
Feature: Skill-Löschung mit Bestätigungsdialog
  Als Specwright-Nutzer
  möchte ich ein Teammitglied löschen können,
  damit ich mein Team aktuell halten kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Delete mit Confirmation

```gherkin
Scenario: Löschen eines Custom-Skills mit Bestätigung
  Given ich bin auf der Team-Seite
  And ich sehe einen Custom-Skill "Steuerberater"
  When ich auf den Delete-Button klicke
  Then erscheint ein Bestätigungsdialog "Möchten Sie diesen Skill wirklich löschen?"
  And ich bestätige die Löschung
  Then wird der Skill gelöscht
  And die Team-Seite aktualisiert sich
```

### Szenario 2: Delete abbrechen

```gherkin
Scenario: Abbrechen der Löschung
  Given der Bestätigungsdialog ist geöffnet
  When ich auf "Abbrechen" klicke
  Then schließt sich der Dialog
  And der Skill bleibt erhalten
```

### Szenario 3: DevTeam-Skill löschen mit Warnung

```gherkin
Scenario: Löschen eines DevTeam-Skills zeigt zusätzliche Warnung
  Given ein Skill gehört zum Development Team (kein teamType)
  When ich auf den Delete-Button klicke
  Then zeigt der Bestätigungsdialog eine zusätzliche Warnung
  And die Warnung sagt "Dieser Skill gehört zum Development Team"
```

### Szenario 4: Delete aus Detail-Modal

```gherkin
Scenario: Löschen über den Delete-Button im Detail-Modal
  Given ich betrachte die Detail-Ansicht eines Skills
  When ich auf den Delete-Button im Detail-Modal klicke
  Then erscheint der Bestätigungsdialog
```

---

## Technische Verifikation (Automated Checks)

### Inhalt-Prüfungen

- [x] CONTAINS: `ui/frontend/src/views/team-view.ts` enthält "aos-confirm-dialog"
- [x] CONTAINS: `ui/frontend/src/views/team-view.ts` enthält "DELETE"

### Funktions-Prüfungen

- [x] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0
- [x] LINT_PASS: `cd ui && npm run lint` exits with code 0

---

## Technisches Refinement (vom Architect)

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und prüfbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhängigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Lit-Patterns
- [x] `aos-confirm-dialog` korrekt wiederverwendet
- [x] DELETE API-Call korrekt implementiert

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] Frontend Build kompiliert
- [x] Keine Linting Errors

#### Integration DoD
- [x] **Integration hergestellt: aos-team-view --> Backend API (DELETE)**
  - [x] Fetch-Call mit DELETE-Methode existiert
  - [x] Validierung: `grep -q "DELETE" ui/frontend/src/views/team-view.ts`

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `team-view.ts` | Delete-Handler, Confirm-Dialog-Integration, DELETE API-Call |
| Frontend | `aos-team-card.ts` | Delete-Button (falls nicht in CTM-003) |
| Frontend | `aos-team-detail-modal.ts` | Delete-Button |

**Kritische Integration Points:**
- `aos-team-view` --> Backend DELETE `/api/team/:projectPath/skills/:skillId`

---

### Technical Details

**WAS:**
- Delete-Buttons in `aos-team-card` und `aos-team-detail-modal`
- Confirmation Dialog mit `aos-confirm-dialog` (bestehendes Component)
- DELETE API-Call in `aos-team-view`
- Warnung bei DevTeam-Skills
- Auto-Refresh der Skills-Liste nach Löschung

**WIE (Architektur-Guidance):**
- `aos-confirm-dialog` direkt wiederverwenden (bereits vorhanden)
- Custom Events (`delete-click`) von Card/Modal an View
- View orchestriert: Dialog öffnen → Bestätigung → DELETE Call → Refresh
- DevTeam-Warnung: Wenn skill.teamType === undefined oder "devteam", zusätzlichen Warntext anzeigen
- Follow fetch-Pattern aus bestehenden API-Calls in team-view.ts

**WO:**
- `ui/frontend/src/views/team-view.ts`
- `ui/frontend/src/components/team/aos-team-card.ts`
- `ui/frontend/src/components/team/aos-team-detail-modal.ts`

**Abhängigkeiten:** CTM-001 (DELETE Endpoint), CTM-003 (Buttons in Cards)

**Geschätzte Komplexität:** XS

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Web Components Patterns |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Verify confirm dialog usage
grep -q "aos-confirm-dialog" ui/frontend/src/views/team-view.ts

# Verify DELETE call
grep -q "DELETE" ui/frontend/src/views/team-view.ts

# Frontend build
cd ui/frontend && npm run build
```

**Story ist DONE wenn:**
1. Delete-Button zeigt Confirmation Dialog
2. Bestätigung löst DELETE API-Call aus
3. Skills-Liste aktualisiert sich nach Löschung
