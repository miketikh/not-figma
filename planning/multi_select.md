# PR #18: Multi-Select Functionality

## Analysis Summary

After examining the current codebase:

### Current Selection Architecture:
1. **Canvas Component** (`app/canvas/_components/Canvas.tsx`): Handles selection state with `selectedIds` array, but only supports single selection
2. **Konva Transformer**: Already supports multi-node transformation (line 118: `transformer.nodes(selectedNodes)`)
3. **Shape Selection**: Click-to-select implemented, but no shift-click or drag-to-select
4. **Selection State**: Array-based selection (`selectedIds: string[]`) - already designed for multiple IDs
5. **Lock Management**: Handles multiple locked objects via `lockManagerRef`
6. **Group Movement**: Transform system can handle multiple nodes, just needs selection logic

### What's Missing:
- Drag-to-select rectangle (selection box)
- Shift-click to add/remove from selection
- Visual selection rectangle preview while dragging
- Cmd/Ctrl+A to select all
- Escape to deselect all
- Proper multi-select interaction with locks

### Key Insights:
- The infrastructure for multi-select mostly exists (array-based state, Transformer supports multiple nodes)
- Main work is adding the interaction logic for creating multi-selections
- Selection rectangle needs to be drawn and used for intersection detection
- Need to prevent selection of locked objects in drag-to-select

---

## Task List

### 1. Add Selection State Management ✅
**File:** `app/canvas/_components/Canvas.tsx`

- [ ] Add selection rectangle state
  - [ ] `selectionRect: { x: number; y: number; width: number; height: number } | null`
  - [ ] `isSelecting: boolean` flag
  - [ ] `selectionStartRef` to track selection start point
- [ ] The `selectedIds` array already exists and supports multiple IDs

---

### 2. Implement Drag-to-Select Interaction ✅
**File:** `app/canvas/_components/Canvas.tsx`

- [ ] **Mouse down handler** (`handleMouseDown`):
  - [ ] When clicking empty canvas with select tool (no shift key):
    - [ ] Clear selection (`setSelectedIds([])`)
    - [ ] Start selection rectangle drag
    - [ ] Set `isSelecting = true`
    - [ ] Store start point in canvas coordinates
  - [ ] When clicking empty canvas with select tool + shift:
    - [ ] Don't clear selection
    - [ ] Start selection rectangle drag to add to selection
  - [ ] When clicking a shape:
    - [ ] If shift pressed: toggle shape in selection
    - [ ] If not shift: replace selection with clicked shape

- [ ] **Mouse move handler** (`handleMouseMove`):
  - [ ] If `isSelecting` is true:
    - [ ] Calculate current selection rectangle from start to current position
    - [ ] Normalize rectangle (handle negative width/height)
    - [ ] Update `selectionRect` state for preview rendering

- [ ] **Mouse up handler** (`handleMouseUp`):
  - [ ] If `isSelecting` is true:
    - [ ] Find all objects intersecting selection rectangle
    - [ ] Filter out objects locked by other users
    - [ ] If shift pressed: add to existing selection
    - [ ] If not shift: replace selection with intersecting objects
    - [ ] Clear selection rectangle (`selectionRect = null`)
    - [ ] Set `isSelecting = false`

---

### 3. Add Intersection Detection Logic ✅
**File:** `app/canvas/_components/Canvas.tsx`

- [ ] Create helper function `getIntersectingObjects`:
  - [ ] Takes selection rectangle and objects array
  - [ ] For each object:
    - [ ] For rectangles: check bounding box intersection
    - [ ] For circles: check if circle center + radius intersects rectangle
    - [ ] For lines: check if line segment intersects or is contained by rectangle
    - [ ] For text: check bounding box intersection
  - [ ] Return array of intersecting object IDs
  - [ ] Exclude objects locked by other users

- [ ] Helper function `rectanglesIntersect`:
  - [ ] Check if two rectangles overlap
  - [ ] Handle edge cases (touching vs overlapping)

- [ ] Helper function `circleIntersectsRect`:
  - [ ] Check if circle intersects or is contained by rectangle
  - [ ] Use distance calculation from rectangle edges

- [ ] Helper function `lineIntersectsRect`:
  - [ ] Check if line segment crosses rectangle or is inside
  - [ ] Line-rectangle intersection algorithm

---

### 4. Add Selection Rectangle Rendering ✅
**File:** `app/canvas/_components/Canvas.tsx`

- [ ] In Konva Stage render section:
  - [ ] After shapes and before Transformer
  - [ ] If `selectionRect` is not null:
    - [ ] Render Konva Rect with selection rectangle bounds
    - [ ] Style: dashed border (blue), transparent fill
    - [ ] Properties:
      - [ ] `x`, `y`, `width`, `height` from `selectionRect`
      - [ ] `stroke: "#3b82f6"` (blue)
      - [ ] `strokeWidth: 1 / viewport.zoom` (constant screen size)
      - [ ] `dash: [4, 4]` (dashed line)
      - [ ] `fill: "rgba(59, 130, 246, 0.1)"` (semi-transparent)
      - [ ] `listening: false` (non-interactive)

---

### 5. Implement Shift-Click Selection Toggle ✅
**File:** `app/canvas/_components/Canvas.tsx`

- [ ] Update shape `onSelect` handler:
  - [ ] Check if shift key is pressed (`e.evt.shiftKey`)
  - [ ] If shift pressed:
    - [ ] If shape is in selection: remove it (`selectedIds.filter(id => id !== shapeId)`)
    - [ ] If shape is not in selection: add it (`[...selectedIds, shapeId]`)
  - [ ] If shift not pressed:
    - [ ] Replace selection with single shape (`[shapeId]`)

- [ ] Pass shift key state to shape components via click handler

---

### 6. Add Keyboard Shortcuts ✅
**File:** `app/canvas/_components/Canvas.tsx`

- [ ] Extend `handleKeyDown` function:
  - [ ] **Cmd/Ctrl+A**: Select all unlocked objects
    - [ ] Get all objects not locked by other users
    - [ ] Set `selectedIds` to all unlocked object IDs
    - [ ] Prevent default browser behavior
  
  - [ ] **Escape**: Deselect all
    - [ ] Set `selectedIds` to empty array `[]`
    - [ ] Clear selection rectangle if active

---

### 7. Update Lock Management for Multi-Select ✅
**File:** `app/canvas/_components/Canvas.tsx`

- [ ] Existing lock management already handles multiple selections (lines 122-144)
- [ ] Verify lock acquisition works for multiple objects:
  - [ ] When selecting multiple objects, locks are acquired for all
  - [ ] When deselecting, locks are released
  - [ ] When lock expires, object is removed from selection
- [ ] No changes needed (already implemented correctly)

---

### 8. Group Movement (Already Working) ✅
**File:** `app/canvas/_components/Canvas.tsx`

- [ ] Konva Transformer already handles multiple nodes (line 118)
- [ ] When multiple shapes are selected:
  - [ ] Transformer automatically groups them
  - [ ] Moving one moves all (relative positions maintained)
  - [ ] `onTransform` callback fires for each shape with updates
- [ ] Verify relative positions are maintained during group move
- [ ] No implementation needed (Konva handles this)

---

### 9. Testing & Edge Cases ✅

- [ ] Test drag-to-select creates rectangle and selects objects
- [ ] Test shift-click adds/removes individual objects from selection
- [ ] Test Cmd/Ctrl+A selects all unlocked objects
- [ ] Test Escape deselects all
- [ ] Test group movement maintains relative positions
- [ ] Test selection of mixed shape types (rectangles, circles, lines)
- [ ] Test selection respects locks (can't select locked objects)
- [ ] Test multi-select with pan/zoom active
- [ ] Test selection rectangle with negative drag (bottom-right to top-left)
- [ ] Test keyboard shortcuts don't interfere with text inputs
- [ ] Test delete key deletes all selected objects
- [ ] Test layer management shortcuts work with first selected object

---

## Files Changed

### Modified:
- `app/canvas/_components/Canvas.tsx`
  - Add selection rectangle state
  - Add drag-to-select logic in mouse handlers
  - Add intersection detection helpers
  - Add selection rectangle rendering
  - Add shift-click toggle logic
  - Add Cmd/Ctrl+A and Escape keyboard shortcuts

### No New Files Needed:
- All logic goes into existing Canvas.tsx component
- Multi-select state is local component state
- No new types needed (using existing PersistedShape[])
- No new hooks needed (inline logic)

---

## Implementation Notes

### Selection Rectangle Coordinate Space:
- Must convert mouse coordinates to canvas space (account for zoom/pan)
- Use stage transform: `stage.getAbsoluteTransform().copy().invert().point(pointer)`
- Selection rectangle is in canvas coordinates, not screen coordinates

### Intersection Detection:
- For drag-to-select: check if any part of shape intersects rectangle
- For shift-click: exact click on shape
- Must account for rotation (Konva shapes have `rotation` property)
- Use Konva's built-in methods where possible

### Performance:
- Intersection detection runs on every mouse move during selection
- Should be fast enough for hundreds of objects
- Consider throttling if needed (debounce to 16ms for 60fps)

### Keyboard Shortcuts Priority:
- Tool shortcuts (V, R, C, L) should work without modifiers
- Cmd/Ctrl combinations for select all
- Escape for deselect
- Ignore all shortcuts when typing in inputs

### Multi-Select with Locks:
- Only selectable objects can be added to selection
- If an object becomes locked during selection, it's removed
- Lock expiration callback already handles this (line 72)

---

## Success Criteria

- [ ] Can drag-to-select multiple objects with mouse
- [ ] Selection rectangle shows preview while dragging
- [ ] Can shift-click to add/remove objects from selection
- [ ] Cmd/Ctrl+A selects all unlocked objects
- [ ] Escape deselects all
- [ ] Can move multiple selected objects together
- [ ] Relative positions maintained during group movement
- [ ] Locked objects cannot be selected
- [ ] Delete key removes all selected objects
- [ ] Selection works correctly with zoom/pan
- [ ] Selection rectangle handles negative drag directions

