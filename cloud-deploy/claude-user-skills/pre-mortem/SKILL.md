---
name: pre-mortem
description: "Pre-Mortem Risk Analysis: Strukturierte Prospective-Hindsight-Übung um launch-blocking Risiken vor Commitment aufzudecken. Team stellt sich vor, das Produkt sei 14 Tage nach Launch gefloppt, und arbeitet rückwärts. Klassifiziert Risiken in Tigers (echt), Paper Tigers (hypothetisch), Elephants (unausgesprochen). Nutze diesen Skill vor Build-Commitment, bei zu hoher Stakeholder-Confidence, vor Major-Releases, oder wenn das Team vage Sorgen nicht artikulieren kann. Trigger: /pre-mortem, 'pre-mortem', 'risk analysis', 'was könnte schiefgehen', 'risiken vor launch'."
---

# Pre-Mortem Risk Analysis

Prospective-Hindsight-Methode zur ehrlichen Risiko-Aufdeckung vor Commitment zu größerem Build-Effort.

## Voraussetzungen

**Critical:** Psychological safety. Ohne ehrliche Team-Dynamik wird das Ergebnis sanitisiert und wertlos. Wenn Safety unklar → mit User klären bevor Session startet.

**Input vom User:**
- Produkt/Feature/Spec-Name
- Geplanter Launch-Datum (oder Hypothetisches Datum)
- Stakeholder-Liste (optional)
- Vorhandene Annahmen/Confidence-Level

## Drei Risiko-Kategorien

### 🐅 Tigers — Evidenz-basierte Threats
Reale Risiken mit Belegen (Daten, Erfahrung, technische Constraints).
**Urgency-Level:**
- **Launch-Blocking** — muss vor Launch gelöst sein
- **Fast-Follow** — innerhalb 1-2 Wochen nach Launch
- **Track** — beobachten, später adressieren

### 📄 Paper Tigers — Hypothetisch
Klingen bedrohlich, aber keine Evidenz. Bei Scrutiny unwahrscheinlich oder low-impact. Dokumentieren, nicht mitigieren.

### 🐘 Elephants — Unausgesprochene Org-Themen
Politik, Interpersonelles, Power-Dynamik, "darüber redet niemand". Müssen explizit benannt werden, sonst killen sie still.

## 6-Phasen-Methodik (60-90min)

### Phase 1 — Scene-Setting (5min)
Framing: "Es ist [Launch + 14 Tage]. Das Produkt ist gescheitert. Headlines sind brutal. Was ist passiert?"
Konkrete Failure-Szenarien anpinnen:
- User-Adoption < 10% Erwartung
- Kritischer Bug in Production
- Stakeholder-Vertrauen verloren
- Konkurrenz überholt

### Phase 2 — Silent Generation (10min)
Jeder schreibt **alleine** Risiken auf. Keine Diskussion. Ziel: 10-15 Risiken pro Person. Quantity over Quality.
**Wichtig:** Silent. Group-Think killt Pre-Mortem.

### Phase 3 — Cluster + Dedup (15min)
Alle Risiken sichtbar machen (Whiteboard, Miro, Markdown). Ähnliche gruppieren. Duplikate mergen. Keine Bewertung, nur Sortierung.

### Phase 4 — Klassifizierung (20min)
Pro Risiko-Cluster:
1. Tiger / Paper Tiger / Elephant?
2. Wenn Tiger → Urgency-Level (Launch-Blocking / Fast-Follow / Track)
3. Evidenz dokumentieren (warum echt? warum hypothetisch?)

**Heuristik Tiger vs Paper Tiger:**
- "Wir haben Daten X, die zeigen Y" → Tiger
- "Es könnte sein, dass..." → Paper Tiger
- "Niemand spricht darüber, aber..." → Elephant

### Phase 5 — Mitigation Planning (15-25min)
Nur für **Launch-Blocking Tigers**:
- Konkrete Mitigation-Strategie
- Owner (Name, nicht Team)
- Decision-Deadline
- Success-Criteria

Fast-Follow Tigers: kurze Notiz, später behandeln. Track Tigers: nur loggen.

### Phase 6 — Elephants Action (10min)
Elephants **explizit benennen**. Pro Elephant:
- Wer sollte das adressieren?
- Welches Gespräch fehlt?
- Bis wann muss es geführt werden?

Elephants sind oft die echten Killer. Nicht skippen.

## Output: Risk Registry

Erstelle Markdown-Dokument mit folgender Struktur:

```markdown
# Pre-Mortem Risk Registry — [Produkt/Feature]
> Session-Datum: [YYYY-MM-DD]
> Hypothetisches Failure-Datum: [Launch + 14 Tage]
> Teilnehmer: [Liste]

## Failure-Szenarien (aus Phase 1)
- [Konkretes Szenario 1]
- [Konkretes Szenario 2]

## 🐅 Tigers

### [Risiko-Name] — Launch-Blocking
- **Evidenz:** [Konkrete Daten/Erfahrung]
- **Mitigation:** [Strategie]
- **Owner:** [Name]
- **Deadline:** [Datum]
- **Success-Criteria:** [Messbar]

### [Risiko-Name] — Fast-Follow
- **Evidenz:** ...
- **Notiz:** ...

### [Risiko-Name] — Track
- **Evidenz:** ...

## 📄 Paper Tigers
- [Risiko] — warum hypothetisch
- [Risiko] — warum unwahrscheinlich

## 🐘 Elephants
### [Elephant-Name]
- **Was niemand sagt:** ...
- **Wer adressiert:** [Name]
- **Bis wann:** [Datum]
- **Welches Gespräch fehlt:** ...

## Decisions-Log
- [Date] [Decision] → [Outcome]
```

Speicherort: User entscheidet. Default-Vorschlag:
- Specwright-Projekt: `specwright/specs/[spec]/pre-mortem.md`
- Standalone: User fragen

## Anti-Patterns (vermeiden)

- ❌ **Confidence-Validation** — Pre-Mortem ist nicht zum Bestätigen, dass alles passt
- ❌ **Group-First-Generation** — Silent Phase überspringen → Group-Think
- ❌ **Elephants ignorieren** — "Dafür haben wir keine Zeit" = Pre-Mortem failed
- ❌ **Vague Mitigations** — "Wir achten drauf" ist keine Mitigation
- ❌ **Owner = Team** — Immer Person, nicht Team
- ❌ **Keine Deadline** — Mitigation ohne Datum verfällt

## Quick-Run-Modus (Solo / 20min)

Wenn Solo-User oder kein Team verfügbar:
1. User listet 5 plausibelste Failure-Szenarien
2. Pro Szenario: 3 Root-Causes
3. Pro Root-Cause: Tiger/Paper Tiger/Elephant
4. Nur Launch-Blocking Tigers → Mitigation
5. Output: Komprimiertes Risk Registry

## Integration mit anderen Skills/Workflows

- Vor `/create-spec` → besonders bei hohem Estimation-Effort
- Vor `/execute-tasks` Major-Releases
- Nach `/analyze-feasibility` → wenn Feasibility hoch aber Bauchgefühl unruhig
- Mit `/validate-market` → market-side risks zusätzlich aufdecken

## Quelle

Adaptiert von: borghei/Claude-Skills — project-management/discovery/pre-mortem
Methodik basiert auf Gary Klein's "Performing a Project Premortem" (HBR 2007).
