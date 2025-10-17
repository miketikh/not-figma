# Feature Planning: AI Canvas Assistant

**Date:** 2025-10-17
**Status:** Exploration Phase
**Next Step:** Discussion → PRD Creation

## Feature Request Summary

Add an AI-powered assistant to the canvas that allows users to create and manipulate objects through natural language commands. Users can activate "AI mode" via a button, type commands (with future voice-to-text support), and the AI will interpret these commands to create simple shapes (red circle at position 100,200) or complex UI patterns (login forms with grouped objects). The AI needs context awareness of existing canvas objects, available tools, positioning system, colors, and z-indexing.

## Initial Questions & Clarifications

- **Question 1: AI Interaction Model** - Should the AI mode be modal (takes over the canvas) or side-by-side (panel/overlay where you can see AI chat while still interacting with canvas)? How does the user exit AI mode?

- **Question 2: AI Context & Memory** - How much canvas context should we send to the AI? Just object counts and types, or full object details (positions, properties)? Should the AI remember previous commands in a session (conversational) or treat each command independently?

- **Question 3: Command Confirmation vs Auto-Execute** - Should complex commands like "create a login form" execute immediately, or show a preview/confirmation step? What about undo for AI-generated content?

- **Question 4: Grouping & Selection** - You mentioned grouping for complex commands. Do we need to implement a full grouping system first, or can we start with a simpler approach (like tagging objects with metadata)?

- **Question 5: AI Provider & Cost** - Starting with OpenAI is clear, but should we design the system to be provider-agnostic (Claude, Gemini, etc.)? Who pays for API calls - are there rate limits or quotas per user?

## Possible User Stories

### Primary Use Cases

1. **As a designer, I want to quickly create shapes by describing them so that I don't have to manually click, drag, and configure properties**
   - Scenario: User activates AI mode and types "create a red circle at 100, 200 with radius 50"
   - Expected outcome: Circle appears at specified position with correct properties

2. **As a product designer, I want to generate complete UI patterns so that I can rapidly prototype layouts**
   - Scenario: User types "create a login form" and AI generates username field, password field, submit button, properly positioned and grouped
   - Expected outcome: Multi-object grouped form appears on canvas, styled appropriately

3. **As a collaborative team member, I want to modify existing objects through AI commands so that I can quickly iterate**
   - Scenario: User selects a rectangle and types "make it blue and move it 50 pixels right"
   - Expected outcome: Selected object's color changes and position updates

4. **As a user with accessibility needs, I want to use voice commands to manipulate canvas so that I can design without mouse/keyboard**
   - Scenario: User speaks "add a text layer that says hello world" (future voice-to-text)
   - Expected outcome: Text object appears with specified content

5. **As a designer exploring ideas, I want to iterate on AI-generated content so that I can refine designs conversationally**
   - Scenario: User creates a button, then says "make it bigger" then "add shadow" then "move it to center"
   - Expected outcome: AI maintains context and progressively refines the object

### Secondary/Future Use Cases

- Batch operations: "make all circles red" or "align all text layers to the left"
- Canvas-wide commands: "create a mobile mockup layout" or "add a grid system"
- Smart positioning: "put a button below the text" (AI infers relative positioning)
- Style copying: "make this rectangle look like the one on the left"
- Export/document: "describe what's on the canvas" or "generate a design spec"

## Feature Possibilities

### Option A: Chat Panel + Tool Palette Integration

**Description:** Add a slide-out chat panel (similar to properties panel) that appears when user clicks AI button in toolbar. Chat interface stays visible while user can still interact with canvas. AI commands create objects that immediately appear on canvas.

**Pros:**

- Non-disruptive to existing workflow - users can toggle AI on/off easily
- Familiar chat interface pattern
- Can see AI responses and command history
- Users maintain visual connection to canvas while issuing commands

**Cons:**

- Takes up screen real estate (though can be collapsible)
- May be harder to focus on AI interaction if canvas is visible/distracting
- Need to design panel layout and position carefully

**What we'd need:**

- New ChatPanel component (probably in `app/canvas/_components/`)
- Canvas store state for `aiModeActive` and `chatHistory`
- WebSocket or API route to OpenAI
- Message parsing and command extraction logic
- Integration with shape factories to execute commands

### Option B: Modal AI Command Center

**Description:** Clicking AI button opens a full-screen or large modal overlay with chat interface. Canvas dims in background. User focuses entirely on AI interaction. Modal closes when done, returning to canvas.

**Pros:**

- Full focus on AI conversation without distractions
- More space for rich AI responses (images, previews, suggestions)
- Clearer "mode" distinction - you're either in AI mode or canvas mode
- Easier to implement initially (less layout complexity)

**Cons:**

- Disruptive to workflow - can't see canvas while chatting
- Harder to do incremental refinements while seeing results
- May feel heavyweight for simple commands
- Users might want to reference existing objects while talking to AI

**What we'd need:**

- Modal component with chat interface
- State management for modal visibility
- Same API/parsing infrastructure as Option A
- Possibly canvas preview/thumbnail in modal

### Option C: Inline Command Bar (Figma-style Quick Actions)

**Description:** Pressing a keyboard shortcut (Cmd+K, Cmd+/) opens a command bar overlay at top of canvas. User types command, hits enter, command executes, bar disappears. No persistent chat history - focused on quick commands.

**Pros:**

- Minimal UI - doesn't take permanent space
- Very fast for power users (keyboard-driven)
- Fits well with existing keyboard shortcuts
- Similar to familiar command palettes (VS Code, Figma)

**Cons:**

- Not conversational - each command is independent
- No visual history of what AI did
- Harder to do complex multi-step commands
- Less discoverable for new users
- Doesn't support back-and-forth refinement easily

**What we'd need:**

- Command bar component (like shadcn Command component)
- Keyboard shortcut handling
- Command parser with simpler interface
- Feedback mechanism (toasts/notifications)

### Option D: Hybrid - Command Bar + Chat History Drawer

**Description:** Combine Option C's command bar for quick actions with an optional chat history drawer that can be opened to see previous commands and have longer conversations.

**Pros:**

- Best of both worlds - quick commands AND conversational mode
- Progressive disclosure - simple for basic use, powerful for advanced
- Command bar feels lightweight, history drawer provides context
- Fits multiple user workflows

**Cons:**

- More complex to implement - two UI systems
- More state management complexity
- Users need to learn both interaction patterns
- Risk of confusing UX if not designed carefully

**What we'd need:**

- Command bar component + chat drawer component
- Unified state management for both
- Smart routing of simple vs complex queries
- Clear affordances for when to use each mode

## Technical Considerations

### Architecture Thoughts

**AI Request Pipeline:**

1. User input → Command parser → Context builder → AI API call
2. AI response → Command interpreter → Shape factory calls → Firestore write
3. Real-time listener picks up changes → Canvas updates

**Context Management:**

- Need to serialize current canvas state for AI (objects, positions, properties)
- Should we send full object details or summarized metadata?
- How to handle large canvases (100+ objects) - do we filter/limit context?
- Need to track user's selection/focus to understand commands like "make it bigger"

**Command Execution:**

- Direct execution vs. preview/confirmation
- Error handling (AI generates invalid positions, unsupported properties)
- Atomic operations (all objects in "create login form" should be created together)
- Undo/redo integration (should AI commands be undoable as single operations?)

### Dependencies & Integrations

**Existing features affected:**

- Canvas store (need AI mode state, chat history)
- Shape factories (AI will call these to create objects)
- Lock system (should AI-created objects be locked? Who owns them?)
- Properties panel (might conflict with AI panel for screen space)
- Keyboard shortcuts (need to add AI activation shortcut)

**New dependencies needed:**

- **Vercel AI SDK** (`ai` package) - DECIDED: Core SDK for AI integration
- **OpenAI Provider** (`@ai-sdk/openai` package) - DECIDED: OpenAI integration for Vercel AI SDK
- **Zod** (`zod` package) - For schema validation and tool parameter definitions
- API route in Next.js (`app/api/ai/chat/route.ts`) to handle AI requests
- Streaming support (built into Vercel AI SDK)
- Environment variables for OpenAI API key
- Rate limiting (Vercel AI SDK + Vercel KV/Upstash)

**Data/state management:**

- New store slice or separate store for AI state
- Chat history (keep in memory or persist to Firestore?)
- Command history (for undo/redo context)
- Temporary "preview" objects before confirmation?

### Potential Challenges

**Challenge 1: Prompt Engineering for Consistent Output**

- AI needs to return structured JSON commands, not free-form text
- Need to design prompt that teaches AI about available shapes, properties, coordinate system
- How to handle ambiguity (user says "red" - which red? #FF0000? #CC0000?)
- Possible solutions:
  - Use OpenAI function calling / structured outputs
  - Create strict JSON schema for commands
  - Iterative prompt refinement with examples
  - Fallback to asking clarifying questions

**Challenge 2: Complex Commands & Object Relationships**

- "Create a login form" requires AI to understand UI patterns, spacing, hierarchy
- Need to teach AI about grouping, relative positioning, z-index
- Risk of generating layouts that don't look good or have overlapping objects
- Possible solutions:
  - Provide AI with template library of common patterns
  - Use pre-defined "macro" commands that expand to object lists
  - Let AI access design system constants (spacing, colors)
  - Implement smart positioning algorithm (auto-layout helpers)

**Challenge 3: Real-time Collaboration + AI**

- If User A's AI is creating objects, User B sees them appear in real-time
- Could be confusing or disruptive
- Locks might conflict (AI tries to modify object locked by another user)
- Possible solutions:
  - Visual indicator when AI is generating (loading state)
  - AI respects lock system (skips locked objects)
  - Option to preview AI changes before committing
  - AI commands are attributed to user who invoked them

**Challenge 4: Cost & Rate Limiting**

- OpenAI API calls cost money
- Users could spam commands or have very long conversations
- Need backend logic to track usage
- Possible solutions:
  - Rate limiting per user (X commands per minute/hour)
  - Usage quotas or require API key from user
  - Cache common commands/responses
  - Use cheaper models for simple commands, GPT-4 for complex ones

**Challenge 5: Context Window Limitations**

- Large canvases might exceed token limits when sending context
- AI needs enough context to understand references ("the blue circle")
- Possible solutions:
  - Summarize canvas (counts, bounding boxes, not full properties)
  - Send only objects near user's viewport
  - Smart filtering (only send objects mentioned in conversation)
  - Use embeddings for semantic search of relevant objects

## User Experience Sketch

### User Flow Ideas (Option A - Chat Panel)

1. User clicks "AI Assistant" button in toolbar (or presses Cmd+/)
2. Chat panel slides in from right side of screen (300-400px wide)
3. Welcome message appears: "Hi! I can help you create shapes, layouts, and more. Try: 'create a red circle' or 'add a login form'"
4. User types: "create a red circle at position 100, 200"
5. AI sends typing indicator, then responds: "Created a red circle at (100, 200) with radius 50px"
6. Circle appears on canvas immediately
7. User continues: "make it bigger"
8. AI responds: "Increased the circle's radius to 75px"
9. Circle updates on canvas
10. User clicks X or presses Escape to close panel

### UI/UX Considerations

**Interface elements needed:**

- AI button in toolbar (icon: sparkle/star/brain/wand?)
- Chat panel or modal with message list
- Text input field with send button
- Typing indicators for AI responses
- Status indicators (AI generating objects, errors, success)
- Command history (scrollable message list)
- Clear/reset chat button
- Settings for AI (model selection, verbosity, auto-execute vs confirm)

**Feedback mechanisms:**

- Visual confirmation when objects are created (flash/highlight?)
- Error messages when commands fail (invalid position, object not found)
- AI explains what it did ("Created 5 objects and grouped them")
- Loading states for API calls
- Success toasts for completed commands

**Error handling:**

- AI doesn't understand command → asks for clarification
- AI generates invalid data → catches and asks user to rephrase
- API rate limit hit → shows error, suggests trying again later
- Network failure → graceful degradation, retry button
- Locked objects → AI explains it can't modify (locked by other user)

## Open Questions & Discussion Points

### Decision Points

- [x] **UI Pattern: Chat Panel vs Modal vs Command Bar vs Hybrid** ✅ DECIDED
  - **Decision:** Option A - Slide-out Chat Panel
  - Rationale: Non-disruptive, maintains visual connection to canvas, fits existing toolbar pattern

- [x] **AI SDK Choice: LangChain vs OpenAI SDK vs Vercel AI SDK** ✅ DECIDED
  - **Decision:** Vercel AI SDK (`ai` + `@ai-sdk/openai`)
  - Rationale: Best Next.js integration, simplest tool calling API, built-in multi-step execution, excellent structured output, multi-provider support for future flexibility

- [x] **MVP Scope: Simple shapes only vs Complex patterns** ✅ DECIDED
  - **Decision:** Phase 1 starts with basic shape commands, Phase 2 adds complex patterns
  - Rationale: Faster to market, validates core architecture, complex patterns need grouping system

- [ ] **Execution Model: Auto-execute vs Preview-and-confirm**
  - Considerations: User trust, reversibility (undo), error likelihood, command complexity threshold
  - Leaning toward: Auto-execute for simple (1-2 objects), preview for complex (3+ objects)

- [ ] **Context Scope: How much canvas info to send to AI**
  - Considerations: Token limits, cost, relevance, privacy (other users' objects)

- [x] **Grouping Implementation: Build full grouping system now or use metadata tags** ✅ DECIDED
  - **Decision:** Start with metadata tags (`aiGeneratedGroup: 'group-id'`), build full grouping later
  - Rationale: Unblocks Phase 2 (complex patterns), keeps Phase 1 scope manageable

### Unknowns

- How expensive will this be per user? (need cost estimates based on expected usage)
- How accurate will the AI be with current prompt engineering? (need prototype testing)
- Do we need voice-to-text immediately or can we defer? (affects scope)
- What's the MVP - simple shape commands only, or complex patterns too?
- Should grouping be part of this feature or separate pre-requisite?

### Trade-offs to Discuss

**Simplicity vs Power:**

- Simple command bar is faster to build but less capable
- Full chat interface is more powerful but more complex

**Auto-execute vs Safety:**

- Auto-executing feels magical and fast
- Confirmation steps are safer but interrupt flow

**Context vs Cost:**

- Sending full canvas details gives AI more context
- Summarized context saves tokens and money

**MVP Scope:**

- Start with simple shape commands (faster to market)
- vs. Include complex patterns like "login form" (more impressive demo)

## Rough Implementation Thoughts

### Core Components Needed

1. **AIAssistantButton** (`app/canvas/_components/AIAssistantButton.tsx`)
   - Purpose: Toolbar button to activate AI mode
   - Rough approach: Button component, icon, toggles AI panel visibility

2. **AIChatPanel** (`app/canvas/_components/AIChatPanel.tsx`)
   - Purpose: Main chat interface (if going with panel approach)
   - Rough approach: Slide-out panel, message list, input field, uses shadcn components

3. **AICommandInterpreter** (`app/canvas/_lib/ai-command-interpreter.ts`)
   - Purpose: Parse AI responses and execute commands
   - Rough approach: Takes AI JSON response, maps to shape factory calls, handles errors

4. **AIContextBuilder** (`app/canvas/_lib/ai-context-builder.ts`)
   - Purpose: Serialize current canvas state for AI
   - Rough approach: Reads objects from store/Firestore, builds summarized JSON

5. **AI API Route** (`app/api/ai/chat/route.ts`)
   - Purpose: Backend endpoint to call OpenAI
   - Rough approach: Next.js route handler, OpenAI SDK, streaming support, rate limiting

6. **AIStore** (`app/canvas/_store/ai-store.ts` or slice in canvas-store)
   - Purpose: Manage AI state (active, chat history, pending commands)
   - Rough approach: Zustand store with actions for sendMessage, clearHistory, toggle

### Integration Points

**Frontend:**

- Canvas component needs to render AI button and panel
- Toolbar needs new AI button
- Canvas store needs AI state
- Hooks needed: `useAIChat`, `useAICommands`
- Shape factories extended with AI command format converters

**Backend:**

- Next.js API route for OpenAI proxy (`app/api/ai/`)
- Environment variables for API keys
- Possibly middleware for rate limiting
- Could use Vercel Edge Functions for streaming

**Database:**

- Optional: Store chat history in Firestore (per user? per canvas?)
- Optional: Store AI-generated object metadata (tagging which objects were AI-created)
- Lock system integration (AI respects existing locks)

**APIs/Services:**

- OpenAI API (GPT-4 or GPT-3.5-turbo)
- Future: OpenAI Whisper API for voice-to-text

### System Prompt & Tool Calling Strategy (Vercel AI SDK)

**Tool Definition Approach:**
Using Vercel AI SDK's `tool()` helper with Zod schemas for type-safe tool calling:

```typescript
import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const result = await generateText({
  model: openai("gpt-4"),
  maxSteps: 5, // Allow multi-step tool execution for complex commands
  tools: {
    createRectangle: tool({
      description: "Create a rectangle on the canvas",
      parameters: z.object({
        x: z.number().describe("X position (canvas origin is top-left)"),
        y: z.number().describe("Y position"),
        width: z.number().describe("Width in pixels"),
        height: z.number().describe("Height in pixels"),
        fill: z
          .string()
          .describe("Fill color (CSS color name or hex)")
          .optional(),
        stroke: z.string().describe("Stroke color").optional(),
        strokeWidth: z.number().optional(),
        rotation: z.number().describe("Rotation in degrees").optional(),
      }),
      execute: async (params) => {
        const object = await createCanvasObject("rectangle", params);
        return {
          success: true,
          id: object.id,
          message: `Created rectangle at (${params.x}, ${params.y})`,
        };
      },
    }),

    createCircle: tool({
      description: "Create a circle on the canvas",
      parameters: z.object({
        x: z.number().describe("X position of center"),
        y: z.number().describe("Y position of center"),
        radius: z.number().describe("Radius in pixels"),
        fill: z.string().optional(),
        stroke: z.string().optional(),
        strokeWidth: z.number().optional(),
      }),
      execute: async (params) => {
        const object = await createCanvasObject("circle", params);
        return { success: true, id: object.id };
      },
    }),

    getCanvasObjects: tool({
      description: "Get information about objects currently on the canvas",
      parameters: z.object({
        filter: z.enum(["all", "selected", "visible"]).optional(),
      }),
      execute: async ({ filter = "all" }) => {
        const objects = await fetchCanvasObjects(filter);
        return {
          objects: objects.map((obj) => ({
            id: obj.id,
            type: obj.type,
            x: obj.x,
            y: obj.y,
          })),
        };
      },
    }),

    updateObject: tool({
      description: "Update properties of an existing object",
      parameters: z.object({
        objectId: z.string().describe("ID of the object to update"),
        properties: z.object({
          x: z.number().optional(),
          y: z.number().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          fill: z.string().optional(),
          rotation: z.number().optional(),
        }),
      }),
      execute: async ({ objectId, properties }) => {
        await updateCanvasObject(objectId, properties);
        return { success: true, message: `Updated object ${objectId}` };
      },
    }),
  },
  system: `You are an AI assistant for a collaborative design canvas.

  Coordinate system: Top-left is (0, 0), x increases right, y increases down.
  Available colors: CSS color names (red, blue, etc.) or hex codes (#FF0000).

  When users ask to create shapes, use the provided tools to create them.
  For commands like "make it bigger", first call getCanvasObjects to see what's selected.

  Be concise and friendly. Confirm what you did after executing commands.`,
  prompt: userMessage,
});
```

**Advantages of Vercel AI SDK approach:**

- **Automatic multi-step execution:** `maxSteps: 5` allows AI to call multiple tools in sequence
- **Type-safe parameters:** Zod schemas provide runtime validation + TypeScript types
- **Clean tool execution:** `execute` functions directly call Firebase/Firestore
- **Structured responses:** Access tool results via `result.toolCalls` and `result.toolResults`
- **Streaming support:** Can use `streamText()` for real-time UI updates

## Success Criteria (Preliminary)

- Users can successfully create basic shapes (rectangle, circle, line, text) via text commands
- AI correctly interprets position and property specifications (colors, sizes)
- Complex commands (login form) generate reasonable multi-object layouts
- AI responses appear within 2-3 seconds
- Error rate below 10% (AI misunderstands or generates invalid data)
- Users report AI feature saves time vs manual object creation (qualitative)
- No security issues (API key exposure, cost abuse)

## Next Steps

### Before Moving to PRD

- [x] ✅ Discuss and decide on UI approach → **Chat Panel (Option A)**
- [x] ✅ Decide on AI SDK → **Vercel AI SDK**
- [x] ✅ Decide on MVP scope → **Phase 1: Basic shapes, Phase 2: Complex patterns**
- [x] ✅ Determine if grouping needs to be built first → **Use metadata tags for now**
- [ ] Answer open questions about execution model (auto vs confirm)
- [ ] Validate assumptions about OpenAI cost and rate limits
- [ ] Define rate limiting strategy

### To Prepare for PRD Creation

- Install Vercel AI SDK and create prototype API route
- Build quick prototype to test tool calling with canvas operations
- Estimate costs (tokens per request, expected usage)
- Design wireframes for chat panel UI
- Define all Phase 1 tools (createRectangle, createCircle, createLine, createText, updateObject, getCanvasObjects)
- Define canvas context format (what info to send to AI)

---

## Discussion Notes

### 2025-10-17: Initial Planning Session

**Decisions Made:**

1. **UI Approach:** Slide-out chat panel (Option A)
   - User feedback: "slide out chat panel sounds good"
   - Maintains visual connection to canvas while chatting
   - Fits existing toolbar interaction pattern

2. **MVP Scope:** Start with basic shapes, complex patterns in Phase 2
   - User feedback: "we can start with basic shapes, but we do have to keep in mind that we'll need the complex ones"
   - Phase 1: Individual shape commands (rectangle, circle, line, text)
   - Phase 2: Complex patterns (login forms, etc.) - requires grouping

3. **Grouping Strategy:** Metadata tags for Phase 2, full grouping system later
   - Use `aiGeneratedGroup: 'group-id'` metadata on objects
   - Unblocks complex pattern generation
   - Full grouping feature can be built independently

4. **AI SDK Selection:** Vercel AI SDK
   - Research conducted comparing LangChain, OpenAI SDK, and Vercel AI SDK
   - **Winner:** Vercel AI SDK (`ai` + `@ai-sdk/openai`)
   - Key reasons:
     - Best Next.js integration (built by Vercel)
     - Simplest tool calling with `tool()` helper and Zod
     - Built-in multi-step execution (`maxSteps`)
     - Excellent structured output (`generateObject`, `streamObject`)
     - Multi-provider support (easy to add Claude/Anthropic)
     - Best developer experience and documentation
   - LangChain rejected: Over-engineered, steep learning curve
   - OpenAI SDK: Good but more boilerplate, no multi-provider support

**Next Steps:**

- Move to PRD creation with these decisions locked in
- Define detailed tool specifications
- Design chat panel UI wireframes
- Estimate implementation timeline and phases

---

## Transition to PRD

Once we've discussed and aligned on the approach, we'll create a formal PRD that includes:

- Structured requirements
- Phased implementation plan (Phase 1: Simple commands, Phase 2: Complex patterns, Phase 3: Voice)
- Specific code changes and files
- Detailed acceptance criteria
- Technical specifications for API integration
- Prompt engineering strategy
- Cost/rate limiting implementation
