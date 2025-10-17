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

- [x] Modify RectangleShape component
  - [x] Add `onTransformMove` prop
  - [x] Add `onDragMove` handler to broadcast position during drag
  - [x] Add `onTransform` handler to broadcast size/rotation during transform
  - [x] Keep existing `onDragEnd` and `onTransformEnd` handlers
- [x] Modify CircleShape component
  - [x] Add `onTransformMove` prop
  - [x] Add `onDragMove` handler for position
  - [x] Add `onTransform` handler for radii changes
- [x] Modify LineShape component
  - [x] Add `onTransformMove` prop
  - [x] Add `onDragMove` handler for endpoint translation
  - [x] Add `onTransform` handler for endpoint scaling
- [x] Modify TextShape component (if exists)
  - [x] Add `onTransformMove` prop
  - [x] Add `onDragMove` handler
  - [x] Add `onTransform` handler
- [x] Update Canvas component
  - [x] Add throttled broadcast handler (50ms per object)
  - [x] Implement `handleTransformMove` callback
  - [x] Call `broadcastTransform` during active transforms
  - [x] Call `clearTransform` on transform end
  - [x] Only broadcast for objects user has locked
- [x] Test broadcasting with console logs

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

- [x] Create useActiveTransforms hook
  - [x] Subscribe to `activeTransforms` in Realtime DB
  - [x] Filter out own user's transforms (by userId)
  - [x] Merge with presence data for user names and colors
  - [x] Return `Map<objectId, transformWithUserInfo>`
  - [x] Add stale transform cleanup (>5 seconds old)
  - [x] Handle subscription lifecycle
  - [x] Create `app/canvas/_hooks/useActiveTransforms.ts`
- [x] Integrate hook in Canvas component
  - [x] Import and call `useActiveTransforms`
  - [x] Pass active transforms to rendering layer
- [x] Test receiving transforms from multiple users

**Files Created:**

- `app/canvas/_hooks/useActiveTransforms.ts` (NEW)

**Files Modified:**

- `app/canvas/_components/Canvas.tsx`
- `app/canvas/_components/shapes/index.tsx`
- `app/canvas/_types/active-transform.ts` (type fix)

---

## PR #4: Rendering Active Transform Overlays

**Branch:** `feature/realtime-transforms-render`
**Goal:** Render semi-transparent overlays for active transforms

**Tasks:**

- [x] Create ActiveTransformOverlay component
  - [x] Accept `activeTransform` and `zoom` props
  - [x] Render Rectangle overlay with semi-transparent fill
  - [x] Render Circle/Ellipse overlay with semi-transparent fill
  - [x] Render Line overlay with semi-transparent stroke
  - [x] Render Text overlay with semi-transparent fill
  - [x] Add glow effect using user's color
  - [x] Add user name label above shape (Konva Text)
  - [x] Disable interaction (`listening={false}`)
  - [x] Create `app/canvas/_components/ActiveTransformOverlay.tsx`
- [x] Integrate overlays in Canvas rendering
  - [x] Map over active transforms
  - [x] Render `<ActiveTransformOverlay>` for each
  - [x] Position after base objects but before Transformer
  - [x] Ensure proper z-index layering
- [x] Test visual appearance with multiple users
- [x] Verify overlays don't interfere with interactions

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

- [x] PR #2: Broadcasting from Shape Components

### Phase 3: Receiving

- [x] PR #3: Receiving Remote Transforms

### Phase 4: Rendering

- [x] PR #4: Rendering Active Transform Overlays

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
