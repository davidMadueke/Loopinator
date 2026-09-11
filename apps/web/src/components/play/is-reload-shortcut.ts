export function isReloadShortcut(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey">) {
  if (event.key === "F5") {
    return true;
  }

  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r";
}
