import { messages as enMessages } from "@/locales/en.po";
import { messages as ruMessages } from "@/locales/ru.po";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ExportModal } from "./ExportModal";
import { TargetForExport } from "@/api/schedule/types.ts";

const mocks = vi.hoisted(() => ({
  searchQueries: [] as unknown[][],
  searchMutations: [] as unknown[][],
  queryInvalidations: [] as unknown[][],
  scheduleQueries: [] as unknown[][],
  mutationInvocations: [] as unknown[][],
  mutationCallbacks: [] as Array<(response: unknown) => void>,
  hookMutationCallbacks: [] as Array<(response: unknown) => unknown>,
  mutationResponses: {} as Record<string, unknown>,
  mutationErrors: {} as Record<string, string>,
  pendingMutations: {} as Record<string, boolean>,
  queryError: "",
  queryFetching: false,
  queryPending: false,
  accessKey: null as string | null,
}));

vi.mock("@/api/search", () => ({
  $search: {
    queryOptions: (method: string, path: string) => ({
      queryKey: ["search", method, path],
    }),
    useQuery: (...args: unknown[]) => {
      mocks.searchQueries.push(args);
      return {
        data: { access_key: mocks.accessKey },
        isPending: mocks.queryPending,
        isFetching: mocks.queryFetching,
        isError: Boolean(mocks.queryError),
        error: mocks.queryError ? new Error(mocks.queryError) : undefined,
        refetch: vi.fn(),
      };
    },
    useMutation: (...args: unknown[]) => {
      mocks.searchMutations.push(args);
      const [method, path, options] = args as [
        string,
        string,
        Record<string, unknown>,
      ];
      const mutationId = `${method} ${path}`;
      return {
        mutate: (...mutationArgs: unknown[]) => {
          mocks.mutationInvocations.push([method, path, ...mutationArgs]);
          const callbacks = mutationArgs[1] as
            | { onSuccess?: (response: unknown) => void }
            | undefined;
          if (callbacks?.onSuccess) {
            mocks.mutationCallbacks.push(callbacks.onSuccess);
            const response = mocks.mutationResponses[mutationId];
            const mutationOptions = options as {
              onSuccess?: (response: unknown) => unknown;
            };
            if (mutationOptions.onSuccess) {
              mocks.hookMutationCallbacks.push(mutationOptions.onSuccess);
            }
            if (response !== undefined) {
              mutationOptions.onSuccess?.(response);
              callbacks.onSuccess(response);
            }
          }
        },
        isPending: mocks.pendingMutations[mutationId] ?? false,
        isError: Boolean(mocks.mutationErrors[mutationId]),
        error: mocks.mutationErrors[mutationId]
          ? new Error(mocks.mutationErrors[mutationId])
          : undefined,
        options,
      };
    },
  },
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: async (filters: unknown) => {
      mocks.queryInvalidations.push([filters]);
    },
  }),
}));
vi.mock("@/api/schedule", () => ({
  $schedule: {
    useQuery: (...args: unknown[]) => {
      mocks.scheduleQueries.push(args);
      const [, path] = args as [string, string];
      if (path === "/users/me") return { data: { id: 42 } };
      if (path === "/users/me/get-schedule-access-key") {
        return {
          data: {
            access_key: {
              resource_path: "/users/42/sport.ics",
              access_key: "legacy-calendar-secret",
            },
          },
        };
      }
      return {};
    },
  },
}));
vi.mock("@/components/common/Modal.tsx", () => ({
  Modal: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? createElement("div", { role: "dialog" }, children) : null,
}));
vi.mock("@/components/calendar/Calendar.tsx", () => ({
  Calendar: ({ urls }: { urls: Array<{ url: string }> }) =>
    createElement("div", {
      className: "calendar-preview",
      "data-urls": urls.map(({ url }) => url).join("|"),
    }),
}));
vi.mock("@/api/search/links.ts", () => ({
  getAiCalendarExportLink: (key: string) =>
    `https://search.example/prefix/users/calendar-export.ics?access_key=${encodeURIComponent(key)}`,
  getMyAssistantCalendarLink: () =>
    "https://search.example/prefix/users/my-calendar.ics",
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mocks.searchQueries.length = 0;
  mocks.searchMutations.length = 0;
  mocks.queryInvalidations.length = 0;
  mocks.scheduleQueries.length = 0;
  mocks.mutationInvocations.length = 0;
  mocks.mutationCallbacks.length = 0;
  mocks.hookMutationCallbacks.length = 0;
  mocks.mutationResponses = {};
  mocks.mutationErrors = {};
  mocks.pendingMutations = {};
  mocks.queryError = "";
  mocks.queryFetching = false;
  mocks.queryPending = false;
  mocks.accessKey = null;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function renderExportModal(
  open: boolean,
  target:
    | { type: "ai-calendar" }
    | { type: "event-group"; alias: string }
    | { type: "personal"; target: TargetForExport } = { type: "ai-calendar" },
  locale = "en",
) {
  return act(async () => {
    root.render(
      createElement(
        I18nProvider,
        {
          i18n: setupI18n({
            locale,
            messages: locale === "ru" ? { ru: ruMessages } : { en: enMessages },
          }),
        },
        createElement(ExportModal, {
          target,
          open,
          onOpenChange: vi.fn(),
        }),
      ),
    );
  });
}

it("checks for an existing AI Calendar export key only while its modal is open", async () => {
  await renderExportModal(false);
  expect(mocks.searchQueries).toHaveLength(0);
  expect(mocks.searchMutations).toHaveLength(0);

  await renderExportModal(true);
  expect(mocks.searchQueries.at(-1)).toMatchObject([
    "get",
    "/users/my-calendar/export-key",
    undefined,
    { enabled: true },
  ]);
  expect(mocks.searchMutations.map((call) => call.slice(0, 2))).toEqual([
    ["post", "/users/my-calendar/export-key"],
    ["delete", "/users/my-calendar/export-key"],
  ]);
  expect(mocks.mutationInvocations).toHaveLength(0);
});

it("shows an existing link without using it as the calendar preview feed", async () => {
  mocks.accessKey = "existing-secret";
  await renderExportModal(true);

  const input = container.querySelector<HTMLInputElement>("input")!;
  expect(input.value).toBe(
    "https://search.example/prefix/users/calendar-export.ics?access_key=existing-secret",
  );
  expect(input.className).toContain("ym-disable-keys");
  expect(input.parentElement?.className).toContain("ym-hide-content");
  const previewUrls = container
    .querySelector(".calendar-preview")
    ?.getAttribute("data-urls");
  expect(previewUrls).toBe(
    "https://search.example/prefix/users/my-calendar.ics",
  );
  expect(container.querySelector("a[href*='existing-secret']")).toBeNull();
});

it("creates a link only after an explicit click and displays the returned key", async () => {
  mocks.mutationResponses["post /users/my-calendar/export-key"] = {
    access_key: "created-secret",
  };
  await renderExportModal(true);

  const createButton = [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.includes("Create link"),
  )!;
  await act(async () => createButton.click());

  expect(mocks.mutationInvocations).toHaveLength(1);
  expect(mocks.mutationInvocations[0].slice(0, 2)).toEqual([
    "post",
    "/users/my-calendar/export-key",
  ]);
  expect(
    mocks.searchMutations.find((call) => call[0] === "post")?.[2],
  ).toMatchObject({ retry: false });
  expect(mocks.queryInvalidations).toEqual([
    [
      {
        queryKey: ["search", "get", "/users/my-calendar/export-key"],
      },
    ],
  ]);
  expect(container.querySelector<HTMLInputElement>("input")?.value).toContain(
    "created-secret",
  );
});

it("revokes the link and removes its copy field and preview", async () => {
  mocks.accessKey = "existing-secret";
  mocks.mutationResponses["delete /users/my-calendar/export-key"] = null;
  await renderExportModal(true);

  const revokeButton = [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.includes("Revoke link"),
  )!;
  await act(async () => revokeButton.click());

  expect(mocks.mutationInvocations[0].slice(0, 2)).toEqual([
    "delete",
    "/users/my-calendar/export-key",
  ]);
  expect(
    mocks.searchMutations.find((call) => call[0] === "delete")?.[2],
  ).toMatchObject({ retry: false });
  expect(mocks.queryInvalidations).toHaveLength(1);
  expect(container.querySelector("input")).toBeNull();
  expect(container.querySelector(".calendar-preview")).toBeNull();
  expect(container.textContent).toContain("Create link");
});

it("shows export-key lookup errors instead of an unusable link", async () => {
  mocks.queryError = "Could not load export key";
  await renderExportModal(true);

  expect(container.textContent).toContain("Could not load export key");
  expect(container.querySelector("input")).toBeNull();
  expect(container.querySelector(".calendar-preview")).toBeNull();
});

it("ignores a create response after closing and reopening the export modal", async () => {
  await renderExportModal(true);
  const createButton = [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.includes("Create link"),
  )!;
  await act(async () => createButton.click());
  const lateCreate = mocks.mutationCallbacks[0];

  await renderExportModal(false);
  await renderExportModal(true);
  await act(async () => lateCreate({ access_key: "stale-secret" }));

  expect(container.querySelector("input")).toBeNull();
  expect(container.textContent).toContain("Create link");
});

it("does not query AI Calendar keys for other export targets", async () => {
  await renderExportModal(true, { type: "event-group", alias: "group" });
  expect(mocks.searchQueries).toHaveLength(0);
  expect(mocks.searchMutations).toHaveLength(0);
});

it("keeps cached keys hidden while an open modal refreshes the current key", async () => {
  mocks.accessKey = "old-secret";
  mocks.queryFetching = true;
  await renderExportModal(true);

  expect(container.querySelector("input")).toBeNull();
  expect(container.querySelector(".calendar-preview")).toBeNull();
  expect(container.querySelector(".skeleton")).not.toBeNull();
});

it("shows create errors and permits another explicit attempt", async () => {
  await renderExportModal(true);
  const createButton = [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.includes("Create link"),
  )!;
  await act(async () => createButton.click());
  mocks.mutationErrors["post /users/my-calendar/export-key"] =
    "Create request failed";
  await renderExportModal(true);

  expect(container.textContent).toContain("Create request failed");
  expect(container.textContent).toContain("Create link");
});

it("keeps an active link visible when revocation fails", async () => {
  mocks.accessKey = "existing-secret";
  await renderExportModal(true);
  const revokeButton = [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.includes("Revoke link"),
  )!;
  await act(async () => revokeButton.click());
  mocks.mutationErrors["delete /users/my-calendar/export-key"] =
    "Revoke request failed";
  await renderExportModal(true);

  expect(container.textContent).toContain("Revoke request failed");
  expect(container.querySelector("input")?.value).toContain("existing-secret");
  expect(container.querySelector(".calendar-preview")).not.toBeNull();
});

it("disables link actions while create or revoke is pending", async () => {
  mocks.pendingMutations["post /users/my-calendar/export-key"] = true;
  await renderExportModal(true);
  const createButton = [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.includes("Create link"),
  )!;
  expect(createButton.disabled).toBe(true);

  mocks.accessKey = "existing-secret";
  mocks.pendingMutations["post /users/my-calendar/export-key"] = false;
  mocks.pendingMutations["delete /users/my-calendar/export-key"] = true;
  await renderExportModal(true);
  const revokeButton = [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.includes("Revoke link"),
  )!;
  expect(revokeButton.disabled).toBe(true);
  expect(
    container.querySelector("input")?.parentElement?.querySelector("button")
      ?.disabled,
  ).toBe(true);
});

it("ignores a create response after switching to a different export target", async () => {
  await renderExportModal(true);
  const createButton = [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.includes("Create link"),
  )!;
  await act(async () => createButton.click());
  const lateCreate = mocks.mutationCallbacks[0];

  await renderExportModal(true, { type: "event-group", alias: "group" });
  await renderExportModal(true);
  await act(async () => lateCreate({ access_key: "stale-secret" }));

  expect(container.querySelector("input")).toBeNull();
  expect(container.textContent).toContain("Create link");
});

it("shows AI Calendar export instructions in Russian", async () => {
  await renderExportModal(true, undefined, "ru");

  expect(container.textContent).toContain("Создать ссылку");
  expect(container.textContent).toContain("Создайте приватную ссылку");
});

it("keeps existing personal calendar exports on their existing flow", async () => {
  await renderExportModal(true, {
    type: "personal",
    target: TargetForExport.sport,
  });

  expect(mocks.searchQueries).toHaveLength(0);
  expect(mocks.searchMutations).toHaveLength(0);
  expect(container.textContent).toContain("Copy the link.");
  expect(container.querySelector<HTMLInputElement>("input")?.value).toContain(
    "legacy-calendar-secret",
  );
  expect(container.querySelector("input")?.className).not.toContain(
    "ym-disable-keys",
  );
  expect(
    container.querySelector("input")?.parentElement?.className,
  ).not.toContain("ym-hide-content");
  expect(
    container.querySelector(".calendar-preview")?.getAttribute("data-urls"),
  ).toContain("legacy-calendar-secret");
});

it("invalidates export-key data after a revoke completes after closing", async () => {
  mocks.accessKey = "existing-secret";
  await renderExportModal(true);
  const revokeButton = [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.includes("Revoke link"),
  )!;
  await act(async () => revokeButton.click());
  const lateRevoke = mocks.hookMutationCallbacks[0];

  await renderExportModal(false);
  await renderExportModal(true);
  await act(async () => lateRevoke(null));

  expect(mocks.queryInvalidations).toHaveLength(1);
  mocks.queryFetching = true;
  await renderExportModal(true);
  expect(container.querySelector("input")).toBeNull();
  expect(container.querySelector(".calendar-preview")).toBeNull();
});
