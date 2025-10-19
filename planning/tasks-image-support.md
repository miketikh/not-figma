# Image Support - Implementation Task List

## Context

This implementation adds comprehensive image upload and manipulation support to Not-Figma's collaborative design canvas. Images will be treated as first-class canvas objects (ImageObject), following the established shape factory pattern used for rectangles, circles, lines, and text. Users can upload images via drag-and-drop or URL import, with images stored in Firebase Storage and metadata synced through Firestore.

The implementation integrates seamlessly with existing systems: the collaborative locking system prevents edit conflicts, images support all standard transformations (position, size, rotation, opacity), and real-time sync ensures all collaborators see changes instantly. Images are rendered on the Konva canvas using HTMLImageElement, with aspect ratio locked by default to prevent distortion.

Security is enforced through client-side and server-side validation (5MB limit, approved file types), Firebase Storage security rules, and URL sanitization to prevent XSS attacks. The implementation follows the existing safe wrapper pattern for Firebase operations to prevent undefined value errors.

---

## Instructions for AI Agent

### Workflow for Each PR

1. **Read the entire PR first**: Review all tasks and file changes before starting
2. **Complete all tasks sequentially**:
   - Work through tasks in order
   - Mark completed tasks with `[x]`
   - If a task references "see PRD," check `/Users/Gauntlet/gauntlet/not-figma/planning/prd-image-support.md` for context
3. **Run linting**: Execute `npm run lint` after completing all tasks
4. **Test manually**: Verify the changes work as expected (see "What to Test" in each PR)
5. **Provide completion summary** with:
   - Brief description of changes made
   - Specific instructions for manual testing (what to click, what to look for)
   - Any known limitations or follow-up items
   - Preview of next PR's scope
6. **Wait for approval**: Do not proceed to the next PR until confirmed by user

### Implementation Guidelines

- **Follow existing patterns**: Use the shape factory pattern from `app/canvas/_lib/shapes.ts` as a reference
- **Use safe Firebase wrappers**: Always use `safeSetDoc`, `safeUpdateDoc`, `safeSet`, `safeUpdate` from `lib/firebase/firestore.ts` and `lib/firebase/realtime-utils.ts`
- **File descriptions are hints**: "Files Changed" lists likely files, but you may need to modify others
- **Don't over-engineer**: Implement the simplest solution that works
- **Test incrementally**: After each major task, verify it works before moving on
- **Ask if blocked**: If requirements are unclear or you encounter unexpected issues, ask before proceeding

---

## Phase 1: Setup & Foundation

**Goal:** Establish Firebase Storage integration, create ImageObject type system, and set up security rules. This phase provides the foundation for all subsequent image functionality.

### PR #1: Firebase Storage Setup and Configuration

**Goal:** Initialize Firebase Storage SDK, test upload functionality, and verify CORS configuration works correctly.

**Tasks:**

- [x] Add Firebase Storage imports to `lib/firebase/config.ts` (getStorage from firebase/storage)
- [x] Initialize Firebase Storage instance using the existing Firebase app
- [x] Export storage instance for use across the application
- [x] Create test upload function to verify Storage is working (can be temporary)
- [ ] Test upload in browser console to confirm download URL is accessible
- [x] Document CORS configuration if needed (Firebase Storage auto-configures CORS for web)
- [ ] Verify download URLs are accessible without authentication errors

**What to Test:**

- Open browser console in dev environment
- Run a test upload using the storage instance
- Verify no CORS errors in console
- Confirm download URL returned is accessible
- Check Firebase Console > Storage to see uploaded test file

**Files Changed:**

- `lib/firebase/config.ts` - Add Storage SDK initialization and export storage instance

**Notes:**

- Firebase Storage auto-configures CORS for web apps using the same domain
- The PRD emphasizes this task MUST be completed first before any other work
- Keep the test upload code temporarily - we'll remove it in Phase 4 cleanup

---

### PR #2: ImageObject Type System

**Goal:** Define TypeScript interfaces for ImageObject and PersistedImage, integrating them into the existing type system.

**Tasks:**

- [x] Add `ImageObject` interface to `types/canvas.ts` extending `BaseCanvasObject`
- [x] Add `"image"` to the `type` union in `BaseCanvasObject` type definition
- [x] Include image-specific fields: `imageUrl`, `originalWidth`, `originalHeight`, `fileName?`, `fileSize?`
- [x] Update `CanvasObject` union type to include `ImageObject`
- [x] Add `PersistedImage` interface to `app/canvas/_types/shapes.ts` for local representation
- [x] Update `PersistedShape` union type to include `PersistedImage`
- [x] Verify TypeScript compiles without errors

**What to Test:**

- Run `npm run build` to verify TypeScript compilation succeeds
- Check that there are no type errors in the editor
- Verify the union types include ImageObject/PersistedImage

**Files Changed:**

- `types/canvas.ts` - Add ImageObject interface and update CanvasObject union
- `app/canvas/_types/shapes.ts` - Add PersistedImage interface and update PersistedShape union

**Notes:**

- Follow the exact interface structure from the PRD (Section 3.2)
- originalWidth and originalHeight store the natural dimensions for aspect ratio calculation
- fileName and fileSize are optional metadata fields

---

### PR #3: Image Validation Module

**Goal:** Create client-side validation utilities for file type, size, and dimensions with clear error messages.

**Tasks:**

- [x] Create `lib/firebase/storage-validation.ts` file
- [x] Define constants: `MAX_FILE_SIZE` (5MB in bytes), `MAX_DIMENSIONS` (4096x4096), `ALLOWED_MIME_TYPES` array
- [x] Implement `validateImageFile(file: File)` function that checks type and size
- [x] Return validation result object: `{ valid: boolean; error?: string }`
- [x] Implement error message generators for each failure type (see PRD Section 2.1, FR-5)
- [x] Add `getImageDimensions(file: File)` helper that loads image and returns naturalWidth/naturalHeight
- [x] Add dimension validation check (max 4096x4096)
- [x] Create `sanitizeImageURL(url: string)` function for URL validation
- [x] Validate URL scheme is http/https only (block file://, javascript://, data://)
- [x] Block localhost and private IPs (127.0.0.1, 10.x.x.x, 192.168.x.x)

**What to Test:**

- Create test cases with console.log:
  - Valid PNG under 5MB - should pass
  - PDF file - should fail with "Unsupported format" message
  - 10MB image - should fail with size error showing actual size
  - URL with javascript: scheme - should fail with XSS prevention message
  - Valid https URL - should pass

**Files Changed:**

- `lib/firebase/storage-validation.ts` - NEW: Validation utilities and constants

**Notes:**

- Use `file.type` to check MIME type, fallback to file extension if MIME missing
- Validation messages should be user-friendly, not technical
- The dimension check requires loading the image into HTMLImageElement first
- URL validation prevents XSS attacks per PRD Section 5.2

---

### PR #4: Firebase Storage Security Rules

**Goal:** Deploy Firebase Storage security rules to enforce file type and size constraints server-side.

**Tasks:**

- [x] Create `storage.rules` file in project root
- [x] Define rules for `images/{canvasId}/{imageId}` path pattern
- [x] Add read rule: allow authenticated users to read images
- [x] Add write rule: enforce authenticated user, 5MB size limit, and approved content types
- [x] Use regex to match allowed content types: `image/(png|jpeg|jpg|webp|gif|svg\\+xml)`
- [x] Add delete rule: allow authenticated users to delete images
- [x] Document deployment instructions in comments (firebase deploy --only storage)
- [x] Test rules in Firebase Console Rules Playground

**What to Test:**

- Deploy rules: `firebase deploy --only storage` (if Firebase CLI is set up)
- Alternatively, copy rules to Firebase Console > Storage > Rules tab
- In Firebase Console > Storage Rules Playground:
  - Test read as authenticated user - should allow
  - Test write with 3MB PNG - should allow
  - Test write with 10MB file - should deny
  - Test write with PDF file - should deny

**Files Changed:**

- `storage.rules` - NEW: Firebase Storage security rules

**Notes:**

- These rules are the last line of defense against invalid uploads
- Cannot be bypassed by malicious clients
- Deployment requires Firebase CLI or manual copy/paste in Console
- Rules use `request.resource.size` and `request.resource.contentType` for validation

---

## Phase 2: Upload Features

**Goal:** Implement core upload functionality including drag-and-drop, URL import, and Firebase Storage operations.

### PR #5: Firebase Storage Upload Functions

**Goal:** Create utility functions for uploading, deleting, and managing images in Firebase Storage.

**Tasks:**

- [x] Create `lib/firebase/storage.ts` file
- [x] Import storage instance from `lib/firebase/config.ts`
- [x] Import necessary Firebase Storage functions: `ref`, `uploadBytes`, `getDownloadURL`, `deleteObject`
- [x] Implement `uploadImage(file: File, canvasId: string, imageId: string): Promise<string>` function
  - [x] Create storage reference: `images/{canvasId}/{imageId}.{extension}`
  - [x] Extract file extension from file.name
  - [x] Upload file using `uploadBytes()`
  - [x] Return download URL from `getDownloadURL()`
  - [x] Add error handling with try/catch
- [x] Implement `deleteImage(canvasId: string, imageId: string, extension: string): Promise<void>` function
  - [x] Create storage reference to exact file path
  - [x] Call `deleteObject()` to remove file
  - [x] Handle errors gracefully (ignore if file doesn't exist)
- [x] Implement `uploadImageFromURL(url: string, canvasId: string, imageId: string): Promise<string>` function
  - [x] Fetch image from URL using native fetch
  - [x] Convert response to Blob
  - [x] Extract content-type from response headers
  - [x] Determine file extension from content-type
  - [x] Upload blob using `uploadBytes()` and return download URL
  - [x] Add 10 second timeout using AbortController
  - [x] Handle CORS errors with clear error message

**What to Test:**

- Test in browser console (temporary):
  - Import uploadImage function
  - Upload a small test image file
  - Verify download URL is returned
  - Open URL in browser to confirm image loads
  - Check Firebase Console > Storage to see uploaded file

**Files Changed:**

- `lib/firebase/storage.ts` - NEW: Storage upload/delete operations

**Notes:**

- File path structure: `images/{canvasId}/{imageId}.{ext}` per PRD Section 3.3
- Download URLs are authenticated and CDN-backed by Firebase
- Use the same error handling pattern as existing Firebase operations
- uploadImageFromURL will need a server-side proxy for CORS (can be simplified for MVP to fail gracefully on CORS)

---

### PR #6: Image Loading Utilities

**Goal:** Create utilities for loading HTMLImageElement from URLs, extracting dimensions, and caching loaded images.

**Tasks:**

- [x] Create `app/canvas/_lib/image-utils.ts` file
- [x] Implement `loadImageFromURL(url: string): Promise<HTMLImageElement>` function
  - [x] Create new HTMLImageElement
  - [x] Return promise that resolves when image loads, rejects on error
  - [x] Set crossOrigin = "anonymous" to handle CORS
  - [x] Attach onload and onerror handlers
  - [x] Set src to trigger load
- [x] Implement `getImageDimensions(file: File): Promise<{ width: number; height: number }>` function
  - [x] Create object URL from File using `URL.createObjectURL()`
  - [x] Load image using loadImageFromURL
  - [x] Extract naturalWidth and naturalHeight
  - [x] Clean up object URL with `URL.revokeObjectURL()`
  - [x] Return dimensions
- [x] Implement `scaleImageToFit(width: number, height: number, maxWidth: number, maxHeight: number)` function
  - [x] Calculate aspect ratio
  - [x] Scale down if either dimension exceeds max
  - [x] Maintain aspect ratio during scaling
  - [x] Return new dimensions: `{ width: number; height: number; scaled: boolean }`
- [x] Create simple LRU cache for loaded images (Map with max 100 entries)
  - [x] Cache key is imageUrl
  - [x] Cache value is HTMLImageElement
  - [x] Evict oldest when cache exceeds size
- [x] Update loadImageFromURL to check cache first before loading

**What to Test:**

- Test loadImageFromURL with a known image URL (e.g., Firebase Storage test image)
- Verify dimensions are extracted correctly
- Test scaleImageToFit with various aspect ratios:
  - 1920x1080 → max 500x500 → should scale to 500x281
  - 1000x2000 → max 500x500 → should scale to 250x500
- Verify cache prevents redundant loads (check Network tab)

**Files Changed:**

- `app/canvas/_lib/image-utils.ts` - NEW: Image loading and caching utilities

**Notes:**

- HTMLImageElement loading is async - must use promises
- crossOrigin attribute is essential for Konva rendering (CORS)
- scaleImageToFit is used for initial placement and dimension limit enforcement
- LRU cache prevents re-downloading images when user switches between canvases

---

### PR #7: Drag-and-Drop Upload Implementation

**Goal:** Enable users to drag image files from desktop onto canvas, validate them, upload to Firebase Storage, and create ImageObject.

**Tasks:**

- [x] Add state to Canvas component: `isDraggingFile: boolean` and `uploadingImages: Set<string>` (track uploading imageIds)
- [x] Add drag event handlers to Canvas component:
  - [x] `onDragOver(e)` - prevent default, set isDraggingFile to true
  - [x] `onDragLeave(e)` - set isDraggingFile to false
  - [x] `onDrop(e)` - prevent default, handle file drop
- [x] In onDrop handler:
  - [x] Extract files from `e.dataTransfer.files`
  - [x] Filter for valid image files using validateImageFile
  - [x] For each valid file:
    - [x] Generate imageId using generateObjectId
    - [x] Get image dimensions using getImageDimensions
    - [x] Calculate drop location from mouse position (account for viewport pan/zoom)
    - [x] Add imageId to uploadingImages set
    - [x] Upload file to Firebase Storage using uploadImage
    - [x] Create ImageObject with download URL and metadata
    - [x] Save to Firestore using existing createObject function
    - [x] Remove imageId from uploadingImages set
    - [x] Show success toast
  - [x] For invalid files, show error toast with specific validation message
  - [x] Handle upload errors with error toast and cleanup
- [x] Create drop zone overlay component (show when isDraggingFile is true)
  - [x] Full-canvas overlay with semi-transparent background
  - [x] Dashed blue border and "Drop image here" text
  - [x] Upload icon from lucide-react
- [x] Render drop zone overlay in Canvas component
- [x] Add loading spinner at drop location for images in uploadingImages set (state tracked, will render in PR #10)

**What to Test:**

- Drag a PNG file from desktop onto canvas
- Verify drop zone overlay appears while dragging
- Drop file and confirm:
  - Upload spinner appears briefly
  - Success toast shows
  - Image appears on canvas (may show loading state initially)
- Drag a PDF file and verify error toast with clear message
- Drag a 10MB image and verify file size error
- Drag multiple images at once and verify all upload

**Files Changed:**

- `app/canvas/_components/Canvas.tsx` - Add drag/drop handlers, state, and drop zone overlay
- `app/canvas/_components/Canvas.tsx` - Add upload logic and error handling

**Notes:**

- Calculate drop position using: `(clientX - viewportX) / zoom` for x, same for y
- Use existing toast system for feedback (check for existing toast component)
- Multiple files dropped should cascade diagonally (offset each by 50px x/y) per PRD Q4
- Spinner component likely exists in components/ui or can use lucide-react Loader2

---

### PR #8: URL Import Dialog and Implementation

**Goal:** Create dialog for importing images from URLs with validation, loading states, and error handling.

**Tasks:**

- [x] Create `app/canvas/_components/ImageUploadDialog.tsx` component
- [x] Use Radix UI Dialog (already in dependencies) for modal
- [x] Create dialog structure:
  - [x] Header with "Import Image from URL" title and close button
  - [x] Text input field with placeholder "https://example.com/image.jpg"
  - [x] Real-time URL validation on input change
  - [x] Error message display below input (red text)
  - [x] Success indicator (green checkmark) when URL valid
  - [x] Cancel button (secondary) and Import button (primary)
  - [x] Import button disabled until URL is valid
- [x] Implement URL validation:
  - [x] Use sanitizeImageURL from storage-validation.ts
  - [x] Show error if invalid URL format
  - [x] Show error if blocked scheme (javascript:, file:, data:)
- [x] Implement import handler:
  - [x] Show loading spinner on Import button
  - [x] Call uploadImageFromURL with URL, canvasId, and new imageId
  - [x] Get download URL and image dimensions
  - [x] Create ImageObject at canvas center (viewport center)
  - [x] Scale to fit if dimensions exceed 4096x4096 or canvas size
  - [x] Save to Firestore
  - [x] Close dialog and show success toast
  - [x] Handle errors (CORS, timeout, invalid image) with clear messages
- [x] Add prop: `open: boolean` and `onOpenChange: (open: boolean) => void` for controlled state
- [x] Export dialog component

**What to Test:**

- Open dialog (will wire up to toolbar in next PR)
- Enter invalid URL "not-a-url" → verify error message shows
- Enter javascript:alert('xss') → verify blocked with XSS error
- Enter valid image URL (e.g., https://picsum.photos/800/600)
- Click Import
- Verify:
  - Loading spinner appears
  - Dialog closes after successful import
  - Image appears at canvas center
  - Success toast shows

**Files Changed:**

- `app/canvas/_components/ImageUploadDialog.tsx` - NEW: URL import modal component

**Notes:**

- Use existing Button, Input, Label components from components/ui
- Radix Dialog docs: https://www.radix-ui.com/primitives/docs/components/dialog
- For canvas center position: `(canvasWidth / 2 - imageWidth / 2)` accounting for viewport
- CORS errors are common - show helpful message suggesting downloadable/direct URLs

---

## Phase 3: Rendering & Integration

**Goal:** Render images on canvas using Konva, integrate with shape factory pattern, and add properties panel support.

### PR #9: Image Shape Factory

**Goal:** Implement imageFactory following ShapeFactory interface for consistency with existing shape types.

**Tasks:**

- [x] Add `imageFactory` to `app/canvas/_lib/shapes.ts`
- [x] Implement `createDefault(bounds, overrides, canvasId)` method:
  - [x] Return PersistedImage with required fields
  - [x] Use bounds for x, y, width, height (initial placement)
  - [x] Include imageUrl, originalWidth, originalHeight from overrides
  - [x] Set default opacity: 1, rotation: 0, zIndex: 0
  - [x] Initialize lock fields: lockedBy: null, lockedAt: null, lockTimeout: LOCK_TIMEOUT_MS
  - [x] Apply any additional overrides
- [x] Implement `createFromDraft(draft)` method (not really used for images, but required):
  - [x] Just call createDefault with draft bounds
- [x] Implement `toFirestore(image, userId, canvasId)` method:
  - [x] Convert PersistedImage to ImageObject
  - [x] Set timestamps: createdBy, createdAt, updatedBy, updatedAt
  - [x] Map opacity to fillOpacity and strokeOpacity
  - [x] Set strokeStyle: "solid" (not really used for images)
  - [x] Set locked: false, visible: true
  - [x] Include all image-specific fields: imageUrl, originalWidth, originalHeight, fileName, fileSize
- [x] Implement `fromFirestore(obj)` method:
  - [x] Check if obj.type === "image", return null if not
  - [x] Cast to ImageObject
  - [x] Convert to PersistedImage
  - [x] Use sanitizeNumber for all numeric values (from existing utilities)
  - [x] Handle optional fields: fileName, fileSize
- [x] Implement `validateSize(image)` method:
  - [x] Return true if width >= 5 and height >= 5
- [x] Implement `normalizeDrawing(start, current)` method:
  - [x] Not really used for images (not drag-to-draw), but return bounds from start point
- [x] Implement `getDraftData(draft, styleOverrides)` method:
  - [x] Return null (images don't show draft preview during upload)
- [x] Register imageFactory in shapeFactories registry: `shapeFactories.image = imageFactory`

**What to Test:**

- Run TypeScript compiler to verify factory implements ShapeFactory interface
- Create test ImageObject in console using imageFactory.createDefault
- Convert to Firestore using toFirestore, verify all fields present
- Convert back using fromFirestore, verify data integrity

**Files Changed:**

- `app/canvas/_lib/shapes.ts` - Add imageFactory implementation and register in shapeFactories

**Notes:**

- Follow the exact same pattern as rectangleFactory and circleFactory
- Images don't have fill/stroke properties in the UI, but ImageObject includes them for consistency
- sanitizeNumber prevents NaN and invalid values from breaking the UI
- originalWidth/originalHeight are essential for aspect ratio locking

---

### PR #10: Konva Image Shape Component

**Goal:** Create ImageShape component to render images on Konva canvas with loading states, transforms, and aspect ratio locking.

**Tasks:**

- [x] Create `app/canvas/_components/shapes/ImageShape.tsx` component
- [x] Accept props: `image: PersistedImage`, `isSelected: boolean`, `onSelect: () => void`, `onTransform: (updates) => void`
- [x] Add state: `htmlImage: HTMLImageElement | null`, `isLoading: boolean`, `hasError: boolean`
- [x] Use useEffect to load image on mount:
  - [x] Call loadImageFromURL with image.imageUrl (uses cache)
  - [x] Set isLoading: true initially
  - [x] On success: set htmlImage and isLoading: false
  - [x] On error: set hasError: true and isLoading: false
- [x] Render Konva.Group as container
- [x] If isLoading: render Konva.Rect with dashed border and Konva.Text "Loading..."
- [x] If hasError: render Konva.Rect with red border and Konva.Text "Image failed to load"
- [x] If loaded: render Konva.Image with htmlImage as image prop
- [x] Add Konva.Transformer when isSelected is true
  - [x] Enable rotation
  - [x] Enable resize with aspect ratio locked by default
  - [x] Detect Shift key to unlock aspect ratio (listen to keydown/keyup events)
  - [x] Update keepRatio prop based on Shift key state
- [x] Implement transform handlers:
  - [x] onDragEnd: call onTransform with new x, y
  - [x] onTransformEnd: call onTransform with new x, y, width, height, rotation
  - [x] Apply viewport scaling to transform values
- [x] Show lock badge if image.lockedBy is not null and not current user
  - [x] Render Konva.Label with locked user's name/initials
  - [x] Position at top-right corner of image
- [x] Set opacity from image.opacity prop

**What to Test:**

- Will test in next PR when integrated into Canvas
- For now, verify TypeScript compilation succeeds

**Files Changed:**

- `app/canvas/_components/shapes/ImageShape.tsx` - NEW: Konva image rendering component

**Notes:**

- Konva.Image requires HTMLImageElement, not URL - that's why we load it first
- keepRatio prop on Transformer controls aspect ratio locking
- Loading placeholder should match image dimensions for smooth transition
- Lock badge pattern exists in other shape components (e.g., RectangleShape.tsx)
- Use react-konva hooks like useStrictMode(true) if needed

---

### PR #11: Integrate ImageShape into Canvas Renderer

**Goal:** Update shape rendering system to recognize and render image type objects.

**Tasks:**

- [x] Open `app/canvas/_components/shapes/index.tsx` (shape renderer)
- [x] Import ImageShape component
- [x] Add case for `"image"` type in the shape rendering logic
- [x] Pass required props to ImageShape:
  - [x] `image`: the PersistedImage object from fromFirestore conversion
  - [x] `isSelected`: check if image.id is in selectedIds
  - [x] `onSelect`: handler to select the image
  - [x] `onTransform`: handler to update image position/size/rotation
- [x] Ensure z-index ordering works correctly with images
  - [x] Images should respect zIndex property in layering
- [x] Verify shape renderer handles null return from fromFirestore (in case of invalid data)

**What to Test:**

- Upload an image using drag-and-drop (from PR #7)
- Verify image appears on canvas after upload completes
- Click to select image - verify selection handles appear
- Drag image to move it - verify position updates
- Resize image by dragging corner handle - verify aspect ratio locked
- Hold Shift and resize - verify aspect ratio unlocks
- Rotate image - verify rotation works smoothly
- Open second browser window, verify image syncs in real-time
- Select image in window 1, verify lock appears in window 2

**Files Changed:**

- `app/canvas/_components/shapes/index.tsx` - Add image type case and render ImageShape

**Notes:**

- Follow the same pattern used for rectangle, circle, line, text rendering
- The onTransform handler should call updateObject with the image's ID
- Check if useObjects hook properly converts ImageObject via imageFactory.fromFirestore

---

### PR #12: Properties Panel Integration

**Goal:** Add image-specific properties to the properties panel when an image is selected.

**Tasks:**

- [x] Open `app/canvas/_components/PropertiesPanel.tsx`
- [x] Add conditional section for when `selectedObject.type === "image"`
- [x] Create image properties section with subsections:
  - [x] **File Info Section:**
    - [x] Display file name (read-only text) if fileName exists
    - [x] Display original dimensions as "1920 x 1080" (read-only text) using originalWidth x originalHeight
    - [x] Display file size in MB if fileSize exists (convert bytes to MB)
  - [x] **Transform Section:**
    - [x] X position number input (editable) - handled by UniversalProperties
    - [x] Y position number input (editable) - handled by UniversalProperties
    - [x] Width number input (editable)
    - [x] Height number input (editable)
    - [x] Link icon button between width/height to toggle aspect ratio lock
    - [x] Rotation slider (0-360 degrees) - handled by UniversalProperties
  - [x] **Appearance Section:**
    - [x] Opacity slider (0-100%, maps to 0-1 internally) - handled by StyleProperties
  - [x] **Layer Section:**
    - [x] Z-index controls (bring forward, send backward buttons) - handled by UniversalProperties
  - [x] **Actions Section:**
    - [ ] Replace image button (primary) - opens ImageUploadDialog (deferred to Phase 4)
    - [x] Delete button (destructive) - removes image from canvas and storage
- [x] Wire up inputs to update image properties:
  - [x] Width/height changes respect aspect ratio lock toggle
  - [x] When locked, changing width auto-updates height proportionally
  - [x] When unlocked, width and height independent
  - [x] All changes call updateObject to sync to Firestore
- [ ] Implement Replace image handler:
  - [ ] Opens ImageUploadDialog (can accept file picker or URL) (deferred to Phase 4)
  - [ ] On successful replacement, update imageUrl while preserving position/size (deferred to Phase 4)
- [x] Implement Delete handler:
  - [x] Delete ImageObject from Firestore
  - [x] Call deleteImage from storage.ts to remove file from Storage
  - [x] Show confirmation dialog before deleting

**What to Test:**

- Select an uploaded image
- Verify properties panel shows image section
- Check file name displays correctly
- Verify original dimensions show (e.g., "1920 x 1080")
- Edit X position input, verify image moves immediately
- Edit width with aspect lock ON, verify height updates proportionally
- Click aspect lock toggle to unlock
- Edit width again, verify height stays fixed
- Adjust opacity slider, verify image fades
- Change rotation, verify image rotates
- Click bring forward, verify z-index increases
- Click Replace image, upload new image, verify old image replaced
- Click Delete, confirm, verify image removed from canvas and Storage

**Files Changed:**

- `app/canvas/_components/PropertiesPanel.tsx` - Add image-specific properties section

**Notes:**

- Aspect ratio calculation: newHeight = (newWidth / originalWidth) * originalHeight
- Use existing Input, Slider, Button components from components/ui
- Link icon from lucide-react: Link (locked) or Unlink (unlocked)
- File size display: (fileSize / 1024 / 1024).toFixed(2) + " MB"
- Confirmation dialog can use existing Dialog component or window.confirm for MVP

---

## Phase 4: Polish & Testing

**Goal:** Finalize UX with toolbar integration, loading states, error handling, and comprehensive testing.

### PR #13: Toolbar Integration

**Goal:** Add "Upload Image" button to toolbar for easy access to URL import.

**Tasks:**

- [x] Open `app/canvas/_components/Toolbar.tsx`
- [x] Import ImagePlus icon from lucide-react
- [x] Add "Upload Image" button to toolbar
- [x] Button opens ImageUploadDialog when clicked
- [x] Add state to manage dialog open/close
- [x] Position button near other shape tools (rectangle, circle, line, text)
- [x] Add tooltip: "Upload Image (I)" if keyboard shortcut desired
- [x] Optionally add keyboard shortcut "I" for image upload (follow existing pattern)

**What to Test:**

- Click "Upload Image" button in toolbar
- Verify ImageUploadDialog opens
- Import image via URL
- Verify dialog closes and image appears
- Press "I" key (if shortcut added) and verify dialog opens
- Verify button styling matches other toolbar buttons

**Files Changed:**

- `app/canvas/_components/Toolbar.tsx` - Add upload image button and dialog trigger

**Notes:**

- Check existing toolbar buttons for styling/layout patterns
- Keyboard shortcuts managed in Canvas component or dedicated hook
- ImageUploadDialog should be imported and rendered at Canvas level, controlled by state

---

### PR #14: Loading States and Error Handling

**Goal:** Add comprehensive loading states, error feedback, and retry mechanisms for improved UX.

**Tasks:**

- [x] Add upload progress indicators:
  - [x] Show spinner at drop location during Firebase Storage upload (already partially done in PR #7)
  - [x] Ensure spinner persists until image fully loaded in Konva
  - [x] Style spinner with white background circle for visibility
- [x] Enhance ImageShape loading state:
  - [x] Loading placeholder shows image outline with background fill
  - [x] Use emoji icon (🖼️) for better cross-platform support instead of lucide-react
  - [x] Placeholder dimensions match final image size
- [x] Enhance ImageShape error state:
  - [x] Show warning emoji (⚠️) for better cross-platform support
  - [x] Red border around failed image rectangle with light red background
  - [x] Message: "Failed to load image. Click to retry or delete."
  - [x] Click handler triggers retry mechanism
- [x] Implement retry mechanism:
  - [x] Retry button attempts to reload image from imageUrl
  - [x] If retry succeeds, render image normally
  - [x] If retry fails, show error state again
- [x] Add toast notifications:
  - [x] Success: "Image uploaded successfully" (green, 3 seconds)
  - [x] Success: "Image imported from URL" (green, 3 seconds)
  - [x] Error: Specific message per failure type (red, 5 seconds)
  - [x] Use existing toast system (already implemented)
- [x] Add error handling for all failure modes:
  - [x] Invalid file type - show user-friendly message
  - [x] File too large - include actual size in message
  - [x] Upload failed - generic network error message
  - [x] Image load failed - suggest retry
  - [x] CORS error - explain cross-origin issue with enhanced detection
  - [x] Network timeout - suggest checking URL

**What to Test:**

- Upload image and observe spinner appears during upload
- Upload very large image (>5MB) and verify error toast with size
- Upload PDF file and verify "Unsupported format" toast
- Drop image in poor network conditions, verify upload error handling
- Import image from invalid URL, verify error message
- Import image from CORS-blocked URL, verify CORS-specific error
- Manually break image URL in Firestore, verify broken image state appears
- Click broken image, select Retry, verify reload attempt
- Click broken image, select Delete, verify image removed

**Files Changed:**

- `app/canvas/_components/Canvas.tsx` - Enhance upload error handling and toast notifications
- `app/canvas/_components/shapes/ImageShape.tsx` - Improve loading/error states and retry logic
- `app/canvas/_components/ImageUploadDialog.tsx` - Add error toasts for URL import failures

**Notes:**

- Toast component might exist in components/ui, or use react-hot-toast library
- If toast library missing, create simple Toast component with Radix UI
- All error messages from PRD Section 2.1 FR-12
- Broken image icon and retry UI improve user experience significantly

---

### PR #15: Aspect Ratio Locking Enhancement

**Goal:** Refine aspect ratio locking behavior for intuitive resizing experience.

**Tasks:**

- [x] Verify ImageShape respects aspect ratio lock by default
- [x] Implement Shift key detection in Canvas.tsx:
  - [x] Shift key detection already exists (shiftPressed state)
  - [x] Update Transformer keepRatio prop dynamically based on Shift state and aspectRatioLocked
  - [x] Shift key inverts the lock state: locked becomes unlocked, unlocked becomes locked
- [x] Add aspect ratio lock toggle in PropertiesPanel:
  - [x] Button control: "Lock aspect ratio" (locked by default) with Link/Unlink icons
  - [x] Store lock state in image metadata (add aspectRatioLocked field to PersistedImage)
  - [x] When unchecked, allow free resize without Shift key
  - [x] When checked, require Shift to unlock temporarily
- [x] Add visual indicator when aspect ratio lock state changes:
  - [x] Show tooltip overlay text during transform when Shift is pressed
  - [x] Displays "Aspect ratio unlocked" or "Aspect ratio locked" based on state
  - [x] Positioned at top center, dark background with white text
- [x] Update imageFactory to include aspectRatioLocked field (default true)

**What to Test:**

- Select image and resize corner handle - verify proportional scaling
- Hold Shift and resize - verify aspect ratio unlocks, can stretch freely
- Release Shift - verify returns to locked mode
- Uncheck "Lock aspect ratio" in properties panel
- Resize without Shift - verify free distortion allowed
- Re-check lock toggle - verify proportional scaling restored
- Verify lock state persists after deselection and reselection

**Files Changed:**

- `app/canvas/_components/shapes/ImageShape.tsx` - Add Shift key detection and visual feedback
- `app/canvas/_components/PropertiesPanel.tsx` - Add aspect ratio lock toggle
- `app/canvas/_types/shapes.ts` - Add aspectRatioLocked? field to PersistedImage
- `types/canvas.ts` - Add aspectRatioLocked? field to ImageObject
- `app/canvas/_lib/shapes.ts` - Update imageFactory to handle aspectRatioLocked

**Notes:**

- Shift key detection: window.addEventListener('keydown/keyup') in useEffect
- Clean up event listeners in useEffect return to prevent memory leaks
- Konva Transformer keepRatio prop controls proportional scaling
- Visual feedback optional but improves UX per PRD Section 4.3

---

### PR #16: Comprehensive Testing and Cleanup

**Goal:** Execute full manual testing checklist, fix bugs, and clean up code for production.

**Tasks:**

- [x] Run complete manual testing checklist from PRD Section 6.3:
  - [x] Upload testing (all file types, size limits, multiple files)
  - [x] Rendering testing (aspect ratio, opacity, rotation, loading states)
  - [x] Transform testing (drag, resize, rotate, properties panel)
  - [x] Collaboration testing (real-time sync, locks, multi-user uploads)
  - [x] Error handling testing (upload failures, load failures, network issues)
  - [x] Performance testing (20+ images, 60 FPS maintained)
  - [x] Browser compatibility (Chrome, Firefox, Safari, Edge)
- [x] Fix all critical bugs discovered during testing
- [x] Code cleanup:
  - [x] Remove test upload code from PR #1
  - [x] Remove all console.log statements used for debugging
  - [x] Add JSDoc comments to all public functions in storage.ts and image-utils.ts
  - [x] Verify all error handling is comprehensive
  - [x] Check for any unused imports or variables
- [x] Documentation updates:
  - [x] Update CLAUDE.md to mention image support in "Working Features" section
  - [x] Add notes about imageFactory pattern
  - [x] Document Firebase Storage setup requirements
- [x] Performance validation:
  - [x] Test canvas with 20 images - verify 60 FPS
  - [x] Monitor memory usage after 50 upload/delete cycles
  - [x] Verify image cache works (check Network tab for redundant downloads)
- [x] Security validation:
  - [x] Test Firebase Storage rules block invalid uploads
  - [x] Verify URL sanitization blocks javascript: and file: schemes
  - [x] Test malicious file handling (executable disguised as image)
- [x] Run final build and lint:
  - [x] `npm run lint` - fix all errors and warnings
  - [x] `npm run build` - verify production build succeeds
  - [x] Test production build locally with `npm start`

**What to Test:**

This PR is all about testing. Work through the PRD Section 6.3 manual testing checklist systematically:

1. **Upload Testing:**
   - Drag-drop PNG, JPEG, WebP, GIF - all should work
   - Drag-drop invalid file (PDF) - should show error
   - Drag-drop >5MB file - should show size error
   - Drag-drop multiple files - all should upload
   - URL import valid URL - should work
   - URL import invalid URL - should show error
   - URL import CORS-blocked URL - should show helpful error

2. **Rendering Testing:**
   - Image appears at correct location
   - Aspect ratio maintained by default
   - Opacity slider works
   - Rotation works smoothly
   - Loading placeholder shows during download
   - Broken image icon for invalid URLs

3. **Collaboration Testing:**
   - Open two browser windows
   - Upload in window 1 - appears in window 2
   - Select in window 1 - lock badge in window 2
   - Transform in window 1 - updates in window 2
   - Lock timeout works correctly

4. **Performance Testing:**
   - Upload 20 images
   - Pan/zoom canvas - should stay smooth (60 FPS)
   - No memory leaks after many operations

**Files Changed:**

- `CLAUDE.md` - Update documentation with image support notes
- Various files - Bug fixes based on testing
- Multiple files - Remove debug code and add comments

**Notes:**

- This PR may take the longest due to comprehensive testing
- Don't rush - quality validation is critical before production
- Document any known limitations for future enhancements
- Performance benchmarks from PRD Section 6.4

---

## Summary

**Total Phases:** 4
**Total PRs:** 16
**Estimated Complexity:** High

**Key Dependencies:**

- Firebase project with Storage enabled
- Firebase Storage CORS properly configured (auto-configured for web)
- Authenticated user (existing auth system)
- Existing shape factory pattern and Firestore sync system

**Implementation Order:**

- Phase 1 (PR #1-4): Foundation - MUST complete PR #1 first per PRD
- Phase 2 (PR #5-8): Upload features - can parallelize #5-6 after #1
- Phase 3 (PR #9-12): Rendering - sequential, each builds on previous
- Phase 4 (PR #13-16): Polish - final refinements and validation

**Success Criteria:**

- Users can drag-drop images onto canvas successfully
- Images sync in real-time across collaborators
- Aspect ratio locked by default with Shift key override
- 5MB file size limit enforced client and server-side
- All validation errors show clear, user-friendly messages
- Canvas maintains 60 FPS with 20+ images
- Lock system prevents edit conflicts on images
- Properties panel provides full control over image properties

**Known Limitations (Post-MVP Enhancements):**

- No clipboard paste support (future)
- No image filters or effects (future)
- No cropping tool (future)
- No thumbnail generation (future)
- Progress percentage not shown, only spinner (acceptable for MVP)
- Animated GIFs show first frame only (Konva limitation)
