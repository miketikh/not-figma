# Multiple Canvases - Implementation Task List

## Context

Transform the single-canvas collaborative workspace into a multi-canvas application where users can create, manage, and switch between multiple independent canvases. Currently, all users land on the same hardcoded canvas (`canvas-session-default`) with all objects stored in a flat collection with no grouping or isolation. This feature will enable users to organize projects separately, improve scalability with smaller datasets per canvas, and provide a professional UX pattern similar to industry-standard tools like Figma and Miro.

The implementation uses a nested Firestore collection structure (`canvases/{canvasId}/objects/{objectId}`) for clean data hierarchy and automatic cascade deletion. The Realtime Database will use dynamic session paths (`sessions/{canvasId}/cursors` and `sessions/{canvasId}/presence`) instead of the hardcoded session ID. Each canvas will have metadata including name, dimensions (width/height in pixels), owner, and timestamps. The new routing structure will use `/canvas` as a dashboard page and `/canvas/[canvasId]` for individual canvas editing.

This is a major architectural change affecting the data layer, routing, components, and hooks throughout the application. The implementation is broken into 5 phases to minimize risk: (1) data model & backend, (2) dashboard UI, (3) dynamic routing & session management, (4) data migration, and (5) security & polish. Existing data will be migrated to a "Default Canvas" per user to ensure backwards compatibility with no data loss.

---

## Instructions for AI Agent

### Workflow for Each PR

1. **Read the entire PR first**: Review all tasks and file changes before starting
2. **Complete all tasks sequentially**:
   - Work through tasks in order
   - Mark completed tasks with `[x]`
   - If a task references "see planning doc," check the planning document for additional context
3. **Run linting**: Execute `npm run lint` after completing all tasks
4.**Update**: After, check off all the items you completed in this doc, then return a summary

### Implementation Guidelines

- **Use existing patterns**: Follow the codebase's established conventions
- **File descriptions are hints**: "Files Changed" lists likely files, but you may need to modify others
- **Don't over-engineer**: Implement the simplest solution that works
- **Test incrementally**: After each major task, verify it works before moving on
- **Ask if blocked**: If requirements are unclear or you encounter unexpected issues, ask before proceeding

---

## Phase 1: Data Model & Backend Infrastructure

### PR #1: Create Canvas Type Definitions and Constants
**Goal:** Establish the Canvas interface and configuration constants without touching existing functionality

**Tasks:**
- [x] Add `Canvas` interface to `types/canvas.ts` with fields: id, name, width, height, createdBy, createdAt, updatedAt, isPublic
- [x] Add `canvasId` field to `BaseCanvasObject` interface in `types/canvas.ts`
- [x] Create `lib/constants/canvas.ts` with default canvas name ("Untitled Canvas"), default dimensions (1920x1080), dimension presets array, min/max dimension values (100-10000), and max name length (100)
- [x] Export all new types and constants

**What to Test:**
- Run `npm run lint` to verify TypeScript compilation
- Import the new types in a test file to verify they're accessible
- Check that no existing functionality is broken

**Files Changed:**
- `types/canvas.ts` - Add Canvas interface and update BaseCanvasObject
- `lib/constants/canvas.ts` - NEW: Canvas configuration constants

**Notes:** This PR only adds types and constants, no runtime code changes yet

---

### PR #2: Create Canvas CRUD Operations
**Goal:** Implement Firestore operations for canvas management using nested collection structure

**Tasks:**
- [x] Create `lib/firebase/canvas.ts` with canvas CRUD functions
- [x] Implement `createCanvas(userId: string, name: string, width: number, height: number)` - creates canvas document in `canvases` collection
- [x] Implement `getCanvas(canvasId: string)` - fetches single canvas by ID
- [x] Implement `getUserCanvases(userId: string)` - queries canvases where createdBy equals userId, ordered by createdAt desc
- [x] Implement `updateCanvas(canvasId: string, updates: Partial<Canvas>)` - updates canvas metadata (name, dimensions, updatedAt)
- [x] Implement `deleteCanvas(canvasId: string)` - deletes canvas document (Firestore will cascade delete the objects subcollection)
- [x] Implement `subscribeToCanvas(canvasId: string, callback: (canvas: Canvas | null) => void)` - real-time listener for single canvas
- [x] Implement `subscribeToUserCanvases(userId: string, callback: (canvases: Canvas[]) => void)` - real-time listener for user's canvas list
- [x] Add proper error handling and TypeScript types to all functions

**What to Test:**
- Run `npm run lint` to verify no TypeScript errors
- Test canvas operations in Firebase console or create a simple test script
- Verify canvas documents are created with correct structure in Firestore
- Check that subscriptions properly clean up listeners

**Files Changed:**
- `lib/firebase/canvas.ts` - NEW: Canvas CRUD operations
- `types/canvas.ts` - May need to import Canvas type if not already

**Notes:** Use nested collection structure: `canvases/{canvasId}/objects/{objectId}`. The canvas document only contains metadata, objects go in the subcollection.

---

### PR #3: Update Firestore Object Operations for Canvas Scoping
**Goal:** Modify existing object CRUD operations to work with nested collection structure and canvas scoping

**Tasks:**
- [x] Update `lib/firebase/firestore.ts` to change collection path from flat `canvasObjects` to nested `canvases/{canvasId}/objects`
- [x] Add `canvasId` parameter to `addObject(canvasId: string, object: CanvasObject)` function
- [x] Add `canvasId` parameter to `updateObject(canvasId: string, id: string, updates: Partial<CanvasObject>)` function
- [x] Add `canvasId` parameter to `deleteObject(canvasId: string, id: string)` function
- [x] Add `canvasId` parameter to `getAllObjects(canvasId: string)` function
- [x] Update `subscribeToObjects(canvasId: string, callback: (objects: CanvasObject[]) => void)` to use nested collection path
- [x] Update all lock functions (acquireLock, releaseLock, renewLock, canEdit) to accept `canvasId` parameter and use nested collection path
- [x] Update helper function `getObjectRef(canvasId: string, id: string)` to use nested path
- [x] Ensure all Firestore queries are scoped to the correct canvas

**What to Test:**
- Run `npm run lint` to verify TypeScript compilation
- Temporarily test by hardcoding a canvasId and verifying object operations work
- Check Firestore console to verify objects are created in nested structure
- Verify that changing the canvasId creates objects in different collections

**Files Changed:**
- `lib/firebase/firestore.ts` - Major refactor to add canvasId parameter to all operations

**Notes:** This is a breaking change to the API but doesn't affect the UI yet since we're not calling these functions with canvasId yet. The next phase will wire up the UI.

---

### PR #4: Update Realtime Database for Dynamic Session IDs
**Goal:** Replace hardcoded session ID with dynamic canvasId parameter for cursors and presence

**Tasks:**
- [x] Update `lib/firebase/realtime.ts` to remove the hardcoded `SESSION_ID = "canvas-session-default"` constant
- [x] Add `canvasId` parameter to `updateCursorPosition(canvasId: string, userId: string, x: number, y: number)` function
- [x] Add `canvasId` parameter to `subscribeToCursors(canvasId: string, callback: (cursors: Cursor[]) => void)` function
- [x] Add `canvasId` parameter to `removeCursor(canvasId: string, userId: string)` function
- [x] Add `canvasId` parameter to `updatePresence(canvasId: string, userId: string, userData: UserPresence)` function
- [x] Add `canvasId` parameter to `subscribeToPresence(canvasId: string, callback: (users: Record<string, UserPresence>) => void)` function
- [x] Add `canvasId` parameter to `removePresence(canvasId: string, userId: string)` function
- [x] Update all database path references to use `sessions/${canvasId}/cursors/` and `sessions/${canvasId}/presence/` instead of hardcoded session ID
- [x] Add helper function `getSessionPath(canvasId: string, type: 'cursors' | 'presence'): string` for consistent path generation

**What to Test:**
- Run `npm run lint` to verify TypeScript compilation
- Temporarily test by hardcoding a canvasId and verifying cursor/presence operations work
- Check Realtime Database console to verify data is written to correct paths
- Verify that changing the canvasId creates separate cursor/presence sessions

**Files Changed:**
- `lib/firebase/realtime.ts` - Major refactor to add canvasId parameter to all operations

**Notes:** This is also a breaking change but doesn't affect UI yet. The session paths will now be dynamic based on canvasId.

---

## Phase 2: Canvas Dashboard UI

### PR #5: Create useCanvases Hook
**Goal:** Provide React hook interface for canvas CRUD operations with loading states and error handling

**Tasks:**
- [x] Create `app/canvas/_hooks/useCanvases.ts` hook
- [x] Implement canvas list subscription using `subscribeToUserCanvases` from canvas.ts
- [x] Add loading state while fetching canvases
- [x] Add error state for failed operations
- [x] Implement `createCanvas(name: string, width: number, height: number)` function that uses current user ID
- [x] Implement `deleteCanvas(canvasId: string)` function with error handling
- [x] Return { canvases, loading, error, createCanvas, deleteCanvas } from hook
- [x] Add proper cleanup of subscription on unmount

**What to Test:**
- Run `npm run lint` to verify TypeScript compilation
- Create a test component that uses the hook to verify it returns correct data shape
- Verify the hook properly subscribes and unsubscribes

**Files Changed:**
- `app/canvas/_hooks/useCanvases.ts` - NEW: Canvas list management hook

**Notes:** This hook will be used by the dashboard to manage the user's canvas list

---

### PR #6: Create Canvas Card Component
**Goal:** Build reusable card component to display individual canvas information

**Tasks:**
- [x] Create `app/canvas/_components/CanvasCard.tsx` component
- [x] Accept props: canvas (Canvas type), onClick handler, onDelete handler
- [x] Display canvas name prominently (truncate if too long)
- [x] Display canvas dimensions (e.g., "1920 × 1080")
- [x] Display creation date (formatted, e.g., "Created Jan 15, 2025")
- [x] Add hover state that reveals delete button
- [x] Style delete button as icon button in corner (use Trash2 from lucide-react)
- [x] Add click handler for entire card (navigates to canvas)
- [x] Add click handler for delete button (stops propagation, calls onDelete)
- [x] Use existing UI components from shadcn/ui (Card, Button)
- [x] Add proper TypeScript types for all props

**What to Test:**
- Run `npm run lint` to verify no issues
- Create a test page that renders CanvasCard with sample data
- Verify hover state shows delete button
- Verify click handlers work correctly
- Test with long canvas names to ensure truncation

**Files Changed:**
- `app/canvas/_components/CanvasCard.tsx` - NEW: Canvas card component

**Notes:** Use date-fns or similar for date formatting (check if already in package.json first)

---

### PR #7: Create Canvas Creation Modal
**Goal:** Build modal for creating new canvases with name and dimension inputs

**Tasks:**
- [x] Create `app/canvas/_components/CreateCanvasModal.tsx` component
- [x] Accept props: open (boolean), onClose handler, onCreate handler
- [x] Use Dialog component from shadcn/ui for modal structure
- [x] Add form with canvas name input (required, max 100 characters)
- [x] Add dimension preset selector (radio or dropdown): "1920×1080 (HD)", "1024×768 (Standard)", "800×600 (Small)", "Custom"
- [x] Add custom dimension inputs (width and height, only shown when "Custom" selected)
- [x] Implement form validation: name required, dimensions must be 100-10000
- [x] Use dimension constants from `lib/constants/canvas.ts`
- [x] Add Cancel and Create buttons
- [x] Clear form state on close
- [x] Call onCreate with (name, width, height) on submit
- [x] Add proper loading state during creation
- [x] Use existing form components from shadcn/ui (Input, Label, Button, RadioGroup or Select)

**What to Test:**
- Run `npm run lint` to verify no issues
- Test modal opens and closes correctly
- Test form validation (empty name, invalid dimensions)
- Test all preset options
- Test custom dimensions input
- Verify form clears on close
- Test with extremely long names to verify max length

**Files Changed:**
- `app/canvas/_components/CreateCanvasModal.tsx` - NEW: Canvas creation modal

**Notes:** Use react-hook-form if it's already in package.json, otherwise use controlled inputs with useState

---

### PR #8: Transform Canvas Page into Dashboard
**Goal:** Convert the current canvas page into a canvas list/dashboard with create, view, delete functionality

**Tasks:**
- [x] Backup current `app/canvas/page.tsx` content (we'll move it to `[canvasId]` route later)
- [x] Completely rewrite `app/canvas/page.tsx` as canvas dashboard
- [x] Import and use `useCanvases` hook to get user's canvas list
- [x] Import and use `useAuth` hook to get current user
- [x] Add page header with "My Canvases" title and user info
- [x] Add "New Canvas" button that opens CreateCanvasModal
- [x] Render grid of CanvasCard components (use CSS Grid, 3-4 columns)
- [x] Handle create canvas: open modal, call createCanvas from hook, navigate to new canvas on success
- [x] Handle delete canvas: show confirmation dialog, call deleteCanvas from hook
- [x] Add empty state when user has no canvases ("No canvases yet" with create button)
- [x] Add loading state while fetching canvases (skeleton or spinner)
- [x] Add error state if fetching fails
- [x] Use useRouter from next/navigation for navigation to `/canvas/[canvasId]`

**What to Test:**
- Open `/canvas` route in browser
- Verify "New Canvas" button is visible
- Click "New Canvas" and create a canvas with name and dimensions
- Verify canvas appears in grid after creation
- Verify navigation doesn't happen yet (route doesn't exist, that's Phase 3)
- Hover over canvas card and click delete, verify confirmation and deletion
- Test with zero canvases (empty state)
- Test with multiple canvases (grid layout)
- Run `npm run lint` to verify no issues

**Files Changed:**
- `app/canvas/page.tsx` - Complete rewrite as dashboard
- (Save old content to restore in Phase 3)

**Notes:** The old canvas page content will be moved to `app/canvas/[canvasId]/page.tsx` in Phase 3

---

## Phase 3: Dynamic Canvas Routing & Session Management

### PR #9: Create Dynamic Canvas Route with Canvas Metadata Hook
**Goal:** Set up `/canvas/[canvasId]` route and create hook to fetch individual canvas metadata

**Tasks:**
- [x] Create `app/canvas/_hooks/useCanvas.ts` hook
- [x] Implement canvas subscription using `subscribeToCanvas` from canvas.ts
- [x] Add loading state while fetching canvas
- [x] Add error state for canvas not found or fetch failure
- [x] Return { canvas, loading, error } from hook
- [x] Add proper cleanup of subscription on unmount
- [x] Create directory `app/canvas/[canvasId]/`
- [x] Create `app/canvas/[canvasId]/page.tsx` with async function that extracts canvasId from params
- [x] Move the backed-up canvas page content from PR #8 into this new file
- [x] Update the page to accept canvasId from route params: `const params = await props.params; const { canvasId } = params;`
- [x] Use `useCanvas` hook to fetch canvas metadata
- [x] Show loading state while canvas is being fetched
- [x] Show 404 error if canvas not found with link back to dashboard
- [x] Pass canvasId to Canvas component (we'll update Canvas to accept it in next PR)

**What to Test:**
- Run `npm run lint` to verify TypeScript compilation
- Navigate to `/canvas/test-id` in browser
- Verify loading state appears briefly
- Verify 404 error shows for non-existent canvas
- Create a canvas in dashboard, verify navigation works
- Run `npm run lint` after all changes

**Files Changed:**
- `app/canvas/_hooks/useCanvas.ts` - NEW: Single canvas metadata hook
- `app/canvas/[canvasId]/page.tsx` - NEW: Dynamic canvas route (moved from old page.tsx)

**Notes:** The Canvas component won't work yet because it doesn't accept canvasId prop. That's fixed in PR #10.

---

### PR #10: Update Canvas Component and Hooks for Canvas Scoping
**Goal:** Refactor Canvas component and related hooks to accept and use canvasId for all operations

**Tasks:**
- [x] Update `app/canvas/_hooks/useObjects.ts` to accept `canvasId: string` parameter
- [x] Pass canvasId to all Firestore operations (addObject, updateObject, deleteObject, subscribeToObjects)
- [x] Update `app/canvas/_hooks/useCursors.ts` to accept `canvasId: string` parameter
- [x] Pass canvasId to all Realtime operations (updateCursorPosition, subscribeToCursors, removeCursor)
- [x] Update `app/canvas/_hooks/usePresence.ts` to accept `canvasId: string` parameter
- [x] Pass canvasId to all Realtime operations (updatePresence, subscribeToPresence, removePresence)
- [x] Update `app/canvas/_components/Canvas.tsx` to accept `canvasId: string` and `canvas: Canvas` as props
- [x] Pass canvasId to useObjects, useCursors, and usePresence hooks
- [x] Update object creation to include canvasId in all shape factory calls
- [x] Pass canvasId to all lock operations (acquireLock, releaseLock)
- [x] Display canvas name in header or toolbar (use canvas.name)
- [x] Add breadcrumb navigation: Dashboard > [Canvas Name]
- [ ] Optionally: use canvas dimensions for visual bounds or constraints (not required for v1)

**What to Test:**
- Create a new canvas from dashboard
- Navigate to the canvas
- Verify canvas loads with correct name in header
- Create objects (rectangles, circles, lines) and verify they save to Firestore under correct canvas
- Open Firebase Firestore console and verify objects are in `canvases/{canvasId}/objects/` collection
- Open Firebase Realtime Database console and verify cursors are at `sessions/{canvasId}/cursors/`
- Open two different canvases in separate tabs, verify objects don't mix
- Open same canvas in two tabs, verify real-time sync works
- Test with 2 users on same canvas, verify cursors and presence work
- Test with 2 users on different canvases, verify isolation
- Run `npm run lint` after all changes

**Files Changed:**
- `app/canvas/_hooks/useObjects.ts` - Add canvasId parameter
- `app/canvas/_hooks/useCursors.ts` - Add canvasId parameter
- `app/canvas/_hooks/usePresence.ts` - Add canvasId parameter
- `app/canvas/_components/Canvas.tsx` - Accept canvasId and canvas props, pass to hooks
- `app/canvas/[canvasId]/page.tsx` - Pass canvasId and canvas to Canvas component

**Notes:** This is the critical PR that makes everything work together. Test thoroughly!

---

### PR #11: Update Shape Factories to Include Canvas ID
**Goal:** Ensure all shape creation functions include canvasId in the generated objects

**Tasks:**
- [x] Update `app/canvas/_lib/shapes.ts` for RectangleShapeFactory
- [x] Modify `createDefault()` to accept `canvasId: string` parameter and include it in returned object
- [x] Ensure `toFirestore()` includes canvasId field (should already be on object)
- [x] Ensure `fromFirestore()` extracts canvasId field
- [x] Repeat for CircleShapeFactory
- [x] Repeat for LineShapeFactory
- [x] Repeat for TextShapeFactory (if exists)
- [x] Update all callsites in Canvas.tsx that call `createDefault()` to pass canvasId

**What to Test:**
- Create objects of each type (rectangle, circle, line)
- Check Firestore console to verify each object has canvasId field
- Verify objects load correctly on page refresh
- Run `npm run lint` after changes

**Files Changed:**
- `app/canvas/_lib/shapes.ts` - Update all shape factories to handle canvasId
- `app/canvas/_components/Canvas.tsx` - Pass canvasId to shape factory calls

**Notes:** The canvasId should be stored on the object for redundancy even though it's in the collection path

---

## Phase 4: Backwards Compatibility & Data Migration

### PR #12: Create Migration Script for Existing Data
**Goal:** Build a migration function to move existing canvas objects to a default canvas per user

**Tasks:**
- [x] Create `scripts/migrate-to-canvases.ts` (or similar) migration script
- [x] Add function to create a "Default Canvas" for a user with ID "default-canvas-{userId}"
- [x] Set canvas name to "Default Canvas", dimensions to 1920x1080
- [x] Query all documents from old flat `canvasObjects` collection
- [x] Group objects by createdBy field (if exists) to create per-user default canvases
- [x] For each user's objects, create their default canvas if it doesn't exist
- [x] Copy each object to new nested collection path: `canvases/{default-canvas-userId}/objects/{objectId}`
- [x] Preserve all object fields (don't lose data)
- [x] Add canvasId field to migrated objects
- [x] Add transaction support or batch writes for data integrity
- [x] Add logging to track migration progress
- [x] Add dry-run mode to preview changes without committing
- [x] DO NOT delete old data yet (keep for rollback)

**What to Test:**
- Run migration script in dry-run mode first
- Review logs to verify correct canvas creation and object grouping
- Run migration for real in development environment
- Check Firestore console to verify:
  - Default canvases created for each user
  - Objects copied to nested collections
  - All object fields preserved
  - canvasId field added to objects
- Open app and verify default canvas appears in dashboard
- Open default canvas and verify all old objects are visible
- Test that new objects still work correctly
- DO NOT run in production yet

**Files Changed:**
- `scripts/migrate-to-canvases.ts` - NEW: Migration script

**Notes:** Keep old data in `canvasObjects` collection for 7 days as backup before deleting. Consider adding a flag to canvas indicating it's a migrated default canvas.

---

### PR #13: Add Migration Status Check and Graceful Fallback
**Goal:** Make the application handle both migrated and non-migrated data gracefully

**Tasks:**
- [x] Update `lib/firebase/firestore.ts` to add fallback logic for objects without canvasId
- [x] If `subscribeToObjects` is called but nested collection is empty, check old flat collection
- [x] Add helper function `shouldMigrate()` that checks if old data exists
- [x] Add banner or notification in dashboard if migration is needed
- [x] Add button to trigger migration from UI (calls migration script via Firebase function or API route)
- [x] Test that app works before migration (falls back to old data)
- [x] Test that app works after migration (uses new nested structure)
- [x] Migration successfully completed - all objects migrated to shared canvas

**What to Test:**
- Before running migration:
  - Create objects in old structure
  - Verify they still load
  - Verify dashboard shows migration notice
- Run migration via UI button
- After migration:
  - Verify banner disappears
  - Verify default canvas appears
  - Verify all objects visible in default canvas
- Create new canvas, verify it uses new structure with no fallback

**Files Changed:**
- `lib/firebase/firestore.ts` - Add fallback logic
- `app/canvas/page.tsx` - Add migration banner and trigger button
- `scripts/migrate-to-canvases.ts` - Make callable from UI if needed

**Notes:** This ensures zero downtime during migration. Can be removed after migration is complete and verified.

---

## Phase 5: Permissions, Polish & Edge Cases

### PR #14: Update Firebase Security Rules
**Goal:** Add proper security rules for canvases and canvas-scoped objects

**Tasks:**
- [x] Update `firestore.rules` to add rules for `canvases` collection
- [x] Allow read: authenticated user and canvas createdBy matches user ID
- [x] Allow write: authenticated user and canvas createdBy matches user ID (for create) or resource.data.createdBy matches user ID (for update/delete)
- [x] Add rules for nested `canvases/{canvasId}/objects` subcollection
- [x] Allow read: authenticated user (later: check canvas permissions)
- [x] Allow write: authenticated user (later: check canvas permissions)
- [x] Update `database.rules.json` for Realtime Database
- [x] Add rules for `sessions/{canvasId}/cursors/{userId}`
- [x] Allow write: userId matches auth.uid
- [x] Allow read: authenticated user
- [x] Add rules for `sessions/{canvasId}/presence/{userId}`
- [x] Allow write: userId matches auth.uid
- [x] Allow read: authenticated user
- [x] Deploy rules to Firebase via console or CLI
- [x] Test rules using Firebase emulator or by attempting unauthorized access

**What to Test:**
- Try to access another user's canvas by URL (should fail or show permission error)
- Try to modify another user's canvas (should fail)
- Verify own canvases are accessible
- Verify cursors and presence work for authenticated users
- Try to write cursor with different userId (should fail)
- Run `npm run lint` to verify rules syntax (if using Firebase CLI)

**Files Changed:**
- `firestore.rules` - Add canvas and object security rules
- `database.rules.json` - Add cursor and presence security rules

**Notes:** Deploy rules to Firebase console. Test thoroughly before deploying to production.

---

### PR #15: Add Canvas Rename Functionality
**Goal:** Allow users to rename their canvases from the dashboard or canvas page

**Tasks:**
- [x] Add rename handler to `useCanvases` hook that calls `updateCanvas(canvasId, { name, updatedAt })`
- [x] Update `app/canvas/_components/CanvasCard.tsx` to add edit icon button (Pencil from lucide-react)
- [x] Add onClick handler for edit button that opens inline input or modal
- [x] Implement inline editing: click pencil → name becomes input → save on Enter or blur → cancel on Escape
- [x] Add validation: name required, max 100 characters
- [x] Update canvas name in Firestore on save
- [x] Show loading state during update
- [x] Show error state if update fails
- [ ] Optionally: add rename option in canvas page header/settings menu

**What to Test:**
- Click edit icon on canvas card
- Rename canvas and verify it saves
- Test with empty name (should fail validation)
- Test with 101 character name (should fail validation)
- Refresh page and verify new name persists
- Test with multiple rapid edits
- Test cancellation (Escape key)
- Run `npm run lint` after changes

**Files Changed:**
- `app/canvas/_hooks/useCanvases.ts` - Add renameCanvas function
- `app/canvas/_components/CanvasCard.tsx` - Add inline rename functionality

**Notes:** Use existing Input component from shadcn/ui. Consider debouncing the update if typing in real-time.

---

### PR #16: Add Canvas Header with Breadcrumb Navigation
**Goal:** Create a header component for the canvas page with navigation back to dashboard

**Tasks:**
- [x] Create `app/canvas/_components/CanvasHeader.tsx` component
- [x] Accept props: canvasName (string)
- [x] Display breadcrumb: "Dashboard > {canvasName}" (use ChevronRight icon from lucide-react)
- [x] Make "Dashboard" clickable, navigates to `/canvas`
- [x] Style header bar (fixed at top, spans full width, padding, border-bottom)
- [x] Optionally: add canvas settings menu icon (MoreVertical) for future features
- [x] Use useRouter from next/navigation for navigation
- [x] Import and render CanvasHeader in `app/canvas/[canvasId]/page.tsx`
- [x] Pass canvas name from canvas metadata
- [x] All tasks completed and tested

**What to Test:**
- Open any canvas
- Verify header appears at top with correct canvas name
- Click "Dashboard" breadcrumb link, verify navigation to dashboard
- Test with long canvas names (should truncate or wrap gracefully)
- Run `npm run lint` after changes

**Files Changed:**
- `app/canvas/_components/CanvasHeader.tsx` - NEW: Canvas header component
- `app/canvas/[canvasId]/page.tsx` - Import and render CanvasHeader

**Notes:** Keep it simple for v1. Settings menu can be a placeholder for future features.

---

### PR #17: Improve Delete Confirmation with Warning
**Goal:** Add more robust delete confirmation to prevent accidental data loss

**Tasks:**
- [ ] Create `app/canvas/_components/DeleteCanvasDialog.tsx` component
- [ ] Use AlertDialog component from shadcn/ui
- [ ] Accept props: open (boolean), canvasName (string), onConfirm handler, onCancel handler
- [ ] Display warning message: "Are you sure you want to delete '{canvasName}'? This will permanently delete the canvas and all objects in it. This action cannot be undone."
- [ ] Add input field requiring user to type canvas name to confirm (e.g., "Type 'My Canvas' to confirm")
- [ ] Disable confirm button until typed name matches exactly
- [ ] Style confirm button as destructive (red)
- [ ] Update `app/canvas/page.tsx` to use DeleteCanvasDialog instead of simple confirmation
- [ ] Pass canvas name to dialog

**What to Test:**
- Click delete on a canvas card
- Verify dialog opens with warning
- Try to confirm without typing name (should be disabled)
- Type wrong name (confirm should remain disabled)
- Type correct name (confirm should enable)
- Click confirm, verify canvas is deleted
- Click cancel, verify dialog closes without deleting
- Run `npm run lint` after changes

**Files Changed:**
- `app/canvas/_components/DeleteCanvasDialog.tsx` - NEW: Delete confirmation dialog
- `app/canvas/page.tsx` - Use DeleteCanvasDialog

**Notes:** This prevents accidental deletion of important work. Consider adding a "Don't ask again" checkbox for advanced users (store preference in localStorage).

---

### PR #18: Add Empty State for Dashboard
**Goal:** Create a welcoming empty state for new users with no canvases

**Tasks:**
- [ ] Create `app/canvas/_components/EmptyCanvasState.tsx` component
- [ ] Display friendly illustration or icon (FileQuestion or PlusCircle from lucide-react, large size)
- [ ] Add heading: "No canvases yet"
- [ ] Add description: "Get started by creating your first canvas"
- [ ] Add prominent "Create Canvas" button
- [ ] Style component centered in viewport
- [ ] Update `app/canvas/page.tsx` to conditionally show EmptyCanvasState when canvases array is empty (and not loading)

**What to Test:**
- Create new user account
- Verify empty state appears on dashboard
- Click "Create Canvas" button, verify modal opens
- Create a canvas, verify empty state disappears and canvas grid shows
- Delete all canvases, verify empty state reappears
- Run `npm run lint` after changes

**Files Changed:**
- `app/canvas/_components/EmptyCanvasState.tsx` - NEW: Empty state component
- `app/canvas/page.tsx` - Conditionally render empty state

**Notes:** Keep it simple and friendly. Use existing UI components and icons from lucide-react.

---

### PR #19: Add Loading Skeletons for Dashboard
**Goal:** Improve perceived performance with loading placeholders

**Tasks:**
- [ ] Create `app/canvas/_components/CanvasCardSkeleton.tsx` component
- [ ] Use Skeleton component from shadcn/ui (or create with animated gradient background)
- [ ] Match dimensions and layout of CanvasCard
- [ ] Update `app/canvas/page.tsx` to show grid of CanvasCardSkeleton components while loading
- [ ] Show 6 skeleton cards (2 rows of 3)
- [ ] Add loading skeleton to canvas page for canvas metadata (`app/canvas/[canvasId]/page.tsx`)
- [ ] Show simple spinner or skeleton while canvas is loading

**What to Test:**
- Refresh dashboard and verify skeleton cards appear briefly
- Slow down network in browser DevTools to see skeletons longer
- Verify skeletons match card layout
- Navigate to canvas, verify loading state appears
- Run `npm run lint` after changes

**Files Changed:**
- `app/canvas/_components/CanvasCardSkeleton.tsx` - NEW: Loading skeleton for canvas card
- `app/canvas/page.tsx` - Show skeletons while loading
- `app/canvas/[canvasId]/page.tsx` - Show loading state for canvas

**Notes:** Skeleton UI improves perceived performance. Keep animation subtle (pulse or shimmer).

---

### PR #20: Add 404 Error Page for Canvas Not Found
**Goal:** Create a helpful error page when users navigate to non-existent canvas

**Tasks:**
- [ ] Update `app/canvas/[canvasId]/page.tsx` to handle canvas not found error from useCanvas hook
- [ ] Create error state UI component or inline JSX
- [ ] Display 404 icon (FileQuestion from lucide-react)
- [ ] Show heading: "Canvas not found"
- [ ] Show message: "This canvas doesn't exist or you don't have permission to view it."
- [ ] Add button: "Go to Dashboard" that navigates to `/canvas`
- [ ] Optionally: show list of user's recent canvases as suggestions
- [ ] Handle permission denied errors similarly (different message)

**What to Test:**
- Navigate to `/canvas/invalid-id` in browser
- Verify 404 page appears with correct message
- Click "Go to Dashboard" button, verify navigation works
- Try accessing another user's canvas (if you have multiple test accounts)
- Run `npm run lint` after changes

**Files Changed:**
- `app/canvas/[canvasId]/page.tsx` - Add 404 error handling

**Notes:** Friendly error pages improve UX when things go wrong. Consider logging these errors for monitoring.

---

### PR #21: Add Error Handling and Retry Logic
**Goal:** Gracefully handle network errors and provide retry mechanisms

**Tasks:**
- [ ] Update `app/canvas/_hooks/useCanvases.ts` to catch and expose errors from Firebase operations
- [ ] Add retry function for failed operations
- [ ] Update `app/canvas/_hooks/useCanvas.ts` similarly
- [ ] Update `app/canvas/page.tsx` to display error state when canvas list fails to load
- [ ] Add "Retry" button in error state that re-triggers fetch
- [ ] Update `app/canvas/[canvasId]/page.tsx` to handle canvas loading errors
- [ ] Add error boundary component (or use Next.js error.tsx) for unexpected errors
- [ ] Add toast notifications (use sonner or similar if in package.json) for operation success/failure
- [ ] Show toast on canvas create success: "Canvas created"
- [ ] Show toast on canvas delete success: "Canvas deleted"
- [ ] Show toast on errors: "Failed to load canvases" with retry action

**What to Test:**
- Disconnect network and try to load dashboard (verify error state)
- Click retry button, verify it attempts to reload
- Disconnect network and try to create canvas (verify error toast)
- Test with Firebase emulator offline
- Test with Firestore rules denying access (verify permission error)
- Run `npm run lint` after changes

**Files Changed:**
- `app/canvas/_hooks/useCanvases.ts` - Add error handling and retry
- `app/canvas/_hooks/useCanvas.ts` - Add error handling and retry
- `app/canvas/page.tsx` - Display error states and retry buttons
- `app/canvas/[canvasId]/page.tsx` - Handle errors gracefully

**Notes:** Good error handling prevents user frustration. Consider adding error tracking (Sentry, etc.) in production.

---

### PR #22: Add Canvas Dimension Display and Validation
**Goal:** Ensure canvas dimensions are properly displayed and enforced

**Tasks:**
- [ ] Update CreateCanvasModal to validate dimensions are within allowed range (100-10000) from constants
- [ ] Show validation error messages for out-of-range dimensions
- [ ] Update CanvasCard to display dimensions prominently (e.g., "1920 × 1080" below name)
- [ ] Add dimensions to CanvasHeader (e.g., "Dashboard > My Canvas (1920×1080)")
- [ ] Optionally: add visual canvas bounds in Canvas component (gray border or grid showing actual canvas size)
- [ ] Ensure canvas dimensions from metadata are used if implementing visual bounds
- [ ] Test that dimension presets work correctly (select preset → inputs auto-fill)

**What to Test:**
- Create canvas with preset dimensions, verify they're saved correctly
- Create canvas with custom dimensions (e.g., 2000x1500), verify in Firestore
- Try to create canvas with dimensions too small (99x99), verify validation error
- Try to create canvas with dimensions too large (10001x10001), verify validation error
- Verify dimensions display correctly on canvas cards
- Verify dimensions display in header if implemented
- Run `npm run lint` after changes

**Files Changed:**
- `app/canvas/_components/CreateCanvasModal.tsx` - Add dimension validation
- `app/canvas/_components/CanvasCard.tsx` - Display dimensions
- `app/canvas/_components/CanvasHeader.tsx` - Optionally display dimensions
- `app/canvas/_components/Canvas.tsx` - Optionally add visual bounds

**Notes:** Visual canvas bounds are optional for v1 but helpful for user understanding of canvas size. Can be added later if time permits.

---

### PR #23: Performance Testing and Optimization
**Goal:** Verify performance with many canvases and objects, optimize if needed

**Tasks:**
- [ ] Create test script to generate 20+ canvases for a user
- [ ] Create test script to generate 100+ objects in a single canvas
- [ ] Test dashboard load time with 20+ canvases (should be < 1 second)
- [ ] Test canvas load time with 100+ objects (should be < 2 seconds)
- [ ] Test canvas render performance with many objects (should maintain 60 FPS during pan/zoom)
- [ ] Add Firestore index if needed: composite index on `(createdBy, createdAt)` for canvas queries
- [ ] Consider pagination for canvas list if more than 50 canvases (optional for v1)
- [ ] Profile React components with React DevTools to identify bottlenecks
- [ ] Optimize re-renders if needed (React.memo, useMemo, useCallback)
- [ ] Test with 2+ users collaborating on same canvas with many objects

**What to Test:**
- Load dashboard with 20 canvases, measure load time in Network tab
- Open canvas with 100 objects, measure load time
- Pan and zoom canvas with many objects, check FPS in DevTools Performance tab
- Add/edit/delete objects, verify responsiveness
- Test with 2 users on same canvas, verify real-time sync latency
- Run `npm run lint` after any code changes

**Files Changed:**
- May need to add Firestore indexes via Firebase console
- May optimize components if performance issues found

**Notes:** Performance testing ensures the feature scales well. Document any findings and optimizations made.

---

### PR #24: Final Polish and Documentation
**Goal:** Clean up code, add comments, and document the new feature

**Tasks:**
- [ ] Review all files changed in this feature for code quality
- [ ] Add JSDoc comments to public functions in `lib/firebase/canvas.ts`
- [ ] Add JSDoc comments to hooks (useCanvases, useCanvas)
- [ ] Update CLAUDE.md with multi-canvas information (data structure, routing, key files)
- [ ] Add comments explaining canvas scoping in Firestore and Realtime DB files
- [ ] Remove any console.logs or debug code
- [ ] Remove migration banner/button if migration is complete
- [ ] Remove fallback logic for old data structure if migration is verified
- [ ] Verify all TypeScript strict mode requirements are met
- [ ] Run `npm run lint` and fix any remaining issues
- [ ] Run `npm run format` to ensure consistent code style
- [ ] Test complete user flow one more time: signup → create canvas → edit → switch canvas → delete canvas

**What to Test:**
- Complete user flow from scratch
- Verify no console errors or warnings
- Verify all features work smoothly
- Check code comments are helpful
- Review git diff to ensure no debug code is committed
- Run `npm run lint` and `npm run format:check`

**Files Changed:**
- Multiple files for documentation and cleanup
- `CLAUDE.md` - Update with multi-canvas architecture
- Remove temporary migration code if no longer needed

**Notes:** This is the final polish pass. Take time to review everything before marking the feature complete.

---

## Summary

**Total Phases:** 5
**Total PRs:** 24
**Estimated Complexity:** High

**Key Dependencies:**
- Firebase Authentication (already configured)
- Firestore with nested collections support
- Realtime Database
- Next.js 15 App Router with dynamic routes
- Existing shape system and lock system

**Critical Path:**
1. Phase 1 (PRs 1-4): Data model and backend changes
2. Phase 3 (PRs 9-11): Dynamic routing and canvas scoping
3. Phase 4 (PRs 12-13): Data migration
4. Phase 5 (PR 14): Security rules

**Non-Critical (Can Iterate):**
- Phase 2 (PRs 5-8): Dashboard UI (can be rough initially)
- Phase 5 (PRs 15-24): Polish and UX improvements

**Testing Strategy:**
- Test each PR independently before proceeding
- Manual testing required for multi-user scenarios
- Use Firebase emulator for testing rules
- Performance testing with realistic data volumes
- Migration testing in development before production

**Success Criteria:**
- Users can create multiple canvases with custom dimensions
- Objects, cursors, and presence are isolated per canvas
- Existing data migrated without loss
- Security rules properly enforced
- Dashboard and canvas pages performant
- Complete user flow works end-to-end
