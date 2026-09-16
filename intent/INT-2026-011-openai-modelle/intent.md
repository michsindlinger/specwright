---
intent_id: "INT-2026-011"  
titel: "OpenAI-Modelle (GPT-6 Astra, Codex) in der Web-UI"  
status: "angenommen"  
version: "1.0.0"  
autor: "Michael Sindlinger (Gespräch mit Claude, 16.09.2026)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-16"  
geaendert: "2026-09-16"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Größe S: zwei Provider-Einträge, eine Sperre in der Prüfer-Auswahl mit Test, eine Doc-Zeile; Rest ist Einrichtung außerhalb des Repos (Proxy, Login, Wrapper)"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: ""  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [web-ui, modelle, provider, openai, codex, claude-code-proxy]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — „Alle vier ok, Freigabe", Chat 16.09."  
  am: "2026-09-16"  

---

# Absicht: OpenAI-Modelle (GPT-6 Astra, Codex) in der Web-UI

<!-- Ablage: intent/INT-2026-011-openai-modelle/intent.md -->

## Felder im Kopf

<!-- leser: agent -->

| Feld | Bedeutung | Werte |
|---|---|---|
| `intent_id` | stabile Kennung, nie wiederverwenden | `INT-JJJJ-NNN` |
| `titel` | 5 bis 80 Zeichen | — |
| `status` | Lebenszyklus | `entwurf` · `in_klaerung` · `angenommen` · `umgesetzt` · `abgeloest` · `verworfen` |
| `version` | SemVer, Regeln im Änderungsprotokoll; Datum und Version immer in Anführungszeichen | `"0.1.0"` |
| `verantwortlich` | Rolle, die annimmt und bei Eskalation entscheidet (Pflicht) | — |
| `risikoklasse` | ab `mittel` gilt die Vertragsschicht (Abschnitte 8–12) | `niedrig` · `mittel` · `hoch` |
| `groesse` | Aufwand | `S` unter 1 Tag · `M` 1–5 Tage · `L` über 5 Tage |
| `bypass` | `ja` bei Bugfix oder Größe S: direkt zu `plan.md`, keine `spec.md`; Grund in `bypass_grund` | `ja` · `nein` |
| `bezuege` | Pfade zu Produkt, Spec, Plan, ADRs; `board_karte` = Boardname und Kartentitel; `ersetzt` = Vorgänger-Intent | — |
| `schlagworte` | kleinbuchstaben-mit-bindestrich | — |

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Michael will die aktuellen OpenAI-Modelle — GPT-6 Astra und die Codex-Familie — in Specwright-Sitzungen aus der Web-UI heraus einsetzen, so wie heute Anthropic, GLM, DeepSeek oder Grok.
- **Kernaufgaben:** (1) GPT-6 Astra, GPT-5.6 Sol und GPT-5.6 Luna als Modelle einer Claude-Code-Sitzung anbieten, mit allem, was die UI für solche Sitzungen kann. (2) Die Codex-CLI von OpenAI selbst als eigenen Agenten aus dem Dropdown starten — nach dem Vorbild von Herdr, das jede Agenten-CLI nativ laufen lässt. (3) Kein stiller Fehlweg: fehlender Proxy oder fehlende Anmeldung sind sichtbar; die native Codex-CLI wird nirgends angeboten, wo sie nicht funktioniert.
- **Endzustand:** Im Modell-Dropdown stehen ein OpenAI-Provider mit drei Modellen und ein Provider „Codex (nativ)"; eine Sitzung auf GPT-6 Astra verhält sich in der UI wie eine Anthropic-Sitzung (AK-01 bis AK-04, AK-08 bis AK-10), eine native Codex-Sitzung läuft im Terminal ohne Statusmeldung (AK-05 bis AK-07).

## 1. Problem und Anlass

<!-- leser: mensch -->

Die Web-UI kennt acht Provider, keinen von OpenAI [Q: ui/config/model-config.json:1-215]. Ein Versuch vom Januar 2026 ist tot: `~/.claude-codex/settings.json` zeigt auf einen LiteLLM-Proxy an Port 4000, der nicht mehr läuft [Q: ~/.claude-codex/settings.json, litellm_codex.yaml]. Der laufende Proxy `claude-code-proxy` (Port 18765, für Grok) kann OpenAI über ein ChatGPT-Konto bedienen, kennt `gpt-6-astra` aber erst ab 0.1.36 — installiert ist 0.1.34, verfügbar 0.1.40 — und die Codex-Anmeldung fehlt [Q: raine/claude-code-proxy src/registry.rs:50; `claude-code-proxy models`; ~/.config/claude-code-proxy/ enthält nur grok/]. Die native Codex-CLI liegt in 0.93.0 mit fehlendem Binary vor, aktuell ist 0.154.0 [Q: `codex --version` → ENOENT; `npm view @openai/codex version`].

Der Terminal-Start der UI verträgt eine fremde CLI schon: Claude-Hooks bekommen nur Kommandos mit Präfix `claude` [Q: ui/src/server/services/cloud-terminal-manager.ts:850-854], der Status bleibt dann `unknown` [Q: :668]. Die Prüfer-Auswahl listet aber jeden Provider [Q: ui/frontend/src/components/terminal/aos-auto-review-toggle.ts:352-371] und prüft über das Claude Agent SDK mit `~/.claude-<id>` [Q: ui/src/server/utils/provider-env.ts:29-38] — ein nativer Codex-Provider würde dort angeboten und scheitern.

**Anlass:** GPT-6 Astra ist da, Michael will es im Alltag vergleichen; Herdr zeigt, dass Agenten-CLIs nativ nebeneinander laufen [Q: Michael, 2026-09-16; herdr.dev/docs/agents/].

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael als Nutzer der UI auf dem Mac | Zwei neue Provider im Dropdown; einmalige Anmeldung mit dem ChatGPT-Konto (Proxy und Codex-CLI getrennt) |
| Laufende Grok-Sitzungen | Werden beim Proxy-Neustart einmal unterbrochen |
| Systeme | Web-UI (`ui/config/model-config.json`, Prüfer-Auswahl), `claude-code-proxy` (Upgrade, Codex-Login), `~/bin/claude-codex`, `~/.claude-codex`, Codex-CLI (Neuinstallation, Login). Cloud-Droplet: unverändert |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** GPT-6 Astra, GPT-5.6 Sol und GPT-5.6 Luna sind in der UI wählbar, und Sitzungen laufen tatsächlich auf dem gewählten Modell.
- **Z-02:** Diese Sitzungen sind in der UI vollwertig: Status-Punkt, Glocke, Gespräch und Prüfer-Auswahl funktionieren wie bei Anthropic.
- **Z-03:** Die native Codex-CLI ist aus dem Dropdown startbar und wird ehrlich als Sitzung ohne Statusmeldung geführt.
- **Z-04:** Kein stiller Fehlweg: fehlender Proxy oder fehlende Anmeldung sind im Terminal sichtbar; die native Codex-CLI wird nicht als Prüfer angeboten.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Kein Cloud-Droplet — Proxy, Wrapper und Logins nur auf dem Mac.
- **NZ-02:** Kein Status, keine Glocke, kein Gespräch, kein Prüfer für die native Codex-CLI (Herdr-Stufe 2: Codex-`notify`-Hook, Screen-Erkennung, `~/.codex/sessions`) — eigenes Vorhaben.
- **NZ-03:** Keine weiteren OpenAI-Modelle, keine `-fast`-Varianten, keine Bildmodelle.
- **NZ-04:** Die vier Standard-Prüfer (Opus, GLM, MiniMax, DeepSeek) bleiben; OpenAI ist wählbar, nicht vorausgewählt.
- **NZ-05:** Kein Umbau der Provider-Mechanik der UI, kein zweiter Proxy, keine Wiederbelebung des LiteLLM-Wegs.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn der Nutzer im Modell-Dropdown eines Terminals wählt, MUSS das System unter einem OpenAI-Provider die Modelle GPT-6 Astra, GPT-5.6 Sol und GPT-5.6 Luna anbieten. | Z-01 | Test |
| AK-02 | Wenn der Nutzer eine Sitzung mit einem dieser Modelle startet, MUSS die Sitzung das gewählte Modell als ihr Modell melden und darauf antworten. | Z-01 | Stichprobe |
| AK-03 | Solange eine Sitzung mit einem OpenAI-Modell läuft, MUSS das System Status-Punkt, Glocke und Gespräch wie bei einer Anthropic-Sitzung zeigen. | Z-02 | Stichprobe |
| AK-04 | Wenn der Nutzer Prüfer für einen Plan wählt, MUSS das System die drei OpenAI-Modelle anbieten. | Z-02 | Test |
| AK-05 | Wenn der Nutzer im Dropdown „Codex (nativ)" mit einem Modell wählt, MUSS das System die Codex-CLI mit diesem Modell im Terminal starten. | Z-03 | Stichprobe |
| AK-06 | Solange eine native Codex-Sitzung läuft, MUSS das System ihren Status als „unbekannt" führen, nie als „fertig" oder „blockiert". | Z-03 | Test |
| AK-07 | Wenn der Nutzer Prüfer für einen Plan wählt, DARF das System den Provider „Codex (nativ)" NICHT anbieten. | Z-04 | Test |
| AK-08 | Falls der Proxy nicht läuft oder das ChatGPT-Konto nicht angemeldet ist, dann MUSS eine OpenAI-Sitzung die Ursache im Terminal nennen, statt still auf Anthropic zu antworten. | Z-04 | Stichprobe |
| AK-09 | Solange eine OpenAI-Sitzung läuft, MUSS jeder ihrer Modellaufrufe — auch die kleinen Hintergrundaufrufe — beim OpenAI-Konto ankommen. | Z-01 | Messung |
| AK-10 | Wenn ein OpenAI-Modell als Prüfer gewählt ist, MUSS das System dessen Rückmeldung im Review-Kanal zeigen. | Z-02 | Stichprobe |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Sicherheit | Wrapper, Anmelde-Tokens und `~/.claude-codex/settings.json` bleiben außerhalb des Repos; ins Repo kommen nur Provider- und Modellnamen. | `docs/security.md` §1 (vertraulich), §3 |
| RB-02 | Datenschutz | Projektinhalte gehen an OpenAI; es gilt die `security.md` des jeweiligen Projekts — wie heute bei GLM, DeepSeek, Grok. | `docs/security.md` §1 (personenbezogen) |
| RB-03 | Betrieb | Ein Proxy-Neustart unterbricht alle Proxy-Sitzungen (heute Grok); Zeitpunkt mit Michael abstimmen. | `~/Entwicklung/claude-code-proxy/start-proxy.sh`; Memory `reference_ui_model_provider_mechanism` |
| RB-04 | Technik | Modell-Kennungen müssen dem Proxy bekannt sein; `gpt-6-astra` ab `claude-code-proxy` 0.1.36. Grund: Allowlist des Proxys, unbekannte Kennung → HTTP 400. | raine/claude-code-proxy `src/registry.rs`; Doku „Models and routing" |
| RB-05 | Technik | Eine fremde CLI bekommt keine Claude-Flags (`--settings`, Hooks); das gilt schon heute. | `ui/src/server/services/cloud-terminal-manager.ts:850-854` |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | `security.md` §1 führt `ui/config/model-config.json` als „lokal, ungestaged, nie committen"; die Praxis versioniert die Datei (Grok in `13a8ab6`, OpenRouter in `ec8de89`). *entschieden 2026-09-16 (Product Owner)*: Einträge versionieren, Zeile in `security.md` §1 berichtigen → RB-01 (nur Namen im Repo). | nein | Product Owner | — |
| OF-02 | ChatGPT-Plus- oder Pro-Konto für Proxy (`claude-code-proxy codex auth login`) und Codex-CLI (`codex login`)? *entschieden 2026-09-16 (Product Owner)*: vorhanden → AK-02, AK-05. | nein | Michael | — |
| OF-03 | Modellnamen in der nativen Codex-CLI gleich wie im Proxy? *entschieden 2026-09-16 (Product Owner)*: gleiche Kennungen `gpt-6-astra`, `gpt-5.6-sol`, `gpt-5.6-luna`; Plan prüft nach Neuinstallation und meldet Abweichung → AK-05. | nein | Tech Lead | — |
| OF-04 | Alter `~/.claude-codex`-Ordner (LiteLLM-Stand Januar 2026)? *entschieden 2026-09-16 (Product Owner)*: sichern nach `~/.claude-codex.bak-2026-09-16`, dann neu aufsetzen → RB-01. | nein | Michael | — |

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-16 | Angenommen; OF-01 bis OF-04 entschieden; AK-04 auf ein Modalverb gekürzt, Rückmeldung als AK-10 ausgegliedert, AK-08 auf ein Modalverb; Abgleich Mensch/Agent: ohne Befund | AK-04, AK-08, AK-10, OF-01…04 | PO, 16.09. |
| 0.1.0 | 2026-09-16 | Entwurf nach Gespräch: Weg A (Proxy) + B Stufe 1 (native Codex-CLI), drei Modelle, nur Mac, Prüfer wählbar | alle | — |
