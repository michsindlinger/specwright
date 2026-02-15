# Streaming Optimization

> Story ID: CMDR-005
> Spec: Chat Markdown Rendering
> Created: 2026-01-30
> Last Updated: 2026-01-30

**Priority**: High
**Type**: Frontend
**Estimated Effort**: S
**Dependencies**: CMDR-001
**Status**: Done

---

## Feature

```gherkin
Feature: Streaming Optimization
  Als Entwickler der mit Claude Code chattet
  möchte ich dass Markdown während des Streamings progressiv gerendert wird,
  damit ich die Antwort in Echtzeit lesen kann ohne Flackern oder Verzögerungen.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Progressive Rendering während Streaming

```gherkin
Scenario: Text wird progressiv gerendert während Claude antwortet
  Given ich befinde mich im Chat-Interface
  And ich habe eine Nachricht an Claude gesendet
  When Claude beginnt zu antworten
  Then sehe ich den Text Zeichen für Zeichen erscheinen
  And bereits empfangener Text bleibt stabil
  And neu hinzugefügter Text wird flüssig angefügt
```

### Szenario 2: Code-Blöcke werden erst nach Abschluss gerendert

```gherkin
Scenario: Code-Block Syntax-Highlighting nach vollständigem Empfang
  Given ich befinde mich im Chat-Interface
  And Claude sendet einen Code-Block im Stream
  When der Code-Block noch nicht geschlossen ist (kein abschließendes ```)
  Then sehe ich den Code als einfachen Text
  And sobald der Code-Block geschlossen ist
  Then wird Syntax-Highlighting angewendet
```

### Szenario 3: Kein Flackern bei Markdown-Strukturen

```gherkin
Scenario: Tabelle wird stabil ohne Flackern aufgebaut
  Given ich befinde mich im Chat-Interface
  And Claude sendet eine Markdown-Tabelle im Stream
  When neue Zeilen zur Tabelle hinzugefügt werden
  Then wird die Tabelle progressiv aufgebaut
  And bestehende Zeilen flackern nicht
  And die Struktur bleibt während des Aufbaus erkennbar
```

### Szenario 4: Cursor-Indikator während Streaming

```gherkin
Scenario: Blinkender Cursor zeigt aktives Streaming an
  Given ich befinde mich im Chat-Interface
  And Claude antwortet gerade
  When Text gestreamt wird
  Then sehe ich einen blinkenden Cursor am Ende der Nachricht
  And sobald die Antwort komplett ist
  Then verschwindet der Cursor
```

### Szenario 5: Debouncing verhindert Performance-Probleme

```gherkin
Scenario: Häufige Updates werden gebündelt für bessere Performance
  Given ich befinde mich im Chat-Interface
  And Claude antwortet mit schnellem Streaming (viele Zeichen pro Sekunde)
  When die Updates ankommen
  Then wird das Rendering gebündelt (nicht bei jedem Zeichen)
  And die UI bleibt responsiv
  And der Text erscheint trotzdem flüssig
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Streaming wird unterbrochen
  Given ich befinde mich im Chat-Interface
  And Claude antwortet gerade
  When die Verbindung unterbrochen wird
  Then wird der bisher empfangene Text korrekt angezeigt
  And unvollständige Markdown-Strukturen werden graceful behandelt
  And eine Fehlermeldung informiert über die Unterbrechung
```

```gherkin
Scenario: Sehr lange Streaming-Antwort
  Given ich befinde mich im Chat-Interface
  And Claude sendet eine sehr lange Antwort (1000+ Zeilen)
  When die Antwort gestreamt wird
  Then bleibt die Performance akzeptabel
  And Auto-Scroll funktioniert während des Streamings
  And der Benutzer kann nach oben scrollen ohne Probleme
```

---

## Technische Verifikation (Automated Checks)

### Datei-Prüfungen

- [ ] FILE_EXISTS: ui/src/components/chat-message.ts

### Inhalt-Prüfungen

- [ ] CONTAINS: ui/src/components/chat-message.ts enthält "streaming"
- [ ] CONTAINS: ui/src/components/chat-message.ts enthält "debounce" oder "throttle" oder "requestAnimationFrame"

### Funktions-Prüfungen

- [ ] LINT_PASS: cd ui && npm run lint
- [ ] BUILD_PASS: cd ui && npm run build

---

## Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| Playwright (optional) | Performance Testing | No |

---

## Technisches Refinement (vom Architect)

> **Refinement durchgeführt:** 2026-01-30

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

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [x] Code implementiert und folgt Style Guide
- [x] Architektur-Vorgaben eingehalten (WIE section)
- [x] Security/Performance Anforderungen erfüllt

#### Qualitätssicherung
- [x] Alle Akzeptanzkriterien erfüllt (via Completion Check verifiziert)
- [x] Unit Tests geschrieben und bestanden
- [x] Integration Tests geschrieben und bestanden
- [x] Code Review durchgeführt und genehmigt

#### Dokumentation
- [x] Dokumentation aktualisiert
- [x] Keine Linting Errors
- [x] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only

**Betroffene Komponenten:**

| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `ui/src/components/chat-message.ts` | ADD: Debounced rendering, streaming-aware parsing |
| Frontend | `ui/src/utils/markdown-renderer.ts` | ADD: Incomplete block detection |

**Kritische Integration Points:** Keine (Frontend-only)

**Hinweis:** Die bestehende `streaming` Property in chat-message.ts zeigt bereits einen blinkenden Cursor. Dies muss erweitert werden um Debouncing und intelligentes Partial-Rendering.

---

### Technical Details

**WAS:**
- Debouncing für Markdown-Rendering während Streaming
- Erkennung unvollständiger Code-Blöcke (kein abschließendes ```)
- Erkennung unvollständiger Tabellen
- Progressive Rendering von vollständigen Absätzen
- Vermeidung von Flackern bei schnellen Updates
- Blinkender Cursor während aktivem Streaming

**WIE (Architektur-Guidance ONLY):**
- Nutze requestAnimationFrame für Rendering-Debouncing
- Erkenne unvollständige Strukturen: Suche nach öffnenden ``` ohne schließende
- Für unvollständige Blöcke: Zeige Plaintext statt Markdown-Rendering
- Cached rendered content: Nur re-render wenn sich tatsächlich Content ändert
- Nutze bestehende `streaming` Property für Cursor-Anzeige
- Markdown parse nur wenn `!streaming` ODER debounce-timer abgelaufen
- Debounce-Interval: ~50-100ms für flüssige UX

**WO:**
- `ui/src/components/chat-message.ts` (MODIFY)
- `ui/src/utils/markdown-renderer.ts` (MODIFY)

**Abhängigkeiten:** CMDR-001

**Geschätzte Komplexität:** S (Small - Performance-Optimierung, ~80 LOC)

---

### Relevante Skills

| Skill | Pfad | Grund |
|-------|------|-------|
| frontend-lit | agent-os/team/skills/frontend-lit.md | Reactive Properties, Lifecycle |

---

### Completion Check

```bash
# Auto-Verify Commands - alle müssen mit 0 exiten
grep -q "requestAnimationFrame\|debounce\|throttle" ui/src/components/chat-message.ts && echo "✓ Debouncing implemented"
grep -q "streaming" ui/src/components/chat-message.ts && echo "✓ streaming property used"
cd ui && npm run lint
cd ui && npm run build
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Änderungen
