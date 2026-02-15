# Story: Backend Spec Context Loading

## Feature
Als Developer möchte ich, dass das Backend automatisch `spec.md`, `spec-lite.md` und `kanban.json` lädt, wenn ich einen Chat zur Spec starte, damit ich keine Dateien manuell kopieren muss.

## Akzeptanzkriterien

**Scenario: Laden der Spec Context Files**
Given ich habe ein Spec-Verzeichnis "specs/2026-02-04-chat-with-spec"
When das Backend den Context für die Spec ID lädt
Then enthält der Context den Inhalt von "spec.md"
And enthält der Context den Inhalt von "kanban.json"
And ist der Context als String formatiert

Status: Done

**Scenario: Fehlerbehandlung bei fehlender Spec**
Given eine Spec ID "invalid-spec-id" existiert nicht
When das Backend versucht den Context zu laden
Then wird ein leerer Context oder eine sinnvolle Warnung zurückgegeben
And der Server stürzt nicht ab

---

## Technisches Refinement (vom Architect)

**DoR (Definition of Ready)**
- [x] Fachliche Requirements klar
- [x] Technical Approach defined
- [x] Dependencies identified
- [x] Affected components known
- [x] Story sized properly

**DoD (Definition of Done)**
- [x] Code implemented & Lint free
- [x] Tests written & passing
- [x] Integration validation passed

**Integration:**
- Integration Type: **Backend-only**

**Betroffene Layer & Komponenten:**
| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Backend | `server/specs-reader.ts` | Neue Methode `getSpecContext(specId)` |
| Backend | `server/claude-handler.ts` | Update `handleMessage` für Context Injection |

**Technical Details:**
**WAS:** Erweitere `SpecsReader` um Logik zum Aggregieren der Markdown/JSON Files.
**WIE:** Lese Dateien asynchron. Kombiniere sie mit einem Header pro Datei (z.B. "--- FILE: spec.md ---").
**WO:** `agent-os-ui/src/server/specs-reader.ts`, `agent-os-ui/src/server/claude-handler.ts`
**WER:** dev-team__backend-developer

**Relevante Skills:**
- backend-logic-implementing
- backend-persistence-adapter (File IO)

**Creates Reusable Artifacts:**
- YES: `SpecsReader.getSpecContext` method (service utils)

**Completion Check:**
```bash
# Verify method exists via grep
grep -q "getSpecContext" agent-os-ui/src/server/specs-reader.ts && echo "Method created"
```
