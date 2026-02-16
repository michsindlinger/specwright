# Integration, Edge Cases & Polish

> Story ID: FE-007
> Spec: File Editor
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: Medium
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: FE-003, FE-004, FE-005, FE-006

---

## Feature

```gherkin
Feature: Integration, Edge Cases & Polish
  Als Entwickler
  möchte ich dass der File Editor alle Randfälle korrekt behandelt und optional erweiterte Features bietet,
  damit ich eine robuste und zuverlässige Editing-Erfahrung habe.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Extern gelöschte Datei

```gherkin
Scenario: Warnung bei extern gelöschter Datei
  Given die Datei "temp.ts" ist im Editor in einem Tab geöffnet
  When die Datei extern (außerhalb der UI) gelöscht wird
  And ich versuche die Datei zu speichern
  Then sehe ich eine Warnung "Die Datei existiert nicht mehr"
  And ich kann wählen ob ich die Datei neu erstellen oder den Tab schließen möchte
```

### Szenario 2: Binärdatei öffnen

```gherkin
Scenario: Binärdatei wird nicht im Editor angezeigt
  Given ich klicke auf eine Binärdatei "image.png" im Dateibaum
  When der Editor versucht die Datei zu laden
  Then sehe ich die Meldung "Binärdatei kann nicht angezeigt werden"
  And kein unbrauchbarer Inhalt wird im Editor angezeigt
```

### Szenario 3: Große Datei

```gherkin
Scenario: Warnung bei großer Datei
  Given eine Datei "large-log.txt" mit 3 MB existiert
  When ich die Datei im Editor öffne
  Then wird die Datei geladen und angezeigt
  And ich sehe einen Hinweis dass große Dateien die Performance beeinträchtigen können
```

### Szenario 4: Berechtigungsfehler

```gherkin
Scenario: Fehlermeldung bei fehlenden Berechtigungen
  Given eine Datei "protected.conf" ist schreibgeschützt
  When ich versuche die Datei zu speichern
  Then sehe ich eine Fehlermeldung "Keine Schreibberechtigung"
  And meine Änderungen im Editor bleiben erhalten
```

### Szenario 5: Dateisuche im Baum (Nice-to-have)

```gherkin
Scenario: Dateien im Baum filtern
  Given die Dateibaum-Sidebar ist geöffnet
  When ich "config" in das Suchfeld eingebe
  Then werden nur Dateien und Ordner angezeigt die "config" im Namen enthalten
  And der restliche Baum wird ausgeblendet
```

### Szenario 6: Auto-Save (Nice-to-have)

```gherkin
Scenario: Automatisches Speichern nach Pause
  Given Auto-Save ist aktiviert
  And ich bearbeite die Datei "app.ts"
  When ich 2 Sekunden nicht tippe
  Then wird die Datei automatisch gespeichert
  And der Unsaved-Indikator verschwindet
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Gelöschte Datei die in Tab offen ist
  Given die Datei "to-delete.ts" ist in einem Tab geöffnet
  When ich "to-delete.ts" über das Kontextmenü lösche
  Then wird der Tab für "to-delete.ts" geschlossen
  And die Datei verschwindet aus dem Dateibaum

Scenario: Umbenannte Datei die in Tab offen ist
  Given die Datei "old.ts" ist in einem Tab geöffnet
  When ich "old.ts" über das Kontextmenü in "new.ts" umbenenne
  Then wird der Tab-Name zu "new.ts" aktualisiert
  And der Dateiinhalt bleibt erhalten
```

---

## Technische Verifikation (Automated Checks)

### Funktions-Pruefungen

- [ ] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0
- [ ] BUILD_PASS: `cd ui && npm run build:backend` exits with code 0
- [ ] LINT_PASS: `cd ui && npm run lint` exits with code 0
- [ ] TEST_PASS: `cd ui && npm test` exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| Playwright | Edge-Case-Testing im Browser | No |

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
- [x] Kritische Integration Points dokumentiert (wenn Full-stack)
- [x] Handover-Dokumente definiert (bei Multi-Layer)

**Story ist READY - alle Checkboxen angehakt.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Edge Cases korrekt behandelt (Binärdatei, Berechtigungsfehler, extern gelöschte Datei)
- [ ] Tab-Sync bei Rename/Delete im Kontextmenü
- [ ] Dateisuche funktioniert (Nice-to-have)

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Full-stack

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `aos-file-editor-panel.ts` (ÄNDERUNG) | Edge-Case-Handling: Binärdatei-Hinweis, extern gelöschte Datei, Tab-Sync bei Rename/Delete |
| Frontend | `aos-file-tree.ts` (ÄNDERUNG) | Dateisuche/Filter-Input (Nice-to-have) |
| Frontend | `aos-file-tree-sidebar.ts` (ÄNDERUNG) | Suchfeld-Integration oben in Sidebar |
| Backend | `file.service.ts` (ÄNDERUNG) | Auto-Save-Debounce-Support, verbesserte Fehlerbehandlung |

**Kritische Integration Points:**
- aos-file-editor-panel ← files:write:response (Fehlerbehandlung bei Speichern)
- aos-file-editor-panel ← Kontextmenü-Events (Tab-Update bei Rename, Tab-Close bei Delete)
- aos-file-tree ← Suchfeld (Filterlogik auf geladene Einträge)

---

### Technical Details

**WAS:**
- Edge-Case-Handling in bestehenden Komponenten
- Binärdatei-Erkennung im Editor-Panel (Hinweis statt Inhalt anzeigen)
- Tab-Sync: Bei Rename/Delete im Kontextmenü offene Tabs aktualisieren/schließen
- Fehler-Toasts für Berechtigungsfehler und andere Fehler
- Dateisuche/Filter im Tree (Nice-to-have): Text-Input der visible Nodes filtert
- Auto-Save (Nice-to-have): Debounced Write nach Änderungen

**WIE (Architektur-Guidance ONLY):**
- Binärdatei: Backend gibt `isBinary: true` Flag in `files:read:response` zurück → Panel zeigt Hinweis statt Editor
- Tab-Sync: Panel muss auf Custom Events vom Context-Menu hören (`@file-renamed`, `@file-deleted`)
  - Bei Rename: `openTabs.find(t => t.path === oldPath)` → Update path und filename
  - Bei Delete: `openTabs.filter(t => t.path !== deletedPath)` → Tab entfernen
- Fehler-Handling: Bei `files:write:error` Response → Toast-Meldung anzeigen
- Dateisuche: Einfacher String-Filter auf die aktuell sichtbaren Tree-Nodes (client-seitig, kein Backend-Call)
- Auto-Save: Debounce (2s) nach `content-changed` Event, deaktivierbar
- Light DOM Pattern für alle Änderungen

**WO:**
- `ui/frontend/src/components/file-editor/aos-file-editor-panel.ts` (ÄNDERUNG)
- `ui/frontend/src/components/file-editor/aos-file-tree.ts` (ÄNDERUNG)
- `ui/frontend/src/components/file-editor/aos-file-tree-sidebar.ts` (ÄNDERUNG)
- `ui/src/server/services/file.service.ts` (ÄNDERUNG)

**Abhängigkeiten:** FE-003, FE-004, FE-005, FE-006 (alle vorherigen Stories müssen fertig sein)

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns, Event-Handling |
| backend-express | .claude/skills/backend-express/SKILL.md | Backend-Fehlerbehandlung |
| quality-gates | .claude/skills/quality-gates/SKILL.md | Qualitätsstandards, Edge-Case-Coverage |

---

### Creates Reusable Artifacts

**Creates Reusable:** no

---

### Completion Check

```bash
# Auto-Verify Commands
cd ui/frontend && npm run build
cd ui && npm run build:backend
cd ui && npm run lint
cd ui && npm test
```

**Story ist DONE wenn:**
1. Alle *_PASS commands exit 0
2. Edge Cases in Editor-Panel behandelt
3. Git diff zeigt nur erwartete Änderungen
