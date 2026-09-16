---
intent_id: "INT-2026-006"  
titel: "Plan-Review: Anthropic-Reviewer und Konsens-Aggregator laufen unabhängig von den MCP-Servern des Nutzers"  
status: "umgesetzt"  
version: "1.0.1"  
autor: "Claude (aus Michaels Screenshot vom 2026-09-15, Reproduktion am selben Tag)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-15"  
geaendert: "2026-09-16"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Bugfix im Review-Kanal der UI, Aufwand unter einem Tag; Verhalten ist durch die bestehende Plan-Review-Spec (specwright/specs/2026-04-30-auto-plan-review) festgelegt, nur die Ausführung ist kaputt"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [plan-review, reviewer, aggregator, mcp, claude-agent-sdk, ui, bypass]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — „Freigabe, mach A1“"  
  am: "2026-09-15"  

---

# Absicht: Plan-Review: Anthropic-Reviewer und Konsens-Aggregator laufen unabhängig von den MCP-Servern des Nutzers

<!-- Ablage: intent/INT-2026-006-plan-review-mcp-ballast/intent.md -->

## Absicht in drei Sätzen

- **Zweck:** Wer in der Web-UI ein Plan-Review auslöst, soll vom Anthropic-Reviewer wieder ein Review bekommen und bei zwei oder mehr Reviewern die zusammengeführte Konsens-Fassung — heute scheitern beide, sobald in Michaels globaler Claude-Konfiguration ein MCP-Server mit einem Werkzeugschema steht, das die Anthropic-API ablehnt.
- **Kernaufgaben:** (1) Reviewer und Aggregator bekommen nur die Werkzeuge, die ihre Aufgabe braucht — keine MCP-Server aus der Nutzerkonfiguration; (2) ein Test hält das fest, damit es nicht ein drittes Mal still zurückkommt; (3) die Kosten je Aufruf sinken auf das, was der Prompt selbst braucht.
- **Endzustand:** AK-01 bis AK-04 erfüllt; ein manuelles Plan-Review mit Anthropic plus einem zweiten Provider zeigt in der UI die Konsens-Fassung statt „Consensus clustering unavailable".

## 1. Problem und Anlass

Der Anthropic-Reviewer und der Konsens-Aggregator des Plan-Reviews starten je einen Claude-Code-Prozess über das Claude Agent SDK [Q: `ui/src/server/services/external-reviewer.ts:51-68`, `ui/src/server/services/finding-aggregator.ts:190-204`]. Beide Aufrufe beschränken die eingebauten Werkzeuge (`tools: ['Read','Grep','Glob']` bzw. `tools: []`), lassen aber die MCP-Server-Konfiguration des Nutzers unangetastet: `strictMcpConfig` ist nicht gesetzt, `mcpServers` nicht übergeben [Q: `external-reviewer.ts:53-67`, `finding-aggregator.ts:192-203`; SDK baut daraus die CLI-Argumente, `--strict-mcp-config` nur bei gesetzter Option, `ui/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs:7732-7734`]. Der Prozess lädt deshalb alle 12 MCP-Server aus `~/.claude.json` und übergibt der API neben den 3 erlaubten Werkzeugen 181 bis 184 MCP-Werkzeuge [Q: Reproduktion 2026-09-15 mit dem SDK-gebündelten `cli.js` 2.0.77, `init`-Ereignis: `tools` = 187 bzw. 184, Server obsidian, whatsapp, perplexity, playwright, notebooklm, context7, higgsfield, plaud verbunden].

Eines dieser Werkzeuge, `mcp__higgsfield__scene_builder_3d_get_artifact`, hat ein Eingabeschema mit `allOf` auf oberster Ebene. Die Anthropic-API lehnt damit die ganze Anfrage ab: `API Error: 400 … tools.123.custom.input_schema: input_schema does not support oneOf, allOf, or anyOf at the top level` [Q: Reproduktion 2026-09-15, Exit-Code 1, `is_error: true`; Position 123 in der `init`-Werkzeugliste ist genau dieses Werkzeug]. Der Reviewer meldet den Fehler als „Reviewer anthropic:opus failed — Claude Code process exited with code 1" [Q: Michaels Screenshot 2026-09-15, `ui/runtime/cloud-terminal/paste/cloud-1789506011767-4/img-6887904f-….png`; Fehlerpfad `external-reviewer.ts:101-115`]. Der Aggregator läuft mit demselben SDK und derselben Konfiguration, scheitert am selben 400 und fällt auf Einzelreviews zurück: „Consensus clustering unavailable (aggregator model call failed)" [Q: `finding-aggregator.ts:251-260` → `fallbackReason: 'llm-error'`; Screenshot; Reproduktion mit `--tools ""`: 184 Werkzeuge, 400].

Warum nur der Anthropic-Pfad: Andere Provider laufen mit `CLAUDE_CONFIG_DIR=~/.claude-<id>` und damit einer eigenen `.claude.json` [Q: `ui/src/server/utils/provider-env.ts:35-38`]; `~/.claude-glm` hat 1 MCP-Server, `~/.claude-gemini` und `~/.claude-deepseek` 0 [Q: Dateisystem 2026-09-15]. Der GLM-Reviewer im Screenshot ist grün. Warum es früher ging: Das higgsfield-Werkzeug ist neu in Michaels Konfiguration oder hat sein Schema geändert; das global installierte Claude Code 2.1.273 bügelt ein solches `allOf` selbst glatt (Beschreibung beginnt mit „Input constraint: … (flattened from a JSON Schema allOf)") und läuft durch, das im SDK 0.1.77 gebündelte 2.0.77 tut das nicht [Q: Reproduktion mit beiden Binaries 2026-09-15; `ui/package-lock.json:41`]. [Uncertain] Wann genau das Werkzeug in die Konfiguration kam, ist nicht belegt; für das Vorhaben ist es unerheblich.

Zwei Nebenbefunde derselben Ursache: Erstens kostet jeder Reviewer- und Aggregator-Aufruf heute rund 142.000 Prompt-Tokens allein für Werkzeugbeschreibungen, die der Prompt nie benutzt — bei „Reply with OK" mit Haiku 138.579 Cache-Creation-Tokens, 0,28 USD; mit `--strict-mcp-config` sind es 9.220 [Q: Reproduktion 2026-09-15, `usage` im `result`-Ereignis]. Bei Opus als Reviewer und drei Reviewern je Plan ist das der größte Kostenblock des Reviews. Zweitens laufen die Reviewer mit `permissionMode: 'bypassPermissions'` [Q: `external-reviewer.ts:57-58`] und haben damit ohne Rückfrage Zugriff auf alle geladenen MCP-Werkzeuge, darunter `mcp__whatsapp__send_message` und Schreibwerkzeuge in Obsidian — ein Reviewer soll lesen, nichts senden. Anlass: Michaels Plan-Review am 15.09. lieferte nur das GLM-Einzelreview; der Konsens, für den der Aggregator gebaut wurde, fehlte.

## 2. Betroffene

| Wer oder was | Was ändert sich |
|---|---|
| Michael als Nutzer des Plan-Reviews in der Web-UI (Mac und Droplet) | Anthropic-Reviewer liefert wieder; bei zwei oder mehr Reviewern erscheint die Konsens-Fassung; Reviews kosten deutlich weniger |
| Wer künftig MCP-Server in `~/.claude.json` einträgt | Ein fehlerhaftes Schema eines fremden Servers legt das Plan-Review nicht mehr lahm |
| Systeme | `ui/src/server/services/external-reviewer.ts`, `ui/src/server/services/finding-aggregator.ts`, Tests unter `ui/tests/unit/`; die Claude-Code-Sitzungen im Cloud-Terminal bleiben unberührt (sie sollen die MCP-Server weiterhin haben) |

## 3. Ziele

- **Z-01:** Plan-Review-Reviewer über Anthropic und der Konsens-Aggregator liefern ein Ergebnis, unabhängig davon, welche MCP-Server der Nutzer global eingerichtet hat.
- **Z-02:** Reviewer und Aggregator übergeben dem Modell nur die Werkzeuge, die ihre Aufgabe braucht; kein Prompt zahlt für fremde Werkzeugbeschreibungen.
- **Z-03:** Ein Reviewer kann nichts außerhalb des zu prüfenden Repos auslösen — kein Senden, kein Schreiben in Fremdsysteme.

## 4. Nicht-Ziele

- **NZ-01:** Kein Wechsel der SDK-Version oder der darin gebündelten Claude-Code-Version in diesem Vorhaben. Der Abstand 2.0.77 (gebündelt) zu 2.1.273 (global) ist ein eigenes Thema mit eigenem Risiko; Karte im Board.
- **NZ-02:** Das fehlerhafte Schema des higgsfield-Servers wird weder repariert noch gemeldet — fremder Dienst.
- **NZ-03:** Das Rückfallverhalten des Aggregators bei echten Fehlern (Timeout, ungültiges JSON, leere Antwort) bleibt wie es ist [Q: `finding-aggregator.ts:262-295`].
- **NZ-04:** Die Claude-Code-Sitzungen im Cloud-Terminal behalten ihre MCP-Server; das Vorhaben betrifft nur die vom Backend gestarteten Reviewer- und Aggregator-Prozesse.
- **NZ-05:** Reviewer bekommen keine MCP-Werkzeuge, auch keine lesenden wie `context7` — solange niemand einen Bedarf belegt (OF-01).

## 5. Abnahmekriterien

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn ein Plan-Review mit einem Anthropic-Reviewer läuft, MUSS der Reviewer ein Review liefern, auch wenn in der globalen Claude-Konfiguration des Nutzers ein MCP-Server ein Werkzeugschema mit `oneOf`, `allOf` oder `anyOf` auf oberster Ebene meldet. | Z-01 | Test (SDK-Aufruf ohne Nutzer-MCP-Konfiguration) + Stichprobe (manuelles Review auf dem Mac mit Michaels `~/.claude.json`) |
| AK-02 | Wenn mindestens zwei Reviewer geliefert haben, MUSS die Konsens-Fassung erscheinen, unabhängig davon, welche MCP-Server in der globalen Claude-Konfiguration des Nutzers stehen. | Z-01 | Test (Aggregator-Aufruf ohne Nutzer-MCP-Konfiguration) + Stichprobe (UI zeigt Konsens statt „Consensus clustering unavailable") |
| AK-03 | Ein Reviewer-Prozess DARF dem Modell keine anderen Werkzeuge übergeben als Read, Grep und Glob; ein Aggregator-Prozess DARF keine Werkzeuge übergeben. | Z-02, Z-03 | Test (übergebene Optionen) + Messung (`init`-Ereignis des Prozesses: `tools` = 3 bzw. 0, `mcp_servers` = 0) |
| AK-04 | Ein Aggregator-Aufruf mit leerem Reviewer-Inhalt MUSS unter 20.000 Prompt-Tokens bleiben (heute rund 142.000). | Z-02 | Messung (`usage` im `result`-Ereignis, Cache-Creation plus Cache-Read plus Input) |

## 6. Randbedingungen

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Sicherheit | Reviewer laufen mit `bypassPermissions` (`external-reviewer.ts:57-58`); darum darf ihr Werkzeugsatz nur lesend sein. `~/.claude.json` ist vertraulich und darf nicht ins Repo. | `docs/security.md` §1 (Datenklasse „vertraulich": `~/.claude.json`), §3 |
| RB-02 | Technik | Die Provider→Auth-Zuordnung bleibt an einer Stelle (`provider-env.ts`); die Werkzeugbeschränkung gilt für beide SDK-Aufrufer gleich, damit sie nicht wieder auseinanderlaufen (Regressionsklasse Commit `28965af`). | `ui/src/server/utils/provider-env.ts:13-18` |
| RB-03 | Betrieb | Der Test darf nicht von der MCP-Konfiguration des ausführenden Rechners abhängen (Mac, Droplet, CI haben verschiedene `~/.claude.json`); Merge auf `main` deployt die UI automatisch auf den Droplet. | `CLAUDE.md` „Nie", `docs/architecture.md` §5 (Cloud-Host), AP-03 |
| RB-04 | Technik | TypeScript strict, kein `any`; `verify: OK` vor der Fertigmeldung; Bezugsliste `ui/tests/known-failures.txt` bleibt unangetastet. | `CLAUDE.md` Konventionen, Definition of Done |

## 7. Offene Fragen

Keine offenen Fragen.

- **OF-01** Soll ein Reviewer je ein MCP-Werkzeug bekommen (etwa `context7`)? — *entschieden 2026-09-15 (Product Owner)*: nein, NZ-05 gilt; ein späterer Bedarf wird als neues Vorhaben belegt.
- **OF-02** Versionsabstand SDK-gebündeltes Claude Code 2.0.77 gegenüber global 2.1.273 — *entschieden 2026-09-15 (Product Owner)*: eigene Karte „Needs Discovery" im Board, nicht Teil dieses Vorhabens (NZ-01).

---

## Änderungsprotokoll

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.1 | 2026-09-15 | Umnummerierung INT-2026-005 → INT-2026-006: Nummer auf `main` bereits an „Nächster Schritt aus der Web-UI" vergeben (PR #49); Plan freigegeben, `bezuege.plan` gesetzt | — | Product Owner, 2026-09-15 |
| 1.0.0 | 2026-09-15 | Freigabe; OF-01 und OF-02 entschieden (NZ-05 bleibt, Versionsabstand als eigene Karte); Bypass nach `templates/sdlc/README.md` (Bugfix, Größe S) | OF-01, OF-02 | Product Owner, 2026-09-15 |
| 0.1.0 | 2026-09-15 | Entwurf aus Screenshot und Reproduktion (beide SDK-Aufrufer, beide Binaries, Gegenprobe `--strict-mcp-config`) | alle | — |

<!-- Definition of Ready (vor status "angenommen"):
     [x] Drei Sätze nennen Zweck, Kernaufgaben, Endzustand und versprechen nichts, was AK/RB/NZ einschränken.
     [x] Problem mit Beleg, Anlass genannt.
     [x] Jedes AK: EARS-Form, ein Modalverb, Ziel, Prüfart, beobachtbar statt Mechanismus.
     [x] Mindestens ein Nicht-Ziel. Jede RB mit Herkunft.
     [x] Keine offene Frage mit „Blockiert: ja".
     [x] Keine Projektregeln, die in CLAUDE.md gehören.
     [ ] Ab risikoklasse mittel: Abschnitte 8–12 ausgefüllt. — entfällt (niedrig)
     [x] `verantwortlich` hat angenommen, Commit dokumentiert die Annahme. -->
