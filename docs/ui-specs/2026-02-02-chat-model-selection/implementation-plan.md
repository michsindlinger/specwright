# Implementierungsplan: Chat Model Selection

> **Status:** DRAFT
> **Spec:** agent-os/specs/2026-02-02-chat-model-selection/
> **Erstellt:** 2026-02-02
> **Basiert auf:** requirements-clarification.md

---

## Executive Summary

Implementierung einer Model-Auswahl im Chat-Interface, die es Nutzern ermöglicht zwischen verschiedenen LLM-Providern (Anthropic, GLM) und deren Modellen zu wählen. Die Lösung nutzt bestehende UI-Patterns (Project-Selector) und erweitert das Backend um konfigurierbare CLI-Befehle pro Provider.

---

## Architektur-Entscheidungen

### Gewählter Ansatz

**Provider-Konfiguration mit CLI-Template-System:**
- Jeder Provider wird mit einem konfigurierbaren CLI-Befehl-Template definiert
- Model-Auswahl wird in der Chat-Session (Backend) gespeichert
- Frontend nutzt etabliertes Dropdown-Pattern (analog zu `aos-project-selector`)
- Settings werden in einer JSON-Konfigurationsdatei im Projekt gespeichert

### Begründung

1. **Wiederverwendbarkeit:** Das Project-Selector Pattern ist bereits etabliert und funktioniert
2. **Flexibilität:** CLI-Templates erlauben beliebige Provider ohne Code-Änderungen
3. **Minimalinvasiv:** Nur kleine Änderungen an bestehenden Komponenten nötig
4. **Erweiterbar:** Neue Provider können einfach durch Konfiguration hinzugefügt werden

### Patterns & Technologien
- **Pattern:** Singleton Store (analog zu `ExecutionStore`)
- **Technologie:** Lit Web Components, Light DOM, CSS Custom Properties
- **Kommunikation:** WebSocket mit etabliertem Message-Pattern
- **Konfiguration:** JSON-Dateien für Provider-Definition

---

## Komponenten-Übersicht

### Neue Komponenten

| Komponente | Typ | Verantwortlichkeit |
|------------|-----|-------------------|
| `aos-model-selector` | UI Component | Dropdown zur Model-Auswahl im Header |
| `ModelConfig` | TypeScript Interface | Typdefinitionen für Provider/Model-Konfiguration |
| `model-config.json` | Config File | Provider-Definitionen mit CLI-Templates |

### Zu ändernde Komponenten

| Komponente | Änderungsart | Grund |
|------------|--------------|-------|
| `app.ts` | Erweitern | Model-Selector in Header einfügen |
| `chat-view.ts` | Erweitern | Model bei Nachricht-Senden übergeben |
| `claude-handler.ts` | Erweitern | Session um Model erweitern, CLI-Routing |
| `websocket.ts` | Erweitern | Neue Message-Handler für Settings |
| `theme.css` | Erweitern | Styling für Model-Selector |
| `gateway.ts` | Erweitern | Event-Handler für Settings-Messages |

### Nicht betroffen (explizit)

- `workflow-executor.ts` - Bleibt bei Opus (per Requirement)
- `chat-message.ts` - Rendering unabhängig vom Model
- `project-selector.ts` - Wird nur als Pattern-Vorlage genutzt
- Alle Dashboard/Profile/Team Komponenten

---

## Komponenten-Verbindungen

| Source | Target | Verbindungsart | Zuständige Story |
|--------|--------|----------------|------------------|
| `aos-model-selector` | `gateway.ts` | Event-Listener + send() | Story 1 |
| `gateway.ts` | `websocket.ts` | WebSocket Message | Story 3 |
| `websocket.ts` | `claude-handler.ts` | Method Call | Story 3 |
| `claude-handler.ts` | CLI Process | spawn() mit Model-Flag | Story 3 |
| `chat-view.ts` | `aos-model-selector` | Event-Listener | Story 4 |
| Settings UI | `model-config.json` | Read/Write Config | Story 2 |

**Validierung:**
```bash
# Story 1: aos-model-selector → gateway
grep -q "gateway.send.*model" ui/src/components/model-selector.ts

# Story 3: websocket → claude-handler
grep -q "handleModelSettings" src/server/websocket.ts

# Story 4: chat-view → model-selector
grep -q "model-changed" ui/src/views/chat-view.ts
```

---

## Umsetzungsphasen

### Phase 1: Model Selector UI
**Ziel:** Frontend-Komponente für Model-Auswahl
**Komponenten:**
- `aos-model-selector.ts` (neu)
- `theme.css` (Styling)
- `app.ts` (Integration in Header)
**Abhängig von:** Nichts (Startphase)

### Phase 2: Provider-Konfiguration
**Ziel:** Konfigurierbare Provider mit CLI-Templates
**Komponenten:**
- `model-config.json` (Provider-Definitionen)
- Settings-View Erweiterung (optional, später)
- TypeScript Interfaces
**Abhängig von:** Nichts (parallel zu Phase 1 möglich)

### Phase 3: Backend Integration
**Ziel:** CLI-Routing basierend auf Model-Auswahl
**Komponenten:**
- `claude-handler.ts` (Session-Erweiterung, CLI-Routing)
- `websocket.ts` (Message-Handler)
**Abhängig von:** Phase 2 (Config-Format)

### Phase 4: Session State Integration
**Ziel:** Model-Auswahl in Chat-Session persistieren
**Komponenten:**
- `chat-view.ts` (Model bei Send übergeben)
- `gateway.ts` (Settings-Events)
**Abhängig von:** Phase 1, Phase 3

### Phase 5: Integration & Validation
**Ziel:** End-to-End Test, Fehlerbehandlung
**Komponenten:** Alle vorherigen
**Abhängig von:** Alle Phasen

---

## Abhängigkeiten

### Interne Abhängigkeiten
```
aos-model-selector ──uses──> gateway.ts
gateway.ts ──messages──> websocket.ts
websocket.ts ──calls──> claude-handler.ts
claude-handler.ts ──reads──> model-config.json
claude-handler.ts ──spawns──> CLI Process
chat-view.ts ──listens──> aos-model-selector (model-changed event)
```

### Externe Abhängigkeiten
- **Claude CLI:** Muss `--model` Flag unterstützen
- **Keine neuen npm Packages:** Nutzt nur bestehende Dependencies

---

## Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| CLI-Befehl nicht gefunden | Low | High | Validierung beim Start, Fehlermeldung mit Hinweis |
| Provider-API nicht erreichbar | Medium | Medium | Error-Handling mit Toast-Notification |
| Inkompatible CLI-Version | Low | Medium | Dokumentation der benötigten Flags |
| Session-State verloren | Low | Low | Default auf Opus fallback |

---

## Self-Review Ergebnisse

### Validiert
- [x] Project-Selector Pattern ist gut dokumentiert und wiederverwendbar
- [x] WebSocket Message-Pattern ist etabliert und konsistent
- [x] Light DOM Pattern wird durchgehend verwendet
- [x] CSS Custom Properties für Theming vorhanden
- [x] Keine Breaking Changes an bestehenden Features

### Identifizierte Probleme & Lösungen

| Problem | Ursprünglicher Plan | Verbesserung |
|---------|---------------------|--------------|
| Settings-Persistenz | Nur Session-basiert | Optional: Config-Datei für Default-Model |
| Provider-Erkennung | Hardcoded | CLI-Templates machen es konfigurierbar |

### Verbindungs-Validierung
- [x] `aos-model-selector` hat Verbindung zu `gateway.ts` (Story 1)
- [x] `gateway.ts` hat Verbindung zu `websocket.ts` (Story 3)
- [x] `websocket.ts` hat Verbindung zu `claude-handler.ts` (Story 3)
- [x] `chat-view.ts` hat Verbindung zu `aos-model-selector` (Story 4)
- [x] Keine verwaisten Komponenten

### Offene Fragen
- Keine - alle Requirements sind klar

---

## Minimalinvasiv-Optimierungen

### Wiederverwendbare Elemente gefunden

| Element | Gefunden in | Nutzbar für |
|---------|-------------|-------------|
| Dropdown-Pattern | `project-selector.ts` | `model-selector.ts` |
| Gateway Event-Pattern | `project-selector.ts` | Model-Events |
| CSS Dropdown Styling | `theme.css` | Model-Selector Styling |
| Message-Handler Pattern | `websocket.ts` | Settings-Messages |
| Light DOM Pattern | Alle Components | Model-Selector |

### Optimierungen

| Ursprünglich | Optimiert zu | Ersparnis |
|--------------|--------------|-----------|
| Neues State-Management | Gateway Events (existiert) | ~50 LOC |
| Custom Dropdown | Project-Selector Clone | ~100 LOC |
| Separate Settings-API | Inline in WebSocket | ~30 LOC |

### Feature-Preservation bestätigt
- [x] Alle Requirements aus Clarification sind abgedeckt
- [x] Kein Feature wurde geopfert
- [x] Alle Akzeptanzkriterien bleiben erfüllbar

---

## Nächste Schritte

Nach Genehmigung dieses Plans:
1. Step 2.6: User Stories aus diesem Plan ableiten
2. Step 3: Architect fügt technische Details hinzu (WAS/WIE/WO/WER/DoR/DoD)
3. Step 4: Spec ready for execution
