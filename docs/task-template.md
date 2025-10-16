# [Feature Name] - Task List

## Context

[Brief description of what changes are being made - just enough to understand the basic problem and approach. Keep to 1-2 paragraphs maximum.]

---

## Process for AI

When working through this task list:

1. **Start a PR**: Read all tasks in the PR before beginning
2. **Complete all tasks**: Work through each task sequentially and check them off with `[x]`
3. **Run lint**: Execute `npm run lint` after completing all tasks in the PR
4. **Provide summary**: Give a summary in chat that includes:
   - What changes were made in this PR
   - What the user can see or test manually in the app
   - Brief summary of what will be added in the next PR
5. **Wait for confirmation**: Do not proceed to the next PR until user confirms

---

## Examples of Good PRs

### Example 1: Simple Feature Addition

**PR #15: Additional Shape Types - Circles**
**Goal:** Add circle shape type

**Tasks:**
- [x] Extend object types for circles
- [x] Add circle to Toolbar
- [x] Implement circle creation logic
- [x] Implement circle rendering
- [x] Add circle selection and manipulation
- [x] Test circle creation, move, resize
- [x] Sync circles across users

**Files Changed:**
- `app/canvas/_components/shapes/CircleShape.tsx` - NEW component for rendering circles
- `app/canvas/_components/properties/shape-properties/CircleProperties.tsx` - NEW properties panel for circles
- `app/canvas/_types/shapes.ts` - Add PersistedCircle type
- `app/canvas/_lib/shapes.ts` - Add circle factory functions
- `app/canvas/_components/Toolbar.tsx` - Add circle button
- `app/canvas/_components/Canvas.tsx` - Handle circle creation and rendering

---

### Example 2: Complex Feature with Multiple Steps

**PR #9: Real-Time Object Sync**
**Goal:** Sync objects between multiple users in real-time

**Tasks:**
- [x] Set up Firestore real-time listener for objects
- [x] Implement optimistic updates for object creation
- [x] Broadcast object creation to other users
- [x] Render objects created by other users
- [x] Implement optimistic updates for object moves
- [x] Broadcast object position changes
- [x] Sync position changes from other users
- [x] Implement optimistic updates for resize
- [x] Broadcast and sync resize operations
- [x] Implement lock-based conflict prevention
- [x] Test with 2 users in different browsers
- [x] Verify sync latency <100ms

**Files Changed:**
- `app/canvas/_hooks/useObjects.ts` - Add real-time sync + lock visual feedback
- `app/canvas/_components/Canvas.tsx` - Add lock acquisition/release on selection
- `lib/firebase/firestore.ts` - Lock functions already existed

---

## Phase 1: [Phase Name]

### PR #1: [PR Name]
**Goal:** [One sentence describing what this PR accomplishes]

**Tasks:**
- [ ] [Specific task 1]
- [ ] [Specific task 2]
- [ ] [Specific task 3]
- [ ] [etc.]

**Files Changed:**
- `path/to/file1.ts` - [description of changes]
- `path/to/file2.tsx` - [description of changes]
- `path/to/file3.ts` - [description of changes]

---

### PR #2: [PR Name]
**Goal:** [One sentence describing what this PR accomplishes]

**Tasks:**
- [ ] [Specific task 1]
- [ ] [Specific task 2]
- [ ] [Specific task 3]

**Files Changed:**
- `path/to/file1.ts` - [description of changes]
- `path/to/file2.tsx` - [description of changes]

---

## Phase 2: [Phase Name]

### PR #3: [PR Name]
**Goal:** [One sentence describing what this PR accomplishes]

**Tasks:**
- [ ] [Specific task 1]
- [ ] [Specific task 2]
- [ ] [Specific task 3]

**Files Changed:**
- `path/to/file1.ts` - [description of changes]
- `path/to/file2.tsx` - [description of changes]

---

### PR #4: [PR Name]
**Goal:** [One sentence describing what this PR accomplishes]

**Tasks:**
- [ ] [Specific task 1]
- [ ] [Specific task 2]
- [ ] [Specific task 3]

**Files Changed:**
- `path/to/file1.ts` - [description of changes]
- `path/to/file2.tsx` - [description of changes]

---

## Summary

**Total Phases:** [Number]
**Total PRs:** [Number]
