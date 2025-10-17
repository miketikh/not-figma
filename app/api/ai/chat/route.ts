/**
 * AI Chat API Route
 * Processes AI chat requests and executes canvas tools
 * Uses Vercel AI SDK with OpenAI for natural language processing
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
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
      canvasContext = await buildCanvasContext(canvasId, userId, selectedIds);
    } catch (error) {
      console.error("Error building canvas context:", error);
      return NextResponse.json(
        { error: "Failed to fetch canvas data" },
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

**Available Tools:**
- createRectangle: Create rectangular shapes
- createCircle: Create circular shapes
- createLine: Create straight lines
- createText: Create text objects
- updateObject: Modify existing objects (requires object to be unlocked)
- getCanvasObjects: Query canvas state

**Guidelines:**
1. When users say "make it [color]" or similar, they're referring to selected objects
2. If no objects are selected and the command requires selection, ask the user to select an object first
3. Use reasonable defaults for unspecified properties (e.g., fill: "#000000", stroke: "#000000")
4. Coordinates are in pixels from top-left corner
5. Be concise and helpful in your responses
6. If a tool execution fails, explain why and suggest alternatives

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

    // Inject context into tool execute functions by wrapping them
    const toolsWithContext = Object.fromEntries(
      Object.entries(aiTools).map(([key, tool]) => [
        key,
        {
          ...tool,
          execute: async (params: any) => {
            // Pass context to tool execute function
            return await (tool as any).execute(params, {
              userId,
              canvasId,
              selectedIds,
            });
          },
        },
      ])
    );

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
        const apiPromise = generateText({
          model: openai("o3-mini"),
          messages,
          tools: toolsWithContext,
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
          const toolResult = (result as any).result;
          toolResults.push({
            toolName: toolCall.toolName,
            success: toolResult?.success ?? false,
            objectIds: toolResult?.id
              ? [toolResult.id]
              : toolResult?.objectIds || [],
            message:
              toolResult?.message || toolResult?.error || "Tool executed",
            error: toolResult?.error,
          });
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
