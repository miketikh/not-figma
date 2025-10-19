# PRD: AI Assistant Personality Enhancement ("Sketchy")

## Feature Overview

Transform the AI assistant from a functional utility into a friendly, engaging creative companion named "Sketchy". This enhancement adds personality through:
- Rebranding with a memorable name and robot persona (🤖 Sketchy)
- Fun, randomized loading states that feel alive
- Animated visual feedback for tool results
- Friendlier welcome message

**Why:** Current AI panel works well functionally but lacks personality and emotional connection. Users should feel excited to use the AI, not just view it as a utility. Adding character makes the experience more delightful and memorable.

## Current State Analysis

### Files Requiring Changes

**Frontend Components:**
- `app/canvas/_components/AIChatPanel.tsx` (Lines 148-149, 342, 184)
  - Update header name and subtitle
  - Replace static "Thinking..." with randomized loading messages
  - Update welcome message copy
  - Add animated tool result badges

**Types (if needed):**
- `types/ai.ts` - May need to extend `AIToolResult` if we add metadata for animations

### Existing Patterns We Can Leverage

- **lucide-react icons** - Already imported in AIChatPanel (Square, Circle, Minus, Type, Check) - can use for animated badges
- **Card component** - Already used for tool results, can enhance with animations
- **Tailwind gradients** - Already using `bg-gradient-to-r from-purple-50 to-blue-50` in header
- **React state management** - Loading states already tracked via `isLoading` in `useAIChat` hook

### Dependencies & Potential Conflicts

- No conflicts expected - this is purely additive UI enhancement
- Does NOT modify AI logic, tools, or backend API
- Does NOT change data structures or Firebase schema
- Loading message rotation needs to respect existing `isLoading` state management

---

## Implementation Approach

### Phase 1: Quick Wins - Name & Loading States (Easy)

**Goal:** Immediate personality boost with minimal code changes

**Changes:**
1. **Header Rebrand**
   - Replace "AI Assistant ✨" with "🤖 Sketchy"
   - Add subtitle "AI design assistant" below name (small text, muted color)

2. **Loading State Messages**
   - Create array of 6-8 fun loading messages
   - Randomly select one each time loading state activates
   - Examples:
     - "🎨 Mixing colors..."
     - "📐 Measuring twice, cutting once..."
     - "✏️ Sketching it out..."
     - "🧮 Crunching the numbers..."
     - "🎯 Finding the perfect spot..."
     - "✨ Working some magic..."

3. **Welcome Message Update**
   - Replace formal welcome with friendly, conversational tone
   - Use Option 1 from brainstorming doc:
     ```
     👋 Hey there! I'm Sketchy, your AI design buddy.

     Tell me what you want to create, and I'll bring it to life!

     Try things like:
     • "Make a red circle at 300, 300"
     • "Create a blue rectangle"
     • "Move it to the center"

     Let's make something awesome! 🎨
     ```

**Files Modified:**
- `app/canvas/_components/AIChatPanel.tsx`

**Technical Approach:**
```typescript
// Loading messages
const LOADING_MESSAGES = [
  "🎨 Mixing colors...",
  "📐 Measuring twice, cutting once...",
  // ... etc
];

const randomMessage = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
```

---

### Phase 2: Visual Polish - Animated Tool Badges (Medium)

**Goal:** Make tool results feel celebratory and alive

**Changes:**
1. **Animated Success Icons**
   - Add CSS animation to tool result icons (brief "pop" on render)
   - Use Tailwind's `animate-bounce` or create custom keyframe
   - Animation triggers once when result appears

2. **Color-Coded Tool Icons**
   - Enhance existing icon backgrounds with tool-specific colors:
     - Rectangle: Blue gradient (`bg-gradient-to-br from-blue-400 to-blue-600`)
     - Circle: Purple gradient (`from-purple-400 to-purple-600`)
     - Line: Orange gradient (`from-orange-400 to-orange-600`)
     - Text: Green gradient (`from-green-400 to-green-600`)
     - Update: Yellow gradient (`from-yellow-400 to-yellow-600`)

3. **Success Badge Enhancement**
   - Add subtle glow/shadow effect on success badges
   - Brighten card background slightly for success states

**Files Modified:**
- `app/canvas/_components/AIChatPanel.tsx`

**Technical Approach:**
```typescript
// Icon color mapping
const getToolColorClass = (toolName: string) => {
  if (toolName.includes('Rectangle')) return 'bg-gradient-to-br from-blue-400 to-blue-600';
  if (toolName.includes('Circle')) return 'bg-gradient-to-br from-purple-400 to-purple-600';
  // ... etc
}

// CSS animation (in Tailwind or custom CSS)
@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
```

---

### Phase 3: Advanced - Context-Aware Messaging (Later)

**Goal:** Make responses feel more intelligent and personalized

**Deferred to future implementation** - requires deeper integration with AI response generation.

**Future enhancements:**
- Tool-specific loading messages (e.g., "🟣 Drawing your circle..." when creating circles)
- Personality in AI response messages (requires modifying `ai-tools.ts` return messages)
- Easter eggs and special responses for fun commands
- Context-aware celebrations (e.g., "10 objects created!")

---

## Implementation Details

### Phase 1 Detailed Changes

#### AIChatPanel.tsx Header (Lines 146-159)

**Current:**
```tsx
<div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
  <div className="flex items-center gap-2">
    <Sparkles className="w-5 h-5 text-purple-600" />
    <h2 className="font-semibold text-lg">AI Assistant</h2>
  </div>
  ...
</div>
```

**New:**
```tsx
<div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
  <div className="flex items-center gap-2">
    <span className="text-2xl">🤖</span>
    <div className="flex flex-col">
      <h2 className="font-semibold text-lg leading-tight">Sketchy</h2>
      <p className="text-xs text-gray-500">AI design assistant</p>
    </div>
  </div>
  ...
</div>
```

#### AIChatPanel.tsx Loading State (Lines 337-346)

**Current:**
```tsx
{isLoading && (
  <div className="flex justify-start">
    <div className="bg-gray-100 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
        <p className="text-sm text-gray-600">Thinking...</p>
      </div>
    </div>
  </div>
)}
```

**New:**
```tsx
{isLoading && (
  <div className="flex justify-start">
    <div className="bg-gray-100 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
        <p className="text-sm text-gray-600">{getRandomLoadingMessage()}</p>
      </div>
    </div>
  </div>
)}
```

Add helper function at top of component:
```tsx
const LOADING_MESSAGES = [
  "🎨 Mixing colors...",
  "📐 Measuring twice, cutting once...",
  "✏️ Sketching it out...",
  "🧮 Crunching the numbers...",
  "🎯 Finding the perfect spot...",
  "✨ Working some magic...",
  "🔍 Analyzing the canvas...",
  "⚡ Powering up...",
];

const getRandomLoadingMessage = () => {
  return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
};
```

#### AIChatPanel.tsx Welcome Message (Lines 176-245)

Replace entire welcome Card content with new copy (structure remains same, just update text).

### Phase 2 Detailed Changes

#### Tool Result Icon Colors (Lines 287-300)

Add new helper function:
```tsx
const getToolColorClass = (toolName: string) => {
  const lowerName = toolName.toLowerCase();
  if (lowerName.includes("rectangle") || lowerName.includes("rect")) {
    return "bg-gradient-to-br from-blue-400 to-blue-600";
  }
  if (lowerName.includes("circle")) {
    return "bg-gradient-to-br from-purple-400 to-purple-600";
  }
  if (lowerName.includes("line")) {
    return "bg-gradient-to-br from-orange-400 to-orange-600";
  }
  if (lowerName.includes("text")) {
    return "bg-gradient-to-br from-green-400 to-green-600";
  }
  // Default for updates/other operations
  return "bg-gradient-to-br from-yellow-400 to-yellow-600";
};
```

Update icon wrapper (line 288-294):
```tsx
<div
  className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 animate-popIn ${
    result.success
      ? getToolColorClass(result.toolName)
      : "bg-red-500 text-white"
  }`}
>
```

Add animation in global CSS or Tailwind config:
```css
@keyframes popIn {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-popIn {
  animation: popIn 0.3s ease-out;
}
```

---

## Considerations

### Edge Cases

1. **Loading message selection:**
   - Message picked once per loading state (doesn't change while loading)
   - No need to track used messages (repetition is acceptable)

2. **Animation performance:**
   - Brief animations (0.3s) won't impact performance
   - Only animates on initial render, not on re-renders

3. **Emoji rendering:**
   - Emojis used are standard Unicode, work across all modern browsers
   - Robot emoji 🤖 has wide support (Unicode 8.0, 2015)

### Testing Strategy

**Manual Testing:**
1. Open AI panel, verify header shows "🤖 Sketchy" with subtitle
2. Send message, verify loading shows random fun message (try multiple times)
3. Verify welcome message matches new copy
4. Create rectangle/circle/line, verify colored animated icons appear
5. Test on different browsers (Chrome, Safari, Firefox) for emoji rendering

**Visual Regression:**
- Tool results should still be readable
- Icons should be visible against colored backgrounds (white icons on colored circles)
- Welcome message should fit in panel without scrolling

### Performance Implications

- **Minimal impact:** Only adds lightweight CSS animations and string randomization
- **No API changes:** Backend untouched, no network performance impact
- **Animation budget:** Single 0.3s animation per tool result badge
- **Memory:** Array of 8 strings (~200 bytes) is negligible

### Accessibility Considerations

1. **Color contrast:** Verify white icons on colored backgrounds meet WCAG AA (4.5:1)
   - Blue: #3b82f6 → white = 4.5:1 ✅
   - Purple: #9333ea → white = 6.3:1 ✅
   - Orange: #f97316 → white = 4.7:1 ✅
   - Green: #22c55e → white = 4.8:1 ✅

2. **Motion sensitivity:** Animations are brief (0.3s) and non-essential
   - Consider adding `prefers-reduced-motion` check in future

3. **Screen readers:**
   - "Sketchy" name is clear and pronounceable
   - Loading messages add context ("Mixing colors" is more informative than "Thinking")

---

## Success Metrics

**Qualitative:**
- Users comment on/notice the personality
- AI feels more engaging and fun to interact with
- First-time users understand Sketchy is the AI assistant

**Quantitative (future):**
- AI panel open rate (do users engage more?)
- Messages sent per session (does personality encourage more interaction?)

---

## Out of Scope (Future Phases)

**Not included in this PRD:**
- Personalized response messages (requires AI tool modifications)
- Tool-specific loading states (requires deeper context awareness)
- Sound effects
- Easter eggs for special commands
- Context-aware celebrations
- Input placeholder randomization

These can be tackled in Phase 3 or separate PRDs after Phase 1-2 validation.

---

## Implementation Priority Summary

**Phase 1 (Immediate - 1-2 hours):**
- ✅ Header rename to "Sketchy 🤖"
- ✅ Randomized loading messages
- ✅ Welcome message update

**Phase 2 (Polish - 2-3 hours):**
- ✅ Animated tool result badges
- ✅ Color-coded tool icons
- ✅ Subtle visual enhancements

**Phase 3 (Advanced - Future):**
- ⏳ Context-aware responses
- ⏳ Personalized AI messages
- ⏳ Easter eggs

---

This PRD focuses on **high-impact, low-effort** changes that immediately transform the user experience without touching AI logic or backend systems.
