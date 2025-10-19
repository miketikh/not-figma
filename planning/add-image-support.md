# Feature Planning: Image Support

**Date:** 2025-10-19
**Status:** Exploration Phase
**Next Step:** Discussion → PRD Creation

## Executive Summary

This document explores adding image support to Not-Figma, a real-time collaborative design canvas. Based on architecture analysis and industry research, the recommended approach is:

1. **Treat images as regular canvas objects** - Images should follow the existing shape factory pattern with an `ImageObject` type
2. **MVP Upload Method** - Start with drag-and-drop file upload, with clipboard paste as a close second priority
3. **Storage Strategy** - Use Firebase Storage for image files with URLs stored in Firestore, implement lazy loading
4. **Performance First** - Leverage Konva's image caching and optimization techniques from day one

The key architectural decision is whether to treat images as first-class canvas objects (like rectangles, circles, text) or as a separate special feature. **Recommendation: Treat as canvas objects** - this maintains consistency, enables reuse of the locking system, properties panel, and transformation logic, and provides a better foundation for future features like image filters and effects.

---

## Feature Request Summary

Add support for uploading, displaying, and manipulating images on the collaborative canvas. Users should be able to:
- Upload images to the canvas (via drag-drop, file picker, or paste)
- Position, resize, and rotate images like other canvas objects
- Apply basic properties (opacity, rotation)
- Collaborate on images with the same real-time locking system
- See images persist across sessions via Firebase

This feature is essential for any design tool and would significantly expand Not-Figma's capabilities from vector shapes to raster image composition.

---

## Initial Questions & Clarifications

### Core Architecture
- **Q1: Canvas Object vs. Special Feature?** Should images be `ImageObject` types that follow the same pattern as `RectangleObject`, `CircleObject`, etc., or should they be treated separately?
  - **Impact:** Affects how images integrate with selection, locking, properties panel, and z-index layering

### Upload & User Experience
- **Q2: Which upload method(s) for MVP?** What's the priority order for: drag-drop file upload, clipboard paste, file input dialog, URL import?
  - **Impact:** Development scope and user experience priorities

### Performance & Storage
- **Q3: Image size limits?** Should there be maximum file size or dimension constraints?
  - **Impact:** Firebase Storage costs, performance, and user experience

- **Q4: Thumbnail generation?** Should we generate thumbnails for performance or display full images initially?
  - **Impact:** Additional Cloud Functions setup, storage costs, but better performance

### Feature Scope
- **Q5: Initial manipulation capabilities?** Position, resize, rotate only? Or include opacity, filters, cropping?
  - **Impact:** MVP scope and complexity

---

## Possible User Stories

### Primary Use Cases

1. **As a designer, I want to drag-and-drop images from my computer onto the canvas so that I can quickly add visual assets to my design**
   - Scenario: User is designing a website mockup and drags a logo PNG from their desktop onto the canvas
   - Expected outcome: Image appears on canvas at drop location, sized appropriately, ready to position/resize

2. **As a designer, I want to paste images from my clipboard so that I can quickly add screenshots or copied images**
   - Scenario: User takes a screenshot (Cmd+Shift+4 on Mac) and immediately pastes it onto the canvas
   - Expected outcome: Image appears on canvas, maintaining original dimensions (or scaled if too large)

3. **As a collaborator, I want to resize and position images just like shapes so that I can integrate images into the design layout**
   - Scenario: User selects an uploaded image and uses transform handles to resize and rotate it to fit the design
   - Expected outcome: Image transforms smoothly with the same handles/controls as rectangles/circles, lock system prevents conflicts

4. **As a designer, I want images to persist and sync across sessions so that my work is saved and teammates can see my images**
   - Scenario: User uploads several product photos, logs out, then logs back in from another device
   - Expected outcome: All images appear exactly where they were placed, with same properties

5. **As a collaborator, I want to adjust image opacity and layering so that I can create overlays and complex compositions**
   - Scenario: User places a logo image over a background and reduces opacity to 50% to create a watermark effect
   - Expected outcome: Properties panel shows opacity slider, image renders with transparency, z-index controls work as expected

### Secondary/Future Use Cases

- **As a designer, I want to import images from URLs** so that I can quickly add images from the web without downloading first
- **As a designer, I want to crop images** so that I can show only the relevant portion
- **As a designer, I want to apply filters (grayscale, blur, etc.)** so that I can create visual effects
- **As a designer, I want to replace an image** while maintaining position/size/properties
- **As a power user, I want to paste images with transparent backgrounds (PNGs)** to create layered compositions
- **As a designer, I want to see image metadata** (dimensions, file size, format) in the properties panel

---

## Feature Possibilities

### Option A: Images as Canvas Objects (RECOMMENDED)

**Description:** Create a new `ImageObject` type that extends `BaseCanvasObject`, following the same pattern as `RectangleObject`, `CircleObject`, `LineObject`, and `TextObject`. Images get their own shape factory (`imageFactory`) with `toFirestore()` and `fromFirestore()` converters. The image URL (stored in Firebase Storage) becomes a property of the object.

**Architecture:**
```typescript
// types/canvas.ts
export interface ImageObject extends BaseCanvasObject {
  type: "image";
  imageUrl: string;          // Firebase Storage URL
  originalWidth: number;     // Original image dimensions
  originalHeight: number;    // For aspect ratio preservation
  fileName?: string;         // Optional metadata
  fileSize?: number;         // Optional metadata
}

// app/canvas/_lib/shapes.ts - imageFactory
export const imageFactory: ShapeFactory<PersistedImage> = {
  createDefault: (params, overrides, canvasId) => { /* ... */ },
  toFirestore: (image, userId, canvasId) => { /* ... */ },
  fromFirestore: (obj) => { /* ... */ },
  // ... other factory methods
}

// app/canvas/_components/shapes/ImageShape.tsx
// Konva.Image component with transform handles
```

**Pros:**
- **Consistency** - Images work exactly like other objects (select, lock, transform, z-index)
- **Code reuse** - Leverages existing locking system, properties panel, Firestore sync, transform logic
- **Simpler mental model** - Users interact with images the same way as rectangles/circles
- **Future-proof** - Easy to add image-specific properties (filters, cropping) later
- **Layer management** - Images naturally integrate with z-index layering system
- **Multi-select** - When multi-select is implemented, images work automatically

**Cons:**
- **Slightly larger object model** - Images have some properties that don't apply (fill, stroke)
- **Factory abstraction** - Must implement full factory interface even though some methods (like `normalizeDrawing`) may not apply to images

**What we'd need:**
- New `ImageObject` interface in `types/canvas.ts`
- New `imageFactory` in `app/canvas/_lib/shapes.ts`
- New `ImageShape` Konva component in `app/canvas/_components/shapes/`
- Firebase Storage integration functions in `lib/firebase/storage.ts`
- Image upload UI component (file input, drag-drop handler)
- Image loading/caching utilities for Konva
- Security rules for Firebase Storage

---

### Option B: Images as Separate Feature

**Description:** Implement images as a parallel system outside the canvas object types. Store images separately in Firestore (e.g., `canvases/{id}/images` collection), handle them with custom logic instead of shape factories, and render them with special-case code in Canvas.tsx.

**Architecture:**
```typescript
// Separate type system
interface CanvasImage {
  id: string;
  canvasId: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  // ... custom properties
}

// Separate sync hook
useImages({ canvasId, onImagesUpdate })

// Separate rendering logic in Canvas.tsx
{images.map(img => <CustomImageComponent ... />)}
```

**Pros:**
- **Flexibility** - Not constrained by `BaseCanvasObject` interface
- **Isolated complexity** - Image-specific logic stays separate from shape system
- **Custom optimization** - Can optimize image loading/rendering independently

**Cons:**
- **Code duplication** - Must reimplement locking, selection, properties panel, z-index management
- **Inconsistent UX** - Images behave differently from shapes, confusing users
- **Integration complexity** - z-index conflicts between shapes and images, selection mixing issues
- **Harder to maintain** - Two parallel systems instead of one unified system
- **Multi-select complications** - Can't multi-select shapes + images together
- **More code** - Separate hooks, separate components, separate Firestore logic

**What we'd need:**
- Separate image type system and storage schema
- Custom image sync hook (`useImages`)
- Custom image selection/locking logic
- Custom properties panel section for images
- Integration layer to manage z-index across both systems
- Duplicate transform logic for images
- More complex Canvas.tsx rendering logic

---

### Option C: Hybrid Approach (Images as Objects with Extended Features)

**Description:** Start with Option A (images as canvas objects) but add an image-specific feature layer on top. Images are `ImageObject` types that work like other shapes, but have additional capabilities through an extended properties panel and specialized utilities.

**Pros:**
- **Best of both worlds** - Consistency of Option A + flexibility for image-specific features
- **Progressive enhancement** - Start simple, add features incrementally
- **Clear separation of concerns** - Core object behavior unified, advanced features separated

**Cons:**
- **More complex architecture** - Need to design the extension points carefully
- **Potential over-engineering** - May be unnecessary for MVP

**What we'd need:**
- Everything from Option A
- Extended properties panel with image-specific section (filters, crop, replace)
- Image utility functions (crop, filter) as separate modules
- Potentially Cloud Functions for server-side image processing

---

## Technical Considerations

### Architecture Thoughts

**Current System Analysis:**
- Not-Figma follows a clean factory pattern: each object type has a factory with `toFirestore()` and `fromFirestore()` converters
- All objects flow through the same pipeline: User interaction → Local shape → `useObjects` hook → Firestore → Real-time listener → Konva rendering
- Locking system works at the `CanvasObject` level, not shape-specific
- Properties panel dynamically shows relevant properties based on selected object type
- Z-index management works on all `CanvasObject` types uniformly

**Images as Objects Implications:**
- **Firestore document structure:**
  ```javascript
  {
    id: "img_123",
    type: "image",
    canvasId: "canvas_abc",
    // Transform
    x: 100, y: 100,
    width: 400, height: 300,
    rotation: 0,
    // Image-specific
    imageUrl: "https://storage.googleapis.com/...",
    originalWidth: 1600,
    originalHeight: 1200,
    // Standard properties
    opacity: 1,
    zIndex: 5,
    lockedBy: null,
    // Metadata
    createdBy: "user_123",
    createdAt: 1234567890,
    // ... other BaseCanvasObject fields
  }
  ```

- **Konva rendering:** Use `Konva.Image` node, which accepts `HTMLImageElement` as image source
- **Image loading:** Must handle async image loading (use `Konva.Image.fromURL()` or manual HTMLImageElement)
- **Caching:** Konva supports node caching (`node.cache()`) for performance

**Scalability:**
- 50 images on canvas = 50 `ImageObject` documents in Firestore (same as 50 rectangles)
- Real-time listener handles all types uniformly
- Lock system scales the same way (no special handling needed)

### Dependencies & Integrations

**Existing features affected:**
- **Properties Panel** - Add image-specific properties section (file name, dimensions, opacity, replace button)
- **Toolbar** - Add image upload tool (button that opens file dialog or triggers upload flow)
- **Canvas Component** - New `ImageShape` component in render list
- **Object factories** - Register `imageFactory` in factory registry
- **Z-index management** - No changes needed (works automatically)
- **Lock system** - No changes needed (works at `CanvasObject` level)

**New dependencies needed:**
- **Firebase Storage SDK** - Already configured (see `firebaseConfig.storageBucket` in config.ts), need to import: `import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"`
- **Image loading utilities** - May need helper to convert File → HTMLImageElement → Konva.Image
- **File input component** - Use shadcn/ui `Input` with `type="file"` or build custom drag-drop zone
- **Optional: Sharp (Cloud Functions)** - For server-side thumbnail generation (future enhancement)

**Data/state management:**
- **Upload flow:** User uploads → File stored in Firebase Storage → Get download URL → Create ImageObject with URL → Save to Firestore → Real-time sync → Konva renders
- **Image state:** Images are part of `objects` state array (same as rectangles, circles)
- **Loading state:** Need to handle image loading (show placeholder or spinner while image downloads)

### Potential Challenges

**Challenge 1: Image Loading Performance**
- Problem: Large images (5MB+) take time to download and render, may freeze UI or cause flashing
- Possible solutions:
  - **Progressive loading:** Show low-res placeholder while full image loads
  - **Lazy loading:** Only load images in viewport (may be complex with Konva)
  - **Size constraints:** Limit uploads to 5MB or auto-resize on upload
  - **Caching:** Use Konva's built-in caching (`image.cache()`) to improve re-render performance
  - **Thumbnails:** Generate thumbnails via Cloud Function for canvas display, keep originals for export

**Challenge 2: CORS Issues with Firebase Storage URLs**
- Problem: Konva.Image may fail to load images from Firebase Storage if CORS isn't configured
- Possible solutions:
  - **Firebase Storage CORS:** Configure Firebase Storage bucket with proper CORS headers
  - **Same-origin images:** Consider proxying images through Next.js API route (may add latency)
  - **Pre-validate:** Test CORS configuration during development

**Challenge 3: Aspect Ratio Preservation**
- Problem: Users may accidentally distort images by resizing width/height independently
- Possible solutions:
  - **Lock aspect ratio by default:** Konva Transformer supports `enabledAnchors` and aspect ratio locking
  - **Shift-key override:** Hold Shift to unlock aspect ratio (common pattern)
  - **Properties panel toggle:** Add "Lock aspect ratio" checkbox

**Challenge 4: File Size & Storage Costs**
- Problem: Users upload many large images → Firebase Storage costs increase, performance degrades
- Possible solutions:
  - **Size limits:** 5MB per image (or 2MB for MVP)
  - **Dimension limits:** Max 4096x4096 (matches Figma's limit)
  - **Auto-optimization:** Use Cloud Function to compress/resize on upload
  - **Storage quotas:** Track usage per user/canvas, show warnings

**Challenge 5: Security - Preventing Malicious Uploads**
- Problem: Users could upload executable files disguised as images, or very large files
- Possible solutions:
  - **Client-side validation:** Check file type (`image/png`, `image/jpeg`, `image/webp`) and size before upload
  - **Server-side validation:** Firebase Storage Security Rules to enforce file types and sizes
  - **Virus scanning:** Consider Cloud Function integration with scanning service (overkill for MVP)

**Challenge 6: Real-time Collaboration with Large Images**
- Problem: When user uploads large image, all collaborators must download it → bandwidth spike
- Possible solutions:
  - **Progressive sync:** Share thumbnail first, full image loads in background
  - **Notification system:** Show "User uploaded image..." notification while loading
  - **Bandwidth awareness:** Detect slow connections, offer lower-quality option

---

## User Experience Sketch

### User Flow Ideas - Drag & Drop Upload (MVP)

1. **User hovers image file over canvas** (from desktop/Finder)
2. **Canvas shows drop zone indicator** (dashed border, "Drop image here" message)
3. **User releases mouse** (drops file)
4. **System validates file** (type, size)
   - If invalid → Show error toast: "Invalid file type. Please upload PNG, JPG, or WEBP"
   - If valid → Continue
5. **Upload starts** (show progress indicator at drop location)
6. **File uploads to Firebase Storage** (shows spinner/skeleton)
7. **Get download URL**
8. **Create ImageObject** with URL, position (drop location), dimensions (original or scaled)
9. **Save to Firestore** (optimistic update - show immediately)
10. **Real-time sync** (all collaborators see the image appear)
11. **Image loads in Konva** (HTMLImageElement downloads, renders)
12. **Completion** (image fully rendered, selectable, transformable)

**Error handling:**
- Upload fails → Show error toast, remove placeholder
- Image load fails (404, CORS) → Show broken image icon, allow user to delete or retry

### User Flow Ideas - Paste from Clipboard (Phase 2)

1. **User copies image** (screenshot, image from web, file)
2. **User focuses canvas** (clicks on canvas area)
3. **User presses Cmd+V** (Ctrl+V on Windows)
4. **System detects clipboard data** (check for `image/*` type)
5. **Extract image as File/Blob**
6. **Continue with upload flow** (same as drag-drop from step 4)
7. **Image appears at canvas center** (or cursor location if tracked)

### User Flow Ideas - File Picker Dialog (Fallback)

1. **User clicks "Upload Image" button in toolbar**
2. **File picker dialog opens** (native OS file browser)
3. **User selects image(s)** (support multi-select?)
4. **For each file:**
   - Upload to Firebase Storage
   - Create ImageObject at canvas center (or in grid if multiple)
   - Save to Firestore
5. **Images appear on canvas**

### UI/UX Considerations

**Interface elements needed:**
- **Toolbar button:** Camera/image icon (lucide-react `ImagePlus` or `Image`)
- **Drop zone overlay:** Full-canvas overlay when dragging file over canvas (with visual feedback)
- **Upload progress:** Spinner or progress bar at image location while uploading
- **Loading state:** Skeleton or placeholder while image downloads
- **Error state:** Broken image icon or error message if image fails to load
- **Properties panel section:**
  - Image file name (read-only)
  - Original dimensions (read-only, e.g., "1920 x 1080")
  - Current dimensions (editable width/height inputs)
  - Aspect ratio lock toggle
  - Opacity slider (reuse existing)
  - Replace button (opens file picker to swap image while preserving position/size)
  - Delete button (reuse existing)

**Feedback mechanisms:**
- **Upload progress:** Show percentage or spinner
- **Success:** Toast notification "Image uploaded successfully"
- **Error:** Toast with specific error message
- **Loading:** Subtle spinner on image while downloading
- **Collaborator upload:** "(User) uploaded an image" notification

**Error handling:**
- **File too large:** "Image must be under 5MB. Please resize and try again."
- **Invalid format:** "Unsupported format. Please use PNG, JPG, or WEBP."
- **Upload failed:** "Upload failed. Check your connection and try again."
- **Load failed:** Show broken image icon with tooltip "Image failed to load" + retry button
- **CORS error:** (Should not happen if configured correctly, but) "Image unavailable. Please contact support."

---

## Open Questions & Discussion Points

### Decision Points

- [ ] **Architecture: Canvas Object vs Separate Feature**
  - Considerations: Code reuse, consistency, future extensibility, complexity
  - **Recommendation:** Canvas Object (Option A) for MVP - simpler, more consistent, leverages existing systems

- [ ] **MVP Upload Methods Priority**
  - Considerations: Development time, user needs, complexity
  - **Recommendation:**
    1. Drag-and-drop (most intuitive for designers)
    2. Clipboard paste (high value, moderate effort)
    3. File picker button (fallback, easiest to implement)
    4. URL import (future enhancement)

- [ ] **Image Size Constraints**
  - Considerations: Storage costs, performance, user needs
  - **Recommendation:**
    - Max file size: 5MB (can increase later)
    - Max dimensions: 4096 x 4096 (matches Figma)
    - Auto-scale if exceeds dimensions (preserve aspect ratio)

- [ ] **Thumbnail Generation Strategy**
  - Considerations: Performance vs complexity, storage costs
  - **Recommendation:**
    - **MVP:** Display full images, rely on Konva caching and size constraints
    - **Phase 2:** Add Cloud Function for thumbnail generation (e.g., 1024px max dimension)

- [ ] **Aspect Ratio Behavior**
  - Considerations: User control vs preventing distortion
  - **Recommendation:** Lock aspect ratio by default, Shift-key to unlock (standard behavior)

### Unknowns

- **Firebase Storage quotas:** What are the free tier limits? (5GB storage, 1GB/day downloads for Spark plan)
- **Konva image caching performance:** How many images can we cache before memory issues? (Need to test)
- **CORS configuration:** Do we need to configure Firebase Storage CORS manually? (Yes, via gsutil or Cloud Console)
- **Multi-image upload:** Should drag-drop support uploading multiple images at once? (Nice to have, not MVP)

### Trade-offs to Discuss

- **Performance vs Feature Richness:**
  - Display full images (simpler) vs generate thumbnails (better performance)
  - Client-side resize (faster to implement) vs server-side (better quality)

- **Storage Costs vs User Experience:**
  - Strict file size limits (lower costs) vs generous limits (better UX)
  - Delete old images automatically vs keep forever (cost vs data preservation)

- **Complexity vs Consistency:**
  - Images as objects (more consistent) vs separate feature (more flexible)
  - Reuse properties panel vs custom image panel (consistency vs specialization)

---

## Rough Implementation Thoughts

### Core Components Needed

1. **ImageObject Type & Factory**
   - Purpose: Define image data structure and conversion logic
   - Rough approach:
     - Add `ImageObject` interface to `types/canvas.ts`
     - Create `imageFactory` in `app/canvas/_lib/shapes.ts`
     - Implement `toFirestore()` and `fromFirestore()` converters
     - Register factory in `shapeFactories` registry

2. **Firebase Storage Integration**
   - Purpose: Upload images, get download URLs
   - Rough approach:
     - Create `lib/firebase/storage.ts` with upload functions
     - `uploadImage(file: File, canvasId: string) => Promise<string>` - returns download URL
     - Organize storage: `images/{canvasId}/{imageId}.{ext}`
     - Security rules to restrict uploads to authenticated users

3. **ImageShape Konva Component**
   - Purpose: Render images on canvas with transform handles
   - Rough approach:
     - Create `app/canvas/_components/shapes/ImageShape.tsx`
     - Use `Konva.Image` with `HTMLImageElement` source
     - Implement transform callbacks (drag, resize, rotate)
     - Add lock indicator overlay (reuse from other shapes)
     - Handle loading states (show placeholder while image loads)

4. **Image Upload UI Components**
   - Purpose: Handle file selection, drag-drop, clipboard paste
   - Rough approach:
     - Add "Upload Image" button to Toolbar
     - Create `ImageUploadDropZone` component (overlay on canvas)
     - Implement drag-over, drop event handlers in Canvas.tsx
     - Clipboard paste handler (`onPaste` listener)
     - File validation utilities (type, size checks)

5. **Properties Panel Extension**
   - Purpose: Show image-specific properties
   - Rough approach:
     - Extend `PropertiesPanel.tsx` with image section
     - Show file name, original dimensions (read-only)
     - Current dimensions with aspect ratio lock toggle
     - Opacity slider (reuse existing)
     - Replace image button
     - Delete button (reuse existing)

6. **Image Loading & Caching Utilities**
   - Purpose: Efficiently load and cache images
   - Rough approach:
     - Create `app/canvas/_lib/image-utils.ts`
     - `loadImage(url: string) => Promise<HTMLImageElement>`
     - LRU cache for image elements (limit 50-100 images)
     - Error handling for failed loads

### Integration Points

**Frontend:**
- **Canvas.tsx:**
  - Add drag-drop event handlers (onDragOver, onDrop)
  - Add clipboard paste handler (onPaste)
  - Render `ImageShape` components in shapes list
  - Show drop zone overlay when dragging files

- **Toolbar.tsx:**
  - Add "Upload Image" button (opens file picker)
  - Tool icon: `ImagePlus` from lucide-react

- **PropertiesPanel.tsx:**
  - Add image-specific section (conditionally shown when image selected)
  - Image dimensions, file name, replace button

**Backend:**
- **Firebase Storage:**
  - Upload function: `uploadImage(file, canvasId, imageId)`
  - Storage path: `images/{canvasId}/{imageId}.{ext}`
  - Get download URL after upload

- **Firestore:**
  - ImageObject stored in same collection as other objects: `canvases/{canvasId}/objects/{imageId}`
  - Uses existing `useObjects` hook (no changes needed)

- **Security Rules:**
  - Storage rules: Allow authenticated users to upload images to their canvases
  - Firestore rules: ImageObject follows same rules as other CanvasObject types

**APIs/Services:**
- **Firebase Storage API:** Upload, download, delete
- **Konva Image API:** Load, render, cache images
- **File API:** Read File/Blob from drag-drop or clipboard
- **Optional - Cloud Functions:** Thumbnail generation (Phase 2)

---

## Success Criteria (Preliminary)

### MVP Success Metrics

- **Functional:**
  - User can drag-and-drop PNG/JPG/WEBP images onto canvas
  - Images appear at drop location with correct aspect ratio
  - Images can be selected, moved, resized (with aspect ratio lock), rotated
  - Images sync in real-time across all collaborators
  - Images persist across sessions (saved to Firestore)
  - Lock system prevents edit conflicts on images
  - Images respect z-index layering with other objects

- **Performance:**
  - Images under 2MB load within 2 seconds on average connection
  - Canvas remains at 60 FPS with up to 20 images
  - No memory leaks after uploading/deleting 50+ images

- **UX:**
  - Clear visual feedback during upload (progress indicator)
  - Error messages for invalid files (type, size)
  - Properties panel shows image metadata (dimensions, file name)

### Phase 2 Success Metrics

- Clipboard paste works for screenshots and copied images
- File picker dialog for fallback upload
- Thumbnail generation for images > 1MB (faster loading)
- Replace image functionality (swap without losing position/size)

---

## Next Steps

### Before Moving to PRD

- [ ] **Decide on architecture approach** - Confirm images as canvas objects (Option A)
- [ ] **Prioritize upload methods** - Drag-drop first, clipboard second, file picker third
- [ ] **Define size constraints** - Max 5MB file size, 4096x4096 dimensions
- [ ] **Validate Firebase Storage setup** - Confirm storage bucket configured, test CORS
- [ ] **Determine thumbnail strategy** - MVP: no thumbnails, rely on size limits and caching
- [ ] **Aspect ratio behavior** - Lock by default, Shift to unlock

### To Prepare for PRD Creation

- **Test Firebase Storage upload** - Write proof-of-concept to upload image and get URL
- **Prototype Konva.Image rendering** - Test loading image from URL in Konva, verify performance
- **Research CORS configuration** - Document how to configure Firebase Storage CORS for image loading
- **Estimate Firebase costs** - Calculate storage costs for various usage levels (10 users, 100 users, etc.)
- **Design upload UI mockup** - Sketch drag-drop zone overlay, upload button, properties panel section

---

## Discussion Notes

_Space to capture thoughts during the conversation_

### Architectural Decision: Images as Canvas Objects

**Rationale for Recommendation (Option A):**
- Not-Figma already has a robust, well-tested object system with factories, locking, and sync
- Adding `ImageObject` as another type is straightforward - minimal new concepts
- Properties panel is already type-aware (shows different properties for rectangles vs circles vs lines)
- Lock system works at `CanvasObject` level - images get locking for free
- Z-index management uniform across all types - images naturally layer with shapes
- Future features (multi-select, copy/paste, undo/redo) will automatically work with images

**Why not Option B (Separate Feature)?**
- Would require duplicating selection logic, locking logic, properties panel integration
- Creates confusion: "Why can't I select an image and a rectangle together?"
- Harder to maintain two parallel systems
- z-index conflicts: Images on a separate layer can't interleave with shapes

**Why not Option C (Hybrid)?**
- Adds complexity without clear benefit for MVP
- Can always add image-specific features later as extensions to Option A
- YAGNI principle: Start simple, add complexity when actually needed

### Upload Method Priority

1. **Drag-and-drop** - Most intuitive for designers, matches Figma/Canva, expected behavior
2. **Clipboard paste** - High value (screenshots!), moderate complexity (clipboard API well-supported)
3. **File picker button** - Fallback for users who prefer traditional upload, easiest to implement
4. **URL import** - Future enhancement, useful for remote images but adds validation complexity

### Performance Strategy

**MVP:** Keep it simple
- Size limits (5MB file, 4096x4096 dimensions) prevent most performance issues
- Konva's built-in caching handles re-render performance
- Firebase Storage CDN handles image delivery
- Test with 20-30 images, should be fine for MVP

**Phase 2:** Optimize if needed
- Cloud Function for thumbnail generation (Sharp library)
- Lazy loading (only load images in viewport - complex with Konva)
- Progressive loading (low-res placeholder → full image)

### Firebase Storage Considerations

**Storage structure:** `images/{canvasId}/{imageId}.{ext}`
- Organized by canvas for easy cleanup
- imageId matches Firestore object ID for consistency
- Preserve file extension for MIME type detection

**Security rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /images/{canvasId}/{imageId} {
      allow read: if request.auth != null; // Authenticated users can read
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024  // 5MB limit
                   && request.resource.contentType.matches('image/.*'); // Images only
    }
  }
}
```

**CORS configuration:** Required for Konva to load images from different origin
```json
[
  {
    "origin": ["http://localhost:3000", "https://your-domain.com"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

---

## Transition to PRD

Once we've discussed and aligned on the approach, we'll create a formal PRD that includes:

- **Structured requirements** - Detailed functional and non-functional requirements
- **Phased implementation plan** - Step-by-step tasks with dependencies
- **Specific code changes and files** - Exact files to create/modify, with code snippets
- **Detailed acceptance criteria** - Testable conditions for each feature
- **Technical specifications** - API contracts, data schemas, component interfaces
- **Error handling** - Comprehensive error scenarios and UX responses
- **Testing plan** - Unit tests, integration tests, manual testing checklist

---

## Research References

### Industry Best Practices

**Figma's Approach:**
- Images treated as rectangles with image fill (not separate object type)
- Max 4096x4096 pixels (auto-scaled if larger)
- Supports drag-drop, paste, and "Place Image" command
- File > Place Image for controlled placement

**Canva's Approach:**
- Drag-drop and upload from various sources
- Automatic optimization for web performance
- Background removal and filters as premium features

**Konva.js Image Optimization:**
- Use `image.cache()` for performance boost
- Disable event listening (`listening: false`) for non-interactive images
- Reuse HTMLImageElement instances (LRU cache)
- Hide/remove images when off-screen or invisible
- On mobile: adjust pixelRatio to reduce scaling overhead

**Firebase Storage Best Practices:**
- Organize by feature/user for easy management
- Use Cloud Functions for server-side processing (thumbnails, optimization)
- Set size limits in security rules
- Configure CORS for client-side access
- Consider CDN for frequently accessed images (Firebase Storage has built-in CDN)

### Technical Documentation

- [Konva.Image API](https://konvajs.org/api/Konva.Image.html)
- [Konva Performance Tips](https://konvajs.org/docs/performance/All_Performance_Tips.html)
- [Firebase Storage Upload Files](https://firebase.google.com/docs/storage/web/upload-files)
- [Firebase Storage Security Rules](https://firebase.google.com/docs/storage/security/start)
- [File API - Reading files](https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications)
- [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)

---

## Appendix: Example Code Sketches

### ImageObject Type Definition

```typescript
// types/canvas.ts
export interface ImageObject extends BaseCanvasObject {
  type: "image";
  imageUrl: string;          // Firebase Storage download URL
  originalWidth: number;     // Original image width (for aspect ratio)
  originalHeight: number;    // Original image height
  fileName?: string;         // Original file name (e.g., "logo.png")
  fileSize?: number;         // File size in bytes (for metadata)
}

// Add to union type
export type CanvasObject =
  | RectangleObject
  | CircleObject
  | LineObject
  | TextObject
  | ImageObject;  // NEW
```

### Image Upload Function

```typescript
// lib/firebase/storage.ts
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Upload image to Firebase Storage
 * @param file - Image file to upload
 * @param canvasId - Canvas ID for organization
 * @param imageId - Unique image ID (matches Firestore doc ID)
 * @returns Download URL for the uploaded image
 */
export async function uploadImage(
  file: File,
  canvasId: string,
  imageId: string
): Promise<string> {
  const storage = getStorage();
  const fileExt = file.name.split('.').pop() || 'png';
  const storagePath = `images/${canvasId}/${imageId}.${fileExt}`;
  const storageRef = ref(storage, storagePath);

  // Upload file
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      originalFileName: file.name,
    }
  });

  // Get download URL
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

/**
 * Validate image file
 * @param file - File to validate
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please use PNG, JPG, or WEBP.' };
  }

  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 5MB.' };
  }

  return { valid: true };
}
```

### Image Factory Skeleton

```typescript
// app/canvas/_lib/shapes.ts
export const imageFactory: ShapeFactory<PersistedImage> = {
  createDefault: (
    { x, y, width, height }: DrawingBounds,
    overrides?: Partial<PersistedImage>,
    canvasId?: string
  ): PersistedImage => {
    return {
      id: generateObjectId(),
      type: "image",
      canvasId: canvasId || "",
      x,
      y,
      width,
      height,
      imageUrl: overrides?.imageUrl || "",
      originalWidth: overrides?.originalWidth || width,
      originalHeight: overrides?.originalHeight || height,
      fileName: overrides?.fileName,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      lockedBy: null,
      lockedAt: null,
      lockTimeout: LOCK_TIMEOUT_MS,
      ...overrides,
    };
  },

  toFirestore: (image: PersistedImage, userId: string, canvasId?: string): ImageObject => {
    const now = Date.now();
    return {
      id: image.id,
      type: "image",
      canvasId: canvasId || "",
      createdBy: userId,
      createdAt: now,
      updatedBy: userId,
      updatedAt: now,
      lockedBy: image.lockedBy,
      lockedAt: image.lockedAt,
      lockTimeout: image.lockTimeout,
      x: image.x,
      y: image.y,
      width: image.width,
      height: image.height,
      rotation: image.rotation,
      imageUrl: image.imageUrl,
      originalWidth: image.originalWidth,
      originalHeight: image.originalHeight,
      fileName: image.fileName,
      fileSize: image.fileSize,
      // Image-specific: no fill/stroke, but keep for BaseCanvasObject compliance
      fill: "transparent",
      fillOpacity: image.opacity,
      stroke: "transparent",
      strokeWidth: 0,
      strokeOpacity: 0,
      strokeStyle: "solid",
      zIndex: image.zIndex,
      locked: false,
      visible: true,
    };
  },

  fromFirestore: (obj: CanvasObject): PersistedImage | null => {
    if (obj.type !== "image") return null;
    const imgObj = obj as ImageObject;
    return {
      id: imgObj.id,
      type: "image",
      canvasId: imgObj.canvasId,
      x: sanitizeNumber(imgObj.x, 0),
      y: sanitizeNumber(imgObj.y, 0),
      width: sanitizeNumber(imgObj.width, 100, 1, 10000),
      height: sanitizeNumber(imgObj.height, 100, 1, 10000),
      imageUrl: imgObj.imageUrl,
      originalWidth: sanitizeNumber(imgObj.originalWidth, 100),
      originalHeight: sanitizeNumber(imgObj.originalHeight, 100),
      fileName: imgObj.fileName,
      fileSize: imgObj.fileSize,
      rotation: sanitizeNumber(imgObj.rotation, 0),
      opacity: sanitizeNumber(imgObj.fillOpacity, 1, 0, 1),
      zIndex: sanitizeNumber(imgObj.zIndex, 0),
      lockedBy: imgObj.lockedBy,
      lockedAt: imgObj.lockedAt,
      lockTimeout: imgObj.lockTimeout,
    };
  },

  validateSize: (image: PersistedImage): boolean => {
    return image.width >= 5 && image.height >= 5;
  },

  // Images are placed at cursor/drop location, not drawn like shapes
  normalizeDrawing: (start: Point): DrawingBounds => {
    return { x: start.x, y: start.y, width: 100, height: 100 };
  },

  getDraftData: () => null, // No draft preview for images
};
```

### Drag-Drop Handler Sketch

```typescript
// app/canvas/_components/Canvas.tsx (additions)

const [isDraggingFile, setIsDraggingFile] = useState(false);

const handleDragOver = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();

  // Check if dragging file
  if (e.dataTransfer.types.includes('Files')) {
    setIsDraggingFile(true);
  }
}, []);

const handleDragLeave = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDraggingFile(false);
}, []);

const handleDrop = useCallback(async (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDraggingFile(false);

  const files = Array.from(e.dataTransfer.files);
  const imageFiles = files.filter(f => f.type.startsWith('image/'));

  if (imageFiles.length === 0) return;

  // Get drop position in canvas coordinates
  const stage = stageRef.current;
  if (!stage) return;

  const pointerPos = stage.getPointerPosition();
  if (!pointerPos) return;

  // Transform to canvas coordinates (account for zoom/pan)
  const transform = stage.getAbsoluteTransform().copy().invert();
  const canvasPos = transform.point(pointerPos);

  // Upload each image
  for (const file of imageFiles) {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      // Show error toast
      console.error(validation.error);
      continue;
    }

    try {
      const imageId = generateObjectId();

      // Upload to Firebase Storage
      const imageUrl = await uploadImage(file, canvasId, imageId);

      // Get image dimensions
      const img = await loadImage(URL.createObjectURL(file));

      // Create image object
      const imageObject = imageFactory.createDefault(
        {
          x: canvasPos.x,
          y: canvasPos.y,
          width: img.width,
          height: img.height,
        },
        {
          imageUrl,
          originalWidth: img.width,
          originalHeight: img.height,
          fileName: file.name,
          fileSize: file.size,
        },
        canvasId
      );

      // Save to Firestore (via useObjects hook)
      await saveObject(imageObject);

    } catch (error) {
      console.error('Image upload failed:', error);
      // Show error toast
    }
  }
}, [canvasId, saveObject]);
```
