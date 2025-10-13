# Canvas Type Definitions - Planning Document

Based on the PRD requirements, here are all the types we need for the canvas system.

## Core Requirements Analysis

### Phase 1 (MVP) Requirements:
- Pan/zoom viewport
- Shape types: Rectangle, Circle, Text (at least one)
- Create and move objects
- Real-time sync with timestamps
- Multi-user cursors with names
- Presence tracking

### Phase 2 Requirements:
- Additional shapes: Lines
- Multi-select
- Rotation
- Layer management (z-index)
- Styling: color, opacity, stroke
- Properties: position, size, rotation

### Phase 3 (AI) Requirements:
- AI needs to reference objects by ID
- AI needs to query canvas state
- Track AI-created objects
- Visual feedback for AI operations

---

## Type Definitions

### 1. Base Canvas Object

```typescript
interface BaseCanvasObject {
  // Identity
  id: string;                    // Unique identifier (Firestore doc ID)
  type: 'rectangle' | 'circle' | 'line' | 'text';
  
  // Ownership & Sync
  createdBy: string;              // User ID who created it
  createdAt: number;              // Timestamp (milliseconds)
  updatedBy: string;              // User ID who last modified it
  updatedAt: number;              // Timestamp for last-write-wins conflict resolution
  
  // Collaborative Locking
  lockedBy: string | null;        // User ID currently editing (null = unlocked)
  lockedAt: number | null;        // When lock was acquired
  lockTimeout: number;            // Lock auto-expires after this duration (ms, e.g., 30000 = 30s)
  
  // Transform
  x: number;                      // X position on canvas
  y: number;                      // Y position on canvas
  width: number;                  // Width (not used for lines)
  height: number;                 // Height (not used for lines)
  rotation: number;               // Rotation in degrees (0-360)
  
  // Styling
  fill: string;                   // Fill color (hex or rgba)
  fillOpacity: number;            // Fill opacity (0-1)
  stroke: string;                 // Stroke/border color
  strokeWidth: number;            // Stroke width in pixels
  strokeOpacity: number;          // Stroke opacity (0-1)
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  
  // Layer Management
  zIndex: number;                 // Layer order (higher = front)
  
  // Selection & Interaction
  locked: boolean;                // If true, permanently locked (admin feature, future)
  visible: boolean;               // If false, hidden from canvas
  
  // AI Attribution (optional, for Phase 3)
  createdByAI?: boolean;          // Track if AI created this
  aiCommandId?: string;           // Link to AI command that created it
}
```

### 2. Shape-Specific Types

```typescript
// Rectangle
interface RectangleObject extends BaseCanvasObject {
  type: 'rectangle';
  cornerRadius?: number;          // Rounded corners (0 = sharp)
}

// Circle/Ellipse
interface CircleObject extends BaseCanvasObject {
  type: 'circle';
  // Uses width & height (if equal = circle, if different = ellipse)
}

// Line
interface LineObject extends Omit<BaseCanvasObject, 'width' | 'height' | 'fill' | 'fillOpacity'> {
  type: 'line';
  x2: number;                     // End point X
  y2: number;                     // End point Y
  // Lines don't use width/height/fill
}

// Text
interface TextObject extends BaseCanvasObject {
  type: 'text';
  content: string;                // The actual text
  fontSize: number;               // Font size in pixels
  fontFamily: string;             // Font family name
  fontWeight: 'normal' | 'bold' | 'lighter' | 'bolder';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  textDecoration: 'none' | 'underline' | 'line-through';
  lineHeight: number;             // Line height multiplier (1.0 = normal)
}

// Union type for any canvas object
type CanvasObject = RectangleObject | CircleObject | LineObject | TextObject;
```

### 3. Canvas State & Viewport

```typescript
// Viewport (pan/zoom state)
interface Viewport {
  x: number;                      // Pan offset X
  y: number;                      // Pan offset Y
  zoom: number;                   // Zoom level (1.0 = 100%, 2.0 = 200%)
  minZoom: number;                // Minimum zoom (e.g., 0.1 = 10%)
  maxZoom: number;                // Maximum zoom (e.g., 5.0 = 500%)
}

// Canvas dimensions
interface CanvasDimensions {
  width: number;                  // Canvas width in pixels
  height: number;                 // Canvas height in pixels
}

// Canvas state (local client state)
interface CanvasState {
  objects: Record<string, CanvasObject>;  // Key = object ID
  selectedIds: string[];          // Currently selected object IDs
  viewport: Viewport;
  dimensions: CanvasDimensions;
  isDrawing: boolean;             // Currently drawing a shape
  isPanning: boolean;             // Currently panning
  tool: CanvasTool;               // Active tool
}

// Available tools
type CanvasTool = 
  | 'select'                      // Selection/move tool
  | 'rectangle'                   // Draw rectangles
  | 'circle'                      // Draw circles
  | 'line'                        // Draw lines
  | 'text'                        // Add text
  | 'pan';                        // Pan canvas
```

### 4. Cursor & Presence (Realtime Database)

```typescript
// Cursor position (high-frequency updates)
interface CursorPosition {
  userId: string;
  x: number;                      // Cursor X on canvas
  y: number;                      // Cursor Y on canvas
  timestamp: number;              // Last update timestamp
}

// User presence (already defined in types/user.ts, but included for reference)
interface UserPresence {
  userId: string;
  displayName: string;
  email: string;
  color: string;                  // Assigned color for cursor/presence
  lastSeen: number;               // Timestamp
  isOnline: boolean;
}

// Active users map (for Realtime Database)
type PresenceMap = Record<string, UserPresence>;      // Key = userId
type CursorMap = Record<string, CursorPosition>;      // Key = userId
```

### 5. Locking System

```typescript
// Lock request
interface LockRequest {
  objectId: string;
  userId: string;
  timestamp: number;
}

// Lock response
interface LockResponse {
  success: boolean;
  lockedBy: string | null;        // Who currently holds the lock (if failed)
  expiresAt: number | null;       // When current lock expires (if failed)
  message?: string;               // Error message if failed
}

// Lock helpers
interface LockHelpers {
  acquireLock: (objectId: string, userId: string) => Promise<LockResponse>;
  releaseLock: (objectId: string, userId: string) => Promise<boolean>;
  renewLock: (objectId: string, userId: string) => Promise<boolean>;
  checkLock: (objectId: string) => Promise<{ isLocked: boolean; lockedBy: string | null }>;
  isLockExpired: (lockedAt: number, lockTimeout: number) => boolean;
}
```

### 6. Sync & Updates (for delta updates, Phase 2)

```typescript
// Object update (for sending only changes)
interface ObjectUpdate {
  id: string;
  changes: Partial<CanvasObject>;
  updatedBy: string;
  updatedAt: number;
}

// Batch update (for message batching)
interface BatchUpdate {
  updates: ObjectUpdate[];
  timestamp: number;
}

// Object operation types
type ObjectOperation = 
  | { type: 'create'; object: CanvasObject }
  | { type: 'update'; id: string; changes: Partial<CanvasObject> }
  | { type: 'delete'; id: string }
  | { type: 'batch'; operations: ObjectOperation[] };
```

### 7. Selection & History

```typescript
// Selection state
interface Selection {
  ids: string[];                  // Selected object IDs
  bounds?: {                      // Bounding box of selection
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// History entry (for undo/redo, Phase 2 optional)
interface HistoryEntry {
  timestamp: number;
  operation: ObjectOperation;
  inverse: ObjectOperation;       // How to undo this operation
}

interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxSize: number;                // Max history entries (e.g., 50)
}
```

### 8. AI Types (Phase 3)

```typescript
// AI command
interface AICommand {
  id: string;
  userId: string;
  command: string;                // Natural language command
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    objectIds: string[];          // IDs of objects created/modified
    message: string;              // Feedback message
  };
  error?: string;
}

// AI function call types
type AIFunction = 
  | 'createShape'
  | 'moveShape'
  | 'resizeShape'
  | 'rotateShape'
  | 'deleteShape'
  | 'updateStyle'
  | 'getCanvasState'
  | 'selectObjects'
  | 'arrangeLayout';

// AI context (for function calling)
interface AIContext {
  objects: CanvasObject[];
  selectedIds: string[];
  viewport: Viewport;
  userId: string;
}
```

---

## Firestore Schema

### Collection: `canvasObjects`
```typescript
{
  // Document ID = object.id
  ...BaseCanvasObject fields
  // Indexes needed:
  // - updatedAt (for ordering)
  // - createdBy (for filtering)
  // - type (for filtering)
  // - zIndex (for layer ordering)
}
```

### Realtime Database Structure
```typescript
{
  "sessions": {
    "canvas-session-id": {
      "cursors": {
        "userId1": { x, y, timestamp },
        "userId2": { x, y, timestamp }
      },
      "presence": {
        "userId1": { displayName, email, color, lastSeen, isOnline },
        "userId2": { displayName, email, color, lastSeen, isOnline }
      }
    }
  }
}
```

---

## Collaborative Locking System

### Why We Need Locks
In a fully collaborative environment, multiple users can edit the same object. Without locks:
- User A starts dragging a rectangle
- User B also starts dragging the same rectangle
- Both users fight for control, creating a janky experience
- Last write wins, but the UX is terrible

### How Locking Works

**1. Acquiring a Lock (on mousedown/selection):**
```typescript
async function acquireLock(objectId: string, userId: string): Promise<LockResponse> {
  const now = Date.now();
  const objectRef = doc(db, 'canvasObjects', objectId);
  const objectSnap = await getDoc(objectRef);
  
  if (!objectSnap.exists()) {
    return { success: false, lockedBy: null, expiresAt: null, message: 'Object not found' };
  }
  
  const obj = objectSnap.data();
  
  // Check if lock exists and is not expired
  if (obj.lockedBy && obj.lockedAt) {
    const lockAge = now - obj.lockedAt;
    const isExpired = lockAge > obj.lockTimeout;
    
    if (!isExpired && obj.lockedBy !== userId) {
      // Someone else has the lock
      return {
        success: false,
        lockedBy: obj.lockedBy,
        expiresAt: obj.lockedAt + obj.lockTimeout,
        message: 'Object is being edited by another user'
      };
    }
  }
  
  // Acquire or renew lock
  await updateDoc(objectRef, {
    lockedBy: userId,
    lockedAt: now,
    lockTimeout: 30000, // 30 second timeout
    updatedBy: userId,
    updatedAt: now
  });
  
  return { success: true, lockedBy: userId, expiresAt: now + 30000 };
}
```

**2. Releasing a Lock (on mouseup/deselect):**
```typescript
async function releaseLock(objectId: string, userId: string): Promise<boolean> {
  const objectRef = doc(db, 'canvasObjects', objectId);
  const objectSnap = await getDoc(objectRef);
  
  if (!objectSnap.exists()) return false;
  
  const obj = objectSnap.data();
  
  // Only release if we own the lock
  if (obj.lockedBy === userId) {
    await updateDoc(objectRef, {
      lockedBy: null,
      lockedAt: null,
      updatedBy: userId,
      updatedAt: Date.now()
    });
    return true;
  }
  
  return false;
}
```

**3. Lock Renewal (every 10 seconds while editing):**
```typescript
async function renewLock(objectId: string, userId: string): Promise<boolean> {
  const objectRef = doc(db, 'canvasObjects', objectId);
  const objectSnap = await getDoc(objectRef);
  
  if (!objectSnap.exists()) return false;
  
  const obj = objectSnap.data();
  
  // Only renew if we own the lock
  if (obj.lockedBy === userId) {
    await updateDoc(objectRef, {
      lockedAt: Date.now(),
      updatedBy: userId,
      updatedAt: Date.now()
    });
    return true;
  }
  
  return false;
}
```

**4. Lock Checking (before attempting operations):**
```typescript
function isLockExpired(lockedAt: number, lockTimeout: number): boolean {
  const now = Date.now();
  const lockAge = now - lockedAt;
  return lockAge > lockTimeout;
}

function canEdit(object: CanvasObject, userId: string): boolean {
  // Not locked = anyone can edit
  if (!object.lockedBy) return true;
  
  // I own the lock = I can edit
  if (object.lockedBy === userId) return true;
  
  // Lock is expired = anyone can edit
  if (object.lockedAt && isLockExpired(object.lockedAt, object.lockTimeout)) {
    return true;
  }
  
  // Someone else has an active lock = cannot edit
  return false;
}
```

### User Flow Examples

**Scenario 1: Normal Editing**
1. User A clicks rectangle → acquires lock
2. User A drags rectangle → updates position (lock still held)
3. User A releases mouse → releases lock
4. User B clicks rectangle → acquires lock (now available)
5. User B drags rectangle → success!

**Scenario 2: Lock Timeout**
1. User A clicks rectangle → acquires lock (30s timeout)
2. User A's browser freezes/crashes
3. 30 seconds pass → lock expires automatically
4. User B clicks rectangle → acquires lock (expired lock ignored)
5. User B drags rectangle → success!

**Scenario 3: Lock Conflict**
1. User A clicks rectangle → acquires lock
2. User B clicks rectangle → lock denied, shows indicator
3. User B sees visual feedback: "Being edited by User A"
4. User A releases lock
5. User B tries again → lock acquired, can edit now

**Scenario 4: Long Edit Session**
1. User A clicks rectangle → acquires lock
2. User A drags for 15 seconds (lock renewal timer running)
3. At 10 seconds: lock auto-renewed (new 30s timeout)
4. User A continues dragging
5. At 25 seconds: lock renewed again
6. User A finishes → releases lock

### Visual Feedback

**Lock Indicators:**
- Object with active lock by another user: Red outline + tooltip "Editing: User Name"
- Object with expired lock: No indicator (treat as unlocked)
- Object you're editing: Blue outline + your cursor
- Object you can't edit: Cursor changes to "not-allowed"

### Implementation Notes

**When to acquire locks:**
- ✅ On object selection (mousedown)
- ✅ On object drag start
- ✅ On resize/rotate start
- ✅ On text edit start
- ❌ NOT on hover (too aggressive)

**When to release locks:**
- ✅ On mouseup/touchend
- ✅ On deselection
- ✅ On text edit blur
- ✅ On component unmount (cleanup)
- ✅ On navigation away

**Lock renewal timing:**
- Lock timeout: 30 seconds (configurable)
- Renewal interval: 10 seconds (1/3 of timeout)
- Client-side interval: `setInterval(renewLock, 10000)`

**Edge cases:**
- User closes tab while editing → lock expires after 30s
- Network disconnect → lock expires, but on reconnect we check/reacquire
- Multiple tabs same user → treated as different sessions (different userId context)

### Performance Considerations

**Pros:**
- Locks prevent most conflicts before they happen
- Only one extra field update per operation
- Expired locks self-clean (no manual cleanup needed)

**Cons:**
- Extra roundtrip to acquire lock (adds ~50-100ms latency)
- Lock renewal increases Firestore reads/writes

**Optimizations:**
- Cache lock state locally for duration of edit
- Batch lock renewals with other updates
- Only lock on actual edit, not just selection
- Skip locks for AI-generated objects (AI has priority)

---

## Key Design Decisions

### 1. Why BaseCanvasObject?
- Common fields shared across all shapes
- Consistent sync logic (updatedAt, updatedBy)
- Consistent styling (fill, stroke)
- Easy to add new shape types

### 2. Why separate Line and Text?
- Line doesn't use fill/fillOpacity/width/height
- Text has many unique properties (font, content)
- Type safety: TypeScript catches misuse

### 3. Why timestamps in milliseconds?
- Firebase uses milliseconds
- Easy to compare and sort
- Works with Date.now()

### 4. Why zIndex instead of order array?
- Easier to increment/decrement
- No need to reindex all objects
- Clear ordering semantics

### 5. Why Record<string, Object> instead of Array?
- O(1) lookup by ID
- Easy to update single objects
- Matches Firestore document structure

### 6. Why separate cursors and presence?
- Cursors update every 50ms (high frequency)
- Presence updates every 30s (low frequency)
- Different data structures optimize for each

---

## Implementation Notes

### Phase 1 (MVP):
- Implement: BaseCanvasObject, RectangleObject, Viewport, CanvasState, CursorPosition, UserPresence
- Defer: Line, Text, History, AI types

### Phase 2:
- Add: CircleObject, LineObject, TextObject, Selection, ObjectUpdate
- Implement: History (optional)

### Phase 3:
- Add: AICommand, AIContext, AI function types
- Implement: AI integration

### Performance Considerations:
- Use Record<string, Object> for O(1) lookups
- Index Firestore on updatedAt, zIndex
- Batch updates for multiple objects
- Delta updates instead of full objects
- Viewport culling for rendering

---

## Validation Rules

### Object Validation:
- ID: non-empty string
- Position: finite numbers
- Dimensions: positive numbers (width, height > 0)
- Rotation: 0-360 degrees
- Colors: valid hex or rgba strings
- Opacity: 0-1 range
- Timestamps: positive numbers

### Firestore Security Rules (collaborative model):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /canvasObjects/{objectId} {
      // Any authenticated user can read all objects
      allow read: if request.auth != null;
      
      // Any authenticated user can create objects
      // Must set createdBy to their own uid
      allow create: if request.auth != null && 
                    request.resource.data.createdBy == request.auth.uid;
      
      // Any authenticated user can update any object (collaborative!)
      // The last-write-wins logic in app code handles conflicts
      // Must set updatedBy to their own uid
      allow update: if request.auth != null && 
                    request.resource.data.updatedBy == request.auth.uid;
      
      // Any authenticated user can delete any object (collaborative!)
      allow delete: if request.auth != null;
    }
  }
}
```

**Key Points:**
- ✅ Any user can modify any object (true collaboration)
- ✅ Still validates that `createdBy` and `updatedBy` are set correctly
- ✅ Locking is handled at the application level, not security rules
- ✅ Last-write-wins conflict resolution in app code

---

## Summary

This type system supports:
- ✅ All shape types (rectangle, circle, line, text)
- ✅ All transformations (position, size, rotation)
- ✅ All styling (fill, stroke, opacity)
- ✅ Layer management (zIndex)
- ✅ Multi-user sync (timestamps, userIds)
- ✅ **Collaborative locking system** (prevents edit conflicts, auto-expires)
- ✅ **Correct security rules** (any authenticated user can edit any object)
- ✅ Cursors and presence
- ✅ Selection and multi-select
- ✅ AI integration (attribution, context)
- ✅ Performance optimization (delta updates, batching)
- ✅ History/undo (optional)

### Critical Features for Collaboration:
1. **Application-Level Locking**: Prevents simultaneous edits without blocking collaboration
2. **Auto-Expiring Locks**: 30-second timeout prevents abandoned locks from blocking users
3. **Lock Renewal**: Long edits keep the lock alive with periodic renewals
4. **Visual Feedback**: Users see when objects are being edited by others
5. **Permissive Security**: Firestore rules allow any authenticated user to modify any object

Ready to implement incrementally across all phases!

