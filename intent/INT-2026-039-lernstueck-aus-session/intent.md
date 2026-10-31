---
intent_id: "INT-2026-039"  
format: "2.3"  
titel: "Lernstück aus einer Session"  
status: "angenommen"  
version: "1.0.0"  
autor: "Michael"  
verantwortlich: "Michael (Product Owner)"  
erstellt: "2026-10-31"  
geaendert: "2026-10-31"  
freigabe:  
  von: "Michael (Product Owner)"  
  am: "2026-10-31"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Größe S: ein Befehl, ein Workflow, eine Vorlage; kein Code in UI oder Installern außer Manifest-Zeilen"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: ""  
  tracker: ""  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: ["lernen", "session", "befehl", "mermaid"]  

---

# Absicht: Lernstück aus einer Session

<!-- Ablage: intent/INT-2026-039-lernstueck-aus-session/intent.md -->

## Felder im Kopf

<!-- leser: agent -->

Bedeutung der Felder: `specwright/templates/sdlc/vorhaben/intent-template.md`, Abschnitt „Felder im Kopf".

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Michael versteht nach Abschluss eines Themas in einer Session, was gebaut wurde und warum, und lernt daraus für andere Projekte.
- **Kernaufgaben:** ein Befehl `/specwright:lernstueck`, der ein Lernstück als Markdown schreibt (was, warum, verworfene Alternativen, Muster, Sackgassen, Mermaid-Diagramme, Selbsttest-Fragen); Ablage im Projekt oder per Konfiguration im eigenen Vault.
- **Endzustand:** Ein Aufruf in einer laufenden Session liefert eine lesbare Datei am konfigurierten Ort (AK-01 bis AK-10).

## 1. Problem und Anlass

<!-- leser: mensch -->

Mit KI entsteht in einer Session mehr Code, als man nebenher versteht, oft in Themen, die man noch nicht kennt [Q: Michael, 2026-10-31]. Specwright hat dafür nichts, das sich an den Menschen richtet: `/specwright:add-learning` schreibt Regeln für Agenten in Skill-Dateien [Q: .claude/commands/specwright/add-learning.md:3], der Skill `session-handoff` fasst für die Fortsetzung durch einen Agenten zusammen, nicht zum Verstehen. Was eine Session gelehrt hat, steht danach nur in der Chat-Historie und ist mit `/clear` weg. Nach einer Kontext-Zusammenfassung kennt Claude den frühen Teil der Session nur noch verkürzt; vollständig steht er im Transkript `~/.claude/projects/<slug>/<id>.jsonl` [Q: Stichprobe 2026-10-31, Einträge mit `uuid`, Werkzeugfehler als `is_error`]. Die UI liest Transkripte bewusst nicht [Q: docs/adr/0004-sitzung-zeigen-statt-nachlesen.md:26]; das bleibt so, hier liest nur Claude die eigene Session.

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael | neuer Befehl; Lernstücke landen per Konfiguration in `AI/Insights/` seines Vaults |
| andere Specwright-Nutzer | bekommen den Befehl mit dem nächsten Update; ohne Konfiguration Ablage unter `docs/lernen/` im Projekt |
| Systeme | `.claude/commands/specwright/`, `specwright/workflows/core/`, `specwright/templates/`, `specwright/manifest.tsv`, `VERSION`/`install.sh`/`CHANGELOG.md`; UI und Installer-Code unberührt |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Nach einem Thema ist nachvollziehbar, was gebaut wurde und warum, einschließlich der verworfenen Wege.
- **Z-02:** Das Lernstück lehrt über die Session hinaus: ehrlich benannte Muster, Übertragung auf andere Kontexte, Selbsttest.
- **Z-03:** Das Lernstück liegt dort, wo der Nutzer liest, ohne dass ein persönlicher Pfad ins öffentliche Repo gelangt.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Keine Prüfung, ob Zeilenangaben oder Fundstellen stimmen; keine Treueprüfung mit zweitem Agenten; keine goldene Test-Session (entschieden 2026-10-31, Michael: „nicht zu eng und zu strikt").
- **NZ-02:** Kein Abruf-Planer, keine Trefferquote, kein Verzeichnis des Wissensstands.
- **NZ-03:** Kein Transkript-Leser im UI-Backend; ADR-0004 bleibt unverändert.
- **NZ-04:** Kein Skill `diagram-design`, keine gerenderten Bilder, keine Prüfung der Diagramme.
- **NZ-05:** Kein Knopf in der Web-UI, kein automatisches Auslösen am Session-Ende.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn der Nutzer `/specwright:lernstueck` in einer laufenden Session aufruft, MUSS das System eine Markdown-Datei zum zuletzt abgeschlossenen Thema oder zum als Argument genannten Thema schreiben. | Z-01 | Stichprobe |
| AK-02 | Das Lernstück MUSS erklären, was gebaut wurde und warum, und zu jeder wesentlichen Entscheidung mindestens eine verworfene Alternative mit Grund nennen. | Z-01 | Review |
| AK-03 | Das Lernstück MUSS jedes genannte Muster oder jede Methode in Alltagssprache erklären und ein Muster, das der Code nur teilweise umsetzt, als „ähnlich zu …" kennzeichnen. | Z-02 | Review |
| AK-04 | Falls in der Session Ansätze verworfen oder Fehler behoben wurden, MUSS das Lernstück sie mit der Lehre daraus nennen. | Z-02 | Review |
| AK-05 | Das Lernstück MUSS 3 bis 5 Selbsttest-Fragen mit Antworten und mindestens einen Hinweis zur Übertragung auf andere Kontexte enthalten. | Z-02 | Review |
| AK-06 | Das Lernstück MUSS Diagramme, falls vorhanden, als Mermaid-Codeblock enthalten, höchstens zwei. | Z-01 | Stichprobe |
| AK-07 | Falls der Kontext der Session zusammengefasst wurde, MUSS das Lernstück auch das Geschehen vor der Zusammenfassung abdecken. | Z-01 | Stichprobe |
| AK-08 | Solange `~/.specwright/lernstueck.conf` kein Ziel nennt, MUSS das System das Lernstück unter `docs/lernen/` des Projekts ablegen. | Z-03 | Stichprobe |
| AK-10 | Wenn `~/.specwright/lernstueck.conf` ein Ziel nennt, MUSS das System das Lernstück dort ablegen. | Z-03 | Stichprobe |
| AK-09 | Nach Installation oder Update MUSS der Befehl im Zielprojekt verfügbar sein. | Z-03 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Sicherheit | Kein persönlicher Pfad, Vault-Name oder Hostname im Repo; der Vault-Pfad steht nur in der lokalen Konfiguration. | `CLAUDE.md` „Nie", `docs/security.md` |
| RB-02 | Sicherheit | Das Transkript wird nur für die eigene Session gelesen; Inhalte, die nach Geheimnis aussehen (Tokens, Schlüssel, Passwörter), gelangen nicht ins Lernstück. | `docs/security.md:103` |
| RB-03 | Technik | Jede neue Datei bekommt eine Zeile in `specwright/manifest.tsv`. Grund: AR-01, Guard in `verify`. | `CLAUDE.md` Konventionen |
| RB-04 | Technik | Der Hauptagent führt aus, keine Sub-Agenten; Vorlage mit Hybrid-Lookup, Platzhalter `[…]`. | `CLAUDE.md` Konventionen |
| RB-05 | Betrieb | Liefer-PR hebt `VERSION`, `install.sh:FRAMEWORK_VERSION` und `CHANGELOG.md`. | Michael, Feedback (Version je Liefer-PR) |
| RB-06 | Technik | Lernstück MacDown-tauglich (Leerzeile vor Listen, Überschriften, Tabellen, Codeblöcken). | globale `CLAUDE.md`, Abschnitt Markdown-Dateien |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | Zeigt Michaels MacDown Mermaid als Bild? *entschieden 2026-10-31 (Michael, Product Owner)*: nicht blockierend; Obsidian ist der Leseort, MacDown zeigt notfalls den Mermaid-Text (AK-06). | nein | Michael | 2026-11-07 |

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-10-31 | Freigabe. AK-08 in AK-08/AK-10 geteilt (ein Modalverb je Kriterium). Abgleich Mensch/Agent: Befund: AK-08 hatte zwei Modalverben, behoben; sonst ohne Befund (keine Vertragsschicht, Risikoklasse niedrig). | AK-08, AK-10, OF-01 | Michael (Product Owner), 2026-10-31 |
| 0.1.0 | 2026-10-31 | Entwurf; Zuschnitt nach Gespräch verkleinert (keine Belegprüfung, kein Abruf-Planer, Mermaid statt diagram-design), Ablage und Quelle entschieden 2026-10-31 (Michael) | alle | — |
