# Produkt: Specwright

> **Firma:** Sindlinger Business Solutions — Auftrag, Werte, Marke: Firmen-Repo (`mission.md`, `brand.md`; entsteht in Phase 3 des SDLC-Umbaus)
> **Stand:** 2026-09-14 · **Verantwortlich:** Product Owner (Michael Sindlinger)
> **Gilt für:** jede `intent.md` (Feld `bezuege.product`), jede Spec (Bedenken-Prüfung), Plan Mode

## 1. In einem Satz

Specwright ist der Arbeitsablauf, mit dem ein einzelner Entwickler zusammen mit Claude Code Software plant, baut und ausliefert, ohne dass Absicht, Fachlichkeit und Technik im Chat verloren gehen — als Satz von Befehlen, Vorlagen, Hooks und einer optionalen Web-UI, installierbar in jedes Projekt.

## 2. Nutzer

| Nutzergruppe | Ziel | Was sie heute stattdessen tun |
|---|---|---|
| Michael als Entwickler und Product Owner seiner Projekte (Applai, Kreis Lippe, Brodybookings, kinder-phone, RD-Recruiting) | Ein Vorhaben in einer Sitzung von der Absicht bis zum PR bringen, mit Belegen und Nachweisen, die ein späterer Leser versteht | Plan Mode → umsetzen → Claude testet → deploy, ohne Dokument, das die Entscheidungen trägt |
| Ein Agent, der ein Projekt frisch öffnet (neue Sitzung, anderes Gerät, Cloud-Droplet) | In Minuten wissen, was gilt: Projekt-Docs, Verify-Befehl, Verbotsliste, laufende Vorhaben | Chat-Historie und Memory durchsuchen |
| Leser des öffentlichen Repos (Referenz für den AI-native SDLC, Personal Brand) | Sehen, wie der Ablauf in einem echten Repo gelebt wird | — |

## 3. Problem

Ohne festen Ablauf zerfällt Softwarearbeit mit einem Agenten in Chat-Sitzungen: Die Absicht steht im Kopf, die Spec im Prompt, der Plan im Kontext, und nach dem Merge weiß niemand mehr, warum etwas so gebaut wurde. Der erste Versuch (Specwright v3) zerlegte Pläne in Stories und führte jede in einer frischen Sitzung aus; die Verdrahtung zwischen den Stories gehörte niemandem — „viel gebaut, nicht angeschlossen" (Diagnose 13.09.2026). Dazu wuchs der Lieferumfang auf 45 Befehle, von denen 22 nichts mit dem Ablauf zu tun hatten, und fünf Installer führten fünf verschiedene Listen (INT-2026-002).

## 4. Was das Produkt anders macht

- **Der Plan ist die Einheit der Ausführung.** Eine Sitzung setzt ihn ganz um; Zerlegung nur mit Beweis der Unabhängigkeit und Integration in der Hauptsitzung.
- **Drei Dokumente, drei Leser:** `intent.md` (fachlich, mit Belegen aus dem Code), `spec.md` (Abläufe und Anforderungen, keine Technik), `plan.md` (Dateien, Verbindungen, Nachweise). Projekt-Docs markieren Bedenken, entscheiden nichts.
- **Hooks erzwingen, was Prosa nur empfiehlt:** Tests und Baselines gesperrt im Fix-Modus, keine Secrets im Commit, kein Produktions-Deploy ohne Freigabe.
- **Ein Manifest, ein Guard:** jede ausgelieferte Datei steht in `specwright/manifest.tsv`; alle Installer lesen dieselbe Liste; CI schlägt bei Drift an.
- **Das Repo lebt den Ablauf selbst** (`intent/`, `docs/`, `scripts/verify.sh`).

## 5. Kernfunktionen

| Funktion | Für wen | Stand |
|---|---|---|
| Vorhaben-Flow `/intent` → `/spec` → `/plan` → `/build` mit Vorlagen und Workflows | Entwickler, Agent | live (Pilot INT-2026-001, 14.09.2026) |
| Projekt-Docs-Vorlagen (`product-brief`, `architecture`, `security`, `design`, `CLAUDE`) | Agent im Plan Mode | live |
| Hooks `protect-tests`, `no-secrets`, `production-gate` | jedes Projekt | live |
| Installer (`install.sh`, `setup*.sh`, `update-specwright.sh`) aus einem Manifest, Update räumt Entferntes auf | Entwickler | in Arbeit (INT-2026-002) |
| Alt-Befehle für Produktplanung, Story-Specs, Bugs, Skills, Changelog (`/plan-product`, `/create-spec`, `/add-bug`, …) | Entwickler, Web-UI | live, Umbau je Befehl später |
| Web-UI: Projekte, Kanban, Auto-Mode über `execute-tasks`, Cloud-Terminal, Shared Workspace | Entwickler (Mac, Handy, Droplet) | live; Neuentwurf in Phase 5 |
| Kanban-MCP-Server mit Memory-Store | Web-UI, Auto-Mode | live |

## 6. Erfolgsmaße

| Kennzahl | Zielwert | Quelle |
|---|---|---|
| Vorhaben, die in einer Sitzung von Plan bis PR durchlaufen | ≥ 80 % | `intent/`-Ordner mit `plan.md` Status `umgesetzt` je Projekt |
| Befehle nach frischer Installation | 23 | `scripts/test-installers.sh` |
| Abweichungen Manifest ↔ Installer | 0 | `scripts/check-manifest.sh` in CI |
| Projekte im v4-Flow | 2 vor Rollout, dann alle | Board Specwright |

## 7. Nicht-Ziele des Produkts

- Kein Werkzeug für Teams mit mehreren Entwicklern — Specwright ist auf einen Entwickler plus Agenten zugeschnitten (Rollen wie „Tech Lead" sind Hüte, nicht Personen).
- Keine Firmenwissens-Ablage — Leitbild, Marke, Kommunikationsregeln liegen im Firmen-Repo, nicht in Specwright.
- Kein eigenes Ticket-System — das Board (Obsidian) bleibt die gemeinsame Sicht auf offene Arbeit; Karten verweisen auf `intent/`.
- Keine Marktvalidierung, Instagram-Planung oder Story-Zeremonie mehr (entfernt in 4.0.0).

## 8. Domänenbegriffe

| Begriff | Bedeutung | Nicht zu verwechseln mit |
|---|---|---|
| Vorhaben | Eine abgeschlossene Änderung mit `intent/INT-JJJJ-NNN-kurzname/` und den drei Dokumenten | Story (v3-Einheit, nur noch im Web-UI-Pfad) |
| Absicht (`intent.md`) | Was und warum, fachlich, mit Belegen; ab Risikoklasse mittel mit Vertragsschicht | Product-Brief (Produktebene) |
| Plan (`plan.md`) | Technischer Plan aus dem Plan Mode, Einheit der Ausführung | Roadmap |
| Projekt-Docs | `docs/{product-brief,architecture,security,design}.md` — Soll und Grenzen eines Projekts | Firmen-Repo (Mission, Marke) |
| Manifest | `specwright/manifest.tsv`: Art, Geltung, Quelle, Ziel jeder ausgelieferten Datei | `removed.tsv` (Entferntes) |
| Bezugsliste | Bekannte rote Tests, gegen die Verify nur Neues meldet; nur nach CI-Lauf kürzen | Erlaubnisliste |
| Hybrid-Lookup | Datei erst im Projekt (`specwright/…`), dann global (`~/.specwright/…`) suchen | — |
| Web-UI-Pfad | `/create-spec` + `/execute-tasks` + `kanban.json`, bis Phase 5 unverändert | Vorhaben-Flow |

## 9. Mandanten und Umgebungen

| Mandant | Besonderheit | Umgebung |
|---|---|---|
| Ein Nutzer (Michael) | Installation je Projekt + global unter `~/.specwright` und `~/.claude` | Mac (lokal), Cloud-Droplet (Web-UI, Auto-Deploy bei Push auf `main`), GitHub Actions (CI) |
