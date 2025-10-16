# CollabCanvas UI/UX Design Document

## Current State Analysis & Critique

### What's Working
1. **Clean foundation** - The minimal approach provides a good starting point
2. **Grid background** - The dot grid helps with spatial awareness
3. **Zoom controls placement** - Bottom-right is conventional and accessible
4. **Basic toolbar** - Centered bottom placement follows Figma/design tool conventions

### Critical Issues

#### 1. **Lack of Visual Hierarchy**
- Everything is the same neutral gray/white color
- No clear distinction between workspace and UI chrome
- Header blends into the background
- No visual weight or emphasis on important elements

#### 2. **Missing Core Functionality UI**
- **No presence indicators** - Can't see who's online or active
- **No properties panel** - Can't edit object properties (color, size, opacity, etc.)
- **No layers panel** - Can't manage z-ordering or object organization
- **Limited toolbar** - Only 2 tools (select, rectangle) visible
- **No color picker** - Cannot change object colors
- **No object selection feedback** - Hard to tell what's selected

#### 3. **Poor Information Architecture**
- User identity is in the header but disconnected from collaboration
- No status bar with canvas information
- No feedback for actions or state changes
- Missing contextual controls

#### 4. **Inconsistent Design Language**
- Mixed use of emoji icons (⌃ for select, ▭ for rectangle)
- No defined color palette beyond grays and blue
- Inconsistent spacing and sizing
- No unified visual system

#### 5. **Collaboration Visibility Issues**
- No active users list
- Remote cursors exist but no persistent presence indicators
- No way to see who's editing what
- No collaboration metadata (who created objects, when, etc.)

---

## Proposed Design System

### Color Palette

#### Primary Colors
```css
--primary-50:  #eff6ff   /* Lightest blue backgrounds */
--primary-100: #dbeafe   /* Light blue hover states */
--primary-500: #3b82f6   /* Primary blue - active states, CTA */
--primary-600: #2563eb   /* Darker blue - hover on primary */
--primary-700: #1d4ed8   /* Darkest blue - pressed states */
```

#### Neutral Colors
```css
--gray-25:  #fcfcfc   /* Canvas background */
--gray-50:  #f9fafb   /* Panel backgrounds */
--gray-100: #f3f4f6   /* Hover backgrounds */
--gray-200: #e5e7eb   /* Borders */
--gray-300: #d1d5db   /* Disabled states */
--gray-400: #9ca3af   /* Placeholder text */
--gray-500: #6b7280   /* Secondary text */
--gray-600: #4b5563   /* Body text */
--gray-700: #374151   /* Headings */
--gray-900: #111827   /* Primary text */
```

#### Semantic Colors
```css
--success-500: #10b981  /* Success states */
--warning-500: #f59e0b  /* Warning states */
--error-500:   #ef4444  /* Error states */
--info-500:    #0ea5e9  /* Info states */
```

#### Collaboration Colors (for user avatars/cursors)
```css
--collab-purple:  #8b5cf6
--collab-pink:    #ec4899
--collab-orange:  #f97316
--collab-green:   #10b981
--collab-cyan:    #06b6d4
--collab-indigo:  #6366f1
```

### Icons

#### Icon Library
- **lucide-react** - Consistent, professional icon set
- All icons use 16-20px size for UI elements
- Consistent stroke width across all icons
- Icons inherit color from parent (currentColor)

### Typography

#### Font Families
- **Sans-serif**: System font stack (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto) - clean, modern, excellent readability
- **Monospace**: System monospace (for numerical values, coordinates)

#### Type Scale
```
--text-xs:   12px / 16px  /* Timestamps, meta info */
--text-sm:   14px / 20px  /* Body text, labels */
--text-base: 16px / 24px  /* Default text */
--text-lg:   18px / 28px  /* Section headers */
--text-xl:   20px / 28px  /* Panel titles */
```

### Spacing System
Use 4px base unit (Tailwind default):
- `4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px`

### Border Radius
```
--radius-sm:  4px   /* Buttons, inputs */
--radius-md:  6px   /* Cards, panels */
--radius-lg:  8px   /* Modals, large containers */
--radius-full: 9999px /* Circular elements */
```

### Shadows
```
--shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.05)
--shadow-md:  0 4px 6px rgba(0, 0, 0, 0.07)
--shadow-lg:  0 10px 15px rgba(0, 0, 0, 0.1)
--shadow-xl:  0 20px 25px rgba(0, 0, 0, 0.15)
```

---

## Layout Architecture

### Overall Structure

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER (64px fixed)                                        │
│  Logo | Presence Indicators | User Menu                     │
├──────┬──────────────────────────────────────────┬───────────┤
│      │                                          │           │
│  L   │          CANVAS WORKSPACE                │  PROPS    │
│  A   │      (infinite, pannable, zoomable)      │  PANEL    │
│  Y   │                                          │           │
│  E   │                                          │  280px    │
│  R   │                                          │  fixed    │
│  S   │                                          │           │
│      │                                          │           │
│ 240px├──────────────────────────────────────────┤           │
│ fixed│  TOOLBAR (floating, centered)            │           │
│      │  ZOOM CONTROLS (floating, bottom-right)  │           │
└──────┴──────────────────────────────────────────┴───────────┘
```

### Component Breakdown

#### 1. Header (64px height)
**Purpose**: Branding, presence, user actions

**Layout (left to right)**:
```
┌──────────────────────────────────────────────────────────┐
│ [Logo] | [Active Users...] [Share] [User Menu] [Sign Out] │
└──────────────────────────────────────────────────────────┘
```

**Elements**:
- **Logo**: "CollabCanvas" with icon, 24px font, semi-bold
- **Active Users**: Stacked avatars (max 5 visible, +N for overflow)
  - 32px circular avatars
  - Overlap by 8px
  - Show online status (green dot)
  - Tooltip on hover with full name
- **Share Button**: Invite collaborators
- **User Menu**: Current user avatar + dropdown
- **Sign Out**: Secondary button

**Visual Style**:
- Background: `white` with `--shadow-sm`
- Border bottom: `1px solid --gray-200`
- Padding: `0 24px`

---

#### 2. Left Sidebar - Layers Panel (240px width, collapsible)

**Purpose**: Object management, layer ordering, visibility controls

**Sections**:
1. **Panel Header**
   - "Layers" title
   - Object count badge
   - Collapse button

2. **Layer List** (scrollable)
   - Each layer item shows:
     - Object type icon (vector icons, not emoji)
     - Object name (editable on double-click)
     - Visibility toggle (eye icon)
     - Lock toggle (lock icon)
     - Thumbnail preview (optional)
   - Visual indicators:
     - Selected objects: `--primary-100` background
     - Hover: `--gray-100` background
     - Locked: 50% opacity
     - Hidden: italic text, 60% opacity

3. **Layer Actions** (footer)
   - Add layer button
   - Delete layer button
   - Duplicate button

**Visual Style**:
- Background: `--gray-50`
- Border right: `1px solid --gray-200`
- Padding: `16px 12px`
- Header: `--gray-900`, 16px semi-bold

**Interaction**:
- Click to select
- Cmd/Ctrl + Click for multi-select
- Drag to reorder
- Right-click for context menu

---

#### 3. Canvas Workspace (Center, flexible)

**Purpose**: Main drawing area with infinite canvas

**Visual Style**:
- Background: `--gray-25`
- Grid: `1px dots, --gray-300, 20px spacing`
- Adaptive grid based on zoom level

**Object Styling**:
- **Selected objects**:
  - 2px solid `--primary-500` border
  - 8 resize handles (6px squares, white fill, primary border)
  - Rotation handle (12px circle at top, connected by line)
  - Bounding box with measurements on hover
  
- **Multi-selection**:
  - Group bounding box with `--primary-500` dashed border
  - Resize handles on group bounds
  
- **Hover state** (non-selected):
  - 1px solid `--primary-300` border
  - Subtle highlight

**Feedback Elements**:
- **Remote cursors**: 
  - Custom SVG pointer with user color
  - Name label in colored pill above cursor
  - Smooth animation (60fps)
  
- **Selection info tooltip**:
  - Shows X, Y, W, H when dragging/resizing
  - Position near cursor or top-right of selection
  
- **Snapping guides**:
  - Pink/magenta lines when aligning to other objects
  - Center alignment indicators

---

#### 4. Bottom Toolbar (Floating, Centered)

**Purpose**: Tool selection and quick actions

**Layout**:
```
┌────────────────────────────────────────────────────────┐
│ [Select] [Hand] │ [Rectangle] [Circle] [Line] [Text] │ │
│                 │                                     │ │
│  Selection      │      Shape Tools      │  More       │
└────────────────────────────────────────────────────────┘
```

**Visual Style**:
- Background: `white` with `--shadow-lg`
- Border: `1px solid --gray-200`
- Border radius: `--radius-lg`
- Padding: `8px`
- Gap between buttons: `4px`
- Dividers: `1px solid --gray-200`

**Button States**:
- **Default**: 
  - 40px × 40px
  - `transparent` background
  - `--gray-600` icon color
  - Hover: `--gray-100` background
  
- **Active**: 
  - `--primary-500` background
  - `white` icon color
  - Subtle shadow

**Tool Icons** (use proper SVG icons, not emoji):
- Select: Cursor arrow
- Hand: Open hand
- Rectangle: Rectangle outline
- Circle: Circle outline
- Line: Diagonal line
- Text: "T" letter
- More: Three dots (opens dropdown with additional tools)

**Keyboard Shortcuts** (shown in tooltips):
- V: Select
- H: Hand
- R: Rectangle
- C: Circle
- L: Line
- T: Text

---

#### 5. Right Sidebar - Properties Panel (280px width, collapsible)

**Purpose**: Edit selected object properties

**States**:
1. **Nothing selected**: Show canvas properties
2. **Single object selected**: Show object properties
3. **Multiple objects selected**: Show common properties

**Sections** (collapsed by default, expandable):

##### A. Transform
```
Position:  [X: 100] [Y: 200]
Size:      [W: 150] [H: 100] [🔗 Lock ratio]
Rotation:  [0°]
```

##### B. Appearance
```
Fill:      [Color picker] [Opacity: 100%]
Stroke:    [Color picker] [Width: 1] [Opacity: 100%]
           [Style: Solid ▼] (dropdown: solid/dashed/dotted)
```

##### C. Effects (Future)
```
Shadow:    [+ Add shadow]
Blur:      [+ Add blur]
```

##### D. Layer Controls
```
Order:     [↑ Bring Forward] [↓ Send Backward]
           [⬆ Bring to Front] [⬇ Send to Back]
```

##### E. Metadata
```
Created:   Mike, 2 hours ago
Modified:  Sarah, 5 minutes ago
ID:        abc123... [Copy]
```

**Visual Style**:
- Background: `--gray-50`
- Border left: `1px solid --gray-200`
- Padding: `16px`
- Section headers: `--gray-700`, 14px semi-bold
- Input fields: 
  - `white` background
  - `1px solid --gray-300` border
  - `--radius-sm` border radius
  - Focus: `--primary-500` border

**Color Picker Component**:
- Compact swatch (24px × 24px) that opens popover
- Popover shows:
  - Color spectrum
  - Opacity slider
  - Hex input
  - Recent colors row
  - Preset colors grid

---

#### 6. Zoom Controls (Floating, Bottom-Right)

**Purpose**: Canvas zoom management

**Layout** (vertical stack):
```
┌──────┐
│  +   │  Zoom in
├──────┤
│ 116% │  Current zoom (click to reset)
├──────┤
│  −   │  Zoom out
└──────┘
```

**Visual Style**:
- Background: `white` with `--shadow-md`
- Border: `1px solid --gray-200`
- Border radius: `--radius-md`
- Each button: 36px × 36px
- Hover: `--gray-100` background

---

## Component Specifications

### Presence Indicators (Active Users)

**Design**:
```
┌─────┬─────┬─────┬─────┬─────┬──────┐
│ [M] │ [S] │ [J] │ [A] │ [K] │ +12  │
└─────┴─────┴─────┴─────┴─────┴──────┘
```

- 32px circular avatars
- First letter of name on colored background
- Colors from collaboration palette (assigned consistently per user)
- Small green dot (6px) at bottom-right for online status
- Overlap previous avatar by 8px
- Max 5 visible, show "+N" for overflow
- Click to see full user list in popover

**Popover Details**:
```
Active Collaborators (17)

● Mike Rodriguez       Just now
● Sarah Chen           2 min ago
● John Smith           Active now
○ Alex Johnson         15 min ago (idle)
...

[Invite More] button at bottom
```

---

### Object Selection Handles

**Design**:
```
       [ ↻ ]  ← Rotation handle (12px circle)
         │
         │ 
    ┌────┼────┐
    │    │    │
  [□]    │   [□]  ← Corner handles (6px squares)
    │    │    │
────[□]──┼──[□]────  ← Edge handles (middle)
    │    │    │
  [□]    │   [□]
    │    │    │
    └────┼────┘
         │
```

- Handles: 6px squares, white fill, 1px primary border
- Rotation handle: 12px circle, connected by 1px line
- Bounding box: 2px solid `--primary-500`
- Hover handles: Scale to 8px with smooth transition
- Cursor changes: resize cursors (nwse-resize, nesw-resize, etc.)

---

### Context Menu

**Triggered by**: Right-click on canvas or object

**Structure**:
```
┌────────────────────────────┐
│ Cut              ⌘X        │
│ Copy             ⌘C        │
│ Paste            ⌘V        │
├────────────────────────────┤
│ Duplicate        ⌘D        │
│ Delete           ⌫         │
├────────────────────────────┤
│ Bring to Front   ⌘]        │
│ Send to Back     ⌘[        │
├────────────────────────────┤
│ Group            ⌘G        │
│ Ungroup          ⇧⌘G       │
├────────────────────────────┤
│ Lock             ⌘L        │
│ Hide             ⇧⌘H       │
└────────────────────────────┘
```

**Visual Style**:
- Background: `white`
- Shadow: `--shadow-lg`
- Border: `1px solid --gray-200`
- Border radius: `--radius-md`
- Padding: `4px`
- Each item: 
  - Padding: `8px 12px`
  - Hover: `--gray-100` background
  - Disabled: `--gray-400` color, 50% opacity
  - Keyboard shortcut: `--gray-500`, right-aligned

---

## Responsive Behavior

### Desktop (≥1280px) - Full Layout
- All panels visible
- Properties panel: 280px
- Layers panel: 240px
- Canvas: Flexible (remaining space)

### Laptop (1024px - 1279px) - Compact
- Panels collapsible with toggle buttons
- Collapsed width: 48px (icon only)
- Canvas expands when panels collapsed

### Tablet (768px - 1023px) - Overlay Panels
- Layers and Properties become overlays
- Triggered by buttons in header
- Semi-transparent backdrop
- Slide in from sides

### Mobile (<768px) - Not Primary Target
- Single panel at a time
- Full-screen canvas
- Toolbar moves to top or becomes dropdown
- Properties in bottom sheet

---

## Interaction Patterns

### Keyboard Shortcuts

#### Tools
- `V` - Select tool
- `H` - Hand tool (pan)
- `R` - Rectangle
- `C` - Circle
- `L` - Line
- `T` - Text
- `Space` (hold) - Temporary hand tool

#### Actions
- `⌘C` / `Ctrl+C` - Copy
- `⌘V` / `Ctrl+V` - Paste
- `⌘X` / `Ctrl+X` - Cut
- `⌘D` / `Ctrl+D` - Duplicate
- `Delete` / `Backspace` - Delete
- `⌘Z` / `Ctrl+Z` - Undo
- `⌘⇧Z` / `Ctrl+Shift+Z` - Redo

#### View
- `⌘+` / `Ctrl++` - Zoom in
- `⌘-` / `Ctrl+-` - Zoom out
- `⌘0` / `Ctrl+0` - Reset zoom to 100%
- `⌘1` / `Ctrl+1` - Zoom to fit
- `⌘2` / `Ctrl+2` - Zoom to selection

#### Selection
- `⌘A` / `Ctrl+A` - Select all
- `⌘⇧A` / `Ctrl+Shift+A` - Deselect all
- `Tab` - Select next object
- `⇧Tab` - Select previous object

#### Layers
- `⌘]` / `Ctrl+]` - Bring forward
- `⌘[` / `Ctrl+[` - Send backward
- `⌘⇧]` / `Ctrl+Shift+]` - Bring to front
- `⌘⇧[` / `Ctrl+Shift+[` - Send to back

### Mouse Interactions

#### Canvas
- **Click** - Select object
- **Shift+Click** - Add to selection
- **Drag** - Create shape (when tool selected)
- **Drag** - Move object (when selected)
- **Space+Drag** - Pan canvas
- **Scroll** - Zoom (at cursor position)
- **Middle Mouse+Drag** - Pan canvas

#### Objects
- **Click** - Select
- **Double Click** - Enter edit mode (text), or smart select group
- **Drag** - Move
- **Drag Handle** - Resize/rotate
- **Right Click** - Context menu

### Visual Feedback

#### Loading States
- Skeleton screens for panels
- Spinner for canvas initialization
- Progress indicators for AI operations

#### Hover States
- Subtle background color change
- Border highlight
- Cursor change
- Tooltip after 500ms delay

#### Active States
- Distinct background color
- Border or shadow
- Icon color change

#### Disabled States
- Reduced opacity (50%)
- Gray color
- No cursor pointer

---

## Animation Guidelines

### Principles
- **Subtle**: Animations should enhance, not distract
- **Fast**: 150-250ms for most transitions
- **Purposeful**: Every animation should communicate something

### Specific Animations

#### Panel Transitions
- Slide: `transform`, `200ms ease-out`
- Collapse/Expand: `width`, `200ms ease-in-out`

#### Button Interactions
- Hover: `background-color`, `150ms ease-out`
- Active: `transform scale(0.95)`, `100ms ease-out`

#### Tooltips
- Fade in: `opacity`, `150ms ease-in`, 500ms delay
- Position: Slight slide from direction of trigger

#### Remote Cursors
- Position: `transform`, `50ms linear` (smooth, fast)
- Appear/Disappear: `opacity`, `200ms ease-in-out`

#### Object Selection
- Border: Instant (no animation)
- Handles: Fade in, `150ms ease-out`

#### Modal/Popover
- Backdrop: `opacity`, `200ms ease-out`
- Content: `opacity` + `transform scale`, `200ms ease-out`

---

## Accessibility Considerations

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Visible focus indicators (2px `--primary-500` outline)
- Logical tab order
- Focus trap in modals/popovers

### Screen Readers
- Semantic HTML elements
- ARIA labels for icon-only buttons
- ARIA live regions for notifications
- Descriptive alt text for images

### Color Contrast
- Minimum 4.5:1 contrast ratio for text
- 3:1 for large text and interactive elements
- Don't rely on color alone for information

### Motion
- Respect `prefers-reduced-motion`
- Provide alternatives to motion-based feedback
- Allow disabling animations in settings

---

## Implementation Priority

### Phase 1: Foundation (Current Sprint)
1. ✅ Basic layout structure
2. Design system setup (colors, typography, spacing)
3. Header with logo and user menu
4. Improved toolbar with proper icons
5. Basic properties panel (transform only)

### Phase 2: Core Features (Next Sprint)
1. Layers panel with list view
2. Full properties panel (appearance, effects)
3. Presence indicators in header
4. Object selection handles
5. Context menu

### Phase 3: Polish (Following Sprint)
1. Keyboard shortcuts
2. Animations and transitions
3. Responsive layout
4. Accessibility improvements
5. Advanced properties

### Phase 4: Enhancement (Future)
1. Collaboration features UI
2. Comments and annotations
3. Version history
4. Templates and components
5. AI interface

---

## Design Inspiration & References

### Reference Applications
- **Figma**: Gold standard for properties panel, layers, tool organization
- **Sketch**: Clean layer management
- **Adobe XD**: Simplified property controls
- **Miro**: Excellent real-time collaboration UI
- **Framer**: Modern, polished design aesthetic

### Key Learnings from References
1. **Floating toolbars** are better than fixed sidebars for drawing tools
2. **Collapsible panels** give users control over workspace
3. **Inline editing** reduces modal fatigue
4. **Smart grouping** in properties panel reduces cognitive load
5. **Presence indicators** should be prominent but not distracting

---

## Design Tokens (CSS Variables)

```css
:root {
  /* Colors - Primary */
  --color-primary-50:  #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;

  /* Colors - Neutral */
  --color-gray-25:  #fcfcfc;
  --color-gray-50:  #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-900: #111827;

  /* Colors - Semantic */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error:   #ef4444;
  --color-info:    #0ea5e9;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);

  /* Typography */
  --font-sans: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  --text-xs:   12px;
  --text-sm:   14px;
  --text-base: 16px;
  --text-lg:   18px;
  --text-xl:   20px;

  /* Line Heights */
  --leading-tight:  1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* Z-Index Layers */
  --z-base: 1;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal-backdrop: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;

  /* Transitions */
  --transition-fast: 150ms ease-out;
  --transition-base: 200ms ease-out;
  --transition-slow: 300ms ease-out;

  /* Layout */
  --header-height: 64px;
  --sidebar-width: 240px;
  --properties-width: 280px;
  --toolbar-height: 56px;
}
```

---

## Next Steps

1. **Audit current components** - Document what exists vs. what's needed
2. **Create component library** - Build reusable UI components
3. **Implement design tokens** - Update CSS with design system
4. **Refactor layouts** - Update page structure to match specifications
5. **Add missing panels** - Layers and Properties panels
6. **Improve toolbar** - Better icons and more tools
7. **Add presence UI** - Active users in header
8. **Polish interactions** - Animations, hover states, feedback

---

## Success Metrics

### User Experience
- **Discoverability**: Can users find tools within 5 seconds?
- **Efficiency**: Can users complete common tasks with ≤3 clicks?
- **Learnability**: Can new users create and style an object within 2 minutes?

### Visual Quality
- **Consistency**: All components use design system tokens
- **Polish**: Smooth animations, proper spacing, visual hierarchy
- **Professional**: Looks comparable to Figma/Sketch/Adobe XD

### Performance
- **Responsive**: All UI interactions respond within 100ms
- **Smooth**: 60fps animations
- **Lightweight**: Fast load times, minimal re-renders

---

## Conclusion

The current CollabCanvas UI is functional but lacks the polish and completeness expected of a professional design tool. By implementing this design system—with its clear visual hierarchy, comprehensive component library, and thoughtful interaction patterns—we can transform it into a production-ready collaborative canvas that rivals industry leaders like Figma.

The key is to **focus on the user experience first**: make tools discoverable, provide immediate feedback, show collaboration context, and maintain a clean, uncluttered workspace. Every element should have a purpose, and every interaction should feel smooth and intentional.

This is not just about making it "look pretty"—it's about creating an interface that **empowers users** to be more creative, more efficient, and more collaborative.

