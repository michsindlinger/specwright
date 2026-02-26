# Workflow & Command - Interaktiver /add-team-member Dialog

> Story ID: CTM-002
> Spec: Custom Team Members
> Created: 2026-02-26
> Last Updated: 2026-02-26

**Priority**: High
**Type**: Backend
**Estimated Effort**: S
**Dependencies**: CTM-001

---

## Feature

```gherkin
Feature: Interaktiver /add-team-member Slash-Command
  Als Specwright-Nutzer
  möchte ich über einen Slash-Command interaktiv ein Teammitglied erstellen,
  damit ich mein virtuelles Team einfach erweitern kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Einzelperson erstellen

```gherkin
Scenario: Interaktive Erstellung eines individuellen Teammitglieds
  Given ich führe /add-team-member im Terminal aus
  When ich im Dialog "Steuerberater" als Name eingebe
  And ich "individual" als Typ wähle
  And ich Rolle, Wissensgebiete und Verhaltensregeln angebe
  Then wird ein Skill-Ordner ".claude/skills/steuerberater/" erstellt
  And die SKILL.md enthält "teamType: individual"
  And die SKILL.md enthält "teamName: Steuerberater"
  And eine leere dos-and-donts.md wird erstellt
```

### Szenario 2: Team erstellen

```gherkin
Scenario: Interaktive Erstellung eines Teams
  Given ich führe /add-team-member im Terminal aus
  When ich "Marketing Team" als Name eingebe
  And ich "team" als Typ wähle
  Then wird ein Skill-Ordner ".claude/skills/marketing-team/" erstellt
  And die SKILL.md enthält "teamType: team"
  And die SKILL.md enthält "teamName: Marketing Team"
```

### Szenario 3: Optionale Dokumenten-Templates

```gherkin
Scenario: Skill mit Dokumenten-Templates erstellen
  Given ich erstelle ein Teammitglied
  When ich im Dialog "Ja" für Dokumenten-Templates wähle
  And ich Template-Namen und Struktur angebe
  Then werden Template-Dateien im Skill-Ordner erstellt
  And die SKILL.md referenziert die Templates
```

### Edge Case: Doppelter Name

```gherkin
Scenario: Skill-Name existiert bereits
  Given ein Skill "steuerberater" existiert bereits
  When ich versuche einen Skill mit dem Namen "Steuerberater" zu erstellen
  Then erhalte ich eine Fehlermeldung
  And der Workflow schlägt einen alternativen Namen vor
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: `specwright/workflows/team/add-team-member.md`
- [ ] FILE_EXISTS: `.claude/commands/specwright/add-team-member.md`
- [ ] CONTAINS: `.claude/commands/specwright/add-team-member.md` enthält "add-team-member"

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

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Workflow erstellt und folgt bestehendem Pattern
- [ ] Command erstellt und referenziert Workflow
- [ ] Dialog-Flow vollständig (Name, Typ, Rolle, Wissensgebiete, Verhaltensregeln, Templates)

#### Qualitätssicherung
- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Workflow manuell getestet
- [ ] Generierte SKILL.md enthält korrektes Frontmatter

---

### Betroffene Layer & Komponenten

**Integration Type:** Backend-only (Workflow/Command = Markdown-Dateien)

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | `specwright/workflows/team/add-team-member.md` | Neuer Workflow |
| Backend | `.claude/commands/specwright/add-team-member.md` | Neuer Command |

---

### Technical Details

**WAS:**
- Neuer Workflow `add-team-member.md` mit interaktivem Dialog-Flow
- Neuer Command `add-team-member.md` als Slash-Command-Definition
- Workflow generiert Skill-Ordner mit SKILL.md (erweitertes Frontmatter) und dos-and-donts.md
- Optional: Template-Dateien im Skill-Ordner

**WIE (Architektur-Guidance):**
- Follow existing workflow pattern (z.B. `specwright/workflows/team/build-dev-team.md`)
- Command referenziert Workflow via `specwright/workflows/team/add-team-member.md`
- Dialog nutzt AskUserQuestion für strukturierte Abfragen
- Skill-Ordner-Name wird sanitized (lowercase, hyphens, keine Sonderzeichen)
- Follow existing skill generation pattern aus `add-skill` Workflow
- Frontmatter muss `teamType` und `teamName` enthalten

**WO:**
- `specwright/workflows/team/add-team-member.md` (NEU)
- `.claude/commands/specwright/add-team-member.md` (NEU)

**Abhängigkeiten:** CTM-001 (Frontmatter-Format muss definiert sein)

**Geschätzte Komplexität:** S

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| domain-specwright-ui | .claude/skills/domain-specwright-ui/SKILL.md | Specwright-spezifisches Domain-Wissen für Workflows |

---

### Creates Reusable Artifacts

**Creates Reusable:** yes

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| /add-team-member Workflow | Workflow | specwright/workflows/team/add-team-member.md | Interaktiver Dialog zur Custom-Skill-Erstellung |
| /add-team-member Command | Command | .claude/commands/specwright/add-team-member.md | Slash-Command-Definition |

---

### Completion Check

```bash
# Verify workflow exists
test -f specwright/workflows/team/add-team-member.md

# Verify command exists
test -f .claude/commands/specwright/add-team-member.md

# Verify command references workflow
grep -q "add-team-member" .claude/commands/specwright/add-team-member.md
```

**Story ist DONE wenn:**
1. Workflow und Command existieren
2. Workflow enthält vollständigen Dialog-Flow
3. Command referenziert korrekten Workflow
