# End-to-End Integration + UX-Polish

> Story ID: QTD-004
> Spec: Quick-To-Do
> Created: 2026-02-13
> Last Updated: 2026-02-13

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 2 SP
**Dependencies**: QTD-001, QTD-002, QTD-003

---

## Feature

```gherkin
Feature: Quick-To-Do vollständig speichern und Feedback erhalten
  Als Entwickler
  möchte ich mein Quick-To-Do über das Modal speichern und eine Bestätigung sehen,
  damit ich weiß, dass meine Idee erfolgreich festgehalten wurde.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Erfolgreiches Speichern mit Toast

```gherkin
Scenario: Quick-To-Do speichern zeigt Erfolgs-Toast
  Given ich habe den Titel "Neue Dashboard-Idee" eingegeben
  And ich habe Priorität "high" gewählt
  When ich auf "Speichern" klicke
  Then wird das Modal geschlossen
  And ich sehe eine Toast-Notification "Quick-To-Do erstellt"
  And das Item existiert im Backlog
```

### Szenario 2: Speichern mit Bildern

```gherkin
Scenario: Quick-To-Do mit Bildern speichern
  Given ich habe den Titel "UI Mockup" eingegeben
  And ich habe 2 Bilder per Paste eingefügt
  When ich auf "Speichern" klicke
  Then sehe ich einen Loading-Indikator auf dem Save-Button
  And nach dem Speichern wird das Modal geschlossen
  And die Toast-Notification zeigt die Item-ID
```

### Szenario 3: Enter-Taste zum Speichern

```gherkin
Scenario: Enter-Taste speichert Quick-To-Do
  Given ich habe den Titel "Schnelle Idee" eingegeben
  And der Fokus ist auf dem Titel-Feld
  When ich Enter drücke
  Then wird das Quick-To-Do gespeichert
  And das Modal wird geschlossen
```

### Edge Case: Speicherfehler

```gherkin
Scenario: Backend-Fehler beim Speichern
  Given ich habe ein Quick-To-Do ausgefüllt
  When der Backend-Server nicht erreichbar ist
  And ich auf "Speichern" klicke
  Then sehe ich eine Fehlermeldung im Modal
  And das Modal bleibt geöffnet
  And ich kann es erneut versuchen
```

### Edge Case: Enter in Textarea

```gherkin
Scenario: Enter in Beschreibungsfeld erstellt Zeilenumbruch
  Given der Fokus ist auf dem Beschreibungsfeld
  When ich Enter drücke
  Then wird ein Zeilenumbruch im Beschreibungsfeld erstellt
  And das Quick-To-Do wird NICHT gespeichert
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] CONTAINS: agent-os-ui/ui/src/components/aos-quick-todo-modal.ts enthält "fetch"
- [ ] CONTAINS: agent-os-ui/ui/src/components/aos-quick-todo-modal.ts enthält "quick-todo-saved"
- [ ] CONTAINS: agent-os-ui/ui/src/app.ts enthält "handleQuickTodoSaved"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd agent-os-ui/ui && npx tsc --noEmit exits with code 0
- [ ] BUILD_PASS: cd agent-os-ui/ui && npx vite build exits with code 0

---

## Required MCP Tools

Keine MCP-Tools erforderlich.

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
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschätzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz
- [x] Alle betroffenen Layer identifiziert
- [x] Integration Type bestimmt
- [x] Kritische Integration Points dokumentiert
- [x] Handover-Dokumente definiert

**Story ist READY.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten
- [x] Error-Handling implementiert
- [x] Loading-States implementiert

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt
- [x] End-to-End Flow funktioniert
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `aos-quick-todo-modal.ts` | Save-Handler, fetch-Call, Loading/Error-States |
| Frontend | `app.ts` | Toast-Aufruf, Backlog-Refresh nach Speichern |

**Kritische Integration Points:**
- `aos-quick-todo-modal.ts` → REST `/api/backlog/:projectPath/quick-todo` (HTTP POST mit JSON Body)
- `app.ts` → `toast-notification` (Erfolgs-Feedback)

---

### Technical Details

**WAS:**
- Save-Handler im Modal: Sammelt Formulardaten, konvertiert Bilder zu Base64, sendet POST-Request
- Toast-Integration in app.ts bei erfolgreichem Speichern
- Loading-State auf Save-Button während Request
- Error-Handling bei fehlgeschlagenem Request
- Keyboard-Handler: Enter zum Speichern (außer in Textarea)

**WIE (Architektur-Guidance):**
- Nutze `gateway.getProjectPath()` für den Projekt-Pfad im REST-URL
- Konvertiere `StagedImage[]` zu `{ data: string, filename: string, mimeType: string }[]` für den Request-Body
- Nutze `fetch()` direkt (nicht über Gateway WebSocket)
- Modal dispatcht `quick-todo-saved` Custom Event mit Detail `{ itemId: string }` bei Erfolg
- app.ts horcht auf `@quick-todo-saved` und ruft `showToast()` auf
- Loading: Setze `isSaving = true` während fetch, deaktiviere Save-Button
- Error: Zeige Inline-Fehler im Modal (nicht Toast), Modal bleibt offen
- Enter-Taste: Prüfe `document.activeElement` - nur speichern wenn NICHT Textarea

**WO:**
- `agent-os-ui/ui/src/components/aos-quick-todo-modal.ts` (MODIFY)
- `agent-os-ui/ui/src/app.ts` (MODIFY)

**WER:** dev-team__frontend-developer

**Abhängigkeiten:** QTD-001, QTD-002, QTD-003

**Geschätzte Komplexität:** S

**Integration:** `aos-quick-todo-modal` → REST Backend (QTD-003)

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
grep -q "fetch\|POST" agent-os-ui/ui/src/components/aos-quick-todo-modal.ts && echo "✓ REST call exists"
grep -q "quick-todo-saved" agent-os-ui/ui/src/components/aos-quick-todo-modal.ts && echo "✓ Event dispatched"
grep -q "handleQuickTodoSaved\|quick-todo-saved" agent-os-ui/ui/src/app.ts && echo "✓ App handler exists"
cd agent-os-ui/ui && npx tsc --noEmit 2>&1 | grep -v "TS6133\|CSSResultGroup" | grep -c "error TS" | grep -q "^0$" && echo "✓ TypeScript check passed"
```
