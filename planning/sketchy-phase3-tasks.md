# Sketchy AI Personality - Phase 3: Context-Aware Messaging - Implementation Task List

## Context

Phase 3 adds personality and variety to Sketchy's responses to make interactions feel fun and celebratory instead of clinical and boring. Currently, all response messages come from the `ai-tools.ts` file where each tool returns a simple `message` field (e.g., "Created rectangle at (300, 200) with size 400×300"). These messages are passed unchanged through the API and displayed in the chat panel.

This phase transforms those boring messages into fun, conversational responses with personality. We'll create a response template library with randomization and context-awareness, then integrate it into the AI tools. The key technical approach is to replace static message strings with dynamic template selection based on the action performed.

**Key architectural decisions:**
- Response templates live in a new `_lib/ai-responses.ts` file for maintainability
- Template functions accept context (coordinates, sizes, colors) and return randomized messages
- Each tool calls the appropriate template function instead of hardcoding messages
- Templates use conversational language, emojis (sparingly), and variety to avoid repetition

---

## Instructions for AI Agent

### Workflow for Each PR

1. **Read the entire PR first**: Review all tasks and file changes before starting
2. **Complete all tasks sequentially**:
   - Work through tasks in order
   - Mark completed tasks with `[x]`
   - If a task references "see planning doc," check `planning/fun-ai-assistant.md` for examples
3. **Run linting**: Execute `npm run lint` after completing all tasks
4. **Test manually**: Verify the changes work as expected (see "What to Test" in each PR)
5. **Provide completion summary** with:
   - Brief description of changes made
   - Specific instructions for manual testing (what commands to type, what to look for)
   - Examples of before/after messages
   - Preview of next PR's scope
6. **Wait for approval**: Do not proceed to the next PR until confirmed by user

### Implementation Guidelines

- **Use existing patterns**: Follow the codebase's established conventions
- **File descriptions are hints**: "Files Changed" lists likely files, but you may need to modify others
- **Don't over-engineer**: Implement the simplest solution that works
- **Test incrementally**: After each major task, verify it works before moving on
- **Ask if blocked**: If requirements are unclear or you encounter unexpected issues, ask before proceeding
- **Emoji usage**: Use emojis sparingly (1-2 per message max), and only where they add personality without being overwhelming

---

## Phase 3: Context-Aware Messaging & Personality in Responses

### PR #1: Response Template Library Foundation

**Goal:** Create a centralized response template library with randomization support and basic template functions for creation tools.

**Tasks:**

- [x] Create new file `app/canvas/_lib/ai-responses.ts` for response templates
- [x] Add TypeScript interface `ResponseContext` with fields: `x`, `y`, `width`, `height`, `radius`, `color`, `objectId`, etc.
- [x] Implement helper function `pickRandom<T>(array: T[]): T` to select random templates
- [x] Implement helper function `interpolate(template: string, vars: Record<string, any>): string` to replace placeholders like `{x}`, `{y}`, `{width}`, etc.
- [x] Create template function `getCreateRectangleMessage(context: ResponseContext): string` with 5+ variations (see planning doc for examples)
- [x] Create template function `getCreateCircleMessage(context: ResponseContext): string` with 5+ variations
- [x] Create template function `getCreateLineMessage(context: ResponseContext): string` with 5+ variations
- [x] Create template function `getCreateTextMessage(context: ResponseContext): string` with 5+ variations
- [x] Add JSDoc comments explaining the template system and how to add new templates

**What to Test:**

- No manual testing yet (foundation only)
- Run `npm run lint` to verify no TypeScript errors
- Verify the file compiles without errors

**Files Changed:**

- `app/canvas/_lib/ai-responses.ts` - NEW: Response template library with randomization

**Notes:**

- Keep templates conversational but not overwhelming - aim for enthusiastic helper, not hyperactive robot
- Examples from planning doc:
  - Rectangle: "Boom! Rectangle deployed at ({x}, {y}) 📦", "Ta-da! {width}×{height} rectangle materialized!"
  - Circle: "Perfect circle at ({x}, {y}) ⭕", "Rolling out a circle at ({x}, {y}) 🔵"
  - Line: "Line drawn from ({x1}, {y1}) to ({x2}, {y2}) - straight as an arrow!"
  - Text: "Text placed at ({x}, {y}) - say it loud and proud!"
- Each function should have at least 5 different variations to avoid repetition
- Use TypeScript's `Record<string, any>` for the interpolation vars parameter

---

### PR #2: Integrate Creation Tool Templates

**Goal:** Replace hardcoded creation messages in `ai-tools.ts` with dynamic template selection from the response library.

**Tasks:**

- [x] Import response functions from `ai-responses.ts` into `app/canvas/_lib/ai-tools.ts`
- [x] Update `createRectangle` tool's return message to use `getCreateRectangleMessage({ x, y, width, height })`
- [x] Update `createCircle` tool's return message to use `getCreateCircleMessage({ x, y, radius })`
- [x] Update `createLine` tool's return message to use `getCreateLineMessage({ x1, y1, x2, y2 })`
- [x] Update `createText` tool's return message to use `getCreateTextMessage({ x, y, content })`
- [x] Test each creation tool to verify random messages appear correctly

**What to Test:**

- Open AI chat panel and create multiple rectangles: `"create a red rectangle at 100, 100"`
- Create the same shape type 3-4 times and verify you get different messages each time
- Create a circle: `"make a blue circle at 500, 500"`
- Create a line: `"draw a line from 100, 100 to 500, 500"`
- Create text: `"add text 'hello world' at 200, 200"`
- Verify all messages feel conversational and fun (not clinical)

**Files Changed:**

- `app/canvas/_lib/ai-tools.ts` - Update return messages for all create tools to use template functions

**Notes:**

- Before: "Created rectangle at (300, 200) with size 400×300"
- After (example): "Boom! Dropped a 400×300 rectangle at (300, 200) - looking sharp! 📦"
- The randomization happens server-side in the tool execution, so different creates should show variety

---

### PR #3: Update Tool Response Templates

**Goal:** Add personality to update/modify operations (color changes, position updates, rotation, etc.)

**Tasks:**

- [x] Add template function `getUpdateColorMessage(context: { color: string; property: 'fill' | 'stroke' }): string` with 4+ variations
- [x] Add template function `getUpdatePositionMessage(context: { x: number; y: number; deltaX?: number; deltaY?: number }): string` with 4+ variations
- [x] Add template function `getUpdateRotationMessage(context: { rotation: number }): string` with 4+ variations
- [x] Add template function `getUpdateSizeMessage(context: { width: number; height: number }): string` with 4+ variations
- [x] Add template function `getUpdateOpacityMessage(context: { opacity: number }): string` with 3+ variations
- [x] Add generic fallback function `getUpdateGenericMessage(): string` for other property updates with 3+ variations
- [x] Update `updateObject` tool in `ai-tools.ts` to detect which properties changed and call appropriate template function
- [x] Implement logic to pick the most relevant message when multiple properties are updated (prioritize: position > color > size > rotation > other)

**What to Test:**

- Create a rectangle, then update it: `"make it red"` - should get color update message
- Move an object: `"move it to 500, 500"` - should get position update message
- Rotate an object: `"rotate it 45 degrees"` - should get rotation message
- Resize an object: `"make it bigger"` or `"resize to 500, 300"` - should get size message
- Update multiple properties at once and verify the most relevant message appears

**Files Changed:**

- `app/canvas/_lib/ai-responses.ts` - Add update template functions
- `app/canvas/_lib/ai-tools.ts` - Update `updateObject` tool to use context-aware templates

**Notes:**

- Examples from planning doc:
  - Color: "Painted it {color} - fresh coat applied! 🎨", "Color swap complete! Looking good in {color}"
  - Position: "Scooted it over to ({x}, {y}) - perfect spot!", "Teleported to ({x}, {y}) ✨"
  - Rotation: "Spun it {rotation}° - nice angle!", "Gave it a {rotation}° twist! 🌀"
  - Size: "Resized to {width}×{height} - fits like a glove!"
- When multiple properties are updated, choose the most significant change to highlight
- Priority: position (most common) > color (visual impact) > size > rotation > other

---

### PR #4: Query & Status Message Templates

**Goal:** Add personality to canvas query responses and error messages

**Tasks:**

- [x] Add template function `getCanvasEmptyMessage(): string` with 3+ variations for empty canvas
- [x] Add template function `getObjectCountMessage(count: number): string` with different messages based on count (1, 2-5, 6-20, 21+)
- [x] Add template function `getNoSelectionMessage(): string` with 3+ variations for when no objects are selected
- [x] Add template function `getSelectionCountMessage(count: number): string` for selected object counts
- [x] Add template function `getObjectLockedMessage(lockerName: string): string` with 3+ variations for lock errors
- [x] Add template function `getObjectNotFoundMessage(): string` with 3+ variations for not found errors
- [x] Add template function `getBoundsErrorMessage(): string` with 3+ variations for out-of-bounds errors
- [x] Update `getCanvasObjects` tool to use appropriate template functions
- [x] Update error handling in `updateObject` tool to use template functions for lock/not-found errors
- [x] Update bounds validation helper to use `getBoundsErrorMessage()`

**What to Test:**

- Open chat on empty canvas - verify friendly empty message appears
- Create several objects, then ask: `"what's on the canvas?"` - verify count message has personality
- Try to update without selection: `"make it red"` (when nothing selected/created) - verify friendly no-selection message
- Try to modify a locked object (requires two users or manual Firestore edit) - verify friendly lock message
- Try to move object out of bounds: `"move it to 99999, 99999"` - verify friendly bounds error

**Files Changed:**

- `app/canvas/_lib/ai-responses.ts` - Add query and error template functions
- `app/canvas/_lib/ai-tools.ts` - Update `getCanvasObjects` and error handling to use templates

**Notes:**

- Examples from planning doc:
  - Empty canvas: "It's a blank slate! Ready to create something awesome?", "Canvas is empty - let's fill it with magic! ✨"
  - Object count: "You've got {count} objects on the canvas - quite the collection!"
  - No selection: "No objects are selected - please select one first or tell me which object to modify!"
  - Locked: "That object is locked by {lockerName} - they're working on it! Try selecting a different object."
  - Out of bounds: "Hmm, that's outside the canvas - let's keep it visible!"
- Make error messages helpful and friendly, not condescending
- Special milestone messages for 10, 50, 100+ objects to add celebration

---

### PR #5: Context-Aware Celebrations & Polish

**Goal:** Add dynamic celebrations for milestones and special context-aware enhancements

**Tasks:**

- [x] Add function `getMilestoneMessage(count: number): string | null` that returns celebration messages for milestones (10, 25, 50, 100 objects)
- [x] Update `getCanvasObjects` tool to append milestone message when appropriate
- [x] Add function `getMultipleCreationMessage(count: number, type: string): string` for when AI creates multiple objects at once
- [x] Add context-aware position descriptions (e.g., "center" when object is near canvas center, "top-left" when near origin)
- [x] Implement `getPositionDescription(x: number, y: number, canvasWidth: number, canvasHeight: number): string` helper
- [x] Update position-related messages to include friendly location descriptions (e.g., "Moved to top-right corner" instead of just coordinates)
- [x] Add special responses for exact center positioning (e.g., "Perfect! Dead center at ({x}, {y}) 🎯")
- [x] Test all milestone and celebration messages

**What to Test:**

- Create 10 objects total, then check canvas status - should see celebration message
- Create an object exactly at canvas center (usually 960, 540) - should see special center message
- Move object to corners or edges - verify friendly position descriptions appear
- Create 50+ objects and verify higher milestone messages appear

**Files Changed:**

- `app/canvas/_lib/ai-responses.ts` - Add milestone and context-aware helper functions
- `app/canvas/_lib/ai-tools.ts` - Integrate context-aware position descriptions and milestones

**Notes:**

- Examples from planning doc:
  - 10 objects: "We're on a roll! 10 objects and counting! 🎉"
  - 100 objects: "Whoa! 100 objects! This canvas is ALIVE! 🎪"
  - Center: "Perfect! Dead center at ({x}, {y}) 🎯"
  - Top-left: "Moved to the top-left corner ({x}, {y})"
- Don't overdo celebrations - only at specific milestones (10, 25, 50, 100)
- Position descriptions should be optional/contextual - don't force them if coordinates are already clear

---

### PR #6: Input Placeholder Variety

**Goal:** Add rotating fun placeholders to the chat input to match Sketchy's personality

**Tasks:**

- [x] Create array of placeholder messages in `app/canvas/_components/AIChatPanel.tsx`
- [x] Implement state to track current placeholder
- [x] Add effect to rotate placeholder every 5 seconds
- [x] Ensure placeholder rotation pauses when user is typing
- [x] Add at least 6 different placeholder variations

**What to Test:**

- Open AI chat panel and wait - placeholder should rotate every 5 seconds
- Start typing - placeholder should stop rotating
- Clear input - placeholder rotation should resume
- Verify all placeholders feel on-brand with Sketchy's personality

**Files Changed:**

- `app/canvas/_components/AIChatPanel.tsx` - Add rotating placeholder state and logic

**Notes:**

- Examples from planning doc:
  - "What should we create? 🎨"
  - "Tell me what you're thinking... 💭"
  - "Let's make something cool! ✨"
  - "Ready for your next idea... 🚀"
  - "Type a command or ask me anything!"
  - "What are we building today? 🎪"
- Current placeholder is static: "Type a command..."
- Use `useState` and `useEffect` with interval for rotation
- Pause rotation when `inputValue.length > 0`

---

## Summary

**Total Phases:** 1
**Total PRs:** 6
**Estimated Complexity:** Medium

**Key Dependencies:**

- No external dependencies needed
- All work is internal refactoring and enhancement
- Firebase/Firestore already configured and working
- AI chat API already functional

**Testing Strategy:**

- Manual testing with the AI chat panel for each PR
- Focus on variety - test same commands multiple times to see different responses
- Test edge cases (empty canvas, locked objects, out of bounds)
- Verify tone consistency across all message types

**Expected Outcome:**

By the end of Phase 3, Sketchy's responses will transform from clinical and boring:
- Before: "Created rectangle at (300, 200) with size 400×300"
- Before: "Updated object successfully"
- Before: "The canvas is empty. Would you like me to create something?"

To fun and conversational:
- After: "Boom! Dropped a 400×300 rectangle at (300, 200) - looking sharp! 📦"
- After: "Painted it red - fresh coat applied! 🎨"
- After: "It's a blank slate! Ready to create something awesome? ✨"

Users should feel like they're collaborating with a creative buddy, not issuing commands to a terminal.
