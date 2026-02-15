# Spec: Global Spec Queue

**ID:** 2026-02-13-global-spec-queue
**Created:** 2026-02-13
**Status:** ready
**Prefix:** GSQ

## Beschreibung
Projektübergreifende Spezifikationsansicht mit globaler Queue-Ausführung als Bottom Panel. Das Panel ist jederzeit sichtbar (unabhängig vom Projekt) und enthält eine Split-View mit Queue (links) und Specs (rechts) sowie einen Execution Log Tab.

## Ziele
- Projektübergreifende Spec-Übersicht über alle offenen Projekte
- Globale Queue zur sequenziellen Ausführung von Specs über Projektgrenzen hinweg
- Bottom Panel als persistente UI-Komponente (wie Cloud Terminal)
- Drag & Drop von Specs in die Queue durch Split-View
- Execution Log für Queue-Ausführung

## Architektur
- Bottom Panel als globale Komponente in `aos-app` (Light DOM Pattern wie Cloud Terminal)
- 2 Tabs: "Queue & Specs" (Split-View) + "Log"
- Backend: Globaler Queue-State statt per-project, Multi-Project Spec-Loading
- WebSocket: Punkt-Notation (queue.add, specs.list-all, etc.)

## Abhängigkeiten
- Bestehende Queue-Implementierung (aos-queue-sidebar) wird migriert und ersetzt
- Cloud Terminal Pattern als Referenz für globale Panel-Injection

## Story Count
- 9 Feature Stories (GSQ-001 bis GSQ-009)
- 3 System Stories (GSQ-997, GSQ-998, GSQ-999)
