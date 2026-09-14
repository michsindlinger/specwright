---
intent_id: "INT-2026-003"  
titel: "Update erkennt jede jemals ausgelieferte Fassung einer entfernten Datei"  
status: "angenommen"  
version: "1.0.0"  
autor: "Claude (aus Handoff 2026-09-14, Befund F18)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-14"  
geaendert: "2026-09-14"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Bugfix in der Lieferkette, Aufwand unter einem Tag; keine fachliche Spec nötig, das Verhalten ist in INT-2026-002 spec.md FA-07/FA-08 bereits festgelegt"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: "Specwright — Backlog Board · „Update lässt ältere Fassungen entfernter Dateien liegen — removed.tsv kennt je Datei nur 1 Prüfsumme“"  
  adr: []  
  ersetzt: ""  
schlagworte: [installer, removed-tsv, update, lieferkette, bypass]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — Freigabe des Bypass-Wegs steht aus, Umsetzung läuft unter ER-01 (kein Datenverlust, keine Außenwirkung vor dem Merge)"  
  am: ""  

---

# Absicht: Update erkennt jede jemals ausgelieferte Fassung einer entfernten Datei

<!-- Ablage: intent/INT-2026-003-removed-historie/intent.md -->

## Absicht in drei Sätzen

- **Zweck:** Wer ein Projekt mit `update-specwright.sh` oder `install.sh --update` auf 4.x hebt, soll die 72 seit 4.0.0 entfernten Dateien ohne Handarbeit loswerden — auch wenn das Projekt eine ältere Fassung dieser Dateien installiert hat, weil es eine oder mehrere Specwright-Versionen übersprungen hat.
- **Kernaufgaben:** (1) `specwright/removed.tsv` je Eintrag um die Prüfsummen aller Fassungen ergänzen, die je auf `main` lagen; (2) die Liste reproduzierbar aus der Git-Historie erzeugen, mit Guard, der eine veraltete Liste in `verify` rot macht; (3) den Installer-Test um den Fall „ältere Fassung installiert" erweitern.
- **Endzustand:** AK-01 bis AK-04 erfüllt; Specwright 4.0.1, damit `check-update.sh` Altprojekte auf den nächsten Update-Lauf hinweist.

## 1. Problem und Anlass

`sw_remove_obsolete` in `specwright/scripts/install-lib.sh:151-177` löscht eine entfernte Datei nur, wenn ihre Prüfsumme in der Spalte `sha256` von `specwright/removed.tsv` steht; sonst bleibt sie liegen und wird als „lokal geändert" gemeldet [Q: `install-lib.sh:163-171`]. Die Liste enthält je Datei genau eine Prüfsumme — die der Fassung `eecb1cd6` (3.33.0) [Q: `specwright/removed.tsv`, 72 Einträge, alle mit einem Wert; Plan INT-2026-002 §3 Punkt 2 sah für geänderte Dateien zusätzlich `05364c1^` vor, das ist nicht in der Datei gelandet]. Auf `main` existieren je Datei 2 bis 4 verschiedene Fassungen, bei 72 von 72 Einträgen mehr als gelistet [Q: Messung 2026-09-14, `git log -- <ziel>` je Zeile, siehe `plan.md` §2]. Anlass: Beim globalen Update auf Michaels Mac am 14.09. blieb `~/.specwright/templates/CLAUDE-PLATFORM.md` als „lokal geändert" liegen und musste von Hand gelöscht werden — es war eine ältere ausgelieferte Fassung, nie von Hand angefasst [Q: Handoff 2026-09-14 10:20, Abschnitt „Was wurde gemacht"]. Mit jeder künftigen Entfernung wiederholt sich das für jedes Projekt, das nicht bei jeder Version nachgezogen hat.

## 2. Betroffene

| Wer oder was | Was ändert sich |
|---|---|
| Michael als Nutzer von Altprojekten (Applai, kreis-lippe-audit, globale Installation) | Update räumt entfernte Dateien vollständig, ohne Fehlalarm „lokal geändert" für unberührte Dateien |
| Wer künftig Dateien aus dem Lieferumfang entfernt | Trägt die Zeile ein und lässt ein Skript die Prüfsummen erzeugen; `verify` erzwingt es |
| Systeme | `specwright/removed.tsv`, `scripts/check-manifest.sh`, `scripts/test-installers.sh`, `VERSION`/`install.sh`; `install-lib.sh` bleibt unverändert |

## 3. Ziele

- **Z-01:** Eine unveränderte ausgelieferte Fassung einer entfernten Datei wird beim Update erkannt und gelöscht, unabhängig davon, welche Specwright-Version sie installiert hat.
- **Z-02:** Die Prüfsummenliste ist aus dem Repo reproduzierbar und kann nicht unbemerkt hinter der Historie zurückbleiben.

## 4. Nicht-Ziele

- **NZ-01:** Dateien, die unter einem anderen Zielpfad installiert wurden (etwa das `agent-os/`-Layout vor der Umbenennung), werden nicht erfasst — anderer Pfad, andere Zeile.
- **NZ-02:** Das Löschverhalten ändert sich nicht: ohne Prüfsummentreffer bleibt eine Datei liegen (FA-08 aus INT-2026-002). `install-lib.sh` wird nicht angefasst.
- **NZ-03:** Fassungen, die nur auf Feature-Branches lagen und nie auf `main`, zählen nicht — ausgeliefert wird nur von `main` (Raw-URL in `install-lib.sh:26`).

## 5. Abnahmekriterien

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn das Update eine entfernte Datei vorfindet, deren Inhalt einer beliebigen Fassung entspricht, die je auf `main` lag, MUSS das Update sie löschen und einzeln nennen. | Z-01 | Test (Installer-Test T4, Datei in ältester Fassung) |
| AK-02 | Wenn das Update eine entfernte Datei vorfindet, deren Inhalt keiner ausgelieferten Fassung entspricht, MUSS das Update sie behalten und als lokal geändert melden. | Z-01 | Test (T4, bestehende Prüfung bleibt) |
| AK-03 | Wenn `removed.tsv` für einen Eintrag eine Prüfsumme aus der Historie nicht enthält, MUSS `verify` rot werden und den Erzeugungsbefehl nennen. | Z-02 | Test (Installer-Test T6: Prüfsumme entfernen → Guard rot → zurück → grün) |
| AK-04 | Wenn das Erzeugungsskript zweimal hintereinander läuft, DARF der zweite Lauf die Datei NICHT ändern. | Z-02 | Test (T6, `git diff --quiet`) |

## 6. Randbedingungen

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | Skripte Bash-3.2-tauglich (kein `mapfile`, keine assoziativen Arrays); Prüfsummen über `sha256sum`/`shasum -a 256` mit Fallback wie in `install-lib.sh:67-71`. Grund: läuft auf dem Mac und in CI (ubuntu). | `CLAUDE.md` Konventionen |
| RB-02 | Betrieb | Der Guard braucht die volle Git-Historie; CI holt sie (`.github/workflows/verify.yml:16`, `fetch-depth: 0`). In flachen Klonen überspringt der Guard mit Hinweis statt rot zu werden. | `verify.yml` |
| RB-03 | Betrieb | Versionssprung auf 4.0.1 (`VERSION` = `FRAMEWORK_VERSION`), damit `check-update.sh` Altprojekte anstößt; kein Bruch im Lieferumfang. | `CLAUDE.md` Konventionen, `docs/architecture.md` AP-02 |

## 7. Offene Fragen

Keine.

---

## Änderungsprotokoll

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-14 | Kern-Schicht, Bypass laut `templates/sdlc/README.md` (Bugfix, Größe S) | alle | Umsetzung gestartet unter ER-01; Michaels Freigabe mit dem PR |
