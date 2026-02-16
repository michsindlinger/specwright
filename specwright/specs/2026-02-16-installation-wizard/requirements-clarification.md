# Requirements Clarification - Installation Wizard

**Created:** 2026-02-16
**Status:** Pending User Approval

## Feature Overview
Wenn ein Benutzer in der Specwright Web UI ein neues Projekt hinzufuegt, in dem Specwright noch nicht installiert ist (kein `specwright/`-Ordner), erscheint ein modaler Installations-Wizard. Dieser fuehrt den Benutzer durch den initialen Setup-Prozess und zeigt anschliessend eine "Naechste Schritte"-Seite.

## Target Users
- Erfahrene Specwright-User, die ein neues Projekt aufsetzen
- Komplette Einsteiger, die Specwright zum ersten Mal nutzen

## Business Value
Neue Projekte koennen sofort produktiv mit Specwright arbeiten, ohne dass der Benutzer manuell wissen muss, welche Slash-Commands zum initialen Setup noetig sind. Der Wizard senkt die Einstiegshuerde und fuehrt durch den optimalen Startprozess.

## Functional Requirements

### 1. Erkennung & Trigger
- Beim Hinzufuegen eines neuen Projektpfads (Plus-Button) wird geprueft, ob ein `specwright/`-Ordner im Projektverzeichnis existiert
- Existiert der Ordner NICHT: Wizard-Modal wird angezeigt
- Existiert der Ordner (auch unvollstaendig): Wizard wird NICHT angezeigt

### 2. Wizard-Modal
- Erscheint als Modal/Overlay ueber der Hauptansicht
- Zeigt dem Benutzer die verfuegbaren Setup-Optionen mit Beschreibungen:
  - **plan-product** - Fuer ein einzelnes Produkt/Projekt planen
  - **plan-platform** - Fuer eine Multi-Modul-Plattform planen
  - **analyze-product** - Bestehendes Produkt analysieren und Specwright integrieren
  - **analyze-platform** - Bestehende Plattform analysieren und Specwright integrieren
- Bei Projekten mit vielen bestehenden Dateien wird ein Hinweis angezeigt, dass analyze-product/analyze-platform relevant sein koennte
- Die Erkennung ob es ein Bestandsprojekt ist, erfolgt anhand der Dateianzahl im Projekt
- Der Benutzer hat immer die freie Wahl, welchen Command er ausfuehrt

### 3. Command-Ausfuehrung im Modal
- Nach Auswahl des Commands wird ein Claude Code Terminal direkt im Modal angezeigt
- Verhaelt sich wie das bestehende Terminal bei Prozessausfuehrung
- Der gesamte Wizard-Prozess (plan-product, etc.) laeuft komplett im Modal ab
- Benutzer interagiert mit dem Terminal wie gewohnt

### 4. Abbrechen/Ueberspringen
- Der Benutzer kann den Wizard jederzeit abbrechen
- Bei Abbruch wird eine Meldung angezeigt: Specwright muss erst installiert werden, damit die UI voll nutzbar ist
- Der Wizard erscheint beim naechsten Oeffnen des Projekts erneut (kein "Nicht mehr anzeigen")

### 5. "Naechste Schritte"-Seite
- Erscheint automatisch nach erfolgreichem Abschluss des Wizards
- Eigene Route: `/getting-started`
- Auch spaeter ueber das Menue erreichbar
- Zeigt uebersichtlich die drei wichtigsten naechsten Aktionen:
  - **create-spec** - Feature-Spezifikation erstellen
  - **add-todo** - Schnelle Aufgabe zum Backlog hinzufuegen
  - **add-bug** - Bug mit Root-Cause-Analyse erfassen
- Zielgruppe: Sowohl Einsteiger als auch erfahrene User

## Affected Areas & Dependencies
- **Frontend (Lit Components)** - Neues Modal-Component, neue Getting-Started-View, Router-Erweiterung
- **Frontend (Terminal-Integration)** - Einbettung des Claude Code Terminals im Modal
- **Backend (Project Detection)** - Pruefung ob `specwright/`-Ordner existiert bei Projekt-Hinzufuegung
- **Backend (File Count)** - Dateianzahl im Projektverzeichnis ermitteln fuer Bestandsprojekt-Erkennung
- **Bestehendes Projekt-Management** - Integration in den bestehenden "Projekt hinzufuegen"-Flow

## Edge Cases & Error Scenarios
- Benutzer fuegt Projektpfad hinzu, der nicht existiert oder keine Leserechte hat - Fehlermeldung vor Wizard
- Benutzer bricht mitten im plan-product/plan-platform Prozess ab - Wizard zeigt Abbruch-Meldung, erscheint beim naechsten Mal erneut
- Netzwerk-/Terminal-Fehler waehrend der Command-Ausfuehrung - Standard Terminal-Error-Handling
- Benutzer fuegt Projekt hinzu, das bereits einen `specwright/`-Ordner hat - Wizard wird nicht angezeigt, normaler Flow
- `specwright/`-Ordner existiert aber ist unvollstaendig - Wizard wird NICHT angezeigt (Ordner-Existenz genuegt)

## Security & Permissions
- Keine besonderen Sicherheitsanforderungen ueber die bestehenden hinaus
- Zugriff auf Dateisystem (Ordner-Pruefung, Dateianzahl) nutzt bestehende Backend-Services

## Performance Considerations
- Ordner-Existenz-Check muss schnell sein (kein rekursiver Scan)
- Dateianzahl-Ermittlung sollte effizient sein (ggf. nur Top-Level oder mit Limit)

## Scope Boundaries

**IN SCOPE:**
- Erkennung ob Specwright installiert ist (specwright/-Ordner Check)
- Wizard-Modal mit Command-Auswahl und Beschreibungen
- Bestandsprojekt-Erkennung via Dateianzahl
- Claude Code Terminal im Modal fuer Command-Ausfuehrung
- Abbruch-Handling mit Wiedererscheinen
- /getting-started Route mit den drei Naechsten-Schritte-Optionen
- Menue-Eintrag fuer /getting-started

**OUT OF SCOPE:**
- CLI-Integration (nur Web UI)
- Automatische Erkennung des Tech Stacks
- Wizard fuer Updates/Upgrades bestehender Specwright-Installationen
- Erweiterte Onboarding-Tutorials oder Video-Integration
- Anpassbare Wizard-Schritte

## Open Questions (if any)
- Keine offenen Fragen

## Proposed User Stories (High Level)
1. **Specwright-Erkennung beim Projekt-Hinzufuegen** - Backend prueft auf specwright/-Ordner und zaehlt Dateien
2. **Installation Wizard Modal** - Modal-Component mit Command-Auswahl, Beschreibungen und Bestandsprojekt-Hinweis
3. **Terminal-Integration im Wizard** - Claude Code Terminal eingebettet im Modal fuer Command-Ausfuehrung
4. **Wizard Abbruch-Handling** - Abbruch-Meldung und Wiedererscheinen beim naechsten Oeffnen
5. **Getting Started View** - Neue Route /getting-started mit Naechste-Schritte-Uebersicht
6. **Router & Navigation** - Route registrieren, Menue-Eintrag, automatische Weiterleitung nach Wizard

---
*Review this document carefully. Once approved, detailed user stories will be generated.*
