import { beforeEach, describe, expect, it } from "bun:test";

import { useLibraryCreateStore } from "./library-create-store";

beforeEach(() => {
  useLibraryCreateStore.setState({
    hasProgress: false,
    browseResetKey: 0,
    discardDialogOpen: false,
    discardIntent: null,
  });
});

describe("library-create-store discard intents", () => {
  it("navigates immediately when Account is chosen with no progress", () => {
    expect(useLibraryCreateStore.getState().requestDiscard("leave-account")).toBe("proceeded");
    expect(useLibraryCreateStore.getState().discardDialogOpen).toBe(false);
  });

  it("opens the dialog for Account and reload when there is progress", async () => {
    useLibraryCreateStore.setState({ hasProgress: true });

    expect(useLibraryCreateStore.getState().requestDiscard("leave-account")).toBe("dialog");
    await Promise.resolve();
    expect(useLibraryCreateStore.getState()).toMatchObject({
      discardDialogOpen: true,
      discardIntent: "leave-account",
    });

    useLibraryCreateStore.getState().cancelDiscard();
    expect(useLibraryCreateStore.getState().requestDiscard("reload")).toBe("dialog");
    await Promise.resolve();
    expect(useLibraryCreateStore.getState()).toMatchObject({
      discardDialogOpen: true,
      discardIntent: "reload",
    });
  });

  it("returns the leave intent on confirm without resetting browse", () => {
    useLibraryCreateStore.setState({
      hasProgress: true,
      discardDialogOpen: true,
      discardIntent: "leave-account",
      browseResetKey: 4,
    });

    expect(useLibraryCreateStore.getState().confirmDiscard()).toBe("leave-account");
    expect(useLibraryCreateStore.getState()).toMatchObject({
      hasProgress: false,
      discardDialogOpen: false,
      discardIntent: null,
      browseResetKey: 4,
    });
  });
});
