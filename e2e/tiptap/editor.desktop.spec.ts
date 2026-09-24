import { expect, test } from "@playwright/test";
import {
  bubbleMenu,
  calloutTypeButton,
  clickBlockWithText,
  gotoTiptapPlayground,
  imageInEditor,
  openCalloutTypeDropdown,
  proseMirror,
  selectText,
} from "./helpers";

test.describe("Tiptap editor desktop", () => {
  test.beforeEach(async ({ page }) => {
    await gotoTiptapPlayground(page);
  });

  test("loads editable content", async ({ page }) => {
    const editor = proseMirror(page);
    await expect(editor).toHaveAttribute("contenteditable", "true");
    await expect(editor.getByText("First paragraph")).toBeVisible();
    await expect(editor.getByText("Callout text")).toBeVisible();
  });

  test("typing appends text to the current block", async ({ page }) => {
    await clickBlockWithText(page, "Second paragraph");
    await page.keyboard.type(" added");
    await expect(
      proseMirror(page).getByText("Second paragraph added"),
    ).toBeVisible();
  });

  test("shows bubble menu when text is selected", async ({ page }) => {
    await selectText(page, "Second paragraph");
    await expect(bubbleMenu(page)).toBeVisible();
    await expect(bubbleMenu(page).getByTitle("Bold")).toBeVisible();
  });

  test("bubble menu stays clickable above the sticky toolbar", async ({ page }) => {
    await selectText(page, "First paragraph");
    const boldButton = bubbleMenu(page).getByTitle("Bold");
    await expect(boldButton).toBeVisible();

    await expect
      .poll(async () => {
        const button = await boldButton.boundingBox();
        const toolbar = await page.getByTestId("editor-toolbar").boundingBox();
        if (!button || !toolbar) return false;

        const centerY = button.y + button.height / 2;
        return centerY > toolbar.y && centerY < toolbar.y + toolbar.height;
      })
      .toBe(true);

    await boldButton.click();
    await expect(proseMirror(page).locator("strong")).toContainText(
      "First paragraph",
    );
  });

  test("applies bold formatting from bubble menu", async ({ page }) => {
    await selectText(page, "Second paragraph");
    await bubbleMenu(page).getByTitle("Bold").click();
    await expect(proseMirror(page).locator("strong")).toContainText(
      "Second paragraph",
    );
  });

  test("link dialog uses selected text and clipboard URL", async ({ page }) => {
    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, "readText", {
        configurable: true,
        value: async () => " https://example.com/selected ",
      });
    });
    await selectText(page, "Second paragraph");
    await bubbleMenu(page).getByTitle("Link", { exact: true }).click();
    await expect(page.getByPlaceholder("Link text")).toHaveValue(
      "Second paragraph",
    );
    await expect(page.getByPlaceholder("https://example.com")).toHaveValue(
      "https://example.com/selected",
    );
    await page.getByRole("button", { name: "Add Link", exact: true }).click();
    const link = proseMirror(page).getByRole("link", {
      name: "Second paragraph",
    });
    await expect(link).toHaveAttribute("href", "https://example.com/selected");

    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, "readText", {
        configurable: true,
        value: async () => "https://example.com/other",
      });
    });
    await selectText(page, "Second paragraph");
    await bubbleMenu(page).getByTitle("Link", { exact: true }).click();
    await expect(page.getByPlaceholder("https://example.com")).toHaveValue(
      "https://example.com/selected",
    );
  });

  for (const clipboardText of ["ordinary text", "javascript:alert(1)", null]) {
    test(`link dialog ignores invalid or denied clipboard: ${clipboardText}`, async ({
      page,
    }) => {
      await page.evaluate((value) => {
        Object.defineProperty(navigator.clipboard, "readText", {
          configurable: true,
          value: async () => {
            if (value === null)
              throw new DOMException("Denied", "NotAllowedError");
            return value;
          },
        });
      }, clipboardText);
      await selectText(page, "Second paragraph");
      await bubbleMenu(page).getByTitle("Link", { exact: true }).click();
      await expect(page.getByPlaceholder("Link text")).toHaveValue(
        "Second paragraph",
      );
      await expect(page.getByPlaceholder("https://example.com")).toHaveValue(
        "",
      );
    });
  }

  test("link dialog does not overwrite manual URL with delayed clipboard", async ({
    page,
  }) => {
    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, "readText", {
        configurable: true,
        value: () =>
          new Promise<string>((resolve) => {
            window.addEventListener(
              "resolve-clipboard",
              () => resolve("https://example.com/clipboard"),
              { once: true },
            );
          }),
      });
    });
    await selectText(page, "Second paragraph");
    await bubbleMenu(page).getByTitle("Link", { exact: true }).click();
    const urlInput = page.getByPlaceholder("https://example.com");
    await urlInput.fill("https://example.com/manual");
    await page.evaluate(() =>
      window.dispatchEvent(new Event("resolve-clipboard")),
    );
    await expect(urlInput).toHaveValue("https://example.com/manual");
  });

  for (const { shortcut, platform } of [
    { shortcut: "Control+k", platform: "Linux x86_64" },
    { shortcut: "Meta+k", platform: "MacIntel" },
  ]) {
    test(`link shortcut ${shortcut} opens a single dialog with selected text`, async ({
      page,
    }) => {
      await page.addInitScript((value) => {
        Object.defineProperty(navigator, "platform", { get: () => value });
      }, platform);
      await gotoTiptapPlayground(page);
      await page.evaluate(() => {
        Object.defineProperty(navigator.clipboard, "readText", {
          configurable: true,
          value: async () => "https://example.com/shortcut",
        });
      });
      await selectText(page, "Second paragraph");
      await page.keyboard.press(shortcut);
      await expect(page.getByPlaceholder("Link text")).toHaveCount(1);
      await expect(page.getByPlaceholder("Link text")).toHaveValue(
        "Second paragraph",
      );
      await expect(page.getByPlaceholder("https://example.com")).toHaveValue(
        "https://example.com/shortcut",
      );
      await page.getByRole("button", { name: "Add Link", exact: true }).click();
      await expect(
        proseMirror(page).getByRole("link", { name: "Second paragraph" }),
      ).toHaveAttribute("href", "https://example.com/shortcut");
    });
  }

  test("link shortcut works without selected text", async ({ page }) => {
    await clickBlockWithText(page, "Second paragraph");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder("Link text")).toHaveCount(1);
    await expect(page.getByPlaceholder("Link text")).toHaveValue("");
    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder("Link text")).toHaveCount(0);
  });

  test("does not show mobile bottom menu", async ({ page }) => {
    await expect(page.getByTestId("mobile-bottom-menu")).toBeHidden();
  });

  test("opens callout type dropdown from callout header", async ({ page }) => {
    await calloutTypeButton(page).click();
    await expect(page.getByText("Tip", { exact: true })).toBeVisible();
    await page.getByText("Tip", { exact: true }).click();
    await expect(calloutTypeButton(page)).toContainText("TIP");
  });

  test("shows image actions after clicking the image", async ({ page }) => {
    await imageInEditor(page).click();
    await expect(bubbleMenu(page)).toBeVisible();
    await expect(bubbleMenu(page).getByTitle("Replace image")).toBeVisible();
    await expect(
      bubbleMenu(page).getByTitle("Download original"),
    ).toBeVisible();
    await expect(bubbleMenu(page).getByTitle("Delete image")).toBeVisible();
  });

  test("read-only viewer hides editing controls", async ({ page }) => {
    const viewer = page.getByTestId("tiptap-viewer");
    await expect(viewer.locator(".tiptap-readonly")).toBeVisible();
    await expect(viewer.locator("[data-callout-picker]")).toHaveCount(0);
    await expect(viewer.locator("[data-resize-handle]")).toHaveCount(0);
  });

  test("details stay open while interacting with callout picker", async ({
    page,
  }) => {
    await expect(proseMirror(page).getByText("Details body")).toBeVisible();
    await openCalloutTypeDropdown(page);
    await expect(proseMirror(page).getByText("Details body")).toBeVisible();
  });
});
