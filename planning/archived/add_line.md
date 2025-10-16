# PR #16: Add Line Shape Support

## Analysis Summary

After examining the current shape infrastructure, here's what I found:

### Current Shape Architecture:
1. **Type Definitions** (`app/canvas/_types/shapes.ts`): Defines local shape representations (PersistedRect, PersistedCircle)
2. **Shape Factories** (`app/canvas/_lib/shapes.ts`): Factory pattern for each shape with methods for creation, conversion, validation, and draft preview
3. **Firestore Types** (`types/canvas.ts`): Defines Firestore object types (RectangleObject, CircleObject, LineObject already exists!)
4. **Tool Constants** (`app/canvas/_constants/tools.ts`): Lists drawing tools and provides utility functions
5. **Toolbar UI** (`app/canvas/_components/Toolbar.tsx`): Visual toolbar with tool buttons
6. **Shape Components** (`app/canvas/_components/shapes/`): React-Konva components for rendering each shape
7. **Shape Router** (`app/canvas/_components/shapes/index.tsx`): Routes shape types to their components
8. **Properties Components** (`app/canvas/_components/properties/shape-properties/`): Shape-specific property editors
9. **Canvas Drawing Logic** (`app/canvas/_components/Canvas.tsx`): Handles mouse events for drawing
10. **Default Properties** (`app/canvas/_store/canvas-store.ts`): Stores default properties for each shape tool

### Key Differences for Lines:
- Lines are drawn from point-to-point (x1,y1 to x2,y2), not bounded by width/height
- Lines don't have a fill property (only stroke)
- Lines need special handling in normalization (no negative width/height concept)
- LineObject already exists in types/canvas.ts but uses x,y,x2,y2 format
- Lines need different draft preview rendering (Line component vs Rect/Ellipse)

---

## Task List

### 1. Add Line Type Definition ✅
**File:** `app/canvas/_types/shapes.ts`

- [x] Add `PersistedLine` interface after `PersistedCircle`
  - [x] Include: `id`, `type: "line"`, `x`, `y`, `x2`, `y2`
  - [x] Include: `stroke`, `strokeWidth` (skipped rotation as planned)
  - [x] Include: `opacity`, `zIndex`
  - [x] Include: `lockedBy`, `lockedAt`, `lockTimeout`
  - [x] Note: No `fill` property for lines
  - [x] Note: No `width`/`height` properties - lines use x1,y1,x2,y2
- [x] Add `PersistedLine` to `PersistedShape` union type
- [x] Consider: Lines may not need rotation (rotation would require transform math on x2,y2)

---

### 2. Create Line Factory ✅
**File:** `app/canvas/_lib/shapes.ts`

- [x] Import `LineObject` from `@/types/canvas`
- [x] Create `lineFactory: ShapeFactory<PersistedLine>`
  - [x] **createDefault**: Create line from DrawingBounds
    - Convert bounding box (x, y, width, height) to line points (x, y, x2, y2)
    - x2 = x + width
    - y2 = y + height
    - Set default stroke color (e.g., purple "#a855f7")
    - Set default strokeWidth (e.g., 2)
    - Set opacity to 1
    - Set zIndex to 0
    - Skipped rotation (lines don't need it)
    - Accept overrides for custom default properties
  - [x] **createFromDraft**: Call createDefault (same as other shapes)
  - [x] **toFirestore**: Convert `PersistedLine` to Firestore `LineObject`
    - Map x, y, x2, y2 to Firestore format
    - Note: LineObject in types/canvas.ts omits width, height, fill, fillOpacity
    - Include stroke, strokeWidth, strokeOpacity
    - Include createdBy, updatedBy, timestamps
    - Include lock fields
  - [x] **fromFirestore**: Convert Firestore `LineObject` to `PersistedLine`
    - Extract x, y, x2, y2
    - Extract stroke, strokeWidth, opacity
    - Extract lock fields
    - Handle backward compatibility (default values for missing fields)
  - [x] **validateSize**: Ensure line has minimum length
    - Calculate length: sqrt((x2-x)² + (y2-y)²)
    - Require minimum length of 10 pixels
  - [x] **normalizeDrawing**: Convert start/current points to DrawingBounds
    - Same as rectangle normalization (handle negative drag directions)
    - Return { x, y, width, height } where width/height represent the drag distance
  - [x] **getDraftData**: Return preview data for drawing
    - Return type: "line" (Konva Line component)
    - Calculate points: [x, y, x+width, y+height]
    - Include stroke color (from styleOverrides or default)
    - Include strokeWidth (from styleOverrides or default)
    - Include opacity
- [x] Add `line: lineFactory` to `shapeFactories` registry

---

### 3. Update Tool Constants ✅
**File:** `app/canvas/_constants/tools.ts`

- [x] Add `"line"` to `DRAWING_TOOLS` array
- [x] Update `ShapeToolType` to include `"line"`: `"rectangle" | "circle" | "line"`
- [x] Update `isShapeTool` function to check for `"line"`

---

### 4. Add Line to Toolbar ✅
**File:** `app/canvas/_components/Toolbar.tsx`

- [x] Import `Minus` icon from lucide-react
- [x] Add line tool button to `TOOLS` array:
  ```typescript
  { id: "line", label: "Line", icon: Minus, shortcut: "L" }
  ```
- [x] Position after circle, before any separator

---

### 5. Add Line Keyboard Shortcut ✅
**File:** `app/canvas/_components/Canvas.tsx`

- [x] In keyboard handler (around line 220), add line tool shortcut:
  ```typescript
  else if (e.key === "l" || e.key === "L") {
    setActiveTool("line");
    e.preventDefault();
  }
  ```
- Note: This introduces lint errors that will be fixed in Task 11 (need to add line to defaultShapeProperties)

---

### 6. Create LineShape Component ✅
**File:** `app/canvas/_components/shapes/LineShape.tsx` (NEW)

- [x] Import `Line` from `react-konva`
- [x] Import `Konva` and `KonvaEventObject`
- [x] Define `PersistedLine` type (import from `_types/shapes.ts`)
- [x] Create `LineShapeProps` interface:
  - `shape: PersistedLine`
  - `isSelected: boolean`
  - `isLocked: boolean`
  - `isSelectable: boolean`
  - `zoom: number`
  - `onSelect: () => void`
  - `onTransform: (updates: Partial<PersistedLine>) => void`
  - `shapeRef: (node: Konva.Line | null) => void`
  - `onRenewLock: () => void`
- [x] Create `LineShape` component
  - [x] Render `<Line>` with points: `[shape.x, shape.y, shape.x2, shape.y2]`
  - [x] Apply stroke color (red if locked, else shape.stroke)
  - [x] Apply strokeWidth scaled by zoom
  - [x] Apply opacity
  - [x] Handle click to select (if selectable)
  - [x] Handle drag end to update x, y, x2, y2
    - On drag, all points move together (translate)
    - Calculate delta from node position
    - Update all coordinates by delta
    - Reset node position to (0, 0)
  - [x] Handle transform end (for scaling)
    - Apply scale to points
    - Reset scale to 1
  - [x] Set draggable and listening based on isSelectable
  - [x] Added hitStrokeWidth for better click detection on thin lines
- [x] Export as default

---

### 7. Update Shape Router ✅
**File:** `app/canvas/_components/shapes/index.tsx`

- [x] Import `LineShape` from `./LineShape`
- [x] Import `PersistedLine` from `../../_types/shapes`
- [x] Add case for `"line"` in switch statement:
  ```typescript
  case "line":
    return (
      <LineShape
        shape={object as PersistedLine}
        isSelected={isSelected}
        isLocked={isLocked}
        isSelectable={isSelectable}
        zoom={zoom}
        onSelect={onSelect}
        onTransform={onTransform}
        shapeRef={shapeRef as (node: Konva.Line | null) => void}
        onRenewLock={onRenewLock}
      />
    );
  ```

---

### 8. Update Canvas Drawing Logic ✅
**File:** `app/canvas/_components/Canvas.tsx`

- [x] Import `Line` from `react-konva`
- [x] Add draft preview case for line type
  - The factory pattern handles this automatically
  - Added `else if (draftData.type === "line")` case
  - Uses commonProps for strokeWidth and listening
- [x] Line shapes render automatically via ShapeComponent router
- Note: Still has 2 lint errors that will be fixed in Task 11 (defaultShapeProperties.line)

---

### 9. Create LineProperties Component ✅
**File:** `app/canvas/_components/properties/shape-properties/LineProperties.tsx` (NEW)

- [x] Create `LinePropertiesProps` interface:
  - `shape: PersistedLine`
  - `onUpdate: (updates: Partial<PersistedLine>) => void`
  - `disabled?: boolean`
- [x] Create `LineProperties` component
  - [x] Display line length (calculated, read-only)
    - `sqrt((x2-x)² + (y2-y)²)`
    - Shows as "Length: XXpx"
  - [x] Display line angle (calculated, read-only)
    - `atan2(y2-y, x2-x) * 180/PI`
    - Shows as "Angle: XX°"
  - [x] Keep it minimal for MVP - just show length and angle as info
  - [x] Added helpful hint text about dragging endpoints
- [x] Export as default

---

### 10. Register Line Properties Component ✅
**File:** `app/canvas/_components/properties/shape-properties/index.ts`

- [x] Import `LineProperties` from `./LineProperties`
- [x] Add to `shapePropertyComponents` registry:
  ```typescript
  line: LineProperties,
  ```

---

### 11. Update Default Properties Store ✅
**File:** `app/canvas/_store/canvas-store.ts`

- [x] Add `line` to `DefaultShapeProperties` interface
- [x] Add `line` to `DEFAULT_SHAPE_PROPERTIES`:
  ```typescript
  line: {
    stroke: "#a855f7",    // Purple
    strokeWidth: 2,
    opacity: 1,
  }
  ```
- [x] Type system automatically handles line type (generic works)
- [x] Fixed all Canvas.tsx lint errors!

---

### 12. Update PropertiesPanel Type ✅
**File:** `app/canvas/_components/PropertiesPanel.tsx`

- [x] Update `defaultShapeProperties` type to include `line`:
  ```typescript
  line: {
    stroke: string;
    strokeWidth: number;
    opacity: number;
  };
  ```
- [x] Update `onUpdateDefaults` type signature to accept `"rectangle" | "circle" | "line"`
- [x] Update mock shape creation for line in default properties view:
  ```typescript
  : {
      type: "line",
      x: 0,
      y: 0,
      x2: 100,
      y2: 100,
      stroke: defaultShapeProperties.line.stroke,
      strokeWidth: defaultShapeProperties.line.strokeWidth,
      opacity: defaultShapeProperties.line.opacity,
    }
  ```

---

### 13. Update StyleProperties for Lines ✅
**File:** `app/canvas/_components/properties/StyleProperties.tsx`

- [x] Add conditional logic to hide fill-related inputs for lines
- [x] Check if object is a line: `const isLine = object.type === "line"`
- [x] Wrap fill section in `{!isLine && ( ... )}`
- [x] Add type guards for fill property access (lines don't have fill)
- [x] Keep stroke, strokeWidth, and opacity visible for all shapes including lines
- [x] All type errors resolved!

---

### 14. Testing Checklist

- [ ] **Tool Selection**
  - [ ] Click line tool in toolbar activates line mode
  - [ ] Keyboard shortcut "L" activates line tool
  - [ ] Line tool shows highlighted in toolbar when active
  
- [ ] **Drawing**
  - [ ] Can drag to create a line from point A to point B
  - [ ] Line preview shows correctly while dragging
  - [ ] Can drag in any direction (up, down, left, right, diagonal)
  - [ ] Line appears after releasing mouse
  - [ ] Very short lines (< 10px) are rejected
  
- [ ] **Selection & Manipulation**
  - [ ] Can click to select a line (in select tool mode)
  - [ ] Selected line shows transformer handles
  - [ ] Can drag to move line (both endpoints move together)
  - [ ] Transformer resize may need special handling (test behavior)
  - [ ] Line properties panel shows when line is selected
  
- [ ] **Properties Panel**
  - [ ] Shows line-specific properties (length, angle)
  - [ ] Shows stroke color and can change it
  - [ ] Shows stroke width and can change it
  - [ ] Shows opacity and can change it
  - [ ] Does NOT show fill controls
  - [ ] Changes sync to canvas immediately
  
- [ ] **Default Properties**
  - [ ] With line tool active and nothing selected, shows default line properties
  - [ ] Can change default stroke color
  - [ ] Can change default stroke width
  - [ ] Can change default opacity
  - [ ] New lines use updated defaults
  
- [ ] **Locking**
  - [ ] Line locked by another user shows red stroke
  - [ ] Locked lines cannot be selected
  - [ ] Locked lines show lock indicator in properties
  
- [ ] **Real-time Sync**
  - [ ] Lines created by one user appear for other users
  - [ ] Line moves/updates sync in real-time
  - [ ] Line deletions sync correctly
  
- [ ] **Layer Management**
  - [ ] Lines respect z-index ordering
  - [ ] Can bring line to front/send to back
  - [ ] Layer controls work in properties panel
  
- [ ] **Persistence**
  - [ ] Lines persist to Firestore correctly
  - [ ] Page refresh loads lines correctly
  - [ ] Lines maintain all properties after reload

---

## Implementation Notes

### Line Rotation Considerations
Lines are inherently rotational (defined by two points). Adding a separate `rotation` property complicates things:
- **Option A:** Skip rotation property, let line angle be defined by endpoints (RECOMMENDED for MVP)
- **Option B:** Add rotation and apply transform matrix to calculate rotated x2,y2
- For MVP: **Skip rotation**, set to 0 always. Lines rotate naturally by dragging endpoints.

### Line Transformer Behavior
Konva Transformer on lines can be tricky:
- **Default behavior:** Creates bounding box around line (not ideal)
- **Better behavior:** Show anchors only at line endpoints
- **MVP approach:** 
  - Allow drag to move entire line
  - Test default transformer behavior
  - If problematic, consider custom transformer config or disable transformer for lines
  - Future: Add endpoint drag handles for line editing

### Line Endpoint Editing
For future enhancement:
- Add custom anchors at x,y and x2,y2
- Allow dragging individual endpoints
- This would be a separate PR after basic line support works

### Arrow Heads
Not included in this PR, but could be future enhancement:
- Add `arrowStart` and `arrowEnd` boolean properties
- Use Konva's built-in arrow support
- Add to line properties panel

---

## Files to Create
1. `app/canvas/_components/shapes/LineShape.tsx`
2. `app/canvas/_components/properties/shape-properties/LineProperties.tsx`

## Files to Modify
1. `app/canvas/_types/shapes.ts` - Add PersistedLine type
2. `app/canvas/_lib/shapes.ts` - Add lineFactory
3. `app/canvas/_constants/tools.ts` - Add line to drawing tools
4. `app/canvas/_components/Toolbar.tsx` - Add line button
5. `app/canvas/_components/shapes/index.tsx` - Add line case
6. `app/canvas/_components/properties/shape-properties/index.ts` - Register LineProperties
7. `app/canvas/_components/Canvas.tsx` - Add line keyboard shortcut and draft preview
8. `app/canvas/_store/canvas-store.ts` - Add line default properties
9. `app/canvas/_components/PropertiesPanel.tsx` - Update types for line
10. `app/canvas/_components/properties/StyleProperties.tsx` - Hide fill for lines

## Estimated Complexity
**Medium** - Lines are simpler than rectangles/circles (no fill, no corner radius) but have unique coordinate system (x1,y1,x2,y2 vs x,y,w,h). The main challenges are:
1. Coordinate conversion between bounding box and point-to-point
2. Transformer behavior may need customization
3. Draft preview uses Line component instead of Rect/Ellipse

## Success Criteria
- ✅ Can create lines by dragging on canvas
- ✅ Lines persist to Firestore and reload correctly
- ✅ Lines sync in real-time between users
- ✅ Can select, move, and delete lines
- ✅ Properties panel works for lines (stroke, width, opacity)
- ✅ Default properties work for lines
- ✅ Locking system works for lines
- ✅ Layer management works for lines

---

## Implementation Complete! 🎉

**All 13 implementation tasks finished + Interaction improvements!**

### Summary of Changes:
1. ✅ **Type Definitions** - Added `PersistedLine` interface
2. ✅ **Line Factory** - Complete factory with all methods
3. ✅ **Tool Constants** - Added line to drawing tools
4. ✅ **Toolbar** - Added line button with "L" shortcut
5. ✅ **Keyboard Shortcut** - Press "L" to activate line tool
6. ✅ **LineShape Component** - Full Konva rendering with drag/transform
7. ✅ **Shape Router** - Integrated line into routing
8. ✅ **Canvas Drawing Logic** - Draft preview support with **click-to-place interaction**
9. ✅ **LineProperties Component** - Shows length and angle
10. ✅ **Property Registration** - Registered line properties
11. ✅ **Default Properties Store** - Added line defaults (purple #a855f7)
12. ✅ **PropertiesPanel** - Updated types and mock shape (with defensive checks)
13. ✅ **StyleProperties** - Hidden fill section for lines

### Special Line Tool Interaction ⭐
Unlike rectangles/circles (click-and-drag), the line tool uses **click-to-place**:
1. **First click** - Anchors the start point
2. **Move cursor** - Line preview follows cursor from anchor point
3. **Second click** - Places the end point and creates the line
4. **Press Escape** or **switch tools** - Cancels line drawing

### Bug Fixes:
- Fixed runtime error when `defaultShapeProperties.line` was undefined (localStorage migration issue)
- Added defensive checks with fallback values
- Exported `DefaultShapeProperties` type from store for type safety

### No Lint Errors! ✨
All TypeScript errors resolved. Code is clean and ready for testing.

### Next Steps:
Task 14 provides a comprehensive testing checklist to verify all functionality works correctly.

