# Test-Szenarien: Spec Docs Viewer Extension

> Generiert am 2026-02-12 nach Abschluss der Implementierung
> Spec: agent-os/specs/2026-02-12-spec-docs-viewer-extension

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI für automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung läuft lokal (`npm run dev` im `agent-os-ui` Verzeichnis)
- [ ] Mindestens ein Spec mit mehreren Markdown-Dateien existiert in `agent-os/specs/`
- [ ] WebSocket-Verbindung zwischen Frontend und Backend ist aktiv

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| Spec-Ordner | `agent-os/specs/2026-02-12-spec-docs-viewer-extension/` | Enthält spec.md, spec-lite.md, implementation-plan.md, story-index.md und Stories |

---

## Test-Szenarien

### Szenario 1: SDVE-001 - Backend Spec-Dateien auflisten und generisch lesen/speichern

**Beschreibung:** Prüft ob das Backend alle Markdown-Dateien eines Specs korrekt auflistet, liest und speichert.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Spec Viewer im Kanban Board öffnen | WebSocket-Nachricht `specs.files` wird gesendet |
| 2 | Response der Dateiliste prüfen | Alle .md Dateien werden gruppiert nach Ordner zurückgegeben (root + stories/) |
| 3 | Eine beliebige Datei (z.B. implementation-plan.md) über Tab auswählen | `specs.read` mit `relativePath` wird gesendet und Inhalt wird zurückgegeben |
| 4 | Datei bearbeiten und speichern | `specs.save` mit `relativePath` wird gesendet und Datei wird auf Dateisystem aktualisiert |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Nicht-existierende Datei | Anfrage für `missing.md` | Fehlermeldung "Datei nicht gefunden" |
| Path-Traversal-Versuch | Anfrage für `../../secrets.md` | Zugriff wird verweigert, Fehlermeldung |
| Backward-Kompatibilität | Client sendet `fileType: "spec"` statt `relativePath` | Wird korrekt auf `spec.md` gemappt |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Spec-Ordner existiert nicht | Ungültige specId | Fehlermeldung vom Backend |
| Path Traversal | `relativePath` enthält `..` | Zugriff verweigert |

---

### Szenario 2: SDVE-002 - Dynamische Tab-Bar Komponente

**Beschreibung:** Prüft ob die Tab-Bar alle Dateien gruppiert anzeigt und Tab-Wechsel korrekt funktioniert.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Spec Viewer öffnen | Tab-Bar wird mit allen Dateien gruppiert nach Ordner angezeigt |
| 2 | Gruppen prüfen | Gruppen-Header zeigen "root" und "stories/" an |
| 3 | Tab "implementation-plan.md" anklicken | Tab wird als aktiv hervorgehoben, `file-selected` Event wird emittiert |
| 4 | Aktiver Tab visuell prüfen | Nur der angeklickte Tab hat aktive Markierung |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Spec ohne Unterordner | Nur spec.md und spec-lite.md vorhanden | Nur eine Gruppe "root" wird angezeigt, keine leeren Header |
| Viele Tabs | 15+ Story-Dateien | Horizontales Scrolling funktioniert, kein Umbruch |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Leere Dateiliste | Backend liefert keine Dateien | Hinweismeldung "Keine Dokumente gefunden" |

---

### Szenario 3: SDVE-003 - Kanban Board Integration

**Beschreibung:** Prüft ob der Spec Viewer im Kanban Board korrekt mit dynamischen Tabs und Lazy Loading funktioniert.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Kanban Board eines Specs öffnen | Spec Viewer Button ist sichtbar |
| 2 | Spec Viewer öffnen | `specs.files` wird gesendet, Tab-Bar erscheint mit allen Dateien |
| 3 | Erste Datei (spec.md) prüfen | Ist automatisch ausgewählt und Inhalt wird angezeigt |
| 4 | Tab "stories/story-001-..." anklicken | Neuer Tab wird aktiv, Inhalt wird per `specs.read` mit `relativePath` geladen |
| 5 | In den Edit-Modus wechseln und speichern | Speichern nutzt `specs.save` mit `relativePath`, Bestätigungsmeldung erscheint |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Lazy Loading | 10 Tabs angezeigt | Nur Inhalt des aktiven Tabs wird geladen, andere erst bei Klick |
| Leerer Spec-Ordner | Keine Markdown-Dateien | Hinweismeldung statt leerer Tab-Bar |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| WebSocket-Verbindung unterbrochen | Server nicht erreichbar | Fehlermeldung im UI |

---

### Szenario 4: SDVE-004 - Interaktive Checkboxen mit Persistierung

**Beschreibung:** Prüft ob Checkboxen in Markdown-Dokumenten interaktiv anklickbar sind und Änderungen gespeichert werden.

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | Dokument mit Checkboxen öffnen (z.B. user-todos.md oder Story-Datei) | Checkboxen werden als anklickbare Inputs gerendert |
| 2 | Offene Checkbox `- [ ]` anklicken | Checkbox wird als abgehakt dargestellt `- [x]` |
| 3 | Speicherung prüfen | Änderung wird automatisch via `specs.save` gespeichert |
| 4 | Abgehakte Checkbox erneut anklicken | Checkbox wird wieder als offen dargestellt `- [ ]` |
| 5 | Mehrere Checkboxen in verschiedenen Abschnitten togglen | Nur die angeklickte Checkbox wird geändert, alle anderen bleiben unverändert |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| Checkbox in Code-Block | `- [ ] Todo` innerhalb von ``` Fenced Code Block | Checkbox ist NICHT interaktiv/anklickbar |
| Viele Checkboxen | Dokument mit 20+ Checkboxen | Korrekte Index-Zuordnung, richtige Checkbox wird getoggelt |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| Speicherfehler | Dateisystem-Fehler beim Save | Checkbox wird visuell zurückgesetzt, Fehlermeldung |

---

## Regressions-Checkliste

Bestehende Funktionalität, die nach der Implementierung noch funktionieren muss:

- [ ] Kanban Board Grundfunktionalität - Board öffnen, Stories sehen, Status-Änderungen
- [ ] Spec Viewer öffnen/schließen - Modal öffnet und schließt korrekt
- [ ] Spec Content lesen und anzeigen - Markdown wird korrekt gerendert
- [ ] Spec Content bearbeiten und speichern - Edit-Modus funktioniert weiterhin
- [ ] Docs Viewer Grundfunktionalität - Markdown-Rendering funktioniert unverändert
- [ ] Gateway WebSocket-Kommunikation - Bestehende Message-Typen funktionieren weiterhin

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
Tab-Bar Komponente: aos-spec-file-tabs
Tab Button: aos-spec-file-tabs button
Aktiver Tab: aos-spec-file-tabs button.active
Docs Viewer: aos-docs-viewer
Interaktive Checkbox: input[type=checkbox][data-checkbox-index]
Spec Viewer Modal: .spec-viewer-modal
```

### API-Endpunkte
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `specs.files` | WebSocket | Alle Markdown-Dateien eines Specs auflisten |
| `specs.read` | WebSocket | Einzelne Datei lesen (mit `relativePath`) |
| `specs.save` | WebSocket | Einzelne Datei speichern (mit `relativePath`) |

### Mock-Daten
```json
{
  "specFiles": {
    "groups": [
      {
        "folder": "root",
        "files": [
          { "relativePath": "spec.md", "filename": "spec.md" },
          { "relativePath": "spec-lite.md", "filename": "spec-lite.md" }
        ]
      },
      {
        "folder": "stories",
        "files": [
          { "relativePath": "stories/story-001-feature.md", "filename": "story-001-feature.md" }
        ]
      }
    ]
  }
}
```

---

## Notizen

- Die Tab-Bar nutzt Light DOM, daher können Parent-Styles die Tabs beeinflussen
- Checkbox-Toggle nutzt Pattern-Matching im Raw-Markdown, Code-Blocks werden übersprungen
- Backward-Kompatibilität: Alte Clients die `fileType` statt `relativePath` senden funktionieren weiterhin
