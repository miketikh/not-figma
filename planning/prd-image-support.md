# Product Requirements Document: Image Support

**Version:** 1.0
**Date:** 2025-10-19
**Status:** Ready for Implementation
**Feature:** Image Upload and Manipulation for Not-Figma Canvas
**Planning Document:** [add-image-support.md](./add-image-support.md)

---

## 1. Executive Summary

### 1.1 Feature Overview

Add comprehensive image support to Not-Figma's collaborative design canvas, enabling users to upload, display, and manipulate images alongside existing vector shapes. Images will be treated as first-class canvas objects (ImageObject), following the established shape factory pattern and integrating seamlessly with the existing locking, properties panel, and real-time collaboration systems.

### 1.2 Business Value

- **Feature Parity**: Matches expected functionality of design tools like Figma and Canva
- **Use Case Expansion**: Enables users to create mockups, presentations, and designs that require raster images
- **User Satisfaction**: Addresses a fundamental need for incorporating photos, logos, screenshots, and other images
- **Platform Maturity**: Demonstrates capability to handle complex binary assets in a multiplayer environment

### 1.3 Success Metrics

**Functional Success:**
- Users can upload images via drag-and-drop and URL import
- Images sync in real-time across all collaborators
- Images support all standard transformations (position, size, rotation, opacity)
- No degradation in canvas performance with up to 20 images

**Quality Metrics:**
- Image upload completes within 3 seconds for 5MB files
- Real-time sync within 500ms of upload completion
- Zero console errors during upload/render cycle
- Lock system prevents simultaneous edits on images

**User Experience:**
- Clear visual feedback during upload process
- Intuitive aspect ratio locking (locked by default, Shift to unlock)
- Helpful error messages for invalid files/URLs

---

## 2. Requirements

### 2.1 Functional Requirements

#### FR-1: Image Object Type
- **Description:** Images are `ImageObject` types extending `BaseCanvasObject`
- **Rationale:** Consistency with existing architecture, code reuse, uniform behavior
- **Acceptance Criteria:**
  - `ImageObject` interface defined in `types/canvas.ts`
  - Union type `CanvasObject` includes `ImageObject`
  - All BaseCanvasObject fields supported (locks, z-index, transforms)
  - Image-specific fields: `imageUrl`, `originalWidth`, `originalHeight`, `fileName`, `fileSize`

#### FR-2: Drag-and-Drop Upload
- **Description:** Primary upload method - users drag image files from desktop onto canvas
- **Acceptance Criteria:**
  - Canvas detects drag-over with visual feedback (drop zone indicator)
  - Supports PNG, JPEG, JPG, WebP file types
  - Validates file type and size before upload
  - Image appears at drop location with correct aspect ratio
  - Multiple images can be dropped simultaneously
  - Error handling for invalid files with clear toast messages

#### FR-3: URL Import
- **Description:** Secondary upload method - users paste image URL to import remote images
- **Acceptance Criteria:**
  - URL import dialog accessible from toolbar or properties panel
  - Input field with validation and sanitization
  - Supports http/https URLs pointing to image files
  - Handles CORS errors gracefully with user-friendly message
  - Validates URL returns valid image content type
  - Timeout after 10 seconds with error message
  - Image appears at canvas center with original dimensions (scaled if too large)

#### FR-4: Firebase Storage Integration
- **Description:** Images stored in Firebase Storage with URLs saved to Firestore
- **Acceptance Criteria:**
  - Storage path structure: `images/{canvasId}/{imageId}.{ext}`
  - Upload returns download URL (authenticated, CDN-backed)
  - URL stored in ImageObject.imageUrl field
  - File metadata preserved (original filename, file size)
  - Failed uploads clean up placeholder objects
  - Security rules restrict uploads to authenticated users

#### FR-5: Image Validation
- **Description:** Client-side and server-side validation for security and performance
- **Acceptance Criteria:**
  - File type validation: PNG, JPEG, JPG, WebP, GIF (and SVG if feasible)
  - File size limit: 5MB maximum enforced on client and server
  - Dimension limit: 4096x4096 pixels maximum (Figma standard)
  - URL sanitization prevents XSS and malicious URLs
  - Clear error messages for each validation failure type

#### FR-6: Image Factory Pattern
- **Description:** `imageFactory` following ShapeFactory interface for consistency
- **Acceptance Criteria:**
  - `createDefault()` creates ImageObject with required fields
  - `toFirestore()` converts local shape to Firestore document
  - `fromFirestore()` converts Firestore document to local shape
  - `validateSize()` ensures minimum image dimensions
  - `normalizeDrawing()` handles placement logic
  - `getDraftData()` returns null (no preview during upload)
  - Factory registered in `shapeFactories` registry

#### FR-7: Konva Image Rendering
- **Description:** Images rendered on canvas using Konva.Image component
- **Acceptance Criteria:**
  - `ImageShape.tsx` component in `app/canvas/_components/shapes/`
  - Loads HTMLImageElement from Firebase Storage URL
  - Shows loading placeholder while image downloads
  - Caches loaded images to prevent re-downloads
  - Supports all standard transforms (drag, resize, rotate)
  - Respects opacity setting
  - Shows locked-by badge when locked by another user

#### FR-8: Aspect Ratio Locking
- **Description:** Aspect ratio locked by default during resize, Shift key to unlock
- **Acceptance Criteria:**
  - Default resize maintains original aspect ratio
  - Shift key toggles aspect ratio lock during transform
  - Visual indicator when aspect ratio is unlocked (if feasible)
  - Properties panel shows lock toggle for manual control
  - Original aspect ratio stored in originalWidth/originalHeight fields

#### FR-9: Properties Panel Integration
- **Description:** Image-specific properties shown when image selected
- **Acceptance Criteria:**
  - File name displayed (read-only)
  - Original dimensions shown (e.g., "1920 x 1080", read-only)
  - Current dimensions editable with number inputs
  - Aspect ratio lock toggle checkbox
  - Opacity slider (reuses existing component)
  - Replace image button (opens file picker or URL dialog)
  - Standard properties: position (x, y), rotation, z-index

#### FR-10: Loading States
- **Description:** Visual feedback during upload and image loading
- **Acceptance Criteria:**
  - Upload progress indicator at drop location (spinner or progress bar)
  - Placeholder shown while image downloads from Firebase Storage
  - Skeleton/outline visible before image fully loaded
  - Loading state dismisses when image renders
  - Failed loads show broken image icon with retry option

#### FR-11: Real-Time Collaboration
- **Description:** Images sync across users with lock system preventing conflicts
- **Acceptance Criteria:**
  - ImageObject synced via Firestore real-time listeners
  - Lock acquired when image selected
  - Lock prevents other users from transforming image
  - Lock released on deselection or timeout
  - Lock timeout consistent with other objects (LOCK_TIMEOUT_MS)
  - Collaborators see upload notifications (optional enhancement)

#### FR-12: Error Handling
- **Description:** Comprehensive error handling for all failure modes
- **Acceptance Criteria:**
  - Invalid file type: "Unsupported format. Please use PNG, JPG, or WebP."
  - File too large: "Image must be under 5MB. Please resize and try again."
  - Upload failed: "Upload failed. Check your connection and try again."
  - Image load failed: Shows broken image icon with "Image failed to load" tooltip
  - CORS error: "Unable to load image from URL. CORS may be blocked."
  - Network timeout: "Image upload timed out. Please try again."
  - All errors logged to console for debugging

### 2.2 Non-Functional Requirements

#### NFR-1: Performance
- **Upload Speed:** Images up to 5MB upload within 3 seconds on average connection
- **Render Performance:** Canvas maintains 60 FPS with up to 20 images
- **Memory Management:** No memory leaks after uploading/deleting 50+ images
- **Load Time:** Images load within 2 seconds after Firestore sync
- **Caching:** Loaded images cached to prevent redundant downloads

#### NFR-2: Security
- **Authentication:** All uploads require authenticated Firebase user
- **File Validation:** Client and server-side validation for file type/size
- **URL Sanitization:** URL imports sanitized to prevent XSS attacks
- **Storage Rules:** Firebase Storage rules enforce type/size constraints
- **Access Control:** Users can only upload to canvases they own or have access to
- **Malicious Files:** Basic protection against executable files disguised as images

#### NFR-3: Reliability
- **Upload Resilience:** Failed uploads clean up placeholder objects
- **Retry Logic:** URL imports support retry on transient failures
- **Graceful Degradation:** Missing images show placeholder, don't break canvas
- **Data Integrity:** Firestore transactions prevent orphaned image records
- **Offline Support:** Upload queued when offline, processes when online (future)

#### NFR-4: Usability
- **Intuitive Upload:** Drag-and-drop matches user expectations from other tools
- **Clear Feedback:** Loading states and progress indicators throughout
- **Error Messages:** Non-technical, actionable error messages
- **Undo Support:** Images participate in undo/redo system (when implemented)
- **Keyboard Shortcuts:** Standard shortcuts work on images (Delete, Cmd+[/])

#### NFR-5: Scalability
- **Storage Costs:** 5MB limit and compression recommendations keep costs predictable
- **Concurrent Uploads:** System handles multiple users uploading simultaneously
- **Large Canvases:** Performance maintained with 50+ total objects including images
- **Image Cleanup:** Orphaned images cleaned up when canvas/objects deleted

### 2.3 Out of Scope (Future Enhancements)

- Clipboard paste image upload
- File picker button (drag-drop and URL are sufficient)
- Image filters/effects (grayscale, blur, brightness)
- Cropping tool
- Thumbnail generation (Cloud Function)
- Image compression/optimization
- Background removal
- Multi-image upload via file picker
- Progress percentage indicator (spinner is sufficient for MVP)
- Undo/redo for image operations (requires broader undo/redo system)

---

## 3. Technical Specifications

### 3.1 Architecture Overview

**Pattern:** Images as First-Class Canvas Objects
**Rationale:** Consistency, code reuse, seamless integration with existing systems

**Data Flow:**
1. User uploads image (drag-drop or URL)
2. File validated (type, size)
3. Image uploaded to Firebase Storage
4. Download URL retrieved
5. ImageObject created with URL and metadata
6. Object saved to Firestore via shape factory
7. Real-time listener syncs to all collaborators
8. Konva.Image component loads and renders image

### 3.2 Type Definitions

**File:** `types/canvas.ts`

```typescript
/**
 * Image object
 * Images are treated as canvas objects for consistency with shapes
 */
export interface ImageObject extends BaseCanvasObject {
  type: "image";
  imageUrl: string;          // Firebase Storage download URL
  originalWidth: number;     // Original image width (for aspect ratio)
  originalHeight: number;    // Original image height
  fileName?: string;         // Original file name (e.g., "logo.png")
  fileSize?: number;         // File size in bytes
}

// Update union type to include ImageObject
export type CanvasObject =
  | RectangleObject
  | CircleObject
  | LineObject
  | TextObject
  | ImageObject;  // ADD THIS
```

**File:** `app/canvas/_types/shapes.ts`

```typescript
/**
 * Local persisted image shape
 * Used for Konva rendering and local state
 */
export interface PersistedImage {
  id: string;
  type: "image";
  canvasId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  fileName?: string;
  fileSize?: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  lockedBy: string | null;
  lockedAt: number | null;
  lockTimeout: number;
}

// Update union type
export type PersistedShape =
  | PersistedRect
  | PersistedCircle
  | PersistedLine
  | PersistedText
  | PersistedImage;  // ADD THIS
```

### 3.3 Firebase Storage Structure

**Storage Path:** `images/{canvasId}/{imageId}.{ext}`

**Example:**
```
images/
  canvas_abc123/
    img_xyz789.png
    img_def456.jpg
    img_ghi012.webp
```

**Benefits:**
- Organized by canvas for easy cleanup
- imageId matches Firestore object ID for consistency
- File extension preserved for MIME type detection
- Scalable structure supports thousands of images per canvas

### 3.4 File Changes

#### New Files to Create

1. **`lib/firebase/storage.ts`** - Firebase Storage operations
   - `uploadImage(file, canvasId, imageId)` - Upload image file
   - `uploadImageFromURL(url, canvasId, imageId)` - Import from URL
   - `deleteImage(canvasId, imageId)` - Delete image from storage
   - `validateImageFile(file)` - Client-side validation
   - `sanitizeImageURL(url)` - URL validation and sanitization

2. **`app/canvas/_components/shapes/ImageShape.tsx`** - Konva image component
   - Renders Konva.Image with HTMLImageElement source
   - Transform handlers (drag, resize, rotate)
   - Loading state placeholder
   - Error state (broken image icon)
   - Lock indicator overlay
   - Aspect ratio locking during resize

3. **`app/canvas/_components/ImageUploadDialog.tsx`** - URL import dialog
   - Modal/dialog with URL input field
   - URL validation and preview
   - Submit button with loading state
   - Error display for invalid URLs

4. **`app/canvas/_lib/image-utils.ts`** - Image loading utilities
   - `loadImageFromURL(url)` - Load HTMLImageElement from URL
   - `getImageDimensions(file)` - Extract dimensions from File object
   - `scaleImageToFit(width, height, maxWidth, maxHeight)` - Calculate scaled dimensions
   - LRU cache for loaded HTMLImageElement objects (50-100 images)

5. **`app/canvas/_lib/image-validation.ts`** - Validation utilities
   - Constants: `MAX_FILE_SIZE`, `MAX_DIMENSIONS`, `ALLOWED_MIME_TYPES`
   - `validateFile(file)` - Comprehensive file validation
   - `validateURL(url)` - URL format and domain validation
   - Error message generators

6. **`storage.rules`** - Firebase Storage security rules
   - Enforce file type and size limits
   - Restrict writes to authenticated users
   - Read access for authenticated users

#### Files to Modify

1. **`types/canvas.ts`**
   - Add `ImageObject` interface extending `BaseCanvasObject`
   - Add `"image"` to `type` union in `BaseCanvasObject`
   - Update `CanvasObject` union type to include `ImageObject`

2. **`app/canvas/_types/shapes.ts`**
   - Add `PersistedImage` interface
   - Update `PersistedShape` union type to include `PersistedImage`

3. **`app/canvas/_lib/shapes.ts`**
   - Add `imageFactory` implementing `ShapeFactory<PersistedImage>`
   - Register `imageFactory` in `shapeFactories` registry
   - Implement all required factory methods (createDefault, toFirestore, fromFirestore, etc.)

4. **`app/canvas/_components/Canvas.tsx`**
   - Add drag-over event handlers (onDragOver, onDragLeave, onDrop)
   - Add state for drag-drop overlay visibility
   - Render drop zone overlay when dragging files
   - Handle file upload flow in drop handler
   - Ensure ImageShape components render in shapes list

5. **`app/canvas/_components/shapes/index.tsx`**
   - Add import for `ImageShape`
   - Add case for `"image"` type in shape renderer switch
   - Pass appropriate props to ImageShape component

6. **`app/canvas/_components/Toolbar.tsx`**
   - Add "Upload Image" button (ImagePlus icon from lucide-react)
   - Button opens ImageUploadDialog for URL import
   - Alternative: Button triggers file picker for direct upload

7. **`app/canvas/_components/PropertiesPanel.tsx`**
   - Add image-specific properties section (conditional on `selectedObject.type === "image"`)
   - Display file name (read-only)
   - Display original dimensions (read-only)
   - Current dimensions with width/height inputs
   - Aspect ratio lock toggle checkbox
   - Replace image button
   - Standard properties (position, rotation, opacity, z-index)

8. **`lib/firebase/config.ts`**
   - Import and export `getStorage` from Firebase SDK
   - Initialize Firebase Storage instance
   - Export storage instance for use in storage.ts

9. **`lib/firebase/firestore.ts`**
   - No changes needed - existing CRUD operations work for ImageObject
   - Existing lock system works automatically
   - Existing batch operations compatible

10. **`firestore.rules`**
    - No changes needed - existing object rules apply to ImageObject
    - Objects subcollection already allows read/write for authenticated users

11. **`package.json`**
    - Verify `firebase` package includes Storage SDK (already included in v12.4.0)
    - No new dependencies needed

### 3.5 Firebase Security Rules

#### Storage Rules (New File: `storage.rules`)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Images organized by canvas
    match /images/{canvasId}/{imageId} {
      // Allow authenticated users to read images
      allow read: if request.auth != null;

      // Allow authenticated users to upload images with constraints
      allow write: if request.auth != null
                   && request.resource.size <= 5 * 1024 * 1024  // 5MB max
                   && request.resource.contentType.matches('image/(png|jpeg|jpg|webp|gif|svg\\+xml)');

      // Allow authenticated users to delete their own images
      // Note: Additional logic needed to verify canvas ownership
      allow delete: if request.auth != null;
    }
  }
}
```

**Deployment:**
- Deploy via Firebase Console or `firebase deploy --only storage`
- Test rules with Firebase Storage Rules Playground
- Monitor Firebase Console for rule violations

#### Firestore Rules (No Changes Needed)

Existing rules in `firestore.rules` already support ImageObject:
- Objects subcollection allows read/write for authenticated users
- Access control enforced at canvas level
- ImageObject follows same pattern as other canvas objects

### 3.6 Dependencies

**Existing Dependencies (Already Available):**
- `firebase` v12.4.0 - Includes Storage SDK
- `konva` v10.0.2 - Supports Konva.Image component
- `react-konva` v19.0.10 - React bindings for Konva
- `lucide-react` v0.545.0 - Icons (ImagePlus, Upload, etc.)

**New Dependencies:**
- None required - all functionality available with existing packages

**Firebase SDK Imports Needed:**
```typescript
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
```

### 3.7 API Contracts

#### Image Factory Interface

```typescript
interface ShapeFactory<T> {
  createDefault: (
    bounds: DrawingBounds,
    overrides?: Partial<T>,
    canvasId?: string
  ) => T;

  toFirestore: (
    shape: T,
    userId: string,
    canvasId?: string
  ) => CanvasObject;

  fromFirestore: (obj: CanvasObject) => T | null;

  validateSize: (shape: T) => boolean;

  normalizeDrawing: (start: Point, current?: Point) => DrawingBounds;

  getDraftData: (draft: DrawingBounds, styleOverrides?: any) => any;
}
```

#### Storage Upload Functions

```typescript
/**
 * Upload image file to Firebase Storage
 */
async function uploadImage(
  file: File,
  canvasId: string,
  imageId: string
): Promise<string> // Returns download URL

/**
 * Import image from URL
 */
async function uploadImageFromURL(
  url: string,
  canvasId: string,
  imageId: string
): Promise<string> // Returns download URL

/**
 * Delete image from storage
 */
async function deleteImage(
  canvasId: string,
  imageId: string
): Promise<void>

/**
 * Validate image file
 */
function validateImageFile(
  file: File
): { valid: boolean; error?: string }

/**
 * Sanitize and validate image URL
 */
function sanitizeImageURL(
  url: string
): { valid: boolean; sanitized?: string; error?: string }
```

---

## 4. User Experience

### 4.1 User Flow: Drag-and-Drop Upload

**Happy Path:**
1. User drags image file from desktop over canvas
2. Canvas detects drag-over, shows drop zone overlay with dashed border and "Drop image here" text
3. User releases mouse to drop file
4. System validates file type and size
5. Upload begins - spinner appears at drop location
6. File uploads to Firebase Storage (progress shown)
7. Download URL retrieved
8. ImageObject created and saved to Firestore
9. Real-time listener triggers update
10. Image loads in Konva (HTMLImageElement downloads)
11. Image fully rendered on canvas at drop location
12. Image automatically selected with transform handles visible
13. Success toast: "Image uploaded successfully"

**Error Paths:**

- **Invalid file type:**
  1. Drop overlay dismisses
  2. Error toast: "Unsupported format. Please use PNG, JPG, WebP, or GIF."

- **File too large:**
  1. Drop overlay dismisses
  2. Error toast: "File too large (8.2 MB). Maximum size is 5MB."

- **Upload failure:**
  1. Spinner shows at drop location
  2. Upload fails after 10 seconds
  3. Spinner replaced with error icon
  4. Error toast: "Upload failed. Check your connection and try again."
  5. Placeholder object removed from canvas

- **Image load failure:**
  1. ImageObject synced successfully
  2. Konva attempts to load image
  3. Load fails (404, CORS, network error)
  4. Broken image icon shown at image location
  5. Tooltip on hover: "Image failed to load. Click to retry or delete."
  6. User can click to retry or delete object

### 4.2 User Flow: URL Import

**Happy Path:**
1. User clicks "Upload Image" button in toolbar (or right-click → "Import from URL")
2. ImageUploadDialog modal opens
3. User enters URL in input field: `https://example.com/photo.jpg`
4. URL validation runs on blur (green checkmark if valid)
5. User clicks "Import" button
6. Dialog shows loading spinner
7. System fetches image from URL
8. Image downloaded and uploaded to Firebase Storage
9. Download URL retrieved
10. ImageObject created at canvas center
11. Dialog closes
12. Image appears on canvas with loading spinner
13. Image fully loads and renders
14. Success toast: "Image imported successfully"

**Error Paths:**

- **Invalid URL format:**
  1. Input field shows red border
  2. Error text below input: "Please enter a valid URL"
  3. Import button disabled

- **CORS blocked:**
  1. Fetch fails with CORS error
  2. Dialog shows error: "Unable to load image. The server does not allow cross-origin requests."
  3. User can retry or cancel

- **Network timeout:**
  1. Fetch exceeds 10 second timeout
  2. Dialog shows error: "Request timed out. Please check the URL and try again."

- **Not an image:**
  1. Fetch succeeds but content-type is not image/*
  2. Dialog shows error: "URL does not point to a valid image file."

### 4.3 User Flow: Resize with Aspect Ratio Lock

**Default Behavior (Locked):**
1. User selects image on canvas
2. Transform handles appear (8 anchors)
3. User drags corner handle to resize
4. Image scales proportionally (width and height change together)
5. Aspect ratio maintained automatically
6. User releases mouse
7. New dimensions saved to Firestore

**Unlocked Behavior (Shift Key):**
1. User selects image on canvas
2. Transform handles appear
3. User holds Shift key and drags corner handle
4. Visual indicator appears (e.g., "Aspect ratio unlocked" tooltip or cursor change)
5. Image stretches freely (width and height independent)
6. User releases mouse
7. Distorted dimensions saved to Firestore
8. Shift key released - returns to locked mode

**Properties Panel Toggle:**
1. User selects image
2. Properties panel shows "Lock aspect ratio" checkbox (checked by default)
3. User unchecks box
4. Resize now allows free distortion (without Shift key)
5. User can re-check box to restore locking

### 4.4 UI Components

#### Drop Zone Overlay
- **Appearance:** Full-canvas overlay with semi-transparent background
- **Visual:** Dashed border (2px, blue), "Drop image here" text centered
- **Icon:** Large upload icon (lucide-react `Upload`)
- **Trigger:** Visible when dragging file over canvas
- **Dismissal:** Hides when drag leaves canvas or file dropped

#### Upload Progress Indicator
- **Appearance:** Spinner at drop/click location
- **Size:** 48px diameter, blue color matching brand
- **Background:** White circle with subtle shadow for contrast
- **Duration:** Shows until image fully loaded or error occurs

#### Image Loading Placeholder
- **Appearance:** Gray rectangle outline with dimensions of final image
- **Visual:** Dashed border (1px, gray), centered spinner
- **Icon:** Image icon (lucide-react `Image`) with spinner overlay
- **Duration:** Shows while HTMLImageElement downloads from Firebase Storage

#### Broken Image State
- **Appearance:** Red rectangle outline with dimensions of failed image
- **Visual:** Solid border (2px, red), centered broken image icon
- **Icon:** Image Off icon (lucide-react `ImageOff`)
- **Tooltip:** "Image failed to load. Click to retry or delete."
- **Actions:** Click to open context menu with "Retry" and "Delete" options

#### Properties Panel - Image Section
- **Location:** Right sidebar, appears when image selected
- **Sections:**
  - **File Info:** File name (read-only text), Original size (e.g., "1920 x 1080")
  - **Transform:** X, Y position inputs (number), Width, Height inputs (number), Rotation slider (0-360°)
  - **Aspect Ratio:** Lock toggle checkbox (checked by default)
  - **Appearance:** Opacity slider (0-100%)
  - **Layer:** Z-index up/down buttons
  - **Actions:** Replace image button (primary), Delete button (destructive)

#### Image Upload Dialog (URL Import)
- **Layout:** Modal dialog, centered on screen
- **Size:** 500px width, auto height
- **Sections:**
  - **Header:** "Import Image from URL" title, close button (X)
  - **Input:** Text input field with placeholder "https://example.com/image.jpg"
  - **Validation:** Real-time validation with error/success indicator
  - **Preview:** Optional thumbnail preview if URL valid (future enhancement)
  - **Actions:** Cancel button (secondary), Import button (primary, disabled until valid)
- **Keyboard:** Enter to submit, Escape to close

### 4.5 Feedback Mechanisms

**Success Feedback:**
- Toast notification: "Image uploaded successfully" (3 second duration, green theme)
- Toast notification: "Image imported from URL" (3 second duration, green theme)
- Visual confirmation: Image appears on canvas, auto-selected with transform handles

**Progress Feedback:**
- Upload spinner at drop location during Firebase Storage upload
- Loading placeholder while image downloads from Storage URL
- URL dialog shows loading spinner on import button during fetch

**Error Feedback:**
- Toast notifications for all error types (5 second duration, red theme)
- Inline validation errors in URL dialog (red text below input)
- Broken image icon for failed loads (persistent until resolved)
- Console logs for debugging (all errors logged with context)

**Collaborative Feedback:**
- Lock badge shows who is transforming an image
- Real-time position updates during drag (broadcast via Realtime Database)
- Optional: Toast notification when collaborator uploads image: "{User} uploaded an image"

---

## 5. Security & Validation

### 5.1 File Upload Security

#### Client-Side Validation

**File Type Validation:**
- **Allowed MIME types:** `image/png`, `image/jpeg`, `image/jpg`, `image/webp`, `image/gif`, `image/svg+xml`
- **Method:** Check `file.type` property before upload
- **Fallback:** Check file extension if MIME type missing
- **Error message:** "Unsupported format. Please use PNG, JPG, WebP, GIF, or SVG."

**File Size Validation:**
- **Maximum:** 5MB (5 * 1024 * 1024 bytes)
- **Method:** Check `file.size` property before upload
- **Error message:** "File too large ({size} MB). Maximum size is 5MB."
- **User action:** Recommend using image compression tools

**Dimension Validation:**
- **Maximum:** 4096 x 4096 pixels
- **Method:** Load image into HTMLImageElement, check naturalWidth/naturalHeight
- **Behavior:** Auto-scale to fit if exceeds limit (preserve aspect ratio)
- **User notification:** Toast: "Image scaled to fit maximum dimensions (4096x4096)"

**Malicious File Detection:**
- **Method:** Validate file signature (magic bytes) matches declared type
- **Libraries:** Consider using `file-type` npm package for deep validation (future enhancement)
- **MVP Approach:** Rely on MIME type validation and Firebase Storage rules

#### Server-Side Validation (Firebase Storage Rules)

**Enforced Constraints:**
- Content type: `image/(png|jpeg|jpg|webp|gif|svg\+xml)`
- File size: `<= 5 * 1024 * 1024` bytes
- Authentication: `request.auth != null`

**Benefits:**
- Cannot be bypassed by malicious clients
- Last line of defense against invalid uploads
- Consistent across all upload methods (drag-drop, URL import)

### 5.2 URL Import Security

#### URL Sanitization

**Allowed Schemes:**
- `http://`
- `https://`
- Block: `file://`, `javascript:`, `data:`, etc.

**Validation Steps:**
1. Parse URL with `new URL()` constructor (throws on invalid)
2. Check protocol is http or https
3. Validate domain is not localhost or private IP (10.x.x.x, 192.168.x.x, 127.0.0.1)
4. Check path ends with image extension (optional, lenient)
5. Encode special characters to prevent XSS

**CORS Handling:**
- **Issue:** Browser blocks fetch from cross-origin domains without CORS headers
- **Solution:** Use server-side proxy via Next.js API route
- **API Route:** `/api/proxy-image?url={encodedURL}`
- **Method:** Server fetches image, pipes to client, uploads to Firebase Storage
- **Benefit:** Bypasses browser CORS, validates content on server
- **Security:** Rate limiting, URL whitelist/blacklist, size checks

**Timeout Handling:**
- **Timeout:** 10 seconds for URL fetch
- **Method:** `AbortController` with timeout signal
- **Error:** "Request timed out. The image may be too large or the server is slow."

**Domain Whitelist/Blacklist:**
- **MVP:** No whitelist, block private IPs only
- **Future:** Allow configuration of trusted domains (e.g., Unsplash, Pexels)
- **Blacklist:** Block known malicious domains (integrate with threat intelligence)

#### Content Type Validation

**Response Validation:**
1. Check `Content-Type` header is `image/*`
2. Check `Content-Length` header is <= 5MB
3. Download image and validate signature
4. Convert to File object for standard upload flow

**Error Handling:**
- Invalid content type: "URL does not point to an image."
- Too large: "Image from URL exceeds 5MB limit."
- Network error: "Failed to fetch image. Check the URL and try again."

### 5.3 Firebase Security Rules

#### Storage Rules Review

```javascript
// Allow authenticated users to read images
allow read: if request.auth != null;

// Allow uploads with constraints
allow write: if request.auth != null
             && request.resource.size <= 5 * 1024 * 1024
             && request.resource.contentType.matches('image/(png|jpeg|jpg|webp|gif|svg\\+xml)');

// Allow deletes by authenticated users
allow delete: if request.auth != null;
```

**Limitations:**
- Cannot verify canvas ownership in Storage rules (no Firestore access)
- Deletion allowed for any authenticated user (could delete others' images)

**Mitigation:**
- Client-side enforcement: Only allow delete for objects user owns
- Firestore trigger: Cloud Function monitors ImageObject deletes, removes orphaned storage files
- Audit logging: Track all Storage operations in Cloud Functions

#### Firestore Rules Review

Existing rules already support ImageObject:
```javascript
match /canvases/{canvasId}/objects/{objectId} {
  allow read: if isAuthenticated();
  allow write: if isAuthenticated();
}
```

**Security Notes:**
- Access control enforced at canvas level by client
- ImageObject follows same pattern as other CanvasObject types
- No additional rules needed for MVP

### 5.4 Additional Security Considerations

**SVG Sanitization:**
- **Risk:** SVG files can contain JavaScript via `<script>` tags or event handlers
- **Solution:** Parse SVG XML, strip dangerous elements/attributes before rendering
- **Libraries:** DOMPurify or svg-sanitizer
- **Alternative:** Block SVG in MVP, add in Phase 2 with proper sanitization

**Image Upload Abuse:**
- **Risk:** User uploads many large images to exhaust storage quota
- **Mitigation:** Rate limiting (e.g., max 10 uploads per minute per user)
- **Implementation:** Track upload count in Realtime Database, reset every 60 seconds
- **Error:** "Upload limit reached. Please wait a moment and try again."

**Storage Cleanup:**
- **Risk:** Deleted ImageObjects leave orphaned files in Storage
- **Solution:** Cloud Function triggered on Firestore delete event
- **Function:** Extracts imageUrl, parses storage path, calls deleteObject()
- **Benefits:** Prevents storage bloat, reduces costs

---

## 6. Testing Strategy

### 6.1 Unit Tests

**File:** `lib/firebase/storage.test.ts`
- `uploadImage()` - Mock Firebase Storage, verify upload called with correct params
- `validateImageFile()` - Test all validation rules (type, size, dimensions)
- `sanitizeImageURL()` - Test URL parsing, scheme validation, encoding

**File:** `app/canvas/_lib/shapes.test.ts`
- `imageFactory.createDefault()` - Verify default ImageObject structure
- `imageFactory.toFirestore()` - Verify conversion to Firestore format
- `imageFactory.fromFirestore()` - Verify conversion from Firestore format
- `imageFactory.validateSize()` - Test size validation logic

**File:** `app/canvas/_lib/image-utils.test.ts`
- `loadImageFromURL()` - Mock HTMLImageElement, verify promise resolution
- `getImageDimensions()` - Mock File object with dimensions
- `scaleImageToFit()` - Test aspect ratio calculations

### 6.2 Integration Tests

**Firebase Storage Integration:**
- Upload real image file to Firebase Storage
- Verify download URL returned
- Verify file accessible at URL
- Delete file and verify removal

**Firestore Sync:**
- Create ImageObject via imageFactory
- Save to Firestore
- Subscribe to real-time listener
- Verify ImageObject received and parsed correctly

**Konva Rendering:**
- Load image from Firebase Storage URL
- Render in Konva.Image component
- Verify image visible on canvas
- Test transform operations (drag, resize, rotate)

### 6.3 Manual Testing Checklist

**Upload Testing:**
- [ ] Drag-drop PNG file - uploads successfully
- [ ] Drag-drop JPEG file - uploads successfully
- [ ] Drag-drop WebP file - uploads successfully
- [ ] Drag-drop GIF file - uploads successfully
- [ ] Drag-drop SVG file - uploads successfully (or blocked if not implemented)
- [ ] Drag-drop multiple files - all upload
- [ ] Drag-drop invalid file type (PDF, TXT) - shows error
- [ ] Drag-drop file >5MB - shows error with file size
- [ ] Drag-drop file with special characters in name - handles correctly
- [ ] URL import with valid image URL - imports successfully
- [ ] URL import with invalid URL - shows validation error
- [ ] URL import with non-image URL - shows content type error
- [ ] URL import with CORS-blocked URL - shows helpful error

**Rendering Testing:**
- [ ] Image appears at correct drop location
- [ ] Image maintains aspect ratio
- [ ] Image opacity slider works
- [ ] Image rotation works
- [ ] Broken image icon appears for invalid URL
- [ ] Loading placeholder shows during download
- [ ] Multiple images render correctly

**Transform Testing:**
- [ ] Drag image to move - position updates in real-time
- [ ] Resize image - aspect ratio locked by default
- [ ] Shift+resize - aspect ratio unlocks
- [ ] Rotate image - rotation updates smoothly
- [ ] Properties panel shows correct dimensions
- [ ] Aspect ratio toggle in panel works

**Collaboration Testing:**
- [ ] Open canvas in two browser windows
- [ ] Upload image in window 1 - appears in window 2
- [ ] Select image in window 1 - lock appears in window 2
- [ ] Try to select locked image in window 2 - prevented
- [ ] Drag image in window 1 - position updates in window 2
- [ ] Release lock in window 1 - available in window 2

**Error Handling Testing:**
- [ ] Upload fails - shows error toast
- [ ] Image load fails - shows broken image icon
- [ ] Network disconnected during upload - graceful error
- [ ] Invalid Firebase config - helpful error message
- [ ] CORS error - helpful error message

**Performance Testing:**
- [ ] Upload 5MB image - completes within 3 seconds
- [ ] Load canvas with 20 images - no lag, 60 FPS maintained
- [ ] Upload/delete 50 images - no memory leaks
- [ ] Zoom in/out with images on canvas - smooth performance

**Browser Compatibility:**
- [ ] Chrome - all features work
- [ ] Firefox - all features work
- [ ] Safari - all features work
- [ ] Edge - all features work
- [ ] Mobile Safari - drag-drop alternative works

### 6.4 Performance Testing

**Metrics to Monitor:**
- Upload time: Measure with performance.now() before/after upload
- Render time: Measure time from Firestore sync to Konva render complete
- FPS: Use Konva.Layer.batchDraw() with frame timing
- Memory: Chrome DevTools memory profiler, check for leaks after 50 uploads

**Load Testing:**
- Create canvas with 50 objects (25 shapes, 25 images)
- Measure FPS during pan/zoom
- Measure time to load all images from cold start
- Verify no degradation with multiple users uploading simultaneously

**Benchmarks:**
- Upload 1MB image: Target <1 second
- Upload 5MB image: Target <3 seconds
- Load 20 images: Target <5 seconds total
- Canvas FPS: Maintain >55 FPS with 20 images

---

## 7. Implementation Plan

### 7.1 Phase 1: Setup & Foundation

**Goal:** Establish Firebase Storage, create ImageObject type, validate setup

**Task 1.1: Set up Firebase Storage and Test** (PRIORITY: CRITICAL - MUST BE FIRST)
- Import getStorage from firebase/storage in config.ts
- Initialize Storage instance
- Export storage instance
- Create test upload function
- Test upload in browser console
- Verify download URL works
- Test CORS configuration
- Document any CORS setup needed
- **Acceptance:** Successfully upload test image and retrieve URL

**Task 1.2: Create ImageObject Type System**
- Add ImageObject interface to types/canvas.ts
- Update CanvasObject union type
- Add PersistedImage interface to app/canvas/_types/shapes.ts
- Update PersistedShape union type
- **Acceptance:** TypeScript compiles without errors, types are correct

**Task 1.3: Create Image Validation Module**
- Create lib/firebase/storage-validation.ts
- Implement validateImageFile(file) function
- Define constants: MAX_FILE_SIZE, ALLOWED_MIME_TYPES
- Implement error message generators
- Unit tests for validation logic
- **Acceptance:** Validation catches invalid files, unit tests pass

**Task 1.4: Deploy Firebase Storage Security Rules**
- Create storage.rules file
- Define rules for images/{canvasId}/{imageId} path
- Enforce file type and size constraints
- Deploy to Firebase
- Test rules via Firebase Console playground
- **Acceptance:** Rules deployed, invalid uploads blocked

### 7.2 Phase 2: Upload Features

**Goal:** Implement drag-drop and URL import functionality

**Task 2.1: Firebase Storage Upload Functions**
- Create lib/firebase/storage.ts
- Implement uploadImage(file, canvasId, imageId) function
- Implement deleteImage(canvasId, imageId) function
- Add error handling for upload failures
- Use safeSetDoc pattern for metadata
- **Acceptance:** Can upload/delete images programmatically

**Task 2.2: Drag-and-Drop Upload**
- Add drag-drop event handlers to Canvas.tsx
- Create drop zone overlay component
- Implement file validation before upload
- Handle multiple file drops
- Show upload progress indicator
- Create ImageObject after successful upload
- Display error toasts for failures
- **Acceptance:** Can drag-drop images onto canvas, validation works

**Task 2.3: URL Import Implementation**
- Create ImageUploadDialog.tsx component
- Implement URL input field with validation
- Create Next.js API route for CORS proxy (optional for MVP)
- Implement uploadImageFromURL() function
- Handle CORS errors gracefully
- Add timeout handling (10 seconds)
- **Acceptance:** Can import images from URLs, errors handled

**Task 2.4: Image Loading Utilities**
- Create app/canvas/_lib/image-utils.ts
- Implement loadImageFromURL(url) function
- Implement getImageDimensions(file) function
- Implement scaleImageToFit() function
- Create LRU cache for HTMLImageElement objects
- **Acceptance:** Images load efficiently, cache prevents re-downloads

### 7.3 Phase 3: Rendering & Integration

**Goal:** Render images on canvas, integrate with existing systems

**Task 3.1: Image Factory Implementation**
- Add imageFactory to app/canvas/_lib/shapes.ts
- Implement all ShapeFactory methods
- Register factory in shapeFactories registry
- Handle aspect ratio in toFirestore/fromFirestore
- **Acceptance:** Factory creates valid ImageObjects, conversions work

**Task 3.2: Konva Image Component**
- Create app/canvas/_components/shapes/ImageShape.tsx
- Implement Konva.Image rendering with HTMLImageElement
- Add loading placeholder state
- Add broken image error state
- Implement transform handlers (drag, resize, rotate)
- Add aspect ratio locking logic
- Show locked-by badge when locked
- **Acceptance:** Images render on canvas, transforms work

**Task 3.3: Update Shape Renderer**
- Modify app/canvas/_components/shapes/index.tsx
- Add case for "image" type
- Pass correct props to ImageShape component
- Ensure z-index ordering works with images
- **Acceptance:** Images render alongside shapes, z-index correct

**Task 3.4: Properties Panel Integration**
- Modify app/canvas/_components/PropertiesPanel.tsx
- Add image-specific properties section
- Display file name and original dimensions (read-only)
- Add width/height inputs with aspect ratio lock toggle
- Add replace image button (opens file picker or URL dialog)
- Show standard properties (position, rotation, opacity)
- **Acceptance:** Panel shows correct properties for selected image

### 7.4 Phase 4: Polish & Testing

**Goal:** Finalize UX, test thoroughly, deploy to production

**Task 4.1: Toolbar Integration**
- Modify app/canvas/_components/Toolbar.tsx
- Add "Upload Image" button with ImagePlus icon
- Button opens ImageUploadDialog for URL import
- Alternative: Add file picker trigger
- **Acceptance:** Toolbar provides access to image upload

**Task 4.2: Loading States & Feedback**
- Implement upload progress spinner at drop location
- Add loading placeholder while image downloads
- Create toast notifications for success/error states
- Implement broken image icon for failed loads
- Add retry mechanism for failed loads
- **Acceptance:** Clear feedback throughout upload/load process

**Task 4.3: Aspect Ratio Locking**
- Implement default aspect ratio lock in ImageShape
- Add Shift key detection to toggle lock during resize
- Add aspect ratio toggle in PropertiesPanel
- Visual indicator when lock is off (optional)
- **Acceptance:** Aspect ratio locked by default, Shift unlocks

**Task 4.4: Comprehensive Testing**
- Run manual testing checklist (Section 6.3)
- Performance testing with 20+ images
- Multi-user collaboration testing
- Browser compatibility testing
- Security validation (malicious file tests)
- Fix all critical bugs
- **Acceptance:** All tests pass, no critical bugs

**Task 4.5: Documentation & Cleanup**
- Update CLAUDE.md with image support notes
- Add code comments to complex logic
- Remove console.logs used for debugging
- Update Firestore/Storage rules if needed
- Create user-facing help documentation (optional)
- **Acceptance:** Code is clean, documented, production-ready

### 7.5 Implementation Dependencies

**Task Dependencies:**
- Task 1.1 must complete before any other tasks (Firebase Storage setup is critical)
- Tasks 1.2, 1.3, 1.4 can run in parallel after 1.1
- Task 2.1 depends on 1.1 and 1.3
- Tasks 2.2, 2.3, 2.4 depend on 2.1
- Task 3.1 depends on 1.2
- Task 3.2 depends on 2.4 and 3.1
- Task 3.3 depends on 3.2
- Task 3.4 can start after 3.2
- Phase 4 tasks depend on all Phase 3 tasks

**Recommended Order:**
1. Phase 1: 1.1 → (1.2, 1.3, 1.4 in parallel)
2. Phase 2: 2.1 → (2.2, 2.3, 2.4 in parallel)
3. Phase 3: 3.1 → 3.2 → (3.3, 3.4 in parallel)
4. Phase 4: 4.1 → 4.2 → 4.3 → 4.4 → 4.5

**Estimated Effort:**
- Phase 1: 4-6 hours
- Phase 2: 6-8 hours
- Phase 3: 6-8 hours
- Phase 4: 4-6 hours
- **Total: 20-28 hours**

---

## 8. Success Criteria

### 8.1 MVP Launch Criteria

**Functional Completeness:**
- [x] Users can drag-drop PNG, JPEG, WebP, GIF images onto canvas
- [x] Users can import images via URL
- [x] Images appear at drop location/canvas center with correct aspect ratio
- [x] Images sync in real-time across all collaborators
- [x] Images support position, size, rotation, opacity transforms
- [x] Aspect ratio locked by default, Shift key to unlock
- [x] 5MB file size limit enforced (client and server)
- [x] Loading states shown during upload and image load
- [x] Error handling for invalid files, failed uploads, failed loads
- [x] Properties panel shows image-specific properties
- [x] Lock system prevents simultaneous edits on images
- [x] Z-index layering works with images and shapes

**Security & Validation:**
- [x] Firebase Storage security rules deployed and enforced
- [x] File type validation prevents non-image uploads
- [x] File size validation prevents >5MB uploads
- [x] URL sanitization prevents XSS attacks
- [x] Only authenticated users can upload images

**Performance:**
- [x] 5MB image uploads complete within 3 seconds
- [x] Canvas maintains 60 FPS with 20 images
- [x] No console errors during normal operation
- [x] No memory leaks after 50 upload/delete cycles

**User Experience:**
- [x] Clear visual feedback during all upload states
- [x] Helpful error messages for all failure modes
- [x] Aspect ratio locking feels intuitive and responsive
- [x] Properties panel clearly shows image metadata
- [x] Broken images show retry/delete options

### 8.2 Quality Gates

**Code Quality:**
- TypeScript strict mode: No `any` types, full type safety
- ESLint: No errors, warnings addressed
- Code review: All changes reviewed by peer
- Test coverage: Unit tests for validation and factory logic
- Documentation: All public functions have JSDoc comments

**Performance Benchmarks:**
- Upload time (5MB): <3 seconds on average connection
- Image load time: <2 seconds from Firestore sync to render
- Canvas FPS: >55 FPS with 20 images
- Memory usage: <50MB increase after 20 images loaded

**Security Validation:**
- Storage rules block invalid file types
- Storage rules block >5MB files
- URL sanitization blocks javascript: and file: schemes
- Malicious SVG test (if SVG supported): Scripts stripped

**Browser Compatibility:**
- Chrome 120+: All features work
- Firefox 120+: All features work
- Safari 17+: All features work
- Edge 120+: All features work

### 8.3 Post-Launch Monitoring

**Metrics to Track:**
- Total images uploaded per day
- Average upload time by file size
- Upload failure rate and reasons
- Image load failure rate and reasons
- Storage costs (GB used, bandwidth)
- User engagement: % of users uploading images

**Error Monitoring:**
- Firebase Storage upload errors
- Firestore write errors for ImageObjects
- Konva image load failures
- CORS errors from URL imports
- Validation errors by type (file size, type, dimensions)

**User Feedback:**
- Usability issues with drag-drop
- Confusion around aspect ratio locking
- Requests for missing file types (SVG, TIFF, etc.)
- Performance complaints with many images

---

## 9. Open Questions & Risks

### 9.1 Open Questions

**Q1: SVG Support Complexity**
- **Question:** Should MVP include SVG support given sanitization complexity?
- **Options:**
  - A) Include SVG with DOMPurify sanitization
  - B) Block SVG in MVP, add in Phase 2 with proper sanitization
  - C) Allow SVG but render as raster (convert to PNG via canvas)
- **Recommendation:** Option B - Block SVG in MVP to reduce security risk
- **Decision Needed:** Before Phase 1 completion

**Q2: CORS Proxy Strategy**
- **Question:** Should URL import use server-side proxy to avoid CORS issues?
- **Options:**
  - A) Client-side fetch only, fail on CORS (simpler, less server load)
  - B) Server-side proxy via Next.js API route (more reliable, handles CORS)
  - C) Hybrid: Try client-side first, fallback to proxy on CORS error
- **Recommendation:** Option B - Server-side proxy for better UX
- **Decision Needed:** Before Task 2.3

**Q3: Image Replacement UX**
- **Question:** What should "Replace Image" button behavior be?
- **Options:**
  - A) Opens file picker to upload new image
  - B) Opens dialog with file picker AND URL import options
  - C) Shows context menu with "Replace from file" and "Replace from URL"
- **Recommendation:** Option B - Dialog with both options
- **Decision Needed:** Before Task 3.4

**Q4: Multi-Image Upload Behavior**
- **Question:** How should multiple images be positioned when dropped together?
- **Options:**
  - A) Stack at drop location (user must manually separate)
  - B) Arrange in grid pattern (auto-space 20px apart)
  - C) Cascade diagonally (each offset 50px x/y from previous)
- **Recommendation:** Option C - Cascade for easy separation
- **Decision Needed:** Before Task 2.2

**Q5: Storage Cleanup Strategy**
- **Question:** When should orphaned images be deleted from Storage?
- **Options:**
  - A) Immediately on ImageObject delete (Cloud Function trigger)
  - B) Batch cleanup job runs daily/weekly (scheduled Cloud Function)
  - C) Manual cleanup via admin dashboard
- **Recommendation:** Option A for MVP, Option B as backup
- **Decision Needed:** Before Task 4.5

### 9.2 Technical Risks

**Risk 1: CORS Issues with Firebase Storage**
- **Probability:** Medium
- **Impact:** High (images won't load)
- **Mitigation:**
  - Configure CORS via gsutil before development
  - Test CORS with different origins (localhost, production domain)
  - Document CORS setup steps in CLAUDE.md
  - Have fallback plan: Proxy images through Next.js API route
- **Contingency:** If CORS can't be configured, switch to server-side image fetching

**Risk 2: Large Image Performance**
- **Probability:** Medium
- **Impact:** Medium (canvas lag, poor UX)
- **Mitigation:**
  - Enforce strict 5MB file size limit
  - Implement Konva caching for loaded images
  - Use Konva's built-in optimizations (listening: false for non-interactive images)
  - Consider dimension limit (4096x4096) with auto-scaling
- **Contingency:** Add thumbnail generation via Cloud Function in Phase 2

**Risk 3: Storage Costs**
- **Probability:** Low
- **Impact:** Medium (unexpected costs)
- **Mitigation:**
  - 5MB file size limit keeps individual costs low
  - Orphaned image cleanup prevents storage bloat
  - Monitor Firebase Storage usage in console
  - Estimate costs: 1000 users × 10 images × 2MB avg = 20GB = ~$0.50/month
- **Contingency:** Implement stricter limits or compression if costs exceed budget

**Risk 4: Real-Time Sync Performance**
- **Probability:** Low
- **Impact:** Medium (delayed updates, poor collaboration)
- **Mitigation:**
  - ImageObject uses same Firestore sync as other objects (proven to work)
  - Firestore listeners already handle 500+ objects efficiently
  - Image URLs are small strings, not binary data
  - Test with 10+ concurrent users uploading images
- **Contingency:** Implement throttling or queuing if sync becomes bottleneck

**Risk 5: Mobile Browser Compatibility**
- **Probability:** Medium
- **Impact:** Low (mobile is secondary platform)
- **Mitigation:**
  - Test drag-drop on mobile Safari and Chrome
  - Provide file picker fallback if drag-drop unsupported
  - Ensure touch events work for image transforms
  - Consider mobile-specific upload flow (camera, photo library)
- **Contingency:** Add mobile-specific upload button with photo library access

### 9.3 Edge Cases to Handle

**Edge Case 1: Very Small Images**
- **Scenario:** User uploads 10×10 pixel favicon
- **Behavior:** Allow upload, but enforce minimum render size (e.g., 50×50 minimum on canvas)
- **Rationale:** Tiny images are hard to select/transform
- **Implementation:** Scale up during placement, preserve original size in metadata

**Edge Case 2: Extreme Aspect Ratios**
- **Scenario:** User uploads 5000×100 banner image
- **Behavior:** Allow upload, scale to fit canvas initially
- **Rationale:** Extreme ratios are valid use cases (banners, dividers)
- **Implementation:** Auto-scale to fit within canvas bounds, maintain aspect ratio

**Edge Case 3: Animated GIFs**
- **Scenario:** User uploads animated GIF
- **Behavior:** Show first frame only (Konva doesn't support animation natively)
- **Rationale:** Full animation support complex, out of scope for MVP
- **Implementation:** HTMLImageElement naturally shows first frame
- **Future:** Use Konva.Animation to cycle frames manually

**Edge Case 4: Transparent PNGs**
- **Scenario:** User uploads PNG with transparency
- **Behavior:** Render with transparency preserved
- **Rationale:** Essential for logos, icons, layered designs
- **Implementation:** Konva.Image supports transparency automatically
- **Testing:** Verify checkerboard pattern doesn't appear (Konva uses transparent background)

**Edge Case 5: Concurrent Uploads**
- **Scenario:** Multiple users upload images to same canvas simultaneously
- **Behavior:** All uploads succeed, images don't overlap
- **Rationale:** Collaboration should allow simultaneous work
- **Implementation:** Each user's drop location independent, z-index auto-increments

**Edge Case 6: Network Interruption During Upload**
- **Scenario:** Network drops while uploading 5MB image
- **Behavior:** Upload fails, placeholder removed, error toast shown
- **Rationale:** Partial uploads are invalid, retry required
- **Implementation:** Firebase SDK handles interruption, returns error
- **Retry:** User can re-drop image to retry upload

**Edge Case 7: Image URL Changes/Expires**
- **Scenario:** Firebase Storage URL expires or file deleted externally
- **Behavior:** Image fails to load, broken image icon shown
- **Rationale:** ImageObject references immutable URL, external changes not tracked
- **Implementation:** Konva load error triggers broken state
- **Recovery:** User can delete and re-upload, or use "Replace Image"

---

## 10. Appendix

### 10.1 Related Documents

- **Planning Document:** [add-image-support.md](./add-image-support.md)
- **Project Architecture:** [CLAUDE.md](../CLAUDE.md)
- **Canvas Types:** [types/canvas.ts](../types/canvas.ts)
- **Shape Factories:** [app/canvas/_lib/shapes.ts](../app/canvas/_lib/shapes.ts)

### 10.2 Reference Implementations

**Figma's Approach:**
- Images treated as rectangles with image fill
- Max 4096×4096 pixels (auto-scaled if larger)
- Supports drag-drop, paste, "Place Image" command
- File > Place Image for controlled placement

**Canva's Approach:**
- Drag-drop and upload from various sources
- Automatic optimization for web performance
- Background removal and filters as premium features

**Miro's Approach:**
- Drag-drop and file picker upload
- Images as sticky notes with image content
- Inline editing and cropping tools

### 10.3 Technical References

**Konva.js:**
- [Konva.Image API](https://konvajs.org/api/Konva.Image.html)
- [Konva Performance Tips](https://konvajs.org/docs/performance/All_Performance_Tips.html)
- [Konva Image Caching](https://konvajs.org/docs/performance/Cache_Function.html)

**Firebase:**
- [Firebase Storage Upload Files](https://firebase.google.com/docs/storage/web/upload-files)
- [Firebase Storage Security Rules](https://firebase.google.com/docs/storage/security/start)
- [Firebase Storage CORS Configuration](https://firebase.google.com/docs/storage/web/download-files#cors_configuration)

**Web APIs:**
- [File API - Reading Files](https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications)
- [Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [HTMLImageElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement)
- [URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL)

### 10.4 Cost Estimation

**Firebase Storage Pricing (Pay-as-you-go):**
- Storage: $0.026/GB/month
- Download bandwidth: $0.12/GB
- Operations: $0.05 per 10,000 operations

**Usage Scenarios:**

**Small Team (10 users, 100 images):**
- Storage: 100 images × 2MB avg = 200MB = $0.01/month
- Downloads: 100 images × 10 views × 2MB = 2GB = $0.24/month
- Operations: 100 uploads + 1000 downloads = negligible
- **Total: ~$0.25/month**

**Medium Team (100 users, 1000 images):**
- Storage: 1000 images × 2MB avg = 2GB = $0.05/month
- Downloads: 1000 images × 100 views × 2MB = 200GB = $24/month
- Operations: negligible
- **Total: ~$24/month**

**Large Team (1000 users, 10,000 images):**
- Storage: 10,000 images × 2MB avg = 20GB = $0.52/month
- Downloads: 10,000 images × 1000 views × 2MB = 20TB = $2,400/month
- Operations: negligible
- **Total: ~$2,400/month**

**Optimization Strategies:**
- Thumbnail generation reduces download bandwidth (serve 200KB thumbnail vs 2MB original)
- CDN caching reduces repeated downloads
- Compression reduces storage and bandwidth costs
- Cleanup of orphaned images prevents storage bloat

### 10.5 Accessibility Considerations

**Screen Reader Support:**
- Add alt text field to ImageObject (optional for MVP)
- Properties panel shows alt text input when image selected
- Konva.Image doesn't natively support alt text (canvas limitation)
- Export to HTML includes alt text on image tags

**Keyboard Navigation:**
- Arrow keys move selected image (10px increments, Shift for 1px)
- Tab key cycles through images and shapes
- Delete key removes selected image
- Enter key opens properties panel for selected image

**Visual Indicators:**
- High contrast mode: Ensure selection handles visible
- Focus indicators: Blue outline on keyboard-selected images
- Loading states: Accessible to screen readers (aria-live announcements)

**Future Enhancements:**
- Image descriptions for AI-generated alt text
- Keyboard-only upload flow (file picker instead of drag-drop)
- Voice commands for image manipulation (via Web Speech API)

---

## 11. Conclusion

This PRD defines a comprehensive, production-ready approach to adding image support to Not-Figma. By treating images as first-class canvas objects, we leverage existing architecture for locking, real-time sync, and properties management while providing a consistent user experience.

**Key Decisions:**
- Images as `ImageObject` extending `BaseCanvasObject`
- Drag-and-drop as primary upload method, URL import as secondary
- 5MB file size limit, 4096×4096 dimension limit
- Aspect ratio locked by default, Shift key to unlock
- Firebase Storage for binary files, Firestore for metadata
- Security via client/server validation and Storage rules
- No clipboard paste or thumbnail generation in MVP

**Next Steps:**
1. Review and approve this PRD
2. Create detailed implementation tasks from Phase 1-4 breakdown
3. Assign tasks to development team
4. Begin with Task 1.1 (Firebase Storage setup) - CRITICAL PRIORITY
5. Iterate through phases with regular testing and validation

**Success Criteria:**
- Users can upload and manipulate images seamlessly
- Real-time collaboration works with images
- Performance maintained with 20+ images
- Security validated against common attacks
- All manual tests pass before production deployment

This feature will significantly enhance Not-Figma's capabilities, enabling users to create rich, multimedia designs with the same collaborative power as vector shapes.

---

**Document Version History:**

- v1.0 (2025-10-19): Initial PRD based on planning document and user decisions
