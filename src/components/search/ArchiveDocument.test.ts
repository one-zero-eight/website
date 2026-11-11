import type { searchTypes } from "@/api/search";
import { customFetch } from "@/api/helpers/custom-fetch";
import { $search } from "@/api/search";
import { SEARCH_API_URL } from "@/api/search/links";
import { AnswerSourceKind, EduwikiSourceType } from "@/api/search/types";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import IframePreviewCard from "./IframePreviewCard";
import { AskResult } from "./ask/AskResult";

const { useSearchQuery } = vi.hoisted(() => ({ useSearchQuery: vi.fn() }));

vi.mock("@/api/helpers/custom-fetch", () => ({
  customFetch: { GET: vi.fn() },
}));
vi.mock("@/api/search", () => ({ $search: { useQuery: useSearchQuery } }));
vi.mock("./ask/AskApproval", () => ({ AskApproval: () => null }));
vi.mock("./ask/AskCalendarEvents", () => ({ AskCalendarEvents: () => null }));
vi.mock("./ask/AskFeedback", () => ({ AskFeedback: () => null }));

const source = {
  type: EduwikiSourceType.eduwiki,
  display_name: "Exam rules",
  url: "https://eduwiki.example/files/exams.zip",
  breadcrumbs: ["EduWiki", "Exams"],
  preview_text: "Exam rules",
  archive_document: {
    page: "courses/exam #1",
    revision: "sha256:abc+def",
    member: "2026/rules.pdf",
  },
} satisfies searchTypes.SchemaEduwikiSource;

describe("cited archive documents", () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: QueryClient;

  beforeEach(() => {
    useSearchQuery.mockReturnValue({});
    window.sessionStorage.clear();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = vi.fn(() => "blob:archive-pdf");
        static revokeObjectURL = vi.fn();
      },
    );
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  async function render(child: ReactNode) {
    const i18n = setupI18n({ locale: "en", messages: { en: {} } });
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client },
          createElement(I18nProvider, { i18n }, child),
        ),
      );
    });
  }

  it("fetches the exact descriptor through authenticated preview and shows its PDF, member and original archive", async () => {
    vi.mocked(customFetch.GET).mockResolvedValue({
      data: new Blob(["pdf"]),
      response: new Response(),
    });
    await render(
      createElement(IframePreviewCard, { source, onClose: vi.fn() }),
    );
    await vi.waitFor(() => expect(customFetch.GET).toHaveBeenCalled());
    const requestUrl = new URL(
      vi.mocked(customFetch.GET).mock.calls[0][0] as string,
    );
    expect(requestUrl.origin + requestUrl.pathname).toBe(
      `${SEARCH_API_URL}/search/archive-document`,
    );
    expect(Object.fromEntries(requestUrl.searchParams)).toEqual({
      page: source.archive_document.page,
      revision: source.archive_document.revision,
    });
    expect(customFetch.GET).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        parseAs: "blob",
        signal: expect.any(AbortSignal),
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe(
      "blob:archive-pdf",
    );
    expect(container.textContent).toContain(source.archive_document.member);
    expect(container.querySelector("a")?.getAttribute("href")).toBe(source.url);
    expect(container.querySelector("a")?.textContent).toBe(
      "Open original archive",
    );
    expect($search.useQuery).not.toHaveBeenCalled();
  });

  it.each(["missing", "network"])(
    "shows an explicit %s error without trying another member or generic page",
    async (failure) => {
      if (failure === "missing") {
        vi.mocked(customFetch.GET).mockResolvedValue({
          error: { detail: "changed" },
          response: new Response(null, { status: 404 }),
        });
      } else {
        vi.mocked(customFetch.GET).mockRejectedValue(new Error("offline"));
      }
      await render(
        createElement(IframePreviewCard, { source, onClose: vi.fn() }),
      );
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(container.textContent).toContain(
        "Could not open this archive document",
      );
      expect(container.textContent).toContain(source.archive_document.member);
      expect(container.querySelector("iframe")).toBeNull();
      expect(container.querySelector("a")?.getAttribute("href")).toBe(
        source.url,
      );
      expect(customFetch.GET).toHaveBeenCalledTimes(1);
      expect($search.useQuery).not.toHaveBeenCalled();
    },
  );

  it("shows loading, discards stale requests and revokes object URLs on descriptor switches and unmount", async () => {
    let resolveFirst!: (
      value: Awaited<ReturnType<typeof customFetch.GET>>,
    ) => void;
    vi.mocked(customFetch.GET).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    await render(
      createElement(IframePreviewCard, { source, onClose: vi.fn() }),
    );
    expect(container.querySelector(".loading-spinner")).not.toBeNull();
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Loading...",
    );
    expect(container.querySelector("iframe")).toBeNull();
    const firstSignal = vi.mocked(customFetch.GET).mock.calls[0][1]?.signal;
    vi.mocked(customFetch.GET).mockResolvedValue({
      data: new Blob(["second"]),
      response: new Response(),
    });
    const second = {
      ...source,
      archive_document: {
        ...source.archive_document,
        page: "second",
        member: "second.pdf",
      },
    };
    await render(
      createElement(IframePreviewCard, { source: second, onClose: vi.fn() }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(firstSignal?.aborted).toBe(true);
    await act(async () => {
      resolveFirst({ data: new Blob(["stale"]), response: new Response() });
    });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("second.pdf");
    expect(container.querySelector(".loading-spinner")).toBeNull();
    await render(
      createElement(IframePreviewCard, {
        source: {
          ...second,
          archive_document: {
            ...second.archive_document,
            revision: "new-revision",
          },
        },
        onClose: vi.fn(),
      }),
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:archive-pdf");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    await render(null);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("shows a circular loader while an ordinary PDF is downloading", async () => {
    vi.mocked(customFetch.GET).mockImplementationOnce(
      () => new Promise(() => {}),
    );
    await render(
      createElement(IframePreviewCard, {
        source: {
          ...source,
          archive_document: null,
          url: "https://eduwiki.example/rules.pdf",
        },
        onClose: vi.fn(),
      }),
    );
    expect(container.querySelector(".loading-spinner")).not.toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("reports an iframe failure instead of embedding the archive", async () => {
    vi.mocked(customFetch.GET).mockResolvedValue({
      data: new Blob(["pdf"]),
      response: new Response(),
    });
    await render(
      createElement(IframePreviewCard, { source, onClose: vi.fn() }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    act(() =>
      container
        .querySelector("iframe")!
        .dispatchEvent(new Event("error", { bubbles: true })),
    );
    expect(container.textContent).toContain(
      "Could not open this archive document",
    );
    expect(container.querySelector("iframe")).toBeNull();
    expect($search.useQuery).not.toHaveBeenCalled();
  });

  it.each(["missing", "network"])(
    "removes a previously loaded PDF when revalidation reports %s",
    async (failure) => {
      vi.mocked(customFetch.GET).mockResolvedValue({
        data: new Blob(["pdf"]),
        response: new Response(),
      });
      await render(
        createElement(IframePreviewCard, { source, onClose: vi.fn() }),
      );
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(container.querySelector("iframe")).not.toBeNull();
      if (failure === "missing") {
        vi.mocked(customFetch.GET).mockResolvedValue({
          error: {},
          response: new Response(null, { status: 404 }),
        });
      } else {
        vi.mocked(customFetch.GET).mockRejectedValue(new Error("offline"));
      }
      await act(async () => {
        await client.invalidateQueries({ queryKey: ["preview-file"] });
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(container.querySelector("iframe")).toBeNull();
      expect(container.textContent).toContain(
        "Could not open this archive document",
      );
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:archive-pdf");
      expect($search.useQuery).not.toHaveBeenCalled();
    },
  );

  it("keeps a bare archive downloadable without resolving any member", async () => {
    await render(
      createElement(IframePreviewCard, {
        source: { ...source, archive_document: null },
        onClose: vi.fn(),
      }),
    );
    expect(container.textContent).toContain(
      "This file cannot be previewed in the browser",
    );
    expect(container.querySelector("a[download]")?.getAttribute("href")).toBe(
      source.url,
    );
    expect(customFetch.GET).not.toHaveBeenCalled();
  });

  it("keeps the ordinary PDF preview endpoint unchanged", async () => {
    const url = "https://eduwiki.example/direct.pdf";
    vi.mocked(customFetch.GET).mockResolvedValue({
      data: new Blob(["pdf"]),
      response: new Response(),
    });
    await render(
      createElement(IframePreviewCard, {
        source: { ...source, url, archive_document: null },
        onClose: vi.fn(),
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(customFetch.GET).toHaveBeenCalledWith(
      `${SEARCH_API_URL}/search/pdf?url=${encodeURIComponent(url)}`,
      expect.any(Object),
    );
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe(
      "blob:archive-pdf",
    );
    expect(container.querySelector("a")?.getAttribute("href")).toBe(url);
    expect(container.querySelector("a")?.textContent).toBe("Go to website ->");
  });

  it("does not preview an ordinary web page, it only links to it", async () => {
    await render(
      createElement(IframePreviewCard, {
        source: {
          ...source,
          url: "https://innopolis.university/team-rector/",
          archive_document: null,
        },
        onClose: vi.fn(),
      }),
    );
    expect(customFetch.GET).not.toHaveBeenCalled();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.textContent).toContain(
      "Sorry, this site does not support preview",
    );
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "https://innopolis.university/team-rector/",
    );
  });

  it.each([false, true])(
    "opens distinct same-URL citations in a Modal (mobile: %s), without hijacking a bare archive link",
    async (isMobile) => {
      vi.stubGlobal(
        "matchMedia",
        vi.fn(() => ({ matches: isMobile })),
      );
      vi.spyOn(window, "open").mockImplementation(() => null);
      vi.mocked(customFetch.GET).mockResolvedValue({
        data: new Blob(["pdf"]),
        response: new Response(),
      });
      const second = {
        ...source,
        archive_document: {
          ...source.archive_document,
          page: "second",
          member: "2026/solutions.pdf",
        },
      };
      const response: searchTypes.SchemaAskResponses = {
        query: "exam",
        answer: `[original archive](${source.url})`,
        sources: [source, second].map((item, index) => ({
          number: index + 1,
          title: item.display_name,
          url: item.url,
          kind: AnswerSourceKind.eduwiki,
          clauses: [],
          sections: [],
          based_on: [],
          official: false,
          archive_document: item.archive_document,
        })),
        attachments: [],
        calendar_events: [],
        signup_offers: [],
        messages: [],
      };
      await render(createElement(AskResult, { response }));
      const buttons = Array.from(container.querySelectorAll("button"));
      expect(buttons.map((button) => button.textContent)).toEqual([
        "Open document: 2026/rules.pdf",
        "Open document: 2026/solutions.pdf",
      ]);
      expect(container.querySelector("p a")?.getAttribute("href")).toBe(
        source.url,
      );
      expect(container.querySelector("p a")?.getAttribute("target")).toBe(
        "_blank",
      );
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(customFetch.GET).not.toHaveBeenCalled();
      await act(async () => buttons[1].click());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain("2026/solutions.pdf");
      expect(dialog?.querySelector("iframe")?.getAttribute("src")).toBe(
        "blob:archive-pdf",
      );
      expect(
        new URL(
          vi.mocked(customFetch.GET).mock.calls[0][0] as string,
        ).searchParams.get("page"),
      ).toBe("second");
      expect(window.open).not.toHaveBeenCalled();
      await act(async () =>
        (
          dialog?.querySelector('button[title="Close"]') as HTMLButtonElement
        ).click(),
      );
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:archive-pdf");
    },
  );

  const answerWith = (
    sources: Partial<searchTypes.SchemaAnswerSource>[],
  ): searchTypes.SchemaAskResponses =>
    ({
      query: "exam",
      answer: "Answer",
      sources: sources.map((item, index) => ({
        number: index + 1,
        clauses: [],
        sections: [],
        official: false,
        based_on: [],
        ...item,
      })),
      attachments: [],
      calendar_events: [],
      signup_offers: [],
      messages: [],
    }) as searchTypes.SchemaAskResponses;

  const settle = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

  it("previews a cited page of the knowledge base and its PDF provenance from their titles in a Modal", async () => {
    const url = "https://innopolis.university/team-rector/";
    const policy = "https://innopolis.university/upload/policy.pdf";
    vi.mocked(customFetch.GET).mockResolvedValue({
      data: new Blob(["x"]),
      response: new Response(),
    });
    await render(
      createElement(AskResult, {
        response: answerWith([
          {
            title: "Rector",
            url,
            kind: AnswerSourceKind.website,
            based_on: [{ title: "Policy", url: policy }],
          },
        ]),
      }),
    );
    expect(
      Array.from(container.querySelectorAll("ol button")).map(
        (button) => button.textContent,
      ),
    ).toEqual(["Policy"]);
    expect(
      container.querySelector(`ol a[href="${url}"]`)?.getAttribute("target"),
    ).toBe("_blank");
    expect(customFetch.GET).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    const policyButton =
      container.querySelector<HTMLButtonElement>("ol button")!;
    await act(async () => policyButton.click());
    await settle();
    expect(customFetch.GET).toHaveBeenLastCalledWith(
      `${SEARCH_API_URL}/search/pdf?url=${encodeURIComponent(policy)}`,
      expect.any(Object),
    );
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.querySelector("iframe")?.hasAttribute("sandbox")).toBe(false);
  });

  it("shows the text of a cited chat message in a Modal and leaves web pages and textless messages as links", async () => {
    await render(
      createElement(AskResult, {
        response: answerWith([
          {
            title: "B23 chat",
            url: "https://t.me/c/1/2",
            kind: AnswerSourceKind.chat,
            date: "2026-11-09T10:00:00Z",
            author: "Alice",
            text: "Экзамен перенесён\nна 12 ноября",
          },
          {
            title: "Old chat",
            url: "https://t.me/c/1/3",
            kind: AnswerSourceKind.chat,
          },
          {
            title: "News",
            url: "https://example.org/news",
            kind: AnswerSourceKind.web,
          },
        ]),
      }),
    );
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("ol button"),
    );
    expect(buttons.map((button) => button.textContent)).toEqual(["B23 chat"]);
    expect(
      Array.from(container.querySelectorAll("ol a")).map((a) =>
        a.getAttribute("href"),
      ),
    ).toEqual(["https://t.me/c/1/3", "https://example.org/news"]);
    await act(async () => buttons[0].click());
    await settle();
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain("Экзамен перенесён\nна 12 ноября");
    expect(dialog.textContent).toContain("Alice");
    expect(
      dialog.querySelector('a[href="https://t.me/c/1/2"]')?.textContent,
    ).toBe("Open in chat ->");
    expect(dialog.querySelector("iframe")).toBeNull();
    expect(customFetch.GET).not.toHaveBeenCalled();
  });
});
