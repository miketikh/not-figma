# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Not-Figma is a real-time collaborative design canvas built with Next.js 15, Firebase, and Konva.js. Users can create/edit shapes (rectangles, circles, lines, text) with live multiplayer cursors, real-time sync, and a comprehensive properties panel. The project uses a distributed locking system to prevent edit conflicts between collaborators.

## Commands

### Development

```bash
npm run dev          # Start dev server with Turbopack at localhost:3000
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run format:check # Check Prettier formatting
```

### Firebase Setup

- Create Firebase project with Authentication (email/password), Firestore, and Realtime Database
- Copy `.env.example` to `.env.local` and add Firebase credentials
- Deploy `firestore.rules` and `database.rules.json` to Firebase Console

### Testing Multiplayer

Open app in multiple browser windows/tabs (use incognito for different users) to test real-time collaboration.

## Architecture

### Real-Time Data Layer

- **Firestore**: Persistent storage for canvas objects with real-time listeners (subscribeToObjects)
- **Realtime Database**: High-frequency updates for cursors (50ms throttle) and presence (30s heartbeat)
- **Lock System**: Distributed locks prevent edit conflicts. Users acquire locks on selection (acquireLock), automatically released after LOCK_TIMEOUT_MS or on deselection (releaseLock)

### State Management

- **Zustand Store** (`app/canvas/_store/canvas-store.ts`): Viewport, active tool, drawing state, and default shape properties. Persists viewport and defaults to localStorage.
- **Local Canvas State**: Managed by Konva Stage/Layer in Canvas.tsx. Shapes are represented as Konva nodes (react-konva components).

### Data Flow

1. User interaction triggers shape factory to create local shape
2. `useObjects` hook converts shape to CanvasObject via factory's `toFirestore()`
3. Firestore CRUD operations in `lib/firebase/firestore.ts`
4. Real-time listener receives updates, converts back via factory's `fromFirestore()`
5. Canvas component updates Konva nodes

### Shape System

- **Shape Factories** (`app/canvas/_lib/shapes.ts`): Each shape type has a factory with `toFirestore()` and `fromFirestore()` converters
- **Shape Components** (`app/canvas/_components/shapes/`): Konva components (KonvaRectangle, KonvaCircle, KonvaLine, KonvaText)
- **Type System** (`types/canvas.ts`): BaseCanvasObject extended by RectangleObject, CircleObject, LineObject, TextObject

### Lock System

- Locks stored as fields on CanvasObject: `lockedBy`, `lockedAt`, `lockTimeout`
- Functions in `lib/firebase/firestore.ts`: acquireLock, releaseLock, renewLock, canEdit, isLockExpired
- Lock timeout constant in `lib/constants/locks.ts`
- Expired locks can be taken over by any user

### File Organization (Next.js App Router)

- **Feature co-location**: Canvas code lives in `app/canvas/` with `_components/`, `_hooks/`, `_lib/`, `_store/`, `_types/` subdirectories
- **Global shared code**: `components/ui/` (shadcn/ui), `lib/` (Firebase, constants), `hooks/` (useAuth), `types/` (shared types)
- **Auth route group**: `app/(auth)/` contains login/signup with shared `_lib/` helpers
- **Underscore convention**: Prefix folders with `_` when they're not routes (Next.js convention)

## Code Conventions

### From .cursor/rules/global.mdc:

- **Locality principle**: Keep components/hooks closest to their concern. If only used in one page, put in that page's `_components/`. If used across a feature (e.g. all auth pages), put in feature folder. If global, put at top level.
- **Clean components**: Extract helper functions to `_lib/` folders, don't embed logic in components
- **Check before writing**: Search for existing helpers (date formatters, converters) in `lib/` folders before creating new ones
- **Never assume**: Always check package.json for libraries, lib/ for helpers, types/ for types
- **No direct shadcn edits**: Never modify `components/ui/` files (from shadcn). Create custom components elsewhere if needed.
- **Library consistency**: Check package.json and stick with existing libraries (e.g. use lucide-react for icons, not alternatives)

### TypeScript

- Strict mode enabled
- Full type safety required
- Types in `types/` for global types, `_types/` for feature-local types

### Performance

- Konva renders at 60 FPS with 500+ objects
- Cursor updates throttled to 50ms
- Presence heartbeats every 30s
- Optimistic updates for smooth UX

### Firebase Write Operations Pattern

**IMPORTANT: Always use safe wrappers for Firebase write operations**

Firebase doesn't accept `undefined` values in writes. To prevent errors, all Firebase write operations use safe wrapper functions that automatically filter out undefined values.

#### Firestore Operations

**Safe wrappers in `lib/firebase/firestore.ts`:**
- `safeSetDoc()` - Use instead of `setDoc()`
- `safeUpdateDoc()` - Use instead of `updateDoc()`

**Example:**
```typescript
import { safeSetDoc, safeUpdateDoc } from '@/lib/firebase/firestore';

// Create document - undefined values automatically filtered
await safeSetDoc(docRef, {
  name: 'John',
  age: undefined,  // This will be filtered out
  email: 'john@example.com'
});

// Update document - undefined values automatically filtered
await safeUpdateDoc(docRef, {
  lastSeen: Date.now(),
  status: undefined  // This will be filtered out
});
```

**Batch operations:**
For `writeBatch()` operations, use the existing `removeUndefinedValues()` helper before adding updates to the batch.

#### Realtime Database Operations

**Safe wrappers in `lib/firebase/realtime-utils.ts`:**
- `safeSet()` - Use instead of `set()`
- `safeUpdate()` - Use instead of `update()`
- `safePush()` - Use instead of `push()`

**Example:**
```typescript
import { safeSet, safeUpdate } from '@/lib/firebase/realtime-utils';
import { ref } from 'firebase/database';

// Set data - undefined values automatically filtered recursively
await safeSet(userRef, {
  name: 'John',
  status: undefined,  // This will be filtered out
  metadata: {
    lastSeen: Date.now(),
    device: undefined  // Nested undefined values also filtered
  }
});

// Update data - undefined values automatically filtered
await safeUpdate(userRef, {
  lastSeen: Date.now(),
  status: undefined  // This will be filtered out
});
```

**Why this pattern?**
- Centralized solution prevents undefined value errors across the entire codebase
- Easy to maintain - all undefined filtering happens in one place
- Drop-in replacements for Firebase SDK functions
- Type-safe with full TypeScript support
- Already used in all Firebase write operations throughout the codebase

**Files that use safe wrappers:**
- `lib/firebase/firestore.ts` - All Firestore CRUD and lock operations
- `lib/firebase/canvas.ts` - Canvas metadata operations
- `lib/firebase/realtime.ts` - Cursor and presence updates
- `lib/firebase/realtime-transforms.ts` - Active transform broadcasts

## Current State

### Working Features ✅

- Canvas pan/zoom, shape creation (rectangle, circle, line)
- Multi-user collaboration with live cursors
- Properties panel with position, size, rotation, colors, opacity, stroke
- Layer management (z-index reordering)
- Lock system preventing edit conflicts
- Keyboard shortcuts (V/H/R/C/L for tools, Delete, Cmd+[/] for layers, Space+drag for pan)
- Auto-save to Firebase

### In Progress 🚧

- Text layers (see `planning/add_text_object.md`)
- Multi-select (see `planning/multi_select.md`)

### Planned 📅

- Copy/paste
- Undo/redo
- AI-powered commands (natural language object creation)
- AI templates (generate forms, layouts)

## Known Issues

- Text layers not yet implemented
- Multi-select not yet available
- Copy/paste not yet functional
- No undo/redo yet
- Stroke dash styles not implemented

## Key Files Reference

- Canvas component: `app/canvas/_components/Canvas.tsx`
- Firestore operations: `lib/firebase/firestore.ts`
- Shape factories: `app/canvas/_lib/shapes.ts`
- Canvas store: `app/canvas/_store/canvas-store.ts`
- Object sync hook: `app/canvas/_hooks/useObjects.ts`
- Type definitions: `types/canvas.ts`
- Lock constants: `lib/constants/locks.ts`
