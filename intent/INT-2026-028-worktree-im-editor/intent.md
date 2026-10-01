---
intent_id: "INT-2026-028"  
titel: "Arbeitsordner einer Sitzung mit einem Klick in VS Code öffnen"  
status: "angenommen"  
version: "1.0.0"  
autor: "Michael Sindlinger"  
verantwortlich: "Michael (Inhaber)"  
erstellt: "2026-10-01"  
geaendert: "2026-10-01"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Größe S: ein Knopf an zwei Stellen, ein Link-Baustein, ein Einstellungsfeld für den Cloud-Host; keine Datenhaltung, kein neuer Endpunkt"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: ["cloud-terminal", "worktree", "vscode", "code-review"]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — im Chat: „Freigabe: intent.md 0.1.0\", 01.10."  
  am: "2026-10-01"  

---

# Absicht: Arbeitsordner einer Sitzung mit einem Klick in VS Code öffnen

<!-- Ablage: intent/INT-2026-028-worktree-im-editor/intent.md -->

## Felder im Kopf

<!-- leser: agent -->

Bedeutung der Kopf-Felder: siehe `specwright/templates/sdlc/vorhaben/intent-template.md`.

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Michael will den Code, den eine Claude-Sitzung gerade ändert, regelmäßig selbst ansehen; heute muss er dafür erst herausfinden, in welchem Worktree die Sitzung läuft, und den Ordner von Hand in VS Code öffnen.
- **Kernaufgaben:** An jeder aktiven Terminal-Sitzung ein Knopf „In VS Code öffnen"; er öffnet genau den Ordner, in dem die Sitzung läuft; funktioniert für die UI auf dem Mac und für die UI auf dem Cloud-Host (dort über Remote-SSH).
- **Endzustand:** Ein Klick im Sitzungskopf oder in der Sitzungsliste öffnet VS Code im richtigen Ordner (AK-01 bis AK-05).

## 1. Problem und Anlass

<!-- leser: mensch -->

Jedes Vorhaben läuft in einer eigenen Arbeitskopie (Worktree) unter `../specwright-worktrees/` [Q: CLAUDE.md, Arbeitsweise]; interaktive Claude-Sitzungen bekommen zusätzlich je eine eigene Kopie `session-<id>` [Q: ui/src/server/utils/cloud-session-worktree.ts:1-15]. Das Backend kennt den Ordner jeder Sitzung (`effectiveCwd`) [Q: ui/src/server/services/cloud-session-registry.ts:36] und schickt ihn ans Frontend [Q: ui/frontend/src/components/terminal/aos-cloud-terminal-sidebar.ts:57-62]. Gezeigt wird davon nur der letzte Ordnername als Zusatz im Tab-Titel [Q: ui/frontend/src/components/terminal/tab-title.ts:31-39]; einen Weg in den Editor gibt es nirgends in der UI (kein Treffer für `vscode` in `ui/src` und `ui/frontend/src`). Anlass: Michael will den geänderten Code künftig öfter vor dem Merge selbst lesen und hat dabei gemerkt, dass der Umweg über Suchen und Ordner-Öffnen jedes Mal nervt [Q: Michael, 2026-10-01].

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael (einziger Nutzer) | Ein Klick statt Ordner suchen und von Hand öffnen |
| Web-UI, Terminal-Bereich | Neuer Knopf im Sitzungskopf und in der Sitzungsliste der Seitenleiste |
| Web-UI, Einstellungen | Neues Feld für den Remote-SSH-Host des Cloud-Hosts (nur dort nötig) |
| VS Code auf Michaels Rechner | Wird über den Browser-Link geöffnet; auf dem Cloud-Host über die Erweiterung Remote-SSH |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Michael kommt von jeder aktiven Sitzung mit einem Klick in VS Code, ohne den Ordner zu kennen.
- **Z-02:** Es öffnet sich immer der Ordner, in dem die Sitzung tatsächlich läuft, nie ein anderer.
- **Z-03:** Das klappt sowohl mit der UI auf dem Mac als auch mit der UI auf dem Cloud-Host.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Keine anderen Editoren (Cursor, JetBrains o. ä.).
- **NZ-02:** Keine Diff- oder Code-Ansicht in der UI selbst.
- **NZ-03:** Kein Öffnen beendeter Sitzungen oder beliebiger Worktrees ohne Sitzung.
- **NZ-04:** Kein Knopf auf der Vorhaben-Seite.
- **NZ-05:** Handy-Browser: kein eigener Weg; der Knopf darf dort fehlen oder wirkungslos sein.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Solange eine Terminal-Sitzung aktiv ist und ihr Arbeitsordner bekannt ist, MUSS das System im Kopf dieser Sitzung und an ihrem Eintrag in der Sitzungsliste einen Knopf „In VS Code öffnen" zeigen. | Z-01 | Test |
| AK-02 | Wenn Michael den Knopf klickt, MUSS VS Code den Arbeitsordner öffnen, in dem diese Sitzung läuft (eigene Arbeitskopie, gewählter Worktree oder Projektordner), auch bei Shell-Sitzungen. | Z-01, Z-02 | Test + Stichprobe |
| AK-03 | Wenn die UI auf dem Mac läuft, MUSS der Klick VS Code lokal im Ordner öffnen. | Z-03 | Stichprobe |
| AK-04 | Wenn die UI auf dem Cloud-Host läuft und in den Einstellungen ein Remote-SSH-Host eingetragen ist, MUSS der Klick VS Code über Remote-SSH auf diesem Host im Ordner öffnen. | Z-03 | Test + Stichprobe |
| AK-05 | Falls der Arbeitsordner der Sitzung noch nicht gemeldet ist, dann DARF das System den Knopf NICHT anbieten. | Z-02 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Sicherheit | Hostname, Nutzer und Pfade des Cloud-Hosts dürfen nicht ins öffentliche Repo; der Remote-SSH-Host steht nur in der Laufzeit-Konfiguration des jeweiligen Rechners. | `docs/security.md` §5 (Zeile 51, 74) |
| RB-02 | Sicherheit | Der Knopf nutzt nur den Ordner, den das Backend für die Sitzung meldet; kein Pfad aus Nutzereingabe. Der volle Pfad liegt schon heute im Frontend (`effectiveCwd`), es entsteht kein neuer Abfluss; sichtbar bleibt im Text weiterhin nur der Ordnername. | `docs/security.md:31` (Labels statt Host-Pfade) |
| RB-03 | Technik | UI-Regeln: TypeScript strict, Präfix `aos-`, Stil nicht über `theme.css` in Shadow-Roots. Grund: Projektkonvention. | `CLAUDE.md`, Konventionen und Fehlerliste |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Woran erkennt die UI, ob sie auf dem Mac oder dem Cloud-Host läuft? | *entschieden 2026-10-01 (Product Owner)*: allein am Einstellungsfeld — ist ein Remote-SSH-Host eingetragen, Remote-Link, sonst lokaler Link → AK-03, AK-04 | Product Owner | — |

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-10-01 | Freigabe „intent.md 0.1.0"; OF-01 wie vorgeschlagen entschieden (Einstellungsfeld entscheidet lokal/remote). Abgleich Mensch/Agent (R4): ohne Befund — Kopf (Größe S, Risiko niedrig, Bypass ja) deckt sich mit Kern; jedes Ziel hat mindestens ein AK (Z-01: AK-01/02, Z-02: AK-02/05, Z-03: AK-03/04); keine Vertragsschicht nötig | OF-01 | Product Owner, 01.10. |
| 0.1.0 | 2026-10-01 | Entwurf nach Gespräch (Rückfragen 1–4 wie vorgeschlagen bestätigt) | alle | — |
