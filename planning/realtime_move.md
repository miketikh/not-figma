# Real-Time Transform Broadcasting

## Overview

Currently, users only see the final position of objects after another user completes a transformation (drag, resize, rotate). This feature adds real-time broadcasting of intermediate transform states so all users see live updates as objects are being moved/resized/rotated.

The implementation uses Firebase Realtime Database (like cursors) with 50ms throttling for low-latency updates. Remote users will see semi-transparent overlays with the transforming user's color and name during active transforms.

---

## PR #1: Core Infrastructure
**Branch:** `feature/realtime-transforms-infrastructure`
**Goal:** Create Realtime Database helpers and type definitions

**Tasks:**
- [x] Create active transform type definitions
  - [x] Define `ActiveTransform` interface with shape-specific properties
  - [x] Define `ActiveTransformMap` type
  - [x] Create `app/canvas/_types/active-transform.ts`
- [x] Create Realtime Database helper functions
  - [x] Implement `broadcastTransform(objectId, userId, transformData)`
  - [x] Implement `clearTransform(objectId)`
  - [x] Implement `subscribeToActiveTransforms(callback)`
  - [x] Add `onDisconnect()` cleanup handlers
  - [x] Create `lib/firebase/realtime-transforms.ts`
- [x] Test basic broadcast/subscribe flow

**Files Created:**
- `app/canvas/_types/active-transform.ts` (NEW)
- `lib/firebase/realtime-transforms.ts` (NEW)

---

## PR #2: Broadcasting from Shape Components
**Branch:** `feature/realtime-transforms-broadcast`
**Goal:** Add transform broadcasting from local user's shape interactions

**Tasks:**
- [ ] Modify RectangleShape component
  - [ ] Add `onTransformMove` prop
  - [ ] Add `onDragMove` handler to broadcast position during drag
  - [ ] Add `onTransform` handler to broadcast size/rotation during transform
  - [ ] Keep existing `onDragEnd` and `onTransformEnd` handlers
- [ ] Modify CircleShape component
  - [ ] Add `onTransformMove` prop
  - [ ] Add `onDragMove` handler for position
  - [ ] Add `onTransform` handler for radii changes
- [ ] Modify LineShape component
  - [ ] Add `onTransformMove` prop
  - [ ] Add `onDragMove` handler for endpoint translation
  - [ ] Add `onTransform` handler for endpoint scaling
- [ ] Modify TextShape component (if exists)
  - [ ] Add `onTransformMove` prop
  - [ ] Add `onDragMove` handler
  - [ ] Add `onTransform` handler
- [ ] Update Canvas component
  - [ ] Add throttled broadcast handler (50ms per object)
  - [ ] Implement `handleTransformMove` callback
  - [ ] Call `broadcastTransform` during active transforms
  - [ ] Call `clearTransform` on transform end
  - [ ] Only broadcast for objects user has locked
- [ ] Test broadcasting with console logs

**Files Modified:**
- `app/canvas/_components/shapes/RectangleShape.tsx`
- `app/canvas/_components/shapes/CircleShape.tsx`
- `app/canvas/_components/shapes/LineShape.tsx`
- `app/canvas/_components/shapes/TextShape.tsx`
- `app/canvas/_components/Canvas.tsx`

---

## PR #3: Receiving Remote Transforms
**Branch:** `feature/realtime-transforms-receive`
**Goal:** Subscribe to and process remote user transforms

**Tasks:**
- [ ] Create useActiveTransforms hook
  - [ ] Subscribe to `activeTransforms` in Realtime DB
  - [ ] Filter out own user's transforms (by userId)
  - [ ] Merge with presence data for user names and colors
  - [ ] Return `Map<objectId, transformWithUserInfo>`
  - [ ] Add stale transform cleanup (>5 seconds old)
  - [ ] Handle subscription lifecycle
  - [ ] Create `app/canvas/_hooks/useActiveTransforms.ts`
- [ ] Integrate hook in Canvas component
  - [ ] Import and call `useActiveTransforms`
  - [ ] Pass active transforms to rendering layer
- [ ] Test receiving transforms from multiple users

**Files Created:**
- `app/canvas/_hooks/useActiveTransforms.ts` (NEW)

**Files Modified:**
- `app/canvas/_components/Canvas.tsx`

---

## PR #4: Rendering Active Transform Overlays
**Branch:** `feature/realtime-transforms-render`
**Goal:** Render semi-transparent overlays for active transforms

**Tasks:**
- [ ] Create ActiveTransformOverlay component
  - [ ] Accept `activeTransform` and `zoom` props
  - [ ] Render Rectangle overlay with semi-transparent fill
  - [ ] Render Circle/Ellipse overlay with semi-transparent fill
  - [ ] Render Line overlay with semi-transparent stroke
  - [ ] Render Text overlay with semi-transparent fill
  - [ ] Add glow effect using user's color
  - [ ] Add user name label above shape (Konva Text)
  - [ ] Disable interaction (`listening={false}`)
  - [ ] Create `app/canvas/_components/ActiveTransformOverlay.tsx`
- [ ] Integrate overlays in Canvas rendering
  - [ ] Map over active transforms
  - [ ] Render `<ActiveTransformOverlay>` for each
  - [ ] Position after base objects but before Transformer
  - [ ] Ensure proper z-index layering
- [ ] Test visual appearance with multiple users
- [ ] Verify overlays don't interfere with interactions

**Files Created:**
- `app/canvas/_components/ActiveTransformOverlay.tsx` (NEW)

**Files Modified:**
- `app/canvas/_components/Canvas.tsx`

---

## PR #5: Polish & Edge Cases
**Branch:** `feature/realtime-transforms-polish`
**Goal:** Handle edge cases and add visual polish

**Tasks:**
- [ ] Handle edge cases
  - [ ] Verify only locked objects broadcast transforms
  - [ ] Handle mid-transform disconnections (onDisconnect cleanup)
  - [ ] Clean up stale transforms (timeout after 5 seconds)
  - [ ] Handle rapid tool switching
  - [ ] Handle lock expiration during transform
- [ ] Visual polish
  - [ ] Fine-tune overlay opacity (0.3-0.5 range)
  - [ ] Add subtle glow/shadow effect
  - [ ] Smooth label positioning
  - [ ] Ensure label remains readable at all zoom levels
- [ ] Performance verification
  - [ ] Test with 5+ users transforming simultaneously
  - [ ] Test with 100+ objects on canvas
  - [ ] Verify 60 FPS maintained
  - [ ] Verify throttling works correctly (50ms)
- [ ] Integration testing
  - [ ] Test all shape types (rectangle, circle, line, text)
  - [ ] Test drag, resize, and rotate operations
  - [ ] Test with varying network conditions
  - [ ] Verify final state matches after transform complete

**Files Modified:**
- `lib/firebase/realtime-transforms.ts` (edge case handling)
- `app/canvas/_components/ActiveTransformOverlay.tsx` (visual polish)
- `app/canvas/_hooks/useActiveTransforms.ts` (cleanup logic)
- `app/canvas/_components/Canvas.tsx` (lock integration checks)

---

## Implementation Checklist

### Phase 1: Infrastructure
- [x] PR #1: Core Infrastructure

### Phase 2: Broadcasting
- [ ] PR #2: Broadcasting from Shape Components

### Phase 3: Receiving
- [ ] PR #3: Receiving Remote Transforms

### Phase 4: Rendering
- [ ] PR #4: Rendering Active Transform Overlays

### Phase 5: Finalization
- [ ] PR #5: Polish & Edge Cases

---

## Technical Specifications

**Update Frequency:** 50ms throttle (20 updates/second)
**Bandwidth per Transform:** ~2 KB/second
**Scalability Target:** 10 concurrent transforms = 20 KB/s
**Latency Target:** Sub-100ms typical

**Database Structure:**
```
sessions/{sessionId}/activeTransforms/{objectId}
  - userId: string
  - objectId: string
  - type: "rectangle" | "circle" | "line" | "text"
  - x: number
  - y: number
  - width?: number
  - height?: number
  - radiusX?: number
  - radiusY?: number
  - x2?: number
  - y2?: number
  - rotation?: number
  - timestamp: number
```

---

## Testing Checklist

- [ ] Single user: Transform broadcasts and clears correctly
- [ ] Two users: Both see each other's transforms in real-time
- [ ] Multiple users: 5+ users transforming different objects simultaneously
- [ ] Stress test: 100+ objects with multiple active transforms
- [ ] Edge case: Disconnection mid-transform cleans up properly
- [ ] Edge case: Rapid tool switching doesn't leave stale transforms
- [ ] Edge case: Lock expiration during transform handled gracefully
- [ ] Performance: 60 FPS maintained with multiple transforms
- [ ] Visual: Overlays render correctly at all zoom levels
- [ ] Integration: Works with all shape types and transform operations
