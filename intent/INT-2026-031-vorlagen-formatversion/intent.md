---
intent_id: "INT-2026-031"  
titel: "Vorhaben-Vorlagen tragen eine Formatversion"  
status: "angenommen"  
version: "1.0.0"  
freigabe:  
  von: "Michael (Produktverantwortung)"  
  am: "2026-10-06"  
autor: "Michael Sindlinger"  
verantwortlich: "Michael (Produktverantwortung)"  
erstellt: "2026-10-06"  
geaendert: "2026-10-06"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "ja"  
bypass_grund: "Größe S: drei Kopffelder in Vorlagen, Hinweise in drei Workflows, README, CHANGELOG-Abschnitt, ein Guard."  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: ""  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: ["vorlagen", "formatversion", "software-factory", "lieferkette"]  

---

# Absicht: Vorhaben-Vorlagen tragen eine Formatversion

<!-- Ablage: intent/INT-2026-031-vorlagen-formatversion/intent.md -->

<!-- Herkunft: Briefing ~/Entwicklung/software-factory/docs/briefings/2026-10-06-specwright-vorlagen-format.md (Befund 6), Software Factory ADR-010, Issue software-factory#28. Die Befunde 1–5 (Plan-Vorlage schärfen) laufen als eigenes Vorhaben, siehe NZ-01. -->

## Absicht in drei Sätzen

<!-- leser: mensch -->

- **Zweck:** Die Software Factory übernimmt das Format von Absicht, Spec und Plan aus Specwright. Dafür braucht sie eine Nummer, auf die sie sich festlegen kann („ich arbeite mit Format 1"), ohne jede Werkzeugversion von Specwright mitzumachen.
- **Kernaufgaben:** Jede der drei Vorhaben-Vorlagen trägt eine Formatversion. Jede Datei, die aus einer Vorlage entsteht, übernimmt diese Nummer. Die Regel, wann die Nummer steigt, ist aufgeschrieben, und das CHANGELOG führt Formatänderungen getrennt von Werkzeugänderungen.
- **Endzustand:** Einer fertigen intent.md, spec.md oder plan.md sieht man an, nach welcher Formatfassung sie geschrieben ist (AK-01 bis AK-06).

## 1. Problem und Anlass

<!-- leser: mensch -->

Die Software Factory hat in ADR-010 entschieden, die Formate von Spec und Plan aus Specwright zu übernehmen, statt eigene zu bauen [Q: Briefing 2026-10-06, Abschnitt „Anlass"]. Specwright hat nur eine Werkzeugversion (`VERSION` = 4.1.1), die bei jeder Änderung an Installer, UI oder Hook steigt [Q: VERSION:1, CHANGELOG.md:3]. Keine der drei Vorlagen trägt eine Angabe zu ihrem Format: `spec-template.md` und `plan-template.md` haben nur einen Kopf mit Intent, Status, Erstellt, Freigabe [Q: specwright/templates/sdlc/vorhaben/spec-template.md:3-6, plan-template.md:3-6]. Das Feld `version` in `intent-template.md` zählt die Fassungen der einzelnen Absicht, nicht die der Vorlage [Q: intent-template.md:5, :39]. Im ganzen Repo kommt keine Formatversion vor [Q: grep „formatversion|format_version" über specwright/, docs/, CHANGELOG.md, 2026-10-06: kein Treffer]. Deshalb kann die Factory weder sagen, welches Format sie erwartet, noch einer vorhandenen Spec ansehen, nach welcher Fassung sie entstanden ist. Anlass ist jetzt, weil die Factory auf diese Nummer wartet und das zweite Vorhaben (Plan-Vorlage schärfen) die erste Formatänderung nach Einführung wäre [Q: Michael, 2026-10-06].

## 2. Betroffene

<!-- leser: mensch -->

| Wer oder was | Was ändert sich |
|---|---|
| Michael beim Planen mit Specwright (alle Projekte) | Neue Absichten, Specs und Pläne tragen im Kopf eine Zeile mehr. Sonst nichts. |
| Software Factory | Kann ein Format festlegen und eine Datei darauf prüfen. Die Anpassung dort ist nicht Teil dieses Vorhabens. |
| Projekte mit installiertem Specwright | Bekommen die Vorlagen mit Formatversion beim nächsten Update. Bestehende Dateien bleiben unverändert. |
| Systeme | Vorlagen unter `specwright/templates/sdlc/vorhaben/`, Workflows `intent`/`spec`/`plan`, `templates/sdlc/README.md`, `CHANGELOG.md`, `scripts/verify.sh` (neuer Guard), Web-UI-Leser `ui/src/server/services/vorhaben-reader.ts` (nur lesend betroffen). |

## 3. Ziele

<!-- leser: mensch -->

- **Z-01:** Jede Vorhaben-Vorlage und jede daraus erzeugte Datei nennt ihre Formatversion.
- **Z-02:** Wer Specwright-Dateien weiterverarbeitet, kann aus der Nummer ablesen, ob eine Änderung ihn bricht oder nur ergänzt.
- **Z-03:** Formatänderungen sind in der Änderungshistorie auffindbar, ohne Werkzeugänderungen durchlesen zu müssen.

## 4. Nicht-Ziele

<!-- leser: mensch -->

- **NZ-01:** Keine inhaltliche Änderung an den Vorlagen. Das Schärfen der Plan-Vorlage (Test-Nahtstelle, erster Schritt durch alle Schichten, Größenmaß, Variante B, 2x-Regel; Briefing Befunde 1–5) wird ein eigenes Vorhaben.
- **NZ-02:** Keine Nachträge in bestehenden `intent/`-Ordnern, weder hier noch in installierten Projekten.
- **NZ-03:** Keine Änderung an der Software Factory.
- **NZ-04:** Keine Formatversion für Projekt-Vorlagen (`templates/sdlc/projekt/`) und Hooks. Nur die drei Vorhaben-Vorlagen.
- **NZ-05:** Keine Anzeige der Formatversion in der Web-UI.

## 5. Abnahmekriterien

<!-- leser: mensch -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Jede der drei Vorhaben-Vorlagen MUSS im Kopf eine Formatversion tragen, beim Start alle drei dieselbe: `1.0`. | Z-01 | Test |
| AK-02 | Wenn `/intent`, `/spec` oder `/plan` eine neue Datei aus der Vorlage erzeugt, MUSS die Datei die Formatversion der verwendeten Vorlage tragen. | Z-01 | Stichprobe |
| AK-03 | Falls eine Vorlage ohne Formatversion ist oder die drei Vorlagen verschiedene Hauptnummern tragen, dann MUSS `verify` fehlschlagen. | Z-01 | Test |
| AK-04 | Die Regel MUSS schriftlich festlegen: Die Hauptnummer steigt, wenn eine bestehende Datei nach der neuen Vorlage nicht mehr gültig wäre oder ein Leser sie anders auslesen müsste (Abschnitt entfernt oder umbenannt, Pflichtfeld neu, Kennungsschema geändert). Die Nebennummer steigt bei Ergänzungen, die alte Leser ignorieren können. Reine Formulierungen ändern die Nummer nicht. | Z-02 | Review |
| AK-05 | Die Regel MUSS festlegen, dass eine Datei ohne Formatversion als „vor Format 1" gilt. | Z-02 | Review |
| AK-06 | Das CHANGELOG MUSS Formatänderungen in einem eigenen Abschnitt je Release führen, beginnend mit der Einführung von Format 1.0. | Z-03 | Review |
| AK-07 | Die Web-UI MUSS Absichten, Specs und Pläne mit und ohne Formatversion genauso anzeigen wie vorher. | Z-01 | Test |

## 6. Randbedingungen

<!-- leser: mensch -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | Technik | Die Web-UI liest den Kopf der intent.md als `schluessel: "wert"`-Zeilen und in spec.md/plan.md die Zeile `> **Status:** …`; die Formatangabe darf diese Zeilen nicht verändern. Grund: sonst zeigt die Übersicht „Kopf nicht lesbar". | `ui/src/server/services/vorhaben-reader.ts:46-50`, `:106-112` |
| RB-02 | Betrieb | Die Vorlagen sind schon im Lieferumfang; es entsteht keine neue Datei. Entsteht doch eine (z. B. Guard-Skript), braucht sie eine Zeile in `specwright/manifest.tsv`. | `CLAUDE.md` „Konventionen", AR-01 |
| RB-03 | Betrieb | Frontmatter-Zeilen enden mit zwei Leerzeichen, Leerzeile vor dem schließenden `---` (MacDown). | `CLAUDE.md` „Konventionen", `specwright/workflows/core/intent.md` Step 4 |
| RB-04 | Betrieb | Der Leser-Marker-Guard prüft die Überschriften der Vorlagen; eine Kopfzeile ist keine Überschrift und darf keine neue erfordern. | `templates/sdlc/README.md` „Zwei Leser je Dokument", `scripts/check-leser-marker.sh` |

## 7. Offene Fragen

<!-- leser: mensch -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | *entschieden 2026-10-06 (Michael, mit Freigabe 0.1.0)*: zweiteilig `1.0`, Factory legt sich auf die Hauptnummer fest → AK-01, AK-04. | nein | Michael | 2026-10-06 |
| OF-02 | *entschieden 2026-10-06 (Michael, mit Freigabe 0.1.0)*: eine gemeinsame Nummer für alle drei Vorlagen → AK-01, AK-03. | nein | Michael | 2026-10-06 |

---

## Änderungsprotokoll

<!-- leser: agent -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 1.0.0 | 2026-10-06 | Angenommen; OF-01 und OF-02 nach Vorschlag entschieden. Abgleich Mensch/Agent: ohne Befund | alle | Michael, 2026-10-06 |
| 0.1.0 | 2026-10-06 | Entwurf aus Briefing Software Factory (Befund 6); Zuschnitt „zwei Vorhaben, Format zuerst", Ort „Vorlage + erzeugte Datei" entschieden im Gespräch | alle | — |

<!-- Definition of Ready (vor status "angenommen"):
     [x] Drei Sätze nennen Zweck, Kernaufgaben, Endzustand und versprechen nichts, was AK/RB/NZ einschränken.
     [x] Problem mit Beleg, Anlass genannt.
     [x] Jedes AK: EARS-Form, ein Modalverb, Ziel, Prüfart, beobachtbar statt Mechanismus.
     [x] Mindestens ein Nicht-Ziel. Jede RB mit Herkunft.
     [x] Keine offene Frage mit „Blockiert: ja".
     [x] Keine Projektregeln, die in CLAUDE.md gehören.
     [—] Ab risikoklasse mittel: entfällt (niedrig).
     [x] `verantwortlich` hat angenommen, Commit dokumentiert die Annahme. -->
