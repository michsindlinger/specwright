# WSD-003: Resizable Dokument-Container

> Status: Done
> Complexity: S (Small)
> Layer: Frontend
> Skill: `frontend-lit`

## User Story

**Als** User der Dokumente lesen möchte
**Möchte ich** den Dokument-Container größer ziehen können
**Damit** ich die Inhalte besser lesen kann ohne in ein separates Fenster wechseln zu müssen

## Akzeptanzkriterien (Gherkin)

```gherkin
Feature: Resizable Dokument-Container

  Scenario: Container per Drag vergrößern
    Given der Dokument-Container ist sichtbar
    When ich den linken Rand des Containers nach links ziehe
    Then wird der Container breiter
    And der Chat-Bereich wird entsprechend schmaler

  Scenario: Container per Drag verkleinern
    Given der Dokument-Container ist vergrößert
    When ich den linken Rand des Containers nach rechts ziehe
    Then wird der Container schmaler
    And der Chat-Bereich wird entsprechend breiter

  Scenario: Minimum-Breite wird eingehalten
    Given der Dokument-Container ist sichtbar
    When ich versuche den Container unter 200px zu verkleinern
    Then stoppt die Verkleinerung bei 200px
    And der Container bleibt mindestens 200px breit

  Scenario: Maximum-Breite wird eingehalten
    Given der Dokument-Container ist sichtbar
    When ich versuche den Container über 60% der Viewport-Breite zu vergrößern
    Then stoppt die Vergrößerung bei 60%
    And der Chat-Bereich behält mindestens 40% Breite

  Scenario: Visuelles Feedback beim Resize
    Given der Dokument-Container ist sichtbar
    When ich den Mauszeiger über den linken Rand bewege
    Then ändert sich der Cursor zu "col-resize"
    And der Rand zeigt einen visuellen Hover-Effekt
```

---

## Technische Details

### WAS (Scope)
- Resize-Handle als `<div>` am linken Rand des Docs-Panels
- Drag-Event-Handler für Mouse-Events
- CSS Custom Properties für Min/Max Grenzen
- Visuelles Feedback (Cursor, Hover-Effekt)

### WIE (Implementierung)

**1. CSS Variables (`theme.css`):**
```css
:root {
  /* Docs Panel Resize */
  --docs-panel-min-width: 200px;
  --docs-panel-max-width: 60%;
  --docs-panel-default-width: 350px;
  --docs-resize-handle-width: 6px;
}
```

**2. Resize-Handle HTML (`workflow-view.ts`):**
```typescript
private renderDocsPanel() {
  return html`
    <div class="workflow-docs-panel" style="width: ${this.docsPanelWidth}px">
      <div
        class="docs-resize-handle"
        @mousedown=${this.handleResizeStart}
      ></div>
      <!-- existing panel content -->
    </div>
  `;
}
```

**3. Resize-Event-Handler (`workflow-view.ts`):**
```typescript
@state() private docsPanelWidth = 350;
@state() private isResizing = false;

private handleResizeStart(e: MouseEvent): void {
  e.preventDefault();
  this.isResizing = true;

  const onMouseMove = (e: MouseEvent) => {
    if (!this.isResizing) return;

    const viewportWidth = window.innerWidth;
    const minWidth = 200;
    const maxWidth = viewportWidth * 0.6;

    // Calculate new width from right edge
    const newWidth = viewportWidth - e.clientX;
    this.docsPanelWidth = Math.min(maxWidth, Math.max(minWidth, newWidth));
  };

  const onMouseUp = () => {
    this.isResizing = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}
```

**4. CSS Styles (`theme.css`):**
```css
.docs-resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--docs-resize-handle-width);
  cursor: col-resize;
  background: transparent;
  transition: background-color var(--transition-fast);
  z-index: 10;
}

.docs-resize-handle:hover,
.docs-resize-handle:active {
  background-color: var(--color-accent-primary);
}

.workflow-docs-panel {
  position: relative;
  min-width: var(--docs-panel-min-width);
  max-width: var(--docs-panel-max-width);
}
```

### WO (Betroffene Dateien)

| Datei | Änderung |
|-------|----------|
| `agent-os-ui/ui/src/views/workflow-view.ts` | Resize-State, Event-Handler, Render-Anpassung |
| `agent-os-ui/ui/src/styles/theme.css` | CSS Variables, Resize-Handle Styles |

### WER (Abhängigkeiten)
- Keine direkten Story-Abhängigkeiten
- Basis für WSD-004 (Persistenz)

---

## Definition of Ready (DoR)

- [x] User Story klar formuliert
- [x] Akzeptanzkriterien vollständig (Gherkin)
- [x] Technische Details dokumentiert (WAS/WIE/WO/WER)
- [x] Betroffene Dateien identifiziert
- [x] Min/Max Werte spezifiziert (200px / 60%)
- [x] Story-Größe validiert (≤5 Dateien, ≤400 LOC)

## Definition of Done (DoD)

- [x] Code implementiert gemäß technischer Spezifikation
- [x] TypeScript strict mode - keine Fehler
- [x] Lint-Fehler behoben
- [x] Manuelle Tests durchgeführt (alle Gherkin-Szenarien)
- [x] Resize funktioniert smooth ohne Flackern
- [x] Code-Review (selbst oder Pair)

---

## Completion Check

```bash
# Nach Implementierung ausführen:
cd agent-os-ui/ui && npm run lint
cd agent-os-ui/ui && npm run build
```
