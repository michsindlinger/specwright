# Spec: [Titel]

> **Intent:** `intent.md` (INT-JJJJ-NNN, Version x.y.z)
> **Status:** entwurf | in_review | freigegeben
> **Erstellt:** JJJJ-MM-TT · **Freigabe:** [Rolle], JJJJ-MM-TT
> **Gelesene Projekt-Docs:** `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md` (Stand: Commit [sha])

<!-- Die Spec ist FACHLICH. Sie beschreibt, was Nutzer erleben und was fachlich gelten muss.
     Nicht hinein gehören: Dateien, Komponenten, Datenbanktabellen, Bibliotheken, Architekturentscheidungen. Das ist plan.md.
     Die Projekt-Docs werden gelesen und dürfen hier nur BEDENKEN markieren (Abschnitt 7). Sie entscheiden nichts.
     Jede Anforderung verweist auf ein Ziel oder Abnahmekriterium der intent.md. Keine Anforderung ohne Herkunft. -->

## 1. Zusammenfassung

<!-- leser: mensch -->

[2 bis 3 Sätze: Was ist danach anders, für wen. Verweis auf Z- und AK-IDs.]

## 2. Nutzer und Abläufe

<!-- leser: mensch -->

<!-- Je Ablauf: wer, Auslöser, Schritte aus Nutzersicht, Ergebnis. Jeder Ablauf deckt mindestens ein AK ab. -->

### Ablauf A: [Name] (AK-01, AK-02)

<!-- leser: mensch -->

1. [Nutzer tut …]
2. [System zeigt …]
3. [Ergebnis: …]

## 3. Fachliche Anforderungen

<!-- leser: mensch -->

<!-- Eine Zeile = eine prüfbare Aussage. Modalverben groß. Herkunft = AK/Z/NZ aus intent.md oder „neu (Grund)". -->

| ID | Anforderung | Herkunft | Prüfung |
|---|---|---|---|
| FA-01 | Wenn […], MUSS […]. | AK-01 | Test |

## 4. Fehler- und Randfälle

<!-- leser: mensch -->

| Fall | Erwartetes Verhalten | Herkunft |
|---|---|---|
| [z. B. Upload bricht ab] | [was der Nutzer sieht, was fachlich passiert] | AK-nn / FA-nn |

## 5. Daten, fachlich

<!-- leser: agent -->

<!-- Welche fachlichen Informationen sichtbar werden, entstehen, sich ändern oder verschwinden. Ohne Tabellen- oder Feldnamen. Datenklasse laut security.md nennen. -->

| Information | Entsteht / ändert sich / verschwindet | Wer sieht sie | Datenklasse |
|---|---|---|---|
| […] | […] | [Rolle] | intern / personenbezogen / … |

## 6. Was der Nutzer sieht

<!-- leser: mensch -->

<!-- Nur bei UI-Änderung. Beschreibung in Worten; Mock unter `design/` (Pfad nennen), sonst „kein Mock nötig, weil …". -->

- [Seite/Bereich]: [was neu oder anders ist]
- Mock: `design/[datei]` | kein Mock nötig, weil […]

## 7. Bedenken aus den Projekt-Docs

<!-- leser: agent -->

<!-- PFLICHT. Beim Schreiben wurden product-brief, architecture, security, design gelesen. Alles, was dort reibt, steht hier — markiert, nicht entschieden.
     „Geklärt" heißt: die zuständige Rolle hat entschieden; Entscheidung steht in der Spalte. Vor der Freigabe muss jede Zeile geklärt oder als „offen, blockiert nicht, weil …" begründet sein.
     Gibt es nichts: „Keine — geprüft gegen Stand [sha]." -->

| Quelle | Bedenken | Betrifft | Geklärt? (wer, wann, wie) |
|---|---|---|---|
| security.md §[…] | […] | FA-nn | offen |
| architecture.md §[…] | […] | FA-nn | offen |
| design.md §[…] | […] | Abschnitt 6 | offen |
| product-brief.md | […] | Z-nn | offen |

## 8. Nicht im Umfang

<!-- leser: mensch -->

<!-- Aus NZ der intent.md plus alles, was beim Schreiben ausgeschlossen wurde. -->

- NZ-01: […]
- [weitere Abgrenzung]

## 9. Annahmen

<!-- leser: mensch -->

<!-- Vorläufige Auslegungen nach ER-00 der intent.md. Werden bei der Freigabe gesammelt bestätigt. -->

- **AN-S01:** [Auslegung] — bestätigt am [Datum] von [Rolle] | offen

## 10. Freigabe

<!-- leser: agent -->

- [ ] Jede FA hat Herkunft und Prüfung.
- [ ] Jedes AK der intent.md ist von mindestens einer FA abgedeckt.
- [ ] Abschnitt 7 vollständig geklärt oder begründet offen.
- [ ] Keine Technik, keine Architektur, keine Dateinamen in diesem Dokument.
- [ ] Bei risikoklasse hoch: Tech Lead hat gelesen.
- [ ] Abgleich Mensch/Agent: Mensch-Teil gegen Agenten-Teil geprüft (JJJJ-MM-TT), Befund: keiner | […]
- **Freigegeben:** [Rolle], JJJJ-MM-TT, Commit [sha]
