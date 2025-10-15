# PR #18: Multi-Select Functionality

## Goals

1. **Drag-to-Select**: Click and drag a selection window on empty canvas to select all objects with boundaries inside that window
2. **Shift-Click Toggle**: Add or remove individual objects from selection using Shift + Click
3. **Group Operations**: Move and delete multiple selected objects together
4. **Real-Time Performance**: Multiple users moving many objects simultaneously with minimal lag (critical requirement)

---

## Analysis Summary

### ✅ Already Working (No Changes Needed):
- **Selection State**: `selectedIds: string[]` array already supports multiple IDs
- **Konva Transformer**: Already handles multiple nodes simultaneously (Canvas.tsx:125)
- **Lock Management**: `LockManager` already acquires/releases locks for all selected IDs (Canvas.tsx:129-151)
- **Delete Operation**: Already deletes all `selectedIds` (Canvas.tsx:311)
- **Batch Firestore Functions**: `batchUpdateObjects` and `batchDeleteObjects` already exist in `lib/firebase/firestore.ts`

### ❌ Missing Features:
- Drag-to-select rectangle interaction
- Intersection detection for selecting objects inside rectangle
- Visual selection rectangle preview
- Shift-click to toggle selection
- Cmd/Ctrl+A and Escape keyboard shortcuts

### 🔥 CRITICAL Performance Issue:
**Current broadcasting approach broadcasts per-object:**
- 10 selected objects = 200 broadcasts/second per user
- Multiple users × many objects = database overload and lag

**Required fix:**
- Batch all selected object transforms into single broadcast
- Shared 50ms throttle for entire selection
- Use existing `batchUpdateObjects()` on transform end

---

## Task List

### Phase 1: Selection Interactions

#### 1. Add Selection Rectangle State
**File**: `app/canvas/_components/Canvas.tsx`

- [x] Add `selectionRect` state (x, y, width, height, nullable)
- [x] Add `isSelecting` boolean state
- [x] Add `selectionStartRef` ref for tracking drag start point

#### 2. Implement Drag-to-Select - Mouse Down
**File**: `app/canvas/_components/Canvas.tsx` (modify `handleMouseDown`)

- [x] When clicking empty canvas with select tool + no shift: Clear selection and start selection rectangle
- [x] When clicking empty canvas with select tool + shift: Keep selection and start additive selection rectangle
- [x] Set `isSelecting = true` and store start point in canvas coordinates

#### 3. Implement Drag-to-Select - Mouse Move
**File**: `app/canvas/_components/Canvas.tsx` (modify `handleMouseMove`)

- [x] When `isSelecting` is true: Calculate selection rectangle from start to current position
- [x] Normalize rectangle to handle negative drag directions (all 4 quadrants)
- [x] Update `selectionRect` state for live preview

#### 4. Implement Drag-to-Select - Mouse Up
**File**: `app/canvas/_components/Canvas.tsx` (modify `handleMouseUp`)

- [x] When `isSelecting` is true: Find all objects intersecting selection rectangle
- [x] Filter out objects locked by other users
- [x] If shift: add intersecting objects to selection
- [x] If no shift: replace selection with intersecting objects
- [x] Clear selection rectangle and set `isSelecting = false`

#### 5. Create Intersection Detection Helper
**File**: `app/canvas/_lib/intersection.ts` (new file)

- [x] Create `getIntersectingObjects(rect, objects)` function
- [x] Check rectangle intersection for each shape type (rectangle, circle, line, text)
- [x] Account for shape rotation and position
- [x] Return array of selectable object IDs (exclude locked objects)

#### 6. Render Selection Rectangle Preview
**File**: `app/canvas/_components/Canvas.tsx` (in render section)

- [x] Add Konva Rect for selection preview (after shapes, before Transformer)
- [x] Only render when `selectionRect` is not null
- [x] Style: dashed blue border `#3b82f6`, semi-transparent fill
- [x] Scale stroke width with zoom for constant screen size
- [x] Set `listening: false` (non-interactive)

#### 7. Implement Shift-Click Toggle
**File**: `app/canvas/_components/Canvas.tsx` (modify shape `onSelect` callback)

- [x] Modify `onSelect` handler to accept event with shift key state
- [x] If shift pressed and object in selection: remove it
- [x] If shift pressed and object not in selection: add it
- [x] If shift not pressed: replace selection with clicked object (existing behavior)

#### 8. Add Select All Keyboard Shortcut (SKIPPED)
**File**: `app/canvas/_components/Canvas.tsx` (modify `handleKeyDown`)

- [ ] Add Cmd/Ctrl+A handler
- [ ] Get all objects not locked by other users
- [ ] Set `selectedIds` to all unlocked object IDs
- [ ] Prevent default browser behavior

#### 9. Add Deselect All Keyboard Shortcut
**File**: `app/canvas/_components/Canvas.tsx` (modify `handleKeyDown`)

- [x] Add Escape handler
- [x] Clear `selectedIds` to empty array
- [x] Clear `selectionRect` if active selection in progress
- [x] Only when not typing in text inputs

---

### Phase 2: Performance Optimization (CRITICAL)

#### 10. Create Group Transform Type
**File**: `app/canvas/_types/active-transform.ts`

- [ ] Define `GroupActiveTransform` interface
- [ ] Include array of object IDs being transformed together
- [ ] Include transform delta (not full state for each object)

#### 11. Add Group Transform Broadcasting Functions
**File**: `lib/firebase/realtime-transforms.ts`

- [ ] Create `broadcastGroupTransform(objectIds, userId, transformDelta)` function
- [ ] Create `clearGroupTransform(userId)` function
- [ ] Use path `sessions/{sessionId}/groupTransforms/{userId}` in Realtime Database

#### 12. Replace Per-Object Broadcasting with Batch
**File**: `app/canvas/_components/Canvas.tsx`

- [ ] Modify `handleTransformMove`: Detect if multiple objects selected
- [ ] When multi-select: Collect all object updates into single data structure
- [ ] Use shared 50ms throttle for entire selection (not per-object)
- [ ] Call `broadcastGroupTransform()` with all object IDs and deltas
- [ ] Keep per-object broadcast for single selection (no breaking changes)

#### 13. Use Batch Firestore Write on Transform End
**File**: `app/canvas/_components/Canvas.tsx`

- [ ] Modify `handleTransform` callback (or shape `onTransform`)
- [ ] When multi-select: Collect all updated objects
- [ ] Call `batchUpdateObjects()` instead of multiple `updateObjectInFirestore()` calls
- [ ] Keep single update for single selection (no breaking changes)

#### 14. Subscribe to Group Transforms
**File**: `app/canvas/_hooks/useActiveTransforms.ts`

- [ ] Add subscription to group transforms path
- [ ] Expand group transform to individual object overlays
- [ ] Merge with existing individual transforms
- [ ] Filter out current user's group transforms

#### 15. Render Group Transform Overlays
**File**: `app/canvas/_components/Canvas.tsx`

- [ ] Update ActiveTransformOverlay rendering loop
- [ ] Handle group transforms: show overlay for each object in the group
- [ ] Display single user label for the group (not per-object)

---

### Phase 3: Testing & Validation

#### 16. Test Selection Interactions
- [ ] Drag-to-select creates blue rectangle and selects objects inside bounds
- [ ] Shift-drag adds to existing selection
- [ ] Shift-click toggles individual objects
- [ ] Cmd/Ctrl+A selects all unlocked objects
- [ ] Escape clears selection
- [ ] Selection respects locks (cannot select objects locked by others)
- [ ] Selection works with zoom/pan active
- [ ] Selection rectangle handles all drag directions (4 quadrants)

#### 17. Test Group Operations
- [ ] Move multiple selected objects together (relative positions maintained)
- [ ] Resize multiple selected objects together
- [ ] Rotate multiple selected objects together
- [ ] Delete key removes all selected objects
- [ ] Layer shortcuts (Cmd+[/]) work with first selected object

#### 18. Test Real-Time Performance (CRITICAL)
- [ ] Select 10 objects and move them: Verify max ~20 broadcasts/sec (not 200)
- [ ] Two users moving 10+ objects each: Smooth with no lag
- [ ] Verify single broadcast per 50ms cycle for multi-select
- [ ] Verify `batchUpdateObjects` called once on transform end
- [ ] Check Firestore and Realtime Database quotas not exceeded
- [ ] Remote users see smooth overlays for entire group being moved

#### 19. Test Edge Cases
- [ ] Selection during disconnect/reconnect
- [ ] Partial lock failures: Objects that can't be locked removed from selection
- [ ] Lock expiration during group move: Expired objects auto-deselected
- [ ] Multi-select with mixed shape types (rectangles, circles, lines, text)
- [ ] Empty selection rectangle (click without drag) doesn't error
- [ ] Keyboard shortcuts ignored when typing in properties panel

---

## Files Modified

**Core Changes:**
- `app/canvas/_components/Canvas.tsx` - Selection rectangle, mouse handlers, batch broadcasting
- `app/canvas/_types/active-transform.ts` - Group transform type
- `lib/firebase/realtime-transforms.ts` - Group transform broadcasting
- `app/canvas/_hooks/useActiveTransforms.ts` - Group transform subscriptions

**No Changes Needed:**
- Lock management (already handles multiple objects)
- Delete operation (already handles multiple objects)
- Batch Firestore (already implemented)
- Transformer (already handles multiple nodes)

**No New Files:**
- All selection logic in Canvas.tsx
- Group transform types in existing active-transform.ts
- Group broadcast functions in existing realtime-transforms.ts

---

## Implementation Notes

### Selection Rectangle
- Convert mouse coordinates to canvas space using `stage.getAbsoluteTransform().invert()`
- Normalize rectangle to handle negative width/height (drag in any direction)
- Intersection detection: Use Konva's `getClientRect()` for accurate bounding boxes

### Shift-Click Behavior
- Shift + click empty canvas: Start additive selection (don't clear existing)
- Shift + click object: Toggle object in/out of selection
- No shift: Replace selection (existing behavior)

### Lock Strategy
- Attempt to acquire locks for all selected objects
- If some locks fail (locked by others), remove those objects from selection
- Lock expiration callback already handles auto-deselection

### Performance Strategy
**Single selection (no breaking changes):**
- Per-object broadcasting (current behavior)
- Individual Firestore writes (current behavior)

**Multi-select (optimized):**
- Single group transform broadcast per 50ms cycle
- Single batch Firestore write on transform end
- Reduces broadcasts from 200/sec to 20/sec for 10 objects

### Coordinate Spaces
- Mouse events: Screen coordinates
- Selection rectangle: Canvas coordinates (after transform)
- Object positions: Canvas coordinates
- Always use `stage.getAbsoluteTransform().invert().point(pointer)` for conversion

---

## Success Criteria

**Functionality:**
- ✅ Drag-to-select works in all directions
- ✅ Shift-click toggles selection
- ✅ Cmd/Ctrl+A selects all
- ✅ Escape deselects all
- ✅ Group move/delete works
- ✅ Locked objects cannot be selected

**Performance (CRITICAL):**
- ✅ Multi-select broadcasting: ~20 broadcasts/sec (not 200)
- ✅ Multiple users moving groups: Smooth, minimal lag
- ✅ Batch Firestore write on transform end
- ✅ Remote overlays show entire group being moved

**Edge Cases:**
- ✅ Selection rectangle handles negative drag
- ✅ Selection works with zoom/pan
- ✅ Partial lock failures handled gracefully
- ✅ Keyboard shortcuts don't interfere with text inputs
