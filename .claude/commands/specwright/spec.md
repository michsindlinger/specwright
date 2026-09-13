# Spec

Die fachliche Spec zu einer angenommenen `intent.md` schreiben: Abläufe, Anforderungen, Randfälle, Daten, Oberfläche — und die Bedenken aus den vier Projekt-Docs markieren, ohne sie zu entscheiden.

Refer to the instructions located in specwright/workflows/core/spec.md

**Ablauf (Main Agent):**
- Aufruf: `/spec INT-JJJJ-NNN`; verweigert bei `bypass: ja` (dann `/plan`)
- Liest `intent.md` und `docs/product-brief.md`, `docs/architecture.md`, `docs/security.md`, `docs/design.md`
- Vorlage `templates/sdlc/vorhaben/spec-template.md`; jede FA verweist auf ein AK; jedes AK ist abgedeckt
- Abschnitt 7 „Bedenken aus den Projekt-Docs" ist Pflicht: markieren, nicht entscheiden; offene Zeilen an den Plan delegieren
- Auslegungen nach ER-00 unter „Annahmen", Freigabe holt sie gesammelt ein
- Keine Technik, keine Dateien, keine Architektur — das ist `plan.md`
- Freigabe → `status: freigegeben`, `intent.bezuege.spec` setzen, Commit

**Nächster Schritt:** `/plan INT-JJJJ-NNN`
