"use client";

import * as React from "react";
import { CheckCircleIcon, InfoIcon, AlertTriangleIcon, XCircleIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

export type ToastVariant = "success" | "info" | "warning" | "error";

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  /** Duration in ms. Use 0 for sticky (must be dismissed manually) */
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${++toastIdCounter}`;
    const newToast: Toast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss based on variant defaults
    const duration = toast.duration !== undefined 
      ? toast.duration 
      : toast.variant === "success" 
        ? 2200 
        : toast.variant === "info" 
          ? 0 // sticky
          : 4000;

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return {
    success: (message: string, duration?: number) =>
      context.addToast({ variant: "success", message, duration }),
    info: (message: string, duration?: number) =>
      context.addToast({ variant: "info", message, duration }),
    warning: (message: string, duration?: number) =>
      context.addToast({ variant: "warning", message, duration }),
    error: (message: string, duration?: number) =>
      context.addToast({ variant: "error", message, duration }),
    dismiss: (id: string) => context.removeToast(id),
  };
}

function ToastContainer() {
  const { toasts } = React.useContext(ToastContext)!;
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed bottom-0 right-0 z-50 flex flex-col gap-3 p-4 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = React.useContext(ToastContext)!;
  const [isExiting, setIsExiting] = React.useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => removeToast(toast.id), 200); // Match animation duration
  };

  const variantStyles = {
    success: {
      bg: "bg-[rgb(var(--success))]/10",
      border: "border-[rgb(var(--success))]",
      text: "text-[rgb(var(--success))]",
      icon: CheckCircleIcon,
    },
    info: {
      bg: "bg-[rgb(var(--primary))]/10",
      border: "border-[rgb(var(--primary))]",
      text: "text-[rgb(var(--primary))]",
      icon: InfoIcon,
    },
    warning: {
      bg: "bg-[rgb(var(--warn))]/10",
      border: "border-[rgb(var(--warn))]",
      text: "text-[rgb(var(--warn))]",
      icon: AlertTriangleIcon,
    },
    error: {
      bg: "bg-[rgb(var(--danger))]/10",
      border: "border-[rgb(var(--danger))]",
      text: "text-[rgb(var(--danger))]",
      icon: XCircleIcon,
    },
  };

  const style = variantStyles[toast.variant];
  const Icon = style.icon;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 min-w-[320px] max-w-md p-4",
        "bg-[rgb(var(--surface))]",
        "border-l-4",
        style.border,
        "rounded-[var(--r-md)]",
        "shadow-[var(--elev2)]",
        "pointer-events-auto",
        "transition-all duration-200",
        isExiting
          ? "opacity-0 translate-x-4"
          : "opacity-100 translate-x-0 animate-in slide-in-from-right-5"
      )}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", style.text)} />
      
      <p className="flex-1 text-sm text-[rgb(var(--text))] leading-relaxed">
        {toast.message}
      </p>

      <button
        type="button"
        onClick={handleDismiss}
        className={cn(
          "flex-shrink-0 p-0.5",
          "text-[rgb(var(--muted))]",
          "hover:text-[rgb(var(--text))]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary))]",
          "rounded-[var(--r-sm)]",
          "transition-colors duration-[var(--duration-fast)]"
        )}
        aria-label="Închide notificarea"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
