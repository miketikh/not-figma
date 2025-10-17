# AI Canvas Assistant - Implementation Task List

## Context

This task list implements Phase 1 of the AI Canvas Assistant feature, which allows users to create and manipulate canvas objects through natural language commands. Users will click an AI button to open a chat panel, type commands like "create a red circle at 100, 200", and see objects appear on the canvas in real-time.

The implementation uses the Vercel AI SDK with OpenAI's GPT models for natural language processing and tool calling. The AI will integrate with existing shape factories, Firestore operations, and the lock system—requiring minimal changes to core canvas logic. The chat panel slides in from the right side of the screen and maintains conversation history during the session.

Key architectural decisions: (1) Vercel AI SDK for simplest tool calling API with Zod validation, (2) Chat panel UI for non-disruptive workflow, (3) Auto-execute simple commands for magical UX, (4) Server-side API route to protect OpenAI API key. See `/Users/Gauntlet/gauntlet/not-figma/planning/ai-assistant-prd.md` for full technical details.

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

## Phase 1: Core AI Infrastructure & Basic Commands

### PR #1: Install Dependencies and Environment Setup

**Goal:** Set up required packages and environment variables for AI integration

**Tasks:**

- [x] Install Vercel AI SDK: `npm install ai @ai-sdk/openai zod`
- [x] Add `OPENAI_API_KEY=` to `.env.example` with comment explaining how to get API key
- [x] Verify `.env.local` is in `.gitignore`
- [x] Add comment in `.env.example` about OpenAI account requirements
- [x] Run `npm run lint` to ensure no issues

**What to Test:**

- Run `npm install` and verify no errors
- Check that `ai`, `@ai-sdk/openai`, and `zod` appear in `package.json` dependencies
- Confirm `.env.example` includes `OPENAI_API_KEY` with helpful comments

**Files Changed:**

- `package.json` - Add ai, @ai-sdk/openai, zod dependencies
- `package-lock.json` - Auto-generated lockfile changes
- `.env.example` - Add OPENAI_API_KEY variable with documentation

**Notes:**

- Use latest stable versions of dependencies
- Don't commit actual API key to repo
- User will need to create their own `.env.local` with real key

---

### PR #2: Extend AI Types and Canvas Store

**Goal:** Add TypeScript types for chat messages and extend Zustand store with AI state management

**Tasks:**

- [x] Review existing `types/ai.ts` to understand current structure
- [x] Add `AIChatMessage` type with fields: `id`, `role`, `content`, `timestamp`, `toolResults?`
- [x] Add `AIToolResult` type for tool execution feedback
- [x] Update `AIContext` type if needed for canvas context
- [x] Open `app/canvas/_store/canvas-store.ts`
- [x] Add AI slice to store with state: `aiChatOpen: boolean`, `chatHistory: AIChatMessage[]`
- [x] Add actions: `toggleAIChat()`, `addChatMessage(message)`, `clearChatHistory()`
- [x] Do NOT persist AI state to localStorage (keep chat session-only)

**What to Test:**

- Run `npm run lint` and verify no TypeScript errors
- Import canvas store in browser console and verify AI actions exist
- Call `toggleAIChat()` and verify state changes

**Files Changed:**

- `types/ai.ts` - Add AIChatMessage, AIToolResult types
- `app/canvas/_store/canvas-store.ts` - Add AI slice with state and actions

**Notes:**

- Chat history should not persist across page refreshes (intentional)
- Follow existing store patterns (immer, zustand/middleware)
- Keep AI slice separate from canvas logic for clean separation

---

### PR #3: Create Context Builder Helper

**Goal:** Build a helper that serializes canvas state into a concise summary for AI tool execution

**Tasks:**

- [x] Create file `app/canvas/_lib/ai-context.ts`
- [x] Export `buildCanvasContext(canvasId: string, userId: string, selectedIds: string[])` function
- [x] Function should return object with: `canvasId`, `userId`, `objectCount`, `selectedObjects`, `summary`
- [x] Fetch all objects using `getAllObjects()` from firestore.ts
- [x] For selected objects, include full details (id, type, position, size, colors)
- [x] For unselected objects, only include counts by type (e.g., "5 rectangles, 3 circles")
- [x] Keep total token usage low (aim for <500 tokens for context)
- [x] Add error handling for Firestore fetch failures

**What to Test:**

- Create test canvas with several objects
- Call `buildCanvasContext()` in console
- Verify returned object includes correct counts and selected object details
- Check that unselected objects are summarized, not fully detailed

**Files Changed:**

- `app/canvas/_lib/ai-context.ts` - NEW: Canvas context builder helper

**Notes:**

- This keeps AI prompts efficient by not sending full details of every object
- Selected objects get full details so AI can reference them precisely
- Summary format should be human-readable for AI to understand

---

### PR #4: Define AI Tools with Zod Schemas

**Goal:** Create tool definitions for shape creation and canvas queries using Vercel AI SDK

**Tasks:**

- [x] Create file `app/canvas/_lib/ai-tools.ts`
- [x] Import `tool` from `ai`, `z` from `zod`, shape factories from `shapes.ts`
- [x] Define `createRectangle` tool with parameters: x, y, width, height, fill?, stroke?, strokeWidth?, rotation?
- [x] Add Zod validation: x/y min 0, width/height min 5, rotation -180 to 180
- [x] Implement execute function: call rectangleFactory + createObject from firestore.ts
- [x] Return `{ success: true, id: string, message: string }` format
- [x] Define `createCircle` tool with parameters: x, y, radius, fill?, stroke?, strokeWidth?
- [x] Convert radius to radiusX/radiusY (same value for perfect circle)
- [x] Define `createLine` tool with parameters: x1, y1, x2, y2, stroke?, strokeWidth?
- [x] Define `createText` tool with parameters: x, y, content, fontSize?, fontFamily?, fill?
- [x] Define `updateObject` tool with parameters: objectId, properties object
- [x] In updateObject execute, check `canEdit()` before calling `updateObject()`
- [x] Define `getCanvasObjects` tool with parameter: filter? (all|selected)
- [x] In getCanvasObjects execute, call `buildCanvasContext()` and return object list
- [x] Add error handling in all execute functions (try/catch with descriptive messages)
- [x] Export object containing all tools: `export const aiTools = { createRectangle, ... }`

**What to Test:**

- Import `aiTools` in Node.js console
- Verify each tool has `description`, `parameters`, `execute` properties
- Call execute functions directly with mock context to verify they work
- Test error cases (negative coordinates, invalid object IDs)

**Files Changed:**

- `app/canvas/_lib/ai-tools.ts` - NEW: AI tool definitions with Zod schemas

**Notes:**

- Each tool execute function receives context with userId and canvasId
- Use existing shape factories—don't reimplement shape creation logic
- Tool descriptions should be clear for AI to understand when to use each
- See PRD Appendix for detailed tool signature examples

---

### PR #5: Create API Route with Vercel AI SDK

**Goal:** Build Next.js API route that processes AI chat requests and executes tools

**Tasks:**

- [x] Create file `app/api/ai/chat/route.ts`
- [x] Import `generateText` from `ai`, `openai` from `@ai-sdk/openai`
- [x] Import `aiTools` from `app/canvas/_lib/ai-tools.ts`
- [x] Create POST handler: `export async function POST(req: Request)`
- [x] Parse request body: `{ message: string, canvasId: string, selectedIds: string[] }`
- [x] Verify Firebase auth token from `req.headers.get('authorization')`
- [x] Extract userId from decoded token
- [x] Build canvas context using `buildCanvasContext(canvasId, userId, selectedIds)`
- [x] Create system prompt: "You are an AI assistant for a design canvas. Help users create and modify shapes..."
- [x] Include canvas context in system prompt
- [x] Call `generateText()` with model `openai('gpt-3.5-turbo')`, tools, maxSteps: 3
- [x] Pass user message and conversation history
- [x] Extract tool results from response
- [x] Return JSON: `{ message: string, toolResults: AIToolResult[] }`
- [x] Add error handling: catch API errors, auth failures, validation errors
- [x] Add rate limiting check (simple in-memory map: userId -> request count/timestamp)
- [x] Limit to 10 requests per minute per user

**What to Test:**

- Start dev server with valid OPENAI_API_KEY in .env.local
- Use Postman/curl to POST to `/api/ai/chat` with test message
- Verify auth token is required (test with missing/invalid token)
- Verify tool execution works (send "create a red circle at 100, 200")
- Check rate limiting by sending 11 requests rapidly
- Test error handling (invalid canvasId, tool execution failures)

**Files Changed:**

- `app/api/ai/chat/route.ts` - NEW: AI chat API route handler

**Notes:**

- API key is server-side only, never exposed to client
- Rate limiting prevents abuse and cost runaway
- Use gpt-3.5-turbo for cost optimization (can upgrade to gpt-4 later)
- maxSteps: 3 allows AI to query canvas then act on results

---

### PR #6: Create Chat Panel UI Component

**Goal:** Build slide-out chat interface for AI conversations

**Tasks:**

- [x] Create file `app/canvas/_components/AIChatPanel.tsx`
- [x] Component should read `aiChatOpen` state from canvas store
- [x] Render panel as fixed position div, right side, 400px wide, full height
- [x] Add slide-in animation (translate-x) using Tailwind transitions
- [x] Include close button (X icon from lucide-react) at top-right
- [x] Close button calls `toggleAIChat()` from store
- [x] Add header with title "AI Assistant" and sparkles icon
- [x] Create scrollable message list container with auto-scroll to bottom
- [x] Render each message with role-based styling (user: right-aligned blue, assistant: left-aligned gray)
- [x] Show timestamp for each message (format: "HH:mm")
- [x] Display tool results as expandable cards (show success/failure, object IDs created)
- [x] Add text input at bottom with send button
- [x] Input should be controlled component with local state
- [x] Show loading indicator when AI is processing (disable input, show spinner)
- [x] Add keyboard handler: Enter to send message, Escape to close panel
- [x] Prevent Enter from adding newline (use onKeyDown, check for Enter without Shift)
- [x] Add welcome message on first open: "Hi! I'm your AI assistant. Try commands like..."
- [x] Style with Tailwind classes matching existing UI patterns
- [x] Add subtle backdrop blur when panel is open

**What to Test:**

- Click AI button to open panel (assumes PR #8 is done)
- Verify panel slides in smoothly from right
- Click close button and verify panel closes
- Press Escape key and verify panel closes
- Type message in input and verify it appears in message list
- Check that message list auto-scrolls when new messages appear
- Verify loading state shows spinner and disables input

**Files Changed:**

- `app/canvas/_components/AIChatPanel.tsx` - NEW: Chat panel UI component

**Notes:**

- Panel should overlay canvas, not push it aside
- Use z-index higher than canvas but lower than modals
- Welcome message should only show on first open per session
- Follow existing component patterns from PropertiesPanel if similar

---

### PR #7: Create Chat Hook and State Management

**Goal:** Build React hook that handles sending messages and updating chat state

**Tasks:**

- [x] Create file `app/canvas/_hooks/useAIChat.ts`
- [x] Export `useAIChat()` hook
- [x] Hook should access canvas store (selectedIds, current canvasId)
- [x] Create `sendMessage(text: string)` function
- [x] Function should add user message to store immediately (optimistic update)
- [x] Set loading state to true
- [x] Get Firebase auth token using `useAuth()` hook
- [x] Build request body: `{ message: text, canvasId, selectedIds }`
- [x] POST to `/api/ai/chat` with Authorization header
- [x] Parse response and add AI message to store
- [x] Set loading state to false
- [x] Handle errors: show error message in chat, log to console
- [x] Return object with: `sendMessage`, `isLoading`, `error`
- [x] Add retry logic for network failures (exponential backoff, max 3 retries)
- [x] Add timestamp to each message (Date.now())

**What to Test:**

- Use hook in console or test component
- Call sendMessage with test text
- Verify user message appears immediately
- Verify loading state updates correctly
- Verify AI response appears after API call completes
- Test error handling (disconnect network, send invalid message)
- Test retry logic (intermittent network failure)

**Files Changed:**

- `app/canvas/_hooks/useAIChat.ts` - NEW: Chat interaction hook

**Notes:**

- Hook should handle all API communication and error states
- Optimistic update makes UI feel responsive
- Retry logic improves reliability on poor connections
- Auth token must be included in request headers

---

### PR #8: Add AI Button and Wire Everything Together

**Goal:** Add AI assistant button to UI and integrate all components

**Tasks:**

- [x] Open `app/canvas/_components/Toolbar.tsx` (or create separate AIButton component)
- [x] Add AI button with Sparkles icon from lucide-react
- [x] Button should call `toggleAIChat()` from canvas store
- [x] Add tooltip: "AI Assistant (A)"
- [x] Position button at end of toolbar or in top-right corner
- [x] Add active state styling when chat is open
- [x] Add keyboard shortcut: "A" key toggles chat
- [x] Open `app/canvas/page.tsx` or main Canvas layout file
- [x] Import and render `<AIChatPanel />` component
- [x] Verify component only renders when `aiChatOpen` is true
- [x] Test integration: click button -> panel opens -> send message -> see response
- [x] Verify AI-created objects appear on canvas in real-time
- [x] Add animation/transition for smooth panel open/close

**What to Test:**

- Open canvas page
- Click AI button (or press "A") and verify panel opens
- Type "create a red circle at 200, 200" and press Enter
- Verify AI response appears in chat
- Verify red circle appears on canvas at correct position
- Click close button and verify panel closes
- Press "A" again to reopen
- Test with multiple commands in sequence
- Test "make it blue" after selecting a circle
- Test "what's on the canvas?" query command

**Files Changed:**

- `app/canvas/_components/Toolbar.tsx` - Add AI assistant button
- `app/canvas/page.tsx` - Import and render AIChatPanel component

**Notes:**

- This PR connects all previous PRs into working feature
- Test thoroughly as this is the main user-facing integration
- Keyboard shortcut should not conflict with existing shortcuts
- Panel should not interfere with other canvas operations

---

### PR #9: Error Handling and Edge Cases

**Goal:** Handle edge cases and improve error messages for better UX

**Tasks:**

- [x] Add lock conflict handling to updateObject tool
- [x] If `canEdit()` returns false, return descriptive error: "Cannot modify - object is locked by [username]"
- [x] Add validation for canvas bounds in all creation tools
- [x] Prevent objects from being created at extreme coordinates (< 0 or > 10000)
- [x] Handle empty canvas case in getCanvasObjects tool
- [x] Return friendly message: "The canvas is empty. Would you like me to create something?"
- [x] Improve ambiguous command handling
- [x] If user says "make it red" with no selection, AI should prompt: "Please select an object first"
- [x] Add retry logic in API route for OpenAI API failures
- [x] Catch timeout errors and return user-friendly message
- [x] Add validation for color inputs (accept CSS colors, hex codes, RGB)
- [x] Add helpful error messages for invalid colors
- [x] Test all error scenarios and refine messages
- [x] Add loading timeout (30 seconds) to prevent infinite loading states
- [x] Show error message if API doesn't respond within timeout
- [x] Add console logging for debugging (log tool executions, errors)

**What to Test:**

- Try to modify object locked by another user (open two browser windows)
- Send command with invalid coordinates (negative or very large numbers)
- Send "make it red" without selecting anything
- Test with empty canvas: "what's on the canvas?"
- Disconnect internet and send message (should show error)
- Test timeout by simulating slow API response
- Try invalid colors: "make it blurple"
- Verify all error messages are clear and actionable

**Files Changed:**

- `app/canvas/_lib/ai-tools.ts` - Add validation and error handling to tools
- `app/api/ai/chat/route.ts` - Add retry logic and timeout handling
- `app/canvas/_hooks/useAIChat.ts` - Add timeout and improved error states
- `app/canvas/_components/AIChatPanel.tsx` - Display error messages clearly

**Notes:**

- Good error messages are critical for AI UX
- Users should always understand why something failed
- Retry logic makes feature more reliable
- Lock system integration prevents collaboration conflicts

---

### PR #10: Testing, Polish, and Documentation

**Goal:** Final testing, UI polish, and user-facing documentation

**Tasks:**

- [x] Test all basic commands from PRD (create shapes, update properties, query canvas)
- [x] Test multi-step commands (AI queries canvas then creates objects)
- [x] Verify real-time sync works (multiple users, AI-created objects appear for everyone)
- [x] Test keyboard shortcuts don't conflict with existing shortcuts
- [x] Improve welcome message in chat panel with 3-4 example commands
- [x] Add loading animation polish (smooth transitions, no flicker)
- [x] Verify chat panel responsiveness on smaller screens
- [x] Test edge cases: very long messages, rapid command sending, network interruptions
- [x] Update README.md with AI assistant section
- [x] Document OpenAI API key setup instructions
- [x] Document example commands users can try
- [x] Add code comments to complex functions (tool execute functions, context builder)
- [x] Run full lint and format: `npm run lint && npm run format`
- [x] Test with fresh .env.local setup (follow README instructions)
- [ ] Create quick demo video or GIF of feature in action (optional)

**What to Test:**

- Follow README setup instructions from scratch
- Test all example commands from documentation
- Open multiple browser tabs and test collaboration
- Try creative/complex commands not in documentation
- Test on different screen sizes
- Verify no console errors or warnings
- Check that all TypeScript types are correct (no `any` types)

**Files Changed:**

- `README.md` - Add AI assistant documentation and setup instructions
- `app/canvas/_lib/ai-tools.ts` - Add code comments
- `app/canvas/_lib/ai-context.ts` - Add code comments
- Various files - Minor polish and cleanup

**Notes:**

- This PR focuses on quality and documentation
- No major feature additions—just polish and testing
- README should be clear enough for new users to set up feature
- Consider recording demo for future reference

---

## Summary

**Total Phases:** 1 (Phase 1 - MVP)
**Total PRs:** 10
**Estimated Complexity:** Medium-High

**Key Dependencies:**

- OpenAI API account with valid API key
- Node.js 18+ for Vercel AI SDK
- Existing Firebase setup (Firestore, Auth)
- Shape factories and canvas store already implemented

**Phase 1 Deliverables:**

- Users can open AI chat panel via button or keyboard shortcut
- Users can create shapes via natural language (rectangle, circle, line, text)
- Users can update existing objects ("make it blue")
- Users can query canvas state ("what's on the canvas?")
- AI respects lock system and real-time collaboration
- Clear error messages for all failure cases
- Complete documentation in README

**Post-Phase 1 Next Steps (Future):**

- Phase 2: Complex pattern generation (login forms, layouts)
- Phase 2: Group metadata for multi-object creations
- Phase 3+: Voice-to-text integration
- Phase 3+: AI-generated templates and advanced features

**Cost Considerations:**

- Phase 1 uses GPT-3.5-turbo: ~$0.001-0.005 per command
- Rate limiting: 10 commands/minute per user
- Estimated cost: <$1/user/month at moderate usage
- Can upgrade to GPT-4 for better performance if needed
