## Fix plan: Canvas rectangle drawing, selection, and performance

This plan combines the stale-closure diagnosis with additional issues found in event typing, selection handling, and effect dependencies. Implement the following edits without changing behavior elsewhere. Do not paste code; apply the described changes in the specified files.

### ✅ 1) Canvas event handlers should read latest tool state [COMPLETED]

- File: `app/canvas/_components/Canvas.tsx`
- Changes:
  - ✅ Introduce a `useRef` to hold the current `activeTool`.
  - ✅ Add a small `useEffect` that syncs the ref whenever `activeTool` changes.
  - ✅ Update all Fabric event handlers (at least `mouse:down`, `mouse:move`, `mouse:up`) to read `activeTool` from the ref rather than a closed-over value.
  - ✅ Do not add `activeTool` to the main initialization effect dependency array.

### ✅ 2) Do not re-initialize Fabric canvas on viewport changes [COMPLETED]

- File: `app/canvas/_components/Canvas.tsx`
- Changes:
  - ✅ Reduce the dependency array of the main initialization effect to only `[width, height]` (or whatever strictly reflects canvas DOM size changes).
  - ✅ Keep the existing logic that imperatively updates zoom/transform inside event handlers and helper functions.
  - ✅ Ensure cleanup still disposes the canvas only when unmounting or dimensions change.

### ✅ 3) Support PointerEvent in input handling [COMPLETED]

- File: `app/canvas/_components/Canvas.tsx`
- Changes:
  - ✅ Remove strict `instanceof MouseEvent` checks in `mouse:down`/`mouse:move` branches.
  - ✅ Gate logic using the presence of `button`/`ctrlKey`/`shiftKey` as needed, or use feature-agnostic checks that work for both `MouseEvent` and `PointerEvent`.
  - ✅ Keep panning behavior (Space+Drag or Middle Button) working under pointer events.

### ✅ 4) Keep shapes non-movable while not in select tool [COMPLETED]

- File: `app/canvas/_components/Canvas.tsx`
- Changes:
  - ✅ **Lines 176-181**: In the `mouse:up` handler, check `activeToolRef.current` before setting rectangle to selectable. Only set `selectable: true` and `evented: true` if `activeToolRef.current === "select"`. Otherwise keep them `false`.
  - ✅ **Line 181**: Remove or guard `canvas.setActiveObject(drawingObjectRef.current)` - don't set the newly drawn rectangle as active object while in rectangle tool mode.
  - ✅ **Line 190**: Do not set `canvas.selection = true` unconditionally. Instead, check the current tool: `canvas.selection = activeToolRef.current === "select"`.
  - ✅ **Line 158**: Same issue in panning finish - change `canvas.selection = true` to `canvas.selection = activeToolRef.current === "select"`.
  - ✅ The tool-change effect (lines 229-242) already handles making objects selectable when switching to "select" tool, so newly created objects will become selectable when the user switches tools.

### 5) Ensure selection flags apply to newly added objects

- File: `app/canvas/_components/Canvas.tsx`
- Changes:
  - After adding a new object, immediately apply selectability according to the current tool state (from the ref).
  - Optionally, centralize a small helper to apply selectability to one object according to `activeTool`.
  - **Note**: This is already partially addressed by fix #4, but consider whether newly created objects should ever be immediately selectable, or if they should always respect the current tool mode.

### 6) Avoid hiding the toolbar during canvas reinit [FIXED BY #2]

- File: `app/canvas/_components/Canvas.tsx`
- Changes:
  - ✅ Since reinit now only occurs on size changes (fixed in #2), `isReady` should remain stable during normal pan/zoom/tool changes. No additional changes needed.

### 6b) Initialize canvas with correct selection state

- File: `app/canvas/_components/Canvas.tsx`
- Changes:
  - **Line 45**: Canvas is initialized with `selection: true`, but this should respect the initial tool state. Change to `selection: activeTool === "select"` or just initialize to `false` since the tool-change effect will set it correctly.

### 7) Minor: correctness and future-proofing in `objects.ts`

- File: `app/canvas/_lib/objects.ts`
- Changes:
  - Leave behavior unchanged for now, but note for a future improvement that `fabricRectToCanvasObject` should consider scaled/transform-adjusted width/height if using transforms.
  - No immediate change required to fix current drawing/selection issues.

### 8) Quick verification checklist (after implementing above)

- Create multiple rectangles while `"rectangle"` tool is active — shapes should be added and not draggable.
- Switch to `"select"` — existing shapes become draggable, selection marquee works.
- Pan (Space+Drag or middle button) and Zoom (wheel) without reinitializing the canvas; previously drawn shapes persist.
- Test on browsers that emit `PointerEvent` to confirm drawing and panning still work.
