# Assign Spec

Assign or un-assign a spec to OpenClaw for automated execution.

## Usage

- `/assign-spec specwright/specs/2026-02-24-my-feature/` - Assign/un-assign by spec path
- `/assign-spec 2026-02-24-my-feature` - Assign/un-assign by spec ID

ARGUMENTS: $ARGUMENTS

## Instructions

### 1. Parse Spec Path

Extract the spec identifier from ARGUMENTS:

```
IF ARGUMENTS contains "specwright/specs/":
  EXTRACT: Spec ID from path (e.g., "specwright/specs/2026-02-24-my-feature/" -> "2026-02-24-my-feature")
ELSE:
  SET: Spec ID = ARGUMENTS (treat as direct spec ID)
```

Remove any trailing slashes from the spec ID.

### 2. Validate Spec Exists

```bash
ls specwright/specs/${SPEC_ID}/kanban.json 2>/dev/null
```

IF kanban.json does NOT exist:
  OUTPUT: "Spec nicht gefunden: ${SPEC_ID}"
  STOP

### 3. Read Kanban

USE MCP TOOL: kanban_read
Input: { "specId": "${SPEC_ID}" }

IF kanban_read fails or returns no data:
  FALLBACK: Read specwright/specs/${SPEC_ID}/kanban.json directly

### 4. Check Ready Status

EXTRACT from kanban:
- boardStatus.ready (number of ready stories)
- boardStatus.total (total number of stories)
- assignedToBot.assigned (current assignment state, default: false)

DETERMINE: Is spec currently assigned?
```
currentlyAssigned = assignedToBot?.assigned ?? false
```

### 5. Toggle Assignment

IF currentlyAssigned = true:
  **Un-assign:** Set assignedToBot to { assigned: false, assignedAt: NOW, assignedBy: "cli" }

ELSE (not assigned):
  **Validate ready status first:**
  CHECK: Are ALL stories in status "ready"?
  ```
  isReady = (boardStatus.ready === boardStatus.total) AND (boardStatus.total > 0)
  ```

  IF NOT ready:
    OUTPUT error with details:
    ```
    Spec muss Status 'ready' haben.

    Aktueller Status:
    - Ready: ${boardStatus.ready}/${boardStatus.total}
    - In Progress: ${boardStatus.inProgress}
    - Done: ${boardStatus.done}
    - Blocked: ${boardStatus.blocked}

    Alle Stories muessen im Status "ready" sein, bevor die Spec assigned werden kann.
    ```
    STOP

  **Assign:** Set assignedToBot to { assigned: true, assignedAt: NOW, assignedBy: "cli" }

### 6. Write Updated kanban.json

READ: specwright/specs/${SPEC_ID}/kanban.json
UPDATE: The assignedToBot field with the new value
WRITE: specwright/specs/${SPEC_ID}/kanban.json

### 7. Output Result

IF newly assigned:
  OUTPUT: "Spec assigned to OpenClaw: ${SPEC_ID}"

IF un-assigned:
  OUTPUT: "Spec un-assigned from OpenClaw: ${SPEC_ID}"
