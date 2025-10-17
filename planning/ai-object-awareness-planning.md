# Feature Planning: AI Object Awareness & Reference System

**Date:** 2025-10-17
**Status:** Exploration Phase
**Next Step:** Discussion → PRD Creation

## Feature Request Summary

The current AI assistant has limited awareness of canvas objects beyond what's explicitly selected. It can create new shapes but struggles with referencing existing objects (e.g., "delete the red circle we made earlier" or "find the yellow triangle"). With canvases potentially containing hundreds of objects, we need a smart system that:

1. Allows AI to reference objects by description ("the blue rectangle")
2. Tracks which objects were created by the AI vs manually
3. Efficiently queries/filters objects without sending all data in every request
4. Maintains conversation context across multiple chat interactions

---

## Initial Questions & Clarifications

- **Question 1: Session Scope** - Should AI sessions be persistent across page reloads, or only last for the current browser session? If persistent, where do we store them (Firestore, localStorage)?

- **Question 2: Token Budget** - With OpenAI's context window limits, how many object details can we realistically include? Should we prioritize recently created objects, AI-created objects, or objects matching the user's query?

- **Question 3: Ambiguity Resolution** - When there are multiple matching objects (3 red circles), should the AI ask for clarification, operate on all matches, or pick the most recent?

- **Question 4: Cross-Session References** - Should the AI be able to reference objects from previous chat sessions? ("The circle we made yesterday")

- **Question 5: Selection Control** - Should the AI be able to programmatically select objects for the user, or just reference them in descriptions?

---

## Possible User Stories

### Primary Use Cases

1. **As a designer, I want to tell the AI to "delete the red circle we just made" so that I can quickly remove AI-created objects without manual selection**
   - Scenario: User asks AI to create 5 shapes, realizes one is wrong
   - Expected outcome: AI identifies and deletes the specific object from this session

2. **As a designer, I want to ask "make the blue rectangle bigger" so that I can modify existing shapes through conversation**
   - Scenario: Canvas has multiple rectangles of different colors
   - Expected outcome: AI finds the blue rectangle and increases its size, handles ambiguity if there are multiple blue rectangles

3. **As a designer working with 500+ objects, I want the AI to find specific objects without the system choking on token limits**
   - Scenario: Large canvas with hundreds of user-created and AI-created objects
   - Expected outcome: AI uses smart filtering to query only relevant objects, keeps context under limits

4. **As a designer, I want to reference shapes by spatial location ("the circle on the left side") so that I can interact with objects naturally**
   - Scenario: User describes object by relative position instead of color/type
   - Expected outcome: AI queries objects by position range and identifies the target

5. **As a designer collaborating with AI over multiple interactions, I want the AI to remember what we built together so that our conversation feels continuous**
   - Scenario: User creates 3 AI objects, closes chat panel, reopens it later
   - Expected outcome: AI still knows about objects it created in previous messages

### Secondary/Future Use Cases

- Select multiple objects by description ("select all red shapes")
- Group operations ("arrange the 3 circles we made into a row")
- Undo AI actions by description ("remove everything we added in the last 5 minutes")
- Object annotations/tagging for better AI reference ("label this as 'logo'")
- AI learns from user corrections ("Actually, I meant the other red circle")

---

## Feature Possibilities

### Option A: Enhanced Context with Smart Filtering

**Description:** Intercept user queries to extract object references (color, type, size, location), query Firestore for matching objects, and dynamically include them in AI context. Track AI-created objects with metadata fields on each CanvasObject.

**Pros:**

- No new AI tools needed - works within existing architecture
- Smart filtering reduces token usage (only include relevant objects)
- Simple implementation - just add metadata fields and pre-processing
- AI gets full object details automatically for matching objects
- Works well for descriptive queries ("the red circle")

**Cons:**

- Pre-query parsing might miss complex references
- Requires NLP or regex patterns to extract object criteria
- May include too many objects if query is ambiguous
- Doesn't scale well if user says "all the rectangles" (could be 100+)
- AI can't iteratively refine its search

**What we'd need:**

- Query parser to extract: color, type, size range, position range, creation time
- Firestore compound queries on CanvasObject fields
- Metadata fields: `createdBy: 'ai' | 'user'`, `aiSessionId?: string`, `aiMessageId?: string`
- Heuristics to rank/prioritize matching objects (e.g., prefer recent, prefer AI-created)
- Token budget calculator to limit included objects

**Implementation approach:**

```typescript
// Before calling AI:
const query = parseUserQuery(message); // Extract: { color: 'red', type: 'circle' }
const matchingObjects = await queryObjects(canvasId, {
  fill: query.color,
  type: query.type,
  // Add spatial filters if location detected
});

const context = buildEnhancedContext({
  selectedObjects,
  matchingObjects: matchingObjects.slice(0, 10), // Limit to top 10
  aiCreatedInSession: getAISessionObjects(sessionId),
  summary: canvasContext.summary
});
```

---

### Option B: Tool-Based Object Querying

**Description:** Add new AI tools like `findObjects()`, `selectObjects()`, `describeObjects()` that let the AI query and search for objects as needed. The AI decides when to search and what criteria to use.

**Pros:**

- AI controls its own search strategy (more intelligent)
- Multi-step workflow: query → get results → act on specific objects
- Very token-efficient (only fetch when AI requests)
- AI can refine searches iteratively ("show me circles... now just the red ones")
- Clear tool logs for debugging ("AI searched for red circles, found 3")

**Cons:**

- Requires extra tool calls (slower, more API costs)
- More complex conversation flow (user waits for multiple steps)
- AI needs to "learn" when to use search tools vs. direct actions
- May feel less natural ("wait, let me search... ok found it, now deleting")
- Requires careful prompt engineering to teach AI when to search

**What we'd need:**

- New AI tools:
  - `findObjects({ type?, fill?, stroke?, sizeRange?, positionRange?, createdBy? })` → returns array of matching object IDs with summaries
  - `selectObjects({ ids: string[] })` → programmatically updates selection state
  - `describeObjects({ filter })` → gets details without selecting
- Update system prompt to teach AI when to use these tools
- Client-side selection state sync (if AI selects objects)
- Session tracking for `createdBy: 'ai'` filter

**Implementation approach:**

```typescript
// New AI tool
export const findObjects = tool({
  description: "Search for canvas objects by properties. Returns matching object IDs and summaries.",
  inputSchema: z.object({
    type: z.enum(['rectangle', 'circle', 'line', 'text']).optional(),
    fill: z.string().optional().describe("Color as hex or name"),
    createdInSession: z.boolean().optional().describe("Only objects created by AI in this session"),
    positionRange: z.object({ minX, maxX, minY, maxY }).optional(),
    limit: z.number().default(10)
  }),
  execute: async ({ type, fill, createdInSession, positionRange, limit }, context) => {
    const objects = await getAllObjects(context.canvasId);
    const filtered = objects
      .filter(obj => !type || obj.type === type)
      .filter(obj => !fill || colorMatches(obj.fill, fill))
      .filter(obj => !createdInSession || obj.aiSessionId === context.sessionId)
      .filter(obj => !positionRange || isInRange(obj, positionRange))
      .slice(0, limit);

    return {
      success: true,
      matches: filtered.map(obj => ({
        id: obj.id,
        type: obj.type,
        fill: obj.fill,
        position: { x: obj.x, y: obj.y }
      }))
    };
  }
});
```

---

### Option C: Session-Based Object Registry

**Description:** Maintain a separate Firestore collection tracking AI sessions and the objects created within them. Always include full details of AI-created objects in context, treat user-created objects as background data (summary only unless selected).

**Pros:**

- Clear separation: AI "owns" objects it creates
- Context always includes AI-created objects (continuity across messages)
- Session registry persists across page reloads (stored in Firestore)
- Easy to implement undo ("delete all objects from this session")
- Can show "AI History" panel listing what AI created

**Cons:**

- Can't reference user-created objects easily ("the red circle" might be manual)
- Extra Firestore collection and queries (cost, complexity)
- Session cleanup/expiration needed (how long to keep registry?)
- Doesn't help with "find the blue rectangle" if it's user-created
- Registry could grow large over time

**What we'd need:**

- New Firestore collection: `canvases/{canvasId}/aiSessions/{sessionId}`
  - `sessionId: string` (UUID)
  - `userId: string`
  - `startedAt: number`
  - `lastMessageAt: number`
  - `objectIds: string[]` (objects created in this session)
- Metadata on CanvasObject: `aiSessionId?: string`, `aiMessageId?: string`
- Session lifecycle management (start, resume, expire)
- Context builder always fetches session objects

**Implementation approach:**

```typescript
// Session tracking
interface AISession {
  id: string;
  userId: string;
  canvasId: string;
  startedAt: number;
  lastMessageAt: number;
  objectIds: string[];
}

// In chat API:
const sessionId = await getOrCreateSession(userId, canvasId);

// When AI creates object:
await createObject(canvasId, {
  ...objectData,
  aiSessionId: sessionId,
  aiMessageId: currentMessageId
});
await addObjectToSession(sessionId, objectId);

// In context builder:
const sessionObjects = await getSessionObjects(sessionId);
const context = {
  ...baseContext,
  aiCreatedInSession: sessionObjects, // Always include full details
};
```

---

### Option D: Hybrid Approach (Smart Context + Query Tools)

**Description:** Combine Option A and Option B. Context always includes AI-created objects from current session (Option C's registry), plus smart filtering for user queries (Option A). Add query tools (Option B) for complex searches.

**Pros:**

- Best of all approaches: smart defaults + AI control
- AI-created objects always in context (continuity)
- Query tools available when AI needs to search user-created objects
- Balances token efficiency with functionality
- Gracefully handles edge cases

**Cons:**

- Most complex to implement (three systems)
- Higher maintenance burden
- More code paths = more bugs
- Token budget harder to predict (dynamic)
- Might be over-engineered for current needs

**What we'd need:**

- All components from Options A, B, and C
- Session registry (Firestore collection)
- Query pre-processing for context
- AI tools for explicit searches
- Smart context builder that prioritizes:
  1. Selected objects (full details)
  2. AI-created in session (full details)
  3. Query-matched objects (full details, top N)
  4. Remaining objects (counts only)

**Implementation approach:**

```typescript
// Context priority system
async function buildHybridContext(canvasId, userId, selectedIds, sessionId, userQuery) {
  const [selected, sessionObjects, allObjects] = await Promise.all([
    getObjects(canvasId, selectedIds),
    getSessionObjects(sessionId),
    getAllObjects(canvasId)
  ]);

  // Extract query hints
  const queryMatches = parseUserQuery(userQuery)
    ? filterObjects(allObjects, parseUserQuery(userQuery))
    : [];

  // Prioritize and budget
  const context = {
    selected: selected, // Always include (typically <5 objects)
    aiSession: sessionObjects, // Always include (typically <20 objects)
    queryMatched: queryMatches.slice(0, 10), // Top 10 matches
    unselectedSummary: summarizeRemainingObjects(allObjects)
  };

  return estimateTokens(context) < TOKEN_LIMIT
    ? context
    : truncateContext(context);
}
```

---

## Technical Considerations

### Architecture Thoughts

**Data Model Changes:**

- Add to `BaseCanvasObject`:
  - `createdBy: 'user' | 'ai'` (string, default 'user')
  - `aiSessionId?: string` (optional, set when AI creates)
  - `aiMessageId?: string` (optional, specific message that created it)
- New collection (Option C/D): `canvases/{canvasId}/aiSessions/{sessionId}`
- Session lifecycle: Start on first AI message, expire after 24 hours of inactivity

**Token Management:**

- Current context uses ~200-400 tokens
- Full object details: ~50-100 tokens each
- Budget: Aim for <2000 tokens total context
- Strategy: Selected (5) + AI session (20) + matched (10) = ~3500 tokens (acceptable)

**Query Performance:**

- Firestore queries with filters on `fill`, `type`, `aiSessionId`
- Need compound index: `(canvasId, fill, type)` for fast lookups
- Spatial queries require client-side filtering (Firestore doesn't support geo queries on arbitrary fields)
- Cache `getAllObjects` result per request to avoid redundant fetches

### Dependencies & Integrations

**Existing features affected:**

- `app/api/ai/chat/route.ts` - Context building logic (major changes)
- `app/canvas/_lib/ai-context.ts` - Enhanced with query parsing (moderate)
- `app/canvas/_lib/ai-tools.ts` - Add new query tools (Option B/D)
- `lib/firebase/firestore.ts` - New session queries (Option C/D)
- `types/canvas.ts` - Add metadata fields to BaseCanvasObject
- `types/ai.ts` - Add session types and query result types

**New dependencies needed:**

- Color matching library (compare "red" with "#ff0000") - or build simple mapper
- Spatial filtering utilities (check if point in region)
- Session ID generation (use existing `nanoid` or similar)
- Query parser (simple regex or NLP library like `compromise`)

**Data/state management:**

- Session tracking in Firestore (persistent across reloads)
- In-memory cache of session objects during chat (performance)
- Client-side selection state sync (if AI selects objects)

### Potential Challenges

**Challenge 1: Ambiguous References**

- User says "delete the red circle" but there are 3 red circles
- Possible solutions:
  - AI asks for clarification ("I found 3 red circles. Which one?")
  - AI operates on most recent red circle
  - AI shows IDs and asks user to select
  - AI deletes all matching (with confirmation)

**Challenge 2: Token Budget Overflows**

- User asks about "all rectangles" when there are 200
- Possible solutions:
  - Hard limit on included objects (top 10-20)
  - Summarize in groups ("45 blue rectangles, 30 red rectangles")
  - AI tool returns paginated results
  - Warn user that not all objects can be analyzed

**Challenge 3: Session Expiration**

- User references "the circle we made yesterday" but session expired
- Possible solutions:
  - Keep sessions active for 7 days
  - Fall back to querying by creation timestamp and user ID
  - Notify user that old sessions aren't tracked
  - Allow querying archived sessions

**Challenge 4: Color Matching**

- User says "red" but object is "#dc143c" (crimson)
- Possible solutions:
  - Build color name → hex map (red: #ff0000, crimson: #dc143c, etc.)
  - Use color distance algorithm (HSL/RGB distance)
  - Accept approximate matches ("found 'red-ish' circles")
  - Require exact hex codes (bad UX)

**Challenge 5: Spatial Queries**

- User says "the circle on the left side" - how to define "left"?
- Possible solutions:
  - Divide canvas into regions (left = x < width/3)
  - Use viewport bounds (left = left 1/3 of visible area)
  - Relative to selected object ("left of the selected rectangle")
  - Relative to center ("left half of canvas")

---

## User Experience Sketch

### User Flow Ideas

**Scenario 1: Delete AI-created object**

1. User: "Create 3 red circles"
2. AI creates circles, context tracks them in session
3. User: "Actually, delete the middle one"
4. AI identifies "middle" by X position, finds matching circle, deletes it
5. AI responds: "Deleted the circle at (960, 540)"

**Scenario 2: Modify user-created object**

1. Canvas has 50 objects (user-created over time)
2. User selects nothing, asks: "Make the blue rectangle bigger"
3. AI searches for blue rectangles, finds 2
4. AI: "I found 2 blue rectangles. Should I make both bigger, or did you mean one specifically?"
5. User: "The one on the left"
6. AI filters by position, updates the left one
7. AI: "Increased size of rectangle at (200, 300) to 400×300"

**Scenario 3: Large canvas operation**

1. Canvas has 500 objects
2. User: "Select all the circles"
3. AI uses `findObjects({ type: 'circle' })` tool, gets 87 results
4. AI: "Found 87 circles. Should I select all of them?"
5. User: "Yes"
6. AI calls `selectObjects({ ids: [/* 87 IDs */] })`
7. Client updates selection state, properties panel shows "87 objects selected"

### UI/UX Considerations

**Interface elements needed:**

- Optional: "AI Session History" panel showing objects created in this session (with thumbnails)
- Optional: Visual indicator on objects created by AI (subtle badge/glow)
- Optional: Chat message metadata showing tool calls ("Searched for red circles, found 3")

**Feedback mechanisms:**

- AI describes what it found: "I found 3 red circles at (100, 200), (400, 300), (700, 400)"
- Confirmation prompts for ambiguous actions: "Should I delete all 5 or just one?"
- Clear error messages: "I couldn't find any blue rectangles. Did you mean a different color?"

**Error handling:**

- No matches found: "I don't see any red circles on the canvas. Would you like me to create one?"
- Too many matches: "I found 50 rectangles. Could you be more specific (color, location, size)?"
- Session expired: "I can't remember which objects I created yesterday. Could you select the object you want to modify?"

---

## Open Questions & Discussion Points

### Decision Points

- [ ] **Decision 1: Session Persistence**
  - Considerations: Should sessions survive page reloads? If yes, store in Firestore. If no, use in-memory Map. Trade-off: Continuity vs. complexity.

- [ ] **Decision 2: Default Approach**
  - Considerations: Start with Option A (simplest), then add Option B tools later? Or go full hybrid (Option D)? Trade-off: Speed to market vs. completeness.

- [ ] **Decision 3: Selection Control**
  - Considerations: Should AI be able to select objects for the user? Might be disruptive if user has existing selection. Trade-off: Powerful vs. potentially confusing.

- [ ] **Decision 4: Ambiguity Handling**
  - Considerations: When multiple objects match, should AI ask, pick one, or operate on all? Different answers for different actions (delete = ask, update fill = all). Trade-off: Safety vs. speed.

- [ ] **Decision 5: Token Budget Strategy**
  - Considerations: Hard limit (e.g., top 20 objects) or dynamic based on query? Dynamic is smarter but harder to predict costs. Trade-off: Predictability vs. flexibility.

### Unknowns

- How often do users actually reference non-selected objects? (Need usage data)
- What's the average canvas size in production? (Affects token budget)
- How long should sessions persist? (24 hours? 7 days? Forever?)
- Can OpenAI's model understand spatial descriptions well enough? (Test prompts needed)
- Will color name matching be accurate enough without ML? (Test with examples)

### Trade-offs to Discuss

- **Simplicity vs. Power**: Option A is simple but limited. Option D is powerful but complex. Which matters more now?
- **Token Cost vs. Functionality**: Including more objects in context costs more tokens/money. Where's the sweet spot?
- **Client vs. Server Logic**: Should query parsing happen in API route (server) or in client before sending? Server = centralized, client = less latency.
- **Persistence vs. Privacy**: Storing AI sessions long-term helps UX but stores more user data. Privacy considerations?

---

## Rough Implementation Thoughts

### Core Components Needed

1. **Query Parser** (`app/api/ai/_lib/query-parser.ts`)
   - Purpose: Extract object criteria from natural language
   - Rough approach: Regex patterns for colors, types, spatial terms
   - Example: "the red circle on the left" → `{ fill: 'red', type: 'circle', position: 'left' }`

2. **Session Manager** (`lib/firebase/ai-sessions.ts`)
   - Purpose: Track AI sessions and associated objects
   - Rough approach: CRUD operations for `aiSessions` collection
   - Functions: `createSession()`, `getSession()`, `addObjectToSession()`, `expireSessions()`

3. **Enhanced Context Builder** (`app/canvas/_lib/ai-context.ts`)
   - Purpose: Build context with smart filtering and prioritization
   - Rough approach: Fetch selected + session + matched objects, prioritize by relevance
   - Token budget enforcement with fallback strategies

4. **Object Query Tools** (`app/canvas/_lib/ai-tools.ts`)
   - Purpose: AI tools for explicit object searches
   - Rough approach: Firestore queries with filters, return summaries
   - Tools: `findObjects`, `selectObjects`, `describeObjects`, `deleteObjects`

5. **Color Matcher** (`lib/utils/color-match.ts`)
   - Purpose: Match color names to hex values
   - Rough approach: Map of common color names + HSL distance for approximate matches
   - Example: "red" matches "#ff0000", "#dc143c", "#8b0000"

6. **Spatial Filter** (`lib/utils/spatial-filter.ts`)
   - Purpose: Filter objects by canvas regions
   - Rough approach: Divide canvas into grid or zones (left/right/top/bottom/center)
   - Functions: `isInRegion(obj, region)`, `defineRegions(canvasWidth, canvasHeight)`

### Integration Points

**Frontend:**

- `app/canvas/_components/Canvas.tsx` - Pass `sessionId` to AI chat
- `app/canvas/_components/AIAssistant.tsx` (if exists) - Display session history
- Optional: Visual indicators for AI-created objects

**Backend:**

- `app/api/ai/chat/route.ts` - Session management and enhanced context building
- Query parsing before AI call
- Tool implementations for object operations

**Database:**

- **Firestore:**
  - Update `canvases/{canvasId}/objects/{objectId}` with AI metadata
  - Add `canvases/{canvasId}/aiSessions/{sessionId}` collection (Option C/D)
  - Indexes: `(canvasId, fill)`, `(canvasId, type)`, `(canvasId, aiSessionId)`
- **No Realtime DB changes needed** (AI doesn't need realtime object updates)

**APIs/Services:**

- OpenAI API - existing integration, no changes
- Firestore SDK - new query patterns
- Optional: Color parsing library (if not building custom)

---

## Success Criteria (Preliminary)

- User can reference AI-created objects by description across multiple messages
- AI correctly identifies objects by color, type, and approximate location (>80% accuracy in testing)
- Context stays under 2500 tokens even with 500 objects on canvas
- AI handles ambiguity gracefully (asks for clarification or picks intelligently)
- Session history persists across page reloads (if we choose persistent sessions)
- No performance degradation on large canvases (queries <100ms)

---

## Next Steps

### Before Moving to PRD

- [ ] Discuss and decide on approach (Option A vs B vs C vs D)
- [ ] Answer open questions about session persistence and token budget
- [ ] Validate assumptions about canvas sizes and typical use cases
- [ ] Prototype query parser with 20 example queries to test accuracy
- [ ] Test color matching algorithm with common color names
- [ ] Decide on ambiguity handling strategy per action type

### To Prepare for PRD Creation

- Gather data on average canvas object counts from production (if available)
- Estimate token costs for different approaches with real context samples
- Build quick prototype of query parser to test feasibility
- Review OpenAI docs for tool calling best practices (multi-step workflows)
- Design session schema and lifecycle (creation, expiration, cleanup)

---

## Discussion Notes

_Space to capture thoughts during the conversation_

---

## Transition to PRD

Once we've discussed and aligned on the approach, we'll create a formal PRD that includes:

- Structured requirements
- Phased implementation plan
- Specific code changes and files
- Detailed acceptance criteria
- Technical specifications
- Test cases and scenarios
- Token budget calculations
