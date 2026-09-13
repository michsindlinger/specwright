# Sicherheit: [Produkt]

> **Stand:** JJJJ-MM-TT · **Verantwortlich:** [Rolle]
> **Rolle dieses Dokuments:** Pflichtlektüre beim Schreiben jeder Spec (Bedenken), jedes Plans und jedes Reviews. Die Verbotsliste (Abschnitt 5) ist für Agenten bindend und durch Hooks abgesichert.
> **Firmenrichtlinie:** [Pfad im Firmen-Repo, falls vorhanden]

## 1. Datenklassen

<!-- Jedes fachliche Datenobjekt bekommt eine Klasse. Die Spec nennt die Klasse in Abschnitt 5, der Plan leitet daraus Prüfungen ab. -->

| Klasse | Bedeutung | Beispiele hier | Regeln |
|---|---|---|---|
| öffentlich | darf jeder sehen | […] | — |
| intern | nur angemeldete Nutzer des Mandanten | […] | Mandantenfilter Pflicht |
| vertraulich | nur bestimmte Rollen | […] | Rollenprüfung + Audit-Event |
| personenbezogen | DSGVO; Löschfrist, Zweckbindung | […] | Rechtsgrundlage, Löschpfad, kein Export ohne Freigabe |

| Datenobjekt | Klasse | Speicherort | Löschfrist |
|---|---|---|---|
| […] | […] | […] | […] |

## 2. Zugriffsmodell

- **Anmeldung:** [Mechanismus, z. B. Firebase Auth / NextAuth / Magic Link] — wo geprüft: [Datei]
- **Rollen:** [Liste mit je einem Satz]
- **Mandanten:** [wie getrennt, wo erzwungen — Regel AR-nn in architecture.md]
- **Wer sieht was:**

| Rolle | darf sehen | darf ändern | darf nie |
|---|---|---|---|
| […] | […] | […] | […] |

## 3. Geheimnisse

| Geheimnis | Wofür | Liegt in | Kommt zur Laufzeit über | Rotation |
|---|---|---|---|---|
| […] | […] | [Secret Manager / `.env` lokal, nie im Repo] | [Env / Workload Identity] | […] |

**Nie im Repo, nie im Image, nie im Diff:** `.env*`, Service-Account-JSON, Tokens, private Schlüssel. Hook `no-secrets` blockiert Commits mit solchen Mustern.

## 4. Bedrohungen und Gegenmaßnahmen

<!-- Die 5 bis 8 wichtigsten, konkret für dieses Produkt. Stand ehrlich. -->

| ID | Bedrohung | Gegenmaßnahme | Stand | Nachweis |
|---|---|---|---|---|
| T-01 | [z. B. Nutzer eines Mandanten liest Daten eines anderen] | [Filter + Regel + Test] | umgesetzt / offen (Karte …) | [Test/Datei] |

## 5. Verbotsliste für Agenten

<!-- Bindend. Jeder Punkt hat einen Hook oder eine CI-Prüfung, sonst ist er nur ein Wunsch. -->

| Verbot | Abgesichert durch |
|---|---|
| Zugriff auf Produktionsdaten ohne ausdrückliche Freigabe (ER-04) | Permissions / Managed Settings |
| Secrets im Diff | Hook `no-secrets` |
| Auth-Prüfungen entfernen oder lockern, um einen Test grün zu bekommen (ER-06) | Review-Pass Security, Testdatei-Hook |
| Produktions-Deploy ohne Freigabe | Hook `production-gate` |
| Tests oder Baselines ändern, um grün zu werden | Hook `protect-tests` |
| […] | […] |

## 6. Pflichtprüfungen bei Änderungen

| Wenn ein Plan … | dann MUSS er … |
|---|---|
| einen von außen erreichbaren Endpunkt anlegt oder ändert | Auth-Prüfung, Eingabevalidierung, Audit-Event und Datenklasse der Antwort nennen |
| ein Datenobjekt anlegt oder ändert | Klasse (Abschnitt 1), Besitzer (architecture.md §3), Löschfrist nennen |
| ein externes System anbindet | Allowlist-Eintrag, Zugang (Abschnitt 3), Ausfallverhalten nennen |
| personenbezogene Daten berührt | Rechtsgrundlage und Zweck nennen; Export nur mit Freigabe |

## 7. Offene Lücken

<!-- Ehrlich. Jede mit Karte oder intent.md. -->

| Lücke | Risiko | Karte / Intent | Frist |
|---|---|---|---|
| […] | hoch/mittel/niedrig | […] | […] |

## Änderungsprotokoll

| Datum | Änderung | PR |
|---|---|---|
| JJJJ-MM-TT | Erstfassung | — |
