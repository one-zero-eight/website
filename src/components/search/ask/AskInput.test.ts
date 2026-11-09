import type { searchTypes } from "@/api/search";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskInput } from "./AskInput";
import type { DraftAttachment } from "./ask-session";

const api = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn() }));
vi.mock("@/api/search", () => ({
  $search: {
    useMutation: (method: string) => ({
      mutateAsync: method === "post" ? api.upload : api.remove,
    }),
  },
}));
const info = {
  id: "attachment-1",
  filename: "notes.txt",
  media_type: "text/plain",
  size_bytes: 5,
  pages: 1,
} satisfies searchTypes.SchemaAttachmentInfo;

describe("AskInput attachments", () => {
  let root: Root;
  let container: HTMLDivElement;
  const send = vi.fn();
  function Composer() {
    const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
    return createElement(AskInput, {
      text: "Read this",
      setText: vi.fn(),
      onSend: send,
      onStop: vi.fn(),
      isPending: false,
      attachments,
      onAttachmentsChange: setAttachments,
    });
  }
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:preview"),
        revokeObjectURL: vi.fn(),
      }),
    );
    api.upload.mockReset().mockResolvedValue(info);
    api.remove.mockReset().mockResolvedValue(null);
    send.mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const i18n = setupI18n({ locale: "en", messages: { en: {} } });
    act(() =>
      root.render(
        createElement(I18nProvider, { i18n }, createElement(Composer)),
      ),
    );
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  async function pick(files: File[]) {
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    Object.defineProperty(input!, "files", {
      value: files,
      configurable: true,
    });
    await act(async () =>
      input!.dispatchEvent(new Event("change", { bubbles: true })),
    );
  }
  it("cancels an upload without adding its late result to the draft", async () => {
    let finish!: (value: typeof info) => void;
    api.upload.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await pick([new File(["x"], "notes.txt")]);
    const cancel = container.querySelector<HTMLButtonElement>(
      'button[title="Cancel upload"]',
    );
    expect(cancel).not.toBeNull();
    act(() => cancel!.click());
    expect(api.upload.mock.calls[0][0].signal.aborted).toBe(true);
    await act(async () => finish(info));
    expect(container.textContent).not.toContain("notes.txt");
    expect(api.remove).toHaveBeenCalledWith({
      params: { path: { attachment_id: info.id } },
    });
  });
  it("discards a late upload after switching chats and does not start the queued file", async () => {
    let finish!: (value: typeof info) => void;
    api.upload.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await pick([new File(["x"], "notes.txt"), new File(["y"], "second.txt")]);
    const signal = api.upload.mock.calls[0][0].signal;
    const i18n = setupI18n({ locale: "en", messages: { en: {} } });
    act(() =>
      root.render(
        createElement(
          I18nProvider,
          { i18n },
          createElement(Composer, { key: "another-chat" }),
        ),
      ),
    );
    await act(async () => finish(info));
    expect(signal.aborted).toBe(true);
    expect(api.upload).toHaveBeenCalledTimes(1);
    expect(api.remove).toHaveBeenCalledWith({
      params: { path: { attachment_id: info.id } },
    });
    expect(container.textContent).not.toContain("notes.txt");
  });
  it("removes an expired draft locally after a structured 404", async () => {
    await pick([new File(["x"], "notes.txt")]);
    api.remove.mockRejectedValueOnce({
      httpCode: 404,
      body: { detail: "Attachment not found." },
      response: new Response(null, { status: 404 }),
    });
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[title="Remove attachment"]')!
        .click(),
    );
    expect(container.textContent).not.toContain("notes.txt");
    expect(container.querySelector(".text-error")).toBeNull();
  });
  it.each([403, 409, 500])(
    "retains a draft when DELETE returns %s",
    async (httpCode) => {
      await pick([new File(["x"], "notes.txt")]);
      api.remove.mockRejectedValueOnce({
        httpCode,
        body: { detail: "Deletion refused" },
        response: new Response(null, { status: httpCode }),
      });
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>(
            'button[title="Remove attachment"]',
          )!
          .click(),
      );
      expect(container.textContent).toContain("notes.txt");
      expect(container.textContent).toContain("Deletion refused");
    },
  );
  it("keeps the draft visible when deleting it fails", async () => {
    await pick([new File(["x"], "notes.txt")]);
    api.remove.mockRejectedValueOnce(new Error("Deletion failed"));
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[title="Remove attachment"]')!
        .click(),
    );
    expect(container.textContent).toContain("Deletion failed");
    expect(container.textContent).toContain("notes.txt");
  });
  it.each(["drop", "paste"])(
    "accepts an image from %s with a revocable local preview",
    async (kind) => {
      const image = new File(["png"], "image.png", { type: "image/png" });
      api.upload.mockResolvedValueOnce({
        ...info,
        filename: "image.png",
        media_type: "image/png",
      });
      const event = new Event(kind, { bubbles: true, cancelable: true });
      Object.defineProperty(
        event,
        kind === "drop" ? "dataTransfer" : "clipboardData",
        { value: { files: [image], types: ["Files"] } },
      );
      await act(async () =>
        container.querySelector("textarea")!.dispatchEvent(event),
      );
      expect(event.defaultPrevented).toBe(true);
      expect(api.upload).toHaveBeenCalledOnce();
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "blob:preview",
      );
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>(
            'button[title="Remove attachment"]',
          )!
          .click(),
      );
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
    },
  );
  it.each([
    [
      "unsupported format",
      () => [new File(["zip"], "archive.zip")],
      "PDF, TXT, PNG, JPEG or WebP",
    ],
    [
      "file too large",
      () => [new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.pdf")],
      "10 MiB",
    ],
    [
      "too many files",
      () => Array.from({ length: 4 }, (_, i) => new File(["x"], `${i}.txt`)),
      "3 files",
    ],
  ])("rejects %s before uploading", async (_, files, message) => {
    await pick(files());
    expect(api.upload).not.toHaveBeenCalled();
    expect(container.textContent).toContain(message);
  });
  it("keeps successful uploads and surfaces a failed upload", async () => {
    api.upload.mockRejectedValueOnce({
      httpCode: 422,
      body: { detail: "PDF has too many pages" },
    });
    await pick([new File(["pdf"], "bad.pdf")]);
    expect(container.textContent).toContain("PDF has too many pages");
    expect(container.querySelector(".loading-spinner")).toBeNull();
    await pick([new File(["hello"], "notes.txt")]);
    expect(container.textContent).toContain("notes.txt");
  });
  it("queues uploads and disables sending until every file is ready", async () => {
    let finish!: (value: typeof info) => void;
    api.upload.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    api.upload.mockResolvedValueOnce({
      ...info,
      id: "attachment-2",
      filename: "second.txt",
    });
    await pick([
      new File(["hello"], "notes.txt"),
      new File(["two"], "second.txt"),
    ]);
    expect(api.upload).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector<HTMLButtonElement>('button[title="Send"]')!
        .disabled,
    ).toBe(true);
    expect(container.querySelector(".loading-spinner")).not.toBeNull();
    await act(async () => finish(info));
    expect(api.upload).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("notes.txt");
    expect(container.textContent).toContain("second.txt");
    expect(
      container.querySelector<HTMLButtonElement>('button[title="Send"]')!
        .disabled,
    ).toBe(false);
  });
  it("uploads a picked file as binary and removes the unbound draft", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    await pick([file]);
    expect(api.upload).toHaveBeenCalledOnce();
    const request = api.upload.mock.calls[0][0];
    expect(request.params.query).toBeUndefined();
    expect(request.params.header["X-Attachment-Filename"]).toBe("notes.txt");
    expect(request.headers["Content-Type"]).toBe("application/octet-stream");
    expect(request.bodySerializer()).toBe(file);
    expect(container.textContent).toContain("notes.txt");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[title="Remove attachment"]')!
        .click(),
    );
    expect(api.remove).toHaveBeenCalledWith({
      params: { path: { attachment_id: info.id } },
    });
    expect(container.textContent).not.toContain("notes.txt");
  });
});
