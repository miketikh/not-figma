# Testing Strategy for CollabCanvas

## Current State
- **No testing setup exists**
- No test files
- No testing libraries installed
- No test scripts in package.json

## Testing Goals

### Phase 1: Canvas Interaction Tests (This Document)
- Render canvas page as logged-in user
- Test rectangle creation (draw)
- Test multiple rectangle creation
- Test rectangle selection and movement
- Test rectangle deletion

### Phase 2: Future Tests (Not Covered Here)
- Real-time sync between users
- Firebase persistence
- Cursor sync
- Presence tracking
- AI commands

---

## Technology Choices

### Option 1: Jest + React Testing Library (Recommended for Unit/Integration)
**Pros:**
- Standard in React ecosystem
- Good for component testing
- Fast feedback loop
- Mock Firebase easily
- Test user interactions

**Cons:**
- Canvas/Fabric.js is hard to test (needs DOM, canvas API)
- May need to mock Fabric.js extensively
- jsdom doesn't fully support canvas

### Option 2: Playwright (Recommended for E2E)
**Pros:**
- Real browser testing (full canvas support!)
- Can actually draw and interact with Fabric.js
- Test authentication flow realistically
- Can test Firebase in real environment
- Visual debugging with screenshots/videos
- Can test multi-user scenarios (multiple browser contexts)

**Cons:**
- Slower than Jest
- Requires more setup
- Need test Firebase project

### Option 3: Vitest + React Testing Library
**Pros:**
- Faster than Jest
- Better TypeScript support
- Similar API to Jest
- Works well with Next.js

**Cons:**
- Same canvas/Fabric.js limitations as Jest

---

## Recommendation: Playwright for Canvas Testing

**Why Playwright is best for our use case:**

1. **Canvas is visual** - We need real browser rendering
2. **Fabric.js needs real canvas API** - jsdom won't cut it
3. **Firebase can run in real browser** - No complex mocking needed
4. **User interactions are complex** - Click, drag, keyboard events
5. **Future-proof** - Can test multiplayer features with multiple contexts

**Strategy:**
- Use Playwright for E2E tests (canvas interactions, auth, sync)
- Add Jest/Vitest later for pure logic functions (if needed)

---

## Step-by-Step Implementation Plan

### Step 1: Install Playwright
```bash
npm install -D @playwright/test
npx playwright install
```

**Files Created:**
- `playwright.config.ts`
- `tests/` directory

**package.json changes:**
- Add test scripts

---

### Step 2: Configure Playwright

Create `playwright.config.ts`:
- Set baseURL to `http://localhost:3000`
- Configure browser (chromium, firefox, webkit)
- Set timeout (canvas operations can be slow)
- Configure screenshots/videos on failure
- Set up test directory structure

**Key Configuration:**
```typescript
{
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  timeout: 30000, // Canvas operations need time
}
```

---

### Step 3: Set Up Test Firebase Project

**Important:** Don't test against production Firebase!

**Options:**

**A. Use Firebase Emulators (Recommended for CI/CD)**
- Run local Firebase emulators
- Fast, isolated, free
- No API rate limits
- Perfect for testing

**B. Separate Test Firebase Project**
- Create `collabcanvas-test` project
- Use different credentials
- Real Firebase, isolated data
- Good for staging tests

**For our initial tests, we'll use Option B (simpler to start).**

**Steps:**
1. Create test Firebase project
2. Copy credentials to `.env.test`
3. Playwright will use these credentials
4. Clean up test data after runs

---

### Step 4: Create Auth Helper for Tests

**Challenge:** Tests need to be logged in to access canvas

**Solution:** Create authentication helper that:
1. Signs up/signs in test user before tests
2. Stores auth state/cookies
3. Reuses auth across tests (fast!)

**File:** `tests/helpers/auth.ts`

Functions needed:
- `getAuthenticatedContext()` - Returns logged-in browser context
- `createTestUser()` - Creates user for testing
- `cleanupTestUser()` - Removes test user after tests

---

### Step 5: Create First Test - Render Canvas

**File:** `tests/canvas/render.spec.ts`

**Test:**
```typescript
test('renders canvas page for logged-in user', async ({ page }) => {
  // 1. Log in as test user
  // 2. Navigate to /canvas
  // 3. Wait for canvas to initialize
  // 4. Assert canvas element exists
  // 5. Assert toolbar is visible
  // 6. Assert zoom controls are visible
});
```

**Run test:**
```bash
npm test
```

**Expected:** Test passes, canvas renders

---

### Step 6: Test Rectangle Creation

**File:** `tests/canvas/rectangle-creation.spec.ts`

**Test: Draw a single rectangle**
```typescript
test('can draw a rectangle', async ({ page }) => {
  // 1. Log in
  // 2. Navigate to /canvas
  // 3. Click rectangle tool
  // 4. Get canvas element
  // 5. Simulate mouse down at (100, 100)
  // 6. Simulate mouse move to (200, 200)
  // 7. Simulate mouse up
  // 8. Assert rectangle was created (check canvas objects)
  // 9. Take screenshot for visual verification
});
```

**Challenges:**
- Need to interact with Fabric.js canvas
- May need to expose canvas state for testing
- Or query DOM for visual elements

**Solution:**
- Add `data-testid` attributes
- Expose canvas object count via data attribute or global
- Or use Playwright's visual comparison

---

### Step 7: Test Multiple Rectangles

**File:** `tests/canvas/rectangle-creation.spec.ts`

**Test: Draw multiple rectangles**
```typescript
test('can draw multiple rectangles', async ({ page }) => {
  // 1. Log in
  // 2. Navigate to /canvas
  // 3. Click rectangle tool
  // 4. Draw first rectangle at (100, 100) to (200, 200)
  // 5. Draw second rectangle at (300, 100) to (400, 200)
  // 6. Draw third rectangle at (100, 300) to (200, 400)
  // 7. Assert 3 rectangles exist
  // 8. Take screenshot showing all three
});
```

---

### Step 8: Test Rectangle Selection and Movement

**File:** `tests/canvas/rectangle-interaction.spec.ts`

**Test: Select and move a rectangle**
```typescript
test('can select and move a rectangle', async ({ page }) => {
  // 1. Log in
  // 2. Navigate to /canvas
  // 3. Draw a rectangle
  // 4. Click select tool
  // 5. Click on the rectangle to select it
  // 6. Assert rectangle is selected (visual handles visible)
  // 7. Drag rectangle to new position
  // 8. Assert rectangle moved (check position)
  // 9. Take before/after screenshots
});
```

**Key interactions:**
- `page.click('[data-testid="select-tool"]')`
- `page.locator('canvas').click({ position: { x, y } })`
- `page.mouse.move(x, y)` for dragging

---

### Step 9: Test Rectangle Deletion

**File:** `tests/canvas/rectangle-interaction.spec.ts`

**Test: Delete a selected rectangle**
```typescript
test('can delete a rectangle with Delete key', async ({ page }) => {
  // 1. Log in
  // 2. Navigate to /canvas
  // 3. Draw a rectangle
  // 4. Select it
  // 5. Press Delete key
  // 6. Assert rectangle is gone (object count = 0)
  // 7. Take screenshot showing empty canvas
});

test('can delete a rectangle with Backspace key', async ({ page }) => {
  // Same as above but press Backspace
});
```

---

### Step 10: Improve Test Reliability

**Add helper functions:**

**File:** `tests/helpers/canvas.ts`
```typescript
// Helper to wait for canvas initialization
export async function waitForCanvasReady(page: Page) {
  await page.waitForSelector('[data-testid="canvas-ready"]');
}

// Helper to draw a rectangle
export async function drawRectangle(page: Page, x1, y1, x2, y2) {
  // Click rectangle tool
  // Draw rectangle
  // Return rectangle info
}

// Helper to get canvas object count
export async function getObjectCount(page: Page): Promise<number> {
  // Query Fabric.js canvas for object count
}

// Helper to select tool
export async function selectTool(page: Page, tool: 'select' | 'rectangle') {
  // Click the tool button
}
```

---

### Step 11: Add Test Data Attributes to Components

**Modify Canvas.tsx:**
```typescript
// Add data-testid for test queries
<div data-testid="canvas-container" data-canvas-ready={isReady}>
  <canvas ref={canvasRef} data-testid="main-canvas" />
  
  {isReady && (
    <Toolbar data-testid="toolbar" />
  )}
</div>
```

**Modify Toolbar.tsx:**
```typescript
<button
  data-testid={`tool-${tool.id}`}
  onClick={() => setActiveTool(tool.id)}
>
  {tool.icon}
</button>
```

**Why:** Makes elements easy to query in tests

---

### Step 12: Expose Canvas State for Testing

**Challenge:** How do we assert objects were created/deleted?

**Option A: Window Global (Simple)**
```typescript
// In Canvas.tsx, only in test/dev mode
if (process.env.NODE_ENV !== 'production') {
  (window as any).__fabricCanvas = fabricCanvasRef.current;
}
```

**Option B: Data Attributes (Better)**
```typescript
// Update data attribute when objects change
<div 
  data-testid="canvas-container" 
  data-object-count={fabricCanvasRef.current?.getObjects().length ?? 0}
>
```

**Option C: Custom Events (Best)**
```typescript
// Dispatch custom events on object changes
canvas.on('object:added', () => {
  window.dispatchEvent(new CustomEvent('canvas:changed', { 
    detail: { count: canvas.getObjects().length }
  }));
});
```

**Recommendation:** Use Option B for simplicity

---

### Step 13: Add Test Scripts to package.json

```json
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:headed": "playwright test --headed",
    "test:debug": "playwright test --debug",
    "test:canvas": "playwright test tests/canvas"
  }
}
```

**Usage:**
- `npm test` - Run all tests headless
- `npm run test:ui` - Interactive UI mode
- `npm run test:headed` - See browser while testing
- `npm run test:debug` - Step-by-step debugging
- `npm run test:canvas` - Only canvas tests

---

### Step 14: Run Tests in CI/CD (Future)

**GitHub Actions workflow:**
```yaml
- name: Install dependencies
  run: npm ci
  
- name: Install Playwright browsers
  run: npx playwright install --with-deps
  
- name: Start dev server
  run: npm run dev &
  
- name: Wait for server
  run: npx wait-on http://localhost:3000
  
- name: Run tests
  run: npm test
  
- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

---

## File Structure After Setup

```
not-figma/
├── tests/
│   ├── helpers/
│   │   ├── auth.ts           # Authentication helpers
│   │   └── canvas.ts          # Canvas interaction helpers
│   ├── canvas/
│   │   ├── render.spec.ts     # Canvas rendering tests
│   │   ├── rectangle-creation.spec.ts
│   │   └── rectangle-interaction.spec.ts
│   └── fixtures/
│       └── test-data.ts       # Test data/constants
├── playwright.config.ts       # Playwright configuration
├── .env.test                  # Test Firebase credentials
└── package.json               # Updated with test scripts
```

---

## Testing Checklist

### Setup Phase
- [ ] Install Playwright
- [ ] Create playwright.config.ts
- [ ] Set up test Firebase project
- [ ] Create .env.test with credentials
- [ ] Add test scripts to package.json
- [ ] Create tests/ directory structure

### Helper Phase
- [ ] Create auth helper (login/signup)
- [ ] Create canvas helper (draw, select, etc)
- [ ] Add data-testid attributes to components
- [ ] Expose canvas state for assertions

### Test Implementation Phase
- [ ] Write: Render canvas test
- [ ] Write: Draw single rectangle test
- [ ] Write: Draw multiple rectangles test
- [ ] Write: Select and move rectangle test
- [ ] Write: Delete rectangle test (Delete key)
- [ ] Write: Delete rectangle test (Backspace key)

### Validation Phase
- [ ] Run all tests locally (headless)
- [ ] Run tests in headed mode (visual verification)
- [ ] Run tests in debug mode (step through)
- [ ] All tests pass consistently
- [ ] Tests run in <30 seconds

### Documentation Phase
- [ ] Document how to run tests in README
- [ ] Add test coverage badge (optional)
- [ ] Document test patterns for future tests

---

## Example Test (Complete)

```typescript
// tests/canvas/rectangle-creation.spec.ts
import { test, expect } from '@playwright/test';
import { getAuthenticatedPage } from '../helpers/auth';
import { waitForCanvasReady, drawRectangle, getObjectCount } from '../helpers/canvas';

test.describe('Rectangle Creation', () => {
  test('can draw a single rectangle', async ({ browser }) => {
    // Get authenticated page
    const page = await getAuthenticatedPage(browser);
    
    // Navigate to canvas
    await page.goto('/canvas');
    
    // Wait for canvas to be ready
    await waitForCanvasReady(page);
    
    // Draw a rectangle
    await drawRectangle(page, 100, 100, 200, 200);
    
    // Assert one object exists
    const count = await getObjectCount(page);
    expect(count).toBe(1);
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/single-rectangle.png' });
  });
  
  test('can draw multiple rectangles', async ({ browser }) => {
    const page = await getAuthenticatedPage(browser);
    await page.goto('/canvas');
    await waitForCanvasReady(page);
    
    // Draw three rectangles
    await drawRectangle(page, 100, 100, 200, 200);
    await drawRectangle(page, 300, 100, 400, 200);
    await drawRectangle(page, 100, 300, 200, 400);
    
    // Assert three objects exist
    const count = await getObjectCount(page);
    expect(count).toBe(3);
    
    await page.screenshot({ path: 'test-results/multiple-rectangles.png' });
  });
});
```

---

## Next Steps

1. **Start with Step 1** - Install Playwright
2. **Follow steps sequentially** - Each builds on the previous
3. **Run tests frequently** - Catch issues early
4. **Iterate on helpers** - Make tests cleaner as you go
5. **Expand coverage** - Add more tests as features grow

---

## Future Testing Considerations

### Phase 2: Multiplayer Testing
- Test with 2+ browser contexts simultaneously
- Verify real-time sync
- Test cursor sync
- Test presence tracking

### Phase 3: Firebase Testing
- Mock Firebase for faster tests
- Use Firebase emulators
- Test offline/online transitions
- Test reconnection logic

### Phase 4: AI Testing
- Mock AI API responses
- Test AI command parsing
- Test AI object creation
- Test error handling

### Phase 5: Performance Testing
- Test with 100+ objects
- Measure FPS during interactions
- Test zoom/pan performance
- Memory leak detection

---

## Common Issues & Solutions

### Issue: Canvas doesn't render in test
**Solution:** Ensure dev server is running, wait for canvas initialization

### Issue: Mouse events don't work
**Solution:** Use `page.mouse` API, ensure coordinates are within canvas bounds

### Issue: Fabric.js state not accessible
**Solution:** Expose via data attributes or window global in test mode

### Issue: Tests are flaky
**Solution:** Add explicit waits, use `waitForSelector`, increase timeouts

### Issue: Firebase auth fails in tests
**Solution:** Verify .env.test credentials, check Firebase project settings

### Issue: Tests are too slow
**Solution:** Reuse browser contexts, use `fullyParallel: true` in config

---

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Testing Next.js with Playwright](https://nextjs.org/docs/testing/playwright)
- [Testing Canvas Elements](https://playwright.dev/docs/test-snapshots)
- [Firebase Testing Best Practices](https://firebase.google.com/docs/rules/unit-tests)

---

## Success Criteria

✅ All 5 initial tests pass consistently  
✅ Tests run in under 30 seconds  
✅ Visual screenshots generated on failure  
✅ Easy to add new tests (good helper functions)  
✅ Tests catch real bugs (not just passing)  
✅ Other developers can run tests easily  

Once these criteria are met, testing infrastructure is complete and we can expand coverage incrementally.


