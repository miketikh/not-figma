# PR: Add Text Object Support

## Analysis Summary

After examining the current shape infrastructure and the line implementation, here's what I found for implementing text objects:

### Current Shape Architecture:

1. **Type Definitions** (`app/canvas/_types/shapes.ts`): Defines local shape representations (PersistedRect, PersistedCircle, PersistedLine)
2. **Shape Factories** (`app/canvas/_lib/shapes.ts`): Factory pattern for each shape with methods for creation, conversion, validation, and draft preview
3. **Firestore Types** (`types/canvas.ts`): Defines Firestore object types (TextObject already exists!)
4. **Tool Constants** (`app/canvas/_constants/tools.ts`): Lists drawing tools and provides utility functions
5. **Toolbar UI** (`app/canvas/_components/Toolbar.tsx`): Visual toolbar with tool buttons
6. **Shape Components** (`app/canvas/_components/shapes/`): React-Konva components for rendering each shape
7. **Shape Router** (`app/canvas/_components/shapes/index.tsx`): Routes shape types to their components
8. **Properties Components** (`app/canvas/_components/properties/shape-properties/`): Shape-specific property editors
9. **Canvas Interaction Logic** (`app/canvas/_components/Canvas.tsx`): Handles mouse events and tool behavior
10. **Default Properties** (`app/canvas/_store/canvas-store.ts`): Stores default properties for each shape tool

### Key Differences for Text:

- Text is **click-to-place**, not click-and-drag like rectangles/circles
- Text has unique properties: `content` and `fontSize` (MVP - more typography options postponed)
- Text uses `fill` for text color (stroke/outline postponed for MVP)
- Text can be edited via properties panel (inline editing postponed for MVP)
- Text needs a **bounding box** (width/height) but should support auto-width based on content
- TextObject already exists in types/canvas.ts with all necessary fields
- Text positioning uses top-left corner (x, y) like rectangles
- Text can be rotated like rectangles
- **Initial Interaction**: Click once to place text with default "Text" content

### Text Interaction Flow (MVP):

1. **Activate text tool** (click toolbar or press "T")
2. **Click on canvas** - Places text with default "Text" content
3. **Text automatically selected** - Properties panel appears
4. **Edit via properties panel** - Use textarea to change content and fontSize
5. **Click away** - Deselects text
6. **Select existing text** - Edit content and fontSize via properties panel

**Future Enhancement:** Inline editing (double-click to edit content directly on canvas)

---

## Task List

### 1. Add Text Type Definition ✅

**File:** `app/canvas/_types/shapes.ts`

- [x] Add `PersistedText` interface after `PersistedLine`
  - [x] Include: `id`, `type: "text"`
  - [x] Include: `x`, `y`, `width`, `height`
  - [x] Include: `content: string` (the actual text)
  - [x] Include: `fontSize: number` **(MVP - only text-specific property for now)**
  - [x] Include: `fill: string` (text color)
  - [x] Include: `rotation: number`
  - [x] Include: `opacity: number`, `zIndex: number`
  - [x] Include: `lockedBy`, `lockedAt`, `lockTimeout`
  - [x] **POSTPONED (comment out or set defaults):**
    - `fontFamily: string` - Default to "Arial" or system font
    - `fontWeight: "normal" | "bold"` - Default to "normal"
    - `fontStyle: "normal" | "italic"` - Default to "normal"
    - `textAlign: "left" | "center" | "right"` - Default to "left"
    - `textDecoration: "none" | "underline" | "line-through"` - Default to "none"
    - `lineHeight: number` - Default to 1.2
    - `stroke: string`, `strokeWidth: number` - Default to no outline
- [x] Add `PersistedText` to `PersistedShape` union type

---

### 2. Create Text Factory ✅

**File:** `app/canvas/_lib/shapes.ts`

- [x] Import `TextObject` from `@/types/canvas`
- [x] Import `PersistedText` from `../_types/shapes`
- [x] Create `textFactory: ShapeFactory<PersistedText>`
  - [x] **createDefault**: Create text from click position
    - Accept `{ x, y }` position (width/height optional - can be auto)
    - Set `content: "Text"` as placeholder
    - Set default `fontSize: 16` **(MVP - only editable text property)**
    - Set default `fill: "#000000"` (black text)
    - Set `rotation: 0`
    - Set `opacity: 1`
    - Set `zIndex: 0`
    - Set `width: 100`, `height: 30` (initial bounding box, will adjust based on content)
    - Accept overrides for custom default properties
    - **POSTPONED (hardcoded defaults for now):**
      - `fontFamily: "Arial"`
      - `fontWeight: "normal"`
      - `fontStyle: "normal"`
      - `textAlign: "left"`
      - `textDecoration: "none"`
      - `lineHeight: 1.2`
      - `stroke: "#000000"`, `strokeWidth: 0`
  - [x] **createFromDraft**: Call createDefault with position
  - [x] **toFirestore**: Convert `PersistedText` to Firestore `TextObject`
    - Map all text properties to Firestore format
    - Include `content`, typography properties
    - Include `fill`, `stroke`, `strokeWidth`, `strokeOpacity`
    - Include `createdBy`, `updatedBy`, timestamps
    - Include lock fields
  - [x] **fromFirestore**: Convert Firestore `TextObject` to `PersistedText`
    - Extract all text properties
    - Handle backward compatibility (default values for missing fields)
  - [x] **validateSize**: Ensure text has content
    - Return `text.content.length > 0` (at least 1 character)
    - Or accept empty text and validate on save
  - [x] **normalizeDrawing**: Not applicable for click-to-place
    - Can return a simple bounding box for the click position
  - [x] **getDraftData**: Return null or minimal preview
    - Text tool doesn't show draft preview during placement
    - Text appears immediately when user starts typing in edit mode
- [x] Add `text: textFactory` to `shapeFactories` registry

---

### 3. Update Tool Constants ✅

**File:** `app/canvas/_constants/tools.ts`

- [x] **Do NOT** add `"text"` to `DRAWING_TOOLS` array (text is click-to-place, not drag-to-draw)
- [x] Update `ShapeToolType` to include `"text"`: `"rectangle" | "circle" | "line" | "text"`
- [x] Update `isShapeTool` function to check for `"text"`
- [x] **Optional:** Add helper: `export function isClickToPlaceTool(tool: CanvasTool): boolean` (or just handle text separately in Canvas.tsx)

---

### 4. Add Text to Toolbar ✅

**File:** `app/canvas/_components/Toolbar.tsx`

- [x] Import `Type` icon from lucide-react
- [x] Add text tool button to `TOOLS` array:
  ```typescript
  { id: "text", label: "Text", icon: Type, shortcut: "T" }
  ```
- [x] Position after line tool

---

### 5. Add Text Keyboard Shortcut ✅

**File:** `app/canvas/_components/Canvas.tsx`

- [x] In keyboard handler, add text tool shortcut:
  ```typescript
  else if (e.key === "t" || e.key === "T") {
    setActiveTool("text");
    e.preventDefault();
  }
  ```

---

### 6. Create TextShape Component ✅

**File:** `app/canvas/_components/shapes/TextShape.tsx` (NEW)

- [x] Import `Text` from `react-konva`
- [x] Import `Konva` and `KonvaEventObject`
- [x] Define `PersistedText` type (import from `_types/shapes.ts`)
- [x] Create `TextShapeProps` interface:
  - `shape: PersistedText`
  - `isSelected: boolean`
  - `isLocked: boolean`
  - `isSelectable: boolean`
  - `zoom: number`
  - `onSelect: () => void`
  - `onTransform: (updates: Partial<PersistedText>) => void`
  - `shapeRef: (node: Konva.Text | null) => void`
  - `onRenewLock: () => void`
- [x] Create `TextShape` component **(MVP - no inline editing)**
  - [x] Render `<Text>` with Konva
    - Set `text={shape.content}`
    - Set `x`, `y`, `width` from shape (let height auto-adjust)
    - Set `fontSize` from shape
    - **Hardcoded defaults:** `fontFamily="Arial"`, `align="left"`, `lineHeight={1.2}`
    - Set `fill` (text color - red if locked, else shape.fill)
    - Set `opacity`, `rotation`
  - [x] Handle single-click to select (if selectable)
  - [x] Handle drag end to update position
  - [x] Handle transform end for scaling/rotation
  - [x] Set draggable and listening based on isSelectable
- [x] Export as default

**POSTPONED for future PR:**

- [ ] Double-click to enter inline edit mode
- [ ] HTML textarea overlay for editing
- [ ] All typography controls in component

---

### 7. Update Shape Router ✅

**File:** `app/canvas/_components/shapes/index.tsx`

- [x] Import `TextShape` from `./TextShape`
- [x] Import `PersistedText` from `../../_types/shapes`
- [x] Add case for `"text"` in switch statement:
  ```typescript
  case "text":
    return (
      <TextShape
        shape={object as PersistedText}
        isSelected={isSelected}
        isLocked={isLocked}
        isSelectable={isSelectable}
        zoom={zoom}
        onSelect={onSelect}
        onTransform={onTransform}
        shapeRef={shapeRef as (node: Konva.Text | null) => void}
        onRenewLock={onRenewLock}
      />
    );
  ```

---

### 8. Update Canvas Interaction Logic ✅

**File:** `app/canvas/_components/Canvas.tsx`

- [x] Update mouse handlers for text tool:
  - **handleStageMouseDown**: If `activeTool === "text"`:
    - Get click position (convert to canvas coordinates)
    - Create new text object at position using `textFactory.createDefault`
    - Pass `defaultShapeProperties.text` as overrides
    - Save to Firestore using `saveObject(newText)`
    - Auto-select the new text: `setSelectedIds([newText.id])`
    - Properties panel will automatically appear for editing
  - **No drag handling** for text tool
- [x] Text objects render automatically via ShapeComponent router

**MVP: Properties Panel Editing Only**

- Click to place text with default "Text" content
- Text is automatically selected, properties panel appears
- User edits content and fontSize via properties panel
- Simple and works with existing infrastructure

**POSTPONED for future PR:**

- [ ] Inline edit mode with HTML overlay
- [ ] Double-click to edit
- [ ] Edit state management

---

### 9. Create TextProperties Component ✅

**File:** `app/canvas/_components/properties/shape-properties/TextProperties.tsx` (NEW)

- [x] Create `TextPropertiesProps` interface:
  - `shape: PersistedText`
  - `onUpdate: (updates: Partial<PersistedText>) => void`
  - `disabled?: boolean`
- [x] Create `TextProperties` component **(MVP - minimal)**
  - [x] **Content** (textarea for multi-line text):
    - Large textarea input (4-6 rows)
    - Update `content` property
    - Use Textarea from components/ui or plain textarea
  - [x] **Font Size** (number input):
    - Range: 8-200px
    - Default: 16
    - Use Input component with type="number"
  - [x] Keep it simple and clean like other property panels
- [x] Export as default

**POSTPONED for future PR:**

- [ ] Font Family dropdown
- [ ] Font Weight dropdown
- [ ] Font Style toggle (italic)
- [ ] Text Align button group
- [ ] Text Decoration options
- [ ] Line Height input
- [ ] Advanced typography controls

---

### 10. Register Text Properties Component ✅

**File:** `app/canvas/_components/properties/shape-properties/index.ts`

- [x] Import `TextProperties` from `./TextProperties`
- [x] Add to `shapePropertyComponents` registry:
  ```typescript
  text: TextProperties,
  ```

---

### 11. Update Default Properties Store ✅

**File:** `app/canvas/_store/canvas-store.ts`

- [x] Add `text` to `DefaultShapeProperties` interface **(MVP - minimal)**:
  ```typescript
  text: {
    content: string;
    fontSize: number;
    fill: string; // text color
    opacity: number;
  }
  ```
- [x] Add `text` to `DEFAULT_SHAPE_PROPERTIES`:
  ```typescript
  text: {
    content: "Text",
    fontSize: 16,
    fill: "#000000", // Black
    opacity: 1,
  }
  ```

**Note:** Other text properties (fontFamily, fontWeight, etc.) will be hardcoded in the factory and component for MVP.

---

### 12. Update PropertiesPanel Type ✅

**File:** `app/canvas/_components/PropertiesPanel.tsx`

- [x] Update `defaultShapeProperties` type to include `text`
- [x] Update `onUpdateDefaults` type signature to accept `"rectangle" | "circle" | "line" | "text"`
- [x] Update mock shape creation for text in default properties view **(MVP - simplified)**:
  ```typescript
  : {
      type: "text",
      x: 0,
      y: 0,
      width: 100,
      height: 30,
      content: defaultShapeProperties.text.content,
      fontSize: defaultShapeProperties.text.fontSize,
      fill: defaultShapeProperties.text.fill,
      opacity: defaultShapeProperties.text.opacity,
    }
  ```

---

### 13. Update StyleProperties for Text ✅

**File:** `app/canvas/_components/properties/StyleProperties.tsx`

- [x] Text objects have `fill` (text color) - keep fill section visible
- [x] **Optional enhancement:** Rename "Fill" to "Text Color" when `object.type === "text"`
- [x] Hide "No Fill" checkbox for text (text always needs a color)
- [x] **MVP:** Postpone stroke/outline controls for text (keep them hidden or use defaults)

---

### 14. Testing Checklist

- [ ] **Tool Selection**
  - [ ] Click text tool in toolbar activates text mode
  - [ ] Keyboard shortcut "T" activates text tool
  - [ ] Text tool shows highlighted in toolbar when active
- [ ] **Text Placement**
  - [ ] Click on canvas places text at click position
  - [ ] Text shows with default "Text" content
  - [ ] Text is automatically selected after placement
  - [ ] Properties panel appears for editing
- [ ] **Selection & Manipulation**
  - [ ] Can click to select text (in select tool mode)
  - [ ] Selected text shows transformer handles
  - [ ] Can drag to move text
  - [ ] Can resize bounding box (text scales or wraps)
  - [ ] Can rotate text
  - [ ] Text properties panel shows when text is selected
- [ ] **Editing (MVP - Properties Panel Only)**
  - [ ] Can edit text content via textarea in properties panel
  - [ ] Can change font size via number input
  - [ ] Changes save to Firestore correctly
  - [ ] Text updates in real-time for other users
- [ ] **Properties Panel - Typography (MVP)**
  - [ ] Shows content textarea
  - [ ] Shows fontSize number input
  - [ ] All changes update canvas immediately
- [ ] **Properties Panel - Style**
  - [ ] Can change text fill color
  - [ ] Can change text stroke (outline)
  - [ ] Can change stroke width
  - [ ] Can change opacity
  - [ ] Shows as "Text Color" instead of "Fill"
- [ ] **Default Properties**
  - [ ] With text tool active and nothing selected, shows default text properties
  - [ ] Can change default content placeholder
  - [ ] Can change default font settings
  - [ ] Can change default colors
  - [ ] New text objects use updated defaults
- [ ] **Locking**
  - [ ] Text locked by another user shows red color
  - [ ] Locked text cannot be selected/edited
  - [ ] Locked text shows lock indicator in properties
- [ ] **Real-time Sync**
  - [ ] Text created by one user appears for other users
  - [ ] Text edits sync in real-time
  - [ ] Text moves/transforms sync correctly
  - [ ] Text deletions sync correctly
- [ ] **Layer Management**
  - [ ] Text respects z-index ordering
  - [ ] Can bring text to front/send to back
  - [ ] Layer controls work in properties panel
- [ ] **Persistence**
  - [ ] Text persists to Firestore correctly
  - [ ] Page refresh loads text correctly
  - [ ] Text maintains all properties after reload
  - [ ] Multi-line text preserves line breaks

---

## Implementation Complete! 🎉

**All 13 implementation tasks finished!**

### Summary of Changes:

1. ✅ **Type Definitions** - Added `PersistedText` interface
2. ✅ **Text Factory** - Complete factory with all methods (hardcoded typography for MVP)
3. ✅ **Tool Constants** - Added text to shape tools
4. ✅ **Toolbar** - Added text button with "T" shortcut
5. ✅ **Keyboard Shortcut** - Press "T" to activate text tool
6. ✅ **TextShape Component** - Full Konva rendering with click, drag, transform
7. ✅ **Shape Router** - Integrated text into routing
8. ✅ **Canvas Interaction Logic** - Click-to-place text creation
9. ✅ **TextProperties Component** - Content textarea + fontSize input
10. ✅ **Property Registration** - Registered text properties
11. ✅ **Default Properties Store** - Added text defaults (black #000000)
12. ✅ **PropertiesPanel** - Updated types and mock shape
13. ✅ **StyleProperties** - Renamed "Fill" to "Text Color", hidden "No Fill" checkbox

### MVP Text Tool Features ⭐

- **Click-to-place interaction** - One click to create text
- **Auto-select after creation** - Properties panel appears immediately
- **Edit via properties panel:**
  - Content textarea (multi-line editing)
  - Font size input (8-200px range)
  - Text color picker (via Fill/Text Color)
  - Opacity slider
- **All standard shape features:**
  - Move (drag)
  - Rotate (transformer)
  - Resize bounding box
  - Delete
  - Lock/unlock
  - Z-index control
  - Real-time sync

### Hardcoded Typography (MVP):

- Font Family: Arial
- Font Weight: normal
- Font Style: normal
- Text Align: left
- Line Height: 1.2
- Stroke: none (strokeWidth: 0)

These can be added in future PRs!

### No Lint Errors! ✨

All TypeScript errors resolved. Code is clean and ready for testing.

---

## Implementation Notes

### Text Editing Approaches

**Option A: Inline HTML Editing (Complex but Best UX)**

- Use HTML overlay (textarea or contenteditable div) positioned over Konva text
- Requires coordinate transformation to match Konva coordinates
- Needs to handle zoom/pan
- Best user experience - edit text in place

**Option B: Properties Panel Editing (Simple for MVP)**

- Click to place text with default content
- Edit text content via textarea in properties panel
- Simpler to implement
- Good enough for MVP
- Add inline editing in future PR

**Option C: Modal/Prompt Editing (Simplest)**

- Use browser `prompt()` or modal dialog
- Very simple but poor UX
- Not recommended

**RECOMMENDED for MVP: Option B** - Edit via properties panel. Add inline editing later.

### Text Rendering Considerations

**Konva Text Component:**

- Supports all standard text properties (fontSize, fontFamily, align, etc.)
- Auto-wraps text based on `width`
- Can measure text bounds automatically
- Supports line height, text decoration
- Fill = text color, stroke = text outline

**Width/Height Behavior:**

- Option A: **Fixed width, auto height** - Set width, let height adjust to content
- Option B: **Auto width and height** - Text determines its own size
- Option C: **Fixed bounding box** - Text wraps within box

**RECOMMENDED for MVP: Fixed width with auto height** - Easier to implement, more predictable behavior.

### Font Loading

**System Fonts (Simple):**

- Use web-safe fonts: Arial, Helvetica, Times New Roman, Courier, Verdana, Georgia
- Always available, no loading needed
- Generic fallbacks: sans-serif, serif, monospace

**Custom Fonts (Advanced):**

- Use Google Fonts or custom web fonts
- Requires font loading and ready state checking
- Can add in future PR

**RECOMMENDED for MVP: System fonts only**

### Text Selection & Transformer

**Konva Transformer with Text:**

- Default transformer allows resize, rotate
- Resizing can change bounding box width
- Text reflows automatically
- Rotation works fine with text

**Text-Specific Transformer Settings:**

- May want to constrain proportions differently
- Consider adding padding around text box
- Test transformer behavior with text

### Performance Considerations

**Text Rendering:**

- Konva Text is performant for reasonable amounts of text
- Short labels/titles are fine
- Very long text blocks may impact performance
- Monitor performance with many text objects

**Real-time Sync:**

- Debounce text content updates during editing
- Don't sync every keystroke - wait for pause or blur
- Use same locking mechanism as shapes

---

## Files to Create

1. `app/canvas/_components/shapes/TextShape.tsx`
2. `app/canvas/_components/properties/shape-properties/TextProperties.tsx`

## Files to Modify

1. `app/canvas/_types/shapes.ts` - Add PersistedText type
2. `app/canvas/_lib/shapes.ts` - Add textFactory
3. `app/canvas/_constants/tools.ts` - Add text to tools, create CLICK_TO_PLACE_TOOLS
4. `app/canvas/_components/Toolbar.tsx` - Add text button
5. `app/canvas/_components/shapes/index.tsx` - Add text case
6. `app/canvas/_components/properties/shape-properties/index.ts` - Register TextProperties
7. `app/canvas/_components/Canvas.tsx` - Add text placement logic (click-to-place)
8. `app/canvas/_store/canvas-store.ts` - Add text default properties
9. `app/canvas/_components/PropertiesPanel.tsx` - Update types for text
10. `app/canvas/_components/properties/StyleProperties.tsx` - Consider text-specific labeling

## Estimated Complexity

**Medium** (was High, but simplified with MVP approach)

Original complexity reduced by:

1. ✅ **Properties panel editing** - No inline edit mode needed for MVP
2. ✅ **Minimal typography** - Only fontSize, everything else hardcoded
3. ✅ **Simple properties UI** - Just 2 inputs (content textarea, fontSize number)
4. ✅ **Reuse existing infrastructure** - Factory pattern, persistence, rendering all work as-is
5. ✅ **Click-to-place** - Simpler than drag interactions

**Remaining Complexity:**

1. Different interaction (click-to-place vs drag)
2. New shape type integration
3. Text rendering with Konva
4. Testing text-specific features

**Time Estimate:** Similar to line implementation (~2-3 hours)

## Success Criteria

- [ ] Can place text on canvas by clicking
- [ ] Can edit text content (via properties panel for MVP)
- [ ] Text persists to Firestore and reloads correctly
- [ ] Text syncs in real-time between users
- [ ] Can select, move, rotate, and delete text
- [ ] Can change all text properties (font, size, color, alignment, etc.)
- [ ] Properties panel works for text (all typography controls)
- [ ] Default properties work for text
- [ ] Locking system works for text
- [ ] Layer management works for text
- [ ] Text renders correctly with all style options

---

## MVP Simplifications ✂️

To make initial implementation manageable, we're implementing **only the essentials**:

### ✅ **MVP Includes:**

1. **Content editing** - Via textarea in properties panel
2. **Font size control** - Via number input (8-200px)
3. **Text color** - Via fill color picker (inherited from StyleProperties)
4. **Opacity** - Via opacity slider (inherited from StyleProperties)
5. **Basic transforms** - Move, rotate (inherited from shapes)
6. **Click-to-place** - Simple click to create text

### ⏸️ **POSTPONED for Future PRs:**

**Typography Controls (Future PR #1):**

- [ ] Font family dropdown (Arial, Helvetica, etc.)
- [ ] Font weight (normal, bold, lighter, bolder)
- [ ] Font style (normal, italic)
- [ ] Text alignment (left, center, right)
- [ ] Text decoration (underline, line-through)
- [ ] Line height control

**Inline Editing (Future PR #2):**

- [ ] Double-click to edit
- [ ] HTML textarea overlay
- [ ] Edit mode state management
- [ ] Escape to exit edit mode

**Advanced Features (Future PR #3+):**

- [ ] Google Fonts support
- [ ] Rich text formatting
- [ ] Text auto-sizing modes
- [ ] Vertical text
- [ ] Text on path

### Why This Approach?

- **Faster to implement** - Get text working quickly
- **Test the infrastructure** - Verify factory pattern works for text
- **Gather feedback** - See what typography controls users actually need
- **Iterate incrementally** - Add features based on priority

---

## Comparison to Line Implementation

**Similar to Line:**

- Both are non-standard shape tools
- Both need special handling in Canvas.tsx
- Both have unique properties not shared with rect/circle
- Both already have Firestore types defined

**Different from Line:**

- Text is click-to-place, not click-and-drag
- Text needs edit mode (line does not)
- Text has many more properties
- Text uses standard width/height (line uses x2/y2)
- Text properties panel is much more complex

**Lessons from Line:**

- Factory pattern works well
- Type definitions should be comprehensive upfront
- Draft preview optional for non-drag tools
- Properties panel can show read-only info (like line length/angle)
- Good to have defensive checks and fallback values

---

## Package Dependencies

Check if additional packages needed:

- [ ] `react-konva-utils` - For HTML overlays (if doing inline editing)
- [ ] Font loading libraries (if using Google Fonts)

Currently have:

- ✅ `konva` - Text component available
- ✅ `react-konva` - Text component available
- ✅ `lucide-react` - Type icon available

**For MVP: No new dependencies needed!**
