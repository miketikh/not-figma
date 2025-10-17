# [Feature Name] - Implementation Task List

## Context

[Brief description of what changes are being made - just enough to understand the problem and solution. Keep to 2-3 paragraphs maximum. Include any key architectural decisions or patterns being used.]

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

## Example PR Structure

### PR #15: Add Circle Shape Support

**Goal:** Enable users to create and manipulate circle shapes on canvas

**Tasks:**

- [x] Add CircleShape type to shape type definitions
- [x] Create CircleShape component for rendering
- [x] Add circle button to Toolbar with appropriate icon
- [x] Implement circle creation handler in Canvas
- [x] Add circle manipulation (move, resize, rotate)
- [x] Create CircleProperties panel for circle-specific settings
- [x] Implement real-time sync for circles

**What to Test:**

- Click circle button in toolbar
- Draw a circle on canvas by clicking and dragging
- Select circle and verify you can move, resize, and rotate it
- Open another browser window and verify circles sync in real-time
- Check that circle properties panel shows correct options

**Files Changed:**

- `app/canvas/_components/shapes/CircleShape.tsx` - NEW: Circle rendering component
- `app/canvas/_components/properties/CircleProperties.tsx` - NEW: Circle settings panel
- `app/canvas/_types/shapes.ts` - Add PersistedCircle type definition
- `app/canvas/_lib/shapes.ts` - Add circle factory and helper functions
- `app/canvas/_components/Toolbar.tsx` - Add circle creation button
- `app/canvas/_components/Canvas.tsx` - Handle circle creation, selection, manipulation

**Notes:**

- Follow the same pattern as RectangleShape for consistency
- Circles should support all standard operations (move, resize, delete, sync)

---

## Phase 1: [Phase Name & Purpose]

### PR #1: [Descriptive PR Name]

**Goal:** [One sentence describing what this accomplishes and why it's needed]

**Tasks:**

- [ ] [Specific, testable task - use action verbs]
- [ ] [Each task should be completable independently]
- [ ] [If a task is complex, consider breaking it into sub-tasks]
- [ ] [Include testing as explicit tasks when needed]

**What to Test:**
[Clear, step-by-step instructions for manual testing]

- Open [specific page/view]
- Perform [specific action]
- Verify [expected result]

**Files Changed:**

- `path/to/file1.ts` - [Brief description of what changes, not how]
- `path/to/file2.tsx` - [e.g., "Add new component" or "Update handler logic"]
- `path/to/file3.ts` - NEW: [indicate if file is being created]

**Notes:** [Optional - any gotchas, edge cases, or context the AI should know]

---

### PR #2: [Descriptive PR Name]

**Goal:** [What this accomplishes]

**Tasks:**

- [ ] [Task 1]
- [ ] [Task 2]
- [ ] [Task 3]

**What to Test:**

- [Testing instruction 1]
- [Testing instruction 2]

**Files Changed:**

- `path/to/file.ts` - [description]

---

## Phase 2: [Phase Name & Purpose]

### PR #3: [Descriptive PR Name]

**Goal:** [What this accomplishes]

**Tasks:**

- [ ] [Task 1]
- [ ] [Task 2]

**What to Test:**

- [Testing instruction 1]

**Files Changed:**

- `path/to/file.ts` - [description]

---

## Summary

**Total Phases:** [Number]
**Total PRs:** [Number]
**Estimated Complexity:** [Low/Medium/High]

**Key Dependencies:**

- [Any external dependencies or prerequisites]
- [Services that need to be running]
- [Feature flags or environment variables needed]
