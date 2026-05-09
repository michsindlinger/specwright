# Brainstorming Session: Specwright UI Cloud Deployment (geteilter Projekt-Root mit Kompass)

> Session ID: 2026-05-08-14-32-specwright-ui-cloud-deploy
> Started: 2026-05-08 14:32:19
> Type: feature
> Status: transferred

## Topic

Aktuell nutze ich die Specwright UI ausschließlich lokal. Das Problem ist jetzt, dass wenn ich parallel über meine Kompass-Anwendung in der Cloud (DigitalOcean) — wo ich mit meinen Agents über Telegram und Co. kommunizieren kann und wo auch die Entwicklungsprojekte verknüpft sind und die Remote-Agents Änderungen machen oder Spezifikationen in einem der Projekte erstellen — dann sehe ich die momentan erst, wenn ich dem Agenten sage, er soll das Ganze ins Git committen und ich pulle das Ganze lokal in meine Specwright UI. Deswegen hätte ich gerne die Möglichkeit, dass ich die Specwright UI auch genauso in die Cloud deployen kann und dann dort meine Projekte im gleichen Root wie meine Kompass-Anwendung auschecke, damit beide Anwendungen auf die gleichen Projekt-Files zugreifen und nicht unabhängig voneinander arbeiten.

## Discovery Interview Log

_Each Q/A captured here as the interview progresses._

**User:** [siehe Topic oben]

**Q1 (Problem):** Wie oft am Tag entsteht der Lag, was verlierst du konkret — Reibung, Latenz, Übersehenes oder Konflikte? Konkretes Beispiel?

**User:** Beispiel von heute Morgen: Projekt Signal Iduna in Kompass über virtuelle Firma verknüpft. CEO-Agent diskutiert Funnel-Landing-Page für Werbekampagne, fragt am Ende ob er Spezifikation per Specwright-Commands anlegen soll. Macht er. Aber: Ich sehe nichts. Muss ihm sagen „push to git", lokal Specwright UI öffnen, `git pull` (hoffend dass keine Merge-Konflikte), Spezifikation anschauen, dann entscheiden ob lokal umsetzen oder per Telegram an Kompass-Agent delegieren.

**Playback (bestätigt):** Drei Schichten — (1) Reibung: explizites „push" muss angefordert werden; (2) Latenz + Merge-Konflikt-Risiko durch zweiten Checkout; (3) Entscheidungs-Reibung: lokal vs. Cloud-Delegation. Wurzel: zwei getrennte Filesystem-Sichten, Git als Schmalbandkanal.

**Q2 (Problem — Häufigkeit + Betroffene):** Wie oft pro Tag? Nur du, oder auch Team?

**User:** Aktuell selten, weil ich mich **nicht traue** über Kompass-Agents zu viele Entwicklungsaufgaben zu delegieren — Aufwand kommt am Ende auf mich zurück. Wenn es funktionieren würde: mindestens 20–30x pro Tag. **Wichtig:** suppressed demand — Reibung ist so hoch, dass sie Nutzung unterdrückt.

**Kompass-Kontext (für Domain-Fit):** Kompass = eigenständiges Projekt, Fokus virtuelle Firmen / Marketingstrategien. Kann Codebases verknüpfen → Git-Checkout im DigitalOcean-Droplet, Pfad in Config. Agents wissen dass Projekte Specwright-Projekte sind, rufen Commands im Projekt-Root auf.

**Q3 (Outcome):** Woran würdest du nach 2 Wochen merken, dass es Erfolg ist? Verhaltens-, Workflow-, Output-Signal?

**User:** Brainstorming und Spec-Erstellung viel öfter via Telegram + Kompass-Agents. Umsetzung-Delegation noch unklar. **Game-Changer-Signal: Dashboard immer gut gefüllt mit umsetzungsbereiten Spezifikationen.**

**Playback Outcome:** Specwright UI in Cloud dient primär als **Spec-Backlog-Dashboard** für Output, den Kompass-Agents in der Cloud generieren. Du delegierst Discovery + Spec-Erstellung an Kompass (via Telegram), siehst das Ergebnis im Dashboard, entscheidest dann pro Spec ob lokal/cloud umsetzen.

**Q4 (Scope — kleinste nützliche Version):** Lean (read-only), Vollparität, oder Mittelweg?

**User:** **Option B — Vollparität.** Chat, Kanban-Drag, Spec-Editing, Execute-Tasks alles auch in Cloud.

**Q5 (Scope — Parallelitäts-Modus):** Lokal+Cloud parallel, Cloud-only, oder Cloud-primary mit lokal-Fallback?

**User:** **Cloud-primary**, lokal nur Fallback (offline / Cloud down).

**Q6 (Scope — explizit raus aus V1):** Multi-User? Mobile? Tiefere Kompass-Integration? Migration/Onboarding? Backup/Monitoring?

**User:** Multi-User raus. Mobile-Responsive raus. Tiefere Kompass-Integration raus. Migration/Onboarding raus. (Backup/Monitoring nicht adressiert — als „later" vermerkt.)

**Q7 (User & context — Trigger-Pattern):** Reaktiv (Telegram-Push), routinemäßig oder just-in-time? Welches Gerät?

**User:** Aktuell lokal den ganzen Tag mit lokaler UI, auch Spec-Erstellung. Cloud-UI würde helfen wenn ich teilweise von unterwegs ran könnte.

**Q8 (User & context — Klarstellung Cloud-primary vs lokal-default):** (A) Cloud ist Default auch am Mac, lokal nur Fallback / (B) Lokal bleibt täglicher Default, Cloud parallel für Mobility?

**User:** **(A) Cloud = Default.** Auch am Mac → Browser → Cloud-UI. Lokal nur Fallback bei Cloud-Down.

**Playback User & context:**
- **Wer:** Single-User (du).
- **Wann:** Ganzer Arbeitstag, ortsunabhängig — Mac am Schreibtisch + unterwegs.
- **Gerät:** Desktop-Browser (Mac, zweiter Laptop). Phone/Tablet bewusst raus.
- **Trigger:** Mix aus Routine (Backlog-Check) + Reaktiv (Telegram-Notification von Kompass) + Just-in-time („was als nächstes").
- **Single-Writer-Realität:** Nach Ship gibt es i.d.R. nur eine aktive UI pro Projekt = Cloud-UI. Lokal-UI nur in Ausnahmefällen (offline / Cloud-Down).

**Q9 (Constraints — Hosting-Topologie):** Selbes Droplet wie Kompass / eigenes Droplet mit geteiltem Storage / eigenes Droplet mit eigenem Git-Checkout?

**User:** Wichtig: zusätzlich muss ich **vom Mac aus mit lokaler IDE (Cursor)** auf dieselben Cloud-Files zugreifen können. Storage als Volumen in der Cloud, das auch vom Macbook geöffnet werden kann.

**Implikation:** Source-of-Truth für Projekt-Files liegt in der Cloud. Drei Clients greifen darauf zu — Cloud-Specwright-UI, Kompass, lokaler Cursor (vom Mac). Der ursprüngliche „lokal-Fallback"-Begriff aus Q5 betrifft nur die Specwright-UI selbst, nicht den Storage.

**Q10 (Constraints — Auth):** Public+Basic / Cloudflare Tunnel / Tailscale / SSH-Tunnel? Auth-Lösung von Kompass wiederverwendbar?

**User:** Kompass hat **Google-basierte Auth** — wäre wiederverwendbar. Cloudflare Tunnel auch akzeptabel. Wichtig: Kompass-Agents greifen auf Codebase zu, Kommunikation läuft via Telegram-Adapter (DigitalOcean) ohne Auth (nur Bot-Token).

**Auth-Constraint geklärt:** Browser-Zugang zur Specwright-UI durch Google OAuth ODER Cloudflare Tunnel — finale Wahl offen, beides akzeptabel. **Agent-Zugang erfolgt nicht über HTTP-API**, sondern direkt aufs geteilte Volumen (Filesystem). Telegram-Adapter ist eigener Kanal (Bot-Token-basiert).

**Q11 (Constraints — Zeit):** Hart / weich / strategisch?

**User:** **ASAP.** Kein hartes Datum, aber sehr hohe Priorität.

**Q12a (Constraints — Hosting):** Selbes Droplet wie Kompass oder separat?

**User:** **Selbes Droplet** wie Kompass. Notfalls hochskalieren.

**Q12b (Constraints — Daten-Volumen):** Anzahl Projekte, Größe, node_modules wo?

**User:** Ca. 5–10 Projekte. (Größe / node_modules-Lokation nicht spezifiziert — als Risiko vermerkt.)

**Playback Constraints:**
- **Hosting:** Same droplet wie Kompass auf DigitalOcean. Skalierung bei CPU/RAM-Bottleneck OK.
- **Storage:** Cloud-Volumen, Source-of-Truth, mountable von Mac (Cursor) + lesbar/schreibbar von Cloud-Apps (Specwright-UI, Kompass).
- **Auth:** Google OAuth (Kompass-Reuse) oder Cloudflare Tunnel — Wahl offen, beides OK. Kein HTTP-Auth-Layer für Agents nötig (Filesystem-Zugriff direkt).
- **Daten:** 5–10 Projekte, ~300–400 MB pro Projekt.
- **Zeit:** ASAP, kein Hard-Date.
- **Privacy:** Single-User, keine Multi-Tenant-Anforderung.

**Q13 (Risks — R1–R8 Triage):** Welche Risiken real / parken / nicht relevant?

**User-Response per Risiko:**
- **R1 — Cross-Process Lock cross-machine:** _nicht direkt adressiert — bleibt offen, kommt in Q14_.
- **R2 — Mount-Performance Mac→Cloud:** **WICHTIG.** In Refinement-Brief.
- **R3 — Claude-SDK auf Droplet:** **Gelöst.** Kompass nutzt bereits dasselbe Claude-Code-Setup wie lokal. Referenz-Pattern: `/Users/michaelsindlinger/Entwicklung/privat/compass/backend/src/server/services/token-rotator.ts`.
- **R4 — Git-State cross-machine:** **Policy-Entscheidung:** „Alles muss in der Cloud passieren" — d.h. Git-Operationen (add/commit/push) ausschließlich cloud-side, Mac via Cursor *editiert nur* Files, committet nicht.
- **R5 — Single Point of Failure (Droplet down):** Risiko anerkannt.
- **R6 — Re-Sync nach lokal-Fallback:** Real, in Refinement-Brief.
- **R7 — Latenz Mac↔Cloud:** Erstmal unwichtig.
- **R8 — Größe:** Beantwortet — 300–400 MB pro Projekt.

**Q14 (Risks — R1 Concurrent Writes):** V1 lösen / Praxis selten / Mac schreibt nichts kritisches?

**User:** **(b) In der Praxis selten.** V1 nimmt Restrisiko, V2 löst sauber.

**Q15 (Alternatives):** Welche Alternativen waren auf dem Tisch, warum verworfen?

**User:** „Specwright-UI komplett aufgeben, alles via Kompass-UI" war wirklich überlegt — verworfen, weil Specwright-UI bereits stark auf eigene Bedürfnisse angepasst, will nicht wieder alles anders haben. Andere Alternativen vom AI vorgeschlagen (Auto-Push-Hook, Remote-SSH, Mac-FS-Mirror) implizit ebenfalls verworfen — wegen Mobility-Lücke (Auto-Push) bzw. Phone-Bedienung ohne SSH-Setup (Remote-SSH) bzw. nicht 24/7-Mac (Mirror).

**Q16 (Domain fit):** Framework-Erweiterung / dein-spezifisches Setup / Mischform?

**User:** **(B) Dein-spezifisches Setup.** Separates Repo/Branch, Kompass-Integration hardcoded, Specwright-Framework bleibt unverändert. Schneller, keine Backward-Compat-Sorgen.

**Playback Scope:**
- **In:** Specwright UI in Cloud, Vollparität, Single-User, Desktop-Browser, gleicher Projekt-Root wie Kompass im DigitalOcean-Droplet, Cloud-primary mit lokal-Fallback.
- **Out / deferred:** Multi-User-Auth, Mobile-Responsive, tiefere Kompass-Integration über shared root hinaus, Migration/Onboarding-Magic, Backup/DR/Monitoring (vermutlich später).

---

## Dimension Coverage

- [x] Problem — pain, for whom, evidence, current workaround
- [x] Outcome — what changes when shipped, success signal
- [x] Scope — in / out / explicitly deferred, smallest useful version
- [x] User & context — who triggers, when, on which device/channel
- [x] Constraints — data, integrations, perf, privacy, cost, time
- [x] Risks & unknowns — what could break, what we don't know
- [x] Alternatives considered — why this shape over others
- [x] Domain fit — how it sits inside the existing system

## Refinement Brief

> Generated: 2026-05-08 14:32 (verbatim user confirmation: „komplett")

### Problem
Lokale Specwright-UI sieht Output von Kompass-Cloud-Agents (Spec-Anlage via Specwright-Commands aus Telegram-Konversation) erst nach manuellem Zyklus: User fordert explizit „push to git" → öffnet lokal Specwright-UI → `git pull` → riskiert Merge-Konflikt → reviewt Spec → entscheidet lokal-umsetzen oder per Telegram delegieren.

Drei Schichten Reibung: (1) explizite Push-Anforderung, (2) Pull + Merge-Konflikt-Risiko, (3) Entscheidungs-Reibung Lokal-vs-Cloud-Delegation. Wurzel: zwei getrennte Filesystem-Sichten auf dasselbe Projekt, Git als Schmalbandkanal.

**Evidenz:** Konkretes Beispiel von 2026-05-08 morgens (Projekt Signal Iduna in Kompass via virtueller Firma; CEO-Agent legte Funnel-Landing-Page-Spec an; User musste den ganzen Zyklus durchlaufen).

**Suppressed Demand:** User delegiert aktuell *bewusst wenig* an Kompass-Agents wegen erwartetem Aufwand auf der Empfangsseite. Ohne Reibung erwartete Häufigkeit: 20–30 Zyklen/Tag.

### Outcome / success signal
Specwright-UI in der Cloud verfügbar, gleicher Projekt-Root wie Kompass, kein Git-Pull-Tanz mehr. **Game-Changer-Signal nach 2 Wochen:** Backlog-Dashboard ist *ständig gut gefüllt mit umsetzungsbereiten Specs* aus Cloud-Agent-Arbeit. Spec-Diskussionen + Erstellungen passieren primär via Telegram über Kompass-Agents. (Umsetzungs-Delegation an Cloud-Agents bleibt offen / nicht V1-Erfolgsmaßstab.)

### Scope
**In:**
- Specwright-UI in der Cloud deployen (Vollparität: Chat mit Claude, Kanban-Drag, Spec-Editing, Execute-Tasks)
- Selbes DigitalOcean-Droplet wie Kompass; gemeinsames Cloud-Volumen für Projekt-Files
- ~5–10 Projekte à ~300–400 MB auf dem Volumen
- Cloud ist Default für Specwright-UI auch vom Mac aus
- Lokales Mounten des Cloud-Volumens am Mac, damit Cursor (IDE) auf dieselben Files zugreift
- Git-Operationen ausschließlich cloud-side (Cloud-Specwright-UI + Kompass-Agents)
- Browser-Auth: Google OAuth (Kompass-Reuse) **oder** Cloudflare Tunnel — beides akzeptabel
- Claude-SDK-Auth: Pattern wiederverwendet aus Kompass `backend/src/server/services/token-rotator.ts`

**Out:**
- Multi-User / Team-Fähigkeit
- Mobile-Responsive UI (Phone/Tablet bewusst nicht V1)
- Tiefere Kompass-Integration (z.B. Telegram-Conversations innerhalb Specwright-UI)
- Migration / Onboarding-Magic (manuelles Setup OK)

**Deferred:**
- Backup / Disaster-Recovery / Monitoring (später)
- Cross-Machine-Lock-Hardening für `kanban.json` und Git-Index — Restrisiko bewusst akzeptiert für V1, V2 löst
- Lokale Specwright-UI als „echte" Fallback-Strategie inkl. Re-Sync-Workflow (siehe R6)

### User & trigger context
**Wer:** Single-User (Michael).
**Wann:** Ganzer Arbeitstag, zusätzlich von unterwegs. Trigger-Mix aus Routine (Backlog-Check), reaktiv (Telegram-Notification von Kompass-Agent „Spec angelegt") und just-in-time („was als nächstes umsetzen").
**Gerät:** Desktop-Browser am Mac (Schreibtisch) und auf zweitem Laptop (unterwegs). Phone/Tablet bewusst nicht V1.
**Channel:** Telegram → Kompass-Agents (Eingabe-Seite); Browser-Cloud-Specwright-UI (Sicht- und Steuer-Seite); Cursor lokal mit Cloud-Mount (für tiefes File-Editieren).

### Constraints
- **Hosting:** Same droplet wie Kompass (DigitalOcean), Skalierung bei CPU/RAM-Bottleneck OK.
- **Storage:** Ein Cloud-Volumen, Source-of-Truth, mountable von Mac (für Cursor) und vom Droplet (für Apps).
- **Auth:** Single-User; Google OAuth oder Cloudflare Tunnel; Wahl in Spec-Phase.
- **Daten:** 5–10 Projekte, je ~300–400 MB.
- **Zeit:** ASAP, kein hartes Datum.
- **Privacy:** Single-User, keine Multi-Tenant-Anforderung.
- **Integrations:** Kompass (gleicher Droplet, geteiltes Volumen), Telegram-Adapter (Bot-Token-basiert, eigener Kanal). Specwright-MCP-Server bleibt Subprocess der Specwright-UI.

### Risks & open questions
- **R2 — Mount-Performance Mac↔Cloud (real, V1):** Cursor + node_modules über SSHFS/S3FS/o.Ä. kann den IDE-Indexer crashen / extrem verlangsamen. Mount-Strategie braucht Bewertung.
- **R5 — Single Point of Failure (real, V1):** Droplet down = UI weg, Files weg, Cursor-Mount weg. Resilienz/Recovery-Plan offen.
- **R6 — Re-Sync nach lokal-Fallback (real):** Wenn User offline am lokalen Checkout arbeitet, fehlt definierter Reconciliation-Workflow zurück in Cloud-State. Manuelle Konflikt-Auflösung erwartet.
- **R1 — Cross-Machine-Konkurrenz auf `kanban.json` und Git-Index (akzeptiertes Restrisiko V1):** `withKanbanLock`/`withMainProjectLock` halten nur same-machine. Drei mögliche Schreiber (Cloud-UI, Kompass-Agent, lokaler Cursor übers Mount) → seltene Race-Conditions. V2 löst sauber.
- **Open: Auth-Wahl** — Google OAuth (Kompass-Reuse) oder Cloudflare Tunnel.
- **Open: Mount-Technologie** — SSHFS, S3FS, NFS, Tailscale-Share oder andere; abhängig von R2-Bewertung.

### Alternatives considered & why rejected
- **Specwright-UI komplett aufgeben, alles via Kompass-UI:** Verworfen — Specwright-UI bereits stark auf eigene Bedürfnisse angepasst, kein Re-Build gewünscht.
- **Auto-Push-Hook in Kompass + Auto-Pull lokal:** Verworfen (implizit) — löst die Mobility-Lücke nicht, der Lokal-Default bleibt Engpass.
- **Cursor / VS Code Remote-SSH ohne UI-Deploy:** Verworfen (implizit) — keine Browser-Bedienung von unterwegs ohne SSH-Setup.
- **Mac-FS in die Cloud spiegeln:** Verworfen — Mac nicht 24/7 erreichbar.

### Domain fit notes
- **Dein-spezifisches Setup**, nicht Framework-Erweiterung. Separates Repo/Branch, Kompass-Integration hardcoded.
- Specwright-Framework (Workflows, Templates, Standards, Commands) bleibt **unverändert** — keine Backward-Compat-Risiken für andere Specwright-Nutzer.
- Reuse-Punkte aus Kompass: Token-Rotator-Pattern (`backend/src/server/services/token-rotator.ts`), Google OAuth (falls so gewählt), DigitalOcean-Droplet-Setup.
- Bestehende Specwright-UI-Architektur (`ui/src/server/`, MCP-Server-Subprocess, `withKanbanLock`/`withMainProjectLock`) bleibt strukturell erhalten — Anpassungen nur an Pfad-Konfiguration, Auth-Layer, Deploy-Skripten.

### Suggested next step
- [x] Spec (use: `/transfer-and-create-spec`) — empfohlen wegen ASAP + klar abgegrenztem V1-Scope
- [ ] Bug (use: `/transfer-and-create-bug`)
- [ ] Product plan (use: `/transfer-and-plan-product`)
- [ ] More discovery (resume this session) — falls vor Spec doch noch Mount-Technologie-Spike gewünscht
- [ ] Park for later

## Session Summary

**Duration:** 2026-05-08 14:32 – 2026-05-08 (Session-Ende)
**Dimensions covered:** 8/8
**Deferred:** Multi-User, Mobile-Responsive, tiefere Kompass-Integration, Migration/Onboarding, Backup/DR/Monitoring, Cross-Machine-Lock-Hardening (R1)
**Status:** ready-for-spec

**Next action:** `/transfer-and-create-spec` mit dieser Session als Input.

---

## Transfer Complete

**Transferred to Spec:** 2026-05-08
**Spec Location:** @specwright/specs/2026-05-08-specwright-ui-cloud-deploy/
**Mode:** V2 Lean
**Status:** Transferred
