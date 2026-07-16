import { create } from "zustand";

export type ToastTone = "info" | "success" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
  durationMs: number;
}

interface ToastStore {
  toasts: ToastItem[];
  showToast: (
    message: string,
    options?: {
      tone?: ToastTone;
      action?: ToastAction;
      durationMs?: number;
    }
  ) => string;
  dismissToast: (id: string) => void;
}

let toastSeq = 0;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  showToast: (message, options) => {
    const id = `toast-${++toastSeq}-${Date.now()}`;
    const item: ToastItem = {
      id,
      message,
      tone: options?.tone ?? "info",
      action: options?.action,
      durationMs: options?.durationMs ?? 4000,
    };
    set({ toasts: [...get().toasts, item].slice(-4) });
    if (item.durationMs > 0) {
      window.setTimeout(() => {
        get().dismissToast(id);
      }, item.durationMs);
    }
    return id;
  },

  dismissToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export function showToast(
  message: string,
  options?: {
    tone?: ToastTone;
    action?: ToastAction;
    durationMs?: number;
  }
): string {
  return useToastStore.getState().showToast(message, options);
}
