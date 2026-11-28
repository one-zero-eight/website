import type { searchTypes } from "@/api/search";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function chat(chat_id: string, answer_count: number) {
  return {
    chat_id,
    title: chat_id,
    created_at: "2099-01-01T00:00:00Z",
    updated_at: "2099-01-01T00:00:00Z",
    answer_count,
    answering: false,
  } satisfies searchTypes.SchemaAskChat;
}

describe("unread answers", () => {
  let root: Root;
  let unread: Record<string, number>;
  let useUnreadAnswers: typeof import("./ask-unread").useUnreadAnswers;
  // The module keeps what the user has seen in memory: a reload is a fresh import
  async function load() {
    vi.resetModules();
    ({ useUnreadAnswers } = await import("./ask-unread"));
    root = createRoot(document.createElement("div"));
  }
  function render(
    chats: searchTypes.SchemaAskChat[],
    openChatId: string | null,
  ) {
    function Probe() {
      unread = useUnreadAnswers(chats, openChatId);
      return null;
    }
    act(() => root.render(createElement(Probe)));
  }
  beforeEach(async () => {
    localStorage.clear();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    await load();
  });
  afterEach(() => act(() => root.unmount()));

  it("counts the answers given while the chat was not open, and clears them once it is opened", () => {
    render([chat("a", 0), chat("b", 2)], "a");
    expect(unread).toEqual({}); // first visit: nothing is unread
    render([chat("a", 1), chat("b", 2)], "b");
    expect(unread).toEqual({ a: 1 });
    render([chat("a", 3), chat("b", 2)], "b");
    expect(unread).toEqual({ a: 3 });
    render([chat("a", 3), chat("b", 2)], "a");
    expect(unread).toEqual({});
  });

  it("keeps the count after a reload, which is how an answer given with the window closed shows up", async () => {
    render([chat("a", 0)], "a");
    act(() => root.unmount());
    await load();
    render([chat("a", 1)], null);
    expect(unread).toEqual({ a: 1 });
  });

  it("shows the same unread answers to every place that asks, as the list and the menu do", () => {
    let menu: Record<string, number> = {};
    function Menu() {
      menu = useUnreadAnswers([chat("a", 1)], null);
      return null;
    }
    render([chat("a", 0)], "a");
    const menuRoot = createRoot(document.createElement("div"));
    act(() => menuRoot.render(createElement(Menu)));
    expect(menu).toEqual({ a: 1 });
    render([chat("a", 1)], "a"); // the list shows the chat: it is read
    act(() => menuRoot.render(createElement(Menu)));
    expect(menu).toEqual({});
    act(() => menuRoot.unmount());
  });
});
