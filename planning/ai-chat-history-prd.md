# AI Chat History Persistence - Product Requirements Document

**Status:** Ready for Implementation
**Date:** 2025-10-17
**Version:** 1.0

---

## 1. Feature Overview

### What We're Building

A persistent chat history system for the AI assistant that stores conversations per-canvas in Firestore. Users will be able to see their conversation history when they return to a canvas, and can clear the history via a confirmation dialog when needed.

### Why We're Building It

- **Continuity:** Users expect their conversations to persist across sessions, especially when working on the same canvas over multiple days
- **Context:** Chat history provides valuable context for the AI to understand the canvas evolution and user's design intent
- **Reference:** Users can review past AI suggestions and commands to recreate patterns or troubleshoot issues
- **Professional UX:** Session-only chat history feels incomplete and unprofessional compared to industry standards (ChatGPT, Claude, etc.)

### Scope

- **Phase 1 (MVP):** Per-canvas chat history stored in Firestore with real-time sync, clear chat with confirmation dialog
- **Out of Scope:** Cross-canvas search, chat export, user-level conversation history, shared chat history between collaborators

---

## 2. Current State Analysis

### Current Implementation

**Chat State Management** (`app/canvas/_store/canvas-store.ts`)

- Chat history stored in Zustand: `chatHistory: AIChatMessage[]`
- Explicitly NOT persisted to localStorage (session-only)
- Actions: `addChatMessage()`, `clearChatHistory()`
- Lives in memory only, cleared on page refresh

**Chat UI** (`app/canvas/_components/AIChatPanel.tsx`)

- Displays messages from `chatHistory` in Zustand store
- Auto-scrolls to bottom on new messages
- Shows user/assistant messages with timestamps and tool results
- Has welcome message when `chatHistory.length === 0`
- Currently no "Clear Chat" button

**Message Types** (`types/ai.ts`)

```typescript
export interface AIChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  toolResults?: AIToolResult[];
}
```

**Firestore Patterns** (`lib/firebase/firestore.ts`)

- Uses nested collections: `canvases/{canvasId}/objects/{objectId}`
- CRUD operations: `createObject()`, `getAllObjects()`, `subscribeToObjects()`
- Real-time listeners with `onSnapshot()`
- Path helpers: `getObjectsCollectionPath(canvasId)`

**Firestore Security Rules** (`firestore.rules`)

- Canvas ownership: `resource.data.createdBy == request.auth.uid`
- Objects subcollection: Currently allows any authenticated user to read/write
- TODO comment: "Later: check if user has read/write permission on the parent canvas"

### Files That Will Need Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `types/ai.ts` | Extend | Add `canvasId` and `userId` fields to `AIChatMessage` for Firestore storage |
| **NEW:** `lib/firebase/chat.ts` | Create | Firestore CRUD operations for chat messages |
| `app/canvas/_hooks/useAIChat.ts` | Update | Integrate Firestore writes when adding messages |
| **NEW:** `app/canvas/_hooks/useChatHistory.ts` | Create | Hook for subscribing to chat history from Firestore |
| `app/canvas/_components/AIChatPanel.tsx` | Update | Add "Clear Chat" button with confirmation, use Firestore data |
| **NEW:** `app/canvas/_components/ClearChatDialog.tsx` | Create | Confirmation dialog for clearing chat |
| `app/canvas/_store/canvas-store.ts` | Update | Remove `chatHistory` from store (now comes from Firestore), keep `clearChatHistory` for triggering clear |
| `firestore.rules` | Extend | Add security rules for `canvases/{canvasId}/chat/{messageId}` |
| `app/canvas/[canvasId]/page.tsx` | Update | Initialize chat history subscription when canvas loads |

### Existing Patterns We Can Leverage

1. **Nested Collections:** Follow same pattern as objects: `canvases/{canvasId}/chat/{messageId}`
2. **Real-time Subscriptions:** Use `onSnapshot()` pattern from `subscribeToObjects()`
3. **Path Helpers:** Create `getChatCollectionPath(canvasId)` following `getObjectsCollectionPath()`
4. **Hook Pattern:** `useChatHistory()` will mirror `useObjects()` structure
5. **Confirmation Dialogs:** Similar pattern to `DeleteCanvasDialog` component
6. **Auto-scroll Behavior:** Already implemented in `AIChatPanel.tsx` with `messagesEndRef`

### Potential Conflicts & Dependencies

**Lock System Interaction:**
- No conflicts - chat messages are independent of object locks
- Chat history shows ALL messages (both users in collaborative canvas)

**Real-time Collaboration:**
- **Critical Decision:** Should chat history be shared between collaborators or per-user?
- **Decision:** Per-canvas, shared by all collaborators (see Key Technical Decisions)
- Collaborators see each other's AI conversations in real-time
- Provides transparency about what changes other users made via AI

**Chat State Management:**
- Current Zustand store manages `chatHistory` array
- **Migration:** Move to Firestore, Zustand only keeps `aiChatOpen` flag
- `addChatMessage()` becomes a Firestore write operation
- Component reads from Firestore subscription, not Zustand

**Performance:**
- Loading 100+ message history could be slow
- Need pagination or limit (load recent 50 messages, "Load More" for history)
- Auto-scroll should only trigger for new messages, not on history load

---

## 3. Implementation Approach

### Phase 1: Firestore Schema & Security Rules

**Goal:** Define data structure and access controls

#### 1. Extend AIChatMessage Type

Update `types/ai.ts`:

```typescript
export interface AIChatMessage {
  id: string;
  canvasId: string; // NEW - for Firestore document path
  userId: string; // NEW - who sent the message
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  toolResults?: AIToolResult[];
}
```

#### 2. Firestore Collection Structure

**Path:** `canvases/{canvasId}/chat/{messageId}`

**Document Structure:**

```typescript
{
  id: "msg_abc123",
  canvasId: "canvas_xyz",
  userId: "user_123", // Who sent the message (for user messages) or triggered AI (for assistant messages)
  role: "user" | "assistant" | "system",
  content: "Create a red circle at 100, 200",
  timestamp: 1697654321000,
  toolResults: [
    {
      toolName: "createCircle",
      success: true,
      objectIds: ["obj_xyz"],
      message: "Created circle"
    }
  ]
}
```

**Indexes:**
- Composite index on `(canvasId, timestamp)` for efficient querying (Firestore will prompt to create)

#### 3. Security Rules

Add to `firestore.rules` inside the `canvases/{canvasId}` match block:

```javascript
// Rules for chat subcollection within each canvas
match /chat/{messageId} {
  // Allow read if authenticated and user owns the parent canvas
  allow read: if isAuthenticated() && get(/databases/$(database)/documents/canvases/$(canvasId)).data.createdBy == request.auth.uid;

  // Allow write if authenticated and user owns the parent canvas
  allow write: if isAuthenticated() && get(/databases/$(database)/documents/canvases/$(canvasId)).data.createdBy == request.auth.uid;
}
```

**Note:** For Phase 1, only canvas owners can access chat. Phase 2+ can extend to shared canvases with collaborator permissions.

### Phase 2: Firestore Operations Layer

**Goal:** Create CRUD functions for chat messages

#### 4. Create Firestore Helper File

Create `lib/firebase/chat.ts`:

```typescript
// Functions to implement:
- getChatCollectionPath(canvasId: string): string
- getChatMessageRef(canvasId: string, messageId: string)
- createChatMessage(canvasId: string, message: AIChatMessage): Promise<void>
- getAllChatMessages(canvasId: string): Promise<AIChatMessage[]>
- subscribeToChatMessages(canvasId, callback, onError): Unsubscribe
- clearChatHistory(canvasId: string): Promise<void> // Batch delete all messages
```

**Implementation Details:**

- Use `collection()`, `doc()`, `setDoc()`, `query()`, `orderBy()`, `onSnapshot()` from Firebase SDK
- Order messages by `timestamp` ascending (oldest first)
- `clearChatHistory()` uses `writeBatch()` to delete all messages atomically
- Follow same patterns as `lib/firebase/firestore.ts` for consistency

### Phase 3: React Hook for Chat History

**Goal:** Provide real-time chat history to components

#### 5. Create Chat History Hook

Create `app/canvas/_hooks/useChatHistory.ts`:

```typescript
export function useChatHistory(canvasId: string) {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToChatMessages(
      canvasId,
      (messages) => {
        setMessages(messages);
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [canvasId]);

  return { messages, loading, error };
}
```

**Features:**
- Real-time updates via Firestore listener
- Loading and error states
- Auto-cleanup on unmount

### Phase 4: Update AI Chat Hook

**Goal:** Integrate Firestore writes into message sending

#### 6. Update useAIChat Hook

Modify `app/canvas/_hooks/useAIChat.ts`:

- Import `createChatMessage` from `lib/firebase/chat.ts`
- When adding user message, write to Firestore instead of Zustand:

```typescript
const userMessage: AIChatMessage = {
  id: `user-${Date.now()}`,
  canvasId,
  userId: user.uid,
  role: "user",
  content: message,
  timestamp: Date.now(),
};

// Write to Firestore (real-time listener will update UI)
await createChatMessage(canvasId, userMessage);
```

- Same for assistant messages after API response
- Remove calls to `addChatMessage()` from Zustand store (no longer needed)

### Phase 5: Update Canvas Store

**Goal:** Remove chat history from in-memory state

#### 7. Update Canvas Store

Modify `app/canvas/_store/canvas-store.ts`:

**Remove:**
- `chatHistory: AIChatMessage[]` state
- `addChatMessage()` action

**Keep:**
- `aiChatOpen: boolean` (UI state only)
- `toggleAIChat()` action

**Add:**
- `clearingChat: boolean` state (for loading indicator during clear)
- `setClearingChat(boolean)` action

**Reasoning:** Chat history now comes from Firestore via `useChatHistory()` hook, not Zustand.

### Phase 6: Clear Chat Dialog Component

**Goal:** Create confirmation dialog for clearing chat

#### 8. Create ClearChatDialog Component

Create `app/canvas/_components/ClearChatDialog.tsx`:

**Features:**
- AlertDialog from shadcn/ui
- Title: "Clear Chat History?"
- Description: "This will permanently delete all messages in this conversation. This action cannot be undone."
- Two buttons:
  - "Cancel" (secondary)
  - "Clear Chat" (destructive variant)
- Props: `open`, `onConfirm`, `onCancel`

**Similar to:** `DeleteCanvasDialog` component pattern

### Phase 7: Update Chat Panel UI

**Goal:** Integrate Firestore data and clear functionality

#### 9. Update AIChatPanel Component

Modify `app/canvas/_components/AIChatPanel.tsx`:

**Changes:**

1. **Use Firestore Data:**
   ```typescript
   const { messages, loading, error } = useChatHistory(canvasId);
   // Replace chatHistory from Zustand with messages from hook
   ```

2. **Add Clear Chat Button:**
   - Position: Header area, next to close button (X)
   - Icon: `Trash2` from lucide-react
   - Opens `ClearChatDialog` on click

3. **Handle Clear Action:**
   ```typescript
   const handleClearChat = async () => {
     setClearingChat(true);
     try {
       await clearChatHistory(canvasId);
       addToast({
         title: "Chat cleared",
         description: "Your conversation history has been deleted.",
         variant: "success",
       });
     } catch (error) {
       addToast({
         title: "Failed to clear chat",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setClearingChat(false);
       setShowClearDialog(false);
     }
   };
   ```

4. **Loading State:**
   - Show skeleton loaders while `loading === true`
   - Don't auto-scroll during initial history load (only for new messages)

5. **Auto-scroll Logic:**
   - Track previous message count
   - Only auto-scroll if `messages.length > previousCount` (new message added)
   - Don't scroll on initial load or "Load More" actions

### Phase 8: Canvas Page Integration

**Goal:** Initialize chat history when canvas loads

#### 10. Update Canvas Page

Modify `app/canvas/[canvasId]/page.tsx`:

- No direct changes needed
- `AIChatPanel` component handles its own subscription via `useChatHistory()` hook
- Subscription only activates when `aiChatOpen === true` (performance optimization)

**Alternative Approach:** Pre-load chat history on page load (not recommended, adds unnecessary Firestore reads)

---

## Key Technical Decisions

### Decision 1: Chat History Shared Between Collaborators (Not Per-User)

**Rationale:**

- **Transparency:** All users see what AI changes were made by whom
- **Collaboration:** Users can build on each other's AI commands
- **Simplicity:** Single source of truth, no complex merging
- **Firestore Efficiency:** One collection per canvas, not per user

**Trade-offs:**
- Privacy: Users see each other's conversations (acceptable for collaborative design tool)
- Chat clarity: Need to show which user sent each message (add `userId` to message display)

**Alternative Considered:** Per-user chat history
- More private but isolated
- Requires `canvases/{canvasId}/users/{userId}/chat/{messageId}` structure
- Harder to understand canvas evolution
- Not aligned with collaborative nature of the tool

### Decision 2: Store in Firestore (Not Realtime Database)

**Rationale:**

- **Consistency:** All persistent data (canvases, objects) already in Firestore
- **Complex Queries:** Firestore better for filtering, ordering, pagination
- **Offline Support:** Firestore has better offline caching
- **Security Rules:** More granular control with Firestore rules

**Trade-offs:**
- Slightly higher latency than Realtime Database (acceptable for chat, not high-frequency like cursors)
- More expensive than RTDB for write-heavy workloads (chat is read-heavy)

**Alternative Considered:** Realtime Database
- Used for cursors (high-frequency, ephemeral data)
- Chat history is persistent and infrequent (user sends 1 message every 10-30 seconds)
- Firestore is better fit

### Decision 3: No Pagination in Phase 1 (Load All Messages)

**Rationale:**

- **Simplicity:** Most canvases will have < 50 messages
- **Context:** AI benefits from full conversation history
- **User Expectation:** Users expect to see full history when opening chat

**Mitigation for Large Chats:**
- Firestore query limit of 100 messages (add `.limit(100)` to query)
- If chat grows beyond 100, oldest messages won't load (acceptable for MVP)
- Phase 2 can add "Load More" button for pagination

**Alternative Considered:** Pagination from start
- Over-engineering for MVP
- Adds UI complexity (loading states, scroll position management)
- Can be added later without breaking changes

### Decision 4: Clear Chat Requires Confirmation (With Typed Confirmation)

**Initial Proposal:** Simple confirmation dialog with "Yes/No"

**Better Approach:** AlertDialog with descriptive text (no typing required)

**Rationale:**
- Chat messages are less critical than canvas deletion (no need for typed confirmation)
- Most users won't have extensive chat history yet (MVP phase)
- Simple confirmation is sufficient safety measure
- Matches industry standards (ChatGPT has simple "Clear conversation" confirmation)

**Implementation:**
- AlertDialog with clear warning text
- Two-button layout: "Cancel" / "Clear Chat" (destructive)
- No typing requirement (unlike DeleteCanvasDialog)

---

## UX Flow

### Returning to Canvas with History

1. User opens canvas page: `/canvas/abc123`
2. User clicks AI assistant button (sparkles icon)
3. Chat panel slides in from right
4. **NEW:** Loading skeleton appears briefly (< 500ms)
5. **NEW:** Previous conversation history appears in chronological order
6. User can scroll through old messages to review past AI commands
7. Input field ready for new message

### Sending New Message (With Persistence)

1. User types: "create a blue rectangle"
2. User presses Enter or clicks Send
3. **NEW:** Message immediately written to Firestore (optimistic UI update)
4. Loading indicator shows ("AI is thinking...")
5. API processes request
6. **NEW:** Assistant response written to Firestore
7. Real-time listener updates UI for all connected users
8. User sees response appear in chat

### Clearing Chat History

1. User clicks Trash icon in chat panel header
2. **NEW:** Confirmation dialog appears:
   - Title: "Clear Chat History?"
   - Description: "This will permanently delete all messages in this conversation. This action cannot be undone."
   - Buttons: "Cancel" / "Clear Chat" (red)
3. User clicks "Clear Chat"
4. **NEW:** Loading state on button ("Clearing...")
5. **NEW:** Batch delete operation removes all messages from Firestore
6. Chat panel shows empty state (welcome message)
7. Toast notification: "Chat cleared successfully"

### Collaboration Scenario (Multiple Users)

1. User A opens canvas, sees their previous chat history
2. User B opens same canvas, sees **same chat history** (shared)
3. User A sends AI command: "create a circle"
4. User B sees User A's message appear in real-time in their chat panel
5. User B sees AI response appear in real-time
6. User B sees circle appear on canvas (normal object sync)
7. Both users have full context of canvas evolution via AI

**Note:** Phase 1 shows all messages as unified history. Phase 2+ can add visual indicators (user avatars, colors) to distinguish who sent each message.

---

## 4. Considerations

### Edge Cases to Handle

**1. Canvas Deleted While Chat Panel Open**

- **Scenario:** User has chat open, another user deletes the canvas
- **Handling:** Firestore subscription will error (document not found)
- **Response:** Close chat panel, show toast: "Canvas no longer exists"

**2. Very Long Chat History (100+ messages)**

- **Scenario:** User has extensive conversation history, takes time to load
- **Handling:** Query limited to recent 100 messages with `.limit(100)`
- **Response:** Show loading skeleton during load, "Load More" in Phase 2

**3. Network Offline During Message Send**

- **Scenario:** User sends message while offline
- **Handling:** Firestore offline persistence will queue write
- **Response:** Message appears locally, syncs when online, show "pending" indicator

**4. Clear Chat While Messages Still Sending**

- **Scenario:** User clears chat while AI is processing a response
- **Handling:** Batch delete doesn't affect in-flight API request
- **Response:** Assistant message may arrive after clear (appears in empty chat)
- **Mitigation:** Disable clear button while `isLoading === true`

**5. Concurrent Clear Operations**

- **Scenario:** Two users try to clear chat simultaneously
- **Handling:** Firestore batch operations are idempotent (safe)
- **Response:** Both operations succeed, chat cleared once

**6. Message Creation Race Conditions**

- **Scenario:** Two users send AI commands at exact same time
- **Handling:** Each gets unique message ID (timestamp-based)
- **Response:** Both messages stored, appear in chronological order

**7. Permission Changes Mid-Session**

- **Scenario:** User loses canvas access while chat panel open
- **Handling:** Firestore listener will error on next read
- **Response:** Show error, redirect to canvas list

**8. Very Rapid Message Sending (Spam)**

- **Scenario:** User spams messages quickly
- **Handling:** Existing rate limiting in API route (10 commands/minute)
- **Response:** API returns 429, error message in chat

**9. Message Too Large (Content Size)**

- **Scenario:** AI response exceeds Firestore document size limit (1 MB)
- **Handling:** Truncate `content` field, add "... [truncated]"
- **Response:** Partial message stored, full response logged server-side

**10. Initial Load Performance**

- **Scenario:** Loading 100 messages with tool results (large payload)
- **Handling:** Show loading skeleton, lazy render messages off-screen
- **Response:** Acceptable load time (< 2 seconds), virtualization in Phase 2

### Potential Risks & Technical Challenges

**Risk 1: Firestore Read Cost**

- **Description:** Every chat panel open = 1 read per message + ongoing listener
- **Impact:** 100 messages = 100 reads, plus 1 read per new message
- **Mitigation:**
  - Limit queries to 100 messages (`.limit(100)`)
  - Firestore caches aggressively (subsequent opens are free)
  - Most canvases will have < 20 messages in practice
- **Severity:** Low (within free tier for moderate usage)

**Risk 2: Batch Delete Performance**

- **Description:** Deleting 100+ messages in single batch may timeout
- **Impact:** Clear operation fails, partial deletion
- **Mitigation:**
  - Firestore batch limit is 500 operations (safe for Phase 1)
  - Phase 2 can implement chunked deletion for 500+ messages
  - Show loading indicator during operation
- **Severity:** Low (most chats < 100 messages)

**Risk 3: Real-time Sync Conflicts**

- **Description:** Message order may appear inconsistent across users due to network lag
- **Impact:** Confusing UX ("Why did my message appear before theirs?")
- **Mitigation:**
  - Always order by `timestamp` field (server timestamp)
  - Show timestamps on messages for clarity
  - Acceptable lag (< 1 second in practice)
- **Severity:** Low (Firestore handles this well)

**Risk 4: Chat History Bloat**

- **Description:** Long-running canvases could accumulate 1000+ messages
- **Impact:** Slow load times, high storage costs
- **Mitigation:**
  - Phase 1: 100-message limit (drop oldest)
  - Phase 2: Archive old messages (move to cold storage)
  - Phase 3: Message expiration policy (auto-delete after 90 days)
- **Severity:** Medium (future scaling concern)

**Risk 5: Privacy Concerns**

- **Description:** Shared chat history may expose sensitive information
- **Impact:** Users uncomfortable sharing AI prompts with collaborators
- **Mitigation:**
  - Document behavior in user guide
  - Phase 2: Private chat option (per-user mode)
  - Canvas owners can clear history to remove sensitive data
- **Severity:** Low (acceptable for MVP)

**Risk 6: Message Delivery Failures**

- **Description:** Firestore write fails, user thinks message sent but it's lost
- **Impact:** Loss of context, user confusion
- **Mitigation:**
  - Retry logic on write failures (exponential backoff)
  - Show error toast if write fails after retries
  - Optimistic UI with "sending..." indicator
- **Severity:** Medium (UX impact)

### Testing Strategy

#### Unit Tests

- Firestore operations (`lib/firebase/chat.ts`)
  - `createChatMessage()` writes correctly formatted documents
  - `clearChatHistory()` deletes all messages in batches
  - Path helpers return correct Firestore paths
- Security rules (Firebase Emulator)
  - Only canvas owner can read/write chat
  - Unauthenticated users cannot access chat
  - Users cannot access other users' canvas chats

#### Integration Tests

- Chat History Hook (`useChatHistory`)
  - Subscription receives real-time updates
  - Loading states transition correctly
  - Error handling on Firestore failures
- AI Chat Hook (`useAIChat`)
  - Messages written to Firestore (not just Zustand)
  - Firestore writes include correct `canvasId` and `userId`

#### Manual Testing Scenarios

1. **Basic Persistence**
   - Send messages in chat
   - Refresh page
   - Verify messages reappear

2. **Real-time Collaboration**
   - Open canvas in two browser tabs (different users)
   - User A sends AI command
   - Verify User B sees message in real-time

3. **Clear Chat**
   - Accumulate 10+ messages
   - Click Trash icon
   - Confirm deletion
   - Verify all messages removed
   - Verify toast notification appears

4. **Large History Load**
   - Seed canvas with 100 messages (via script)
   - Open chat panel
   - Verify loading skeleton appears
   - Verify all messages load correctly
   - Verify auto-scroll to bottom

5. **Offline Mode**
   - Disconnect network
   - Send message
   - Verify optimistic UI update
   - Reconnect network
   - Verify message syncs to Firestore

6. **Error Handling**
   - Simulate Firestore write failure (block network)
   - Verify error toast appears
   - Verify retry logic works

#### Load/Performance Tests

- Open chat with 100 messages → Measure load time (target: < 2 seconds)
- Send 10 rapid messages → Verify all stored correctly
- Clear chat with 100 messages → Measure delete time (target: < 3 seconds)
- Multiple users (5) sending messages concurrently → Verify all messages appear in correct order

### Performance Implications

**Initial Load:**

- 100 messages with timestamps/tool results ≈ 50 KB payload
- Expected load time: 500ms - 1 second (acceptable)
- Firestore caching: Subsequent loads instant (cached locally)

**Real-time Updates:**

- Each new message = 1 Firestore document write
- Listener receives update in < 500ms typically
- No impact on canvas rendering performance (separate data path)

**Clear Chat Operation:**

- Batch delete of 100 messages ≈ 100 write operations
- Expected time: 1-2 seconds with loading indicator
- User can continue canvas work during clear (non-blocking)

**Firestore Costs (Estimated):**

- Initial load: 100 reads (first time), 0 reads (cached)
- New message: 1 write per message
- Real-time listener: 1 read per message received
- Clear chat: N write operations (N = message count)
- Monthly cost at 1000 messages/month: ~$0.50 (well within free tier)

### Security Implications

**Access Control:**

- Only canvas owner can read/write chat messages (Phase 1)
- Firestore security rules enforce server-side validation
- No client-side only checks (rules are authoritative)

**Data Privacy:**

- Chat messages stored in plaintext in Firestore
- Encrypted at rest by Firebase (Google Cloud infrastructure)
- Not end-to-end encrypted (users should avoid sensitive data)

**Message Content Validation:**

- No special validation needed (text content only)
- Firestore document size limit (1 MB) prevents abuse
- Rate limiting in API route prevents spam

**User Attribution:**

- `userId` field prevents impersonation
- Set from Firebase Auth token (server-side verified in API route)
- Client cannot forge `userId` field

**Injection Attacks:**

- Chat content displayed as plain text (React auto-escapes)
- No HTML rendering in messages (safe from XSS)
- Tool results are structured data (not executable)

---

## 5. Success Criteria

### Phase 1 MVP

- [ ] Chat history persists across page refreshes
- [ ] Users can see full conversation history when returning to canvas
- [ ] "Clear Chat" button successfully deletes all messages
- [ ] Confirmation dialog prevents accidental deletion
- [ ] Real-time sync: Collaborators see each other's messages appear live
- [ ] Loading states provide clear feedback (skeleton loaders)
- [ ] Error handling shows actionable error messages
- [ ] Performance: Chat loads in < 2 seconds with 100 messages
- [ ] Security: Only canvas owner can access chat (enforced by Firestore rules)
- [ ] No regression: AI functionality works identically to before

### Qualitative Goals

- Users report confidence in conversation persistence
- No confusion about where messages are stored
- Clear chat feature feels safe (confirmation prevents mistakes)
- Collaborative transparency: Teams appreciate seeing shared AI history

---

## 6. Out of Scope (Future Work)

- **Cross-canvas search:** Search all AI conversations across canvases
- **Chat export:** Download conversation as text/JSON file
- **Message editing:** Edit past messages (immutable for MVP)
- **Message deletion:** Delete individual messages (all-or-nothing for MVP)
- **Starred messages:** Bookmark important AI responses
- **Chat sharing:** Share conversation link with others
- **Per-user chat mode:** Private chat option (collaborators don't see each other's messages)
- **Message threading:** Reply to specific messages (linear conversation only)
- **Rich message formatting:** Markdown, code blocks, etc. (plain text only)
- **Message reactions:** Emoji reactions to messages
- **Chat analytics:** Track most-used commands, success rates
- **Message expiration:** Auto-delete old messages after N days
- **Chat archive:** Move old messages to cold storage
- **Pagination UI:** "Load More" button for > 100 messages (hard limit for MVP)
- **Message notifications:** Notify users of new messages while panel closed

---

## 7. Dependencies & Prerequisites

### External Dependencies

- Firestore (already configured in project)
- Firebase Auth (already configured in project)
- No new dependencies needed

### Internal Prerequisites

- Zustand store with AI state (✅ Complete)
- AI chat panel component (✅ Complete)
- `useAIChat` hook for message sending (✅ Complete)
- Firestore patterns established (✅ Complete)
- Canvas ownership system (✅ Complete)

### Nice-to-Haves (Not Blockers)

- Toast notification system (already exists)
- Skeleton loader components (can use simple placeholders)
- Error boundary for graceful error handling

---

## 8. Next Steps

### Immediate Actions

1. Create feature branch: `feature/persistent-chat-history`
2. Update `types/ai.ts` with `canvasId` and `userId` fields
3. Create `lib/firebase/chat.ts` with Firestore operations
4. Update `firestore.rules` with chat collection security rules
5. Deploy rules to Firebase Console for testing

### Implementation Order

1. **Backend & Data Layer** (Day 1-2)
   - Extend AIChatMessage type
   - Create Firestore operations file
   - Update security rules
   - Test CRUD operations with Firebase Emulator

2. **React Hooks** (Day 3)
   - Create `useChatHistory` hook
   - Update `useAIChat` to write to Firestore
   - Test subscriptions and real-time updates

3. **UI Components** (Day 4-5)
   - Create `ClearChatDialog` component
   - Update `AIChatPanel` with Firestore integration
   - Add Clear Chat button and loading states
   - Update canvas store (remove chatHistory)

4. **Integration & Testing** (Day 6)
   - Test full flow: send message → persist → reload → see history
   - Test clear chat flow with confirmation
   - Test collaboration: multiple users, real-time sync
   - Test error cases: offline, permission denied, etc.

5. **Polish & Documentation** (Day 7)
   - Loading skeleton improvements
   - Error message refinement
   - Update README with chat persistence details
   - Add user-facing help text ("Chat history is saved")

### Review Checkpoints

- Firestore operations complete → Code review + emulator testing
- Hooks complete → Integration testing with real Firebase
- UI complete → UX review (confirmation dialog flow, loading states)
- Before merge → Security review (Firestore rules, userId attribution)

---

## Appendix: Firestore Schema Reference

### Collection Path

```
canvases/{canvasId}/chat/{messageId}
```

### Document Structure

```typescript
{
  // Identity
  id: string;                    // Message ID (e.g., "msg_1697654321000")
  canvasId: string;              // Parent canvas ID (denormalized for queries)

  // Attribution
  userId: string;                // User who sent/triggered this message

  // Message content
  role: "user" | "assistant" | "system";
  content: string;               // Message text
  timestamp: number;             // Milliseconds since epoch

  // AI execution results (optional)
  toolResults?: Array<{
    toolName: string;            // e.g., "createCircle"
    success: boolean;
    objectIds?: string[];        // Canvas object IDs created/modified
    message: string;             // Result description
    error?: string;              // Error message if failed
  }>;
}
```

### Indexes Required

- Composite index: `(canvasId, timestamp ASC)` - for ordering messages chronologically

### Security Rules

```javascript
service cloud.firestore {
  match /databases/{database}/documents {
    // Inside canvases/{canvasId} match block:
    match /chat/{messageId} {
      // Only canvas owner can read/write chat messages
      allow read: if isAuthenticated() &&
        get(/databases/$(database)/documents/canvases/$(canvasId)).data.createdBy == request.auth.uid;

      allow write: if isAuthenticated() &&
        get(/databases/$(database)/documents/canvases/$(canvasId)).data.createdBy == request.auth.uid;
    }
  }
}
```

### Query Examples

**Get all messages for canvas:**

```typescript
const q = query(
  collection(db, `canvases/${canvasId}/chat`),
  orderBy("timestamp", "asc"),
  limit(100)
);
```

**Subscribe to real-time updates:**

```typescript
const unsubscribe = onSnapshot(q, (snapshot) => {
  const messages = snapshot.docs.map(doc => doc.data() as AIChatMessage);
  callback(messages);
});
```

**Clear all messages (batch delete):**

```typescript
const batch = writeBatch(db);
const snapshot = await getDocs(collection(db, `canvases/${canvasId}/chat`));
snapshot.docs.forEach(doc => {
  batch.delete(doc.ref);
});
await batch.commit();
```

---

**End of PRD**
