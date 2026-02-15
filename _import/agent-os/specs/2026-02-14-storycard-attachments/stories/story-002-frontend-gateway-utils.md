# Frontend Attachment Gateway & Utils

> Story ID: SCA-002
> Spec: Storycard Attachments
> Created: 2026-02-14
> Last Updated: 2026-02-14

**Priority**: High
**Type**: Frontend
**Estimated Effort**: 2 SP
**Dependencies**: SCA-001

---

## Feature

```gherkin
Feature: Frontend-Infrastruktur fuer Attachment-Kommunikation
  Als Frontend-Entwickler
  moechte ich Gateway-Methoden und Datei-Validierung fuer Attachments haben,
  damit die Attachment-UI mit dem Backend kommunizieren kann.
```

---

## Akzeptanzkriterien (Gherkin-Szenarien)

### Szenario 1: Datei-Upload ueber Gateway senden

```gherkin
Scenario: Attachment-Upload an Backend senden
  Given ich habe eine valide PNG-Datei "mockup.png" mit 1 MB ausgewaehlt
  When die Datei ueber den Gateway an das Backend gesendet wird
  Then wird eine WebSocket-Nachricht "attachment:upload" mit Base64-Daten gesendet
  And ich erhalte eine Bestaetigungsnachricht mit dem gespeicherten Dateipfad
```

### Szenario 2: Attachment-Liste vom Backend anfordern

```gherkin
Scenario: Attachments einer Story vom Backend laden
  Given Storycard "SCA-001" hat 3 angehaengte Dateien
  When die Attachment-Liste ueber den Gateway angefordert wird
  Then erhalte ich eine Liste mit 3 Attachment-Metadaten
  And jeder Eintrag enthaelt Dateiname, Groesse, MIME-Typ und Pfad
```

### Szenario 3: Attachment loeschen ueber Gateway

```gherkin
Scenario: Attachment-Loeschung an Backend senden
  Given an Storycard "SCA-001" ist "screenshot.png" angehaengt
  When die Loeschung ueber den Gateway gesendet wird
  Then wird eine WebSocket-Nachricht "attachment:delete" gesendet
  And ich erhalte eine Bestaetigungsnachricht
```

### Szenario 4: Erweiterte Datei-Validierung

```gherkin
Scenario Outline: Validierung verschiedener Dateitypen
  Given ich habe eine Datei vom Typ "<dateityp>" ausgewaehlt
  When die Datei-Validierung durchgefuehrt wird
  Then ist die Validierung "<ergebnis>"

  Examples:
    | dateityp          | ergebnis    |
    | image/png         | erfolgreich |
    | image/jpeg        | erfolgreich |
    | application/pdf   | erfolgreich |
    | text/plain        | erfolgreich |
    | application/json  | erfolgreich |
    | text/markdown     | erfolgreich |
    | application/exe   | abgelehnt   |
    | video/mp4         | abgelehnt   |
```

### Edge Cases & Fehlerszenarien

```gherkin
Scenario: Gateway-Verbindung nicht verfuegbar
  Given die WebSocket-Verbindung ist unterbrochen
  When ich versuche eine Datei hochzuladen
  Then erhalte ich eine Fehlermeldung "Verbindung zum Server nicht verfuegbar"
```

---

## Technische Verifikation (Automated Checks)

- [ ] CONTAINS: agent-os-ui/ui/src/gateway.ts enthaelt "sendAttachmentUpload"
- [ ] CONTAINS: agent-os-ui/ui/src/gateway.ts enthaelt "requestAttachmentList"
- [ ] CONTAINS: agent-os-ui/ui/src/gateway.ts enthaelt "sendAttachmentDelete"
- [ ] CONTAINS: agent-os-ui/ui/src/utils/image-upload.utils.ts enthaelt "text/plain"
- [ ] LINT_PASS: cd agent-os-ui/ui && npx tsc --noEmit exits with code 0

---

## Required MCP Tools

Keine MCP Tools erforderlich.

---

## Technisches Refinement (vom Architect)

> **Refinement durch:** dev-team__architect
> **Datum:** 2026-02-14

### DoR (Definition of Ready) - Vom Architect

#### Fachliche Anforderungen
- [x] Fachliche requirements klar definiert
- [x] Akzeptanzkriterien sind spezifisch und pruefbar
- [x] Business Value verstanden

#### Technische Vorbereitung
- [x] Technischer Ansatz definiert (WAS/WIE/WO)
- [x] Abhaengigkeiten identifiziert
- [x] Betroffene Komponenten bekannt
- [x] Erforderliche MCP Tools dokumentiert (falls zutreffend)
- [x] Story ist angemessen geschaetzt (max 5 Dateien, 400 LOC)

#### Full-Stack Konsistenz (NEU)
- [x] **Alle betroffenen Layer identifiziert** (Frontend/Backend/Database/DevOps)
- [x] **Integration Type bestimmt** (Backend-only/Frontend-only/Full-stack)
- [x] **Kritische Integration Points dokumentiert** (wenn Full-stack)
- [x] **Handover-Dokumente definiert** (bei Multi-Layer: API Contracts, Data Structures)

**Story ist READY wenn alle Checkboxen angehakt sind.**

---

### DoD (Definition of Done) - Vom Architect

#### Implementierung
- [ ] Code implementiert und folgt Style Guide
- [ ] Architektur-Vorgaben eingehalten (WIE section)
- [ ] Gateway-Methoden senden korrekte Message-Types laut `attachment.protocol.ts`

#### Qualitaetssicherung
- [ ] Alle Akzeptanzkriterien erfuellt (via Completion Check verifiziert)
- [ ] Gateway-Methoden `sendAttachmentUpload`, `requestAttachmentList`, `sendAttachmentDelete` vorhanden
- [ ] Erweiterte MIME-Types in `image-upload.utils.ts` enthalten
- [ ] Frontend TypeScript kompiliert fehlerfrei

#### Dokumentation
- [ ] Keine Linting Errors
- [ ] Completion Check Commands alle erfolgreich (exit 0)

**Story ist DONE wenn alle Checkboxen angehakt sind.**

---

### Betroffene Layer & Komponenten

**Integration Type:** Frontend-only (konsumiert Shared Types aus SCA-001)

**Betroffene Komponenten:**

| Layer | Komponenten | Aenderung |
|-------|-------------|----------|
| Frontend | `gateway.ts` | Modifiziert: 3 neue Gateway-Methoden fuer Attachment-CRUD |
| Frontend | `image-upload.utils.ts` | Modifiziert: ALLOWED_MIME_TYPES erweitern um text/plain, application/json, text/markdown; MAX_FILE_SIZE auf 5MB anpassen |

**Kritische Integration Points:**
- Gateway-Methoden muessen exakt die Message-Types verwenden, die in `attachment.protocol.ts` (SCA-001) definiert sind
- MIME-Type-Liste muss konsistent sein zwischen Frontend-Validierung und Backend-Validierung

---

### Technical Details

**WAS:**
- 3 neue public Methoden in `gateway.ts`: `sendAttachmentUpload()`, `requestAttachmentList()`, `sendAttachmentDelete()`
- Erweiterung der `ALLOWED_MIME_TYPES` in `image-upload.utils.ts` um `text/plain`, `application/json`, `text/markdown`
- Anpassung `MAX_FILE_SIZE` in `image-upload.utils.ts` von 10 MB auf 5 MB (konsistent mit Backend-Limit)
- Anpassung der Fehlermeldung in `validateFile()` fuer die erweiterten Dateitypen

**WIE (Architektur-Guidance ONLY):**
- Gateway-Methoden: Folge dem bestehenden Pattern der Git-Methoden (`requestGitStatus()`, `sendGitCommit()`). Jede Methode ruft `this.send()` mit dem entsprechenden Message-Type auf. Upload-Methode sendet Base64-Daten, Filename, MIME-Type, und Context (specId/storyId oder itemId, contextType). List-Methode sendet Context-Informationen. Delete-Methode sendet Filename und Context
- Importiere die Message-Types aus `attachment.protocol.ts` (SCA-001 Shared Types) fuer Type-Safety
- Response-Handling: Komponenten die Gateway nutzen registrieren sich selbst via `gateway.on('attachment:upload:response', handler)` -- kein zentraler Response-Handler im Gateway noetig (folgt bestehendem Pattern)
- File Validation: Erweitere die bestehende `ALLOWED_MIME_TYPES` Array-Konstante. Passe die Fehlermeldung in `validateFile()` an um die neuen Typen zu erwaehnen. Die Funktion-Signatur bleibt unveraendert

**WO:**
- `agent-os-ui/ui/src/gateway.ts` (MODIFIZIERT: ~30 Zeilen neue Methoden)
- `agent-os-ui/ui/src/utils/image-upload.utils.ts` (MODIFIZIERT: ~5 Zeilen)

**WER:** dev-team__frontend-developer

**Abhaengigkeiten:** SCA-001 (benoetigt `attachment.protocol.ts` fuer Message-Types)

**Geschaetzte Komplexitaet:** S

**Relevante Skills:** ui-component-architecture, gateway-integration

---

### Creates Reusable Artifacts

**Creates Reusable:** no

**Reusable Artifacts:**

| Artefakt | Typ | Pfad | Beschreibung |
|----------|-----|------|--------------|
| Gateway Attachment Methods | API Extension | `agent-os-ui/ui/src/gateway.ts` | Wiederverwendbar von allen Attachment-Komponenten |

---

### Completion Check

```bash
# Auto-Verify Commands - alle muessen mit 0 exiten
grep -q "sendAttachmentUpload" agent-os-ui/ui/src/gateway.ts && echo "Upload method exists" || exit 1
grep -q "requestAttachmentList" agent-os-ui/ui/src/gateway.ts && echo "List method exists" || exit 1
grep -q "sendAttachmentDelete" agent-os-ui/ui/src/gateway.ts && echo "Delete method exists" || exit 1
grep -q "text/plain" agent-os-ui/ui/src/utils/image-upload.utils.ts && echo "TXT mime type added" || exit 1
grep -q "application/json" agent-os-ui/ui/src/utils/image-upload.utils.ts && echo "JSON mime type added" || exit 1
grep -q "text/markdown" agent-os-ui/ui/src/utils/image-upload.utils.ts && echo "MD mime type added" || exit 1
cd agent-os-ui/ui && npx tsc --noEmit && echo "Frontend TypeScript compiles" || exit 1
```

**Story ist DONE wenn:**
1. Alle FILE_EXISTS/CONTAINS checks bestanden
2. Alle *_PASS commands exit 0
3. Git diff zeigt nur erwartete Aenderungen
