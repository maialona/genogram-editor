import { useEffect } from "react";
import { useDocumentStore } from "../store/documentStore";
import { useAiGenerationStore } from "../store/aiGenerationStore";

/**
 * True only when the event target is actively editing text.
 * Checkboxes, radios, buttons, and <select> do NOT count — Delete should
 * still remove the canvas selection when those are focused.
 */
function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  if (tag === "TEXTAREA") return true;

  if (tag === "INPUT") {
    const type = ((target as HTMLInputElement).type || "text").toLowerCase();
    // Non-textual inputs: allow canvas Delete shortcuts through
    if (
      type === "button" ||
      type === "checkbox" ||
      type === "radio" ||
      type === "submit" ||
      type === "reset" ||
      type === "file" ||
      type === "color" ||
      type === "range" ||
      type === "hidden" ||
      type === "image"
    ) {
      return false;
    }
    // readOnly / disabled fields don't consume Backspace meaningfully
    const input = target as HTMLInputElement;
    if (input.readOnly || input.disabled) return false;
    return true;
  }

  return false;
}

function isDeleteKey(e: KeyboardEvent): boolean {
  // Prefer e.code — more stable under CJK IME where e.key may be "Process"
  return (
    e.code === "Delete" ||
    e.code === "Backspace" ||
    e.key === "Delete" ||
    e.key === "Backspace" ||
    e.key === "Del"
  );
}

function isModKey(e: KeyboardEvent, letter: string): boolean {
  if (!(e.ctrlKey || e.metaKey)) return false;
  return e.key.toLowerCase() === letter || e.code === `Key${letter.toUpperCase()}`;
}

/** Global editor shortcuts: Delete, Ctrl+C/V/Z/Y */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (useAiGenerationStore.getState().isGenerating()) return;
      // Only skip during active IME composition (NOT keyCode 229 — that breaks
      // Delete/Backspace on Chinese Windows IMEs even when not composing).
      if (e.isComposing) return;

      const store = useDocumentStore.getState();
      const editing = isTextEditingTarget(e.target);

      if (isModKey(e, "z") && !e.shiftKey) {
        if (editing) return;
        e.preventDefault();
        store.undo();
        return;
      }

      if (isModKey(e, "y") || (isModKey(e, "z") && e.shiftKey)) {
        if (editing) return;
        e.preventDefault();
        store.redo();
        return;
      }

      if (isModKey(e, "c")) {
        if (editing) return;
        e.preventDefault();
        store.copySelected();
        return;
      }

      if (isModKey(e, "v")) {
        if (editing) return;
        e.preventDefault();
        store.pasteClipboard();
        return;
      }

      if (isDeleteKey(e)) {
        // Typing in a text field: let the field handle Backspace/Delete
        if (editing) return;
        if (store.selectedIds.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        store.deleteSelected();
        return;
      }

      if (e.key === "Escape" || e.code === "Escape") {
        store.setInteractionMode("select");
        store.clearSelection();
      }
    };

    // Capture phase so we run before other handlers / default browser behavior
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
