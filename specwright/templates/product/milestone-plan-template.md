# Milestone Plan Template

<!--
This template is used by the plan-milestones command to create a milestone-based
payment plan for fixed-price projects. All acceptance criteria are formulated
PRO-CONTRACTOR (objektiv messbar, keine schwammigen Kriterien).
-->

# Milestone-Plan: [PROJECT_NAME]

> Erstellt: [CURRENT_DATE]
> Projekt: [PROJECT_NAME]
> Gesamtbudget: [TOTAL_BUDGET]
> Anzahl Milestones: [N]

---

## Executive Summary

**Projekttyp:** [Product / Platform]
**Basis-Dokumente:**
- Roadmap: [roadmap.md / platform-roadmap.md]
- Blocker-Analyse: [blocker-analysis.md]

**Zahlungsübersicht:**

| Milestone | Anteil | Betrag | Fälligkeit |
|-----------|--------|--------|------------|
| MS-1: [Name] | [X]% | [€X.XXX] | Nach Abnahme |
| MS-2: [Name] | [X]% | [€X.XXX] | Nach Abnahme |
| MS-3: [Name] | [X]% | [€X.XXX] | Nach Abnahme |
| **Gesamt** | **100%** | **[€X.XXX]** | |

---

## Milestone 1: [NAME]

**Zahlungsanteil:** [X]% ([€X.XXX])
**Basiert auf:** Phase [X] der Roadmap

### Leistungsumfang

[Beschreibung der Deliverables für diesen Milestone]

- Deliverable 1: [Beschreibung]
- Deliverable 2: [Beschreibung]
- Deliverable 3: [Beschreibung]

### Abnahmekriterien (Objektiv Messbar)

> **WICHTIG:** Alle Kriterien sind so formuliert, dass sie objektiv und technisch
> prüfbar sind. Der Auftragnehmer kann die Erfüllung selbst nachweisen.

| Nr. | Kriterium | Prüfmethode | Status |
|-----|-----------|-------------|--------|
| 1.1 | [Technisches Kriterium - z.B. "API-Endpoint /users liefert JSON-Response mit Status 200"] | [Demo / Test / Screenshot] | ☐ |
| 1.2 | [Technisches Kriterium - z.B. "Login-Formular validiert E-Mail-Format clientseitig"] | [Demo / Test] | ☐ |
| 1.3 | [Technisches Kriterium - z.B. "Datenbank-Schema enthält Tabellen X, Y, Z"] | [DB-Export / Screenshot] | ☐ |

### Kundenabhängigkeiten (aus Blocker-Analyse)

> Folgende Leistungen muss der Auftraggeber erbringen, damit dieser Milestone
> vollständig umgesetzt werden kann:

| Abhängigkeit | Benötigt bis | Status | Auswirkung bei Nicht-Lieferung |
|--------------|--------------|--------|--------------------------------|
| [z.B. API-Zugangsdaten für Drittanbieter] | [Datum/Phase] | ☐ Offen | Milestone gilt als erfüllt, soweit Auftragnehmer-Leistungen erbracht |
| [z.B. Finale Texte/Inhalte] | [Datum/Phase] | ☐ Offen | Platzhalter werden verwendet, Austausch im nächsten MS |

### Abnahme-Klausel für Milestone 1

```
Der Milestone 1 gilt als abgenommen, wenn:
a) Alle Abnahmekriterien 1.1 bis 1.X erfüllt sind, ODER
b) Der Auftraggeber nicht innerhalb von [5] Werktagen nach Fertigstellungsmeldung
   schriftlich begründete Mängel anzeigt, ODER
c) Der Auftraggeber die unter "Kundenabhängigkeiten" aufgeführten Leistungen
   nicht fristgerecht erbracht hat - in diesem Fall gelten die vom Auftragnehmer
   erbrachten Leistungen als vollständig und abnahmefähig.
```

---

## Milestone 2: [NAME]

**Zahlungsanteil:** [X]% ([€X.XXX])
**Basiert auf:** Phase [X] der Roadmap

### Leistungsumfang

[Beschreibung der Deliverables für diesen Milestone]

### Abnahmekriterien (Objektiv Messbar)

| Nr. | Kriterium | Prüfmethode | Status |
|-----|-----------|-------------|--------|
| 2.1 | [Technisches Kriterium] | [Prüfmethode] | ☐ |
| 2.2 | [Technisches Kriterium] | [Prüfmethode] | ☐ |

### Kundenabhängigkeiten

| Abhängigkeit | Benötigt bis | Status | Auswirkung bei Nicht-Lieferung |
|--------------|--------------|--------|--------------------------------|
| [Abhängigkeit] | [Datum] | ☐ Offen | [Auswirkung] |

### Abnahme-Klausel für Milestone 2

```
[Analog zu Milestone 1]
```

---

## Milestone 3: [NAME]

**Zahlungsanteil:** [X]% ([€X.XXX])
**Basiert auf:** Phase [X] der Roadmap

### Leistungsumfang

[Beschreibung der Deliverables für diesen Milestone]

### Abnahmekriterien (Objektiv Messbar)

| Nr. | Kriterium | Prüfmethode | Status |
|-----|-----------|-------------|--------|
| 3.1 | [Technisches Kriterium] | [Prüfmethode] | ☐ |
| 3.2 | [Technisches Kriterium] | [Prüfmethode] | ☐ |

### Kundenabhängigkeiten

| Abhängigkeit | Benötigt bis | Status | Auswirkung bei Nicht-Lieferung |
|--------------|--------------|--------|--------------------------------|
| [Abhängigkeit] | [Datum] | ☐ Offen | [Auswirkung] |

### Abnahme-Klausel für Milestone 3

```
[Analog zu Milestone 1]
```

---

## Vertragsklauseln (Empfohlen)

> Die folgenden Klauseln sollten in den Projektvertrag aufgenommen werden,
> um eine faire und rechtssichere Zahlungsabwicklung zu gewährleisten.

### 1. Abnahmefiktion (Wichtig!)

```
§ Abnahme

(1) Der Auftragnehmer zeigt die Fertigstellung eines Milestones schriftlich
    (E-Mail genügt) an. Mit der Fertigstellungsmeldung übergibt der Auftragnehmer
    die Nachweise zur Erfüllung der Abnahmekriterien.

(2) Der Auftraggeber hat [5] Werktage Zeit, die Leistung zu prüfen und etwaige
    Mängel schriftlich unter Angabe einer nachvollziehbaren Beschreibung anzuzeigen.

(3) Zeigt der Auftraggeber innerhalb der Frist keine Mängel an oder nutzt er
    die Leistung produktiv, gilt der Milestone als abgenommen (Abnahmefiktion).

(4) Unwesentliche Mängel berechtigen nicht zur Verweigerung der Abnahme.
```

### 2. Zahlungsbedingungen

```
§ Vergütung und Zahlung

(1) Die Vergütung ist in [N] Abschlagszahlungen gemäß Milestone-Plan zu leisten.

(2) Jede Abschlagszahlung wird [sofort / innerhalb von 7 Tagen] nach Abnahme
    des jeweiligen Milestones fällig.

(3) Bei Zahlungsverzug von mehr als [14] Tagen ist der Auftragnehmer berechtigt,
    die weitere Leistungserbringung bis zum Ausgleich der offenen Forderungen
    einzustellen. Vereinbarte Termine verschieben sich entsprechend.

(4) Verzugszinsen: [9 Prozentpunkte über dem Basiszinssatz / pauschaler
    Verzugsschaden von 40€ je Verzugsfall gem. §288 Abs. 5 BGB].
```

### 3. Mitwirkungspflichten des Auftraggebers

```
§ Mitwirkungspflichten

(1) Der Auftraggeber stellt die im Milestone-Plan unter "Kundenabhängigkeiten"
    aufgeführten Leistungen, Zugänge und Informationen fristgerecht bereit.

(2) Kommt der Auftraggeber seinen Mitwirkungspflichten nicht fristgerecht nach,
    gelten die vom Auftragnehmer bis dahin erbrachten Leistungen als vertragsgemäß.
    Der entsprechende Milestone gilt als erfüllt, soweit die Nicht-Erfüllung
    auf der fehlenden Mitwirkung beruht.

(3) Durch Verzögerungen des Auftraggebers entstehende Mehraufwände sind
    vom Auftraggeber zusätzlich zu vergüten.

(4) Benötigt der Auftragnehmer Freigaben des Auftraggebers, hat dieser diese
    innerhalb von [3] Werktagen zu erteilen. Andernfalls gilt die Freigabe
    als erteilt.
```

### 4. Änderungen (Change Requests)

```
§ Änderungen

(1) Änderungswünsche nach Beauftragung (Change Requests) sind gesondert
    zu beauftragen und zu vergüten.

(2) Der Auftragnehmer erstellt für jeden Change Request einen Kostenvoranschlag.
    Erst nach schriftlicher Freigabe durch den Auftraggeber beginnt die Umsetzung.

(3) Die Bearbeitung von Change Requests kann die Termine für nachfolgende
    Milestones verschieben.
```

### 5. Projektabbruch

```
§ Kündigung

(1) Der Auftraggeber kann den Vertrag jederzeit kündigen. In diesem Fall
    sind alle bis zum Kündigungszeitpunkt abgenommenen Milestones sowie
    der anteilig erbrachte Aufwand des laufenden Milestones zu vergüten.

(2) Bei Kündigung durch den Auftraggeber ohne wichtigen Grund steht dem
    Auftragnehmer zusätzlich eine Pauschale von [15%] des noch ausstehenden
    Auftragsvolumens als Entschädigung zu.

(3) Der Auftragnehmer kann bei Zahlungsverzug von mehr als [30] Tagen den
    Vertrag kündigen. Sämtliche bis dahin erbrachten Leistungen sind zu vergüten.
```

### 6. Eigentumsvorbehalt

```
§ Eigentumsvorbehalt

(1) Das Eigentum an allen Arbeitsergebnissen (Quellcode, Dokumentation, etc.)
    geht erst mit vollständiger Bezahlung aller Vergütungsansprüche auf den
    Auftraggeber über.

(2) Bis zur vollständigen Bezahlung räumt der Auftragnehmer dem Auftraggeber
    ein einfaches, nicht übertragbares Nutzungsrecht ein.
```

---

## Kriterien-Formulierungs-Guide

### DO: Objektiv messbare Kriterien

- "API-Endpoint /api/users gibt bei GET-Request JSON mit Benutzer-Array zurück"
- "Login-Funktion authentifiziert Benutzer gegen Datenbank"
- "Dashboard zeigt Echtzeitdaten aus der Datenbank an"
- "Export-Funktion generiert PDF-Datei mit den ausgewählten Daten"
- "Suchfunktion liefert Ergebnisse aus dem RAG-Index"
- "Formular validiert Pflichtfelder vor dem Absenden"
- "System sendet E-Mail bei Registrierung an hinterlegte Adresse"

### DON'T: Schwammige/Subjektive Kriterien

- ❌ "Benutzer sind zufrieden mit der Lösung"
- ❌ "Das System läuft performant"
- ❌ "Die Suche liefert relevante Ergebnisse"
- ❌ "Das Design sieht professionell aus"
- ❌ "Die Anwendung ist benutzerfreundlich"
- ❌ "Die Qualität entspricht den Erwartungen"

---

## Hinweise

1. **Milestone-Aufteilung:** Milestones sollten so geschnitten sein, dass
   jeder für sich einen nachweisbaren Mehrwert liefert.

2. **Zahlungsverteilung:** Empfohlen wird eine leicht frontlastige Verteilung
   (z.B. 40%-35%-25% bei 3 Milestones), da frühe Phasen oft intensiver sind.

3. **Blocker-Handling:** Alle Kundenabhängigkeiten müssen VOR Vertragsschluss
   geklärt und im Vertrag verankert sein.

4. **Nachverhandlung:** Dieser Plan kann als Grundlage für Vertragsverhandlungen
   dienen. Passen Sie Formulierungen an die spezifische Situation an.
