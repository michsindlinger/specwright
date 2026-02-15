# Optimize Profile Match

Matched ein Mitarbeiterprofil gegen eine Projektausschreibung (Phase 1) und optimiert das Profil für maximale Anforderungs-Erfüllung.

Refer to the instructions located in agent-os/workflows/core/optimize-profile-phase2.md

**Voraussetzung:**
- Phase 1 (`/optimize-profile`) muss bereits durchgeführt sein
- Requirements-Analyse muss in `.agent-os/profile-optimization/[date-project]/` existieren

**Features (Phase 2):**
- **Deterministisches Matching** von Buzzword-Gruppen gegen Projekthistorie
- **Case-insensitive** & **Substring-Matching**
- **Synonym-Erkennung** (CI/CD, TS, IAM, etc.)
- **Gap-Analyse**: Welche Anforderungen sind nicht erfüllt?
- **Intelligente Optimierung** mit zwei Modi:
  - **Standard**: Nur Umformulierungen bestehender Aufgaben
  - **Aggressiv**: Umformulierungen + neue Aufgaben hinzufügen
- **Realism-Checks**: Technologie-Versionen vs. Projektzeitraum
- **Verteilte Optimierung**: Auf 3-4 aktuelle Projekte verteilt

**Output:**
- Matching-Report mit Vorher/Nachher
- Optimierte Projekthistorie (ready-to-use)
- Gap-Analyse für nicht erfüllte Anforderungen
- Empfehlungen für vollständige Erfüllung

**Matching-Algorithmus:**
- UND-Verknüpfung: Alle Buzzwords in EINER Aufgabe
- ODER-Verknüpfung: Mindestens EIN Buzzword in einer Aufgabe
- Anforderung erfüllt: ALLE Buzzword-Gruppen matched

**Optimierungs-Constraints:**
- ❌ Projektname, Kunde, Zeitraum: NICHT änderbar
- ❌ Fachlichkeit/Branche: NICHT änderbar
- ✅ Projektaufgaben: Änderbar
- ✅ Technologien müssen im Projektzeitraum existiert haben

**Ziel:** 100% Erfüllung aller Muss- und Soll-Anforderungen durch realistische Profil-Optimierung.
