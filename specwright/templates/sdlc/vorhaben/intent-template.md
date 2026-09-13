---
intent_id: "INT-JJJJ-NNN"  
titel: "[TITEL]"  
status: "entwurf"  
version: "0.1.0"  
autor: "[AUTOR]"  
verantwortlich: "[ROLLE]"  
erstellt: "JJJJ-MM-TT"  
geaendert: "JJJJ-MM-TT"  
risikoklasse: "niedrig"  
groesse: "S"  
bypass: "nein"  
bypass_grund: ""  
bezuege:  
  product: "docs/product-brief.md"  
  spec: ""  
  plan: ""  
  board_karte: ""  
  adr: []  
  ersetzt: ""  
schlagworte: []  

---

# Absicht: [TITEL]

<!-- Ablage: intent/INT-JJJJ-NNN-kurzname/intent.md -->

## Felder im Kopf

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

<!-- Zwei Schichten.
     Kern (Pflicht, für Menschen, etwa 3 Minuten, höchstens ~450 Wörter bis einschließlich Nicht-Ziele): drei Sätze bis Abnahmekriterien.
     Vertragsschicht (Pflicht ab risikoklasse mittel): Abschnitte 6 bis 11.
     IDs: Z, NZ, AK, RB, OF, B, EK, ER, AN — zweistellig, nie wiederverwenden.
     Normsprache: MUSS, DARF NICHT, SOLLTE, DARF nur in Großbuchstaben verbindlich (BSI/DIN 820-2, entspricht RFC 2119). -->

## Absicht in drei Sätzen

- **Zweck:** [Warum gibt es das Vorhaben, für wen, welcher Nutzen?]
- **Kernaufgaben:** [2 bis 4 Dinge, ohne die das Vorhaben scheitert]
- **Endzustand:** [Was ist am Ende beobachtbar wahr? Verweis auf AK-IDs]

## 1. Problem und Anlass

<!-- Fakten mit Beleg [Q: Quelle]. Kein Lösungsvorschlag. Anlass = warum jetzt. -->

[3 bis 6 Sätze.]

## 2. Betroffene

| Wer oder was | Was ändert sich |
|---|---|
| [Personengruppe] | […] |
| Systeme | [alle berührten Systeme] |

## 3. Ziele

<!-- 1 bis 5, ergebnisorientiert, lösungsfrei. Jedes Ziel wird von mindestens einem AK abgedeckt. -->

- **Z-01:** […]

## 4. Nicht-Ziele

<!-- Mindestens eins. Naheliegende Erweiterungen ausdrücklich ausschließen. -->

- **NZ-01:** […]

## 5. Abnahmekriterien

<!-- Eine Zeile = ein beobachtbares Verhalten, genau ein Modalverb, kein Mechanismus.
     Schablonen (EARS): „Das System MUSS …" · „Wenn [Auslöser], MUSS das System …" · „Solange [Zustand], MUSS …" · „Falls [Fehler], dann MUSS …"
     Zeitangaben mit Startpunkt. Prüfung: Test | Stichprobe | Review | Messung. -->

| ID | Kriterium | Ziel | Prüfung |
|---|---|---|---|
| AK-01 | Wenn [Auslöser], MUSS das System [Reaktion]. | Z-01 | Test |

## 6. Randbedingungen

<!-- Jede mit Herkunft (Norm, Pfad zur Richtlinie, security.md, Vertrag). Technik nur, wenn von außen vorgegeben, mit „Grund:". Sonst „Keine." -->

| ID | Art | Randbedingung | Herkunft |
|---|---|---|---|
| RB-01 | rechtlich / Sicherheit / Datenschutz / Betrieb / Technik | […] | […] |

## 7. Offene Fragen

<!-- Bei status "angenommen" keine blockierende Frage. Nicht blockierende nennen die Übergangsregel. Entschiedene wandern mit Datum nach „Begriffe" oder ins Kriterium. Sonst „Keine." -->

| ID | Frage | Blockiert | Zuständig | Frist |
|---|---|---|---|---|
| OF-01 | […] | ja / nein, bis dahin gilt […] | [Rolle] | JJJJ-MM-TT |

---

<!-- ===== Vertragsschicht — Pflicht ab risikoklasse "mittel", sonst löschen ===== -->

## 8. Begriffe

<!-- Jeden Begriff aus AK oder RB definieren, der mehr als eine Lesart hat. Entscheidungen zu offenen Fragen hier festhalten, mit Datum und Rolle. -->

- **B-01 [Begriff]:** [Definition]

## 9. Erfolgskennzahlen

<!-- Zielwert mit Zahl und Einheit. Messung vor Produktion (Gate) oder „kein Gate". Zielwert 0 nur mit Kontrollfall. -->

| ID | Kennzahl | Zielwert | Messung vor Produktion | Messung im Betrieb | Reaktion bei Verfehlen |
|---|---|---|---|---|---|
| EK-01 | […] | [Zahl, Einheit] | […] | [Quelle, Zeitfenster] | [wer tut was] |

## 10. Auslieferung, Betrieb, Zeitbudget

- **Freigabe Produktion:** [Rolle(n) — nur Menschen]
- **Stufen:** [Teil der Nutzer, dann alle / auf einmal]
- **Rückzug:** [Bedingung; wer abschalten, wer wieder einschalten darf]
- **Betrieb:** [verantwortlich, Empfänger der Alarme]
- **Zeitbudget:** [Umfang ab Startpunkt; Abbruchkriterium — keine stillschweigende Verlängerung]

## 11. Entscheidungsrechte

<!-- allein = entscheiden und dokumentieren · fragen = dieser Punkt ruht, Rest läuft · stopp = alles ruht. ER-00 als Auffangregel. -->

| ID | Stufe | Regel |
|---|---|---|
| ER-00 | allein (vorläufig) | Auslegungsfragen zu AK, RB oder B ohne Widerspruch: engste Auslegung, die den Wortlaut erfüllt; in der Spec unter „Annahmen" dokumentieren; weiterarbeiten. Bestätigung gesammelt bei der Spec-Freigabe. |
| ER-01 | allein | Details ohne Datenverlust und ohne Außenwirkung: interne Struktur, Benennungen, Aufgabenschnitt, synthetische Testdaten. |
| ER-02 | fragen | Neue externe Abhängigkeit (Bibliothek, Fremddienst). |
| ER-03 | fragen | Eine Kennzahl wird vor Produktion verfehlt. |
| ER-04 | stopp | Zugriff auf Produktionsdaten. |
| ER-05 | stopp | Zwei Kriterien widersprechen sich. |
| ER-06 | stopp | Tests, Gates oder Schwellen müssten geändert werden, damit etwas grün wird. |
| ER-07 | stopp | Produktionsfreigabe: bereitet der Agent vor; freigeben dürfen nur die Rollen aus Abschnitt 10. |
| ER-08 | stopp | Zeitbudget ausgeschöpft. |

## 12. Annahmen

- **AN-01:** […] Prüfung: [wer bestätigt, womit, bis wann]

---

## Änderungsprotokoll

<!-- Oberste Zeile = Frontmatter-Version und -Datum.
     MAJOR: Ziel, Nicht-Ziel, Begriff oder Bedeutung eines Kriteriums geändert → Spec und Tests der IDs erneut prüfen, erneute Freigabe.
     MINOR: Kriterium ergänzt. PATCH: nur Formulierung.
     Ab status "umgesetzt" nicht mehr ändern; neue intent.md mit bezuege.ersetzt. -->

| Version | Datum | Änderung | IDs | Freigabe |
|---|---|---|---|---|
| 0.1.0 | JJJJ-MM-TT | Entwurf | alle | — |

<!-- Definition of Ready (vor status "angenommen"):
     [ ] Drei Sätze nennen Zweck, Kernaufgaben, Endzustand und versprechen nichts, was AK/RB/NZ einschränken.
     [ ] Problem mit Beleg, Anlass genannt.
     [ ] Jedes AK: EARS-Form, ein Modalverb, Ziel, Prüfart, beobachtbar statt Mechanismus.
     [ ] Mindestens ein Nicht-Ziel. Jede RB mit Herkunft.
     [ ] Keine offene Frage mit „Blockiert: ja".
     [ ] Keine Projektregeln, die in CLAUDE.md gehören.
     [ ] Ab risikoklasse mittel: Abschnitte 8–12 ausgefüllt. Ab hoch: Blindprobe durch frischen Agenten, 0 blockierende Rückfragen.
     [ ] `verantwortlich` hat angenommen, Commit dokumentiert die Annahme. -->
