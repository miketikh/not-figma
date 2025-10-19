/**
 * AI Response Template Library
 *
 * This file contains response templates for Sketchy, the AI canvas assistant.
 * Templates add personality and variety to AI responses, making interactions
 * feel fun and celebratory instead of clinical and boring.
 *
 * ## How It Works
 *
 * Each template function accepts a `ResponseContext` object with relevant
 * data (coordinates, sizes, colors, etc.) and returns a randomized message
 * by selecting from multiple template variations and interpolating variables.
 *
 * ## Adding New Templates
 *
 * To add a new template function:
 *
 * 1. Define the context interface fields needed for interpolation
 * 2. Create an array of template strings with placeholders like `{x}`, `{y}`, `{color}`, etc.
 * 3. Use `pickRandom()` to select a template from the array
 * 4. Use `interpolate()` to replace placeholders with actual values
 * 5. Return the final message
 *
 * Example:
 * ```typescript
 * export function getMyNewMessage(context: ResponseContext): string {
 *   const templates = [
 *     "Option 1 with {x} and {y}",
 *     "Option 2 with {color}",
 *   ];
 *   return interpolate(pickRandom(templates), context);
 * }
 * ```
 *
 * ## Guidelines
 *
 * - Keep templates conversational but not overwhelming
 * - Aim for "enthusiastic helper" tone, not "hyperactive robot"
 * - Use emojis sparingly (1-2 per message max)
 * - Each function should have at least 5 variations to avoid repetition
 * - Templates should feel natural and celebrate user actions
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Context object passed to template functions
 * Contains all possible data fields that might be interpolated into messages
 */
export interface ResponseContext {
  // Position coordinates
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;

  // Dimensions
  width?: number;
  height?: number;
  radius?: number;

  // Visual properties
  color?: string;
  fill?: string;
  stroke?: string;
  opacity?: number;
  rotation?: number;

  // Text properties
  content?: string;
  fontSize?: number;

  // Object metadata
  objectId?: string;
  type?: string;

  // Other context
  [key: string]: any; // Allow additional properties for future expansion
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Selects a random element from an array
 *
 * @param array - Array to pick from
 * @returns Random element from the array
 */
export function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Interpolates variables into a template string
 *
 * Replaces placeholders like `{x}`, `{y}`, `{width}`, etc. with actual values
 * from the provided variables object.
 *
 * @param template - Template string with placeholders (e.g., "Value is {x}")
 * @param vars - Object containing variable values to interpolate
 * @returns Template string with all placeholders replaced
 *
 * @example
 * ```typescript
 * interpolate("Position: ({x}, {y})", { x: 100, y: 200 })
 * // Returns: "Position: (100, 200)"
 * ```
 */
export function interpolate(
  template: string,
  vars: Record<string, any>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? String(vars[key]) : match;
  });
}

// ============================================================================
// Creation Message Templates
// ============================================================================

/**
 * Returns a randomized creation message for rectangles
 *
 * @param context - Response context with x, y, width, height
 * @returns Celebratory message about rectangle creation
 */
export function getCreateRectangleMessage(context: ResponseContext): string {
  const templates = [
    "Boom! Rectangle deployed at ({x}, {y}) - {width}×{height} and looking sharp! 📦",
    "Ta-da! {width}×{height} rectangle materialized at ({x}, {y})!",
    "Rectangle created at ({x}, {y}) with size {width}×{height} - perfect!",
    "Dropped a {width}×{height} rectangle at ({x}, {y}) - nailed it! ✨",
    "Fresh rectangle at ({x}, {y}) - {width} wide, {height} tall!",
    "Box deployed! {width}×{height} rectangle sitting pretty at ({x}, {y}) 📦",
    "Bam! Rectangle spawned at ({x}, {y}) with dimensions {width}×{height}!",
  ];

  return interpolate(pickRandom(templates), context);
}

/**
 * Returns a randomized creation message for circles
 *
 * @param context - Response context with x, y, radius
 * @returns Celebratory message about circle creation
 */
export function getCreateCircleMessage(context: ResponseContext): string {
  const templates = [
    "Perfect circle at ({x}, {y}) with radius {radius} - round and proud! ⭕",
    "Rolling out a circle at ({x}, {y}) - radius {radius}! 🔵",
    "Circle created at ({x}, {y}) - {radius}px radius and perfectly round!",
    "Boom! Dropped a circle (radius {radius}) at ({x}, {y}) ✨",
    "Circle deployed at ({x}, {y}) - {radius}px from center to edge!",
    "Perfect sphere at ({x}, {y}) - radius {radius} and looking smooth! ⚪",
    "Circle time! Radius {radius} at ({x}, {y}) - round as can be! 🔵",
  ];

  return interpolate(pickRandom(templates), context);
}

/**
 * Returns a randomized creation message for lines
 *
 * @param context - Response context with x1, y1, x2, y2
 * @returns Celebratory message about line creation
 */
export function getCreateLineMessage(context: ResponseContext): string {
  const templates = [
    "Line drawn from ({x1}, {y1}) to ({x2}, {y2}) - straight as an arrow! 📏",
    "Perfect line connecting ({x1}, {y1}) to ({x2}, {y2})!",
    "Line created from ({x1}, {y1}) to ({x2}, {y2}) - nice and clean! ✨",
    "Boom! Line deployed from ({x1}, {y1}) to ({x2}, {y2})!",
    "Drawing a line from ({x1}, {y1}) to ({x2}, {y2}) - connect the dots! 📍",
    "Line time! From ({x1}, {y1}) to ({x2}, {y2}) - looking sharp!",
    "Straight line from ({x1}, {y1}) to ({x2}, {y2}) - nailed it! 📏",
  ];

  return interpolate(pickRandom(templates), context);
}

/**
 * Returns a randomized creation message for text objects
 *
 * @param context - Response context with x, y, content
 * @returns Celebratory message about text creation
 */
export function getCreateTextMessage(context: ResponseContext): string {
  const templates = [
    "Text placed at ({x}, {y}) - say it loud and proud! 💬",
    "Text \"{content}\" created at ({x}, {y})!",
    "Boom! Text dropped at ({x}, {y}) - \"{content}\" ✨",
    "Text deployed at ({x}, {y}) - message received loud and clear!",
    "Text time! \"{content}\" at ({x}, {y}) - looking good! 📝",
    "Placed your text at ({x}, {y}) - \"{content}\" is ready to shine!",
    "Text created at ({x}, {y}) - \"{content}\" for all to see! 💬",
  ];

  return interpolate(pickRandom(templates), context);
}

// ============================================================================
// Update Message Templates
// ============================================================================

/**
 * Returns a randomized update message for color changes
 *
 * @param context - Response context with color and property type
 * @returns Celebratory message about color change
 */
export function getUpdateColorMessage(context: {
  color: string;
  property: "fill" | "stroke";
}): string {
  const templates = [
    "Painted it {color} - fresh coat applied! 🎨",
    "Color swap complete! Looking good in {color}",
    "Changed the {property} to {color} - nice choice! ✨",
    "{color} it is! Color updated perfectly",
    "Boom! {property} is now {color} - love it! 🎨",
  ];

  return interpolate(pickRandom(templates), context);
}

/**
 * Returns a randomized update message for position changes
 * Optionally includes position description context
 *
 * @param context - Response context with x, y coordinates and optional canvas dimensions
 * @returns Celebratory message about position change
 */
export function getUpdatePositionMessage(context: {
  x: number;
  y: number;
  deltaX?: number;
  deltaY?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}): string {
  // Get position description if canvas dimensions are provided
  let positionDesc = "";
  if (context.canvasWidth && context.canvasHeight) {
    positionDesc = getPositionDescription(
      context.x,
      context.y,
      context.canvasWidth,
      context.canvasHeight
    );
  }

  // Special message for exact center positioning
  if (positionDesc === "center") {
    const centerTemplates = [
      "Perfect! Dead center at ({x}, {y}) 🎯",
      "Centered perfectly at ({x}, {y}) - bullseye! 🎯",
      "Right in the center at ({x}, {y}) - perfect balance! ✨",
    ];
    return interpolate(pickRandom(centerTemplates), context);
  }

  // Messages with position context
  if (positionDesc) {
    const contextTemplates = [
      `Moved to the {positionDesc} ({x}, {y}) - great spot!`,
      `Shifted to the {positionDesc} at ({x}, {y}) ✨`,
      `Positioned at the {positionDesc} ({x}, {y}) - looking good!`,
      `Moved to the {positionDesc} ({x}, {y}) - perfect placement! 📍`,
    ];
    return interpolate(pickRandom(contextTemplates), { ...context, positionDesc });
  }

  // Default templates without position context
  const templates = [
    "Scooted it over to ({x}, {y}) - perfect spot!",
    "Teleported to ({x}, {y}) ✨",
    "Moved to ({x}, {y}) - looking good there!",
    "Position updated to ({x}, {y}) - nailed it!",
    "Shifted to ({x}, {y}) - right where it belongs! 📍",
  ];

  return interpolate(pickRandom(templates), context);
}

/**
 * Returns a randomized update message for rotation changes
 *
 * @param context - Response context with rotation angle
 * @returns Celebratory message about rotation
 */
export function getUpdateRotationMessage(context: {
  rotation: number;
}): string {
  const templates = [
    "Spun it {rotation}° - nice angle!",
    "Gave it a {rotation}° twist! 🌀",
    "Rotated to {rotation}° - looking sharp!",
    "Angled at {rotation}° - perfect rotation! ✨",
  ];

  return interpolate(pickRandom(templates), context);
}

/**
 * Returns a randomized update message for size changes
 *
 * @param context - Response context with width and height
 * @returns Celebratory message about size change
 */
export function getUpdateSizeMessage(context: {
  width: number;
  height: number;
}): string {
  const templates = [
    "Resized to {width}×{height} - fits like a glove!",
    "New size: {width}×{height} - looking good! 📏",
    "Scaled to {width}×{height} - perfect proportions!",
    "Changed dimensions to {width}×{height} - just right! ✨",
  ];

  return interpolate(pickRandom(templates), context);
}

/**
 * Returns a randomized update message for opacity changes
 *
 * @param context - Response context with opacity value
 * @returns Celebratory message about opacity change
 */
export function getUpdateOpacityMessage(context: { opacity: number }): string {
  const templates = [
    "Opacity set to {opacity} - nice transparency!",
    "Adjusted opacity to {opacity} - looking smooth! ✨",
    "Transparency updated to {opacity} - perfect blend!",
  ];

  return interpolate(pickRandom(templates), context);
}

/**
 * Returns a randomized generic update message
 * Used as fallback for property updates that don't have specific templates
 *
 * @returns Generic update success message
 */
export function getUpdateGenericMessage(): string {
  const templates = [
    "Updated successfully - looking great! ✨",
    "Changes applied - nice work!",
    "All set! Your changes are live 🎉",
  ];

  return pickRandom(templates);
}

// ============================================================================
// Query & Status Message Templates
// ============================================================================

/**
 * Returns a randomized message for empty canvas
 *
 * @returns Friendly message for empty canvas state
 */
export function getCanvasEmptyMessage(): string {
  const templates = [
    "It's a blank slate! Ready to create something awesome? ✨",
    "Canvas is empty - let's fill it with magic!",
    "Nothing here yet, but that just means infinite possibilities! 🎨",
    "Your canvas awaits! What should we create first?",
  ];

  return pickRandom(templates);
}

/**
 * Returns a randomized message for object counts
 *
 * Different messages based on the count range
 *
 * @param count - Number of objects on canvas
 * @returns Friendly message about object count
 */
export function getObjectCountMessage(count: number): string {
  if (count === 1) {
    const templates = [
      "You've got 1 object on the canvas - a good start!",
      "One object keeping things simple! 📦",
      "Solo object on the canvas - ready for friends?",
    ];
    return pickRandom(templates);
  }

  if (count >= 2 && count <= 5) {
    const templates = [
      `You've got ${count} objects on the canvas - nice and tidy! ✨`,
      `${count} objects keeping busy on your canvas!`,
      `${count} objects and looking good! 📦`,
    ];
    return pickRandom(templates);
  }

  if (count >= 6 && count <= 20) {
    const templates = [
      `You've got ${count} objects on the canvas - quite the collection! 🎨`,
      `${count} objects and counting! Your canvas is coming alive!`,
      `${count} shapes keeping busy on your canvas - nice work! ✨`,
    ];
    return pickRandom(templates);
  }

  // 21+ objects
  const templates = [
    `Wow! ${count} objects on the canvas - this is getting serious! 🎪`,
    `${count} objects and counting! Your canvas is ALIVE! ✨`,
    `${count} objects - you're on a creative roll! 🔥`,
  ];
  return pickRandom(templates);
}

/**
 * Returns a randomized message for when no objects are selected
 *
 * @returns Friendly message requesting selection
 */
export function getNoSelectionMessage(): string {
  const templates = [
    "No objects are selected - please select one first or tell me which object to modify!",
    "I need you to select an object first, or tell me which one to update! 🎯",
    "Nothing selected yet - pick an object or describe which one you want to change!",
    "No selection active - select an object or let me know which one to work with! ✨",
  ];

  return pickRandom(templates);
}

/**
 * Returns a randomized message for selected object counts
 *
 * @param count - Number of selected objects
 * @returns Friendly message about selection count
 */
export function getSelectionCountMessage(count: number): string {
  if (count === 1) {
    return "Found 1 selected object - ready to work with it! ✨";
  }

  const templates = [
    `Found ${count} selected objects!`,
    `${count} objects selected and ready! 🎯`,
    `Working with ${count} selected objects! ✨`,
  ];
  return pickRandom(templates);
}

/**
 * Returns a randomized message for lock errors
 *
 * @param lockerName - Name of user who has the lock
 * @returns Friendly message about locked object
 */
export function getObjectLockedMessage(lockerName: string): string {
  const templates = [
    `That object is locked by {lockerName} - they're working on it! Try selecting a different object.`,
    `{lockerName} is currently editing that object - please wait or pick another one! 🔒`,
    `Oops! {lockerName} has that object locked right now - choose a different one or wait a moment!`,
    `That one's busy - {lockerName} is working on it! Let's try another object! ✨`,
  ];

  return interpolate(pickRandom(templates), { lockerName });
}

/**
 * Returns a randomized message for object not found errors
 *
 * @returns Friendly message for missing objects
 */
export function getObjectNotFoundMessage(): string {
  const templates = [
    "Couldn't find that object - it may have been deleted! Try selecting another one. 🔍",
    "Hmm, that object doesn't exist anymore - maybe it was removed? Pick another one!",
    "Object not found - it might have disappeared! Select a different object to continue. ✨",
    "Can't locate that object - it may be gone! Try working with a different one. 🎯",
  ];

  return pickRandom(templates);
}

/**
 * Returns a randomized message for out-of-bounds errors
 *
 * @returns Friendly message about bounds validation
 */
export function getBoundsErrorMessage(): string {
  const templates = [
    "Hmm, that's outside the canvas - let's keep it visible! 🎯",
    "Oops! That position is out of bounds - try keeping it on the canvas! ✨",
    "That's a bit too far out - let's stay within the canvas boundaries!",
    "Canvas limits reached! Let's keep things visible and in-bounds. 📐",
  ];

  return pickRandom(templates);
}

// ============================================================================
// Milestone & Celebration Messages
// ============================================================================

/**
 * Returns a celebration message for milestone object counts
 *
 * Returns special messages at key milestones (10, 25, 50, 100 objects)
 * to make the user feel accomplished as their canvas fills up.
 *
 * @param count - Total number of objects on the canvas
 * @returns Celebration message if count is a milestone, null otherwise
 */
export function getMilestoneMessage(count: number): string | null {
  const milestones: Record<number, string[]> = {
    10: [
      "We're on a roll! 10 objects and counting! 🎉",
      "Double digits! 10 objects - you're building something great!",
      "Nice! Hit the 10 object mark - keep going! ✨",
    ],
    25: [
      "Quarter century! 25 objects strong! 🎊",
      "Wow! 25 objects - this canvas is getting serious!",
      "25 objects! You're really in the zone now! 🚀",
    ],
    50: [
      "Half a hundred! 50 objects - incredible! 🎪",
      "50 objects! This canvas is coming alive! ✨",
      "Whoa! 50 objects - you're a creative powerhouse! 🔥",
    ],
    100: [
      "CENTURY! 100 objects! This canvas is ALIVE! 🎪",
      "100 objects! You've created a masterpiece! 🏆",
      "Triple digits! 100 objects - absolutely amazing! 🎉",
    ],
  };

  if (milestones[count]) {
    return pickRandom(milestones[count]);
  }

  return null;
}

/**
 * Returns a message for when AI creates multiple objects at once
 *
 * @param count - Number of objects created
 * @param type - Type of objects created (e.g., "rectangle", "circle")
 * @returns Message celebrating multiple creation
 */
export function getMultipleCreationMessage(count: number, type: string): string {
  const templates = [
    "Boom! Created {count} {type}s at once - productive! 📦",
    "Deployed {count} {type}s - looking good! ✨",
    "{count} {type}s spawned and ready to go!",
    "Just dropped {count} {type}s on the canvas - nice!",
    "Created {count} {type}s in one go - efficient! 🚀",
  ];

  return interpolate(pickRandom(templates), { count, type });
}

// ============================================================================
// Position Context Helpers
// ============================================================================

/**
 * Returns a friendly position description based on canvas location
 *
 * Adds context-aware descriptions like "top-left corner", "center",
 * "right edge", etc. to make position updates more intuitive and friendly.
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @returns Friendly position description string
 *
 * @example
 * ```typescript
 * getPositionDescription(960, 540, 1920, 1080) // "center"
 * getPositionDescription(100, 100, 1920, 1080) // "top-left corner"
 * getPositionDescription(1800, 500, 1920, 1080) // "right edge"
 * ```
 */
export function getPositionDescription(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): string {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  // Define tolerance zones (20% from edges for corners, 10% for exact center)
  const edgeThreshold = 0.2; // 20% from edge is considered "edge"
  const centerThreshold = 0.1; // Within 10% of center is "center"

  const leftEdge = canvasWidth * edgeThreshold;
  const rightEdge = canvasWidth * (1 - edgeThreshold);
  const topEdge = canvasHeight * edgeThreshold;
  const bottomEdge = canvasHeight * (1 - edgeThreshold);

  const centerXMin = centerX - (canvasWidth * centerThreshold);
  const centerXMax = centerX + (canvasWidth * centerThreshold);
  const centerYMin = centerY - (canvasHeight * centerThreshold);
  const centerYMax = centerY + (canvasHeight * centerThreshold);

  // Check if it's very close to exact center (special case)
  const isExactCenter =
    x >= centerXMin && x <= centerXMax &&
    y >= centerYMin && y <= centerYMax;

  if (isExactCenter) {
    return "center";
  }

  // Determine horizontal position
  let horizontal = "";
  if (x < leftEdge) {
    horizontal = "left";
  } else if (x > rightEdge) {
    horizontal = "right";
  }

  // Determine vertical position
  let vertical = "";
  if (y < topEdge) {
    vertical = "top";
  } else if (y > bottomEdge) {
    vertical = "bottom";
  }

  // Combine positions
  if (vertical && horizontal) {
    return `${vertical}-${horizontal} corner`;
  } else if (vertical) {
    return `${vertical} edge`;
  } else if (horizontal) {
    return `${horizontal} edge`;
  }

  // Default: no specific position descriptor
  return "";
}
