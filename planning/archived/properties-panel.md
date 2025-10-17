# Properties Panel & Layer Management

This document outlines the implementation plan for adding a properties panel to modify selected shapes and implementing z-index based layer management.

---

## PR #1: Type Definitions & Dependencies ✅

**Goal:** Add type definitions for new properties and install required dependencies

**Tasks:**

- [x] Install `react-colorful` package for color pickers
- [x] Extend `PersistedRect` type with new properties:
  - [x] `opacity` (number, 0-1) - single opacity for entire shape
  - [x] `zIndex` (number) - layer order
  - [x] `cornerRadius` (number, optional) - rounded corners
- [x] Extend `PersistedCircle` type with new properties:
  - [x] `opacity` (number, 0-1)
  - [x] `zIndex` (number)
- [x] Update `PersistedShape` union type to reflect changes

**Files Created/Modified:**

- `package.json` (add react-colorful)
- `app/canvas/_types/shapes.ts` (extend types)

---

## PR #2: Shape Factory Updates ✅

**Goal:** Update shape factories to handle new properties

**Tasks:**

- [x] Update `rectangleFactory.createDefault()`:
  - [x] Add `opacity: 1` default
  - [x] Add `zIndex: 0` default
  - [x] Add `cornerRadius: 0` default
- [x] Update `rectangleFactory.toFirestore()`:
  - [x] Include `opacity` field
  - [x] Include `zIndex` field
  - [x] Include `cornerRadius` field (map to existing cornerRadius in BaseCanvasObject)
- [x] Update `rectangleFactory.fromFirestore()`:
  - [x] Read `opacity` field (default to 1 if missing for backward compatibility)
  - [x] Read `zIndex` field (default to 0 if missing)
  - [x] Read `cornerRadius` field
- [x] Update `circleFactory.createDefault()`:
  - [x] Add `opacity: 1` default
  - [x] Add `zIndex: 0` default
- [x] Update `circleFactory.toFirestore()`:
  - [x] Include `opacity` field
  - [x] Include `zIndex` field
- [x] Update `circleFactory.fromFirestore()`:
  - [x] Read `opacity` field (default to 1 if missing)
  - [x] Read `zIndex` field (default to 0 if missing)

**Files Modified:**

- `app/canvas/_lib/shapes.ts`

---

## PR #3: Z-Index Rendering & Canvas Updates ✅

**Goal:** Implement z-index based rendering order and related utilities

**Tasks:**

- [x] Add z-index sorting to Canvas.tsx:
  - [x] Sort `objects` array by `zIndex` before `.map()` rendering
  - [x] Handle objects without zIndex (default to 0)
- [x] Add keyboard shortcuts for layer management:
  - [x] Cmd/Ctrl + ] = Bring Forward (zIndex++)
  - [x] Cmd/Ctrl + [ = Send Backward (zIndex--)
  - [x] Cmd/Ctrl + Shift + ] = Bring to Front (zIndex = max + 1)
  - [x] Cmd/Ctrl + Shift + [ = Send to Back (zIndex = min - 1)
- [x] Create helper functions in Canvas.tsx:
  - [x] `getMaxZIndex()` - finds highest zIndex among objects
  - [x] `getMinZIndex()` - finds lowest zIndex among objects
  - [x] `updateZIndex(objectId, newZIndex)` - updates object zIndex

**Files Modified:**

- `app/canvas/_components/Canvas.tsx`

---

## PR #4: Update Shape Rendering Components ✅

**Goal:** Update shape components to render new properties

**Tasks:**

- [x] Update `RectangleShape.tsx`:
  - [x] Add `opacity` prop to Rect component
  - [x] Add `cornerRadius` prop to Rect component
  - [x] Ensure shape data includes opacity and cornerRadius
- [x] Update `CircleShape.tsx`:
  - [x] Add `opacity` prop to Ellipse component
  - [x] Ensure shape data includes opacity

**Files Modified:**

- `app/canvas/_components/shapes/RectangleShape.tsx`
- `app/canvas/_components/shapes/CircleShape.tsx`

**Notes:**

- Konva's `opacity` prop accepts 0-1 range
- Konva's Rect `cornerRadius` prop accepts pixel value

---

## PR #5: Universal Properties Component ✅

**Goal:** Create the universal properties section (position, size, rotation, layers)

**Tasks:**

- [x] Create `UniversalProperties.tsx` component with sections:
  - [x] **Position section:** X and Y number inputs with labels
  - [x] **Size section:** Width and Height number inputs
  - [x] **Rotation section:** Degrees input (0-360) with degree symbol
  - [x] **Layer section:** Four icon buttons in a row:
    - [x] To Front button (⬆️⬆️ or equivalent icon)
    - [x] Forward button (⬆️)
    - [x] Backward button (⬇️)
    - [x] To Back button (⬇️⬇️)
- [x] Add prop interface:
  - [x] `object: PersistedShape` - currently selected shape
  - [x] `allObjects: PersistedShape[]` - all shapes (for z-index calculations)
  - [x] `onUpdate: (updates: Partial<PersistedShape>) => void`
- [x] Implement real-time updates (onChange handlers)
- [x] Add input validation (e.g., width/height > 0)
- [x] Disable inputs if shape is locked by another user

**Files Created:**

- `app/canvas/_components/properties/UniversalProperties.tsx`

---

## PR #6: Style Properties Component ✅

**Goal:** Create the style properties section (fill, stroke, opacity)

**Tasks:**

- [x] Create `StyleProperties.tsx` component with sections:
  - [x] **Fill section:**
    - [x] Color picker using `react-colorful` (HexColorPicker)
    - [x] "No Fill" checkbox to set transparent fill
  - [x] **Stroke section:**
    - [x] Color picker using `react-colorful`
    - [x] Stroke width number input (min 0)
  - [x] **Opacity section:**
    - [x] Slider (0-100%) using HTML input range or custom slider
    - [x] Display percentage value next to slider
- [x] Add prop interface:
  - [x] `object: PersistedShape`
  - [x] `onUpdate: (updates: Partial<PersistedShape>) => void`
- [x] Implement color picker popover (show/hide on click)
- [x] Handle transparent fill (store as "transparent" or rgba(0,0,0,0))
- [x] Convert opacity between 0-1 (stored) and 0-100% (displayed)

**Files Created:**

- `app/canvas/_components/properties/StyleProperties.tsx`

---

## PR #7: Shape-Specific Properties ✅

**Goal:** Create shape-specific property components with registry pattern

**Tasks:**

- [x] Create `RectangleProperties.tsx`:
  - [x] Corner radius number input (min 0, max reasonable limit like width/2)
  - [x] Label and unit display
  - [x] Props: `shape: PersistedRect`, `onUpdate`
- [x] Create `CircleProperties.tsx`:
  - [x] Display radiusX and radiusY values
  - [x] "Lock aspect ratio" toggle checkbox
  - [x] When locked, changing one radius updates both
  - [x] Props: `shape: PersistedCircle`, `onUpdate`
- [x] Create registry system in `shape-properties/index.ts`:
  - [x] Export `shapePropertyComponents` object mapping type to component
  - [x] Export `getPropertyComponent(type: string)` helper function
  - [x] Handle unknown shape types gracefully (return null)

**Files Created:**

- `app/canvas/_components/properties/shape-properties/RectangleProperties.tsx`
- `app/canvas/_components/properties/shape-properties/CircleProperties.tsx`
- `app/canvas/_components/properties/shape-properties/index.ts`

---

## PR #8: Properties Panel Container ✅

**Goal:** Create main PropertiesPanel component that orchestrates all sections

**Tasks:**

- [x] Create `PropertiesPanel.tsx` component:
  - [x] Accept props:
    - [x] `selectedIds: string[]`
    - [x] `objects: PersistedShape[]`
    - [x] `onUpdate: (objectId: string, updates: Partial<PersistedShape>) => void`
  - [x] Calculate selected objects from selectedIds
  - [x] Handle three states:
    - [x] No selection: Show "Select a shape to edit properties" message
    - [x] Single selection: Show all property sections
    - [x] Multi-selection: Show only universal properties with "Multiple selected" notice
  - [x] Conditionally render shape-specific properties using registry
- [x] Style the panel:
  - [x] Fixed position on right side of canvas
  - [x] Width: ~280px
  - [x] Margin from edge: 16px
  - [x] White background, border, rounded corners, shadow
  - [x] Scrollable content area for overflow
- [x] Add section dividers/separators between property groups
- [x] Handle locked shapes: Show "Locked by [User]" banner and disable inputs

**Files Created:**

- `app/canvas/_components/PropertiesPanel.tsx`

---

## PR #9: Canvas Integration & Debouncing ✅

**Goal:** Integrate PropertiesPanel into Canvas and add debounced updates

**Tasks:**

- [x] Add PropertiesPanel to Canvas.tsx:
  - [x] Import and render PropertiesPanel component
  - [x] Pass `selectedIds`, `objects`, and `onUpdate` props
- [x] Implement `handlePropertyUpdate` function:
  - [x] Accept objectId and updates (partial shape data)
  - [x] Apply updates to local state optimistically
  - [x] Debounce Firestore writes (300ms) using custom debounce logic
  - [x] Call `updateObjectInFirestore()` with full updated object
  - [x] Renew lock via `lockManagerRef.current.renewLockForObject()`
- [x] Update type system to support PersistedShape (not just PersistedRect):
  - [x] Changed objects state from `PersistedRect[]` to `PersistedShape[]`
  - [x] Updated useObjects hook to support PersistedShape
  - [x] Updated all function signatures to accept PersistedShape
- [x] Test with multiple rapid property changes to verify debouncing

**Files Modified:**

- `app/canvas/_components/Canvas.tsx`
- `app/canvas/_hooks/useObjects.ts`

**Note:** Panel positioning works correctly without canvas layout adjustments since it's absolutely positioned

---

## PR #10: Testing & Bug Fixes

**Goal:** Comprehensive testing and polish

**Tasks:**

- [ ] Test single shape selection:
  - [ ] Verify all universal properties update correctly
  - [ ] Verify style properties update correctly
  - [ ] Verify shape-specific properties update correctly
  - [ ] Test rectangles: corner radius rendering
  - [ ] Test circles: aspect ratio lock behavior
- [ ] Test multi-selection:
  - [ ] Verify only universal properties shown
  - [ ] Verify updates apply to all selected shapes
- [ ] Test z-index/layer operations:
  - [ ] Verify visual rendering order matches zIndex
  - [ ] Test all 4 layer buttons
  - [ ] Test keyboard shortcuts for layers
- [ ] Test edge cases:
  - [ ] Locked shapes (inputs disabled)
  - [ ] No selection (message shown)
  - [ ] Invalid inputs (validation works)
  - [ ] Rapid property changes (debouncing works)
  - [ ] Opacity at 0% (shape invisible but selectable)
  - [ ] Transparent fill rendering
- [ ] Test real-time sync:
  - [ ] Property changes sync to other users
  - [ ] Other users see updated rendering
- [ ] Fix any bugs discovered
- [ ] Document known issues or limitations

**Files Modified:**

- Any files needing bug fixes

---

## Summary

**Total PRs:** 10  
**New Features:**

- Properties panel with universal, style, and shape-specific sections
- Z-index based layer management with keyboard shortcuts
- Single opacity control for entire shapes
- Transparent fill support
- Corner radius for rectangles
- Aspect ratio lock for circles
- Extensible registry pattern for future shapes

**Key Decisions:**

- Single `opacity` property (not separate fill/stroke opacity)
- Z-index explicit rendering order (not creation order)
- Transparent fill via checkbox (not just color value)
- Debounced Firestore writes to reduce network traffic
- Properties panel only shows when shapes selected (Figma-style)

## UI/UX Details

### PropertiesPanel Layout

```
┌─────────────────────┐
│  Properties         │
├─────────────────────┤
│  Position           │
│  X: [100]  Y: [200] │
│                     │
│  Size               │
│  W: [150]  H: [100] │
│                     │
│  Rotation           │
│  [45]°              │
│                     │
│  Layer              │
│  [⬆️⬆️] [⬆️] [⬇️] [⬇️⬇️] │
├─────────────────────┤
│  Fill               │
│  [Color Picker]     │
│  ☐ No Fill          │
│                     │
│  Stroke             │
│  [Color Picker]     │
│  Width: [2]         │
│                     │
│  Opacity            │
│  [──────●─] 80%     │
├─────────────────────┤
│  Rectangle          │
│  Corner: [0]        │
└─────────────────────┘
```

### Behavior

- Panel fixed to right side, ~280px width
- Margin from edge: 16px
- Input changes update in real-time
- Debounce Firestore writes (300ms) to avoid excessive writes
- Show validation errors inline (e.g., "Width must be > 0")
- Multi-select: Show "Multiple selected" with only universal properties

## Edge Cases

- Multi-select: Only show universal properties, disable shape-specific
- Locked shapes: Disable all inputs, show "Locked by [User]"
- No selection: Show "Select a shape to edit properties"
- Mixed shape types selected: Only universal properties
