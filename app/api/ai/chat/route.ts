/**
 * AI Chat API Route
 * Processes AI chat requests and executes canvas tools
 * Uses Vercel AI SDK with OpenAI for natural language processing
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { aiTools } from "@/app/canvas/_lib/ai-tools";
import { buildCanvasContext } from "@/app/canvas/_lib/ai-context";
import { AIToolResult } from "@/types/ai";

// ============================================================================
// Configuration
// ============================================================================

const API_TIMEOUT_MS = 30000; // 30 seconds timeout for API calls
const MAX_RETRIES = 2; // Maximum number of retries for OpenAI API failures

// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT = 10; // requests per window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

/**
 * Check if user has exceeded rate limit
 * Simple in-memory rate limiting (resets on server restart)
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  // No entry or window expired - create new entry
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  // Check if under limit
  if (entry.count < RATE_LIMIT) {
    entry.count++;
    return true;
  }

  // Rate limit exceeded
  return false;
}

// ============================================================================
// Firebase Auth Verification
// ============================================================================

/**
 * Verify Firebase ID token from Authorization header
 * Returns userId if valid, null otherwise
 */
async function verifyAuthToken(
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    // In a client-side Firebase app, we need to verify tokens differently
    // For now, we'll use a simplified approach that trusts the client token
    // In production, you should use Firebase Admin SDK for server-side verification

    // For this implementation, we'll extract the user ID from the token
    // This is a simplified approach - in production use Firebase Admin SDK
    const decodedToken = JSON.parse(atob(idToken.split(".")[1]));
    return decodedToken.user_id || decodedToken.sub || null;
  } catch (error) {
    console.error("Error verifying auth token:", error);
    return null;
  }
}

// ============================================================================
// Request Body Interface
// ============================================================================

interface ChatRequestBody {
  message: string;
  canvasId: string;
  selectedIds?: string[];
  sessionId?: string;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // 1. Verify authentication
    const authHeader = req.headers.get("authorization");
    const userId = await verifyAuthToken(authHeader);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid or missing authentication token" },
        { status: 401 }
      );
    }

    // 2. Check rate limit
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded - Maximum 10 requests per minute" },
        { status: 429 }
      );
    }

    // 3. Parse request body
    const body: ChatRequestBody = await req.json();
    const {
      message,
      canvasId,
      selectedIds = [],
      sessionId,
      conversationHistory = [],
    } = body;

    // 4. Validate required fields
    if (!message || !canvasId) {
      return NextResponse.json(
        { error: "Missing required fields: message and canvasId" },
        { status: 400 }
      );
    }

    // 5. Build canvas context
    let canvasContext;
    try {
      canvasContext = await buildCanvasContext(
        canvasId,
        userId,
        selectedIds,
        sessionId
      );
    } catch (error) {
      console.error("Error building canvas context:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Check for Firebase Admin credential errors
      if (errorMessage.includes("credentials") || errorMessage.includes("FIREBASE_ADMIN")) {
        return NextResponse.json(
          { error: "Firebase authentication error. Check environment variables." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Failed to fetch canvas data. Please try again." },
        { status: 500 }
      );
    }

    // 6. Create system prompt with canvas context
    const systemPrompt = `You are an AI assistant for a design canvas application. Help users create and modify shapes through natural language commands.

**Canvas Context:**
${canvasContext.summary}

**Selected Objects:**
${
  canvasContext.selectedObjects.length > 0
    ? JSON.stringify(canvasContext.selectedObjects, null, 2)
    : "No objects selected"
}

**Objects You Created in This Conversation:**
${
  canvasContext.aiCreatedObjects.length > 0
    ? JSON.stringify(canvasContext.aiCreatedObjects, null, 2)
    : "You haven't created any objects yet in this conversation"
}
${
  canvasContext.aiCreatedObjects.length > 0
    ? `\n**IMPORTANT:** These are YOUR objects from this conversation. When the user says "move it", "change it", "the circle", or "the rectangle", they are referring to these objects. Use updateObject to modify them.`
    : ""
}

**COMMAND INTENT CLASSIFICATION:**

Before choosing a tool, identify the user's INTENT:

1. **UPDATE/MODIFY Intent** → Use updateObject tool:
   - "move the circle" / "move it" / "move that"
   - "make it bigger" / "resize it" / "change the size"
   - "make it red" / "change its color" / "update the fill"
   - "rotate it" / "turn it" / "rotate the square"
   - User references object with "the", "it", "that" (definite reference)

2. **CREATE Intent** → Use create tools (createCircle, createRectangle, etc.):
   - "create a circle" / "add a rectangle" / "make a new circle"
   - "draw a line" / "put a circle at X,Y" (when no circle exists)
   - User uses "a", "new", or explicit creation verbs

3. **CRITICAL DISAMBIGUATION RULES:**
   - "the circle" = definite article = existing object → updateObject
   - "a circle" = indefinite article = new object → createCircle
   - "it" / "that" = pronoun = existing object → updateObject
   - "move X" = movement command = existing object → updateObject
   - If user says "the X" but no X exists in aiCreatedObjects or selection → ask for clarification

**INFERENCE PRIORITY:** When user says "move it" or "change it":
   1. First check: Is an object selected? → Use that object's ID
   2. Then check: Did I create an object in this conversation? → Use lastCreatedObjectId
   3. If neither: Ask "Which object would you like me to modify? Please select it or describe it more specifically."

**CRITICAL: Understanding the Coordinate System**

The canvas origin (0, 0) is at the TOP-LEFT corner. DIFFERENT SHAPES USE DIFFERENT COORDINATE CONVENTIONS:

1. **RECTANGLES and TEXT**: x,y parameters represent the TOP-LEFT corner of the shape
   - To center a ${canvasContext.canvasWidth}×200 rectangle at the canvas center (${Math.round(canvasContext.canvasWidth / 2)}, ${Math.round(canvasContext.canvasHeight / 2)}):
     Calculate: x = ${Math.round(canvasContext.canvasWidth / 2)} - ${canvasContext.canvasWidth / 2} = ${Math.round(canvasContext.canvasWidth / 2 - canvasContext.canvasWidth / 4)}
     Calculate: y = ${Math.round(canvasContext.canvasHeight / 2)} - 100 = ${Math.round(canvasContext.canvasHeight / 2 - 100)}
     Use: createRectangle with x=${Math.round(canvasContext.canvasWidth / 2 - canvasContext.canvasWidth / 4)}, y=${Math.round(canvasContext.canvasHeight / 2 - 100)}

2. **CIRCLES**: x,y parameters represent the CENTER of the circle
   - To center a circle at the canvas center, use x=${Math.round(canvasContext.canvasWidth / 2)}, y=${Math.round(canvasContext.canvasHeight / 2)} directly

3. **LINES**: x1,y1 is the start point, x2,y2 is the end point

**Positioning Examples:**
- "Center of canvas" = (${Math.round(canvasContext.canvasWidth / 2)}, ${Math.round(canvasContext.canvasHeight / 2)})
  * For rectangle 300×200: Use x=${Math.round(canvasContext.canvasWidth / 2 - 150)}, y=${Math.round(canvasContext.canvasHeight / 2 - 100)}
  * For circle radius 100: Use x=${Math.round(canvasContext.canvasWidth / 2)}, y=${Math.round(canvasContext.canvasHeight / 2)}

- "Middle of rectangle" at x=100, y=50, width=200, height=100:
  * Rectangle center is at (100 + 200/2, 50 + 100/2) = (200, 100)
  * For new rectangle 80×60: Use x=160, y=70 (center - half dimensions)
  * For new circle radius 30: Use x=200, y=100 (center directly)

**Available Tools:**
- createRectangle: Create rectangles (x,y = top-left corner)
- createCircle: Create circles (x,y = center)
- createLine: Create lines (x1,y1 = start, x2,y2 = end)
- createText: Create text (x,y = top-left corner)
- updateObject: Modify existing objects (requires object to be unlocked)
- getCanvasObjects: Query canvas state

**Guidelines:**
1. When users say "make it [color]" or similar, they're referring to selected objects
2. If no objects are selected and the command requires selection, ask the user to select an object first
3. Use reasonable defaults for unspecified properties (e.g., fill: "#ff0000" for red, stroke: "#000000")
4. ALWAYS calculate positions correctly based on whether the shape uses top-left or center coordinates
5. For "center" commands, show your calculation in the response
6. Be concise and helpful in your responses
7. If a tool execution fails, explain why and suggest alternatives

**Guidelines for Updating Objects:**
1. When users say "make it [property]" without selecting an object:
   - If you just created an object in this conversation, you can update it directly
   - The updateObject tool will automatically infer the last created object
   - You can omit the objectId parameter and it will use: explicit ID > selected object > last created object
2. If no object is selected and you haven't created any objects, ask the user to select one
3. Always check your "Objects You Created in This Conversation" section for object IDs
4. Priority order: explicit objectId parameter > selected object > last AI-created object

**User ID:** ${userId}
**Canvas ID:** ${canvasId}`;

    // 7. Build messages array for AI
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    // 8. Call OpenAI with tool execution (with retry logic and timeout)
    let aiResponse;
    let lastError: Error | null = null;

    // Retry loop for OpenAI API calls
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Request timeout")),
            API_TIMEOUT_MS
          );
        });

        // Race between API call and timeout
        // Using GPT-4 Turbo for fast tool calling. O3-mini is too slow for simple spatial commands (7+ seconds).
        const apiPromise = generateText({
          model: openai("gpt-4.1-mini"),
          messages,
          tools: aiTools,
          stopWhen: stepCountIs(10), // Enable multi-step agentic tool execution (up to 10 sequential steps)
          experimental_context: {
            userId,
            canvasId,
            selectedIds,
            sessionId,
          },
        });

        aiResponse = (await Promise.race([apiPromise, timeoutPromise])) as any;

        // Success - break out of retry loop
        console.log(
          `[AI API] Successfully generated response (attempt ${attempt + 1})`
        );
        break;
      } catch (error: any) {
        lastError = error;
        console.error(
          `[AI API] Error on attempt ${attempt + 1}/${MAX_RETRIES + 1}:`,
          error.message
        );

        // Handle specific errors that shouldn't be retried
        if (error.message?.includes("API key")) {
          return NextResponse.json(
            {
              error:
                "OpenAI API key not configured. Please check your environment variables.",
            },
            { status: 500 }
          );
        }

        // Handle rate limiting (don't retry)
        if (error.message?.includes("rate limit") || error.status === 429) {
          return NextResponse.json(
            {
              error:
                "OpenAI rate limit exceeded. Please try again in a few moments.",
            },
            { status: 429 }
          );
        }

        // If this is the last attempt, handle the error
        if (attempt === MAX_RETRIES) {
          console.error("[AI API] All retry attempts failed");

          // Handle timeout
          if (error.message?.includes("timeout")) {
            return NextResponse.json(
              {
                error:
                  "Request timed out. The AI is taking too long to respond. Please try a simpler command or try again later.",
              },
              { status: 504 }
            );
          }

          // Generic error
          return NextResponse.json(
            {
              error:
                "AI service temporarily unavailable. Please try again in a moment.",
            },
            { status: 503 }
          );
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, etc.
        console.log(`[AI API] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // If we still don't have a response, something went wrong
    if (!aiResponse) {
      return NextResponse.json(
        {
          error:
            lastError?.message || "Failed to get AI response after retries",
        },
        { status: 503 }
      );
    }

    // 9. Extract tool results from response
    const toolResults: AIToolResult[] = [];

    if (aiResponse.toolCalls) {
      for (const toolCall of aiResponse.toolCalls) {
        const result = aiResponse.toolResults?.find(
          (r: any) => r.toolCallId === toolCall.toolCallId
        );

        if (result) {
          // The AI SDK returns the result in the 'output' field (not 'result')
          const toolResult = (result as any).output;

          // Extract success - the tools return { success: true/false, ... }
          const success = Boolean(toolResult?.success);

          toolResults.push({
            toolName: toolCall.toolName,
            success: success,
            objectIds: toolResult?.id
              ? [toolResult.id]
              : toolResult?.objectIds || [],
            message:
              toolResult?.message || toolResult?.error || "Operation completed",
            error: toolResult?.error,
          });

          console.log(
            `[AI Tool Result] ${toolCall.toolName}: success=${success}, message=${toolResult?.message}`
          );
        }
      }
    }

    // 10. Return response
    return NextResponse.json({
      message: aiResponse.text,
      toolResults,
      usage: {
        promptTokens: (aiResponse.usage as any).promptTokens || 0,
        completionTokens: (aiResponse.usage as any).completionTokens || 0,
        totalTokens: aiResponse.usage.totalTokens || 0,
      },
    });
  } catch (error) {
    console.error("Unexpected error in AI chat route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// Method Not Allowed Handler
// ============================================================================

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed - Use POST" },
    { status: 405 }
  );
}
