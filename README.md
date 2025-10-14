# Not-Figma

A real-time collaborative design canvas built with Next.js, Firebase, and AI. Think Figma-lite with natural language object creation and manipulation.

## 🚀 Features

### MVP (Phase 1)
- ✨ Real-time collaborative canvas with pan/zoom
- 🎨 Create and manipulate shapes (rectangles, circles, lines, text)
- 👥 Live multiplayer cursors with user presence
- 🔐 User authentication
- 💾 Persistent object storage

### Phase 2 (Enhanced Editing)
- 🎯 Multi-select and group operations
- 📚 Layer management (z-index)
- ⌨️ Comprehensive keyboard shortcuts
- 📋 Copy/paste functionality
- 🔄 Rotation controls
- 🎨 Advanced styling options
- 🎛️ Properties panel

### Phase 3 (AI-Powered)
- 🤖 Natural language object creation
- 🎯 AI-powered layout commands
- 🏗️ Complex template generation (forms, navbars, etc.)
- 🌐 Shared AI state across users

## 🛠️ Tech Stack

- **Framework:** Next.js 15 with TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** Firebase (Firestore + Realtime Database)
- **Authentication:** Firebase Auth
- **Canvas Library:** TBD (Fabric.js or Konva.js)
- **State Management:** Zustand
- **AI:** OpenAI GPT-4 or Claude (with function calling)

## 📦 Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn or pnpm
- Firebase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd not-figma
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your Firebase credentials to `.env.local`

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

Following Next.js App Router conventions with feature co-location:

```
app/
├── (auth)/          # Auth routes with shared logic
├── canvas/          # Main canvas feature
│   ├── _components/ # Canvas-specific components
│   ├── _hooks/      # Canvas-specific hooks
│   ├── _lib/        # Canvas utilities
│   ├── _store/      # Canvas state management
│   └── _types/      # Canvas type definitions
└── api/             # API routes

components/          # Global shared components only
lib/                 # Global utilities only
hooks/               # Global hooks only
store/               # Global state only
types/               # Global types only
```

## 🗺️ Development Roadmap

See [planning/tasks.md](planning/tasks.md) for the complete PR-based task list.

## 📝 License

MIT

## 🤝 Contributing

This is a learning project. Feel free to fork and experiment!

---

Built with ❤️ using AI-assisted development
