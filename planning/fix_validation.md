# Input Validation Plan

## Problem Overview

A text object was created with invalid numeric values (fontSize: 1640, x/y/width: NaN) which broke rendering. While backend sanitization in `sanitizeNumber()` (app/canvas/_lib/shapes.ts) prevents corrupt data from rendering, we need frontend validation to prevent users from entering invalid values in the first place.

The UI currently has minimal validation - some inputs have HTML5 `min`/`max` attributes, but these can be bypassed by typing, and don't prevent NaN values from `parseFloat()` calls.

## Files Requiring Validation

### Properties Panel Components

All located in `app/canvas/_components/properties/`:

1. **UniversalProperties.tsx**
   - Position (x, y): Lines 93-114 - No validation needed (any number valid)
   - Size (width, height): Lines 129-156 - Need min validation (currently has `min="1"` but not enforced)
   - Rotation: Lines 171-187 - Has normalization to 0-360 but allows invalid input

2. **StyleProperties.tsx**
   - Stroke width: Lines 250-260 - Has `min="0"` but not enforced
   - Opacity: Lines 271-285 - Uses range slider (already constrained to 0-100%)

3. **TextProperties.tsx**
   - Font size: Lines 151-163 - Has `min="8"` `max="200"` but not enforced (note: backend allows up to 500)
   - Line height: Lines 293-306 - Has `min="0.5"` `max="3"` but not enforced

4. **RectangleProperties.tsx**
   - Corner radius: Lines 25-38 - Has dynamic max (Math.min(width, height)/2) and clamping logic

5. **CircleProperties.tsx**
   - RadiusX, RadiusY: Lines 46-73 - Has `min="1"` but not enforced

6. **LineProperties.tsx**
   - Read-only display, no validation needed

### Modal Component

7. **CreateCanvasModal.tsx**
   - Canvas dimensions: Lines 213-242 - Has proper validation logic in `validateForm()`
   - This is a good reference pattern for validation

## Validation Requirements

Based on backend sanitization in `shapes.ts` (lines 32-42, 157-165, 340-356, 526-537, 720-737):

| Property | Min | Max | Default | Notes |
|----------|-----|-----|---------|-------|
| fontSize | 8 | 500 | 16 | UI currently shows max="200" |
| width/height (shapes) | 10 | **Dynamic: canvas.width / canvas.height** | 100 | Max should not exceed canvas dimensions |
| strokeWidth | 0 | 100 | 2 | 0 = no stroke |
| opacity | 0 | 1 | 1 | Range slider already safe |
| cornerRadius | 0 | 500 | 0 | Already has clamping logic |
| rotation | any | any | 0 | Current normalization is fine |
| position (x, y) | any | any | 0 | No limits needed |
| radiusX/radiusY | 5 | **Dynamic: min(canvas.width, canvas.height) / 2** | - | Max radius should not exceed half the smaller canvas dimension |
| lineHeight | 0.5 | 3 | 1.2 | Already has min/max |

**Note on Dynamic Limits:**
- Width/height max should be based on the current canvas dimensions (accessible from canvas context)
- RadiusX/radiusY max should be `Math.min(canvasWidth, canvasHeight) / 2` to ensure circles fit within canvas bounds
- Backend sanitization will keep static limits as a safety net, frontend validation will use dynamic limits

## Recommended Approach

### Option 1: Shared Validation Hook (Recommended)

Create a `useNumericInput` hook in `app/canvas/_hooks/` that:
- Validates input on change and blur
- Clamps values to min/max range
- Handles NaN/empty string cases gracefully
- Returns validated value and onChange handler
- Reusable across all property components

Benefits:
- Single source of truth for validation logic
- Consistent UX across all inputs
- Easy to maintain and test
- Follows existing hook pattern (see useObjects, useAuth, etc.)

### Option 2: Shared Validation Utilities

Create validation utilities in `app/canvas/_lib/validation.ts`:
- `validateNumber(value, min, max, defaultVal)`
- `clampNumber(value, min, max)`
- `parseNumberSafe(input, defaultVal)`

Each component calls these directly in onChange handlers.

Benefits:
- Simpler than hook approach
- More explicit validation at call sites
- Easier to customize per-input

Drawbacks:
- More repetitive code in components
- Harder to enforce consistency

**Recommendation: Use Option 1 (shared hook) for consistency and maintainability.**

## Implementation Strategy

1. **Create validation hook** (`app/canvas/_hooks/useNumericInput.ts`):
   - Accept min, max, default as parameters (max can be dynamic value)
   - Handle parseFloat safely
   - Clamp on blur, allow temporary invalid during typing
   - Return { value, onChange, onBlur }

2. **Pass canvas dimensions to property components**:
   - Canvas dimensions available from canvas store or parent context
   - Components need `canvasWidth` and `canvasHeight` for dynamic validation

3. **Update property components** in this order:
   - TextProperties (fontSize, lineHeight) - Most critical, simple (no dynamic limits)
   - StyleProperties (strokeWidth) - Simple (no dynamic limits)
   - UniversalProperties (width, height) - Needs canvas dimensions for max
   - CircleProperties (radiusX, radiusY) - Needs canvas dimensions for max
   - RectangleProperties - Already has clamping, verify consistency

4. **Match UI limits**:
   - Update TextProperties fontSize max from 200 to 500
   - Update UniversalProperties width/height to use dynamic canvas-based max
   - Update CircleProperties radius to use dynamic canvas-based max

## Edge Cases to Handle

1. **Empty string input**: Should default to minimum or last valid value
2. **Copy-paste large numbers**: Should clamp on blur
3. **Scientific notation (1e10)**: parseFloat handles this, needs clamping
4. **Negative numbers**: Should clamp to min
5. **Decimal values**: Allow for opacity, strokeWidth; round for fontSize, dimensions
6. **Rapid typing**: Don't update parent until blur or valid value entered
7. **Null/undefined from Firestore**: Already handled by backend sanitization

## Testing Strategy

1. **Manual testing scenarios**:
   - Type extremely large numbers in each field
   - Copy-paste invalid values
   - Clear field entirely
   - Type negative numbers where min is 0
   - Rapid typing and blur
   - Multi-user collaboration (ensure sync doesn't reset input mid-type)

2. **Visual verification**:
   - Error states shown when appropriate
   - Values clamped on blur
   - No NaN or Infinity values saved to Firestore
   - No UI crashes from invalid values

3. **Regression testing**:
   - Verify existing functionality (rotation normalization, corner radius clamping)
   - Check that TextProperties throttling still works
   - Ensure LockedByBadge prevents edits when locked

## Notes

- Opacity already safe (uses range slider, not number input)
- CreateCanvasModal has good validation pattern to reference
- Backend sanitization remains critical as safety net
- Consider adding validation constants file (`app/canvas/_lib/validation-constants.ts`) if limits need to be referenced elsewhere
