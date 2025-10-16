# Multiple Canvases Feature - Planning Document

## Feature Overview

Transform the single-canvas collaborative workspace into a multi-canvas application where users can create, manage, and switch between multiple independent canvases. Each canvas will have its own isolated set of objects, collaborators, cursors, and presence tracking.

**Why this feature:**
- **Organization:** Users can separate projects, experiments, and workspaces
- **Scalability:** Better data organization and performance (smaller datasets per canvas)
- **Collaboration:** Teams can work on multiple projects without interference
- **Professional UX:** Industry-standard pattern (Figma, Miro, FigJam all use this model)

---

## Current State Analysis

### Current Architecture Problems

**Single Global Canvas:**
- All users land on the same hardcoded canvas (`canvas-session-default`)
- All objects stored in flat `canvasObjects` collection (no grouping)
- No concept of canvas ownership or isolation
- Direct navigation to `/canvas` with no selection step

**Hardcoded Session ID:**
- Realtime DB paths use `sessions/canvas-session-default/`
- No dynamic canvas context throughout the app
- Presence and cursors mixed across all users regardless of intent

**No Canvas Management:**
- No UI to create, list, or delete canvases
- No canvas metadata (name, owner, created date, etc.)
- No way to share or control access to canvases

### Files That Will Need Changes

#### Core Data Layer (Critical Changes)

**`lib/firebase/firestore.ts`** (Major refactor)
- Add canvas CRUD operations (create, get, list, delete canvas)
- Update all object operations to scope by `canvasId`
- Change `CANVAS_OBJECTS_COLLECTION` from flat to nested or filtered by canvasId
- Update `subscribeToObjects()` to filter by canvas
- Update `getAllObjects()` to accept canvasId parameter
- All lock functions need canvas context

**`lib/firebase/realtime.ts`** (Major refactor)
- Replace hardcoded `SESSION_ID = "canvas-session-default"` with dynamic ID
- Add `sessionId` parameter to all cursor functions
- Add `sessionId` parameter to all presence functions
- Update all path references: `sessions/${sessionId}/cursors/`, `sessions/${sessionId}/presence/`
- Consider helper: `getSessionPath(canvasId, type: 'cursors' | 'presence')`

**`types/canvas.ts`** (Additions)
- Add `Canvas` interface with metadata:
  - `id: string`
  - `name: string`
  - `width: number` (canvas dimensions in pixels)
  - `height: number` (canvas dimensions in pixels)
  - `createdBy: string` (user ID)
  - `createdAt: number`
  - `updatedAt: number`
  - `isPublic: boolean` (for future sharing features)
- Update `BaseCanvasObject` to include `canvasId: string` field (if using flat collection)

**`types/user.ts`** (Minor additions)
- Potentially add canvas-related user preferences

#### Routing & Pages (Critical Changes)

**`app/canvas/page.tsx`** (Major redesign)
- Transform from canvas page to canvas dashboard/list page
- Display grid/list of user's canvases
- Add "New Canvas" button
- Add canvas cards with preview, name, edit, delete actions
- Navigation to `/canvas/[canvasId]` on card click

**`app/canvas/[canvasId]/page.tsx`** (New file - move current canvas here)
- Move existing `app/canvas/page.tsx` canvas logic here
- Accept `canvasId` from URL params
- Pass `canvasId` to all hooks and components
- Add canvas loading state and 404 handling
- Add canvas name in header

**`app/(auth)/login/page.tsx` & `signup/page.tsx`** (Minor)
- Update redirect after auth from `/canvas` to `/canvas` (dashboard)

#### Canvas Components (Moderate Changes)

**`app/canvas/_components/Canvas.tsx`** (Moderate refactor)
- Accept `canvasId` prop
- Pass `canvasId` to `useObjects`, `useCursors`, `usePresence`
- All operations scoped to current canvas
- Update toolbar/header to show canvas name

**`app/canvas/_components/OnlineUsers.tsx`** (Minor)
- Already receives presence from props, no change needed
- But verify it's showing users only for current canvas

**`app/canvas/_components/Toolbar.tsx`** (Minor if any)
- May need canvas context for future features
- Could add canvas switcher/breadcrumb

**`app/canvas/_components/PropertiesPanel.tsx`** (Minimal)
- Already operates on selected objects, no canvas-specific logic

#### Custom Hooks (Moderate Changes)

**`app/canvas/_hooks/useObjects.ts`** (Moderate refactor)
- Accept `canvasId` parameter
- Pass to all Firestore operations
- Update subscription to filter by canvas
- Ensure all CRUD operations include canvasId

**`app/canvas/_hooks/useCursors.ts`** (Moderate refactor)
- Accept `canvasId` parameter
- Pass as sessionId to all realtime.ts functions
- Update subscription path

**`app/canvas/_hooks/usePresence.ts`** (Moderate refactor)
- Accept `canvasId` parameter
- Pass as sessionId to all realtime.ts functions
- Update subscription path

**`app/canvas/_hooks/useActiveTransforms.ts`** (Check if exists - moderate)
- If this exists and uses realtime DB, needs canvasId

#### Shape System (Moderate Changes)

**`app/canvas/_lib/shapes.ts`** (Moderate refactor)
- Update `createDefault()` functions to accept/include `canvasId`
- Update `toFirestore()` to ensure `canvasId` is included
- Update `fromFirestore()` to extract `canvasId`

**`app/canvas/_components/shapes/*.tsx`** (Minimal if any)
- Shape components likely don't need changes (operate on object data)

#### New Components Needed

**`app/canvas/_components/CanvasDashboard.tsx`** (New)
- Grid/list view of canvases
- Canvas cards with name, preview, metadata
- Create button
- Delete confirmation modal

**`app/canvas/_components/CanvasCard.tsx`** (New)
- Individual canvas card component
- Thumbnail/preview (optional for v1)
- Name, dimensions (e.g., "1920×1080"), creation date, last modified
- Click to open, delete button
- Edit name inline or modal

**`app/canvas/_components/CreateCanvasModal.tsx`** (New)
- Modal dialog for canvas creation
- Input for canvas name
- Inputs for canvas dimensions (width and height in pixels)
- Preset dimension options (e.g., 1920x1080, 1024x768, custom)
- Form validation (name required, dimensions must be positive integers)
- Cancel/Create buttons

**`app/canvas/_components/CanvasHeader.tsx`** (New or refactor existing)
- Show current canvas name
- Breadcrumb navigation (Dashboard / Canvas Name)
- Canvas settings/rename option

#### Hooks Needed

**`app/canvas/_hooks/useCanvases.ts`** (New)
- List user's canvases
- Subscribe to canvas list changes
- Create canvas
- Delete canvas
- Update canvas metadata

**`app/canvas/_hooks/useCanvas.ts`** (New)
- Get single canvas by ID
- Subscribe to canvas metadata changes
- Handle canvas not found

#### Library Functions

**`lib/firebase/canvas.ts`** (New file)
- Canvas CRUD operations
- `createCanvas(userId, name, width, height)` - creates canvas with dimensions
- `getCanvas(canvasId)`
- `getUserCanvases(userId)`
- `updateCanvas(canvasId, updates)` - can update dimensions, name, etc.
- `deleteCanvas(canvasId)` - also delete all objects and sessions
- `subscribeToCanvas(canvasId, callback)`
- `subscribeToUserCanvases(userId, callback)`

#### Security Rules

**`firestore.rules`** (Major update)
- Currently allows all read/write (open for development)
- Need to add rules for:
  - `canvases` collection: users can read/write their own canvases
  - `canvasObjects` collection: scoped by canvasId, check canvas ownership
  - Nested structure: if using `canvases/{canvasId}/objects/{objectId}`

**`database.rules.json`** (Major update)
- Currently allows all read/write
- Need to add rules for:
  - `sessions/{canvasId}/cursors`: authenticated users can write their own
  - `sessions/{canvasId}/presence`: authenticated users can write their own
  - Read access based on canvas permissions

#### Utilities

**`lib/constants/canvas.ts`** (New or update existing)
- Default canvas name: "Untitled Canvas"
- Default canvas dimensions: 1920x1080
- Canvas dimension presets: [1920x1080, 1024x768, 800x600, custom]
- Canvas name max length
- Canvas dimension min/max values (e.g., min: 100, max: 10000)
- Default canvas ID for migration: "default-canvas"

#### Store (Minimal Changes)

**`app/canvas/_store/canvas-store.ts`** (Minor additions)
- Potentially add `currentCanvasId` to store
- Or keep it in URL params only (recommended)

### Existing Patterns We Can Leverage

**Authentication & User Context:**
- `useAuth()` hook already provides current user
- Can use `user.uid` for canvas ownership
- Auth guards already in place via `ProtectedRoute`

**Real-time Subscriptions Pattern:**
- Existing `subscribeToObjects` pattern can be replicated for canvases
- Already handle subscription cleanup in hooks
- Error handling patterns established

**CRUD Utilities:**
- Firestore helper patterns established in `lib/firebase/firestore.ts`
- Can follow same pattern for canvas operations

**Component Organization:**
- Co-location pattern: new canvas components in `app/canvas/_components/`
- Hook pattern: new canvas hooks in `app/canvas/_hooks/`
- Route grouping: dynamic route `[canvasId]` follows Next.js conventions

### Potential Conflicts & Dependencies

**Backwards Compatibility:**
- Existing canvasObjects in database have no canvasId
- Need migration strategy (covered in Phase 4)

**URL Structure Change:**
- Current bookmarks to `/canvas` will break
- Could redirect `/canvas` → `/canvas` (dashboard) ✓
- Canvas URLs become `/canvas/[id]` (shareable)

**Lock System:**
- Locks are stored on objects (no change needed)
- But should verify locks don't leak across canvases (they won't with proper scoping)

**Presence Tracking:**
- Users could be on multiple canvases in different tabs
- Current presence system handles this (keyed by userId within session)
- Each canvas session is independent

---

## Implementation Approach

### Phase 1: Data Model & Backend Infrastructure

**Goal:** Establish canvas data structure and CRUD operations without touching UI

**Tasks:**
1. Create `lib/firebase/canvas.ts` with canvas CRUD operations
2. Add `Canvas` type to `types/canvas.ts` with dimensions (width, height)
3. Create `lib/constants/canvas.ts` with default dimensions and presets
4. Decide on Firestore structure:
   - **Option A (Recommended):** Nested collections `canvases/{canvasId}/objects/{objectId}`
   - **Option B:** Flat with field `canvasObjects` with `canvasId` field + filtered queries
5. Update `BaseCanvasObject` to include `canvasId` field (if using Option B)
6. Implement canvas operations:
   - `createCanvas(userId, name, width, height)` → creates canvas document with dimensions
   - `getUserCanvases(userId)` → queries by `createdBy`
   - `getCanvas(canvasId)` → fetch canvas metadata (including dimensions)
   - `deleteCanvas(canvasId)` → delete canvas + all objects
   - `subscribeToUserCanvases(userId, callback)` → real-time list

**Testing:**
- Create canvas via Firebase console or test script
- Verify queries return correct data
- Test subscriptions fire correctly

**Deliverable:** Canvas CRUD layer ready, no UI changes yet

---

### Phase 2: Canvas Dashboard UI

**Goal:** Build canvas selection/management interface

**Tasks:**
1. Create `app/canvas/_hooks/useCanvases.ts` hook
   - Wraps canvas CRUD operations
   - Manages loading states and errors
   - Provides create, delete, list functions
2. Create `app/canvas/_components/CanvasCard.tsx`
   - Display canvas name, metadata
   - Click handler to navigate
   - Delete button with confirmation
3. Create `app/canvas/_components/CreateCanvasModal.tsx`
   - Input for canvas name
   - Dimension preset selector (1920x1080, 1024x768, 800x600, Custom)
   - Custom dimension inputs (width and height in pixels)
   - Form validation (name required, dimensions positive integers within min/max)
   - Create handler that passes name and dimensions
4. Transform `app/canvas/page.tsx` into dashboard
   - Grid/list of canvas cards
   - "New Canvas" button
   - Empty state for new users
   - Loading and error states
5. Add navigation: clicking card → `/canvas/[canvasId]`

**UX Flow:**
- User logs in → redirected to `/canvas` (dashboard)
- Dashboard shows list of their canvases
- Click "New Canvas" → modal → enter name and dimensions (or select preset) → creates → navigates to new canvas
- Click existing canvas → navigates to `/canvas/[canvasId]`
- Hover on canvas card → delete button appears → confirm → deletes canvas

**Testing:**
- Create multiple canvases
- Delete canvas
- Navigate to canvas (will 404 until Phase 3)

**Deliverable:** Working canvas dashboard, can create/list/delete canvases

---

### Phase 3: Dynamic Canvas Routing & Session Management

**Goal:** Make the canvas page work with dynamic canvas IDs

**Tasks:**
1. Create `app/canvas/[canvasId]/page.tsx`
   - Move current canvas logic from `app/canvas/page.tsx`
   - Extract `canvasId` from params: `const { canvasId } = await params`
   - Pass `canvasId` to Canvas component
2. Update `lib/firebase/realtime.ts`
   - Remove hardcoded `SESSION_ID` constant
   - Add `sessionId` parameter to all functions
   - Update all path references to use dynamic sessionId
3. Update `lib/firebase/firestore.ts`
   - Add `canvasId` parameter to object operations (if using flat structure)
   - OR update collection path (if using nested structure)
   - Update `subscribeToObjects(canvasId, callback)`
   - Update all CRUD to scope by canvas
4. Update hooks to accept and pass `canvasId`:
   - `useObjects(canvasId)`
   - `useCursors(canvasId)`
   - `usePresence(canvasId)`
5. Update `app/canvas/_components/Canvas.tsx`
   - Accept `canvasId` prop
   - Pass to all hooks
   - Accept canvas metadata (including dimensions) from parent
   - Use canvas dimensions for bounds/constraints (optional: visual canvas bounds)
   - Add canvas loading/error states
6. Create `app/canvas/_hooks/useCanvas.ts`
   - Fetch canvas metadata (including dimensions)
   - Handle not found (404)
   - Subscribe to canvas updates (for name/dimension changes)
7. Update shape factories in `app/canvas/_lib/shapes.ts`
   - Include `canvasId` in created objects

**Canvas Loading Flow:**
- URL: `/canvas/abc123`
- Page loads → fetch canvas metadata → 404 if not found
- Subscribe to objects for `canvasId: abc123`
- Subscribe to cursors at `sessions/abc123/cursors`
- Subscribe to presence at `sessions/abc123/presence`
- Render canvas with isolated data

**Testing:**
- Navigate to canvas from dashboard
- Verify objects, cursors, presence are scoped to canvas
- Open two canvases in different tabs → verify isolation
- Test with 2+ users on different canvases → no crosstalk

**Deliverable:** Fully functional multi-canvas system with isolated sessions

---

### Phase 4: Backwards Compatibility & Data Migration

**Goal:** Migrate existing data to new structure without losing anything

**Migration Strategy:**

**Create Default Canvas:**
1. Create a "Default Canvas" with a known ID (e.g., `"default-canvas"`)
2. Set `createdBy` to first user or admin
3. Set `createdAt` to earliest object timestamp (or now)

**Migrate Existing Objects:**

If using **Nested Collections** (Option A):
- Read all documents from `canvasObjects` collection
- Write to `canvases/default-canvas/objects/{objectId}`
- Delete from old `canvasObjects` collection (after verification)

If using **Flat with Field** (Option B):
- Read all documents from `canvasObjects` collection
- Update each with `canvasId: "default-canvas"`
- Queries automatically filter by canvasId going forward

**Migrate Realtime Sessions:**
- Data in `sessions/canvas-session-default/` can stay
- Update code to use `sessions/default-canvas/` going forward
- Old data will age out naturally (30-min cleanup)

**Implementation:**
1. Create migration script or admin function
2. Run in development first, verify data integrity
3. Create backup of Firestore before production migration
4. Run migration in production
5. Monitor for errors

**Rollback Plan:**
- Keep old data for 7 days before deletion
- Can revert code changes and restore old collection if needed

**Testing:**
- Create objects before migration
- Run migration
- Verify all objects appear in default canvas
- Verify new objects work correctly
- Test multi-user session on default canvas

**Deliverable:** Existing users see all their work in "Default Canvas", no data loss

---

### Phase 5: Permissions, Polish & Edge Cases

**Goal:** Production-ready feature with proper security and UX

**Tasks:**

**Security Rules:**
1. Update `firestore.rules`:
   ```
   match /canvases/{canvasId} {
     allow read: if request.auth != null && resource.data.createdBy == request.auth.uid;
     allow write: if request.auth != null && resource.data.createdBy == request.auth.uid;

     match /objects/{objectId} {
       allow read, write: if request.auth != null;
       // Later: check canvas permissions
     }
   }
   ```
2. Update `database.rules.json`:
   ```json
   {
     "rules": {
       "sessions": {
         "$canvasId": {
           "cursors": {
             "$userId": {
               ".write": "$userId == auth.uid",
               ".read": "auth != null"
             }
           },
           "presence": {
             "$userId": {
               ".write": "$userId == auth.uid",
               ".read": "auth != null"
             }
           }
         }
       }
     }
   }
   ```

**Polish:**
1. Add canvas rename functionality
   - Edit icon on canvas card
   - Inline edit or modal
   - Update canvas name in Firestore
2. Add canvas header/breadcrumb
   - Show canvas name and dimensions in header when editing
   - Link back to dashboard
   - Optional: canvas settings menu for future features
3. Improve delete confirmation
   - Show warning about losing all objects
   - Require typing canvas name to confirm
4. Add empty states
   - "No canvases yet" on dashboard
   - "Create your first canvas" prompt
5. Add loading skeletons
   - Canvas card skeletons while loading
   - Canvas loading state before render
6. Error handling
   - Canvas not found → 404 page with link to dashboard
   - Permission denied → error message
   - Network errors → retry mechanism

**Performance:**
- Add pagination to canvas list (if user has 50+ canvases)
- Lazy load canvas thumbnails
- Optimize queries with indexes

**Testing:**
- Canvas permissions (can't access other user's canvases)
- Rename canvas
- Delete canvas with many objects
- Load time with many canvases
- Concurrent users on same canvas

**Deliverable:** Production-ready multi-canvas feature with security and polish

---

## Considerations

### Edge Cases to Handle

**Canvas Not Found:**
- User navigates to `/canvas/invalid-id`
- Solution: Show 404 page, link to dashboard, suggest canvases

**Canvas Deleted While Editing:**
- User A deletes canvas while User B is editing it
- Solution: Canvas subscription detects deletion → show modal → redirect to dashboard

**No Canvases:**
- New user signs up, lands on empty dashboard
- Solution: Empty state with "Create your first canvas" prompt, auto-create default canvas, or show tutorial

**Rapid Canvas Creation:**
- User spams "Create Canvas" button
- Solution: Disable button while creating, add debounce, show loading state

**Large Canvas List:**
- User has 100+ canvases
- Solution: Pagination (show 20 per page), search/filter, sort by recent

**Default Canvas Migration:**
- Multiple users have objects in old structure
- Solution: Migrate to shared default canvas OR create per-user default canvas

**Browser History:**
- User navigates back from canvas to dashboard
- Solution: Works automatically with Next.js routing, no special handling

**Direct Canvas Links:**
- User shares `/canvas/abc123` URL
- Solution: Check canvas permissions, show permission error if not owner (later: add sharing)

**Multiple Tabs:**
- User opens same canvas in multiple tabs
- Solution: Works fine, realtime sync keeps them in sync, multiple cursor instances (same color)

**Concurrent Deletion:**
- Two users try to delete same canvas simultaneously
- Solution: Firestore handles this, first one succeeds, second gets "not found"

### Potential Risks & Technical Challenges

**Data Migration Risk:**
- **Risk:** Lose existing objects during migration
- **Mitigation:** Create backup, test in dev extensively, run migration script with verification, keep old data for rollback period
- **Rollback:** Restore from backup, revert code changes

**Realtime DB Path Changes:**
- **Risk:** Breaking change to presence/cursor tracking
- **Mitigation:** Update all functions in single phase, test thoroughly before deploy
- **Impact:** Temporary cursor/presence loss during deployment (recoverable)

**URL Structure Breaking Change:**
- **Risk:** Bookmarks to `/canvas` break
- **Mitigation:** `/canvas` becomes dashboard (still valid), old direct-to-canvas bookmarks redirect to dashboard
- **Impact:** Minor user inconvenience, but dashboard is proper entry point

**Query Performance:**
- **Risk:** Filtering objects by canvasId in flat collection could be slow
- **Mitigation:** Add Firestore index on `canvasId`, use nested collections, limit objects per canvas
- **Monitoring:** Add query time logging, optimize if >100ms

**Lock System with Canvas Context:**
- **Risk:** Locks might leak across canvases
- **Mitigation:** Locks are stored on objects, objects are scoped by canvas, no cross-canvas contamination possible
- **Testing:** Verify with multi-canvas multi-user scenario

**Firestore Costs:**
- **Risk:** Extra collection for canvases increases reads
- **Mitigation:** Canvas metadata is small, cache in memory, use subscriptions (1 read then updates), minimal impact
- **Estimate:** ~1 read per page load, negligible cost increase

**State Management Complexity:**
- **Risk:** Passing canvasId everywhere is error-prone
- **Mitigation:** Use React Context for canvasId at canvas page level, reduce prop drilling
- **Alternative:** Keep canvasId in URL only, hooks extract from router params (cleaner but more coupling)

### Testing Strategy

**Unit Tests:**
- Canvas CRUD operations (create, get, delete)
- Canvas ownership queries
- Object filtering by canvasId
- Realtime path generation

**Integration Tests:**
- Create canvas → navigate → create object → verify in Firestore
- Delete canvas → verify objects deleted
- Subscribe to canvas list → create new → verify appears
- Multi-canvas isolation (objects don't leak)

**Manual Testing:**
- **User Flow:** Login → Dashboard → Create Canvas → Edit → Return → Create Second Canvas → Switch → Verify Isolation
- **Multi-User:** User A creates canvas → User B cannot see it
- **Realtime:** User A and B on same canvas → cursors and objects sync
- **Migration:** Existing data appears in default canvas
- **Performance:** Load 10 canvases, 100 objects per canvas, 60 FPS

**Load Testing:**
- 50 canvases per user
- 500 objects per canvas
- 5 concurrent users on one canvas
- Measure: query time, render time, sync latency

**Security Testing:**
- Try to access another user's canvas by ID (should fail)
- Try to write to another user's canvas (should fail)
- Verify rules in Firebase console

### Performance Implications

**Positive Impacts:**
- Smaller object queries (scoped by canvas, not global)
- Faster render (fewer objects per canvas vs. all objects globally)
- Better Firestore efficiency (targeted queries vs. scan all)

**Potential Concerns:**
- Additional canvas list query on dashboard (1 query, small dataset)
- Canvas metadata fetch per canvas page load (cached after first load)
- Migration one-time cost (batch writes)

**Optimization Opportunities:**
- Add Firestore indexes: `canvasId`, `createdBy`, composite `(createdBy, createdAt)`
- Use snapshot listeners to cache canvas list
- Lazy load canvas thumbnails (future feature)
- Paginate large canvas lists

### Security Considerations

**Canvas Ownership:**
- Only owner can read/write their canvases
- Later: add sharing with permissions (viewer, editor)

**Object Access:**
- Objects inherit canvas permissions
- If user can access canvas, they can access all objects in it
- Later: add object-level permissions if needed

**Realtime Database:**
- Users can write their own cursor/presence
- Users can read all cursors/presence in a session
- Later: restrict read to canvas members only

**Rules Testing:**
- Use Firebase emulator for rule testing
- Test all CRUD operations as different users
- Verify permission denied errors

**API Keys:**
- Firebase config is public (expected for client SDK)
- Security comes from rules, not hiding config
- Ensure rules are tight before deploying

---

## Database Schema Design

### Option A: Nested Collections (Recommended)

**Firestore Structure:**
```
canvases/ (collection)
  {canvasId}/ (document)
    - id: string
    - name: string
    - width: number
    - height: number
    - createdBy: string
    - createdAt: number
    - updatedAt: number
    - isPublic: boolean

    objects/ (subcollection)
      {objectId}/ (document)
        - [all current CanvasObject fields]
        - canvasId: string (redundant but useful for queries)
```

**Realtime Database Structure:**
```
sessions/
  {canvasId}/
    cursors/
      {userId}: { userId, x, y, timestamp }
    presence/
      {userId}: { userId, displayName, email, color, lastSeen, isOnline }
```

**Pros:**
- Clean data hierarchy
- Automatic cascade delete (delete canvas → deletes all objects)
- Clear ownership model
- Firestore optimizes nested collections

**Cons:**
- Harder to query across canvases (not needed in this app)
- Migration requires moving documents (doable)

### Option B: Flat with Field

**Firestore Structure:**
```
canvases/ (collection)
  {canvasId}/ (document)
    - [same as Option A]

canvasObjects/ (collection)
  {objectId}/ (document)
    - [all current CanvasObject fields]
    - canvasId: string  (NEW FIELD)
```

**Pros:**
- Simpler migration (just add canvasId field)
- Can query across canvases if needed
- Matches current structure

**Cons:**
- Need manual cascade delete (delete canvas → query + delete all objects)
- Requires composite index on `(canvasId, zIndex, createdAt)`
- Less clear data ownership

**Recommendation:** Use **Option A (Nested Collections)** for cleaner architecture and automatic cascade delete.

---

## User Experience Flow

### New User Journey
1. Sign up → Redirected to `/canvas` (dashboard)
2. See empty state: "You don't have any canvases yet"
3. Click "Create Canvas" → Modal appears
4. Enter canvas name: "My First Project" → Select dimensions (or use default 1920×1080) → Click Create
5. Redirected to `/canvas/{newCanvasId}`
6. Blank canvas loads with specified dimensions → Start creating shapes

### Existing User Journey
1. Log in → Redirected to `/canvas` (dashboard)
2. See list of canvases (including migrated "Default Canvas")
3. Click on "Default Canvas" → Opens with all previous work intact
4. Create new canvas for new project
5. Switch between canvases via dashboard (back button or breadcrumb)

### Collaborative Session
1. User A creates "Team Brainstorm" canvas
2. User A shares URL `/canvas/team-brainstorm-id` with User B (future: sharing UI)
3. User B opens link → Sees canvas (if shared/public)
4. Both users see each other's cursors scoped to this canvas only
5. Both users create objects that sync in real-time
6. If User A is also editing "Personal Notes" canvas in another tab, those sessions are completely isolated

---

## Future Enhancements (Out of Scope)

**Canvas Sharing:**
- Share canvas with other users (viewer, editor, admin roles)
- Public vs. private canvases
- Invite by email
- Shareable links with permissions

**Canvas Templates:**
- "Blank Canvas", "Wireframe", "Flowchart" templates
- User-created templates
- Template gallery

**Canvas Thumbnails:**
- Generate preview image of canvas
- Show in canvas card
- Update on change (debounced)

**Canvas Organization:**
- Folders/tags for canvases
- Search and filter
- Sort by name, date, last modified
- Archive canvases

**Canvas Settings:**
- Edit canvas dimensions after creation (resize canvas)
- Grid settings per canvas
- Snap settings per canvas
- Canvas background color/image
- Canvas bounds enforcement

**Collaboration Features:**
- Real-time comments on canvas
- @mentions in comments
- Canvas activity log
- Notifications

**Export/Import:**
- Export canvas as JSON
- Import canvas from file
- Duplicate canvas

---

## Success Criteria

**Minimum Viable (Phase 1-3):**
- Users can create multiple canvases
- Users can switch between canvases
- Objects, cursors, presence are isolated per canvas
- Dashboard shows list of canvases
- Can delete canvases

**Complete (Phase 4):**
- Existing data migrated to default canvas
- No data loss
- Backwards compatible

**Production Ready (Phase 5):**
- Security rules enforced
- Proper error handling
- Canvas rename works
- Polished UI/UX
- Performance tested

---

## Open Questions & Decisions Needed

1. **Default Canvas for Existing Data:**
   - Single shared "Default Canvas" for all users? (simpler migration)
   - Per-user default canvas? (cleaner ownership)
   - **Decision:** Per-user default canvas (use userId as createdBy)

2. **Canvas Access Model:**
   - Start with private only (owner access)?
   - Add public canvases in v1?
   - **Decision:** Private only for v1, add sharing in v2

3. **URL Structure:**
   - `/canvas/[canvasId]` (clean, RESTful)
   - `/c/[canvasId]` (shorter for sharing)
   - **Decision:** `/canvas/[canvasId]` (clarity over brevity)

4. **Canvas Deletion:**
   - Soft delete (mark as deleted, keep data)?
   - Hard delete (immediate removal)?
   - **Decision:** Hard delete for v1, add trash/restore in v2

5. **Canvas Limit:**
   - Unlimited canvases per user?
   - Limit to 50 or 100?
   - **Decision:** No limit for v1, monitor usage

6. **Migration Timing:**
   - Before or after deploying multi-canvas code?
   - **Decision:** Deploy code first (gracefully handles no canvasId), then run migration

---

## Estimated Scope

**File Changes:** ~20 files modified, ~8 new files created
**Code Complexity:** Moderate (requires careful refactoring, but follows existing patterns)
**Testing Needs:** High (data integrity critical, multi-user scenarios)
**Risk Level:** Medium (migration and backwards compatibility are main risks)

**Critical Path:**
1. Data model & canvas CRUD (Phase 1)
2. Dynamic routing & session scoping (Phase 3)
3. Migration (Phase 4)
4. Security rules (Phase 5)

Non-critical (can iterate):
- Dashboard UI polish
- Canvas rename
- Advanced permissions

---

## Next Steps

Once this plan is approved:
1. Create detailed PR breakdown for each phase
2. Set up feature branch: `feature/multiple-canvases`
3. Start with Phase 1: Data model & backend infrastructure
4. Test each phase thoroughly before proceeding
5. Document decisions and changes in commit messages
