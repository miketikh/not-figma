# AI Canvas Assistant - Product Requirements Document

**Status:** Ready for Implementation
**Date:** 2025-10-17
**Version:** 1.0

---

## 1. Feature Overview

### What We're Building

An AI-powered assistant that allows users to create and manipulate canvas objects through natural language commands. Users will activate an "AI mode" via a button in the UI, type commands in a chat interface, and the AI will execute canvas operations in real-time.

### Why We're Building It

- **Speed:** Users can create complex layouts (e.g., "create a login form") much faster than manually creating individual shapes
- **Accessibility:** Natural language interface makes canvas operations more intuitive
- **Innovation:** Differentiates Not-Figma from traditional design tools
- **Future Foundation:** Sets up voice-to-text and advanced AI features (Phase 3+)

### Scope

- **Phase 1 (MVP):** Basic shape commands (create, update, query canvas objects)
- **Phase 2:** Complex pattern generation (login forms, layouts) with grouping metadata
- **Phase 3+:** Voice-to-text, AI-generated templates, batch operations

---

## 2. Current State Analysis

### Existing Architecture (Relevant Components)

#### Shape System

**Files:** `app/canvas/_lib/shapes.ts`

- Mature factory pattern for rectangle, circle, line, text
- Each factory has `createDefault()`, `toFirestore()`, `fromFirestore()`, `validateSize()`
- **Leverage:** AI tools will call these factories directly to create objects
- **Changes needed:** None - AI wraps existing factories

#### Firestore Integration

**Files:** `lib/firebase/firestore.ts`

- CRUD operations: `createObject()`, `updateObject()`, `deleteObject()`, `getAllObjects()`
- Real-time subscriptions via `subscribeToObjects()`
- Lock management: `acquireLock()`, `releaseLock()`, `canEdit()`
- **Leverage:** AI execute functions will call these directly
- **Changes needed:** None for Phase 1

#### Canvas Store (Zustand)

**Files:** `app/canvas/_store/canvas-store.ts`

- Manages viewport, active tool, drawing state, default shape properties
- Uses `zustand/persist` for localStorage
- **Changes needed:** Add AI state slice (chat history, AI mode active)

#### Toolbar

**Files:** `app/canvas/_components/Toolbar.tsx`

- Simple tool button component with tooltips
- Currently has 6 tools: select, pan, rectangle, circle, line, text
- **Changes needed:** Add AI assistant button (not a tool, but a mode toggle)

#### Type Definitions

**Files:** `types/ai.ts` (already exists!), `types/canvas.ts`

- `types/ai.ts` has preliminary AI types: `AICommand`, `AIFunction`, `AIContext`
- **Changes needed:** Extend for Vercel AI SDK, add chat message types

### Files That Will Need Changes

| File                                              | Change Type      | Description                                           |
| ------------------------------------------------- | ---------------- | ----------------------------------------------------- |
| `package.json`                                    | Add dependencies | Install `ai`, `@ai-sdk/openai`, `zod`                 |
| `types/ai.ts`                                     | Extend           | Add chat message types, update for Vercel AI SDK      |
| `app/canvas/_store/canvas-store.ts`               | Add slice        | AI mode state, chat history                           |
| `app/canvas/_components/Toolbar.tsx`              | Minor addition   | Add AI button (or create separate AIButton component) |
| **NEW:** `app/canvas/_components/AIChatPanel.tsx` | Create           | Slide-out chat interface                              |
| **NEW:** `app/canvas/_lib/ai-tools.ts`            | Create           | Tool definitions using Vercel AI SDK `tool()` helper  |
| **NEW:** `app/canvas/_lib/ai-context.ts`          | Create           | Build canvas context for AI (serialize objects)       |
| **NEW:** `app/canvas/_hooks/useAIChat.ts`         | Create           | Hook for sending messages, managing state             |
| **NEW:** `app/api/ai/chat/route.ts`               | Create           | Next.js API route for AI requests                     |
| `.env.local`                                      | Add variable     | `OPENAI_API_KEY`                                      |

### Existing Patterns We Can Leverage

1. **Shape Factories:** Direct integration point for AI commands
2. **Lock System:** AI respects existing locks via `canEdit()` checks
3. **Real-time Sync:** AI-created objects automatically appear for all users via Firestore listeners
4. **Toolbar Pattern:** Consistent UI for adding AI button
5. **Zustand Store:** Proven pattern for state management (extend with AI slice)

### Potential Conflicts & Dependencies

**Lock System Interaction:**

- AI must check `canEdit(object, userId)` before modifying objects
- If object is locked by another user, AI should return error message to chat
- No code changes needed - just integration point

**Real-time Collaboration:**

- AI-created objects appear instantly for all collaborators
- Could be confusing if User A's AI creates objects that User B sees suddenly
- **Mitigation:** Phase 2 can add "AI is generating..." broadcast to other users

**Properties Panel:**

- Chat panel slides from right (similar to properties panel position)
- **Decision:** Chat panel takes priority when open, properties panel closes
- Alternative: Stack them or make chat panel narrower

**Multi-select (In Progress):**

- AI update commands might target multiple objects
- Phase 1: AI updates one object at a time by ID
- Phase 2+: Integrate with multi-select system when ready

---

## 3. Implementation Approach

### Phase 1: Core AI Infrastructure & Basic Commands

**Goal:** Users can create individual shapes and query canvas via AI chat

#### Backend First

1. **Install Dependencies**

   ```bash
   npm install ai @ai-sdk/openai zod
   ```

2. **Create API Route** (`app/api/ai/chat/route.ts`)
   - Next.js Route Handler
   - Uses Vercel AI SDK `generateText()` with tool calling
   - Calls OpenAI GPT-4 (or GPT-3.5-turbo for cost optimization)
   - Returns structured tool results

3. **Define AI Tools** (`app/canvas/_lib/ai-tools.ts`)
   - Tools for Phase 1:
     - `createRectangle(x, y, width, height, fill?, stroke?, ...)`
     - `createCircle(x, y, radius, fill?, stroke?, ...)`
     - `createLine(x1, y1, x2, y2, stroke?, strokeWidth?, ...)`
     - `createText(x, y, content, fontSize?, fontFamily?, ...)`
     - `updateObject(objectId, properties)` - modify existing object
     - `getCanvasObjects(filter?)` - query canvas state
   - Each tool execute function:
     - Validates input
     - Calls shape factory + Firestore functions
     - Returns success/failure with object IDs

4. **Build Context Helper** (`app/canvas/_lib/ai-context.ts`)
   - `buildCanvasContext(canvasId, selectedIds)` → summary for AI
   - Returns: object counts, selected objects, viewport info
   - Keeps token usage low (no full object details unless selected)

#### Frontend Integration

5. **Extend Types** (`types/ai.ts`)
   - `AIChatMessage` type for chat UI
   - `AIToolResult` for displaying tool execution feedback

6. **Add AI State to Store** (`app/canvas/_store/canvas-store.ts`)
   - New slice: `aiChatOpen: boolean`, `chatHistory: AIChatMessage[]`
   - Actions: `toggleAIChat()`, `addChatMessage()`, `clearChatHistory()`

7. **Create Chat Panel** (`app/canvas/_components/AIChatPanel.tsx`)
   - Slide-in panel from right side (300-400px wide)
   - Message list (scrollable, auto-scroll to bottom)
   - Text input with send button
   - Loading states during AI processing
   - Close button / Escape key handler

8. **Create Chat Hook** (`app/canvas/_hooks/useAIChat.ts`)
   - `sendMessage(text)` → calls `/api/ai/chat` route
   - Manages loading state
   - Appends user/AI messages to store
   - Error handling

9. **Add AI Button**
   - Option A: Extend `Toolbar.tsx` with AI button
   - Option B: Create separate `AIAssistantButton.tsx` component
   - Position: Could be in toolbar OR top-right corner
   - Icon: Sparkles/stars (lucide-react `Sparkles` icon)
   - Toggles `aiChatOpen` state

#### Testing & Polish

10. **Environment Setup**
    - Add `OPENAI_API_KEY` to `.env.local`
    - Document in README

11. **Test Commands**
    - "create a red circle at 100, 200"
    - "add a rectangle at 50, 50 that's 200 by 100 pixels"
    - "make it blue" (after selecting object)
    - "what's on the canvas?"

### Phase 2: Complex Patterns & Grouping Metadata

**Goal:** Users can generate multi-object layouts ("create a login form")

#### Extend Tool Definitions

1. **Add Group Metadata Support**
   - When AI creates multiple objects for one command, tag with `aiGeneratedGroup: 'group-uuid'`
   - Extend `CanvasObject` type with optional `aiGeneratedGroup?: string` field
   - Allows future features to treat grouped objects as units

2. **Create Pattern Library** (`app/canvas/_lib/ai-patterns.ts`)
   - Pre-defined patterns: login form, button, card, navigation bar
   - Functions that return arrays of object configs
   - AI can call these as tools or use as examples in system prompt

3. **Add Bulk Creation Tool**
   - `createObjects(objects: ObjectConfig[], groupId?: string)`
   - Atomic operation (all succeed or all fail)
   - Uses Firestore batch writes for performance

#### Prompt Engineering

4. **Enhance System Prompt**
   - Teach AI about common UI patterns
   - Provide spacing guidelines (e.g., 16px margins)
   - Include examples of complex commands

5. **Add Multi-Step Support**
   - Increase `maxSteps` parameter in API route
   - Allows AI to call `getCanvasObjects()` then position new objects intelligently

### Phase 3+: Voice, Templates, Advanced Features

**Future scope - not part of initial PRD**

- Voice-to-text using OpenAI Whisper API
- AI-generated templates (import external designs)
- Batch operations ("make all circles red")
- Natural language queries ("describe this design")

---

### Key Technical Decisions

#### Decision 1: Vercel AI SDK

**Rationale:**

- Native Next.js integration (built by Vercel)
- Simplest tool calling API with Zod schemas
- Built-in multi-step execution (`maxSteps`)
- Multi-provider support (easy to add Claude/Anthropic later)
- Best-in-class structured output (`generateObject`, `streamObject`)
  **Alternative Considered:** OpenAI SDK (more boilerplate), LangChain (over-engineered)

#### Decision 2: Chat Panel UI (Option A from planning)

**Rationale:**

- Non-disruptive to workflow
- Maintains visual connection to canvas
- Fits existing toolbar/panel patterns
- Allows iterative refinement ("make it bigger")
  **Alternative Considered:** Modal overlay (too disruptive), command bar (not conversational)

#### Decision 3: Metadata Grouping (Phase 2)

**Rationale:**

- Unblocks complex pattern generation without building full grouping feature
- Lightweight - just add `aiGeneratedGroup` field to objects
- Future-proof - can migrate to proper grouping system later
  **Alternative Considered:** Build full grouping system first (too much scope)

#### Decision 4: Auto-Execute Simple Commands

**Rationale:**

- 1-2 object commands feel magical and fast
- Users can undo (when undo system is built) or manually delete
- Reduces friction for simple tasks
  **Note:** Phase 2 may add confirmation for complex commands (3+ objects)

---

### UX Flow

#### Activating AI Mode

1. User clicks AI assistant button (sparkles icon) in UI
2. Chat panel slides in from right side (300-400px wide, overlays canvas)
3. Welcome message appears:
   > "Hi! I'm your AI assistant. Try commands like:
   > • Create a red circle at 100, 200
   > • Add a rectangle 200 by 100
   > • What's on the canvas?"

#### Executing Simple Command

1. User types: "create a blue rectangle at position 50, 50"
2. Message appears in chat (user bubble)
3. Loading indicator shows ("AI is thinking...")
4. AI response appears: "Created a blue rectangle at (50, 50) with dimensions 200×100"
5. Rectangle appears on canvas immediately
6. User sees success indicator

#### Executing Complex Command (Phase 2)

1. User types: "create a login form"
2. AI asks clarifying question: "What style? (Material, Minimal, or Classic)"
3. User responds: "minimal"
4. AI generates:
   - 2 text input fields (username, password)
   - 1 button ("Login")
   - 1 text label ("Sign In")
5. All objects appear together, properly spaced, grouped with metadata
6. AI responds: "Created a minimal login form with 4 elements"

#### Error Handling Flow

1. User types: "make it red"
2. No object selected → AI responds: "I don't see any object selected. Please select an object first or specify which one to modify."
3. User selects rectangle, tries again
4. AI updates rectangle fill to red
5. Success message: "Changed fill color to red"

#### Collaboration Scenario

1. User A activates AI, types: "create three circles"
2. AI creates circles in User A's canvas
3. User B sees circles appear in real-time (normal Firestore sync)
4. User B sees standard presence indicators (no special AI indication in Phase 1)
5. Phase 2+: Could add "AI is generating for User A" broadcast

---

## 4. Considerations

### Edge Cases to Handle

**1. Locked Objects**

- **Scenario:** AI tries to modify object locked by another user
- **Handling:** Check `canEdit(object, userId)` before updates
- **Response:** "Cannot modify this object - it's being edited by [Username]"

**2. Invalid Positions**

- **Scenario:** User requests object at negative coordinates or extreme values
- **Handling:** Tool parameter validation with Zod (min/max constraints)
- **Response:** "Invalid position. Coordinates must be positive and within canvas bounds."

**3. Ambiguous Commands**

- **Scenario:** "make it bigger" with no selection
- **Handling:** AI calls `getCanvasObjects('selected')` first, sees empty result
- **Response:** "Please select an object first, or tell me which one to modify."

**4. Non-existent Object IDs**

- **Scenario:** AI hallucinates an object ID that doesn't exist
- **Handling:** Firestore `updateObject()` fails, tool returns error
- **Response:** AI retries with `getCanvasObjects()` to get correct IDs

**5. API Rate Limits**

- **Scenario:** User spams commands too quickly
- **Handling:** Backend rate limiting (per-user, per-minute)
- **Response:** "Slow down! Please wait a few seconds between commands."

**6. API Failures**

- **Scenario:** OpenAI API timeout or 500 error
- **Handling:** Frontend retry button, backend error logging
- **Response:** "Sorry, I encountered an error. Please try again."

**7. Empty Canvas**

- **Scenario:** User asks "what's on the canvas?" on blank canvas
- **Handling:** `getCanvasObjects()` returns empty array
- **Response:** "The canvas is empty. Would you like me to create something?"

**8. Color Ambiguity**

- **Scenario:** User says "make it red" - which red?
- **Handling:** System prompt provides default colors (CSS names)
- **Response:** Uses `#FF0000` or `red` (CSS standard)
- **Enhancement (Phase 2):** Ask clarifying question with color picker

**9. Overlapping Objects**

- **Scenario:** AI creates objects at same position
- **Handling:** Each object gets incremental zIndex
- **Response:** Objects stack predictably

**10. Large Object Counts**

- **Scenario:** Canvas has 500+ objects, context exceeds token limits
- **Handling:** Context builder sends summary only (counts, selected objects)
- **Alternative:** Filter by viewport bounds (only send visible objects)

### Potential Risks & Technical Challenges

**Risk 1: Prompt Injection**

- **Description:** User tries malicious inputs to break AI or access system
- **Mitigation:**
  - Zod validation on all tool parameters
  - Server-side checks before Firestore writes
  - OpenAI's built-in content moderation
- **Severity:** Medium (primarily impacts user's own canvas)

**Risk 2: Cost Runaway**

- **Description:** High token usage from complex commands or large context
- **Mitigation:**
  - Rate limiting (10 commands/minute per user)
  - Context summarization (don't send full object details)
  - Use GPT-3.5-turbo for simple commands, GPT-4 for complex
  - Monitor usage with OpenAI dashboard
- **Severity:** High (financial impact)

**Risk 3: AI Hallucination**

- **Description:** AI returns incorrect object IDs or properties
- **Mitigation:**
  - Tool execution validates IDs against Firestore
  - Failed operations return errors to AI for retry
  - Multi-step execution allows AI to self-correct
- **Severity:** Low (graceful degradation)

**Risk 4: Lock Conflicts**

- **Description:** AI creates objects that another user is about to modify
- **Mitigation:**
  - AI respects lock system (checks `canEdit()`)
  - Phase 2: Broadcast "AI is generating" to other users
  - Objects created by AI are initially unlocked
- **Severity:** Low (standard lock system handles this)

**Risk 5: Context Staleness**

- **Description:** Canvas state changes between AI reading context and executing commands
- **Mitigation:**
  - Short conversation windows (AI acts quickly)
  - Real-time subscriptions ensure fresh data
  - Firestore transactions for critical operations
- **Severity:** Low (eventual consistency acceptable)

**Risk 6: UI Responsiveness**

- **Description:** API calls take 2-5 seconds, blocking UI
- **Mitigation:**
  - Streaming responses (show AI thinking in real-time)
  - Non-blocking: user can continue canvas work while AI processes
  - Loading indicators in chat
- **Severity:** Medium (UX impact)

### Testing Strategy

#### Unit Tests

- Tool execution functions (`ai-tools.ts`)
  - Valid inputs → correct Firestore calls
  - Invalid inputs → validation errors
  - Lock conflicts → proper error messages
- Context builder (`ai-context.ts`)
  - Correct object summaries
  - Token usage within limits

#### Integration Tests

- API Route (`/api/ai/chat/route.ts`)
  - Mock OpenAI responses
  - Tool calling flow
  - Error handling (API failures, invalid tool results)
- End-to-end flow:
  - User message → AI response → Firestore write → Canvas update

#### Manual Testing Scenarios

1. **Basic Shape Creation**
   - "create a red circle at 100, 200"
   - Verify circle appears with correct properties

2. **Update Existing Object**
   - Create rectangle manually
   - Select it
   - "make it blue and bigger"
   - Verify updates apply

3. **Query Canvas**
   - Add several objects
   - "what's on the canvas?"
   - Verify AI lists objects accurately

4. **Error Cases**
   - Try modifying locked object
   - Try invalid coordinates
   - Try ambiguous command without selection

5. **Collaboration**
   - Two users in same canvas
   - User A uses AI to create objects
   - Verify User B sees objects appear

6. **Complex Command (Phase 2)**
   - "create a login form"
   - Verify multiple objects created and grouped

#### Load/Performance Tests

- 100 objects on canvas → AI context generation time
- Rapid-fire commands (10 in 10 seconds) → rate limiting works
- Long conversation (20+ messages) → chat history performance

### Performance Implications

**API Latency:**

- Expected: 1-3 seconds for simple commands, 3-5 seconds for complex
- Acceptable: Users understand AI needs time to "think"
- Mitigation: Streaming responses show progress

**Token Usage:**

- Simple command: ~500-1000 tokens (prompt + tools + response)
- Complex command: ~2000-4000 tokens
- Cost: ~$0.01-0.05 per command with GPT-4
- Mitigation: Use GPT-3.5-turbo for Phase 1 ($0.001-0.005 per command)

**Firestore Writes:**

- Each tool execution = 1 write operation
- Complex commands (Phase 2) = batch writes
- Within free tier limits for moderate usage

**Client Performance:**

- Chat panel is lightweight React component
- No impact on Konva canvas rendering
- Message history stored in memory (cleared on page refresh)

### Security Implications

**API Key Protection:**

- `OPENAI_API_KEY` in server-side `.env.local` only
- Never exposed to client
- API route validates Firebase auth token

**Authentication:**

- All API routes check `req.headers.authorization` for Firebase token
- Verify user owns canvas before operations
- Use `userId` from token, not client input

**Input Validation:**

- Zod schemas validate all tool parameters
- Server-side validation before Firestore writes
- Prevent negative coordinates, extreme values, invalid colors

**Rate Limiting:**

- Per-user limits (not per-IP, due to collaboration)
- Store in Redis/Vercel KV or simple in-memory map
- 10 commands/minute, 100 commands/hour

**Data Privacy:**

- Canvas context sent to OpenAI includes object data
- Document in privacy policy
- Option (Phase 2+): Allow users to opt-out or use local models

**Content Moderation:**

- OpenAI's moderation API for user inputs
- Block offensive content before processing
- Log violations for review

---

## 5. Success Criteria

### Phase 1 MVP

- [ ] Users can activate AI chat panel
- [ ] Users can create basic shapes via text commands
- [ ] AI correctly interprets position and property specifications
- [ ] AI respects lock system (doesn't modify locked objects)
- [ ] Error messages are clear and actionable
- [ ] AI responses appear within 3 seconds (90th percentile)
- [ ] No security vulnerabilities (API key exposure, auth bypass)
- [ ] Cost per user per month < $1 (at moderate usage)

### Phase 2

- [ ] Users can generate complex patterns (login form, button, card)
- [ ] AI uses grouping metadata to organize multi-object creations
- [ ] Complex commands complete within 5 seconds
- [ ] Error rate below 10% (AI misunderstands or generates invalid data)

### Qualitative Goals

- Users report AI feature saves time vs manual creation
- "Wow" factor in demos and user testing
- Positive feedback on natural language interaction
- Users discover creative uses beyond basic commands

---

## 6. Out of Scope (Future Work)

- Voice-to-text integration (Phase 3+)
- AI-generated templates from external sources
- Batch operations on multiple objects ("make all circles red")
- AI-powered design suggestions ("improve this layout")
- Natural language export ("describe this design as HTML")
- Undo/redo integration (blocked on undo system implementation)
- Full grouping system (using metadata tags for now)
- Multi-select integration (AI updates one object at a time for now)
- Custom AI model training on user designs
- Offline AI (local model support)

---

## 7. Dependencies & Prerequisites

### External Dependencies

- OpenAI API account with GPT-4 access
- Valid `OPENAI_API_KEY`
- Node.js 18+ (for Vercel AI SDK)

### Internal Prerequisites

- Existing shape factories (✅ Complete)
- Firestore integration with lock system (✅ Complete)
- Canvas store with Zustand (✅ Complete)
- Firebase auth (✅ Complete)

### Nice-to-Haves (Not Blockers)

- Undo/redo system (for better UX when AI makes mistakes)
- Multi-select feature (for "make them all red" type commands)
- Full grouping system (Phase 2 works fine with metadata tags)

---

## 8. Next Steps

### Immediate Actions

1. Create feature branch: `feature/ai-assistant-phase-1`
2. Install dependencies: `npm install ai @ai-sdk/openai zod`
3. Add `OPENAI_API_KEY` to `.env.local` and `.env.example`
4. Implement API route with basic tool definitions
5. Test tool execution with mock AI responses

### Implementation Order

1. **Backend** (Day 1-2)
   - API route + tool definitions
   - Context builder
   - Test with Postman/curl

2. **Frontend State** (Day 3)
   - Extend canvas store with AI slice
   - Update types in `types/ai.ts`

3. **UI Components** (Day 4-5)
   - Chat panel component
   - AI button in toolbar
   - Hook for chat interaction

4. **Integration & Testing** (Day 6-7)
   - Connect frontend to backend
   - Manual testing of all commands
   - Fix bugs and edge cases

5. **Documentation & Polish** (Day 8)
   - README updates
   - User-facing help text in chat
   - Error message refinement

### Review Checkpoints

- Backend complete → code review + test with Postman
- UI complete → design review + UX testing
- Integration complete → full feature demo
- Before merge → security review (API key handling, auth)

---

## Appendix: Tool Definitions Reference

### Phase 1 Tools

```typescript
// app/canvas/_lib/ai-tools.ts

createRectangle: tool({
  description: "Create a rectangle on the canvas",
  parameters: z.object({
    x: z.number().min(0).describe("X position"),
    y: z.number().min(0).describe("Y position"),
    width: z.number().min(5).describe("Width in pixels"),
    height: z.number().min(5).describe("Height in pixels"),
    fill: z.string().optional().describe("Fill color (CSS color)"),
    stroke: z.string().optional().describe("Stroke color"),
    strokeWidth: z.number().optional(),
    rotation: z.number().optional().describe("Rotation in degrees"),
  }),
  execute: async ({
    x,
    y,
    width,
    height,
    fill,
    stroke,
    strokeWidth,
    rotation,
  }) => {
    // Call rectangleFactory + createObject()
    // Return { success: true, id: string, message: string }
  },
});

createCircle: tool({
  description: "Create a circle on the canvas",
  parameters: z.object({
    x: z.number().min(0).describe("X position of center"),
    y: z.number().min(0).describe("Y position of center"),
    radius: z.number().min(5).describe("Radius in pixels"),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().optional(),
  }),
  execute: async ({ x, y, radius, fill, stroke, strokeWidth }) => {
    // Convert radius to radiusX/radiusY, call circleFactory
    // Return { success: true, id: string, message: string }
  },
});

createLine: tool({
  description: "Create a line on the canvas",
  parameters: z.object({
    x1: z.number().describe("Start X"),
    y1: z.number().describe("Start Y"),
    x2: z.number().describe("End X"),
    y2: z.number().describe("End Y"),
    stroke: z.string().optional(),
    strokeWidth: z.number().optional(),
  }),
  execute: async ({ x1, y1, x2, y2, stroke, strokeWidth }) => {
    // Call lineFactory with bounds
    // Return { success: true, id: string, message: string }
  },
});

createText: tool({
  description: "Create a text object on the canvas",
  parameters: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    content: z.string().describe("Text content"),
    fontSize: z.number().optional(),
    fontFamily: z.string().optional(),
    fill: z.string().optional(),
  }),
  execute: async ({ x, y, content, fontSize, fontFamily, fill }) => {
    // Call textFactory
    // Return { success: true, id: string, message: string }
  },
});

updateObject: tool({
  description: "Update properties of an existing object",
  parameters: z.object({
    objectId: z.string().describe("ID of object to update"),
    properties: z.object({
      x: z.number().optional(),
      y: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      fill: z.string().optional(),
      stroke: z.string().optional(),
      rotation: z.number().optional(),
    }),
  }),
  execute: async ({ objectId, properties }, context) => {
    // Check canEdit(object, context.userId)
    // Call updateObject(canvasId, objectId, properties)
    // Return { success: true, message: string }
  },
});

getCanvasObjects: tool({
  description: "Get information about objects on the canvas",
  parameters: z.object({
    filter: z.enum(["all", "selected"]).optional(),
  }),
  execute: async ({ filter = "all" }, context) => {
    // Call getAllObjects(canvasId)
    // Filter by selection if requested
    // Return { objects: Array<{ id, type, x, y, width, height }> }
  },
});
```

### Phase 2 Tools (Future)

```typescript
createObjects: tool({
  description: "Create multiple objects at once",
  parameters: z.object({
    objects: z.array(
      z.object({
        type: z.enum(["rectangle", "circle", "line", "text"]),
        // ... shape-specific properties
      })
    ),
    groupId: z.string().optional(),
  }),
  execute: async ({ objects, groupId }) => {
    // Batch create with Firestore batch writes
    // Tag with aiGeneratedGroup if groupId provided
    // Return { success: true, ids: string[], message: string }
  },
});
```

---

**End of PRD**
