# Canvas.tsx Refactoring Plan

## 🎯 Progress Summary

**Status**: ALL PHASES COMPLETE ✅

**Final Results**:

- ✅ Canvas.tsx reduced from **1,248 lines to 531 lines** (57% reduction, 717 lines removed)
- ✅ All custom hooks extracted and integrated (7 hooks)
- ✅ All helper libraries extracted and integrated (4 libraries)
- ✅ All types extracted
- ✅ All UI Components extracted (4 components)
- ✅ Build succeeds with no errors

**Files Created** (17 total):

- `_types/interactions.ts`
- `_lib/cursor-helpers.ts`
- `_lib/drawing-helpers.ts`
- `_lib/selection-helpers.ts`
- `_lib/zoom-helpers.ts`
- `_hooks/useDrawing.ts`
- `_hooks/useSelection.ts`
- `_hooks/useZoom.ts`
- `_hooks/useKeyboardShortcuts.ts`
- `_hooks/useTransformBroadcast.ts`
- `_hooks/useLockManager.ts`
- `_hooks/useDebouncedPropertyUpdate.ts`
- `_hooks/useMouseHandlers.ts`
- `_components/ZoomControls.tsx`
- `_components/GridToggle.tsx`
- `_components/DraftShapeRenderer.tsx`
- `_components/SelectionRectRenderer.tsx`

## Overview

Canvas.tsx has grown to **1,248 lines** and contains too many responsibilities. This document outlines potential abstractions and cleanup strategies to improve maintainability.

## Current Issues

- **Multiple concerns mixed together**: Drawing, selection, panning, zooming, keyboard shortcuts, lock management, transform broadcasting
- **Large event handlers**: Mouse handlers are 50-100+ lines each
- **Complex state management**: 20+ useState/useRef hooks in one component
- **Hard to test**: Logic tightly coupled to component
- **Difficult to understand**: Too much cognitive load to grasp the entire file

## Successful Patterns Already in Use ✅

The codebase already has good examples of extracted logic:

- `_lib/bounds.ts` - `isPointInBounds`, `clampPointToBounds`
- `_lib/viewport-constraints.ts` - `constrainViewport`
- `_lib/coordinates.ts` - `screenToCanvasCoordinates`
- `_lib/intersection.ts` - `getIntersectingObjects`
- `_lib/layer-management.ts` - `getMaxZIndex`, `getMinZIndex`
- `_hooks/useObjects.ts` - Object persistence with Firestore
- `_hooks/useCursors.ts` - Cursor tracking
- `_hooks/useActiveTransforms.ts` - Transform tracking
- `_hooks/usePresence.ts` - Presence tracking
- `_lib/locks.ts` - Lock utilities (but lock management still in Canvas.tsx)

**Goal**: Apply these same patterns to the rest of Canvas.tsx.

---

## Proposed Extractions

### 1. Custom Hooks (app/canvas/\_hooks/)

#### ✅ `useDrawing.ts` (Priority: HIGH) - COMPLETED

**Purpose**: Extract all drawing state and logic for shapes (rectangle, circle, line)

**Lines to extract**: 77-80, 614-621, 691-718, 752-787

**State**:

```typescript
const [isDrawing, setIsDrawing] = useState(false);
const [draftRect, setDraftRect] = useState<DraftRect | null>(null);
const drawStartRef = useRef({ x: 0, y: 0 });
```

**Interface**:

```typescript
export function useDrawing({
  stageRef,
  activeTool,
  viewport,
  canvasWidth,
  canvasHeight,
  saveObject,
  defaultShapeProperties,
  canvasId,
}: UseDrawingParams) {
  return {
    isDrawing,
    draftRect,
    startDrawing(point: { x: number; y: number }): void,
    updateDrawing(point: { x: number; y: number }): void,
    finishDrawing(): void,
  };
}
```

**Benefits**:

- Isolates drawing logic from mouse event handlers
- Makes drawing testable independently
- Reduces Canvas.tsx by ~80 lines

---

#### ✅ `useSelection.ts` (Priority: HIGH) - COMPLETED

**Purpose**: Extract selection rectangle (drag-to-select) logic

**Lines to extract**: 82-90, 583-590, 668-689, 723-749

**State**:

```typescript
const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
const [isSelecting, setIsSelecting] = useState(false);
const selectionStartRef = useRef({ x: 0, y: 0 });
```

**Interface**:

```typescript
export function useSelection({
  objects,
  selectedIds,
  setSelectedIds,
  currentUserId,
  viewport,
}: UseSelectionParams) {
  return {
    selectionRect,
    isSelecting,
    startSelection(point: { x: number; y: number }, shiftPressed: boolean): void,
    updateSelection(point: { x: number; y: number }): void,
    finishSelection(shiftPressed: boolean): void,
    cancelSelection(): void,
  };
}
```

**Benefits**:

- Separates multi-select UI logic
- Easier to add marquee selection features later
- Reduces Canvas.tsx by ~60 lines

---

#### ✅ `useZoom.ts` (Priority: MEDIUM) - COMPLETED

**Purpose**: Extract all zoom controls and wheel zoom logic

**Lines to extract**: 517-560, 830-923

**Interface**:

```typescript
export function useZoom({
  stageRef,
  viewport,
  updateViewport,
  containerSize,
  canvasWidth,
  canvasHeight,
}: UseZoomParams) {
  return {
    handleWheel(e: KonvaEventObject<WheelEvent>): void,
    zoomIn(): void,
    zoomOut(): void,
    resetZoom(): void,
  };
}
```

**Benefits**:

- Consolidates all zoom logic in one place
- Makes it easy to add zoom presets (50%, 100%, 200%)
- Reduces Canvas.tsx by ~100 lines

---

#### ✅ `useKeyboardShortcuts.ts` (Priority: HIGH) - COMPLETED

**Purpose**: Extract all keyboard event handling

**Lines to extract**: 356-466

**Interface**:

```typescript
export function useKeyboardShortcuts({
  activeTool,
  setActiveTool,
  spacePressed,
  setSpacePressed,
  shiftPressed,
  setShiftPressed,
  selectedIds,
  setSelectedIds,
  objects,
  updateZIndex,
  deleteObjects,
  isSelecting,
  cancelSelection,
  updateDefaultShapeProperty,
}: UseKeyboardShortcutsParams) {
  // Returns nothing - sets up keyboard listeners internally
}
```

**Benefits**:

- Huge file - 110 lines of keyboard logic
- Easy to see all shortcuts in one place
- Could generate keyboard shortcut documentation from this hook
- Reduces Canvas.tsx by ~110 lines

---

#### ✅ `useTransformBroadcast.ts` (Priority: MEDIUM) - COMPLETED

**Purpose**: Extract real-time transform broadcasting logic with throttling

**Lines to extract**: 242-353

**State**:

```typescript
const broadcastThrottleTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
const groupTransformThrottleTimer = useRef<NodeJS.Timeout | null>(null);
const pendingGroupTransforms = useRef<Record<string, ObjectTransformData>>({});
```

**Interface**:

```typescript
export function useTransformBroadcast({
  canvasId,
  user,
  objects,
  selectedIds,
}: UseTransformBroadcastParams) {
  return {
    broadcastTransformMove(objectId: string, updates: Partial<PersistedShape>): void,
    clearTransformBroadcast(objectId: string): void,
  };
}
```

**Benefits**:

- Complex throttling logic isolated
- Easier to tune performance characteristics
- Reduces Canvas.tsx by ~110 lines

---

#### ✅ `useDebouncedPropertyUpdate.ts` (Priority: LOW) - COMPLETED

**Purpose**: Extract debounced property updates for properties panel

**Lines to extract**: 204-240

**Interface**:

```typescript
export function useDebouncedPropertyUpdate({
  objects,
  setObjects,
  updateObjectInFirestore,
  lockManager,
  debounceMs = 300,
}: UseDebouncedPropertyUpdateParams) {
  return {
    updateProperty(objectId: string, updates: Partial<PersistedShape>): void,
  };
}
```

**Benefits**:

- Reusable pattern for debounced updates
- Could be used elsewhere in the app
- Reduces Canvas.tsx by ~35 lines

---

#### ✅ `useLockManager.ts` (Priority: MEDIUM) - COMPLETED

**Purpose**: Extract lock manager initialization and selection-based lock acquisition

**Lines to extract**: 101-106, 163-185, 478-492

**Interface**:

```typescript
export function useLockManager({
  canvasId,
  userId,
  selectedIds,
  onLockExpired,
}: UseLockManagerParams) {
  return {
    lockManager: LockManager,
    tryAcquireLock(objectId: string): void,
    releaseLock(objectId: string): void,
    renewLock(objectId: string): void,
  };
}
```

**Benefits**:

- Encapsulates lock lifecycle management
- Auto-acquires/releases locks based on selection
- Reduces Canvas.tsx by ~40 lines

---

### 2. Helper Libraries (app/canvas/\_lib/)

#### ✅ `zoom-helpers.ts` (Priority: MEDIUM) - COMPLETED

**Purpose**: Pure functions for zoom calculations

**Extract from `useZoom` hook**:

```typescript
export function calculateZoomToPoint(
  currentZoom: number,
  delta: number,
  pointer: { x: number; y: number },
  currentPos: { x: number; y: number }
): { zoom: number; x: number; y: number };

export function calculateZoomToCenter(
  currentZoom: number,
  zoomFactor: number,
  centerPoint: { x: number; y: number },
  currentPos: { x: number; y: number }
): { zoom: number; x: number; y: number };

export function clampZoom(zoom: number, min = 0.1, max = 5): number;
```

**Benefits**:

- Testable zoom math separate from React
- Can be reused if we add zoom slider or zoom presets

---

#### ✅ `cursor-helpers.ts` (Priority: LOW) - COMPLETED

**Purpose**: Cursor style utilities

**Lines to extract**: 927-933

```typescript
export function getCursorStyle(
  activeTool: ToolType,
  isPanning: boolean,
  spacePressed: boolean
): string;
```

**Benefits**:

- Simple utility function
- Reduces Canvas.tsx by ~7 lines
- Could add cursor logic for different states

---

#### ✅ `drawing-helpers.ts` (Priority: LOW) - COMPLETED

**Purpose**: Drawing validation and draft shape utilities

```typescript
export function validateDrawingStart(
  point: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number
): boolean;

export function createDraftRect(
  start: { x: number; y: number },
  current: { x: number; y: number }
): DraftRect;
```

**Benefits**:

- Pure functions for drawing logic
- Testable without Konva/React

---

#### ✅ `selection-helpers.ts` (Priority: LOW) - COMPLETED

**Purpose**: Selection calculation utilities

```typescript
export function normalizeSelectionRect(
  start: { x: number; y: number },
  end: { x: number; y: number }
): { x: number; y: number; width: number; height: number };

export function mergeSelection(
  existingIds: string[],
  newIds: string[],
  shiftPressed: boolean
): string[];
```

**Benefits**:

- Pure functions for selection math
- Easier to add selection modes (intersect, contain, etc.)

---

### 3. Component Extractions (app/canvas/\_components/)

#### `ZoomControls.tsx` (Priority: MEDIUM)

**Purpose**: Extract zoom UI (bottom-right corner)

**Lines to extract**: 1195-1236

**Benefits**:

- Reusable UI component
- Reduces Canvas.tsx JSX complexity
- Could add more zoom features (slider, presets)

---

#### `GridToggle.tsx` (Priority: LOW)

**Purpose**: Extract grid toggle button (top-left corner)

**Lines to extract**: 1159-1179

**Benefits**:

- Simple UI extraction
- Reduces Canvas.tsx by ~20 lines

---

#### `CanvasLoadingState.tsx` (Priority: LOW)

**Purpose**: Extract loading state UI

**Lines to extract**: 1238-1244

**Benefits**:

- Could add more sophisticated loading states
- Consistent loading UI across app

---

#### `DraftShapeRenderer.tsx` (Priority: MEDIUM)

**Purpose**: Extract draft shape rendering logic

**Lines to extract**: 1077-1107

**Benefits**:

- Complex rendering logic isolated
- Easier to add draft shape features (snap to grid, etc.)
- Reduces Canvas.tsx by ~30 lines

---

#### `SelectionRectRenderer.tsx` (Priority: LOW)

**Purpose**: Extract selection rectangle rendering

**Lines to extract**: 1110-1122

**Benefits**:

- Isolated UI component
- Could add more selection styles

---

### 4. Event Handler Refactoring

#### ✅ `useMouseHandlers.ts` (Priority: HIGH) - COMPLETED

**Purpose**: Extract complex mouse event logic

**Lines to extract**: 563-661, 664-719, 722-790

**Option A**: Create a `useMouseHandlers` hook:

```typescript
export function useMouseHandlers({
  stageRef,
  activeTool,
  spacePressed,
  viewport,
  selectedIds,
  setSelectedIds,
  objects,
  canvas,
  user,
  drawing,
  selection,
  saveObject,
  defaultShapeProperties,
  canvasId,
}: UseMouseHandlersParams) {
  return {
    handleMouseDown(e: KonvaEventObject<MouseEvent>): void,
    handleMouseMove(e: KonvaEventObject<MouseEvent>): void,
    handleMouseUp(e: KonvaEventObject<MouseEvent>): void,
  };
}
```

**Option B**: Create helper functions in `_lib/mouse-handlers.ts` and keep hooks in Canvas.tsx but delegate to helpers

**Benefits**:

- Massive cleanup - ~230 lines of mouse logic
- Easier to understand interaction flow
- Better separation of concerns

---

### 5. Type Extractions (app/canvas/\_types/)

#### ✅ `interactions.ts` (Priority: LOW) - COMPLETED

**Purpose**: Extract interaction-related types

```typescript
export interface DraftRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CursorMode = "default" | "grab" | "grabbing" | "crosshair";
```

**Benefits**:

- Types are separate from implementation
- Can be reused across components

---

## Refactoring Strategy

### Phase 1: Extract Custom Hooks (High Priority)

1. ✅ Extract `useKeyboardShortcuts.ts` - Biggest win, 110 lines
2. ✅ Extract `useDrawing.ts` - Core drawing logic, 80 lines
3. ✅ Extract `useSelection.ts` - Multi-select logic, 60 lines
4. ✅ Extract `useMouseHandlers.ts` - Delegates to drawing/selection hooks, 230 lines

**Estimated reduction**: ~480 lines

### Phase 2: Extract Helper Libraries (Medium Priority)

1. ✅ Create `zoom-helpers.ts` and extract `useZoom.ts` hook - 100 lines
2. ✅ Extract `useTransformBroadcast.ts` - Complex throttling, 110 lines
3. ✅ Extract `useLockManager.ts` - Lock lifecycle, 40 lines
4. ✅ Create `cursor-helpers.ts`, `drawing-helpers.ts`, `selection-helpers.ts`

**Estimated reduction**: ~270 lines

### Phase 3: Extract UI Components (Lower Priority)

1. ✅ Extract `ZoomControls.tsx` - 40 lines
2. ✅ Extract `DraftShapeRenderer.tsx` - 30 lines
3. ✅ Extract `GridToggle.tsx`, `SelectionRectRenderer.tsx` - 30 lines

**Estimated reduction**: ~100 lines

### Phase 4: Final Cleanup

1. ✅ Extract remaining utility functions
2. ✅ Extract types to `_types/interactions.ts`
3. ✅ Add JSDoc comments to extracted code
4. ✅ Update imports in Canvas.tsx

**Total estimated reduction**: ~850 lines
**Target Canvas.tsx size**: ~400 lines (mainly orchestration and composition)

---

## Testing Considerations

After refactoring, we'll be able to unit test:

- ✅ **Zoom calculations** (pure functions)
- ✅ **Selection rectangle math** (pure functions)
- ✅ **Drawing logic** (hooks with mock stage)
- ✅ **Keyboard shortcuts** (hooks with mock events)
- ✅ **Transform broadcasting** (hooks with mock Firebase)

Currently, all this logic is untestable without rendering the entire Canvas component.

---

## Migration Path

For each extraction:

1. **Create new file** with extracted logic
2. **Add tests** for new file (if pure functions/hooks)
3. **Update Canvas.tsx** to use new abstraction
4. **Verify functionality** in browser (test all interactions)
5. **Commit** with clear message (e.g., "Extract drawing logic to useDrawing hook")

**Don't refactor everything at once** - do one extraction at a time, test thoroughly, and commit.

---

## Benefits Summary

After refactoring:

1. **Maintainability**: Each file has a single, clear responsibility
2. **Testability**: Pure functions and hooks can be unit tested
3. **Reusability**: Extracted code can be reused in other components
4. **Readability**: Canvas.tsx becomes a high-level orchestrator (~400 lines)
5. **Onboarding**: New developers can understand one piece at a time
6. **Performance**: Easier to optimize individual pieces (memoization, etc.)
7. **Type Safety**: Better TypeScript inference with smaller, focused types

---

## Open Questions

1. **Should we extract pan logic?** (handleDragBound, handleDragEnd)
   - Currently ~30 lines, may not be worth extracting yet

2. **Should we create a `useShapeManagement` hook?**
   - For z-index updates, deletion, etc.
   - May be overkill for simple operations

3. **Should we extract the shape rendering map?**
   - Lines 965-1074 are complex but tightly coupled to Canvas component
   - May be hard to extract without making it more complex

4. **Should we use XState or similar for interaction state management?**
   - Could model drawing/selecting/panning as a state machine
   - May be overkill, but worth considering for complex interactions

---

## Next Steps

1. **Review this plan** with team/yourself
2. **Prioritize extractions** based on pain points
3. **Start with Phase 1** (high-priority hooks)
4. **Test thoroughly** after each extraction
5. **Document extracted code** with JSDoc comments
6. **Update CLAUDE.md** with new file structure after refactoring
