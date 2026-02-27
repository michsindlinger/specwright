# API Contracts

> Verfügbare API-Endpunkte im Projekt.
> Zuletzt aktualisiert: 2026-02-26 (Custom Team Members)

## Endpunkte-Übersicht

| Endpunkt | Methode | Beschreibung | Erstellt in Spec |
|----------|---------|--------------|------------------|
| /api/team/:projectPath/skills | GET | Liste aller Skills eines Projekts | Dev-Team Visualization (2026-02-26) |
| /api/team/:projectPath/skills/:skillId | GET | Detail-Informationen eines Skills | Dev-Team Visualization (2026-02-26) |
| /api/team/:projectPath/skills/:skillId | PUT | Skill-Inhalt (SKILL.md) aktualisieren | Custom Team Members (2026-02-26) |
| /api/team/:projectPath/skills/:skillId | DELETE | Skill-Verzeichnis löschen | Custom Team Members (2026-02-26) |

---

## Endpunkte-Details

### GET /api/team/:projectPath/skills

**Beschreibung:** Listet alle Skills eines Projekts durch Lesen des `.claude/skills/` Verzeichnisses
**Erstellt:** Dev-Team Visualization (2026-02-26)
**Route-Datei:** `ui/src/server/routes/team.routes.ts`

**Request:**
```typescript
// URL Parameter
interface Params {
  projectPath: string; // URL-encoded project path
}
```

**Response:**
```typescript
// Success Response (200)
interface SkillsListResponse {
  success: true;
  skills: SkillSummary[];
}

// Error Response (400/500)
interface SkillsListResponse {
  success: false;
  error: string;
}
```

**Status Codes:**
| Code | Beschreibung |
|------|--------------|
| 200 | Skills erfolgreich geladen |
| 400 | projectPath fehlt |
| 500 | Interner Fehler |

---

### GET /api/team/:projectPath/skills/:skillId

**Beschreibung:** Gibt Detail-Informationen zu einem einzelnen Skill zurück (inkl. SKILL.md und dos-and-donts.md Inhalt)
**Erstellt:** Dev-Team Visualization (2026-02-26)
**Route-Datei:** `ui/src/server/routes/team.routes.ts`

**Request:**
```typescript
// URL Parameter
interface Params {
  projectPath: string; // URL-encoded project path
  skillId: string;     // Skill directory name (e.g., "backend-express")
}
```

**Response:**
```typescript
// Success Response (200)
interface SkillDetailResponse {
  success: true;
  skill: SkillDetail;
}

// Error Response (400/404/500)
interface SkillDetailResponse {
  success: false;
  error: string;
}
```

**Status Codes:**
| Code | Beschreibung |
|------|--------------|
| 200 | Skill erfolgreich geladen |
| 400 | projectPath oder skillId fehlt |
| 404 | Skill nicht gefunden |
| 500 | Interner Fehler |

---

### PUT /api/team/:projectPath/skills/:skillId

**Beschreibung:** Aktualisiert den SKILL.md-Inhalt eines Skills
**Erstellt:** Custom Team Members (2026-02-26)
**Route-Datei:** `ui/src/server/routes/team.routes.ts`

**Request:**
```typescript
// URL Parameter
interface Params {
  projectPath: string; // URL-encoded project path
  skillId: string;     // Skill directory name (e.g., "backend-express")
}

// Request Body
interface RequestBody {
  content: string; // New SKILL.md content
}
```

**Response:**
```typescript
// Success Response (200)
interface SkillUpdateResponse {
  success: true;
}

// Error Response (400/500)
interface SkillUpdateResponse {
  success: false;
  error: string;
}
```

**Status Codes:**
| Code | Beschreibung |
|------|--------------|
| 200 | Skill erfolgreich aktualisiert |
| 400 | projectPath, skillId oder content fehlt |
| 500 | Interner Fehler |

---

### DELETE /api/team/:projectPath/skills/:skillId

**Beschreibung:** Löscht ein Skill-Verzeichnis und alle seine Inhalte
**Erstellt:** Custom Team Members (2026-02-26)
**Route-Datei:** `ui/src/server/routes/team.routes.ts`

**Request:**
```typescript
// URL Parameter
interface Params {
  projectPath: string; // URL-encoded project path
  skillId: string;     // Skill directory name (e.g., "backend-express")
}
```

**Response:**
```typescript
// Success Response (200)
interface SkillUpdateResponse {
  success: true;
}

// Error Response (400/500)
interface SkillUpdateResponse {
  success: false;
  error: string;
}
```

**Status Codes:**
| Code | Beschreibung |
|------|--------------|
| 200 | Skill erfolgreich gelöscht |
| 400 | projectPath oder skillId fehlt |
| 500 | Interner Fehler |

---

*Template Version: 1.0*
