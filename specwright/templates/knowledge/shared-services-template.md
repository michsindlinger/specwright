# Shared Services

> Verfügbare Services, Hooks und Utilities im Projekt.
> Zuletzt aktualisiert: [DATE]

## Services-Übersicht

| Service/Hook | Pfad | Typ | Erstellt in Spec |
|--------------|------|-----|------------------|
| - | - | - | - |

---

## Services

<!--
Für jeden Service füge einen Abschnitt hinzu:

### [ServiceName]

**Pfad:** `src/services/[ServiceName].ts`
**Typ:** Service
**Erstellt:** [SPEC_NAME] ([DATE])

**Beschreibung:** Kurze Beschreibung was der Service macht

**Methoden:**
| Methode | Parameter | Return | Beschreibung |
|---------|-----------|--------|--------------|
| methodName | (param: Type) | Promise<Result> | Was die Methode macht |

**Usage Example:**
```typescript
import { ServiceName } from '@/services/[ServiceName]';

const service = new ServiceName();
const result = await service.methodName(param);
```

**Dependencies:**
- Andere Services die dieser nutzt
- Externe Pakete
-->

---

## Hooks

<!--
Für jeden Hook füge einen Abschnitt hinzu:

### use[HookName]

**Pfad:** `src/hooks/use[HookName].ts`
**Typ:** React Hook
**Erstellt:** [SPEC_NAME] ([DATE])

**Beschreibung:** Kurze Beschreibung was der Hook macht

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| param1 | string | Yes | Description |
| options | Options | No | Configuration options |

**Returns:**
```typescript
interface HookReturn {
  data: DataType | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

**Usage Example:**
```typescript
import { useHookName } from '@/hooks/useHookName';

function Component() {
  const { data, isLoading, error } = useHookName(param);

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;
  return <Display data={data} />;
}
```
-->

---

## Utilities

<!--
Für jede Utility füge einen Abschnitt hinzu:

### [utilityName]

**Pfad:** `src/utils/[utilityName].ts`
**Typ:** Utility Function
**Erstellt:** [SPEC_NAME] ([DATE])

**Beschreibung:** Kurze Beschreibung was die Utility macht

**Signature:**
```typescript
function utilityName(param1: Type1, param2?: Type2): ReturnType;
```

**Usage Example:**
```typescript
import { utilityName } from '@/utils/[utilityName]';

const result = utilityName(value1, value2);
```
-->

---

## Providers

<!--
Für jeden Provider füge einen Abschnitt hinzu:

### [ProviderName]Provider

**Pfad:** `src/providers/[ProviderName]Provider.tsx`
**Typ:** React Context Provider
**Erstellt:** [SPEC_NAME] ([DATE])

**Beschreibung:** Kurze Beschreibung was der Provider bereitstellt

**Context Value:**
```typescript
interface ContextValue {
  state: StateType;
  actions: {
    action1: () => void;
    action2: (param: Type) => void;
  };
}
```

**Usage Example:**
```typescript
// In App.tsx
import { ProviderNameProvider } from '@/providers/ProviderNameProvider';

<ProviderNameProvider>
  <App />
</ProviderNameProvider>

// In Component
import { useProviderName } from '@/providers/ProviderNameProvider';

function Component() {
  const { state, actions } = useProviderName();
}
```
-->

---

*Template Version: 1.0*
