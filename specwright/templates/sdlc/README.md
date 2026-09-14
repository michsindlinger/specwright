# Specwright v4 — Vorlagen für den AI-native SDLC

> Stand: 2026-09-13, Entwurf. Grundlage: Anthropic „The AI-Native SDLC Playbook" (21.08.2026) und der Umbauplan `AI-native-SDLC-Plan-2026-09-13`. Diese Vorlagen ersetzen ab v4 die Story-basierten Vorlagen unter `templates/docs/` und die Produkt-Vorlagen unter `templates/product/`. Bis zum Schnitt in Phase 4 existieren beide nebeneinander.

## Grundsatz

**Die Einheit der Ausführung ist der Plan, nicht die Story.** Eine Sitzung setzt einen ganzen Plan um. Zerlegt wird nur, wenn der Plan die Unabhängigkeit der Teile beweist, und dann läuft immer eine Integrationsaufgabe in der Hauptsitzung. So bleibt nichts „gebaut, aber nicht angeschlossen".

## Drei Ebenen, drei Ablagen

| Ebene | Was | Wo | Vorlage |
|---|---|---|---|
| Firma | Auftrag/Werte, Marke, Kommunikation, Positionierung | eigenes Git-Repo je Firma (`mission.md`, `brand.md`, `communication.md`, `positioning.md`) | nicht hier (Phase 3) |
| Projekt | Produkt, Architektur (Soll), Sicherheit, Design, Arbeitsregeln | `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md`, `CLAUDE.md` im Repo-Root | `projekt/` |
| Vorhaben | Absicht, fachliche Spec, technischer Plan, optional Mock | `intent/INT-JJJJ-NNN-kurzname/{intent.md, spec.md, plan.md, design/}` | `vorhaben/` |

Dazu `hooks/`: drei deterministische Leitplanken für `.claude/settings.json`.

## Ablauf je Vorhaben

Vier Slash-Commands, ein Vorhaben: `/intent` → `/spec` → `/plan` → `/build` (Commands in `.claude/commands/specwright/`, Workflows in `specwright/workflows/core/{intent,spec,plan,build}.md`). Die alten Commands (`create-spec`, `execute-tasks`, …) bleiben bis zum Schnitt in Phase 4 bestehen; Installer kennen die neuen noch nicht.

1. **`intent.md`** — was und warum, in den Worten der Person mit der Idee. Fachlich. Committen.
2. **`spec.md`** — was genau, fachlich. Keine Technik, keine Architektur. Die Projekt-Docs werden gelesen und markieren **Bedenken**; entschieden wird nichts. Freigabe durch die verantwortliche Rolle.
3. **`design/`** (optional) — nur bei UI-Änderung: Mock, committet. Ohne Mock kein „entspricht dem Mock" in der Definition of Done.
4. **`plan.md`** — wie, technisch. Entsteht im Plan Mode (der nur `~/.claude/plans/` beschreiben darf) und wird nach dessen Verlassen als Entwurf in den Intent-Ordner geschrieben; liest `architecture.md` als Pflichtinput. Enthält den Abschnitt **Zerlegung**. Freigabe, dann Umsetzung in derselben Sitzung.
5. **Bauen und prüfen** — ein Verify-Befehl, Exit ≠ 0 bei Fehler. Definition of Done steht in `CLAUDE.md`.
6. **PR** — Review gegen `spec.md`, `plan.md`, `architecture.md`. Verschiebt der Plan eine Architekturgrenze, ändert dieselbe PR `architecture.md`.
7. **Betrieb** — Befunde (Alarme, Drift-Skript, geplante Agenten) werden zu neuen `intent.md`.

**Bypass-Regel:** Bugfix oder Aufwand unter einem Tag darf von `intent.md` direkt zu `plan.md`. Die `intent.md` bleibt Pflicht (dann nur Kern-Schicht), die `spec.md` entfällt. Wer den Bypass nimmt, schreibt `bypass: ja` mit Grund ins Frontmatter der `intent.md`.

## Wahrheiten

- Repo ist die Wahrheit für Vorhaben. Obsidian-Board-Karten verweisen auf `intent/INT-…`.
- `architecture.md` ist das Soll. Das Drift-Skript vergleicht das Ist (Compose, Manifeste, Traces) dagegen.
- `CLAUDE.md` bleibt unter einer Seite und verweist auf die Projekt-Docs statt sie zu enthalten.
- CI ist die Wahrheit für „grün". Lokale Läufe sind Vorprüfung; Bezugslisten bekannter roter Tests ändern sich nur nach einem CI-Lauf.

## Update und Lieferumfang (seit 4.0.0)

- Jede ausgelieferte Datei steht in `specwright/manifest.tsv`; alle Installer lesen diese eine Liste. Neue Datei → Zeile ergänzen, `scripts/check-manifest.sh` prüft.
- Entfernte Dateien stehen in `specwright/removed.tsv` mit Prüfsummen. `update-specwright.sh` löscht sie im Projekt nur, wenn die Datei unverändert ist; Verändertes bleibt und wird gemeldet.
- Bewusst behalten: Zielpfad in `specwright/keep.txt` des Projekts eintragen — dann schweigt das Update.
- Sicherungskopien ersetzter Dateien liegen unter `specwright/backups/<Zeitstempel>/`, nie neben der Datei. Ordner nach Sichtung löschen.

## Sprache und Form

Vorlagen und ausgefüllte Dokumente auf Deutsch, Dateinamen und Schlüssel auf Englisch (`intent.md`, `status:`). Eine englische Fassung folgt, wenn Specwright veröffentlicht wird.

Dokumente müssen in MacDown lesbar sein (kein Frontmatter-Support dort): Platzhalter in `[…]`, nie `<…>`; Leerzeile vor jeder Liste und Tabelle; im YAML-Kopf jede Zeile mit zwei Leerzeichen abschließen und eine Leerzeile vor dem schließenden `---` lassen — sonst wird der Kopf zu einem Absatz und die letzte Zeile zur Überschrift. Beides ist gültiges YAML.

## Herkunft

- `vorhaben/plan-template.md` ersetzt `docs/implementation-plan-template.md` (Verbindungsmatrix übernommen, Story-Spalte entfernt, Zerlegung neu).
- `vorhaben/spec-template.md` ersetzt `docs/spec-template.md` und `docs/requirements-clarification-template.md`.
- `vorhaben/intent-template.md` ist die schlanke Fassung der Vorlage aus der Deep Research `intent-md-Agentic-Engineering-Research-2026-09` (Vault, `AI/Insights/intent-md-artefakte/`). Vollversion mit Schema und Lint dort.
- `projekt/architecture-template.md` fasst `product/architecture-decision-template.md`, `architecture-structure`, `tech-stack-template.md` und `knowledge/*` zusammen.
- `projekt/CLAUDE-template.md` ersetzt `CLAUDE-LITE.md` und `CLAUDE.md.template`.
