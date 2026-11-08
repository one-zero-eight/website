import type { searchTypes } from "@/api/search";
import { customFetch } from "@/api/helpers/custom-fetch";
import { $search } from "@/api/search";
import { SEARCH_API_URL } from "@/api/search/links";
import { EduwikiSourceType } from "@/api/search/types";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import IframePreviewCard from "./IframePreviewCard";
import { AskResult } from "./ask/AskResult";
import { SearchPage } from "./SearchPage";

const { useSearchQuery } = vi.hoisted(() => ({ useSearchQuery: vi.fn() }));

vi.mock("@/api/helpers/custom-fetch", () => ({
  customFetch: { GET: vi.fn() },
}));
vi.mock("@/api/search", () => ({ $search: { useQuery: useSearchQuery } }));
vi.mock("./innohassleRoutes", () => ({
  componentByPath: {},
  resolvePageByUrl: vi.fn(),
}));
vi.mock("@/components/maps/MapsPage", () => ({ MapsPage: () => null }));
vi.mock("./ask/AskApproval", () => ({ AskApproval: () => null }));
vi.mock("./ask/AskCalendarEvents", () => ({ AskCalendarEvents: () => null }));
vi.mock("./ask/AskFeedback", () => ({ AskFeedback: () => null }));
vi.mock("./SearchField", () => ({ default: () => null }));
vi.mock("./PreviewCard", () => ({ default: () => null }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));

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

  it("keeps ordinary chat sources deduplicated by type", async () => {
    const ordinary = { ...source, archive_document: null };
    const response: searchTypes.SchemaAskResponses = {
      query: "exam",
      answer: "Answer",
      search_responses: [
        { source: ordinary },
        { source: { ...ordinary, url: "https://eduwiki.example/other" } },
      ],
      attachments: [],
      calendar_events: [],
      messages: [],
    };
    await render(createElement(AskResult, { response }));
    expect(container.querySelectorAll("a")).toHaveLength(1);
    expect(container.querySelector("a")?.getAttribute("href")).toBe(source.url);
    expect(container.querySelector("a")?.textContent).toBe("eduwiki");
    expect(container.querySelector("button")).toBeNull();
    expect(customFetch.GET).not.toHaveBeenCalled();
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
        search_responses: [
          { source },
          { source: second },
          { source },
          { source: { ...source, archive_document: null } },
        ],
        attachments: [],
        calendar_events: [],
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

  it.each([false, true])(
    "waits for an explicit search result click before requesting its exact archive document (mobile: %s)",
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
      const selectedSource = {
        ...source,
        display_name: "Exam solutions",
        archive_document: {
          page: "courses/solutions #2",
          revision: "sha256:second+revision",
          member: "2026/solutions.pdf",
        },
      };
      useSearchQuery.mockReturnValue({
        data: {
          searched_for: "exam",
          responses: [{ source }, { source: selectedSource }],
        },
      });
      await render(createElement(SearchPage, { searchQuery: "exam" }));
      const results = Array.from(
        container.querySelectorAll<HTMLElement>('div[tabindex="0"]'),
      );
      expect(results).toHaveLength(2);
      expect(customFetch.GET).not.toHaveBeenCalled();
      expect(container.querySelector(".border-primary")).toBeNull();
      expect(container.querySelector("iframe")).toBeNull();
      const selectedResult = results.find(
        (result) =>
          result.querySelector("p")?.textContent ===
          selectedSource.display_name,
      );
      expect(selectedResult).toBeDefined();
      await act(async () => selectedResult!.click());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(window.open).not.toHaveBeenCalled();
      const preview = isMobile
        ? document.querySelector('[role="dialog"]')
        : container;
      expect(preview?.querySelector("iframe")?.getAttribute("src")).toBe(
        "blob:archive-pdf",
      );
      expect(preview?.textContent).toContain(
        selectedSource.archive_document.member,
      );
      expect(customFetch.GET).toHaveBeenCalledTimes(1);
      const requestUrl = new URL(
        vi.mocked(customFetch.GET).mock.calls[0][0] as string,
      );
      expect(requestUrl.origin + requestUrl.pathname).toBe(
        `${SEARCH_API_URL}/search/archive-document`,
      );
      expect(Object.fromEntries(requestUrl.searchParams)).toEqual({
        page: selectedSource.archive_document.page,
        revision: selectedSource.archive_document.revision,
      });
      if (isMobile) {
        await act(async () =>
          (
            preview?.querySelector('button[title="Close"]') as HTMLButtonElement
          ).click(),
        );
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:archive-pdf");
      }
    },
  );

  it("still automatically previews an ordinary desktop search PDF", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );
    const url = "https://eduwiki.example/direct.pdf";
    vi.mocked(customFetch.GET).mockResolvedValue({
      data: new Blob(["pdf"]),
      response: new Response(),
    });
    useSearchQuery.mockReturnValue({
      data: {
        searched_for: "exam",
        responses: [{ source: { ...source, url, archive_document: null } }],
      },
    });
    await render(createElement(SearchPage, { searchQuery: "exam" }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(container.querySelector('div[tabindex="0"]')?.classList).toContain(
      "border-primary",
    );
    expect(customFetch.GET).toHaveBeenCalledExactlyOnceWith(
      `${SEARCH_API_URL}/search/pdf?url=${encodeURIComponent(url)}`,
      expect.any(Object),
    );
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe(
      "blob:archive-pdf",
    );
  });

  it("still opens an ordinary mobile search URL directly", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    vi.spyOn(window, "open").mockImplementation(() => null);
    useSearchQuery.mockReturnValue({
      data: {
        searched_for: "exam",
        responses: [{ source: { ...source, archive_document: null } }],
      },
    });
    await render(createElement(SearchPage, { searchQuery: "exam" }));
    act(() =>
      (container.querySelector('div[tabindex="0"]') as HTMLElement).click(),
    );
    expect(window.open).toHaveBeenCalledExactlyOnceWith(source.url, "_blank");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(customFetch.GET).not.toHaveBeenCalled();
  });

  it("keeps archive PDF documents in PDF-only search results", async () => {
    window.sessionStorage.setItem(
      "search-filters",
      JSON.stringify({
        fileType: { pdf: true, link_to_source: false },
        source: { eduwiki: true },
      }),
    );
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );
    vi.mocked(customFetch.GET).mockResolvedValue({
      data: new Blob(["pdf"]),
      response: new Response(),
    });
    useSearchQuery.mockReturnValue({
      data: { searched_for: "exam", responses: [{ source }] },
    });
    await render(createElement(SearchPage, { searchQuery: "exam" }));
    expect(container.textContent).toContain("Results for: exam");
    expect(customFetch.GET).not.toHaveBeenCalled();
    await act(async () =>
      (container.querySelector('div[tabindex="0"]') as HTMLElement).click(),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe(
      "blob:archive-pdf",
    );
  });
});
