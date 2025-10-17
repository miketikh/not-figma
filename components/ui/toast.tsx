"use client";

import * as React from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { cn } from "@/lib/utils";

interface Toast {
  id: string;
  title?: string;
  description: string;
  variant?: "default" | "destructive" | "success" | "info";
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(
  undefined
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = React.useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);

      // Auto remove after duration (default 5 seconds)
      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const variantStyles = {
    default: "bg-background text-foreground",
    destructive: "border-destructive/50 text-destructive dark:border-destructive",
    success: "border-green-500/50 text-green-700 dark:text-green-400 dark:border-green-500",
    info: "border-blue-500/50 text-blue-700 dark:text-blue-400 dark:border-blue-500",
  };

  const Icon = {
    default: Info,
    destructive: AlertCircle,
    success: CheckCircle,
    info: Info,
  }[toast.variant ?? "default"];

  return (
    <Alert
      className={cn(
        "pointer-events-auto transition-all duration-300 shadow-lg",
        variantStyles[toast.variant ?? "default"]
      )}
    >
      <Icon className="h-4 w-4" />
      <div className="flex-1">
        {toast.title && <AlertTitle>{toast.title}</AlertTitle>}
        <AlertDescription>{toast.description}</AlertDescription>
      </div>
      <button
        onClick={onClose}
        className="absolute right-2 top-2 rounded-md p-1 hover:bg-muted transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}
