# Test-Szenarien: Workflow-Specific Documents

> Generiert am 2026-02-03 nach Abschluss der Implementierung
> Spec: 2026-01-30-workflow-specific-documents

## Zweck

Dieses Dokument beschreibt Test-Szenarien für das Feature "Workflow-Specific Documents", das den Dokument-Container in der Workflow-Ausführungsansicht workflow-spezifisch macht. Dokumente werden pro Execution isoliert und der Container ist resizable mit persistenter Größe.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung läuft lokal (`cd agent-os-ui && npm run dev`)
- [ ] Browser mit Unterstützung für LocalStorage (modern)
- [ ] Mindestens zwei unterschiedliche Workflow-Kommandos verfügbar für parallele Tests

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Workflow-Kommandos | `/execute-tasks`, `/analyze` | Zwei verschiedene Kommandos für parallele Tests |

---

## Test-Szenarien

### Szenario 1: WSD-001 - Dokumente werden execution-spezifisch gespeichert

**Beschreibung:** Verifiziert, dass jeder Workflow seinen eigenen Dokument-Container hat ohne Vermischung.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Starte Workflow A (z.B. `/execute-tasks`) und lass ihn ein Dokument generieren | Dokument erscheint nur in Tab A |
| 2 | Starte Workflow B (z.B. `/analyze`) und lass ihn ein Dokument generieren | Dokument erscheint nur in Tab B |
| 3 | Klicke auf Tab von Workflow A | Nur Dokumente von Workflow A sichtbar |
| 4 | Klicke auf Tab von Workflow B | Nur Dokumente von Workflow B sichtbar |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Leerer Workflow | Neuer Workflow ohne Dokumente | Container zeigt "Keine Dokumente" oder ist leer |
| Gleicher Kommando-Typ | Zwei Instanzen desselben Kommandos | Jede Instanz hat eigene Dokumente (verschiedene commandId) |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Keine Dokumente | Workflow noch gestartet, aber keine Output | Kein Fehler - leerer Container |

---

### Szenario 2: WSD-002 - Tab-Wechsel synchronisiert Dokumente

**Beschreibung:** Beim Wechseln zwischen Workflow-Tabs werden die korrekten Dokumente angezeigt.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Workflow A ist aktiv mit 2 Dokumenten | Beide Dokumente in Liste sichtbar |
| 2 | Workflow B hat 1 Dokument | Tab B zeigt Badge mit Anzahl |
| 3 | Klicke auf Tab von Workflow B | Nur Dokument von B sichtbar, Container aktualisiert |
| 4 | Klicke zurück auf Tab von Workflow A | Wieder 2 Dokumente von A sichtbar |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Workflow ohne Dokumente | Tab-Wechsel zu leerem Workflow | Container leer, Hinweis "Keine Dokumente" |
| Schnelles Tab-Wechseln | Mehrere schnelle Klicks | Keine Race Conditions, korrekte Anzeige |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Keine | Keine bekannten Fehlerfälle für Tab-Wechsel | - |

---

### Szenario 3: WSD-003 - Resizable Dokument-Container

**Beschreibung:** Der Dokument-Container kann per Drag vergrößert/verkleinert werden.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Dokument-Container ist sichtbar | Linker Rand zeigt Resize-Handle |
| 2 | Maus über linken Rand bewegen | Cursor ändert zu "col-resize" |
| 3 | Linken Rand nach links ziehen (Drag) | Container wird breiter, Chat schmaler |
| 4 | Linken Rand nach rechts ziehen (Drag) | Container wird schmaler, Chat breiter |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Minimum-Breite (200px) | Versuch unter 200px zu ziehen | Stoppt bei 200px |
| Maximum-Breite (60%) | Versuch über 60% zu ziehen | Stoppt bei 60% Viewport-Breite |
| Viewport Resize | Browserfenster verkleinern | Container skaliert proportional |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Keine | Resize-Constraints verhindern Fehler | - |

---

### Szenario 4: WSD-004 - Persistente Container-Größe pro Workflow

**Beschreibung:** Die Container-Größe wird pro Workflow gespeichert und beim Tab-Wechsel wiederhergestellt.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Workflow A aktiv, Container auf 500px vergrößern | Größe in LocalStorage gespeichert |
| 2 | Zu Workflow B wechseln | Container hat Default oder B's gespeicherte Größe |
| 3 | Workflow B Container auf 300px einstellen | Größe für B gespeichert |
| 4 | Zurück zu Workflow A wechseln | Container wieder 500px |
| 5 | Seite neu laden (F5) | Container für aktiven Workflow hat gespeicherte Größe |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Neuer Workflow | Workflow ohne gespeicherte Größe | Default 350px wird verwendet |
| LocalStorage voll | Browser LocalStorage limit erreicht | Graceful degradation, Default-Wert |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| LocalStorage disabled | Browser privat/incognito Modus | Fallback auf Default 350px |

---

## Regressions-Checkliste

Bestehende Funktionalität, die nach der Implementierung noch funktionieren muss:

- [ ] **Terminal-Integration** - Chat und Terminal funktionieren wie vorher
- [ ] **Workflow-Execution** - Workflows starten und laufen korrekt
- [ ] **Tab-Management** - Hinzufügen/Schließen von Tabs funktioniert
- [ ] **LocalStorage Cleanup** - Alte Einträge werden nicht orphaned
- [ ] **Performance** - Keine spürbaren Performance-Einbußen

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen (z.B. mit Playwright):

### Selektoren / Identifikatoren
```css
Docs Panel: .workflow-docs-panel
Resize Handle: .docs-resize-handle
Docs List: .docs-list
Tabs: .workflow-tab[command-id="..."]
```

### API-Endpunkte
Nicht zutreffend (Frontend-only Feature)

### Mock-Daten
```javascript
{
  "commandId": "test-command-1",
  "generatedDocs": [
    { "path": "doc1.md", "content": "Content 1", "timestamp": "..." }
  ],
  "docsContainerWidth": 450
}
```

---

## Notizen

- **LocalStorage Keys:** Format ist `aos-docs-width-{commandId}`
- **Default-Werte:** 350px Container-Breite, 200px min, 60% max
- **Browser-Support:** Erfordert LocalStorage (alle modernen Browser)
- **Known Issue:** In Incognito-Modus kann LocalStorage limitiert sein
