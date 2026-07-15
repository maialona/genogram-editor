import { useEffect } from "react";
import { useDocumentStore } from "../store/documentStore";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

/** Global editor shortcuts: Delete, Ctrl+C/V/Z/Y */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const mod = e.ctrlKey || e.metaKey;
      const store = useDocumentStore.getState();

      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        store.undo();
        return;
      }

      if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        store.redo();
        return;
      }

      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        store.copySelected();
        return;
      }

      if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        store.pasteClipboard();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        store.deleteSelected();
        return;
      }

      if (e.key === "Escape") {
        store.setInteractionMode("select");
        store.clearSelection();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
