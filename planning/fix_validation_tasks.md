# Input Validation - Implementation Task List

## Context

A text object was recently created with invalid numeric values (fontSize: 1640, x/y/width: NaN) which broke rendering. While backend sanitization exists, frontend validation is missing - users can currently bypass HTML5 `min`/`max` attributes by typing, and `parseFloat()` can produce NaN values that crash the UI.

This implementation adds a shared validation hook (`useNumericInput`) that all property panel components will use to prevent invalid input. The hook handles NaN detection, range clamping, and provides a consistent UX across all numeric inputs. We'll also update dynamic validation limits to use actual canvas dimensions where appropriate (e.g., shape width/height should not exceed canvas bounds).

The work is broken into 3 PRs: (1) create the validation hook, (2) add validation to simple inputs with static limits, and (3) add validation to inputs that need dynamic canvas-based limits.

---

## Instructions for AI Agent

### Workflow for Each PR

1. **Read the entire PR first**: Review all tasks and file changes before starting
2. **Complete all tasks sequentially**:
   - Work through tasks in order
   - Mark completed tasks with `[x]`
   - If a task references "see planning doc," check the planning document for additional context
3. **Run linting**: Execute `npm run lint` after completing all tasks
4. **Test manually**: Verify the changes work as expected (see "What to Test" in each PR)
5. **Provide completion summary** with:
   - Brief description of changes made
   - Specific instructions for manual testing (what to click, what to look for)
   - Any known limitations or follow-up items
   - Preview of next PR's scope
6. **Wait for approval**: Do not proceed to the next PR until confirmed by user

### Implementation Guidelines

- **Use existing patterns**: Follow the codebase's established conventions
- **File descriptions are hints**: "Files Changed" lists likely files, but you may need to modify others
- **Don't over-engineer**: Implement the simplest solution that works
- **Test incrementally**: After each major task, verify it works before moving on
- **Ask if blocked**: If requirements are unclear or you encounter unexpected issues, ask before proceeding

---

## Phase 1: Core Infrastructure

### PR #1: Create Shared Validation Hook

**Goal:** Build a reusable `useNumericInput` hook that handles safe numeric input parsing, validation, and clamping for all property panel inputs

**Tasks:**

- [x] Create `app/canvas/_hooks/useNumericInput.ts` with hook implementation
  - Accept parameters: `value`, `onChange`, `min`, `max`, `defaultValue`
  - Handle `parseFloat` safely to prevent NaN
  - Clamp values on blur (allow temporary invalid during typing)
  - Return object with `{ displayValue, handleChange, handleBlur }`
- [x] Add JSDoc comments explaining hook usage and parameters
- [x] Handle edge cases:
  - Empty string input (use defaultValue or min)
  - Copy-paste of large numbers (clamp on blur)
  - Scientific notation like 1e10 (clamp on blur)
  - Negative numbers when min is positive
  - Decimal values (preserve precision)

**What to Test:**

- Hook is created and exports correctly
- Run `npm run lint` to verify TypeScript types are correct
- No runtime testing needed yet (hook will be tested in PR #2)

**Files Changed:**

- `app/canvas/_hooks/useNumericInput.ts` - NEW: Validation hook for numeric inputs

**Notes:**

- The hook should allow temporary invalid values during typing (for UX), but clamp on blur
- Reference `planning/fix_validation.md` lines 103-107 for detailed hook requirements
- Keep it simple - don't add features beyond basic validation and clamping

---

## Phase 2: Apply Validation (Static Limits)

### PR #2: Add Validation to Simple Property Inputs

**Goal:** Apply the validation hook to property panel inputs that have static (non-dynamic) validation limits

**Tasks:**

- [x] Update `StyleProperties.tsx` stroke width input (lines 246-261):
  - Import and use `useNumericInput` hook
  - Set min=0, max=100, default=2
  - Replace direct `parseFloat` calls with hook's handlers
- [x] Create `app/canvas/_components/properties/TextProperties.tsx` if it doesn't exist
  - Add validation for fontSize input with min=8, max=500, default=16
  - Add validation for lineHeight input with min=0.5, max=3, default=1.2
  - Use `useNumericInput` hook for both inputs
- [x] Test that invalid inputs are prevented:
  - Type extremely large numbers
  - Clear field entirely
  - Type negative numbers
  - Verify values clamp on blur

**What to Test:**

- Open canvas and create a text object (or any shape for stroke width)
- Open properties panel and test stroke width input:
  - Type "999" - should clamp to 100 on blur
  - Type "-5" - should clamp to 0 on blur
  - Clear the field - should restore to default or 0
- Test text properties (if text tool exists):
  - Type "9999" in fontSize - should clamp to 500 on blur
  - Type "5" in lineHeight - should clamp to 3 on blur
  - Type "-1" in lineHeight - should clamp to 0.5 on blur
- Verify no console errors or NaN values saved to Firestore

**Files Changed:**

- `app/canvas/_components/properties/StyleProperties.tsx` - Add validation to stroke width input
- `app/canvas/_components/properties/TextProperties.tsx` - Add validation to fontSize and lineHeight (may need to create file)

**Notes:**

- If TextProperties.tsx doesn't exist yet, reference the planning doc (lines 24-27) for which inputs need validation
- The validation hook should make the code cleaner by removing inline parseFloat calls
- Check existing CreateCanvasModal.tsx (lines 213-242) for validation pattern reference

---

## Phase 3: Apply Validation (Dynamic Limits)

### PR #3: Add Validation with Canvas-Based Dynamic Limits

**Goal:** Apply validation to inputs that need dynamic limits based on canvas dimensions (width/height/radius)

**Tasks:**

- [x] Pass canvas dimensions to property components:
  - Identify where canvas metadata (width/height) is available
  - Pass `canvasWidth` and `canvasHeight` as props to UniversalProperties and CircleProperties
  - Update component interfaces to accept these props
- [x] Update `UniversalProperties.tsx` width/height inputs (lines 124-157):
  - Import and use `useNumericInput` hook
  - Set min=10, max=canvasWidth (for width) / canvasHeight (for height)
  - Handle circle type (converts width/height to radiusX/radiusY)
- [x] Create or update `CircleProperties.tsx` if it exists:
  - Add validation for radiusX/radiusY inputs
  - Set min=5, max=Math.min(canvasWidth, canvasHeight) / 2
  - Use `useNumericInput` hook
- [x] Update rotation input in UniversalProperties (lines 171-187):
  - Apply validation with min=0, max=360
  - Keep existing normalization logic (handle negative values)
- [x] Verify RectangleProperties corner radius validation still works
  - It already has clamping logic - ensure it's consistent with new pattern

**What to Test:**

- Open canvas with known dimensions (e.g., 1920x1080)
- Create a rectangle and open properties panel:
  - Try to set width to 5000 - should clamp to canvas width (1920)
  - Try to set height to 5000 - should clamp to canvas height (1080)
  - Try to set width to 5 - should clamp to 10 (minimum)
- Create a circle:
  - Try to set radius larger than half the canvas - should clamp appropriately
  - Verify circle doesn't overflow canvas bounds after clamping
- Test rotation input:
  - Type "720" - should normalize to 0 (or keep at 720 with modulo normalization)
  - Type "-90" - should normalize to 270
- Open another browser window and verify changes sync correctly (no lock conflicts)

**Files Changed:**

- `app/canvas/_components/properties/UniversalProperties.tsx` - Add validation with dynamic canvas limits
- `app/canvas/_components/properties/CircleProperties.tsx` - Add validation for radius (may need to create)
- `app/canvas/_components/PropertiesPanel.tsx` (or parent component) - Pass canvas dimensions to property components
- Potentially: `app/canvas/_hooks/useCanvas.ts` or similar - To access canvas metadata

**Notes:**

- Canvas dimensions come from Canvas metadata (see `types/canvas.ts` lines 27-43 and `lib/firebase/canvas.ts`)
- May need to access canvas metadata through props drilling or context
- Reference `planning/fix_validation.md` lines 59-62 for dynamic limit requirements
- Ensure the validation doesn't interfere with multi-user collaboration (users can still type while others edit)

---

## Summary

**Total Phases:** 3
**Total PRs:** 3
**Estimated Complexity:** Medium

**Key Dependencies:**

- Firebase must be configured and running for testing
- Need at least one canvas with objects to test property panel inputs
- Multi-browser testing recommended for PR #3 to verify real-time sync doesn't break

**Testing Strategy:**

After all PRs are complete, perform comprehensive regression testing:
- Create objects of each type (rectangle, circle, line, text if available)
- Test all numeric inputs with extreme values, negatives, decimals, and empty strings
- Verify values are properly saved to Firestore (check Firebase console)
- Test with multiple users to ensure locks and sync work correctly
- Confirm no NaN or Infinity values can be saved
- Verify existing functionality (rotation normalization, corner radius clamping) still works
