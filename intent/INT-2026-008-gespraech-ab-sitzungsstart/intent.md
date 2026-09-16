---
intent_id: "INT-2026-008"  
titel: "Gespräch ab Sitzungsstart: das Absicht-Interview auf der Projekt-Seite"  
status: "angenommen"  
version: "1.0.0"  
autor: "Michael Sindlinger (Fehlerbericht und Gespräch mit Claude, 16.09.2026)"  
verantwortlich: "Product Owner (Michael Sindlinger)"  
erstellt: "2026-09-16"  
geaendert: "2026-09-16"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Größe S; Verhalten durch INT-2026-007 spec.md (FA-22, AN-S03, Abschnitt 10) festgelegt, nur der Zuschnitt vor dem Ordner fehlt"  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: "plan.md"  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: [ui, vorhaben, gespraech, projekt-seite, intent, cloud-terminal]  
freigabe:  
  von: "Product Owner (Michael Sindlinger) — „eigene PR", Chat 16.09."  
  am: "2026-09-16"  

---

# Absicht: Gespräch ab Sitzungsstart — das Absicht-Interview auf der Projekt-Seite

<!-- Ablage: intent/INT-2026-008-gespraech-ab-sitzungsstart/intent.md -->

## Absicht in drei Sätzen

- **Zweck:** Wer auf der Projekt-Seite „Absicht beginnen" drückt, soll das Interview, mit dem `/intent` die Absicht formt, im Gesprächsbereich der Web-UI führen können, nicht im Terminal; das war der Hauptfall von INT-2026-007, den Stufe 1 nicht abdeckt.
- **Kernaufgaben:** (1) Der Gesprächsbereich zeigt eine Absicht-Sitzung schon, bevor ihr Vorhaben-Ordner existiert; (2) Eingaben aus diesem Gespräch erreichen die Sitzung nach denselben Regeln wie auf der Vorhaben-Seite; (3) sobald der Ordner entsteht, wechselt die UI ohne Bruch auf die Vorhaben-Seite und das Interview steht im Protokoll des Vorhabens; (4) während eine Absicht-Sitzung läuft, gibt es keinen zweiten Start-Knopf.
- **Endzustand:** AK-01 bis AK-07 erfüllt; INT-2026-007 spec.md trägt einen Nachtrag an FA-22/AN-S03; kein neuer Bildschirm.

## 1. Problem und Anlass

Michael hat am 16.09. gegen 11:20 im Projekt Kompass „Absicht beginnen" gedrückt. Die Projekt-Seite zeigte „Sitzung gestartet — Vorhaben entsteht … die Vorhaben-Seite öffnet sich, sobald der Ordner da ist" und blieb dabei; im Cloud-Terminal stellte die Sitzung derweil ihre erste Frage („Beschreib das Vorhaben in zwei bis drei Sätzen") [Q: Screenshots im Chat, 16.09.]. Ursache: Die Projekt-Seite navigiert erst beim ersten `vorhaben:state`, dessen Zeile diese Sitzung trägt [Q: `ui/frontend/src/views/aos-vorhaben-view.ts:165-172`], und eine Zeile gibt es erst mit dem Ordner `intent/INT-…/`. Der Workflow legt diesen Ordner aber erst in Schritt 4 an, nach dem Gespräch mit bis zu fünf Rückfragen [Q: `specwright/workflows/core/intent.md:46,76`]. Der Gesprächsbereich ist an eine Vorhaben-Zeile gebunden (`row`) und das Senden verlangt eine Vorhaben-Kennung [Q: `ui/frontend/src/components/vorhaben/aos-gespraech.ts:96`, `ui/src/server/services/gespraech-handler.ts:84-89`, `ui/src/server/services/vorhaben-service.ts:447-450`]. INT-2026-007 spec.md nennt das Interview beim Absicht-Schreiben ausdrücklich als Fall des Gesprächs (Abschnitt 10 in plan.md, Ablauf A), FA-22 regelt aber nur „sobald der Ordner entsteht". Das Backend kennt die anhängige Sitzung bereits (`pendingIntents`, persistiert) [Q: `ui/src/server/services/vorhaben-state.ts:41-47,128,204-216`], liefert sie nur nicht aus. Nebenbefund: Der Start-Knopf bleibt unter der Hinweiskarte klickbar; Michaels Terminal zeigte acht Sitzungen.

## 2. Betroffene

| Wer oder was | Was ändert sich |
|---|---|
| Michael am Mac (Projekt-Seite) | Nach „Absicht beginnen" steht rechts das Gespräch der Sitzung; Interview ohne Terminal; Wechsel auf die Vorhaben-Seite, sobald der Ordner da ist |
| Michael am Handy | Hinweis mit Knopf „Im Terminal öffnen", kein Gespräch (NZ-01 aus INT-2026-007 bleibt) |
| Absicht-Sitzungen von Hand (`/specwright:intent` im Terminal) | erscheinen ebenfalls auf der Projekt-Seite |
| Systeme | `ui/src/shared/types/{vorhaben,gespraech}.protocol.ts`, `ui/src/server/services/{vorhaben-service,vorhaben-state,gespraech-handler}.ts`, `ui/frontend/src/services/gespraech.service.ts`, `ui/frontend/src/components/vorhaben/{aos-gespraech,aos-projekt-seite,aos-vorhaben-seite}.ts`, `ui/frontend/src/views/aos-vorhaben-view.ts`; Docs: INT-2026-007 spec.md, `docs/architecture.md` §3 |

## 3. Ziele

- **Z-01:** Das Absicht-Interview lässt sich vollständig im Gesprächsbereich führen, vom Start der Sitzung bis zur Freigabe der Absicht.
- **Z-02:** Der Zustand „Vorhaben entsteht" kommt aus dem Backend und überlebt Neuladen und Backend-Neustart (AR-05).
- **Z-03:** Keine Doppelstarts aus der UI, solange eine Absicht-Sitzung des Projekts läuft.

## 4. Nicht-Ziele

- **NZ-01:** Kein Gespräch auf dem Handy (INT-2026-007 NZ-01 bleibt).
- **NZ-02:** Keine Änderung am Workflow `/intent` oder an den Befehlen (AR-06).
- **NZ-03:** Keine Karten für Rückfragen (Stufe 2 von INT-2026-007); Rückfragen mit Auswahl werden weiterhin im Terminal beantwortet.
- **NZ-04:** Keine Umstellung der Adressierung von Vorhaben auf Sitzungen im Review-Kanal.

## 5. Abnahmekriterien

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn am Mac für ein Projekt eine Absicht-Sitzung läuft, deren Ordner noch nicht existiert, MUSS die Projekt-Seite den Gesprächsbereich dieser Sitzung zeigen (Kopf, Verlauf, Eingabe wie auf der Vorhaben-Seite). | Z-01 | Test + Playwright |
| AK-02 | Solange diese Sitzung wartet oder arbeitet, MUSS eine Eingabe aus dem Gesprächsbereich sie nach den Regeln von INT-2026-007 FA-06/FA-15 erreichen (senden, einreihen, ablehnen bei offenem Dialog); die Sitzung MUSS als anhängige Absicht dieses Projekts eingetragen sein, sonst MUSS das Backend ablehnen. | Z-01 | Test |
| AK-03 | Wenn der Vorhaben-Ordner entsteht, MUSS die UI auf die Vorhaben-Seite wechseln, der Gesprächsbereich MUSS dabei sichtbar bleiben, und die vorher gesendeten Eingaben MÜSSEN im Protokoll des Vorhabens stehen. | Z-01 | Test + Playwright |
| AK-04 | Solange eine Absicht-Sitzung des Projekts anhängig ist, DARF die Projekt-Seite keinen Start-Knopf für eine weitere Absicht anbieten; sie MUSS stattdessen einen Hinweis mit „Im Terminal öffnen" zeigen. | Z-03 | Test |
| AK-05 | Nach Neuladen der Seite oder Neustart des Backends MUSS der Zustand aus AK-01 unverändert erscheinen; Statuswechsel der Sitzung MÜSSEN ohne Ordner-Scan an die UI gehen. | Z-02 | Test + Playwright |
| AK-06 | Auf dem Handy MUSS die Projekt-Seite den Hinweis aus AK-04 zeigen, ohne Gesprächsbereich; „Im Terminal öffnen" MUSS die Sitzung im Terminal öffnen. | Z-01 | Test |
| AK-07 | Wenn eine Absicht-Sitzung von Hand im Terminal gestartet wurde, MUSS die Projekt-Seite sie wie in AK-01 zeigen und wie in AK-03 folgen. | Z-01, Z-02 | Test |

## 6. Randbedingungen

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | TypeScript strict, kein `any`; Präfix `aos-`; Nutzerzustand im Backend, nie in `localStorage` | `CLAUDE.md`, `docs/architecture.md` AR-05 |
| RB-02 | Sicherheit | Die Sitzungskennung aus dem Client ist nur ein Schlüssel in den Backend-Zustand, nie ein Pfad; Freitext nur nach Bildschirmprüfung unter `withMachineWrite` | `docs/security.md` §6, INT-2026-007 Ablauf E |
| RB-03 | Betrieb | Merge nach `main` löst den Auto-Deploy der UI aus; Merge ist Michaels Schritt | `CLAUDE.md` „Nie" |

## 7. Offene Fragen

Keine.

---

## Änderungsprotokoll

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-09-16 | Kern aus dem Fehlerbericht; angenommen mit „eigene PR" und Plan-Freigabe (Fassung 2 nach externem Review) | alle | Product Owner, 2026-09-16 |
| 0.1.0 | 2026-09-16 | Entwurf | alle | — |
