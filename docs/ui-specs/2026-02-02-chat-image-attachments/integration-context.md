# Integration Context

> **Purpose:** Cross-story context preservation for multi-session execution.
> **Auto-updated** after each story completion.
> **READ THIS** before implementing the next story.

---

## Completed Stories

| Story | Summary | Key Changes |
|-------|---------|-------------|
| CIMG-001 | Image Upload UI - Drag & Drop, File Input, Clipboard Paste | `chat-view.ts`, `theme.css` |
| CIMG-003 | Backend Image Storage Service - saveImage, getImage, HTTP routes | `image-storage.ts`, `image-upload.routes.ts`, `index.ts` |
| CIMG-004 | WebSocket Image Protocol - Full-stack image messaging | `gateway.ts`, `chat-view.ts`, `websocket.ts`, `claude-handler.ts` |
| CIMG-005 | Chat Message Image Display - Thumbnails, PDF icons, error states | `chat-message.ts`, `theme.css` |
| CIMG-006 | Image Lightbox Component - Full-screen image viewer with gallery | `aos-image-lightbox.ts`, `chat-view.ts`, `theme.css` |
| CIMG-007 | Claude Vision Integration - --image flag, multiple images, path validation | `claude-handler.ts` (streamClaudeCodeResponseWithImages with --image flags) |

---

## New Exports & APIs

### Components
<!-- New UI components created -->
- `agent-os-ui/ui/src/components/aos-image-lightbox.ts` → `<aos-image-lightbox>` - Modal overlay for viewing images in full screen
  - Listens for `open-lightbox` CustomEvent on document
  - Properties: `isOpen`, `imageSrc`, `filename`, `images[]`
  - Close via: X button, Escape key, click on overlay
  - Gallery navigation: Arrow keys, prev/next buttons (when multiple images)
  - PDFs redirected to new tab instead of lightbox

### Services
<!-- New service classes/modules -->
- `agent-os-ui/src/server/image-storage.ts` → `ImageStorageService` - Image storage service for chat images
  - `saveImage(projectPath, imageData, originalName, mimeType)` - Save image to `.agent-os/chat-images/`
  - `getImage(projectPath, imagePath)` - Get image buffer by path
  - `getImageInfo(projectPath, imagePath)` - Get image metadata
  - `deleteImage(projectPath, imagePath)` - Delete an image
  - `listImages(projectPath)` - List all images in project
  - Static: `isValidMimeType(mimeType)` - Validate MIME type
  - Static: `getMaxFileSize()` - Get max file size (5MB)
  - Static: `getStorageDir()` - Get storage directory path

### Hooks / Utilities
<!-- New hooks, helpers, utilities -->
_None yet_

### Types / Interfaces
<!-- New type definitions -->
- `agent-os-ui/ui/src/views/chat-view.ts` → `StagedImage { file: File, dataUrl: string, id: string }` - Interface for staged images
- `agent-os-ui/src/server/image-storage.ts` → `ImageInfo { path, filename, mimeType, size, createdAt }` - Stored image metadata
- `agent-os-ui/src/server/image-storage.ts` → `SaveImageResult { success, imageInfo?, error? }` - Result of save operation
- `agent-os-ui/ui/src/gateway.ts` → `ImagePayload { data, mimeType, filename, isBase64 }` - Image payload for WebSocket messages
- `agent-os-ui/src/server/claude-handler.ts` → `ChatMessageImage { path, filename, mimeType }` - Image reference in chat messages
- `agent-os-ui/src/server/claude-handler.ts` → Extended `ChatMessage` with optional `images?: ChatMessageImage[]` field
- `agent-os-ui/ui/src/components/chat-message.ts` → `MessageImage { path, mimeType, filename }` - Image attached to chat message (frontend)
- `agent-os-ui/ui/src/components/aos-image-lightbox.ts` → `LightboxImage { path, filename, mimeType }` - Image structure for lightbox gallery
- `agent-os-ui/ui/src/components/aos-image-lightbox.ts` → `LightboxOpenEvent { imagePath, images, filename, mimeType }` - Event detail for open-lightbox

---

## Integration Notes

<!-- Important integration information for subsequent stories -->
- **StagedImage interface** is exported from `chat-view.ts` - Use this interface for any components handling staged images
- **ALLOWED_MIME_TYPES** and **ALLOWED_EXTENSIONS** constants define valid file types
- **MAX_FILE_SIZE** = 5MB, **MAX_IMAGES** = 5 per message
- `stagedImages` state in `AosChatView` holds the array of staged images
- Drop zone overlay appears when `isDragOver` state is true and project is selected
- The `renderStagingArea()` method renders inline staging - CIMG-002 will extract this to a reusable component
- **ImageStorageService** is the backend service for persistent image storage
- Images are stored in `<project>/.agent-os/chat-images/` with pattern `YYYYMMDDHHMMSS-<uuid>-<name>.<ext>`
- **HTTP Routes** for image operations:
  - `POST /api/images/:projectPath/upload` - Upload image (base64 in body)
  - `GET /api/images/:projectPath/*` - Serve image file
  - `GET /api/images/:projectPath` - List all images
  - `DELETE /api/images/:projectPath/*` - Delete image
- **Security**: Path traversal prevention, MIME type validation, file size limits (5MB)
- **WebSocket Image Protocol** (CIMG-004):
  - Frontend sends `chat.send.with-images` message type with `images: ImagePayload[]`
  - `gateway.sendChatWithImages(content, images, model)` - Sends chat message with images
  - Backend `handleChatSendWithImages()` processes images and saves via ImageStorageService
  - `ClaudeHandler.handleChatSendWithImages()` passes image paths to Claude CLI with `--add-images` flag
  - Chat messages store image references in `images: ChatMessageImage[]` field
  - Error message type: `chat.send.with-images.error`
- **Chat Message Image Display** (CIMG-005):
  - `MessageImage` interface in `chat-message.ts` defines image structure for UI
  - `ChatMessageData.images` optional array holds attached images
  - `renderMessageImages()` displays thumbnails below message content
  - `renderImageThumbnail()` handles both images and PDFs (PDF shows icon + filename)
  - Click on thumbnail dispatches `open-lightbox` CustomEvent with `{ imagePath, images, filename, mimeType }`
  - Error handling: Shows "Bild nicht verfügbar" placeholder if image fails to load
  - Lazy loading enabled via `loading="lazy"` attribute
  - CSS: `.message-images` container, `.message-image-thumbnail` styles, max 150px width
- **Image Lightbox** (CIMG-006):
  - `<aos-image-lightbox>` component rendered once in `chat-view.ts`
  - Listens for `open-lightbox` CustomEvent from chat message thumbnails
  - Dark overlay (rgba(0,0,0,0.9)), image max 90vw/90vh
  - Gallery navigation with arrow keys and nav buttons
  - CSS in component using shadow DOM (Lit styles property)
  - Additional lightbox styles in theme.css for external use
- **Claude Vision Integration** (CIMG-007):
  - `streamClaudeCodeResponseWithImages()` in `claude-handler.ts` passes images to Claude CLI
  - Uses `--image <full_path>` flag for each image
  - Path validation: `existsSync(fullImagePath)` before adding to CLI args
  - Missing images send `chat.warning` message to client
  - Absolute paths constructed with `${projectPath}/${image.path}`
  - Falls back to "Describe these images." if no user message provided
  - Supports multiple images (each gets its own `--image` flag)

---

## File Change Summary

| File | Action | Story |
|------|--------|-------|
| agent-os-ui/ui/src/views/chat-view.ts | Modified | CIMG-001, CIMG-004 |
| agent-os-ui/ui/src/styles/theme.css | Modified | CIMG-001, CIMG-005 |
| agent-os-ui/src/server/image-storage.ts | Created | CIMG-003 |
| agent-os-ui/src/server/routes/image-upload.routes.ts | Created | CIMG-003 |
| agent-os-ui/src/server/index.ts | Modified | CIMG-003 |
| agent-os-ui/ui/src/gateway.ts | Modified | CIMG-004 |
| agent-os-ui/src/server/websocket.ts | Modified | CIMG-004 |
| agent-os-ui/src/server/claude-handler.ts | Modified | CIMG-004, CIMG-007 |
| agent-os-ui/ui/src/components/chat-message.ts | Modified | CIMG-005 |
| agent-os-ui/ui/src/components/aos-image-lightbox.ts | Created | CIMG-006 |
| agent-os-ui/ui/src/views/chat-view.ts | Modified | CIMG-001, CIMG-004, CIMG-006 |
| agent-os-ui/ui/src/styles/theme.css | Modified | CIMG-001, CIMG-005, CIMG-006 |
