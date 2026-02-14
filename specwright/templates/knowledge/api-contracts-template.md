# API Contracts

> Verfügbare API-Endpunkte im Projekt.
> Zuletzt aktualisiert: [DATE]

## Endpunkte-Übersicht

| Endpunkt | Methode | Beschreibung | Erstellt in Spec |
|----------|---------|--------------|------------------|
| - | - | - | - |

---

## Endpunkte-Details

<!--
Für jeden Endpunkt füge einen Abschnitt hinzu:

### [METHOD] /api/[path]

**Beschreibung:** Kurze Beschreibung was der Endpunkt macht
**Erstellt:** [SPEC_NAME] ([DATE])

**Request:**
```typescript
// Query Parameters (GET)
interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

// Request Body (POST/PUT/PATCH)
interface RequestBody {
  field1: string;
  field2: number;
}
```

**Response:**
```typescript
// Success Response (200/201)
interface SuccessResponse {
  data: {
    id: string;
    // ...
  };
  message?: string;
}

// Error Response (4xx/5xx)
interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, string>;
}
```

**Status Codes:**
| Code | Beschreibung |
|------|--------------|
| 200 | Success |
| 400 | Invalid request |
| 401 | Unauthorized |
| 404 | Not found |

**Beispiel:**
```bash
curl -X GET "http://localhost:3000/api/[path]?page=1" \
  -H "Authorization: Bearer $TOKEN"
```
-->

---

## Authentication

> Dokumentiere hier das Auth-Schema des Projekts.

<!--
Beispiel:

**Type:** JWT Bearer Token

**Header:** `Authorization: Bearer <token>`

**Token Refresh:** POST /api/auth/refresh

**Protected Routes:** Alle Routen außer /api/auth/*
-->

---

## Error Handling

> Dokumentiere hier das Error-Response-Format.

<!--
Beispiel:

Alle Fehler folgen dem Format:
```typescript
interface ApiError {
  error: string;          // Human-readable message
  code: string;           // Machine-readable code (e.g., "VALIDATION_ERROR")
  details?: {             // Optional field-level errors
    [field: string]: string;
  };
}
```

**Standard Error Codes:**
- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Permission denied
-->

---

## Rate Limiting

> Dokumentiere hier Rate-Limiting-Regeln.

<!--
Beispiel:

**Default:** 100 requests/minute per IP
**Authenticated:** 1000 requests/minute per user
**Headers:**
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
-->

---

*Template Version: 1.0*
