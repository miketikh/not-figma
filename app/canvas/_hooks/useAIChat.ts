/**
 * Hook for AI chat interactions
 * Handles sending messages, managing loading states, and error handling
 * Includes retry logic with exponential backoff
 */

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCanvasStore } from "../_store/canvas-store";
import { AIChatMessage, AIToolResult } from "@/types/ai";
import { auth } from "@/lib/firebase/config";

// Exponential backoff configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT_MS = 300000; // 5 minutes timeout for requests (o3-mini needs more time)

interface SendMessageOptions {
  message: string;
  canvasId: string;
  selectedIds: string[];
}

interface UseAIChatProps {
  onAutoSelect?: (objectId: string) => void;
}

interface UseAIChatReturn {
  sendMessage: (options: SendMessageOptions) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  return BASE_DELAY * Math.pow(2, attempt);
}

/**
 * Get Firebase ID token for authentication
 */
async function getAuthToken(): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  // Get the ID token (refreshes if needed)
  const token = await currentUser.getIdToken();
  return token;
}

export function useAIChat(props?: UseAIChatProps): UseAIChatReturn {
  const { onAutoSelect } = props || {};
  const { user } = useAuth();
  const { addChatMessage, chatHistory, aiSessionId } = useCanvasStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Send a message to the AI chat API with retry logic
   */
  const sendMessage = useCallback(
    async ({ message, canvasId, selectedIds }: SendMessageOptions) => {
      // Validate inputs
      if (!message.trim()) {
        setError("Message cannot be empty");
        return;
      }

      if (!user) {
        setError("User not authenticated");
        return;
      }

      if (!canvasId) {
        setError("Canvas ID is required");
        return;
      }

      // Reset error state
      setError(null);
      setIsLoading(true);

      // Create user message and add to chat history immediately (optimistic update)
      const userMessage: AIChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: Date.now(),
      };
      addChatMessage(userMessage);

      // Retry logic with exponential backoff
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          // Get fresh auth token for each attempt
          const token = await getAuthToken();

          // Build conversation history from chat messages (exclude system messages)
          const conversationHistory = chatHistory
            .filter((msg) => msg.role !== "system")
            .map((msg) => ({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            }));

          // Build request body
          const requestBody = {
            message,
            canvasId,
            selectedIds,
            sessionId: aiSessionId,
            conversationHistory,
          };

          // Create timeout promise
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error("Request timeout")),
              REQUEST_TIMEOUT_MS
            );
          });

          // Make API request with timeout
          const fetchPromise = fetch("/api/ai/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(requestBody),
          });

          // Race between fetch and timeout
          const response = await Promise.race([fetchPromise, timeoutPromise]);

          // Handle non-OK responses
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage =
              errorData.error || `Server error: ${response.status}`;

            // Don't retry on client errors (4xx except 429 rate limit)
            if (
              response.status >= 400 &&
              response.status < 500 &&
              response.status !== 429
            ) {
              throw new Error(errorMessage);
            }

            // Retry on server errors (5xx) and rate limits (429)
            throw new Error(errorMessage);
          }

          // Parse successful response
          const data = await response.json();
          const { message: aiMessage, toolResults } = data;

          // Debug: Log what we received from the API
          console.log("[AI Chat Frontend] Received tool results:", toolResults);

          // Create AI message and add to chat history
          const assistantMessage: AIChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: aiMessage || "I've processed your request.",
            timestamp: Date.now(),
            toolResults: toolResults as AIToolResult[] | undefined,
          };
          addChatMessage(assistantMessage);

          // Auto-select the last created object (if any)
          if (onAutoSelect && toolResults && Array.isArray(toolResults)) {
            // Filter for successful creation tools
            const creationTools = [
              "createRectangle",
              "createCircle",
              "createLine",
              "createText",
            ];
            const createdIds = toolResults
              .filter(
                (r: AIToolResult) =>
                  r.success &&
                  creationTools.includes(r.toolName) &&
                  r.objectIds &&
                  r.objectIds.length > 0
              )
              .flatMap((r: AIToolResult) => r.objectIds || []);

            // Select the last created object
            if (createdIds.length > 0) {
              const lastCreatedId = createdIds[createdIds.length - 1];
              console.log(
                `[AI Chat] Auto-selecting created object: ${lastCreatedId}`
              );
              onAutoSelect(lastCreatedId);
            }
          }

          // Success - clear loading state and return
          setIsLoading(false);
          return;
        } catch (err) {
          lastError = err as Error;
          console.error(
            `[AI Chat] Error on attempt ${attempt + 1}/${MAX_RETRIES}:`,
            err
          );

          // Check if this is a timeout error (don't retry timeouts)
          if (err instanceof Error && err.message.includes("timeout")) {
            const errorMessage =
              "Request timed out. Please try a simpler command.";
            setError(errorMessage);
            setIsLoading(false);

            // Add error message to chat
            const errorChatMessage: AIChatMessage = {
              id: `error-${Date.now()}`,
              role: "assistant",
              content: `Error: ${errorMessage}`,
              timestamp: Date.now(),
            };
            addChatMessage(errorChatMessage);
            return;
          }

          // If this is not the last attempt, wait before retrying
          if (attempt < MAX_RETRIES - 1) {
            const delay = getRetryDelay(attempt);
            console.log(`[AI Chat] Retrying in ${delay}ms...`);
            await sleep(delay);
          }
        }
      }

      // All retries failed - set error state
      const errorMessage =
        lastError?.message || "Failed to send message after multiple attempts";
      setError(errorMessage);
      setIsLoading(false);

      // Add error message to chat history
      const errorChatMessage: AIChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${errorMessage}. Please try again.`,
        timestamp: Date.now(),
      };
      addChatMessage(errorChatMessage);
    },
    [user, chatHistory, aiSessionId, addChatMessage, onAutoSelect]
  );

  return {
    sendMessage,
    isLoading,
    error,
  };
}
