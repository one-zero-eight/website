import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskInput } from "./AskInput";
import { AskAttachment } from "./AskAttachment";
import type { DraftAttachment } from "./ask-session";

const transport = vi.hoisted(() => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  return fetch;
});
vi.mock("@/api/search/links.ts", () => ({
  SEARCH_API_URL: "http://localhost/search",
}));
vi.mock("@/api/helpers/access-token.ts", () => ({
  getMyAccessToken: () => "fixture-token",
  invalidateMyAccessToken: vi.fn(),
}));
const info = {
  id: "file-1",
  filename: "image.png",
  media_type: "image/png",
  size_bytes: 3,
  pages: 1,
};

describe("attachment shared-client transport", () => {
  let root: Root;
  let container: HTMLDivElement;
  let queryClient: QueryClient;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fixture");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    transport.mockReset();
    container = document.createElement("div");
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });
  afterEach(() => {
    act(() => root.unmount());
    queryClient.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  function render(child: ReturnType<typeof createElement>) {
    const i18n = setupI18n({ locale: "en", messages: { en: {} } });
    act(() =>
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(I18nProvider, { i18n }, child),
        ),
      ),
    );
  }
  it("sends actual binary bytes with shared authentication and deletes the draft", async () => {
    const requests: Request[] = [];
    transport.mockImplementation(async (request: Request) => {
      requests.push(request.clone());
      return request.method === "POST"
        ? Response.json(info)
        : new Response(null, { status: 204 });
    });
    function Composer() {
      const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
      return createElement(AskInput, {
        text: "",
        setText: vi.fn(),
        isPending: false,
        onStop: vi.fn(),
        onSend: vi.fn(),
        attachments,
        onAttachmentsChange: setAttachments,
      });
    }
    render(createElement(Composer));
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]')!;
    // Match Node's native Request implementation without adding Node globals to the SPA's types.
    const { File: NativeFile } = await vi.importActual<{ File: typeof File }>(
      "node:buffer",
    );
    const filename = "PRIVATE résumé%20+фото.png";
    const file = new NativeFile([new Uint8Array([0, 1, 255])], filename, {
      type: "image/png",
    });
    Object.defineProperty(input, "files", { value: [file] });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("http://localhost/search/ask/attachments");
    expect(requests[0].url).not.toContain("PRIVATE");
    expect(requests[0].headers.get("X-Attachment-Filename")).toBe(
      encodeURIComponent(filename),
    );
    expect(
      decodeURIComponent(requests[0].headers.get("X-Attachment-Filename")!),
    ).toBe(filename);
    expect(requests[0].headers.get("authorization")).toBe(
      "Bearer fixture-token",
    );
    expect(requests[0].headers.get("content-type")).toBe(
      "application/octet-stream",
    );
    expect(Array.from(new Uint8Array(await requests[0].arrayBuffer()))).toEqual(
      [0, 1, 255],
    );
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button[title="Remove attachment"]')!
        .click();
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(requests[1].method).toBe("DELETE");
    expect(requests[1].url).toBe(
      "http://localhost/search/ask/attachments/file-1",
    );
    expect(requests[1].headers.get("authorization")).toBe(
      "Bearer fixture-token",
    );
  });
  it("removes an expired draft using the actual shared-client 404 error", async () => {
    transport.mockResolvedValueOnce(
      Response.json({ detail: "Attachment not found." }, { status: 404 }),
    );
    function Composer() {
      const [attachments, setAttachments] = useState<DraftAttachment[]>([
        { info },
      ]);
      return createElement(AskInput, {
        text: "",
        setText: vi.fn(),
        isPending: false,
        onStop: vi.fn(),
        onSend: vi.fn(),
        attachments,
        onAttachmentsChange: setAttachments,
      });
    }
    render(createElement(Composer));
    expect(container.textContent).toContain(info.filename);
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button[title="Remove attachment"]')!
        .click();
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    const error = queryClient.getMutationCache().getAll()[0].state.error;
    expect(error).toMatchObject({
      httpCode: 404,
      body: { detail: "Attachment not found." },
      response: expect.any(Response),
    });
    expect(transport.mock.calls[0][0].method).toBe("DELETE");
    expect(container.textContent).not.toContain(info.filename);
    expect(container.querySelector(".text-error")).toBeNull();
  });
  it("downloads a blob through the authenticated client without browser caching", async () => {
    transport.mockResolvedValueOnce(
      new Response(new Uint8Array([0, 1, 255]), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "private, no-store",
        },
      }),
    );
    render(createElement(AskAttachment, { attachment: info }));
    expect(transport).not.toHaveBeenCalled();
    await act(async () => {
      container.querySelector("button")!.click();
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    const request = transport.mock.calls[0][0] as Request;
    expect(request.url).toBe(
      "http://localhost/search/ask/attachments/file-1/content",
    );
    expect(request.headers.get("authorization")).toBe("Bearer fixture-token");
    expect(request.cache).toBe("no-store");
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([
      0, 1, 255,
    ]);
  });
});
