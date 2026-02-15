# Requirements Clarification: Workflow-Specific Documents

> Feature: Workflow-spezifischer Dokument-Container mit Resize-Funktionalität
> Spec-ID: WSD (Workflow-Specific Documents)
> Erstellt: 2026-01-30
> Status: Zur Freigabe

---

## 1. Problem Statement

### Aktueller Zustand
- Bei der Ausführung von Workflows werden rechts die generierten Dokumente angezeigt
- Der Dokument-Container ist **global** - nicht workflow-spezifisch
- Bei parallelen Workflows werden Dokumente gemischt angezeigt (mal aus Workflow A, mal aus Workflow B)
- Der Container ist relativ schmal und Inhalte sind schlecht lesbar
- Keine Möglichkeit, die Container-Größe anzupassen

### Gewünschter Zustand
- Jeder Workflow-Tab hat seinen **eigenen** Dokument-Container
- Tab-Wechsel aktualisiert die Dokument-Ansicht entsprechend
- Container ist **resizable** für bessere Lesbarkeit
- Größe wird pro Workflow persistent gespeichert

---

## 2. Geklärte Anforderungen

### 2.1 Initialisierung
| Aspekt | Entscheidung |
|--------|--------------|
| Neuer Workflow-Tab | Container startet **leer** |
| Dokumente erscheinen | Erst bei Generierung durch den Workflow |

### 2.2 Resize-Funktionalität
| Aspekt | Entscheidung |
|--------|--------------|
| Minimum Breite | **200px** |
| Maximum Breite | **60%** der Viewport-Breite |
| Resize-Richtung | Horizontal (links-rechts) |
| Resize-Handle | Linker Rand des Containers |

### 2.3 Persistenz
| Aspekt | Entscheidung |
|--------|--------------|
| Größen-Speicherung | **Pro Workflow** individuell |
| Speicherort | LocalStorage oder ExecutionStore |
| Fallback | Default-Größe wenn keine gespeichert |

### 2.4 Tab-Close Verhalten
| Aspekt | Entscheidung |
|--------|--------------|
| Dokumente im Dateisystem | **Bleiben erhalten** |
| UI-Referenz | Wird entfernt |
| Keine Warnung | Dokumente sind bereits persistiert |

---

## 3. User Stories (Übersicht)

### Story 1: Workflow-spezifischer Dokument-State
**Als** User mit mehreren parallelen Workflows
**Möchte ich** dass jeder Workflow seinen eigenen Dokument-Container hat
**Damit** ich die generierten Dokumente eines spezifischen Workflows sehen kann

### Story 2: Tab-Wechsel synchronisiert Dokumente
**Als** User der zwischen Workflow-Tabs wechselt
**Möchte ich** dass die Dokument-Ansicht automatisch zum aktiven Workflow wechselt
**Damit** ich immer die relevanten Dokumente sehe

### Story 3: Resizable Dokument-Container
**Als** User der Dokumente lesen möchte
**Möchte ich** den Dokument-Container größer ziehen können
**Damit** ich die Inhalte besser lesen kann

### Story 4: Persistente Container-Größe pro Workflow
**Als** User mit individuellen Größen-Präferenzen pro Workflow
**Möchte ich** dass die Größe pro Workflow gespeichert wird
**Damit** ich beim Tab-Wechsel meine bevorzugte Größe wiederfinde

---

## 4. Scope & Abgrenzung

### In Scope
- Workflow-spezifischer Dokument-State im ExecutionStore
- Synchronisierung bei Tab-Wechsel
- Resize-Handle mit Drag-Funktionalität
- Min/Max Grenzen (200px / 60%)
- Persistenz der Größe pro Workflow
- Aktualisierung bestehender Komponenten

### Out of Scope
- Vertikales Resize (Höhe)
- Collapse/Expand Toggle
- Dokument-Preview in separatem Modal
- Export-Funktionalität für Dokumente
- Dokument-History über Session hinaus

---

## 5. Betroffene Komponenten (Vorläufig)

| Komponente | Änderung |
|------------|----------|
| `execution-store.ts` | Document-State pro Execution |
| `workflow-view.ts` | Tab-Wechsel synchronisiert Dokumente |
| `workflow-chat.ts` oder neue Komponente | Resizable Container |
| `theme.css` | CSS Custom Properties für Resize |

---

## 6. Akzeptanzkriterien (Übersicht)

1. ✅ Jeder Workflow-Tab hat isolierte Dokument-Anzeige
2. ✅ Tab-Wechsel zeigt korrekte Dokumente
3. ✅ Container ist per Drag resizable (200px - 60%)
4. ✅ Größe wird pro Workflow gespeichert
5. ✅ Bei Tab-Schließung bleiben Dateien im Filesystem

---

## 7. Freigabe

**Bitte bestätige, dass diese Anforderungen korrekt erfasst wurden.**

Nach Freigabe werden die User Stories mit technischen Details (WAS/WIE/WO/WER) und DoR/DoD angereichert.

---

*Erstellt durch PO-Phase des Create-Spec Workflows*
