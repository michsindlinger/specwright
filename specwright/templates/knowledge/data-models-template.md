# Data Models

> Verfügbare Datenmodelle, Schemas und Types im Projekt.
> Zuletzt aktualisiert: [DATE]

## Modelle-Übersicht

| Modell/Type | Pfad | Typ | Erstellt in Spec |
|-------------|------|-----|------------------|
| - | - | - | - |

---

## Domain Models

<!--
Für jedes Domain Model füge einen Abschnitt hinzu:

### [ModelName]

**Pfad:** `src/types/[ModelName].ts` oder `src/models/[ModelName].ts`
**Typ:** Domain Model
**Erstellt:** [SPEC_NAME] ([DATE])

**Beschreibung:** Kurze Beschreibung was das Modell repräsentiert

**Definition:**
```typescript
interface ModelName {
  id: string;
  field1: string;
  field2: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Relationships:**
- `hasMany`: RelatedModel (über field)
- `belongsTo`: ParentModel (via parentId)

**Validation Rules:**
- field1: Required, min 3 chars
- field2: Required, positive number
-->

---

## DTOs (Data Transfer Objects)

<!--
Für jedes DTO füge einen Abschnitt hinzu:

### [DTOName]

**Pfad:** `src/types/dto/[DTOName].ts`
**Typ:** DTO
**Erstellt:** [SPEC_NAME] ([DATE])

**Purpose:** Request/Response DTO für [API Endpoint]

**Definition:**
```typescript
// Request DTO
interface CreateModelRequest {
  field1: string;
  field2: number;
}

// Response DTO
interface ModelResponse {
  id: string;
  field1: string;
  field2: number;
  createdAt: string; // ISO date
}
```
-->

---

## Enums

<!--
Für jedes Enum füge einen Abschnitt hinzu:

### [EnumName]

**Pfad:** `src/types/enums/[EnumName].ts`
**Typ:** Enum
**Erstellt:** [SPEC_NAME] ([DATE])

**Definition:**
```typescript
enum Status {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}
```

**Usage:**
- In ModelX: Represents the status field
- In API: Query parameter for filtering
-->

---

## Database Schemas

<!--
Für jedes DB Schema füge einen Abschnitt hinzu:

### [TableName] Table

**Pfad:** `prisma/schema.prisma` oder `src/db/schema.ts`
**Typ:** Database Schema
**Erstellt:** [SPEC_NAME] ([DATE])

**Schema:**
```prisma
model TableName {
  id        String   @id @default(cuid())
  field1    String
  field2    Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  parent    Parent   @relation(fields: [parentId], references: [id])
  parentId  String
}
```

**Indexes:**
- `@@index([field1])` - For search queries
- `@@unique([field1, field2])` - Composite unique

**Migrations:**
- `2024-01-15_add_table_name` - Initial creation
-->

---

## Validation Schemas

<!--
Für jedes Validation Schema füge einen Abschnitt hinzu:

### [SchemaName]Schema

**Pfad:** `src/schemas/[SchemaName]Schema.ts`
**Typ:** Zod Schema
**Erstellt:** [SPEC_NAME] ([DATE])

**Definition:**
```typescript
import { z } from 'zod';

export const SchemaNameSchema = z.object({
  field1: z.string().min(3).max(100),
  field2: z.number().positive(),
  email: z.string().email(),
});

export type SchemaName = z.infer<typeof SchemaNameSchema>;
```

**Usage:**
```typescript
const result = SchemaNameSchema.safeParse(data);
if (!result.success) {
  console.error(result.error.flatten());
}
```
-->

---

*Template Version: 1.0*
