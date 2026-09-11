import { useEffect, useRef } from "react";

const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "url",
  "tel",
  "password",
  "number",
  "date",
  "datetime-local",
  "month",
  "week",
  "time",
]);

const FORM_FIELD_ROLES = new Set(["textbox", "searchbox", "combobox", "spinbutton"]);

const handlers: Array<() => void> = [];

function isFormFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const role = target.getAttribute("role");
  if (role && FORM_FIELD_ROLES.has(role)) {
    return true;
  }

  const field = target.closest("input, textarea, select");
  if (!field) {
    return false;
  }

  if (field instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(field.type);
  }

  return true;
}

function onWindowKeyDown(event: KeyboardEvent) {
  if (event.code !== "Space" && event.key !== " ") {
    return;
  }

  if (
    event.repeat ||
    event.defaultPrevented ||
    event.isComposing ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey
  ) {
    return;
  }

  if (isFormFieldTarget(event.target)) {
    return;
  }

  const handler = handlers.at(-1);
  if (!handler) {
    return;
  }

  event.preventDefault();
  handler();
}

/**
 * Maps Space to play/pause unless a text field, textarea, select, or
 * combobox is focused. Last mounted caller wins so a waveform preview
 * takes over the main transport while the create form is open.
 */
export function useSpacebarPlayPause(onToggle: () => void, enabled = true) {
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handler = () => {
      onToggleRef.current();
    };

    handlers.push(handler);
    if (handlers.length === 1) {
      window.addEventListener("keydown", onWindowKeyDown);
    }

    return () => {
      const index = handlers.lastIndexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        window.removeEventListener("keydown", onWindowKeyDown);
      }
    };
  }, [enabled]);
}
