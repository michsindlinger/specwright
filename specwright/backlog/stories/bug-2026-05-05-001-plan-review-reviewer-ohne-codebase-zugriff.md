# Bug: Plan-Review Reviewer haben keinen Codebase-Zugriff (tools: [] hartcodiert) + leerer Reviewer-Output wird als gueltig durchgereicht

> Bug ID: 2026-05-05-001
> Created: 2026-05-05
> Severity: High
> Status: Ready

**Priority**: High
**Type**: Bug - Backend
**Affected Component**: ui/src/server/services/external-reviewer.ts (+ plan-review-orchestrator.ts)

---

## Bug Description

### Symptom

Der Plan-Review im Cloud Terminal (anthropic:opus + glm:glm-5.1 + deepseek:opus auf einem Implementation-Plan) liefert zwei Probleme:

1. **Anthropic + GLM** kommentieren explizit: *"I cannot access the codebase directly since this environment only has Figma tools available"* und reviewen anschliessend nur auf Plan-Text-Ebene (ohne Verifikation gegen echte Datei-Inhalte / Zeilen-Referenzen).
2. **DeepSeek** liefert als Review-Output ausschliesslich nackte XML-Tool-Call-Bloecke ohne Prosa, z.B.:
   ```
   <tool_call name="Read">
   {"file_path": "ui/src/server/services/auto-mode-spec-orchestrator.ts", ...}
   </tool_call>
   ```
   Es entsteht kein eigentlicher Review-Text. Der Block wird trotzdem als gueltiger Review im finalen aggregierten Inject-Text dargestellt.

### Reproduktion

1. Cloud Terminal Tab oeffnen, Plan-Review aktivieren mit drei Reviewern: `anthropic:opus`, `glm:glm-5.1`, `deepseek:opus`.
2. Manuelle Plan-Detection ausloesen (oder ExitPlanMode aus Plan-Mode in Claude).
3. Aggregierten Review-Inject-Text vergleichen: anthropic + glm haben Reviews, aber deklarieren *"only Figma tools available"*. DeepSeek-Block ist leer / nur tool_call-XML.

### Expected vs. Actual

- **Expected:**
  - Alle Reviewer haben Read/Grep/Glob (read-only) auf den uebergebenen `projectPath` und koennen Plan-Behauptungen mechanisch verifizieren (Datei-Existenz, Funktionsnamen, Zeilen-Referenzen).
  - Reviewer-Output, der nur aus tool_call-XML ohne Prosa besteht, wird als Failure markiert (Retry oder klare Fehlermeldung), nicht als gueltiger Review-Block weitergereicht.
- **Actual:**
  - Reviewer werden mit `tools: []` gestartet → keine built-in Filesystem-Tools verfuegbar (nur User-MCP-Tools wie Figma werden via `settingSources: ['user']` geerbt).
  - Output-Validation pruft nur `result !== ''` → tool_call-XML-only Output passt als „gueltig" durch.

### Kontext

- **Komponente:** ui/src/server/services/external-reviewer.ts (Reviewer-Spawn) + plan-review-orchestrator.ts (Aggregation/Inject)
- **Wann:** Bei jedem Plan-Review im Cloud Terminal mit aktivierten externen Reviewern.
- **Logs:** `[ExternalReviewer]`-Log zeigt Prompt-Head + Laenge, aber keine Tool-Use-Spuren.

---

## User-Input (aus Plan-Mode-Korrektur)

> Dokumentation des Benutzer-Wissens vor der RCA

**Hat User Vermutungen geteilt:** Ja

**User-Hypothese (woertlich):** *"Beim Review des plans sollten die llms aber schon auf die codebase zugreifen können, falls das aktuell nicht so ist, wäre das ein bug."*

**Konsequenz:** Tool-Provisioning fuer Reviewer ist gewuenschtes Verhalten — fehlender Codebase-Zugriff ist Bug, nicht Feature.

---

## Root-Cause-Analyse

### Hypothesen (vor Analyse)

| # | Hypothese | Wahrscheinlichkeit | Quelle | Pruefmethode |
|---|-----------|-------------------|--------|-------------|
| 1 | Reviewer-Spawn (claudeQuery) wird ohne Filesystem-Tools konfiguriert | 70% | User+Agent | `external-reviewer.ts` Optionen pruefen |
| 2 | Reviewer-System-Prompt fordert Tool-Use ohne Tools bereitzustellen | 20% | Agent | `getReviewPrompt()` + DEFAULT_REVIEW_PROMPT lesen |
| 3 | Output-Aggregation filtert Tool-Call-only Outputs nicht | 80% (zusaetzlich) | Agent | `buildInjectText` + Result-Handling pruefen |

### Pruefung

**Hypothese 1 pruefen:** Reviewer-Spawn ohne Filesystem-Tools
- Aktion: `ui/src/server/services/external-reviewer.ts:45-59` gelesen.
- Befund:
  ```ts
  const session = claudeQuery({
    prompt,
    options: {
      maxTurns: 5,
      tools: [],                      // <- LEER!
      cwd: projectPath,
      abortController: ac,
      env: { ...baseEnv, CLAUDE_CONFIG_DIR: configDir },
      settingSources: ['user'],
      ...
    }
  });
  ```
  `tools: []` blockiert alle built-in Tools (Read/Grep/Glob/Bash). `settingSources: ['user']` laedt zwar User-MCP-Servers (z.B. Figma aus `~/.claude-<provider>/settings.json`), liefert aber keine Filesystem-Reads.
- Ergebnis: ✅ BESTAETIGT
- Begruendung: Reviewer hat strukturell keinen Read-Zugriff, obwohl `cwd: projectPath` korrekt gesetzt ist. Anthropic + GLM melden das ehrlich; DeepSeek emittiert blind tool_call-XML, das nirgends interpretiert wird.

**Hypothese 2 pruefen:** Reviewer-Prompt fordert Tool-Use
- Aktion: `ui/src/server/general-config.ts:22-28` gelesen (DEFAULT_REVIEW_PROMPT).
- Befund: Prompt enthaelt keine Tool-Anweisung. Er sagt *"Read the plan carefully"* — gemeint: lies Plan-Text. DeepSeek fehlinterpretiert das vermutlich als Aufforderung zum tatsaechlichen File-Read.
- Ergebnis: ✅ TEILWEISE BESTAETIGT (Sekundaer-Faktor — Prompt unspezifisch zu Tool-Verfuegbarkeit).

**Hypothese 3 pruefen:** Output-Validation laesst tool_call-only Outputs durch
- Aktion: `external-reviewer.ts:90-100` gelesen.
- Befund:
  ```ts
  if (!result || streamError) { ... throw new Error(...); }
  return result;
  ```
  Nur Pruefung auf leeren String oder Stream-Error. Ein Output, der ausschliesslich `<tool_call>...</tool_call>` enthaelt, ist nicht-leer und passiert die Validation. `plan-review-orchestrator.ts:153-167` reicht ihn ungefiltert in `buildInjectText`.
- Ergebnis: ✅ BESTAETIGT

### Root Cause

**Ursache (Doppel-Bug):**

1. **Primaer:** `external-reviewer.ts:49` setzt `tools: []` und entzieht Reviewern damit den Codebase-Zugriff komplett. Anthropic/GLM weichen aus, DeepSeek emittiert tool_call-XML in den Wind.
2. **Sekundaer:** Output-Validation (`external-reviewer.ts:90-100`) und Aggregation (`plan-review-orchestrator.ts:153-196`) erkennen keine substantz-leeren Outputs (nur tool_call-XML, keine Prosa) und reichen sie als gueltige Reviews durch.

**Beweis:**
- `external-reviewer.ts:49`: `tools: []` — explizit leer, keine Read/Grep/Glob.
- `external-reviewer.ts:50`: `cwd: projectPath` — Pfad vorhanden, aber ohne Tools nutzlos.
- Reviewer-Output von Anthropic/GLM in der User-Beobachtung enthaelt woertlich *"only has Figma tools available"* — bestaetigt User-MCP-Inheritance ohne Filesystem-Tools.
- DeepSeek-Output ist im User-Paste sichtbar als vier `<tool_call name="Read">`-Bloecke ohne nachfolgenden Prosa-Text.

**Betroffene Dateien:**
- `ui/src/server/services/external-reviewer.ts` (Z. 45-59 Tool-Konfiguration; Z. 90-100 Output-Validation)
- `ui/src/server/services/plan-review-orchestrator.ts` (Z. 145-196 — kein zusaetzlicher Filter vor Aggregation)

**Fix-Ansatz:**
1. Read-only Filesystem-Tools fuer Reviewer freigeben: `tools: ['Read', 'Grep', 'Glob']` (genaue Namen gegen `@anthropic-ai/claude-agent-sdk` API verifizieren).
2. Reviewer-Prompt ergaenzen: explizit nennen welche Tools verfuegbar sind und dass Plan-Behauptungen verifiziert werden sollen.
3. Output-Validation haerten: Output, der zu >X% aus tool_call-XML / nicht-Prosa besteht, als Failure markieren (Retry oder Fehlerbanner statt gueltiger Review).

---

## Feature (Bug-Fix)

```gherkin
Feature: Plan-Review Reviewer mit Codebase-Zugriff und stabiler Output-Validation
  Als Entwickler der einen Implementation-Plan im Cloud Terminal reviewen laesst
  moechte ich, dass externe Reviewer den Code des Projekts read-only inspizieren koennen
  und dass leere oder nicht-Prosa-Outputs nicht als gueltiger Review akzeptiert werden,
  damit Reviews codebase-grounded sind und keine substanzlosen Bloecke aggregiert werden.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Korrektes Verhalten — Reviewer mit Codebase-Zugriff

```gherkin
Scenario: Reviewer kann Plan-Behauptungen gegen Code verifizieren
  Given ein Plan-Review wird mit drei Reviewern (anthropic:opus, glm:glm-5.1, deepseek:opus) gestartet
  And der Plan referenziert konkrete Datei-Pfade und Zeilen-Nummern
  When jeder Reviewer den Review ausfuehrt
  Then hat jeder Reviewer Zugriff auf Read/Grep/Glob im Project-cwd
  And mindestens ein Reviewer zitiert in seinen Findings echte Datei-Inhalte oder Zeilen-Nummern
  And keiner der Reviewer kommentiert, dass er keinen Codebase-Zugriff habe
```

### Szenario 2: Output-Validation faengt tool_call-only Output

```gherkin
Scenario: Reviewer-Output ohne Prosa wird als Failure markiert
  Given ein Reviewer liefert einen Output, der ausschliesslich aus <tool_call>-XML-Bloecken ohne Prosa besteht
  When die Output-Validation in external-reviewer.ts laeuft
  Then wird der Output nicht als success akzeptiert
  And der Reviewer-Slot in der Aggregation zeigt eine klare Fehlermeldung
  And der finale Inject-Text enthaelt keinen substanzlosen Review-Block
```

### Szenario 3: Regression-Schutz — bestehende erfolgreiche Reviews

```gherkin
Scenario: Erfolgreiche Reviews werden unveraendert aggregiert
  Given alle drei Reviewer liefern substantiellen Prosa-Review
  When die Aggregation laeuft
  Then erscheinen alle drei Review-Bloecke im Inject-Text in unveraenderter Form
  And das aggregierte Inject-Format (===== External Review ===== … ===========================) bleibt erhalten
```

---

## Technische Verifikation

- [ ] `external-reviewer.ts:49` setzt nicht mehr `tools: []` sondern read-only Filesystem-Tool-Liste
- [ ] DEFAULT_REVIEW_PROMPT in `general-config.ts` benennt verfuegbare Tools explizit
- [ ] Output-Validation in `external-reviewer.ts` erkennt tool_call-XML-only Outputs
- [ ] Manueller Re-Run von Plan-Review mit gleichen drei Reviewern: alle liefern Prosa und mindestens einer zitiert echten Code
- [ ] DeepSeek-Output ist nicht mehr leer
- [ ] `cd ui && npm test` gruen
- [ ] `cd ui && npm run lint` gruen

---

## Technisches Refinement

### DoR (Definition of Ready)

#### Bug-Analyse
- [x] Bug reproduzierbar (jeder Plan-Review im Cloud Terminal mit externen Reviewern)
- [x] Root Cause identifiziert (`tools: []` + Output-Validation-Luecke)
- [x] Betroffene Dateien bekannt (external-reviewer.ts, plan-review-orchestrator.ts, general-config.ts)

#### Technische Vorbereitung
- [x] Fix-Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert (`@anthropic-ai/claude-agent-sdk` Tool-API)
- [x] Risiken bewertet (Reviewer koennten neue Tools missbrauchen → read-only-Beschraenkung; Token-Kosten leicht hoeher durch Tool-Use)

**Bug ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done)

- [ ] Reviewer haben Read/Grep/Glob (read-only) auf `projectPath`
- [ ] Output-Validation lehnt tool_call-XML-only Outputs ab
- [ ] Reviewer-Prompt erwaehnt Tool-Verfuegbarkeit
- [ ] Manueller Re-Run zeigt codebase-grounded Reviews
- [ ] Unit-/Integration-Tests fuer external-reviewer.ts decken Output-Validation ab
- [ ] Keine Regression bei aggregiertem Inject-Format
- [ ] Code Review durchgefuehrt

**Bug ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten (Fix-Impact)

**Fix Type:** Backend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Impact | Aenderung |
|-------|-------------|--------|----------|
| Backend | `ui/src/server/services/external-reviewer.ts` | Direct | `tools: []` -> read-only Tool-Liste; Output-Validation haerten |
| Backend | `ui/src/server/general-config.ts` | Direct | DEFAULT_REVIEW_PROMPT erweitern um Tool-Hinweis |
| Backend | `ui/src/server/services/plan-review-orchestrator.ts` | Indirect | ggf. Failure-Reason im `plan-review:reviewer.result` Event verfeinern |

**Kritische Integration Points:**
- `claude-agent-sdk` Tool-API: korrekte Schreibweise der Tool-Namen muss in der SDK-Version verifiziert werden, sonst Silent-Skip
- WebSocket-Event `plan-review:reviewer.result`: Frontend-Konsumenten muessen mit klareren Fehlertexten klar kommen

---

### Technical Details

**WAS:**
1. Reviewer-Spawn in `external-reviewer.ts` mit read-only Filesystem-Tools konfigurieren.
2. Output-Validation um Substanz-Check ergaenzen (Output ohne Prosa -> Failure).
3. Reviewer-Prompt um Tool-Verfuegbarkeit-Hinweis ergaenzen.

**WIE (Architektur-Guidance ONLY):**
- In `external-reviewer.ts:45-59` `tools: []` durch konkrete read-only Tool-Liste ersetzen (genaue Namen aus `@anthropic-ai/claude-agent-sdk`-Typen ableiten — vermutlich `Read`, `Grep`, `Glob`; KEIN `Bash`, `Edit`, `Write`).
- In `external-reviewer.ts:90-100` Substanz-Check einfuegen: result auf reine tool_call-XML-Bloecke pruefen (Heuristik: Anteil Nicht-XML-Text < N → Failure).
- In `general-config.ts:22-28` `DEFAULT_REVIEW_PROMPT` ergaenzen: *"You have read-only access to the project via Read, Grep, and Glob. Verify plan claims (file paths, function names, line numbers) against the actual codebase."*
- Migration: bestehende per-project Custom-Prompts bleiben unangetastet — User koennen ihre eigene Variante updaten.

**WO:**
- `ui/src/server/services/external-reviewer.ts:45-59` (Tool-Konfiguration)
- `ui/src/server/services/external-reviewer.ts:90-100` (Output-Validation)
- `ui/src/server/general-config.ts:22-28` (DEFAULT_REVIEW_PROMPT)
- ggf. `ui/src/server/services/plan-review-orchestrator.ts:155-182` (klarere Failure-Messages)

**Abhaengigkeiten:** `@anthropic-ai/claude-agent-sdk` Tool-API (bereits installiert)

**Geschaetzte Komplexitaet:** S (1-2 Stunden inkl. Tests)

---

### Completion Check

```bash
cd ui && npm run lint
cd ui && npm test
cd ui && npm run build:backend
```

**Bug ist DONE wenn:**
1. Plan-Review mit drei Reviewern liefert codebase-grounded Outputs
2. DeepSeek liefert echten Prosa-Review (kein tool_call-XML mehr)
3. Substanz-leerer Reviewer-Output erscheint als Failure-Banner, nicht als gueltiger Review
4. Bestehender Inject-Text-Aufbau bleibt strukturell unveraendert
