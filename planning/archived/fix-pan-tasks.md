# Fix Canvas Panning Constraints

## Context

Users can currently pan infinitely in any direction, causing two problems:

1. **Zoomed out**: When the entire canvas fits in viewport, panning creates empty space and users lose track of the canvas
2. **At boundaries**: When zoomed in and at a canvas edge, users can pan further to see only empty space

This doesn't match professional tools like Figma, which constrain panning to keep the canvas visible and centered when it fits in the viewport.

## Solution

Implement viewport constraints that:

- **Center and lock** the canvas when it fits entirely in the viewport (zoomed out)
- **Clamp panning** when canvas is larger than viewport so canvas edges can't go past viewport edges
- Apply constraints independently per axis (X and Y)

## Implementation Tasks

### Task 1: Create Viewport Constraint Function

- [x] Create `app/canvas/_lib/viewport-constraints.ts` with `constrainViewport()` function
- [x] For each axis, check if canvas fits in container
  - If fits: center it and lock position
  - If larger: clamp to valid range (0 to container - canvasScreen)
- [x] Function takes: x, y, zoom, canvasWidth, canvasHeight, containerWidth, containerHeight
- [x] Returns: constrained { x, y }

### Task 2: Apply Constraints After Zoom

- [x] In Canvas.tsx `handleWheel`, after updating viewport, apply constraints
- [x] Pass canvas dimensions and container size to constraint function
- [x] Update viewport with constrained values

### Task 3: Apply Constraints After Pan

- [x] In Canvas.tsx `handleDragEnd`, apply constraints to new position
- [x] Clamp the stage position before updating viewport store
- [x] Ensures panning never goes out of bounds

### Task 4: Apply Constraints on Zoom Button Clicks

- [x] Update `handleZoomIn`, `handleZoomOut`, and `handleResetZoom` functions
- [x] After calculating new zoom and position, apply constraints
- [x] Ensures zoom controls respect boundaries

### Task 5: Handle Initial Load

- [x] When canvas loads, apply constraints to initial viewport
- [x] Ensures if viewport was persisted in invalid state, it gets fixed
- [x] Apply in the container initialization useEffect

## Testing

- [ ] Zoom out until entire canvas visible - verify it centers and stays centered
- [ ] Try to pan when fully zoomed out - verify canvas doesn't move or moves minimally
- [ ] Zoom in and pan to top-left corner - verify can't pan further left/up
- [ ] Zoom in and pan to bottom-right corner - verify can't pan further right/down
- [ ] Test with different canvas dimensions (small, large, portrait, landscape)
- [ ] Test zoom buttons respect constraints
- [ ] Test wheel zoom respects constraints
- [ ] Refresh page while zoomed - verify constraints applied on load

## Files to Change

- `app/canvas/_lib/viewport-constraints.ts` - NEW: Constraint logic
- `app/canvas/_components/Canvas.tsx` - Apply constraints in zoom/pan handlers

## Success Criteria

- Users cannot pan to see empty space outside canvas bounds
- Canvas auto-centers when it fits in viewport
- Panning feels natural and controlled like Figma
- No breaking of existing zoom/pan functionality
