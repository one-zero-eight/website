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

  test("applies bold formatting from bubble menu", async ({ page }) => {
    await selectText(page, "Second paragraph");
    await bubbleMenu(page).getByTitle("Bold").click();
    await expect(proseMirror(page).locator("strong")).toContainText(
      "Second paragraph",
    );
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
