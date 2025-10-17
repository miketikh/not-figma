"use client";

import { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "../_store/canvas-store";
import { useAIChat } from "../_hooks/useAIChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Sparkles, Send, Loader2, AlertCircle, Square, Circle, Minus, Type, Check } from "lucide-react";

interface AIChatPanelProps {
  canvasId: string;
  selectedIds: string[];
}

export default function AIChatPanel({
  canvasId,
  selectedIds,
}: AIChatPanelProps) {
  const { aiChatOpen, chatHistory, toggleAIChat } = useCanvasStore();
  const { sendMessage, isLoading, error } = useAIChat();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  // Focus input when panel opens
  useEffect(() => {
    if (aiChatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [aiChatOpen]);

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && aiChatOpen) {
        toggleAIChat();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aiChatOpen, toggleAIChat]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue(""); // Clear input immediately for better UX

    // Send message via useAIChat hook
    await sendMessage({
      message,
      canvasId,
      selectedIds,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get icon for tool type
  const getToolIcon = (toolName: string) => {
    const lowerName = toolName.toLowerCase();
    if (lowerName.includes("rectangle") || lowerName.includes("rect")) {
      return <Square className="w-3.5 h-3.5" />;
    }
    if (lowerName.includes("circle")) {
      return <Circle className="w-3.5 h-3.5" />;
    }
    if (lowerName.includes("line")) {
      return <Minus className="w-3.5 h-3.5" />;
    }
    if (lowerName.includes("text")) {
      return <Type className="w-3.5 h-3.5" />;
    }
    // Default icon for other operations (update, get, etc.)
    return <Check className="w-3.5 h-3.5" />;
  };

  // Format tool name for display
  const formatToolName = (toolName: string) => {
    // Convert camelCase to Title Case with spaces
    return toolName
      .replace(/([A-Z])/g, " $1")
      .trim()
      .replace(/^./, (str) => str.toUpperCase());
  };

  if (!aiChatOpen) return null;

  return (
    <>
      {/* Backdrop blur */}
      <div
        className="fixed inset-0 bg-black/5 backdrop-blur-[1px] z-40"
        onClick={toggleAIChat}
      />

      {/* Chat Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] bg-white border-l shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          aiChatOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-lg">AI Assistant</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleAIChat}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error Banner */}
          {error && (
            <Card className="p-3 bg-red-50 border-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Error</p>
                  <p className="text-xs text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </Card>
          )}

          {chatHistory.length === 0 ? (
            // Welcome message
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Welcome to your AI Canvas Assistant!
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Control the canvas with natural language. I can create
                      shapes, modify objects, and answer questions about your
                      design.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-700 font-semibold">
                      Creating shapes:
                    </p>
                    <ul className="text-xs text-gray-600 space-y-0.5 ml-3">
                      <li>
                        &bull; &ldquo;Create a red circle at 300, 300&rdquo;
                      </li>
                      <li>
                        &bull; &ldquo;Add a blue rectangle 200x150 at 100,
                        100&rdquo;
                      </li>
                      <li>
                        &bull; &ldquo;Draw a line from 50, 50 to 300, 200&rdquo;
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-700 font-semibold">
                      Modifying objects:
                    </p>
                    <ul className="text-xs text-gray-600 space-y-0.5 ml-3">
                      <li>
                        &bull; &ldquo;Make it green&rdquo; (select an object
                        first)
                      </li>
                      <li>&bull; &ldquo;Rotate it 45 degrees&rdquo;</li>
                      <li>
                        &bull; &ldquo;Change stroke to red with width 3&rdquo;
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-700 font-semibold">
                      Asking questions:
                    </p>
                    <ul className="text-xs text-gray-600 space-y-0.5 ml-3">
                      <li>&bull; &ldquo;What&apos;s on the canvas?&rdquo;</li>
                      <li>&bull; &ldquo;How many objects are there?&rdquo;</li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-purple-100">
                    <p className="text-xs text-gray-500 italic">
                      Tip: Be specific with coordinates and measurements for
                      best results!
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            // Chat messages
            chatHistory.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === "user"
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}
                  >
                    {formatTimestamp(message.timestamp)}
                  </p>

                  {/* Tool Results */}
                  {message.toolResults && message.toolResults.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {message.toolResults.map((result, idx) => (
                        <Card
                          key={idx}
                          className={`p-2.5 text-xs border ${
                            result.success
                              ? "bg-white border-gray-200 shadow-sm"
                              : "bg-red-50 border-red-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 ${
                                result.success
                                  ? "bg-blue-500 text-white"
                                  : "bg-red-500 text-white"
                              }`}
                            >
                              {result.success ? (
                                getToolIcon(result.toolName)
                              ) : (
                                <X className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`font-medium leading-tight ${
                                  result.success
                                    ? "text-gray-900"
                                    : "text-red-900"
                                }`}
                              >
                                {formatToolName(result.toolName)}
                              </p>
                              <p
                                className={`mt-0.5 leading-relaxed ${
                                  result.success
                                    ? "text-gray-600"
                                    : "text-red-700"
                                }`}
                              >
                                {result.message}
                              </p>
                              {result.error && (
                                <p className="text-red-600 mt-1 font-medium">
                                  {result.error}
                                </p>
                              )}
                              {result.objectIds && result.objectIds.length > 0 && (
                                <p className="text-blue-600 mt-1 text-[10px] font-medium">
                                  ID: {result.objectIds[0]}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  <p className="text-sm text-gray-600">Thinking...</p>
                </div>
              </div>
            </div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type a command..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press{" "}
            <kbd className="px-1.5 py-0.5 bg-white rounded text-xs border">
              Enter
            </kbd>{" "}
            to send,{" "}
            <kbd className="px-1.5 py-0.5 bg-white rounded text-xs border">
              Esc
            </kbd>{" "}
            to close
          </p>
        </div>
      </div>
    </>
  );
}
