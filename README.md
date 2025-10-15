# Not-Figma

A real-time collaborative design canvas built with Next.js, Firebase, and Konva. Create and manipulate shapes together with live multiplayer cursors, real-time sync, and a comprehensive properties panel.

## ✨ Features

### 🎨 Live Now
- **Real-time collaborative canvas** with pan/zoom, smooth 60 FPS performance
- **Create and edit shapes** (rectangles, circles, lines) with drag-to-create, move, resize, and rotate
- **Multi-user collaboration** with live cursors, user presence, and sub-100ms sync across all users
- **Properties panel** with position, size, rotation, colors, opacity, stroke controls, and layer management
- **Conflict prevention** via lock system - no more edit conflicts between users
- **Keyboard shortcuts** for tools (V/H/R/C/L), layers, delete, and space+pan
- **Auto-save** - all changes persist automatically to Firebase
- **Modern homepage** with gradient design and authentication

### 🚧 Coming Soon
- 📝 **Text layers** with editing
- 🎯 **Multi-select** and group operations  
- 📋 **Copy/paste** functionality
- 🤖 **AI-powered commands** - natural language object creation
- 🏗️ **AI templates** - generate forms, layouts, and components

## 🛠️ Tech Stack

- **Framework:** Next.js 15 with TypeScript & App Router
- **Styling:** Tailwind CSS v4 with CSS variables
- **UI Components:** shadcn/ui + Radix UI primitives
- **Database:** Firebase Firestore (objects) + Realtime Database (cursors/presence)
- **Authentication:** Firebase Auth with email/password
- **Canvas Library:** Konva.js with react-konva
- **State Management:** Zustand
- **Icons:** Lucide React
- **Deployment:** Vercel

## 📦 Getting Started

### Prerequisites

- Node.js 20+
- npm, yarn, or pnpm
- Firebase account (free tier works!)

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd not-figma
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up Firebase:**
   - Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable **Authentication** → Email/Password provider
   - Create a **Firestore Database** (start in production mode)
   - Create a **Realtime Database** (start in locked mode)
   - Get your Firebase config from Project Settings

4. **Configure environment variables:**
```bash
cp .env.example .env.local
```

Add your Firebase credentials to `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
```

5. **Set up Firebase Security Rules:**
   - Deploy the rules from `firestore.rules` and `database.rules.json` to your Firebase project
   - Or use the Firebase Console to copy/paste the rules

6. **Run the development server:**
```bash
npm run dev
```

7. **Open your browser:**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Sign up for an account
   - Start creating on the canvas!

### Testing Multiplayer

Open the app in multiple browser windows or tabs (you can use incognito mode for different users) to see real-time collaboration in action.

## 📁 Project Structure

Following Next.js App Router conventions with feature co-location:

```
app/
├── page.tsx                    # Marketing homepage
├── (auth)/                     # Auth route group
│   ├── login/                  # Login page
│   ├── signup/                 # Signup page
│   └── _lib/                   # Auth helpers
├── canvas/                     # Main canvas feature
│   ├── page.tsx                # Canvas page
│   ├── _components/            # Canvas components
│   │   ├── Canvas.tsx          # Main Konva canvas
│   │   ├── Toolbar.tsx         # Tool selection
│   │   ├── PropertiesPanel.tsx # Properties sidebar
│   │   ├── OnlineUsers.tsx     # User presence
│   │   ├── RemoteCursor.tsx    # Multiplayer cursors
│   │   ├── shapes/             # Shape components
│   │   └── properties/         # Property editors
│   ├── _hooks/                 # Canvas hooks
│   │   ├── useObjects.ts       # Object persistence & sync
│   │   ├── useCursors.ts       # Cursor tracking
│   │   └── usePresence.ts      # User presence
│   ├── _lib/                   # Canvas utilities
│   │   ├── shapes.ts           # Shape factories
│   │   ├── locks.ts            # Lock management
│   │   └── layer-management.ts # Z-index utilities
│   ├── _store/                 # Canvas state (Zustand)
│   └── _types/                 # Canvas types
└── profile/                    # User profile page

components/
├── providers/                  # React context providers
└── ui/                         # shadcn/ui components

lib/
├── firebase/                   # Firebase configuration
│   ├── config.ts               # Firebase init
│   ├── auth.ts                 # Auth helpers
│   ├── firestore.ts            # Firestore CRUD + locks
│   └── realtime.ts             # Realtime DB helpers
└── constants/                  # Global constants

hooks/
└── useAuth.ts                  # Global auth hook

types/
├── canvas.ts                   # Canvas types
├── user.ts                     # User types
└── ai.ts                       # AI types (future)
```

## ⌨️ Keyboard Shortcuts

- **V** - Select tool
- **H** - Hand/Pan tool  
- **R** - Rectangle tool
- **C** - Circle tool
- **L** - Line tool
- **Space + Drag** - Pan canvas
- **Delete/Backspace** - Delete selected object
- **Cmd/Ctrl + ]** - Bring forward
- **Cmd/Ctrl + [** - Send backward
- **Cmd/Ctrl + Shift + ]** - Bring to front
- **Cmd/Ctrl + Shift + [** - Send to back

## 🗺️ Development Roadmap

### Phase 1: MVP ✅ Complete
All core collaborative canvas features are live and working in production.

### Phase 2: Enhanced Editing 🚧 In Progress
- ✅ Properties panel
- ✅ Layer management
- ✅ Rotation
- ✅ Advanced styling
- 🚧 Text layers
- 🚧 Multi-select
- 🚧 Copy/paste

### Phase 3: AI Features 📅 Planned
- Natural language object creation
- AI-powered layout commands
- Template generation
- Shared AI state

See [planning/tasks.md](planning/tasks.md) for the complete PR-based development plan.

## 🏗️ Architecture Highlights

### Real-Time Collaboration
- **Firestore** for object persistence with real-time listeners
- **Realtime Database** for high-frequency updates (cursors, presence)
- **Lock system** prevents edit conflicts - users acquire locks on selection
- **Optimistic updates** for smooth UX with eventual consistency

### Performance
- **Konva.js** for hardware-accelerated canvas rendering
- **Zustand** for lightweight, performant state management  
- **Throttled updates** for cursor positions (50ms) and presence heartbeats (30s)
- Designed to handle 500+ objects at 60 FPS

### Code Organization
- **Feature co-location** - canvas code lives in `app/canvas/`
- **Type safety** - Full TypeScript with strict mode
- **Component isolation** - Each shape is its own React component
- **Separation of concerns** - Hooks for business logic, components for UI

## 🐛 Known Issues

- Text layers not yet implemented
- Multi-select not yet available
- Copy/paste not yet functional
- No undo/redo yet
- Stroke dash styles not implemented

## 📝 License

MIT

## 🤝 Contributing

This is a learning project built to explore real-time collaboration patterns and AI-assisted development. Feel free to fork and experiment!

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/), [Firebase](https://firebase.google.com/), and [Konva.js](https://konvajs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

---

Built with ❤️ using AI-assisted development (Claude Sonnet 4.5)
