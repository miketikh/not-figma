# CollabCanvas - File Structure & PR-Based Task List

## Project File Structure

```
collabcanvas/
├── .env.local                          # Environment variables (not committed)
├── .env.example                        # Template for environment variables
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── README.md
├── ARCHITECTURE.md
├── AI_DEVELOPMENT_LOG.md
│
├── app/
│   ├── layout.tsx                      # Root layout with providers
│   ├── page.tsx                        # Home/landing page
│   │
│   ├── (auth)/                         # Auth route group
│   │   ├── login/
│   │   │   ├── page.tsx                # Login page
│   │   │   └── _components/
│   │   │       └── LoginForm.tsx       # Login form component
│   │   ├── signup/
│   │   │   ├── page.tsx                # Signup page
│   │   │   └── _components/
│   │   │       └── SignupForm.tsx      # Signup form component
│   │   └── _lib/
│   │       └── auth-helpers.ts         # Auth-specific helpers
│   │
│   ├── canvas/
│   │   ├── page.tsx                    # Main canvas page
│   │   ├── _components/
│   │   │   ├── Canvas.tsx              # Main canvas component
│   │   │   ├── RemoteCursor.tsx        # Remote user cursor
│   │   │   ├── Toolbar.tsx             # Shape tools toolbar
│   │   │   ├── PropertiesPanel.tsx     # Object properties sidebar
│   │   │   ├── UserList.tsx            # Online users list
│   │   │   ├── ConnectionStatus.tsx    # Connection indicator
│   │   │   └── AICommandInput.tsx      # AI command input
│   │   ├── _lib/
│   │   │   ├── canvas-manager.ts       # Canvas manipulation logic
│   │   │   ├── objects.ts              # Object creation/manipulation
│   │   │   ├── viewport.ts             # Pan/zoom logic
│   │   │   ├── object-sync.ts          # Object synchronization
│   │   │   ├── cursor-sync.ts          # Cursor synchronization
│   │   │   └── presence-sync.ts        # Presence tracking
│   │   ├── _hooks/
│   │   │   ├── useCanvas.ts            # Canvas state hook
│   │   │   ├── useObjects.ts           # Canvas objects hook
│   │   │   ├── useCursors.ts           # Remote cursors hook
│   │   │   ├── usePresence.ts          # Presence tracking hook
│   │   │   ├── useSelection.ts         # Object selection hook
│   │   │   ├── useKeyboardShortcuts.ts # Keyboard shortcuts hook
│   │   │   └── useAI.ts                # AI commands hook
│   │   ├── _store/
│   │   │   ├── canvas-store.ts         # Canvas state (Zustand)
│   │   │   └── ai-store.ts             # AI state (Zustand)
│   │   └── _types/
│   │       ├── canvas.ts               # Canvas type definitions
│   │       └── objects.ts              # Object type definitions
│   │
│   └── api/
│       └── ai-command/
│           ├── route.ts                # AI proxy API route
│           └── _lib/
│               ├── functions.ts        # AI function schemas
│               ├── handlers.ts         # Function execution handlers
│               └── prompts.ts          # System prompts
│
├── components/                         # Global/shared components only
│   ├── providers/
│   │   ├── AuthProvider.tsx            # Authentication context provider
│   │   └── Providers.tsx               # All providers wrapper
│   └── ui/                             # Reusable UI primitives
│       ├── Button.tsx                  # Button component
│       └── Input.tsx                   # Input component
│
├── lib/                                # Global utilities only
│   ├── firebase/
│   │   ├── config.ts                   # Firebase initialization
│   │   ├── auth.ts                     # Auth helper functions
│   │   ├── firestore.ts                # Firestore helper functions
│   │   └── realtime.ts                 # Realtime Database helpers
│   └── utils/
│       ├── colors.ts                   # Color utilities
│       └── positioning.ts              # Layout/positioning helpers
│
├── hooks/                              # Global hooks only
│   └── useAuth.ts                      # Authentication hook (used everywhere)
│
├── store/                              # Global stores only
│   └── auth-store.ts                   # Auth state (Zustand)
│
├── types/                              # Global types only
│   ├── user.ts                         # User type definitions
│   └── ai.ts                           # AI type definitions
│
└── public/
    └── (static assets)
```

**Key Changes:**
1. **Auth feature co-location**: `/app/(auth)/` route group with shared `_lib/` for auth helpers
2. **Canvas feature co-location**: All canvas-related code in `/app/canvas/_components/`, `_lib/`, `_hooks/`, `_store/`, `_types/`
3. **AI feature co-location**: AI logic lives in `/app/api/ai-command/_lib/`
4. **Global-only at root**: Only truly shared code (AuthProvider, Firebase config, reusable UI) stays in root `/components/`, `/lib/`, `/hooks/`
5. **Next.js convention**: Use `_folder` prefix for private/internal folders that shouldn't be routes

**Naming Convention:**
- `_components/` - Private components for this route
- `_lib/` - Private utility functions for this route
- `_hooks/` - Private hooks for this route
- `_store/` - Private state management for this route
- `_types/` - Private type definitions for this route

The underscore prefix tells Next.js these are NOT routes.

---

## PR-Based Task List

### PR #1: Project Setup & Configuration ✅
**Branch:** `setup/initial-config`  
**Goal:** Initialize Next.js project with TypeScript and Tailwind

**Tasks:**
- [x] Create Next.js project with TypeScript template
- [x] Install Tailwind CSS and configure
- [x] Set up ESLint and Prettier
- [x] Create base folder structure (app, components, lib, hooks, store, types)
- [x] Configure `tsconfig.json` with path aliases
- [x] Create `.env.example` file
- [x] Update `.gitignore` for Next.js and environment files
- [x] Initialize Git repository
- [x] Create initial `README.md` with project description

**Files Created:**
- `package.json`
- `tsconfig.json`
- `tailwind.config.ts`
- `next.config.js`
- `.gitignore`
- `.env.example`
- `README.md`
- Basic folder structure (empty directories)

---

### PR #2: Firebase Configuration ✅
**Branch:** `setup/firebase-config`  
**Goal:** Set up Firebase project and initialize in codebase

**Tasks:**
- [x] Create Firebase project in Firebase Console
- [x] Enable Email/Password authentication
- [x] Create Firestore database (production mode)
- [x] Create Realtime Database instance
- [x] Copy Firebase config credentials
- [x] Install Firebase SDK (`firebase`)
- [x] Create Firebase config file
- [x] Initialize Firebase app
- [x] Test Firebase connection with simple read/write

**Files Created/Modified:**
- `package.json` (add dependencies)
- `lib/firebase/config.ts` (NEW)
- `.env.local` (create locally, not committed)
- `.env.example` (add Firebase variable names)

---

### PR #3: Type Definitions ✅
**Branch:** `setup/type-definitions`  
**Goal:** Define all TypeScript interfaces and types

**Tasks:**
- [x] Define User and UserSession types
- [x] Define AuthContextType
- [x] Define UserPresence type
- [x] Define canvas object types (Rectangle, Circle, Line, Text)
- [x] Define base CanvasObject interface with locking fields
- [x] Define Canvas state types (Viewport, CanvasState, CanvasTool)
- [x] Define Cursor and Presence types
- [x] Define Locking system types (LockRequest, LockResponse, LockHelpers)
- [x] Define Sync types (ObjectUpdate, BatchUpdate, ObjectOperation)
- [x] Define Selection and History types
- [x] Define AI command types (AICommand, AIFunction, AIContext)
- [x] Export all types from index files

**Files Created:**
- `types/objects.ts` (NEW)
- `types/canvas.ts` (NEW)
- `types/user.ts` (NEW)
- `types/ai.ts` (NEW)

---

### PR #4: Authentication System ✅
**Branch:** `feature/authentication`  
**Goal:** Implement complete authentication flow

**Tasks:**
- [x] Create auth helper functions (signUp, signIn, signOut)
- [x] Create AuthProvider context
- [x] Create useAuth hook
- [x] Create Button component
- [x] Create Input component
- [x] Build LoginForm component
- [x] Build SignupForm component
- [x] Create login page
- [x] Create signup page
- [x] Create ProtectedRoute component
- [x] Add auth state persistence (handled by Firebase SDK)
- [x] Wrap app with AuthProvider
- [x] Create placeholder canvas page
- [x] Redirect home to login
- [x] Add Firebase error code mapping to user-friendly messages
- [x] Add client-side validation (email, password, display name)
- [x] Test signup, login, logout flow

**Files Created:**
- `lib/firebase/auth.ts` (NEW)
- `components/auth/AuthProvider.tsx` (NEW)
- `components/auth/LoginForm.tsx` (NEW)
- `components/auth/SignupForm.tsx` (NEW)
- `components/auth/ProtectedRoute.tsx` (NEW)
- `hooks/useAuth.ts` (NEW)
- `app/login/page.tsx` (NEW)
- `app/signup/page.tsx` (NEW)
- `components/ui/Button.tsx` (NEW)
- `components/ui/Input.tsx` (NEW)

**Files Modified:**
- `app/layout.tsx` (wrap with AuthProvider)

---

### PR #5: Firestore & Realtime Database Setup ✅
**Branch:** `setup/database-helpers`  
**Goal:** Create database helper functions and security rules

**Tasks:**
- [x] Create Firestore helper functions (CRUD for objects)
  - [x] createObject, getObject, getAllObjects
  - [x] updateObject, deleteObject
  - [x] batchUpdateObjects, batchDeleteObjects
  - [x] subscribeToObjects, subscribeToObject (real-time)
  - [x] Locking functions (acquireLock, releaseLock, renewLock)
  - [x] Lock utilities (isLockExpired, canEdit)
- [x] Create Realtime Database helper functions (cursors, presence)
  - [x] Cursor functions (updateCursorPosition, removeCursor, subscribeToCursors)
  - [x] Presence functions (setUserPresence, updatePresenceHeartbeat, removeUserPresence)
  - [x] Subscribe functions (subscribeToPresence)
  - [x] Utility functions (generateUserColor, isUserActive, cleanupInactiveUsers)
- [x] Write Firestore security rules (collaborative model)
- [x] Write Realtime Database security rules
- [x] Update security rules in Firebase Console (completed earlier in PR #2)

**Files Created:**
- `lib/firebase/firestore.ts` (NEW)
- `lib/firebase/realtime.ts` (NEW)
- `firestore.rules` (NEW, for documentation)
- `database.rules.json` (NEW, for documentation)

---

### PR #6: Canvas Component & Viewport ✅
**Branch:** `feature/canvas-viewport`  
**Goal:** Create canvas with pan and zoom functionality

**Tasks:**
- [x] Install Fabric.js
- [x] Create Canvas component
- [x] Initialize canvas library
- [x] Add grid pattern (Figma-like)
- [x] Add Canvas to canvas page
- [x] Implement pan functionality (Space + drag, middle mouse)
- [x] Implement zoom functionality (mouse wheel)
- [x] Add zoom controls UI (+ and - buttons with percentage)
- [x] Create viewport state management (Zustand store)
- [x] Persist viewport state to localStorage
- [x] Zoom/pan work smoothly (60 FPS capable)

**Files Created:**
- `components/canvas/Canvas.tsx` (NEW)
- `lib/canvas/viewport.ts` (NEW)
- `hooks/useCanvas.ts` (NEW)
- `store/canvasStore.ts` (NEW)
- `app/canvas/page.tsx` (NEW)

**Files Modified:**
- `package.json` (add canvas library)

---

### PR #7: Rectangle Shape Creation ✅
**Branch:** `feature/rectangle-shape`  
**Goal:** Implement rectangle creation, selection, and manipulation

**Tasks:**
- [x] Create shape creation logic for rectangles
- [x] Implement rectangle rendering on canvas
- [x] Add drag-to-create rectangle (click and drag)
- [x] Implement rectangle selection (click to select)
- [x] Display selection outline and handles (provided by Fabric.js)
- [x] Implement drag to move rectangle
- [x] Implement resize handles (provided by Fabric.js)
- [x] Add delete functionality (delete key)
- [x] Create object manipulation helpers
- [x] Test rectangle creation and manipulation
- [x] Fix: Tool state management (use ref to avoid stale closures)
- [x] Fix: PointerEvent compatibility (removed strict MouseEvent checks)
- [x] Fix: Selection behavior respects active tool
- [x] Fix: Hit-testing cache update (setCoords) for newly selectable objects

**Files Created:**
- `app/canvas/_lib/objects.ts` (NEW)
- `app/canvas/_components/Toolbar.tsx` (NEW)

**Files Modified:**
- `app/canvas/_components/Canvas.tsx` (add rectangle creation, tool management, selection)
- `app/canvas/_store/canvas-store.ts` (add tool state and viewport management)
- `types/canvas.ts` (canvas object types already defined)

**Notes:**
- Uses Fabric.js for rendering and built-in selection/resize handles
- Implements tool-based interaction (select tool vs rectangle tool)
- Rectangles are non-selectable while in rectangle tool mode
- Switching to select tool makes all objects selectable
- Pan/zoom functionality integrated with rectangle creation

---

### PR #8: Firestore Object Persistence ✅
**Branch:** `feature/object-persistence`  
**Goal:** Save and load objects from Firestore

**Tasks:**
- [x] Create Firestore collection for canvas objects
- [x] Implement save object to Firestore
- [x] Implement load objects from Firestore on mount
- [x] Add object creation sync to Firestore
- [x] Add object update sync to Firestore (on move, resize)
- [x] Add object deletion sync to Firestore
- [x] Test object persistence across page refresh
- [x] Verify no data loss

**Files Created:**
- `app/canvas/_hooks/useObjects.ts` (NEW) - Hook for managing object persistence

**Files Modified:**
- `app/canvas/_components/Canvas.tsx` (integrate persistence with useObjects hook)
- `app/canvas/_lib/objects.ts` (conversion functions already existed)
- `lib/firebase/firestore.ts` (CRUD functions already existed from PR #5)

**Notes:**
- Objects automatically save to Firestore on creation
- Objects update in Firestore when moved, resized, or modified (via object:modified event)
- Objects delete from Firestore when deleted from canvas
- Objects load from Firestore on canvas mount
- Each object has a unique ID stored in its data property
- Currently supports rectangles only (other shapes TODO for later PRs)

---

### PR #9: Real-Time Object Sync ✅
**Branch:** `feature/object-sync`  
**Goal:** Sync objects between multiple users in real-time

**Tasks:**
- [x] Set up Firestore real-time listener for objects
- [x] Implement optimistic updates for object creation
- [x] Broadcast object creation to other users
- [x] Render objects created by other users
- [x] Implement optimistic updates for object moves
- [x] Broadcast object position changes
- [x] Sync position changes from other users
- [x] Implement optimistic updates for resize
- [x] Broadcast and sync resize operations
- [x] Implement lock-based conflict prevention (better than last-write-wins!)
- [x] Test with 2 users in different browsers
- [x] Verify sync latency <100ms

**Files Modified:**
- `app/canvas/_hooks/useObjects.ts` (real-time sync + lock visual feedback)
- `app/canvas/_components/Canvas.tsx` (lock acquisition/release on selection)
- `lib/firebase/firestore.ts` (lock functions already existed)

**Lock System Implemented:**
- Acquire lock on object selection (blocks other users)
- Release lock on deselection or unmount
- Auto-renewal every 10 seconds during editing
- 30-second timeout for abandoned locks
- Red outline visual feedback for locked objects
- Objects locked by others are unselectable
- Skip sync updates for actively edited objects (prevents feedback loops)

---

### PR #10: Cursor Sync ✅
**Branch:** `feature/cursor-sync`  
**Goal:** Display remote user cursors in real-time

**Tasks:**
- [x] Create cursor tracking logic
- [x] Set up Realtime Database for cursor positions
- [x] Broadcast local cursor position (every 50ms)
- [x] Create RemoteCursor component
- [x] Render remote cursors on canvas
- [x] Display user name labels above cursors
- [x] Assign unique colors to each useimage.pngr
- [x] Generate random display names if user doesn't have one
- [x] Test cursor sync with 2+ users
- [x] Verify cursor latency <50ms

**Files Created:**
- `app/canvas/_components/RemoteCursor.tsx` (NEW - cursor display component)
- `app/canvas/_hooks/useCursors.ts` (NEW - cursor tracking hook)

**Files Modified:**
- `lib/firebase/realtime.ts` (added generateDisplayName function using unique-names-generator)
- `app/canvas/_components/Canvas.tsx` (integrated cursor rendering)

**Implementation Details:**
- Cursor positions broadcast every 50ms (throttled)
- Display names from Firebase Auth or auto-generated (e.g., "Happy Elephant")
- Each user gets a unique color from a preset palette
- Presence data (displayName, color) stored in Realtime Database
- Cursor positions stored in Realtime Database (high-frequency updates)
- Smooth cursor rendering with CSS transitions
- Auto-cleanup on unmount

---

### PR #11: Presence System ✅
**Branch:** `feature/presence-tracking`  
**Goal:** Track and display online users

**Tasks:**
- [x] Create presence data model
- [x] Set up Realtime Database presence tracking
- [x] Broadcast user join event
- [x] Broadcast user leave event
- [x] Implement heartbeat mechanism (every 30s)
- [x] Create UserList component
- [x] Display active users with names and colors
- [x] Auto-cleanup inactive users after 5 minutes
- [x] Test presence with multiple users

**Files Created:**
- `app/canvas/_components/OnlineUsers.tsx` (NEW)
- `app/canvas/_hooks/usePresence.ts` (NEW)

**Files Modified:**
- `lib/firebase/realtime.ts` (presence functions already existed)
- `app/canvas/page.tsx` (add OnlineUsers component)

---

### PR #12: Connection Status & Reconnection
**Branch:** `feature/connection-handling`  
**Goal:** Handle disconnects and reconnections gracefully

**Tasks:**
- [ ] Detect network disconnection
- [ ] Create ConnectionStatus component
- [ ] Queue local changes during offline period
- [ ] Implement reconnection logic
- [ ] Sync queued changes on reconnect
- [ ] Show connection status indicator
- [ ] Add toast notifications for connection changes
- [ ] Test offline editing and reconnection
- [ ] Verify no data loss after reconnect

**Files Created:**
- `components/ui/ConnectionStatus.tsx` (NEW)

**Files Modified:**
- `lib/sync/objectSync.ts` (add offline queue)
- `hooks/useObjects.ts` (handle offline mode)
- `app/canvas/page.tsx` (add ConnectionStatus)

---

### PR #13: Deployment Setup
**Branch:** `setup/deployment`  
**Goal:** Deploy to Vercel and verify production works

**Tasks:**
- [ ] Create Vercel account (if needed)
- [ ] Connect GitHub repository to Vercel
- [ ] Configure environment variables in Vercel dashboard
- [ ] Configure Firebase for production domain
- [ ] Test deployment
- [ ] Verify authentication works in production
- [ ] Verify real-time sync works in production
- [ ] Update README with deployed link

**Files Modified:**
- `README.md` (add deployed link)
- Vercel dashboard (configuration only)

---

### PR #14: MVP Testing & Validation
**Branch:** `test/mvp-validation`  
**Goal:** Comprehensive MVP testing and bug fixes

**Tasks:**
- [ ] Test all MVP checklist items:
  - [ ] Basic canvas with pan/zoom ✓
  - [ ] At least one shape type (rectangles) ✓
  - [ ] Can create and move objects ✓
  - [ ] Real-time sync between 2+ users ✓
  - [ ] Multiplayer cursors with name labels ✓
  - [ ] Presence awareness ✓
  - [ ] User authentication ✓
  - [ ] Deployed and publicly accessible ✓
- [ ] Test with 2+ users simultaneously
- [ ] Test rapid object creation
- [ ] Test page refresh preserves state
- [ ] Test disconnect and reconnect
- [ ] Verify 60 FPS performance
- [ ] Fix any bugs discovered
- [ ] Document known issues

**Files Modified:**
- Any bug fixes needed
- `README.md` (update status)

---

## MVP CHECKPOINT - All tasks above must be completed before proceeding

---

### PR #15: Additional Shape Types - Circles ✅
**Branch:** `feature/circles`  
**Goal:** Add circle shape type

**Tasks:**
- [x] Extend object types for circles
- [x] Add circle to Toolbar
- [x] Implement circle creation logic
- [x] Implement circle rendering
- [x] Add circle selection and manipulation
- [x] Test circle creation, move, resize
- [x] Sync circles across users

**Files Created:**
- `app/canvas/_components/shapes/CircleShape.tsx` (NEW)
- `app/canvas/_components/properties/shape-properties/CircleProperties.tsx` (NEW)

**Files Modified:**
- `app/canvas/_types/shapes.ts` (add PersistedCircle type)
- `app/canvas/_lib/shapes.ts` (add circle factory functions)
- `app/canvas/_components/Toolbar.tsx` (add circle button)
- `app/canvas/_components/Canvas.tsx` (handle circle creation and rendering)

---

### PR #16: Additional Shape Types - Lines
**Branch:** `feature/lines`  
**Goal:** Add line shape type

**Tasks:**
- [ ] Extend object types for lines
- [ ] Add line to Toolbar
- [ ] Implement line creation logic
- [ ] Implement line rendering
- [ ] Add line selection and manipulation
- [ ] Test line creation and editing
- [ ] Sync lines across users

**Files Modified:**
- `types/objects.ts` (add Line type)
- `lib/canvas/objects.ts` (add line functions)
- `components/canvas/Toolbar.tsx` (add line button)
- `components/canvas/Canvas.tsx` (handle line creation)

---

### PR #17: Additional Shape Types - Text
**Branch:** `feature/text-layers`  
**Goal:** Add text shape type with editing

**Tasks:**
- [ ] Extend object types for text
- [ ] Add text to Toolbar
- [ ] Implement text creation logic
- [ ] Implement text rendering
- [ ] Add double-click to edit functionality
- [ ] Create text editing UI
- [ ] Add font size, color controls
- [ ] Test text creation and editing
- [ ] Sync text across users

**Files Modified:**
- `types/objects.ts` (add Text type)
- `lib/canvas/objects.ts` (add text functions)
- `components/canvas/Toolbar.tsx` (add text button)
- `components/canvas/Canvas.tsx` (handle text creation/editing)

---

### PR #18: Multi-Select
**Branch:** `feature/multi-select`  
**Goal:** Implement multi-object selection

**Tasks:**
- [ ] Implement shift-click to add/remove from selection
- [ ] Create selection rectangle on drag
- [ ] Implement drag-to-select functionality
- [ ] Add select all (Cmd/Ctrl+A)
- [ ] Add deselect all (Escape)
- [ ] Display selection for multiple objects
- [ ] Test multi-select combinations

**Files Modified:**
- `hooks/useSelection.ts` (add multi-select logic)
- `components/canvas/Canvas.tsx` (handle multi-select interactions)
- `store/canvasStore.ts` (track multiple selections)

---

### PR #19: Group Operations
**Branch:** `feature/group-operations`  
**Goal:** Enable operations on multiple selected objects

**Tasks:**
- [ ] Implement move multiple objects together
- [ ] Implement resize multiple objects (uniform scaling)
- [ ] Implement delete multiple objects
- [ ] Implement duplicate multiple objects
- [ ] Test group operations maintain relative positions
- [ ] Sync group operations across users

**Files Modified:**
- `lib/canvas/objects.ts` (add group operation functions)
- `hooks/useSelection.ts` (handle group transformations)
- `components/canvas/Canvas.tsx` (apply group operations)

---

### PR #20: Layer Management ✅
**Branch:** `feature/layer-management`  
**Goal:** Implement z-index and layer controls

**Tasks:**
- [x] Add z-index to object data model
- [x] Implement bring to front (Cmd/Ctrl+Shift+])
- [x] Implement send to back (Cmd/Ctrl+Shift+[)
- [x] Implement bring forward one layer (Cmd/Ctrl+])
- [x] Implement send backward one layer (Cmd/Ctrl+[)
- [x] Update rendering order based on z-index
- [x] Test layer operations
- [x] Sync layer changes across users

**Files Created:**
- `app/canvas/_lib/layer-management.ts` (NEW - layer utility functions)

**Files Modified:**
- `app/canvas/_types/shapes.ts` (zIndex field already in types)
- `app/canvas/_components/properties/UniversalProperties.tsx` (layer control buttons)
- `app/canvas/_components/Canvas.tsx` (keyboard shortcuts for layer operations, render by z-index)
- `app/canvas/_hooks/useObjects.ts` (sync z-index changes)

---

### PR #21: Keyboard Shortcuts (Partial) ⚠️
**Branch:** `feature/keyboard-shortcuts`  
**Goal:** Implement comprehensive keyboard shortcuts

**Tasks:**
- [x] Implement Delete/Backspace for delete
- [ ] Implement Cmd/Ctrl+D for duplicate
- [ ] Implement Cmd/Ctrl+A for select all
- [ ] Implement Cmd/Ctrl+C for copy
- [ ] Implement Cmd/Ctrl+V for paste
- [ ] Implement arrow keys for nudge (1px)
- [ ] Implement Shift+arrows for nudge (10px)
- [ ] Implement Escape for deselect
- [x] Tool shortcuts (V, H, R, C)
- [x] Space key for pan mode
- [x] Layer management shortcuts (Cmd/Ctrl + [/])
- [ ] Create keyboard shortcuts reference
- [ ] Test all shortcuts

**Files Modified:**
- `app/canvas/_components/Canvas.tsx` (integrated keyboard handlers inline)

**Note:** Some keyboard shortcuts are implemented (delete, tool shortcuts, space pan, layer management), but copy/paste, nudge, and select all are not yet implemented.

---

### PR #22: Copy/Paste
**Branch:** `feature/copy-paste`  
**Goal:** Implement clipboard functionality

**Tasks:**
- [ ] Create internal clipboard state
- [ ] Implement copy selected objects (Cmd/Ctrl+C)
- [ ] Implement paste objects with offset (Cmd/Ctrl+V)
- [ ] Maintain object properties on paste
- [ ] Test copy/paste with single and multiple objects
- [ ] Sync pasted objects to other users

**Files Modified:**
- `store/canvasStore.ts` (add clipboard state)
- `hooks/useKeyboardShortcuts.ts` (add copy/paste handlers)
- `lib/canvas/objects.ts` (add duplicate with offset)

---

### PR #23: Rotation ✅
**Branch:** `feature/rotation`  
**Goal:** Add rotation capability

**Tasks:**
- [x] Add rotation handle to selected objects
- [x] Implement rotation interaction
- [ ] Display rotation angle during rotation (not implemented)
- [ ] Add snap to 15° with Shift key (not implemented)
- [x] Update object rotation in data model
- [x] Sync rotation across users
- [x] Test rotation with all shape types

**Files Modified:**
- `app/canvas/_components/Canvas.tsx` (uses Konva Transformer with rotation enabled)
- `app/canvas/_components/shapes/RectangleShape.tsx` (handles rotation in transform)
- `app/canvas/_components/properties/UniversalProperties.tsx` (rotation input field)
- `app/canvas/_types/shapes.ts` (rotation field in shape types)

**Note:** Rotation is fully functional via Konva Transformer handles and property panel input. Snap-to-angle and live angle display not yet implemented.

---

### PR #24: Properties Panel ✅
**Branch:** `feature/properties-panel`  
**Goal:** Create sidebar for object properties

**Tasks:**
- [x] Create PropertiesPanel component
- [x] Add position inputs (X, Y)
- [x] Add dimension inputs (Width, Height)
- [x] Add rotation input (degrees)
- [x] Add color picker
- [x] Add opacity slider
- [x] Implement real-time updates (panel ↔ canvas)
- [x] Add input validation
- [x] Test with all shape types
- [x] Add layer control buttons
- [x] Add shape-specific properties
- [x] Add default property editing for shape tools

**Files Created:**
- `app/canvas/_components/PropertiesPanel.tsx` (NEW)
- `app/canvas/_components/properties/UniversalProperties.tsx` (NEW)
- `app/canvas/_components/properties/StyleProperties.tsx` (NEW)
- `app/canvas/_components/properties/shape-properties/RectangleProperties.tsx` (NEW)
- `app/canvas/_components/properties/shape-properties/CircleProperties.tsx` (NEW)
- `app/canvas/_components/properties/shape-properties/index.ts` (NEW)

**Files Modified:**
- `app/canvas/_components/Canvas.tsx` (integrated PropertiesPanel)
- `app/canvas/page.tsx` (already rendering Canvas with panel)

---

### PR #25: Advanced Styling (Partial) ⚠️
**Branch:** `feature/advanced-styling`  
**Goal:** Add stroke and styling options

**Tasks:**
- [x] Add fill color with opacity controls
- [x] Add stroke/border color controls
- [x] Add stroke width controls
- [ ] Add stroke style options (solid, dashed, dotted) - not implemented
- [x] Update PropertiesPanel with styling options
- [x] Test styling on all shape types
- [x] Sync styling changes across users
- [x] Add "No Fill" option (transparent fill)
- [x] Add corner radius control for rectangles

**Files Modified:**
- `app/canvas/_types/shapes.ts` (styling properties already in types)
- `app/canvas/_components/properties/StyleProperties.tsx` (color pickers, opacity slider)
- `app/canvas/_components/properties/shape-properties/RectangleProperties.tsx` (corner radius)
- `app/canvas/_hooks/useObjects.ts` (sync styling changes)

**Note:** Fill color, stroke color, stroke width, opacity, and corner radius are fully implemented. Stroke style (dashed/dotted) is not yet implemented.

---

### PR #26: Undo/Redo (Optional)
**Branch:** `feature/undo-redo`  
**Goal:** Implement history management

**Tasks:**
- [ ] Create history state management
- [ ] Track canvas state changes
- [ ] Implement undo (Cmd/Ctrl+Z)
- [ ] Implement redo (Cmd/Ctrl+Shift+Z)
- [ ] Limit history to last 50 actions
- [ ] Test with various operations
- [ ] Handle undo/redo with real-time sync

**Files Created:**
- `hooks/useHistory.ts` (NEW)

**Files Modified:**
- `store/canvasStore.ts` (add history state)
- `hooks/useKeyboardShortcuts.ts` (add undo/redo)

---

### PR #27: Performance Optimization
**Branch:** `perf/optimization`  
**Goal:** Optimize for scale

**Tasks:**
- [ ] Implement viewport culling
- [ ] Add canvas layering (static/dynamic/cursor)
- [ ] Implement object pooling for cursors
- [ ] Throttle drag and resize operations
- [ ] Implement delta-based updates
- [ ] Add message batching
- [ ] Optimize Firestore queries with indexes
- [ ] Profile with Chrome DevTools
- [ ] Test with 500+ objects
- [ ] Test with 5+ concurrent users
- [ ] Verify 60 FPS at scale

**Files Modified:**
- `components/canvas/Canvas.tsx` (add culling)
- `lib/sync/objectSync.ts` (add batching and deltas)
- `lib/sync/cursorSync.ts` (add throttling)
- `lib/firebase/firestore.ts` (optimize queries)

---

### PR #28: AI Infrastructure
**Branch:** `feature/ai-setup`  
**Goal:** Set up AI service and API route

**Tasks:**
- [ ] Choose AI provider (OpenAI or Claude)
- [ ] Create AI service account
- [ ] Add AI API key to environment variables
- [ ] Install AI SDK dependencies
- [ ] Create Next.js API route (`/api/ai-command`)
- [ ] Set up AI client in API route
- [ ] Implement rate limiting
- [ ] Add error handling
- [ ] Test API route connectivity

**Files Created:**
- `app/api/ai-command/route.ts` (NEW)
- `lib/ai/prompts.ts` (NEW)

**Files Modified:**
- `package.json` (add AI SDK)
- `.env.example` (add AI API key variable)

---

### PR #29: AI Function Schemas
**Branch:** `feature/ai-functions`  
**Goal:** Define and implement AI callable functions

**Tasks:**
- [ ] Define function schemas for all operations
- [ ] Implement createShape function
- [ ] Implement moveShape function
- [ ] Implement resizeShape function
- [ ] Implement rotateShape function
- [ ] Implement deleteShape function
- [ ] Implement updateShapeStyle function
- [ ] Implement getCanvasState function
- [ ] Implement selectObjects function
- [ ] Test function calling with AI

**Files Created:**
- `lib/ai/functions.ts` (NEW)
- `lib/ai/handlers.ts` (NEW)

**Files Modified:**
- `app/api/ai-command/route.ts` (integrate functions)

---

### PR #30: AI Command Interface
**Branch:** `feature/ai-ui`  
**Goal:** Create AI command input UI

**Tasks:**
- [ ] Create AICommandInput component
- [ ] Add submit button and Enter key handler
- [ ] Create loading indicator
- [ ] Add command history (up/down arrows)
- [ ] Display AI responses
- [ ] Add error message display
- [ ] Create useAI hook
- [ ] Test AI input UI

**Files Created:**
- `components/ui/AICommandInput.tsx` (NEW)
- `hooks/useAI.ts` (NEW)
- `store/aiStore.ts` (NEW)

**Files Modified:**
- `app/canvas/page.tsx` (add AICommandInput)

---

### PR #31: Basic AI Commands
**Branch:** `feature/ai-basic-commands`  
**Goal:** Implement creation, manipulation, and style commands

**Tasks:**
- [ ] Write comprehensive system prompt
- [ ] Implement creation commands ("Create a blue rectangle")
- [ ] Implement manipulation commands ("Move the circle")
- [ ] Implement style commands ("Change to red")
- [ ] Implement deletion commands ("Delete the text")
- [ ] Add context awareness (getCanvasState)
- [ ] Test with various command inputs
- [ ] Verify objects appear correctly

**Files Modified:**
- `lib/ai/prompts.ts` (add system prompt)
- `app/api/ai-command/route.ts` (integrate commands)
- `lib/ai/handlers.ts` (implement command handlers)

---

### PR #32: Layout Commands
**Branch:** `feature/ai-layouts`  
**Goal:** Implement spatial arrangement commands

**Tasks:**
- [ ] Create layout algorithm functions
- [ ] Implement "arrange in row" command
- [ ] Implement "arrange in column" command
- [ ] Implement "create grid" command
- [ ] Implement "space evenly" command
- [ ] Implement "align" commands
- [ ] Implement "center" commands
- [ ] Test layout commands
- [ ] Verify precise positioning

**Files Created:**
- `lib/utils/positioning.ts` (NEW)

**Files Modified:**
- `lib/ai/functions.ts` (add layout functions)
- `lib/ai/handlers.ts` (add layout handlers)

---

### PR #33: Complex AI Commands
**Branch:** `feature/ai-complex`  
**Goal:** Implement multi-step commands

**Tasks:**
- [ ] Design login form template logic
- [ ] Implement "create login form" command
- [ ] Design navigation bar template logic
- [ ] Implement "build navigation bar" command
- [ ] Design card layout template logic
- [ ] Implement "make card layout" command
- [ ] Add multi-step execution
- [ ] Add progress feedback
- [ ] Test complex commands
- [ ] Verify professional layouts

**Files Modified:**
- `lib/ai/handlers.ts` (add complex command logic)
- `app/api/ai-command/route.ts` (handle multi-step)

---

### PR #34: AI UX Polish
**Branch:** `feature/ai-polish`  
**Goal:** Add visual feedback and animations

**Tasks:**
- [ ] Add AI "thinking" animation
- [ ] Add progress indicators
- [ ] Add toast notifications
- [ ] Implement object creation animations
- [ ] Add temporary highlighting for AI objects
- [ ] Auto-fade highlighting after 3-5 seconds
- [ ] Add command suggestions/examples
- [ ] Implement natural language errors
- [ ] Test AI user experience

**Files Modified:**
- `components/ui/AICommandInput.tsx` (add animations)
- `components/canvas/Canvas.tsx` (add highlighting)
- `hooks/useAI.ts` (add UX states)

---

### PR #35: Shared AI State
**Branch:** `feature/ai-shared-state`  
**Goal:** Enable multi-user AI access

**Tasks:**
- [ ] Implement AI command queue
- [ ] Add user attribution for AI commands
- [ ] Display "AI creating for [User]..." indicator
- [ ] Ensure AI objects sync to all users
- [ ] Test multiple users using AI simultaneously
- [ ] Verify no conflicts

**Files Modified:**
- `app/api/ai-command/route.ts` (add queue logic)
- `components/ui/AICommandInput.tsx` (show attribution)
- `lib/sync/objectSync.ts` (prioritize AI updates)

---

### PR #36: AI Performance & Logging
**Branch:** `feature/ai-optimization`  
**Goal:** Optimize AI and add logging

**Tasks:**
- [ ] Implement response caching
- [ ] Optimize function execution order
- [ ] Add parallel execution
- [ ] Limit max operations per command
- [ ] Measure and log response times
- [ ] Create AI command log data model
- [ ] Log commands with metadata
- [ ] Test AI response time <2 seconds

**Files Modified:**
- `app/api/ai-command/route.ts` (add caching and logging)
- `types/ai.ts` (add log types)
- `lib/firebase/firestore.ts` (add log storage)

---

### PR #37: Comprehensive Testing
**Branch:** `test/final-testing`  
**Goal:** Complete end-to-end testing

**Tasks:**
- [ ] Test all MVP requirements
- [ ] Test all Phase 2 features
- [ ] Test all Phase 3 AI features
- [ ] Test with 5+ concurrent users
- [ ] Test with 500+ objects
- [ ] Verify 60 FPS performance
- [ ] Test all keyboard shortcuts
- [ ] Test on Chrome, Firefox, Safari
- [ ] Fix any bugs discovered
- [ ] Document known issues

**Files Modified:**
- Any bug fixes needed

---

### PR #38: Documentation
**Branch:** `docs/final-documentation`  
**Goal:** Complete all documentation

**Tasks:**
- [ ] Write comprehensive README.md
- [ ] Add setup instructions
- [ ] Document all features
- [ ] List tech stack
- [ ] Add deployed link (prominent)
- [ ] Create ARCHITECTURE.md
- [ ] Document data models and flows
- [ ] Write AI_DEVELOPMENT_LOG.md
- [ ] Document AI tools and workflow
- [ ] Include effective prompts
- [ ] Estimate AI vs hand-written code
- [ ] Document AI learnings

**Files Created/Modified:**
- `README.md` (complete overhaul)
- `ARCHITECTURE.md` (NEW)
- `AI_DEVELOPMENT_LOG.md` (NEW)

---

### PR #39: Demo Video
**Branch:** `docs/demo-video`  
**Goal:** Record and add demo video

**Tasks:**
- [ ] Record introduction
- [ ] Record collaboration demo
- [ ] Record AI commands demo
- [ ] Record architecture walkthrough
- [ ] Record performance highlights
- [ ] Edit to 3-5 minutes
- [ ] Export as 1080p MP4
- [ ] Upload to YouTube or host
- [ ] Add link to README

**Files Modified:**
- `README.md` (add video link)

---

### PR #40: Final Deployment
**Branch:** `deploy/final`  
**Goal:** Final production deployment

**Tasks:**
- [ ] Run production build
- [ ] Deploy to Vercel
- [ ] Verify environment variables
- [ ] Test deployed app thoroughly
- [ ] Test with multiple users in production
- [ ] Verify all features work
- [ ] Update README with final status
- [ ] Tag release v1.0.0

**Files Modified:**
- `README.md` (final updates)
- Git tag created

---

## Summary

**Total PRs:** 40  
**MVP Completion:** PR #14 (14 PRs)  
**Phase 2 Completion:** PR #27 (27 PRs)  
**Phase 3 Completion:** PR #36 (36 PRs)  
**Final Submission:** PR #40 (40 PRs)

Each PR is self-contained, testable, and deployable. Follow the order to build features incrementally.

---

## Current Progress (As of October 2025)

### ✅ Completed PRs (1-11, 15, 20, 23, 24, 25 partial)
- **PR #1-10:** ✅ All MVP features complete (setup, auth, canvas, shapes, sync, cursors)
- **PR #11:** ✅ Presence System (OnlineUsers component showing active users)
- **PR #15:** ✅ Circle Shape (full support with creation, editing, properties)
- **PR #20:** ✅ Layer Management (z-index controls with UI buttons and keyboard shortcuts)
- **PR #21:** ⚠️ Keyboard Shortcuts (partial - delete, tool shortcuts, space pan, layer shortcuts working)
- **PR #23:** ✅ Rotation (via Konva Transformer and properties panel)
- **PR #24:** ✅ Properties Panel (comprehensive panel with position, size, rotation, styling, layer controls)
- **PR #25:** ⚠️ Advanced Styling (partial - colors, opacity, stroke width, corner radius working; dashed/dotted strokes not implemented)

### 🚧 Not Yet Implemented
- **PR #12:** Connection Status & Reconnection (offline handling)
- **PR #13:** Deployment Setup (needs Vercel deployment)
- **PR #14:** MVP Testing & Validation
- **PR #16:** Lines shape type
- **PR #17:** Text shape type
- **PR #18:** Multi-Select (shift-click, drag-to-select)
- **PR #19:** Group Operations
- **PR #21 remaining:** Copy/paste, select all, nudge with arrows, escape to deselect
- **PR #22:** Copy/Paste
- **PR #26:** Undo/Redo (optional)
- **PR #27:** Performance Optimization
- **PR #28-36:** AI Features (all not started)
- **PR #37-40:** Testing, documentation, deployment

### Key Features Working
✅ Canvas with pan & zoom  
✅ Rectangle and Circle shapes  
✅ Real-time collaboration with object sync  
✅ Multiplayer cursors with user names  
✅ Online user presence display  
✅ Locking system (prevents edit conflicts)  
✅ Comprehensive properties panel  
✅ Layer management (z-index)  
✅ Rotation support  
✅ Color pickers and styling controls  
✅ Tool shortcuts (V, H, R, C)  
✅ Delete key support  
✅ Space+drag pan mode