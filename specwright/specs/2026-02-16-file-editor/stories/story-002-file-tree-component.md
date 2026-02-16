# File Tree Component

> Story ID: FE-002
> Spec: File Editor
> Created: 2026-02-16
> Last Updated: 2026-02-16

**Priority**: Critical
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: FE-001

---

## Feature

```gherkin
Feature: File Tree Component
  Als Entwickler
  möchte ich einen Dateibaum sehen, der mein Projektverzeichnis als Tree-View darstellt,
  damit ich schnell durch die Ordnerstruktur navigieren und Dateien finden kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Dateibaum zeigt Projektverzeichnis

```gherkin
Scenario: Projektverzeichnis wird als Baum dargestellt
  Given die Specwright UI ist geöffnet und der File Tree ist sichtbar
  When das Projektverzeichnis geladen wird
  Then sehe ich alle Dateien und Ordner des Stammverzeichnisses als Baumstruktur
  And Ordner sind durch ein Ordner-Icon gekennzeichnet
  And Dateien sind durch passende Icons je nach Dateityp gekennzeichnet
```

### Szenario 2: Ordner auf- und zuklappen

```gherkin
Scenario: Ordner wird aufgeklappt und Inhalt geladen
  Given ich sehe den Dateibaum mit dem geschlossenen Ordner "src"
  When ich auf den Ordner "src" klicke
  Then wird der Ordner aufgeklappt
  And ich sehe den Inhalt des Ordners "src" darunter eingerückt
  And der Ordner-Inhalt wird erst beim Aufklappen vom Server geladen
```

### Szenario 3: Datei auswählen

```gherkin
Scenario: Datei wird ausgewählt und visuell hervorgehoben
  Given ich sehe den Dateibaum mit sichtbaren Dateien
  When ich auf die Datei "package.json" klicke
  Then wird "package.json" visuell hervorgehoben
  And die Datei wird im Editor geöffnet
```

### Szenario 4: Verschachtelte Ordnerstruktur

```gherkin
Scenario: Tief verschachtelte Ordner werden korrekt dargestellt
  Given der Ordner "src/components/docs" existiert im Projekt
  When ich nacheinander "src", dann "components", dann "docs" aufklappe
  Then sehe ich die Inhalte auf jeder Ebene korrekt eingerückt
  And jede Ebene wurde einzeln vom Server geladen
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Leerer Ordner wird korrekt angezeigt
  Given ein leerer Ordner "empty-folder" existiert im Projekt
  When ich den Ordner "empty-folder" aufklappe
  Then sehe ich einen Hinweis dass der Ordner leer ist

Scenario: Langer Dateiname wird abgeschnitten
  Given eine Datei mit einem sehr langen Namen existiert
  When ich den Dateibaum betrachte
  Then wird der Dateiname abgeschnitten dargestellt
  And bei Hover über den Namen sehe ich den vollständigen Namen als Tooltip
```

---

## Technische Verifikation (Automated Checks)

### Datei-Pruefungen

- [ ] FILE_EXISTS: ui/frontend/src/components/file-editor/aos-file-tree.ts

### Inhalt-Pruefungen

- [ ] CONTAINS: ui/frontend/src/components/file-editor/aos-file-tree.ts enthält "@customElement('aos-file-tree')"
- [ ] CONTAINS: ui/frontend/src/components/file-editor/aos-file-tree.ts enthält "files:list"

### Funktions-Pruefungen

- [ ] BUILD_PASS: `cd ui/frontend && npm run build` exits with code 0
- [ ] LINT_PASS: `cd ui && npm run lint` exits with code 0

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| Playwright | Visuelles Testing des Dateibaums | No |

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
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Lit Component mit Light DOM Pattern

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Code Review durchgeführt und genehmigt

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `aos-file-tree.ts` (NEU) | Tree-View Komponente mit Lazy-Loading, Expand/Collapse |

**Kritische Integration Points:**
- aos-file-tree → gateway.ts (`files:list` Message senden, Response empfangen)
- aos-file-tree → aos-file-tree-sidebar (Custom Event `@file-open` nach oben)

---

### Technical Details

**WAS:**
- Neue `aos-file-tree` Lit Web Component im Ordner `file-editor/`
- Tree-View-Darstellung des Projektverzeichnisses
- Lazy-Loading: Ordnerinhalte erst beim Aufklappen laden via `gateway.send({ type: 'files:list' })`
- Datei/Ordner-Icons basierend auf Typ, Selected-Highlighting, Truncation mit Tooltip

**WIE (Architektur-Guidance ONLY):**
- Folge Lit Component Pattern mit Light DOM (`createRenderRoot = this`)
- Nutze `gateway.on('files:list:response', handler)` für asynchrone Daten (wie `AosDocsPanel`)
- Datenstruktur: Map von Pfad zu Entry-Array (lazy-loaded, flache Ebene pro Ordner)
- `@property()` für Root-Path, `@state()` für expandierte Ordner und geladene Einträge
- Custom Event `file-open` mit `{ detail: { path, filename } }` beim Datei-Klick dispatchen
- Custom Event `contextmenu` abfangen für Rechtsklick (wird von FE-006 genutzt)
- Nutze Dateiendung für Icon-Auswahl (Ordner-Icon, TS-Icon, JSON-Icon, etc.)
- Einrückung pro Ebene via CSS (`padding-left: calc(depth * var(--spacing-md))`)

**WO:**
- `ui/frontend/src/components/file-editor/aos-file-tree.ts` (NEU)

**Abhängigkeiten:** FE-001 (Backend muss `files:list` Message-Type unterstützen)

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | .claude/skills/frontend-lit/SKILL.md | Lit Component Patterns, Light DOM, Custom Events |
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | UI Business Domain, Komponenten-Namenskonventionen |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| aos-file-tree | UI Component | ui/frontend/src/components/file-editor/aos-file-tree.ts | Tree-View Komponente mit Lazy-Loading für Verzeichnisstrukturen |

---

### Completion Check

```bash
# Auto-Verify Commands
test -f ui/frontend/src/components/file-editor/aos-file-tree.ts && echo "Component exists"
grep -q "aos-file-tree" ui/frontend/src/components/file-editor/aos-file-tree.ts && echo "Component registered"
cd ui/frontend && npm run build
cd ui && npm run lint
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
