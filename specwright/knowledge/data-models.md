# Data Models

> Verfügbare Datenmodelle, Schemas und Types im Projekt.
> Zuletzt aktualisiert: 2026-02-26

## Modelle-Übersicht

| Modell/Type | Pfad | Typ | Erstellt in Spec |
|-------------|------|-----|------------------|
| file.protocol.ts | ui/src/shared/types/file.protocol.ts | Shared Types | File Editor (2026-02-16) |
| SkillSummary | ui/src/shared/types/team.protocol.ts | Interface | Dev-Team Visualization (2026-02-26) |
| SkillDetail | ui/src/shared/types/team.protocol.ts | Interface | Dev-Team Visualization (2026-02-26) |

---

## Domain Models

### file.protocol.ts

**Pfad:** `ui/src/shared/types/file.protocol.ts`
**Typ:** Shared Protocol Types
**Erstellt:** File Editor (2026-02-16)

**Beschreibung:** TypeScript-Interfaces für alle datei-bezogenen WebSocket-Messages zwischen Frontend und Backend.

**Message Types:**
| Message | Direction | Description |
|---------|-----------|-------------|
| files:list | Client → Server | Verzeichnisinhalt anfordern |
| files:list:response | Server → Client | Verzeichnisinhalt |
| files:list:error | Server → Client | Fehler beim Auflisten |
| files:read | Client → Server | Dateiinhalt anfordern |
| files:read:response | Server → Client | Dateiinhalt |
| files:read:error | Server → Client | Fehler beim Lesen |
| files:write | Client → Server | Dateiinhalt speichern |
| files:write:response | Server → Client | Speichererfolg |
| files:write:error | Server → Client | Fehler beim Speichern |
| files:create | Client → Server | Neue Datei erstellen |
| files:mkdir | Client → Server | Neues Verzeichnis erstellen |
| files:rename | Client → Server | Datei/Ordner umbenennen |
| files:delete | Client → Server | Datei/Ordner löschen |

**Key Interfaces:**
```typescript
interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
}

interface FileTab {
  path: string;
  filename: string;
  isModified: boolean;
}
```

---

### team.protocol.ts (SkillSummary, SkillDetail)

**Pfad:** `ui/src/shared/types/team.protocol.ts`
**Typ:** Shared Protocol Types (REST API)
**Erstellt:** Dev-Team Visualization (2026-02-26)

**Beschreibung:** TypeScript-Interfaces für die Skills/Team REST-API. Definiert den Vertrag zwischen Frontend und Backend für das Lesen von Skill-Definitionen.

**Key Interfaces:**
```typescript
interface SkillSummary {
  id: string;              // Skill directory name
  name: string;            // Display name from SKILL.md
  description: string;     // Description from frontmatter
  category: string;        // Inferred from directory name prefix
  learningsCount: number;  // Entries in dos-and-donts.md
  globs: string[];         // Glob patterns from frontmatter
  alwaysApply: boolean;    // Whether skill is always applied
}

interface SkillDetail extends SkillSummary {
  skillContent: string;        // Full SKILL.md content (raw markdown)
  dosAndDontsContent: string;  // Full dos-and-donts.md content
  subDocuments: string[];      // Other .md files in skill directory
}

interface SkillsListResponse {
  success: boolean;
  skills?: SkillSummary[];
  error?: string;
}

interface SkillDetailResponse {
  success: boolean;
  skill?: SkillDetail;
  error?: string;
}
```

---

*Template Version: 1.0*
