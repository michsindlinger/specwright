---
name: handoff-weiter
description: "Handoff weiter: schreibt ein Session-Handoff wie /session-handoff, damit die Web-UI von Specwright die Sitzung danach leert und genau dieses Handoff in der leeren Sitzung einliest. NUR bei explizitem Aufruf (/handoff-weiter oder Handoff-Knopf im Terminal der Web-UI). NICHT automatisch auslösen. Ohne Web-UI leert nichts: danach /clear und /start-from-handoff von Hand."
---

# Handoff weiter

Ein Schritt statt drei: Handoff schreiben, die Web-UI erledigt Leeren und Einlesen.

## Workflow

1. Führe den Skill `session-handoff` vollständig aus: dasselbe Format, derselbe Ablageort
   `.claude/handoffs/handoff-<YYYY-MM-DD_HH-MM>.md` im Projektroot, dieselbe `.gitignore`-Prüfung.
   Die Datei muss geschrieben sein, bevor du die Runde beendest.
2. Gib im Terminal NUR aus:
   - den Dateipfad,
   - den einen „Nächsten Schritt" (eine Zeile),
   - den Hinweis: „In der Web-UI leert das System die Sitzung und liest das Handoff ein.
     Ohne Web-UI: `/clear`, dann `/start-from-handoff nur lesen`."
3. Danach nichts weiter tun: nicht `/clear` vorschlagen und ausführen, nicht mit dem
   nächsten Schritt beginnen, keine Rückfrage. Die Runde endet hier.

## Regeln

- Kein Handoff geschrieben (Fehler, Abbruch) → das kurz sagen; die Web-UI leert dann nicht.
- Das komplette Dokument nicht ins Terminal schreiben.
