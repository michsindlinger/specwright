# Requirements Clarification - Context Menu

**Created:** 2026-02-03
**Status:** Pending User Approval

## Feature Overview

Globales Context Menu (Rechtsklick-Menü) für die Agent OS Web UI, das Schnellzugriff auf häufig genutzte Workflows bietet: Neue Spec erstellen, Bug erstellen, TODO erstellen und Story zu bestehender Spec hinzufügen.

## Target Users

Entwickler, die mit der Agent OS Web UI arbeiten und schnellen Zugriff auf Workflow-Aktionen benötigen, ohne durch die Navigation navigieren zu müssen.

## Business Value

- **Effizienzsteigerung:** Schneller Zugriff auf häufige Aktionen ohne Navigationswechsel
- **Konsistente UX:** Nutzt bekanntes Rechtsklick-Pattern aus Desktop-Anwendungen
- **Workflow-Integration:** Nahtlose Einbindung bestehender Workflow-Karten in Modals

## Functional Requirements

1. **Context Menu erscheint bei Rechtsklick** überall in der Anwendung (global)
2. **Vier Menüpunkte:**
   - "Neue Spec erstellen" → Öffnet Modal mit create-spec Workflow (wie bestehender Button)
   - "Bug erstellen" → Öffnet Modal mit add-bug Workflow-Karte
   - "TODO erstellen" → Öffnet Modal mit add-todo Workflow-Karte
   - "Story zu Spec hinzufügen" → Öffnet Modal mit Spec-Auswahl + add-story Workflow-Karte
3. **Modal-Verhalten:**
   - Zeigt die entsprechende Workflow-Karte (`aos-workflow-card`) im Modal
   - Schließt nach erfolgreichem Start des Workflows
   - Bei Abbruch: Bestätigungsdialog NUR wenn User bereits Eingaben gemacht hat
4. **Spec-Auswahl bei "Story zu Spec hinzufügen":**
   - Liste aller verfügbaren Specs
   - Suchfunktion zum Filtern der Specs
   - Nach Auswahl wird die add-story Workflow-Karte angezeigt

## Affected Areas & Dependencies

| Komponente | Impact |
|------------|--------|
| `app.ts` | Event-Listener für globalen Rechtsklick hinzufügen |
| Neue: `aos-context-menu.ts` | Context Menu Komponente |
| Neue: `aos-workflow-modal.ts` | Generisches Modal für Workflow-Karten |
| Neue: `aos-spec-selector.ts` | Spec-Auswahl mit Suche |
| `gateway.ts` | Endpoint zum Laden der Specs-Liste |
| Backend | API-Endpoint für Specs-Liste (falls nicht vorhanden) |
| CSS | Styles für Context Menu und neue Modals |

## Edge Cases & Error Scenarios

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Rechtsklick auf interaktives Element (Button, Input) | Context Menu erscheint trotzdem (globaler Handler) |
| Modal offen + Rechtsklick | Bestehendes Modal bleibt, kein zweites Context Menu |
| Keine Specs vorhanden | "Story zu Spec hinzufügen" zeigt Hinweis "Keine Specs vorhanden" |
| Spec-Suche ohne Ergebnisse | Hinweis "Keine Specs gefunden" |
| ESC-Taste bei offenem Context Menu | Context Menu schließt |
| Klick außerhalb Context Menu | Context Menu schließt |
| User hat Eingaben gemacht + ESC/Abbruch | Bestätigungsdialog "Änderungen verwerfen?" |
| User hat keine Eingaben gemacht + ESC/Abbruch | Modal schließt direkt ohne Bestätigung |

## Security & Permissions

- Keine besonderen Berechtigungen erforderlich
- Context Menu nutzt bestehende Workflow-Berechtigung
- Keine sensiblen Daten im Context Menu

## Performance Considerations

- Context Menu sollte sofort erscheinen (<50ms)
- Specs-Liste wird lazy geladen (erst bei "Story zu Spec hinzufügen")
- Caching der Specs-Liste für bessere Performance

## Scope Boundaries

**IN SCOPE:**
- Globales Context Menu mit 4 Menüpunkten
- Modal mit Workflow-Karte für jeden Menüpunkt
- Spec-Auswahl mit Suchfunktion
- Bestätigungsdialog bei ungespeicherten Änderungen
- CSS Styling passend zum Moltbot Dark Theme

**OUT OF SCOPE:**
- Tastaturkürzel für Context Menu
- Kontextabhängige Menüpunkte (z.B. andere Optionen auf Story-Cards)
- Anpassbare Menüpunkte (User kann keine eigenen hinzufügen)
- Rechtsklick auf nativen Browser-Content (z.B. Bilder, Links)

## Open Questions

Keine offenen Fragen - alle Anforderungen sind geklärt.

## Proposed User Stories (High Level)

1. **Context Menu Komponente** - Erstelle die `aos-context-menu` Komponente mit den vier Menüpunkten
2. **Globaler Event Handler** - Implementiere den globalen Rechtsklick-Handler in `app.ts`
3. **Generisches Workflow Modal** - Erstelle ein wiederverwendbares Modal für Workflow-Karten
4. **Spec-Selektor Komponente** - Erstelle die `aos-spec-selector` Komponente mit Suche
5. **Backend API für Specs** - Implementiere/erweitere den Endpoint zum Laden der Specs-Liste
6. **Integration & Styling** - Verbinde alle Komponenten und style sie im Moltbot Dark Theme

---

*Review this document carefully. Once approved, detailed user stories will be generated.*
